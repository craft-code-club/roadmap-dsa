"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// BSTVisualizer, a invariante construindo e pagando a árvore.
//
// A BST tem uma promessa (busca em O(log n)) e uma letra miúda (só se a árvore
// ficar baixa). Os dois lados moram aqui:
//
//   - modo INSERIR: a árvore nasce valor a valor, e cada valor desce comparando.
//     Trocar o preset de "pelo meio" para "ordenado" faz a mesma sequência de
//     números produzir uma linha reta. É a degeneração acontecendo na tela.
//   - modo BUSCAR: o caminho da busca acende, e o contador compara o número de
//     passos com a varredura linear que a BST está tentando substituir.
//
// Gerador puro em cima de uma árvore imutável reconstruída a cada passo? Não:
// a árvore é construída uma vez (determinística, mesma entrada, mesmo shape) e
// os passos só apontam para nós dela. Navegar para trás fica de graça.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type TreeNode = { v: number; left: number; right: number };

type Step = {
  node: number;        // nó em foco
  path: number[];      // da raiz até o foco
  visible: number;     // quantos nós já foram inseridos
  line: number;
  note: string;
  ok?: boolean;
  failed?: boolean;
};

type Mode = "inserir" | "buscar";

// Python de tela: conteúdo didático em português, mesmo morando numa string.
// `no.esq`, `no.dir` e `no.valor` são o código que o aluno lê — não são os
// identificadores deste arquivo e não acompanham o rename da §0 do contrato.
const INSERT_CODE = [
  "def insere(no, valor):",
  "    if no is None:",
  "        return No(valor)      # nasce sempre como folha",
  "    if valor < no.valor:",
  "        no.esq = insere(no.esq, valor)",
  "    else:",
  "        no.dir = insere(no.dir, valor)",
  "    return no",
];

const SEARCH_CODE = [
  "def busca(no, alvo):",
  "    while no is not None:",
  "        if alvo == no.valor:",
  "            return no          # achei",
  "        if alvo < no.valor:",
  "            no = no.esq        # metade de baixo",
  "        else:",
  "            no = no.dir        # metade de cima",
  "    return None                # não existe",
];

type Preset = { key: string; label: string; order: number[]; hint: string };

const PRESETS: Preset[] = [
  {
    key: "meio",
    label: "Inserindo pelo meio: 4 2 6 1 3 5 7",
    order: [4, 2, 6, 1, 3, 5, 7],
    hint: "Cada valor cai num lado diferente e a árvore fica perfeita: altura 3 para 7 nós.",
  },
  {
    key: "ordenado",
    label: "Inserindo ordenado: 1 2 3 4 5 6 7",
    order: [1, 2, 3, 4, 5, 6, 7],
    hint: "Os MESMOS sete valores. Como cada um é maior que todos os anteriores, ninguém vai para a esquerda: a árvore vira uma lista de altura 7.",
  },
  {
    key: "tipico",
    label: "Um caso típico: 50 30 70 20 40 60 80",
    order: [50, 30, 70, 20, 40, 60, 80],
    hint: "O formato que todo material desenha, e o que você deve esperar de dados razoavelmente embaralhados.",
  },
  {
    key: "quase",
    label: "Quase ordenado: 3 1 2 4 5 6 7",
    order: [3, 1, 2, 4, 5, 6, 7],
    hint: "Basta a cauda vir ordenada para a árvore pender para um lado. Degeneração não é tudo ou nada.",
  },
];

// Constrói a BST inserindo na ordem dada. Determinístico: mesma ordem, mesma
// árvore, o que é justamente a propriedade que o modo "ordenado" explora.
function buildTree(order: number[]): { nodes: TreeNode[]; root: number } {
  const nodes: TreeNode[] = [];
  let root = -1;
  for (const v of order) {
    const fresh = nodes.length;
    nodes.push({ v, left: -1, right: -1 });
    if (root < 0) { root = fresh; continue; }
    let cur = root;
    let guard = 0;
    while (guard++ < 200) {
      if (v < nodes[cur].v) {
        if (nodes[cur].left < 0) { nodes[cur].left = fresh; break; }
        cur = nodes[cur].left;
      } else {
        if (nodes[cur].right < 0) { nodes[cur].right = fresh; break; }
        cur = nodes[cur].right;
      }
    }
  }
  return { nodes, root };
}

