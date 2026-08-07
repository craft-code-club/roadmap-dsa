"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// SkipListInsercao, as duas operações que mexem na estrutura: inserir e remover.
//
// A busca (SkipListVisualizer) mostra o benefício dos níveis. Este mostra o
// preço e o truque: para inserir ou remover é preciso guardar, nível a nível,
// quem é o vizinho da esquerda do nó afetado (o vetor `update`, o "bread crumb"
// da implementação), e só então religar os ponteiros.
//
// Quatro coisas que o aluno precisa enxergar acontecendo:
//   1. o update[] enchendo, um candidato por nível, sempre que a busca desce;
//   2. a moeda decidindo a altura, e a altura sendo sorteada UMA vez só;
//   3. os níveis acima do topo atual, onde o candidato já era o head. É a
//      dúvida mais comum do tema, e ela só fecha vendo;
//   4. na remoção, o `break`: o primeiro nível em que o candidato não aponta
//      para o alvo encerra o trabalho, porque a altura é contínua de baixo
//      para cima. E a assimetria do custo: inserir reescreve 2 ponteiros por
//      nível, remover reescreve 1.
//
// O gerador é puro: recebe (modo, valor, altura) e devolve sempre os mesmos
// passos. O sorteio real de altura acontece num handler de clique, nunca no
// render.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Contrato
// em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type Mode = "inserir" | "remover";
type Item = { value: number; height: number; isNew?: boolean };
type Face = "cara" | "coroa" | "teto";

type Step = {
  level: number;
  current: number; // índice em `items`, -1 = head
  looking: number | null;
  update: number[]; // por nível: índice do candidato, -1 = head (o valor inicial)
  written: boolean[]; // se a busca já passou por aquele nível e gravou o candidato
  linked: number; // quantos níveis do nó novo já foram religados (inserção)
  unlinked: number; // quantos níveis do nó alvo já saíram (remoção)
  coins: Face[];
  onStage: boolean; // o nó em foco já apareceu (criado na inserção, achado na remoção)
  maxLevel: number;
  line: number;
  done?: boolean;
  ok?: boolean;
  error?: boolean;
  note: string;
};

// As linhas mapeiam 1:1 com o campo `line` de cada passo, então a ordem e a
// quantidade de linhas não podem mudar sem ajustar o gerador junto.
const CODE_INSERT = [
  "def inserir(self, valor):",
  "    atual = self.head",
  "    update = [self.head] * MAX_NIVEL",
  "    for nivel in range(self.nivel_max, -1, -1):",
  "        prox = atual.forward[nivel]",
  "        while prox and prox.valor < valor:",
  "            atual = prox",
  "            prox = atual.forward[nivel]",
  "        update[nivel] = atual",
  "    altura = self.sortear_altura()",
  "    self.nivel_max = max(self.nivel_max, altura - 1)",
  "    novo = No(valor, altura)",
  "    for nivel in range(altura):",
  "        novo.forward[nivel] = update[nivel].forward[nivel]",
  "        update[nivel].forward[nivel] = novo",
];

const CODE_REMOVE = [
  "def remover(self, valor):",
  "    atual = self.head",
  "    update = [self.head] * MAX_NIVEL",
  "    for nivel in range(self.nivel_max, -1, -1):",
  "        prox = atual.forward[nivel]",
  "        while prox and prox.valor < valor:",
  "            atual = prox",
  "            prox = atual.forward[nivel]",
  "        update[nivel] = atual",
  "    alvo = atual.forward[0]",
  "    if alvo is None or alvo.valor != valor:",
  "        return False",
  "    for nivel in range(self.nivel_max + 1):",
  "        if update[nivel].forward[nivel] is not alvo:",
  "            break",
  "        update[nivel].forward[nivel] = alvo.forward[nivel]",
  "    while self.nivel_max > 0 and self.head.forward[self.nivel_max] is None:",
  "        self.nivel_max -= 1",
  "    return True",
];

const MAX_LEVEL = 5; // teto de altura de um nó: níveis 0 a 4

// Base com a pirâmide de livro: 10 nós no nível 0, 6 no 1, 3 no 2 e 1 no 3.
// O 33, o 80 e o 1 ficam de fora de propósito, são os buracos para inserir.
const BASE: Item[] = [
  { value: 3, height: 1 },
  { value: 9, height: 3 },
  { value: 17, height: 1 },
  { value: 23, height: 2 },
  { value: 31, height: 1 },
  { value: 42, height: 4 },
  { value: 50, height: 1 },
  { value: 59, height: 2 },
  { value: 73, height: 3 },
  { value: 92, height: 2 },
];

