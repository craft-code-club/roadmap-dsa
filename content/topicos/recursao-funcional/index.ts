import type { Topic } from "../index";

export const topico: Topic = {
  slug: "recursao-funcional",
  name: "Recursão: Programação Funcional",
  group: "Recursão",
  level: "Médio",
  status: "ready",
  viz: "recursao-funcional",
  youtube: "rbEYjJdaIZI",
  videoMinutes: "2:21:37",
  readingTime: "16 min",
  language: "Python",
  description: "Recursão de cauda e o estilo funcional.",
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
    "Por que linguagem funcional vive de recursão",
    "A pilha que cresce e a conta que espera",
    "Posição de cauda: a regra de uma linha só",
    "O acumulador: fazer a conta na ida",
    "Tail call optimization: quem otimiza e quem não",
    "Trampolim: quando a linguagem não ajuda",
    "De cauda nem sempre é mais rápido",
    "Armadilhas e como praticar",
];
