"use client";

import { useMemo, useState } from "react";

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
// ---------------------------------------------------------------------------

type Reg = { chave: number; etiq: string; orig: number };

type Saida = { regs: Reg[]; trocas: number; maiorSalto: number };

type Preset = { key: string; rotulo: string; dados: [number, string][]; dica: string };

const PRESETS: Preset[] = [
  {
    key: "chamados",
    rotulo: "Chamados na ordem de chegada, ordenando por prioridade",
    dados: [
      [2, "#41"],
      [2, "#42"],
      [1, "#43"],
      [4, "#44"],
      [3, "#45"],
      [5, "#46"],
    ],
    dica: "A fila chegou em ordem e o critério de ordenação é a prioridade. O esperado é que, dentro da mesma prioridade, quem chegou antes continue sendo atendido antes.",
  },
  {
    key: "sorte",
    rotulo: "Um empate que sobrevive por sorte",
    dados: [
      [3, "#51"],
      [3, "#52"],
      [1, "#53"],
      [2, "#54"],
    ],
    dica: "Aqui os três devolvem a mesma coisa, inclusive o selection sort. É justamente esse o perigo: instável quer dizer sem garantia, não sempre errado. Um código apoiado neste resultado passa nos testes hoje e quebra quando entrar mais um chamado.",
  },
  {
    key: "muitos",
    rotulo: "Fila embaralhada, com empate em toda prioridade",
    dados: [
      [3, "#61"],
      [2, "#62"],
      [3, "#63"],
      [1, "#64"],
      [2, "#65"],
      [1, "#66"],
    ],
    dica: "Com empate em todas as prioridades, o salto longo do selection sort tem muito mais chance de acontecer. Repare que ele erra em dois pares de uma vez, e que os outros dois continuam intactos.",
  },
];

// Os três na forma baseada em TROCAS, para a distância de cada movimento ser
// comparável entre eles. Cada troca é registrada, e é daí que sai o maior salto.
function rodar(algo: "bubble" | "selection" | "insertion", entrada: Reg[]): Saida {
  const a = entrada.map((r) => ({ ...r }));
  const n = a.length;
  let trocas = 0;
  let maiorSalto = 0;
  const troca = (x: number, y: number) => {
    [a[x], a[y]] = [a[y], a[x]];
    trocas++;
    maiorSalto = Math.max(maiorSalto, Math.abs(x - y));
  };

  if (algo === "bubble") {
    for (let fim = n - 1; fim > 0; fim--) {
      let mexeu = false;
      for (let j = 0; j < fim; j++)
        if (a[j].chave > a[j + 1].chave) {
          troca(j, j + 1);
          mexeu = true;
        }
      if (!mexeu) break;
    }
  } else if (algo === "selection") {
    for (let i = 0; i < n - 1; i++) {
      let menor = i;
      for (let j = i + 1; j < n; j++) if (a[j].chave < a[menor].chave) menor = j;
      if (menor !== i) troca(i, menor);
    }
  } else {
    for (let i = 1; i < n; i++) {
      let j = i;
      while (j > 0 && a[j - 1].chave > a[j].chave) {
        troca(j - 1, j);
        j--;
      }
    }
  }
  return { regs: a, trocas, maiorSalto };
}

// Um empate inverteu se, entre dois registros de mesma chave, o que entrou
// depois aparece antes na saída.
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

function Fila({
  regs,
  marcados,
  titulo,
  selo,
  detalhe,
}: {
  regs: Reg[];
  marcados: Set<number>;
  titulo: string;
  selo: string;
  detalhe?: string;
}) {
  return (
    <div className="hs-fila">
      <div className="hs-fila-cab">
        <span className="hs-fila-tit">{titulo}</span>
        <span className={`hs-fila-selo${marcados.size > 0 ? " quebrou" : ""}`}>{selo}</span>
      </div>
      <div className="hp-arr">
        {regs.map((r) => (
          <span key={r.orig} className={`hp-cel reg${marcados.has(r.orig) ? " inverteu" : ""}`}>
            <i>chegou em {r.orig}</i>
            <b>p{r.chave}</b>
            <em>{r.etiq}</em>
          </span>
        ))}
      </div>
      {detalhe ? <p className="bb-array-nota" style={{ marginTop: 8 }}>{detalhe}</p> : null}
    </div>
  );
}

