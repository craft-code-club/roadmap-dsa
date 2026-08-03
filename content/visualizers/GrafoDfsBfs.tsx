"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
// ---------------------------------------------------------------------------

const ROT = ["A", "B", "C", "D", "E", "F", "G"];
const POS = [
  { x: 40, y: 40 },
  { x: 150, y: 40 },
  { x: 260, y: 40 },
  { x: 95, y: 140 },
  { x: 205, y: 140 },
  { x: 150, y: 240 },
  { x: 265, y: 240 },
];

type Preset = { key: string; rotulo: string; arestas: [number, number][]; dica: string };

const PRESETS: Preset[] = [
  {
    key: "ciclo",
    rotulo: "Com ciclo",
    arestas: [[0, 1], [0, 3], [1, 2], [1, 4], [3, 4], [3, 5], [4, 6], [5, 6], [2, 4]],
    dica: "Tem mais de um caminho entre vários pares. É onde a diferença entre DFS e BFS aparece, e onde o conjunto de visitados vira obrigatório.",
  },
  {
    key: "arvore",
    rotulo: "Sem ciclo (é uma árvore)",
    arestas: [[0, 1], [0, 3], [1, 2], [3, 4], [3, 5], [4, 6]],
    dica: "Grafo conexo sem ciclo é exatamente uma árvore. Aqui os dois percursos viram os da árvore, e o conjunto de visitados fica supérfluo.",
  },
  {
    key: "desconexo",
    rotulo: "Desconexo",
    arestas: [[0, 1], [1, 2], [3, 4], [4, 6], [5, 6]],
    dica: "Dois componentes separados. Partindo de A você nunca alcança D, E, F, G: um percurso só não cobre o grafo inteiro.",
  },
];

