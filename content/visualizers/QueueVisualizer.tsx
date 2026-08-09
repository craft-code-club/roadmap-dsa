"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// QueueVisualizer, a fila sobre array nas duas versões: a ingênua e o buffer
// circular. É o "aha" do tópico.
//
// Gerador PURO de passos + a casca compartilhada. O que muda em relação aos
// outros é que aqui existem DOIS códigos, um por implementação, e o campo
// `line` aponta para o código do modo atual (as duas listas têm 19 linhas e só
// diferem no laço do desenfileirar, que é justamente o assunto).
//
// A única coisa que o aluno precisa ver acontecendo: na fila ingênua QUEM ANDA
// SÃO OS ELEMENTOS (o shift left, O(n)); no buffer circular quem anda são os
// PONTEIROS, e eles dão a volta pelo resto da divisão (O(1)). Por isso o mesmo
// roteiro de operações roda nos dois modos e o contador de "movimentações de
// elementos" fica sempre à vista: 7 na ingênua, 0 na circular.
//
// O anel em SVG é o mesmo array desenhado dobrado: os índices são os mesmos da
// fita de cima. Ele existe para o momento em que o fim passa da última posição
// e reaparece no zero, que no desenho linear parece um pulo e no anel é só o
// próximo passo. A legenda usa .tp-legenda, que já é genérica no globals.css.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type Op = { kind: "enq"; value: string } | { kind: "deq" };
type Mode = "ingenua" | "circular";

type Step = {
  slots: (string | null)[];
  start: number;
  end: number;
  size: number;
  line: number;
  op: number; // índice da operação no roteiro, -1 no passo de preparação
  wroteAt: number | null; // posição que acabou de ser escrita
  readAt: number | null; // posição que acabou de ser lida
  moved: number[]; // posições que receberam valor no shift left
  moves: number; // movimentações de elementos acumuladas
  last: string | null; // último valor devolvido pelo desenfileirar
  warn?: boolean;
  note: string;
};

// As duas listas mapeiam 1:1 com o campo `line` de cada passo, então a ordem e
// a quantidade de linhas não podem mudar sem ajustar o gerador junto.
const CODE: Record<Mode, string[]> = {
  ingenua: [
    "class FilaIngenua:",
    "    def __init__(self, cap):",
    "        self.dados = [None] * cap",
    "        self.tamanho = 0",
    "",
    "    def enfileirar(self, valor):",
    "        if self.tamanho == len(self.dados):",
    '            raise IndexError("fila cheia")',
    "        self.dados[self.tamanho] = valor",
    "        self.tamanho += 1",
    "",
    "    def desenfileirar(self):",
    "        if self.tamanho == 0:",
    '            raise IndexError("fila vazia")',
    "        valor = self.dados[0]",
    "        for i in range(1, self.tamanho):",
    "            self.dados[i - 1] = self.dados[i]",
    "        self.tamanho -= 1",
    "        return valor",
  ],
  circular: [
    "class FilaCircular:",
    "    def __init__(self, cap):",
    "        self.dados = [None] * cap",
    "        self.inicio = self.fim = self.tamanho = 0",
    "",
    "    def enfileirar(self, valor):",
    "        if self.tamanho == len(self.dados):",
    '            raise IndexError("fila cheia")',
    "        self.dados[self.fim] = valor",
    "        self.fim = (self.fim + 1) % len(self.dados)",
    "        self.tamanho += 1",
    "",
    "    def desenfileirar(self):",
    "        if self.tamanho == 0:",
    '            raise IndexError("fila vazia")',
    "        valor = self.dados[self.inicio]",
    "        self.inicio = (self.inicio + 1) % len(self.dados)",
    "        self.tamanho -= 1",
    "        return valor",
  ],
};

// Linhas de interesse, por modo (as duas implementações desencontram a partir
// do desenfileirar, que é onde uma tem o laço e a outra não).
const L: Record<Mode, Record<string, number>> = {
  ingenua: { init: 3, guardFull: 6, full: 7, write: 8, inc: 9, guardEmpty: 12, empty: 13, read: 14, shift: 16, dec: 17 },
  circular: { init: 3, guardFull: 6, full: 7, write: 8, inc: 10, guardEmpty: 13, empty: 14, read: 15, moveStart: 16, dec: 17 },
};

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Roteiro compacto: cada letra é um enfileirar, cada "-" é um desenfileirar.
function scriptOf(s: string): Op[] {
  return Array.from(s).map((c) => (c === "-" ? { kind: "deq" } : { kind: "enq", value: c }));
}

