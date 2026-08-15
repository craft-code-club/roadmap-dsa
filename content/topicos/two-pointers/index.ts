import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "two-pointers",
  name: "Two Pointers",
  group: "Arrays e Strings",
  level: "Fácil",
  status: "ready",
  viz: "two-pointers",
  youtube: "a1QMdXgcQwY",
  videoMinutes: "1:11:13",
  readingTime: "18 min",
  language: "Python",
  description: "Dois índices caminhando na mesma passada. Em array ordenado, um começa na ponta esquerda e o outro na direita, e eles convergem.",
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
    "Uma técnica, não um algoritmo",
    "O que custa testar todos os pares",
    "Convergentes: o Two Sum em array ordenado",
    "Por que mover um ponteiro só não perde solução",
    "Palíndromo: dois ponteiros em ritmos diferentes",
    "Mesma direção: o leitor e o escritor",
    "Rápido e lento: o ciclo da lista ligada",
    "Ordenar para usar dois ponteiros: o trade-off com hash",
    "Onde o Two Pointers dá errado",
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
    { id: "lc-125", name: "Valid Palindrome", number: "125", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/valid-palindrome/" },
    { id: "lc-26", name: "Remove Duplicates from Sorted Array", number: "26", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/remove-duplicates-from-sorted-array/" },
    { id: "lc-141", name: "Linked List Cycle", number: "141", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/linked-list-cycle/" },
    { id: "lc-167", name: "Two Sum II - Input Array Is Sorted", number: "167", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/" },
    { id: "lc-11", name: "Container With Most Water", number: "11", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/container-with-most-water/" },
    { id: "lc-15", name: "3Sum", number: "15", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/3sum/" },
    { id: "gfg-two-pointers", name: "Two Pointers Technique", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/two-pointers-technique/" },
  ],

  references: [
    { title: "Floyd's Cycle Finding Algorithm", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/floyds-cycle-finding-algorithm/" },
    { title: "Two Pointer Technique: capítulo do LeetCode Explore", source: "LeetCode", url: "https://leetcode.com/explore/learn/card/fun-with-arrays/527/searching-for-items-in-an-array/" },
    { title: "Cycle detection: a lebre, a tartaruga e as variações", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Cycle_detection" },
  ],
};
