import React, { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
// Tipos
// Tipos
 type Status = "Pendente" | "Enviando" | "Sucesso" | "Falha";

 interface ScheduleItem {
  id: string;
  videoUrl: string;
  modelId: string;
  scheduledAt: string | null;
  createdAt: string;
  status: Status;
  tries: number;
  lastError: string | null;
}

const STORAGE_KEY = "lovabo.schedules";

function formatDateTime(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString();
}

export default function LovaboDashboard() {
  // Form
  const [videoUrl, setVideoUrl] = useState("");
  const [modelId, setModelId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [resolvedModel, setResolvedModel] = useState<{ id: string; name: string | null; username: string | null } | null>(null);
  const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

  const [welcomeVideoOpen, setWelcomeVideoOpen] = useState(true);
  // Modo de seleção de modelo (existente x novo)
const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [newModel, setNewModel] = useState<{ id: string; displayName: string; username: string; avatarUrl: string }>({ id: "", displayName: "", username: "", avatarUrl: "" });
  const [batchMode, setBatchMode] = useState<'single' | 'list'>('single');
  const [videoList, setVideoList] = useState("");
  // Link opcional para perfil
  const [addProfileLink, setAddProfileLink] = useState(false);
  const [profileLinkUrl, setProfileLinkUrl] = useState("");
  const genUuid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  }));

  // Gera/propaga ID automaticamente ao preencher dados do novo modelo
  useEffect(() => {
    if (mode === 'new') {
      if (!newModel.id && (newModel.displayName || newModel.username || newModel.avatarUrl)) {
        const id = genUuid();
        setNewModel((p) => ({ ...p, id }));
        setModelId(id);
      } else if (newModel.id && modelId !== newModel.id) {
        setModelId(newModel.id);
      }
    }
  }, [mode, newModel.displayName, newModel.username, newModel.avatarUrl, newModel.id]);

  // Lista
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ScheduleItem[]) : [];
    } catch {
      return [] as ScheduleItem[];
    }
  });
  const [newContentFlag, setNewContentFlag] = useState(false);

  // Ref para evitar closures antigas no worker
  const schedulesRef = useRef<ScheduleItem[]>(schedules);
  useEffect(() => {
    schedulesRef.current = schedules;
  }, [schedules]);

  const saveSchedules = (arr: ScheduleItem[]) => {
    setSchedules(arr);
    schedulesRef.current = arr;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  };

  const uid = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const parseScheduledAt = (
    dateStr: string,
    timeStr: string
  ): string | null => {
    if (!dateStr || !timeStr) return null;
    const iso = new Date(`${dateStr}T${timeStr}`);
    return iso.toISOString();
  };

  const resolveModel = async () => {
    if (!modelId) {
      setResolvedModel(null);
      return;
    }
    try {
      if (isUuid(modelId)) {
        const { data, error } = await supabase
          .from("models")
          .select("id,name,username")
          .eq("id", modelId)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setResolvedModel(data);
        } else {
          setResolvedModel(null);
          toast({ title: "Modelo não encontrado", description: "ID inválido." });
        }
      } else {
        // Tenta por username exato primeiro
        let { data, error } = await supabase
          .from("models")
          .select("id,name,username")
          .eq("username", modelId)
          .maybeSingle();

        if (!data) {
          const { data: dataByName, error: err2 } = await supabase
            .from("models")
            .select("id,name,username")
            .ilike("name", `%${modelId}%`)
            .limit(1)
            .maybeSingle();
          if (err2) throw err2;
          if (dataByName) {
            setModelId(dataByName.id);
            setResolvedModel(dataByName);
            toast({ title: "Modelo encontrado", description: `${dataByName.name ?? ""}${dataByName.username ? ` (@${dataByName.username})` : ""}` });
          } else {
            setResolvedModel(null);
            toast({ title: "Modelo não encontrado", description: "Tente o username ou cole o UUID." });
          }
        } else {
          setModelId(data.id);
          setResolvedModel(data);
          toast({ title: "Modelo encontrado", description: `${data.name ?? ""}${data.username ? ` (@${data.username})` : ""}` });
        }
      }
    } catch (e: any) {
      setResolvedModel(null);
      toast({ title: "Erro ao buscar modelo", description: e?.message ?? String(e) });
    }
  };

