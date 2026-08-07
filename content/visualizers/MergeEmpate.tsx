"use client";

import { useMemo, useState } from "react";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// MergeEmpate, o caractere que decide a estabilidade do merge sort.
//
// A única coisa que o aluno precisa enxergar é que a estabilidade do merge sort
// não é uma propriedade emergente da estratégia de dividir e conquistar: ela é
// uma DECISÃO, tomada numa comparação, e cabe num sinal. Com `<=` o empate fica
// com o lado esquerdo, que é o lado que veio antes no array original; com `<`
// ele vai para o direito, e todo empate se inverte.
//
// Por isso os dois resultados aparecem lado a lado, calculados de verdade com
// os dois operadores, em vez de um resultado e um parágrafo dizendo o que
// aconteceria. A lista de decisões no meio mostra exatamente em qual comparação
// as duas versões se separam: são idênticas até o primeiro empate.
//
// Interativo sem linha do tempo de propósito. A variável aqui é o OPERADOR, e
// dar um botão de play sobre uma intercalação de seis elementos empurraria a
// atenção para o passo a passo, que é assunto do visualizador principal.
//
// Sobre a casca: `total: 1` e `collapsible: false`. Não há passo a passo nem
// bloco dispensável — as duas colunas e a lista de decisões SÃO o conteúdo. O
// que a peça ganha é o painel expandido com o cabeçalho parado enquanto o miolo
// rola, e ela precisa: o preset das linhas de log pede 1.205px de um orçamento
// de 816 a 1512x900, e 2.185 de 760 a 390x844.
// ---------------------------------------------------------------------------

type Rec = { key: number; tag: string; orig: number };

type Decision = { left: Rec | null; right: Rec | null; tie: boolean; chosen: Rec; side: "left" | "right" };

type Preset = { key: string; label: string; data: [number, string][]; hint: string };

const PRESETS: Preset[] = [
  {
    key: "logs",
    label: "Linhas de log com o mesmo segundo",
    data: [
      [12, "erro-A"],
      [9, "info-B"],
      [12, "erro-C"],
      [7, "info-D"],
      [9, "warn-E"],
      [12, "erro-F"],
    ],
    hint: "Três linhas caíram no segundo 12 e duas no segundo 9. Ordenar por horário não pode embaralhar a ordem em que elas foram escritas, senão a leitura do incidente conta a história errada.",
  },
  {
    key: "um",
    label: "Um único empate, no fim da intercalação",
    data: [
      [3, "a"],
      [5, "b"],
      [1, "c"],
      [5, "d"],
    ],
    hint: "O menor exemplo que quebra: duas chaves 5, uma em cada metade. Repare que as duas versões tomam decisões idênticas até chegar nesse empate, e só ali se separam.",
  },
  {
    key: "todos",
    label: "Chaves todas iguais",
    data: [
      [4, "p"],
      [4, "q"],
      [4, "r"],
      [4, "s"],
    ],
    hint: "Caso extremo: como toda comparação é um empate, o operador decide tudo. Com <= a saída é idêntica à entrada; com < as duas metades trocam de lugar inteiras.",
  },
];

// Merge de duas metades já ordenadas, com o operador escolhido. É a única
// diferença entre as duas colunas: o resto do algoritmo é idêntico.
function merge(left: Rec[], right: Rec[], strict: boolean): { output: Rec[]; decisions: Decision[] } {
  const output: Rec[] = [];
  const decisions: Decision[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length || j < right.length) {
    const hasLeft = i < left.length;
    const hasRight = j < right.length;
    const takeLeft = !hasRight || (hasLeft && (strict ? left[i].key < right[j].key : left[i].key <= right[j].key));
    const chosen = takeLeft ? left[i] : right[j];
    decisions.push({
      left: hasLeft ? left[i] : null,
      right: hasRight ? right[j] : null,
      tie: hasLeft && hasRight && left[i].key === right[j].key,
      chosen,
      side: takeLeft ? "left" : "right",
    });
    output.push(chosen);
    if (takeLeft) i++;
    else j++;
  }
  return { output, decisions };
}

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

function Fila({ recs, marked, title, badge }: { recs: Rec[]; marked: Set<number>; title: string; badge?: string }) {
  return (
    <div className="hs-fila">
      <div className="hs-fila-cab">
        <span className="hs-fila-tit">{title}</span>
        {badge ? <span className={`hs-fila-selo${marked.size > 0 ? " quebrou" : ""}`}>{badge}</span> : null}
      </div>
      <div className="hp-arr">
        {recs.map((r) => (
          <span key={r.orig} className={`hp-cel reg${marked.has(r.orig) ? " inverteu" : ""}`}>
            <i>entrou em {r.orig}</i>
            <b>{r.key}</b>
            <em>{r.tag}</em>
          </span>
        ))}
      </div>
    </div>
  );
}

