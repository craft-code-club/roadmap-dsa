"use client";

import { useMemo, useState } from "react";
import { ALGOS, NOMES, PRESETS, custo, inversoes, type Algo } from "./OrdenacaoBasicaVisualizer";

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
// Os números vêm de `custo()`, que roda o mesmo gerador de passos da animação.
// Nada aqui é tabela fixa: mudar o gerador muda as barras no mesmo commit, e é
// isso que impede a corrida de mentir sobre o que o visualizador ao lado mostra.
//
// A linha das inversões existe para dar a lei de conservação por escrito:
// bubble paga 2 escritas por inversão, insertion paga 1 por inversão mais as
// n - 1 colocações, e o selection não paga por inversão nenhuma. Sem ela as
// barras seriam só três números bonitos sem explicação.
// ---------------------------------------------------------------------------

type Linha = { algo: Algo; comp: number; escritas: number };

function leiDe(algo: Algo, inv: number, n: number): string {
  if (algo === "bubble") return `2 x ${inv} inversões = ${2 * inv}`;
  if (algo === "insertion") return `${inv} inversões + ${n - 1} colocações = ${inv + n - 1}`;
  return "2 por rodada que precisou trocar";
}

export function OrdenacaoBasicaCorrida() {
  const [presetKey, setPresetKey] = useState("embaralhado");
  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const n = preset.valores.length;
  const inv = useMemo(() => inversoes(preset.valores), [preset]);

  const linhas: Linha[] = useMemo(
    () => ALGOS.map((algo) => ({ algo, ...custo(algo, preset.valores) })),
    [preset]
  );

  const maxComp = Math.max(...linhas.map((l) => l.comp), 1);
  const maxEsc = Math.max(...linhas.map((l) => l.escritas), 1);
  const melhorComp = Math.min(...linhas.map((l) => l.comp));
  const melhorEsc = Math.min(...linhas.map((l) => l.escritas));

  // O piso teórico de comparações de qualquer ordenação por comparação em cima
  // deste array: n - 1 (é preciso ao menos olhar cada vizinho uma vez).
  const piso = n - 1;
  const teto = (n * (n - 1)) / 2;

  return (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · o mesmo array custa três preços diferentes</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">
            {inv} inversões na entrada · piso {piso}, teto {teto} comparações
          </span>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              key={pr.key}
              className={`bigo-chip${presetKey === pr.key ? " on" : ""}`}
              onClick={() => setPresetKey(pr.key)}
              aria-pressed={presetKey === pr.key}
            >
              {pr.rotulo}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">{preset.dica}</p>

        <div className="ord-corrida">
          {linhas.map((l) => (
            <div className="ord-linha" key={l.algo}>
              <div className="ord-linha-nome">{NOMES[l.algo]}</div>
              <div className="ord-medidas">
                <div className={`ord-medida${l.comp === melhorComp ? " melhor" : ""}`}>
                  <span className="ord-medida-rot">comparações</span>
                  <div className="bb-barra">
                    <div className="bb-barra-fill" style={{ width: `${(l.comp / maxComp) * 100}%` }} />
                    <span className="bb-barra-txt">{l.comp}</span>
                  </div>
                </div>
                <div className={`ord-medida${l.escritas === melhorEsc ? " melhor" : ""}`}>
                  <span className="ord-medida-rot">escritas no array</span>
                  <div className="bb-barra">
                    <div className="bb-barra-fill esc" style={{ width: `${(l.escritas / maxEsc) * 100}%` }} />
                    <span className="bb-barra-txt">{l.escritas}</span>
                  </div>
                  <span className="ord-lei">{leiDe(l.algo, inv, n)}</span>
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
          {teto} comparações, nos quatro presets, porque a varredura dele não depende dos dados. O insertion
          sort vai de {teto} comparações no invertido a {piso} no já ordenado. Os três são O(n²) e mesmo assim
          não são intercambiáveis: O(n²) é o teto, não a conta.
        </p>
      </div>
    </figure>
  );
}
