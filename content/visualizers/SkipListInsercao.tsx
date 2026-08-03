"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// SkipListInsercao, as duas operações que mexem na estrutura: inserir e remover.
//
// A busca (SkipListVisualizer) mostra o benefício dos níveis. Este mostra o
// preço e o truque: para inserir ou remover é preciso guardar, nível a nível,
// quem é o vizinho da esquerda do nó afetado (o vetor `update`, o "bread crumb"
// que a galera batizou no encontro), e só então religar os ponteiros.
//
// Quatro coisas que o aluno precisa enxergar acontecendo:
//   1. o update[] enchendo, um candidato por nível, sempre que a busca desce;
//   2. a moeda decidindo a altura, e a altura sendo sorteada UMA vez só;
//   3. os níveis acima do topo atual, onde o candidato já era o head. Foi a
//      dúvida que mais tomou tempo do encontro, e ela só fecha vendo;
//   4. na remoção, o `break`: o primeiro nível em que o candidato não aponta
//      para o alvo encerra o trabalho, porque a altura é contínua de baixo
//      para cima. E a assimetria do custo: inserir reescreve 2 ponteiros por
//      nível, remover reescreve 1.
//
// O gerador é puro: recebe (modo, valor, altura) e devolve sempre os mesmos
// passos. O sorteio real de altura acontece num handler de clique, nunca no
// render.
// ---------------------------------------------------------------------------

type Modo = "inserir" | "remover";
type Item = { valor: number; altura: number; novo?: boolean };
type Face = "cara" | "coroa" | "teto";

type Passo = {
  nivel: number;
  atual: number; // índice em `itens`, -1 = head
  olhando: number | null;
  update: number[]; // por nível: índice do candidato, -1 = head (o valor inicial)
  escrito: boolean[]; // se a busca já passou por aquele nível e gravou o candidato
  ligados: number; // quantos níveis do nó novo já foram religados (inserção)
  desligados: number; // quantos níveis do nó alvo já saíram (remoção)
  moedas: Face[];
  emCena: boolean; // o nó em foco já apareceu (criado na inserção, achado na remoção)
  nivelMax: number;
  linha: number;
  fim?: boolean;
  ok?: boolean;
  erro?: boolean;
  nota: string;
};

