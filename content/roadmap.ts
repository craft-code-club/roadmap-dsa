// ---------------------------------------------------------------------------
// Roadmap DSA, modelo de conteúdo.
//
// Convenção: os NOMES DOS CAMPOS são em inglês; os VALORES exibidos ficam em
// português (o idioma do site), com exceção de termos técnicos consagrados em
// inglês (ex.: "Two Pointers", "Sliding Window", "Greedy Algorithms").
//
// Fonte: o roadmap oficial da comunidade Craft & Code Club, reagrupado no estilo
// do LeetCode: cada estrutura junto das técnicas que operam sobre ela; os
// paradigmas transversais como grupos próprios. Tópicos sem tratamento completo
// ficam com status "soon" (mas mostram vídeo/artigo, nunca ficam vazios).
// ---------------------------------------------------------------------------

export type Level = "Fácil" | "Médio" | "Difícil";
export type Source = "LeetCode" | "GeeksforGeeks";

export type Problem = {
  id: string; // estável, usado como chave no localStorage
  name: string;
  number?: string; // ex.: "209"
  source: Source;
  level: Level | "Guia";
  url: string;
};

export type Visualizer = "sliding-window-fixed" | "sliding-window-dynamic" | "two-pointers" | "big-o" | "sub-types";

// Vídeos extras de um tópico: aparecem como links clicáveis (não embed).
export type VideoLink = { title: string; youtube?: string; url?: string; duration?: string };

// Referências / "leia mais": links para artigos (do blog ou de qualquer site).
export type Reference = { title: string; url: string; source?: string };

export type Topic = {
  slug: string;
  name: string;
  group: string;
  level: Level;
  description: string;
  status: "ready" | "soon";
  youtube?: string; // id do vídeo
  videoMinutes?: string;
  article?: string; // url do artigo/aula no blog
  repo?: string; // implementação de referência
  viz?: Visualizer;
  // Alguns tópicos não pedem visualizador (são conceituais, ou o passo a passo
  // não acrescenta nada). Marque `noViz: true` para não prometer um que não vem:
  // a página deixa de exibir o aviso de "visualização em construção".
  noViz?: boolean;
  problems?: Problem[];
  readingTime?: string;
  language?: string;
  extraVideos?: VideoLink[];
  references?: Reference[];
};

export type Group = {
  id: string;
  name: string;
  topics: Topic[];
  // Página de abertura do grupo (ex.: Introdução), aparece como primeiro item.
  intro?: { name: string; href: string; description: string };
};

const yt = (id: string) => id;

