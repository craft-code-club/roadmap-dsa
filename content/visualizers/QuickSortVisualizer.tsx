"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// QuickSortVisualizer, a invariante da partição e o pivô que fica pronto.
//
// A única coisa que o aluno precisa enxergar é a INVARIANTE do laço de
// partição, porque é dela que sai tudo o mais. Em qualquer instante o trecho
// ativo está dividido em quatro regiões: os já conhecidos menores ou iguais ao
// pivô, os já conhecidos maiores, os ainda não vistos, e o pivô no fim. O laço
// só faz uma coisa, que é comer a região dos não vistos uma posição por vez.
//
// Por isso a faixa de regiões fica logo acima do array, com as quatro cores, e
// não um par de setas i/j soltas. Setas dizem onde os ponteiros estão; a faixa
// diz o que já se sabe, que é a informação que o algoritmo realmente carrega.
//
// A segunda ideia da tela é o contraste com o merge sort: aqui o pivô fica
// DEFINITIVO no meio do caminho, na descida. Por isso as posições de pivô já
// resolvidas continuam verdes mesmo quando a recursão está longe delas.
//
// Presets escolhidos para que três dos quatro sejam desastres, cada um por um
// motivo diferente: já ordenado, invertido e todos iguais. O quadrático do
// quick sort não é uma curiosidade teórica, ele mora nas entradas mais comuns
// que existem, e um preset "aleatório bonitinho" esconderia isso.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type Step = {
  arr: number[];
  lo: number;
  hi: number;
  i: number; // fronteira dos menores ou iguais
  j: number; // varredura
  pivotIdx: number;
  // As faixas da invariante saem do GERADOR, não de uma reconstrução na
  // renderização: só aqui dentro se sabe se a posição j já foi classificada ou
  // se ela ainda está em exame, e reconstruir isso a partir de i e j fazia a
  // faixa contradizer a nota no passo da comparação.
  partitioning: boolean;
  lessUpTo: number; // último índice comprovadamente <= pivô
  greaterUpTo: number; // último índice comprovadamente > pivô
  probing: number; // índice sendo examinado agora, ou -1
  fixed: number[];
  stack: string[];
  comparisons: number;
  swaps: number;
  noOpSwaps: number;
  depth: number;
  line: number;
  note: string;
  ok?: boolean;
};

const CODE = [
  "def quick_sort(a, lo, hi):",
  "    if lo >= hi: return           # 0 ou 1 elemento",
  "    p = particiona(a, lo, hi)",
  "    quick_sort(a, lo, p - 1)      # menores que o pivô",
  "    quick_sort(a, p + 1, hi)      # maiores que o pivô",
  "",
  "def particiona(a, lo, hi):",
  "    pivo = a[hi]                  # o último é o pivô",
  "    i = lo                        # fronteira dos menores",
  "    for j in range(lo, hi):",
  "        if a[j] <= pivo:",
  "            a[i], a[j] = a[j], a[i]",
  "            i += 1",
  "    a[i], a[hi] = a[hi], a[i]     # pivô vai para o lugar dele",
  "    return i",
];

type Preset = { key: string; label: string; values: number[]; hint: string };

const PRESETS: Preset[] = [
  {
    key: "shuffled",
    label: "Embaralhado: 5 3 13 1 7 6 21 3",
    values: [5, 3, 13, 1, 7, 6, 21, 3],
    hint: "O caso comum, e o único bom deste conjunto. Acompanhe a faixa de regiões: a região cinza (não vistos) só encolhe, nunca cresce, e quando ela zera o pivô entra no lugar definitivo dele.",
  },
  {
    key: "sorted",
    label: "Já ordenado: 1 2 3 4 5 6 7 8",
    values: [1, 2, 3, 4, 5, 6, 7, 8],
    hint: "O desastre mais famoso do quick sort. Com o pivô fixo no último elemento, o maior valor é sempre o pivô, tudo cai à esquerda dele e a partição direita nasce vazia. Compare a profundidade da recursão com a do preset embaralhado.",
  },
  {
    key: "reversed",
    label: "Ao contrário: 8 7 6 5 4 3 2 1",
    values: [8, 7, 6, 5, 4, 3, 2, 1],
    hint: "O mesmo desastre pelo motivo oposto: o pivô é sempre o menor valor, nada cai à esquerda e a partição esquerda nasce vazia. As duas entradas mais previsíveis do mundo são as duas piores para este pivô.",
  },
  {
    key: "equal",
    label: "Todos iguais: 4 4 4 4 4 4 4 4",
    values: [4, 4, 4, 4, 4, 4, 4, 4],
    hint: "O caso que mais surpreende. Não há nada para ordenar e mesmo assim o algoritmo faz o trabalho quadrático inteiro: como toda comparação passa no <=, a fronteira avança sempre e o pivô termina na última posição. Trocar o <= por < só inverte o lado do desastre.",
  },
];

