"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// MstVisualizer, Kruskal e Prim chegando no mesmo total por caminhos opostos.
//
// Os dois são gulosos e os dois estão certos, o que soa contraditório até você
// ver os dois rodando no mesmo grafo. Por isso o visualizador é um só, com um
// botão:
//
//   Kruskal ordena as ARESTAS e vai colando florestas soltas. O painel mostra
//   as componentes por cor, e a aresta rejeitada por formar ciclo fica riscada:
//   é o union-find trabalhando à vista.
//
//   Prim faz a árvore CRESCER de um vértice só, sempre pela aresta mais barata
//   que sai dela. Nunca há floresta, sempre há uma árvore só.
//
// O contador de peso total é o mesmo nos dois no fim, e é esse número que
// fecha o argumento de que a MST é única em peso mesmo quando as escolhas
// diferem.
//
// Identificadores em inglês, tela em português (contrato §0). O Python que
// aparece no bloco de código e as notas do passo a passo são CONTEÚDO: eles
// continuam falando de `pai`, `acha`, `arestas`, `peso` e `fila`, que é o
// vocabulário que as notas explicam em português logo ao lado.
// ---------------------------------------------------------------------------

const LABELS = ["A", "B", "C", "D", "E", "F"];
const POS = [
  { x: 45, y: 45 },
  { x: 165, y: 30 },
  { x: 285, y: 45 },
  { x: 45, y: 175 },
  { x: 165, y: 200 },
  { x: 285, y: 175 },
];

type Edge = { a: number; b: number; weight: number };
const E = (a: number, b: number, weight: number): Edge => ({ a, b, weight });

type Preset = { key: string; label: string; edges: Edge[]; hint: string };

const PRESETS: Preset[] = [
  {
    key: "classic",
    label: "Rede de cabos",
    edges: [E(0, 1, 4), E(0, 3, 1), E(1, 2, 3), E(1, 4, 7), E(3, 4, 2), E(2, 5, 5), E(4, 5, 6), E(1, 3, 8), E(2, 4, 9)],
    hint: "Cada aresta é o custo de puxar um cabo. A MST é o jeito mais barato de deixar todo mundo conectado.",
  },
  {
    key: "ties",
    label: "Com pesos repetidos",
    edges: [E(0, 1, 2), E(0, 3, 2), E(1, 2, 2), E(3, 4, 2), E(2, 5, 3), E(4, 5, 3), E(1, 4, 5)],
    hint: "Vários pesos iguais: Kruskal e Prim podem escolher arestas DIFERENTES e ainda assim chegar ao mesmo peso total.",
  },
  {
    key: "bridge",
    label: "Uma ponte cara e obrigatória",
    edges: [E(0, 1, 1), E(1, 3, 2), E(0, 3, 2), E(2, 5, 1), E(2, 4, 2), E(4, 5, 2), E(1, 2, 20)],
    hint: "Dois grupos baratos ligados por uma única aresta de peso 20. Ela é horrível e entra assim mesmo: sem ela o grafo se parte.",
  },
];

type Mode = "kruskal" | "prim";

// `kruskal` e `prim` são valor de union E texto de tela: o cabeçalho do bloco é
// `{mode}.py`, então eles saem renderizados como `kruskal.py` e `prim.py`.
const CODE: Record<Mode, string[]> = {
  kruskal: [
    "def kruskal(n, arestas):",
    "    arestas.sort(key=lambda e: e.peso)   # o guloso mora aqui",
    "    pai = list(range(n))",
    "    def acha(x):",
    "        while pai[x] != x:",
    "            pai[x] = pai[pai[x]]",
    "            x = pai[x]",
    "        return x",
    "",
    "    total, mst = 0, []",
    "    for e in arestas:",
    "        ra, rb = acha(e.a), acha(e.b)",
    "        if ra == rb: continue            # mesmo grupo: faria ciclo",
    "        pai[ra] = rb                     # une os dois grupos",
    "        total += e.peso; mst.append(e)",
    "    return total, mst",
  ],
  prim: [
    "import heapq",
    "",
    "def prim(inicio, adj):",
    "    dentro = {inicio}",
    "    fila = [(p, inicio, v) for v, p in adj[inicio]]",
    "    heapq.heapify(fila)",
    "    total, mst = 0, []",
    "    while fila:",
    "        peso, u, v = heapq.heappop(fila)  # mais barata que SAI da árvore",
    "        if v in dentro: continue          # já entrou por outro lado",
    "        dentro.add(v)",
    "        total += peso; mst.append((u, v))",
    "        for w, p in adj[v]:",
    "            if w not in dentro:",
    "                heapq.heappush(fila, (p, v, w))",
    "    return total, mst",
  ],
};

