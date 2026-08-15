import type { Topic } from "../index";

export const topico: Topic = {
  slug: "arrays",
  name: "Arrays e Listas",
  group: "Arrays e Strings",
  level: "Fácil",
  status: "ready",
  viz: "arrays",
  youtube: "c95xvXCU34A",
  videoMinutes: "2:15:08",
  readingTime: "16 min",
  language: "Python",
  description: "A estrutura sequencial base: acesso por índice em O(1).",
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
    "Espaço contíguo na memória",
    "Por que o processador gosta de memória contígua",
    "O preço de mexer no meio",
    "A tabela de custos, operação por operação",
    "Array dinâmico: a lista que cresce sozinha",
    "Capacidade não é tamanho",
    "Matriz ou array de arrays",
    "As armadilhas que pegam todo mundo",
    "Como praticar",
];
