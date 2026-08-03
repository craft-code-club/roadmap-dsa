"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
// ---------------------------------------------------------------------------

const ROT = ["A", "B", "C", "D", "E", "F"];
const POS = [
  { x: 40, y: 130 },
  { x: 135, y: 40 },
  { x: 135, y: 220 },
  { x: 235, y: 40 },
  { x: 235, y: 220 },
  { x: 330, y: 130 },
];

type Aresta = { de: number; para: number; peso: number };
type Preset = { key: string; rotulo: string; arestas: Aresta[]; dica: string; negativo?: boolean };

const A = (de: number, para: number, peso: number): Aresta => ({ de, para, peso });

const PRESETS: Preset[] = [
  {
    key: "classico",
    rotulo: "Grafo com pesos",
    arestas: [A(0, 1, 4), A(0, 2, 2), A(1, 3, 5), A(2, 1, 1), A(2, 4, 8), A(3, 5, 3), A(4, 5, 2), A(3, 4, 2)],
    dica: "Repare no A→B: o caminho direto custa 4, mas passar por C custa 2+1 = 3. É o relaxamento que descobre isso.",
  },
  {
    key: "armadilha",
    rotulo: "A tentação do caminho direto",
    arestas: [A(0, 1, 10), A(0, 2, 1), A(2, 3, 1), A(3, 1, 1), A(1, 5, 1), A(2, 4, 7), A(4, 5, 1)],
    dica: "A aresta A→B custa 10 e parece ruim. O desvio A→C→D→B custa 3. Guloso não quer dizer míope: Dijkstra acha o desvio.",
  },
  {
    key: "negativo",
    rotulo: "Com peso negativo (quebra)",
    // Montado para FALHAR de verdade: B fecha valendo 1, e só depois o C
    // (que fecha com 2) revela a aresta C→B de peso -2, que daria 0.
    //
    // O detalhe fino: dist[B] até é corrigido para 0, porque o relaxamento
    // escreve na tabela mesmo com o vértice fechado. O que NÃO acontece é B ser
    // reprocessado, então quem foi relaxado a partir dele (D, e por consequência
    // F) fica com valor velho. Conferido contra Bellman-Ford: D sai 4 quando o
    // correto é 3, e F sai 5 quando o correto é 4.
    arestas: [A(0, 1, 1), A(0, 2, 2), A(2, 1, -2), A(1, 3, 3), A(3, 5, 1), A(2, 4, 4), A(4, 5, 1)],
    dica: "A aresta C→B vale -2. O B fecha valendo 1 antes de ninguém ver essa aresta, e o Dijkstra nunca REPROCESSA um fechado: a tabela até corrige o B, mas D e F ficam com valor velho e a resposta final sai errada neles.",
    negativo: true,
  },
];

