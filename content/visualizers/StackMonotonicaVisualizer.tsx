"use client";

import { useMemo, useState } from "react";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// StackMonotonicaVisualizer, a pilha monotônica resolvendo "próximo maior
// elemento".
//
// Gerador PURO de passos + a casca adaptativa do `useVisualizer` (fitas de
// células, código sincronizado, variáveis, controles, Expandir).
//
// A ÚNICA coisa que o aluno precisa ver acontecendo: quando chega um valor
// grande, ele resolve de uma vez TODOS os que estavam esperando embaixo dele,
// e cada índice entra e sai da pilha no máximo uma vez. É isso que faz o laço
// aninhado ser O(n) e não O(n²), e é por isso que o painel mostra os dois
// contadores lado a lado: as comparações que a pilha realmente fez e as que a
// força bruta faria no mesmo array.
//
// A pilha guarda ÍNDICES, não valores, porque a resposta é gravada na posição
// de quem estava esperando. Os valores ficam limitados a 0..99 para o -1 ser
// sempre "não existe", nunca um valor legítimo do array.
// ---------------------------------------------------------------------------

type Step = {
  i: number; // índice atual; -1 na preparação, n no encerramento
  stack: number[]; // índices, da base para o topo
  answers: (number | null)[]; // null = ainda o -1 provisório
  line: number;
  poppedIdx?: number; // índice que acabou de receber resposta
  comparedIdx?: number; // topo comparado e mantido
  pushedIdx?: number;
  comparisons: number;
  pushes: number;
  pops: number;
  done?: boolean;
  note: string;
};

// As linhas mapeiam 1:1 com o campo `line` de cada passo, então a ordem e a
// quantidade de linhas não podem mudar sem ajustar o gerador junto.
const CODE = [
  "def proximo_maior(nums):",
  "    resp = [-1] * len(nums)",
  "    pilha = []                 # índices em espera",
  "    for i, v in enumerate(nums):",
  "        while pilha and nums[pilha[-1]] < v:",
  "            resp[pilha.pop()] = v",
  "        pilha.append(i)",
  "    return resp",
];

const MAX_ITEMS = 12;

function clean(v: string): number[] {
  return v
    .split(/[\s,]+/)
    .map((x) => parseInt(x, 10))
    .filter((x) => !isNaN(x) && x >= 0 && x <= 99)
    .slice(0, MAX_ITEMS);
}

// Quantas comparações a força bruta faria no MESMO array: para cada i, varre
// para a direita até achar alguém maior. É o número que o painel põe ao lado
// do contador da pilha.
function bruteForceComparisons(nums: number[]): number {
  let c = 0;
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      c++;
      if (nums[j] > nums[i]) break;
    }
  }
  return c;
}

