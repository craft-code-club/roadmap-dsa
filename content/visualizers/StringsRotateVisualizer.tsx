"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// StringsRotateVisualizer, o LeetCode 796 (Rotate String) nos dois caminhos.
//
// Gerador puro de passos + a casca compartilhada, igual ao TwoPointersVisualizer.
// A diferença é que aqui existem DUAS fitas de células alinhadas: a string de
// trabalho em cima e o goal embaixo. O alinhamento sai de graça porque as duas
// fitas têm o mesmo número de células do mesmo tamanho (as posições fora da
// janela viram célula fantasma), então elas quebram a linha nos mesmos pontos
// no celular.
//
// Modo "laço": rotaciona com fatia + concatenação, e o contador de cópias sobe
// a cada rotação. Modo "truque": concatena s consigo mesmo uma vez só e procura
// o goal ali dentro, porque s + s contém todas as rotações de s.
// ---------------------------------------------------------------------------

type Modo = "laco" | "truque";

type Passo = {
  linha: number;
  fita: string[];
  fitaLbl: string;
  alvo: (string | null)[];
  janela: { ini: number; fim: number } | null;
  iguais: number[];
  difere: number | null;
  copias: number;
  strings: number;
  comparacoes: number;
  nota: string;
  ok?: boolean;
  fim?: boolean;
};

const CODIGO_LACO = [
  "def rotate_string(s, goal):",
  "    if len(s) != len(goal):",
  "        return False",
  "    for _ in range(len(s)):",
  "        s = s[1:] + s[0]",
  "        if s == goal:",
  "            return True",
  "    return False",
];

const CODIGO_TRUQUE = [
  "def rotate_string(s, goal):",
  "    if len(s) != len(goal):",
  "        return False",
  "    dobrado = s + s",
  "    return goal in dobrado",
];

const MODOS: { key: Modo; rotulo: string; familia: string; cor: string; arquivo: string }[] = [
  { key: "laco", rotulo: "rotaciona e compara", familia: "O(n²)", cor: "#fbbf24", arquivo: "ingenuo.py" },
  { key: "truque", rotulo: "goal in s + s", familia: "O(n)", cor: "#34d399", arquivo: "truque.py" },
];

const PRESETS: { rotulo: string; s: string; goal: string }[] = [
  { rotulo: "caso feliz", s: "abcde", goal: "cdeab" },
  { rotulo: "não rotaciona", s: "abcde", goal: "abced" },
  { rotulo: "tamanhos diferentes", s: "abc", goal: "abcd" },
  { rotulo: "volta completa", s: "abcd", goal: "abcd" },
];

const PALAVRAS = ["abcde", "craft", "codigo", "rotate", "banana"];

const MAX = 10;
const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