const handleAddSchedule = async (e: React.FormEvent) => {
  e.preventDefault();

  const hasVideos = batchMode === 'single'
    ? !!videoUrl
    : videoList.split(/\r?\n|,|;/).map((s) => s.trim()).filter(Boolean).length > 0;

  if (!hasVideos || !scheduledDate || !scheduledTime) {
    toast({ title: "Campos obrigatórios", description: "Preencha vídeos, data e hora." });
    return;
  }

  // Se novo modelo, validar e criar/atualizar no banco
  if (mode === 'new') {
    if (!newModel.displayName || !newModel.username || !newModel.avatarUrl || !modelId) {
      toast({ title: "Dados do modelo", description: "Informe nome de exibição, username e avatar." });
      return;
    }
    try {
      // Se avatar for base64/data URL, envia ao bucket e usa a URL pública
      let finalAvatarUrl = newModel.avatarUrl;
      if (/^data:image\//.test(finalAvatarUrl)) {
        const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-avatar', {
          body: {
            file: finalAvatarUrl,
            filename: `${modelId}.png`,
            folder: modelId,
          },
        });
        if (uploadError) throw uploadError;
        if (uploadData?.publicUrl) {
          finalAvatarUrl = uploadData.publicUrl as string;
        } else {
          throw new Error('Falha ao gerar URL pública do avatar');
        }
      }

      const { error } = await supabase
        .from('models')
        .insert({
          id: modelId,
          name: newModel.displayName,
          username: newModel.username,
          avatar_url: finalAvatarUrl,
          is_active: true,
        });
      if (error && !String(error.message).includes('duplicate')) throw error;
    } catch (e: any) {
      toast({ title: "Erro ao criar modelo", description: e?.message ?? String(e) });
      return;
    }
  } else {
    // Modo existente: precisa ter modelId resolvido
    if (!modelId) {
      toast({ title: "Modelo", description: "Informe um ID/username válido." });
      return;
    }
  }

  const scheduledAt = parseScheduledAt(scheduledDate, scheduledTime);

  let items: ScheduleItem[] = [];
  if (batchMode === 'single') {
    items = [{
      id: uid(),
      videoUrl,
      modelId,
      scheduledAt,
      createdAt: new Date().toISOString(),
      status: "Pendente",
      tries: 0,
      lastError: null,
    }];
  } else {
    const urls = videoList.split(/\r?\n|,|;/).map((s) => s.trim()).filter(Boolean);
    items = urls.map((url) => ({
      id: uid(),
      videoUrl: url,
      modelId,
      scheduledAt,
      createdAt: new Date().toISOString(),
      status: "Pendente",
      tries: 0,
      lastError: null,
    }));
  }

  const next = [...items, ...schedulesRef.current];
  saveSchedules(next);
  setVideoUrl("");
  setVideoList("");
  setModelId("");
  setScheduledDate("");
  setScheduledTime("");
  setNewModel({ id: "", displayName: "", username: "", avatarUrl: "" });
  setMode('existing');
  setBatchMode('single');
  setNewContentFlag(true);
  toast({ title: "Agendado", description: `${items.length} vídeo(s) adicionados à fila.` });
};

  const handleRemove = (id: string) => {
    const next = schedulesRef.current.filter((s) => s.id !== id);
    saveSchedules(next);
    toast({ title: "Removido", description: "Agendamento removido." });
  };

  const publishItem = async (item: ScheduleItem, manual = false) => {
    const MAX_TRIES = 3;

    // Marca como enviando
    let updated: ScheduleItem[] = schedulesRef.current.map((s) =>
      s.id === item.id
        ? { ...s, status: "Enviando", tries: s.tries + (manual ? 1 : 0) }
        : s
    );
    setSchedules(updated);

    try {
      const { data, error } = await supabase.functions.invoke('publish', {
        body: {
          id: item.id,
          videoUrl: item.videoUrl,
          modelId: item.modelId,
          scheduledAt: item.scheduledAt,
        },
      });
      if (!error && data && (data.success === true || data.status === 'ok')) {
        updated = schedulesRef.current.map((s) =>
          s.id === item.id ? { ...s, status: "Sucesso", lastError: null } : s
        );
        saveSchedules(updated);
        if (manual) toast({ title: "Publicado", description: "Envio realizado com sucesso." });
        return true;
      } else {
        const errMsg = (error && error.message) || (data && (data.error || data.message)) || 'Falha ao publicar';
        throw new Error(errMsg);
      }
    } catch (err: any) {
      const current = schedulesRef.current.find((s) => s.id === item.id) || item;
      const tries = (current.tries || 0) + 1;
      if (tries >= MAX_TRIES) {
        updated = schedulesRef.current.map((s) =>
          s.id === item.id
            ? { ...s, status: "Falha", lastError: String(err), tries }
            : s
        );
        saveSchedules(updated);
        if (manual) toast({ title: "Falha no envio", description: String(err) });
      } else {
        updated = schedulesRef.current.map((s) =>
          s.id === item.id
            ? { ...s, status: "Pendente", lastError: String(err), tries }
            : s
        );
        saveSchedules(updated);
        if (manual)
          toast({ title: "Tentará novamente", description: "Reagendado para nova tentativa." });
      }
      return false;
    }
  };

  const handleSendNow = async (item: ScheduleItem) => {
    await publishItem(item, true);
  };

  // Worker: verifica itens devidos a cada 3s
  useEffect(() => {
    const timer = window.setInterval(async () => {
      const now = Date.now();
      const due = schedulesRef.current.filter(
        (s) =>
          s.status === "Pendente" &&
          s.scheduledAt &&
          new Date(s.scheduledAt).getTime() <= now + 5000
      );
      for (const item of due) {
        await publishItem(item);
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (schedules.length > 0) setNewContentFlag(false);
  }, [schedules.length]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

const statusBadge = (status: Status) => {
    switch (status) {
      case "Sucesso":
        return <Badge className="capitalize" variant="secondary">Sucesso</Badge>;
      case "Enviando":
        return <Badge className="capitalize" variant="default">Enviando</Badge>;
      case "Falha":
        return <Badge className="capitalize" variant="destructive">Falha</Badge>;
      default:
        return <Badge className="capitalize" variant="outline">Pendente</Badge>;
    }
  };

  const pageSize = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(schedules.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const paginated = schedules.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [schedules.length, totalPages, page]);

  const canSubmit = useMemo(() => {
    const hasVideos = batchMode === 'single'
      ? !!videoUrl
      : videoList.split(/\r?\n|,|;/).map((s) => s.trim()).filter(Boolean).length > 0;
    const base = hasVideos && !!scheduledDate && !!scheduledTime;
    if (!base) return false;
    if (mode === 'existing') return !!modelId;
    return !!newModel.displayName && !!newModel.username && !!newModel.avatarUrl;
  }, [videoUrl, videoList, scheduledDate, scheduledTime, mode, modelId, newModel.displayName, newModel.username, newModel.avatarUrl, batchMode]);

return (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>— Painel de Agendamento-Midias Socias OnyTiktok#</title>
      <meta name="description" content="Painel de Agendamento-Midias Socias OnyTiktok#: agende e publique vídeos com fila." />
      <link rel="canonical" href={`${origin}/dashboard`} />
      <script type="application/ld+json">{JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: '— Painel de Agendamento-Midias Socias OnyTiktok#',
        applicationCategory: 'BusinessApplication',
        url: `${origin}/dashboard`,
        description: 'Painel de agendamento para mídias sociais OnyTiktok'
      })}</script>
    </Helmet>

      <Dialog open={welcomeVideoOpen} onOpenChange={setWelcomeVideoOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <AspectRatio ratio={16 / 9}>
            <iframe
              src="https://www.youtube.com/embed/ZSNIGWMKepU?autoplay=1&mute=1&rel=0"
              title="Introdução OnyTiktok"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
            />
          </AspectRatio>
        </DialogContent>
      </Dialog>

      <header className="border-b bg-gradient-panel text-primary-foreground">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="px-2 py-1 rounded-lg brand-spot-panel flex items-center gap-2 text-primary-foreground">
              <img src="/lovable-uploads/0681b19d-7a4d-42f4-a88a-504fbd2f8a96.png" alt="Logo TikTok OnyTiktok" className="w-5 h-5" loading="lazy" />
              <img src="/lovable-uploads/01299688-138b-4bb4-92f5-df99fe8db952.png" alt="Logo Coroa OnyTiktok" className="w-5 h-5" loading="lazy" />
              <img src="/lovable-uploads/0b46087c-c02c-41e7-92cd-32cdfa3637ad.png" alt="Logo Folha OnyTiktok" className="w-5 h-5" loading="lazy" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">— Painel de Agendamento-Midias Socias OnyTiktok#</h1>
              <p className="text-sm text-primary-foreground">Suba links MP4, agende e publique automaticamente.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard
                  .writeText(JSON.stringify(schedulesRef.current))
                  .then(() => toast({ title: "Exportado", description: "JSON copiado para a área de transferência." }))
                  .catch(() => toast({ title: "Erro", description: "Não foi possível copiar." }));
              }}
            >
              Exportar JSON
            </Button>
            <div className="relative">
              <Button variant="outline">Admin</Button>
              {newContentFlag && (
                <span className="absolute -top-2 -right-2 text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground border">
                  Novo
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 card-offset">
            <CardHeader>
              <CardTitle>Agendar novo vídeo</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddSchedule} className="space-y-4">
{batchMode === 'single' ? (
  <div className="space-y-2">
    <Label htmlFor="videoUrl">Link MP4</Label>
    <Input id="videoUrl" placeholder="https://.../video.mp4" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
    {videoUrl && (
      <div className="rounded-md overflow-hidden bg-muted">
        <video src={videoUrl} controls muted className="w-full h-40 object-cover" />
      </div>
    )}
  </div>
) : (
  <div className="space-y-2">
    <Label htmlFor="videoList">Links MP4 (um por linha)</Label>
    <Textarea id="videoList" placeholder={`https://.../video1.mp4\nhttps://.../video2.mp4`} value={videoList} onChange={(e) => setVideoList(e.target.value)} rows={6} />
  </div>
)}
<div className="space-y-2">
  <Label>Modelo</Label>
  <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'existing' | 'new')} className="grid grid-cols-2 gap-2">
    <div className="flex items-center gap-2">
      <RadioGroupItem value="existing" id="mode-existing" />
      <Label htmlFor="mode-existing">Usar ID existente</Label>
    </div>
    <div className="flex items-center gap-2">
      <RadioGroupItem value="new" id="mode-new" />
      <Label htmlFor="mode-new">Criar novo modelo</Label>
    </div>
  </RadioGroup>
</div>
<div className="space-y-2">
  <Label>Tipo de envio</Label>
  <RadioGroup value={batchMode} onValueChange={(v) => setBatchMode(v as 'single' | 'list')} className="grid grid-cols-2 gap-2">
    <div className="flex items-center gap-2">
      <RadioGroupItem value="single" id="mode-single" />
      <Label htmlFor="mode-single">Único</Label>
    </div>
    <div className="flex items-center gap-2">
      <RadioGroupItem value="list" id="mode-list" />
      <Label htmlFor="mode-list">Enviar em Lista</Label>
    </div>
  </RadioGroup>
</div>
{mode === 'existing' ? (
  <div className="space-y-2">
    <Label htmlFor="modelId">ID da modelo</Label>
    <Input
      id="modelId"
      placeholder="username, nome ou UUID"
      value={modelId}
      onChange={(e) => setModelId(e.target.value)}
      onBlur={resolveModel}
    />
    {resolvedModel && (
      <p className="text-xs text-muted-foreground">
        Modelo: <strong>{resolvedModel.name ?? "—"}</strong>{resolvedModel.username ? ` (@${resolvedModel.username})` : ""} • ID confirmado
      </p>
    )}
  </div>
) : (
  <div className="space-y-3">
    <div className="space-y-2">
      <Label htmlFor="displayName">Nome de exibição</Label>
      <Input id="displayName" placeholder="Ex.: Ana Silva" value={newModel.displayName} onChange={(e) => setNewModel((p) => ({ ...p, displayName: e.target.value }))} />
    </div>
    <div className="space-y-2">
      <Label htmlFor="username">Username</Label>
      <Input id="username" placeholder="Ex.: ana_silva" value={newModel.username} onChange={(e) => setNewModel((p) => ({ ...p, username: e.target.value }))} />
    </div>
    <div className="space-y-2">
      <Label htmlFor="avatar">Avatar URL</Label>
      <Input id="avatar" placeholder="https://.../avatar.jpg" value={newModel.avatarUrl} onChange={(e) => setNewModel((p) => ({ ...p, avatarUrl: e.target.value }))} />
    </div>
    {newModel.id && (
      <p className="text-xs text-muted-foreground">ID gerado: <strong>{newModel.id}</strong></p>
    )}
  </div>
)}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="addProfileLink" checked={addProfileLink} onCheckedChange={(v) => setAddProfileLink(!!v)} />
                    <Label htmlFor="addProfileLink">Adicionar link ao perfil da modelo (opcional)</Label>
                  </div>
                  {addProfileLink && (
                    <Input
                      id="profileLinkUrl"
                      placeholder="https://..."
                      value={profileLinkUrl}
                      onChange={(e) => setProfileLinkUrl(e.target.value)}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">Se marcado, envia junto com o agendamento; se não, o vídeo é agendado normalmente.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input id="date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Hora</Label>
                    <Input id="time" type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="btn-hero flex-1" disabled={!canSubmit}>
                    Agendar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
onClick={() => {
  setVideoUrl("");
  setVideoList("");
  setModelId("");
  setScheduledDate("");
  setScheduledTime("");
  setNewModel({ id: "", displayName: "", username: "", avatarUrl: "" });
  setMode('existing');
  setBatchMode('single');
}}
                  >
                    Limpar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Dica: hospede o MP4 em um CDN ou storage público e cole o link aqui.
                </p>
                <div className="text-sm text-muted-foreground">
                  Agendamentos: <strong>{schedules.length}</strong>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 card-offset">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Fila de publicações</CardTitle>
              <span className="text-sm text-muted-foreground">Atualiza a cada 3s</span>
            </CardHeader>
            <CardContent>
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Preview</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Agendado</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((s) => (
                      <TableRow key={s.id}>
            <TableCell className="w-56">
              <div className="rounded-md overflow-hidden w-56 h-32 bg-muted flex items-center justify-center">
                <video src={s.videoUrl} controls muted className="w-full h-full object-cover" />
              </div>
            </TableCell>
                        <TableCell>
                          ID: <strong>{s.modelId}</strong>
                        </TableCell>
                        <TableCell>{formatDateTime(s.scheduledAt || undefined)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {statusBadge(s.status)}
                            {s.lastError && (
                              <span className="text-xs text-muted-foreground max-w-[28ch] truncate" title={s.lastError}>
                                {s.lastError}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSendNow(s)}>Enviar agora</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleRemove(s.id)}>Remover</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {schedules.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                          Nenhum agendamento ainda
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }} />
                      </PaginationItem>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink href="#" isActive={page === i + 1} onClick={(e) => { e.preventDefault(); setPage(i + 1); }}>
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }} />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}

              <div className="mt-6">
                <Card className="bg-card/50 card-offset">
                  <CardHeader>
                    <CardTitle className="text-sm">Logs recentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-40 overflow-auto space-y-2 text-xs text-muted-foreground">
                      {schedules.slice(0, 10).map((s) => (
                        <div key={s.id}>
                          {formatDateTime(s.createdAt)} — ID {s.id} — Modelo {s.modelId} — {s.status}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
