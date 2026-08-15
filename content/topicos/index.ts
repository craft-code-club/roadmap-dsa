// ---------------------------------------------------------------------------
// Os TÓPICOS. Um tópico é uma página, e nada além disso.
//
// Ele não pertence a lugar nenhum: não tem grupo, não tem trilha, não tem casa.
// Quem monta sequência são os ROADMAPS (`content/roadmaps/`), que CITAM tópicos
// pelo slug. Um tópico pode ser citado por nenhum, por um ou por seis; o tópico
// não muda por causa disso, e é por isso que ele não sabe quem o cita.
//
// Foi assim que este modelo ficou simples. A versão anterior tinha "dono" e
// "citação", duas relações para a mesma coisa, e toda pergunta virava duas: a
// barra lateral segue o dono ou quem cita? o slug é do dono? o card mostra a
// origem? Com uma relação só (o roadmap cita) essas perguntas não existem.
//
// CADA TÓPICO É UMA PASTA: `content/topicos/<slug>/`
//
//   index.ts     o `Topic` e, quando houver, o `sumario` do artigo
//   artigo.mdx   o corpo, quando existe
//
// A pasta é o que torna o tópico autocontido de verdade: acrescentar um tópico
// é criar uma pasta, e o dado dele e o texto dele ficam lado a lado, no mesmo
// diretório, em vez de num índice central e num diretório de artigos.
//
// O ÍNDICE ABAIXO é uma lista à mão, e não uma varredura, pelo mesmo motivo do
// registro dos roadmaps: este módulo é importado por componente de cliente, e
// código de cliente não tem `fs`. Com `output: "export"` o grafo de módulos
// também precisa ser estático. Quem impede a lista de envelhecer é o teste
// `toda pasta de content/topicos/ está registrada no índice`, que lê o
// diretório e compara nos dois sentidos.
// ---------------------------------------------------------------------------


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

type ModuloDeTopico = { topico: Topic; sumario?: string[] };


import * as bigO from "./big-o";
import * as arrays from "./arrays";
import * as strings from "./strings";
import * as subarraySubstringSubsequenceSubset from "./subarray-substring-subsequence-subset";
import * as twoPointers from "./two-pointers";
import * as slidingWindow from "./sliding-window";
import * as prefixSum from "./prefix-sum";
import * as intervals from "./intervals";
import * as hashTable from "./hash-table";
import * as listasLigadas from "./listas-ligadas";
import * as pilhas from "./pilhas";
import * as filas from "./filas";
import * as recursao from "./recursao";
import * as recursaoFuncional from "./recursao-funcional";
import * as treeTraversals from "./tree-traversals";
import * as arvoresBinarias from "./arvores-binarias";
import * as nAryTrees from "./n-ary-trees";
import * as bst from "./bst";
import * as grafosIntro from "./grafos-intro";
import * as dfsBfs from "./dfs-bfs";
import * as dijkstra from "./dijkstra";
import * as bellmanFord from "./bellman-ford";
import * as aStar from "./a-star";
import * as floydWarshall from "./floyd-warshall";
import * as topologicalSort from "./topological-sort";
import * as mst from "./mst";
import * as binaryHeap from "./binary-heap";
import * as heapSort from "./heap-sort";
import * as buscaBinaria from "./busca-binaria";
import * as buscaBinariaAvancada from "./busca-binaria-avancada";
import * as ordenacaoBasica from "./ordenacao-basica";
import * as mergeSort from "./merge-sort";
import * as quickSort from "./quick-sort";
import * as shellSort from "./shell-sort";
import * as countingSort from "./counting-sort";
import * as radixSort from "./radix-sort";
import * as bucketSort from "./bucket-sort";
import * as backtracking from "./backtracking";
import * as programacaoDinamica from "./programacao-dinamica";
import * as greedy from "./greedy";
import * as binaryNumbers from "./binary-numbers";
import * as negativeBinary from "./negative-binary";
import * as operacoesBitwise from "./operacoes-bitwise";
import * as matematica from "./matematica";
import * as bloomFilter from "./bloom-filter";
import * as countMinSketch from "./count-min-sketch";
import * as hyperloglog from "./hyperloglog";
import * as reservoirSampling from "./reservoir-sampling";
import * as lsmTree from "./lsm-tree";
import * as writeAheadLog from "./write-ahead-log";
import * as floydWarshallLogistica from "./floyd-warshall-logistica";
import * as modelagemDeRotas from "./modelagem-de-rotas";
import * as contractionHierarchies from "./contraction-hierarchies";
import * as avl from "./avl";
import * as rubroNegra from "./rubro-negra";
import * as splayTree from "./splay-tree";
import * as treap from "./treap";
import * as bTree from "./b-tree";
import * as segmentTree from "./segment-tree";
import * as lazyPropagation from "./lazy-propagation";
import * as fenwickTree from "./fenwick-tree";
import * as sparseTable from "./sparse-table";
import * as kmp from "./kmp";
import * as funcaoZ from "./funcao-z";
import * as rabinKarp from "./rabin-karp";
import * as ahoCorasick from "./aho-corasick";
import * as suffixArray from "./suffix-array";
import * as componentesFortementeConexos from "./componentes-fortemente-conexos";
import * as pontesEArticulacoes from "./pontes-e-articulacoes";
import * as lca from "./lca";
import * as fluxoMaximo from "./fluxo-maximo";
import * as emparelhamentoBipartido from "./emparelhamento-bipartido";
import * as doisSat from "./dois-sat";
import * as skipList from "./skip-list";
import * as unionFind from "./union-find";
import * as trie from "./trie";
import * as lruCache from "./lru-cache";
import * as consistentHashing from "./consistent-hashing";
import * as merkleTree from "./merkle-tree";
import * as arvoresEspaciais from "./arvores-espaciais";

