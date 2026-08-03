"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// QueueDuasPilhas, a fila montada com duas pilhas (LeetCode 232), que foi a
// tarefa de casa deixada no encontro.
//
// Mesmo padrão do TwoPointersVisualizer: gerador PURO de passos + a mesma casca.
// O desenho central são duas torres, porque o truque é geométrico: despejar a
// pilha de ENTRADA na de SAÍDA inverte a ordem, e LIFO invertido é FIFO.
//
// A única coisa que o aluno precisa ver acontecendo: a virada é cara, mas
// acontece raramente, e cada elemento é empurrado e retirado no máximo duas
// vezes em cada pilha. Por isso o contador "operações por elemento" nunca passa
// de 4, mexa-se no roteiro o quanto quiser: é O(1) amortizado na tela.
// ---------------------------------------------------------------------------

type Op = { tipo: "enq"; valor: string } | { tipo: "deq" };

type Passo = {
  entrada: string[]; // fundo -> topo
  saida: string[]; // fundo -> topo
  linha: number;
  op: number;
  movendo: string | null; // valor que acabou de trocar de pilha
  ops: number; // pushes e pops nas duas pilhas
  enfileirados: number;
  entregues: number;
  viradas: number;
  ultimo: string | null;
  alerta?: boolean;
  nota: string;
};

// As linhas mapeiam 1:1 com o campo `linha` de cada passo, então a ordem e a
// quantidade de linhas não podem mudar sem ajustar o gerador junto.
const CODIGO = [
  "class FilaComDuasPilhas:",
  "    def __init__(self):",
  "        self.entrada = []   # todo mundo chega aqui",
  "        self.saida = []     # todo mundo sai daqui",
  "",
  "    def enfileirar(self, valor):",
  "        self.entrada.append(valor)",
  "",
  "    def desenfileirar(self):",
  "        if not self.entrada and not self.saida:",
  '            raise IndexError("fila vazia")',
  "        if not self.saida:",
  "            while self.entrada:",
  "                self.saida.append(self.entrada.pop())",
  "        return self.saida.pop()",
];

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function roteiroDe(s: string): Op[] {
  return Array.from(s).map((c) => (c === "-" ? { tipo: "deq" } : { tipo: "enq", valor: c }));
}

function proximaLetra(roteiro: Op[]): string {
  let n = 0;
  for (const o of roteiro) if (o.tipo === "enq") n++;
  return LETRAS[n % LETRAS.length];
}

function gerarPassos(roteiro: Op[]): Passo[] {
  const out: Passo[] = [];
  const entrada: string[] = [];
  const saida: string[] = [];
  let ops = 0;
  let enfileirados = 0;
  let entregues = 0;
  let viradas = 0;
  let ultimo: string | null = null;

  const reg = (p: { linha: number; op: number; nota: string; movendo?: string; alerta?: boolean }) => {
    out.push({
      entrada: [...entrada],
      saida: [...saida],
      linha: p.linha,
      op: p.op,
      movendo: p.movendo ?? null,
      ops,
      enfileirados,
      entregues,
      viradas,
      ultimo,
      alerta: p.alerta,
      nota: p.nota,
    });
  };

  reg({ linha: 3, op: -1, nota: "As duas pilhas começam vazias. Uma só recebe, a outra só entrega." });

  let guarda = 0;
  for (let k = 0; k < roteiro.length && guarda++ < 60; k++) {
    const op = roteiro[k];

    if (op.tipo === "enq") {
      entrada.push(op.valor);
      ops++;
      enfileirados++;
      reg({
        linha: 6,
        op: k,
        movendo: op.valor,
        nota: `Enfileirar ${op.valor} é só empilhar na entrada, sem olhar para mais nada. Uma operação, sempre: O(1) de verdade, não amortizado.`,
      });
      continue;
    }

    if (!entrada.length && !saida.length) {
      reg({
        linha: 10,
        op: k,
        alerta: true,
        nota: "As duas pilhas estão vazias: não tem ninguém para entregar. É o único caso em que o desenfileirar falha.",
      });
      continue;
    }
    reg({
      linha: 9,
      op: k,
      nota: `Pediram um desenfileirar. Tem ${entrada.length} na entrada e ${saida.length} na saída, então alguém vai sair.`,
    });
    // Guardado para a nota final dizer quanto ESTE desenfileirar custou: é o
    // contraste entre o passo caro (a virada) e os baratos que vêm depois, que
    // é a definição de amortizado.
    const opsAntes = ops;

    if (!saida.length) {
      viradas++;
      reg({
        linha: 11,
        op: k,
        nota: `A saída está vazia, então é hora da virada: vou despejar os ${entrada.length} da entrada, um por um. O topo da entrada é o mais NOVO, e ele vai para o fundo da saída.`,
      });
      let g2 = 0;
      while (entrada.length && g2++ < 40) {
        const v = entrada.pop() as string;
        saida.push(v);
        ops += 2;
        reg({
          linha: 13,
          op: k,
          movendo: v,
          nota: `${v} sai do topo da entrada e vai para o topo da saída. Como saiu por último, entra por primeiro: a ordem está sendo invertida.`,
        });
      }
    } else {
      reg({
        linha: 11,
        op: k,
        nota: `A saída ainda tem ${saida.length} ${saida.length === 1 ? "elemento" : "elementos"}, então não viro nada: o próximo da fila já está no topo dela.`,
      });
    }

    const v = saida.pop() as string;
    ops++;
    entregues++;
    ultimo = v;
    const custo = ops - opsAntes;
    reg({
      linha: 14,
      op: k,
      movendo: v,
      nota: `Desempilho ${v} da saída e devolvo. Foi o primeiro que entrou na fila, e saiu do topo de uma pilha: LIFO virado do avesso é FIFO. Este desenfileirar custou ${custo} ${
        custo === 1 ? "operação de pilha (o mínimo possível)" : "operações de pilha, porque pagou a virada"
      }.`,
    });
  }

  return out;
}

