"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// BinarioComplemento, os dois passos que viram o sinal.
//
// A única coisa que o aluno precisa enxergar é que "inverter e somar 1" não é
// uma receita arbitrária: ela é a única operação que faz x + (-x) dar zero
// dentro de uma quantidade fixa de bits. Por isso o visualizador não para na
// conversão: ele termina somando o número com o oposto dele, bit a bit, e
// mostrando o vai-um saindo pela esquerda e sendo descartado.
//
// A soma aparece dígito a dígito, da direita para a esquerda, porque o vai-um é
// exatamente o mesmo mecanismo da soma decimal que a pessoa aprendeu na escola,
// só que com dois símbolos em vez de dez. Mostrar o carry andando é o que liga
// as duas coisas.
//
// Os presets incluem os dois casos que quebram a intuição: o zero (que prova a
// ausência de ambiguidade, porque o vai-um estoura e some) e o 128, cujo oposto
// é ele mesmo. Preset que só mostra o caso bonito ensina a receita, não a
// regra.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
//
// Sobre a altura: a largura da palavra é constante (`N = 8`) e não há controle
// nenhum que a alcance, então a fita de bits nunca é eixo de altura. O que move
// a peça são os dois blocos CONDICIONAIS — a linha do vai-um e o painel da
// prova —, que não crescem: eles aparecem. Medido a 1512x900, no fluxo do
// artigo: 919px sem os dois, 945 com o vai-um, 1089 com a prova junto. Os 170px
// de amplitude são inteiramente deles.
// ---------------------------------------------------------------------------

const N = 8;

type Step = {
  bits: number[];
  highlight: number;
  carry: number[]; // vai-um por posição, -1 quando não se aplica
  phase: "start" | "invert" | "add" | "done" | "proof";
  sum: number[] | null; // resultado da prova x + (-x)
  line: number;
  note: string;
  ok?: boolean;
};

const CODE = [
  "# complemento de dois, em 8 bits",
  "positivo = 0b00011010            # 26",
  "invertido = ~positivo & 0xFF     # 1. inverte todos",
  "negativo  = (invertido + 1) & 0xFF  # 2. soma 1",
  "",
  "# a prova: somar os dois tem que dar zero",
  "(positivo + negativo) & 0xFF     # o vai-um cai fora",
];

type Preset = { key: string; label: string; value: number; hint: string };

const PRESETS: Preset[] = [
  {
    key: "twentysix",
    label: "26",
    value: 26,
    hint: "O caso comum. Acompanhe os dois passos e depois a prova: somar 26 com o resultado tem que dar zero em oito bits, senão a representação não serviria para o processador fazer subtração somando.",
  },
  {
    key: "one",
    label: "1",
    value: 1,
    hint: "O menor caso, e o mais revelador: o oposto de 1 é 11111111, ou seja, todos os bits ligados. Faz sentido, porque somar 1 a 11111111 dá zero com um vai-um que cai fora.",
  },
  {
    key: "maxpositive",
    label: "127, o maior positivo",
    value: 127,
    hint: "O teto do lado positivo com 8 bits. Repare que o resultado, 10000001, tem o bit de sinal ligado e é lido como -127. Um a mais no positivo já não caberia: 128 não existe no tipo com sinal.",
  },
  {
    key: "zero",
    label: "0, o teste da ambiguidade",
    value: 0,
    hint: "Aqui está o motivo de o complemento de dois ter vencido. Inverter dá 11111111, somar 1 estoura e volta a 00000000: o oposto de zero é o próprio zero, e existe UMA representação só. Nas outras duas convenções existem duas, e a máquina precisa decidir o que fazer com a segunda.",
  },
  {
    key: "selfopposite",
    label: "128, o que é o próprio oposto",
    value: 128,
    hint: "O caso que quebra a simetria. O complemento de dois de 10000000 é 10000000: ele é o oposto de si mesmo. Por isso a faixa com sinal vai de -128 a 127, e não de -127 a 127: o -128 existe e o +128 não.",
  },
];

// Ritmo próprio: um bit invertido pede menos tempo que uma troca de array.
const SPEEDS = [0, 1400, 900, 600, 380, 220];
// A marcha em que a peça já vinha (o "1.5x"), preservada pelo `initialSpeed`.
const INITIAL_SPEED = 4;

const toBits = (v: number) => Array.from({ length: N }, (_, k) => (v >> (N - 1 - k)) & 1);
const toNumber = (b: number[]) => b.reduce((acc, x, k) => acc + (x << (N - 1 - k)), 0);
const toSigned = (b: number[]) => (b[0] === 1 ? toNumber(b) - 256 : toNumber(b));

