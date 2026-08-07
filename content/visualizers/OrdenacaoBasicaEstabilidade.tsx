"use client";

import { useMemo, useState } from "react";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// OrdenacaoBasicaEstabilidade, a distância do movimento como causa.
//
// Quase todo material trata estabilidade como uma propriedade decorada ("bubble
// sim, selection não"). A única coisa que o aluno precisa enxergar aqui é a
// CAUSA mecânica: bubble e insertion só trocam elementos VIZINHOS, e uma troca
// de distância 1 não tem como pular por cima de ninguém. O selection troca com
// alguém que pode estar do outro lado do array, e é esse salto que atropela um
// valor de chave igual.
//
// Por isso a métrica em destaque é a maior distância de uma troca, não um selo
// de "estável / instável". O selo é a consequência; a distância é a razão, e é
// ela que faz a regra ser deduzível em vez de memorizável.
//
// Os três algoritmos rodam de verdade aqui, na forma baseada em trocas (o
// insertion sort com deslocamento é equivalente a uma sequência de trocas
// adjacentes), e as inversões de empate são detectadas comparando a posição de
// ENTRADA de cada registro. Nada de resultado fixo: trocar o preset não exige
// reescrever nenhuma expectativa.
//
// Sobre a casca: `total: 1` e `collapsible: false`. Não há passo a passo nem
// bloco dispensável — as quatro filas e a explicação SÃO o conteúdo. O que a
// peça ganha é o painel expandido com o cabeçalho parado enquanto o miolo rola,
// e ela precisa: pede 945px de um orçamento de 816 a 1512x900, 966 de 616 a
// 1440x700 e 1.640 de 760 a 390x844.
// ---------------------------------------------------------------------------

type Rec = { key: number; tag: string; orig: number };

type Result = { recs: Rec[]; swaps: number; longestSwap: number };

type Preset = { key: string; label: string; data: [number, string][]; hint: string };

const PRESETS: Preset[] = [
  {
    key: "chamados",
    label: "Chamados na ordem de chegada, ordenando por prioridade",
    data: [
      [2, "#41"],
      [2, "#42"],
      [1, "#43"],
      [4, "#44"],
      [3, "#45"],
      [5, "#46"],
    ],
    hint: "A fila chegou em ordem e o critério de ordenação é a prioridade. O esperado é que, dentro da mesma prioridade, quem chegou antes continue sendo atendido antes.",
  },
  {
    key: "sorte",
    label: "Um empate que sobrevive por sorte",
    data: [
      [3, "#51"],
      [3, "#52"],
      [1, "#53"],
      [2, "#54"],
    ],
    hint: "Aqui os três devolvem a mesma coisa, inclusive o selection sort. É justamente esse o perigo: instável quer dizer sem garantia, não sempre errado. Um código apoiado neste resultado passa nos testes hoje e quebra quando entrar mais um chamado.",
  },
  {
    key: "muitos",
    label: "Fila embaralhada, com empate em toda prioridade",
    data: [
      [3, "#61"],
      [2, "#62"],
      [3, "#63"],
      [1, "#64"],
      [2, "#65"],
      [1, "#66"],
    ],
    hint: "Com empate em todas as prioridades, o salto longo do selection sort tem muito mais chance de acontecer. Repare que ele erra em dois pares de uma vez, e que os outros dois continuam intactos.",
  },
];

// Os três na forma baseada em TROCAS, para a distância de cada movimento ser
// comparável entre eles. Cada troca é registrada, e é daí que sai o maior salto.
function run(algo: "bubble" | "selection" | "insertion", input: Rec[]): Result {
  const a = input.map((r) => ({ ...r }));
  const n = a.length;
  let swaps = 0;
  let longestSwap = 0;
  const swap = (x: number, y: number) => {
    [a[x], a[y]] = [a[y], a[x]];
    swaps++;
    longestSwap = Math.max(longestSwap, Math.abs(x - y));
  };

  if (algo === "bubble") {
    for (let end = n - 1; end > 0; end--) {
      let moved = false;
      for (let j = 0; j < end; j++)
        if (a[j].key > a[j + 1].key) {
          swap(j, j + 1);
          moved = true;
        }
      if (!moved) break;
    }
  } else if (algo === "selection") {
    for (let i = 0; i < n - 1; i++) {
      let smallest = i;
      for (let j = i + 1; j < n; j++) if (a[j].key < a[smallest].key) smallest = j;
      if (smallest !== i) swap(i, smallest);
    }
  } else {
    for (let i = 1; i < n; i++) {
      let j = i;
      while (j > 0 && a[j - 1].key > a[j].key) {
        swap(j - 1, j);
        j--;
      }
    }
  }
  return { recs: a, swaps, longestSwap };
}

// Um empate inverteu se, entre dois registros de mesma chave, o que entrou
// depois aparece antes na saída.
function inverted(output: Rec[]): Set<number> {
  const marked = new Set<number>();
  for (let i = 0; i < output.length; i++)
    for (let j = i + 1; j < output.length; j++)
      if (output[i].key === output[j].key && output[i].orig > output[j].orig) {
        marked.add(output[i].orig);
        marked.add(output[j].orig);
      }
  return marked;
}

