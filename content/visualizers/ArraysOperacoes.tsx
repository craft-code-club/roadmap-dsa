"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// ArraysOperacoes, o custo real de cada operação num array.
//
// Padrão "gerador puro de passos" (mesmo do TwoPointersVisualizer): cada
// operação tem o SEU bloco de CODIGO, e o campo `linha` de cada passo aponta
// 1:1 para uma linha desse bloco. Trocar de operação troca o código junto.
//
// A única coisa que o aluno precisa ver: o deslocamento em cascata. Ler,
// escrever e mexer na ponta não movem ninguém (O(1)); mexer no meio empurra
// todo mundo que está depois (O(n)). O contador de deslocamentos é o que
// separa os dois, e a projeção para n = 1.000.000 é o que dá escala à conta.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type Passo = {
  slots: (number | null)[];
  n: number;
  escreve: number | null;
  le: number | null;
  desloc: number;
  ops: number;
  linha: number;
  fim?: boolean;
  ok?: boolean;
  nota: string;
};

type OpKey = "acessar" | "inserir-fim" | "inserir" | "remover" | "remover-fim";

const CODIGOS: Record<OpKey, string[]> = {
  acessar: [
    "def acessar(nums, k):",
    "    return nums[k]        # base + k * tamanho, uma conta só",
  ],
  "inserir-fim": [
    "def inserir_no_fim(nums, n, valor):",
    "    nums[n] = valor       # a primeira vaga livre",
    "    n = n + 1",
    "    return n",
  ],
  inserir: [
    "def inserir(nums, n, k, valor):",
    "    for i in range(n - 1, k - 1, -1):   # do fim até a posição k",
    "        nums[i + 1] = nums[i]           # empurra um passo à direita",
    "    nums[k] = valor",
    "    n = n + 1",
    "    return n",
  ],
  remover: [
    "def remover(nums, n, k):",
    "    for i in range(k, n - 1):           # de k até o penúltimo",
    "        nums[i] = nums[i + 1]           # puxa um passo à esquerda",
    "    n = n - 1",
    "    return n",
  ],
  "remover-fim": [
    "def remover_do_fim(nums, n):",
    "    n = n - 1             # só o tamanho muda",
    "    return n              # o valor antigo continua lá, virou lixo",
  ],
};

const ROTULOS: Record<OpKey, string> = {
  acessar: "ler nums[k]",
  "inserir-fim": "inserir no fim",
  inserir: "inserir na posição k",
  remover: "remover a posição k",
  "remover-fim": "remover do fim",
};

const OPS: OpKey[] = ["acessar", "inserir-fim", "inserir", "remover", "remover-fim"];

const DEFAULT_NUMS = [12, 7, 45, 3, 20, 8];
const FOLGA = 3; // vagas livres à direita, para caber a inserção
const N_GRANDE = 1000000;

