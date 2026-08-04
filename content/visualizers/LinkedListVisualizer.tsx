"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// LinkedListVisualizer, as operações de uma lista simplesmente encadeada.
//
// O que o aluno precisa ver acontecendo é o RELIGAR DOS PONTEIROS: quais setas
// mudam, em que ordem, e quantos nós o algoritmo percorreu antes de chegar lá.
// Por isso o desenho é um SVG com o nó no formato [valor | prox], e o nó novo
// entra POR BAIXO da linha, como no whiteboard do encontro: é o jeito de deixar
// claro que nenhum outro nó sai do lugar na memória.
//
// Dois interruptores mudam a estrutura e, junto com ela, o código na tela:
// o nó sentinela, que faz o `if pos == 0` desaparecer, e o ponteiro de cauda,
// que transforma o append de O(n) em O(1).
//
// O painel de estatísticas compara "ponteiros religados" com "deslocamentos num
// array": é esse par de números que sustenta o argumento do artigo.
// ---------------------------------------------------------------------------

type Op = "inserir" | "append" | "remover" | "buscar";

type Passo = {
  linha: number;
  ant: number | null; // índice VISUAL do nó sob o ponteiro que caminha
  alvo: number | null; // nó encontrado na busca
  mostraNovo: boolean;
  novoDepoisDe: number; // índice visual do antecessor do nó novo (-1 = antes da cabeça)
  ligaSaida: boolean; // novo.prox já aponta para o sucessor
  ligaEntrada: boolean; // o antecessor já aponta para o novo
  cabecaPara: number; // índice visual para onde a seta da cabeça aponta
  cabecaNoNovo: boolean;
  solto: number | null; // nó que ficou sem ninguém apontando para ele
  bypass: boolean; // o arco que pula o nó removido já existe
  visitados: number;
  religados: number;
  nota: string;
  ok?: boolean;
  fim?: boolean;
};

// Um bloco de código por variante. A chave sai de (operação, sentinela, cauda),
// e o campo `linha` de cada passo indexa o bloco escolhido: o mapeamento é 1:1,
// então mexer numa linha obriga a mexer no gerador junto.
const CODIGO: Record<string, string[]> = {
  "inserir-sent": [
    "def inserir(self, pos, valor):",
    "    novo = No(valor)",
    "    anterior = self.cabeca   # o sentinela",
    "    for _ in range(pos):",
    "        anterior = anterior.prox",
    "    novo.prox = anterior.prox",
    "    anterior.prox = novo",
  ],
  inserir: [
    "def inserir(self, pos, valor):",
    "    novo = No(valor)",
    "    if pos == 0:",
    "        novo.prox = self.cabeca",
    "        self.cabeca = novo",
    "        return",
    "    anterior = self.cabeca",
    "    for _ in range(pos - 1):",
    "        anterior = anterior.prox",
    "    novo.prox = anterior.prox",
    "    anterior.prox = novo",
  ],
  "append-cauda": [
    "def append(self, valor):",
    "    novo = No(valor)",
    "    if self.cauda is None:",
    "        self.cabeca = self.cauda = novo",
    "        return",
    "    self.cauda.prox = novo",
    "    self.cauda = novo",
  ],
  append: [
    "def append(self, valor):",
    "    novo = No(valor)",
    "    if self.cabeca is None:",
    "        self.cabeca = novo",
    "        return",
    "    ultimo = self.cabeca",
    "    while ultimo.prox is not None:",
    "        ultimo = ultimo.prox",
    "    ultimo.prox = novo",
  ],
  "remover-sent": [
    "def remover(self, pos):",
    "    anterior = self.cabeca   # o sentinela",
    "    for _ in range(pos):",
    "        anterior = anterior.prox",
    "    anterior.prox = anterior.prox.prox",
  ],
  remover: [
    "def remover(self, pos):",
    "    if pos == 0:",
    "        self.cabeca = self.cabeca.prox",
    "        return",
    "    anterior = self.cabeca",
    "    for _ in range(pos - 1):",
    "        anterior = anterior.prox",
    "    anterior.prox = anterior.prox.prox",
  ],
  buscar: [
    "def buscar(self, valor):",
    "    atual = self.cabeca",
    "    while atual is not None:",
    "        if atual.valor == valor:",
    "            return atual",
    "        atual = atual.prox",
    "    return None",
  ],
};

function chaveCodigo(op: Op, sentinela: boolean, temCauda: boolean): string {
  if (op === "inserir") return sentinela ? "inserir-sent" : "inserir";
  if (op === "remover") return sentinela ? "remover-sent" : "remover";
  if (op === "append") return temCauda ? "append-cauda" : "append";
  return "buscar";
}

