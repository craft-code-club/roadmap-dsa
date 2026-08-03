"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LinhaDoTempo,
  eixoDe,
  escreverIntervalos,
  fmtIv,
  fmtLista,
  lerIntervalos,
} from "./IntervalsLinhaDoTempo";
import type { Intervalo, LinhaTL } from "./IntervalsLinhaDoTempo";

// ---------------------------------------------------------------------------
// IntervalsVisualizer, os três varreduras de intervalos numa linha do tempo.
//
// Mesmo padrão dos outros visualizadores do repo (gerador PURO de passos +
// a casca compartilhada), no formato do BigOCounterVisualizer: vários modos,
// cada um com o seu `codigo` e o seu `gerar`. Os três compartilham a mesma
// tela porque a lição é justamente que são a MESMA varredura com uma regra
// diferente na hora de decidir:
//
//   merge   ordena por início e funde quem encosta no bloco anterior
//   insert  não ordena nada (a lista já vem pronta) e resolve em três fases
//   greedy  ordena pelo FIM e fica com o máximo de intervalos sem conflito
//
// A linha tracejada na trilha é sempre a fronteira do teste (`fim` do bloco,
// `fim` do novo intervalo, `fim_anterior`), que é a única coisa que muda.
// ---------------------------------------------------------------------------

type Vars = { nome: string; valor: string; best?: boolean }[];

type Passo = {
  linha: number;
  ordem: number[];
  estados: Record<number, string>;
  saida: Intervalo[];
  bloco: Intervalo | null;
  guia: number | null;
  testes: number;
  cortados: number;
  nota: string;
  vars: Vars;
  ok?: boolean;
};

