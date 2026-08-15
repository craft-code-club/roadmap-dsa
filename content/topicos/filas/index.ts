import type { Topic } from "../index";

export const topico: Topic = {
  slug: "filas",
  name: "Filas e Deques",
  group: "Pilhas e Filas",
  level: "Fácil",
  status: "ready",
  viz: "filas",
  youtube: "KJaVKLZsMcg",
  videoMinutes: "2:03:02",
  readingTime: "19 min",
  language: "Python",
  description: "FIFO e a fila de duas pontas para a janela com máximo.",
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
    "Por que a fila existe",
    "O contrato: enfileirar, desenfileirar, espiar",
    "A fila ingênua sobre array, e o pedágio do desenfileirar",
    "O buffer circular: o índice que dá a volta",
    "Cheia ou vazia? O detalhe que trava a implementação",
    "Fila com lista encadeada: o preço do ponteiro",
    "Fila com duas pilhas",
    "Deque: a fila de duas pontas",
    "O deque monotônico e o máximo da janela",
    "Complexidade e o que dizer numa entrevista",
    "Armadilhas que pegam todo mundo",
    "Como praticar",
];
