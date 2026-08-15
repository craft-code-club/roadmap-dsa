import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-589", name: "N-ary Tree Preorder Traversal", number: "589", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/n-ary-tree-preorder-traversal/" },
    { id: "lc-590", name: "N-ary Tree Postorder Traversal", number: "590", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/n-ary-tree-postorder-traversal/" },
    { id: "lc-559", name: "Maximum Depth of N-ary Tree", number: "559", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/maximum-depth-of-n-ary-tree/" },
    { id: "lc-429", name: "N-ary Tree Level Order Traversal", number: "429", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/n-ary-tree-level-order-traversal/" },
    { id: "lc-431", name: "Encode N-ary Tree to Binary Tree", number: "431", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/encode-n-ary-tree-to-binary-tree/" },
    { id: "gfg-generic-trees", name: "Generic Trees (N-ary Trees)", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/generic-treesn-array-trees/" },
];

export const references: Reference[] = [
    { title: "Generic Trees (N-ary Trees)", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/generic-treesn-array-trees/" },
    { title: "Introduction of B-Tree: o grau alto e a página de disco", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/introduction-of-b-tree-2/" },
    { title: "Anatomia de um índice: a árvore por trás do banco", source: "Use The Index, Luke!", url: "https://use-the-index-luke.com/sql/anatomy/the-tree" },
    { title: "Introdução ao DOM: a árvore n-ária que você usa todo dia", source: "MDN", url: "https://developer.mozilla.org/pt-BR/docs/Web/API/Document_Object_Model/Introduction" },
];
