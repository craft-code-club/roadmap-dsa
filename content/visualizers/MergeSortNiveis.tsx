"use client";

import { useMemo, useState } from "react";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";
import { segments } from "./MergeSortVisualizer";

// ---------------------------------------------------------------------------
// MergeSortNiveis, de onde sai o n log n.
//
// A única coisa que o aluno precisa enxergar é que o n log n do merge sort é um
// PRODUTO de duas grandezas independentes, e que dá para ver as duas na tela:
// a altura da pilha de faixas é o log n (quantas vezes dá para partir ao meio) e
// a largura de cada faixa é o n (todo elemento é tocado uma vez por rodada).
// Ninguém precisa de teorema mestre para acreditar em algo que está desenhado.
//
// Só potências de dois nos presets, e isso é deliberado: com n = 2^k as duas
// afirmações do parágrafo acima são exatas (log2 n rodadas, n movimentos em
// cada), então nenhum rótulo precisa de asterisco. Com n = 7 a última rodada
// move menos que n e o card viraria uma meia verdade.
//
// Interativo sem linha do tempo: a variável é o TAMANHO da entrada, não o tempo.
//
// Sobre a casca: `total: 1` (não há passo a passo, e o número que resume o
// estado entra no lugar do contador) e `collapsible: false` (não há bloco
// dispensável — as faixas, os cartões e a tabela SÃO o conteúdo). O que a peça
// ganha é o painel expandido com o cabeçalho parado enquanto o miolo rola, que
// é justamente o que falta a ela: com n = 64 ela pede 1.001px de um orçamento
// de 816 a 1512x900, e 1.015 de 616 a 1440x700.
// ---------------------------------------------------------------------------

const SIZES = [8, 16, 32, 64];

// Formatador determinístico: Intl.NumberFormat diverge entre build e cliente e
// quebra a hidratação.
function num(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function compact(v: number): string {
  if (v >= 1e15) return `${num(v / 1e15)} quatri`;
  if (v >= 1e12) return `${num(v / 1e12)} tri`;
  if (v >= 1e9) return `${num(v / 1e9)} bi`;
  if (v >= 1e6) return `${num(v / 1e6)} mi`;
  return num(v);
}

const SCALES = [1_000, 1_000_000, 1_000_000_000];

export function MergeSortNiveis() {
  const [n, setN] = useState(16);
  const levels = useMemo(() => segments(n), [n]);
  const rounds = Math.log2(n); // n é sempre potência de 2 aqui
  const moves = n * rounds;
  const quadratic = (n * (n - 1)) / 2;

  const viz = useVisualizer({
    title: "Visualizador · o n log n desenhado: altura vezes largura",
    // Sem linha do tempo: a variável é o tamanho da entrada, não o tempo.
    total: 1,
    // Sem bloco dispensável: as faixas, os cartões e a tabela são o conteúdo.
    collapsible: false,
    // `measureOn` fica de fora: com `collapsible: false` não há decisão a tomar
    // e o hook nem espera as fontes. Passar a lista anunciaria uma medição que
    // não acontece — e o eixo de altura desta peça (o `n`) é real, então a
    // tentação de listá-lo é grande.
  });

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      {/* Sem "passo N de M": o número que resume o estado entra no lugar dele,
          com o rótulo junto, como manda a §6 do contrato. */}
      <VizHeader viz={viz}>
        <span className="viz-step">
          {rounds} rodadas de intercalação x {n} elementos = {moves} movimentos
        </span>
      </VizHeader>

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {SIZES.map((t) => (
            <button key={t} className={`bigo-chip${n === t ? " on" : ""}`} onClick={() => setN(t)} aria-pressed={n === t}>
              n = {t}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">
          Cada faixa é um nível da recursão. Repare em duas coisas ao trocar o tamanho: a largura total nunca
          muda (todo elemento aparece exatamente uma vez em cada faixa) e o número de faixas cresce
          devagarissimamente. Dobrar n acrescenta uma faixa só.
        </p>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            A recursão inteira <em>cada faixa soma {n} elementos, e são {rounds} rodadas de intercalação</em>
          </div>
          <div className="ms-niveis">
            {levels.map((segs, depth) => (
              <div className="ms-nivel" key={depth}>
                <span className="ms-nivel-rot">
                  nível {depth} · {segs.length} trecho{segs.length === 1 ? "" : "s"} de {n / segs.length}
                </span>
                <div className="ms-nivel-faixa" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                  {segs.map((s) => (
                    <span
                      key={`${s.lo}-${s.hi}`}
                      className={`ms-seg${depth === levels.length - 1 ? " folha" : ""}`}
                      style={{ gridColumn: `${s.lo + 1} / ${s.hi + 2}` }}
                    >
                      {n <= 16 ? (s.lo === s.hi ? s.lo : `${s.lo}..${s.hi}`) : ""}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>tamanho do array</span>
            <strong>{n}</strong>
          </div>
          <div className="bigo-stat">
            <span>rodadas de intercalação</span>
            <strong>{rounds}</strong>
          </div>
          <div className="bigo-stat">
            <span>movimentos totais</span>
            <strong>{num(moves)}</strong>
          </div>
          <div className="bigo-stat">
            <span>pior caso de um O(n²)</span>
            <strong>{num(quadratic)}</strong>
          </div>
        </div>

        <p className="viz-note ok">
          Com {n} elementos dá para partir ao meio <strong>{rounds} vezes</strong> antes de sobrar um elemento
          por trecho, porque {n} = 2<sup>{rounds}</sup>. Cada rodada de intercalação toca cada elemento uma vez
          e só uma, então o trabalho de uma rodada é sempre {n}. O total é o produto: {n} x {rounds} ={" "}
          {num(moves)} movimentos. É literalmente isso que a notação n log n descreve, e é por isso que ela
          vale no melhor, no médio e no pior caso: a estrutura da recursão não olha para os dados.
        </p>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            E quando o array cresce de verdade <em>n log₂ n contra n(n-1)/2</em>
          </div>
          <div className="bigo-fam-scroll">
            <table className="bigo-fam-table">
              <thead>
                <tr>
                  <th>n</th>
                  <th className="nums">rodadas (log₂ n)</th>
                  <th className="nums">merge sort</th>
                  <th className="nums">um O(n²)</th>
                  <th className="nums">quantas vezes pior</th>
                </tr>
              </thead>
              <tbody>
                {SCALES.map((e) => {
                  const r = Math.ceil(Math.log2(e));
                  const ms = e * r;
                  const q = (e * (e - 1)) / 2;
                  return (
                    <tr key={e}>
                      <td>{compact(e)}</td>
                      <td className="nums">{r}</td>
                      <td className="nums">
                        <span className="hp-custo c-otimo">{compact(ms)}</span>
                      </td>
                      <td className="nums">
                        <span className="hp-custo c-ruim">{compact(q)}</span>
                      </td>
                      <td className="nums">{compact(q / ms)} vezes</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          O salto entre as duas colunas é o argumento inteiro a favor dos algoritmos O(n log n). Com um milhão
          de elementos, o merge sort faz cerca de 20 milhões de movimentos e um algoritmo quadrático faz 500
          bilhões: 25 mil vezes mais trabalho. Numa máquina que faça 100 milhões de operações por segundo, isso
          é a diferença entre 0,2 segundo e mais de uma hora.
        </p>
      </div>

      {/* Sem linha do tempo e sem botões extras, o rodapé não desenha nada — é o
          comportamento documentado do hook. Fica aqui para que acrescentar um
          controle depois não passe por reescrever a casca à mão. */}
      <VizFooter viz={viz} />
    </figure>
  );
}
