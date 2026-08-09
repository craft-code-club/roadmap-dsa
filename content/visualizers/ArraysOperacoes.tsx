"use client";

import { useMemo, useState } from "react";

import { thousands } from "@/lib/format";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// ArraysOperacoes, o custo real de cada operação num array.
//
// Padrão "gerador puro de passos" (mesmo do TwoPointersVisualizer): cada
// operação tem o SEU bloco em `CODE`, e o campo `line` de cada passo aponta
// 1:1 para uma linha desse bloco. Trocar de operação troca o código junto.
//
// A única coisa que o aluno precisa ver: o deslocamento em cascata. Ler,
// escrever e mexer na ponta não movem ninguém (O(1)); mexer no meio empurra
// todo mundo que está depois (O(n)). O contador de deslocamentos é o que
// separa os dois, e a projeção para n = 1.000.000 é o que dá escala à conta.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type Step = {
  slots: (number | null)[];
  n: number;
  writes: number | null;
  reads: number | null;
  shifts: number;
  ops: number;
  line: number;
  done?: boolean;
  ok?: boolean;
  note: string;
};

type OpKey = "read" | "push-end" | "insert" | "remove" | "pop-end";

const CODE: Record<OpKey, string[]> = {
  read: [
    "def acessar(nums, k):",
    "    return nums[k]        # base + k * tamanho, uma conta só",
  ],
  "push-end": [
    "def inserir_no_fim(nums, n, valor):",
    "    nums[n] = valor       # a primeira vaga livre",
    "    n = n + 1",
    "    return n",
  ],
  insert: [
    "def inserir(nums, n, k, valor):",
    "    for i in range(n - 1, k - 1, -1):   # do fim até a posição k",
    "        nums[i + 1] = nums[i]           # empurra um passo à direita",
    "    nums[k] = valor",
    "    n = n + 1",
    "    return n",
  ],
  remove: [
    "def remover(nums, n, k):",
    "    for i in range(k, n - 1):           # de k até o penúltimo",
    "        nums[i] = nums[i + 1]           # puxa um passo à esquerda",
    "    n = n - 1",
    "    return n",
  ],
  "pop-end": [
    "def remover_do_fim(nums, n):",
    "    n = n - 1             # só o tamanho muda",
    "    return n              # o valor antigo continua lá, virou lixo",
  ],
};

const LABELS: Record<OpKey, string> = {
  read: "ler nums[k]",
  "push-end": "inserir no fim",
  insert: "inserir na posição k",
  remove: "remover a posição k",
  "pop-end": "remover do fim",
};

const OPS: OpKey[] = ["read", "push-end", "insert", "remove", "pop-end"];

const DEFAULT_NUMS = [12, 7, 45, 3, 20, 8];
const SLACK = 3; // vagas livres à direita, para caber a inserção
const BIG_N = 1000000;

