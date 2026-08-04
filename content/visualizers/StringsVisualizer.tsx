"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// StringsVisualizer, o custo de montar uma string caractere a caractere.
//
// Mesmo padrão do TwoPointersVisualizer: gerador PURO de passos + a casca
// compartilhada (células, código sincronizado, variáveis, controles, Expandir).
//
// O que este visualizador ensina: com string imutável, `s = s + c` dentro de um
// laço aloca uma string NOVA a cada volta e recopia tudo que já estava lá. O
// contador de caracteres copiados fecha em n(n+1)/2, enquanto a lista + join
// fecha em n. Os dois totais ficam sempre na tela, lado a lado, para a
// diferença entre O(n²) e O(n) aparecer em número e não só em teoria.
// ---------------------------------------------------------------------------

type Mode = "concat" | "join";

type Block = { id: number; text: string; alive: boolean; fresh: boolean };

type Step = {
  line: number;
  i: number; // índice do caractere corrente (-1 antes de começar)
  used: number; // quantos caracteres já entraram no resultado
  blocks: Block[]; // strings alocadas na memória
  parts: string[]; // a lista do modo join
  copies: number;
  strings: number;
  note: string;
  ok?: boolean;
  done?: boolean;
};

// As linhas mapeiam 1:1 com o campo `line` dos passos, então a ordem e a
// quantidade de linhas não podem mudar sem ajustar o gerador junto.
const CONCAT_CODE = [
  "def juntar(palavra):",
  '    s = ""',
  "    for c in palavra:",
  "        s = s + c        # string NOVA a cada volta",
  "    return s",
];

const JOIN_CODE = [
  "def juntar(palavra):",
  "    partes = []",
  "    for c in palavra:",
  "        partes.append(c) # so guarda a referencia",
  '    return "".join(partes)',
];

const MODES: { key: Mode; label: string; family: string; color: string; file: string }[] = [
  { key: "concat", label: "s = s + c no laço", family: "O(n²)", color: "#fbbf24", file: "concat.py" },
  { key: "join", label: "lista + join", family: "O(n)", color: "#34d399", file: "join.py" },
];

const WORDS = ["CCC", "CRAFT", "CODECLUB", "ALGORITMO", "ESTRUTURA", "CRAFTCODECLUB", "IMUTAVEL", "STRING"];

// Os mesmos exemplos que o artigo manda prever antes de rodar, para o aluno não
// precisar digitar (inclusive a entrada vazia, que é o caso de borda).
const PRESETS: { label: string; text: string }[] = [
  { label: "CCC", text: "CCC" },
  { label: "CRAFTCODE", text: "CRAFTCODE" },
  { label: "CRAFTCODECLUB", text: "CRAFTCODECLUB" },
  { label: "entrada vazia", text: "" },
];

const DEFAULT_WORD = "CRAFTCODE";
const MAX = 16;

const SPEEDS = [0, 1400, 950, 650, 420, 250];
const SPEED_LABELS = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

