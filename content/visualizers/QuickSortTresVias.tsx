"use client";

import { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// QuickSortTresVias, o que fazer com os elementos iguais ao pivô.
//
// A única coisa que o aluno precisa enxergar é que a partição comum tem um
// buraco conceitual: ela responde "menor ou igual" e "maior", e com isso os
// elementos IGUAIS ao pivô voltam para a recursão como se ainda houvesse
// trabalho a fazer com eles. Não há: um elemento igual ao pivô já está na
// posição certa no momento em que o pivô fica pronto.
//
// A partição em três vias fecha esse buraco: ela separa menores, iguais e
// maiores, e a faixa do meio inteira sai da recursão de uma vez. É por isso que
// o preset de array constante desaba de quadrático para linear, e não por um
// truque de implementação.
//
// A tela mostra a PRIMEIRA partição das duas versões lado a lado, porque é ali
// que a diferença nasce e ainda dá para acompanhar posição por posição. Os
// totais do algoritmo inteiro ficam nos cards, calculados rodando os dois de
// verdade sobre o mesmo array.
//
// Isto também corrige uma crença comum: trocar o <= por < na partição de duas
// vias não resolve nada com repetidos, só troca de lado o desequilíbrio. Os
// dois casos aparecem no visualizador principal deste tópico.
// ---------------------------------------------------------------------------

type Regiao = { de: number; ate: number; cls: string; txt: string };

type Resultado = {
  comp: number;
  prof: number;
  primeira: number[]; // o array logo depois da primeira partição
  regioes: Regiao[];
  restantes: number[]; // tamanhos dos subproblemas que sobraram da 1a partição
};

type Preset = { key: string; rotulo: string; valores: number[]; dica: string };

const PRESETS: Preset[] = [
  {
    key: "iguais",
    rotulo: "Todos iguais: 4 4 4 4 4 4 4 4",
    valores: [4, 4, 4, 4, 4, 4, 4, 4],
    dica: "O caso extremo, e o mais didático: não existe nada para ordenar. A partição de duas vias mesmo assim faz o trabalho quadrático inteiro; a de três vias resolve o array numa passada e não chama a recursão nenhuma vez.",
  },
  {
    key: "tres",
    rotulo: "Só três valores: 2 1 3 1 2 3 1 2",
    valores: [2, 1, 3, 1, 2, 3, 1, 2],
    dica: "O caso realista: poucas chaves distintas e muitos elementos. Acontece o tempo todo com status, categoria, nota de 1 a 5 ou faixa etária. A primeira partição de três vias já entrega os três 2 resolvidos, e a recursão desce 2 níveis em vez de 4.",
  },
  {
    key: "domina",
    rotulo: "Um valor domina: 5 5 5 1 5 5 9 5",
    valores: [5, 5, 5, 1, 5, 5, 9, 5],
    dica: "Seis dos oito elementos são iguais. Na partição de três vias esses seis saem da recursão juntos, na primeira passada, e sobram dois subproblemas de um elemento cada.",
  },
  {
    key: "distintos",
    rotulo: "Sem repetição: 5 3 13 1 7 6 21 2",
    valores: [5, 3, 13, 1, 7, 6, 21, 2],
    dica: "O contraponto honesto: sem valores repetidos, a faixa do meio tem sempre um elemento só, a profundidade é igual nas duas versões, e a de três vias sai perdendo em comparações porque testa cada elemento duas vezes. Ela não é melhor sempre, é melhor quando existem repetidos.",
  },
];

// Partição de Lomuto, duas vias: <= pivô à esquerda, > pivô à direita.
function duasVias(valores: number[]): Resultado {
  const a = [...valores];
  let comp = 0;
  let profMax = 0;
  let primeira: number[] = [];
  let regioes: Regiao[] = [];
  let restantes: number[] = [];
  let viu = false;

  const quick = (lo: number, hi: number, prof: number) => {
    if (lo > hi) return; // intervalo vazio: nem chega a virar quadro de pilha
    profMax = Math.max(profMax, prof);
    if (lo === hi) return;
    const pivo = a[hi];
    let i = lo;
    for (let j = lo; j < hi; j++) {
      comp++;
      if (a[j] <= pivo) {
        [a[i], a[j]] = [a[j], a[i]];
        i++;
      }
    }
    [a[i], a[hi]] = [a[hi], a[i]];
    if (!viu) {
      viu = true;
      primeira = [...a];
      regioes = [];
      if (i > lo) regioes.push({ de: lo, ate: i - 1, cls: "menor", txt: "<= pivô, volta para a recursão" });
      regioes.push({ de: i, ate: i, cls: "pivo", txt: "pivô" });
      if (hi > i) regioes.push({ de: i + 1, ate: hi, cls: "maior", txt: "> pivô, volta para a recursão" });
      restantes = [i - lo, hi - i].filter((x) => x > 0);
    }
    quick(lo, i - 1, prof + 1);
    quick(i + 1, hi, prof + 1);
  };

  quick(0, a.length - 1, 1);
  return { comp, prof: profMax, primeira, regioes, restantes };
}

// Partição de três vias (bandeira holandesa): < pivô, = pivô, > pivô.
function tresVias(valores: number[]): Resultado {
  const a = [...valores];
  let comp = 0;
  let profMax = 0;
  let primeira: number[] = [];
  let regioes: Regiao[] = [];
  let restantes: number[] = [];
  let viu = false;

  const quick = (lo: number, hi: number, prof: number) => {
    if (lo > hi) return; // intervalo vazio: nem chega a virar quadro de pilha
    profMax = Math.max(profMax, prof);
    if (lo === hi) return;
    const pivo = a[hi];
    let lt = lo;
    let i = lo;
    let gt = hi;
    while (i <= gt) {
      comp++;
      if (a[i] < pivo) {
        [a[lt], a[i]] = [a[i], a[lt]];
        lt++;
        i++;
        continue;
      }
      comp++;
      if (a[i] > pivo) {
        [a[gt], a[i]] = [a[i], a[gt]];
        gt--;
        continue;
      }
      i++;
    }
    if (!viu) {
      viu = true;
      primeira = [...a];
      regioes = [];
      if (lt > lo) regioes.push({ de: lo, ate: lt - 1, cls: "menor", txt: "< pivô, volta para a recursão" });
      regioes.push({ de: lt, ate: gt, cls: "pivo", txt: `= pivô, ${gt - lt + 1} já resolvidos` });
      if (hi > gt) regioes.push({ de: gt + 1, ate: hi, cls: "maior", txt: "> pivô, volta para a recursão" });
      restantes = [lt - lo, hi - gt].filter((x) => x > 0);
    }
    quick(lo, lt - 1, prof + 1);
    quick(gt + 1, hi, prof + 1);
  };

  quick(0, a.length - 1, 1);
  return { comp, prof: profMax, primeira, regioes, restantes };
}

function Painel({ titulo, r, n, selo }: { titulo: string; r: Resultado; n: number; selo: string }) {
  // Quantos elementos sobraram ao todo. É ele que rege o verbo e o plural: a
  // moldura "sobram ... para a recursão resolver" só faz sentido quando existe
  // o que sobrar, e no preset "Todos iguais" a partição de três vias não deixa
  // nada — daí a frase inteira ser condicional, e não só o miolo dela.
  const sobraram = r.restantes.reduce((soma, x) => soma + x, 0);
  return (
    <div className="ms-op">
      <div className="bb-formula-cab">
        <span className="bb-formula-tit">{titulo}</span>
        <span className="bb-formula-selo">{selo}</span>
      </div>
      <div className="ms-nivel-faixa" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, marginBottom: 8 }}>
        {r.regioes.map((g) => (
          <span key={`${g.cls}-${g.de}`} className={`ms-seg ${g.cls}`} style={{ gridColumn: `${g.de + 1} / ${g.ate + 2}` }}>
            {g.txt}
          </span>
        ))}
      </div>
      <div className="hp-arr">
        {r.primeira.map((v, k) => {
          const g = r.regioes.find((x) => k >= x.de && k <= x.ate);
          return (
            <span key={k} className={`hp-cel${g?.cls === "pivo" ? " fixo" : g?.cls === "menor" ? " foco" : " par"}`}>
              <i>{k}</i>
              {v}
            </span>
          );
        })}
      </div>
      <p className="bb-formula-fim">
        {r.restantes.length === 0 ? (
          <>
            A primeira partição resolveu o array inteiro:{" "}
            <strong>não sobrou nada para a recursão</strong>.
          </>
        ) : (
          <>
            Depois da primeira partição {sobraram === 1 ? "sobra" : "sobram"}{" "}
            <strong>
              {r.restantes.join(" e ")} elemento{sobraram === 1 ? "" : "s"}
            </strong>{" "}
            para a recursão resolver.
          </>
        )}
      </p>
    </div>
  );
}

