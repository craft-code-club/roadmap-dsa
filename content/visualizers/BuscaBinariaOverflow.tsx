"use client";

import { useMemo, useState } from "react";

import { thousandsSigned } from "@/lib/format";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// BuscaBinariaOverflow, o bug que ficou nove anos dentro da biblioteca do Java.
//
// `(esq + dir) // 2` está errado, e não dá para acreditar nisso lendo: o aluno
// precisa ver a soma passar do teto do inteiro e o resultado virar negativo.
// Por isso o componente calcula os 32 bits de verdade (ToInt32 do JavaScript
// faz exatamente a mesma aritmética de complemento de dois que Java e C#) e
// mostra o bit de sinal acendendo.
//
// O seletor de linguagem existe porque a resposta "então é só usar Python" é
// meia verdade: o inteiro do Python não estoura, mas a fórmula segura continua
// sendo a certa, e no momento em que a busca binária deixa de ser sobre índices
// e passa a ser sobre um espaço de respostas (onde os limites podem ser
// qualquer número), o problema volta em qualquer linguagem.
//
// Sobre a casca (contrato em `content/visualizers/README.md`):
//   · `total: 1` — não há linha do tempo. O eixo é a ENTRADA (esq, dir e o tipo
//     do inteiro), não um passo a passo, e o resumo do estado ("as duas
//     concordam" / "as duas discordam") entra como `children` do `VizHeader`.
//   · `collapsible: false` — as duas fórmulas e a fita de bits são o conteúdo,
//     não um bloco dispensável. Sem bloco para recolher, `measureOn` não teria
//     efeito nenhum e fica de fora.
//   · os dois campos numéricos são o motivo de esta peça agradecer o `total: 1`
//     por um segundo caminho: o hook só sequestra seta e espaço quando há linha
//     do tempo, então digitar em `esq` e `dir` dentro do painel continua sendo
//     digitar.
// ---------------------------------------------------------------------------

const INT_MAX = 2147483647;
const INT_MIN = -2147483648;

type Preset = { key: string; rotulo: string; esq: number; dir: number; dica: string };

const PRESETS: Preset[] = [
  {
    key: "normal",
    rotulo: "Índices de um array de exemplo: 0 e 7",
    esq: 0,
    dir: 7,
    dica: "As duas fórmulas dão o mesmo resultado, e é por isso que o bug atravessa todos os testes com arrays pequenos. Nada aqui denuncia o problema.",
  },
  {
    key: "grande",
    rotulo: "Um array de 1 bilhão: 0 e 999.999.999",
    esq: 0,
    dir: 999999999,
    dica: "Ainda cabe. A soma dá 999.999.999, longe do teto de 2.147.483.647. Mas repare que a busca vai estreitar o intervalo, e os dois ponteiros vão subir juntos.",
  },
  {
    key: "bug",
    rotulo: "Alguns passos depois: 1.500.000.000 e 2.000.000.000",
    esq: 1500000000,
    dir: 2000000000,
    dica: "Aqui a conta quebra. Os dois índices são válidos e a soma não é: 3,5 bilhões não cabe num inteiro de 32 bits, o bit de sinal acende e o meio vira negativo.",
  },
  {
    key: "limite",
    rotulo: "O limite exato: 2³⁰ e 2³¹ - 1",
    esq: 1073741824,
    dir: 2147483647,
    dica: "O maior índice possível de um array em Java somado a 2³⁰. Este é o cenário exato descrito por Joshua Bloch quando o bug foi encontrado na própria biblioteca padrão.",
  },
];

// ToInt32: mesma aritmética de complemento de dois de um int de 32 bits.
const int32 = (v: number) => v | 0;
// Java, C# e C truncam em direção ao zero na divisão inteira, ao contrário do
// `//` do Python, que arredonda para baixo. Com valor negativo isso muda o
// resultado, então o truncamento é o comportamento certo a mostrar aqui.
const div2 = (v: number) => Math.trunc(v / 2);

function bits32(v: number): string[] {
  const u = v >>> 0;
  return Array.from({ length: 32 }, (_, i) => ((u >>> (31 - i)) & 1 ? "1" : "0"));
}

