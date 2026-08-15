import type { Topic } from "../index";

export const topico: Topic = {
  slug: "mst",
  name: "Árvore Geradora Mínima (MST)",
  group: "Grafos",
  level: "Difícil",
  status: "ready",
  viz: "mst",
  youtube: "a9iI9N4FLsg",
  videoMinutes: "2:12:12",
  article: "https://craftcodeclub.io/posts/dsa-mst",
  readingTime: "11 min",
  language: "Python",
  description: "Conectar tudo com o menor custo: Kruskal e Prim.",
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
    "O que é uma árvore geradora",
    "A propriedade do corte, que faz o guloso funcionar",
    "Kruskal: ordene as arestas e vá colando",
    "O union-find, em duas linhas de ideia",
    "Prim: faça a árvore crescer",
    "Kruskal ou Prim",
    "O que a MST não faz",
    "Onde aparece",
    "Como praticar",
];
