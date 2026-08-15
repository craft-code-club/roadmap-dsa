import { TOTAL_TOPICS } from "@content/fundamentos";
import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const alt = `Roadmap de Algoritmos e Estruturas de Dados: ${TOTAL_TOPICS} tópicos na ordem certa de estudo, do Big O aos grafos`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";

export default function RoadmapOpengraphImage() {
  return ogImage({
    highlight: "Roadmap",
    title: "de Algoritmos e Estruturas de Dados",
    subtitle: `${TOTAL_TOPICS} tópicos na ordem certa de estudo, do Big O aos grafos.`,
  });
}
