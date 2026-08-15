import type { Topic } from "@/content/tipos";

export const topico: Topic = {
  slug: "lru-cache",
  name: "Cache LRU e LFU",
  group: "Caches",
  level: "Médio",
  status: "soon",
  description: "Tabela hash mais lista duplamente encadeada: get e put em O(1).",
  tagline: "O cache que esquece exatamente o que ninguém usa.",
  glyph: "↻",
  requires: ["hash-table", "listas-ligadas"],
};
