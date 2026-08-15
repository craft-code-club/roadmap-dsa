import type { Metadata } from "next";
import Link from "next/link";
import { TOTAL_TOPICS } from "@content/roadmap";
import { TRACKS, EXTRA_CARDS, STANDALONES } from "@content/tracks";
import { ExtrasGrid } from "@/components/ExtrasGrid";
import { RoadmapGroups } from "@/components/RoadmapGroups";
import { JsonLd, roadmapJsonLd } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Roadmap de Algoritmos e Estruturas de Dados: roadmap completa",
    description: `Roadmap completa de algoritmos e estruturas de dados em português, do Big O aos grafos: ${TOTAL_TOPICS} tópicos na ordem certa, com visualização, vídeo e problemas do LeetCode.`,
    ogTitle: "Roadmap de Algoritmos e Estruturas de Dados",
    ogDescription: `${TOTAL_TOPICS} tópicos na ordem certa de estudo, do Big O aos grafos. Roadmap completa, visual e gratuita.`,
    path: "/roadmap/",
  });
}

export default function RoadmapPage() {
  return (
    <div className="roadmap-wrap">
      {/* O roadmap que esta página já desenha, também em dado estruturado: os
          mesmos tópicos, na mesma ordem dos cards. */}
      <JsonLd data={roadmapJsonLd()} />
      <span className="roadmap-eyebrow">Do zero à entrevista</span>
      <h1>Roadmap de Algoritmos e Estruturas de Dados</h1>
      <p className="roadmap-intro">
        Siga na ordem ou pule direto para o que você precisa. Seu progresso fica salvo neste
        navegador, sem login, sem conta.
      </p>
      <RoadmapGroups />

      {/*
        O fim do roadmap, e o que vem depois dele.

        O roadmap acabava no último card de Matemática, e ali o aluno que chegou
        até o fim não recebia nada — nem "acabou", nem "e agora?". Esta seção é
        as duas coisas: ela FECHA o roadmap dizendo que aquilo era a ordem, e
        abre a porta para o que não cabe em ordem nenhuma.

        Ela vem DEPOIS dos 16 grupos de propósito, e não como um 17º grupo: um
        grupo a mais no meio da lista diria que aquilo faz parte da sequência, e
        é exatamente o oposto — o que está aqui é o que a sequência não comporta.
        Pela mesma razão ela não entra no `ItemList` do JSON-LD acima, que
        declara o roadmap: a vitrine tem `ItemList` próprio, em `/trilha/`.
      */}
      <section className="rgroup extras-no-roadmap" id="alem-do-roadmap">
        <div className="rgroup-head">
          <h2>Além do roadmap</h2>
          <span className="rgroup-count">{EXTRA_CARDS.length}</span>
          <div className="rgroup-rule" />
        </div>
        <p className="extras-intro">
          Acabou a ordem sugerida. O que vem agora não está na fila porque não precisa estar:{" "}
          <strong>{STANDALONES.length} tópicos</strong> que se bastam numa página e{" "}
          <strong>{TRACKS.length} trilhas</strong> sobre famílias inteiras, para depois que os
          fundamentos estiverem no lugar. <Link href="/trilha">Ver a vitrine completa →</Link>
        </p>
        <ExtrasGrid />
      </section>
    </div>
  );
}
