"use client";

import { useMemo, useState } from "react";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// BinarioFaixa, o mesmo padrão de bits lido de dois jeitos.
//
// A única coisa que o aluno precisa enxergar é que **o padrão de bits não sabe
// o próprio sinal**. 11111111 é 255 ou -1 conforme o tipo com que você o lê, e
// não existe nada guardado na memória que decida entre os dois: quem decide é a
// declaração da variável. Por isso as duas leituras aparecem lado a lado, do
// mesmo padrão, o tempo todo.
//
// A segunda ideia é o truque de leitura que dispensa a conta de inverter e
// somar: no complemento de dois, o bit da esquerda vale MENOS 128 em vez de
// mais 128, e o resto continua igual. Com isso, ler um negativo vira a mesma
// soma de sempre, com um termo negativo. Por isso a decomposição escrita
// aparece com o sinal de menos no primeiro termo, e não como uma regra à parte.
//
// O passo a passo pelos padrões vizinhos existe por causa da fronteira: andar
// de 01111111 para 10000000 é somar 1 e cair de 127 para -128, e ver isso
// acontecer é o que torna o estouro de inteiro concreto em vez de folclórico.
// ---------------------------------------------------------------------------

const N = 8;

const toBits = (v: number) => Array.from({ length: N }, (_, k) => (v >> (N - 1 - k)) & 1);
const asSigned = (v: number) => (v >= 128 ? v - 256 : v);

type Milestone = { value: number; label: string; note: string };

const MILESTONES: Milestone[] = [
  {
    value: 0,
    label: "00000000",
    note: "O zero, e ele é o mesmo nos dois mundos. É o único padrão em que as duas leituras coincidem por definição, e não por acaso.",
  },
  {
    value: 1,
    label: "00000001",
    note: "Um bit ligado, o da direita. Com o bit de sinal desligado, as duas leituras continuam iguais, e vão continuar assim em toda a metade de baixo da tabela.",
  },
  {
    value: 127,
    label: "01111111",
    note: "O último padrão em que as duas leituras coincidem: 127 nos dois. Some 1 e veja o que acontece, porque é aqui que mora o estouro de inteiro com sinal.",
  },
  {
    value: 128,
    label: "10000000",
    note: "O salto. Somar 1 a 127 acende o bit de sinal, e a leitura com sinal desaba de 127 para -128. Nenhum erro é reportado: para a máquina isso é só o padrão seguinte. Este é o estouro de inteiro que derruba sistema de verdade.",
  },
  {
    value: 129,
    label: "10000001",
    note: "Continuando a partir do fundo: com o bit de sinal ligado, acender bits à direita SOMA. -128 + 1 = -127, e daqui até 11111111 os números negativos vão subindo até chegar a -1.",
  },
  {
    value: 255,
    label: "11111111",
    note: "Todos os bits ligados. É 255 sem sinal e -1 com sinal, e as duas coisas são verdade ao mesmo tempo: o padrão é o mesmo, o que muda é o tipo com que ele é lido.",
  },
];

const TYPES = [
  { bits: 8, unsigned: "0 a 255", signed: "-128 a 127" },
  { bits: 16, unsigned: "0 a 65.535", signed: "-32.768 a 32.767" },
  { bits: 32, unsigned: "0 a 4.294.967.295", signed: "-2.147.483.648 a 2.147.483.647" },
  { bits: 64, unsigned: "0 a mais de 18 quintilhões", signed: "cerca de -9,2 a 9,2 quintilhões" },
];

