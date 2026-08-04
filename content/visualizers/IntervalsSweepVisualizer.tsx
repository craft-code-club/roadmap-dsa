"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

import {
  LinhaDoTempo,
  axisFor,
  fmtIv,
  parseIntervals,
  writeIntervals,
} from "./IntervalsLinhaDoTempo";
import type { Interval, TimelineRow } from "./IntervalsLinhaDoTempo";

// ---------------------------------------------------------------------------
// IntervalsSweepVisualizer, a contagem por eventos (sweep line).
//
// Responde a pergunta que o merge NÃO responde: "quantos intervalos estão
// acontecendo ao mesmo tempo no pior instante do dia?". Cada intervalo vira
// dois eventos (+1 no início, -1 no fim), a lista de eventos é ordenada e um
// contador sobe e desce. O máximo que o contador atinge é a resposta.
//
// O botão de regra de empate é o coração didático: com a saída antes da
// entrada, uma sala que vagou às 12 recebe quem chega às 12; com a entrada
// antes, não. A mesma entrada dá respostas diferentes, e é o enunciado que
// decide qual das duas está certa.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Contrato
// em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type SweepEvent = { t: number; delta: number; iv: number; kind: "entra" | "sai" };

type Vars = { name: string; value: string; best?: boolean }[];

type Step = {
  line: number;
  eventIndex: number;
  current: number;
  peak: number;
  active: number[];
  closed: number[];
  profile: number[];
  time: number | null;
  note: string;
  vars: Vars;
  ok?: boolean;
};

function codeFor(exitFirst: boolean): string[] {
  return [
    "def salas_necessarias(reunioes):",
    "    eventos = []",
    "    for inicio, fim in reunioes:",
    "        eventos.append((inicio, +1))",
    "        eventos.append((fim, -1))",
    exitFirst ? "    eventos.sort()" : "    eventos.sort(key=lambda e: (e[0], -e[1]))",
    "    atual = maximo = 0",
    "    for tempo, delta in eventos:",
    "        atual += delta",
    "        maximo = max(maximo, atual)",
    "    return maximo",
  ];
}

function eventsFor(ivs: Interval[], exitFirst: boolean): SweepEvent[] {
  const evs: SweepEvent[] = [];
  ivs.forEach((iv, i) => {
    evs.push({ t: iv[0], delta: 1, iv: i, kind: "entra" });
    evs.push({ t: iv[1], delta: -1, iv: i, kind: "sai" });
  });
  // No empate de tempo, `delta` crescente coloca o -1 (saída) na frente, e
  // `-delta` coloca o +1 (entrada). O índice desempata o resto para o gerador
  // continuar puro.
  return evs.sort((a, b) => {
    if (a.t !== b.t) return a.t - b.t;
    const da = exitFirst ? a.delta : -a.delta;
    const db = exitFirst ? b.delta : -b.delta;
    if (da !== db) return da - db;
    return a.iv - b.iv;
  });
}

/** Máximo de intervalos simultâneos, sem passo a passo. Serve para comparar as duas regras de empate. */
function maxConcurrent(ivs: Interval[], exitFirst: boolean): number {
  let current = 0;
  let peak = 0;
  for (const e of eventsFor(ivs, exitFirst)) {
    current += e.delta;
    if (current > peak) peak = current;
  }
  return peak;
}

/** Merge Intervals puro, só para desenhar a linha de contraste "o merge diria isto". */
function merge(ivs: Interval[]): Interval[] {
  if (!ivs.length) return [];
  const order = [...ivs].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out: Interval[] = [[order[0][0], order[0][1]]];
  for (let i = 1; i < order.length; i++) {
    const last = out[out.length - 1];
    if (order[i][0] <= last[1]) last[1] = Math.max(last[1], order[i][1]);
    else out.push([order[i][0], order[i][1]]);
  }
  return out;
}

