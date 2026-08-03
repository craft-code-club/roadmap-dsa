"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LinhaDoTempo,
  eixoDe,
  escreverIntervalos,
  fmtIv,
  lerIntervalos,
} from "./IntervalsLinhaDoTempo";
import type { Intervalo, LinhaTL } from "./IntervalsLinhaDoTempo";

// ---------------------------------------------------------------------------
// IntervalsSweepVisualizer, a contagem por eventos (sweep line).
//
// Responde a pergunta que o merge NÃO responde: "quantos intervalos estão
// acontecendo ao mesmo tempo no pior instante do dia?". Cada intervalo vira
// dois eventos (+1 no início, -1 no fim), a lista de eventos é ordenada e um
// contador sobe e desce. O máximo que o contador atinge é a resposta.
//
// O botão de regra de empate é o coração didático: com a saída antes da
// entrada, uma sala que vagou às 12 recebe quem chega às 12; com a entrada
// antes, não. A mesma entrada dá respostas diferentes, e é o enunciado que
// decide qual das duas está certa.
// ---------------------------------------------------------------------------

type Evento = { t: number; delta: number; iv: number; tipo: "entra" | "sai" };

type Vars = { nome: string; valor: string; best?: boolean }[];

type Passo = {
  linha: number;
  iEvento: number;
  atual: number;
  maximo: number;
  ativos: number[];
  fechados: number[];
  perfil: number[];
  tempo: number | null;
  nota: string;
  vars: Vars;
  ok?: boolean;
};

function codigoDe(saidaPrimeiro: boolean): string[] {
  return [
    "def salas_necessarias(reunioes):",
    "    eventos = []",
    "    for inicio, fim in reunioes:",
    "        eventos.append((inicio, +1))",
    "        eventos.append((fim, -1))",
    saidaPrimeiro ? "    eventos.sort()" : "    eventos.sort(key=lambda e: (e[0], -e[1]))",
    "    atual = maximo = 0",
    "    for tempo, delta in eventos:",
    "        atual += delta",
    "        maximo = max(maximo, atual)",
    "    return maximo",
  ];
}

function eventosDe(ivs: Intervalo[], saidaPrimeiro: boolean): Evento[] {
  const evs: Evento[] = [];
  ivs.forEach((iv, i) => {
    evs.push({ t: iv[0], delta: 1, iv: i, tipo: "entra" });
    evs.push({ t: iv[1], delta: -1, iv: i, tipo: "sai" });
  });
  // No empate de tempo, `delta` crescente coloca o -1 (saída) na frente, e
  // `-delta` coloca o +1 (entrada). O índice desempata o resto para o gerador
  // continuar puro.
  return evs.sort((a, b) => {
    if (a.t !== b.t) return a.t - b.t;
    const da = saidaPrimeiro ? a.delta : -a.delta;
    const db = saidaPrimeiro ? b.delta : -b.delta;
    if (da !== db) return da - db;
    return a.iv - b.iv;
  });
}

/** Máximo de intervalos simultâneos, sem passo a passo. Serve para comparar as duas regras de empate. */
function maxSimultaneo(ivs: Intervalo[], saidaPrimeiro: boolean): number {
  let atual = 0;
  let maximo = 0;
  for (const e of eventosDe(ivs, saidaPrimeiro)) {
    atual += e.delta;
    if (atual > maximo) maximo = atual;
  }
  return maximo;
}

/** Merge Intervals puro, só para desenhar a linha de contraste "o merge diria isto". */
function fundir(ivs: Intervalo[]): Intervalo[] {
  if (!ivs.length) return [];
  const ord = [...ivs].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const out: Intervalo[] = [[ord[0][0], ord[0][1]]];
  for (let i = 1; i < ord.length; i++) {
    const ultimo = out[out.length - 1];
    if (ord[i][0] <= ultimo[1]) ultimo[1] = Math.max(ultimo[1], ord[i][1]);
    else out.push([ord[i][0], ord[i][1]]);
  }
  return out;
}

function pl(n: number, um: string, muitos: string): string {
  return n === 1 ? um : muitos;
}

