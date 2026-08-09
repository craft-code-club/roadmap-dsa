"use client";

import { useMemo, useState } from "react";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// BacktrackingVisualizer, a árvore que não existe.
//
// A única coisa que o aluno precisa enxergar é que o backtracking tem TRÊS
// movimentos e que o terceiro é o que dá nome a ele: escolher, explorar e
// DESFAZER. Quase todo material desenha a árvore de decisão e para por aí, o
// que deixa a impressão de que existe uma árvore sendo construída na memória.
// Não existe. O que existe é uma lista sendo mexida e uma pilha de chamadas, e
// a árvore é só o desenho do caminho que o algoritmo percorreu.
//
// Por isso a tela mostra as três coisas ao mesmo tempo e no mesmo passo: a
// árvore (o mapa), a solução parcial (a única lista que existe de verdade) e a
// pilha de chamadas. No passo de retrocesso a árvore não muda, a lista encolhe
// e a pilha desempilha, e é essa dessincronia que ensina quem é quem.
//
// A geometria vem da árvore COMPLETA, calculada antes de qualquer passo, e não
// do que já foi explorado. Com o envelope fixo, os nós aparecem no lugar em que
// vão ficar, e dá para seguir um ramo específico do começo ao fim. Se o layout
// acompanhasse a exploração, tudo se moveria a cada passo e o aluno leria
// movimento onde só houve descoberta.
//
// A casca (altura que cabe na tela, painel com cabeçalho e controles parados,
// código recolhível, teclado) vem do `useVisualizer`. Medido: no fluxo do
// artigo a peça pede 1.369px de um orçamento de 816 a 1512x900, e o pico é o
// passo 12 de 32 — 107px acima do primeiro passo e 100 acima do último, porque
// quem cresce é a pilha de chamadas (19 → 120px), que sobe e desce.
// ---------------------------------------------------------------------------

type Action = "inicio" | "escolher" | "registrar" | "descer" | "retroceder" | "fim";

type TreeNode = { id: string; label: string; depth: number; children: TreeNode[]; x: number; y: number };

type Step = {
  currentNode: string;
  visited: string[];
  recorded: string[];
  partial: number[];
  stack: string[];
  solutions: number[][];
  action: Action;
  nodeCount: number;
  backtracks: number;
  line: number;
  note: string;
  ok?: boolean;
};

const CODE = [
  "def backtrack(parcial, opcoes):",
  "    if completo(parcial):",
  "        solucoes.append(parcial[:])   # cópia, e isso importa",
  "        return",
  "    for opcao in opcoes:",
  "        if valido(opcao, parcial):",
  "            parcial.append(opcao)     # 1. escolher",
  "            backtrack(parcial, ...)   # 2. explorar",
  "            parcial.pop()             # 3. desfazer",
];

type Mode = "subconjuntos" | "permutacoes" | "combinacoes";

const MODE_NAMES: Record<Mode, string> = {
  subconjuntos: "Subconjuntos de 1, 2, 3",
  permutacoes: "Permutações de 1, 2, 3",
  combinacoes: "Combinações de 2 entre 1, 2, 3, 4",
};

const MODE_HINTS: Record<Mode, string> = {
  subconjuntos:
    "Todo nó da árvore é uma resposta, inclusive a raiz (o conjunto vazio). Repare que o algoritmo registra a solução na ENTRADA de cada chamada, antes de olhar as opções, e por isso são 2^3 = 8 respostas para 8 nós.",
  permutacoes:
    "Aqui só as folhas são resposta: uma permutação precisa usar todos os elementos. A árvore tem 16 nós e devolve 3! = 6 soluções, ou seja, mais da metade do trabalho é caminho, não resultado.",
  combinacoes:
    "Combinação fixa o tamanho: dois elementos entre quatro, sem repetir e sem ligar para a ordem. Só os nós de profundidade 2 são resposta, e a regra de nunca voltar para trás no array é o que impede 1,2 e 2,1 de aparecerem os dois.",
};

const MODES: Mode[] = ["subconjuntos", "permutacoes", "combinacoes"];

const SPEEDS = [0, 1200, 800, 520, 320, 180];

