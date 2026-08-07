"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// TwoPointersCiclo, o sabor rápido e lento (Floyd) numa lista ligada.
//
// Os outros dois visualizadores de Two Pointers andam sobre células de array.
// Aqui a estrutura tem forma própria (o "rho": uma cauda reta que desemboca num
// laço), então o desenho é um SVG com layout calculado, e não uma fileira de
// células. O gerador de passos continua puro, e a casca vem do `useVisualizer`.
//
// A lista é descrita por dois números: quantos nós vêm antes do ciclo e quantos
// nós formam o ciclo. Com ciclo = 0 a lista termina em None, que é o caso em
// que o algoritmo precisa devolver False.
// ---------------------------------------------------------------------------

type Step = {
  slow: number | null;
  fast: number | null;
  line: number;
  iteration: number;
  slowSteps: number;
  fastSteps: number;
  found?: boolean;
  done?: boolean;
  note: string;
};

// As linhas mapeiam 1:1 com o campo `line` de cada passo.
const CODE = [
  "def tem_ciclo(cabeca):",
  "    lento = rapido = cabeca",
  "    while rapido and rapido.prox:",
  "        lento = lento.prox",
  "        rapido = rapido.prox.prox",
  "        if lento is rapido:",
  "            return True",
  "    return False",
];

const R_NODE = 17; // raio do nó
const GAP = 68; // distância entre nós da cauda

function cycleRadius(cycle: number): number {
  return Math.max(48, cycle * 9);
}

// next(i): índice do próximo nó, ou null quando a lista acaba.
function makeNext(tail: number, cycle: number) {
  const total = tail + cycle;
  return (i: number | null): number | null => {
    if (i === null) return null;
    if (i < total - 1) return i + 1;
    return cycle > 0 ? tail : null;
  };
}

function generateSteps(tail: number, cycle: number): Step[] {
  const total = tail + cycle;
  const next = makeNext(tail, cycle);
  const out: Step[] = [];
  let slow: number | null = 0;
  let fast: number | null = 0;
  let iteration = 0;
  let slowSteps = 0;
  let fastSteps = 0;
  const base = () => ({ slow, fast, iteration, slowSteps, fastSteps });
  out.push({
    ...base(),
    line: 1,
    note: `lento e rápido começam os dois na cabeça, o nó 0. A lista tem ${total} ${total === 1 ? "nó" : "nós"}.`,
  });
  let guard = 0;
  while (guard++ < 200) {
    if (fast === null || next(fast) === null) {
      out.push({
        ...base(),
        line: 7,
        done: true,
        note:
          fast === null
            ? `o rápido caiu para fora da lista (None): quem tem ciclo nunca sai dele, então esta lista não tem ciclo.`
            : `o rápido está no nó ${fast}, que é o último e aponta para None: chegou ao fim, esta lista não tem ciclo.`,
      });
      break;
    }
    iteration++;
    const slowBefore = slow as number;
    const fastBefore = fast as number;
    slow = next(slow);
    slowSteps += 1;
    // O rápido dá dois saltos, mas o segundo pode cair no None. Contar sempre
    // 2 inflaria o painel, então só conta salto que aterrissa num nó.
    const middle = next(fast) as number;
    fast = next(middle);
    fastSteps += fast === null ? 1 : 2;
    const fastTarget = fast === null ? "para fora da lista (None)" : `para o nó ${fast}`;
    out.push({
      ...base(),
      line: 4,
      note: `iteração ${iteration}: o lento sai do nó ${slowBefore} e anda 1, chega ao nó ${slow}. O rápido sai do nó ${fastBefore} e anda 2, vai ${fastTarget}.`,
    });
    if (fast !== null && slow === fast) {
      out.push({
        ...base(),
        line: 6,
        found: true,
        done: true,
        note: `lento e rápido pararam os dois no nó ${slow}: eles se encontraram, logo a lista tem ciclo. Foram ${iteration} ${iteration === 1 ? "iteração" : "iterações"}.`,
      });
      break;
    }
    out.push({
      ...base(),
      line: 5,
      note:
        fast === null
          ? `o lento está no nó ${slow} e o rápido saiu da lista: ainda não se encontraram, volto para o topo do while.`
          : `o lento está no nó ${slow} e o rápido no nó ${fast}: ainda não se encontraram, volto para o topo do while.`,
    });
  }
  return out;
}

