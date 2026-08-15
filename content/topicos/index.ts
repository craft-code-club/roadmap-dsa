import type { Level, Pratica, Problem, Reference, Tag, Topic } from "@/content/tipos";

export type * from "@/content/tipos";

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

type ModuloDeTopico = { topico: Topic; sumario?: string[] };

import { topico as bigO, sumario as bigOSumario } from "./big-o";
import { topico as arrays, sumario as arraysSumario } from "./arrays";
import { topico as strings, sumario as stringsSumario } from "./strings";
import { topico as subarraySubstringSubsequenceSubset, sumario as subarraySubstringSubsequenceSubsetSumario } from "./subarray-substring-subsequence-subset";
import { topico as twoPointers, sumario as twoPointersSumario } from "./two-pointers";
import { topico as slidingWindow, sumario as slidingWindowSumario } from "./sliding-window";
import { topico as prefixSum, sumario as prefixSumSumario } from "./prefix-sum";
import { topico as intervals, sumario as intervalsSumario } from "./intervals";
import { topico as hashTable, sumario as hashTableSumario } from "./hash-table";
import { topico as listasLigadas, sumario as listasLigadasSumario } from "./listas-ligadas";
import { topico as pilhas, sumario as pilhasSumario } from "./pilhas";
import { topico as filas, sumario as filasSumario } from "./filas";
import { topico as recursao, sumario as recursaoSumario } from "./recursao";
import { topico as recursaoFuncional, sumario as recursaoFuncionalSumario } from "./recursao-funcional";
import { topico as treeTraversals, sumario as treeTraversalsSumario } from "./tree-traversals";
import { topico as arvoresBinarias, sumario as arvoresBinariasSumario } from "./arvores-binarias";
import { topico as nAryTrees, sumario as nAryTreesSumario } from "./n-ary-trees";
import { topico as bst, sumario as bstSumario } from "./bst";
import { topico as grafosIntro, sumario as grafosIntroSumario } from "./grafos-intro";
import { topico as dfsBfs, sumario as dfsBfsSumario } from "./dfs-bfs";
import { topico as dijkstra, sumario as dijkstraSumario } from "./dijkstra";
import { topico as bellmanFord, sumario as bellmanFordSumario } from "./bellman-ford";
import { topico as aStar, sumario as aStarSumario } from "./a-star";
import { topico as floydWarshall } from "./floyd-warshall";
import { topico as topologicalSort, sumario as topologicalSortSumario } from "./topological-sort";
import { topico as mst, sumario as mstSumario } from "./mst";
import { topico as grafosAvancados } from "./grafos-avancados";
import { topico as binaryHeap, sumario as binaryHeapSumario } from "./binary-heap";
import { topico as heapSort, sumario as heapSortSumario } from "./heap-sort";
import { topico as buscaBinaria, sumario as buscaBinariaSumario } from "./busca-binaria";
import { topico as buscaBinariaAvancada } from "./busca-binaria-avancada";
import { topico as ordenacaoBasica, sumario as ordenacaoBasicaSumario } from "./ordenacao-basica";
import { topico as mergeSort, sumario as mergeSortSumario } from "./merge-sort";
import { topico as quickSort, sumario as quickSortSumario } from "./quick-sort";
import { topico as shellSort, sumario as shellSortSumario } from "./shell-sort";
import { topico as countingSort } from "./counting-sort";
import { topico as radixSort } from "./radix-sort";
import { topico as bucketSort } from "./bucket-sort";
import { topico as backtracking, sumario as backtrackingSumario } from "./backtracking";
import { topico as programacaoDinamica } from "./programacao-dinamica";
import { topico as greedy } from "./greedy";
import { topico as binaryNumbers, sumario as binaryNumbersSumario } from "./binary-numbers";
import { topico as negativeBinary, sumario as negativeBinarySumario } from "./negative-binary";
import { topico as operacoesBitwise } from "./operacoes-bitwise";
import { topico as matematica } from "./matematica";
import { topico as skipList, sumario as skipListSumario } from "./skip-list";
import { topico as trie } from "./trie";

const MODULOS: ModuloDeTopico[] = [
  { topico: bigO, sumario: bigOSumario },
  { topico: arrays, sumario: arraysSumario },
  { topico: strings, sumario: stringsSumario },
  { topico: subarraySubstringSubsequenceSubset, sumario: subarraySubstringSubsequenceSubsetSumario },
  { topico: twoPointers, sumario: twoPointersSumario },
  { topico: slidingWindow, sumario: slidingWindowSumario },
  { topico: prefixSum, sumario: prefixSumSumario },
  { topico: intervals, sumario: intervalsSumario },
  { topico: hashTable, sumario: hashTableSumario },
  { topico: listasLigadas, sumario: listasLigadasSumario },
  { topico: pilhas, sumario: pilhasSumario },
  { topico: filas, sumario: filasSumario },
  { topico: recursao, sumario: recursaoSumario },
  { topico: recursaoFuncional, sumario: recursaoFuncionalSumario },
  { topico: treeTraversals, sumario: treeTraversalsSumario },
  { topico: arvoresBinarias, sumario: arvoresBinariasSumario },
  { topico: nAryTrees, sumario: nAryTreesSumario },
  { topico: bst, sumario: bstSumario },
  { topico: grafosIntro, sumario: grafosIntroSumario },
  { topico: dfsBfs, sumario: dfsBfsSumario },
  { topico: dijkstra, sumario: dijkstraSumario },
  { topico: bellmanFord, sumario: bellmanFordSumario },
  { topico: aStar, sumario: aStarSumario },
  { topico: floydWarshall },
  { topico: topologicalSort, sumario: topologicalSortSumario },
  { topico: mst, sumario: mstSumario },
  { topico: grafosAvancados },
  { topico: binaryHeap, sumario: binaryHeapSumario },
  { topico: heapSort, sumario: heapSortSumario },
  { topico: buscaBinaria, sumario: buscaBinariaSumario },
  { topico: buscaBinariaAvancada },
  { topico: ordenacaoBasica, sumario: ordenacaoBasicaSumario },
  { topico: mergeSort, sumario: mergeSortSumario },
  { topico: quickSort, sumario: quickSortSumario },
  { topico: shellSort, sumario: shellSortSumario },
  { topico: countingSort },
  { topico: radixSort },
  { topico: bucketSort },
  { topico: backtracking, sumario: backtrackingSumario },
  { topico: programacaoDinamica },
  { topico: greedy },
  { topico: binaryNumbers, sumario: binaryNumbersSumario },
  { topico: negativeBinary, sumario: negativeBinarySumario },
  { topico: operacoesBitwise },
  { topico: matematica },
  { topico: skipList, sumario: skipListSumario },
  { topico: trie },
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
const COM_PROBLEMAS = new Set(["a-star", "arrays", "arvores-binarias", "backtracking", "bellman-ford", "big-o", "binary-heap", "binary-numbers", "bst", "busca-binaria", "dfs-bfs", "dijkstra", "filas", "grafos-intro", "hash-table", "heap-sort", "intervals", "listas-ligadas", "merge-sort", "mst", "n-ary-trees", "negative-binary", "ordenacao-basica", "pilhas", "prefix-sum", "quick-sort", "recursao", "recursao-funcional", "shell-sort", "skip-list", "sliding-window", "strings", "subarray-substring-subsequence-subset", "topological-sort", "tree-traversals", "two-pointers"]);

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
