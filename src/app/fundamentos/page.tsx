import type { Metadata } from "next";
import Link from "next/link";
import { ROADMAPS, EXTRA_CARDS, FUNDAMENTOS, roadmapTopics, TOPICOS_AVULSOS } from "@content/roadmaps";

// Quantos tópicos os Fundamentos citam. NÃO é `TOTAL_TOPICS`: desde que os
// tópicos deixaram de ter casa, aquele número é o do site inteiro (80), e esta
// página desenha 44. Prometer 80 no título de busca e entregar 44 na tela é o
// tipo de desencontro que a pessoa percebe no segundo card.
const QUANTOS = roadmapTopics(FUNDAMENTOS).length;
import { ExtrasGrid } from "@/components/ExtrasGrid";
import { FundamentosGroups } from "@/components/FundamentosGroups";
import { fundamentosJsonLd, JsonLd } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Fundamentos de Algoritmos e Estruturas de Dados: a sequência completa",
    description: `Os fundamentos de algoritmos e estruturas de dados em português, do Big O aos grafos: ${QUANTOS} tópicos na ordem certa, com visualização, vídeo e problemas do LeetCode.`,
    ogTitle: "Fundamentos de Algoritmos e Estruturas de Dados",
    ogDescription: `${QUANTOS} tópicos na ordem certa de estudo, do Big O aos grafos. Visual, gratuito e em português.`,
    path: "/fundamentos/",
  });
}

export default function RoadmapPage() {
  return (
    <div className="roadmap-wrap">
      {/* O roadmap que esta página já desenha, também em dado estruturado: os
          mesmos tópicos, na mesma ordem dos cards. */}
      <JsonLd data={fundamentosJsonLd(roadmapTopics(FUNDAMENTOS))} />
      <span className="roadmap-eyebrow">Do zero à entrevista</span>
      <h1>Fundamentos de Algoritmos e Estruturas de Dados</h1>
      <p className="roadmap-intro">
        Siga na ordem ou pule direto para o que você precisa. Seu progresso fica salvo neste
        navegador, sem login, sem conta.
      </p>
      <FundamentosGroups />

      {/*
        O fim dos Fundamentos, e o que vem depois deles.

        O roadmap acabava no último card de Matemática, e ali o aluno que chegou
        até o fim não recebia nada — nem "acabou", nem "e agora?". Esta seção é
        as duas coisas: ela FECHA os Fundamentos dizendo que aquilo era a ordem, e
        abre a porta para o que não cabe em ordem nenhuma.

        Ela vem DEPOIS dos 16 grupos de propósito, e não como um 17º grupo: um
        grupo a mais no meio da lista diria que aquilo faz parte da sequência, e
        é exatamente o oposto — o que está aqui é o que a sequência não comporta.
        Pela mesma razão ela não entra no `ItemList` do JSON-LD acima, que
        declara os Fundamentos: a vitrine tem `ItemList` próprio, em `/roadmaps/`.
      */}
      <section className="rgroup extras-no-roadmap" id="alem-dos-fundamentos">
        <div className="rgroup-head">
          <h2>Além dos Fundamentos</h2>
          <span className="rgroup-count">{EXTRA_CARDS.length}</span>
          <div className="rgroup-rule" />
        </div>
        <p className="extras-intro">
          Acabou a ordem sugerida. O que vem agora não está na fila porque não precisa estar:{" "}
          <strong>{TOPICOS_AVULSOS.length} tópicos</strong> que se bastam numa página e{" "}
          <strong>{ROADMAPS.length} roadmaps</strong> sobre famílias inteiras, para depois que os
          fundamentos estiverem no lugar. <Link href="/roadmaps">Ver a vitrine completa →</Link>
        </p>
        <ExtrasGrid />
      </section>
    </div>
  );
}
