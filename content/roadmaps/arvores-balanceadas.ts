import type { Roadmap } from "@/content/tipos";

// O que a BST promete e não cumpre quando a entrada chega ordenada.
//
// Um arquivo por roadmap: eles crescem para dezenas de tópicos cada, e num
// arquivo só a revisão de um PR que mexe em dois vira um diff ilegível.
// Registre o novo em `content/roadmaps/index.ts` — o teste
// `todo arquivo de roadmap está registrado no índice` reprova se esquecer.
export const roadmap: Roadmap = {
  slug: "arvores-balanceadas",
  name: "Árvores Balanceadas",
  tagline: "A rotação que impede a BST de virar uma lista.",
  description:
    "Uma árvore de busca binária só entrega O(log n) enquanto ninguém insere em ordem crescente, e inserir em ordem crescente é o caso mais comum do mundo real. Esta trilha é sobre as estruturas que garantem altura logarítmica no pior caso, e sobre o preço que cada uma cobra por essa garantia: rotação, cor, sorteio ou grau.",
  level: "Difícil",
  glyph: "❖",
  requires: ["bst", "arvores-binarias", "tree-traversals"],
  groups: [
    {
      id: "bal-rotacao",
      name: "Balanceamento por rotação",
      topics: [
        { topic: "avl" },
        { topic: "rubro-negra" },
        { topic: "splay-tree" },
      ],
    },
    {
      id: "bal-aleatoria",
      name: "Balanceamento sem invariante",
      topics: [
        { topic: "treap" },
      ],
    },
    {
      id: "bal-grau",
      name: "Árvores de muitos filhos",
      topics: [
        { topic: "b-tree" },
      ],
    },
  ],
};
