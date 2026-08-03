"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// StackCallStackVisualizer, a mesma conta resolvida por duas pilhas: a call
// stack do interpretador (recursão) e uma pilha explícita escrita na mão.
//
// É o exercício que a comunidade fez no encontro: calcular 2³ de dois jeitos e
// provar que os passos são os mesmos. A única coisa que o aluno precisa ver:
// na recursão a pilha existe do mesmo jeito, ele só não a escreveu.
//
// Gerador PURO de passos, um por modo. Cada modo tem a sua constante de código,
// e o campo `linha` de cada passo aponta para o array daquele modo.
// ---------------------------------------------------------------------------

type Modo = "recursao" | "explicita";

type Frame = { rot: string; est: string; destaque?: "entra" | "sai" };

type Passo = {
  linha: number;
  pilha: Frame[];
  empilhados: number;
  alturaMax: number;
  topo: string;
  retorno: string;
  resultado: string;
  ok?: boolean;
  nota: string;
};

const CODIGO: Record<Modo, string[]> = {
  recursao: [
    "def potencia(x, n):",
    "    if n == 1:",
    "        return x",
    "    return x * potencia(x, n - 1)",
  ],
  explicita: [
    "def potencia(x, n):",
    "    pilha = []",
    "    for _ in range(n):",
    "        pilha.append(x)",
    "    resultado = 1",
    "    while pilha:",
    "        resultado *= pilha.pop()",
    "    return resultado",
  ],
};

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

function gerarRecursao(x: number, n: number): Passo[] {
  const out: Passo[] = [];
  const pilha: Frame[] = [];
  let empilhados = 0;
  let alturaMax = 0;

  const snap = (linha: number, nota: string, extra: Partial<Passo> = {}) => {
    out.push({
      linha,
      pilha: pilha.map((f) => ({ ...f })),
      empilhados,
      alturaMax,
      topo: pilha.length ? pilha[pilha.length - 1].rot : "vazia",
      retorno: "-",
      resultado: "-",
      nota,
      ...extra,
    });
  };

  for (let k = n; k >= 1; k--) {
    pilha.forEach((f) => { f.destaque = undefined; });
    pilha.push({ rot: `potencia(${x}, ${k})`, est: "acabou de entrar", destaque: "entra" });
    empilhados++;
    alturaMax = Math.max(alturaMax, pilha.length);
    snap(0, `Chamei potencia(${x}, ${k}): um frame novo entra no topo da pilha, com x = ${x} e n = ${k}.`);

    if (k > 1) {
      pilha[pilha.length - 1].destaque = undefined;
      pilha[pilha.length - 1].est = `parado, esperando potencia(${x}, ${k - 1})`;
      snap(1, `n = ${k} não é 1, então este frame ainda não sabe a resposta: ele precisa de potencia(${x}, ${k - 1}) antes de multiplicar. Fica parado na pilha, ocupando memória.`);
    }
  }

  // Caso base: o único frame que devolve valor sem chamar mais ninguém.
  let valor = x;
  pilha[pilha.length - 1].est = `caso base, devolve ${x}`;
  pilha[pilha.length - 1].destaque = "sai";
  snap(2, `n = 1, o caso base! Devolvo x = ${x} e desempilho este frame. A partir daqui a pilha se desfaz de cima para baixo.`, {
    retorno: `${valor}`,
  });
  pilha.pop();

  for (let k = 2; k <= n; k++) {
    const anterior = valor;
    valor = valor * x;
    pilha[pilha.length - 1].est = `recebeu ${anterior}, devolve ${valor}`;
    pilha[pilha.length - 1].destaque = "sai";
    snap(3, `O frame de n = ${k} estava esperando: recebi ${anterior}, multiplico por x = ${x} e devolvo ${valor}. Desempilho ele também.`, {
      retorno: `${valor}`,
    });
    pilha.pop();
  }

  snap(3, `Pilha vazia de novo: ${x}^${n} = ${valor}. Foram ${empilhados} ${empilhados === 1 ? "frame empilhado" : "frames empilhados"} e a profundidade máxima foi ${alturaMax}, ou seja, memória O(n).`, {
    ok: true,
    retorno: `${valor}`,
    resultado: `${valor}`,
  });
  return out;
}

function gerarExplicita(x: number, n: number): Passo[] {
  const out: Passo[] = [];
  const pilha: Frame[] = [];
  let empilhados = 0;
  let alturaMax = 0;
  let resultado = 1;

  const snap = (linha: number, nota: string, extra: Partial<Passo> = {}) => {
    out.push({
      linha,
      pilha: pilha.map((f) => ({ ...f })),
      empilhados,
      alturaMax,
      topo: pilha.length ? pilha[pilha.length - 1].rot : "vazia",
      retorno: "-",
      resultado: `${resultado}`,
      nota,
      ...extra,
    });
  };

  snap(1, `Crio a pilha vazia na mão. A ideia é a mesma da recursão, só que agora a pilha é um objeto meu, e não a call stack do interpretador.`, { resultado: "-" });

  for (let k = 1; k <= n; k++) {
    pilha.forEach((f) => { f.destaque = undefined; });
    pilha.push({ rot: `${x}`, est: `cópia ${k} da base`, destaque: "entra" });
    empilhados++;
    alturaMax = Math.max(alturaMax, pilha.length);
    snap(3, `Empilho mais uma cópia da base x = ${x}. A pilha tem ${pilha.length} ${pilha.length === 1 ? "item" : "itens"}, e ainda não multipliquei nada.`, { resultado: "-" });
  }

  pilha.forEach((f) => { f.destaque = undefined; });
  snap(4, `Todas as ${n} cópias empilhadas. Começo o resultado em 1 e agora vou desempilhando e multiplicando.`);

  for (let k = 1; k <= n; k++) {
    const antes = resultado;
    resultado = resultado * x;
    pilha[pilha.length - 1].destaque = "sai";
    pilha[pilha.length - 1].est = `saindo: ${antes} × ${x} = ${resultado}`;
    snap(6, `Desempilho o topo: resultado = ${antes} × ${x} = ${resultado}. Sobra${pilha.length - 1 === 1 ? "" : "m"} ${pilha.length - 1} na pilha.`);
    pilha.pop();
  }

  snap(7, `Pilha vazia: ${x}^${n} = ${resultado}. Mesmo resultado, mesma altura máxima (${alturaMax}) e os mesmos ${empilhados} empilhamentos da versão recursiva.`, { ok: true });
  return out;
}

