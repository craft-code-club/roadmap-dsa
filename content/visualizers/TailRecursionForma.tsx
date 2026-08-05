"use client";

import { useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// TailRecursionForma, o classificador: "esta chamada está em posição de cauda?"
//
// A pilha do TailRecursionVisualizer mostra a CONSEQUÊNCIA; aqui se aprende a
// CAUSA, que é a única coisa que o aluno precisa saber olhar no próprio código:
// depois da chamada, sobrou alguma conta pendurada ou não?
//
// Cada caso guarda a linha (ou linhas) da última instrução executada, o que
// fica pendente e como o conserto seria feito. Os sete casos cobrem os dois
// erros clássicos (soma comum e fibonacci ingênuo), os dois acertos (o
// acumulador em Python e em Elixir), a distinção entre tail call e tail
// recursion (que foi pergunta do Giovani no encontro), a recursão que já nasce
// de cauda (busca em BST) e o contraexemplo do map, em que virar de cauda sai
// mais caro.
//
// O painel de código usa .tr-code em vez de .viz-code de propósito: o .viz-code
// some abaixo de 760px por design, e aqui o código É o conteúdo.
//
// Por isso mesmo, `collapsible: false`: o bloco de código não é dispensável,
// ele é o objeto da classificação — no modo treino a própria nota manda "leia o
// código acima". A casca entra com o painel de cabeçalho e controles parados, e
// nada mais. Medido a 1512x900: o pior caso (busca em BST) pede 737px de um
// orçamento de 816, então não há o que recolher; e a 1440x600 nem recolher o
// código resolveria (533px de um orçamento de 516).
//
// A casca vem do `useVisualizer`. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type Case = {
  key: string;
  label: string;
  file: string;
  code: string[];
  targets: number[]; // linhas da última instrução executada em cada caminho
  tail: boolean;
  recursive: boolean;
  pending: string;
  reading: string;
  fix: string;
  stack: string;
};

const CASES: Case[] = [
  {
    key: "comum",
    label: "soma comum",
    file: "soma.py",
    code: [
      "def soma(nums):",
      "    if not nums:",
      "        return 0",
      "    return nums[0] + soma(nums[1:])",
    ],
    targets: [3],
    tail: false,
    recursive: true,
    pending: "nums[0] + ?",
    reading:
      "A última coisa que a função faz não é chamar soma, é somar. A chamada precisa voltar com um número para o + acontecer, e por isso este frame fica vivo esperando, com o nums[0] guardado dentro dele.",
    fix: "Empurre a soma para dentro do argumento: soma(nums[1:], acc + nums[0]).",
    stack: "O(n) sempre",
  },
  {
    key: "cauda",
    label: "soma de cauda",
    file: "soma_cauda.py",
    code: [
      "def soma(nums, acc=0):",
      "    if not nums:",
      "        return acc",
      "    return soma(nums[1:], acc + nums[0])",
    ],
    targets: [3],
    tail: true,
    recursive: true,
    pending: "nada",
    reading:
      "acc + nums[0] é avaliado antes da chamada, na hora de montar o argumento. Quando soma é chamada, este frame já não tem mais nada a fazer: o valor que ela devolver é, sem tocar em nada, o valor que ele devolve.",
    fix: "Já está pronta. Numa linguagem com TCO este frame é reescrito no lugar e a pilha fica em 1.",
    stack: "O(1) com TCO, O(n) sem",
  },
  {
    key: "elixir",
    label: "a mesma soma em Elixir",
    file: "soma.ex",
    code: [
      "def soma([], acc), do: acc",
      "",
      "def soma([head | tail], acc) do",
      "  soma(tail, acc + head)",
      "end",
    ],
    targets: [3],
    tail: true,
    recursive: true,
    pending: "nada",
    reading:
      "É a função do encontro. O caso base virou uma cláusula separada por pattern matching, e [head | tail] decompõe a lista sem copiar nada: tail é um ponteiro para o resto, não uma cópia como o nums[1:] do Python.",
    fix: "A BEAM aplica a otimização sozinha, sem anotação nenhuma: lista de 1.000 elementos, 1 frame.",
    stack: "O(1), a BEAM otimiza",
  },
  {
    key: "outra",
    label: "chama outra função",
    file: "validar.py",
    code: ["def validar(texto):", "    return checar(list(texto), [])"],
    targets: [1],
    tail: true,
    recursive: false,
    pending: "nada",
    reading:
      "Chamada de cauda não precisa ser recursiva. Aqui a última instrução chama outra função, e o frame de validar também não serve mais para nada depois disso. Foi exatamente a pergunta do Giovani no encontro, e a resposta é sim: a otimização vale igual.",
    fix: "Nada a consertar. Só repare no vocabulário: isto é tail call, e tail recursion é o caso em que a função chamada é ela mesma.",
    stack: "O(1) com TCO",
  },
  {
    key: "fib",
    label: "fibonacci ingênuo",
    file: "fib.py",
    code: ["def fib(n):", "    if n < 2:", "        return n", "    return fib(n - 1) + fib(n - 2)"],
    targets: [3],
    tail: false,
    recursive: true,
    pending: "fib(n - 1) + ?",
    reading:
      "Duas chamadas e um +. Nenhuma das duas está em posição de cauda: fib(n - 1) tem que voltar para o + acontecer, e o + tem que acontecer para existir um return. Não existe otimização de linguagem que salve esta forma.",
    fix: "Vire o problema de cabeça para baixo: fib(n, a=0, b=1) carrega os dois últimos valores e a chamada passa a ser a última instrução.",
    stack: "O(n) de pilha, O(2ⁿ) de tempo",
  },
  {
    key: "bst",
    label: "busca em BST",
    file: "bst.py",
    code: [
      "def buscar(no, alvo):",
      "    if no is None or no.val == alvo:",
      "        return no",
      "    if alvo < no.val:",
      "        return buscar(no.esq, alvo)",
      "    return buscar(no.dir, alvo)",
    ],
    targets: [4, 5],
    tail: true,
    recursive: true,
    pending: "nada",
    reading:
      "Os ifs antes não atrapalham: o que conta é a última instrução executada em cada caminho. Aqui os dois returns recursivos são só a chamada, sem nenhuma conta pendurada em cima dela.",
    fix: "Já é de cauda, e é por isso que a busca em BST vira um while de três linhas sem nenhum esforço.",
    stack: "O(1) com TCO, O(altura) sem",
  },
  {
    key: "map",
    label: "dobrar os valores",
    file: "dobrar.py",
    code: [
      "def dobrar(nums):",
      "    if not nums:",
      "        return []",
      "    return [nums[0] * 2] + dobrar(nums[1:])",
    ],
    targets: [3],
    tail: false,
    recursive: true,
    pending: "[nums[0] * 2] + ?",
    reading:
      "Mesmo formato da soma comum, só que juntando listas em vez de números. E é o caso que o Tiago mediu no encontro: aqui a versão de cauda saiu mais lenta, porque ela monta a lista ao contrário e precisa de um reverse no fim.",
    fix: "Dá para transformar (acc=[] e reverse no fim), só que o conserto custa uma passada extra. Nem toda recursão quer virar de cauda.",
    stack: "O(n) sempre",
  },
];

