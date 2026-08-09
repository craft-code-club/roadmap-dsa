"use client";

import { useMemo, useState } from "react";

import { thousands } from "@/lib/format";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// ArraysVisualizer, memória contígua e o cálculo do endereço.
//
// A única coisa que o aluno precisa ver aqui é POR QUE o acesso por índice é
// O(1): não existe caminhada, existe uma conta. O "passo" deste visualizador é
// o próprio índice, então rodar do começo ao fim mostra o endereço andando de
// `tamanho` em `tamanho` bytes, sempre o mesmo salto.
//
// O modo "linha de cache" pinta o bloco de 64 bytes que o processador puxa
// junto. É o que transforma "memória contígua" de curiosidade em vantagem
// prática: uma leitura traz os vizinhos de graça.
//
// Nada de Intl/Date/Math.random no render: a formatação hexadecimal e a de
// milhar são determinísticas para o HTML do build bater com o do cliente.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type ElementSize = { key: string; label: string; bytes: number; example: string };

const ELEMENT_SIZES: ElementSize[] = [
  { key: "b1", label: "1 byte", bytes: 1, example: "byte, bool, char do C" },
  { key: "b2", label: "2 bytes", bytes: 2, example: "short, char do Java" },
  { key: "b4", label: "4 bytes", bytes: 4, example: "int, float" },
  { key: "b8", label: "8 bytes", bytes: 8, example: "long, double, ponteiro" },
];

const CACHE_LINE = 64;
const DEFAULT_BASE = 0x1000;
const MAX_ITEMS = 20;
const DEFAULT_NUMS = [12, 7, 45, 3, 20, 8, 31, 16];

// A peça abre no índice 3, não no 0, e o motivo é a aula: em `i = 0` a conta que
// ela existe para mostrar degenera (`0 × 4 = 0`, o endereço é o próprio base) e
// o leitor que não clica em nada vê o caso em que a fórmula some. Antes da casca
// isso era o `useState(3)` do componente.
const INITIAL_INDEX = 3;

function hex(v: number): string {
  const t = Math.max(0, Math.round(v)).toString(16).toUpperCase();
  return "0x" + (t.length < 4 ? "0".repeat(4 - t.length) + t : t);
}

function readBase(text: string): number {
  const clean = text.trim().replace(/^0x/i, "");
  const v = parseInt(clean, 16);
  if (!isFinite(v) || v < 0) return DEFAULT_BASE;
  return Math.min(v, 0xffffff);
}

function readNums(text: string): number[] {
  const arr = text
    .split(",")
    .map((x) => parseInt(x.trim(), 10))
    .filter((x) => !isNaN(x))
    .slice(0, MAX_ITEMS);
  return arr.length ? arr : [0];
}

