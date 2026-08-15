import type { Topic } from "../index";

export const topico: Topic = {
  slug: "merge-sort",
  name: "Merge Sort",
  group: "Ordenação",
  level: "Médio",
  status: "ready",
  viz: "merge-sort",
  youtube: "lbktBOwmmhg",
  videoMinutes: "3:14:02",
  readingTime: "13 min",
  language: "Python",
  description: "Divisão e conquista, estável, O(n log n).",
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
    "Ordenar na volta, não na descida",
    "A intercalação é o algoritmo inteiro",
    "De onde sai o n log n",
    "O preço do merge sort é memória",
    "Estável por causa de um sinal",
    "Lista ligada: onde o merge sort não paga o preço",
    "Onde ele é a escolha certa",
];