const BASE_MAX_LEVEL = Math.max(...BASE.map((b) => b.height)) - 1; // 3

// A sequência de moedas que produz aquela altura: (altura - 1) caras e uma
// coroa. Quando a altura bate no teto, a última moeda nem é lançada.
function coinsFor(height: number): Face[] {
  const out: Face[] = [];
  for (let i = 1; i < height; i++) out.push("cara");
  out.push(height >= MAX_LEVEL ? "teto" : "coroa");
  return out;
}

function nameOf(items: Item[], i: number): string {
  return i < 0 ? "o head" : `o ${items[i].value}`;
}

function updateLabel(items: Item[], v: number): string {
  return v < 0 ? "head" : `${items[v].value}`;
}

// Estado de visibilidade do nó em foco, que é o que faz o desenho animar a
// religação. Na inserção ele ainda não existe nos níveis acima de `linked`;
// na remoção ele já saiu dos níveis abaixo de `unlinked`.
type Vis = { target: number; mode: Mode; linked: number; unlinked: number };

function isHidden(j: number, level: number, v: Vis): boolean {
  if (j !== v.target) return false;
  return v.mode === "inserir" ? level >= v.linked : level < v.unlinked;
}

// O próximo nó de `i` no nível `level`, respeitando o que já está ligado.
function nextFrom(items: Item[], i: number, level: number, v: Vis): number | null {
  for (let j = i + 1; j < items.length; j++) {
    if (isHidden(j, level, v)) continue;
    if (items[j].height > level) return j;
  }
  return null;
}

type Result = { items: Item[]; targetIdx: number; targetHeight: number; steps: Step[] };

function generateSteps(mode: Mode, value: number, height: number): Result {
  const exists = BASE.some((b) => b.value === value);
  const inserting = mode === "inserir";

  // Na inserção o nó entra na lista; na remoção ele já estava lá.
  const targetIdx = inserting
    ? exists
      ? -1
      : BASE.filter((b) => b.value < value).length
    : BASE.findIndex((b) => b.value === value);

  const items: Item[] =
    inserting && !exists
      ? [
          ...BASE.slice(0, targetIdx).map((b) => ({ ...b })),
          { value, height, isNew: true },
          ...BASE.slice(targetIdx).map((b) => ({ ...b })),
        ]
      : BASE.map((b) => ({ ...b }));

  const targetHeight = inserting ? height : targetIdx >= 0 ? BASE[targetIdx].height : 0;

  // Nasce todo apontando para o head, igual ao `[self.head] * MAX_NIVEL` do código.
  const update: number[] = Array.from({ length: MAX_LEVEL }, () => -1);
  const written: boolean[] = Array.from({ length: MAX_LEVEL }, () => false);
  const coins: Face[] = [];
  let level = BASE_MAX_LEVEL;
  let current = -1;
  let linked = 0;
  let unlinked = 0;
  let onStage = false;
  let maxLevel = BASE_MAX_LEVEL;

  const vis = (): Vis => ({ target: targetIdx, mode, linked, unlinked });
  const base = () => ({
    level,
    current,
    update: [...update],
    written: [...written],
    linked,
    unlinked,
    coins: [...coins],
    onStage,
    maxLevel,
  });

  if (inserting && exists) {
    return {
      items,
      targetIdx,
      targetHeight,
      steps: [
        {
          ...base(),
          looking: null,
          line: 0,
          done: true,
          error: true,
          note: `O ${value} já está nesta lista, e esta implementação didática não aceita repetidos. Troque o valor: o 33, o 80 e o 1 são os buracos interessantes.`,
        },
      ],
    };
  }

  const steps: Step[] = [];
  steps.push({
    ...base(),
    looking: null,
    line: 2,
    note: inserting
      ? `Antes de andar, crio o vetor update com ${MAX_LEVEL} posições, todas apontando para o head. Ele vai guardar, nível a nível, quem é o vizinho da esquerda do ${value}.`
      : `Remover começa com a mesma busca da inserção, e pelo mesmo motivo: preciso do update, um candidato por nível, para saber quem vai passar a apontar por cima do ${value} depois que ele sair.`,
  });

  // --- a busca, idêntica nas duas operações --------------------------------
  let guard = 0;
  while (level >= 0 && guard++ < 300) {
    const next = nextFrom(items, current, level, vis());
    if (next === null) {
      steps.push({
        ...base(),
        looking: null,
        line: 4,
        note: `No nível ${level} não há ninguém depois de ${nameOf(items, current)}: o ponteiro é None. Não dá para andar mais aqui.`,
      });
    } else if (items[next].value < value) {
      steps.push({
        ...base(),
        looking: next,
        line: 5,
        note: `${items[next].value} < ${value}: ainda dá para avançar no nível ${level} sem passar do lugar do ${value}.`,
      });
      current = next;
      steps.push({
        ...base(),
        looking: null,
        line: 6,
        note: `Avancei para ${nameOf(items, current)} no nível ${level}.`,
      });
      continue;
    } else {
      steps.push({
        ...base(),
        looking: next,
        line: 5,
        note: `${items[next].value} não é menor que ${value}: se eu avançasse, passaria do ponto. Paro de andar no nível ${level}.`,
      });
    }

    update[level] = current;
    written[level] = true;
    steps.push({
      ...base(),
      looking: null,
      line: 8,
      note: inserting
        ? `Gravo update[${level}] = ${nameOf(items, current)}. Se o ${value} for promovido até o nível ${level}, é ${nameOf(items, current)} que vai apontar para ele.`
        : `Gravo update[${level}] = ${nameOf(items, current)}. Se o ${value} viver no nível ${level}, é ${nameOf(items, current)} que vai ter que costurar por cima dele.`,
    });

    if (level === 0) break;
    level--;
    steps.push({
      ...base(),
      looking: null,
      line: 3,
      note: `Desço para o nível ${level}, sem sair de ${nameOf(items, current)}. Cada descida deixa um candidato para trás: é esse o rastro que o update guarda.`,
    });
  }

  if (MAX_LEVEL > BASE_MAX_LEVEL + 1) {
    steps.push({
      ...base(),
      looking: null,
      line: 2,
      note: `A busca parou no nível ${BASE_MAX_LEVEL}, o topo atual. Do ${BASE_MAX_LEVEL + 1} para cima o update nunca foi tocado, e continua valendo o head que estava lá desde o começo. É por isso que o head nasce com ${MAX_LEVEL} ponteiros, e os outros nós não.`,
    });
  }

  const state: State = {
    set: (l, u, c, ml) => {
      linked = l;
      unlinked = u;
      onStage = c;
      maxLevel = ml;
    },
    get: () => ({ linked, unlinked, onStage, maxLevel }),
  };

  if (inserting) {
    buildInsert(steps, items, targetIdx, value, height, coins, update, base, state);
  } else {
    buildRemove(steps, items, targetIdx, value, update, base, vis, state);
  }

  return { items, targetIdx, targetHeight, steps };
}

