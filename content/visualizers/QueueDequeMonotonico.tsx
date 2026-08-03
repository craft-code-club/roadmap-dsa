"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// QueueDequeMonotonico, o deque decrescente resolvendo o máximo de cada janela
// (LeetCode 239). É a ponte entre este tópico e a Sliding Window.
//
// Mesmo padrão do TwoPointersVisualizer: gerador PURO de passos + a mesma casca.
// O desenho central tem três andares: a fita do array com a janela atual, o
// deque de ÍNDICES (o detalhe que mais confunde: guarda índice, não valor) e a
// saída sendo montada.
//
// A única coisa que o aluno precisa ver acontecendo: quando um valor maior
// chega, todo mundo menor que ele sai pelo fundo do deque de uma vez, porque
// nenhum deles pode voltar a ser máximo enquanto o novo estiver na janela. Os
// dois contadores (comparações do deque x comparações da força bruta) mostram
// por que isso vira O(n) em vez de O(n·k): aumente o k e só um dos dois cresce.
// ---------------------------------------------------------------------------

type Passo = {
  i: number; // índice sendo lido, -1 no passo de preparação
  dq: number[]; // índices no deque, da frente para o fundo
  saida: number[];
  linha: number;
  saindo: number | null; // índice que acabou de sair do deque
  porFrente?: boolean; // a saída foi pela frente (venceu a validade)
  comp: number; // comparações de valores feitas até aqui
  ops: number; // entradas e saídas no deque
  maiorDq: number;
  fecha?: boolean; // este passo fechou uma janela
  fim?: boolean;
  nota: string;
};

// As linhas mapeiam 1:1 com o campo `linha` de cada passo, então a ordem e a
// quantidade de linhas não podem mudar sem ajustar o gerador junto.
const CODIGO = [
  "from collections import deque",
  "",
  "def maximos_da_janela(nums, k):",
  "    dq = deque()   # ÍNDICES, valores em ordem decrescente",
  "    saida = []",
  "    for i, v in enumerate(nums):",
  "        while dq and nums[dq[-1]] <= v:",
  "            dq.pop()",
  "        dq.append(i)",
  "        if dq[0] <= i - k:",
  "            dq.popleft()",
  "        if i >= k - 1:",
  "            saida.append(nums[dq[0]])",
  "    return saida",
];

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