function pl(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function generateSteps(ivs: Interval[], exitFirst: boolean): Step[] {
  const steps: Step[] = [];
  const n = ivs.length;

  if (n === 0) {
    steps.push({
      line: 10, eventIndex: -1, current: 0, peak: 0, active: [], closed: [], profile: [], time: null,
      note: "Nenhuma reunião marcada: zero eventos, zero salas. O contador nem chega a subir.",
      vars: [{ name: "eventos", value: "0" }, { name: "maximo", value: "0", best: true }],
    });
    return steps;
  }

  const evs = eventsFor(ivs, exitFirst);
  const rule = exitFirst
    ? "no empate, a saída vem antes da entrada: quem desocupa às 12 entrega a sala para quem chega às 12"
    : "no empate, a entrada vem antes da saída: quem chega às 12 precisa de outra sala, porque a de quem sai às 12 ainda conta como ocupada";

  steps.push({
    line: 2, eventIndex: -1, current: 0, peak: 0, active: [], closed: [], profile: [], time: null,
    note: `${n} ${pl(n, "reunião vira", "reuniões viram")} ${evs.length} eventos: um +1 no início de cada uma e um -1 no fim. A partir daqui eu esqueço quem é quem, só me importa o vaivém do contador.`,
    vars: [{ name: "eventos", value: `${evs.length}` }, { name: "atual", value: "0" }, { name: "maximo", value: "0", best: true }],
  });

  steps.push({
    line: 5, eventIndex: -1, current: 0, peak: 0, active: [], closed: [], profile: [], time: null,
    note: `Ordenei os ${evs.length} eventos por tempo, e ${rule}.`,
    vars: [{ name: "eventos", value: `${evs.length}` }, { name: "atual", value: "0" }, { name: "maximo", value: "0", best: true }],
  });

  let current = 0;
  let peak = 0;
  const active = new Set<number>();
  const closed = new Set<number>();
  const profile: number[] = [];

  for (let k = 0; k < evs.length; k++) {
    const e = evs[k];
    current += e.delta;
    if (e.kind === "entra") active.add(e.iv);
    else { active.delete(e.iv); closed.add(e.iv); }
    profile.push(current);
    const rose = current > peak;
    if (rose) peak = current;

    steps.push({
      line: rose ? 9 : 8,
      eventIndex: k,
      current,
      peak,
      active: [...active],
      closed: [...closed],
      profile: [...profile],
      time: e.t,
      note: e.kind === "entra"
        ? `t = ${e.t}: começa ${fmtIv(ivs[e.iv])}. atual = ${current - 1} + 1 = ${current}.${rose ? ` Recorde novo: preciso de ${current} ${pl(current, "sala", "salas")} neste instante.` : ""}`
        : `t = ${e.t}: termina ${fmtIv(ivs[e.iv])} e a sala vaga. atual = ${current + 1} - 1 = ${current}. O máximo já visto continua ${peak}.`,
      vars: [
        { name: "tempo", value: `${e.t}` },
        { name: "delta", value: e.delta > 0 ? "+1" : "-1" },
        { name: "atual", value: `${current}` },
        { name: "maximo", value: `${peak}`, best: true },
      ],
    });
  }

  steps.push({
    line: 10, eventIndex: evs.length - 1, current, peak, active: [], closed: ivs.map((_, i) => i),
    profile: [...profile], time: null, ok: true,
    note: `Fim: o contador voltou a ${current} e o pico foi ${peak}. Preciso de ${peak} ${pl(peak, "sala", "salas")} para que nenhuma reunião fique esperando.`,
    vars: [
      { name: "tempo", value: "-" },
      { name: "delta", value: "-" },
      { name: "atual", value: `${current}` },
      { name: "maximo", value: `${peak}`, best: true },
    ],
  });
  return steps;
}

type Preset = { name: string; ivs: string };

const PRESETS: Preset[] = [
  { name: "Reuniões do dia", ivs: "[9,12], [10,13], [11,14], [12,15], [16,18], [17,19]" },
  { name: "Uma sala basta", ivs: "[9,10], [10,11], [11,12], [12,13]" },
  { name: "Tudo aninhado", ivs: "[9,17], [10,16], [11,15]" },
  { name: "Dois picos", ivs: "[1,4], [2,9], [3,5], [6,8], [7,10]" },
  { name: "Nenhuma reunião", ivs: "" },
];

export function IntervalsSweepVisualizer() {
  const [input, setInput] = useState(PRESETS[0].ivs);
  const [exitFirst, setExitFirst] = useState(true);

  const ivs = useMemo(() => parseIntervals(input, 8), [input]);
  const evs = useMemo(() => eventsFor(ivs, exitFirst), [ivs, exitFirst]);
  const steps = useMemo(() => generateSteps(ivs, exitFirst), [ivs, exitFirst]);
  const merged = useMemo(() => merge(ivs), [ivs]);
  const otherRule = useMemo(() => maxConcurrent(ivs, !exitFirst), [ivs, exitFirst]);
  // Altura fixa do perfil: usa o pico da execução inteira para as barras não
  // reescalarem a cada passo.
  const finalPeak = useMemo(() => maxConcurrent(ivs, exitFirst), [ivs, exitFirst]);

  const viz = useVisualizer({
    title: "Visualizador · quantos intervalos ao mesmo tempo",
    // O que MAIS muda a altura: quantas reuniões a entrada tem (cada uma é uma
    // faixa na linha do tempo e dois selos de evento) e a regra de empate, que
    // troca a linha de ordenação do código. `steps.length` atravessa 1 quando a
    // lista fica vazia, e aí o rodapé inteiro some — o que também é altura.
    total: steps.length,
    measureOn: [ivs.length, steps.length, exitFirst],
  });

  const p = steps[viz.step];
  const code = useMemo(() => codeFor(exitFirst), [exitFirst]);

  const axis = useMemo(() => {
    const values: number[] = [];
    for (const iv of ivs) { values.push(iv[0], iv[1]); }
    if (!values.length) values.push(0, 10);
    return axisFor(values);
  }, [ivs]);

  // Math.random só no handler, nunca no render, para a hidratação bater.
  const randomize = () => {
    const count = 4 + Math.floor(Math.random() * 3);
    const drawn: Interval[] = [];
    for (let i = 0; i < count; i++) {
      const start = 8 + Math.floor(Math.random() * 8);
      drawn.push([start, start + 1 + Math.floor(Math.random() * 4)]);
    }
    viz.reset();
    setInput(writeIntervals(drawn));
  };

  const rows: TimelineRow[] = [
    ...ivs.map((iv, i) => {
      const state = p.active.includes(i) ? "atual" : p.closed.includes(i) ? "usado" : "espera";
      return {
        id: `iv${i}`,
        label: `[${iv[0]}, ${iv[1]}]`,
        bars: [{ id: `b${i}`, start: iv[0], end: iv[1], state, label: `${iv[0]},${iv[1]}` }],
      };
    }),
    {
      id: "merge",
      label: "o merge diria",
      bars: merged.map((s, k) => ({ id: `m${k}`, start: s[0], end: s[1], state: "pronto", label: `${s[0]},${s[1]}` })),
    },
  ];

  const maxBar = Math.max(1, finalPeak);
  const noteClass = "viz-note" + (p.ok ? " ok" : "");

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} color="#a78bfa" />

      <div {...viz.bodyProps}>
        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Reuniões</span>
            <input
              className="viz-input"
              value={input}
              onChange={(e) => { viz.reset(); setInput(e.target.value); }}
              placeholder="[9,12], [10,13], [11,14]"
            />
          </label>
          <button className="viz-btn" onClick={randomize}>Sortear</button>
          <button
            className="viz-btn"
            aria-pressed={exitFirst}
            onClick={() => { viz.reset(); setExitFirst((v) => !v); }}
          >
            Empate: {exitFirst ? "saída primeiro" : "entrada primeiro"}
          </button>
        </div>

        <div className="iv-presets">
          <span className="iv-presets-lbl">Cenários</span>
          {PRESETS.map((pr) => (
            <button
              key={pr.name}
              className={`iv-preset${input === pr.ivs ? " on" : ""}`}
              onClick={() => { viz.reset(); setInput(pr.ivs); }}
            >
              {pr.name}
            </button>
          ))}
        </div>

        <LinhaDoTempo
          rows={rows}
          min={axis.min}
          max={axis.max}
          ticks={axis.ticks}
          guide={p.time}
        />

        <div className="iv-eventos">
          {evs.map((e, k) => (
            <span
              key={`${e.t}-${e.kind}-${e.iv}`}
              className={`iv-ev ${e.kind}${k === p.eventIndex ? " on" : ""}${k < p.eventIndex ? " feito" : ""}`}
            >
              {e.t} {e.delta > 0 ? "+1" : "-1"}
            </span>
          ))}
        </div>

        <div className="iv-perfil" aria-hidden="true">
          {evs.map((e, k) => {
            const v = k < p.profile.length ? p.profile[k] : null;
            const h = v == null ? 0 : (v / maxBar) * 100;
            const cls = v != null && v === finalPeak && finalPeak > 0 ? " max" : k === p.eventIndex ? " on" : "";
            return (
              <div className={`iv-perfil-col${cls}`} key={`c${e.t}-${e.kind}-${e.iv}`}>
                <span className="iv-perfil-n">{v == null ? "" : v}</span>
                <span className="iv-perfil-bar" style={{ height: `${h}%` }} />
              </div>
            );
          })}
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>reuniões</span>
            <strong>{ivs.length}</strong>
          </div>
          <div className="bigo-stat">
            <span>em uso agora</span>
            <strong style={{ color: "#a78bfa" }}>{p.current}</strong>
          </div>
          <div className="bigo-stat">
            <span>máximo até aqui</span>
            <strong style={{ color: "#fbbf24" }}>{p.peak}</strong>
          </div>
          <div className="bigo-stat">
            <span>com a outra regra de empate</span>
            <strong>{otherRule}</strong>
          </div>
        </div>

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          {/* A moldura extra é pela ALTURA: zerar a trilha da coluna só tira a
              largura, e a linha do grid continua com a altura inteira do bloco.
              O código fica no DOM mesmo recolhido — é isso que permite medir o
              pior caso —, e `inert` o tira do teclado e dos leitores de tela. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">
                salas.py · {exitFirst ? "a saída libera a sala" : "a saída não libera a sala"}
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
      <VizFooter viz={viz} color="#a78bfa" />
    </figure>
  );

  return viz.inPanel(frame);
}
