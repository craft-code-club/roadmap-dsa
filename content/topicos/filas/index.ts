import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "filas",
  name: "Filas e Deques",
  group: "Pilhas e Filas",
  level: "Fácil",
  status: "ready",
  viz: "filas",
  youtube: "KJaVKLZsMcg",
  videoMinutes: "2:03:02",
  readingTime: "19 min",
  language: "Python",
  description: "FIFO e a fila de duas pontas para a janela com máximo.",
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
    "Por que a fila existe",
    "O contrato: enfileirar, desenfileirar, espiar",
    "A fila ingênua sobre array, e o pedágio do desenfileirar",
    "O buffer circular: o índice que dá a volta",
    "Cheia ou vazia? O detalhe que trava a implementação",
    "Fila com lista encadeada: o preço do ponteiro",
    "Fila com duas pilhas",
    "Deque: a fila de duas pontas",
    "O deque monotônico e o máximo da janela",
    "Complexidade e o que dizer numa entrevista",
    "Armadilhas que pegam todo mundo",
    "Como praticar",
];

// Os problemas para praticar e as referências.
//
// Export à parte, e não campos do `topico`, por peso: as duas listas são 3/4
// do dado de um tópico (64 KB dos 85 KB somando os 80), e só a PÁGINA do
// tópico as desenha. O `content/topicos/index.ts` importa `topico` e `sumario`
// pelo nome e nunca este; quem o lê é `content/topicos/pratica.ts`, que só o
// servidor importa. Assim a barra lateral, que é cliente, não carrega
// problema nenhum.
export const pratica: Pratica = {
  problems: [
    { id: "lc-232", name: "Implement Queue using Stacks", number: "232", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/implement-queue-using-stacks/" },
    { id: "lc-1700", name: "Number of Students Unable to Eat Lunch", number: "1700", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/number-of-students-unable-to-eat-lunch/" },
    { id: "lc-622", name: "Design Circular Queue", number: "622", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/design-circular-queue/" },
    { id: "lc-641", name: "Design Circular Deque", number: "641", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/design-circular-deque/" },
    { id: "lc-239", name: "Sliding Window Maximum", number: "239", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/sliding-window-maximum/" },
    { id: "lc-862", name: "Shortest Subarray with Sum at Least K", number: "862", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/shortest-subarray-with-sum-at-least-k/" },
    { id: "gfg-filas", name: "Queue Data Structure", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/queue-data-structure/" },
  ],

  references: [
    { title: "Circular Queue: introdução e implementação com array", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/circular-queue-set-1-introduction-array-implementation/" },
    { title: "collections.deque: as duas pontas em O(1), e por que list.pop(0) é O(n)", source: "Python Docs", url: "https://docs.python.org/3/library/collections.html" },
    { title: "ArrayDeque: a fila de duas pontas sobre array do Java", source: "Java Docs", url: "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayDeque.html" },
    { title: "Sliding Window Maximum com deque monotônico", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/sliding-window-maximum-maximum-of-all-subarrays-of-size-k/" },
  ],
};
