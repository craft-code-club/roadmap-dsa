"use client";

import { useMemo, useState } from "react";
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
// ---------------------------------------------------------------------------

const TAMANHOS = [8, 16, 32, 64];

// Formatador determinístico: Intl.NumberFormat diverge entre build e cliente e
// quebra a hidratação.
function num(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function compacto(v: number): string {
  if (v >= 1e15) return `${num(v / 1e15)} quatri`;
  if (v >= 1e12) return `${num(v / 1e12)} tri`;
  if (v >= 1e9) return `${num(v / 1e9)} bi`;
  if (v >= 1e6) return `${num(v / 1e6)} mi`;
  return num(v);
}

const ESCALAS = [1_000, 1_000_000, 1_000_000_000];

export function MergeSortNiveis() {
  const [n, setN] = useState(16);
  const niveis = useMemo(() => segments(n), [n]);
  const rodadas = Math.log2(n); // n é sempre potência de 2 aqui
  const movimentos = n * rodadas;
  const quadratico = (n * (n - 1)) / 2;

  return (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · o n log n desenhado: altura vezes largura</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">
            {rodadas} rodadas de intercalação x {n} elementos = {movimentos} movimentos
          </span>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          {TAMANHOS.map((t) => (
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
            A recursão inteira <em>cada faixa soma {n} elementos, e são {rodadas} rodadas de intercalação</em>
          </div>
          <div className="ms-niveis">
            {niveis.map((segs, prof) => (
              <div className="ms-nivel" key={prof}>
                <span className="ms-nivel-rot">
                  nível {prof} · {segs.length} trecho{segs.length === 1 ? "" : "s"} de {n / segs.length}
                </span>
                <div className="ms-nivel-faixa" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                  {segs.map((s) => (
                    <span
                      key={`${s.lo}-${s.hi}`}
                      className={`ms-seg${prof === niveis.length - 1 ? " folha" : ""}`}
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
            <strong>{rodadas}</strong>
          </div>
          <div className="bigo-stat">
            <span>movimentos totais</span>
            <strong>{num(movimentos)}</strong>
          </div>
          <div className="bigo-stat">
            <span>pior caso de um O(n²)</span>
            <strong>{num(quadratico)}</strong>
          </div>
        </div>

        <p className="viz-note ok">
          Com {n} elementos dá para partir ao meio <strong>{rodadas} vezes</strong> antes de sobrar um elemento
          por trecho, porque {n} = 2<sup>{rodadas}</sup>. Cada rodada de intercalação toca cada elemento uma vez
          e só uma, então o trabalho de uma rodada é sempre {n}. O total é o produto: {n} x {rodadas} ={" "}
          {num(movimentos)} movimentos. É literalmente isso que a notação n log n descreve, e é por isso que ela
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
                {ESCALAS.map((e) => {
                  const r = Math.ceil(Math.log2(e));
                  const ms = e * r;
                  const q = (e * (e - 1)) / 2;
                  return (
                    <tr key={e}>
                      <td>{compacto(e)}</td>
                      <td className="nums">{r}</td>
                      <td className="nums">
                        <span className="hp-custo c-otimo">{compacto(ms)}</span>
                      </td>
                      <td className="nums">
                        <span className="hp-custo c-ruim">{compacto(q)}</span>
                      </td>
                      <td className="nums">{compacto(q / ms)} vezes</td>
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
    </figure>
  );
}
