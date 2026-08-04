"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

import { LinhaDoTempo, axisFor, fmtIv } from "./IntervalsLinhaDoTempo";
import type { Interval, TimelineRow } from "./IntervalsLinhaDoTempo";

// ---------------------------------------------------------------------------
// IntervalsSobreposicaoVisualizer, o laboratório da condição de sobreposição.
//
// É o átomo do tópico: antes de fundir, inserir ou contar qualquer coisa, o
// aluno precisa saber decidir se DOIS intervalos se tocam. Aqui A fica parado
// e B desliza por cima dele, um instante por passo, passando por todas as
// posições relativas possíveis (antes, encostando, invadindo, contido,
// contendo, depois). O ▶ Rodar faz B atravessar A de ponta a ponta.
//
// O botão de bordas troca o modelo de intervalo entre fechado [inicio, fim] e
// meio aberto [inicio, fim), que é onde mora quase todo erro de borda: em
// [1, 3] e [3, 5], fechado diz que se tocam e meio aberto diz que não.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type Vars = { name: string; value: string; best?: boolean }[];

type Check = { title: string; body: string; ok: boolean };

type Step = {
  line: number;
  b: Interval;
  overlaps: boolean;
  relation: string;
  intersection: Interval | null;
  union: Interval | null;
  note: string;
  checks: Check[];
  vars: Vars;
};

function codeFor(closed: boolean): string[] {
  return closed
    ? [
        "def sobrepoe(a, b):",
        "    if b[0] > a[1]:",
        "        return False   # b comeca depois de a acabar",
        "    if a[0] > b[1]:",
        "        return False   # a comeca depois de b acabar",
        "    return True        # sobra pelo menos um ponto em comum",
      ]
    : [
        "def sobrepoe(a, b):    # bordas [inicio, fim)",
        "    if b[0] >= a[1]:",
        "        return False   # b comeca quando a ja acabou",
        "    if a[0] >= b[1]:",
        "        return False   # a comeca quando b ja acabou",
        "    return True        # existe um pedaco de tempo em comum",
      ];
}

function relationBetween(a: Interval, b: Interval, closed: boolean): string {
  const [aStart, aEnd] = a;
  const [bStart, bEnd] = b;
  const touches = (t: number, where: string) =>
    closed
      ? `B encosta no ${where} de A: o instante ${t} é o único ponto em comum`
      : `B encosta no ${where} de A, e com bordas [início, fim) encostar não é sobrepor`;
  if (bStart === aStart && bEnd === aEnd) return "A e B são exatamente o mesmo intervalo";
  if (bEnd < aStart) return "B termina antes de A começar";
  if (bEnd === aStart) return touches(aStart, "início");
  if (bStart > aEnd) return "B começa depois de A terminar";
  if (bStart === aEnd) return touches(aEnd, "fim");
  if (bStart <= aStart && bEnd >= aEnd) return "B contém A inteiro";
  if (bStart >= aStart && bEnd <= aEnd) return "A contém B inteiro";
  if (bStart < aStart) return "B invade A pela esquerda";
  return "B invade A pela direita";
}

function generateSteps(a: Interval, lenB: number, closed: boolean, bMax: number): Step[] {
  const [aStart, aEnd] = a;
  const op = closed ? ">" : ">=";
  const out: Step[] = [];

  for (let t = 0; t <= bMax; t++) {
    const b: Interval = [t, t + lenB];
    const [bStart, bEnd] = b;
    const after = closed ? bStart > aEnd : bStart >= aEnd;
    const before = closed ? aStart > bEnd : aStart >= bEnd;
    const overlaps = !after && !before;

    const maxStart = Math.max(aStart, bStart);
    const minEnd = Math.min(aEnd, bEnd);
    const intersection: Interval | null = overlaps ? [maxStart, minEnd] : null;
    const union: Interval | null = overlaps ? [Math.min(aStart, bStart), Math.max(aEnd, bEnd)] : null;
    const relation = relationBetween(a, b, closed);

    const checks: Check[] = [
      {
        title: `b[0] ${op} a[1]`,
        body: `${bStart} ${op} ${aEnd} é ${after ? "verdadeiro" : "falso"}: B ${after ? "começa depois de A acabar" : "não começa depois de A acabar"}.`,
        ok: !after,
      },
      {
        title: `a[0] ${op} b[1]`,
        body: `${aStart} ${op} ${bEnd} é ${before ? "verdadeiro" : "falso"}: A ${before ? "começa depois de B acabar" : "não começa depois de B acabar"}.`,
        ok: !before,
      },
      {
        title: "[max(inícios), min(fins)]",
        body: overlaps
          ? `[${maxStart}, ${minEnd}] é a interseção, com ${minEnd - maxStart} de duração.`
          : `[${maxStart}, ${minEnd}] tem início maior que fim, então a interseção é vazia.`,
        ok: overlaps,
      },
    ];

    let note: string;
    if (after) {
      note = `B começa em ${bStart} e A termina em ${aEnd}. Como ${bStart} ${op} ${aEnd}, saio no primeiro teste com False: nem preciso olhar o resto.`;
    } else if (before) {
      note = `A começa em ${aStart} e B termina em ${bEnd}. Como ${aStart} ${op} ${bEnd}, B já tinha acabado quando A nasceu. False.`;
    } else if (intersection && intersection[0] === intersection[1]) {
      note = `Passei nos dois testes por um fio: A e B dividem só o instante ${intersection[0]}, uma interseção de duração zero. Fundidos, eles viram ${fmtIv(union)}.`;
    } else {
      note = `Passei nos dois testes: A e B dividem ${fmtIv(intersection)}. Se eu fosse fundir os dois, o resultado seria ${fmtIv(union)}, que é [min dos inícios, max dos fins].`;
    }

    out.push({
      line: after ? 2 : before ? 4 : 5,
      b,
      overlaps,
      relation,
      intersection,
      union,
      note,
      checks,
      vars: [
        { name: "a", value: fmtIv(a) },
        { name: "b", value: fmtIv(b) },
        { name: "max(inicios)", value: `${maxStart}` },
        { name: "min(fins)", value: `${minEnd}` },
        { name: "sobrepoe", value: overlaps ? "True" : "False", best: overlaps },
      ],
    });
  }
  return out;
}

