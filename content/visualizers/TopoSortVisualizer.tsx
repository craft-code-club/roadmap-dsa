"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// TopoSortVisualizer, Kahn com o grau de entrada à vista.
//
// A ordenação topológica é fácil de aceitar e difícil de sentir, porque o
// estado que importa (o grau de entrada de cada vértice) costuma ficar
// escondido numa variável. Aqui ele é um painel de primeira classe: cada
// remoção de vértice decrementa os vizinhos na tela, e o vértice entra na fila
// no instante em que o contador dele chega a zero.
//
// O preset com ciclo é o outro motivo de existir: quando a fila esvazia antes
// de todos os vértices saírem, o que sobrou é exatamente o ciclo. Detecção de
// ciclo não é um extra do Kahn, é uma consequência de graça.
// ---------------------------------------------------------------------------

const LABELS = ["Álgebra", "Cálculo I", "Cálculo II", "Física", "Estatística", "ML", "Programação"];
const SHORT = ["Alg", "C1", "C2", "Fis", "Est", "ML", "Prog"];
// Layout POSICIONADO, não calculado: as sete coordenadas são constantes, então o
// desenho tem a mesma altura em todo preset e em todo passo. Medido: 175px, que
// é exatamente a altura do `viewBox`.
const POS = [
  { x: 45, y: 40 },
  { x: 150, y: 40 },
  { x: 255, y: 40 },
  { x: 150, y: 130 },
  { x: 255, y: 130 },
  { x: 355, y: 85 },
  { x: 45, y: 130 },
];

type Preset = { key: string; label: string; edges: [number, number][]; hint: string };

const PRESETS: Preset[] = [
  {
    key: "course",
    label: "Pré-requisitos de um curso",
    edges: [[0, 1], [1, 2], [0, 3], [1, 3], [2, 4], [4, 5], [6, 5], [3, 4]],
    hint: "Uma aresta A → B quer dizer 'A é pré-requisito de B'. A ordenação topológica é uma ordem válida de fazer as matérias.",
  },
  {
    key: "parallel",
    label: "Muita coisa independente",
    edges: [[0, 1], [6, 3], [1, 2], [4, 5]],
    hint: "Vários vértices com grau de entrada zero desde o começo: existem MUITAS ordens válidas, e a fila mostra os candidatos empatados.",
  },
  {
    key: "cycle",
    label: "Com ciclo (impossível)",
    edges: [[0, 1], [1, 2], [2, 4], [4, 1], [0, 3], [6, 5]],
    hint: "C1 → C2 → Est → C1 é um ciclo: cada um espera o outro. Não existe ordem válida, e o Kahn descobre isso sozinho.",
  },
];

// Snippet autocontido de propósito: a lista de adjacência é construída aqui
// dentro, no mesmo laço que conta o grau. Sem isso, o `adj[u]` lá embaixo
// apareceria do nada e o exemplo não rodaria se alguém copiasse.
//
// É código PYTHON que o aluno lê na tela, em português: `grau`, `fila` e
// `ordem` são conteúdo didático, não identificadores deste arquivo.
const CODE = [
  "def kahn(vertices, arestas):",
  "    adj = {v: [] for v in vertices}",
  "    grau = {v: 0 for v in vertices}",
  "    for u, v in arestas:",
  "        adj[u].append(v)",
  "        grau[v] += 1                 # quantos pré-requisitos faltam",
  "",
  "    fila = deque(v for v in vertices if grau[v] == 0)",
  "    ordem = []",
  "    while fila:",
  "        u = fila.popleft()",
  "        ordem.append(u)",
  "        for v in adj[u]:",
  "            grau[v] -= 1             # um pré-requisito a menos",
  "            if grau[v] == 0:",
  "                fila.append(v)       # liberado",
  "    if len(ordem) < len(vertices):",
  "        raise CicloDetectado()",
];

type Step = {
  node: number;
  edge: [number, number] | null;
  degree: number[];
  queue: number[];
  order: number[];
  line: number;
  note: string;
  ok?: boolean;
  alert?: boolean;
};

