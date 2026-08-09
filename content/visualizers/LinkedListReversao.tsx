"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// LinkedListReversao, a inversão de uma lista encadeada com três ponteiros.
//
// É o algoritmo em que todo mundo trava na primeira vez, e o motivo é sempre o
// mesmo: são quatro atribuições que só funcionam nesta ordem. Por isso cada
// passo aqui é UMA linha do laço, e o desenho mostra a única coisa que muda no
// mundo: a seta do nó atual, que deixa de apontar para a frente e passa a
// apontar para trás. Os nós não saem do lugar, porque na memória eles nunca
// saem do lugar.
//
// Os valores são letras (a, b, c, d) de propósito: é o mesmo exemplo que a
// galera desenhou no encontro.
// ---------------------------------------------------------------------------

type Step = {
  line: number;
  prev: number | null; // índice do nó, null = None
  curr: number | null;
  next: number | null;
  hasNext: boolean; // a variável `proximo` já foi atribuída nesta volta
  flipped: number; // quantas setas já viraram (nós 0..invertidas-1)
  round: number;
  note: string;
  ok?: boolean;
  done?: boolean;
};

// As linhas mapeiam 1:1 com o campo `line` de cada passo.
const CODE = [
  "def reverter(cabeca):",
  "    anterior = None",
  "    atual = cabeca",
  "    while atual is not None:",
  "        proximo = atual.prox   # guardo o resto",
  "        atual.prox = anterior  # viro a seta",
  "        anterior = atual       # anterior anda",
  "        atual = proximo        # atual anda",
  "    return anterior",
];

function generateSteps(nodes: string[]): Step[] {
  const n = nodes.length;
  const out: Step[] = [];
  let prev: number | null = null;
  let curr: number | null = n > 0 ? 0 : null;
  let next: number | null = null;
  let hasNext = false;
  let flipped = 0;
  let round = 0;

  const push = (line: number, note: string, extra: Partial<Step> = {}) => {
    out.push({ line, note, prev, curr, next, hasNext, flipped, round, ...extra });
  };
  const nodeName = (i: number | null) => (i === null ? "None" : `nó ${nodes[i]}`);

  prev = null;
  curr = null;
  push(1, `anterior começa em None. Ele é o segredo do algoritmo: numa lista simplesmente encadeada eu não consigo olhar para trás, então preciso carregar o "trás" comigo.`);
  curr = n > 0 ? 0 : null;
  push(2, n > 0
    ? `atual começa na cabeça, ${nodeName(0)}. É ele que vai caminhar até o fim.`
    : `atual começa na cabeça, que é None: a lista está vazia.`);

  let guard = 0;
  while (curr !== null && guard++ < 60) {
    round++;
    const a = curr;
    next = a + 1 < n ? a + 1 : null;
    hasNext = true;
    push(4, next === null
      ? `Volta ${round}. Guardo o resto da lista em proximo, que aqui já é None: ${nodeName(a)} é o último nó.`
      : `Volta ${round}. Primeiro guardo o resto da lista em proximo (${nodeName(next)}). A próxima linha vai apagar o único endereço que leva até ele, e sem essa cópia eu perderia ${nodeName(next)} e todo mundo depois dele.`);
    flipped = a + 1;
    push(5, `Viro a seta: ${nodeName(a)} agora aponta para ${nodeName(prev)}. A lista está partida em duas neste instante, e é por isso que a ordem das quatro linhas não é opinião.`);
    prev = a;
    push(6, `anterior passa a ser ${nodeName(a)}: quando eu andar, ele vira o "trás" do próximo nó.`);
    curr = next;
    hasNext = false;
    push(7, `atual passa a ser ${nodeName(curr)}.${curr === null ? " Chegamos ao fim da lista original." : ""}`);
  }

  push(3, n === 0
    ? `atual já nasceu None, então o while não roda nenhuma vez: numa lista vazia não existe seta para virar.`
    : `atual é None: não sobrou nó para virar. Foram ${round} ${round === 1 ? "volta" : "voltas"}, uma por nó, e cada volta escreveu exatamente 3 variáveis.`);
  push(8, n > 0
    ? `Devolvo anterior, que parou em ${nodeName(n - 1)}: o antigo último virou a nova cabeça. ${n} ${n === 1 ? "seta" : "setas"} viradas, nenhuma cópia de nó e nenhuma lista nova.`
    : `Devolvo anterior, que é None: reverter uma lista vazia devolve uma lista vazia.`,
    { ok: true, done: true });
  return out;
}

