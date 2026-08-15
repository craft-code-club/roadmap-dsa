import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-509", name: "Fibonacci Number", number: "509", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/fibonacci-number/" },
    { id: "lc-70", name: "Climbing Stairs", number: "70", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/climbing-stairs/" },
    { id: "lc-206", name: "Reverse Linked List", number: "206", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/reverse-linked-list/" },
    { id: "lc-104", name: "Maximum Depth of Binary Tree", number: "104", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/maximum-depth-of-binary-tree/" },
    { id: "lc-50", name: "Pow(x, n)", number: "50", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/powx-n/" },
    { id: "gfg-recursao", name: "Recursion Practice Problems with Solutions", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/recursion-practice-problems-solutions/" },
];

export const references: Reference[] = [
    { title: "Introduction to Recursion", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/introduction-to-recursion-2/" },
    { title: "Types of Recursions", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/types-of-recursions/" },
    { title: "Program for nth Fibonacci Number: ingênuo, memoização e bottom-up", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/program-for-nth-fibonacci-number/" },
    { title: "sys.setrecursionlimit: o limite de mil níveis documentado na fonte", source: "Python Docs", url: "https://docs.python.org/3/library/sys.html#sys.setrecursionlimit" },
];
