// Os TÓPICOS AVULSOS: uma estrutura que se basta numa página só.
//
// Vivem em `/topico/<slug>/`, exatamente como os tópicos dos Fundamentos, e são
// servidos sem barra lateral: a página é o assunto inteiro, e uma lista ao lado
// dela seria uma lista para lugar nenhum.
//
// Um avulso pode ser CITADO por quantos roadmaps quiserem (a Skip List está em
// "Bancos de Dados", a Trie em "Casamento de Padrões em Strings"). Citar não
// muda a casa: a página canônica continua sendo esta, sem barra lateral, e é
// ela que ganha a banda "Também faz parte de" no fim.
//
// O modelo (`Standalone`) e os derivados moram em `content/roadmaps/index.ts`,
// que é quem junta as três casas do site.

import type { Standalone } from "./roadmaps";

export const STANDALONES: Standalone[] = [
  {
    tagline: "Lista encadeada em níveis: O(log n) no cara ou coroa.",
    glyph: "≡",
    requires: ["listas-ligadas", "busca-binaria", "big-o"],
    topic: {
      slug: "skip-list",
      name: "Skip List",
      // O grupo mudou junto com a mudança de casa. Ela era "Listas Encadeadas"
      // porque a skip list é FEITA de listas encadeadas — que é uma verdade
      // sobre a implementação, não sobre o assunto. O que ela é, é uma
      // estrutura probabilística; é isso que o leitor precisa saber antes de
      // clicar, e é isso que a trilha vizinho continua.
      group: "Estruturas probabilísticas",
      level: "Difícil",
      status: "ready",
      viz: "skip-list",
      youtube: "R9sVLuJ7FSg",
      videoMinutes: "1:58:55",
      article: "https://craftcodeclub.io/posts/dsa-skip-list",
      readingTime: "19 min",
      language: "Python",
      description: "Lista encadeada em níveis: busca probabilística eficiente.",
      problems: [
        { id: "lc-703", name: "Kth Largest Element in a Stream", number: "703", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/kth-largest-element-in-a-stream/" },
        { id: "lc-707", name: "Design Linked List", number: "707", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/design-linked-list/" },
        { id: "lc-981", name: "Time Based Key-Value Store", number: "981", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/time-based-key-value-store/" },
        { id: "lc-1206", name: "Design Skiplist", number: "1206", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/design-skiplist/" },
        { id: "lc-295", name: "Find Median from Data Stream", number: "295", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/find-median-from-data-stream/" },
        { id: "gfg-skip-list", name: "Skip List: guia completo com busca, inserção e remoção", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/skip-list/" },
      ],
      references: [
        { title: "Skip Lists: A Probabilistic Alternative to Balanced Trees (o artigo original)", source: "William Pugh, CACM 1990", url: "https://15721.courses.cs.cmu.edu/spring2018/papers/08-oltpindexes1/pugh-skiplists-cacm1990.pdf" },
        { title: "Skip List: o artigo do encontro", source: "Craft & Code Club", url: "https://craftcodeclub.io/posts/dsa-skip-list" },
        { title: "Sorted sets: tabela hash mais skip list na prática", source: "Redis Docs", url: "https://redis.io/docs/latest/develop/data-types/sorted-sets/" },
        { title: "ConcurrentSkipListMap: uma skip list na biblioteca padrão", source: "Oracle Java Docs", url: "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ConcurrentSkipListMap.html" },
      ],
    },
  },
  {
    tagline: "Conjuntos que se fundem em tempo quase constante.",
    glyph: "⊕",
    requires: ["grafos-intro", "dfs-bfs", "arrays"],
    topic: {
      slug: "union-find",
      name: "Union-Find (DSU)",
      group: "Grafos e conjuntos",
      level: "Médio",
      status: "ready",
      isNew: true,
      readingTime: "15 min",
      language: "Python",
      description: "Conjuntos disjuntos que se fundem: union by rank, path compression e o inverso de Ackermann.",
      problems: [
        { id: "lc-547", name: "Number of Provinces", number: "547", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-provinces/" },
        { id: "lc-684", name: "Redundant Connection", number: "684", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/redundant-connection/" },
        { id: "lc-721", name: "Accounts Merge", number: "721", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/accounts-merge/" },
        { id: "lc-990", name: "Satisfiability of Equality Equations", number: "990", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/satisfiability-of-equality-equations/" },
        { id: "lc-1584", name: "Min Cost to Connect All Points", number: "1584", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/min-cost-to-connect-all-points/" },
        { id: "lc-128", name: "Longest Consecutive Sequence", number: "128", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-consecutive-sequence/" },
        { id: "lc-803", name: "Bricks Falling When Hit", number: "803", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/bricks-falling-when-hit/" },
        { id: "gfg-dsu", name: "Introduction to Disjoint Set (Union-Find)", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/introduction-to-disjoint-set-data-structure-or-union-find-algorithm/" },
      ],
      references: [
        { title: "Disjoint Set Union: as duas otimizações, com as provas", source: "CP-Algorithms", url: "https://cp-algorithms.com/data_structures/disjoint_set_union.html" },
        { title: "Efficiency of a Good But Not Linear Set Union Algorithm (de onde vem o α(n))", source: "Robert Tarjan, JACM 1975", url: "https://dl.acm.org/doi/10.1145/321879.321884" },
        { title: "Disjoint-set data structure", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Disjoint-set_data_structure" },
        { title: "Kruskal: o algoritmo de MST que é ordenação mais Union-Find", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/kruskals-minimum-spanning-tree-algorithm-greedy-algo-2/" },
      ],
    },
  },
  {
    tagline: "A árvore que indexa prefixos, não palavras.",
    glyph: "▲",
    requires: ["strings", "hash-table", "n-ary-trees"],
    topic: {
      slug: "trie",
      name: "Trie (Árvore de Prefixos)",
      group: "Strings e árvores",
      level: "Médio",
      status: "ready",
      isNew: true,
      readingTime: "15 min",
      language: "Python",
      description: "Cada nó é um prefixo, cada aresta é um caractere: autocomplete em O(m).",
      problems: [
        { id: "lc-208", name: "Implement Trie (Prefix Tree)", number: "208", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/implement-trie-prefix-tree/" },
        { id: "lc-1268", name: "Search Suggestions System", number: "1268", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/search-suggestions-system/" },
        { id: "lc-648", name: "Replace Words", number: "648", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/replace-words/" },
        { id: "lc-211", name: "Design Add and Search Words Data Structure", number: "211", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/design-add-and-search-words-data-structure/" },
        { id: "lc-421", name: "Maximum XOR of Two Numbers in an Array", number: "421", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/" },
        { id: "lc-212", name: "Word Search II", number: "212", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/word-search-ii/" },
        { id: "gfg-trie", name: "Trie: inserção e busca", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/trie-insert-and-search/" },
      ],
      references: [
        { title: "Trie", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Trie" },
        { title: "Radix tree: a trie compactada, quando a memória aperta", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Radix_tree" },
        { title: "Aho-Corasick: a trie com links de falha", source: "CP-Algorithms", url: "https://cp-algorithms.com/string/aho_corasick.html" },
        { title: "Longest prefix match: a trie dentro da tabela de roteamento", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Longest_prefix_match" },
      ],
    },
  },
  {
    tagline: "O cache que esquece exatamente o que ninguém usa.",
    glyph: "↻",
    requires: ["hash-table", "listas-ligadas"],
    topic: {
      slug: "lru-cache",
      name: "Cache LRU e LFU",
      group: "Caches",
      level: "Médio",
      status: "soon",
      description: "Tabela hash mais lista duplamente encadeada: get e put em O(1).",
    },
  },
  {
    tagline: "Trocar de servidor sem reembaralhar todas as chaves.",
    glyph: "◎",
    requires: ["hash-table"],
    topic: {
      slug: "consistent-hashing",
      name: "Consistent Hashing",
      group: "Sistemas distribuídos",
      level: "Difícil",
      status: "soon",
      description: "O anel de hash e os nós virtuais: sair de K/n chaves remapeadas em vez de todas.",
    },
  },
  {
    tagline: "Provar que um bloco não mudou sem baixar o resto.",
    glyph: "▣",
    requires: ["arvores-binarias", "hash-table"],
    topic: {
      slug: "merkle-tree",
      name: "Merkle Tree",
      group: "Sistemas distribuídos",
      level: "Médio",
      status: "soon",
      description: "Árvore de hashes: integridade verificável em O(log n) com a prova de inclusão.",
    },
  },
  {
    tagline: "Buscar por proximidade, não por igualdade.",
    glyph: "▦",
    requires: ["bst", "busca-binaria"],
    topic: {
      slug: "arvores-espaciais",
      name: "Árvores Espaciais",
      group: "Geometria e espaço",
      level: "Difícil",
      status: "soon",
      description: "Quadtree, KD-Tree e R-Tree: vizinho mais próximo e consulta por região.",
    },
  },
]
