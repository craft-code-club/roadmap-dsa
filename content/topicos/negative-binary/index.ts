import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "negative-binary",
  name: "Binários Negativos",
  group: "Manipulação de Bits",
  level: "Médio",
  status: "ready",
  viz: "negative-binary",
  isNew: true,
  youtube: "93CpmUXLbzc",
  videoMinutes: "26:13",
  readingTime: "11 min",
  language: "Python",
  description: "Sign-magnitude, complemento de um e de dois.",
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
    "O bit que deixa de valer magnitude",
    "Tentativa 1: sinal e magnitude",
    "Tentativa 2: complemento de um",
    "Complemento de dois: inverter e somar 1",
    "O truque de leitura: o peso da esquerda é negativo",
    "A faixa assimétrica, e o padrão que não sabe o próprio sinal",
    "Estouro: o erro que não avisa",
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
    { id: "lc-461", name: "Hamming Distance", number: "461", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/hamming-distance/" },
    { id: "lc-190", name: "Reverse Bits", number: "190", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/reverse-bits/" },
    { id: "lc-7", name: "Reverse Integer", number: "7", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/reverse-integer/" },
    { id: "lc-371", name: "Sum of Two Integers", number: "371", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/sum-of-two-integers/" },
    { id: "lc-29", name: "Divide Two Integers", number: "29", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/divide-two-integers/" },
    { id: "gfg-complemento", name: "Complemento de um e de dois", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/1s-2s-complement-binary-number/" },
  ],

  references: [
    { title: "Os tipos int e char: representação e limites", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/int.html" },
    { title: "Two's complement: por que ela venceu", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Two%27s_complement" },
    { title: "O problema do ano 2038", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Year_2038_problem" },
    { title: "Operações sobre bits em inteiros", source: "docs.python.org", url: "https://docs.python.org/3/library/stdtypes.html#bitwise-operations-on-integer-types" },
    { title: "1's and 2's Complement of a Binary Number", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/1s-2s-complement-binary-number/" },
  ],
};
