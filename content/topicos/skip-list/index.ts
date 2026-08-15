import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "skip-list",
  name: "Skip List",
  group: "Estruturas Probabilísticas",
  level: "Difícil",
  status: "ready",
  viz: "skip-list",
  youtube: "R9sVLuJ7FSg",
  videoMinutes: "1:58:55",
  article: "https://craftcodeclub.io/posts/dsa-skip-list",
  readingTime: "19 min",
  language: "Python",
  description: "Lista encadeada em níveis: busca probabilística eficiente.",
  tagline: "Lista encadeada em níveis: O(log n) no cara ou coroa.",
  glyph: "≡",
  requires: ["listas-ligadas", "busca-binaria", "big-o"],
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
    "O problema: três estruturas, três buracos",
    "A ideia: uma pista expressa por cima da lista",
    "A busca: começa no topo e desce em escada",
    "A moeda: a altura de cada nó é sorteada uma vez só",
    "Inserção e remoção: o rastro de candidatos",
    "O head: o sentinela que quase ninguém desenha",
    "De onde sai o log n, e por que ele é esperado e não garantido",
    "Skip List na vida real",
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
};
