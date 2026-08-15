import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "arvores-binarias",
  name: "Árvores Binárias",
  group: "Árvores",
  level: "Médio",
  status: "ready",
  viz: "arvores-binarias",
  youtube: "OAcm2rXqz9M",
  videoMinutes: "1:50:49",
  readingTime: "10 min",
  language: "Python",
  description: "Recursão estrutural sobre dois filhos.",
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
    "Por que existe uma estrutura hierárquica",
    "O vocabulário, de uma vez",
    "O nó, e a definição que se define a si mesma",
    "Os cinco formatos",
    "A conta que amarra tudo",
    "A árvore que mora num array",
    "A forma decide o custo",
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
    { id: "lc-226", name: "Invert Binary Tree", number: "226", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/invert-binary-tree/" },
    { id: "lc-100", name: "Same Tree", number: "100", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/same-tree/" },
    { id: "lc-110", name: "Balanced Binary Tree", number: "110", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/balanced-binary-tree/" },
    { id: "lc-543", name: "Diameter of Binary Tree", number: "543", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/diameter-of-binary-tree/" },
    { id: "lc-222", name: "Count Complete Tree Nodes", number: "222", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/count-complete-tree-nodes/" },
    { id: "gfg-binary-tree", name: "Binary Tree Data Structure", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/binary-tree-data-structure/" },
  ],

  references: [
    { title: "Types of Binary Tree (cheia, perfeita, completa, degenerada)", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/types-of-binary-tree/" },
    { title: "Binary Tree Representation: ponteiros e array", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/binary-tree-representation/" },
    { title: "Relação entre número de nós e altura", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/relationship-number-nodes-height-binary-tree/" },
    { title: "Binary Tree Data Structure: o guia completo", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/binary-tree-data-structure/" },
  ],
};
