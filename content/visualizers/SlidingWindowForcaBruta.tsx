"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// SlidingWindowForcaBruta, os dois algoritmos correndo lado a lado.
//
// O SlidingWindowVisualizer ensina COMO a janela anda. Este aqui existe para
// responder outra pergunta: POR QUE vale a pena. Roda a força bruta e a janela
// sobre o mesmo array, com um contador de operações para cada, e a diferença
// entre os dois números é o argumento inteiro da técnica.
//
// Mesma casca dos outros (gerador puro de passos + controles + Expandir).
// ---------------------------------------------------------------------------

type Passo = {
  // Índices da janela atualmente sob análise nos dois lados.
  ini: number;
  fim: number;
  // Quem está sendo somado agora na força bruta (null quando não é leitura).
  lendo: number | null;
  // Na janela: quem entrou e quem saiu neste passo.
  entrou: number | null;
  saiu: number | null;
  opsForca: number;
  opsJanela: number;
  somaForca: number;
  somaJanela: number;
  melhorForca: number;
  melhorJanela: number;
  linha: number;
  nota: string;
  fim_?: boolean;
};

const CODIGO = [
  "# força bruta: refaz a soma inteira de cada janela",
  "for i in range(n - k + 1):",
  "    soma = 0",
  "    for j in range(i, i + k):",
  "        soma += nums[j]        # k leituras por janela",
  "",
  "# janela deslizante: mantém a soma",
  "soma = sum(nums[:k])",
  "for direita in range(k, n):",
  "    soma += nums[direita]      # entra 1",
  "    soma -= nums[direita - k]  # sai 1",
];

const VELOCIDADES = [0, 1100, 750, 480, 300, 160];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

const PADRAO = [2, 3, 4, 5, 6, 7, 1, 9];
const K_PADRAO = 3;

function gerarPassos(nums: number[], k: number): Passo[] {
  const out: Passo[] = [];
  const n = nums.length;
  if (k < 1 || k > n) {
    out.push({
      ini: 0, fim: -1, lendo: null, entrou: null, saiu: null,
      opsForca: 0, opsJanela: 0, somaForca: 0, somaJanela: 0,
      melhorForca: 0, melhorJanela: 0, linha: 1, fim_: true,
      nota: `k = ${k} não cabe num array de ${n} posições. Não existe janela nenhuma para analisar, e este é um caso de borda que todo código precisa tratar.`,
    });
    return out;
  }

  // A força bruta roda inteira primeiro (só para termos o total dela por janela),
  // mas os passos são intercalados: cada janela mostra os dois custos juntos.
  let opsF = 0, opsJ = 0;
  let melhorF = -Infinity, melhorJ = -Infinity;
  let somaJ = 0;

  // Montagem da primeira janela: os dois pagam k leituras aqui.
  let somaF = 0;
  for (let j = 0; j < k; j++) {
    somaF += nums[j];
    opsF++;
    somaJ += nums[j];
    opsJ++;
    out.push({
      ini: 0, fim: k - 1, lendo: j, entrou: null, saiu: null,
      opsForca: opsF, opsJanela: opsJ, somaForca: somaF, somaJanela: somaJ,
      melhorForca: melhorF === -Infinity ? 0 : melhorF,
      melhorJanela: melhorJ === -Infinity ? 0 : melhorJ,
      linha: 4,
      nota: `Primeira janela: os dois somam nums[${j}] = ${nums[j]}. Até aqui empatados, ninguém tem estado guardado ainda.`,
    });
  }
  melhorF = somaF;
  melhorJ = somaJ;
  out.push({
    ini: 0, fim: k - 1, lendo: null, entrou: null, saiu: null,
    opsForca: opsF, opsJanela: opsJ, somaForca: somaF, somaJanela: somaJ,
    melhorForca: melhorF, melhorJanela: melhorJ, linha: 7,
    nota: `Janela [0..${k - 1}] fechada, soma ${somaF}. Custou ${k} leituras para os dois. A diferença começa agora.`,
  });

  // Da segunda janela em diante os caminhos separam.
  for (let i = 1; i <= n - k; i++) {
    const fim = i + k - 1;

    // Força bruta: relê a janela inteira.
    somaF = 0;
    for (let j = i; j <= fim; j++) {
      somaF += nums[j];
      opsF++;
      out.push({
        ini: i, fim, lendo: j, entrou: null, saiu: null,
        opsForca: opsF, opsJanela: opsJ, somaForca: somaF, somaJanela: somaJ,
        melhorForca: melhorF, melhorJanela: melhorJ, linha: 4,
        nota: `Força bruta relendo: nums[${j}] = ${nums[j]}. Ela já tinha lido ${j > i ? `nums[${j}]` : "quase tudo isso"} na janela anterior e joga esse trabalho fora a cada passo.`,
      });
    }
    melhorF = Math.max(melhorF, somaF);

    // Janela: uma soma e uma subtração.
    const entrou = fim;
    const saiu = i - 1;
    somaJ = somaJ + nums[entrou] - nums[saiu];
    opsJ += 2;
    melhorJ = Math.max(melhorJ, somaJ);
    out.push({
      ini: i, fim, lendo: null, entrou, saiu,
      opsForca: opsF, opsJanela: opsJ, somaForca: somaF, somaJanela: somaJ,
      melhorForca: melhorF, melhorJanela: melhorJ, linha: 10,
      nota: `Janela: entrou nums[${entrou}] = ${nums[entrou]}, saiu nums[${saiu}] = ${nums[saiu]}. Duas operações, e a soma ${somaJ} bate com a da força bruta, que gastou ${k}.`,
    });
  }

  const janelas = n - k + 1;
  out.push({
    ini: n - k, fim: n - 1, lendo: null, entrou: null, saiu: null,
    opsForca: opsF, opsJanela: opsJ, somaForca: somaF, somaJanela: somaJ,
    melhorForca: melhorF, melhorJanela: melhorJ, linha: 10, fim_: true,
    nota: `Fim. Mesma resposta (${melhorF}) com ${opsF} operações na força bruta contra ${opsJ} na janela, em ${janelas} janelas. Aumente o k e veja a força bruta disparar enquanto a janela quase não se mexe.`,
  });
  return out;
}

