"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
// ---------------------------------------------------------------------------

type Caso = {
  key: string;
  rotulo: string;
  arquivo: string;
  codigo: string[];
  alvos: number[]; // linhas da última instrução executada em cada caminho
  cauda: boolean;
  recursiva: boolean;
  pendente: string;
  leitura: string;
  conserto: string;
  pilha: string;
};

const CASOS: Caso[] = [
  {
    key: "comum",
    rotulo: "soma comum",
    arquivo: "soma.py",
    codigo: [
      "def soma(nums):",
      "    if not nums:",
      "        return 0",
      "    return nums[0] + soma(nums[1:])",
    ],
    alvos: [3],
    cauda: false,
    recursiva: true,
    pendente: "nums[0] + ?",
    leitura:
      "A última coisa que a função faz não é chamar soma, é somar. A chamada precisa voltar com um número para o + acontecer, e por isso este frame fica vivo esperando, com o nums[0] guardado dentro dele.",
    conserto: "Empurre a soma para dentro do argumento: soma(nums[1:], acc + nums[0]).",
    pilha: "O(n) sempre",
  },
  {
    key: "cauda",
    rotulo: "soma de cauda",
    arquivo: "soma_cauda.py",
    codigo: [
      "def soma(nums, acc=0):",
      "    if not nums:",
      "        return acc",
      "    return soma(nums[1:], acc + nums[0])",
    ],
    alvos: [3],
    cauda: true,
    recursiva: true,
    pendente: "nada",
    leitura:
      "acc + nums[0] é avaliado antes da chamada, na hora de montar o argumento. Quando soma é chamada, este frame já não tem mais nada a fazer: o valor que ela devolver é, sem tocar em nada, o valor que ele devolve.",
    conserto: "Já está pronta. Numa linguagem com TCO este frame é reescrito no lugar e a pilha fica em 1.",
    pilha: "O(1) com TCO, O(n) sem",
  },
  {
    key: "elixir",
    rotulo: "a mesma soma em Elixir",
    arquivo: "soma.ex",
    codigo: [
      "def soma([], acc), do: acc",
      "",
      "def soma([head | tail], acc) do",
      "  soma(tail, acc + head)",
      "end",
    ],
    alvos: [3],
    cauda: true,
    recursiva: true,
    pendente: "nada",
    leitura:
      "É a função do encontro. O caso base virou uma cláusula separada por pattern matching, e [head | tail] decompõe a lista sem copiar nada: tail é um ponteiro para o resto, não uma cópia como o nums[1:] do Python.",
    conserto: "A BEAM aplica a otimização sozinha, sem anotação nenhuma: lista de 1.000 elementos, 1 frame.",
    pilha: "O(1), a BEAM otimiza",
  },
  {
    key: "outra",
    rotulo: "chama outra função",
    arquivo: "validar.py",
    codigo: ["def validar(texto):", "    return checar(list(texto), [])"],
    alvos: [1],
    cauda: true,
    recursiva: false,
    pendente: "nada",
    leitura:
      "Chamada de cauda não precisa ser recursiva. Aqui a última instrução chama outra função, e o frame de validar também não serve mais para nada depois disso. Foi exatamente a pergunta do Giovani no encontro, e a resposta é sim: a otimização vale igual.",
    conserto: "Nada a consertar. Só repare no vocabulário: isto é tail call, e tail recursion é o caso em que a função chamada é ela mesma.",
    pilha: "O(1) com TCO",
  },
  {
    key: "fib",
    rotulo: "fibonacci ingênuo",
    arquivo: "fib.py",
    codigo: ["def fib(n):", "    if n < 2:", "        return n", "    return fib(n - 1) + fib(n - 2)"],
    alvos: [3],
    cauda: false,
    recursiva: true,
    pendente: "fib(n - 1) + ?",
    leitura:
      "Duas chamadas e um +. Nenhuma das duas está em posição de cauda: fib(n - 1) tem que voltar para o + acontecer, e o + tem que acontecer para existir um return. Não existe otimização de linguagem que salve esta forma.",
    conserto: "Vire o problema de cabeça para baixo: fib(n, a=0, b=1) carrega os dois últimos valores e a chamada passa a ser a última instrução.",
    pilha: "O(n) de pilha, O(2ⁿ) de tempo",
  },
  {
    key: "bst",
    rotulo: "busca em BST",
    arquivo: "bst.py",
    codigo: [
      "def buscar(no, alvo):",
      "    if no is None or no.val == alvo:",
      "        return no",
      "    if alvo < no.val:",
      "        return buscar(no.esq, alvo)",
      "    return buscar(no.dir, alvo)",
    ],
    alvos: [4, 5],
    cauda: true,
    recursiva: true,
    pendente: "nada",
    leitura:
      "Os ifs antes não atrapalham: o que conta é a última instrução executada em cada caminho. Aqui os dois returns recursivos são só a chamada, sem nenhuma conta pendurada em cima dela.",
    conserto: "Já é de cauda, e é por isso que a busca em BST vira um while de três linhas sem nenhum esforço.",
    pilha: "O(1) com TCO, O(altura) sem",
  },
  {
    key: "map",
    rotulo: "dobrar os valores",
    arquivo: "dobrar.py",
    codigo: [
      "def dobrar(nums):",
      "    if not nums:",
      "        return []",
      "    return [nums[0] * 2] + dobrar(nums[1:])",
    ],
    alvos: [3],
    cauda: false,
    recursiva: true,
    pendente: "[nums[0] * 2] + ?",
    leitura:
      "Mesmo formato da soma comum, só que juntando listas em vez de números. E é o caso que o Tiago mediu no encontro: aqui a versão de cauda saiu mais lenta, porque ela monta a lista ao contrário e precisa de um reverse no fim.",
    conserto: "Dá para transformar (acc=[] e reverse no fim), só que o conserto custa uma passada extra. Nem toda recursão quer virar de cauda.",
    pilha: "O(n) sempre",
  },
];