function num(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function plural(n: number, um: string, muitos: string): string {
  return n === 1 ? um : muitos;
}

// Quantos caracteres batem antes de divergir. Serve para o contador de
// comparações não mentir: comparar duas strings NÃO é uma operação só.
function prefixo(a: string[], b: string[]): number {
  let k = 0;
  while (k < a.length && k < b.length && a[k] === b[k]) k++;
  return k;
}

function janelaAlvo(goal: string[], largura: number, offset: number): (string | null)[] {
  const out: (string | null)[] = new Array(largura).fill(null);
  for (let k = 0; k < goal.length && offset + k < largura; k++) out[offset + k] = goal[k];
  return out;
}

function gerarPassos(sEntrada: string, goalEntrada: string, modo: Modo): Passo[] {
  const s0 = Array.from(sEntrada).slice(0, MAX);
  const goal = Array.from(goalEntrada).slice(0, MAX);
  const n = s0.length;
  const out: Passo[] = [];

  const base = {
    copias: 0,
    strings: 0,
    comparacoes: 0,
    janela: null,
    iguais: [],
    difere: null,
  };

  if (n !== goal.length) {
    out.push({
      ...base,
      linha: 1,
      fita: s0,
      fitaLbl: "s",
      alvo: janelaAlvo(goal, Math.max(n, goal.length), 0),
      nota: `len(s) = ${n} e len(goal) = ${goal.length}. Tamanhos diferentes: nenhuma rotação vai transformar um no outro.`,
    });
    out.push({
      ...base,
      linha: 2,
      fita: s0,
      fitaLbl: "s",
      alvo: janelaAlvo(goal, Math.max(n, goal.length), 0),
      fim: true,
      nota: "Devolvo False sem copiar um único caractere. Este teste de uma linha é o que salva o pior caso.",
    });
    return out;
  }

  if (n === 0) {
    out.push({
      ...base,
      linha: 1,
      fita: [],
      fitaLbl: "s",
      alvo: [],
      ok: true,
      fim: true,
      nota: "Duas strings vazias: mesmo tamanho e mesmo conteúdo, então a resposta é True sem nenhum trabalho.",
    });
    return out;
  }

  if (modo === "laco") {
    let s = [...s0];
    let copias = 0;
    let strings = 0;
    let comparacoes = 0;
    out.push({
      ...base,
      linha: 1,
      fita: [...s],
      fitaLbl: "s",
      alvo: janelaAlvo(goal, n, 0),
      nota: `len(s) = len(goal) = ${n}, então vale tentar. Vou girar s uma posição por vez e comparar com goal a cada volta.`,
    });
    for (let i = 0; i < n; i++) {
      const primeiro = s[0];
      s = [...s.slice(1), primeiro];
      copias += n - 1 + n;
      strings += 2;
      out.push({
        linha: 4,
        fita: [...s],
        fitaLbl: "s",
        alvo: janelaAlvo(goal, n, 0),
        janela: null,
        iguais: [],
        difere: null,
        copias,
        strings,
        comparacoes,
        nota: `Rotação ${i + 1}: s[1:] já é uma string nova com ${n - 1} ${plural(n - 1, "caractere", "caracteres")} copiados, e a concatenação com "${primeiro}" aloca outra de ${n} e copia ${n}. Duas strings novas e ${2 * n - 1} cópias só para testar um deslocamento.`,
      });
      const k = prefixo(s, goal);
      const igual = k === n;
      comparacoes += igual ? n : k + 1;
      out.push({
        linha: igual ? 6 : 5,
        fita: [...s],
        fitaLbl: "s",
        alvo: janelaAlvo(goal, n, 0),
        janela: { ini: 0, fim: n - 1 },
        iguais: Array.from({ length: k }, (_, j) => j),
        difere: igual ? null : k,
        copias,
        strings,
        comparacoes,
        ok: igual,
        fim: igual,
        nota: igual
          ? `"${s.join("")}" é igual a goal. Achei na rotação ${i + 1}, depois de ${copias} ${plural(copias, "caractere copiado", "caracteres copiados")} e ${strings} strings novas.`
          : `Comparo "${s.join("")}" com "${goal.join("")}": ${k === 0 ? "já diverge no índice 0" : `batem os ${k} ${plural(k, "primeiro", "primeiros")} e divergem no índice ${k}`} ("${s[k]}" contra "${goal[k]}"). Sigo girando, e as duas strings desta volta viram lixo.`,
      });
      if (igual) return out;
    }
    out.push({
      linha: 7,
      fita: [...s],
      fitaLbl: "s",
      alvo: janelaAlvo(goal, n, 0),
      janela: null,
      iguais: [],
      difere: null,
      copias,
      strings,
      comparacoes,
      fim: true,
      nota: `Dei a volta completa (${n} rotações) e nunca bati com goal: False. Custou ${copias} caracteres copiados e ${strings} strings alocadas para descobrir isso.`,
    });
    return out;
  }

  const dobrado = [...s0, ...s0];
  let copias = 0;
  let strings = 0;
  let comparacoes = 0;
  out.push({
    ...base,
    linha: 1,
    fita: [...s0],
    fitaLbl: "s",
    alvo: janelaAlvo(goal, n, 0),
    nota: `len(s) = len(goal) = ${n}. Mesmo tamanho, então o teste continua.`,
  });
  copias = 2 * n;
  strings = 1;
  out.push({
    linha: 3,
    fita: dobrado,
    fitaLbl: "dobrado = s + s",
    alvo: janelaAlvo(goal, 2 * n, 0),
    janela: null,
    iguais: [],
    difere: null,
    copias,
    strings,
    comparacoes,
    nota: `Concateno s comigo mesmo UMA vez: ${copias} cópias, uma string nova. Dentro de "${dobrado.join("")}" moram todas as ${n} rotações de s, cada uma começando numa posição.`,
  });
  for (let j = 0; j <= n; j++) {
    const janela = dobrado.slice(j, j + n);
    const k = prefixo(janela, goal);
    const igual = k === n;
    comparacoes += igual ? n : k + 1;
    out.push({
      linha: 4,
      fita: dobrado,
      fitaLbl: "dobrado = s + s",
      alvo: janelaAlvo(goal, 2 * n, j),
      janela: { ini: j, fim: j + n - 1 },
      iguais: Array.from({ length: k }, (_, t) => j + t),
      difere: igual ? null : j + k,
      copias,
      strings,
      comparacoes,
      ok: igual,
      fim: igual,
      nota: igual
        ? `Posição ${j}: "${janela.join("")}" é exatamente o goal. True, e sem alocar mais nada: a busca só leu a memória que já existia.`
        : `Posição ${j}: "${janela.join("")}" ${k === 0 ? "já diverge no primeiro caractere" : `bate ${k} ${plural(k, "caractere", "caracteres")} e diverge`}. Ando uma casa, sem alocar nada.`,
    });
    if (igual) return out;
  }
  out.push({
    linha: 4,
    fita: dobrado,
    fitaLbl: "dobrado = s + s",
    alvo: janelaAlvo(goal, 2 * n, 0),
    janela: null,
    iguais: [],
    difere: null,
    copias,
    strings,
    comparacoes,
    fim: true,
    nota: `Nenhuma posição de "${dobrado.join("")}" contém "${goal.join("")}": False. Foram ${copias} cópias no total, contra as ${n * (2 * n - 1)} que o laço gastaria com esta entrada.`,
  });
  return out;
}

export function StringsRotateVisualizer() {
  const [modo, setModo] = useState<Modo>("laco");
  const [s, setS] = useState(PRESETS[0].s);
  const [goal, setGoal] = useState(PRESETS[0].goal);
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const passos = useMemo(() => gerarPassos(s, goal, modo), [s, goal, modo]);
  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];
  const cfg = MODOS.find((m) => m.key === modo) ?? MODOS[0];
  const n = Math.min(Array.from(s).length, MAX);

  const parar = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);
  useEffect(() => () => parar(), [parar]);

  useEffect(() => {
    parar();
    if (!tocando) return;
    timer.current = setInterval(() => setPasso((v) => (v >= total - 1 ? v : v + 1)), VELOCIDADES[velocidade]);
    return parar;
  }, [tocando, velocidade, total, parar]);

  useEffect(() => {
    if (tocando && idx >= total - 1) setTocando(false);
  }, [tocando, idx, total]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const reiniciar = () => {
    parar();
    setTocando(false);
    setPasso(0);
  };

  const aplicar = (novoS: string, novoGoal: string) => {
    reiniciar();
    setS(Array.from(novoS).slice(0, MAX).join(""));
    setGoal(Array.from(novoGoal).slice(0, MAX).join(""));
  };

  const sortear = () => {
    const palavra = PALAVRAS[Math.floor(Math.random() * PALAVRAS.length)];
    const k = 1 + Math.floor(Math.random() * (palavra.length - 1));
    aplicar(palavra, palavra.slice(k) + palavra.slice(0, k));
  };

  const classeCelula = (i: number, dentro: boolean) => {
    let cls = "viz-cell";
    if (p.difere === i) cls += " str-cell-no";
    else if (p.iguais.includes(i)) cls += " str-cell-ok";
    else if (p.janela && dentro) cls += " in";
    else if (p.janela) cls += " drop";
    return cls;
  };

  const piorLaco = n * (2 * n - 1);
  const notaCls = "viz-note" + (p.ok ? " ok" : p.fim ? " invalid" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);
  const codigo = modo === "laco" ? CODIGO_LACO : CODIGO_TRUQUE;

  const variaveis = [
    { nome: "n", valor: `${n}` },
    { nome: "strings novas", valor: num(p.strings) },
    { nome: "cópias", valor: num(p.copias) },
    { nome: "comparações", valor: num(p.comparacoes), best: true },
  ];

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" style={{ background: cfg.cor }} />
          <span>Visualizador · Rotate String, força bruta contra o truque</span>
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
          {MODOS.map((m) => {
            const on = m.key === modo;
            return (
              <button
                key={m.key}
                className={`bigo-chip${on ? " on" : ""}`}
                style={on ? { borderColor: m.cor, color: m.cor } : undefined}
                onClick={() => {
                  reiniciar();
                  setModo(m.key);
                }}
                aria-pressed={on}
              >
                <span className="sw" style={{ background: on ? m.cor : "#3a4a60" }} />
                {m.familia} · {m.rotulo}
              </button>
            );
          })}
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>s</span>
            <input className="viz-input" value={s} onChange={(e) => aplicar(e.target.value, goal)} />
          </label>
          <label className="viz-field grow">
            <span>goal</span>
            <input className="viz-input" value={goal} onChange={(e) => aplicar(s, e.target.value)} />
          </label>
          <button className="viz-btn" onClick={sortear}>
            Sortear
          </button>
        </div>

        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              key={pr.rotulo}
              className={`bigo-chip${s === pr.s && goal === pr.goal ? " on" : ""}`}
              onClick={() => aplicar(pr.s, pr.goal)}
              aria-pressed={s === pr.s && goal === pr.goal}
            >
              {pr.rotulo}
            </button>
          ))}
        </div>

        <div className="str-fitas">
          <span className="str-lbl">{p.fitaLbl}</span>
          <div className="viz-cells">
            {p.fita.map((c, i) => {
              const dentro = p.janela ? i >= p.janela.ini && i <= p.janela.fim : false;
              return (
                <div className="viz-cell-wrap" key={`f-${i}`}>
                  <span className="viz-cell-idx">{i}</span>
                  <div className={classeCelula(i, dentro)}>{c}</div>
                </div>
              );
            })}
          </div>
          <span className="str-lbl">goal</span>
          <div className="viz-cells">
            {p.alvo.map((c, i) => {
              const dentro = c !== null;
              return (
                <div className="viz-cell-wrap" key={`a-${i}`}>
                  <div className={c === null ? "viz-cell str-fantasma" : classeCelula(i, dentro)}>{c ?? "·"}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>caracteres copiados</span>
            <strong style={{ color: cfg.cor }}>{num(p.copias)}</strong>
          </div>
          <div className="bigo-stat">
            <span>comparações de caractere</span>
            <strong>{num(p.comparacoes)}</strong>
          </div>
          <div className="bigo-stat">
            <span>pior caso com o laço</span>
            <strong style={{ color: "#fbbf24" }}>{num(piorLaco)}</strong>
          </div>
          <div className="bigo-stat">
            <span>pior caso com o truque</span>
            <strong style={{ color: "#34d399" }}>{num(2 * n)}</strong>
          </div>
        </div>

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">
              {cfg.arquivo} · {cfg.familia}
            </div>
            <div className="viz-code-body">
              {codigo.map((txt, i) => (
                <div key={i} className={`viz-line${i === p.linha ? " on" : ""}`}>
                  <span className="ln">{i + 1}</span>
                  {txt}
                </div>
              ))}
            </div>
          </div>
          <div className="viz-vars">
            <div className="viz-vars-head">Variáveis</div>
            {variaveis.map((v) => (
              <div className="viz-var" key={v.nome}>
                <span className="viz-var-name">{v.nome}</span>
                <span className={`viz-var-val${v.best ? " best" : ""}`}>{v.valor}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="viz-controls">
          <button className="viz-btn" title="Reiniciar" onClick={reiniciar}>
            ↺
          </button>
          <button
            className="viz-btn"
            disabled={idx === 0}
            onClick={() => {
              parar();
              setTocando(false);
              setPasso(Math.max(0, idx - 1));
            }}
          >
            ‹ Anterior
          </button>
          <button
            className="viz-play"
            onClick={() => {
              if (tocando) {
                setTocando(false);
                return;
              }
              setPasso(idx >= total - 1 ? 0 : idx);
              setTocando(true);
            }}
          >
            {tocando ? "❚❚ Pausar" : "▶ Rodar"}
          </button>
          <button
            className="viz-btn"
            disabled={idx === total - 1}
            onClick={() => {
              parar();
              setTocando(false);
              setPasso(Math.min(idx + 1, total - 1));
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
              value={velocidade}
              onChange={(e) => setVelocidade(parseInt(e.target.value, 10))}
            />
            <span className="val">{ROTULOS_VEL[velocidade]}</span>
          </div>
        </div>
        <div className="viz-progress">
          <div className="viz-progress-fill" style={{ width: `${pctPasso}%`, background: cfg.cor }} />
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
