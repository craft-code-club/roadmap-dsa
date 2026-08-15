import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-78", name: "Subsets", number: "78", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/subsets/" },
    { id: "lc-46", name: "Permutations", number: "46", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/permutations/" },
    { id: "lc-79", name: "Word Search", number: "79", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/word-search/" },
    { id: "lc-51", name: "N-Queens", number: "51", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/n-queens/" },
    { id: "lc-37", name: "Sudoku Solver", number: "37", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/sudoku-solver/" },
    { id: "gfg-backtracking", name: "Backtracking: guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/introduction-to-backtracking-2/" },
];

export const references: Reference[] = [
    { title: "Algoritmos de enumeração", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/enum.html" },
    { title: "Backtracking (MC-202)", source: "IC, UNICAMP", url: "https://www.ic.unicamp.br/~rafael/cursos/2s2018/mc202/slides/unidade09-backtracking.pdf" },
    { title: "Backtracking, capítulo do livro Algorithms", source: "Jeff Erickson, University of Illinois", url: "https://jeffe.cs.illinois.edu/teaching/algorithms/book/02-backtracking.pdf" },
    { title: "O problema das oito rainhas e a história dele", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Eight_queens_puzzle" },
    { title: "Introduction to Backtracking", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/introduction-to-backtracking-2/" },
];
