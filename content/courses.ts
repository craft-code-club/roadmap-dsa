// ---------------------------------------------------------------------------
// Cursos e outras estruturas — o que existe FORA da trilha principal.
//
// O `content/roadmap.ts` é a trilha: uma sequência, do Big O aos grafos, que o
// aluno percorre na ordem. Nem tudo que vale a pena aprender cabe nela. A Skip
// List é o caso que abriu esta porta: ela vivia dentro do grupo "Listas
// Encadeadas" porque é feita de listas encadeadas, e a consequência era o aluno
// de terceira semana encontrar uma estrutura probabilística difícil no meio de
// um grupo de fundamentos. Ela não é o próximo passo depois de lista encadeada;
// ela é outro assunto, que usa lista encadeada.
//
// Este arquivo é a casa desse "outro assunto". São duas formas, e a diferença
// entre elas é o tamanho do assunto, não a importância:
//
//   AVULSO  uma estrutura que se basta numa página só. Vive em `/topico/<slug>/`,
//           exatamente como os tópicos da trilha, e é servida sem barra lateral:
//           a página é o assunto inteiro, e uma trilha ao lado dela seria uma
//           trilha para lugar nenhum.
//
//   CURSO   uma FAMÍLIA que precisa de várias páginas em ordem. Ganha uma página
//           de abertura em `/cursos/<slug>/` e uma barra lateral própria, com os
//           tópicos daquele curso e o caminho de volta. Os tópicos continuam em
//           `/topico/<slug>/`: um tópico é um tópico, e a URL dele não muda por
//           ele pertencer a um curso em vez de à trilha.
//
// A REGRA DE NAMESPACE, e por que ela é código e não convenção
// ------------------------------------------------------------
// Como todo tópico do site — trilha, curso ou avulso — mora em `/topico/<slug>/`,
// o slug é um identificador GLOBAL. Dois tópicos com o mesmo slug em trilhas
// diferentes não dão erro de compilação, não dão erro de build: o
// `generateStaticParams` emite a rota duas vezes, o Next gera uma página só, e o
// segundo tópico simplesmente não existe no site publicado. Silêncio total.
//
// Por isso a checagem abaixo (`conferirSlugsUnicos`) roda no IMPORT do módulo, e
// não num teste: ela derruba o `npm run build` com o slug repetido e os dois
// donos escritos na mensagem. Teste pega depois; import pega na hora, inclusive
// no `npm run dev`.
//
// A mesma regra vale para o id de grupo (`Group.id`), que é chave de React e
// âncora de URL, e para o slug de curso, que divide o namespace de `/cursos/`.
// ---------------------------------------------------------------------------

import { ALL_TOPICS, GROUPS, isEmptyTopic, type Group, type Level, type Topic } from "./roadmap";

/**
 * Um curso: um sub-roadmap com grupos e tópicos próprios.
 *
 * Reusa `Group` e `Topic` do roadmap principal de propósito. A trilha extra não
 * é um formato novo de conteúdo — é o MESMO conteúdo em outra ordem. Um tipo
 * paralelo significaria dois lugares para consertar quando o modelo de tópico
 * mudasse, e a página de tópico teria que saber de qual dos dois ela veio.
 */
export type Course = {
  /** Vira `/cursos/<slug>/`. */
  slug: string;
  name: string;
  /** A frase do card, no imperativo do que o curso entrega. Uma linha. */
  tagline: string;
  /** O parágrafo da abertura, e a `description` do SEO. */
  description: string;
  level: Level;
  /** Glifo do card. Só decoração — sempre `aria-hidden`. */
  glyph: string;
  groups: Group[];
  /** Slugs da trilha principal que convém ter antes. Vira a linha "Antes daqui". */
  requires?: string[];
};

/**
 * Uma página avulsa: um tópico só, que se basta.
 *
 * O tópico é um `Topic` normal e vive em `/topico/<slug>/`. O que este envelope
 * acrescenta é só o que o CARD precisa saber e o tópico não carrega: a frase de
 * chamada e o glifo.
 */
