"use client";

import { useMemo, useState } from "react";

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

type Forma = "sinal" | "um" | "dois";

const NOMES: Record<Forma, string> = {
  sinal: "Sinal e magnitude",
  um: "Complemento de um",
  dois: "Complemento de dois",
};

const COMO: Record<Forma, string> = {
  sinal: "liga o bit da esquerda e deixa o resto como está",
  um: "inverte todos os bits",
  dois: "inverte todos os bits e soma 1",
};

const paraBits = (v: number) => Array.from({ length: N }, (_, k) => (v >> (N - 1 - k)) & 1);
const paraNum = (b: number[]) => b.reduce((acc, x, k) => acc + (x << (N - 1 - k)), 0);

function negar(v: number, forma: Forma): number[] {
  const b = paraBits(v);
  if (forma === "sinal") return [1, ...b.slice(1)];
  const inv = b.map((x) => 1 - x);
  if (forma === "um") return inv;
  return paraBits((paraNum(inv) + 1) & 0xff);
}

// Como cada convenção LÊ um padrão de bits de volta para um número. É a leitura
// que fecha o par com a escrita, e é ela que diz se a convenção é coerente.
function ler(b: number[], forma: Forma): number {
  const semSinal = paraNum(b);
  if (forma === "sinal") return b[0] === 1 ? -(semSinal - 128) : semSinal;
  if (forma === "um") return b[0] === 1 ? -(255 - semSinal) : semSinal;
  return b[0] === 1 ? semSinal - 256 : semSinal;
}

const VALORES = [26, 1, 127, 0];

export function BinarioTresFormas() {
  const [valor, setValor] = useState(26);
  const FORMAS: Forma[] = ["sinal", "um", "dois"];

  const linhas = useMemo(
    () =>
      FORMAS.map((f) => {
        const neg = negar(valor, f);
        const pos = paraBits(valor);
        // teste 1: quantos padrões de bits são lidos como zero
        const zeros = Array.from({ length: 256 }, (_, k) => paraBits(k)).filter((b) => ler(b, f) === 0).length;
        // teste 2: somar os dois padrões (em 8 bits, descartando o vai-um) dá zero?
        const soma = (paraNum(pos) + paraNum(neg)) & 0xff;
        // teste 3: quantos números DISTINTOS os 256 padrões conseguem escrever.
        // Zero duplicado é padrão desperdiçado, e o desperdício aparece aqui.
        const distintos = new Set(Array.from({ length: 256 }, (_, k) => ler(paraBits(k), f))).size;
        const faixa = Array.from({ length: 256 }, (_, k) => ler(paraBits(k), f));
        return { forma: f, pos, neg, zeros, soma, distintos, min: Math.min(...faixa), max: Math.max(...faixa), lido: ler(neg, f) };
      }),
    [valor]
  );

  return (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · três formas de escrever um negativo, e três testes</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">
            {linhas.filter((l) => l.zeros === 1 && l.soma === 0 && l.distintos === 256).length} de 3 passam nos três testes
          </span>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          {VALORES.map((v) => (
            <button key={v} className={`bigo-chip${valor === v ? " on" : ""}`} onClick={() => setValor(v)} aria-pressed={valor === v}>
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
          {linhas.map((l) => {
            const passa = l.zeros === 1 && l.soma === 0 && l.distintos === 256;
            return (
              <div className={`ms-op${passa ? " ok" : " quebrou"}`} key={l.forma}>
                <div className="bb-formula-cab">
                  <span className="bb-formula-tit">{NOMES[l.forma]}</span>
                  <span className="bb-formula-selo">{passa ? "passa nos três" : "reprova"}</span>
                </div>
                <p className="bb-array-nota" style={{ marginBottom: 8 }}>
                  Para negar, {COMO[l.forma]}.
                </p>
                <div className="bn-fita compacta">
                  {l.neg.map((b, k) => (
                    <span key={k} className={`bn-bit estatico${b ? " on" : ""}${k === 0 ? " sinal" : ""}`}>
                      <span className="bn-bit-val">{b}</span>
                    </span>
                  ))}
                </div>
                <p className="bb-formula-fim">
                  Lido de volta: <strong>{l.lido}</strong>
                  {l.lido === -valor ? "" : " (não bate com o esperado)"}
                </p>
                <ol className="bb-passos">
                  <li className={l.zeros === 1 ? "" : "ruim"}>
                    <span>padrões de bits que valem zero</span>
                    <b>{l.zeros}</b>
                  </li>
                  <li className={l.soma === 0 ? "" : "ruim"}>
                    <span>x + (-x) em 8 bits</span>
                    <b>{l.soma}</b>
                  </li>
                  <li className={l.distintos === 256 ? "" : "ruim"}>
                    <span>números distintos nos 256 padrões</span>
                    <b>{l.distintos}</b>
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
    </figure>
  );
}
