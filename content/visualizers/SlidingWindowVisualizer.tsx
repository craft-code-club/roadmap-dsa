"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// SlidingWindowVisualizer, visualização passo a passo da Sliding Window.
//
// variant="fixed"    → maior soma de uma janela de tamanho k (tamanho travado)
// variant="dynamic"  → maior subarray com soma ≤ k (cresce/encolhe)
//
// Os dois modos contam LEITURAS DO ARRAY (cada `nums[i]` executado) e mostram,
// ao lado, quantas leituras a força bruta faria. É esse par de números que
// transforma "a janela é O(n)" em algo que o aluno vê acontecendo:
//   janela fixa    → 2n - k             força bruta → (n - k + 1) · k
//   janela variável→ n + encolhimentos  força bruta → n(n+1)/2 no pior caso
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type Variant = "fixed" | "dynamic";

type Step = {
  l: number;
  r: number;
  curr: number; // métrica da janela (soma)
  ans: number; // resposta acumulada (fixa: melhor soma / dinâmica: maior tamanho)
  line: number;
  reads: number; // acessos a nums[...] executados até aqui
  entering?: number;
  leaving?: number;
  invalid?: boolean;
  ok?: boolean;
  done?: boolean;
  note: string;
};

// As linhas mapeiam 1:1 com os passos (campo `line` nos geradores), então a
// ordem e a quantidade de linhas não podem mudar.
const FIXED_CODE = [
  "def melhor_soma(nums, k):",
  "    soma = sum(nums[:k])",
  "    melhor = soma",
  "    esquerda = 0",
  "    for direita in range(k, len(nums)):",
  "        soma += nums[direita]",
  "        soma -= nums[esquerda]",
  "        esquerda += 1",
  "        melhor = max(melhor, soma)",
  "    return melhor",
];

const DYNAMIC_CODE = [
  "def maior_subarray(nums, k):",
  "    esquerda = 0",
  "    soma = 0",
  "    melhor = 0",
  "    for direita in range(len(nums)):",
  "        soma += nums[direita]",
  "        while soma > k:",
  "            soma -= nums[esquerda]",
  "            esquerda += 1",
  "        melhor = max(melhor, direita - esquerda + 1)",
  "    return melhor",
];

const SPEEDS = [0, 1400, 950, 650, 420, 250];

function plural(v: number, one: string, many: string): string {
  return `${v} ${v === 1 ? one : many}`;
}

function generateFixedSteps(nums: number[], k: number): Step[] {
  const steps: Step[] = [];
  const n = nums.length;
  let sum = 0;
  for (let i = 0; i < k; i++) sum += nums[i];
  let reads = k;
  let best = sum;
  let left = 0;

  steps.push({
    l: 0,
    r: k - 1,
    curr: sum,
    ans: best,
    line: 1,
    reads,
    note: `Monto a primeira janela somando do zero: ${nums.slice(0, k).join(" + ")} = ${sum}. É a única vez que eu faço isso, e me custou ${plural(k, "leitura", "leituras")}.`,
  });
  steps.push({
    l: 0,
    r: k - 1,
    curr: sum,
    ans: best,
    line: 2,
    reads,
    ok: true,
    note: `Ainda não tenho com quem comparar, então a primeira janela já é a melhor: ${best}.`,
  });

  for (let d = k; d < n; d++) {
    sum += nums[d];
    reads++;
    steps.push({
      l: left,
      r: d,
      curr: sum,
      ans: best,
      line: 5,
      reads,
      entering: d,
      note: `Entra nums[${d}] = ${nums[d]} pela direita. Agora tenho ${k + 1} elementos e soma ${sum}: sobrou um, preciso devolver o mais antigo.`,
    });

    const removed = left;
    sum -= nums[removed];
    reads++;
    left++;
    steps.push({
      l: left,
      r: d,
      curr: sum,
      ans: best,
      line: 6,
      reads,
      leaving: removed,
      note: `Sai nums[${removed}] = ${nums[removed]} pela esquerda. soma = ${sum}, de volta aos ${k} elementos, e esquerda passa a ser ${left}. Duas leituras, não ${k}.`,
    });

    const improved = sum > best;
    if (improved) best = sum;
    steps.push({
      l: left,
      r: d,
      curr: sum,
      ans: best,
      line: 8,
      reads,
      ok: improved,
      note: improved
        ? `A janela [${left}..${d}] soma ${sum} e é a melhor até agora.`
        : `A janela [${left}..${d}] soma ${sum}, não supera ${best}. Sigo em frente.`,
    });
  }

  const brute = (n - k + 1) * k;
  steps.push({
    l: left,
    r: n - 1,
    curr: sum,
    ans: best,
    line: 9,
    reads,
    done: true,
    note: `Fim: a maior soma de ${k} elementos seguidos é ${best}. Gastei ${plural(reads, "leitura", "leituras")} do array, contra ${brute} da força bruta.`,
  });
  return steps;
}

