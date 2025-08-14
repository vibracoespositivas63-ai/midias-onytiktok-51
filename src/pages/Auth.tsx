import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ALLOWED_EMAIL } from "@/constants/auth";

const Auth = () => {
  const [email, setEmail] = useState(ALLOWED_EMAIL);
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentEmail = session?.user?.email ?? null;
      if (currentEmail && currentEmail.toLowerCase() === ALLOWED_EMAIL.toLowerCase()) {
        setTimeout(() => navigate("/dashboard", { replace: true }), 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentEmail = session?.user?.email ?? null;
      if (currentEmail && currentEmail.toLowerCase() === ALLOWED_EMAIL.toLowerCase()) {
        navigate("/dashboard", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async () => {
    if (email.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
      toast.error("Apenas o email autorizado pode acessar o painel.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Não foi possível entrar.");
      return;
    }
    toast.success("Login realizado!");
    navigate("/dashboard", { replace: true });
  };

  const handleSignUp = async () => {
    if (email.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
      toast.error("Cadastro permitido somente para o email autorizado.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Não foi possível cadastrar.");
      return;
    }
    toast.success("Verifique seu email para confirmar o cadastro.");
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Login | Lovabo Painel</title>
        <meta name="description" content="Acesse o painel com email autorizado." />
        <link rel="canonical" href={`${origin}/auth`} />
        <meta name="robots" content="noindex,follow" />
      </Helmet>

      <main className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Entrar no Painel</CardTitle>
            <CardDescription>Somente o email autorizado pode acessar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={ALLOWED_EMAIL} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            {mode === "login" ? (
              <Button onClick={handleLogin} disabled={loading} className="w-full">
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            ) : (
              <Button onClick={handleSignUp} disabled={loading} className="w-full">
                {loading ? "Cadastrando..." : "Criar conta"}
              </Button>
            )}
            <Button variant="outline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
              {mode === "login" ? "Precisa cadastrar?" : "Já tem conta? Entrar"}
            </Button>
            <div className="text-sm text-muted-foreground text-center">
              Dica: No Supabase, desative a confirmação de email para testes mais rápidos.
            </div>
            <div className="text-center">
              <Link to="/" className="story-link">Voltar para a página inicial</Link>
            </div>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default Auth;
