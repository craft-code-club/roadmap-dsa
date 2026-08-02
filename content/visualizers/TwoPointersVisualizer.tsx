"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// TwoPointersVisualizer, ponteiros convergentes (Two Sum em array ordenado).
//
// Mesmo padrão do SlidingWindowVisualizer: um gerador puro de passos + a mesma casca
// (células, código sincronizado, variáveis, controles, Expandir). É a receita
// para novos visualizadores, copie, troque `gerarPassos` e `CODIGO`.
// ---------------------------------------------------------------------------

type Passo = {
  l: number;
  r: number;
  soma: number | null;
  linha: number;
  moveL?: boolean;
  moveR?: boolean;
  found?: boolean;
  fim?: boolean;
  nota: string;
};

const CODIGO = [
  "def dois_ponteiros(nums, alvo):",
  "    esquerda = 0",
  "    direita = len(nums) - 1",
  "    while esquerda < direita:",
  "        soma = nums[esquerda] + nums[direita]",
  "        if soma == alvo:",
  "            return [esquerda, direita]",
  "        if soma < alvo:",
  "            esquerda += 1",
  "        else:",
  "            direita -= 1",
  "    return []",
];

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

function gerarPassos(nums: number[], alvo: number): Passo[] {
  const out: Passo[] = [];
  let l = 0;
  let r = nums.length - 1;
  out.push({ l, r, soma: null, linha: 2, nota: "esquerda no início, direita no fim do array ordenado." });
  let guarda = 0;
  while (l < r && guarda++ < 100) {
    const soma = nums[l] + nums[r];
    out.push({ l, r, soma, linha: 4, nota: `soma = nums[${l}] + nums[${r}] = ${nums[l]} + ${nums[r]} = ${soma}.` });
    if (soma === alvo) {
      out.push({ l, r, soma, linha: 6, found: true, fim: true, nota: `soma = alvo (${alvo})! Par encontrado nos índices ${l} e ${r}.` });
      return out;
    }
    if (soma < alvo) {
      out.push({ l, r, soma, linha: 8, moveL: true, nota: `${soma} < ${alvo}: preciso de uma soma maior → avanço a esquerda.` });
      l++;
    } else {
      out.push({ l, r, soma, linha: 10, moveR: true, nota: `${soma} > ${alvo}: preciso de uma soma menor → recuo a direita.` });
      r--;
    }
  }
  out.push({ l, r, soma: null, linha: 11, fim: true, nota: "Os ponteiros se cruzaram: não existe par com essa soma." });
  return out;
}

const DEFAULT_NUMS = [2, 3, 5, 8, 11, 15];
const DEFAULT_ALVO = 19;

function ordenar(v: number[]) {
  return [...v].sort((a, b) => a - b);
}

