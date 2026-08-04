"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// PrefixSumVisualizer, a construção da tabela de prefixos e a consulta O(1).
//
// Gerador PURO de passos + a casca compartilhada. A história tem duas fases
// numa linha do tempo só:
//
//   1. construir  -> preenche p[k + 1] = p[k] + nums[k], uma posição por passo
//   2. consultar  -> acende p[j + 1] (entra) e p[i] (sai) e faz a subtração
//
// O contador de operações é o que amarra o visualizador ao artigo: a consulta
// custa 1 subtração contra as (j - i + 1) somas da força bruta, e o painel
// mostra os dois números ao mesmo tempo.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

// Os valores das uniões (`"construir"`, `"consultar"`) ficam como estão de
// propósito: identificador é inglês, mas trocar o LITERAL só aumentaria o ruído
// do guarda de idioma sem ninguém ganhar nada — ele não aparece na tela.
type Phase = "construir" | "consultar";

type Step = {
  phase: Phase;
  line: number;
  written: number; // quantas posições de p já foram preenchidas
  currentNums: number | null; // índice destacado em nums
  currentP: number | null; // índice sendo escrito em p
  sums: number; // somas feitas no pré-processamento
  queryOps: number;
  plus: number | null; // índice de p que entra na soma
  minus: number | null; // índice de p que sai da soma
  result: number | null;
  note: string;
  ok?: boolean;
};

// As linhas mapeiam 1:1 com os passos (campo `line` em generateSteps), então a
// ordem e a quantidade de linhas não podem mudar.
const CODE = [
  "class SomaDeIntervalo:",
  "    def __init__(self, nums):",
  "        self.p = [0] * (len(nums) + 1)",
  "        for k, valor in enumerate(nums):",
  "            self.p[k + 1] = self.p[k] + valor",
  "",
  "    def soma(self, i, j):   # i e j inclusivos",
  "        return self.p[j + 1] - self.p[i]",
];

const SPEEDS = [0, 1400, 950, 650, 420, 250];

const MAX_ITEMS = 12;

// O array de referência do tópico, com a consulta que o artigo destrincha:
// soma(1, 4) = 155.
const DEFAULT_NUMS = [10, 30, 20, 45, 60, 40, 50];

type Preset = { label: string; nums: number[]; i: number; j: number };

const PRESETS: Preset[] = [
  { label: "Encontro: soma(1, 4)", nums: DEFAULT_NUMS, i: 1, j: 4 },
  { label: "Miolo: soma(2, 3)", nums: DEFAULT_NUMS, i: 2, j: 3 },
  { label: "Do início: soma(0, 2)", nums: DEFAULT_NUMS, i: 0, j: 2 },
  { label: "Um elemento: soma(3, 3)", nums: DEFAULT_NUMS, i: 3, j: 3 },
  { label: "Tudo: soma(0, 6)", nums: DEFAULT_NUMS, i: 0, j: 6 },
  { label: "Com negativos", nums: [3, -2, 5, -1, 4, -6, 2], i: 1, j: 4 },
];

function prefixSums(nums: number[]): number[] {
  const p: number[] = [0];
  for (let k = 0; k < nums.length; k++) p.push(p[k] + nums[k]);
  return p;
}

