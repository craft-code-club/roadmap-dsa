"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// LinkedListFloyd, o ponteiro rápido e o lento nas DUAS fases do algoritmo.
//
// A página de Two Pointers já mostra a fase 1 (existe ciclo, sim ou não). Aqui
// o assunto é o que veio depois, a parte que o Robert Floyd realmente inventou:
// quando os dois se encontram, devolver um deles para a cabeça e andar de um em
// um faz os dois pararem exatamente no PRIMEIRO nó do ciclo.
//
// De quebra, com o ciclo em zero o mesmo laço resolve outro problema: o lento
// para no meio da lista. É o mesmo código fazendo dois trabalhos, e por isso os
// dois casos moram no mesmo visualizador.
//
// A lista é descrita por dois números: quantos nós vêm antes do ciclo (a cauda)
// e quantos nós formam o ciclo. É a forma de "rho" que os livros desenham.
// ---------------------------------------------------------------------------

type Phase = 1 | 2 | 0;

type Step = {
  line: number;
  slow: number | null;
  fast: number | null;
  phase: Phase;
  round: number;
  steps2: number;
  meeting: number | null;
  result: number | null;
  note: string;
  ok?: boolean;
  done?: boolean;
};

// As linhas mapeiam 1:1 com o campo `line` de cada passo.
const CODE = [
  "def inicio_do_ciclo(cabeca):",
  "    lento = rapido = cabeca",
  "    while rapido and rapido.prox:",
  "        lento = lento.prox",
  "        rapido = rapido.prox.prox",
  "        if lento is rapido:",
  "            lento = cabeca        # fase 2",
  "            while lento is not rapido:",
  "                lento = lento.prox",
  "                rapido = rapido.prox",
  "            return lento          # início do ciclo",
  "    return None                   # não tem ciclo",
];

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
  let phase: Phase = 1;
  let round = 0;
  let steps2 = 0;
  let meeting: number | null = null;
  let result: number | null = null;

  const push = (line: number, note: string, extra: Partial<Step> = {}) => {
    out.push({ line, note, slow, fast, phase, round, steps2, meeting, result, ...extra });
  };
  const nodeName = (i: number | null) => (i === null ? "None" : `nó ${i}`);

  push(1, `Fase 1. O lento e o rápido começam os dois na cabeça, o nó 0. A lista tem ${total} ${total === 1 ? "nó" : "nós"}${cycle > 0 ? `, e ${cycle} ${cycle === 1 ? "deles forma" : "deles formam"} o ciclo` : ""}.`);

  let guard = 0;
  while (guard++ < 300) {
    if (fast === null || next(fast) === null) {
      result = slow;
      const mid = slow;
      const size = `${total} ${total === 1 ? "nó" : "nós"}`;
      const index = `o índice ${total} // 2 = ${Math.floor(total / 2)}`;
      push(11, fast === null
        ? `O rápido caiu fora da lista (None). Quem entra num ciclo nunca sai dele, então esta lista não tem ciclo: devolvo None. Agora repare no lento: ele parou no ${nodeName(mid)}, o meio da lista de ${size} (${index}). O mesmo laço que procura ciclo acha o meio de graça.`
        : `O rápido está no ${nodeName(fast)}, que aponta para None: acabou a lista, não tem ciclo. E o lento parou no ${nodeName(mid)}, exatamente o meio da lista de ${size} (${index}).`,
        { done: true });
      return out;
    }
    round++;
    const fromSlow = slow as number;
    const fromFast = fast as number;
    slow = next(slow);
    push(3, `Iteração ${round}: o lento sai do ${nodeName(fromSlow)} e anda 1, chega no ${nodeName(slow)}.`);
    const mid = next(fromFast) as number;
    fast = next(mid);
    push(4, `O rápido sai do ${nodeName(fromFast)} e anda 2, passando pelo ${nodeName(mid)}: ${fast === null ? "e cai fora da lista, no None" : `chega no ${nodeName(fast)}`}.`);
    if (fast !== null && slow === fast) {
      meeting = slow;
      push(5, `Os dois pararam no ${nodeName(slow)}: eles se encontraram, então a lista TEM ciclo. Foram ${round} ${round === 1 ? "iteração" : "iterações"}. Só que este nó quase nunca é o começo do ciclo, e é aí que entra a fase 2.`, { ok: true });
      break;
    }
    push(5, `Lento no ${nodeName(slow)}, rápido ${fast === null ? "fora da lista" : `no ${nodeName(fast)}`}: ainda não estão no mesmo nó, volto para o topo do while.`);
  }

  // --- fase 2 ---------------------------------------------------------------
  if (meeting === null) return out; // só chega aqui se a guarda estourar
  phase = 2;
  slow = 0;
  push(6, `Fase 2: devolvo o lento para a cabeça (nó 0) e deixo o rápido parado no ${nodeName(meeting)}. Daqui para frente os dois andam de 1 em 1, no mesmo ritmo.`);

  let guard2 = 0;
  while (guard2++ < 300) {
    if (slow === fast) break;
    push(7, `Lento no ${nodeName(slow)}, rápido no ${nodeName(fast)}: ainda não é o mesmo nó, continuo.`);
    slow = next(slow);
    steps2++;
    push(8, `O lento anda 1 e vai para o ${nodeName(slow)}.`);
    fast = next(fast);
    push(9, `O rápido também anda 1 e vai para o ${nodeName(fast)}.`);
  }
  result = slow;
  phase = 0;
  push(7, `Lento e rápido estão os dois no ${nodeName(slow)}: a condição do while é falsa, saio do laço.`);
  push(10, `Devolvo o ${nodeName(slow)}: é aqui que o ciclo começa. Os dois andaram ${steps2} ${steps2 === 1 ? "passo" : "passos"} na fase 2, que é exatamente o tamanho da cauda (${tail} ${tail === 1 ? "nó" : "nós"} antes do ciclo). Não é sorte, é a conta que fecha.`, { ok: true, done: true });
  return out;
}