function gerarPassos(nums: number[], k: number): Passo[] {
  const out: Passo[] = [];
  const dq: number[] = [];
  const saida: number[] = [];
  let comp = 0;
  let ops = 0;
  let maiorDq = 0;

  const reg = (p: { i: number; linha: number; nota: string; saindo?: number; porFrente?: boolean; fecha?: boolean; fim?: boolean }) => {
    out.push({
      i: p.i,
      dq: [...dq],
      saida: [...saida],
      linha: p.linha,
      saindo: p.saindo ?? null,
      porFrente: p.porFrente,
      comp,
      ops,
      maiorDq,
      fecha: p.fecha,
      fim: p.fim,
      nota: p.nota,
    });
  };

  reg({
    i: -1,
    linha: 3,
    nota: `Deque vazio, saída vazia. Vou passar uma vez só pelo array, com janelas de ${k} ${k === 1 ? "elemento" : "elementos"}.`,
  });

  let guarda = 0;
  for (let i = 0; i < nums.length && guarda++ < 80; i++) {
    const v = nums[i];
    const ini = Math.max(0, i - k + 1);
    reg({
      i,
      linha: 5,
      nota: `Leio nums[${i}] = ${v}. A janela agora vai de ${ini} a ${i}${i < k - 1 ? ", ainda incompleta" : ""}.`,
    });

    while (dq.length && nums[dq[dq.length - 1]] <= v) {
      comp++;
      const fora = dq[dq.length - 1];
      reg({
        i,
        linha: 6,
        saindo: fora,
        nota: `nums[${fora}] = ${nums[fora]} é menor ou igual a ${v}, e entrou antes. Enquanto ${v} estiver na janela, ${nums[fora]} nunca mais vai ser o máximo: descarto pelo fundo.`,
      });
      dq.pop();
      ops++;
      reg({
        i,
        linha: 7,
        nota: `Fora o índice ${fora}. O deque fica com ${dq.length} ${dq.length === 1 ? "índice" : "índices"}.`,
      });
    }
    if (dq.length) comp++;

    dq.push(i);
    ops++;
    reg({
      i,
      linha: 8,
      nota:
        dq.length > 1
          ? `nums[${dq[dq.length - 2]}] = ${nums[dq[dq.length - 2]]} é maior que ${v}, então paro de descartar e guardo o índice ${i} no fundo. O deque continua decrescente: ${dq
              .map((j) => nums[j])
              .join(" > ")}.`
          : `O deque tinha esvaziado, então o índice ${i} entra sozinho: ${v} é o maior de toda a janela atual.`,
    });

    if (dq[0] <= i - k) {
      const velho = dq[0];
      reg({
        i,
        linha: 9,
        saindo: velho,
        porFrente: true,
        nota: `O índice ${velho} está na frente, mas a janela começa em ${ini}: ele venceu a validade. O maior valor da janela anterior ficou para trás.`,
      });
      dq.shift();
      ops++;
      reg({
        i,
        linha: 10,
        nota: `Tiro o ${velho} pela frente. Agora quem manda é o índice ${dq[0]}, com valor ${nums[dq[0]]}.`,
      });
    }
    // O maior deque é medido depois da validade: por um instante ele chega a ter
    // k + 1 índices, mas o tamanho que sustenta o O(k) de memória é o que sobra
    // quando o passo termina.
    maiorDq = Math.max(maiorDq, dq.length);

    if (i >= k - 1) {
      saida.push(nums[dq[0]]);
      reg({
        i,
        linha: 12,
        fecha: true,
        nota: `Janela [${ini}..${i}] fechada. O máximo é nums[${dq[0]}] = ${nums[dq[0]]}, que está na frente do deque: leio sem comparar nada.`,
      });
    } else {
      reg({
        i,
        linha: 11,
        nota: `Ainda não tenho ${k} elementos lidos, então esta janela não conta. Sigo para o próximo índice.`,
      });
    }
  }

  const janelas = Math.max(0, nums.length - k + 1);
  const bruta = janelas * Math.max(0, k - 1);
  reg({
    i: nums.length - 1,
    linha: 13,
    fim: true,
    nota: `Fim: saída = [${saida.join(", ")}]. Foram ${comp} ${comp === 1 ? "comparação" : "comparações"} de valores, contra ${bruta} que a força bruta faria para reolhar as ${janelas} ${
      janelas === 1 ? "janela" : "janelas"
    }.`,
  });
  return out;
}

type Preset = { key: string; rotulo: string; nums: number[]; k: number };
const PRESETS: Preset[] = [
  { key: "lc239", rotulo: "LeetCode 239", nums: [1, 3, -1, -3, 5, 3, 6, 7], k: 3 },
  { key: "validade", rotulo: "O máximo vence a validade", nums: [8, 1, 2, 3, 4, 5], k: 3 },
  { key: "desc", rotulo: "Decrescente (deque cheio)", nums: [9, 8, 7, 6, 5, 4, 3, 2], k: 3 },
  { key: "cresc", rotulo: "Crescente (deque de um)", nums: [1, 2, 3, 4, 5, 6, 7, 8], k: 3 },
  { key: "iguais", rotulo: "Tudo igual", nums: [5, 5, 5, 5, 5, 5], k: 3 },
];

const PADRAO = PRESETS[0];

