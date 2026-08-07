"use client";

import { useMemo, useState } from "react";

import { thousands } from "@/lib/format";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// ArraysCrescimento, como o array dinâmico (List, ArrayList, vector, list do
// Python) cresce, e por que o append sai O(1) amortizado.
//
// Padrão "gerador puro de passos". A única coisa que o aluno precisa ver: a
// realocação acontece cada vez MAIS RARO conforme a capacidade cresce, e é isso
// que dilui o custo. Por isso o visualizador mostra dois números lado a lado, o
// total de cópias e o custo médio por append, e compara as quatro estratégias
// com o MESMO número de appends.
//
// `simulate` é pura: mesma entrada, mesma lista de passos, sem estado externo.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type StrategyKey = "double" | "half" | "plus1" | "reserved";

type Strategy = {
  key: StrategyKey;
  label: string;
  sub: string;
  color: string;
  next: (cap: number) => number;
};

const STRATEGIES: Strategy[] = [
  {
    key: "double",
    label: "dobrar (×2)",
    sub: "List<T> do C#, vector do C++",
    color: "#60a5fa",
    next: (c) => (c < 1 ? 4 : c * 2),
  },
  {
    key: "half",
    label: "uma vez e meia (×1,5)",
    sub: "ArrayList do Java",
    color: "#a78bfa",
    next: (c) => (c < 2 ? c + 1 : c + Math.floor(c / 2)),
  },
  {
    key: "plus1",
    label: "uma vaga por vez (+1)",
    sub: "o jeito ingênuo, feito na mão",
    color: "#f87171",
    next: (c) => c + 1,
  },
  {
    key: "reserved",
    label: "capacidade reservada",
    sub: "new List(n): você já sabe o tamanho",
    color: "#34d399",
    next: (c) => c * 2,
  },
];

const CODE = [
  "def append(lista, valor):",
  "    if lista.tamanho == lista.capacidade:   # cheio",
  "        lista.dados = copia_para(cresce(lista.capacidade))",
  "    lista.dados[lista.tamanho] = valor",
  "    lista.tamanho += 1",
];

const INITIAL_CAPS = [1, 2, 4, 8];
const MIN_APPENDS = 6;
const MAX_APPENDS = 24;

type Step = {
  size: number;
  capacity: number;
  copies: number;
  reallocs: number;
  ops: number;
  copying: boolean;
  writes: number | null;
  line: number;
  done?: boolean;
  note: string;
};

type Summary = { copies: number; reallocs: number; ops: number; finalCap: number; avg: number };

// Média com uma casa decimal, sem Intl (o HTML do build tem que bater com o do
// cliente na hidratação).
function avg1(total: number, n: number): string {
  if (n <= 0) return "0";
  const r = Math.round((total / n) * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1).replace(".", ",");
}

function initialCapOf(strategy: StrategyKey, cap0: number, n: number): number {
  return strategy === "reserved" ? n : cap0;
}

function summarize(strategy: StrategyKey, cap0: number, n: number): Summary {
  const e = STRATEGIES.find((x) => x.key === strategy) ?? STRATEGIES[0];
  let cap = initialCapOf(strategy, cap0, n);
  let size = 0;
  let copies = 0;
  let reallocs = 0;
  let guard = 0;
  while (size < n && guard++ < 500) {
    if (size === cap) {
      copies += size;
      reallocs += 1;
      cap = Math.max(cap + 1, e.next(cap));
    }
    size += 1;
  }
  const ops = n + copies;
  return { copies, reallocs, ops, finalCap: cap, avg: ops / Math.max(1, n) };
}

