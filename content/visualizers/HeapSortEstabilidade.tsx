"use client";

import { useMemo, useState } from "react";

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
// ---------------------------------------------------------------------------

type Reg = { chave: number; nome: string; orig: number };

type Preset = { key: string; rotulo: string; dados: [number, string][]; dica: string };

const PRESETS: Preset[] = [
  {
    key: "nomes",
    rotulo: "Lista ordenada por nome, reordenando por idade",
    dados: [
      [3, "Ana"],
      [5, "Bia"],
      [3, "Caio"],
      [2, "Davi"],
      [5, "Enzo"],
      [2, "Fran"],
    ],
    dica: "A entrada está em ordem alfabética. Ordenando por idade, o esperado é que dentro de cada idade os nomes continuem alfabéticos, e é isso que o sort estável entrega.",
  },
  {
    key: "empate",
    rotulo: "Um empate que sobrevive por sorte",
    dados: [
      [7, "sete"],
      [4, "quatro-a"],
      [9, "nove"],
      [4, "quatro-b"],
      [1, "um"],
    ],
    dica: "Aqui o heap sort devolve o mesmo resultado do estável, e é justamente esse o perigo: instável não quer dizer sempre errado, quer dizer sem garantia. Um código apoiado neste comportamento passa nos testes e quebra quando um dado muda.",
  },
  {
    key: "iguais",
    rotulo: "Chaves todas iguais",
    dados: [
      [4, "p"],
      [4, "q"],
      [4, "r"],
      [4, "s"],
      [4, "t"],
    ],
    dica: "Caso extremo: como toda comparação empata, o sort estável não move ninguém e o heap sort embaralha à vontade. Os dois resultados estão corretos pela chave.",
  },
];

// Insertion sort: estável por construção, porque só desloca enquanto o de trás
// for ESTRITAMENTE maior. Empate nunca provoca troca.
function ordenacaoEstavel(reg: Reg[]): Reg[] {
  const a = reg.map((r) => ({ ...r }));
  for (let i = 1; i < a.length; i++) {
    const atual = a[i];
    let j = i - 1;
    while (j >= 0 && a[j].chave > atual.chave) {
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = atual;
  }
  return a;
}

// Heap sort, exatamente o mesmo algoritmo da outra visualização, só que
// comparando o campo `chave` de um registro em vez de um número solto.
function heapSort(reg: Reg[]): Reg[] {
  const a = reg.map((r) => ({ ...r }));
  const n = a.length;
  const desce = (i: number, limite: number) => {
    let guarda = 0;
    while (guarda++ < 200) {
      let maior = i;
      const e = 2 * i + 1;
      const d = 2 * i + 2;
      if (e < limite && a[e].chave > a[maior].chave) maior = e;
      if (d < limite && a[d].chave > a[maior].chave) maior = d;
      if (maior === i) return;
      [a[i], a[maior]] = [a[maior], a[i]];
      i = maior;
    }
  };
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) desce(i, n);
  for (let fim = n - 1; fim > 0; fim--) {
    [a[0], a[fim]] = [a[fim], a[0]];
    desce(0, fim);
  }
  return a;
}

// Um empate inverteu se, entre dois registros de mesma chave, o que veio depois
// na entrada aparece antes na saída.
function invertidos(saida: Reg[]): Set<number> {
  const marcados = new Set<number>();
  for (let i = 0; i < saida.length; i++) {
    for (let j = i + 1; j < saida.length; j++) {
      if (saida[i].chave === saida[j].chave && saida[i].orig > saida[j].orig) {
        marcados.add(saida[i].orig);
        marcados.add(saida[j].orig);
      }
    }
  }
  return marcados;
}

function Fila({ regs, marcados, titulo, selo }: { regs: Reg[]; marcados: Set<number>; titulo: string; selo: string }) {
  return (
    <div className="hs-fila">
      <div className="hs-fila-cab">
        <span className="hs-fila-tit">{titulo}</span>
        <span className={`hs-fila-selo${marcados.size > 0 ? " quebrou" : ""}`}>{selo}</span>
      </div>
      <div className="hp-arr">
        {regs.map((r) => (
          <span key={r.orig} className={`hp-cel reg${marcados.has(r.orig) ? " inverteu" : ""}`}>
            <i>entrou em {r.orig}</i>
            <b>{r.chave}</b>
            <em>{r.nome}</em>
          </span>
        ))}
      </div>
    </div>
  );
}

export function HeapSortEstabilidade() {
  const [presetKey, setPresetKey] = useState("nomes");
  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);

  const entrada: Reg[] = useMemo(
    () => preset.dados.map(([chave, nome], orig) => ({ chave, nome, orig })),
    [preset]
  );
  const estavel = useMemo(() => ordenacaoEstavel(entrada), [entrada]);
  const doHeap = useMemo(() => heapSort(entrada), [entrada]);
  const marcasHeap = useMemo(() => invertidos(doHeap), [doHeap]);
  const marcasEstavel = useMemo(() => invertidos(estavel), [estavel]);

  const chavesOk = useMemo(
    () => doHeap.map((r) => r.chave).join(",") === estavel.map((r) => r.chave).join(","),
    [doHeap, estavel]
  );

  // O primeiro par que trocou de lugar, para a explicação citar nomes de verdade.
  const parTrocado = useMemo(() => {
    for (let i = 0; i < doHeap.length; i++) {
      for (let j = i + 1; j < doHeap.length; j++) {
        if (doHeap[i].chave === doHeap[j].chave && doHeap[i].orig > doHeap[j].orig) {
          return { antes: doHeap[j], depois: doHeap[i] };
        }
      }
    }
    return null;
  }, [doHeap]);

  return (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · o que &quot;instável&quot; significa na prática</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">{marcasHeap.size > 0 ? `${marcasHeap.size} registros fora da ordem original` : "nenhum empate trocou desta vez"}</span>
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
          <Fila regs={entrada} marcados={new Set()} titulo="Entrada" selo="como chegou" />
          <Fila regs={estavel} marcados={marcasEstavel} titulo="Ordenação estável (insertion sort)" selo={marcasEstavel.size > 0 ? "quebrou" : "empates preservados"} />
          <Fila regs={doHeap} marcados={marcasHeap} titulo="Heap sort" selo={marcasHeap.size > 0 ? "empates trocados" : "empates preservados"} />
        </div>

        <p className={`viz-note${marcasHeap.size > 0 ? " invalid" : " ok"}`}>
          {parTrocado ? (
            <>
              As duas saídas estão <strong>corretas pela chave</strong>: {chavesOk ? "a sequência de chaves é idêntica nas duas" : "as chaves saem em ordem crescente nas duas"}. O que mudou foi o
              desempate. <strong>{parTrocado.depois.nome}</strong> entrou na posição {parTrocado.depois.orig} e{" "}
              <strong>{parTrocado.antes.nome}</strong> na posição {parTrocado.antes.orig}, os dois com chave{" "}
              {parTrocado.antes.chave}. O sort estável manteve essa ordem; o heap sort devolveu{" "}
              {parTrocado.depois.nome} na frente. Ninguém errou uma comparação: é que o heap arranca o último
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
    </figure>
  );
}
