"use client";

import { useMemo, useState } from "react";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// HeapSortEstabilidade, o preço que o heap sort cobra e quase ninguém enxerga.
//
// "Instável" é a característica mais mal explicada dos algoritmos de ordenação,
// porque o resultado continua CERTO: as chaves saem em ordem. O que muda é a
// ordem entre elementos empatados, e isso só aparece quando o elemento tem mais
// coisa além da chave.
//
// Por isso os presets são registros de verdade (idade + nome), e o exemplo
// principal é o cenário que morde na prática: uma lista já ordenada por nome
// sendo reordenada por idade. Com sort estável os nomes continuam alfabéticos
// dentro de cada idade; com heap sort, não. É a mesma armadilha de qualquer
// `ORDER BY` encadeado.
//
// Os dois algoritmos rodam de verdade no componente (nada de resultado fixo),
// e as inversões são detectadas comparando a posição ORIGINAL de cada empate.
//
// Sobre a casca: `total: 1` e `collapsible: false`. Não há passo a passo nem
// bloco dispensável — as três filas e a explicação SÃO o conteúdo. Esta é a
// peça mais baixa da rodada, e mesmo assim precisa do painel: cabe a 1512x900
// (712px de 816) e passa do orçamento a 1440x700 (712 de 616) e a 390x844
// (1.240 de 760).
// ---------------------------------------------------------------------------

type Rec = { key: number; name: string; orig: number };

type Preset = { key: string; label: string; data: [number, string][]; hint: string };

const PRESETS: Preset[] = [
  {
    key: "nomes",
    label: "Lista ordenada por nome, reordenando por idade",
    data: [
      [3, "Ana"],
      [5, "Bia"],
      [3, "Caio"],
      [2, "Davi"],
      [5, "Enzo"],
      [2, "Fran"],
    ],
    hint: "A entrada está em ordem alfabética. Ordenando por idade, o esperado é que dentro de cada idade os nomes continuem alfabéticos, e é isso que o sort estável entrega.",
  },
  {
    key: "empate",
    label: "Um empate que sobrevive por sorte",
    data: [
      [7, "sete"],
      [4, "quatro-a"],
      [9, "nove"],
      [4, "quatro-b"],
      [1, "um"],
    ],
    hint: "Aqui o heap sort devolve o mesmo resultado do estável, e é justamente esse o perigo: instável não quer dizer sempre errado, quer dizer sem garantia. Um código apoiado neste comportamento passa nos testes e quebra quando um dado muda.",
  },
  {
    key: "iguais",
    label: "Chaves todas iguais",
    data: [
      [4, "p"],
      [4, "q"],
      [4, "r"],
      [4, "s"],
      [4, "t"],
    ],
    hint: "Caso extremo: como toda comparação empata, o sort estável não move ninguém e o heap sort embaralha à vontade. Os dois resultados estão corretos pela chave.",
  },
];

// Insertion sort: estável por construção, porque só desloca enquanto o de trás
// for ESTRITAMENTE maior. Empate nunca provoca troca.
function stableSort(recs: Rec[]): Rec[] {
  const a = recs.map((r) => ({ ...r }));
  for (let i = 1; i < a.length; i++) {
    const current = a[i];
    let j = i - 1;
    while (j >= 0 && a[j].key > current.key) {
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = current;
  }
  return a;
}

// Heap sort, exatamente o mesmo algoritmo da outra visualização, só que
// comparando o campo `key` de um registro em vez de um número solto.
function heapSort(recs: Rec[]): Rec[] {
  const a = recs.map((r) => ({ ...r }));
  const n = a.length;
  const siftDown = (i: number, limit: number) => {
    let guard = 0;
    while (guard++ < 200) {
      let largest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < limit && a[l].key > a[largest].key) largest = l;
      if (r < limit && a[r].key > a[largest].key) largest = r;
      if (largest === i) return;
      [a[i], a[largest]] = [a[largest], a[i]];
      i = largest;
    }
  };
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) siftDown(i, n);
  for (let end = n - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    siftDown(0, end);
  }
  return a;
}

// Um empate inverteu se, entre dois registros de mesma chave, o que veio depois
// na entrada aparece antes na saída.
function inverted(output: Rec[]): Set<number> {
  const marked = new Set<number>();
  for (let i = 0; i < output.length; i++) {
    for (let j = i + 1; j < output.length; j++) {
      if (output[i].key === output[j].key && output[i].orig > output[j].orig) {
        marked.add(output[i].orig);
        marked.add(output[j].orig);
      }
    }
  }
  return marked;
}

