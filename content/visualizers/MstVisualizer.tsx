"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
// ---------------------------------------------------------------------------

const ROT = ["A", "B", "C", "D", "E", "F"];
const POS = [
  { x: 45, y: 45 },
  { x: 165, y: 30 },
  { x: 285, y: 45 },
  { x: 45, y: 175 },
  { x: 165, y: 200 },
  { x: 285, y: 175 },
];

type Aresta = { a: number; b: number; peso: number };
const E = (a: number, b: number, peso: number): Aresta => ({ a, b, peso });

type Preset = { key: string; rotulo: string; arestas: Aresta[]; dica: string };

const PRESETS: Preset[] = [
  {
    key: "classico",
    rotulo: "Rede de cabos",
    arestas: [E(0, 1, 4), E(0, 3, 1), E(1, 2, 3), E(1, 4, 7), E(3, 4, 2), E(2, 5, 5), E(4, 5, 6), E(1, 3, 8), E(2, 4, 9)],
    dica: "Cada aresta é o custo de puxar um cabo. A MST é o jeito mais barato de deixar todo mundo conectado.",
  },
  {
    key: "empate",
    rotulo: "Com pesos repetidos",
    arestas: [E(0, 1, 2), E(0, 3, 2), E(1, 2, 2), E(3, 4, 2), E(2, 5, 3), E(4, 5, 3), E(1, 4, 5)],
    dica: "Vários pesos iguais: Kruskal e Prim podem escolher arestas DIFERENTES e ainda assim chegar ao mesmo peso total.",
  },
  {
    key: "caro",
    rotulo: "Uma ponte cara e obrigatória",
    arestas: [E(0, 1, 1), E(1, 3, 2), E(0, 3, 2), E(2, 5, 1), E(2, 4, 2), E(4, 5, 2), E(1, 2, 20)],
    dica: "Dois grupos baratos ligados por uma única aresta de peso 20. Ela é horrível e entra assim mesmo: sem ela o grafo se parte.",
  },
];

type Modo = "kruskal" | "prim";

