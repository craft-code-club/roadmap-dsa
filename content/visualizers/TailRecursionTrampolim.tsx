"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// TailRecursionTrampolim, a recursão de cauda rodando numa linguagem que não
// otimiza nada.
//
// O TailRecursionVisualizer mostra o que a linguagem faz por você quando tem
// TCO. Este mostra o que VOCÊ faz quando ela não tem: a função devolve um
// thunk em vez de se chamar, e um laço fica batendo nesse thunk. A pilha sobe a
// 2 frames e volta, salto após salto, com qualquer tamanho de lista.
//
// A régua "e se a lista tivesse n = ..." é o fecho: ela põe lado a lado os
// frames da recursão direta (n + 1, que passa do limite padrão de 1.000 do
// Python) e os do trampolim (2, sempre).
//
// A lista padrão [1, 2, 3, 4] e o rastro do acumulador (1, 3, 6, 10) são os
// mesmos do encontro, para o aluno reconhecer a conta de um visualizador para
// o outro.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type State = "espera" | "ativo" | "base" | "pronto";
type Frame = { call: string; pending: string; state: State };
type Step = {
  frames: Frame[];
  line: number;
  acc: number;
  hops: number;
  consumed: number;
  thunk: string | null;
  note: string;
  done: boolean;
  ok: boolean;
};

// As linhas mapeiam 1:1 com o campo `line` de cada passo, então a ordem e a
// quantidade de linhas não podem mudar sem ajustar o gerador junto.
const CODE = [
  "def soma_passo(nums, acc=0):",
  "    if not nums:",
  "        return acc",
  "    return lambda: soma_passo(nums[1:], acc + nums[0])",
  "",
  "def trampolim(f, *args):",
  "    r = f(*args)",
  "    while callable(r):",
  "        r = r()",
  "    return r",
];

const SPEEDS = [0, 1400, 950, 650, 420, 250];