function Fila({ recs, marked, title, badge }: { recs: Rec[]; marked: Set<number>; title: string; badge: string }) {
  return (
    <div className="hs-fila">
      <div className="hs-fila-cab">
        <span className="hs-fila-tit">{title}</span>
        <span className={`hs-fila-selo${marked.size > 0 ? " quebrou" : ""}`}>{badge}</span>
      </div>
      <div className="hp-arr">
        {recs.map((r) => (
          <span key={r.orig} className={`hp-cel reg${marked.has(r.orig) ? " inverteu" : ""}`}>
            <i>entrou em {r.orig}</i>
            <b>{r.key}</b>
            <em>{r.name}</em>
          </span>
        ))}
      </div>
    </div>
  );
}

export function HeapSortEstabilidade() {
  const [presetKey, setPresetKey] = useState("nomes");
  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);

  const input: Rec[] = useMemo(
    () => preset.data.map(([key, name], orig) => ({ key, name, orig })),
    [preset]
  );
  const stable = useMemo(() => stableSort(input), [input]);
  const fromHeap = useMemo(() => heapSort(input), [input]);
  const tiesHeap = useMemo(() => inverted(fromHeap), [fromHeap]);
  const tiesStable = useMemo(() => inverted(stable), [stable]);

  const sameKeys = useMemo(
    () => fromHeap.map((r) => r.key).join(",") === stable.map((r) => r.key).join(","),
    [fromHeap, stable]
  );

  // O primeiro par que trocou de lugar, para a explicação citar nomes de verdade.
  const swappedPair = useMemo(() => {
    for (let i = 0; i < fromHeap.length; i++) {
      for (let j = i + 1; j < fromHeap.length; j++) {
        if (fromHeap[i].key === fromHeap[j].key && fromHeap[i].orig > fromHeap[j].orig) {
          return { before: fromHeap[j], after: fromHeap[i] };
        }
      }
    }
    return null;
  }, [fromHeap]);

  const viz = useVisualizer({
    title: 'Visualizador · o que "instável" significa na prática',
    // Sem linha do tempo: a variável é o preset, não o tempo.
    total: 1,
    // Sem bloco dispensável: as três filas e a explicação são o conteúdo.
    collapsible: false,
  });

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      {/* Sem "passo N de M": entra o número que resume o estado, com o rótulo
          junto, como manda a §6 do contrato. */}
      <VizHeader viz={viz}>
        <span className="viz-step">{tiesHeap.size > 0 ? `${tiesHeap.size} registros fora da ordem original` : "nenhum empate trocou desta vez"}</span>
      </VizHeader>

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              type="button"
              key={pr.key}
              className={`bigo-chip${presetKey === pr.key ? " on" : ""}`}
              onClick={() => setPresetKey(pr.key)}
              aria-pressed={presetKey === pr.key}
            >
              {pr.label}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">{preset.hint}</p>

        <div className="hs-filas">
          <Fila recs={input} marked={new Set()} title="Entrada" badge="como chegou" />
          <Fila recs={stable} marked={tiesStable} title="Ordenação estável (insertion sort)" badge={tiesStable.size > 0 ? "quebrou" : "empates preservados"} />
          <Fila recs={fromHeap} marked={tiesHeap} title="Heap sort" badge={tiesHeap.size > 0 ? "empates trocados" : "empates preservados"} />
        </div>

        <p className={`viz-note${tiesHeap.size > 0 ? " invalid" : " ok"}`}>
          {swappedPair ? (
            <>
              As duas saídas estão <strong>corretas pela chave</strong>: {sameKeys ? "a sequência de chaves é idêntica nas duas" : "as chaves saem em ordem crescente nas duas"}. O que mudou foi o
              desempate. <strong>{swappedPair.after.name}</strong> entrou na posição {swappedPair.after.orig} e{" "}
              <strong>{swappedPair.before.name}</strong> na posição {swappedPair.before.orig}, os dois com chave{" "}
              {swappedPair.before.key}. O sort estável manteve essa ordem; o heap sort devolveu{" "}
              {swappedPair.after.name} na frente. Ninguém errou uma comparação: é que o heap arranca o último
              elemento do array e joga na raiz, e esse salto não tem como respeitar de onde o registro veio.
            </>
          ) : (
            <>Neste preset nenhum empate mudou de lugar. Isso não torna o heap sort estável: instável quer dizer
            que ele <strong>não garante nada</strong> sobre empates, não que ele sempre os inverta. Troque de
            preset para ver a garantia falhar.</>
          )}
        </p>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Onde isso morde de verdade: ordenações encadeadas. &quot;Ordene por nome, depois por idade&quot; só
          produz o resultado esperado se o segundo sort for estável. Com um instável você precisa comparar as
          duas chaves de uma vez, na mesma função de comparação, em vez de ordenar duas vezes.
        </p>
      </div>

      {/* Sem linha do tempo e sem botões extras, o rodapé não desenha nada. */}
      <VizFooter viz={viz} />
    </figure>
  );
}
