import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "prefix-sum",
  name: "Prefix Sum",
  group: "Arrays e Strings",
  level: "Médio",
  status: "ready",
  viz: "prefix-sum",
  youtube: "yMnLofkS7DM",
  videoMinutes: "1:42:35",
  readingTime: "18 min",
  language: "Python",
  description: "Somas de intervalo em tempo constante depois de um pré-processamento.",
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
    "O problema: recalcular a mesma soma toda vez",
    "A ideia: uma tabela com todas as somas que começam no zero",
    "A sentinela e a fórmula que dispensa o if",
    "O template em Python",
    "Quando compensa pré-processar",
    "Prefix Sum ou Sliding Window?",
    "Não é só soma: saldo, estoque e a variação de um período",
    "Duas extensões: matriz 2D e difference array",
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
    { id: "lc-303", name: "Range Sum Query - Immutable", number: "303", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/range-sum-query-immutable/" },
    { id: "lc-724", name: "Find Pivot Index", number: "724", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/find-pivot-index/" },
    { id: "lc-643", name: "Maximum Average Subarray I", number: "643", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/maximum-average-subarray-i/" },
    { id: "lc-2270", name: "Number of Ways to Split Array", number: "2270", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-ways-to-split-array/" },
    { id: "lc-560", name: "Subarray Sum Equals K", number: "560", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/subarray-sum-equals-k/" },
    { id: "gfg-prefix-sum", name: "Range Sum Queries Without Updates", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/range-sum-queries-without-updates/" },
  ],

  references: [
    { title: "Prefix Sum Array: implementação e aplicações", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/prefix-sum-array-implementation-applications-competitive-programming/" },
    { title: "Prefix Sum of Matrix (Or 2D Array): o prefixo em duas dimensões", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/prefix-sum-2d-array/" },
    { title: "1D Difference Array: atualizar um intervalo em O(1)", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/difference-array-range-update-query-o1/" },
    { title: "Introduction to Prefix Sums", source: "USACO Guide", url: "https://usaco.guide/silver/prefix-sums" },
  ],
};
