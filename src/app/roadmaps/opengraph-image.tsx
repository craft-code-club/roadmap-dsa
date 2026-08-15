import { ROADMAPS } from "@content/roadmaps";
import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const alt = `Roadmaps do Roadmap DSA: ${ROADMAPS.length} percursos sobre os mesmos tópicos do guia`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";

export default function RoadmapsOpengraphImage() {
  return ogImage({
    highlight: "Roadmaps",
    title: "e outros tópicos",
    subtitle: `${ROADMAPS.length} percursos sobre os mesmos tópicos do guia, cada um com a sua ordem.`,
  });
}
