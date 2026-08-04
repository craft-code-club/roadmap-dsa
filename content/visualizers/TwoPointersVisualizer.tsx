"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// TwoPointersVisualizer, ponteiros convergentes (Two Sum em array ordenado).
//
// Gerador puro de passos + a casca compartilhada do `useVisualizer`: medição de
// altura, painel com cabeçalho e controles parados, código recolhível e os
// controles de reprodução. Aqui fica só o que é DESTE visualizador. Contrato em
// `content/visualizers/README.md`.
//
// Além do passo a passo, o painel de estatísticas conta as SOMAS AVALIADAS e
// mostra, ao lado, quantos pares a força bruta testaria no pior caso
// (n(n-1)/2). É esse par de números que transforma "O(n) é melhor que O(n²)"
// em algo que o aluno vê acontecendo.
// ---------------------------------------------------------------------------

type Step = {
  l: number;
  r: number;
  sum: number | null;
  sums: number; // quantas somas já foram avaliadas até este passo
  line: number;
  moveL?: boolean;
  moveR?: boolean;
  found?: boolean;
  done?: boolean;
  note: string;
};

// As linhas mapeiam 1:1 com os passos (campo `line` em generateSteps), então a
// ordem e a quantidade de linhas não podem mudar.
const CODE = [
  "def dois_ponteiros(nums, alvo):",
  "    esquerda = 0",
  "    direita = len(nums) - 1",
  "    while esquerda < direita:",
  "        soma = nums[esquerda] + nums[direita]",
  "        if soma == alvo:",
  "            return [esquerda, direita]",
  "        if soma < alvo:",
  "            esquerda += 1",
  "        else:",
  "            direita -= 1",
  "    return []",
];

const SPEEDS = [0, 1400, 950, 650, 420, 250];

function generateSteps(nums: number[], target: number): Step[] {
  const out: Step[] = [];
  let l = 0;
  let r = nums.length - 1;
  let sums = 0;
  out.push({ l, r, sum: null, sums, line: 2, note: "esquerda no início, direita no fim do array ordenado." });
  let guard = 0;
  while (l < r && guard++ < 100) {
    const sum = nums[l] + nums[r];
    sums++;
    out.push({ l, r, sum, sums, line: 4, note: `soma = nums[${l}] + nums[${r}] = ${nums[l]} + ${nums[r]} = ${sum}.` });
    if (sum === target) {
      out.push({ l, r, sum, sums, line: 6, found: true, done: true, note: `soma = alvo (${target})! Par encontrado nos índices ${l} e ${r}, com ${sums} ${sums === 1 ? "soma avaliada" : "somas avaliadas"}.` });
      return out;
    }
    if (sum < target) {
      out.push({ l, r, sum, sums, line: 8, moveL: true, note: `${sum} < ${target}: preciso de uma soma maior, então avanço a esquerda e descarto o índice ${l} de vez.` });
      l++;
    } else {
      out.push({ l, r, sum, sums, line: 10, moveR: true, note: `${sum} > ${target}: preciso de uma soma menor, então recuo a direita e descarto o índice ${r} de vez.` });
      r--;
    }
  }
  out.push({ l, r, sum: null, sums, line: 11, done: true, note: `Os ponteiros se encontraram no índice ${l}: não existe par com essa soma, e para descobrir isso bastaram ${sums} ${sums === 1 ? "soma" : "somas"}.` });
  return out;
}

const DEFAULT_NUMS = [1, 2, 3, 6, 8, 10, 20, 21];
const DEFAULT_TARGET = 16;

// Casos escolhidos a dedo: o principal, o melhor caso, o pior caso (nenhum
// par, n-1 somas) e uma borda em que todo elemento é igual.
type Preset = { key: string; label: string; nums: number[]; target: number };
const PRESETS: Preset[] = [
  { key: "encontro", label: "Do encontro: alvo 16", nums: DEFAULT_NUMS, target: DEFAULT_TARGET },
  { key: "pontas", label: "Acerta de cara: alvo 22", nums: DEFAULT_NUMS, target: 22 },
  { key: "sem", label: "Sem solução: alvo 100", nums: DEFAULT_NUMS, target: 100 },
  { key: "iguais", label: "Tudo igual: alvo 11", nums: [5, 5, 5, 5], target: 11 },
];

function sortAsc(v: number[]) {
  return [...v].sort((a, b) => a - b);
}

