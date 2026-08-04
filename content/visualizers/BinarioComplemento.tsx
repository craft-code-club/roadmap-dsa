"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// BinarioComplemento, os dois passos que viram o sinal.
//
// A única coisa que o aluno precisa enxergar é que "inverter e somar 1" não é
// uma receita arbitrária: ela é a única operação que faz x + (-x) dar zero
// dentro de uma quantidade fixa de bits. Por isso o visualizador não para na
// conversão: ele termina somando o número com o oposto dele, bit a bit, e
// mostrando o vai-um saindo pela esquerda e sendo descartado.
//
// A soma aparece dígito a dígito, da direita para a esquerda, porque o vai-um é
// exatamente o mesmo mecanismo da soma decimal que a pessoa aprendeu na escola,
// só que com dois símbolos em vez de dez. Mostrar o carry andando é o que liga
// as duas coisas.
//
// Os presets incluem os dois casos que quebram a intuição: o zero (que prova a
// ausência de ambiguidade, porque o vai-um estoura e some) e o 128, cujo oposto
// é ele mesmo. Preset que só mostra o caso bonito ensina a receita, não a
// regra.
// ---------------------------------------------------------------------------

const N = 8;

type Passo = {
  bits: number[];
  destaque: number;
  carry: number[]; // vai-um por posição, -1 quando não se aplica
  fase: "inicio" | "inverter" | "somar" | "pronto" | "prova";
  soma: number[] | null; // resultado da prova x + (-x)
  linha: number;
  nota: string;
  ok?: boolean;
};

const CODIGO = [
  "# complemento de dois, em 8 bits",
  "positivo = 0b00011010            # 26",
  "invertido = ~positivo & 0xFF     # 1. inverte todos",
  "negativo  = (invertido + 1) & 0xFF  # 2. soma 1",
  "",
  "# a prova: somar os dois tem que dar zero",
  "(positivo + negativo) & 0xFF     # o vai-um cai fora",
];

type Preset = { key: string; rotulo: string; valor: number; dica: string };

const PRESETS: Preset[] = [
  {
    key: "vinteseis",
    rotulo: "26",
    valor: 26,
    dica: "O caso comum. Acompanhe os dois passos e depois a prova: somar 26 com o resultado tem que dar zero em oito bits, senão a representação não serviria para o processador fazer subtração somando.",
  },
  {
    key: "um",
    rotulo: "1",
    valor: 1,
    dica: "O menor caso, e o mais revelador: o oposto de 1 é 11111111, ou seja, todos os bits ligados. Faz sentido, porque somar 1 a 11111111 dá zero com um vai-um que cai fora.",
  },
  {
    key: "cento",
    rotulo: "127, o maior positivo",
    valor: 127,
    dica: "O teto do lado positivo com 8 bits. Repare que o resultado, 10000001, tem o bit de sinal ligado e é lido como -127. Um a mais no positivo já não caberia: 128 não existe no tipo com sinal.",
  },
  {
    key: "zero",
    rotulo: "0, o teste da ambiguidade",
    valor: 0,
    dica: "Aqui está o motivo de o complemento de dois ter vencido. Inverter dá 11111111, somar 1 estoura e volta a 00000000: o oposto de zero é o próprio zero, e existe UMA representação só. Nas outras duas convenções existem duas, e a máquina precisa decidir o que fazer com a segunda.",
  },
  {
    key: "cento28",
    rotulo: "128, o que é o próprio oposto",
    valor: 128,
    dica: "O caso que quebra a simetria. O complemento de dois de 10000000 é 10000000: ele é o oposto de si mesmo. Por isso a faixa com sinal vai de -128 a 127, e não de -127 a 127: o -128 existe e o +128 não.",
  },
];

const VELOCIDADES = [0, 1400, 900, 600, 380, 220];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

const paraBits = (v: number) => Array.from({ length: N }, (_, k) => (v >> (N - 1 - k)) & 1);
const paraNum = (b: number[]) => b.reduce((acc, x, k) => acc + (x << (N - 1 - k)), 0);
const comSinal = (b: number[]) => (b[0] === 1 ? paraNum(b) - 256 : paraNum(b));

