import type { Topic } from "../index";

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