// Handles de escrita do estado mutável do gerador. Existem só para as duas
// montagens abaixo poderem empurrar passos sem duplicar o corpo da busca.
type State = {
  set: (linked: number, unlinked: number, onStage: boolean, maxLevel: number) => void;
  get: () => { linked: number; unlinked: number; onStage: boolean; maxLevel: number };
};
type BaseStep = () => Omit<Step, "looking" | "line" | "note">;

function buildInsert(
  steps: Step[],
  items: Item[],
  newIdx: number,
  value: number,
  height: number,
  coins: Face[],
  update: number[],
  base: BaseStep,
  st: State
) {
  // A moeda: uma face por passo. A altura já veio decidida de fora para o
  // gerador continuar puro, mas a sequência de faces é a que produziria ela.
  for (const f of coinsFor(height)) {
    coins.push(f);
    const tossed = coins.length;
    steps.push({
      ...base(),
      looking: null,
      line: 9,
      note:
        f === "cara"
          ? `Lanço a moeda: cara. O ${value} sobe mais um degrau e já vai ocupar o nível ${tossed}. Jogo de novo.`
          : f === "coroa"
            ? `Lanço a moeda: coroa. Parei de subir. O ${value} vai ter altura ${height}, ou seja, ${height === 1 ? "só o nível 0" : `os níveis 0 a ${height - 1}`}.`
            : `Bati no teto de ${MAX_LEVEL} níveis, então nem lanço de novo. O ${value} fica com altura ${height}. O teto existe para a altura não fugir para o infinito.`,
    });
  }

  const before = st.get();
  const newTop = Math.max(before.maxLevel, height - 1);
  const grew = newTop > before.maxLevel;
  st.set(before.linked, before.unlinked, before.onStage, newTop);
  steps.push({
    ...base(),
    looking: null,
    line: 10,
    note: grew
      ? `A altura ${height} passou do topo que a lista tinha: nivel_max sobe de ${before.maxLevel} para ${newTop}. Os níveis novos nascem com o head apontando direto para o ${value}, porque não existe mais ninguém lá em cima.`
      : `A altura ${height} cabe nos níveis que já existiam, então nivel_max continua ${newTop}. Nada mais muda na estrutura.`,
  });

  st.set(0, 0, true, newTop);
  steps.push({
    ...base(),
    looking: newIdx,
    line: 11,
    note: `Crio o nó do ${value} com ${height} ${height === 1 ? "ponteiro" : "ponteiros"} forward, um por nível em que ele vai participar. Essa altura nunca mais muda: é sorteada uma vez, na inserção, e pronto.`,
  });

  for (let lv = 0; lv < height; lv++) {
    const cand = update[lv];
    const after = nextFrom(items, cand, lv, { target: newIdx, mode: "inserir", linked: lv, unlinked: 0 });
    steps.push({
      ...base(),
      looking: cand < 0 ? null : cand,
      line: 13,
      note: `Nível ${lv}, ponteiro 1 de 2: o ${value} passa a apontar para ${after === null ? "None" : `o ${items[after].value}`}, que era o próximo de ${nameOf(items, cand)} neste nível.`,
    });
    st.set(lv + 1, 0, true, newTop);
    steps.push({
      ...base(),
      looking: newIdx,
      line: 14,
      note: `Nível ${lv}, ponteiro 2 de 2: agora ${nameOf(items, cand)} aponta para o ${value}. Religado. Repare que só dois ponteiros mudaram, e nada mais na lista precisou se mexer.`,
    });
  }

  const pointers = BASE.reduce((s, b) => s + b.height, 0) + height;
  steps.push({
    ...base(),
    looking: newIdx,
    line: 14,
    done: true,
    ok: true,
    note: `Pronto: ${value} inserido com altura ${height}, mexendo em ${height * 2} ${height * 2 === 1 ? "ponteiro" : "ponteiros"}, dois por nível. Nenhuma rotação, nenhum rebalanceamento, e a lista continua ordenada com ${BASE.length + 1} elementos e ${pointers} ponteiros no total.`,
  });
}

