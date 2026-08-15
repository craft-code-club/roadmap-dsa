import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "recursao-funcional",
  name: "Recursão: Programação Funcional",
  group: "Recursão",
  level: "Médio",
  status: "ready",
  viz: "recursao-funcional",
  youtube: "rbEYjJdaIZI",
  videoMinutes: "2:21:37",
  readingTime: "16 min",
  language: "Python",
  description: "Recursão de cauda e o estilo funcional.",
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
    "Por que linguagem funcional vive de recursão",
    "A pilha que cresce e a conta que espera",
    "Posição de cauda: a regra de uma linha só",
    "O acumulador: fazer a conta na ida",
    "Tail call optimization: quem otimiza e quem não",
    "Trampolim: quando a linguagem não ajuda",
    "De cauda nem sempre é mais rápido",
    "Armadilhas e como praticar",
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
    { id: "lc-700", name: "Search in a Binary Search Tree", number: "700", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/search-in-a-binary-search-tree/" },
    { id: "lc-206", name: "Reverse Linked List", number: "206", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/reverse-linked-list/" },
    { id: "lc-509", name: "Fibonacci Number", number: "509", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/fibonacci-number/" },
    { id: "lc-50", name: "Pow(x, n)", number: "50", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/powx-n/" },
    { id: "lc-779", name: "K-th Symbol in Grammar", number: "779", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/k-th-symbol-in-grammar/" },
    { id: "gfg-recursao-cauda", name: "Tail Recursion", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/tail-recursion/" },
  ],

  references: [
    { title: "Tail Call Elimination", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/tail-call-elimination/" },
    { title: "Tail Recursion Elimination: por que o Python não faz", source: "Guido van Rossum", url: "https://neopythonic.blogspot.com/2009/04/tail-recursion-elimination.html" },
    { title: "The Seven Myths of Erlang Performance: recursão de cauda nem sempre é mais rápida", source: "Erlang/OTP", url: "https://www.erlang.org/docs/26/efficiency_guide/myths" },
    { title: "Tail recursive functions: o modificador tailrec", source: "Kotlin", url: "https://kotlinlang.org/docs/functions.html#tail-recursive-functions" },
  ],
};
