import type { Topic } from "../index";

export const topico: Topic = {
  slug: "big-o",
  name: "Notação Big O",
  group: "Introdução",
  level: "Fácil",
  status: "ready",
  viz: "big-o",
  youtube: "MtLv9Rwb55Q",
  videoMinutes: "1:38:08",
  readingTime: "10 min",
  language: "Python",
  description: "Como medir tempo e espaço de um algoritmo sem cronômetro.",
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
    "O que o Big O mede",
    "As três regras",
    "As famílias, do O(1) ao O(n!)",
    "Contando operações no mesmo array",
    "Melhor caso, caso médio e pior caso",
    "As armadilhas que pegam todo mundo",
];
