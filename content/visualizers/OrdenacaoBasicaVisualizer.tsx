"use client";

import { useMemo, useState } from "react";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// OrdenacaoBasicaVisualizer, os três O(n²) sobre exatamente o mesmo array.
//
// A única coisa que o aluno precisa enxergar aqui é que os três algoritmos
// resolvem o MESMO problema com movimentos completamente diferentes, e que a
// diferença de movimento é o que explica todo o resto (estabilidade, número de
// escritas, melhor caso). Por isso o seletor de algoritmo fica ao lado do
// seletor de entrada: trocar um e manter o outro é o experimento.
//
// A escolha mais importante é a faixa colorida do array ter DOIS significados
// distintos e nomeados: "posição final" (bubble e selection, que nunca mais
// tocam naquele índice) e "trecho ordenado entre si" (insertion, cujo prefixo
// está em ordem mas ainda vai receber elementos no meio). Tratar os dois como a
// mesma coisa é o erro mais comum de quem desenha esta visualização, e ensina
// que o insertion sort "já resolveu" posições que ele ainda vai mexer.
//
// Rejeitado: barras de altura proporcional (o clássico das animações). Elas são
// bonitas em movimento e péssimas para acompanhar UM elemento específico, que é
// justamente o que a explicação de estabilidade e de custo exige.
// ---------------------------------------------------------------------------

export type Algorithm = "bubble" | "selection" | "insertion";

// `kind` é dado, e os sufixos de classe abaixo são contrato com o CSS: o
// `globals.css` define `.hs-fase.f-fim`, `.hs-fase.f-ordenar`, `.hp-cel.fixo` e
// `.hp-cel.quase`. Por isso o valor da união NÃO é interpolado na className —
// ele passa por estes mapas, e traduzir a união não apaga cor nenhuma.
type RegionKind = "final" | "sorted";
const PHASE_CLASS: Record<RegionKind, string> = { final: "f-fim", sorted: "f-ordenar" };
const CELL_CLASS: Record<RegionKind, string> = { final: "fixo", sorted: "quase" };

type Region = { from: number; to: number; kind: RegionKind };

type Step = {
  arr: number[];
  focus: number; // o elemento em foco (o que está sendo colocado)
  pair: number; // o elemento com quem se compara
  mark: number; // auxiliar: o menor encontrado até agora (selection)
  inHand: number; // o valor guardado na variável temporária (insertion), ou -1
  region: Region | null;
  wrote: boolean;
  comps: number;
  writes: number;
  line: number;
  note: string;
  ok?: boolean;
};

const CODE: Record<Algorithm, string[]> = {
  bubble: [
    "def bubble_sort(a):",
    "    n = len(a)",
    "    for fim in range(n - 1, 0, -1):",
    "        trocou = False",
    "        for j in range(fim):",
    "            if a[j] > a[j + 1]:",
    "                a[j], a[j + 1] = a[j + 1], a[j]",
    "                trocou = True",
    "        if not trocou:",
    "            break        # já estava ordenado",
  ],
  selection: [
    "def selection_sort(a):",
    "    n = len(a)",
    "    for i in range(n - 1):",
    "        menor = i",
    "        for j in range(i + 1, n):",
    "            if a[j] < a[menor]:",
    "                menor = j",
    "        if menor != i:",
    "            a[i], a[menor] = a[menor], a[i]",
  ],
  insertion: [
    "def insertion_sort(a):",
    "    for i in range(1, len(a)):",
    "        atual = a[i]      # a carta na mão",
    "        j = i - 1",
    "        while j >= 0 and a[j] > atual:",
    "            a[j + 1] = a[j]   # abre espaço",
    "            j -= 1",
    "        a[j + 1] = atual  # encaixa",
  ],
};

export const NAMES: Record<Algorithm, string> = {
  bubble: "Bubble sort",
  selection: "Selection sort",
  insertion: "Insertion sort",
};

type Preset = { key: string; label: string; values: number[]; hint: string };

export const PRESETS: Preset[] = [
  {
    key: "shuffled",
    label: "Embaralhado: 5 3 21 13 1 7 6 15",
    values: [5, 3, 21, 13, 1, 7, 6, 15],
    hint: "O caso comum. Rode os três e compare o card de escritas no array: os oito valores são os mesmos, o resultado é o mesmo, e o trabalho para chegar lá não é nem parecido.",
  },
  {
    key: "sorted",
    label: "Já ordenado: 1 3 5 6 7 13 15 21",
    values: [1, 3, 5, 6, 7, 13, 15, 21],
    hint: "A entrada de sonho. Bubble e insertion percebem e saem em 7 comparações; o selection varre as 28 assim mesmo, porque ele não tem como saber que já está pronto sem olhar tudo.",
  },
  {
    key: "reversed",
    label: "Ao contrário: 21 15 13 7 6 5 3 1",
    values: [21, 15, 13, 7, 6, 5, 3, 1],
    hint: "A entrada mais hostil possível: as 28 inversões estão todas lá. Aqui os três fazem 28 comparações, e a diferença aparece toda no número de escritas.",
  },
  {
    key: "nearly",
    label: "Quase ordenado: 1 3 5 7 6 13 15 21",
    values: [1, 3, 5, 7, 6, 13, 15, 21],
    hint: "Uma única inversão no meio de tudo. É o cenário em que o insertion sort humilha os outros dois, e é por isso que ele sobrevive dentro das bibliotecas modernas.",
  },
];

