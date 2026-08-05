"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// AStarVisualizer, a heurística em cima de uma grade.
//
// A* é Dijkstra com uma informação a mais, e a única forma honesta de mostrar
// isso é rodar os DOIS no mesmo mapa e contar células expandidas. Numa grade a
// diferença é gritante: o Dijkstra abre um círculo em volta da origem, o A*
// abre um corredor na direção do alvo, e os dois chegam pelo mesmo custo.
//
// Os três modos são o mesmo laço com uma fórmula de prioridade diferente:
//   Dijkstra  f = g          (ignora o alvo)
//   A*        f = g + h      (equilibra passado e futuro)
//   Guloso    f = h          (ignora o custo já pago, e por isso erra)
// O modo guloso existe para provar que a soma importa: ele é rápido e às vezes
// devolve um caminho pior, que é exatamente o preço de jogar fora o g.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

const COLS = 14; // colunas
const ROWS = 9;  // linhas
const CELL = 26;

type Mode = "astar" | "dijkstra" | "greedy";

type Preset = { key: string; label: string; walls: string; hint: string };

// Mapas em texto: '#' é parede. Ler assim deixa o mapa editável de olho.
const PRESETS: Preset[] = [
  {
    key: "wall",
    label: "Um muro no meio",
    hint: "O caso didático: o A* vai direto até o muro, contorna e segue. O Dijkstra explora para trás também, sem motivo.",
    walls: [
      "..............",
      "..............",
      ".......#......",
      ".......#......",
      ".......#......",
      ".......#......",
      ".......#......",
      "..............",
      "..............",
    ].join("\n"),
  },
  {
    key: "maze",
    label: "Labirinto",
    hint: "Com becos sem saída, a heurística ainda ajuda, mas menos: ela aponta para o alvo e a parede diz que não dá.",
    walls: [
      "..............",
      ".####.####....",
      ".#......#.....",
      ".#.####.#.###.",
      ".#.#..#.#.#...",
      "...#..#...#.##",
      ".###..#####...",
      "......#.......",
      ".#####........",
    ].join("\n"),
  },
  {
    key: "open",
    label: "Campo aberto",
    hint: "Sem obstáculo nenhum, o A* praticamente desenha a linha reta e o Dijkstra abre um círculo. É a diferença no estado puro.",
    walls: Array(ROWS).fill(".".repeat(COLS)).join("\n"),
  },
];

const START: [number, number] = [4, 1];
const GOAL: [number, number] = [4, 12];

// O Python da tela é CONTEÚDO em português (`inicio`, `alvo`, `vizinhos`,
// `fila`, `novo`): as notas do passo a passo citam esses nomes. Traduzir aqui
// desalinha o código da aula que o explica.
const CODE = [
  "import heapq",
  "",
  "def a_estrela(inicio, alvo, vizinhos, h):",
  "    g = {inicio: 0}",
  "    fila = [(h(inicio), inicio)]      # f = g + h",
  "    while fila:",
  "        _, u = heapq.heappop(fila)    # menor f",
  "        if u == alvo:",
  "            return g[alvo]",
  "        for v in vizinhos(u):",
  "            novo = g[u] + 1",
  "            if novo < g.get(v, inf):",
  "                g[v] = novo",
  "                heapq.heappush(fila, (novo + h(v), v))",
];

type Step = {
  current: [number, number] | null;
  closed: string[];
  frontier: string[];
  g: Record<string, number>;
  path: string[];
  note: string;
  ok?: boolean;
};

const cellKey = (r: number, c: number) => `${r},${c}`;
const manhattan = (r: number, c: number) => Math.abs(r - GOAL[0]) + Math.abs(c - GOAL[1]);

function parseWalls(txt: string): boolean[][] {
  const lines = txt.split("\n");
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => (lines[r]?.[c] ?? ".") === "#")
  );
}

