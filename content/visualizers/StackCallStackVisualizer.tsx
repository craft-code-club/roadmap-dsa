"use client";

import { useMemo, useState } from "react";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// StackCallStackVisualizer, a mesma conta resolvida por duas pilhas: a call
// stack do interpretador (recursão) e uma pilha explícita escrita na mão.
//
// Calcular uma potência dos dois jeitos e provar que os passos são os mesmos.
// A única coisa que o aluno precisa ver: na recursão a pilha existe do mesmo
// jeito, ele só não a escreveu.
//
// Gerador PURO de passos, um por modo. Cada modo tem a sua constante de código,
// e o campo `line` de cada passo aponta para o array daquele modo.
// ---------------------------------------------------------------------------

type Mode = "recursao" | "explicita";

// `highlight` guarda o nome da classe de CSS que a ficha recebe (`.pl-item.entra`,
// `.pl-item.sai`), então o VALOR não se traduz: ele é a API do `globals.css`.
type Frame = { label: string; state: string; highlight?: "entra" | "sai" };

type Step = {
  line: number;
  stack: Frame[];
  pushed: number;
  maxHeight: number;
  top: string;
  returned: string;
  result: string;
  ok?: boolean;
  note: string;
};

const CODE: Record<Mode, string[]> = {
  recursao: [
    "def potencia(x, n):",
    "    if n == 1:",
    "        return x",
    "    return x * potencia(x, n - 1)",
  ],
  explicita: [
    "def potencia(x, n):",
    "    pilha = []",
    "    for _ in range(n):",
    "        pilha.append(x)",
    "    resultado = 1",
    "    while pilha:",
    "        resultado *= pilha.pop()",
    "    return resultado",
  ],
};

function generateRecursion(x: number, n: number): Step[] {
  const out: Step[] = [];
  const stack: Frame[] = [];
  let pushed = 0;
  let maxHeight = 0;

  const snap = (line: number, note: string, extra: Partial<Step> = {}) => {
    out.push({
      line,
      stack: stack.map((f) => ({ ...f })),
      pushed,
      maxHeight,
      top: stack.length ? stack[stack.length - 1].label : "vazia",
      returned: "-",
      result: "-",
      note,
      ...extra,
    });
  };

  for (let k = n; k >= 1; k--) {
    stack.forEach((f) => { f.highlight = undefined; });
    stack.push({ label: `potencia(${x}, ${k})`, state: "acabou de entrar", highlight: "entra" });
    pushed++;
    maxHeight = Math.max(maxHeight, stack.length);
    snap(0, `Chamei potencia(${x}, ${k}): um frame novo entra no topo da pilha, com x = ${x} e n = ${k}.`);

    if (k > 1) {
      stack[stack.length - 1].highlight = undefined;
      stack[stack.length - 1].state = `parado, esperando potencia(${x}, ${k - 1})`;
      snap(1, `n = ${k} não é 1, então este frame ainda não sabe a resposta: ele precisa de potencia(${x}, ${k - 1}) antes de multiplicar. Fica parado na pilha, ocupando memória.`);
    }
  }

  // Caso base: o único frame que devolve valor sem chamar mais ninguém.
  let value = x;
  stack[stack.length - 1].state = `caso base, devolve ${x}`;
  stack[stack.length - 1].highlight = "sai";
  snap(2, `n = 1, o caso base! Devolvo x = ${x} e desempilho este frame. A partir daqui a pilha se desfaz de cima para baixo.`, {
    returned: `${value}`,
  });
  stack.pop();

  for (let k = 2; k <= n; k++) {
    const previous = value;
    value = value * x;
    stack[stack.length - 1].state = `recebeu ${previous}, devolve ${value}`;
    stack[stack.length - 1].highlight = "sai";
    snap(3, `O frame de n = ${k} estava esperando: recebi ${previous}, multiplico por x = ${x} e devolvo ${value}. Desempilho ele também.`, {
      returned: `${value}`,
    });
    stack.pop();
  }

  snap(3, `Pilha vazia de novo: ${x}^${n} = ${value}. Foram ${pushed} ${pushed === 1 ? "frame empilhado" : "frames empilhados"} e a profundidade máxima foi ${maxHeight}, ou seja, memória O(n).`, {
    ok: true,
    returned: `${value}`,
    result: `${value}`,
  });
  return out;
}

function generateExplicit(x: number, n: number): Step[] {
  const out: Step[] = [];
  const stack: Frame[] = [];
  let pushed = 0;
  let maxHeight = 0;
  let result = 1;

  const snap = (line: number, note: string, extra: Partial<Step> = {}) => {
    out.push({
      line,
      stack: stack.map((f) => ({ ...f })),
      pushed,
      maxHeight,
      top: stack.length ? stack[stack.length - 1].label : "vazia",
      returned: "-",
      result: `${result}`,
      note,
      ...extra,
    });
  };

  snap(1, `Crio a pilha vazia na mão. A ideia é a mesma da recursão, só que agora a pilha é um objeto meu, e não a call stack do interpretador.`, { result: "-" });

  for (let k = 1; k <= n; k++) {
    stack.forEach((f) => { f.highlight = undefined; });
    stack.push({ label: `${x}`, state: `cópia ${k} da base`, highlight: "entra" });
    pushed++;
    maxHeight = Math.max(maxHeight, stack.length);
    snap(3, `Empilho mais uma cópia da base x = ${x}. A pilha tem ${stack.length} ${stack.length === 1 ? "item" : "itens"}, e ainda não multipliquei nada.`, { result: "-" });
  }

  stack.forEach((f) => { f.highlight = undefined; });
  snap(4, `Todas as ${n} cópias empilhadas. Começo o resultado em 1 e agora vou desempilhando e multiplicando.`);

  for (let k = 1; k <= n; k++) {
    const before = result;
    result = result * x;
    stack[stack.length - 1].highlight = "sai";
    stack[stack.length - 1].state = `saindo: ${before} × ${x} = ${result}`;
    snap(6, `Desempilho o topo: resultado = ${before} × ${x} = ${result}. Sobra${stack.length - 1 === 1 ? "" : "m"} ${stack.length - 1} na pilha.`);
    stack.pop();
  }

  snap(7, `Pilha vazia: ${x}^${n} = ${result}. Mesmo resultado, mesma altura máxima (${maxHeight}) e os mesmos ${pushed} empilhamentos da versão recursiva.`, { ok: true });
  return out;
}

