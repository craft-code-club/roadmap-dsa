"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// BinaryHeapVisualizer, as três operações que definem o heap.
//
// O heap tem uma dificuldade didática própria: ele é UMA estrutura vista de
// DUAS formas (árvore completa e array), e o aluno precisa enxergar as duas se
// movendo juntas. Por isso a árvore em SVG e o array ficam sempre lado a lado,
// com o mesmo destaque nos mesmos índices.
//
// Três modos, porque o heap tem três histórias diferentes:
//
//   - insert : o valor entra no FIM e sobe (sift up). Trocar o preset de
//              "crescente" para "decrescente" mostra o melhor caso (zero
//              trocas) virar o pior (toda inserção sobe até a raiz).
//   - remove : a raiz sai, o ÚLTIMO sobe para o lugar dela e desce (sift
//              down). Rodando até o fim, a saída sai ordenada: é heap sort.
//   - build  : heapify a partir do último pai. O painel compara as trocas do
//              build-heap com as de inserir um a um, que é o argumento
//              medido de por que build-heap é O(n) e não O(n log n).
//
// Gerador puro: cada passo carrega o snapshot do array, então navegar para
// trás é de graça e não existe estado escondido.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type HeapKind = "min" | "max";
type Mode = "insert" | "remove" | "build";

type Step = {
  arr: number[];
  n: number; // quantos elementos do array ainda pertencem ao heap
  focus: number; // índice em foco
  partner: number; // com quem ele está sendo comparado (-1 = ninguém)
  swapped: boolean; // este passo acabou de executar uma troca
  entering: number; // índice que acabou de entrar no fim (-1 = nenhum)
  output: number[]; // valores já removidos, na ordem
  comparisons: number;
  swaps: number;
  line: number;
  note: string;
  ok?: boolean;
};

const CODE_INSERT = [
  "def push(heap, valor):",
  "    heap.append(valor)          # entra sempre no FIM",
  "    i = len(heap) - 1",
  "    while i > 0:",
  "        pai = (i - 1) // 2",
  "        if heap[pai] <= heap[i]:",
  "            break               # a regra já vale, parei",
  "        heap[pai], heap[i] = heap[i], heap[pai]",
  "        i = pai                 # subo e comparo de novo",
];

const CODE_REMOVE = [
  "def pop(heap):",
  "    topo = heap[0]",
  "    heap[0] = heap[-1]          # o ÚLTIMO sobe para a raiz",
  "    heap.pop()",
  "    desce(heap, 0)",
  "    return topo",
  "",
  "def desce(heap, i):",
  "    while True:",
  "        menor, e, d = i, 2*i + 1, 2*i + 2",
  "        if e < len(heap) and heap[e] < heap[menor]: menor = e",
  "        if d < len(heap) and heap[d] < heap[menor]: menor = d",
  "        if menor == i: return   # nenhum filho é menor, parei",
  "        heap[i], heap[menor] = heap[menor], heap[i]",
  "        i = menor",
];

const CODE_BUILD = [
  "def build_heap(a):",
  "    # o último PAI é o único ponto de partida que faz sentido:",
  "    # folha não tem filho, então não tem para onde descer",
  "    for i in range(len(a) // 2 - 1, -1, -1):",
  "        desce(a, i)",
  "",
  "def desce(a, i):",
  "    while True:",
  "        menor, e, d = i, 2*i + 1, 2*i + 2",
  "        if e < len(a) and a[e] < a[menor]: menor = e",
  "        if d < len(a) and a[d] < a[menor]: menor = d",
  "        if menor == i: return",
  "        a[i], a[menor] = a[menor], a[i]",
  "        i = menor",
];

type Preset = { key: string; label: string; values: number[]; hint: string };