export type Standalone = {
  topic: Topic;
  tagline: string;
  glyph: string;
  /** Slugs da trilha principal que convém ter antes. */
  requires?: string[];
};

// ------------------------------- os cursos -------------------------------

export const COURSES: Course[] = [
  {
    slug: "estruturas-probabilisticas",
    name: "Estruturas Probabilísticas",
    tagline: "Respostas quase certas, por uma fração da memória.",
    description:
      "Quando o dado não cabe na memória, a saída é trocar exatidão por espaço — de um jeito medido, com a margem de erro escrita no contrato. Este curso percorre as estruturas que respondem “já vi isto?”, “quantos distintos?” e “uma amostra justa” usando alguns bits por elemento, e mostra onde cada uma mente e o quanto.",
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
  },
  {
    slug: "arvores-balanceadas",
    name: "Árvores Balanceadas",
    tagline: "A rotação que impede a BST de virar uma lista.",
    description:
      "Uma árvore de busca binária só entrega O(log n) enquanto ninguém insere em ordem crescente — e inserir em ordem crescente é o caso mais comum do mundo real. Este curso é sobre as estruturas que garantem altura logarítmica no pior caso, e sobre o preço que cada uma cobra por essa garantia: rotação, cor, sorteio ou grau.",
    level: "Difícil",
    glyph: "❖",
    requires: ["bst", "arvores-binarias", "tree-traversals"],
    groups: [
      {
        id: "bal-rotacao",
        name: "Balanceamento por rotação",
        topics: [
          { slug: "avl", name: "Árvore AVL", group: "Árvores Balanceadas", level: "Difícil", status: "soon", description: "O fator de balanceamento e as quatro rotações que o restauram." },
          { slug: "rubro-negra", name: "Árvore Rubro-Negra", group: "Árvores Balanceadas", level: "Difícil", status: "soon", description: "Cinco invariantes de cor, e por que ela venceu a AVL nas bibliotecas padrão." },
          { slug: "splay-tree", name: "Splay Tree", group: "Árvores Balanceadas", level: "Difícil", status: "soon", description: "Sem invariante nenhuma: quem você acessa sobe para a raiz." },
        ],
      },
      {
        id: "bal-aleatoria",
        name: "Balanceamento sem invariante",
        topics: [
          { slug: "treap", name: "Treap", group: "Árvores Balanceadas", level: "Difícil", status: "soon", description: "Uma BST na chave e um heap numa prioridade sorteada, ao mesmo tempo." },
        ],
      },
      {
        id: "bal-grau",
        name: "Árvores de muitos filhos",
        topics: [
          { slug: "b-tree", name: "B-Tree e B+Tree", group: "Árvores Balanceadas", level: "Difícil", status: "soon", description: "A árvore desenhada para o disco: nó do tamanho da página, altura três." },
        ],
      },
    ],
  },
  {
    slug: "consultas-em-intervalos",
    name: "Consultas em Intervalos",
    tagline: "Somar, minimizar e atualizar faixas em O(log n).",
    description:
      "O Prefix Sum responde “a soma de i até j” em O(1), com uma condição: o array não pode mudar. Uma única escrita no meio invalida o prefixo inteiro e custa O(n) para refazer. Este curso é sobre as estruturas que aceitam consulta e atualização intercaladas, as duas em tempo logarítmico.",
    level: "Difícil",
    glyph: "▤",
    requires: ["prefix-sum", "arvores-binarias", "binary-numbers"],
    groups: [
      {
        id: "faixas-arvore",
        name: "Árvores de intervalo",
        topics: [
          { slug: "segment-tree", name: "Segment Tree", group: "Consultas em Intervalos", level: "Difícil", status: "soon", description: "Cada nó guarda a resposta de uma faixa; a consulta cobre a sua com O(log n) nós." },
          { slug: "lazy-propagation", name: "Lazy Propagation", group: "Consultas em Intervalos", level: "Difícil", status: "soon", description: "Atualizar uma faixa inteira sem descer até as folhas: a marca que espera." },
        ],
      },
      {
        id: "faixas-bits",
        name: "Índices por bits",
        topics: [
          { slug: "fenwick-tree", name: "Fenwick Tree (BIT)", group: "Consultas em Intervalos", level: "Difícil", status: "soon", description: "A mesma resposta da segment tree em metade do código, com i & -i." },
        ],
      },
      {
        id: "faixas-estatico",
        name: "Pré-processar o que não muda",
        topics: [
          { slug: "sparse-table", name: "Sparse Table", group: "Consultas em Intervalos", level: "Difícil", status: "soon", description: "Mínimo de qualquer faixa em O(1), desde que o array nunca mude." },
        ],
      },
    ],
  },
  {
    slug: "padroes-em-strings",
    name: "Casamento de Padrões em Strings",
    tagline: "Achar a agulha no texto sem nunca voltar atrás.",
    description:
      "A busca ingênua compara o padrão com o texto, erra no último caractere, e recomeça uma casa adiante — jogando fora tudo o que tinha acabado de descobrir. Este curso é sobre os algoritmos que não jogam nada fora: eles usam o que já casou para saber exatamente para onde pular.",
    level: "Difícil",
    glyph: "✱",
    requires: ["strings", "trie", "hash-table"],
    groups: [
      {
        id: "padroes-um",
        name: "Um padrão, um texto",
        topics: [
          { slug: "kmp", name: "KMP", group: "Casamento de Padrões em Strings", level: "Difícil", status: "soon", description: "A tabela de prefixo-sufixo que diz para onde voltar sem reler o texto." },
          { slug: "funcao-z", name: "Função Z", group: "Casamento de Padrões em Strings", level: "Difícil", status: "soon", description: "O mesmo poder do KMP com metade dos casos de borda." },
          { slug: "rabin-karp", name: "Rabin-Karp", group: "Casamento de Padrões em Strings", level: "Médio", status: "soon", description: "Hash rolante: comparar números em vez de caracteres, e conferir só no empate." },
        ],
      },
      {
        id: "padroes-muitos",
        name: "Muitos padrões de uma vez",
        topics: [
          { slug: "aho-corasick", name: "Aho-Corasick", group: "Casamento de Padrões em Strings", level: "Difícil", status: "soon", description: "Uma trie com links de falha: mil padrões numa passada só pelo texto." },
        ],
      },
      {
        id: "padroes-indice",
        name: "Indexar o texto",
        topics: [
          { slug: "suffix-array", name: "Suffix Array", group: "Casamento de Padrões em Strings", level: "Difícil", status: "soon", description: "Ordenar todos os sufixos uma vez e responder qualquer padrão em O(m log n)." },
        ],
      },
    ],
  },
  {
    slug: "grafos-avancados",
    name: "Grafos Avançados",
    tagline: "Depois do Dijkstra: componentes, pontes e fluxo.",
    description:
      "A trilha principal cobre percorrer o grafo e achar o caminho mais curto. Este curso é o que vem depois: descobrir a estrutura escondida dentro dele — que pedaços são indivisíveis, que arestas são únicas, quanta coisa cabe passando ao mesmo tempo — e reconhecer os problemas que só viram fáceis quando você os desenha como grafo.",
    level: "Difícil",
    glyph: "◉",
    requires: ["dfs-bfs", "dijkstra", "topological-sort", "union-find"],
    groups: [
      {
        id: "grafos-av-estrutura",
        name: "A estrutura escondida",
        topics: [
          { slug: "componentes-fortemente-conexos", name: "Componentes Fortemente Conexos", group: "Grafos Avançados", level: "Difícil", status: "soon", description: "Tarjan e Kosaraju: os pedaços do grafo dirigido em que todo mundo alcança todo mundo." },
          { slug: "pontes-e-articulacoes", name: "Pontes e Articulações", group: "Grafos Avançados", level: "Difícil", status: "soon", description: "Que aresta, se cair, parte a rede em duas. E que vértice faz o mesmo." },
          { slug: "lca", name: "Ancestral Comum Mais Próximo (LCA)", group: "Grafos Avançados", level: "Difícil", status: "soon", description: "Binary lifting: subir 2^k passos de uma vez para responder em O(log n)." },
        ],
      },
      {
        id: "grafos-av-fluxo",
        name: "Fluxo e emparelhamento",
        topics: [
          { slug: "fluxo-maximo", name: "Fluxo Máximo", group: "Grafos Avançados", level: "Difícil", status: "soon", description: "Ford-Fulkerson, Edmonds-Karp e Dinic, e o corte mínimo que sai de graça." },
          { slug: "emparelhamento-bipartido", name: "Emparelhamento Bipartido", group: "Grafos Avançados", level: "Difícil", status: "soon", description: "Casar dois conjuntos ao máximo, que é fluxo máximo com capacidade 1." },
        ],
      },
      {
        id: "grafos-av-logica",
        name: "Grafos como lógica",
        topics: [
          { slug: "dois-sat", name: "2-SAT", group: "Grafos Avançados", level: "Difícil", status: "soon", description: "Resolver um sistema de implicações achando componentes fortemente conexos." },
        ],
      },
    ],
  },
];

