"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

const ROT = ["A", "B", "C", "D", "E"];
const POS = [
  { x: 40, y: 120 },
  { x: 140, y: 40 },
  { x: 140, y: 200 },
  { x: 250, y: 40 },
  { x: 250, y: 200 },
];

type Aresta = { de: number; para: number; peso: number };
const A = (de: number, para: number, peso: number): Aresta => ({ de, para, peso });

type Preset = { key: string; rotulo: string; arestas: Aresta[]; dica: string };

const PRESETS: Preset[] = [
  {
    key: "negativo",
    rotulo: "Com peso negativo (funciona)",
    arestas: [A(0, 1, 6), A(0, 2, 7), A(1, 3, 5), A(1, 2, 8), A(2, 3, -3), A(2, 4, 9), A(3, 4, 7), A(1, 4, -4)],
    dica: "Onde o Dijkstra erraria. Bellman-Ford não fecha ninguém, então uma aresta negativa descoberta tarde ainda consegue corrigir tudo.",
  },
  {
    key: "ciclo",
    rotulo: "Ciclo negativo (detecta)",
    arestas: [A(0, 1, 4), A(1, 2, -6), A(2, 3, 3), A(3, 1, 1), A(0, 4, 5), A(2, 4, 2)],
    dica: "O ciclo B → C → D → B soma -6 + 3 + 1 = -2. Dar mais uma volta sempre barateia, então o mínimo não existe. A rodada extra prova isso.",
  },
  {
    key: "positivo",
    rotulo: "Só pesos positivos",
    arestas: [A(0, 1, 4), A(0, 2, 2), A(2, 1, 1), A(1, 3, 5), A(2, 4, 8), A(3, 4, 2)],
    dica: "Aqui o Dijkstra daria a mesma resposta, muito mais rápido. Bellman-Ford é o plano B, não o plano A.",
  },
];

