"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// QueueVisualizer, a fila sobre array nas duas versões: a ingênua e o buffer
// circular. É o "aha" do tópico.
//
// Mesmo padrão do TwoPointersVisualizer: um gerador PURO de passos + a mesma
// casca (células, código sincronizado, variáveis, controles, Expandir). O que
// muda é que aqui existem DOIS códigos, um por implementação, e o campo `linha`
// aponta para o código do modo atual (as duas listas têm 19 linhas e só diferem
// no laço do desenfileirar, que é justamente o assunto).
//
// A única coisa que o aluno precisa ver acontecendo: na fila ingênua QUEM ANDA
// SÃO OS ELEMENTOS (o shift left, O(n)); no buffer circular quem anda são os
// PONTEIROS, e eles dão a volta pelo resto da divisão (O(1)). Por isso o mesmo
// roteiro de operações roda nos dois modos e o contador de "movimentações de
// elementos" fica sempre à vista: 7 na ingênua, 0 na circular.
//
// O anel em SVG é o mesmo array desenhado dobrado: os índices são os mesmos da
// fita de cima. Ele existe para o momento em que o fim passa da última posição
// e reaparece no zero, que no desenho linear parece um pulo e no anel é só o
// próximo passo. A legenda usa .tp-legenda, que já é genérica no globals.css.
// ---------------------------------------------------------------------------

type Op = { tipo: "enq"; valor: string } | { tipo: "deq" };
type Modo = "ingenua" | "circular";

type Passo = {
  slots: (string | null)[];
  inicio: number;
  fim: number;
  tamanho: number;
  linha: number;
  op: number; // índice da operação no roteiro, -1 no passo de preparação
  foco: number | null; // posição que acabou de ser escrita
  saiu: number | null; // posição que acabou de ser lida
  movidos: number[]; // posições que receberam valor no shift left
  movs: number; // movimentações de elementos acumuladas
  ultimo: string | null; // último valor devolvido pelo desenfileirar
  alerta?: boolean;
  nota: string;
};

// As duas listas mapeiam 1:1 com o campo `linha` de cada passo, então a ordem e
// a quantidade de linhas não podem mudar sem ajustar o gerador junto.
const CODIGO: Record<Modo, string[]> = {
  ingenua: [
    "class FilaIngenua:",
    "    def __init__(self, cap):",
    "        self.dados = [None] * cap",
    "        self.tamanho = 0",
    "",
    "    def enfileirar(self, valor):",
    "        if self.tamanho == len(self.dados):",
    '            raise IndexError("fila cheia")',
    "        self.dados[self.tamanho] = valor",
    "        self.tamanho += 1",
    "",
    "    def desenfileirar(self):",
    "        if self.tamanho == 0:",
    '            raise IndexError("fila vazia")',
    "        valor = self.dados[0]",
    "        for i in range(1, self.tamanho):",
    "            self.dados[i - 1] = self.dados[i]",
    "        self.tamanho -= 1",
    "        return valor",
  ],
  circular: [
    "class FilaCircular:",
    "    def __init__(self, cap):",
    "        self.dados = [None] * cap",
    "        self.inicio = self.fim = self.tamanho = 0",
    "",
    "    def enfileirar(self, valor):",
    "        if self.tamanho == len(self.dados):",
    '            raise IndexError("fila cheia")',
    "        self.dados[self.fim] = valor",
    "        self.fim = (self.fim + 1) % len(self.dados)",
    "        self.tamanho += 1",
    "",
    "    def desenfileirar(self):",
    "        if self.tamanho == 0:",
    '            raise IndexError("fila vazia")',
    "        valor = self.dados[self.inicio]",
    "        self.inicio = (self.inicio + 1) % len(self.dados)",
    "        self.tamanho -= 1",
    "        return valor",
  ],
};

// Linhas de interesse, por modo (as duas implementações desencontram a partir
// do desenfileirar, que é onde uma tem o laço e a outra não).
const L: Record<Modo, Record<string, number>> = {
  ingenua: { init: 3, guardCheia: 6, cheia: 7, escrita: 8, mais: 9, guardVazia: 12, vazia: 13, leitura: 14, shift: 16, menos: 17 },
  circular: { init: 3, guardCheia: 6, cheia: 7, escrita: 8, mais: 10, guardVazia: 13, vazia: 14, leitura: 15, andaInicio: 16, menos: 17 },
};

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Roteiro compacto: cada letra é um enfileirar, cada "-" é um desenfileirar.
function roteiroDe(s: string): Op[] {
  return Array.from(s).map((c) => (c === "-" ? { tipo: "deq" } : { tipo: "enq", valor: c }));
}

