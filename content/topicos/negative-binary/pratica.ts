import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-461", name: "Hamming Distance", number: "461", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/hamming-distance/" },
    { id: "lc-190", name: "Reverse Bits", number: "190", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/reverse-bits/" },
    { id: "lc-7", name: "Reverse Integer", number: "7", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/reverse-integer/" },
    { id: "lc-371", name: "Sum of Two Integers", number: "371", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sum-of-two-integers/" },
    { id: "lc-29", name: "Divide Two Integers", number: "29", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/divide-two-integers/" },
    { id: "gfg-complemento", name: "Complemento de um e de dois", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/1s-2s-complement-binary-number/" },
];

export const references: Reference[] = [
    { title: "Os tipos int e char: representação e limites", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/int.html" },
    { title: "Two's complement: por que ela venceu", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Two%27s_complement" },
    { title: "O problema do ano 2038", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Year_2038_problem" },
    { title: "Operações sobre bits em inteiros", source: "docs.python.org", url: "https://docs.python.org/3/library/stdtypes.html#bitwise-operations-on-integer-types" },
    { title: "1's and 2's Complement of a Binary Number", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/1s-2s-complement-binary-number/" },
];