function generateSteps(nums: number[]): Step[] {
  const out: Step[] = [];
  const n = nums.length;
  const stack: number[] = [];
  const answers: (number | null)[] = new Array(n).fill(null);
  let comparisons = 0;
  let pushes = 0;
  let pops = 0;

  const snap = (p: Omit<Step, "comparisons" | "pushes" | "pops" | "stack" | "answers">) => {
    out.push({ ...p, stack: [...stack], answers: [...answers], comparisons, pushes, pops });
  };

  if (!n) {
    snap({ i: -1, line: 1, done: true, note: "Array vazio: não existe resposta para dar, e a pilha nunca chega a receber nada." });
    return out;
  }

  snap({
    i: -1,
    line: 1,
    note: `Começo com as ${n} respostas em -1. Esse é o palpite padrão: se ninguém maior aparecer à direita, o -1 fica.`,
  });
  snap({
    i: -1,
    line: 2,
    note: "A pilha começa vazia e vai guardar ÍNDICES de quem ainda não achou ninguém maior. Ela sempre fica em ordem decrescente de valor, do fundo para o topo.",
  });

  let guard = 0;
  for (let i = 0; i < n && guard++ < 400; i++) {
    const v = nums[i];
    snap({
      i,
      line: 3,
      note: `Chego no índice ${i}, valor ${v}. Pergunta única deste passo: esse ${v} é o próximo maior de alguém que está esperando na pilha?`,
    });

    while (stack.length) {
      const j = stack[stack.length - 1];
      comparisons++;
      if (nums[j] < v) {
        stack.pop();
        pops++;
        answers[j] = v;
        snap({
          i,
          line: 5,
          poppedIdx: j,
          note: `O topo é o índice ${j}, valor ${nums[j]}, e ${nums[j]} < ${v}: achei. O próximo maior de ${nums[j]} é ${v}, então gravo resp[${j}] = ${v} e desempilho, porque ele nunca mais vai precisar de resposta.`,
        });
      } else {
        snap({
          i,
          line: 4,
          comparedIdx: j,
          note: `O topo é o índice ${j}, valor ${nums[j]}, e ${nums[j]} não é menor que ${v}: ele continua esperando. Como a pilha é decrescente, todo mundo abaixo dele é ainda maior, então nem preciso olhar. Paro o while.`,
        });
        break;
      }
    }

    pushes++;
    stack.push(i);
    snap({
      i,
      line: 6,
      pushedIdx: i,
      note: `Empilho o índice ${i}: agora é o ${v} que fica esperando o próximo maior dele. A pilha tem ${stack.length} ${stack.length === 1 ? "índice" : "índices"} em espera.`,
    });
  }

  const leftover = stack.map((j) => `${nums[j]} (índice ${j})`).join(", ");
  const howMany = stack.length;
  for (const j of stack) answers[j] = -1;
  stack.length = 0;
  snap({
    i: n,
    line: 7,
    done: true,
    note: `Acabou o array e ${howMany === 1 ? "sobrou 1 índice" : `sobraram ${howMany} índices`} na pilha: ${leftover}. Ninguém maior apareceu à direita, então a resposta ${howMany === 1 ? "dele" : "deles"} fica em -1 mesmo. Foram ${pushes} push e ${pops} pop para ${n} elementos, ou seja ${pushes + pops} operações de pilha contra o teto de ${2 * n}.`,
  });
  return out;
}

const DEFAULT_NUMS = [73, 74, 75, 71, 69, 72, 76, 73];

// Casos escolhidos a dedo: o clássico das temperaturas (LeetCode 739), o do
// GeeksforGeeks, o pior caso da força bruta, o caso em que ela empata e a
// borda do "estritamente maior".
type Preset = { key: string; label: string; nums: number[] };
const PRESETS: Preset[] = [
  { key: "temp", label: "Temperaturas (LeetCode 739)", nums: DEFAULT_NUMS },
  { key: "gfg", label: "Do GeeksforGeeks: 6 8 0 1 3", nums: [6, 8, 0, 1, 3] },
  { key: "desce", label: "Pior caso da força bruta", nums: [8, 7, 6, 5, 4, 3, 2, 1] },
  { key: "sobe", label: "Crescente: 1 2 3 4 5 6 7 8", nums: [1, 2, 3, 4, 5, 6, 7, 8] },
  { key: "iguais", label: "Tudo igual: 4 4 4 4", nums: [4, 4, 4, 4] },
];