export function ArraysVisualizer() {
  const [input, setInput] = useState(DEFAULT_NUMS.join(", "));
  const [nums, setNums] = useState<number[]>(DEFAULT_NUMS);
  const [sizeKey, setSizeKey] = useState("b4");
  const [baseText, setBaseText] = useState("0x1000");
  const [cache, setCache] = useState(false);

  const elem = useMemo(() => ELEMENT_SIZES.find((t) => t.key === sizeKey) ?? ELEMENT_SIZES[2], [sizeKey]);
  const base = useMemo(() => readBase(baseText), [baseText]);
  const n = nums.length;

  // O passo AQUI é o índice lido: andar na linha do tempo é andar no array.
  const viz = useVisualizer({
    title: "Visualizador · memória contígua e o endereço de nums[i]",
    total: n,
    // O que muda a altura da peça: quantas células (elas quebram linha), o mapa
    // de linhas de cache aparecendo, e o tamanho do elemento — que muda quantas
    // linhas de cache o array ocupa, e portanto quantos cartões o mapa tem.
    measureOn: [n, cache, sizeKey],
  });

  // Ajuste na fase de RENDER, não num `useEffect`: o hook sempre começa no passo
  // 0, e é assim que o passo certo entra também no HTML do build estático. Com
  // efeito, o `out/` congelaria no índice 0 e só o cliente corrigiria — foi o
  // que aconteceu, e quem pegou foi o diff do texto renderizado. Contrato §9.
  const [placed, setPlaced] = useState(false);
  if (!placed) {
    setPlaced(true);
    viz.setStep(INITIAL_INDEX);
  }

  const idx = viz.step;

  // Salto ABSOLUTO para o índice clicado, não um delta a partir de `idx`: o
  // clique rápido repete mais depressa do que o React re-renderiza, então dois
  // cliques leem o mesmo `idx` do closure e somam o mesmo delta duas vezes.
  // É o mesmo idioma dos presets logo abaixo — `reset` é o que para o relógio.
  const goToIndex = (k: number) => {
    viz.reset();
    viz.setStep(k);
  };

  const onInputChange = (v: string) => {
    viz.reset();
    setInput(v);
    setNums(readNums(v));
  };

  const randomize = () => {
    const count = 7 + Math.floor(Math.random() * 4);
    const arr = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 60));
    viz.reset();
    setNums(arr);
    setInput(arr.join(", "));
    viz.setStep(Math.floor(count / 2));
  };

  const preset20 = () => {
    const arr = Array.from({ length: 20 }, (_, k) => (k + 1) * 3);
    viz.reset();
    setNums(arr);
    setInput(arr.join(", "));
    setSizeKey("b4");
    setBaseText("0x1000");
    setCache(true);
    viz.setStep(16);
  };

  const restore = () => {
    viz.reset();
    setNums(DEFAULT_NUMS);
    setInput(DEFAULT_NUMS.join(", "));
    setSizeKey("b4");
    setBaseText("0x1000");
    setCache(false);
    viz.setStep(INITIAL_INDEX);
  };

  const bytes = elem.bytes;
  const address = base + idx * bytes;
  const targetBlock = Math.floor(address / CACHE_LINE);
  const totalBytes = n * bytes;
  const sameLineCount = nums.filter((_, k) => Math.floor((base + k * bytes) / CACHE_LINE) === targetBlock).length;

  const cells = nums.map((v, k) => {
    const addr = base + k * bytes;
    const sameBlock = Math.floor(addr / CACHE_LINE) === targetBlock;
    let cls = "viz-cell arr-cell-btn";
    if (cache && sameBlock) cls += " arr-cache";
    if (k === idx) cls += " in";
    return { k, v, addr, cls, sameBlock };
  });

  // Mapa das linhas de cache: um bloco de 64 B por chip, com o intervalo de
  // índices que mora nele. É o que torna visível a frase "o array de 20
  // posições ocupa duas linhas": sozinho, o realce só pinta a linha lida.
  // Como o passo (1 a 8 bytes) é sempre menor que a linha, nenhum bloco entre
  // o primeiro e o último fica vazio, então a contagem bate com o cartão.
  const firstBlock = Math.floor(base / CACHE_LINE);
  const lastBlock = Math.floor((base + (n - 1) * bytes) / CACHE_LINE);
  const cacheLines: { block: number; from: number; to: number; current: boolean }[] = [];
  for (let b = firstBlock; b <= lastBlock; b++) {
    const inside = cells.filter((c) => Math.floor(c.addr / CACHE_LINE) === b);
    if (!inside.length) continue;
    cacheLines.push({
      block: b,
      from: inside[0].k,
      to: inside[inside.length - 1].k,
      current: b === targetBlock,
    });
  }

  const note = cache
    ? `O processador não busca 1 valor, busca a linha de cache inteira (${CACHE_LINE} bytes). Ler nums[${idx}] em ${hex(address)} já traz ${sameLineCount} ${sameLineCount === 1 ? "posição" : "posições"} deste array para o L1: percorrer na ordem sai quase de graça.`
    : idx === 0
      ? `nums[0] mora no próprio endereço base: 0 × ${bytes} = 0 byte de deslocamento, o valor ${nums[0]} está em ${hex(address)}.`
      : `Para chegar em nums[${idx}] eu não caminho por ninguém: multiplico ${idx} × ${bytes} = ${idx * bytes} bytes, somo no endereço base ${hex(base)} e leio ${nums[idx]} direto em ${hex(address)}. Duas contas, sempre as mesmas.`;

  const vars = [
    { name: "base", value: hex(base) },
    { name: "i", value: `${idx}` },
    { name: "tamanho", value: `${bytes} B` },
    { name: "endereço", value: hex(address), best: true },
  ];

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Array</span>
            <input className="viz-input" value={input} onChange={(e) => onInputChange(e.target.value)} />
          </label>
          <label className="viz-field">
            <span>Endereço base</span>
            <input
              className="viz-input k"
              value={baseText}
              onChange={(e) => setBaseText(e.target.value)}
              aria-label="Endereço base em hexadecimal"
            />
          </label>
          {/* Os presets ficam AQUI, e não na linha de controles, porque com um
              array de 1 elemento não há linha do tempo e o rodapé some inteiro —
              levar o "20 inteiros" junto deixaria o aluno sem volta. */}
          <button type="button" className="viz-btn" onClick={randomize}>
            Sortear
          </button>
          <button type="button" className="viz-btn" onClick={preset20}>
            20 inteiros
          </button>
          <button type="button" className="viz-btn" onClick={restore}>
            Voltar ao padrão
          </button>
        </div>

        <div className="viz-inputs" style={{ marginTop: -8 }}>
          <div className="viz-field">
            <span>Tamanho de cada elemento</span>
            <div className="arr-tabs">
              {ELEMENT_SIZES.map((t) => (
                <button
                  type="button"
                  key={t.key}
                  className={`arr-tab${t.key === sizeKey ? " on" : ""}`}
                  aria-pressed={t.key === sizeKey}
                  onClick={() => setSizeKey(t.key)}
                  title={t.example}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className={`viz-btn arr-toggle${cache ? " on" : ""}`}
            aria-pressed={cache}
            onClick={() => setCache((v) => !v)}
          >
            Linha de cache: {cache ? "visível" : "oculta"}
          </button>
        </div>

        <div className="viz-cells">
          {cells.map((c) => (
            <div className="viz-cell-wrap" key={c.k}>
              <span className="viz-cell-idx">{c.k}</span>
              <button
                type="button"
                className={c.cls}
                aria-pressed={c.k === idx}
                aria-label={`Índice ${c.k}, valor ${c.v}, endereço ${hex(c.addr)}`}
                onClick={() => goToIndex(c.k)}
              >
                {c.v}
              </button>
              <span className={`arr-addr${c.k === idx ? " on" : ""}`}>{hex(c.addr)}</span>
            </div>
          ))}
        </div>

        {cache ? (
          <div className="arr-cache-mapa" aria-label="Mapa das linhas de cache">
            {cacheLines.map((l) => (
              <div key={l.block} className={`arr-cache-linha${l.current ? " on" : ""}`}>
                <div className="arr-cache-rot">
                  Linha de cache {hex(l.block * CACHE_LINE)}
                  {l.current ? " · a que foi lida" : ""}
                </div>
                <div className="arr-cache-faixa">
                  {l.from === l.to ? `índice ${l.from}` : `índices ${l.from} a ${l.to}`} ·{" "}
                  {l.to - l.from + 1} de {n}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="arr-formula">
          <span className="arr-formula-rot">endereço</span>
          <span>
            nums[{idx}] = {hex(base)} + {idx} × {bytes} = <b>{hex(address)}</b>
          </span>
        </div>

        <p className="viz-note">{note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com a altura do
              código. O `.viz-code-slot` é o truque de grid 1fr→0fr, a única
              forma de animar altura automática em CSS puro. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">acesso.py</div>
              <div className="viz-code-body">
                <div className="viz-line">
                  <span className="ln">1</span>
                  {"def endereco(base, i, tamanho):"}
                </div>
                <div className="viz-line on">
                  <span className="ln">2</span>
                  {"    return base + i * tamanho   # uma multiplicação e uma soma"}
                </div>
                <div className="viz-line">
                  <span className="ln">3</span>
                  {""}
                </div>
                <div className="viz-line">
                  <span className="ln">4</span>
                  {"# vale para i = 0 e para i = 999_999: o custo não muda -> O(1)"}
                </div>
              </div>
            </div>
          </div>
          <div {...viz.varsProps}>
            <div className="viz-vars-head">Variáveis</div>
            {vars.map((v) => (
              <div className="viz-var" key={v.name}>
                <span className="viz-var-name">{v.name}</span>
                <span className={`viz-var-val${v.best ? " best" : ""}`}>{v.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>Saltos até nums[{idx}]</span>
            <strong>1</strong>
          </div>
          <div className="bigo-stat">
            <span>Numa lista encadeada</span>
            <strong>{thousands(idx + 1)}</strong>
          </div>
          <div className="bigo-stat">
            <span>Bytes do array</span>
            <strong>{thousands(totalBytes)}</strong>
          </div>
          <div className="bigo-stat">
            <span>Linhas de cache ({CACHE_LINE} B)</span>
            <strong>{thousands(cacheLines.length)}</strong>
          </div>
        </div>
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(frame);
}
