import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-207", name: "Course Schedule", number: "207", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/course-schedule/" },
    { id: "lc-210", name: "Course Schedule II", number: "210", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/course-schedule-ii/" },
    { id: "lc-310", name: "Minimum Height Trees", number: "310", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/minimum-height-trees/" },
    { id: "lc-2115", name: "Find All Possible Recipes from Given Supplies", number: "2115", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/find-all-possible-recipes-from-given-supplies/" },
    { id: "lc-269", name: "Alien Dictionary", number: "269", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/alien-dictionary/" },
    { id: "gfg-topo", name: "Topological Sorting", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/topological-sorting/" },
];

export const references: Reference[] = [
    { title: "Ordenação topológica: Kahn e DFS", source: "Craft & Code Club", url: "https://craftcodeclub.io/posts/dsa-topological-sorting" },
    { title: "Topological Sorting", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/topological-sorting/" },
    { title: "Kahn's algorithm for Topological Sorting", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/topological-sorting-indegree-based-solution/" },
    { title: "Detect Cycle in a Directed Graph", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/detect-cycle-in-a-graph/" },
];
