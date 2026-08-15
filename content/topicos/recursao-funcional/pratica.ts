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
    { id: "lc-206", name: "Reverse Linked List", number: "206", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/reverse-linked-list/" },
    { id: "lc-509", name: "Fibonacci Number", number: "509", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/fibonacci-number/" },
    { id: "lc-50", name: "Pow(x, n)", number: "50", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/powx-n/" },
    { id: "lc-779", name: "K-th Symbol in Grammar", number: "779", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/k-th-symbol-in-grammar/" },
    { id: "gfg-recursao-cauda", name: "Tail Recursion", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/tail-recursion/" },
];

export const references: Reference[] = [
    { title: "Tail Call Elimination", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/tail-call-elimination/" },
    { title: "Tail Recursion Elimination: por que o Python não faz", source: "Guido van Rossum", url: "https://neopythonic.blogspot.com/2009/04/tail-recursion-elimination.html" },
    { title: "The Seven Myths of Erlang Performance: recursão de cauda nem sempre é mais rápida", source: "Erlang/OTP", url: "https://www.erlang.org/docs/26/efficiency_guide/myths" },
    { title: "Tail recursive functions: o modificador tailrec", source: "Kotlin", url: "https://kotlinlang.org/docs/functions.html#tail-recursive-functions" },
];