const PRESETS: Preset[] = [
  {
    key: "arrival",
    label: "Ordem de chegada: 3 5 2 1 4 6",
    values: [3, 5, 2, 1, 4, 6],
    hint: "Seis valores em ordem embaralhada. Repare que o array final NÃO fica ordenado, e mesmo assim a regra do heap vale em todos os nós.",
  },
  {
    key: "ascending",
    label: "Chegando em ordem: 1 2 3 4 5 6 7 8 9",
    values: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    hint: "Nove valores em ordem crescente. Num min-heap cada um já chega maior que o pai e nada se move: 0 trocas. Troque para max-heap e as mesmas nove inserções custam 16 trocas, porque aí todo valor que chega é o novo máximo e sobe até a raiz.",
  },
  {
    key: "descending",
    label: "Chegando ao contrário: 9 8 7 6 5 4 3 2 1",
    values: [9, 8, 7, 6, 5, 4, 3, 2, 1],
    hint: "Os MESMOS nove valores, na ordem inversa, e os papéis se invertem: agora é o min-heap que paga as 16 trocas e o max-heap que não move nada. A ordem de chegada decide o trabalho, e o teto é sempre a altura da árvore.",
  },
  {
    key: "duplicates",
    label: "Com repetidos: 20 15 10 40 50 100 25 15",
    values: [20, 15, 10, 40, 50, 100, 25, 15],
    hint: "Valores iguais convivem sem problema: a regra é pai menor ou IGUAL ao filho, então empate não é violação.",
  },
];

// `parent` respeita a regra em relação a `child`?
function respects(parent: number, child: number, kind: HeapKind) {
  return kind === "min" ? parent <= child : parent >= child;
}
function better(a: number, b: number, kind: HeapKind) {
  return kind === "min" ? a < b : a > b;
}

const topName = (kind: HeapKind) => (kind === "min" ? "menor" : "maior");

// --- geradores puros -------------------------------------------------------

function stepsInsert(values: number[], kind: HeapKind): Step[] {
  const steps: Step[] = [];
  const h: number[] = [];
  let comparisons = 0;
  let swaps = 0;
  const base = () => ({ arr: [...h], n: h.length, output: [], comparisons, swaps, swapped: false, entering: -1, partner: -1 });

  for (const v of values) {
    h.push(v);
    let i = h.length - 1;
    steps.push({
      ...base(), focus: i, entering: i, line: 1,
      note: `${v} entra no FIM do array, na posição ${i}. É a única posição que mantém a árvore completa, então nem preciso procurar onde colocar.`,
    });
    let guard = 0;
    while (i > 0 && guard++ < 200) {
      const parent = (i - 1) >> 1;
      comparisons++;
      steps.push({
        ...base(), focus: i, partner: parent, line: 4,
        note: `Comparo com o pai: índice ${i} tem pai (${i} - 1) // 2 = ${parent}. É ${h[parent]} contra ${h[i]}.`,
      });
      if (respects(h[parent], h[i], kind)) {
        steps.push({
          ...base(), focus: i, partner: parent, line: 6, ok: true,
          note: `${h[parent]} ${h[parent] === h[i] ? "empata com" : kind === "min" ? "é menor que" : "é maior que"} ${h[i]}: a regra já vale aqui, e como ela valia acima, vale na árvore inteira. Paro sem subir mais.`,
        });
        break;
      }
      [h[parent], h[i]] = [h[i], h[parent]];
      swaps++;
      const prevI = i;
      i = parent;
      steps.push({
        ...base(), focus: i, partner: prevI, swapped: true, line: 7,
        note: `${h[i]} ${kind === "min" ? "é menor" : "é maior"} que ${h[prevI]}: violação. Troco os dois e ${h[i]} sobe para a posição ${i}. Só este caminho até a raiz é tocado, o resto da árvore nem fica sabendo.`,
      });
    }
    if (i === 0 && h.length > 1) {
      steps.push({
        ...base(), focus: 0, line: 3, ok: true,
        note: `Cheguei na raiz: não existe pai da posição 0, então a subida acabou. ${h[0]} é o ${topName(kind)} valor do heap.`,
      });
    }
  }
  const treeHeight = height(h.length);
  steps.push({
    ...base(), focus: -1, line: 8, ok: true,
    note: `Heap montado com ${h.length} elementos e altura ${treeHeight}. Foram ${comparisons} comparações e ${swaps} trocas. Repare no array: ele NÃO está ordenado, e não precisa estar. A única promessa é que todo pai respeita a regra em relação aos filhos dele.`,
  });
  return steps;
}

function buildHeapByInsertion(values: number[], kind: HeapKind) {
  const h: number[] = [];
  let comparisons = 0;
  let swaps = 0;
  for (const v of values) {
    h.push(v);
    let i = h.length - 1;
    let guard = 0;
    while (i > 0 && guard++ < 200) {
      const parent = (i - 1) >> 1;
      comparisons++;
      if (respects(h[parent], h[i], kind)) break;
      [h[parent], h[i]] = [h[i], h[parent]];
      swaps++;
      i = parent;
    }
  }
  return { heap: h, comparisons, swaps };
}

