import type { Topic } from "../index";

export const topico: Topic = {
  slug: "sliding-window",
  name: "Sliding Window",
  group: "Arrays e Strings",
  level: "Médio",
  status: "ready",
  viz: "sliding-window",
  youtube: "OvIJw1AMNzI",
  videoMinutes: "2:08:22",
  readingTime: "12 min",
  language: "Python",
  description: "Uma janela contígua que anda pelo array. Fixa, com tamanho travado em k, ou variável, crescendo pela direita e encolhendo pela esquerda enquanto está inválida.",
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
    "O problema que faz a técnica nascer",
    "A intuição: o que entra e o que sai",
    "Construindo a janela fixa",
    "Construindo a janela variável",
    "O padrão generalizado",
    "Como reconhecer que é janela deslizante",
    "Complexidade",
    "As armadilhas",
    "Como praticar",
];