// Este visualizador anda mais rápido que o padrão do hook: cada passo é uma
// comparação ou uma troca, e são até 115 deles num preset só.
const SPEEDS = [0, 1200, 800, 520, 320, 180];

export function generateSteps(values: number[]): Step[] {
  const a = [...values];
  const steps: Step[] = [];
  let comparisons = 0;
  let swaps = 0;
  let noOpSwaps = 0;
  let maxDepth = 0;
  const fixed = new Set<number>();
  const stack: string[] = [];
  const base = () => ({
    arr: [...a],
    i: -1,
    j: -1,
    pivotIdx: -1,
    partitioning: false,
    lessUpTo: -1,
    greaterUpTo: -1,
    probing: -1,
    fixed: [...fixed],
    stack: [...stack],
    comparisons,
    swaps,
    noOpSwaps,
    depth: maxDepth,
  });
  const swap = (x: number, y: number) => {
    swaps++;
    if (x === y) noOpSwaps++;
    else [a[x], a[y]] = [a[y], a[x]];
  };

  steps.push({
    ...base(),
    lo: 0,
    hi: a.length - 1,
    line: 0,
    note: `Entrada: ${a.join(", ")}. O quick sort escolhe um pivô, joga os menores para a esquerda dele e os maiores para a direita, e com isso o pivô já fica na posição final. Depois repete nos dois lados.`,
  });

  const quick = (lo: number, hi: number, depth: number) => {
    if (lo > hi) return; // intervalo vazio: nem chega a virar quadro de pilha
    maxDepth = Math.max(maxDepth, depth);
    if (lo === hi) {
      fixed.add(lo);
      steps.push({
        ...base(),
        lo,
        hi,
        line: 1,
        ok: true,
        note: `Trecho ${lo}..${lo} tem um elemento só (${a[lo]}). Um elemento sozinho já está ordenado, então esta chamada volta sem fazer nada.`,
      });
      return;
    }

    const pivot = a[hi];
    steps.push({
      ...base(),
      lo,
      hi,
      pivotIdx: hi,
      line: 7,
      note: `Chamada no trecho ${lo}..${hi}. Escolho o último elemento como pivô: ${pivot}. Ele é só a referência de comparação por enquanto, e a posição final dele ainda vai ser descoberta.`,
    });

    let i = lo;
    steps.push({
      ...base(),
      lo,
      hi,
      i,
      pivotIdx: hi,
      partitioning: true,
      lessUpTo: lo - 1,
      greaterUpTo: lo - 1,
      line: 8,
      note: `A fronteira i começa em ${lo}. A promessa dela é: tudo antes de i já foi visto e é menor ou igual ao pivô. Agora ela está vazia, e a promessa vale de graça.`,
    });

    for (let j = lo; j < hi; j++) {
      comparisons++;
      const fits = a[j] <= pivot;
      steps.push({
        ...base(),
        lo,
        hi,
        i,
        j,
        pivotIdx: hi,
        partitioning: true,
        lessUpTo: i - 1,
        greaterUpTo: j - 1,
        probing: j,
        line: 10,
        note: fits
          ? `${a[j]} <= ${pivot}: este elemento pertence ao lado dos menores. Vou trocá-lo com quem está na fronteira e empurrar a fronteira uma casa.`
          : `${a[j]} > ${pivot}: este elemento fica onde está, do lado dos maiores. A fronteira não anda, e nenhuma escrita acontece.`,
      });
      if (fits) {
        const same = i === j;
        const [atBoundary, scanned] = [a[i], a[j]]; // valores ANTES da troca
        swap(i, j);
        steps.push({
          ...base(),
          lo,
          hi,
          i,
          j,
          pivotIdx: hi,
          partitioning: true,
          lessUpTo: i,
          greaterUpTo: j,
          line: 11,
          note: same
            ? `Troca da posição ${i} com ela mesma: quando nenhum elemento maior apareceu ainda, i e j andam colados. O esquema de Lomuto faz muito disso, e é um dos motivos de ele perder em número de escritas para outros esquemas de partição.`
            : `${scanned} sai da posição ${j} e vai para a fronteira, em ${i}; ${atBoundary} faz o caminho inverso. Repare que ${atBoundary} era maior que o pivô: ele só mudou de casa dentro da região dos maiores, e continua do lado certo.`,
        });
        i++;
        steps.push({
          ...base(),
          lo,
          hi,
          i,
          j,
          pivotIdx: hi,
          partitioning: true,
          lessUpTo: i - 1,
          greaterUpTo: j,
          line: 12,
          note: `A fronteira avança para ${i}. Agora as posições ${lo} a ${i - 1} são, todas, menores ou iguais a ${pivot}.`,
        });
      }
    }

    const sameFinal = i === hi;
    swap(i, hi);
    fixed.add(i);
    const p = i;
    steps.push({
      ...base(),
      lo,
      hi,
      i,
      pivotIdx: p,
      line: 13,
      ok: true,
      note: `A varredura acabou e o pivô vai para a fronteira: troco a posição ${i} com a ${hi}. ${
        sameFinal ? "As duas são a mesma, então nada se move, e mesmo assim " : ""
      }A posição ${p} está definitiva: ${a[p]} tem ${p - lo} valores menores ou iguais à esquerda e ${hi - p} maiores à direita, que é exatamente o lugar dele no array ordenado. Ele nunca mais será tocado.`,
    });

    // Só entra na pilha o que é de fato chamada pendente: com o pivô na última
    // posição o lado direito nasce vazio, e mostrar "8..7" como algo a resolver
    // faria o painel de chamadas mentir.
    const hasRight = p < hi;
    if (hasRight) stack.push(`${p + 1}..${hi}`);
    steps.push({
      ...base(),
      lo,
      hi,
      pivotIdx: p,
      line: 3,
      note: hasRight
        ? `Guardo o lado direito (${p + 1}..${hi}, ${hi - p} elemento${hi - p === 1 ? "" : "s"}) para depois e desço no lado esquerdo, ${lo}..${p - 1}, com ${p - lo} elemento${p - lo === 1 ? "" : "s"}.`
        : `O pivô ficou na última posição, então o lado direito nasce vazio: não há nada para guardar. Desço direto no lado esquerdo, ${lo}..${p - 1}, com ${p - lo} elemento${p - lo === 1 ? "" : "s"}. Partição assim, ${p - lo} contra 0, é a definição do pior caso.`,
    });
    quick(lo, p - 1, depth + 1);
    if (hasRight) stack.pop();
    if (hasRight) {
      steps.push({
        ...base(),
        lo,
        hi,
        pivotIdx: p,
        line: 4,
        note: `Esquerda resolvida. Agora o lado direito, ${p + 1}..${hi}.`,
      });
      quick(p + 1, hi, depth + 1);
    }
  };

  quick(0, a.length - 1, 1);
  for (let k = 0; k < a.length; k++) fixed.add(k);
  steps.push({
    ...base(),
    lo: 0,
    hi: a.length - 1,
    line: 1,
    ok: true,
    note: `Ordenado: ${a.join(", ")}. Foram ${comparisons} comparações e ${swaps} trocas (${noOpSwaps} delas de um elemento com ele mesmo), com profundidade máxima de recursão ${maxDepth}. Nenhum array auxiliar foi criado: o único custo de memória é a pilha de chamadas.`,
  });
  return steps;
}

