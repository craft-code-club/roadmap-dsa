import type { Topic } from "../index";

export const topico: Topic = {
  slug: "merkle-tree",
  name: "Merkle Tree",
  group: "Sistemas distribuídos",
  level: "Médio",
  status: "soon",
  description: "Árvore de hashes: integridade verificável em O(log n) com a prova de inclusão.",
  tagline: "Provar que um bloco não mudou sem baixar o resto.",
  glyph: "▣",
  requires: ["arvores-binarias", "hash-table"],
};
