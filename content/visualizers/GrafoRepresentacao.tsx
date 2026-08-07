"use client";

import { useMemo, useState } from "react";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

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
//
// Sobre a casca: não há linha do tempo (`total: 1`) nem bloco dispensável para
// recolher (`collapsible: false`) — o desenho, a matriz e a lista SÃO o
// conteúdo. Da casca ele usa o que lhe cabe: o painel expandido com o
// cabeçalho parado enquanto o miolo rola. Os presets e o seletor de tipo
// continuam sendo controles do miolo, e não do rodapé, porque no rodapé só
// mora reprodução — e aqui não há rodapé nenhum.
// ---------------------------------------------------------------------------

const LABELS = ["A", "B", "C", "D", "E", "F"];
const V = LABELS.length;

// Posições fixas: hexágono, para nenhuma aresta passar por cima de vértice.
const POS: { x: number; y: number }[] = [
  { x: 150, y: 30 },
  { x: 264, y: 96 },
  { x: 264, y: 228 },
  { x: 150, y: 294 },
  { x: 36, y: 228 },
  { x: 36, y: 96 },
];

type Preset = { key: string; label: string; edges: [number, number][]; hint: string };

const PRESETS: Preset[] = [
  {
    key: "social",
    label: "Esparso (rede social)",
    edges: [[0, 1], [0, 5], [1, 2], [2, 3], [3, 4], [4, 5], [1, 4]],
    hint: "O caso mais comum do mundo real: cada vértice tem poucos vizinhos. A matriz fica quase toda em zero.",
  },
  {
    key: "dense",
    label: "Denso",
    edges: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 5], [2, 3], [2, 4], [3, 4], [3, 5], [4, 5]],
    hint: "Muitas arestas por vértice. Aqui a matriz para de desperdiçar e passa a ganhar da lista na consulta.",
  },
  {
    key: "complete",
    label: "Completo",
    edges: (() => {
      const a: [number, number][] = [];
      for (let i = 0; i < V; i++) for (let j = i + 1; j < V; j++) a.push([i, j]);
      return a;
    })(),
    hint: "Todo mundo ligado a todo mundo: V(V-1)/2 = 15 arestas. É o teto, e é onde a matriz fica cheia.",
  },
  {
    key: "path",
    label: "Caminho (o mínimo conexo)",
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    hint: "V-1 arestas: o mínimo para conectar tudo sem ciclo. Uma árvore é exatamente isto.",
  },
];

function matrixFrom(edges: [number, number][], directed: boolean): number[][] {
  const m = Array.from({ length: V }, () => new Array(V).fill(0));
  for (const [a, b] of edges) {
    m[a][b] = 1;
    if (!directed) m[b][a] = 1;
  }
  return m;
}

