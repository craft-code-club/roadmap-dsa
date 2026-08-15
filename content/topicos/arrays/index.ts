import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "arrays",
  name: "Arrays e Listas",
  group: "Arrays e Strings",
  level: "Fácil",
  status: "ready",
  viz: "arrays",
  youtube: "c95xvXCU34A",
  videoMinutes: "2:15:08",
  readingTime: "16 min",
  language: "Python",
  description: "A estrutura sequencial base: acesso por índice em O(1).",
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
    "Espaço contíguo na memória",
    "Por que o processador gosta de memória contígua",
    "O preço de mexer no meio",
    "A tabela de custos, operação por operação",
    "Array dinâmico: a lista que cresce sozinha",
    "Capacidade não é tamanho",
    "Matriz ou array de arrays",
    "As armadilhas que pegam todo mundo",
    "Como praticar",
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
    { id: "lc-26", name: "Remove Duplicates from Sorted Array", number: "26", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/remove-duplicates-from-sorted-array/" },
    { id: "lc-88", name: "Merge Sorted Array", number: "88", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/merge-sorted-array/" },
    { id: "lc-189", name: "Rotate Array", number: "189", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/rotate-array/" },
    { id: "lc-238", name: "Product of Array Except Self", number: "238", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/product-of-array-except-self/" },
    { id: "lc-54", name: "Spiral Matrix", number: "54", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/spiral-matrix/" },
    { id: "gfg-arrays", name: "Array Data Structure Guide", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/array-data-structure-guide/" },
  ],

  references: [
    { title: "How Do Dynamic Arrays Work?", url: "https://www.geeksforgeeks.org/dsa/how-do-dynamic-arrays-work/", source: "GeeksforGeeks" },
    { title: "How are lists implemented in CPython?", url: "https://docs.python.org/3/faq/design.html#how-are-lists-implemented-in-cpython", source: "Documentação do Python" },
    { title: "Arrays (guia de programação em C#)", url: "https://learn.microsoft.com/pt-br/dotnet/csharp/programming-guide/arrays/", source: "Microsoft Learn" },
    { title: "Jagged Array in Java", url: "https://www.geeksforgeeks.org/dsa/jagged-array-in-java/", source: "GeeksforGeeks" },
  ],
};
