"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// HeapSortVisualizer, as duas fases e a fronteira que anda para trás.
//
// A dificuldade do heap sort não está no heap, está na SEGUNDA fase: o array
// passa a ter duas regiões no mesmo espaço de memória, uma que ainda é heap e
// outra que já é resultado final, e a fronteira entre elas anda um passo por
// rodada. Quem não enxerga essa fronteira acha que o algoritmo está bagunçando
// o que já tinha arrumado.
//
// Por isso a região ordenada aparece marcada tanto no array quanto na árvore
// (o nó some da árvore no instante em que sai do heap), e o card "heap ativo"
// mostra o número que o `desce` está usando como limite. É literalmente o
// algoritmo mentindo sobre o tamanho do array, e é a sacada inteira.
//
// Max-heap porque a ordenação é crescente: o maior valor tem que ir para o FIM,
// e o fim é exatamente a posição que acabou de sair do heap.
// ---------------------------------------------------------------------------

type Phase = "build" | "sort" | "done";

// O sufixo da classe é o que o `globals.css` compartilhado define
// (`.hs-fase.f-ordenar` e `.hs-fase.f-fim` pintam a borda e o selo), então ele
// continua em português mesmo com o identificador em inglês. Traduzir a classe
// junto apagaria a cor das duas fases sem que nada reclamasse.
const PHASE_CLASS: Record<Phase, string> = { build: "construir", sort: "ordenar", done: "fim" };

type Step = {
  arr: number[];
  n: number; // tamanho do heap ativo: as posições >= n já estão ordenadas
  focus: number;
  // Dois campos, e não um. Eles já foram um `pair` só, e o painel de variáveis
  // chamava os três significados dele de "maior candidato": o maior filho (o
  // único que o rótulo descrevia), a origem da subida depois de uma troca, e a
  // posição que ACABOU DE SAIR do heap. Medido no gerador, nos quatro presets:
  // dos 156 passos que mostravam um número, 95 mostravam um que não era
  // candidato a nada. No passo 27 do preset padrão o cartão dizia "9" com a
  // célula 9 pintada de verde, que é a cor de "resolvida para sempre" — o
  // oposto exato da fronteira que esta peça existe para ensinar.
  largest: number; // índice do maior entre pai e filhos; -1 quando o passo não compara
  swapWith: number; // índice do parceiro da troca; -1 quando o passo não troca
  swapped: boolean;
  phase: Phase;
  comp: number;
  swaps: number;
  line: number;
  note: string;
  ok?: boolean;
};

// Python de tela: é conteúdo didático, e os nomes daqui são os que as notas
// explicam em português. Não traduza junto com os identificadores.
const CODE = [
  "def heap_sort(a):",
  "    n = len(a)",
  "    # fase 1: transforma o array num max-heap, O(n)",
  "    for i in range(n // 2 - 1, -1, -1):",
  "        desce(a, i, n)",
  "    # fase 2: tira o maior e encolhe o heap, n - 1 vezes",
  "    for fim in range(n - 1, 0, -1):",
  "        a[0], a[fim] = a[fim], a[0]",
  "        desce(a, 0, fim)   # 'fim' vira o novo tamanho",
  "",
  "def desce(a, i, n):        # n = até onde o heap ainda vale",
  "    while True:",
  "        maior, e, d = i, 2*i + 1, 2*i + 2",
  "        if e < n and a[e] > a[maior]: maior = e",
  "        if d < n and a[d] > a[maior]: maior = d",
  "        if maior == i: return",
  "        a[i], a[maior] = a[maior], a[i]",
  "        i = maior",
];

type Preset = { key: string; label: string; values: number[]; hint: string };

const PRESETS: Preset[] = [
  {
    key: "shuffled",
    label: "Embaralhado: 4 10 3 5 1 8 7 2 9 6",
    values: [4, 10, 3, 5, 1, 8, 7, 2, 9, 6],
    hint: "O caso comum. Acompanhe a fronteira verde crescendo da direita para a esquerda: cada rodada da fase 2 congela mais uma posição, e ela nunca mais é tocada.",
  },
  {
    key: "sorted",
    label: "Já ordenado: 1 2 3 4 5 6 7 8 9 10",
    values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    hint: "A entrada já está pronta e o heap sort não liga: ele faz o trabalho inteiro assim mesmo. Compare o total de comparações com o do preset embaralhado, eles ficam na mesma faixa. Não existe atalho de melhor caso aqui.",
  },
  {
    key: "reversed",
    label: "Ao contrário: 10 9 8 7 6 5 4 3 2 1",
    values: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    hint: "A entrada mais hostil que existe para quase todo algoritmo de ordenação. Para o heap sort é só mais uma: a fase 1 quase não faz nada, porque um array decrescente já é um max-heap válido.",
  },
  {
    key: "duplicates",
    label: "Com repetidos: 5 3 5 1 3 9 1 5",
    values: [5, 3, 5, 1, 3, 9, 1, 5],
    hint: "Valores iguais não quebram nada: a regra do max-heap é maior OU IGUAL. O que se perde com eles é a estabilidade, e isso o visualizador ao lado mostra.",
  },
];

