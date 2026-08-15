import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-217", name: "Contains Duplicate", number: "217", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/contains-duplicate/" },
    { id: "lc-242", name: "Valid Anagram", number: "242", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/valid-anagram/" },
    { id: "lc-1", name: "Two Sum", number: "1", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/two-sum/" },
    { id: "lc-49", name: "Group Anagrams", number: "49", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/group-anagrams/" },
    { id: "lc-706", name: "Design HashMap", number: "706", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/design-hashmap/" },
    { id: "gfg-hashing", name: "Practice Problems on Hashing", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/practice-problems-on-hashing/" },
];

export const references: Reference[] = [
    { title: "Hashing in Data Structure", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/hashing-data-structure/" },
    { title: "Separate Chaining Collision Handling Technique in Hashing", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/separate-chaining-collision-handling-technique-in-hashing/" },
    { title: "Load Factor and Rehashing", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/load-factor-and-rehashing/" },
    { title: "java.util.HashMap: o fator de carga 0,75 documentado na fonte", source: "Oracle", url: "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html" },
];
