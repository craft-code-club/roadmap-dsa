"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { thousandsDecimal } from "@/lib/format";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// BigOChartVisualizer, as curvas de crescimento desenhadas num canvas.
//
// Foge um pouco do padrão "gerador puro de passos" dos outros visualizadores
// porque aqui não existe um algoritmo rodando passo a passo: o que se aprende
// é a FORMA de cada família quando a entrada cresce. Por isso ele entra na
// casca com `total: 1` (sem linha do tempo) e `collapsible: false` (o canvas é
// o conteúdo, não há bloco dispensável para recolher).
//
// A casca vem do `useVisualizer`: painel com cabeçalho e controles parados,
// foco, Tab circulando e Esc. Aqui fica só o que é DESTE visualizador.
// Contrato em `content/visualizers/README.md`.
//
// Toda família é definida em duas versões: `val` (o número de operações, que
// estoura para Infinity em 2^n e n!) e `log10` (o mesmo valor em log, sempre
// finito). Assim a escala logarítmica continua desenhando o que a linear não
// consegue mais representar.
// ---------------------------------------------------------------------------

type Family = {
  key: string;
  label: string;
  color: string;
  example: string;
  val: (n: number) => number;
  log10: (n: number) => number;
};

const LN10 = Math.LN10;

// log10(n!) por Stirling com o termo de correção 1/(12n). Contínua (a curva
// sai lisa em vez de escadinha) e barata mesmo com n na casa do milhão, onde
// somar log de cada termo seria inviável a cada ponto do gráfico.
function log10Factorial(n: number): number {
  const x = Math.max(1, n);
  return (x * Math.log(x) - x + 0.5 * Math.log(2 * Math.PI * x) + 1 / (12 * x)) / LN10;
}

function factorial(n: number): number {
  if (n > 170) return Infinity;
  let f = 1;
  for (let i = 2; i <= Math.floor(n); i++) f *= i;
  return f;
}

const FAMILIES: Family[] = [
  { key: "c", label: "O(1)", color: "#34d399", example: "acesso por índice",
    val: () => 1, log10: () => 0 },
  { key: "log", label: "O(log n)", color: "#22d3ee", example: "busca binária",
    val: (n) => Math.max(1, Math.log2(n)), log10: (n) => Math.log10(Math.max(1, Math.log2(n))) },
  { key: "n", label: "O(n)", color: "#60a5fa", example: "busca linear",
    val: (n) => n, log10: (n) => Math.log10(n) },
  { key: "nlog", label: "O(n log n)", color: "#a78bfa", example: "merge sort",
    val: (n) => n * Math.max(1, Math.log2(n)), log10: (n) => Math.log10(n) + Math.log10(Math.max(1, Math.log2(n))) },
  { key: "n2", label: "O(n²)", color: "#fbbf24", example: "dois laços aninhados",
    val: (n) => n * n, log10: (n) => 2 * Math.log10(n) },
  { key: "n3", label: "O(n³)", color: "#fb923c", example: "três laços aninhados",
    val: (n) => n * n * n, log10: (n) => 3 * Math.log10(n) },
  { key: "exp", label: "O(2ⁿ)", color: "#f87171", example: "fibonacci recursivo",
    val: (n) => (n > 1023 ? Infinity : Math.pow(2, n)), log10: (n) => n * Math.log10(2) },
  { key: "fat", label: "O(n!)", color: "#f472b6", example: "permutações, caixeiro viajante",
    val: (n) => factorial(n), log10: (n) => log10Factorial(n) },
];

// Entradas em passos redondos, do "cabe na cabeça" ao "escala de produção".
const INPUT_SIZES = [10, 25, 50, 100, 250, 500, 1000, 5000, 10000, 100000, 1000000];

const DEFAULT_KEYS = new Set(["c", "log", "n", "nlog", "n2"]);

function fmt(v: number): string {
  if (!isFinite(v)) return "grande demais";
  if (v >= 1e15) return `10^${Math.round(Math.log10(v))}`;
  if (v >= 1e12) return `${thousandsDecimal(v / 1e12)} tri`;
  if (v >= 1e9) return `${thousandsDecimal(v / 1e9)} bi`;
  if (v >= 1e6) return `${thousandsDecimal(v / 1e6)} mi`;
  return thousandsDecimal(Math.round(v));
}

function fmtLog(log10v: number): string {
  if (log10v < 15) return fmt(Math.pow(10, log10v));
  return `10^${Math.round(log10v)}`;
}

// Rótulo do eixo Y em escala log: sempre uma potência de 10 redonda.
function decade(exp: number): string {
  if (exp === 0) return "1";
  if (exp <= 6) return thousandsDecimal(Math.pow(10, exp));
  return `10^${exp}`;
}

