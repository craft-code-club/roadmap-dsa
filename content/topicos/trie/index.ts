import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "trie",
  name: "Trie (Árvore de Prefixos)",
  group: "Strings e árvores",
  level: "Médio",
  status: "ready",
  isNew: true,
  readingTime: "15 min",
  language: "Python",
  description: "Cada nó é um prefixo, cada aresta é um caractere: autocomplete em O(m).",
  tagline: "A árvore que indexa prefixos, não palavras.",
  glyph: "▲",
  requires: ["strings", "hash-table", "n-ary-trees"],
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
    "O buraco: a hash não sabe soletrar",
    "Cada nó é um prefixo, cada aresta é uma letra",
    "O flag de fim de palavra separa \"existe\" de \"começa com\"",
    "A implementação: dict de filhos, e a variante de 26 posições",
    "Remover: a operação que ninguém escreve",
    "Autocomplete: descer até o prefixo e colher o resto",
    "O preço real é memória",
    "Trie binária: quando as letras são bits",
    "Onde ela aparece de verdade",
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
    { id: "lc-208", name: "Implement Trie (Prefix Tree)", number: "208", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/implement-trie-prefix-tree/" },
    { id: "lc-1268", name: "Search Suggestions System", number: "1268", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/search-suggestions-system/" },
    { id: "lc-648", name: "Replace Words", number: "648", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/replace-words/" },
    { id: "lc-211", name: "Design Add and Search Words Data Structure", number: "211", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/design-add-and-search-words-data-structure/" },
    { id: "lc-421", name: "Maximum XOR of Two Numbers in an Array", number: "421", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/maximum-xor-of-two-numbers-in-an-array/" },
    { id: "lc-212", name: "Word Search II", number: "212", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/word-search-ii/" },
    { id: "gfg-trie", name: "Trie: inserção e busca", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/trie-insert-and-search/" },
  ],

  references: [
    { title: "Trie", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Trie" },
    { title: "Radix tree: a trie compactada, quando a memória aperta", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Radix_tree" },
    { title: "Aho-Corasick: a trie com links de falha", source: "CP-Algorithms", url: "https://cp-algorithms.com/string/aho_corasick.html" },
    { title: "Longest prefix match: a trie dentro da tabela de roteamento", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Longest_prefix_match" },
  ],
};
