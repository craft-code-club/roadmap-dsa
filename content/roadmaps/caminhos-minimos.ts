import type { Roadmap } from "./index";

// Caminho mínimo de uma origem só (SSSP), visto como problema de logística em
// vez de como capítulo de teoria dos grafos.
//
// Como "Bancos de Dados", este roadmap é quase todo CITAÇÃO: Dijkstra,
// Bellman-Ford e A* já existem nos Fundamentos, dentro do grupo Grafos, na ordem
// em que se APRENDE grafos. Aqui eles voltam na ordem em que se ESCOLHE um
// algoritmo diante de um mapa e um prazo, que é uma pergunta diferente e merece
// uma página diferente.
//
// Um arquivo por roadmap: eles crescem para dezenas de tópicos cada, e num
// arquivo só a revisão de um PR que mexe em dois vira um diff ilegível.
// Registre o novo em `content/roadmaps/index.ts` — o teste
// `todo arquivo de roadmap está registrado no índice` reprova se esquecer.
export const roadmap: Roadmap = {
  slug: "caminhos-minimos",
  name: "Caminhos Mínimos e Logística",
  tagline: "Escolher o algoritmo de rota olhando para o mapa, não para o livro.",
  description:
    "Dado um mapa e um ponto de partida, qual é o caminho mais barato até cada destino? A resposta muda com o mapa: peso negativo derruba o Dijkstra, uma boa heurística faz o A* visitar uma fração dos nós, e um grafo que cabe na memória inteira pede outra estratégia. Este roadmap percorre os algoritmos de caminho mínimo na ordem em que você os ESCOLHE, e não na ordem em que se aprende teoria dos grafos.",
  level: "Difícil",
  glyph: "◈",
  requires: ["grafos-intro", "dfs-bfs", "binary-heap"],
  groups: [
    {
      id: "cm-uma-origem",
      name: "De uma origem para todos",
      // Três CITAÇÕES seguidas, todas dos Fundamentos. A ordem aqui é a da
      // decisão: o padrão, o que fazer quando há peso negativo, e o que fazer
      // quando existe uma estimativa de distância confiável.
      topics: ["dijkstra", "bellman-ford", "a-star"],
    },
    {
      id: "cm-todos-os-pares",
      name: "De todos para todos",
      topics: [
        {
          slug: "floyd-warshall-logistica",
          name: "Floyd-Warshall na prática",
          group: "Caminhos Mínimos e Logística",
          level: "Difícil",
          status: "soon",
          description: "Quando vale pagar O(V³) uma vez para responder qualquer par em O(1).",
        },
      ],
    },
    {
      id: "cm-do-mapa-ao-grafo",
      name: "Do mapa ao grafo",
      topics: [
        {
          slug: "modelagem-de-rotas",
          name: "Modelagem de Rotas",
          group: "Caminhos Mínimos e Logística",
          level: "Difícil",
          status: "soon",
          description: "Rua de mão única, janela de entrega e troca de veículo, tudo virando aresta e peso.",
        },
        {
          slug: "contraction-hierarchies",
          name: "Contraction Hierarchies",
          group: "Caminhos Mínimos e Logística",
          level: "Difícil",
          status: "soon",
          description: "O pré-processamento que faz um GPS responder rota continental em milissegundos.",
        },
      ],
    },
  ],
};
