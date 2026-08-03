import Link from "next/link";
import {
  FEATURED,
  getTopic,
  TOTAL_PROBLEMS,
  TOTAL_TOPICS,
  TOTAL_VISUALIZERS,
} from "@content/roadmap";
import { LINKS } from "@/lib/links";
import { levelClass } from "@/lib/ui";

const FEATURES = [
  { icone: "▶", titulo: "O algoritmo rodando", texto: "Passo a passo, no seu ritmo, com o seu próprio array de entrada e o código Python acompanhando linha a linha." },
  { icone: "✎", titulo: "Texto direto ao ponto", texto: "Explicação em português de gente, sem tradução automática e sem enrolação acadêmica." },
  { icone: "↗", titulo: "Prática de verdade", texto: "Lista curada de problemas do LeetCode e do GeeksforGeeks, na ordem certa de dificuldade." },
];

export default function Home() {
  const stats = [
    { n: `${TOTAL_TOPICS}`, rot: "tópicos no roadmap" },
    { n: `${TOTAL_VISUALIZERS}`, rot: "tópicos com visualização" },
    { n: `${TOTAL_PROBLEMS}`, rot: "problemas selecionados" },
    { n: "Gratuito", rot: "para sempre" },
  ];
  const destaques = FEATURED.map((slug) => getTopic(slug)).filter(Boolean);

  return (
    <>
      <section className="hero">
        <span className="hero-badge">Feito pela comunidade Craft &amp; Code Club · 100% grátis · open source</span>
        <h1><span className="accent">Visualização</span> e aprofundamento em cada estrutura</h1>
        <p>
          O maior guia visual de algoritmos em português. Cada tópico traz o texto, o algoritmo
          animado passo a passo com o código sincronizado, vídeo e uma lista de problemas do
          LeetCode e do GeeksforGeeks.
        </p>
        <div className="hero-actions">
          <Link href="/topico/big-o" className="btn btn-primary">
            Começar por Big O
          </Link>
          <Link href="/roadmap" className="btn">Ver o roadmap completo</Link>
        </div>
      </section>

      <section className="stats">
        {stats.map((s) => (
          <div className="stat" key={s.rot}>
            <div className="stat-n">{s.n}</div>
            <div className="stat-rot">{s.rot}</div>
          </div>
        ))}
      </section>

      <section className="section">
        <h2>Como cada tópico funciona</h2>
        <p className="sub">Uma página por tópico. Tudo no mesmo lugar, sem pular entre dez abas.</p>
        <div className="grid-3">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.titulo}>
              <div className="feature-ico">{f.icone}</div>
              <h3>{f.titulo}</h3>
              <p>{f.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section-pad-x">
        <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em" }}>Comece por aqui</h2>
          <Link href="/roadmap" className="link-btn">Ver tudo →</Link>
        </div>
        <div className="grid-3">
          {destaques.map((t) => (
            <Link key={t!.slug} href={`/topico/${t!.slug}`} className="destaque-card">
              <div className="destaque-top">
                <span className="destaque-grupo">{t!.group}</span>
                <span className={`level ${levelClass(t!.level)}`}>{t!.level}</span>
              </div>
              <div className="destaque-nome">{t!.name}</div>
              <p>{t!.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid-2 section-pad-x">
        <div className="cta-card discord">
          <div className="cta-eyebrow" style={{ color: "#a9b3ff" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#5865f2" }} />Comunidade
          </div>
          <h3>Estudar sozinho é mais difícil</h3>
          <p style={{ color: "#b4c1de" }}>
            Entra no Discord da comunidade Craft &amp; Code Club: maratona semanal de problemas, revisão de
            código e gente resolvendo as mesmas questões que você.
          </p>
          <a href={LINKS.discord} className="btn btn-discord" target="_blank" rel="noopener noreferrer">Entrar no Discord →</a>
        </div>
        <div className="cta-card coffee">
          <div className="cta-eyebrow" style={{ color: "#fcd34d" }}>
            <span>♥</span>Apoie a comunidade
          </div>
          <h3>Livre, e mantido pela comunidade</h3>
          <p style={{ color: "#dcc9a8" }}>
            Nada aqui é pago, nem vai ser. Se o conteúdo te ajuda, você pode apoiar a comunidade e
            ajudar a manter tudo livre e aberto, para quem vem depois.
          </p>
          <Link href="/apoie" className="btn btn-coffee">Seja um apoiador →</Link>
        </div>
      </section>

      <Footer />
    </>
  );
}

function Footer() {
  return (
    <footer className="site-foot">
      <div className="foot-text">
        <span>Feito <span className="heart">♥</span> pela comunidade, para a comunidade.</span>
        <span className="foot-sep">·</span>
        <span>Open source · gratuito para sempre</span>
      </div>
      <div className="foot-links">
        <a href={LINKS.github} target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href={LINKS.discord} target="_blank" rel="noopener noreferrer">Discord</a>
        <Link href="/apoie">Apoiar</Link>
      </div>
    </footer>
  );
}
