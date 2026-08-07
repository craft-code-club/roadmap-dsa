"use client";

import { useMemo, useState } from "react";

import { thousands } from "@/lib/format";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// RecursionVisualizer, a pilha de chamadas.
//
// Mesmo padrão dos outros visualizadores (gerador puro de passos + a casca
// compartilhada), só que no lugar das células de um array o palco é a call
// stack: cada chamada empilha um frame com o SEU próprio n, o caso base
// devolve o primeiro valor concreto, e os valores sobem de volta resolvendo a
// operação que ficou pendurada em cada frame.
//
// Três modos, porque são três lições diferentes sobre a mesma pilha:
//   - clássico: a multiplicação fica pendente e só resolve na subida
//   - cauda: o acumulador desce pronto, nada fica pendente na volta
//   - caso base inalcançável: existe caso base, mas o estado anda para longe
//
// O "limite da pilha" é um campo editável de propósito. O limite real do
// CPython é 1000 e não caberia na tela, mas a lição é a mesma: estourar não é
// só "esquecer o caso base", é passar da profundidade que a linguagem aguenta.
// Com limite 6, fatorial(10) estoura igualzinho.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

// Os valores são também nomes de classe do CSS (`.rec-frame.ativo` e companhia,
// em `globals.css`), então eles NÃO acompanham a tradução dos identificadores:
// renomeá-los pediria editar uma folha de estilo compartilhada com o
// NAryTreeVisualizer.
type FrameState = "espera" | "ativo" | "base" | "volta" | "estoura";

type Frame = {
  id: number;
  level: number;
  n: number;
  label: string;
  pending?: string;
  ret?: string;
  state: FrameState;
  isNew?: boolean;
};

type Var = { name: string; value: string; best?: boolean };

type Step = {
  line: number;
  frames: Frame[];
  calls: number;
  maxDepth: number;
  note: string;
  vars: Var[];
  ok?: boolean;
  done?: boolean;
  error?: boolean;
};

// As linhas mapeiam 1:1 com o campo `line` de cada passo do gerador do modo,
// então a ordem e a quantidade de linhas não podem mudar sem ajustar o gerador.
const CLASSIC = [
  "def fatorial(n):",
  "    if n <= 1:",
  "        return 1",
  "    resultado = fatorial(n - 1)",
  "    return n * resultado",
];

const TAIL = [
  "def fatorial(n, acc=1):",
  "    if n <= 1:",
  "        return acc",
  "    return fatorial(n - 1, acc * n)",
];

const UNREACHABLE = [
  "def contagem(n):",
  "    if n == 0:",
  "        return",
  "    print(n)",
  "    return contagem(n + 1)",
];

