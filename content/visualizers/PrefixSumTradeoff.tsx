"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
// A casca (viz-head, viz-body, controles, Expandir) é a mesma dos demais.
// ---------------------------------------------------------------------------

const ARRAYS = [10, 50, 100, 500, 1000, 5000, 10000, 100000];
const FATIAS = [0.01, 0.05, 0.1, 0.25, 0.5, 1];
const ROTULOS_FATIA = ["1% de n", "5% de n", "10% de n", "25% de n", "50% de n", "n inteiro"];

const COR_BRUTA = "#fbbf24";
const COR_PREFIXO = "#34d399";

// Formatação determinística (nada de Intl, para o HTML do servidor e do
// cliente baterem exatamente na hidratação). Um separador de milhar só, o
// mesmo em todo o eixo: misturar "10 mil" com "8.000" pareceria bug.
function num(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// A razão entre as duas curvas é o único número que costuma cair no meio do
// caminho (4,5 não é 5), então ela ganha uma casa decimal enquanto for pequena.
function razaoTexto(v: number): string {
  if (v >= 10) return num(v);
  const d = Math.round(v * 10);
  return `${Math.floor(d / 10)},${d % 10}`;
}

// Arredonda para cima até o próximo 1, 2, 5 ou 10 vezes uma potência de 10,
// para os eixos caírem sempre em números redondos.
function bonito(v: number): number {
  if (v <= 10) return 10;
  const k = Math.pow(10, Math.floor(Math.log10(v)));
  for (const f of [1, 2, 5, 10]) if (f * k >= v) return f * k;
  return 10 * k;
}

export function PrefixSumTradeoff() {
  const [iArray, setIArray] = useState(4); // n = 1.000
  const [iFatia, setIFatia] = useState(1); // m = 5% de n
  const [qSel, setQSel] = useState(21);
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

  const n = ARRAYS[iArray];
  const m = Math.max(2, Math.min(n, Math.round(n * FATIAS[iFatia])));
  // Menor q inteiro em que n + q fica estritamente menor que q * m.
  const virada = Math.floor(n / (m - 1)) + 1;
  const qMax = Math.max(10, bonito(virada * 3));
  const q = Math.min(Math.max(qSel, 0), qMax);

  const custoBruta = q * m;
  const custoPrefixo = n + q;
  const yMax = bonito(qMax * m);

  const medir = useCallback((el: HTMLDivElement | null) => {
    wrapRef.current = el;
    if (el) setLargura(el.clientWidth || 720);
  }, []);

  // O gráfico é redesenhado quando o container muda de tamanho (viewport ou
  // abrir/fechar o Expandir, que remonta a árvore pelo portal).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setLargura(el.clientWidth || 720));
    ro.observe(el);
    return () => ro.disconnect();
  }, [expanded, mounted]);

  const altura = expanded ? 380 : 290;
  const padE = 78;
  const padD = 16;

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

    const padT = 26;
    const padB = 34;
    const gw = W - padE - padD;
    const gh = H - padT - padB;
    const mono = '11px ui-monospace, SFMono-Regular, Menlo, monospace';

    const px = (v: number) => padE + (v / qMax) * gw;
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
      ctx.moveTo(padE, Math.round(y) + 0.5);
      ctx.lineTo(padE + gw, Math.round(y) + 0.5);
      ctx.stroke();
      ctx.fillStyle = "#61748c";
      ctx.fillText(num((k / 5) * yMax), padE - 8, y);
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
    ctx.fillText("q (número de consultas) →", padE, padT + gh + 21);
    ctx.fillText("↑ operações no total", padE, 7);

    // Retas, recortadas na área do gráfico
    ctx.save();
    ctx.beginPath();
    ctx.rect(padE, padT - 1, gw, gh + 2);
    ctx.clip();
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.strokeStyle = COR_BRUTA;
    ctx.beginPath();
    ctx.moveTo(px(0), py(0));
    ctx.lineTo(px(qMax), py(qMax * m));
    ctx.stroke();

    ctx.strokeStyle = COR_PREFIXO;
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
    ctx.fillText("virada", Math.min(xv + 5, padE + gw - 44), padT + 4);

    // Marcador do q escolhido
    const xm = px(q);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.moveTo(Math.round(xm) + 0.5, padT);
    ctx.lineTo(Math.round(xm) + 0.5, padT + gh);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const [valor, cor] of [[custoBruta, COR_BRUTA], [custoPrefixo, COR_PREFIXO]] as const) {
      ctx.fillStyle = cor;
      ctx.beginPath();
      ctx.arc(xm, py(valor), 4, 0, Math.PI * 2);
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
  }, [largura, altura, n, m, q, qMax, yMax, custoBruta, custoPrefixo, padE, padD]);

  // Só move com o ponteiro pressionado: seguir o hover redesenharia o canvas a
  // cada mousemove.
  const mover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const gw = r.width - padE - padD;
    const pct = (e.clientX - r.left - padE) / Math.max(1, gw);
    setQSel(Math.round(Math.min(1, Math.max(0, pct)) * qMax));
  };

  // O canvas é um slider ao longo do eixo q: setas andam de pouco em pouco,
  // PageUp/PageDown de muito em muito e Home/End vão para as pontas.
  const aoTeclar = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const fino = Math.max(1, Math.round(qMax / 50));
    const grosso = Math.max(1, Math.round(qMax / 10));
    const passos: Record<string, number> = {
      ArrowLeft: -fino, ArrowRight: fino, ArrowDown: -fino, ArrowUp: fino,
      PageDown: -grosso, PageUp: grosso,
    };
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setQSel(e.key === "Home" ? 0 : qMax);
      return;
    }
    const d = passos[e.key];
    if (d === undefined) return;
    e.preventDefault();
    setQSel((v) => Math.min(qMax, Math.max(0, v + d)));
  };

  // Capturar o ponteiro mantém o arrasto vivo com o cursor fora do canvas. É
  // um extra: se o navegador recusar o id, o arrasto normal segue funcionando.
  const capturar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* segue sem captura */ }
  };
  const soltar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* nada a soltar */ }
  };

  const vencedor = custoPrefixo < custoBruta ? "prefixo" : custoPrefixo > custoBruta ? "bruta" : "empate";
  const razao = custoPrefixo > 0 ? custoBruta / custoPrefixo : 0;

  const leitura = useMemo(() => {
    if (vencedor === "empate") return `Com ${num(q)} consultas as duas abordagens custam o mesmo: ${num(custoBruta)} operações. Este é o ponto de virada.`;
    if (vencedor === "bruta") return `Com só ${num(q)} ${q === 1 ? "consulta" : "consultas"}, a força bruta ainda ganha: ${num(custoBruta)} operações contra ${num(custoPrefixo)} do prefixo. Montar a tabela custou mais do que ela economizou.`;
    if (razao < 2) return `Com ${num(q)} consultas, o prefixo faz ${num(custoPrefixo)} operações contra ${num(custoBruta)} da força bruta. O pré-processamento acabou de se pagar, e a distância só cresce daqui para frente.`;
    return `Com ${num(q)} consultas, o prefixo faz ${num(custoPrefixo)} operações contra ${num(custoBruta)} da força bruta, ${razaoTexto(razao)} vezes menos. O pré-processamento já se pagou com folga.`;
  }, [vencedor, q, custoBruta, custoPrefixo, razao]);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" style={{ background: COR_PREFIXO }} />
          <span>Visualizador · quando o pré-processamento se paga</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">q = {num(q)}</span>
          <button className="viz-expand" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "✕ Fechar" : "⤢ Expandir"}
          </button>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          <button className="bigo-chip" onClick={() => setQSel(1)}>
            <span className="sw" style={{ background: COR_BRUTA }} />
            Uma consulta só
          </button>
          <button className="bigo-chip" onClick={() => setQSel(virada)}>
            <span className="sw" style={{ background: "#93a9c2" }} />
            No ponto de virada
          </button>
          <button className="bigo-chip" onClick={() => setQSel(qMax)}>
            <span className="sw" style={{ background: COR_PREFIXO }} />
            Muitas consultas
          </button>
        </div>

        <div className="bigo-canvas-wrap" ref={medir}>
          <canvas
            ref={canvasRef}
            className="bigo-canvas"
            style={{ height: altura }}
            role="slider"
            tabIndex={0}
            aria-label="Número de consultas comparado entre força bruta e tabela de prefixos"
            aria-valuemin={0}
            aria-valuemax={qMax}
            aria-valuenow={q}
            aria-valuetext={`${num(q)} consultas: força bruta ${num(custoBruta)} operações, com prefixo ${num(custoPrefixo)} operações. Ponto de virada em ${num(virada)} consultas.`}
            onKeyDown={aoTeclar}
            onPointerDown={(e) => { mover(e); capturar(e); }}
            onPointerMove={(e) => { if (e.buttons === 1) mover(e); }}
            onPointerUp={soltar}
            onPointerCancel={soltar}
          />
        </div>

        <p className={`viz-note${vencedor === "prefixo" ? " ok" : vencedor === "bruta" ? " invalid" : ""}`}>
          {leitura} Arraste sobre o gráfico, ou use as setas do teclado, para mover o marcador.
        </p>

        <div className="bigo-grid">
          <div className="bigo-card" style={{ borderLeftColor: COR_BRUTA }}>
            <div className="bigo-card-top">
              <span className="bigo-card-nome" style={{ color: COR_BRUTA }}>força bruta</span>
              <span className="bigo-card-val">{num(custoBruta)}</span>
            </div>
            <div className="bigo-card-ex">q × m = {num(q)} × {num(m)}</div>
          </div>
          <div className="bigo-card" style={{ borderLeftColor: COR_PREFIXO }}>
            <div className="bigo-card-top">
              <span className="bigo-card-nome" style={{ color: COR_PREFIXO }}>com prefixo</span>
              <span className="bigo-card-val">{num(custoPrefixo)}</span>
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
            <strong>{num(virada)}</strong>
          </div>
          <div className="bigo-stat">
            <span>memória extra</span>
            <strong>{num(n + 1)}</strong>
          </div>
        </div>

        <div className="viz-controls">
          <div className="viz-field grow">
            <span>n: array de {num(n)} posições</span>
            <input
              type="range"
              min={0}
              max={ARRAYS.length - 1}
              step={1}
              value={iArray}
              onChange={(e) => setIArray(parseInt(e.target.value, 10))}
              style={{ accentColor: "var(--ccc-accent)", width: "100%" }}
            />
          </div>
          <div className="viz-field grow">
            <span>m: intervalo médio de {ROTULOS_FATIA[iFatia]}</span>
            <input
              type="range"
              min={0}
              max={FATIAS.length - 1}
              step={1}
              value={iFatia}
              onChange={(e) => setIFatia(parseInt(e.target.value, 10))}
              style={{ accentColor: "var(--ccc-accent)", width: "100%" }}
            />
          </div>
          <button className="viz-btn" onClick={() => { setIArray(4); setIFatia(1); setQSel(21); }}>↺ Reiniciar</button>
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
