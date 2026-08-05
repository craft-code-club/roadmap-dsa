"use client";

import { useMemo, useState } from "react";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// StackVisualizer, a pilha em ação resolvendo parênteses balanceados.
//
// Gerador PURO de passos + a casca adaptativa do `useVisualizer`. O que muda
// em relação aos outros: o desenho central é a TORRE, a pilha crescendo e
// encolhendo com o topo sempre na primeira linha, que é como todo mundo
// desenha pilha no quadro.
//
// A única coisa que o aluno precisa ver acontecendo: cada abertura empurra um
// item para o topo, cada fechamento só pode consumir QUEM ESTÁ NO TOPO, e o
// veredito da expressão sai de duas perguntas (o topo casa? a pilha esvaziou?).
//
// A expressão é filtrada para os seis caracteres do LeetCode 20, porque o
// algoritmo assume que tudo que não é fechamento é abertura.
// ---------------------------------------------------------------------------

type Item = { c: string; i: number };

type Step = {
  i: number; // caractere atual, -1 no passo de preparação
  stack: Item[];
  line: number;
  pairA?: number; // abertura que acabou de casar
  pairB?: number; // fechamento que acabou de casar
  errorAt?: number;
  pushed: number;
  popped: number;
  maxHeight: number;
  ok?: boolean;
  done?: boolean;
  note: string;
};

// As linhas mapeiam 1:1 com o campo `line` de cada passo, então a ordem e a
// quantidade de linhas não podem mudar sem ajustar o gerador junto.
const CODE = [
  "def valida(s):",
  "    pilha = []",
  '    pares = {")": "(", "]": "[", "}": "{"}',
  "    for c in s:",
  "        if c in pares:",
  "            if not pilha or pilha[-1] != pares[c]:",
  "                return False",
  "            pilha.pop()",
  "        else:",
  "            pilha.append(c)",
  "    return not pilha",
];

const CLOSERS: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
const VALID = "()[]{}";
const MAX_CHARS = 24;

function clean(v: string): string {
  return Array.from(v)
    .filter((c) => VALID.includes(c))
    .slice(0, MAX_CHARS)
    .join("");
}

function generateSteps(expr: string): Step[] {
  const out: Step[] = [];
  const stack: Item[] = [];
  let pushed = 0;
  let popped = 0;
  let maxHeight = 0;

  const record = (p: Omit<Step, "pushed" | "popped" | "maxHeight">) => {
    out.push({ ...p, pushed, popped, maxHeight });
  };

  record({
    i: -1,
    stack: [],
    line: 1,
    note: expr.length
      ? `Começo com a pilha vazia e ${expr.length} ${expr.length === 1 ? "caractere" : "caracteres"} para ler, da esquerda para a direita.`
      : "Expressão vazia: o laço não roda nenhuma vez e a pilha continua vazia.",
  });

  let guard = 0;
  for (let i = 0; i < expr.length && guard++ < 100; i++) {
    const c = expr[i];
    const opener = CLOSERS[c];

    if (!opener) {
      stack.push({ c, i });
      pushed++;
      maxHeight = Math.max(maxHeight, stack.length);
      record({
        i,
        stack: [...stack],
        line: 9,
        note: `'${c}' é abertura: empilho e sigo em frente. A pilha fica com ${stack.length} ${stack.length === 1 ? "item" : "itens"} e o topo agora é '${c}'.`,
      });
      continue;
    }

    if (!stack.length) {
      record({
        i,
        stack: [],
        line: 6,
        errorAt: i,
        done: true,
        note: `'${c}' é fechamento, mas a pilha está vazia: esse '${c}' fecha o quê? Todo fechamento precisa de uma abertura antes dele. Inválida.`,
      });
      return out;
    }

    const top = stack[stack.length - 1];
    if (top.c !== opener) {
      record({
        i,
        stack: [...stack],
        line: 6,
        errorAt: i,
        done: true,
        note: `'${c}' pede '${opener}' no topo, mas o topo é '${top.c}' (posição ${top.i}). Tipo trocado: paro aqui e devolvo inválida.`,
      });
      return out;
    }

    stack.pop();
    popped++;
    record({
      i,
      stack: [...stack],
      line: 7,
      pairA: top.i,
      pairB: i,
      note: `'${c}' pede '${opener}', e o topo é exatamente o '${top.c}' da posição ${top.i}: par fechado, desempilho. Sobra${stack.length === 1 ? "" : "m"} ${stack.length} na pilha.`,
    });
  }

  if (stack.length) {
    const leftover = stack.map((it) => `'${it.c}' na posição ${it.i}`).join(", ");
    record({
      i: expr.length,
      stack: [...stack],
      line: 10,
      done: true,
      note: `Acabaram os caracteres, mas a pilha não esvaziou: ${leftover} ${stack.length === 1 ? "ficou" : "ficaram"} sem fechamento. Inválida.`,
    });
    return out;
  }

  record({
    i: expr.length,
    stack: [],
    line: 10,
    ok: true,
    done: true,
    note: expr.length
      ? `Fim da expressão com a pilha vazia: todo fechamento achou a abertura dele, na ordem certa. Válida, com ${pushed} push e ${popped} pop.`
      : "Pilha vazia no fim, porque nunca teve nada nela. Uma expressão vazia é válida por definição.",
  });
  return out;
}

const DEFAULT_EXPR = "{[()]}";