const labelOf = (v: number[]) => (v.length === 0 ? "∅" : v.join(" "));

// Gera a árvore inteira e a lista de passos numa passada só. A árvore é o mapa
// do percurso, e os passos são o percurso: os dois saem do mesmo laço, então
// não têm como divergir.
export function generate(mode: Mode): { root: TreeNode; steps: Step[]; leaves: number } {
  const values = mode === "combinacoes" ? [1, 2, 3, 4] : [1, 2, 3];
  const k = 2; // tamanho fixo das combinações
  const steps: Step[] = [];
  const partial: number[] = [];
  const solutions: number[][] = [];
  const visited: string[] = [];
  const recorded: string[] = [];
  const stack: string[] = [];
  let nodeCount = 0;
  let backtracks = 0;

  const root: TreeNode = { id: "r", label: "∅", depth: 0, children: [], x: 0, y: 0 };

  const base = (currentNode: string, action: Action, line: number, note: string, ok?: boolean): Step => ({
    currentNode,
    visited: [...visited],
    recorded: [...recorded],
    partial: [...partial],
    stack: [...stack],
    solutions: solutions.map((s) => [...s]),
    action,
    nodeCount,
    backtracks,
    line,
    note,
    ok,
  });

  const isComplete = () =>
    mode === "subconjuntos" ? true : mode === "permutacoes" ? partial.length === values.length : partial.length === k;

  const explore = (node: TreeNode, start: number, used: boolean[]) => {
    nodeCount++;
    visited.push(node.id);
    stack.push(labelOf(partial));
    steps.push(
      base(
        node.id,
        "descer",
        0,
        `Entrei na chamada com a solução parcial [${labelOf(partial)}]. A pilha tem ${stack.length} chamada${stack.length === 1 ? "" : "s"} agora.`
      )
    );

    if (isComplete()) {
      solutions.push([...partial]);
      recorded.push(node.id);
      steps.push(
        base(
          node.id,
          "registrar",
          2,
          `[${labelOf(partial)}] é uma solução completa, então guardo. Repare no [:] do código: eu guardo uma CÓPIA. A lista parcial é uma só e vai continuar mudando; sem a cópia, todas as ${solutions.length} respostas apontariam para ela e terminariam vazias.`,
          true
        )
      );
      if (mode !== "subconjuntos") {
        stack.pop();
        return;
      }
    }

    for (let i = mode === "permutacoes" ? 0 : start; i < values.length; i++) {
      if (mode === "permutacoes" && used[i]) continue;
      const v = values[i];
      if (mode === "combinacoes" && partial.length + (values.length - i) < k) break;

      partial.push(v);
      if (mode === "permutacoes") used[i] = true;
      const child: TreeNode = { id: `${node.id}-${v}`, label: labelOf(partial), depth: node.depth + 1, children: [], x: 0, y: 0 };
      node.children.push(child);
      steps.push(
        base(
          child.id,
          "escolher",
          6,
          `Escolho ${v} e ponho na solução parcial: [${labelOf(partial)}]. ${
            mode === "subconjuntos"
              ? `Como só olho do índice ${i + 1} em diante daqui para frente, nunca vou montar um subconjunto fora da ordem original.`
              : mode === "permutacoes"
                ? `Marco ${v} como usado: numa permutação cada elemento entra uma vez só, mas em qualquer posição.`
                : `Daqui em diante só olho do índice ${i + 1} para a frente, que é o que impede 1,2 e 2,1 de contarem como combinações diferentes.`
          }`
        )
      );

      explore(child, i + 1, used);

      const removed = partial.pop();
      if (mode === "permutacoes") used[i] = false;
      backtracks++;
      steps.push(
        base(
          child.id,
          "retroceder",
          8,
          `Retrocesso: tiro ${removed} da solução parcial, que volta a ser [${labelOf(partial)}]. Repare que a árvore não perdeu nada, porque ela é só o desenho do caminho. Quem encolheu foi a lista, que é a única coisa que existe de verdade na memória.`
        )
      );
    }

    if (!(isComplete() && mode !== "subconjuntos")) stack.pop();
  };

  steps.push(
    base(
      "r",
      "inicio",
      0,
      `${MODE_NAMES[mode]}. A solução parcial começa vazia e o algoritmo vai fazer sempre a mesma coisa: escolher uma opção, explorar tudo que sai dela, e desfazer a escolha para poder tentar a próxima.`
    )
  );
  explore(root, 0, new Array(values.length).fill(false));
  steps.push(
    base(
      "r",
      "fim",
      0,
      `Acabou: ${solutions.length} soluções, ${nodeCount} nós visitados e ${backtracks} retrocessos. A solução parcial voltou a ficar vazia, exatamente como começou, porque todo escolher teve o seu desfazer.`,
      true
    )
  );

  // Layout: x por posição de folha, y por profundidade. Calculado sobre a
  // árvore COMPLETA, para o desenho não se mexer durante a animação.
  let slot = 0;
  const place = (n: TreeNode): number => {
    if (n.children.length === 0) {
      n.x = slot++;
      return n.x;
    }
    const xs = n.children.map(place);
    n.x = (xs[0] + xs[xs.length - 1]) / 2;
    return n.x;
  };
  place(root);
  const markY = (n: TreeNode) => {
    n.y = n.depth;
    n.children.forEach(markY);
  };
  markY(root);

  return { root, steps, leaves: slot };
}

