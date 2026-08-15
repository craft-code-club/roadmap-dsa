import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-75", name: "Sort Colors", number: "75", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sort-colors/" },
    { id: "lc-912", name: "Sort an Array", number: "912", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sort-an-array/" },
    { id: "lc-215", name: "Kth Largest Element in an Array", number: "215", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/kth-largest-element-in-an-array/" },
    { id: "lc-347", name: "Top K Frequent Elements", number: "347", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/top-k-frequent-elements/" },
    { id: "lc-324", name: "Wiggle Sort II", number: "324", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/wiggle-sort-ii/" },
    { id: "gfg-quick-sort", name: "Quick Sort: guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/quick-sort-algorithm/" },
];

export const references: Reference[] = [
    { title: "Quicksort", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/quick.html" },
    { title: "Particionamento de Hoare, passo a passo", source: "João Arthur Brunet, UFCG", url: "https://joaoarthurbm.github.io/eda/posts/particionamento-hoare/" },
    { title: "Quicksort: análise e escolha do pivô (AEDS II)", source: "DCC, UFMG", url: "https://homepages.dcc.ufmg.br/~cunha/teaching/20121/aeds2/quicksort.pdf" },
    { title: "Introsort: quando o quick sort desiste e chama o heap sort", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Introsort" },
    { title: "Quick Sort", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/quick-sort-algorithm/" },
];
