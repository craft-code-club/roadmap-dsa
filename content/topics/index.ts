import type { ComponentType } from "react";
import BigO from "./big-o.mdx";
import TwoPointers from "./two-pointers.mdx";
import SlidingWindow from "./sliding-window.mdx";
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
  "sliding-window": {
    Body: SlidingWindow,
    summary: [
      "O problema com a força bruta",
      "A ideia, em uma frase",
      "Janela fixa: o tamanho travado em k",
      "Janela variável: quando o tamanho não é dado",
      "Por que dá para descartar o que saiu",
      "Fixa ou variável: como escolher",
    ],
  },
};

export function getArticle(slug: string): Article | undefined {
  return ARTICLES[slug];
}
