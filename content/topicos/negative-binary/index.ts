import type { Topic } from "../index";

export const topico: Topic = {
  slug: "negative-binary",
  name: "Binários Negativos",
  group: "Manipulação de Bits",
  level: "Médio",
  status: "ready",
  viz: "negative-binary",
  isNew: true,
  youtube: "93CpmUXLbzc",
  videoMinutes: "26:13",
  readingTime: "11 min",
  language: "Python",
  description: "Sign-magnitude, complemento de um e de dois.",
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
    "O bit que deixa de valer magnitude",
    "Tentativa 1: sinal e magnitude",
    "Tentativa 2: complemento de um",
    "Complemento de dois: inverter e somar 1",
    "O truque de leitura: o peso da esquerda é negativo",
    "A faixa assimétrica, e o padrão que não sabe o próprio sinal",
    "Estouro: o erro que não avisa",
];
