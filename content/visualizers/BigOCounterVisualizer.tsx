"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// BigOCounterVisualizer, o contador de operações.
//
// Mesmo padrão dos outros visualizadores (gerador puro de steps + casca
// compartilhada), com um detalhe a mais: cada passo carrega o contador de
// operações. A ideia é o aluno ver o contador parar em 1, em log n, em n e em
// n² sobre o MESMO array, e conferir a conta do pior caso ao lado.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type Step = {
  line: number;
  ops: number;
  marks: Record<number, string>;
  active: number[];
  dropped: number[];
  note: string;
  vars: { name: string; value: string; best?: boolean }[];
  ok?: boolean;
  done?: boolean;
};

type Algorithm = {
  key: string;
  name: string;
  family: string;
  cor: string;
  usesTarget: boolean;
  code: string[];
  file: string;
  worstCase: (n: number) => number;
  formula: string;
  generate: (nums: number[], target: number) => Step[];
};

const CONSTANT: string[] = [
  "def pegar(nums, i):",
  "    return nums[i]",
];

const BINARY_SEARCH: string[] = [
  "def busca_binaria(nums, alvo):",
  "    esq, dir = 0, len(nums) - 1",
  "    while esq <= dir:",
  "        meio = (esq + dir) // 2",
  "        if nums[meio] == alvo:",
  "            return meio",
  "        if nums[meio] < alvo:",
  "            esq = meio + 1",
  "        else:",
  "            dir = meio - 1",
  "    return -1",
];

const LINEAR_SEARCH: string[] = [
  "def busca_linear(nums, alvo):",
  "    for i in range(len(nums)):",
  "        if nums[i] == alvo:",
  "            return i",
  "    return -1",
];

const ALL_PAIRS: string[] = [
  "def tem_repetido(nums):",
  "    for i in range(len(nums)):",
  "        for j in range(i + 1, len(nums)):",
  "            if nums[i] == nums[j]:",
  "                return True",
  "    return False",
];

function range(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i++) out.push(i);
  return out;
}

