"use client";

import { useMemo, useState } from "react";

import { thousands } from "@/lib/format";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// PrefixSumGrade2D, a soma de um retângulo em quatro leituras.
//
// Padrão passo a passo (gerador PURO de passos + a casca compartilhada), mas o
// dado não é uma fita de células e sim duas grades: a matriz e a tabela de
// prefixos, esta com uma linha e uma coluna sentinela.
//
// A ideia que o passo a passo precisa entregar é a inclusão e exclusão: cada
// p[r][c] é o retângulo que vai da origem até ali, então a soma de um
// retângulo qualquer é um retângulo grande menos duas faixas mais o canto que
// foi descontado duas vezes. Por isso cada passo pinta NA MATRIZ o retângulo
// que aquele termo representa, em vez de só acender um número na tabela.
//
// A casca vem do `useVisualizer`. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type Region = { r1: number; c1: number; r2: number; c2: number };

// `"alvo" | "mais" | "menos"` continuam em português porque `mais` e `menos`
// são NOMES DE CLASSE do CSS (`.ps-cell.mais`), não identificadores do
// componente: traduzir aqui obrigaria a mexer no `globals.css` compartilhado.
type Kind = "alvo" | "mais" | "menos";

type Step = {
  line: number;
  region: Region | null;
  kind: Kind;
  readP: { r: number; c: number } | null;
  signs: Record<string, "mais" | "menos">;
  accumulated: number | null;
  ops: number;
  note: string;
  ok?: boolean;
};

// As linhas mapeiam 1:1 com os passos (campo `line` em generateSteps), então a
// ordem e a quantidade de linhas não podem mudar.
const CODE = [
  "def construir(m):",
  "    linhas, colunas = len(m), len(m[0])",
  "    p = [[0] * (colunas + 1)",
  "         for _ in range(linhas + 1)]",
  "    for r in range(linhas):",
  "        for c in range(colunas):",
  "            p[r+1][c+1] = (m[r][c] + p[r][c+1]",
  "                           + p[r+1][c] - p[r][c])",
  "    return p",
  "",
  "def soma(p, r1, c1, r2, c2):",
  "    return (p[r2+1][c2+1] - p[r1][c2+1]",
  "            - p[r2+1][c1] + p[r1][c1])",
];

const SPEEDS = [0, 1600, 1100, 750, 500, 300];

// A matriz do LeetCode 304, que é a referência mais fácil de conferir: a
// consulta (2, 1) até (4, 3) tem que dar 8.
const DEFAULT_MATRIX = [
  [3, 0, 1, 4, 2],
  [5, 6, 3, 2, 1],
  [1, 2, 0, 1, 5],
  [4, 1, 0, 1, 7],
  [1, 0, 3, 0, 5],
];

type Preset = { label: string; sel: Region };

const PRESETS: Preset[] = [
  { label: "LeetCode 304", sel: { r1: 2, c1: 1, r2: 4, c2: 3 } },
  { label: "Uma linha", sel: { r1: 1, c1: 0, r2: 1, c2: 4 } },
  { label: "Uma coluna", sel: { r1: 0, c1: 2, r2: 4, c2: 2 } },
  { label: "Encostado na origem", sel: { r1: 0, c1: 0, r2: 1, c2: 2 } },
  { label: "Uma célula", sel: { r1: 3, c1: 3, r2: 3, c2: 3 } },
  { label: "A matriz toda", sel: { r1: 0, c1: 0, r2: 4, c2: 4 } },
];

// Matriz aleatória do tamanho pedido. Só sai de handler de clique, nunca do
// caminho de render, para não divergir entre servidor e cliente na hidratação.
function randomMatrix(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Math.floor(Math.random() * 10))
  );
}

function build(m: number[][]): number[][] {
  const rows = m.length;
  const cols = m[0].length;
  const p: number[][] = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      p[r + 1][c + 1] = m[r][c] + p[r][c + 1] + p[r + 1][c] - p[r][c];
    }
  }
  return p;
}

function key(r: number, c: number) {
  return `${r},${c}`;
}

