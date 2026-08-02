"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// SlidingWindowVisualizer, visualização passo a passo da Sliding Window.
//
// Padrão para novos visualizadores: um gerador puro de "passos" + a mesma
// casca de UI (células, código sincronizado, variáveis, controles, expandir).
// Para uma técnica nova, copie este arquivo, troque `gerarPassos` e o `CODIGO`.
//
// variant="fixed"    → maior soma de uma janela de tamanho k (tamanho travado)
// variant="dynamic"  → maior subarray com soma ≤ k (cresce/encolhe)
// ---------------------------------------------------------------------------

type Variant = "fixed" | "dynamic" | "sliding-window-fixed" | "sliding-window-dynamic";

type Passo = {
  l: number;
  r: number;
  curr: number; // métrica da janela (soma)
  ans: number; // resposta acumulada (fixa: melhor soma / dinâmica: maior tamanho)
  linha: number;
  entra?: number;
  sai?: number;
  invalid?: boolean;
  ok?: boolean;
  fim?: boolean;
  nota: string;
};

// As linhas mapeiam 1:1 com os passos (campo `linha` em gerarPassos*), então a
// ordem e a quantidade de linhas não podem mudar.
const CODIGO_FIXA = [
  "def melhor_soma(nums, k):",
  "    soma = 0",
  "    melhor = 0",
  "    esquerda = 0",
  "    for direita in range(len(nums)):",
  "        soma += nums[direita]",
  "        if direita >= k - 1:",
  "            melhor = max(melhor, soma)",
  "            soma -= nums[esquerda]",
  "            esquerda += 1",
  "    return melhor",
];