// As linhas mapeiam 1:1 com o campo `linha` de cada passo, então a ordem e a
// quantidade de linhas não podem mudar sem ajustar o gerador junto.
const CODIGO_INSERIR = [
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

const CODIGO_REMOVER = [
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

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

const MAX_NIVEL = 5; // teto de altura de um nó: níveis 0 a 4

// Base com a pirâmide de livro: 10 nós no nível 0, 6 no 1, 3 no 2 e 1 no 3.
// O 33, o 80 e o 1 ficam de fora de propósito, são os buracos para inserir.
const BASE: Item[] = [
  { valor: 3, altura: 1 },
  { valor: 9, altura: 3 },
  { valor: 17, altura: 1 },
  { valor: 23, altura: 2 },
  { valor: 31, altura: 1 },
  { valor: 42, altura: 4 },
  { valor: 50, altura: 1 },
  { valor: 59, altura: 2 },
  { valor: 73, altura: 3 },
  { valor: 92, altura: 2 },
];

const NIVEL_MAX_BASE = Math.max(...BASE.map((b) => b.altura)) - 1; // 3

// A sequência de moedas que produz aquela altura: (altura - 1) caras e uma
// coroa. Quando a altura bate no teto, a última moeda nem é lançada.
function moedasDe(altura: number): Face[] {
  const out: Face[] = [];
  for (let i = 1; i < altura; i++) out.push("cara");
  out.push(altura >= MAX_NIVEL ? "teto" : "coroa");
  return out;
}

function nomeDe(itens: Item[], i: number): string {
  return i < 0 ? "o head" : `o ${itens[i].valor}`;
}

function rotuloUpdate(itens: Item[], v: number): string {
  return v < 0 ? "head" : `${itens[v].valor}`;
}

// Estado de visibilidade do nó em foco, que é o que faz o desenho animar a
// religação. Na inserção ele ainda não existe nos níveis acima de `ligados`;
// na remoção ele já saiu dos níveis abaixo de `desligados`.
type Vis = { alvo: number; modo: Modo; ligados: number; desligados: number };

function escondido(j: number, nivel: number, v: Vis): boolean {
  if (j !== v.alvo) return false;
  return v.modo === "inserir" ? nivel >= v.ligados : nivel < v.desligados;
}

// O próximo nó de `i` no nível `nivel`, respeitando o que já está ligado.
function proximo(itens: Item[], i: number, nivel: number, v: Vis): number | null {
  for (let j = i + 1; j < itens.length; j++) {
    if (escondido(j, nivel, v)) continue;
    if (itens[j].altura > nivel) return j;
  }
  return null;
}

type Saida = { itens: Item[]; idxAlvo: number; alturaAlvo: number; passos: Passo[] };

function gerarPassos(modo: Modo, valor: number, altura: number): Saida {
  const jaExiste = BASE.some((b) => b.valor === valor);
  const inserindo = modo === "inserir";

  // Na inserção o nó entra na lista; na remoção ele já estava lá.
  const idxAlvo = inserindo
    ? jaExiste
      ? -1
      : BASE.filter((b) => b.valor < valor).length
    : BASE.findIndex((b) => b.valor === valor);

  const itens: Item[] =
    inserindo && !jaExiste
      ? [
          ...BASE.slice(0, idxAlvo).map((b) => ({ ...b })),
          { valor, altura, novo: true },
          ...BASE.slice(idxAlvo).map((b) => ({ ...b })),
        ]
      : BASE.map((b) => ({ ...b }));

  const alturaAlvo = inserindo ? altura : idxAlvo >= 0 ? BASE[idxAlvo].altura : 0;

  // Nasce todo apontando para o head, igual ao `[self.head] * MAX_NIVEL` do código.
  const update: number[] = Array.from({ length: MAX_NIVEL }, () => -1);
  const escrito: boolean[] = Array.from({ length: MAX_NIVEL }, () => false);
  const moedas: Face[] = [];
  let nivel = NIVEL_MAX_BASE;
  let atual = -1;
  let ligados = 0;
  let desligados = 0;
  let emCena = false;
  let nivelMax = NIVEL_MAX_BASE;

  const vis = (): Vis => ({ alvo: idxAlvo, modo, ligados, desligados });
  const base = () => ({
    nivel,
    atual,
    update: [...update],
    escrito: [...escrito],
    ligados,
    desligados,
    moedas: [...moedas],
    emCena,
    nivelMax,
  });

  if (inserindo && jaExiste) {
    return {
      itens,
      idxAlvo,
      alturaAlvo,
      passos: [
        {
          ...base(),
          olhando: null,
          linha: 0,
          fim: true,
          erro: true,
          nota: `O ${valor} já está nesta lista, e esta implementação didática não aceita repetidos. Troque o valor: o 33, o 80 e o 1 são os buracos interessantes.`,
        },
      ],
    };
  }

  const passos: Passo[] = [];
  passos.push({
    ...base(),
    olhando: null,
    linha: 2,
    nota: inserindo
      ? `Antes de andar, crio o vetor update com ${MAX_NIVEL} posições, todas apontando para o head. Ele vai guardar, nível a nível, quem é o vizinho da esquerda do ${valor}.`
      : `Remover começa com a mesma busca da inserção, e pelo mesmo motivo: preciso do update, um candidato por nível, para saber quem vai passar a apontar por cima do ${valor} depois que ele sair.`,
  });

  // --- a busca, idêntica nas duas operações --------------------------------
  let guarda = 0;
  while (nivel >= 0 && guarda++ < 300) {
    const prox = proximo(itens, atual, nivel, vis());
    if (prox === null) {
      passos.push({
        ...base(),
        olhando: null,
        linha: 4,
        nota: `No nível ${nivel} não há ninguém depois de ${nomeDe(itens, atual)}: o ponteiro é None. Não dá para andar mais aqui.`,
      });
    } else if (itens[prox].valor < valor) {
      passos.push({
        ...base(),
        olhando: prox,
        linha: 5,
        nota: `${itens[prox].valor} < ${valor}: ainda dá para avançar no nível ${nivel} sem passar do lugar do ${valor}.`,
      });
      atual = prox;
      passos.push({
        ...base(),
        olhando: null,
        linha: 6,
        nota: `Avancei para ${nomeDe(itens, atual)} no nível ${nivel}.`,
      });
      continue;
    } else {
      passos.push({
        ...base(),
        olhando: prox,
        linha: 5,
        nota: `${itens[prox].valor} não é menor que ${valor}: se eu avançasse, passaria do ponto. Paro de andar no nível ${nivel}.`,
      });
    }

    update[nivel] = atual;
    escrito[nivel] = true;
    passos.push({
      ...base(),
      olhando: null,
      linha: 8,
      nota: inserindo
        ? `Gravo update[${nivel}] = ${nomeDe(itens, atual)}. Se o ${valor} for promovido até o nível ${nivel}, é ${nomeDe(itens, atual)} que vai apontar para ele.`
        : `Gravo update[${nivel}] = ${nomeDe(itens, atual)}. Se o ${valor} viver no nível ${nivel}, é ${nomeDe(itens, atual)} que vai ter que costurar por cima dele.`,
    });

    if (nivel === 0) break;
    nivel--;
    passos.push({
      ...base(),
      olhando: null,
      linha: 3,
      nota: `Desço para o nível ${nivel}, sem sair de ${nomeDe(itens, atual)}. Cada descida deixa um candidato para trás: é esse o rastro que o update guarda.`,
    });
  }

  if (MAX_NIVEL > NIVEL_MAX_BASE + 1) {
    passos.push({
      ...base(),
      olhando: null,
      linha: 2,
      nota: `A busca parou no nível ${NIVEL_MAX_BASE}, o topo atual. Do ${NIVEL_MAX_BASE + 1} para cima o update nunca foi tocado, e continua valendo o head que estava lá desde o começo. É por isso que o head nasce com ${MAX_NIVEL} ponteiros, e os outros nós não.`,
    });
  }

  const estado: Estado = {
    set: (l, d, c, nm) => {
      ligados = l;
      desligados = d;
      emCena = c;
      nivelMax = nm;
    },
    get: () => ({ ligados, desligados, emCena, nivelMax }),
  };

  if (inserindo) {
    montarInsercao(passos, itens, idxAlvo, valor, altura, moedas, update, base, estado);
  } else {
    montarRemocao(passos, itens, idxAlvo, valor, update, base, vis, estado);
  }

  return { itens, idxAlvo, alturaAlvo, passos };
}

// Handles de escrita do estado mutável do gerador. Existem só para as duas
// montagens abaixo poderem empurrar passos sem duplicar o corpo da busca.
type Estado = {
  set: (ligados: number, desligados: number, emCena: boolean, nivelMax: number) => void;
  get: () => { ligados: number; desligados: number; emCena: boolean; nivelMax: number };
};
type Base = () => Omit<Passo, "olhando" | "linha" | "nota">;

function montarInsercao(
  passos: Passo[],
  itens: Item[],
  idxNovo: number,
  valor: number,
  altura: number,
  moedas: Face[],
  update: number[],
  base: Base,
  st: Estado
) {
  // A moeda: uma face por passo. A altura já veio decidida de fora para o
  // gerador continuar puro, mas a sequência de faces é a que produziria ela.
  for (const f of moedasDe(altura)) {
    moedas.push(f);
    const n = moedas.length;
    passos.push({
      ...base(),
      olhando: null,
      linha: 9,
      nota:
        f === "cara"
          ? `Lanço a moeda: cara. O ${valor} sobe mais um degrau e já vai ocupar o nível ${n}. Jogo de novo.`
          : f === "coroa"
            ? `Lanço a moeda: coroa. Parei de subir. O ${valor} vai ter altura ${altura}, ou seja, ${altura === 1 ? "só o nível 0" : `os níveis 0 a ${altura - 1}`}.`
            : `Bati no teto de ${MAX_NIVEL} níveis, então nem lanço de novo. O ${valor} fica com altura ${altura}. O teto existe para a altura não fugir para o infinito.`,
    });
  }

  const antes = st.get();
  const novoTopo = Math.max(antes.nivelMax, altura - 1);
  const subiu = novoTopo > antes.nivelMax;
  st.set(antes.ligados, antes.desligados, antes.emCena, novoTopo);
  passos.push({
    ...base(),
    olhando: null,
    linha: 10,
    nota: subiu
      ? `A altura ${altura} passou do topo que a lista tinha: nivel_max sobe de ${antes.nivelMax} para ${novoTopo}. Os níveis novos nascem com o head apontando direto para o ${valor}, porque não existe mais ninguém lá em cima.`
      : `A altura ${altura} cabe nos níveis que já existiam, então nivel_max continua ${novoTopo}. Nada mais muda na estrutura.`,
  });

  st.set(0, 0, true, novoTopo);
  passos.push({
    ...base(),
    olhando: idxNovo,
    linha: 11,
    nota: `Crio o nó do ${valor} com ${altura} ${altura === 1 ? "ponteiro" : "ponteiros"} forward, um por nível em que ele vai participar. Essa altura nunca mais muda: é sorteada uma vez, na inserção, e pronto.`,
  });

  for (let nv = 0; nv < altura; nv++) {
    const cand = update[nv];
    const depois = proximo(itens, cand, nv, { alvo: idxNovo, modo: "inserir", ligados: nv, desligados: 0 });
    passos.push({
      ...base(),
      olhando: cand < 0 ? null : cand,
      linha: 13,
      nota: `Nível ${nv}, ponteiro 1 de 2: o ${valor} passa a apontar para ${depois === null ? "None" : `o ${itens[depois].valor}`}, que era o próximo de ${nomeDe(itens, cand)} neste nível.`,
    });
    st.set(nv + 1, 0, true, novoTopo);
    passos.push({
      ...base(),
      olhando: idxNovo,
      linha: 14,
      nota: `Nível ${nv}, ponteiro 2 de 2: agora ${nomeDe(itens, cand)} aponta para o ${valor}. Religado. Repare que só dois ponteiros mudaram, e nada mais na lista precisou se mexer.`,
    });
  }

  const ponteiros = BASE.reduce((s, b) => s + b.altura, 0) + altura;
  passos.push({
    ...base(),
    olhando: idxNovo,
    linha: 14,
    fim: true,
    ok: true,
    nota: `Pronto: ${valor} inserido com altura ${altura}, mexendo em ${altura * 2} ${altura * 2 === 1 ? "ponteiro" : "ponteiros"}, dois por nível. Nenhuma rotação, nenhum rebalanceamento, e a lista continua ordenada com ${BASE.length + 1} elementos e ${ponteiros} ponteiros no total.`,
  });
}

function montarRemocao(
  passos: Passo[],
  itens: Item[],
  idxAlvo: number,
  valor: number,
  update: number[],
  base: Base,
  vis: () => Vis,
  st: Estado
) {
  const antes = st.get();
  const candidato = proximo(itens, update[0], 0, vis());
  const achou = candidato !== null && candidato === idxAlvo;

  passos.push({
    ...base(),
    olhando: candidato,
    linha: 9,
    nota:
      candidato === null
        ? `Depois de ${nomeDe(itens, update[0])} não há mais nada no nível 0. O ${valor} não está na lista.`
        : `Saí do laço em ${nomeDe(itens, update[0])}. O único candidato possível é o vizinho dele no nível 0, o ${itens[candidato].valor}.`,
  });

  if (!achou) {
    passos.push({
      ...base(),
      olhando: candidato,
      linha: 11,
      fim: true,
      erro: true,
      nota: `${candidato === null ? "Não há candidato" : `O candidato é o ${itens[candidato].valor}, e não o ${valor}`}: o ${valor} não está na lista, então devolvo False sem tocar em ponteiro nenhum. Remover o que não existe custa a mesma busca e mais nada.`,
    });
    return;
  }

  st.set(antes.ligados, 0, true, antes.nivelMax);
  passos.push({
    ...base(),
    olhando: idxAlvo,
    linha: 12,
    nota: `Achei o ${valor}, que vive nos níveis 0 a ${itens[idxAlvo].altura - 1}. Agora desligo ele de baixo para cima, um nível por vez, usando os candidatos que o update guardou.`,
  });

  let desligados = 0;
  for (let nv = 0; nv <= antes.nivelMax; nv++) {
    const cand = update[nv];
    const v: Vis = { alvo: idxAlvo, modo: "remover", ligados: 0, desligados };
    if (proximo(itens, cand, nv, v) !== idxAlvo) {
      const outro = proximo(itens, cand, nv, v);
      passos.push({
        ...base(),
        olhando: cand < 0 ? null : cand,
        linha: 14,
        nota: `No nível ${nv}, quem vem depois de ${nomeDe(itens, cand)} é ${outro === null ? "None" : `o ${itens[outro].valor}`}, e não o ${valor}. Sinal de que o ${valor} nunca chegou a este andar, e como a altura é contínua de baixo para cima, também não chegou a nenhum acima. break: nada mais a desligar.`,
      });
      break;
    }
    const depois = proximo(itens, idxAlvo, nv, v);
    desligados = nv + 1;
    st.set(antes.ligados, desligados, true, antes.nivelMax);
    passos.push({
      ...base(),
      olhando: cand < 0 ? null : cand,
      linha: 15,
      nota: `Nível ${nv}: ${nomeDe(itens, cand)} deixa de apontar para o ${valor} e passa a apontar para ${depois === null ? "None" : `o ${itens[depois].valor}`}. Um ponteiro reescrito, e o ${valor} sumiu deste nível.`,
    });
  }

  // Encolher o topo: enquanto o nível mais alto ficar sem ninguém, ele some.
  let nivelMax = antes.nivelMax;
  const vazio = (nv: number) =>
    proximo(itens, -1, nv, { alvo: idxAlvo, modo: "remover", ligados: 0, desligados }) === null;
  const topoAntes = nivelMax;
  while (nivelMax > 0 && vazio(nivelMax)) nivelMax--;
  st.set(antes.ligados, desligados, true, nivelMax);
  passos.push({
    ...base(),
    olhando: idxAlvo,
    linha: 16,
    nota:
      nivelMax < topoAntes
        ? `O ${valor} era o único morador do nível ${topoAntes}: agora head.forward[${topoAntes}] é None e o andar ficou vazio, então nivel_max cai de ${topoAntes} para ${nivelMax}. A lista encolheu de altura sem nenhum rebalanceamento.`
        : `O nível ${topoAntes} continua com moradores, então nivel_max fica em ${nivelMax}. Só encolho o topo quando o andar mais alto esvazia.`,
  });

  const ponteiros = BASE.reduce((s, b) => s + b.altura, 0) - itens[idxAlvo].altura;
  passos.push({
    ...base(),
    olhando: idxAlvo,
    linha: 18,
    fim: true,
    ok: true,
    nota: `Pronto: ${valor} removido reescrevendo ${desligados} ${desligados === 1 ? "ponteiro" : "ponteiros"}, um por nível em que ele vivia. Repare na assimetria: inserir custa dois ponteiros por nível, remover custa um, porque o nó que sai não precisa ser religado a nada. Sobraram ${BASE.length - 1} elementos e ${ponteiros} ponteiros.`,
  });
}

type Preset = { key: string; rotulo: string; valor: number; altura: number };
const PRESETS: Record<Modo, Preset[]> = {
  inserir: [
    { key: "meio", rotulo: "Do encontro: inserir o 33 (altura 2)", valor: 33, altura: 2 },
    { key: "raso", rotulo: "Só no nível 0: inserir o 80 (altura 1)", valor: 80, altura: 1 },
    { key: "teto", rotulo: "Andar novo: inserir o 33 (altura 5)", valor: 33, altura: 5 },
    { key: "menor", rotulo: "Menor que todos: inserir o 1 (altura 3)", valor: 1, altura: 3 },
  ],
  remover: [
    { key: "r-meio", rotulo: "Do encontro: remover o 59 (altura 2)", valor: 59, altura: 2 },
    { key: "r-alto", rotulo: "O mais alto: remover o 42 (altura 4)", valor: 42, altura: 4 },
    { key: "r-raso", rotulo: "Só no nível 0: remover o 3", valor: 3, altura: 1 },
    { key: "r-nao", rotulo: "Não existe: remover o 33", valor: 33, altura: 1 },
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
  const [modo, setModo] = useState<Modo>("inserir");
  const [valor, setValor] = useState(33);
  const [altura, setAltura] = useState(2);
  const [preset, setPreset] = useState("meio");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const { itens, idxAlvo, alturaAlvo, passos } = useMemo(
    () => gerarPassos(modo, valor, altura),
    [modo, valor, altura]
  );
  const CODIGO = modo === "inserir" ? CODIGO_INSERIR : CODIGO_REMOVER;
  const total = Math.max(1, passos.length);
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];

  const parar = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const reiniciar = () => {
    parar();
    setTocando(false);
    setPasso(0);
  };
  const aoMudarValor = (v: string) => {
    reiniciar();
    setPreset("");
    setValor(parseInt(v, 10) || 0);
  };
  const aoMudarAltura = (v: number) => {
    reiniciar();
    setPreset("");
    setAltura(Math.min(MAX_NIVEL, Math.max(1, v)));
  };
  const aplicarPreset = (pr: Preset) => {
    reiniciar();
    setPreset(pr.key);
    setValor(pr.valor);
    setAltura(pr.altura);
  };
  const trocarModo = (m: Modo) => {
    if (m === modo) return;
    reiniciar();
    setModo(m);
    aplicarPreset(PRESETS[m][0]);
  };
  // Math.random só aqui, num handler de clique. No render ele quebraria a
  // hidratação (o HTML do build sairia diferente do HTML do cliente).
  const sortearAltura = () => {
    let h = 1;
    while (Math.random() < 0.5 && h < MAX_NIVEL) h++;
    reiniciar();
    setPreset("");
    setAltura(h);
  };

  // --- desenho -------------------------------------------------------------
  const inserindo = modo === "inserir";
  const topo = inserindo ? Math.max(NIVEL_MAX_BASE, altura - 1) : NIVEL_MAX_BASE;
  const niveis = topo + 1;
  const larguraSvg = X0 + itens.length * COL + 44;
  const alturaSvg = TOP + topo * RH + H + 14;

  const yDe = (nivel: number) => TOP + (topo - nivel) * RH;
  const cyDe = (nivel: number) => yDe(nivel) + H / 2;
  const xDe = (i: number) => (i < 0 ? GUT : X0 + i * COL);
  const larDe = (i: number) => (i < 0 ? HEAD_W : W);
  const cxDe = (i: number) => xDe(i) + larDe(i) / 2;

  const visAtual: Vis = { alvo: idxAlvo, modo, ligados: p.ligados, desligados: p.desligados };

  type Seta = { k: string; x1: number; x2: number; y: number; novo: boolean };
  const setas: Seta[] = [];
  const nones: { k: string; x: number; y: number }[] = [];
  for (let nv = 0; nv <= topo; nv++) {
    const y = cyDe(nv);
    let anterior = -1;
    let seguinte = proximo(itens, -1, nv, visAtual);
    let volta = 0;
    while (seguinte !== null && volta++ < 40) {
      const tocaAlvo = inserindo && (seguinte === idxAlvo || anterior === idxAlvo);
      setas.push({
        k: `s${nv}-${seguinte}`,
        x1: xDe(anterior) + larDe(anterior),
        x2: xDe(seguinte) - 5,
        y,
        novo: tocaAlvo,
      });
      anterior = seguinte;
      seguinte = proximo(itens, anterior, nv, visAtual);
    }
    const fim = xDe(anterior) + larDe(anterior);
    setas.push({ k: `n${nv}`, x1: fim, x2: fim + 14, y, novo: inserindo && anterior === idxAlvo });
    nones.push({ k: `none${nv}`, x: fim + 18, y });
  }

  const corDoNo = (i: number, nv: number) => {
    const neutro = { fill: "#0f1826", stroke: "rgba(255,255,255,0.13)", txt: "#8ba0bb", tracejado: false };
    if (i === idxAlvo) {
      if (inserindo) {
        return nv >= p.ligados
          ? { fill: "rgba(124,58,237,0.12)", stroke: "#7c3aed", txt: "#c4b5fd", tracejado: true }
          : { fill: "rgba(52,211,153,0.24)", stroke: "#34d399", txt: "#eafff5", tracejado: false };
      }
      if (nv < p.desligados) return { fill: "transparent", stroke: "rgba(248,113,113,0.35)", txt: "#5b6b82", tracejado: true };
      if (p.emCena) return { fill: "rgba(248,113,113,0.2)", stroke: "#f87171", txt: "#fecaca", tracejado: false };
    }
    if (p.olhando === i && p.atual !== i)
      return { fill: "rgba(245,158,11,0.22)", stroke: "#f59e0b", txt: "#fff", tracejado: false };
    if (p.atual === i && p.nivel === nv)
      return { fill: "rgba(59,130,246,0.3)", stroke: "#3b82f6", txt: "#fff", tracejado: false };
    if (p.update[nv] === i)
      return { fill: "rgba(59,130,246,0.12)", stroke: "rgba(59,130,246,0.6)", txt: "#cbd9ea", tracejado: false };
    return neutro;
  };

  const headMarcado =
    p.atual < 0 || (inserindo && p.emCena && p.update.some((u, nv) => u === -1 && nv < altura));

  const variaveis = inserindo
    ? [
        { nome: "nivel", valor: `${p.nivel}` },
        { nome: "atual", valor: p.atual < 0 ? "head" : `${itens[p.atual].valor}` },
        { nome: "altura", valor: p.emCena || p.moedas.length ? `${altura}` : "?" },
        { nome: "nivel_max", valor: `${p.nivelMax}`, best: true },
      ]
    : [
        { nome: "nivel", valor: `${p.nivel}` },
        { nome: "atual", valor: p.atual < 0 ? "head" : `${itens[p.atual].valor}` },
        { nome: "alvo", valor: p.emCena ? `${valor}` : "?" },
        { nome: "nivel_max", valor: `${p.nivelMax}`, best: true },
      ];

  const estatisticas = inserindo
    ? [
        { k: "n", rot: "elementos depois", val: `${BASE.length + (idxAlvo >= 0 ? 1 : 0)}` },
        { k: "alt", rot: "altura sorteada", val: p.moedas.length ? `${altura}` : "?" },
        { k: "pt", rot: "ponteiros reescritos", val: `${p.ligados * 2}` },
        { k: "niv", rot: "níveis da lista", val: `${p.nivelMax + 1}` },
      ]
    : [
        { k: "n", rot: "elementos depois", val: `${BASE.length - (idxAlvo >= 0 ? 1 : 0)}` },
        { k: "alt", rot: "altura do nó removido", val: idxAlvo >= 0 ? `${alturaAlvo}` : "não existe" },
        { k: "pt", rot: "ponteiros reescritos", val: `${p.desligados}` },
        { k: "niv", rot: "níveis da lista", val: `${p.nivelMax + 1}` },
      ];

  const notaCls = "viz-note" + (p.ok ? " ok" : p.erro ? " invalid" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);
  const descricao = inserindo
    ? `Skip list com ${BASE.length} elementos, inserindo o ${valor} com altura ${altura}. A operação está no nível ${p.nivel}, em ${p.atual < 0 ? "head" : itens[p.atual].valor}, com ${p.ligados} de ${altura} níveis religados.`
    : `Skip list com ${BASE.length} elementos, removendo o ${valor}. A operação está no nível ${p.nivel}, em ${p.atual < 0 ? "head" : itens[p.atual].valor}, com ${p.desligados} de ${alturaAlvo} níveis desligados.`;

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>
            Visualizador · {inserindo ? "inserção: o rastro de candidatos e a moeda" : "remoção: o rastro, o break e o topo que encolhe"}
          </span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">
            passo {idx + 1} de {total}
          </span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "✕ Fechar" : "⤢ Expandir"}
          </button>
        </div>
      </div>

      <div className="viz-body">
        <div className="arr-tabs" style={{ marginBottom: 16 }}>
          <button
            className={`arr-tab${inserindo ? " on" : ""}`}
            onClick={() => trocarModo("inserir")}
            aria-pressed={inserindo}
          >
            Inserir
          </button>
          <button
            className={`arr-tab${!inserindo ? " on" : ""}`}
            onClick={() => trocarModo("remover")}
            aria-pressed={!inserindo}
          >
            Remover
          </button>
        </div>

        <div className="bigo-chips">
          {PRESETS[modo].map((pr) => (
            <button
              key={pr.key}
              className={`bigo-chip${preset === pr.key ? " on" : ""}`}
              onClick={() => aplicarPreset(pr)}
              aria-pressed={preset === pr.key}
            >
              {pr.rotulo}
            </button>
          ))}
        </div>

        <div className="viz-inputs">
          <label className="viz-field">
            <span>{inserindo ? "inserir" : "remover"}</span>
            <input className="viz-input k" type="number" value={valor} onChange={(e) => aoMudarValor(e.target.value)} />
          </label>
          {inserindo ? (
            <>
              <label className="viz-field">
                <span>altura sorteada: {altura}</span>
                <input
                  type="range"
                  min={1}
                  max={MAX_NIVEL}
                  step={1}
                  value={altura}
                  onChange={(e) => aoMudarAltura(parseInt(e.target.value, 10))}
                  style={{ accentColor: "var(--ccc-accent)", width: 150 }}
                />
              </label>
              <button className="viz-btn" onClick={sortearAltura}>
                Lançar a moeda
              </button>
            </>
          ) : (
            <div className="viz-field">
              <span>altura do nó</span>
              <span className="viz-var-val">
                {idxAlvo >= 0 ? `${alturaAlvo} (níveis 0 a ${alturaAlvo - 1})` : "o valor não está na lista"}
              </span>
            </div>
          )}
        </div>

        <div className="sl-wrap">
          <svg
            className="sl-svg"
            width={Math.round(larguraSvg)}
            height={Math.round(alturaSvg)}
            viewBox={`0 0 ${Math.round(larguraSvg)} ${Math.round(alturaSvg)}`}
            role="img"
            aria-label={descricao}
          >
            <defs>
              <marker id="sli-seta" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" fill="#3a4a60" />
              </marker>
              <marker id="sli-seta-nova" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" fill="#34d399" />
              </marker>
            </defs>

            {setas.map((s) => (
              <line
                key={s.k}
                x1={s.x1}
                y1={s.y}
                x2={s.x2}
                y2={s.y}
                stroke={s.novo ? "#34d399" : "#3a4a60"}
                strokeWidth={s.novo ? 2 : 1.5}
                markerEnd={s.novo ? "url(#sli-seta-nova)" : "url(#sli-seta)"}
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

            {Array.from({ length: niveis }, (_, k) => {
              const nv = topo - k;
              return (
                <text
                  key={`r${nv}`}
                  x={GUT - 9}
                  y={cyDe(nv)}
                  fill={nv > p.nivelMax ? "#33455c" : "#61748c"}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fontSize={10.5}
                  textAnchor="end"
                  dominantBaseline="central"
                >
                  nível {nv}
                </text>
              );
            })}

            {/* head: o sentinela, sempre com MAX_NIVEL ponteiros forward. */}
            <rect
              x={xDe(-1)}
              y={yDe(topo)}
              width={HEAD_W}
              height={topo * RH + H}
              rx={7}
              fill={headMarcado ? "rgba(59,130,246,0.22)" : "#111c2b"}
              stroke={headMarcado ? "#3b82f6" : "rgba(255,255,255,0.16)"}
              strokeWidth={1.6}
            />
            <text
              x={cxDe(-1)}
              y={cyDe(topo) + (topo * RH) / 2}
              fill={headMarcado ? "#fff" : "#7d8fa8"}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontSize={10.5}
              fontWeight={700}
              textAnchor="middle"
              dominantBaseline="central"
            >
              head
            </text>

            {itens.map((no, i) =>
              Array.from({ length: no.altura }, (_, nv) => {
                if (inserindo && i === idxAlvo && !p.emCena && nv >= p.ligados) return null;
                const c = corDoNo(i, nv);
                return (
                  <g key={`${i}-${nv}`}>
                    <rect
                      x={xDe(i)}
                      y={yDe(nv)}
                      width={W}
                      height={H}
                      rx={6}
                      fill={c.fill}
                      stroke={c.stroke}
                      strokeWidth={1.6}
                      strokeDasharray={c.tracejado ? "4 3" : undefined}
                    />
                    <text
                      x={cxDe(i)}
                      y={cyDe(nv)}
                      fill={c.txt}
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      fontSize={12.5}
                      fontWeight={600}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {no.valor}
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
            {Array.from({ length: MAX_NIVEL }, (_, k) => {
              const nv = MAX_NIVEL - 1 - k;
              const v = p.update[nv];
              const usado = inserindo ? p.emCena && nv < altura : nv < p.desligados;
              const pendente = !p.escrito[nv] && nv <= NIVEL_MAX_BASE;
              return (
                <span key={nv} className={`sl-slot${pendente ? " pendente" : ""}${usado ? " usado" : ""}`}>
                  <b>update[{nv}]</b>
                  {rotuloUpdate(itens, v)}
                </span>
              );
            })}
          </div>
        </div>

        {inserindo ? (
          <div className="sl-painel">
            <div className="sl-painel-tit">
              A moeda · random() &lt; 0.5 sobe um nível
              <em>p = 0.5, teto de {MAX_NIVEL} níveis</em>
            </div>
            <div className="sl-moedas">
              {p.moedas.length === 0 ? (
                <span className="sl-moeda vazia">ainda não lancei</span>
              ) : (
                p.moedas.map((f, i) => (
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

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">skip_list.py</div>
            <div className="viz-code-body">
              {CODIGO.map((txt, i) => (
                <div key={i} className={`viz-line${i === p.linha ? " on" : ""}`}>
                  <span className="ln">{i + 1}</span>
                  {txt}
                </div>
              ))}
            </div>
          </div>
          <div className="viz-vars">
            <div className="viz-vars-head">Variáveis</div>
            {variaveis.map((v) => (
              <div className="viz-var" key={v.nome}>
                <span className="viz-var-name">{v.nome}</span>
                <span className={`viz-var-val${v.best ? " best" : ""}`}>{v.valor}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bigo-stats">
          {estatisticas.map((s) => (
            <div className="bigo-stat" key={s.k}>
              <span>{s.rot}</span>
              <strong>{s.val}</strong>
            </div>
          ))}
        </div>

        <div className="viz-controls">
          <button className="viz-btn" title="Reiniciar" onClick={reiniciar}>
            ↺
          </button>
          <button
            className="viz-btn"
            disabled={idx === 0}
            onClick={() => {
              parar();
              setTocando(false);
              setPasso(Math.max(0, idx - 1));
            }}
          >
            ‹ Anterior
          </button>
          <button
            className="viz-play"
            onClick={() => {
              if (tocando) {
                setTocando(false);
                return;
              }
              setPasso(idx >= total - 1 ? 0 : idx);
              setTocando(true);
            }}
          >
            {tocando ? "❚❚ Pausar" : "▶ Rodar"}
          </button>
          <button
            className="viz-btn"
            disabled={idx === total - 1}
            onClick={() => {
              parar();
              setTocando(false);
              setPasso(Math.min(idx + 1, total - 1));
            }}
          >
            Próximo ›
          </button>
          <div className="viz-speed">
            <span>Velocidade</span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={velocidade}
              onChange={(e) => setVelocidade(parseInt(e.target.value, 10))}
            />
            <span className="val">{ROTULOS_VEL[velocidade]}</span>
          </div>
        </div>
        <div className="viz-progress">
          <div className="viz-progress-fill" style={{ width: `${pctPasso}%` }} />
        </div>
      </div>
    </figure>
  );

  if (expanded && mounted) {
    return createPortal(
      <div
        className="viz-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) setExpanded(false);
        }}
      >
        {viz}
      </div>,
      document.body
    );
  }
  return viz;
}