const CODIGO_MERGE = [
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

const CODIGO_INSERT = [
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

const CODIGO_GREEDY = [
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

function pl(n: number, um: string, muitos: string): string {
  return n === 1 ? um : muitos;
}

function copiar(ivs: Intervalo[]): Intervalo[] {
  return ivs.map((iv) => [iv[0], iv[1]] as Intervalo);
}

// --------------------------------- merge -----------------------------------

function gerarMerge(ivs: Intervalo[]): Passo[] {
  const out: Passo[] = [];
  const n = ivs.length;
  const idx = ivs.map((_, i) => i);
  const todos = (c: string): Record<number, string> => {
    const e: Record<number, string> = {};
    for (const i of idx) e[i] = c;
    return e;
  };

  if (n === 0) {
    out.push({
      linha: 2, ordem: [], estados: {}, saida: [], bloco: null, guia: null, testes: 0, cortados: 0,
      nota: "Lista vazia: devolvo [] antes de qualquer coisa. É o caso de borda que mais derruba submissão, porque intervalos[0] em lista vazia estoura.",
      vars: [{ nome: "intervalos", valor: "[]" }, { nome: "saida", valor: "[]" }],
    });
    return out;
  }

  const ord = [...idx].sort((a, b) => ivs[a][0] - ivs[b][0] || ivs[a][1] - ivs[b][1]);

  out.push({
    linha: 0, ordem: idx, estados: todos("espera"), saida: [], bloco: null, guia: null, testes: 0, cortados: 0,
    nota: n === 1
      ? "Entrada com um intervalo só: não existe par para comparar, então a resposta já é ele mesmo. Vale rodar mesmo assim para ver que nenhum teste chega a acontecer."
      : `Entrada como veio: ${n} intervalos, fora de ordem. Assim, qualquer um pode encostar em qualquer outro, e eu teria que comparar todos os pares.`,
    vars: [{ nome: "n", valor: `${n}` }, { nome: "saida[-1]", valor: "-" }, { nome: "len(saida)", valor: "0" }, { nome: "testes", valor: "0", best: true }],
  });

  out.push({
    linha: 3, ordem: ord, estados: todos("espera"), saida: [], bloco: null, guia: null, testes: 0, cortados: 0,
    nota: `Ordenei por início: ${fmtLista(ord.map((i) => ivs[i]))}. Com a lista assim, cada intervalo só pode encostar no bloco imediatamente anterior.`,
    vars: [{ nome: "n", valor: `${n}` }, { nome: "saida[-1]", valor: "-" }, { nome: "len(saida)", valor: "0" }, { nome: "testes", valor: "0", best: true }],
  });

  const estados = todos("espera");
  const saida: Intervalo[] = [];
  let bloco: Intervalo = [ivs[ord[0]][0], ivs[ord[0]][1]];
  let testes = 0;

  const vars = (atual: Intervalo | null): Vars => [
    { nome: "atual", valor: fmtIv(atual) },
    { nome: "saida[-1]", valor: fmtIv(bloco) },
    { nome: "len(saida)", valor: `${saida.length + 1}` },
    { nome: "testes", valor: `${testes}`, best: true },
  ];

  estados[ord[0]] = "usado";
  out.push({
    linha: 4, ordem: ord, estados: { ...estados }, saida: [], bloco: [bloco[0], bloco[1]], guia: bloco[1], testes, cortados: 0,
    nota: `Abro o primeiro bloco em ${fmtIv(bloco)}. A linha tracejada marca o fim dele: é contra ela que todo mundo vai ser testado.`,
    vars: vars(ivs[ord[0]]),
  });

  for (let k = 1; k < n; k++) {
    const i = ord[k];
    const ini = ivs[i][0];
    const fim = ivs[i][1];
    testes++;
    const encosta = ini <= bloco[1];

    out.push({
      linha: 6, ordem: ord, estados: { ...estados, [i]: "atual" }, saida: copiar(saida), bloco: [bloco[0], bloco[1]], guia: bloco[1], testes, cortados: 0,
      nota: `Teste ${testes}: o bloco termina em ${bloco[1]} e ${fmtIv(ivs[i])} começa em ${ini}. ${ini} <= ${bloco[1]}? ${encosta ? "Sim, os dois se sobrepõem." : "Não, este começa depois do bloco acabar."}`,
      vars: vars(ivs[i]),
    });

    estados[i] = "usado";
    if (encosta) {
      const antes = bloco[1];
      bloco = [bloco[0], Math.max(antes, fim)];
      out.push({
        linha: 7, ordem: ord, estados: { ...estados }, saida: copiar(saida), bloco: [bloco[0], bloco[1]], guia: bloco[1], testes, cortados: 0,
        nota: `Estico o bloco: fim = max(${antes}, ${fim}) = ${bloco[1]}, então o bloco virou ${fmtIv(bloco)}.${fim < antes ? " Repare no que o max acabou de salvar: este intervalo estava inteiro dentro do bloco, e sem o max eu teria encolhido o fim." : ""}`,
        vars: vars(ivs[i]),
      });
    } else {
      saida.push([bloco[0], bloco[1]]);
      const fechado = saida[saida.length - 1];
      bloco = [ini, fim];
      out.push({
        linha: 9, ordem: ord, estados: { ...estados }, saida: copiar(saida), bloco: [bloco[0], bloco[1]], guia: bloco[1], testes, cortados: 0,
        nota: `Fecho ${fmtIv(fechado)} para sempre: todo mundo que ainda falta começa em ${ini} ou mais tarde, então ninguém alcança mais esse bloco. Abro ${fmtIv(bloco)}.`,
        vars: vars(ivs[i]),
      });
    }
  }

  saida.push([bloco[0], bloco[1]]);
  const pares = (n * (n - 1)) / 2;
  out.push({
    linha: 10, ordem: ord, estados: todos("usado"), saida: copiar(saida), bloco: null, guia: null, testes, cortados: 0, ok: true,
    nota: `Fim: ${n} ${pl(n, "intervalo virou", "intervalos viraram")} ${saida.length}. ${testes === 0 ? "Nenhum teste de sobreposição aconteceu: com um intervalo só, o laço nem chega a rodar." : `Foram ${testes} ${pl(testes, "teste", "testes")} de sobreposição, contra ${pares} ${pl(pares, "comparação", "comparações")} se eu tivesse olhado todos os pares.`}`,
    vars: [
      { nome: "atual", valor: "-" },
      { nome: "saida[-1]", valor: fmtIv(saida[saida.length - 1]) },
      { nome: "len(saida)", valor: `${saida.length}` },
      { nome: "testes", valor: `${testes}`, best: true },
    ],
  });
  return out;
}

// --------------------------------- insert ----------------------------------

function gerarInsert(ivs: Intervalo[], novo: Intervalo): Passo[] {
  const out: Passo[] = [];
  const n = ivs.length;
  const idx = ivs.map((_, i) => i);
  const estados: Record<number, string> = {};
  for (const i of idx) estados[i] = "espera";

  const saida: Intervalo[] = [];
  let ini = novo[0];
  let fim = novo[1];
  let testes = 0;
  let i = 0;

  const vars = (): Vars => [
    { nome: "i", valor: `${i}` },
    { nome: "novo", valor: fmtIv([ini, fim]) },
    { nome: "len(saida)", valor: `${saida.length}` },
    { nome: "comparações", valor: `${testes}`, best: true },
  ];

  const passo = (linha: number, nota: string, est: Record<number, string>, comBloco = true): Passo => ({
    linha, ordem: idx, estados: est, saida: copiar(saida), bloco: comBloco ? [ini, fim] : null,
    guia: comBloco ? fim : null, testes, cortados: 0, nota, vars: vars(),
  });

  out.push(passo(1, `Quero encaixar ${fmtIv([ini, fim])} numa lista que já chega ordenada e sem sobreposição. Como a ordem veio pronta, não pago O(n log n) nenhum: uma passada resolve.`, { ...estados }));

  // Fase 1: tudo que termina antes do novo começar sai copiado.
  while (i < n) {
    testes++;
    const antes = ivs[i][1] < ini;
    out.push(passo(3, `Fase 1, comparação ${testes}: ${fmtIv(ivs[i])} termina em ${ivs[i][1]} e o novo começa em ${ini}. ${ivs[i][1]} < ${ini}? ${antes ? "Sim, acaba antes de o novo nascer." : "Não, este já alcança o novo. A fase 1 termina aqui."}`, { ...estados, [i]: "atual" }));
    if (!antes) break;
    saida.push([ivs[i][0], ivs[i][1]]);
    estados[i] = "usado";
    const copiado = ivs[i];
    i++;
    out.push(passo(4, `Copio ${fmtIv(copiado)} para a saída sem tocar nele. Ele não briga com ninguém.`, { ...estados }));
  }

  // Fase 2: tudo que encosta é absorvido pelo novo intervalo.
  while (i < n) {
    testes++;
    const toca = ivs[i][0] <= fim;
    out.push(passo(6, `Fase 2, comparação ${testes}: ${fmtIv(ivs[i])} começa em ${ivs[i][0]} e o novo termina em ${fim}. ${ivs[i][0]} <= ${fim}? ${toca ? "Sim, sobrepõe: vou engolir este." : "Não, este começa depois. A fase 2 termina aqui."}`, { ...estados, [i]: "atual" }));
    if (!toca) break;
    const iniAntes = ini;
    const fimAntes = fim;
    const comido = ivs[i];
    ini = Math.min(ini, comido[0]);
    fim = Math.max(fim, comido[1]);
    estados[i] = "comido";
    i++;
    out.push(passo(8, `Engulo ${fmtIv(comido)}: inicio = min(${iniAntes}, ${comido[0]}) = ${ini} e fim = max(${fimAntes}, ${comido[1]}) = ${fim}. O novo cresceu para ${fmtIv([ini, fim])}.`, { ...estados }));
  }

  saida.push([ini, fim]);
  out.push(passo(10, `Empurro ${fmtIv([ini, fim])} para a saída. Ele já absorveu tudo que encostava nele, então nunca mais vai mudar.`, { ...estados }, false));

  // Fase 3: o rabo da lista entra inteiro, sem comparação nenhuma.
  const sobrou = n - i;
  while (i < n) {
    const resto = ivs[i];
    saida.push([resto[0], resto[1]]);
    estados[i] = "usado";
    i++;
    out.push(passo(12, `Fase 3: ${fmtIv(resto)} começa depois do novo terminar. Copio direto, sem comparar: a lista está ordenada, então daqui para frente é tudo mais tarde ainda.`, { ...estados }, false));
  }

  const fin = passo(14, `Fim: a lista de ${n} ${pl(n, "intervalo", "intervalos")} virou ${saida.length}. Foram ${testes} ${pl(testes, "comparação", "comparações")} e zero ordenações${sobrou > 0 ? `, e as últimas ${sobrou} ${pl(sobrou, "cópia foi feita", "cópias foram feitas")} sem teste nenhum` : ""}.`, { ...estados }, false);
  fin.ok = true;
  out.push(fin);
  return out;
}

// --------------------------------- greedy ----------------------------------

function gerarGreedy(ivs: Intervalo[]): Passo[] {
  const out: Passo[] = [];
  const n = ivs.length;
  const idx = ivs.map((_, i) => i);
  const todos = (c: string): Record<number, string> => {
    const e: Record<number, string> = {};
    for (const i of idx) e[i] = c;
    return e;
  };

  if (n === 0) {
    out.push({
      linha: 8, ordem: [], estados: {}, saida: [], bloco: null, guia: null, testes: 0, cortados: 0,
      nota: "Lista vazia: dá para encaixar zero intervalos. Devolvo [].",
      vars: [{ nome: "escolhidos", valor: "0" }],
    });
    return out;
  }

  const ord = [...idx].sort((a, b) => ivs[a][1] - ivs[b][1] || ivs[a][0] - ivs[b][0]);

  out.push({
    linha: 0, ordem: idx, estados: todos("espera"), saida: [], bloco: null, guia: null, testes: 0, cortados: 0,
    nota: `${n} intervalos concorrendo pelo mesmo recurso. Quero ficar com o máximo possível deles sem que dois se sobreponham.`,
    vars: [{ nome: "fim_anterior", valor: "-inf" }, { nome: "escolhidos", valor: "0" }, { nome: "descartados", valor: "0" }, { nome: "testes", valor: "0", best: true }],
  });

  out.push({
    linha: 1, ordem: ord, estados: todos("espera"), saida: [], bloco: null, guia: null, testes: 0, cortados: 0,
    nota: `Ordenei pelo FIM, não pelo início: ${fmtLista(ord.map((i) => ivs[i]))}. Quem termina mais cedo é quem deixa mais espaço livre para os próximos.`,
    vars: [{ nome: "fim_anterior", valor: "-inf" }, { nome: "escolhidos", valor: "0" }, { nome: "descartados", valor: "0" }, { nome: "testes", valor: "0", best: true }],
  });

  const estados = todos("espera");
  const saida: Intervalo[] = [];
  let fimAnterior: number | null = null;
  let testes = 0;
  let cortados = 0;

  const vars = (): Vars => [
    { nome: "fim_anterior", valor: fimAnterior == null ? "-inf" : `${fimAnterior}` },
    { nome: "escolhidos", valor: `${saida.length}` },
    { nome: "descartados", valor: `${cortados}` },
    { nome: "testes", valor: `${testes}`, best: true },
  ];

  for (let k = 0; k < n; k++) {
    const i = ord[k];
    const ini = ivs[i][0];
    const fim = ivs[i][1];
    testes++;
    const cabe = fimAnterior == null || ini >= fimAnterior;

    out.push({
      linha: 5, ordem: ord, estados: { ...estados, [i]: "atual" }, saida: copiar(saida), bloco: null, guia: fimAnterior, testes, cortados,
      nota: `Teste ${testes}: ${fmtIv(ivs[i])} começa em ${ini} e o último escolhido terminou em ${fimAnterior == null ? "menos infinito (ainda não escolhi nada)" : fimAnterior}. ${ini} >= ${fimAnterior == null ? "-inf" : fimAnterior}? ${cabe ? "Sim, cabe sem conflito." : "Não, ele invade o anterior."}`,
      vars: vars(),
    });

    if (cabe) {
      saida.push([ini, fim]);
      fimAnterior = fim;
      estados[i] = "usado";
      out.push({
        linha: 6, ordem: ord, estados: { ...estados }, saida: copiar(saida), bloco: null, guia: fimAnterior, testes, cortados,
        nota: `Pego ${fmtIv(ivs[i])}. Agora fim_anterior = ${fim}, e a tracejada anda junto: é a nova fronteira.`,
        vars: vars(),
      });
    } else {
      cortados++;
      estados[i] = "corta";
      out.push({
        linha: 4, ordem: ord, estados: { ...estados }, saida: copiar(saida), bloco: null, guia: fimAnterior, testes, cortados,
        nota: `Descarto ${fmtIv(ivs[i])}. Trocá-lo pelo que já escolhi nunca melhora a conta: o que escolhi termina antes ou junto, então deixa pelo menos tanto espaço quanto ele.`,
        vars: vars(),
      });
    }
  }

  out.push({
    linha: 8, ordem: ord, estados: { ...estados }, saida: copiar(saida), bloco: null, guia: fimAnterior, testes, cortados, ok: true,
    nota: `Fim: ${saida.length} de ${n} ${pl(n, "intervalo cabe", "intervalos cabem")} sem conflito, ${cortados} ${pl(cortados, "sobra de fora", "sobram de fora")}. Para o LeetCode 435, a resposta é justamente esse ${cortados}.`,
    vars: vars(),
  });
  return out;
}

// --------------------------------- modos -----------------------------------

type Preset = { nome: string; ivs: string; novo?: string };

type Modo = {
  key: "merge" | "insert" | "greedy";
  nome: string;
  familia: string;
  cor: string;
  arquivo: string;
  rodape: string;
  codigo: string[];
  usaNovo: boolean;
  rotuloSaida: string;
  presets: Preset[];
};

const MODOS: Modo[] = [
  {
    key: "merge",
    nome: "funde quem encosta",
    familia: "Merge",
    cor: "#3b82f6",
    arquivo: "merge_intervals.py",
    rodape: "ordena por início · O(n log n)",
    codigo: CODIGO_MERGE,
    usaNovo: false,
    rotuloSaida: "saída",
    presets: [
      { nome: "Caso base", ivs: "[13,16], [1,4], [8,10], [2,6], [9,12], [17,18]" },
      { nome: "Tudo vira um", ivs: "[1,4], [3,7], [6,10], [9,12]" },
      { nome: "Nada funde", ivs: "[1,2], [3,4], [5,6], [7,8]" },
      { nome: "Só encostam", ivs: "[1,3], [3,5], [5,7]" },
      { nome: "Um dentro do outro", ivs: "[1,10], [2,3], [4,5], [11,12]" },
      { nome: "Um intervalo só", ivs: "[5,9]" },
      { nome: "Lista vazia", ivs: "" },
    ],
  },
  {
    key: "insert",
    nome: "encaixa um novo",
    familia: "Insert",
    cor: "#f59e0b",
    arquivo: "insert_interval.py",
    rodape: "não ordena nada · O(n)",
    codigo: CODIGO_INSERT,
    usaNovo: true,
    rotuloSaida: "saída",
    presets: [
      { nome: "Engole dois", ivs: "[1,3], [6,9], [12,16]", novo: "[7,13]" },
      { nome: "Não toca ninguém", ivs: "[1,3], [6,9], [12,16]", novo: "[4,5]" },
      { nome: "Vai para o fim", ivs: "[1,3], [6,9], [12,16]", novo: "[20,25]" },
      { nome: "Engole tudo", ivs: "[1,3], [6,9], [12,16]", novo: "[0,20]" },
      { nome: "Lista vazia", ivs: "", novo: "[4,8]" },
    ],
  },
  {
    key: "greedy",
    nome: "máximo sem conflito",
    familia: "Greedy",
    cor: "#34d399",
    arquivo: "interval_scheduling.py",
    rodape: "ordena pelo fim · O(n log n)",
    codigo: CODIGO_GREEDY,
    usaNovo: false,
    rotuloSaida: "escolhidos",
    presets: [
      { nome: "Caso base", ivs: "[13,16], [1,4], [8,10], [2,6], [9,12], [17,18]" },
      { nome: "Pelo início falharia", ivs: "[1,10], [2,3], [4,5], [6,7]" },
      { nome: "Todos em cima", ivs: "[1,5], [2,6], [3,7], [4,8]" },
      { nome: "Cadeia perfeita", ivs: "[1,3], [3,5], [5,7], [7,9]" },
    ],
  },
];

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

function temSobreposicao(ivs: Intervalo[]): boolean {
  for (let i = 1; i < ivs.length; i++) {
    if (ivs[i][0] <= ivs[i - 1][1]) return true;
  }
  return false;
}

/**
 * `modo` só escolhe com qual varredura o visualizador ABRE. O artigo usa o
 * mesmo componente três vezes, cada vez na seção que ensina aquele modo, e o
 * aluno continua podendo trocar pelos chips.
 */
export function IntervalsVisualizer({ modo: modoInicial = "merge" }: { modo?: Modo["key"] } = {}) {
  const iInicial = Math.max(0, MODOS.findIndex((m) => m.key === modoInicial));
  const [iModo, setIModo] = useState(iInicial);
  const [entrada, setEntrada] = useState(MODOS[iInicial].presets[0].ivs);
  const [entradaNovo, setEntradaNovo] = useState(
    MODOS.find((m) => m.key === "insert")?.presets[0].novo ?? "[7,13]"
  );
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const modo = MODOS[iModo];

  // O Insert pressupõe a lista já ordenada, então aqui ela chega ordenada por
  // início: é o contrato do problema, não uma etapa do algoritmo.
  const ivs = useMemo(() => {
    const lidos = lerIntervalos(entrada);
    return modo.key === "insert" ? [...lidos].sort((a, b) => a[0] - b[0] || a[1] - b[1]) : lidos;
  }, [entrada, modo.key]);

  const novo = useMemo<Intervalo>(() => {
    const lido = lerIntervalos(entradaNovo, 1);
    return lido.length ? lido[0] : [0, 0];
  }, [entradaNovo]);

  const passos = useMemo(() => {
    if (modo.key === "merge") return gerarMerge(ivs);
    if (modo.key === "greedy") return gerarGreedy(ivs);
    return gerarInsert(ivs, novo);
  }, [modo.key, ivs, novo]);

  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];
  const n = ivs.length;

  const eixo = useMemo(() => {
    const vals: number[] = [];
    for (const iv of ivs) { vals.push(iv[0], iv[1]); }
    if (modo.usaNovo) vals.push(novo[0], novo[1]);
    if (!vals.length) vals.push(0, 10);
    return eixoDe(vals);
  }, [ivs, novo, modo.usaNovo]);

  const parar = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  }, []);
  useEffect(() => () => parar(), [parar]);

  useEffect(() => {
    parar();
    if (!tocando) return;
    timer.current = setInterval(() => setPasso((s) => (s >= total - 1 ? s : s + 1)), VELOCIDADES[velocidade]);
    return parar;
  }, [tocando, velocidade, total, parar]);

  useEffect(() => {
    if (tocando && idx >= total - 1) setTocando(false);
  }, [tocando, idx, total]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const reiniciar = useCallback(() => { parar(); setTocando(false); setPasso(0); }, [parar]);

  const trocarModo = (i: number) => {
    reiniciar();
    setIModo(i);
    const pr = MODOS[i].presets[0];
    setEntrada(pr.ivs);
    if (pr.novo) setEntradaNovo(pr.novo);
  };

  const aplicarPreset = (pr: Preset) => {
    reiniciar();
    setEntrada(pr.ivs);
    if (pr.novo) setEntradaNovo(pr.novo);
  };

  // Math.random só no handler, nunca no render: o HTML do build e o do cliente
  // precisam bater na hidratação.
  const sortear = () => {
    const qtd = 4 + Math.floor(Math.random() * 3);
    const gerados: Intervalo[] = [];
    for (let i = 0; i < qtd; i++) {
      const ini = Math.floor(Math.random() * 16);
      gerados.push([ini, ini + 1 + Math.floor(Math.random() * 5)]);
    }
    reiniciar();
    if (modo.key === "insert") {
      const ordenados = [...gerados].sort((a, b) => a[0] - b[0]);
      const limpos: Intervalo[] = [];
      for (const iv of ordenados) {
        if (!limpos.length || iv[0] > limpos[limpos.length - 1][1]) limpos.push(iv);
      }
      setEntrada(escreverIntervalos(limpos));
      const ini = Math.floor(Math.random() * 14);
      setEntradaNovo(`[${ini},${ini + 2 + Math.floor(Math.random() * 6)}]`);
      return;
    }
    setEntrada(escreverIntervalos(gerados));
  };

  const linhasTL: LinhaTL[] = [
    ...p.ordem.map((i) => ({
      chave: `iv${i}`,
      rotulo: fmtIv(ivs[i]),
      barras: [{ chave: `b${i}`, inicio: ivs[i][0], fim: ivs[i][1], classe: p.estados[i] ?? "espera", texto: `${ivs[i][0]},${ivs[i][1]}` }],
    })),
    ...(modo.usaNovo
      ? [{
          chave: "novo",
          rotulo: "novo",
          barras: p.bloco ? [{ chave: "nv", inicio: p.bloco[0], fim: p.bloco[1], classe: "novo", texto: `${p.bloco[0]},${p.bloco[1]}` }] : [],
        }]
      : []),
    {
      chave: "saida",
      rotulo: modo.rotuloSaida,
      barras: [
        ...p.saida.map((s, k) => ({ chave: `s${k}`, inicio: s[0], fim: s[1], classe: "pronto", texto: `${s[0]},${s[1]}` })),
        ...(modo.key === "merge" && p.bloco
          ? [{ chave: "bloco", inicio: p.bloco[0], fim: p.bloco[1], classe: "bloco", texto: `${p.bloco[0]},${p.bloco[1]}` }]
          : []),
      ],
    },
  ];

  const stats =
    modo.key === "merge"
      ? [
          { rot: "intervalos na entrada", val: `${n}` },
          { rot: "blocos na saída", val: `${p.saida.length + (p.bloco ? 1 : 0)}` },
          { rot: "testes de sobreposição", val: `${p.testes}` },
          { rot: "todos os pares seriam", val: `${(n * (n - 1)) / 2}` },
        ]
      : modo.key === "insert"
        ? [
            { rot: "intervalos na lista", val: `${n}` },
            { rot: "intervalos na saída", val: `${p.saida.length}` },
            { rot: "comparações", val: `${p.testes}` },
            { rot: "ordenações", val: "0" },
          ]
        : [
            { rot: "intervalos na entrada", val: `${n}` },
            { rot: "escolhidos", val: `${p.saida.length}` },
            { rot: "descartados", val: `${p.cortados}` },
            { rot: "testes", val: `${p.testes}` },
          ];

  const avisoInsert = modo.key === "insert" && temSobreposicao(ivs);
  const notaCls = "viz-note" + (p.ok ? " ok" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);
  const resultado = p.saida.length
    ? fmtLista(p.saida) + (modo.key === "merge" && p.bloco ? ` ${fmtIv(p.bloco)}` : "")
    : modo.key === "merge" && p.bloco
      ? fmtIv(p.bloco)
      : "ainda vazia";

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" style={{ background: modo.cor }} />
          <span>Visualizador · varrendo intervalos na linha do tempo</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">passo {idx + 1} de {total}</span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "✕ Fechar" : "⤢ Expandir"}
          </button>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          {MODOS.map((m, i) => {
            const on = i === iModo;
            return (
              <button
                key={m.key}
                className={`bigo-chip${on ? " on" : ""}`}
                style={on ? { borderColor: m.cor, color: m.cor } : undefined}
                onClick={() => trocarModo(i)}
                aria-pressed={on}
              >
                <span className="sw" style={{ background: on ? m.cor : "#3a4a60" }} />
                {m.familia} · {m.nome}
              </button>
            );
          })}
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Intervalos</span>
            <input
              className="viz-input"
              value={entrada}
              onChange={(e) => { reiniciar(); setEntrada(e.target.value); }}
              placeholder="[1,4], [2,6], [8,10]"
            />
          </label>
          {modo.usaNovo && (
            <label className="viz-field">
              <span>novo</span>
              <input
                className="viz-input"
                style={{ width: 96 }}
                value={entradaNovo}
                onChange={(e) => { reiniciar(); setEntradaNovo(e.target.value); }}
              />
            </label>
          )}
          <button className="viz-btn" onClick={sortear}>Sortear</button>
        </div>

        <div className="iv-presets">
          <span className="iv-presets-lbl">Cenários</span>
          {modo.presets.map((pr) => (
            <button
              key={pr.nome}
              className={`iv-preset${entrada === pr.ivs && (!pr.novo || entradaNovo === pr.novo) ? " on" : ""}`}
              onClick={() => aplicarPreset(pr)}
            >
              {pr.nome}
            </button>
          ))}
        </div>

        {avisoInsert && (
          <p className="viz-note invalid">
            Esta lista tem sobreposição entre os próprios intervalos. O Insert Interval pressupõe que ela chegue limpa,
            então rode o modo Merge antes para ver o que aconteceria de verdade.
          </p>
        )}

        <LinhaDoTempo
          linhas={linhasTL}
          min={eixo.min}
          max={eixo.max}
          marcas={eixo.marcas}
          guia={p.guia}
          guiaVerde={modo.key !== "insert"}
        />

        <div className="iv-saida">
          <span className="iv-saida-lbl">{modo.rotuloSaida}</span>
          <span className="iv-saida-val">{resultado}</span>
        </div>

        <div className="bigo-stats">
          {stats.map((s) => (
            <div className="bigo-stat" key={s.rot}>
              <span>{s.rot}</span>
              <strong style={{ color: modo.cor }}>{s.val}</strong>
            </div>
          ))}
        </div>

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">{modo.arquivo} · {modo.rodape}</div>
            <div className="viz-code-body">
              {modo.codigo.map((txt, i) => (
                <div key={i} className={`viz-line${i === p.linha ? " on" : ""}`}>
                  <span className="ln">{i + 1}</span>
                  {txt}
                </div>
              ))}
            </div>
          </div>
          <div className="viz-vars">
            <div className="viz-vars-head">Variáveis</div>
            {p.vars.map((v) => (
              <div className="viz-var" key={v.nome}>
                <span className="viz-var-name">{v.nome}</span>
                <span className={`viz-var-val${v.best ? " best" : ""}`}>{v.valor}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="viz-controls">
          <button className="viz-btn" title="Reiniciar" onClick={reiniciar}>↺</button>
          <button className="viz-btn" disabled={idx === 0} onClick={() => { parar(); setTocando(false); setPasso(Math.max(0, idx - 1)); }}>‹ Anterior</button>
          <button className="viz-play" onClick={() => { if (tocando) { setTocando(false); return; } setPasso(idx >= total - 1 ? 0 : idx); setTocando(true); }}>
            {tocando ? "❚❚ Pausar" : "▶ Rodar"}
          </button>
          <button className="viz-btn" disabled={idx === total - 1} onClick={() => { parar(); setTocando(false); setPasso(Math.min(idx + 1, total - 1)); }}>Próximo ›</button>
          <div className="viz-speed">
            <span>Velocidade</span>
            <input type="range" min={1} max={5} step={1} value={velocidade} onChange={(e) => setVelocidade(parseInt(e.target.value, 10))} />
            <span className="val">{ROTULOS_VEL[velocidade]}</span>
          </div>
        </div>
        <div className="viz-progress"><div className="viz-progress-fill" style={{ width: `${pctPasso}%`, background: modo.cor }} /></div>
      </div>
    </figure>
  );

  if (expanded && mounted) {
    return createPortal(
      <div className="viz-overlay" onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false); }}>
        {viz}
      </div>,
      document.body
    );
  }
  return viz;
}
