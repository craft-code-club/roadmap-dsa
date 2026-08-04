"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// BinarioDivisoes, o caminho de volta: de decimal para binário.
//
// A única coisa que o aluno precisa enxergar é POR QUE os restos saem de trás
// para a frente. A regra costuma ser ensinada como um truque ("junte os restos
// de baixo para cima"), e ela é consequência de uma coisa só: a primeira
// divisão pergunta pelo bit menos significativo, porque dividir por 2 é
// deslocar tudo uma casa para a direita e o resto é o que cai fora.
//
// Por isso a fita de bits vai sendo preenchida da DIREITA para a esquerda, ao
// vivo, ao lado da divisão que a produziu. Uma tabela de divisões com uma seta
// dizendo "leia ao contrário" ensina o truque; a fita mostra a razão.
//
// O passo a passo tem linha do tempo porque aqui existe uma sequência de
// verdade, com estado que evolui, ao contrário do conversor ao lado, em que a
// variável é o número.
// ---------------------------------------------------------------------------

type Linha = { n: number; quociente: number; resto: number };

type Passo = {
  linhas: Linha[];
  bits: (number | null)[];
  destaque: number; // índice da linha em foco
  posicao: number; // posição do bit que acabou de ser escrito
  linha: number;
  nota: string;
  ok?: boolean;
};

const CODIGO = [
  "def para_binario(n):",
  "    if n == 0: return '0'",
  "    bits = ''",
  "    while n > 0:",
  "        bits = str(n % 2) + bits   # o resto entra na FRENTE",
  "        n = n // 2                 # e o número encolhe pela metade",
  "    return bits",
];

type Preset = { key: string; rotulo: string; valor: number; dica: string };

const PRESETS: Preset[] = [
  {
    key: "duzentos",
    rotulo: "201",
    valor: 201,
    dica: "Oito divisões para oito bits. Acompanhe a fita da direita: o primeiro resto ocupa a última posição, e não a primeira. É esse detalhe que faz a regra de ler os restos de baixo para cima.",
  },
  {
    key: "cinquenta",
    rotulo: "53",
    valor: 53,
    dica: "O mesmo número do visualizador anterior, agora pelo caminho inverso. Se as duas contas fecharem no mesmo 00110101, é porque as duas são a mesma ideia lida em direções opostas.",
  },
  {
    key: "potencia",
    rotulo: "64, uma potência de dois",
    valor: 64,
    dica: "Potência de dois é o caso mais limpo: todas as divisões dão resto zero até a última. Um número com um bit ligado só é um número que se divide por 2 sem sobra até virar 1.",
  },
  {
    key: "impar",
    rotulo: "255, todos ímpares",
    valor: 255,
    dica: "O oposto: toda divisão sobra 1, então todos os bits saem ligados. Repare que o resto de dividir por 2 é exatamente a pergunta se o número é ímpar, e ímpar em binário é bit da direita ligado.",
  },
];

const VELOCIDADES = [0, 1200, 800, 520, 320, 180];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

export function gerarPassos(valor: number): Passo[] {
  const largura = Math.max(8, valor.toString(2).length);
  const out: Passo[] = [];
  const linhas: Linha[] = [];
  const bits: (number | null)[] = new Array(largura).fill(null);
  let n = valor;
  let pos = largura - 1;

  out.push({
    linhas: [],
    bits: [...bits],
    destaque: -1,
    posicao: -1,
    linha: 0,
    nota: `Vou converter ${valor} para binário dividindo por 2 sem parar. Cada divisão responde a uma pergunta só: "sobra alguma coisa?". O resto é o bit, e o quociente é o que ainda falta converter.`,
  });

  if (valor === 0) {
    out.push({
      linhas: [],
      bits: bits.map(() => 0),
      destaque: -1,
      posicao: -1,
      linha: 1,
      ok: true,
      nota: "O zero é o único caso que o laço não trata, porque ele nem chega a rodar. Por isso o código devolve '0' antes de começar.",
    });
    return out;
  }

  while (n > 0) {
    const q = Math.floor(n / 2);
    const r = n % 2;
    linhas.push({ n, quociente: q, resto: r });
    bits[pos] = r;
    out.push({
      linhas: [...linhas],
      bits: [...bits],
      destaque: linhas.length - 1,
      posicao: pos,
      linha: 4,
      nota: `${n} dividido por 2 dá ${q} com resto ${r}. ${
        r === 1
          ? `Sobrou 1, ou seja, ${n} é ímpar, e todo número ímpar tem o bit da direita ligado.`
          : `Não sobrou nada, ou seja, ${n} é par, e todo número par tem o bit da direita desligado.`
      } Esse resto vai para a posição ${largura - 1 - pos === 0 ? "mais à direita" : `de expoente ${largura - 1 - pos}`} da fita, e não para a próxima posição livre da esquerda: cada divisão pergunta por um bit mais significativo que a anterior.`,
    });
    n = q;
    pos--;
  }

  const bin = bits.map((b) => b ?? 0);
  out.push({
    linhas: [...linhas],
    bits: bin,
    destaque: -1,
    posicao: -1,
    linha: 6,
    ok: true,
    nota: `Cheguei a zero, então acabou: ${valor} em binário é ${bin.join("")}. Foram ${linhas.length} divisões para ${linhas.length} bits significativos, e os zeros à esquerda entram só para completar o byte. Conferindo pelo outro caminho: ${bits
      .map((b, k) => (b ? 1 << (largura - 1 - k) : 0))
      .filter((x) => x > 0)
      .join(" + ")} = ${valor}.`,
  });
  return out;
}

