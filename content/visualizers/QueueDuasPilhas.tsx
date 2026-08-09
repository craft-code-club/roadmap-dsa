"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// QueueDuasPilhas, a fila montada com duas pilhas (LeetCode 232).
//
// Gerador PURO de passos + a casca compartilhada. O desenho central são duas
// torres, porque o truque é geométrico: despejar a pilha de ENTRADA na de SAÍDA
// inverte a ordem, e LIFO invertido é FIFO.
//
// A única coisa que o aluno precisa ver acontecendo: a virada é cara, mas
// acontece raramente, e cada elemento é empurrado e retirado no máximo duas
// vezes em cada pilha. Por isso o contador "operações por elemento" nunca passa
// de 4, mexa-se no roteiro o quanto quiser: é O(1) amortizado na tela.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type Op = { kind: "enq"; value: string } | { kind: "deq" };

type Step = {
  input: string[]; // fundo -> topo
  output: string[]; // fundo -> topo
  line: number;
  op: number;
  moving: string | null; // valor que acabou de trocar de pilha
  ops: number; // pushes e pops nas duas pilhas
  enqueued: number;
  delivered: number;
  flips: number;
  last: string | null;
  warn?: boolean;
  note: string;
};

// As linhas mapeiam 1:1 com o campo `line` de cada passo, então a ordem e a
// quantidade de linhas não podem mudar sem ajustar o gerador junto.
const CODE = [
  "class FilaComDuasPilhas:",
  "    def __init__(self):",
  "        self.entrada = []   # todo mundo chega aqui",
  "        self.saida = []     # todo mundo sai daqui",
  "",
  "    def enfileirar(self, valor):",
  "        self.entrada.append(valor)",
  "",
  "    def desenfileirar(self):",
  "        if not self.entrada and not self.saida:",
  '            raise IndexError("fila vazia")',
  "        if not self.saida:",
  "            while self.entrada:",
  "                self.saida.append(self.entrada.pop())",
  "        return self.saida.pop()",
];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function scriptOf(s: string): Op[] {
  return Array.from(s).map((c) => (c === "-" ? { kind: "deq" } : { kind: "enq", value: c }));
}

function nextLetter(script: Op[]): string {
  let n = 0;
  for (const o of script) if (o.kind === "enq") n++;
  return LETTERS[n % LETTERS.length];
}

function generateSteps(script: Op[]): Step[] {
  const out: Step[] = [];
  const input: string[] = [];
  const output: string[] = [];
  let ops = 0;
  let enqueued = 0;
  let delivered = 0;
  let flips = 0;
  let last: string | null = null;

  const reg = (p: { line: number; op: number; note: string; moving?: string; warn?: boolean }) => {
    out.push({
      input: [...input],
      output: [...output],
      line: p.line,
      op: p.op,
      moving: p.moving ?? null,
      ops,
      enqueued,
      delivered,
      flips,
      last,
      warn: p.warn,
      note: p.note,
    });
  };

  reg({ line: 3, op: -1, note: "As duas pilhas começam vazias. Uma só recebe, a outra só entrega." });

  let guard = 0;
  for (let k = 0; k < script.length && guard++ < 60; k++) {
    const op = script[k];

    if (op.kind === "enq") {
      input.push(op.value);
      ops++;
      enqueued++;
      reg({
        line: 6,
        op: k,
        moving: op.value,
        note: `Enfileirar ${op.value} é só empilhar na entrada, sem olhar para mais nada. Uma operação, sempre: O(1) de verdade, não amortizado.`,
      });
      continue;
    }

    if (!input.length && !output.length) {
      reg({
        line: 10,
        op: k,
        warn: true,
        note: "As duas pilhas estão vazias: não tem ninguém para entregar. É o único caso em que o desenfileirar falha.",
      });
      continue;
    }
    reg({
      line: 9,
      op: k,
      note: `Pediram um desenfileirar. Tem ${input.length} na entrada e ${output.length} na saída, então alguém vai sair.`,
    });
    // Guardado para a nota final dizer quanto ESTE desenfileirar custou: é o
    // contraste entre o passo caro (a virada) e os baratos que vêm depois, que
    // é a definição de amortizado.
    const opsBefore = ops;

    if (!output.length) {
      flips++;
      reg({
        line: 11,
        op: k,
        note: `A saída está vazia, então é hora da virada: vou despejar os ${input.length} da entrada, um por um. O topo da entrada é o mais NOVO, e ele vai para o fundo da saída.`,
      });
      let g2 = 0;
      while (input.length && g2++ < 40) {
        const v = input.pop() as string;
        output.push(v);
        ops += 2;
        reg({
          line: 13,
          op: k,
          moving: v,
          note: `${v} sai do topo da entrada e vai para o topo da saída. Como saiu por último, entra por primeiro: a ordem está sendo invertida.`,
        });
      }
    } else {
      reg({
        line: 11,
        op: k,
        note: `A saída ainda tem ${output.length} ${output.length === 1 ? "elemento" : "elementos"}, então não viro nada: o próximo da fila já está no topo dela.`,
      });
    }

    const v = output.pop() as string;
    ops++;
    delivered++;
    last = v;
    const cost = ops - opsBefore;
    reg({
      line: 14,
      op: k,
      moving: v,
      note: `Desempilho ${v} da saída e devolvo. Foi o primeiro que entrou na fila, e saiu do topo de uma pilha: LIFO virado do avesso é FIFO. Este desenfileirar custou ${cost} ${
        cost === 1 ? "operação de pilha (o mínimo possível)" : "operações de pilha, porque pagou a virada"
      }.`,
    });
  }

  return out;
}

