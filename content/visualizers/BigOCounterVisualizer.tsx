"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// BigOCounterVisualizer, o contador de operações.
//
// Mesmo padrão dos outros visualizadores (gerador puro de passos + casca
// compartilhada), com um detalhe a mais: cada passo carrega o contador de
// operações. A ideia é o aluno ver o contador parar em 1, em log n, em n e em
// n² sobre o MESMO array, e conferir a conta do pior caso ao lado.
// ---------------------------------------------------------------------------

type Passo = {
  linha: number;
  ops: number;
  marcas: Record<number, string>;
  ativos: number[];
  fora: number[];
  nota: string;
  vars: { nome: string; valor: string; best?: boolean }[];
  ok?: boolean;
  fim?: boolean;
};

type Algoritmo = {
  key: string;
  nome: string;
  familia: string;
  cor: string;
  usaAlvo: boolean;
  codigo: string[];
  arquivo: string;
  piorCaso: (n: number) => number;
  formula: string;
  gerar: (nums: number[], alvo: number) => Passo[];
};

const CONSTANTE: string[] = [
  "def pegar(nums, i):",
  "    return nums[i]",
];

const BINARIA: string[] = [
  "def busca_binaria(nums, alvo):",
  "    esq, dir = 0, len(nums) - 1",
  "    while esq <= dir:",
  "        meio = (esq + dir) // 2",
  "        if nums[meio] == alvo:",
  "            return meio",
  "        if nums[meio] < alvo:",
  "            esq = meio + 1",
  "        else:",
  "            dir = meio - 1",
  "    return -1",
];

const LINEAR: string[] = [
  "def busca_linear(nums, alvo):",
  "    for i in range(len(nums)):",
  "        if nums[i] == alvo:",
  "            return i",
  "    return -1",
];

const PARES: string[] = [
  "def tem_repetido(nums):",
  "    for i in range(len(nums)):",
  "        for j in range(i + 1, len(nums)):",
  "            if nums[i] == nums[j]:",
  "                return True",
  "    return False",
];

function faixa(de: number, ate: number): number[] {
  const out: number[] = [];
  for (let i = de; i <= ate; i++) out.push(i);
  return out;
}

