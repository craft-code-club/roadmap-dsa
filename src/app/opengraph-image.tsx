import { TOTAL_TOPICS } from "@content/roadmap";
import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

export const alt = `Roadmap DSA: o maior guia visual de Algoritmos e Estruturas de Dados em português, com ${TOTAL_TOPICS} tópicos, grátis`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";

// Card da home. Também é o fallback de toda rota sem card próprio (os /topico/*),
// por isso a chamada aqui fala do site inteiro e não de uma página só.
export default function OpengraphImage() {
  return ogImage({
    highlight: "Visualização",
    title: "e aprofundamento em cada estrutura",
    subtitle: "O maior guia visual de Algoritmos e Estruturas de Dados, em português.",
  });
}
