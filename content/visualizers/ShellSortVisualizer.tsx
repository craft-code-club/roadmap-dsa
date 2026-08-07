"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// ShellSortVisualizer, o insertion sort com a constante 1 virando variável.
//
// A única coisa que o aluno precisa enxergar é que o shell sort NÃO é um
// algoritmo novo: é o insertion sort com o passo de comparação trocado. Por
// isso o painel de código mostra o corpo do insertion sort inteiro, e a única
// linha que muda em relação a ele é a que usa `gap` no lugar de `1`.
//
// A segunda ideia, e a que faz o algoritmo fazer sentido, é a CADEIA: com gap
// h, o elemento da posição i só conversa com i - h, i - 2h, e assim por diante.
// O array vira h subsequências entrelaçadas, e cada uma é ordenada por inserção
// sem saber que as outras existem. Por isso a cadeia do elemento atual fica
// marcada no array, e não só o par que está sendo comparado: um par isolado faz
// o algoritmo parecer arbitrário, a cadeia faz ele parecer óbvio.
//
// A geometria vem do array completo e não muda com o gap, de propósito: é a
// mesma fita, relida com passos diferentes.
//
// Altura: a fita é a mesma nos quatro presets (todos têm oito elementos e não
// há campo de array), então ela mede 44px — uma linha — nos 261 estados e nas
// três réguas. Quem move a peça é a prosa: a dica do preset (37 ou 55px) e a
// nota do passo (22 a 63px), 59px de amplitude somados. Ver `measureOn`.
// ---------------------------------------------------------------------------

type Step = {
  arr: number[];
  gap: number;
  i: number;
  j: number;
  current: number;
  chain: number[];
  comparisons: number;
  writes: number;
  line: number;
  note: string;
  ok?: boolean;
  /**
   * O último passo, empilhado DEPOIS do laço: é o resumo, não uma rodada. O
   * `gap` dele vale 0 (o laço só termina quando ele zera), então tudo que fala
   * de rodada precisa perguntar por este campo antes de mostrar o número.
   */
  summary?: boolean;
  /**
   * O gap da RODADA a que o passo pertence, que não é sempre o valor da
   * variável `gap` naquele instante. O passo de fim de rodada roda o `gap //= 2`
   * (linha 11), então a variável já vale o gap da PRÓXIMA rodada enquanto o
   * passo ainda descreve a que acabou — e a faixa da fase lia a variável.
   * Medido nos quatro passos de fim de rodada do preset padrão: a faixa dizia
   * "gap 2" com a nota dizendo "Fim da rodada de gap 4", "gap 1" contra "gap 2",
   * e no último "gap 0", uma rodada que não existe, pintada de âmbar
   * (`f-ordenar`) sobre um array já ordenado.
   *
   * `gap` responde "quanto vale a variável", que é o que o painel de variáveis
   * mostra; `roundGap` responde "de que rodada é este passo", que é o que a
   * faixa e o cartão de subsequências perguntam. Dentro da rodada os dois são
   * iguais; só o passo de fim de rodada os separa.
   */
  roundGap: number;
};

const CODE = [
  "def shell_sort(a):",
  "    n = len(a)",
  "    gap = n // 2                     # sequência original de Shell",
  "    while gap > 0:",
  "        for i in range(gap, n):",
  "            atual = a[i]",
  "            j = i",
  "            while j >= gap and a[j - gap] > atual:",
  "                a[j] = a[j - gap]    # empurra pelo gap",
  "                j -= gap",
  "            a[j] = atual",
  "        gap //= 2                    # e no fim gap = 1: insertion sort",
];

type Preset = { key: string; label: string; values: number[]; hint: string };

const PRESETS: Preset[] = [
  {
    key: "shuffled",
    label: "Embaralhado: 5 3 21 13 1 7 6 15",
    values: [5, 3, 21, 13, 1, 7, 6, 15],
    hint: "Com oito elementos os gaps são 4, 2 e 1. Repare no tamanho do caminho para trás em cada rodada: no gap 4 os saltos são longos e raros, no gap 1 eles são curtíssimos, porque o trabalho pesado já foi feito.",
  },
  {
    key: "last",
    label: "O menor lá no fim: 2 3 4 5 6 7 8 1",
    values: [2, 3, 4, 5, 6, 7, 8, 1],
    hint: "O pesadelo do insertion sort: um array quase ordenado com um único elemento fora do lugar, na pior posição possível. Para trazer o 1 da última posição até a primeira, o insertion sort precisa de 7 deslocamentos, um por vizinho. Aqui bastam dois: um salto de 4 e depois um de 2.",
  },
  {
    key: "reversed",
    label: "Ao contrário: 21 15 13 7 6 5 3 1",
    values: [21, 15, 13, 7, 6, 5, 3, 1],
    hint: "Todas as 28 inversões possíveis, e a única entrada deste conjunto em que o shell sort já ganha com oito elementos: 22 comparações e 29 escritas, contra 28 e 35 do insertion sort. Os gaps grandes desfazem várias inversões por movimento, em vez de uma por uma.",
  },
  {
    key: "sorted",
    label: "Já ordenado: 1 3 5 6 7 13 15 21",
    values: [1, 3, 5, 6, 7, 13, 15, 21],
    hint: "Nenhum deslocamento acontece em nenhuma rodada, e mesmo assim as comparações são feitas. É o preço de ter três rodadas em vez de uma: o shell sort perde para o insertion sort exatamente na entrada em que o insertion sort é imbatível.",
  },
];

