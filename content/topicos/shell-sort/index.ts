import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "shell-sort",
  name: "Shell Sort",
  group: "Ordenação",
  level: "Médio",
  status: "ready",
  viz: "shell-sort",
  youtube: "symbT7Cgrr8",
  videoMinutes: "1:58:45",
  readingTime: "12 min",
  language: "Python",
  description: "Insertion Sort turbinado com gap sequences.",
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
    "O insertion sort com a constante 1 virando variável",
    "Uma rodada de gap h são h insertion sorts entrelaçados",
    "Por que as rodadas anteriores não são desperdício",
    "A sequência de gaps, e o que ela muda",
    "Onde ele ganha e onde ele perde",
    "In-place e instável",
    "Onde o shell sort ainda vive",
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
    { id: "lc-905", name: "Sort Array By Parity", number: "905", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/sort-array-by-parity/" },
    { id: "lc-912", name: "Sort an Array", number: "912", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sort-an-array/" },
    { id: "lc-1122", name: "Relative Sort Array", number: "1122", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/relative-sort-array/" },
    { id: "lc-274", name: "H-Index", number: "274", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/h-index/" },
    { id: "lc-315", name: "Count of Smaller Numbers After Self", number: "315", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/count-of-smaller-numbers-after-self/" },
    { id: "gfg-shell-sort", name: "Shell Sort: guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/shell-sort/" },
  ],

  references: [
    { title: "Shell sort: sequências de gaps e o que se sabe sobre cada uma", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Shellsort" },
    { title: "Shellsort (AEDS II)", source: "DCC, UFMG", url: "https://homepages.dcc.ufmg.br/~cunha/teaching/20121/aeds2/shellsort.pdf" },
    { title: "Ordenação: algoritmos elementares e o insertion sort de onde ele nasce", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/ordena.html" },
    { title: "Comparativo entre os algoritmos de ordenação (AEDS II)", source: "DCC, UFMG", url: "https://homepages.dcc.ufmg.br/~cunha/teaching/20121/aeds2/sortingcmp.pdf" },
    { title: "Shell Sort", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/shell-sort/" },
  ],
};
