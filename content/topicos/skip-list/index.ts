import type { Topic } from "../index";

export const topico: Topic = {
  slug: "skip-list",
  name: "Skip List",
  group: "Estruturas probabilísticas",
  level: "Difícil",
  status: "ready",
  viz: "skip-list",
  youtube: "R9sVLuJ7FSg",
  videoMinutes: "1:58:55",
  article: "https://craftcodeclub.io/posts/dsa-skip-list",
  readingTime: "19 min",
  language: "Python",
  description: "Lista encadeada em níveis: busca probabilística eficiente.",
  tagline: "Lista encadeada em níveis: O(log n) no cara ou coroa.",
  glyph: "≡",
  requires: ["listas-ligadas", "busca-binaria", "big-o"],
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
    "O problema: três estruturas, três buracos",
    "A ideia: uma pista expressa por cima da lista",
    "A busca: começa no topo e desce em escada",
    "A moeda: a altura de cada nó é sorteada uma vez só",
    "Inserção e remoção: o rastro de candidatos",
    "O head: o sentinela que quase ninguém desenha",
    "De onde sai o log n, e por que ele é esperado e não garantido",
    "Skip List na vida real",
    "As armadilhas que pegam todo mundo",
    "Como praticar",
];
