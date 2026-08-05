"use client";

import { useMemo, useState } from "react";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

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
//
// A casca vem do `useVisualizer`. Ao contrário da árvore do visualizador
// anterior, aqui NADA se acumula na tela: o tabuleiro é uma grade fixa e cada
// passo substitui o anterior. Medido: a amplitude ao longo dos 956 passos do
// preset maior é de 20px, e vem da nota ter uma ou duas linhas. Quem manda na
// altura é o preset — 156px de grade no 4x4 contra 346px nos 9x9.
// ---------------------------------------------------------------------------

type Step = {
  grid: number[];
  focus: number; // índice da célula sendo preenchida, ou -1
  attempt: number; // valor sendo testado
  // Os valores desta união são TEXTO DE TELA: eles aparecem crus no painel de
  // variáveis, na linha "regra que barrou". Traduzir os identificadores não
  // alcança eles.
  conflict: "linha" | "coluna" | "quadrante" | null;
  placed: boolean;
  erased: boolean;
  attempts: number;
  placements: number;
  backtracks: number;
  depth: number;
  line: number;
  note: string;
  ok?: boolean;
};

const CODE = [
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
  label: string;
  n: number; // 4 ou 9
  box: [number, number]; // altura e largura do quadrante
  data: number[];
  hint: string;
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
const P9_TWENTY = [
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
const P9_FORTY = [
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
    key: "four",
    label: "Sudoku 4x4, para acompanhar passo a passo",
    n: 4,
    box: [2, 2],
    data: P4,
    hint: "As mesmas regras num tabuleiro que cabe na cabeça: dígitos de 1 a 4, sem repetir na linha, na coluna e no quadrante 2x2. Acompanhe uma célula específica e conte quantas vezes ela é escrita e apagada antes de ficar.",
  },
  {
    key: "twenty",
    label: "9x9 com 20 lacunas",
    n: 9,
    box: [3, 3],
    data: P9_TWENTY,
    hint: "O tabuleiro que a pessoa reconhece, com as duas últimas linhas em aberto. São 12 retrocessos para 20 lacunas: mesmo com o tabuleiro quase pronto, o algoritmo escreve coisa errada e precisa voltar.",
  },
  {
    key: "forty",
    label: "9x9 com 48 lacunas",
    n: 9,
    box: [3, 3],
    data: P9_FORTY,
    hint: "Só as três primeiras linhas dadas. Rode até o fim e olhe a razão entre dígitos testados e lacunas. Com tão poucas pistas existem muitas soluções válidas, e é bom saber o que o algoritmo faz nesse caso: ele para na PRIMEIRA que encontrar, não na certa, porque para ele não existe uma certa.",
  },
];

const SPEEDS = [0, 300, 160, 80, 30, 8];

const STEP_LIMIT = 20000;

export function generateSteps(preset: Preset): Step[] {
  const { n, box, data } = preset;
  const [bh, bw] = box;
  const g = [...data];
  const out: Step[] = [];
  let attempts = 0;
  let placements = 0;
  let backtracks = 0;
  let depth = 0;
  let overflowed = false;

  const base = (extra: Partial<Step>): Step => ({
    grid: [...g],
    focus: -1,
    attempt: 0,
    conflict: null,
    placed: false,
    erased: false,
    attempts,
    placements,
    backtracks,
    depth,
    line: 0,
    note: "",
    ...extra,
  });

  const rowOf = (i: number) => Math.floor(i / n);
  const colOf = (i: number) => i % n;
  const boxOf = (i: number) => `${Math.floor(rowOf(i) / bh)},${Math.floor(colOf(i) / bw)}`;

  // Devolve qual regra barrou o dígito, ou null se ele cabe. Devolver a REGRA em
  // vez de um booleano é o que deixa a nota dizer por que não deu.
  const conflictOf = (i: number, d: number): "linha" | "coluna" | "quadrante" | null => {
    for (let k = 0; k < n; k++) if (g[rowOf(i) * n + k] === d) return "linha";
    for (let k = 0; k < n; k++) if (g[k * n + colOf(i)] === d) return "coluna";
    for (let k = 0; k < n * n; k++) if (boxOf(k) === boxOf(i) && g[k] === d) return "quadrante";
    return null;
  };

  const empties = g.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);

  out.push(
    base({
      line: 0,
      note: `Tabuleiro ${n}x${n} com ${empties.length} lacuna${empties.length === 1 ? "" : "s"}. As opções de cada célula são os dígitos de 1 a ${n}, a validade é a regra do sudoku (linha, coluna e quadrante) e o desfazer é apagar. O algoritmo é o mesmo de sempre.`,
    })
  );

  const solve = (): boolean => {
    if (out.length > STEP_LIMIT) {
      overflowed = true;
      return true;
    }
    const i = g.indexOf(0);
    if (i < 0) return true;
    depth++;
    for (let d = 1; d <= n; d++) {
      attempts++;
      const c = conflictOf(i, d);
      if (c) {
        out.push(
          base({
            focus: i,
            attempt: d,
            conflict: c,
            line: 4,
            note: `Célula da linha ${rowOf(i) + 1}, coluna ${colOf(i) + 1}: tento ${d}. Já existe um ${d} ${c === "linha" ? "nesta linha" : c === "coluna" ? "nesta coluna" : "neste quadrante"}, então este dígito não serve. Passo para o próximo.`,
          })
        );
        continue;
      }
      g[i] = d;
      placements++;
      out.push(
        base({
          focus: i,
          attempt: d,
          placed: true,
          line: 5,
          note: `${d} cabe na linha ${rowOf(i) + 1}, coluna ${colOf(i) + 1}: nenhum conflito nas três regras. Escrevo e desço para a próxima célula vazia. Cuidado: caber agora não quer dizer estar certo, é só uma aposta.`,
        })
      );
      if (solve()) return true;
      g[i] = 0;
      backtracks++;
      out.push(
        base({
          focus: i,
          attempt: d,
          erased: true,
          line: 8,
          note: `Nenhum dígito serviu daqui para a frente, então a aposta de pôr ${d} na linha ${rowOf(i) + 1}, coluna ${colOf(i) + 1} estava errada. Apago e tento o próximo valor. É o retrocesso, e é o único jeito de descobrir que uma escolha antiga era ruim.`,
        })
      );
    }
    depth--;
    return false;
  };

  const solved = solve();
  const ok = solved && !overflowed;
  depth = 0;
  out.push(
    base({
      // O verde do card é uma afirmação: só vale quando o tabuleiro foi mesmo
      // resolvido. Interrupção por limite e tabuleiro sem solução são os dois
      // casos em que ele mentiria.
      ok,
      line: 2,
      note: overflowed
        ? `Parei em ${STEP_LIMIT} passos para não travar o navegador. Isso já é a lição: este tabuleiro exige mais passos do que uma animação consegue mostrar.`
        : solved
          ? `Resolvido. Foram ${attempts} tentativas de dígito para ${empties.length} lacunas, com ${backtracks} retrocessos. A razão entre esses dois primeiros números é o preço da força bruta: cada célula custou em média ${(attempts / empties.length).toFixed(1)} tentativas.`
          : `Este tabuleiro não tem solução, e o backtracking provou isso do único jeito que ele sabe: tentando tudo.`,
    })
  );
  return out;
}

