import type { Topic } from "../index";

export const topico: Topic = {
  slug: "prefix-sum",
  name: "Prefix Sum",
  group: "Arrays e Strings",
  level: "Médio",
  status: "ready",
  viz: "prefix-sum",
  youtube: "yMnLofkS7DM",
  videoMinutes: "1:42:35",
  readingTime: "18 min",
  language: "Python",
  description: "Somas de intervalo em tempo constante depois de um pré-processamento.",
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
    "O problema: recalcular a mesma soma toda vez",
    "A ideia: uma tabela com todas as somas que começam no zero",
    "A sentinela e a fórmula que dispensa o if",
    "O template em Python",
    "Quando compensa pré-processar",
    "Prefix Sum ou Sliding Window?",
    "Não é só soma: saldo, estoque e a variação de um período",
    "Duas extensões: matriz 2D e difference array",
    "As armadilhas que pegam todo mundo",
    "Como praticar",
];