function Fila({
  recs,
  marked,
  title,
  badge,
  detail,
}: {
  recs: Rec[];
  marked: Set<number>;
  title: string;
  badge: string;
  detail?: string;
}) {
  return (
    <div className="hs-fila">
      <div className="hs-fila-cab">
        <span className="hs-fila-tit">{title}</span>
        <span className={`hs-fila-selo${marked.size > 0 ? " quebrou" : ""}`}>{badge}</span>
      </div>
      <div className="hp-arr">
        {recs.map((r) => (
          <span key={r.orig} className={`hp-cel reg${marked.has(r.orig) ? " inverteu" : ""}`}>
            <i>chegou em {r.orig}</i>
            <b>p{r.key}</b>
            <em>{r.tag}</em>
          </span>
        ))}
      </div>
      {detail ? <p className="bb-array-nota" style={{ marginTop: 8 }}>{detail}</p> : null}
    </div>
  );
}

export function OrdenacaoBasicaEstabilidade() {
  const [presetKey, setPresetKey] = useState("chamados");
  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);

  const input: Rec[] = useMemo(
    () => preset.data.map(([key, tag], orig) => ({ key, tag, orig })),
    [preset]
  );

  const bubble = useMemo(() => run("bubble", input), [input]);
  const selection = useMemo(() => run("selection", input), [input]);
  const insertion = useMemo(() => run("insertion", input), [input]);

  const tiesB = useMemo(() => inverted(bubble.recs), [bubble]);
  const tiesS = useMemo(() => inverted(selection.recs), [selection]);
  const tiesI = useMemo(() => inverted(insertion.recs), [insertion]);

  const sameKeys =
    selection.recs.map((r) => r.key).join(",") === bubble.recs.map((r) => r.key).join(",");

  // O par concreto que trocou de lugar, para a explicação citar etiquetas reais.
  const swappedPair = useMemo(() => {
    const s = selection.recs;
    for (let i = 0; i < s.length; i++)
      for (let j = i + 1; j < s.length; j++)
        if (s[i].key === s[j].key && s[i].orig > s[j].orig) return { before: s[j], after: s[i] };
    return null;
  }, [selection]);

  const detail = (r: Result) =>
    `${r.swaps} troca${r.swaps === 1 ? "" : "s"}, a mais longa com distância ${r.longestSwap || 0}`;

  const viz = useVisualizer({
    title: "Visualizador · a distância da troca decide a estabilidade",
    // Sem linha do tempo: a variável é o preset, não o tempo.
    total: 1,
    // Sem bloco dispensável: as quatro filas e a explicação são o conteúdo.
    collapsible: false,
  });

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      {/* Sem "passo N de M": entra o número que resume o estado, com o rótulo
          junto, como manda a §6 do contrato. */}
      <VizHeader viz={viz}>
        <span className="viz-step">
          {tiesS.size > 0 ? `${tiesS.size} chamados fora da ordem de chegada` : "nenhum empate trocou desta vez"}
        </span>
      </VizHeader>

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
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
          <Fila
            recs={bubble.recs}
            marked={tiesB}
            title="Bubble sort"
            badge={tiesB.size > 0 ? "empates trocados" : "empates preservados"}
            detail={detail(bubble)}
          />
          <Fila
            recs={insertion.recs}
            marked={tiesI}
            title="Insertion sort"
            badge={tiesI.size > 0 ? "empates trocados" : "empates preservados"}
            detail={detail(insertion)}
          />
          <Fila
            recs={selection.recs}
            marked={tiesS}
            title="Selection sort"
            badge={tiesS.size > 0 ? "empates trocados" : "empates preservados"}
            detail={detail(selection)}
          />
        </div>

        <p className={`viz-note${tiesS.size > 0 ? " invalid" : " ok"}`}>
          {swappedPair ? (
            <>
              As três saídas estão <strong>corretas pela prioridade</strong>
              {sameKeys ? ": a sequência de prioridades é idêntica nas três" : ""}. O que mudou foi o
              desempate. <strong>{swappedPair.after.tag}</strong> chegou na posição {swappedPair.after.orig} e{" "}
              <strong>{swappedPair.before.tag}</strong> na {swappedPair.before.orig}, os dois com prioridade{" "}
              {swappedPair.before.key}, e o selection sort devolveu {swappedPair.after.tag} na frente. Repare
              na causa, logo acima: a maior troca do bubble e do insertion tem distância{" "}
              {Math.max(bubble.longestSwap, insertion.longestSwap)}, e a do selection tem distância{" "}
              {selection.longestSwap}. Uma troca de distância 1 não consegue pular por cima de ninguém, então
              empate nunca muda de ordem. Uma troca longa passa por cima de quem estiver no caminho, e nada no
              algoritmo confere se aquele alguém tem a mesma chave.
            </>
          ) : (
            <>
              Neste preset nenhum empate mudou de lugar, nem no selection sort. Isso não o torna estável:
              instável quer dizer que ele <strong>não garante nada</strong> sobre empates. Repare que a maior
              troca dele já tem distância {selection.longestSwap}, ou seja, a capacidade de atropelar um igual
              está lá; foi só o acaso do arranjo que não cobrou. Troque de preset para ver a garantia falhar.
            </>
          )}
        </p>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Onde isso morde de verdade: ordenações encadeadas. &quot;Ordene por nome, depois por
          prioridade&quot; só produz o resultado esperado se o segundo sort for estável. Com um instável você
          precisa comparar os dois critérios na mesma função de comparação, em vez de ordenar duas vezes. E
          repare no card de trocas: o selection sort é o mais desastrado com empates e, ao mesmo tempo, o que
          menos escreve no array. As duas coisas têm a mesma causa.
        </p>
      </div>

      {/* Sem linha do tempo e sem botões extras, o rodapé não desenha nada. */}
      <VizFooter viz={viz} />
    </figure>
  );
}