function gerarPassos(
  valores: number[],
  sentinela: boolean,
  temCauda: boolean,
  op: Op,
  pos: number,
  valor: number
): Passo[] {
  const off = sentinela ? 1 : 0;
  const n = valores.length;
  const nVis = n + off;

  const out: Passo[] = [];
  let ant: number | null = null;
  let alvo: number | null = null;
  let mostraNovo = false;
  let novoDepoisDe = -1;
  let ligaSaida = false;
  let ligaEntrada = false;
  let cabecaPara = 0;
  let cabecaNoNovo = false;
  let solto: number | null = null;
  let bypass = false;
  let visitados = 0;
  let religados = 0;

  const push = (linha: number, nota: string, extra: Partial<Passo> = {}) => {
    out.push({
      linha, nota, ant, alvo, mostraNovo, novoDepoisDe, ligaSaida, ligaEntrada,
      cabecaPara, cabecaNoNovo, solto, bypass, visitados, religados, ...extra,
    });
  };

  // Nome de um nó pelo índice VISUAL, do jeito que a nota vai falar dele.
  const nome = (v: number | null): string => {
    if (v === null || v >= nVis || v < 0) return "None";
    if (sentinela && v === 0) return "sentinela";
    return `nó ${valores[v - off]}`;
  };

  if (op === "inserir") {
    const p = Math.max(0, Math.min(pos, n));
    mostraNovo = true;
    novoDepoisDe = p + off - 1;
    push(1, `Crio o nó ${valor}. Ele já está na memória, solto: por enquanto ninguém aponta para ele e ele não aponta para ninguém.`);

    if (!sentinela && p === 0) {
      push(2, `pos = 0 é o caso especial: quem aponta para o primeiro nó não é outro nó, é a variável cabeça. Por isso o if.`);
      ligaSaida = true;
      religados++;
      push(3, `novo.prox = cabeca: o nó ${valor} passa a apontar para ${nome(0)}. Faço esta ligação PRIMEIRO, porque se eu mexesse na cabeça antes perderia o endereço do resto da lista.`);
      ligaEntrada = true;
      cabecaNoNovo = true;
      religados++;
      push(4, `cabeca = novo: agora a lista começa no nó ${valor}. Dois ponteiros mexidos e nenhum nó saiu do lugar.`);
      push(5, `Pronto. Inserir na frente custa o mesmo com 5 ou com 5 milhões de nós: O(1).`, { ok: true, fim: true });
      return out;
    }

    const lAnt = sentinela ? 2 : 6;
    const lHop = sentinela ? 4 : 8;
    const lSaida = sentinela ? 5 : 9;
    const lEntrada = sentinela ? 6 : 10;

    if (!sentinela) push(2, `pos = ${p}, não é 0: sigo pelo caminho de baixo, o que precisa achar o nó anterior à posição.`);

    ant = 0;
    visitados = 1;
    push(lAnt, sentinela
      ? `anterior começa no sentinela. Repare que ele nunca é None, nem com a lista vazia: é isso que faz o if sumir.`
      : `anterior começa na cabeça, ${nome(0)}.`);

    const saltos = sentinela ? p : p - 1;
    for (let h = 0; h < saltos; h++) {
      ant = (ant as number) + 1;
      visitados++;
      push(lHop, `Ainda não é aqui: avanço para ${nome(ant)}. Já são ${visitados} nós percorridos, e este é o único pedaço caro da inserção.`);
    }

    const a = ant as number;
    ligaSaida = true;
    religados++;
    push(lSaida, `novo.prox = anterior.prox: o nó ${valor} passa a apontar para ${nome(a + 1)}. A ordem importa, se eu religasse o anterior primeiro perderia o endereço de quem vem depois.`);
    ligaEntrada = true;
    religados++;
    push(lEntrada, n === 0
      ? `anterior.prox = novo: ${nome(a)} aponta para o nó ${valor}, que virou o único nó da lista. Repare que não precisei de nenhum if para isso.`
      : `anterior.prox = novo: ${nome(a)} aponta para o nó ${valor} e a lista está inteira de novo. Foram 2 ponteiros, e os outros ${n} nós continuam exatamente onde estavam na memória.`,
      { ok: true, fim: true });
    return out;
  }

  if (op === "append") {
    mostraNovo = true;
    novoDepoisDe = nVis - 1;
    ligaSaida = true; // um nó recém-criado já aponta para None
    push(1, `Crio o nó ${valor}, que já nasce apontando para None. O problema agora é achar quem vai apontar para ele.`);

    if (nVis === 0) {
      push(2, `A lista está vazia: não existe último nó. Este é o único caso em que o append precisa de um if.`);
      cabecaNoNovo = true;
      ligaEntrada = true;
      religados++;
      push(3, temCauda
        ? `A cabeça e a cauda passam a apontar para o nó ${valor}, que é o primeiro e o último ao mesmo tempo.`
        : `A cabeça passa a apontar para o nó ${valor}.`);
      push(4, `Fim, com 0 nós percorridos.`, { ok: true, fim: true });
      return out;
    }

    if (temCauda) {
      push(2, sentinela
        ? `A cauda não é None (com sentinela ela nunca é), então pulo o if.`
        : `A cauda não é None, então pulo o if.`);
      ant = nVis - 1;
      visitados = 1;
      ligaEntrada = true;
      religados++;
      push(5, `cauda.prox = novo: ${nome(nVis - 1)} passa a apontar para o nó ${valor}. Não precisei procurar o fim, o ponteiro de cauda já sabia onde ele estava.`);
      push(6, `cauda = novo. Um ponteiro religado, 1 nó percorrido: com cauda, inserir no fim é O(1).`, { ok: true, fim: true });
      return out;
    }

    push(2, `A cabeça não é None, então pulo o if.`);
    ant = 0;
    visitados = 1;
    push(5, `ultimo começa na cabeça, ${nome(0)}. Este é o ponteiro auxiliar da técnica do dummy pointer: ele existe só para caminhar, a cabeça fica parada.`);
    while ((ant as number) < nVis - 1) {
      push(6, `${nome(ant)}.prox não é None, então ainda não cheguei no fim.`);
      ant = (ant as number) + 1;
      visitados++;
      push(7, `Avanço para ${nome(ant)}. ${visitados} nós percorridos até aqui.`);
    }
    push(6, `${nome(ant)}.prox é None: cheguei no último. Para descobrir isso precisei visitar os ${visitados} nós da lista.`);
    ligaEntrada = true;
    religados++;
    push(8, `ultimo.prox = novo. Religar foi 1 ponteiro, o caro foi achar o fim: sem ponteiro de cauda, o append é O(n).`, { ok: true, fim: true });
    return out;
  }

  if (op === "remover") {
    if (n === 0) {
      push(0, `A lista está vazia: não existe posição ${pos} para remover. O sentinela evita o if da cabeça, mas não te livra de validar a posição.`, { fim: true });
      return out;
    }
    const p = Math.max(0, Math.min(pos, n - 1));

    if (sentinela) {
      ant = 0;
      visitados = 1;
      push(1, `anterior começa no sentinela, e nem preciso perguntar se a posição é a 0.`);
      for (let h = 0; h < p; h++) {
        ant = (ant as number) + 1;
        visitados++;
        push(3, `Avanço para ${nome(ant)}. Preciso parar no nó ANTERIOR ao que vou remover: numa lista simplesmente encadeada, ninguém sabe quem aponta para ele.`);
      }
      solto = p + off;
      bypass = true;
      religados++;
      push(4, `anterior.prox = anterior.prox.prox: ${nome(ant)} passa a apontar direto para ${nome(p + off + 1)}. O nó ${valores[p]} ficou sem ninguém apontando para ele e vira lixo. Nenhum outro nó se moveu.`, { ok: true, fim: true });
      return out;
    }

    if (p === 0) {
      push(1, `pos = 0: de novo o caso especial, porque quem aponta para o primeiro nó é a variável cabeça.`);
      solto = 0;
      cabecaPara = 1;
      religados++;
      push(2, `cabeca = cabeca.prox: a lista passa a começar em ${nome(1)} e o nó ${valores[0]} sai. Remover o primeiro é O(1), enquanto num array seria deslocar todo o resto.`);
      push(3, `Fim, com 1 ponteiro religado.`, { ok: true, fim: true });
      return out;
    }

    push(1, `pos = ${p}, não é 0: sigo pelo caminho de baixo.`);
    ant = 0;
    visitados = 1;
    push(4, `anterior começa na cabeça, ${nome(0)}.`);
    for (let h = 0; h < p - 1; h++) {
      ant = (ant as number) + 1;
      visitados++;
      push(6, `Avanço para ${nome(ant)}. Preciso parar no nó ANTERIOR ao que vou remover: numa lista simplesmente encadeada, ninguém sabe quem aponta para ele.`);
    }
    solto = p;
    bypass = true;
    religados++;
    push(7, `anterior.prox = anterior.prox.prox: ${nome(ant)} passa a apontar direto para ${nome(p + 1)}. O nó ${valores[p]} ficou solto na memória. Percorri ${visitados} nós e religuei 1 ponteiro.`, { ok: true, fim: true });
    return out;
  }

  // buscar
  push(1, nVis === 0
    ? `atual começa na cabeça, que é None: a lista está vazia.`
    : `atual começa na cabeça, ${nome(0)}. Este é o ponteiro auxiliar que só existe para caminhar, a cabeça continua parada onde estava.`);
  if (nVis > 0) {
    ant = 0;
    visitados = 1;
  }
  let i = 0;
  while (i < nVis) {
    ant = i;
    push(2, `atual não é None, então tenho nó para olhar.`);
    const ehSentinela = sentinela && i === 0;
    const v = ehSentinela ? null : valores[i - off];
    if (v === valor) {
      alvo = i;
      push(4, `${v} == ${valor}: achei, depois de visitar ${visitados} ${visitados === 1 ? "nó" : "nós"}. Devolvo a referência do nó, e quem tiver essa referência remove ou insere ao lado dela em O(1).`, { ok: true, fim: true });
      return out;
    }
    push(3, ehSentinela
      ? `O sentinela não guarda valor de verdade, então ele nunca casa com a busca. Sigo em frente.`
      : `${v} != ${valor}: não é este.`);
    i++;
    if (i < nVis) {
      ant = i;
      visitados++;
      push(5, `Avanço para ${nome(i)}. ${visitados} nós visitados.`);
    } else {
      ant = null;
      push(5, `Avanço, e caio no None: a lista acabou.`);
    }
  }
  push(2, `atual é None: não sobrou nó para olhar.`);
  push(6, `O valor ${valor} não está na lista. Buscar numa lista encadeada é sempre O(n): não existe pular para o meio, como o array faz com um índice.`, { fim: true });
  return out;
}

