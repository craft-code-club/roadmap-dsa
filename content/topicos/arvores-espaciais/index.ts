import type { Topic } from "../index";

export const topico: Topic = {
  slug: "arvores-espaciais",
  name: "Árvores Espaciais",
  group: "Geometria e espaço",
  level: "Difícil",
  status: "soon",
  description: "Quadtree, KD-Tree e R-Tree: vizinho mais próximo e consulta por região.",
  tagline: "Buscar por proximidade, não por igualdade.",
  glyph: "▦",
  requires: ["bst", "busca-binaria"],
};