function flatten(n: TreeNode, out: TreeNode[] = []): TreeNode[] {
  out.push(n);
  n.children.forEach((f) => flatten(f, out));
  return out;
}

const NODE_R = 17;

export function BacktrackingVisualizer() {
  const [mode, setMode] = useState<Mode>("subconjuntos");

  const { root, steps, leaves } = useMemo(() => generate(mode), [mode]);
  const allNodes = useMemo(() => flatten(root), [root]);

  const viz = useVisualizer({
    title: "Visualizador · backtracking: escolher, explorar, desfazer",
    total: steps.length,
    speeds: SPEEDS,
    initialSpeed: 4,
    // O que muda a altura da peça é o modo: ele decide a profundidade da árvore
    // (o desenho mede 260px com 3 níveis e 198px com 2) e o tamanho da dica.
    // A pilha de chamadas cresce ao longo da animação e o hook não remede por
    // passo — não precisa: o passo 0 já pede 1.262px de um orçamento de 816.
    measureOn: [mode],
  });

  const p = steps[viz.step];

  const changeMode = (m: Mode) => {
    viz.reset();
    setMode(m);
  };

  const maxDepth = Math.max(...allNodes.map((n) => n.depth));
  const stepX = 74;
  const span = Math.max(320, leaves * stepX);
  const W = span + NODE_R * 2;
  const H = 40 + maxDepth * 62 + NODE_R * 2;
  const cx = (n: TreeNode) => NODE_R + ((n.x + 0.5) * span) / leaves;
  const cy = (n: TreeNode) => 22 + NODE_R + n.y * 62;

  const seen = new Set(p.visited);
  const recorded = new Set(p.recorded);

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {MODES.map((m) => (
            <button type="button" key={m} className={`bigo-chip${mode === m ? " on" : ""}`} onClick={() => changeMode(m)} aria-pressed={mode === m}>
              {MODE_NAMES[m]}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">{MODE_HINTS[mode]}</p>

        {/* `f-ordenar` e `f-fim` são API de CSS (`.hs-fase.f-ordenar`), não
            identificadores deste arquivo: os nomes ficam em português. */}
        <div className={`hs-fase ${p.action === "retroceder" ? "f-ordenar" : p.action === "registrar" ? "f-fim" : ""}`}>
          <span className="hs-fase-selo">
            {p.action === "escolher"
              ? "1 · escolher"
              : p.action === "descer"
                ? "2 · explorar"
                : p.action === "retroceder"
                  ? "3 · desfazer"
                  : p.action === "registrar"
                    ? "solução completa"
                    : "início"}
          </span>
          <span className="hs-fase-txt">
            solução parcial: [{labelOf(p.partial)}] · soluções guardadas: {p.solutions.length}
          </span>
        </div>

        <div className="tt-arv-wrap">
          <svg
            className="tt-arv"
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Árvore de decisão do backtracking. ${p.note}`}
          >
            {allNodes.map((n) =>
              n.children.map((f) => (
                <line
                  key={`${n.id}->${f.id}`}
                  className={`tt-aresta${seen.has(f.id) ? " ativa" : ""}`}
                  x1={cx(n)}
                  y1={cy(n) + NODE_R}
                  x2={cx(f)}
                  y2={cy(f) - NODE_R}
                  opacity={seen.has(f.id) ? 1 : 0.18}
                />
              ))
            )}
            {allNodes.map((n) => {
              const cls = ["tt-no", "bt-no"];
              if (n.id === p.currentNode) cls.push("on");
              else if (recorded.has(n.id)) cls.push("filho");
              else if (!seen.has(n.id)) cls.push("porvir");
              return (
                <g key={n.id} className={cls.join(" ")}>
                  <circle cx={cx(n)} cy={cy(n)} r={NODE_R} />
                  <text x={cx(n)} y={cy(n) + 4} textAnchor="middle">
                    {n.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="bt-paineis">
          <div className="hp-bloco">
            <div className="tt-painel-tit">
              A solução parcial <em>a única lista que existe na memória</em>
            </div>
            <div className="hp-arr">
              {p.partial.length === 0 ? (
                <span className="bb-array-nota">vazia</span>
              ) : (
                p.partial.map((v, k) => (
                  <span key={k} className={`hp-cel${p.action === "escolher" && k === p.partial.length - 1 ? " foco troca" : " fixo"}`}>
                    <i>{k}</i>
                    {v}
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="hp-bloco">
            <div className="tt-painel-tit">
              A pilha de chamadas <em>o que a recursão guarda de verdade</em>
            </div>
            <div className="bt-pilha">
              {p.stack.length === 0 ? (
                <span className="bb-array-nota">vazia</span>
              ) : (
                // A inversão é só do CSS (column-reverse): o primeiro quadro do
                // array é a chamada mais antiga e aparece embaixo, o último é o
                // topo da pilha e aparece em cima. Inverter também aqui era
                // desfazer o efeito e deixar o destaque no quadro errado.
                p.stack.map((t, k) => (
                  <span key={k} className={`bt-quadro${k === p.stack.length - 1 ? " topo" : ""}`}>
                    backtrack([{t}])
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            As soluções guardadas <em>cada uma é uma cópia, tirada no instante em que foi encontrada</em>
          </div>
          <div className="bt-solucoes">
            {p.solutions.length === 0 ? (
              <span className="bb-array-nota">nenhuma ainda</span>
            ) : (
              p.solutions.map((s, k) => (
                <span key={k} className={`bt-sol${k === p.solutions.length - 1 && p.action === "registrar" ? " nova" : ""}`}>
                  [{labelOf(s)}]
                </span>
              ))
            )}
          </div>
        </div>

        <p className={"viz-note" + (p.ok ? " ok" : "")}>{p.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com os 281px do
              código (medido). O `.viz-code-slot` é o truque de grid 1fr→0fr. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">backtrack.py</div>
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
              <span className="viz-var-name">parcial</span>
              <span className="viz-var-val best">[{labelOf(p.partial)}]</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">profundidade da pilha</span>
              <span className="viz-var-val">{p.stack.length}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">soluções guardadas</span>
              <span className="viz-var-val">{p.solutions.length}</span>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>nós visitados</span>
            <strong>{p.nodeCount}</strong>
          </div>
          <div className="bigo-stat">
            <span>soluções encontradas</span>
            <strong>{p.solutions.length}</strong>
          </div>
          <div className="bigo-stat">
            <span>retrocessos</span>
            <strong>{p.backtracks}</strong>
          </div>
          <div className="bigo-stat">
            <span>nós da árvore inteira</span>
            <strong>{allNodes.length}</strong>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Rode os três até o fim e compare nós visitados com soluções encontradas: 8 e 8 nos subconjuntos, 16
          e 6 nas permutações, 10 e 6 nas combinações. Nas permutações, dez dos dezesseis nós são caminho e
          não resposta, e é esse desperdício que faz o custo do backtracking ser exponencial. O número de
          retrocessos é sempre igual ao de arestas da árvore: todo escolher tem exatamente um desfazer.
        </p>
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(frame);
}
