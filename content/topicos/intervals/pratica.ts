import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-56", name: "Merge Intervals", number: "56", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/merge-intervals/" },
    { id: "lc-57", name: "Insert Interval", number: "57", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/insert-interval/" },
    { id: "lc-435", name: "Non-overlapping Intervals", number: "435", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/non-overlapping-intervals/" },
    { id: "lc-452", name: "Minimum Number of Arrows to Burst Balloons", number: "452", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/" },
    { id: "lc-1094", name: "Car Pooling", number: "1094", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/car-pooling/" },
    { id: "lc-2402", name: "Meeting Rooms III", number: "2402", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/meeting-rooms-iii/" },
    { id: "gfg-intervals", name: "Overlapping Intervals: fundir intervalos que se sobrepõem", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/merging-intervals/" },
];

export const references: Reference[] = [
    { title: "Overlapping Intervals: ordenar por início e fundir", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/merging-intervals/" },
    { title: "Insert in Sorted and Non-Overlapping Interval Array", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/insert-in-sorted-and-non-overlapping-interval-array/" },
    { title: "Maximum Number of Overlapping Intervals: a contagem por eventos", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/maximum-number-of-overlapping-intervals/" },
    { title: "Minimum Platforms Required: quando o empate muda a resposta", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/minimum-number-platforms-required-railwaybus-station/" },
];
