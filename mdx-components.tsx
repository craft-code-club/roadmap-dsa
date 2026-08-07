import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { isValidElement, type ComponentPropsWithoutRef, type ReactNode } from "react";
// Os 86 visualizadores entram por aqui, e não por import direto: o
// `VizLazy` é `"use client"` e faz o `import()` do lado do cliente, que é o
// único lado onde ele vira chunk assíncrono de verdade. O porquê, com os
// números da tentativa que não funcionou, está no cabeçalho daquele arquivo.
import {
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
} from "@/components/VizLazy";
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

export type TipoDeLink = "interno" | "externo" | "cru";

// `mailto:`, `tel:`, `ftp:` — qualquer coisa com esquema que não seja http(s).
const TEM_ESQUEMA = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Decide o que fazer com o `href` de um link escrito no artigo.
 *
 * Este é o ponto único: os `.mdx` escrevem `[Dijkstra](/topico/dijkstra)`, no
 * formato mais natural de digitar, e a normalização acontece aqui. Consertar nos
 * 251 links dos 36 artigos seria conserto de sintoma, e o 252º nasceria errado
 * de novo.
 *
 * Três destinos, e a fronteira entre eles é o que morde:
 *
 * - **interno** (`/topico/arrays`) vira `next/link` com a barra final. O
 *   `next.config.ts` tem `trailingSlash: true`, então a URL canônica termina em
 *   barra e a sem barra devolve **308** em produção (medido:
 *   `curl -o /dev/null -w '%{http_code}' https://dsa.craftcodeclub.io/topico/arrays`).
 *   Cada clique pagava o redirecionamento e depois recarregava a aplicação
 *   inteira, porque `<a>` cru sai do router.
 * - **externo** (`https://`, `//cdn…`) continua `<a>`, e ganha o
 *   `target="_blank" rel="noopener noreferrer"` que os 12 links de problema do
 *   LeetCode não tinham.
 * - **cru**: tudo que só PARECE interno. Âncora da própria página (`#secao`)
 *   não é navegação de rota; `mailto:` e `tel:` não são caminho; e caminho que
 *   termina em nome de arquivo (`/imagens/x.png`, `/sitemap.xml`) quebraria se
 *   ganhasse barra no fim. Caminho relativo também fica de fora: sem saber a
 *   rota de origem não dá para normalizar sem chutar.
 *
 * A query e o fragmento sobrevivem à normalização: a barra entra no caminho,
 * não no fim da string (`/roadmap?g=1#x` -> `/roadmap/?g=1#x`).
 */
export function classificarLink(href?: string): { tipo: TipoDeLink; href: string } {
  if (!href) return { tipo: "cru", href: "" };
  if (href.startsWith("//") || /^https?:\/\//i.test(href)) return { tipo: "externo", href };
  if (TEM_ESQUEMA.test(href)) return { tipo: "cru", href };
  if (!href.startsWith("/")) return { tipo: "cru", href };

  const corte = href.search(/[?#]/);
  const caminho = corte === -1 ? href : href.slice(0, corte);
  const sufixo = corte === -1 ? "" : href.slice(corte);
  const ultimoSegmento = caminho.slice(caminho.lastIndexOf("/") + 1);
  if (ultimoSegmento.includes(".")) return { tipo: "cru", href };

  return { tipo: "interno", href: (caminho.endsWith("/") ? caminho : `${caminho}/`) + sufixo };
}

function Ancora({ href, className, children, ...props }: ComponentPropsWithoutRef<"a">) {
  const link = classificarLink(href);
  const classe = cx("prose-a", className);

  if (link.tipo === "interno") {
    return (
      <Link href={link.href} className={classe} {...props}>
        {children}
      </Link>
    );
  }
  if (link.tipo === "externo") {
    return (
      <a className={classe} href={link.href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  }
  return (
    <a className={classe} href={link.href || undefined} {...props}>
      {children}
    </a>
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
    a: Ancora,
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
