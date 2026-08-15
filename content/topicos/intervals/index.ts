import type { Topic } from "../index";

export const topico: Topic = {
  slug: "intervals",
  name: "Intervalos",
  group: "Arrays e Strings",
  level: "Médio",
  status: "ready",
  viz: "intervals",
  readingTime: "18 min",
  language: "Python",
  description: "Merge, insert e agendamento: ordenar por início e varrer os intervalos.",
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
    "O problema: uma agenda cheia de conflitos",
    "Quando dois intervalos se sobrepõem",
    "A regra de ouro: ordene pelo início",
    "Merge Intervals: fundir o que se toca",
    "Insert Interval: três fases e nenhuma ordenação",
    "Quantas salas eu preciso: contagem por eventos",
    "Quantas reuniões cabem: ordene pelo fim",
    "Complexidade: onde o tempo vai",
    "As armadilhas que derrubam a submissão",
    "Como praticar",
];
