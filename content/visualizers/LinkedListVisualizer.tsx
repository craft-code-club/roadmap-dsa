"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// LinkedListVisualizer, as operações de uma lista simplesmente encadeada.
//
// O que o aluno precisa ver acontecendo é o RELIGAR DOS PONTEIROS: quais setas
// mudam, em que ordem, e quantos nós o algoritmo percorreu antes de chegar lá.
// Por isso o desenho é um SVG com o nó no formato [valor | prox], e o nó novo
// entra POR BAIXO da linha, como no whiteboard do encontro: é o jeito de deixar
// claro que nenhum outro nó sai do lugar na memória.
//
// Dois interruptores mudam a estrutura e, junto com ela, o código na tela:
// o nó sentinela, que faz o `if pos == 0` desaparecer, e o ponteiro de cauda,
// que transforma o append de O(n) em O(1).
//
// O painel de estatísticas compara "ponteiros religados" com "deslocamentos num
// array": é esse par de números que sustenta o argumento do artigo.
// ---------------------------------------------------------------------------

type Op = "inserir" | "append" | "remover" | "buscar";

type Step = {
  line: number;
  prev: number | null; // índice VISUAL do nó sob o ponteiro que caminha
  found: number | null; // nó encontrado na busca
  showsNew: boolean;
  newAfter: number; // índice visual do antecessor do nó novo (-1 = antes da cabeça)
  linkedOut: boolean; // novo.prox já aponta para o sucessor
  linkedIn: boolean; // o antecessor já aponta para o novo
  headTo: number; // índice visual para onde a seta da cabeça aponta
  headOnNew: boolean;
  loose: number | null; // nó que ficou sem ninguém apontando para ele
  bypass: boolean; // o arco que pula o nó removido já existe
  visited: number;
  relinked: number;
  note: string;
  ok?: boolean;
  done?: boolean;
};

// Um bloco de código por variante. A chave sai de (operação, sentinela, cauda),
// e o campo `line` de cada passo indexa o bloco escolhido: o mapeamento é 1:1,
// então mexer numa linha obriga a mexer no gerador junto.
const CODE: Record<string, string[]> = {
  "inserir-sent": [
    "def inserir(self, pos, valor):",
    "    novo = No(valor)",
    "    anterior = self.cabeca   # o sentinela",
    "    for _ in range(pos):",
    "        anterior = anterior.prox",
    "    novo.prox = anterior.prox",
    "    anterior.prox = novo",
  ],
  inserir: [
    "def inserir(self, pos, valor):",
    "    novo = No(valor)",
    "    if pos == 0:",
    "        novo.prox = self.cabeca",
    "        self.cabeca = novo",
    "        return",
    "    anterior = self.cabeca",
    "    for _ in range(pos - 1):",
    "        anterior = anterior.prox",
    "    novo.prox = anterior.prox",
    "    anterior.prox = novo",
  ],
  "append-cauda": [
    "def append(self, valor):",
    "    novo = No(valor)",
    "    if self.cauda is None:",
    "        self.cabeca = self.cauda = novo",
    "        return",
    "    self.cauda.prox = novo",
    "    self.cauda = novo",
  ],
  append: [
    "def append(self, valor):",
    "    novo = No(valor)",
    "    if self.cabeca is None:",
    "        self.cabeca = novo",
    "        return",
    "    ultimo = self.cabeca",
    "    while ultimo.prox is not None:",
    "        ultimo = ultimo.prox",
    "    ultimo.prox = novo",
  ],
  "remover-sent": [
    "def remover(self, pos):",
    "    anterior = self.cabeca   # o sentinela",
    "    for _ in range(pos):",
    "        anterior = anterior.prox",
    "    anterior.prox = anterior.prox.prox",
  ],
  remover: [
    "def remover(self, pos):",
    "    if pos == 0:",
    "        self.cabeca = self.cabeca.prox",
    "        return",
    "    anterior = self.cabeca",
    "    for _ in range(pos - 1):",
    "        anterior = anterior.prox",
    "    anterior.prox = anterior.prox.prox",
  ],
  buscar: [
    "def buscar(self, valor):",
    "    atual = self.cabeca",
    "    while atual is not None:",
    "        if atual.valor == valor:",
    "            return atual",
    "        atual = atual.prox",
    "    return None",
  ],
};

