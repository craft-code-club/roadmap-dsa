import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "busca-binaria",
  name: "Busca Binária",
  group: "Busca Binária",
  level: "Médio",
  status: "ready",
  viz: "busca-binaria",
  youtube: "62ZGcXDpbys",
  videoMinutes: "1:30:11",
  readingTime: "11 min",
  language: "Python",
  description: "Corte o espaço de busca pela metade a cada passo: O(log n).",
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
    "Cortar o problema pela metade",
    "O contrato: sem ordem, não existe busca binária",
    "O algoritmo, e as três decisões de cada passo",
    "O bug do meio, que sobreviveu uma década no Java",
    "Quando não acha, a resposta ainda serve",
    "Busca binária sem array",
    "As armadilhas",
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
    { id: "lc-704", name: "Binary Search", number: "704", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/binary-search/" },
    { id: "lc-35", name: "Search Insert Position", number: "35", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/search-insert-position/" },
    { id: "lc-34", name: "Find First and Last Position of Element in Sorted Array", number: "34", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/" },
    { id: "lc-2485", name: "Find Pivot Integer", number: "2485", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/find-pivot-integer/" },
    { id: "lc-33", name: "Search in Rotated Sorted Array", number: "33", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/search-in-rotated-sorted-array/" },
    { id: "lc-4", name: "Median of Two Sorted Arrays", number: "4", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/median-of-two-sorted-arrays/" },
    { id: "gfg-busca-binaria", name: "Binary Search: guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/binary-search/" },
  ],

  references: [
    { title: "Como encontrar algo em um vetor rapidamente: busca binária", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/bubi.html" },
    { title: "Busca Binária: slides de Algoritmos e Estruturas de Dados", source: "DInf, UFPR", url: "https://www.inf.ufpr.br/eduardo/ensino/ci057/slides/aula01.pdf" },
    { title: "Nearly All Binary Searches and Mergesorts are Broken", source: "Joshua Bloch, Google Research", url: "https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/" },
    { title: "Binary Search", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/binary-search/" },
    { title: "bisect: busca binária em listas ordenadas na biblioteca padrão", source: "docs.python.org", url: "https://docs.python.org/3/library/bisect.html" },
  ],
};
