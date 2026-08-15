import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "binary-heap",
  name: "Binary Heap",
  group: "Heaps",
  level: "Médio",
  status: "ready",
  viz: "binary-heap",
  youtube: "HVWw20nOLHk",
  videoMinutes: "2:21:46",
  readingTime: "12 min",
  language: "Python",
  description: "A fila de prioridade por trás do heap sort e do Dijkstra.",
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
    "A pergunta que o heap responde",
    "A regra, e o que ela não promete",
    "A árvore que mora dentro de um array",
    "Subir e descer: as duas únicas operações",
    "Construir um heap de uma vez custa O(n)",
    "Onde o heap já está rodando no seu código",
    "As armadilhas",
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
};