function codeKey(op: Op, sentinel: boolean, hasTail: boolean): string {
  if (op === "inserir") return sentinel ? "inserir-sent" : "inserir";
  if (op === "remover") return sentinel ? "remover-sent" : "remover";
  if (op === "append") return hasTail ? "append-cauda" : "append";
  return "buscar";
}

function generateSteps(
  values: number[],
  sentinel: boolean,
  hasTail: boolean,
  op: Op,
  pos: number,
  value: number
): Step[] {
  const off = sentinel ? 1 : 0;
  const n = values.length;
  const nVis = n + off;

  const out: Step[] = [];
  let prev: number | null = null;
  let found: number | null = null;
  let showsNew = false;
  let newAfter = -1;
  let linkedOut = false;
  let linkedIn = false;
  let headTo = 0;
  let headOnNew = false;
  let loose: number | null = null;
  let bypass = false;
  let visited = 0;
  let relinked = 0;

  const push = (line: number, note: string, extra: Partial<Step> = {}) => {
    out.push({
      line, note, prev, found, showsNew, newAfter, linkedOut, linkedIn,
      headTo, headOnNew, loose, bypass, visited, relinked, ...extra,
    });
  };

  // Nome de um nó pelo índice VISUAL, do jeito que a nota vai falar dele.
  const nodeName = (v: number | null): string => {
    if (v === null || v >= nVis || v < 0) return "None";
    if (sentinel && v === 0) return "sentinela";
    return `nó ${values[v - off]}`;
  };

  if (op === "inserir") {
    const p = Math.max(0, Math.min(pos, n));
    showsNew = true;
    newAfter = p + off - 1;
    push(1, `Crio o nó ${value}. Ele já está na memória, solto: por enquanto ninguém aponta para ele e ele não aponta para ninguém.`);

    if (!sentinel && p === 0) {
      push(2, `pos = 0 é o caso especial: quem aponta para o primeiro nó não é outro nó, é a variável cabeça. Por isso o if.`);
      linkedOut = true;
      relinked++;
      push(3, `novo.prox = cabeca: o nó ${value} passa a apontar para ${nodeName(0)}. Faço esta ligação PRIMEIRO, porque se eu mexesse na cabeça antes perderia o endereço do resto da lista.`);
      linkedIn = true;
      headOnNew = true;
      relinked++;
      push(4, `cabeca = novo: agora a lista começa no nó ${value}. Dois ponteiros mexidos e nenhum nó saiu do lugar.`);
      push(5, `Pronto. Inserir na frente custa o mesmo com 5 ou com 5 milhões de nós: O(1).`, { ok: true, done: true });
      return out;
    }

    const lPrev = sentinel ? 2 : 6;
    const lHop = sentinel ? 4 : 8;
    const lOut = sentinel ? 5 : 9;
    const lIn = sentinel ? 6 : 10;

    if (!sentinel) push(2, `pos = ${p}, não é 0: sigo pelo caminho de baixo, o que precisa achar o nó anterior à posição.`);

    prev = 0;
    visited = 1;
    push(lPrev, sentinel
      ? `anterior começa no sentinela. Repare que ele nunca é None, nem com a lista vazia: é isso que faz o if sumir.`
      : `anterior começa na cabeça, ${nodeName(0)}.`);

    const hops = sentinel ? p : p - 1;
    for (let h = 0; h < hops; h++) {
      prev = (prev as number) + 1;
      visited++;
      push(lHop, `Ainda não é aqui: avanço para ${nodeName(prev)}. Já são ${visited} nós percorridos, e este é o único pedaço caro da inserção.`);
    }

    const a = prev as number;
    linkedOut = true;
    relinked++;
    push(lOut, `novo.prox = anterior.prox: o nó ${value} passa a apontar para ${nodeName(a + 1)}. A ordem importa, se eu religasse o anterior primeiro perderia o endereço de quem vem depois.`);
    linkedIn = true;
    relinked++;
    push(lIn, n === 0
      ? `anterior.prox = novo: ${nodeName(a)} aponta para o nó ${value}, que virou o único nó da lista. Repare que não precisei de nenhum if para isso.`
      : `anterior.prox = novo: ${nodeName(a)} aponta para o nó ${value} e a lista está inteira de novo. Foram 2 ponteiros, e os outros ${n} nós continuam exatamente onde estavam na memória.`,
      { ok: true, done: true });
    return out;
  }

  if (op === "append") {
    showsNew = true;
    newAfter = nVis - 1;
    linkedOut = true; // um nó recém-criado já aponta para None
    push(1, `Crio o nó ${value}, que já nasce apontando para None. O problema agora é achar quem vai apontar para ele.`);

    if (nVis === 0) {
      push(2, `A lista está vazia: não existe último nó. Este é o único caso em que o append precisa de um if.`);
      headOnNew = true;
      linkedIn = true;
      relinked++;
      push(3, hasTail
        ? `A cabeça e a cauda passam a apontar para o nó ${value}, que é o primeiro e o último ao mesmo tempo.`
        : `A cabeça passa a apontar para o nó ${value}.`);
      push(4, `Fim, com 0 nós percorridos.`, { ok: true, done: true });
      return out;
    }

    if (hasTail) {
      push(2, sentinel
        ? `A cauda não é None (com sentinela ela nunca é), então pulo o if.`
        : `A cauda não é None, então pulo o if.`);
      prev = nVis - 1;
      visited = 1;
      linkedIn = true;
      relinked++;
      push(5, `cauda.prox = novo: ${nodeName(nVis - 1)} passa a apontar para o nó ${value}. Não precisei procurar o fim, o ponteiro de cauda já sabia onde ele estava.`);
      push(6, `cauda = novo. Um ponteiro religado, 1 nó percorrido: com cauda, inserir no fim é O(1).`, { ok: true, done: true });
      return out;
    }

    push(2, `A cabeça não é None, então pulo o if.`);
    prev = 0;
    visited = 1;
    push(5, `ultimo começa na cabeça, ${nodeName(0)}. Este é o ponteiro auxiliar da técnica do dummy pointer: ele existe só para caminhar, a cabeça fica parada.`);
    while ((prev as number) < nVis - 1) {
      push(6, `${nodeName(prev)}.prox não é None, então ainda não cheguei no fim.`);
      prev = (prev as number) + 1;
      visited++;
      push(7, `Avanço para ${nodeName(prev)}. ${visited} nós percorridos até aqui.`);
    }
    push(6, `${nodeName(prev)}.prox é None: cheguei no último. Para descobrir isso precisei visitar os ${visited} nós da lista.`);
    linkedIn = true;
    relinked++;
    push(8, `ultimo.prox = novo. Religar foi 1 ponteiro, o caro foi achar o fim: sem ponteiro de cauda, o append é O(n).`, { ok: true, done: true });
    return out;
  }

  if (op === "remover") {
    if (n === 0) {
      push(0, `A lista está vazia: não existe posição ${pos} para remover. O sentinela evita o if da cabeça, mas não te livra de validar a posição.`, { done: true });
      return out;
    }
    const p = Math.max(0, Math.min(pos, n - 1));

    if (sentinel) {
      prev = 0;
      visited = 1;
      push(1, `anterior começa no sentinela, e nem preciso perguntar se a posição é a 0.`);
      for (let h = 0; h < p; h++) {
        prev = (prev as number) + 1;
        visited++;
        push(3, `Avanço para ${nodeName(prev)}. Preciso parar no nó ANTERIOR ao que vou remover: numa lista simplesmente encadeada, ninguém sabe quem aponta para ele.`);
      }
      loose = p + off;
      bypass = true;
      relinked++;
      push(4, `anterior.prox = anterior.prox.prox: ${nodeName(prev)} passa a apontar direto para ${nodeName(p + off + 1)}. O nó ${values[p]} ficou sem ninguém apontando para ele e vira lixo. Nenhum outro nó se moveu.`, { ok: true, done: true });
      return out;
    }

    if (p === 0) {
      push(1, `pos = 0: de novo o caso especial, porque quem aponta para o primeiro nó é a variável cabeça.`);
      loose = 0;
      headTo = 1;
      relinked++;
      push(2, `cabeca = cabeca.prox: a lista passa a começar em ${nodeName(1)} e o nó ${values[0]} sai. Remover o primeiro é O(1), enquanto num array seria deslocar todo o resto.`);
      push(3, `Fim, com 1 ponteiro religado.`, { ok: true, done: true });
      return out;
    }

    push(1, `pos = ${p}, não é 0: sigo pelo caminho de baixo.`);
    prev = 0;
    visited = 1;
    push(4, `anterior começa na cabeça, ${nodeName(0)}.`);
    for (let h = 0; h < p - 1; h++) {
      prev = (prev as number) + 1;
      visited++;
      push(6, `Avanço para ${nodeName(prev)}. Preciso parar no nó ANTERIOR ao que vou remover: numa lista simplesmente encadeada, ninguém sabe quem aponta para ele.`);
    }
    loose = p;
    bypass = true;
    relinked++;
    push(7, `anterior.prox = anterior.prox.prox: ${nodeName(prev)} passa a apontar direto para ${nodeName(p + 1)}. O nó ${values[p]} ficou solto na memória. Percorri ${visited} nós e religuei 1 ponteiro.`, { ok: true, done: true });
    return out;
  }

  // buscar
  push(1, nVis === 0
    ? `atual começa na cabeça, que é None: a lista está vazia.`
    : `atual começa na cabeça, ${nodeName(0)}. Este é o ponteiro auxiliar que só existe para caminhar, a cabeça continua parada onde estava.`);
  if (nVis > 0) {
    prev = 0;
    visited = 1;
  }
  let i = 0;
  while (i < nVis) {
    prev = i;
    push(2, `atual não é None, então tenho nó para olhar.`);
    const isSentinel = sentinel && i === 0;
    const v = isSentinel ? null : values[i - off];
    if (v === value) {
      found = i;
      push(4, `${v} == ${value}: achei, depois de visitar ${visited} ${visited === 1 ? "nó" : "nós"}. Devolvo a referência do nó, e quem tiver essa referência remove ou insere ao lado dela em O(1).`, { ok: true, done: true });
      return out;
    }
    push(3, isSentinel
      ? `O sentinela não guarda valor de verdade, então ele nunca casa com a busca. Sigo em frente.`
      : `${v} != ${value}: não é este.`);
    i++;
    if (i < nVis) {
      prev = i;
      visited++;
      push(5, `Avanço para ${nodeName(i)}. ${visited} nós visitados.`);
    } else {
      prev = null;
      push(5, `Avanço, e caio no None: a lista acabou.`);
    }
  }
  push(2, `atual é None: não sobrou nó para olhar.`);
  push(6, `O valor ${value} não está na lista. Buscar numa lista encadeada é sempre O(n): não existe pular para o meio, como o array faz com um índice.`, { done: true });
  return out;
}

