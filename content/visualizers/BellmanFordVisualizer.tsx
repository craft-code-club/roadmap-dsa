"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// BellmanFordVisualizer, as rodadas e a rodada que sobra.
//
// Dijkstra escolhe; Bellman-Ford não escolhe nada, ele insiste. A ideia é
// relaxar TODAS as arestas, V-1 vezes, e a visualização é montada para deixar
// óbvio de onde vem o V-1: depois da rodada k, toda distância que usa até k
// arestas já está correta. O painel de rodadas guarda o histórico, então dá
// para ver a informação avançando uma aresta por rodada.
//
// A rodada extra é o segundo motivo de o algoritmo existir. Se ainda dá para
// melhorar depois de V-1 rodadas, existe ciclo negativo, e o visualizador
// acende exatamente a aresta que provou isso.
// ---------------------------------------------------------------------------

const LABELS = ["A", "B", "C", "D", "E"];
const POS = [
  { x: 40, y: 120 },
  { x: 140, y: 40 },
  { x: 140, y: 200 },
  { x: 250, y: 40 },
  { x: 250, y: 200 },
];

type Edge = { from: number; to: number; weight: number };
const E = (from: number, to: number, weight: number): Edge => ({ from, to, weight });

type Preset = { key: string; label: string; edges: Edge[]; hint: string };

const PRESETS: Preset[] = [
  {
    key: "negative",
    label: "Com peso negativo (funciona)",
    edges: [E(0, 1, 6), E(0, 2, 7), E(1, 3, 5), E(1, 2, 8), E(2, 3, -3), E(2, 4, 9), E(3, 4, 7), E(1, 4, -4)],
    hint: "Onde o Dijkstra erraria. Bellman-Ford não fecha ninguém, então uma aresta negativa descoberta tarde ainda consegue corrigir tudo.",
  },
  {
    key: "cycle",
    label: "Ciclo negativo (detecta)",
    edges: [E(0, 1, 4), E(1, 2, -6), E(2, 3, 3), E(3, 1, 1), E(0, 4, 5), E(2, 4, 2)],
    hint: "O ciclo B → C → D → B soma -6 + 3 + 1 = -2. Dar mais uma volta sempre barateia, então o mínimo não existe. A rodada extra prova isso.",
  },
  {
    key: "positive",
    label: "Só pesos positivos",
    edges: [E(0, 1, 4), E(0, 2, 2), E(2, 1, 1), E(1, 3, 5), E(2, 4, 8), E(3, 4, 2)],
    hint: "Aqui o Dijkstra daria a mesma resposta, muito mais rápido. Bellman-Ford é o plano B, não o plano A.",
  },
];

// Python de tela: é conteúdo didático, e os nomes daqui são os que as notas
// explicam em português. Não traduza junto com os identificadores.
const CODE = [
  "def bellman_ford(inicio, vertices, arestas):",
  "    dist = {v: inf for v in vertices}",
  "    dist[inicio] = 0",
  "",
  "    for _ in range(len(vertices) - 1):   # V-1 rodadas",
  "        for u, v, peso in arestas:       # TODAS as arestas",
  "            if dist[u] + peso < dist[v]:",
  "                dist[v] = dist[u] + peso",
  "",
  "    for u, v, peso in arestas:           # a rodada que sobra",
  "        if dist[u] + peso < dist[v]:",
  "            raise CicloNegativo()        # ainda melhora: não tem mínimo",
  "    return dist",
];

type Step = {
  round: number;
  edge: Edge | null;
  dist: (number | null)[];
  history: (number | null)[][];
  improved: boolean;
  line: number;
  note: string;
  ok?: boolean;
  alert?: boolean;
  /**
   * A rodada de detecção de ciclo negativo, que roda DEPOIS das V-1. O `round`
   * dela é V, e V não é uma das V-1: quem mostra rodada precisa perguntar por
   * este campo antes de escrever o número. E com early exit ele nem é o número
   * de rodadas que aconteceram — dois dos três presets param na 2.
   */
  extraRound?: boolean;
};