export function gerarPassos(valor: number): Passo[] {
  const out: Passo[] = [];
  const original = paraBits(valor);
  const semCarry = new Array(N).fill(-1);

  out.push({
    bits: [...original],
    destaque: -1,
    carry: semCarry,
    fase: "inicio",
    soma: null,
    linha: 1,
    nota: `Ponto de partida: ${valor} em oito bits é ${original.join("")}. O objetivo é achar a representação de -${valor} sem inventar um símbolo de menos, usando só os mesmos oito bits.`,
  });

  // ---- passo 1: inverter -----------------------------------------------
  const invertido: number[] = original.map((b) => (b === 1 ? 0 : 1));
  for (let k = 0; k < N; k++) {
    const parcial = original.map((b, i) => (i <= k ? (b === 1 ? 0 : 1) : b));
    out.push({
      bits: parcial,
      destaque: k,
      carry: semCarry,
      fase: "inverter",
      soma: null,
      linha: 2,
      nota: `Passo 1, inverter: o bit de expoente ${N - 1 - k} era ${original[k]} e vira ${1 - original[k]}. Isto sozinho é o complemento de UM, e ele já quase funciona: o problema dele é que sobra um zero a mais.`,
    });
  }

  // ---- passo 2: somar 1 -------------------------------------------------
  const resultado = [...invertido];
  const carry = new Array(N).fill(-1);
  let vai = 1;
  for (let k = N - 1; k >= 0; k--) {
    const soma = resultado[k] + vai;
    const bit = soma % 2;
    const novoVai = soma > 1 ? 1 : 0;
    carry[k] = novoVai;
    resultado[k] = bit;
    out.push({
      bits: [...resultado],
      destaque: k,
      carry: [...carry],
      fase: "somar",
      soma: null,
      linha: 3,
      nota:
        vai === 0
          ? `Não há mais vai-um, então os bits à esquerda ficam como estão. A soma acabou de fato aqui.`
          : `Passo 2, somar 1: nesta posição tenho ${invertido[k]} + ${vai}. ${
              soma > 1
                ? `Em binário 1 + 1 é 0 e vai um, exatamente como 5 + 5 é 0 e vai um no decimal. Escrevo ${bit} e levo o vai-um para a esquerda.`
                : `Dá ${bit}, sem vai-um, e a propagação para aqui.`
            }`,
    });
    vai = novoVai;
    if (vai === 0) {
      // os bits restantes não mudam; um passo só resume isso
      break;
    }
  }

  const valorFinal = comSinal(resultado);
  out.push({
    bits: [...resultado],
    destaque: -1,
    carry: semCarry,
    fase: "pronto",
    soma: null,
    linha: 3,
    ok: true,
    nota: `Pronto: ${resultado.join("")}. Lendo com o truque do peso negativo, o bit da esquerda vale -128 em vez de +128, então isto é ${resultado
      .map((b, k) => (b === 1 ? (k === 0 ? -128 : 1 << (N - 1 - k)) : 0))
      .filter((x) => x !== 0)
      .join(" + ")
      .replace(/\+ -/g, "- ")} = ${valorFinal}.`,
  });

  // ---- a prova: x + (-x) --------------------------------------------------
  const soma: number[] = new Array(N).fill(0);
  const carrySoma = new Array(N).fill(-1);
  let v2 = 0;
  for (let k = N - 1; k >= 0; k--) {
    const s = original[k] + resultado[k] + v2;
    soma[k] = s % 2;
    carrySoma[k] = s > 1 ? 1 : 0;
    v2 = s > 1 ? 1 : 0;
  }
  out.push({
    bits: [...resultado],
    destaque: -1,
    carry: carrySoma,
    fase: "prova",
    soma: [...soma],
    linha: 6,
    ok: true,
    nota: `A prova: ${original.join("")} + ${resultado.join("")} = ${soma.join("")}${
      v2 === 1
        ? `, com um vai-um sobrando na ponta esquerda. Esse nono bit não cabe em oito, então o tipo simplesmente o descarta, e o que fica é zero. Não é um acidente conveniente: é o motivo de a convenção ser esta, porque assim o processador subtrai somando, sem nenhum circuito a mais.`
        : `. Somar um número com o oposto dele dá zero, que é a definição de oposto.`
    }`,
  });

  return out;
}