const ALGORITMOS: Algoritmo[] = [
  {
    key: "const",
    nome: "Acesso por índice",
    familia: "O(1)",
    cor: "#34d399",
    usaAlvo: false,
    codigo: CONSTANTE,
    arquivo: "constante.py",
    piorCaso: () => 1,
    formula: "1 operação, sempre",
    gerar: (nums) => {
      const i = Math.min(3, nums.length - 1);
      return [
        { linha: 0, ops: 0, marcas: {}, ativos: [], fora: [], nota: `Quero o elemento na posição ${i}. O array tem ${nums.length} posições.`, vars: [{ nome: "i", valor: `${i}` }, { nome: "operações", valor: "0" }] },
        { linha: 1, ops: 1, marcas: { [i]: "i" }, ativos: [i], fora: [], ok: true, fim: true, nota: `Peguei nums[${i}] = ${nums[i]} direto. Uma operação, e ela seria uma só com um array de 1 bilhão de posições.`, vars: [{ nome: "i", valor: `${i}` }, { nome: "operações", valor: "1", best: true }] },
      ];
    },
  },
  {
    key: "bin",
    nome: "Busca binária",
    familia: "O(log n)",
    cor: "#22d3ee",
    usaAlvo: true,
    codigo: BINARIA,
    arquivo: "busca_binaria.py",
    piorCaso: (n) => Math.ceil(Math.log2(n + 1)),
    formula: "log₂(n) operações",
    gerar: (nums, alvo) => {
      const out: Passo[] = [];
      let esq = 0, dir = nums.length - 1, ops = 0;
      const vars = () => [
        { nome: "esq", valor: `${esq}` },
        { nome: "dir", valor: `${dir}` },
        { nome: "operações", valor: `${ops}`, best: true },
      ];
      out.push({ linha: 1, ops, marcas: { [esq]: "E", [dir]: "D" }, ativos: faixa(esq, dir), fora: [], nota: `O array precisa estar ordenado. Procurando ${alvo} entre as posições ${esq} e ${dir}.`, vars: vars() });
      let guarda = 0;
      while (esq <= dir && guarda++ < 60) {
        const meio = Math.floor((esq + dir) / 2);
        ops++;
        const marcas: Record<number, string> = { [meio]: "meio" };
        const fora = [...faixa(0, esq - 1), ...faixa(dir + 1, nums.length - 1)];
        out.push({ linha: 3, ops, marcas, ativos: faixa(esq, dir), fora, nota: `Operação ${ops}: olho o meio, posição ${meio}, valor ${nums[meio]}.`, vars: vars() });
        if (nums[meio] === alvo) {
          out.push({ linha: 5, ops, marcas, ativos: [meio], fora, ok: true, fim: true, nota: `Achei ${alvo} na posição ${meio} com ${ops} ${ops === 1 ? "operação" : "operações"}. A busca linear teria olhado ${meio + 1}.`, vars: vars() });
          return out;
        }
        if (nums[meio] < alvo) {
          esq = meio + 1;
          out.push({ linha: 7, ops, marcas, ativos: faixa(esq, dir), fora: [...faixa(0, esq - 1), ...faixa(dir + 1, nums.length - 1)], nota: `${nums[meio]} < ${alvo}: descarto a metade da esquerda de uma vez só.`, vars: vars() });
        } else {
          dir = meio - 1;
          out.push({ linha: 9, ops, marcas, ativos: faixa(esq, dir), fora: [...faixa(0, esq - 1), ...faixa(dir + 1, nums.length - 1)], nota: `${nums[meio]} > ${alvo}: descarto a metade da direita de uma vez só.`, vars: vars() });
        }
      }
      out.push({ linha: 10, ops, marcas: {}, ativos: [], fora: faixa(0, nums.length - 1), fim: true, nota: `Sobrou nada para olhar: ${alvo} não está no array. Custou ${ops} ${ops === 1 ? "operação" : "operações"}.`, vars: vars() });
      return out;
    },
  },
  {
    key: "lin",
    nome: "Busca linear",
    familia: "O(n)",
    cor: "#60a5fa",
    usaAlvo: true,
    codigo: LINEAR,
    arquivo: "busca_linear.py",
    piorCaso: (n) => n,
    formula: "n operações",
    gerar: (nums, alvo) => {
      const out: Passo[] = [];
      let ops = 0;
      out.push({ linha: 1, ops, marcas: {}, ativos: [], fora: [], nota: `Sem ordem garantida, só resta olhar posição por posição até achar ${alvo}.`, vars: [{ nome: "i", valor: "-" }, { nome: "operações", valor: "0", best: true }] });
      for (let i = 0; i < nums.length; i++) {
        ops++;
        const vars = [{ nome: "i", valor: `${i}` }, { nome: "operações", valor: `${ops}`, best: true }];
        if (nums[i] === alvo) {
          out.push({ linha: 3, ops, marcas: { [i]: "i" }, ativos: [i], fora: faixa(0, i - 1), ok: true, fim: true, nota: `Achei ${alvo} na posição ${i}. Custou ${ops} ${ops === 1 ? "operação" : "operações"}.`, vars });
          return out;
        }
        out.push({ linha: 2, ops, marcas: { [i]: "i" }, ativos: [i], fora: faixa(0, i - 1), nota: `Operação ${ops}: nums[${i}] = ${nums[i]}, não é ${alvo}. Sigo.`, vars });
      }
      out.push({ linha: 4, ops, marcas: {}, ativos: [], fora: faixa(0, nums.length - 1), fim: true, nota: `${alvo} não está no array. Este é o pior caso: ${ops} operações para n = ${nums.length}.`, vars: [{ nome: "i", valor: "-" }, { nome: "operações", valor: `${ops}`, best: true }] });
      return out;
    },
  },
  {
    key: "quad",
    nome: "Todos os pares",
    familia: "O(n²)",
    cor: "#fbbf24",
    usaAlvo: false,
    codigo: PARES,
    arquivo: "tem_repetido.py",
    piorCaso: (n) => (n * (n - 1)) / 2,
    formula: "n(n-1)/2 comparações, que é O(n²)",
    gerar: (nums) => {
      const out: Passo[] = [];
      let ops = 0;
      out.push({ linha: 1, ops, marcas: {}, ativos: [], fora: [], nota: "Sem estrutura auxiliar, cada elemento é comparado com todos os outros.", vars: [{ nome: "i", valor: "-" }, { nome: "j", valor: "-" }, { nome: "comparações", valor: "0", best: true }] });
      for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
          ops++;
          const vars = [{ nome: "i", valor: `${i}` }, { nome: "j", valor: `${j}` }, { nome: "comparações", valor: `${ops}`, best: true }];
          if (nums[i] === nums[j]) {
            out.push({ linha: 4, ops, marcas: { [i]: "i", [j]: "j" }, ativos: [i, j], fora: [], ok: true, fim: true, nota: `nums[${i}] e nums[${j}] são iguais (${nums[i]}). Parei na comparação ${ops}.`, vars });
            return out;
          }
          out.push({ linha: 3, ops, marcas: { [i]: "i", [j]: "j" }, ativos: [i, j], fora: [], nota: `Comparação ${ops}: nums[${i}] = ${nums[i]} contra nums[${j}] = ${nums[j]}. Diferentes.`, vars });
        }
      }
      const n = nums.length;
      out.push({ linha: 5, ops, marcas: {}, ativos: [], fora: faixa(0, n - 1), fim: true, nota: `Nenhum repetido. Foram ${ops} comparações para n = ${n}. Dobre o array e esse número quadruplica.`, vars: [{ nome: "i", valor: "-" }, { nome: "j", valor: "-" }, { nome: "comparações", valor: `${ops}`, best: true }] });
      return out;
    },
  },
];