function nextLetter(script: Op[]): string {
  let n = 0;
  for (const o of script) if (o.kind === "enq") n++;
  return LETTERS[n % LETTERS.length];
}

function generateSteps(script: Op[], cap: number, mode: Mode): Step[] {
  const out: Step[] = [];
  const slots: (string | null)[] = new Array(cap).fill(null);
  const ln = L[mode];
  let start = 0;
  let end = 0;
  let size = 0;
  let moves = 0;
  let last: string | null = null;

  const reg = (p: { line: number; op: number; note: string; wroteAt?: number; readAt?: number; moved?: number[]; warn?: boolean }) => {
    out.push({
      slots: [...slots],
      start,
      end,
      size,
      moves,
      last,
      wroteAt: p.wroteAt ?? null,
      readAt: p.readAt ?? null,
      moved: p.moved ?? [],
      line: p.line,
      op: p.op,
      note: p.note,
      warn: p.warn,
    });
  };

  reg({
    line: ln.init,
    op: -1,
    note: `Array de ${cap} posições, nenhuma ocupada: início, fim e tamanho começam todos em 0.`,
  });

  let guard = 0;
  for (let k = 0; k < script.length && guard++ < 60; k++) {
    const op = script[k];

    if (op.kind === "enq") {
      if (size === cap) {
        reg({
          line: ln.full,
          op: k,
          warn: true,
          note: `Chegou ${op.value}, mas tamanho (${size}) já bateu na capacidade (${cap}): a fila está cheia. Aqui o guard rail recusa; as outras saídas seriam descartar o mais antigo ou dobrar o array.`,
        });
        continue;
      }
      reg({
        line: ln.guardFull,
        op: k,
        note: `Chegou ${op.value}. tamanho (${size}) ainda é menor que a capacidade (${cap}), então cabe mais um.`,
      });

      const pos = mode === "circular" ? end : size;
      const reused = slots[pos] !== null;
      slots[pos] = op.value;
      reg({
        line: ln.write,
        op: k,
        wroteAt: pos,
        note:
          mode === "circular"
            ? `Escrevo ${op.value} na posição ${pos}, que é exatamente para onde o fim aponta.${
                reused ? " Essa posição já tinha sido usada e ficou livre, então foi reaproveitada." : ""
              }`
            : `Escrevo ${op.value} na posição ${pos}. Na ingênua o fim da fila é sempre o próprio tamanho, então nem preciso de um ponteiro para ele.`,
      });

      if (mode === "circular") {
        const previous = end;
        end = (end + 1) % cap;
        size++;
        reg({
          line: ln.inc,
          op: k,
          wroteAt: pos,
          note: `fim = (${previous} + 1) % ${cap} = ${end}${
            end === 0 ? ": dei a volta, o fim reaparece na posição 0" : ""
          }. O tamanho vai para ${size}${size === cap ? " e a fila está cheia" : ""}.`,
        });
      } else {
        size++;
        reg({
          line: ln.inc,
          op: k,
          wroteAt: pos,
          note: `O tamanho vai para ${size}${size === cap ? " e a fila está cheia" : ""}. Nenhum elemento se mexeu: enfileirar é O(1) nas duas implementações.`,
        });
      }
      continue;
    }

    // desenfileirar
    if (size === 0) {
      reg({
        line: ln.empty,
        op: k,
        warn: true,
        note: `Pedi para desenfileirar com tamanho 0: não tem ninguém na fila. Sem esse guard rail eu devolveria lixo de uma posição que nunca foi escrita.`,
      });
      continue;
    }
    reg({
      line: ln.guardEmpty,
      op: k,
      note: `Vou desenfileirar. tamanho é ${size}, então tem gente na fila e a operação pode acontecer.`,
    });

    const readPos = mode === "circular" ? start : 0;
    const value = slots[readPos];
    reg({
      line: ln.read,
      op: k,
      readAt: readPos,
      note:
        mode === "circular"
          ? `Leio ${value} da posição ${readPos}, onde o início está parado. É o mais antigo da fila, o primeiro que entrou.`
          : `Leio ${value} da posição 0. Na ingênua o primeiro da fila é sempre a posição 0, e é isso que vai custar caro daqui a pouco.`,
    });

    if (mode === "circular") {
      const previous = start;
      start = (start + 1) % cap;
      size--;
      last = value;
      reg({
        line: ln.moveStart,
        op: k,
        note: `início = (${previous} + 1) % ${cap} = ${start}${
          start === 0 ? ": o início também dá a volta" : ""
        }. Zero elemento se mexeu, só o ponteiro andou.`,
      });
      reg({
        line: ln.dec,
        op: k,
        note: `O tamanho volta para ${size} e eu devolvo ${value}. Custo do desenfileirar: uma leitura, uma soma e um resto. O(1).`,
      });
    } else {
      const moved: number[] = [];
      for (let i = 1; i < size; i++) {
        slots[i - 1] = slots[i];
        moved.push(i - 1);
      }
      moves += Math.max(0, size - 1);
      reg({
        line: ln.shift,
        op: k,
        moved,
        note: moved.length
          ? `Agora o pedágio: empurro os ${moved.length} que sobraram uma casa para a esquerda (${moved
              .map((i) => `${slots[i]} para ${i}`)
              .join(", ")}). Foram ${moved.length} movimentações só para tirar um elemento.`
          : `A fila tinha um só, então não sobrou ninguém para empurrar. Esse é o único caso em que o shift sai de graça.`,
      });
      size--;
      last = value;
      reg({
        line: ln.dec,
        op: k,
        note: `O tamanho volta para ${size} e eu devolvo ${value}. Repare no resíduo: a última posição ainda guarda uma cópia, e só some quando alguém escrever por cima.`,
      });
    }
  }

  return out;
}

