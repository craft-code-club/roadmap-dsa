"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// DijkstraVisualizer, o guloso que fecha um vértice por vez.
//
// Dijkstra é fácil de decorar e difícil de acreditar: por que fechar o menor da
// fila é seguro? O visualizador responde mostrando as três coisas juntas em
// cada passo: a tabela de distâncias provisórias, a fila de prioridade, e o
// conjunto dos FECHADOS. Quando um vértice fecha, ele nunca mais muda, e dá
// para ver isso acontecendo.
//
// O preset com peso negativo existe para quebrar o algoritmo na cara do aluno:
// o vértice fecha com um valor, e uma aresta descoberta depois provaria que
// existia caminho melhor. Não é bug de implementação, é a hipótese do algoritmo
// sendo violada, e é a ponte para Bellman-Ford.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

const LABELS = ["A", "B", "C", "D", "E", "F"];
const POS = [
  { x: 40, y: 130 },
  { x: 135, y: 40 },
  { x: 135, y: 220 },
  { x: 235, y: 40 },
  { x: 235, y: 220 },
  { x: 330, y: 130 },
];

type Edge = { from: number; to: number; weight: number };
type Preset = { key: string; label: string; edges: Edge[]; hint: string; negative?: boolean };

const A = (from: number, to: number, weight: number): Edge => ({ from, to, weight });

const PRESETS: Preset[] = [
  {
    key: "classic",
    label: "Grafo com pesos",
    edges: [A(0, 1, 4), A(0, 2, 2), A(1, 3, 5), A(2, 1, 1), A(2, 4, 8), A(3, 5, 3), A(4, 5, 2), A(3, 4, 2)],
    hint: "Repare no A→B: o caminho direto custa 4, mas passar por C custa 2+1 = 3. É o relaxamento que descobre isso.",
  },
  {
    key: "trap",
    label: "A tentação do caminho direto",
    edges: [A(0, 1, 10), A(0, 2, 1), A(2, 3, 1), A(3, 1, 1), A(1, 5, 1), A(2, 4, 7), A(4, 5, 1)],
    hint: "A aresta A→B custa 10 e parece ruim. O desvio A→C→D→B custa 3. Guloso não quer dizer míope: Dijkstra acha o desvio.",
  },
  {
    key: "negative",
    label: "Com peso negativo (quebra)",
    // Montado para FALHAR de verdade: B fecha valendo 1, e só depois o C
    // (que fecha com 2) revela a aresta C→B de peso -2, que daria 0.
    //
    // O detalhe fino: dist[B] até é corrigido para 0, porque o relaxamento
    // escreve na tabela mesmo com o vértice fechado. O que NÃO acontece é B ser
    // reprocessado, então quem foi relaxado a partir dele (D, e por consequência
    // F) fica com valor velho. Conferido contra Bellman-Ford: D sai 4 quando o
    // correto é 3, e F sai 5 quando o correto é 4.
    edges: [A(0, 1, 1), A(0, 2, 2), A(2, 1, -2), A(1, 3, 3), A(3, 5, 1), A(2, 4, 4), A(4, 5, 1)],
    hint: "A aresta C→B vale -2. O B fecha valendo 1 antes de ninguém ver essa aresta, e o Dijkstra nunca REPROCESSA um fechado: a tabela até corrige o B, mas D e F ficam com valor velho e a resposta final sai errada neles.",
    negative: true,
  },
];

// O Python da tela é CONTEÚDO em português (`fila`, `fechados`, `inicio`): as
// notas do passo a passo citam esses nomes para explicar o que a linha faz.
const CODE = [
  "import heapq",
  "",
  "def dijkstra(inicio, g):",
  "    dist = {v: inf for v in g}",
  "    dist[inicio] = 0",
  "    fila = [(0, inicio)]",
  "    fechados = set()",
  "    while fila:",
  "        d, u = heapq.heappop(fila)   # o menor de todos",
  "        if u in fechados: continue",
  "        fechados.add(u)              # fechou, nunca mais muda",
  "        for v, peso in g[u]:",
  "            if d + peso < dist[v]:   # relaxamento",
  "                dist[v] = d + peso",
  "                heapq.heappush(fila, (dist[v], v))",
];

type Step = {
  node: number;
  edge: [number, number] | null;
  dist: (number | null)[];
  queue: { d: number; v: number }[];
  closed: number[];
  line: number;
  note: string;
  ok?: boolean;
  alert?: boolean;
};