function num(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function SlidingWindowForcaBruta() {
  const [nums, setNums] = useState<number[]>(PADRAO);
  const [entrada, setEntrada] = useState(PADRAO.join(", "));
  const [k, setK] = useState(K_PADRAO);
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const passos = useMemo(() => gerarPassos(nums.length ? nums : [1], k), [nums, k]);
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

  const reiniciar = () => { parar(); setTocando(false); setPasso(0); };

  const aoMudarEntrada = (v: string) => {
    const arr = v.split(",").map((x) => parseInt(x.trim(), 10)).filter((x) => !isNaN(x)).slice(0, 14);
    reiniciar();
    setEntrada(v);
    setNums(arr.length ? arr : [1]);
  };

  const preset = (arr: number[], kk: number) => {
    reiniciar();
    setNums(arr); setEntrada(arr.join(", ")); setK(kk);
  };

  const economia = p.opsForca > 0 ? Math.round(((p.opsForca - p.opsJanela) / p.opsForca) * 100) : 0;

  const cells = nums.map((v, i) => {
    let cls = "viz-cell";
    if (i >= p.ini && i <= p.fim) cls += " in";
    if (i < p.ini || i > p.fim) cls += " drop";
    if (p.lendo === i) cls += " entra";
    if (p.entrou === i) cls += " entra";
    if (p.saiu === i) cls += " sai";
    let marca = "";
    if (p.lendo === i) marca = "lê";
    if (p.entrou === i) marca = "entra";
    if (p.saiu === i) marca = "sai";
    return { i, v, cls, marca };
  });

  const notaCls = "viz-note" + (p.fim_ ? " ok" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · força bruta contra janela, no mesmo array</span>
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
            <span>Array</span>
            <input className="viz-input" value={entrada} onChange={(e) => aoMudarEntrada(e.target.value)} />
          </label>
          <label className="viz-field">
            <span>k</span>
            <input
              className="viz-input k"
              type="number"
              min={1}
              value={k}
              onChange={(e) => { reiniciar(); setK(parseInt(e.target.value, 10) || 1); }}
            />
          </label>
        </div>

        <div className="bigo-chips">
          <button className="bigo-chip" onClick={() => preset(PADRAO, 3)}>k pequeno (3)</button>
          <button className="bigo-chip" onClick={() => preset(PADRAO, 6)}>k grande (6)</button>
          <button className="bigo-chip" onClick={() => preset([4, 4, 4, 4, 4, 4, 4, 4], 3)}>tudo igual</button>
          <button className="bigo-chip" onClick={() => preset([9], 1)}>um elemento</button>
          <button className="bigo-chip" onClick={() => preset(PADRAO, 12)}>k maior que n</button>
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
            <span>operações da força bruta</span>
            <strong style={{ color: "#f87171" }}>{num(p.opsForca)}</strong>
          </div>
          <div className="bigo-stat">
            <span>operações da janela</span>
            <strong style={{ color: "#34d399" }}>{num(p.opsJanela)}</strong>
          </div>
          <div className="bigo-stat">
            <span>trabalho economizado</span>
            <strong>{economia}%</strong>
          </div>
          <div className="bigo-stat">
            <span>maior soma (as duas)</span>
            <strong>{num(Math.max(p.melhorForca, p.melhorJanela))}</strong>
          </div>
        </div>

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">comparacao.py · O(n·k) contra O(n)</div>
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
            <div className="viz-var">
              <span className="viz-var-name">soma (força bruta)</span>
              <span className="viz-var-val">{num(p.somaForca)}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">soma (janela)</span>
              <span className="viz-var-val best">{num(p.somaJanela)}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">janela</span>
              <span className="viz-var-val">{p.fim < p.ini ? "-" : `[${p.ini}..${p.fim}]`}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">k</span>
              <span className="viz-var-val">{k}</span>
            </div>
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