type Preset = { key: string; rotulo: string; roteiro: string };
const PRESETS: Preset[] = [
  { key: "tudo", rotulo: "Enche e esvazia", roteiro: "ABCD----" },
  { key: "misto", rotulo: "Intercalado", roteiro: "AB-C-D-" },
  { key: "duas", rotulo: "Duas viradas", roteiro: "ABC--DE--" },
  { key: "vazia", rotulo: "Esvazia demais", roteiro: "A--" },
];

const PADRAO = PRESETS[0];

// Custo amortizado: operações de pilha divididas por elemento que passou pela
// fila. Nunca passa de 4, que é o teto do truque (cada elemento é empurrado e
// retirado uma vez em cada pilha).
function media(ops: number, elementos: number): string {
  if (!elementos) return "-";
  const v = Math.round((ops / elementos) * 10) / 10;
  return v.toFixed(1).replace(".", ",");
}

export function QueueDuasPilhas() {
  const [roteiro, setRoteiro] = useState<Op[]>(roteiroDe(PADRAO.roteiro));
  const [preset, setPreset] = useState(PADRAO.key);
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const passos = useMemo(() => gerarPassos(roteiro), [roteiro]);
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

  const aplicarPreset = (pr: Preset) => {
    zerar();
    setPreset(pr.key);
    setRoteiro(roteiroDe(pr.roteiro));
  };
  const acrescentar = (op: Op) => {
    zerar();
    setPreset("");
    setRoteiro((r) => (r.length >= 16 ? r : [...r, op]));
  };
  const desfazer = () => {
    zerar();
    setPreset("");
    setRoteiro((r) => r.slice(0, -1));
  };

  const torre = (itens: string[], qual: "entrada" | "saida") => {
    const doTopoParaBaixo = [...itens].reverse();
    return (
      <div className="fila-torre">
        <div className="fila-torre-rot">{qual === "entrada" ? "entrada · só empilha" : "saída · só desempilha"}</div>
        <div className="fila-torre-corpo">
          {doTopoParaBaixo.length === 0 && <span className="fila-vazio">vazia</span>}
          {doTopoParaBaixo.map((v, i) => (
            <div key={`${v}-${i}`} className={`viz-cell${i === 0 ? " in" : ""}${p.movendo === v ? " entra" : ""}`}>
              {v}
            </div>
          ))}
        </div>
        <div className="fila-torre-base">{doTopoParaBaixo.length ? `topo: ${doTopoParaBaixo[0]}` : "sem topo"}</div>
      </div>
    );
  };

  const variaveis = [
    { nome: "entrada", valor: p.entrada.length ? p.entrada.join(" ") : "[]" },
    { nome: "saida", valor: p.saida.length ? p.saida.join(" ") : "[]" },
    { nome: "viradas", valor: `${p.viradas}` },
    { nome: "devolvido", valor: p.ultimo ?? "-", best: true },
  ];

  const estatisticas = [
    { k: "ops", rot: "operações de pilha", val: `${p.ops}` },
    { k: "ent", rot: "elementos entregues", val: `${p.entregues}` },
    { k: "med", rot: "operações por elemento", val: media(p.ops, p.enfileirados) },
    { k: "custo", rot: "custo do desenfileirar", val: "O(1) amortizado" },
  ];

  const notaCls = "viz-note" + (p.alerta ? " invalid" : idx === total - 1 ? " ok" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · fila com duas pilhas: a virada que inverte a ordem</span>
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
            </div>
          </div>
        </div>

        <div className="fila-roteiro">
          {roteiro.length === 0 && <span className="fila-vazio">roteiro vazio: use os botões acima</span>}
          {roteiro.map((o, i) => (
            <span key={i} className={`fila-op${i === p.op ? " on" : ""}${i < p.op ? " feito" : ""}`}>
              {o.tipo === "enq" ? `↓ ${o.valor}` : "↑ deq"}
            </span>
          ))}
        </div>

        <div className="fila-torres">
          {torre(p.entrada, "entrada")}
          <div className="fila-vira">
            <span>↻</span>
            <em>a virada só acontece quando a saída esvazia</em>
          </div>
          {torre(p.saida, "saida")}
        </div>

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">fila_com_duas_pilhas.py</div>
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
            <p className="fila-resumo">Nas duas pilhas, o topo é o primeiro item de cima para baixo.</p>
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
