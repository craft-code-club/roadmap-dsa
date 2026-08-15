import type { Problem } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-643", name: "Maximum Average Subarray I", number: "643", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/maximum-average-subarray-i/" },
    { id: "lc-1343", name: "Sub-arrays of Size K with Average ≥ Threshold", number: "1343", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold/" },
    { id: "lc-1456", name: "Maximum Number of Vowels in a Substring of Given Length", number: "1456", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/maximum-number-of-vowels-in-a-substring-of-given-length/" },
    { id: "lc-567", name: "Permutation in String", number: "567", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/permutation-in-string/" },
    { id: "lc-3", name: "Longest Substring Without Repeating Characters", number: "3", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/" },
    { id: "lc-209", name: "Minimum Size Subarray Sum", number: "209", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/minimum-size-subarray-sum/" },
    { id: "lc-1004", name: "Max Consecutive Ones III", number: "1004", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/max-consecutive-ones-iii/" },
    { id: "lc-713", name: "Subarray Product Less Than K", number: "713", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/subarray-product-less-than-k/" },
    { id: "lc-239", name: "Sliding Window Maximum", number: "239", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/sliding-window-maximum/" },
    { id: "lc-76", name: "Minimum Window Substring", number: "76", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/minimum-window-substring/" },
    { id: "gfg-sliding", name: "Window Sliding Technique", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/window-sliding-technique/" },
];
