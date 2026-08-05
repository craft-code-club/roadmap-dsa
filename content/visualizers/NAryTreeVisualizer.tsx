"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// NAryTreeVisualizer, o mesmo percurso quando os filhos viram lista.
//
// O tópico tem duas teses e este visualizador carrega as duas:
//
//   1. O template do DFS não muda de ideia, muda de laço: onde a árvore binária
//      escreve `percorre(no.esq); percorre(no.dir)`, a n-ária escreve
//      `for filho in no.filhos: percorre(filho)`. Pré e pós continuam existindo
//      e EM ORDEM morre, porque "o do meio" deixa de estar definido. O chip de
//      "em ordem" existe justamente para ser clicado e explicar a ausência.
//
//   2. Aumentar o grau achata a árvore. A tabela no fim mostra a altura de um
//      milhão de nós conforme o grau cresce, que é o argumento inteiro por trás
//      de B-tree e de índice de banco de dados.
//
// Gerador puro: monta a lista de passos com uma pilha explícita (DFS) ou uma
// fila (BFS), sem estado externo, para navegar nos dois sentidos de graça.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
//
// Nota de medição, para quem mexer nisto: o eixo que vira ALTURA do desenho é a
// PROFUNDIDADE da árvore, não o número de nós nem o grau. Aumentar o grau
// alarga e não sobe — a árvore DOM tem grau 3 e profundidade 4, e é 136px mais
// alta que a do artigo, que tem grau 3 e profundidade 2. Largura rola sozinha,
// porque `.tt-arv-wrap` é `overflow-x: auto`.
// ---------------------------------------------------------------------------

type TreeNode = { label: string; children: number[] };
type Order = "pre" | "post" | "level";

type Step = {
  node: number;
  aux: number[];
  out: number[];
  line: number;
  note: string;
  ok?: boolean;
};

type Tree = { key: string; label: string; nodes: TreeNode[]; caption: string };

// A árvore do encontro: a raiz com dois filhos, e cada um deles com três.
// A pré-ordem dela sai 1 a 9 na sequência, que foi como apareceu no quadro.
const TREES: Tree[] = [
  {
    key: "article",
    label: "A árvore do artigo",
    caption: "Pré: 1 2 3 4 5 6 7 8 9 · Pós: 3 4 5 2 7 8 9 6 1 · Nível: 1 2 6 3 4 5 7 8 9",
    nodes: [
      { label: "1", children: [1, 5] },
      { label: "2", children: [2, 3, 4] },
      { label: "3", children: [] },
      { label: "4", children: [] },
      { label: "5", children: [] },
      { label: "6", children: [6, 7, 8] },
      { label: "7", children: [] },
      { label: "8", children: [] },
      { label: "9", children: [] },
    ],
  },
  {
    key: "files",
    label: "Uma árvore de diretórios",
    caption: "O exemplo mais honesto de árvore n-ária: uma pasta tem quantos filhos quiser.",
    nodes: [
      { label: "/projeto", children: [1, 5, 8] },
      { label: "src", children: [2, 3, 4] },
      { label: "app.py", children: [] },
      { label: "util.py", children: [] },
      { label: "db.py", children: [] },
      { label: "testes", children: [6, 7] },
      { label: "test_app.py", children: [] },
      { label: "test_db.py", children: [] },
      { label: "README.md", children: [] },
    ],
  },
  {
    key: "dom",
    label: "Uma árvore DOM",
    caption: "HTML é uma árvore n-ária, e é por isso que querySelector é um percurso.",
    nodes: [
      { label: "html", children: [1, 2] },
      { label: "head", children: [] },
      { label: "body", children: [3, 4] },
      { label: "header", children: [] },
      { label: "main", children: [5, 6, 7] },
      { label: "h1", children: [] },
      { label: "p", children: [] },
      { label: "ul", children: [8] },
      { label: "li", children: [] },
    ],
  },
];

const CODE: Record<Order, string[]> = {
  pre: [
    "def percorre(no):",
    "    if no is None:",
    "        return",
    "    processa(no)              # PRÉ",
    "    for filho in no.filhos:  # era esq e dir",
    "        percorre(filho)",
  ],
  post: [
    "def percorre(no):",
    "    if no is None:",
    "        return",
    "    for filho in no.filhos:  # era esq e dir",
    "        percorre(filho)",
    "    processa(no)              # PÓS",
  ],
  level: [
    "def por_nivel(raiz):",
    "    fila = deque([raiz])",
    "    while fila:",
    "        no = fila.popleft()",
    "        processa(no)",
    "        for filho in no.filhos:",
    "            fila.append(filho)",
  ],
};

const ORDER_LABEL: Record<Order, string> = {
  pre: "Pré-ordem",
  post: "Pós-ordem",
  level: "Por nível (BFS)",
};