export function BinarioComplemento() {
  const [presetKey, setPresetKey] = useState("vinteseis");
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
  const original = useMemo(() => paraBits(preset.valor), [preset]);

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
  const rotuloFase =
    p.fase === "inverter" ? "1 · inverter todos os bits" : p.fase === "somar" ? "2 · somar 1" : p.fase === "prova" ? "a prova: x + (-x)" : p.fase === "pronto" ? "resultado" : "início";

  const Fita = ({ bits, destaque, marca }: { bits: number[]; destaque: number; marca?: string }) => (
    <div className="bn-fita">
      {bits.map((b, k) => (
        <span key={k} className={`bn-bit estatico${b ? " on" : ""}${k === destaque ? " novo" : ""}${k === 0 ? " sinal" : ""}`}>
          <span className="bn-bit-val">{b}</span>
          <span className="bn-bit-exp">
            {k === 0 && marca === "sinal" ? (
              "sinal"
            ) : (
              <>
                2<sup>{N - 1 - k}</sup>
              </>
            )}
          </span>
          <span className="bn-bit-peso">{k === 0 && marca === "sinal" ? "-128" : 1 << (N - 1 - k)}</span>
        </span>
      ))}
    </div>
  );

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · complemento de dois: inverter e somar 1</span>
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

        <div className={`hs-fase ${p.fase === "prova" || p.fase === "pronto" ? "f-fim" : p.fase === "somar" ? "f-ordenar" : ""}`}>
          <span className="hs-fase-selo">{rotuloFase}</span>
          <span className="hs-fase-txt">
            {preset.valor} · em construção: {p.bits.join("")} ({comSinal(p.bits)} lido com sinal)
          </span>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            O positivo de partida <em>o bit da esquerda desligado quer dizer positivo</em>
          </div>
          <Fita bits={original} destaque={-1} />
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            Em construção <em>{p.fase === "somar" ? "somando 1, com o vai-um andando para a esquerda" : "invertendo bit a bit"}</em>
          </div>
          <Fita bits={p.bits} destaque={p.destaque} marca="sinal" />
          {p.carry.some((c) => c >= 0) ? (
            <div className="bn-carrys">
              {p.carry.map((c, k) => (
                <span key={k} className={`bn-carry${c === 1 ? " on" : ""}`}>
                  {c === 1 ? "1" : c === 0 ? "0" : ""}
                </span>
              ))}
              <span className="bn-carry-rot">vai-um</span>
            </div>
          ) : null}
        </div>

        {p.soma ? (
          <div className="hp-bloco">
            <div className="tt-painel-tit">
              A prova <em>somar o número com o oposto dele</em>
            </div>
            <Fita bits={p.soma} destaque={-1} />
          </div>
        ) : null}

        <p className={"viz-note" + (p.ok ? " ok" : "")}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">complemento.py</div>
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
              <span className="viz-var-name">positivo</span>
              <span className="viz-var-val best">{preset.valor}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">em construção (sem sinal)</span>
              <span className="viz-var-val">{paraNum(p.bits)}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">em construção (com sinal)</span>
              <span className="viz-var-val">{comSinal(p.bits)}</span>
            </div>
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
          Rode o preset do zero até o fim: inverter dá 11111111, somar 1 estoura para 00000000, e o oposto de
          zero é o próprio zero. É esse resultado, e só ele, que elimina a ambiguidade das outras duas
          convenções. Depois rode o 128 e repare que ele é o oposto de si mesmo: é por isso que a faixa com
          sinal vai de -128 a 127 e não é simétrica.
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