function proximaLetra(roteiro: Op[]): string {
  let n = 0;
  for (const o of roteiro) if (o.tipo === "enq") n++;
  return LETRAS[n % LETRAS.length];
}

function gerarPassos(roteiro: Op[], cap: number, modo: Modo): Passo[] {
  const out: Passo[] = [];
  const slots: (string | null)[] = new Array(cap).fill(null);
  const ln = L[modo];
  let inicio = 0;
  let fim = 0;
  let tamanho = 0;
  let movs = 0;
  let ultimo: string | null = null;

  const reg = (p: { linha: number; op: number; nota: string; foco?: number; saiu?: number; movidos?: number[]; alerta?: boolean }) => {
    out.push({
      slots: [...slots],
      inicio,
      fim,
      tamanho,
      movs,
      ultimo,
      foco: p.foco ?? null,
      saiu: p.saiu ?? null,
      movidos: p.movidos ?? [],
      linha: p.linha,
      op: p.op,
      nota: p.nota,
      alerta: p.alerta,
    });
  };

  reg({
    linha: ln.init,
    op: -1,
    nota: `Array de ${cap} posições, nenhuma ocupada: início, fim e tamanho começam todos em 0.`,
  });

  let guarda = 0;
  for (let k = 0; k < roteiro.length && guarda++ < 60; k++) {
    const op = roteiro[k];

    if (op.tipo === "enq") {
      if (tamanho === cap) {
        reg({
          linha: ln.cheia,
          op: k,
          alerta: true,
          nota: `Chegou ${op.valor}, mas tamanho (${tamanho}) já bateu na capacidade (${cap}): a fila está cheia. Aqui o guard rail recusa; as outras saídas seriam descartar o mais antigo ou dobrar o array.`,
        });
        continue;
      }
      reg({
        linha: ln.guardCheia,
        op: k,
        nota: `Chegou ${op.valor}. tamanho (${tamanho}) ainda é menor que a capacidade (${cap}), então cabe mais um.`,
      });

      const pos = modo === "circular" ? fim : tamanho;
      const reaproveita = slots[pos] !== null;
      slots[pos] = op.valor;
      reg({
        linha: ln.escrita,
        op: k,
        foco: pos,
        nota:
          modo === "circular"
            ? `Escrevo ${op.valor} na posição ${pos}, que é exatamente para onde o fim aponta.${
                reaproveita ? " Essa posição já tinha sido usada e ficou livre, então foi reaproveitada." : ""
              }`
            : `Escrevo ${op.valor} na posição ${pos}. Na ingênua o fim da fila é sempre o próprio tamanho, então nem preciso de um ponteiro para ele.`,
      });

      if (modo === "circular") {
        const antigo = fim;
        fim = (fim + 1) % cap;
        tamanho++;
        reg({
          linha: ln.mais,
          op: k,
          foco: pos,
          nota: `fim = (${antigo} + 1) % ${cap} = ${fim}${
            fim === 0 ? ": dei a volta, o fim reaparece na posição 0" : ""
          }. O tamanho vai para ${tamanho}${tamanho === cap ? " e a fila está cheia" : ""}.`,
        });
      } else {
        tamanho++;
        reg({
          linha: ln.mais,
          op: k,
          foco: pos,
          nota: `O tamanho vai para ${tamanho}${tamanho === cap ? " e a fila está cheia" : ""}. Nenhum elemento se mexeu: enfileirar é O(1) nas duas implementações.`,
        });
      }
      continue;
    }

    // desenfileirar
    if (tamanho === 0) {
      reg({
        linha: ln.vazia,
        op: k,
        alerta: true,
        nota: `Pedi para desenfileirar com tamanho 0: não tem ninguém na fila. Sem esse guard rail eu devolveria lixo de uma posição que nunca foi escrita.`,
      });
      continue;
    }
    reg({
      linha: ln.guardVazia,
      op: k,
      nota: `Vou desenfileirar. tamanho é ${tamanho}, então tem gente na fila e a operação pode acontecer.`,
    });

    const lido = modo === "circular" ? inicio : 0;
    const valor = slots[lido];
    reg({
      linha: ln.leitura,
      op: k,
      saiu: lido,
      nota:
        modo === "circular"
          ? `Leio ${valor} da posição ${lido}, onde o início está parado. É o mais antigo da fila, o primeiro que entrou.`
          : `Leio ${valor} da posição 0. Na ingênua o primeiro da fila é sempre a posição 0, e é isso que vai custar caro daqui a pouco.`,
    });

    if (modo === "circular") {
      const antigo = inicio;
      inicio = (inicio + 1) % cap;
      tamanho--;
      ultimo = valor;
      reg({
        linha: ln.andaInicio,
        op: k,
        nota: `início = (${antigo} + 1) % ${cap} = ${inicio}${
          inicio === 0 ? ": o início também dá a volta" : ""
        }. Zero elemento se mexeu, só o ponteiro andou.`,
      });
      reg({
        linha: ln.menos,
        op: k,
        nota: `O tamanho volta para ${tamanho} e eu devolvo ${valor}. Custo do desenfileirar: uma leitura, uma soma e um resto. O(1).`,
      });
    } else {
      const movidos: number[] = [];
      for (let i = 1; i < tamanho; i++) {
        slots[i - 1] = slots[i];
        movidos.push(i - 1);
      }
      movs += Math.max(0, tamanho - 1);
      reg({
        linha: ln.shift,
        op: k,
        movidos,
        nota: movidos.length
          ? `Agora o pedágio: empurro os ${movidos.length} que sobraram uma casa para a esquerda (${movidos
              .map((i) => `${slots[i]} para ${i}`)
              .join(", ")}). Foram ${movidos.length} movimentações só para tirar um elemento.`
          : `A fila tinha um só, então não sobrou ninguém para empurrar. Esse é o único caso em que o shift sai de graça.`,
      });
      tamanho--;
      ultimo = valor;
      reg({
        linha: ln.menos,
        op: k,
        nota: `O tamanho volta para ${tamanho} e eu devolvo ${valor}. Repare no resíduo: a última posição ainda guarda uma cópia, e só some quando alguém escrever por cima.`,
      });
    }
  }

  return out;
}