const ALGORITHMS: Algorithm[] = [
  {
    key: "const",
    name: "Acesso por índice",
    family: "O(1)",
    cor: "#34d399",
    usesTarget: false,
    code: CONSTANT,
    file: "constante.py",
    worstCase: () => 1,
    formula: "1 operação, sempre",
    generate: (nums) => {
      const i = Math.min(3, nums.length - 1);
      return [
        { line: 0, ops: 0, marks: {}, active: [], dropped: [], note: `Quero o elemento na posição ${i}. O array tem ${nums.length} posições.`, vars: [{ name: "i", value: `${i}` }, { name: "operações", value: "0" }] },
        { line: 1, ops: 1, marks: { [i]: "i" }, active: [i], dropped: [], ok: true, done: true, note: `Peguei nums[${i}] = ${nums[i]} direto. Uma operação, e ela seria uma só com um array de 1 bilhão de posições.`, vars: [{ name: "i", value: `${i}` }, { name: "operações", value: "1", best: true }] },
      ];
    },
  },
  {
    key: "bin",
    name: "Busca binária",
    family: "O(log n)",
    cor: "#22d3ee",
    usesTarget: true,
    code: BINARY_SEARCH,
    file: "busca_binaria.py",
    worstCase: (n) => Math.ceil(Math.log2(n + 1)),
    formula: "log₂(n) operações",
    generate: (nums, target) => {
      const steps: Step[] = [];
      let left = 0, right = nums.length - 1, ops = 0;
      const vars = () => [
        { name: "esq", value: `${left}` },
        { name: "dir", value: `${right}` },
        { name: "operações", value: `${ops}`, best: true },
      ];
      steps.push({ line: 1, ops, marks: { [left]: "E", [right]: "D" }, active: range(left, right), dropped: [], note: `O array precisa estar ordenado. Procurando ${target} entre as posições ${left} e ${right}.`, vars: vars() });
      let guard = 0;
      while (left <= right && guard++ < 60) {
        const mid = Math.floor((left + right) / 2);
        ops++;
        const marks: Record<number, string> = { [mid]: "meio" };
        const dropped = [...range(0, left - 1), ...range(right + 1, nums.length - 1)];
        steps.push({ line: 3, ops, marks, active: range(left, right), dropped, note: `Operação ${ops}: olho o meio, posição ${mid}, valor ${nums[mid]}.`, vars: vars() });
        if (nums[mid] === target) {
          steps.push({ line: 5, ops, marks, active: [mid], dropped, ok: true, done: true, note: `Achei ${target} na posição ${mid} com ${ops} ${ops === 1 ? "operação" : "operações"}. A busca linear teria olhado ${mid + 1}.`, vars: vars() });
          return steps;
        }
        if (nums[mid] < target) {
          left = mid + 1;
          steps.push({ line: 7, ops, marks, active: range(left, right), dropped: [...range(0, left - 1), ...range(right + 1, nums.length - 1)], note: `${nums[mid]} < ${target}: descarto a metade da esquerda de uma vez só.`, vars: vars() });
        } else {
          right = mid - 1;
          steps.push({ line: 9, ops, marks, active: range(left, right), dropped: [...range(0, left - 1), ...range(right + 1, nums.length - 1)], note: `${nums[mid]} > ${target}: descarto a metade da direita de uma vez só.`, vars: vars() });
        }
      }
      steps.push({ line: 10, ops, marks: {}, active: [], dropped: range(0, nums.length - 1), done: true, note: `Sobrou nada para olhar: ${target} não está no array. Custou ${ops} ${ops === 1 ? "operação" : "operações"}.`, vars: vars() });
      return steps;
    },
  },
  {
    key: "lin",
    name: "Busca linear",
    family: "O(n)",
    cor: "#60a5fa",
    usesTarget: true,
    code: LINEAR_SEARCH,
    file: "busca_linear.py",
    worstCase: (n) => n,
    formula: "n operações",
    generate: (nums, target) => {
      const steps: Step[] = [];
      let ops = 0;
      steps.push({ line: 1, ops, marks: {}, active: [], dropped: [], note: `Sem ordem garantida, só resta olhar posição por posição até achar ${target}.`, vars: [{ name: "i", value: "-" }, { name: "operações", value: "0", best: true }] });
      for (let i = 0; i < nums.length; i++) {
        ops++;
        const vars = [{ name: "i", value: `${i}` }, { name: "operações", value: `${ops}`, best: true }];
        if (nums[i] === target) {
          steps.push({ line: 3, ops, marks: { [i]: "i" }, active: [i], dropped: range(0, i - 1), ok: true, done: true, note: `Achei ${target} na posição ${i}. Custou ${ops} ${ops === 1 ? "operação" : "operações"}.`, vars });
          return steps;
        }
        steps.push({ line: 2, ops, marks: { [i]: "i" }, active: [i], dropped: range(0, i - 1), note: `Operação ${ops}: nums[${i}] = ${nums[i]}, não é ${target}. Sigo.`, vars });
      }
      steps.push({ line: 4, ops, marks: {}, active: [], dropped: range(0, nums.length - 1), done: true, note: `${target} não está no array. Este é o pior caso: ${ops} operações para n = ${nums.length}.`, vars: [{ name: "i", value: "-" }, { name: "operações", value: `${ops}`, best: true }] });
      return steps;
    },
  },
  {
    key: "quad",
    name: "Todos os pares",
    family: "O(n²)",
    cor: "#fbbf24",
    usesTarget: false,
    code: ALL_PAIRS,
    file: "tem_repetido.py",
    worstCase: (n) => (n * (n - 1)) / 2,
    formula: "n(n-1)/2 comparações, que é O(n²)",
    generate: (nums) => {
      const steps: Step[] = [];
      let ops = 0;
      steps.push({ line: 1, ops, marks: {}, active: [], dropped: [], note: "Sem estrutura auxiliar, cada elemento é comparado com todos os outros.", vars: [{ name: "i", value: "-" }, { name: "j", value: "-" }, { name: "comparações", value: "0", best: true }] });
      for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
          ops++;
          const vars = [{ name: "i", value: `${i}` }, { name: "j", value: `${j}` }, { name: "comparações", value: `${ops}`, best: true }];
          if (nums[i] === nums[j]) {
            steps.push({ line: 4, ops, marks: { [i]: "i", [j]: "j" }, active: [i, j], dropped: [], ok: true, done: true, note: `nums[${i}] e nums[${j}] são iguais (${nums[i]}). Parei na comparação ${ops}.`, vars });
            return steps;
          }
          steps.push({ line: 3, ops, marks: { [i]: "i", [j]: "j" }, active: [i, j], dropped: [], note: `Comparação ${ops}: nums[${i}] = ${nums[i]} contra nums[${j}] = ${nums[j]}. Diferentes.`, vars });
        }
      }
      const n = nums.length;
      steps.push({ line: 5, ops, marks: {}, active: [], dropped: range(0, n - 1), done: true, note: `Nenhum repetido. Foram ${ops} comparações para n = ${n}. Dobre o array e esse número quadruplica.`, vars: [{ name: "i", value: "-" }, { name: "j", value: "-" }, { name: "comparações", value: `${ops}`, best: true }] });
      return steps;
    },
  },
];