type Preset = { key: string; label: string; script: string };
const PRESETS: Preset[] = [
  { key: "tudo", label: "Enche e esvazia", script: "ABCD----" },
  { key: "misto", label: "Intercalado", script: "AB-C-D-" },
  { key: "duas", label: "Duas viradas", script: "ABC--DE--" },
  { key: "vazia", label: "Esvazia demais", script: "A--" },
];

const DEFAULT_PRESET = PRESETS[0];

// Custo amortizado: operações de pilha divididas por elemento que passou pela
// fila. Nunca passa de 4, que é o teto do truque (cada elemento é empurrado e
// retirado uma vez em cada pilha).
function average(ops: number, elements: number): string {
  if (!elements) return "-";
  const v = Math.round((ops / elements) * 10) / 10;
  return v.toFixed(1).replace(".", ",");
}

export function QueueDuasPilhas() {
  const [script, setScript] = useState<Op[]>(scriptOf(DEFAULT_PRESET.script));
  const [preset, setPreset] = useState(DEFAULT_PRESET.key);

  const steps = useMemo(() => generateSteps(script), [script]);

  const viz = useVisualizer({
    title: "Visualizador · fila com duas pilhas: a virada que inverte a ordem",
    total: steps.length,
    // O que muda a altura da peça: o tamanho do roteiro (as fichas quebram
    // linha e as torres crescem) e o número de passos, porque um roteiro vazio
    // gera UM passo só e aí o rodapé inteiro some.
    measureOn: [script.length, steps.length],
  });

  const p = steps[viz.step];

  const applyPreset = (pr: Preset) => {
    viz.reset();
    setPreset(pr.key);
    setScript(scriptOf(pr.script));
  };
  const append = (op: Op) => {
    viz.reset();
    setPreset("");
    setScript((r) => (r.length >= 16 ? r : [...r, op]));
  };
  const undo = () => {
    viz.reset();
    setPreset("");
    setScript((r) => r.slice(0, -1));
  };

  const tower = (items: string[], which: "entrada" | "saida") => {
    const topDown = [...items].reverse();
    return (
      <div className="fila-torre">
        <div className="fila-torre-rot">{which === "entrada" ? "entrada · só empilha" : "saída · só desempilha"}</div>
        <div className="fila-torre-corpo">
          {topDown.length === 0 && <span className="fila-vazio">vazia</span>}
          {topDown.map((v, i) => (
            <div key={`${v}-${i}`} className={`viz-cell${i === 0 ? " in" : ""}${p.moving === v ? " entra" : ""}`}>
              {v}
            </div>
          ))}
        </div>
        <div className="fila-torre-base">{topDown.length ? `topo: ${topDown[0]}` : "sem topo"}</div>
      </div>
    );
  };

  const vars = [
    { name: "entrada", value: p.input.length ? p.input.join(" ") : "[]" },
    { name: "saida", value: p.output.length ? p.output.join(" ") : "[]" },
    { name: "viradas", value: `${p.flips}` },
    { name: "devolvido", value: p.last ?? "-", best: true },
  ];

  const stats = [
    { k: "ops", label: "operações de pilha", value: `${p.ops}` },
    { k: "ent", label: "elementos entregues", value: `${p.delivered}` },
    { k: "med", label: "operações por elemento", value: average(p.ops, p.enqueued) },
    { k: "custo", label: "custo do desenfileirar", value: "O(1) amortizado" },
  ];

  const noteClass = "viz-note" + (p.warn ? " invalid" : viz.step === steps.length - 1 ? " ok" : "");

  const frame = (
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
          <div className="viz-field grow">
            <span>roteiro de operações</span>
            <div className="fila-botoes">
              <button type="button" className="viz-btn" onClick={() => append({ kind: "enq", value: nextLetter(script) })}>
                + enfileirar {nextLetter(script)}
              </button>
              <button type="button" className="viz-btn" onClick={() => append({ kind: "deq" })}>
                + desenfileirar
              </button>
              <button type="button" className="viz-btn" disabled={!script.length} onClick={undo}>
                ← desfazer
              </button>
            </div>
          </div>
        </div>

        <div className="fila-roteiro">
          {script.length === 0 && <span className="fila-vazio">roteiro vazio: use os botões acima</span>}
          {script.map((o, i) => (
            <span key={i} className={`fila-op${i === p.op ? " on" : ""}${i < p.op ? " feito" : ""}`}>
              {o.kind === "enq" ? `↓ ${o.value}` : "↑ deq"}
            </span>
          ))}
        </div>

        <div className="fila-torres">
          {tower(p.input, "entrada")}
          <div className="fila-vira">
            <span>↻</span>
            <em>a virada só acontece quando a saída esvazia</em>
          </div>
          {tower(p.output, "saida")}
        </div>

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com a altura inteira
              do código. O `.viz-code-slot` é o truque de grid 1fr→0fr, a única
              forma de animar altura automática em CSS puro. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">fila_com_duas_pilhas.py</div>
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
            <p className="fila-resumo">Nas duas pilhas, o topo é o primeiro item de cima para baixo.</p>
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
