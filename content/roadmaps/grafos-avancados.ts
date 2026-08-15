import type { Roadmap } from "./index";

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
        // CITAÇÃO. O Union-Find é avulso, e era um dos quatro assuntos que o
        // antigo tópico "grafos-avancados" prometia numa página só. Ele volta
        // aqui na posição certa: é a ferramenta de componente conexo em grafo
        // não dirigido, e o contraste com Tarjan abre o assunto do grupo.
        "union-find",
        { slug: "componentes-fortemente-conexos", name: "Componentes Fortemente Conexos", group: "Grafos Avançados", level: "Difícil", status: "soon", description: "Tarjan e Kosaraju: os pedaços do grafo dirigido em que todo mundo alcança todo mundo." },
        { slug: "pontes-e-articulacoes", name: "Pontes e Articulações", group: "Grafos Avançados", level: "Difícil", status: "soon", description: "Que aresta, se cair, parte a rede em duas. E que vértice faz o mesmo." },
        { slug: "lca", name: "Ancestral Comum Mais Próximo (LCA)", group: "Grafos Avançados", level: "Difícil", status: "soon", description: "Binary lifting: subir 2^k passos de uma vez para responder em O(log n)." },
      ],
    },
    {
      id: "grafos-av-fluxo",
      name: "Fluxo e emparelhamento",
      topics: [
        { slug: "fluxo-maximo", name: "Fluxo Máximo", group: "Grafos Avançados", level: "Difícil", status: "soon", description: "Ford-Fulkerson, Edmonds-Karp e Dinic, e o corte mínimo que sai de graça." },
        { slug: "emparelhamento-bipartido", name: "Emparelhamento Bipartido", group: "Grafos Avançados", level: "Difícil", status: "soon", description: "Casar dois conjuntos ao máximo, que é fluxo máximo com capacidade 1." },
      ],
    },
    {
      id: "grafos-av-logica",
      name: "Grafos como lógica",
      topics: [
        { slug: "dois-sat", name: "2-SAT", group: "Grafos Avançados", level: "Difícil", status: "soon", description: "Resolver um sistema de implicações achando componentes fortemente conexos." },
      ],
    },
  ],
};