const MODULOS: ModuloDeTopico[] = [
  bigO,
  arrays,
  strings,
  subarraySubstringSubsequenceSubset,
  twoPointers,
  slidingWindow,
  prefixSum,
  intervals,
  hashTable,
  listasLigadas,
  pilhas,
  filas,
  recursao,
  recursaoFuncional,
  treeTraversals,
  arvoresBinarias,
  nAryTrees,
  bst,
  grafosIntro,
  dfsBfs,
  dijkstra,
  bellmanFord,
  aStar,
  floydWarshall,
  topologicalSort,
  mst,
  binaryHeap,
  heapSort,
  buscaBinaria,
  buscaBinariaAvancada,
  ordenacaoBasica,
  mergeSort,
  quickSort,
  shellSort,
  countingSort,
  radixSort,
  bucketSort,
  backtracking,
  programacaoDinamica,
  greedy,
  binaryNumbers,
  negativeBinary,
  operacoesBitwise,
  matematica,
  bloomFilter,
  countMinSketch,
  hyperloglog,
  reservoirSampling,
  lsmTree,
  writeAheadLog,
  floydWarshallLogistica,
  modelagemDeRotas,
  contractionHierarchies,
  avl,
  rubroNegra,
  splayTree,
  treap,
  bTree,
  segmentTree,
  lazyPropagation,
  fenwickTree,
  sparseTable,
  kmp,
  funcaoZ,
  rabinKarp,
  ahoCorasick,
  suffixArray,
  componentesFortementeConexos,
  pontesEArticulacoes,
  lca,
  fluxoMaximo,
  emparelhamentoBipartido,
  doisSat,
  skipList,
  unionFind,
  trie,
  lruCache,
  consistentHashing,
  merkleTree,
  arvoresEspaciais,
];

/** Todos os tópicos do site, na ordem em que foram registrados. */
export const TOPICOS: Topic[] = MODULOS.map((m) => m.topico);

const POR_SLUG = new Map(MODULOS.map((m) => [m.topico.slug, m]));

export function getTopico(slug: string): Topic | undefined {
  return POR_SLUG.get(slug)?.topico;
}

