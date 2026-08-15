import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-88", name: "Merge Sorted Array", number: "88", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/merge-sorted-array/" },
    { id: "lc-912", name: "Sort an Array", number: "912", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sort-an-array/" },
    { id: "lc-148", name: "Sort List", number: "148", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sort-list/" },
    { id: "lc-23", name: "Merge k Sorted Lists", number: "23", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/merge-k-sorted-lists/" },
    { id: "lc-493", name: "Reverse Pairs", number: "493", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/reverse-pairs/" },
    { id: "gfg-merge-sort", name: "Merge Sort: guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/merge-sort/" },
];

export const references: Reference[] = [
    { title: "Mergesort", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/mrgsrt.html" },
    { title: "Merge Sort: dividir para conquistar, passo a passo", source: "João Arthur Brunet, UFCG", url: "https://joaoarthurbm.github.io/eda/posts/merge-sort/" },
    { title: "Merge sort e quicksort (MC-202)", source: "IC, UNICAMP", url: "https://www.ic.unicamp.br/~rafael/cursos/2s2018/mc202/slides/unidade23-merge-quick.pdf" },
    { title: "listsort.txt: como o Timsort do CPython funciona", source: "python/cpython", url: "https://github.com/python/cpython/blob/main/Objects/listsort.txt" },
    { title: "Merge Sort", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/merge-sort/" },
];
