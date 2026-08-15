import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "big-o",
  name: "Notação Big O",
  group: "Introdução",
  level: "Fácil",
  status: "ready",
  viz: "big-o",
  youtube: "MtLv9Rwb55Q",
  videoMinutes: "1:38:08",
  readingTime: "10 min",
  language: "Python",
  description: "Como medir tempo e espaço de um algoritmo sem cronômetro.",
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
    "O que o Big O mede",
    "As três regras",
    "As famílias, do O(1) ao O(n!)",
    "Contando operações no mesmo array",
    "Melhor caso, caso médio e pior caso",
    "As armadilhas que pegam todo mundo",
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
    { id: "lc-704", name: "Binary Search", number: "704", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/binary-search/" },
    { id: "lc-217", name: "Contains Duplicate", number: "217", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/contains-duplicate/" },
    { id: "lc-121", name: "Best Time to Buy and Sell Stock", number: "121", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/" },
    { id: "lc-1", name: "Two Sum", number: "1", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/two-sum/" },
    { id: "lc-509", name: "Fibonacci Number", number: "509", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/fibonacci-number/" },
    { id: "gfg-complexidade", name: "Practice Questions on Time Complexity Analysis", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/practice-questions-time-complexity-analysis/" },
  ],

  references: [
    { title: "Big O Notation", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/analysis-algorithms-big-o-analysis/" },
    { title: "Analysis of Algorithms: Asymptotic Analysis", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/analysis-of-algorithms-set-1-asymptotic-analysis/" },
    { title: "Big-O Cheat Sheet: complexidade das estruturas de dados", source: "bigocheatsheet.com", url: "https://www.bigocheatsheet.com/" },
    { title: "Time and Space Complexity: cartão do LeetCode Explore", source: "LeetCode", url: "https://leetcode.com/explore/learn/card/recursion-i/256/complexity-analysis/" },
  ],
};