const SPEEDS = [0, 1400, 950, 650, 420, 250];

const STEP_X = 96;
const STEP_Y = 68;
const NODE_W = 84;
const NODE_H = 28;
const MARGIN = 14;
const TOP = 16;

type Pos = { x: number; depth: number };

// Layout n-ário: cada folha ocupa um slot, cada nó interno senta no meio dos
// filhos. Serve para qualquer grau, ao contrário do layout por posição em
// ordem que a árvore binária usa (em ordem não existe aqui).
function place(nodes: TreeNode[]): Pos[] {
  const pos: Pos[] = nodes.map(() => ({ x: 0, depth: 0 }));
  let slot = 0;
  const visit = (id: number, depth: number) => {
    pos[id].depth = depth;
    const f = nodes[id].children;
    if (f.length === 0) { pos[id].x = slot++; return; }
    for (const c of f) visit(c, depth + 1);
    pos[id].x = (pos[f[0]].x + pos[f[f.length - 1]].x) / 2;
  };
  visit(0, 0);
  return pos;
}

function generateSteps(nodes: TreeNode[], order: Order): Step[] {
  const steps: Step[] = [];
  const out: number[] = [];
  const label = (i: number) => nodes[i].label;

  if (order === "level") {
    const queue = [0];
    steps.push({
      node: 0, aux: [...queue], out: [], line: 1,
      note: `A fila começa com a raiz. O BFS não muda nada em árvore n-ária: onde a binária enfileirava dois filhos, aqui um for enfileira quantos existirem.`,
    });
    let guard = 0;
    while (queue.length && guard++ < 300) {
      const id = queue.shift() as number;
      out.push(id);
      steps.push({
        node: id, aux: [...queue], out: [...out], line: 4,
        note: `Processo ${label(id)}, que estava na frente da fila. ${nodes[id].children.length === 0 ? "É folha, não acrescenta ninguém." : `Agora enfileiro os ${nodes[id].children.length} filhos dele, no fim da fila.`}`,
      });
      for (const f of nodes[id].children) {
        queue.push(f);
        steps.push({
          node: f, aux: [...queue], out: [...out], line: 6,
          note: `${label(f)} entra no fim da fila. Ele só será processado depois de todo mundo que já estava lá, e é isso que mantém a leitura nível a nível.`,
        });
      }
    }
    steps.push({
      node: -1, aux: [], out: [...out], line: 2, ok: true,
      note: `Por nível: ${out.map(label).join(", ")}. Cada nó entrou e saiu da fila uma vez, então o tempo é O(n) mesmo com grau qualquer.`,
    });
    return steps;
  }

  const processLine = order === "pre" ? 3 : 5;
  const loopLine = order === "pre" ? 5 : 4;
  const stack: { id: number; i: number; processed: boolean }[] = [{ id: 0, i: 0, processed: false }];
  const stackIds = () => stack.map((q) => q.id);

  steps.push({
    node: 0, aux: stackIds(), out: [], line: 0,
    note: `Entro na raiz. A pilha é a mesma da árvore binária: ela guarda o caminho da raiz até onde estou, nada mais.`,
  });

  let guard = 0;
  while (stack.length && guard++ < 600) {
    const top = stack[stack.length - 1];
    const children = nodes[top.id].children;

    // pré processa antes do laço; pós processa quando o laço terminou
    const dueNow = order === "pre" ? top.i === 0 : top.i >= children.length;
    if (!top.processed && dueNow) {
      out.push(top.id);
      top.processed = true;
      steps.push({
        node: top.id, aux: stackIds(), out: [...out], line: processLine,
        note: order === "pre"
          ? `Processo ${label(top.id)} na chegada, antes de olhar qualquer filho. Com grau qualquer, "antes de todos os filhos" continua fazendo sentido.`
          : `Os ${children.length === 0 ? "zero" : children.length} ${children.length === 1 ? "filho" : "filhos"} de ${label(top.id)} já saíram, então agora processo ele. Pós-ordem é a que mais sobrevive à generalização: "depois de todos os filhos" é sempre bem definido.`,
      });
      continue;
    }

    if (top.i < children.length) {
      const child = children[top.i];
      const position = top.i + 1;
      top.i++;
      stack.push({ id: child, i: 0, processed: false });
      steps.push({
        node: child, aux: stackIds(), out: [...out], line: loopLine,
        note: `Desço para o ${position}º de ${children.length} ${children.length === 1 ? "filho" : "filhos"} de ${label(top.id)}: entro em ${label(child)}. A pilha tem ${stack.length} ${stack.length === 1 ? "quadro" : "quadros"}, e continua limitada pela ALTURA, não pelo grau.`,
      });
      continue;
    }

    stack.pop();
    steps.push({
      node: top.id, aux: stackIds(), out: [...out], line: 5,
      note: stack.length
        ? `Acabou o for de ${label(top.id)}: desempilho e volto para o pai, que retoma o laço dele de onde parou.`
        : `Desempilho a raiz. Percurso terminado.`,
    });
  }

  steps.push({
    node: -1, aux: [], out: [...out], line: processLine, ok: true,
    note: `${ORDER_LABEL[order]}: ${out.map(label).join(", ")}. São ${out.length} nós, cada um visitado uma vez: O(n) de tempo e O(altura) de pilha.`,
  });
  return steps;
}

