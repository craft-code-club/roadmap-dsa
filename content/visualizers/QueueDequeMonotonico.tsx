"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// QueueDequeMonotonico, o deque decrescente resolvendo o máximo de cada janela
// (LeetCode 239). É a ponte entre este tópico e a Sliding Window.
//
// Gerador PURO de passos + a casca compartilhada. O desenho central tem três
// andares: a fita do array com a janela atual, o deque de ÍNDICES (o detalhe
// que mais confunde: guarda índice, não valor) e a saída sendo montada.
//
// A única coisa que o aluno precisa ver acontecendo: quando um valor maior
// chega, todo mundo menor que ele sai pelo fundo do deque de uma vez, porque
// nenhum deles pode voltar a ser máximo enquanto o novo estiver na janela. Os
// dois contadores (comparações do deque x comparações da força bruta) mostram
// por que isso vira O(n) em vez de O(n·k): aumente o k e só um dos dois cresce.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type Step = {
  i: number; // índice sendo lido, -1 no passo de preparação
  dq: number[]; // índices no deque, da frente para o fundo
  output: number[];
  line: number;
  leaving: number | null; // índice que acabou de sair do deque
  fromFront?: boolean; // a saída foi pela frente (venceu a validade)
  comp: number; // comparações de valores feitas até aqui
  ops: number; // entradas e saídas no deque
  maxDq: number;
  closes?: boolean; // este passo fechou uma janela
  done?: boolean;
  note: string;
};

// As linhas mapeiam 1:1 com o campo `line` de cada passo, então a ordem e a
// quantidade de linhas não podem mudar sem ajustar o gerador junto.
const CODE = [
  "from collections import deque",
  "",
  "def maximos_da_janela(nums, k):",
  "    dq = deque()   # ÍNDICES, valores em ordem decrescente",
  "    saida = []",
  "    for i, v in enumerate(nums):",
  "        while dq and nums[dq[-1]] <= v:",
  "            dq.pop()",
  "        dq.append(i)",
  "        if dq[0] <= i - k:",
  "            dq.popleft()",
  "        if i >= k - 1:",
  "            saida.append(nums[dq[0]])",
  "    return saida",
];

const SPEEDS = [0, 1400, 950, 650, 420, 250];

function generateSteps(nums: number[], k: number): Step[] {
  const out: Step[] = [];
  const dq: number[] = [];
  const output: number[] = [];
  let comp = 0;
  let ops = 0;
  let maxDq = 0;

  const reg = (p: { i: number; line: number; note: string; leaving?: number; fromFront?: boolean; closes?: boolean; done?: boolean }) => {
    out.push({
      i: p.i,
      dq: [...dq],
      output: [...output],
      line: p.line,
      leaving: p.leaving ?? null,
      fromFront: p.fromFront,
      comp,
      ops,
      maxDq,
      closes: p.closes,
      done: p.done,
      note: p.note,
    });
  };

  reg({
    i: -1,
    line: 3,
    note: `Deque vazio, saída vazia. Vou passar uma vez só pelo array, com janelas de ${k} ${k === 1 ? "elemento" : "elementos"}.`,
  });

  let guard = 0;
  for (let i = 0; i < nums.length && guard++ < 80; i++) {
    const v = nums[i];
    const windowStart = Math.max(0, i - k + 1);
    reg({
      i,
      line: 5,
      note: `Leio nums[${i}] = ${v}. A janela agora vai de ${windowStart} a ${i}${i < k - 1 ? ", ainda incompleta" : ""}.`,
    });

    while (dq.length && nums[dq[dq.length - 1]] <= v) {
      comp++;
      const dropped = dq[dq.length - 1];
      reg({
        i,
        line: 6,
        leaving: dropped,
        note: `nums[${dropped}] = ${nums[dropped]} é menor ou igual a ${v}, e entrou antes. Enquanto ${v} estiver na janela, ${nums[dropped]} nunca mais vai ser o máximo: descarto pelo fundo.`,
      });
      dq.pop();
      ops++;
      reg({
        i,
        line: 7,
        note: `Fora o índice ${dropped}. O deque fica com ${dq.length} ${dq.length === 1 ? "índice" : "índices"}.`,
      });
    }
    if (dq.length) comp++;

    dq.push(i);
    ops++;
    reg({
      i,
      line: 8,
      note:
        dq.length > 1
          ? `nums[${dq[dq.length - 2]}] = ${nums[dq[dq.length - 2]]} é maior que ${v}, então paro de descartar e guardo o índice ${i} no fundo. O deque continua decrescente: ${dq
              .map((j) => nums[j])
              .join(" > ")}.`
          : `O deque tinha esvaziado, então o índice ${i} entra sozinho: ${v} é o maior de toda a janela atual.`,
    });

    if (dq[0] <= i - k) {
      const stale = dq[0];
      reg({
        i,
        line: 9,
        leaving: stale,
        fromFront: true,
        note: `O índice ${stale} está na frente, mas a janela começa em ${windowStart}: ele venceu a validade. O maior valor da janela anterior ficou para trás.`,
      });
      dq.shift();
      ops++;
      reg({
        i,
        line: 10,
        note: `Tiro o ${stale} pela frente. Agora quem manda é o índice ${dq[0]}, com valor ${nums[dq[0]]}.`,
      });
    }
    // O maior deque é medido depois da validade: por um instante ele chega a ter
    // k + 1 índices, mas o tamanho que sustenta o O(k) de memória é o que sobra
    // quando o passo termina.
    maxDq = Math.max(maxDq, dq.length);

    if (i >= k - 1) {
      output.push(nums[dq[0]]);
      reg({
        i,
        line: 12,
        closes: true,
        note: `Janela [${windowStart}..${i}] fechada. O máximo é nums[${dq[0]}] = ${nums[dq[0]]}, que está na frente do deque: leio sem comparar nada.`,
      });
    } else {
      reg({
        i,
        line: 11,
        note: `Ainda não tenho ${k} elementos lidos, então esta janela não conta. Sigo para o próximo índice.`,
      });
    }
  }

  const windows = Math.max(0, nums.length - k + 1);
  const brute = windows * Math.max(0, k - 1);
  reg({
    i: nums.length - 1,
    line: 13,
    done: true,
    note: `Fim: saída = [${output.join(", ")}]. Foram ${comp} ${comp === 1 ? "comparação" : "comparações"} de valores, contra ${brute} que a força bruta faria para reolhar as ${windows} ${
      windows === 1 ? "janela" : "janelas"
    }.`,
  });
  return out;
}