function generateSteps(m: number[][], p: number[][], sel: Region): Step[] {
  const { r1, c1, r2, c2 } = sel;
  const cells = (r2 - r1 + 1) * (c2 - c1 + 1);
  const big = p[r2 + 1][c2 + 1];
  const above = p[r1][c2 + 1];
  const left = p[r2 + 1][c1];
  const corner = p[r1][c1];
  const total = big - above - left + corner;

  const signs: Record<string, "mais" | "menos"> = {};
  const out: Step[] = [];

  out.push({
    line: 10,
    region: sel,
    kind: "alvo",
    readP: null,
    signs: { ...signs },
    accumulated: null,
    ops: 0,
    note: `Quero a soma do retângulo que vai de (${r1}, ${c1}) até (${r2}, ${c2}): são ${cells} ${cells === 1 ? "célula" : "células"}. Na força bruta eu somaria uma por uma.`,
  });

  signs[key(r2 + 1, c2 + 1)] = "mais";
  out.push({
    line: 11,
    region: { r1: 0, c1: 0, r2, c2 },
    kind: "mais",
    readP: { r: r2 + 1, c: c2 + 1 },
    signs: { ...signs },
    accumulated: big,
    ops: 1,
    note: `Somo p[${r2 + 1}][${c2 + 1}] = ${big}, que é o retângulo inteiro da origem até (${r2}, ${c2}). Peguei demais de propósito, agora é só devolver o que sobrou.`,
  });

  signs[key(r1, c2 + 1)] = "menos";
  out.push({
    line: 11,
    region: r1 > 0 ? { r1: 0, c1: 0, r2: r1 - 1, c2 } : null,
    kind: "menos",
    readP: { r: r1, c: c2 + 1 },
    signs: { ...signs },
    accumulated: big - above,
    ops: 2,
    note:
      r1 > 0
        ? `Tiro p[${r1}][${c2 + 1}] = ${above}, a faixa que fica acima da linha ${r1}. Restaram ${big - above}.`
        : `Tiro p[0][${c2 + 1}] = 0: o retângulo já começa na linha 0, então não existe faixa de cima. É a linha sentinela evitando um if.`,
  });

  signs[key(r2 + 1, c1)] = "menos";
  out.push({
    line: 12,
    region: c1 > 0 ? { r1: 0, c1: 0, r2, c2: c1 - 1 } : null,
    kind: "menos",
    readP: { r: r2 + 1, c: c1 },
    signs: { ...signs },
    accumulated: big - above - left,
    ops: 3,
    note:
      c1 > 0
        ? `Tiro p[${r2 + 1}][${c1}] = ${left}, a faixa que fica à esquerda da coluna ${c1}. Restaram ${big - above - left}.`
        : `Tiro p[${r2 + 1}][0] = 0: o retângulo já começa na coluna 0, então não existe faixa à esquerda. É a coluna sentinela evitando outro if.`,
  });

  signs[key(r1, c1)] = "mais";
  out.push({
    line: 12,
    region: r1 > 0 && c1 > 0 ? { r1: 0, c1: 0, r2: r1 - 1, c2: c1 - 1 } : null,
    kind: "mais",
    readP: { r: r1, c: c1 },
    signs: { ...signs },
    accumulated: total,
    ops: 4,
    note:
      r1 > 0 && c1 > 0
        ? `As duas faixas se sobrepõem neste canto, então ele saiu duas vezes. Devolvo p[${r1}][${c1}] = ${corner} uma vez.`
        : `Aqui p[${r1}][${c1}] = 0: como o retângulo encosta na borda, as faixas não se sobrepõem e não há canto para devolver.`,
  });

  out.push({
    line: 11,
    region: sel,
    kind: "alvo",
    readP: null,
    signs: { ...signs },
    accumulated: total,
    ops: 4,
    ok: true,
    note: `${big} - ${above} - ${left} + ${corner} = ${total}. Quatro leituras contra as ${cells} somas da força bruta, e esse 4 não muda nem se o retângulo cobrir a matriz inteira.`,
  });

  return out;
}