// O ritmo é desta peça: uma troca de array pede mais tempo de leitura que um
// passo de sudoku. A marcha de abertura é a 4 (1.5x), não a 3 do padrão.
const SPEEDS = [0, 1200, 800, 520, 320, 180];

// Inversões: pares (i < j) com a[i] > a[j]. É a lei de conservação da tela.
// Bubble e insertion pagam exatamente uma operação por inversão; selection não.
export function inversions(v: number[]): number {
  let n = 0;
  for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (v[i] > v[j]) n++;
  return n;
}

function generateSteps(algo: Algorithm, values: number[]): Step[] {
  const a = [...values];
  const n = a.length;
  const out: Step[] = [];
  let comps = 0;
  let writes = 0;
  let region: Region | null = null;
  const base = () => ({ arr: [...a], focus: -1, pair: -1, mark: -1, inHand: -1, region, wrote: false, comps, writes });

  out.push({
    ...base(),
    line: 0,
    note: `Entrada: ${a.join(", ")}. ${NAMES[algo]} vai ordenar dentro deste mesmo array, sem alocar nada. Acompanhe os dois contadores: comparações e escritas no array.`,
  });

  if (algo === "bubble") {
    let exitedEarly = false;
    for (let end = n - 1; end > 0; end--) {
      let swapped = false;
      out.push({
        ...base(),
        line: 2,
        note:
          end === n - 1
            ? `Primeira passada, indo até a última posição. Ainda não sei nada sobre o array, então preciso comparar todos os vizinhos.`
            : `Passada nova, indo só até a posição ${end}. As ${n - 1 - end} posições depois dela já estão resolvidas para sempre, então nem olho para elas.`,
      });
      for (let j = 0; j < end; j++) {
        comps++;
        const swap = a[j] > a[j + 1];
        out.push({
          ...base(),
          focus: j,
          pair: j + 1,
          line: 5,
          note: swap
            ? `${a[j]} > ${a[j + 1]}: os dois estão fora de ordem entre si, então troco.`
            : `${a[j]} não é maior que ${a[j + 1]}: este par já está em ordem, sigo em frente sem tocar em nada.`,
        });
        if (swap) {
          const [x, y] = [a[j], a[j + 1]];
          [a[j], a[j + 1]] = [a[j + 1], a[j]];
          writes += 2;
          swapped = true;
          out.push({
            ...base(),
            focus: j + 1,
            pair: j,
            wrote: true,
            line: 6,
            note: `${x} andou uma casa para a direita e ${y} uma para a esquerda. Foi uma troca entre vizinhos: ninguém pulou por cima de ninguém, e é isso que torna o bubble sort estável.`,
          });
        }
      }
      region = { from: end, to: n - 1, kind: "final" };
      out.push({
        ...base(),
        line: 8,
        ok: !swapped,
        note: swapped
          ? `Fim da passada: o maior valor desta faixa (${a[end]}) chegou à posição ${end} e não sai mais de lá. Encolho o limite e recomeço.`
          : `Esta passada inteira não trocou nada. Isso só acontece quando cada vizinho já é maior que o anterior, ou seja, o array está ordenado. Paro aqui, sem fazer as ${(end * (end - 1)) / 2} comparações que ainda faltariam.`,
      });
      if (!swapped) {
        exitedEarly = true;
        break;
      }
    }
    if (!exitedEarly) region = { from: 0, to: n - 1, kind: "final" };
  }

  if (algo === "selection") {
    for (let i = 0; i < n - 1; i++) {
      let smallest = i;
      out.push({
        ...base(),
        focus: i,
        mark: smallest,
        line: 3,
        note: `Vou preencher a posição ${i}. Por enquanto o candidato a menor é o próprio ${a[i]}, e eu ainda não sei nada sobre o resto.`,
      });
      for (let j = i + 1; j < n; j++) {
        comps++;
        const previous = smallest; // o candidato ANTES desta comparação
        const better = a[j] < a[smallest];
        if (better) smallest = j;
        out.push({
          ...base(),
          focus: i,
          pair: j,
          mark: smallest,
          line: 5,
          note: better
            ? `${a[j]} é menor que ${a[previous]} (posição ${previous}): achei um candidato melhor, o menor passa a ser o da posição ${j}.`
            : `${a[j]} não é menor que ${a[previous]}: o candidato continua sendo o da posição ${previous}. Mesmo assim tive que olhar, e é por isso que este algoritmo não tem melhor caso.`,
        });
      }
      if (smallest !== i) {
        const [x, y] = [a[i], a[smallest]];
        const distance = smallest - i;
        [a[i], a[smallest]] = [a[smallest], a[i]];
        writes += 2;
        out.push({
          ...base(),
          focus: i,
          pair: smallest,
          mark: -1,
          wrote: true,
          line: 8,
          note: `${y} vem da posição ${smallest} direto para a ${i}, um salto de ${distance} casa${distance === 1 ? "" : "s"}, e ${x} vai no lugar dele. Salto longo assim pode passar por cima de um valor igual, e é exatamente daí que vem a instabilidade do selection sort.`,
        });
      } else {
        out.push({
          ...base(),
          focus: i,
          mark: -1,
          line: 7,
          note: `O menor já era o próprio ${a[i]}: nenhuma escrita nesta rodada. As ${n - 1 - i} comparações, porém, foram feitas do mesmo jeito.`,
        });
      }
      region = { from: 0, to: i, kind: "final" };
      out.push({
        ...base(),
        line: 2,
        note: `Posição ${i} fechada com ${a[i]}. As posições 0 a ${i} estão definitivas e nunca mais serão tocadas.`,
      });
    }
    region = { from: 0, to: n - 1, kind: "final" };
  }

  if (algo === "insertion") {
    region = { from: 0, to: 0, kind: "sorted" };
    for (let i = 1; i < n; i++) {
      const current = a[i];
      out.push({
        ...base(),
        inHand: current,
        focus: i,
        line: 2,
        note: `Pego ${current} na mão. Tudo da posição 0 até a ${i - 1} já está em ordem entre si, então basta achar onde ${current} se encaixa nesse trecho.`,
      });
      let j = i - 1;
      let shifted = 0;
      while (j >= 0) {
        comps++;
        if (!(a[j] > current)) {
          out.push({
            ...base(),
            inHand: current,
            focus: j,
            pair: i,
            line: 4,
            note: `${a[j]} não é maior que ${current}: parei. Achei o lugar, logo depois da posição ${j}. Empate também para aqui, e é isso que preserva a ordem original entre iguais.`,
          });
          break;
        }
        a[j + 1] = a[j];
        writes++;
        shifted++;
        out.push({
          ...base(),
          inHand: current,
          focus: j + 1,
          pair: j,
          wrote: true,
          line: 5,
          note: `${a[j + 1]} é maior que ${current}, então empurro ele uma casa para a direita para abrir espaço. Cada empurrão desses corresponde a exatamente uma inversão da entrada.`,
        });
        j--;
      }
      a[j + 1] = current;
      writes++;
      region = { from: 0, to: i, kind: "sorted" };
      out.push({
        ...base(),
        inHand: current,
        focus: j + 1,
        wrote: true,
        line: 7,
        note: `${current} entra na posição ${j + 1} depois de ${shifted} deslocamento${shifted === 1 ? "" : "s"}. Atenção: o trecho 0 a ${i} está ordenado entre si, mas nenhuma dessas posições é definitiva, porque um valor pequeno lá na frente ainda vai entrar no meio delas.`,
        ok: shifted === 0,
      });
    }
    region = { from: 0, to: n - 1, kind: "final" };
  }

  out.push({
    ...base(),
    line: CODE[algo].length - 1,
    ok: true,
    note: `Ordenado: ${a.join(", ")}. ${comps} comparações e ${writes} escritas no array, sem nenhuma memória extra além de uma variável de apoio.`,
  });
  return out;
}

