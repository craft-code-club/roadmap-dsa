import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "union-find",
  name: "Union-Find (DSU)",
  group: "Grafos e conjuntos",
  level: "Médio",
  status: "ready",
  isNew: true,
  readingTime: "15 min",
  language: "Python",
  description: "Conjuntos disjuntos que se fundem: union by rank, path compression e o inverso de Ackermann.",
  tagline: "Conjuntos que se fundem em tempo quase constante.",
  glyph: "⊕",
  requires: ["grafos-intro", "dfs-bfs", "arrays"],
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
    "O buraco: perguntar e juntar, um milhão de vezes",
    "A floresta que mora dentro de um array",
    "O find ingênuo e a corrente que estraga tudo",
    "As duas otimizações, uma de cada vez",
    "O α(n): o que \"praticamente constante\" quer dizer",
    "A implementação completa",
    "Onde o Union-Find aparece de verdade",
    "A limitação que define a estrutura: ela não desune",
    "As armadilhas que pegam todo mundo",
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
    { id: "lc-547", name: "Number of Provinces", number: "547", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-provinces/" },
    { id: "lc-684", name: "Redundant Connection", number: "684", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/redundant-connection/" },
    { id: "lc-721", name: "Accounts Merge", number: "721", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/accounts-merge/" },
    { id: "lc-990", name: "Satisfiability of Equality Equations", number: "990", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/satisfiability-of-equality-equations/" },
    { id: "lc-1584", name: "Min Cost to Connect All Points", number: "1584", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/min-cost-to-connect-all-points/" },
    { id: "lc-128", name: "Longest Consecutive Sequence", number: "128", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-consecutive-sequence/" },
    { id: "lc-803", name: "Bricks Falling When Hit", number: "803", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/bricks-falling-when-hit/" },
    { id: "gfg-dsu", name: "Introduction to Disjoint Set (Union-Find)", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/introduction-to-disjoint-set-data-structure-or-union-find-algorithm/" },
  ],

  references: [
    { title: "Disjoint Set Union: as duas otimizações, com as provas", source: "CP-Algorithms", url: "https://cp-algorithms.com/data_structures/disjoint_set_union.html" },
    { title: "Efficiency of a Good But Not Linear Set Union Algorithm (de onde vem o α(n))", source: "Robert Tarjan, JACM 1975", url: "https://dl.acm.org/doi/10.1145/321879.321884" },
    { title: "Disjoint-set data structure", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Disjoint-set_data_structure" },
    { title: "Kruskal: o algoritmo de MST que é ordenação mais Union-Find", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/kruskals-minimum-spanning-tree-algorithm-greedy-algo-2/" },
  ],
};
