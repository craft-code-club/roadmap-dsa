"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// BigOChartVisualizer, as curvas de crescimento desenhadas num canvas.
//
// Foge um pouco do padrão "gerador puro de passos" dos outros visualizadores
// porque aqui não existe um algoritmo rodando passo a passo: o que se aprende
// é a FORMA de cada família quando a entrada cresce. A casca (viz-head,
// viz-body, controles, Expandir) é a mesma dos demais.
//
// Toda família é definida em duas versões: `val` (o número de operações, que
// estoura para Infinity em 2^n e n!) e `log10` (o mesmo valor em log, sempre
// finito). Assim a escala logarítmica continua desenhando o que a linear não
// consegue mais representar.
// ---------------------------------------------------------------------------

type Familia = {
  key: string;
  rotulo: string;
  cor: string;
  exemplo: string;
  val: (n: number) => number;
  log10: (n: number) => number;
};

const LN10 = Math.LN10;

// log10(n!) por Stirling com o termo de correção 1/(12n). Contínua (a curva
// sai lisa em vez de escadinha) e barata mesmo com n na casa do milhão, onde
// somar log de cada termo seria inviável a cada ponto do gráfico.
function log10Fatorial(n: number): number {
  const x = Math.max(1, n);
  return (x * Math.log(x) - x + 0.5 * Math.log(2 * Math.PI * x) + 1 / (12 * x)) / LN10;
}

function fatorial(n: number): number {
  if (n > 170) return Infinity;
  let f = 1;
  for (let i = 2; i <= Math.floor(n); i++) f *= i;
  return f;
}

const FAMILIAS: Familia[] = [
  { key: "c", rotulo: "O(1)", cor: "#34d399", exemplo: "acesso por índice",
    val: () => 1, log10: () => 0 },
  { key: "log", rotulo: "O(log n)", cor: "#22d3ee", exemplo: "busca binária",
    val: (n) => Math.max(1, Math.log2(n)), log10: (n) => Math.log10(Math.max(1, Math.log2(n))) },
  { key: "n", rotulo: "O(n)", cor: "#60a5fa", exemplo: "busca linear",
    val: (n) => n, log10: (n) => Math.log10(n) },
  { key: "nlog", rotulo: "O(n log n)", cor: "#a78bfa", exemplo: "merge sort",
    val: (n) => n * Math.max(1, Math.log2(n)), log10: (n) => Math.log10(n) + Math.log10(Math.max(1, Math.log2(n))) },
  { key: "n2", rotulo: "O(n²)", cor: "#fbbf24", exemplo: "dois laços aninhados",
    val: (n) => n * n, log10: (n) => 2 * Math.log10(n) },
  { key: "n3", rotulo: "O(n³)", cor: "#fb923c", exemplo: "três laços aninhados",
    val: (n) => n * n * n, log10: (n) => 3 * Math.log10(n) },
  { key: "exp", rotulo: "O(2ⁿ)", cor: "#f87171", exemplo: "fibonacci recursivo",
    val: (n) => (n > 1023 ? Infinity : Math.pow(2, n)), log10: (n) => n * Math.log10(2) },
  { key: "fat", rotulo: "O(n!)", cor: "#f472b6", exemplo: "permutações, caixeiro viajante",
    val: (n) => fatorial(n), log10: (n) => log10Fatorial(n) },
];

// Entradas em passos redondos, do "cabe na cabeça" ao "escala de produção".
const ENTRADAS = [10, 25, 50, 100, 250, 500, 1000, 5000, 10000, 100000, 1000000];

const PADRAO = new Set(["c", "log", "n", "nlog", "n2"]);

