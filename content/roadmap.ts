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

export type Visualizer = "a-star" | "arrays" | "arvores-binarias" | "backtracking" | "bellman-ford" | "big-o" | "binary-heap" | "binary-numbers" | "bst" | "busca-binaria" | "dfs-bfs" | "dijkstra" | "filas" | "grafos-intro" | "hash-table" | "heap-sort" | "intervals" | "listas-ligadas" | "merge-sort" | "mst" | "n-ary-trees" | "negative-binary" | "ordenacao-basica" | "pilhas" | "prefix-sum" | "quick-sort" | "recursao" | "recursao-funcional" | "shell-sort" | "skip-list" | "sliding-window" | "strings" | "sub-types" | "topological-sort" | "tree-traversals" | "two-pointers";

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
  // Selo "NOVO" no menu lateral. É uma TAG manual, não uma data: quem entra na
  // trilha recebe `isNew: true` no PR que publica o tópico, e perde a marca no
  // PR seguinte, quando outro tópico assume o posto. Sem data para envelhecer
  // sozinha, o combinado é simples: tirar daqui é parte de publicar o próximo.
  isNew?: boolean;
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
      {
        slug: "arrays",
        name: "Arrays e Listas",
        group: "Arrays e Strings",
        level: "Fácil",
        status: "ready",
        viz: "arrays",
        youtube: yt("c95xvXCU34A"),
        videoMinutes: "2:15:08",
        readingTime: "16 min",
        language: "Python",
        description: "A estrutura sequencial base: acesso por índice em O(1).",
        problems: [
          { id: "lc-26", name: "Remove Duplicates from Sorted Array", number: "26", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/remove-duplicates-from-sorted-array/" },
          { id: "lc-88", name: "Merge Sorted Array", number: "88", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/merge-sorted-array/" },
          { id: "lc-189", name: "Rotate Array", number: "189", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/rotate-array/" },
          { id: "lc-238", name: "Product of Array Except Self", number: "238", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/product-of-array-except-self/" },
          { id: "lc-54", name: "Spiral Matrix", number: "54", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/spiral-matrix/" },
          { id: "gfg-arrays", name: "Array Data Structure Guide", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/array-data-structure-guide/" },
        ],
        references: [
          { title: "How Do Dynamic Arrays Work?", url: "https://www.geeksforgeeks.org/dsa/how-do-dynamic-arrays-work/", source: "GeeksforGeeks" },
          { title: "How are lists implemented in CPython?", url: "https://docs.python.org/3/faq/design.html#how-are-lists-implemented-in-cpython", source: "Documentação do Python" },
          { title: "Arrays (guia de programação em C#)", url: "https://learn.microsoft.com/pt-br/dotnet/csharp/programming-guide/arrays/", source: "Microsoft Learn" },
          { title: "Jagged Array in Java", url: "https://www.geeksforgeeks.org/dsa/jagged-array-in-java/", source: "GeeksforGeeks" },
        ],
      },
      {
        slug: "strings",
        name: "Strings",
        group: "Arrays e Strings",
        level: "Fácil",
        status: "ready",
        viz: "strings",
        youtube: yt("B9CCEwjoXBk"),
        videoMinutes: "1:45:57",
        readingTime: "16 min",
        language: "Python",
        description: "String é um array de caracteres com duas regras a mais: o elemento não é um byte e você não pode escrever numa posição. É dessa imutabilidade que nasce o O(n²) escondido em qualquer concatenação dentro de um laço.",
        extraVideos: [{ title: "LeetCode 1704: Determine if String Halves Are Alike", youtube: "qtPcJclLlmI" }],
        problems: [
          { id: "lc-344", name: "Reverse String", number: "344", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/reverse-string/" },
          { id: "lc-796", name: "Rotate String", number: "796", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/rotate-string/" },
          { id: "lc-28", name: "Find the Index of the First Occurrence in a String", number: "28", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/" },
          { id: "lc-6", name: "Zigzag Conversion", number: "6", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/zigzag-conversion/" },
          { id: "lc-5", name: "Longest Palindromic Substring", number: "5", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-palindromic-substring/" },
          { id: "gfg-strings", name: "String Data Structure: o guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/string-data-structure/" },
        ],
        references: [
          { title: "Checar se duas strings são rotações uma da outra", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/a-program-to-check-if-strings-are-rotations-of-each-other/" },
          { title: "Unicode HOWTO: code points, encodings e as pegadinhas", source: "Python Docs", url: "https://docs.python.org/3/howto/unicode.html" },
          { title: "O mínimo absoluto que todo dev precisa saber sobre Unicode", source: "Joel on Software", url: "https://www.joelonsoftware.com/2003/10/08/the-absolute-minimum-every-software-developer-absolutely-positively-must-know-about-unicode-and-character-sets-no-excuses/" },
          { title: "Usando a classe StringBuilder no .NET", source: "Microsoft Learn", url: "https://learn.microsoft.com/pt-br/dotnet/standard/base-types/stringbuilder" },
        ],
      },
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
        videoMinutes: "1:11:13",
        readingTime: "18 min",
        language: "Python",
        description: "Dois índices caminhando na mesma passada. Em array ordenado, um começa na ponta esquerda e o outro na direita, e eles convergem.",
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
      },
      {
        // Fixa e variável são o mesmo padrão com uma regra diferente na borda
        // esquerda, então vivem na mesma página, com um visualizador para cada.
        slug: "sliding-window",
        name: "Sliding Window",
        group: "Arrays e Strings",
        level: "Médio",
        status: "ready",
        viz: "sliding-window",
        youtube: yt("OvIJw1AMNzI"),
        videoMinutes: "2:08:22",
        readingTime: "12 min",
        language: "Python",
        description: "Uma janela contígua que anda pelo array. Fixa, com tamanho travado em k, ou variável, crescendo pela direita e encolhendo pela esquerda enquanto está inválida.",
        problems: [
          // Da janela fixa para a variável, os dois difíceis no fim e o guia por último.
          { id: "lc-643", name: "Maximum Average Subarray I", number: "643", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/maximum-average-subarray-i/" },
          { id: "lc-1343", name: "Sub-arrays of Size K with Average ≥ Threshold", number: "1343", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold/" },
          { id: "lc-1456", name: "Maximum Number of Vowels in a Substring of Given Length", number: "1456", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/maximum-number-of-vowels-in-a-substring-of-given-length/" },
          { id: "lc-567", name: "Permutation in String", number: "567", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/permutation-in-string/" },
          { id: "lc-3", name: "Longest Substring Without Repeating Characters", number: "3", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/" },
          { id: "lc-209", name: "Minimum Size Subarray Sum", number: "209", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/minimum-size-subarray-sum/" },
          { id: "lc-1004", name: "Max Consecutive Ones III", number: "1004", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/max-consecutive-ones-iii/" },
          { id: "lc-713", name: "Subarray Product Less Than K", number: "713", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/subarray-product-less-than-k/" },
          { id: "lc-239", name: "Sliding Window Maximum", number: "239", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/sliding-window-maximum/" },
          { id: "lc-76", name: "Minimum Window Substring", number: "76", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/minimum-window-substring/" },
          { id: "gfg-sliding", name: "Window Sliding Technique", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/window-sliding-technique/" },
        ],
      },
      {
        slug: "prefix-sum",
        name: "Prefix Sum",
        group: "Arrays e Strings",
        level: "Médio",
        status: "ready",
        viz: "prefix-sum",
        youtube: yt("yMnLofkS7DM"),
        videoMinutes: "1:42:35",
        readingTime: "18 min",
        language: "Python",
        description: "Somas de intervalo em tempo constante depois de um pré-processamento.",
        problems: [
          { id: "lc-303", name: "Range Sum Query - Immutable", number: "303", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/range-sum-query-immutable/" },
          { id: "lc-724", name: "Find Pivot Index", number: "724", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/find-pivot-index/" },
          { id: "lc-643", name: "Maximum Average Subarray I", number: "643", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/maximum-average-subarray-i/" },
          { id: "lc-2270", name: "Number of Ways to Split Array", number: "2270", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-ways-to-split-array/" },
          { id: "lc-560", name: "Subarray Sum Equals K", number: "560", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/subarray-sum-equals-k/" },
          { id: "gfg-prefix-sum", name: "Range Sum Queries Without Updates", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/range-sum-queries-without-updates/" },
        ],
        references: [
          { title: "Prefix Sum Array: implementação e aplicações", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/prefix-sum-array-implementation-applications-competitive-programming/" },
          { title: "Prefix Sum of Matrix (Or 2D Array): o prefixo em duas dimensões", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/prefix-sum-2d-array/" },
          { title: "1D Difference Array: atualizar um intervalo em O(1)", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/difference-array-range-update-query-o1/" },
          { title: "Introduction to Prefix Sums", source: "USACO Guide", url: "https://usaco.guide/silver/prefix-sums" },
        ],
      },
      {
        slug: "intervals",
        name: "Intervalos",
        group: "Arrays e Strings",
        level: "Médio",
        status: "ready",
        viz: "intervals",
        readingTime: "18 min",
        language: "Python",
        description: "Merge, insert e agendamento: ordenar por início e varrer os intervalos.",
        problems: [
          { id: "lc-56", name: "Merge Intervals", number: "56", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/merge-intervals/" },
          { id: "lc-57", name: "Insert Interval", number: "57", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/insert-interval/" },
          { id: "lc-435", name: "Non-overlapping Intervals", number: "435", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/non-overlapping-intervals/" },
          { id: "lc-452", name: "Minimum Number of Arrows to Burst Balloons", number: "452", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/" },
          { id: "lc-1094", name: "Car Pooling", number: "1094", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/car-pooling/" },
          { id: "lc-2402", name: "Meeting Rooms III", number: "2402", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/meeting-rooms-iii/" },
          { id: "gfg-intervals", name: "Overlapping Intervals: fundir intervalos que se sobrepõem", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/merging-intervals/" },
        ],
        references: [
          { title: "Overlapping Intervals: ordenar por início e fundir", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/merging-intervals/" },
          { title: "Insert in Sorted and Non-Overlapping Interval Array", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/insert-in-sorted-and-non-overlapping-interval-array/" },
          { title: "Maximum Number of Overlapping Intervals: a contagem por eventos", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/maximum-number-of-overlapping-intervals/" },
          { title: "Minimum Platforms Required: quando o empate muda a resposta", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/minimum-number-platforms-required-railwaybus-station/" },
        ],
      },
    ],
  },
  {
    id: "hashing",
    name: "Hashing",
    topics: [
      {
        slug: "hash-table",
        name: "Tabelas Hash",
        group: "Hashing",
        level: "Médio",
        status: "ready",
        viz: "hash-table",
        youtube: yt("JFhdCBrKTX0"),
        videoMinutes: "2:31:40",
        readingTime: "19 min",
        language: "Python",
        description: "Busca, inserção e remoção em O(1) amortizado, quase sempre. A chave calcula o próprio endereço, e o preço disso é colisão, fator de carga e rehash.",
        extraVideos: [{ title: "LeetCode 1347: Minimum Steps to Make Two Strings Anagram", youtube: "55OYGLEj0Dw" }],
        problems: [
          { id: "lc-217", name: "Contains Duplicate", number: "217", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/contains-duplicate/" },
          { id: "lc-242", name: "Valid Anagram", number: "242", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/valid-anagram/" },
          { id: "lc-1", name: "Two Sum", number: "1", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/two-sum/" },
          { id: "lc-49", name: "Group Anagrams", number: "49", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/group-anagrams/" },
          { id: "lc-706", name: "Design HashMap", number: "706", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/design-hashmap/" },
          { id: "gfg-hashing", name: "Practice Problems on Hashing", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/practice-problems-on-hashing/" },
        ],
        references: [
          { title: "Hashing in Data Structure", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/hashing-data-structure/" },
          { title: "Separate Chaining Collision Handling Technique in Hashing", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/separate-chaining-collision-handling-technique-in-hashing/" },
          { title: "Load Factor and Rehashing", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/load-factor-and-rehashing/" },
          { title: "java.util.HashMap: o fator de carga 0,75 documentado na fonte", source: "Oracle", url: "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html" },
        ],
      },
    ],
  },
  {
    id: "listas",
    name: "Listas Encadeadas",
    topics: [
      {
        slug: "listas-ligadas",
        name: "Listas Encadeadas",
        group: "Listas Encadeadas",
        level: "Fácil",
        status: "ready",
        viz: "listas-ligadas",
        youtube: yt("j0E5hJZ__EA"),
        videoMinutes: "2:00:47",
        readingTime: "23 min",
        language: "Python",
        description: "Nós apontando para nós. Ponteiro rápido e lento, sentinelas e detecção de ciclos.",
        problems: [
          { id: "lc-206", name: "Reverse Linked List", number: "206", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/reverse-linked-list/" },
          { id: "lc-876", name: "Middle of the Linked List", number: "876", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/middle-of-the-linked-list/" },
          { id: "lc-19", name: "Remove Nth Node From End of List", number: "19", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/remove-nth-node-from-end-of-list/" },
          { id: "lc-142", name: "Linked List Cycle II", number: "142", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/linked-list-cycle-ii/" },
          { id: "lc-146", name: "LRU Cache", number: "146", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/lru-cache/" },
          { id: "gfg-listas-ligadas", name: "Linked List Data Structure", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/linked-list-data-structure/" },
        ],
        references: [
          { title: "Reverse a Linked List", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/reverse-a-linked-list/" },
          { title: "Doubly Linked List", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/doubly-linked-list/" },
          { title: "collections.deque: a deque do Python é uma lista duplamente encadeada de blocos", source: "Documentação do Python", url: "https://docs.python.org/3/library/collections.html#collections.deque" },
          { title: "LinkedList: a lista do Java é sempre duplamente encadeada", source: "Oracle Java Docs", url: "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/LinkedList.html" },
        ],
      },
      {
        slug: "skip-list",
        name: "Skip List",
        group: "Listas Encadeadas",
        level: "Difícil",
        status: "ready",
        viz: "skip-list",
        youtube: yt("R9sVLuJ7FSg"),
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
    ],
  },
  {
    id: "pilhas-filas",
    name: "Pilhas e Filas",
    topics: [
      {
        slug: "pilhas",
        name: "Pilhas (Stacks)",
        group: "Pilhas e Filas",
        level: "Fácil",
        status: "ready",
        viz: "pilhas",
        youtube: yt("JRbrNgsYuT0"),
        videoMinutes: "2:26:51",
        readingTime: "17 min",
        language: "Python",
        description: "LIFO: parênteses balanceados e próximo maior elemento (pilha monotônica).",
        problems: [
          { id: "lc-20", name: "Valid Parentheses", number: "20", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/valid-parentheses/" },
          { id: "lc-682", name: "Baseball Game", number: "682", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/baseball-game/" },
          { id: "lc-155", name: "Min Stack", number: "155", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/min-stack/" },
          { id: "lc-150", name: "Evaluate Reverse Polish Notation", number: "150", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/evaluate-reverse-polish-notation/" },
          { id: "lc-739", name: "Daily Temperatures", number: "739", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/daily-temperatures/" },
          { id: "gfg-pilhas", name: "Stack Data Structure: o guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/stack-data-structure/" },
        ],
        references: [
          { title: "Next Greater Element in Array", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/next-greater-element/" },
          { title: "Implement a stack using singly linked list", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/implement-a-stack-using-singly-linked-list/" },
          { title: "Evaluation of Postfix Expression", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/evaluation-of-postfix-expression/" },
          { title: "java.util.Deque: por que a classe Stack é legado", source: "Oracle", url: "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Deque.html" },
        ],
      },
      {
        slug: "filas",
        name: "Filas e Deques",
        group: "Pilhas e Filas",
        level: "Fácil",
        status: "ready",
        viz: "filas",
        youtube: yt("KJaVKLZsMcg"),
        videoMinutes: "2:03:02",
        readingTime: "19 min",
        language: "Python",
        description: "FIFO e a fila de duas pontas para a janela com máximo.",
        problems: [
          { id: "lc-232", name: "Implement Queue using Stacks", number: "232", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/implement-queue-using-stacks/" },
          { id: "lc-1700", name: "Number of Students Unable to Eat Lunch", number: "1700", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/number-of-students-unable-to-eat-lunch/" },
          { id: "lc-622", name: "Design Circular Queue", number: "622", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/design-circular-queue/" },
          { id: "lc-641", name: "Design Circular Deque", number: "641", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/design-circular-deque/" },
          { id: "lc-239", name: "Sliding Window Maximum", number: "239", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/sliding-window-maximum/" },
          { id: "lc-862", name: "Shortest Subarray with Sum at Least K", number: "862", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/shortest-subarray-with-sum-at-least-k/" },
          { id: "gfg-filas", name: "Queue Data Structure", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/queue-data-structure/" },
        ],
        references: [
          { title: "Circular Queue: introdução e implementação com array", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/circular-queue-set-1-introduction-array-implementation/" },
          { title: "collections.deque: as duas pontas em O(1), e por que list.pop(0) é O(n)", source: "Python Docs", url: "https://docs.python.org/3/library/collections.html" },
          { title: "ArrayDeque: a fila de duas pontas sobre array do Java", source: "Java Docs", url: "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayDeque.html" },
          { title: "Sliding Window Maximum com deque monotônico", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/sliding-window-maximum-maximum-of-all-subarrays-of-size-k/" },
        ],
      },
    ],
  },
  {
    id: "recursao",
    name: "Recursão",
    topics: [
      {
        slug: "recursao",
        name: "Recursão: Fundamentos",
        group: "Recursão",
        level: "Médio",
        status: "ready",
        viz: "recursao",
        youtube: yt("KkSAaQHCkSE"),
        videoMinutes: "1:59:28",
        readingTime: "17 min",
        language: "Python",
        description: "Funções que chamam a si mesmas, sem medo do stack.",
        problems: [
          { id: "lc-509", name: "Fibonacci Number", number: "509", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/fibonacci-number/" },
          { id: "lc-70", name: "Climbing Stairs", number: "70", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/climbing-stairs/" },
          { id: "lc-206", name: "Reverse Linked List", number: "206", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/reverse-linked-list/" },
          { id: "lc-104", name: "Maximum Depth of Binary Tree", number: "104", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/maximum-depth-of-binary-tree/" },
          { id: "lc-50", name: "Pow(x, n)", number: "50", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/powx-n/" },
          { id: "gfg-recursao", name: "Recursion Practice Problems with Solutions", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/recursion-practice-problems-solutions/" },
        ],
        references: [
          { title: "Introduction to Recursion", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/introduction-to-recursion-2/" },
          { title: "Types of Recursions", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/types-of-recursions/" },
          { title: "Program for nth Fibonacci Number: ingênuo, memoização e bottom-up", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/program-for-nth-fibonacci-number/" },
          { title: "sys.setrecursionlimit: o limite de mil níveis documentado na fonte", source: "Python Docs", url: "https://docs.python.org/3/library/sys.html#sys.setrecursionlimit" },
        ],
      },
      {
        slug: "recursao-funcional",
        name: "Recursão: Programação Funcional",
        group: "Recursão",
        level: "Médio",
        status: "ready",
        viz: "recursao-funcional",
        youtube: yt("rbEYjJdaIZI"),
        videoMinutes: "2:21:37",
        readingTime: "16 min",
        language: "Python",
        description: "Recursão de cauda e o estilo funcional.",
        problems: [
          { id: "lc-700", name: "Search in a Binary Search Tree", number: "700", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/search-in-a-binary-search-tree/" },
          { id: "lc-206", name: "Reverse Linked List", number: "206", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/reverse-linked-list/" },
          { id: "lc-509", name: "Fibonacci Number", number: "509", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/fibonacci-number/" },
          { id: "lc-50", name: "Pow(x, n)", number: "50", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/powx-n/" },
          { id: "lc-779", name: "K-th Symbol in Grammar", number: "779", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/k-th-symbol-in-grammar/" },
          { id: "gfg-recursao-cauda", name: "Tail Recursion", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/tail-recursion/" },
        ],
        references: [
          { title: "Tail Call Elimination", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/tail-call-elimination/" },
          { title: "Tail Recursion Elimination: por que o Python não faz", source: "Guido van Rossum", url: "https://neopythonic.blogspot.com/2009/04/tail-recursion-elimination.html" },
          { title: "The Seven Myths of Erlang Performance: recursão de cauda nem sempre é mais rápida", source: "Erlang/OTP", url: "https://www.erlang.org/docs/26/efficiency_guide/myths" },
          { title: "Tail recursive functions: o modificador tailrec", source: "Kotlin", url: "https://kotlinlang.org/docs/functions.html#tail-recursive-functions" },
        ],
      },
    ],
  },
  {
    id: "arvores",
    name: "Árvores",
    topics: [
      {
        slug: "tree-traversals",
        name: "Percursos em Árvore (DFS/BFS)",
        group: "Árvores",
        level: "Médio",
        status: "ready",
        viz: "tree-traversals",
        youtube: yt("_-2F65OVWjo"),
        videoMinutes: "1:49:46",
        readingTime: "12 min",
        language: "Python",
        description: "Pré, in, pós-ordem e por nível.",
        problems: [
          { id: "lc-94", name: "Binary Tree Inorder Traversal", number: "94", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/binary-tree-inorder-traversal/" },
          { id: "lc-104", name: "Maximum Depth of Binary Tree", number: "104", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/maximum-depth-of-binary-tree/" },
          { id: "lc-101", name: "Symmetric Tree", number: "101", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/symmetric-tree/" },
          { id: "lc-102", name: "Binary Tree Level Order Traversal", number: "102", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/binary-tree-level-order-traversal/" },
          { id: "lc-199", name: "Binary Tree Right Side View", number: "199", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/binary-tree-right-side-view/" },
          { id: "gfg-tree-traversal", name: "Tree Traversals (Inorder, Preorder e Postorder)", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/tree-traversals-inorder-preorder-and-postorder/" },
        ],
        references: [
          { title: "Tree Traversals (Inorder, Preorder e Postorder)", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/tree-traversals-inorder-preorder-and-postorder/" },
          { title: "Level Order Traversal (BFS em árvore)", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/level-order-tree-traversal/" },
          { title: "Inorder Tree Traversal without Recursion", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/inorder-tree-traversal-without-recursion/" },
          { title: "collections.deque: a fila usada no BFS", source: "Documentação do Python", url: "https://docs.python.org/3/library/collections.html#collections.deque" },
        ],
      },
      {
        slug: "arvores-binarias",
        name: "Árvores Binárias",
        group: "Árvores",
        level: "Médio",
        status: "ready",
        viz: "arvores-binarias",
        youtube: yt("OAcm2rXqz9M"),
        videoMinutes: "1:50:49",
        readingTime: "10 min",
        language: "Python",
        description: "Recursão estrutural sobre dois filhos.",
        extraVideos: [{ title: "LeetCode 2385: Amount of Time for a Binary Tree to Be Infected", youtube: "jshM7d1P8IY" }],
        problems: [
          { id: "lc-226", name: "Invert Binary Tree", number: "226", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/invert-binary-tree/" },
          { id: "lc-100", name: "Same Tree", number: "100", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/same-tree/" },
          { id: "lc-110", name: "Balanced Binary Tree", number: "110", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/balanced-binary-tree/" },
          { id: "lc-543", name: "Diameter of Binary Tree", number: "543", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/diameter-of-binary-tree/" },
          { id: "lc-222", name: "Count Complete Tree Nodes", number: "222", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/count-complete-tree-nodes/" },
          { id: "gfg-binary-tree", name: "Binary Tree Data Structure", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/binary-tree-data-structure/" },
        ],
        references: [
          { title: "Types of Binary Tree (cheia, perfeita, completa, degenerada)", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/types-of-binary-tree/" },
          { title: "Binary Tree Representation: ponteiros e array", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/binary-tree-representation/" },
          { title: "Relação entre número de nós e altura", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/relationship-number-nodes-height-binary-tree/" },
          { title: "Binary Tree Data Structure: o guia completo", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/binary-tree-data-structure/" },
        ],
      },
      {
        slug: "n-ary-trees",
        name: "Árvores N-árias",
        group: "Árvores",
        level: "Médio",
        status: "ready",
        viz: "n-ary-trees",
        youtube: yt("FLZxMQFTqvY"),
        videoMinutes: "1:26:48",
        readingTime: "10 min",
        language: "Python",
        description: "Nós com qualquer número de filhos.",
        problems: [
          { id: "lc-589", name: "N-ary Tree Preorder Traversal", number: "589", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/n-ary-tree-preorder-traversal/" },
          { id: "lc-590", name: "N-ary Tree Postorder Traversal", number: "590", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/n-ary-tree-postorder-traversal/" },
          { id: "lc-559", name: "Maximum Depth of N-ary Tree", number: "559", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/maximum-depth-of-n-ary-tree/" },
          { id: "lc-429", name: "N-ary Tree Level Order Traversal", number: "429", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/n-ary-tree-level-order-traversal/" },
          { id: "lc-431", name: "Encode N-ary Tree to Binary Tree", number: "431", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/encode-n-ary-tree-to-binary-tree/" },
          { id: "gfg-generic-trees", name: "Generic Trees (N-ary Trees)", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/generic-treesn-array-trees/" },
        ],
        references: [
          { title: "Generic Trees (N-ary Trees)", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/generic-treesn-array-trees/" },
          { title: "Introduction of B-Tree: o grau alto e a página de disco", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/introduction-of-b-tree-2/" },
          { title: "Anatomia de um índice: a árvore por trás do banco", source: "Use The Index, Luke!", url: "https://use-the-index-luke.com/sql/anatomy/the-tree" },
          { title: "Introdução ao DOM: a árvore n-ária que você usa todo dia", source: "MDN", url: "https://developer.mozilla.org/pt-BR/docs/Web/API/Document_Object_Model/Introduction" },
        ],
      },
      {
        slug: "bst",
        name: "Árvore de Busca Binária",
        group: "Árvores",
        level: "Médio",
        status: "ready",
        viz: "bst",
        youtube: yt("CITquySB4ls"),
        videoMinutes: "2:13:44",
        readingTime: "12 min",
        language: "Python",
        description: "Ordem invariante para busca em O(log n).",
        problems: [
          { id: "lc-700", name: "Search in a Binary Search Tree", number: "700", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/search-in-a-binary-search-tree/" },
          { id: "lc-701", name: "Insert into a Binary Search Tree", number: "701", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/insert-into-a-binary-search-tree/" },
          { id: "lc-98", name: "Validate Binary Search Tree", number: "98", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/validate-binary-search-tree/" },
          { id: "lc-230", name: "Kth Smallest Element in a BST", number: "230", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/kth-smallest-element-in-a-bst/" },
          { id: "lc-108", name: "Convert Sorted Array to Binary Search Tree", number: "108", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/convert-sorted-array-to-binary-search-tree/" },
          { id: "lc-450", name: "Delete Node in a BST", number: "450", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/delete-node-in-a-bst/" },
        ],
        references: [
          { title: "Binary Search Tree: busca, inserção e remoção", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/binary-search-tree-data-structure/" },
          { title: "Deletion in a BST: os três casos", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/deletion-in-binary-search-tree/" },
          { title: "AVL Tree: o balanceamento por rotação", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/introduction-to-avl-tree/" },
          { title: "Red-Black Tree: o balanceamento que o TreeMap usa", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/introduction-to-red-black-tree/" },
        ],
      },
      { slug: "trie", name: "Trie (Árvore de Prefixos)", group: "Árvores", level: "Médio", status: "soon", description: "Árvore de prefixos para busca de strings, autocomplete e dicionários." },
    ],
  },
  {
    id: "grafos",
    name: "Grafos",
    topics: [
      {
        slug: "grafos-intro",
        name: "Introdução a Grafos",
        group: "Grafos",
        level: "Médio",
        status: "ready",
        viz: "grafos-intro",
        youtube: yt("cILrU-dtuEc"),
        videoMinutes: "1:46:55",
        readingTime: "11 min",
        language: "Python",
        description: "Vértices, arestas e representação (matriz / lista de adjacência).",
        problems: [
          { id: "lc-1971", name: "Find if Path Exists in Graph", number: "1971", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/find-if-path-exists-in-graph/" },
          { id: "lc-733", name: "Flood Fill", number: "733", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/flood-fill/" },
          { id: "lc-200", name: "Number of Islands", number: "200", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-islands/" },
          { id: "lc-133", name: "Clone Graph", number: "133", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/clone-graph/" },
          { id: "lc-547", name: "Number of Provinces", number: "547", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-provinces/" },
          { id: "gfg-graph", name: "Graph Data Structure and Algorithms", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/graph-data-structure-and-algorithms/" },
        ],
        references: [
          { title: "Graph Data Structure and Algorithms", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/graph-data-structure-and-algorithms/" },
          { title: "Comparação entre matriz e lista de adjacência", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/comparison-between-adjacency-list-and-adjacency-matrix-representation-of-graph/" },
          { title: "Graph and its representations", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/graph-and-its-representations/" },
          { title: "collections.defaultdict: a lista de adjacência em uma linha", source: "Documentação do Python", url: "https://docs.python.org/3/library/collections.html#collections.defaultdict" },
        ],
      },
      {
        slug: "dfs-bfs",
        name: "DFS e BFS em Grafos",
        group: "Grafos",
        level: "Médio",
        status: "ready",
        viz: "dfs-bfs",
        youtube: yt("sCT-_EjbVqQ"),
        videoMinutes: "2:06:45",
        readingTime: "11 min",
        language: "Python",
        description: "Os dois jeitos de percorrer um grafo.",
        problems: [
          { id: "lc-200", name: "Number of Islands", number: "200", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-islands/" },
          { id: "lc-547", name: "Number of Provinces", number: "547", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-provinces/" },
          { id: "lc-994", name: "Rotting Oranges", number: "994", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/rotting-oranges/" },
          { id: "lc-207", name: "Course Schedule", number: "207", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/course-schedule/" },
          { id: "lc-127", name: "Word Ladder", number: "127", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/word-ladder/" },
          { id: "gfg-bfs-dfs", name: "Difference between BFS and DFS", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/difference-between-bfs-and-dfs/" },
        ],
        references: [
          { title: "Breadth First Search or BFS for a Graph", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/breadth-first-search-or-bfs-for-a-graph/" },
          { title: "Depth First Search or DFS for a Graph", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/depth-first-search-or-dfs-for-a-graph/" },
          { title: "Detect Cycle in a Directed Graph", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/detect-cycle-in-a-graph/" },
          { title: "Shortest path in an unweighted graph", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/shortest-path-unweighted-graph/" },
        ],
      },
      {
        slug: "dijkstra",
        name: "Dijkstra",
        group: "Grafos",
        level: "Difícil",
        status: "ready",
        viz: "dijkstra",
        youtube: yt("b4kWEWtCVzA"),
        videoMinutes: "2:09:19",
        readingTime: "12 min",
        language: "Python",
        article: "https://craftcodeclub.io/posts/dsa-dijkstra",
        description: "Caminho mais curto com pesos não-negativos.",
        problems: [
          { id: "lc-743", name: "Network Delay Time", number: "743", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/network-delay-time/" },
          { id: "lc-1631", name: "Path With Minimum Effort", number: "1631", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/path-with-minimum-effort/" },
          { id: "lc-1514", name: "Path with Maximum Probability", number: "1514", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/path-with-maximum-probability/" },
          { id: "lc-778", name: "Swim in Rising Water", number: "778", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/swim-in-rising-water/" },
          { id: "lc-787", name: "Cheapest Flights Within K Stops", number: "787", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/cheapest-flights-within-k-stops/" },
          { id: "gfg-dijkstra", name: "Dijkstra's Shortest Path Algorithm", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/dijkstras-shortest-path-algorithm-greedy-algo-7/" },
        ],
        references: [
          { title: "Dijkstra: caminho mínimo passo a passo", source: "Craft & Code Club", url: "https://craftcodeclub.io/posts/dsa-dijkstra" },
          { title: "Dijkstra's Shortest Path Algorithm", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/dijkstras-shortest-path-algorithm-greedy-algo-7/" },
          { title: "heapq: a fila de prioridade do Python", source: "Documentação do Python", url: "https://docs.python.org/3/library/heapq.html" },
          { title: "Why Dijkstra fails with negative weights", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/why-does-dijkstras-algorithm-fail-on-negative-weights/" },
        ],
      },
      {
        slug: "bellman-ford",
        name: "Bellman-Ford",
        group: "Grafos",
        level: "Difícil",
        status: "ready",
        viz: "bellman-ford",
        youtube: yt("0GcXgQTpYcE"),
        videoMinutes: "2:22:53",
        readingTime: "11 min",
        language: "Python",
        article: "https://craftcodeclub.io/posts/dsa-bellman-ford",
        description: "Caminho mais curto que aceita pesos negativos.",
        problems: [
          { id: "lc-787", name: "Cheapest Flights Within K Stops", number: "787", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/cheapest-flights-within-k-stops/" },
          { id: "lc-743", name: "Network Delay Time", number: "743", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/network-delay-time/" },
          { id: "lc-1928", name: "Minimum Cost to Reach Destination in Time", number: "1928", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/minimum-cost-to-reach-destination-in-time/" },
          { id: "lc-2093", name: "Minimum Cost to Reach City With Discounts", number: "2093", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/minimum-cost-to-reach-city-with-discounts/" },
          { id: "gfg-bellman-ford", name: "Bellman-Ford Algorithm", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/bellman-ford-algorithm-dp-23/" },
        ],
        references: [
          { title: "Bellman-Ford: relaxamento e ciclo negativo", source: "Craft & Code Club", url: "https://craftcodeclub.io/posts/dsa-bellman-ford" },
          { title: "Bellman-Ford Algorithm", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/bellman-ford-algorithm-dp-23/" },
          { title: "Detect a negative cycle in a Graph", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/detect-negative-cycle-graph-bellman-ford/" },
          { title: "Johnson's algorithm: Bellman-Ford + Dijkstra", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/johnsons-algorithm/" },
        ],
      },
      {
        slug: "a-star",
        name: "A* (A Estrela)",
        group: "Grafos",
        level: "Difícil",
        status: "ready",
        viz: "a-star",
        youtube: yt("0PYx7erkdXo"),
        videoMinutes: "2:34:10",
        readingTime: "11 min",
        language: "Python",
        article: "https://craftcodeclub.io/posts/dsa-a-star",
        description: "Pathfinding guiado por heurística.",
        problems: [
          { id: "lc-1091", name: "Shortest Path in Binary Matrix", number: "1091", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/shortest-path-in-binary-matrix/" },
          { id: "lc-773", name: "Sliding Puzzle", number: "773", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/sliding-puzzle/" },
          { id: "lc-1263", name: "Minimum Moves to Move a Box to Their Target Location", number: "1263", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/minimum-moves-to-move-a-box-to-their-target-location/" },
          { id: "lc-505", name: "The Maze II", number: "505", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/the-maze-ii/" },
          { id: "gfg-a-star", name: "A* Search Algorithm", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/a-search-algorithm/" },
        ],
        references: [
          { title: "A*: heurística e caminho ótimo", source: "Craft & Code Club", url: "https://craftcodeclub.io/posts/dsa-a-star" },
          { title: "Introduction to A*", source: "Red Blob Games", url: "https://www.redblobgames.com/pathfinding/a-star/introduction.html" },
          { title: "Heuristics for grid maps", source: "Red Blob Games", url: "https://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html" },
          { title: "A* Search Algorithm", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/a-search-algorithm/" },
        ],
      },
      { slug: "floyd-warshall", name: "Floyd-Warshall (APSP)", group: "Grafos", level: "Difícil", status: "soon", description: "Menor caminho entre todos os pares de vértices, em O(V³)." },
      {
        slug: "topological-sort",
        name: "Ordenação Topológica",
        group: "Grafos",
        level: "Médio",
        status: "ready",
        viz: "topological-sort",
        youtube: yt("4fTjXqcMFtk"),
        videoMinutes: "1:41:07",
        readingTime: "10 min",
        language: "Python",
        article: "https://craftcodeclub.io/posts/dsa-topological-sorting",
        description: "Ordem linear de um DAG (Kahn e DFS).",
        problems: [
          { id: "lc-207", name: "Course Schedule", number: "207", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/course-schedule/" },
          { id: "lc-210", name: "Course Schedule II", number: "210", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/course-schedule-ii/" },
          { id: "lc-310", name: "Minimum Height Trees", number: "310", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/minimum-height-trees/" },
          { id: "lc-2115", name: "Find All Possible Recipes from Given Supplies", number: "2115", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/find-all-possible-recipes-from-given-supplies/" },
          { id: "lc-269", name: "Alien Dictionary", number: "269", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/alien-dictionary/" },
          { id: "gfg-topo", name: "Topological Sorting", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/topological-sorting/" },
        ],
        references: [
          { title: "Ordenação topológica: Kahn e DFS", source: "Craft & Code Club", url: "https://craftcodeclub.io/posts/dsa-topological-sorting" },
          { title: "Topological Sorting", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/topological-sorting/" },
          { title: "Kahn's algorithm for Topological Sorting", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/topological-sorting-indegree-based-solution/" },
          { title: "Detect Cycle in a Directed Graph", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/detect-cycle-in-a-graph/" },
        ],
      },
      {
        slug: "mst",
        name: "Árvore Geradora Mínima (MST)",
        group: "Grafos",
        level: "Difícil",
        status: "ready",
        viz: "mst",
        youtube: yt("a9iI9N4FLsg"),
        videoMinutes: "2:12:12",
        readingTime: "11 min",
        language: "Python",
        article: "https://craftcodeclub.io/posts/dsa-mst",
        description: "Conectar tudo com o menor custo: Kruskal e Prim.",
        problems: [
          { id: "lc-1584", name: "Min Cost to Connect All Points", number: "1584", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/min-cost-to-connect-all-points/" },
          { id: "lc-1135", name: "Connecting Cities With Minimum Cost", number: "1135", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/connecting-cities-with-minimum-cost/" },
          { id: "lc-684", name: "Redundant Connection", number: "684", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/redundant-connection/" },
          { id: "lc-1319", name: "Number of Operations to Make Network Connected", number: "1319", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-operations-to-make-network-connected/" },
          { id: "lc-1489", name: "Find Critical and Pseudo-Critical Edges in MST", number: "1489", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/find-critical-and-pseudo-critical-edges-in-minimum-spanning-tree/" },
          { id: "gfg-mst", name: "Minimum Spanning Tree", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/what-is-minimum-spanning-tree-mst/" },
        ],
        references: [
          { title: "MST: Kruskal e Prim passo a passo", source: "Craft & Code Club", url: "https://craftcodeclub.io/posts/dsa-mst" },
          { title: "Kruskal's Minimum Spanning Tree Algorithm", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/kruskals-minimum-spanning-tree-algorithm-greedy-algo-2/" },
          { title: "Prim's Minimum Spanning Tree Algorithm", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/prims-minimum-spanning-tree-mst-greedy-algo-5/" },
          { title: "Disjoint Set Union (union-find) com compressão de caminho", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/introduction-to-disjoint-set-data-structure-or-union-find-algorithm/" },
        ],
      },
      { slug: "grafos-avancados", name: "Grafos Avançados", group: "Grafos", level: "Difícil", status: "soon", description: "Componentes fortemente conexos, pontes, pontos de articulação e union-find." },
    ],
  },
  {
    id: "heaps",
    name: "Heaps",
    topics: [
      {
        slug: "binary-heap",
        name: "Binary Heap",
        group: "Heaps",
        level: "Médio",
        status: "ready",
        viz: "binary-heap",
        youtube: yt("HVWw20nOLHk"),
        videoMinutes: "2:21:46",
        readingTime: "12 min",
        language: "Python",
        description: "A fila de prioridade por trás do heap sort e do Dijkstra.",
        problems: [
          { id: "lc-1046", name: "Last Stone Weight", number: "1046", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/last-stone-weight/" },
          { id: "lc-703", name: "Kth Largest Element in a Stream", number: "703", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/kth-largest-element-in-a-stream/" },
          { id: "lc-215", name: "Kth Largest Element in an Array", number: "215", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/kth-largest-element-in-an-array/" },
          { id: "lc-973", name: "K Closest Points to Origin", number: "973", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/k-closest-points-to-origin/" },
          { id: "lc-621", name: "Task Scheduler", number: "621", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/task-scheduler/" },
          { id: "lc-23", name: "Merge k Sorted Lists", number: "23", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/merge-k-sorted-lists/" },
          { id: "gfg-binary-heap", name: "Binary Heap: guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/binary-heap/" },
        ],
        references: [
          { title: "Heap: fila de prioridade sobre vetor", source: "João Arthur Brunet, UFCG", url: "https://joaoarthurbm.github.io/eda/posts/heap/" },
          { title: "Filas de Prioridade e Heap (MC-202)", source: "IC, UNICAMP", url: "https://www.ic.unicamp.br/~rafael/cursos/2s2018/mc202/slides/unidade21-fila-de-prioridade.pdf" },
          { title: "Heap Binário: implementação e operações (MC-202)", source: "IC, UNICAMP", url: "https://www.ic.unicamp.br/~afalcao/mc202/HeapBinario.pdf" },
          { title: "Binary Heap", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/binary-heap/" },
          { title: "heapq: algoritmo de fila de prioridade na biblioteca padrão", source: "docs.python.org", url: "https://docs.python.org/3/library/heapq.html" },
        ],
      },
      {
        slug: "heap-sort",
        name: "Heap Sort",
        group: "Heaps",
        level: "Médio",
        status: "ready",
        viz: "heap-sort",
        youtube: yt("wUfOyKMjamM"),
        videoMinutes: "2:10:31",
        readingTime: "11 min",
        language: "Python",
        description: "Ordenar com um heap em O(n log n).",
        problems: [
          { id: "lc-912", name: "Sort an Array", number: "912", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sort-an-array/" },
          { id: "lc-347", name: "Top K Frequent Elements", number: "347", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/top-k-frequent-elements/" },
          { id: "lc-692", name: "Top K Frequent Words", number: "692", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/top-k-frequent-words/" },
          { id: "lc-1985", name: "Find the Kth Largest Integer in the Array", number: "1985", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/find-the-kth-largest-integer-in-the-array/" },
          { id: "lc-502", name: "IPO", number: "502", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/ipo/" },
          { id: "gfg-heap-sort", name: "Heap Sort: guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/heap-sort/" },
        ],
        references: [
          { title: "Heapsort", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/hpsrt.html" },
          { title: "Ordenação: Heapsort (AEDS II)", source: "DCC, UFMG", url: "https://homepages.dcc.ufmg.br/~cunha/teaching/20121/aeds2/heapsort.pdf" },
          { title: "Heap Sort", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/heap-sort/" },
          { title: "Por que construir um heap custa O(n)", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/time-complexity-of-building-a-heap/" },
          { title: "Introsort: onde o heap sort entra como rede de segurança", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Introsort" },
        ],
      },
    ],
  },
  {
    id: "busca-binaria",
    name: "Busca Binária",
    topics: [
      {
        slug: "busca-binaria",
        name: "Busca Binária",
        group: "Busca Binária",
        level: "Médio",
        status: "ready",
        viz: "busca-binaria",
        youtube: yt("62ZGcXDpbys"),
        videoMinutes: "1:30:11",
        readingTime: "11 min",
        language: "Python",
        description: "Corte o espaço de busca pela metade a cada passo: O(log n).",
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
      },
      { slug: "busca-binaria-avancada", name: "Busca Binária no Espaço de Respostas", group: "Busca Binária", level: "Difícil", status: "soon", description: "Binary search on answer: achar a fronteira de uma condição monotônica, não um valor." },
    ],
  },
  {
    id: "ordenacao",
    name: "Ordenação",
    topics: [
      {
        slug: "ordenacao-basica",
        name: "Ordenação Básica",
        group: "Ordenação",
        level: "Fácil",
        status: "ready",
        viz: "ordenacao-basica",
        youtube: yt("GxhxsbbzaTI"),
        videoMinutes: "1:52:10",
        readingTime: "12 min",
        language: "Python",
        description: "Bubble, Selection e Insertion Sort, os O(n²) que ensinam a base.",
        problems: [
          { id: "lc-283", name: "Move Zeroes", number: "283", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/move-zeroes/" },
          { id: "lc-2418", name: "Sort the People", number: "2418", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/sort-the-people/" },
          { id: "lc-88", name: "Merge Sorted Array", number: "88", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/merge-sorted-array/" },
          { id: "lc-147", name: "Insertion Sort List", number: "147", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/insertion-sort-list/" },
          { id: "lc-912", name: "Sort an Array", number: "912", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sort-an-array/" },
          { id: "gfg-ordenacao-basica", name: "Bubble, Selection e Insertion Sort: guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/bubble-sort-algorithm/" },
        ],
        references: [
          { title: "Ordenação: algoritmos elementares", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/ordena.html" },
          { title: "Insertion Sort: passo a passo comentado", source: "João Arthur Brunet, UFCG", url: "https://joaoarthurbm.github.io/eda/posts/insertion-sort/" },
          { title: "Ordenação: introdução e algoritmos elementares (AEDS II)", source: "DCC, UFMG", url: "https://homepages.dcc.ufmg.br/~cunha/teaching/20121/aeds2/sorting-intro.pdf" },
          { title: "Sorting Techniques: estabilidade e ordenação por vários critérios", source: "docs.python.org", url: "https://docs.python.org/3/howto/sorting.html" },
          { title: "Bubble Sort", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/bubble-sort-algorithm/" },
        ],
      },
      {
        slug: "merge-sort",
        name: "Merge Sort",
        group: "Ordenação",
        level: "Médio",
        status: "ready",
        viz: "merge-sort",
        youtube: yt("lbktBOwmmhg"),
        videoMinutes: "3:14:02",
        readingTime: "13 min",
        language: "Python",
        description: "Divisão e conquista, estável, O(n log n).",
        problems: [
          { id: "lc-88", name: "Merge Sorted Array", number: "88", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/merge-sorted-array/" },
          { id: "lc-912", name: "Sort an Array", number: "912", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sort-an-array/" },
          { id: "lc-148", name: "Sort List", number: "148", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sort-list/" },
          { id: "lc-23", name: "Merge k Sorted Lists", number: "23", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/merge-k-sorted-lists/" },
          { id: "lc-493", name: "Reverse Pairs", number: "493", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/reverse-pairs/" },
          { id: "gfg-merge-sort", name: "Merge Sort: guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/merge-sort/" },
        ],
        references: [
          { title: "Mergesort", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/mrgsrt.html" },
          { title: "Merge Sort: dividir para conquistar, passo a passo", source: "João Arthur Brunet, UFCG", url: "https://joaoarthurbm.github.io/eda/posts/merge-sort/" },
          { title: "Merge sort e quicksort (MC-202)", source: "IC, UNICAMP", url: "https://www.ic.unicamp.br/~rafael/cursos/2s2018/mc202/slides/unidade23-merge-quick.pdf" },
          { title: "listsort.txt: como o Timsort do CPython funciona", source: "python/cpython", url: "https://github.com/python/cpython/blob/main/Objects/listsort.txt" },
          { title: "Merge Sort", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/merge-sort/" },
        ],
      },
      {
        slug: "quick-sort",
        name: "Quick Sort",
        group: "Ordenação",
        level: "Médio",
        status: "ready",
        viz: "quick-sort",
        youtube: yt("2T0Itw-oaEA"),
        videoMinutes: "1:58:04",
        readingTime: "13 min",
        language: "Python",
        description: "Particiona em torno de um pivô. O(n log n) na média.",
        problems: [
          { id: "lc-75", name: "Sort Colors", number: "75", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sort-colors/" },
          { id: "lc-912", name: "Sort an Array", number: "912", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sort-an-array/" },
          { id: "lc-215", name: "Kth Largest Element in an Array", number: "215", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/kth-largest-element-in-an-array/" },
          { id: "lc-347", name: "Top K Frequent Elements", number: "347", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/top-k-frequent-elements/" },
          { id: "lc-324", name: "Wiggle Sort II", number: "324", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/wiggle-sort-ii/" },
          { id: "gfg-quick-sort", name: "Quick Sort: guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/quick-sort-algorithm/" },
        ],
        references: [
          { title: "Quicksort", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/quick.html" },
          { title: "Particionamento de Hoare, passo a passo", source: "João Arthur Brunet, UFCG", url: "https://joaoarthurbm.github.io/eda/posts/particionamento-hoare/" },
          { title: "Quicksort: análise e escolha do pivô (AEDS II)", source: "DCC, UFMG", url: "https://homepages.dcc.ufmg.br/~cunha/teaching/20121/aeds2/quicksort.pdf" },
          { title: "Introsort: quando o quick sort desiste e chama o heap sort", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Introsort" },
          { title: "Quick Sort", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/quick-sort-algorithm/" },
        ],
      },
      {
        slug: "shell-sort",
        name: "Shell Sort",
        group: "Ordenação",
        level: "Médio",
        status: "ready",
        viz: "shell-sort",
        youtube: yt("symbT7Cgrr8"),
        videoMinutes: "1:58:45",
        readingTime: "12 min",
        language: "Python",
        description: "Insertion Sort turbinado com gap sequences.",
        problems: [
          { id: "lc-905", name: "Sort Array By Parity", number: "905", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/sort-array-by-parity/" },
          { id: "lc-912", name: "Sort an Array", number: "912", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sort-an-array/" },
          { id: "lc-1122", name: "Relative Sort Array", number: "1122", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/relative-sort-array/" },
          { id: "lc-274", name: "H-Index", number: "274", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/h-index/" },
          { id: "lc-315", name: "Count of Smaller Numbers After Self", number: "315", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/count-of-smaller-numbers-after-self/" },
          { id: "gfg-shell-sort", name: "Shell Sort: guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/shell-sort/" },
        ],
        references: [
          { title: "Shell sort: sequências de gaps e o que se sabe sobre cada uma", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Shellsort" },
          { title: "Shellsort (AEDS II)", source: "DCC, UFMG", url: "https://homepages.dcc.ufmg.br/~cunha/teaching/20121/aeds2/shellsort.pdf" },
          { title: "Ordenação: algoritmos elementares e o insertion sort de onde ele nasce", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/ordena.html" },
          { title: "Comparativo entre os algoritmos de ordenação (AEDS II)", source: "DCC, UFMG", url: "https://homepages.dcc.ufmg.br/~cunha/teaching/20121/aeds2/sortingcmp.pdf" },
          { title: "Shell Sort", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/shell-sort/" },
        ],
      },
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
        status: "ready",
        viz: "backtracking",
        isNew: true,
        youtube: yt("Vcm6mhLKU5A"),
        videoMinutes: "2:08:38",
        readingTime: "13 min",
        language: "Python",
        article: "https://craftcodeclub.io/posts/dsa-backtracking",
        description: "Tentar, falhar e voltar atrás, busca exaustiva com poda.",
        problems: [
          { id: "lc-78", name: "Subsets", number: "78", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/subsets/" },
          { id: "lc-46", name: "Permutations", number: "46", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/permutations/" },
          { id: "lc-79", name: "Word Search", number: "79", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/word-search/" },
          { id: "lc-51", name: "N-Queens", number: "51", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/n-queens/" },
          { id: "lc-37", name: "Sudoku Solver", number: "37", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/sudoku-solver/" },
          { id: "gfg-backtracking", name: "Backtracking: guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/introduction-to-backtracking-2/" },
        ],
        references: [
          { title: "Algoritmos de enumeração", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/enum.html" },
          { title: "Backtracking (MC-202)", source: "IC, UNICAMP", url: "https://www.ic.unicamp.br/~rafael/cursos/2s2018/mc202/slides/unidade09-backtracking.pdf" },
          { title: "Backtracking, capítulo do livro Algorithms", source: "Jeff Erickson, University of Illinois", url: "https://jeffe.cs.illinois.edu/teaching/algorithms/book/02-backtracking.pdf" },
          { title: "O problema das oito rainhas e a história dele", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Eight_queens_puzzle" },
          { title: "Introduction to Backtracking", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/introduction-to-backtracking-2/" },
        ],
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
      {
        slug: "binary-numbers",
        name: "Números Binários",
        group: "Manipulação de Bits",
        level: "Fácil",
        status: "ready",
        viz: "binary-numbers",
        isNew: true,
        youtube: yt("8VHi44rAVFo"),
        videoMinutes: "27:33",
        readingTime: "10 min",
        language: "Python",
        description: "O sistema binário e a conversão entre decimal e binário.",
        problems: [
          { id: "lc-191", name: "Number of 1 Bits", number: "191", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/number-of-1-bits/" },
          { id: "lc-67", name: "Add Binary", number: "67", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/add-binary/" },
          { id: "lc-405", name: "Convert a Number to Hexadecimal", number: "405", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/convert-a-number-to-hexadecimal/" },
          { id: "lc-338", name: "Counting Bits", number: "338", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/counting-bits/" },
          { id: "lc-1009", name: "Complement of Base 10 Integer", number: "1009", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/complement-of-base-10-integer/" },
          { id: "gfg-binary-numbers", name: "Sistemas de numeração e conversão de bases", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/number-system-and-base-conversions/" },
        ],
        references: [
          { title: "Bytes, números e caracteres", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/bytes.html" },
          { title: "Os tipos int e char", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/int.html" },
          { title: "Operações sobre bits em inteiros", source: "docs.python.org", url: "https://docs.python.org/3/library/stdtypes.html#bitwise-operations-on-integer-types" },
          { title: "Binary number: história e notação", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Binary_number" },
          { title: "Number System and Base Conversions", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/number-system-and-base-conversions/" },
        ],
      },
      {
        slug: "negative-binary",
        name: "Binários Negativos",
        group: "Manipulação de Bits",
        level: "Médio",
        status: "ready",
        viz: "negative-binary",
        isNew: true,
        youtube: yt("93CpmUXLbzc"),
        videoMinutes: "26:13",
        readingTime: "11 min",
        language: "Python",
        description: "Sign-magnitude, complemento de um e de dois.",
        problems: [
          { id: "lc-461", name: "Hamming Distance", number: "461", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/hamming-distance/" },
          { id: "lc-190", name: "Reverse Bits", number: "190", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/reverse-bits/" },
          { id: "lc-7", name: "Reverse Integer", number: "7", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/reverse-integer/" },
          { id: "lc-371", name: "Sum of Two Integers", number: "371", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sum-of-two-integers/" },
          { id: "lc-29", name: "Divide Two Integers", number: "29", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/divide-two-integers/" },
          { id: "gfg-complemento", name: "Complemento de um e de dois", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/1s-2s-complement-binary-number/" },
        ],
        references: [
          { title: "Os tipos int e char: representação e limites", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/int.html" },
          { title: "Two's complement: por que ela venceu", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Two%27s_complement" },
          { title: "O problema do ano 2038", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Year_2038_problem" },
          { title: "Operações sobre bits em inteiros", source: "docs.python.org", url: "https://docs.python.org/3/library/stdtypes.html#bitwise-operations-on-integer-types" },
          { title: "1's and 2's Complement of a Binary Number", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/1s-2s-complement-binary-number/" },
        ],
      },
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
// Conta TÓPICOS que já têm visualização, não o número de visualizadores na tela
// (um tópico pode embutir vários, como Big O e Sliding Window).
export const TOTAL_VISUALIZERS = ALL_TOPICS.filter((t) => t.viz).length;
export const TOTAL_PROBLEMS = ALL_TOPICS.reduce((n, t) => n + (t.problems?.length ?? 0), 0);
// Só os do LeetCode. Os textos de SEO citam "problemas do LeetCode" nominalmente,
// e prometer o total (que inclui GeeksforGeeks) seria contar duas fontes como uma.
export const TOTAL_LEETCODE_PROBLEMS = ALL_TOPICS.reduce(
  (n, t) => n + (t.problems?.filter((p) => p.source === "LeetCode").length ?? 0),
  0
);
// Tópicos que já têm alguma coisa para o aluno abrir. É o mesmo rigor do
// `TOTAL_LEETCODE_PROBLEMS` logo acima, aplicado à outra ponta: `TOTAL_TOPICS`
// conta a trilha inteira, e a trilha inclui os tópicos que o próprio site marca
// como "em breve" e tira do índice do Google por não terem vídeo, artigo nem
// visualização. Prometer o total onde a frase descreve o que a página entrega
// conta o que não existe.
//
// Deriva de `isEmptyTopic`, a MESMA função que decide o selo "em breve" no menu
// e o `noindex` da página, e não de uma cópia da regra: o número sobe sozinho no
// dia em que um tópico ganha material, sem ninguém lembrar de voltar aqui.
export const TOTAL_TOPICS_PRONTOS = ALL_TOPICS.filter((t) => !isEmptyTopic(t)).length;

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
// "Em breve" é derivado, nunca marcado à mão: some sozinho no dia em que o
// tópico ganha material. E material quer dizer as três coisas que a página
// entrega de verdade: vídeo do encontro, artigo ou visualização.
//
// `extraVideos` NÃO conta, de propósito. Eles são links para resoluções soltas
// de exercício, e um tópico que só tem isso continua sendo um tópico sem aula,
// sem texto e sem visualização. Contá-los tirava o selo de quem não tinha nada
// a mostrar, e ainda fazia a página entrar no índice do Google como conteúdo
// raso.
export function isEmptyTopic(t: Topic): boolean {
  return t.status === "soon" && !t.youtube && !t.article && !t.viz;
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
