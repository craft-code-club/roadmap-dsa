import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-206", name: "Reverse Linked List", number: "206", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/reverse-linked-list/" },
    { id: "lc-876", name: "Middle of the Linked List", number: "876", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/middle-of-the-linked-list/" },
    { id: "lc-19", name: "Remove Nth Node From End of List", number: "19", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/remove-nth-node-from-end-of-list/" },
    { id: "lc-142", name: "Linked List Cycle II", number: "142", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/linked-list-cycle-ii/" },
    { id: "lc-146", name: "LRU Cache", number: "146", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/lru-cache/" },
    { id: "gfg-listas-ligadas", name: "Linked List Data Structure", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/linked-list-data-structure/" },
];

export const references: Reference[] = [
    { title: "Reverse a Linked List", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/reverse-a-linked-list/" },
    { title: "Doubly Linked List", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/doubly-linked-list/" },
    { title: "collections.deque: a deque do Python é uma lista duplamente encadeada de blocos", source: "Documentação do Python", url: "https://docs.python.org/3/library/collections.html#collections.deque" },
    { title: "LinkedList: a lista do Java é sempre duplamente encadeada", source: "Oracle Java Docs", url: "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/LinkedList.html" },
];
