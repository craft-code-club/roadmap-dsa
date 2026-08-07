"use client";

import { useMemo, useState } from "react";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";
import { ALGOS, NAMES, PRESETS, cost, inversions, type Algorithm } from "./OrdenacaoBasicaVisualizer";

// ---------------------------------------------------------------------------
// OrdenacaoBasicaCorrida, o custo total dos três lado a lado.
//
// O passo a passo ao lado mostra COMO cada algoritmo se move. Este mostra
// QUANTO isso custa, e a única coisa que o aluno precisa enxergar é que a
// resposta muda com a entrada, não só com o algoritmo: os três são O(n²) e
// mesmo assim o vencedor troca de nome quando o array chega quase ordenado.
//
// Interativo sem linha do tempo: não há passo, não há play, não há intervalo.
// A variável que o aluno mexe é a ENTRADA, e as seis barras respondem juntas.
//
// Os números vêm de `cost()`, que roda o mesmo gerador de passos da animação.
// Nada aqui é tabela fixa: mudar o gerador muda as barras no mesmo commit, e é
// isso que impede a corrida de mentir sobre o que o visualizador ao lado mostra.
//
// A linha das inversões existe para dar a lei de conservação por escrito:
// bubble paga 2 escritas por inversão, insertion paga 1 por inversão mais as
// n - 1 colocações, e o selection não paga por inversão nenhuma. Sem ela as
// barras seriam só três números bonitos sem explicação.
//
// Sobre a casca: `total: 1` e `collapsible: false`. Não há passo a passo nem
// bloco dispensável — as seis barras e a lei das inversões SÃO o conteúdo. É a
// peça da rodada em que a régua de 1512x900 mais engana: ali ela cabe (727px de
// 816) e a 1440x700 passa do orçamento (748 de 616), que é o corolário da §3.
// ---------------------------------------------------------------------------

type Row = { algo: Algorithm; comps: number; writes: number };

function lawFor(algo: Algorithm, inv: number, n: number): string {
  if (algo === "bubble") return `2 x ${inv} inversões = ${2 * inv}`;
  if (algo === "insertion") return `${inv} inversões + ${n - 1} colocações = ${inv + n - 1}`;
  return "2 por rodada que precisou trocar";
}

export function OrdenacaoBasicaCorrida() {
  const [presetKey, setPresetKey] = useState("shuffled");
  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const n = preset.values.length;
  const inv = useMemo(() => inversions(preset.values), [preset]);

  const rows: Row[] = useMemo(
    () => ALGOS.map((algo) => ({ algo, ...cost(algo, preset.values) })),
    [preset]
  );

  const maxComps = Math.max(...rows.map((l) => l.comps), 1);
  const maxWrites = Math.max(...rows.map((l) => l.writes), 1);
  const bestComps = Math.min(...rows.map((l) => l.comps));
  const bestWrites = Math.min(...rows.map((l) => l.writes));

  // O piso teórico de comparações de qualquer ordenação por comparação em cima
  // deste array: n - 1 (é preciso ao menos olhar cada vizinho uma vez).
  const floor = n - 1;
  const ceiling = (n * (n - 1)) / 2;

  const viz = useVisualizer({
    title: "Visualizador · o mesmo array custa três preços diferentes",
    // Sem linha do tempo: a variável é a entrada, e as seis barras respondem juntas.
    total: 1,
    // Sem bloco dispensável: as barras e a lei das inversões são o conteúdo.
    collapsible: false,
  });

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      {/* Sem "passo N de M": entra o número que resume o estado, com o rótulo
          junto, como manda a §6 do contrato. */}
      <VizHeader viz={viz}>
        <span className="viz-step">
          {inv} inversões na entrada · piso {floor}, teto {ceiling} comparações
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

        <div className="ord-corrida">
          {rows.map((l) => (
            <div className="ord-linha" key={l.algo}>
              <div className="ord-linha-nome">{NAMES[l.algo]}</div>
              <div className="ord-medidas">
                <div className={`ord-medida${l.comps === bestComps ? " melhor" : ""}`}>
                  <span className="ord-medida-rot">comparações</span>
                  <div className="bb-barra">
                    <div className="bb-barra-fill" style={{ width: `${(l.comps / maxComps) * 100}%` }} />
                    <span className="bb-barra-txt">{l.comps}</span>
                  </div>
                </div>
                <div className={`ord-medida${l.writes === bestWrites ? " melhor" : ""}`}>
                  <span className="ord-medida-rot">escritas no array</span>
                  <div className="bb-barra">
                    <div className="bb-barra-fill esc" style={{ width: `${(l.writes / maxWrites) * 100}%` }} />
                    <span className="bb-barra-txt">{l.writes}</span>
                  </div>
                  <span className="ord-lei">{lawFor(l.algo, inv, n)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="viz-note">
          A entrada tem <strong>{inv} inversões</strong>, ou seja, {inv} pares em que o valor da esquerda é
          maior que o da direita. Esse número não é decoração: o bubble sort troca exatamente uma vez por
          inversão ({2 * inv} escritas) e o insertion sort desloca exatamente uma vez por inversão, mais uma
          colocação por elemento ({inv + n - 1} escritas). O selection sort é o único que não paga por
          inversão: ele faz no máximo {n - 1} trocas, aconteça o que acontecer, porque cada rodada dele
          termina com uma troca só.
        </p>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Troque a entrada e olhe quem ganha cada barra. O selection sort tem sempre as mesmas{" "}
          {ceiling} comparações, nos quatro presets, porque a varredura dele não depende dos dados. O insertion
          sort vai de {ceiling} comparações no invertido a {floor} no já ordenado. Os três são O(n²) e mesmo assim
          não são intercambiáveis: O(n²) é o teto, não a conta.
        </p>
      </div>

      {/* Sem linha do tempo e sem botões extras, o rodapé não desenha nada. */}
      <VizFooter viz={viz} />
    </figure>
  );
}
