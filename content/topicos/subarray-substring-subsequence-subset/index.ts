import type { Topic } from "../index";

export const topico: Topic = {
  slug: "subarray-substring-subsequence-subset",
  name: "Os 4 \"sub\"",
  group: "Arrays e Strings",
  level: "Fácil",
  status: "ready",
  viz: "sub-types",
  readingTime: "9 min",
  language: "Python",
  description: "Subarray, substring, subsequence e subset: quatro palavras parecidas que levam a algoritmos diferentes. Duas perguntas separam todas: os elementos precisam ser contíguos? A ordem importa?",
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
    "As duas perguntas",
    "Subarray e substring: a fatia",
    "Subsequence: apaga, mas não reordena",
    "Subset: o saco de elementos",
    "A pegadinha: subsequence x subset",
    "O mesmo grid resolve substring e subsequence",
    "Lendo o enunciado em 5 segundos",
];
