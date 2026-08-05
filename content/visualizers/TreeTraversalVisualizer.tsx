"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// TreeTraversalVisualizer, os quatro percursos sobre a MESMA árvore.
//
// A tese do tópico é que pré, em e pós-ordem são o mesmo caminho: muda só o
// instante em que o nó é processado. Para isso ficar visível, o visualizador
// mantém três painéis sincronizados no mesmo passo:
//
//   1. a árvore, com o nó atual, o caminho da raiz até ele e quem já saiu;
//   2. a estrutura auxiliar, que é PILHA no DFS e FILA no BFS (a diferença que
//      explica tudo: LIFO afunda, FIFO espalha);
//   3. a saída, que é a única coisa que muda entre os três DFS.
//
// O gerador é puro: simula a recursão com uma pilha explícita de quadros
// (nó + fase) em vez de recursão de verdade, porque é isso que permite emitir
// um passo por evento e navegar para frente e para trás de graça.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type TreeNode = { value: number; left: number; right: number };

type Order = "pre" | "in" | "post" | "level";

type Step = {
  node: number;
  aux: number[];        // pilha (DFS) ou fila (BFS), de baixo/frente para cima/trás
  output: number[];
  line: number;
  action: "enter" | "process" | "up" | "enqueue" | "end";
  note: string;
  ok?: boolean;
};

type Tree = { key: string; label: string; nodes: TreeNode[]; root: number; legend: string };

// A árvore do encontro: raiz 1, à esquerda o 2 (com 4 e 5), à direita o 3 (com 6).
// É a mesma que foi desenhada no quadro, e é dela que saem as quatro sequências
// que o artigo cita.
const TREES: Tree[] = [
  {
    key: "article",
    label: "A árvore do artigo",
    root: 0,
    legend: "Pré: 1 2 4 5 3 6 · Em: 4 2 5 1 6 3 · Pós: 4 5 2 6 3 1 · Nível: 1 2 3 4 5 6",
    nodes: [
      { value: 1, left: 1, right: 2 },
      { value: 2, left: 3, right: 4 },
      { value: 3, left: 5, right: -1 },
      { value: 4, left: -1, right: -1 },
      { value: 5, left: -1, right: -1 },
      { value: 6, left: -1, right: -1 },
    ],
  },
  {
    key: "bst",
    label: "Uma BST: em ordem sai ordenado",
    root: 0,
    legend: "A mesma máquina, outra arrumação dos valores. Rode em ordem.",
    nodes: [
      { value: 4, left: 1, right: 2 },
      { value: 2, left: 3, right: 4 },
      { value: 5, left: -1, right: 5 },
      { value: 1, left: -1, right: -1 },
      { value: 3, left: -1, right: -1 },
      { value: 6, left: -1, right: -1 },
    ],
  },
  {
    key: "degenerate",
    label: "Degenerada: a pilha vai ao fundo",
    root: 0,
    legend: "Todo nó só tem filho à esquerda: a altura vira n e o O(h) do DFS vira O(n).",
    nodes: [
      { value: 1, left: 1, right: -1 },
      { value: 2, left: 2, right: -1 },
      { value: 3, left: 3, right: -1 },
      { value: 4, left: 4, right: -1 },
      { value: 5, left: 5, right: -1 },
      { value: 6, left: -1, right: -1 },
    ],
  },
];

// O Python da tela é conteúdo didático em português, e continua em português:
// `percorre`, `no.esq`, `no.dir` e `fila` são o que o aluno lê e o que as notas
// do passo a passo explicam.
const CODE: Record<Order, string[]> = {
  pre: [
    "def percorre(no):",
    "    if no is None:",
    "        return",
    "    processa(no)          # PRÉ",
    "    percorre(no.esq)",
    "    percorre(no.dir)",
  ],
  in: [
    "def percorre(no):",
    "    if no is None:",
    "        return",
    "    percorre(no.esq)",
    "    processa(no)          # EM ORDEM",
    "    percorre(no.dir)",
  ],
  post: [
    "def percorre(no):",
    "    if no is None:",
    "        return",
    "    percorre(no.esq)",
    "    percorre(no.dir)",
    "    processa(no)          # PÓS",
  ],
  level: [
    "def por_nivel(raiz):",
    "    fila = deque([raiz])",
    "    while fila:",
    "        no = fila.popleft()",
    "        processa(no)",
    "        if no.esq: fila.append(no.esq)",
    "        if no.dir: fila.append(no.dir)",
  ],
};

const ORDER_LABEL: Record<Order, string> = {
  pre: "Pré-ordem",
  in: "Em ordem",
  post: "Pós-ordem",
  level: "Por nível (BFS)",
};

