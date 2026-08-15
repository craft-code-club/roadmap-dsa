import type { Topic } from "../index";

export const topico: Topic = {
  slug: "busca-binaria",
  name: "Busca Binária",
  group: "Busca Binária",
  level: "Médio",
  status: "ready",
  viz: "busca-binaria",
  youtube: "62ZGcXDpbys",
  videoMinutes: "1:30:11",
  readingTime: "11 min",
  language: "Python",
  description: "Corte o espaço de busca pela metade a cada passo: O(log n).",
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
    "Cortar o problema pela metade",
    "O contrato: sem ordem, não existe busca binária",
    "O algoritmo, e as três decisões de cada passo",
    "O bug do meio, que sobreviveu uma década no Java",
    "Quando não acha, a resposta ainda serve",
    "Busca binária sem array",
    "As armadilhas",
];
