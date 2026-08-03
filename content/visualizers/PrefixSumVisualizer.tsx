"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// PrefixSumVisualizer, a construção da tabela de prefixos e a consulta O(1).
//
// Mesmo padrão do TwoPointersVisualizer: gerador PURO de passos + a mesma casca
// (células, código sincronizado, variáveis, controles, Expandir). A história
// tem duas fases numa linha do tempo só:
//
//   1. construir  -> preenche p[k + 1] = p[k] + nums[k], uma posição por passo
//   2. consultar  -> acende p[j + 1] (entra) e p[i] (sai) e faz a subtração
//
// O contador de operações é o que amarra o visualizador ao artigo: a consulta
// custa 1 subtração contra as (j - i + 1) somas da força bruta, e o painel
// mostra os dois números ao mesmo tempo.
// ---------------------------------------------------------------------------

type Fase = "construir" | "consultar";

type Passo = {
  fase: Fase;
  linha: number;
  escritos: number; // quantas posições de p já foram preenchidas
  atualNums: number | null; // índice destacado em nums
  atualP: number | null; // índice sendo escrito em p
  somas: number; // somas feitas no pré-processamento
  opsConsulta: number;
  mais: number | null; // índice de p que entra na soma
  menos: number | null; // índice de p que sai da soma
  resultado: number | null;
  nota: string;
  ok?: boolean;
};

// As linhas mapeiam 1:1 com os passos (campo `linha` em gerarPassos), então a
// ordem e a quantidade de linhas não podem mudar.
const CODIGO = [
  "class SomaDeIntervalo:",
  "    def __init__(self, nums):",
  "        self.p = [0] * (len(nums) + 1)",
  "        for k, valor in enumerate(nums):",
  "            self.p[k + 1] = self.p[k] + valor",
  "",
  "    def soma(self, i, j):   # i e j inclusivos",
  "        return self.p[j + 1] - self.p[i]",
];

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

const MAX_ITENS = 12;

// O array do encontro, com a consulta que apareceu na tela: soma(1, 4) = 155.
const DEFAULT_NUMS = [10, 30, 20, 45, 60, 40, 50];

type Preset = { rotulo: string; nums: number[]; i: number; j: number };

const PRESETS: Preset[] = [
  { rotulo: "Encontro: soma(1, 4)", nums: DEFAULT_NUMS, i: 1, j: 4 },
  { rotulo: "Miolo: soma(2, 3)", nums: DEFAULT_NUMS, i: 2, j: 3 },
  { rotulo: "Do início: soma(0, 2)", nums: DEFAULT_NUMS, i: 0, j: 2 },
  { rotulo: "Um elemento: soma(3, 3)", nums: DEFAULT_NUMS, i: 3, j: 3 },
  { rotulo: "Tudo: soma(0, 6)", nums: DEFAULT_NUMS, i: 0, j: 6 },
  { rotulo: "Com negativos", nums: [3, -2, 5, -1, 4, -6, 2], i: 1, j: 4 },
];

function prefixos(nums: number[]): number[] {
  const p: number[] = [0];
  for (let k = 0; k < nums.length; k++) p.push(p[k] + nums[k]);
  return p;
}

