import type { Pratica, Topic } from "@/content/tipos";

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
    { id: "lc-509", name: "Fibonacci Number", number: "509", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/fibonacci-number/" },
    { id: "lc-70", name: "Climbing Stairs", number: "70", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/climbing-stairs/" },
    { id: "lc-206", name: "Reverse Linked List", number: "206", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/reverse-linked-list/" },
    { id: "lc-104", name: "Maximum Depth of Binary Tree", number: "104", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/maximum-depth-of-binary-tree/" },
    { id: "lc-50", name: "Pow(x, n)", number: "50", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/powx-n/" },
    { id: "gfg-recursao", name: "Recursion Practice Problems with Solutions", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/recursion-practice-problems-solutions/" },
  ],

  references: [
    { title: "Introduction to Recursion", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/introduction-to-recursion-2/" },
    { title: "Types of Recursions", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/types-of-recursions/" },
    { title: "Program for nth Fibonacci Number: ingênuo, memoização e bottom-up", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/program-for-nth-fibonacci-number/" },
    { title: "sys.setrecursionlimit: o limite de mil níveis documentado na fonte", source: "Python Docs", url: "https://docs.python.org/3/library/sys.html#sys.setrecursionlimit" },
  ],
};