type Step = {
  edge: Edge | null;
  chosen: number[];      // índices em sortedEdges / edges
  rejected: number[];
  component: number[];   // cor de cada vértice
  inside: number[];
  total: number;
  line: number;
  note: string;
  ok?: boolean;
};

function buildSteps(edgesIn: Edge[], mode: Mode): Step[] {
  const V = LABELS.length;
  const out: Step[] = [];

  if (mode === "kruskal") {
    const edges = [...edgesIn].sort((x, y) => x.weight - y.weight);
    const parent = Array.from({ length: V }, (_, i) => i);
    const find = (x: number): number => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    const chosen: number[] = [];
    const rejected: number[] = [];
    let total = 0;
    const comp = () => LABELS.map((_, i) => find(i));
    const snap = (edge: Edge | null, line: number, note: string, extra: Partial<Step> = {}): Step =>
      ({ edge, chosen: [...chosen], rejected: [...rejected], component: comp(), inside: [], total, line, note, ...extra });

    out.push(snap(null, 1, `Kruskal começa ordenando TODAS as arestas por peso: ${edges.map((e) => e.weight).join(", ")}. A partir daqui é só percorrer essa lista de cima para baixo, e a única decisão é aceitar ou recusar.`));

    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const ra = find(e.a), rb = find(e.b);
      if (ra === rb) {
        rejected.push(i);
        out.push(snap(e, 12, `${LABELS[e.a]} e ${LABELS[e.b]} já estão no mesmo grupo (mesma cor). Aceitar a aresta de peso ${e.weight} fecharia um ciclo, e ciclo não acrescenta conexão nenhuma. Recuso.`));
      } else {
        parent[ra] = rb;
        chosen.push(i);
        total += e.weight;
        out.push(snap(e, 13, `${LABELS[e.a]} e ${LABELS[e.b]} estão em grupos diferentes: a aresta de peso ${e.weight} conecta duas partes que estavam soltas. Aceito, e os dois grupos viram um só. Total: ${total}.`));
      }
      if (chosen.length === V - 1) break;
    }
    out.push(snap(null, 15, `MST completa com ${chosen.length} arestas (sempre V-1 = ${V - 1}) e peso total ${total}. Repare que a árvore foi crescendo em pedaços soltos, que só no fim viraram uma coisa só.`, { ok: true }));
    return out;
  }

  // Prim
  const adj: { v: number; weight: number; idx: number }[][] = LABELS.map(() => []);
  edgesIn.forEach((e, i) => { adj[e.a].push({ v: e.b, weight: e.weight, idx: i }); adj[e.b].push({ v: e.a, weight: e.weight, idx: i }); });
  const inside = new Set<number>([0]);
  const chosen: number[] = [];
  const rejected: number[] = [];
  let total = 0;
  const queue: { weight: number; u: number; v: number; idx: number }[] = adj[0].map((x) => ({ weight: x.weight, u: 0, v: x.v, idx: x.idx }));
  const snap = (edge: Edge | null, line: number, note: string, extra: Partial<Step> = {}): Step =>
    ({ edge, chosen: [...chosen], rejected: [...rejected], component: LABELS.map((_, i) => (inside.has(i) ? 0 : i + 1)), inside: [...inside], total, line, note, ...extra });

  out.push(snap(null, 3, `Prim começa com um vértice só, ${LABELS[0]}, e vai fazer a árvore CRESCER. A fila guarda as arestas que saem da árvore para fora dela: ${queue.map((f) => `${LABELS[f.u]}${LABELS[f.v]}:${f.weight}`).join(", ")}.`));

  let guard = 0;
  while (queue.length && inside.size < V && guard++ < 300) {
    queue.sort((x, y) => x.weight - y.weight);
    const f = queue.shift() as { weight: number; u: number; v: number; idx: number };
    if (inside.has(f.v)) {
      rejected.push(f.idx);
      out.push(snap(edgesIn[f.idx], 9, `A aresta ${LABELS[f.u]}-${LABELS[f.v]} (peso ${f.weight}) era a mais barata da fila, mas ${LABELS[f.v]} já entrou na árvore por outro caminho. Descarto: pegá-la faria ciclo.`));
      continue;
    }
    inside.add(f.v);
    chosen.push(f.idx);
    total += f.weight;
    out.push(snap(edgesIn[f.idx], 11, `A mais barata que sai da árvore é ${LABELS[f.u]}-${LABELS[f.v]}, peso ${f.weight}. ${LABELS[f.v]} entra na árvore. Total: ${total}. A árvore nunca se parte: ela é sempre uma peça só, crescendo.`));
    for (const x of adj[f.v]) {
      if (!inside.has(x.v)) queue.push({ weight: x.weight, u: f.v, v: x.v, idx: x.idx });
    }
  }
  out.push(snap(null, 13, `MST completa com ${chosen.length} arestas e peso total ${total}. O caminho foi outro, o resultado é o mesmo número.`, { ok: true }));
  return out;
}