function generateSteps(edges: [number, number][]): Step[] {
  const V = LABELS.length;
  const adj: number[][] = LABELS.map(() => []);
  const degree = new Array(V).fill(0);
  for (const [u, v] of edges) { adj[u].push(v); degree[v]++; }

  const queue: number[] = [];
  const order: number[] = [];
  const out: Step[] = [];
  const snap = (node: number, line: number, note: string, edge: [number, number] | null = null, extra: Partial<Step> = {}): Step =>
    ({ node, edge, degree: [...degree], queue: [...queue], order: [...order], line, note, ...extra });

  // Dois passos em vez de um: a preparação faz duas coisas distintas (contar os
  // graus e montar a fila inicial), e juntá-las obrigava a nota a descrever uma
  // linha enquanto o destaque acendia a outra.
  out.push(snap(-1, 5, `Conto quantas arestas CHEGAM em cada vértice: é o grau de entrada, ou seja, quantos pré-requisitos ainda faltam para ele poder acontecer.`));
  for (let i = 0; i < V; i++) if (degree[i] === 0) queue.push(i);
  out.push(snap(-1, 7, `Agora monto a fila inicial com quem já está em zero: ${queue.map((i) => LABELS[i]).join(", ") || "ninguém"}. Esses não dependem de nada e podem começar imediatamente.`));

  let guard = 0;
  while (queue.length && guard++ < 300) {
    const u = queue.shift() as number;
    order.push(u);
    // `line` é ÍNDICE em CODE (0-based); o painel numera a partir de 1. O 10
    // aqui é `u = fila.popleft()`, que aparece como linha 11 na tela e é a ação
    // que a nota descreve primeiro.
    out.push(snap(u, 10, `Tiro ${LABELS[u]} da fila: o grau de entrada dele é zero, então nenhum pré-requisito está pendente. Ele entra na ordem final na posição ${order.length}.`));

    for (const v of adj[u]) {
      degree[v]--;
      if (degree[v] === 0) {
        queue.push(v);
        out.push(snap(v, 15, `Como ${LABELS[u]} saiu, o grau de ${LABELS[v]} cai para 0: o último pré-requisito dele foi cumprido. Entra na fila.`, [u, v]));
      } else {
        out.push(snap(v, 13, `Grau de ${LABELS[v]} cai para ${degree[v]}: ainda faltam ${degree[v]} ${degree[v] === 1 ? "pré-requisito" : "pré-requisitos"}, então ele continua esperando.`, [u, v]));
      }
    }
  }

  if (order.length < V) {
    const stuck = LABELS.map((_, i) => i).filter((i) => !order.includes(i));
    out.push(snap(-1, 17,
      `A fila esvaziou com só ${order.length} de ${V} vértices na ordem. Os que sobraram (${stuck.map((i) => LABELS[i]).join(", ")}) têm grau de entrada maior que zero e ninguém mais para zerá-lo: eles dependem uns dos outros em ciclo. Não existe ordem válida, e o que sobrou É o ciclo.`,
      null, { alert: true }));
  } else {
    out.push(snap(-1, 16, `Ordem topológica completa: ${order.map((i) => LABELS[i]).join(" → ")}. Toda aresta do grafo aponta da esquerda para a direita nessa lista, que é exatamente a definição.`, null, { ok: true }));
  }
  return out;
}

// A marcha inicial é a da peça, não a do hook: ela sempre abriu em 1.5x.
const INITIAL_SPEED = 4;