type Preset = { key: string; label: string; tail: number; cycle: number };
const PRESETS: Preset[] = [
  { key: "classico", label: "Clássico: 3 antes + ciclo de 5", tail: 3, cycle: 5 },
  { key: "sem", label: "Sem ciclo: 6 nós em fila", tail: 6, cycle: 0 },
  { key: "puro", label: "Só ciclo: 6 nós em roda", tail: 0, cycle: 6 },
  { key: "laco", label: "Laço em si mesmo: 3 + ciclo de 1", tail: 3, cycle: 1 },
];

export function TwoPointersCiclo() {
  const [tail, setTail] = useState(3);
  const [cycle, setCycle] = useState(5);
  const [preset, setPreset] = useState("classico");

  // Uma lista sem nenhum nó não teria o que desenhar nem o que percorrer.
  const nTail = tail + cycle === 0 ? 1 : tail;
  const nodeCount = nTail + cycle;

  const steps = useMemo(() => generateSteps(nTail, cycle), [nTail, cycle]);

  const viz = useVisualizer({
    title: "Visualizador · rápido e lento: existe ciclo na lista ligada?",
    total: steps.length,
    // O que muda a altura da peça: o desenho. O SVG tem largura 100% e altura
    // automática, então a altura na tela sai da razão do viewBox — e os dois
    // lados dessa razão dependem da cauda e do ciclo.
    measureOn: [nTail, cycle],
  });

  const p = steps[viz.step];

  const onTailChange = (v: number) => { viz.reset(); setPreset(""); setTail(v); };
  const onCycleChange = (v: number) => { viz.reset(); setPreset(""); setCycle(v); };
  const applyPreset = (pr: Preset) => { viz.reset(); setPreset(pr.key); setTail(pr.tail); setCycle(pr.cycle); };

  // --- layout do desenho -----------------------------------------------
  // Com ciclo de 1 nó não existe circunferência: o raio vira 0 e o laço é um
  // arco desenhado por cima do próprio nó, então a altura precisa sobrar.
  const Rc = cycle >= 2 ? cycleRadius(cycle) : 0;
  const entryX = 28 + nTail * GAP; // x do primeiro nó do ciclo
  const cx = entryX + Rc;
  const svgHeight = cycle >= 2 ? 2 * Rc + 92 : cycle === 1 ? 156 : 128;
  const cy = svgHeight / 2;
  const lastTailX = 28 + (nTail - 1) * GAP;
  const svgWidth = cycle >= 2 ? cx + Rc + 34 : cycle === 1 ? entryX + 40 : lastTailX + GAP + 58;

  const pos = (i: number) => {
    if (i < nTail) return { x: 28 + i * GAP, y: cy, angle: null as number | null };
    const k = i - nTail;
    const a = Math.PI + (k * 2 * Math.PI) / Math.max(1, cycle);
    return { x: cx + Rc * Math.cos(a), y: cy + Rc * Math.sin(a), angle: a };
  };

  // Reta encurtada nas duas pontas, para não entrar por baixo dos nós.
  const segment = (ax: number, ay: number, bx: number, by: number) => {
    const dx = bx - ax;
    const dy = by - ay;
    const d = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / d;
    const uy = dy / d;
    return {
      x1: ax + ux * (R_NODE + 3),
      y1: ay + uy * (R_NODE + 3),
      x2: bx - ux * (R_NODE + 10),
      y2: by - uy * (R_NODE + 10),
    };
  };

  const segments: { k: string; x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < nTail; i++) {
    if (i + 1 < nodeCount) {
      const a = pos(i);
      const b = pos(i + 1);
      segments.push({ k: `t${i}`, ...segment(a.x, a.y, b.x, b.y) });
    }
  }
  // Sem ciclo, o último nó aponta para o None escrito ao lado dele.
  if (cycle === 0) {
    const a = pos(nodeCount - 1);
    segments.push({ k: "none", x1: a.x + R_NODE + 3, y1: cy, x2: lastTailX + GAP - 22, y2: cy });
  }

  // Arcos do ciclo: seguem a própria circunferência, então nunca se sobrepõem.
  const arcs: string[] = [];
  if (cycle >= 2) {
    const da = (2 * Math.PI) / cycle;
    const off = Math.min(da * 0.34, (R_NODE + 9) / Rc);
    for (let k = 0; k < cycle; k++) {
      const a1 = Math.PI + k * da + off;
      const a2 = Math.PI + (k + 1) * da - off;
      const x1 = cx + Rc * Math.cos(a1);
      const y1 = cy + Rc * Math.sin(a1);
      const x2 = cx + Rc * Math.cos(a2);
      const y2 = cy + Rc * Math.sin(a2);
      arcs.push(`M ${x1.toFixed(1)},${y1.toFixed(1)} A ${Rc},${Rc} 0 0,1 ${x2.toFixed(1)},${y2.toFixed(1)}`);
    }
  } else if (cycle === 1) {
    const a = pos(nTail);
    arcs.push(
      `M ${(a.x - 9).toFixed(1)},${(a.y - R_NODE - 2).toFixed(1)} C ${(a.x - 52).toFixed(1)},${(a.y - R_NODE - 62).toFixed(1)} ${(a.x + 52).toFixed(1)},${(a.y - R_NODE - 62).toFixed(1)} ${(a.x + 11).toFixed(1)},${(a.y - R_NODE - 4).toFixed(1)}`
    );
  }

  const nodeColor = (i: number) => {
    const isSlow = p.slow === i;
    const isFast = p.fast === i;
    if (isSlow && isFast) return { fill: "rgba(52,211,153,0.24)", stroke: "#34d399", textColor: "#eafff5" };
    if (isSlow) return { fill: "rgba(59,130,246,0.22)", stroke: "#3b82f6", textColor: "#ffffff" };
    if (isFast) return { fill: "rgba(245,158,11,0.2)", stroke: "#f59e0b", textColor: "#ffffff" };
    return { fill: "#0f1826", stroke: "rgba(255,255,255,0.14)", textColor: "#8ba0bb" };
  };

  const nodeMark = (i: number) => {
    const isSlow = p.slow === i;
    const isFast = p.fast === i;
    if (isSlow && isFast) return { txt: "L R", color: "#6ee7b7" };
    if (isSlow) return { txt: "L", color: "#93bbfd" };
    if (isFast) return { txt: "R", color: "#fcd34d" };
    return null;
  };

  const vars = [
    { name: "lento", value: p.slow === null ? "None" : `nó ${p.slow}` },
    { name: "rapido", value: p.fast === null ? "None" : `nó ${p.fast}` },
    { name: "iteração", value: `${p.iteration}` },
    { name: "ciclo?", value: p.found ? "sim" : p.done ? "não" : "?", best: !!p.found },
  ];

  const stats = [
    { k: "n", label: "nós na lista", value: `${nodeCount}` },
    { k: "it", label: "iterações", value: `${p.iteration}` },
    { k: "l", label: "nós que o lento andou", value: `${p.slowSteps}` },
    { k: "r", label: "nós que o rápido andou", value: `${p.fastSteps}` },
  ];

  const noteClass = "viz-note" + (p.found ? " ok" : p.done ? " invalid" : "");

  const description = `Lista com ${nodeCount} nós, ${cycle > 0 ? `com ciclo de ${cycle} nós` : "sem ciclo"}. Lento em ${p.slow === null ? "None" : `nó ${p.slow}`}, rápido em ${p.fast === null ? "None" : `nó ${p.fast}`}.`;

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
            <span>Nós antes do ciclo: {nTail}{tail + cycle === 0 ? " (o mínimo)" : ""}</span>
            <input
              type="range" min={0} max={6} step={1} value={tail}
              onChange={(e) => onTailChange(parseInt(e.target.value, 10))}
              style={{ accentColor: "var(--ccc-accent)", width: "100%" }}
            />
          </label>
          <label className="viz-field grow">
            <span>Nós no ciclo: {cycle === 0 ? "nenhum, a lista termina em None" : cycle}</span>
            <input
              type="range" min={0} max={8} step={1} value={cycle}
              onChange={(e) => onCycleChange(parseInt(e.target.value, 10))}
              style={{ accentColor: "var(--ccc-accent)", width: "100%" }}
            />
          </label>
        </div>

        <div className="tp-canvas-wrap">
          <svg
            className="tp-svg"
            viewBox={`-22 -8 ${Math.round(svgWidth + 44)} ${Math.round(svgHeight + 16)}`}
            role="img"
            aria-label={description}
          >
            <defs>
              <marker id="tp-seta" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" fill="#4c5f79" />
              </marker>
            </defs>

            {segments.map((s) => (
              <line
                key={s.k} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                stroke="#3a4a60" strokeWidth={1.6} markerEnd="url(#tp-seta)"
              />
            ))}
            {arcs.map((d, i) => (
              <path key={`a${i}`} d={d} fill="none" stroke="#3a4a60" strokeWidth={1.6} markerEnd="url(#tp-seta)" />
            ))}

            {cycle === 0 ? (
              <text
                x={lastTailX + GAP} y={cy} fill="#61748c"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={13}
                textAnchor="middle" dominantBaseline="middle"
              >
                None
              </text>
            ) : null}

            {Array.from({ length: nodeCount }, (_, i) => {
              const q = pos(i);
              const c = nodeColor(i);
              const m = nodeMark(i);
              // Rótulo: para fora da roda nos nós do ciclo, acima nos nós da
              // cauda. Duas exceções, senão ele colide com uma seta: o nó de
              // entrada do ciclo (a seta da cauda chega por ali) fica com o
              // rótulo acima, e o ciclo de um nó só o joga para baixo, porque
              // o laço ocupa a parte de cima.
              const entryWithTail = i === nTail && nTail > 0;
              const radial = q.angle !== null && Rc > 0 && !entryWithTail;
              let lx = q.x;
              let ly = q.y - R_NODE - 12;
              if (radial) {
                lx = cx + (Rc + R_NODE + 14) * Math.cos(q.angle as number);
                ly = cy + (Rc + R_NODE + 14) * Math.sin(q.angle as number);
              } else if (q.angle !== null && Rc === 0) {
                ly = q.y + R_NODE + 14;
              }
              return (
                <g key={i}>
                  <circle cx={q.x} cy={q.y} r={R_NODE} fill={c.fill} stroke={c.stroke} strokeWidth={1.8} />
                  <text
                    x={q.x} y={q.y} fill={c.textColor}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={13} fontWeight={600}
                    textAnchor="middle" dominantBaseline="central"
                  >
                    {i}
                  </text>
                  {m ? (
                    <text
                      x={lx} y={ly} fill={m.color}
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={12} fontWeight={700}
                      textAnchor="middle" dominantBaseline="central"
                    >
                      {m.txt}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>

        <p className="tp-legenda">
          <span><i style={{ background: "#3b82f6" }} /> L = lento, anda 1 nó por iteração</span>
          <span><i style={{ background: "#f59e0b" }} /> R = rápido, anda 2 nós por iteração</span>
          <span><i style={{ background: "#34d399" }} /> os dois no mesmo nó: achou o ciclo</span>
        </p>

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          {/* O `.viz-code-slot` recolhe a ALTURA (grid 1fr→0fr): zerar a trilha
              da coluna só tira a largura, e a linha do grid continuaria com a
              altura do código. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">ciclo.py</div>
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