export function TwoPointersVisualizer() {
  const [nums, setNums] = useState<number[]>(DEFAULT_NUMS);
  const [input, setInput] = useState(DEFAULT_NUMS.join(", "));
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [preset, setPreset] = useState("encontro");

  const steps = useMemo(() => generateSteps(nums.length ? nums : [1], target), [nums, target]);
  const n = nums.length;

  const viz = useVisualizer({
    title: "Visualizador · ponteiros convergentes: dois números que somam o alvo",
    total: steps.length,
    speeds: SPEEDS,
    // O que muda a altura da peça: o tamanho do array (as células quebram
    // linha). O código tem 12 linhas fixas e o alvo não mexe no layout.
    measureOn: [n],
  });

  const p = steps[viz.step];

  const onInputChange = (v: string) => {
    const arr = sortAsc(v.split(",").map((x) => parseInt(x.trim(), 10)).filter((x) => !isNaN(x)).slice(0, 14));
    viz.reset(); setPreset("");
    setInput(v); setNums(arr.length ? arr : [1]);
  };
  const onTargetChange = (v: string) => {
    viz.reset(); setPreset("");
    setTarget(parseInt(v, 10) || 0);
  };
  const applyPreset = (pr: Preset) => {
    viz.reset(); setPreset(pr.key);
    setNums(pr.nums); setInput(pr.nums.join(", ")); setTarget(pr.target);
  };
  const shuffle = () => {
    const size = 6 + Math.floor(Math.random() * 3);
    const arr = sortAsc(Array.from({ length: size }, () => 1 + Math.floor(Math.random() * 14)));
    const newTarget = arr[Math.floor(Math.random() * size)] + arr[Math.floor(Math.random() * size)];
    viz.reset(); setPreset("");
    setNums(arr); setInput(arr.join(", ")); setTarget(newTarget);
  };

  const cells = nums.map((v, i) => {
    let cls = "viz-cell";
    if (i === p.l || i === p.r) cls += " in";
    if (i < p.l || i > p.r) cls += " drop";
    if (p.found && (i === p.l || i === p.r)) cls += " entra";
    if (p.moveL && i === p.l) cls += " entra";
    if (p.moveR && i === p.r) cls += " entra";
    let mark = "";
    if (i === p.l) mark = "E";
    if (i === p.r) mark = mark ? "E D" : "D";
    return { i, v, cls, mark };
  });

  const vars = [
    { name: "esquerda", value: `${p.l}` },
    { name: "direita", value: `${p.r}` },
    { name: "soma", value: p.sum == null ? "-" : `${p.sum}` },
    { name: "alvo", value: `${target}`, best: true },
  ];

  const bruteForcePairs = (n * (n - 1)) / 2;
  const stats = [
    { k: "n", label: "tamanho (n)", value: `${n}` },
    { k: "somas", label: "somas avaliadas", value: `${p.sums}` },
    { k: "bruta", label: "pares na força bruta", value: `${bruteForcePairs}` },
    { k: "espaco", label: "memória extra", value: "O(1)" },
  ];

  const noteClass = "viz-note" + (p.found ? " ok" : p.done ? " invalid" : "");

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              key={pr.key}
              className={`bigo-chip${preset === pr.key ? " on" : ""}`}
              onClick={() => applyPreset(pr)}
              aria-pressed={preset === pr.key}
            >
              {pr.label}
            </button>
          ))}
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Array (é ordenado sozinho)</span>
            <input className="viz-input" value={input} onChange={(e) => onInputChange(e.target.value)} />
          </label>
          <label className="viz-field">
            <span>alvo</span>
            <input className="viz-input k" type="number" value={target} onChange={(e) => onTargetChange(e.target.value)} />
          </label>
          <button className="viz-btn" onClick={shuffle}>Sortear</button>
        </div>

        <div className="viz-cells">
          {cells.map((c) => (
            <div className="viz-cell-wrap" key={c.i}>
              <span className="viz-cell-idx">{c.i}</span>
              <div className={c.cls}>{c.v}</div>
              <span className={`viz-mark${c.mark ? " show" : ""}`}>{c.mark || "·"}</span>
            </div>
          ))}
        </div>

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          {/* O `.viz-code-slot` recolhe a ALTURA (grid 1fr→0fr): zerar a trilha
              da coluna só tira a largura, e a linha do grid continuaria com a
              altura do código. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">solucao.py</div>
              <div className="viz-code-body">
                {CODE.map((txt, i) => (
                  <div key={i} className={`viz-line${i === p.line ? " on" : ""}`}>
                    <span className="ln">{i + 1}</span>
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

        <div className="bigo-stats">
          {stats.map((s) => (
            <div className="bigo-stat" key={s.k}>
              <span>{s.label}</span>
              <strong>{s.value}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(frame);
}