const COLORS = ["#3b82f6", "#a78bfa", "#6ee7b7", "#fcd34d", "#f472b6", "#22d3ee"];
const SPEEDS = [0, 1500, 1000, 700, 450, 260];

export function MstVisualizer() {
  const [presetKey, setPresetKey] = useState("classic");
  const [mode, setMode] = useState<Mode>("kruskal");

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const sortedEdges = useMemo(() => [...preset.edges].sort((x, y) => x.weight - y.weight), [preset]);
  const steps = useMemo(() => buildSteps(preset.edges, mode), [preset, mode]);

  const viz = useVisualizer({
    title: "Visualizador · Kruskal e Prim no mesmo grafo",
    total: steps.length,
    speeds: SPEEDS,
    initialSpeed: 4,
    // O eixo da altura desta peça é o TEXTO. O desenho tem altura constante (as
    // coordenadas estão em `POS`, e o SVG renderiza 330x230 = viewBox nas três
    // réguas), e a lista de arestas vive na coluna ao lado dele: mesmo no preset
    // de 9 arestas ela chega a 175px contra os 244 do desenho, 69px antes de
    // encostar. Quem move a peça é a dica (18 ou 37px) e a nota (22 ou 42px) —
    // ou seja, o preset e o modo.
    measureOn: [presetKey, mode],
  });

  const s = steps[viz.step];
  const list = mode === "kruskal" ? sortedEdges : preset.edges;
  const chosen = useMemo(() => new Set(s.chosen), [s.chosen]);
  const rejected = useMemo(() => new Set(s.rejected), [s.rejected]);

  const totals = useMemo(() => ({
    kruskal: buildSteps(preset.edges, "kruskal").slice(-1)[0].total,
    prim: buildSteps(preset.edges, "prim").slice(-1)[0].total,
  }), [preset]);

  const colorOf = (i: number) => (mode === "prim"
    ? (s.inside.includes(i) ? COLORS[0] : "#3d4c61")
    : COLORS[s.component[i] % COLORS.length]);

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      {/* O peso continua à esquerda do "passo N de M", que agora é do hook. */}
      <VizHeader viz={viz}>
        <span className="viz-step">peso {s.total} ·</span>
      </VizHeader>

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          <button className={`bigo-chip${mode === "kruskal" ? " on" : ""}`} onClick={() => { viz.reset(); setMode("kruskal"); }} aria-pressed={mode === "kruskal"}>Kruskal: ordena arestas</button>
          <button className={`bigo-chip${mode === "prim" ? " on" : ""}`} onClick={() => { viz.reset(); setMode("prim"); }} aria-pressed={mode === "prim"}>Prim: cresce de um vértice</button>
        </div>
        <div className="bigo-chips" style={{ marginTop: 2 }}>
          {PRESETS.map((pr) => (
            <button key={pr.key} className={`bigo-chip${presetKey === pr.key ? " on" : ""}`} onClick={() => { viz.reset(); setPresetKey(pr.key); }} aria-pressed={presetKey === pr.key}>{pr.label}</button>
          ))}
        </div>
        <p className="tt-legenda-arvore">{preset.hint}</p>

        <div className="gr-split">
          <div className="tt-arv-wrap" style={{ margin: 0 }}>
            <svg className="tt-arv" width={330} height={230} viewBox="0 0 330 230" role="img"
              aria-label={`Grafo com pesos. ${mode === "kruskal" ? "Kruskal" : "Prim"}, peso acumulado ${s.total}. ${s.note}`}>
              {preset.edges.map((e, i) => {
                const listIdx = mode === "kruskal" ? sortedEdges.indexOf(e) : i;
                const inMst = chosen.has(listIdx);
                const rej = rejected.has(listIdx);
                const active = s.edge === e;
                const mx = (POS[e.a].x + POS[e.b].x) / 2, my = (POS[e.a].y + POS[e.b].y) / 2;
                return (
                  <g key={`${e.a}-${e.b}`}>
                    <line className={`tt-aresta${inMst ? " mst" : rej ? " rejeitada" : active ? " ativa" : ""}`}
                      x1={POS[e.a].x} y1={POS[e.a].y} x2={POS[e.b].x} y2={POS[e.b].y} />
                    <text className="gr-peso" x={mx} y={my - 3} textAnchor="middle">{e.weight}</text>
                  </g>
                );
              })}
              {LABELS.map((label, i) => (
                <g key={label} className="tt-no mst-no">
                  <circle cx={POS[i].x} cy={POS[i].y} r={16} style={{ fill: colorOf(i) + "44", stroke: colorOf(i) }} />
                  <text x={POS[i].x} y={POS[i].y + 4} textAnchor="middle">{label}</text>
                </g>
              ))}
            </svg>
          </div>

          <div className="gr-painel">
            <div className="tt-painel-tit">
              {mode === "kruskal" ? "Arestas ordenadas por peso" : "Arestas do grafo"}{" "}
              <em>{mode === "kruskal" ? "percorridas de cima para baixo" : "Prim escolhe pela fronteira"}</em>
            </div>
            <div className="mst-lista">
              {list.map((e, i) => (
                <span key={`${e.a}-${e.b}`} className={`mst-item${chosen.has(i) ? " ok" : rejected.has(i) ? " rej" : ""}`}>
                  {LABELS[e.a]}{LABELS[e.b]} <b>{e.weight}</b>
                </span>
              ))}
            </div>
            <p className="bt-array-nota" style={{ marginTop: 10 }}>
              {mode === "kruskal"
                ? "Verde entrou na MST, riscada foi recusada por formar ciclo. O union-find é quem responde 'já estão no mesmo grupo?' em tempo quase constante."
                : "Prim não ordena a lista inteira: ele mantém só as arestas que saem da árvore atual, numa fila de prioridade."}
            </p>
          </div>
        </div>

        <p className={"viz-note" + (s.ok ? " ok" : "")}>{s.note}</p>

        <div className="viz-split">
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">{mode}.py</div>
              <div className="viz-code-body">
                {CODE[mode].map((txt, i) => (
                  <div key={i} className={`viz-line${i === s.line ? " on" : ""}`}><span className="ln">{i + 1}</span>{txt}</div>
                ))}
              </div>
            </div>
          </div>
          <div {...viz.varsProps}>
            <div className="viz-vars-head">No mesmo grafo</div>
            <div className="viz-var"><span className="viz-var-name">Kruskal</span><span className={`viz-var-val${mode === "kruskal" ? " best" : ""}`}>peso {totals.kruskal}</span></div>
            <div className="viz-var"><span className="viz-var-name">Prim</span><span className={`viz-var-val${mode === "prim" ? " best" : ""}`}>peso {totals.prim}</span></div>
            <div className="viz-var"><span className="viz-var-name">arestas na MST</span><span className="viz-var-val">{s.chosen.length} de {LABELS.length - 1}</span></div>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Rode os dois no mesmo preset e compare o peso final: é sempre igual. No preset com pesos
          repetidos eles chegam a escolher arestas diferentes, e mesmo assim o total bate. Duas MSTs
          do mesmo grafo podem ser diferentes; o peso, não.
        </p>
      </div>

      <VizFooter viz={viz} />
    </figure>
  );
}
