import type { ComponentType } from "react";
import type { MDXComponents } from "mdx/types";

// O MODELO do conteúdo: os tipos, e só eles.
//
// POR QUE AQUI, e não junto do conteúdo
// `content/` na raiz é o que de fato é conteúdo — o dado de cada tópico, o
// texto de cada artigo, a curadoria de cada roadmap. Um `type` não é nada
// disso: é código, é a forma que o conteúdo tem que ter, e é o que o editor
// consulta enquanto alguém escreve um tópico novo.
//
// A separação também responde a uma pergunta prática que aparecia toda vez que
// alguém abria `content/`: "quais destes arquivos eu edito para publicar um
// tópico?". Agora a resposta é "todos", porque só há conteúdo lá.
//
// Este arquivo não importa nada de `content/`, de propósito: ele descreve, não
// depende. Quem depende é o contrário — `content/topicos/<slug>/index.ts`
// importa `Topic` daqui.

export type Level = "Fácil" | "Médio" | "Difícil";
export type Source = "LeetCode" | "GeeksforGeeks";

export type Problem = {
  id: string; // estável, usado como chave no localStorage
  name: string;
  number?: string; // ex.: "209"
  source: Source;
  level: Level | "Guia";
  url: string;
};

export type Visualizer = "a-star" | "arrays" | "arvores-binarias" | "backtracking" | "bellman-ford" | "big-o" | "binary-heap" | "binary-numbers" | "bst" | "busca-binaria" | "dfs-bfs" | "dijkstra" | "filas" | "grafos-intro" | "hash-table" | "heap-sort" | "intervals" | "listas-ligadas" | "merge-sort" | "mst" | "n-ary-trees" | "negative-binary" | "ordenacao-basica" | "pilhas" | "prefix-sum" | "quick-sort" | "recursao" | "recursao-funcional" | "shell-sort" | "skip-list" | "sliding-window" | "strings" | "sub-types" | "topological-sort" | "tree-traversals" | "two-pointers";

/** Vídeos extras de um tópico: aparecem como links clicáveis (não embed). */
export type VideoLink = { title: string; youtube?: string; url?: string; duration?: string };

/** Referências / "leia mais": links para artigos (do blog ou de qualquer site). */
export type Reference = { title: string; url: string; source?: string };

export type Topic = {
  slug: string;
  name: string;
  /**
   * O ASSUNTO do tópico, em duas ou três palavras ("Arrays e Strings",
   * "Sistemas distribuídos").
   *
   * É descrição, não endereço: ele não aponta para grupo de roadmap nenhum, e
   * dois tópicos com o mesmo `group` não estão "no mesmo lugar". Serve para o
   * `about` do JSON-LD e para a pastilha de assunto na página.
   */
  group: string;
  level: Level;
  description: string;
  status: "ready" | "soon";
  youtube?: string; // id do vídeo
  videoMinutes?: string;
  article?: string; // url do artigo/aula no blog
  repo?: string; // implementação de referência
  viz?: Visualizer;
  /**
   * Alguns tópicos não pedem visualizador (são conceituais, ou o passo a passo
   * não acrescenta nada). Marque `noViz: true` para não prometer um que não vem.
   */
  noViz?: boolean;
  /**
   * Selo "NOVO". É uma TAG manual, não uma data: quem publica um tópico põe a
   * tag no PR e tira a dos anteriores. Sem data para envelhecer sozinha, tirar
   * daqui é parte de publicar o próximo.
   */
  isNew?: boolean;
  readingTime?: string;
  language?: string;
  extraVideos?: VideoLink[];
  /**
   * A frase e o glifo do CARD, para quando o tópico aparece na vitrine
   * `/roadmaps/` por não ser citado por roadmap nenhum. Tópico citado é
   * apresentado pelo roadmap que o cita, e não precisa deles.
   */
  tagline?: string;
  glyph?: string;
  /** Slugs que convém ter estudado antes. */
  requires?: string[];
};

/** Os problemas e as referências de um tópico. Ver `./pratica.ts`. */
export type Pratica = { problems?: Problem[]; references?: Reference[] };

/** Tags de conteúdo mostradas nos cards: o que cada tópico já tem. */
export type TagKind = "visual" | "article" | "video" | "exercises";
export type Tag = { kind: TagKind; label: string };

/**
 * Uma citação: o roadmap aponta para um tópico pelo slug.
 *
 * É um objeto, e não uma string solta, porque o que um roadmap tem a dizer
 * sobre um tópico citado não acaba no slug: a nota de por que ele está ali, um
 * rótulo local, a ordem sugerida de leitura dentro do grupo. Nada disso existe
 * hoje, e o objeto é o que permite acrescentá-los sem tocar nos 80 tópicos.
 */
export type Citacao = { topic: string };

export type RoadmapGroup = {
  id: string;
  name: string;
  topics: Citacao[];
  /** Página de abertura do grupo (hoje só a Introdução tem). */
  intro?: { name: string; href: string; description: string };
};

export type Roadmap = {
  /** Vira `/roadmaps/<slug>/`. Uma forma só, para todos. */
  slug: string;
  name: string;
  /** A frase do card. Uma linha. */
  tagline: string;
  /** O parágrafo da abertura, e a `description` do SEO. */
  description: string;
  level: Level;
  /** Glifo do card. Só decoração: sempre `aria-hidden`. */
  glyph: string;
  groups: RoadmapGroup[];
  /** Slugs que convém ter estudado antes. Vira a linha "Antes daqui". */
  requires?: string[];
};

/** O slug do roadmap principal. Ele é o único com tratamento próprio de URL. */
export const SLUG_DOS_FUNDAMENTOS = "fundamentos";

/**
 * Um card da vitrine `/roadmaps/`.
 *
 * A vitrine lista ROADMAPS, e só. Tópico solto não entra: desde que o tópico
 * deixou de ter casa, o lugar dele é o índice `/topicos/`, que lista os 80 com
 * busca e filtro. Uma segunda lista de tópicos aqui seria a mesma informação em
 * dois lugares, com duas regras de ordenação envelhecendo em paralelo.
 */
export type ExtraCard = {
  slug: string;
  href: string;
  name: string;
  tagline: string;
  level: Level;
  glyph: string;
  /** Quantos tópicos o roadmap cita. */
  topics: number;
  /** Quantos já têm material para abrir hoje. */
  ready: number;
  /** Os slugs que o card representa, para ele contar o progresso do leitor. */
  topicSlugs: string[];
};

/**
 * O corpo de um artigo, mais os `## h2` dele para o índice "Nesta página".
 *
 * O `components` é o gancho por onde a página de um tópico DENTRO de um roadmap
 * troca o `a` do MDX: as citações entre artigos precisam apontar para a cópia
 * do roadmap, e não para a página canônica, para o leitor não sair do percurso.
 */
export type Corpo = ComponentType<{ components?: MDXComponents }>;
export type Artigo = { Body: Corpo; summary: string[] };
