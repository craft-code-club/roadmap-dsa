"use client";

import { useMemo, useState } from "react";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// BinarioConversor, o número binário como uma soma que dá para ver.
//
// A única coisa que o aluno precisa enxergar é que binário não é um código
// secreto a ser decorado: é **notação posicional**, a mesma coisa que ele já
// faz com o sistema decimal desde a escola, com a base trocada de 10 para 2.
// Por isso a conta aparece por extenso, termo a termo, e cada termo acende ou
// apaga junto com o bit. Uma tabela de conversão ensina a consultar; a soma
// escrita ensina a derivar.
//
// Os bits são botões de verdade (não divs com onClick) porque o aluno precisa
// poder clicar, tabular e usar o teclado, e porque `aria-pressed` já diz o
// estado sem precisar de rótulo extra.
//
// Interativo sem linha do tempo: a variável aqui é o NÚMERO, e uma animação
// sobre oito bits só atrapalharia a experimentação livre, que é o ponto.
// ---------------------------------------------------------------------------

const N = 8;

type Preset = { key: string; label: string; value: number; hint: string };

const PRESETS: Preset[] = [
  {
    key: "fifty",
    label: "53",
    value: 53,
    hint: "Um número qualquer. Repare que os únicos termos que entram na soma são os dos bits ligados: os zeros multiplicam a potência por zero e somem da conta, e é literalmente por isso que eles não valem nada.",
  },
  {
    key: "twoHundred",
    label: "201",
    value: 201,
    hint: "Mais um caso comum. Este é o número que aparece no visualizador seguinte, o das divisões por 2: vale conferir se os dois caminhos chegam ao mesmo lugar.",
  },
  {
    key: "all",
    label: "255, todos os bits ligados",
    value: 255,
    hint: "O teto de um byte. Repare que 255 é 256 menos 1, e não 256: com 8 bits existem 256 combinações, mas uma delas é o zero. A soma 128 + 64 + 32 + 16 + 8 + 4 + 2 + 1 sempre dá um a menos que a próxima potência.",
  },
  {
    key: "power",
    label: "128, um bit só",
    value: 128,
    hint: "Com um único bit ligado, o valor é a própria potência de dois. Ligue o bit da direita em vez do da esquerda e o número cai de 128 para 1: mesma quantidade de bits ligados, valores separados por um fator de 128.",
  },
  {
    key: "none",
    label: "0, nenhum bit",
    value: 0,
    hint: "Todos os bits desligados. Vale reparar que o zero tem uma representação e só uma, o que parece óbvio agora e vai deixar de ser quando os números negativos entrarem.",
  },
];

export function BinarioConversor() {
  const [value, setValue] = useState(53);
  const bits = useMemo(() => Array.from({ length: N }, (_, k) => (value >> (N - 1 - k)) & 1), [value]);

  const viz = useVisualizer({
    title: "Visualizador · o binário é uma soma de potências de dois",
    // A variável é o NÚMERO, não um passo: `total: 1` tira o contador, o rodapé
    // e os atalhos, que aqui não teriam o que dirigir.
    total: 1,
    // Os bits, a conta escrita e os cartões SÃO o conteúdo. Não há bloco
    // dispensável, e inventar um só para ganhar o botão seria rótulo mentindo.
    collapsible: false,
  });

  const toggleBit = (k: number) => setValue((v) => v ^ (1 << (N - 1 - k)));
  const onBits = bits.filter((b) => b === 1).length;
  const terms = bits.map((b, k) => ({ bit: b, exp: N - 1 - k, weight: 1 << (N - 1 - k) })).filter((t) => t.bit === 1);
  const activePreset = PRESETS.find((p) => p.value === value);

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      {/* Sem linha do tempo, o número que resume o estado ocupa o lugar do
          "passo N de M" — com o padrão de bits junto, que é o contexto dele. */}
      <VizHeader viz={viz}>
        <span className="viz-step">
          {bits.join("")} = {value}
        </span>
      </VizHeader>

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((p) => (
            <button
              type="button"
              key={p.key}
              className={`bigo-chip${value === p.value ? " on" : ""}`}
              onClick={() => setValue(p.value)}
              aria-pressed={value === p.value}
            >
              {p.label}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">
          {activePreset
            ? activePreset.hint
            : "Clique nos bits para ligar e desligar. Cada posição vale o dobro da posição à direita dela, e o número é só a soma das posições ligadas."}
        </p>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            Os oito bits <em>clique para ligar e desligar</em>
          </div>
          <div className="bn-fita">
            {bits.map((b, k) => {
              const exp = N - 1 - k;
              return (
                <button
                  type="button"
                  key={k}
                  className={`bn-bit${b ? " on" : ""}`}
                  onClick={() => toggleBit(k)}
                  aria-pressed={b === 1}
                  aria-label={`Bit de expoente ${exp}, valor ${1 << exp}, ${b ? "ligado" : "desligado"}`}
                >
                  <span className="bn-bit-val">{b}</span>
                  <span className="bn-bit-exp">
                    2<sup>{exp}</sup>
                  </span>
                  <span className="bn-bit-peso">{1 << exp}</span>
                </button>
              );
            })}
          </div>
          <p className="bb-array-nota" style={{ marginTop: 8 }}>
            O bit da esquerda é o <strong>mais significativo</strong> e o da direita o <strong>menos
            significativo</strong>, exatamente como a centena e a unidade num número decimal.
          </p>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            A conta, escrita por extenso <em>os bits desligados multiplicam por zero e somem</em>
          </div>
          <p className="bn-conta">
            {terms.length === 0 ? (
              <span className="bn-termo">0</span>
            ) : (
              terms.map((t, k) => (
                <span key={t.exp}>
                  {k > 0 ? <span className="bn-mais"> + </span> : null}
                  <span className="bn-termo">
                    1 x 2<sup>{t.exp}</sup>
                  </span>
                </span>
              ))
            )}
          </p>
          <p className="bn-conta">
            {terms.length === 0 ? (
              <span className="bn-termo">0</span>
            ) : (
              terms.map((t, k) => (
                <span key={t.exp}>
                  {k > 0 ? <span className="bn-mais"> + </span> : null}
                  <span className="bn-termo forte">{t.weight}</span>
                </span>
              ))
            )}
            <span className="bn-igual"> = {value}</span>
          </p>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>valor decimal</span>
            <strong>{value}</strong>
          </div>
          <div className="bigo-stat">
            <span>bits ligados</span>
            <strong>{onBits}</strong>
          </div>
          <div className="bigo-stat">
            <span>combinações com 8 bits</span>
            <strong>256</strong>
          </div>
          <div className="bigo-stat">
            <span>maior valor possível</span>
            <strong>255</strong>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          A mesma ideia vale no decimal: 243 é 2 x 10² + 4 x 10¹ + 3 x 10⁰. Muda a base, e com ela quantos
          símbolos existem por posição. É por isso que aprender binário não é aprender um sistema novo, é
          reconhecer o sistema que você já usa com outra base. Ligue e desligue o bit da esquerda para ver o
          número saltar 128 de uma vez: essa é a diferença entre a posição mais significativa e a menos, e é a
          mesma diferença entre a centena e a unidade.
        </p>
      </div>

      {/* `total: 1` e sem controles próprios: o `VizFooter` some inteiro, e é
          isso que devolve os 4px medidos no §9 do contrato. */}
      <VizFooter viz={viz} />
    </figure>
  );
}
