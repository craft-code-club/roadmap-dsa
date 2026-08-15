import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "quick-sort",
  name: "Quick Sort",
  group: "Ordenação",
  level: "Médio",
  status: "ready",
  viz: "quick-sort",
  youtube: "2T0Itw-oaEA",
  videoMinutes: "1:58:04",
  readingTime: "13 min",
  language: "Python",
  description: "Particiona em torno de um pivô. O(n log n) na média.",
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
    "Uma posição resolvida por partição",
    "A partição de Lomuto, e a invariante que ela mantém",
    "O pivô é a única decisão que importa",
    "Repetidos: o buraco que a partição de duas vias tem",
    "In-place, instável, e a pilha que ninguém conta",
    "Da recursão para a pilha explícita",
    "Quickselect: a mesma partição, sem ordenar tudo",
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
};
