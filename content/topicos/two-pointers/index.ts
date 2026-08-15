import type { Topic } from "../index";

export const topico: Topic = {
  slug: "two-pointers",
  name: "Two Pointers",
  group: "Arrays e Strings",
  level: "Fácil",
  status: "ready",
  viz: "two-pointers",
  youtube: "a1QMdXgcQwY",
  videoMinutes: "1:11:13",
  readingTime: "18 min",
  language: "Python",
  description: "Dois índices caminhando na mesma passada. Em array ordenado, um começa na ponta esquerda e o outro na direita, e eles convergem.",
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
    "Uma técnica, não um algoritmo",
    "O que custa testar todos os pares",
    "Convergentes: o Two Sum em array ordenado",
    "Por que mover um ponteiro só não perde solução",
    "Palíndromo: dois ponteiros em ritmos diferentes",
    "Mesma direção: o leitor e o escritor",
    "Rápido e lento: o ciclo da lista ligada",
    "Ordenar para usar dois ponteiros: o trade-off com hash",
    "Onde o Two Pointers dá errado",
    "Como praticar",
];