// --- geometria do desenho ---------------------------------------------------
const BOX_W = 66;
const BOX_H = 42;
const STEP = 96;
const PAD_X = 16;
const CY = 92; // linha principal
const Y_NOVO = 180; // linha do nó recém-criado
const X0 = -74; // sobra à esquerda: cabe a etiqueta "cabeça"
const VB_TOPO = 6;
const VB_ALTURA = 206; // com a linha do nó novo
const VB_ALTURA_CURTA = 148; // sem ela (remover e buscar não criam nó)

type Preset = { key: string; rotulo: string; op: Op; pos: number; valor: number; valores?: number[] };

const LISTA_PADRAO = [10, 20, 30, 40, 50];

const PRESETS: Preset[] = [
  { key: "meio", rotulo: "Inserir 35 na posição 3", op: "inserir", pos: 3, valor: 35 },
  { key: "cabeca", rotulo: "Inserir 5 na cabeça", op: "inserir", pos: 0, valor: 5 },
  { key: "fim", rotulo: "Inserir 60 no fim", op: "append", pos: 5, valor: 60 },
  { key: "remove", rotulo: "Remover a posição 2", op: "remover", pos: 2, valor: 35 },
  { key: "remove0", rotulo: "Remover o primeiro", op: "remover", pos: 0, valor: 35 },
  { key: "removeFim", rotulo: "Remover o último", op: "remover", pos: 4, valor: 35 },
  { key: "busca", rotulo: "Buscar o valor 40", op: "buscar", pos: 0, valor: 40 },
  { key: "busca404", rotulo: "Buscar um valor que não existe", op: "buscar", pos: 0, valor: 99 },
  // Os três casos de borda que o artigo manda testar antes de qualquer código.
  { key: "vazia", rotulo: "Lista vazia + inserir", op: "inserir", pos: 0, valor: 7, valores: [] },
  { key: "um", rotulo: "Um nó só + remover", op: "remover", pos: 0, valor: 35, valores: [42] },
  { key: "dois", rotulo: "Dois nós + inserir no meio", op: "inserir", pos: 1, valor: 15, valores: [10, 20] },
];

