"use client";

import { useMemo, useState } from "react";

import { thousands } from "@/lib/format";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// RecursionArvoreVisualizer, a árvore de chamadas do Fibonacci.
//
// Enquanto o RecursionVisualizer mostra a pilha (uma coluna por vez), aqui o
// palco é a árvore inteira: cada chamada vira um nó, e o aluno VÊ o mesmo
// fib(k) sendo recalculado de novo e de novo. Os nós repetidos ficam em cor
// própria justamente para o retrabalho parar de ser um argumento e virar
// desenho.
//
// O gerador é puro: monta a árvore inteira em pré-ordem (que é exatamente a
// ordem das chamadas) e depois só revela um nó por passo. Como a pré-ordem já
// coloca a subárvore de um nó em posições contíguas, o índice do último
// descendente (`end`) diz de graça em que passo o valor daquele nó fica
// pronto: nada de estado externo.
//
// Com o cache ligado, um fib(k) já calculado vira folha roxa e poda a
// subárvore inteira. É a mesma função, e a contagem sai de 21.891 chamadas
// para 39 em fib(20).
//
// A casca vem do `useVisualizer`. Uma nota de medição que vale para quem mexer
// aqui: o número de NÓS explode com n, mas ele vira LARGURA — o SVG mantém o
// tamanho natural (`.rec-arv { display: block }`, sem `width: 100%`) e
// `.rec-arv-wrap` rola na horizontal. O eixo que vira ALTURA é a
// PROFUNDIDADE, que é n − 1 e não muda com o cache: medido, fib(8) sem cache
// (67 nós) e com cache (15 nós) desenham o MESMO SVG de 426px de altura.
// ---------------------------------------------------------------------------

type NodeKind = "base" | "expand" | "memo";

type TreeNode = {
  id: number;
  k: number;
  depth: number;
  parent: number | null;
  children: number[];
  kind: NodeKind;
  value: number;
  repeated: boolean;
  end: number; // índice do último nó da subárvore em pré-ordem
  x: number;   // slot horizontal (em unidades de STEP_X)
};

type Step = {
  node: number;    // -1 no passo final
  line: number;
  repeats: number;
  pruned: number;
  note: string;
  ok?: boolean;
};

const NAIVE_CODE = [
  "def fib(n):",
  "    if n <= 1:",
  "        return n",
  "    return fib(n - 1) + fib(n - 2)",
];

const MEMO_CODE = [
  "memo = {}",
  "",
  "def fib(n):",
  "    if n <= 1:",
  "        return n",
  "    if n in memo:",
  "        return memo[n]",
  "    memo[n] = fib(n - 1) + fib(n - 2)",
  "    return memo[n]",
];

// Geometria da árvore. O SVG rola dentro do próprio container quando fica mais
// largo que a tela, então dá para abrir n = 8 sem a página rolar na horizontal.
const NODE_W = 46;
const NODE_H = 34;
const STEP_X = 52;
const STEP_Y = 52;
const MARGIN = 16;
const TOP = 14;

function fibNum(n: number): number {
  let a = 0;
  let b = 1;
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
}

// Contagem EXATA de chamadas do fib recursivo ingênuo: T(n) = 2·fib(n+1) - 1.
// (T(0) = T(1) = 1, T(n) = 1 + T(n-1) + T(n-2).)
function naiveCalls(n: number): number {
  return 2 * fibNum(n + 1) - 1;
}

// Com memoização top-down cada k acima de 1 é expandido uma vez só e acerta o
// cache uma vez: T(n) = 2n - 1 para n >= 2.
function memoCalls(n: number): number {
  return n <= 1 ? 1 : 2 * n - 1;
}

function build(n0: number, withMemo: boolean): TreeNode[] {
  const nodes: TreeNode[] = [];
  const memo = new Map<number, number>();
  const seen = new Set<number>();

  const visit = (k: number, parent: number | null, depth: number): number => {
    const id = nodes.length;
    const node: TreeNode = {
      id, k, depth, parent, children: [], kind: "expand", value: 0,
      repeated: seen.has(k), end: id, x: 0,
    };
    nodes.push(node);

    if (k <= 1) {
      node.kind = "base";
      node.value = k;
    } else if (withMemo && memo.has(k)) {
      node.kind = "memo";
      node.value = memo.get(k) as number;
    } else if (nodes.length < 400) {
      const a = visit(k - 1, id, depth + 1);
      const b = visit(k - 2, id, depth + 1);
      node.children = [a, b];
      node.value = nodes[a].value + nodes[b].value;
      if (withMemo) memo.set(k, node.value);
    }

    seen.add(k);
    node.end = nodes.length - 1;
    return id;
  };

  visit(n0, null, 0);

  // Layout: cada folha ganha um slot, cada nó interno senta no meio dos filhos.
  let slot = 0;
  const place = (id: number) => {
    const node = nodes[id];
    if (node.children.length === 0) { node.x = slot++; return; }
    place(node.children[0]);
    place(node.children[1]);
    node.x = (nodes[node.children[0]].x + nodes[node.children[1]].x) / 2;
  };
  place(0);

  return nodes;
}