const ORDERS: Order[] = ["pre", "in", "post", "level"];

// A marcha inicial era `useState(4)` — 1.5x, e não o 1x padrão do hook. Ela
// vira `initialSpeed`, senão a peça passa a abrir mais devagar do que abria.
const INITIAL_SPEED = 4;

// Geometria
const NODE_R = 17;
const STEP_X = 56;
const STEP_Y = 62;
const MARGIN = 24;
const TOP = 22;

type Pos = { x: number; depth: number };

// Layout por posição EM ORDEM: o x de cada nó é o índice dele no percurso em
// ordem, e o y é a profundidade. É o layout canônico de árvore binária e não
// tem sobreposição por construção, inclusive em nó com um filho só.
//
// O efeito colateral é didático de propósito: ler a árvore da esquerda para a
// direita na tela É o percurso em ordem. Numa BST, isso significa ler ordenado.
function placeNodes(nodes: TreeNode[], root: number): Pos[] {
  const pos: Pos[] = nodes.map(() => ({ x: 0, depth: 0 }));
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

function generateSteps(nodes: TreeNode[], root: number, order: Order): Step[] {
  const out: Step[] = [];
  const output: number[] = [];
  const name = (id: number) => `${nodes[id].value}`;

  if (order === "level") {
    const queue: number[] = [root];
    out.push({
      node: root, aux: [...queue], output: [], line: 1, action: "enqueue",
      note: `Começo com a raiz sozinha na fila. A fila é a única diferença estrutural entre o BFS e o DFS: ela devolve quem chegou primeiro, então o percurso espalha em vez de afundar.`,
    });
    let guard = 0;
    while (queue.length && guard++ < 200) {
      const id = queue.shift() as number;
      output.push(id);
      const children = [nodes[id].left, nodes[id].right].filter((f) => f >= 0);
      out.push({
        node: id, aux: [...queue], output: [...output], line: 4, action: "process",
        note: `Tiro o ${name(id)} da frente da fila e processo agora. Um nó só entra na fila depois do pai, então ninguém do próximo nível é processado antes de o nível atual terminar.`,
      });
      for (const child of children) {
        queue.push(child);
        out.push({
          node: child, aux: [...queue], output: [...output], line: nodes[id].left === child ? 5 : 6, action: "enqueue",
          note: `O ${name(child)} é filho do ${name(id)}, então entra no FIM da fila. Ele vai esperar todo mundo que já estava lá, e é isso que mantém a leitura por níveis.`,
        });
      }
      if (!children.length) {
        out[out.length - 1] = {
          ...out[out.length - 1],
          note: `${out[out.length - 1].note} O ${name(id)} é folha: não acrescenta ninguém à fila.`,
        };
      }
    }
    out.push({
      node: -1, aux: [], output: [...output], line: 2, action: "end", ok: true,
      note: `Fila vazia, percurso terminado: ${output.map(name).join(", ")}. Foram ${output.length} nós, cada um processado uma vez, então o tempo é O(n). O espaço é o tamanho da fila no pior momento, que é o nível mais largo da árvore.`,
    });
    return out;
  }

  // DFS: pilha explícita de quadros, em vez de recursão de verdade, para poder
  // emitir um passo por evento e navegar para trás.
  //
  // `phase` conta quantos filhos já foram despachados (0, 1 ou 2) e `processed`
  // marca se o nó já saiu. É esse par que faz o MESMO laço servir para as três
  // ordens: muda só o valor de `target`, ou seja, em qual fase o nó é processado.
  //   pré  -> target 0 (antes de despachar a esquerda)
  //   em   -> target 1 (entre esquerda e direita)
  //   pós  -> target 2 (depois dos dois filhos)
  const target = order === "pre" ? 0 : order === "in" ? 1 : 2;
  const processLine = order === "pre" ? 3 : order === "in" ? 4 : 5;
  const leftLine = order === "pre" ? 4 : 3;
  const rightLine = order === "post" ? 4 : 5;
  const stack: { id: number; phase: number; processed: boolean }[] = [
    { id: root, phase: 0, processed: false },
  ];
  const stackIds = () => stack.map((q) => q.id);

  out.push({
    node: root, aux: stackIds(), output: [], line: 0, action: "enter",
    note: `Entro na raiz. No DFS a estrutura auxiliar é uma PILHA, e na versão recursiva ela é a própria pilha de chamadas do programa: cada nível que eu desço empilha um quadro.`,
  });

  let guard = 0;
  while (stack.length && guard++ < 400) {
    const top = stack[stack.length - 1];
    const node = nodes[top.id];

    if (!top.processed && top.phase === target) {
      output.push(top.id);
      top.processed = true;
      const explanation =
        order === "pre"
          ? `antes de olhar qualquer filho`
          : order === "in"
            ? `depois de resolver toda a subárvore esquerda e antes de tocar na direita`
            : `só depois que os dois filhos já saíram`;
      out.push({
        node: top.id, aux: stackIds(), output: [...output], line: processLine, action: "process",
        note: `Processo o ${name(top.id)} ${explanation}. É a única linha que muda entre as três ordens, e é ela que decide a saída inteira.`,
      });
      continue;
    }

    if (top.phase <= 1) {
      const child = top.phase === 0 ? node.left : node.right;
      // "esquerda" e "direita" são o texto que entra na nota: conteúdo, não nome.
      const side = top.phase === 0 ? "esquerda" : "direita";
      top.phase++;
      if (child >= 0) {
        stack.push({ id: child, phase: 0, processed: false });
        out.push({
          node: child, aux: stackIds(), output: [...output], line: side === "esquerda" ? leftLine : rightLine, action: "enter",
          note: `Desço para a ${side} do ${name(top.id)} e entro no ${name(child)}. A pilha está com ${stack.length} ${stack.length === 1 ? "quadro" : "quadros"}: ela nunca passa da altura da árvore, e é por isso que o espaço do DFS é O(h), não O(n).`,
        });
      } else {
        out.push({
          node: top.id, aux: stackIds(), output: [...output], line: 2, action: "up",
          note: `O ${name(top.id)} não tem filho à ${side}: a chamada bate no caso base e volta na hora, sem empilhar nada.`,
        });
      }
      continue;
    }

    // fase 2 e já processado: desempilha
    stack.pop();
    const parent = stack.length ? nodes[stack[stack.length - 1].id] : null;
    out.push({
      node: top.id, aux: stackIds(), output: [...output], line: 5, action: "up",
      note: parent
        ? `Terminei o ${name(top.id)} e os dois filhos dele. Desempilho e volto para o pai, que continua exatamente de onde parou.`
        : `Desempilho a raiz: a pilha ficou vazia e o percurso acabou.`,
    });
  }

  out.push({
    node: -1, aux: [], output: [...output], line: processLine, action: "end", ok: true,
    note: `${ORDER_LABEL[order]}: ${output.map(name).join(", ")}. Foram ${output.length} nós visitados uma vez cada, O(n) de tempo. O pico da pilha foi a altura da árvore, e não o número de nós.`,
  });
  return out;
}

export function TreeTraversalVisualizer() {
  const [treeKey, setTreeKey] = useState("article");
  const [order, setOrder] = useState<Order>("pre");

  const tree = useMemo(
    () => TREES.find((a) => a.key === treeKey) ?? TREES[0],
    [treeKey]
  );
  const pos = useMemo(() => placeNodes(tree.nodes, tree.root), [tree]);
  const steps = useMemo(() => generateSteps(tree.nodes, tree.root, order), [tree, order]);
  const total = steps.length;

  const viz = useVisualizer({
    title: "Visualizador · os quatro percursos sobre a mesma árvore",
    total,
    initialSpeed: INITIAL_SPEED,
    // O que muda a altura da peça: a ordem (o código vai de 6 a 7 linhas) e a
    // árvore (a altura do SVG é a PROFUNDIDADE — a degenerada tem 6 níveis
    // contra 3 das outras duas, e são 186px de diferença).
    measureOn: [order, treeKey],
  });

  const idx = viz.step;
  const p = steps[idx];

  const pickOrder = (o: Order) => { viz.reset(); setOrder(o); };
  const pickTree = (k: string) => { viz.reset(); setTreeKey(k); };

  const maxSlot = pos.reduce((m, q) => Math.max(m, q.x), 0);
  const maxDepth = pos.reduce((m, q) => Math.max(m, q.depth), 0);
  const W = MARGIN * 2 + maxSlot * STEP_X + NODE_R * 2;
  const H = TOP * 2 + maxDepth * STEP_Y + NODE_R * 2;
  const cx = (id: number) => MARGIN + NODE_R + pos[id].x * STEP_X;
  const cy = (id: number) => TOP + NODE_R + pos[id].depth * STEP_Y;

  const alreadyOut = useMemo(() => new Set(p.output), [p.output]);
  const inAux = useMemo(() => new Set(p.aux), [p.aux]);

  const nodeClass = (id: number) => {
    const cls = ["tt-no"];
    if (id === p.node) cls.push("on");
    if (alreadyOut.has(id)) cls.push("saiu");
    else if (inAux.has(id)) cls.push("aux");
    return cls.join(" ");
  };

  const isBfs = order === "level";
  const code = CODE[order];
  const noteClass = "viz-note" + (p.ok ? " ok" : "");
  const auxPeak = useMemo(() => steps.reduce((m, q) => Math.max(m, q.aux.length), 0), [steps]);

  const vars = [
    { name: "nó atual", value: p.node >= 0 ? `${tree.nodes[p.node].value}` : "-" },
    { name: isBfs ? "fila (tamanho)" : "pilha (altura)", value: `${p.aux.length}` },
    { name: "processados", value: `${p.output.length} de ${tree.nodes.length}`, best: true },
  ];

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {ORDERS.map((o) => (
            <button
              key={o}
              className={`bigo-chip${order === o ? " on" : ""}`}
              onClick={() => pickOrder(o)}
              aria-pressed={order === o}
            >
              {ORDER_LABEL[o]}
            </button>
          ))}
        </div>
        <div className="bigo-chips" style={{ marginTop: 2 }}>
          {TREES.map((a) => (
            <button
              key={a.key}
              className={`bigo-chip${treeKey === a.key ? " on" : ""}`}
              onClick={() => pickTree(a.key)}
              aria-pressed={treeKey === a.key}
            >
              {a.label}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">{tree.legend}</p>

        <div className="tt-arv-wrap">
          <svg
            className="tt-arv"
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`${ORDER_LABEL[order]} sobre ${tree.label}. Passo ${idx + 1} de ${total}. ${p.note} Saída até aqui: ${p.output.map((i) => tree.nodes[i].value).join(", ") || "vazia"}.`}
          >
            {tree.nodes.map((node, id) =>
              [node.left, node.right]
                .filter((f) => f >= 0)
                .map((f) => (
                  <line
                    key={`${id}-${f}`}
                    className={`tt-aresta${alreadyOut.has(f) || inAux.has(f) ? " on" : ""}`}
                    x1={cx(id)}
                    y1={cy(id) + NODE_R}
                    x2={cx(f)}
                    y2={cy(f) - NODE_R}
                  />
                ))
            )}
            {tree.nodes.map((node, id) => (
              <g key={id} className={nodeClass(id)}>
                <circle cx={cx(id)} cy={cy(id)} r={NODE_R} />
                <text x={cx(id)} y={cy(id) + 4} textAnchor="middle">{node.value}</text>
              </g>
            ))}
          </svg>
        </div>

        <div className="tt-paineis">
          <div className="tt-painel">
            <div className="tt-painel-tit">
              {isBfs ? "Fila" : "Pilha"} <em>{isBfs ? "sai pela frente (FIFO)" : "sai pelo topo (LIFO)"}</em>
            </div>
            <div className={`tt-aux${isBfs ? " fila" : ""}`}>
              {p.aux.length === 0 ? (
                <span className="tt-vazio">vazia</span>
              ) : (
                p.aux.map((id, i) => (
                  <span key={`${id}-${i}`} className={`tt-aux-item${i === p.aux.length - 1 && !isBfs ? " topo" : ""}${i === 0 && isBfs ? " topo" : ""}`}>
                    {tree.nodes[id].value}
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="tt-painel">
            <div className="tt-painel-tit">
              Saída <em>{ORDER_LABEL[order]}</em>
            </div>
            <div className="tt-saida">
              {p.output.length === 0 ? (
                <span className="tt-vazio">nada processado ainda</span>
              ) : (
                p.output.map((id, i) => (
                  <span key={`${id}-${i}`} className={`tt-saida-item${i === p.output.length - 1 ? " novo" : ""}`}>
                    {tree.nodes[id].value}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          {/* O `.viz-code-slot` é o que recolhe a ALTURA: zerar a trilha da
              coluna sozinha tira só a largura (contrato §7). */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">{isBfs ? "por_nivel.py" : "percorre.py"}</div>
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
            <span>nós na árvore</span>
            <strong>{tree.nodes.length}</strong>
          </div>
          <div className="bigo-stat">
            <span>altura</span>
            <strong>{maxDepth + 1}</strong>
          </div>
          <div className="bigo-stat">
            <span>pico da {isBfs ? "fila" : "pilha"}</span>
            <strong>{auxPeak}</strong>
          </div>
          <div className="bigo-stat">
            <span>passos até o fim</span>
            <strong>{total}</strong>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Troque a ordem sem reiniciar a cabeça: o caminho pela árvore é sempre o mesmo, o que muda é
          a linha em que <code>processa(no)</code> aparece. No BFS muda a estrutura, e aí muda o caminho.
        </p>
      </div>

      <VizFooter viz={viz} />
    </figure>
  );
}
