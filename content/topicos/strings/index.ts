import type { Topic } from "../index";

export const topico: Topic = {
  slug: "strings",
  name: "Strings",
  group: "Arrays e Strings",
  level: "Fácil",
  status: "ready",
  viz: "strings",
  youtube: "B9CCEwjoXBk",
  videoMinutes: "1:45:57",
  readingTime: "16 min",
  language: "Python",
  description: "String é um array de caracteres com duas regras a mais: o elemento não é um byte e você não pode escrever numa posição. É dessa imutabilidade que nasce o O(n²) escondido em qualquer concatenação dentro de um laço.",
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
    "A string é um array com uma regra a mais",
    "Um caractere não é um byte",
    "Imutável: o que isso cobra e o que isso paga",
    "O laço que concatena, e o O(n²) escondido",
    "O builder: pagar a cópia uma vez só",
    "Vire lista, edite, volte para string",
    "Rotate String: da força bruta ao truque de uma linha",
    "As armadilhas que pegam todo mundo",
    "Como praticar isto",
];
