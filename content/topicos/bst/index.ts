import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "bst",
  name: "Árvore de Busca Binária",
  group: "Árvores",
  level: "Médio",
  status: "ready",
  viz: "bst",
  youtube: "CITquySB4ls",
  videoMinutes: "2:13:44",
  readingTime: "12 min",
  language: "Python",
  description: "Ordem invariante para busca em O(log n).",
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
    "A invariante, e o que ela compra",
    "Buscar e inserir são o mesmo passeio",
    "Em ordem devolve a ordem",
    "Remover: os três casos",
    "A letra miúda: dado ordenado destrói a árvore",
    "Balanceamento: as três saídas",
    "A armadilha de validar uma BST",
    "BST ou tabela hash?",
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
    { id: "lc-700", name: "Search in a Binary Search Tree", number: "700", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/search-in-a-binary-search-tree/" },
    { id: "lc-701", name: "Insert into a Binary Search Tree", number: "701", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/insert-into-a-binary-search-tree/" },
    { id: "lc-98", name: "Validate Binary Search Tree", number: "98", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/validate-binary-search-tree/" },
    { id: "lc-230", name: "Kth Smallest Element in a BST", number: "230", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/kth-smallest-element-in-a-bst/" },
    { id: "lc-108", name: "Convert Sorted Array to Binary Search Tree", number: "108", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/convert-sorted-array-to-binary-search-tree/" },
    { id: "lc-450", name: "Delete Node in a BST", number: "450", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/delete-node-in-a-bst/" },
  ],

  references: [
    { title: "Binary Search Tree: busca, inserção e remoção", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/binary-search-tree-data-structure/" },
    { title: "Deletion in a BST: os três casos", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/deletion-in-binary-search-tree/" },
    { title: "AVL Tree: o balanceamento por rotação", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/introduction-to-avl-tree/" },
    { title: "Red-Black Tree: o balanceamento que o TreeMap usa", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/introduction-to-red-black-tree/" },
  ],
};
