import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-1584", name: "Min Cost to Connect All Points", number: "1584", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/min-cost-to-connect-all-points/" },
    { id: "lc-1135", name: "Connecting Cities With Minimum Cost", number: "1135", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/connecting-cities-with-minimum-cost/" },
    { id: "lc-684", name: "Redundant Connection", number: "684", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/redundant-connection/" },
    { id: "lc-1319", name: "Number of Operations to Make Network Connected", number: "1319", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-operations-to-make-network-connected/" },
    { id: "lc-1489", name: "Find Critical and Pseudo-Critical Edges in MST", number: "1489", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/find-critical-and-pseudo-critical-edges-in-minimum-spanning-tree/" },
    { id: "gfg-mst", name: "Minimum Spanning Tree", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/what-is-minimum-spanning-tree-mst/" },
];

export const references: Reference[] = [
    { title: "MST: Kruskal e Prim passo a passo", source: "Craft & Code Club", url: "https://craftcodeclub.io/posts/dsa-mst" },
    { title: "Kruskal's Minimum Spanning Tree Algorithm", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/kruskals-minimum-spanning-tree-algorithm-greedy-algo-2/" },
    { title: "Prim's Minimum Spanning Tree Algorithm", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/prims-minimum-spanning-tree-mst-greedy-algo-5/" },
    { title: "Disjoint Set Union (union-find) com compressão de caminho", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/introduction-to-disjoint-set-data-structure-or-union-find-algorithm/" },
];