function generateDynamicSteps(nums: number[], k: number): Step[] {
  const steps: Step[] = [];
  const n = nums.length;
  let sum = 0;
  let best = 0;
  let left = 0;
  let reads = 0;

  steps.push({
    l: 0,
    r: -1,
    curr: 0,
    ans: 0,
    line: 2,
    reads,
    note: `Janela vazia: esquerda e direita em 0, soma 0. Vou crescer pela direita enquanto a soma couber em ${k}.`,
  });

  for (let d = 0; d < n; d++) {
    sum += nums[d];
    reads++;
    steps.push({
      l: left,
      r: d,
      curr: sum,
      ans: best,
      line: 5,
      reads,
      entering: d,
      note: `Entra nums[${d}] = ${nums[d]} pela direita. soma = ${sum}.`,
    });

    let guard = 0;
    while (sum > k && left <= d && guard++ < 200) {
      steps.push({
        l: left,
        r: d,
        curr: sum,
        ans: best,
        line: 6,
        reads,
        invalid: true,
        leaving: left,
        note: `soma ${sum} passou de k = ${k}: janela inválida. Como todo mundo aqui é positivo, só encolhendo pela esquerda ela volta a valer.`,
      });
      sum -= nums[left];
      reads++;
      left++;
      steps.push({
        l: left,
        r: d,
        curr: sum,
        ans: best,
        line: 7,
        reads,
        note: `Sai nums[${left - 1}] = ${nums[left - 1]} pela esquerda. soma = ${sum}. O índice ${left - 1} nunca mais volta.`,
      });
    }

    const len = d - left + 1;
    const improved = len > best;
    if (improved) best = len;
    steps.push({
      l: left,
      r: d,
      curr: sum,
      ans: best,
      line: 9,
      reads,
      ok: true,
      note:
        len <= 0
          ? `A janela ficou vazia: nums[${d}] = ${nums[d]} sozinho já estoura ${k}. Melhor resposta segue ${best}.`
          : improved
            ? `Janela válida [${left}..${d}], ${plural(len, "elemento", "elementos")}. É a maior até agora: ${best}.`
            : `Janela válida [${left}..${d}], ${plural(len, "elemento", "elementos")}, que não supera ${best}.`,
    });
  }

  const brute = (n * (n + 1)) / 2;
  steps.push({
    l: left,
    r: n - 1,
    curr: sum,
    ans: best,
    line: 10,
    reads,
    done: true,
    note: `Fim: o maior subarray com soma ≤ ${k} tem ${best} ${best === 1 ? "elemento" : "elementos"}. Cada índice entrou uma vez e saiu no máximo uma: ${plural(reads, "leitura", "leituras")}, contra ${brute} da força bruta no pior caso.`,
  });
  return steps;
}

type Preset = { key: string; label: string; nums: number[]; k: number };

