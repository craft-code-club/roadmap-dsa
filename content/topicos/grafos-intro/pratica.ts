import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-1971", name: "Find if Path Exists in Graph", number: "1971", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/find-if-path-exists-in-graph/" },
    { id: "lc-733", name: "Flood Fill", number: "733", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/flood-fill/" },
    { id: "lc-200", name: "Number of Islands", number: "200", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-islands/" },
    { id: "lc-133", name: "Clone Graph", number: "133", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/clone-graph/" },
    { id: "lc-547", name: "Number of Provinces", number: "547", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-provinces/" },
    { id: "gfg-graph", name: "Graph Data Structure and Algorithms", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/graph-data-structure-and-algorithms/" },
];

export const references: Reference[] = [
    { title: "Graph Data Structure and Algorithms", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/graph-data-structure-and-algorithms/" },
    { title: "Comparação entre matriz e lista de adjacência", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/comparison-between-adjacency-list-and-adjacency-matrix-representation-of-graph/" },
    { title: "Graph and its representations", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/graph-and-its-representations/" },
    { title: "collections.defaultdict: a lista de adjacência em uma linha", source: "Documentação do Python", url: "https://docs.python.org/3/library/collections.html#collections.defaultdict" },
];
