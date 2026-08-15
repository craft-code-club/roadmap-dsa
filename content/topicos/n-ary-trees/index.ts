import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "n-ary-trees",
  name: "Árvores N-árias",
  group: "Árvores",
  level: "Médio",
  status: "ready",
  viz: "n-ary-trees",
  youtube: "FLZxMQFTqvY",
  videoMinutes: "1:26:48",
  readingTime: "10 min",
  language: "Python",
  description: "Nós com qualquer número de filhos.",
};

// O `sumario` é a lista dos `## h2` DO ARTIGO ao lado, no texto exato, e
// alimenta o índice "Nesta página". Ele é uma cópia: quando as duas listas
// divergem, a âncora do índice deixa de casar com a do título. O teste
// `o sumário de cada artigo é a lista dos h2 dele` compara as duas.
//
// Ele mora aqui, e o `import` do `.mdx` mora em `../artigos.ts`, por uma razão
// medida: este módulo é dado, e a barra lateral (que é cliente) o importa
// inteiro. Com o corpo do artigo aqui dentro, TODA página do site baixava os 39
// artigos compilados — 2,1 MB de JavaScript em `/apoie/` para escrever uma
// lista de apoiadores. O sumário é texto curto e é do tópico; o corpo é o peso,
// e ele só é carregado por quem renderiza um artigo.
export const sumario = [
    "Quando dois filhos não bastam",
    "O nó muda: de dois ponteiros para uma lista",
    "O template sobrevive, o laço muda",
    "Em ordem morre aqui",
    "O grau achata a árvore",
    "Por que o banco de dados usa grau alto",
    "O truque do primeiro filho e do irmão",
    "Onde você já usa isso",
    "Como praticar",
];

// Os problemas para praticar e as referências.
//
// Export à parte, e não campos do `topico`, por peso: as duas listas são 3/4
// do dado de um tópico (64 KB dos 85 KB somando os 80), e só a PÁGINA do
// tópico as desenha. O `content/topicos/index.ts` importa `topico` e `sumario`
// pelo nome e nunca este; quem o lê é `content/topicos/pratica.ts`, que só o
// servidor importa. Assim a barra lateral, que é cliente, não carrega
// problema nenhum.
export const pratica: Pratica = {
  problems: [
    { id: "lc-589", name: "N-ary Tree Preorder Traversal", number: "589", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/n-ary-tree-preorder-traversal/" },
    { id: "lc-590", name: "N-ary Tree Postorder Traversal", number: "590", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/n-ary-tree-postorder-traversal/" },
    { id: "lc-559", name: "Maximum Depth of N-ary Tree", number: "559", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/maximum-depth-of-n-ary-tree/" },
    { id: "lc-429", name: "N-ary Tree Level Order Traversal", number: "429", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/n-ary-tree-level-order-traversal/" },
    { id: "lc-431", name: "Encode N-ary Tree to Binary Tree", number: "431", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/encode-n-ary-tree-to-binary-tree/" },
    { id: "gfg-generic-trees", name: "Generic Trees (N-ary Trees)", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/generic-treesn-array-trees/" },
  ],

  references: [
    { title: "Generic Trees (N-ary Trees)", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/generic-treesn-array-trees/" },
    { title: "Introduction of B-Tree: o grau alto e a página de disco", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/introduction-of-b-tree-2/" },
    { title: "Anatomia de um índice: a árvore por trás do banco", source: "Use The Index, Luke!", url: "https://use-the-index-luke.com/sql/anatomy/the-tree" },
    { title: "Introdução ao DOM: a árvore n-ária que você usa todo dia", source: "MDN", url: "https://developer.mozilla.org/pt-BR/docs/Web/API/Document_Object_Model/Introduction" },
  ],
};
