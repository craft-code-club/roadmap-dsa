"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// BinarioDivisoes, o caminho de volta: de decimal para binário.
//
// A única coisa que o aluno precisa enxergar é POR QUE os restos saem de trás
// para a frente. A regra costuma ser ensinada como um truque ("junte os restos
// de baixo para cima"), e ela é consequência de uma coisa só: a primeira
// divisão pergunta pelo bit menos significativo, porque dividir por 2 é
// deslocar tudo uma casa para a direita e o resto é o que cai fora.
//
// Por isso a fita de bits vai sendo preenchida da DIREITA para a esquerda, ao
// vivo, ao lado da divisão que a produziu. Uma tabela de divisões com uma seta
// dizendo "leia ao contrário" ensina o truque; a fita mostra a razão.
//
// O passo a passo tem linha do tempo porque aqui existe uma sequência de
// verdade, com estado que evolui, ao contrário do conversor ao lado, em que a
// variável é o número.
//
// Altura: esta é uma das poucas peças da série em que o eixo é o DESENHO, e não
// a prosa. A lista de divisões ACUMULA — cada passo acrescenta uma linha sem
// apagar a anterior —, então o `log₂` vira geometria: 36px por linha, medidos.
// A fita tem sempre 8 células (uma linha, 63px, por causa do `Math.max(8, …)`),
// os quatro cartões medem 64px e a dica mede 37px em todos os presets e nas
// três réguas; quem move a peça é o `.bb-passos`, de 27px (nenhuma divisão) a
// 282px (oito). Ver `measureOn`.
//
// O degrau é atravessado pelos presets: 53 dá 6 divisões (210px), 64 dá 7
// (246px) e 201 e 255 dão 8 (282px) — os dois últimos medem igual ao pixel. O
// degrau seguinte abriria em 256, e não há campo numérico livre: os quatro
// chips são o único caminho, então oito linhas é o pior caso alcançável.
//
// E o pico não é o último passo, é o PENÚLTIMO: o estado final tem as mesmas
// oito linhas, mas a nota de fechamento é mais curta que a de uma divisão
// (42px contra 63px), o que devolve 21px.
// ---------------------------------------------------------------------------

type Row = { n: number; quotient: number; remainder: number };

type Step = {
  rows: Row[];
  bits: (number | null)[];
  highlight: number; // índice da linha em foco
  position: number; // posição do bit que acabou de ser escrito
  line: number;
  note: string;
  ok?: boolean;
};

const CODE = [
  "def para_binario(n):",
  "    if n == 0: return '0'",
  "    bits = ''",
  "    while n > 0:",
  "        bits = str(n % 2) + bits   # o resto entra na FRENTE",
  "        n = n // 2                 # e o número encolhe pela metade",
  "    return bits",
];

type Preset = { key: string; label: string; value: number; hint: string };

const PRESETS: Preset[] = [
  {
    key: "mixed",
    label: "201",
    value: 201,
    hint: "Oito divisões para oito bits. Acompanhe a fita da direita: o primeiro resto ocupa a última posição, e não a primeira. É esse detalhe que faz a regra de ler os restos de baixo para cima.",
  },
  {
    key: "sameNumber",
    label: "53",
    value: 53,
    hint: "O mesmo número do visualizador anterior, agora pelo caminho inverso. Se as duas contas fecharem no mesmo 00110101, é porque as duas são a mesma ideia lida em direções opostas.",
  },
  {
    key: "powerOfTwo",
    label: "64, uma potência de dois",
    value: 64,
    hint: "Potência de dois é o caso mais limpo: todas as divisões dão resto zero até a última. Um número com um bit ligado só é um número que se divide por 2 sem sobra até virar 1.",
  },
  {
    key: "allOnes",
    label: "255, todos ímpares",
    value: 255,
    hint: "O oposto: toda divisão sobra 1, então todos os bits saem ligados. Repare que o resto de dividir por 2 é exatamente a pergunta se o número é ímpar, e ímpar em binário é bit da direita ligado.",
  },
];

// Ritmo próprio, 15% a 30% mais rápido que o padrão do hook: cada passo aqui é
// uma divisão, e uma divisão se lê mais depressa que uma troca de array.
const SPEEDS = [0, 1200, 800, 520, 320, 180];

export function generateSteps(value: number): Step[] {
  const width = Math.max(8, value.toString(2).length);
  const out: Step[] = [];
  const rows: Row[] = [];
  const bits: (number | null)[] = new Array(width).fill(null);
  let n = value;
  let pos = width - 1;

  out.push({
    rows: [],
    bits: [...bits],
    highlight: -1,
    position: -1,
    line: 0,
    note: `Vou converter ${value} para binário dividindo por 2 sem parar. Cada divisão responde a uma pergunta só: "sobra alguma coisa?". O resto é o bit, e o quociente é o que ainda falta converter.`,
  });

  if (value === 0) {
    out.push({
      rows: [],
      bits: bits.map(() => 0),
      highlight: -1,
      position: -1,
      line: 1,
      ok: true,
      note: "O zero é o único caso que o laço não trata, porque ele nem chega a rodar. Por isso o código devolve '0' antes de começar.",
    });
    return out;
  }

  while (n > 0) {
    const q = Math.floor(n / 2);
    const r = n % 2;
    rows.push({ n, quotient: q, remainder: r });
    bits[pos] = r;
    out.push({
      rows: [...rows],
      bits: [...bits],
      highlight: rows.length - 1,
      position: pos,
      line: 4,
      note: `${n} dividido por 2 dá ${q} com resto ${r}. ${
        r === 1
          ? `Sobrou 1, ou seja, ${n} é ímpar, e todo número ímpar tem o bit da direita ligado.`
          : `Não sobrou nada, ou seja, ${n} é par, e todo número par tem o bit da direita desligado.`
      } Esse resto vai para a posição ${width - 1 - pos === 0 ? "mais à direita" : `de expoente ${width - 1 - pos}`} da fita, e não para a próxima posição livre da esquerda: cada divisão pergunta por um bit mais significativo que a anterior.`,
    });
    n = q;
    pos--;
  }

  const bin = bits.map((b) => b ?? 0);
  out.push({
    rows: [...rows],
    bits: bin,
    highlight: -1,
    position: -1,
    line: 6,
    ok: true,
    note: `Cheguei a zero, então acabou: ${value} em binário é ${bin.join("")}. Foram ${rows.length} divisões para ${rows.length} bits significativos, e os zeros à esquerda entram só para completar o byte. Conferindo pelo outro caminho: ${bits
      .map((b, k) => (b ? 1 << (width - 1 - k) : 0))
      .filter((x) => x > 0)
      .join(" + ")} = ${value}.`,
  });
  return out;
}