function generateSteps(nodes: TreeNode[], n0: number, withMemo: boolean): Step[] {
  const out: Step[] = [];
  let repeats = 0;
  let pruned = 0;
  let firstBase = true;

  for (const node of nodes) {
    if (node.repeated) repeats++;
    let line: number;
    let note: string;

    if (node.kind === "base") {
      line = withMemo ? 4 : 2;
      if (node.repeated) {
        note = withMemo
          ? `fib(${node.k}) outra vez. O caso base é testado ANTES do cache, então fib(1) e fib(0) continuam sendo recalculados: são as únicas repetições que a memoização não elimina.`
          : `fib(${node.k}) de novo. É caso base, então custa uma chamada só, mas repare quantas folhas iguais a esta a árvore já acumulou.`;
      } else if (firstBase) {
        note = `fib(${node.k}) bate no caso base: devolvo ${node.k} na hora, sem chamar mais ninguém. É a primeira resposta concreta da execução inteira.`;
        firstBase = false;
      } else {
        note = `fib(${node.k}) também é caso base: devolvo ${node.k} direto. Com os dois casos base resolvidos, o nó de cima já consegue somar.`;
      }
    } else if (node.kind === "memo") {
      line = 6;
      // Comparação honesta: o ramo que a versão INGÊNUA teria que refazer aqui.
      // (Com o cache ligado, reexpandir fib(k) custaria só mais 2 chamadas,
      // porque fib(k-1) e fib(k-2) já estariam guardados.)
      const avoided = naiveCalls(node.k) - 1;
      pruned++;
      note = `fib(${node.k}) já está no cache valendo ${thousands(node.value)}. Devolvo na hora e podo a subárvore inteira: sem cache, este mesmo ramo custaria ${thousands(avoided)} ${avoided === 1 ? "chamada" : "chamadas"} abaixo dele.`;
    } else {
      line = withMemo ? 7 : 3;
      const size = node.end - node.id + 1;
      note = node.repeated
        ? `fib(${node.k}) outra vez, e sem cache eu não tenho como saber disso. Vou refazer a subárvore inteira, mais ${thousands(size - 1)} ${size - 1 === 1 ? "chamada" : "chamadas"}, para chegar de novo no mesmo ${thousands(node.value)}.`
        : `Entro em fib(${node.k}). Não sei responder direto, então quebro em fib(${node.k - 1}) e fib(${node.k - 2}) e desço mais um nível.`;
    }

    out.push({ node: node.id, line, repeats, pruned, note });
  }

  const total = nodes.length;
  const answer = nodes[0].value;
  const closing = withMemo
    ? `fib(${n0}) = ${thousands(answer)} com ${thousands(total)} ${total === 1 ? "chamada" : "chamadas"}. Cada valor foi calculado uma vez só: o cache transformou a árvore numa espinha, e a complexidade caiu de exponencial para O(n).`
    : `fib(${n0}) = ${thousands(answer)} depois de ${thousands(total)} ${total === 1 ? "chamada" : "chamadas"}, das quais ${thousands(repeats)} ${repeats === 1 ? "foi" : "foram"} para valores que a árvore já tinha calculado. Com cache seriam ${thousands(memoCalls(n0))}.`;

  out.push({ node: -1, line: withMemo ? 8 : 3, repeats, pruned, note: closing, ok: true });
  return out;
}

type Preset = { key: string; label: string; n: number; memo: boolean };

const PRESETS: Preset[] = [
  { key: "quatro", label: "fib(4): a primeira subárvore refeita", n: 4, memo: false },
  { key: "seis", label: "fib(6): 25 chamadas", n: 6, memo: false },
  { key: "seisMemo", label: "fib(6) com cache: 11 chamadas", n: 6, memo: true },
  { key: "oito", label: "fib(8): o retrabalho fica óbvio", n: 8, memo: false },
];

