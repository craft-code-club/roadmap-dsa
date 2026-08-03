"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// GrafoRepresentacao, matriz e lista de adjacência lado a lado.
//
// A escolha entre matriz e lista é a primeira decisão real de quem vai mexer
// com grafo, e ela é sempre ensinada como tabela de prós e contras. Aqui ela é
// ensinada como CONSEQUÊNCIA: você liga e desliga arestas clicando na matriz,
// e vê ao mesmo tempo o desenho, a lista e os dois custos de memória mudarem.
//
// A matriz é o editor de propósito. É ela que tem uma célula por PAR de
// vértices, então clicar nela deixa explícito o que a matriz é: um espaço
// reservado para toda aresta possível, ocupada ou não. Grafo esparso deixa
// quase tudo em zero, e o desperdício aparece sozinho.
// ---------------------------------------------------------------------------

const ROT = ["A", "B", "C", "D", "E", "F"];
const V = ROT.length;

// Posições fixas: hexágono, para nenhuma aresta passar por cima de vértice.
const POS: { x: number; y: number }[] = [
  { x: 150, y: 30 },
  { x: 264, y: 96 },
  { x: 264, y: 228 },
  { x: 150, y: 294 },
  { x: 36, y: 228 },
  { x: 36, y: 96 },
];

type Preset = { key: string; rotulo: string; arestas: [number, number][]; dica: string };

const PRESETS: Preset[] = [
  {
    key: "social",
    rotulo: "Esparso (rede social)",
    arestas: [[0, 1], [0, 5], [1, 2], [2, 3], [3, 4], [4, 5], [1, 4]],
    dica: "O caso mais comum do mundo real: cada vértice tem poucos vizinhos. A matriz fica quase toda em zero.",
  },
  {
    key: "denso",
    rotulo: "Denso",
    arestas: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 5], [2, 3], [2, 4], [3, 4], [3, 5], [4, 5]],
    dica: "Muitas arestas por vértice. Aqui a matriz para de desperdiçar e passa a ganhar da lista na consulta.",
  },
  {
    key: "completo",
    rotulo: "Completo",
    arestas: (() => {
      const a: [number, number][] = [];
      for (let i = 0; i < V; i++) for (let j = i + 1; j < V; j++) a.push([i, j]);
      return a;
    })(),
    dica: "Todo mundo ligado a todo mundo: V(V-1)/2 = 15 arestas. É o teto, e é onde a matriz fica cheia.",
  },
  {
    key: "caminho",
    rotulo: "Caminho (o mínimo conexo)",
    arestas: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    dica: "V-1 arestas: o mínimo para conectar tudo sem ciclo. Uma árvore é exatamente isto.",
  },
];

function matrizDe(arestas: [number, number][], dirigido: boolean): number[][] {
  const m = Array.from({ length: V }, () => new Array(V).fill(0));
  for (const [a, b] of arestas) {
    m[a][b] = 1;
    if (!dirigido) m[b][a] = 1;
  }
  return m;
}

