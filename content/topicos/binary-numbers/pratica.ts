import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-191", name: "Number of 1 Bits", number: "191", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/number-of-1-bits/" },
    { id: "lc-67", name: "Add Binary", number: "67", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/add-binary/" },
    { id: "lc-405", name: "Convert a Number to Hexadecimal", number: "405", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/convert-a-number-to-hexadecimal/" },
    { id: "lc-338", name: "Counting Bits", number: "338", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/counting-bits/" },
    { id: "lc-1009", name: "Complement of Base 10 Integer", number: "1009", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/complement-of-base-10-integer/" },
    { id: "gfg-binary-numbers", name: "Sistemas de numeração e conversão de bases", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/number-system-and-base-conversions/" },
];

export const references: Reference[] = [
    { title: "Bytes, números e caracteres", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/bytes.html" },
    { title: "Os tipos int e char", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/int.html" },
    { title: "Operações sobre bits em inteiros", source: "docs.python.org", url: "https://docs.python.org/3/library/stdtypes.html#bitwise-operations-on-integer-types" },
    { title: "Binary number: história e notação", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Binary_number" },
    { title: "Number System and Base Conversions", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/number-system-and-base-conversions/" },
];
