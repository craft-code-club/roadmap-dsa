import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-743", name: "Network Delay Time", number: "743", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/network-delay-time/" },
    { id: "lc-1631", name: "Path With Minimum Effort", number: "1631", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/path-with-minimum-effort/" },
    { id: "lc-1514", name: "Path with Maximum Probability", number: "1514", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/path-with-maximum-probability/" },
    { id: "lc-778", name: "Swim in Rising Water", number: "778", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/swim-in-rising-water/" },
    { id: "lc-787", name: "Cheapest Flights Within K Stops", number: "787", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/cheapest-flights-within-k-stops/" },
    { id: "gfg-dijkstra", name: "Dijkstra's Shortest Path Algorithm", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/dijkstras-shortest-path-algorithm-greedy-algo-7/" },
];

export const references: Reference[] = [
    { title: "Dijkstra: caminho mínimo passo a passo", source: "Craft & Code Club", url: "https://craftcodeclub.io/posts/dsa-dijkstra" },
    { title: "Dijkstra's Shortest Path Algorithm", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/dijkstras-shortest-path-algorithm-greedy-algo-7/" },
    { title: "heapq: a fila de prioridade do Python", source: "Documentação do Python", url: "https://docs.python.org/3/library/heapq.html" },
    { title: "Why Dijkstra fails with negative weights", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/why-does-dijkstras-algorithm-fail-on-negative-weights/" },
];
