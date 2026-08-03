"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// TailRecursionVisualizer, a MESMA soma nas duas formas, lado a lado.
//
// É o visualizador central do tópico: à esquerda a recursão comum (body
// recursive), com a pilha crescendo e uma conta pendente presa em cada frame;
// à direita a recursão de cauda, que com tail call optimization reescreve o
// mesmo frame e nunca passa de 1.
//
// O botão "sem TCO (Python)" é o que fecha a ideia: a recursão de cauda sozinha
// NÃO economiza memória, ela só organiza a conta. A economia vem da otimização
// da linguagem. Com o botão desligado os dois lados empilham igual, e o único
// ganho visível é que a volta não tem conta nenhuma para fazer.
//
// A lista padrão [1, 2, 3, 4] e o rastro do acumulador (0, 1, 3, 6, 10) são
// exatamente os do encontro, incluindo o desenho de pilha que o Giovani fez no
// quadro.
//
// Os dois lados são gerados por funções puras separadas e depois alinhados pelo
// mesmo contador de passos: quem termina primeiro fica parado (com o resultado
// na tela) enquanto o outro continua. É essa imagem, a pilha da esquerda ainda
// desempilhando enquanto a direita já respondeu, que ensina o tópico.
// ---------------------------------------------------------------------------

type Estado = "espera" | "ativo" | "base" | "pronto";
type Frame = { chamada: string; pend: string; estado: Estado };
// `somas` é o contador de operações: ele existe para mostrar que o número de
// somas é o MESMO nos dois lados (uma por elemento). O que muda de forma é
// quando elas acontecem, e é o espaço, não o tempo, que a de cauda economiza.
type Lado = { frames: Frame[]; linha: number; nota: string; somas: number; fim: boolean; ok: boolean };

// As linhas mapeiam 1:1 com os campos `linha` dos dois geradores, então a ordem
// e a quantidade de linhas não podem mudar sem ajustar os geradores junto.
const CODIGO = [
  "def soma(nums):                       # comum",
  "    if not nums:",
  "        return 0",
  "    return nums[0] + soma(nums[1:])",
  "",
  "def soma_cauda(nums, acc=0):          # de cauda",
  "    if not nums:",
  "        return acc",
  "    return soma_cauda(nums[1:], acc + nums[0])",
];

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

function lista(v: number[]): string {
  return `[${v.join(", ")}]`;
}

function prefixo(v: number[], ate: number): number {
  let s = 0;
  for (let i = 0; i < ate; i++) s += v[i];
  return s;
}

function sufixo(v: number[], de: number): number {
  let s = 0;
  for (let i = de; i < v.length; i++) s += v[i];
  return s;
}