/** A fita de oito células. `signMark` troca o expoente do bit da esquerda pelo papel dele. */
function BitStrip({ bits, highlight, signMark }: { bits: number[]; highlight: number; signMark?: boolean }) {
  return (
    <div className="bn-fita">
      {bits.map((b, k) => (
        // `estatico`, `on`, `novo` e `sinal` são classes do CSS (bloco `.bn-bit`
        // do `globals.css`), não identificadores deste arquivo: ficam como estão.
        <span key={k} className={`bn-bit estatico${b ? " on" : ""}${k === highlight ? " novo" : ""}${k === 0 ? " sinal" : ""}`}>
          <span className="bn-bit-val">{b}</span>
          <span className="bn-bit-exp">
            {k === 0 && signMark ? (
              "sinal"
            ) : (
              <>
                2<sup>{N - 1 - k}</sup>
              </>
            )}
          </span>
          <span className="bn-bit-peso">{k === 0 && signMark ? "-128" : 1 << (N - 1 - k)}</span>
        </span>
      ))}
    </div>
  );
}

export function generateSteps(value: number): Step[] {
  const out: Step[] = [];
  const start = toBits(value);
  const noCarry = new Array(N).fill(-1);

  out.push({
    bits: [...start],
    highlight: -1,
    carry: noCarry,
    phase: "start",
    sum: null,
    line: 1,
    note: `Ponto de partida: ${value} em oito bits é ${start.join("")}. O objetivo é achar a representação de -${value} sem inventar um símbolo de menos, usando só os mesmos oito bits.`,
  });

  // ---- passo 1: inverter -----------------------------------------------
  const inverted: number[] = start.map((b) => (b === 1 ? 0 : 1));
  for (let k = 0; k < N; k++) {
    const partial = start.map((b, i) => (i <= k ? (b === 1 ? 0 : 1) : b));
    out.push({
      bits: partial,
      highlight: k,
      carry: noCarry,
      phase: "invert",
      sum: null,
      line: 2,
      note: `Passo 1, inverter: o bit de expoente ${N - 1 - k} era ${start[k]} e vira ${1 - start[k]}. Isto sozinho é o complemento de UM, e ele já quase funciona: o problema dele é que sobra um zero a mais.`,
    });
  }

  // ---- passo 2: somar 1 -------------------------------------------------
  const result = [...inverted];
  const carry = new Array(N).fill(-1);
  let carryIn = 1;
  for (let k = N - 1; k >= 0; k--) {
    const digit = result[k] + carryIn;
    const bit = digit % 2;
    const carryOut = digit > 1 ? 1 : 0;
    carry[k] = carryOut;
    result[k] = bit;
    out.push({
      bits: [...result],
      highlight: k,
      carry: [...carry],
      phase: "add",
      sum: null,
      line: 3,
      note:
        carryIn === 0
          ? `Não há mais vai-um, então os bits à esquerda ficam como estão. A soma acabou de fato aqui.`
          : `Passo 2, somar 1: nesta posição tenho ${inverted[k]} + ${carryIn}. ${
              digit > 1
                ? `Em binário 1 + 1 é 0 e vai um, exatamente como 5 + 5 é 0 e vai um no decimal. Escrevo ${bit} e levo o vai-um para a esquerda.`
                : `Dá ${bit}, sem vai-um, e a propagação para aqui.`
            }`,
    });
    carryIn = carryOut;
    if (carryIn === 0) {
      // os bits restantes não mudam; um passo só resume isso
      break;
    }
  }

  const finalValue = toSigned(result);
  out.push({
    bits: [...result],
    highlight: -1,
    carry: noCarry,
    phase: "done",
    sum: null,
    line: 3,
    ok: true,
    note: `Pronto: ${result.join("")}. Lendo com o truque do peso negativo, o bit da esquerda vale -128 em vez de +128, então isto é ${result
      .map((b, k) => (b === 1 ? (k === 0 ? -128 : 1 << (N - 1 - k)) : 0))
      .filter((x) => x !== 0)
      .join(" + ")
      .replace(/\+ -/g, "- ")} = ${finalValue}.`,
  });

  // ---- a prova: x + (-x) --------------------------------------------------
  const sum: number[] = new Array(N).fill(0);
  const proofCarry = new Array(N).fill(-1);
  let proofCarryIn = 0;
  for (let k = N - 1; k >= 0; k--) {
    const digit = start[k] + result[k] + proofCarryIn;
    sum[k] = digit % 2;
    proofCarry[k] = digit > 1 ? 1 : 0;
    proofCarryIn = digit > 1 ? 1 : 0;
  }
  out.push({
    bits: [...result],
    highlight: -1,
    carry: proofCarry,
    phase: "proof",
    sum: [...sum],
    line: 6,
    ok: true,
    note: `A prova: ${start.join("")} + ${result.join("")} = ${sum.join("")}${
      proofCarryIn === 1
        ? `, com um vai-um sobrando na ponta esquerda. Esse nono bit não cabe em oito, então o tipo simplesmente o descarta, e o que fica é zero. Não é um acidente conveniente: é o motivo de a convenção ser esta, porque assim o processador subtrai somando, sem nenhum circuito a mais.`
        : `. Somar um número com o oposto dele dá zero, que é a definição de oposto.`
    }`,
  });

  return out;
}

