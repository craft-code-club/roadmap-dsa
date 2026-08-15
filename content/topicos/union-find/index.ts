import type { Topic } from "../index";

export const topico: Topic = {
  slug: "union-find",
  name: "Union-Find (DSU)",
  group: "Grafos e conjuntos",
  level: "Médio",
  status: "ready",
  isNew: true,
  readingTime: "15 min",
  language: "Python",
  description: "Conjuntos disjuntos que se fundem: union by rank, path compression e o inverso de Ackermann.",
  tagline: "Conjuntos que se fundem em tempo quase constante.",
  glyph: "⊕",
  requires: ["grafos-intro", "dfs-bfs", "arrays"],
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
    "O buraco: perguntar e juntar, um milhão de vezes",
    "A floresta que mora dentro de um array",
    "O find ingênuo e a corrente que estraga tudo",
    "As duas otimizações, uma de cada vez",
    "O α(n): o que \"praticamente constante\" quer dizer",
    "A implementação completa",
    "Onde o Union-Find aparece de verdade",
    "A limitação que define a estrutura: ela não desune",
    "As armadilhas que pegam todo mundo",
    "Como praticar",
];