export function StackMonotonicaVisualizer() {
  const [nums, setNums] = useState<number[]>(DEFAULT_NUMS);
  const [input, setInput] = useState(DEFAULT_NUMS.join(", "));
  const [preset, setPreset] = useState("temp");

  const steps = useMemo(() => generateSteps(nums), [nums]);
  const brute = useMemo(() => bruteForceComparisons(nums), [nums]);

  const viz = useVisualizer({
    title: "Visualizador · pilha monotônica: o próximo maior elemento",
    total: steps.length,
    // O que muda a altura da peça: o tamanho do array, que decide quantas
    // células as duas fitas têm e quão alta a torre de índices pode ficar.
    measureOn: [nums.length],
  });

  const p = steps[viz.step];

  const onInputChange = (v: string) => {
    viz.reset();
    setPreset("");
    setInput(v);
    setNums(clean(v));
  };
  const applyPreset = (pr: Preset) => {
    viz.reset();
    setPreset(pr.key);
    setNums(pr.nums);
    setInput(pr.nums.join(", "));
  };
  const shuffle = () => {
    const size = 7 + Math.floor(Math.random() * 3);
    const arr = Array.from({ length: size }, () => 1 + Math.floor(Math.random() * 40));
    viz.reset();
    setPreset("");
    setNums(arr);
    setInput(arr.join(", "));
  };

  const inStack = new Set(p.stack);
  const topIdx = p.stack.length ? p.stack[p.stack.length - 1] : -1;

  const inputCells = nums.map((v, i) => {
    let cls = "viz-cell";
    if (i === p.i) cls += " in";
    if (inStack.has(i)) cls += " pl-espera";
    if (p.poppedIdx === i || p.comparedIdx === i) cls += " entra";
    if (p.answers[i] !== null && p.answers[i] !== -1) cls += " pl-feito";
    let mark = "";
    if (i === p.i) mark = "i";
    else if (i === topIdx) mark = "topo";
    else if (inStack.has(i)) mark = "•";
    return { i, v, cls, mark };
  });

  const answerCells = nums.map((_, i) => {
    const r = p.answers[i];
    let cls = "viz-cell";
    if (r === null) cls += " pl-vaga";
    else if (r === -1) cls += " pl-nada";
    else cls += " pl-resp";
    if (p.poppedIdx === i) cls += " entra";
    return { i, txt: r === null ? "-1" : `${r}`, cls };
  });

  // A torre desenha o topo em cima, então a pilha é percorrida ao contrário.
  const tower = [...p.stack].reverse();
  const answered = p.answers.filter((r) => r !== null).length;

  const variables = [
    { name: "i", value: p.i >= 0 && p.i < nums.length ? `${p.i}` : "-" },
    { name: "v", value: p.i >= 0 && p.i < nums.length ? `${nums[p.i]}` : "-" },
    { name: "nums[pilha[-1]]", value: topIdx >= 0 ? `${nums[topIdx]}` : "vazia" },
    { name: "respondidos", value: `${answered} de ${nums.length}`, best: !!p.done },
  ];

  const stats = [
    { k: "n", label: "tamanho (n)", value: `${nums.length}` },
    { k: "cmp", label: "comparações até aqui", value: `${p.comparisons}` },
    { k: "bruta", label: "força bruta faria", value: `${brute}` },
    { k: "push", label: "empilhados (push)", value: `${p.pushes}` },
    { k: "pop", label: "desempilhados (pop)", value: `${p.pops}` },
  ];

  const noteClass = "viz-note" + (p.done ? " ok" : "");

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
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

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Array (inteiros de 0 a 99)</span>
            <input className="viz-input" value={input} onChange={(e) => onInputChange(e.target.value)} />
          </label>
          <button type="button" className="viz-btn" onClick={shuffle}>Sortear</button>
        </div>

        <div className="pl-arena">
          <div className="pl-col">
            <span className="pl-lbl">nums, o array de entrada</span>
            {nums.length ? (
              <div className="viz-cells">
                {inputCells.map((c) => (
                  <div className="viz-cell-wrap" key={c.i}>
                    <span className="viz-cell-idx">{c.i}</span>
                    <div className={c.cls}>{c.v}</div>
                    <span className={`viz-mark${c.mark ? " show" : ""}`}>{c.mark || "·"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pl-vazia">array vazio</p>
            )}

            <span className="pl-lbl mt">resp, a resposta sendo preenchida</span>
            {nums.length ? (
              <div className="viz-cells">
                {answerCells.map((c) => (
                  <div className="viz-cell-wrap" key={c.i}>
                    <span className="viz-cell-idx">{c.i}</span>
                    <div className={c.cls}>{c.txt}</div>
                  </div>
                ))}
              </div>
            ) : null}

            <p className="pl-legenda">
              <span><i className="am" />esperando na pilha</span>
              <span><i className="vd" />já respondido</span>
              <span><i className="tr" />ainda no -1 provisório</span>
            </p>

            <p className={noteClass}>{p.note}</p>
          </div>

          <div className="pl-col">
            <span className="pl-lbl">Pilha de índices (topo em cima)</span>
            <div className="pl-torre">
              {tower.length ? (
                tower.map((j, k) => (
                  <div key={j} className={`pl-item${k === 0 ? " topo" : ""}${p.pushedIdx === j && k === 0 ? " entra" : ""}`}>
                    <span>{nums[j]}</span>
                    <span className="pl-meta">{k === 0 ? "topo · " : ""}índice {j}</span>
                  </div>
                ))
              ) : (
                <p className="pl-vazia">pilha vazia</p>
              )}
              <div className="pl-base">base da pilha</div>
            </div>
          </div>
        </div>

        <div className="viz-split">
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">monotonica.py</div>
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
}
