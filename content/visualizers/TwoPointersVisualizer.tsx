"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// TwoPointersVisualizer, ponteiros convergentes (Two Sum em array ordenado).
//
// Mesmo padrão do SlidingWindowVisualizer: um gerador puro de passos + a mesma casca
// (células, código sincronizado, variáveis, controles, Expandir). É a receita
// para novos visualizadores, copie, troque `gerarPassos` e `CODIGO`.
//
// Além do passo a passo, o painel de estatísticas conta as SOMAS AVALIADAS e
// mostra, ao lado, quantos pares a força bruta testaria no pior caso
// (n(n-1)/2). É esse par de números que transforma "O(n) é melhor que O(n²)"
// em algo que o aluno vê acontecendo.
//
// O array padrão [1, 2, 3, 6, 8, 10, 20, 21] com alvo 16 é o mesmo que a
// galera usou no encontro: as somas saem 22, 21, 11, 12, 13 e 16.
// ---------------------------------------------------------------------------

type Passo = {
  l: number;
  r: number;
  soma: number | null;
  somas: number; // quantas somas já foram avaliadas até este passo
  linha: number;
  moveL?: boolean;
  moveR?: boolean;
  found?: boolean;
  fim?: boolean;
  nota: string;
};

// As linhas mapeiam 1:1 com os passos (campo `linha` em gerarPassos), então a
// ordem e a quantidade de linhas não podem mudar.
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
  let somas = 0;
  out.push({ l, r, soma: null, somas, linha: 2, nota: "esquerda no início, direita no fim do array ordenado." });
  let guarda = 0;
  while (l < r && guarda++ < 100) {
    const soma = nums[l] + nums[r];
    somas++;
    out.push({ l, r, soma, somas, linha: 4, nota: `soma = nums[${l}] + nums[${r}] = ${nums[l]} + ${nums[r]} = ${soma}.` });
    if (soma === alvo) {
      out.push({ l, r, soma, somas, linha: 6, found: true, fim: true, nota: `soma = alvo (${alvo})! Par encontrado nos índices ${l} e ${r}, com ${somas} ${somas === 1 ? "soma avaliada" : "somas avaliadas"}.` });
      return out;
    }
    if (soma < alvo) {
      out.push({ l, r, soma, somas, linha: 8, moveL: true, nota: `${soma} < ${alvo}: preciso de uma soma maior, então avanço a esquerda e descarto o índice ${l} de vez.` });
      l++;
    } else {
      out.push({ l, r, soma, somas, linha: 10, moveR: true, nota: `${soma} > ${alvo}: preciso de uma soma menor, então recuo a direita e descarto o índice ${r} de vez.` });
      r--;
    }
  }
  out.push({ l, r, soma: null, somas, linha: 11, fim: true, nota: `Os ponteiros se encontraram no índice ${l}: não existe par com essa soma, e para descobrir isso bastaram ${somas} ${somas === 1 ? "soma" : "somas"}.` });
  return out;
}

const DEFAULT_NUMS = [1, 2, 3, 6, 8, 10, 20, 21];
const DEFAULT_ALVO = 16;

// Casos escolhidos a dedo: o do encontro, o melhor caso, o pior caso (nenhum
// par, n-1 somas) e uma borda em que todo elemento é igual.
type Preset = { key: string; rotulo: string; nums: number[]; alvo: number };
const PRESETS: Preset[] = [
  { key: "encontro", rotulo: "Do encontro: alvo 16", nums: DEFAULT_NUMS, alvo: DEFAULT_ALVO },
  { key: "pontas", rotulo: "Acerta de cara: alvo 22", nums: DEFAULT_NUMS, alvo: 22 },
  { key: "sem", rotulo: "Sem solução: alvo 100", nums: DEFAULT_NUMS, alvo: 100 },
  { key: "iguais", rotulo: "Tudo igual: alvo 11", nums: [5, 5, 5, 5], alvo: 11 },
];

function ordenar(v: number[]) {
  return [...v].sort((a, b) => a - b);
}

export function TwoPointersVisualizer() {
  const [nums, setNums] = useState<number[]>(DEFAULT_NUMS);
  const [entrada, setEntrada] = useState(DEFAULT_NUMS.join(", "));
  const [alvo, setAlvo] = useState(DEFAULT_ALVO);
  const [preset, setPreset] = useState("encontro");
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
    parar(); setTocando(false); setPasso(0); setPreset("");
    setEntrada(v); setNums(arr.length ? arr : [1]);
  };
  const aoMudarAlvo = (v: string) => {
    parar(); setTocando(false); setPasso(0); setPreset("");
    setAlvo(parseInt(v, 10) || 0);
  };
  const aplicarPreset = (pr: Preset) => {
    parar(); setTocando(false); setPasso(0); setPreset(pr.key);
    setNums(pr.nums); setEntrada(pr.nums.join(", ")); setAlvo(pr.alvo);
  };
  const sortear = () => {
    const n = 6 + Math.floor(Math.random() * 3);
    const arr = ordenar(Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 14)));
    const alvoNovo = arr[Math.floor(Math.random() * n)] + arr[Math.floor(Math.random() * n)];
    parar(); setTocando(false); setPasso(0); setPreset("");
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

  const n = nums.length;
  const paresForcaBruta = (n * (n - 1)) / 2;
  const estatisticas = [
    { k: "n", rot: "tamanho (n)", val: `${n}` },
    { k: "somas", rot: "somas avaliadas", val: `${p.somas}` },
    { k: "bruta", rot: "pares na força bruta", val: `${paresForcaBruta}` },
    { k: "espaco", rot: "memória extra", val: "O(1)" },
  ];

  const notaCls = "viz-note" + (p.found ? " ok" : p.fim ? " invalid" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · ponteiros convergentes: dois números que somam o alvo</span>
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
            <button
              key={pr.key}
              className={`bigo-chip${preset === pr.key ? " on" : ""}`}
              onClick={() => aplicarPreset(pr)}
              aria-pressed={preset === pr.key}
            >
              {pr.rotulo}
            </button>
          ))}
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Array (é ordenado sozinho)</span>
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
              {CODIGO.map((txt, i) => (
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

        <div className="bigo-stats">
          {estatisticas.map((s) => (
            <div className="bigo-stat" key={s.k}>
              <span>{s.rot}</span>
              <strong>{s.val}</strong>
            </div>
          ))}
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