// O ritmo é 15 a 30% mais rápido que o `DEFAULT_SPEEDS` do hook, porque são 59
// a 71 passos curtos: o padrão faria a reprodução arrastar.
const SPEEDS = [0, 1200, 800, 520, 320, 180];

const chainOf = (i: number, gap: number, n: number) => {
  const c: number[] = [];
  for (let k = i % gap; k < n; k += gap) c.push(k);
  return c;
};

export function generateSteps(values: number[]): Step[] {
  const a = [...values];
  const n = a.length;
  const out: Step[] = [];
  let comparisons = 0;
  let writes = 0;
  let gap = Math.floor(n / 2);
  const base = () => ({
    arr: [...a],
    gap,
    roundGap: gap,
    i: -1,
    j: -1,
    current: -1,
    chain: [] as number[],
    comparisons,
    writes,
  });

  out.push({
    ...base(),
    line: 0,
    note: `Entrada: ${a.join(", ")}. O shell sort é o insertion sort com uma diferença: em vez de comparar com o vizinho imediato, ele compara com quem está a gap posições de distância. O gap começa grande e termina em 1.`,
  });

  while (gap > 0) {
    const howMany = gap;
    out.push({
      ...base(),
      line: 3,
      note: `Rodada com gap ${gap}. Isso divide o array em ${howMany} subsequências entrelaçadas: os índices 0, ${gap}, ${2 * gap}... formam uma, os índices 1, ${1 + gap}... formam outra, e assim por diante. Cada uma vai ser ordenada por inserção, sem saber que as outras existem.`,
    });
    for (let i = gap; i < n; i++) {
      const current = a[i];
      const chain = chainOf(i, gap, n);
      out.push({
        ...base(),
        i,
        current,
        chain,
        line: 5,
        note: `Pego ${current} da posição ${i}. A subsequência dele é ${chain.join(", ")}, e é só dentro dela que ele vai procurar lugar. Tudo que está entre esses índices é problema de outra subsequência.`,
      });
      let j = i;
      let shifts = 0;
      while (j >= gap) {
        comparisons++;
        if (!(a[j - gap] > current)) {
          out.push({
            ...base(),
            i,
            j,
            current,
            chain,
            line: 7,
            note: `${a[j - gap]} (posição ${j - gap}) não é maior que ${current}: parei. Dentro desta subsequência, a posição ${j} é o lugar dele.`,
          });
          break;
        }
        a[j] = a[j - gap];
        writes++;
        shifts++;
        out.push({
          ...base(),
          i,
          j: j - gap,
          current,
          chain,
          line: 8,
          note: `${a[j]} é maior que ${current}, então empurro ele ${gap} posição${gap === 1 ? "" : "ões"} para a frente, da ${j - gap} para a ${j}. Um empurrão de ${gap} desfaz de uma vez várias inversões que o insertion sort desfaria uma a uma.`,
        });
        j -= gap;
      }
      if (j < gap && j !== i) {
        out.push({
          ...base(),
          i,
          j,
          current,
          chain,
          line: 7,
          note: `Cheguei ao começo da subsequência: não existe posição ${j - gap}. O lugar de ${current} é a posição ${j}.`,
        });
      }
      a[j] = current;
      writes++;
      out.push({
        ...base(),
        i,
        j,
        current,
        chain,
        line: 10,
        ok: shifts === 0,
        note:
          shifts === 0
            ? `${current} já estava no lugar certo dentro da subsequência dele: nenhum deslocamento. A escrita acontece do mesmo jeito, porque o código guarda o valor e devolve.`
            : `${current} entra na posição ${j} depois de ${shifts} deslocamento${shifts === 1 ? "" : "s"} de ${gap}. Ele andou ${i - j} posições no array, e para isso bastaram ${shifts} escrita${shifts === 1 ? "" : "s"}.`,
      });
    }
    const before = gap;
    gap = Math.floor(gap / 2);
    out.push({
      ...base(),
      // A variável já caiu (é o que a linha 11 faz), mas o passo é o fim da
      // rodada de `before`: é esse número que a faixa e o cartão mostram.
      roundGap: before,
      line: 11,
      ok: true,
      note:
        gap > 0
          ? `Fim da rodada de gap ${before}: ${a.join(", ")}. O array não está ordenado, mas está ${before}-ordenado, ou seja, cada elemento é menor ou igual ao que está ${before} casas à frente. Agora o gap cai para ${gap}, e o mais importante: essa propriedade não se perde nas rodadas seguintes.`
          : `Fim da rodada de gap 1, que é o insertion sort puro: ${a.join(", ")}. Ele só teve trabalho leve porque as rodadas anteriores já tinham aproximado tudo do lugar.`,
    });
  }

  out.push({
    ...base(),
    line: 11,
    ok: true,
    summary: true,
    note: `Ordenado: ${a.join(", ")}. Foram ${comparisons} comparações e ${writes} escritas, sem nenhuma memória extra. A única diferença para o insertion sort é a constante 1 ter virado a variável gap.`,
  });
  return out;
}