// --- geometria da forma de rho ----------------------------------------------
const R_NODE = 17;
const GAP = 64;

type Preset = { key: string; label: string; tail: number; cycle: number };
const PRESETS: Preset[] = [
  { key: "classico", label: "Clássico: 3 antes + ciclo de 5", tail: 3, cycle: 5 },
  { key: "meio6", label: "Sem ciclo: 6 nós (acha o meio)", tail: 6, cycle: 0 },
  { key: "meio5", label: "Sem ciclo: 5 nós", tail: 5, cycle: 0 },
  { key: "puro", label: "Tudo é ciclo: 6 nós em roda", tail: 0, cycle: 6 },
  { key: "laco", label: "Laço em 1 nó: 4 + ciclo de 1", tail: 4, cycle: 1 },
];

export function LinkedListFloyd() {
  const [tail, setTail] = useState(3);
  const [cycle, setCycle] = useState(5);
  const [preset, setPreset] = useState("classico");

  // Uma lista sem nenhum nó não teria o que percorrer nem o que desenhar.
  const nTail = tail + cycle === 0 ? 1 : tail;
  const total = nTail + cycle;

  const steps = useMemo(() => generateSteps(nTail, cycle), [nTail, cycle]);
  const qtd = steps.length;

  const viz = useVisualizer({
    title: "Visualizador · rápido e lento: o meio, o ciclo e onde ele começa",
    total: qtd,
    // O tamanho do ciclo é o que mais mexe na altura: o raio da roda cresce com
    // ele e o viewBox cresce junto. A cauda alarga o desenho, o que com
    // `height: auto` ENCOLHE a altura renderizada. O número de passos entra
    // porque a nota do passo a passo muda de tamanho entre as duas fases.
    measureOn: [nTail, cycle, qtd],
  });

  const idx = viz.step;
  const p = steps[idx];

  const reset = viz.reset;
  const onTailChange = (v: number) => { reset(); setPreset(""); setTail(v); };
  const onCycleChange = (v: number) => { reset(); setPreset(""); setCycle(v); };
  const applyPreset = (pr: Preset) => { reset(); setPreset(pr.key); setTail(pr.tail); setCycle(pr.cycle); };

  // Com ciclo de 1 nó não existe circunferência: o laço vira um arco por cima
  // do próprio nó, e a altura precisa sobrar para ele.
  const Rc = cycle >= 2 ? Math.max(48, cycle * 9) : 0;
  const entryX = 28 + nTail * GAP;
  const cx = entryX + Rc;
  const svgHeight = cycle >= 2 ? 2 * Rc + 96 : cycle === 1 ? 158 : 130;
  const cy = svgHeight / 2;
  const lastTailX = 28 + (nTail - 1) * GAP;
  // Piso na largura: com poucos nós o viewBox ficaria estreito e o desenho
  // seria esticado até virar caricatura dentro do container.
  const svgWidth = Math.max(460, cycle >= 2 ? cx + Rc + 36 : cycle === 1 ? entryX + 44 : lastTailX + GAP + 58);

  const pos = (i: number) => {
    if (i < nTail) return { x: 28 + i * GAP, y: cy, ang: null as number | null };
    const k = i - nTail;
    const a = Math.PI + (k * 2 * Math.PI) / Math.max(1, cycle);
    return { x: cx + Rc * Math.cos(a), y: cy + Rc * Math.sin(a), ang: a };
  };

  // Reta encurtada nas duas pontas, para não entrar por baixo dos nós.
  const line2 = (ax: number, ay: number, bx: number, by: number) => {
    const dx = bx - ax;
    const dy = by - ay;
    const d = Math.max(1, Math.hypot(dx, dy));
    return {
      x1: ax + (dx / d) * (R_NODE + 3),
      y1: ay + (dy / d) * (R_NODE + 3),
      x2: bx - (dx / d) * (R_NODE + 10),
      y2: by - (dy / d) * (R_NODE + 10),
    };
  };

  const lines: { k: string; x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < nTail; i++) {
    if (i + 1 < total) {
      const a = pos(i);
      const b = pos(i + 1);
      lines.push({ k: `t${i}`, ...line2(a.x, a.y, b.x, b.y) });
    }
  }
  if (cycle === 0) {
    lines.push({ k: "none", x1: lastTailX + R_NODE + 3, y1: cy, x2: lastTailX + GAP - 24, y2: cy });
  }

  // Arcos do ciclo: seguem a própria circunferência, então nunca se cruzam.
  const arcs: string[] = [];
  if (cycle >= 2) {
    const da = (2 * Math.PI) / cycle;
    const off = Math.min(da * 0.34, (R_NODE + 9) / Rc);
    for (let k = 0; k < cycle; k++) {
      const a1 = Math.PI + k * da + off;
      const a2 = Math.PI + (k + 1) * da - off;
      arcs.push(
        `M ${(cx + Rc * Math.cos(a1)).toFixed(1)},${(cy + Rc * Math.sin(a1)).toFixed(1)} A ${Rc},${Rc} 0 0,1 ${(cx + Rc * Math.cos(a2)).toFixed(1)},${(cy + Rc * Math.sin(a2)).toFixed(1)}`
      );
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
    if (isSlow && isFast) return { fill: "rgba(52,211,153,0.26)", stroke: "#34d399", text: "#eafff5" };
    if (isSlow) return { fill: "rgba(59,130,246,0.22)", stroke: "#3b82f6", text: "#ffffff" };
    if (isFast) return { fill: "rgba(245,158,11,0.2)", stroke: "#f59e0b", text: "#ffffff" };
    if (p.result === i && p.done) return { fill: "rgba(167,139,250,0.18)", stroke: "#a78bfa", text: "#ede9fe" };
    return { fill: "#0f1826", stroke: "rgba(255,255,255,0.14)", text: "#8ba0bb" };
  };

  const nodeMark = (i: number) => {
    const isSlow = p.slow === i;
    const isFast = p.fast === i;
    if (isSlow && isFast) return { text: "L R", color: "#6ee7b7" };
    if (isSlow) return { text: "L", color: "#93bbfd" };
    if (isFast) return { text: "R", color: "#fcd34d" };
    if (p.meeting === i) return { text: "encontro", color: "#a78bfa" };
    return null;
  };

  const vars = [
    { name: "lento", value: p.slow === null ? "None" : `nó ${p.slow}` },
    { name: "rapido", value: p.fast === null ? "None" : `nó ${p.fast}` },
    { name: "fase", value: p.phase === 0 ? "terminou" : `${p.phase}` },
    { name: "retorno", value: p.done ? (cycle > 0 ? `nó ${p.result}` : "None") : "?", best: !!p.done && cycle > 0 },
  ];

  const resultLabel = cycle > 0 ? "início do ciclo" : "nó do meio";
  const stats = [
    { k: "n", label: "nós na lista", value: `${total}` },
    { k: "i1", label: "iterações da fase 1", value: `${p.round}` },
    { k: "i2", label: "passos da fase 2", value: `${p.steps2}` },
    { k: "res", label: resultLabel, value: p.done && p.result !== null ? `nó ${p.result}` : "…" },
  ];

  const noteClass = "viz-note" + (p.ok ? " ok" : p.done ? " invalid" : "");
  const description = `Lista com ${total} nós, ${cycle > 0 ? `com um ciclo de ${cycle} nós que começa no nó ${nTail}` : "sem ciclo"}. Lento em ${p.slow === null ? "None" : `nó ${p.slow}`}, rápido em ${p.fast === null ? "None" : `nó ${p.fast}`}. ${p.note}`;

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="ll-grupo">
          <span className="ll-grupo-rot">Casos</span>
          <div className="bigo-chips">
            {PRESETS.map((pr) => (
              <button
                type="button"
                key={pr.key}
                className={`bigo-chip${preset === pr.key ? " on" : ""}`}
                onClick={() => applyPreset(pr)}
                aria-pressed={preset === pr.key}
              >
                {pr.label}
              </button>
            ))}
          </div>
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

        <div className="ll-svg-wrap">
          <svg
            className="ll-svg"
            viewBox={`-22 -10 ${Math.round(svgWidth + 44)} ${Math.round(svgHeight + 20)}`}
            role="img"
            aria-label={description}
          >
            <defs>
              <marker id="llfl-seta" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" fill="#4c5f79" />
              </marker>
            </defs>

            {lines.map((s) => (
              <line key={s.k} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#3a4a60" strokeWidth={1.6} markerEnd="url(#llfl-seta)" />
            ))}
            {arcs.map((d, i) => (
              <path key={`a${i}`} d={d} fill="none" stroke="#3a4a60" strokeWidth={1.6} markerEnd="url(#llfl-seta)" />
            ))}

            {cycle === 0 ? (
              <text x={lastTailX + GAP} y={cy} fill="#61748c" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={13} textAnchor="middle" dominantBaseline="middle">
                None
              </text>
            ) : null}

            {Array.from({ length: total }, (_, i) => {
              const q = pos(i);
              const c = nodeColor(i);
              const m = nodeMark(i);
              // Rótulo para fora da roda nos nós do ciclo e acima nos da cauda.
              // Duas exceções, senão ele bate numa seta: o nó de entrada do
              // ciclo (a seta da cauda chega por ali) fica com o rótulo acima, e
              // o ciclo de um nó só o joga para baixo, porque o laço ocupa o
              // espaço de cima.
              const entryWithTail = i === nTail && nTail > 0;
              const radial = q.ang !== null && Rc > 0 && !entryWithTail;
              let lx = q.x;
              let ly = q.y - R_NODE - 12;
              if (radial) {
                lx = cx + (Rc + R_NODE + 15) * Math.cos(q.ang as number);
                ly = cy + (Rc + R_NODE + 15) * Math.sin(q.ang as number);
              } else if (q.ang !== null && Rc === 0) {
                ly = q.y + R_NODE + 15;
              }
              return (
                <g key={i}>
                  <circle cx={q.x} cy={q.y} r={R_NODE} fill={c.fill} stroke={c.stroke} strokeWidth={1.8} />
                  <text x={q.x} y={q.y} fill={c.text} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={13} fontWeight={600} textAnchor="middle" dominantBaseline="central">
                    {i}
                  </text>
                  {m ? (
                    <text x={lx} y={ly} fill={m.color} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={11.5} fontWeight={700} textAnchor="middle" dominantBaseline="central">
                      {m.text}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>

        <p className="ll-legenda">
          <span><i style={{ background: "#3b82f6" }} /> L = lento, 1 nó por vez</span>
          <span><i style={{ background: "#f59e0b" }} /> R = rápido, 2 nós por vez na fase 1</span>
          <span><i style={{ background: "#34d399" }} /> os dois no mesmo nó</span>
          <span><i style={{ background: "#a78bfa" }} /> nó do encontro</span>
        </p>

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com a altura do
              código. O `.viz-code-slot` é o truque de grid 1fr→0fr. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">floyd.py</div>
              <div className="viz-code-body">
                {CODE.map((text, i) => (
                  <div key={i} className={`viz-line${i === p.line ? " on" : ""}`}>
                    <span className="ln">{i + 1}</span>
                    {text}
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
