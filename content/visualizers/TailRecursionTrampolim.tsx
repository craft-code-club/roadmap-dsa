"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// TailRecursionTrampolim, a recursão de cauda rodando numa linguagem que não
// otimiza nada.
//
// O TailRecursionVisualizer mostra o que a linguagem faz por você quando tem
// TCO. Este mostra o que VOCÊ faz quando ela não tem: a função devolve um
// thunk em vez de se chamar, e um laço fica batendo nesse thunk. A pilha sobe a
// 2 frames e volta, salto após salto, com qualquer tamanho de lista.
//
// A régua "e se a lista tivesse n = ..." é o fecho: ela põe lado a lado os
// frames da recursão direta (n + 1, que passa do limite padrão de 1.000 do
// Python) e os do trampolim (2, sempre).
//
// A lista padrão [1, 2, 3, 4] e o rastro do acumulador (1, 3, 6, 10) são os
// mesmos do encontro, para o aluno reconhecer a conta de um visualizador para
// o outro.
// ---------------------------------------------------------------------------

type Estado = "espera" | "ativo" | "base" | "pronto";
type Frame = { chamada: string; pend: string; estado: Estado };
type Passo = {
  frames: Frame[];
  linha: number;
  acc: number;
  saltos: number;
  consumidos: number;
  thunk: string | null;
  nota: string;
  fim: boolean;
  ok: boolean;
};

// As linhas mapeiam 1:1 com o campo `linha` de cada passo, então a ordem e a
// quantidade de linhas não podem mudar sem ajustar o gerador junto.
const CODIGO = [
  "def soma_passo(nums, acc=0):",
  "    if not nums:",
  "        return acc",
  "    return lambda: soma_passo(nums[1:], acc + nums[0])",
  "",
  "def trampolim(f, *args):",
  "    r = f(*args)",
  "    while callable(r):",
  "        r = r()",
  "    return r",
];

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