// Ritmo próprio: B desliza um instante por passo, e um instante pede menos
// tempo de leitura que uma varredura inteira de intervalos.
const SPEEDS = [0, 900, 620, 420, 280, 160];

const DEFAULT_A: Interval = [6, 12];
const DEFAULT_LEN_B = 4;
// A peça abre com B já invadindo A: em t = 0 os dois nem se tocam, e abrir num
// caso sem sobreposição num visualizador sobre sobreposição ensina ao contrário.
const INITIAL_STEP = 4;

export function IntervalsSobreposicaoVisualizer() {
  const [aStart, setAStart] = useState(DEFAULT_A[0]);
  const [aEnd, setAEnd] = useState(DEFAULT_A[1]);
  const [lenB, setLenB] = useState(DEFAULT_LEN_B);
  const [closed, setClosed] = useState(true);

  const a = useMemo<Interval>(() => [Math.min(aStart, aEnd), Math.max(aStart, aEnd)], [aStart, aEnd]);
  // Teto de passos: sem ele, um "A termina" digitado com muitos zeros geraria
  // dezenas de milhares de passos e travaria a aba.
  const bMax = useMemo(() => Math.min(60, Math.max(a[1] + 3, a[0] + lenB + 3)), [a, lenB]);
  const steps = useMemo(() => generateSteps(a, lenB, closed, bMax), [a, lenB, closed, bMax]);
  const code = useMemo(() => codeFor(closed), [closed]);

  const viz = useVisualizer({
    title: "Visualizador · quando dois intervalos se sobrepõem",
    total: steps.length,
    speeds: SPEEDS,
    // O que mexe na altura: o modelo de borda (troca o cabeçalho do código e o
    // texto do veredito) e os três números da entrada, que mudam quantos passos
    // existem e quanto texto o veredito e a nota ocupam.
    measureOn: [closed, aStart, aEnd, lenB],
  });

  // Ajuste na fase de render, e não num efeito: assim ele acontece antes da
  // pintura E dentro do build estático, e o HTML pré-renderizado já sai no
  // passo certo em vez de piscar o passo 1 na hidratação.
  const [placed, setPlaced] = useState(false);
  if (!placed) {
    setPlaced(true);
    viz.setStep(INITIAL_STEP);
  }

  const p = steps[viz.step];

  // Mexer na entrada ou escolher um cenário PAUSA a animação, como antes: se
  // ela seguisse rodando, o instante escolhido sumiria no quadro seguinte.
  // `stepBy(0)` é o "pausa e fica onde está", já com o passo limitado ao novo
  // total quando a entrada encurtou a linha do tempo.
  const pause = () => viz.stepBy(0);
  const goTo = (t: number) => {
    pause();
    viz.setStep(Math.min(steps.length - 1, Math.max(0, t)));
  };

  const backToDefaults = () => {
    setAStart(DEFAULT_A[0]);
    setAEnd(DEFAULT_A[1]);
    setLenB(DEFAULT_LEN_B);
    setClosed(true);
    viz.reset();
    viz.setStep(INITIAL_STEP);
  };

  const axis = useMemo(() => axisFor([0, a[1] + 1, bMax + lenB]), [a, bMax, lenB]);

  const scenarios: { name: string; t: number }[] = [
    { name: "B bem antes", t: 0 },
    { name: "Encostando no início", t: a[0] - lenB },
    { name: "Invadindo pela esquerda", t: a[0] - Math.ceil(lenB / 2) },
    { name: "Dentro de A", t: Math.round((a[0] + a[1]) / 2 - lenB / 2) },
    { name: "Encostando no fim", t: a[1] },
    { name: "B bem depois", t: bMax },
  ];

  const rows: TimelineRow[] = [
    {
      id: "a",
      label: `A = ${fmtIv(a)}`,
      bars: [{ id: "ba", start: a[0], end: a[1], state: "atual", label: `${a[0]},${a[1]}` }],
    },
    {
      id: "b",
      label: `B = ${fmtIv(p.b)}`,
      bars: [{ id: "bb", start: p.b[0], end: p.b[1], state: "novo", label: `${p.b[0]},${p.b[1]}` }],
    },
    {
      id: "inter",
      label: "interseção",
      bars: p.intersection
        ? [{ id: "bi", start: p.intersection[0], end: p.intersection[1], state: "bloco", label: `${p.intersection[0]},${p.intersection[1]}` }]
        : [],
    },
    {
      id: "uniao",
      label: "fundidos",
      bars: p.union
        ? [{ id: "bu", start: p.union[0], end: p.union[1], state: "pronto", label: `${p.union[0]},${p.union[1]}` }]
        : [],
    },
  ];

  const noteClass = "viz-note" + (p.overlaps ? " ok" : " invalid");
  const color = p.overlaps ? "#34d399" : "#f87171";

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} color={color} />

      <div {...viz.bodyProps}>
        <div className="viz-inputs">
          <label className="viz-field">
            <span>A começa</span>
            <input className="viz-input k" type="number" min={0} max={40} value={aStart}
              onChange={(e) => { pause(); setAStart(Math.min(40, Math.max(0, parseInt(e.target.value, 10) || 0))); }} />
          </label>
          <label className="viz-field">
            <span>A termina</span>
            <input className="viz-input k" type="number" min={0} max={40} value={aEnd}
              onChange={(e) => { pause(); setAEnd(Math.min(40, Math.max(0, parseInt(e.target.value, 10) || 0))); }} />
          </label>
          <label className="viz-field">
            <span>duração de B</span>
            <input className="viz-input k" type="number" min={0} max={20} value={lenB}
              onChange={(e) => { pause(); setLenB(Math.min(20, Math.max(0, parseInt(e.target.value, 10) || 0))); }} />
          </label>
          <button className="viz-btn" onClick={() => { pause(); setClosed((v) => !v); }} aria-pressed={closed}>
            Bordas: {closed ? "[início, fim]" : "[início, fim)"}
          </button>
        </div>

        <div className="iv-presets">
          <span className="iv-presets-lbl">Cenários</span>
          {scenarios.map((c) => (
            <button key={c.name} className={`iv-preset${viz.step === Math.min(steps.length - 1, Math.max(0, c.t)) ? " on" : ""}`} onClick={() => goTo(c.t)}>
              {c.name}
            </button>
          ))}
        </div>

        <LinhaDoTempo
          rows={rows}
          min={axis.min}
          max={axis.max}
          ticks={axis.ticks}
          guide={a[1]}
          guideGreen
        />

        <div className="viz-field grow" style={{ marginTop: 14 }}>
          <span>Início de B: {p.b[0]}</span>
          <input
            type="range"
            min={0}
            max={steps.length - 1}
            step={1}
            value={viz.step}
            onChange={(e) => goTo(parseInt(e.target.value, 10))}
            aria-label="Instante em que B começa"
            style={{ accentColor: "var(--ccc-accent)", width: "100%" }}
          />
        </div>

        <div className="iv-veredito">
          <span className={`iv-selo ${p.overlaps ? "ok" : "no"}`}>
            {p.overlaps ? "sobrepõem" : "não se sobrepõem"}
          </span>
          <span className="iv-veredito-txt">{p.relation}</span>
        </div>

        <div className="iv-testes">
          {p.checks.map((t) => (
            <div className={`iv-teste ${t.ok ? "ok" : "no"}`} key={t.title}>
              <b>{t.title}</b>
              {t.body}
            </div>
          ))}
        </div>

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          {/* A moldura extra é pela ALTURA: zerar a trilha da coluna só tira a
              largura, e a linha do grid continua com a altura inteira do bloco.
              O código fica no DOM mesmo recolhido — é isso que permite medir o
              pior caso —, e `inert` o tira do teclado e dos leitores de tela. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">
                sobreposicao.py · {closed ? "encostar conta como sobrepor" : "encostar não conta"}
              </div>
              <div className="viz-code-body">
                {code.map((txt, i) => (
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
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola.
          O `↺` do rodapé compartilhado é `viz.reset()`, isto é, volta ao passo
          1 e nada mais. Quem devolve A, a duração de B e o modelo de borda ao
          padrão é o botão ao lado — o rodapé não promete o que não faz. */}
      <VizFooter viz={viz} color={color}>
        <button className="viz-btn" onClick={backToDefaults}>Voltar ao padrão</button>
      </VizFooter>
    </figure>
  );

  return viz.inPanel(frame);
}
