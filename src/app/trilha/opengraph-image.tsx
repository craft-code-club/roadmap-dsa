import { TRACKS, STANDALONES } from "@content/tracks";
import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const alt = `Trilhas e outros tópicos do Roadmap DSA: ${TRACKS.length} trilhas e ${STANDALONES.length} tópicos avulsos além do roadmap`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";

export default function TrilhasOpengraphImage() {
  return ogImage({
    highlight: "Trilhas",
    title: "e outros tópicos",
    subtitle: `${TRACKS.length} trilhas e ${STANDALONES.length} tópicos avulsos fora do roadmap.`,
  });
}