function stepsRemove(values: number[], kind: HeapKind): Step[] {
  const { heap } = buildHeapByInsertion(values, kind);
  const h = [...heap];
  const output: number[] = [];
  const steps: Step[] = [];
  let comparisons = 0;
  let swaps = 0;
  const base = () => ({ arr: [...h], n: h.length, output: [...output], comparisons, swaps, swapped: false, entering: -1, partner: -1 });

  steps.push({
    ...base(), focus: 0, line: 0,
    note: `Heap pronto com ${h.length} elementos. O ${topName(kind)} valor está sempre na posição 0, e olhar para ele custa O(1). O caro é REMOVER e manter a regra.`,
  });

  let round = 0;
  while (h.length > 0 && round++ < 60) {
    const top = h[0];
    steps.push({
      ...base(), focus: 0, line: 1,
      note: `Guardo o topo (${top}) para devolver. Agora preciso de uma raiz nova sem quebrar a forma completa da árvore.`,
    });
    const last = h[h.length - 1];
    if (h.length > 1) {
      h[0] = last;
      h.pop();
      steps.push({
        ...base(), focus: 0, swapped: true, line: 2,
        note: `O ÚLTIMO elemento (${last}) sobe para a raiz. Por que o último? Porque tirar ele do fim é a única remoção que mantém a árvore completa. O preço é que a regra provavelmente quebrou lá em cima.`,
      });
    } else {
      h.pop();
    }
    output.push(top);

    let i = 0;
    let guard = 0;
    while (guard++ < 200) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left >= h.length) {
        if (h.length > 0) {
          steps.push({
            ...base(), focus: i, line: 12, ok: true,
            note: `A posição ${i} não tem filho (2 x ${i} + 1 = ${left} já passou do fim do heap), então cheguei numa folha e a descida acabou. Saída até aqui: ${output.join(", ")}.`,
          });
        }
        break;
      }
      let target = i;
      comparisons++;
      if (better(h[left], h[target], kind)) target = left;
      let cmpNote = `Filhos da posição ${i}: esquerda em 2 x ${i} + 1 = ${left} (valor ${h[left]})`;
      if (right < h.length) {
        comparisons++;
        cmpNote += ` e direita em 2 x ${i} + 2 = ${right} (valor ${h[right]})`;
        if (better(h[right], h[target], kind)) target = right;
      } else {
        cmpNote += ` (não existe filho à direita)`;
      }
      steps.push({
        ...base(), focus: i, partner: target === i ? -1 : target, line: right < h.length ? 11 : 10,
        note: `${cmpNote}. Comparo os três de uma vez: quem for o ${topName(kind)} da tríade tem que ficar por cima.`,
      });
      if (target === i) {
        steps.push({
          ...base(), focus: i, line: 12, ok: true,
          note: `${h[i]} já é o ${topName(kind)} entre pai e filhos, então a regra voltou a valer daqui para baixo. Paro. Saída até aqui: ${output.join(", ")}.`,
        });
        break;
      }
      const promoted = h[target];
      [h[i], h[target]] = [h[target], h[i]];
      swaps++;
      const prev = i;
      i = target;
      steps.push({
        ...base(), focus: i, partner: prev, swapped: true, line: 13,
        note: `${promoted} sobe para a posição ${prev} e ${h[i]} desce para ${i}. Continuo a descida por ESTE ramo só: o outro filho e toda a subárvore dele ficam intocados, e é daí que vem o log.`,
      });
    }
  }

  steps.push({
    ...base(), focus: -1, line: 5, ok: true,
    note: `Heap vazio. A ordem de saída foi ${output.join(", ")}: ordenada, do ${topName(kind)} para o outro extremo. Tirar tudo de um heap é exatamente isso, e é a ideia do heap sort.`,
  });
  return steps;
}

