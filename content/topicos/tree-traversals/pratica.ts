import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-94", name: "Binary Tree Inorder Traversal", number: "94", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/binary-tree-inorder-traversal/" },
    { id: "lc-104", name: "Maximum Depth of Binary Tree", number: "104", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/maximum-depth-of-binary-tree/" },
    { id: "lc-101", name: "Symmetric Tree", number: "101", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/symmetric-tree/" },
    { id: "lc-102", name: "Binary Tree Level Order Traversal", number: "102", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/binary-tree-level-order-traversal/" },
    { id: "lc-199", name: "Binary Tree Right Side View", number: "199", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/binary-tree-right-side-view/" },
    { id: "gfg-tree-traversal", name: "Tree Traversals (Inorder, Preorder e Postorder)", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/tree-traversals-inorder-preorder-and-postorder/" },
];

export const references: Reference[] = [
    { title: "Tree Traversals (Inorder, Preorder e Postorder)", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/tree-traversals-inorder-preorder-and-postorder/" },
    { title: "Level Order Traversal (BFS em árvore)", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/level-order-tree-traversal/" },
    { title: "Inorder Tree Traversal without Recursion", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/inorder-tree-traversal-without-recursion/" },
    { title: "collections.deque: a fila usada no BFS", source: "Documentação do Python", url: "https://docs.python.org/3/library/collections.html#collections.deque" },
];