const MODES: { key: Mode; label: string }[] = [
  { key: "recursao", label: "Recursão (call stack)" },
  { key: "explicita", label: "Pilha explícita" },
];

const X_DEFAULT = 2;
const N_DEFAULT = 3;

function clamp(v: string, min: number, max: number, fallback: number): number {
  const k = parseInt(v, 10);
  if (isNaN(k)) return fallback;
  return Math.min(max, Math.max(min, k));
}

export function StackCallStackVisualizer() {
  const [mode, setMode] = useState<Mode>("recursao");
  const [x, setX] = useState(X_DEFAULT);
  const [n, setN] = useState(N_DEFAULT);

  const steps = useMemo(
    () => (mode === "recursao" ? generateRecursion(x, n) : generateExplicit(x, n)),
    [mode, x, n]
  );

  const viz = useVisualizer({
    title: "Visualizador · a mesma potência com duas pilhas",
    total: steps.length,
    // O que muda a altura da peça: o modo (o código vai de 4 a 8 linhas) e o
    // expoente, que é a profundidade máxima da torre de frames.
    measureOn: [mode, n],
  });

  const p = steps[viz.step];
  const code = CODE[mode];

  const change = (fn: () => void) => { viz.reset(); fn(); };

  const tower = [...p.stack].reverse();

  const variables =
    mode === "recursao"
      ? [
          { name: "topo", value: p.top },
          { name: "frames", value: `${p.stack.length}` },
          { name: "return", value: p.returned },
          { name: `${x}^${n}`, value: p.result, best: !!p.ok },
        ]
      : [
          { name: "topo", value: p.top },
          { name: "len(pilha)", value: `${p.stack.length}` },
          { name: "resultado", value: p.result },
          { name: `${x}^${n}`, value: p.ok ? p.result : "-", best: !!p.ok },
        ];

  const stats = [
    { k: "n", label: "expoente (n)", value: `${n}` },
    { k: "alt", label: "altura máxima da pilha", value: `${p.maxHeight}` },
    { k: "emp", label: "empilhamentos", value: `${p.pushed}` },
    { k: "esp", label: "memória extra", value: "O(n)" },
  ];

  const noteClass = "viz-note" + (p.ok ? " ok" : "");

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {MODES.map((m) => (
            <button
              key={m.key}
              className={`bigo-chip${mode === m.key ? " on" : ""}`}
              onClick={() => change(() => setMode(m.key))}
              aria-pressed={mode === m.key}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="viz-inputs">
          <label className="viz-field">
            <span>base x</span>
            <input
              className="viz-input k"
              type="number"
              min={1}
              max={9}
              value={x}
              onChange={(e) => change(() => setX(clamp(e.target.value, 1, 9, X_DEFAULT)))}
            />
          </label>
          <label className="viz-field">
            <span>expoente n</span>
            <input
              className="viz-input k"
              type="number"
              min={1}
              max={8}
              value={n}
              onChange={(e) => change(() => setN(clamp(e.target.value, 1, 8, N_DEFAULT)))}
            />
          </label>
          {/* O `↺` do rodapé é só `viz.reset()`: ele volta ao passo 0 e não
              desfaz a base e o expoente que o aluno montou. O caminho de volta
              ao estado inicial é este botão, e o rótulo dele diz isso. */}
          <button className="viz-btn" onClick={() => change(() => { setX(X_DEFAULT); setN(N_DEFAULT); })}>
            ↺ Voltar ao 2³
          </button>
        </div>

        <div className="pl-arena larga">
          <div className="pl-col">
            <span className="pl-lbl">
              {mode === "recursao" ? "O que a call stack está fazendo" : "O que a pilha está fazendo"}
            </span>
            <p className={noteClass}>{p.note}</p>
            <div className="bigo-stats">
              {stats.map((s) => (
                <div className="bigo-stat" key={s.k}>
                  <span>{s.label}</span>
                  <strong>{s.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="pl-col">
            <span className="pl-lbl">
              {mode === "recursao" ? "Call stack (topo em cima)" : "Pilha (topo em cima)"}
            </span>
            <div className="pl-torre">
              {tower.length ? (
                tower.map((f, k) => (
                  <div
                    key={`${f.label}-${tower.length - k}`}
                    className={`pl-item bloco${k === 0 ? " topo" : ""}${f.highlight ? ` ${f.highlight}` : ""}`}
                  >
                    <span className="pl-frame-nome">{f.label}</span>
                    <span className="pl-frame-est">{f.state}</span>
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
              <div className="viz-code-head">{mode === "recursao" ? "recursivo.py" : "com_pilha.py"}</div>
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
            {variables.map((v) => (
              <div className="viz-var" key={v.name}>
                <span className="viz-var-name">{v.name}</span>
                <span className={`viz-var-val${v.best ? " best" : ""}`}>{v.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <VizFooter viz={viz} />
    </figure>
  );
}
