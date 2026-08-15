import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "bloom-filter",
  name: "Bloom Filter",
  group: "Estruturas Probabilísticas",
  level: "Médio",
  status: "ready",
  isNew: true,
  readingTime: "14 min",
  language: "Python",
  description: "Um talvez sim, com certeza não, em alguns bits por elemento.",
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
    "O buraco: guardar o elemento para responder sim ou não",
    "A assimetria: o \"não\" é certeza, o \"sim\" é aposta",
    "A mecânica: m bits, k hashes, nenhum elemento guardado",
    "A implementação: um bitmap e dois hashes que viram k",
    "A matemática sem susto: três fórmulas e uma tabela",
    "O que o bloom filter não faz",
    "O porteiro: bloom filter na frente do que é caro",
    "A família: aleatorizar a estrutura ou aleatorizar a resposta",
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
};