export const GROUPS: Group[] = [
  {
    id: "introducao",
    name: "Introdução",
    intro: { name: "Introdução", href: "/introducao", description: "Como o guia funciona e por onde começar." },
    topics: [
      {
        slug: "big-o",
        name: "Notação Big O",
        group: "Introdução",
        level: "Fácil",
        status: "ready",
        viz: "big-o",
        youtube: yt("MtLv9Rwb55Q"),
        videoMinutes: "1:38:08",
        readingTime: "10 min",
        language: "Python",
        description: "Como medir tempo e espaço de um algoritmo sem cronômetro.",
        problems: [
          { id: "lc-704", name: "Binary Search", number: "704", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/binary-search/" },
          { id: "lc-217", name: "Contains Duplicate", number: "217", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/contains-duplicate/" },
          { id: "lc-121", name: "Best Time to Buy and Sell Stock", number: "121", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/" },
          { id: "lc-1", name: "Two Sum", number: "1", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/two-sum/" },
          { id: "lc-509", name: "Fibonacci Number", number: "509", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/fibonacci-number/" },
          { id: "gfg-complexidade", name: "Practice Questions on Time Complexity Analysis", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/practice-questions-time-complexity-analysis/" },
        ],
        references: [
          { title: "Big O Notation", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/analysis-algorithms-big-o-analysis/" },
          { title: "Analysis of Algorithms: Asymptotic Analysis", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/analysis-of-algorithms-set-1-asymptotic-analysis/" },
          { title: "Big-O Cheat Sheet: complexidade das estruturas de dados", source: "bigocheatsheet.com", url: "https://www.bigocheatsheet.com/" },
          { title: "Time and Space Complexity: cartão do LeetCode Explore", source: "LeetCode", url: "https://leetcode.com/explore/learn/card/recursion-i/256/complexity-analysis/" },
        ],
      },
    ],
  },
  {
    id: "arrays-strings",
    name: "Arrays e Strings",
    topics: [
      { slug: "arrays", name: "Arrays e Listas", group: "Arrays e Strings", level: "Fácil", status: "soon", youtube: yt("c95xvXCU34A"), description: "A estrutura sequencial base: acesso por índice em O(1)." },
      { slug: "strings", name: "Strings", group: "Arrays e Strings", level: "Fácil", status: "soon", youtube: yt("B9CCEwjoXBk"), description: "Manipulação e processamento de texto e caracteres.", extraVideos: [{ title: "LeetCode 1704: Determine if String Halves Are Alike", youtube: "qtPcJclLlmI" }] },
      {
        slug: "subarray-substring-subsequence-subset",
        name: "Os 4 \"sub\"",
        group: "Arrays e Strings",
        level: "Fácil",
        status: "ready",
        viz: "sub-types",
        readingTime: "9 min",
        language: "Python",
        // O nome é curto de propósito (cabe em uma linha no menu), então os quatro
        // termos vivem aqui: é esta descrição que vira a meta description da página.
        description: "Subarray, substring, subsequence e subset: quatro palavras parecidas que levam a algoritmos diferentes. Duas perguntas separam todas: os elementos precisam ser contíguos? A ordem importa?",
        problems: [
          { id: "lc-53", name: "Maximum Subarray", number: "53", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/maximum-subarray/" },
          { id: "lc-560", name: "Subarray Sum Equals K", number: "560", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/subarray-sum-equals-k/" },
          { id: "lc-3", name: "Longest Substring Without Repeating Characters", number: "3", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/" },
          { id: "lc-5", name: "Longest Palindromic Substring", number: "5", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-palindromic-substring/" },
          { id: "lc-300", name: "Longest Increasing Subsequence", number: "300", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-increasing-subsequence/" },
          { id: "lc-1143", name: "Longest Common Subsequence", number: "1143", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-common-subsequence/" },
          { id: "lc-78", name: "Subsets (Power Set)", number: "78", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/subsets/" },
          { id: "lc-416", name: "Partition Equal Subset Sum", number: "416", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/partition-equal-subset-sum/" },
          { id: "gfg-sub-vs", name: "Subarray/Substring vs Subsequence", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/subarraysubstring-vs-subsequence-and-programs-to-generate-them/" },
        ],
        references: [
          { title: "Subarray/Substring vs Subsequence e como gerar cada um", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/subarraysubstring-vs-subsequence-and-programs-to-generate-them/" },
          { title: "Power Set: os 2ⁿ subconjuntos", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/power-set/" },
          { title: "Longest Common Substring (DP): o grid que zera na quebra", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/longest-common-substring-dp-29/" },
          { title: "Longest Common Subsequence (DP): o mesmo grid, outro else", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/longest-common-subsequence-dp-4/" },
        ],
      },
      {
        slug: "two-pointers",
        name: "Two Pointers",
        group: "Arrays e Strings",
        level: "Fácil",
        status: "ready",
        viz: "two-pointers",
        youtube: yt("a1QMdXgcQwY"),
        videoMinutes: "16:40",
        readingTime: "8 min",
        language: "Python",
        description: "Dois índices caminhando na mesma passada. Em array ordenado, um começa na ponta esquerda e o outro na direita, e eles convergem.",
        problems: [
          { id: "lc-167", name: "Two Sum II - Input Array Is Sorted", number: "167", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/" },
          { id: "lc-125", name: "Valid Palindrome", number: "125", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/valid-palindrome/" },
          { id: "lc-11", name: "Container With Most Water", number: "11", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/container-with-most-water/" },
          { id: "lc-15", name: "3Sum", number: "15", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/3sum/" },
          { id: "lc-26", name: "Remove Duplicates from Sorted Array", number: "26", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/remove-duplicates-from-sorted-array/" },
        ],
        references: [
          { title: "Two Pointers Technique", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/two-pointers-technique/" },
          { title: "Two Pointers: capítulo do LeetCode Explore", source: "LeetCode", url: "https://leetcode.com/explore/learn/card/fun-with-arrays/527/searching-for-items-in-an-array/" },
        ],
      },
      {
        slug: "sliding-window-fixed",
        name: "Sliding Window (Fixed)",
        group: "Arrays e Strings",
        level: "Médio",
        status: "ready",
        viz: "sliding-window-fixed",
        youtube: yt("OvIJw1AMNzI"),
        videoMinutes: "18:24",
        readingTime: "9 min",
        language: "Python",
        description: "Tamanho travado em k: entra um elemento pela direita, sai um pela esquerda. O(n) sem refazer conta.",
        problems: [
          { id: "lc-643", name: "Maximum Average Subarray I", number: "643", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/maximum-average-subarray-i/" },
          { id: "lc-1343", name: "Sub-arrays of Size K with Average ≥ Threshold", number: "1343", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold/" },
          { id: "lc-1456", name: "Maximum Number of Vowels in a Substring of Given Length", number: "1456", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/maximum-number-of-vowels-in-a-substring-of-given-length/" },
          { id: "lc-567", name: "Permutation in String", number: "567", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/permutation-in-string/" },
          { id: "lc-239", name: "Sliding Window Maximum", number: "239", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/sliding-window-maximum/" },
          { id: "gfg-sliding", name: "Window Sliding Technique", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/window-sliding-technique/" },
        ],
      },
      {
        slug: "sliding-window-dynamic",
        name: "Sliding Window (Dynamic)",
        group: "Arrays e Strings",
        level: "Médio",
        status: "ready",
        viz: "sliding-window-dynamic",
        youtube: yt("OvIJw1AMNzI"),
        videoMinutes: "18:24",
        readingTime: "11 min",
        language: "Python",
        description: "A direita sempre avança; a esquerda encolhe só enquanto a janela é inválida. Resolve 'maior substring sem repetir' e 'menor subarray com soma ≥ alvo'.",
        problems: [
          { id: "lc-3", name: "Longest Substring Without Repeating Characters", number: "3", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/" },
          { id: "lc-209", name: "Minimum Size Subarray Sum", number: "209", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/minimum-size-subarray-sum/" },
          { id: "lc-1004", name: "Max Consecutive Ones III", number: "1004", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/max-consecutive-ones-iii/" },
          { id: "lc-713", name: "Subarray Product Less Than K", number: "713", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/subarray-product-less-than-k/" },
          { id: "lc-76", name: "Minimum Window Substring", number: "76", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/minimum-window-substring/" },
        ],
      },
      { slug: "prefix-sum", name: "Prefix Sum", group: "Arrays e Strings", level: "Médio", status: "soon", youtube: yt("yMnLofkS7DM"), description: "Somas de intervalo em tempo constante depois de um pré-processamento." },
      { slug: "intervals", name: "Intervalos", group: "Arrays e Strings", level: "Médio", status: "soon", description: "Merge, insert e agendamento: ordenar por início e varrer os intervalos." },
    ],
  },
  {
    id: "hashing",
    name: "Hashing",
    topics: [
      { slug: "hash-table", name: "Tabelas Hash", group: "Hashing", level: "Médio", status: "soon", youtube: yt("JFhdCBrKTX0"), description: "Busca, inserção e remoção em O(1) amortizado, quase sempre. Contagem e frequência.", extraVideos: [{ title: "LeetCode 1347: Minimum Steps to Make Two Strings Anagram", youtube: "55OYGLEj0Dw" }] },
    ],
  },
  {
    id: "listas",
    name: "Listas Encadeadas",
    topics: [
      { slug: "listas-ligadas", name: "Listas Encadeadas", group: "Listas Encadeadas", level: "Fácil", status: "soon", youtube: yt("j0E5hJZ__EA"), description: "Nós apontando para nós. Ponteiro rápido e lento, sentinelas e detecção de ciclos." },
      { slug: "skip-list", name: "Skip List", group: "Listas Encadeadas", level: "Difícil", status: "soon", youtube: yt("R9sVLuJ7FSg"), article: "https://craftcodeclub.io/posts/dsa-skip-list", description: "Lista encadeada em níveis: busca probabilística eficiente." },
    ],
  },
  {
    id: "pilhas-filas",
    name: "Pilhas e Filas",
    topics: [
      { slug: "pilhas", name: "Pilhas (Stacks)", group: "Pilhas e Filas", level: "Fácil", status: "soon", youtube: yt("JRbrNgsYuT0"), description: "LIFO: parênteses balanceados e próximo maior elemento (pilha monotônica)." },
      { slug: "filas", name: "Filas e Deques", group: "Pilhas e Filas", level: "Fácil", status: "soon", youtube: yt("KJaVKLZsMcg"), description: "FIFO e a fila de duas pontas para a janela com máximo." },
    ],
  },
  {
    id: "recursao",
    name: "Recursão",
    topics: [
      { slug: "recursao", name: "Recursão: Fundamentos", group: "Recursão", level: "Médio", status: "soon", youtube: yt("KkSAaQHCkSE"), description: "Funções que chamam a si mesmas, sem medo do stack." },
      { slug: "recursao-funcional", name: "Recursão: Programação Funcional", group: "Recursão", level: "Médio", status: "soon", youtube: yt("rbEYjJdaIZI"), description: "Recursão de cauda e o estilo funcional." },
    ],
  },
  {
    id: "arvores",
    name: "Árvores",
    topics: [
      { slug: "tree-traversals", name: "Percursos em Árvore (DFS/BFS)", group: "Árvores", level: "Médio", status: "soon", youtube: yt("_-2F65OVWjo"), description: "Pré, in, pós-ordem e por nível." },
      { slug: "arvores-binarias", name: "Árvores Binárias", group: "Árvores", level: "Médio", status: "soon", youtube: yt("OAcm2rXqz9M"), description: "Recursão estrutural sobre dois filhos.", extraVideos: [{ title: "LeetCode 2385: Amount of Time for a Binary Tree to Be Infected", youtube: "jshM7d1P8IY" }] },
      { slug: "n-ary-trees", name: "Árvores N-árias", group: "Árvores", level: "Médio", status: "soon", youtube: yt("FLZxMQFTqvY"), description: "Nós com qualquer número de filhos." },
      { slug: "bst", name: "Árvore de Busca Binária", group: "Árvores", level: "Médio", status: "soon", youtube: yt("CITquySB4ls"), description: "Ordem invariante para busca em O(log n)." },
      { slug: "trie", name: "Trie (Árvore de Prefixos)", group: "Árvores", level: "Médio", status: "soon", description: "Árvore de prefixos para busca de strings, autocomplete e dicionários." },
    ],
  },
  {
    id: "grafos",
    name: "Grafos",
    topics: [
      { slug: "grafos-intro", name: "Introdução a Grafos", group: "Grafos", level: "Médio", status: "soon", youtube: yt("cILrU-dtuEc"), description: "Vértices, arestas e representação (matriz / lista de adjacência)." },
      { slug: "dfs-bfs", name: "DFS e BFS em Grafos", group: "Grafos", level: "Médio", status: "soon", youtube: yt("sCT-_EjbVqQ"), description: "Os dois jeitos de percorrer um grafo." },
      { slug: "dijkstra", name: "Dijkstra", group: "Grafos", level: "Difícil", status: "soon", youtube: yt("b4kWEWtCVzA"), article: "https://craftcodeclub.io/posts/dsa-dijkstra", description: "Caminho mais curto com pesos não-negativos." },
      { slug: "bellman-ford", name: "Bellman-Ford", group: "Grafos", level: "Difícil", status: "soon", youtube: yt("0GcXgQTpYcE"), article: "https://craftcodeclub.io/posts/dsa-bellman-ford", description: "Caminho mais curto que aceita pesos negativos." },
      { slug: "a-star", name: "A* (A Estrela)", group: "Grafos", level: "Difícil", status: "soon", youtube: yt("0PYx7erkdXo"), article: "https://craftcodeclub.io/posts/dsa-a-star", description: "Pathfinding guiado por heurística." },
      { slug: "floyd-warshall", name: "Floyd-Warshall (APSP)", group: "Grafos", level: "Difícil", status: "soon", description: "Menor caminho entre todos os pares de vértices, em O(V³)." },
      { slug: "topological-sort", name: "Ordenação Topológica", group: "Grafos", level: "Médio", status: "soon", youtube: yt("4fTjXqcMFtk"), article: "https://craftcodeclub.io/posts/dsa-topological-sorting", description: "Ordem linear de um DAG (Kahn e DFS)." },
      { slug: "mst", name: "Árvore Geradora Mínima (MST)", group: "Grafos", level: "Difícil", status: "soon", youtube: yt("a9iI9N4FLsg"), article: "https://craftcodeclub.io/posts/dsa-mst", description: "Conectar tudo com o menor custo: Kruskal e Prim." },
      { slug: "grafos-avancados", name: "Grafos Avançados", group: "Grafos", level: "Difícil", status: "soon", description: "Componentes fortemente conexos, pontes, pontos de articulação e union-find." },
    ],
  },
  {
    id: "heaps",
    name: "Heaps",
    topics: [
      { slug: "binary-heap", name: "Binary Heap", group: "Heaps", level: "Médio", status: "soon", youtube: yt("HVWw20nOLHk"), description: "A fila de prioridade por trás do heap sort e do Dijkstra." },
      { slug: "heap-sort", name: "Heap Sort", group: "Heaps", level: "Médio", status: "soon", youtube: yt("wUfOyKMjamM"), description: "Ordenar com um heap em O(n log n)." },
    ],
  },
  {
    id: "busca-binaria",
    name: "Busca Binária",
    topics: [
      { slug: "busca-binaria", name: "Busca Binária", group: "Busca Binária", level: "Médio", status: "soon", youtube: yt("62ZGcXDpbys"), description: "Corte o espaço de busca pela metade a cada passo: O(log n)." },
      { slug: "busca-binaria-avancada", name: "Busca Binária no Espaço de Respostas", group: "Busca Binária", level: "Difícil", status: "soon", description: "Binary search on answer: achar a fronteira de uma condição monotônica, não um valor." },
    ],
  },
  {
    id: "ordenacao",
    name: "Ordenação",
    topics: [
      { slug: "ordenacao-basica", name: "Ordenação Básica", group: "Ordenação", level: "Fácil", status: "soon", youtube: yt("GxhxsbbzaTI"), description: "Bubble, Selection e Insertion Sort, os O(n²) que ensinam a base." },
      { slug: "merge-sort", name: "Merge Sort", group: "Ordenação", level: "Médio", status: "soon", youtube: yt("lbktBOwmmhg"), description: "Divisão e conquista, estável, O(n log n)." },
      { slug: "quick-sort", name: "Quick Sort", group: "Ordenação", level: "Médio", status: "soon", youtube: yt("2T0Itw-oaEA"), description: "Particiona em torno de um pivô. O(n log n) na média." },
      { slug: "shell-sort", name: "Shell Sort", group: "Ordenação", level: "Médio", status: "soon", youtube: yt("symbT7Cgrr8"), description: "Insertion Sort turbinado com gap sequences." },
      { slug: "counting-sort", name: "Counting Sort", group: "Ordenação", level: "Médio", status: "soon", description: "Ordenação linear por contagem, sem comparações, para inteiros num intervalo." },
      { slug: "radix-sort", name: "Radix Sort", group: "Ordenação", level: "Médio", status: "soon", description: "Ordena dígito a dígito usando counting sort como base." },
      { slug: "bucket-sort", name: "Bucket Sort", group: "Ordenação", level: "Médio", status: "soon", description: "Distribui em baldes, ordena cada um e concatena." },
    ],
  },
  {
    id: "backtracking",
    name: "Backtracking",
    topics: [
      {
        slug: "backtracking",
        name: "Backtracking",
        group: "Backtracking",
        level: "Difícil",
        status: "soon",
        youtube: yt("Vcm6mhLKU5A"),
        article: "https://craftcodeclub.io/posts/dsa-backtracking",
        description: "Tentar, falhar e voltar atrás, busca exaustiva com poda.",
        extraVideos: [
          { title: "Desvendando Backtracking", youtube: "GavxeYye6sg" },
          { title: "Na prática: Sudoku (corte)", youtube: "ThOaYVhOmbc" },
          { title: "Na prática: Subconjuntos (corte)", youtube: "XosFW0k6f4s" },
          { title: "Na prática: Permutações (corte)", youtube: "h-u27COo_zg" },
          { title: "LeetCode 401: Binary Watch", youtube: "FOmERYScrOE" },
        ],
      },
    ],
  },
  {
    id: "dp",
    name: "Programação Dinâmica",
    topics: [
      {
        slug: "programacao-dinamica",
        name: "Programação Dinâmica",
        group: "Programação Dinâmica",
        level: "Difícil",
        status: "soon",
        description: "Memoização, tabulação e o desafio de enxergar o estado. 1D e multidimensional.",
        extraVideos: [
          { title: "LeetCode 198: House Robber", youtube: "3sNdSrUmMMU" },
          { title: "LeetCode 300: Longest Increasing Subsequence", youtube: "W16dkNqcgBU" },
          { title: "LeetCode 1531: String Compression II", youtube: "miGhslmrxeE" },
        ],
      },
    ],
  },
  {
    id: "greedy",
    name: "Greedy Algorithms",
    topics: [
      { slug: "greedy", name: "Greedy Algorithms", group: "Greedy Algorithms", level: "Médio", status: "soon", description: "Algoritmos gulosos: quando a escolha local ótima leva à global." },
    ],
  },
  {
    id: "bits",
    name: "Manipulação de Bits",
    topics: [
      { slug: "binary-numbers", name: "Números Binários", group: "Manipulação de Bits", level: "Fácil", status: "soon", youtube: yt("8VHi44rAVFo"), description: "O sistema binário e a conversão decimal ⇄ binário." },
      { slug: "negative-binary", name: "Binários Negativos", group: "Manipulação de Bits", level: "Médio", status: "soon", youtube: yt("93CpmUXLbzc"), description: "Sign-magnitude, complemento de um e de dois." },
      { slug: "operacoes-bitwise", name: "Operações Bitwise", group: "Manipulação de Bits", level: "Médio", status: "soon", description: "AND, OR, XOR, shifts e os truques de bit mais usados em entrevistas." },
    ],
  },
  {
    id: "matematica",
    name: "Matemática",
    topics: [
      { slug: "matematica", name: "Matemática", group: "Matemática", level: "Difícil", status: "soon", description: "GCD/LCM, números primos, exponenciação rápida e teoria dos números." },
    ],
  },
];

// ------------------------------ helpers ------------------------------

export const ALL_TOPICS: Topic[] = GROUPS.flatMap((g) => g.topics);

export const TOTAL_TOPICS = ALL_TOPICS.length;
export const TOTAL_VISUALIZERS = ALL_TOPICS.filter((t) => t.viz).length;
export const TOTAL_PROBLEMS = ALL_TOPICS.reduce((n, t) => n + (t.problems?.length ?? 0), 0);

export function getTopic(slug: string): Topic | undefined {
  return ALL_TOPICS.find((t) => t.slug === slug);
}

// Tags de conteúdo mostradas nos cards do roadmap: o que cada tópico já tem.
export type TagKind = "visual" | "article" | "video" | "exercises";
export type Tag = { kind: TagKind; label: string };

export function topicTags(t: Topic): Tag[] {
  const tags: Tag[] = [];
  if (t.viz) tags.push({ kind: "visual", label: "Visualização" });
  if (t.status === "ready" || t.article) tags.push({ kind: "article", label: "Artigo" });
  if (t.youtube || (t.extraVideos && t.extraVideos.length)) tags.push({ kind: "video", label: "Vídeo" });
  if (t.problems && t.problems.length) tags.push({ kind: "exercises", label: "Exercícios" });
  return tags;
}

// Tópico realmente vazio: ainda não tem nenhum material (vídeo, artigo ou
// visualização). Só esses recebem o rótulo "em breve" no menu e ficam fora do
// índice do Google; quem já tem ao menos um material não é mais "em breve".
export function isEmptyTopic(t: Topic): boolean {
  return t.status === "soon" && !t.youtube && !t.article && !t.viz && !t.extraVideos?.length;
}

export function getNeighbors(slug: string): { previous?: Topic; next?: Topic } {
  const i = ALL_TOPICS.findIndex((t) => t.slug === slug);
  if (i < 0) return {};
  return { previous: ALL_TOPICS[i - 1], next: ALL_TOPICS[i + 1] };
}

// "Comece por aqui": fundamentos primeiro, do mais básico ao primeiro padrão,
// sem tópicos difíceis (é o ponto de partida de quem está começando).
export const FEATURED: string[] = [
  "big-o",
  "arrays",
  "strings",
  "two-pointers",
  "listas-ligadas",
  "pilhas",
];
