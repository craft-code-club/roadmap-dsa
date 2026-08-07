"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// SkipListVisualizer, a busca descendo em escada pelos níveis.
//
// Nível é a única coisa deste tópico que não se entende lendo: precisa ver a
// estrutura desenhada e o caminho descendo. Por isso aqui o desenho é um SVG
// com layout calculado (uma coluna por elemento, uma linha por nível) em vez da
// fileira de células dos outros visualizadores. O gerador de passos continua
// puro, igual ao TwoPointersVisualizer.
//
// Duas coisas que o aluno precisa enxergar acontecendo:
//   1. a escada: a linha azul que sai do head no topo e desce até o nível 0;
//   2. o preço: o contador de comparações da skip list ao lado do contador da
//      mesma busca feita só no nível 0, que é uma lista encadeada comum.
//
// As alturas padrão dão a pirâmide de livro (12 / 6 / 3 / 1 nós por nível) e o
// botão "Sortear alturas" mostra que a mesma entrada gera estruturas
// diferentes, mas o resultado da busca não muda.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type SkipNode = { value: number; height: number };

type Step = {
  level: number;
  current: number; // índice do nó atual, -1 = head (o sentinela)
  looking: number | null; // nó comparado neste passo
  comparisons: number;
  visited: string[]; // "nivel:indice", na ordem em que a busca passou
  line: number;
  found?: boolean;
  done?: boolean;
  note: string;
};

// As linhas mapeiam 1:1 com o campo `line` de cada passo, então a ordem e a
// quantidade de linhas não podem mudar sem ajustar o gerador junto.
const CODE = [
  "def buscar(self, alvo):",
  "    atual = self.head",
  "    for nivel in range(self.nivel_max, -1, -1):",
  "        prox = atual.forward[nivel]",
  "        while prox and prox.valor < alvo:",
  "            atual = prox",
  "            prox = atual.forward[nivel]",
  "    atual = atual.forward[0]",
  "    return atual is not None and atual.valor == alvo",
];

const MAX_LEVELS = 4; // altura máxima de um nó, o `MAX_NIVEL` da implementação

// Doze elementos com a pirâmide exata da teoria: 12 nós no nível 0, 6 no
// nível 1, 3 no nível 2 e 1 no nível 3.
const DEFAULT_VALUES = [3, 9, 17, 23, 31, 42, 50, 59, 73, 80, 92, 98];
const DEFAULT_CYCLE = [1, 3, 1, 2, 1, 4, 1, 2, 3, 1, 2, 1];

// Alturas determinísticas: o mesmo padrão, repetido em ciclo quando o aluno
// digita um array maior. Nada de Math.random no caminho de render.
function defaultHeights(n: number): number[] {
  return Array.from({ length: n }, (_, i) => DEFAULT_CYCLE[i % DEFAULT_CYCLE.length]);
}