const VELOCIDADES = [0, 1200, 800, 520, 320, 170];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

// O array do vídeo, já ordenado (a busca binária exige ordem).
const PADRAO = [2, 6, 10, 15, 20, 43, 60, 70];
const ALVO_PADRAO = 20;

function num(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function BigOCounterVisualizer() {
  const [iAlg, setIAlg] = useState(1);
  const [nums, setNums] = useState<number[]>(PADRAO);
  const [entrada, setEntrada] = useState(PADRAO.join(", "));
  const [alvo, setAlvo] = useState(ALVO_PADRAO);
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const alg = ALGORITMOS[iAlg];
  const passos = useMemo(() => alg.gerar(nums.length ? nums : [1], alvo), [alg, nums, alvo]);
  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];
  const n = nums.length;

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

  const reiniciar = () => { parar(); setTocando(false); setPasso(0); };

  const aoMudarEntrada = (v: string) => {
    const arr = v.split(",").map((x) => parseInt(x.trim(), 10)).filter((x) => !isNaN(x)).slice(0, 14);
    const ordenado = [...arr].sort((a, b) => a - b);
    reiniciar();
    setEntrada(v);
    setNums(ordenado.length ? ordenado : [1]);
  };

  const trocarAlg = (i: number) => { reiniciar(); setIAlg(i); };

  const cells = nums.map((v, i) => {
    let cls = "viz-cell";
    if (p.ativos.includes(i)) cls += " in";
    if (p.fora.includes(i)) cls += " drop";
    if (p.ok && p.ativos.includes(i)) cls += " entra";
    return { i, v, cls, marca: p.marcas[i] ?? "" };
  });

  const notaCls = "viz-note" + (p.ok ? " ok" : p.fim ? " invalid" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" style={{ background: alg.cor }} />
          <span>Visualizador · contando operações no mesmo array</span>
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
          {ALGORITMOS.map((a, i) => {
            const on = i === iAlg;
            return (
              <button
                key={a.key}
                className={`bigo-chip${on ? " on" : ""}`}
                style={on ? { borderColor: a.cor, color: a.cor } : undefined}
                onClick={() => trocarAlg(i)}
                aria-pressed={on}
              >
                <span className="sw" style={{ background: on ? a.cor : "#3a4a60" }} />
                {a.familia} · {a.nome}
              </button>
            );
          })}
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Array (fica ordenado)</span>
            <input className="viz-input" value={entrada} onChange={(e) => aoMudarEntrada(e.target.value)} />
          </label>
          {alg.usaAlvo && (
            <label className="viz-field">
              <span>alvo</span>
              <input
                className="viz-input k"
                type="number"
                value={alvo}
                onChange={(e) => { reiniciar(); setAlvo(parseInt(e.target.value, 10) || 0); }}
              />
            </label>
          )}
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

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>operações até aqui</span>
            <strong style={{ color: alg.cor }}>{num(p.ops)}</strong>
          </div>
          <div className="bigo-stat">
            <span>n (tamanho da entrada)</span>
            <strong>{num(n)}</strong>
          </div>
          <div className="bigo-stat">
            <span>pior caso com n = {num(n)}</span>
            <strong>{num(alg.piorCaso(n))}</strong>
          </div>
          <div className="bigo-stat">
            <span>pior caso com n = {num(n * 2)}</span>
            <strong>{num(alg.piorCaso(n * 2))}</strong>
          </div>
        </div>

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">{alg.arquivo} · {alg.formula}</div>
            <div className="viz-code-body">
              {alg.codigo.map((txt, i) => (
                <div key={i} className={`viz-line${i === p.linha ? " on" : ""}`}>
                  <span className="ln">{i + 1}</span>
                  {txt}
                </div>
              ))}
            </div>
          </div>
          <div className="viz-vars">
            <div className="viz-vars-head">Variáveis</div>
            {p.vars.map((v) => (
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
          <div className="viz-speed">
            <span>Velocidade</span>
            <input type="range" min={1} max={5} step={1} value={velocidade} onChange={(e) => setVelocidade(parseInt(e.target.value, 10))} />
            <span className="val">{ROTULOS_VEL[velocidade]}</span>
          </div>
        </div>
        <div className="viz-progress"><div className="viz-progress-fill" style={{ width: `${pctPasso}%`, background: alg.cor }} /></div>
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
