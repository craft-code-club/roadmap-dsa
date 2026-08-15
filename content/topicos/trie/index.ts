import type { Topic } from "../index";

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
