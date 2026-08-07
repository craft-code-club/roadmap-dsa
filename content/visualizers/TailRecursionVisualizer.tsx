"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// TailRecursionVisualizer, a MESMA soma nas duas formas, lado a lado.
//
// É o visualizador central do tópico: à esquerda a recursão comum (body
// recursive), com a pilha crescendo e uma conta pendente presa em cada frame;
// à direita a recursão de cauda, que com tail call optimization reescreve o
// mesmo frame e nunca passa de 1.
//
// O botão "sem TCO (Python)" é o que fecha a ideia: a recursão de cauda sozinha
// NÃO economiza memória, ela só organiza a conta. A economia vem da otimização
// da linguagem. Com o botão desligado os dois lados empilham igual, e o único
// ganho visível é que a volta não tem conta nenhuma para fazer.
//
// A lista padrão [1, 2, 3, 4] e o rastro do acumulador (0, 1, 3, 6, 10) são
// exatamente os do encontro, incluindo o desenho de pilha que o Giovani fez no
// quadro.
//
// Os dois lados são gerados por funções puras separadas e depois alinhados pelo
// mesmo contador de passos: quem termina primeiro fica parado (com o resultado
// na tela) enquanto o outro continua. É essa imagem, a pilha da esquerda ainda
// desempilhando enquanto a direita já respondeu, que ensina o tópico.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type State = "espera" | "ativo" | "base" | "pronto";
type Frame = { call: string; pending: string; state: State };
// `sums` é o contador de operações: ele existe para mostrar que o número de
// somas é o MESMO nos dois lados (uma por elemento). O que muda de forma é
// quando elas acontecem, e é o espaço, não o tempo, que a de cauda economiza.
type Side = { frames: Frame[]; line: number; note: string; sums: number; done: boolean; ok: boolean };

// As linhas mapeiam 1:1 com os campos `line` dos dois geradores, então a ordem
// e a quantidade de linhas não podem mudar sem ajustar os geradores junto.
const CODE = [
  "def soma(nums):                       # comum",
  "    if not nums:",
  "        return 0",
  "    return nums[0] + soma(nums[1:])",
  "",
  "def soma_cauda(nums, acc=0):          # de cauda",
  "    if not nums:",
  "        return acc",
  "    return soma_cauda(nums[1:], acc + nums[0])",
];

const SPEEDS = [0, 1400, 950, 650, 420, 250];

function listOf(v: number[]): string {
  return `[${v.join(", ")}]`;
}

function prefix(v: number[], upTo: number): number {
  let s = 0;
  for (let i = 0; i < upTo; i++) s += v[i];
  return s;
}

function suffix(v: number[], from: number): number {
  let s = 0;
  for (let i = from; i < v.length; i++) s += v[i];
  return s;
}

