import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "ordenacao-basica",
  name: "Ordenação Básica",
  group: "Ordenação",
  level: "Fácil",
  status: "ready",
  viz: "ordenacao-basica",
  youtube: "GxhxsbbzaTI",
  videoMinutes: "1:52:10",
  readingTime: "12 min",
  language: "Python",
  description: "Bubble, Selection e Insertion Sort, os O(n²) que ensinam a base.",
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
    "Três jeitos de arrumar as mesmas oito cartas",
    "Bubble sort: só troca com o vizinho",
    "Selection sort: escolhe primeiro, escreve depois",
    "Insertion sort: a mão de cartas",
    "Inversões: a conta que os três pagam de forma diferente",
    "Estável quer dizer que o empate não se mexe",
    "O(n²) é o teto, não a sentença",
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
    { id: "lc-283", name: "Move Zeroes", number: "283", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/move-zeroes/" },
    { id: "lc-2418", name: "Sort the People", number: "2418", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/sort-the-people/" },
    { id: "lc-88", name: "Merge Sorted Array", number: "88", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/merge-sorted-array/" },
    { id: "lc-147", name: "Insertion Sort List", number: "147", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/insertion-sort-list/" },
    { id: "lc-912", name: "Sort an Array", number: "912", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sort-an-array/" },
    { id: "gfg-ordenacao-basica", name: "Bubble, Selection e Insertion Sort: guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/bubble-sort-algorithm/" },
  ],

  references: [
    { title: "Ordenação: algoritmos elementares", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/ordena.html" },
    { title: "Insertion Sort: passo a passo comentado", source: "João Arthur Brunet, UFCG", url: "https://joaoarthurbm.github.io/eda/posts/insertion-sort/" },
    { title: "Ordenação: introdução e algoritmos elementares (AEDS II)", source: "DCC, UFMG", url: "https://homepages.dcc.ufmg.br/~cunha/teaching/20121/aeds2/sorting-intro.pdf" },
    { title: "Sorting Techniques: estabilidade e ordenação por vários critérios", source: "docs.python.org", url: "https://docs.python.org/3/howto/sorting.html" },
    { title: "Bubble Sort", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/bubble-sort-algorithm/" },
  ],
};