export function GrafoRepresentacao() {
  const [presetKey, setPresetKey] = useState("social");
  const [dirigido, setDirigido] = useState(false);
  const [m, setM] = useState<number[][]>(() => matrizDe(PRESETS[0].arestas, false));
  const [foco, setFoco] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const aplicar = (p: Preset, dir = dirigido) => {
    setPresetKey(p.key);
    setM(matrizDe(p.arestas, dir));
  };

  const trocarDirigido = (v: boolean) => {
    setDirigido(v);
    setM((atual) => {
      if (v) return atual.map((l) => [...l]);
      // ao voltar para não dirigido, espelha para manter a simetria
      const novo = atual.map((l) => [...l]);
      for (let i = 0; i < V; i++) for (let j = 0; j < V; j++) if (novo[i][j]) novo[j][i] = 1;
      return novo;
    });
  };

  const alternar = (i: number, j: number) => {
    if (i === j) return; // laço: fora do escopo deste visualizador
    setPresetKey("");
    setM((atual) => {
      const novo = atual.map((l) => [...l]);
      const valor = novo[i][j] ? 0 : 1;
      novo[i][j] = valor;
      if (!dirigido) novo[j][i] = valor;
      return novo;
    });
  };

  const { arestas, grau } = useMemo(() => {
    const arestas: [number, number][] = [];
    const grau = new Array(V).fill(0);
    for (let i = 0; i < V; i++) {
      for (let j = 0; j < V; j++) {
        if (!m[i][j]) continue;
        grau[i]++;
        if (dirigido || i < j) arestas.push([i, j]);
      }
    }
    return { arestas, grau };
  }, [m, dirigido]);

  const E = arestas.length;
  const maxE = dirigido ? V * (V - 1) : (V * (V - 1)) / 2;
  const densidade = Math.round((E / maxE) * 100);
  const custoMatriz = V * V;
  const custoLista = V + (dirigido ? E : 2 * E);
  const dica = PRESETS.find((p) => p.key === presetKey)?.dica;

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · o mesmo grafo em matriz e em lista de adjacência</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">V = {V} · E = {E} · densidade {densidade}%</span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "✕ Fechar" : "⤢ Expandir"}
          </button>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          {PRESETS.map((p) => (
            <button key={p.key} className={`bigo-chip${presetKey === p.key ? " on" : ""}`} onClick={() => aplicar(p)} aria-pressed={presetKey === p.key}>
              {p.rotulo}
            </button>
          ))}
        </div>

        <div className="viz-inputs">
          <div className="viz-field">
            <span>Tipo</span>
            <div className="sub-modo">
              <button className={`sub-modo-btn${dirigido ? "" : " on"}`} onClick={() => trocarDirigido(false)} aria-pressed={!dirigido}>
                não dirigido
              </button>
              <button className={`sub-modo-btn${dirigido ? " on" : ""}`} onClick={() => trocarDirigido(true)} aria-pressed={dirigido}>
                dirigido
              </button>
            </div>
          </div>
        </div>

        <p className="tt-legenda-arvore">
          {dica ?? "Clique numa célula da matriz para ligar ou desligar a aresta. No modo não dirigido a célula espelhada acompanha, e é essa simetria que faz metade da matriz ser redundante."}
        </p>

        <div className="gr-split">
          <div className="tt-arv-wrap" style={{ margin: 0 }}>
            <svg
              className="tt-arv"
              width={300}
              height={324}
              viewBox="0 0 300 324"
              role="img"
              aria-label={`Grafo ${dirigido ? "dirigido" : "não dirigido"} com ${V} vértices e ${E} arestas, densidade ${densidade} por cento.`}
            >
              {dirigido && (
                <defs>
                  <marker id="seta-gr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 0 L 8 4 L 0 8 z" fill="rgba(59,130,246,0.75)" />
                  </marker>
                </defs>
              )}
              {arestas.map(([a, b]) => {
                const aceso = foco !== null && (a === foco || b === foco);
                // encurta a linha para a ponta da seta não entrar no círculo
                const dx = POS[b].x - POS[a].x;
                const dy = POS[b].y - POS[a].y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                const r = 19;
                return (
                  <line
                    key={`${a}-${b}`}
                    className={`tt-aresta${aceso ? " on" : ""}`}
                    x1={POS[a].x + (dx / d) * r}
                    y1={POS[a].y + (dy / d) * r}
                    x2={POS[b].x - (dx / d) * r}
                    y2={POS[b].y - (dy / d) * r}
                    markerEnd={dirigido ? "url(#seta-gr)" : undefined}
                  />
                );
              })}
              {ROT.map((r, i) => (
                <g
                  key={r}
                  className={`tt-no${foco === i ? " on" : ""}`}
                  onMouseEnter={() => setFoco(i)}
                  onMouseLeave={() => setFoco(null)}
                >
                  <circle cx={POS[i].x} cy={POS[i].y} r={17} />
                  <text x={POS[i].x} y={POS[i].y + 4} textAnchor="middle">{r}</text>
                </g>
              ))}
            </svg>
          </div>

          <div className="gr-painel">
            <div className="tt-painel-tit">Matriz de adjacência <em>clique para ligar/desligar</em></div>
            <table className="gr-matriz">
              <thead>
                <tr>
                  <th />
                  {ROT.map((r) => <th key={r}>{r}</th>)}
                </tr>
              </thead>
              <tbody>
                {m.map((linha, i) => (
                  <tr key={i} className={foco === i ? "on" : undefined}>
                    <th onMouseEnter={() => setFoco(i)} onMouseLeave={() => setFoco(null)}>{ROT[i]}</th>
                    {linha.map((v, j) => (
                      <td key={j}>
                        <button
                          className={`gr-cel${v ? " on" : ""}${i === j ? " diag" : ""}`}
                          onClick={() => alternar(i, j)}
                          disabled={i === j}
                          aria-label={`Aresta de ${ROT[i]} para ${ROT[j]}: ${v ? "existe" : "não existe"}`}
                          aria-pressed={!!v}
                        >
                          {v}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="gr-painel" style={{ marginTop: 12 }}>
          <div className="tt-painel-tit">Lista de adjacência <em>só o que existe</em></div>
          <div className="gr-lista">
            {ROT.map((r, i) => (
              <div key={r} className={`gr-linha${foco === i ? " on" : ""}`} onMouseEnter={() => setFoco(i)} onMouseLeave={() => setFoco(null)}>
                <span className="gr-linha-no">{r}</span>
                <span className="gr-seta">→</span>
                {m[i].map((v, j) => (v ? <span key={j} className="gr-viz-item">{ROT[j]}</span> : null))}
                {grau[i] === 0 && <span className="tt-vazio">sem vizinhos</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat"><span>vértices (V)</span><strong>{V}</strong></div>
          <div className="bigo-stat"><span>arestas (E)</span><strong>{E} de {maxE}</strong></div>
          <div className="bigo-stat"><span>memória da matriz</span><strong>{custoMatriz} células</strong></div>
          <div className="bigo-stat"><span>memória da lista</span><strong>{custoLista} entradas</strong></div>
          <div className="bigo-stat"><span>células em zero</span><strong>{custoMatriz - (dirigido ? E : 2 * E) - V}</strong></div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          A matriz custa V² sempre, ligada ou não a aresta. A lista custa V + 2E, então ela só perde
          quando o grafo é quase completo. Com 6 vértices a diferença é pequena; com 1 milhão de
          vértices, a matriz pediria 10¹² células e simplesmente não cabe.
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
