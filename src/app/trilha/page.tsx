import type { Metadata } from "next";
import Link from "next/link";
import {
  TRACKS,
  EXTRA_CARDS,
  STANDALONES,
  TOTAL_EXTRA_TOPICS,
} from "@content/tracks";
import { TOTAL_TOPICS } from "@content/roadmap";
import { ExtrasGrid } from "@/components/ExtrasGrid";
import { extrasJsonLd, JsonLd } from "@/lib/jsonld";
import { LINKS } from "@/lib/links";
import { pageMetadata } from "@/lib/seo";

// A vitrine do que existe fora do roadmap.
//
// Ela e a seção do fim do `/roadmap/` mostram a MESMA grade, pelo mesmo
// componente. A diferença é a intenção de quem chega: no roadmap a vitrine é o
// que vem depois de rolar o roadmap inteiro; aqui ela é o destino, e por isso
// esta página explica os dois formatos antes de listar.

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Trilhas e outros tópicos de estruturas de dados, além do roadmap",
    description: `Estruturas e algoritmos fora do roadmap: ${STANDALONES.length} tópicos avulsos que se bastam sozinhos e ${TRACKS.length} trilhas sobre famílias inteiras: árvores balanceadas, consultas em intervalos, padrões em strings, grafos avançados e estruturas probabilísticas.`,
    ogTitle: "Trilhas e outros tópicos de estruturas de dados",
    ogDescription: `${TRACKS.length} trilhas e ${STANDALONES.length} tópicos avulsos além dos ${TOTAL_TOPICS} tópicos do roadmap. Visual, em português, grátis.`,
    path: "/trilha/",
  });
}

export const dynamic = "force-static";

const FORMATOS = [
  {
    kind: "standalone",
    titulo: "Tópico",
    texto:
      "Uma estrutura que se basta numa tela só: o artigo, o código e os problemas no mesmo lugar, sem trilha ao lado. Você abre, lê do começo ao fim e sai sabendo.",
  },
  {
    kind: "track",
    titulo: "Trilha",
    texto:
      "Uma família que não cabe numa página: vários tópicos em ordem, com barra lateral própria e progresso próprio. Você percorre como percorre o roadmap, só que sobre um assunto só.",
  },
] as const;

export default function TrilhasPage() {
  return (
    <div className="roadmap-wrap">
      <JsonLd data={extrasJsonLd(EXTRA_CARDS.map((c) => ({ name: c.name, href: c.href })))} />
      <span className="roadmap-eyebrow">Além do roadmap</span>
      <h1>Trilhas e outros tópicos</h1>
      <p className="roadmap-intro">
        O <Link href="/roadmap">roadmap</Link> é a ordem em que se aprende do zero à entrevista:{" "}
        {TOTAL_TOPICS} tópicos que se apoiam uns nos outros. Nem tudo que vale a pena aprender cabe
        nessa fila: tem estrutura que é um assunto à parte, e tem família inteira que precisa de
        uma trilha. É o que está aqui: {TOTAL_EXTRA_TOPICS} tópicos que não estão no roadmap, e não
        precisam estar.
      </p>

      <div className="grid-2 formatos">
        {FORMATOS.map((f) => (
          <div className="formato-card" key={f.kind}>
            <span className={`extra-kind extra-kind-${f.kind}`}>{f.titulo}</span>
            <p>{f.texto}</p>
          </div>
        ))}
      </div>

      <section className="rgroup" id="vitrine">
        <div className="rgroup-head">
          <h2>Tudo que existe fora do roadmap</h2>
          <span className="rgroup-count">{EXTRA_CARDS.length}</span>
          <div className="rgroup-rule" />
        </div>
        <ExtrasGrid />
      </section>

      <div className="discord-strip">
        <span className="dot" />
        <p>
          Falta alguma estrutura aqui? A lista é da comunidade: proponha no Discord ou abra uma
          issue no GitHub, e ela entra.
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
