import type { Roadmap } from "@/content/tipos";

// OS FUNDAMENTOS: a sequência principal, do Big O aos grafos.
//
// Ele é um roadmap como os outros — a mesma estrutura, o mesmo tipo, o mesmo
// jeito de citar tópicos. O que o torna o principal não é uma exceção no
// modelo, são três fatos declarados fora dele: a home aponta para ele, ele tem
// URL curta (`/fundamentos/`, e não `/roadmaps/fundamentos/`) e ele abre a
// vitrine. Tudo o mais é igual.
//
// Agrupamento estilo LeetCode: cada estrutura junto das técnicas que operam
// sobre ela; os paradigmas (Recursão, Backtracking, Programação Dinâmica,
// Greedy) como grupos próprios.
export const roadmap: Roadmap = {
  slug: "fundamentos",
  name: "Fundamentos",
  tagline: "Do zero à entrevista, na ordem em que se aprende.",
  description:
    "A sequência principal do guia: as estruturas de dados e os algoritmos que todo o resto pressupõe, na ordem em que um se apoia no outro. Comece pelo Big O, para ter régua, e siga em frente. É o único roadmap que dá para percorrer sem ter percorrido outro antes.",
  level: "Fácil",
  glyph: "◆",
  groups: [
    {
      id: "introducao",
      name: "Introdução",
      intro: { name: "Introdução", href: "/introducao", description: "Como o guia funciona e por onde começar." },
      topics: [
        { topic: "big-o" },
      ],
    },
    {
      id: "arrays-strings",
      name: "Arrays e Strings",
      topics: [
        { topic: "arrays" },
        { topic: "strings" },
        { topic: "subarray-substring-subsequence-subset" },
        { topic: "two-pointers" },
        { topic: "sliding-window" },
        { topic: "prefix-sum" },
        { topic: "intervals" },
      ],
    },
    {
      id: "hashing",
      name: "Hashing",
      topics: [
        { topic: "hash-table" },
      ],
    },
    {
      id: "listas",
      name: "Listas Encadeadas",
      topics: [
        { topic: "listas-ligadas" },
      ],
    },
    {
      id: "pilhas-filas",
      name: "Pilhas e Filas",
      topics: [
        { topic: "pilhas" },
        { topic: "filas" },
      ],
    },
    {
      id: "recursao",
      name: "Recursão",
      topics: [
        { topic: "recursao" },
        { topic: "recursao-funcional" },
      ],
    },
    {
      id: "arvores",
      name: "Árvores",
      topics: [
        { topic: "tree-traversals" },
        { topic: "arvores-binarias" },
        { topic: "n-ary-trees" },
        { topic: "bst" },
      ],
    },
    {
      id: "grafos",
      name: "Grafos",
      topics: [
        { topic: "grafos-intro" },
        { topic: "dfs-bfs" },
        { topic: "dijkstra" },
        { topic: "bellman-ford" },
        { topic: "a-star" },
        { topic: "floyd-warshall" },
        { topic: "topological-sort" },
        { topic: "mst" },
      ],
    },
    {
      id: "heaps",
      name: "Heaps",
      topics: [
        { topic: "binary-heap" },
        { topic: "heap-sort" },
      ],
    },
    {
      id: "busca-binaria",
      name: "Busca Binária",
      topics: [
        { topic: "busca-binaria" },
        { topic: "busca-binaria-avancada" },
      ],
    },
    {
      id: "ordenacao",
      name: "Ordenação",
      topics: [
        { topic: "ordenacao-basica" },
        { topic: "merge-sort" },
        { topic: "quick-sort" },
        { topic: "shell-sort" },
        { topic: "counting-sort" },
        { topic: "radix-sort" },
        { topic: "bucket-sort" },
      ],
    },
    {
      id: "backtracking",
      name: "Backtracking",
      topics: [
        { topic: "backtracking" },
      ],
    },
    {
      id: "dp",
      name: "Programação Dinâmica",
      topics: [
        { topic: "programacao-dinamica" },
      ],
    },
    {
      id: "greedy",
      name: "Greedy Algorithms",
      topics: [
        { topic: "greedy" },
      ],
    },
    {
      id: "bits",
      name: "Manipulação de Bits",
      topics: [
        { topic: "binary-numbers" },
        { topic: "negative-binary" },
        { topic: "operacoes-bitwise" },
      ],
    },
    {
      id: "matematica",
      name: "Matemática",
      topics: [
        { topic: "matematica" },
      ],
    },
  ],
};
