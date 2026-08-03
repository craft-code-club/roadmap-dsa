"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// LinkedListFloyd, o ponteiro rápido e o lento nas DUAS fases do algoritmo.
//
// A página de Two Pointers já mostra a fase 1 (existe ciclo, sim ou não). Aqui
// o assunto é o que veio depois, a parte que o Robert Floyd realmente inventou:
// quando os dois se encontram, devolver um deles para a cabeça e andar de um em
// um faz os dois pararem exatamente no PRIMEIRO nó do ciclo.
//
// De quebra, com o ciclo em zero o mesmo laço resolve outro problema: o lento
// para no meio da lista. É o mesmo código fazendo dois trabalhos, e por isso os
// dois casos moram no mesmo visualizador.
//
// A lista é descrita por dois números: quantos nós vêm antes do ciclo (a cauda)
// e quantos nós formam o ciclo. É a forma de "rho" que os livros desenham.
// ---------------------------------------------------------------------------

type Fase = 1 | 2 | 0;

type Passo = {
  linha: number;
  lento: number | null;
  rapido: number | null;
  fase: Fase;
  iteracao: number;
  passos2: number;
  encontro: number | null;
  resultado: number | null;
  nota: string;
  ok?: boolean;
  fim?: boolean;
};

// As linhas mapeiam 1:1 com o campo `linha` de cada passo.
const CODIGO = [
  "def inicio_do_ciclo(cabeca):",
  "    lento = rapido = cabeca",
  "    while rapido and rapido.prox:",
  "        lento = lento.prox",
  "        rapido = rapido.prox.prox",
  "        if lento is rapido:",
  "            lento = cabeca        # fase 2",
  "            while lento is not rapido:",
  "                lento = lento.prox",
  "                rapido = rapido.prox",
  "            return lento          # início do ciclo",
  "    return None                   # não tem ciclo",
];

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

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
  let fase: Fase = 1;
  let iteracao = 0;
  let passos2 = 0;
  let encontro: number | null = null;
  let resultado: number | null = null;

  const push = (linha: number, nota: string, extra: Partial<Passo> = {}) => {
    out.push({ linha, nota, lento, rapido, fase, iteracao, passos2, encontro, resultado, ...extra });
  };
  const nome = (i: number | null) => (i === null ? "None" : `nó ${i}`);

  push(1, `Fase 1. O lento e o rápido começam os dois na cabeça, o nó 0. A lista tem ${total} ${total === 1 ? "nó" : "nós"}${ciclo > 0 ? `, e ${ciclo} ${ciclo === 1 ? "deles forma" : "deles formam"} o ciclo` : ""}.`);

  let guarda = 0;
  while (guarda++ < 300) {
    if (rapido === null || prox(rapido) === null) {
      resultado = lento;
      const meio = lento;
      const tamanho = `${total} ${total === 1 ? "nó" : "nós"}`;
      const indice = `o índice ${total} // 2 = ${Math.floor(total / 2)}`;
      push(11, rapido === null
        ? `O rápido caiu fora da lista (None). Quem entra num ciclo nunca sai dele, então esta lista não tem ciclo: devolvo None. Agora repare no lento: ele parou no ${nome(meio)}, o meio da lista de ${tamanho} (${indice}). O mesmo laço que procura ciclo acha o meio de graça.`
        : `O rápido está no ${nome(rapido)}, que aponta para None: acabou a lista, não tem ciclo. E o lento parou no ${nome(meio)}, exatamente o meio da lista de ${tamanho} (${indice}).`,
        { fim: true });
      return out;
    }
    iteracao++;
    const deL = lento as number;
    const deR = rapido as number;
    lento = prox(lento);
    push(3, `Iteração ${iteracao}: o lento sai do ${nome(deL)} e anda 1, chega no ${nome(lento)}.`);
    const meio = prox(deR) as number;
    rapido = prox(meio);
    push(4, `O rápido sai do ${nome(deR)} e anda 2, passando pelo ${nome(meio)}: ${rapido === null ? "e cai fora da lista, no None" : `chega no ${nome(rapido)}`}.`);
    if (rapido !== null && lento === rapido) {
      encontro = lento;
      push(5, `Os dois pararam no ${nome(lento)}: eles se encontraram, então a lista TEM ciclo. Foram ${iteracao} ${iteracao === 1 ? "iteração" : "iterações"}. Só que este nó quase nunca é o começo do ciclo, e é aí que entra a fase 2.`, { ok: true });
      break;
    }
    push(5, `Lento no ${nome(lento)}, rápido ${rapido === null ? "fora da lista" : `no ${nome(rapido)}`}: ainda não estão no mesmo nó, volto para o topo do while.`);
  }

  // --- fase 2 ---------------------------------------------------------------
  if (encontro === null) return out; // só chega aqui se a guarda estourar
  fase = 2;
  lento = 0;
  push(6, `Fase 2: devolvo o lento para a cabeça (nó 0) e deixo o rápido parado no ${nome(encontro)}. Daqui para frente os dois andam de 1 em 1, no mesmo ritmo.`);

  let guarda2 = 0;
  while (guarda2++ < 300) {
    if (lento === rapido) break;
    push(7, `Lento no ${nome(lento)}, rápido no ${nome(rapido)}: ainda não é o mesmo nó, continuo.`);
    lento = prox(lento);
    passos2++;
    push(8, `O lento anda 1 e vai para o ${nome(lento)}.`);
    rapido = prox(rapido);
    push(9, `O rápido também anda 1 e vai para o ${nome(rapido)}.`);
  }
  resultado = lento;
  fase = 0;
  push(7, `Lento e rápido estão os dois no ${nome(lento)}: a condição do while é falsa, saio do laço.`);
  push(10, `Devolvo o ${nome(lento)}: é aqui que o ciclo começa. Os dois andaram ${passos2} ${passos2 === 1 ? "passo" : "passos"} na fase 2, que é exatamente o tamanho da cauda (${cauda} ${cauda === 1 ? "nó" : "nós"} antes do ciclo). Não é sorte, é a conta que fecha.`, { ok: true, fim: true });
  return out;
}

