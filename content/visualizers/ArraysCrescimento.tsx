"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// ArraysCrescimento, como o array dinâmico (List, ArrayList, vector, list do
// Python) cresce, e por que o append sai O(1) amortizado.
//
// Padrão "gerador puro de passos". A única coisa que o aluno precisa ver: a
// realocação acontece cada vez MAIS RARO conforme a capacidade cresce, e é isso
// que dilui o custo. Por isso o visualizador mostra dois números lado a lado, o
// total de cópias e o custo médio por append, e compara as quatro estratégias
// com o MESMO número de appends.
//
// `simular` é pura: mesma entrada, mesma lista de passos, sem estado externo.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type EstKey = "dobrar" | "meia" | "mais1" | "reservado";

type Estrategia = {
  key: EstKey;
  rotulo: string;
  sub: string;
  cor: string;
  proximo: (cap: number) => number;
};

const ESTRATEGIAS: Estrategia[] = [
  {
    key: "dobrar",
    rotulo: "dobrar (×2)",
    sub: "List<T> do C#, vector do C++",
    cor: "#60a5fa",
    proximo: (c) => (c < 1 ? 4 : c * 2),
  },
  {
    key: "meia",
    rotulo: "uma vez e meia (×1,5)",
    sub: "ArrayList do Java",
    cor: "#a78bfa",
    proximo: (c) => (c < 2 ? c + 1 : c + Math.floor(c / 2)),
  },
  {
    key: "mais1",
    rotulo: "uma vaga por vez (+1)",
    sub: "o jeito ingênuo, feito na mão",
    cor: "#f87171",
    proximo: (c) => c + 1,
  },
  {
    key: "reservado",
    rotulo: "capacidade reservada",
    sub: "new List(n): você já sabe o tamanho",
    cor: "#34d399",
    proximo: (c) => c * 2,
  },
];

const CODIGO = [
  "def append(lista, valor):",
  "    if lista.tamanho == lista.capacidade:   # cheio",
  "        lista.dados = copia_para(cresce(lista.capacidade))",
  "    lista.dados[lista.tamanho] = valor",
  "    lista.tamanho += 1",
];

const CAPS_INICIAIS = [1, 2, 4, 8];
const MIN_APPENDS = 6;
const MAX_APPENDS = 24;

type Passo = {
  tamanho: number;
  capacidade: number;
  copias: number;
  realocacoes: number;
  ops: number;
  copiando: boolean;
  escreve: number | null;
  linha: number;
  fim?: boolean;
  nota: string;
};

type Resumo = { copias: number; realocacoes: number; ops: number; capFinal: number; media: number };