export function QuickSortVisualizer() {
  const [presetKey, setPresetKey] = useState("shuffled");

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const steps = useMemo(() => generateSteps(preset.values), [preset]);
  const n = preset.values.length;

  const viz = useVisualizer({
    title: "Visualizador · quick sort: a partição e o pivô que fica pronto",
    total: steps.length,
    speeds: SPEEDS,
    initialSpeed: 4,
    // O preset é a entrada inteira: ele troca a dica (a prosa mais longa da
    // peça) e o número de passos. O tamanho do array NÃO entra: os quatro
    // presets têm oito valores e não há campo para o aluno mudar isso.
    measureOn: [presetKey],
  });

  const s = steps[viz.step];

  const pickPreset = (k: string) => {
    viz.reset();
    setPresetKey(k);
  };

  const fixed = new Set(s.fixed);

  // As cinco faixas da invariante, todas vindas do passo. A de "em exame" tem
  // uma posição só e existe porque, no instante da comparação, aquele elemento
  // ainda não pertence a nenhum dos dois lados.
  //
  // `cls` é nome de classe do CSS compartilhado (`.ms-seg.menor`,
  // `.ms-seg.naovisto`, ...), não identificador: traduzir estes valores apagaria
  // a cor das faixas sem o `tsc`, o guarda de idioma ou um teste acusarem.
  const regions: { from: number; to: number; cls: string; text: string }[] = [];
  if (s.partitioning) {
    const firstUnseen = (s.probing >= 0 ? s.probing : s.greaterUpTo) + 1;
    if (s.lessUpTo >= s.lo) regions.push({ from: s.lo, to: s.lessUpTo, cls: "menor", text: "<= pivô" });
    if (s.greaterUpTo > s.lessUpTo) regions.push({ from: s.lessUpTo + 1, to: s.greaterUpTo, cls: "maior", text: "> pivô" });
    if (s.probing >= 0) regions.push({ from: s.probing, to: s.probing, cls: "exame", text: "em exame" });
    if (s.hi - 1 >= firstUnseen) regions.push({ from: firstUnseen, to: s.hi - 1, cls: "naovisto", text: "não vistos" });
    regions.push({ from: s.hi, to: s.hi, cls: "pivo", text: "pivô" });
  }

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              type="button"
              key={pr.key}
              className={`bigo-chip${presetKey === pr.key ? " on" : ""}`}
              onClick={() => pickPreset(pr.key)}
              aria-pressed={presetKey === pr.key}
            >
              {pr.label}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">{preset.hint}</p>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            A invariante da partição <em>o que o algoritmo já sabe sobre cada faixa</em>
          </div>
          <div className="ms-nivel-faixa" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {regions.length > 0 ? (
              regions.map((r) => (
                <span key={r.cls} className={`ms-seg ${r.cls}`} style={{ gridColumn: `${r.from + 1} / ${r.to + 2}` }}>
                  {r.text}
                </span>
              ))
            ) : (
              <span className="ms-seg" style={{ gridColumn: `1 / ${n + 1}` }}>
                nenhuma partição em andamento
              </span>
            )}
          </div>
          <div className="hp-arr" style={{ marginTop: 8 }}>
            {s.arr.map((v, k) => {
              const cls = ["hp-cel"];
              if (fixed.has(k)) cls.push("fixo");
              else if (k < s.lo || k > s.hi) cls.push("fantasma");
              if (k === s.pivotIdx) cls.push("pivo");
              else if (k === s.j) cls.push("par");
              else if (k === s.i) cls.push("alvo");
              return (
                <span key={k} className={cls.join(" ")}>
                  <i>{k}</i>
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
              <div className="viz-code-head">quick_sort.py</div>
              <div className="viz-code-body">
                {CODE.map((txt, k) => (
                  <div key={k} className={`viz-line${k === s.line ? " on" : ""}`}>
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
              <span className="viz-var-name">trecho ativo</span>
              <span className="viz-var-val best">
                {s.lo}..{s.hi}
              </span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">i (fronteira) / j (varre)</span>
              <span className="viz-var-val">
                {s.i >= 0 ? s.i : "-"} / {s.j >= 0 ? s.j : "-"}
              </span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">chamadas esperando</span>
              <span className="viz-var-val">{s.stack.length > 0 ? s.stack.join(" ") : "nenhuma"}</span>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>comparações</span>
            <strong>{s.comparisons}</strong>
          </div>
          <div className="bigo-stat">
            <span>trocas executadas</span>
            <strong>{s.swaps}</strong>
          </div>
          <div className="bigo-stat">
            <span>trocas sem efeito</span>
            <strong>{s.noOpSwaps}</strong>
          </div>
          <div className="bigo-stat">
            <span>profundidade da recursão</span>
            <strong>{s.depth}</strong>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Rode até o fim e compare a profundidade da recursão: 4 no embaralhado e 8 nos três desastres. Com 8
          elementos, uma recursão de profundidade 8 quer dizer que cada partição eliminou um elemento só, que é
          a definição do pior caso. As comparações vão de 14 para 28, e 28 é exatamente n(n-1)/2, o mesmo custo
          do selection sort.
        </p>
      </div>

      <VizFooter viz={viz} />
    </figure>
  );
}
