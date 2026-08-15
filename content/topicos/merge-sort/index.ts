import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "merge-sort",
  name: "Merge Sort",
  group: "Ordenação",
  level: "Médio",
  status: "ready",
  viz: "merge-sort",
  youtube: "lbktBOwmmhg",
  videoMinutes: "3:14:02",
  readingTime: "13 min",
  language: "Python",
  description: "Divisão e conquista, estável, O(n log n).",
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
    "Ordenar na volta, não na descida",
    "A intercalação é o algoritmo inteiro",
    "De onde sai o n log n",
    "O preço do merge sort é memória",
    "Estável por causa de um sinal",
    "Lista ligada: onde o merge sort não paga o preço",
    "Onde ele é a escolha certa",
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
    { id: "lc-88", name: "Merge Sorted Array", number: "88", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/merge-sorted-array/" },
    { id: "lc-912", name: "Sort an Array", number: "912", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sort-an-array/" },
    { id: "lc-148", name: "Sort List", number: "148", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sort-list/" },
    { id: "lc-23", name: "Merge k Sorted Lists", number: "23", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/merge-k-sorted-lists/" },
    { id: "lc-493", name: "Reverse Pairs", number: "493", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/reverse-pairs/" },
    { id: "gfg-merge-sort", name: "Merge Sort: guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/merge-sort/" },
  ],

  references: [
    { title: "Mergesort", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/mrgsrt.html" },
    { title: "Merge Sort: dividir para conquistar, passo a passo", source: "João Arthur Brunet, UFCG", url: "https://joaoarthurbm.github.io/eda/posts/merge-sort/" },
    { title: "Merge sort e quicksort (MC-202)", source: "IC, UNICAMP", url: "https://www.ic.unicamp.br/~rafael/cursos/2s2018/mc202/slides/unidade23-merge-quick.pdf" },
    { title: "listsort.txt: como o Timsort do CPython funciona", source: "python/cpython", url: "https://github.com/python/cpython/blob/main/Objects/listsort.txt" },
    { title: "Merge Sort", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/merge-sort/" },
  ],
};
