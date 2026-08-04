"use client";

import { useMemo, useState } from "react";

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
// ---------------------------------------------------------------------------

type Reg = { chave: number; etiq: string; orig: number };

type Decisao = { esq: Reg | null; dir: Reg | null; empate: boolean; escolhido: Reg; lado: "esq" | "dir" };

type Preset = { key: string; rotulo: string; dados: [number, string][]; dica: string };

const PRESETS: Preset[] = [
  {
    key: "logs",
    rotulo: "Linhas de log com o mesmo segundo",
    dados: [
      [12, "erro-A"],
      [9, "info-B"],
      [12, "erro-C"],
      [7, "info-D"],
      [9, "warn-E"],
      [12, "erro-F"],
    ],
    dica: "Três linhas caíram no segundo 12 e duas no segundo 9. Ordenar por horário não pode embaralhar a ordem em que elas foram escritas, senão a leitura do incidente conta a história errada.",
  },
  {
    key: "um",
    rotulo: "Um único empate, no fim da intercalação",
    dados: [
      [3, "a"],
      [5, "b"],
      [1, "c"],
      [5, "d"],
    ],
    dica: "O menor exemplo que quebra: duas chaves 5, uma em cada metade. Repare que as duas versões tomam decisões idênticas até chegar nesse empate, e só ali se separam.",
  },
  {
    key: "todos",
    rotulo: "Chaves todas iguais",
    dados: [
      [4, "p"],
      [4, "q"],
      [4, "r"],
      [4, "s"],
    ],
    dica: "Caso extremo: como toda comparação é um empate, o operador decide tudo. Com <= a saída é idêntica à entrada; com < as duas metades trocam de lugar inteiras.",
  },
];

// Merge de duas metades já ordenadas, com o operador escolhido. É a única
// diferença entre as duas colunas: o resto do algoritmo é idêntico.
function intercalar(esq: Reg[], dir: Reg[], estrito: boolean): { saida: Reg[]; decisoes: Decisao[] } {
  const saida: Reg[] = [];
  const decisoes: Decisao[] = [];
  let i = 0;
  let j = 0;
  while (i < esq.length || j < dir.length) {
    const temE = i < esq.length;
    const temD = j < dir.length;
    const pegaEsq = !temD || (temE && (estrito ? esq[i].chave < dir[j].chave : esq[i].chave <= dir[j].chave));
    const escolhido = pegaEsq ? esq[i] : dir[j];
    decisoes.push({
      esq: temE ? esq[i] : null,
      dir: temD ? dir[j] : null,
      empate: temE && temD && esq[i].chave === dir[j].chave,
      escolhido,
      lado: pegaEsq ? "esq" : "dir",
    });
    saida.push(escolhido);
    if (pegaEsq) i++;
    else j++;
  }
  return { saida, decisoes };
}

function invertidos(saida: Reg[]): Set<number> {
  const marcados = new Set<number>();
  for (let i = 0; i < saida.length; i++)
    for (let j = i + 1; j < saida.length; j++)
      if (saida[i].chave === saida[j].chave && saida[i].orig > saida[j].orig) {
        marcados.add(saida[i].orig);
        marcados.add(saida[j].orig);
      }
  return marcados;
}

function Fila({ regs, marcados, titulo, selo }: { regs: Reg[]; marcados: Set<number>; titulo: string; selo?: string }) {
  return (
    <div className="hs-fila">
      <div className="hs-fila-cab">
        <span className="hs-fila-tit">{titulo}</span>
        {selo ? <span className={`hs-fila-selo${marcados.size > 0 ? " quebrou" : ""}`}>{selo}</span> : null}
      </div>
      <div className="hp-arr">
        {regs.map((r) => (
          <span key={r.orig} className={`hp-cel reg${marcados.has(r.orig) ? " inverteu" : ""}`}>
            <i>entrou em {r.orig}</i>
            <b>{r.chave}</b>
            <em>{r.etiq}</em>
          </span>
        ))}
      </div>
    </div>
  );
}