function gerarPassos(nums: number[], i: number, j: number): Passo[] {
  const n = nums.length;
  const p = prefixos(nums);
  const out: Passo[] = [];

  out.push({
    fase: "construir",
    linha: 2,
    escritos: 1,
    atualNums: null,
    atualP: 0,
    somas: 0,
    opsConsulta: 0,
    mais: null,
    menos: null,
    resultado: null,
    nota: `Crio p com ${n + 1} posições, uma a mais que o array, e deixo p[0] = 0. Essa posição extra é a sentinela: ela guarda a soma de nada.`,
  });

  let guarda = 0;
  for (let k = 0; k < n && guarda++ < 100; k++) {
    out.push({
      fase: "construir",
      linha: 4,
      escritos: k + 2,
      atualNums: k,
      atualP: k + 1,
      somas: k + 1,
      opsConsulta: 0,
      mais: null,
      menos: null,
      resultado: null,
      nota: `p[${k + 1}] = p[${k}] + nums[${k}] = ${p[k]} + ${nums[k]} = ${p[k + 1]}. Agora sei a soma de tudo do início até a posição ${k}.`,
    });
  }

  const largura = j - i + 1;
  out.push({
    fase: "consultar",
    linha: 6,
    escritos: n + 1,
    atualNums: null,
    atualP: null,
    somas: n,
    opsConsulta: 0,
    mais: null,
    menos: null,
    resultado: null,
    nota: `Tabela pronta com ${n} ${n === 1 ? "soma" : "somas"}, e ela não muda mais. Agora quero soma(${i}, ${j}): na força bruta eu somaria ${largura} ${largura === 1 ? "número" : "números"} de novo.`,
  });

  out.push({
    fase: "consultar",
    linha: 7,
    escritos: n + 1,
    atualNums: null,
    atualP: null,
    somas: n,
    opsConsulta: 0,
    mais: j + 1,
    menos: null,
    resultado: null,
    nota: `p[${j + 1}] = ${p[j + 1]} é a soma de nums[0] até nums[${j}]. O fim do intervalo já está incluído aqui, é por isso que o índice é j + 1 e não j.`,
  });

  out.push({
    fase: "consultar",
    linha: 7,
    escritos: n + 1,
    atualNums: null,
    atualP: null,
    somas: n,
    opsConsulta: 0,
    mais: j + 1,
    menos: i,
    resultado: null,
    nota:
      i === 0
        ? "p[0] = 0: antes da posição 0 não existe nada para descontar. É exatamente para isso que a sentinela serve, sem ela eu precisaria de um if bem aqui."
        : `p[${i}] = ${p[i]} é a soma de nums[0] até nums[${i - 1}], ou seja, tudo que vem antes do intervalo. Esse é o pedaço que sobra e precisa sair.`,
  });

  const res = p[j + 1] - p[i];
  out.push({
    fase: "consultar",
    linha: 7,
    escritos: n + 1,
    atualNums: null,
    atualP: null,
    somas: n,
    opsConsulta: 1,
    mais: j + 1,
    menos: i,
    resultado: res,
    ok: true,
    nota: `${p[j + 1]} - ${p[i]} = ${res}. Duas leituras e uma subtração, e o custo seria exatamente o mesmo para um intervalo de um milhão de posições.`,
  });

  return out;
}

