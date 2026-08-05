"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// GrafoDfsBfs, o mesmo grafo, a mesma origem, duas estruturas.
//
// Em árvore, DFS e BFS são duas formas de ler. Em grafo, eles respondem
// perguntas diferentes, e o visualizador é montado para deixar isso inevitável:
//
//   - a coluna "distância" mostra que o BFS chega em todo vértice pelo caminho
//     com MENOS arestas, e o DFS não;
//   - o conjunto de visitados fica visível, porque em grafo ele é obrigatório:
//     sem ele o ciclo faz o percurso girar para sempre;
//   - pilha e fila trocam de lugar sem que uma linha da lógica mude.
//
// A distância do BFS é registrada na hora de ENFILEIRAR (não na de processar),
// que é o detalhe que evita contar o mesmo vértice duas vezes e é onde a
// maioria das implementações erra.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

// Os rótulos dos vértices são o que o aluno lê no desenho, nas notas e nos
// painéis: conteúdo, não identificador.
const LABELS = ["A", "B", "C", "D", "E", "F", "G"];
const POS = [
  { x: 40, y: 40 },
  { x: 150, y: 40 },
  { x: 260, y: 40 },
  { x: 95, y: 140 },
  { x: 205, y: 140 },
  { x: 150, y: 240 },
  { x: 265, y: 240 },
];

type Preset = { key: string; label: string; edges: [number, number][]; hint: string };

const PRESETS: Preset[] = [
  {
    key: "cycle",
    label: "Com ciclo",
    edges: [[0, 1], [0, 3], [1, 2], [1, 4], [3, 4], [3, 5], [4, 6], [5, 6], [2, 4]],
    hint: "Tem mais de um caminho entre vários pares. É onde a diferença entre DFS e BFS aparece, e onde o conjunto de visitados vira obrigatório.",
  },
  {
    key: "tree",
    label: "Sem ciclo (é uma árvore)",
    edges: [[0, 1], [0, 3], [1, 2], [3, 4], [3, 5], [4, 6]],
    hint: "Grafo conexo sem ciclo é exatamente uma árvore. Aqui os dois percursos viram os da árvore, e o conjunto de visitados fica supérfluo.",
  },
  {
    key: "disconnected",
    label: "Desconexo",
    edges: [[0, 1], [1, 2], [3, 4], [4, 6], [5, 6]],
    hint: "Dois componentes separados. Partindo de A você nunca alcança D, E, F, G: um percurso só não cobre o grafo inteiro.",
  },
];

// O Python da tela é conteúdo didático em português, e continua em português:
// `visitados`, `pilha`, `fila` e os comentários são o que o aluno lê e o que as
// notas do passo a passo explicam.
const CODE = {
  dfs: [
    "def dfs(inicio, g):",
    "    visitados = {inicio}",
    "    pilha = [inicio]",
    "    while pilha:",
    "        u = pilha.pop()        # o ÚLTIMO que entrou",
    "        processa(u)",
    "        for v in g[u]:",
    "            if v not in visitados:",
    "                visitados.add(v)",
    "                pilha.append(v)",
  ],
  bfs: [
    "def bfs(inicio, g):",
    "    visitados = {inicio}",
    "    fila = deque([inicio])",
    "    while fila:",
    "        u = fila.popleft()     # o PRIMEIRO que entrou",
    "        processa(u)",
    "        for v in g[u]:",
    "            if v not in visitados:",
    "                visitados.add(v)   # marca ao ENFILEIRAR",
    "                fila.append(v)",
  ],
};

// `dfs` e `bfs` também são o nome do arquivo que aparece no cabeçalho do bloco
// de código (`dfs.py`), então o valor é conteúdo além de identificador.
type Mode = "dfs" | "bfs";

type Step = {
  node: number;
  aux: number[];
  visited: number[];
  order: number[];
  dist: (number | null)[];
  edge: [number, number] | null;
  line: number;
  note: string;
  ok?: boolean;
};

// A marcha inicial era `useState(4)` — 1.5x, e não o 1x padrão do hook. Ela
// vira `initialSpeed`, senão a peça passa a abrir mais devagar do que abria.
const INITIAL_SPEED = 4;

function adjacency(edges: [number, number][]): number[][] {
  const g: number[][] = LABELS.map(() => []);
  for (const [a, b] of edges) { g[a].push(b); g[b].push(a); }
  for (const l of g) l.sort((x, y) => x - y);
  return g;
}