export function TopoSortVisualizer() {
  const [presetKey, setPresetKey] = useState("course");

  const preset = useMemo(() => PRESETS.find((pr) => pr.key === presetKey) ?? PRESETS[0], [presetKey]);
  const steps = useMemo(() => generateSteps(preset.edges), [preset]);

  const viz = useVisualizer({
    title: "Visualizador · Kahn, com o grau de entrada à vista",
    total: steps.length,
    initialSpeed: INITIAL_SPEED,
    // O preset é a ÚNICA entrada do aluno, e é o que muda a altura: a dica cai
    // de duas linhas para uma entre presets (37px contra 18 no fluxo do artigo).
    // O desenho não entra porque as posições são constantes, e as três fichas
    // auxiliares medem 34px em todos os passos dos três presets. O passo, que é
    // o que mais mexe na nota, o hook não enxerga de propósito (contrato §9).
    measureOn: [presetKey],
  });

  const idx = viz.step;
  const p = steps[idx];

  const pickPreset = (key: string) => { viz.reset(); setPresetKey(key); };

  const done = useMemo(() => new Set(p.order), [p.order]);
  const inQueue = useMemo(() => new Set(p.queue), [p.queue]);

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button type="button" key={pr.key} className={`bigo-chip${presetKey === pr.key ? " on" : ""}${pr.key === "cycle" ? " na" : ""}`} onClick={() => pickPreset(pr.key)} aria-pressed={presetKey === pr.key}>
              {pr.label}
            </button>
          ))}
        </div>
        <p className="tt-legenda-arvore">{preset.hint}</p>

        <div className="gr-split">
          <div className="tt-arv-wrap" style={{ margin: 0 }}>
            <svg className="tt-arv" width={400} height={175} viewBox="0 0 400 175" role="img"
              aria-label={`Grafo dirigido de pré-requisitos. ${p.note}`}>
              <defs>
                <marker id="seta-topo" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 8 4 L 0 8 z" fill="rgba(59,130,246,0.75)" />
                </marker>
              </defs>
              {preset.edges.map(([u, v]) => {
                const active = p.edge && p.edge[0] === u && p.edge[1] === v;
                const dx = POS[v].x - POS[u].x, dy = POS[v].y - POS[u].y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1, r = 22;
                return (
                  <line key={`${u}-${v}`} className={`tt-aresta${active ? " ativa" : done.has(u) ? " on" : ""}`}
                    x1={POS[u].x + (dx / d) * r} y1={POS[u].y + (dy / d) * r}
                    x2={POS[v].x - (dx / d) * r} y2={POS[v].y - (dy / d) * r}
                    markerEnd="url(#seta-topo)" />
                );
              })}
              {SHORT.map((s, i) => {
                const cls = ["tt-no", "topo-no"];
                if (i === p.node) cls.push("on");
                else if (done.has(i)) cls.push("saiu");
                else if (inQueue.has(i)) cls.push("aux");
                return (
                  <g key={s} className={cls.join(" ")}>
                    <circle cx={POS[i].x} cy={POS[i].y} r={20} />
                    <text x={POS[i].x} y={POS[i].y + 1} textAnchor="middle">{s}</text>
                    <text className="topo-grau" x={POS[i].x} y={POS[i].y + 13} textAnchor="middle">
                      {done.has(i) ? "✓" : p.degree[i]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="tt-painel">
              <div className="tt-painel-tit">Grau de entrada <em>pré-requisitos que faltam</em></div>
              <div className="gr-dists">
                {LABELS.map((r, i) => (
                  <span key={r} className={`gr-dist-item${done.has(i) ? " fechado" : p.degree[i] === 0 ? "" : " off"}`}>
                    <i>{SHORT[i]}</i>{done.has(i) ? "✓" : p.degree[i]}
                  </span>
                ))}
              </div>
            </div>
            <div className="tt-painel">
              <div className="tt-painel-tit">Fila <em>grau zero, prontos para sair</em></div>
              <div className="tt-aux">
                {p.queue.length === 0 ? <span className="tt-vazio">vazia</span> : p.queue.map((v, i) => (
                  <span key={`${v}-${i}`} className={`tt-aux-item${i === 0 ? " topo" : ""}`}>{SHORT[v]}</span>
                ))}
              </div>
            </div>
            <div className="tt-painel">
              <div className="tt-painel-tit">Ordem final</div>
              <div className="tt-saida">
                {p.order.length === 0 ? <span className="tt-vazio">nada ainda</span> : p.order.map((v, i) => (
                  <span key={v} className={`tt-saida-item${i === p.order.length - 1 ? " novo" : ""}`}>{SHORT[v]}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className={"viz-note" + (p.ok ? " ok" : p.alert ? " invalid" : "")}>{p.note}</p>

        <div className="viz-split">
          {/* O `.viz-code-slot` é o que recolhe a ALTURA: zerar a trilha da
              coluna sozinha tira só a largura (contrato §7). */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">kahn.py</div>
              <div className="viz-code-body">
                {CODE.map((txt, i) => (
                  <div key={i} className={`viz-line${i === p.line ? " on" : ""}`}><span className="ln">{i + 1}</span>{txt}</div>
                ))}
              </div>
            </div>
          </div>
          <div {...viz.varsProps}>
            <div className="viz-vars-head">Variáveis</div>
            <div className="viz-var"><span className="viz-var-name">na ordem</span><span className="viz-var-val best">{p.order.length} de {LABELS.length}</span></div>
            <div className="viz-var"><span className="viz-var-name">na fila</span><span className="viz-var-val">{p.queue.length}</span></div>
            <div className="viz-var"><span className="viz-var-name">arestas</span><span className="viz-var-val">{preset.edges.length}</span></div>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Quando a fila tem mais de um vértice ao mesmo tempo, existe mais de uma ordem válida:
          qualquer um deles pode sair primeiro. E quando a fila esvazia cedo, o que sobrou na tela é
          o ciclo. Rode o terceiro preset até o fim.
        </p>
      </div>

      <VizFooter viz={viz} />
    </figure>
  );
}