function buildRemove(
  steps: Step[],
  items: Item[],
  targetIdx: number,
  value: number,
  update: number[],
  base: BaseStep,
  vis: () => Vis,
  st: State
) {
  const before = st.get();
  const candidate = nextFrom(items, update[0], 0, vis());
  const found = candidate !== null && candidate === targetIdx;

  steps.push({
    ...base(),
    looking: candidate,
    line: 9,
    note:
      candidate === null
        ? `Depois de ${nameOf(items, update[0])} não há mais nada no nível 0. O ${value} não está na lista.`
        : `Saí do laço em ${nameOf(items, update[0])}. O único candidato possível é o vizinho dele no nível 0, o ${items[candidate].value}.`,
  });

  if (!found) {
    steps.push({
      ...base(),
      looking: candidate,
      line: 11,
      done: true,
      error: true,
      note: `${candidate === null ? "Não há candidato" : `O candidato é o ${items[candidate].value}, e não o ${value}`}: o ${value} não está na lista, então devolvo False sem tocar em ponteiro nenhum. Remover o que não existe custa a mesma busca e mais nada.`,
    });
    return;
  }

  st.set(before.linked, 0, true, before.maxLevel);
  steps.push({
    ...base(),
    looking: targetIdx,
    line: 12,
    note: `Achei o ${value}, que vive nos níveis 0 a ${items[targetIdx].height - 1}. Agora desligo ele de baixo para cima, um nível por vez, usando os candidatos que o update guardou.`,
  });

  let unlinked = 0;
  for (let lv = 0; lv <= before.maxLevel; lv++) {
    const cand = update[lv];
    const v: Vis = { target: targetIdx, mode: "remover", linked: 0, unlinked };
    if (nextFrom(items, cand, lv, v) !== targetIdx) {
      const other = nextFrom(items, cand, lv, v);
      steps.push({
        ...base(),
        looking: cand < 0 ? null : cand,
        line: 14,
        note: `No nível ${lv}, quem vem depois de ${nameOf(items, cand)} é ${other === null ? "None" : `o ${items[other].value}`}, e não o ${value}. Sinal de que o ${value} nunca chegou a este andar, e como a altura é contínua de baixo para cima, também não chegou a nenhum acima. break: nada mais a desligar.`,
      });
      break;
    }
    const after = nextFrom(items, targetIdx, lv, v);
    unlinked = lv + 1;
    st.set(before.linked, unlinked, true, before.maxLevel);
    steps.push({
      ...base(),
      looking: cand < 0 ? null : cand,
      line: 15,
      note: `Nível ${lv}: ${nameOf(items, cand)} deixa de apontar para o ${value} e passa a apontar para ${after === null ? "None" : `o ${items[after].value}`}. Um ponteiro reescrito, e o ${value} sumiu deste nível.`,
    });
  }

  // Encolher o topo: enquanto o nível mais alto ficar sem ninguém, ele some.
  let maxLevel = before.maxLevel;
  const isEmpty = (lv: number) =>
    nextFrom(items, -1, lv, { target: targetIdx, mode: "remover", linked: 0, unlinked }) === null;
  const topBefore = maxLevel;
  while (maxLevel > 0 && isEmpty(maxLevel)) maxLevel--;
  st.set(before.linked, unlinked, true, maxLevel);
  steps.push({
    ...base(),
    looking: targetIdx,
    line: 16,
    note:
      maxLevel < topBefore
        ? `O ${value} era o único morador do nível ${topBefore}: agora head.forward[${topBefore}] é None e o andar ficou vazio, então nivel_max cai de ${topBefore} para ${maxLevel}. A lista encolheu de altura sem nenhum rebalanceamento.`
        : `O nível ${topBefore} continua com moradores, então nivel_max fica em ${maxLevel}. Só encolho o topo quando o andar mais alto esvazia.`,
  });

  const pointers = BASE.reduce((s, b) => s + b.height, 0) - items[targetIdx].height;
  steps.push({
    ...base(),
    looking: targetIdx,
    line: 18,
    done: true,
    ok: true,
    note: `Pronto: ${value} removido reescrevendo ${unlinked} ${unlinked === 1 ? "ponteiro" : "ponteiros"}, um por nível em que ele vivia. Repare na assimetria: inserir custa dois ponteiros por nível, remover custa um, porque o nó que sai não precisa ser religado a nada. Sobraram ${BASE.length - 1} elementos e ${pointers} ponteiros.`,
  });
}