export function TwoPointersVisualizer() {
  const [nums, setNums] = useState<number[]>(DEFAULT_NUMS);
  const [entrada, setEntrada] = useState(DEFAULT_NUMS.join(", "));
  const [alvo, setAlvo] = useState(DEFAULT_ALVO);
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const passos = useMemo(() => gerarPassos(nums.length ? nums : [1], alvo), [nums, alvo]);
  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];

  const parar = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  }, []);
  useEffect(() => () => parar(), [parar]);

  useEffect(() => {
    parar();
    if (!tocando) return;
    timer.current = setInterval(() => setPasso((s) => (s >= total - 1 ? s : s + 1)), VELOCIDADES[velocidade]);
    return parar;
  }, [tocando, velocidade, total, parar]);

  useEffect(() => {
    if (tocando && idx >= total - 1) setTocando(false);
  }, [tocando, idx, total]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const aoMudarEntrada = (v: string) => {
    const arr = ordenar(v.split(",").map((x) => parseInt(x.trim(), 10)).filter((x) => !isNaN(x)).slice(0, 14));
    parar(); setTocando(false); setPasso(0);
    setEntrada(v); setNums(arr.length ? arr : [1]);
  };
  const aoMudarAlvo = (v: string) => {
    parar(); setTocando(false); setPasso(0);
    setAlvo(parseInt(v, 10) || 0);
  };
  const sortear = () => {
    const n = 6 + Math.floor(Math.random() * 3);
    const arr = ordenar(Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 14)));
    const alvoNovo = arr[Math.floor(Math.random() * n)] + arr[Math.floor(Math.random() * n)];
    parar(); setTocando(false); setPasso(0);
    setNums(arr); setEntrada(arr.join(", ")); setAlvo(alvoNovo);
  };

  const cells = nums.map((v, i) => {
    let cls = "viz-cell";
    if (i === p.l || i === p.r) cls += " in";
    if (i < p.l || i > p.r) cls += " drop";
    if (p.found && (i === p.l || i === p.r)) cls += " entra";
    if (p.moveL && i === p.l) cls += " entra";
    if (p.moveR && i === p.r) cls += " entra";
    let marca = "";
    if (i === p.l) marca = "E";
    if (i === p.r) marca = marca ? "E D" : "D";
    return { i, v, cls, marca };
  });

  const variaveis = [
    { nome: "esquerda", valor: `${p.l}` },
    { nome: "direita", valor: `${p.r}` },
    { nome: "soma", valor: p.soma == null ? "-" : `${p.soma}` },
    { nome: "alvo", valor: `${alvo}`, best: true },
  ];

  const notaCls = "viz-note" + (p.found ? " ok" : p.fim ? " invalid" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · encontrar dois números que somam o alvo</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">passo {idx + 1} de {total}</span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "✕ Fechar" : "⤢ Expandir"}
          </button>
        </div>
      </div>

      <div className="viz-body">
        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Array (ordenado)</span>
            <input className="viz-input" value={entrada} onChange={(e) => aoMudarEntrada(e.target.value)} />
          </label>
          <label className="viz-field">
            <span>alvo</span>
            <input className="viz-input k" type="number" value={alvo} onChange={(e) => aoMudarAlvo(e.target.value)} />
          </label>
          <button className="viz-btn" onClick={sortear}>Sortear</button>
        </div>

        <div className="viz-cells">
          {cells.map((c) => (
            <div className="viz-cell-wrap" key={c.i}>
              <span className="viz-cell-idx">{c.i}</span>
              <div className={c.cls}>{c.v}</div>
              <span className={`viz-mark${c.marca ? " show" : ""}`}>{c.marca || "·"}</span>
            </div>
          ))}
        </div>

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">solucao.py</div>
            <div className="viz-code-body">
              {CODIGO.map((txt, n) => (
                <div key={n} className={`viz-line${n === p.linha ? " on" : ""}`}>
                  <span className="ln">{n + 1}</span>
                  {txt}
                </div>
              ))}
            </div>
          </div>
          <div className="viz-vars">
            {variaveis.map((v) => (
              <div className="viz-var" key={v.nome}>
                <span className="viz-var-name">{v.nome}</span>
                <span className={`viz-var-val${v.best ? " best" : ""}`}>{v.valor}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="viz-controls">
          <button className="viz-btn" title="Reiniciar" onClick={() => { parar(); setTocando(false); setPasso(0); }}>↺</button>
          <button className="viz-btn" disabled={idx === 0} onClick={() => { parar(); setTocando(false); setPasso(Math.max(0, idx - 1)); }}>‹ Anterior</button>
          <button className="viz-play" onClick={() => { if (tocando) { setTocando(false); return; } setPasso(idx >= total - 1 ? 0 : idx); setTocando(true); }}>
            {tocando ? "❚❚ Pausar" : "▶ Rodar"}
          </button>
          <button className="viz-btn" disabled={idx === total - 1} onClick={() => { parar(); setTocando(false); setPasso(Math.min(idx + 1, total - 1)); }}>Próximo ›</button>
          <div className="viz-speed">
            <span>Velocidade</span>
            <input type="range" min={1} max={5} step={1} value={velocidade} onChange={(e) => setVelocidade(parseInt(e.target.value, 10))} />
            <span className="val">{ROTULOS_VEL[velocidade]}</span>
          </div>
        </div>
        <div className="viz-progress"><div className="viz-progress-fill" style={{ width: `${pctPasso}%` }} /></div>
      </div>
    </figure>
  );

  if (expanded && mounted) {
    return createPortal(
      <div className="viz-overlay" onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false); }}>
        {viz}
      </div>,
      document.body
    );
  }
  return viz;
}
