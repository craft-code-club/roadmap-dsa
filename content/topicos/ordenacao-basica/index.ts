import type { Topic } from "../index";

export const topico: Topic = {
  slug: "ordenacao-basica",
  name: "Ordenação Básica",
  group: "Ordenação",
  level: "Fácil",
  status: "ready",
  viz: "ordenacao-basica",
  youtube: "GxhxsbbzaTI",
  videoMinutes: "1:52:10",
  readingTime: "12 min",
  language: "Python",
  description: "Bubble, Selection e Insertion Sort, os O(n²) que ensinam a base.",
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
    "Três jeitos de arrumar as mesmas oito cartas",
    "Bubble sort: só troca com o vizinho",
    "Selection sort: escolhe primeiro, escreve depois",
    "Insertion sort: a mão de cartas",
    "Inversões: a conta que os três pagam de forma diferente",
    "Estável quer dizer que o empate não se mexe",
    "O(n²) é o teto, não a sentença",
];