// Formatação determinística de milhar (nada de Intl no caminho de render, senão
// o HTML do build diverge do cliente na hidratação).
function milhar(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function lista(v: number[]): string {
  return `[${v.join(", ")}]`;
}

function gerarPassos(nums: number[]): Passo[] {
  const out: Passo[] = [];
  const n = nums.length;
  const chao = (pend: string, estado: Estado = "ativo"): Frame => ({
    chamada: "trampolim(soma_passo, nums)",
    pend,
    estado,
  });

  out.push({
    frames: [
      chao("r = f(*args)"),
      { chamada: `soma_passo(${lista(nums)}, 0)`, pend: "primeira chamada", estado: "espera" },
    ],
    linha: 6,
    acc: 0,
    saltos: 0,
    consumidos: 0,
    thunk: null,
    nota:
      n === 0
        ? "Chamo soma_passo uma única vez, de dentro do trampolim. Com a lista vazia ela já cai no caso base."
        : "Chamo soma_passo uma única vez, de dentro do trampolim. Ela não vai recursionar: vai devolver um thunk, que é a próxima chamada embrulhada numa função sem argumentos.",
    fim: false,
    ok: false,
  });

  let acc = 0;
  let guarda = 0;
  for (let i = 0; i < n && guarda++ < 100; i++) {
    const novo = acc + nums[i];
    const resto = nums.slice(i + 1);
    out.push({
      frames: [chao(`r = thunk`)],
      linha: 3,
      acc: novo,
      saltos: i,
      consumidos: i + 1,
      thunk: `soma_passo(${lista(resto)}, ${novo})`,
      nota: `A conta acontece agora, na ida: acc ${acc} + ${nums[i]} = ${novo}. Em vez de se chamar, soma_passo embrulha a próxima chamada num thunk e retorna. O frame dela sai da pilha na hora: sobra só o trampolim.`,
      fim: false,
      ok: false,
    });
    out.push({
      frames: [
        chao("r = r()"),
        {
          chamada: `soma_passo(${lista(resto)}, ${novo})`,
          pend: "pendente: nada",
          estado: i + 1 === n ? "pronto" : "espera",
        },
      ],
      linha: 8,
      acc: novo,
      saltos: i + 1,
      consumidos: i + 1,
      thunk: null,
      nota: `O while vê que r ainda é uma função e chama r(). soma_passo volta para a pilha no mesmo lugar de onde a anterior saiu. Salto ${i + 1}: a pilha vai a 2 frames e desce de novo.`,
      fim: false,
      ok: false,
    });
    acc = novo;
  }

  out.push({
    frames: [
      chao("r = ..."),
      { chamada: `soma_passo([], ${acc})`, pend: `caso base: retorna ${acc}`, estado: "base" },
    ],
    linha: 2,
    acc,
    saltos: n,
    consumidos: n,
    thunk: null,
    nota:
      n === 0
        ? "A lista já chegou vazia: o primeiro retorno já é o acumulador 0, e o while nem chega a girar."
        : `Lista vazia: devolvo o acumulador ${acc}. Desta vez o retorno é um número, não uma função.`,
    fim: false,
    ok: false,
  });

  out.push({
    frames: [chao(`devolve ${acc}`, "pronto")],
    linha: 9,
    acc,
    saltos: n,
    consumidos: n,
    thunk: null,
    nota: `callable(${acc}) é falso, o while para e o trampolim devolve ${acc} depois de ${n} ${n === 1 ? "salto" : "saltos"}. A pilha nunca passou de 2 frames, e não passaria nem com 4 milhões de números.`,
    fim: true,
    ok: true,
  });

  return out;
}

const PADRAO = [1, 2, 3, 4];

type Preset = { key: string; rotulo: string; nums: number[] };
const PRESETS: Preset[] = [
  { key: "encontro", rotulo: "Do encontro: [1, 2, 3, 4]", nums: PADRAO },
  { key: "sete", rotulo: "Sete números", nums: [5, 3, 8, 1, 9, 2, 7] },
  { key: "um", rotulo: "Um elemento só", nums: [7] },
  { key: "vazia", rotulo: "Lista vazia", nums: [] },
];

// Tamanhos hipotéticos da régua, do "cabe na pilha" ao "nem sonhando".
const HIPOTESES = [10, 100, 500, 999, 5000, 100000];
const LIMITE_PYTHON = 1000;

function lerLista(texto: string): number[] {
  return texto
    .split(",")
    .map((x) => parseInt(x.trim(), 10))
    .filter((x) => !isNaN(x))
    .slice(0, 9);
}

export function TailRecursionTrampolim() {
  const [entrada, setEntrada] = useState(PADRAO.join(", "));
  const [nums, setNums] = useState<number[]>(PADRAO);
  const [preset, setPreset] = useState("encontro");
  const [iHip, setIHip] = useState(3); // 999, coladinho no limite
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const passos = useMemo(() => gerarPassos(nums), [nums]);
  const total = passos.length;
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

  const reiniciar = useCallback(() => {
    parar();
    setTocando(false);
    setPasso(0);
  }, [parar]);

  const aoMudarEntrada = (v: string) => {
    reiniciar();
    setPreset("");
    setEntrada(v);
    setNums(lerLista(v));
  };
  const aplicar = (pr: Preset) => {
    reiniciar();
    setPreset(pr.key);
    setEntrada(pr.nums.join(", "));
    setNums(pr.nums);
  };
  // Math.random só em handler de clique: no render quebraria a hidratação.
  const sortear = () => {
    const tam = 3 + Math.floor(Math.random() * 4);
    const arr = Array.from({ length: tam }, () => 1 + Math.floor(Math.random() * 12));
    reiniciar();
    setPreset("");
    setEntrada(arr.join(", "));
    setNums(arr);
  };

  const n = nums.length;
  const nHip = HIPOTESES[iHip];
  const estoura = nHip + 1 > LIMITE_PYTHON;

  const cells = nums.map((v, i) => {
    let cls = "viz-cell";
    if (i < p.consumidos) cls += " drop";
    if (i === p.consumidos) cls += " in";
    return { i, v, cls };
  });

  const variaveis = [
    { nome: "acc", valor: `${p.acc}`, best: true },
    { nome: "saltos", valor: `${p.saltos}` },
    { nome: "frames", valor: `${p.frames.length}` },
    { nome: "r", valor: p.thunk ? "thunk" : p.fim ? `${p.acc}` : "chamando", best: p.fim },
  ];

  const estatisticas = [
    { k: "pico", rot: "pilha máxima · trampolim", val: "2", cls: "tr-bom" },
    { k: "dir", rot: "pilha · recursão direta", val: `${n + 1}`, cls: "" },
    { k: "saltos", rot: "saltos até aqui", val: `${p.saltos}`, cls: "" },
    { k: "espaco", rot: "espaço extra", val: "O(1)", cls: "tr-bom" },
  ];

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · trampolim: recursão de cauda sem ajuda da linguagem</span>
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
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              key={pr.key}
              className={`bigo-chip${preset === pr.key ? " on" : ""}`}
              aria-pressed={preset === pr.key}
              onClick={() => aplicar(pr)}
            >
              {pr.rotulo}
            </button>
          ))}
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Lista de números</span>
            <input className="viz-input" value={entrada} onChange={(e) => aoMudarEntrada(e.target.value)} />
          </label>
          <button className="viz-btn" onClick={sortear}>
            Sortear
          </button>
        </div>

        {n > 0 ? (
          <div className="viz-cells">
            {cells.map((c) => (
              <div className="viz-cell-wrap" key={c.i}>
                <span className="viz-cell-idx">{c.i}</span>
                <div className={c.cls}>{c.v}</div>
                <span className={`viz-mark${c.i === p.consumidos ? " show" : ""}`}>
                  {c.i === p.consumidos ? "head" : "·"}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="tr-duplo">
          <div className="tr-painel cauda">
            <div className="tr-painel-tit">
              <span>A pilha durante os saltos</span>
              <em>{p.frames.length === 1 ? "1 frame" : `${p.frames.length} frames`}</em>
            </div>
            <div className="tr-pilha">
              {p.frames.map((f, i) => (
                <div className={`tr-frame ${f.estado}`} key={`${f.chamada}-${i}`}>
                  <div className="tr-frame-chamada">{f.chamada}</div>
                  <div className="tr-frame-pend">{f.pend}</div>
                </div>
              ))}
            </div>
            <div className="tr-chao">base da pilha</div>
          </div>

          <div className="tr-painel">
            <div className="tr-painel-tit">
              <span>O thunk na mão do laço</span>
              <em>salto {p.saltos}</em>
            </div>
            <div className="tr-pilha">
              <div className={`tr-frame ${p.thunk ? "ativo" : "livre"}`}>
                <div className="tr-frame-chamada">{p.thunk ?? (p.fim ? `r = ${p.acc}` : "r ainda não é um thunk")}</div>
                <div className="tr-frame-pend">
                  {p.thunk ? "uma função esperando ser chamada" : p.fim ? "não é função, o while parou" : "o laço está no meio de uma chamada"}
                </div>
              </div>
            </div>
            <div className="tr-chao">r, a variável do while</div>
          </div>
        </div>

        <p className={`viz-note${p.ok ? " ok" : ""}`}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">trampolim.py</div>
            <div className="viz-code-body">
              {CODIGO.map((txt, i) => (
                <div key={i} className={`viz-line${i === p.linha ? " on" : ""}`}>
                  <span className="ln">{i + 1}</span>
                  {txt || " "}
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
              <strong className={s.cls}>{s.val}</strong>
            </div>
          ))}
        </div>

        <div className="viz-controls">
          <div className="viz-field grow">
            <span>E se a lista tivesse n = {milhar(nHip)}?</span>
            <input
              type="range"
              min={0}
              max={HIPOTESES.length - 1}
              step={1}
              value={iHip}
              onChange={(e) => setIHip(parseInt(e.target.value, 10))}
              style={{ accentColor: "var(--ccc-accent)", width: "100%" }}
            />
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>recursão direta · frames</span>
            <strong className={estoura ? "tr-ruim" : ""}>{milhar(nHip + 1)}</strong>
          </div>
          <div className="bigo-stat">
            <span>recursão direta · em Python</span>
            <strong className={estoura ? "tr-ruim" : "tr-bom"}>{estoura ? "RecursionError" : "passa"}</strong>
          </div>
          <div className="bigo-stat">
            <span>trampolim · frames</span>
            <strong className="tr-bom">2</strong>
          </div>
          <div className="bigo-stat">
            <span>trampolim · saltos</span>
            <strong>{milhar(nHip)}</strong>
          </div>
        </div>

        <p className="viz-note">
          O limite padrão do Python é {milhar(LIMITE_PYTHON)} chamadas empilhadas. Com n = {milhar(nHip)}, a recursão de
          cauda escrita direto {estoura ? "estoura antes de terminar" : "ainda passa, mas está andando na beira"}; o
          trampolim faz {milhar(nHip)} {nHip === 1 ? "salto" : "saltos"} com os mesmos 2 frames.
        </p>

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
          <div className="viz-progress-fill" style={{ width: `${Math.round(((idx + 1) / total) * 100)}%` }} />
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
