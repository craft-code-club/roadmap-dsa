import type { ComponentType } from "react";
import TwoPointers from "./two-pointers.mdx";
import SlidingWindowFixed from "./sliding-window-fixed.mdx";
import SlidingWindowDynamic from "./sliding-window-dynamic.mdx";

// Registro dos artigos em MDX. Para adicionar um tópico "ready":
//   1. crie content/topics/<slug>.mdx (use <SlidingWindowVisualizer /> etc.)
//   2. registre-o aqui
//   3. em content/roadmap.ts marque status "ready" (e o viz, se houver)
export type Article = { Body: ComponentType; summary: string[] };

// summary = SÓ os títulos (h2) do artigo, no texto exato. A página do tópico
// acrescenta "Vídeo da aula" e "Problemas para praticar" quando existem.
export const ARTICLES: Record<string, Article> = {
  "two-pointers": {
    Body: TwoPointers,
    summary: ["O padrão", "Two Sum num array ordenado", "Por que funciona"],
  },
  "sliding-window-fixed": {
    Body: SlidingWindowFixed,
    summary: ["O problema com a força bruta", "A ideia, em uma frase", "Janela fixa vs. variável"],
  },
  "sliding-window-dynamic": {
    Body: SlidingWindowDynamic,
    summary: ["Quando o tamanho não é dado", "A ideia, em uma frase", "Por que dá para descartar o que saiu"],
  },
};

export function getArticle(slug: string): Article | undefined {
  return ARTICLES[slug];
}
