import type { Topic } from "../index";

export const topico: Topic = {
  slug: "quick-sort",
  name: "Quick Sort",
  group: "Ordenação",
  level: "Médio",
  status: "ready",
  viz: "quick-sort",
  youtube: "2T0Itw-oaEA",
  videoMinutes: "1:58:04",
  readingTime: "13 min",
  language: "Python",
  description: "Particiona em torno de um pivô. O(n log n) na média.",
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
    "Uma posição resolvida por partição",
    "A partição de Lomuto, e a invariante que ela mantém",
    "O pivô é a única decisão que importa",
    "Repetidos: o buraco que a partição de duas vias tem",
    "In-place, instável, e a pilha que ninguém conta",
    "Da recursão para a pilha explícita",
    "Quickselect: a mesma partição, sem ordenar tudo",
];