// --- geometria do desenho ---------------------------------------------------
const BOX_W = 66;
const BOX_H = 42;
const STEP = 96;
const PAD_X = 16;
const CY = 92; // linha principal
const Y_NEW = 180; // linha do nó recém-criado
const X0 = -74; // sobra à esquerda: cabe a etiqueta "cabeça"
const VB_TOP = 6;
const VB_HEIGHT = 206; // com a linha do nó novo
const VB_HEIGHT_SHORT = 148; // sem ela (remover e buscar não criam nó)

type Preset = { key: string; label: string; op: Op; pos: number; value: number; values?: number[] };

const DEFAULT_LIST = [10, 20, 30, 40, 50];

const PRESETS: Preset[] = [
  { key: "meio", label: "Inserir 35 na posição 3", op: "inserir", pos: 3, value: 35 },
  { key: "cabeca", label: "Inserir 5 na cabeça", op: "inserir", pos: 0, value: 5 },
  { key: "fim", label: "Inserir 60 no fim", op: "append", pos: 5, value: 60 },
  { key: "remove", label: "Remover a posição 2", op: "remover", pos: 2, value: 35 },
  { key: "remove0", label: "Remover o primeiro", op: "remover", pos: 0, value: 35 },
  { key: "removeFim", label: "Remover o último", op: "remover", pos: 4, value: 35 },
  { key: "busca", label: "Buscar o valor 40", op: "buscar", pos: 0, value: 40 },
  { key: "busca404", label: "Buscar um valor que não existe", op: "buscar", pos: 0, value: 99 },
  // Os três casos de borda que o artigo manda testar antes de qualquer código.
  { key: "vazia", label: "Lista vazia + inserir", op: "inserir", pos: 0, value: 7, values: [] },
  { key: "um", label: "Um nó só + remover", op: "remover", pos: 0, value: 35, values: [42] },
  { key: "dois", label: "Dois nós + inserir no meio", op: "inserir", pos: 1, value: 15, values: [10, 20] },
];