// A marcha desta peça é a dela: uma troca de array se lê rápido, e a animação
// mais longa tem 84 passos. O padrão do hook (1400..250) arrastaria demais.
const SPEEDS = [0, 1200, 800, 520, 320, 180];

function buildSteps(values: number[]): Step[] {
  const a = [...values];
  const total = a.length;
  const out: Step[] = [];
  let comp = 0;
  let swaps = 0;
  let n = total;
  let phase: Phase = "build";
  const base = () => ({
    arr: [...a], n, focus: -1, largest: -1, swapWith: -1, swapped: false, phase, comp, swaps,
  });

  // sift down com limite: tudo de `n` para a frente é resultado final e não existe
  // para o algoritmo. Empurrar os passos aqui dentro mantém o gerador puro.
  const siftDown = (start: number, context: string) => {
    let i = start;
    let guard = 0;
    while (guard++ < 200) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left >= n) {
        out.push({
          ...base(), focus: i, line: 15, ok: true,
          note: `A posição ${i} não tem filho dentro do heap (2 x ${i} + 1 = ${left}, e o heap só vai até ${n - 1}). Cheguei numa folha, a descida acabou.`,
        });
        return;
      }
      let largest = i;
      comp++;
      if (a[left] > a[largest]) largest = left;
      let text = `Filhos de ${i}: esquerda em ${left} (valor ${a[left]})`;
      if (right < n) {
        comp++;
        text += `, direita em ${right} (valor ${a[right]})`;
        if (a[right] > a[largest]) largest = right;
      } else {
        text += `. A direita seria ${right}, que já caiu na parte ordenada, então nem olho`;
      }
      out.push({
        ...base(), focus: i, largest, line: right < n ? 14 : 13,
        note: `${text}. O maior da tríade é ${a[largest]}.`,
      });
      if (largest === i) {
        out.push({
          // `largest: i` é o `maior == i` da linha 16 do código na tela: o
          // maior da tríade é o próprio pai, e é por isso que a descida para.
          ...base(), focus: i, largest: i, line: 15, ok: true,
          note: `${a[i]} já é o maior entre pai e filhos: ${context} está válido daqui para baixo e paro a descida.`,
        });
        return;
      }
      const raised = a[largest];
      [a[i], a[largest]] = [a[largest], a[i]];
      swaps++;
      const previous = i;
      i = largest;
      out.push({
        // Sem `largest` aqui de propósito: a troca já aconteceu, e a posição
        // que era a do maior passou a guardar o MENOR dos dois. Manter o
        // rótulo aceso mostraria um índice cujo valor acabou de deixar de ser
        // o maior. O fato deste passo é a troca, e é ela que tem rótulo.
        ...base(), focus: i, swapWith: previous, swapped: true, line: 16,
        note: `${raised} sobe para ${previous} e ${a[i]} desce para ${i}. Sigo só por este ramo: o outro filho e a subárvore dele já estavam válidos e continuam.`,
      });
    }
  };

  out.push({
    ...base(), line: 0,
    note: `Entrada: ${a.join(", ")}. Vou ordenar dentro deste mesmo array, sem alocar nada, em duas fases: primeiro viro tudo num max-heap, depois arranco o maior repetidas vezes.`,
  });

  // ---- fase 1 -------------------------------------------------------------
  const lastParent = Math.floor(total / 2) - 1;
  out.push({
    ...base(), focus: lastParent, line: 3,
    note: `Fase 1. Começo no índice ${lastParent} (${total} // 2 - 1), o último nó que tem filho. As ${total - 1 - lastParent} posições depois dele são folhas e não têm para onde descer.`,
  });
  for (let i = lastParent; i >= 0; i--) {
    out.push({
      ...base(), focus: i, line: 4,
      note: `Desço a partir de ${i} (valor ${a[i]}). Tudo abaixo já foi arrumado nas rodadas anteriores, então basta acertar este nó.`,
    });
    siftDown(i, "esta subárvore");
  }
  const compPhase1 = comp;
  const swapsPhase1 = swaps;
  out.push({
    ...base(), line: 4, ok: true,
    note: `Max-heap pronto: ${a.join(", ")}. Custou ${compPhase1} comparações e ${swapsPhase1} trocas. O array continua embaralhado aos olhos, mas o maior valor (${a[0]}) já está na posição 0, e é só disso que a fase 2 precisa.`,
  });

  // ---- fase 2 -------------------------------------------------------------
  phase = "sort";
  for (let end = total - 1; end > 0; end--) {
    // `topValue` é um VALOR (a raiz do heap), enquanto o `largest` do `siftDown`
    // é um ÍNDICE. Eles se chamavam igual, e é dessa confusão que nasceu o
    // rótulo mentindo: `end` entrava no mesmo campo do maior filho.
    const topValue = a[0];
    const swappedOut = a[end];
    [a[0], a[end]] = [a[end], a[0]];
    swaps++;
    n = end;
    out.push({
      ...base(), focus: 0, swapWith: end, swapped: true, line: 7,
      note: `${topValue} é o maior do heap, então o lugar dele é a última posição livre, a ${end}. Troco com ${swappedOut} e a posição ${end} está resolvida para sempre.`,
    });
    out.push({
      ...base(), focus: 0, line: 8,
      note: `Agora encolho o heap: ele passa a ter ${n} elemento${n === 1 ? "" : "s"}. Da posição ${n} em diante o resultado já está pronto, e o desce vai tratar essa parte como se não existisse. É essa mentira controlada que faz o heap sort ordenar sem memória extra.`,
    });
    if (n > 1) siftDown(0, "o heap ativo");
  }

  phase = "done";
  n = 0;
  out.push({
    ...base(), line: 8, ok: true,
    note: `Ordenado: ${a.join(", ")}. Total de ${comp} comparações e ${swaps} trocas, sendo ${compPhase1} comparações só na fase 1. Nenhum array auxiliar foi criado: as ${total} posições do começo são as mesmas do fim.`,
  });
  return out;
}