export function OrdenacaoBasicaEstabilidade() {
  const [presetKey, setPresetKey] = useState("chamados");
  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);

  const entrada: Reg[] = useMemo(
    () => preset.dados.map(([chave, etiq], orig) => ({ chave, etiq, orig })),
    [preset]
  );

  const bubble = useMemo(() => rodar("bubble", entrada), [entrada]);
  const selection = useMemo(() => rodar("selection", entrada), [entrada]);
  const insertion = useMemo(() => rodar("insertion", entrada), [entrada]);

  const mB = useMemo(() => invertidos(bubble.regs), [bubble]);
  const mS = useMemo(() => invertidos(selection.regs), [selection]);
  const mI = useMemo(() => invertidos(insertion.regs), [insertion]);

  const chavesIguais =
    selection.regs.map((r) => r.chave).join(",") === bubble.regs.map((r) => r.chave).join(",");

  // O par concreto que trocou de lugar, para a explicação citar etiquetas reais.
  const parTrocado = useMemo(() => {
    const s = selection.regs;
    for (let i = 0; i < s.length; i++)
      for (let j = i + 1; j < s.length; j++)
        if (s[i].chave === s[j].chave && s[i].orig > s[j].orig) return { antes: s[j], depois: s[i] };
    return null;
  }, [selection]);

  const detalhe = (r: Saida) =>
    `${r.trocas} troca${r.trocas === 1 ? "" : "s"}, a mais longa com distância ${r.maiorSalto || 0}`;

  return (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · a distância da troca decide a estabilidade</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">
            {mS.size > 0 ? `${mS.size} chamados fora da ordem de chegada` : "nenhum empate trocou desta vez"}
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
          <Fila regs={entrada} marcados={new Set()} titulo="Entrada" selo="como chegou" />
          <Fila
            regs={bubble.regs}
            marcados={mB}
            titulo="Bubble sort"
            selo={mB.size > 0 ? "empates trocados" : "empates preservados"}
            detalhe={detalhe(bubble)}
          />
          <Fila
            regs={insertion.regs}
            marcados={mI}
            titulo="Insertion sort"
            selo={mI.size > 0 ? "empates trocados" : "empates preservados"}
            detalhe={detalhe(insertion)}
          />
          <Fila
            regs={selection.regs}
            marcados={mS}
            titulo="Selection sort"
            selo={mS.size > 0 ? "empates trocados" : "empates preservados"}
            detalhe={detalhe(selection)}
          />
        </div>

        <p className={`viz-note${mS.size > 0 ? " invalid" : " ok"}`}>
          {parTrocado ? (
            <>
              As três saídas estão <strong>corretas pela prioridade</strong>
              {chavesIguais ? ": a sequência de prioridades é idêntica nas três" : ""}. O que mudou foi o
              desempate. <strong>{parTrocado.depois.etiq}</strong> chegou na posição {parTrocado.depois.orig} e{" "}
              <strong>{parTrocado.antes.etiq}</strong> na {parTrocado.antes.orig}, os dois com prioridade{" "}
              {parTrocado.antes.chave}, e o selection sort devolveu {parTrocado.depois.etiq} na frente. Repare
              na causa, logo acima: a maior troca do bubble e do insertion tem distância{" "}
              {Math.max(bubble.maiorSalto, insertion.maiorSalto)}, e a do selection tem distância{" "}
              {selection.maiorSalto}. Uma troca de distância 1 não consegue pular por cima de ninguém, então
              empate nunca muda de ordem. Uma troca longa passa por cima de quem estiver no caminho, e nada no
              algoritmo confere se aquele alguém tem a mesma chave.
            </>
          ) : (
            <>
              Neste preset nenhum empate mudou de lugar, nem no selection sort. Isso não o torna estável:
              instável quer dizer que ele <strong>não garante nada</strong> sobre empates. Repare que a maior
              troca dele já tem distância {selection.maiorSalto}, ou seja, a capacidade de atropelar um igual
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
    </figure>
  );
}
