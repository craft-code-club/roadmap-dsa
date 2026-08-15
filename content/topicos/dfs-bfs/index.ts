import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "dfs-bfs",
  name: "DFS e BFS em Grafos",
  group: "Grafos",
  level: "Médio",
  status: "ready",
  viz: "dfs-bfs",
  youtube: "sCT-_EjbVqQ",
  videoMinutes: "2:06:45",
  readingTime: "11 min",
  language: "Python",
  description: "Os dois jeitos de percorrer um grafo.",
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
    "A única linha nova",
    "Pilha ou fila, e o que muda",
    "Por que o BFS acha o caminho mais curto",
    "Onde cada um brilha",
    "Detectar ciclo: onde os dois divergem",
    "Um percurso não cobre o grafo",
    "Complexidade e memória",
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
    { id: "lc-200", name: "Number of Islands", number: "200", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-islands/" },
    { id: "lc-547", name: "Number of Provinces", number: "547", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-provinces/" },
    { id: "lc-994", name: "Rotting Oranges", number: "994", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/rotting-oranges/" },
    { id: "lc-207", name: "Course Schedule", number: "207", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/course-schedule/" },
    { id: "lc-127", name: "Word Ladder", number: "127", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/word-ladder/" },
    { id: "gfg-bfs-dfs", name: "Difference between BFS and DFS", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/difference-between-bfs-and-dfs/" },
  ],

  references: [
    { title: "Breadth First Search or BFS for a Graph", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/breadth-first-search-or-bfs-for-a-graph/" },
    { title: "Depth First Search or DFS for a Graph", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/depth-first-search-or-dfs-for-a-graph/" },
    { title: "Detect Cycle in a Directed Graph", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/detect-cycle-in-a-graph/" },
    { title: "Shortest path in an unweighted graph", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/shortest-path-unweighted-graph/" },
  ],
};
