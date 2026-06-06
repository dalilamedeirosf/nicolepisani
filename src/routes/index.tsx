import { createFileRoute } from "@tanstack/react-router";
import heroImg from "@/assets/hero-cardio.jpg";
import heartImg from "@/assets/heart-detail.jpg";
import draDesktop from "@/assets/dra-nicole-desktop.png.asset.json";
import draMobile from "@/assets/dra-nicole-mobile.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dra. Nicole Pisani · Cardiologista no Rio de Janeiro" },
      { name: "description", content: "Cardiologia clínica humanizada e baseada em evidências. Prevenção, diagnóstico e tratamento das doenças cardiovasculares no Rio de Janeiro." },
      { property: "og:title", content: "Dra. Nicole Pisani · Cardiologista no Rio de Janeiro" },
      { property: "og:description", content: "Cuidado cardiovascular completo para quem deseja viver mais e viver melhor." },
      { property: "og:image", content: heroImg },
    ],
  }),
  component: Index,
});

const BOOKING_URL = "https://www.doctoralia.com.br/nicole-pisani/cardiologista-medico-clinico-geral/rio-de-janeiro";

const services = [
  { title: "Avaliação Cardiológica Completa", desc: "Investigação detalhada da saúde cardiovascular para identificar fatores de risco e prevenir complicações futuras." },
  { title: "Controle de Pressão Arterial", desc: "Acompanhamento individualizado para pacientes com hipertensão arterial." },
  { title: "Palpitações e Arritmias", desc: "Diagnóstico e orientação para coração acelerado, irregularidades dos batimentos e desconfortos cardiovasculares." },
  { title: "Prevenção Cardiovascular", desc: "Estratégias para reduzir riscos de infarto, AVC e outras doenças cardiovasculares." },
  { title: "Check-up Cardiológico", desc: "Avaliação preventiva para quem deseja monitorar a saúde do coração e envelhecer com mais segurança." },
  { title: "Adultos e Idosos", desc: "Cuidado contínuo para promover qualidade de vida e longevidade saudável." },
];

const signs = [
  "Pressão alta", "Colesterol elevado", "Histórico familiar de doenças cardíacas",
  "Falta de ar", "Palpitações", "Dor no peito",
  "Cansaço excessivo", "Diabetes", "Sobrepeso ou obesidade", "Check-up preventivo",
];

