import type { Topic } from "../index";

export const topico: Topic = {
  slug: "backtracking",
  name: "Backtracking",
  group: "Backtracking",
  level: "Difícil",
  status: "ready",
  viz: "backtracking",
  isNew: true,
  youtube: "Vcm6mhLKU5A",
  videoMinutes: "2:08:38",
  article: "https://craftcodeclub.io/posts/dsa-backtracking",
  readingTime: "13 min",
  language: "Python",
  description: "Tentar, falhar e voltar atrás, busca exaustiva com poda.",
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
    "Tentar, falhar, e desfazer",
    "A árvore de decisão não existe",
    "O template, e as três peças que mudam",
    "A cópia que salva as respostas",
    "Sudoku é o mesmo algoritmo",
    "Poda: a mesma resposta por uma fração do trabalho",
    "O custo, e para onde isso vai",
];