function insertSteps(order: number[], nodes: TreeNode[], root: number): Step[] {
  const out: Step[] = [];
  const idOf = new Map<number, number>();
  nodes.forEach((n, i) => { if (!idOf.has(n.v)) idOf.set(n.v, i); });

  for (let k = 0; k < order.length; k++) {
    const v = order[k];
    const goal = idOf.get(v) as number;
    if (k === 0) {
      out.push({
        node: goal, path: [goal], visible: 1, line: 2,
        note: `A árvore estava vazia, então ${v} vira a raiz. Todo valor que entrar depois será comparado com ele primeiro.`,
      });
      continue;
    }
    const path: number[] = [];
    let cur = root;
    let guard = 0;
    while (cur >= 0 && cur !== goal && guard++ < 200) {
      path.push(cur);
      const goLeft = v < nodes[cur].v;
      out.push({
        node: cur, path: [...path], visible: k, line: goLeft ? 4 : 6,
        note: `Onde ${v} mora? Comparo com ${nodes[cur].v}: ${v} ${goLeft ? "<" : ">"} ${nodes[cur].v}, então desço para a ${goLeft ? "esquerda" : "direita"}. A invariante não deixa dúvida: só existe um caminho possível.`,
      });
      cur = goLeft ? nodes[cur].left : nodes[cur].right;
    }
    path.push(goal);
    out.push({
      node: goal, path: [...path], visible: k + 1, line: 2,
      note: `Cheguei num ponto vazio, então ${v} nasce aqui, como FOLHA. Inserção em BST nunca mexe no meio da árvore: ela só pendura na ponta do caminho de busca, e por isso custa o mesmo que buscar.`,
    });
  }

  const h = heightOf(nodes, root);
  out.push({
    node: -1, path: [], visible: nodes.length, line: 7, ok: true,
    note: `Árvore montada: ${nodes.length} nós, altura ${h}. A altura mínima possível para ${nodes.length} nós é ${Math.ceil(Math.log2(nodes.length + 1))}. ${h === Math.ceil(Math.log2(nodes.length + 1)) ? "Esta ficou no mínimo: é o melhor caso." : `Esta ficou ${h - Math.ceil(Math.log2(nodes.length + 1))} ${h - Math.ceil(Math.log2(nodes.length + 1)) === 1 ? "nível" : "níveis"} acima do mínimo, e cada nível extra é uma comparação a mais em TODA busca daqui para frente.`}`,
  });
  return out;
}

function searchSteps(target: number, nodes: TreeNode[], root: number): Step[] {
  const out: Step[] = [];
  const path: number[] = [];
  let cur = root;
  let guard = 0;
  while (cur >= 0 && guard++ < 200) {
    path.push(cur);
    if (nodes[cur].v === target) {
      out.push({
        node: cur, path: [...path], visible: nodes.length, line: 3, ok: true,
        note: `Achei ${target} em ${path.length} ${path.length === 1 ? "comparação" : "comparações"}. Uma varredura linear teria olhado até ${nodes.length} elementos: é essa a troca que a BST oferece.`,
      });
      return out;
    }
    const goLeft = target < nodes[cur].v;
    out.push({
      node: cur, path: [...path], visible: nodes.length, line: goLeft ? 5 : 7,
      note: `${target} ${goLeft ? "<" : ">"} ${nodes[cur].v}, então vou para a ${goLeft ? "esquerda" : "direita"} e DESCARTO a outra subárvore inteira sem olhar. É a mesma jogada da busca binária, e é daqui que sai o log.`,
    });
    cur = goLeft ? nodes[cur].left : nodes[cur].right;
  }
  out.push({
    node: -1, path: [...path], visible: nodes.length, line: 8, failed: true,
    note: `Cheguei num ponto vazio: ${target} não está na árvore. Foram ${path.length} ${path.length === 1 ? "comparação" : "comparações"}, e repare que o caminho percorrido é exatamente onde ${target} SERIA inserido. Buscar e inserir são o mesmo passeio.`,
  });
  return out;
}