const CODIGO: Record<Modo, string[]> = {
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

type Passo = {
  aresta: Aresta | null;
  escolhidas: number[];      // índices em arestasOrdenadas / arestas
  rejeitadas: number[];
  componente: number[];      // cor de cada vértice
  dentro: number[];
  total: number;
  linha: number;
  nota: string;
  ok?: boolean;
};

function gerarPassos(arestasIn: Aresta[], modo: Modo): Passo[] {
  const V = ROT.length;
  const out: Passo[] = [];

  if (modo === "kruskal") {
    const arestas = [...arestasIn].sort((x, y) => x.peso - y.peso);
    const pai = Array.from({ length: V }, (_, i) => i);
    const acha = (x: number): number => { while (pai[x] !== x) { pai[x] = pai[pai[x]]; x = pai[x]; } return x; };
    const escolhidas: number[] = [];
    const rejeitadas: number[] = [];
    let total = 0;
    const comp = () => ROT.map((_, i) => acha(i));
    const snap = (aresta: Aresta | null, linha: number, nota: string, extra: Partial<Passo> = {}): Passo =>
      ({ aresta, escolhidas: [...escolhidas], rejeitadas: [...rejeitadas], componente: comp(), dentro: [], total, linha, nota, ...extra });

    out.push(snap(null, 1, `Kruskal começa ordenando TODAS as arestas por peso: ${arestas.map((e) => e.peso).join(", ")}. A partir daqui é só percorrer essa lista de cima para baixo, e a única decisão é aceitar ou recusar.`));

    for (let i = 0; i < arestas.length; i++) {
      const e = arestas[i];
      const ra = acha(e.a), rb = acha(e.b);
      if (ra === rb) {
        rejeitadas.push(i);
        out.push(snap(e, 12, `${ROT[e.a]} e ${ROT[e.b]} já estão no mesmo grupo (mesma cor). Aceitar a aresta de peso ${e.peso} fecharia um ciclo, e ciclo não acrescenta conexão nenhuma. Recuso.`));
      } else {
        pai[ra] = rb;
        escolhidas.push(i);
        total += e.peso;
        out.push(snap(e, 13, `${ROT[e.a]} e ${ROT[e.b]} estão em grupos diferentes: a aresta de peso ${e.peso} conecta duas partes que estavam soltas. Aceito, e os dois grupos viram um só. Total: ${total}.`));
      }
      if (escolhidas.length === V - 1) break;
    }
    out.push(snap(null, 15, `MST completa com ${escolhidas.length} arestas (sempre V-1 = ${V - 1}) e peso total ${total}. Repare que a árvore foi crescendo em pedaços soltos, que só no fim viraram uma coisa só.`, { ok: true }));
    return out;
  }

  // Prim
  const adj: { v: number; peso: number; idx: number }[][] = ROT.map(() => []);
  arestasIn.forEach((e, i) => { adj[e.a].push({ v: e.b, peso: e.peso, idx: i }); adj[e.b].push({ v: e.a, peso: e.peso, idx: i }); });
  const dentro = new Set<number>([0]);
  const escolhidas: number[] = [];
  const rejeitadas: number[] = [];
  let total = 0;
  let fila: { peso: number; u: number; v: number; idx: number }[] = adj[0].map((x) => ({ peso: x.peso, u: 0, v: x.v, idx: x.idx }));
  const snap = (aresta: Aresta | null, linha: number, nota: string, extra: Partial<Passo> = {}): Passo =>
    ({ aresta, escolhidas: [...escolhidas], rejeitadas: [...rejeitadas], componente: ROT.map((_, i) => (dentro.has(i) ? 0 : i + 1)), dentro: [...dentro], total, linha, nota, ...extra });

  out.push(snap(null, 3, `Prim começa com um vértice só, ${ROT[0]}, e vai fazer a árvore CRESCER. A fila guarda as arestas que saem da árvore para fora dela: ${fila.map((f) => `${ROT[f.u]}${ROT[f.v]}:${f.peso}`).join(", ")}.`));

  let guarda = 0;
  while (fila.length && dentro.size < V && guarda++ < 300) {
    fila.sort((x, y) => x.peso - y.peso);
    const f = fila.shift() as { peso: number; u: number; v: number; idx: number };
    if (dentro.has(f.v)) {
      rejeitadas.push(f.idx);
      out.push(snap(arestasIn[f.idx], 9, `A aresta ${ROT[f.u]}-${ROT[f.v]} (peso ${f.peso}) era a mais barata da fila, mas ${ROT[f.v]} já entrou na árvore por outro caminho. Descarto: pegá-la faria ciclo.`));
      continue;
    }
    dentro.add(f.v);
    escolhidas.push(f.idx);
    total += f.peso;
    out.push(snap(arestasIn[f.idx], 11, `A mais barata que sai da árvore é ${ROT[f.u]}-${ROT[f.v]}, peso ${f.peso}. ${ROT[f.v]} entra na árvore. Total: ${total}. A árvore nunca se parte: ela é sempre uma peça só, crescendo.`));
    for (const x of adj[f.v]) {
      if (!dentro.has(x.v)) fila.push({ peso: x.peso, u: f.v, v: x.v, idx: x.idx });
    }
  }
  out.push(snap(null, 13, `MST completa com ${escolhidas.length} arestas e peso total ${total}. O caminho foi outro, o resultado é o mesmo número.`, { ok: true }));
  return out;
}

const CORES = ["#3b82f6", "#a78bfa", "#6ee7b7", "#fcd34d", "#f472b6", "#22d3ee"];
const VELOCIDADES = [0, 1500, 1000, 700, 450, 260];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

export function MstVisualizer() {
  const [presetKey, setPresetKey] = useState("classico");
  const [modo, setModo] = useState<Modo>("kruskal");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(4);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);
  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const arestasOrdenadas = useMemo(() => [...preset.arestas].sort((x, y) => x.peso - y.peso), [preset]);
  const passos = useMemo(() => gerarPassos(preset.arestas, modo), [preset, modo]);
  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];

  const totais = useMemo(() => ({
    kruskal: gerarPassos(preset.arestas, "kruskal").slice(-1)[0].total,
    prim: gerarPassos(preset.arestas, "prim").slice(-1)[0].total,
  }), [preset]);

  const parar = useCallback(() => { if (timer.current) { clearInterval(timer.current); timer.current = null; } }, []);
  useEffect(() => () => parar(), [parar]);
  useEffect(() => {
    parar();
    if (!tocando) return;
    timer.current = setInterval(() => setPasso((s) => (s >= total - 1 ? s : s + 1)), VELOCIDADES[velocidade]);
    return parar;
  }, [tocando, velocidade, total, parar]);
  useEffect(() => { if (tocando && idx >= total - 1) setTocando(false); }, [tocando, idx, total]);
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const reiniciar = () => { parar(); setTocando(false); setPasso(0); };
  const lista = modo === "kruskal" ? arestasOrdenadas : preset.arestas;
  const escolhidas = useMemo(() => new Set(p.escolhidas), [p.escolhidas]);
  const rejeitadas = useMemo(() => new Set(p.rejeitadas), [p.rejeitadas]);
  const pct = Math.round(((idx + 1) / total) * 100);

  const corDe = (i: number) => (modo === "prim"
    ? (p.dentro.includes(i) ? CORES[0] : "#3d4c61")
    : CORES[p.componente[i] % CORES.length]);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · Kruskal e Prim no mesmo grafo</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">peso {p.total} · passo {idx + 1} de {total}</span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>{expanded ? "✕ Fechar" : "⤢ Expandir"}</button>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          <button className={`bigo-chip${modo === "kruskal" ? " on" : ""}`} onClick={() => { reiniciar(); setModo("kruskal"); }} aria-pressed={modo === "kruskal"}>Kruskal: ordena arestas</button>
          <button className={`bigo-chip${modo === "prim" ? " on" : ""}`} onClick={() => { reiniciar(); setModo("prim"); }} aria-pressed={modo === "prim"}>Prim: cresce de um vértice</button>
        </div>
        <div className="bigo-chips" style={{ marginTop: 2 }}>
          {PRESETS.map((pr) => (
            <button key={pr.key} className={`bigo-chip${presetKey === pr.key ? " on" : ""}`} onClick={() => { reiniciar(); setPresetKey(pr.key); }} aria-pressed={presetKey === pr.key}>{pr.rotulo}</button>
          ))}
        </div>
        <p className="tt-legenda-arvore">{preset.dica}</p>

        <div className="gr-split">
          <div className="tt-arv-wrap" style={{ margin: 0 }}>
            <svg className="tt-arv" width={330} height={230} viewBox="0 0 330 230" role="img"
              aria-label={`Grafo com pesos. ${modo === "kruskal" ? "Kruskal" : "Prim"}, peso acumulado ${p.total}. ${p.nota}`}>
              {preset.arestas.map((e, i) => {
                const idxLista = modo === "kruskal" ? arestasOrdenadas.indexOf(e) : i;
                const naMst = escolhidas.has(idxLista);
                const rej = rejeitadas.has(idxLista);
                const ativa = p.aresta === e;
                const mx = (POS[e.a].x + POS[e.b].x) / 2, my = (POS[e.a].y + POS[e.b].y) / 2;
                return (
                  <g key={`${e.a}-${e.b}`}>
                    <line className={`tt-aresta${naMst ? " mst" : rej ? " rejeitada" : ativa ? " ativa" : ""}`}
                      x1={POS[e.a].x} y1={POS[e.a].y} x2={POS[e.b].x} y2={POS[e.b].y} />
                    <text className="gr-peso" x={mx} y={my - 3} textAnchor="middle">{e.peso}</text>
                  </g>
                );
              })}
              {ROT.map((r, i) => (
                <g key={r} className="tt-no mst-no">
                  <circle cx={POS[i].x} cy={POS[i].y} r={16} style={{ fill: corDe(i) + "44", stroke: corDe(i) }} />
                  <text x={POS[i].x} y={POS[i].y + 4} textAnchor="middle">{r}</text>
                </g>
              ))}
            </svg>
          </div>

          <div className="gr-painel">
            <div className="tt-painel-tit">
              {modo === "kruskal" ? "Arestas ordenadas por peso" : "Arestas do grafo"}{" "}
              <em>{modo === "kruskal" ? "percorridas de cima para baixo" : "Prim escolhe pela fronteira"}</em>
            </div>
            <div className="mst-lista">
              {lista.map((e, i) => (
                <span key={`${e.a}-${e.b}`} className={`mst-item${escolhidas.has(i) ? " ok" : rejeitadas.has(i) ? " rej" : ""}`}>
                  {ROT[e.a]}{ROT[e.b]} <b>{e.peso}</b>
                </span>
              ))}
            </div>
            <p className="bt-array-nota" style={{ marginTop: 10 }}>
              {modo === "kruskal"
                ? "Verde entrou na MST, riscada foi recusada por formar ciclo. O union-find é quem responde 'já estão no mesmo grupo?' em tempo quase constante."
                : "Prim não ordena a lista inteira: ele mantém só as arestas que saem da árvore atual, numa fila de prioridade."}
            </p>
          </div>
        </div>

        <p className={"viz-note" + (p.ok ? " ok" : "")}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">{modo}.py</div>
            <div className="viz-code-body">
              {CODIGO[modo].map((txt, i) => (
                <div key={i} className={`viz-line${i === p.linha ? " on" : ""}`}><span className="ln">{i + 1}</span>{txt}</div>
              ))}
            </div>
          </div>
          <div className="viz-vars">
            <div className="viz-vars-head">No mesmo grafo</div>
            <div className="viz-var"><span className="viz-var-name">Kruskal</span><span className={`viz-var-val${modo === "kruskal" ? " best" : ""}`}>peso {totais.kruskal}</span></div>
            <div className="viz-var"><span className="viz-var-name">Prim</span><span className={`viz-var-val${modo === "prim" ? " best" : ""}`}>peso {totais.prim}</span></div>
            <div className="viz-var"><span className="viz-var-name">arestas na MST</span><span className="viz-var-val">{p.escolhidas.length} de {ROT.length - 1}</span></div>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Rode os dois no mesmo preset e compare o peso final: é sempre igual. No preset com pesos
          repetidos eles chegam a escolher arestas diferentes, e mesmo assim o total bate. Duas MSTs
          do mesmo grafo podem ser diferentes; o peso, não.
        </p>
      </div>
    </figure>
  );

  if (expanded && mounted) {
    return createPortal(
      <div className="viz-overlay" onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false); }}>{viz}</div>,
      document.body
    );
  }
  return viz;
}