const VELOCIDADES = [0, 3200, 2400, 1800, 1300, 900];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

export function TailRecursionForma() {
  const [i, setI] = useState(0);
  // Modo treino: esconde o veredito e a leitura, deixando só o código na tela.
  // É o exercício que o artigo pede (decidir antes de olhar o selo).
  const [treino, setTreino] = useState(false);
  const [revelado, setRevelado] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const total = CASOS.length;
  const c = CASOS[Math.min(i, total - 1)];

  const parar = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);
  useEffect(() => () => parar(), [parar]);

  useEffect(() => {
    parar();
    if (!tocando) return;
    timer.current = setInterval(() => setI((s) => (s >= total - 1 ? s : s + 1)), VELOCIDADES[velocidade]);
    return parar;
  }, [tocando, velocidade, total, parar]);

  useEffect(() => {
    if (tocando && i >= total - 1) setTocando(false);
  }, [tocando, i, total]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const escolher = (k: number) => {
    parar();
    setTocando(false);
    setI(k);
    setRevelado(false);
  };

  // Fora do modo treino tudo aparece de uma vez, como antes.
  const mostra = !treino || revelado;

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · esta chamada está em posição de cauda?</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">
            caso {i + 1} de {total}
          </span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "✕ Fechar" : "⤢ Expandir"}
          </button>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          {CASOS.map((caso, k) => (
            <button
              key={caso.key}
              className={`bigo-chip${k === i ? " on" : ""}`}
              aria-pressed={k === i}
              onClick={() => escolher(k)}
            >
              <span
                className="sw"
                style={{ background: k === i && mostra ? (caso.cauda ? "#34d399" : "#f87171") : "#3a4a60" }}
              />
              {caso.rotulo}
            </button>
          ))}
        </div>

        <div className="bigo-chips">
          <button
            className={`bigo-chip${treino ? " on" : ""}`}
            aria-pressed={treino}
            onClick={() => {
              setTreino((t) => !t);
              setRevelado(false);
            }}
          >
            <span className="sw" style={{ background: treino ? "#fbbf24" : "#3a4a60" }} />
            Modo treino: esconder o veredito
          </button>
        </div>

        <div className="tr-verd">
          {mostra ? (
            <>
              <span className={`tr-selo ${c.cauda ? "sim" : "nao"}`}>
                {c.cauda ? "✓ está em posição de cauda" : "✗ não está em posição de cauda"}
              </span>
              <span className="tr-selo">{c.recursiva ? "chama a si mesma" : "chama outra função"}</span>
            </>
          ) : (
            <>
              <span className="tr-selo">? decida antes de revelar</span>
              <button className="viz-btn" onClick={() => setRevelado(true)}>
                Revelar veredito
              </button>
            </>
          )}
          <span className="tr-lang">{c.arquivo}</span>
        </div>

        <div className="tr-code">
          <div className="tr-code-head">a linha destacada é a última instrução executada</div>
          <div className="tr-code-body">
            {c.codigo.map((txt, k) => (
              <div key={k} className={`viz-line${c.alvos.includes(k) ? " tr-alvo" : ""}`}>
                <span className="ln">{k + 1}</span>
                {txt || " "}
              </div>
            ))}
          </div>
        </div>

        {mostra ? (
          <>
            <p className={`viz-note${c.cauda ? " ok" : " invalid"}`}>{c.leitura}</p>

            <div className="tr-fatos">
              <div className="tr-fato">
                <span className="tr-fato-rot">o que fica pendente</span>
                <p className="tr-fato-txt tr-mono">{c.pendente}</p>
              </div>
              <div className="tr-fato">
                <span className="tr-fato-rot">espaço na pilha</span>
                <p className="tr-fato-txt tr-mono">{c.pilha}</p>
              </div>
              <div className="tr-fato">
                <span className="tr-fato-rot">{c.cauda ? "o que isso te dá" : "como vira de cauda"}</span>
                <p className="tr-fato-txt">{c.conserto}</p>
              </div>
            </div>
          </>
        ) : (
          <p className="viz-note">
            Leia o código acima e responda antes de olhar: depois da chamada, sobra alguma conta pendurada neste frame?
            Se sobra, não é posição de cauda.
          </p>
        )}

        <div className="viz-controls">
          <button className="viz-btn" title="Voltar ao primeiro caso" onClick={() => escolher(0)}>
            ↺
          </button>
          <button className="viz-btn" disabled={i === 0} onClick={() => escolher(Math.max(0, i - 1))}>
            ‹ Anterior
          </button>
          <button
            className="viz-play"
            onClick={() => {
              if (tocando) {
                setTocando(false);
                return;
              }
              setI(i >= total - 1 ? 0 : i);
              setTocando(true);
            }}
          >
            {tocando ? "❚❚ Pausar" : "▶ Rodar os 7 casos"}
          </button>
          <button className="viz-btn" disabled={i === total - 1} onClick={() => escolher(Math.min(i + 1, total - 1))}>
            Próximo ›
          </button>
          <div className="viz-speed">
            <span>Velocidade</span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={velocidade}
              onChange={(e) => setVelocidade(parseInt(e.target.value, 10))}
            />
            <span className="val">{ROTULOS_VEL[velocidade]}</span>
          </div>
        </div>
        <div className="viz-progress">
          <div className="viz-progress-fill" style={{ width: `${Math.round(((i + 1) / total) * 100)}%` }} />
        </div>
      </div>
    </figure>
  );

  if (expanded && mounted) {
    return createPortal(
      <div
        className="viz-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) setExpanded(false);
        }}
      >
        {viz}
      </div>,
      document.body
    );
  }
  return viz;
}
