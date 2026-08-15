import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "heap-sort",
  name: "Heap Sort",
  group: "Heaps",
  level: "Médio",
  status: "ready",
  viz: "heap-sort",
  youtube: "wUfOyKMjamM",
  videoMinutes: "2:10:31",
  readingTime: "11 min",
  language: "Python",
  description: "Ordenar com um heap em O(n log n).",
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
    "Ordenar é remover o topo n vezes",
    "Fase 1: virar o array num max-heap",
    "Fase 2: a fronteira que anda para trás",
    "Por que max-heap para ordenar crescente",
    "A conta: n log n no melhor e no pior caso",
    "In-place e instável",
    "Heap sort, merge sort ou quick sort",
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
    { id: "lc-912", name: "Sort an Array", number: "912", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sort-an-array/" },
    { id: "lc-347", name: "Top K Frequent Elements", number: "347", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/top-k-frequent-elements/" },
    { id: "lc-692", name: "Top K Frequent Words", number: "692", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/top-k-frequent-words/" },
    { id: "lc-1985", name: "Find the Kth Largest Integer in the Array", number: "1985", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/find-the-kth-largest-integer-in-the-array/" },
    { id: "lc-502", name: "IPO", number: "502", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/ipo/" },
    { id: "gfg-heap-sort", name: "Heap Sort: guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/heap-sort/" },
  ],

  references: [
    { title: "Heapsort", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/hpsrt.html" },
    { title: "Ordenação: Heapsort (AEDS II)", source: "DCC, UFMG", url: "https://homepages.dcc.ufmg.br/~cunha/teaching/20121/aeds2/heapsort.pdf" },
    { title: "Heap Sort", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/heap-sort/" },
    { title: "Por que construir um heap custa O(n)", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/time-complexity-of-building-a-heap/" },
    { title: "Introsort: onde o heap sort entra como rede de segurança", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Introsort" },
  ],
};