function stepsBuild(values: number[], kind: HeapKind): Step[] {
  const h = [...values];
  const steps: Step[] = [];
  let comparisons = 0;
  let swaps = 0;
  const base = () => ({ arr: [...h], n: h.length, output: [], comparisons, swaps, swapped: false, entering: -1, partner: -1 });

  const lastParent = Math.floor(h.length / 2) - 1;
  steps.push({
    ...base(), focus: -1, line: 0,
    note: `Array cru, sem nenhuma garantia: ${h.join(", ")}. Vou transformá-lo em heap sem criar nada novo, mexendo só nas posições que já existem.`,
  });
  steps.push({
    ...base(), focus: lastParent, line: 3,
    note: `Começo no índice ${lastParent}, que é ${h.length} // 2 - 1: o ÚLTIMO nó que tem filho. Da metade do array para a frente só existe folha, e folha não tem para onde descer. Metade do trabalho some com esta única conta.`,
  });

  for (let root = lastParent; root >= 0; root--) {
    steps.push({
      ...base(), focus: root, line: 4,
      note: `Desço a partir da posição ${root} (valor ${h[root]}). Tudo que está ABAIXO dela já virou heap nas rodadas anteriores, então só falta acertar este nó.`,
    });
    let i = root;
    let guard = 0;
    while (guard++ < 200) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left >= h.length) break;
      let target = i;
      comparisons++;
      if (better(h[left], h[target], kind)) target = left;
      if (right < h.length) {
        comparisons++;
        if (better(h[right], h[target], kind)) target = right;
      }
      steps.push({
        ...base(), focus: i, partner: target === i ? -1 : target, line: right < h.length ? 10 : 9,
        note: `Na posição ${i} tenho ${h[i]}, com filho${right < h.length ? "s" : ""} ${h[left]}${right < h.length ? ` e ${h[right]}` : ""}. O ${topName(kind)} da tríade é ${h[target]}.`,
      });
      if (target === i) {
        steps.push({
          ...base(), focus: i, line: 11, ok: true,
          note: `${h[i]} já é o ${topName(kind)} da tríade: esta subárvore está válida e não desço mais.`,
        });
        break;
      }
      const promoted = h[target];
      [h[i], h[target]] = [h[target], h[i]];
      swaps++;
      const prev = i;
      i = target;
      steps.push({
        ...base(), focus: i, partner: prev, swapped: true, line: 12,
        note: `Troco: ${promoted} sobe para ${prev}, ${h[i]} desce para ${i}. Como o valor desceu, a subárvore de ${i} pode ter quebrado, então continuo a descida por ela.`,
      });
    }
  }

  const byInsertion = buildHeapByInsertion(values, kind);
  steps.push({
    ...base(), focus: -1, line: 4, ok: true,
    note: `Heap pronto: ${h.join(", ")}. Foram ${swaps} trocas em ${comparisons} comparações, contra ${byInsertion.swaps} trocas em ${byInsertion.comparisons} comparações para inserir os mesmos ${values.length} valores um a um. Com n pequeno a distância é modesta; ela cresce porque metade dos nós é folha e não desce nada, um quarto desce no máximo um nível, e assim por diante. É essa soma que fecha em O(n), enquanto inserir um a um fecha em O(n log n).`,
  });
  return steps;
}

// --- geometria da árvore completa -----------------------------------------

function depth(i: number) {
  let levels = 0;
  let x = i + 1;
  while (x > 1) {
    x >>= 1;
    levels++;
  }
  return levels;
}
function height(n: number) {
  return n === 0 ? 0 : depth(n - 1) + 1;
}

function stepsFor(mode: Mode, preset: Preset, kind: HeapKind): Step[] {
  if (mode === "insert") return stepsInsert(preset.values, kind);
  if (mode === "remove") return stepsRemove(preset.values, kind);
  return stepsBuild(preset.values, kind);
}

// O modo inserir começa com o heap vazio, então o passo 1 é um nó solto: nada
// para olhar em quem acabou de chegar na página. O visualizador abre no primeiro
// passo com árvore de verdade, e volta para esse mesmo ponto sempre que a
// animação é trocada (preset, modo ou regra). Quem quiser ver a inserção desde o
// heap vazio tem o botão ↺, que é justamente o que ele significa.
function firstMeaningfulStep(steps: Step[]): number {
  const i = steps.findIndex((s) => s.n >= 4);
  return i < 0 ? 0 : i;
}

const NODE_R = 16;
const LEVEL_Y = 60;
const TOP_Y = 20;

