import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "sliding-window",
  name: "Sliding Window",
  group: "Arrays e Strings",
  level: "Médio",
  status: "ready",
  viz: "sliding-window",
  youtube: "OvIJw1AMNzI",
  videoMinutes: "2:08:22",
  readingTime: "12 min",
  language: "Python",
  description: "Uma janela contígua que anda pelo array. Fixa, com tamanho travado em k, ou variável, crescendo pela direita e encolhendo pela esquerda enquanto está inválida.",
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
    "O problema que faz a técnica nascer",
    "A intuição: o que entra e o que sai",
    "Construindo a janela fixa",
    "Construindo a janela variável",
    "O padrão generalizado",
    "Como reconhecer que é janela deslizante",
    "Complexidade",
    "As armadilhas",
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
    { id: "lc-643", name: "Maximum Average Subarray I", number: "643", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/maximum-average-subarray-i/" },
    { id: "lc-1343", name: "Sub-arrays of Size K with Average ≥ Threshold", number: "1343", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold/" },
    { id: "lc-1456", name: "Maximum Number of Vowels in a Substring of Given Length", number: "1456", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/maximum-number-of-vowels-in-a-substring-of-given-length/" },
    { id: "lc-567", name: "Permutation in String", number: "567", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/permutation-in-string/" },
    { id: "lc-3", name: "Longest Substring Without Repeating Characters", number: "3", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/" },
    { id: "lc-209", name: "Minimum Size Subarray Sum", number: "209", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/minimum-size-subarray-sum/" },
    { id: "lc-1004", name: "Max Consecutive Ones III", number: "1004", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/max-consecutive-ones-iii/" },
    { id: "lc-713", name: "Subarray Product Less Than K", number: "713", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/subarray-product-less-than-k/" },
    { id: "lc-239", name: "Sliding Window Maximum", number: "239", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/sliding-window-maximum/" },
    { id: "lc-76", name: "Minimum Window Substring", number: "76", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/minimum-window-substring/" },
    { id: "gfg-sliding", name: "Window Sliding Technique", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/window-sliding-technique/" },
  ],
};
