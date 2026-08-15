import type { Topic } from "../index";

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