// Formatação determinística de milhar (nada de Intl no caminho de render, senão
// o HTML do build diverge do cliente na hidratação).
function milhar(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function frames(v: number): string {
  return `${v} ${v === 1 ? "frame" : "frames"}`;
}

// --- recursão comum: empilha n + 1 frames e só depois faz as n somas ---------
function gerarComum(nums: number[]): Lado[] {
  const out: Lado[] = [];
  const n = nums.length;

  for (let i = 0; i < n; i++) {
    const pilha: Frame[] = [];
    for (let j = 0; j <= i; j++) {
      pilha.push({
        chamada: `soma(${lista(nums.slice(j))})`,
        pend: `pendente: ${nums[j]} + ?`,
        estado: j === i ? "ativo" : "espera",
      });
    }
    out.push({
      frames: pilha,
      linha: 3,
      somas: 0,
      fim: false,
      ok: false,
      nota: `A lista não está vazia, então guardo "${nums[i]} +" pendente aqui e desço para soma(${lista(nums.slice(i + 1))}). ${frames(i + 1)} na pilha, ${i + 1 === 1 ? "parado" : "parados"}, esperando uma resposta que ainda não existe.`,
    });
  }

  const base: Frame[] = [];
  for (let j = 0; j < n; j++) {
    base.push({
      chamada: `soma(${lista(nums.slice(j))})`,
      pend: `pendente: ${nums[j]} + ?`,
      estado: "espera",
    });
  }
  base.push({ chamada: "soma([])", pend: "caso base: retorna 0", estado: "base" });
  out.push({
    frames: base,
    linha: 2,
    somas: 0,
    fim: n === 0,
    ok: n === 0,
    nota:
      n === 0
        ? "A lista já chegou vazia: caí direto no caso base, retorno 0 e nem cheguei a empilhar nada."
        : `Cheguei na lista vazia com ${frames(n + 1)} empilhados. Retorno 0, e só agora a volta começa: nenhuma das ${n} somas foi feita ainda.`,
  });

  for (let k = n - 1; k >= 0; k--) {
    const anterior = sufixo(nums, k + 1);
    const valor = anterior + nums[k];
    const pilha: Frame[] = [];
    for (let j = 0; j <= k; j++) {
      pilha.push({
        chamada: `soma(${lista(nums.slice(j))})`,
        pend: j === k ? `${nums[k]} + ${anterior} = ${valor}` : `pendente: ${nums[j]} + ?`,
        estado: j === k ? "pronto" : "espera",
      });
    }
    out.push({
      frames: pilha,
      linha: 3,
      somas: n - k,
      fim: k === 0,
      ok: k === 0,
      nota: `Desempilho e agora sim faço a conta que estava presa aqui: ${nums[k]} + ${anterior} = ${valor}. ${
        k === 0
          ? `Pilha vazia, resposta final: ${valor}.`
          : `Devolvo ${valor} para o frame de baixo. Ainda ${frames(k)} para desempilhar.`
      }`,
    });
  }
  return out;
}

// --- recursão de cauda: com TCO o frame é reescrito, sem TCO empilha igual ---
function gerarCauda(nums: number[], tco: boolean): Lado[] {
  const out: Lado[] = [];
  const n = nums.length;
  const total = prefixo(nums, n);

  const frameEm = (i: number, estado: Estado): Frame => ({
    chamada: `soma_cauda(${lista(nums.slice(i))}, ${prefixo(nums, i)})`,
    pend: "pendente: nada",
    estado,
  });

  for (let i = 0; i < n; i++) {
    const acc = prefixo(nums, i);
    const novo = acc + nums[i];
    const pilha: Frame[] = tco
      ? [frameEm(i, "ativo")]
      : Array.from({ length: i + 1 }, (_, j) => frameEm(j, j === i ? "ativo" : "espera"));
    out.push({
      frames: pilha,
      linha: 8,
      somas: i + 1,
      fim: false,
      ok: false,
      nota: tco
        ? `acc vale ${acc}. Faço a conta agora, ${acc} + ${nums[i]} = ${novo}, e passo o resultado adiante. Como não sobrou nada para fazer aqui, o compilador reescreve ESTE frame com os parâmetros novos: a pilha continua com 1.`
        : `acc vale ${acc}. Faço a conta agora, ${acc} + ${nums[i]} = ${novo}, e passo adiante. Só que sem TCO a chamada empilha do mesmo jeito: já são ${frames(i + 1)}.`,
    });
  }

  const base: Frame[] = tco
    ? [{ chamada: `soma_cauda([], ${total})`, pend: `caso base: retorna acc = ${total}`, estado: "base" }]
    : [
        ...Array.from({ length: n }, (_, j) => frameEm(j, "espera")),
        { chamada: `soma_cauda([], ${total})`, pend: `caso base: retorna acc = ${total}`, estado: "base" },
      ];
  out.push({
    frames: base,
    linha: 7,
    somas: n,
    fim: tco || n === 0,
    ok: tco || n === 0,
    nota: tco
      ? `Lista vazia: devolvo o acumulador, ${total}. Não existe volta para fazer, a resposta já estava pronta na mão, e a pilha nunca passou de 1 frame.`
      : n === 0
        ? "A lista já chegou vazia: devolvo o acumulador 0 na primeira chamada."
        : `Lista vazia: o acumulador já vale ${total}, a resposta está pronta. Mas ainda ${frames(n)} embaixo para desempilhar, um por um.`,
  });

  if (!tco) {
    for (let k = n - 1; k >= 0; k--) {
      const pilha = Array.from({ length: k + 1 }, (_, j) => frameEm(j, j === k ? "pronto" : "espera"));
      pilha[k] = { ...pilha[k], pend: `só repassa ${total}`, estado: "pronto" };
      out.push({
        frames: pilha,
        linha: 8,
        somas: n,
        fim: k === 0,
        ok: k === 0,
        nota: `Desempilho sem fazer conta nenhuma: só repasso o ${total} para baixo. ${
          k === 0 ? "Fim." : `Restam ${frames(k)}.`
        } A recursão de cauda arrumou a conta, mas sem otimização da linguagem a memória continua O(n).`,
      });
    }
  }
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

function lerLista(texto: string): number[] {
  return texto
    .split(",")
    .map((x) => parseInt(x.trim(), 10))
    .filter((x) => !isNaN(x))
    .slice(0, 9);
}

function Pilha({ frames: fs, rotulo }: { frames: Frame[]; rotulo: string }) {
  return (
    <>
      <div className="tr-pilha">
        {fs.length === 0 ? (
          <div className="tr-frame livre">
            <div className="tr-frame-chamada">pilha vazia</div>
          </div>
        ) : (
          fs.map((f, i) => (
            <div className={`tr-frame ${f.estado}`} key={`${f.chamada}-${i}`}>
              <div className="tr-frame-chamada">{f.chamada}</div>
              <div className="tr-frame-pend">{f.pend}</div>
            </div>
          ))
        )}
      </div>
      <div className="tr-chao">{rotulo}</div>
    </>
  );
}

export function TailRecursionVisualizer() {
  const [entrada, setEntrada] = useState(PADRAO.join(", "));
  const [nums, setNums] = useState<number[]>(PADRAO);
  const [preset, setPreset] = useState("encontro");
  const [tco, setTco] = useState(true);
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const passosA = useMemo(() => gerarComum(nums), [nums]);
  const passosB = useMemo(() => gerarCauda(nums, tco), [nums, tco]);

  const total = Math.max(passosA.length, passosB.length);
  const idx = Math.min(passo, total - 1);
  const iA = Math.min(idx, passosA.length - 1);
  const iB = Math.min(idx, passosB.length - 1);
  const a = passosA[iA];
  const b = passosB[iB];

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
    const n = 3 + Math.floor(Math.random() * 4);
    const arr = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 12));
    reiniciar();
    setPreset("");
    setEntrada(arr.join(", "));
    setNums(arr);
  };

  const n = nums.length;
  const totalSoma = prefixo(nums, n);
  const picoA = n + 1;
  const picoB = tco ? 1 : n + 1;

  // Rastro do acumulador: 0, 1, 3, 6, 10 na lista do encontro. O passo atual do
  // lado direito manda, e na volta (sem TCO) ele fica travado no último.
  const trilha = Array.from({ length: n + 1 }, (_, i) => prefixo(nums, i));
  const trilhaIdx = Math.min(iB, n);

  const variaveis = [
    { nome: "acc (cauda)", valor: `${trilha[trilhaIdx]}`, best: true },
    { nome: "frames · comum", valor: `${a.frames.length}` },
    { nome: "frames · cauda", valor: `${b.frames.length}` },
    { nome: "somas · comum", valor: `${a.somas} de ${n}` },
    { nome: "somas · cauda", valor: `${b.somas} de ${n}` },
    { nome: "soma(nums)", valor: a.ok ? `${totalSoma}` : "...", best: a.ok },
  ];

  const estatisticas = [
    { k: "pa", rot: "pico de frames · comum", val: `${picoA}` },
    { k: "pb", rot: "pico de frames · de cauda", val: `${picoB}` },
    { k: "ea", rot: "espaço extra · comum", val: "O(n)" },
    { k: "eb", rot: "espaço extra · de cauda", val: tco ? "O(1)" : "O(n)" },
  ];

  const resumo = tco
    ? `A recursão comum chegou a ${frames(picoA)}; a de cauda ficou em 1 do começo ao fim. Com uma lista de 1.000 números seriam ${milhar(1001)} frames de um lado e 1 do outro, e o Python nem chegaria lá: ele para com RecursionError, porque o limite padrão é 1.000 chamadas.`
    : `Sem otimização da linguagem os dois lados empilham ${frames(picoA)}. A recursão de cauda continua valendo a pena para pensar, e é ela que vira laço na hora de reescrever, mas em Python, Java ou C# ela sozinha não economiza um byte de pilha.`;

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · a mesma soma nas duas formas: a pilha que cresce e a que não cresce</span>
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

        <div className="bigo-chips">
          <button
            className={`bigo-chip${tco ? " on" : ""}`}
            aria-pressed={tco}
            onClick={() => {
              reiniciar();
              setTco(true);
            }}
          >
            <span className="sw" style={{ background: tco ? "#34d399" : "#3a4a60" }} />
            Elixir, Scala, Kotlin (com TCO)
          </button>
          <button
            className={`bigo-chip${!tco ? " on" : ""}`}
            aria-pressed={!tco}
            onClick={() => {
              reiniciar();
              setTco(false);
            }}
          >
            <span className="sw" style={{ background: !tco ? "#f87171" : "#3a4a60" }} />
            Python, Java, C# (sem TCO)
          </button>
        </div>

        <div className="tr-duplo">
          <div className="tr-painel">
            <div className="tr-painel-tit">
              <span>1. Recursão comum</span>
              <em>{frames(a.frames.length)}</em>
            </div>
            <Pilha frames={a.frames} rotulo="base da pilha" />
            <p className={`viz-note${a.ok ? " ok" : ""}`}>{a.nota}</p>
          </div>

          <div className="tr-painel cauda">
            <div className="tr-painel-tit">
              <span>2. Recursão de cauda</span>
              <em>{frames(b.frames.length)}</em>
            </div>
            <Pilha frames={b.frames} rotulo="base da pilha" />
            <div className="tr-trilha" aria-label="rastro do acumulador">
              {trilha.map((v, i) => (
                <span key={i}>
                  {i > 0 ? <span className="tr-seta">→</span> : null}
                  <span className={`tr-acc${i === trilhaIdx ? " on" : ""}`}>acc {v}</span>
                </span>
              ))}
            </div>
            <p className={`viz-note${b.ok ? " ok" : ""}`}>{b.nota}</p>
          </div>
        </div>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">soma.py</div>
            <div className="viz-code-body">
              {CODIGO.map((txt, i) => {
                let cls = "viz-line";
                if (i === a.linha) cls += " on";
                if (i === b.linha) cls += " tr-on-b";
                return (
                  <div key={i} className={cls}>
                    <span className="ln">{i + 1}</span>
                    {txt}
                  </div>
                );
              })}
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

        <p className="viz-note">{resumo}</p>

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