function buildSteps(edges: Edge[]): Step[] {
  const V = LABELS.length;
  const dist: (number | null)[] = LABELS.map(() => null);
  dist[0] = 0;
  const history: (number | null)[][] = [[...dist]];
  const out: Step[] = [];
  const snap = (round: number, edge: Edge | null, improved: boolean, line: number, note: string, extra: Partial<Step> = {}): Step => ({
    round, edge, dist: [...dist], history: history.map((h) => [...h]), improved, line, note, ...extra,
  });

  out.push(snap(0, null, false, 2, `${LABELS[0]} vale 0 e todo o resto vale infinito. Bellman-Ford não tem fila nem escolha: ele vai relaxar todas as ${edges.length} arestas, ${V - 1} vezes seguidas.`));

  for (let r = 1; r <= V - 1; r++) {
    let changed = false;
    for (const e of edges) {
      const du = dist[e.from];
      if (du === null) {
        out.push(snap(r, e, false, 6, `Rodada ${r}: ainda não sei chegar em ${LABELS[e.from]}, então a aresta ${LABELS[e.from]} → ${LABELS[e.to]} não me diz nada por enquanto. Numa rodada futura ela vai valer.`));
        continue;
      }
      const candidate = du + e.weight;
      const current = dist[e.to];
      if (current === null || candidate < current) {
        dist[e.to] = candidate;
        changed = true;
        out.push(snap(r, e, true, 7, `Rodada ${r}: relaxo ${LABELS[e.from]} → ${LABELS[e.to]}. ${du} ${e.weight < 0 ? "-" : "+"} ${Math.abs(e.weight)} = ${candidate}, melhor que ${current === null ? "infinito" : current}. Atualizo.`));
      } else {
        out.push(snap(r, e, false, 6, `Rodada ${r}: testo ${LABELS[e.from]} → ${LABELS[e.to]}: ${du} ${e.weight < 0 ? "-" : "+"} ${Math.abs(e.weight)} = ${candidate}, que não bate os ${current} que já tenho. Sigo.`));
      }
    }
    history.push([...dist]);
    out.push(snap(r, null, changed, 4,
      changed
        ? `Fim da rodada ${r}. Garantia do algoritmo: todo caminho mínimo que usa até ${r} ${r === 1 ? "aresta" : "arestas"} já está correto na tabela. A informação anda exatamente uma aresta por rodada.`
        : `Fim da rodada ${r} e nada mudou. Se uma rodada inteira não melhora nada, nenhuma próxima vai: dá para parar aqui, e é assim que a otimização por early exit funciona.`));
    if (!changed) break;
  }

  // Rodada extra: detecção de ciclo negativo.
  //
  // Os dois lados precisam ser numéricos antes de comparar. Com `null` no
  // destino, o JavaScript coage para 0 e qualquer peso negativo viraria falso
  // positivo. Hoje isso não acontece (se a origem da aresta é alcançável, o
  // destino também foi relaxado nas rodadas anteriores), mas depender dessa
  // sutileza para não reportar ciclo inexistente é frágil demais.
  let culprit: Edge | null = null;
  for (const e of edges) {
    const du = dist[e.from];
    const dv = dist[e.to];
    if (du === null || dv === null) continue; // só compara número com número
    if (du + e.weight < dv) { culprit = e; break; }
  }

  if (culprit) {
    out.push(snap(V, culprit, true, 10,
      `RODADA EXTRA: a aresta ${LABELS[culprit.from]} → ${LABELS[culprit.to]} AINDA melhora, depois de ${V - 1} rodadas. Isso é impossível num grafo sadio, porque nenhum caminho mínimo usa mais de ${V - 1} arestas. A única explicação é ciclo negativo: dar mais uma volta barateia para sempre, e o mínimo não existe.`,
      { alert: true, extraRound: true }));
  } else {
    const summary = LABELS.map((l, i) => `${l}=${dist[i] === null ? "∞" : dist[i]}`).join("  ");
    out.push(snap(V, null, false, 12,
      `RODADA EXTRA: nenhuma aresta melhora, então não existe ciclo negativo e a resposta é final. Distâncias a partir de ${LABELS[0]}: ${summary}.`,
      { ok: true, extraRound: true }));
  }
  return out;
}

