"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// PrefixSumTradeoff, o ponto de virada do pré-processamento.
//
// Foge do padrão "gerador puro de passos" (como o BigOChartVisualizer) porque
// aqui não existe algoritmo caminhando: o que se aprende é uma RELAÇÃO. Duas
// retas no mesmo eixo, em função do número de consultas q:
//
//   força bruta ....... q * m          (nada de entrada, caro por consulta)
//   com prefixo ....... n + q          (caro na entrada, 1 op por consulta)
//
// Elas se cruzam em q = n / (m - 1). Antes do cruzamento, montar a tabela é
// desperdício; depois, é a diferença entre milhões de operações e milhares.
//
// É o canto fora do padrão da casca, nas DUAS pontas da tabela §6 do contrato:
//
//   · `collapsible: false` — não há bloco dispensável. O gráfico é canvas e é o
//     conteúdo; não se inventa um bloco só para ganhar o botão. (E `measureOn`
//     seria inerte aqui, então nem é passado.)
//   · `total: 1` — não há linha do tempo. O eixo q é um slider contínuo, não
//     uma sequência de passos.
//
// Com `total: 1` o `VizFooter` não desenha passo, atalhos nem barra de
// progresso — só os `children`. É o que os dois sliders e o Reiniciar pedem:
// eles são os controles desta peça, e ficam no `.viz-foot` (irmão do
// `.viz-body`) para não subirem junto com o miolo no painel expandido.
// ---------------------------------------------------------------------------

const ARRAYS = [10, 50, 100, 500, 1000, 5000, 10000, 100000];
const SLICES = [0.01, 0.05, 0.1, 0.25, 0.5, 1];
const SLICE_LABELS = ["1% de n", "5% de n", "10% de n", "25% de n", "50% de n", "n inteiro"];

const BRUTE_COLOR = "#fbbf24";
const PREFIX_COLOR = "#34d399";