function buildSteps(walls: boolean[][], mode: Mode): Step[] {
  const out: Step[] = [];
  const g: Record<string, number> = { [cellKey(...START)]: 0 };
  const parent: Record<string, string> = {};
  const closed = new Set<string>();
  const queue: { f: number; r: number; c: number }[] = [
    { f: mode === "dijkstra" ? 0 : manhattan(...START), r: START[0], c: START[1] },
  ];

  const priority = (cost: number, r: number, c: number) =>
    mode === "dijkstra" ? cost : mode === "greedy" ? manhattan(r, c) : cost + manhattan(r, c);

  const snap = (current: [number, number] | null, note: string, path: string[] = [], ok = false): Step => ({
    current,
    closed: [...closed],
    frontier: queue.map((q) => cellKey(q.r, q.c)),
    g: { ...g },
    path,
    note,
    ok,
  });

  const modeName = mode === "astar" ? "A*" : mode === "dijkstra" ? "Dijkstra" : "Guloso";
  out.push(snap(START, `${modeName}: começo na origem. ${
    mode === "dijkstra"
      ? "A prioridade é só o custo já pago (g). O algoritmo não sabe onde fica o alvo, então explora igualmente em todas as direções."
      : mode === "greedy"
        ? "A prioridade é só a estimativa até o alvo (h). Rápido, mas ele ignora o quanto já gastou, e por isso pode devolver caminho pior."
        : "A prioridade é g + h: o que já paguei mais o que estimo faltar. É essa soma que mantém o caminho ótimo e ainda aponta para o alvo."
  }`));

  let guard = 0;
  let found = false;
  while (queue.length && guard++ < 4000) {
    queue.sort((x, y) => x.f - y.f);
    const { r, c } = queue.shift() as { f: number; r: number; c: number };
    const k = cellKey(r, c);
    if (closed.has(k)) continue;
    closed.add(k);

    if (r === GOAL[0] && c === GOAL[1]) {
      const path: string[] = [];
      let cur = k;
      while (cur) { path.push(cur); cur = parent[cur]; }
      found = true;
      out.push(snap([r, c], `Cheguei ao alvo com custo ${g[k]}, depois de expandir ${closed.size} células. ${
        mode === "greedy"
          ? "O guloso chegou rápido, mas nada garante que este seja o caminho mais barato: ele nunca olhou para o custo já pago."
          : "Este é o caminho mais barato possível, e os dois algoritmos que somam o g concordam nesse número."
      }`, path.reverse(), true));
      break;
    }

    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || walls[nr][nc]) continue;
      const nk = cellKey(nr, nc);
      const tentative = g[k] + 1;
      if (g[nk] === undefined || tentative < g[nk]) {
        g[nk] = tentative;
        parent[nk] = k;
        queue.push({ f: priority(tentative, nr, nc), r: nr, c: nc });
      }
    }
    // um passo por expansão, para a animação não ficar longa demais
    out.push(snap([r, c], `Expando (${r}, ${c}): g = ${g[k]}${mode !== "dijkstra" ? `, h = ${manhattan(r, c)}${mode === "astar" ? `, f = ${g[k] + manhattan(r, c)}` : ""}` : ""}. ${closed.size} ${closed.size === 1 ? "célula expandida" : "células expandidas"} até aqui.`));
  }

  if (!found) {
    out.push(snap(null, `A fronteira esvaziou sem alcançar o alvo: não existe caminho neste mapa.`, [], true));
  }
  return out;
}

// O ritmo é desta peça: um passo é uma expansão de célula, e a animação chega a
// 119 passos no preset mais longo. As marchas do hook são lentas demais aqui.
const SPEEDS = [0, 400, 240, 140, 80, 40];

