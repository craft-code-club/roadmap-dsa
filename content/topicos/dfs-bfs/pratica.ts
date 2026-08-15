import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-200", name: "Number of Islands", number: "200", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-islands/" },
    { id: "lc-547", name: "Number of Provinces", number: "547", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-provinces/" },
    { id: "lc-994", name: "Rotting Oranges", number: "994", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/rotting-oranges/" },
    { id: "lc-207", name: "Course Schedule", number: "207", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/course-schedule/" },
    { id: "lc-127", name: "Word Ladder", number: "127", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/word-ladder/" },
    { id: "gfg-bfs-dfs", name: "Difference between BFS and DFS", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/difference-between-bfs-and-dfs/" },
];

export const references: Reference[] = [
    { title: "Breadth First Search or BFS for a Graph", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/breadth-first-search-or-bfs-for-a-graph/" },
    { title: "Depth First Search or DFS for a Graph", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/depth-first-search-or-dfs-for-a-graph/" },
    { title: "Detect Cycle in a Directed Graph", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/detect-cycle-in-a-graph/" },
    { title: "Shortest path in an unweighted graph", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/shortest-path-unweighted-graph/" },
];