// Formatação determinística (nada de Intl, para o HTML do servidor e do
// cliente baterem exatamente na hidratação). Um separador de milhar só, o
// mesmo em todo o eixo: misturar "10 mil" com "8.000" pareceria bug.
function num(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// A razão entre as duas curvas é o único número que costuma cair no meio do
// caminho (4,5 não é 5), então ela ganha uma casa decimal enquanto for pequena.
function ratioText(v: number): string {
  if (v >= 10) return num(v);
  const d = Math.round(v * 10);
  return `${Math.floor(d / 10)},${d % 10}`;
}

// Arredonda para cima até o próximo 1, 2, 5 ou 10 vezes uma potência de 10,
// para os eixos caírem sempre em números redondos.
function nice(v: number): number {
  if (v <= 10) return 10;
  const k = Math.pow(10, Math.floor(Math.log10(v)));
  for (const f of [1, 2, 5, 10]) if (f * k >= v) return f * k;
  return 10 * k;
}

export function PrefixSumTradeoff() {
  const [arrayIndex, setArrayIndex] = useState(4); // n = 1.000
  const [sliceIndex, setSliceIndex] = useState(1); // m = 5% de n
  const [rawQ, setRawQ] = useState(21);
  const [width, setWidth] = useState(720);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const viz = useVisualizer({
    title: "Visualizador · quando o pré-processamento se paga",
    total: 1,
    collapsible: false,
  });

  const n = ARRAYS[arrayIndex];
  const m = Math.max(2, Math.min(n, Math.round(n * SLICES[sliceIndex])));
  // Menor q inteiro em que n + q fica estritamente menor que q * m.
  const turningPoint = Math.floor(n / (m - 1)) + 1;
  const qMax = Math.max(10, nice(turningPoint * 3));
  const q = Math.min(Math.max(rawQ, 0), qMax);

  const bruteCost = q * m;
  const prefixCost = n + q;
  const yMax = nice(qMax * m);

  const measure = useCallback((el: HTMLDivElement | null) => {
    wrapRef.current = el;
    if (el) setWidth(el.clientWidth || 720);
  }, []);

  // O gráfico é redesenhado quando o container muda de tamanho (viewport ou
  // abrir/fechar o Expandir, que remonta a árvore pelo portal).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 720));
    ro.observe(el);
    return () => ro.disconnect();
  }, [viz.expanded]);

  const height = viz.expanded ? 380 : 290;
  const padL = 78;
  const padR = 16;

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

    const padT = 26;
    const padB = 34;
    const gw = W - padL - padR;
    const gh = H - padT - padB;
    const mono = '11px ui-monospace, SFMono-Regular, Menlo, monospace';

    const px = (v: number) => padL + (v / qMax) * gw;
    const py = (v: number) => padT + gh - Math.min(1.05, v / yMax) * gh;

    // Grade e eixo Y
    ctx.font = mono;
    ctx.lineWidth = 1;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let k = 0; k <= 5; k++) {
      const y = padT + gh - (k / 5) * gh;
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.moveTo(padL, Math.round(y) + 0.5);
      ctx.lineTo(padL + gw, Math.round(y) + 0.5);
      ctx.stroke();
      ctx.fillStyle = "#61748c";
      ctx.fillText(num((k / 5) * yMax), padL - 8, y);
    }

    // Eixo X
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let k = 0; k <= 5; k++) {
      const v = (qMax * k) / 5;
      const x = px(v);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, padT);
      ctx.lineTo(Math.round(x) + 0.5, padT + gh);
      ctx.stroke();
      ctx.fillStyle = "#61748c";
      ctx.fillText(num(v), x, padT + gh + 8);
    }

    ctx.textAlign = "left";
    ctx.fillStyle = "#4c5f79";
    ctx.fillText("q (número de consultas) →", padL, padT + gh + 21);
    ctx.fillText("↑ operações no total", padL, 7);

    // Retas, recortadas na área do gráfico
    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, padT - 1, gw, gh + 2);
    ctx.clip();
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.strokeStyle = BRUTE_COLOR;
    ctx.beginPath();
    ctx.moveTo(px(0), py(0));
    ctx.lineTo(px(qMax), py(qMax * m));
    ctx.stroke();

    ctx.strokeStyle = PREFIX_COLOR;
    ctx.beginPath();
    ctx.moveTo(px(0), py(n));
    ctx.lineTo(px(qMax), py(n + qMax));
    ctx.stroke();

    // Ponto de virada: onde as duas retas se cruzam
    const xv = px(n / (m - 1));
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = "rgba(255,255,255,0.34)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(xv) + 0.5, padT);
    ctx.lineTo(Math.round(xv) + 0.5, padT + gh);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#93a9c2";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("virada", Math.min(xv + 5, padL + gw - 44), padT + 4);

    // Marcador do q escolhido
    const xm = px(q);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.moveTo(Math.round(xm) + 0.5, padT);
    ctx.lineTo(Math.round(xm) + 0.5, padT + gh);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const [value, color] of [[bruteCost, BRUTE_COLOR], [prefixCost, PREFIX_COLOR]] as const) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(xm, py(value), 4, 0, Math.PI * 2);
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
  }, [width, height, n, m, q, qMax, yMax, bruteCost, prefixCost, padL, padR]);

  // Só move com o ponteiro pressionado: seguir o hover redesenharia o canvas a
  // cada mousemove.
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const gw = r.width - padL - padR;
    const pct = (e.clientX - r.left - padL) / Math.max(1, gw);
    setRawQ(Math.round(Math.min(1, Math.max(0, pct)) * qMax));
  };

  // O canvas é um slider ao longo do eixo q: setas andam de pouco em pouco,
  // PageUp/PageDown de muito em muito e Home/End vão para as pontas. O hook não
  // disputa essas teclas porque este visualizador não tem linha do tempo.
  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const fine = Math.max(1, Math.round(qMax / 50));
    const coarse = Math.max(1, Math.round(qMax / 10));
    const deltas: Record<string, number> = {
      ArrowLeft: -fine, ArrowRight: fine, ArrowDown: -fine, ArrowUp: fine,
      PageDown: -coarse, PageUp: coarse,
    };
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setRawQ(e.key === "Home" ? 0 : qMax);
      return;
    }
    const d = deltas[e.key];
    if (d === undefined) return;
    e.preventDefault();
    setRawQ((v) => Math.min(qMax, Math.max(0, v + d)));
  };

  // Capturar o ponteiro mantém o arrasto vivo com o cursor fora do canvas. É
  // um extra: se o navegador recusar o id, o arrasto normal segue funcionando.
  const capture = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* segue sem captura */ }
  };
  const release = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* nada a soltar */ }
  };

  const winner = prefixCost < bruteCost ? "prefixo" : prefixCost > bruteCost ? "bruta" : "empate";
  const ratio = prefixCost > 0 ? bruteCost / prefixCost : 0;

  const reading = useMemo(() => {
    if (winner === "empate") return `Com ${num(q)} consultas as duas abordagens custam o mesmo: ${num(bruteCost)} operações. Este é o ponto de virada.`;
    if (winner === "bruta") return `Com só ${num(q)} ${q === 1 ? "consulta" : "consultas"}, a força bruta ainda ganha: ${num(bruteCost)} operações contra ${num(prefixCost)} do prefixo. Montar a tabela custou mais do que ela economizou.`;
    if (ratio < 2) return `Com ${num(q)} consultas, o prefixo faz ${num(prefixCost)} operações contra ${num(bruteCost)} da força bruta. O pré-processamento acabou de se pagar, e a distância só cresce daqui para frente.`;
    return `Com ${num(q)} consultas, o prefixo faz ${num(prefixCost)} operações contra ${num(bruteCost)} da força bruta, ${ratioText(ratio)} vezes menos. O pré-processamento já se pagou com folga.`;
  }, [winner, q, bruteCost, prefixCost, ratio]);

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} color={PREFIX_COLOR}>
        <span className="viz-step">q = {num(q)}</span>
      </VizHeader>

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          <button className="bigo-chip" onClick={() => setRawQ(1)}>
            <span className="sw" style={{ background: BRUTE_COLOR }} />
            Uma consulta só
          </button>
          <button className="bigo-chip" onClick={() => setRawQ(turningPoint)}>
            <span className="sw" style={{ background: "#93a9c2" }} />
            No ponto de virada
          </button>
          <button className="bigo-chip" onClick={() => setRawQ(qMax)}>
            <span className="sw" style={{ background: PREFIX_COLOR }} />
            Muitas consultas
          </button>
        </div>

        <div className="bigo-canvas-wrap" ref={measure}>
          <canvas
            ref={canvasRef}
            className="bigo-canvas"
            style={{ height }}
            role="slider"
            tabIndex={0}
            aria-label="Número de consultas comparado entre força bruta e tabela de prefixos"
            aria-valuemin={0}
            aria-valuemax={qMax}
            aria-valuenow={q}
            aria-valuetext={`${num(q)} consultas: força bruta ${num(bruteCost)} operações, com prefixo ${num(prefixCost)} operações. Ponto de virada em ${num(turningPoint)} consultas.`}
            onKeyDown={onKeyDown}
            onPointerDown={(e) => { onMove(e); capture(e); }}
            onPointerMove={(e) => { if (e.buttons === 1) onMove(e); }}
            onPointerUp={release}
            onPointerCancel={release}
          />
        </div>

        <p className={`viz-note${winner === "prefixo" ? " ok" : winner === "bruta" ? " invalid" : ""}`}>
          {reading} Arraste sobre o gráfico, ou use as setas do teclado, para mover o marcador.
        </p>

        <div className="bigo-grid">
          <div className="bigo-card" style={{ borderLeftColor: BRUTE_COLOR }}>
            <div className="bigo-card-top">
              <span className="bigo-card-nome" style={{ color: BRUTE_COLOR }}>força bruta</span>
              <span className="bigo-card-val">{num(bruteCost)}</span>
            </div>
            <div className="bigo-card-ex">q × m = {num(q)} × {num(m)}</div>
          </div>
          <div className="bigo-card" style={{ borderLeftColor: PREFIX_COLOR }}>
            <div className="bigo-card-top">
              <span className="bigo-card-nome" style={{ color: PREFIX_COLOR }}>com prefixo</span>
              <span className="bigo-card-val">{num(prefixCost)}</span>
            </div>
            <div className="bigo-card-ex">n + q = {num(n)} + {num(q)}</div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>n (tamanho do array)</span>
            <strong>{num(n)}</strong>
          </div>
          <div className="bigo-stat">
            <span>m (tamanho do intervalo)</span>
            <strong>{num(m)}</strong>
          </div>
          <div className="bigo-stat">
            <span>ponto de virada</span>
            <strong>{num(turningPoint)}</strong>
          </div>
          <div className="bigo-stat">
            <span>memória extra</span>
            <strong>{num(n + 1)}</strong>
          </div>
        </div>
      </div>

      {/* Fora do `.viz-body` é o que deixa os dois sliders parados no pé do
          painel expandido — ver o cabeçalho deste arquivo. */}
      <VizFooter viz={viz}>
        <div className="viz-field grow">
          <span>n: array de {num(n)} posições</span>
          <input
            type="range"
            min={0}
            max={ARRAYS.length - 1}
            step={1}
            value={arrayIndex}
            onChange={(e) => setArrayIndex(parseInt(e.target.value, 10))}
            style={{ accentColor: "var(--ccc-accent)", width: "100%" }}
          />
        </div>
        <div className="viz-field grow">
          <span>m: intervalo médio de {SLICE_LABELS[sliceIndex]}</span>
          <input
            type="range"
            min={0}
            max={SLICES.length - 1}
            step={1}
            value={sliceIndex}
            onChange={(e) => setSliceIndex(parseInt(e.target.value, 10))}
            style={{ accentColor: "var(--ccc-accent)", width: "100%" }}
          />
        </div>
        <button className="viz-btn" onClick={() => { setArrayIndex(4); setSliceIndex(1); setRawQ(21); }}>↺ Reiniciar</button>
      </VizFooter>
    </figure>
  );

  return viz.inPanel(frame);
}
