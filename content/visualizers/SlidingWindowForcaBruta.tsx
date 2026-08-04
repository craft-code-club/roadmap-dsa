"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// SlidingWindowForcaBruta, os dois algoritmos correndo lado a lado.
//
// O SlidingWindowVisualizer ensina COMO a janela anda. Este aqui existe para
// responder outra pergunta: POR QUE vale a pena. Roda a força bruta e a janela
// sobre o mesmo array, com um contador de operações para cada, e a diferença
// entre os dois números é o argumento inteiro da técnica.
//
// A casca (medição de altura, painel com cabeçalho e controles parados, código
// recolhível, teclado) vem do `useVisualizer`. Contrato em
// `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type Step = {
  // Índices da janela atualmente sob análise nos dois lados.
  start: number;
  end: number;
  // Quem está sendo somado agora na força bruta (null quando não é leitura).
  reading: number | null;
  // Na janela: quem entrou e quem saiu neste passo.
  entered: number | null;
  removed: number | null;
  bruteOps: number;
  windowOps: number;
  bruteSum: number;
  windowSum: number;
  bruteBest: number;
  windowBest: number;
  line: number;
  note: string;
  done?: boolean;
};

const CODE = [
  "# força bruta: refaz a soma inteira de cada janela",
  "for i in range(n - k + 1):",
  "    soma = 0",
  "    for j in range(i, i + k):",
  "        soma += nums[j]        # k leituras por janela",
  "",
  "# janela deslizante: mantém a soma",
  "soma = sum(nums[:k])",
  "for direita in range(k, n):",
  "    soma += nums[direita]      # entra 1",
  "    soma -= nums[direita - k]  # sai 1",
];

const SPEEDS = [0, 1100, 750, 480, 300, 160];

const DEFAULT_ARRAY = [2, 3, 4, 5, 6, 7, 1, 9];
const DEFAULT_K = 3;

function generateSteps(nums: number[], k: number): Step[] {
  const steps: Step[] = [];
  const n = nums.length;
  if (k < 1 || k > n) {
    steps.push({
      start: 0, end: -1, reading: null, entered: null, removed: null,
      bruteOps: 0, windowOps: 0, bruteSum: 0, windowSum: 0,
      bruteBest: 0, windowBest: 0, line: 1, done: true,
      note: `k = ${k} não cabe num array de ${n} posições. Não existe janela nenhuma para analisar, e este é um caso de borda que todo código precisa tratar.`,
    });
    return steps;
  }

  // A força bruta roda inteira primeiro (só para termos o total dela por janela),
  // mas os passos são intercalados: cada janela mostra os dois custos juntos.
  let bruteOps = 0, windowOps = 0;
  let bruteBest = -Infinity, windowBest = -Infinity;
  let windowSum = 0;

  // Montagem da primeira janela: os dois pagam k leituras aqui.
  let bruteSum = 0;
  for (let j = 0; j < k; j++) {
    bruteSum += nums[j];
    bruteOps++;
    windowSum += nums[j];
    windowOps++;
    steps.push({
      start: 0, end: k - 1, reading: j, entered: null, removed: null,
      bruteOps, windowOps, bruteSum, windowSum,
      bruteBest: bruteBest === -Infinity ? 0 : bruteBest,
      windowBest: windowBest === -Infinity ? 0 : windowBest,
      line: 4,
      note: `Primeira janela: os dois somam nums[${j}] = ${nums[j]}. Até aqui empatados, ninguém tem estado guardado ainda.`,
    });
  }
  bruteBest = bruteSum;
  windowBest = windowSum;
  steps.push({
    start: 0, end: k - 1, reading: null, entered: null, removed: null,
    bruteOps, windowOps, bruteSum, windowSum,
    bruteBest, windowBest, line: 7,
    note: `Janela [0..${k - 1}] fechada, soma ${bruteSum}. Custou ${k} leituras para os dois. A diferença começa agora.`,
  });

  // Da segunda janela em diante os caminhos separam.
  for (let i = 1; i <= n - k; i++) {
    const end = i + k - 1;

    // Força bruta: relê a janela inteira.
    bruteSum = 0;
    for (let j = i; j <= end; j++) {
      bruteSum += nums[j];
      bruteOps++;
      steps.push({
        start: i, end, reading: j, entered: null, removed: null,
        bruteOps, windowOps, bruteSum, windowSum,
        bruteBest, windowBest, line: 4,
        note: `Força bruta relendo: nums[${j}] = ${nums[j]}. Ela já tinha lido ${j > i ? `nums[${j}]` : "quase tudo isso"} na janela anterior e joga esse trabalho fora a cada passo.`,
      });
    }
    bruteBest = Math.max(bruteBest, bruteSum);

    // Janela: uma soma e uma subtração.
    const entered = end;
    const removed = i - 1;
    windowSum = windowSum + nums[entered] - nums[removed];
    windowOps += 2;
    windowBest = Math.max(windowBest, windowSum);
    steps.push({
      start: i, end, reading: null, entered, removed,
      bruteOps, windowOps, bruteSum, windowSum,
      bruteBest, windowBest, line: 10,
      note: `Janela: entrou nums[${entered}] = ${nums[entered]}, saiu nums[${removed}] = ${nums[removed]}. Duas operações, e a soma ${windowSum} bate com a da força bruta, que gastou ${k}.`,
    });
  }

  const windows = n - k + 1;
  steps.push({
    start: n - k, end: n - 1, reading: null, entered: null, removed: null,
    bruteOps, windowOps, bruteSum, windowSum,
    bruteBest, windowBest, line: 10, done: true,
    note: `Fim. Mesma resposta (${bruteBest}) com ${bruteOps} operações na força bruta contra ${windowOps} na janela, em ${windows} janelas. Aumente o k e veja a força bruta disparar enquanto a janela quase não se mexe.`,
  });
  return steps;
}

