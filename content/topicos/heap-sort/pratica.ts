import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-912", name: "Sort an Array", number: "912", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sort-an-array/" },
    { id: "lc-347", name: "Top K Frequent Elements", number: "347", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/top-k-frequent-elements/" },
    { id: "lc-692", name: "Top K Frequent Words", number: "692", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/top-k-frequent-words/" },
    { id: "lc-1985", name: "Find the Kth Largest Integer in the Array", number: "1985", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/find-the-kth-largest-integer-in-the-array/" },
    { id: "lc-502", name: "IPO", number: "502", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/ipo/" },
    { id: "gfg-heap-sort", name: "Heap Sort: guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/heap-sort/" },
];

export const references: Reference[] = [
    { title: "Heapsort", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/hpsrt.html" },
    { title: "Ordenação: Heapsort (AEDS II)", source: "DCC, UFMG", url: "https://homepages.dcc.ufmg.br/~cunha/teaching/20121/aeds2/heapsort.pdf" },
    { title: "Heap Sort", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/heap-sort/" },
    { title: "Por que construir um heap custa O(n)", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/time-complexity-of-building-a-heap/" },
    { title: "Introsort: onde o heap sort entra como rede de segurança", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Introsort" },
];
