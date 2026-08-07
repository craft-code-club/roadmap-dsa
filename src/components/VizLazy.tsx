"use client";

import dynamic from "next/dynamic";

/**
 * Os 86 visualizadores, carregados sob demanda.
 *
 * POR QUE ESTE ARQUIVO EXISTE, E POR QUE ELE É `"use client"`
 *
 * O `mdx-components.tsx` é a única porta de entrada dos componentes do MDX, e
 * nenhum artigo importa nada por conta própria. Enquanto ele importava os 86
 * direto, o bundler não tinha por onde cortar: os 86 viravam UM chunk de
 * 692.459 B (175,1 KB gzip) no `<head>` das 47 rotas de tópico, inclusive nas
 * 11 páginas "em breve", que não usam nenhum.
 *
 * A tentativa óbvia não funciona, e isso está medido: pôr `next/dynamic` no
 * `mdx-components.tsx` não corta um byte. Ele é um Server Component, e ali o
 * `import()` de um componente `"use client"` não é um import de verdade, é uma
 * REFERÊNCIA DE CLIENTE. Todas as referências alcançáveis pelo grafo de servidor
 * da rota entram no entry dela, dinâmicas ou não: no
 * `page_client-reference-manifest.js` os 86 apontavam para os mesmos 3 chunks do
 * entry. A preguiça do `next/dynamic` ficava só do lado do servidor, e ainda
 * custava 12.309 B gzip por rota.
 *
 * Deste lado da fronteira o `import()` é import de verdade. O grafo é o do
 * cliente, o Turbopack emite chunk assíncrono por visualizador, e cada página
 * baixa só os que usa.
 *
 * `ssr: false` É PROIBIDO AQUI, e não é preferência: o HTML pré-renderizado é o
 * ativo de SEO do projeto, e o Google indexa o que está no arquivo, não o que a
 * hidratação monta depois. Com o padrão (`ssr: true`), o servidor continua
 * renderizando o visualizador inteiro para dentro do HTML; o que passa a ser sob
 * demanda é só o JS da INTERATIVIDADE. Há teste guardando isso, contando por
 * figura quantas trazem contador de passo e controles no HTML estático.
 */

export const SlidingWindowVisualizer = dynamic(() =>
  import("@content/visualizers/SlidingWindowVisualizer").then((m) => m.SlidingWindowVisualizer)
);

export const SubTypesVisualizer = dynamic(() =>
  import("@content/visualizers/SubTypesVisualizer").then((m) => m.SubTypesVisualizer)
);

export const TwoPointersVisualizer = dynamic(() =>
  import("@content/visualizers/TwoPointersVisualizer").then((m) => m.TwoPointersVisualizer)
);

export const TwoPointersPalindromo = dynamic(() =>
  import("@content/visualizers/TwoPointersPalindromo").then((m) => m.TwoPointersPalindromo)
);

export const TwoPointersCiclo = dynamic(() =>
  import("@content/visualizers/TwoPointersCiclo").then((m) => m.TwoPointersCiclo)
);

export const StringsVisualizer = dynamic(() =>
  import("@content/visualizers/StringsVisualizer").then((m) => m.StringsVisualizer)
);

export const StringsBytesVisualizer = dynamic(() =>
  import("@content/visualizers/StringsBytesVisualizer").then((m) => m.StringsBytesVisualizer)
);

export const StringsRotateVisualizer = dynamic(() =>
  import("@content/visualizers/StringsRotateVisualizer").then((m) => m.StringsRotateVisualizer)
);

export const HashTableVisualizer = dynamic(() =>
  import("@content/visualizers/HashTableVisualizer").then((m) => m.HashTableVisualizer)
);

export const HashTableBuscaVisualizer = dynamic(() =>
  import("@content/visualizers/HashTableBuscaVisualizer").then((m) => m.HashTableBuscaVisualizer)
);

export const HashTableOperacoes = dynamic(() =>
  import("@content/visualizers/HashTableOperacoes").then((m) => m.HashTableOperacoes)
);

