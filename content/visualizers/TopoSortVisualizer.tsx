"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

const ROT = ["Álgebra", "Cálculo I", "Cálculo II", "Física", "Estatística", "ML", "Programação"];
const CURTO = ["Alg", "C1", "C2", "Fis", "Est", "ML", "Prog"];
const POS = [
  { x: 45, y: 40 },
  { x: 150, y: 40 },
  { x: 255, y: 40 },
  { x: 150, y: 130 },
  { x: 255, y: 130 },
  { x: 355, y: 85 },
  { x: 45, y: 130 },
];

type Preset = { key: string; rotulo: string; arestas: [number, number][]; dica: string };

const PRESETS: Preset[] = [
  {
    key: "curso",
    rotulo: "Pré-requisitos de um curso",
    arestas: [[0, 1], [1, 2], [0, 3], [1, 3], [2, 4], [4, 5], [6, 5], [3, 4]],
    dica: "Uma aresta A → B quer dizer 'A é pré-requisito de B'. A ordenação topológica é uma ordem válida de fazer as matérias.",
  },
  {
    key: "paralelo",
    rotulo: "Muita coisa independente",
    arestas: [[0, 1], [6, 3], [1, 2], [4, 5]],
    dica: "Vários vértices com grau de entrada zero desde o começo: existem MUITAS ordens válidas, e a fila mostra os candidatos empatados.",
  },
  {
    key: "ciclo",
    rotulo: "Com ciclo (impossível)",
    arestas: [[0, 1], [1, 2], [2, 4], [4, 1], [0, 3], [6, 5]],
    dica: "C1 → C2 → Est → C1 é um ciclo: cada um espera o outro. Não existe ordem válida, e o Kahn descobre isso sozinho.",
  },
];

