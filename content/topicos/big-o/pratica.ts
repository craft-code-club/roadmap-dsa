import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-704", name: "Binary Search", number: "704", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/binary-search/" },
    { id: "lc-217", name: "Contains Duplicate", number: "217", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/contains-duplicate/" },
    { id: "lc-121", name: "Best Time to Buy and Sell Stock", number: "121", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/" },
    { id: "lc-1", name: "Two Sum", number: "1", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/two-sum/" },
    { id: "lc-509", name: "Fibonacci Number", number: "509", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/fibonacci-number/" },
    { id: "gfg-complexidade", name: "Practice Questions on Time Complexity Analysis", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/practice-questions-time-complexity-analysis/" },
];

export const references: Reference[] = [
    { title: "Big O Notation", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/analysis-algorithms-big-o-analysis/" },
    { title: "Analysis of Algorithms: Asymptotic Analysis", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/analysis-of-algorithms-set-1-asymptotic-analysis/" },
    { title: "Big-O Cheat Sheet: complexidade das estruturas de dados", source: "bigocheatsheet.com", url: "https://www.bigocheatsheet.com/" },
    { title: "Time and Space Complexity: cartão do LeetCode Explore", source: "LeetCode", url: "https://leetcode.com/explore/learn/card/recursion-i/256/complexity-analysis/" },
];