export const BigOChartVisualizer = dynamic(() =>
  import("@content/visualizers/BigOChartVisualizer").then((m) => m.BigOChartVisualizer)
);

export const BigOCounterVisualizer = dynamic(() =>
  import("@content/visualizers/BigOCounterVisualizer").then((m) => m.BigOCounterVisualizer)
);

export const BigOFamilias = dynamic(() =>
  import("@content/visualizers/BigOFamilias").then((m) => m.BigOFamilias)
);

export const ArraysVisualizer = dynamic(() =>
  import("@content/visualizers/ArraysVisualizer").then((m) => m.ArraysVisualizer)
);

export const ArraysOperacoes = dynamic(() =>
  import("@content/visualizers/ArraysOperacoes").then((m) => m.ArraysOperacoes)
);

export const ArraysCrescimento = dynamic(() =>
  import("@content/visualizers/ArraysCrescimento").then((m) => m.ArraysCrescimento)
);

export const ArraysMatrizes = dynamic(() =>
  import("@content/visualizers/ArraysMatrizes").then((m) => m.ArraysMatrizes)
);

export const PrefixSumVisualizer = dynamic(() =>
  import("@content/visualizers/PrefixSumVisualizer").then((m) => m.PrefixSumVisualizer)
);

export const PrefixSumTradeoff = dynamic(() =>
  import("@content/visualizers/PrefixSumTradeoff").then((m) => m.PrefixSumTradeoff)
);

export const PrefixSumGrade2D = dynamic(() =>
  import("@content/visualizers/PrefixSumGrade2D").then((m) => m.PrefixSumGrade2D)
);

export const IntervalsSobreposicaoVisualizer = dynamic(() =>
  import("@content/visualizers/IntervalsSobreposicaoVisualizer").then((m) => m.IntervalsSobreposicaoVisualizer)
);

export const IntervalsVisualizer = dynamic(() =>
  import("@content/visualizers/IntervalsVisualizer").then((m) => m.IntervalsVisualizer)
);

export const IntervalsSweepVisualizer = dynamic(() =>
  import("@content/visualizers/IntervalsSweepVisualizer").then((m) => m.IntervalsSweepVisualizer)
);

export const SlidingWindowForcaBruta = dynamic(() =>
  import("@content/visualizers/SlidingWindowForcaBruta").then((m) => m.SlidingWindowForcaBruta)
);

export const RecursionVisualizer = dynamic(() =>
  import("@content/visualizers/RecursionVisualizer").then((m) => m.RecursionVisualizer)
);

export const RecursionArvoreVisualizer = dynamic(() =>
  import("@content/visualizers/RecursionArvoreVisualizer").then((m) => m.RecursionArvoreVisualizer)
);

export const RecursionTipos = dynamic(() =>
  import("@content/visualizers/RecursionTipos").then((m) => m.RecursionTipos)
);

export const LinkedListVisualizer = dynamic(() =>
  import("@content/visualizers/LinkedListVisualizer").then((m) => m.LinkedListVisualizer)
);

export const LinkedListOperacoes = dynamic(() =>
  import("@content/visualizers/LinkedListOperacoes").then((m) => m.LinkedListOperacoes)
);

export const LinkedListReversao = dynamic(() =>
  import("@content/visualizers/LinkedListReversao").then((m) => m.LinkedListReversao)
);

export const LinkedListFloyd = dynamic(() =>
  import("@content/visualizers/LinkedListFloyd").then((m) => m.LinkedListFloyd)
);

export const SkipListVisualizer = dynamic(() =>
  import("@content/visualizers/SkipListVisualizer").then((m) => m.SkipListVisualizer)
);

export const SkipListInsercao = dynamic(() =>
  import("@content/visualizers/SkipListInsercao").then((m) => m.SkipListInsercao)
);

export const SkipListNiveis = dynamic(() =>
  import("@content/visualizers/SkipListNiveis").then((m) => m.SkipListNiveis)
);

export const StackVisualizer = dynamic(() =>
  import("@content/visualizers/StackVisualizer").then((m) => m.StackVisualizer)
);

