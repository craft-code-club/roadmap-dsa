import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-1091", name: "Shortest Path in Binary Matrix", number: "1091", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/shortest-path-in-binary-matrix/" },
    { id: "lc-773", name: "Sliding Puzzle", number: "773", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/sliding-puzzle/" },
    { id: "lc-1263", name: "Minimum Moves to Move a Box to Their Target Location", number: "1263", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/minimum-moves-to-move-a-box-to-their-target-location/" },
    { id: "lc-505", name: "The Maze II", number: "505", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/the-maze-ii/" },
    { id: "gfg-a-star", name: "A* Search Algorithm", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/a-search-algorithm/" },
];

export const references: Reference[] = [
    { title: "A*: heurística e caminho ótimo", source: "Craft & Code Club", url: "https://craftcodeclub.io/posts/dsa-a-star" },
    { title: "Introduction to A*", source: "Red Blob Games", url: "https://www.redblobgames.com/pathfinding/a-star/introduction.html" },
    { title: "Heuristics for grid maps", source: "Red Blob Games", url: "https://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html" },
    { title: "A* Search Algorithm", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/a-search-algorithm/" },
];
