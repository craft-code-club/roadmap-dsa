import type { Topic } from "../index";

export const topico: Topic = {
  slug: "recursao",
  name: "Recursão: Fundamentos",
  group: "Recursão",
  level: "Médio",
  status: "ready",
  viz: "recursao",
  youtube: "KkSAaQHCkSE",
  videoMinutes: "1:59:28",
  readingTime: "17 min",
  language: "Python",
  description: "Funções que chamam a si mesmas, sem medo do stack.",
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
    "O que é recursão, e por que ela aparece em tudo depois daqui",
    "Caso base e caso recursivo: as três regras",
    "A pilha de chamadas: onde a recursão acontece de verdade",
    "Stack overflow: por que a pilha tem teto",
    "A árvore do Fibonacci e o retrabalho exponencial",
    "Memoização: de 21.891 chamadas para 39",
    "Como ler a complexidade de uma função recursiva",
    "Os tipos de recursão",
    "Recursão ou iteração: como escolher",
    "As armadilhas que pegam todo mundo",
    "Como praticar",
];