function parseValues(text: string): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const raw of text.split(",")) {
    const v = parseInt(raw.trim(), 10);
    if (isNaN(v) || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out.sort((a, b) => a - b).slice(0, 14);
}

// O próximo nó de `i` no nível `level`: o primeiro à direita que chega lá.
// Com i = -1 a busca começa no head, que participa de todos os níveis.
function forwardFrom(nodes: SkipNode[], i: number, level: number): number | null {
  for (let j = i + 1; j < nodes.length; j++) {
    if (nodes[j].height > level) return j;
  }
  return null;
}

function nameOf(nodes: SkipNode[], i: number): string {
  return i < 0 ? "o head" : `o ${nodes[i].value}`;
}

// A mesma busca, mas andando só pelo nível 0: é exatamente o que uma lista
// encadeada comum faria. Conta do mesmo jeito (cada `<` avaliado, mais a
// comparação final de igualdade) para os dois números serem comparáveis.
function listComparisons(nodes: SkipNode[], target: number): number {
  let c = 0;
  let i = 0;
  while (i < nodes.length && nodes[i].value < target) {
    c++;
    i++;
  }
  if (i < nodes.length) c += 2; // o `<` que deu falso + o `==` do final
  return c;
}

function generateSteps(nodes: SkipNode[], target: number): Step[] {
  const out: Step[] = [];
  if (!nodes.length) return out;
  const top = Math.max(1, ...nodes.map((n) => n.height)) - 1;
  let level = top;
  let current = -1;
  let comparisons = 0;
  const visited: string[] = [`${top}:-1`];
  const base = () => ({ level, current, comparisons, visited: [...visited] });

  out.push({
    ...base(),
    looking: null,
    line: 1,
    note: `Começo no head, no nível ${top}, o mais alto que esta lista tem. É de lá que saem os maiores saltos, e por isso toda busca começa no topo, à esquerda.`,
  });

  let guard = 0;
  while (level >= 0 && guard++ < 300) {
    const next = forwardFrom(nodes, current, level);
    if (next === null) {
      out.push({
        ...base(),
        looking: null,
        line: 3,
        note: `No nível ${level} não existe ninguém depois de ${nameOf(nodes, current)}: o ponteiro aponta para None. Não dá para avançar, então só me resta descer.`,
      });
    } else {
      const v = nodes[next].value;
      comparisons++;
      if (v < target) {
        const skipped = next - current - 1;
        out.push({
          ...base(),
          looking: next,
          line: 4,
          note: `${v} < ${target}: o próximo do nível ${level} ainda é menor que o alvo, então dá para pular até ele sem risco de passar do ponto.`,
        });
        current = next;
        visited.push(`${level}:${current}`);
        out.push({
          ...base(),
          looking: null,
          line: 5,
          note:
            skipped === 0
              ? `Avancei para o ${v}. Neste salto não pulei ninguém: no nível ${level} ele já era o vizinho imediato.`
              : `Avancei para o ${v} de uma vez só, sem nem olhar ${skipped === 1 ? "o elemento que ficou" : `os ${skipped} elementos que ficaram`} para trás no nível 0. É isso que o atalho compra.`,
        });
        continue;
      }
      out.push({
        ...base(),
        looking: next,
        line: 4,
        note: `${v} não é menor que ${target}: se eu avançasse, passaria do ponto. Paro de andar no nível ${level}.`,
      });
    }

    if (level === 0) break;
    level--;
    visited.push(`${level}:${current}`);
    out.push({
      ...base(),
      looking: null,
      line: 2,
      note: `Desço um degrau, para o nível ${level}, sem sair de ${nameOf(nodes, current)}. Tudo que ficou à esquerda está descartado de vez: já sei que é menor que ${target}.`,
    });
  }

  const candidate = forwardFrom(nodes, current, 0);
  if (candidate !== null) visited.push(`0:${candidate}`);
  out.push({
    ...base(),
    looking: candidate,
    line: 7,
    note:
      candidate === null
        ? `Saí do laço em ${nameOf(nodes, current)}, e depois dele não há mais nada no nível 0. O ${target} não está na lista.`
        : `Saí do laço em ${nameOf(nodes, current)}. O único candidato possível é o vizinho dele no nível 0, o ${nodes[candidate].value}: se o ${target} existisse, estaria exatamente aí.`,
  });

  if (candidate !== null) comparisons++;
  const hit = candidate !== null && nodes[candidate].value === target;
  const inPlainList = listComparisons(nodes, target);
  out.push({
    ...base(),
    looking: candidate,
    line: 8,
    found: hit,
    done: true,
    note: hit
      ? `Achei o ${target} com ${comparisons} ${comparisons === 1 ? "comparação" : "comparações"}. A mesma busca andando só pelo nível 0, que é uma lista encadeada comum, gastaria ${inPlainList}.`
      : `O ${target} não está na lista, e para saber disso bastaram ${comparisons} ${comparisons === 1 ? "comparação" : "comparações"}. Percorrendo só o nível 0 seriam ${inPlainList}.`,
  });
  return out;
}

type Preset = { key: string; label: string; target: number; values: number[]; heights: number[] };
const PRESETS: Preset[] = [
  {
    key: "encontro",
    label: "A escada completa: procurar o 73",
    target: 73,
    values: DEFAULT_VALUES,
    heights: defaultHeights(DEFAULT_VALUES.length),
  },
  {
    key: "longe",
    label: "Lá no fim: procurar o 92",
    target: 92,
    values: DEFAULT_VALUES,
    heights: defaultHeights(DEFAULT_VALUES.length),
  },
  {
    key: "ausente",
    label: "Não existe: procurar o 44",
    target: 44,
    values: DEFAULT_VALUES,
    heights: defaultHeights(DEFAULT_VALUES.length),
  },
  {
    key: "plano",
    label: "Azar total: ninguém passou do nível 0",
    target: 92,
    values: DEFAULT_VALUES,
    heights: DEFAULT_VALUES.map(() => 1),
  },
  // Os dois casos de borda que o artigo manda prever antes de rodar. O "antes
  // de todos" é o único em que a skip list perde para a lista comum, e é por
  // isso que ele merece um botão em vez de ficar escondido no texto.
  {
    key: "antes",
    label: "Antes de todos: procurar o 1",
    target: 1,
    values: DEFAULT_VALUES,
    heights: defaultHeights(DEFAULT_VALUES.length),
  },
  {
    key: "unico",
    label: "Um elemento só: procurar o 42",
    target: 42,
    values: [42],
    heights: [1],
  },
];

// --- layout do desenho -----------------------------------------------------
const GUT = 50; // faixa da esquerda com o rótulo do nível
const HEAD_W = 36;
const X0 = GUT + HEAD_W + 18; // x da primeira coluna
const COL = 50; // distância entre colunas
const W = 34; // largura da caixinha de um nó
const H = 24; // altura da caixinha
const RH = 38; // distância entre níveis
const TOP = 12;

export function SkipListVisualizer() {
  const [values, setValues] = useState<number[]>(DEFAULT_VALUES);
  const [input, setInput] = useState(DEFAULT_VALUES.join(", "));
  const [heights, setHeights] = useState<number[]>(defaultHeights(DEFAULT_VALUES.length));
  const [target, setTarget] = useState(73);
  const [preset, setPreset] = useState("encontro");

  const nodes = useMemo<SkipNode[]>(
    () => values.map((value, i) => ({ value, height: Math.min(MAX_LEVELS, heights[i] ?? 1) })),
    [values, heights]
  );
  const steps = useMemo(() => generateSteps(nodes, target), [nodes, target]);
  const total = Math.max(1, steps.length);

  // --- desenho -------------------------------------------------------------
  const top = Math.max(1, ...nodes.map((n) => n.height)) - 1;
  const levels = top + 1;
  const n = nodes.length;

  const viz = useVisualizer({
    title: "Visualizador · a busca descendo em escada pelos níveis",
    total,
    // O que MAIS muda a altura da peça: o número de níveis (cada um é uma
    // linha do SVG e uma ficha a mais na linha de ocupação) e o tamanho da
    // linha do tempo, que liga e desliga o rodapé inteiro.
    measureOn: [levels, total],
  });

  const p = steps[viz.step];

  const onTargetChange = (v: string) => {
    viz.reset();
    setPreset("");
    setTarget(parseInt(v, 10) || 0);
  };
  const onInputChange = (v: string) => {
    const parsed = parseValues(v);
    viz.reset();
    setPreset("");
    setInput(v);
    setValues(parsed.length ? parsed : [1]);
    setHeights(defaultHeights(Math.max(1, parsed.length)));
  };
  const applyPreset = (pr: Preset) => {
    viz.reset();
    setPreset(pr.key);
    setValues(pr.values);
    setInput(pr.values.join(", "));
    setHeights(pr.heights);
    setTarget(pr.target);
  };
  // Math.random só aqui, num handler de clique: no caminho de render ele faria
  // o HTML do build divergir do cliente e quebrar a hidratação.
  const shuffleHeights = () => {
    const rolled = values.map(() => {
      let h = 1;
      while (Math.random() < 0.5 && h < MAX_LEVELS) h++;
      return h;
    });
    viz.reset();
    setPreset("");
    setHeights(rolled);
  };

  const svgWidth = X0 + n * COL + 44;
  const svgHeight = TOP + top * RH + H + 14;

  const yOf = (level: number) => TOP + (top - level) * RH;
  const cyOf = (level: number) => yOf(level) + H / 2;
  const xOf = (i: number) => (i < 0 ? GUT : X0 + i * COL);
  const widthOf = (i: number) => (i < 0 ? HEAD_W : W);
  const cxOf = (i: number) => xOf(i) + widthOf(i) / 2;

  const visitedSet = useMemo(() => new Set(p ? p.visited : []), [p]);

  // A escada: uma polilinha ligando, na ordem, cada posição por onde o ponteiro
  // `atual` passou. Trechos horizontais são saltos, trechos verticais são
  // descidas de nível.
  const ladder = (p ? p.visited : [])
    .map((k) => {
      const [lv, ix] = k.split(":").map((s) => parseInt(s, 10));
      return `${cxOf(ix).toFixed(1)},${cyOf(lv).toFixed(1)}`;
    })
    .join(" ");

  // Setas de cada nível: head -> nós daquele nível -> None. A última seta de
  // cada linha morre no rótulo None, que é o `forward[nivel] is None` do código.
  type Arrow = { k: string; x1: number; x2: number; y: number };
  const arrows: Arrow[] = [];
  const nones: { k: string; x: number; y: number }[] = [];
  const occupancy: number[] = [];
  for (let lv = 0; lv <= top; lv++) {
    const members = nodes.map((node, i) => ({ node, i })).filter((c) => c.node.height > lv);
    occupancy.push(members.length);
    let previous = -1;
    const y = cyOf(lv);
    for (const c of members) {
      arrows.push({ k: `s${lv}-${c.i}`, x1: xOf(previous) + widthOf(previous), x2: xOf(c.i) - 5, y });
      previous = c.i;
    }
    const end = xOf(previous) + widthOf(previous);
    arrows.push({ k: `n${lv}`, x1: end, x2: end + 14, y });
    nones.push({ k: `none${lv}`, x: end + 18, y });
  }

  const nodeColor = (i: number, lv: number) => {
    if (!p) return { fill: "#0f1826", stroke: "rgba(255,255,255,0.13)", txt: "#8ba0bb" };
    if (p.found && p.looking === i) return { fill: "rgba(52,211,153,0.26)", stroke: "#34d399", txt: "#eafff5" };
    if (p.looking === i && p.current !== i) return { fill: "rgba(245,158,11,0.22)", stroke: "#f59e0b", txt: "#fff" };
    if (p.current === i && p.level === lv) return { fill: "rgba(59,130,246,0.3)", stroke: "#3b82f6", txt: "#fff" };
    if (visitedSet.has(`${lv}:${i}`)) return { fill: "rgba(59,130,246,0.12)", stroke: "rgba(59,130,246,0.55)", txt: "#cbd9ea" };
    return { fill: "#0f1826", stroke: "rgba(255,255,255,0.13)", txt: "#8ba0bb" };
  };

  const variables = [
    { name: "nivel", value: p ? `${p.level}` : "-" },
    { name: "atual", value: !p || p.current < 0 ? "head" : `${nodes[p.current].value}` },
    { name: "prox", value: !p || p.looking === null ? "None" : `${nodes[p.looking].value}` },
    { name: "alvo", value: `${target}`, best: true },
  ];

  const inPlainList = listComparisons(nodes, target);
  const stats = [
    { k: "n", label: "elementos (n)", value: `${n}` },
    { k: "niv", label: "níveis", value: `${levels}` },
    { k: "cmp", label: "comparações na skip list", value: p ? `${p.comparisons}` : "0" },
    { k: "lst", label: "comparações numa lista comum", value: `${inPlainList}` },
  ];

  const noteClass = "viz-note" + (p && p.found ? " ok" : p && p.done ? " invalid" : "");
  const description = `Skip list com ${n} elementos e ${levels} ${levels === 1 ? "nível" : "níveis"}, procurando o ${target}. A busca está no nível ${p ? p.level : 0}, em ${!p || p.current < 0 ? "head" : nodes[p.current].value}, com ${p ? p.comparisons : 0} comparações feitas.`;

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              key={pr.key}
              className={`bigo-chip${preset === pr.key ? " on" : ""}`}
              onClick={() => applyPreset(pr)}
              aria-pressed={preset === pr.key}
            >
              {pr.label}
            </button>
          ))}
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Lista (ordenada sozinha, sem repetidos)</span>
            <input className="viz-input" value={input} onChange={(e) => onInputChange(e.target.value)} />
          </label>
          <label className="viz-field">
            <span>procurar</span>
            <input className="viz-input k" type="number" value={target} onChange={(e) => onTargetChange(e.target.value)} />
          </label>
          <button className="viz-btn" onClick={shuffleHeights}>
            Sortear alturas
          </button>
        </div>

        <div className="sl-wrap">
          <svg
            className="sl-svg"
            width={Math.round(svgWidth)}
            height={Math.round(svgHeight)}
            viewBox={`0 0 ${Math.round(svgWidth)} ${Math.round(svgHeight)}`}
            role="img"
            aria-label={description}
          >
            <defs>
              <marker id="sl-seta" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" fill="#3a4a60" />
              </marker>
            </defs>

            {arrows.map((s) => (
              <line
                key={s.k}
                x1={s.x1}
                y1={s.y}
                x2={s.x2}
                y2={s.y}
                stroke="#3a4a60"
                strokeWidth={1.5}
                markerEnd="url(#sl-seta)"
              />
            ))}

            {nones.map((o) => (
              <text
                key={o.k}
                x={o.x}
                y={o.y}
                fill="#4c5f79"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fontSize={10}
                dominantBaseline="central"
              >
                None
              </text>
            ))}

            {Array.from({ length: levels }, (_, k) => {
              const lv = top - k;
              return (
                <text
                  key={`r${lv}`}
                  x={GUT - 9}
                  y={cyOf(lv)}
                  fill="#61748c"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fontSize={10.5}
                  textAnchor="end"
                  dominantBaseline="central"
                >
                  nível {lv}
                </text>
              );
            })}

            {/* head: um nó só, com um ponteiro por nível. É o sentinela. */}
            <rect
              x={xOf(-1)}
              y={yOf(top)}
              width={HEAD_W}
              height={top * RH + H}
              rx={7}
              fill={p && p.current < 0 ? "rgba(59,130,246,0.22)" : "#111c2b"}
              stroke={p && p.current < 0 ? "#3b82f6" : "rgba(255,255,255,0.16)"}
              strokeWidth={1.6}
            />
            <text
              x={cxOf(-1)}
              y={cyOf(top) + (top * RH) / 2}
              fill={p && p.current < 0 ? "#fff" : "#7d8fa8"}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontSize={10.5}
              fontWeight={700}
              textAnchor="middle"
              dominantBaseline="central"
            >
              head
            </text>

            {nodes.map((node, i) =>
              Array.from({ length: node.height }, (_, lv) => {
                const c = nodeColor(i, lv);
                return (
                  <g key={`${i}-${lv}`}>
                    <rect
                      x={xOf(i)}
                      y={yOf(lv)}
                      width={W}
                      height={H}
                      rx={6}
                      fill={c.fill}
                      stroke={c.stroke}
                      strokeWidth={1.6}
                    />
                    <text
                      x={cxOf(i)}
                      y={cyOf(lv)}
                      fill={c.txt}
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      fontSize={12.5}
                      fontWeight={600}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {node.value}
                    </text>
                  </g>
                );
              })
            )}

            {/* a escada: o caminho que o ponteiro `atual` já percorreu */}
            <polyline
              points={ladder}
              fill="none"
              stroke="#60a5fa"
              strokeWidth={2.4}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.95}
            />
          </svg>
        </div>

        <p className="sl-ocupacao">
          {occupancy.map((q, lv) => (
            <span key={lv}>
              nível {lv}: <strong>{q}</strong> {q === 1 ? "nó" : "nós"}
            </span>
          ))}
        </p>

        <p className="sl-legenda">
          <span>
            <i style={{ background: "#3b82f6" }} /> onde a busca está agora
          </span>
          <span>
            <i style={{ background: "#f59e0b" }} /> valor sendo comparado
          </span>
          <span>
            <i style={{ background: "#34d399" }} /> encontrado
          </span>
          <span>
            <i style={{ background: "#60a5fa", height: 3, borderRadius: 2 }} /> a escada percorrida
          </span>
        </p>

        <p className={noteClass}>{p ? p.note : ""}</p>

        <div className="viz-split">
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">skip_list.py</div>
              <div className="viz-code-body">
                {CODE.map((txt, i) => (
                  <div key={i} className={`viz-line${p && i === p.line ? " on" : ""}`}>
                    <span className="ln">{i + 1}</span>
                    {txt}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div {...viz.varsProps}>
            <div className="viz-vars-head">Variáveis</div>
            {variables.map((v) => (
              <div className="viz-var" key={v.name}>
                <span className="viz-var-name">{v.name}</span>
                <span className={`viz-var-val${v.best ? " best" : ""}`}>{v.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bigo-stats">
          {stats.map((s) => (
            <div className="bigo-stat" key={s.k}>
              <span>{s.label}</span>
              <strong>{s.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(frame);
}
