import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-700", name: "Search in a Binary Search Tree", number: "700", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/search-in-a-binary-search-tree/" },
    { id: "lc-701", name: "Insert into a Binary Search Tree", number: "701", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/insert-into-a-binary-search-tree/" },
    { id: "lc-98", name: "Validate Binary Search Tree", number: "98", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/validate-binary-search-tree/" },
    { id: "lc-230", name: "Kth Smallest Element in a BST", number: "230", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/kth-smallest-element-in-a-bst/" },
    { id: "lc-108", name: "Convert Sorted Array to Binary Search Tree", number: "108", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/convert-sorted-array-to-binary-search-tree/" },
    { id: "lc-450", name: "Delete Node in a BST", number: "450", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/delete-node-in-a-bst/" },
];

export const references: Reference[] = [
    { title: "Binary Search Tree: busca, inserção e remoção", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/binary-search-tree-data-structure/" },
    { title: "Deletion in a BST: os três casos", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/deletion-in-binary-search-tree/" },
    { title: "AVL Tree: o balanceamento por rotação", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/introduction-to-avl-tree/" },
    { title: "Red-Black Tree: o balanceamento que o TreeMap usa", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/introduction-to-red-black-tree/" },
];
