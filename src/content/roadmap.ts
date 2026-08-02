// ---------------------------------------------------------------------------
// Roadmap DSA, modelo de conteúdo.
//
// Fonte: o roadmap oficial da comunidade Craft & Code Club (blog-c3/_content/roadmap/dsa.yml),
// trazido para cá, enriquecido e reagrupado no estilo do LeetCode: cada estrutura
// junto com as técnicas que operam sobre ela; os paradigmas transversais
// (Recursão, Backtracking, Programação Dinâmica, Greedy Algorithms) como grupos próprios.
//
// Tópicos ainda sem tratamento visual completo ficam com status "soon", mas a
// página já mostra o vídeo do canal e o link do artigo, então nunca fica vazia.
// Basta virar o status para "ready" e escrever o corpo em src/content/topics/.
// ---------------------------------------------------------------------------

export type Nivel = "Fácil" | "Médio" | "Difícil";
export type Fonte = "LeetCode" | "GeeksforGeeks";

export type Problema = {
  id: string; // estável, usado como chave no localStorage
  nome: string;
  numero?: string; // ex.: "209"
  fonte: Fonte;
  nivel: Nivel | "Guia";
  url: string;
};

export type Visualizador = "janela-fixa" | "janela-dinamica" | "dois-ponteiros";

// Vídeos extras de um tópico: aparecem como links clicáveis (não embed). Aceita
// tanto um id do YouTube quanto uma URL qualquer.
export type VideoLink = { titulo: string; youtube?: string; url?: string; duracao?: string };

// Referências / "leia mais": links para artigos (do blog ou de qualquer site).
// Aparecem como links clicáveis numa seção "Referências".
export type Referencia = { titulo: string; url: string; fonte?: string };

export type Topico = {
  slug: string;
  nome: string;
  grupo: string;
  nivel: Nivel;
  descricao: string;
  status: "ready" | "soon";
  youtube?: string; // id do vídeo
  minutosVideo?: string;
  artigo?: string; // url do artigo/aula no blog
  repo?: string; // implementação de referência
  viz?: Visualizador;
  problemas?: Problema[];
  tempoLeitura?: string;
  linguagem?: string;
  videosExtras?: VideoLink[];
  referencias?: Referencia[];
};

export type Grupo = { id: string; nome: string; topicos: Topico[] };

const yt = (id: string) => id;