export const ALGOS: Algorithm[] = ["bubble", "selection", "insertion"];

// O custo total sai do MESMO gerador que a animação, de propósito: assim a
// corrida ao lado não tem como divergir do que o passo a passo mostra na tela.
export function cost(algo: Algorithm, values: number[]): { comps: number; writes: number } {
  const ps = generateSteps(algo, values);
  const f = ps[ps.length - 1];
  return { comps: f.comps, writes: f.writes };
}

export function OrdenacaoBasicaVisualizer() {
  const [algo, setAlgo] = useState<Algorithm>("bubble");
  const [presetKey, setPresetKey] = useState("shuffled");

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const steps = useMemo(() => generateSteps(algo, preset.values), [algo, preset]);
  const inv = useMemo(() => inversions(preset.values), [preset]);

  const viz = useVisualizer({
    title: "Visualizador · os três O(n²) sobre o mesmo array",
    total: steps.length,
    speeds: SPEEDS,
    initialSpeed: 4,
    // O que move a altura desta peça é o ALGORITMO: o bloco de código vai de 8
    // linhas (insertion) a 10 (bubble), 51px medidos. O preset entra porque é a
    // entrada inteira — ele troca o array e todas as notas da animação.
    measureOn: [algo, presetKey],
  });

  const s = steps[viz.step];

  const changeAlgo = (k: Algorithm) => {
    viz.reset();
    setAlgo(k);
  };
  const changePreset = (k: string) => {
    viz.reset();
    setPresetKey(k);
  };

  const inRegion = (i: number) => s.region !== null && i >= s.region.from && i <= s.region.to;
  const regionLabel =
    s.region === null
      ? "nada resolvido ainda"
      : s.region.kind === "final"
        ? `posições ${s.region.from} a ${s.region.to} definitivas: não são mais tocadas`
        : `posições ${s.region.from} a ${s.region.to} ordenadas entre si, mas ainda podem receber elementos no meio`;

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {ALGOS.map((k) => (
            <button
              key={k}
              className={`bigo-chip${algo === k ? " on" : ""}`}
              onClick={() => changeAlgo(k)}
              aria-pressed={algo === k}
            >
              {NAMES[k]}
            </button>
          ))}
        </div>
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

        <div className={`hs-fase ${s.region === null ? "" : PHASE_CLASS[s.region.kind]}`}>
          <span className="hs-fase-selo">{NAMES[algo]}</span>
          <span className="hs-fase-txt">{regionLabel}</span>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            O array <em>{s.region?.kind === "sorted" ? "verde = ordenado entre si, ainda não definitivo" : "verde = posição final"}</em>
          </div>
          <div className="hp-arr">
            {s.arr.map((v, i) => {
              const cls = ["hp-cel"];
              if (inRegion(i) && s.region) cls.push(CELL_CLASS[s.region.kind]);
              if (i === s.focus) cls.push("foco");
              else if (i === s.pair) cls.push("par");
              else if (i === s.mark) cls.push("alvo");
              if (s.wrote && (i === s.focus || i === s.pair)) cls.push("troca");
              return (
                <span key={i} className={cls.join(" ")}>
                  <i>{i}</i>
                  {v}
                </span>
              );
            })}
          </div>
        </div>

        <p className={"viz-note" + (s.ok ? " ok" : "")}>{s.note}</p>

        <div className="viz-split">
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">{algo}_sort.py</div>
              <div className="viz-code-body">
                {CODE[algo].map((txt, i) => (
                  <div key={i} className={`viz-line${i === s.line ? " on" : ""}`}>
                    <span className="ln">{i + 1}</span>
                    {txt}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div {...viz.varsProps}>
            <div className="viz-vars-head">Variáveis</div>
            <div className="viz-var">
              <span className="viz-var-name">
                {algo === "insertion" ? "atual (valor na mão)" : algo === "selection" ? "a[i] (posição a preencher)" : "a[j] (esquerda do par)"}
              </span>
              <span className="viz-var-val best">
                {algo === "insertion" ? (s.inHand >= 0 ? s.inHand : "-") : s.focus >= 0 ? s.arr[s.focus] : "-"}
              </span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">
                {algo === "selection" ? "a[j] (candidato da varredura)" : algo === "insertion" ? "a[j] (comparado)" : "a[j+1] (direita do par)"}
              </span>
              <span className="viz-var-val">{s.pair >= 0 ? s.arr[s.pair] : "-"}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">
                {algo === "selection" ? "menor (índice)" : algo === "bubble" ? "posições finais" : "trecho ordenado entre si"}
              </span>
              <span className="viz-var-val">
                {algo === "selection" ? (s.mark >= 0 ? s.mark : "-") : s.region === null ? 0 : s.region.to - s.region.from + 1}
              </span>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>tamanho do array</span>
            <strong>{s.arr.length}</strong>
          </div>
          <div className="bigo-stat">
            <span>comparações</span>
            <strong>{s.comps}</strong>
          </div>
          <div className="bigo-stat">
            <span>escritas no array</span>
            <strong>{s.writes}</strong>
          </div>
          <div className="bigo-stat">
            <span>inversões da entrada</span>
            <strong>{inv}</strong>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Rode os três no preset &quot;embaralhado&quot; e anote as comparações: 25, 28 e 17. Agora rode em
          &quot;já ordenado&quot;: 7, 28 e 7. O selection sort faz as mesmas 28 comparações nas duas entradas,
          porque ele precisa varrer o resto inteiro antes de ter certeza de quem é o menor. É esse detalhe que
          tira dele qualquer melhor caso.
        </p>
      </div>

      <VizFooter viz={viz} />
    </figure>
  );
}
