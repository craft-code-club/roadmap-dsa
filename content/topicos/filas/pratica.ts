import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-232", name: "Implement Queue using Stacks", number: "232", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/implement-queue-using-stacks/" },
    { id: "lc-1700", name: "Number of Students Unable to Eat Lunch", number: "1700", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/number-of-students-unable-to-eat-lunch/" },
    { id: "lc-622", name: "Design Circular Queue", number: "622", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/design-circular-queue/" },
    { id: "lc-641", name: "Design Circular Deque", number: "641", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/design-circular-deque/" },
    { id: "lc-239", name: "Sliding Window Maximum", number: "239", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/sliding-window-maximum/" },
    { id: "lc-862", name: "Shortest Subarray with Sum at Least K", number: "862", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/shortest-subarray-with-sum-at-least-k/" },
    { id: "gfg-filas", name: "Queue Data Structure", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/queue-data-structure/" },
];

export const references: Reference[] = [
    { title: "Circular Queue: introdução e implementação com array", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/circular-queue-set-1-introduction-array-implementation/" },
    { title: "collections.deque: as duas pontas em O(1), e por que list.pop(0) é O(n)", source: "Python Docs", url: "https://docs.python.org/3/library/collections.html" },
    { title: "ArrayDeque: a fila de duas pontas sobre array do Java", source: "Java Docs", url: "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayDeque.html" },
    { title: "Sliding Window Maximum com deque monotônico", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/sliding-window-maximum-maximum-of-all-subarrays-of-size-k/" },
];
