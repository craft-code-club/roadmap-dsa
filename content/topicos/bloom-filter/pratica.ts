import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-705", name: "Design HashSet", number: "705", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/design-hashset/" },
    { id: "lc-217", name: "Contains Duplicate", number: "217", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/contains-duplicate/" },
    { id: "lc-2352", name: "Equal Row and Column Pairs", number: "2352", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/equal-row-and-column-pairs/" },
    { id: "lc-1044", name: "Longest Duplicate Substring", number: "1044", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/longest-duplicate-substring/" },
    { id: "gfg-bloom-filter", name: "Bloom Filters: introdução e implementação", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/bloom-filters-introduction-and-python-implementation/" },
];

export const references: Reference[] = [
    { title: "Space/Time Trade-offs in Hash Coding with Allowable Errors (o artigo original)", source: "Burton H. Bloom, CACM 1970", url: "https://dl.acm.org/doi/10.1145/362686.362692" },
    { title: "Network Applications of Bloom Filters: A Survey", source: "Broder e Mitzenmacher", url: "https://www.eecs.harvard.edu/~michaelm/postscripts/im2005b.pdf" },
    { title: "Calculadora de bloom filter: m, k e a taxa de erro", source: "hur.st", url: "https://hur.st/bloomfilter/" },
    { title: "Bloom filter: o tipo probabilístico do Redis", source: "Redis Docs", url: "https://redis.io/docs/latest/develop/data-types/probabilistic/bloom-filter/" },
    { title: "RocksDB Bloom Filter: o filtro que evita a leitura de disco", source: "RocksDB Wiki", url: "https://github.com/facebook/rocksdb/wiki/RocksDB-Bloom-Filter" },
];