function gerarPassos(ivs: Intervalo[], saidaPrimeiro: boolean): Passo[] {
  const out: Passo[] = [];
  const n = ivs.length;

  if (n === 0) {
    out.push({
      linha: 10, iEvento: -1, atual: 0, maximo: 0, ativos: [], fechados: [], perfil: [], tempo: null,
      nota: "Nenhuma reunião marcada: zero eventos, zero salas. O contador nem chega a subir.",
      vars: [{ nome: "eventos", valor: "0" }, { nome: "maximo", valor: "0", best: true }],
    });
    return out;
  }

  const evs = eventosDe(ivs, saidaPrimeiro);
  const regra = saidaPrimeiro
    ? "no empate, a saída vem antes da entrada: quem desocupa às 12 entrega a sala para quem chega às 12"
    : "no empate, a entrada vem antes da saída: quem chega às 12 precisa de outra sala, porque a de quem sai às 12 ainda conta como ocupada";

  out.push({
    linha: 2, iEvento: -1, atual: 0, maximo: 0, ativos: [], fechados: [], perfil: [], tempo: null,
    nota: `${n} ${pl(n, "reunião vira", "reuniões viram")} ${evs.length} eventos: um +1 no início de cada uma e um -1 no fim. A partir daqui eu esqueço quem é quem, só me importa o vaivém do contador.`,
    vars: [{ nome: "eventos", valor: `${evs.length}` }, { nome: "atual", valor: "0" }, { nome: "maximo", valor: "0", best: true }],
  });

  out.push({
    linha: 5, iEvento: -1, atual: 0, maximo: 0, ativos: [], fechados: [], perfil: [], tempo: null,
    nota: `Ordenei os ${evs.length} eventos por tempo, e ${regra}.`,
    vars: [{ nome: "eventos", valor: `${evs.length}` }, { nome: "atual", valor: "0" }, { nome: "maximo", valor: "0", best: true }],
  });

  let atual = 0;
  let maximo = 0;
  const ativos = new Set<number>();
  const fechados = new Set<number>();
  const perfil: number[] = [];

  for (let k = 0; k < evs.length; k++) {
    const e = evs[k];
    atual += e.delta;
    if (e.tipo === "entra") ativos.add(e.iv);
    else { ativos.delete(e.iv); fechados.add(e.iv); }
    perfil.push(atual);
    const subiu = atual > maximo;
    if (subiu) maximo = atual;

    out.push({
      linha: subiu ? 9 : 8,
      iEvento: k,
      atual,
      maximo,
      ativos: [...ativos],
      fechados: [...fechados],
      perfil: [...perfil],
      tempo: e.t,
      nota: e.tipo === "entra"
        ? `t = ${e.t}: começa ${fmtIv(ivs[e.iv])}. atual = ${atual - 1} + 1 = ${atual}.${subiu ? ` Recorde novo: preciso de ${atual} ${pl(atual, "sala", "salas")} neste instante.` : ""}`
        : `t = ${e.t}: termina ${fmtIv(ivs[e.iv])} e a sala vaga. atual = ${atual + 1} - 1 = ${atual}. O máximo já visto continua ${maximo}.`,
      vars: [
        { nome: "tempo", valor: `${e.t}` },
        { nome: "delta", valor: e.delta > 0 ? "+1" : "-1" },
        { nome: "atual", valor: `${atual}` },
        { nome: "maximo", valor: `${maximo}`, best: true },
      ],
    });
  }

  out.push({
    linha: 10, iEvento: evs.length - 1, atual, maximo, ativos: [], fechados: ivs.map((_, i) => i),
    perfil: [...perfil], tempo: null, ok: true,
    nota: `Fim: o contador voltou a ${atual} e o pico foi ${maximo}. Preciso de ${maximo} ${pl(maximo, "sala", "salas")} para que nenhuma reunião fique esperando.`,
    vars: [
      { nome: "tempo", valor: "-" },
      { nome: "delta", valor: "-" },
      { nome: "atual", valor: `${atual}` },
      { nome: "maximo", valor: `${maximo}`, best: true },
    ],
  });
  return out;
}

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

type Preset = { nome: string; ivs: string };