function generateSteps(edges: Edge[], negative: boolean): Step[] {
  const g: { v: number; weight: number }[][] = LABELS.map(() => []);
  for (const e of edges) g[e.from].push({ v: e.to, weight: e.weight });

  const dist: (number | null)[] = LABELS.map(() => null);
  dist[0] = 0;
  const closed = new Set<number>();
  const queue: { d: number; v: number }[] = [{ d: 0, v: 0 }];
  const out: Step[] = [];
  const snap = (node: number, line: number, note: string, edge: [number, number] | null = null, extra: Partial<Step> = {}): Step => ({
    node, edge, dist: [...dist], queue: [...queue].sort((x, y) => x.d - y.d), closed: [...closed], line, note, ...extra,
  });

  out.push(snap(0, 5, `Começo em ${LABELS[0]} com distância 0, e todo o resto em infinito. "Infinito" quer dizer "ainda não sei chegar lá", não "é impossível".`));

  let guard = 0;
  let broke = false;
  while (queue.length && guard++ < 300) {
    queue.sort((x, y) => x.d - y.d);
    const { d, v: u } = queue.shift() as { d: number; v: number };
    if (closed.has(u)) {
      out.push(snap(u, 9, `${LABELS[u]} já está fechado, então descarto esta cópia da fila. Cópias velhas aparecem porque a gente empurra sem remover a anterior, e ignorá-las é mais barato que procurá-las.`));
      continue;
    }
    closed.add(u);
    out.push(snap(u, 10, `Tiro o MENOR da fila: ${LABELS[u]}, com ${d}. Fecho ele. A aposta do Dijkstra é esta: como todo peso é ${negative ? "supostamente " : ""}não negativo, nenhum caminho que ainda não explorei poderia chegar em ${LABELS[u]} por menos de ${d}${negative ? ", e é exatamente essa aposta que o peso negativo quebra" : ""}.`));

    for (const { v, weight } of g[u]) {
      const current = dist[v];
      const relaxed = (d ?? 0) + weight;
      if (current === null || relaxed < current) {
        const wasClosed = closed.has(v);
        dist[v] = relaxed;
        if (!wasClosed) queue.push({ d: relaxed, v });
        out.push(snap(v, 12,
          wasClosed
            ? `PROBLEMA: por ${LABELS[u]} eu chego em ${LABELS[v]} com ${relaxed}, melhor que os ${current} que já estavam lá. Mas ${LABELS[v]} JÁ ESTÁ FECHADO, e o Dijkstra não volta em vértice fechado. A resposta final vai sair errada.`
            : current === null
              ? `Relaxo ${LABELS[u]} → ${LABELS[v]}: era infinito, agora sei chegar com ${d} + ${weight} = ${relaxed}. Coloco ${LABELS[v]} na fila.`
              : `Relaxo ${LABELS[u]} → ${LABELS[v]}: ${d} + ${weight} = ${relaxed}, melhor que os ${current} que eu tinha. Atualizo e reempurro na fila.`,
          [u, v],
          wasClosed ? { alert: true } : {}));
        if (wasClosed) broke = true;
      } else {
        out.push(snap(v, 12, `Testo ${LABELS[u]} → ${LABELS[v]}: ${d} + ${weight} = ${relaxed}, que não é melhor que os ${current} que já tenho. Não mexo em nada.`, [u, v]));
      }
    }
  }

  const summary = LABELS.map((r, i) => `${r}=${dist[i] === null ? "∞" : dist[i]}`).join("  ");
  out.push(snap(-1, 7,
    broke
      ? `Terminou com ${summary}. Só que a execução passou por um vértice já fechado que melhorou depois: o resultado NÃO é confiável. Com peso negativo, a hipótese do Dijkstra cai, e o algoritmo certo é Bellman-Ford.`
      : `Terminou. Distâncias mínimas a partir de ${LABELS[0]}: ${summary}. Cada vértice fechou uma vez só, e nenhum precisou ser revisitado.`,
    null, broke ? { alert: true } : { ok: true }));
  return out;
}

const SPEEDS = [0, 1500, 1000, 700, 450, 260];

