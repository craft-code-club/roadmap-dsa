import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "tree-traversals",
  name: "Percursos em Árvore (DFS/BFS)",
  group: "Árvores",
  level: "Médio",
  status: "ready",
  viz: "tree-traversals",
  youtube: "_-2F65OVWjo",
  videoMinutes: "1:49:46",
  readingTime: "12 min",
  language: "Python",
  description: "Pré, in, pós-ordem e por nível.",
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
    "Duas famílias, uma decisão",
    "Uma árvore, quatro respostas",
    "O truque das três visitas",
    "O template: uma linha muda tudo",
    "Pré-ordem: quando o pai precisa existir antes do filho",
    "Em ordem: o percurso que ordena",
    "Pós-ordem: quando o pai depende dos filhos",
    "BFS: quando o que importa é a distância",
    "O custo: por que o espaço não é o mesmo",
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
    { id: "lc-94", name: "Binary Tree Inorder Traversal", number: "94", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/binary-tree-inorder-traversal/" },
    { id: "lc-104", name: "Maximum Depth of Binary Tree", number: "104", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/maximum-depth-of-binary-tree/" },
    { id: "lc-101", name: "Symmetric Tree", number: "101", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/symmetric-tree/" },
    { id: "lc-102", name: "Binary Tree Level Order Traversal", number: "102", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/binary-tree-level-order-traversal/" },
    { id: "lc-199", name: "Binary Tree Right Side View", number: "199", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/binary-tree-right-side-view/" },
    { id: "gfg-tree-traversal", name: "Tree Traversals (Inorder, Preorder e Postorder)", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/tree-traversals-inorder-preorder-and-postorder/" },
  ],

  references: [
    { title: "Tree Traversals (Inorder, Preorder e Postorder)", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/tree-traversals-inorder-preorder-and-postorder/" },
    { title: "Level Order Traversal (BFS em árvore)", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/level-order-tree-traversal/" },
    { title: "Inorder Tree Traversal without Recursion", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/inorder-tree-traversal-without-recursion/" },
    { title: "collections.deque: a fila usada no BFS", source: "Documentação do Python", url: "https://docs.python.org/3/library/collections.html#collections.deque" },
  ],
};
