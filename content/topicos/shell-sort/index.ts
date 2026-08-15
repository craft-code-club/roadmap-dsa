import type { Topic } from "../index";

export const topico: Topic = {
  slug: "shell-sort",
  name: "Shell Sort",
  group: "Ordenação",
  level: "Médio",
  status: "ready",
  viz: "shell-sort",
  youtube: "symbT7Cgrr8",
  videoMinutes: "1:58:45",
  readingTime: "12 min",
  language: "Python",
  description: "Insertion Sort turbinado com gap sequences.",
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
    "O insertion sort com a constante 1 virando variável",
    "Uma rodada de gap h são h insertion sorts entrelaçados",
    "Por que as rodadas anteriores não são desperdício",
    "A sequência de gaps, e o que ela muda",
    "Onde ele ganha e onde ele perde",
    "In-place e instável",
    "Onde o shell sort ainda vive",
];
