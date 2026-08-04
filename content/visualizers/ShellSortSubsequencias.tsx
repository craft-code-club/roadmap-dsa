"use client";

import { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// ShellSortSubsequencias, o que uma rodada de gap h realmente faz.
//
// A única coisa que o aluno precisa enxergar é que uma rodada de gap h não é
// "uma passada esquisita com saltos": é um insertion sort completo rodando em
// h arrays diferentes ao mesmo tempo, entrelaçados na mesma fita de memória.
// Quem enxerga isso para de achar o algoritmo arbitrário, porque cada rodada
// passa a ser uma coisa que já se conhece.
//
// E daí sai a pergunta que decide se o algoritmo funciona: ordenar com gap 2
// não desmancha o que a rodada de gap 4 tinha arrumado? Não, e esse é o
// resultado de Knuth que sustenta o shell sort inteiro: um array h-ordenado
// continua h-ordenado depois de ser k-ordenado. Por isso os selos de
// h-ordenação ficam na tela e são recalculados de verdade a cada rodada, em vez
// de a propriedade ser prometida num parágrafo.
//
// Interativo sem linha do tempo: a variável é a RODADA, não o passo dentro dela.
// ---------------------------------------------------------------------------

const ENTRADA = [5, 3, 21, 13, 1, 7, 6, 15];

// Uma rodada de gap h: insertion sort dentro de cada subsequência.
function rodada(a: number[], gap: number): number[] {
  const v = [...a];
  for (let i = gap; i < v.length; i++) {
    const atual = v[i];
    let j = i;
    while (j >= gap && v[j - gap] > atual) {
      v[j] = v[j - gap];
      j -= gap;
    }
    v[j] = atual;
  }
  return v;
}

// h-ordenado: todo elemento é menor ou igual ao que está h casas à frente.
function hOrdenado(v: number[], h: number): boolean {
  for (let i = 0; i + h < v.length; i++) if (v[i] > v[i + h]) return false;
  return true;
}

const GAPS = (() => {
  const g: number[] = [];
  for (let h = Math.floor(ENTRADA.length / 2); h > 0; h = Math.floor(h / 2)) g.push(h);
  return g;
})();

// Estado do array antes de cada rodada, calculado uma vez só.
const ESTADOS = (() => {
  const e: number[][] = [ENTRADA];
  let atual = ENTRADA;
  for (const g of GAPS) {
    atual = rodada(atual, g);
    e.push(atual);
  }
  return e;
})();

export function ShellSortSubsequencias() {
  const [rodadaIdx, setRodadaIdx] = useState(0);
  const gap = GAPS[rodadaIdx];
  const antes = ESTADOS[rodadaIdx];
  const depois = ESTADOS[rodadaIdx + 1];
  const n = ENTRADA.length;

  const subs = useMemo(() => {
    const out: { resto: number; idx: number[] }[] = [];
    for (let r = 0; r < gap; r++) {
      const idx: number[] = [];
      for (let k = r; k < n; k += gap) idx.push(k);
      out.push({ resto: r, idx });
    }
    return out;
  }, [gap, n]);

  const mudou = useMemo(() => antes.some((v, k) => v !== depois[k]), [antes, depois]);

  return (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · uma rodada de gap h são h insertion sorts entrelaçados</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">
            gap {gap} · {gap} subsequência{gap === 1 ? "" : "s"} de {Math.ceil(n / gap)} elemento
            {Math.ceil(n / gap) === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          {GAPS.map((g, k) => (
            <button
              key={g}
              className={`bigo-chip${rodadaIdx === k ? " on" : ""}`}
              onClick={() => setRodadaIdx(k)}
              aria-pressed={rodadaIdx === k}
            >
              Rodada {k + 1}: gap {g}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">
          Com gap {gap}, o elemento da posição i só é comparado com i - {gap}, i - {2 * gap}, e assim por
          diante. Isso parte o array em {gap} subsequência{gap === 1 ? "" : "s"} que não se enxergam, e cada uma
          delas é ordenada por inserção como se fosse um array independente.
        </p>

        <div className="hs-filas">
          <div className="hs-fila">
            <div className="hs-fila-cab">
              <span className="hs-fila-tit">Antes da rodada</span>
              <span className="hs-fila-selo">{antes.join(", ")}</span>
            </div>
            <div className="hp-arr">
              {antes.map((v, k) => (
                <span key={k} className={`hp-cel sub-${k % gap}`}>
                  <i>{k}</i>
                  {v}
                </span>
              ))}
            </div>
          </div>

          {subs.map((sub) => {
            const antesSub = sub.idx.map((k) => antes[k]);
            const depoisSub = sub.idx.map((k) => depois[k]);
            const mexeu = antesSub.some((v, k) => v !== depoisSub[k]);
            return (
              <div className="hs-fila" key={sub.resto}>
                <div className="hs-fila-cab">
                  <span className="hs-fila-tit">
                    Subsequência dos índices {sub.idx.join(", ")}
                  </span>
                  <span className={`hs-fila-selo${mexeu ? "" : ""}`}>
                    {antesSub.join(", ")} vira {depoisSub.join(", ")}
                    {mexeu ? "" : " (nada a fazer)"}
                  </span>
                </div>
                <div className="hp-arr">
                  {depoisSub.map((v, k) => (
                    <span key={k} className={`hp-cel sub-${sub.resto}${v !== antesSub[k] ? " troca" : ""}`}>
                      <i>{sub.idx[k]}</i>
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          <div className="hs-fila">
            <div className="hs-fila-cab">
              <span className="hs-fila-tit">Depois da rodada</span>
              <span className="hs-fila-selo">{mudou ? "o array mudou" : "nada mudou nesta rodada"}</span>
            </div>
            <div className="hp-arr">
              {depois.map((v, k) => (
                <span key={k} className={`hp-cel sub-${k % gap}${v !== antes[k] ? " troca" : ""}`}>
                  <i>{k}</i>
                  {v}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            O que já está garantido depois desta rodada <em>h-ordenado = todo elemento é menor ou igual ao que está h casas à frente</em>
          </div>
          <div className="ss-selos">
            {GAPS.map((h) => {
              const vale = hOrdenado(depois, h);
              return (
                <span key={h} className={`ss-selo ${vale ? "sim" : "nao"}`}>
                  {h}-ordenado: {vale ? "sim" : "ainda não"}
                </span>
              );
            })}
          </div>
        </div>

        <p className="viz-note ok">
          Repare no selo de {GAPS[0]}-ordenado nas três rodadas: uma vez conquistado, ele{" "}
          <strong>nunca mais é perdido</strong>. Esse é o resultado que sustenta o shell sort inteiro: um array
          h-ordenado continua h-ordenado depois de ser ordenado com qualquer outro gap. Sem essa garantia, cada
          rodada desmancharia a anterior e o algoritmo não teria como funcionar. Com ela, a última rodada (gap
          1, que é o insertion sort puro) recebe um array em que todo elemento já está a poucas casas do lugar
          definitivo, e o caminho para trás fica curtíssimo.
        </p>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          É também daqui que vem a instabilidade do shell sort. Dentro de uma subsequência, um elemento salta{" "}
          {gap} posições de uma vez e passa por cima de tudo que está no meio, inclusive de valores com a mesma
          chave que ele. O insertion sort não consegue fazer isso porque só compara vizinhos, e é por isso que
          ele é estável e o shell sort não é. Trocar a constante 1 por uma variável dá velocidade e cobra a
          estabilidade como preço.
        </p>
      </div>
    </figure>
  );
}