const OPS: { key: Op; label: string }[] = [
  { key: "inserir", label: "Inserir na posição" },
  { key: "append", label: "Inserir no fim" },
  { key: "remover", label: "Remover a posição" },
  { key: "buscar", label: "Buscar o valor" },
];

export function LinkedListVisualizer() {
  const [values, setValues] = useState<number[]>(DEFAULT_LIST);
  const [input, setInput] = useState(DEFAULT_LIST.join(", "));
  const [op, setOp] = useState<Op>("inserir");
  const [pos, setPos] = useState(3);
  const [value, setValue] = useState(35);
  const [sentinel, setSentinel] = useState(false);
  const [hasTail, setHasTail] = useState(false);
  const [preset, setPreset] = useState("meio");

  const steps = useMemo(
    () => generateSteps(values, sentinel, hasTail, op, pos, value),
    [values, sentinel, hasTail, op, pos, value]
  );
  const total = steps.length;

  const viz = useVisualizer({
    title: "Visualizador · religando ponteiros: inserir, remover e buscar",
    total,
    // O que muda a altura da peça: a operação (o desenho ganha a linha do nó
    // novo, e o bloco de código vai de 5 a 11 linhas), os dois interruptores de
    // estrutura (que trocam a variante do código), o tamanho da lista (o
    // viewBox alarga e o desenho encolhe junto) e o número de passos — remover
    // de uma lista vazia devolve UM passo, e aí o rodapé inteiro some.
    measureOn: [op, sentinel, hasTail, values.length, total],
  });

  const idx = viz.step;
  const p = steps[idx];

  const reset = viz.reset;

  const onInputChange = (v: string) => {
    const arr = v.split(",").map((x) => parseInt(x.trim(), 10)).filter((x) => !isNaN(x)).slice(0, 7);
    reset(); setPreset("");
    setInput(v); setValues(arr);
  };
  const onOpChange = (nextOp: Op) => { reset(); setPreset(""); setOp(nextOp); };
  const onPosChange = (v: string) => { reset(); setPreset(""); setPos(Math.max(0, parseInt(v, 10) || 0)); };
  const onValueChange = (v: string) => { reset(); setPreset(""); setValue(parseInt(v, 10) || 0); };
  const toggleSentinel = () => { reset(); setSentinel((s) => !s); };
  const toggleTail = () => { reset(); setHasTail((s) => !s); };
  const applyPreset = (pr: Preset) => {
    reset(); setPreset(pr.key);
    const novos = pr.values ?? DEFAULT_LIST;
    setValues(novos); setInput(novos.join(", "));
    setOp(pr.op); setPos(pr.pos); setValue(pr.value);
  };
  const shuffle = () => {
    const n = 4 + Math.floor(Math.random() * 3);
    const arr = Array.from({ length: n }, () => 5 + Math.floor(Math.random() * 90));
    reset(); setPreset("");
    setValues(arr); setInput(arr.join(", "));
    setPos(Math.floor(Math.random() * (n + 1)));
    setValue(5 + Math.floor(Math.random() * 90));
  };

  // --- geometria ------------------------------------------------------------
  const off = sentinel ? 1 : 0;
  const n = values.length;
  const nVis = n + off;
  const xNode = (i: number) => PAD_X + i * STEP;
  const xNew = p.newAfter < 0 ? PAD_X - 48 : xNode(p.newAfter) + 48;
  // Piso na largura: com a lista quase vazia o viewBox ficaria estreito e o
  // desenho seria esticado até virar caricatura dentro do container.
  const vbWidth = Math.max(560, PAD_X + nVis * STEP + 52 - X0);
  const xNone = xNode(nVis) - 2;
  // A altura é fixa por operação (nunca por passo), senão o desenho pularia de
  // tamanho no meio da animação.
  const vbHeight = op === "inserir" || op === "append" ? VB_HEIGHT : VB_HEIGHT_SHORT;

  const valueAt = (i: number): string => (sentinel && i === 0 ? "None" : String(values[i - off]));

  // Uma seta morta é a ligação que deixou de existir neste passo (tracejada) ou
  // a que sobrou pendurada no nó solto (apagada).
  const deadArrow = (i: number): "quebrada" | "fantasma" | null => {
    if (p.loose !== null && i === p.loose) return "fantasma";
    if (p.prev !== null && i === p.prev && (p.linkedIn || p.bypass)) return "quebrada";
    return null;
  };

  const code = CODE[codeKey(op, sentinel, hasTail)];

  const pointerLabel =
    op === "buscar" ? "atual" : op === "append" ? (hasTail ? null : "ultimo") : "anterior";

  const vars = [
    { name: pointerLabel ?? "cauda", value: p.prev === null ? "None" : sentinel && p.prev === 0 ? "sentinela" : `nó ${values[p.prev - off]}` },
    { name: "cabeça", value: p.headOnNew ? `nó ${value}` : sentinel ? "sentinela" : p.headTo >= nVis ? "None" : `nó ${values[p.headTo]}` },
    { name: "nós na lista", value: `${n}` },
    { name: "custo", value: operationCost(op, pos, n, hasTail), best: operationCost(op, pos, n, hasTail) === "O(1)" },
  ];

  const shifts =
    op === "inserir" ? Math.max(0, n - Math.min(pos, n))
      : op === "remover" ? (n === 0 ? 0 : Math.max(0, n - 1 - Math.min(pos, n - 1)))
        : 0;

  const stats = [
    { k: "vis", label: "nós percorridos", value: `${p.visited}` },
    { k: "rel", label: "ponteiros religados", value: `${p.relinked}` },
    { k: "arr", label: "deslocamentos num array", value: `${shifts}` },
    { k: "mem", label: "memória extra", value: op === "buscar" || op === "remover" ? "O(1)" : "1 nó" },
  ];

  const noteClass = "viz-note" + (p.ok ? " ok" : p.done ? " invalid" : "");
  const description = `Lista encadeada com ${n} ${n === 1 ? "nó" : "nós"}${n ? `: ${values.join(", ")}` : " (vazia)"}${sentinel ? ", com nó sentinela" : ""}. ${p.note}`;

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="ll-grupo">
          <span className="ll-grupo-rot">Operação</span>
          <div className="bigo-chips">
            {OPS.map((o) => (
              <button
                type="button"
                key={o.key}
                className={`bigo-chip${op === o.key ? " on" : ""}`}
                onClick={() => onOpChange(o.key)}
                aria-pressed={op === o.key}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ll-grupo">
          <span className="ll-grupo-rot">Estrutura</span>
          <div className="bigo-chips">
            <button type="button" className={`bigo-chip${sentinel ? " on" : ""}`} onClick={toggleSentinel} aria-pressed={sentinel}>
              <span className="sw" style={{ background: sentinel ? "#a78bfa" : "#3a4a60" }} />
              nó sentinela
            </button>
            <button type="button" className={`bigo-chip${hasTail ? " on" : ""}`} onClick={toggleTail} aria-pressed={hasTail}>
              <span className="sw" style={{ background: hasTail ? "#34d399" : "#3a4a60" }} />
              ponteiro de cauda
            </button>
          </div>
        </div>

        <div className="ll-grupo">
          <span className="ll-grupo-rot">Casos</span>
          <div className="bigo-chips">
            {PRESETS.map((pr) => (
              <button
                type="button"
                key={pr.key}
                className={`bigo-chip${preset === pr.key ? " on" : ""}`}
                onClick={() => applyPreset(pr)}
                aria-pressed={preset === pr.key}
              >
                {pr.label}
              </button>
            ))}
          </div>
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Valores da lista (até 7)</span>
            <input className="viz-input" value={input} onChange={(e) => onInputChange(e.target.value)} />
          </label>
          {op !== "append" && op !== "buscar" ? (
            <label className="viz-field">
              <span>posição</span>
              <input className="viz-input k" type="number" min={0} value={pos} onChange={(e) => onPosChange(e.target.value)} />
            </label>
          ) : null}
          {op !== "remover" ? (
            <label className="viz-field">
              <span>valor</span>
              <input className="viz-input k" type="number" value={value} onChange={(e) => onValueChange(e.target.value)} />
            </label>
          ) : null}
          <button type="button" className="viz-btn" onClick={shuffle}>Sortear</button>
        </div>

        <div className="ll-svg-wrap">
          <svg className="ll-svg" viewBox={`${X0} ${VB_TOP} ${vbWidth} ${vbHeight}`} role="img" aria-label={description}>
            <defs>
              <marker id="llop-seta" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" fill="#4c5f79" />
              </marker>
              <marker id="llop-seta-ok" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" fill="#34d399" />
              </marker>
              <marker id="llop-seta-off" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" fill="#7d5560" />
              </marker>
            </defs>

            {/* a cabeça é uma variável, não um nó: por isso ela é uma etiqueta */}
            <rect x={-68} y={CY - 14} width={56} height={28} rx={8} fill="#0e1725" stroke="rgba(255,255,255,0.16)" />
            <text x={-40} y={CY} fill="#93bbfd" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={11.5} fontWeight={600} textAnchor="middle" dominantBaseline="central">
              cabeça
            </text>
            {p.headOnNew ? (
              <path
                d={`M -40,${CY + 14} C -40,${CY + 70} ${xNew + 14},${Y_NEW - 70} ${xNew + 14},${Y_NEW - BOX_H / 2 - 4}`}
                fill="none" stroke="#34d399" strokeWidth={1.8} markerEnd="url(#llop-seta-ok)"
              />
            ) : p.headTo === 0 ? (
              <line x1={-10} y1={CY} x2={xNode(0) - 7} y2={CY} stroke="#3a4a60" strokeWidth={1.6} markerEnd="url(#llop-seta)" />
            ) : (
              <path
                d={`M -40,${CY - 15} Q ${(xNode(p.headTo) - 40) / 2},${CY - 66} ${xNode(p.headTo) - 6},${CY - 14}`}
                fill="none" stroke="#34d399" strokeWidth={1.8} markerEnd="url(#llop-seta-ok)"
              />
            )}

            {/* ponteiro de cauda */}
            {hasTail && nVis > 0 ? (
              <g>
                <rect x={xNode(nVis - 1) + 5} y={16} width={56} height={24} rx={8} fill="#0e1725" stroke="rgba(52,211,153,0.4)" />
                <text x={xNode(nVis - 1) + 33} y={28} fill="#6ee7b7" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={11} fontWeight={600} textAnchor="middle" dominantBaseline="central">
                  cauda
                </text>
                <line x1={xNode(nVis - 1) + 33} y1={41} x2={xNode(nVis - 1) + 33} y2={CY - BOX_H / 2 - 5} stroke="rgba(52,211,153,0.5)" strokeWidth={1.5} markerEnd="url(#llop-seta-ok)" />
              </g>
            ) : null}

            {/* setas entre os nós, e a última apontando para None */}
            {Array.from({ length: nVis }, (_, i) => {
              const dead = deadArrow(i);
              const x1 = xNode(i) + 55;
              const x2 = xNode(i + 1) - 7;
              return (
                <line
                  key={`s${i}`}
                  x1={x1} y1={CY} x2={x2} y2={CY}
                  stroke={dead === "quebrada" ? "#7d5560" : "#3a4a60"}
                  strokeWidth={1.6}
                  strokeDasharray={dead ? "4 4" : undefined}
                  opacity={dead === "fantasma" ? 0.3 : 1}
                  markerEnd={dead ? "url(#llop-seta-off)" : "url(#llop-seta)"}
                />
              );
            })}

            {/* arco que pula o nó removido */}
            {p.bypass && p.prev !== null && p.loose !== null ? (
              <path
                d={`M ${xNode(p.prev) + 55},${CY - 16} Q ${(xNode(p.prev) + 55 + xNode(p.loose + 1) - 7) / 2},${CY - 62} ${xNode(p.loose + 1) - 7},${CY - 14}`}
                fill="none" stroke="#34d399" strokeWidth={1.8} markerEnd="url(#llop-seta-ok)"
              />
            ) : null}

            <text x={xNone} y={CY} fill="#61748c" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={12} textAnchor="start" dominantBaseline="central">
              None
            </text>

            {/* os nós */}
            {Array.from({ length: nVis }, (_, i) => {
              const x = xNode(i);
              const isSentinel = sentinel && i === 0;
              const isLoose = p.loose === i;
              const marked = p.prev === i;
              const isFound = p.found === i;
              const stroke = isFound ? "#34d399" : marked ? "#f59e0b" : isSentinel ? "rgba(167,139,250,0.55)" : "rgba(255,255,255,0.14)";
              const fill = isFound ? "rgba(52,211,153,0.18)" : marked ? "rgba(245,158,11,0.14)" : "#0f1826";
              return (
                <g key={`n${i}`} opacity={isLoose ? 0.34 : 1}>
                  <rect
                    x={x} y={CY - BOX_H / 2} width={BOX_W} height={BOX_H} rx={9}
                    fill={fill} stroke={stroke} strokeWidth={1.8}
                    strokeDasharray={isSentinel || isLoose ? "5 4" : undefined}
                  />
                  <line x1={x + 44} y1={CY - BOX_H / 2} x2={x + 44} y2={CY + BOX_H / 2} stroke="rgba(255,255,255,0.12)" strokeWidth={1.2} />
                  <text
                    x={x + 22} y={CY}
                    fill={isFound ? "#d1fae5" : marked ? "#fff" : isSentinel ? "#c4b5fd" : "#b9c9dd"}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    fontSize={isSentinel ? 10.5 : 15} fontWeight={600}
                    textAnchor="middle" dominantBaseline="central"
                  >
                    {valueAt(i)}
                  </text>
                  <circle cx={x + 55} cy={CY} r={3.2} fill="#4c5f79" />
                  {isSentinel ? (
                    <text x={x + 33} y={60} fill="#a78bfa" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={10.5} fontWeight={700} textAnchor="middle" dominantBaseline="central">
                      sentinela
                    </text>
                  ) : null}
                  {marked && pointerLabel ? (
                    // deslocado para a esquerda de propósito: no x + 33 o rótulo
                    // encostaria na curva que sai do campo prox deste nó.
                    <text x={x + 22} y={CY + BOX_H / 2 + 16} fill="#fcd34d" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={11.5} fontWeight={700} textAnchor="middle" dominantBaseline="central">
                      {pointerLabel}
                    </text>
                  ) : null}
                  {isLoose ? (
                    <text x={x + 33} y={CY + BOX_H / 2 + 16} fill="#fca5a5" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={11} fontWeight={700} textAnchor="middle" dominantBaseline="central">
                      solto
                    </text>
                  ) : null}
                </g>
              );
            })}

            {/* o nó novo, desenhado fora da linha: nada na lista sai do lugar */}
            {p.showsNew ? (
              <g>
                <text x={xNew - 8} y={Y_NEW} fill="#6ee7b7" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={11} fontWeight={700} textAnchor="end" dominantBaseline="central">
                  novo
                </text>
                <rect x={xNew} y={Y_NEW - BOX_H / 2} width={BOX_W} height={BOX_H} rx={9} fill="rgba(52,211,153,0.14)" stroke="#34d399" strokeWidth={1.8} />
                <line x1={xNew + 44} y1={Y_NEW - BOX_H / 2} x2={xNew + 44} y2={Y_NEW + BOX_H / 2} stroke="rgba(255,255,255,0.12)" strokeWidth={1.2} />
                <text x={xNew + 22} y={Y_NEW} fill="#d1fae5" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={15} fontWeight={600} textAnchor="middle" dominantBaseline="central">
                  {value}
                </text>
                <circle cx={xNew + 55} cy={Y_NEW} r={3.2} fill="#34d399" />
                {p.linkedOut ? (
                  <path
                    d={`M ${xNew + 55},${Y_NEW} C ${xNew + 55},${Y_NEW - 40} ${xNode(p.newAfter + 1) + 14},${CY + 58} ${xNode(p.newAfter + 1) + 14},${CY + BOX_H / 2 + 4}`}
                    fill="none" stroke="#34d399" strokeWidth={1.8} markerEnd="url(#llop-seta-ok)"
                  />
                ) : null}
                {p.linkedIn && p.newAfter >= 0 ? (
                  <path
                    d={`M ${xNode(p.newAfter) + 55},${CY} C ${xNode(p.newAfter) + 55},${CY + 50} ${xNew + 14},${Y_NEW - 50} ${xNew + 14},${Y_NEW - BOX_H / 2 - 4}`}
                    fill="none" stroke="#34d399" strokeWidth={1.8} markerEnd="url(#llop-seta-ok)"
                  />
                ) : null}
              </g>
            ) : null}
          </svg>
        </div>

        <p className="ll-legenda">
          <span><i style={{ background: "#3a4a60" }} /> ponteiro que já existia</span>
          <span><i style={{ background: "#34d399" }} /> ponteiro religado agora</span>
          <span><i style={{ background: "#7d5560" }} /> ligação que deixou de existir</span>
          <span><i style={{ background: "#f59e0b" }} /> nó sob o ponteiro que caminha</span>
        </p>

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com a altura do
              código. O `.viz-code-slot` é o truque de grid 1fr→0fr, a única
              forma de animar altura automática em CSS puro. O código fica no
              DOM mesmo recolhido, e é isso que permite medir o pior caso;
              `inert` tira ele do teclado enquanto está fora de vista. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">lista_encadeada.py</div>
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
          {stats.map((s) => (
            <div className="bigo-stat" key={s.k}>
              <span>{s.label}</span>
              <strong>{s.value}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(frame);
}

// O custo assintótico da operação escolhida, do jeito que ele aparece no artigo.
function operationCost(op: Op, pos: number, n: number, hasTail: boolean): string {
  if (op === "buscar") return "O(n)";
  if (op === "append") return hasTail ? "O(1)" : "O(n)";
  if (n === 0 || pos <= 0) return "O(1)";
  return "O(n)";
}
