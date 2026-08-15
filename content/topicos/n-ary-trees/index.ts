import type { Topic } from "../index";

export const topico: Topic = {
  slug: "n-ary-trees",
  name: "Árvores N-árias",
  group: "Árvores",
  level: "Médio",
  status: "ready",
  viz: "n-ary-trees",
  youtube: "FLZxMQFTqvY",
  videoMinutes: "1:26:48",
  readingTime: "10 min",
  language: "Python",
  description: "Nós com qualquer número de filhos.",
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
    "Quando dois filhos não bastam",
    "O nó muda: de dois ponteiros para uma lista",
    "O template sobrevive, o laço muda",
    "Em ordem morre aqui",
    "O grau achata a árvore",
    "Por que o banco de dados usa grau alto",
    "O truque do primeiro filho e do irmão",
    "Onde você já usa isso",
    "Como praticar",
];
