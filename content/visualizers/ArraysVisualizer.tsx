"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
// ---------------------------------------------------------------------------

type Tipo = { key: string; rotulo: string; bytes: number; exemplo: string };

const TIPOS: Tipo[] = [
  { key: "b1", rotulo: "1 byte", bytes: 1, exemplo: "byte, bool, char do C" },
  { key: "b2", rotulo: "2 bytes", bytes: 2, exemplo: "short, char do Java" },
  { key: "b4", rotulo: "4 bytes", bytes: 4, exemplo: "int, float" },
  { key: "b8", rotulo: "8 bytes", bytes: 8, exemplo: "long, double, ponteiro" },
];

const LINHA_CACHE = 64;
const BASE_PADRAO = 0x1000;
const MAX_ITENS = 20;
const DEFAULT_NUMS = [12, 7, 45, 3, 20, 8, 31, 16];

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

function milhar(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function hex(v: number): string {
  const t = Math.max(0, Math.round(v)).toString(16).toUpperCase();
  return "0x" + (t.length < 4 ? "0".repeat(4 - t.length) + t : t);
}

function lerBase(texto: string): number {
  const limpo = texto.trim().replace(/^0x/i, "");
  const v = parseInt(limpo, 16);
  if (!isFinite(v) || v < 0) return BASE_PADRAO;
  return Math.min(v, 0xffffff);
}

function lerNums(texto: string): number[] {
  const arr = texto
    .split(",")
    .map((x) => parseInt(x.trim(), 10))
    .filter((x) => !isNaN(x))
    .slice(0, MAX_ITENS);
  return arr.length ? arr : [0];
}

export function ArraysVisualizer() {
  const [entrada, setEntrada] = useState(DEFAULT_NUMS.join(", "));
  const [nums, setNums] = useState<number[]>(DEFAULT_NUMS);
  const [tipoKey, setTipoKey] = useState("b4");
  const [baseTexto, setBaseTexto] = useState("0x1000");
  const [i, setI] = useState(3);
  const [cache, setCache] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const tipo = useMemo(() => TIPOS.find((t) => t.key === tipoKey) ?? TIPOS[2], [tipoKey]);
  const base = useMemo(() => lerBase(baseTexto), [baseTexto]);
  const n = nums.length;
  const idx = Math.min(Math.max(i, 0), n - 1);

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
    timer.current = setInterval(() => setI((v) => (v >= n - 1 ? v : v + 1)), VELOCIDADES[velocidade]);
    return parar;
  }, [tocando, velocidade, n, parar]);

  useEffect(() => {
    if (tocando && idx >= n - 1) setTocando(false);
  }, [tocando, idx, n]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const aoMudarEntrada = (v: string) => {
    parar();
    setTocando(false);
    const arr = lerNums(v);
    setEntrada(v);
    setNums(arr);
    setI((p) => Math.min(p, arr.length - 1));
  };

  const sortear = () => {
    const qtd = 7 + Math.floor(Math.random() * 4);
    const arr = Array.from({ length: qtd }, () => 1 + Math.floor(Math.random() * 60));
    parar();
    setTocando(false);
    setNums(arr);
    setEntrada(arr.join(", "));
    setI(Math.floor(qtd / 2));
  };

  const preset20 = () => {
    const arr = Array.from({ length: 20 }, (_, k) => (k + 1) * 3);
    parar();
    setTocando(false);
    setNums(arr);
    setEntrada(arr.join(", "));
    setTipoKey("b4");
    setBaseTexto("0x1000");
    setCache(true);
    setI(16);
  };

  const reiniciar = () => {
    parar();
    setTocando(false);
    setNums(DEFAULT_NUMS);
    setEntrada(DEFAULT_NUMS.join(", "));
    setTipoKey("b4");
    setBaseTexto("0x1000");
    setCache(false);
    setI(3);
  };

  const tam = tipo.bytes;
  const endereco = base + idx * tam;
  const blocoAlvo = Math.floor(endereco / LINHA_CACHE);
  const totalBytes = n * tam;
  const naLinha = nums.filter((_, k) => Math.floor((base + k * tam) / LINHA_CACHE) === blocoAlvo).length;

  const cells = nums.map((v, k) => {
    const addr = base + k * tam;
    const mesmoBloco = Math.floor(addr / LINHA_CACHE) === blocoAlvo;
    let cls = "viz-cell arr-cell-btn";
    if (cache && mesmoBloco) cls += " arr-cache";
    if (k === idx) cls += " in";
    return { k, v, addr, cls, mesmoBloco };
  });

  // Mapa das linhas de cache: um bloco de 64 B por chip, com o intervalo de
  // índices que mora nele. É o que torna visível a frase "o array de 20
  // posições ocupa duas linhas": sozinho, o realce só pinta a linha lida.
  // Como o passo (1 a 8 bytes) é sempre menor que a linha, nenhum bloco entre
  // o primeiro e o último fica vazio, então a contagem bate com o cartão.
  const blocoIni = Math.floor(base / LINHA_CACHE);
  const blocoFim = Math.floor((base + (n - 1) * tam) / LINHA_CACHE);
  const linhasCache: { bloco: number; de: number; ate: number; atual: boolean }[] = [];
  for (let b = blocoIni; b <= blocoFim; b++) {
    const dentro = cells.filter((c) => Math.floor(c.addr / LINHA_CACHE) === b);
    if (!dentro.length) continue;
    linhasCache.push({
      bloco: b,
      de: dentro[0].k,
      ate: dentro[dentro.length - 1].k,
      atual: b === blocoAlvo,
    });
  }

  const nota = cache
    ? `O processador não busca 1 valor, busca a linha de cache inteira (${LINHA_CACHE} bytes). Ler nums[${idx}] em ${hex(endereco)} já traz ${naLinha} ${naLinha === 1 ? "posição" : "posições"} deste array para o L1: percorrer na ordem sai quase de graça.`
    : idx === 0
      ? `nums[0] mora no próprio endereço base: 0 × ${tam} = 0 byte de deslocamento, o valor ${nums[0]} está em ${hex(endereco)}.`
      : `Para chegar em nums[${idx}] eu não caminho por ninguém: multiplico ${idx} × ${tam} = ${idx * tam} bytes, somo no endereço base ${hex(base)} e leio ${nums[idx]} direto em ${hex(endereco)}. Duas contas, sempre as mesmas.`;

  const variaveis = [
    { nome: "base", valor: hex(base) },
    { nome: "i", valor: `${idx}` },
    { nome: "tamanho", valor: `${tam} B` },
    { nome: "endereço", valor: hex(endereco), best: true },
  ];

  const pct = Math.round(((idx + 1) / n) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · memória contígua e o endereço de nums[i]</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">
            índice {idx} de {n - 1}
          </span>
          <button className="viz-expand" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "✕ Fechar" : "⤢ Expandir"}
          </button>
        </div>
      </div>

      <div className="viz-body">
        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Array</span>
            <input className="viz-input" value={entrada} onChange={(e) => aoMudarEntrada(e.target.value)} />
          </label>
          <label className="viz-field">
            <span>Endereço base</span>
            <input
              className="viz-input k"
              value={baseTexto}
              onChange={(e) => setBaseTexto(e.target.value)}
              aria-label="Endereço base em hexadecimal"
            />
          </label>
          <button className="viz-btn" onClick={sortear}>
            Sortear
          </button>
        </div>

        <div className="viz-inputs" style={{ marginTop: -8 }}>
          <div className="viz-field">
            <span>Tamanho de cada elemento</span>
            <div className="arr-tabs">
              {TIPOS.map((t) => (
                <button
                  key={t.key}
                  className={`arr-tab${t.key === tipoKey ? " on" : ""}`}
                  aria-pressed={t.key === tipoKey}
                  onClick={() => setTipoKey(t.key)}
                  title={t.exemplo}
                >
                  {t.rotulo}
                </button>
              ))}
            </div>
          </div>
          <button
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
                onClick={() => {
                  parar();
                  setTocando(false);
                  setI(c.k);
                }}
              >
                {c.v}
              </button>
              <span className={`arr-addr${c.k === idx ? " on" : ""}`}>{hex(c.addr)}</span>
            </div>
          ))}
        </div>

        {cache ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 14,
              alignItems: "stretch",
            }}
            aria-label="Mapa das linhas de cache"
          >
            {linhasCache.map((l) => (
              <div
                key={l.bloco}
                style={{
                  flex: "1 1 160px",
                  minWidth: 0,
                  padding: "8px 10px",
                  borderRadius: 9,
                  border: `1px solid ${l.atual ? "var(--ccc-accent)" : "var(--ccc-line)"}`,
                  background: l.atual ? "var(--ccc-accent-soft)" : "var(--ccc-panel)",
                }}
              >
                <div style={{ fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ccc-muted)" }}>
                  Linha de cache {hex(l.bloco * LINHA_CACHE)}
                  {l.atual ? " · a que foi lida" : ""}
                </div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 13, marginTop: 2 }}>
                  {l.de === l.ate ? `índice ${l.de}` : `índices ${l.de} a ${l.ate}`} ·{" "}
                  {l.ate - l.de + 1} de {n}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="arr-formula">
          <span className="arr-formula-rot">endereço</span>
          <span>
            nums[{idx}] = {hex(base)} + {idx} × {tam} = <b>{hex(endereco)}</b>
          </span>
        </div>

        <p className="viz-note">{nota}</p>

        <div className="viz-split">
          <div className="viz-code">
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
          <div className="bigo-stat">
            <span>Saltos até nums[{idx}]</span>
            <strong>1</strong>
          </div>
          <div className="bigo-stat">
            <span>Numa lista encadeada</span>
            <strong>{milhar(idx + 1)}</strong>
          </div>
          <div className="bigo-stat">
            <span>Bytes do array</span>
            <strong>{milhar(totalBytes)}</strong>
          </div>
          <div className="bigo-stat">
            <span>Linhas de cache ({LINHA_CACHE} B)</span>
            <strong>{milhar(linhasCache.length)}</strong>
          </div>
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
              setI(Math.max(0, idx - 1));
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
              setI(idx >= n - 1 ? 0 : idx);
              setTocando(true);
            }}
          >
            {tocando ? "❚❚ Pausar" : "▶ Rodar"}
          </button>
          <button
            className="viz-btn"
            disabled={idx === n - 1}
            onClick={() => {
              parar();
              setTocando(false);
              setI(Math.min(idx + 1, n - 1));
            }}
          >
            Próximo ›
          </button>
          <button className="viz-btn" onClick={preset20}>
            20 inteiros
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
          <div className="viz-progress-fill" style={{ width: `${pct}%` }} />
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