function milhar(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function gerarPassos(op: OpKey, nums: number[], kBruto: number, valor: number): Passo[] {
  const out: Passo[] = [];
  const n0 = nums.length;
  let slots: (number | null)[] = [...nums, ...Array(FOLGA).fill(null)];
  let n = n0;
  let desloc = 0;
  let ops = 0;

  const k = clampK(op, n0, kBruto);
  const push = (p: Omit<Passo, "slots" | "n" | "desloc" | "ops">) =>
    out.push({ ...p, slots: [...slots], n, desloc, ops });

  if (op === "acessar") {
    push({
      escreve: null,
      le: null,
      linha: 0,
      nota: `Quero o valor da posição ${k}. Não vou percorrer nada: o array me dá o endereço por conta.`,
    });
    ops = 1;
    out.push({
      slots: [...slots],
      n,
      desloc,
      ops,
      escreve: null,
      le: k,
      linha: 1,
      fim: true,
      ok: true,
      nota: `Endereço = base + ${k} × tamanho. Leio ${nums[k]} e acabou: 1 operação, com 6 posições ou com 6 milhões. Isso é O(1).`,
    });
    return out;
  }

  if (op === "inserir-fim") {
    push({
      escreve: null,
      le: null,
      linha: 0,
      nota: `Quero acrescentar ${valor}. O primeiro espaço livre é o índice ${n}, e ninguém precisa sair do lugar.`,
    });
    slots = [...slots];
    slots[n] = valor;
    ops = 1;
    push({ escreve: n, le: null, linha: 1, nota: `Escrevo ${valor} direto na vaga ${n}. Zero deslocamentos.` });
    n = n + 1;
    push({ escreve: n - 1, le: null, linha: 2, nota: `O tamanho vai de ${n - 1} para ${n}.` });
    push({
      escreve: null,
      le: null,
      linha: 3,
      fim: true,
      ok: true,
      nota: `Pronto: 1 operação, 0 deslocamentos. Inserir na ponta direita é O(1), e é por isso que append é a operação favorita de qualquer array.`,
    });
    return out;
  }

  if (op === "remover-fim") {
    const ultimo = slots[n - 1];
    push({
      escreve: null,
      le: n - 1,
      linha: 0,
      nota: `Quero tirar o último item (${ultimo}, no índice ${n - 1}). Ninguém depois dele precisa andar, porque não existe ninguém depois dele.`,
    });
    n = n - 1;
    ops = 1;
    push({
      escreve: null,
      le: n,
      linha: 1,
      nota: `Só recuo o tamanho de ${n + 1} para ${n}. O ${ultimo} continua gravado na memória, virou lixo: some da lista sem sair da RAM.`,
    });
    push({
      escreve: null,
      le: null,
      linha: 2,
      fim: true,
      ok: true,
      nota: `1 operação, 0 deslocamentos: O(1). Da próxima vez que alguém der append, esse byte é sobrescrito e ninguém percebe.`,
    });
    return out;
  }

  if (op === "inserir") {
    const ocupante = slots[k];
    push({
      escreve: null,
      le: k,
      linha: 0,
      nota:
        k >= n
          ? `Posição ${k} é logo depois do último item: nada para empurrar.`
          : `Quero enfiar ${valor} na posição ${k}, que hoje guarda ${ocupante}. Todo mundo de ${k} para a direita tem que andar um passo.`,
    });
    push({
      escreve: null,
      le: null,
      linha: 1,
      nota:
        k >= n
          ? `O laço vai de ${n - 1} até ${k}, ou seja, não roda nenhuma vez: k = ${k} já é a primeira vaga livre. Zero deslocamentos, este é o caso barato.`
          : `Vou do último item (índice ${n - 1}) até a posição ${k}, de trás para frente. Se eu fosse do começo para o fim, sobrescreveria o vizinho antes de copiá-lo.`,
    });
    let guarda = 0;
    for (let i = n - 1; i >= k && guarda++ < 200; i--) {
      const v = slots[i];
      slots = [...slots];
      slots[i + 1] = v;
      desloc += 1;
      ops += 1;
      push({
        escreve: i + 1,
        le: i,
        linha: 2,
        nota: `Copio ${v} do índice ${i} para o ${i + 1}. Deslocamento número ${desloc}.`,
      });
    }
    slots = [...slots];
    slots[k] = valor;
    ops += 1;
    push({
      escreve: k,
      le: null,
      linha: 3,
      nota:
        desloc === 0
          ? `A posição ${k} já estava livre: escrevo ${valor} nela sem ter movido ninguém.`
          : `Agora a posição ${k} está vaga: escrevo ${valor} nela.`,
    });
    n = n + 1;
    push({ escreve: k, le: null, linha: 4, nota: `O tamanho vai de ${n - 1} para ${n}.` });
    push({
      escreve: null,
      le: null,
      linha: 5,
      fim: true,
      ok: true,
      nota:
        desloc === 0
          ? `Total: 0 deslocamentos + 1 escrita = 1 operação. O custo é n - k = ${n0} - ${k} = 0, porque não existe ninguém à direita de k: inserir na ponta é o caso barato. Mude o k para 0 e compare.`
          : `Total: ${desloc} ${desloc === 1 ? "deslocamento" : "deslocamentos"} + 1 escrita = ${ops} operações. O custo é n - k = ${n0} - ${k} = ${desloc}, ou seja O(n): quanto mais à esquerda, mais caro.`,
    });
    return out;
  }

  // remover na posição k
  const saindo = slots[k];
  push({
    escreve: null,
    le: k,
    linha: 0,
    nota: `Quero arrancar o ${saindo} da posição ${k}. O buraco não pode ficar: array não tem buraco, tem sequência.`,
  });
  push({
    escreve: null,
    le: null,
    linha: 1,
    nota:
      k >= n - 1
        ? `O laço vai de ${k} até ${n - 2}, ou seja, não roda nenhuma vez: não existe ninguém depois da posição ${k} para puxar. Zero deslocamentos.`
        : `Vou de ${k} até o penúltimo (índice ${n - 2}), do começo para o fim, puxando cada vizinho um passo para a esquerda.`,
  });
  let guarda = 0;
  for (let i = k; i < n - 1 && guarda++ < 200; i++) {
    const v = slots[i + 1];
    slots = [...slots];
    slots[i] = v;
    desloc += 1;
    ops += 1;
    push({
      escreve: i,
      le: i + 1,
      linha: 2,
      nota: `Puxo ${v} do índice ${i + 1} para o ${i}. Deslocamento número ${desloc}.`,
    });
  }
  n = n - 1;
  push({
    escreve: null,
    le: null,
    linha: 3,
    nota:
      desloc === 0
        ? `O tamanho cai de ${n + 1} para ${n} e mais nada acontece. O ${saindo} continua gravado exatamente onde estava: saiu do tamanho lógico, virou lixo, e some da lista sem sair da RAM.`
        : `O tamanho cai de ${n + 1} para ${n}. A última posição ficou com uma cópia do item anterior e ninguém apagou nada: ela só saiu do tamanho lógico e virou lixo.`,
  });
  push({
    escreve: null,
    le: null,
    linha: 4,
    fim: true,
    ok: true,
    nota:
      desloc === 0
        ? `Total: 0 deslocamentos. O custo é n - 1 - k = ${n0} - 1 - ${k} = 0, porque a posição ${k} é a última: remover da ponta direita é o caso barato, O(1). Mude o k para 0 e veja o pior caso.`
        : `Total: ${desloc} ${desloc === 1 ? "deslocamento" : "deslocamentos"}. O custo é n - 1 - k = ${n0} - 1 - ${k} = ${desloc}, de novo O(n). Remover a posição 0 é o pior caso: mexe em todo mundo.`,
  });
  return out;
}

// k efetivo: inserir aceita a posição logo depois do último item, as outras não.
function clampK(op: OpKey, n: number, k: number): number {
  const limite = op === "inserir" ? n : n - 1;
  return Math.min(Math.max(k, 0), Math.max(0, limite));
}

function piorCasoMilhao(op: OpKey): string {
  if (op === "acessar") return "1";
  if (op === "inserir-fim" || op === "remover-fim") return "0";
  return milhar(N_GRANDE);
}

function complexidade(op: OpKey): string {
  return op === "inserir" || op === "remover" ? "O(n)" : "O(1)";
}

export function ArraysOperacoes() {
  const [entrada, setEntrada] = useState(DEFAULT_NUMS.join(", "));
  const [nums, setNums] = useState<number[]>(DEFAULT_NUMS);
  const [op, setOp] = useState<OpKey>("inserir");
  const [k, setK] = useState(2);
  const [valor, setValor] = useState(99);

  const passos = useMemo(() => gerarPassos(op, nums.length ? nums : [0], k, valor), [op, nums, k, valor]);
  const total = passos.length;
  const codigo = CODIGOS[op];

  const viz = useVisualizer({
    title: "Visualizador · o que cada operação custa de verdade",
    total,
    // O que muda a altura da peça: a operação (o código vai de 2 a 6 linhas) e
    // quantas células cabem na fita (o array mais a folga da inserção).
    measureOn: [op, nums.length],
  });

  const idx = viz.step;
  const p = passos[idx];

  const zerar = () => viz.reset();

  const aoMudarEntrada = (v: string) => {
    const arr = v
      .split(",")
      .map((x) => parseInt(x.trim(), 10))
      .filter((x) => !isNaN(x))
      .slice(0, 12);
    zerar();
    setEntrada(v);
    setNums(arr.length ? arr : [0]);
  };

  const escolher = (novaOp: OpKey, novoK?: number) => {
    zerar();
    setOp(novaOp);
    if (novoK !== undefined) setK(novoK);
  };

  // Presets dos exercícios do artigo: os dois casos de borda em que o custo é
  // ZERO, que é justamente o que a intuição erra.
  const preset = (arr: number[], novaOp: OpKey, novoK: number) => {
    zerar();
    setNums(arr);
    setEntrada(arr.join(", "));
    setOp(novaOp);
    setK(novoK);
  };

  const sortear = () => {
    const qtd = 5 + Math.floor(Math.random() * 4);
    const arr = Array.from({ length: qtd }, () => 1 + Math.floor(Math.random() * 60));
    zerar();
    setNums(arr);
    setEntrada(arr.join(", "));
    setK(Math.floor(qtd / 2));
  };

  const kEfetivo = clampK(op, nums.length, k);
  const marcaK = op === "inserir-fim" || op === "remover-fim" ? -1 : kEfetivo;

  // Vaga = posição alocada e vazia. Lixo = posição que ainda guarda um valor
  // mas já saiu do tamanho lógico: é exatamente o que sobra depois de um
  // remover, e é a coisa mais contraintuitiva desta estrutura.
  const cells = p.slots.map((v, i) => {
    let cls = "viz-cell";
    if (v === null) cls += " arr-vaga";
    else if (i >= p.n) cls += " arr-lixo";
    if (i === p.le) cls += " sai";
    if (i === p.escreve) cls += " in entra";
    return { i, v, cls, marca: i === marcaK ? "k" : "" };
  });

  const variaveis = [
    { nome: "n (tamanho)", valor: `${p.n}` },
    { nome: "k (posição)", valor: op === "inserir-fim" || op === "remover-fim" ? "ponta" : `${kEfetivo}` },
    { nome: "deslocamentos", valor: `${p.desloc}` },
    { nome: "operações", valor: `${p.ops}`, best: true },
  ];

  const notaCls = "viz-note" + (p.fim ? " ok" : "");
  const precisaK = op === "inserir" || op === "remover" || op === "acessar";
  const precisaValor = op === "inserir" || op === "inserir-fim";

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Array</span>
            <input className="viz-input" value={entrada} onChange={(e) => aoMudarEntrada(e.target.value)} />
          </label>
          <label className="viz-field">
            <span>posição k</span>
            <input
              className="viz-input k"
              type="number"
              value={k}
              disabled={!precisaK}
              onChange={(e) => {
                zerar();
                setK(parseInt(e.target.value, 10) || 0);
              }}
            />
          </label>
          <label className="viz-field">
            <span>valor</span>
            <input
              className="viz-input k"
              type="number"
              value={valor}
              disabled={!precisaValor}
              onChange={(e) => {
                zerar();
                setValor(parseInt(e.target.value, 10) || 0);
              }}
            />
          </label>
          <button className="viz-btn" onClick={sortear}>
            Sortear
          </button>
        </div>

        <div className="arr-tabs" role="group" aria-label="Operação">
          {OPS.map((o) => (
            <button
              key={o}
              className={`arr-tab${o === op ? " on" : ""}`}
              aria-pressed={o === op}
              onClick={() => escolher(o)}
            >
              {ROTULOS[o]}
            </button>
          ))}
        </div>

        <div className="viz-cells" style={{ marginTop: 18 }}>
          {cells.map((c) => (
            <div className="viz-cell-wrap" key={c.i}>
              <span className="viz-cell-idx">{c.i}</span>
              <div className={c.cls}>{c.v === null ? "·" : c.v}</div>
              <span className={`viz-mark${c.marca ? " show" : ""}`}>{c.marca || "·"}</span>
            </div>
          ))}
        </div>

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com a altura do
              código. O `.viz-code-slot` é o truque de grid 1fr→0fr, a única
              forma de animar altura automática em CSS puro. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">operacoes.py</div>
              <div className="viz-code-body">
                {codigo.map((txt, nLinha) => (
                  <div key={nLinha} className={`viz-line${nLinha === p.linha ? " on" : ""}`}>
                    <span className="ln">{nLinha + 1}</span>
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
          <div className="bigo-stat">
            <span>Deslocamentos aqui</span>
            <strong>{milhar(p.desloc)}</strong>
          </div>
          <div className="bigo-stat">
            <span>Operações aqui</span>
            <strong>{milhar(p.ops)}</strong>
          </div>
          <div className="bigo-stat">
            <span>Pior caso com n = 1 milhão</span>
            <strong>{piorCasoMilhao(op)}</strong>
          </div>
          <div className="bigo-stat">
            <span>Complexidade</span>
            <strong>{complexidade(op)}</strong>
          </div>
        </div>

        {/* Os presets seguem no miolo, e não no rodapé: são onze botões, e no
            painel expandido eles empurrariam os controles de reprodução para
            fora da tela — exatamente o que a casca existe para impedir. */}
        <div className="viz-controls">
          <span className="arr-presets-rot">Compare:</span>
          <button className="viz-btn" onClick={() => escolher("inserir", 0)}>
            inserir no começo
          </button>
          <button className="viz-btn" onClick={() => escolher("inserir", 3)}>
            inserir no meio
          </button>
          <button className="viz-btn" onClick={() => escolher("inserir-fim")}>
            inserir no fim
          </button>
          <button className="viz-btn" onClick={() => escolher("remover", 0)}>
            remover o primeiro
          </button>
        </div>

        <div className="viz-controls">
          <span className="arr-presets-rot">Casos de borda:</span>
          <button className="viz-btn" onClick={() => preset([42], "remover", 0)} title="Um elemento só, removendo a posição 0">
            n = 1, remover o único
          </button>
          <button
            className="viz-btn"
            onClick={() => preset(DEFAULT_NUMS, "inserir", DEFAULT_NUMS.length)}
            title="Inserir na posição igual ao tamanho é inserir no fim"
          >
            k = n, inserir logo após o último
          </button>
          <button className="viz-btn" onClick={() => preset(DEFAULT_NUMS, "remover", DEFAULT_NUMS.length - 1)}>
            remover a última posição
          </button>
        </div>
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(frame);
}
