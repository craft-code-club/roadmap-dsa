import type { Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "consistent-hashing",
  name: "Consistent Hashing",
  group: "Sistemas distribuídos",
  level: "Difícil",
  status: "soon",
  description: "O anel de hash e os nós virtuais: sair de K/n chaves remapeadas em vez de todas.",
  tagline: "Trocar de servidor sem reembaralhar todas as chaves.",
  glyph: "◎",
  requires: ["hash-table"],
};
