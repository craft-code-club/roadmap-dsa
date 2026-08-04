"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// BacktrackingSudoku, o mesmo template num problema que ninguém chama de
// algoritmo.
//
// A única coisa que o aluno precisa enxergar é que este é EXATAMENTE o mesmo
// algoritmo do visualizador anterior, com três peças trocadas: as opções são os
// dígitos, a validade é a regra do sudoku, e o desfazer é apagar a célula. É
// por isso que o painel de código mostra o template com as três peças marcadas
// em vez de um solucionador de sudoku sob medida.
//
// A segunda ideia é o custo. O aluno vê o algoritmo escrever, apagar e
// reescrever a mesma célula várias vezes, e vê o contador de tentativas subir
// muito mais rápido que o de células preenchidas. Essa razão é o argumento
// inteiro sobre por que backtracking puro não escala.
//
// Presets em escada de propósito. O 4x4 fecha em 60 passos e dá para acompanhar
// cada decisão; os dois 9x9 são o tabuleiro que a pessoa reconhece, e neles o
// interessante não é seguir clique a clique, é rodar até o fim e olhar a razão
// entre tentativas e células, que vai de 4,6 no 4x4 para 18 no de 48 lacunas.
// ---------------------------------------------------------------------------

type Passo = {
  grade: number[];
  foco: number; // índice da célula sendo preenchida, ou -1
  tentativa: number; // valor sendo testado
  conflito: "linha" | "coluna" | "quadrante" | null;
  colocou: boolean;
  apagou: boolean;
  tentativas: number;
  colocacoes: number;
  retrocessos: number;
  prof: number;
  linha: number;
  nota: string;
  ok?: boolean;
};

const CODIGO = [
  "def resolver(grade):",
  "    pos = primeira_vazia(grade)",
  "    if pos is None: return True      # completo",
  "    for d in range(1, N + 1):        # as opções",
  "        if valido(grade, pos, d):    # a validade",
  "            grade[pos] = d           # 1. escolher",
  "            if resolver(grade):      # 2. explorar",
  "                return True",
  "            grade[pos] = VAZIO       # 3. desfazer",
  "    return False                     # nenhum dígito serviu",
];

type Preset = {
  key: string;
  rotulo: string;
  n: number; // 4 ou 9
  caixa: [number, number]; // altura e largura do quadrante
  dados: number[];
  dica: string;
};

// prettier-ignore
const P4 = [
  0, 0, 4, 0,
  4, 0, 0, 2,
  0, 4, 0, 0,
  0, 3, 0, 0,
];

// Os dois 9x9 saem da mesma solução conhecida, com lacunas escolhidas para
// caberem numa animação: o solucionador ingênuo anda da primeira célula vazia
// para a frente, então apagar do fim para o começo mantém o custo domável e
// ainda assim força retrocesso.
// prettier-ignore
const P9_VINTE = [
  5, 3, 4, 6, 7, 8, 9, 1, 2,
  6, 7, 2, 1, 9, 5, 3, 4, 8,
  1, 9, 8, 3, 4, 2, 5, 6, 7,
  8, 5, 9, 7, 6, 1, 4, 2, 3,
  4, 2, 6, 8, 5, 3, 7, 9, 1,
  7, 1, 3, 9, 2, 4, 8, 5, 6,
  9, 6, 1, 5, 3, 7, 2, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
];

// prettier-ignore
const P9_QUARENTA = [
  5, 3, 4, 6, 7, 8, 9, 1, 2,
  6, 7, 2, 1, 9, 5, 3, 4, 8,
  1, 9, 8, 3, 4, 2, 5, 6, 7,
  8, 5, 9, 7, 6, 1, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
];

