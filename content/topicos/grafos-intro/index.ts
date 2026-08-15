import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "grafos-intro",
  name: "Introdução a Grafos",
  group: "Grafos",
  level: "Médio",
  status: "ready",
  viz: "grafos-intro",
  youtube: "cILrU-dtuEc",
  videoMinutes: "1:46:55",
  readingTime: "11 min",
  language: "Python",
  description: "Vértices, arestas e representação (matriz / lista de adjacência).",
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
    "O que é, em duas palavras",
    "Guardar o grafo: as duas formas",
    "Qual escolher, e por quê",
    "O grafo que você não desenhou",
    "Onde ficam os ciclos, e por que isso importa",
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
    { id: "lc-1971", name: "Find if Path Exists in Graph", number: "1971", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/find-if-path-exists-in-graph/" },
    { id: "lc-733", name: "Flood Fill", number: "733", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/flood-fill/" },
    { id: "lc-200", name: "Number of Islands", number: "200", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-islands/" },
    { id: "lc-133", name: "Clone Graph", number: "133", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/clone-graph/" },
    { id: "lc-547", name: "Number of Provinces", number: "547", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-provinces/" },
    { id: "gfg-graph", name: "Graph Data Structure and Algorithms", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/graph-data-structure-and-algorithms/" },
  ],

  references: [
    { title: "Graph Data Structure and Algorithms", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/graph-data-structure-and-algorithms/" },
    { title: "Comparação entre matriz e lista de adjacência", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/comparison-between-adjacency-list-and-adjacency-matrix-representation-of-graph/" },
    { title: "Graph and its representations", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/graph-and-its-representations/" },
    { title: "collections.defaultdict: a lista de adjacência em uma linha", source: "Documentação do Python", url: "https://docs.python.org/3/library/collections.html#collections.defaultdict" },
  ],
};