export const GRUPOS: Grupo[] = [
  {
    id: "introducao",
    nome: "Introdução",
    topicos: [
      { slug: "big-o", nome: "Notação Big O", grupo: "Introdução", nivel: "Fácil", status: "soon", youtube: yt("MtLv9Rwb55Q"), descricao: "Como medir tempo e espaço de um algoritmo sem cronômetro." },
    ],
  },
  {
    id: "arrays-strings",
    nome: "Arrays e Strings",
    topicos: [
      { slug: "arrays", nome: "Arrays e Listas", grupo: "Arrays e Strings", nivel: "Fácil", status: "soon", youtube: yt("c95xvXCU34A"), descricao: "A estrutura sequencial base: acesso por índice em O(1)." },
      { slug: "strings", nome: "Strings", grupo: "Arrays e Strings", nivel: "Fácil", status: "soon", youtube: yt("B9CCEwjoXBk"), descricao: "Manipulação e processamento de texto e caracteres.", videosExtras: [{ titulo: "LeetCode 1704: Determine if String Halves Are Alike", youtube: "qtPcJclLlmI" }] },
      {
        slug: "dois-ponteiros",
        nome: "Dois Ponteiros",
        grupo: "Arrays e Strings",
        nivel: "Fácil",
        status: "ready",
        viz: "dois-ponteiros",
        youtube: yt("a1QMdXgcQwY"),
        minutosVideo: "16:40",
        tempoLeitura: "8 min",
        linguagem: "Python",
        descricao: "Dois índices caminhando na mesma passada. Em array ordenado, um começa na ponta esquerda e o outro na direita, e eles convergem.",
        problemas: [
          { id: "lc-167", nome: "Two Sum II - Input Array Is Sorted", numero: "167", fonte: "LeetCode", nivel: "Médio", url: "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/" },
          { id: "lc-125", nome: "Valid Palindrome", numero: "125", fonte: "LeetCode", nivel: "Fácil", url: "https://leetcode.com/problems/valid-palindrome/" },
          { id: "lc-11", nome: "Container With Most Water", numero: "11", fonte: "LeetCode", nivel: "Médio", url: "https://leetcode.com/problems/container-with-most-water/" },
          { id: "lc-15", nome: "3Sum", numero: "15", fonte: "LeetCode", nivel: "Médio", url: "https://leetcode.com/problems/3sum/" },
          { id: "lc-26", nome: "Remove Duplicates from Sorted Array", numero: "26", fonte: "LeetCode", nivel: "Fácil", url: "https://leetcode.com/problems/remove-duplicates-from-sorted-array/" },
        ],
        referencias: [
          { titulo: "Two Pointers Technique", fonte: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/two-pointers-technique/" },
          { titulo: "Two Pointers: capítulo do LeetCode Explore", fonte: "LeetCode", url: "https://leetcode.com/explore/learn/card/fun-with-arrays/527/searching-for-items-in-an-array/" },
        ],
      },
      {
        slug: "janela-deslizante-fixa",
        nome: "Janela Deslizante (Fixa)",
        grupo: "Arrays e Strings",
        nivel: "Médio",
        status: "ready",
        viz: "janela-fixa",
        youtube: yt("OvIJw1AMNzI"),
        minutosVideo: "18:24",
        tempoLeitura: "9 min",
        linguagem: "Python",
        descricao: "Tamanho travado em k: entra um elemento pela direita, sai um pela esquerda. O(n) sem refazer conta.",
        problemas: [
          { id: "lc-643", nome: "Maximum Average Subarray I", numero: "643", fonte: "LeetCode", nivel: "Fácil", url: "https://leetcode.com/problems/maximum-average-subarray-i/" },
          { id: "lc-1343", nome: "Sub-arrays of Size K with Average ≥ Threshold", numero: "1343", fonte: "LeetCode", nivel: "Médio", url: "https://leetcode.com/problems/number-of-sub-arrays-of-size-k-and-average-greater-than-or-equal-to-threshold/" },
          { id: "lc-1456", nome: "Maximum Number of Vowels in a Substring of Given Length", numero: "1456", fonte: "LeetCode", nivel: "Médio", url: "https://leetcode.com/problems/maximum-number-of-vowels-in-a-substring-of-given-length/" },
          { id: "lc-567", nome: "Permutation in String", numero: "567", fonte: "LeetCode", nivel: "Médio", url: "https://leetcode.com/problems/permutation-in-string/" },
          { id: "lc-239", nome: "Sliding Window Maximum", numero: "239", fonte: "LeetCode", nivel: "Difícil", url: "https://leetcode.com/problems/sliding-window-maximum/" },
          { id: "gfg-sliding", nome: "Window Sliding Technique", fonte: "GeeksforGeeks", nivel: "Guia", url: "https://www.geeksforgeeks.org/window-sliding-technique/" },
        ],
      },
      {
        slug: "janela-deslizante-dinamica",
        nome: "Janela Deslizante (Dinâmica)",
        grupo: "Arrays e Strings",
        nivel: "Médio",
        status: "ready",
        viz: "janela-dinamica",
        youtube: yt("OvIJw1AMNzI"),
        minutosVideo: "18:24",
        tempoLeitura: "11 min",
        linguagem: "Python",
        descricao: "A direita sempre avança; a esquerda encolhe só enquanto a janela é inválida. Resolve 'maior substring sem repetir' e 'menor subarray com soma ≥ alvo'.",
        problemas: [
          { id: "lc-3", nome: "Longest Substring Without Repeating Characters", numero: "3", fonte: "LeetCode", nivel: "Médio", url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/" },
          { id: "lc-209", nome: "Minimum Size Subarray Sum", numero: "209", fonte: "LeetCode", nivel: "Médio", url: "https://leetcode.com/problems/minimum-size-subarray-sum/" },
          { id: "lc-1004", nome: "Max Consecutive Ones III", numero: "1004", fonte: "LeetCode", nivel: "Médio", url: "https://leetcode.com/problems/max-consecutive-ones-iii/" },
          { id: "lc-713", nome: "Subarray Product Less Than K", numero: "713", fonte: "LeetCode", nivel: "Médio", url: "https://leetcode.com/problems/subarray-product-less-than-k/" },
          { id: "lc-76", nome: "Minimum Window Substring", numero: "76", fonte: "LeetCode", nivel: "Difícil", url: "https://leetcode.com/problems/minimum-window-substring/" },
        ],
      },
      { slug: "prefix-sum", nome: "Prefix Sum", grupo: "Arrays e Strings", nivel: "Médio", status: "soon", youtube: yt("yMnLofkS7DM"), descricao: "Somas de intervalo em tempo constante depois de um pré-processamento." },
      { slug: "intervals", nome: "Intervalos", grupo: "Arrays e Strings", nivel: "Médio", status: "soon", descricao: "Merge, insert e agendamento: ordenar por início e varrer os intervalos." },
    ],
  },
  {
    id: "hashing",
    nome: "Hashing",
    topicos: [
      { slug: "hash-table", nome: "Tabelas Hash", grupo: "Hashing", nivel: "Médio", status: "soon", youtube: yt("JFhdCBrKTX0"), descricao: "Busca, inserção e remoção em O(1) amortizado, quase sempre. Contagem e frequência.", videosExtras: [{ titulo: "LeetCode 1347: Minimum Steps to Make Two Strings Anagram", youtube: "55OYGLEj0Dw" }] },
    ],
  },
  {
    id: "listas",
    nome: "Listas Encadeadas",
    topicos: [
      { slug: "listas-ligadas", nome: "Listas Encadeadas", grupo: "Listas Encadeadas", nivel: "Fácil", status: "soon", youtube: yt("j0E5hJZ__EA"), descricao: "Nós apontando para nós. Ponteiro rápido e lento, sentinelas e detecção de ciclos." },
      { slug: "skip-list", nome: "Skip List", grupo: "Listas Encadeadas", nivel: "Difícil", status: "soon", youtube: yt("R9sVLuJ7FSg"), artigo: "https://craftcodeclub.io/posts/dsa-skip-list", descricao: "Lista encadeada em níveis: busca probabilística eficiente." },
    ],
  },
  {
    id: "pilhas-filas",
    nome: "Pilhas e Filas",
    topicos: [
      { slug: "pilhas", nome: "Pilhas (Stacks)", grupo: "Pilhas e Filas", nivel: "Fácil", status: "soon", youtube: yt("JRbrNgsYuT0"), descricao: "LIFO: parênteses balanceados e próximo maior elemento (pilha monotônica)." },
      { slug: "filas", nome: "Filas e Deques", grupo: "Pilhas e Filas", nivel: "Fácil", status: "soon", youtube: yt("KJaVKLZsMcg"), descricao: "FIFO e a fila de duas pontas para a janela com máximo." },
    ],
  },
  {
    id: "recursao",
    nome: "Recursão",
    topicos: [
      { slug: "recursao", nome: "Recursão: Fundamentos", grupo: "Recursão", nivel: "Médio", status: "soon", youtube: yt("KkSAaQHCkSE"), descricao: "Funções que chamam a si mesmas, sem medo do stack." },
      { slug: "recursao-funcional", nome: "Recursão: Programação Funcional", grupo: "Recursão", nivel: "Médio", status: "soon", youtube: yt("rbEYjJdaIZI"), descricao: "Recursão de cauda e o estilo funcional." },
    ],
  },
  {
    id: "arvores",
    nome: "Árvores",
    topicos: [
      { slug: "tree-traversals", nome: "Percursos em Árvore (DFS/BFS)", grupo: "Árvores", nivel: "Médio", status: "soon", youtube: yt("_-2F65OVWjo"), descricao: "Pré, in, pós-ordem e por nível." },
      { slug: "arvores-binarias", nome: "Árvores Binárias", grupo: "Árvores", nivel: "Médio", status: "soon", youtube: yt("OAcm2rXqz9M"), descricao: "Recursão estrutural sobre dois filhos.", videosExtras: [{ titulo: "LeetCode 2385: Amount of Time for a Binary Tree to Be Infected", youtube: "jshM7d1P8IY" }] },
      { slug: "n-ary-trees", nome: "Árvores N-árias", grupo: "Árvores", nivel: "Médio", status: "soon", youtube: yt("FLZxMQFTqvY"), descricao: "Nós com qualquer número de filhos." },
      { slug: "bst", nome: "Árvore de Busca Binária", grupo: "Árvores", nivel: "Médio", status: "soon", youtube: yt("CITquySB4ls"), descricao: "Ordem invariante para busca em O(log n)." },
      { slug: "trie", nome: "Trie (Árvore de Prefixos)", grupo: "Árvores", nivel: "Médio", status: "soon", descricao: "Árvore de prefixos para busca de strings, autocomplete e dicionários." },
    ],
  },
  {
    id: "grafos",
    nome: "Grafos",
    topicos: [
      { slug: "grafos-intro", nome: "Introdução a Grafos", grupo: "Grafos", nivel: "Médio", status: "soon", youtube: yt("cILrU-dtuEc"), descricao: "Vértices, arestas e representação (matriz / lista de adjacência)." },
      { slug: "dfs-bfs", nome: "DFS e BFS em Grafos", grupo: "Grafos", nivel: "Médio", status: "soon", youtube: yt("sCT-_EjbVqQ"), descricao: "Os dois jeitos de percorrer um grafo." },
      { slug: "dijkstra", nome: "Dijkstra", grupo: "Grafos", nivel: "Difícil", status: "soon", youtube: yt("b4kWEWtCVzA"), artigo: "https://craftcodeclub.io/posts/dsa-dijkstra", descricao: "Caminho mais curto com pesos não-negativos." },
      { slug: "bellman-ford", nome: "Bellman-Ford", grupo: "Grafos", nivel: "Difícil", status: "soon", youtube: yt("0GcXgQTpYcE"), artigo: "https://craftcodeclub.io/posts/dsa-bellman-ford", descricao: "Caminho mais curto que aceita pesos negativos." },
      { slug: "a-star", nome: "A* (A Estrela)", grupo: "Grafos", nivel: "Difícil", status: "soon", youtube: yt("0PYx7erkdXo"), artigo: "https://craftcodeclub.io/posts/dsa-a-star", descricao: "Pathfinding guiado por heurística." },
      { slug: "floyd-warshall", nome: "Floyd-Warshall (APSP)", grupo: "Grafos", nivel: "Difícil", status: "soon", descricao: "Menor caminho entre todos os pares de vértices, em O(V³)." },
      { slug: "topological-sort", nome: "Ordenação Topológica", grupo: "Grafos", nivel: "Médio", status: "soon", youtube: yt("4fTjXqcMFtk"), artigo: "https://craftcodeclub.io/posts/dsa-topological-sorting", descricao: "Ordem linear de um DAG (Kahn e DFS)." },
      { slug: "mst", nome: "Árvore Geradora Mínima (MST)", grupo: "Grafos", nivel: "Difícil", status: "soon", youtube: yt("a9iI9N4FLsg"), artigo: "https://craftcodeclub.io/posts/dsa-mst", descricao: "Conectar tudo com o menor custo: Kruskal e Prim." },
      { slug: "grafos-avancados", nome: "Grafos Avançados", grupo: "Grafos", nivel: "Difícil", status: "soon", descricao: "Componentes fortemente conexos, pontes, pontos de articulação e union-find." },
    ],
  },
  {
    id: "heaps",
    nome: "Heaps",
    topicos: [
      { slug: "binary-heap", nome: "Binary Heap", grupo: "Heaps", nivel: "Médio", status: "soon", youtube: yt("HVWw20nOLHk"), descricao: "A fila de prioridade por trás do heap sort e do Dijkstra." },
      { slug: "heap-sort", nome: "Heap Sort", grupo: "Heaps", nivel: "Médio", status: "soon", youtube: yt("wUfOyKMjamM"), descricao: "Ordenar com um heap em O(n log n)." },
    ],
  },
  {
    id: "busca-binaria",
    nome: "Busca Binária",
    topicos: [
      { slug: "busca-binaria", nome: "Busca Binária", grupo: "Busca Binária", nivel: "Médio", status: "soon", youtube: yt("62ZGcXDpbys"), descricao: "Corte o espaço de busca pela metade a cada passo: O(log n)." },
      { slug: "busca-binaria-avancada", nome: "Busca Binária no Espaço de Respostas", grupo: "Busca Binária", nivel: "Difícil", status: "soon", descricao: "Binary search on answer: achar a fronteira de uma condição monotônica, não um valor." },
    ],
  },
  {
    id: "ordenacao",
    nome: "Ordenação",
    topicos: [
      { slug: "ordenacao-basica", nome: "Ordenação Básica", grupo: "Ordenação", nivel: "Fácil", status: "soon", youtube: yt("GxhxsbbzaTI"), descricao: "Bubble, Selection e Insertion Sort, os O(n²) que ensinam a base." },
      { slug: "merge-sort", nome: "Merge Sort", grupo: "Ordenação", nivel: "Médio", status: "soon", youtube: yt("lbktBOwmmhg"), descricao: "Divisão e conquista, estável, O(n log n)." },
      { slug: "quick-sort", nome: "Quick Sort", grupo: "Ordenação", nivel: "Médio", status: "soon", youtube: yt("2T0Itw-oaEA"), descricao: "Particiona em torno de um pivô. O(n log n) na média." },
      { slug: "shell-sort", nome: "Shell Sort", grupo: "Ordenação", nivel: "Médio", status: "soon", youtube: yt("symbT7Cgrr8"), descricao: "Insertion Sort turbinado com gap sequences." },
      { slug: "counting-sort", nome: "Counting Sort", grupo: "Ordenação", nivel: "Médio", status: "soon", descricao: "Ordenação linear por contagem, sem comparações, para inteiros num intervalo." },
      { slug: "radix-sort", nome: "Radix Sort", grupo: "Ordenação", nivel: "Médio", status: "soon", descricao: "Ordena dígito a dígito usando counting sort como base." },
      { slug: "bucket-sort", nome: "Bucket Sort", grupo: "Ordenação", nivel: "Médio", status: "soon", descricao: "Distribui em baldes, ordena cada um e concatena." },
    ],
  },
  {
    id: "backtracking",
    nome: "Backtracking",
    topicos: [
      {
        slug: "backtracking",
        nome: "Backtracking",
        grupo: "Backtracking",
        nivel: "Difícil",
        status: "soon",
        youtube: yt("Vcm6mhLKU5A"),
        artigo: "https://craftcodeclub.io/posts/dsa-backtracking",
        descricao: "Tentar, falhar e voltar atrás, busca exaustiva com poda.",
        videosExtras: [
          { titulo: "Desvendando Backtracking", youtube: "GavxeYye6sg" },
          { titulo: "Na prática: Sudoku (corte)", youtube: "ThOaYVhOmbc" },
          { titulo: "Na prática: Subconjuntos (corte)", youtube: "XosFW0k6f4s" },
          { titulo: "Na prática: Permutações (corte)", youtube: "h-u27COo_zg" },
          { titulo: "LeetCode 401: Binary Watch", youtube: "FOmERYScrOE" },
        ],
      },
    ],
  },
  {
    id: "dp",
    nome: "Programação Dinâmica",
    topicos: [
      {
        slug: "programacao-dinamica",
        nome: "Programação Dinâmica",
        grupo: "Programação Dinâmica",
        nivel: "Difícil",
        status: "soon",
        descricao: "Memoização, tabulação e o desafio de enxergar o estado. 1D e multidimensional.",
        videosExtras: [
          { titulo: "LeetCode 198: House Robber", youtube: "3sNdSrUmMMU" },
          { titulo: "LeetCode 300: Longest Increasing Subsequence", youtube: "W16dkNqcgBU" },
          { titulo: "LeetCode 1531: String Compression II", youtube: "miGhslmrxeE" },
        ],
      },
    ],
  },
  {
    id: "greedy",
    nome: "Greedy Algorithms",
    topicos: [
      { slug: "greedy", nome: "Greedy Algorithms", grupo: "Greedy Algorithms", nivel: "Médio", status: "soon", descricao: "Algoritmos gulosos: quando a escolha local ótima leva à global." },
    ],
  },
  {
    id: "bits",
    nome: "Manipulação de Bits",
    topicos: [
      { slug: "binary-numbers", nome: "Números Binários", grupo: "Manipulação de Bits", nivel: "Fácil", status: "soon", youtube: yt("8VHi44rAVFo"), descricao: "O sistema binário e a conversão decimal ⇄ binário." },
      { slug: "negative-binary", nome: "Binários Negativos", grupo: "Manipulação de Bits", nivel: "Médio", status: "soon", youtube: yt("93CpmUXLbzc"), descricao: "Sign-magnitude, complemento de um e de dois." },
      { slug: "operacoes-bitwise", nome: "Operações Bitwise", grupo: "Manipulação de Bits", nivel: "Médio", status: "soon", descricao: "AND, OR, XOR, shifts e os truques de bit mais usados em entrevistas." },
    ],
  },
  {
    id: "matematica",
    nome: "Matemática",
    topicos: [
      { slug: "matematica", nome: "Matemática", grupo: "Matemática", nivel: "Difícil", status: "soon", descricao: "GCD/LCM, números primos, exponenciação rápida e teoria dos números." },
    ],
  },
];

// ------------------------------ helpers ------------------------------

export const TODOS_TOPICOS: Topico[] = GRUPOS.flatMap((g) => g.topicos);

export const TOTAL_TOPICOS = TODOS_TOPICOS.length;
export const TOTAL_VISUALIZADORES = TODOS_TOPICOS.filter((t) => t.viz).length;
export const TOTAL_PROBLEMAS = TODOS_TOPICOS.reduce((n, t) => n + (t.problemas?.length ?? 0), 0);

export function getTopico(slug: string): Topico | undefined {
  return TODOS_TOPICOS.find((t) => t.slug === slug);
}

// Tags de conteúdo mostradas nos cards do roadmap: o que cada tópico já tem.
export type TagTipo = "visual" | "artigo" | "video" | "exercicios";
export type Tag = { tipo: TagTipo; label: string };

export function tagsDoTopico(t: Topico): Tag[] {
  const tags: Tag[] = [];
  if (t.viz) tags.push({ tipo: "visual", label: "Visualização" });
  if (t.status === "ready" || t.artigo) tags.push({ tipo: "artigo", label: "Artigo" });
  if (t.youtube || (t.videosExtras && t.videosExtras.length)) tags.push({ tipo: "video", label: "Vídeo" });
  if (t.problemas && t.problemas.length) tags.push({ tipo: "exercicios", label: "Exercícios" });
  return tags;
}

export function getVizinhos(slug: string): { anterior?: Topico; proximo?: Topico } {
  const i = TODOS_TOPICOS.findIndex((t) => t.slug === slug);
  if (i < 0) return {};
  return { anterior: TODOS_TOPICOS[i - 1], proximo: TODOS_TOPICOS[i + 1] };
}

export const DESTAQUES: string[] = [
  "janela-deslizante-fixa",
  "dois-ponteiros",
  "big-o",
  "busca-binaria",
  "dfs-bfs",
  "programacao-dinamica",
];