function milhar(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Média com uma casa decimal, sem Intl (o HTML do build tem que bater com o do
// cliente na hidratação).
function media1(total: number, n: number): string {
  if (n <= 0) return "0";
  const r = Math.round((total / n) * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1).replace(".", ",");
}

function capInicialDe(est: EstKey, cap0: number, n: number): number {
  return est === "reservado" ? n : cap0;
}

function resumo(est: EstKey, cap0: number, n: number): Resumo {
  const e = ESTRATEGIAS.find((x) => x.key === est) ?? ESTRATEGIAS[0];
  let cap = capInicialDe(est, cap0, n);
  let tamanho = 0;
  let copias = 0;
  let realocacoes = 0;
  let guarda = 0;
  while (tamanho < n && guarda++ < 500) {
    if (tamanho === cap) {
      copias += tamanho;
      realocacoes += 1;
      cap = Math.max(cap + 1, e.proximo(cap));
    }
    tamanho += 1;
  }
  const ops = n + copias;
  return { copias, realocacoes, ops, capFinal: cap, media: ops / Math.max(1, n) };
}

function simular(est: EstKey, cap0: number, n: number): Passo[] {
  const e = ESTRATEGIAS.find((x) => x.key === est) ?? ESTRATEGIAS[0];
  const out: Passo[] = [];
  let cap = capInicialDe(est, cap0, n);
  let tamanho = 0;
  let copias = 0;
  let realocacoes = 0;
  let ops = 0;

  out.push({
    tamanho,
    capacidade: cap,
    copias,
    realocacoes,
    ops,
    copiando: false,
    escreve: null,
    linha: 0,
    nota:
      est === "reservado"
        ? `Nasci já com capacidade ${cap}, do tamanho exato do que vou receber. Vamos ver quantas cópias isso economiza.`
        : `Começo com capacidade ${cap} e tamanho 0. Vou receber ${n} appends e crescer sozinho, ${e.rotulo}.`,
  });

  let guarda = 0;
  while (tamanho < n && guarda++ < 500) {
    if (tamanho === cap) {
      const novo = Math.max(cap + 1, e.proximo(cap));
      copias += tamanho;
      realocacoes += 1;
      ops += tamanho;
      out.push({
        tamanho,
        capacidade: novo,
        copias,
        realocacoes,
        ops,
        copiando: true,
        escreve: null,
        linha: 2,
        nota: `Cheio: ${tamanho} de ${cap}. Peço um bloco novo de ${novo} posições contíguas, copio os ${tamanho} itens que já existiam para lá e devolvo o bloco velho. Foram ${tamanho} cópias de uma vez, e este append virou O(n).`,
      });
      cap = novo;
    }
    tamanho += 1;
    ops += 1;
    out.push({
      tamanho,
      capacidade: cap,
      copias,
      realocacoes,
      ops,
      copiando: false,
      escreve: tamanho - 1,
      linha: 3,
      nota: `Append ${tamanho}: escrevo na vaga ${tamanho - 1}, que já era minha. Uma operação, ninguém se move. Sobram ${cap - tamanho} ${cap - tamanho === 1 ? "vaga" : "vagas"}.`,
    });
  }

  out.push({
    tamanho,
    capacidade: cap,
    copias,
    realocacoes,
    ops,
    copiando: false,
    escreve: null,
    linha: 4,
    fim: true,
    nota: `${n} appends custaram ${milhar(n)} escritas + ${milhar(copias)} cópias = ${milhar(ops)} operações, média de ${media1(ops, n)} por append. ${
      est === "mais1"
        ? "Crescer de 1 em 1 refaz o array quase toda vez: isso é O(n) por append, e O(n²) no total."
        : est === "reservado"
          ? "Zero realocações: reservar a capacidade certa é o único jeito de o append custar exatamente 1."
          : "A média não sobe quando n cresce, e é por isso que se diz que o append é O(1) amortizado."
    } Capacidade final ${cap}, com ${cap - tamanho} ${cap - tamanho === 1 ? "vaga ociosa" : "vagas ociosas"}.`,
  });

  return out;
}

export function ArraysCrescimento() {
  const [est, setEst] = useState<EstKey>("dobrar");
  const [cap0, setCap0] = useState(4);
  const [n, setN] = useState(20);

  const passos = useMemo(() => simular(est, cap0, n), [est, cap0, n]);
  const total = passos.length;

  const comparacao = useMemo(
    () => ESTRATEGIAS.map((e) => ({ e, r: resumo(e.key, cap0, n) })),
    [cap0, n]
  );

  const viz = useVisualizer({
    title: "Visualizador · o array dinâmico crescendo sozinho",
    total,
    // Este anda rápido de propósito: 25 passos de append no ritmo padrão viram
    // uma espera, e o que se quer ver é a REALOCAÇÃO ficando rara, não cada
    // escrita. A marcha 4 é a "1.5x".
    initialSpeed: 4,
    // O que muda a altura da peça: a estratégia e os dois parâmetros que
    // decidem quantas vagas a fita chega a mostrar (até 32, que quebram linha).
    measureOn: [est, cap0, n],
  });

  const idx = viz.step;
  const p = passos[idx];

  const zerar = () => viz.reset();

  const slots = Array.from({ length: p.capacidade }, (_, i) => {
    let cls = "viz-cell";
    const cheio = i < p.tamanho;
    if (!cheio) cls += " arr-vaga";
    if (p.copiando && cheio) cls += " sai";
    if (i === p.escreve) cls += " in entra";
    else if (cheio && !p.copiando) cls += " in";
    return { i, cheio, cls };
  });

  const variaveis = [
    { nome: "tamanho", valor: `${p.tamanho}` },
    { nome: "capacidade", valor: `${p.capacidade}` },
    { nome: "cópias", valor: `${p.copias}` },
    { nome: "operações", valor: `${p.ops}`, best: true },
  ];

  const notaCls = "viz-note" + (p.fim ? " ok" : p.copiando ? " invalid" : "");

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="arr-tabs" role="group" aria-label="Estratégia de crescimento">
          {ESTRATEGIAS.map((e) => (
            <button
              key={e.key}
              className={`arr-tab${e.key === est ? " on" : ""}`}
              aria-pressed={e.key === est}
              onClick={() => {
                zerar();
                setEst(e.key);
              }}
            >
              {e.rotulo}
            </button>
          ))}
        </div>

        <div className="viz-inputs" style={{ marginTop: 16 }}>
          <div className="viz-field grow">
            <span>Quantos appends: {n}</span>
            <input
              type="range"
              min={MIN_APPENDS}
              max={MAX_APPENDS}
              step={1}
              value={n}
              onChange={(e) => {
                zerar();
                setN(parseInt(e.target.value, 10));
              }}
              style={{ accentColor: "var(--ccc-accent)", width: "100%" }}
            />
          </div>
          <div className="viz-field">
            <span>Capacidade inicial</span>
            <div className="arr-tabs">
              {CAPS_INICIAIS.map((c) => (
                <button
                  key={c}
                  className={`arr-tab${c === cap0 ? " on" : ""}`}
                  aria-pressed={c === cap0}
                  disabled={est === "reservado"}
                  onClick={() => {
                    zerar();
                    setCap0(c);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="viz-cells arr-compact">
          {slots.map((s) => (
            <div className="viz-cell-wrap" key={s.i}>
              <span className="viz-cell-idx">{s.i}</span>
              <div className={s.cls}>{s.cheio ? s.i + 1 : "·"}</div>
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
              <div className="viz-code-head">array_dinamico.py</div>
              <div className="viz-code-body">
                {CODIGO.map((txt, nLinha) => (
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
            <span>Realocações</span>
            <strong>{milhar(p.realocacoes)}</strong>
          </div>
          <div className="bigo-stat">
            <span>Cópias acumuladas</span>
            <strong>{milhar(p.copias)}</strong>
          </div>
          <div className="bigo-stat">
            <span>Custo médio por append</span>
            <strong>{media1(p.ops, Math.max(1, p.tamanho))}</strong>
          </div>
          <div className="bigo-stat">
            <span>Vagas ociosas</span>
            <strong>{milhar(p.capacidade - p.tamanho)}</strong>
          </div>
        </div>

        <div className="arr-cmp-rot">As quatro estratégias com os mesmos {n} appends</div>
        <div className="bigo-grid">
          {comparacao.map(({ e, r }) => (
            <div
              className="bigo-card"
              key={e.key}
              style={{ borderLeftColor: e.key === est ? e.cor : "var(--ccc-line)" }}
            >
              <div className="bigo-card-top">
                <span className="bigo-card-nome" style={{ color: e.key === est ? e.cor : undefined }}>
                  {e.rotulo}
                </span>
                <span className="bigo-card-val">{media1(r.ops, n)}×</span>
              </div>
              <div className="bigo-card-ex">
                {milhar(r.copias)} cópias · {r.realocacoes} {r.realocacoes === 1 ? "realocação" : "realocações"} · capacidade final {r.capFinal}
              </div>
              <div className="bigo-card-ex">{e.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(frame);
}