// ----------------------------- as avulsas --------------------------------

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
      // clicar, e é isso que o curso vizinho continua.
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
];

// ------------------------------- derivados -------------------------------

/** Tópicos que pertencem a um curso, na ordem em que o curso os apresenta. */
export const COURSE_TOPICS: Topic[] = COURSES.flatMap((c) => c.groups.flatMap((g) => g.topics));

/** Tópicos que se bastam sozinhos. */
export const STANDALONE_TOPICS: Topic[] = STANDALONES.map((s) => s.topic);

/** Tudo que existe fora da trilha principal. */
export const EXTRA_TOPICS: Topic[] = [...COURSE_TOPICS, ...STANDALONE_TOPICS];

/**
 * TODO tópico do site que tem uma página em `/topico/<slug>/`.
 *
 * É esta lista — e não `ALL_TOPICS` — que o `generateStaticParams`, o sitemap e
 * o guarda de datas precisam. `ALL_TOPICS` continua sendo a TRILHA: é ele que
 * conta o progresso, desenha a barra lateral e alimenta os números da home, e
 * nenhuma dessas três coisas deve crescer porque um curso ganhou um tópico.
 */
export const SITE_TOPICS: Topic[] = [...ALL_TOPICS, ...EXTRA_TOPICS];

/**
 * Um curso tem material quando pelo menos um tópico dele tem.
 *
 * Deriva de `isEmptyTopic`, a mesma função que decide o selo "em breve" no menu
 * e o `noindex` da página de tópico. Curso em que todo tópico está vazio é uma
 * página de abertura sem nada para abrir: ela continua no site (ela mapeia o
 * território, e isso vale para quem estuda), mas fica fora do índice do Google e
 * fora do sitemap, exatamente como os 11 tópicos vazios da trilha.
 */
