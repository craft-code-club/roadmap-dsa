import type { Metadata } from "next";
import { RoadmapGroups } from "@/components/RoadmapGroups";

export const metadata: Metadata = {
  title: "Do zero à entrevista",
  description: "O roadmap completo de Algoritmos e Estruturas de Dados da comunidade Craft & Code Club, do básico ao avançado.",
};

export default function RoadmapPage() {
  return (
    <div className="roadmap-wrap">
      <span className="roadmap-eyebrow">Roadmap</span>
      <h1>Do zero à entrevista</h1>
      <p className="roadmap-intro">
        Siga na ordem ou pule direto para o que você precisa. Seu progresso fica salvo neste
        navegador, sem login, sem conta.
      </p>
      <RoadmapGroups />
    </div>
  );
}
