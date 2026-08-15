import type { Metadata } from "next";
import Link from "next/link";
import {
  getTopico,
  TOTAL_TOPICS,
  TOTAL_TOPICS_PRONTOS,
  TOTAL_VISUALIZERS,
} from "@content/topicos";
import { EXTRA_CARDS } from "@content/roadmaps";
import { TOTAL_LEETCODE_PROBLEMS, TOTAL_PROBLEMS } from "@content/topicos/pratica";
import { ExtrasGrid } from "@/components/ExtrasGrid";
import { LINKS } from "@/lib/links";
import { pageMetadata } from "@/lib/seo";
import { levelClass } from "@/lib/ui";

// Os números saem do roadmap.ts (fonte única) em vez de escritos à mão: tópico
// novo já entra no título e no card sem ninguém lembrar de atualizar o SEO.
//
// São DOIS números, e a escolha é frase a frase. `TOTAL_TOPICS` é o tamanho da
// dos Fundamentos, o que eles mapeiam: continua certo no título e no card de
// estatística ("tópicos nos Fundamentos"). `TOTAL_TOPICS_PRONTOS` é quem tem material
// para o aluno abrir, e é ele que vale em toda frase que QUALIFICA os tópicos
// pelo que eles entregam. Os 11 de diferença não têm vídeo, artigo nem
// visualização: são exatamente os que o próprio site marca "em breve" e tira do
// índice do Google, pela mesma `isEmptyTopic` de onde a constante deriva.
export function generateMetadata(): Metadata {
  return pageMetadata({
    title: `Algoritmos e Estruturas de Dados: Guia Visual com ${TOTAL_TOPICS} Tópicos`,
    description: `O guia mais completo de algoritmos e estruturas de dados em português: ${TOTAL_TOPICS_PRONTOS} tópicos com visualização passo a passo, código Python e problemas do LeetCode para entrevistas. Grátis.`,
    ogTitle: "O maior guia visual de Algoritmos e Estruturas de Dados",
    ogDescription: `${TOTAL_TOPICS_PRONTOS} tópicos com o algoritmo rodando passo a passo, código em Python, vídeo e ${TOTAL_LEETCODE_PROBLEMS} problemas do LeetCode. Grátis, para sempre.`,
    path: "/",
  });
}

// "Comece por aqui": fundamentos primeiro, do mais básico ao primeiro padrão,
// sem tópicos difíceis. É o ponto de partida de quem está começando, e por isso
// é uma lista à mão: derivá-la da ordem dos Fundamentos daria os seis primeiros
// da sequência, que não é a mesma coisa.
const FEATURED = ["big-o", "arrays", "strings", "two-pointers", "listas-ligadas", "pilhas"];

const FEATURES = [
  { icone: "▶", titulo: "O algoritmo rodando", texto: "Passo a passo, no seu ritmo, com o seu próprio array de entrada e o código Python acompanhando linha a linha." },
  { icone: "✎", titulo: "Texto direto ao ponto", texto: "Explicação em português de gente, sem tradução automática e sem enrolação acadêmica." },
  { icone: "↗", titulo: "Prática de verdade", texto: "Lista curada de problemas do LeetCode e do GeeksforGeeks, na ordem certa de dificuldade." },
];

export default function Home() {
  const stats = [
    { n: `${TOTAL_TOPICS}`, rot: "tópicos nos Fundamentos" },
    { n: `${TOTAL_VISUALIZERS}`, rot: "tópicos com visualização" },
    { n: `${TOTAL_PROBLEMS}`, rot: "problemas selecionados" },
    { n: "Gratuito", rot: "para sempre" },
  ];
  const destaques = FEATURED.map((slug) => getTopico(slug)).filter((t) => !!t);

  return (
    <>
      <section className="hero">
        <span className="hero-badge">Feito pela comunidade Craft &amp; Code Club · 100% grátis · open source</span>
        <h1><span className="accent">Visualização</span> e aprofundamento em cada estrutura</h1>
        <p>
          O maior guia visual de algoritmos e estruturas de dados em português. Nos {TOTAL_TOPICS_PRONTOS} tópicos
          já publicados você encontra o texto, o algoritmo animado passo a passo com o código
          sincronizado, vídeo e uma lista de problemas do LeetCode e do GeeksforGeeks.
        </p>
        <div className="hero-actions">
          {/* Começar é entrar NO percurso, não numa página solta: o botão abre o Big O
              dentro dos Fundamentos, com o menu do roadmap do lado e o "Próximo" no fim.
              A página canônica do tópico (`/topicos/big-o/`) é para quem chega pelo
              índice geral, sem percurso escolhido. */}
          <Link href="/fundamentos/big-o" className="btn btn-primary">
            Começar por Big O
          </Link>
          <Link href="/fundamentos" className="btn">Ver os Fundamentos</Link>
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
          <Link href="/fundamentos" className="link-btn">Ver tudo →</Link>
        </div>
        <div className="grid-3">
          {destaques.map((t) => (
            <Link key={t.slug} href={`/topicos/${t.slug}`} className="destaque-card">
              <div className="destaque-top">
                <span className="destaque-grupo">{t.group}</span>
                <span className={`level ${levelClass(t.level)}`}>{t.level}</span>
              </div>
              <div className="destaque-nome">{t.name}</div>
              <p>{t.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* A porta para fora dos Fundamentos, na home.
          Ela existe porque a vitrine mora em dois lugares que quem chega hoje
          não abre: o FIM do /fundamentos/ (depois de 16 grupos de rolagem) e a
          /roadmaps/, que só se descobre pelo link do topo. Três cards aqui — os
          que já têm material, que é a ordem do `EXTRA_CARDS` — contam que o
          site é maior que a fila, sem competir com o "Comece por aqui" logo
          acima, que continua sendo o convite principal. */}
      <section className="section-pad-x">
        <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em" }}>Além dos Fundamentos</h2>
          <Link href="/roadmaps" className="link-btn">Ver tudo →</Link>
        </div>
        <p className="sub" style={{ margin: "0 0 18px", fontSize: 15, color: "var(--ccc-muted)" }}>
          Estruturas que são um assunto à parte, e roadmaps sobre famílias inteiras.
        </p>
        <ExtrasGrid cards={EXTRA_CARDS.slice(0, 3)} />
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

    </>
  );
}

