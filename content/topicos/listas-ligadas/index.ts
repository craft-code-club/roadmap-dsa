import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "listas-ligadas",
  name: "Listas Encadeadas",
  group: "Listas Encadeadas",
  level: "Fácil",
  status: "ready",
  viz: "listas-ligadas",
  youtube: "j0E5hJZ__EA",
  videoMinutes: "2:00:47",
  readingTime: "23 min",
  language: "Python",
  description: "Nós apontando para nós. Ponteiro rápido e lento, sentinelas e detecção de ciclos.",
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
    "O nó: um valor e um endereço",
    "Contígua ou espalhada: onde cada estrutura mora na memória",
    "Religar ponteiros: inserir, remover e buscar",
    "A tabela de custos, operação por operação",
    "Duplamente encadeada, circular e o preço de andar para trás",
    "O nó sentinela elimina o caso especial da cabeça",
    "Inverter a lista: a dança dos três ponteiros",
    "Rápido e lento: achar o meio sem saber o tamanho",
    "Floyd: existe ciclo, e onde ele começa",
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
    { id: "lc-206", name: "Reverse Linked List", number: "206", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/reverse-linked-list/" },
    { id: "lc-876", name: "Middle of the Linked List", number: "876", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/middle-of-the-linked-list/" },
    { id: "lc-19", name: "Remove Nth Node From End of List", number: "19", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/remove-nth-node-from-end-of-list/" },
    { id: "lc-142", name: "Linked List Cycle II", number: "142", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/linked-list-cycle-ii/" },
    { id: "lc-146", name: "LRU Cache", number: "146", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/lru-cache/" },
    { id: "gfg-listas-ligadas", name: "Linked List Data Structure", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/linked-list-data-structure/" },
  ],

  references: [
    { title: "Reverse a Linked List", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/reverse-a-linked-list/" },
    { title: "Doubly Linked List", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/doubly-linked-list/" },
    { title: "collections.deque: a deque do Python é uma lista duplamente encadeada de blocos", source: "Documentação do Python", url: "https://docs.python.org/3/library/collections.html#collections.deque" },
    { title: "LinkedList: a lista do Java é sempre duplamente encadeada", source: "Oracle Java Docs", url: "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/LinkedList.html" },
  ],
};