const CODIGO_DINAMICA = [
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

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

function normalize(v: Variant): "fixed" | "dynamic" {
  return v === "dynamic" || v === "sliding-window-dynamic" ? "dynamic" : "fixed";
}

function gerarPassosFixa(nums: number[], k: number): Passo[] {
  const out: Passo[] = [];
  let soma = 0, melhor = 0, esq = 0;
  out.push({ l: 0, r: -1, curr: 0, ans: 0, linha: 3, nota: "Janela vazia. esquerda e direita começam em 0." });
  for (let d = 0; d < nums.length; d++) {
    soma += nums[d];
    out.push({ l: esq, r: d, curr: soma, ans: melhor, linha: 5, entra: d, nota: `Entra nums[${d}] = ${nums[d]} pela direita. soma = ${soma}.` });
    if (d >= k - 1) {
      if (soma > melhor) {
        melhor = soma;
        out.push({ l: esq, r: d, curr: soma, ans: melhor, linha: 7, ok: true, nota: `Janela completa com soma ${soma}, novo melhor.` });
      } else {
        out.push({ l: esq, r: d, curr: soma, ans: melhor, linha: 7, nota: `Janela completa com soma ${soma}, não supera ${melhor}.` });
      }
      soma -= nums[esq];
      out.push({ l: esq, r: d, curr: soma, ans: melhor, linha: 8, sai: esq, nota: `Sai nums[${esq}] = ${nums[esq]} pela esquerda. soma = ${soma}.` });
      esq++;
    }
  }
  out.push({ l: esq, r: nums.length - 1, curr: soma, ans: melhor, linha: 10, fim: true, nota: `Fim: a maior soma de ${k} elementos seguidos é ${melhor}.` });
  return out;
}

function gerarPassosDinamica(nums: number[], k: number): Passo[] {
  const out: Passo[] = [];
  let soma = 0, melhor = 0, esq = 0;
  out.push({ l: 0, r: -1, curr: 0, ans: 0, linha: 1, nota: "Janela vazia. esquerda e direita começam em 0." });
  for (let d = 0; d < nums.length; d++) {
    soma += nums[d];
    out.push({ l: esq, r: d, curr: soma, ans: melhor, linha: 5, entra: d, nota: `Entra ${nums[d]} pela direita. soma = ${soma}.` });
    while (soma > k && esq <= d) {
      out.push({ l: esq, r: d, curr: soma, ans: melhor, linha: 6, invalid: true, sai: esq, nota: `soma ${soma} > k = ${k}. Janela inválida, encolhe pela esquerda.` });
      soma -= nums[esq];
      esq++;
      out.push({ l: esq, r: d, curr: soma, ans: melhor, linha: 7, nota: `Sai ${nums[esq - 1]} pela esquerda. soma = ${soma}.` });
    }
    const len = d - esq + 1;
    if (len > melhor) melhor = len;
    out.push({ l: esq, r: d, curr: soma, ans: melhor, linha: 9, ok: true, nota: `Janela válida de tamanho ${len}. Melhor resposta: ${melhor}.` });
  }
  out.push({ l: esq, r: nums.length - 1, curr: soma, ans: melhor, linha: 10, fim: true, nota: `Fim: o maior subarray com soma ≤ ${k} tem tamanho ${melhor}.` });
  return out;
}

const PRESETS = {
  fixed: { nums: [3, 6, 2, 8, 1, 4, 1, 5], k: 3, kLabel: "k", titulo: "maior soma de uma janela de tamanho k", metricaMelhor: "melhor" },
  dynamic: { nums: [3, 1, 2, 7, 4, 2, 1, 1, 5], k: 8, kLabel: "soma máx (k)", titulo: "maior subarray com soma ≤ k", metricaMelhor: "melhor (tam.)" },
};

export function SlidingWindowVisualizer({ variant = "fixed" }: { variant?: Variant }) {
  const modo = normalize(variant);
  const preset = PRESETS[modo];
  const CODIGO = modo === "fixed" ? CODIGO_FIXA : CODIGO_DINAMICA;

  const [nums, setNums] = useState<number[]>(preset.nums);
  const [entrada, setEntrada] = useState(preset.nums.join(", "));
  const [k, setK] = useState(preset.k);
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const passos = useMemo(() => {
    const arr = nums.length ? nums : [1];
    const kk = Math.max(1, Math.min(k, arr.length));
    return modo === "fixed" ? gerarPassosFixa(arr, kk) : gerarPassosDinamica(arr, kk);
  }, [nums, k, modo]);

  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];

  const parar = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  }, []);

  useEffect(() => () => parar(), [parar]);

  // Loop de reprodução, reinicia o intervalo quando play/velocidade mudam.
  useEffect(() => {
    parar();
    if (!tocando) return;
    timer.current = setInterval(() => {
      setPasso((s) => {
        if (s >= total - 1) return s;
        return s + 1;
      });
    }, VELOCIDADES[velocidade]);
    return parar;
  }, [tocando, velocidade, total, parar]);

  // Pausa automaticamente ao chegar no fim.
  useEffect(() => {
    if (tocando && idx >= total - 1) setTocando(false);
  }, [tocando, idx, total]);

  // Esc fecha o modo expandido.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const aoMudarEntrada = (v: string) => {
    const arr = v.split(",").map((x) => parseInt(x.trim(), 10)).filter((x) => !isNaN(x)).slice(0, 14);
    parar(); setTocando(false); setPasso(0);
    setEntrada(v); setNums(arr.length ? arr : [1]);
  };
  const aoMudarK = (v: string) => {
    const kk = Math.max(1, Math.min(parseInt(v, 10) || 1, nums.length));
    parar(); setTocando(false); setPasso(0); setK(kk);
  };
  const sortear = () => {
    const n = 7 + Math.floor(Math.random() * 3);
    const arr = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 9));
    parar(); setTocando(false); setPasso(0);
    setNums(arr); setEntrada(arr.join(", ")); setK(Math.min(k, n));
  };

  const janelaAtiva = p.r >= 0 && !p.fim;

  const cells = nums.map((v, i) => {
    const dentro = janelaAtiva && i >= p.l && i <= p.r;
    let cls = "viz-cell";
    if (dentro) cls += " in";
    if (janelaAtiva && i < p.l) cls += " drop";
    if (p.entra === i) cls += " entra";
    if (p.sai === i) cls += " sai";
    let marca = "";
    if (janelaAtiva && i === p.l) marca = "esq";
    if (janelaAtiva && i === p.r) marca = marca ? "esq/dir" : "dir";
    return { i, v, cls, marca };
  });

  const variaveis =
    modo === "fixed"
      ? [
          { nome: "esquerda", valor: `${p.l}` },
          { nome: "direita", valor: p.r < 0 ? "-" : `${p.r}` },
          { nome: "soma", valor: `${p.curr}` },
          { nome: "melhor", valor: `${p.ans}`, best: true },
        ]
      : [
          { nome: "esquerda", valor: `${p.l}` },
          { nome: "direita", valor: p.r < 0 ? "-" : `${p.r}` },
          { nome: "soma", valor: `${p.curr}` },
          { nome: "melhor (tam.)", valor: `${p.ans}`, best: true },
        ];

  const notaCls = "viz-note" + (p.invalid ? " invalid" : p.ok || p.fim ? " ok" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · {preset.titulo}</span>
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
            <span>Seu array</span>
            <input className="viz-input" value={entrada} onChange={(e) => aoMudarEntrada(e.target.value)} />
          </label>
          <label className="viz-field">
            <span>{preset.kLabel}</span>
            <input className="viz-input k" type="number" value={k} onChange={(e) => aoMudarK(e.target.value)} />
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