function heightOf(nodes: TreeNode[], id: number): number {
  if (id < 0) return 0;
  return 1 + Math.max(heightOf(nodes, nodes[id].left), heightOf(nodes, nodes[id].right));
}

const NODE_R = 17;
const STEP_X = 54;
const STEP_Y = 58;
const MARGIN = 22;
const TOP = 20;

function layout(nodes: TreeNode[], root: number) {
  const pos = nodes.map(() => ({ x: 0, depth: 0 }));
  let slot = 0;
  const visit = (id: number, depth: number) => {
    if (id < 0) return;
    visit(nodes[id].left, depth + 1);
    pos[id] = { x: slot++, depth };
    visit(nodes[id].right, depth + 1);
  };
  visit(root, 0);
  return pos;
}

export function BSTVisualizer() {
  const [presetKey, setPresetKey] = useState("meio");
  const [mode, setMode] = useState<Mode>("inserir");
  const [target, setTarget] = useState(7);

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const { nodes, root } = useMemo(() => buildTree(preset.order), [preset]);
  const pos = useMemo(() => layout(nodes, root), [nodes, root]);
  const steps = useMemo(
    () => (mode === "inserir" ? insertSteps(preset.order, nodes, root) : searchSteps(target, nodes, root)),
    [mode, preset, nodes, root, target]
  );

  const viz = useVisualizer({
    title: "Visualizador · a invariante da BST, construindo e cobrando",
    total: steps.length,
    // A peça abre no 1.5x, não no padrão do hook: a construção tem 18 a 29
    // passos e no 1x a reprodução inteira fica longa demais.
    initialSpeed: 4,
    // O preset é o que MAIS muda a altura, e não pelo número de nós: ele muda a
    // PROFUNDIDADE da árvore, que é o eixo que vira altura (190px de SVG com
    // "pelo meio", 422px com "ordenado", os mesmos 7 nós). O modo acrescenta o
    // campo "Procurar" e uma linha de código. E `steps.length` entra porque ele
    // atravessa 1: buscar a raiz devolve UM passo, e aí o rodapé inteiro some.
    measureOn: [presetKey, mode, steps.length],
  });

  const p = steps[viz.step];

  const changePreset = (k: string) => { viz.reset(); setPresetKey(k); };
  const changeMode = (m: Mode) => { viz.reset(); setMode(m); };

  const treeHeight = heightOf(nodes, root);
  const minHeight = Math.ceil(Math.log2(nodes.length + 1));
  const maxSlot = pos.reduce((m, q) => Math.max(m, q.x), 0);
  const maxDepth = pos.reduce((m, q) => Math.max(m, q.depth), 0);
  const W = MARGIN * 2 + maxSlot * STEP_X + NODE_R * 2;
  const H = TOP * 2 + maxDepth * STEP_Y + NODE_R * 2;
  const cx = (id: number) => MARGIN + NODE_R + pos[id].x * STEP_X;
  const cy = (id: number) => TOP + NODE_R + pos[id].depth * STEP_Y;

  const onPath = useMemo(() => new Set(p.path), [p.path]);
  const comparisons = p.path.length;
  const sortedValues = useMemo(() => [...preset.order].sort((a, b) => a - b), [preset]);

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button type="button" key={pr.key} className={`bigo-chip${presetKey === pr.key ? " on" : ""}`} onClick={() => changePreset(pr.key)} aria-pressed={presetKey === pr.key}>
              {pr.label}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">{preset.hint}</p>

        <div className="viz-inputs">
          <div className="viz-field">
            <span>O que mostrar</span>
            <div className="sub-modo">
              <button type="button" className={`sub-modo-btn${mode === "inserir" ? " on" : ""}`} onClick={() => changeMode("inserir")} aria-pressed={mode === "inserir"}>
                construir
              </button>
              <button type="button" className={`sub-modo-btn${mode === "buscar" ? " on" : ""}`} onClick={() => changeMode("buscar")} aria-pressed={mode === "buscar"}>
                buscar
              </button>
            </div>
          </div>
          {mode === "buscar" && (
            <label className="viz-field">
              <span>Procurar</span>
              <input
                className="viz-input k"
                type="number"
                value={target}
                onChange={(e) => { viz.reset(); setTarget(parseInt(e.target.value, 10) || 0); }}
              />
            </label>
          )}
        </div>

        <div className="tt-arv-wrap">
          <svg
            className="tt-arv"
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Árvore de busca binária com ${nodes.length} nós e altura ${treeHeight}. ${p.note}`}
          >
            {nodes.map((node, id) =>
              [node.left, node.right]
                .filter((f) => f >= 0 && f < p.visible)
                .map((f) => (
                  <line
                    key={`${id}-${f}`}
                    className={`tt-aresta${onPath.has(f) && onPath.has(id) ? " on" : ""}`}
                    x1={cx(id)} y1={cy(id) + NODE_R} x2={cx(f)} y2={cy(f) - NODE_R}
                  />
                ))
            )}
            {nodes.map((node, id) => {
              if (id >= p.visible) return null;
              const cls = ["tt-no", "bst-no"];
              if (id === p.node) cls.push("on");
              else if (onPath.has(id)) cls.push("caminho");
              return (
                <g key={id} className={cls.join(" ")}>
                  <circle cx={cx(id)} cy={cy(id)} r={NODE_R} />
                  <text x={cx(id)} y={cy(id) + 4} textAnchor="middle">{node.v}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <p className={"viz-note" + (p.ok ? " ok" : p.failed ? " invalid" : "")}>{p.note}</p>

        <div className="viz-split">
          {/* O `.viz-code-slot` é o que recolhe a ALTURA: zerar a trilha da
              coluna tira só a largura e a linha do grid fica com a altura do
              bloco (contrato §7). */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">{mode === "inserir" ? "insere.py" : "busca.py"}</div>
              <div className="viz-code-body">
                {(mode === "inserir" ? INSERT_CODE : SEARCH_CODE).map((txt, i) => (
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
            <div className="viz-var">
              <span className="viz-var-name">nó atual</span>
              <span className="viz-var-val">{p.node >= 0 ? nodes[p.node].v : "vazio"}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">comparações</span>
              <span className="viz-var-val best">{comparisons}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">varredura linear</span>
              <span className="viz-var-val">{nodes.length}</span>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat"><span>nós</span><strong>{nodes.length}</strong></div>
          <div className="bigo-stat"><span>altura</span><strong>{treeHeight}</strong></div>
          <div className="bigo-stat"><span>altura mínima</span><strong>{minHeight}</strong></div>
          <div className="bigo-stat"><span>pior busca</span><strong>{treeHeight} comparações</strong></div>
        </div>

        <div className="bt-array-bloco">
          <div className="tt-painel-tit">
            Percurso em ordem <em>esquerda, eu, direita</em>
          </div>
          <div className="bt-array">
            {sortedValues.map((v) => (
              <span key={v} className="bt-cel" style={{ paddingTop: 0 }}>{v}</span>
            ))}
          </div>
          <p className="bt-array-nota">
            Independente da ordem em que você inseriu, e independente do formato que a árvore tomou,
            o percurso em ordem devolve esta mesma sequência crescente. A forma muda o custo, nunca o
            conteúdo.
          </p>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Compare os dois primeiros presets: mesmos sete valores, mesma invariante, mesmo código.
          Só a ORDEM de inserção muda, e com ela a altura vai de 3 para 7. A BST não protege
          você de dado ordenado, e é por isso que existem árvores balanceadas.
        </p>
      </div>

      <VizFooter viz={viz} />
    </figure>
  );
}