export function ShellSortVisualizer() {
  const [presetKey, setPresetKey] = useState("shuffled");

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const steps = useMemo(() => generateSteps(preset.values), [preset]);

  const viz = useVisualizer({
    title: "Visualizador · shell sort: o insertion sort com gap",
    total: steps.length,
    speeds: SPEEDS,
    initialSpeed: 4,
    // O preset é a única entrada que o aluno tem, e a fita não é eixo de altura:
    // os quatro presets têm oito elementos, não há campo de array, e `.hp-arr`
    // mede 44px (uma linha) nos 261 estados das três réguas — ela só quebraria
    // na 18ª célula. O que o preset troca de verdade é a DICA, que vale 18px
    // (37px num preset, 55 nos outros três).
    measureOn: [presetKey],
  });

  const s = steps[viz.step];
  const inChain = new Set(s.chain);

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

        {/* `f-fim` e `f-ordenar` são contrato com o `globals.css`
            (`.hs-fase.f-fim` pinta a borda e o selo de verde, `.f-ordenar` de
            âmbar), compartilhado com o heap sort. Traduzir estes dois literais
            apagaria a cor sem o `tsc`, o guarda de idioma ou um teste acusarem. */}
        {/* O passo do resumo não é uma rodada: o `gap` dele é 0, porque o laço
            `while gap > 0` já terminou. O selo diz o que aquele passo é, em vez
            de anunciar uma rodada de gap 0, e a cor é a mesma do fim (`f-fim`,
            verde) em vez da de ordenar (`f-ordenar`, âmbar) — pintar de âmbar o
            array já ordenado é a mesma mentira, só que em cor. */}
        <div className={`hs-fase ${s.summary || s.roundGap === 1 ? "f-fim" : "f-ordenar"}`}>
          <span className="hs-fase-selo">{s.summary ? "ordenado" : `gap ${s.roundGap}`}</span>
          <span className="hs-fase-txt">
            {s.summary
              ? "acabaram as rodadas de gap: este passo é o resumo da execução"
              : s.roundGap === 1
                ? "esta é a última rodada, e ela é o insertion sort puro"
                : `o array é lido como ${s.roundGap} subsequências entrelaçadas, uma a cada ${s.roundGap} posições`}
          </span>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            O array <em>roxo = a subsequência do elemento na mão, ou seja, com quem ele pode conversar</em>
          </div>
          <div className="hp-arr">
            {s.arr.map((v, k) => {
              // `alvo`, `foco` e `par` também são sufixo de classe do
              // `globals.css` (`.hp-cel.alvo` e companhia): ficam em português.
              const cls = ["hp-cel"];
              if (inChain.has(k)) cls.push("alvo");
              if (k === s.i) cls.push("foco");
              else if (k === s.j) cls.push("par");
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
              <div className="viz-code-head">shell_sort.py</div>
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
              <span className="viz-var-name">gap</span>
              <span className="viz-var-val best">{s.gap}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">atual (na mão)</span>
              <span className="viz-var-val">{s.current >= 0 ? s.current : "-"}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">j (posição candidata)</span>
              <span className="viz-var-val">{s.j >= 0 ? s.j : "-"}</span>
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
            <strong>{s.comparisons}</strong>
          </div>
          <div className="bigo-stat">
            <span>escritas no array</span>
            <strong>{s.writes}</strong>
          </div>
          <div className="bigo-stat">
            <span>subsequências deste gap</span>
            {/* No resumo não há rodada, então não há "este gap": o traço é o
                mesmo que as variáveis usam para "não se aplica aqui". E é o gap
                DA RODADA, não a variável: no passo de fim de rodada ela já caiu
                pela metade, e o cartão contava as subsequências da rodada
                seguinte (ou 0, na última). */}
            <strong>{s.summary ? "-" : s.roundGap}</strong>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Uma honestidade necessária: com oito elementos e a sequência original de Shell, o algoritmo quase
          sempre <strong>perde</strong> para o insertion sort, e isso não é defeito de implementação. São três
          rodadas de laço para um array minúsculo, e o custo fixo não se paga. Das quatro entradas aqui, a
          invertida é a única em que ele já ganha (22 comparações contra 28). O visualizador seguinte mostra as
          duas saídas para isso: trocar a sequência de gaps, que já vira a conta neste tamanho, e deixar o
          array crescer, que com 128 elementos abre uma diferença de mais de quatro vezes.
        </p>
      </div>

      <VizFooter viz={viz} />
    </figure>
  );
}