const CODIGO = [
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

type Passo = {
  rodada: number;
  aresta: Aresta | null;
  dist: (number | null)[];
  historico: (number | null)[][];
  melhorou: boolean;
  linha: number;
  nota: string;
  ok?: boolean;
  alerta?: boolean;
};

function gerarPassos(arestas: Aresta[]): Passo[] {
  const V = ROT.length;
  const dist: (number | null)[] = ROT.map(() => null);
  dist[0] = 0;
  const historico: (number | null)[][] = [[...dist]];
  const out: Passo[] = [];
  const snap = (rodada: number, aresta: Aresta | null, melhorou: boolean, linha: number, nota: string, extra: Partial<Passo> = {}): Passo => ({
    rodada, aresta, dist: [...dist], historico: historico.map((h) => [...h]), melhorou, linha, nota, ...extra,
  });

  out.push(snap(0, null, false, 2, `${ROT[0]} vale 0 e todo o resto vale infinito. Bellman-Ford não tem fila nem escolha: ele vai relaxar todas as ${arestas.length} arestas, ${V - 1} vezes seguidas.`));

  for (let r = 1; r <= V - 1; r++) {
    let mudouNaRodada = false;
    for (const a of arestas) {
      const du = dist[a.de];
      if (du === null) {
        out.push(snap(r, a, false, 6, `Rodada ${r}: ainda não sei chegar em ${ROT[a.de]}, então a aresta ${ROT[a.de]} → ${ROT[a.para]} não me diz nada por enquanto. Numa rodada futura ela vai valer.`));
        continue;
      }
      const novo = du + a.peso;
      const atual = dist[a.para];
      if (atual === null || novo < atual) {
        dist[a.para] = novo;
        mudouNaRodada = true;
        out.push(snap(r, a, true, 7, `Rodada ${r}: relaxo ${ROT[a.de]} → ${ROT[a.para]}. ${du} ${a.peso < 0 ? "-" : "+"} ${Math.abs(a.peso)} = ${novo}, melhor que ${atual === null ? "infinito" : atual}. Atualizo.`));
      } else {
        out.push(snap(r, a, false, 6, `Rodada ${r}: testo ${ROT[a.de]} → ${ROT[a.para]}: ${du} ${a.peso < 0 ? "-" : "+"} ${Math.abs(a.peso)} = ${novo}, que não bate os ${atual} que já tenho. Sigo.`));
      }
    }
    historico.push([...dist]);
    out.push(snap(r, null, mudouNaRodada, 4,
      mudouNaRodada
        ? `Fim da rodada ${r}. Garantia do algoritmo: todo caminho mínimo que usa até ${r} ${r === 1 ? "aresta" : "arestas"} já está correto na tabela. A informação anda exatamente uma aresta por rodada.`
        : `Fim da rodada ${r} e nada mudou. Se uma rodada inteira não melhora nada, nenhuma próxima vai: dá para parar aqui, e é assim que a otimização por early exit funciona.`));
    if (!mudouNaRodada) break;
  }

  // Rodada extra: detecção de ciclo negativo.
  //
  // Os dois lados precisam ser numéricos antes de comparar. Com `null` no
  // destino, o JavaScript coage para 0 e qualquer peso negativo viraria falso
  // positivo. Hoje isso não acontece (se a origem da aresta é alcançável, o
  // destino também foi relaxado nas rodadas anteriores), mas depender dessa
  // sutileza para não reportar ciclo inexistente é frágil demais.
  let culpada: Aresta | null = null;
  for (const a of arestas) {
    const du = dist[a.de];
    const dv = dist[a.para];
    if (du === null || dv === null) continue; // só compara número com número
    if (du + a.peso < dv) { culpada = a; break; }
  }

  if (culpada) {
    out.push(snap(V, culpada, true, 10,
      `RODADA EXTRA: a aresta ${ROT[culpada.de]} → ${ROT[culpada.para]} AINDA melhora, depois de ${V - 1} rodadas. Isso é impossível num grafo sadio, porque nenhum caminho mínimo usa mais de ${V - 1} arestas. A única explicação é ciclo negativo: dar mais uma volta barateia para sempre, e o mínimo não existe.`,
      { alerta: true }));
  } else {
    const resumo = ROT.map((r, i) => `${r}=${dist[i] === null ? "∞" : dist[i]}`).join("  ");
    out.push(snap(V, null, false, 12,
      `RODADA EXTRA: nenhuma aresta melhora, então não existe ciclo negativo e a resposta é final. Distâncias a partir de ${ROT[0]}: ${resumo}.`,
      { ok: true }));
  }
  return out;
}

const VELOCIDADES = [0, 1200, 800, 550, 350, 200];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

export function BellmanFordVisualizer() {
  const [presetKey, setPresetKey] = useState("negativo");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(4);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);
  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const passos = useMemo(() => gerarPassos(preset.arestas), [preset]);
  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];

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
  const pct = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · Bellman-Ford, rodada a rodada, a partir de A</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">rodada {p.rodada} · passo {idx + 1} de {total}</span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>{expanded ? "✕ Fechar" : "⤢ Expandir"}</button>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button key={pr.key} className={`bigo-chip${presetKey === pr.key ? " on" : ""}${pr.key === "ciclo" ? " na" : ""}`} onClick={() => { reiniciar(); setPresetKey(pr.key); }} aria-pressed={presetKey === pr.key}>
              {pr.rotulo}
            </button>
          ))}
        </div>
        <p className="tt-legenda-arvore">{preset.dica}</p>

        <div className="gr-split">
          <div className="tt-arv-wrap" style={{ margin: 0 }}>
            <svg className="tt-arv" width={300} height={250} viewBox="0 0 300 250" role="img"
              aria-label={`Grafo dirigido com pesos. Bellman-Ford, rodada ${p.rodada}. ${p.nota}`}>
              <defs>
                <marker id="seta-bf" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 8 4 L 0 8 z" fill="rgba(59,130,246,0.75)" />
                </marker>
              </defs>
              {preset.arestas.map((a) => {
                const ativa = p.aresta && p.aresta.de === a.de && p.aresta.para === a.para;
                const dx = POS[a.para].x - POS[a.de].x, dy = POS[a.para].y - POS[a.de].y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1, r = 19;
                const mx = (POS[a.de].x + POS[a.para].x) / 2, my = (POS[a.de].y + POS[a.para].y) / 2;
                return (
                  <g key={`${a.de}-${a.para}`}>
                    <line className={`tt-aresta${ativa ? (p.alerta ? " erro" : " ativa") : ""}`}
                      x1={POS[a.de].x + (dx / d) * r} y1={POS[a.de].y + (dy / d) * r}
                      x2={POS[a.para].x - (dx / d) * r} y2={POS[a.para].y - (dy / d) * r}
                      markerEnd="url(#seta-bf)" />
                    <text className={`gr-peso${a.peso < 0 ? " neg" : ""}`} x={mx} y={my - 4} textAnchor="middle">{a.peso}</text>
                  </g>
                );
              })}
              {ROT.map((r, i) => {
                const ativo = !!p.aresta && (p.aresta.de === i || p.aresta.para === i);
                return (
                  <g key={r} className={`tt-no${ativo ? " on" : p.dist[i] !== null ? " saiu" : ""}`}>
                    <circle cx={POS[i].x} cy={POS[i].y} r={17} />
                    <text x={POS[i].x} y={POS[i].y + 4} textAnchor="middle">{r}</text>
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
                  {ROT.map((r) => <th key={r}>{r}</th>)}
                </tr>
              </thead>
              <tbody>
                {p.historico.map((linha, r) => (
                  <tr key={r} className={r === p.historico.length - 1 ? "on" : undefined}>
                    <th>{r === 0 ? "início" : r}</th>
                    {linha.map((v, i) => {
                      const anterior = r > 0 ? p.historico[r - 1][i] : null;
                      const mudou = r > 0 && v !== anterior;
                      return <td key={i} className={`bf-cel${mudou ? " mudou" : ""}${v === null ? " inf" : ""}`}>{v === null ? "∞" : v}</td>;
                    })}
                  </tr>
                ))}
                <tr className="on">
                  <th>agora</th>
                  {p.dist.map((v, i) => <td key={i} className={`bf-cel${v === null ? " inf" : ""}`}>{v === null ? "∞" : v}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p className={"viz-note" + (p.ok ? " ok" : p.alerta ? " invalid" : "")}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">bellman_ford.py</div>
            <div className="viz-code-body">
              {CODIGO.map((txt, i) => (
                <div key={i} className={`viz-line${i === p.linha ? " on" : ""}`}><span className="ln">{i + 1}</span>{txt}</div>
              ))}
            </div>
          </div>
          <div className="viz-vars">
            <div className="viz-vars-head">Variáveis</div>
            <div className="viz-var"><span className="viz-var-name">rodada</span><span className="viz-var-val best">{p.rodada} de {ROT.length - 1}</span></div>
            <div className="viz-var"><span className="viz-var-name">arestas por rodada</span><span className="viz-var-val">{preset.arestas.length}</span></div>
            <div className="viz-var"><span className="viz-var-name">relaxamentos totais</span><span className="viz-var-val">{(ROT.length - 1) * preset.arestas.length}</span></div>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Olhe a tabela de rodadas de cima para baixo: cada linha corrige os caminhos que usam mais
          uma aresta que a anterior. Como nenhum caminho mínimo usa mais de V-1 arestas, V-1 rodadas
          bastam, e é literalmente daí que sai o número.
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
