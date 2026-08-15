import type { Pratica } from "./index";

// Os problemas para praticar e as referências, de todos os tópicos.
//
// POR QUE UM MÓDULO À PARTE, se o dado está na pasta do tópico
// Porque quem o importa decide o que o leitor baixa. O `./index.ts` é importado
// pela barra lateral, que é cliente; este aqui, só pela página do tópico, que é
// servidor. Cada tópico exporta `pratica` pelo nome, o `./index.ts` importa só
// `topico` e `sumario`, e o empacotador descarta o resto do pacote do cliente.
//
// Medido: com as listas dentro do `topico`, a casca do site custava 224 KB gzip
// em TODA página e 12 rotas estouravam o teto de 250 KB. Com a separação, 212.
//
// A pasta do tópico continua com dois arquivos, que é o contrato: `index.ts`
// (o dado, todo ele) e `artigo.mdx` (o texto).

import { pratica as bigO } from "./big-o";
import { pratica as arrays } from "./arrays";
import { pratica as strings } from "./strings";
import { pratica as subarraySubstringSubsequenceSubset } from "./subarray-substring-subsequence-subset";
import { pratica as twoPointers } from "./two-pointers";
import { pratica as slidingWindow } from "./sliding-window";
import { pratica as prefixSum } from "./prefix-sum";
import { pratica as intervals } from "./intervals";
import { pratica as hashTable } from "./hash-table";
import { pratica as listasLigadas } from "./listas-ligadas";
import { pratica as pilhas } from "./pilhas";
import { pratica as filas } from "./filas";
import { pratica as recursao } from "./recursao";
import { pratica as recursaoFuncional } from "./recursao-funcional";
import { pratica as treeTraversals } from "./tree-traversals";
import { pratica as arvoresBinarias } from "./arvores-binarias";
import { pratica as nAryTrees } from "./n-ary-trees";
import { pratica as bst } from "./bst";
import { pratica as grafosIntro } from "./grafos-intro";
import { pratica as dfsBfs } from "./dfs-bfs";
import { pratica as dijkstra } from "./dijkstra";
import { pratica as bellmanFord } from "./bellman-ford";
import { pratica as aStar } from "./a-star";
import { pratica as topologicalSort } from "./topological-sort";
import { pratica as mst } from "./mst";
import { pratica as binaryHeap } from "./binary-heap";
import { pratica as heapSort } from "./heap-sort";
import { pratica as buscaBinaria } from "./busca-binaria";
import { pratica as ordenacaoBasica } from "./ordenacao-basica";
import { pratica as mergeSort } from "./merge-sort";
import { pratica as quickSort } from "./quick-sort";
import { pratica as shellSort } from "./shell-sort";
import { pratica as backtracking } from "./backtracking";
import { pratica as binaryNumbers } from "./binary-numbers";
import { pratica as negativeBinary } from "./negative-binary";
import { pratica as skipList } from "./skip-list";

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
  "skip-list": skipList,
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