function generateSteps(edges: [number, number][], mode: Mode, start: number): Step[] {
  const g = adjacency(edges);
  const out: Step[] = [];
  const visited = new Set<number>([start]);
  const dist: (number | null)[] = LABELS.map(() => null);
  dist[start] = 0;
  const order: number[] = [];
  const aux: number[] = [start];

  const snap = (node: number, line: number, note: string, edge: [number, number] | null = null, ok = false): Step => ({
    node, aux: [...aux], visited: [...visited], order: [...order], dist: [...dist], edge, line, note, ok,
  });

  out.push(snap(start, 2, `Começo em ${LABELS[start]}. Já marco a origem como visitada antes do laço: em grafo, "visitado" não é enfeite, é o que impede o percurso de girar em ciclo para sempre.`));

  let guard = 0;
  while (aux.length && guard++ < 300) {
    const u = mode === "dfs" ? (aux.pop() as number) : (aux.shift() as number);
    order.push(u);
    out.push(snap(u, 4, mode === "dfs"
      ? `Tiro ${LABELS[u]} do TOPO da pilha. Pilha devolve o último que entrou, então eu sempre continuo pelo ramo mais recente: o percurso afunda.`
      : `Tiro ${LABELS[u]} da FRENTE da fila, a ${dist[u]} ${dist[u] === 1 ? "aresta" : "arestas"} da origem. Fila devolve o mais antigo, então eu só desço de nível depois de esgotar o atual.`));

    for (const v of g[u]) {
      if (visited.has(v)) {
        out.push(snap(u, 7, `${LABELS[v]} é vizinho de ${LABELS[u]}, mas já está em visitados: ignoro. Sem esta linha, este grafo com ciclo travaria o programa.`, [u, v]));
        continue;
      }
      visited.add(v);
      dist[v] = (dist[u] ?? 0) + 1;
      aux.push(v);
      out.push(snap(v, 9,
        mode === "dfs"
          ? `${LABELS[v]} é novo: marco como visitado e empilho. Ele vai ser o próximo a sair, na frente de qualquer coisa que já estivesse na pilha.`
          : `${LABELS[v]} é novo: marco como visitado JÁ e enfileiro, com distância ${dist[v]}. Marcar ao enfileirar (e não ao processar) é o que impede o mesmo vértice de entrar duas vezes na fila.`,
        [u, v]));
    }
  }

  const reached = order.length;
  const missing = LABELS.length - reached;
  out.push(snap(-1, 3,
    `${mode === "dfs" ? "DFS" : "BFS"} terminou: ${order.map((i) => LABELS[i]).join(", ")}. ${
      missing > 0
        ? `Alcancei ${reached} de ${LABELS.length} vértices: os outros ${missing} estão em outro componente, e para cobrir o grafo inteiro seria preciso reiniciar o percurso a partir de um vértice ainda não visitado.`
        : mode === "bfs"
          ? `A coluna de distância é o prêmio: cada valor é o MENOR número de arestas da origem até o vértice. O DFS visita os mesmos vértices e não te dá isso.`
          : `Visitei os mesmos vértices que o BFS visitaria, mas em outra ordem, e sem nenhuma garantia sobre distância.`
    }`, null, true));
  return out;
}

