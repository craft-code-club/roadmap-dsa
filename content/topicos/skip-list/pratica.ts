import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-703", name: "Kth Largest Element in a Stream", number: "703", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/kth-largest-element-in-a-stream/" },
    { id: "lc-707", name: "Design Linked List", number: "707", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/design-linked-list/" },
    { id: "lc-981", name: "Time Based Key-Value Store", number: "981", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/time-based-key-value-store/" },
    { id: "lc-1206", name: "Design Skiplist", number: "1206", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/design-skiplist/" },
    { id: "lc-295", name: "Find Median from Data Stream", number: "295", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/find-median-from-data-stream/" },
    { id: "gfg-skip-list", name: "Skip List: guia completo com busca, inserção e remoção", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/skip-list/" },
];

export const references: Reference[] = [
    { title: "Skip Lists: A Probabilistic Alternative to Balanced Trees (o artigo original)", source: "William Pugh, CACM 1990", url: "https://15721.courses.cs.cmu.edu/spring2018/papers/08-oltpindexes1/pugh-skiplists-cacm1990.pdf" },
    { title: "Skip List: o artigo do encontro", source: "Craft & Code Club", url: "https://craftcodeclub.io/posts/dsa-skip-list" },
    { title: "Sorted sets: tabela hash mais skip list na prática", source: "Redis Docs", url: "https://redis.io/docs/latest/develop/data-types/sorted-sets/" },
    { title: "ConcurrentSkipListMap: uma skip list na biblioteca padrão", source: "Oracle Java Docs", url: "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ConcurrentSkipListMap.html" },
];
