"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

import {
  LinhaDoTempo,
  axisFor,
  fmtIv,
  fmtList,
  parseIntervals,
  writeIntervals,
} from "./IntervalsLinhaDoTempo";
import type { Interval, TimelineRow } from "./IntervalsLinhaDoTempo";

// ---------------------------------------------------------------------------
// IntervalsVisualizer, os três varreduras de intervalos numa linha do tempo.
//
// Mesmo padrão dos outros visualizadores do repo (gerador PURO de passos +
// a casca compartilhada), no formato do BigOCounterVisualizer: vários modos,
// cada um com o seu `code` e o seu `generate`. Os três compartilham a mesma
// tela porque a lição é justamente que são a MESMA varredura com uma regra
// diferente na hora de decidir:
//
//   merge   ordena por início e funde quem encosta no bloco anterior
//   insert  não ordena nada (a lista já vem pronta) e resolve em três fases
//   greedy  ordena pelo FIM e fica com o máximo de intervalos sem conflito
//
// A linha tracejada na trilha é sempre a fronteira do teste (`fim` do bloco,
// `fim` do novo intervalo, `fim_anterior`), que é a única coisa que muda.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Contrato
// em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type Vars = { name: string; value: string; best?: boolean }[];

type Step = {
  line: number;
  order: number[];
  states: Record<number, string>;
  output: Interval[];
  block: Interval | null;
  guide: number | null;
  tests: number;
  dropped: number;
  note: string;
  vars: Vars;
  ok?: boolean;
};

const CODE_MERGE = [
  "def merge(intervalos):",
  "    if not intervalos:",
  "        return []",
  "    intervalos.sort(key=lambda x: x[0])",
  "    saida = [list(intervalos[0])]",
  "    for inicio, fim in intervalos[1:]:",
  "        if inicio <= saida[-1][1]:",
  "            saida[-1][1] = max(saida[-1][1], fim)",
  "        else:",
  "            saida.append([inicio, fim])",
  "    return saida",
];

const CODE_INSERT = [
  "def inserir(intervalos, novo):",
  "    inicio, fim = novo",
  "    saida, i, n = [], 0, len(intervalos)",
  "    while i < n and intervalos[i][1] < inicio:",
  "        saida.append(intervalos[i])",
  "        i += 1",
  "    while i < n and intervalos[i][0] <= fim:",
  "        inicio = min(inicio, intervalos[i][0])",
  "        fim = max(fim, intervalos[i][1])",
  "        i += 1",
  "    saida.append([inicio, fim])",
  "    while i < n:",
  "        saida.append(intervalos[i])",
  "        i += 1",
  "    return saida",
];

const CODE_GREEDY = [
  "def maximo_sem_conflito(intervalos):",
  "    intervalos.sort(key=lambda x: x[1])",
  "    escolhidos = []",
  "    fim_anterior = float('-inf')",
  "    for inicio, fim in intervalos:",
  "        if inicio >= fim_anterior:",
  "            escolhidos.append([inicio, fim])",
  "            fim_anterior = fim",
  "    return escolhidos",
];