function buildSteps(op: OpKey, nums: number[], rawK: number, value: number): Step[] {
  const out: Step[] = [];
  const n0 = nums.length;
  let slots: (number | null)[] = [...nums, ...Array(SLACK).fill(null)];
  let n = n0;
  let shifts = 0;
  let ops = 0;

  const k = clampK(op, n0, rawK);
  const push = (p: Omit<Step, "slots" | "n" | "shifts" | "ops">) =>
    out.push({ ...p, slots: [...slots], n, shifts, ops });

  if (op === "read") {
    push({
      writes: null,
      reads: null,
      line: 0,
      note: `Quero o valor da posição ${k}. Não vou percorrer nada: o array me dá o endereço por conta.`,
    });
    ops = 1;
    out.push({
      slots: [...slots],
      n,
      shifts,
      ops,
      writes: null,
      reads: k,
      line: 1,
      done: true,
      ok: true,
      note: `Endereço = base + ${k} × tamanho. Leio ${nums[k]} e acabou: 1 operação, com 6 posições ou com 6 milhões. Isso é O(1).`,
    });
    return out;
  }

  if (op === "push-end") {
    push({
      writes: null,
      reads: null,
      line: 0,
      note: `Quero acrescentar ${value}. O primeiro espaço livre é o índice ${n}, e ninguém precisa sair do lugar.`,
    });
    slots = [...slots];
    slots[n] = value;
    ops = 1;
    push({ writes: n, reads: null, line: 1, note: `Escrevo ${value} direto na vaga ${n}. Zero deslocamentos.` });
    n = n + 1;
    push({ writes: n - 1, reads: null, line: 2, note: `O tamanho vai de ${n - 1} para ${n}.` });
    push({
      writes: null,
      reads: null,
      line: 3,
      done: true,
      ok: true,
      note: `Pronto: 1 operação, 0 deslocamentos. Inserir na ponta direita é O(1), e é por isso que append é a operação favorita de qualquer array.`,
    });
    return out;
  }

  if (op === "pop-end") {
    const last = slots[n - 1];
    push({
      writes: null,
      reads: n - 1,
      line: 0,
      note: `Quero tirar o último item (${last}, no índice ${n - 1}). Ninguém depois dele precisa andar, porque não existe ninguém depois dele.`,
    });
    n = n - 1;
    ops = 1;
    push({
      writes: null,
      reads: n,
      line: 1,
      note: `Só recuo o tamanho de ${n + 1} para ${n}. O ${last} continua gravado na memória, virou lixo: some da lista sem sair da RAM.`,
    });
    push({
      writes: null,
      reads: null,
      line: 2,
      done: true,
      ok: true,
      note: `1 operação, 0 deslocamentos: O(1). Da próxima vez que alguém der append, esse byte é sobrescrito e ninguém percebe.`,
    });
    return out;
  }

  if (op === "insert") {
    const occupant = slots[k];
    push({
      writes: null,
      reads: k,
      line: 0,
      note:
        k >= n
          ? `Posição ${k} é logo depois do último item: nada para empurrar.`
          : `Quero enfiar ${value} na posição ${k}, que hoje guarda ${occupant}. Todo mundo de ${k} para a direita tem que andar um passo.`,
    });
    push({
      writes: null,
      reads: null,
      line: 1,
      note:
        k >= n
          ? `O laço vai de ${n - 1} até ${k}, ou seja, não roda nenhuma vez: k = ${k} já é a primeira vaga livre. Zero deslocamentos, este é o caso barato.`
          : `Vou do último item (índice ${n - 1}) até a posição ${k}, de trás para frente. Se eu fosse do começo para o fim, sobrescreveria o vizinho antes de copiá-lo.`,
    });
    let guard = 0;
    for (let i = n - 1; i >= k && guard++ < 200; i--) {
      const v = slots[i];
      slots = [...slots];
      slots[i + 1] = v;
      shifts += 1;
      ops += 1;
      push({
        writes: i + 1,
        reads: i,
        line: 2,
        note: `Copio ${v} do índice ${i} para o ${i + 1}. Deslocamento número ${shifts}.`,
      });
    }
    slots = [...slots];
    slots[k] = value;
    ops += 1;
    push({
      writes: k,
      reads: null,
      line: 3,
      note:
        shifts === 0
          ? `A posição ${k} já estava livre: escrevo ${value} nela sem ter movido ninguém.`
          : `Agora a posição ${k} está vaga: escrevo ${value} nela.`,
    });
    n = n + 1;
    push({ writes: k, reads: null, line: 4, note: `O tamanho vai de ${n - 1} para ${n}.` });
    push({
      writes: null,
      reads: null,
      line: 5,
      done: true,
      ok: true,
      note:
        shifts === 0
          ? `Total: 0 deslocamentos + 1 escrita = 1 operação. O custo é n - k = ${n0} - ${k} = 0, porque não existe ninguém à direita de k: inserir na ponta é o caso barato. Mude o k para 0 e compare.`
          : `Total: ${shifts} ${shifts === 1 ? "deslocamento" : "deslocamentos"} + 1 escrita = ${ops} operações. O custo é n - k = ${n0} - ${k} = ${shifts}, ou seja O(n): quanto mais à esquerda, mais caro.`,
    });
    return out;
  }

  // remover na posição k
  const leaving = slots[k];
  push({
    writes: null,
    reads: k,
    line: 0,
    note: `Quero arrancar o ${leaving} da posição ${k}. O buraco não pode ficar: array não tem buraco, tem sequência.`,
  });
  push({
    writes: null,
    reads: null,
    line: 1,
    note:
      k >= n - 1
        ? `O laço vai de ${k} até ${n - 2}, ou seja, não roda nenhuma vez: não existe ninguém depois da posição ${k} para puxar. Zero deslocamentos.`
        : `Vou de ${k} até o penúltimo (índice ${n - 2}), do começo para o fim, puxando cada vizinho um passo para a esquerda.`,
  });
  let guard = 0;
  for (let i = k; i < n - 1 && guard++ < 200; i++) {
    const v = slots[i + 1];
    slots = [...slots];
    slots[i] = v;
    shifts += 1;
    ops += 1;
    push({
      writes: i,
      reads: i + 1,
      line: 2,
      note: `Puxo ${v} do índice ${i + 1} para o ${i}. Deslocamento número ${shifts}.`,
    });
  }
  n = n - 1;
  push({
    writes: null,
    reads: null,
    line: 3,
    note:
      shifts === 0
        ? `O tamanho cai de ${n + 1} para ${n} e mais nada acontece. O ${leaving} continua gravado exatamente onde estava: saiu do tamanho lógico, virou lixo, e some da lista sem sair da RAM.`
        : `O tamanho cai de ${n + 1} para ${n}. A última posição ficou com uma cópia do item anterior e ninguém apagou nada: ela só saiu do tamanho lógico e virou lixo.`,
  });
  push({
    writes: null,
    reads: null,
    line: 4,
    done: true,
    ok: true,
    note:
      shifts === 0
        ? `Total: 0 deslocamentos. O custo é n - 1 - k = ${n0} - 1 - ${k} = 0, porque a posição ${k} é a última: remover da ponta direita é o caso barato, O(1). Mude o k para 0 e veja o pior caso.`
        : `Total: ${shifts} ${shifts === 1 ? "deslocamento" : "deslocamentos"}. O custo é n - 1 - k = ${n0} - 1 - ${k} = ${shifts}, de novo O(n). Remover a posição 0 é o pior caso: mexe em todo mundo.`,
  });
  return out;
}

