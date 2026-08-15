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
    { id: "lc-35", name: "Search Insert Position", number: "35", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/search-insert-position/" },
    { id: "lc-34", name: "Find First and Last Position of Element in Sorted Array", number: "34", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/" },
    { id: "lc-2485", name: "Find Pivot Integer", number: "2485", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/find-pivot-integer/" },
    { id: "lc-33", name: "Search in Rotated Sorted Array", number: "33", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/search-in-rotated-sorted-array/" },
    { id: "lc-4", name: "Median of Two Sorted Arrays", number: "4", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/median-of-two-sorted-arrays/" },
    { id: "gfg-busca-binaria", name: "Binary Search: guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/binary-search/" },
];

export const references: Reference[] = [
    { title: "Como encontrar algo em um vetor rapidamente: busca binária", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/bubi.html" },
    { title: "Busca Binária: slides de Algoritmos e Estruturas de Dados", source: "DInf, UFPR", url: "https://www.inf.ufpr.br/eduardo/ensino/ci057/slides/aula01.pdf" },
    { title: "Nearly All Binary Searches and Mergesorts are Broken", source: "Joshua Bloch, Google Research", url: "https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/" },
    { title: "Binary Search", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/binary-search/" },
    { title: "bisect: busca binária em listas ordenadas na biblioteca padrão", source: "docs.python.org", url: "https://docs.python.org/3/library/bisect.html" },
];
