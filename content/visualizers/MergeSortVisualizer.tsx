"use client";

import { useMemo, useState } from "react";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// MergeSortVisualizer, a descida que não faz nada e a subida que faz tudo.
//
// A única coisa que o aluno precisa enxergar é ONDE o trabalho acontece. A
// intuição errada mais comum é achar que o merge sort "vai dividindo e
// ordenando"; ele não ordena nada na descida. Dividir é aritmética de índice, e
// a ordenação inteira mora na intercalação, que é a volta da recursão.
//
// Por isso a tela tem duas camadas que se movem juntas: as faixas de nível, que
// são o mapa da recursão inteira (cada trecho aparece no nível em que nasce, e
// fica verde quando volta ordenado), e o painel de intercalação, que só existe
// quando há dois lados prontos para comparar. Enquanto a faixa desce, o painel
// some: é essa ausência que ensina que a descida é de graça.
//
// A geometria das faixas vem do tamanho TOTAL do array, nunca do trecho ativo.
// Com o envelope fixo, o trecho ativo simplesmente acende no lugar dele, e o
// aluno consegue seguir uma posição específica do começo ao fim.
//
// Rejeitada a árvore em SVG com nós e arestas: ela desenha bem a estrutura da
// recursão e desalinha o trecho do array que cada nó representa, que é
// justamente a ligação que precisa ficar óbvia aqui.
// ---------------------------------------------------------------------------

type Merge = { left: number[]; right: number[]; i: number; j: number; output: number[]; lo: number; picked: "left" | "right" | null };

type Step = {
  arr: number[];
  lo: number;
  hi: number;
  mid: number;
  done: string[];
  merge: Merge | null;
  comparisons: number;
  copies: number;
  line: number;
  note: string;
  ok?: boolean;
};

const CODE = [
  "def merge_sort(a, lo, hi):",
  "    if lo >= hi: return      # 1 elemento já está ordenado",
  "    mid = lo + (hi - lo) // 2",
  "    merge_sort(a, lo, mid)       # resolve a esquerda",
  "    merge_sort(a, mid + 1, hi)   # resolve a direita",
  "    merge(a, lo, mid, hi)        # e só então ordena",
  "",
  "def merge(a, lo, mid, hi):",
  "    esq, dir = a[lo:mid + 1], a[mid + 1:hi + 1]",
  "    i = j = 0",
  "    for k in range(lo, hi + 1):",
  "        if j >= len(dir) or (i < len(esq) and esq[i] <= dir[j]):",
  "            a[k] = esq[i]; i += 1",
  "        else:",
  "            a[k] = dir[j]; j += 1",
];

type Preset = { key: string; label: string; values: number[]; hint: string };

const PRESETS: Preset[] = [
  {
    key: "seven",
    label: "Sete valores: 38 27 43 3 9 82 10",
    values: [38, 27, 43, 3, 9, 82, 10],
    hint: "Sete elementos, ou seja, divisão ímpar. Repare nas faixas de nível: o lado esquerdo fica com quatro posições e o direito com três, e a diferença entre os dois lados nunca passa de um elemento, por mais fundo que a recursão vá.",
  },
  {
    key: "sorted",
    label: "Já ordenado: 1 2 3 4 5 6 7 8",
    values: [1, 2, 3, 4, 5, 6, 7, 8],
    hint: "A entrada já pronta. O merge sort desce e sobe a árvore inteira do mesmo jeito, e o único desconto aparece nas comparações: cada intercalação esvazia o lado esquerdo primeiro e copia o direito em bloco.",
  },
  {
    key: "worst",
    label: "Pior caso: 1 3 2 7 4 6 5 8",
    values: [1, 3, 2, 7, 4, 6, 5, 8],
    hint: "A entrada mais cara que existe para o merge sort com oito elementos, achada testando as 40.320 permutações possíveis. Ela custa 17 comparações. O melhor caso custa 12. Cinco comparações separam o melhor do pior, e é isso que quer dizer ter garantia.",
  },
  {
    key: "reversed",
    label: "Ao contrário: 8 7 6 5 4 3 2 1",
    values: [8, 7, 6, 5, 4, 3, 2, 1],
    hint: "A entrada mais hostil para quase todo algoritmo, e para o merge sort é só mais uma: custa as mesmas 12 comparações do array já ordenado. A estrutura da recursão não depende dos dados, então não existe entrada capaz de derrubá-lo.",
  },
];