// --- geometria da forma de rho ----------------------------------------------
const R_NO = 17;
const GAP = 64;

type Preset = { key: string; rotulo: string; cauda: number; ciclo: number };
const PRESETS: Preset[] = [
  { key: "classico", rotulo: "Clássico: 3 antes + ciclo de 5", cauda: 3, ciclo: 5 },
  { key: "meio6", rotulo: "Sem ciclo: 6 nós (acha o meio)", cauda: 6, ciclo: 0 },
  { key: "meio5", rotulo: "Sem ciclo: 5 nós", cauda: 5, ciclo: 0 },
  { key: "puro", rotulo: "Tudo é ciclo: 6 nós em roda", cauda: 0, ciclo: 6 },
  { key: "laco", rotulo: "Laço em 1 nó: 4 + ciclo de 1", cauda: 4, ciclo: 1 },
];

export function LinkedListFloyd() {
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

  // Uma lista sem nenhum nó não teria o que percorrer nem o que desenhar.
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

  // Com ciclo de 1 nó não existe circunferência: o laço vira um arco por cima
  // do próprio nó, e a altura precisa sobrar para ele.
  const Rc = ciclo >= 2 ? Math.max(48, ciclo * 9) : 0;
  const entradaX = 28 + nCauda * GAP;
  const cx = entradaX + Rc;
  const alturaSvg = ciclo >= 2 ? 2 * Rc + 96 : ciclo === 1 ? 158 : 130;
  const cy = alturaSvg / 2;
  const ultimoCaudaX = 28 + (nCauda - 1) * GAP;
  // Piso na largura: com poucos nós o viewBox ficaria estreito e o desenho
  // seria esticado até virar caricatura dentro do container.
  const larguraSvg = Math.max(460, ciclo >= 2 ? cx + Rc + 36 : ciclo === 1 ? entradaX + 44 : ultimoCaudaX + GAP + 58);

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
    return {
      x1: ax + (dx / d) * (R_NO + 3),
      y1: ay + (dy / d) * (R_NO + 3),
      x2: bx - (dx / d) * (R_NO + 10),
      y2: by - (dy / d) * (R_NO + 10),
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
  if (ciclo === 0) {
    retas.push({ k: "none", x1: ultimoCaudaX + R_NO + 3, y1: cy, x2: ultimoCaudaX + GAP - 24, y2: cy });
  }

  // Arcos do ciclo: seguem a própria circunferência, então nunca se cruzam.
  const arcos: string[] = [];
  if (ciclo >= 2) {
    const da = (2 * Math.PI) / ciclo;
    const off = Math.min(da * 0.34, (R_NO + 9) / Rc);
    for (let k = 0; k < ciclo; k++) {
      const a1 = Math.PI + k * da + off;
      const a2 = Math.PI + (k + 1) * da - off;
      arcos.push(
        `M ${(cx + Rc * Math.cos(a1)).toFixed(1)},${(cy + Rc * Math.sin(a1)).toFixed(1)} A ${Rc},${Rc} 0 0,1 ${(cx + Rc * Math.cos(a2)).toFixed(1)},${(cy + Rc * Math.sin(a2)).toFixed(1)}`
      );
    }
  } else if (ciclo === 1) {
    const a = pos(nCauda);
    arcos.push(
      `M ${(a.x - 9).toFixed(1)},${(a.y - R_NO - 2).toFixed(1)} C ${(a.x - 52).toFixed(1)},${(a.y - R_NO - 62).toFixed(1)} ${(a.x + 52).toFixed(1)},${(a.y - R_NO - 62).toFixed(1)} ${(a.x + 11).toFixed(1)},${(a.y - R_NO - 4).toFixed(1)}`
    );
  }

  const corNo = (i: number) => {
    const eL = p.lento === i;
    const eR = p.rapido === i;
    if (eL && eR) return { fill: "rgba(52,211,153,0.26)", stroke: "#34d399", txt: "#eafff5" };
    if (eL) return { fill: "rgba(59,130,246,0.22)", stroke: "#3b82f6", txt: "#ffffff" };
    if (eR) return { fill: "rgba(245,158,11,0.2)", stroke: "#f59e0b", txt: "#ffffff" };
    if (p.resultado === i && p.fim) return { fill: "rgba(167,139,250,0.18)", stroke: "#a78bfa", txt: "#ede9fe" };
    return { fill: "#0f1826", stroke: "rgba(255,255,255,0.14)", txt: "#8ba0bb" };
  };

  const marcaNo = (i: number) => {
    const eL = p.lento === i;
    const eR = p.rapido === i;
    if (eL && eR) return { txt: "L R", cor: "#6ee7b7" };
    if (eL) return { txt: "L", cor: "#93bbfd" };
    if (eR) return { txt: "R", cor: "#fcd34d" };
    if (p.encontro === i) return { txt: "encontro", cor: "#a78bfa" };
    return null;
  };

  const variaveis = [
    { nome: "lento", valor: p.lento === null ? "None" : `nó ${p.lento}` },
    { nome: "rapido", valor: p.rapido === null ? "None" : `nó ${p.rapido}` },
    { nome: "fase", valor: p.fase === 0 ? "terminou" : `${p.fase}` },
    { nome: "retorno", valor: p.fim ? (ciclo > 0 ? `nó ${p.resultado}` : "None") : "?", best: !!p.fim && ciclo > 0 },
  ];

  const rotuloResultado = ciclo > 0 ? "início do ciclo" : "nó do meio";
  const estatisticas = [
    { k: "n", rot: "nós na lista", val: `${total}` },
    { k: "i1", rot: "iterações da fase 1", val: `${p.iteracao}` },
    { k: "i2", rot: "passos da fase 2", val: `${p.passos2}` },
    { k: "res", rot: rotuloResultado, val: p.fim && p.resultado !== null ? `nó ${p.resultado}` : "…" },
  ];

  const notaCls = "viz-note" + (p.ok ? " ok" : p.fim ? " invalid" : "");
  const pctPasso = Math.round(((idx + 1) / qtd) * 100);
  const descricao = `Lista com ${total} nós, ${ciclo > 0 ? `com um ciclo de ${ciclo} nós que começa no nó ${nCauda}` : "sem ciclo"}. Lento em ${p.lento === null ? "None" : `nó ${p.lento}`}, rápido em ${p.rapido === null ? "None" : `nó ${p.rapido}`}. ${p.nota}`;

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · rápido e lento: o meio, o ciclo e onde ele começa</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">passo {idx + 1} de {qtd}</span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "✕ Fechar" : "⤢ Expandir"}
          </button>
        </div>
      </div>

      <div className="viz-body">
        <div className="ll-grupo">
          <span className="ll-grupo-rot">Casos</span>
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

        <div className="ll-svg-wrap">
          <svg
            className="ll-svg"
            viewBox={`-22 -10 ${Math.round(larguraSvg + 44)} ${Math.round(alturaSvg + 20)}`}
            role="img"
            aria-label={descricao}
          >
            <defs>
              <marker id="llfl-seta" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" fill="#4c5f79" />
              </marker>
            </defs>

            {retas.map((s) => (
              <line key={s.k} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#3a4a60" strokeWidth={1.6} markerEnd="url(#llfl-seta)" />
            ))}
            {arcos.map((d, i) => (
              <path key={`a${i}`} d={d} fill="none" stroke="#3a4a60" strokeWidth={1.6} markerEnd="url(#llfl-seta)" />
            ))}

            {ciclo === 0 ? (
              <text x={ultimoCaudaX + GAP} y={cy} fill="#61748c" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={13} textAnchor="middle" dominantBaseline="middle">
                None
              </text>
            ) : null}

            {Array.from({ length: total }, (_, i) => {
              const q = pos(i);
              const c = corNo(i);
              const m = marcaNo(i);
              // Rótulo para fora da roda nos nós do ciclo e acima nos da cauda.
              // Duas exceções, senão ele bate numa seta: o nó de entrada do
              // ciclo (a seta da cauda chega por ali) fica com o rótulo acima, e
              // o ciclo de um nó só o joga para baixo, porque o laço ocupa o
              // espaço de cima.
              const entradaComCauda = i === nCauda && nCauda > 0;
              const radial = q.ang !== null && Rc > 0 && !entradaComCauda;
              let lx = q.x;
              let ly = q.y - R_NO - 12;
              if (radial) {
                lx = cx + (Rc + R_NO + 15) * Math.cos(q.ang as number);
                ly = cy + (Rc + R_NO + 15) * Math.sin(q.ang as number);
              } else if (q.ang !== null && Rc === 0) {
                ly = q.y + R_NO + 15;
              }
              return (
                <g key={i}>
                  <circle cx={q.x} cy={q.y} r={R_NO} fill={c.fill} stroke={c.stroke} strokeWidth={1.8} />
                  <text x={q.x} y={q.y} fill={c.txt} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={13} fontWeight={600} textAnchor="middle" dominantBaseline="central">
                    {i}
                  </text>
                  {m ? (
                    <text x={lx} y={ly} fill={m.cor} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={11.5} fontWeight={700} textAnchor="middle" dominantBaseline="central">
                      {m.txt}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>

        <p className="ll-legenda">
          <span><i style={{ background: "#3b82f6" }} /> L = lento, 1 nó por vez</span>
          <span><i style={{ background: "#f59e0b" }} /> R = rápido, 2 nós por vez na fase 1</span>
          <span><i style={{ background: "#34d399" }} /> os dois no mesmo nó</span>
          <span><i style={{ background: "#a78bfa" }} /> nó do encontro</span>
        </p>

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">floyd.py</div>
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
