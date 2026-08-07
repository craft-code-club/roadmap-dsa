"use client";

import { useMemo, useState } from "react";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// BinarioTresFormas, por que o complemento de dois venceu.
//
// A única coisa que o aluno precisa enxergar é que as três convenções não são
// alternativas de gosto: duas delas têm um defeito concreto e nomeável, e a
// terceira não tem. Por isso a tela não é uma tabela comparativa com colunas de
// prós e contras; ela é um teste, aplicado às três, com o resultado calculado.
//
// Os três testes são os que decidiram a história: existe mais de uma forma de
// escrever zero? somar o número com o oposto dele dá zero? e quantos números
// distintos os 256 padrões conseguem escrever? Sinal-magnitude e complemento de
// um reprovam nos três; complemento de dois passa nos três. Nada disso é
// opinião, e por isso tudo aqui é computado sobre os 256 padrões.
//
// Interativo sem linha do tempo: a variável é o número, e as três convenções
// respondem juntas.
// ---------------------------------------------------------------------------

const N = 8;

// Os três valores da união nunca chegam à tela: eles indexam `NAMES` e `HOW`, e
// viram `key` de lista. Ficam em português de propósito — `"sinal"` também é
// classe do `.bn-bit` neste mesmo arquivo, e trocar um dos dois papéis pede a
// reação que re-quebra o outro (contrato §0, "literal com dois papéis").
type Form = "sinal" | "um" | "dois";

const NAMES: Record<Form, string> = {
  sinal: "Sinal e magnitude",
  um: "Complemento de um",
  dois: "Complemento de dois",
};

const HOW: Record<Form, string> = {
  sinal: "liga o bit da esquerda e deixa o resto como está",
  um: "inverte todos os bits",
  dois: "inverte todos os bits e soma 1",
};

const toBits = (v: number) => Array.from({ length: N }, (_, k) => (v >> (N - 1 - k)) & 1);
const toNumber = (b: number[]) => b.reduce((acc, x, k) => acc + (x << (N - 1 - k)), 0);

function negate(v: number, form: Form): number[] {
  const b = toBits(v);
  if (form === "sinal") return [1, ...b.slice(1)];
  const inv = b.map((x) => 1 - x);
  if (form === "um") return inv;
  return toBits((toNumber(inv) + 1) & 0xff);
}

// Como cada convenção LÊ um padrão de bits de volta para um número. É a leitura
// que fecha o par com a escrita, e é ela que diz se a convenção é coerente.
function read(b: number[], form: Form): number {
  const unsigned = toNumber(b);
  if (form === "sinal") return b[0] === 1 ? -(unsigned - 128) : unsigned;
  if (form === "um") return b[0] === 1 ? -(255 - unsigned) : unsigned;
  return b[0] === 1 ? unsigned - 256 : unsigned;
}

const VALUES = [26, 1, 127, 0];