const CODIGO = {
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

type Modo = "dfs" | "bfs";

type Passo = {
  no: number;
  aux: number[];
  visitados: number[];
  ordem: number[];
  dist: (number | null)[];
  aresta: [number, number] | null;
  linha: number;
  nota: string;
  ok?: boolean;
};

function adjacencia(arestas: [number, number][]): number[][] {
  const g: number[][] = ROT.map(() => []);
  for (const [a, b] of arestas) { g[a].push(b); g[b].push(a); }
  for (const l of g) l.sort((x, y) => x - y);
  return g;
}

function gerarPassos(arestas: [number, number][], modo: Modo, inicio: number): Passo[] {
  const g = adjacencia(arestas);
  const out: Passo[] = [];
  const visitados = new Set<number>([inicio]);
  const dist: (number | null)[] = ROT.map(() => null);
  dist[inicio] = 0;
  const ordem: number[] = [];
  const aux: number[] = [inicio];

  const snap = (no: number, linha: number, nota: string, aresta: [number, number] | null = null, ok = false): Passo => ({
    no, aux: [...aux], visitados: [...visitados], ordem: [...ordem], dist: [...dist], aresta, linha, nota, ok,
  });

  out.push(snap(inicio, 2, `Começo em ${ROT[inicio]}. Já marco a origem como visitada antes do laço: em grafo, "visitado" não é enfeite, é o que impede o percurso de girar em ciclo para sempre.`));

  let guarda = 0;
  while (aux.length && guarda++ < 300) {
    const u = modo === "dfs" ? (aux.pop() as number) : (aux.shift() as number);
    ordem.push(u);
    out.push(snap(u, 4, modo === "dfs"
      ? `Tiro ${ROT[u]} do TOPO da pilha. Pilha devolve o último que entrou, então eu sempre continuo pelo ramo mais recente: o percurso afunda.`
      : `Tiro ${ROT[u]} da FRENTE da fila, a ${dist[u]} ${dist[u] === 1 ? "aresta" : "arestas"} da origem. Fila devolve o mais antigo, então eu só desço de nível depois de esgotar o atual.`));

    for (const v of g[u]) {
      if (visitados.has(v)) {
        out.push(snap(u, 7, `${ROT[v]} é vizinho de ${ROT[u]}, mas já está em visitados: ignoro. Sem esta linha, este grafo com ciclo travaria o programa.`, [u, v]));
        continue;
      }
      visitados.add(v);
      dist[v] = (dist[u] ?? 0) + 1;
      aux.push(v);
      out.push(snap(v, 9,
        modo === "dfs"
          ? `${ROT[v]} é novo: marco como visitado e empilho. Ele vai ser o próximo a sair, na frente de qualquer coisa que já estivesse na pilha.`
          : `${ROT[v]} é novo: marco como visitado JÁ e enfileiro, com distância ${dist[v]}. Marcar ao enfileirar (e não ao processar) é o que impede o mesmo vértice de entrar duas vezes na fila.`,
        [u, v]));
    }
  }

  const alcancados = ordem.length;
  const faltaram = ROT.length - alcancados;
  out.push(snap(-1, 3,
    `${modo === "dfs" ? "DFS" : "BFS"} terminou: ${ordem.map((i) => ROT[i]).join(", ")}. ${
      faltaram > 0
        ? `Alcancei ${alcancados} de ${ROT.length} vértices: os outros ${faltaram} estão em outro componente, e para cobrir o grafo inteiro seria preciso reiniciar o percurso a partir de um vértice ainda não visitado.`
        : modo === "bfs"
          ? `A coluna de distância é o prêmio: cada valor é o MENOR número de arestas da origem até o vértice. O DFS visita os mesmos vértices e não te dá isso.`
          : `Visitei os mesmos vértices que o BFS visitaria, mas em outra ordem, e sem nenhuma garantia sobre distância.`
    }`, null, true));
  return out;
}

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

export function GrafoDfsBfs() {
  const [presetKey, setPresetKey] = useState("ciclo");
  const [modo, setModo] = useState<Modo>("bfs");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(4);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const passos = useMemo(() => gerarPassos(preset.arestas, modo, 0), [preset, modo]);
  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];

  const parar = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  }, []);
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
  const visitados = useMemo(() => new Set(p.visitados), [p.visitados]);
  const processados = useMemo(() => new Set(p.ordem), [p.ordem]);
  const pctPasso = Math.round(((idx + 1) / total) * 100);
  const picoAux = useMemo(() => passos.reduce((m, q) => Math.max(m, q.aux.length), 0), [passos]);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · DFS e BFS no mesmo grafo, a partir de A</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">passo {idx + 1} de {total}</span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "✕ Fechar" : "⤢ Expandir"}
          </button>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          <button className={`bigo-chip${modo === "bfs" ? " on" : ""}`} onClick={() => { reiniciar(); setModo("bfs"); }} aria-pressed={modo === "bfs"}>
            BFS (fila)
          </button>
          <button className={`bigo-chip${modo === "dfs" ? " on" : ""}`} onClick={() => { reiniciar(); setModo("dfs"); }} aria-pressed={modo === "dfs"}>
            DFS (pilha)
          </button>
        </div>
        <div className="bigo-chips" style={{ marginTop: 2 }}>
          {PRESETS.map((pr) => (
            <button key={pr.key} className={`bigo-chip${presetKey === pr.key ? " on" : ""}`} onClick={() => { reiniciar(); setPresetKey(pr.key); }} aria-pressed={presetKey === pr.key}>
              {pr.rotulo}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">{preset.dica}</p>

        <div className="gr-split">
          <div className="tt-arv-wrap" style={{ margin: 0 }}>
            <svg
              className="tt-arv" width={305} height={285} viewBox="0 0 305 285"
              role="img"
              aria-label={`Grafo com 7 vértices. ${modo === "bfs" ? "BFS" : "DFS"} a partir de A, passo ${idx + 1} de ${total}. ${p.nota}`}
            >
              {preset.arestas.map(([a, b]) => {
                const emUso = p.aresta && ((p.aresta[0] === a && p.aresta[1] === b) || (p.aresta[0] === b && p.aresta[1] === a));
                const usada = processados.has(a) && processados.has(b);
                return (
                  <line
                    key={`${a}-${b}`}
                    className={`tt-aresta${emUso ? " ativa" : usada ? " on" : ""}`}
                    x1={POS[a].x} y1={POS[a].y} x2={POS[b].x} y2={POS[b].y}
                  />
                );
              })}
              {ROT.map((r, i) => {
                const cls = ["tt-no"];
                if (i === p.no) cls.push("on");
                else if (processados.has(i)) cls.push("saiu");
                else if (visitados.has(i)) cls.push("aux");
                return (
                  <g key={r} className={cls.join(" ")}>
                    <circle cx={POS[i].x} cy={POS[i].y} r={17} />
                    <text x={POS[i].x} y={POS[i].y + 4} textAnchor="middle">{r}</text>
                    {modo === "bfs" && p.dist[i] !== null && (
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
                {modo === "dfs" ? "Pilha" : "Fila"} <em>{modo === "dfs" ? "sai o último (LIFO)" : "sai o primeiro (FIFO)"}</em>
              </div>
              <div className="tt-aux">
                {p.aux.length === 0 ? <span className="tt-vazio">vazia</span> : p.aux.map((id, i) => (
                  <span key={`${id}-${i}`} className={`tt-aux-item${(modo === "dfs" ? i === p.aux.length - 1 : i === 0) ? " topo" : ""}`}>{ROT[id]}</span>
                ))}
              </div>
            </div>
            <div className="tt-painel">
              <div className="tt-painel-tit">Ordem de processamento</div>
              <div className="tt-saida">
                {p.ordem.length === 0 ? <span className="tt-vazio">nada ainda</span> : p.ordem.map((id, i) => (
                  <span key={`${id}-${i}`} className={`tt-saida-item${i === p.ordem.length - 1 ? " novo" : ""}`}>{ROT[id]}</span>
                ))}
              </div>
            </div>
            <div className="tt-painel">
              <div className="tt-painel-tit">
                Distância da origem <em>{modo === "bfs" ? "mínima, em arestas" : "o DFS não garante mínima"}</em>
              </div>
              <div className="gr-dists">
                {ROT.map((r, i) => (
                  <span key={r} className={`gr-dist-item${p.dist[i] === null ? " off" : ""}`}>
                    <i>{r}</i>{p.dist[i] === null ? "∞" : p.dist[i]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className={"viz-note" + (p.ok ? " ok" : "")}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">{modo}.py</div>
            <div className="viz-code-body">
              {CODIGO[modo].map((txt, i) => (
                <div key={i} className={`viz-line${i === p.linha ? " on" : ""}`}>
                  <span className="ln">{i + 1}</span>{txt}
                </div>
              ))}
            </div>
          </div>
          <div className="viz-vars">
            <div className="viz-vars-head">Variáveis</div>
            <div className="viz-var"><span className="viz-var-name">vértice atual</span><span className="viz-var-val">{p.no >= 0 ? ROT[p.no] : "-"}</span></div>
            <div className="viz-var"><span className="viz-var-name">visitados</span><span className="viz-var-val">{p.visitados.length} de {ROT.length}</span></div>
            <div className="viz-var"><span className="viz-var-name">{modo === "dfs" ? "pilha" : "fila"}</span><span className="viz-var-val">{p.aux.length}</span></div>
            <div className="viz-var"><span className="viz-var-name">processados</span><span className="viz-var-val best">{p.ordem.length}</span></div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat"><span>vértices</span><strong>{ROT.length}</strong></div>
          <div className="bigo-stat"><span>arestas</span><strong>{preset.arestas.length}</strong></div>
          <div className="bigo-stat"><span>pico da {modo === "dfs" ? "pilha" : "fila"}</span><strong>{picoAux}</strong></div>
          <div className="bigo-stat"><span>complexidade</span><strong>O(V + E)</strong></div>
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
        <div className="viz-progress"><div className="viz-progress-fill" style={{ width: `${pctPasso}%` }} /></div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Rode o BFS até o fim e anote as distâncias. Depois rode o DFS e compare a ordem: os mesmos
          vértices são visitados, e só o BFS chega em cada um pelo caminho mais curto. Trocar
          <code> pop() </code> por <code> popleft() </code> troca o algoritmo inteiro.
        </p>
      </div>
    </figure>
  );

  if (expanded && mounted) {
    return createPortal(
      <div className="viz-overlay" onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false); }}>
        {viz}
      </div>,
      document.body
    );
  }
  return viz;
}