// A marcha desta peça é a própria: um relaxamento é rápido de ler, e o padrão
// do hook (1400..250) arrasta demais numa animação de 30 passos.
const SPEEDS = [0, 1200, 800, 550, 350, 200];

export function BellmanFordVisualizer() {
  const [presetKey, setPresetKey] = useState("negative");
  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const steps = useMemo(() => buildSteps(preset.edges), [preset]);

  const viz = useVisualizer({
    title: "Visualizador · Bellman-Ford, rodada a rodada, a partir de A",
    total: steps.length,
    speeds: SPEEDS,
    initialSpeed: 4,
    // O eixo da altura desta peça é o TEXTO, e quem troca o texto é o preset: a
    // dica tem 18 ou 37px e a nota vai de 22 a 63px. O desenho não entra porque
    // as coordenadas estão em `POS` — os três presets desenham a mesma caixa de
    // 250px —, e a tabela de rodadas não alcança o desenho nem cheia (203 de
    // 264px), então nem ela nem o passo mudam a decisão.
    measureOn: [presetKey],
  });

  const s = steps[viz.step];
  // A rodada extra não é uma das V-1: ela roda DEPOIS delas, para detectar ciclo
  // negativo. Mostrar o número dela ao lado do total dava "rodada 5 de 4", e com
  // early exit (dois dos três presets param na rodada 2) o próprio 5 era falso.
  // O rótulo passa a nomear a rodada em vez de numerá-la.
  const roundLabel = s.extraRound ? "extra" : String(s.round);

  // Quantos relaxamentos ACONTECERAM até o passo atual. O cartão mostrava
  // (V-1)×E e chamava aquilo de "relaxamentos totais", mas (V-1)×E é o PIOR
  // CASO — o custo do algoritmo, não o da execução que está na tela. Medido no
  // gerador, no último passo dos três presets: 16 de 32 (peso negativo, para na
  // rodada 2), 24 de 24 (ciclo negativo, roda as quatro) e 12 de 24 (só
  // positivos, para na 2). Dois dos três diziam o dobro do que fizeram.
  //
  // A rodada extra fica FORA da conta pelo mesmo motivo que fica fora do
  // contador de rodada: ela roda depois das V-1 e não é uma delas. Somá-la
  // daria "25 de 24", o irmão do "rodada 5 de 4" que o cabeçalho já corrigiu.
  const relaxations = useMemo(() => {
    let n = 0;
    return steps.map((st) => (st.edge && !st.extraRound ? ++n : n));
  }, [steps]);

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      {/* A rodada continua à esquerda do "passo N de M", que agora é do hook. O
          `·` no fim é obrigatório: é a solução do §9 do contrato para o
          separador que some quando o `VizHeader` já desenha o contador. */}
      <VizHeader viz={viz}>
        <span className="viz-step">rodada {roundLabel} ·</span>
      </VizHeader>

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button type="button" key={pr.key} className={`bigo-chip${presetKey === pr.key ? " on" : ""}${pr.key === "cycle" ? " na" : ""}`} onClick={() => { viz.reset(); setPresetKey(pr.key); }} aria-pressed={presetKey === pr.key}>
              {pr.label}
            </button>
          ))}
        </div>
        <p className="tt-legenda-arvore">{preset.hint}</p>

        <div className="gr-split">
          <div className="tt-arv-wrap" style={{ margin: 0 }}>
            <svg className="tt-arv" width={300} height={250} viewBox="0 0 300 250" role="img"
              aria-label={`Grafo dirigido com pesos. Bellman-Ford, rodada ${roundLabel}. ${s.note}`}>
              <defs>
                <marker id="seta-bf" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 8 4 L 0 8 z" fill="rgba(59,130,246,0.75)" />
                </marker>
              </defs>
              {preset.edges.map((e) => {
                const active = s.edge && s.edge.from === e.from && s.edge.to === e.to;
                const dx = POS[e.to].x - POS[e.from].x, dy = POS[e.to].y - POS[e.from].y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1, r = 19;
                const mx = (POS[e.from].x + POS[e.to].x) / 2, my = (POS[e.from].y + POS[e.to].y) / 2;
                return (
                  <g key={`${e.from}-${e.to}`}>
                    <line className={`tt-aresta${active ? (s.alert ? " erro" : " ativa") : ""}`}
                      x1={POS[e.from].x + (dx / d) * r} y1={POS[e.from].y + (dy / d) * r}
                      x2={POS[e.to].x - (dx / d) * r} y2={POS[e.to].y - (dy / d) * r}
                      markerEnd="url(#seta-bf)" />
                    <text className={`gr-peso${e.weight < 0 ? " neg" : ""}`} x={mx} y={my - 4} textAnchor="middle">{e.weight}</text>
                  </g>
                );
              })}
              {LABELS.map((label, i) => {
                const active = !!s.edge && (s.edge.from === i || s.edge.to === i);
                return (
                  <g key={label} className={`tt-no${active ? " on" : s.dist[i] !== null ? " saiu" : ""}`}>
                    <circle cx={POS[i].x} cy={POS[i].y} r={17} />
                    <text x={POS[i].x} y={POS[i].y + 4} textAnchor="middle">{label}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="gr-painel">
            <div className="tt-painel-tit">Distâncias por rodada <em>a informação anda uma aresta por rodada</em></div>
            <table className="gr-matriz bf-tab">
              <thead>
                <tr>
                  <th>rodada</th>
                  {LABELS.map((label) => <th key={label}>{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {s.history.map((row, r) => (
                  <tr key={r} className={r === s.history.length - 1 ? "on" : undefined}>
                    <th>{r === 0 ? "início" : r}</th>
                    {row.map((v, i) => {
                      const previous = r > 0 ? s.history[r - 1][i] : null;
                      const changed = r > 0 && v !== previous;
                      return <td key={i} className={`bf-cel${changed ? " mudou" : ""}${v === null ? " inf" : ""}`}>{v === null ? "∞" : v}</td>;
                    })}
                  </tr>
                ))}
                <tr className="on">
                  <th>agora</th>
                  {s.dist.map((v, i) => <td key={i} className={`bf-cel${v === null ? " inf" : ""}`}>{v === null ? "∞" : v}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p className={"viz-note" + (s.ok ? " ok" : s.alert ? " invalid" : "")}>{s.note}</p>

        <div className="viz-split">
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">bellman_ford.py</div>
              <div className="viz-code-body">
                {CODE.map((txt, i) => (
                  <div key={i} className={`viz-line${i === s.line ? " on" : ""}`}><span className="ln">{i + 1}</span>{txt}</div>
                ))}
              </div>
            </div>
          </div>
          <div {...viz.varsProps}>
            <div className="viz-vars-head">Variáveis</div>
            <div className="viz-var"><span className="viz-var-name">rodada</span><span className="viz-var-val best">{s.extraRound ? "extra (detecção)" : `${s.round} de ${LABELS.length - 1}`}</span></div>
            <div className="viz-var"><span className="viz-var-name">arestas por rodada</span><span className="viz-var-val">{preset.edges.length}</span></div>
            {/* Os dois números, e não um só: o da esquerda é o que a execução
                fez, o da direita é o (V-1)×E do pior caso. O rótulo perdeu o
                "totais", que era a palavra que fazia o pior caso passar por
                execução. A forma "N de M" é a mesma do cartão de rodada logo
                acima, e com o cartão do meio a conta fecha na tela: 4 rodadas
                prometidas × 8 arestas = 32. */}
            <div className="viz-var"><span className="viz-var-name">relaxamentos</span><span className="viz-var-val">{relaxations[viz.step]} de {(LABELS.length - 1) * preset.edges.length}</span></div>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Olhe a tabela de rodadas de cima para baixo: cada linha corrige os caminhos que usam mais
          uma aresta que a anterior. Como nenhum caminho mínimo usa mais de V-1 arestas, V-1 rodadas
          bastam, e é literalmente daí que sai o número.
        </p>
      </div>

      <VizFooter viz={viz} />
    </figure>
  );
}