export function AStarVisualizer() {
  const [presetKey, setPresetKey] = useState("wall");
  const [mode, setMode] = useState<Mode>("astar");

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const walls = useMemo(() => parseWalls(preset.walls), [preset]);
  const steps = useMemo(() => buildSteps(walls, mode), [walls, mode]);

  const viz = useVisualizer({
    title: "Visualizador · A*, Dijkstra e Guloso no mesmo mapa",
    total: steps.length,
    speeds: SPEEDS,
    // a peça abria em 1.5x antes da casca, e continua abrindo
    initialSpeed: 4,
    // O que muda a altura: o preset troca a DICA (uma ou duas linhas) e o modo
    // troca a NOTA. O desenho tem altura constante — a grade é COLS × ROWS ×
    // CELL, três constantes deste arquivo, e nada na tela mexe nelas.
    measureOn: [presetKey, mode],
  });

  const p = steps[viz.step];

  // comparação honesta: roda os três no mesmo mapa e conta expansões
  const comparison = useMemo(() => {
    return (["dijkstra", "astar", "greedy"] as Mode[]).map((m) => {
      const ps = buildSteps(walls, m);
      const f = ps[ps.length - 1];
      return { mode: m, expandedCells: f.closed.length, cost: f.path.length ? f.path.length - 1 : null };
    });
  }, [walls]);

  const closedSet = useMemo(() => new Set(p.closed), [p.closed]);
  const frontierSet = useMemo(() => new Set(p.frontier), [p.frontier]);
  const pathSet = useMemo(() => new Set(p.path), [p.path]);

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      {/* O número que resume o estado vai antes do "passo N de M". */}
      <VizHeader viz={viz}>
        <span className="viz-step">{p.closed.length} expandidas</span>
      </VizHeader>

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          <button className={`bigo-chip${mode === "astar" ? " on" : ""}`} onClick={() => { viz.reset(); setMode("astar"); }} aria-pressed={mode === "astar"}>A*: f = g + h</button>
          <button className={`bigo-chip${mode === "dijkstra" ? " on" : ""}`} onClick={() => { viz.reset(); setMode("dijkstra"); }} aria-pressed={mode === "dijkstra"}>Dijkstra: f = g</button>
          <button className={`bigo-chip na${mode === "greedy" ? " on" : ""}`} onClick={() => { viz.reset(); setMode("greedy"); }} aria-pressed={mode === "greedy"}>Guloso: f = h</button>
        </div>
        <div className="bigo-chips" style={{ marginTop: 2 }}>
          {PRESETS.map((pr) => (
            <button key={pr.key} className={`bigo-chip${presetKey === pr.key ? " on" : ""}`} onClick={() => { viz.reset(); setPresetKey(pr.key); }} aria-pressed={presetKey === pr.key}>
              {pr.label}
            </button>
          ))}
        </div>
        <p className="tt-legenda-arvore">{preset.hint}</p>

        <div className="tt-arv-wrap">
          <svg className="tt-arv" width={COLS * CELL + 2} height={ROWS * CELL + 2} viewBox={`0 0 ${COLS * CELL + 2} ${ROWS * CELL + 2}`}
            role="img" aria-label={`Grade ${ROWS} por ${COLS}. ${p.note}`}>
            {Array.from({ length: ROWS }, (_, r) =>
              Array.from({ length: COLS }, (_, c) => {
                const k = cellKey(r, c);
                const isStart = r === START[0] && c === START[1];
                const isGoal = r === GOAL[0] && c === GOAL[1];
                let cls = "as-cel";
                if (walls[r][c]) cls += " parede";
                else if (isStart) cls += " inicio";
                else if (isGoal) cls += " alvo";
                else if (pathSet.has(k)) cls += " caminho";
                else if (p.current && p.current[0] === r && p.current[1] === c) cls += " atual";
                else if (closedSet.has(k)) cls += " fechado";
                else if (frontierSet.has(k)) cls += " fronteira";
                return (
                  <g key={k} className={cls}>
                    <rect x={c * CELL + 1} y={r * CELL + 1} width={CELL - 2} height={CELL - 2} rx={4} />
                    {(isStart || isGoal) && (
                      <text x={c * CELL + CELL / 2} y={r * CELL + CELL / 2 + 4} textAnchor="middle">{isStart ? "I" : "F"}</text>
                    )}
                  </g>
                );
              })
            )}
          </svg>
        </div>

        <div className="as-legenda">
          <span><i className="as-i fechado" />expandida</span>
          <span><i className="as-i fronteira" />na fronteira</span>
          <span><i className="as-i caminho" />caminho final</span>
          <span><i className="as-i parede" />parede</span>
        </div>

        <p className={"viz-note" + (p.ok ? " ok" : "")}>{p.note}</p>

        <div className="viz-split">
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">a_estrela.py</div>
              <div className="viz-code-body">
                {CODE.map((txt, i) => (
                  <div key={i} className={`viz-line${i === (mode === "astar" ? 13 : 6) ? " on" : ""}`}><span className="ln">{i + 1}</span>{txt}</div>
                ))}
              </div>
            </div>
          </div>
          <div {...viz.varsProps}>
            <div className="viz-vars-head">No mapa atual</div>
            {comparison.map((c) => (
              <div className="viz-var" key={c.mode}>
                <span className="viz-var-name">{c.mode === "astar" ? "A*" : c.mode === "dijkstra" ? "Dijkstra" : "Guloso"}</span>
                <span className={`viz-var-val${c.mode === mode ? " best" : ""}`}>
                  {c.expandedCells} células · custo {c.cost ?? "-"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          O painel da direita roda os três no mesmo mapa e conta. Compare duas colunas: A* e Dijkstra
          chegam com o MESMO custo, e o A* expande muito menos. O guloso expande menos ainda e é o
          único que pode devolver um caminho mais caro.
        </p>
      </div>

      <VizFooter viz={viz} />
    </figure>
  );
}
