import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "subarray-substring-subsequence-subset",
  name: "Os 4 \"sub\"",
  group: "Arrays e Strings",
  level: "Fácil",
  status: "ready",
  viz: "sub-types",
  readingTime: "9 min",
  language: "Python",
  description: "Subarray, substring, subsequence e subset: quatro palavras parecidas que levam a algoritmos diferentes. Duas perguntas separam todas: os elementos precisam ser contíguos? A ordem importa?",
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
    "As duas perguntas",
    "Subarray e substring: a fatia",
    "Subsequence: apaga, mas não reordena",
    "Subset: o saco de elementos",
    "A pegadinha: subsequence x subset",
    "O mesmo grid resolve substring e subsequence",
    "Lendo o enunciado em 5 segundos",
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
    { id: "lc-53", name: "Maximum Subarray", number: "53", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/maximum-subarray/" },
    { id: "lc-560", name: "Subarray Sum Equals K", number: "560", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/subarray-sum-equals-k/" },
    { id: "lc-3", name: "Longest Substring Without Repeating Characters", number: "3", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/" },
    { id: "lc-5", name: "Longest Palindromic Substring", number: "5", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-palindromic-substring/" },
    { id: "lc-300", name: "Longest Increasing Subsequence", number: "300", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-increasing-subsequence/" },
    { id: "lc-1143", name: "Longest Common Subsequence", number: "1143", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-common-subsequence/" },
    { id: "lc-78", name: "Subsets (Power Set)", number: "78", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/subsets/" },
    { id: "lc-416", name: "Partition Equal Subset Sum", number: "416", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/partition-equal-subset-sum/" },
    { id: "gfg-sub-vs", name: "Subarray/Substring vs Subsequence", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/subarraysubstring-vs-subsequence-and-programs-to-generate-them/" },
  ],

  references: [
    { title: "Subarray/Substring vs Subsequence e como gerar cada um", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/subarraysubstring-vs-subsequence-and-programs-to-generate-them/" },
    { title: "Power Set: os 2ⁿ subconjuntos", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/power-set/" },
    { title: "Longest Common Substring (DP): o grid que zera na quebra", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/longest-common-substring-dp-29/" },
    { title: "Longest Common Subsequence (DP): o mesmo grid, outro else", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/longest-common-subsequence-dp-4/" },
  ],
};