export const StackCallStackVisualizer = dynamic(() =>
  import("@content/visualizers/StackCallStackVisualizer").then((m) => m.StackCallStackVisualizer)
);

export const StackMonotonicaVisualizer = dynamic(() =>
  import("@content/visualizers/StackMonotonicaVisualizer").then((m) => m.StackMonotonicaVisualizer)
);

export const StackImplementacoes = dynamic(() =>
  import("@content/visualizers/StackImplementacoes").then((m) => m.StackImplementacoes)
);

export const QueueVisualizer = dynamic(() =>
  import("@content/visualizers/QueueVisualizer").then((m) => m.QueueVisualizer)
);

export const QueueDuasPilhas = dynamic(() =>
  import("@content/visualizers/QueueDuasPilhas").then((m) => m.QueueDuasPilhas)
);

export const QueueDequeMonotonico = dynamic(() =>
  import("@content/visualizers/QueueDequeMonotonico").then((m) => m.QueueDequeMonotonico)
);

export const TailRecursionVisualizer = dynamic(() =>
  import("@content/visualizers/TailRecursionVisualizer").then((m) => m.TailRecursionVisualizer)
);

export const TailRecursionForma = dynamic(() =>
  import("@content/visualizers/TailRecursionForma").then((m) => m.TailRecursionForma)
);

export const TailRecursionTrampolim = dynamic(() =>
  import("@content/visualizers/TailRecursionTrampolim").then((m) => m.TailRecursionTrampolim)
);

export const TreeTraversalVisualizer = dynamic(() =>
  import("@content/visualizers/TreeTraversalVisualizer").then((m) => m.TreeTraversalVisualizer)
);

export const BinaryTreeFormatos = dynamic(() =>
  import("@content/visualizers/BinaryTreeFormatos").then((m) => m.BinaryTreeFormatos)
);

export const NAryTreeVisualizer = dynamic(() =>
  import("@content/visualizers/NAryTreeVisualizer").then((m) => m.NAryTreeVisualizer)
);

export const BSTVisualizer = dynamic(() =>
  import("@content/visualizers/BSTVisualizer").then((m) => m.BSTVisualizer)
);

export const GrafoRepresentacao = dynamic(() =>
  import("@content/visualizers/GrafoRepresentacao").then((m) => m.GrafoRepresentacao)
);

export const GrafoDfsBfs = dynamic(() =>
  import("@content/visualizers/GrafoDfsBfs").then((m) => m.GrafoDfsBfs)
);

export const DijkstraVisualizer = dynamic(() =>
  import("@content/visualizers/DijkstraVisualizer").then((m) => m.DijkstraVisualizer)
);

export const BellmanFordVisualizer = dynamic(() =>
  import("@content/visualizers/BellmanFordVisualizer").then((m) => m.BellmanFordVisualizer)
);

export const AStarVisualizer = dynamic(() =>
  import("@content/visualizers/AStarVisualizer").then((m) => m.AStarVisualizer)
);

export const TopoSortVisualizer = dynamic(() =>
  import("@content/visualizers/TopoSortVisualizer").then((m) => m.TopoSortVisualizer)
);

export const MstVisualizer = dynamic(() =>
  import("@content/visualizers/MstVisualizer").then((m) => m.MstVisualizer)
);

export const BinaryHeapVisualizer = dynamic(() =>
  import("@content/visualizers/BinaryHeapVisualizer").then((m) => m.BinaryHeapVisualizer)
);

export const HeapIndicesVisualizer = dynamic(() =>
  import("@content/visualizers/HeapIndicesVisualizer").then((m) => m.HeapIndicesVisualizer)
);

export const HeapEstruturas = dynamic(() =>
  import("@content/visualizers/HeapEstruturas").then((m) => m.HeapEstruturas)
);

export const HeapSortVisualizer = dynamic(() =>
  import("@content/visualizers/HeapSortVisualizer").then((m) => m.HeapSortVisualizer)
);

export const HeapSortEstabilidade = dynamic(() =>
  import("@content/visualizers/HeapSortEstabilidade").then((m) => m.HeapSortEstabilidade)
);