function generateSteps(nums: number[], i: number, j: number): Step[] {
  const n = nums.length;
  const p = prefixSums(nums);
  const out: Step[] = [];

  out.push({
    phase: "construir",
    line: 2,
    written: 1,
    currentNums: null,
    currentP: 0,
    sums: 0,
    queryOps: 0,
    plus: null,
    minus: null,
    result: null,
    note: `Crio p com ${n + 1} posições, uma a mais que o array, e deixo p[0] = 0. Essa posição extra é a sentinela: ela guarda a soma de nada.`,
  });

  let guard = 0;
  for (let k = 0; k < n && guard++ < 100; k++) {
    out.push({
      phase: "construir",
      line: 4,
      written: k + 2,
      currentNums: k,
      currentP: k + 1,
      sums: k + 1,
      queryOps: 0,
      plus: null,
      minus: null,
      result: null,
      note: `p[${k + 1}] = p[${k}] + nums[${k}] = ${p[k]} + ${nums[k]} = ${p[k + 1]}. Agora sei a soma de tudo do início até a posição ${k}.`,
    });
  }

  const width = j - i + 1;
  out.push({
    phase: "consultar",
    line: 6,
    written: n + 1,
    currentNums: null,
    currentP: null,
    sums: n,
    queryOps: 0,
    plus: null,
    minus: null,
    result: null,
    note: `Tabela pronta com ${n} ${n === 1 ? "soma" : "somas"}, e ela não muda mais. Agora quero soma(${i}, ${j}): na força bruta eu somaria ${width} ${width === 1 ? "número" : "números"} de novo.`,
  });

  out.push({
    phase: "consultar",
    line: 7,
    written: n + 1,
    currentNums: null,
    currentP: null,
    sums: n,
    queryOps: 0,
    plus: j + 1,
    minus: null,
    result: null,
    note: `p[${j + 1}] = ${p[j + 1]} é a soma de nums[0] até nums[${j}]. O fim do intervalo já está incluído aqui, é por isso que o índice é j + 1 e não j.`,
  });

  out.push({
    phase: "consultar",
    line: 7,
    written: n + 1,
    currentNums: null,
    currentP: null,
    sums: n,
    queryOps: 0,
    plus: j + 1,
    minus: i,
    result: null,
    note:
      i === 0
        ? "p[0] = 0: antes da posição 0 não existe nada para descontar. É exatamente para isso que a sentinela serve, sem ela eu precisaria de um if bem aqui."
        : `p[${i}] = ${p[i]} é a soma de nums[0] até nums[${i - 1}], ou seja, tudo que vem antes do intervalo. Esse é o pedaço que sobra e precisa sair.`,
  });

  const res = p[j + 1] - p[i];
  out.push({
    phase: "consultar",
    line: 7,
    written: n + 1,
    currentNums: null,
    currentP: null,
    sums: n,
    queryOps: 1,
    plus: j + 1,
    minus: i,
    result: res,
    ok: true,
    note: `${p[j + 1]} - ${p[i]} = ${res}. Duas leituras e uma subtração, e o custo seria exatamente o mesmo para um intervalo de um milhão de posições.`,
  });

  return out;
}