function factorialOf(n: number): number {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

// --------------------------------------------------------------------------
// Modo clássico: a operação pendente é o coração da coisa. Cada frame guarda
// "n × ?" enquanto espera, e é isso que impede a pilha de encolher antes da
// hora.
// --------------------------------------------------------------------------
function generateClassic(n0: number, limit: number): Step[] {
  const out: Step[] = [];
  const frames: Frame[] = [];
  let calls = 0;
  let maxDepth = 0;
  let id = 0;

  const snap = (newId?: number) => frames.map((f) => ({ ...f, isNew: f.id === newId }));
  const vars = (top: string, returned: string): Var[] => [
    { name: "n (frame do topo)", value: top },
    { name: "valor devolvido", value: returned },
    { name: "frames na pilha", value: `${frames.length}` },
    { name: "chamadas", value: `${calls}`, best: true },
  ];
  const emit = (
    line: number,
    note: string,
    top: string,
    returned: string,
    extra?: Partial<Step>,
    newId?: number
  ) => {
    out.push({ line, frames: snap(newId), calls, maxDepth, note, vars: vars(top, returned), ...extra });
  };

  let k = n0;
  let guard = 0;
  let overflowed = false;

  while (guard++ < 40) {
    const mine = id++;
    frames.push({ id: mine, level: frames.length + 1, n: k, label: `fatorial(n=${k})`, state: "ativo" });
    calls++;

    if (frames.length > limit) {
      frames[frames.length - 1].state = "estoura";
      emit(
        0,
        `Tentei abrir o frame ${frames.length} e o limite da pilha é ${limit}: RecursionError, maximum recursion depth exceeded. Nenhuma resposta voltou, porque nenhuma chamada chegou ao caso base antes do teto.`,
        `${k}`,
        "-",
        { done: true, error: true },
        mine
      );
      overflowed = true;
      break;
    }
    maxDepth = Math.max(maxDepth, frames.length);

    emit(
      0,
      `Entro em fatorial(${k}). Um frame novo vai para o topo da pilha, com um n = ${k} que é só dele: o n dos frames de baixo continua intacto.`,
      `${k}`,
      "-",
      undefined,
      mine
    );

    if (k <= 1) {
      emit(1, `n = ${k} bate no caso base. Esta eu respondo sozinha, sem chamar mais ninguém.`, `${k}`, "-");
      frames[frames.length - 1].state = "base";
      frames[frames.length - 1].ret = "1";
      emit(2, `Devolvo 1. É a primeira resposta concreta da execução inteira, e é dela que todas as outras vão nascer.`, `${k}`, "1");
      break;
    }

    emit(1, `n = ${k} não é 0 nem 1, então não tenho a resposta na mão: preciso quebrar em um problema menor.`, `${k}`, "-");
    frames[frames.length - 1].state = "espera";
    frames[frames.length - 1].pending = `${k} × ?`;
    emit(
      3,
      `Chamo fatorial(${k - 1}). A multiplicação por ${k} fica pendurada neste frame: enquanto a resposta de baixo não chegar, este frame não pode sair da pilha.`,
      `${k}`,
      "-"
    );
    k--;
  }

  if (overflowed) return out;

  // Subida: cada frame recebe o valor de baixo, resolve a multiplicação que
  // estava pendente e sai da pilha.
  let value = 1;
  frames.pop();
  while (frames.length > 0 && guard++ < 80) {
    const top = frames[frames.length - 1];
    const next = top.n * value;
    top.state = "volta";
    top.pending = undefined;
    top.ret = thousands(next);
    emit(
      4,
      `fatorial(${top.n}) recebe ${thousands(value)} de baixo, resolve a conta que estava pendurada, ${top.n} × ${thousands(value)} = ${thousands(next)}, e devolve. O frame sai da pilha e a memória dele é liberada.`,
      `${top.n}`,
      thousands(next)
    );
    value = next;
    frames.pop();
  }

  out.push({
    line: 4,
    frames: [],
    calls,
    maxDepth,
    note: `A pilha voltou a ficar vazia: fatorial(${n0}) = ${thousands(value)}. Deu ${calls} ${calls === 1 ? "chamada" : "chamadas"} no total e, no pico, ${maxDepth} ${maxDepth === 1 ? "frame vivo" : "frames vivos"} ao mesmo tempo. Esse pico é a complexidade de espaço da recursão: O(n).`,
    vars: [
      { name: "n (frame do topo)", value: "-" },
      { name: "valor devolvido", value: thousands(value) },
      { name: "frames na pilha", value: "0" },
      { name: "chamadas", value: `${calls}`, best: true },
    ],
    ok: true,
    done: true,
  });
  return out;
}

// --------------------------------------------------------------------------
// Modo cauda: o acumulador desce pronto. Na subida não sobra nenhuma conta, e
// é exatamente esse "nada pendente" que abre espaço para a otimização de
// chamada final nas linguagens que a fazem.
// --------------------------------------------------------------------------
function generateTail(n0: number, limit: number): Step[] {
  const out: Step[] = [];
  const frames: Frame[] = [];
  let calls = 0;
  let maxDepth = 0;
  let id = 0;

  const snap = (newId?: number) => frames.map((f) => ({ ...f, isNew: f.id === newId }));
  const vars = (top: string, acc: string, returned: string): Var[] => [
    { name: "n (frame do topo)", value: top },
    { name: "acc", value: acc },
    { name: "valor devolvido", value: returned },
    { name: "chamadas", value: `${calls}`, best: true },
  ];
  const emit = (
    line: number,
    note: string,
    top: string,
    acc: string,
    returned: string,
    extra?: Partial<Step>,
    newId?: number
  ) => {
    out.push({ line, frames: snap(newId), calls, maxDepth, note, vars: vars(top, acc, returned), ...extra });
  };

  let k = n0;
  let acc = 1;
  let guard = 0;
  let overflowed = false;

  while (guard++ < 40) {
    const mine = id++;
    frames.push({ id: mine, level: frames.length + 1, n: k, label: `fatorial(n=${k}, acc=${thousands(acc)})`, state: "ativo" });
    calls++;

    if (frames.length > limit) {
      frames[frames.length - 1].state = "estoura";
      emit(
        0,
        `Tentei abrir o frame ${frames.length} e o limite da pilha é ${limit}: RecursionError. Sem otimização de chamada final, a recursão de cauda empilha exatamente igual à clássica.`,
        `${k}`,
        thousands(acc),
        "-",
        { done: true, error: true },
        mine
      );
      overflowed = true;
      break;
    }
    maxDepth = Math.max(maxDepth, frames.length);

    emit(
      0,
      `Entro em fatorial(${k}, acc=${thousands(acc)}). Repare que o trabalho já vem feito de cima: o acumulador carrega tudo o que foi multiplicado até aqui.`,
      `${k}`,
      thousands(acc),
      "-",
      undefined,
      mine
    );

    if (k <= 1) {
      emit(1, `n = ${k} bate no caso base.`, `${k}`, thousands(acc), "-");
      frames[frames.length - 1].state = "base";
      frames[frames.length - 1].ret = thousands(acc);
      emit(
        2,
        `Devolvo o acumulador: ${thousands(acc)}. A resposta final já estava pronta ANTES da volta começar, ninguém precisa calcular mais nada na subida.`,
        `${k}`,
        thousands(acc),
        thousands(acc)
      );
      break;
    }

    emit(1, `n = ${k} ainda não é caso base.`, `${k}`, thousands(acc), "-");
    const next = acc * k;
    frames[frames.length - 1].state = "espera";
    frames[frames.length - 1].pending = "nada pendente";
    emit(
      3,
      `Chamo fatorial(${k - 1}, ${thousands(acc)} × ${k} = ${thousands(next)}). A chamada é a ÚLTIMA operação da função: depois dela não sobra nenhuma conta neste frame.`,
      `${k}`,
      thousands(acc),
      "-"
    );
    acc = next;
    k--;
  }

  if (overflowed) return out;

  const result = acc;
  frames.pop();
  while (frames.length > 0 && guard++ < 80) {
    const top = frames[frames.length - 1];
    top.state = "volta";
    top.pending = undefined;
    top.ret = thousands(result);
    emit(
      3,
      `O frame de fatorial(${top.n}, ...) recebe ${thousands(result)} e só repassa, porque não tinha nada pendente. Este frame ficou vivo à toa: é justamente ele que a otimização de chamada final sabe reaproveitar.`,
      `${top.n}`,
      thousands(acc),
      thousands(result)
    );
    frames.pop();
  }

  out.push({
    line: 2,
    frames: [],
    calls,
    maxDepth,
    note: `fatorial(${n0}) = ${thousands(result)} com ${calls} ${calls === 1 ? "chamada" : "chamadas"} e pico de ${maxDepth} ${maxDepth === 1 ? "frame" : "frames"}: os mesmos números do modo clássico. Em Python o custo é idêntico, o ganho da cauda só aparece em linguagem que faz a otimização.`,
    vars: [
      { name: "n (frame do topo)", value: "-" },
      { name: "acc", value: thousands(result) },
      { name: "valor devolvido", value: thousands(result) },
      { name: "chamadas", value: `${calls}`, best: true },
    ],
    ok: true,
    done: true,
  });
  return out;
}

// --------------------------------------------------------------------------
// Modo caso base inalcançável: o caso base EXISTE, o que falha é a regra 2. O
// estado anda, mas para o lado errado, e a pilha cresce até o teto.
// --------------------------------------------------------------------------
function generateUnreachable(n0: number, limit: number): Step[] {
  const out: Step[] = [];
  const frames: Frame[] = [];
  let calls = 0;
  let maxDepth = 0;
  let id = 0;

  const snap = (newId?: number) => frames.map((f) => ({ ...f, isNew: f.id === newId }));
  const emit = (line: number, note: string, top: string, extra?: Partial<Step>, newId?: number) => {
    out.push({
      line,
      frames: snap(newId),
      calls,
      maxDepth,
      note,
      vars: [
        { name: "n (frame do topo)", value: top },
        { name: "caso base", value: "n == 0" },
        { name: "frames na pilha", value: `${frames.length}` },
        { name: "chamadas", value: `${calls}`, best: true },
      ],
      ...extra,
    });
  };

  let k = n0;
  let guard = 0;
  while (guard++ < 40) {
    const mine = id++;
    frames.push({ id: mine, level: frames.length + 1, n: k, label: `contagem(n=${k})`, state: "ativo" });
    calls++;

    if (frames.length > limit) {
      frames[frames.length - 1].state = "estoura";
      emit(
        4,
        `Frame ${frames.length} com o limite em ${limit}: RecursionError, maximum recursion depth exceeded. O caso base n == 0 existe e está escrito ali, mas eu comecei em ${n0} e ando para cima: cada chamada me deixa mais longe dele, não mais perto.`,
        `${k}`,
        { done: true, error: true },
        mine
      );
      return out;
    }
    maxDepth = Math.max(maxDepth, frames.length);

    emit(0, `Entro em contagem(${k}). Mais um frame no topo, mais um escopo vivo na memória.`, `${k}`, undefined, mine);
    emit(1, `Testo o caso base: ${k} == 0? Não. Então sigo.`, `${k}`);
    emit(3, `Imprimo ${k} e vou em frente.`, `${k}`);
    frames[frames.length - 1].state = "espera";
    frames[frames.length - 1].pending = "nunca resolve";
    emit(
      4,
      `Chamo contagem(${k + 1}). O estado muda a cada chamada, que é a regra 2, mas muda para o lado errado: de ${k} para ${k + 1}, sempre se afastando do zero.`,
      `${k}`
    );
    k++;
  }
  return out;
}

type Mode = {
  key: string;
  label: string;
  file: string;
  code: string[];
  nLabel: string;
  nMin: number;
  nMax: number;
  generate: (n: number, limit: number) => Step[];
};

const MODES: Mode[] = [
  { key: "classico", label: "fatorial clássico", file: "fatorial.py", code: CLASSIC, nLabel: "n", nMin: 0, nMax: 12, generate: generateClassic },
  { key: "cauda", label: "fatorial em cauda", file: "fatorial_cauda.py", code: TAIL, nLabel: "n", nMin: 0, nMax: 12, generate: generateTail },
  { key: "inalcancavel", label: "caso base inalcançável", file: "contagem.py", code: UNREACHABLE, nLabel: "começa em", nMin: 1, nMax: 12, generate: generateUnreachable },
];

type Preset = { key: string; label: string; mode: string; n: number; limit: number };

const PRESETS: Preset[] = [
  { key: "cinco", label: "fatorial(5): o clássico", mode: "classico", n: 5, limit: 12 },
  { key: "base", label: "fatorial(1): caso base de cara", mode: "classico", n: 1, limit: 12 },
  { key: "cauda", label: "fatorial(5) em cauda", mode: "cauda", n: 5, limit: 12 },
  { key: "fundo", label: "fatorial(10) com limite 6", mode: "classico", n: 10, limit: 6 },
  { key: "solto", label: "caso base fora de alcance", mode: "inalcancavel", n: 1, limit: 6 },
];

export function RecursionVisualizer() {
  const [modeIndex, setModeIndex] = useState(0);
  const [n, setN] = useState(5);
  const [limit, setLimit] = useState(12);
  const [preset, setPreset] = useState("cinco");

  const mode = MODES[modeIndex];
  const steps = useMemo(() => mode.generate(n, limit), [mode, n, limit]);

  const viz = useVisualizer({
    title: "Visualizador · a pilha de chamadas: empilha na descida, resolve na subida",
    total: steps.length,
    // O que muda a altura da peça: o modo (o código vai de 4 a 5 linhas e o
    // painel de variáveis troca de conteúdo) e, sobretudo, quantos frames cabem
    // na pilha — que é o produto de `n` com `limit`. O eixo que vira ALTURA
    // aqui é a FILEIRA de frames, não o valor de n: com `limit` em 3 a peça
    // mede 956px e com `limit` em 12 mede 1379px, com o mesmo n.
    measureOn: [modeIndex, n, limit],
  });

  const p = steps[viz.step];

  const pickMode = (i: number) => {
    viz.reset();
    setPreset("");
    setModeIndex(i);
    setN((v) => Math.min(MODES[i].nMax, Math.max(MODES[i].nMin, v)));
  };
  const onChangeN = (v: string) => {
    const x = parseInt(v, 10);
    viz.reset();
    setPreset("");
    setN(isNaN(x) ? mode.nMin : Math.min(mode.nMax, Math.max(mode.nMin, x)));
  };
  const onChangeLimit = (v: string) => {
    const x = parseInt(v, 10);
    viz.reset();
    setPreset("");
    setLimit(isNaN(x) ? 3 : Math.min(12, Math.max(3, x)));
  };
  const applyPreset = (pr: Preset) => {
    viz.reset();
    setPreset(pr.key);
    setModeIndex(MODES.findIndex((m) => m.key === pr.mode));
    setN(pr.n);
    setLimit(pr.limit);
  };

  const frames = [...p.frames].reverse(); // topo da pilha em cima
  const noteClass = "viz-note" + (p.ok ? " ok" : p.error ? " invalid" : "");

  // A execução chega a devolver alguma coisa? Se ela estoura na pilha, mostrar
  // "fatorial(10) = 3.628.800" no painel seria mentira: aquele valor nunca
  // voltou. Nesse caso o card diz o que de fato aconteceu.
  const overflowed = steps[steps.length - 1].error === true;
  const expected = mode.key === "inalcancavel" || overflowed ? null : factorialOf(n);

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              key={pr.key}
              className={`bigo-chip${preset === pr.key ? " on" : ""}`}
              onClick={() => applyPreset(pr)}
              aria-pressed={preset === pr.key}
            >
              {pr.label}
            </button>
          ))}
        </div>

        <div className="viz-inputs">
          <div className="viz-field">
            <span>Função</span>
            <div className="sub-modo">
              {MODES.map((m, i) => (
                <button
                  key={m.key}
                  className={`sub-modo-btn${i === modeIndex ? " on" : ""}`}
                  onClick={() => pickMode(i)}
                  aria-pressed={i === modeIndex}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <label className="viz-field">
            <span>{mode.nLabel}</span>
            <input className="viz-input k" type="number" min={mode.nMin} max={mode.nMax} value={n} onChange={(e) => onChangeN(e.target.value)} />
          </label>
          <label className="viz-field">
            <span>limite da pilha</span>
            <input className="viz-input k" type="number" min={3} max={12} value={limit} onChange={(e) => onChangeLimit(e.target.value)} />
          </label>
        </div>

        <div className="rec-stack-lbl">
          <span>Call stack{frames.length > 0 ? " · topo em cima" : ""}</span>
          <span>{frames.length} de {limit} frames</span>
        </div>
        <div className="rec-stack">
          {frames.length === 0 ? (
            <div className="rec-stack-vazia">pilha vazia</div>
          ) : (
            frames.map((f, i) => (
              <div key={f.id} className={`rec-frame ${f.state}${f.isNew ? " novo" : ""}`}>
                <span className="rec-frame-nome">{f.label}</span>
                {f.pending ? <span className="rec-frame-pend">{f.pending}</span> : null}
                {f.ret ? <span className="rec-frame-ret">devolve {f.ret}</span> : null}
                <span className="rec-frame-tag">{i === 0 ? "topo" : `nível ${f.level}`}</span>
              </div>
            ))
          )}
          {p.error ? <div className="rec-limite">limite da pilha: {limit} frames</div> : null}
        </div>

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com a altura inteira
              do código. O `.viz-code-slot` é o truque de grid 1fr→0fr, a única
              forma de animar altura automática em CSS puro. O código fica no
              DOM mesmo recolhido, e é isso que permite medir o pior caso;
              `inert` tira ele do teclado e dos leitores de tela enquanto está
              fora de vista. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">{mode.file}</div>
              <div className="viz-code-body">
                {mode.code.map((txt, i) => (
                  <div key={i} className={`viz-line${i === p.line ? " on" : ""}`}>
                    <span className="ln">{i + 1}</span>
                    {txt}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div {...viz.varsProps}>
            <div className="viz-vars-head">Variáveis</div>
            {p.vars.map((v) => (
              <div className="viz-var" key={v.name}>
                <span className="viz-var-name">{v.name}</span>
                <span className={`viz-var-val${v.best ? " best" : ""}`}>{v.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>chamadas feitas</span>
            <strong>{thousands(p.calls)}</strong>
          </div>
          <div className="bigo-stat">
            <span>pico de frames</span>
            <strong>{thousands(p.maxDepth)}</strong>
          </div>
          <div className="bigo-stat">
            <span>memória da pilha</span>
            <strong>O(n)</strong>
          </div>
          <div className="bigo-stat">
            <span>{expected === null ? "resposta" : `fatorial(${n})`}</span>
            <strong>{expected === null ? (overflowed ? "estourou" : "nunca chega") : thousands(expected)}</strong>
          </div>
        </div>
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(frame);
}
