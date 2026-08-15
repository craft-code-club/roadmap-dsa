import type { Pratica, Topic } from "@/content/tipos";

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
    { id: "lc-344", name: "Reverse String", number: "344", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/reverse-string/" },
    { id: "lc-796", name: "Rotate String", number: "796", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/rotate-string/" },
    { id: "lc-28", name: "Find the Index of the First Occurrence in a String", number: "28", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/find-the-index-of-the-first-occurrence-in-a-string/" },
    { id: "lc-6", name: "Zigzag Conversion", number: "6", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/zigzag-conversion/" },
    { id: "lc-5", name: "Longest Palindromic Substring", number: "5", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/longest-palindromic-substring/" },
    { id: "gfg-strings", name: "String Data Structure: o guia completo", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/string-data-structure/" },
  ],

  references: [
    { title: "Checar se duas strings são rotações uma da outra", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/a-program-to-check-if-strings-are-rotations-of-each-other/" },
    { title: "Unicode HOWTO: code points, encodings e as pegadinhas", source: "Python Docs", url: "https://docs.python.org/3/howto/unicode.html" },
    { title: "O mínimo absoluto que todo dev precisa saber sobre Unicode", source: "Joel on Software", url: "https://www.joelonsoftware.com/2003/10/08/the-absolute-minimum-every-software-developer-absolutely-positively-must-know-about-unicode-and-character-sets-no-excuses/" },
    { title: "Usando a classe StringBuilder no .NET", source: "Microsoft Learn", url: "https://learn.microsoft.com/pt-br/dotnet/standard/base-types/stringbuilder" },
  ],
};