function simulate(strategy: StrategyKey, cap0: number, n: number): Step[] {
  const e = STRATEGIES.find((x) => x.key === strategy) ?? STRATEGIES[0];
  const out: Step[] = [];
  let cap = initialCapOf(strategy, cap0, n);
  let size = 0;
  let copies = 0;
  let reallocs = 0;
  let ops = 0;

  out.push({
    size,
    capacity: cap,
    copies,
    reallocs,
    ops,
    copying: false,
    writes: null,
    line: 0,
    note:
      strategy === "reserved"
        ? `Nasci já com capacidade ${cap}, do tamanho exato do que vou receber. Vamos ver quantas cópias isso economiza.`
        : `Começo com capacidade ${cap} e tamanho 0. Vou receber ${n} appends e crescer sozinho, ${e.label}.`,
  });

  let guard = 0;
  while (size < n && guard++ < 500) {
    if (size === cap) {
      const grown = Math.max(cap + 1, e.next(cap));
      copies += size;
      reallocs += 1;
      ops += size;
      out.push({
        size,
        capacity: grown,
        copies,
        reallocs,
        ops,
        copying: true,
        writes: null,
        line: 2,
        note: `Cheio: ${size} de ${cap}. Peço um bloco novo de ${grown} posições contíguas, copio os ${size} itens que já existiam para lá e devolvo o bloco velho. Foram ${size} cópias de uma vez, e este append virou O(n).`,
      });
      cap = grown;
    }
    size += 1;
    ops += 1;
    out.push({
      size,
      capacity: cap,
      copies,
      reallocs,
      ops,
      copying: false,
      writes: size - 1,
      line: 3,
      note: `Append ${size}: escrevo na vaga ${size - 1}, que já era minha. Uma operação, ninguém se move. Sobram ${cap - size} ${cap - size === 1 ? "vaga" : "vagas"}.`,
    });
  }

  out.push({
    size,
    capacity: cap,
    copies,
    reallocs,
    ops,
    copying: false,
    writes: null,
    line: 4,
    done: true,
    note: `${n} appends custaram ${thousands(n)} escritas + ${thousands(copies)} cópias = ${thousands(ops)} operações, média de ${avg1(ops, n)} por append. ${
      strategy === "plus1"
        ? "Crescer de 1 em 1 refaz o array quase toda vez: isso é O(n) por append, e O(n²) no total."
        : strategy === "reserved"
          ? "Zero realocações: reservar a capacidade certa é o único jeito de o append custar exatamente 1."
          : "A média não sobe quando n cresce, e é por isso que se diz que o append é O(1) amortizado."
    } Capacidade final ${cap}, com ${cap - size} ${cap - size === 1 ? "vaga ociosa" : "vagas ociosas"}.`,
  });

  return out;
}