// Snippet autocontido de propósito: a lista de adjacência é construída aqui
// dentro, no mesmo laço que conta o grau. Sem isso, o `adj[u]` lá embaixo
// apareceria do nada e o exemplo não rodaria se alguém copiasse.
const CODIGO = [
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

type Passo = {
  no: number;
  aresta: [number, number] | null;
  grau: number[];
  fila: number[];
  ordem: number[];
  linha: number;
  nota: string;
  ok?: boolean;
  alerta?: boolean;
};

function gerarPassos(arestas: [number, number][]): Passo[] {
  const V = ROT.length;
  const adj: number[][] = ROT.map(() => []);
  const grau = new Array(V).fill(0);
  for (const [u, v] of arestas) { adj[u].push(v); grau[v]++; }

  const fila: number[] = [];
  const ordem: number[] = [];
  const out: Passo[] = [];
  const snap = (no: number, linha: number, nota: string, aresta: [number, number] | null = null, extra: Partial<Passo> = {}): Passo =>
    ({ no, aresta, grau: [...grau], fila: [...fila], ordem: [...ordem], linha, nota, ...extra });

  // Dois passos em vez de um: a preparação faz duas coisas distintas (contar os
  // graus e montar a fila inicial), e juntá-las obrigava a nota a descrever uma
  // linha enquanto o destaque acendia a outra.
  out.push(snap(-1, 5, `Conto quantas arestas CHEGAM em cada vértice: é o grau de entrada, ou seja, quantos pré-requisitos ainda faltam para ele poder acontecer.`));
  for (let i = 0; i < V; i++) if (grau[i] === 0) fila.push(i);
  out.push(snap(-1, 7, `Agora monto a fila inicial com quem já está em zero: ${fila.map((i) => ROT[i]).join(", ") || "ninguém"}. Esses não dependem de nada e podem começar imediatamente.`));

  let guarda = 0;
  while (fila.length && guarda++ < 300) {
    const u = fila.shift() as number;
    ordem.push(u);
    // linha 10 = `u = fila.popleft()`, que é a ação que a nota descreve primeiro.
    out.push(snap(u, 10, `Tiro ${ROT[u]} da fila: o grau de entrada dele é zero, então nenhum pré-requisito está pendente. Ele entra na ordem final na posição ${ordem.length}.`));

    for (const v of adj[u]) {
      grau[v]--;
      if (grau[v] === 0) {
        fila.push(v);
        out.push(snap(v, 15, `Como ${ROT[u]} saiu, o grau de ${ROT[v]} cai para 0: o último pré-requisito dele foi cumprido. Entra na fila.`, [u, v]));
      } else {
        out.push(snap(v, 13, `Grau de ${ROT[v]} cai para ${grau[v]}: ainda faltam ${grau[v]} ${grau[v] === 1 ? "pré-requisito" : "pré-requisitos"}, então ele continua esperando.`, [u, v]));
      }
    }
  }

  if (ordem.length < V) {
    const presos = ROT.map((_, i) => i).filter((i) => !ordem.includes(i));
    out.push(snap(-1, 17,
      `A fila esvaziou com só ${ordem.length} de ${V} vértices na ordem. Os que sobraram (${presos.map((i) => ROT[i]).join(", ")}) têm grau de entrada maior que zero e ninguém mais para zerá-lo: eles dependem uns dos outros em ciclo. Não existe ordem válida, e o que sobrou É o ciclo.`,
      null, { alerta: true }));
  } else {
    out.push(snap(-1, 16, `Ordem topológica completa: ${ordem.map((i) => ROT[i]).join(" → ")}. Toda aresta do grafo aponta da esquerda para a direita nessa lista, que é exatamente a definição.`, null, { ok: true }));
  }
  return out;
}

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

export function TopoSortVisualizer() {
  const [presetKey, setPresetKey] = useState("curso");
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
  const saiu = useMemo(() => new Set(p.ordem), [p.ordem]);
  const naFila = useMemo(() => new Set(p.fila), [p.fila]);
  const pct = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · Kahn, com o grau de entrada à vista</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">passo {idx + 1} de {total}</span>
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
            <svg className="tt-arv" width={400} height={175} viewBox="0 0 400 175" role="img"
              aria-label={`Grafo dirigido de pré-requisitos. ${p.nota}`}>
              <defs>
                <marker id="seta-topo" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 8 4 L 0 8 z" fill="rgba(59,130,246,0.75)" />
                </marker>
              </defs>
              {preset.arestas.map(([u, v]) => {
                const ativa = p.aresta && p.aresta[0] === u && p.aresta[1] === v;
                const dx = POS[v].x - POS[u].x, dy = POS[v].y - POS[u].y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1, r = 22;
                return (
                  <line key={`${u}-${v}`} className={`tt-aresta${ativa ? " ativa" : saiu.has(u) ? " on" : ""}`}
                    x1={POS[u].x + (dx / d) * r} y1={POS[u].y + (dy / d) * r}
                    x2={POS[v].x - (dx / d) * r} y2={POS[v].y - (dy / d) * r}
                    markerEnd="url(#seta-topo)" />
                );
              })}
              {CURTO.map((r, i) => {
                const cls = ["tt-no", "topo-no"];
                if (i === p.no) cls.push("on");
                else if (saiu.has(i)) cls.push("saiu");
                else if (naFila.has(i)) cls.push("aux");
                return (
                  <g key={r} className={cls.join(" ")}>
                    <circle cx={POS[i].x} cy={POS[i].y} r={20} />
                    <text x={POS[i].x} y={POS[i].y + 1} textAnchor="middle">{r}</text>
                    <text className="topo-grau" x={POS[i].x} y={POS[i].y + 13} textAnchor="middle">
                      {saiu.has(i) ? "✓" : p.grau[i]}
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
                {ROT.map((r, i) => (
                  <span key={r} className={`gr-dist-item${saiu.has(i) ? " fechado" : p.grau[i] === 0 ? "" : " off"}`}>
                    <i>{CURTO[i]}</i>{saiu.has(i) ? "✓" : p.grau[i]}
                  </span>
                ))}
              </div>
            </div>
            <div className="tt-painel">
              <div className="tt-painel-tit">Fila <em>grau zero, prontos para sair</em></div>
              <div className="tt-aux">
                {p.fila.length === 0 ? <span className="tt-vazio">vazia</span> : p.fila.map((v, i) => (
                  <span key={`${v}-${i}`} className={`tt-aux-item${i === 0 ? " topo" : ""}`}>{CURTO[v]}</span>
                ))}
              </div>
            </div>
            <div className="tt-painel">
              <div className="tt-painel-tit">Ordem final</div>
              <div className="tt-saida">
                {p.ordem.length === 0 ? <span className="tt-vazio">nada ainda</span> : p.ordem.map((v, i) => (
                  <span key={v} className={`tt-saida-item${i === p.ordem.length - 1 ? " novo" : ""}`}>{CURTO[v]}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className={"viz-note" + (p.ok ? " ok" : p.alerta ? " invalid" : "")}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">kahn.py</div>
            <div className="viz-code-body">
              {CODIGO.map((txt, i) => (
                <div key={i} className={`viz-line${i === p.linha ? " on" : ""}`}><span className="ln">{i + 1}</span>{txt}</div>
              ))}
            </div>
          </div>
          <div className="viz-vars">
            <div className="viz-vars-head">Variáveis</div>
            <div className="viz-var"><span className="viz-var-name">na ordem</span><span className="viz-var-val best">{p.ordem.length} de {ROT.length}</span></div>
            <div className="viz-var"><span className="viz-var-name">na fila</span><span className="viz-var-val">{p.fila.length}</span></div>
            <div className="viz-var"><span className="viz-var-name">arestas</span><span className="viz-var-val">{preset.arestas.length}</span></div>
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
          Quando a fila tem mais de um vértice ao mesmo tempo, existe mais de uma ordem válida:
          qualquer um deles pode sair primeiro. E quando a fila esvazia cedo, o que sobrou na tela é
          o ciclo. Rode o terceiro preset até o fim.
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