export const HeapSortComparativo = dynamic(() =>
  import("@content/visualizers/HeapSortComparativo").then((m) => m.HeapSortComparativo)
);

export const BuscaBinariaVisualizer = dynamic(() =>
  import("@content/visualizers/BuscaBinariaVisualizer").then((m) => m.BuscaBinariaVisualizer)
);

export const BuscaBinariaOverflow = dynamic(() =>
  import("@content/visualizers/BuscaBinariaOverflow").then((m) => m.BuscaBinariaOverflow)
);

export const BuscaBinariaFronteira = dynamic(() =>
  import("@content/visualizers/BuscaBinariaFronteira").then((m) => m.BuscaBinariaFronteira)
);

export const OrdenacaoBasicaVisualizer = dynamic(() =>
  import("@content/visualizers/OrdenacaoBasicaVisualizer").then((m) => m.OrdenacaoBasicaVisualizer)
);

export const OrdenacaoBasicaCorrida = dynamic(() =>
  import("@content/visualizers/OrdenacaoBasicaCorrida").then((m) => m.OrdenacaoBasicaCorrida)
);

export const OrdenacaoBasicaEstabilidade = dynamic(() =>
  import("@content/visualizers/OrdenacaoBasicaEstabilidade").then((m) => m.OrdenacaoBasicaEstabilidade)
);

export const MergeSortVisualizer = dynamic(() =>
  import("@content/visualizers/MergeSortVisualizer").then((m) => m.MergeSortVisualizer)
);

export const MergeSortNiveis = dynamic(() =>
  import("@content/visualizers/MergeSortNiveis").then((m) => m.MergeSortNiveis)
);

export const MergeEmpate = dynamic(() =>
  import("@content/visualizers/MergeEmpate").then((m) => m.MergeEmpate)
);

export const QuickSortVisualizer = dynamic(() =>
  import("@content/visualizers/QuickSortVisualizer").then((m) => m.QuickSortVisualizer)
);

export const QuickSortPivo = dynamic(() =>
  import("@content/visualizers/QuickSortPivo").then((m) => m.QuickSortPivo)
);

export const QuickSortTresVias = dynamic(() =>
  import("@content/visualizers/QuickSortTresVias").then((m) => m.QuickSortTresVias)
);

export const ShellSortVisualizer = dynamic(() =>
  import("@content/visualizers/ShellSortVisualizer").then((m) => m.ShellSortVisualizer)
);

export const ShellSortSubsequencias = dynamic(() =>
  import("@content/visualizers/ShellSortSubsequencias").then((m) => m.ShellSortSubsequencias)
);

export const ShellSortGaps = dynamic(() =>
  import("@content/visualizers/ShellSortGaps").then((m) => m.ShellSortGaps)
);

export const BacktrackingVisualizer = dynamic(() =>
  import("@content/visualizers/BacktrackingVisualizer").then((m) => m.BacktrackingVisualizer)
);

export const BacktrackingSudoku = dynamic(() =>
  import("@content/visualizers/BacktrackingSudoku").then((m) => m.BacktrackingSudoku)
);

export const BacktrackingPoda = dynamic(() =>
  import("@content/visualizers/BacktrackingPoda").then((m) => m.BacktrackingPoda)
);

export const BinarioConversor = dynamic(() =>
  import("@content/visualizers/BinarioConversor").then((m) => m.BinarioConversor)
);

export const BinarioDivisoes = dynamic(() =>
  import("@content/visualizers/BinarioDivisoes").then((m) => m.BinarioDivisoes)
);

export const BinarioBases = dynamic(() =>
  import("@content/visualizers/BinarioBases").then((m) => m.BinarioBases)
);

export const BinarioComplemento = dynamic(() =>
  import("@content/visualizers/BinarioComplemento").then((m) => m.BinarioComplemento)
);

export const BinarioTresFormas = dynamic(() =>
  import("@content/visualizers/BinarioTresFormas").then((m) => m.BinarioTresFormas)
);

export const BinarioFaixa = dynamic(() =>
  import("@content/visualizers/BinarioFaixa").then((m) => m.BinarioFaixa)
);