const PRESETS: Preset[] = [
  { nome: "Reuniões do dia", ivs: "[9,12], [10,13], [11,14], [12,15], [16,18], [17,19]" },
  { nome: "Uma sala basta", ivs: "[9,10], [10,11], [11,12], [12,13]" },
  { nome: "Tudo aninhado", ivs: "[9,17], [10,16], [11,15]" },
  { nome: "Dois picos", ivs: "[1,4], [2,9], [3,5], [6,8], [7,10]" },
  { nome: "Nenhuma reunião", ivs: "" },
];

export function IntervalsSweepVisualizer() {
  const [entrada, setEntrada] = useState(PRESETS[0].ivs);
  const [saidaPrimeiro, setSaidaPrimeiro] = useState(true);
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const ivs = useMemo(() => lerIntervalos(entrada, 8), [entrada]);
  const evs = useMemo(() => eventosDe(ivs, saidaPrimeiro), [ivs, saidaPrimeiro]);
  const passos = useMemo(() => gerarPassos(ivs, saidaPrimeiro), [ivs, saidaPrimeiro]);
  const merged = useMemo(() => fundir(ivs), [ivs]);
  const outraRegra = useMemo(() => maxSimultaneo(ivs, !saidaPrimeiro), [ivs, saidaPrimeiro]);
  // Altura fixa do perfil: usa o pico da execução inteira para as barras não
  // reescalarem a cada passo.
  const picoFinal = useMemo(() => maxSimultaneo(ivs, saidaPrimeiro), [ivs, saidaPrimeiro]);

  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];
  const codigo = useMemo(() => codigoDe(saidaPrimeiro), [saidaPrimeiro]);

  const eixo = useMemo(() => {
    const vals: number[] = [];
    for (const iv of ivs) { vals.push(iv[0], iv[1]); }
    if (!vals.length) vals.push(0, 10);
    return eixoDe(vals);
  }, [ivs]);

  const parar = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const reiniciar = useCallback(() => { parar(); setTocando(false); setPasso(0); }, [parar]);

  // Math.random só no handler, nunca no render, para a hidratação bater.
  const sortear = () => {
    const qtd = 4 + Math.floor(Math.random() * 3);
    const gerados: Intervalo[] = [];
    for (let i = 0; i < qtd; i++) {
      const ini = 8 + Math.floor(Math.random() * 8);
      gerados.push([ini, ini + 1 + Math.floor(Math.random() * 4)]);
    }
    reiniciar();
    setEntrada(escreverIntervalos(gerados));
  };

  const linhasTL: LinhaTL[] = [
    ...ivs.map((iv, i) => {
      const classe = p.ativos.includes(i) ? "atual" : p.fechados.includes(i) ? "usado" : "espera";
      return {
        chave: `iv${i}`,
        rotulo: `[${iv[0]}, ${iv[1]}]`,
        barras: [{ chave: `b${i}`, inicio: iv[0], fim: iv[1], classe, texto: `${iv[0]},${iv[1]}` }],
      };
    }),
    {
      chave: "merge",
      rotulo: "o merge diria",
      barras: merged.map((s, k) => ({ chave: `m${k}`, inicio: s[0], fim: s[1], classe: "pronto", texto: `${s[0]},${s[1]}` })),
    },
  ];

  const alturaMax = Math.max(1, picoFinal);
  const notaCls = "viz-note" + (p.ok ? " ok" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" style={{ background: "#a78bfa" }} />
          <span>Visualizador · quantos intervalos ao mesmo tempo</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">passo {idx + 1} de {total}</span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "✕ Fechar" : "⤢ Expandir"}
          </button>
        </div>
      </div>

      <div className="viz-body">
        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Reuniões</span>
            <input
              className="viz-input"
              value={entrada}
              onChange={(e) => { reiniciar(); setEntrada(e.target.value); }}
              placeholder="[9,12], [10,13], [11,14]"
            />
          </label>
          <button className="viz-btn" onClick={sortear}>Sortear</button>
          <button
            className="viz-btn"
            aria-pressed={saidaPrimeiro}
            onClick={() => { reiniciar(); setSaidaPrimeiro((v) => !v); }}
          >
            Empate: {saidaPrimeiro ? "saída primeiro" : "entrada primeiro"}
          </button>
        </div>

        <div className="iv-presets">
          <span className="iv-presets-lbl">Cenários</span>
          {PRESETS.map((pr) => (
            <button
              key={pr.nome}
              className={`iv-preset${entrada === pr.ivs ? " on" : ""}`}
              onClick={() => { reiniciar(); setEntrada(pr.ivs); }}
            >
              {pr.nome}
            </button>
          ))}
        </div>

        <LinhaDoTempo
          linhas={linhasTL}
          min={eixo.min}
          max={eixo.max}
          marcas={eixo.marcas}
          guia={p.tempo}
        />

        <div className="iv-eventos">
          {evs.map((e, k) => (
            <span
              key={`${e.t}-${e.tipo}-${e.iv}`}
              className={`iv-ev ${e.tipo}${k === p.iEvento ? " on" : ""}${k < p.iEvento ? " feito" : ""}`}
            >
              {e.t} {e.delta > 0 ? "+1" : "-1"}
            </span>
          ))}
        </div>

        <div className="iv-perfil" aria-hidden="true">
          {evs.map((e, k) => {
            const v = k < p.perfil.length ? p.perfil[k] : null;
            const alt = v == null ? 0 : (v / alturaMax) * 100;
            const cls = v != null && v === picoFinal && picoFinal > 0 ? " max" : k === p.iEvento ? " on" : "";
            return (
              <div className={`iv-perfil-col${cls}`} key={`c${e.t}-${e.tipo}-${e.iv}`}>
                <span className="iv-perfil-n">{v == null ? "" : v}</span>
                <span className="iv-perfil-bar" style={{ height: `${alt}%` }} />
              </div>
            );
          })}
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>reuniões</span>
            <strong>{ivs.length}</strong>
          </div>
          <div className="bigo-stat">
            <span>em uso agora</span>
            <strong style={{ color: "#a78bfa" }}>{p.atual}</strong>
          </div>
          <div className="bigo-stat">
            <span>máximo até aqui</span>
            <strong style={{ color: "#fbbf24" }}>{p.maximo}</strong>
          </div>
          <div className="bigo-stat">
            <span>com a outra regra de empate</span>
            <strong>{outraRegra}</strong>
          </div>
        </div>

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">
              salas.py · {saidaPrimeiro ? "a saída libera a sala" : "a saída não libera a sala"}
            </div>
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
            {p.vars.map((v) => (
              <div className="viz-var" key={v.nome}>
                <span className="viz-var-name">{v.nome}</span>
                <span className={`viz-var-val${v.best ? " best" : ""}`}>{v.valor}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="viz-controls">
          <button className="viz-btn" title="Reiniciar" onClick={reiniciar}>↺</button>
          <button className="viz-btn" disabled={idx === 0} onClick={() => { parar(); setTocando(false); setPasso(Math.max(0, idx - 1)); }}>‹ Anterior</button>
          <button className="viz-play" onClick={() => { if (tocando) { setTocando(false); return; } setPasso(idx >= total - 1 ? 0 : idx); setTocando(true); }}>
            {tocando ? "❚❚ Pausar" : "▶ Rodar"}
          </button>
          <button className="viz-btn" disabled={idx === total - 1} onClick={() => { parar(); setTocando(false); setPasso(Math.min(idx + 1, total - 1)); }}>Próximo ›</button>
          <div className="viz-speed">
            <span>Velocidade</span>
            <input type="range" min={1} max={5} step={1} value={velocidade} onChange={(e) => setVelocidade(parseInt(e.target.value, 10))} />
            <span className="val">{ROTULOS_VEL[velocidade]}</span>
          </div>
        </div>
        <div className="viz-progress"><div className="viz-progress-fill" style={{ width: `${pctPasso}%`, background: "#a78bfa" }} /></div>
      </div>
    </figure>
  );

  if (expanded && mounted) {
    return createPortal(
      <div className="viz-overlay" onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false); }}>
        {viz}
      </div>,
      document.body
    );
  }
  return viz;
}