// Formatação determinística (nada de Intl, para o HTML do servidor e do
// cliente baterem exatamente na hidratação).
function num(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function PrefixSumVisualizer() {
  const [nums, setNums] = useState<number[]>(DEFAULT_NUMS);
  const [entrada, setEntrada] = useState(DEFAULT_NUMS.join(", "));
  const [iBruto, setIBruto] = useState(1);
  const [jBruto, setJBruto] = useState(4);
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const n = nums.length;
  // Os índices são presos aqui, e não no onChange, para o aluno poder digitar
  // qualquer coisa nos campos sem o visualizador entrar em estado inválido.
  const j = Math.min(Math.max(jBruto, 0), n - 1);
  const i = Math.min(Math.max(iBruto, 0), j);

  const passos = useMemo(() => gerarPassos(nums, i, j), [nums, i, j]);
  const p = useMemo(() => prefixos(nums), [nums]);
  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const s = passos[idx];
  const inicioConsulta = n + 1;

  const parar = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const reiniciar = () => { parar(); setTocando(false); setPasso(0); };

  const aoMudarEntrada = (v: string) => {
    const arr = v
      .split(",")
      .map((x) => parseInt(x.trim(), 10))
      .filter((x) => !isNaN(x))
      .slice(0, MAX_ITENS);
    reiniciar();
    setEntrada(v);
    setNums(arr.length ? arr : [1]);
  };

  const aplicarPreset = (pr: Preset) => {
    reiniciar();
    setNums(pr.nums);
    setEntrada(pr.nums.join(", "));
    setIBruto(pr.i);
    setJBruto(pr.j);
  };

  const sortear = () => {
    const tam = 6 + Math.floor(Math.random() * 4);
    const arr = Array.from({ length: tam }, () => 1 + Math.floor(Math.random() * 60));
    const a = Math.floor(Math.random() * tam);
    const b = Math.floor(Math.random() * tam);
    reiniciar();
    setNums(arr);
    setEntrada(arr.join(", "));
    setIBruto(Math.min(a, b));
    setJBruto(Math.max(a, b));
  };

  const cellsNums = nums.map((v, k) => {
    let cls = "viz-cell";
    if (s.fase === "consultar") {
      if (k >= i && k <= j) cls += " in";
      else cls += " drop";
    }
    if (s.atualNums === k) cls += " entra";
    let marca = "";
    if (s.fase === "consultar") {
      if (k === i && k === j) marca = "i j";
      else if (k === i) marca = "i";
      else if (k === j) marca = "j";
    } else if (s.atualNums === k) {
      marca = "k";
    }
    return { k, v, cls, marca };
  });

  const cellsP = p.map((v, k) => {
    let cls = "viz-cell";
    if (k >= s.escritos) cls += " drop";
    if (s.atualP === k) cls += " in entra";
    if (s.mais === k) cls += " in entra";
    if (s.menos === k) cls += " sai";
    let marca = "";
    if (s.mais === k) marca = "+";
    else if (s.menos === k) marca = "-";
    else if (s.atualP === k) marca = "p";
    return { k, v: k >= s.escritos ? 0 : v, cls, marca };
  });

  const largura = j - i + 1;

  const variaveis = [
    { nome: "i", valor: `${i}` },
    { nome: "j", valor: `${j}` },
    { nome: `p[${j + 1}]`, valor: s.mais == null ? "-" : `${p[j + 1]}` },
    { nome: `p[${i}]`, valor: s.menos == null ? "-" : `${p[i]}` },
    { nome: "soma", valor: s.resultado == null ? "-" : `${s.resultado}`, best: true },
  ];

  const notaCls = "viz-note" + (s.ok ? " ok" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · construir a tabela e consultar em O(1)</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">passo {idx + 1} de {total}</span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "✕ Fechar" : "⤢ Expandir"}
          </button>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button key={pr.rotulo} className="bigo-chip" onClick={() => aplicarPreset(pr)}>
              {pr.rotulo}
            </button>
          ))}
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Array (nums)</span>
            <input className="viz-input" value={entrada} onChange={(e) => aoMudarEntrada(e.target.value)} />
          </label>
          <label className="viz-field">
            <span>i</span>
            <input
              className="viz-input k"
              type="number"
              value={iBruto}
              onChange={(e) => { reiniciar(); setIBruto(parseInt(e.target.value, 10) || 0); }}
            />
          </label>
          <label className="viz-field">
            <span>j</span>
            <input
              className="viz-input k"
              type="number"
              value={jBruto}
              onChange={(e) => { reiniciar(); setJBruto(parseInt(e.target.value, 10) || 0); }}
            />
          </label>
          <button className="viz-btn" onClick={sortear}>Sortear</button>
        </div>

        <div className="viz-vars-head">nums, o array de entrada</div>
        <div className="viz-cells">
          {cellsNums.map((c) => (
            <div className="viz-cell-wrap" key={c.k}>
              <span className="viz-cell-idx">{c.k}</span>
              <div className={c.cls}>{c.v}</div>
              <span className={`viz-mark${c.marca ? " show" : ""}`}>{c.marca || "·"}</span>
            </div>
          ))}
        </div>

        <div className="viz-vars-head" style={{ marginTop: 16 }}>p, a tabela de prefixos (n + 1 posições)</div>
        <div className="viz-cells">
          {cellsP.map((c) => (
            <div className="viz-cell-wrap" key={c.k}>
              <span className="viz-cell-idx">{c.k}</span>
              <div className={c.cls}>{c.v}</div>
              <span className={`viz-mark${c.marca ? " show" : ""}`}>{c.marca || "·"}</span>
            </div>
          ))}
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>somas no pré-processamento</span>
            <strong>{num(s.somas)}</strong>
          </div>
          <div className="bigo-stat">
            <span>operações desta consulta</span>
            <strong style={{ color: "var(--ccc-green)" }}>{num(s.opsConsulta)}</strong>
          </div>
          <div className="bigo-stat">
            <span>a mesma consulta na força bruta</span>
            <strong style={{ color: "#fbbf24" }}>{num(largura)}</strong>
          </div>
          <div className="bigo-stat">
            <span>n (tamanho do array)</span>
            <strong>{num(n)}</strong>
          </div>
        </div>

        <p className={notaCls}>{s.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">soma_de_intervalo.py</div>
            <div className="viz-code-body">
              {CODIGO.map((txt, k) => (
                <div key={k} className={`viz-line${k === s.linha ? " on" : ""}`}>
                  <span className="ln">{k + 1}</span>
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
          <button className="viz-btn" title="Reiniciar" onClick={reiniciar}>↺</button>
          <button className="viz-btn" disabled={idx === 0} onClick={() => { parar(); setTocando(false); setPasso(Math.max(0, idx - 1)); }}>‹ Anterior</button>
          <button className="viz-play" onClick={() => { if (tocando) { setTocando(false); return; } setPasso(idx >= total - 1 ? 0 : idx); setTocando(true); }}>
            {tocando ? "❚❚ Pausar" : "▶ Rodar"}
          </button>
          <button className="viz-btn" disabled={idx === total - 1} onClick={() => { parar(); setTocando(false); setPasso(Math.min(idx + 1, total - 1)); }}>Próximo ›</button>
          <button className="viz-btn" onClick={() => { parar(); setTocando(false); setPasso(inicioConsulta); }}>Pular para a consulta</button>
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
