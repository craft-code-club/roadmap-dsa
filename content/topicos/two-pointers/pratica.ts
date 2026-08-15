import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-125", name: "Valid Palindrome", number: "125", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/valid-palindrome/" },
    { id: "lc-26", name: "Remove Duplicates from Sorted Array", number: "26", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/remove-duplicates-from-sorted-array/" },
    { id: "lc-141", name: "Linked List Cycle", number: "141", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/linked-list-cycle/" },
    { id: "lc-167", name: "Two Sum II - Input Array Is Sorted", number: "167", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/" },
    { id: "lc-11", name: "Container With Most Water", number: "11", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/container-with-most-water/" },
    { id: "lc-15", name: "3Sum", number: "15", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/3sum/" },
    { id: "gfg-two-pointers", name: "Two Pointers Technique", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/two-pointers-technique/" },
];

export const references: Reference[] = [
    { title: "Floyd's Cycle Finding Algorithm", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/floyds-cycle-finding-algorithm/" },
    { title: "Two Pointer Technique: capítulo do LeetCode Explore", source: "LeetCode", url: "https://leetcode.com/explore/learn/card/fun-with-arrays/527/searching-for-items-in-an-array/" },
    { title: "Cycle detection: a lebre, a tartaruga e as variações", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Cycle_detection" },
];