/** Os `## h2` do artigo de um tópico, para o índice "Nesta página". */
export function getSumario(slug: string): string[] | undefined {
  return POR_SLUG.get(slug)?.sumario;
}

/** Este tópico tem artigo escrito? (o corpo vem de `./artigos`) */
export function temArtigo(slug: string): boolean {
  return POR_SLUG.get(slug)?.sumario !== undefined;
}

/**
 * Tópico realmente vazio: ainda não tem nenhum material (vídeo, artigo ou
 * visualização). Só esses recebem o rótulo "em breve" e ficam fora do índice do
 * Google; quem já tem ao menos um material não é mais "em breve".
 *
 * `extraVideos` NÃO conta, de propósito: são links para resoluções soltas de
 * exercício, e um tópico que só tem isso continua sem aula, sem texto e sem
 * visualização.
 */
export function isEmptyTopic(t: Topic): boolean {
  return t.status === "soon" && !t.youtube && !t.article && !t.viz;
}

/**
 * Quem tem lista de problemas. A LISTA mora em `./pratica.ts`, que é servidor;
 * aqui fica só o conjunto dos slugs, porque a etiqueta "Exercícios" aparece nos
 * cards, e card é cliente. São 40 slugs contra 40 KB de problemas.
 *
 * É cópia, e cópia diverge: o teste `a etiqueta de exercícios bate com a lista
 * de problemas` compara este conjunto com o `./pratica.ts` de verdade.
 */
const COM_PROBLEMAS = new Set(["big-o", "arrays", "strings", "subarray-substring-subsequence-subset", "two-pointers", "sliding-window", "prefix-sum", "intervals", "hash-table", "listas-ligadas", "pilhas", "filas", "recursao", "recursao-funcional", "tree-traversals", "arvores-binarias", "n-ary-trees", "bst", "grafos-intro", "dfs-bfs", "dijkstra", "bellman-ford", "a-star", "topological-sort", "mst", "binary-heap", "heap-sort", "busca-binaria", "ordenacao-basica", "merge-sort", "quick-sort", "shell-sort", "backtracking", "binary-numbers", "negative-binary", "bloom-filter", "skip-list", "union-find", "trie"]);

/** Tags de conteúdo mostradas nos cards: o que cada tópico já tem. */
export type TagKind = "visual" | "article" | "video" | "exercises";
export type Tag = { kind: TagKind; label: string };

export function topicTags(t: Topic): Tag[] {
  const tags: Tag[] = [];
  if (t.viz) tags.push({ kind: "visual", label: "Visualização" });
  if (t.status === "ready" || t.article) tags.push({ kind: "article", label: "Artigo" });
  if (t.youtube || (t.extraVideos && t.extraVideos.length)) tags.push({ kind: "video", label: "Vídeo" });
  if (COM_PROBLEMAS.has(t.slug)) tags.push({ kind: "exercises", label: "Exercícios" });
  return tags;
}

// ------------------------------ os números --------------------------------
//
// Contam o SITE INTEIRO, e não uma parte dele. Enquanto os Fundamentos eram a
// única casa, "tópicos" e "tópicos dos Fundamentos" eram a mesma coisa e os
// números da home falavam dos dois sem escolher. Não são mais: com sete
// roadmaps citando 80 tópicos, contar só os Fundamentos seria a home anunciar
// metade do que o site tem.

export const TOTAL_TOPICS = TOPICOS.length;
export const TOTAL_VISUALIZERS = TOPICOS.filter((t) => t.viz).length;
/**
 * Só os do LeetCode. Os textos de SEO citam "problemas do LeetCode"
 * nominalmente, e prometer o total (que inclui GeeksforGeeks) seria contar duas
 * fontes como uma.
 */

/**
 * Tópicos que já têm alguma coisa para o aluno abrir.
 *
 * Deriva de `isEmptyTopic`, a MESMA função que decide o selo "em breve" e o
 * `noindex`: o número sobe sozinho no dia em que um tópico ganha material.
 */
export const TOTAL_TOPICS_PRONTOS = TOPICOS.filter((t) => !isEmptyTopic(t)).length;