const PRESETS: Record<Variant, Preset[]> = {
  // Casos escolhidos a dedo: o padrão, o k grande, o k = n e a borda de tudo igual.
  fixed: [
    { key: "padrao", label: "Padrão: k = 3", nums: [3, 6, 2, 8, 1, 4, 1, 5], k: 3 },
    { key: "k5", label: "Janela maior: k = 5", nums: [3, 6, 2, 8, 1, 4, 1, 5], k: 5 },
    { key: "kn", label: "k = n: uma janela só", nums: [3, 6, 2, 8, 1, 4, 1, 5], k: 8 },
    { key: "iguais", label: "Tudo igual: k = 2", nums: [4, 4, 4, 4, 4], k: 2 },
  ],
  // Um array crescente (as somas sobem 2, 5, 9, 14, estouram em 20, voltam para
  // 15, estouram em 22, voltam para 13, e a resposta é 4), um que encolhe várias
  // vezes seguidas, a borda do elemento que sozinho estoura k, e o caso em que
  // nada estoura (a janela nunca encolhe).
  dynamic: [
    { key: "encontro", label: "Padrão: soma ≤ 15", nums: [2, 3, 4, 5, 6, 7, 9], k: 15 },
    { key: "encolhe", label: "Encolhe em série: soma ≤ 8", nums: [3, 1, 2, 7, 4, 2, 1, 1, 5], k: 8 },
    { key: "estoura", label: "Um elemento maior que k", nums: [1, 2, 20, 1, 1], k: 5 },
    { key: "nunca", label: "Nada estoura: k folgado", nums: [1, 1, 1, 1, 1], k: 9 },
  ],
};

const TITLES: Record<Variant, string> = {
  fixed: "janela fixa, a maior soma de k elementos seguidos",
  dynamic: "janela variável, o maior subarray com soma ≤ k",
};

const K_LABEL: Record<Variant, string> = { fixed: "k", dynamic: "soma máx (k)" };