// Altura mínima de uma árvore de grau k com n nós: log base k de n.
// É a conta que justifica B-tree, e a razão de índice de banco ter grau alto.
function heightFor(n: number, k: number): number {
  if (k < 2) return n;
  return Math.ceil(Math.log(n * (k - 1) + 1) / Math.log(k));
}
function num(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

const DEGREES = [2, 4, 8, 16, 64, 256];
const N_EXAMPLE = 1_000_000;

export function NAryTreeVisualizer() {
  const [treeKey, setTreeKey] = useState("article");
  const [order, setOrder] = useState<Order>("pre");
  const [inOrderNote, setInOrderNote] = useState(false);

  const tree = useMemo(() => TREES.find((a) => a.key === treeKey) ?? TREES[0], [treeKey]);
  const pos = useMemo(() => place(tree.nodes), [tree]);
  const steps = useMemo(() => generateSteps(tree.nodes, order), [tree, order]);

  const viz = useVisualizer({
    title: "Visualizador · o mesmo template quando os filhos viram uma lista",
    total: steps.length,
    speeds: SPEEDS,
    // A marcha inicial desta peça é a 4 ("1.5x"), não a 3 do hook: o percurso
    // mais curto tem 19 passos e o mais longo 28, e no 1x a reprodução inteira
    // fica longa demais para quem só quer ver a forma do percurso. Era o valor
    // que o componente já tinha.
    initialSpeed: 4,
    // O que muda a altura da peça, medido em 1512x900: a ÁRVORE, porque o
    // desenho cresce com a PROFUNDIDADE dela (1228px na do artigo contra 1396
    // na do DOM, que tem dois níveis a mais); a ORDEM, que troca um código de 6
    // linhas por um de 7 e muda o comprimento das notas; e o chip "Em ordem?",
    // que acrescenta um parágrafo de 70px sem mexer em nenhum dos outros dois.
    measureOn: [treeKey, order, inOrderNote],
  });

  const p = steps[viz.step];

  const pickOrder = (o: Order) => { viz.reset(); setInOrderNote(false); setOrder(o); };
  const pickTree = (key: string) => { viz.reset(); setTreeKey(key); };

  const maxSlot = pos.reduce((m, q) => Math.max(m, q.x), 0);
  const maxDepth = pos.reduce((m, q) => Math.max(m, q.depth), 0);
  const W = MARGIN * 2 + maxSlot * STEP_X + NODE_W;
  const H = TOP * 2 + maxDepth * STEP_Y + NODE_H;
  const cx = (id: number) => MARGIN + NODE_W / 2 + pos[id].x * STEP_X;
  const cyTop = (id: number) => TOP + pos[id].depth * STEP_Y;

  const done = useMemo(() => new Set(p.out), [p.out]);
  const inAux = useMemo(() => new Set(p.aux), [p.aux]);
  const isBfs = order === "level";
  const maxDegree = tree.nodes.reduce((m, n) => Math.max(m, n.children.length), 0);

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {(["pre", "post", "level"] as Order[]).map((o) => (
            <button
              key={o}
              className={`bigo-chip${order === o && !inOrderNote ? " on" : ""}`}
              onClick={() => pickOrder(o)}
              aria-pressed={order === o && !inOrderNote}
            >
              {ORDER_LABEL[o]}
            </button>
          ))}
          <button
            className={`bigo-chip na${inOrderNote ? " on" : ""}`}
            onClick={() => setInOrderNote((v) => !v)}
            aria-pressed={inOrderNote}
          >
            Em ordem?
          </button>
        </div>

        {inOrderNote && (
          <p className="viz-note invalid" style={{ marginTop: 10 }}>
            Em ordem não existe em árvore n-ária. A definição é "esquerda, eu, direita", e ela depende
            de haver exatamente dois lados. Com três filhos, onde entra o nó: depois do primeiro?
            do segundo? Não há resposta canônica, então o percurso simplesmente não é definido.
            Pré e pós sobrevivem porque "antes de todos os filhos" e "depois de todos os filhos"
            continuam bem definidos com qualquer grau.
          </p>
        )}

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

        <p className="tt-legenda-arvore">{tree.caption}</p>

        <div className="tt-arv-wrap">
          {/* `width`/`height` de atributo, sem `width: 100%` no CSS: o desenho
              sai no tamanho NATURAL do viewBox (medido: 496x332 renderizado
              contra 496x332 de viewBox). Não há esticão, então não há vazio a
              devolver com um teto de altura — ele encolheria o desenho de
              verdade, texto junto. O que passa da largura rola no wrapper. */}
          <svg
            className="tt-arv"
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`${ORDER_LABEL[order]} sobre ${tree.label}. Passo ${viz.step + 1} de ${viz.total}. ${p.note}`}
          >
            {tree.nodes.map((no, id) =>
              no.children.map((f) => (
                <line
                  key={`${id}-${f}`}
                  className={`tt-aresta${done.has(f) || inAux.has(f) ? " on" : ""}`}
                  x1={cx(id)}
                  y1={cyTop(id) + NODE_H}
                  x2={cx(f)}
                  y2={cyTop(f)}
                />
              ))
            )}
            {tree.nodes.map((no, id) => {
              const cls = ["na-no"];
              if (id === p.node) cls.push("on");
              else if (done.has(id)) cls.push("saiu");
              else if (inAux.has(id)) cls.push("aux");
              return (
                <g key={id} className={cls.join(" ")}>
                  <rect x={cx(id) - NODE_W / 2} y={cyTop(id)} width={NODE_W} height={NODE_H} rx={7} />
                  <text x={cx(id)} y={cyTop(id) + 18} textAnchor="middle">{no.label}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="tt-paineis">
          <div className="tt-painel">
            <div className="tt-painel-tit">
              {isBfs ? "Fila" : "Pilha"} <em>{isBfs ? "FIFO" : "LIFO, altura da árvore"}</em>
            </div>
            <div className="tt-aux">
              {p.aux.length === 0 ? <span className="tt-vazio">vazia</span> : p.aux.map((id, i) => (
                <span key={`${id}-${i}`} className={`tt-aux-item${(isBfs ? i === 0 : i === p.aux.length - 1) ? " topo" : ""}`}>
                  {tree.nodes[id].label}
                </span>
              ))}
            </div>
          </div>
          <div className="tt-painel">
            <div className="tt-painel-tit">Saída <em>{ORDER_LABEL[order]}</em></div>
            <div className="tt-saida">
              {p.out.length === 0 ? <span className="tt-vazio">nada ainda</span> : p.out.map((id, i) => (
                <span key={`${id}-${i}`} className={`tt-saida-item${i === p.out.length - 1 ? " novo" : ""}`}>
                  {tree.nodes[id].label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className={"viz-note" + (p.ok ? " ok" : "")}>{p.note}</p>

        <div className="viz-split">
          {/* O `.viz-code-slot` recolhe a ALTURA (grid 1fr→0fr); zerar a trilha
              da coluna só tiraria a largura. O bloco continua no DOM para a
              medição enxergar o pior caso, com `inert` tirando ele do teclado e
              dos leitores de tela enquanto está fora de vista. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">{isBfs ? "por_nivel.py" : "percorre.py"}</div>
              <div className="viz-code-body">
                {CODE[order].map((txt, i) => (
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
              <span className="viz-var-val">{p.node >= 0 ? tree.nodes[p.node].label : "-"}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">{isBfs ? "fila" : "pilha"}</span>
              <span className="viz-var-val">{p.aux.length}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">processados</span>
              <span className="viz-var-val best">{p.out.length} de {tree.nodes.length}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">grau máximo</span>
              <span className="viz-var-val">{maxDegree}</span>
            </div>
          </div>
        </div>

        {/* `.rec-comp` é do bloco temático da Recursão, e é compartilhada com o
            `RecursionArvoreVisualizer`: a mesma tabela de comparação serve as
            duas aulas. Renomear a classe aqui quebraria a peça de lá. */}
        <div className="rec-comp-wrap">
          <table className="rec-comp">
            <caption>Altura mínima para guardar {num(N_EXAMPLE)} nós, por grau</caption>
            <thead>
              <tr>
                <th>Grau (filhos por nó)</th>
                <th>Altura (nós lidos do disco)</th>
                <th>Comparações no total</th>
              </tr>
            </thead>
            <tbody>
              {DEGREES.map((k) => (
                <tr key={k} className={k === maxDegree ? "on" : undefined}>
                  <td>{k}{k === maxDegree ? " (o desta árvore)" : ""}</td>
                  <td>{heightFor(N_EXAMPLE, k)}</td>
                  <td>~{num(heightFor(N_EXAMPLE, k) * Math.ceil(Math.log2(k)))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          De grau 2 para grau 256, um milhão de nós sai de 20 níveis para 4. Repare na terceira
          coluna: o total de comparações quase não muda, porque você troca níveis por trabalho dentro
          do nó. O que despenca é o número de nós LIDOS, e ler nó é acesso a disco. É por isso que
          banco de dados guarda índice em B-tree, e não em árvore binária.
        </p>
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(frame);
}