// Ritmo próprio: um passo de busca binária pede menos tempo que uma troca de
// array, então o contador anda um pouco mais rápido que o padrão.
const SPEEDS = [0, 1200, 800, 520, 320, 170];

// O array do vídeo, já sorted (a busca binária exige ordem).
const DEFAULT_ARRAY = [2, 6, 10, 15, 20, 43, 60, 70];
const DEFAULT_TARGET = 20;

function fmt(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function BigOCounterVisualizer() {
  const [algIndex, setAlgIndex] = useState(1);
  const [nums, setNums] = useState<number[]>(DEFAULT_ARRAY);
  const [input, setInput] = useState(DEFAULT_ARRAY.join(", "));
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const alg = ALGORITHMS[algIndex];
  const steps = useMemo(() => alg.generate(nums.length ? nums : [1], target), [alg, nums, target]);
  const n = nums.length;

  const viz = useVisualizer({
    title: "Visualizador · contando operações no mesmo array",
    total: steps.length,
    speeds: SPEEDS,
    // O que muda a altura da peça: o algoritmo (o código vai de 2 a 11 linhas)
    // e o tamanho do array (as células quebram line).
    measureOn: [algIndex, n],
  });

  const p = steps[viz.step];

  const onInputChange = (v: string) => {
    const arr = v.split(",").map((x) => parseInt(x.trim(), 10)).filter((x) => !isNaN(x)).slice(0, 14);
    const sorted = [...arr].sort((a, b) => a - b);
    viz.reset();
    setInput(v);
    setNums(sorted.length ? sorted : [1]);
  };

  const pickAlgorithm = (i: number) => { viz.reset(); setAlgIndex(i); };

  const cells = nums.map((v, i) => {
    let cls = "viz-cell";
    if (p.active.includes(i)) cls += " in";
    if (p.dropped.includes(i)) cls += " drop";
    if (p.ok && p.active.includes(i)) cls += " entra";
    return { i, v, cls, marca: p.marks[i] ?? "" };
  });

  const noteClass = "viz-note" + (p.ok ? " ok" : p.done ? " invalid" : "");

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} color={alg.cor} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {ALGORITHMS.map((a, i) => {
            const on = i === algIndex;
            return (
              <button
                key={a.key}
                className={`bigo-chip${on ? " on" : ""}`}
                style={on ? { borderColor: a.cor, color: a.cor } : undefined}
                onClick={() => pickAlgorithm(i)}
                aria-pressed={on}
              >
                <span className="sw" style={{ background: on ? a.cor : "#3a4a60" }} />
                {a.family} · {a.name}
              </button>
            );
          })}
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Array (fica ordenado)</span>
            <input className="viz-input" value={input} onChange={(e) => onInputChange(e.target.value)} />
          </label>
          {alg.usesTarget && (
            <label className="viz-field">
              <span>alvo</span>
              <input
                className="viz-input k"
                type="number"
                value={target}
                onChange={(e) => { viz.reset(); setTarget(parseInt(e.target.value, 10) || 0); }}
              />
            </label>
          )}
        </div>

        <div className="viz-cells">
          {cells.map((c) => (
            <div className="viz-cell-wrap" key={c.i}>
              <span className="viz-cell-idx">{c.i}</span>
              <div className={c.cls}>{c.v}</div>
              <span className={`viz-mark${c.marca ? " show" : ""}`}>{c.marca || "·"}</span>
            </div>
          ))}
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>operações até aqui</span>
            <strong style={{ color: alg.cor }}>{fmt(p.ops)}</strong>
          </div>
          <div className="bigo-stat">
            <span>n (tamanho da entrada)</span>
            <strong>{fmt(n)}</strong>
          </div>
          <div className="bigo-stat">
            <span>pior caso com n = {fmt(n)}</span>
            <strong>{fmt(alg.worstCase(n))}</strong>
          </div>
          <div className="bigo-stat">
            <span>pior caso com n = {fmt(n * 2)}</span>
            <strong>{fmt(alg.worstCase(n * 2))}</strong>
          </div>
        </div>

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a line do grid continuava com os 374px do
              código (medido). O `.viz-code-slot` é o truque de grid 1fr→0fr,
              a única forma de animar altura automática em CSS puro.
              O código fica no DOM mesmo recolhido, e é isso que permite medir
              o pior caso de altura; `inert` tira ele do teclado e dos leitores
              de tela enquanto está dropped de vista, com `aria-hidden` de reserva
              para navegador ou leitor que ainda não honre `inert`. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">{alg.file} · {alg.formula}</div>
              <div className="viz-code-body">
                {alg.code.map((txt, i) => (
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
            {p.vars.map((v) => (
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
      <VizFooter viz={viz} color={alg.cor} />
    </figure>
  );

  return viz.inPanel(frame);
}