export function SlidingWindowVisualizer({ variant = "fixed" }: { variant?: Variant }) {
  const mode = variant;
  const presets = PRESETS[mode];
  const initial = presets[0];
  const CODE = mode === "fixed" ? FIXED_CODE : DYNAMIC_CODE;

  const [nums, setNums] = useState<number[]>(initial.nums);
  const [input, setInput] = useState(initial.nums.join(", "));
  const [k, setK] = useState(initial.k);
  const [presetKey, setPresetKey] = useState(initial.key);

  // Na janela fixa, k é o tamanho e não pode passar de n. Na variável, k é um
  // teto de soma e pode ser qualquer número.
  const effectiveK = mode === "fixed" ? Math.max(1, Math.min(k, nums.length)) : Math.max(1, k);

  const steps = useMemo(() => {
    const arr = nums.length ? nums : [1];
    const kk = mode === "fixed" ? Math.max(1, Math.min(k, arr.length)) : Math.max(1, k);
    return mode === "fixed" ? generateFixedSteps(arr, kk) : generateDynamicSteps(arr, kk);
  }, [nums, k, mode]);

  const n = nums.length;

  const viz = useVisualizer({
    title: `Visualizador · ${TITLES[mode]}`,
    total: steps.length,
    speeds: SPEEDS,
    // O que muda a altura da peça: o modo (o código vai de 10 a 11 linhas) e o
    // tamanho do array (as células quebram linha).
    measureOn: [mode, n],
  });

  const p = steps[viz.step];

  const onInputChange = (v: string) => {
    const arr = v.split(",").map((x) => parseInt(x.trim(), 10)).filter((x) => !isNaN(x)).slice(0, 14);
    const novo = arr.length ? arr : [1];
    viz.reset();
    setPresetKey("");
    setInput(v);
    setNums(novo);
    // Na janela fixa k é o TAMANHO da janela: encurtar o array tem que encurtar
    // o k junto. Sem isso o campo continuava mostrando o k antigo enquanto o
    // algoritmo já rodava com `min(k, n)` — o aluno lia 8 e via janelas de 3.
    // Forma funcional porque este handler dispara a cada tecla digitada.
    if (mode === "fixed") setK((atual) => Math.min(atual, novo.length));
  };
  const onKChange = (v: string) => {
    const raw = parseInt(v, 10) || 1;
    const kk = mode === "fixed" ? Math.max(1, Math.min(raw, nums.length)) : Math.max(1, raw);
    viz.reset();
    setPresetKey("");
    setK(kk);
  };
  const applyPreset = (pr: Preset) => {
    viz.reset();
    setPresetKey(pr.key);
    setNums(pr.nums);
    setInput(pr.nums.join(", "));
    setK(pr.k);
  };
  // Math.random só aqui, num handler de clique: no caminho de render ele
  // quebraria a hidratação (o HTML do build divergiria do cliente).
  const shuffle = () => {
    const size = 7 + Math.floor(Math.random() * 3);
    const arr = Array.from({ length: size }, () => 1 + Math.floor(Math.random() * 9));
    viz.reset();
    setPresetKey("");
    setNums(arr);
    setInput(arr.join(", "));
    setK(mode === "fixed" ? Math.min(k, size) : k);
  };

  const emptyWindow = p.l > p.r;
  const activeWindow = p.r >= 0 && !p.done && !emptyWindow;

  const cells = nums.map((v, i) => {
    const inside = activeWindow && i >= p.l && i <= p.r;
    let cls = "viz-cell";
    if (inside) cls += " in";
    if (p.r >= 0 && i < p.l) cls += " drop";
    if (p.entering === i) cls += " entra";
    if (p.leaving === i) cls += " sai";
    let mark = "";
    if (activeWindow && i === p.l) mark = "esq";
    if (activeWindow && i === p.r) mark = mark ? "esq/dir" : "dir";
    return { i, v, cls, mark };
  });

  const vars: { name: string; value: string; best?: boolean }[] =
    mode === "fixed"
      ? [
          { name: "esquerda", value: `${p.l}` },
          { name: "direita", value: p.r < 0 ? "-" : `${p.r}` },
          { name: "soma", value: `${p.curr}` },
          { name: "melhor", value: `${p.ans}`, best: true },
        ]
      : [
          { name: "esquerda", value: `${p.l}` },
          { name: "direita", value: p.r < 0 ? "-" : `${p.r}` },
          { name: "soma", value: `${p.curr}` },
          { name: "melhor (tam.)", value: `${p.ans}`, best: true },
        ];

  const brute = mode === "fixed" ? (n - effectiveK + 1) * effectiveK : (n * (n + 1)) / 2;
  const stats = [
    { key: "n", label: "tamanho (n)", value: `${n}` },
    { key: "leituras", label: "leituras da janela", value: `${p.reads}` },
    {
      key: "bruta",
      label: mode === "fixed" ? "leituras da força bruta" : "força bruta (pior caso)",
      value: `${brute}`,
    },
    { key: "espaco", label: "memória extra", value: "O(1)" },
  ];

  const noteClass = "viz-note" + (p.invalid ? " invalid" : p.ok || p.done ? " ok" : "");

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {presets.map((pr) => (
            <button
              key={pr.key}
              className={`bigo-chip${presetKey === pr.key ? " on" : ""}`}
              onClick={() => applyPreset(pr)}
              aria-pressed={presetKey === pr.key}
            >
              {pr.label}
            </button>
          ))}
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Seu array</span>
            <input className="viz-input" value={input} onChange={(e) => onInputChange(e.target.value)} />
          </label>
          <label className="viz-field">
            <span>{K_LABEL[mode]}</span>
            <input className="viz-input k" type="number" value={k} onChange={(e) => onKChange(e.target.value)} />
          </label>
          <button className="viz-btn" onClick={shuffle}>Sortear</button>
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

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com a altura do
              código. O `.viz-code-slot` é o truque de grid 1fr→0fr, a única
              forma de animar altura automática em CSS puro. O código fica no
              DOM mesmo recolhido, e é isso que permite medir o pior caso de
              altura; `inert` tira ele do teclado e dos leitores de tela. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">solucao.py</div>
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
          </div>
        </div>

        <div className="bigo-stats">
          {stats.map((s) => (
            <div className="bigo-stat" key={s.key}>
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