export function BinarioTresFormas() {
  const [value, setValue] = useState(26);
  const FORMS: Form[] = ["sinal", "um", "dois"];

  const viz = useVisualizer({
    title: "Visualizador · três formas de escrever um negativo, e três testes",
    // As três convenções respondem juntas ao número escolhido: não há linha do
    // tempo para o rodapé dirigir, e `total: 1` tira contador, atalhos e barra.
    total: 1,
    // Os três cartões SÃO o conteúdo; não há bloco dispensável para recolher.
    collapsible: false,
  });

  const rows = useMemo(
    () =>
      FORMS.map((f) => {
        const neg = negate(value, f);
        const pos = toBits(value);
        // teste 1: quantos padrões de bits são lidos como zero
        const zeros = Array.from({ length: 256 }, (_, k) => toBits(k)).filter((b) => read(b, f) === 0).length;
        // teste 2: somar os dois padrões (em 8 bits, descartando o vai-um) dá zero?
        const sum = (toNumber(pos) + toNumber(neg)) & 0xff;
        // teste 3: quantos números DISTINTOS os 256 padrões conseguem escrever.
        // Zero duplicado é padrão desperdiçado, e o desperdício aparece aqui.
        const distinct = new Set(Array.from({ length: 256 }, (_, k) => read(toBits(k), f))).size;
        const range = Array.from({ length: 256 }, (_, k) => read(toBits(k), f));
        return { form: f, pos, neg, zeros, sum, distinct, min: Math.min(...range), max: Math.max(...range), readBack: read(neg, f) };
      }),
    [value]
  );

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      {/* Sem linha do tempo, o placar dos três testes ocupa o lugar do
          "passo N de M" — com o rótulo junto, porque o número sozinho não diz
          de que ele fala. */}
      <VizHeader viz={viz}>
        <span className="viz-step">
          {rows.filter((l) => l.zeros === 1 && l.sum === 0 && l.distinct === 256).length} de 3 passam nos três testes
        </span>
      </VizHeader>

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {VALUES.map((v) => (
            <button key={v} className={`bigo-chip${value === v ? " on" : ""}`} onClick={() => setValue(v)} aria-pressed={value === v}>
              negar {v}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">
          Todas as três resolvem o problema de escrever um número negativo sem inventar um símbolo de menos:
          elas sacrificam o bit da esquerda, que deixa de valer magnitude e passa a valer sinal. A diferença
          está no que acontece com o zero e com a aritmética, e é isso que os três testes medem: quantos
          padrões de bits valem zero, se somar um número com o oposto dá zero, e quantos números distintos os
          256 padrões conseguem escrever.
        </p>

        <div className="ms-operadores">
          {rows.map((l) => {
            const passes = l.zeros === 1 && l.sum === 0 && l.distinct === 256;
            return (
              <div className={`ms-op${passes ? " ok" : " quebrou"}`} key={l.form}>
                <div className="bb-formula-cab">
                  <span className="bb-formula-tit">{NAMES[l.form]}</span>
                  <span className="bb-formula-selo">{passes ? "passa nos três" : "reprova"}</span>
                </div>
                <p className="bb-array-nota" style={{ marginBottom: 8 }}>
                  Para negar, {HOW[l.form]}.
                </p>
                <div className="bn-fita compacta">
                  {l.neg.map((b, k) => (
                    <span key={k} className={`bn-bit estatico${b ? " on" : ""}${k === 0 ? " sinal" : ""}`}>
                      <span className="bn-bit-val">{b}</span>
                    </span>
                  ))}
                </div>
                <p className="bb-formula-fim">
                  Lido de volta: <strong>{l.readBack}</strong>
                  {l.readBack === -value ? "" : " (não bate com o esperado)"}
                </p>
                <ol className="bb-passos">
                  <li className={l.zeros === 1 ? "" : "ruim"}>
                    <span>padrões de bits que valem zero</span>
                    <b>{l.zeros}</b>
                  </li>
                  <li className={l.sum === 0 ? "" : "ruim"}>
                    <span>x + (-x) em 8 bits</span>
                    <b>{l.sum}</b>
                  </li>
                  <li className={l.distinct === 256 ? "" : "ruim"}>
                    <span>números distintos nos 256 padrões</span>
                    <b>{l.distinct}</b>
                  </li>
                  <li>
                    <span>faixa que ela alcança</span>
                    <b>
                      {l.min} a {l.max}
                    </b>
                  </li>
                </ol>
              </div>
            );
          })}
        </div>

        <p className="viz-note ok">
          O primeiro teste é o do <strong>zero duplo</strong>. Em sinal e magnitude, 00000000 e 10000000 são os
          dois lidos como zero; em complemento de um, 00000000 e 11111111. Ter duas escritas para o mesmo
          número obriga toda comparação de igualdade a tratar um caso especial, e desperdiça um dos 256
          padrões disponíveis. Só o complemento de dois tem um zero e um só.
          <br />
          <br />O segundo é o da <strong>aritmética</strong>. Somar um número com o oposto dele tem que dar
          zero, e é isso que permite ao processador subtrair usando o mesmo circuito que soma. No complemento
          de dois isso vale sempre, com o vai-um final estourando os oito bits e sendo descartado. Nas outras
          duas não vale, e a máquina precisaria de correções extras.
        </p>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Vale registrar o preço que as três pagam igual: com o bit da esquerda reservado para o sinal, sobram
          sete bits de magnitude, e o alcance sai de 0 a 255 para algo em torno de -128 a 127. E vale reparar
          numa consequência do zero duplo que passa despercebida: com 256 padrões de bits, sinal-magnitude e
          complemento de um escrevem só <strong>255 números distintos</strong>, porque dois padrões dizem a
          mesma coisa. O complemento de dois escreve 256, e é por isso que a faixa dele é -128 a 127, assimétrica
          de propósito.
        </p>
      </div>

      {/* `total: 1` e sem controles próprios: o `VizFooter` some inteiro. */}
      <VizFooter viz={viz} />
    </figure>
  );
}