export function RecursionArvoreVisualizer() {
  const [n, setN] = useState(6);
  const [withMemo, setWithMemo] = useState(false);
  const [preset, setPreset] = useState("seis");

  const nodes = useMemo(() => build(n, withMemo), [n, withMemo]);
  const steps = useMemo(() => generateSteps(nodes, n, withMemo), [nodes, n, withMemo]);

  const viz = useVisualizer({
    title: "Visualizador · a árvore de chamadas do Fibonacci e o retrabalho",
    total: steps.length,
    // A marcha inicial desta peça é a 4 ("1.5x"), não a 3 do hook: a árvore tem
    // dezenas de nós e no 1x a reprodução inteira fica longa demais para quem
    // só quer ver a forma do retrabalho. Era o valor que o componente já tinha.
    initialSpeed: 4,
    // O que muda a altura da peça: `n`, porque a altura do desenho é a
    // PROFUNDIDADE (n − 1) e não o número de nós; e o cache, que troca um
    // código de 4 linhas por um de 9 e acrescenta uma tarja na legenda. Medido:
    // com o cache LIGADO a peça é 81px mais alta (1496 contra 1415 em n = 8),
    // apesar de ter 52 nós a menos.
    measureOn: [n, withMemo],
  });

  const p = steps[viz.step];

  const onChangeN = (v: string) => {
    const x = parseInt(v, 10);
    viz.reset();
    setPreset("");
    setN(isNaN(x) ? 2 : Math.min(8, Math.max(2, x)));
  };
  const toggleMemo = () => { viz.reset(); setPreset(""); setWithMemo((v) => !v); };
  const applyPreset = (pr: Preset) => {
    viz.reset();
    setPreset(pr.key);
    setN(pr.n);
    setWithMemo(pr.memo);
  };

  // Geometria do desenho
  const leaves = nodes.filter((node) => node.children.length === 0).length;
  const maxDepth = nodes.reduce((m, node) => Math.max(m, node.depth), 0);
  const W = MARGIN * 2 + Math.max(0, leaves - 1) * STEP_X + NODE_W;
  const H = TOP * 2 + maxDepth * STEP_Y + NODE_H;
  const cx = (node: TreeNode) => MARGIN + NODE_W / 2 + node.x * STEP_X;
  const cyTop = (node: TreeNode) => TOP + node.depth * STEP_Y;

  // Cadeia da raiz até o nó atual, para acender o caminho da chamada.
  const current = p.node >= 0 ? nodes[p.node] : null;
  const path = useMemo(() => {
    const s = new Set<number>();
    let cur = current;
    while (cur) {
      s.add(cur.id);
      cur = cur.parent === null ? null : nodes[cur.parent];
    }
    return s;
  }, [current, nodes]);

  const nodeClass = (node: TreeNode) => {
    if (viz.step < node.id) return "rec-no futuro";
    if (node.id === p.node) return "rec-no on";
    if (node.kind === "memo") return "rec-no memo";
    if (node.repeated) return "rec-no rep";
    if (node.kind === "base") return "rec-no base";
    return "rec-no";
  };

  const callsSoFar = p.node >= 0 ? p.node + 1 : nodes.length;
  const naiveTotal = naiveCalls(n);
  const memoTotal = memoCalls(n);

  const vars = [
    { name: "n (chamada atual)", value: current ? `${current.k}` : "-" },
    { name: "profundidade", value: current ? `${current.depth}` : "0" },
    { name: "devolve", value: current && viz.step >= current.end ? thousands(current.value) : "pendente" },
    { name: "chamadas", value: thousands(callsSoFar), best: true },
  ];

  const tableRows = [n, 10, 20, 30];

  const noteClass = "viz-note" + (p.ok ? " ok" : "");
  const code = withMemo ? MEMO_CODE : NAIVE_CODE;

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
          <label className="viz-field">
            <span>n</span>
            <input className="viz-input k" type="number" min={2} max={8} value={n} onChange={(e) => onChangeN(e.target.value)} />
          </label>
          <div className="viz-field">
            <span>Memoização</span>
            <div className="sub-modo">
              <button className={`sub-modo-btn${withMemo ? "" : " on"}`} onClick={() => { if (withMemo) toggleMemo(); }} aria-pressed={!withMemo}>
                desligada
              </button>
              <button className={`sub-modo-btn${withMemo ? " on" : ""}`} onClick={() => { if (!withMemo) toggleMemo(); }} aria-pressed={withMemo}>
                ligada
              </button>
            </div>
          </div>
        </div>

        <div className="rec-arv-wrap">
          <svg
            className="rec-arv"
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Árvore de chamadas de fib(${n}) ${withMemo ? "com" : "sem"} memoização. Passo ${viz.step + 1} de ${viz.total}. ${p.note}`}
          >
            {nodes.map((node) =>
              node.children.map((childId) => {
                const child = nodes[childId];
                const lit = path.has(childId) && path.has(node.id);
                const cls = "rec-aresta" + (viz.step < child.id ? " futuro" : lit ? " on" : "");
                return (
                  <line
                    key={`${node.id}-${childId}`}
                    className={cls}
                    x1={cx(node)}
                    y1={cyTop(node) + NODE_H}
                    x2={cx(child)}
                    y2={cyTop(child)}
                  />
                );
              })
            )}
            {nodes.map((node) => {
              const resolved = viz.step >= node.end;
              return (
                <g key={node.id} className={nodeClass(node)}>
                  <rect
                    x={cx(node) - NODE_W / 2}
                    y={cyTop(node)}
                    width={NODE_W}
                    height={NODE_H}
                    rx={8}
                  />
                  <text x={cx(node)} y={cyTop(node) + 13} textAnchor="middle">fib({node.k})</text>
                  <text x={cx(node)} y={cyTop(node) + 26} textAnchor="middle" className="rec-no-val">
                    {resolved ? `= ${thousands(node.value)}` : "= ?"}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="rec-legenda">
          <span><i style={{ background: "rgba(59,130,246,0.7)" }} />chamada atual</span>
          <span><i style={{ background: "rgba(52,211,153,0.5)" }} />caso base novo</span>
          <span><i style={{ background: "rgba(251,191,36,0.55)" }} />valor já calculado antes</span>
          {withMemo ? <span><i style={{ background: "rgba(167,139,250,0.6)" }} />acerto no cache, subárvore podada</span> : null}
        </div>

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          {/* O `.viz-code-slot` recolhe a ALTURA (grid 1fr→0fr); zerar a trilha
              da coluna só tiraria a largura. O bloco continua no DOM para a
              medição enxergar o pior caso, com `inert` tirando ele do teclado e
              dos leitores de tela enquanto está fora de vista. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">{withMemo ? "fib_memo.py" : "fib.py"}</div>
              <div className="viz-code-body">
                {code.map((txt, i) => (
                  <div key={i} className={`viz-line${i === p.line ? " on" : ""}`}>
                    <span className="ln">{i + 1}</span>
                    {txt}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div {...viz.varsProps}>
            <div className="viz-vars-head">Variáveis</div>
            {vars.map((v) => (
              <div className="viz-var" key={v.name}>
                <span className="viz-var-name">{v.name}</span>
                <span className={`viz-var-val${v.best ? " best" : ""}`}>{v.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>chamadas até aqui</span>
            <strong>{thousands(callsSoFar)}</strong>
          </div>
          <div className="bigo-stat">
            <span>chamadas no total</span>
            <strong>{thousands(nodes.length)}</strong>
          </div>
          <div className="bigo-stat">
            <span>{withMemo ? "acertos no cache" : "chamadas repetidas"}</span>
            <strong>{thousands(withMemo ? p.pruned : p.repeats)}</strong>
          </div>
          {/* O contraste que fecha a seção: a árvore tem dezenas de nós, mas a
              pilha nunca passa da profundidade. Tempo exponencial, espaço linear. */}
          <div className="bigo-stat">
            <span>pico da pilha</span>
            <strong>{thousands(maxDepth + 1)}</strong>
          </div>
          <div className="bigo-stat">
            <span>fib({n})</span>
            <strong>{thousands(nodes[0].value)}</strong>
          </div>
        </div>

        <div className="rec-comp-wrap">
          <table className="rec-comp">
            <caption>Chamadas para calcular fib(n), contagem exata</caption>
            <thead>
              <tr>
                <th>n</th>
                <th>sem cache</th>
                <th>com cache</th>
                <th>quantas vezes menos</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((v, i) => (
                <tr key={`${v}-${i}`} className={i === 0 ? "on" : undefined}>
                  <td>{v}{i === 0 ? " (o seu)" : ""}</td>
                  <td>{thousands(naiveCalls(v))}</td>
                  <td>{thousands(memoCalls(v))}</td>
                  <td>{thousands(Math.round(naiveCalls(v) / memoCalls(v)))}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Sem cache, fib({n}) custa {thousands(naiveTotal)} chamadas; com cache, {thousands(memoTotal)}. Em fib(20) a diferença
          é 21.891 contra 39.
        </p>
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(frame);
}
