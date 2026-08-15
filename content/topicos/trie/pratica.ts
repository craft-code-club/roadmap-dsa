import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-208", name: "Implement Trie (Prefix Tree)", number: "208", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/implement-trie-prefix-tree/" },
    { id: "lc-1268", name: "Search Suggestions System", number: "1268", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/search-suggestions-system/" },
    { id: "lc-648", name: "Replace Words", number: "648", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/replace-words/" },
    { id: "lc-211", name: "Design Add and Search Words Data Structure", number: "211", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/design-add-and-search-words-data-structure/" },
    { id: "lc-421", name: "Maximum XOR of Two Numbers in an Array", number: "421", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/" },
    { id: "lc-212", name: "Word Search II", number: "212", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/word-search-ii/" },
    { id: "gfg-trie", name: "Trie: inserção e busca", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/trie-insert-and-search/" },
];

export const references: Reference[] = [
    { title: "Trie", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Trie" },
    { title: "Radix tree: a trie compactada, quando a memória aperta", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Radix_tree" },
    { title: "Aho-Corasick: a trie com links de falha", source: "CP-Algorithms", url: "https://cp-algorithms.com/string/aho_corasick.html" },
    { title: "Longest prefix match: a trie dentro da tabela de roteamento", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Longest_prefix_match" },
];
