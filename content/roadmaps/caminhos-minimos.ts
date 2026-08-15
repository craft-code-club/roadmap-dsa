import type { Roadmap } from "@/content/tipos";

// Caminho mínimo, visto como problema de rota em vez de capítulo de teoria.
//
// ELE MISTURA AS DUAS COISAS, e é por isso que está no repositório.
//
// Seis dos nove tópicos já existem nos Fundamentos e continuam lá, inteiros,
// sem cópia: grafos-intro, dfs-bfs, Dijkstra, Bellman-Ford, A* e
// Floyd-Warshall. Este roadmap CITA os seis. Uma página canônica cada,
// progresso que conta nos dois, zero conteúdo duplicado para envelhecer em
// paralelo, e trinta linhas de arquivo em vez de seis artigos.
//
// Os outros três nascem aqui porque os Fundamentos não têm o que dizer sobre
// eles: a sequência principal ensina os ALGORITMOS um a um, e o que falta é o
// enquadramento (o que muda quando muda o mapa) e as duas famílias de problema
// que dão nome ao assunto (origem única e múltiplas origens). Eles seguem
// tópicos como os outros: página própria em `/topicos/<slug>/`, e amanhã
// qualquer roadmap pode citá-los.
//
// A ORDEM É OUTRA, E É ESSE O PONTO
// Nos Fundamentos, o grupo Grafos ensina a estrutura: o que é um grafo, como
// percorrê-lo, e então os algoritmos que se apoiam nisso. Aqui a pergunta é a
// do engenheiro diante de um mapa e de um prazo: "que algoritmo eu uso?". A
// resposta depende do mapa (peso negativo derruba o Dijkstra, uma heurística
// boa faz o A* visitar uma fração dos nós), e por isso o primeiro grupo é o
// mapa, e não o primeiro algoritmo.
//
// Um arquivo por roadmap, e registre o novo em `content/roadmaps/index.ts`:
// o teste `todo arquivo de content/roadmaps/ está registrado no índice` reprova
// se esquecer.
export const roadmap: Roadmap = {
  slug: "caminhos-minimos",
  name: "Caminhos Mínimos em Grafos",
  tagline: "Escolher o algoritmo de rota olhando para o mapa, não para o livro.",
  description:
    "Dado um mapa e um ponto de partida, qual é o caminho mais barato até cada destino? A resposta muda com o mapa: peso negativo derruba o Dijkstra, uma boa heurística faz o A* visitar uma fração dos nós, e perguntar de todos para todos é outro problema. Este roadmap percorre os algoritmos de caminho mínimo na ordem em que você os ESCOLHE, e não na ordem em que se aprende teoria dos grafos. Seis dos tópicos aqui também estão nos Fundamentos, com a mesma página: o que muda é a pergunta que eles respondem, e o que vem antes e depois.",
  level: "Médio",
  glyph: "◈",
  requires: ["big-o", "binary-heap"],
  groups: [
    {
      // O enquadramento primeiro, e o terreno logo depois: a pergunta deste
      // roadmap ("qual algoritmo?") só faz sentido depois de saber o que no
      // mapa decide a resposta.
      id: "cm-o-problema",
      name: "O problema, antes do algoritmo",
      topics: [
        { topic: "caminhos-minimos-intro" },
        { topic: "grafos-intro" },
        { topic: "dfs-bfs" },
      ],
    },
    {
      id: "cm-uma-origem",
      name: "De uma origem para todas",
      topics: [
        { topic: "sssp" },
        { topic: "dijkstra" },
        { topic: "bellman-ford" },
        { topic: "a-star" },
      ],
    },
    {
      id: "cm-varias-origens",
      name: "De várias origens ao mesmo tempo",
      topics: [{ topic: "mssp" }],
    },
    {
      id: "cm-todos-os-pares",
      name: "De todos para todos",
      topics: [{ topic: "floyd-warshall" }],
    },
  ],
};
