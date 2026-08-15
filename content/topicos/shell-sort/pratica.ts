import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-905", name: "Sort Array By Parity", number: "905", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/sort-array-by-parity/" },
    { id: "lc-912", name: "Sort an Array", number: "912", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sort-an-array/" },
    { id: "lc-1122", name: "Relative Sort Array", number: "1122", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/relative-sort-array/" },
    { id: "lc-274", name: "H-Index", number: "274", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/h-index/" },
    { id: "lc-315", name: "Count of Smaller Numbers After Self", number: "315", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/count-of-smaller-numbers-after-self/" },
    { id: "gfg-shell-sort", name: "Shell Sort: guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/shell-sort/" },
];

export const references: Reference[] = [
    { title: "Shell sort: sequências de gaps e o que se sabe sobre cada uma", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Shellsort" },
    { title: "Shellsort (AEDS II)", source: "DCC, UFMG", url: "https://homepages.dcc.ufmg.br/~cunha/teaching/20121/aeds2/shellsort.pdf" },
    { title: "Ordenação: algoritmos elementares e o insertion sort de onde ele nasce", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/ordena.html" },
    { title: "Comparativo entre os algoritmos de ordenação (AEDS II)", source: "DCC, UFMG", url: "https://homepages.dcc.ufmg.br/~cunha/teaching/20121/aeds2/sortingcmp.pdf" },
    { title: "Shell Sort", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/shell-sort/" },
];
