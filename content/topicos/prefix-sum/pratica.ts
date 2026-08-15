import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-303", name: "Range Sum Query - Immutable", number: "303", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/range-sum-query-immutable/" },
    { id: "lc-724", name: "Find Pivot Index", number: "724", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/find-pivot-index/" },
    { id: "lc-643", name: "Maximum Average Subarray I", number: "643", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/maximum-average-subarray-i/" },
    { id: "lc-2270", name: "Number of Ways to Split Array", number: "2270", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-ways-to-split-array/" },
    { id: "lc-560", name: "Subarray Sum Equals K", number: "560", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/subarray-sum-equals-k/" },
    { id: "gfg-prefix-sum", name: "Range Sum Queries Without Updates", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/range-sum-queries-without-updates/" },
];

export const references: Reference[] = [
    { title: "Prefix Sum Array: implementação e aplicações", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/prefix-sum-array-implementation-applications-competitive-programming/" },
    { title: "Prefix Sum of Matrix (Or 2D Array): o prefixo em duas dimensões", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/prefix-sum-2d-array/" },
    { title: "1D Difference Array: atualizar um intervalo em O(1)", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/difference-array-range-update-query-o1/" },
    { title: "Introduction to Prefix Sums", source: "USACO Guide", url: "https://usaco.guide/silver/prefix-sums" },
];