type Preset = { key: string; label: string; cap: number; script: string };
const PRESETS: Preset[] = [
  { key: "volta", label: "Dá a volta", cap: 5, script: "ABCD-EF-" },
  { key: "duas", label: "Duas voltas", cap: 4, script: "ABC-D-E-F-G-" },
  { key: "cheia", label: "Enche e recusa", cap: 4, script: "ABCDE" },
  { key: "vazia", label: "Esvazia demais", cap: 4, script: "AB---" },
];

const DEFAULT_PRESET = PRESETS[0];

// Geometria do anel: cada posição do array vira um ponto da circunferência,
// com o zero no topo e o índice crescendo no sentido horário.
const CX = 170;
const CY = 170;
const R_SLOT = 108;
const R_CELL = 26;

function point(i: number, cap: number, radius: number, offsetDeg = 0): [number, number] {
  const angle = ((-90 + (360 * i) / cap + offsetDeg) * Math.PI) / 180;
  return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)];
}

export function QueueVisualizer() {
  // Abre na ingênua de propósito: é a ordem em que o artigo apresenta as duas,
  // e o contador de movimentações só faz sentido depois de ver o shift left.
  const [mode, setMode] = useState<Mode>("ingenua");
  const [cap, setCap] = useState(DEFAULT_PRESET.cap);
  const [script, setScript] = useState<Op[]>(scriptOf(DEFAULT_PRESET.script));
  const [preset, setPreset] = useState(DEFAULT_PRESET.key);

  const steps = useMemo(() => generateSteps(script, cap, mode), [script, cap, mode]);

  const viz = useVisualizer({
    title: "Visualizador · a fila no array: ingênua x buffer circular",
    total: steps.length,
    // O que muda a altura da peça: o modo (o circular ganha uma quinta ficha de
    // estatística), a capacidade (as células da fita), o tamanho do roteiro (as
    // fichas quebram linha) e o número de passos, porque um roteiro vazio gera
    // UM passo só e aí o rodapé inteiro some.
    measureOn: [mode, cap, script.length, steps.length],
  });

  const p = steps[viz.step];

  const applyPreset = (pr: Preset) => {
    viz.reset();
    setPreset(pr.key);
    setCap(pr.cap);
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
  const clear = () => {
    viz.reset();
    setPreset("");
    setScript([]);
  };
  const changeCap = (v: string) => {
    const n = parseInt(v, 10);
    if (isNaN(n)) return;
    viz.reset();
    setPreset("");
    setCap(Math.min(8, Math.max(3, n)));
  };
  const changeMode = (m: Mode) => {
    viz.reset();
    setMode(m);
  };

  // Uma posição está OCUPADA se pertence à fila lógica agora. Fora disso ela
  // pode estar vazia (nunca escrita) ou guardar um resíduo, um valor que já foi
  // consumido e continua gravado até alguém escrever por cima.
  const occupied = (i: number): boolean => {
    if (p.size === 0) return false;
    if (mode === "ingenua") return i < p.size;
    const rel = (i - p.start + cap) % cap;
    return rel < p.size;
  };

  const classOf = (i: number): string => {
    let cls = "viz-cell";
    if (occupied(i)) cls += " in";
    else if (p.slots[i] !== null) cls += " drop fila-fantasma";
    else cls += " fila-vaga";
    if (p.readAt === i) cls += " sai";
    if (p.wroteAt === i || p.moved.includes(i)) cls += " entra";
    return cls;
  };

  const markOf = (i: number): string => {
    const isStart = i === (mode === "ingenua" ? 0 : p.start);
    const isEnd = i === (mode === "ingenua" ? p.size : p.end);
    if (isStart && isEnd) return "iní fim";
    if (isStart) return "iní";
    if (isEnd) return "fim";
    return "";
  };

  const code = CODE[mode];

  const vars = [
    { name: "inicio", value: mode === "ingenua" ? "0 (fixo)" : `${p.start}` },
    { name: "fim", value: mode === "ingenua" ? `${p.size} (= tamanho)` : `${p.end}` },
    { name: "tamanho", value: `${p.size} / ${cap}` },
    { name: "devolvido", value: p.last ?? "-", best: true },
  ];

  const enqueued = script.filter((o) => o.kind === "enq").length;
  const dequeued = script.length - enqueued;
  const stats = [
    { k: "cap", label: "capacidade", value: `${cap}` },
    { k: "ocup", label: "ocupadas agora", value: `${p.size}` },
    { k: "movs", label: "movimentações de elementos", value: `${p.moves}` },
    { k: "custo", label: "custo do desenfileirar", value: mode === "ingenua" ? "O(n)" : "O(1)" },
  ];
  // No circular, início e fim caindo na mesma posição é o estado ambíguo da
  // seção "cheia ou vazia": só o tamanho desempata, e este card mostra isso
  // acontecendo (no anel, as duas mãos se separam alguns graus para aparecer).
  if (mode === "circular") {
    stats.push({
      k: "ambiguo",
      label: "início == fim?",
      value: p.start === p.end ? (p.size === cap ? "sim, e cheia" : "sim, e vazia") : "não",
    });
  }

  const noteClass = "viz-note" + (p.warn ? " invalid" : viz.step === steps.length - 1 ? " ok" : "");

  // O anel: o mesmo array, dobrado. Quando início e fim caem na mesma posição
  // as duas mãos são desviadas alguns graus para nenhuma sumir atrás da outra.
  const together = mode === "circular" && p.start === p.end;
  const hand = (i: number, color: string, offset: number) => {
    const [x, y] = point(i, cap, R_SLOT - R_CELL - 3, offset);
    const [bx, by] = point(i, cap, 30, offset);
    const [px, py] = point(i, cap, R_SLOT - R_CELL - 17, offset);
    const angle = ((-90 + (360 * i) / cap + offset) * Math.PI) / 180;
    const nx = -Math.sin(angle) * 6;
    const ny = Math.cos(angle) * 6;
    return (
      <g key={color}>
        <line x1={bx} y1={by} x2={px} y2={py} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        <polygon points={`${x},${y} ${px + nx},${py + ny} ${px - nx},${py - ny}`} fill={color} />
      </g>
    );
  };

  const ringDescription =
    mode === "circular"
      ? `Anel de ${cap} posições. Início na posição ${p.start}, fim na posição ${p.end}, ${p.size} de ${cap} ocupadas.`
      : `Array de ${cap} posições. O início fica preso na posição 0 e o fim está na posição ${p.size}, com ${p.size} de ${cap} ocupadas.`;

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          <button
            type="button"
            className={`bigo-chip${mode === "ingenua" ? " on" : ""}`}
            onClick={() => changeMode("ingenua")}
            aria-pressed={mode === "ingenua"}
          >
            <span className="sw" style={{ background: mode === "ingenua" ? "#fbbf24" : "#3a4a60" }} />
            fila ingênua
          </button>
          <button
            type="button"
            className={`bigo-chip${mode === "circular" ? " on" : ""}`}
            onClick={() => changeMode("circular")}
            aria-pressed={mode === "circular"}
          >
            <span className="sw" style={{ background: mode === "circular" ? "#34d399" : "#3a4a60" }} />
            buffer circular
          </button>
        </div>

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
          <label className="viz-field">
            <span>capacidade</span>
            <input className="viz-input k" type="number" min={3} max={8} value={cap} onChange={(e) => changeCap(e.target.value)} />
          </label>
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
              <button type="button" className="viz-btn" disabled={!script.length} onClick={clear}>
                limpar
              </button>
            </div>
          </div>
        </div>

        <div className="fila-roteiro">
          {script.length === 0 && <span className="fila-vazio">roteiro vazio: use os botões acima para montar a sequência</span>}
          {script.map((o, i) => (
            <span key={i} className={`fila-op${i === p.op ? " on" : ""}${i < p.op ? " feito" : ""}`}>
              {o.kind === "enq" ? `↓ ${o.value}` : "↑ deq"}
            </span>
          ))}
        </div>

        <div className="viz-cells">
          {p.slots.map((v, i) => {
            const mark = markOf(i);
            return (
              <div className="viz-cell-wrap" key={i}>
                <span className="viz-cell-idx">{i}</span>
                <div className={classOf(i)}>{v ?? "·"}</div>
                <span className={`viz-mark${mark ? " show" : ""}`}>{mark || "·"}</span>
              </div>
            );
          })}
        </div>

        <div className="fila-anel-wrap">
          <svg className="fila-anel" viewBox="0 0 340 340" role="img" aria-label={ringDescription}>
            <circle cx={CX} cy={CY} r={R_SLOT} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
            {p.slots.map((v, i) => {
              const [x, y] = point(i, cap, R_SLOT);
              const [ix, iy] = point(i, cap, R_SLOT + R_CELL + 12);
              const inside = occupied(i);
              const residue = !inside && v !== null;
              return (
                <g key={i}>
                  <circle
                    cx={x}
                    cy={y}
                    r={R_CELL}
                    fill={inside ? "rgba(59,130,246,0.18)" : "#0f1826"}
                    stroke={inside ? "#3b82f6" : "rgba(255,255,255,0.12)"}
                    strokeWidth={1.5}
                    strokeDasharray={inside ? undefined : "4 3"}
                    opacity={residue ? 0.6 : 1}
                  />
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={inside ? "#ffffff" : "#61748c"}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    fontSize={17}
                    fontWeight={600}
                    opacity={residue ? 0.7 : 1}
                  >
                    {v ?? "·"}
                  </text>
                  <text
                    x={ix}
                    y={iy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#61748c"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    fontSize={11}
                  >
                    {i}
                  </text>
                </g>
              );
            })}
            {hand(mode === "ingenua" ? 0 : p.start, "#3b82f6", together ? -7 : 0)}
            {(mode === "circular" || p.size < cap) && hand(mode === "ingenua" ? p.size : p.end, "#fbbf24", together ? 7 : 0)}
            <circle cx={CX} cy={CY} r={4} fill="#4c5f79" />
          </svg>
          <p className="tp-legenda">
            <span>
              <i style={{ background: "#3b82f6" }} /> início (de onde sai)
            </span>
            <span>
              <i style={{ background: "#fbbf24" }} /> fim (onde entra)
            </span>
            <span>
              <i style={{ background: "#0f1826", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.2)" }} /> livre ou resíduo
            </span>
          </p>
        </div>

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com a altura inteira
              do código. O `.viz-code-slot` é o truque de grid 1fr→0fr, a única
              forma de animar altura automática em CSS puro. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">{mode === "ingenua" ? "fila_ingenua.py" : "fila_circular.py"}</div>
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
            <p className="fila-resumo">
              Roteiro com {enqueued} {enqueued === 1 ? "entrada" : "entradas"} e {dequeued}{" "}
              {dequeued === 1 ? "saída" : "saídas"}. Até aqui, {p.moves}{" "}
              {p.moves === 1 ? "movimentação de elemento" : "movimentações de elementos"}.
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
