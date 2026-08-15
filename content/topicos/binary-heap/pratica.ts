import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-1046", name: "Last Stone Weight", number: "1046", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/last-stone-weight/" },
    { id: "lc-703", name: "Kth Largest Element in a Stream", number: "703", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/kth-largest-element-in-a-stream/" },
    { id: "lc-215", name: "Kth Largest Element in an Array", number: "215", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/kth-largest-element-in-an-array/" },
    { id: "lc-973", name: "K Closest Points to Origin", number: "973", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/k-closest-points-to-origin/" },
    { id: "lc-621", name: "Task Scheduler", number: "621", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/task-scheduler/" },
    { id: "lc-23", name: "Merge k Sorted Lists", number: "23", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/merge-k-sorted-lists/" },
    { id: "gfg-binary-heap", name: "Binary Heap: guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/binary-heap/" },
];

export const references: Reference[] = [
    { title: "Heap: fila de prioridade sobre vetor", source: "João Arthur Brunet, UFCG", url: "https://joaoarthurbm.github.io/eda/posts/heap/" },
    { title: "Filas de Prioridade e Heap (MC-202)", source: "IC, UNICAMP", url: "https://www.ic.unicamp.br/~rafael/cursos/2s2018/mc202/slides/unidade21-fila-de-prioridade.pdf" },
    { title: "Heap Binário: implementação e operações (MC-202)", source: "IC, UNICAMP", url: "https://www.ic.unicamp.br/~afalcao/mc202/HeapBinario.pdf" },
    { title: "Binary Heap", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/binary-heap/" },
    { title: "heapq: algoritmo de fila de prioridade na biblioteca padrão", source: "docs.python.org", url: "https://docs.python.org/3/library/heapq.html" },
];
