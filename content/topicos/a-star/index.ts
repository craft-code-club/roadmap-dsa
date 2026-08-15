import type { Topic } from "../index";

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
