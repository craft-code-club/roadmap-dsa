"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// ShellSortGaps, onde a conta vira e o que a sequência de gaps muda.
//
// Este visualizador existe para responder duas perguntas que o passo a passo ao
// lado deixa em aberto, e as duas respostas são contraintuitivas.
//
// A primeira: com oito elementos o shell sort PERDE do insertion sort, então a
// partir de que tamanho ele passa a ganhar? A resposta é "muito cedo", e por
// isso o seletor de tamanho é o controle principal da tela. Esconder esse
// cruzamento seria vender o algoritmo em vez de ensiná-lo.
//
// A segunda: quanto a escolha da sequência de gaps importa? Bem menos do que a
// literatura sugere em arrays deste tamanho. A diferença entre a sequência
// original de Shell e a de Ciura é pequena; a diferença entre qualquer uma
// delas e o insertion sort (que é o shell sort com a sequência degenerada [1])
// é enorme. Por isso o insertion sort aparece como mais uma linha da tabela, e
// não como um comparativo à parte: ele é literalmente o caso base deste mesmo
// código.
//
// As entradas são geradas por fórmula determinística, nunca por Math.random:
// além de a hidratação quebrar, um número que muda a cada visita não pode ser
// citado no artigo nem verificado por teste.
//
// Sobre a casca (contrato em `content/visualizers/README.md`):
//   · `total: 1` — sem linha do tempo. O eixo é a ENTRADA (o tamanho e a
//     forma), e o resumo do estado entra como `children` do `VizHeader`.
//   · `collapsible: false` — as cinco linhas da corrida são o conteúdo; não há
//     bloco dispensável, e por isso `measureOn` fica de fora.
//   · o que move a altura aqui não é a contagem de linhas (são cinco, fixas em
//     `SEQUENCIAS`) e sim a legenda `gaps: …`, que cresce com n, e a nota, que
//     tem três redações. Os dois chips de controle ficam no miolo.
// ---------------------------------------------------------------------------

type Seq = { key: string; nome: string; gaps: (n: number) => number[]; nota: string };

const SEQUENCIAS: Seq[] = [
  {
    key: "shell",
    nome: "Shell (1959)",
    nota: "n/2, depois metade a cada rodada. A proposta original, e a mais fácil de escrever.",
    gaps: (n) => {
      const g: number[] = [];
      for (let h = Math.floor(n / 2); h > 0; h = Math.floor(h / 2)) g.push(h);
      return g;
    },
  },
  {
    key: "hibbard",
    nome: "Hibbard (1963)",
    nota: "2^k - 1: 1, 3, 7, 15, 31... Gaps sempre ímpares, o que evita que uma rodada compare só os pares com os pares.",
    gaps: (n) => {
      const g: number[] = [];
      for (let h = 1; h < n; h = h * 2 + 1) g.push(h);
      return g.reverse();
    },
  },
  {
    key: "knuth",
    nome: "Knuth (1973)",
    nota: "3k + 1: 1, 4, 13, 40, 121... A mais citada em livro-texto, com pior caso conhecido de O(n^(3/2)), ou seja, n elevado a 1,5.",
    gaps: (n) => {
      const g: number[] = [];
      for (let h = 1; h < n; h = h * 3 + 1) g.push(h);
      return g.reverse();
    },
  },
  {
    key: "ciura",
    nome: "Ciura (2001)",
    nota: "1, 4, 10, 23, 57, 132, 301, 701. Achada por busca empírica, sem fórmula fechada, e é a que costuma medir melhor na prática.",
    gaps: (n) => [701, 301, 132, 57, 23, 10, 4, 1].filter((h) => h < n),
  },
  {
    key: "insertion",
    nome: "Só gap 1 (insertion sort)",
    nota: "A sequência degenerada. É o mesmo código deste visualizador com uma rodada só, ou seja, o insertion sort puro.",
    gaps: () => [1],
  },
];

// O algoritmo é um só: o que muda entre as linhas é a lista de gaps.
function rodar(valores: number[], gaps: number[]): { comp: number; escritas: number; ok: boolean } {
  const a = [...valores];
  const n = a.length;
  let comp = 0;
  let escritas = 0;
  for (const gap of gaps) {
    for (let i = gap; i < n; i++) {
      const atual = a[i];
      let j = i;
      while (j >= gap) {
        comp++;
        if (!(a[j - gap] > atual)) break;
        a[j] = a[j - gap];
        escritas++;
        j -= gap;
      }
      a[j] = atual;
      escritas++;
    }
  }
  const ok = a.every((v, k) => k === 0 || a[k - 1] <= v);
  return { comp, escritas, ok };
}

type Forma = "embaralhado" | "invertido" | "quase" | "adversaria";