const MODOS: { key: Modo; rotulo: string }[] = [
  { key: "recursao", rotulo: "Recursão (call stack)" },
  { key: "explicita", rotulo: "Pilha explícita" },
];

const X_PADRAO = 2;
const N_PADRAO = 3;

function limitar(v: string, min: number, max: number, padrao: number): number {
  const k = parseInt(v, 10);
  if (isNaN(k)) return padrao;
  return Math.min(max, Math.max(min, k));
}

export function StackCallStackVisualizer() {
  const [modo, setModo] = useState<Modo>("recursao");
  const [x, setX] = useState(X_PADRAO);
  const [n, setN] = useState(N_PADRAO);
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const passos = useMemo(
    () => (modo === "recursao" ? gerarRecursao(x, n) : gerarExplicita(x, n)),
    [modo, x, n]
  );
  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];
  const codigo = CODIGO[modo];

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

  const trocar = (fn: () => void) => { parar(); setTocando(false); setPasso(0); fn(); };

  const torre = [...p.pilha].reverse();

  const variaveis =
    modo === "recursao"
      ? [
          { nome: "topo", valor: p.topo },
          { nome: "frames", valor: `${p.pilha.length}` },
          { nome: "return", valor: p.retorno },
          { nome: `${x}^${n}`, valor: p.resultado, best: !!p.ok },
        ]
      : [
          { nome: "topo", valor: p.topo },
          { nome: "len(pilha)", valor: `${p.pilha.length}` },
          { nome: "resultado", valor: p.resultado },
          { nome: `${x}^${n}`, valor: p.ok ? p.resultado : "-", best: !!p.ok },
        ];

  const estatisticas = [
    { k: "n", rot: "expoente (n)", val: `${n}` },
    { k: "alt", rot: "altura máxima da pilha", val: `${p.alturaMax}` },
    { k: "emp", rot: "empilhamentos", val: `${p.empilhados}` },
    { k: "esp", rot: "memória extra", val: "O(n)" },
  ];

  const notaCls = "viz-note" + (p.ok ? " ok" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · a mesma potência com duas pilhas</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">passo {idx + 1} de {total}</span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "✕ Fechar" : "⤢ Expandir"}
          </button>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          {MODOS.map((m) => (
            <button
              key={m.key}
              className={`bigo-chip${modo === m.key ? " on" : ""}`}
              onClick={() => trocar(() => setModo(m.key))}
              aria-pressed={modo === m.key}
            >
              {m.rotulo}
            </button>
          ))}
        </div>

        <div className="viz-inputs">
          <label className="viz-field">
            <span>base x</span>
            <input
              className="viz-input k"
              type="number"
              min={1}
              max={9}
              value={x}
              onChange={(e) => trocar(() => setX(limitar(e.target.value, 1, 9, X_PADRAO)))}
            />
          </label>
          <label className="viz-field">
            <span>expoente n</span>
            <input
              className="viz-input k"
              type="number"
              min={1}
              max={8}
              value={n}
              onChange={(e) => trocar(() => setN(limitar(e.target.value, 1, 8, N_PADRAO)))}
            />
          </label>
          <button className="viz-btn" onClick={() => trocar(() => { setX(X_PADRAO); setN(N_PADRAO); })}>
            ↺ Voltar ao 2³
          </button>
        </div>

        <div className="pl-arena larga">
          <div className="pl-col">
            <span className="pl-lbl">
              {modo === "recursao" ? "O que a call stack está fazendo" : "O que a pilha está fazendo"}
            </span>
            <p className={notaCls}>{p.nota}</p>
            <div className="bigo-stats">
              {estatisticas.map((s) => (
                <div className="bigo-stat" key={s.k}>
                  <span>{s.rot}</span>
                  <strong>{s.val}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="pl-col">
            <span className="pl-lbl">
              {modo === "recursao" ? "Call stack (topo em cima)" : "Pilha (topo em cima)"}
            </span>
            <div className="pl-torre">
              {torre.length ? (
                torre.map((f, k) => (
                  <div
                    key={`${f.rot}-${torre.length - k}`}
                    className={`pl-item bloco${k === 0 ? " topo" : ""}${f.destaque ? ` ${f.destaque}` : ""}`}
                  >
                    <span className="pl-frame-nome">{f.rot}</span>
                    <span className="pl-frame-est">{f.est}</span>
                  </div>
                ))
              ) : (
                <p className="pl-vazia">pilha vazia</p>
              )}
              <div className="pl-base">base da pilha</div>
            </div>
          </div>
        </div>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">{modo === "recursao" ? "recursivo.py" : "com_pilha.py"}</div>
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
          </div>
        </div>

        <div className="viz-controls">
          <button className="viz-btn" title="Reiniciar" onClick={() => { parar(); setTocando(false); setPasso(0); }}>↺</button>
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
        <div className="viz-progress"><div className="viz-progress-fill" style={{ width: `${pctPasso}%` }} /></div>
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
