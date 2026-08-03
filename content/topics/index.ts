import type { ComponentType } from "react";
import BigO from "./big-o.mdx";
import TwoPointers from "./two-pointers.mdx";
import SlidingWindowFixed from "./sliding-window-fixed.mdx";
import SlidingWindowDynamic from "./sliding-window-dynamic.mdx";
import SubTypes from "./subarray-substring-subsequence-subset.mdx";

// Registro dos artigos em MDX. Para adicionar um tópico "ready":
//   1. crie content/topics/<slug>.mdx (use <SlidingWindowVisualizer /> etc.)
//   2. registre-o aqui
//   3. em content/roadmap.ts marque status "ready" (e o viz, se houver)
export type Article = { Body: ComponentType; summary: string[] };

// summary = SÓ os títulos (h2) do artigo, no texto exato. A página do tópico
// acrescenta "Vídeo da aula" e "Problemas para praticar" quando existem.
export const ARTICLES: Record<string, Article> = {
  "big-o": {
    Body: BigO,
    summary: [
      "O que o Big O mede",
      "As três regras",
      "As famílias, do O(1) ao O(n!)",
      "Contando operações no mesmo array",
      "Melhor caso, caso médio e pior caso",
      "As armadilhas que pegam todo mundo",
    ],
  },
  "subarray-substring-subsequence-subset": {
    Body: SubTypes,
    summary: [
      "As duas perguntas",
      "Subarray e substring: a fatia",
      "Subsequence: apaga, mas não reordena",
      "Subset: o saco de elementos",
      "A pegadinha: subsequence x subset",
      "O mesmo grid resolve substring e subsequence",
      "Lendo o enunciado em 5 segundos",
    ],
  },
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