const FORMAS: { key: Forma; rotulo: string; dica: string }[] = [
  {
    key: "embaralhado",
    rotulo: "Embaralhado",
    dica: "Um embaralhamento de verdade, com semente fixa para o número ser sempre o mesmo e poder ser citado. É o caso típico, e é aqui que as quatro sequências ficam na mesma faixa.",
  },
  {
    key: "invertido",
    rotulo: "Ao contrário",
    dica: "Todas as inversões possíveis. É o pior caso do insertion sort, e é onde a vantagem dos gaps grandes aparece mais cedo.",
  },
  {
    key: "adversaria",
    rotulo: "Adversária dos gaps pares",
    dica: "Uma permutação por inversão de bits, montada para castigar a sequência original de Shell. Como todos os gaps dela são potências de dois, uma posição par só é comparada com posições pares até a última rodada, e esta entrada põe todos os valores pequenos nas posições pares. Foi exatamente esse defeito que motivou Hibbard a propor gaps ímpares.",
  },
  {
    key: "quase",
    rotulo: "Quase ordenado",
    dica: "Ordenado, com um par trocado a cada oito posições, ou seja, pouquíssimas inversões. Aqui o insertion sort ganha em todos os tamanhos, e não é questão de esperar n crescer: com poucas inversões ele já é praticamente linear, e nenhuma sequência de gaps consegue vencer isso.",
  },
];

const TAMANHOS = [8, 16, 32, 64, 128];

