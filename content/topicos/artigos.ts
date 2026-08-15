import type { ComponentType } from "react";
import type { MDXComponents } from "mdx/types";
import { getSumario } from "./index";

// Os CORPOS dos artigos. Um módulo só, e separado do registro dos tópicos.
//
// POR QUE SEPARADO
// `./index.ts` é dado, e dado é importado por componente de cliente: a barra
// lateral precisa da lista de tópicos para desenhar o menu. Enquanto o `Body`
// do artigo morava lá dentro, importar a lista arrastava junto os 39 artigos
// compilados, e o resultado era medido: um chunk de 2,1 MB carregado em TODA
// página, inclusive em `/apoie/`, que não tem artigo nenhum.
//
// Aqui, quem importa este módulo é só o `TopicoPagina`, que é servidor: os
// corpos entram no HTML e não no JavaScript do cliente.
//
// O `sumario` de cada artigo NÃO está aqui — ele fica no `index.ts` da pasta do
// tópico, ao lado do texto de que foi copiado, porque é lá que se percebe
// quando os dois divergem.

import bigO from "./big-o/artigo.mdx";
import arrays from "./arrays/artigo.mdx";
import strings from "./strings/artigo.mdx";
import subarraySubstringSubsequenceSubset from "./subarray-substring-subsequence-subset/artigo.mdx";
import twoPointers from "./two-pointers/artigo.mdx";
import slidingWindow from "./sliding-window/artigo.mdx";
import prefixSum from "./prefix-sum/artigo.mdx";
import intervals from "./intervals/artigo.mdx";
import hashTable from "./hash-table/artigo.mdx";
import listasLigadas from "./listas-ligadas/artigo.mdx";
import pilhas from "./pilhas/artigo.mdx";
import filas from "./filas/artigo.mdx";
import recursao from "./recursao/artigo.mdx";
import recursaoFuncional from "./recursao-funcional/artigo.mdx";
import treeTraversals from "./tree-traversals/artigo.mdx";
import arvoresBinarias from "./arvores-binarias/artigo.mdx";
import nAryTrees from "./n-ary-trees/artigo.mdx";
import bst from "./bst/artigo.mdx";
import grafosIntro from "./grafos-intro/artigo.mdx";
import dfsBfs from "./dfs-bfs/artigo.mdx";
import dijkstra from "./dijkstra/artigo.mdx";
import bellmanFord from "./bellman-ford/artigo.mdx";
import aStar from "./a-star/artigo.mdx";
import topologicalSort from "./topological-sort/artigo.mdx";
import mst from "./mst/artigo.mdx";
import binaryHeap from "./binary-heap/artigo.mdx";
import heapSort from "./heap-sort/artigo.mdx";
import buscaBinaria from "./busca-binaria/artigo.mdx";
import ordenacaoBasica from "./ordenacao-basica/artigo.mdx";
import mergeSort from "./merge-sort/artigo.mdx";
import quickSort from "./quick-sort/artigo.mdx";
import shellSort from "./shell-sort/artigo.mdx";
import backtracking from "./backtracking/artigo.mdx";
import binaryNumbers from "./binary-numbers/artigo.mdx";
import negativeBinary from "./negative-binary/artigo.mdx";
import skipList from "./skip-list/artigo.mdx";

// O `components` é o gancho por onde a página do tópico dentro de um roadmap
// troca o `a` do MDX, para as citações não saírem do percurso.
type Corpo = ComponentType<{ components?: MDXComponents }>;

const CORPOS: Record<string, Corpo> = {
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

/** O corpo do artigo, quando existe, mais os `## h2` dele para o índice. */
export type Artigo = { Body: Corpo; summary: string[] };

export function getArtigo(slug: string): Artigo | undefined {
  const Body = CORPOS[slug];
  if (!Body) return undefined;
  // Um corpo sem sumário renderiza um índice vazio, e ninguém percebe. Como as
  // duas metades são listas escritas à mão em arquivos diferentes, o desencontro
  // é a falha esperada, e ela precisa ser barulhenta no build.
  const summary = getSumario(slug);
  if (!summary) {
    throw new Error(
      `content/topicos/artigos.ts: "${slug}" tem artigo.mdx importado aqui e nenhum ` +
        `\`sumario\` em content/topicos/${slug}/index.ts.`
    );
  }
  return { Body, summary };
}
