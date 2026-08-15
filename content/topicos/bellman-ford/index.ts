import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "bellman-ford",
  name: "Bellman-Ford",
  group: "Grafos",
  level: "Difícil",
  status: "ready",
  viz: "bellman-ford",
  youtube: "0GcXgQTpYcE",
  videoMinutes: "2:22:53",
  article: "https://craftcodeclub.io/posts/dsa-bellman-ford",
  readingTime: "11 min",
  language: "Python",
  description: "Caminho mais curto que aceita pesos negativos.",
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
    "Quando o peso pode ser negativo",
    "A ideia: insistir em vez de escolher",
    "De onde sai o V-1",
    "A rodada que sobra",
    "Dijkstra ou Bellman-Ford",
    "Duas otimizações honestas",
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
    { id: "lc-787", name: "Cheapest Flights Within K Stops", number: "787", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/cheapest-flights-within-k-stops/" },
    { id: "lc-743", name: "Network Delay Time", number: "743", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/network-delay-time/" },
    { id: "lc-1928", name: "Minimum Cost to Reach Destination in Time", number: "1928", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/minimum-cost-to-reach-destination-in-time/" },
    { id: "lc-2093", name: "Minimum Cost to Reach City With Discounts", number: "2093", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/minimum-cost-to-reach-city-with-discounts/" },
    { id: "gfg-bellman-ford", name: "Bellman-Ford Algorithm", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/bellman-ford-algorithm-dp-23/" },
  ],

  references: [
    { title: "Bellman-Ford: relaxamento e ciclo negativo", source: "Craft & Code Club", url: "https://craftcodeclub.io/posts/dsa-bellman-ford" },
    { title: "Bellman-Ford Algorithm", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/bellman-ford-algorithm-dp-23/" },
    { title: "Detect a negative cycle in a Graph", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/detect-negative-cycle-graph-bellman-ford/" },
    { title: "Johnson's algorithm: Bellman-Ford + Dijkstra", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/johnsons-algorithm/" },
  ],
};
