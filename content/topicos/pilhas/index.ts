import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "pilhas",
  name: "Pilhas (Stacks)",
  group: "Pilhas e Filas",
  level: "Fácil",
  status: "ready",
  viz: "pilhas",
  youtube: "JRbrNgsYuT0",
  videoMinutes: "2:26:51",
  readingTime: "17 min",
  language: "Python",
  description: "LIFO: parênteses balanceados e próximo maior elemento (pilha monotônica).",
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
    "Uma lista com uma porta só",
    "push, pop e peek: tudo acontece no topo",
    "Pilha sobre array: um ponteiro que sobe e desce",
    "Pilha sobre lista ligada: sem resize, com um ponteiro a mais",
    "Parênteses balanceados: o primeiro problema de verdade",
    "A pilha que você já usava sem saber: a call stack",
    "Inverter, desfazer e avaliar: três padrões diretos",
    "Pilha monotônica: o próximo maior elemento em O(n)",
    "As armadilhas que pegam todo mundo",
    "Como praticar",
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
    { id: "lc-20", name: "Valid Parentheses", number: "20", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/valid-parentheses/" },
    { id: "lc-682", name: "Baseball Game", number: "682", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/baseball-game/" },
    { id: "lc-155", name: "Min Stack", number: "155", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/min-stack/" },
    { id: "lc-150", name: "Evaluate Reverse Polish Notation", number: "150", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/evaluate-reverse-polish-notation/" },
    { id: "lc-739", name: "Daily Temperatures", number: "739", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/daily-temperatures/" },
    { id: "gfg-pilhas", name: "Stack Data Structure: o guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/stack-data-structure/" },
  ],

  references: [
    { title: "Next Greater Element in Array", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/next-greater-element/" },
    { title: "Implement a stack using singly linked list", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/implement-a-stack-using-singly-linked-list/" },
    { title: "Evaluation of Postfix Expression", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/evaluation-of-postfix-expression/" },
    { title: "java.util.Deque: por que a classe Stack é legado", source: "Oracle", url: "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Deque.html" },
  ],
};