function fmt(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function SlidingWindowForcaBruta() {
  const [nums, setNums] = useState<number[]>(DEFAULT_ARRAY);
  const [input, setInput] = useState(DEFAULT_ARRAY.join(", "));
  const [k, setK] = useState(DEFAULT_K);

  const steps = useMemo(() => generateSteps(nums.length ? nums : [1], k), [nums, k]);
  const n = nums.length;

  const viz = useVisualizer({
    title: "Visualizador · força bruta contra janela, no mesmo array",
    total: steps.length,
    speeds: SPEEDS,
    // O que muda a altura da peça: o tamanho do array (as células quebram
    // linha) e a quantidade de passos, porque com k > n não sobra linha do
    // tempo e o rodapé inteiro sai da peça.
    measureOn: [n, steps.length],
  });

  const p = steps[viz.step];

  const onInputChange = (v: string) => {
    const arr = v.split(",").map((x) => parseInt(x.trim(), 10)).filter((x) => !isNaN(x)).slice(0, 14);
    viz.reset();
    setInput(v);
    setNums(arr.length ? arr : [1]);
  };

  const applyPreset = (arr: number[], kk: number) => {
    viz.reset();
    setNums(arr);
    setInput(arr.join(", "));
    setK(kk);
  };

  const saved = p.bruteOps > 0 ? Math.round(((p.bruteOps - p.windowOps) / p.bruteOps) * 100) : 0;

  const cells = nums.map((v, i) => {
    let cls = "viz-cell";
    if (i >= p.start && i <= p.end) cls += " in";
    if (i < p.start || i > p.end) cls += " drop";
    if (p.reading === i) cls += " entra";
    if (p.entered === i) cls += " entra";
    if (p.removed === i) cls += " sai";
    let mark = "";
    if (p.reading === i) mark = "lê";
    if (p.entered === i) mark = "entra";
    if (p.removed === i) mark = "sai";
    return { i, v, cls, mark };
  });

  const noteClass = "viz-note" + (p.done ? " ok" : "");

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Array</span>
            <input className="viz-input" value={input} onChange={(e) => onInputChange(e.target.value)} />
          </label>
          <label className="viz-field">
            <span>k</span>
            <input
              className="viz-input k"
              type="number"
              min={1}
              value={k}
              onChange={(e) => { viz.reset(); setK(parseInt(e.target.value, 10) || 1); }}
            />
          </label>
        </div>

        <div className="bigo-chips">
          <button className="bigo-chip" onClick={() => applyPreset(DEFAULT_ARRAY, 3)}>k pequeno (3)</button>
          <button className="bigo-chip" onClick={() => applyPreset(DEFAULT_ARRAY, 6)}>k grande (6)</button>
          <button className="bigo-chip" onClick={() => applyPreset([4, 4, 4, 4, 4, 4, 4, 4], 3)}>tudo igual</button>
          <button className="bigo-chip" onClick={() => applyPreset([9], 1)}>um elemento</button>
          <button className="bigo-chip" onClick={() => applyPreset(DEFAULT_ARRAY, 12)}>k maior que n</button>
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

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>operações da força bruta</span>
            <strong style={{ color: "#f87171" }}>{fmt(p.bruteOps)}</strong>
          </div>
          <div className="bigo-stat">
            <span>operações da janela</span>
            <strong style={{ color: "#34d399" }}>{fmt(p.windowOps)}</strong>
          </div>
          <div className="bigo-stat">
            <span>trabalho economizado</span>
            <strong>{saved}%</strong>
          </div>
          <div className="bigo-stat">
            <span>maior soma (as duas)</span>
            <strong>{fmt(Math.max(p.bruteBest, p.windowBest))}</strong>
          </div>
        </div>

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com a altura do
              código. O `.viz-code-slot` é o truque de grid 1fr→0fr, a única
              forma de animar altura automática em CSS puro. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">comparacao.py · O(n·k) contra O(n)</div>
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
            <div className="viz-var">
              <span className="viz-var-name">soma (força bruta)</span>
              <span className="viz-var-val">{fmt(p.bruteSum)}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">soma (janela)</span>
              <span className="viz-var-val best">{fmt(p.windowSum)}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">janela</span>
              <span className="viz-var-val">{p.end < p.start ? "-" : `[${p.start}..${p.end}]`}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">k</span>
              <span className="viz-var-val">{k}</span>
            </div>
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
