import type { Topic } from "../index";

export const topico: Topic = {
  slug: "hash-table",
  name: "Tabelas Hash",
  group: "Hashing",
  level: "Médio",
  status: "ready",
  viz: "hash-table",
  youtube: "JFhdCBrKTX0",
  videoMinutes: "2:31:40",
  readingTime: "19 min",
  language: "Python",
  description: "Busca, inserção e remoção em O(1) amortizado, quase sempre. A chave calcula o próprio endereço, e o preço disso é colisão, fator de carga e rehash.",
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
    "Por que buscar um valor dói",
    "A ideia: a chave diz onde ela mora",
    "Colisão: duas chaves, o mesmo bucket",
    "Fator de carga e rehash",
    "O que faz uma função de hash ser boa",
    "Set, dicionário e map são a mesma casa",
    "O(1) amortizado, quase sempre",
    "As armadilhas que pegam todo mundo",
    "Os quatro padrões que caem em prova",
];