export function QueueDequeMonotonico() {
  const [nums, setNums] = useState<number[]>(PADRAO.nums);
  const [entrada, setEntrada] = useState(PADRAO.nums.join(", "));
  const [k, setK] = useState(PADRAO.k);
  const [preset, setPreset] = useState(PADRAO.key);
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const kUsado = Math.min(Math.max(1, k), Math.max(1, nums.length));
  const passos = useMemo(() => gerarPassos(nums.length ? nums : [0], kUsado), [nums, kUsado]);
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

  const zerar = useCallback(() => {
    parar();
    setTocando(false);
    setPasso(0);
  }, [parar]);

  const aoMudarEntrada = (v: string) => {
    const arr = v
      .split(",")
      .map((x) => parseInt(x.trim(), 10))
      .filter((x) => !isNaN(x))
      .slice(0, 14);
    zerar();
    setPreset("");
    setEntrada(v);
    setNums(arr.length ? arr : [0]);
  };
  const aoMudarK = (v: string) => {
    const n = parseInt(v, 10);
    zerar();
    setPreset("");
    setK(isNaN(n) ? 1 : Math.max(1, Math.min(12, n)));
  };
  const aplicarPreset = (pr: Preset) => {
    zerar();
    setPreset(pr.key);
    setNums(pr.nums);
    setEntrada(pr.nums.join(", "));
    setK(pr.k);
  };
  const sortear = () => {
    const n = 8;
    const arr = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 20));
    zerar();
    setPreset("");
    setNums(arr);
    setEntrada(arr.join(", "));
    setK(2 + Math.floor(Math.random() * 3));
  };

  const iniJanela = p.i < 0 ? 0 : Math.max(0, p.i - kUsado + 1);
  const frente = p.dq.length ? p.dq[0] : null;

  const cells = nums.map((v, i) => {
    let cls = "viz-cell";
    if (p.i >= 0 && i >= iniJanela && i <= p.i) cls += " in";
    if (p.i >= 0 && i < iniJanela) cls += " drop";
    if (i === p.i) cls += " entra";
    if (p.saindo === i) cls += " sai";
    let marca = "";
    if (i === p.i) marca = "i";
    if (frente !== null && i === frente) marca = marca ? "i máx" : "máx";
    return { i, v, cls, marca };
  });

  const janelas = Math.max(0, nums.length - kUsado + 1);
  const bruta = janelas * Math.max(0, kUsado - 1);

  const variaveis = [
    { nome: "i", valor: p.i < 0 ? "-" : `${p.i}` },
    { nome: "nums[i]", valor: p.i < 0 ? "-" : `${nums[p.i]}` },
    { nome: "dq[0]", valor: frente === null ? "-" : `${frente}` },
    { nome: "máximo", valor: frente === null ? "-" : `${nums[frente]}`, best: true },
  ];

  const estatisticas = [
    { k: "comp", rot: "comparações (deque)", val: `${p.comp}` },
    { k: "bruta", rot: "comparações (força bruta)", val: `${bruta}` },
    { k: "ops", rot: "entradas e saídas no deque", val: `${p.ops}` },
    { k: "maior", rot: "maior deque", val: `${p.maiorDq}` },
  ];

  const notaCls = "viz-note" + (p.fim || p.fecha ? " ok" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · deque monotônico: o máximo de cada janela</span>
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
              onClick={() => aplicarPreset(pr)}
              aria-pressed={preset === pr.key}
            >
              {pr.rotulo}
            </button>
          ))}
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Array</span>
            <input className="viz-input" value={entrada} onChange={(e) => aoMudarEntrada(e.target.value)} />
          </label>
          <label className="viz-field">
            <span>k</span>
            <input className="viz-input k" type="number" min={1} max={12} value={k} onChange={(e) => aoMudarK(e.target.value)} />
          </label>
          <button className="viz-btn" onClick={sortear}>
            Sortear
          </button>
        </div>

        <div className="viz-cells">
          {cells.map((c) => (
            <div className="viz-cell-wrap" key={c.i}>
              <span className="viz-cell-idx">{c.i}</span>
              <div className={c.cls}>{c.v}</div>
              <span className={`viz-mark${c.marca ? " show" : ""}`}>{c.marca || "·"}</span>
            </div>
          ))}
        </div>

        <div className="fila-fila">
          <span className="fila-rot">deque</span>
          <span className="fila-ponta">frente ▸</span>
          <div className="fila-itens">
            {p.dq.length === 0 && <span className="fila-vazio">vazio</span>}
            {p.dq.map((j, pos) => (
              <span key={j} className={`fila-item${pos === 0 ? " frente" : ""}${p.saindo === j ? " saindo" : ""}`}>
                <b>{nums[j]}</b>
                <i>idx {j}</i>
              </span>
            ))}
          </div>
          <span className="fila-ponta">◂ fundo</span>
        </div>

        <div className="fila-fila">
          <span className="fila-rot">saída</span>
          <div className="fila-itens">
            {p.saida.length === 0 && <span className="fila-vazio">nenhuma janela fechada ainda</span>}
            {p.saida.map((v, i) => (
              <span key={i} className={`fila-item saida${p.fecha && i === p.saida.length - 1 ? " novo" : ""}`}>
                <b>{v}</b>
              </span>
            ))}
          </div>
        </div>

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">maximos_da_janela.py</div>
            <div className="viz-code-body">
              {CODIGO.map((txt, i) => (
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
              n = {nums.length}, k = {kUsado}: são {janelas} {janelas === 1 ? "janela" : "janelas"} para resolver.
              {k > nums.length ? ` Você pediu k = ${k}, mas não existe janela maior que o array: usei k = ${kUsado}.` : ""}
              {kUsado === 1 ? " Com k = 1 a resposta é o próprio array, e a força bruta não compara nada: o deque vira só custo." : ""}
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
          <button className="viz-btn" title="Reiniciar" onClick={zerar}>
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
