import type { Metadata } from "next";
import { TOTAL_TOPICS } from "@content/roadmap";
import { RoadmapGroups } from "@/components/RoadmapGroups";
import { JsonLd, roadmapJsonLd } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Roadmap de Algoritmos e Estruturas de Dados: trilha completa",
    description: `Trilha completa de algoritmos e estruturas de dados em português, do Big O aos grafos: ${TOTAL_TOPICS} tópicos na ordem certa, com visualização, vídeo e problemas do LeetCode.`,
    ogTitle: "Roadmap de Algoritmos e Estruturas de Dados",
    ogDescription: `${TOTAL_TOPICS} tópicos na ordem certa de estudo, do Big O aos grafos. Trilha completa, visual e gratuita.`,
    path: "/roadmap/",
  });
}

export default function RoadmapPage() {
  return (
    <div className="roadmap-wrap">
      {/* A trilha que esta página já desenha, também em dado estruturado: os
          mesmos tópicos, na mesma ordem dos cards. */}
      <JsonLd data={roadmapJsonLd()} />
      <span className="roadmap-eyebrow">Do zero à entrevista</span>
      <h1>Roadmap de Algoritmos e Estruturas de Dados</h1>
      <p className="roadmap-intro">
        Siga na ordem ou pule direto para o que você precisa. Seu progresso fica salvo neste
        navegador, sem login, sem conta.
      </p>
      <RoadmapGroups />
    </div>
  );
}