function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden>
      <path d="M20 33s-12-7.2-12-16a7 7 0 0 1 12-4.9A7 7 0 0 1 32 17c0 8.8-12 16-12 16Z"
        stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="absolute top-0 left-0 right-0 z-20">
        <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-3 text-primary">
            <Mark className="w-7 h-7 text-accent" />
            <span className="font-serif text-xl tracking-wide">Dra. Nicole Pisani</span>
          </a>
          <nav className="hidden md:flex items-center gap-10 text-sm text-foreground/70">
            <a href="#sobre" className="hover:text-primary transition">Sobre</a>
            <a href="#servicos" className="hover:text-primary transition">Serviços</a>
            <a href="#quando" className="hover:text-primary transition">Quando procurar</a>
            <a href="#contato" className="hover:text-primary transition">Agendar</a>
          </nav>
          <a href={BOOKING_URL} target="_blank" rel="noopener" className="hidden md:inline-flex text-xs uppercase tracking-[0.18em] border border-primary/30 px-5 py-2.5 text-primary hover:bg-primary hover:text-primary-foreground transition">
            Agendar
          </a>
        </div>
      </header>

      {/* HERO */}
      <section id="top" className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pt-36 pb-24 md:pt-44 md:pb-32 grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-7">
            <p className="text-xs uppercase tracking-[0.32em] text-accent mb-8 flex items-center gap-3">
              <span className="w-10 h-px bg-accent" /> Cardiologia · Rio de Janeiro
            </p>
            <h1 className="font-serif text-5xl md:text-7xl leading-[1.02] text-primary text-balance">
              Cuidado cardiovascular <em className="italic text-accent">completo</em> para viver mais e viver melhor.
            </h1>
            <p className="mt-8 text-lg text-foreground/70 max-w-xl leading-relaxed">
              Seu coração merece atenção antes que os sinais apareçam. Acompanhamento humanizado, ético e baseado nas melhores evidências científicas.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <a href={BOOKING_URL} target="_blank" rel="noopener"
                className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 text-sm uppercase tracking-[0.18em] hover:bg-[color:var(--burgundy-deep)] transition">
                Agendar consulta
                <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5h12m0 0L9 1m4 4L9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </a>
              <a href="#sobre" className="text-sm tracking-wide text-primary border-b border-accent/60 pb-1 hover:border-accent">
                Conheça o atendimento
              </a>
            </div>
          </div>
          <div className="md:col-span-5 relative">
            <div className="aspect-[4/5] overflow-hidden border border-accent/30">
              <img src={heroImg} alt="Estetoscópio sobre mármore — cardiologia premium" width={1536} height={1280} className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden md:block bg-background border border-accent/40 px-6 py-5 max-w-[220px]">
              <p className="font-serif italic text-primary text-lg leading-snug">"Cada paciente possui uma história única."</p>
            </div>
          </div>
        </div>
        <div className="hairline mx-auto max-w-7xl" />
      </section>

      {/* SILENT DISEASE */}
      <section className="mx-auto max-w-5xl px-6 py-28 md:py-36 text-center">
        <p className="text-xs uppercase tracking-[0.32em] text-accent mb-6">A atenção começa agora</p>
        <h2 className="font-serif text-4xl md:text-5xl text-primary leading-tight text-balance">
          Muitas doenças cardiovasculares evoluem de forma <em className="italic text-accent">silenciosa</em>.
        </h2>
        <p className="mt-8 text-lg text-foreground/70 leading-relaxed max-w-3xl mx-auto">
          Pressão alta, colesterol elevado, arritmias e outros fatores de risco podem permanecer sem sintomas por anos, aumentando gradativamente o risco de infarto, AVC e outras complicações. Cuidar da saúde cardiovascular não deve começar apenas quando surgem os problemas.
        </p>
      </section>

      {/* SOBRE */}
      <section id="sobre" className="bg-[color:var(--burgundy-deep)] text-primary-foreground">
        <div className="mx-auto max-w-7xl px-6 py-28 md:py-36 grid md:grid-cols-12 gap-16 items-center">
          <div className="md:col-span-5">
            <div className="aspect-square overflow-hidden border border-accent/40">
              <img src={heartImg} alt="Ilustração anatômica do coração em bordô e dourado" width={1024} height={1024} loading="lazy" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="md:col-span-7">
            <p className="text-xs uppercase tracking-[0.32em] text-accent mb-6 flex items-center gap-3">
              <span className="w-10 h-px bg-accent" /> Sobre
            </p>
            <h2 className="font-serif text-4xl md:text-5xl leading-tight text-balance">
              Atendimento cardiológico <em className="italic text-accent">humanizado</em> e baseado em evidências.
            </h2>
            <div className="mt-8 space-y-5 text-primary-foreground/80 leading-relaxed">
              <p>Sou a <span className="text-accent">Dra. Nicole Pisani</span>, médica com atuação em Cardiologia Clínica e Clínica Médica, dedicada à prevenção, diagnóstico e tratamento das doenças cardiovasculares.</p>
              <p>Minhas consultas vão além da análise de exames. Avalio seus hábitos, rotina, histórico familiar, fatores de risco e objetivos de saúde para construir um plano de acompanhamento personalizado.</p>
              <p>Meu compromisso é oferecer um cuidado próximo, ético e atualizado, sempre fundamentado nas melhores evidências científicas disponíveis.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SERVIÇOS */}
      <section id="servicos" className="mx-auto max-w-7xl px-6 py-28 md:py-36">
        <div className="grid md:grid-cols-12 gap-10 mb-16">
          <div className="md:col-span-5">
            <p className="text-xs uppercase tracking-[0.32em] text-accent mb-6 flex items-center gap-3">
              <span className="w-10 h-px bg-accent" /> Como posso ajudar
            </p>
            <h2 className="font-serif text-4xl md:text-5xl text-primary leading-tight text-balance">
              Um cuidado construído para <em className="italic text-accent">sua realidade</em>.
            </h2>
          </div>
          <p className="md:col-span-6 md:col-start-7 text-foreground/70 leading-relaxed self-end">
            Da prevenção ao acompanhamento contínuo — uma abordagem completa, individual e atenta a cada detalhe da sua saúde cardiovascular.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
          {services.map((s, i) => (
            <article key={s.title} className="bg-background p-10 group hover:bg-secondary transition-colors">
              <div className="flex items-center justify-between mb-8">
                <span className="font-serif italic text-accent text-2xl">0{i + 1}</span>
                <Mark className="w-5 h-5 text-accent opacity-70" />
              </div>
              <h3 className="font-serif text-2xl text-primary leading-tight mb-4">{s.title}</h3>
              <p className="text-sm text-foreground/65 leading-relaxed">{s.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* QUANDO PROCURAR */}
      <section id="quando" className="bg-secondary">
        <div className="mx-auto max-w-7xl px-6 py-28 md:py-36">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-xs uppercase tracking-[0.32em] text-accent mb-6">Sinais de atenção</p>
            <h2 className="font-serif text-4xl md:text-5xl text-primary leading-tight text-balance">
              Quando procurar um <em className="italic text-accent">cardiologista</em>?
            </h2>
            <p className="mt-6 text-foreground/70 leading-relaxed">
              Mesmo sem sintomas, a avaliação cardiológica periódica pode identificar riscos precocemente e evitar problemas futuros.
            </p>
          </div>
          <ul className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px bg-border max-w-6xl mx-auto">
            {signs.map((sign) => (
              <li key={sign} className="bg-secondary px-6 py-8 text-center text-sm text-primary tracking-wide">
                <Mark className="w-4 h-4 text-accent mx-auto mb-3" />
                {sign}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section className="mx-auto max-w-4xl px-6 py-28 md:py-36 text-center">
        <p className="text-xs uppercase tracking-[0.32em] text-accent mb-6">Medicina centrada no paciente</p>
        <h2 className="font-serif text-4xl md:text-5xl text-primary leading-tight text-balance">
          Você não é apenas um exame ou um número.
        </h2>
        <p className="mt-8 font-serif italic text-2xl text-foreground/70 leading-relaxed">
          Você é uma pessoa que merece atenção, escuta e um plano de cuidado construído para sua realidade.
        </p>
        <div className="hairline mt-16 max-w-xs mx-auto" />
      </section>

      {/* CTA */}
      <section id="contato" className="relative bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <Mark className="absolute -right-20 -bottom-20 w-[420px] h-[420px] text-accent" />
        </div>
        <div className="relative mx-auto max-w-5xl px-6 py-28 md:py-36 text-center">
          <p className="text-xs uppercase tracking-[0.32em] text-accent mb-6">Agende sua consulta</p>
          <h2 className="font-serif text-4xl md:text-6xl leading-tight text-balance">
            Seu coração acompanha você <em className="italic text-accent">todos os dias</em>.
          </h2>
          <p className="mt-8 text-primary-foreground/80 text-lg max-w-2xl mx-auto leading-relaxed">
            Cuide dele com quem cuida de você. Dê o primeiro passo para sua saúde cardiovascular com segurança e confiança.
          </p>
          <a href={BOOKING_URL} target="_blank" rel="noopener"
            className="mt-12 inline-flex items-center gap-3 bg-accent text-[color:var(--burgundy-deep)] px-10 py-4 text-sm uppercase tracking-[0.2em] hover:bg-[color:var(--gold-soft)] transition">
            Agendar consulta
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5h12m0 0L9 1m4 4L9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[color:var(--burgundy-deep)] text-primary-foreground/70">
        <div className="mx-auto max-w-7xl px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
          <div className="flex items-center gap-3">
            <Mark className="w-5 h-5 text-accent" />
            <span className="font-serif text-base text-primary-foreground">Dra. Nicole Pisani</span>
            <span className="text-primary-foreground/40">·</span>
            <span>Cardiologia · Rio de Janeiro</span>
          </div>
          <p className="text-xs tracking-wide">© {new Date().getFullYear()} · Todos os direitos reservados</p>
        </div>
      </footer>
    </div>
  );
}