function inside(reg: Region | null, r: number, c: number) {
  return !!reg && r >= reg.r1 && r <= reg.r2 && c >= reg.c1 && c <= reg.c2;
}

export function PrefixSumGrade2D() {
  const [matrix, setMatrix] = useState<number[][]>(DEFAULT_MATRIX);
  const [rawSel, setSel] = useState<Region>({ r1: 2, c1: 1, r2: 4, c2: 3 });
  const [anchor, setAnchor] = useState<{ r: number; c: number } | null>(null);

  const rows = matrix.length;
  const cols = matrix[0].length;
  // A seleção é presa ao tamanho da matriz aqui, e não em quem chama setSel:
  // trocar para uma matriz menor com um retângulo grande selecionado leria
  // fora da tabela de prefixos e derrubaria o componente.
  const sel = useMemo<Region>(
    () => ({
      r1: Math.min(Math.max(rawSel.r1, 0), rows - 1),
      c1: Math.min(Math.max(rawSel.c1, 0), cols - 1),
      r2: Math.min(Math.max(rawSel.r2, 0), rows - 1),
      c2: Math.min(Math.max(rawSel.c2, 0), cols - 1),
    }),
    [rawSel, rows, cols]
  );
  const p = useMemo(() => build(matrix), [matrix]);
  const steps = useMemo(() => generateSteps(matrix, p, sel), [matrix, p, sel]);

  const viz = useVisualizer({
    title: "Visualizador · soma de um retângulo em 4 leituras",
    total: steps.length,
    speeds: SPEEDS,
    // O que muda a altura da peça: o tamanho da matriz. As duas grades crescem
    // com o número de linhas (5 × 5 → 8 × 8 é o botão que mais mexe nisso).
    measureOn: [rows, cols],
  });

  const s = steps[viz.step];

  // Primeiro clique fixa um canto, o segundo fecha o retângulo. O terceiro
  // começa de novo, então dá para explorar sem nenhum botão de modo.
  const pick = (r: number, c: number) => {
    viz.reset();
    if (!anchor) {
      setAnchor({ r, c });
      setSel({ r1: r, c1: c, r2: r, c2: c });
      return;
    }
    setSel({
      r1: Math.min(anchor.r, r),
      c1: Math.min(anchor.c, c),
      r2: Math.max(anchor.r, r),
      c2: Math.max(anchor.c, c),
    });
    setAnchor(null);
  };

  // O preset devolve o cenário inteiro, matriz incluída: os números citados no
  // artigo (o 8 do LeetCode 304, as 25 células da matriz toda) só fecham sobre
  // a matriz padrão, e o aluno pode ter sorteado outra antes de clicar.
  const applyPreset = (pr: Preset) => {
    viz.reset();
    setAnchor(null);
    setMatrix(DEFAULT_MATRIX);
    setSel(pr.sel);
  };

  const shuffle = () => {
    viz.reset();
    setAnchor(null);
    setMatrix(randomMatrix(rows, cols));
  };

  // Trocar o tamanho é o argumento central da seção: a força bruta sobe com a
  // área do retângulo, as leituras na tabela continuam sendo 4.
  const toggleSize = () => {
    viz.reset();
    setAnchor(null);
    if (rows === 5) {
      setMatrix(randomMatrix(8, 8));
      setSel({ r1: 1, c1: 2, r2: 6, c2: 6 });
    } else {
      setMatrix(DEFAULT_MATRIX);
      setSel({ r1: 2, c1: 1, r2: 4, c2: 3 });
    }
  };

  const cells = (sel.r2 - sel.r1 + 1) * (sel.c2 - sel.c1 + 1);
  const target: Region = sel;

  const vars = [
    { name: "r1, c1", value: `${sel.r1}, ${sel.c1}` },
    { name: "r2, c2", value: `${sel.r2}, ${sel.c2}` },
    { name: "leituras", value: `${s.ops}` },
    { name: "soma", value: s.accumulated == null ? "-" : `${s.accumulated}`, best: true },
  ];

  const noteClass = "viz-note" + (s.ok ? " ok" : "");

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button key={pr.label} className="bigo-chip" onClick={() => applyPreset(pr)}>
              {pr.label}
            </button>
          ))}
          <button className="bigo-chip" onClick={shuffle}>Sortear valores</button>
          <button className="bigo-chip" onClick={toggleSize}>
            {rows === 5 ? "Aumentar para 8 × 8" : "Voltar para 5 × 5"}
          </button>
        </div>

        <div className="ps-2d">
          <div className="ps-2d-col">
            <div className="ps-2d-titulo">
              matriz · clique em duas células para escolher o retângulo
            </div>
            <div className="ps-grade-scroll">
              <div className="ps-grade" style={{ gridTemplateColumns: `repeat(${cols + 1}, auto)` }}>
                <div className="ps-rot" />
                {Array.from({ length: cols }, (_, c) => (
                  <div className="ps-rot" key={`hc-${c}`}>{c}</div>
                ))}
                {matrix.map((row, r) => (
                  <div key={`lin-${r}`} style={{ display: "contents" }}>
                    <div className="ps-rot">{r}</div>
                    {row.map((v, c) => {
                      let cls = "ps-cell";
                      if (inside(target, r, c)) cls += " alvo";
                      if (inside(s.region, r, c)) {
                        cls += s.kind === "alvo" ? " foco" : s.kind === "mais" ? " mais" : " menos";
                      }
                      if (anchor && anchor.r === r && anchor.c === c) cls += " ancora";
                      return (
                        <button
                          key={`m-${r}-${c}`}
                          className={cls}
                          onClick={() => pick(r, c)}
                          aria-pressed={inside(target, r, c)}
                          aria-label={`Linha ${r}, coluna ${c}, valor ${v}`}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ps-2d-col">
            <div className="ps-2d-titulo">
              p · tabela de prefixos, com linha e coluna sentinela
            </div>
            <div className="ps-grade-scroll">
              <div className="ps-grade" style={{ gridTemplateColumns: `repeat(${cols + 2}, auto)` }}>
                <div className="ps-rot" />
                {Array.from({ length: cols + 1 }, (_, c) => (
                  <div className="ps-rot" key={`ph-${c}`}>{c}</div>
                ))}
                {p.map((row, r) => (
                  <div key={`plin-${r}`} style={{ display: "contents" }}>
                    <div className="ps-rot">{r}</div>
                    {row.map((v, c) => {
                      const sign = s.signs[key(r, c)];
                      const focused = !!s.readP && s.readP.r === r && s.readP.c === c;
                      let cls = "ps-cell est";
                      if (sign === "mais") cls += " mais";
                      else if (sign === "menos") cls += " menos";
                      else if (r === 0 || c === 0) cls += " eixo";
                      if (focused) cls += " atual";
                      return <div key={`p-${r}-${c}`} className={cls}>{v}</div>;
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>células no retângulo</span>
            <strong style={{ color: "#fbbf24" }}>{thousands(cells)}</strong>
          </div>
          <div className="bigo-stat">
            <span>leituras na tabela</span>
            <strong style={{ color: "var(--ccc-green)" }}>{thousands(s.ops)}</strong>
          </div>
          <div className="bigo-stat">
            <span>pré-processamento ({rows} × {cols})</span>
            <strong>{thousands(rows * cols)}</strong>
          </div>
          <div className="bigo-stat">
            <span>soma do retângulo</span>
            <strong>{s.accumulated == null ? "-" : thousands(s.accumulated)}</strong>
          </div>
        </div>

        <p className={noteClass}>{s.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com a altura do
              código. O `.viz-code-slot` é o truque de grid 1fr→0fr. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">prefixo_2d.py</div>
              <div className="viz-code-body">
                {CODE.map((txt, k) => (
                  <div key={k} className={`viz-line${k === s.line ? " on" : ""}`}>
                    <span className="ln">{k + 1}</span>
                    {txt}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div {...viz.varsProps}>
            <div className="viz-vars-head">Variáveis</div>
            {vars.map((v) => (
              <div className="viz-var" key={v.name}>
                <span className="viz-var-name">{v.name}</span>
                <span className={`viz-var-val${v.best ? " best" : ""}`}>{v.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(frame);
}
