import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "a-star",
  name: "A* (A Estrela)",
  group: "Grafos",
  level: "Difícil",
  status: "ready",
  viz: "a-star",
  youtube: "0PYx7erkdXo",
  videoMinutes: "2:34:10",
  article: "https://craftcodeclub.io/posts/dsa-a-star",
  readingTime: "11 min",
  language: "Python",
  description: "Pathfinding guiado por heurística.",
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
    "O problema do Dijkstra num mapa",
    "As duas parcelas",
    "Admissível: a condição que garante o ótimo",
    "Escolhendo o h",
    "O código, e o que muda em relação ao Dijkstra",
    "A honestidade sobre o ganho",
    "Onde aparece",
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
    { id: "lc-1091", name: "Shortest Path in Binary Matrix", number: "1091", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/shortest-path-in-binary-matrix/" },
    { id: "lc-773", name: "Sliding Puzzle", number: "773", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/sliding-puzzle/" },
    { id: "lc-1263", name: "Minimum Moves to Move a Box to Their Target Location", number: "1263", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/minimum-moves-to-move-a-box-to-their-target-location/" },
    { id: "lc-505", name: "The Maze II", number: "505", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/the-maze-ii/" },
    { id: "gfg-a-star", name: "A* Search Algorithm", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/a-search-algorithm/" },
  ],

  references: [
    { title: "A*: heurística e caminho ótimo", source: "Craft & Code Club", url: "https://craftcodeclub.io/posts/dsa-a-star" },
    { title: "Introduction to A*", source: "Red Blob Games", url: "https://www.redblobgames.com/pathfinding/a-star/introduction.html" },
    { title: "Heuristics for grid maps", source: "Red Blob Games", url: "https://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html" },
    { title: "A* Search Algorithm", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/a-search-algorithm/" },
  ],
};