const OPS: { key: Op; rotulo: string }[] = [
  { key: "inserir", rotulo: "Inserir na posição" },
  { key: "append", rotulo: "Inserir no fim" },
  { key: "remover", rotulo: "Remover a posição" },
  { key: "buscar", rotulo: "Buscar o valor" },
];

export function LinkedListVisualizer() {
  const [valores, setValores] = useState<number[]>(LISTA_PADRAO);
  const [entrada, setEntrada] = useState(LISTA_PADRAO.join(", "));
  const [op, setOp] = useState<Op>("inserir");
  const [pos, setPos] = useState(3);
  const [valor, setValor] = useState(35);
  const [sentinela, setSentinela] = useState(false);
  const [temCauda, setTemCauda] = useState(false);
  const [preset, setPreset] = useState("meio");

  const passos = useMemo(
    () => gerarPassos(valores, sentinela, temCauda, op, pos, valor),
    [valores, sentinela, temCauda, op, pos, valor]
  );
  const total = passos.length;

  const viz = useVisualizer({
    title: "Visualizador · religando ponteiros: inserir, remover e buscar",
    total,
    // O que muda a altura da peça: a operação (o desenho ganha a linha do nó
    // novo, e o bloco de código vai de 5 a 11 linhas), os dois interruptores de
    // estrutura (que trocam a variante do código), o tamanho da lista (o
    // viewBox alarga e o desenho encolhe junto) e o número de passos — remover
    // de uma lista vazia devolve UM passo, e aí o rodapé inteiro some.
    measureOn: [op, sentinela, temCauda, valores.length, total],
  });

  const idx = viz.step;
  const p = passos[idx];

  const reiniciar = viz.reset;

  const aoMudarEntrada = (v: string) => {
    const arr = v.split(",").map((x) => parseInt(x.trim(), 10)).filter((x) => !isNaN(x)).slice(0, 7);
    reiniciar(); setPreset("");
    setEntrada(v); setValores(arr);
  };
  const aoMudarOp = (novaOp: Op) => { reiniciar(); setPreset(""); setOp(novaOp); };
  const aoMudarPos = (v: string) => { reiniciar(); setPreset(""); setPos(Math.max(0, parseInt(v, 10) || 0)); };
  const aoMudarValor = (v: string) => { reiniciar(); setPreset(""); setValor(parseInt(v, 10) || 0); };
  const alternarSentinela = () => { reiniciar(); setSentinela((s) => !s); };
  const alternarCauda = () => { reiniciar(); setTemCauda((s) => !s); };
  const aplicarPreset = (pr: Preset) => {
    reiniciar(); setPreset(pr.key);
    const novos = pr.valores ?? LISTA_PADRAO;
    setValores(novos); setEntrada(novos.join(", "));
    setOp(pr.op); setPos(pr.pos); setValor(pr.valor);
  };
  const sortear = () => {
    const n = 4 + Math.floor(Math.random() * 3);
    const arr = Array.from({ length: n }, () => 5 + Math.floor(Math.random() * 90));
    reiniciar(); setPreset("");
    setValores(arr); setEntrada(arr.join(", "));
    setPos(Math.floor(Math.random() * (n + 1)));
    setValor(5 + Math.floor(Math.random() * 90));
  };

  // --- geometria ------------------------------------------------------------
  const off = sentinela ? 1 : 0;
  const n = valores.length;
  const nVis = n + off;
  const xNo = (i: number) => PAD_X + i * STEP;
  const xNovo = p.novoDepoisDe < 0 ? PAD_X - 48 : xNo(p.novoDepoisDe) + 48;
  // Piso na largura: com a lista quase vazia o viewBox ficaria estreito e o
  // desenho seria esticado até virar caricatura dentro do container.
  const larguraVB = Math.max(560, PAD_X + nVis * STEP + 52 - X0);
  const xNone = xNo(nVis) - 2;
  // A altura é fixa por operação (nunca por passo), senão o desenho pularia de
  // tamanho no meio da animação.
  const alturaVB = op === "inserir" || op === "append" ? VB_ALTURA : VB_ALTURA_CURTA;

  const valorDe = (i: number): string => (sentinela && i === 0 ? "None" : String(valores[i - off]));

  // Uma seta morta é a ligação que deixou de existir neste passo (tracejada) ou
  // a que sobrou pendurada no nó solto (apagada).
  const setaMorta = (i: number): "quebrada" | "fantasma" | null => {
    if (p.solto !== null && i === p.solto) return "fantasma";
    if (p.ant !== null && i === p.ant && (p.ligaEntrada || p.bypass)) return "quebrada";
    return null;
  };

  const codigo = CODIGO[chaveCodigo(op, sentinela, temCauda)];

  const rotuloPonteiro =
    op === "buscar" ? "atual" : op === "append" ? (temCauda ? null : "ultimo") : "anterior";

  const variaveis = [
    { nome: rotuloPonteiro ?? "cauda", valor: p.ant === null ? "None" : sentinela && p.ant === 0 ? "sentinela" : `nó ${valores[p.ant - off]}` },
    { nome: "cabeça", valor: p.cabecaNoNovo ? `nó ${valor}` : sentinela ? "sentinela" : p.cabecaPara >= nVis ? "None" : `nó ${valores[p.cabecaPara]}` },
    { nome: "nós na lista", valor: `${n}` },
    { nome: "custo", valor: custoDaOperacao(op, pos, n, temCauda), best: custoDaOperacao(op, pos, n, temCauda) === "O(1)" },
  ];

  const deslocamentos =
    op === "inserir" ? Math.max(0, n - Math.min(pos, n))
      : op === "remover" ? (n === 0 ? 0 : Math.max(0, n - 1 - Math.min(pos, n - 1)))
        : 0;

  const estatisticas = [
    { k: "vis", rot: "nós percorridos", val: `${p.visitados}` },
    { k: "rel", rot: "ponteiros religados", val: `${p.religados}` },
    { k: "arr", rot: "deslocamentos num array", val: `${deslocamentos}` },
    { k: "mem", rot: "memória extra", val: op === "buscar" || op === "remover" ? "O(1)" : "1 nó" },
  ];

  const notaCls = "viz-note" + (p.ok ? " ok" : p.fim ? " invalid" : "");
  const descricao = `Lista encadeada com ${n} ${n === 1 ? "nó" : "nós"}${n ? `: ${valores.join(", ")}` : " (vazia)"}${sentinela ? ", com nó sentinela" : ""}. ${p.nota}`;

  const quadro = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="ll-grupo">
          <span className="ll-grupo-rot">Operação</span>
          <div className="bigo-chips">
            {OPS.map((o) => (
              <button
                key={o.key}
                className={`bigo-chip${op === o.key ? " on" : ""}`}
                onClick={() => aoMudarOp(o.key)}
                aria-pressed={op === o.key}
              >
                {o.rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className="ll-grupo">
          <span className="ll-grupo-rot">Estrutura</span>
          <div className="bigo-chips">
            <button className={`bigo-chip${sentinela ? " on" : ""}`} onClick={alternarSentinela} aria-pressed={sentinela}>
              <span className="sw" style={{ background: sentinela ? "#a78bfa" : "#3a4a60" }} />
              nó sentinela
            </button>
            <button className={`bigo-chip${temCauda ? " on" : ""}`} onClick={alternarCauda} aria-pressed={temCauda}>
              <span className="sw" style={{ background: temCauda ? "#34d399" : "#3a4a60" }} />
              ponteiro de cauda
            </button>
          </div>
        </div>

        <div className="ll-grupo">
          <span className="ll-grupo-rot">Casos</span>
          <div className="bigo-chips">
            {PRESETS.map((pr) => (
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
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Valores da lista (até 7)</span>
            <input className="viz-input" value={entrada} onChange={(e) => aoMudarEntrada(e.target.value)} />
          </label>
          {op !== "append" && op !== "buscar" ? (
            <label className="viz-field">
              <span>posição</span>
              <input className="viz-input k" type="number" min={0} value={pos} onChange={(e) => aoMudarPos(e.target.value)} />
            </label>
          ) : null}
          {op !== "remover" ? (
            <label className="viz-field">
              <span>valor</span>
              <input className="viz-input k" type="number" value={valor} onChange={(e) => aoMudarValor(e.target.value)} />
            </label>
          ) : null}
          <button className="viz-btn" onClick={sortear}>Sortear</button>
        </div>

        <div className="ll-svg-wrap">
          <svg className="ll-svg" viewBox={`${X0} ${VB_TOPO} ${larguraVB} ${alturaVB}`} role="img" aria-label={descricao}>
            <defs>
              <marker id="llop-seta" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" fill="#4c5f79" />
              </marker>
              <marker id="llop-seta-ok" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" fill="#34d399" />
              </marker>
              <marker id="llop-seta-off" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" fill="#7d5560" />
              </marker>
            </defs>

            {/* a cabeça é uma variável, não um nó: por isso ela é uma etiqueta */}
            <rect x={-68} y={CY - 14} width={56} height={28} rx={8} fill="#0e1725" stroke="rgba(255,255,255,0.16)" />
            <text x={-40} y={CY} fill="#93bbfd" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={11.5} fontWeight={600} textAnchor="middle" dominantBaseline="central">
              cabeça
            </text>
            {p.cabecaNoNovo ? (
              <path
                d={`M -40,${CY + 14} C -40,${CY + 70} ${xNovo + 14},${Y_NOVO - 70} ${xNovo + 14},${Y_NOVO - BOX_H / 2 - 4}`}
                fill="none" stroke="#34d399" strokeWidth={1.8} markerEnd="url(#llop-seta-ok)"
              />
            ) : p.cabecaPara === 0 ? (
              <line x1={-10} y1={CY} x2={xNo(0) - 7} y2={CY} stroke="#3a4a60" strokeWidth={1.6} markerEnd="url(#llop-seta)" />
            ) : (
              <path
                d={`M -40,${CY - 15} Q ${(xNo(p.cabecaPara) - 40) / 2},${CY - 66} ${xNo(p.cabecaPara) - 6},${CY - 14}`}
                fill="none" stroke="#34d399" strokeWidth={1.8} markerEnd="url(#llop-seta-ok)"
              />
            )}

            {/* ponteiro de cauda */}
            {temCauda && nVis > 0 ? (
              <g>
                <rect x={xNo(nVis - 1) + 5} y={16} width={56} height={24} rx={8} fill="#0e1725" stroke="rgba(52,211,153,0.4)" />
                <text x={xNo(nVis - 1) + 33} y={28} fill="#6ee7b7" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={11} fontWeight={600} textAnchor="middle" dominantBaseline="central">
                  cauda
                </text>
                <line x1={xNo(nVis - 1) + 33} y1={41} x2={xNo(nVis - 1) + 33} y2={CY - BOX_H / 2 - 5} stroke="rgba(52,211,153,0.5)" strokeWidth={1.5} markerEnd="url(#llop-seta-ok)" />
              </g>
            ) : null}

            {/* setas entre os nós, e a última apontando para None */}
            {Array.from({ length: nVis }, (_, i) => {
              const morta = setaMorta(i);
              const x1 = xNo(i) + 55;
              const x2 = xNo(i + 1) - 7;
              return (
                <line
                  key={`s${i}`}
                  x1={x1} y1={CY} x2={x2} y2={CY}
                  stroke={morta === "quebrada" ? "#7d5560" : "#3a4a60"}
                  strokeWidth={1.6}
                  strokeDasharray={morta ? "4 4" : undefined}
                  opacity={morta === "fantasma" ? 0.3 : 1}
                  markerEnd={morta ? "url(#llop-seta-off)" : "url(#llop-seta)"}
                />
              );
            })}

            {/* arco que pula o nó removido */}
            {p.bypass && p.ant !== null && p.solto !== null ? (
              <path
                d={`M ${xNo(p.ant) + 55},${CY - 16} Q ${(xNo(p.ant) + 55 + xNo(p.solto + 1) - 7) / 2},${CY - 62} ${xNo(p.solto + 1) - 7},${CY - 14}`}
                fill="none" stroke="#34d399" strokeWidth={1.8} markerEnd="url(#llop-seta-ok)"
              />
            ) : null}

            <text x={xNone} y={CY} fill="#61748c" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={12} textAnchor="start" dominantBaseline="central">
              None
            </text>

            {/* os nós */}
            {Array.from({ length: nVis }, (_, i) => {
              const x = xNo(i);
              const ehSentinela = sentinela && i === 0;
              const solto = p.solto === i;
              const marcado = p.ant === i;
              const achou = p.alvo === i;
              const borda = achou ? "#34d399" : marcado ? "#f59e0b" : ehSentinela ? "rgba(167,139,250,0.55)" : "rgba(255,255,255,0.14)";
              const fundo = achou ? "rgba(52,211,153,0.18)" : marcado ? "rgba(245,158,11,0.14)" : "#0f1826";
              return (
                <g key={`n${i}`} opacity={solto ? 0.34 : 1}>
                  <rect
                    x={x} y={CY - BOX_H / 2} width={BOX_W} height={BOX_H} rx={9}
                    fill={fundo} stroke={borda} strokeWidth={1.8}
                    strokeDasharray={ehSentinela || solto ? "5 4" : undefined}
                  />
                  <line x1={x + 44} y1={CY - BOX_H / 2} x2={x + 44} y2={CY + BOX_H / 2} stroke="rgba(255,255,255,0.12)" strokeWidth={1.2} />
                  <text
                    x={x + 22} y={CY}
                    fill={achou ? "#d1fae5" : marcado ? "#fff" : ehSentinela ? "#c4b5fd" : "#b9c9dd"}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    fontSize={ehSentinela ? 10.5 : 15} fontWeight={600}
                    textAnchor="middle" dominantBaseline="central"
                  >
                    {valorDe(i)}
                  </text>
                  <circle cx={x + 55} cy={CY} r={3.2} fill="#4c5f79" />
                  {ehSentinela ? (
                    <text x={x + 33} y={60} fill="#a78bfa" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={10.5} fontWeight={700} textAnchor="middle" dominantBaseline="central">
                      sentinela
                    </text>
                  ) : null}
                  {marcado && rotuloPonteiro ? (
                    // deslocado para a esquerda de propósito: no x + 33 o rótulo
                    // encostaria na curva que sai do campo prox deste nó.
                    <text x={x + 22} y={CY + BOX_H / 2 + 16} fill="#fcd34d" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={11.5} fontWeight={700} textAnchor="middle" dominantBaseline="central">
                      {rotuloPonteiro}
                    </text>
                  ) : null}
                  {solto ? (
                    <text x={x + 33} y={CY + BOX_H / 2 + 16} fill="#fca5a5" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={11} fontWeight={700} textAnchor="middle" dominantBaseline="central">
                      solto
                    </text>
                  ) : null}
                </g>
              );
            })}

            {/* o nó novo, desenhado fora da linha: nada na lista sai do lugar */}
            {p.mostraNovo ? (
              <g>
                <text x={xNovo - 8} y={Y_NOVO} fill="#6ee7b7" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={11} fontWeight={700} textAnchor="end" dominantBaseline="central">
                  novo
                </text>
                <rect x={xNovo} y={Y_NOVO - BOX_H / 2} width={BOX_W} height={BOX_H} rx={9} fill="rgba(52,211,153,0.14)" stroke="#34d399" strokeWidth={1.8} />
                <line x1={xNovo + 44} y1={Y_NOVO - BOX_H / 2} x2={xNovo + 44} y2={Y_NOVO + BOX_H / 2} stroke="rgba(255,255,255,0.12)" strokeWidth={1.2} />
                <text x={xNovo + 22} y={Y_NOVO} fill="#d1fae5" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize={15} fontWeight={600} textAnchor="middle" dominantBaseline="central">
                  {valor}
                </text>
                <circle cx={xNovo + 55} cy={Y_NOVO} r={3.2} fill="#34d399" />
                {p.ligaSaida ? (
                  <path
                    d={`M ${xNovo + 55},${Y_NOVO} C ${xNovo + 55},${Y_NOVO - 40} ${xNo(p.novoDepoisDe + 1) + 14},${CY + 58} ${xNo(p.novoDepoisDe + 1) + 14},${CY + BOX_H / 2 + 4}`}
                    fill="none" stroke="#34d399" strokeWidth={1.8} markerEnd="url(#llop-seta-ok)"
                  />
                ) : null}
                {p.ligaEntrada && p.novoDepoisDe >= 0 ? (
                  <path
                    d={`M ${xNo(p.novoDepoisDe) + 55},${CY} C ${xNo(p.novoDepoisDe) + 55},${CY + 50} ${xNovo + 14},${Y_NOVO - 50} ${xNovo + 14},${Y_NOVO - BOX_H / 2 - 4}`}
                    fill="none" stroke="#34d399" strokeWidth={1.8} markerEnd="url(#llop-seta-ok)"
                  />
                ) : null}
              </g>
            ) : null}
          </svg>
        </div>

        <p className="ll-legenda">
          <span><i style={{ background: "#3a4a60" }} /> ponteiro que já existia</span>
          <span><i style={{ background: "#34d399" }} /> ponteiro religado agora</span>
          <span><i style={{ background: "#7d5560" }} /> ligação que deixou de existir</span>
          <span><i style={{ background: "#f59e0b" }} /> nó sob o ponteiro que caminha</span>
        </p>

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com a altura do
              código. O `.viz-code-slot` é o truque de grid 1fr→0fr, a única
              forma de animar altura automática em CSS puro. O código fica no
              DOM mesmo recolhido, e é isso que permite medir o pior caso;
              `inert` tira ele do teclado enquanto está fora de vista. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">lista_encadeada.py</div>
              <div className="viz-code-body">
                {codigo.map((txt, i) => (
                  <div key={i} className={`viz-line${i === p.linha ? " on" : ""}`}>
                    <span className="ln">{i + 1}</span>
                    {txt}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div {...viz.varsProps}>
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
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(quadro);
}

// O custo assintótico da operação escolhida, do jeito que ele aparece no artigo.
function custoDaOperacao(op: Op, pos: number, n: number, temCauda: boolean): string {
  if (op === "buscar") return "O(n)";
  if (op === "append") return temCauda ? "O(1)" : "O(n)";
  if (n === 0 || pos <= 0) return "O(1)";
  return "O(n)";
}
