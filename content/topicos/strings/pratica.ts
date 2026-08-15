import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-344", name: "Reverse String", number: "344", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/reverse-string/" },
    { id: "lc-796", name: "Rotate String", number: "796", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/rotate-string/" },
    { id: "lc-28", name: "Find the Index of the First Occurrence in a String", number: "28", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/" },
    { id: "lc-6", name: "Zigzag Conversion", number: "6", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/zigzag-conversion/" },
    { id: "lc-5", name: "Longest Palindromic Substring", number: "5", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-palindromic-substring/" },
    { id: "gfg-strings", name: "String Data Structure: o guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/string-data-structure/" },
];

export const references: Reference[] = [
    { title: "Checar se duas strings são rotações uma da outra", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/a-program-to-check-if-strings-are-rotations-of-each-other/" },
    { title: "Unicode HOWTO: code points, encodings e as pegadinhas", source: "Python Docs", url: "https://docs.python.org/3/howto/unicode.html" },
    { title: "O mínimo absoluto que todo dev precisa saber sobre Unicode", source: "Joel on Software", url: "https://www.joelonsoftware.com/2003/10/08/the-absolute-minimum-every-software-developer-absolutely-positively-must-know-about-unicode-and-character-sets-no-excuses/" },
    { title: "Usando a classe StringBuilder no .NET", source: "Microsoft Learn", url: "https://learn.microsoft.com/pt-br/dotnet/standard/base-types/stringbuilder" },
];