export function ArraysCrescimento() {
  const [strategy, setStrategy] = useState<StrategyKey>("double");
  const [cap0, setCap0] = useState(4);
  const [n, setN] = useState(20);

  const steps = useMemo(() => simulate(strategy, cap0, n), [strategy, cap0, n]);
  const total = steps.length;

  const comparison = useMemo(
    () => STRATEGIES.map((e) => ({ e, r: summarize(e.key, cap0, n) })),
    [cap0, n]
  );

  const viz = useVisualizer({
    title: "Visualizador · o array dinâmico crescendo sozinho",
    total,
    // Este anda rápido de propósito: 25 passos de append no ritmo padrão viram
    // uma espera, e o que se quer ver é a REALOCAÇÃO ficando rara, não cada
    // escrita. A marcha 4 é a "1.5x".
    initialSpeed: 4,
    // O que muda a altura da peça: a estratégia e os dois parâmetros que
    // decidem quantas vagas a fita chega a mostrar (até 32, que quebram linha).
    measureOn: [strategy, cap0, n],
  });

  const idx = viz.step;
  const p = steps[idx];

  const slots = Array.from({ length: p.capacity }, (_, i) => {
    let cls = "viz-cell";
    const full = i < p.size;
    if (!full) cls += " arr-vaga";
    if (p.copying && full) cls += " sai";
    if (i === p.writes) cls += " in entra";
    else if (full && !p.copying) cls += " in";
    return { i, full, cls };
  });

  const vars = [
    { name: "tamanho", value: `${p.size}` },
    { name: "capacidade", value: `${p.capacity}` },
    { name: "cópias", value: `${p.copies}` },
    { name: "operações", value: `${p.ops}`, best: true },
  ];

  const noteClass = "viz-note" + (p.done ? " ok" : p.copying ? " invalid" : "");

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="arr-tabs" role="group" aria-label="Estratégia de crescimento">
          {STRATEGIES.map((e) => (
            <button
              key={e.key}
              className={`arr-tab${e.key === strategy ? " on" : ""}`}
              aria-pressed={e.key === strategy}
              onClick={() => {
                viz.reset();
                setStrategy(e.key);
              }}
            >
              {e.label}
            </button>
          ))}
        </div>

        <div className="viz-inputs" style={{ marginTop: 16 }}>
          <div className="viz-field grow">
            <span>Quantos appends: {n}</span>
            <input
              type="range"
              min={MIN_APPENDS}
              max={MAX_APPENDS}
              step={1}
              value={n}
              onChange={(e) => {
                viz.reset();
                setN(parseInt(e.target.value, 10));
              }}
              style={{ accentColor: "var(--ccc-accent)", width: "100%" }}
            />
          </div>
          <div className="viz-field">
            <span>Capacidade inicial</span>
            <div className="arr-tabs">
              {INITIAL_CAPS.map((c) => (
                <button
                  key={c}
                  className={`arr-tab${c === cap0 ? " on" : ""}`}
                  aria-pressed={c === cap0}
                  disabled={strategy === "reserved"}
                  onClick={() => {
                    viz.reset();
                    setCap0(c);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="viz-cells arr-compact">
          {slots.map((s) => (
            <div className="viz-cell-wrap" key={s.i}>
              <span className="viz-cell-idx">{s.i}</span>
              <div className={s.cls}>{s.full ? s.i + 1 : "·"}</div>
            </div>
          ))}
        </div>

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com a altura do
              código. O `.viz-code-slot` é o truque de grid 1fr→0fr, a única
              forma de animar altura automática em CSS puro. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">array_dinamico.py</div>
              <div className="viz-code-body">
                {CODE.map((txt, lineNo) => (
                  <div key={lineNo} className={`viz-line${lineNo === p.line ? " on" : ""}`}>
                    <span className="ln">{lineNo + 1}</span>
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
          <div className="bigo-stat">
            <span>Realocações</span>
            <strong>{thousands(p.reallocs)}</strong>
          </div>
          <div className="bigo-stat">
            <span>Cópias acumuladas</span>
            <strong>{thousands(p.copies)}</strong>
          </div>
          <div className="bigo-stat">
            <span>Custo médio por append</span>
            <strong>{avg1(p.ops, Math.max(1, p.size))}</strong>
          </div>
          <div className="bigo-stat">
            <span>Vagas ociosas</span>
            <strong>{thousands(p.capacity - p.size)}</strong>
          </div>
        </div>

        <div className="arr-cmp-rot">As quatro estratégias com os mesmos {n} appends</div>
        <div className="bigo-grid">
          {comparison.map(({ e, r }) => (
            <div
              className="bigo-card"
              key={e.key}
              style={{ borderLeftColor: e.key === strategy ? e.color : "var(--ccc-line)" }}
            >
              <div className="bigo-card-top">
                <span className="bigo-card-nome" style={{ color: e.key === strategy ? e.color : undefined }}>
                  {e.label}
                </span>
                <span className="bigo-card-val">{avg1(r.ops, n)}×</span>
              </div>
              <div className="bigo-card-ex">
                {thousands(r.copies)} cópias · {r.reallocs} {r.reallocs === 1 ? "realocação" : "realocações"} · capacidade final {r.finalCap}
              </div>
              <div className="bigo-card-ex">{e.sub}</div>
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
