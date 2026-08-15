import type { Pratica, Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "mst",
  name: "Árvore Geradora Mínima (MST)",
  group: "Grafos",
  level: "Difícil",
  status: "ready",
  viz: "mst",
  youtube: "a9iI9N4FLsg",
  videoMinutes: "2:12:12",
  article: "https://craftcodeclub.io/posts/dsa-mst",
  readingTime: "11 min",
  language: "Python",
  description: "Conectar tudo com o menor custo: Kruskal e Prim.",
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
    "O que é uma árvore geradora",
    "A propriedade do corte, que faz o guloso funcionar",
    "Kruskal: ordene as arestas e vá colando",
    "O union-find, em duas linhas de ideia",
    "Prim: faça a árvore crescer",
    "Kruskal ou Prim",
    "O que a MST não faz",
    "Onde aparece",
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
    { id: "lc-1584", name: "Min Cost to Connect All Points", number: "1584", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/min-cost-to-connect-all-points/" },
    { id: "lc-1135", name: "Connecting Cities With Minimum Cost", number: "1135", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/connecting-cities-with-minimum-cost/" },
    { id: "lc-684", name: "Redundant Connection", number: "684", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/redundant-connection/" },
    { id: "lc-1319", name: "Number of Operations to Make Network Connected", number: "1319", source: "LeetCode", level: "Médio", url: "https://leetcode.com/problems/number-of-operations-to-make-network-connected/" },
    { id: "lc-1489", name: "Find Critical and Pseudo-Critical Edges in MST", number: "1489", source: "LeetCode", level: "Difícil", url: "https://leetcode.com/problems/find-critical-and-pseudo-critical-edges-in-minimum-spanning-tree/" },
    { id: "gfg-mst", name: "Minimum Spanning Tree", source: "GeeksforGeeks", level: "Guia", url: "https://www.geeksforgeeks.org/dsa/what-is-minimum-spanning-tree-mst/" },
  ],

  references: [
    { title: "MST: Kruskal e Prim passo a passo", source: "Craft & Code Club", url: "https://craftcodeclub.io/posts/dsa-mst" },
    { title: "Kruskal's Minimum Spanning Tree Algorithm", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/kruskals-minimum-spanning-tree-algorithm-greedy-algo-2/" },
    { title: "Prim's Minimum Spanning Tree Algorithm", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/prims-minimum-spanning-tree-mst-greedy-algo-5/" },
    { title: "Disjoint Set Union (union-find) com compressão de caminho", source: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dsa/introduction-to-disjoint-set-data-structure-or-union-find-algorithm/" },
  ],
};