export function BinarioComplemento() {
  const [presetKey, setPresetKey] = useState("twentysix");

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const steps = useMemo(() => generateSteps(preset.value), [preset]);
  const startBits = useMemo(() => toBits(preset.value), [preset]);

  const viz = useVisualizer({
    title: "Visualizador · complemento de dois: inverter e somar 1",
    total: steps.length,
    speeds: SPEEDS,
    initialSpeed: INITIAL_SPEED,
    // O preset é o único controle da peça: ele troca a dica (a de maior está
    // 3 linhas acima da menor) e o número de passos. A largura da palavra é
    // constante, então a fita não entra na conta.
    measureOn: [presetKey],
  });

  const p = steps[viz.step];

  const pickPreset = (k: string) => {
    viz.reset();
    setPresetKey(k);
  };

  const phaseLabel =
    p.phase === "invert" ? "1 · inverter todos os bits" : p.phase === "add" ? "2 · somar 1" : p.phase === "proof" ? "a prova: x + (-x)" : p.phase === "done" ? "resultado" : "início";

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              type="button"
              key={pr.key}
              className={`bigo-chip${presetKey === pr.key ? " on" : ""}`}
              onClick={() => pickPreset(pr.key)}
              aria-pressed={presetKey === pr.key}
            >
              {pr.label}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">{preset.hint}</p>

        {/* `f-fim` e `f-ordenar` são classes do bloco `.hs-fase` no `globals.css`:
            literais crus que nada mais aponta, e trocá-los apaga a cor da faixa
            sem quebrar o build. Ficam em português de propósito. */}
        <div className={`hs-fase ${p.phase === "proof" || p.phase === "done" ? "f-fim" : p.phase === "add" ? "f-ordenar" : ""}`}>
          <span className="hs-fase-selo">{phaseLabel}</span>
          <span className="hs-fase-txt">
            {preset.value} · em construção: {p.bits.join("")} ({toSigned(p.bits)} lido com sinal)
          </span>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            O positivo de partida <em>o bit da esquerda desligado quer dizer positivo</em>
          </div>
          <BitStrip bits={startBits} highlight={-1} />
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            Em construção <em>{p.phase === "add" ? "somando 1, com o vai-um andando para a esquerda" : "invertendo bit a bit"}</em>
          </div>
          <BitStrip bits={p.bits} highlight={p.highlight} signMark />
          {p.carry.some((c) => c >= 0) ? (
            <div className="bn-carrys">
              {p.carry.map((c, k) => (
                <span key={k} className={`bn-carry${c === 1 ? " on" : ""}`}>
                  {c === 1 ? "1" : c === 0 ? "0" : ""}
                </span>
              ))}
              <span className="bn-carry-rot">vai-um</span>
            </div>
          ) : null}
        </div>

        {p.sum ? (
          <div className="hp-bloco">
            <div className="tt-painel-tit">
              A prova <em>somar o número com o oposto dele</em>
            </div>
            <BitStrip bits={p.sum} highlight={-1} />
          </div>
        ) : null}

        <p className={"viz-note" + (p.ok ? " ok" : "")}>{p.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com a altura inteira
              do código (contrato §7). O código fica no DOM mesmo recolhido, que
              é o que permite medir o pior caso; `inert` o tira do teclado. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">complemento.py</div>
              <div className="viz-code-body">
                {CODE.map((txt, k) => (
                  <div key={k} className={`viz-line${k === p.line ? " on" : ""}`}>
                    <span className="ln">{k + 1}</span>
                    {txt}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div {...viz.varsProps}>
            <div className="viz-vars-head">Variáveis</div>
            <div className="viz-var">
              <span className="viz-var-name">positivo</span>
              <span className="viz-var-val best">{preset.value}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">em construção (sem sinal)</span>
              <span className="viz-var-val">{toNumber(p.bits)}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">em construção (com sinal)</span>
              <span className="viz-var-val">{toSigned(p.bits)}</span>
            </div>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Rode o preset do zero até o fim: inverter dá 11111111, somar 1 estoura para 00000000, e o oposto de
          zero é o próprio zero. É esse resultado, e só ele, que elimina a ambiguidade das outras duas
          convenções. Depois rode o 128 e repare que ele é o oposto de si mesmo: é por isso que a faixa com
          sinal vai de -128 a 127 e não é simétrica.
        </p>
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(frame);
}
