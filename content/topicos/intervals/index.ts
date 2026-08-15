import type { Pratica, Topic } from "@/content/tipos";

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
    { id: "lc-56", name: "Merge Intervals", number: "56", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/merge-intervals/" },
    { id: "lc-57", name: "Insert Interval", number: "57", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/insert-interval/" },
    { id: "lc-435", name: "Non-overlapping Intervals", number: "435", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/non-overlapping-intervals/" },
    { id: "lc-452", name: "Minimum Number of Arrows to Burst Balloons", number: "452", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/" },
    { id: "lc-1094", name: "Car Pooling", number: "1094", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/car-pooling/" },
    { id: "lc-2402", name: "Meeting Rooms III", number: "2402", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/meeting-rooms-iii/" },
    { id: "gfg-intervals", name: "Overlapping Intervals: fundir intervalos que se sobrepõem", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/merging-intervals/" },
  ],

  references: [
    { title: "Overlapping Intervals: ordenar por início e fundir", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/merging-intervals/" },
    { title: "Insert in Sorted and Non-Overlapping Interval Array", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/insert-in-sorted-and-non-overlapping-interval-array/" },
    { title: "Maximum Number of Overlapping Intervals: a contagem por eventos", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/maximum-number-of-overlapping-intervals/" },
    { title: "Minimum Platforms Required: quando o empate muda a resposta", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/minimum-number-platforms-required-railwaybus-station/" },
  ],
};
