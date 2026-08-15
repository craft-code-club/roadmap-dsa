import type { Metadata } from "next";
import Link from "next/link";
import {
  CARDS_AVULSOS,
  EXTRA_CARDS,
  ROADMAPS_EXTRAS,
  TOTAL_TOPICS_FORA_DOS_FUNDAMENTOS,
} from "@content/roadmaps";
import { TOPICOS } from "@content/topicos";
import { ExtrasGrid } from "@/components/ExtrasGrid";
import { extrasJsonLd, JsonLd } from "@/lib/jsonld";
import { LINKS } from "@/lib/links";
import { pageMetadata, resumoParaBusca } from "@/lib/seo";

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
    // A lista dos nomes vem do DADO. Escrita à mão, ela prometeu por semanas
    // sete roadmaps que já não existiam, e o snippet do Google é o único lugar
    // do site em que uma promessa velha continua sendo servida depois do deploy.
    description: resumoParaBusca(
      // O nome dos roadmaps vem por último de propósito: a parte genérica é a que
      // tem de sobreviver ao corte quando a lista crescer.
      `Percursos de estudo montados sobre os ${TOPICOS.length} tópicos do guia de algoritmos e estruturas de dados, em português, com visualização e vídeo: ${ROADMAPS_EXTRAS.map((r) => r.name).join(", ")}.`
    ),
    ogTitle: "Roadmaps de Algoritmos e Estruturas de Dados",
    ogDescription: `${ROADMAPS_EXTRAS.length} percursos além dos Fundamentos, montados sobre os ${TOPICOS.length} tópicos do guia. Visual, em português, grátis.`,
    path: "/roadmaps/",
  });
}

export const dynamic = "force-static";

export default function RoadmapsPage() {
  return (
    <div className="roadmap-wrap">
      {/* Os DOIS conjuntos, porque a página desenha os dois. A marcação
          declarava só os roadmaps enquanto a tela mostrava também os tópicos
          avulsos, e a regra desta casa é que o dado estruturado é o que está
          na tela. */}
      <JsonLd
        data={extrasJsonLd(
          [...EXTRA_CARDS, ...CARDS_AVULSOS].map((c) => ({ name: c.name, href: c.href }))
        )}
      />
      <span className="roadmap-eyebrow">Além dos Fundamentos</span>
      <h1>Roadmaps</h1>
      <p className="roadmap-intro">
        Um roadmap é uma ordem de leitura: quais tópicos, em que sequência, e por quê. Os{" "}
        <Link href="/roadmaps/fundamentos">Fundamentos</Link> são o principal, do zero à entrevista.
        Os outros são percursos com objetivo próprio, montados sobre os mesmos{" "}
        <Link href="/topicos">tópicos</Link> do guia, na ordem que aquela pergunta pede. Alguns
        trazem também tópicos que só fazem sentido ali, para enquadrar o assunto. O mesmo tópico
        pode estar em vários percursos, sempre com uma página só.
      </p>

      <section className="rgroup" id="vitrine">
        <div className="rgroup-head">
          <h2>Todos os roadmaps</h2>
          <span className="rgroup-count">{EXTRA_CARDS.length}</span>
          <div className="rgroup-rule" />
        </div>
        <ExtrasGrid />
      </section>

      {/* Os tópicos que nenhum roadmap cita.
          Eles se perdiam: sem percurso que os anunciasse, o único lugar em que
          apareciam era o índice de 50, no meio de todos os outros. Um tópico
          que se basta numa página é uma OFERTA do guia, do mesmo tipo que um
          roadmap é, e oferta mora na vitrine. Vêm DEPOIS dos roadmaps, e em
          seção própria, porque a promessa é outra: aqui não há sequência para
          percorrer, há um assunto que acaba numa tela. */}
      {CARDS_AVULSOS.length > 0 && (
        <section className="rgroup" id="topicos-extras">
          <div className="rgroup-head">
            <h2>Tópicos extras</h2>
            <span className="rgroup-count">{CARDS_AVULSOS.length}</span>
            <div className="rgroup-rule" />
          </div>
          <p className="extras-intro">
            Assuntos que não pedem um percurso: cada um se basta numa página. Eles também estão no{" "}
            <Link href="/topicos">índice completo</Link>, junto com todos os outros.
          </p>
          <ExtrasGrid cards={CARDS_AVULSOS} />
        </section>
      )}

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