function pl(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function copyIvs(ivs: Interval[]): Interval[] {
  return ivs.map((iv) => [iv[0], iv[1]] as Interval);
}

// --------------------------------- merge -----------------------------------

function generateMerge(ivs: Interval[]): Step[] {
  const steps: Step[] = [];
  const n = ivs.length;
  const idx = ivs.map((_, i) => i);
  const allStates = (c: string): Record<number, string> => {
    const e: Record<number, string> = {};
    for (const i of idx) e[i] = c;
    return e;
  };

  if (n === 0) {
    steps.push({
      line: 2, order: [], states: {}, output: [], block: null, guide: null, tests: 0, dropped: 0,
      note: "Lista vazia: devolvo [] antes de qualquer coisa. É o caso de borda que mais derruba submissão, porque intervalos[0] em lista vazia estoura.",
      vars: [{ name: "intervalos", value: "[]" }, { name: "saida", value: "[]" }],
    });
    return steps;
  }

  const order = [...idx].sort((a, b) => ivs[a][0] - ivs[b][0] || ivs[a][1] - ivs[b][1]);

  steps.push({
    line: 0, order: idx, states: allStates("espera"), output: [], block: null, guide: null, tests: 0, dropped: 0,
    note: n === 1
      ? "Entrada com um intervalo só: não existe par para comparar, então a resposta já é ele mesmo. Vale rodar mesmo assim para ver que nenhum teste chega a acontecer."
      : `Entrada como veio: ${n} intervalos, fora de ordem. Assim, qualquer um pode encostar em qualquer outro, e eu teria que comparar todos os pares.`,
    vars: [{ name: "n", value: `${n}` }, { name: "saida[-1]", value: "-" }, { name: "len(saida)", value: "0" }, { name: "testes", value: "0", best: true }],
  });

  steps.push({
    line: 3, order, states: allStates("espera"), output: [], block: null, guide: null, tests: 0, dropped: 0,
    note: `Ordenei por início: ${fmtList(order.map((i) => ivs[i]))}. Com a lista assim, cada intervalo só pode encostar no bloco imediatamente anterior.`,
    vars: [{ name: "n", value: `${n}` }, { name: "saida[-1]", value: "-" }, { name: "len(saida)", value: "0" }, { name: "testes", value: "0", best: true }],
  });

  const states = allStates("espera");
  const output: Interval[] = [];
  let block: Interval = [ivs[order[0]][0], ivs[order[0]][1]];
  let tests = 0;

  const vars = (current: Interval | null): Vars => [
    { name: "atual", value: fmtIv(current) },
    { name: "saida[-1]", value: fmtIv(block) },
    { name: "len(saida)", value: `${output.length + 1}` },
    { name: "testes", value: `${tests}`, best: true },
  ];

  states[order[0]] = "usado";
  steps.push({
    line: 4, order, states: { ...states }, output: [], block: [block[0], block[1]], guide: block[1], tests, dropped: 0,
    note: `Abro o primeiro bloco em ${fmtIv(block)}. A linha tracejada marca o fim dele: é contra ela que todo mundo vai ser testado.`,
    vars: vars(ivs[order[0]]),
  });

  for (let k = 1; k < n; k++) {
    const i = order[k];
    const start = ivs[i][0];
    const end = ivs[i][1];
    tests++;
    const touches = start <= block[1];

    steps.push({
      line: 6, order, states: { ...states, [i]: "atual" }, output: copyIvs(output), block: [block[0], block[1]], guide: block[1], tests, dropped: 0,
      note: `Teste ${tests}: o bloco termina em ${block[1]} e ${fmtIv(ivs[i])} começa em ${start}. ${start} <= ${block[1]}? ${touches ? "Sim, os dois se sobrepõem." : "Não, este começa depois do bloco acabar."}`,
      vars: vars(ivs[i]),
    });

    states[i] = "usado";
    if (touches) {
      const before = block[1];
      block = [block[0], Math.max(before, end)];
      steps.push({
        line: 7, order, states: { ...states }, output: copyIvs(output), block: [block[0], block[1]], guide: block[1], tests, dropped: 0,
        note: `Estico o bloco: fim = max(${before}, ${end}) = ${block[1]}, então o bloco virou ${fmtIv(block)}.${end < before ? " Repare no que o max acabou de salvar: este intervalo estava inteiro dentro do bloco, e sem o max eu teria encolhido o fim." : ""}`,
        vars: vars(ivs[i]),
      });
    } else {
      output.push([block[0], block[1]]);
      const sealed = output[output.length - 1];
      block = [start, end];
      steps.push({
        line: 9, order, states: { ...states }, output: copyIvs(output), block: [block[0], block[1]], guide: block[1], tests, dropped: 0,
        note: `Fecho ${fmtIv(sealed)} para sempre: todo mundo que ainda falta começa em ${start} ou mais tarde, então ninguém alcança mais esse bloco. Abro ${fmtIv(block)}.`,
        vars: vars(ivs[i]),
      });
    }
  }

  output.push([block[0], block[1]]);
  const pairs = (n * (n - 1)) / 2;
  steps.push({
    line: 10, order, states: allStates("usado"), output: copyIvs(output), block: null, guide: null, tests, dropped: 0, ok: true,
    note: `Fim: ${n} ${pl(n, "intervalo virou", "intervalos viraram")} ${output.length}. ${tests === 0 ? "Nenhum teste de sobreposição aconteceu: com um intervalo só, o laço nem chega a rodar." : `Foram ${tests} ${pl(tests, "teste", "testes")} de sobreposição, contra ${pairs} ${pl(pairs, "comparação", "comparações")} se eu tivesse olhado todos os pares.`}`,
    vars: [
      { name: "atual", value: "-" },
      { name: "saida[-1]", value: fmtIv(output[output.length - 1]) },
      { name: "len(saida)", value: `${output.length}` },
      { name: "testes", value: `${tests}`, best: true },
    ],
  });
  return steps;
}

// --------------------------------- insert ----------------------------------

function generateInsert(ivs: Interval[], incoming: Interval): Step[] {
  const steps: Step[] = [];
  const n = ivs.length;
  const idx = ivs.map((_, i) => i);
  const states: Record<number, string> = {};
  for (const i of idx) states[i] = "espera";

  const output: Interval[] = [];
  let start = incoming[0];
  let end = incoming[1];
  let tests = 0;
  let i = 0;

  const vars = (): Vars => [
    { name: "i", value: `${i}` },
    { name: "novo", value: fmtIv([start, end]) },
    { name: "len(saida)", value: `${output.length}` },
    { name: "comparações", value: `${tests}`, best: true },
  ];

  const mkStep = (line: number, note: string, st: Record<number, string>, withBlock = true): Step => ({
    line, order: idx, states: st, output: copyIvs(output), block: withBlock ? [start, end] : null,
    guide: withBlock ? end : null, tests, dropped: 0, note, vars: vars(),
  });

  steps.push(mkStep(1, `Quero encaixar ${fmtIv([start, end])} numa lista que já chega ordenada e sem sobreposição. Como a ordem veio pronta, não pago O(n log n) nenhum: uma passada resolve.`, { ...states }));

  // Fase 1: tudo que termina antes do novo começar sai copiado.
  while (i < n) {
    tests++;
    const before = ivs[i][1] < start;
    steps.push(mkStep(3, `Fase 1, comparação ${tests}: ${fmtIv(ivs[i])} termina em ${ivs[i][1]} e o novo começa em ${start}. ${ivs[i][1]} < ${start}? ${before ? "Sim, acaba antes de o novo nascer." : "Não, este já alcança o novo. A fase 1 termina aqui."}`, { ...states, [i]: "atual" }));
    if (!before) break;
    output.push([ivs[i][0], ivs[i][1]]);
    states[i] = "usado";
    const copied = ivs[i];
    i++;
    steps.push(mkStep(4, `Copio ${fmtIv(copied)} para a saída sem tocar nele. Ele não briga com ninguém.`, { ...states }));
  }

  // Fase 2: tudo que encosta é absorvido pelo novo intervalo.
  while (i < n) {
    tests++;
    const touches = ivs[i][0] <= end;
    steps.push(mkStep(6, `Fase 2, comparação ${tests}: ${fmtIv(ivs[i])} começa em ${ivs[i][0]} e o novo termina em ${end}. ${ivs[i][0]} <= ${end}? ${touches ? "Sim, sobrepõe: vou engolir este." : "Não, este começa depois. A fase 2 termina aqui."}`, { ...states, [i]: "atual" }));
    if (!touches) break;
    const startBefore = start;
    const endBefore = end;
    const eaten = ivs[i];
    start = Math.min(start, eaten[0]);
    end = Math.max(end, eaten[1]);
    states[i] = "comido";
    i++;
    steps.push(mkStep(8, `Engulo ${fmtIv(eaten)}: inicio = min(${startBefore}, ${eaten[0]}) = ${start} e fim = max(${endBefore}, ${eaten[1]}) = ${end}. O novo cresceu para ${fmtIv([start, end])}.`, { ...states }));
  }

  output.push([start, end]);
  steps.push(mkStep(10, `Empurro ${fmtIv([start, end])} para a saída. Ele já absorveu tudo que encostava nele, então nunca mais vai mudar.`, { ...states }, false));

  // Fase 3: o rabo da lista entra inteiro, sem comparação nenhuma.
  const leftOver = n - i;
  while (i < n) {
    const rest = ivs[i];
    output.push([rest[0], rest[1]]);
    states[i] = "usado";
    i++;
    steps.push(mkStep(12, `Fase 3: ${fmtIv(rest)} começa depois do novo terminar. Copio direto, sem comparar: a lista está ordenada, então daqui para frente é tudo mais tarde ainda.`, { ...states }, false));
  }

  const last = mkStep(14, `Fim: a lista de ${n} ${pl(n, "intervalo", "intervalos")} virou ${output.length}. Foram ${tests} ${pl(tests, "comparação", "comparações")} e zero ordenações${leftOver > 0 ? `, e as últimas ${leftOver} ${pl(leftOver, "cópia foi feita", "cópias foram feitas")} sem teste nenhum` : ""}.`, { ...states }, false);
  last.ok = true;
  steps.push(last);
  return steps;
}

// --------------------------------- greedy ----------------------------------

function generateGreedy(ivs: Interval[]): Step[] {
  const steps: Step[] = [];
  const n = ivs.length;
  const idx = ivs.map((_, i) => i);
  const allStates = (c: string): Record<number, string> => {
    const e: Record<number, string> = {};
    for (const i of idx) e[i] = c;
    return e;
  };

  if (n === 0) {
    steps.push({
      line: 8, order: [], states: {}, output: [], block: null, guide: null, tests: 0, dropped: 0,
      note: "Lista vazia: dá para encaixar zero intervalos. Devolvo [].",
      vars: [{ name: "escolhidos", value: "0" }],
    });
    return steps;
  }

  const order = [...idx].sort((a, b) => ivs[a][1] - ivs[b][1] || ivs[a][0] - ivs[b][0]);

  steps.push({
    line: 0, order: idx, states: allStates("espera"), output: [], block: null, guide: null, tests: 0, dropped: 0,
    note: `${n} intervalos concorrendo pelo mesmo recurso. Quero ficar com o máximo possível deles sem que dois se sobreponham.`,
    vars: [{ name: "fim_anterior", value: "-inf" }, { name: "escolhidos", value: "0" }, { name: "descartados", value: "0" }, { name: "testes", value: "0", best: true }],
  });

  steps.push({
    line: 1, order, states: allStates("espera"), output: [], block: null, guide: null, tests: 0, dropped: 0,
    note: `Ordenei pelo FIM, não pelo início: ${fmtList(order.map((i) => ivs[i]))}. Quem termina mais cedo é quem deixa mais espaço livre para os próximos.`,
    vars: [{ name: "fim_anterior", value: "-inf" }, { name: "escolhidos", value: "0" }, { name: "descartados", value: "0" }, { name: "testes", value: "0", best: true }],
  });

  const states = allStates("espera");
  const output: Interval[] = [];
  let prevEnd: number | null = null;
  let tests = 0;
  let dropped = 0;

  const vars = (): Vars => [
    { name: "fim_anterior", value: prevEnd == null ? "-inf" : `${prevEnd}` },
    { name: "escolhidos", value: `${output.length}` },
    { name: "descartados", value: `${dropped}` },
    { name: "testes", value: `${tests}`, best: true },
  ];

  for (let k = 0; k < n; k++) {
    const i = order[k];
    const start = ivs[i][0];
    const end = ivs[i][1];
    tests++;
    const fits = prevEnd == null || start >= prevEnd;

    steps.push({
      line: 5, order, states: { ...states, [i]: "atual" }, output: copyIvs(output), block: null, guide: prevEnd, tests, dropped,
      note: `Teste ${tests}: ${fmtIv(ivs[i])} começa em ${start} e o último escolhido terminou em ${prevEnd == null ? "menos infinito (ainda não escolhi nada)" : prevEnd}. ${start} >= ${prevEnd == null ? "-inf" : prevEnd}? ${fits ? "Sim, cabe sem conflito." : "Não, ele invade o anterior."}`,
      vars: vars(),
    });

    if (fits) {
      output.push([start, end]);
      prevEnd = end;
      states[i] = "usado";
      steps.push({
        line: 6, order, states: { ...states }, output: copyIvs(output), block: null, guide: prevEnd, tests, dropped,
        note: `Pego ${fmtIv(ivs[i])}. Agora fim_anterior = ${end}, e a tracejada anda junto: é a nova fronteira.`,
        vars: vars(),
      });
    } else {
      dropped++;
      states[i] = "corta";
      steps.push({
        line: 4, order, states: { ...states }, output: copyIvs(output), block: null, guide: prevEnd, tests, dropped,
        note: `Descarto ${fmtIv(ivs[i])}. Trocá-lo pelo que já escolhi nunca melhora a conta: o que escolhi termina antes ou junto, então deixa pelo menos tanto espaço quanto ele.`,
        vars: vars(),
      });
    }
  }

  steps.push({
    line: 8, order, states: { ...states }, output: copyIvs(output), block: null, guide: prevEnd, tests, dropped, ok: true,
    note: `Fim: ${output.length} de ${n} ${pl(n, "intervalo cabe", "intervalos cabem")} sem conflito, ${dropped} ${pl(dropped, "sobra de fora", "sobram de fora")}. Para o LeetCode 435, a resposta é justamente esse ${dropped}.`,
    vars: vars(),
  });
  return steps;
}

// --------------------------------- modos -----------------------------------

type Preset = { name: string; ivs: string; incoming?: string };

type Mode = {
  key: "merge" | "insert" | "greedy";
  name: string;
  family: string;
  color: string;
  file: string;
  caption: string;
  code: string[];
  usesIncoming: boolean;
  outputLabel: string;
  presets: Preset[];
};

const MODES: Mode[] = [
  {
    key: "merge",
    name: "funde quem encosta",
    family: "Merge",
    color: "#3b82f6",
    file: "merge_intervals.py",
    caption: "ordena por início · O(n log n)",
    code: CODE_MERGE,
    usesIncoming: false,
    outputLabel: "saída",
    presets: [
      { name: "Caso base", ivs: "[13,16], [1,4], [8,10], [2,6], [9,12], [17,18]" },
      { name: "Tudo vira um", ivs: "[1,4], [3,7], [6,10], [9,12]" },
      { name: "Nada funde", ivs: "[1,2], [3,4], [5,6], [7,8]" },
      { name: "Só encostam", ivs: "[1,3], [3,5], [5,7]" },
      { name: "Um dentro do outro", ivs: "[1,10], [2,3], [4,5], [11,12]" },
      { name: "Um intervalo só", ivs: "[5,9]" },
      { name: "Lista vazia", ivs: "" },
    ],
  },
  {
    key: "insert",
    name: "encaixa um novo",
    family: "Insert",
    color: "#f59e0b",
    file: "insert_interval.py",
    caption: "não ordena nada · O(n)",
    code: CODE_INSERT,
    usesIncoming: true,
    outputLabel: "saída",
    presets: [
      { name: "Engole dois", ivs: "[1,3], [6,9], [12,16]", incoming: "[7,13]" },
      { name: "Não toca ninguém", ivs: "[1,3], [6,9], [12,16]", incoming: "[4,5]" },
      { name: "Vai para o fim", ivs: "[1,3], [6,9], [12,16]", incoming: "[20,25]" },
      { name: "Engole tudo", ivs: "[1,3], [6,9], [12,16]", incoming: "[0,20]" },
      { name: "Lista vazia", ivs: "", incoming: "[4,8]" },
    ],
  },
  {
    key: "greedy",
    name: "máximo sem conflito",
    family: "Greedy",
    color: "#34d399",
    file: "interval_scheduling.py",
    caption: "ordena pelo fim · O(n log n)",
    code: CODE_GREEDY,
    usesIncoming: false,
    outputLabel: "escolhidos",
    presets: [
      { name: "Caso base", ivs: "[13,16], [1,4], [8,10], [2,6], [9,12], [17,18]" },
      { name: "Pelo início falharia", ivs: "[1,10], [2,3], [4,5], [6,7]" },
      { name: "Todos em cima", ivs: "[1,5], [2,6], [3,7], [4,8]" },
      { name: "Cadeia perfeita", ivs: "[1,3], [3,5], [5,7], [7,9]" },
    ],
  },
];

function hasOverlap(ivs: Interval[]): boolean {
  for (let i = 1; i < ivs.length; i++) {
    if (ivs[i][0] <= ivs[i - 1][1]) return true;
  }
  return false;
}

/**
 * `mode` só escolhe com qual varredura o visualizador ABRE. O artigo usa o
 * mesmo componente três vezes, cada vez na seção que ensina aquele modo, e o
 * aluno continua podendo trocar pelos chips.
 */
export function IntervalsVisualizer({ mode: initialMode = "merge" }: { mode?: Mode["key"] } = {}) {
  const initialIndex = Math.max(0, MODES.findIndex((m) => m.key === initialMode));
  const [modeIndex, setModeIndex] = useState(initialIndex);
  const [input, setInput] = useState(MODES[initialIndex].presets[0].ivs);
  const [incomingInput, setIncomingInput] = useState(
    MODES.find((m) => m.key === "insert")?.presets[0].incoming ?? "[7,13]"
  );

  const mode = MODES[modeIndex];

  // O Insert pressupõe a lista já ordenada, então aqui ela chega ordenada por
  // início: é o contrato do problema, não uma etapa do algoritmo.
  const ivs = useMemo(() => {
    const read = parseIntervals(input);
    return mode.key === "insert" ? [...read].sort((a, b) => a[0] - b[0] || a[1] - b[1]) : read;
  }, [input, mode.key]);

  const incoming = useMemo<Interval>(() => {
    const read = parseIntervals(incomingInput, 1);
    return read.length ? read[0] : [0, 0];
  }, [incomingInput]);

  const steps = useMemo(() => {
    if (mode.key === "merge") return generateMerge(ivs);
    if (mode.key === "greedy") return generateGreedy(ivs);
    return generateInsert(ivs, incoming);
  }, [mode.key, ivs, incoming]);

  const n = ivs.length;

  const viz = useVisualizer({
    title: "Visualizador · varrendo intervalos na linha do tempo",
    total: steps.length,
    // O que MAIS muda a altura: o modo (o código vai de 9 a 15 linhas e a fila
    // de cenários muda de tamanho) e quantos intervalos a entrada tem, porque
    // cada um é uma faixa a mais na linha do tempo. `steps.length` entra porque
    // ele atravessa 1 — e em `total: 1` o rodapé inteiro some, o que é altura.
    measureOn: [modeIndex, n, steps.length],
  });

  const p = steps[viz.step];

  const axis = useMemo(() => {
    const values: number[] = [];
    for (const iv of ivs) { values.push(iv[0], iv[1]); }
    if (mode.usesIncoming) values.push(incoming[0], incoming[1]);
    if (!values.length) values.push(0, 10);
    return axisFor(values);
  }, [ivs, incoming, mode.usesIncoming]);

  const pickMode = (i: number) => {
    viz.reset();
    setModeIndex(i);
    const pr = MODES[i].presets[0];
    setInput(pr.ivs);
    if (pr.incoming) setIncomingInput(pr.incoming);
  };

  const applyPreset = (pr: Preset) => {
    viz.reset();
    setInput(pr.ivs);
    if (pr.incoming) setIncomingInput(pr.incoming);
  };

  // Math.random só no handler, nunca no render: o HTML do build e o do cliente
  // precisam bater na hidratação.
  const randomize = () => {
    const count = 4 + Math.floor(Math.random() * 3);
    const drawn: Interval[] = [];
    for (let i = 0; i < count; i++) {
      const start = Math.floor(Math.random() * 16);
      drawn.push([start, start + 1 + Math.floor(Math.random() * 5)]);
    }
    viz.reset();
    if (mode.key === "insert") {
      const sorted = [...drawn].sort((a, b) => a[0] - b[0]);
      const clean: Interval[] = [];
      for (const iv of sorted) {
        if (!clean.length || iv[0] > clean[clean.length - 1][1]) clean.push(iv);
      }
      setInput(writeIntervals(clean));
      const start = Math.floor(Math.random() * 14);
      setIncomingInput(`[${start},${start + 2 + Math.floor(Math.random() * 6)}]`);
      return;
    }
    setInput(writeIntervals(drawn));
  };

  const rows: TimelineRow[] = [
    ...p.order.map((i) => ({
      id: `iv${i}`,
      label: fmtIv(ivs[i]),
      bars: [{ id: `b${i}`, start: ivs[i][0], end: ivs[i][1], state: p.states[i] ?? "espera", label: `${ivs[i][0]},${ivs[i][1]}` }],
    })),
    ...(mode.usesIncoming
      ? [{
          id: "novo",
          label: "novo",
          bars: p.block ? [{ id: "nv", start: p.block[0], end: p.block[1], state: "novo", label: `${p.block[0]},${p.block[1]}` }] : [],
        }]
      : []),
    {
      id: "saida",
      label: mode.outputLabel,
      bars: [
        ...p.output.map((s, k) => ({ id: `s${k}`, start: s[0], end: s[1], state: "pronto", label: `${s[0]},${s[1]}` })),
        ...(mode.key === "merge" && p.block
          ? [{ id: "bloco", start: p.block[0], end: p.block[1], state: "bloco", label: `${p.block[0]},${p.block[1]}` }]
          : []),
      ],
    },
  ];

  const stats =
    mode.key === "merge"
      ? [
          { label: "intervalos na entrada", value: `${n}` },
          { label: "blocos na saída", value: `${p.output.length + (p.block ? 1 : 0)}` },
          { label: "testes de sobreposição", value: `${p.tests}` },
          { label: "todos os pares seriam", value: `${(n * (n - 1)) / 2}` },
        ]
      : mode.key === "insert"
        ? [
            { label: "intervalos na lista", value: `${n}` },
            { label: "intervalos na saída", value: `${p.output.length}` },
            { label: "comparações", value: `${p.tests}` },
            { label: "ordenações", value: "0" },
          ]
        : [
            { label: "intervalos na entrada", value: `${n}` },
            { label: "escolhidos", value: `${p.output.length}` },
            { label: "descartados", value: `${p.dropped}` },
            { label: "testes", value: `${p.tests}` },
          ];

  const insertWarning = mode.key === "insert" && hasOverlap(ivs);
  const noteClass = "viz-note" + (p.ok ? " ok" : "");
  const result = p.output.length
    ? fmtList(p.output) + (mode.key === "merge" && p.block ? ` ${fmtIv(p.block)}` : "")
    : mode.key === "merge" && p.block
      ? fmtIv(p.block)
      : "ainda vazia";

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} color={mode.color} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {MODES.map((m, i) => {
            const on = i === modeIndex;
            return (
              <button
                type="button"
                key={m.key}
                className={`bigo-chip${on ? " on" : ""}`}
                style={on ? { borderColor: m.color, color: m.color } : undefined}
                onClick={() => pickMode(i)}
                aria-pressed={on}
              >
                <span className="sw" style={{ background: on ? m.color : "#3a4a60" }} />
                {m.family} · {m.name}
              </button>
            );
          })}
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Intervalos</span>
            <input
              className="viz-input"
              value={input}
              onChange={(e) => { viz.reset(); setInput(e.target.value); }}
              placeholder="[1,4], [2,6], [8,10]"
            />
          </label>
          {mode.usesIncoming && (
            <label className="viz-field">
              <span>novo</span>
              <input
                className="viz-input"
                style={{ width: 96 }}
                value={incomingInput}
                onChange={(e) => { viz.reset(); setIncomingInput(e.target.value); }}
              />
            </label>
          )}
          <button type="button" className="viz-btn" onClick={randomize}>Sortear</button>
        </div>

        <div className="iv-presets">
          <span className="iv-presets-lbl">Cenários</span>
          {mode.presets.map((pr) => (
            <button
              type="button"
              key={pr.name}
              className={`iv-preset${input === pr.ivs && (!pr.incoming || incomingInput === pr.incoming) ? " on" : ""}`}
              onClick={() => applyPreset(pr)}
            >
              {pr.name}
            </button>
          ))}
        </div>

        {insertWarning && (
          <p className="viz-note invalid">
            Esta lista tem sobreposição entre os próprios intervalos. O Insert Interval pressupõe que ela chegue limpa,
            então rode o modo Merge antes para ver o que aconteceria de verdade.
          </p>
        )}

        <LinhaDoTempo
          rows={rows}
          min={axis.min}
          max={axis.max}
          ticks={axis.ticks}
          guide={p.guide}
          guideGreen={mode.key !== "insert"}
        />

        <div className="iv-saida">
          <span className="iv-saida-lbl">{mode.outputLabel}</span>
          <span className="iv-saida-val">{result}</span>
        </div>

        <div className="bigo-stats">
          {stats.map((s) => (
            <div className="bigo-stat" key={s.label}>
              <span>{s.label}</span>
              <strong style={{ color: mode.color }}>{s.value}</strong>
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
              <div className="viz-code-head">{mode.file} · {mode.caption}</div>
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
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} color={mode.color} />
    </figure>
  );

  return viz.inPanel(frame);
}