function entradaDe(forma: Forma, n: number): number[] {
  if (forma === "invertido") return Array.from({ length: n }, (_, k) => n - k);
  if (forma === "quase") {
    const a = Array.from({ length: n }, (_, k) => k + 1);
    for (let k = 0; k + 1 < n; k += 8) [a[k], a[k + 1]] = [a[k + 1], a[k]];
    return a;
  }
  if (forma === "adversaria") {
    // Inversão de bits: com n potência de dois, é uma permutação exata, e ela
    // separa índices pares de ímpares exatamente como os gaps de Shell fazem.
    const bits = Math.round(Math.log2(n));
    const rev = (k: number) => {
      let r = 0;
      for (let t = 0; t < bits; t++) r = (r << 1) | ((k >> t) & 1);
      return r;
    };
    return Array.from({ length: n }, (_, k) => rev(k) + 1);
  }
  // Fisher-Yates com gerador linear congruente de semente fixa: determinístico
  // (nada de Math.random, que quebraria a hidratação e tornaria os números da
  // tela impossíveis de citar) e sem a estrutura aritmética que uma fórmula do
  // tipo k * c % n deixa para trás.
  //
  // A multiplicação usa Math.imul e a máscara de 31 bits de propósito: o
  // produto da semente pelo multiplicador passa de 2^53, e com aritmética de
  // ponto flutuante ele perderia os bits de baixo, deixando de ser o LCG que o
  // comentário promete. Com imul a conta fecha em 32 bits, como manda a
  // definição, e continua determinística.
  const a = Array.from({ length: n }, (_, k) => k + 1);
  let semente = 20250803;
  const prox = () => {
    semente = (Math.imul(semente, 1103515245) + 12345) & 0x7fffffff;
    return semente / 2147483648;
  };
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(prox() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Inversões da entrada: é o número que explica por que o insertion sort às
// vezes é imbatível, e sem ele a nota da tela viraria adivinhação.
function inversoes(v: number[]): number {
  let t = 0;
  for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (v[i] > v[j]) t++;
  return t;
}

export function ShellSortGaps() {
  const [forma, setForma] = useState<Forma>("embaralhado");
  const [n, setN] = useState(32);

  const viz = useVisualizer({
    title: "Visualizador · a partir de que tamanho o gap compensa",
    total: 1,
    collapsible: false,
  });

  const entrada = useMemo(() => entradaDe(forma, n), [forma, n]);
  const linhas = useMemo(
    () =>
      SEQUENCIAS.map((s) => {
        const gaps = s.gaps(n);
        return { s, gaps, ...rodar(entrada, gaps) };
      }),
    [entrada, n]
  );

  const insertion = linhas[linhas.length - 1];
  const comGap = linhas.slice(0, -1); // todas menos a sequência degenerada [1]
  const maxComp = Math.max(...linhas.map((l) => l.comp), 1);
  const maxEsc = Math.max(...linhas.map((l) => l.escritas), 1);
  const melhorComp = Math.min(...linhas.map((l) => l.comp));
  const shell = linhas[0]; // a sequência original, com gaps potência de dois
  const melhorGap = comGap.reduce((m, l) => (l.comp < m.comp ? l : m), comGap[0]);
  const razao = insertion.comp / melhorGap.comp;
  const inv = useMemo(() => inversoes(entrada), [entrada]);
  const poucasInversoes = inv < n;
  // Só chama de castigo o que é castigo: com n minúsculo a diferença entre
  // sequências é ruído, e o dobro de comparações é o piso para a explicação
  // aritmética valer a pena.
  const shellPunida = n >= 16 && shell.comp > melhorGap.comp * 2;
  const formaAtual = FORMAS.find((f) => f.key === forma)!;

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz}>
        <span className="viz-step">
          n = {n} · melhor com gap: {melhorGap.s.nome}, {melhorGap.comp} comparações · insertion sort:{" "}
          {insertion.comp}
        </span>
      </VizHeader>

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {TAMANHOS.map((t) => (
            <button type="button" key={t} className={`bigo-chip${n === t ? " on" : ""}`} onClick={() => setN(t)} aria-pressed={n === t}>
              n = {t}
            </button>
          ))}
        </div>
        <div className="bigo-chips">
          {FORMAS.map((f) => (
            <button
              type="button"
              key={f.key}
              className={`bigo-chip${forma === f.key ? " on" : ""}`}
              onClick={() => setForma(f.key)}
              aria-pressed={forma === f.key}
            >
              {f.rotulo}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">{formaAtual.dica}</p>

        <div className="ord-corrida">
          {linhas.map((l) => (
            <div className={`ord-linha${l.s.key === "insertion" ? " ss-base" : ""}`} key={l.s.key}>
              <div className="ord-linha-nome">
                {l.s.nome} <span className="qs-explica">{l.s.nota}</span>
              </div>
              <div className="ord-medidas">
                <div className={`ord-medida${l.comp === melhorComp ? " melhor" : ""}`}>
                  <span className="ord-medida-rot">comparações</span>
                  <div className="bb-barra">
                    <div className="bb-barra-fill" style={{ width: `${(l.comp / maxComp) * 100}%` }} />
                    <span className="bb-barra-txt">{l.comp}</span>
                  </div>
                  <span className="ord-lei">gaps: {l.gaps.join(", ")}</span>
                </div>
                <div className="ord-medida">
                  <span className="ord-medida-rot">escritas no array</span>
                  <div className="bb-barra">
                    <div className="bb-barra-fill esc" style={{ width: `${(l.escritas / maxEsc) * 100}%` }} />
                    <span className="bb-barra-txt">{l.escritas}</span>
                  </div>
                  <span className="ord-lei">
                    {l.gaps.length} rodada{l.gaps.length === 1 ? "" : "s"} · saída {l.ok ? "ordenada" : "ERRADA"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className={`viz-note${razao >= 1 ? " ok" : " invalid"}`}>
          {poucasInversoes ? (
            <>
              Esta entrada tem só <strong>{inv} inversões</strong> em {n} posições, e o insertion sort paga
              exatamente uma operação por inversão: ele já está perto de O(n) e ganha de todas as sequências de
              gap ({insertion.comp} comparações contra {melhorGap.comp} da melhor delas). Aumentar o tamanho não
              vira essa conta, porque o shell sort varre o array inteiro uma vez por gap, custe o que custar.
              Contra entrada quase ordenada o insertion sort é imbatível, e é por isso que o Timsort procura
              trechos já ordenados antes de qualquer outra coisa.
            </>
          ) : shellPunida ? (
            <>
              Aqui a sequência de gaps deixa de ser detalhe. A original de Shell gasta{" "}
              <strong>{shell.comp} comparações</strong> e a melhor deste conjunto gasta{" "}
              <strong>{melhorGap.comp}</strong>, uma diferença de {(shell.comp / melhorGap.comp).toFixed(1)}{" "}
              vezes. O motivo é aritmético: todos os gaps da sequência original são potências de dois, então uma
              posição par só é comparada com posições pares até a última rodada, e esta entrada põe os valores
              pequenos justamente nas posições pares. Gaps que não compartilham fatores, como os ímpares de
              Hibbard, não têm esse ponto cego.
            </>
          ) : (
            <>
              Com {n} elementos, o shell sort {razao >= 1 ? "compensa" : "ainda não compensa"}: a melhor
              sequência faz {melhorGap.comp} comparações contra as {insertion.comp} do insertion sort. E repare
              no que <strong>não</strong> muda muito: as quatro sequências de gap ficam na mesma faixa entre si.
              Numa entrada típica, a decisão que importa é usar gap maior que 1, não qual fórmula exata gera os
              gaps.
            </>
          )}
        </p>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Este é o argumento a favor do shell sort escrito em números: ele é o insertion sort com uma linha
          diferente, cabe em dez linhas de código, não aloca nada, e mesmo assim escapa do quadrático. Não
          existe fórmula fechada conhecida para o caso médio da maioria das sequências de gaps, o que é raro em
          computação: a sequência de Ciura foi encontrada por busca empírica, testando combinações, e não
          deduzida.
        </p>
      </div>

      {/* Sem linha do tempo e sem botões extras, o `VizFooter` não desenha nada. */}
      <VizFooter viz={viz} />
    </figure>
  );
}
