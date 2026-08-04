"use client";

import { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// QuickSortPivo, a escolha que decide se o algoritmo é O(n log n) ou O(n²).
//
// A única coisa que o aluno precisa enxergar é que o quick sort não tem um
// custo, tem uma FUNÇÃO de custo, e a variável dela é a escolha do pivô. O
// mesmo array, com o mesmo código de partição, custa 14 ou 28 comparações
// dependendo de qual elemento vira referência.
//
// A métrica em destaque é a PROFUNDIDADE da recursão, não o tempo. Ela é a
// tradução direta do desequilíbrio: profundidade log n quer dizer que toda
// partição cortou o problema em dois; profundidade n quer dizer que cada
// partição eliminou um elemento só. E é a profundidade, não as comparações, que
// também explica o consumo de memória, porque cada nível é um quadro de pilha.
//
// As quatro estratégias rodam de verdade, com o mesmo particionador de Lomuto:
// a única diferença entre elas é qual índice vai para o fim antes do laço
// começar. Assim nenhum resultado é tabelado, e trocar preset não exige mexer
// em nada.
//
// Interativo sem linha do tempo: a variável é a estratégia e a entrada, e o
// passo a passo do algoritmo é assunto do visualizador principal.
// ---------------------------------------------------------------------------

type Estrategia = "ultimo" | "primeiro" | "meio" | "mediana3";

const NOMES: Record<Estrategia, string> = {
  ultimo: "Último elemento",
  primeiro: "Primeiro elemento",
  meio: "Elemento do meio",
  mediana3: "Mediana de três",
};

const EXPLICA: Record<Estrategia, string> = {
  ultimo: "a[hi]. A escolha mais simples de escrever, e a que quebra nas duas entradas mais comuns do mundo.",
  primeiro: "a[lo]. Espelho da anterior: quebra exatamente nas mesmas entradas, pelo motivo oposto.",
  meio: "a[(lo + hi) // 2]. Resolve os dois casos ordenados de graça, e ainda pode ser derrubada por uma entrada feita de propósito.",
  mediana3: "a mediana entre a[lo], a[meio] e a[hi]. Custa duas ou três comparações a mais por partição, e é o que as bibliotecas usam de verdade.",
};

const ESTRATEGIAS: Estrategia[] = ["ultimo", "primeiro", "meio", "mediana3"];

type Resultado = { comp: number; prof: number; pior: [number, number]; primeira: [number, number] };

type Preset = { key: string; rotulo: string; valores: number[]; dica: string };

const PRESETS: Preset[] = [
  {
    key: "embaralhado",
    rotulo: "Embaralhado: 5 3 13 1 7 6 21 3",
    valores: [5, 3, 13, 1, 7, 6, 21, 3],
    dica: "Uma entrada sem padrão nenhum, e mesmo assim a estratégia do meio se dá mal: o elemento central deste array é justamente o menor de todos. Azar, não regra. É por isso que medir a escolha do pivô numa entrada só não conclui nada.",
  },
  {
    key: "ordenado",
    rotulo: "Já ordenado: 1 2 3 4 5 6 7 8",
    valores: [1, 2, 3, 4, 5, 6, 7, 8],
    dica: "Aqui a diferença aparece inteira. Pivô na ponta significa partição de tamanho 7 e 0, sete vezes seguidas. E array já ordenado não é um caso raro: é o que chega de um banco de dados, de um arquivo de log ou de uma etapa anterior do seu próprio código.",
  },
  {
    key: "invertido",
    rotulo: "Ao contrário: 8 7 6 5 4 3 2 1",
    valores: [8, 7, 6, 5, 4, 3, 2, 1],
    dica: "O mesmo desastre para as duas estratégias de ponta. O elemento do meio e a mediana de três continuam achando um pivô central, porque o meio de um array invertido é justamente o valor central.",
  },
  {
    key: "vale",
    rotulo: "Com o maior bem no meio: 2 4 6 8 1 3 5 7",
    valores: [2, 4, 6, 8, 1, 3, 5, 7],
    dica: "Montado para derrubar a estratégia do meio: o elemento central é o maior de todos, então a primeira partição sai 7 contra 0 e as estratégias de ponta ganham. Para toda regra fixa de escolha de pivô existe uma entrada assim, e é por isso que as bibliotecas sérias sorteiam ou detectam a degradação.",
  },
];

// Um particionador de Lomuto só, para as quatro estratégias. A única diferença
// entre elas é qual índice é trazido para o fim antes do laço começar.
function rodar(valores: number[], e: Estrategia): Resultado {
  const a = [...valores];
  let comp = 0;
  let profMax = 0;
  let pior: [number, number] = [0, 0];
  let piorDelta = -1;
  let primeira: [number, number] = [0, 0];
  let viuPrimeira = false;

  const escolher = (lo: number, hi: number): number => {
    if (e === "ultimo") return hi;
    if (e === "primeiro") return lo;
    const meio = lo + ((hi - lo) >> 1);
    if (e === "meio") return meio;
    // Mediana de três com contagem honesta: são 2 comparações no melhor caso e
    // 3 no pior, e cada uma entra no contador na hora em que acontece. A versão
    // com duas expressões booleanas encadeadas é mais curta de ler e executa de
    // 2 a 8 comparações, o que faria o card mentir sobre o custo da estratégia.
    const [x, y, z] = [a[lo], a[meio], a[hi]];
    comp++;
    if (x <= y) {
      comp++;
      if (y <= z) return meio; // x <= y <= z
      comp++;
      return x <= z ? hi : lo; // x <= z < y, ou z < x <= y
    }
    comp++;
    if (x <= z) return lo; // y < x <= z
    comp++;
    return y <= z ? hi : meio; // y <= z < x, ou z < y < x
  };

  const quick = (lo: number, hi: number, prof: number) => {
    if (lo > hi) return; // intervalo vazio: nem chega a virar quadro de pilha
    profMax = Math.max(profMax, prof);
    if (lo === hi) return;
    const escolhido = escolher(lo, hi);
    if (escolhido !== hi) [a[escolhido], a[hi]] = [a[hi], a[escolhido]];
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
    const esq = i - lo;
    const dir = hi - i;
    if (!viuPrimeira) {
      primeira = [esq, dir];
      viuPrimeira = true;
    }
    if (Math.abs(esq - dir) > piorDelta) {
      piorDelta = Math.abs(esq - dir);
      pior = [esq, dir];
    }
    quick(lo, i - 1, prof + 1);
    quick(i + 1, hi, prof + 1);
  };

  quick(0, a.length - 1, 1);
  return { comp, prof: profMax, pior, primeira };
}

export function QuickSortPivo() {
  const [presetKey, setPresetKey] = useState("ordenado");
  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const n = preset.valores.length;

  const linhas = useMemo(
    () => ESTRATEGIAS.map((e) => ({ e, ...rodar(preset.valores, e) })),
    [preset]
  );

  const maxComp = Math.max(...linhas.map((l) => l.comp), 1);
  const melhorComp = Math.min(...linhas.map((l) => l.comp));
  const melhorProf = Math.min(...linhas.map((l) => l.prof));
  const idealProf = Math.ceil(Math.log2(n + 1));
  const piorProf = n;

  return (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · a escolha do pivô decide entre n log n e n²</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">
            com n = {n}, profundidade {idealProf} é o ideal e {piorProf} é o pior caso
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
          {linhas.map((l) => {
            const ruim = l.prof > melhorProf;
            return (
              <div className="ord-linha" key={l.e}>
                <div className="ord-linha-nome">
                  {NOMES[l.e]} <span className="qs-explica">{EXPLICA[l.e]}</span>
                </div>
                <div className="ord-medidas">
                  <div className={`ord-medida${l.comp === melhorComp ? " melhor" : ""}`}>
                    <span className="ord-medida-rot">comparações</span>
                    <div className="bb-barra">
                      <div className="bb-barra-fill" style={{ width: `${(l.comp / maxComp) * 100}%` }} />
                      <span className="bb-barra-txt">{l.comp}</span>
                    </div>
                    <span className="ord-lei">
                      primeira partição: {l.primeira[0]} x {l.primeira[1]} · mais desequilibrada: {l.pior[0]} x{" "}
                      {l.pior[1]}
                    </span>
                  </div>
                  <div className={`ord-medida${ruim ? "" : " melhor"}`}>
                    <span className="ord-medida-rot">profundidade da recursão</span>
                    <div className="bb-barra">
                      <div
                        className={`bb-barra-fill${ruim ? " esc" : ""}`}
                        style={{ width: `${(l.prof / piorProf) * 100}%` }}
                      />
                      <span className="bb-barra-txt">{l.prof}</span>
                    </div>
                    <span className="ord-lei">
                      melhor possível {idealProf} · pior caso {piorProf}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="viz-note">
          A profundidade é o número que traduz o desequilíbrio. Um pivô que corta o trecho ao meio gera{" "}
          <strong>{idealProf}</strong> níveis com {n} elementos, porque cada nível divide o problema por dois.
          Um pivô que sempre cai na ponta gera <strong>{piorProf}</strong> níveis, porque cada partição resolve
          um elemento e devolve o resto. Como cada nível é um quadro na pilha de chamadas, a profundidade é
          também a memória: O(log n) no caso bom e O(n) no ruim. Uma ressalva sobre a barra de cima: as
          comparações que a mediana de três gasta para <strong>escolher</strong> o pivô estão contadas ali, e é
          por isso que ela aparece com um total maior mesmo quando parte melhor. São duas ou três por partição,
          dependendo de onde a mediana cai, e O(1) de qualquer jeito, então somem na conta assintótica; no
          gráfico de um array de oito elementos, não.
        </p>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Nenhuma regra fixa é imune, e o preset do vale mostra isso: para toda estratégia determinística existe
          uma entrada construída para derrubá-la. É por isso que implementações de biblioteca fazem duas coisas
          a mais. Sorteiam parte da escolha, o que tira do atacante a capacidade de prever o pivô, e monitoram a
          profundidade: o introsort do C++ conta os níveis e, quando passa de 2 log n, troca para heap sort no
          meio da execução, trocando velocidade por uma garantia.
        </p>
      </div>
    </figure>
  );
}