// --- geometria --------------------------------------------------------------
const BOX_W = 62;
const BOX_H = 42;
const STEP = 92;
const PAD_X = 14;
const CY = 104; // linha dos nós
const X0 = -62; // sobra à esquerda: cabe o None do começo
const VB_TOP = 18;
const VB_HEIGHT = 140;

type Preset = { key: string; label: string; nodes: string[] };
const PRESETS: Preset[] = [
  { key: "encontro", label: "Quatro nós: a b c d", nodes: ["a", "b", "c", "d"] },
  { key: "cinco", label: "Cinco nós: 1 a 5", nodes: ["1", "2", "3", "4", "5"] },
  { key: "dois", label: "Só dois nós", nodes: ["a", "b"] },
  { key: "um", label: "Um nó só", nodes: ["a"] },
  { key: "vazia", label: "Lista vazia", nodes: [] },
];

export function LinkedListReversao() {
  const [nodes, setNodes] = useState<string[]>(PRESETS[0].nodes);
  const [input, setInput] = useState(PRESETS[0].nodes.join(", "));
  const [preset, setPreset] = useState("encontro");

  const steps = useMemo(() => generateSteps(nodes), [nodes]);
  const total = steps.length;

  const viz = useVisualizer({
    title: "Visualizador · inverter a lista com três ponteiros",
    total,
    // O tamanho da lista alarga o viewBox, e com `height: auto` isso muda a
    // ALTURA do desenho junto; o número de passos entra porque a nota do passo
    // a passo é mais longa em alguns casos de borda.
    measureOn: [nodes.length, total],
  });

  const idx = viz.step;
  const p = steps[idx];

  const reset = viz.reset;
  const onInputChange = (v: string) => {
    const arr = v.split(",").map((x) => x.trim()).filter((x) => x.length > 0).map((x) => x.slice(0, 3)).slice(0, 7);
    reset(); setPreset("");
    setInput(v); setNodes(arr);
  };
  const applyPreset = (pr: Preset) => {
    reset(); setPreset(pr.key);
    setNodes(pr.nodes); setInput(pr.nodes.join(", "));
  };

  const n = nodes.length;
  const xNode = (i: number) => PAD_X + i * STEP;
  // Piso na largura: com um nó só o viewBox ficaria estreito e o desenho seria
  // esticado até virar caricatura dentro do container.
  const vbWidth = Math.max(520, PAD_X + Math.max(1, n) * STEP + 52 - X0);

  const vars = [
    { name: "anterior", value: p.prev === null ? "None" : `nó ${nodes[p.prev]}` },
    { name: "atual", value: p.curr === null ? "None" : `nó ${nodes[p.curr]}` },
    { name: "proximo", value: !p.hasNext ? "-" : p.next === null ? "None" : `nó ${nodes[p.next]}` },
    { name: "setas viradas", value: `${p.flipped} de ${n}`, best: p.flipped === n && n > 0 },
  ];

  const stats = [
    { k: "n", label: "nós na lista", value: `${n}` },
    { k: "it", label: "voltas do while", value: `${p.round}` },
    { k: "op", label: "ponteiros escritos", value: `${p.flipped}` },
    { k: "mem", label: "memória extra", value: "O(1)" },
  ];

  const noteClass = "viz-note" + (p.ok ? " ok" : p.done ? " invalid" : "");
  const description = `Lista com ${n} nós: ${nodes.join(", ") || "vazia"}. ${p.flipped} setas já apontam para trás. ${p.note}`;

  const nodeColor = (i: number) => {
    if (p.curr === i) return { fill: "rgba(59,130,246,0.2)", stroke: "#3b82f6", txt: "#ffffff" };
    if (p.prev === i) return { fill: "rgba(245,158,11,0.16)", stroke: "#f59e0b", txt: "#ffffff" };
    if (p.hasNext && p.next === i) return { fill: "rgba(167,139,250,0.16)", stroke: "#a78bfa", txt: "#ffffff" };
    return { fill: "#0f1826", stroke: "rgba(255,255,255,0.14)", txt: "#b9c9dd" };
  };
  const nodeMark = (i: number): string | null => {
    const marks: string[] = [];
    if (p.prev === i) marks.push("anterior");
    if (p.curr === i) marks.push("atual");
    if (p.hasNext && p.next === i) marks.push("proximo");
    return marks.length ? marks.join(" / ") : null;
  };

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
            <span>Valores dos nós (até 7)</span>
            <input className="viz-input" value={input} onChange={(e) => onInputChange(e.target.value)} />
          </label>
        </div>

        <div className="ll-svg-wrap">
          <svg className="ll-svg" viewBox={`${X0} ${VB_TOP} ${vbWidth} ${VB_HEIGHT}`} role="img" aria-label={description}>
            <defs>
              <marker id="llrev-seta" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" fill="#4c5f79" />
              </marker>
              <marker id="llrev-seta-ok" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" fill="#34d399" />
              </marker>
            </defs>

            {/* None da esquerda: é para lá que a primeira seta virada aponta.
                Com a lista vazia ele sumiria de sentido, então some. */}
            {n > 0 ? (
              <text x={-52} y={CY} fill="#61748c" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={12} textAnchor="start" dominantBaseline="central">
                None
              </text>
            ) : null}
            <text x={xNode(n) - 2} y={CY} fill="#61748c" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={12} textAnchor="start" dominantBaseline="central">
              None
            </text>

            {/* setas: as já viradas viram arco por cima, apontando para trás */}
            {Array.from({ length: n }, (_, i) => {
              const isFlipped = i < p.flipped;
              if (!isFlipped) {
                return (
                  <line
                    key={`f${i}`}
                    x1={xNode(i) + 52} y1={CY} x2={xNode(i + 1) - 7} y2={CY}
                    stroke="#3a4a60" strokeWidth={1.6} markerEnd="url(#llrev-seta)"
                  />
                );
              }
              const endX = i === 0 ? -18 : xNode(i - 1) + BOX_W / 2 + 4;
              const startX = xNode(i) + 52;
              return (
                <path
                  key={`v${i}`}
                  d={`M ${startX},${CY - 16} Q ${(startX + endX) / 2},${CY - 70} ${endX},${CY - 15}`}
                  fill="none" stroke="#34d399" strokeWidth={1.8} markerEnd="url(#llrev-seta-ok)"
                />
              );
            })}

            {/* os nós */}
            {Array.from({ length: n }, (_, i) => {
              const x = xNode(i);
              const c = nodeColor(i);
              const mark = nodeMark(i);
              return (
                <g key={`n${i}`}>
                  <rect x={x} y={CY - BOX_H / 2} width={BOX_W} height={BOX_H} rx={9} fill={c.fill} stroke={c.stroke} strokeWidth={1.8} />
                  <line x1={x + 42} y1={CY - BOX_H / 2} x2={x + 42} y2={CY + BOX_H / 2} stroke="rgba(255,255,255,0.12)" strokeWidth={1.2} />
                  <text x={x + 21} y={CY} fill={c.txt} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={15} fontWeight={600} textAnchor="middle" dominantBaseline="central">
                    {nodes[i]}
                  </text>
                  <circle cx={x + 52} cy={CY} r={3.2} fill={i < p.flipped ? "#34d399" : "#4c5f79"} />
                  {mark ? (
                    <text x={x + 31} y={CY + BOX_H / 2 + 14} fill="#93bbfd" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={10.5} fontWeight={700} textAnchor="middle" dominantBaseline="central">
                      {mark}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>

        <p className="ll-legenda">
          <span><i style={{ background: "#3a4a60" }} /> seta ainda apontando para a frente</span>
          <span><i style={{ background: "#34d399" }} /> seta já virada para trás</span>
          <span><i style={{ background: "#3b82f6" }} /> atual</span>
          <span><i style={{ background: "#f59e0b" }} /> anterior</span>
          <span><i style={{ background: "#a78bfa" }} /> proximo</span>
        </p>

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com a altura do
              código. O `.viz-code-slot` é o truque de grid 1fr→0fr. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">reverter.py</div>
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