export function MergeEmpate() {
  const [presetKey, setPresetKey] = useState("logs");
  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);

  const input: Rec[] = useMemo(
    () => preset.data.map(([key, tag], orig) => ({ key, tag, orig })),
    [preset]
  );

  // As duas metades chegam à intercalação final já ordenadas, exatamente como a
  // recursão as devolveria. Ordenar cada uma de forma estável aqui é o que
  // reproduz esse estado sem precisar rodar a recursão inteira.
  const [left, right] = useMemo(() => {
    const mid = Math.ceil(input.length / 2);
    const stable = (v: Rec[]) => [...v].sort((x, y) => x.key - y.key || x.orig - y.orig);
    return [stable(input.slice(0, mid)), stable(input.slice(mid))];
  }, [input]);

  const withLte = useMemo(() => merge(left, right, false), [left, right]);
  const withLt = useMemo(() => merge(left, right, true), [left, right]);
  const tiesLte = useMemo(() => inverted(withLte.output), [withLte]);
  const tiesLt = useMemo(() => inverted(withLt.output), [withLt]);

  // O primeiro passo em que as duas versões escolhem lados diferentes.
  const divergence = useMemo(() => {
    for (let k = 0; k < withLte.decisions.length; k++)
      if (withLte.decisions[k].chosen.orig !== withLt.decisions[k].chosen.orig) return k;
    return -1;
  }, [withLte, withLt]);

  const sameKeys =
    withLte.output.map((r) => r.key).join(",") === withLt.output.map((r) => r.key).join(",");

  const viz = useVisualizer({
    title: "Visualizador · o sinal que decide a estabilidade",
    // Sem linha do tempo: a variável é o operador, não o tempo.
    total: 1,
    // Sem bloco dispensável: as duas colunas e a lista de decisões são o conteúdo.
    collapsible: false,
  });

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      {/* Sem "passo N de M": entra o número que resume o estado, com o rótulo
          junto, como manda a §6 do contrato. */}
      <VizHeader viz={viz}>
        <span className="viz-step">
          {divergence >= 0
            ? `as duas versões se separam na decisão ${divergence + 1}`
            : "nenhum empate nesta entrada: as duas versões coincidem"}
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
          <Fila recs={input} marked={new Set()} title="Entrada, na ordem em que chegou" />
          <Fila recs={left} marked={new Set()} title="Metade esquerda, já ordenada pela recursão" />
          <Fila recs={right} marked={new Set()} title="Metade direita, já ordenada pela recursão" />
        </div>

        <div className="ms-operadores">
          <div className="ms-op ok">
            <div className="bb-formula-cab">
              <span className="bb-formula-tit">esq[i] &lt;= dir[j]</span>
              <span className="bb-formula-selo">{tiesLte.size > 0 ? "empates trocados" : "estável"}</span>
            </div>
            <div className="hp-arr">
              {withLte.output.map((r) => (
                <span key={r.orig} className={`hp-cel reg${tiesLte.has(r.orig) ? " inverteu" : ""}`}>
                  <i>entrou em {r.orig}</i>
                  <b>{r.key}</b>
                  <em>{r.tag}</em>
                </span>
              ))}
            </div>
            <p className="bb-formula-fim">
              No empate, o valor da esquerda sai primeiro. Como a metade esquerda é a parte do array que vinha
              antes, a ordem de chegada é preservada.
            </p>
          </div>
          <div className={`ms-op${tiesLt.size > 0 ? " quebrou" : ""}`}>
            <div className="bb-formula-cab">
              <span className="bb-formula-tit">esq[i] &lt; dir[j]</span>
              <span className="bb-formula-selo">{tiesLt.size > 0 ? "empates trocados" : "coincidiu desta vez"}</span>
            </div>
            <div className="hp-arr">
              {withLt.output.map((r) => (
                <span key={r.orig} className={`hp-cel reg${tiesLt.has(r.orig) ? " inverteu" : ""}`}>
                  <i>entrou em {r.orig}</i>
                  <b>{r.key}</b>
                  <em>{r.tag}</em>
                </span>
              ))}
            </div>
            <p className="bb-formula-fim">
              No empate, a condição é falsa e o valor da direita sai primeiro. Todo elemento que empata é
              ultrapassado por quem estava atrás dele no array original.
            </p>
          </div>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            As decisões da intercalação <em>a linha destacada é onde as duas versões se separam</em>
          </div>
          <ol className="bb-passos">
            {withLte.decisions.map((d, k) => (
              <li key={k} className={k === divergence ? "ruim" : ""}>
                <span>
                  {d.left ? `esquerda ${d.left.key} (${d.left.tag})` : "esquerda vazia"} contra{" "}
                  {d.right ? `direita ${d.right.key} (${d.right.tag})` : "direita vazia"}
                  {d.tie ? ", empate" : ""}
                </span>
                <b>
                  {d.chosen.tag}
                  {withLt.decisions[k].chosen.orig !== d.chosen.orig
                    ? ` / com < sairia ${withLt.decisions[k].chosen.tag}`
                    : ""}
                </b>
              </li>
            ))}
          </ol>
        </div>

        <p className={`viz-note${tiesLt.size > 0 ? " invalid" : " ok"}`}>
          {divergence >= 0 ? (
            <>
              As duas saídas estão <strong>corretas pela chave</strong>
              {sameKeys ? ": a sequência de chaves é idêntica nas duas" : ""}. As decisões são as mesmas até
              a de número {divergence + 1}, que é o primeiro empate. Ali o operador escolhe: com{" "}
              <strong>&lt;=</strong> a condição é verdadeira e sai o da esquerda; com <strong>&lt;</strong> ela
              é falsa e sai o da direita. Um caractere separa um algoritmo estável de um instável, e nenhum
              teste que confira apenas a ordem das chaves consegue notar a diferença.
            </>
          ) : (
            <>
              Esta entrada não tem nenhum empate entre as duas metades, então os dois operadores tomam
              exatamente as mesmas decisões. Isso não torna o <strong>&lt;</strong> seguro: a diferença só
              aparece quando existe empate, que é exatamente o caso em que a estabilidade importa. Troque de
              preset.
            </>
          )}
        </p>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Vale a comparação com o heap sort e o quick sort, que são instáveis por natureza: neles a
          instabilidade vem do movimento (um salto longo que atropela um igual) e não há operador que conserte.
          No merge sort a estabilidade sai de graça, porque a intercalação só olha o topo dos dois lados e cada
          lado é um trecho contíguo do array original.
        </p>
      </div>

      {/* Sem linha do tempo e sem botões extras, o rodapé não desenha nada. */}
      <VizFooter viz={viz} />
    </figure>
  );
}