export function BinaryHeapVisualizer() {
  const [presetKey, setPresetKey] = useState("arrival");
  const [kind, setKind] = useState<HeapKind>("min");
  const [mode, setMode] = useState<Mode>("insert");

  const preset = useMemo(() => PRESETS.find((x) => x.key === presetKey) ?? PRESETS[0], [presetKey]);
  const steps = useMemo(() => stepsFor(mode, preset, kind), [mode, preset, kind]);

  const viz = useVisualizer({
    title: "Visualizador · a árvore e o array do heap se movendo juntos",
    total: steps.length,
    // A peça já abria no "1.5x": as animações vão a 51 passos, e no 1x a
    // reprodução inteira fica longa demais para quem só quer ver o movimento.
    initialSpeed: 4,
    // O que mexe na altura: o modo (o código vai de 9 a 15 linhas e o "remover"
    // ainda acrescenta o painel de saída), o preset (6 valores dão uma árvore de
    // 2 níveis, 8 ou 9 dão 3) e a regra (troca o texto das notas).
    // `steps.length` é função desses três e nunca cai a 1 aqui — o menor total
    // medido é 21 —, então não há travessia de linha do tempo a cobrir.
    measureOn: [mode, presetKey, kind],
  });

  // Ajuste na fase de RENDER, não num `useEffect`: o hook sempre começa no passo
  // 0, e é assim que o passo certo entra também no HTML do build estático. Com
  // efeito, o `out/` congelaria no passo 1 e só o cliente corrigiria. Contrato §9.
  const [placed, setPlaced] = useState(false);
  if (!placed) {
    setPlaced(true);
    viz.setStep(firstMeaningfulStep(steps));
  }

  const p = steps[Math.min(viz.step, steps.length - 1)];

  // Trocar preset, modo ou regra é montar outra animação, e ela abre no mesmo
  // ponto em que o visualizador abriu a primeira vez. Os passos são recalculados
  // aqui porque o estado novo só chega ao `useMemo` no render seguinte.
  const openAt = (m: Mode, pr: Preset, k: HeapKind) => {
    viz.reset();
    viz.setStep(firstMeaningfulStep(stepsFor(m, pr, k)));
  };
  const pickPreset = (key: string) => {
    const pr = PRESETS.find((x) => x.key === key) ?? PRESETS[0];
    setPresetKey(key);
    openAt(mode, pr, kind);
  };
  const pickMode = (m: Mode) => {
    setMode(m);
    openAt(m, preset, kind);
  };
  const pickKind = (k: HeapKind) => {
    setKind(k);
    openAt(mode, preset, k);
  };

  // Geometria: uma árvore completa se posiciona só pelo índice, sem layout algum.
  // O tamanho vem do MAIOR heap da animação inteira, não do passo atual: assim os
  // nós ficam parados enquanto a árvore enche e esvazia, em vez de saltarem de
  // lugar a cada inserção.
  const maxN = useMemo(() => steps.reduce((m, s) => Math.max(m, s.n), 1), [steps]);
  const maxDepth = depth(maxN - 1);
  const columns = Math.pow(2, maxDepth);
  const spanX = Math.max(320, columns * 56);
  const W = spanX + NODE_R * 2;
  const H = TOP_Y * 2 + maxDepth * LEVEL_Y + NODE_R * 2;
  const cx = (i: number) => {
    const d = depth(i);
    const pos = i - (Math.pow(2, d) - 1);
    return NODE_R + ((pos + 0.5) * spanX) / Math.pow(2, d);
  };
  const cy = (i: number) => TOP_Y + NODE_R + depth(i) * LEVEL_Y;

  const treeHeight = height(p.n);
  const code = mode === "insert" ? CODE_INSERT : mode === "remove" ? CODE_REMOVE : CODE_BUILD;
  const file = mode === "insert" ? "push.py" : mode === "remove" ? "pop.py" : "build_heap.py";

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
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

        <div className="viz-inputs">
          <div className="viz-field">
            <span>Operação</span>
            <div className="sub-modo">
              <button className={`sub-modo-btn${mode === "insert" ? " on" : ""}`} onClick={() => pickMode("insert")} aria-pressed={mode === "insert"}>
                inserir
              </button>
              <button className={`sub-modo-btn${mode === "remove" ? " on" : ""}`} onClick={() => pickMode("remove")} aria-pressed={mode === "remove"}>
                remover o topo
              </button>
              <button className={`sub-modo-btn${mode === "build" ? " on" : ""}`} onClick={() => pickMode("build")} aria-pressed={mode === "build"}>
                construir de uma vez
              </button>
            </div>
          </div>
          <div className="viz-field">
            <span>Regra</span>
            <div className="sub-modo">
              <button className={`sub-modo-btn${kind === "min" ? " on" : ""}`} onClick={() => pickKind("min")} aria-pressed={kind === "min"}>
                min-heap
              </button>
              <button className={`sub-modo-btn${kind === "max" ? " on" : ""}`} onClick={() => pickKind("max")} aria-pressed={kind === "max"}>
                max-heap
              </button>
            </div>
          </div>
        </div>

        <div className="tt-arv-wrap">
          <svg
            className="tt-arv"
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Heap com ${p.n} elementos e altura ${treeHeight}. ${p.note}`}
          >
            {p.arr.slice(0, p.n).map((_, i) =>
              [2 * i + 1, 2 * i + 2]
                .filter((f) => f < p.n)
                .map((f) => (
                  <line
                    key={`${i}-${f}`}
                    className={`tt-aresta${(p.focus === i && p.partner === f) || (p.focus === f && p.partner === i) ? " ativa" : ""}`}
                    x1={cx(i)}
                    y1={cy(i) + NODE_R}
                    x2={cx(f)}
                    y2={cy(f) - NODE_R}
                  />
                ))
            )}
            {p.arr.slice(0, p.n).map((v, i) => {
              const cls = ["tt-no"];
              if (i === p.focus) cls.push("on");
              else if (i === p.partner) cls.push("aux");
              return (
                <g key={i} className={cls.join(" ")}>
                  <circle cx={cx(i)} cy={cy(i)} r={NODE_R} />
                  <text x={cx(i)} y={cy(i) + 4} textAnchor="middle">
                    {v}
                  </text>
                  <text className="hp-idx" x={cx(i)} y={cy(i) - NODE_R - 5} textAnchor="middle">
                    {i}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            O mesmo heap, em array <em>o índice embaixo do nó é o índice aqui</em>
          </div>
          <div className="hp-arr">
            {p.arr.map((v, i) => {
              // Nomes de classe do CSS compartilhado: continuam em português de
              // propósito, porque quem os declara é o `globals.css`.
              const cls = ["hp-cel"];
              if (i >= p.n) cls.push("fora");
              else if (i === p.focus) cls.push("foco");
              else if (i === p.partner) cls.push("par");
              if (i === p.entering || (p.swapped && (i === p.focus || i === p.partner))) cls.push("troca");
              return (
                <span key={i} className={cls.join(" ")}>
                  <i>{i}</i>
                  {v}
                </span>
              );
            })}
            {p.arr.length === 0 && <span className="tt-vazio">vazio</span>}
          </div>
        </div>

        {mode === "remove" && (
          <div className="hp-bloco">
            <div className="tt-painel-tit">
              Saída, na ordem em que foi removida <em>é isto que o heap sort aproveita</em>
            </div>
            <div className="tt-saida">
              {p.output.map((v, i) => (
                <span key={i} className={`tt-saida-item${i === p.output.length - 1 ? " novo" : ""}`}>
                  {v}
                </span>
              ))}
              {p.output.length === 0 && <span className="tt-vazio">nada saiu ainda</span>}
            </div>
          </div>
        )}

        <p className={"viz-note" + (p.ok ? " ok" : "")}>{p.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com a altura do
              código. O `.viz-code-slot` é o grid 1fr→0fr, a única forma de
              animar altura automática em CSS puro. O código fica no DOM mesmo
              recolhido, que é o que permite medir o pior caso de altura. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">{file}</div>
              <div className="viz-code-body">
                {code.map((txt, i) => (
                  <div key={i} className={`viz-line${i === p.line ? " on" : ""}`}>
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
              <span className="viz-var-name">i (foco)</span>
              <span className="viz-var-val">{p.focus >= 0 ? p.focus : "-"}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">comparado com</span>
              <span className="viz-var-val">{p.partner >= 0 ? p.partner : "-"}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">topo do heap</span>
              <span className="viz-var-val best">{p.n > 0 ? p.arr[0] : "-"}</span>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>elementos</span>
            <strong>{p.n}</strong>
          </div>
          <div className="bigo-stat">
            <span>altura</span>
            <strong>{treeHeight}</strong>
          </div>
          <div className="bigo-stat">
            <span>comparações</span>
            <strong>{p.comparisons}</strong>
          </div>
          <div className="bigo-stat">
            <span>trocas</span>
            <strong>{p.swaps}</strong>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          No modo inserir, alterne entre os dois presets de nove valores mantendo min-heap: o contador de
          trocas vai de 0 a 16 sem que um único dado mude, só a ordem de chegada. O heap não promete
          proteger você disso, ele promete que o estrago nunca passa da altura da árvore.
        </p>
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(frame);
}
