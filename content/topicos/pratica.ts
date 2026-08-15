import type { Problem, Reference } from "./index";

// Os problemas para praticar e as referências, de todos os tópicos.
//
// POR QUE ESTE MÓDULO EXISTE, e não é um campo do `Topic`
// Estas duas listas são 3/4 do peso do dado de um tópico: 64 KB dos 85 KB
// somando os 80 tópicos, contra 20 KB de tudo o mais (nome, nível, descrição,
// vídeo). E elas só aparecem em UM lugar: a seção "Problemas para praticar" e a
// seção "Referências" da página do tópico, que é servidor.
//
// O `./index.ts`, por outro lado, é importado pela barra lateral, que é
// cliente: com as listas lá dentro, TODA página do site baixava os problemas e
// as referências dos 80 tópicos para desenhar um menu. Medido: 18 KB gzip a
// mais por página, e o teto de JS por rota estourado em 12 rotas.
//
// É a mesma separação do `./artigos.ts`, pela mesma razão, e o par completo do
// tópico continua na pasta dele: `<slug>/index.ts`, `<slug>/artigo.mdx`,
// `<slug>/pratica.ts`.

import * as bigO from "./big-o/pratica";
import * as arrays from "./arrays/pratica";
import * as strings from "./strings/pratica";
import * as subarraySubstringSubsequenceSubset from "./subarray-substring-subsequence-subset/pratica";
import * as twoPointers from "./two-pointers/pratica";
import * as slidingWindow from "./sliding-window/pratica";
import * as prefixSum from "./prefix-sum/pratica";
import * as intervals from "./intervals/pratica";
import * as hashTable from "./hash-table/pratica";
import * as listasLigadas from "./listas-ligadas/pratica";
import * as pilhas from "./pilhas/pratica";
import * as filas from "./filas/pratica";
import * as recursao from "./recursao/pratica";
import * as recursaoFuncional from "./recursao-funcional/pratica";
import * as treeTraversals from "./tree-traversals/pratica";
import * as arvoresBinarias from "./arvores-binarias/pratica";
import * as nAryTrees from "./n-ary-trees/pratica";
import * as bst from "./bst/pratica";
import * as grafosIntro from "./grafos-intro/pratica";
import * as dfsBfs from "./dfs-bfs/pratica";
import * as dijkstra from "./dijkstra/pratica";
import * as bellmanFord from "./bellman-ford/pratica";
import * as aStar from "./a-star/pratica";
import * as topologicalSort from "./topological-sort/pratica";
import * as mst from "./mst/pratica";
import * as binaryHeap from "./binary-heap/pratica";
import * as heapSort from "./heap-sort/pratica";
import * as buscaBinaria from "./busca-binaria/pratica";
import * as ordenacaoBasica from "./ordenacao-basica/pratica";
import * as mergeSort from "./merge-sort/pratica";
import * as quickSort from "./quick-sort/pratica";
import * as shellSort from "./shell-sort/pratica";
import * as backtracking from "./backtracking/pratica";
import * as binaryNumbers from "./binary-numbers/pratica";
import * as negativeBinary from "./negative-binary/pratica";
import * as bloomFilter from "./bloom-filter/pratica";
import * as skipList from "./skip-list/pratica";
import * as unionFind from "./union-find/pratica";
import * as trie from "./trie/pratica";

type Pratica = { problems?: Problem[]; references?: Reference[] };

const PRATICA: Record<string, Pratica> = {
  "big-o": bigO,
  "arrays": arrays,
  "strings": strings,
  "subarray-substring-subsequence-subset": subarraySubstringSubsequenceSubset,
  "two-pointers": twoPointers,
  "sliding-window": slidingWindow,
  "prefix-sum": prefixSum,
  "intervals": intervals,
  "hash-table": hashTable,
  "listas-ligadas": listasLigadas,
  "pilhas": pilhas,
  "filas": filas,
  "recursao": recursao,
  "recursao-funcional": recursaoFuncional,
  "tree-traversals": treeTraversals,
  "arvores-binarias": arvoresBinarias,
  "n-ary-trees": nAryTrees,
  "bst": bst,
  "grafos-intro": grafosIntro,
  "dfs-bfs": dfsBfs,
  "dijkstra": dijkstra,
  "bellman-ford": bellmanFord,
  "a-star": aStar,
  "topological-sort": topologicalSort,
  "mst": mst,
  "binary-heap": binaryHeap,
  "heap-sort": heapSort,
  "busca-binaria": buscaBinaria,
  "ordenacao-basica": ordenacaoBasica,
  "merge-sort": mergeSort,
  "quick-sort": quickSort,
  "shell-sort": shellSort,
  "backtracking": backtracking,
  "binary-numbers": binaryNumbers,
  "negative-binary": negativeBinary,
  "bloom-filter": bloomFilter,
  "skip-list": skipList,
  "union-find": unionFind,
  "trie": trie,
};

export function getPratica(slug: string): Pratica {
  return PRATICA[slug] ?? {};
}

/** Quantos problemas o guia inteiro seleciona (o número da home). */
export const TOTAL_PROBLEMS = Object.values(PRATICA).reduce(
  (n, p) => n + (p.problems?.length ?? 0),
  0
);

/** Só os do LeetCode: é o número que a descrição da home promete. */
export const TOTAL_LEETCODE_PROBLEMS = Object.values(PRATICA).reduce(
  (n, p) => n + (p.problems ?? []).filter((x) => x.source === "LeetCode").length,
  0
);