// Formatação determinística (nada de Intl, para o HTML do servidor bater com o
// do cliente na hidratação).
function num(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function generateSteps(word: string, mode: Mode): Step[] {
  const chars = Array.from(word).slice(0, MAX);
  const n = chars.length;
  const out: Step[] = [];

  if (mode === "concat") {
    const blocks: Block[] = [];
    let copies = 0;
    let strings = 0;
    out.push({
      line: 1,
      i: -1,
      used: 0,
      blocks: [],
      parts: [],
      copies,
      strings,
      note: n
        ? "Começo com a string vazia. Como a string é imutável, cada volta do laço vai ter que criar uma string NOVA: não existe escrever um caractere no fim da que já está lá."
        : "A entrada está vazia: o laço não roda nenhuma vez e o resultado é a própria string vazia. Zero cópias, zero alocações.",
    });
    for (let i = 0; i < n; i++) {
      copies += i + 1;
      strings += 1;
      for (const b of blocks) {
        b.alive = false;
        b.fresh = false;
      }
      blocks.push({ id: i + 1, text: chars.slice(0, i + 1).join(""), alive: true, fresh: true });
      out.push({
        line: 3,
        i,
        used: i + 1,
        blocks: blocks.map((b) => ({ ...b })),
        parts: [],
        copies,
        strings,
        note:
          `Volta ${i + 1}: aloco uma string nova de ${i + 1} ${plural(i + 1, "caractere", "caracteres")}, ` +
          `copio ${i === 0 ? "nada de antes" : i === 1 ? "o caractere que já estava lá" : `os ${i} caracteres de antes`} e escrevo o "${chars[i]}". ` +
          `${i + 1} ${plural(i + 1, "cópia", "cópias")} nesta volta, ${copies} no total. ` +
          (i === 0 ? "A string vazia fica para trás." : "A string da volta anterior virou lixo para o coletor."),
      });
    }
    out.push({
      line: 4,
      i: -1,
      used: n,
      blocks: blocks.map((b) => ({ ...b, fresh: false })),
      parts: [],
      copies,
      strings,
      ok: true,
      done: true,
      note: n
        ? `Resultado "${chars.join("")}" com ${copies} ${plural(copies, "caractere copiado", "caracteres copiados")} e ${strings} ${plural(strings, "string alocada", "strings alocadas")}, das quais ${n - 1} viraram lixo. A conta é 1+2+...+${n} = ${copies}, ou seja n(n+1)/2, que é O(n²).`
        : "Nada a montar. Repare que este é o caso de borda que costuma quebrar implementação apressada.",
    });
    return out;
  }

  const parts: string[] = [];
  let copies = 0;
  let strings = 0;
  out.push({
    line: 1,
    i: -1,
    used: 0,
    blocks: [],
    parts: [],
    copies,
    strings,
    note: n
      ? "Começo com uma lista vazia. A ideia é adiar a cópia: guardo os pedaços e junto tudo de uma vez só no fim."
      : "A entrada está vazia: a lista fica vazia e o join devolve a string vazia sem copiar nada.",
  });
  for (let i = 0; i < n; i++) {
    parts.push(chars[i]);
    out.push({
      line: 3,
      i,
      used: i + 1,
      blocks: [],
      parts: [...parts],
      copies,
      strings,
      note: `Volta ${i + 1}: guardo "${chars[i]}" na lista. A lista só anota onde o caractere está, não copia caractere nenhum, então o contador de cópias continua em ${copies}.`,
    });
  }
  copies += n;
  strings = n ? 1 : 0;
  out.push({
    line: 4,
    i: -1,
    used: n,
    blocks: n ? [{ id: 1, text: chars.join(""), alive: true, fresh: true }] : [],
    parts: [...parts],
    copies,
    strings,
    ok: true,
    done: true,
    note: n
      ? `join: agora sim. Somo os ${n} tamanhos, aloco UMA string de ${n} ${plural(n, "caractere", "caracteres")} e copio tudo numa passada. Total: ${copies} ${plural(copies, "cópia", "cópias")} contra ${(n * (n + 1)) / 2} do "+=" no laço.`
      : "join de uma lista vazia: devolve a string vazia, sem alocar nada.",
  });
  return out;
}

export function StringsVisualizer() {
  const [mode, setMode] = useState<Mode>("concat");
  const [word, setWord] = useState(DEFAULT_WORD);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const chars = useMemo(() => Array.from(word).slice(0, MAX), [word]);
  const n = chars.length;
  const steps = useMemo(() => generateSteps(word, mode), [word, mode]);
  const total = steps.length;
  const idx = Math.min(step, total - 1);
  const p = steps[idx];
  const cfg = MODES.find((m) => m.key === mode) ?? MODES[0];

  const stop = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);
  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    stop();
    if (!playing) return;
    timer.current = setInterval(() => setStep((s) => (s >= total - 1 ? s : s + 1)), SPEEDS[speed]);
    return stop;
  }, [playing, speed, total, stop]);

  useEffect(() => {
    if (playing && idx >= total - 1) setPlaying(false);
  }, [playing, idx, total]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const reset = () => {
    stop();
    setPlaying(false);
    setStep(0);
  };

  const onWordChange = (v: string) => {
    reset();
    setWord(Array.from(v).slice(0, MAX).join(""));
  };

  const pickRandom = () => {
    const next = WORDS[Math.floor(Math.random() * WORDS.length)];
    reset();
    setWord(next);
  };

  const pickMode = (m: Mode) => {
    reset();
    setMode(m);
  };

  // Já consumido fica aceso (o caractere JÁ está dentro de s), o da volta atual
  // pulsa, e o que ainda não entrou fica apagado. É o resultado crescendo.
  const cells = chars.map((c, i) => {
    let cls = "viz-cell";
    if (p.done) cls += " in";
    else if (i === p.i) cls += " in entra";
    else if (i < p.used) cls += " in";
    else cls += " drop";
    return { i, c, cls, mark: i === p.i ? "c" : "" };
  });

  const concatTotal = (n * (n + 1)) / 2;
  const dead = p.blocks.filter((b) => !b.alive).length;

  const vars =
    mode === "concat"
      ? [
          { name: "s", value: `"${chars.slice(0, p.used).join("")}"` },
          { name: "len(s)", value: `${p.used}` },
          { name: "c", value: p.i >= 0 ? `"${chars[p.i]}"` : "-" },
          { name: "cópias", value: num(p.copies), best: true },
        ]
      : [
          { name: "len(partes)", value: `${p.parts.length}` },
          { name: "c", value: p.i >= 0 ? `"${chars[p.i]}"` : "-" },
          { name: "strings novas", value: `${p.strings}` },
          { name: "cópias", value: num(p.copies), best: true },
        ];

  const noteClass = "viz-note" + (p.ok ? " ok" : "");
  const stepPct = Math.round(((idx + 1) / total) * 100);
  const code = mode === "concat" ? CONCAT_CODE : JOIN_CODE;

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" style={{ background: cfg.color }} />
          <span>Visualizador · o custo de montar uma string</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">
            passo {idx + 1} de {total}
          </span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "✕ Fechar" : "⤢ Expandir"}
          </button>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          {MODES.map((m) => {
            const on = m.key === mode;
            return (
              <button
                key={m.key}
                className={`bigo-chip${on ? " on" : ""}`}
                style={on ? { borderColor: m.color, color: m.color } : undefined}
                onClick={() => pickMode(m.key)}
                aria-pressed={on}
              >
                <span className="sw" style={{ background: on ? m.color : "#3a4a60" }} />
                {m.family} · {m.label}
              </button>
            );
          })}
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Palavra a montar, um caractere por volta</span>
            <input className="viz-input" value={word} onChange={(e) => onWordChange(e.target.value)} />
          </label>
          <button className="viz-btn" onClick={pickRandom}>
            Sortear
          </button>
        </div>

        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              key={pr.label}
              className={`bigo-chip${word === pr.text ? " on" : ""}`}
              onClick={() => onWordChange(pr.text)}
              aria-pressed={word === pr.text}
            >
              {pr.label} · n = {Array.from(pr.text).length}
            </button>
          ))}
        </div>

        <div className="viz-cells">
          {cells.length ? (
            cells.map((c) => (
              <div className="viz-cell-wrap" key={c.i}>
                <span className="viz-cell-idx">{c.i}</span>
                <div className={c.cls}>{c.c}</div>
                <span className={`viz-mark${c.mark ? " show" : ""}`}>{c.mark || "·"}</span>
              </div>
            ))
          ) : (
            <span className="str-vazio">Entrada vazia: nada para percorrer.</span>
          )}
        </div>

        <div className="str-heap">
          <span className="str-lbl">
            Memória: strings alocadas
            {dead > 0 ? <em className="str-lixo"> {dead} para o coletor de lixo</em> : null}
          </span>
          {p.blocks.length ? (
            p.blocks.map((b) => (
              <span key={b.id} className={`str-bloco${b.alive ? " viva" : " morta"}${b.fresh ? " nova" : ""}`}>
                {b.text}
              </span>
            ))
          ) : (
            <span className="str-vazio">nada alocado ainda</span>
          )}
        </div>

        {mode === "join" ? (
          <div className="str-heap">
            <span className="str-lbl">Lista de pedaços: guarda a referência, não copia caractere</span>
            {p.parts.length ? (
              p.parts.map((c, i) => (
                <span key={i} className="str-bloco viva">
                  {c}
                </span>
              ))
            ) : (
              <span className="str-vazio">lista vazia</span>
            )}
          </div>
        ) : null}

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>caracteres copiados</span>
            <strong style={{ color: cfg.color }}>{num(p.copies)}</strong>
          </div>
          <div className="bigo-stat">
            <span>strings alocadas</span>
            <strong>{num(p.strings)}</strong>
          </div>
          <div className="bigo-stat">
            <span>total com s = s + c</span>
            <strong style={{ color: "#fbbf24" }}>{num(concatTotal)}</strong>
          </div>
          <div className="bigo-stat">
            <span>total com join</span>
            <strong style={{ color: "#34d399" }}>{num(n)}</strong>
          </div>
        </div>

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">
              {cfg.file} · {cfg.family}
            </div>
            <div className="viz-code-body">
              {code.map((txt, i) => (
                <div key={i} className={`viz-line${i === p.line ? " on" : ""}`}>
                  <span className="ln">{i + 1}</span>
                  {txt}
                </div>
              ))}
            </div>
          </div>
          <div className="viz-vars">
            <div className="viz-vars-head">Variáveis</div>
            {vars.map((v) => (
              <div className="viz-var" key={v.name}>
                <span className="viz-var-name">{v.name}</span>
                <span className={`viz-var-val${v.best ? " best" : ""}`}>{v.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="viz-controls">
          <button className="viz-btn" title="Reiniciar" onClick={reset}>
            ↺
          </button>
          <button
            className="viz-btn"
            disabled={idx === 0}
            onClick={() => {
              stop();
              setPlaying(false);
              setStep(Math.max(0, idx - 1));
            }}
          >
            ‹ Anterior
          </button>
          <button
            className="viz-play"
            onClick={() => {
              if (playing) {
                setPlaying(false);
                return;
              }
              setStep(idx >= total - 1 ? 0 : idx);
              setPlaying(true);
            }}
          >
            {playing ? "❚❚ Pausar" : "▶ Rodar"}
          </button>
          <button
            className="viz-btn"
            disabled={idx === total - 1}
            onClick={() => {
              stop();
              setPlaying(false);
              setStep(Math.min(idx + 1, total - 1));
            }}
          >
            Próximo ›
          </button>
          <div className="viz-speed">
            <span>Velocidade</span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={speed}
              onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
            />
            <span className="val">{SPEED_LABELS[speed]}</span>
          </div>
        </div>
        <div className="viz-progress">
          <div className="viz-progress-fill" style={{ width: `${stepPct}%`, background: cfg.color }} />
        </div>
      </div>
    </figure>
  );

  if (expanded && mounted) {
    return createPortal(
      <div
        className="viz-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) setExpanded(false);
        }}
      >
        {viz}
      </div>,
      document.body
    );
  }
  return viz;
}
