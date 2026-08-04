import type { MDXComponents } from "mdx/types";
import { isValidElement, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { SlidingWindowVisualizer } from "@content/visualizers/SlidingWindowVisualizer";
import { SubTypesVisualizer } from "@content/visualizers/SubTypesVisualizer";
import { TwoPointersVisualizer } from "@content/visualizers/TwoPointersVisualizer";
import { TwoPointersPalindromo } from "@content/visualizers/TwoPointersPalindromo";
import { TwoPointersCiclo } from "@content/visualizers/TwoPointersCiclo";
import { StringsVisualizer } from "@content/visualizers/StringsVisualizer";
import { StringsBytesVisualizer } from "@content/visualizers/StringsBytesVisualizer";
import { StringsRotateVisualizer } from "@content/visualizers/StringsRotateVisualizer";
import { HashTableVisualizer } from "@content/visualizers/HashTableVisualizer";
import { HashTableBuscaVisualizer } from "@content/visualizers/HashTableBuscaVisualizer";
import { HashTableOperacoes } from "@content/visualizers/HashTableOperacoes";
import { BigOChartVisualizer } from "@content/visualizers/BigOChartVisualizer";
import { BigOCounterVisualizer } from "@content/visualizers/BigOCounterVisualizer";
import { BigOFamilias } from "@content/visualizers/BigOFamilias";
import { ArraysVisualizer } from "@content/visualizers/ArraysVisualizer";
import { ArraysOperacoes } from "@content/visualizers/ArraysOperacoes";
import { ArraysCrescimento } from "@content/visualizers/ArraysCrescimento";
import { ArraysMatrizes } from "@content/visualizers/ArraysMatrizes";
import { PrefixSumVisualizer } from "@content/visualizers/PrefixSumVisualizer";
import { PrefixSumTradeoff } from "@content/visualizers/PrefixSumTradeoff";
import { PrefixSumGrade2D } from "@content/visualizers/PrefixSumGrade2D";
import { IntervalsSobreposicaoVisualizer } from "@content/visualizers/IntervalsSobreposicaoVisualizer";
import { IntervalsVisualizer } from "@content/visualizers/IntervalsVisualizer";
import { IntervalsSweepVisualizer } from "@content/visualizers/IntervalsSweepVisualizer";
import { SlidingWindowForcaBruta } from "@content/visualizers/SlidingWindowForcaBruta";
import { RecursionVisualizer } from "@content/visualizers/RecursionVisualizer";
import { RecursionArvoreVisualizer } from "@content/visualizers/RecursionArvoreVisualizer";
import { RecursionTipos } from "@content/visualizers/RecursionTipos";
import { LinkedListVisualizer } from "@content/visualizers/LinkedListVisualizer";
import { LinkedListOperacoes } from "@content/visualizers/LinkedListOperacoes";
import { LinkedListReversao } from "@content/visualizers/LinkedListReversao";
import { LinkedListFloyd } from "@content/visualizers/LinkedListFloyd";
import { SkipListVisualizer } from "@content/visualizers/SkipListVisualizer";
import { SkipListInsercao } from "@content/visualizers/SkipListInsercao";
import { SkipListNiveis } from "@content/visualizers/SkipListNiveis";
import { StackVisualizer } from "@content/visualizers/StackVisualizer";
import { StackCallStackVisualizer } from "@content/visualizers/StackCallStackVisualizer";
import { StackMonotonicaVisualizer } from "@content/visualizers/StackMonotonicaVisualizer";
import { StackImplementacoes } from "@content/visualizers/StackImplementacoes";
import { QueueVisualizer } from "@content/visualizers/QueueVisualizer";
import { QueueDuasPilhas } from "@content/visualizers/QueueDuasPilhas";
import { QueueDequeMonotonico } from "@content/visualizers/QueueDequeMonotonico";
import { TailRecursionVisualizer } from "@content/visualizers/TailRecursionVisualizer";
import { TailRecursionForma } from "@content/visualizers/TailRecursionForma";
import { TailRecursionTrampolim } from "@content/visualizers/TailRecursionTrampolim";
import { TreeTraversalVisualizer } from "@content/visualizers/TreeTraversalVisualizer";
import { BinaryTreeFormatos } from "@content/visualizers/BinaryTreeFormatos";
import { NAryTreeVisualizer } from "@content/visualizers/NAryTreeVisualizer";
import { BSTVisualizer } from "@content/visualizers/BSTVisualizer";
import { GrafoRepresentacao } from "@content/visualizers/GrafoRepresentacao";
import { GrafoDfsBfs } from "@content/visualizers/GrafoDfsBfs";
import { DijkstraVisualizer } from "@content/visualizers/DijkstraVisualizer";
import { BellmanFordVisualizer } from "@content/visualizers/BellmanFordVisualizer";
import { AStarVisualizer } from "@content/visualizers/AStarVisualizer";
import { TopoSortVisualizer } from "@content/visualizers/TopoSortVisualizer";
import { MstVisualizer } from "@content/visualizers/MstVisualizer";
import { BinaryHeapVisualizer } from "@content/visualizers/BinaryHeapVisualizer";
import { HeapIndicesVisualizer } from "@content/visualizers/HeapIndicesVisualizer";
import { HeapEstruturas } from "@content/visualizers/HeapEstruturas";
import { HeapSortVisualizer } from "@content/visualizers/HeapSortVisualizer";
import { HeapSortEstabilidade } from "@content/visualizers/HeapSortEstabilidade";
import { HeapSortComparativo } from "@content/visualizers/HeapSortComparativo";
import { BuscaBinariaVisualizer } from "@content/visualizers/BuscaBinariaVisualizer";
import { BuscaBinariaOverflow } from "@content/visualizers/BuscaBinariaOverflow";
import { BuscaBinariaFronteira } from "@content/visualizers/BuscaBinariaFronteira";
import { OrdenacaoBasicaVisualizer } from "@content/visualizers/OrdenacaoBasicaVisualizer";
import { OrdenacaoBasicaCorrida } from "@content/visualizers/OrdenacaoBasicaCorrida";
import { OrdenacaoBasicaEstabilidade } from "@content/visualizers/OrdenacaoBasicaEstabilidade";
import { MergeSortVisualizer } from "@content/visualizers/MergeSortVisualizer";
import { MergeSortNiveis } from "@content/visualizers/MergeSortNiveis";
import { MergeEmpate } from "@content/visualizers/MergeEmpate";
import { QuickSortVisualizer } from "@content/visualizers/QuickSortVisualizer";
import { QuickSortPivo } from "@content/visualizers/QuickSortPivo";
import { QuickSortTresVias } from "@content/visualizers/QuickSortTresVias";
import { ShellSortVisualizer } from "@content/visualizers/ShellSortVisualizer";
import { ShellSortSubsequencias } from "@content/visualizers/ShellSortSubsequencias";
import { ShellSortGaps } from "@content/visualizers/ShellSortGaps";
import { BacktrackingVisualizer } from "@content/visualizers/BacktrackingVisualizer";
import { BacktrackingSudoku } from "@content/visualizers/BacktrackingSudoku";
import { BacktrackingPoda } from "@content/visualizers/BacktrackingPoda";
import { BinarioConversor } from "@content/visualizers/BinarioConversor";
import { BinarioDivisoes } from "@content/visualizers/BinarioDivisoes";
import { BinarioBases } from "@content/visualizers/BinarioBases";
import { BinarioComplemento } from "@content/visualizers/BinarioComplemento";
import { BinarioTresFormas } from "@content/visualizers/BinarioTresFormas";
import { BinarioFaixa } from "@content/visualizers/BinarioFaixa";
import { slugify, textOf } from "@/lib/slug";

/**
 * Componentes globais do MDX.
 *
 * Tudo que aparece aqui pode ser usado em qualquer arquivo .mdx de tópico SEM
 * precisar de import. Para adicionar uma visualização nova, crie o componente
 * em content/visualizers e registre-o aqui, os artigos passam a poder usá-lo direto.
 *
 * Uso típico dentro de um .mdx:
 *   ## Título
 *   Texto em português...
 *   <Callout>Uma observação importante.</Callout>
 *   <SlidingWindowVisualizer variant="fixed" />
 */

function Callout({ children, tipo = "info" }: { children: ReactNode; tipo?: "info" | "aviso" }) {
  return <div className={`callout callout-${tipo}`}>{children}</div>;
}

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(" ");

// Nome bonito da linguagem para o selo do bloco de código. Quem não está no mapa
// (inclusive `text` e bloco sem linguagem, que aqui são diagramas em ASCII e não
// código) não ganha selo: o selo serve para dizer "isto aqui é Python", não para
// rotular tudo.
const LINGUAGENS: Record<string, string> = {
  python: "Python",
  elixir: "Elixir",
  javascript: "JavaScript",
  typescript: "TypeScript",
  go: "Go",
  java: "Java",
  c: "C",
  cpp: "C++",
  rust: "Rust",
  bash: "Bash",
  json: "JSON",
  sql: "SQL",
};

// A linguagem chega no `class="language-python"` do <code>, posto pelo Shiki
// (option `addLanguageClass`) a partir da cerca ```python do MDX.
function linguagemDoBloco(children: ReactNode): string | undefined {
  if (!isValidElement<{ className?: string }>(children)) return undefined;
  const classe = children.props.className?.split(/\s+/).find((c) => c.startsWith("language-"));
  return classe?.slice("language-".length);
}

/**
 * Bloco de código. O Shiki já entrega o HTML colorido do build; aqui só juntamos
 * a casca do site: a classe `.prose-pre`, o selo discreto da linguagem e a
 * remoção do fundo do tema (o bloco segue o painel do site, não abre um segundo
 * tom de escuro). O selo vive FORA do <pre> de propósito, senão ele rolaria
 * junto com o código quando a linha é larga.
 */
function Pre({ children, className, style, ...props }: ComponentPropsWithoutRef<"pre">) {
  const lang = linguagemDoBloco(children);
  const rotulo = lang ? LINGUAGENS[lang] : undefined;
  const semFundo = style ? { ...style, background: undefined, backgroundColor: undefined } : style;
  return (
    <div className={cx("code-block", rotulo && "com-lang")}>
      {rotulo && <span className="code-lang">{rotulo}</span>}
      <pre className={cx("prose-pre", className)} style={semFundo} {...props}>
        {children}
      </pre>
    </div>
  );
}

function Colunas({ children }: { children: ReactNode }) {
  return <div className="mdx-colunas">{children}</div>;
}

function Cartao({ titulo, children }: { titulo?: string; children: ReactNode }) {
  return (
    <div className="mdx-cartao">
      {titulo ? <div className="mdx-cartao-titulo">{titulo}</div> : null}
      {children}
    </div>
  );
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h2: ({ children, ...props }) => (
      <h2 id={slugify(textOf(children))} className="prose-h2" {...props}>{children}</h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 id={slugify(textOf(children))} className="prose-h3" {...props}>{children}</h3>
    ),
    p: (props) => <p className="prose-p" {...props} />,
    ul: (props) => <ul className="prose-ul" {...props} />,
    ol: (props) => <ol className="prose-ol" {...props} />,
    li: (props) => <li className="prose-li" {...props} />,
    a: (props) => <a className="prose-a" {...props} />,
    code: ({ className, ...props }) => <code className={cx("prose-code", className)} {...props} />,
    pre: Pre,
    strong: (props) => <strong className="prose-strong" {...props} />,
    em: (props) => <em {...props} />,
    hr: () => <hr className="prose-hr" />,
    // Tabela larga rola dentro do próprio contêiner, a página nunca rola na horizontal.
    table: (props) => (
      <div className="prose-table-wrap">
        <table className="prose-table" {...props} />
      </div>
    ),
    Callout,
    Colunas,
    Cartao,
    SlidingWindowVisualizer,
    SubTypesVisualizer,
    TwoPointersVisualizer,
    TwoPointersPalindromo,
    TwoPointersCiclo,
    StringsVisualizer,
    StringsBytesVisualizer,
    StringsRotateVisualizer,
    HashTableVisualizer,
    HashTableBuscaVisualizer,
    HashTableOperacoes,
    BigOChartVisualizer,
    BigOCounterVisualizer,
    BigOFamilias,
    ArraysVisualizer,
    ArraysOperacoes,
    ArraysCrescimento,
    ArraysMatrizes,
    PrefixSumVisualizer,
    PrefixSumTradeoff,
    PrefixSumGrade2D,
    IntervalsSobreposicaoVisualizer,
    IntervalsVisualizer,
    IntervalsSweepVisualizer,
    SlidingWindowForcaBruta,
    RecursionVisualizer,
    RecursionArvoreVisualizer,
    RecursionTipos,
    LinkedListVisualizer,
    LinkedListOperacoes,
    LinkedListReversao,
    LinkedListFloyd,
    SkipListVisualizer,
    SkipListInsercao,
    SkipListNiveis,
    StackVisualizer,
    StackCallStackVisualizer,
    StackMonotonicaVisualizer,
    StackImplementacoes,
    QueueVisualizer,
    QueueDuasPilhas,
    QueueDequeMonotonico,
    TailRecursionVisualizer,
    TailRecursionForma,
    TailRecursionTrampolim,
    TreeTraversalVisualizer,
    BinaryTreeFormatos,
    NAryTreeVisualizer,
    BSTVisualizer,
    GrafoRepresentacao,
    GrafoDfsBfs,
    DijkstraVisualizer,
    BellmanFordVisualizer,
    AStarVisualizer,
    TopoSortVisualizer,
    MstVisualizer,
    BinaryHeapVisualizer,
    HeapIndicesVisualizer,
    HeapEstruturas,
    HeapSortVisualizer,
    HeapSortEstabilidade,
    HeapSortComparativo,
    BuscaBinariaVisualizer,
    BuscaBinariaOverflow,
    BuscaBinariaFronteira,
    OrdenacaoBasicaVisualizer,
    OrdenacaoBasicaCorrida,
    OrdenacaoBasicaEstabilidade,
    MergeSortVisualizer,
    MergeSortNiveis,
    MergeEmpate,
    QuickSortVisualizer,
    QuickSortPivo,
    QuickSortTresVias,
    ShellSortVisualizer,
    ShellSortSubsequencias,
    ShellSortGaps,
    BacktrackingVisualizer,
    BacktrackingSudoku,
    BacktrackingPoda,
    BinarioConversor,
    BinarioDivisoes,
    BinarioBases,
    BinarioComplemento,
    BinarioTresFormas,
    BinarioFaixa,
    ...components,
  };
}