export function GrafoRepresentacao() {
  const [presetKey, setPresetKey] = useState("social");
  const [directed, setDirected] = useState(false);
  const [matrix, setMatrix] = useState<number[][]>(() => matrixFrom(PRESETS[0].edges, false));
  const [focused, setFocused] = useState<number | null>(null);

  const viz = useVisualizer({
    title: "Visualizador · o mesmo grafo em matriz e em lista de adjacência",
    // Não é uma animação: a matriz é editável e o resultado é imediato. Com
    // `total: 1` somem o contador de passo, os atalhos e a barra de progresso.
    total: 1,
    // Não há bloco dispensável: o desenho, a matriz e a lista SÃO o conteúdo.
    // Sem isso o cabeçalho prometeria esconder um bloco que não existe.
    collapsible: false,
    // `measureOn` fica de fora de propósito: com `collapsible: false` não há
    // decisão a tomar, e o hook nem espera as fontes. Passar a lista seria
    // anunciar uma medição que não acontece.
  });

  const applyPreset = (p: Preset, dir = directed) => {
    setPresetKey(p.key);
    setMatrix(matrixFrom(p.edges, dir));
  };

  const changeDirected = (v: boolean) => {
    setDirected(v);
    setMatrix((current) => {
      if (v) return current.map((row) => [...row]);
      // ao voltar para não dirigido, espelha para manter a simetria
      const next = current.map((row) => [...row]);
      for (let i = 0; i < V; i++) for (let j = 0; j < V; j++) if (next[i][j]) next[j][i] = 1;
      return next;
    });
  };

  const toggleEdge = (i: number, j: number) => {
    if (i === j) return; // laço: fora do escopo deste visualizador
    setPresetKey("");
    setMatrix((current) => {
      const next = current.map((row) => [...row]);
      const value = next[i][j] ? 0 : 1;
      next[i][j] = value;
      if (!directed) next[j][i] = value;
      return next;
    });
  };

  const { edges, degree } = useMemo(() => {
    const edges: [number, number][] = [];
    const degree = new Array(V).fill(0);
    for (let i = 0; i < V; i++) {
      for (let j = 0; j < V; j++) {
        if (!matrix[i][j]) continue;
        degree[i]++;
        if (directed || i < j) edges.push([i, j]);
      }
    }
    return { edges, degree };
  }, [matrix, directed]);

  const E = edges.length;
  const maxE = directed ? V * (V - 1) : (V * (V - 1)) / 2;
  const density = Math.round((E / maxE) * 100);
  const matrixCost = V * V;
  const listCost = V + (directed ? E : 2 * E);
  const hint = PRESETS.find((p) => p.key === presetKey)?.hint;

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      {/* Sem linha do tempo não há "passo N de M"; o número que resume o
          estado entra no lugar dele, com o rótulo junto. */}
      <VizHeader viz={viz}>
        <span className="viz-step">V = {V} · E = {E} · densidade {density}%</span>
      </VizHeader>

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((p) => (
            <button key={p.key} className={`bigo-chip${presetKey === p.key ? " on" : ""}`} onClick={() => applyPreset(p)} aria-pressed={presetKey === p.key}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="viz-inputs">
          <div className="viz-field">
            <span>Tipo</span>
            <div className="sub-modo">
              <button className={`sub-modo-btn${directed ? "" : " on"}`} onClick={() => changeDirected(false)} aria-pressed={!directed}>
                não dirigido
              </button>
              <button className={`sub-modo-btn${directed ? " on" : ""}`} onClick={() => changeDirected(true)} aria-pressed={directed}>
                dirigido
              </button>
            </div>
          </div>
        </div>

        <p className="tt-legenda-arvore">
          {hint ?? "Clique numa célula da matriz para ligar ou desligar a aresta. No modo não dirigido a célula espelhada acompanha, e é essa simetria que faz metade da matriz ser redundante."}
        </p>

        <div className="gr-split">
          <div className="tt-arv-wrap" style={{ margin: 0 }}>
            <svg
              className="tt-arv"
              width={300}
              height={324}
              viewBox="0 0 300 324"
              role="img"
              aria-label={`Grafo ${directed ? "dirigido" : "não dirigido"} com ${V} vértices e ${E} arestas, densidade ${density} por cento.`}
            >
              {directed && (
                <defs>
                  <marker id="seta-gr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 0 L 8 4 L 0 8 z" fill="rgba(59,130,246,0.75)" />
                  </marker>
                </defs>
              )}
              {edges.map(([a, b]) => {
                const lit = focused !== null && (a === focused || b === focused);
                // encurta a linha para a ponta da seta não entrar no círculo
                const dx = POS[b].x - POS[a].x;
                const dy = POS[b].y - POS[a].y;
                const d = Math.sqrt(dx * dx + dy * dy) || 1;
                const r = 19;
                return (
                  <line
                    key={`${a}-${b}`}
                    className={`tt-aresta${lit ? " on" : ""}`}
                    x1={POS[a].x + (dx / d) * r}
                    y1={POS[a].y + (dy / d) * r}
                    x2={POS[b].x - (dx / d) * r}
                    y2={POS[b].y - (dy / d) * r}
                    markerEnd={directed ? "url(#seta-gr)" : undefined}
                  />
                );
              })}
              {LABELS.map((label, i) => (
                <g
                  key={label}
                  className={`tt-no${focused === i ? " on" : ""}`}
                  onMouseEnter={() => setFocused(i)}
                  onMouseLeave={() => setFocused(null)}
                >
                  <circle cx={POS[i].x} cy={POS[i].y} r={17} />
                  <text x={POS[i].x} y={POS[i].y + 4} textAnchor="middle">{label}</text>
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
                  {LABELS.map((label) => <th key={label}>{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => (
                  <tr key={i} className={focused === i ? "on" : undefined}>
                    <th onMouseEnter={() => setFocused(i)} onMouseLeave={() => setFocused(null)}>{LABELS[i]}</th>
                    {row.map((v, j) => (
                      <td key={j}>
                        <button
                          className={`gr-cel${v ? " on" : ""}${i === j ? " diag" : ""}`}
                          onClick={() => toggleEdge(i, j)}
                          disabled={i === j}
                          aria-label={`Aresta de ${LABELS[i]} para ${LABELS[j]}: ${v ? "existe" : "não existe"}`}
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
            {LABELS.map((label, i) => (
              <div key={label} className={`gr-linha${focused === i ? " on" : ""}`} onMouseEnter={() => setFocused(i)} onMouseLeave={() => setFocused(null)}>
                <span className="gr-linha-no">{label}</span>
                <span className="gr-seta">→</span>
                {matrix[i].map((v, j) => (v ? <span key={j} className="gr-viz-item">{LABELS[j]}</span> : null))}
                {degree[i] === 0 && <span className="tt-vazio">sem vizinhos</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat"><span>vértices (V)</span><strong>{V}</strong></div>
          <div className="bigo-stat"><span>arestas (E)</span><strong>{E} de {maxE}</strong></div>
          <div className="bigo-stat"><span>memória da matriz</span><strong>{matrixCost} células</strong></div>
          <div className="bigo-stat"><span>memória da lista</span><strong>{listCost} entradas</strong></div>
          {/* Sem o `- V` que descontava a diagonal. Ela é DESENHADA: cada
              célula dela é um botão com `0` dentro (`:250-257`), só com
              `opacity: .35` — apagada, e perfeitamente legível. Descontá-la
              fazia o cartão dizer 16 com 22 zeros na tela, e dizer 0 no preset
              Completo com 6 zeros à vista, logo abaixo de um cartão que cobra
              as 36 células da matriz.

              Entre mudar o número e mudar o rótulo, o número: é ele que o
              aluno consegue CONFERIR contando a tela, e é ele que fecha a
              conta com o cartão vizinho (36 células menos 22 em zero = as 14
              ocupadas). E a diagonal não é ruído a descontar, é o argumento:
              são V posições que a matriz reserva para sempre e que nenhuma
              aresta pode ocupar, porque vértice não é vizinho de si mesmo. O
              desperdício de V² é o assunto da peça, e essa é a parte dele que
              nunca tem chance. O rótulo continua "células em zero" porque
              agora é literalmente isso que o número conta. */}
          <div className="bigo-stat"><span>células em zero</span><strong>{matrixCost - (directed ? E : 2 * E)}</strong></div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          A matriz custa V² sempre, ligada ou não a aresta. A lista custa{" "}
          {directed ? "V + E (dirigido: cada aresta aparece uma vez só)" : "V + 2E (não dirigido: cada aresta aparece nos dois vizinhos)"},
          e no grafo completo isso dá exatamente V²: os dois empatam, e é o mais caro que a lista
          chega a ficar. Com 6 vértices a diferença é pequena; com 1 milhão de vértices, a matriz
          pediria 10¹² células e simplesmente não cabe.
        </p>
      </div>

      <VizFooter viz={viz} />
    </figure>
  );
}