type Preset = { key: string; label: string; nums: number[]; k: number };
const PRESETS: Preset[] = [
  { key: "lc239", label: "LeetCode 239", nums: [1, 3, -1, -3, 5, 3, 6, 7], k: 3 },
  { key: "validade", label: "O máximo vence a validade", nums: [8, 1, 2, 3, 4, 5], k: 3 },
  { key: "desc", label: "Decrescente (deque cheio)", nums: [9, 8, 7, 6, 5, 4, 3, 2], k: 3 },
  { key: "cresc", label: "Crescente (deque de um)", nums: [1, 2, 3, 4, 5, 6, 7, 8], k: 3 },
  { key: "iguais", label: "Tudo igual", nums: [5, 5, 5, 5, 5, 5], k: 3 },
];

const DEFAULT_PRESET = PRESETS[0];

export function QueueDequeMonotonico() {
  const [nums, setNums] = useState<number[]>(DEFAULT_PRESET.nums);
  const [text, setText] = useState(DEFAULT_PRESET.nums.join(", "));
  const [k, setK] = useState(DEFAULT_PRESET.k);
  const [preset, setPreset] = useState(DEFAULT_PRESET.key);

  const kUsed = Math.min(Math.max(1, k), Math.max(1, nums.length));
  const steps = useMemo(() => generateSteps(nums.length ? nums : [0], kUsed), [nums, kUsed]);

  const viz = useVisualizer({
    title: "Visualizador · deque monotônico: o máximo de cada janela",
    total: steps.length,
    speeds: SPEEDS,
    // O que muda a altura da peça: o tamanho do array (as células e as fichas
    // da saída quebram linha) e o k, que decide quantas janelas fecham. O
    // número de passos entra porque ele liga e desliga o rodapé inteiro.
    measureOn: [nums.length, kUsed, steps.length],
  });

  const p = steps[viz.step];

  const onTextChange = (v: string) => {
    const arr = v
      .split(",")
      .map((x) => parseInt(x.trim(), 10))
      .filter((x) => !isNaN(x))
      .slice(0, 14);
    viz.reset();
    setPreset("");
    setText(v);
    setNums(arr.length ? arr : [0]);
  };
  const onKChange = (v: string) => {
    const n = parseInt(v, 10);
    viz.reset();
    setPreset("");
    setK(isNaN(n) ? 1 : Math.max(1, Math.min(12, n)));
  };
  const applyPreset = (pr: Preset) => {
    viz.reset();
    setPreset(pr.key);
    setNums(pr.nums);
    setText(pr.nums.join(", "));
    setK(pr.k);
  };
  const shuffle = () => {
    const size = 8;
    const arr = Array.from({ length: size }, () => 1 + Math.floor(Math.random() * 20));
    viz.reset();
    setPreset("");
    setNums(arr);
    setText(arr.join(", "));
    setK(2 + Math.floor(Math.random() * 3));
  };

  const windowStart = p.i < 0 ? 0 : Math.max(0, p.i - kUsed + 1);
  const front = p.dq.length ? p.dq[0] : null;

  const cells = nums.map((v, i) => {
    let cls = "viz-cell";
    if (p.i >= 0 && i >= windowStart && i <= p.i) cls += " in";
    if (p.i >= 0 && i < windowStart) cls += " drop";
    if (i === p.i) cls += " entra";
    if (p.leaving === i) cls += " sai";
    let mark = "";
    if (i === p.i) mark = "i";
    if (front !== null && i === front) mark = mark ? "i máx" : "máx";
    return { i, v, cls, mark };
  });

  const windows = Math.max(0, nums.length - kUsed + 1);
  const brute = windows * Math.max(0, kUsed - 1);

  const vars = [
    { name: "i", value: p.i < 0 ? "-" : `${p.i}` },
    { name: "nums[i]", value: p.i < 0 ? "-" : `${nums[p.i]}` },
    { name: "dq[0]", value: front === null ? "-" : `${front}` },
    { name: "máximo", value: front === null ? "-" : `${nums[front]}`, best: true },
  ];

  const stats = [
    { k: "comp", label: "comparações (deque)", value: `${p.comp}` },
    { k: "bruta", label: "comparações (força bruta)", value: `${brute}` },
    { k: "ops", label: "entradas e saídas no deque", value: `${p.ops}` },
    { k: "maior", label: "maior deque", value: `${p.maxDq}` },
  ];

  const noteClass = "viz-note" + (p.done || p.closes ? " ok" : "");

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
            <span>Array</span>
            <input className="viz-input" value={text} onChange={(e) => onTextChange(e.target.value)} />
          </label>
          <label className="viz-field">
            <span>k</span>
            <input className="viz-input k" type="number" min={1} max={12} value={k} onChange={(e) => onKChange(e.target.value)} />
          </label>
          <button className="viz-btn" onClick={shuffle}>
            Sortear
          </button>
        </div>

        <div className="viz-cells">
          {cells.map((c) => (
            <div className="viz-cell-wrap" key={c.i}>
              <span className="viz-cell-idx">{c.i}</span>
              <div className={c.cls}>{c.v}</div>
              <span className={`viz-mark${c.mark ? " show" : ""}`}>{c.mark || "·"}</span>
            </div>
          ))}
        </div>

        <div className="fila-fila">
          <span className="fila-rot">deque</span>
          <span className="fila-ponta">frente ▸</span>
          <div className="fila-itens">
            {p.dq.length === 0 && <span className="fila-vazio">vazio</span>}
            {p.dq.map((j, pos) => (
              <span key={j} className={`fila-item${pos === 0 ? " frente" : ""}${p.leaving === j ? " saindo" : ""}`}>
                <b>{nums[j]}</b>
                <i>idx {j}</i>
              </span>
            ))}
          </div>
          <span className="fila-ponta">◂ fundo</span>
        </div>

        <div className="fila-fila">
          <span className="fila-rot">saída</span>
          <div className="fila-itens">
            {p.output.length === 0 && <span className="fila-vazio">nenhuma janela fechada ainda</span>}
            {p.output.map((v, i) => (
              <span key={i} className={`fila-item saida${p.closes && i === p.output.length - 1 ? " novo" : ""}`}>
                <b>{v}</b>
              </span>
            ))}
          </div>
        </div>

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com a altura inteira
              do código. O `.viz-code-slot` é o truque de grid 1fr→0fr, a única
              forma de animar altura automática em CSS puro. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">maximos_da_janela.py</div>
              <div className="viz-code-body">
                {CODE.map((txt, i) => (
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
            <p className="fila-resumo">
              n = {nums.length}, k = {kUsed}: são {windows} {windows === 1 ? "janela" : "janelas"} para resolver.
              {k > nums.length ? ` Você pediu k = ${k}, mas não existe janela maior que o array: usei k = ${kUsed}.` : ""}
              {kUsed === 1 ? " Com k = 1 a resposta é o próprio array, e a força bruta não compara nada: o deque vira só custo." : ""}
            </p>
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
