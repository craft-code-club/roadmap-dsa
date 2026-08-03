"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
// ---------------------------------------------------------------------------

const L = 14; // colunas
const A = 9;  // linhas
const CEL = 26;

type Modo = "astar" | "dijkstra" | "guloso";

type Preset = { key: string; rotulo: string; paredes: string; dica: string };

// Mapas em texto: '#' é parede. Ler assim deixa o mapa editável de olho.
const PRESETS: Preset[] = [
  {
    key: "muro",
    rotulo: "Um muro no meio",
    dica: "O caso didático: o A* vai direto até o muro, contorna e segue. O Dijkstra explora para trás também, sem motivo.",
    paredes: [
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
    key: "labirinto",
    rotulo: "Labirinto",
    dica: "Com becos sem saída, a heurística ainda ajuda, mas menos: ela aponta para o alvo e a parede diz que não dá.",
    paredes: [
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
    key: "aberto",
    rotulo: "Campo aberto",
    dica: "Sem obstáculo nenhum, o A* praticamente desenha a linha reta e o Dijkstra abre um círculo. É a diferença no estado puro.",
    paredes: Array(A).fill(".".repeat(L)).join("\n"),
  },
];

const INICIO: [number, number] = [4, 1];
const ALVO: [number, number] = [4, 12];

const CODIGO = [
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

type Passo = {
  atual: [number, number] | null;
  fechados: string[];
  fronteira: string[];
  g: Record<string, number>;
  caminho: string[];
  nota: string;
  ok?: boolean;
};

const chave = (r: number, c: number) => `${r},${c}`;
const manhattan = (r: number, c: number) => Math.abs(r - ALVO[0]) + Math.abs(c - ALVO[1]);

function parseParedes(txt: string): boolean[][] {
  const linhas = txt.split("\n");
  return Array.from({ length: A }, (_, r) =>
    Array.from({ length: L }, (_, c) => (linhas[r]?.[c] ?? ".") === "#")
  );
}

function gerarPassos(paredes: boolean[][], modo: Modo): Passo[] {
  const out: Passo[] = [];
  const g: Record<string, number> = { [chave(...INICIO)]: 0 };
  const pai: Record<string, string> = {};
  const fechados = new Set<string>();
  let fila: { f: number; r: number; c: number }[] = [
    { f: modo === "dijkstra" ? 0 : manhattan(...INICIO), r: INICIO[0], c: INICIO[1] },
  ];

  const prioridade = (custo: number, r: number, c: number) =>
    modo === "dijkstra" ? custo : modo === "guloso" ? manhattan(r, c) : custo + manhattan(r, c);

  const snap = (atual: [number, number] | null, nota: string, caminho: string[] = [], ok = false): Passo => ({
    atual,
    fechados: [...fechados],
    fronteira: fila.map((q) => chave(q.r, q.c)),
    g: { ...g },
    caminho,
    nota,
    ok,
  });

  const nomeModo = modo === "astar" ? "A*" : modo === "dijkstra" ? "Dijkstra" : "Guloso";
  out.push(snap(INICIO, `${nomeModo}: começo na origem. ${
    modo === "dijkstra"
      ? "A prioridade é só o custo já pago (g). O algoritmo não sabe onde fica o alvo, então explora igualmente em todas as direções."
      : modo === "guloso"
        ? "A prioridade é só a estimativa até o alvo (h). Rápido, mas ele ignora o quanto já gastou, e por isso pode devolver caminho pior."
        : "A prioridade é g + h: o que já paguei mais o que estimo faltar. É essa soma que mantém o caminho ótimo e ainda aponta para o alvo."
  }`));

  let guarda = 0;
  let achou = false;
  while (fila.length && guarda++ < 4000) {
    fila.sort((x, y) => x.f - y.f);
    const { r, c } = fila.shift() as { f: number; r: number; c: number };
    const k = chave(r, c);
    if (fechados.has(k)) continue;
    fechados.add(k);

    if (r === ALVO[0] && c === ALVO[1]) {
      const caminho: string[] = [];
      let cur = k;
      while (cur) { caminho.push(cur); cur = pai[cur]; }
      achou = true;
      out.push(snap([r, c], `Cheguei ao alvo com custo ${g[k]}, depois de expandir ${fechados.size} células. ${
        modo === "guloso"
          ? "O guloso chegou rápido, mas nada garante que este seja o caminho mais barato: ele nunca olhou para o custo já pago."
          : "Este é o caminho mais barato possível, e os dois algoritmos que somam o g concordam nesse número."
      }`, caminho.reverse(), true));
      break;
    }

    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= A || nc < 0 || nc >= L || paredes[nr][nc]) continue;
      const nk = chave(nr, nc);
      const novo = g[k] + 1;
      if (g[nk] === undefined || novo < g[nk]) {
        g[nk] = novo;
        pai[nk] = k;
        fila.push({ f: prioridade(novo, nr, nc), r: nr, c: nc });
      }
    }
    // um passo por expansão, para a animação não ficar longa demais
    out.push(snap([r, c], `Expando (${r}, ${c}): g = ${g[k]}${modo !== "dijkstra" ? `, h = ${manhattan(r, c)}${modo === "astar" ? `, f = ${g[k] + manhattan(r, c)}` : ""}` : ""}. ${fechados.size} ${fechados.size === 1 ? "célula expandida" : "células expandidas"} até aqui.`));
  }

  if (!achou) {
    out.push(snap(null, `A fronteira esvaziou sem alcançar o alvo: não existe caminho neste mapa.`, [], true));
  }
  return out;
}

const VELOCIDADES = [0, 400, 240, 140, 80, 40];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

export function AStarVisualizer() {
  const [presetKey, setPresetKey] = useState("muro");
  const [modo, setModo] = useState<Modo>("astar");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(4);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);
  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const paredes = useMemo(() => parseParedes(preset.paredes), [preset]);
  const passos = useMemo(() => gerarPassos(paredes, modo), [paredes, modo]);
  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];

  // comparação honesta: roda os três no mesmo mapa e conta expansões
  const comparacao = useMemo(() => {
    return (["dijkstra", "astar", "guloso"] as Modo[]).map((m) => {
      const ps = gerarPassos(paredes, m);
      const f = ps[ps.length - 1];
      return { modo: m, expandidas: f.fechados.length, custo: f.caminho.length ? f.caminho.length - 1 : null };
    });
  }, [paredes]);

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
  const fronteira = useMemo(() => new Set(p.fronteira), [p.fronteira]);
  const caminho = useMemo(() => new Set(p.caminho), [p.caminho]);
  const pct = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · A*, Dijkstra e Guloso no mesmo mapa</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">{p.fechados.length} expandidas · passo {idx + 1} de {total}</span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>{expanded ? "✕ Fechar" : "⤢ Expandir"}</button>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          <button className={`bigo-chip${modo === "astar" ? " on" : ""}`} onClick={() => { reiniciar(); setModo("astar"); }} aria-pressed={modo === "astar"}>A*: f = g + h</button>
          <button className={`bigo-chip${modo === "dijkstra" ? " on" : ""}`} onClick={() => { reiniciar(); setModo("dijkstra"); }} aria-pressed={modo === "dijkstra"}>Dijkstra: f = g</button>
          <button className={`bigo-chip na${modo === "guloso" ? " on" : ""}`} onClick={() => { reiniciar(); setModo("guloso"); }} aria-pressed={modo === "guloso"}>Guloso: f = h</button>
        </div>
        <div className="bigo-chips" style={{ marginTop: 2 }}>
          {PRESETS.map((pr) => (
            <button key={pr.key} className={`bigo-chip${presetKey === pr.key ? " on" : ""}`} onClick={() => { reiniciar(); setPresetKey(pr.key); }} aria-pressed={presetKey === pr.key}>
              {pr.rotulo}
            </button>
          ))}
        </div>
        <p className="tt-legenda-arvore">{preset.dica}</p>

        <div className="tt-arv-wrap">
          <svg className="tt-arv" width={L * CEL + 2} height={A * CEL + 2} viewBox={`0 0 ${L * CEL + 2} ${A * CEL + 2}`}
            role="img" aria-label={`Grade ${A} por ${L}. ${p.nota}`}>
            {Array.from({ length: A }, (_, r) =>
              Array.from({ length: L }, (_, c) => {
                const k = chave(r, c);
                const ehInicio = r === INICIO[0] && c === INICIO[1];
                const ehAlvo = r === ALVO[0] && c === ALVO[1];
                let cls = "as-cel";
                if (paredes[r][c]) cls += " parede";
                else if (ehInicio) cls += " inicio";
                else if (ehAlvo) cls += " alvo";
                else if (caminho.has(k)) cls += " caminho";
                else if (p.atual && p.atual[0] === r && p.atual[1] === c) cls += " atual";
                else if (fechados.has(k)) cls += " fechado";
                else if (fronteira.has(k)) cls += " fronteira";
                return (
                  <g key={k} className={cls}>
                    <rect x={c * CEL + 1} y={r * CEL + 1} width={CEL - 2} height={CEL - 2} rx={4} />
                    {(ehInicio || ehAlvo) && (
                      <text x={c * CEL + CEL / 2} y={r * CEL + CEL / 2 + 4} textAnchor="middle">{ehInicio ? "I" : "F"}</text>
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

        <p className={"viz-note" + (p.ok ? " ok" : "")}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">a_estrela.py</div>
            <div className="viz-code-body">
              {CODIGO.map((txt, i) => (
                <div key={i} className={`viz-line${i === (modo === "astar" ? 13 : 6) ? " on" : ""}`}><span className="ln">{i + 1}</span>{txt}</div>
              ))}
            </div>
          </div>
          <div className="viz-vars">
            <div className="viz-vars-head">No mapa atual</div>
            {comparacao.map((c) => (
              <div className="viz-var" key={c.modo}>
                <span className="viz-var-name">{c.modo === "astar" ? "A*" : c.modo === "dijkstra" ? "Dijkstra" : "Guloso"}</span>
                <span className={`viz-var-val${c.modo === modo ? " best" : ""}`}>
                  {c.expandidas} células · custo {c.custo ?? "-"}
                </span>
              </div>
            ))}
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
          O painel da direita roda os três no mesmo mapa e conta. Compare duas colunas: A* e Dijkstra
          chegam com o MESMO custo, e o A* expande muito menos. O guloso expande menos ainda e é o
          único que pode devolver um caminho mais caro.
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
