import { COURSES, STANDALONES } from "@content/courses";
import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const alt = `Cursos e outras estruturas de dados do Roadmap DSA: ${COURSES.length} cursos e ${STANDALONES.length} páginas avulsas além da trilha principal`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";

export default function CursosOpengraphImage() {
  return ogImage({
    highlight: "Cursos",
    title: "e outras estruturas",
    subtitle: `${COURSES.length} cursos e ${STANDALONES.length} páginas avulsas fora da trilha principal.`,
  });
}