// Formatação determinística (nada de Intl, para o HTML do servidor e do
// cliente baterem exatamente na hidratação).
function num(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function PrefixSumVisualizer() {
  const [nums, setNums] = useState<number[]>(DEFAULT_NUMS);
  const [input, setInput] = useState(DEFAULT_NUMS.join(", "));
  const [rawI, setRawI] = useState(1);
  const [rawJ, setRawJ] = useState(4);

  const n = nums.length;
  // Os índices são presos aqui, e não no onChange, para o aluno poder digitar
  // qualquer coisa nos campos sem o visualizador entrar em estado inválido.
  const j = Math.min(Math.max(rawJ, 0), n - 1);
  const i = Math.min(Math.max(rawI, 0), j);

  const steps = useMemo(() => generateSteps(nums, i, j), [nums, i, j]);
  const p = useMemo(() => prefixSums(nums), [nums]);

  const viz = useVisualizer({
    title: "Visualizador · construir a tabela e consultar em O(1)",
    total: steps.length,
    speeds: SPEEDS,
    // O que muda a altura da peça: o tamanho do array. As duas fitas de células
    // (nums e p, com n + 1 posições) quebram linha, e a nota fica mais longa.
    measureOn: [n],
  });

  const s = steps[viz.step];
  const queryStart = n + 1;

  const onInputChange = (v: string) => {
    const arr = v
      .split(",")
      .map((x) => parseInt(x.trim(), 10))
      .filter((x) => !isNaN(x))
      .slice(0, MAX_ITEMS);
    viz.reset();
    setInput(v);
    setNums(arr.length ? arr : [1]);
  };

  const applyPreset = (pr: Preset) => {
    viz.reset();
    setNums(pr.nums);
    setInput(pr.nums.join(", "));
    setRawI(pr.i);
    setRawJ(pr.j);
  };

  const shuffle = () => {
    const size = 6 + Math.floor(Math.random() * 4);
    const arr = Array.from({ length: size }, () => 1 + Math.floor(Math.random() * 60));
    const a = Math.floor(Math.random() * size);
    const b = Math.floor(Math.random() * size);
    viz.reset();
    setNums(arr);
    setInput(arr.join(", "));
    setRawI(Math.min(a, b));
    setRawJ(Math.max(a, b));
  };

  const cellsNums = nums.map((v, k) => {
    let cls = "viz-cell";
    if (s.phase === "consultar") {
      if (k >= i && k <= j) cls += " in";
      else cls += " drop";
    }
    if (s.currentNums === k) cls += " entra";
    let mark = "";
    if (s.phase === "consultar") {
      if (k === i && k === j) mark = "i j";
      else if (k === i) mark = "i";
      else if (k === j) mark = "j";
    } else if (s.currentNums === k) {
      mark = "k";
    }
    return { k, v, cls, mark };
  });

  const cellsP = p.map((v, k) => {
    let cls = "viz-cell";
    if (k >= s.written) cls += " drop";
    if (s.currentP === k) cls += " in entra";
    if (s.plus === k) cls += " in entra";
    if (s.minus === k) cls += " sai";
    let mark = "";
    if (s.plus === k) mark = "+";
    else if (s.minus === k) mark = "-";
    else if (s.currentP === k) mark = "p";
    return { k, v: k >= s.written ? 0 : v, cls, mark };
  });

  const width = j - i + 1;

  const vars = [
    { name: "i", value: `${i}` },
    { name: "j", value: `${j}` },
    { name: `p[${j + 1}]`, value: s.plus == null ? "-" : `${p[j + 1]}` },
    { name: `p[${i}]`, value: s.minus == null ? "-" : `${p[i]}` },
    { name: "soma", value: s.result == null ? "-" : `${s.result}`, best: true },
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
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Array (nums)</span>
            <input className="viz-input" value={input} onChange={(e) => onInputChange(e.target.value)} />
          </label>
          <label className="viz-field">
            <span>i</span>
            <input
              className="viz-input k"
              type="number"
              value={rawI}
              onChange={(e) => { viz.reset(); setRawI(parseInt(e.target.value, 10) || 0); }}
            />
          </label>
          <label className="viz-field">
            <span>j</span>
            <input
              className="viz-input k"
              type="number"
              value={rawJ}
              onChange={(e) => { viz.reset(); setRawJ(parseInt(e.target.value, 10) || 0); }}
            />
          </label>
          <button className="viz-btn" onClick={shuffle}>Sortear</button>
        </div>

        <div className="viz-vars-head">nums, o array de entrada</div>
        <div className="viz-cells">
          {cellsNums.map((c) => (
            <div className="viz-cell-wrap" key={c.k}>
              <span className="viz-cell-idx">{c.k}</span>
              <div className={c.cls}>{c.v}</div>
              <span className={`viz-mark${c.mark ? " show" : ""}`}>{c.mark || "·"}</span>
            </div>
          ))}
        </div>

        <div className="viz-vars-head" style={{ marginTop: 16 }}>p, a tabela de prefixos (n + 1 posições)</div>
        <div className="viz-cells">
          {cellsP.map((c) => (
            <div className="viz-cell-wrap" key={c.k}>
              <span className="viz-cell-idx">{c.k}</span>
              <div className={c.cls}>{c.v}</div>
              <span className={`viz-mark${c.mark ? " show" : ""}`}>{c.mark || "·"}</span>
            </div>
          ))}
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>somas no pré-processamento</span>
            <strong>{num(s.sums)}</strong>
          </div>
          <div className="bigo-stat">
            <span>operações desta consulta</span>
            <strong style={{ color: "var(--ccc-green)" }}>{num(s.queryOps)}</strong>
          </div>
          <div className="bigo-stat">
            <span>a mesma consulta na força bruta</span>
            <strong style={{ color: "#fbbf24" }}>{num(width)}</strong>
          </div>
          <div className="bigo-stat">
            <span>n (tamanho do array)</span>
            <strong>{num(n)}</strong>
          </div>
        </div>

        <p className={noteClass}>{s.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com a altura do
              código. O `.viz-code-slot` é o truque de grid 1fr→0fr. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">soma_de_intervalo.py</div>
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
      {/* O rótulo fica numa linha só de propósito: o guarda de idioma não
          enxerga nó de texto JSX quebrado em várias linhas, e o que ele não vê
          ele não protege. */}
      <VizFooter viz={viz}>
        <button className="viz-btn" onClick={() => viz.stepBy(queryStart - viz.step)}>Pular para a consulta</button>
      </VizFooter>
    </figure>
  );

  return viz.inPanel(frame);
}
