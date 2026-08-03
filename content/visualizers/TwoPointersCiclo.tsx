"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// TwoPointersCiclo, o sabor rápido e lento (Floyd) numa lista ligada.
//
// Os outros dois visualizadores de Two Pointers andam sobre células de array.
// Aqui a estrutura tem forma própria (o "rho": uma cauda reta que desemboca num
// laço), então o desenho é um SVG com layout calculado, e não uma fileira de
// células. O gerador de passos continua puro, igual aos demais.
//
// A lista é descrita por dois números: quantos nós vêm antes do ciclo e quantos
// nós formam o ciclo. Com ciclo = 0 a lista termina em None, que é o caso em
// que o algoritmo precisa devolver False.
// ---------------------------------------------------------------------------

type Passo = {
  lento: number | null;
  rapido: number | null;
  linha: number;
  iteracao: number;
  passosLento: number;
  passosRapido: number;
  encontrou?: boolean;
  fim?: boolean;
  nota: string;
};

// As linhas mapeiam 1:1 com o campo `linha` de cada passo.
const CODIGO = [
  "def tem_ciclo(cabeca):",
  "    lento = rapido = cabeca",
  "    while rapido and rapido.prox:",
  "        lento = lento.prox",
  "        rapido = rapido.prox.prox",
  "        if lento is rapido:",
  "            return True",
  "    return False",
];

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

const R_NO = 17; // raio do nó
const GAP = 68; // distância entre nós da cauda

function raioCiclo(ciclo: number): number {
  return Math.max(48, ciclo * 9);
}

// prox(i): índice do próximo nó, ou null quando a lista acaba.
function fazProx(cauda: number, ciclo: number) {
  const total = cauda + ciclo;
  return (i: number | null): number | null => {
    if (i === null) return null;
    if (i < total - 1) return i + 1;
    return ciclo > 0 ? cauda : null;
  };
}

function gerarPassos(cauda: number, ciclo: number): Passo[] {
  const total = cauda + ciclo;
  const prox = fazProx(cauda, ciclo);
  const out: Passo[] = [];
  let lento: number | null = 0;
  let rapido: number | null = 0;
  let iteracao = 0;
  let passosLento = 0;
  let passosRapido = 0;
  const base = () => ({ lento, rapido, iteracao, passosLento, passosRapido });
  out.push({
    ...base(),
    linha: 1,
    nota: `lento e rápido começam os dois na cabeça, o nó 0. A lista tem ${total} ${total === 1 ? "nó" : "nós"}.`,
  });
  let guarda = 0;
  while (guarda++ < 200) {
    if (rapido === null || prox(rapido) === null) {
      out.push({
        ...base(),
        linha: 7,
        fim: true,
        nota:
          rapido === null
            ? `o rápido caiu para fora da lista (None): quem tem ciclo nunca sai dele, então esta lista não tem ciclo.`
            : `o rápido está no nó ${rapido}, que é o último e aponta para None: chegou ao fim, esta lista não tem ciclo.`,
      });
      break;
    }
    iteracao++;
    const lentoAntes = lento as number;
    const rapidoAntes = rapido as number;
    lento = prox(lento);
    passosLento += 1;
    // O rápido dá dois saltos, mas o segundo pode cair no None. Contar sempre
    // 2 inflaria o painel, então só conta salto que aterrissa num nó.
    const meio = prox(rapido) as number;
    rapido = prox(meio);
    passosRapido += rapido === null ? 1 : 2;
    const destinoRapido = rapido === null ? "para fora da lista (None)" : `para o nó ${rapido}`;
    out.push({
      ...base(),
      linha: 4,
      nota: `iteração ${iteracao}: o lento sai do nó ${lentoAntes} e anda 1, chega ao nó ${lento}. O rápido sai do nó ${rapidoAntes} e anda 2, vai ${destinoRapido}.`,
    });
    if (rapido !== null && lento === rapido) {
      out.push({
        ...base(),
        linha: 6,
        encontrou: true,
        fim: true,
        nota: `lento e rápido pararam os dois no nó ${lento}: eles se encontraram, logo a lista tem ciclo. Foram ${iteracao} ${iteracao === 1 ? "iteração" : "iterações"}.`,
      });
      break;
    }
    out.push({
      ...base(),
      linha: 5,
      nota:
        rapido === null
          ? `o lento está no nó ${lento} e o rápido saiu da lista: ainda não se encontraram, volto para o topo do while.`
          : `o lento está no nó ${lento} e o rápido no nó ${rapido}: ainda não se encontraram, volto para o topo do while.`,
    });
  }
  return out;
}

