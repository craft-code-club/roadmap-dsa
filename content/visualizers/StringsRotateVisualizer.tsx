"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// StringsRotateVisualizer, o LeetCode 796 (Rotate String) nos dois caminhos.
//
// Gerador puro de passos + a casca adaptativa do `useVisualizer` (contrato em
// `content/visualizers/README.md`).
// A diferença é que aqui existem DUAS fitas de células alinhadas: a string de
// trabalho em cima e o goal embaixo. O alinhamento sai de graça porque as duas
// fitas têm o mesmo número de células do mesmo tamanho (as posições fora da
// janela viram célula fantasma), então elas quebram a linha nos mesmos pontos
// no celular.
//
// Modo "laço": rotaciona com fatia + concatenação, e o contador de cópias sobe
// a cada rotação. Modo "truque": concatena s consigo mesmo uma vez só e procura
// o goal ali dentro, porque s + s contém todas as rotações de s.
// ---------------------------------------------------------------------------

type Mode = "loop" | "trick";

type Step = {
  line: number;
  tape: string[];
  tapeLabel: string;
  target: (string | null)[];
  window: { start: number; end: number } | null;
  matched: number[];
  differs: number | null;
  copies: number;
  strings: number;
  comparisons: number;
  note: string;
  ok?: boolean;
  done?: boolean;
};

const LOOP_CODE = [
  "def rotate_string(s, goal):",
  "    if len(s) != len(goal):",
  "        return False",
  "    for _ in range(len(s)):",
  "        s = s[1:] + s[0]",
  "        if s == goal:",
  "            return True",
  "    return False",
];

const TRICK_CODE = [
  "def rotate_string(s, goal):",
  "    if len(s) != len(goal):",
  "        return False",
  "    dobrado = s + s",
  "    return goal in dobrado",
];

const MODES: { key: Mode; label: string; family: string; color: string; file: string }[] = [
  { key: "loop", label: "rotaciona e compara", family: "O(n²)", color: "#fbbf24", file: "ingenuo.py" },
  { key: "trick", label: "goal in s + s", family: "O(n)", color: "#34d399", file: "truque.py" },
];

const PRESETS: { label: string; s: string; goal: string }[] = [
  { label: "caso feliz", s: "abcde", goal: "cdeab" },
  { label: "não rotaciona", s: "abcde", goal: "abced" },
  { label: "tamanhos diferentes", s: "abc", goal: "abcd" },
  { label: "volta completa", s: "abcd", goal: "abcd" },
];

const WORDS = ["abcde", "craft", "codigo", "rotate", "banana"];

const MAX = 10;
const SPEEDS = [0, 1400, 950, 650, 420, 250];

