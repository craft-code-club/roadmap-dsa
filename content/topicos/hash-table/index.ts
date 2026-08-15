import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "hash-table",
  name: "Tabelas Hash",
  group: "Hashing",
  level: "Médio",
  status: "ready",
  viz: "hash-table",
  youtube: "JFhdCBrKTX0",
  videoMinutes: "2:31:40",
  readingTime: "19 min",
  language: "Python",
  description: "Busca, inserção e remoção em O(1) amortizado, quase sempre. A chave calcula o próprio endereço, e o preço disso é colisão, fator de carga e rehash.",
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
    "Por que buscar um valor dói",
    "A ideia: a chave diz onde ela mora",
    "Colisão: duas chaves, o mesmo bucket",
    "Fator de carga e rehash",
    "O que faz uma função de hash ser boa",
    "Set, dicionário e map são a mesma casa",
    "O(1) amortizado, quase sempre",
    "As armadilhas que pegam todo mundo",
    "Os quatro padrões que caem em prova",
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
    { id: "lc-217", name: "Contains Duplicate", number: "217", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/contains-duplicate/" },
    { id: "lc-242", name: "Valid Anagram", number: "242", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/valid-anagram/" },
    { id: "lc-1", name: "Two Sum", number: "1", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/two-sum/" },
    { id: "lc-49", name: "Group Anagrams", number: "49", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/group-anagrams/" },
    { id: "lc-706", name: "Design HashMap", number: "706", source: "LeetCode", level: "Fácil", url: "https://leetcode.com/problems/design-hashmap/" },
    { id: "gfg-hashing", name: "Practice Problems on Hashing", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/practice-problems-on-hashing/" },
  ],

  references: [
    { title: "Hashing in Data Structure", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/hashing-data-structure/" },
    { title: "Separate Chaining Collision Handling Technique in Hashing", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/separate-chaining-collision-handling-technique-in-hashing/" },
    { title: "Load Factor and Rehashing", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/load-factor-and-rehashing/" },
    { title: "java.util.HashMap: o fator de carga 0,75 documentado na fonte", source: "Oracle", url: "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html" },
  ],
};