type Preset = { key: string; label: string; value: number; height: number };
const PRESETS: Record<Mode, Preset[]> = {
  inserir: [
    { key: "meio", label: "Caso comum: inserir o 33 (altura 2)", value: 33, height: 2 },
    { key: "raso", label: "Só no nível 0: inserir o 80 (altura 1)", value: 80, height: 1 },
    { key: "teto", label: "Andar novo: inserir o 33 (altura 5)", value: 33, height: 5 },
    { key: "menor", label: "Menor que todos: inserir o 1 (altura 3)", value: 1, height: 3 },
  ],
  remover: [
    { key: "r-meio", label: "Caso comum: remover o 59 (altura 2)", value: 59, height: 2 },
    { key: "r-alto", label: "O mais alto: remover o 42 (altura 4)", value: 42, height: 4 },
    { key: "r-raso", label: "Só no nível 0: remover o 3", value: 3, height: 1 },
    { key: "r-nao", label: "Não existe: remover o 33", value: 33, height: 1 },
  ],
};

// --- layout do desenho -----------------------------------------------------
const GUT = 50;
const HEAD_W = 36;
const X0 = GUT + HEAD_W + 18;
const COL = 50;
const W = 34;
const H = 24;
const RH = 38;
const TOP = 12;

export function SkipListInsercao() {
  const [mode, setMode] = useState<Mode>("inserir");
  const [value, setValue] = useState(33);
  const [height, setHeight] = useState(2);
  const [preset, setPreset] = useState("meio");

  const { items, targetIdx, targetHeight, steps } = useMemo(
    () => generateSteps(mode, value, height),
    [mode, value, height]
  );
  const CODE = mode === "inserir" ? CODE_INSERT : CODE_REMOVE;
  const total = Math.max(1, steps.length);

  // --- desenho -------------------------------------------------------------
  const inserting = mode === "inserir";
  const top = inserting ? Math.max(BASE_MAX_LEVEL, height - 1) : BASE_MAX_LEVEL;
  const levels = top + 1;

  const viz = useVisualizer({
    title: `Visualizador · ${inserting ? "inserção: o rastro de candidatos e a moeda" : "remoção: o rastro, o break e o topo que encolhe"}`,
    total,
    // O que MAIS muda a altura da peça: o modo (troca o bloco da moeda pelo
    // texto da remoção e o código de 15 para 19 linhas), o número de níveis
    // desenhados, e o tamanho da linha do tempo, que liga e desliga o rodapé.
    measureOn: [mode, levels, total],
  });

  const p = steps[viz.step];

  const onValueChange = (v: string) => {
    viz.reset();
    setPreset("");
    setValue(parseInt(v, 10) || 0);
  };
  const onHeightChange = (v: number) => {
    viz.reset();
    setPreset("");
    setHeight(Math.min(MAX_LEVEL, Math.max(1, v)));
  };
  const applyPreset = (pr: Preset) => {
    viz.reset();
    setPreset(pr.key);
    setValue(pr.value);
    setHeight(pr.height);
  };
  const switchMode = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    applyPreset(PRESETS[m][0]);
  };
  // Math.random só aqui, num handler de clique. No render ele quebraria a
  // hidratação (o HTML do build sairia diferente do HTML do cliente).
  const rollHeight = () => {
    let h = 1;
    while (Math.random() < 0.5 && h < MAX_LEVEL) h++;
    viz.reset();
    setPreset("");
    setHeight(h);
  };

  const svgWidth = X0 + items.length * COL + 44;
  const svgHeight = TOP + top * RH + H + 14;

  const yOf = (level: number) => TOP + (top - level) * RH;
  const cyOf = (level: number) => yOf(level) + H / 2;
  const xOf = (i: number) => (i < 0 ? GUT : X0 + i * COL);
  const widthOf = (i: number) => (i < 0 ? HEAD_W : W);
  const cxOf = (i: number) => xOf(i) + widthOf(i) / 2;

  const vis: Vis = { target: targetIdx, mode, linked: p.linked, unlinked: p.unlinked };

  type Arrow = { k: string; x1: number; x2: number; y: number; isNew: boolean };
  const arrows: Arrow[] = [];
  const nones: { k: string; x: number; y: number }[] = [];
  for (let lv = 0; lv <= top; lv++) {
    const y = cyOf(lv);
    let previous = -1;
    let next = nextFrom(items, -1, lv, vis);
    let turns = 0;
    while (next !== null && turns++ < 40) {
      const touchesTarget = inserting && (next === targetIdx || previous === targetIdx);
      arrows.push({
        k: `s${lv}-${next}`,
        x1: xOf(previous) + widthOf(previous),
        x2: xOf(next) - 5,
        y,
        isNew: touchesTarget,
      });
      previous = next;
      next = nextFrom(items, previous, lv, vis);
    }
    const end = xOf(previous) + widthOf(previous);
    arrows.push({ k: `n${lv}`, x1: end, x2: end + 14, y, isNew: inserting && previous === targetIdx });
    nones.push({ k: `none${lv}`, x: end + 18, y });
  }

  const nodeColor = (i: number, lv: number) => {
    const neutral = { fill: "#0f1826", stroke: "rgba(255,255,255,0.13)", txt: "#8ba0bb", dashed: false };
    if (i === targetIdx) {
      if (inserting) {
        return lv >= p.linked
          ? { fill: "rgba(124,58,237,0.12)", stroke: "#7c3aed", txt: "#c4b5fd", dashed: true }
          : { fill: "rgba(52,211,153,0.24)", stroke: "#34d399", txt: "#eafff5", dashed: false };
      }
      if (lv < p.unlinked) return { fill: "transparent", stroke: "rgba(248,113,113,0.35)", txt: "#5b6b82", dashed: true };
      if (p.onStage) return { fill: "rgba(248,113,113,0.2)", stroke: "#f87171", txt: "#fecaca", dashed: false };
    }
    if (p.looking === i && p.current !== i)
      return { fill: "rgba(245,158,11,0.22)", stroke: "#f59e0b", txt: "#fff", dashed: false };
    if (p.current === i && p.level === lv)
      return { fill: "rgba(59,130,246,0.3)", stroke: "#3b82f6", txt: "#fff", dashed: false };
    if (p.update[lv] === i)
      return { fill: "rgba(59,130,246,0.12)", stroke: "rgba(59,130,246,0.6)", txt: "#cbd9ea", dashed: false };
    return neutral;
  };

  const headMarked =
    p.current < 0 || (inserting && p.onStage && p.update.some((u, lv) => u === -1 && lv < height));

  const variables = inserting
    ? [
        { name: "nivel", value: `${p.level}` },
        { name: "atual", value: p.current < 0 ? "head" : `${items[p.current].value}` },
        { name: "altura", value: p.onStage || p.coins.length ? `${height}` : "?" },
        { name: "nivel_max", value: `${p.maxLevel}`, best: true },
      ]
    : [
        { name: "nivel", value: `${p.level}` },
        { name: "atual", value: p.current < 0 ? "head" : `${items[p.current].value}` },
        { name: "alvo", value: p.onStage ? `${value}` : "?" },
        { name: "nivel_max", value: `${p.maxLevel}`, best: true },
      ];

  const stats = inserting
    ? [
        { k: "n", label: "elementos depois", value: `${BASE.length + (targetIdx >= 0 ? 1 : 0)}` },
        { k: "alt", label: "altura sorteada", value: p.coins.length ? `${height}` : "?" },
        { k: "pt", label: "ponteiros reescritos", value: `${p.linked * 2}` },
        { k: "niv", label: "níveis da lista", value: `${p.maxLevel + 1}` },
      ]
    : [
        { k: "n", label: "elementos depois", value: `${BASE.length - (targetIdx >= 0 ? 1 : 0)}` },
        { k: "alt", label: "altura do nó removido", value: targetIdx >= 0 ? `${targetHeight}` : "não existe" },
        { k: "pt", label: "ponteiros reescritos", value: `${p.unlinked}` },
        { k: "niv", label: "níveis da lista", value: `${p.maxLevel + 1}` },
      ];

  const noteClass = "viz-note" + (p.ok ? " ok" : p.error ? " invalid" : "");
  const description = inserting
    ? `Skip list com ${BASE.length} elementos, inserindo o ${value} com altura ${height}. A operação está no nível ${p.level}, em ${p.current < 0 ? "head" : items[p.current].value}, com ${p.linked} de ${height} níveis religados.`
    : `Skip list com ${BASE.length} elementos, removendo o ${value}. A operação está no nível ${p.level}, em ${p.current < 0 ? "head" : items[p.current].value}, com ${p.unlinked} de ${targetHeight} níveis desligados.`;

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="arr-tabs" style={{ marginBottom: 16 }}>
          <button
            className={`arr-tab${inserting ? " on" : ""}`}
            onClick={() => switchMode("inserir")}
            aria-pressed={inserting}
          >
            Inserir
          </button>
          <button
            className={`arr-tab${!inserting ? " on" : ""}`}
            onClick={() => switchMode("remover")}
            aria-pressed={!inserting}
          >
            Remover
          </button>
        </div>

        <div className="bigo-chips">
          {PRESETS[mode].map((pr) => (
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
          <label className="viz-field">
            <span>{inserting ? "inserir" : "remover"}</span>
            <input className="viz-input k" type="number" value={value} onChange={(e) => onValueChange(e.target.value)} />
          </label>
          {inserting ? (
            <>
              <label className="viz-field">
                <span>altura sorteada: {height}</span>
                <input
                  type="range"
                  min={1}
                  max={MAX_LEVEL}
                  step={1}
                  value={height}
                  onChange={(e) => onHeightChange(parseInt(e.target.value, 10))}
                  style={{ accentColor: "var(--ccc-accent)", width: 150 }}
                />
              </label>
              <button className="viz-btn" onClick={rollHeight}>
                Lançar a moeda
              </button>
            </>
          ) : (
            <div className="viz-field">
              <span>altura do nó</span>
              <span className="viz-var-val">
                {targetIdx >= 0 ? `${targetHeight} (níveis 0 a ${targetHeight - 1})` : "o valor não está na lista"}
              </span>
            </div>
          )}
        </div>

        <div className="sl-wrap">
          <svg
            className="sl-svg"
            width={Math.round(svgWidth)}
            height={Math.round(svgHeight)}
            viewBox={`0 0 ${Math.round(svgWidth)} ${Math.round(svgHeight)}`}
            role="img"
            aria-label={description}
          >
            <defs>
              <marker id="sli-seta" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" fill="#3a4a60" />
              </marker>
              <marker id="sli-seta-nova" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" fill="#34d399" />
              </marker>
            </defs>

            {arrows.map((s) => (
              <line
                key={s.k}
                x1={s.x1}
                y1={s.y}
                x2={s.x2}
                y2={s.y}
                stroke={s.isNew ? "#34d399" : "#3a4a60"}
                strokeWidth={s.isNew ? 2 : 1.5}
                markerEnd={s.isNew ? "url(#sli-seta-nova)" : "url(#sli-seta)"}
              />
            ))}

            {nones.map((o) => (
              <text
                key={o.k}
                x={o.x}
                y={o.y}
                fill="#4c5f79"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fontSize={10}
                dominantBaseline="central"
              >
                None
              </text>
            ))}

            {Array.from({ length: levels }, (_, k) => {
              const lv = top - k;
              return (
                <text
                  key={`r${lv}`}
                  x={GUT - 9}
                  y={cyOf(lv)}
                  fill={lv > p.maxLevel ? "#33455c" : "#61748c"}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fontSize={10.5}
                  textAnchor="end"
                  dominantBaseline="central"
                >
                  nível {lv}
                </text>
              );
            })}

            {/* head: o sentinela, sempre com MAX_NIVEL ponteiros forward. */}
            <rect
              x={xOf(-1)}
              y={yOf(top)}
              width={HEAD_W}
              height={top * RH + H}
              rx={7}
              fill={headMarked ? "rgba(59,130,246,0.22)" : "#111c2b"}
              stroke={headMarked ? "#3b82f6" : "rgba(255,255,255,0.16)"}
              strokeWidth={1.6}
            />
            <text
              x={cxOf(-1)}
              y={cyOf(top) + (top * RH) / 2}
              fill={headMarked ? "#fff" : "#7d8fa8"}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontSize={10.5}
              fontWeight={700}
              textAnchor="middle"
              dominantBaseline="central"
            >
              head
            </text>

            {items.map((node, i) =>
              Array.from({ length: node.height }, (_, lv) => {
                if (inserting && i === targetIdx && !p.onStage && lv >= p.linked) return null;
                const c = nodeColor(i, lv);
                return (
                  <g key={`${i}-${lv}`}>
                    <rect
                      x={xOf(i)}
                      y={yOf(lv)}
                      width={W}
                      height={H}
                      rx={6}
                      fill={c.fill}
                      stroke={c.stroke}
                      strokeWidth={1.6}
                      strokeDasharray={c.dashed ? "4 3" : undefined}
                    />
                    <text
                      x={cxOf(i)}
                      y={cyOf(lv)}
                      fill={c.txt}
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      fontSize={12.5}
                      fontWeight={600}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {node.value}
                    </text>
                  </g>
                );
              })
            )}
          </svg>
        </div>

        <div className="sl-painel">
          <div className="sl-painel-tit">
            update[] · o candidato de cada nível
            <em>o rastro que a busca deixa ao descer</em>
          </div>
          <div className="sl-update">
            {Array.from({ length: MAX_LEVEL }, (_, k) => {
              const lv = MAX_LEVEL - 1 - k;
              const v = p.update[lv];
              const used = inserting ? p.onStage && lv < height : lv < p.unlinked;
              const pending = !p.written[lv] && lv <= BASE_MAX_LEVEL;
              return (
                <span key={lv} className={`sl-slot${pending ? " pendente" : ""}${used ? " usado" : ""}`}>
                  <b>update[{lv}]</b>
                  {updateLabel(items, v)}
                </span>
              );
            })}
          </div>
        </div>

        {inserting ? (
          <div className="sl-painel">
            <div className="sl-painel-tit">
              A moeda · random() &lt; 0.5 sobe um nível
              <em>p = 0.5, teto de {MAX_LEVEL} níveis</em>
            </div>
            <div className="sl-moedas">
              {p.coins.length === 0 ? (
                <span className="sl-moeda vazia">ainda não lancei</span>
              ) : (
                p.coins.map((f, i) => (
                  <span key={i} className={`sl-moeda ${f}`}>
                    {f === "cara" ? "cara · sobe" : f === "coroa" ? "coroa · para" : "teto · para"}
                  </span>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="sl-painel">
            <div className="sl-painel-tit">
              Sem moeda na remoção
              <em>a altura é sorteada uma vez só, na inserção</em>
            </div>
            <p className="sl-azar">
              Remover não sorteia nada e não promove ninguém. Os vizinhos do nó que sai continuam exatamente com a
              altura que tiraram quando entraram, e é justamente isso que dispensa qualquer rebalanceamento.
            </p>
          </div>
        )}

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">skip_list.py</div>
              <div className="viz-code-body">
                {CODE.map((txt, i) => (
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
            {variables.map((v) => (
              <div className="viz-var" key={v.name}>
                <span className="viz-var-name">{v.name}</span>
                <span className={`viz-var-val${v.best ? " best" : ""}`}>{v.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bigo-stats">
          {stats.map((s) => (
            <div className="bigo-stat" key={s.k}>
              <span>{s.label}</span>
              <strong>{s.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(frame);
}
