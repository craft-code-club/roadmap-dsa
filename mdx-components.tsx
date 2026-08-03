import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";
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
    code: (props) => <code className="prose-code" {...props} />,
    pre: (props) => <pre className="prose-pre" {...props} />,
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
    ...components,
  };
}