export function BinarioDivisoes() {
  const [presetKey, setPresetKey] = useState("duzentos");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(4);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const passos = useMemo(() => gerarPassos(preset.valor), [preset]);
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

  const reiniciar = () => {
    parar();
    setTocando(false);
    setPasso(0);
  };
  const trocarPreset = (k: string) => {
    reiniciar();
    setPresetKey(k);
  };

  const pctPasso = Math.round(((idx + 1) / total) * 100);
  const largura = p.bits.length;

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · de decimal para binário, dividindo por 2</span>
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
              className={`bigo-chip${presetKey === pr.key ? " on" : ""}`}
              onClick={() => trocarPreset(pr.key)}
              aria-pressed={presetKey === pr.key}
            >
              {pr.rotulo}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">{preset.dica}</p>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            A fita de bits <em>preenchida da direita para a esquerda, um por divisão</em>
          </div>
          <div className="bn-fita">
            {p.bits.map((b, k) => (
              <span key={k} className={`bn-bit estatico${b === 1 ? " on" : ""}${b === null ? " vazio" : ""}${k === p.posicao ? " novo" : ""}`}>
                <span className="bn-bit-val">{b === null ? "?" : b}</span>
                <span className="bn-bit-exp">
                  2<sup>{largura - 1 - k}</sup>
                </span>
                <span className="bn-bit-peso">{1 << (largura - 1 - k)}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            As divisões <em>o quociente vira a próxima linha, o resto vira um bit</em>
          </div>
          <ol className="bb-passos">
            {p.linhas.length === 0 ? (
              <li>
                <span>nenhuma divisão ainda</span>
              </li>
            ) : (
              p.linhas.map((l, k) => (
                <li key={k} className={k === p.destaque ? "ruim" : ""}>
                  <span>
                    {l.n} ÷ 2 = {l.quociente}
                  </span>
                  <b>resto {l.resto}</b>
                </li>
              ))
            )}
          </ol>
        </div>

        <p className={"viz-note" + (p.ok ? " ok" : "")}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">para_binario.py</div>
            <div className="viz-code-body">
              {CODIGO.map((txt, k) => (
                <div key={k} className={`viz-line${k === p.linha ? " on" : ""}`}>
                  <span className="ln">{k + 1}</span>
                  {txt}
                </div>
              ))}
            </div>
          </div>
          <div className="viz-vars">
            <div className="viz-vars-head">Variáveis</div>
            <div className="viz-var">
              <span className="viz-var-name">n (o que falta converter)</span>
              <span className="viz-var-val best">{p.linhas.length > 0 ? p.linhas[p.linhas.length - 1].quociente : preset.valor}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">último resto</span>
              <span className="viz-var-val">{p.linhas.length > 0 ? p.linhas[p.linhas.length - 1].resto : "-"}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">bits já escritos</span>
              <span className="viz-var-val">{p.bits.filter((b) => b !== null).length}</span>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>número de partida</span>
            <strong>{preset.valor}</strong>
          </div>
          <div className="bigo-stat">
            <span>divisões feitas</span>
            <strong>{p.linhas.length}</strong>
          </div>
          <div className="bigo-stat">
            <span>bits significativos</span>
            <strong>{preset.valor.toString(2).length}</strong>
          </div>
          <div className="bigo-stat">
            <span>bits já ligados na fita</span>
            <strong>{p.bits.filter((b) => b === 1).length}</strong>
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
              setPasso((s) => Math.max(0, s - 1));
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
              setPasso((s) => Math.min(s + 1, total - 1));
            }}
          >
            Próximo ›
          </button>
          <div className="viz-speed">
            <span>Velocidade</span>
            <input type="range" min={1} max={5} step={1} value={velocidade} onChange={(e) => setVelocidade(parseInt(e.target.value, 10))} />
            <span className="val">{ROTULOS_VEL[velocidade]}</span>
          </div>
        </div>
        <div className="viz-progress">
          <div className="viz-progress-fill" style={{ width: `${pctPasso}%` }} />
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          O número de divisões é o número de bits significativos, e ele cresce como log₂ do valor: 201 precisa
          de 8 divisões, e 201 mil precisaria de 18. É a mesma razão pela qual a busca binária é barata,
          escrita de outro jeito: dividir por dois repetidamente chega ao fim depressa.
        </p>
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
