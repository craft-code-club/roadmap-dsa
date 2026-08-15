import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "backtracking",
  name: "Backtracking",
  group: "Backtracking",
  level: "Difícil",
  status: "ready",
  viz: "backtracking",
  isNew: true,
  youtube: "Vcm6mhLKU5A",
  videoMinutes: "2:08:38",
  article: "https://craftcodeclub.io/posts/dsa-backtracking",
  readingTime: "13 min",
  language: "Python",
  description: "Tentar, falhar e voltar atrás, busca exaustiva com poda.",
};

// O `sumario` é a lista dos `## h2` DO ARTIGO ao lado, no texto exato, e
// alimenta o índice "Nesta página". Ele é uma cópia: quando as duas listas
// divergem, a âncora do índice deixa de casar com a do título. O teste
// `o sumário de cada artigo é a lista dos h2 dele` compara as duas.
//
// Ele mora aqui, e o `import` do `.mdx` mora em `../artigos.ts`, por uma razão
// medida: este módulo é dado, e a barra lateral (que é cliente) o importa
// inteiro. Com o corpo do artigo aqui dentro, TODA página do site baixava os 39
// artigos compilados — 2,1 MB de JavaScript em `/apoie/` para escrever uma
// lista de apoiadores. O sumário é texto curto e é do tópico; o corpo é o peso,
// e ele só é carregado por quem renderiza um artigo.
export const sumario = [
    "Tentar, falhar, e desfazer",
    "A árvore de decisão não existe",
    "O template, e as três peças que mudam",
    "A cópia que salva as respostas",
    "Sudoku é o mesmo algoritmo",
    "Poda: a mesma resposta por uma fração do trabalho",
    "O custo, e para onde isso vai",
];

// Os problemas para praticar e as referências.
//
// Export à parte, e não campos do `topico`, por peso: as duas listas são 3/4
// do dado de um tópico (64 KB dos 85 KB somando os 80), e só a PÁGINA do
// tópico as desenha. O `content/topicos/index.ts` importa `topico` e `sumario`
// pelo nome e nunca este; quem o lê é `content/topicos/pratica.ts`, que só o
// servidor importa. Assim a barra lateral, que é cliente, não carrega
// problema nenhum.
export const pratica: Pratica = {
  problems: [
    { id: "lc-78", name: "Subsets", number: "78", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/subsets/" },
    { id: "lc-46", name: "Permutations", number: "46", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/permutations/" },
    { id: "lc-79", name: "Word Search", number: "79", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/word-search/" },
    { id: "lc-51", name: "N-Queens", number: "51", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/n-queens/" },
    { id: "lc-37", name: "Sudoku Solver", number: "37", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/sudoku-solver/" },
    { id: "gfg-backtracking", name: "Backtracking: guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/introduction-to-backtracking-2/" },
  ],

  references: [
    { title: "Algoritmos de enumeração", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/enum.html" },
    { title: "Backtracking (MC-202)", source: "IC, UNICAMP", url: "https://www.ic.unicamp.br/~rafael/cursos/2s2018/mc202/slides/unidade09-backtracking.pdf" },
    { title: "Backtracking, capítulo do livro Algorithms", source: "Jeff Erickson, University of Illinois", url: "https://jeffe.cs.illinois.edu/teaching/algorithms/book/02-backtracking.pdf" },
    { title: "O problema das oito rainhas e a história dele", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Eight_queens_puzzle" },
    { title: "Introduction to Backtracking", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/introduction-to-backtracking-2/" },
  ],
};
