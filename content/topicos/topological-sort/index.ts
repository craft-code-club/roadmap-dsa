import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "topological-sort",
  name: "Ordenação Topológica",
  group: "Grafos",
  level: "Médio",
  status: "ready",
  viz: "topological-sort",
  youtube: "4fTjXqcMFtk",
  videoMinutes: "1:41:07",
  article: "https://craftcodeclub.io/posts/dsa-topological-sorting",
  readingTime: "10 min",
  language: "Python",
  description: "Ordem linear de um DAG (Kahn e DFS).",
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
    "O problema, e a condição para ele ter solução",
    "Kahn: remover quem não depende de ninguém",
    "A detecção de ciclo vem de graça",
    "A outra saída: DFS com pós-ordem",
    "Um bônus do Kahn: quantos passos em paralelo",
    "Onde isso já está rodando",
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
    { id: "lc-207", name: "Course Schedule", number: "207", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/course-schedule/" },
    { id: "lc-210", name: "Course Schedule II", number: "210", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/course-schedule-ii/" },
    { id: "lc-310", name: "Minimum Height Trees", number: "310", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/minimum-height-trees/" },
    { id: "lc-2115", name: "Find All Possible Recipes from Given Supplies", number: "2115", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/find-all-possible-recipes-from-given-supplies/" },
    { id: "lc-269", name: "Alien Dictionary", number: "269", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/alien-dictionary/" },
    { id: "gfg-topo", name: "Topological Sorting", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/topological-sorting/" },
  ],

  references: [
    { title: "Ordenação topológica: Kahn e DFS", source: "Craft & Code Club", url: "https://craftcodeclub.io/posts/dsa-topological-sorting" },
    { title: "Topological Sorting", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/topological-sorting/" },
    { title: "Kahn's algorithm for Topological Sorting", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/topological-sorting-indegree-based-solution/" },
    { title: "Detect Cycle in a Directed Graph", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/detect-cycle-in-a-graph/" },
  ],
};
