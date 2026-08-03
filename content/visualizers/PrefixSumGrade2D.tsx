"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// PrefixSumGrade2D, a soma de um retângulo em quatro leituras.
//
// Padrão passo a passo (gerador PURO de passos + a mesma casca), mas o dado
// não é uma fita de células e sim duas grades: a matriz e a tabela de
// prefixos, esta com uma linha e uma coluna sentinela.
//
// A ideia que o passo a passo precisa entregar é a inclusão e exclusão: cada
// p[r][c] é o retângulo que vai da origem até ali, então a soma de um
// retângulo qualquer é um retângulo grande menos duas faixas mais o canto que
// foi descontado duas vezes. Por isso cada passo pinta NA MATRIZ o retângulo
// que aquele termo representa, em vez de só acender um número na tabela.
// ---------------------------------------------------------------------------

type Regiao = { r1: number; c1: number; r2: number; c2: number };

type Passo = {
  linha: number;
  regiao: Regiao | null;
  tipo: "alvo" | "mais" | "menos";
  lerP: { r: number; c: number } | null;
  sinais: Record<string, "mais" | "menos">;
  acumulado: number | null;
  ops: number;
  nota: string;
  ok?: boolean;
};

// As linhas mapeiam 1:1 com os passos (campo `linha` em gerarPassos), então a
// ordem e a quantidade de linhas não podem mudar.
const CODIGO = [
  "def construir(m):",
  "    linhas, colunas = len(m), len(m[0])",
  "    p = [[0] * (colunas + 1)",
  "         for _ in range(linhas + 1)]",
  "    for r in range(linhas):",
  "        for c in range(colunas):",
  "            p[r+1][c+1] = (m[r][c] + p[r][c+1]",
  "                           + p[r+1][c] - p[r][c])",
  "    return p",
  "",
  "def soma(p, r1, c1, r2, c2):",
  "    return (p[r2+1][c2+1] - p[r1][c2+1]",
  "            - p[r2+1][c1] + p[r1][c1])",
];

const VELOCIDADES = [0, 1600, 1100, 750, 500, 300];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

// A matriz do LeetCode 304, que é a referência mais fácil de conferir: a
// consulta (2, 1) até (4, 3) tem que dar 8.
const MATRIZ_PADRAO = [
  [3, 0, 1, 4, 2],
  [5, 6, 3, 2, 1],
  [1, 2, 0, 1, 5],
  [4, 1, 0, 1, 7],
  [1, 0, 3, 0, 5],
];

type Preset = { rotulo: string; sel: Regiao };

const PRESETS: Preset[] = [
  { rotulo: "LeetCode 304", sel: { r1: 2, c1: 1, r2: 4, c2: 3 } },
  { rotulo: "Uma linha", sel: { r1: 1, c1: 0, r2: 1, c2: 4 } },
  { rotulo: "Uma coluna", sel: { r1: 0, c1: 2, r2: 4, c2: 2 } },
  { rotulo: "Encostado na origem", sel: { r1: 0, c1: 0, r2: 1, c2: 2 } },
  { rotulo: "Uma célula", sel: { r1: 3, c1: 3, r2: 3, c2: 3 } },
  { rotulo: "A matriz toda", sel: { r1: 0, c1: 0, r2: 4, c2: 4 } },
];

// Matriz aleatória do tamanho pedido. Só sai de handler de clique, nunca do
// caminho de render, para não divergir entre servidor e cliente na hidratação.
function matrizAleatoria(linhas: number, colunas: number): number[][] {
  return Array.from({ length: linhas }, () =>
    Array.from({ length: colunas }, () => Math.floor(Math.random() * 10))
  );
}

function construir(m: number[][]): number[][] {
  const linhas = m.length;
  const colunas = m[0].length;
  const p: number[][] = Array.from({ length: linhas + 1 }, () => new Array(colunas + 1).fill(0));
  for (let r = 0; r < linhas; r++) {
    for (let c = 0; c < colunas; c++) {
      p[r + 1][c + 1] = m[r][c] + p[r][c + 1] + p[r + 1][c] - p[r][c];
    }
  }
  return p;
}

