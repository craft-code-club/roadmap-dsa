import type { Roadmap } from "@/content/tipos";

// O que vem depois do caminho mínimo.
//
// Um arquivo por roadmap: eles crescem para dezenas de tópicos cada, e num
// arquivo só a revisão de um PR que mexe em dois vira um diff ilegível.
// Registre o novo em `content/roadmaps/index.ts` — o teste
// `todo arquivo de roadmap está registrado no índice` reprova se esquecer.
export const roadmap: Roadmap = {
  slug: "grafos-avancados",
  name: "Grafos Avançados",
  tagline: "Depois do Dijkstra: componentes, pontes e fluxo.",
  description:
    "O roadmap cobre percorrer o grafo e achar o caminho mais curto. Esta trilha é o que vem depois: descobrir a estrutura escondida dentro dele (que pedaços são indivisíveis, que arestas são únicas, quanta coisa cabe passando ao mesmo tempo) e reconhecer os problemas que só viram fáceis quando você os desenha como grafo.",
  level: "Difícil",
  glyph: "◉",
  requires: ["dfs-bfs", "dijkstra", "topological-sort", "union-find"],
  groups: [
    {
      id: "grafos-av-estrutura",
      name: "A estrutura escondida",
      topics: [
        { topic: "union-find" },
        { topic: "componentes-fortemente-conexos" },
        { topic: "pontes-e-articulacoes" },
        { topic: "lca" },
      ],
    },
    {
      id: "grafos-av-fluxo",
      name: "Fluxo e emparelhamento",
      topics: [
        { topic: "fluxo-maximo" },
        { topic: "emparelhamento-bipartido" },
      ],
    },
    {
      id: "grafos-av-logica",
      name: "Grafos como lógica",
      topics: [
        { topic: "dois-sat" },
      ],
    },
  ],
};
