import type { Problem, Reference } from "../index";

// Os problemas para praticar e as referências deste tópico.
//
// Separados do `index.ts` pela mesma razão que o `artigo.mdx`: o `index.ts`
// é importado por componente de cliente (a barra lateral precisa da lista de
// tópicos), e estas duas listas são 3/4 do peso do dado de um tópico — 64 KB
// dos 85 KB somando os 80 tópicos. Elas só aparecem na PÁGINA do tópico, que
// é servidor, e é `../pratica.ts` que as junta.

export const problems: Problem[] = [
    { id: "lc-20", name: "Valid Parentheses", number: "20", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/valid-parentheses/" },
    { id: "lc-682", name: "Baseball Game", number: "682", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/baseball-game/" },
    { id: "lc-155", name: "Min Stack", number: "155", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/min-stack/" },
    { id: "lc-150", name: "Evaluate Reverse Polish Notation", number: "150", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/evaluate-reverse-polish-notation/" },
    { id: "lc-739", name: "Daily Temperatures", number: "739", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/daily-temperatures/" },
    { id: "gfg-pilhas", name: "Stack Data Structure: o guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/stack-data-structure/" },
];

export const references: Reference[] = [
    { title: "Next Greater Element in Array", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/next-greater-element/" },
    { title: "Implement a stack using singly linked list", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/implement-a-stack-using-singly-linked-list/" },
    { title: "Evaluation of Postfix Expression", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/evaluation-of-postfix-expression/" },
    { title: "java.util.Deque: por que a classe Stack é legado", source: "Oracle", url: "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Deque.html" },
];