function chave(r: number, c: number) {
  return `${r},${c}`;
}

function gerarPassos(m: number[][], p: number[][], sel: Regiao): Passo[] {
  const { r1, c1, r2, c2 } = sel;
  const celulas = (r2 - r1 + 1) * (c2 - c1 + 1);
  const grande = p[r2 + 1][c2 + 1];
  const cima = p[r1][c2 + 1];
  const esquerda = p[r2 + 1][c1];
  const canto = p[r1][c1];
  const total = grande - cima - esquerda + canto;

  const sinais: Record<string, "mais" | "menos"> = {};
  const out: Passo[] = [];

  out.push({
    linha: 10,
    regiao: sel,
    tipo: "alvo",
    lerP: null,
    sinais: { ...sinais },
    acumulado: null,
    ops: 0,
    nota: `Quero a soma do retângulo que vai de (${r1}, ${c1}) até (${r2}, ${c2}): são ${celulas} ${celulas === 1 ? "célula" : "células"}. Na força bruta eu somaria uma por uma.`,
  });

  sinais[chave(r2 + 1, c2 + 1)] = "mais";
  out.push({
    linha: 11,
    regiao: { r1: 0, c1: 0, r2, c2 },
    tipo: "mais",
    lerP: { r: r2 + 1, c: c2 + 1 },
    sinais: { ...sinais },
    acumulado: grande,
    ops: 1,
    nota: `Somo p[${r2 + 1}][${c2 + 1}] = ${grande}, que é o retângulo inteiro da origem até (${r2}, ${c2}). Peguei demais de propósito, agora é só devolver o que sobrou.`,
  });

  sinais[chave(r1, c2 + 1)] = "menos";
  out.push({
    linha: 11,
    regiao: r1 > 0 ? { r1: 0, c1: 0, r2: r1 - 1, c2 } : null,
    tipo: "menos",
    lerP: { r: r1, c: c2 + 1 },
    sinais: { ...sinais },
    acumulado: grande - cima,
    ops: 2,
    nota:
      r1 > 0
        ? `Tiro p[${r1}][${c2 + 1}] = ${cima}, a faixa que fica acima da linha ${r1}. Restaram ${grande - cima}.`
        : `Tiro p[0][${c2 + 1}] = 0: o retângulo já começa na linha 0, então não existe faixa de cima. É a linha sentinela evitando um if.`,
  });

  sinais[chave(r2 + 1, c1)] = "menos";
  out.push({
    linha: 12,
    regiao: c1 > 0 ? { r1: 0, c1: 0, r2, c2: c1 - 1 } : null,
    tipo: "menos",
    lerP: { r: r2 + 1, c: c1 },
    sinais: { ...sinais },
    acumulado: grande - cima - esquerda,
    ops: 3,
    nota:
      c1 > 0
        ? `Tiro p[${r2 + 1}][${c1}] = ${esquerda}, a faixa que fica à esquerda da coluna ${c1}. Restaram ${grande - cima - esquerda}.`
        : `Tiro p[${r2 + 1}][0] = 0: o retângulo já começa na coluna 0, então não existe faixa à esquerda. É a coluna sentinela evitando outro if.`,
  });

  sinais[chave(r1, c1)] = "mais";
  out.push({
    linha: 12,
    regiao: r1 > 0 && c1 > 0 ? { r1: 0, c1: 0, r2: r1 - 1, c2: c1 - 1 } : null,
    tipo: "mais",
    lerP: { r: r1, c: c1 },
    sinais: { ...sinais },
    acumulado: total,
    ops: 4,
    nota:
      r1 > 0 && c1 > 0
        ? `As duas faixas se sobrepõem neste canto, então ele saiu duas vezes. Devolvo p[${r1}][${c1}] = ${canto} uma vez.`
        : `Aqui p[${r1}][${c1}] = 0: como o retângulo encosta na borda, as faixas não se sobrepõem e não há canto para devolver.`,
  });

  out.push({
    linha: 11,
    regiao: sel,
    tipo: "alvo",
    lerP: null,
    sinais: { ...sinais },
    acumulado: total,
    ops: 4,
    ok: true,
    nota: `${grande} - ${cima} - ${esquerda} + ${canto} = ${total}. Quatro leituras contra as ${celulas} somas da força bruta, e esse 4 não muda nem se o retângulo cobrir a matriz inteira.`,
  });

  return out;
}

