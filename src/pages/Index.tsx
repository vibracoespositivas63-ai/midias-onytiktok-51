import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
// Icons carregados via uploads do Lovable

const Index = () => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Lovabo | Painel de Agendamento</title>
        <meta name="description" content="Agende e publique vídeos via link MP4 com fila e retries." />
        <link rel="canonical" href={`${origin}/`} />
        <meta name="robots" content="index,follow" />
      </Helmet>

      <header className="bg-gradient-panel text-primary-foreground min-h-screen flex items-center">
        <section className="text-center max-w-3xl mx-auto px-4 w-full">
          <div className="flex items-center justify-center mb-6">
            <img src="https://tiktokonyfans.b-cdn.net/ANIMA%C3%87OES%20ONYFANS/Cabe%C3%A7alho%20(1).gif" alt="Logotipo animado ONYFANS" loading="eager" />
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Agende e publique vídeos com facilidade
          </h1>
          <p className="mt-4 text-lg opacity-90">
            Um painel simples para subir links MP4, agendar horário e publicar automaticamente.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild>
              <Link to="/dashboard">Abrir Dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <a href="#como-funciona">Como funciona</a>
            </Button>
          </div>
        </section>
      </header>

      <main className="container mx-auto px-4 py-16">
        <section id="como-funciona" className="grid md:grid-cols-3 gap-6">
          <div className="p-6 rounded-lg border bg-card card-offset">
            <div className="flex items-center gap-2">
              <img src="/lovable-uploads/f761a904-66ce-42d3-9314-aee4cc9b7ff1.png" alt="Ícone link" className="w-5 h-5" loading="lazy" />
              <h2 className="text-lg font-medium">Suba por link</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Cole a URL direta do MP4 hospedado em CDN ou storage.</p>
          </div>
          <div className="p-6 rounded-lg border bg-card card-offset">
            <div className="flex items-center gap-2">
              <img src="/lovable-uploads/37202b0a-0f4b-40ea-9f06-0046512bdb5f.png" alt="Ícone agende" className="w-5 h-5" loading="lazy" />
              <h2 className="text-lg font-medium">Agende e monitore</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Escolha data e hora; veja status em tempo real.</p>
          </div>
          <div className="p-6 rounded-lg border bg-card card-offset">
            <div className="flex items-center gap-2">
              <img src="/lovable-uploads/a96c34cb-cea5-453d-a914-cabe08677551.png" alt="Ícone publicação" className="w-5 h-5" loading="lazy" />
              <h2 className="text-lg font-medium">Publicação automática</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-2">O worker local dispara as publicações no horário.</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