function num(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

// Quantos caracteres batem antes de divergir. Serve para o contador de
// comparações não mentir: comparar duas strings NÃO é uma operação só.
function commonPrefix(a: string[], b: string[]): number {
  let k = 0;
  while (k < a.length && k < b.length && a[k] === b[k]) k++;
  return k;
}

function targetWindow(goal: string[], width: number, offset: number): (string | null)[] {
  const out: (string | null)[] = new Array(width).fill(null);
  for (let k = 0; k < goal.length && offset + k < width; k++) out[offset + k] = goal[k];
  return out;
}

function generateSteps(sInput: string, goalInput: string, mode: Mode): Step[] {
  const s0 = Array.from(sInput).slice(0, MAX);
  const goal = Array.from(goalInput).slice(0, MAX);
  const n = s0.length;
  const out: Step[] = [];

  const base = {
    copies: 0,
    strings: 0,
    comparisons: 0,
    window: null,
    matched: [],
    differs: null,
  };

  if (n !== goal.length) {
    out.push({
      ...base,
      line: 1,
      tape: s0,
      tapeLabel: "s",
      target: targetWindow(goal, Math.max(n, goal.length), 0),
      note: `len(s) = ${n} e len(goal) = ${goal.length}. Tamanhos diferentes: nenhuma rotação vai transformar um no outro.`,
    });
    out.push({
      ...base,
      line: 2,
      tape: s0,
      tapeLabel: "s",
      target: targetWindow(goal, Math.max(n, goal.length), 0),
      done: true,
      note: "Devolvo False sem copiar um único caractere. Este teste de uma linha é o que salva o pior caso.",
    });
    return out;
  }

  if (n === 0) {
    out.push({
      ...base,
      line: 1,
      tape: [],
      tapeLabel: "s",
      target: [],
      ok: true,
      done: true,
      note: "Duas strings vazias: mesmo tamanho e mesmo conteúdo, então a resposta é True sem nenhum trabalho.",
    });
    return out;
  }

  if (mode === "loop") {
    let s = [...s0];
    let copies = 0;
    let strings = 0;
    let comparisons = 0;
    out.push({
      ...base,
      line: 1,
      tape: [...s],
      tapeLabel: "s",
      target: targetWindow(goal, n, 0),
      note: `len(s) = len(goal) = ${n}, então vale tentar. Vou girar s uma posição por vez e comparar com goal a cada volta.`,
    });
    for (let i = 0; i < n; i++) {
      const first = s[0];
      s = [...s.slice(1), first];
      copies += n - 1 + n;
      strings += 2;
      out.push({
        line: 4,
        tape: [...s],
        tapeLabel: "s",
        target: targetWindow(goal, n, 0),
        window: null,
        matched: [],
        differs: null,
        copies,
        strings,
        comparisons,
        note: `Rotação ${i + 1}: s[1:] já é uma string nova com ${n - 1} ${plural(n - 1, "caractere", "caracteres")} copiados, e a concatenação com "${first}" aloca outra de ${n} e copia ${n}. Duas strings novas e ${2 * n - 1} cópias só para testar um deslocamento.`,
      });
      const k = commonPrefix(s, goal);
      const same = k === n;
      comparisons += same ? n : k + 1;
      out.push({
        line: same ? 6 : 5,
        tape: [...s],
        tapeLabel: "s",
        target: targetWindow(goal, n, 0),
        window: { start: 0, end: n - 1 },
        matched: Array.from({ length: k }, (_, j) => j),
        differs: same ? null : k,
        copies,
        strings,
        comparisons,
        ok: same,
        done: same,
        note: same
          ? `"${s.join("")}" é igual a goal. Achei na rotação ${i + 1}, depois de ${copies} ${plural(copies, "caractere copiado", "caracteres copiados")} e ${strings} strings novas.`
          : `Comparo "${s.join("")}" com "${goal.join("")}": ${k === 0 ? "já diverge no índice 0" : `batem os ${k} ${plural(k, "primeiro", "primeiros")} e divergem no índice ${k}`} ("${s[k]}" contra "${goal[k]}"). Sigo girando, e as duas strings desta volta viram lixo.`,
      });
      if (same) return out;
    }
    out.push({
      line: 7,
      tape: [...s],
      tapeLabel: "s",
      target: targetWindow(goal, n, 0),
      window: null,
      matched: [],
      differs: null,
      copies,
      strings,
      comparisons,
      done: true,
      note: `Dei a volta completa (${n} rotações) e nunca bati com goal: False. Custou ${copies} caracteres copiados e ${strings} strings alocadas para descobrir isso.`,
    });
    return out;
  }

  const doubled = [...s0, ...s0];
  let copies = 0;
  let strings = 0;
  let comparisons = 0;
  out.push({
    ...base,
    line: 1,
    tape: [...s0],
    tapeLabel: "s",
    target: targetWindow(goal, n, 0),
    note: `len(s) = len(goal) = ${n}. Mesmo tamanho, então o teste continua.`,
  });
  copies = 2 * n;
  strings = 1;
  out.push({
    line: 3,
    tape: doubled,
    tapeLabel: "dobrado = s + s",
    target: targetWindow(goal, 2 * n, 0),
    window: null,
    matched: [],
    differs: null,
    copies,
    strings,
    comparisons,
    note: `Concateno s comigo mesmo UMA vez: ${copies} cópias, uma string nova. Dentro de "${doubled.join("")}" moram todas as ${n} rotações de s, cada uma começando numa posição.`,
  });
  for (let j = 0; j <= n; j++) {
    const chunk = doubled.slice(j, j + n);
    const k = commonPrefix(chunk, goal);
    const same = k === n;
    comparisons += same ? n : k + 1;
    out.push({
      line: 4,
      tape: doubled,
      tapeLabel: "dobrado = s + s",
      target: targetWindow(goal, 2 * n, j),
      window: { start: j, end: j + n - 1 },
      matched: Array.from({ length: k }, (_, t) => j + t),
      differs: same ? null : j + k,
      copies,
      strings,
      comparisons,
      ok: same,
      done: same,
      note: same
        ? `Posição ${j}: "${chunk.join("")}" é exatamente o goal. True, e sem alocar mais nada: a busca só leu a memória que já existia.`
        : `Posição ${j}: "${chunk.join("")}" ${k === 0 ? "já diverge no primeiro caractere" : `bate ${k} ${plural(k, "caractere", "caracteres")} e diverge`}. Ando uma casa, sem alocar nada.`,
    });
    if (same) return out;
  }
  out.push({
    line: 4,
    tape: doubled,
    tapeLabel: "dobrado = s + s",
    target: targetWindow(goal, 2 * n, 0),
    window: null,
    matched: [],
    differs: null,
    copies,
    strings,
    comparisons,
    done: true,
    note: `Nenhuma posição de "${doubled.join("")}" contém "${goal.join("")}": False. Foram ${copies} cópias no total, contra as ${n * (2 * n - 1)} que o laço gastaria com esta entrada.`,
  });
  return out;
}

export function StringsRotateVisualizer() {
  const [mode, setMode] = useState<Mode>("loop");
  const [s, setS] = useState(PRESETS[0].s);
  const [goal, setGoal] = useState(PRESETS[0].goal);

  const steps = useMemo(() => generateSteps(s, goal, mode), [s, goal, mode]);
  const cfg = MODES.find((m) => m.key === mode) ?? MODES[0];
  const n = Math.min(Array.from(s).length, MAX);

  const viz = useVisualizer({
    title: "Visualizador · Rotate String, força bruta contra o truque",
    total: steps.length,
    speeds: SPEEDS,
    // O que muda a altura da peça: o modo (no truque a fita passa de n para 2n
    // células e quebra linha antes), o tamanho de s e o de goal — quando os dois
    // diferem o gerador para em dois passos e a peça encolhe.
    measureOn: [mode, n, Array.from(goal).length],
  });

  const p = steps[viz.step];

  const apply = (nextS: string, nextGoal: string) => {
    viz.reset();
    setS(Array.from(nextS).slice(0, MAX).join(""));
    setGoal(Array.from(nextGoal).slice(0, MAX).join(""));
  };

  const pickRandom = () => {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    const k = 1 + Math.floor(Math.random() * (word.length - 1));
    apply(word, word.slice(k) + word.slice(0, k));
  };

  const cellClass = (i: number, inside: boolean) => {
    let cls = "viz-cell";
    if (p.differs === i) cls += " str-cell-no";
    else if (p.matched.includes(i)) cls += " str-cell-ok";
    else if (p.window && inside) cls += " in";
    else if (p.window) cls += " drop";
    return cls;
  };

  const worstLoop = n * (2 * n - 1);
  const noteClass = "viz-note" + (p.ok ? " ok" : p.done ? " invalid" : "");
  const code = mode === "loop" ? LOOP_CODE : TRICK_CODE;

  const vars = [
    { name: "n", value: `${n}` },
    { name: "strings novas", value: num(p.strings) },
    { name: "cópias", value: num(p.copies) },
    { name: "comparações", value: num(p.comparisons), best: true },
  ];

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} color={cfg.color} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {MODES.map((m) => {
            const on = m.key === mode;
            return (
              <button
                key={m.key}
                className={`bigo-chip${on ? " on" : ""}`}
                style={on ? { borderColor: m.color, color: m.color } : undefined}
                onClick={() => {
                  viz.reset();
                  setMode(m.key);
                }}
                aria-pressed={on}
              >
                <span className="sw" style={{ background: on ? m.color : "#3a4a60" }} />
                {m.family} · {m.label}
              </button>
            );
          })}
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>s</span>
            <input className="viz-input" value={s} onChange={(e) => apply(e.target.value, goal)} />
          </label>
          <label className="viz-field grow">
            <span>goal</span>
            <input className="viz-input" value={goal} onChange={(e) => apply(s, e.target.value)} />
          </label>
          <button className="viz-btn" onClick={pickRandom}>
            Sortear
          </button>
        </div>

        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              key={pr.label}
              className={`bigo-chip${s === pr.s && goal === pr.goal ? " on" : ""}`}
              onClick={() => apply(pr.s, pr.goal)}
              aria-pressed={s === pr.s && goal === pr.goal}
            >
              {pr.label}
            </button>
          ))}
        </div>

        <div className="str-fitas">
          <span className="str-lbl">{p.tapeLabel}</span>
          <div className="viz-cells">
            {p.tape.map((c, i) => {
              const inside = p.window ? i >= p.window.start && i <= p.window.end : false;
              return (
                <div className="viz-cell-wrap" key={`f-${i}`}>
                  <span className="viz-cell-idx">{i}</span>
                  <div className={cellClass(i, inside)}>{c}</div>
                </div>
              );
            })}
          </div>
          <span className="str-lbl">goal</span>
          <div className="viz-cells">
            {p.target.map((c, i) => {
              const inside = c !== null;
              return (
                <div className="viz-cell-wrap" key={`a-${i}`}>
                  <div className={c === null ? "viz-cell str-fantasma" : cellClass(i, inside)}>{c ?? "·"}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>caracteres copiados</span>
            <strong style={{ color: cfg.color }}>{num(p.copies)}</strong>
          </div>
          <div className="bigo-stat">
            <span>comparações de caractere</span>
            <strong>{num(p.comparisons)}</strong>
          </div>
          <div className="bigo-stat">
            <span>pior caso com o laço</span>
            <strong style={{ color: "#fbbf24" }}>{num(worstLoop)}</strong>
          </div>
          <div className="bigo-stat">
            <span>pior caso com o truque</span>
            <strong style={{ color: "#34d399" }}>{num(2 * n)}</strong>
          </div>
        </div>

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          {/* O slot recolhe a ALTURA do código: zerar só a trilha da coluna
              tiraria a largura e deixaria a linha do grid do mesmo tamanho. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">
                {cfg.file} · {cfg.family}
              </div>
              <div className="viz-code-body">
                {code.map((txt, i) => (
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
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} color={cfg.color} />
    </figure>
  );

  return viz.inPanel(frame);
}