// Formatação determinística (nada de Intl, para o HTML do servidor e do
// cliente baterem exatamente na hidratação).
function num(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function dentro(reg: Regiao | null, r: number, c: number) {
  return !!reg && r >= reg.r1 && r <= reg.r2 && c >= reg.c1 && c <= reg.c2;
}

export function PrefixSumGrade2D() {
  const [matriz, setMatriz] = useState<number[][]>(MATRIZ_PADRAO);
  const [selBruta, setSel] = useState<Regiao>({ r1: 2, c1: 1, r2: 4, c2: 3 });
  const [ancora, setAncora] = useState<{ r: number; c: number } | null>(null);
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const linhas = matriz.length;
  const colunas = matriz[0].length;
  // A seleção é presa ao tamanho da matriz aqui, e não em quem chama setSel:
  // trocar para uma matriz menor com um retângulo grande selecionado leria
  // fora da tabela de prefixos e derrubaria o componente.
  const sel = useMemo<Regiao>(
    () => ({
      r1: Math.min(Math.max(selBruta.r1, 0), linhas - 1),
      c1: Math.min(Math.max(selBruta.c1, 0), colunas - 1),
      r2: Math.min(Math.max(selBruta.r2, 0), linhas - 1),
      c2: Math.min(Math.max(selBruta.c2, 0), colunas - 1),
    }),
    [selBruta, linhas, colunas]
  );
  const p = useMemo(() => construir(matriz), [matriz]);
  const passos = useMemo(() => gerarPassos(matriz, p, sel), [matriz, p, sel]);
  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const s = passos[idx];

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

  // Primeiro clique fixa um canto, o segundo fecha o retângulo. O terceiro
  // começa de novo, então dá para explorar sem nenhum botão de modo.
  const clicar = (r: number, c: number) => {
    reiniciar();
    if (!ancora) {
      setAncora({ r, c });
      setSel({ r1: r, c1: c, r2: r, c2: c });
      return;
    }
    setSel({
      r1: Math.min(ancora.r, r),
      c1: Math.min(ancora.c, c),
      r2: Math.max(ancora.r, r),
      c2: Math.max(ancora.c, c),
    });
    setAncora(null);
  };

  // O preset devolve o cenário inteiro, matriz incluída: os números citados no
  // artigo (o 8 do LeetCode 304, as 25 células da matriz toda) só fecham sobre
  // a matriz padrão, e o aluno pode ter sorteado outra antes de clicar.
  const aplicarPreset = (pr: Preset) => {
    reiniciar();
    setAncora(null);
    setMatriz(MATRIZ_PADRAO);
    setSel(pr.sel);
  };

  const sortear = () => {
    reiniciar();
    setAncora(null);
    setMatriz(matrizAleatoria(linhas, colunas));
  };

  // Trocar o tamanho é o argumento central da seção: a força bruta sobe com a
  // área do retângulo, as leituras na tabela continuam sendo 4.
  const trocarTamanho = () => {
    reiniciar();
    setAncora(null);
    if (linhas === 5) {
      setMatriz(matrizAleatoria(8, 8));
      setSel({ r1: 1, c1: 2, r2: 6, c2: 6 });
    } else {
      setMatriz(MATRIZ_PADRAO);
      setSel({ r1: 2, c1: 1, r2: 4, c2: 3 });
    }
  };

  const celulas = (sel.r2 - sel.r1 + 1) * (sel.c2 - sel.c1 + 1);
  const alvo: Regiao = sel;

  const variaveis = [
    { nome: "r1, c1", valor: `${sel.r1}, ${sel.c1}` },
    { nome: "r2, c2", valor: `${sel.r2}, ${sel.c2}` },
    { nome: "leituras", valor: `${s.ops}` },
    { nome: "soma", valor: s.acumulado == null ? "-" : `${s.acumulado}`, best: true },
  ];

  const notaCls = "viz-note" + (s.ok ? " ok" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · soma de um retângulo em 4 leituras</span>
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
          <button className="bigo-chip" onClick={sortear}>Sortear valores</button>
          <button className="bigo-chip" onClick={trocarTamanho}>
            {linhas === 5 ? "Aumentar para 8 × 8" : "Voltar para 5 × 5"}
          </button>
        </div>

        <div className="ps-2d">
          <div className="ps-2d-col">
            <div className="ps-2d-titulo">
              matriz · clique em duas células para escolher o retângulo
            </div>
            <div className="ps-grade-scroll">
              <div className="ps-grade" style={{ gridTemplateColumns: `repeat(${colunas + 1}, auto)` }}>
                <div className="ps-rot" />
                {Array.from({ length: colunas }, (_, c) => (
                  <div className="ps-rot" key={`hc-${c}`}>{c}</div>
                ))}
                {matriz.map((linha, r) => (
                  <div key={`lin-${r}`} style={{ display: "contents" }}>
                    <div className="ps-rot">{r}</div>
                    {linha.map((v, c) => {
                      let cls = "ps-cell";
                      if (dentro(alvo, r, c)) cls += " alvo";
                      if (dentro(s.regiao, r, c)) {
                        cls += s.tipo === "alvo" ? " foco" : s.tipo === "mais" ? " mais" : " menos";
                      }
                      if (ancora && ancora.r === r && ancora.c === c) cls += " ancora";
                      return (
                        <button
                          key={`m-${r}-${c}`}
                          className={cls}
                          onClick={() => clicar(r, c)}
                          aria-pressed={dentro(alvo, r, c)}
                          aria-label={`Linha ${r}, coluna ${c}, valor ${v}`}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="ps-2d-col">
            <div className="ps-2d-titulo">
              p · tabela de prefixos, com linha e coluna sentinela
            </div>
            <div className="ps-grade-scroll">
              <div className="ps-grade" style={{ gridTemplateColumns: `repeat(${colunas + 2}, auto)` }}>
                <div className="ps-rot" />
                {Array.from({ length: colunas + 1 }, (_, c) => (
                  <div className="ps-rot" key={`ph-${c}`}>{c}</div>
                ))}
                {p.map((linha, r) => (
                  <div key={`plin-${r}`} style={{ display: "contents" }}>
                    <div className="ps-rot">{r}</div>
                    {linha.map((v, c) => {
                      const sinal = s.sinais[chave(r, c)];
                      const emFoco = !!s.lerP && s.lerP.r === r && s.lerP.c === c;
                      let cls = "ps-cell est";
                      if (sinal === "mais") cls += " mais";
                      else if (sinal === "menos") cls += " menos";
                      else if (r === 0 || c === 0) cls += " eixo";
                      if (emFoco) cls += " atual";
                      return <div key={`p-${r}-${c}`} className={cls}>{v}</div>;
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>células no retângulo</span>
            <strong style={{ color: "#fbbf24" }}>{num(celulas)}</strong>
          </div>
          <div className="bigo-stat">
            <span>leituras na tabela</span>
            <strong style={{ color: "var(--ccc-green)" }}>{num(s.ops)}</strong>
          </div>
          <div className="bigo-stat">
            <span>pré-processamento ({linhas} × {colunas})</span>
            <strong>{num(linhas * colunas)}</strong>
          </div>
          <div className="bigo-stat">
            <span>soma do retângulo</span>
            <strong>{s.acumulado == null ? "-" : num(s.acumulado)}</strong>
          </div>
        </div>

        <p className={notaCls}>{s.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">prefixo_2d.py</div>
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