type Preset = { key: string; rotulo: string; cap: number; roteiro: string };
const PRESETS: Preset[] = [
  { key: "volta", rotulo: "Dá a volta", cap: 5, roteiro: "ABCD-EF-" },
  { key: "duas", rotulo: "Duas voltas", cap: 4, roteiro: "ABC-D-E-F-G-" },
  { key: "cheia", rotulo: "Enche e recusa", cap: 4, roteiro: "ABCDE" },
  { key: "vazia", rotulo: "Esvazia demais", cap: 4, roteiro: "AB---" },
];

const PADRAO = PRESETS[0];

// Geometria do anel: cada posição do array vira um ponto da circunferência,
// com o zero no topo e o índice crescendo no sentido horário.
const CX = 170;
const CY = 170;
const R_SLOT = 108;
const R_CELULA = 26;

function ponto(i: number, cap: number, raio: number, desvioGraus = 0): [number, number] {
  const ang = ((-90 + (360 * i) / cap + desvioGraus) * Math.PI) / 180;
  return [CX + raio * Math.cos(ang), CY + raio * Math.sin(ang)];
}

export function QueueVisualizer() {
  // Abre na ingênua de propósito: é a ordem em que o artigo apresenta as duas,
  // e o contador de movimentações só faz sentido depois de ver o shift left.
  const [modo, setModo] = useState<Modo>("ingenua");
  const [cap, setCap] = useState(PADRAO.cap);
  const [roteiro, setRoteiro] = useState<Op[]>(roteiroDe(PADRAO.roteiro));
  const [preset, setPreset] = useState(PADRAO.key);
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const passos = useMemo(() => gerarPassos(roteiro, cap, modo), [roteiro, cap, modo]);
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

  const aplicarPreset = (pr: Preset) => {
    reiniciar();
    setPreset(pr.key);
    setCap(pr.cap);
    setRoteiro(roteiroDe(pr.roteiro));
  };
  const acrescentar = (op: Op) => {
    reiniciar();
    setPreset("");
    setRoteiro((r) => (r.length >= 16 ? r : [...r, op]));
  };
  const desfazer = () => {
    reiniciar();
    setPreset("");
    setRoteiro((r) => r.slice(0, -1));
  };
  const limpar = () => {
    reiniciar();
    setPreset("");
    setRoteiro([]);
  };
  const trocarCap = (v: string) => {
    const n = parseInt(v, 10);
    if (isNaN(n)) return;
    reiniciar();
    setPreset("");
    setCap(Math.min(8, Math.max(3, n)));
  };
  const trocarModo = (m: Modo) => {
    reiniciar();
    setModo(m);
  };

  // Uma posição está OCUPADA se pertence à fila lógica agora. Fora disso ela
  // pode estar vazia (nunca escrita) ou guardar um resíduo, um valor que já foi
  // consumido e continua gravado até alguém escrever por cima.
  const ocupada = (i: number): boolean => {
    if (p.tamanho === 0) return false;
    if (modo === "ingenua") return i < p.tamanho;
    const rel = (i - p.inicio + cap) % cap;
    return rel < p.tamanho;
  };

  const classeDe = (i: number): string => {
    let cls = "viz-cell";
    if (ocupada(i)) cls += " in";
    else if (p.slots[i] !== null) cls += " drop fila-fantasma";
    else cls += " fila-vaga";
    if (p.saiu === i) cls += " sai";
    if (p.foco === i || p.movidos.includes(i)) cls += " entra";
    return cls;
  };

  const marcaDe = (i: number): string => {
    const ehInicio = i === (modo === "ingenua" ? 0 : p.inicio);
    const ehFim = i === (modo === "ingenua" ? p.tamanho : p.fim);
    if (ehInicio && ehFim) return "iní fim";
    if (ehInicio) return "iní";
    if (ehFim) return "fim";
    return "";
  };

  const codigo = CODIGO[modo];

  const variaveis = [
    { nome: "inicio", valor: modo === "ingenua" ? "0 (fixo)" : `${p.inicio}` },
    { nome: "fim", valor: modo === "ingenua" ? `${p.tamanho} (= tamanho)` : `${p.fim}` },
    { nome: "tamanho", valor: `${p.tamanho} / ${cap}` },
    { nome: "devolvido", valor: p.ultimo ?? "-", best: true },
  ];

  const enfileirados = roteiro.filter((o) => o.tipo === "enq").length;
  const desenfileirados = roteiro.length - enfileirados;
  const estatisticas = [
    { k: "cap", rot: "capacidade", val: `${cap}` },
    { k: "ocup", rot: "ocupadas agora", val: `${p.tamanho}` },
    { k: "movs", rot: "movimentações de elementos", val: `${p.movs}` },
    { k: "custo", rot: "custo do desenfileirar", val: modo === "ingenua" ? "O(n)" : "O(1)" },
  ];
  // No circular, início e fim caindo na mesma posição é o estado ambíguo da
  // seção "cheia ou vazia": só o tamanho desempata, e este card mostra isso
  // acontecendo (no anel, as duas mãos se separam alguns graus para aparecer).
  if (modo === "circular") {
    estatisticas.push({
      k: "ambiguo",
      rot: "início == fim?",
      val: p.inicio === p.fim ? (p.tamanho === cap ? "sim, e cheia" : "sim, e vazia") : "não",
    });
  }

  const notaCls = "viz-note" + (p.alerta ? " invalid" : idx === total - 1 ? " ok" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  // O anel: o mesmo array, dobrado. Quando início e fim caem na mesma posição
  // as duas mãos são desviadas alguns graus para nenhuma sumir atrás da outra.
  const juntos = modo === "circular" && p.inicio === p.fim;
  const mao = (i: number, cor: string, desvio: number) => {
    const [x, y] = ponto(i, cap, R_SLOT - R_CELULA - 3, desvio);
    const [bx, by] = ponto(i, cap, 30, desvio);
    const [px, py] = ponto(i, cap, R_SLOT - R_CELULA - 17, desvio);
    const ang = ((-90 + (360 * i) / cap + desvio) * Math.PI) / 180;
    const nx = -Math.sin(ang) * 6;
    const ny = Math.cos(ang) * 6;
    return (
      <g key={cor}>
        <line x1={bx} y1={by} x2={px} y2={py} stroke={cor} strokeWidth={2.5} strokeLinecap="round" />
        <polygon points={`${x},${y} ${px + nx},${py + ny} ${px - nx},${py - ny}`} fill={cor} />
      </g>
    );
  };

  const descricaoAnel =
    modo === "circular"
      ? `Anel de ${cap} posições. Início na posição ${p.inicio}, fim na posição ${p.fim}, ${p.tamanho} de ${cap} ocupadas.`
      : `Array de ${cap} posições. O início fica preso na posição 0 e o fim está na posição ${p.tamanho}, com ${p.tamanho} de ${cap} ocupadas.`;

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · a fila no array: ingênua x buffer circular</span>
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
          <button
            className={`bigo-chip${modo === "ingenua" ? " on" : ""}`}
            onClick={() => trocarModo("ingenua")}
            aria-pressed={modo === "ingenua"}
          >
            <span className="sw" style={{ background: modo === "ingenua" ? "#fbbf24" : "#3a4a60" }} />
            fila ingênua
          </button>
          <button
            className={`bigo-chip${modo === "circular" ? " on" : ""}`}
            onClick={() => trocarModo("circular")}
            aria-pressed={modo === "circular"}
          >
            <span className="sw" style={{ background: modo === "circular" ? "#34d399" : "#3a4a60" }} />
            buffer circular
          </button>
        </div>

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

        <div className="viz-inputs">
          <label className="viz-field">
            <span>capacidade</span>
            <input className="viz-input k" type="number" min={3} max={8} value={cap} onChange={(e) => trocarCap(e.target.value)} />
          </label>
          <div className="viz-field grow">
            <span>roteiro de operações</span>
            <div className="fila-botoes">
              <button className="viz-btn" onClick={() => acrescentar({ tipo: "enq", valor: proximaLetra(roteiro) })}>
                + enfileirar {proximaLetra(roteiro)}
              </button>
              <button className="viz-btn" onClick={() => acrescentar({ tipo: "deq" })}>
                + desenfileirar
              </button>
              <button className="viz-btn" disabled={!roteiro.length} onClick={desfazer}>
                ← desfazer
              </button>
              <button className="viz-btn" disabled={!roteiro.length} onClick={limpar}>
                limpar
              </button>
            </div>
          </div>
        </div>

        <div className="fila-roteiro">
          {roteiro.length === 0 && <span className="fila-vazio">roteiro vazio: use os botões acima para montar a sequência</span>}
          {roteiro.map((o, i) => (
            <span key={i} className={`fila-op${i === p.op ? " on" : ""}${i < p.op ? " feito" : ""}`}>
              {o.tipo === "enq" ? `↓ ${o.valor}` : "↑ deq"}
            </span>
          ))}
        </div>

        <div className="viz-cells">
          {p.slots.map((v, i) => {
            const marca = marcaDe(i);
            return (
              <div className="viz-cell-wrap" key={i}>
                <span className="viz-cell-idx">{i}</span>
                <div className={classeDe(i)}>{v ?? "·"}</div>
                <span className={`viz-mark${marca ? " show" : ""}`}>{marca || "·"}</span>
              </div>
            );
          })}
        </div>

        <div className="fila-anel-wrap">
          <svg className="fila-anel" viewBox="0 0 340 340" role="img" aria-label={descricaoAnel}>
            <circle cx={CX} cy={CY} r={R_SLOT} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
            {p.slots.map((v, i) => {
              const [x, y] = ponto(i, cap, R_SLOT);
              const [ix, iy] = ponto(i, cap, R_SLOT + R_CELULA + 12);
              const dentro = ocupada(i);
              const residuo = !dentro && v !== null;
              return (
                <g key={i}>
                  <circle
                    cx={x}
                    cy={y}
                    r={R_CELULA}
                    fill={dentro ? "rgba(59,130,246,0.18)" : "#0f1826"}
                    stroke={dentro ? "#3b82f6" : "rgba(255,255,255,0.12)"}
                    strokeWidth={1.5}
                    strokeDasharray={dentro ? undefined : "4 3"}
                    opacity={residuo ? 0.6 : 1}
                  />
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={dentro ? "#ffffff" : "#61748c"}
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    fontSize={17}
                    fontWeight={600}
                    opacity={residuo ? 0.7 : 1}
                  >
                    {v ?? "·"}
                  </text>
                  <text
                    x={ix}
                    y={iy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#61748c"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    fontSize={11}
                  >
                    {i}
                  </text>
                </g>
              );
            })}
            {mao(modo === "ingenua" ? 0 : p.inicio, "#3b82f6", juntos ? -7 : 0)}
            {(modo === "circular" || p.tamanho < cap) && mao(modo === "ingenua" ? p.tamanho : p.fim, "#fbbf24", juntos ? 7 : 0)}
            <circle cx={CX} cy={CY} r={4} fill="#4c5f79" />
          </svg>
          <p className="tp-legenda">
            <span>
              <i style={{ background: "#3b82f6" }} /> início (de onde sai)
            </span>
            <span>
              <i style={{ background: "#fbbf24" }} /> fim (onde entra)
            </span>
            <span>
              <i style={{ background: "#0f1826", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.2)" }} /> livre ou resíduo
            </span>
          </p>
        </div>

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">{modo === "ingenua" ? "fila_ingenua.py" : "fila_circular.py"}</div>
            <div className="viz-code-body">
              {codigo.map((txt, i) => (
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
            <p className="fila-resumo">
              Roteiro com {enfileirados} {enfileirados === 1 ? "entrada" : "entradas"} e {desenfileirados}{" "}
              {desenfileirados === 1 ? "saída" : "saídas"}. Até aqui, {p.movs}{" "}
              {p.movs === 1 ? "movimentação de elemento" : "movimentações de elementos"}.
            </p>
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
            <input type="range" min={1} max={5} step={1} value={velocidade} onChange={(e) => setVelocidade(parseInt(e.target.value, 10))} />
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