// Formatação determinística de milhar (nada de Intl no caminho de render, senão
// o HTML do build diverge do cliente na hidratação).
function thousands(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Rótulo de tela, em português: "1 frame" / "3 frames".
function framesLabel(v: number): string {
  return `${v} ${v === 1 ? "frame" : "frames"}`;
}

// --- recursão comum: empilha n + 1 frames e só depois faz as n somas ---------
function generatePlain(nums: number[]): Side[] {
  const out: Side[] = [];
  const n = nums.length;

  for (let i = 0; i < n; i++) {
    const stack: Frame[] = [];
    for (let j = 0; j <= i; j++) {
      stack.push({
        call: `soma(${listOf(nums.slice(j))})`,
        pending: `pendente: ${nums[j]} + ?`,
        state: j === i ? "ativo" : "espera",
      });
    }
    out.push({
      frames: stack,
      line: 3,
      sums: 0,
      done: false,
      ok: false,
      note: `A lista não está vazia, então guardo "${nums[i]} +" pendente aqui e desço para soma(${listOf(nums.slice(i + 1))}). ${framesLabel(i + 1)} na pilha, ${i + 1 === 1 ? "parado" : "parados"}, esperando uma resposta que ainda não existe.`,
    });
  }

  const base: Frame[] = [];
  for (let j = 0; j < n; j++) {
    base.push({
      call: `soma(${listOf(nums.slice(j))})`,
      pending: `pendente: ${nums[j]} + ?`,
      state: "espera",
    });
  }
  base.push({ call: "soma([])", pending: "caso base: retorna 0", state: "base" });
  out.push({
    frames: base,
    line: 2,
    sums: 0,
    done: n === 0,
    ok: n === 0,
    note:
      n === 0
        ? "A lista já chegou vazia: caí direto no caso base, retorno 0 e nem cheguei a empilhar nada."
        : `Cheguei na lista vazia com ${framesLabel(n + 1)} empilhados. Retorno 0, e só agora a volta começa: nenhuma das ${n} somas foi feita ainda.`,
  });

  for (let k = n - 1; k >= 0; k--) {
    const previous = suffix(nums, k + 1);
    const value = previous + nums[k];
    const stack: Frame[] = [];
    for (let j = 0; j <= k; j++) {
      stack.push({
        call: `soma(${listOf(nums.slice(j))})`,
        pending: j === k ? `${nums[k]} + ${previous} = ${value}` : `pendente: ${nums[j]} + ?`,
        state: j === k ? "pronto" : "espera",
      });
    }
    out.push({
      frames: stack,
      line: 3,
      sums: n - k,
      done: k === 0,
      ok: k === 0,
      note: `Desempilho e agora sim faço a conta que estava presa aqui: ${nums[k]} + ${previous} = ${value}. ${
        k === 0
          ? `Pilha vazia, resposta final: ${value}.`
          : `Devolvo ${value} para o frame de baixo. Ainda ${framesLabel(k)} para desempilhar.`
      }`,
    });
  }
  return out;
}

// --- recursão de cauda: com TCO o frame é reescrito, sem TCO empilha igual ---
function generateTail(nums: number[], tco: boolean): Side[] {
  const out: Side[] = [];
  const n = nums.length;
  const total = prefix(nums, n);

  const frameAt = (i: number, state: State): Frame => ({
    call: `soma_cauda(${listOf(nums.slice(i))}, ${prefix(nums, i)})`,
    pending: "pendente: nada",
    state,
  });

  for (let i = 0; i < n; i++) {
    const acc = prefix(nums, i);
    const next = acc + nums[i];
    const stack: Frame[] = tco
      ? [frameAt(i, "ativo")]
      : Array.from({ length: i + 1 }, (_, j) => frameAt(j, j === i ? "ativo" : "espera"));
    out.push({
      frames: stack,
      line: 8,
      sums: i + 1,
      done: false,
      ok: false,
      note: tco
        ? `acc vale ${acc}. Faço a conta agora, ${acc} + ${nums[i]} = ${next}, e passo o resultado adiante. Como não sobrou nada para fazer aqui, o compilador reescreve ESTE frame com os parâmetros novos: a pilha continua com 1.`
        : `acc vale ${acc}. Faço a conta agora, ${acc} + ${nums[i]} = ${next}, e passo adiante. Só que sem TCO a chamada empilha do mesmo jeito: já são ${framesLabel(i + 1)}.`,
    });
  }

  const base: Frame[] = tco
    ? [{ call: `soma_cauda([], ${total})`, pending: `caso base: retorna acc = ${total}`, state: "base" }]
    : [
        ...Array.from({ length: n }, (_, j) => frameAt(j, "espera")),
        { call: `soma_cauda([], ${total})`, pending: `caso base: retorna acc = ${total}`, state: "base" },
      ];
  out.push({
    frames: base,
    line: 7,
    sums: n,
    done: tco || n === 0,
    ok: tco || n === 0,
    note: tco
      ? `Lista vazia: devolvo o acumulador, ${total}. Não existe volta para fazer, a resposta já estava pronta na mão, e a pilha nunca passou de 1 frame.`
      : n === 0
        ? "A lista já chegou vazia: devolvo o acumulador 0 na primeira chamada."
        : `Lista vazia: o acumulador já vale ${total}, a resposta está pronta. Mas ainda ${framesLabel(n)} embaixo para desempilhar, um por um.`,
  });

  if (!tco) {
    for (let k = n - 1; k >= 0; k--) {
      const stack = Array.from({ length: k + 1 }, (_, j) => frameAt(j, j === k ? "pronto" : "espera"));
      stack[k] = { ...stack[k], pending: `só repassa ${total}`, state: "pronto" };
      out.push({
        frames: stack,
        line: 8,
        sums: n,
        done: k === 0,
        ok: k === 0,
        note: `Desempilho sem fazer conta nenhuma: só repasso o ${total} para baixo. ${
          k === 0 ? "Fim." : `Restam ${framesLabel(k)}.`
        } A recursão de cauda arrumou a conta, mas sem otimização da linguagem a memória continua O(n).`,
      });
    }
  }
  return out;
}

const DEFAULT_LIST = [1, 2, 3, 4];

type Preset = { key: string; label: string; nums: number[] };
const PRESETS: Preset[] = [
  { key: "encontro", label: "Quatro números: [1, 2, 3, 4]", nums: DEFAULT_LIST },
  { key: "sete", label: "Sete números", nums: [5, 3, 8, 1, 9, 2, 7] },
  { key: "um", label: "Um elemento só", nums: [7] },
  { key: "vazia", label: "Lista vazia", nums: [] },
];

function parseList(text: string): number[] {
  return text
    .split(",")
    .map((x) => parseInt(x.trim(), 10))
    .filter((x) => !isNaN(x))
    .slice(0, 9);
}

function Stack({ frames: fs, label }: { frames: Frame[]; label: string }) {
  return (
    <>
      <div className="tr-pilha">
        {fs.length === 0 ? (
          <div className="tr-frame livre">
            <div className="tr-frame-chamada">pilha vazia</div>
          </div>
        ) : (
          fs.map((f, i) => (
            <div className={`tr-frame ${f.state}`} key={`${f.call}-${i}`}>
              <div className="tr-frame-chamada">{f.call}</div>
              <div className="tr-frame-pend">{f.pending}</div>
            </div>
          ))
        )}
      </div>
      <div className="tr-chao">{label}</div>
    </>
  );
}

export function TailRecursionVisualizer() {
  const [input, setInput] = useState(DEFAULT_LIST.join(", "));
  const [nums, setNums] = useState<number[]>(DEFAULT_LIST);
  const [preset, setPreset] = useState("encontro");
  const [tco, setTco] = useState(true);

  const stepsA = useMemo(() => generatePlain(nums), [nums]);
  const stepsB = useMemo(() => generateTail(nums, tco), [nums, tco]);

  const total = Math.max(stepsA.length, stepsB.length);
  const n = nums.length;

  const viz = useVisualizer({
    title: "Visualizador · a mesma soma nas duas formas: a pilha que cresce e a que não cresce",
    total,
    speeds: SPEEDS,
    // O que muda a altura: o tamanho da lista e o TCO (sem ele o lado direito
    // empilha igual ao esquerdo). E `total`, que com a lista vazia cai para 1 e
    // apaga contador, rodapé e atalhos de uma vez — cerca de 90px de peça.
    measureOn: [n, tco, total],
  });

  const iA = Math.min(viz.step, stepsA.length - 1);
  const iB = Math.min(viz.step, stepsB.length - 1);
  const a = stepsA[iA];
  const b = stepsB[iB];

  const onInputChange = (v: string) => {
    viz.reset();
    setPreset("");
    setInput(v);
    setNums(parseList(v));
  };
  const applyPreset = (pr: Preset) => {
    viz.reset();
    setPreset(pr.key);
    setInput(pr.nums.join(", "));
    setNums(pr.nums);
  };
  // Math.random só em handler de clique: no render quebraria a hidratação.
  const randomize = () => {
    const size = 3 + Math.floor(Math.random() * 4);
    const arr = Array.from({ length: size }, () => 1 + Math.floor(Math.random() * 12));
    viz.reset();
    setPreset("");
    setInput(arr.join(", "));
    setNums(arr);
  };

  const sum = prefix(nums, n);
  const peakPlain = n + 1;
  const peakTail = tco ? 1 : n + 1;

  // Rastro do acumulador: 0, 1, 3, 6, 10 na lista do encontro. O passo atual do
  // lado direito manda, e na volta (sem TCO) ele fica travado no último.
  const trail = Array.from({ length: n + 1 }, (_, i) => prefix(nums, i));
  const trailIdx = Math.min(iB, n);

  const vars = [
    { name: "acc (cauda)", value: `${trail[trailIdx]}`, best: true },
    { name: "frames · comum", value: `${a.frames.length}` },
    { name: "frames · cauda", value: `${b.frames.length}` },
    { name: "somas · comum", value: `${a.sums} de ${n}` },
    { name: "somas · cauda", value: `${b.sums} de ${n}` },
    { name: "soma(nums)", value: a.ok ? `${sum}` : "...", best: a.ok },
  ];

  const stats = [
    { k: "pa", label: "pico de frames · comum", value: `${peakPlain}` },
    { k: "pb", label: "pico de frames · de cauda", value: `${peakTail}` },
    { k: "ea", label: "espaço extra · comum", value: "O(n)" },
    { k: "eb", label: "espaço extra · de cauda", value: tco ? "O(1)" : "O(n)" },
  ];

  const summary = tco
    ? `A recursão comum chegou a ${framesLabel(peakPlain)}; a de cauda ficou em 1 do começo ao fim. Com uma lista de 1.000 números seriam ${thousands(1001)} frames de um lado e 1 do outro, e o Python nem chegaria lá: ele para com RecursionError, porque o limite padrão é 1.000 chamadas.`
    : `Sem otimização da linguagem os dois lados empilham ${framesLabel(peakPlain)}. A recursão de cauda continua valendo a pena para pensar, e é ela que vira laço na hora de reescrever, mas em Python, Java ou C# ela sozinha não economiza um byte de pilha.`;

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              key={pr.key}
              className={`bigo-chip${preset === pr.key ? " on" : ""}`}
              aria-pressed={preset === pr.key}
              onClick={() => applyPreset(pr)}
            >
              {pr.label}
            </button>
          ))}
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Lista de números</span>
            <input className="viz-input" value={input} onChange={(e) => onInputChange(e.target.value)} />
          </label>
          <button className="viz-btn" onClick={randomize}>
            Sortear
          </button>
        </div>

        <div className="bigo-chips">
          <button
            className={`bigo-chip${tco ? " on" : ""}`}
            aria-pressed={tco}
            onClick={() => {
              viz.reset();
              setTco(true);
            }}
          >
            <span className="sw" style={{ background: tco ? "#34d399" : "#3a4a60" }} />
            Elixir, Scala, Kotlin (com TCO)
          </button>
          <button
            className={`bigo-chip${!tco ? " on" : ""}`}
            aria-pressed={!tco}
            onClick={() => {
              viz.reset();
              setTco(false);
            }}
          >
            <span className="sw" style={{ background: !tco ? "#f87171" : "#3a4a60" }} />
            Python, Java, C# (sem TCO)
          </button>
        </div>

        <div className="tr-duplo">
          <div className="tr-painel">
            <div className="tr-painel-tit">
              <span>1. Recursão comum</span>
              <em>{framesLabel(a.frames.length)}</em>
            </div>
            <Stack frames={a.frames} label="base da pilha" />
            <p className={`viz-note${a.ok ? " ok" : ""}`}>{a.note}</p>
          </div>

          <div className="tr-painel cauda">
            <div className="tr-painel-tit">
              <span>2. Recursão de cauda</span>
              <em>{framesLabel(b.frames.length)}</em>
            </div>
            <Stack frames={b.frames} label="base da pilha" />
            <div className="tr-trilha" aria-label="rastro do acumulador">
              {trail.map((v, i) => (
                <span key={i}>
                  {i > 0 ? <span className="tr-seta">→</span> : null}
                  <span className={`tr-acc${i === trailIdx ? " on" : ""}`}>acc {v}</span>
                </span>
              ))}
            </div>
            <p className={`viz-note${b.ok ? " ok" : ""}`}>{b.note}</p>
          </div>
        </div>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuava com a altura inteira
              do código. O `.viz-code-slot` é o truque de grid 1fr→0fr, a única
              forma de animar altura automática em CSS puro. O código fica no
              DOM mesmo recolhido, e é isso que permite medir o pior caso de
              altura; `inert` tira ele do teclado e dos leitores de tela. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">soma.py</div>
              <div className="viz-code-body">
                {CODE.map((txt, i) => {
                  let cls = "viz-line";
                  if (i === a.line) cls += " on";
                  if (i === b.line) cls += " tr-on-b";
                  return (
                    <div key={i} className={cls}>
                      <span className="ln">{i + 1}</span>
                      {txt}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div {...viz.varsProps}>
            <div className="viz-vars-head">Variáveis</div>
            {vars.map((v) => (
              <div className="viz-var" key={v.name}>
                <span className="viz-var-name">{v.name}</span>
                <span className={`viz-var-val${v.best ? " best" : ""}`}>{v.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bigo-stats">
          {stats.map((s) => (
            <div className="bigo-stat" key={s.k}>
              <span>{s.label}</span>
              <strong>{s.value}</strong>
            </div>
          ))}
        </div>

        <p className="viz-note">{summary}</p>
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );
}
