import type { Topic } from "../index";

export const topico: Topic = {
  slug: "heap-sort",
  name: "Heap Sort",
  group: "Heaps",
  level: "Médio",
  status: "ready",
  viz: "heap-sort",
  youtube: "wUfOyKMjamM",
  videoMinutes: "2:10:31",
  readingTime: "11 min",
  language: "Python",
  description: "Ordenar com um heap em O(n log n).",
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
    "Ordenar é remover o topo n vezes",
    "Fase 1: virar o array num max-heap",
    "Fase 2: a fronteira que anda para trás",
    "Por que max-heap para ordenar crescente",
    "A conta: n log n no melhor e no pior caso",
    "In-place e instável",
    "Heap sort, merge sort ou quick sort",
];