export function DijkstraVisualizer() {
  const [presetKey, setPresetKey] = useState("classic");

  const preset = useMemo(() => PRESETS.find((pr) => pr.key === presetKey) ?? PRESETS[0], [presetKey]);
  const steps = useMemo(() => generateSteps(preset.edges, !!preset.negative), [preset]);
  const total = steps.length;

  const viz = useVisualizer({
    title: "Visualizador · Dijkstra fechando um vértice por vez, a partir de A",
    total,
    speeds: SPEEDS,
    // A peça já abria em 1.5x, e a marcha inicial é parte do que ela é.
    initialSpeed: 4,
    // O que muda a altura desta peça é o preset: cada um tem outra sequência de
    // notas, e a NOTA é o único bloco que cresce (22 a 63px, medido). A fila de
    // prioridade e a tabela de distâncias são fileiras de fichas de altura fixa
    // (34px em todos os passos dos três presets): elas nunca quebram linha.
    measureOn: [presetKey],
  });

  const p = steps[viz.step];

  const closed = useMemo(() => new Set(p.closed), [p.closed]);
  const inQueue = useMemo(() => new Set(p.queue.map((q) => q.v)), [p.queue]);

  const pickPreset = (key: string) => { viz.reset(); setPresetKey(key); };

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button type="button" key={pr.key} className={`bigo-chip${presetKey === pr.key ? " on" : ""}${pr.negative ? " na" : ""}`} onClick={() => pickPreset(pr.key)} aria-pressed={presetKey === pr.key}>
              {pr.label}
            </button>
          ))}
        </div>
        <p className="tt-legenda-arvore">{preset.hint}</p>

        <div className="gr-split">
          <div className="tt-arv-wrap" style={{ margin: 0 }}>
            <svg className="tt-arv" width={370} height={270} viewBox="0 0 370 270" role="img"
              aria-label={`Grafo com pesos. Dijkstra a partir de A, passo ${viz.step + 1} de ${total}. ${p.note}`}>
              <defs>
                <marker id="seta-dij" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 8 4 L 0 8 z" fill="rgba(59,130,246,0.75)" />
                </marker>
              </defs>
              {preset.edges.map((e) => {
                const active = p.edge && p.edge[0] === e.from && p.edge[1] === e.to;
                const dx = POS[e.to].x - POS[e.from].x, dy = POS[e.to].y - POS[e.from].y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1, r = 19;
                const mx = (POS[e.from].x + POS[e.to].x) / 2, my = (POS[e.from].y + POS[e.to].y) / 2;
                return (
                  <g key={`${e.from}-${e.to}`}>
                    <line className={`tt-aresta${active ? " ativa" : closed.has(e.from) ? " on" : ""}`}
                      x1={POS[e.from].x + (dx / len) * r} y1={POS[e.from].y + (dy / len) * r}
                      x2={POS[e.to].x - (dx / len) * r} y2={POS[e.to].y - (dy / len) * r}
                      markerEnd="url(#seta-dij)" />
                    <text className={`gr-peso${e.weight < 0 ? " neg" : ""}`} x={mx} y={my - 4} textAnchor="middle">{e.weight}</text>
                  </g>
                );
              })}
              {LABELS.map((r, i) => {
                const cls = ["tt-no"];
                if (i === p.node) cls.push("on");
                else if (closed.has(i)) cls.push("saiu");
                else if (inQueue.has(i)) cls.push("aux");
                return (
                  <g key={r} className={cls.join(" ")}>
                    <circle cx={POS[i].x} cy={POS[i].y} r={17} />
                    <text x={POS[i].x} y={POS[i].y + 4} textAnchor="middle">{r}</text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="tt-painel">
              <div className="tt-painel-tit">Distância provisória <em>a partir de A</em></div>
              <div className="gr-dists">
                {LABELS.map((r, i) => (
                  <span key={r} className={`gr-dist-item${p.dist[i] === null ? " off" : ""}${closed.has(i) ? " fechado" : ""}`}>
                    <i>{r}</i>{p.dist[i] === null ? "∞" : p.dist[i]}
                  </span>
                ))}
              </div>
            </div>
            <div className="tt-painel">
              <div className="tt-painel-tit">Fila de prioridade <em>sai sempre o menor</em></div>
              <div className="tt-aux">
                {p.queue.length === 0 ? <span className="tt-vazio">vazia</span> : p.queue.map((q, i) => (
                  <span key={`${q.v}-${i}`} className={`tt-aux-item${i === 0 ? " topo" : ""}`}>{LABELS[q.v]}:{q.d}</span>
                ))}
              </div>
            </div>
            <div className="tt-painel">
              <div className="tt-painel-tit">Fechados <em>não mudam mais</em></div>
              <div className="tt-saida">
                {p.closed.length === 0 ? <span className="tt-vazio">nenhum</span> : p.closed.map((v, i) => (
                  <span key={v} className={`tt-saida-item${i === p.closed.length - 1 ? " novo" : ""}`}>{LABELS[v]}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className={"viz-note" + (p.ok ? " ok" : p.alert ? " invalid" : "")}>{p.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com a altura inteira
              do código. O `.viz-code-slot` é o truque de grid 1fr→0fr. O código
              fica no DOM mesmo recolhido — é isso que permite medir o pior caso
              —, e o `inert` o tira do teclado e dos leitores de tela. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">dijkstra.py</div>
              <div className="viz-code-body">
                {CODE.map((txt, i) => (
                  <div key={i} className={`viz-line${i === p.line ? " on" : ""}`}><span className="ln">{i + 1}</span>{txt}</div>
                ))}
              </div>
            </div>
          </div>
          <div {...viz.varsProps}>
            <div className="viz-vars-head">Variáveis</div>
            <div className="viz-var"><span className="viz-var-name">vértice atual</span><span className="viz-var-val">{p.node >= 0 ? LABELS[p.node] : "-"}</span></div>
            <div className="viz-var"><span className="viz-var-name">fechados</span><span className="viz-var-val best">{p.closed.length} de {LABELS.length}</span></div>
            <div className="viz-var"><span className="viz-var-name">na fila</span><span className="viz-var-val">{p.queue.length}</span></div>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Acompanhe a coluna dos fechados: uma vez que um vértice entra ali, o valor dele é final.
          Essa é a diferença entre Dijkstra e Bellman-Ford, e é também a razão de o peso negativo
          quebrar tudo. Rode o terceiro preset até o fim.
        </p>
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );
}
