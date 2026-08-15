import type { Metadata } from "next";
import Link from "next/link";
import {
  EXTRA_CARDS,
  ROADMAPS_EXTRAS,
  TOTAL_TOPICS_FORA_DOS_FUNDAMENTOS,
} from "@content/roadmaps";
import { TOPICOS } from "@content/topicos";
import { ExtrasGrid } from "@/components/ExtrasGrid";
import { extrasJsonLd, JsonLd } from "@/lib/jsonld";
import { LINKS } from "@/lib/links";
import { pageMetadata } from "@/lib/seo";

// A vitrine dos roadmaps que não são os Fundamentos.
//
// Ela e a seção do fim do `/fundamentos/` mostram a MESMA grade, pelo mesmo
// componente. A diferença é a intenção de quem chega: lá a vitrine é o que vem
// depois de percorrer a sequência principal; aqui ela é o destino.
//
// Ela lista ROADMAPS, e só. Tópico solto tem casa própria — o índice
// `/topicos/`, que lista os 80 com busca e filtro.

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Roadmaps de Algoritmos e Estruturas de Dados, além dos Fundamentos",
    description: `${ROADMAPS_EXTRAS.length} roadmaps de estruturas de dados e algoritmos além da sequência principal: bancos de dados, caminhos mínimos, árvores balanceadas, consultas em intervalos, padrões em strings, grafos avançados e estruturas probabilísticas.`,
    ogTitle: "Roadmaps de Algoritmos e Estruturas de Dados",
    ogDescription: `${ROADMAPS_EXTRAS.length} percursos além dos Fundamentos, montados sobre os ${TOPICOS.length} tópicos do guia. Visual, em português, grátis.`,
    path: "/roadmaps/",
  });
}

export const dynamic = "force-static";

export default function RoadmapsPage() {
  return (
    <div className="roadmap-wrap">
      <JsonLd data={extrasJsonLd(EXTRA_CARDS.map((c) => ({ name: c.name, href: c.href })))} />
      <span className="roadmap-eyebrow">Além dos Fundamentos</span>
      <h1>Roadmaps</h1>
      <p className="roadmap-intro">
        Um roadmap é uma ordem de leitura: quais tópicos, em que sequência, e por quê. Os{" "}
        <Link href="/roadmaps/fundamentos">Fundamentos</Link> são o principal, do zero à entrevista.
        Os outros são percursos com objetivo próprio, e não trazem tópico novo: eles se montam
        sobre os mesmos <Link href="/topicos">tópicos</Link> do guia, na ordem que aquela pergunta
        pede. O mesmo tópico pode estar em vários, com uma página só.
      </p>

      <section className="rgroup" id="vitrine">
        <div className="rgroup-head">
          <h2>Todos os roadmaps</h2>
          <span className="rgroup-count">{EXTRA_CARDS.length}</span>
          <div className="rgroup-rule" />
        </div>
        <ExtrasGrid />
      </section>

      <div className="discord-strip">
        <span className="dot" />
        <p>
          Falta algum roadmap aqui? A lista é da comunidade: proponha no Discord ou abra uma issue
          no GitHub, e ele entra.
        </p>
        <a
          href={LINKS.discord}
          className="btn btn-discord"
          target="_blank"
          rel="noopener noreferrer"
          style={{ padding: "9px 16px" }}
        >
          Propor
        </a>
      </div>
    </div>
  );
}
