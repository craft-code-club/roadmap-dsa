import type { Topic } from "../index";

export const topico: Topic = {
  slug: "dfs-bfs",
  name: "DFS e BFS em Grafos",
  group: "Grafos",
  level: "Médio",
  status: "ready",
  viz: "dfs-bfs",
  youtube: "sCT-_EjbVqQ",
  videoMinutes: "2:06:45",
  readingTime: "11 min",
  language: "Python",
  description: "Os dois jeitos de percorrer um grafo.",
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
    "A única linha nova",
    "Pilha ou fila, e o que muda",
    "Por que o BFS acha o caminho mais curto",
    "Onde cada um brilha",
    "Detectar ciclo: onde os dois divergem",
    "Um percurso não cobre o grafo",
    "Complexidade e memória",
    "Como praticar",
];