export function GrafoDfsBfs() {
  const [presetKey, setPresetKey] = useState("cycle");
  const [mode, setMode] = useState<Mode>("bfs");

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const steps = useMemo(() => generateSteps(preset.edges, mode, 0), [preset, mode]);
  const total = steps.length;

  const viz = useVisualizer({
    title: "Visualizador · DFS e BFS no mesmo grafo, a partir de A",
    total,
    initialSpeed: INITIAL_SPEED,
    // O que muda a altura da peça: o modo (a nota do BFS é mais longa que a do
    // DFS e ganha uma linha) e o preset (a dica do "Desconexo" é mais curta que
    // a dos outros dois, e valem 19px no artigo). O desenho tem altura fixa: o
    // SVG é sempre 305x285, com os mesmos 7 vértices nas mesmas posições.
    measureOn: [mode, presetKey],
  });

  const idx = viz.step;
  const p = steps[idx];

  const pickMode = (m: Mode) => { viz.reset(); setMode(m); };
  const pickPreset = (k: string) => { viz.reset(); setPresetKey(k); };

  const visited = useMemo(() => new Set(p.visited), [p.visited]);
  const processed = useMemo(() => new Set(p.order), [p.order]);
  const auxPeak = useMemo(() => steps.reduce((m, q) => Math.max(m, q.aux.length), 0), [steps]);

  const isDfs = mode === "dfs";

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          <button className={`bigo-chip${mode === "bfs" ? " on" : ""}`} onClick={() => pickMode("bfs")} aria-pressed={mode === "bfs"}>
            BFS (fila)
          </button>
          <button className={`bigo-chip${isDfs ? " on" : ""}`} onClick={() => pickMode("dfs")} aria-pressed={isDfs}>
            DFS (pilha)
          </button>
        </div>
        <div className="bigo-chips" style={{ marginTop: 2 }}>
          {PRESETS.map((pr) => (
            <button key={pr.key} className={`bigo-chip${presetKey === pr.key ? " on" : ""}`} onClick={() => pickPreset(pr.key)} aria-pressed={presetKey === pr.key}>
              {pr.label}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">{preset.hint}</p>

        <div className="gr-split">
          <div className="tt-arv-wrap" style={{ margin: 0 }}>
            <svg
              className="tt-arv" width={305} height={285} viewBox="0 0 305 285"
              role="img"
              aria-label={`Grafo com 7 vértices. ${mode === "bfs" ? "BFS" : "DFS"} a partir de A, passo ${idx + 1} de ${total}. ${p.note}`}
            >
              {preset.edges.map(([a, b]) => {
                const inUse = p.edge && ((p.edge[0] === a && p.edge[1] === b) || (p.edge[0] === b && p.edge[1] === a));
                const used = processed.has(a) && processed.has(b);
                return (
                  <line
                    key={`${a}-${b}`}
                    className={`tt-aresta${inUse ? " ativa" : used ? " on" : ""}`}
                    x1={POS[a].x} y1={POS[a].y} x2={POS[b].x} y2={POS[b].y}
                  />
                );
              })}
              {LABELS.map((label, i) => {
                const cls = ["tt-no"];
                if (i === p.node) cls.push("on");
                else if (processed.has(i)) cls.push("saiu");
                else if (visited.has(i)) cls.push("aux");
                return (
                  <g key={label} className={cls.join(" ")}>
                    <circle cx={POS[i].x} cy={POS[i].y} r={17} />
                    <text x={POS[i].x} y={POS[i].y + 4} textAnchor="middle">{label}</text>
                    {mode === "bfs" && p.dist[i] !== null && (
                      <text className="gr-dist" x={POS[i].x + 20} y={POS[i].y - 12}>{p.dist[i]}</text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="tt-painel">
              <div className="tt-painel-tit">
                {isDfs ? "Pilha" : "Fila"} <em>{isDfs ? "sai o último (LIFO)" : "sai o primeiro (FIFO)"}</em>
              </div>
              <div className="tt-aux">
                {p.aux.length === 0 ? <span className="tt-vazio">vazia</span> : p.aux.map((id, i) => (
                  <span key={`${id}-${i}`} className={`tt-aux-item${(isDfs ? i === p.aux.length - 1 : i === 0) ? " topo" : ""}`}>{LABELS[id]}</span>
                ))}
              </div>
            </div>
            <div className="tt-painel">
              <div className="tt-painel-tit">Ordem de processamento</div>
              <div className="tt-saida">
                {p.order.length === 0 ? <span className="tt-vazio">nada ainda</span> : p.order.map((id, i) => (
                  <span key={`${id}-${i}`} className={`tt-saida-item${i === p.order.length - 1 ? " novo" : ""}`}>{LABELS[id]}</span>
                ))}
              </div>
            </div>
            <div className="tt-painel">
              <div className="tt-painel-tit">
                Distância da origem <em>{mode === "bfs" ? "mínima, em arestas" : "o DFS não garante mínima"}</em>
              </div>
              <div className="gr-dists">
                {LABELS.map((label, i) => (
                  <span key={label} className={`gr-dist-item${p.dist[i] === null ? " off" : ""}`}>
                    <i>{label}</i>{p.dist[i] === null ? "∞" : p.dist[i]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className={"viz-note" + (p.ok ? " ok" : "")}>{p.note}</p>

        <div className="viz-split">
          {/* O `.viz-code-slot` é o que recolhe a ALTURA: zerar a trilha da
              coluna sozinha tira só a largura (contrato §7). */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">{mode}.py</div>
              <div className="viz-code-body">
                {CODE[mode].map((txt, i) => (
                  <div key={i} className={`viz-line${i === p.line ? " on" : ""}`}>
                    <span className="ln">{i + 1}</span>{txt}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div {...viz.varsProps}>
            <div className="viz-vars-head">Variáveis</div>
            <div className="viz-var"><span className="viz-var-name">vértice atual</span><span className="viz-var-val">{p.node >= 0 ? LABELS[p.node] : "-"}</span></div>
            <div className="viz-var"><span className="viz-var-name">visitados</span><span className="viz-var-val">{p.visited.length} de {LABELS.length}</span></div>
            <div className="viz-var"><span className="viz-var-name">{isDfs ? "pilha" : "fila"}</span><span className="viz-var-val">{p.aux.length}</span></div>
            <div className="viz-var"><span className="viz-var-name">processados</span><span className="viz-var-val best">{p.order.length}</span></div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat"><span>vértices</span><strong>{LABELS.length}</strong></div>
          <div className="bigo-stat"><span>arestas</span><strong>{preset.edges.length}</strong></div>
          <div className="bigo-stat"><span>pico da {isDfs ? "pilha" : "fila"}</span><strong>{auxPeak}</strong></div>
          <div className="bigo-stat"><span>complexidade</span><strong>O(V + E)</strong></div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Rode o BFS até o fim e anote as distâncias. Depois rode o DFS e compare a ordem: os mesmos
          vértices são visitados, e só o BFS chega em cada um pelo caminho mais curto. Trocar
          <code> pop() </code> por <code> popleft() </code> troca o algoritmo inteiro.
        </p>
      </div>

      <VizFooter viz={viz} />
    </figure>
  );
}