// Formatação determinística de milhar (nada de Intl no caminho de render, senão
// o HTML do build diverge do cliente na hidratação).
function thousands(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function listOf(v: number[]): string {
  return `[${v.join(", ")}]`;
}

function generateSteps(nums: number[]): Step[] {
  const out: Step[] = [];
  const n = nums.length;
  const floor = (pending: string, state: State = "ativo"): Frame => ({
    call: "trampolim(soma_passo, nums)",
    pending,
    state,
  });

  out.push({
    frames: [
      floor("r = f(*args)"),
      { call: `soma_passo(${listOf(nums)}, 0)`, pending: "primeira chamada", state: "espera" },
    ],
    line: 6,
    acc: 0,
    hops: 0,
    consumed: 0,
    thunk: null,
    note:
      n === 0
        ? "Chamo soma_passo uma única vez, de dentro do trampolim. Com a lista vazia ela já cai no caso base."
        : "Chamo soma_passo uma única vez, de dentro do trampolim. Ela não vai recursionar: vai devolver um thunk, que é a próxima chamada embrulhada numa função sem argumentos.",
    done: false,
    ok: false,
  });

  let acc = 0;
  let guard = 0;
  for (let i = 0; i < n && guard++ < 100; i++) {
    const next = acc + nums[i];
    const rest = nums.slice(i + 1);
    out.push({
      frames: [floor(`r = thunk`)],
      line: 3,
      acc: next,
      hops: i,
      consumed: i + 1,
      thunk: `soma_passo(${listOf(rest)}, ${next})`,
      note: `A conta acontece agora, na ida: acc ${acc} + ${nums[i]} = ${next}. Em vez de se chamar, soma_passo embrulha a próxima chamada num thunk e retorna. O frame dela sai da pilha na hora: sobra só o trampolim.`,
      done: false,
      ok: false,
    });
    out.push({
      frames: [
        floor("r = r()"),
        {
          call: `soma_passo(${listOf(rest)}, ${next})`,
          pending: "pendente: nada",
          state: i + 1 === n ? "pronto" : "espera",
        },
      ],
      line: 8,
      acc: next,
      hops: i + 1,
      consumed: i + 1,
      thunk: null,
      note: `O while vê que r ainda é uma função e chama r(). soma_passo volta para a pilha no mesmo lugar de onde a anterior saiu. Salto ${i + 1}: a pilha vai a 2 frames e desce de novo.`,
      done: false,
      ok: false,
    });
    acc = next;
  }

  out.push({
    frames: [
      floor("r = ..."),
      { call: `soma_passo([], ${acc})`, pending: `caso base: retorna ${acc}`, state: "base" },
    ],
    line: 2,
    acc,
    hops: n,
    consumed: n,
    thunk: null,
    note:
      n === 0
        ? "A lista já chegou vazia: o primeiro retorno já é o acumulador 0, e o while nem chega a girar."
        : `Lista vazia: devolvo o acumulador ${acc}. Desta vez o retorno é um número, não uma função.`,
    done: false,
    ok: false,
  });

  out.push({
    frames: [floor(`devolve ${acc}`, "pronto")],
    line: 9,
    acc,
    hops: n,
    consumed: n,
    thunk: null,
    note: `callable(${acc}) é falso, o while para e o trampolim devolve ${acc} depois de ${n} ${n === 1 ? "salto" : "saltos"}. A pilha nunca passou de 2 frames, e não passaria nem com 4 milhões de números.`,
    done: true,
    ok: true,
  });

  return out;
}

const DEFAULT_LIST = [1, 2, 3, 4];

type Preset = { key: string; label: string; nums: number[] };
const PRESETS: Preset[] = [
  { key: "encontro", label: "Do encontro: [1, 2, 3, 4]", nums: DEFAULT_LIST },
  { key: "sete", label: "Sete números", nums: [5, 3, 8, 1, 9, 2, 7] },
  { key: "um", label: "Um elemento só", nums: [7] },
  { key: "vazia", label: "Lista vazia", nums: [] },
];

// Tamanhos hipotéticos da régua, do "cabe na pilha" ao "nem sonhando".
const HYPOTHESES = [10, 100, 500, 999, 5000, 100000];
const PYTHON_LIMIT = 1000;

function parseList(text: string): number[] {
  return text
    .split(",")
    .map((x) => parseInt(x.trim(), 10))
    .filter((x) => !isNaN(x))
    .slice(0, 9);
}

export function TailRecursionTrampolim() {
  const [input, setInput] = useState(DEFAULT_LIST.join(", "));
  const [nums, setNums] = useState<number[]>(DEFAULT_LIST);
  const [preset, setPreset] = useState("encontro");
  const [iHyp, setIHyp] = useState(3); // 999, coladinho no limite

  const steps = useMemo(() => generateSteps(nums), [nums]);
  const n = nums.length;

  const viz = useVisualizer({
    title: "Visualizador · trampolim: recursão de cauda sem ajuda da linguagem",
    total: steps.length,
    speeds: SPEEDS,
    // Só o tamanho da lista muda a altura: a pilha tem teto de 2 frames, e a
    // régua de hipótese só troca dígitos (medido: 0px entre n = 10 e n = 100.000).
    measureOn: [n],
  });

  const p = steps[viz.step];

  const onInputChange = (v: string) => {
    viz.reset();
    setPreset("");
    setInput(v);
    setNums(parseList(v));
  };
  const applyPreset = (pr: Preset) => {
    viz.reset();
    setPreset(pr.key);
    setInput(pr.nums.join(", "));
    setNums(pr.nums);
  };
  // Math.random só em handler de clique: no render quebraria a hidratação.
  const randomize = () => {
    const size = 3 + Math.floor(Math.random() * 4);
    const arr = Array.from({ length: size }, () => 1 + Math.floor(Math.random() * 12));
    viz.reset();
    setPreset("");
    setInput(arr.join(", "));
    setNums(arr);
  };

  const nHyp = HYPOTHESES[iHyp];
  const overflows = nHyp + 1 > PYTHON_LIMIT;

  const cells = nums.map((v, i) => {
    let cls = "viz-cell";
    if (i < p.consumed) cls += " drop";
    if (i === p.consumed) cls += " in";
    return { i, v, cls };
  });

  const vars = [
    { name: "acc", value: `${p.acc}`, best: true },
    { name: "saltos", value: `${p.hops}` },
    { name: "frames", value: `${p.frames.length}` },
    { name: "r", value: p.thunk ? "thunk" : p.done ? `${p.acc}` : "chamando", best: p.done },
  ];

  const stats = [
    { k: "pico", label: "pilha máxima · trampolim", value: "2", cls: "tr-bom" },
    { k: "dir", label: "pilha · recursão direta", value: `${n + 1}`, cls: "" },
    { k: "saltos", label: "saltos até aqui", value: `${p.hops}`, cls: "" },
    { k: "espaco", label: "espaço extra", value: "O(1)", cls: "tr-bom" },
  ];

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              key={pr.key}
              className={`bigo-chip${preset === pr.key ? " on" : ""}`}
              aria-pressed={preset === pr.key}
              onClick={() => applyPreset(pr)}
            >
              {pr.label}
            </button>
          ))}
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Lista de números</span>
            <input className="viz-input" value={input} onChange={(e) => onInputChange(e.target.value)} />
          </label>
          <button className="viz-btn" onClick={randomize}>
            Sortear
          </button>
        </div>

        {n > 0 ? (
          <div className="viz-cells">
            {cells.map((c) => (
              <div className="viz-cell-wrap" key={c.i}>
                <span className="viz-cell-idx">{c.i}</span>
                <div className={c.cls}>{c.v}</div>
                <span className={`viz-mark${c.i === p.consumed ? " show" : ""}`}>
                  {c.i === p.consumed ? "head" : "·"}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="tr-duplo">
          <div className="tr-painel cauda">
            <div className="tr-painel-tit">
              <span>A pilha durante os saltos</span>
              <em>{p.frames.length === 1 ? "1 frame" : `${p.frames.length} frames`}</em>
            </div>
            <div className="tr-pilha">
              {p.frames.map((f, i) => (
                <div className={`tr-frame ${f.state}`} key={`${f.call}-${i}`}>
                  <div className="tr-frame-chamada">{f.call}</div>
                  <div className="tr-frame-pend">{f.pending}</div>
                </div>
              ))}
            </div>
            <div className="tr-chao">base da pilha</div>
          </div>

          <div className="tr-painel">
            <div className="tr-painel-tit">
              <span>O thunk na mão do laço</span>
              <em>salto {p.hops}</em>
            </div>
            <div className="tr-pilha">
              <div className={`tr-frame ${p.thunk ? "ativo" : "livre"}`}>
                <div className="tr-frame-chamada">{p.thunk ?? (p.done ? `r = ${p.acc}` : "r ainda não é um thunk")}</div>
                <div className="tr-frame-pend">
                  {p.thunk ? "uma função esperando ser chamada" : p.done ? "não é função, o while parou" : "o laço está no meio de uma chamada"}
                </div>
              </div>
            </div>
            <div className="tr-chao">r, a variável do while</div>
          </div>
        </div>

        <p className={`viz-note${p.ok ? " ok" : ""}`}>{p.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuava com a altura inteira
              do código. O `.viz-code-slot` é o truque de grid 1fr→0fr, a única
              forma de animar altura automática em CSS puro. O código fica no
              DOM mesmo recolhido, e é isso que permite medir o pior caso de
              altura; `inert` tira ele do teclado e dos leitores de tela. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">trampolim.py</div>
              <div className="viz-code-body">
                {CODE.map((txt, i) => (
                  <div key={i} className={`viz-line${i === p.line ? " on" : ""}`}>
                    <span className="ln">{i + 1}</span>
                    {txt || " "}
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
              <strong className={s.cls}>{s.value}</strong>
            </div>
          ))}
        </div>

        <div className="viz-controls">
          <div className="viz-field grow">
            <span>E se a lista tivesse n = {thousands(nHyp)}?</span>
            <input
              type="range"
              min={0}
              max={HYPOTHESES.length - 1}
              step={1}
              value={iHyp}
              onChange={(e) => setIHyp(parseInt(e.target.value, 10))}
              style={{ accentColor: "var(--ccc-accent)", width: "100%" }}
            />
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>recursão direta · frames</span>
            <strong className={overflows ? "tr-ruim" : ""}>{thousands(nHyp + 1)}</strong>
          </div>
          <div className="bigo-stat">
            <span>recursão direta · em Python</span>
            <strong className={overflows ? "tr-ruim" : "tr-bom"}>{overflows ? "RecursionError" : "passa"}</strong>
          </div>
          <div className="bigo-stat">
            <span>trampolim · frames</span>
            <strong className="tr-bom">2</strong>
          </div>
          <div className="bigo-stat">
            <span>trampolim · saltos</span>
            <strong>{thousands(nHyp)}</strong>
          </div>
        </div>

        <p className="viz-note">
          O limite padrão do Python é {thousands(PYTHON_LIMIT)} chamadas empilhadas. Com n = {thousands(nHyp)}, a
          recursão de cauda escrita direto {overflows ? "estoura antes de terminar" : "ainda passa, mas está andando na beira"}; o
          trampolim faz {thousands(nHyp)} {nHyp === 1 ? "salto" : "saltos"} com os mesmos 2 frames.
        </p>
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );
}