// Ritmo próprio: uma intercalação tem passos curtos e muitos, então cada marcha
// é mais rápida que a do hook. Não é o DEFAULT_SPEEDS.
const SPEEDS = [0, 1200, 800, 520, 320, 180];

type Seg = { lo: number; hi: number; depth: number };

// O mapa da recursão é determinístico: depende só de n. Calcular fora do
// gerador deixa as faixas fixas, e é o que permite acompanhar uma posição.
export function segments(n: number): Seg[][] {
  const levels: Seg[][] = [];
  const visit = (lo: number, hi: number, depth: number) => {
    (levels[depth] ??= []).push({ lo, hi, depth });
    if (lo >= hi) return;
    const mid = lo + ((hi - lo) >> 1);
    visit(lo, mid, depth + 1);
    visit(mid + 1, hi, depth + 1);
  };
  visit(0, n - 1, 0);
  return levels;
}

const segKey = (lo: number, hi: number) => `${lo}-${hi}`;

export function generateSteps(values: number[]): Step[] {
  const a = [...values];
  const steps: Step[] = [];
  let comparisons = 0;
  let copies = 0;
  const done = new Set<string>();
  const base = () => ({ arr: [...a], mid: -1, done: [...done], merge: null as Merge | null, comparisons, copies });

  steps.push({
    ...base(),
    lo: 0,
    hi: a.length - 1,
    line: 0,
    note: `Entrada: ${a.join(", ")}. O merge sort vai quebrar isto pela metade até sobrar um elemento por trecho, e só então começar a ordenar de verdade, na volta.`,
  });

  const sortRange = (lo: number, hi: number) => {
    if (lo >= hi) {
      done.add(segKey(lo, hi));
      steps.push({
        ...base(),
        lo,
        hi,
        line: 1,
        ok: true,
        note: `Trecho ${lo}..${lo} tem um elemento só (${a[lo]}). Um array de um elemento já está ordenado por definição, então este é o caso base e a descida para aqui.`,
      });
      return;
    }
    const mid = lo + ((hi - lo) >> 1);
    steps.push({
      ...base(),
      lo,
      hi,
      mid,
      line: 2,
      note: `Divido o trecho ${lo}..${hi} (${a.slice(lo, hi + 1).join(", ")}) no meio: ${lo}..${mid} com ${mid - lo + 1} posições e ${mid + 1}..${hi} com ${hi - mid}. Nenhuma comparação acontece aqui: dividir é só aritmética de índice.`,
    });
    steps.push({ ...base(), lo, hi, mid, line: 3, note: `Desço primeiro pela esquerda, ${lo}..${mid}. Só volto daqui com esse trecho ordenado.` });
    sortRange(lo, mid);
    steps.push({ ...base(), lo, hi, mid, line: 4, note: `A esquerda voltou ordenada (${a.slice(lo, mid + 1).join(", ")}). Agora desço pela direita, ${mid + 1}..${hi}.` });
    sortRange(mid + 1, hi);

    // ---- intercalação: é aqui, e só aqui, que a ordenação acontece ---------
    const left = a.slice(lo, mid + 1);
    const right = a.slice(mid + 1, hi + 1);
    const output: number[] = [];
    let i = 0;
    let j = 0;
    const m = (picked: "left" | "right" | null): Merge => ({ left, right, i, j, output: [...output], lo, picked });
    steps.push({
      ...base(),
      lo,
      hi,
      mid,
      merge: m(null),
      line: 8,
      note: `Os dois lados voltaram ordenados: ${left.join(", ")} e ${right.join(", ")}. Agora intercalo os dois num buffer, e é esta operação que ordena. Todo o resto do algoritmo só existe para chegar aqui com os dois lados prontos.`,
    });
    for (let k = lo; k <= hi; k++) {
      const takeLeft = j >= right.length || (i < left.length && left[i] <= right[j]);
      if (i < left.length && j < right.length) {
        comparisons++;
        steps.push({
          ...base(),
          lo,
          hi,
          mid,
          merge: m(null),
          line: 11,
          note: `Comparo o topo dos dois lados: ${left[i]} da esquerda contra ${right[j]} da direita. ${
            left[i] === right[j]
              ? `Empate. O sinal é <=, então o da esquerda vai primeiro, e é essa escolha que torna o merge sort estável.`
              : `Vai o menor, ${Math.min(left[i], right[j])}, da ${takeLeft ? "esquerda" : "direita"}.`
          }`,
        });
      } else {
        steps.push({
          ...base(),
          lo,
          hi,
          mid,
          merge: m(null),
          line: 11,
          note: `A ${j >= right.length ? "direita" : "esquerda"} acabou. Tudo que resta do outro lado já está ordenado e é maior que tudo que já saiu, então entra em bloco, sem nenhuma comparação.`,
          ok: true,
        });
      }
      const v = takeLeft ? left[i++] : right[j++];
      output.push(v);
      copies++;
      steps.push({
        ...base(),
        lo,
        hi,
        mid,
        merge: m(takeLeft ? "left" : "right"),
        line: takeLeft ? 12 : 14,
        note: `${v} sai da ${takeLeft ? "esquerda" : "direita"} e ocupa a posição ${k} do buffer. O ponteiro daquele lado anda uma casa; o outro fica parado.`,
      });
    }
    for (let k = 0; k < output.length; k++) a[lo + k] = output[k];
    done.add(segKey(lo, hi));
    steps.push({
      ...base(),
      lo,
      hi,
      mid,
      line: 5,
      ok: true,
      note: `Trecho ${lo}..${hi} ordenado: ${output.join(", ")}. Ele volta pronto para quem chamou, e quem chamou vai usá-lo como um dos lados da próxima intercalação.`,
    });
  };

  sortRange(0, a.length - 1);
  steps.push({
    ...base(),
    lo: 0,
    hi: a.length - 1,
    line: 5,
    ok: true,
    note: `Ordenado: ${a.join(", ")}. Foram ${comparisons} comparações e ${copies} cópias, com um buffer auxiliar do tamanho do trecho sendo intercalado. Esse buffer é o preço do merge sort, e é o que ele compra com uma garantia que nenhuma entrada quebra.`,
  });
  return steps;
}

