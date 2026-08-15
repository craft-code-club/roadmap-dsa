import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-53", name: "Maximum Subarray", number: "53", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/maximum-subarray/" },
    { id: "lc-560", name: "Subarray Sum Equals K", number: "560", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/subarray-sum-equals-k/" },
    { id: "lc-3", name: "Longest Substring Without Repeating Characters", number: "3", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/" },
    { id: "lc-5", name: "Longest Palindromic Substring", number: "5", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-palindromic-substring/" },
    { id: "lc-300", name: "Longest Increasing Subsequence", number: "300", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-increasing-subsequence/" },
    { id: "lc-1143", name: "Longest Common Subsequence", number: "1143", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-common-subsequence/" },
    { id: "lc-78", name: "Subsets (Power Set)", number: "78", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/subsets/" },
    { id: "lc-416", name: "Partition Equal Subset Sum", number: "416", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/partition-equal-subset-sum/" },
    { id: "gfg-sub-vs", name: "Subarray/Substring vs Subsequence", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/subarraysubstring-vs-subsequence-and-programs-to-generate-them/" },
];

export const references: Reference[] = [
    { title: "Subarray/Substring vs Subsequence e como gerar cada um", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/subarraysubstring-vs-subsequence-and-programs-to-generate-them/" },
    { title: "Power Set: os 2ⁿ subconjuntos", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/power-set/" },
    { title: "Longest Common Substring (DP): o grid que zera na quebra", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/longest-common-substring-dp-29/" },
    { title: "Longest Common Subsequence (DP): o mesmo grid, outro else", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/longest-common-subsequence-dp-4/" },
];