const PRESETS: Preset[] = [
  {
    key: "quatro",
    rotulo: "Sudoku 4x4, para acompanhar passo a passo",
    n: 4,
    caixa: [2, 2],
    dados: P4,
    dica: "As mesmas regras num tabuleiro que cabe na cabeça: dígitos de 1 a 4, sem repetir na linha, na coluna e no quadrante 2x2. Acompanhe uma célula específica e conte quantas vezes ela é escrita e apagada antes de ficar.",
  },
  {
    key: "vinte",
    rotulo: "9x9 com 20 lacunas",
    n: 9,
    caixa: [3, 3],
    dados: P9_VINTE,
    dica: "O tabuleiro que a pessoa reconhece, com as duas últimas linhas em aberto. São 12 retrocessos para 20 lacunas: mesmo com o tabuleiro quase pronto, o algoritmo escreve coisa errada e precisa voltar.",
  },
  {
    key: "quarenta",
    rotulo: "9x9 com 48 lacunas",
    n: 9,
    caixa: [3, 3],
    dados: P9_QUARENTA,
    dica: "Só as três primeiras linhas dadas. Rode até o fim e olhe a razão entre dígitos testados e lacunas. Com tão poucas pistas existem muitas soluções válidas, e é bom saber o que o algoritmo faz nesse caso: ele para na PRIMEIRA que encontrar, não na certa, porque para ele não existe uma certa.",
  },
];

const VELOCIDADES = [0, 300, 160, 80, 30, 8];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

const LIMITE_PASSOS = 20000;

export function gerarPassos(preset: Preset): Passo[] {
  const { n, caixa, dados } = preset;
  const [ch, cw] = caixa;
  const g = [...dados];
  const out: Passo[] = [];
  let tentativas = 0;
  let colocacoes = 0;
  let retrocessos = 0;
  let prof = 0;
  let estourou = false;

  const base = (extra: Partial<Passo>): Passo => ({
    grade: [...g],
    foco: -1,
    tentativa: 0,
    conflito: null,
    colocou: false,
    apagou: false,
    tentativas,
    colocacoes,
    retrocessos,
    prof,
    linha: 0,
    nota: "",
    ...extra,
  });

  const lin = (i: number) => Math.floor(i / n);
  const col = (i: number) => i % n;
  const quad = (i: number) => `${Math.floor(lin(i) / ch)},${Math.floor(col(i) / cw)}`;

  // Devolve qual regra barrou o dígito, ou null se ele cabe. Devolver a REGRA em
  // vez de um booleano é o que deixa a nota dizer por que não deu.
  const conflitoDe = (i: number, d: number): "linha" | "coluna" | "quadrante" | null => {
    for (let k = 0; k < n; k++) if (g[lin(i) * n + k] === d) return "linha";
    for (let k = 0; k < n; k++) if (g[k * n + col(i)] === d) return "coluna";
    for (let k = 0; k < n * n; k++) if (quad(k) === quad(i) && g[k] === d) return "quadrante";
    return null;
  };

  const vazias = g.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);

  out.push(
    base({
      linha: 0,
      nota: `Tabuleiro ${n}x${n} com ${vazias.length} lacuna${vazias.length === 1 ? "" : "s"}. As opções de cada célula são os dígitos de 1 a ${n}, a validade é a regra do sudoku (linha, coluna e quadrante) e o desfazer é apagar. O algoritmo é o mesmo de sempre.`,
    })
  );

  const resolver = (): boolean => {
    if (out.length > LIMITE_PASSOS) {
      estourou = true;
      return true;
    }
    const i = g.indexOf(0);
    if (i < 0) return true;
    prof++;
    for (let d = 1; d <= n; d++) {
      tentativas++;
      const c = conflitoDe(i, d);
      if (c) {
        out.push(
          base({
            foco: i,
            tentativa: d,
            conflito: c,
            linha: 4,
            nota: `Célula da linha ${lin(i) + 1}, coluna ${col(i) + 1}: tento ${d}. Já existe um ${d} ${c === "linha" ? "nesta linha" : c === "coluna" ? "nesta coluna" : "neste quadrante"}, então este dígito não serve. Passo para o próximo.`,
          })
        );
        continue;
      }
      g[i] = d;
      colocacoes++;
      out.push(
        base({
          foco: i,
          tentativa: d,
          colocou: true,
          linha: 5,
          nota: `${d} cabe na linha ${lin(i) + 1}, coluna ${col(i) + 1}: nenhum conflito nas três regras. Escrevo e desço para a próxima célula vazia. Cuidado: caber agora não quer dizer estar certo, é só uma aposta.`,
        })
      );
      if (resolver()) return true;
      g[i] = 0;
      retrocessos++;
      out.push(
        base({
          foco: i,
          tentativa: d,
          apagou: true,
          linha: 8,
          nota: `Nenhum dígito serviu daqui para a frente, então a aposta de pôr ${d} na linha ${lin(i) + 1}, coluna ${col(i) + 1} estava errada. Apago e tento o próximo valor. É o retrocesso, e é o único jeito de descobrir que uma escolha antiga era ruim.`,
        })
      );
    }
    prof--;
    return false;
  };

  const resolveu = resolver();
  const ok = resolveu && !estourou;
  prof = 0;
  out.push(
    base({
      // O verde do card é uma afirmação: só vale quando o tabuleiro foi mesmo
      // resolvido. Interrupção por limite e tabuleiro sem solução são os dois
      // casos em que ele mentiria.
      ok,
      linha: 2,
      nota: estourou
        ? `Parei em ${LIMITE_PASSOS} passos para não travar o navegador. Isso já é a lição: este tabuleiro exige mais passos do que uma animação consegue mostrar.`
        : resolveu
          ? `Resolvido. Foram ${tentativas} tentativas de dígito para ${vazias.length} lacunas, com ${retrocessos} retrocessos. A razão entre esses dois primeiros números é o preço da força bruta: cada célula custou em média ${(tentativas / vazias.length).toFixed(1)} tentativas.`
          : `Este tabuleiro não tem solução, e o backtracking provou isso do único jeito que ele sabe: tentando tudo.`,
    })
  );
  return out;
}