export function BigOChartVisualizer() {
  const [sizeIndex, setSizeIndex] = useState(3); // 100
  const [logScale, setLogScale] = useState(false);
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set(DEFAULT_KEYS));
  const [markerPct, setMarkerPct] = useState(0.62);
  const [width, setWidth] = useState(720);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // `total: 1` porque não há linha do tempo: o aluno lê uma curva, não uma
  // animação. `collapsible: false` porque o canvas É o conteúdo — não existe
  // bloco dispensável aqui, e o contrato proíbe inventar um só para ter o botão.
  const viz = useVisualizer({
    title: "Visualizador · como cada família cresce",
    total: 1,
    collapsible: false,
  });

  const nMax = INPUT_SIZES[sizeIndex];
  const nMarker = Math.max(1, Math.round(nMax * markerPct));
  const visible = useMemo(() => FAMILIES.filter((f) => activeKeys.has(f.key)), [activeKeys]);

  const toggleFamily = useCallback((key: string) => {
    setActiveKeys((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next.size ? next : new Set([key]);
    });
  }, []);

  // Largura real do canvas: o gráfico é redesenhado quando o container muda
  // (troca de viewport, abrir/fechar o Expandir).
  const measure = useCallback((el: HTMLDivElement | null) => {
    wrapRef.current = el;
    if (el) setWidth(el.clientWidth || 720);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 720));
    ro.observe(el);
    return () => ro.disconnect();
  }, [viz.expanded]);

  const height = viz.expanded ? 400 : 300;

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.max(280, width);
    const H = height;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cv.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const padL = 72, padR = 16, padT = 26, padB = 34;
    const gw = W - padL - padR;
    const gh = H - padT - padB;
    const mono = '11px ui-monospace, SFMono-Regular, Menlo, monospace';

    // Teto do eixo Y. Na linear, o maior valor visível; na log, a maior ordem
    // de grandeza arredondada para um número redondo de décadas por linha,
    // para os rótulos saírem sempre como potências inteiras de 10.
    const logTop = Math.max(1, ...visible.map((f) => f.log10(nMax)));
    const logStep = Math.max(1, Math.ceil(logTop / 5));
    const yMaxLog = logStep * Math.ceil(logTop / logStep);
    const rawValues = visible.map((f) => f.val(nMax)).filter((v) => isFinite(v));
    const yMax = rawValues.length ? Math.max(10, Math.max(...rawValues)) : 10;

    const px = (n: number) => padL + ((n - 1) / Math.max(1, nMax - 1)) * gw;
    const py = (f: Family, n: number) => {
      if (logScale) {
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
    const lines = logScale ? Math.round(yMaxLog / logStep) : 5;
    for (let i = 0; i <= lines; i++) {
      const y = padT + gh - (i / lines) * gh;
      ctx.beginPath();
      ctx.moveTo(padL, Math.round(y) + 0.5);
      ctx.lineTo(padL + gw, Math.round(y) + 0.5);
      ctx.stroke();
      const label = logScale ? decade(i * logStep) : fmt((i / lines) * yMax);
      ctx.fillText(label, padL - 8, y);
    }

    // Eixo X
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const xTicks = 4;
    for (let i = 0; i <= xTicks; i++) {
      const n = 1 + ((nMax - 1) * i) / xTicks;
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
    ctx.fillText("n (tamanho da entrada) →", padL, padT + gh + 21);
    ctx.fillText(logScale ? "↑ operações (escala logarítmica)" : "↑ operações", padL, 7);

    // Curvas, recortadas na área do gráfico
    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, padT - 1, gw, gh + 2);
    ctx.clip();
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const samples = Math.max(80, Math.round(gw));
    for (const f of visible) {
      ctx.strokeStyle = f.color;
      ctx.beginPath();
      for (let i = 0; i <= samples; i++) {
        const n = 1 + ((nMax - 1) * i) / samples;
        const x = px(n);
        const y = py(f, n);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Marcador: linha vertical + bolinha em cada curva
    const xm = px(nMarker);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(xm) + 0.5, padT);
    ctx.lineTo(Math.round(xm) + 0.5, padT + gh);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const f of visible) {
      const y = py(f, nMarker);
      if (y < padT - 2 || y > padT + gh + 2) continue;
      ctx.fillStyle = f.color;
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
    ctx.strokeRect(padL + 0.5, padT + 0.5, gw - 1, gh - 1);
  }, [visible, nMax, nMarker, logScale, width, height]);

  // Só move com o ponteiro pressionado (o texto embaixo do gráfico pede para
  // arrastar). Seguir o hover redesenharia o canvas a cada mousemove.
  const moveMarker = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const padL = 72, padR = 16;
    const gw = r.width - padL - padR;
    const pct = (e.clientX - r.left - padL) / Math.max(1, gw);
    setMarkerPct(Math.min(1, Math.max(0.001, pct)));
  };

  // O marcador também anda pelo teclado: o canvas é um slider ao longo do eixo
  // n, então setas andam de pouco em pouco, PageUp/PageDown de muito em muito e
  // Home/End vão para as pontas. As setas continuam sendo do canvas mesmo no
  // painel expandido: sem linha do tempo, o hook não sequestra tecla nenhuma.
  const onCanvasKey = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const steps: Record<string, number> = {
      ArrowLeft: -0.02, ArrowRight: 0.02, ArrowDown: -0.02, ArrowUp: 0.02,
      PageDown: -0.1, PageUp: 0.1,
    };
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setMarkerPct(e.key === "Home" ? 0.001 : 1);
      return;
    }
    const d = steps[e.key];
    if (d === undefined) return;
    e.preventDefault();
    setMarkerPct((p) => Math.min(1, Math.max(0.001, p + d)));
  };

  // Capturar o ponteiro mantém o arrasto vivo mesmo com o cursor saindo do
  // canvas. É um extra: se o navegador recusar o id, o arrasto normal segue
  // funcionando, então a falha é engolida de propósito.
  const capture = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* segue sem captura */ }
  };
  const release = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* nada a soltar */ }
  };

  const readings = visible.map((f) => ({
    key: f.key,
    label: f.label,
    color: f.color,
    example: f.example,
    value: f.log10(nMarker) >= 15 ? fmtLog(f.log10(nMarker)) : fmt(f.val(nMarker)),
  }));

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      {/* Sem linha do tempo, o número que resume o estado entra onde ficaria o
          "passo N de M" — com o rótulo junto, que é o que lhe dá contexto. */}
      <VizHeader viz={viz}>
        <span className="viz-step">n = {thousandsDecimal(nMarker)}</span>
      </VizHeader>

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {FAMILIES.map((f) => {
            const on = activeKeys.has(f.key);
            return (
              <button
                type="button"
                key={f.key}
                className={`bigo-chip${on ? " on" : ""}`}
                style={on ? { borderColor: f.color, color: f.color } : undefined}
                onClick={() => toggleFamily(f.key)}
                aria-pressed={on}
              >
                <span className="sw" style={{ background: on ? f.color : "#3a4a60" }} />
                {f.label}
              </button>
            );
          })}
        </div>

        <div className="bigo-canvas-wrap" ref={measure}>
          <canvas
            ref={canvasRef}
            className="bigo-canvas"
            style={{ height }}
            role="slider"
            tabIndex={0}
            aria-label="Marcador do gráfico de crescimento: escolhe o tamanho da entrada lido nas curvas"
            aria-valuemin={1}
            aria-valuemax={nMax}
            aria-valuenow={nMarker}
            aria-valuetext={`n igual a ${thousandsDecimal(nMarker)}, ${readings.map((l) => `${l.value} operações em ${l.label}`).join(", ")}`}
            onKeyDown={onCanvasKey}
            onPointerDown={(e) => { moveMarker(e); capture(e); }}
            onPointerMove={(e) => { if (e.buttons === 1) moveMarker(e); }}
            onPointerUp={release}
            onPointerCancel={release}
          />
        </div>

        <p className="viz-note">
          Com <strong>n = {thousandsDecimal(nMarker)}</strong>, {readings.length === 1 ? "a família marcada faz" : "as famílias marcadas fazem"}{" "}
          {readings.map((l, i) => (
            <span key={l.key}>
              {i > 0 ? (i === readings.length - 1 ? " e " : ", ") : ""}
              <strong style={{ color: l.color }}>{l.value}</strong> operações em {l.label}
            </span>
          ))}
          . Arraste sobre o gráfico, ou use as setas do teclado, para mover o marcador.
        </p>

        <div className="bigo-grid">
          {readings.map((l) => (
            <div className="bigo-card" key={l.key} style={{ borderLeftColor: l.color }}>
              <div className="bigo-card-top">
                <span className="bigo-card-nome" style={{ color: l.color }}>{l.label}</span>
                <span className="bigo-card-val">{l.value}</span>
              </div>
              <div className="bigo-card-ex">{l.example}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. Sem linha do tempo o `VizFooter` não
          desenha reprodução nenhuma, só estes controles. */}
      <VizFooter viz={viz}>
        <div className="viz-field grow">
          <span>Entrada máxima: n até {thousandsDecimal(nMax)}</span>
          <input
            type="range"
            min={0}
            max={INPUT_SIZES.length - 1}
            step={1}
            value={sizeIndex}
            onChange={(e) => setSizeIndex(parseInt(e.target.value, 10))}
            style={{ accentColor: "var(--ccc-accent)", width: "100%" }}
          />
        </div>
        <button type="button" className="viz-btn" onClick={() => setLogScale((v) => !v)}>
          Escala: {logScale ? "logarítmica" : "linear"}
        </button>
        <button
          type="button"
          className="viz-btn"
          onClick={() => {
            setActiveKeys(new Set(DEFAULT_KEYS));
            setSizeIndex(3);
            setMarkerPct(0.62);
            setLogScale(false);
          }}
        >
          ↺ Reiniciar
        </button>
      </VizFooter>
    </figure>
  );

  return viz.inPanel(frame);
}
