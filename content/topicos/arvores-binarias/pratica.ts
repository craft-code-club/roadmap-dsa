import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-226", name: "Invert Binary Tree", number: "226", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/invert-binary-tree/" },
    { id: "lc-100", name: "Same Tree", number: "100", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/same-tree/" },
    { id: "lc-110", name: "Balanced Binary Tree", number: "110", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/balanced-binary-tree/" },
    { id: "lc-543", name: "Diameter of Binary Tree", number: "543", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/diameter-of-binary-tree/" },
    { id: "lc-222", name: "Count Complete Tree Nodes", number: "222", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/count-complete-tree-nodes/" },
    { id: "gfg-binary-tree", name: "Binary Tree Data Structure", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/binary-tree-data-structure/" },
];

export const references: Reference[] = [
    { title: "Types of Binary Tree (cheia, perfeita, completa, degenerada)", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/types-of-binary-tree/" },
    { title: "Binary Tree Representation: ponteiros e array", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/binary-tree-representation/" },
    { title: "Relação entre número de nós e altura", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/relationship-number-nodes-height-binary-tree/" },
    { title: "Binary Tree Data Structure: o guia completo", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/binary-tree-data-structure/" },
];
