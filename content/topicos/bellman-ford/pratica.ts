import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-787", name: "Cheapest Flights Within K Stops", number: "787", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/cheapest-flights-within-k-stops/" },
    { id: "lc-743", name: "Network Delay Time", number: "743", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/network-delay-time/" },
    { id: "lc-1928", name: "Minimum Cost to Reach Destination in Time", number: "1928", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/minimum-cost-to-reach-destination-in-time/" },
    { id: "lc-2093", name: "Minimum Cost to Reach City With Discounts", number: "2093", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/minimum-cost-to-reach-city-with-discounts/" },
    { id: "gfg-bellman-ford", name: "Bellman-Ford Algorithm", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/bellman-ford-algorithm-dp-23/" },
];

export const references: Reference[] = [
    { title: "Bellman-Ford: relaxamento e ciclo negativo", source: "Craft & Code Club", url: "https://craftcodeclub.io/posts/dsa-bellman-ford" },
    { title: "Bellman-Ford Algorithm", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/bellman-ford-algorithm-dp-23/" },
    { title: "Detect a negative cycle in a Graph", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/detect-negative-cycle-graph-bellman-ford/" },
    { title: "Johnson's algorithm: Bellman-Ford + Dijkstra", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/johnsons-algorithm/" },
];