// k efetivo: inserir aceita a posição logo depois do último item, as outras não.
function clampK(op: OpKey, n: number, k: number): number {
  const limit = op === "insert" ? n : n - 1;
  return Math.min(Math.max(k, 0), Math.max(0, limit));
}

function worstCaseAtMillion(op: OpKey): string {
  if (op === "read") return "1";
  if (op === "push-end" || op === "pop-end") return "0";
  return thousands(BIG_N);
}

function complexity(op: OpKey): string {
  return op === "insert" || op === "remove" ? "O(n)" : "O(1)";
}

export function ArraysOperacoes() {
  const [input, setInput] = useState(DEFAULT_NUMS.join(", "));
  const [nums, setNums] = useState<number[]>(DEFAULT_NUMS);
  const [op, setOp] = useState<OpKey>("insert");
  const [k, setK] = useState(2);
  const [value, setValue] = useState(99);

  const steps = useMemo(() => buildSteps(op, nums.length ? nums : [0], k, value), [op, nums, k, value]);
  const total = steps.length;
  const code = CODE[op];

  const viz = useVisualizer({
    title: "Visualizador · o que cada operação custa de verdade",
    total,
    // O que muda a altura da peça: a operação (o código vai de 2 a 6 linhas) e
    // quantas células cabem na fita (o array mais a folga da inserção).
    measureOn: [op, nums.length],
  });

  const idx = viz.step;
  const p = steps[idx];

  const onInputChange = (v: string) => {
    const arr = v
      .split(",")
      .map((x) => parseInt(x.trim(), 10))
      .filter((x) => !isNaN(x))
      .slice(0, 12);
    viz.reset();
    setInput(v);
    setNums(arr.length ? arr : [0]);
  };

  const pickOp = (nextOp: OpKey, nextK?: number) => {
    viz.reset();
    setOp(nextOp);
    if (nextK !== undefined) setK(nextK);
  };

  // Presets dos exercícios do artigo: os dois casos de borda em que o custo é
  // ZERO, que é justamente o que a intuição erra.
  const preset = (arr: number[], nextOp: OpKey, nextK: number) => {
    viz.reset();
    setNums(arr);
    setInput(arr.join(", "));
    setOp(nextOp);
    setK(nextK);
  };

  const randomize = () => {
    const count = 5 + Math.floor(Math.random() * 4);
    const arr = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 60));
    viz.reset();
    setNums(arr);
    setInput(arr.join(", "));
    setK(Math.floor(count / 2));
  };

  const effectiveK = clampK(op, nums.length, k);
  const kMark = op === "push-end" || op === "pop-end" ? -1 : effectiveK;

  // Vaga = posição alocada e vazia. Lixo = posição que ainda guarda um valor
  // mas já saiu do tamanho lógico: é exatamente o que sobra depois de um
  // remover, e é a coisa mais contraintuitiva desta estrutura.
  const cells = p.slots.map((v, i) => {
    let cls = "viz-cell";
    if (v === null) cls += " arr-vaga";
    else if (i >= p.n) cls += " arr-lixo";
    if (i === p.reads) cls += " sai";
    if (i === p.writes) cls += " in entra";
    return { i, v, cls, mark: i === kMark ? "k" : "" };
  });

  const vars = [
    { name: "n (tamanho)", value: `${p.n}` },
    { name: "k (posição)", value: op === "push-end" || op === "pop-end" ? "ponta" : `${effectiveK}` },
    { name: "deslocamentos", value: `${p.shifts}` },
    { name: "operações", value: `${p.ops}`, best: true },
  ];

  const noteClass = "viz-note" + (p.done ? " ok" : "");
  const needsK = op === "insert" || op === "remove" || op === "read";
  const needsValue = op === "insert" || op === "push-end";

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Array</span>
            <input className="viz-input" value={input} onChange={(e) => onInputChange(e.target.value)} />
          </label>
          <label className="viz-field">
            <span>posição k</span>
            <input
              className="viz-input k"
              type="number"
              value={k}
              disabled={!needsK}
              onChange={(e) => {
                viz.reset();
                setK(parseInt(e.target.value, 10) || 0);
              }}
            />
          </label>
          <label className="viz-field">
            <span>valor</span>
            <input
              className="viz-input k"
              type="number"
              value={value}
              disabled={!needsValue}
              onChange={(e) => {
                viz.reset();
                setValue(parseInt(e.target.value, 10) || 0);
              }}
            />
          </label>
          <button type="button" className="viz-btn" onClick={randomize}>
            Sortear
          </button>
        </div>

        <div className="arr-tabs" role="group" aria-label="Operação">
          {OPS.map((o) => (
            <button
              type="button"
              key={o}
              className={`arr-tab${o === op ? " on" : ""}`}
              aria-pressed={o === op}
              onClick={() => pickOp(o)}
            >
              {LABELS[o]}
            </button>
          ))}
        </div>

        <div className="viz-cells" style={{ marginTop: 18 }}>
          {cells.map((c) => (
            <div className="viz-cell-wrap" key={c.i}>
              <span className="viz-cell-idx">{c.i}</span>
              <div className={c.cls}>{c.v === null ? "·" : c.v}</div>
              <span className={`viz-mark${c.mark ? " show" : ""}`}>{c.mark || "·"}</span>
            </div>
          ))}
        </div>

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com a altura do
              código. O `.viz-code-slot` é o truque de grid 1fr→0fr, a única
              forma de animar altura automática em CSS puro. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">operacoes.py</div>
              <div className="viz-code-body">
                {code.map((txt, lineNo) => (
                  <div key={lineNo} className={`viz-line${lineNo === p.line ? " on" : ""}`}>
                    <span className="ln">{lineNo + 1}</span>
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
            <span>Deslocamentos aqui</span>
            <strong>{thousands(p.shifts)}</strong>
          </div>
          <div className="bigo-stat">
            <span>Operações aqui</span>
            <strong>{thousands(p.ops)}</strong>
          </div>
          <div className="bigo-stat">
            <span>Pior caso com n = 1 milhão</span>
            <strong>{worstCaseAtMillion(op)}</strong>
          </div>
          <div className="bigo-stat">
            <span>Complexidade</span>
            <strong>{complexity(op)}</strong>
          </div>
        </div>

        {/* Os presets seguem no miolo, e não no rodapé: são onze botões, e no
            painel expandido eles empurrariam os controles de reprodução para
            fora da tela — exatamente o que a casca existe para impedir. */}
        <div className="viz-controls">
          <span className="arr-presets-rot">Compare:</span>
          <button type="button" className="viz-btn" onClick={() => pickOp("insert", 0)}>
            inserir no começo
          </button>
          <button type="button" className="viz-btn" onClick={() => pickOp("insert", 3)}>
            inserir no meio
          </button>
          <button type="button" className="viz-btn" onClick={() => pickOp("push-end")}>
            inserir no fim
          </button>
          <button type="button" className="viz-btn" onClick={() => pickOp("remove", 0)}>
            remover o primeiro
          </button>
        </div>

        <div className="viz-controls">
          <span className="arr-presets-rot">Casos de borda:</span>
          <button type="button" className="viz-btn" onClick={() => preset([42], "remove", 0)} title="Um elemento só, removendo a posição 0">
            n = 1, remover o único
          </button>
          <button
            type="button"
            className="viz-btn"
            onClick={() => preset(DEFAULT_NUMS, "insert", DEFAULT_NUMS.length)}
            title="Inserir na posição igual ao tamanho é inserir no fim"
          >
            k = n, inserir logo após o último
          </button>
          <button type="button" className="viz-btn" onClick={() => preset(DEFAULT_NUMS, "remove", DEFAULT_NUMS.length - 1)}>
            remover a última posição
          </button>
        </div>
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(frame);
}