export function courseHasMaterial(c: Course): boolean {
  return c.groups.some((g) => g.topics.some((t) => !isEmptyTopic(t)));
}

/** Os tópicos de um curso, achatados na ordem de leitura. */
export function courseTopics(c: Course): Topic[] {
  return c.groups.flatMap((g) => g.topics);
}

export function getCourse(slug: string): Course | undefined {
  return COURSES.find((c) => c.slug === slug);
}

/** Qualquer tópico do site, venha ele da trilha, de um curso ou de uma avulsa. */
export function getSiteTopic(slug: string): Topic | undefined {
  return SITE_TOPICS.find((t) => t.slug === slug);
}

/**
 * Onde o tópico mora — a pergunta que decide a casca da página.
 *
 * A página de tópico e o `Shell` fazem a MESMA pergunta e precisam da mesma
 * resposta: uma calcula o rastro de navegação e os vizinhos, o outro decide se
 * desenha barra lateral e qual. Duas versões desta função é o começo de uma
 * página de curso com o menu da trilha principal ao lado.
 */
export type Placement =
  | { trilha: "roadmap" }
  | { trilha: "curso"; course: Course }
  | { trilha: "avulso"; standalone: Standalone };

export function getPlacement(slug: string): Placement | undefined {
  const curso = COURSES.find((c) => c.groups.some((g) => g.topics.some((t) => t.slug === slug)));
  if (curso) return { trilha: "curso", course: curso };
  const avulso = STANDALONES.find((s) => s.topic.slug === slug);
  if (avulso) return { trilha: "avulso", standalone: avulso };
  return ALL_TOPICS.some((t) => t.slug === slug) ? { trilha: "roadmap" } : undefined;
}

