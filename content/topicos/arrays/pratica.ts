import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-26", name: "Remove Duplicates from Sorted Array", number: "26", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/remove-duplicates-from-sorted-array/" },
    { id: "lc-88", name: "Merge Sorted Array", number: "88", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/merge-sorted-array/" },
    { id: "lc-189", name: "Rotate Array", number: "189", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/rotate-array/" },
    { id: "lc-238", name: "Product of Array Except Self", number: "238", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/product-of-array-except-self/" },
    { id: "lc-54", name: "Spiral Matrix", number: "54", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/spiral-matrix/" },
    { id: "gfg-arrays", name: "Array Data Structure Guide", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/array-data-structure-guide/" },
];

export const references: Reference[] = [
    { title: "How Do Dynamic Arrays Work?", url: "https://www.geeksforgeeks.org/dsa/how-do-dynamic-arrays-work/", source: "GeeksforGeeks" },
    { title: "How are lists implemented in CPython?", url: "https://docs.python.org/3/faq/design.html#how-are-lists-implemented-in-cpython", source: "Documentação do Python" },
    { title: "Arrays (guia de programação em C#)", url: "https://learn.microsoft.com/pt-br/dotnet/csharp/programming-guide/arrays/", source: "Microsoft Learn" },
    { title: "Jagged Array in Java", url: "https://www.geeksforgeeks.org/dsa/jagged-array-in-java/", source: "GeeksforGeeks" },
];