export function QuickSortTresVias() {
  const [presetKey, setPresetKey] = useState("iguais");
  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const n = preset.valores.length;

  const duas = useMemo(() => duasVias(preset.valores), [preset]);
  const tres = useMemo(() => tresVias(preset.valores), [preset]);
  const distintos = useMemo(() => new Set(preset.valores).size, [preset]);
  const repetidos = n - distintos;

  return (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · o que fazer com os iguais ao pivô</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">
            {distintos} valor{distintos === 1 ? "" : "es"} distinto{distintos === 1 ? "" : "s"} em {n} posições
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

        <div className="ms-operadores">
          <Painel
            titulo="Duas vias (Lomuto)"
            r={duas}
            n={n}
            selo={`${duas.comp} comparações · profundidade ${duas.prof}`}
          />
          <Painel
            titulo="Três vias (bandeira holandesa)"
            r={tres}
            n={n}
            selo={`${tres.comp} comparações · profundidade ${tres.prof}`}
          />
        </div>

        <p className={`viz-note${tres.prof < duas.prof ? " ok" : ""}`}>
          {repetidos > 0 ? (
            <>
              Este array tem <strong>
                {distintos} valor{distintos === 1 ? "" : "es"} distinto{distintos === 1 ? "" : "s"}
              </strong> em {n} posições. A partição de duas
              vias devolve os iguais ao pivô para dentro da recursão, e por isso ela desce{" "}
              <strong>{duas.prof} níveis</strong>. A de três vias tira a faixa inteira dos iguais do caminho de
              uma vez e desce <strong>{tres.prof}</strong>. Nenhum dos dois erra o resultado: os dois ordenam. A
              diferença é quanto trabalho é feito depois que a resposta já está decidida. Repare que a de três
              vias testa cada elemento até duas vezes (primeiro se é menor, depois se é maior), então ela nem
              sempre ganha na contagem de comparações; o que ela reduz é o tamanho do que sobra.
            </>
          ) : (
            <>
              Sem nenhum valor repetido, a faixa do meio da partição de três vias tem sempre um elemento só, que
              é o próprio pivô. As duas descem a mesma profundidade ({duas.prof} contra {tres.prof}) e resolvem
              os mesmos subproblemas, mas a de três vias gasta {tres.comp} comparações contra {duas.comp}:
              perto do dobro, porque cada elemento é testado duas vezes, primeiro contra o menor e depois contra
              o maior. É esse o preço, e ele só se paga quando existem repetidos. Troque de preset.
            </>
          )}
        </p>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Poucas chaves distintas em muitos elementos é o caso comum, não o exótico: ordenar por status, por
          categoria, por nota de 1 a 5 ou por dia da semana cai exatamente aqui. É por isso que as
          implementações de biblioteca que levam desempenho a sério usam alguma forma de partição em três vias,
          e é o mesmo raciocínio do problema clássico da bandeira nacional holandesa, que pede para arrumar um
          array de três cores numa passada só.
        </p>
      </div>
    </figure>
  );
}
