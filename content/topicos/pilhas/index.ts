import type { Topic } from "../index";

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