export function BinarioDivisoes() {
  const [presetKey, setPresetKey] = useState("mixed");

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const steps = useMemo(() => generateSteps(preset.value), [preset]);

  const viz = useVisualizer({
    title: "Visualizador · de decimal para binário, dividindo por 2",
    total: steps.length,
    speeds: SPEEDS,
    // A peça sempre abriu em 1.5x; sem isto ela cairia calada para o 1x do hook.
    initialSpeed: 4,
    // O preset é a única entrada do aluno, e aqui ele mexe no DESENHO, não na
    // prosa: a dica mede 37px nos quatro, e a lista de divisões vai de 210px
    // (53, seis divisões) a 282px (201 e 255, oito). São 72px entre presets,
    // dois degraus de 36px cada.
    measureOn: [presetKey],
  });

  const s = steps[viz.step];
  const width = s.bits.length;

  const changePreset = (k: string) => {
    viz.reset();
    setPresetKey(k);
  };

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              type="button"
              key={pr.key}
              className={`bigo-chip${presetKey === pr.key ? " on" : ""}`}
              onClick={() => changePreset(pr.key)}
              aria-pressed={presetKey === pr.key}
            >
              {pr.label}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">{preset.hint}</p>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            A fita de bits <em>preenchida da direita para a esquerda, um por divisão</em>
          </div>
          <div className="bn-fita">
            {/* `estatico`, `on`, `vazio` e `novo` são sufixo de classe do
                `globals.css` (`.bn-bit.estatico` tira o cursor de mão,
                `.bn-bit.novo` dispara a pulsação, e as duas são compartilhadas
                com os visualizadores de binário negativo). Traduzi-los apagaria
                estilo sem o `tsc`, o guarda de idioma ou um teste acusarem. */}
            {s.bits.map((b, k) => (
              <span key={k} className={`bn-bit estatico${b === 1 ? " on" : ""}${b === null ? " vazio" : ""}${k === s.position ? " novo" : ""}`}>
                <span className="bn-bit-val">{b === null ? "?" : b}</span>
                <span className="bn-bit-exp">
                  2<sup>{width - 1 - k}</sup>
                </span>
                <span className="bn-bit-peso">{1 << (width - 1 - k)}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            As divisões <em>o quociente vira a próxima linha, o resto vira um bit</em>
          </div>
          {/* É esta lista que ACUMULA, e é ela o eixo de altura da peça: 36px
              por divisão, de 27px (nenhuma) a 282px (oito). `foco` também é
              classe do `globals.css` (`.bb-passos li.foco`). */}
          <ol className="bb-passos">
            {s.rows.length === 0 ? (
              <li>
                <span>nenhuma divisão ainda</span>
              </li>
            ) : (
              s.rows.map((l, k) => (
                <li key={k} className={k === s.highlight ? "foco" : ""}>
                  <span>
                    {l.n} ÷ 2 = {l.quotient}
                  </span>
                  <b>resto {l.remainder}</b>
                </li>
              ))
            )}
          </ol>
        </div>

        <p className={"viz-note" + (s.ok ? " ok" : "")}>{s.note}</p>

        <div className="viz-split">
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">para_binario.py</div>
              <div className="viz-code-body">
                {CODE.map((txt, k) => (
                  <div key={k} className={`viz-line${k === s.line ? " on" : ""}`}>
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
              <span className="viz-var-name">n (o que falta converter)</span>
              <span className="viz-var-val best">{s.rows.length > 0 ? s.rows[s.rows.length - 1].quotient : preset.value}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">último resto</span>
              <span className="viz-var-val">{s.rows.length > 0 ? s.rows[s.rows.length - 1].remainder : "-"}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">bits já escritos</span>
              <span className="viz-var-val">{s.bits.filter((b) => b !== null).length}</span>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>número de partida</span>
            <strong>{preset.value}</strong>
          </div>
          <div className="bigo-stat">
            <span>divisões feitas</span>
            <strong>{s.rows.length}</strong>
          </div>
          <div className="bigo-stat">
            <span>bits significativos</span>
            <strong>{preset.value.toString(2).length}</strong>
          </div>
          <div className="bigo-stat">
            <span>bits já ligados na fita</span>
            <strong>{s.bits.filter((b) => b === 1).length}</strong>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          O número de divisões é o número de bits significativos, e ele cresce como log₂ do valor: 201 precisa
          de 8 divisões, e 201 mil precisaria de 18. É a mesma razão pela qual a busca binária é barata,
          escrita de outro jeito: dividir por dois repetidamente chega ao fim depressa.
        </p>
      </div>

      <VizFooter viz={viz} />
    </figure>
  );
}