function depth(i: number) {
  let d = 0;
  let x = i + 1;
  while (x > 1) {
    x >>= 1;
    d++;
  }
  return d;
}

const NODE_R = 16;
const LEVEL_Y = 58;
const TOP_Y = 18;

export function HeapSortVisualizer() {
  const [presetKey, setPresetKey] = useState("shuffled");

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const steps = useMemo(() => buildSteps(preset.values), [preset]);

  const viz = useVisualizer({
    title: "Visualizador · heap sort: duas fases no mesmo array",
    total: steps.length,
    speeds: SPEEDS,
    initialSpeed: 4,
    // O preset é a única entrada que o aluno tem, e é ele que troca a dica, as
    // notas e o tamanho do array. O desenho não entra: a geometria sai de
    // `arr.length`, e `depth()` devolve 3 tanto para 8 quanto para 10 elementos
    // — medido, os quatro presets desenham a MESMA caixa de 242px em todos os
    // passos. O que sobra de variação são 20px de nota quebrando em duas linhas.
    measureOn: [presetKey],
  });

  const s = steps[viz.step];

  // A árvore mostra só o heap ativo. Quem já foi ordenado sai dela e vive no
  // array, que é onde o aluno vê o resultado se formando.
  // A geometria vem do array COMPLETO, não do heap ativo: com o tamanho fixo, o
  // nó que sai do heap simplesmente some do lugar dele, e os que ficam não se
  // mexem. Se a árvore fosse redimensionada a cada rodada, pareceria que o
  // algoritmo está rearranjando tudo, que é exatamente o oposto do que acontece.
  const maxDepth = depth(s.arr.length - 1);
  const cols = Math.pow(2, maxDepth);
  const width = Math.max(300, cols * 54);
  const W = width + NODE_R * 2;
  const H = TOP_Y * 2 + maxDepth * LEVEL_Y + NODE_R * 2;
  const cx = (i: number) => {
    const d = depth(i);
    const pos = i - (Math.pow(2, d) - 1);
    return NODE_R + ((pos + 0.5) * width) / Math.pow(2, d);
  };
  const cy = (i: number) => TOP_Y + NODE_R + depth(i) * LEVEL_Y;

  // O "outro" índice destacado no desenho não é um conceito só: num passo de
  // comparação é o maior filho, num passo de troca é o parceiro dela. O
  // destaque pode juntar os dois, porque a cor só diz "olhe aqui" — quem diz o
  // QUE é o número é o painel de variáveis, e lá eles aparecem separados, cada
  // um com o seu rótulo.
  const partner = s.swapWith >= 0 ? s.swapWith : s.largest !== s.focus ? s.largest : -1;

  const sortedCount = s.arr.length - s.n;
  const phaseLabel =
    s.phase === "build" ? "fase 1 · virando max-heap" : s.phase === "sort" ? "fase 2 · arrancando o maior" : "pronto";

  // Com o heap vazio não existe faixa de posições a nomear. O `Math.max(n-1,0)`
  // que estava aqui fabricava um "posições 0 a 0" no último passo, afirmando
  // que a posição 0 ainda está no heap: exatamente o que o desenho ao lado nega
  // ("heap vazio: tudo virou resultado"). E o pior é que essa frase é a MESMA
  // do passo com n = 1, onde ela é verdadeira: dois estados diferentes com o
  // mesmo texto, e um deles mentindo.
  const heapRange = s.n > 0 ? `heap ativo: posições 0 a ${s.n - 1}` : "heap vazio";

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              key={pr.key}
              className={`bigo-chip${presetKey === pr.key ? " on" : ""}`}
              onClick={() => {
                viz.reset();
                setPresetKey(pr.key);
              }}
              aria-pressed={presetKey === pr.key}
            >
              {pr.label}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">{preset.hint}</p>

        <div className={`hs-fase f-${PHASE_CLASS[s.phase]}`}>
          <span className="hs-fase-selo">{phaseLabel}</span>
          <span className="hs-fase-txt">
            {heapRange} · já ordenado: {sortedCount} de {s.arr.length}
          </span>
        </div>

        <div className="tt-arv-wrap">
          <svg
            className="tt-arv"
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Heap ativo com ${s.n} elementos. ${s.note}`}
          >
            {s.arr.slice(0, s.n).map((_, i) =>
              [2 * i + 1, 2 * i + 2]
                .filter((f) => f < s.n)
                .map((f) => (
                  <line
                    key={`${i}-${f}`}
                    className={`tt-aresta${(s.focus === i && partner === f) || (s.focus === f && partner === i) ? " ativa" : ""}`}
                    x1={cx(i)}
                    y1={cy(i) + NODE_R}
                    x2={cx(f)}
                    y2={cy(f) - NODE_R}
                  />
                ))
            )}
            {s.arr.slice(0, s.n).map((v, i) => {
              const cls = ["tt-no"];
              if (i === s.focus) cls.push("on");
              else if (i === partner) cls.push("aux");
              return (
                <g key={i} className={cls.join(" ")}>
                  <circle cx={cx(i)} cy={cy(i)} r={NODE_R} />
                  <text x={cx(i)} y={cy(i) + 4} textAnchor="middle">
                    {v}
                  </text>
                </g>
              );
            })}
            {s.n === 0 && (
              <text className="hp-idx" x={W / 2} y={TOP_Y + NODE_R} textAnchor="middle">
                heap vazio: tudo virou resultado
              </text>
            )}
          </svg>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            O array, com a fronteira entre heap e resultado <em>verde = posição final, não se mexe mais</em>
          </div>
          <div className="hp-arr">
            {s.arr.map((v, i) => {
              const cls = ["hp-cel"];
              if (i >= s.n) cls.push("fixo");
              else if (i === s.focus) cls.push("foco");
              else if (i === partner) cls.push("par");
              if (s.swapped && (i === s.focus || i === partner)) cls.push("troca");
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
              <div className="viz-code-head">heap_sort.py</div>
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
              <span className="viz-var-name">n (heap ativo)</span>
              <span className="viz-var-val best">{s.n}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">i (foco)</span>
              <span className="viz-var-val">{s.focus >= 0 ? s.focus : "-"}</span>
            </div>
            {/* Os dois rótulos que antes eram um. `maior (índice)` é o `maior`
                do código ao lado, que é índice como o `i`; `trocou com` é a
                outra ponta da troca deste passo. Cada um mostra "-" quando o
                seu fato não acontece no passo, e esse traço também informa:
                numa folha não há comparação, e num passo de comparação não há
                troca. */}
            <div className="viz-var">
              <span className="viz-var-name">maior (índice)</span>
              <span className="viz-var-val">{s.largest >= 0 ? s.largest : "-"}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">trocou com</span>
              <span className="viz-var-val">{s.swapWith >= 0 ? s.swapWith : "-"}</span>
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
            <strong>{s.comp}</strong>
          </div>
          <div className="bigo-stat">
            <span>trocas</span>
            <strong>{s.swaps}</strong>
          </div>
          <div className="bigo-stat">
            <span>memória extra</span>
            <strong>O(1)</strong>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Rode até o fim nos presets &quot;embaralhado&quot;, &quot;já ordenado&quot; e &quot;ao contrário&quot; e
          anote o total de comparações: 38, 41 e 35. Dez valores, três entradas radicalmente diferentes, e o
          array já ordenado é justamente o que dá MAIS trabalho. Essa insensibilidade à entrada é a promessa
          do heap sort: o pior caso é igual ao melhor, e nenhuma entrada consegue derrubá-lo.
        </p>
      </div>

      <VizFooter viz={viz} />
    </figure>
  );
}
