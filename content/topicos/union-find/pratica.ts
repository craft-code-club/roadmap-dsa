import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-547", name: "Number of Provinces", number: "547", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-provinces/" },
    { id: "lc-684", name: "Redundant Connection", number: "684", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/redundant-connection/" },
    { id: "lc-721", name: "Accounts Merge", number: "721", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/accounts-merge/" },
    { id: "lc-990", name: "Satisfiability of Equality Equations", number: "990", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/satisfiability-of-equality-equations/" },
    { id: "lc-1584", name: "Min Cost to Connect All Points", number: "1584", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/min-cost-to-connect-all-points/" },
    { id: "lc-128", name: "Longest Consecutive Sequence", number: "128", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-consecutive-sequence/" },
    { id: "lc-803", name: "Bricks Falling When Hit", number: "803", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/bricks-falling-when-hit/" },
    { id: "gfg-dsu", name: "Introduction to Disjoint Set (Union-Find)", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/introduction-to-disjoint-set-data-structure-or-union-find-algorithm/" },
];

export const references: Reference[] = [
    { title: "Disjoint Set Union: as duas otimizações, com as provas", source: "CP-Algorithms", url: "https://cp-algorithms.com/data_structures/disjoint_set_union.html" },
    { title: "Efficiency of a Good But Not Linear Set Union Algorithm (de onde vem o α(n))", source: "Robert Tarjan, JACM 1975", url: "https://dl.acm.org/doi/10.1145/321879.321884" },
    { title: "Disjoint-set data structure", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Disjoint-set_data_structure" },
    { title: "Kruskal: o algoritmo de MST que é ordenação mais Union-Find", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/kruskals-minimum-spanning-tree-algorithm-greedy-algo-2/" },
];