// Formatação determinística (nada de Intl, para o HTML do servidor e do
// cliente baterem exatamente na hidratação).
function num(v: number): string {
  const r = Math.round(v * 10) / 10;
  const txt = Number.isInteger(r) ? String(r) : r.toFixed(1).replace(".", ",");
  return txt.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function fmt(v: number): string {
  if (!isFinite(v)) return "grande demais";
  if (v >= 1e15) return `10^${Math.round(Math.log10(v))}`;
  if (v >= 1e12) return `${num(v / 1e12)} tri`;
  if (v >= 1e9) return `${num(v / 1e9)} bi`;
  if (v >= 1e6) return `${num(v / 1e6)} mi`;
  return num(Math.round(v));
}

function fmtLog(log10v: number): string {
  if (log10v < 15) return fmt(Math.pow(10, log10v));
  return `10^${Math.round(log10v)}`;
}

// Rótulo do eixo Y em escala log: sempre uma potência de 10 redonda.
function decada(exp: number): string {
  if (exp === 0) return "1";
  if (exp <= 6) return num(Math.pow(10, exp));
  return `10^${exp}`;
}

export function BigOChartVisualizer() {
  const [iEntrada, setIEntrada] = useState(3); // 100
  const [logaritmica, setLogaritmica] = useState(false);
  const [ativas, setAtivas] = useState<Set<string>>(new Set(PADRAO));
  const [marcadorPct, setMarcadorPct] = useState(0.62);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [largura, setLargura] = useState(720);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const nMax = ENTRADAS[iEntrada];
  const nMarcador = Math.max(1, Math.round(nMax * marcadorPct));
  const visiveis = useMemo(() => FAMILIAS.filter((f) => ativas.has(f.key)), [ativas]);

  const alternar = useCallback((key: string) => {
    setAtivas((s) => {
      const novo = new Set(s);
      if (novo.has(key)) novo.delete(key); else novo.add(key);
      return novo.size ? novo : new Set([key]);
    });
  }, []);

  // Largura real do canvas: o gráfico é redesenhado quando o container muda
  // (troca de viewport, abrir/fechar o Expandir).
  const medir = useCallback((el: HTMLDivElement | null) => {
    wrapRef.current = el;
    if (el) setLargura(el.clientWidth || 720);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setLargura(el.clientWidth || 720));
    ro.observe(el);
    return () => ro.disconnect();
  }, [expanded, mounted]);

  const altura = expanded ? 400 : 300;

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.max(280, largura);
    const H = altura;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cv.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const padE = 72, padD = 16, padT = 26, padB = 34;
    const gw = W - padE - padD;
    const gh = H - padT - padB;
    const mono = '11px ui-monospace, SFMono-Regular, Menlo, monospace';

    // Teto do eixo Y. Na linear, o maior valor visível; na log, a maior ordem
    // de grandeza arredondada para um número redondo de décadas por linha,
    // para os rótulos saírem sempre como potências inteiras de 10.
    const topoLog = Math.max(1, ...visiveis.map((f) => f.log10(nMax)));
    const passoLog = Math.max(1, Math.ceil(topoLog / 5));
    const yMaxLog = passoLog * Math.ceil(topoLog / passoLog);
    const brutos = visiveis.map((f) => f.val(nMax)).filter((v) => isFinite(v));
    const yMax = brutos.length ? Math.max(10, Math.max(...brutos)) : 10;

    const px = (n: number) => padE + ((n - 1) / Math.max(1, nMax - 1)) * gw;
    const py = (f: Familia, n: number) => {
      if (logaritmica) {
        const v = Math.max(0, f.log10(n));
        return padT + gh - (v / yMaxLog) * gh;
      }
      const v = f.val(n);
      if (!isFinite(v)) return padT - 40;
      return padT + gh - Math.min(1.2, v / yMax) * gh;
    };

    // Grade e eixo Y
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.fillStyle = "#61748c";
    ctx.font = mono;
    ctx.lineWidth = 1;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const linhas = logaritmica ? Math.round(yMaxLog / passoLog) : 5;
    for (let i = 0; i <= linhas; i++) {
      const y = padT + gh - (i / linhas) * gh;
      ctx.beginPath();
      ctx.moveTo(padE, Math.round(y) + 0.5);
      ctx.lineTo(padE + gw, Math.round(y) + 0.5);
      ctx.stroke();
      const rotulo = logaritmica ? decada(i * passoLog) : fmt((i / linhas) * yMax);
      ctx.fillText(rotulo, padE - 8, y);
    }

    // Eixo X
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const marcasX = 4;
    for (let i = 0; i <= marcasX; i++) {
      const n = 1 + ((nMax - 1) * i) / marcasX;
      const x = px(n);
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.moveTo(Math.round(x) + 0.5, padT);
      ctx.lineTo(Math.round(x) + 0.5, padT + gh);
      ctx.stroke();
      ctx.fillStyle = "#61748c";
      ctx.fillText(fmt(Math.round(n)), x, padT + gh + 8);
    }

    ctx.textAlign = "left";
    ctx.fillStyle = "#4c5f79";
    ctx.fillText("n (tamanho da entrada) →", padE, padT + gh + 21);
    ctx.fillText(logaritmica ? "↑ operações (escala logarítmica)" : "↑ operações", padE, 7);

    // Curvas, recortadas na área do gráfico
    ctx.save();
    ctx.beginPath();
    ctx.rect(padE, padT - 1, gw, gh + 2);
    ctx.clip();
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const amostras = Math.max(80, Math.round(gw));
    for (const f of visiveis) {
      ctx.strokeStyle = f.cor;
      ctx.beginPath();
      for (let i = 0; i <= amostras; i++) {
        const n = 1 + ((nMax - 1) * i) / amostras;
        const x = px(n);
        const y = py(f, n);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Marcador: linha vertical + bolinha em cada curva
    const xm = px(nMarcador);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(xm) + 0.5, padT);
    ctx.lineTo(Math.round(xm) + 0.5, padT + gh);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const f of visiveis) {
      const y = py(f, nMarcador);
      if (y < padT - 2 || y > padT + gh + 2) continue;
      ctx.fillStyle = f.cor;
      ctx.beginPath();
      ctx.arc(xm, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0d1420";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();

    // Moldura
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(padE + 0.5, padT + 0.5, gw - 1, gh - 1);
  }, [visiveis, nMax, nMarcador, logaritmica, largura, altura]);

  const moverMarcador = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const padE = 72, padD = 16;
    const gw = r.width - padE - padD;
    const pct = (e.clientX - r.left - padE) / Math.max(1, gw);
    setMarcadorPct(Math.min(1, Math.max(0.001, pct)));
  };

  const leitura = visiveis.map((f) => ({
    key: f.key,
    rotulo: f.rotulo,
    cor: f.cor,
    exemplo: f.exemplo,
    valor: f.log10(nMarcador) >= 15 ? fmtLog(f.log10(nMarcador)) : fmt(f.val(nMarcador)),
  }));

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · como cada família cresce</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">n = {num(nMarcador)}</span>
          <button className="viz-expand" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "✕ Fechar" : "⤢ Expandir"}
          </button>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          {FAMILIAS.map((f) => {
            const on = ativas.has(f.key);
            return (
              <button
                key={f.key}
                className={`bigo-chip${on ? " on" : ""}`}
                style={on ? { borderColor: f.cor, color: f.cor } : undefined}
                onClick={() => alternar(f.key)}
                aria-pressed={on}
              >
                <span className="sw" style={{ background: on ? f.cor : "#3a4a60" }} />
                {f.rotulo}
              </button>
            );
          })}
        </div>

        <div className="bigo-canvas-wrap" ref={medir}>
          <canvas
            ref={canvasRef}
            className="bigo-canvas"
            style={{ height: altura }}
            onPointerDown={moverMarcador}
            onPointerMove={(e) => { if (e.buttons === 1 || e.pointerType === "mouse") moverMarcador(e); }}
          />
        </div>

        <p className="viz-note">
          Com <strong>n = {num(nMarcador)}</strong>, {leitura.length === 1 ? "a família marcada faz" : "as famílias marcadas fazem"}{" "}
          {leitura.map((l, i) => (
            <span key={l.key}>
              {i > 0 ? (i === leitura.length - 1 ? " e " : ", ") : ""}
              <strong style={{ color: l.cor }}>{l.valor}</strong> operações em {l.rotulo}
            </span>
          ))}
          . Arraste sobre o gráfico para mover o marcador.
        </p>

        <div className="bigo-grid">
          {leitura.map((l) => (
            <div className="bigo-card" key={l.key} style={{ borderLeftColor: l.cor }}>
              <div className="bigo-card-top">
                <span className="bigo-card-nome" style={{ color: l.cor }}>{l.rotulo}</span>
                <span className="bigo-card-val">{l.valor}</span>
              </div>
              <div className="bigo-card-ex">{l.exemplo}</div>
            </div>
          ))}
        </div>

        <div className="viz-controls">
          <div className="viz-field grow">
            <span>Entrada máxima: n até {num(nMax)}</span>
            <input
              type="range"
              min={0}
              max={ENTRADAS.length - 1}
              step={1}
              value={iEntrada}
              onChange={(e) => setIEntrada(parseInt(e.target.value, 10))}
              style={{ accentColor: "var(--ccc-accent)", width: "100%" }}
            />
          </div>
          <button className="viz-btn" onClick={() => setLogaritmica((v) => !v)}>
            Escala: {logaritmica ? "logarítmica" : "linear"}
          </button>
          <button className="viz-btn" onClick={() => { setAtivas(new Set(PADRAO)); setIEntrada(3); setMarcadorPct(0.62); setLogaritmica(false); }}>
            ↺ Reiniciar
          </button>
        </div>
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
