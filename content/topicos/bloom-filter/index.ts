import type { Topic } from "../index";

export const topico: Topic = {
  slug: "bloom-filter",
  name: "Bloom Filter",
  group: "Estruturas Probabilísticas",
  level: "Médio",
  status: "ready",
  isNew: true,
  readingTime: "14 min",
  language: "Python",
  description: "Um talvez sim, com certeza não, em alguns bits por elemento.",
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
    "O buraco: guardar o elemento para responder sim ou não",
    "A assimetria: o \"não\" é certeza, o \"sim\" é aposta",
    "A mecânica: m bits, k hashes, nenhum elemento guardado",
    "A implementação: um bitmap e dois hashes que viram k",
    "A matemática sem susto: três fórmulas e uma tabela",
    "O que o bloom filter não faz",
    "O porteiro: bloom filter na frente do que é caro",
    "A família: aleatorizar a estrutura ou aleatorizar a resposta",
    "As armadilhas que pegam todo mundo",
    "Como praticar",
];
