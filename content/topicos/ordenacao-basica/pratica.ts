import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-283", name: "Move Zeroes", number: "283", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/move-zeroes/" },
    { id: "lc-2418", name: "Sort the People", number: "2418", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/sort-the-people/" },
    { id: "lc-88", name: "Merge Sorted Array", number: "88", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/merge-sorted-array/" },
    { id: "lc-147", name: "Insertion Sort List", number: "147", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/insertion-sort-list/" },
    { id: "lc-912", name: "Sort an Array", number: "912", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sort-an-array/" },
    { id: "gfg-ordenacao-basica", name: "Bubble, Selection e Insertion Sort: guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/bubble-sort-algorithm/" },
];

export const references: Reference[] = [
    { title: "Ordenação: algoritmos elementares", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/ordena.html" },
    { title: "Insertion Sort: passo a passo comentado", source: "João Arthur Brunet, UFCG", url: "https://joaoarthurbm.github.io/eda/posts/insertion-sort/" },
    { title: "Ordenação: introdução e algoritmos elementares (AEDS II)", source: "DCC, UFMG", url: "https://homepages.dcc.ufmg.br/~cunha/teaching/20121/aeds2/sorting-intro.pdf" },
    { title: "Sorting Techniques: estabilidade e ordenação por vários critérios", source: "docs.python.org", url: "https://docs.python.org/3/howto/sorting.html" },
    { title: "Bubble Sort", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/bubble-sort-algorithm/" },
];