export function BacktrackingSudoku() {
  const [presetKey, setPresetKey] = useState("four");

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const steps = useMemo(() => generateSteps(preset), [preset]);
  const n = preset.n;
  const [bh, bw] = preset.box;
  const fixed = useMemo(() => new Set(preset.data.map((v, i) => (v !== 0 ? i : -1)).filter((i) => i >= 0)), [preset]);

  const viz = useVisualizer({
    title: "Visualizador · o mesmo backtracking resolvendo sudoku",
    total: steps.length,
    speeds: SPEEDS,
    initialSpeed: 4,
    // O preset é o único eixo de altura da peça: ele troca a grade (156px no
    // 4x4, 346px nos 9x9) e o tamanho da dica. O passo não entra — medido, ele
    // vale 20px em 956 estados.
    measureOn: [presetKey],
  });

  const p = steps[viz.step];

  const changePreset = (k: string) => {
    viz.reset();
    setPresetKey(k);
  };

  const gaps = preset.data.filter((v) => v === 0).length;

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              key={pr.key}
              className={`bigo-chip${presetKey === pr.key ? " on" : ""}`}
              onClick={() => changePreset(pr.key)}
              aria-pressed={presetKey === pr.key}
            >
              {pr.label}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">{preset.hint}</p>

        {/* `f-ordenar` e `f-fim` são API de CSS (`.hs-fase.f-ordenar`), não
            identificadores deste arquivo: os nomes ficam em português. */}
        <div className={`hs-fase ${p.erased ? "f-ordenar" : p.placed ? "f-fim" : ""}`}>
          <span className="hs-fase-selo">
            {p.erased ? "3 · desfazer" : p.placed ? "1 · escolher" : p.conflict ? "opção inválida" : "início"}
          </span>
          <span className="hs-fase-txt">
            {p.focus >= 0
              ? `linha ${Math.floor(p.focus / n) + 1}, coluna ${(p.focus % n) + 1} · testando ${p.attempt}`
              : `${gaps} lacunas para preencher`}
          </span>
        </div>

        <div className="bt-sudoku-wrap">
          <div
            className={`bt-sudoku n${n}`}
            style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
            role="img"
            aria-label={`Tabuleiro de sudoku ${n} por ${n}. ${p.note}`}
          >
            {p.grid.map((v, i) => {
              const cls = ["bt-cel"];
              if (fixed.has(i)) cls.push("fixa");
              if (i === p.focus) cls.push(p.conflict ? "conflito" : p.erased ? "apagou" : "foco");
              if (Math.floor(i / n) % bh === 0) cls.push("topo");
              if ((i % n) % bw === 0) cls.push("esq");
              return (
                <span key={i} className={cls.join(" ")}>
                  {i === p.focus && p.conflict ? p.attempt : v === 0 ? "" : v}
                </span>
              );
            })}
          </div>
        </div>

        <p className={"viz-note" + (p.ok ? " ok" : "")}>{p.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com os 306px do
              código (medido). O `.viz-code-slot` é o truque de grid 1fr→0fr. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">sudoku.py</div>
              <div className="viz-code-body">
                {CODE.map((txt, k) => (
                  <div key={k} className={`viz-line${k === p.line ? " on" : ""}`}>
                    <span className="ln">{k + 1}</span>
                    {txt}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div {...viz.varsProps}>
            <div className="viz-vars-head">Variáveis</div>
            <div className="viz-var">
              <span className="viz-var-name">dígito em teste</span>
              <span className="viz-var-val best">{p.attempt > 0 ? p.attempt : "-"}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">regra que barrou</span>
              <span className="viz-var-val">{p.conflict ?? (p.placed ? "nenhuma" : "-")}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">células ainda vazias</span>
              <span className="viz-var-val">{p.grid.filter((v) => v === 0).length}</span>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>lacunas do tabuleiro</span>
            <strong>{gaps}</strong>
          </div>
          <div className="bigo-stat">
            <span>dígitos testados</span>
            <strong>{p.attempts}</strong>
          </div>
          <div className="bigo-stat">
            <span>escritas na grade</span>
            <strong>{p.placements}</strong>
          </div>
          <div className="bigo-stat">
            <span>retrocessos</span>
            <strong>{p.backtracks}</strong>
          </div>
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

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(frame);
}
