import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "binary-numbers",
  name: "Números Binários",
  group: "Manipulação de Bits",
  level: "Fácil",
  status: "ready",
  viz: "binary-numbers",
  isNew: true,
  youtube: "8VHi44rAVFo",
  videoMinutes: "27:33",
  readingTime: "10 min",
  language: "Python",
  description: "O sistema binário e a conversão entre decimal e binário.",
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
    "Dois símbolos, e o motivo é físico",
    "Notação posicional: você já sabe fazer isso",
    "Lendo um binário: a soma das posições ligadas",
    "Escrevendo em binário: dividir por 2 até acabar",
    "Bit, byte, e quanto cabe",
    "Hexadecimal: binário com outra roupa",
    "Onde isso aparece no código do dia a dia",
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
    { id: "lc-191", name: "Number of 1 Bits", number: "191", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/number-of-1-bits/" },
    { id: "lc-67", name: "Add Binary", number: "67", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/add-binary/" },
    { id: "lc-405", name: "Convert a Number to Hexadecimal", number: "405", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/convert-a-number-to-hexadecimal/" },
    { id: "lc-338", name: "Counting Bits", number: "338", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/counting-bits/" },
    { id: "lc-1009", name: "Complement of Base 10 Integer", number: "1009", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/complement-of-base-10-integer/" },
    { id: "gfg-binary-numbers", name: "Sistemas de numeração e conversão de bases", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/number-system-and-base-conversions/" },
  ],

  references: [
    { title: "Bytes, números e caracteres", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/bytes.html" },
    { title: "Os tipos int e char", source: "Paulo Feofiloff, IME-USP", url: "https://www.ime.usp.br/~pf/algoritmos/aulas/int.html" },
    { title: "Operações sobre bits em inteiros", source: "docs.python.org", url: "https://docs.python.org/3/library/stdtypes.html#bitwise-operations-on-integer-types" },
    { title: "Binary number: história e notação", source: "Wikipedia", url: "https://en.wikipedia.org/wiki/Binary_number" },
    { title: "Number System and Base Conversions", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/number-system-and-base-conversions/" },
  ],
};