// Ritmo próprio, bem mais lento que o padrão: cada passo aqui é um caso inteiro
// para ler, não uma troca de posição num array.
const SPEEDS = [0, 3200, 2400, 1800, 1300, 900];

export function TailRecursionForma() {
  // Modo treino: esconde o veredito e a leitura, deixando só o código na tela.
  // É o exercício que o artigo pede (decidir antes de olhar o selo).
  const [training, setTraining] = useState(false);
  // Qual caso está revelado, e não um booleano solto: trocar de caso tem que
  // esconder o veredito de novo, e agora o caso também muda pelas setas e pelo
  // ▶ Rodar, que são da casca e não passam por nenhum handler daqui.
  const [revealedFor, setRevealedFor] = useState<number | null>(null);

  const viz = useVisualizer({
    title: "Visualizador · esta chamada está em posição de cauda?",
    total: CASES.length,
    speeds: SPEEDS,
    // Sem bloco dispensável: o código É o conteúdo que se classifica aqui.
    collapsible: false,
  });

  const c = CASES[viz.step];
  const revealed = revealedFor === viz.step;

  const pick = (k: number) => {
    viz.setStep(k);
    setRevealedFor(null);
  };

  // Fora do modo treino tudo aparece de uma vez, como antes.
  const shows = !training || revealed;

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {CASES.map((item, k) => (
            <button
              key={item.key}
              className={`bigo-chip${k === viz.step ? " on" : ""}`}
              aria-pressed={k === viz.step}
              onClick={() => pick(k)}
            >
              <span
                className="sw"
                style={{ background: k === viz.step && shows ? (item.tail ? "#34d399" : "#f87171") : "#3a4a60" }}
              />
              {item.label}
            </button>
          ))}
        </div>

        <div className="bigo-chips">
          <button
            className={`bigo-chip${training ? " on" : ""}`}
            aria-pressed={training}
            onClick={() => {
              setTraining((t) => !t);
              setRevealedFor(null);
            }}
          >
            <span className="sw" style={{ background: training ? "#fbbf24" : "#3a4a60" }} />
            Modo treino: esconder o veredito
          </button>
        </div>

        <div className="tr-verd">
          {shows ? (
            <>
              <span className={`tr-selo ${c.tail ? "sim" : "nao"}`}>
                {c.tail ? "✓ está em posição de cauda" : "✗ não está em posição de cauda"}
              </span>
              <span className="tr-selo">{c.recursive ? "chama a si mesma" : "chama outra função"}</span>
            </>
          ) : (
            <>
              <span className="tr-selo">? decida antes de revelar</span>
              <button className="viz-btn" onClick={() => setRevealedFor(viz.step)}>
                Revelar veredito
              </button>
            </>
          )}
          <span className="tr-lang">{c.file}</span>
        </div>

        <div className="tr-code">
          <div className="tr-code-head">a linha destacada é a última instrução executada</div>
          <div className="tr-code-body">
            {c.code.map((txt, k) => (
              <div key={k} className={`viz-line${c.targets.includes(k) ? " tr-alvo" : ""}`}>
                <span className="ln">{k + 1}</span>
                {txt || " "}
              </div>
            ))}
          </div>
        </div>

        {shows ? (
          <>
            <p className={`viz-note${c.tail ? " ok" : " invalid"}`}>{c.reading}</p>

            <div className="tr-fatos">
              <div className="tr-fato">
                <span className="tr-fato-rot">o que fica pendente</span>
                <p className="tr-fato-txt tr-mono">{c.pending}</p>
              </div>
              <div className="tr-fato">
                <span className="tr-fato-rot">espaço na pilha</span>
                <p className="tr-fato-txt tr-mono">{c.stack}</p>
              </div>
              <div className="tr-fato">
                <span className="tr-fato-rot">{c.tail ? "o que isso te dá" : "como vira de cauda"}</span>
                <p className="tr-fato-txt">{c.fix}</p>
              </div>
            </div>
          </>
        ) : (
          <p className="viz-note">
            Leia o código acima e responda antes de olhar: depois da chamada, sobra alguma conta pendurada neste frame?
            Se sobra, não é posição de cauda.
          </p>
        )}
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );
}
