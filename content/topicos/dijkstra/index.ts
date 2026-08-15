import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "dijkstra",
  name: "Dijkstra",
  group: "Grafos",
  level: "Difícil",
  status: "ready",
  viz: "dijkstra",
  youtube: "b4kWEWtCVzA",
  videoMinutes: "2:09:19",
  article: "https://craftcodeclub.io/posts/dsa-dijkstra",
  readingTime: "12 min",
  language: "Python",
  description: "Caminho mais curto com pesos não-negativos.",
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
    "O que muda quando a aresta tem peso",
    "Relaxar: o verbo do algoritmo",
    "Por que fechar o menor é seguro",
    "O dia em que a hipótese cai",
    "O detalhe do continue",
    "Complexidade",
    "Reconstruir o caminho, e não só o custo",
    "Onde isso aparece de verdade",
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
    { id: "lc-743", name: "Network Delay Time", number: "743", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/network-delay-time/" },
    { id: "lc-1631", name: "Path With Minimum Effort", number: "1631", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/path-with-minimum-effort/" },
    { id: "lc-1514", name: "Path with Maximum Probability", number: "1514", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/path-with-maximum-probability/" },
    { id: "lc-778", name: "Swim in Rising Water", number: "778", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/swim-in-rising-water/" },
    { id: "lc-787", name: "Cheapest Flights Within K Stops", number: "787", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/cheapest-flights-within-k-stops/" },
    { id: "gfg-dijkstra", name: "Dijkstra's Shortest Path Algorithm", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/dijkstras-shortest-path-algorithm-greedy-algo-7/" },
  ],

  references: [
    { title: "Dijkstra: caminho mínimo passo a passo", source: "Craft & Code Club", url: "https://craftcodeclub.io/posts/dsa-dijkstra" },
    { title: "Dijkstra's Shortest Path Algorithm", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/dijkstras-shortest-path-algorithm-greedy-algo-7/" },
    { title: "heapq: a fila de prioridade do Python", source: "Documentação do Python", url: "https://docs.python.org/3/library/heapq.html" },
    { title: "Why Dijkstra fails with negative weights", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/why-does-dijkstras-algorithm-fail-on-negative-weights/" },
  ],
};