/** Anterior e próximo DENTRO do curso. A trilha principal tem o seu, no roadmap. */
export function getCourseNeighbors(c: Course, slug: string): { previous?: Topic; next?: Topic } {
  const lista = courseTopics(c);
  const i = lista.findIndex((t) => t.slug === slug);
  if (i < 0) return {};
  return { previous: lista[i - 1], next: lista[i + 1] };
}

// --------------------------- os cards da vitrine ---------------------------

/**
 * Um card da seção "Cursos e outras estruturas".
 *
 * Curso e avulsa viram o MESMO tipo aqui de propósito: a vitrine é uma grade só,
 * e o que muda entre os dois é uma etiqueta e o destino do clique. Duas grades
 * lado a lado obrigariam o aluno a entender a diferença entre curso e avulsa
 * ANTES de olhar o que tem em cada um, que é a ordem errada.
 */
export type ExtraCard = {
  kind: "curso" | "avulso";
  /** Slug do curso, ou do tópico avulso. Único dentro da vitrine. */
  slug: string;
  href: string;
  name: string;
  tagline: string;
  level: Level;
  glyph: string;
  /** Quantos tópicos o curso tem. `1` para avulsa — ela é a própria página. */
  topics: number;
  /** Quantos já têm material para abrir hoje. */
  ready: number;
  /**
   * Os slugs dos tópicos que o card representa.
   *
   * É o que o card precisa para contar o progresso do leitor, e ele tem que vir
   * daqui: o progresso é do TÓPICO, e o componente do card só conhece o card.
   */
  topicSlugs: string[];
};

function cardDoCurso(c: Course): ExtraCard {
  const lista = courseTopics(c);
  return {
    kind: "curso",
    slug: c.slug,
    href: `/cursos/${c.slug}/`,
    name: c.name,
    tagline: c.tagline,
    level: c.level,
    glyph: c.glyph,
    topics: lista.length,
    ready: lista.filter((t) => !isEmptyTopic(t)).length,
    topicSlugs: lista.map((t) => t.slug),
  };
}

function cardDaAvulsa(s: Standalone): ExtraCard {
  return {
    kind: "avulso",
    slug: s.topic.slug,
    href: `/topico/${s.topic.slug}/`,
    name: s.topic.name,
    tagline: s.tagline,
    level: s.topic.level,
    glyph: s.glyph,
    topics: 1,
    ready: isEmptyTopic(s.topic) ? 0 : 1,
    topicSlugs: [s.topic.slug],
  };
}

/**
 * A vitrine, ordenada por "dá para estudar hoje?".
 *
 * A ordem é DERIVADA, e não uma lista à mão, porque ela precisa envelhecer
 * sozinha: no dia em que o primeiro tópico de "Árvores Balanceadas" for
 * publicado, o card sobe para junto dos que já têm material sem ninguém ter que
 * lembrar de reordenar nada aqui. Dentro de cada metade vale a ordem de
 * declaração, que é temática — `sort` de array em JavaScript é estável desde o
 * ES2019, então empate mantém a ordem de entrada.
 */