const CODIGO = [
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

type Passo = {
  no: number;
  aresta: [number, number] | null;
  dist: (number | null)[];
  fila: { d: number; v: number }[];
  fechados: number[];
  linha: number;
  nota: string;
  ok?: boolean;
  alerta?: boolean;
};

function gerarPassos(arestas: Aresta[], negativo: boolean): Passo[] {
  const g: { v: number; peso: number }[][] = ROT.map(() => []);
  for (const a of arestas) g[a.de].push({ v: a.para, peso: a.peso });

  const dist: (number | null)[] = ROT.map(() => null);
  dist[0] = 0;
  const fechados = new Set<number>();
  let fila: { d: number; v: number }[] = [{ d: 0, v: 0 }];
  const out: Passo[] = [];
  const snap = (no: number, linha: number, nota: string, aresta: [number, number] | null = null, extra: Partial<Passo> = {}): Passo => ({
    no, aresta, dist: [...dist], fila: [...fila].sort((x, y) => x.d - y.d), fechados: [...fechados], linha, nota, ...extra,
  });

  out.push(snap(0, 5, `Começo em ${ROT[0]} com distância 0, e todo o resto em infinito. "Infinito" quer dizer "ainda não sei chegar lá", não "é impossível".`));

  let guarda = 0;
  let quebrou = false;
  while (fila.length && guarda++ < 300) {
    fila.sort((x, y) => x.d - y.d);
    const { d, v: u } = fila.shift() as { d: number; v: number };
    if (fechados.has(u)) {
      out.push(snap(u, 9, `${ROT[u]} já está fechado, então descarto esta cópia da fila. Cópias velhas aparecem porque a gente empurra sem remover a anterior, e ignorá-las é mais barato que procurá-las.`));
      continue;
    }
    fechados.add(u);
    out.push(snap(u, 10, `Tiro o MENOR da fila: ${ROT[u]}, com ${d}. Fecho ele. A aposta do Dijkstra é esta: como todo peso é ${negativo ? "supostamente " : ""}não negativo, nenhum caminho que ainda não explorei poderia chegar em ${ROT[u]} por menos de ${d}${negativo ? ", e é exatamente essa aposta que o peso negativo quebra" : ""}.`, null, negativo ? {} : {}));

    for (const { v, peso } of g[u]) {
      const atual = dist[v];
      const novo = (d ?? 0) + peso;
      if (atual === null || novo < atual) {
        const eraFechado = fechados.has(v);
        dist[v] = novo;
        if (!eraFechado) fila.push({ d: novo, v });
        out.push(snap(v, 12,
          eraFechado
            ? `PROBLEMA: por ${ROT[u]} eu chego em ${ROT[v]} com ${novo}, melhor que os ${atual} que já estavam lá. Mas ${ROT[v]} JÁ ESTÁ FECHADO, e o Dijkstra não volta em vértice fechado. A resposta final vai sair errada.`
            : atual === null
              ? `Relaxo ${ROT[u]} → ${ROT[v]}: era infinito, agora sei chegar com ${d} + ${peso} = ${novo}. Coloco ${ROT[v]} na fila.`
              : `Relaxo ${ROT[u]} → ${ROT[v]}: ${d} + ${peso} = ${novo}, melhor que os ${atual} que eu tinha. Atualizo e reempurro na fila.`,
          [u, v],
          eraFechado ? { alerta: true } : {}));
        if (eraFechado) quebrou = true;
      } else {
        out.push(snap(v, 12, `Testo ${ROT[u]} → ${ROT[v]}: ${d} + ${peso} = ${novo}, que não é melhor que os ${atual} que já tenho. Não mexo em nada.`, [u, v]));
      }
    }
  }

  const resumo = ROT.map((r, i) => `${r}=${dist[i] === null ? "∞" : dist[i]}`).join("  ");
  out.push(snap(-1, 7,
    quebrou
      ? `Terminou com ${resumo}. Só que a execução passou por um vértice já fechado que melhorou depois: o resultado NÃO é confiável. Com peso negativo, a hipótese do Dijkstra cai, e o algoritmo certo é Bellman-Ford.`
      : `Terminou. Distâncias mínimas a partir de ${ROT[0]}: ${resumo}. Cada vértice fechou uma vez só, e nenhum precisou ser revisitado.`,
    null, quebrou ? { alerta: true } : { ok: true }));
  return out;
}

const VELOCIDADES = [0, 1500, 1000, 700, 450, 260];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

export function DijkstraVisualizer() {
  const [presetKey, setPresetKey] = useState("classico");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(4);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);
  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const passos = useMemo(() => gerarPassos(preset.arestas, !!preset.negativo), [preset]);
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
  const fechados = useMemo(() => new Set(p.fechados), [p.fechados]);
  const naFila = useMemo(() => new Set(p.fila.map((q) => q.v)), [p.fila]);
  const pct = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · Dijkstra fechando um vértice por vez, a partir de A</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">passo {idx + 1} de {total}</span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>{expanded ? "✕ Fechar" : "⤢ Expandir"}</button>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button key={pr.key} className={`bigo-chip${presetKey === pr.key ? " on" : ""}${pr.negativo ? " na" : ""}`} onClick={() => { reiniciar(); setPresetKey(pr.key); }} aria-pressed={presetKey === pr.key}>
              {pr.rotulo}
            </button>
          ))}
        </div>
        <p className="tt-legenda-arvore">{preset.dica}</p>

        <div className="gr-split">
          <div className="tt-arv-wrap" style={{ margin: 0 }}>
            <svg className="tt-arv" width={370} height={270} viewBox="0 0 370 270" role="img"
              aria-label={`Grafo com pesos. Dijkstra a partir de A, passo ${idx + 1} de ${total}. ${p.nota}`}>
              <defs>
                <marker id="seta-dij" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 8 4 L 0 8 z" fill="rgba(59,130,246,0.75)" />
                </marker>
              </defs>
              {preset.arestas.map((a) => {
                const ativa = p.aresta && p.aresta[0] === a.de && p.aresta[1] === a.para;
                const dx = POS[a.para].x - POS[a.de].x, dy = POS[a.para].y - POS[a.de].y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1, r = 19;
                const mx = (POS[a.de].x + POS[a.para].x) / 2, my = (POS[a.de].y + POS[a.para].y) / 2;
                return (
                  <g key={`${a.de}-${a.para}`}>
                    <line className={`tt-aresta${ativa ? " ativa" : fechados.has(a.de) ? " on" : ""}`}
                      x1={POS[a.de].x + (dx / d) * r} y1={POS[a.de].y + (dy / d) * r}
                      x2={POS[a.para].x - (dx / d) * r} y2={POS[a.para].y - (dy / d) * r}
                      markerEnd="url(#seta-dij)" />
                    <text className={`gr-peso${a.peso < 0 ? " neg" : ""}`} x={mx} y={my - 4} textAnchor="middle">{a.peso}</text>
                  </g>
                );
              })}
              {ROT.map((r, i) => {
                const cls = ["tt-no"];
                if (i === p.no) cls.push("on");
                else if (fechados.has(i)) cls.push("saiu");
                else if (naFila.has(i)) cls.push("aux");
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
                {ROT.map((r, i) => (
                  <span key={r} className={`gr-dist-item${p.dist[i] === null ? " off" : ""}${fechados.has(i) ? " fechado" : ""}`}>
                    <i>{r}</i>{p.dist[i] === null ? "∞" : p.dist[i]}
                  </span>
                ))}
              </div>
            </div>
            <div className="tt-painel">
              <div className="tt-painel-tit">Fila de prioridade <em>sai sempre o menor</em></div>
              <div className="tt-aux">
                {p.fila.length === 0 ? <span className="tt-vazio">vazia</span> : p.fila.map((q, i) => (
                  <span key={`${q.v}-${i}`} className={`tt-aux-item${i === 0 ? " topo" : ""}`}>{ROT[q.v]}:{q.d}</span>
                ))}
              </div>
            </div>
            <div className="tt-painel">
              <div className="tt-painel-tit">Fechados <em>não mudam mais</em></div>
              <div className="tt-saida">
                {p.fechados.length === 0 ? <span className="tt-vazio">nenhum</span> : p.fechados.map((v, i) => (
                  <span key={v} className={`tt-saida-item${i === p.fechados.length - 1 ? " novo" : ""}`}>{ROT[v]}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className={"viz-note" + (p.ok ? " ok" : p.alerta ? " invalid" : "")}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">dijkstra.py</div>
            <div className="viz-code-body">
              {CODIGO.map((txt, i) => (
                <div key={i} className={`viz-line${i === p.linha ? " on" : ""}`}><span className="ln">{i + 1}</span>{txt}</div>
              ))}
            </div>
          </div>
          <div className="viz-vars">
            <div className="viz-vars-head">Variáveis</div>
            <div className="viz-var"><span className="viz-var-name">vértice atual</span><span className="viz-var-val">{p.no >= 0 ? ROT[p.no] : "-"}</span></div>
            <div className="viz-var"><span className="viz-var-name">fechados</span><span className="viz-var-val best">{p.fechados.length} de {ROT.length}</span></div>
            <div className="viz-var"><span className="viz-var-name">na fila</span><span className="viz-var-val">{p.fila.length}</span></div>
          </div>
        </div>

        <div className="viz-controls">
          <button className="viz-btn" title="Reiniciar" onClick={reiniciar}>↺</button>
          <button className="viz-btn" disabled={idx === 0} onClick={() => { parar(); setTocando(false); setPasso(Math.max(0, idx - 1)); }}>‹ Anterior</button>
          <button className="viz-play" onClick={() => { if (tocando) { setTocando(false); return; } setPasso(idx >= total - 1 ? 0 : idx); setTocando(true); }}>
            {tocando ? "❚❚ Pausar" : "▶ Rodar"}
          </button>
          <button className="viz-btn" disabled={idx === total - 1} onClick={() => { parar(); setTocando(false); setPasso(Math.min(idx + 1, total - 1)); }}>Próximo ›</button>
          <div className="viz-speed">
            <span>Velocidade</span>
            <input type="range" min={1} max={5} step={1} value={velocidade} onChange={(e) => setVelocidade(parseInt(e.target.value, 10))} />
            <span className="val">{ROTULOS_VEL[velocidade]}</span>
          </div>
        </div>
        <div className="viz-progress"><div className="viz-progress-fill" style={{ width: `${pct}%` }} /></div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Acompanhe a coluna dos fechados: uma vez que um vértice entra ali, o valor dele é final.
          Essa é a diferença entre Dijkstra e Bellman-Ford, e é também a razão de o peso negativo
          quebrar tudo. Rode o terceiro preset até o fim.
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