type Preset = { key: string; rotulo: string; cauda: number; ciclo: number };
const PRESETS: Preset[] = [
  { key: "classico", rotulo: "Clássico: 3 antes + ciclo de 5", cauda: 3, ciclo: 5 },
  { key: "sem", rotulo: "Sem ciclo: 6 nós em fila", cauda: 6, ciclo: 0 },
  { key: "puro", rotulo: "Só ciclo: 6 nós em roda", cauda: 0, ciclo: 6 },
  { key: "laco", rotulo: "Laço em si mesmo: 3 + ciclo de 1", cauda: 3, ciclo: 1 },
];

export function TwoPointersCiclo() {
  const [cauda, setCauda] = useState(3);
  const [ciclo, setCiclo] = useState(5);
  const [preset, setPreset] = useState("classico");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  // Uma lista sem nenhum nó não teria o que desenhar nem o que percorrer.
  const nCauda = cauda + ciclo === 0 ? 1 : cauda;
  const total = nCauda + ciclo;

  const passos = useMemo(() => gerarPassos(nCauda, ciclo), [nCauda, ciclo]);
  const qtd = passos.length;
  const idx = Math.min(passo, qtd - 1);
  const p = passos[idx];

  const parar = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  }, []);
  useEffect(() => () => parar(), [parar]);

  useEffect(() => {
    parar();
    if (!tocando) return;
    timer.current = setInterval(() => setPasso((s) => (s >= qtd - 1 ? s : s + 1)), VELOCIDADES[velocidade]);
    return parar;
  }, [tocando, velocidade, qtd, parar]);

  useEffect(() => {
    if (tocando && idx >= qtd - 1) setTocando(false);
  }, [tocando, idx, qtd]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const reiniciar = () => { parar(); setTocando(false); setPasso(0); };
  const aoMudarCauda = (v: number) => { reiniciar(); setPreset(""); setCauda(v); };
  const aoMudarCiclo = (v: number) => { reiniciar(); setPreset(""); setCiclo(v); };
  const aplicarPreset = (pr: Preset) => { reiniciar(); setPreset(pr.key); setCauda(pr.cauda); setCiclo(pr.ciclo); };

  // --- layout do desenho -----------------------------------------------
  // Com ciclo de 1 nó não existe circunferência: o raio vira 0 e o laço é um
  // arco desenhado por cima do próprio nó, então a altura precisa sobrar.
  const Rc = ciclo >= 2 ? raioCiclo(ciclo) : 0;
  const entradaX = 28 + nCauda * GAP; // x do primeiro nó do ciclo
  const cx = entradaX + Rc;
  const alturaSvg = ciclo >= 2 ? 2 * Rc + 92 : ciclo === 1 ? 156 : 128;
  const cy = alturaSvg / 2;
  const ultimoCaudaX = 28 + (nCauda - 1) * GAP;
  const larguraSvg = ciclo >= 2 ? cx + Rc + 34 : ciclo === 1 ? entradaX + 40 : ultimoCaudaX + GAP + 58;

  const pos = (i: number) => {
    if (i < nCauda) return { x: 28 + i * GAP, y: cy, ang: null as number | null };
    const k = i - nCauda;
    const a = Math.PI + (k * 2 * Math.PI) / Math.max(1, ciclo);
    return { x: cx + Rc * Math.cos(a), y: cy + Rc * Math.sin(a), ang: a };
  };

  // Reta encurtada nas duas pontas, para não entrar por baixo dos nós.
  const reta = (ax: number, ay: number, bx: number, by: number) => {
    const dx = bx - ax;
    const dy = by - ay;
    const d = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / d;
    const uy = dy / d;
    return {
      x1: ax + ux * (R_NO + 3),
      y1: ay + uy * (R_NO + 3),
      x2: bx - ux * (R_NO + 10),
      y2: by - uy * (R_NO + 10),
    };
  };

  const retas: { k: string; x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < nCauda; i++) {
    if (i + 1 < total) {
      const a = pos(i);
      const b = pos(i + 1);
      retas.push({ k: `t${i}`, ...reta(a.x, a.y, b.x, b.y) });
    }
  }
  // Sem ciclo, o último nó aponta para o None escrito ao lado dele.
  if (ciclo === 0) {
    const a = pos(total - 1);
    retas.push({ k: "none", x1: a.x + R_NO + 3, y1: cy, x2: ultimoCaudaX + GAP - 22, y2: cy });
  }

  // Arcos do ciclo: seguem a própria circunferência, então nunca se sobrepõem.
  const arcos: string[] = [];
  if (ciclo >= 2) {
    const da = (2 * Math.PI) / ciclo;
    const off = Math.min(da * 0.34, (R_NO + 9) / Rc);
    for (let k = 0; k < ciclo; k++) {
      const a1 = Math.PI + k * da + off;
      const a2 = Math.PI + (k + 1) * da - off;
      const x1 = cx + Rc * Math.cos(a1);
      const y1 = cy + Rc * Math.sin(a1);
      const x2 = cx + Rc * Math.cos(a2);
      const y2 = cy + Rc * Math.sin(a2);
      arcos.push(`M ${x1.toFixed(1)},${y1.toFixed(1)} A ${Rc},${Rc} 0 0,1 ${x2.toFixed(1)},${y2.toFixed(1)}`);
    }
  } else if (ciclo === 1) {
    const a = pos(nCauda);
    arcos.push(
      `M ${(a.x - 9).toFixed(1)},${(a.y - R_NO - 2).toFixed(1)} C ${(a.x - 52).toFixed(1)},${(a.y - R_NO - 62).toFixed(1)} ${(a.x + 52).toFixed(1)},${(a.y - R_NO - 62).toFixed(1)} ${(a.x + 11).toFixed(1)},${(a.y - R_NO - 4).toFixed(1)}`
    );
  }

  const corNo = (i: number) => {
    const eLento = p.lento === i;
    const eRapido = p.rapido === i;
    if (eLento && eRapido) return { fill: "rgba(52,211,153,0.24)", stroke: "#34d399", txt: "#eafff5" };
    if (eLento) return { fill: "rgba(59,130,246,0.22)", stroke: "#3b82f6", txt: "#ffffff" };
    if (eRapido) return { fill: "rgba(245,158,11,0.2)", stroke: "#f59e0b", txt: "#ffffff" };
    return { fill: "#0f1826", stroke: "rgba(255,255,255,0.14)", txt: "#8ba0bb" };
  };

  const marcaNo = (i: number) => {
    const eLento = p.lento === i;
    const eRapido = p.rapido === i;
    if (eLento && eRapido) return { txt: "L R", cor: "#6ee7b7" };
    if (eLento) return { txt: "L", cor: "#93bbfd" };
    if (eRapido) return { txt: "R", cor: "#fcd34d" };
    return null;
  };

  const variaveis = [
    { nome: "lento", valor: p.lento === null ? "None" : `nó ${p.lento}` },
    { nome: "rapido", valor: p.rapido === null ? "None" : `nó ${p.rapido}` },
    { nome: "iteração", valor: `${p.iteracao}` },
    { nome: "ciclo?", valor: p.encontrou ? "sim" : p.fim ? "não" : "?", best: !!p.encontrou },
  ];

  const estatisticas = [
    { k: "n", rot: "nós na lista", val: `${total}` },
    { k: "it", rot: "iterações", val: `${p.iteracao}` },
    { k: "l", rot: "nós que o lento andou", val: `${p.passosLento}` },
    { k: "r", rot: "nós que o rápido andou", val: `${p.passosRapido}` },
  ];

  const notaCls = "viz-note" + (p.encontrou ? " ok" : p.fim ? " invalid" : "");
  const pctPasso = Math.round(((idx + 1) / qtd) * 100);

  const descricao = `Lista com ${total} nós, ${ciclo > 0 ? `com ciclo de ${ciclo} nós` : "sem ciclo"}. Lento em ${p.lento === null ? "None" : `nó ${p.lento}`}, rápido em ${p.rapido === null ? "None" : `nó ${p.rapido}`}.`;

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · rápido e lento: existe ciclo na lista ligada?</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">passo {idx + 1} de {qtd}</span>
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
            <span>Nós antes do ciclo: {nCauda}{cauda + ciclo === 0 ? " (o mínimo)" : ""}</span>
            <input
              type="range" min={0} max={6} step={1} value={cauda}
              onChange={(e) => aoMudarCauda(parseInt(e.target.value, 10))}
              style={{ accentColor: "var(--ccc-accent)", width: "100%" }}
            />
          </label>
          <label className="viz-field grow">
            <span>Nós no ciclo: {ciclo === 0 ? "nenhum, a lista termina em None" : ciclo}</span>
            <input
              type="range" min={0} max={8} step={1} value={ciclo}
              onChange={(e) => aoMudarCiclo(parseInt(e.target.value, 10))}
              style={{ accentColor: "var(--ccc-accent)", width: "100%" }}
            />
          </label>
        </div>

        <div className="tp-canvas-wrap">
          <svg
            className="tp-svg"
            viewBox={`-22 -8 ${Math.round(larguraSvg + 44)} ${Math.round(alturaSvg + 16)}`}
            role="img"
            aria-label={descricao}
          >
            <defs>
              <marker id="tp-seta" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" fill="#4c5f79" />
              </marker>
            </defs>

            {retas.map((s) => (
              <line
                key={s.k} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
                stroke="#3a4a60" strokeWidth={1.6} markerEnd="url(#tp-seta)"
              />
            ))}
            {arcos.map((d, i) => (
              <path key={`a${i}`} d={d} fill="none" stroke="#3a4a60" strokeWidth={1.6} markerEnd="url(#tp-seta)" />
            ))}

            {ciclo === 0 ? (
              <text
                x={ultimoCaudaX + GAP} y={cy} fill="#61748c"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={13}
                textAnchor="middle" dominantBaseline="middle"
              >
                None
              </text>
            ) : null}

            {Array.from({ length: total }, (_, i) => {
              const q = pos(i);
              const c = corNo(i);
              const m = marcaNo(i);
              // Rótulo: para fora da roda nos nós do ciclo, acima nos nós da
              // cauda. Duas exceções, senão ele colide com uma seta: o nó de
              // entrada do ciclo (a seta da cauda chega por ali) fica com o
              // rótulo acima, e o ciclo de um nó só o joga para baixo, porque
              // o laço ocupa a parte de cima.
              const entradaComCauda = i === nCauda && nCauda > 0;
              const radial = q.ang !== null && Rc > 0 && !entradaComCauda;
              let lx = q.x;
              let ly = q.y - R_NO - 12;
              if (radial) {
                lx = cx + (Rc + R_NO + 14) * Math.cos(q.ang as number);
                ly = cy + (Rc + R_NO + 14) * Math.sin(q.ang as number);
              } else if (q.ang !== null && Rc === 0) {
                ly = q.y + R_NO + 14;
              }
              return (
                <g key={i}>
                  <circle cx={q.x} cy={q.y} r={R_NO} fill={c.fill} stroke={c.stroke} strokeWidth={1.8} />
                  <text
                    x={q.x} y={q.y} fill={c.txt}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={13} fontWeight={600}
                    textAnchor="middle" dominantBaseline="central"
                  >
                    {i}
                  </text>
                  {m ? (
                    <text
                      x={lx} y={ly} fill={m.cor}
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={12} fontWeight={700}
                      textAnchor="middle" dominantBaseline="central"
                    >
                      {m.txt}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>

        <p className="tp-legenda">
          <span><i style={{ background: "#3b82f6" }} /> L = lento, anda 1 nó por iteração</span>
          <span><i style={{ background: "#f59e0b" }} /> R = rápido, anda 2 nós por iteração</span>
          <span><i style={{ background: "#34d399" }} /> os dois no mesmo nó: achou o ciclo</span>
        </p>

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">ciclo.py</div>
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
          <button className="viz-btn" title="Reiniciar" onClick={reiniciar}>↺</button>
          <button className="viz-btn" disabled={idx === 0} onClick={() => { parar(); setTocando(false); setPasso(Math.max(0, idx - 1)); }}>‹ Anterior</button>
          <button className="viz-play" onClick={() => { if (tocando) { setTocando(false); return; } setPasso(idx >= qtd - 1 ? 0 : idx); setTocando(true); }}>
            {tocando ? "❚❚ Pausar" : "▶ Rodar"}
          </button>
          <button className="viz-btn" disabled={idx === qtd - 1} onClick={() => { parar(); setTocando(false); setPasso(Math.min(idx + 1, qtd - 1)); }}>Próximo ›</button>
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