export function BuscaBinariaOverflow() {
  const [presetKey, setPresetKey] = useState("bug");
  const [esq, setEsq] = useState(1500000000);
  const [dir, setDir] = useState(2000000000);
  const [limitado, setLimitado] = useState(true);

  const viz = useVisualizer({
    title: "Visualizador · as duas formas de achar o meio, e por que só uma serve",
    total: 1,
    collapsible: false,
  });

  const aplicar = (p: Preset) => {
    setPresetKey(p.key);
    setEsq(p.esq);
    setDir(p.dir);
  };
  const preset = PRESETS.find((p) => p.key === presetKey);

  const conta = useMemo(() => {
    const somaReal = esq + dir;
    const soma = limitado ? int32(somaReal) : somaReal;
    const estourou = limitado && somaReal > INT_MAX;
    const meioIngenuo = div2(soma);
    const dist = dir - esq;
    const meioSeguro = esq + div2(dist);
    return { somaReal, soma, estourou, meioIngenuo, dist, meioSeguro, iguais: meioIngenuo === meioSeguro };
  }, [esq, dir, limitado]);

  const valido = esq >= 0 && dir >= esq;
  const bits = bits32(conta.soma);

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz}>
        <span className="viz-step">{conta.iguais ? "as duas concordam" : "as duas discordam"}</span>
      </VizHeader>

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((p) => (
            <button key={p.key} className={`bigo-chip${presetKey === p.key ? " on" : ""}`} onClick={() => aplicar(p)} aria-pressed={presetKey === p.key}>
              {p.rotulo}
            </button>
          ))}
        </div>

        {preset && <p className="tt-legenda-arvore">{preset.dica}</p>}

        <div className="viz-inputs">
          <label className="viz-field">
            <span>esq</span>
            <input
              className="viz-input"
              style={{ width: 150 }}
              type="number"
              value={esq}
              onChange={(e) => {
                setPresetKey("");
                setEsq(parseInt(e.target.value, 10) || 0);
              }}
            />
          </label>
          <label className="viz-field">
            <span>dir</span>
            <input
              className="viz-input"
              style={{ width: 150 }}
              type="number"
              value={dir}
              onChange={(e) => {
                setPresetKey("");
                setDir(parseInt(e.target.value, 10) || 0);
              }}
            />
          </label>
          <div className="viz-field">
            <span>Tipo do inteiro</span>
            <div className="sub-modo">
              <button className={`sub-modo-btn${limitado ? " on" : ""}`} onClick={() => setLimitado(true)} aria-pressed={limitado}>
                32 bits (Java, C#, Go int32)
              </button>
              <button className={`sub-modo-btn${!limitado ? " on" : ""}`} onClick={() => setLimitado(false)} aria-pressed={!limitado}>
                sem limite (Python)
              </button>
            </div>
          </div>
        </div>

        {!valido && (
          <p className="viz-note invalid">
            Para a busca binária fazer sentido, esq precisa ser maior ou igual a zero e menor ou igual a dir. Ajuste os
            dois campos.
          </p>
        )}

        <div className="bb-formulas">
          <div className={`bb-formula${conta.estourou ? " quebrou" : ""}`}>
            <div className="bb-formula-cab">
              <span className="bb-formula-tit">meio = (esq + dir) // 2</span>
              <span className="bb-formula-selo">{conta.estourou ? "estourou" : "sem estouro aqui"}</span>
            </div>
            <ol className="bb-passos">
              <li>
                <span>esq + dir</span>
                <b>{thousandsSigned(conta.somaReal)}</b>
              </li>
              {conta.estourou && (
                <li className="ruim">
                  <span>não cabe em 32 bits, dá a volta</span>
                  <b>{thousandsSigned(conta.soma)}</b>
                </li>
              )}
              <li className={conta.estourou ? "ruim" : ""}>
                <span>dividido por 2</span>
                <b>{thousandsSigned(conta.meioIngenuo)}</b>
              </li>
            </ol>
            <p className="bb-formula-fim">
              {conta.estourou ? (
                <>
                  Índice <strong>negativo</strong>. Em Java isso é um{" "}
                  <code className="prose-code">ArrayIndexOutOfBoundsException</code>; em C, memória fora do array,
                  que é pior porque não avisa.
                </>
              ) : (
                <>Resultado certo, e é exatamente isso que torna o bug tão difícil de encontrar.</>
              )}
            </p>
          </div>

          <div className="bb-formula ok">
            <div className="bb-formula-cab">
              <span className="bb-formula-tit">meio = esq + (dir - esq) // 2</span>
              <span className="bb-formula-selo">nunca estoura</span>
            </div>
            <ol className="bb-passos">
              <li>
                <span>dir - esq (a distância)</span>
                <b>{thousandsSigned(conta.dist)}</b>
              </li>
              <li>
                <span>dividido por 2 (metade da distância)</span>
                <b>{thousandsSigned(div2(conta.dist))}</b>
              </li>
              <li>
                <span>somado a esq</span>
                <b>{thousandsSigned(conta.meioSeguro)}</b>
              </li>
            </ol>
            <p className="bb-formula-fim">
              A distância entre dois índices válidos nunca é maior que o maior deles, então esta soma não tem
              como passar do teto. Mesma resposta, sem o risco.
            </p>
          </div>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            {limitado ? (
              <>
                Os 32 bits de esq + dir <em>o primeiro bit é o sinal</em>
              </>
            ) : (
              <>Inteiro sem limite</>
            )}
          </div>
          {limitado ? (
            <>
              <div className="bb-bits">
                {bits.map((b, i) => (
                  <span key={i} className={`bb-bit${b === "1" ? " on" : ""}${i === 0 ? " sinal" : ""}${i % 8 === 7 && i !== 31 ? " grupo" : ""}`}>
                    {b}
                  </span>
                ))}
              </div>
              <p className="bb-array-nota">
                {conta.estourou
                  ? "O bit de sinal acendeu. Em complemento de dois, o bit mais à esquerda ligado não quer dizer valor grande, quer dizer valor negativo: a conta deu a volta e voltou pelo outro extremo do intervalo."
                  : "Bit de sinal apagado: o número é positivo e a conta está correta. Aumente esq e dir até a soma passar de 2.147.483.647 e veja o primeiro bit acender."}
              </p>
            </>
          ) : (
            <p className="bb-array-nota">
              O inteiro do Python cresce até onde a memória aguentar, então não existe largura fixa para
              desenhar nem bit de sinal para estourar: as duas fórmulas sempre concordam. Isso resolve o
              sintoma nesta linguagem, não o hábito. Volte para 32 bits e veja o que o mesmo código faz em
              Java, C# ou Go.
            </p>
          )}
        </div>

        <p className={`viz-note${conta.iguais ? " ok" : " invalid"}`}>
          {conta.iguais ? (
            <>
              As duas fórmulas devolveram <strong>{thousandsSigned(conta.meioSeguro)}</strong>. Com estes valores não há
              diferença nenhuma, e é por isso que o bug sobreviveu por quase uma década dentro do{" "}
              <code className="prose-code">java.util.Arrays</code>: nenhum teste com array de tamanho
              razoável consegue expô-lo.
            </>
          ) : (
            <>
              Mesma entrada, respostas diferentes: a fórmula ingênua devolveu{" "}
              <strong>{thousandsSigned(conta.meioIngenuo)}</strong> e a segura devolveu{" "}
              <strong>{thousandsSigned(conta.meioSeguro)}</strong>. As duas são matematicamente equivalentes; o que separa
              elas é que só uma sobrevive ao tipo de dado.
            </>
          )}
        </p>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>teto do int de 32 bits</span>
            <strong>{thousandsSigned(INT_MAX)}</strong>
          </div>
          <div className="bigo-stat">
            <span>piso do int de 32 bits</span>
            <strong>{thousandsSigned(INT_MIN)}</strong>
          </div>
          <div className="bigo-stat">
            <span>folga até o teto</span>
            <strong>{!limitado ? "não se aplica" : conta.estourou ? "estourada" : thousandsSigned(INT_MAX - conta.somaReal)}</strong>
          </div>
          <div className="bigo-stat">
            <span>array mínimo para quebrar</span>
            <strong>2³⁰ posições</strong>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          &quot;Preciso de um array com um bilhão de posições para isso me afetar&quot; vale só enquanto esq e
          dir forem índices. No momento em que a busca binária passa a procurar sobre um espaço de respostas,
          os limites viram números do domínio do problema (uma capacidade, um prazo, um orçamento) e podem ser
          enormes desde a primeira linha. A fórmula segura custa a mesma coisa: use ela sempre.
        </p>
      </div>

      {/* Sem linha do tempo e sem botões extras, o `VizFooter` não desenha nada. */}
      <VizFooter viz={viz} />
    </figure>
  );
}
