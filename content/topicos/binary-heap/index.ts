import type { Topic } from "../index";

export const topico: Topic = {
  slug: "binary-heap",
  name: "Binary Heap",
  group: "Heaps",
  level: "Médio",
  status: "ready",
  viz: "binary-heap",
  youtube: "HVWw20nOLHk",
  videoMinutes: "2:21:46",
  readingTime: "12 min",
  language: "Python",
  description: "A fila de prioridade por trás do heap sort e do Dijkstra.",
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
    "A pergunta que o heap responde",
    "A regra, e o que ela não promete",
    "A árvore que mora dentro de um array",
    "Subir e descer: as duas únicas operações",
    "Construir um heap de uma vez custa O(n)",
    "Onde o heap já está rodando no seu código",
    "As armadilhas",
];
