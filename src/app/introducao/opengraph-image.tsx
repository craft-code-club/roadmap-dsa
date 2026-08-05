import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const alt =
  "Por onde começar em Algoritmos e Estruturas de Dados: o que estudar primeiro e em que ordem";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";

export default function IntroducaoOpengraphImage() {
  return ogImage({
    highlight: "Por onde começar",
    title: "em Algoritmos e Estruturas de Dados",
    subtitle: "O que estudar primeiro, em que ordem, e como usar o roadmap.",
    titleSize: 56,
  });
}