export function MergeSortVisualizer() {
  const [presetKey, setPresetKey] = useState("seven");

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const steps = useMemo(() => generateSteps(preset.values), [preset]);
  const levels = useMemo(() => segments(preset.values.length), [preset]);
  const n = preset.values.length;

  const viz = useVisualizer({
    title: "Visualizador · merge sort: a descida divide, a subida ordena",
    total: steps.length,
    speeds: SPEEDS,
    initialSpeed: 4,
    // O preset é o único controle da peça: ele troca o array (e com ele as
    // faixas e o número de passos) e a dica, que é o bloco de texto que mais
    // muda de altura entre eles.
    measureOn: [presetKey],
  });

  const s = steps[viz.step];
  const ready = new Set(s.done);

  const changePreset = (k: string) => {
    viz.reset();
    setPresetKey(k);
  };

  return viz.inPanel(
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

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            O mapa da recursão <em>azul = trecho ativo, verde = já voltou ordenado</em>
          </div>
          <div className="ms-niveis">
            {levels.map((segs, depth) => (
              <div className="ms-nivel" key={depth}>
                <span className="ms-nivel-rot">nível {depth}</span>
                <div className="ms-nivel-faixa" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                  {segs.map((sg) => {
                    const cls = ["ms-seg"];
                    if (ready.has(segKey(sg.lo, sg.hi))) cls.push("pronto");
                    if (sg.lo === s.lo && sg.hi === s.hi) cls.push("ativo");
                    return (
                      <span key={`${sg.lo}-${sg.hi}`} className={cls.join(" ")} style={{ gridColumn: `${sg.lo + 1} / ${sg.hi + 2}` }}>
                        {sg.lo === sg.hi ? sg.lo : `${sg.lo}..${sg.hi}`}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            O array <em>as posições fora do trecho ativo ficam apagadas</em>
          </div>
          <div className="hp-arr">
            {s.arr.map((v, i) => {
              const cls = ["hp-cel"];
              if (i < s.lo || i > s.hi) cls.push("fantasma");
              else if (s.mid >= 0 && i <= s.mid) cls.push("foco");
              else cls.push("par");
              return (
                <span key={i} className={cls.join(" ")}>
                  <i>{i}</i>
                  {v}
                </span>
              );
            })}
          </div>
        </div>

        {s.merge ? (
          <div className="hp-bloco">
            <div className="tt-painel-tit">
              A intercalação <em>o algoritmo inteiro existe para chegar aqui</em>
            </div>
            <div className="ms-merge">
              <div className="ms-lado">
                <span className="ms-lado-rot">esquerda</span>
                <div className="hp-arr">
                  {s.merge.left.map((v, k) => (
                    <span key={k} className={`hp-cel${k < s.merge!.i ? " fantasma" : k === s.merge!.i ? " foco" : ""}`}>
                      <i>{s.merge!.lo + k}</i>
                      {v}
                    </span>
                  ))}
                </div>
              </div>
              <div className="ms-lado">
                <span className="ms-lado-rot">direita</span>
                <div className="hp-arr">
                  {s.merge.right.map((v, k) => (
                    <span key={k} className={`hp-cel${k < s.merge!.j ? " fantasma" : k === s.merge!.j ? " par" : ""}`}>
                      <i>{s.merge!.lo + s.merge!.left.length + k}</i>
                      {v}
                    </span>
                  ))}
                </div>
              </div>
              <div className="ms-lado saida">
                <span className="ms-lado-rot">buffer de saída</span>
                <div className="hp-arr">
                  {s.merge.output.map((v, k) => (
                    <span key={k} className={`hp-cel fixo${k === s.merge!.output.length - 1 && s.merge!.picked ? " troca" : ""}`}>
                      <i>{s.merge!.lo + k}</i>
                      {v}
                    </span>
                  ))}
                  {s.merge.output.length === 0 ? <span className="bb-array-nota">vazio</span> : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <p className={"viz-note" + (s.ok ? " ok" : "")}>{s.note}</p>

        <div className="viz-split">
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">merge_sort.py</div>
              <div className="viz-code-body">
                {CODE.map((txt, i) => (
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
              <span className="viz-var-name">trecho ativo</span>
              <span className="viz-var-val best">
                {s.lo}..{s.hi}
              </span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">mid</span>
              <span className="viz-var-val">{s.mid >= 0 ? s.mid : "-"}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">i, j (topo de cada lado)</span>
              <span className="viz-var-val">{s.merge ? `${s.merge.i}, ${s.merge.j}` : "-"}</span>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>tamanho do array</span>
            <strong>{n}</strong>
          </div>
          <div className="bigo-stat">
            <span>comparações</span>
            <strong>{s.comparisons}</strong>
          </div>
          <div className="bigo-stat">
            <span>cópias para o buffer</span>
            <strong>{s.copies}</strong>
          </div>
          <div className="bigo-stat">
            <span>níveis de recursão</span>
            <strong>{levels.length}</strong>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Rode até o fim nos três presets de oito elementos e anote as comparações: 12 no já ordenado, 12 no
          invertido e 17 no pior caso. Toda entrada de oito elementos cai nessa faixa, sem exceção. As cópias
          são 24 nos três, sempre, porque as 3 rodadas de intercalação movem os 8 elementos uma vez cada. Para
          efeito de comparação, o insertion sort vai de 7 a 28 comparações no mesmo tamanho de array.
        </p>
      </div>

      <VizFooter viz={viz} />
    </figure>
  );
}