// Casos escolhidos a dedo: o aninhado, o lado a lado, o cruzado (que é o que
// separa pilha de contador), a sobra de abertura e o fechamento órfão.
type Preset = { key: string; label: string; expr: string };
const PRESETS: Preset[] = [
  { key: "aninhado", label: "Aninhado: {[()]}", expr: "{[()]}" },
  { key: "lado", label: "Lado a lado: ()[]{}", expr: "()[]{}" },
  { key: "cruzado", label: "Cruzado: ([)]", expr: "([)]" },
  { key: "sobra", label: "Sobra aberto: ([]", expr: "([]" },
  { key: "orfao", label: "Fecha sem abrir: )(", expr: ")(" },
];

const RANDOM_OPENERS = ["(", "[", "{"];

export function StackVisualizer() {
  const [expr, setExpr] = useState(DEFAULT_EXPR);
  const [preset, setPreset] = useState("aninhado");

  const steps = useMemo(() => generateSteps(expr), [expr]);

  const viz = useVisualizer({
    title: "Visualizador · a pilha em ação: parênteses balanceados",
    total: steps.length,
    // O que muda a altura da peça: o tamanho da expressão, que decide quantas
    // células a fita tem e quão alta a torre pode ficar.
    measureOn: [expr.length],
  });

  const p = steps[viz.step];

  const onExprChange = (v: string) => {
    viz.reset();
    setPreset("");
    setExpr(clean(v));
  };
  const applyPreset = (pr: Preset) => {
    viz.reset();
    setPreset(pr.key);
    setExpr(pr.expr);
  };
  const shuffle = () => {
    const openers: string[] = [];
    let text = "";
    const target = 6 + Math.floor(Math.random() * 5);
    while (text.length < target) {
      const canClose = openers.length > 0;
      if (canClose && (Math.random() < 0.5 || text.length + openers.length >= target)) {
        const a = openers.pop() as string;
        text += a === "(" ? ")" : a === "[" ? "]" : "}";
      } else {
        const a = RANDOM_OPENERS[Math.floor(Math.random() * 3)];
        openers.push(a);
        text += a;
      }
    }
    while (openers.length) {
      const a = openers.pop() as string;
      text += a === "(" ? ")" : a === "[" ? "]" : "}";
    }
    viz.reset();
    setPreset("");
    setExpr(clean(text));
  };

  const inStack = new Set(p.stack.map((it) => it.i));
  const topIdx = p.stack.length ? p.stack[p.stack.length - 1].i : -1;

  const cells = Array.from(expr).map((c, i) => {
    let cls = "viz-cell";
    if (i === p.i) cls += " in";
    else if (i < p.i && !inStack.has(i)) cls += " drop";
    if (p.pairA === i || p.pairB === i) cls += " entra";
    if (p.errorAt === i) cls += " sai";
    let mark = "";
    if (i === topIdx) mark = "topo";
    else if (inStack.has(i)) mark = "•";
    return { i, c, cls, mark };
  });

  // A torre desenha o topo em cima, então a pilha é percorrida ao contrário.
  const tower = [...p.stack].reverse();

  const variables = [
    { name: "c", value: p.i >= 0 && p.i < expr.length ? `'${expr[p.i]}'` : "-" },
    { name: "pilha[-1]", value: p.stack.length ? `'${p.stack[p.stack.length - 1].c}'` : "vazia" },
    { name: "len(pilha)", value: `${p.stack.length}` },
    { name: "veredito", value: p.ok ? "válida" : p.done ? "inválida" : "…", best: !!p.ok },
  ];

  const stats = [
    { k: "n", label: "caracteres (n)", value: `${expr.length}` },
    { k: "push", label: "empilhados (push)", value: `${p.pushed}` },
    { k: "pop", label: "desempilhados (pop)", value: `${p.popped}` },
    { k: "alt", label: "altura máxima", value: `${p.maxHeight}` },
  ];

  const noteClass = "viz-note" + (p.ok ? " ok" : p.done ? " invalid" : "");

  return viz.inPanel(
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
            <span>Expressão (só ( ) [ ] {"{"} {"}"} )</span>
            <input className="viz-input" value={expr} onChange={(e) => onExprChange(e.target.value)} />
          </label>
          <button className="viz-btn" onClick={shuffle}>Sortear válida</button>
        </div>

        <div className="pl-arena">
          <div className="pl-col">
            <span className="pl-lbl">Expressão</span>
            {expr.length ? (
              <div className="viz-cells">
                {cells.map((c) => (
                  <div className="viz-cell-wrap" key={c.i}>
                    <span className="viz-cell-idx">{c.i}</span>
                    <div className={c.cls}>{c.c}</div>
                    <span className={`viz-mark${c.mark ? " show" : ""}`}>{c.mark || "·"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pl-vazia">expressão vazia</p>
            )}
            <p className={noteClass}>{p.note}</p>
          </div>

          <div className="pl-col">
            <span className="pl-lbl">Pilha (topo em cima)</span>
            <div className="pl-torre">
              {tower.length ? (
                tower.map((it, k) => (
                  <div
                    key={`${it.i}-${it.c}`}
                    className={`pl-item${k === 0 ? " topo" : ""}${k === 0 && p.line === 9 ? " entra" : ""}`}
                  >
                    <span>{it.c}</span>
                    <span className="pl-meta">{k === 0 ? "topo · " : ""}pos {it.i}</span>
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
