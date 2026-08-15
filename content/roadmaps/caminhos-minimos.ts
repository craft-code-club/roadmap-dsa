import type { Roadmap } from "@/content/tipos";

// Caminho mínimo, visto como problema de rota em vez de capítulo de teoria.
//
// ESTE ROADMAP NÃO TEM UM TÓPICO PRÓPRIO. Nenhum. Os seis que ele apresenta
// existem nos Fundamentos e continuam lá, inteiros, sem cópia e sem alteração.
// O que este arquivo publica é a CURADORIA: um recorte e uma ordem.
//
// É por isso que ele está no repositório. Depois que o tópico deixou de ter
// casa, montar um percurso passou a ser escrever trinta linhas de citação, e
// este arquivo é a prova disso rodando: seis tópicos em dois roadmaps, uma
// página canônica cada, progresso que conta nos dois, e zero conteúdo
// duplicado para envelhecer em paralelo.
//
// A ORDEM É OUTRA, E É ESSE O PONTO
// Nos Fundamentos, o grupo Grafos ensina a estrutura: o que é um grafo, como
// percorrê-lo, e então os algoritmos que se apoiam nisso. Aqui a pergunta é a
// do engenheiro diante de um mapa e de um prazo: "que algoritmo eu uso?". A
// resposta depende do mapa (peso negativo derruba o Dijkstra, uma heurística
// boa faz o A* visitar uma fração dos nós), então os dois primeiros tópicos
// não são introdução, são o que define o problema.
//
// Um arquivo por roadmap, e registre o novo em `content/roadmaps/index.ts`:
// o teste `todo arquivo de content/roadmaps/ está registrado no índice` reprova
// se esquecer.
export const roadmap: Roadmap = {
  slug: "caminhos-minimos",
  name: "Caminhos Mínimos",
  tagline: "Escolher o algoritmo de rota olhando para o mapa, não para o livro.",
  description:
    "Dado um mapa e um ponto de partida, qual é o caminho mais barato até cada destino? A resposta muda com o mapa: peso negativo derruba o Dijkstra, uma boa heurística faz o A* visitar uma fração dos nós, e perguntar de todos para todos é outro problema. Este roadmap percorre os algoritmos de caminho mínimo na ordem em que você os ESCOLHE, e não na ordem em que se aprende teoria dos grafos. Todos os tópicos aqui também estão nos Fundamentos: o que muda é a pergunta que eles respondem, e o que vem antes e depois.",
  level: "Médio",
  glyph: "◈",
  requires: ["big-o", "binary-heap"],
  groups: [
    {
      id: "cm-o-mapa",
      name: "O mapa, antes do algoritmo",
      topics: [{ topic: "grafos-intro" }, { topic: "dfs-bfs" }],
    },
    {
      id: "cm-uma-origem",
      name: "De uma origem para todos",
      topics: [{ topic: "dijkstra" }, { topic: "bellman-ford" }, { topic: "a-star" }],
    },
    {
      id: "cm-todos-os-pares",
      name: "De todos para todos",
      topics: [{ topic: "floyd-warshall" }],
    },
  ],
};