export const EXTRA_CARDS: ExtraCard[] = [
  ...STANDALONES.map(cardDaAvulsa),
  ...COURSES.map(cardDoCurso),
].sort((a, b) => Number(b.ready > 0) - Number(a.ready > 0));

export const TOTAL_EXTRA_CARDS = EXTRA_CARDS.length;
export const TOTAL_EXTRA_TOPICS = EXTRA_TOPICS.length;
export const TOTAL_EXTRA_TOPICS_PRONTOS = EXTRA_TOPICS.filter((t) => !isEmptyTopic(t)).length;

// ----------------------------- o guarda -----------------------------------

function conferirUnicos(rotulo: string, pares: [chave: string, dono: string][]) {
  const visto = new Map<string, string>();
  for (const [chave, dono] of pares) {
    const antes = visto.get(chave);
    if (antes) {
      throw new Error(
        `${rotulo} repetido: "${chave}" aparece em ${antes} e em ${dono}. ` +
          `O site publica uma página só por chave, então a segunda sumiria em silêncio. ` +
          `Renomeie uma das duas.`
      );
    }
    visto.set(chave, dono);
  }
}

/**
 * Roda no import, e reprova o build.
 *
 * Sem isto, um slug repetido entre a trilha e um curso não acusa em lugar
 * nenhum: `generateStaticParams` devolve o slug duas vezes, o Next gera uma
 * página só, e o tópico perdedor deixa de existir no site publicado sem uma
 * linha de aviso. O mesmo vale para o id de grupo, que é chave de React e
 * âncora de `/roadmap/#<id>`, e para o slug de curso, que divide `/cursos/`.
 */
function conferirNamespaces() {
  conferirUnicos("slug de tópico", [
    ...ALL_TOPICS.map((t): [string, string] => [t.slug, "a trilha principal"]),
    ...COURSES.flatMap((c) =>
      c.groups.flatMap((g) => g.topics.map((t): [string, string] => [t.slug, `o curso "${c.name}"`]))
    ),
    ...STANDALONES.map((s): [string, string] => [s.topic.slug, "as páginas avulsas"]),
  ]);

  conferirUnicos("id de grupo", [
    ...GROUPS.map((g): [string, string] => [g.id, "a trilha principal"]),
    ...COURSES.flatMap((c) => c.groups.map((g): [string, string] => [g.id, `o curso "${c.name}"`])),
  ]);

  conferirUnicos("slug de curso", COURSES.map((c): [string, string] => [c.slug, "os cursos"]));

  // Um curso não pode ter o mesmo slug de um tópico: os dois convivem, em
  // `/cursos/x/` e `/topico/x/`, mas o leitor não tem como saber qual é qual, e
  // o rastro de navegação passaria a ter dois nós com o mesmo nome.
  const slugsDeTopico = new Set(SITE_TOPICS.map((t) => t.slug));
  for (const c of COURSES) {
    if (slugsDeTopico.has(c.slug)) {
      throw new Error(
        `slug "${c.slug}" é de curso E de tópico ao mesmo tempo. ` +
          `As duas rotas existiriam (/cursos/${c.slug}/ e /topico/${c.slug}/) e ninguém saberia qual é qual.`
      );
    }
  }

  // Pré-requisito é link para a trilha principal. Um slug errado aqui vira um
  // link para 404 numa página que o build gera sem reclamar.
  const daTrilha = new Set(ALL_TOPICS.map((t) => t.slug));
  const extras = new Set(EXTRA_TOPICS.map((t) => t.slug));
  for (const [dono, reqs] of [
    ...COURSES.map((c): [string, string[] | undefined] => [`o curso "${c.name}"`, c.requires]),
    ...STANDALONES.map((s): [string, string[] | undefined] => [`a avulsa "${s.topic.name}"`, s.requires]),
  ]) {
    for (const slug of reqs ?? []) {
      if (!daTrilha.has(slug) && !extras.has(slug)) {
        throw new Error(`${dono} pede o pré-requisito "${slug}", que não é tópico de lugar nenhum.`);
      }
    }
  }
}

conferirNamespaces();