export function BinarioFaixa() {
  const [value, setValue] = useState(128);
  const bits = useMemo(() => toBits(value), [value]);
  const milestone = MILESTONES.find((m) => m.value === value);
  const signed = asSigned(value);

  const viz = useVisualizer({
    title: "Visualizador · o mesmo padrão, duas leituras",
    // Andar pelos padrões vizinhos é um ciclo de 256 estados sem começo nem
    // fim, não uma linha do tempo: `total: 1` tira contador, atalhos e barra,
    // e os dois botões que andam ficam no rodapé, parados no painel.
    total: 1,
    // A fita, as duas leituras e a tabela SÃO o conteúdo: não há bloco
    // dispensável para recolher.
    collapsible: false,
  });

  // A decomposição com o peso do bit de sinal negativo: é a regra de leitura
  // inteira do complemento de dois, escrita como soma.
  const terms = bits
    .map((b, k) => ({ b, weight: k === 0 ? -128 : 1 << (N - 1 - k) }))
    .filter((t) => t.b === 1);

  const walk = (d: number) => setValue((v) => (v + d + 256) % 256);

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      {/* Sem linha do tempo, o padrão e as duas leituras dele ocupam o lugar do
          "passo N de M", com os rótulos junto dos números. */}
      <VizHeader viz={viz}>
        <span className="viz-step">
          {bits.join("")} · sem sinal {value} · com sinal {signed}
        </span>
      </VizHeader>

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {MILESTONES.map((m) => (
            <button
              key={m.value}
              className={`bigo-chip${value === m.value ? " on" : ""}`}
              onClick={() => setValue(m.value)}
              aria-pressed={value === m.value}
            >
              {m.label}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">
          {milestone
            ? milestone.note
            : "Use os botões de menos 1 e mais 1 para andar pelos padrões vizinhos e acompanhar as duas leituras."}
        </p>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            O padrão de bits <em>o bit da esquerda vale -128, e é só isso que muda na leitura com sinal</em>
          </div>
          <div className="bn-fita">
            {bits.map((b, k) => (
              <span key={k} className={`bn-bit estatico${b ? " on" : ""}${k === 0 ? " sinal" : ""}`}>
                <span className="bn-bit-val">{b}</span>
                <span className="bn-bit-exp">
                  {k === 0 ? (
                    "sinal"
                  ) : (
                    <>
                      2<sup>{N - 1 - k}</sup>
                    </>
                  )}
                </span>
                <span className="bn-bit-peso">{k === 0 ? "-128" : 1 << (N - 1 - k)}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Os dois cards ficam neutros de propósito. Nenhuma das duas leituras é
            errada: o mesmo padrão vale 255 ou -1 conforme o tipo, e pintar a
            leitura com sinal de vermelho quando o bit de sinal acende diria o
            contrário do que o texto ao lado afirma. */}
        <div className="ms-operadores">
          <div className="ms-op">
            <div className="bb-formula-cab">
              <span className="bb-formula-tit">Lido como sem sinal</span>
              <span className="bb-formula-selo">byte, uint8</span>
            </div>
            <p className="bn-conta">
              {bits.every((b) => b === 0) ? (
                <span className="bn-termo forte">0</span>
              ) : (
                bits
                  .map((b, k) => ({ b, weight: 1 << (N - 1 - k) }))
                  .filter((t) => t.b === 1)
                  .map((t, k) => (
                    <span key={t.weight}>
                      {k > 0 ? <span className="bn-mais"> + </span> : null}
                      <span className="bn-termo forte">{t.weight}</span>
                    </span>
                  ))
              )}
              <span className="bn-igual"> = {value}</span>
            </p>
            <p className="bb-formula-fim">Todos os oito bits valem magnitude. A faixa vai de 0 a 255.</p>
          </div>
          <div className="ms-op">
            <div className="bb-formula-cab">
              <span className="bb-formula-tit">Lido como com sinal</span>
              <span className="bb-formula-selo">sbyte, int8</span>
            </div>
            <p className="bn-conta">
              {terms.length === 0 ? (
                <span className="bn-termo forte">0</span>
              ) : (
                terms.map((t, k) => (
                  <span key={t.weight}>
                    {k > 0 ? <span className="bn-mais"> + </span> : null}
                    <span className={`bn-termo forte${t.weight < 0 ? " negativo" : ""}`}>{t.weight}</span>
                  </span>
                ))
              )}
              <span className="bn-igual"> = {signed}</span>
            </p>
            <p className="bb-formula-fim">
              O bit da esquerda vale <strong>-128</strong> em vez de +128. Todo o resto da conta é idêntico, e é
              por isso que não existe uma "regra de ler negativo": existe um peso negativo.
            </p>
          </div>
        </div>

        <p className={`viz-note${value === 128 ? " invalid" : " ok"}`}>
          {value === 128 ? (
            <>
              Este é o padrão da virada. Vindo de <strong>01111111</strong> (127) e somando 1, o vai-um sobe até
              o bit de sinal e o número desaba para <strong>-128</strong>. Nenhuma exceção é lançada e nenhum
              aviso aparece: para a máquina isso é só o padrão de bits seguinte. É exatamente esse silêncio que
              torna o estouro de inteiro com sinal um dos erros mais difíceis de achar depois que acontece.
            </>
          ) : (
            <>
              O padrão <strong>{bits.join("")}</strong> vale <strong>{value}</strong> lido como byte sem sinal e{" "}
              <strong>{signed}</strong> lido como byte com sinal. Os dois números estão certos: nada na
              memória diz qual é o correto, quem decide é o tipo declarado na variável. Um valor lido com o tipo
              errado não dá erro, dá outro número.
            </>
          )}
        </p>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            As faixas por tamanho <em>com e sem sinal, o mesmo número de padrões</em>
          </div>
          <div className="bigo-fam-scroll">
            <table className="bigo-fam-table">
              <thead>
                <tr>
                  <th>bits</th>
                  <th>sem sinal</th>
                  <th>com sinal</th>
                </tr>
              </thead>
              <tbody>
                {TYPES.map((t) => (
                  <tr key={t.bits} className={t.bits === 8 ? "hp-destaque" : ""}>
                    <td>
                      <div className="bigo-fam-not hp-nome">{t.bits}</div>
                    </td>
                    <td>
                      <span className="bn-escrita">{t.unsigned}</span>
                    </td>
                    <td>
                      <span className="bn-escrita">{t.signed}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Repare que a faixa com sinal nunca é simétrica: com 8 bits vai de -128 a 127, e não de -128 a 128. O
          motivo não é arbitrário: são 256 padrões e o zero ocupa um deles, então sobram 255 para distribuir
          entre positivos e negativos, e o lado negativo fica com um a mais porque não precisa gastar padrão com
          o zero. Essa assimetria é a razão de `-Integer.MIN_VALUE` continuar negativo em Java e de
          `abs(-2147483648)` devolver um número negativo em C: não existe o positivo correspondente.
        </p>
      </div>

      {/* Os dois botões que andam pelos padrões são o que faz esta peça se
          mexer, e por isso vão para o `.viz-foot`: fora do `.viz-body`, ficam
          parados no pé do painel enquanto o miolo rola. Dentro do miolo eles
          saíam de vista quando o aluno chegava à tabela do fim — medido, com o
          miolo rolado até o fim: 358px ACIMA do topo visível a 390x844, e
          apenas 15px de folga a 1440x700. A legenda vem junto, então a linha
          continua se explicando sozinha onde quer que esteja. */}
      <VizFooter viz={viz}>
        <div className="bn-passeio">
          <button className="viz-btn" onClick={() => walk(-1)} aria-label="Padrão anterior">
            ‹ menos 1
          </button>
          <span className="bn-passeio-txt">andar pelos padrões vizinhos</span>
          <button className="viz-btn" onClick={() => walk(1)} aria-label="Próximo padrão">
            mais 1 ›
          </button>
        </div>
      </VizFooter>
    </figure>
  );
}
