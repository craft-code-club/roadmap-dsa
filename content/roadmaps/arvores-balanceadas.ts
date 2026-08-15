import type { Roadmap } from "./index";

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
        { slug: "avl", name: "Árvore AVL", group: "Árvores Balanceadas", level: "Difícil", status: "soon", description: "O fator de balanceamento e as quatro rotações que o restauram." },
        { slug: "rubro-negra", name: "Árvore Rubro-Negra", group: "Árvores Balanceadas", level: "Difícil", status: "soon", description: "Cinco invariantes de cor, e por que ela venceu a AVL nas bibliotecas padrão." },
        { slug: "splay-tree", name: "Splay Tree", group: "Árvores Balanceadas", level: "Difícil", status: "soon", description: "Sem invariante nenhuma: quem você acessa sobe para a raiz." },
      ],
    },
    {
      id: "bal-aleatoria",
      name: "Balanceamento sem invariante",
      topics: [
        { slug: "treap", name: "Treap", group: "Árvores Balanceadas", level: "Difícil", status: "soon", description: "Uma BST na chave e um heap numa prioridade sorteada, ao mesmo tempo." },
      ],
    },
    {
      id: "bal-grau",
      name: "Árvores de muitos filhos",
      topics: [
        { slug: "b-tree", name: "B-Tree e B+Tree", group: "Árvores Balanceadas", level: "Difícil", status: "soon", description: "A árvore desenhada para o disco: nó do tamanho da página, altura três." },
      ],
    },
  ],
};
