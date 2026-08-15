import type { Roadmap } from "./index";

// Aleatorizar a RESPOSTA para caber na memória. A Skip List, que aleatoriza a
// ESTRUTURA, é vizinha de família e mora como tópico avulso.
//
// Um arquivo por roadmap: eles crescem para dezenas de tópicos cada, e num
// arquivo só a revisão de um PR que mexe em dois vira um diff ilegível.
// Registre o novo em `content/roadmaps/index.ts` — o teste
// `todo arquivo de roadmap está registrado no índice` reprova se esquecer.
export const roadmap: Roadmap = {
  slug: "estruturas-probabilisticas",
  name: "Estruturas Probabilísticas",
  tagline: "Respostas quase certas, por uma fração da memória.",
  description:
    "Quando o dado não cabe na memória, a saída é trocar exatidão por espaço, de um jeito medido, com a margem de erro escrita no contrato. Esta trilha percorre as estruturas que respondem “já vi isto?”, “quantos distintos?” e “uma amostra justa” usando alguns bits por elemento, e mostra onde cada uma mente e o quanto.",
  level: "Médio",
  glyph: "◐",
  requires: ["hash-table", "big-o"],
  groups: [
    {
      id: "prob-pertinencia",
      name: "Pertinência e contagem",
      topics: [
        {
          slug: "bloom-filter",
          name: "Bloom Filter",
          group: "Estruturas Probabilísticas",
          level: "Médio",
          status: "ready",
          readingTime: "14 min",
          language: "Python",
          isNew: true,
          description: "Um talvez sim, com certeza não, em alguns bits por elemento.",
          problems: [
            { id: "lc-705", name: "Design HashSet", number: "705", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/design-hashset/" },
            { id: "lc-217", name: "Contains Duplicate", number: "217", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/contains-duplicate/" },
            { id: "lc-2352", name: "Equal Row and Column Pairs", number: "2352", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/equal-row-and-column-pairs/" },
            { id: "lc-1044", name: "Longest Duplicate Substring", number: "1044", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/longest-duplicate-substring/" },
            { id: "gfg-bloom-filter", name: "Bloom Filters: introdução e implementação", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/bloom-filters-introduction-and-python-implementation/" },
          ],
          references: [
            { title: "Space/Time Trade-offs in Hash Coding with Allowable Errors (o artigo original)", source: "Burton H. Bloom, CACM 1970", url: "https://dl.acm.org/doi/10.1145/362686.362692" },
            { title: "Network Applications of Bloom Filters: A Survey", source: "Broder e Mitzenmacher", url: "https://www.eecs.harvard.edu/~michaelm/postscripts/im2005b.pdf" },
            { title: "Calculadora de bloom filter: m, k e a taxa de erro", source: "hur.st", url: "https://hur.st/bloomfilter/" },
            { title: "Bloom filter: o tipo probabilístico do Redis", source: "Redis Docs", url: "https://redis.io/docs/latest/develop/data-types/probabilistic/bloom-filter/" },
            { title: "RocksDB Bloom Filter: o filtro que evita a leitura de disco", source: "RocksDB Wiki", url: "https://github.com/facebook/rocksdb/wiki/RocksDB-Bloom-Filter" },
          ],
        },
        {
          slug: "count-min-sketch",
          name: "Count-Min Sketch",
          group: "Estruturas Probabilísticas",
          level: "Difícil",
          status: "soon",
          description: "Frequência aproximada de bilhões de chaves numa matriz pequena.",
        },
        {
          slug: "hyperloglog",
          name: "HyperLogLog",
          group: "Estruturas Probabilísticas",
          level: "Difícil",
          status: "soon",
          description: "Contar distintos com 12 KB, errando 2%, sem guardar chave nenhuma.",
        },
      ],
    },
    {
      id: "prob-amostragem",
      name: "Amostragem em fluxo",
      topics: [
        {
          slug: "reservoir-sampling",
          name: "Reservoir Sampling",
          group: "Estruturas Probabilísticas",
          level: "Médio",
          status: "soon",
          description: "Sortear k itens de um fluxo de tamanho desconhecido, em uma passada.",
        },
      ],
    },
  ],
};