export function BacktrackingSudoku() {
  const [presetKey, setPresetKey] = useState("quatro");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(4);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const passos = useMemo(() => gerarPassos(preset), [preset]);
  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];
  const n = preset.n;
  const [ch, cw] = preset.caixa;
  const fixas = useMemo(() => new Set(preset.dados.map((v, i) => (v !== 0 ? i : -1)).filter((i) => i >= 0)), [preset]);

  const parar = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const reiniciar = () => {
    parar();
    setTocando(false);
    setPasso(0);
  };
  const trocarPreset = (k: string) => {
    reiniciar();
    setPresetKey(k);
  };

  const pctPasso = Math.round(((idx + 1) / total) * 100);
  const lacunas = preset.dados.filter((v) => v === 0).length;

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · o mesmo backtracking resolvendo sudoku</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">
            passo {idx + 1} de {total}
          </span>
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
              className={`bigo-chip${presetKey === pr.key ? " on" : ""}`}
              onClick={() => trocarPreset(pr.key)}
              aria-pressed={presetKey === pr.key}
            >
              {pr.rotulo}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">{preset.dica}</p>

        <div className={`hs-fase ${p.apagou ? "f-ordenar" : p.colocou ? "f-fim" : ""}`}>
          <span className="hs-fase-selo">
            {p.apagou ? "3 · desfazer" : p.colocou ? "1 · escolher" : p.conflito ? "opção inválida" : "início"}
          </span>
          <span className="hs-fase-txt">
            {p.foco >= 0
              ? `linha ${Math.floor(p.foco / n) + 1}, coluna ${(p.foco % n) + 1} · testando ${p.tentativa}`
              : `${lacunas} lacunas para preencher`}
          </span>
        </div>

        <div className="bt-sudoku-wrap">
          <div
            className={`bt-sudoku n${n}`}
            style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
            role="img"
            aria-label={`Tabuleiro de sudoku ${n} por ${n}. ${p.nota}`}
          >
            {p.grade.map((v, i) => {
              const cls = ["bt-cel"];
              if (fixas.has(i)) cls.push("fixa");
              if (i === p.foco) cls.push(p.conflito ? "conflito" : p.apagou ? "apagou" : "foco");
              if (Math.floor(i / n) % ch === 0) cls.push("topo");
              if ((i % n) % cw === 0) cls.push("esq");
              return (
                <span key={i} className={cls.join(" ")}>
                  {i === p.foco && p.conflito ? p.tentativa : v === 0 ? "" : v}
                </span>
              );
            })}
          </div>
        </div>

        <p className={"viz-note" + (p.ok ? " ok" : "")}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">sudoku.py</div>
            <div className="viz-code-body">
              {CODIGO.map((txt, k) => (
                <div key={k} className={`viz-line${k === p.linha ? " on" : ""}`}>
                  <span className="ln">{k + 1}</span>
                  {txt}
                </div>
              ))}
            </div>
          </div>
          <div className="viz-vars">
            <div className="viz-vars-head">Variáveis</div>
            <div className="viz-var">
              <span className="viz-var-name">dígito em teste</span>
              <span className="viz-var-val best">{p.tentativa > 0 ? p.tentativa : "-"}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">regra que barrou</span>
              <span className="viz-var-val">{p.conflito ?? (p.colocou ? "nenhuma" : "-")}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">células ainda vazias</span>
              <span className="viz-var-val">{p.grade.filter((v) => v === 0).length}</span>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>lacunas do tabuleiro</span>
            <strong>{lacunas}</strong>
          </div>
          <div className="bigo-stat">
            <span>dígitos testados</span>
            <strong>{p.tentativas}</strong>
          </div>
          <div className="bigo-stat">
            <span>escritas na grade</span>
            <strong>{p.colocacoes}</strong>
          </div>
          <div className="bigo-stat">
            <span>retrocessos</span>
            <strong>{p.retrocessos}</strong>
          </div>
        </div>

        <div className="viz-controls">
          <button className="viz-btn" title="Reiniciar" onClick={reiniciar}>
            ↺
          </button>
          <button
            className="viz-btn"
            disabled={idx === 0}
            onClick={() => {
              parar();
              setTocando(false);
              setPasso((s) => Math.max(0, s - 1));
            }}
          >
            ‹ Anterior
          </button>
          <button
            className="viz-play"
            onClick={() => {
              if (tocando) {
                setTocando(false);
                return;
              }
              setPasso(idx >= total - 1 ? 0 : idx);
              setTocando(true);
            }}
          >
            {tocando ? "❚❚ Pausar" : "▶ Rodar"}
          </button>
          <button
            className="viz-btn"
            disabled={idx === total - 1}
            onClick={() => {
              parar();
              setTocando(false);
              setPasso((s) => Math.min(s + 1, total - 1));
            }}
          >
            Próximo ›
          </button>
          <div className="viz-speed">
            <span>Velocidade</span>
            <input type="range" min={1} max={5} step={1} value={velocidade} onChange={(e) => setVelocidade(parseInt(e.target.value, 10))} />
            <span className="val">{ROTULOS_VEL[velocidade]}</span>
          </div>
        </div>
        <div className="viz-progress">
          <div className="viz-progress-fill" style={{ width: `${pctPasso}%` }} />
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Rode o preset de 48 lacunas até o fim, na velocidade 2x, e compare os cards: 882 dígitos testados
          para 48 lacunas, com 120 escritas e 72 retrocessos. São 18 tentativas por célula, e o algoritmo
          escreve e apaga a mesma posição várias vezes; cada apagada é a descoberta de que uma escolha feita
          lá atrás não levava a lugar nenhum. É o mesmo
          template do visualizador anterior, com três peças trocadas: as opções viraram os dígitos, a validade
          virou a regra do sudoku, e o desfazer virou apagar a célula.
        </p>
      </div>
    </figure>
  );

  if (expanded && mounted) {
    return createPortal(
      <div
        className="viz-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) setExpanded(false);
        }}
      >
        {viz}
      </div>,
      document.body
    );
  }
  return viz;
}