export function MergeEmpate() {
  const [presetKey, setPresetKey] = useState("logs");
  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);

  const entrada: Reg[] = useMemo(
    () => preset.dados.map(([chave, etiq], orig) => ({ chave, etiq, orig })),
    [preset]
  );

  // As duas metades chegam à intercalação final já ordenadas, exatamente como a
  // recursão as devolveria. Ordenar cada uma de forma estável aqui é o que
  // reproduz esse estado sem precisar rodar a recursão inteira.
  const [esq, dir] = useMemo(() => {
    const meio = Math.ceil(entrada.length / 2);
    const estavel = (v: Reg[]) => [...v].sort((x, y) => x.chave - y.chave || x.orig - y.orig);
    return [estavel(entrada.slice(0, meio)), estavel(entrada.slice(meio))];
  }, [entrada]);

  const comIgual = useMemo(() => intercalar(esq, dir, false), [esq, dir]);
  const comEstrito = useMemo(() => intercalar(esq, dir, true), [esq, dir]);
  const mIgual = useMemo(() => invertidos(comIgual.saida), [comIgual]);
  const mEstrito = useMemo(() => invertidos(comEstrito.saida), [comEstrito]);

  // O primeiro passo em que as duas versões escolhem lados diferentes.
  const divergencia = useMemo(() => {
    for (let k = 0; k < comIgual.decisoes.length; k++)
      if (comIgual.decisoes[k].escolhido.orig !== comEstrito.decisoes[k].escolhido.orig) return k;
    return -1;
  }, [comIgual, comEstrito]);

  const chavesIguais =
    comIgual.saida.map((r) => r.chave).join(",") === comEstrito.saida.map((r) => r.chave).join(",");

  return (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · o sinal que decide a estabilidade</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">
            {divergencia >= 0
              ? `as duas versões se separam na decisão ${divergencia + 1}`
              : "nenhum empate nesta entrada: as duas versões coincidem"}
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

        <div className="hs-filas">
          <Fila regs={entrada} marcados={new Set()} titulo="Entrada, na ordem em que chegou" />
          <Fila regs={esq} marcados={new Set()} titulo="Metade esquerda, já ordenada pela recursão" />
          <Fila regs={dir} marcados={new Set()} titulo="Metade direita, já ordenada pela recursão" />
        </div>

        <div className="ms-operadores">
          <div className="ms-op ok">
            <div className="bb-formula-cab">
              <span className="bb-formula-tit">esq[i] &lt;= dir[j]</span>
              <span className="bb-formula-selo">{mIgual.size > 0 ? "empates trocados" : "estável"}</span>
            </div>
            <div className="hp-arr">
              {comIgual.saida.map((r) => (
                <span key={r.orig} className={`hp-cel reg${mIgual.has(r.orig) ? " inverteu" : ""}`}>
                  <i>entrou em {r.orig}</i>
                  <b>{r.chave}</b>
                  <em>{r.etiq}</em>
                </span>
              ))}
            </div>
            <p className="bb-formula-fim">
              No empate, o valor da esquerda sai primeiro. Como a metade esquerda é a parte do array que vinha
              antes, a ordem de chegada é preservada.
            </p>
          </div>
          <div className={`ms-op${mEstrito.size > 0 ? " quebrou" : ""}`}>
            <div className="bb-formula-cab">
              <span className="bb-formula-tit">esq[i] &lt; dir[j]</span>
              <span className="bb-formula-selo">{mEstrito.size > 0 ? "empates trocados" : "coincidiu desta vez"}</span>
            </div>
            <div className="hp-arr">
              {comEstrito.saida.map((r) => (
                <span key={r.orig} className={`hp-cel reg${mEstrito.has(r.orig) ? " inverteu" : ""}`}>
                  <i>entrou em {r.orig}</i>
                  <b>{r.chave}</b>
                  <em>{r.etiq}</em>
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
            {comIgual.decisoes.map((d, k) => (
              <li key={k} className={k === divergencia ? "ruim" : ""}>
                <span>
                  {d.esq ? `esquerda ${d.esq.chave} (${d.esq.etiq})` : "esquerda vazia"} contra{" "}
                  {d.dir ? `direita ${d.dir.chave} (${d.dir.etiq})` : "direita vazia"}
                  {d.empate ? ", empate" : ""}
                </span>
                <b>
                  {d.escolhido.etiq}
                  {comEstrito.decisoes[k].escolhido.orig !== d.escolhido.orig
                    ? ` / com < sairia ${comEstrito.decisoes[k].escolhido.etiq}`
                    : ""}
                </b>
              </li>
            ))}
          </ol>
        </div>

        <p className={`viz-note${mEstrito.size > 0 ? " invalid" : " ok"}`}>
          {divergencia >= 0 ? (
            <>
              As duas saídas estão <strong>corretas pela chave</strong>
              {chavesIguais ? ": a sequência de chaves é idêntica nas duas" : ""}. As decisões são as mesmas até
              a de número {divergencia + 1}, que é o primeiro empate. Ali o operador escolhe: com{" "}
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
    </figure>
  );
}
