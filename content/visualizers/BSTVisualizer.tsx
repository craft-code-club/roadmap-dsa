"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// BSTVisualizer, a invariante construindo e pagando a árvore.
//
// A BST tem uma promessa (busca em O(log n)) e uma letra miúda (só se a árvore
// ficar baixa). Os dois lados moram aqui:
//
//   - modo INSERIR: a árvore nasce valor a valor, e cada valor desce comparando.
//     Trocar o preset de "pelo meio" para "ordenado" faz a mesma sequência de
//     números produzir uma linha reta. É a degeneração acontecendo na tela.
//   - modo BUSCAR: o caminho da busca acende, e o contador compara o número de
//     passos com a varredura linear que a BST está tentando substituir.
//
// Gerador puro em cima de uma árvore imutável reconstruída a cada passo? Não:
// a árvore é construída uma vez (determinística, mesma entrada, mesmo shape) e
// os passos só apontam para nós dela. Navegar para trás fica de graça.
// ---------------------------------------------------------------------------

type No = { v: number; esq: number; dir: number };

type Passo = {
  no: number;          // nó em foco
  caminho: number[];   // da raiz até o foco
  visiveis: number;    // quantos nós já foram inseridos
  linha: number;
  nota: string;
  ok?: boolean;
  falha?: boolean;
};

type Modo = "inserir" | "buscar";

const CODIGO_INSERIR = [
  "def insere(no, valor):",
  "    if no is None:",
  "        return No(valor)      # nasce sempre como folha",
  "    if valor < no.valor:",
  "        no.esq = insere(no.esq, valor)",
  "    else:",
  "        no.dir = insere(no.dir, valor)",
  "    return no",
];

const CODIGO_BUSCAR = [
  "def busca(no, alvo):",
  "    while no is not None:",
  "        if alvo == no.valor:",
  "            return no          # achei",
  "        if alvo < no.valor:",
  "            no = no.esq        # metade de baixo",
  "        else:",
  "            no = no.dir        # metade de cima",
  "    return None                # não existe",
];

type Preset = { key: string; rotulo: string; ordem: number[]; dica: string };

const PRESETS: Preset[] = [
  {
    key: "meio",
    rotulo: "Inserindo pelo meio: 4 2 6 1 3 5 7",
    ordem: [4, 2, 6, 1, 3, 5, 7],
    dica: "Cada valor cai num lado diferente e a árvore fica perfeita: altura 3 para 7 nós.",
  },
  {
    key: "ordenado",
    rotulo: "Inserindo ordenado: 1 2 3 4 5 6 7",
    ordem: [1, 2, 3, 4, 5, 6, 7],
    dica: "Os MESMOS sete valores. Como cada um é maior que todos os anteriores, ninguém vai para a esquerda: a árvore vira uma lista de altura 7.",
  },
  {
    key: "tipico",
    rotulo: "Um caso típico: 50 30 70 20 40 60 80",
    ordem: [50, 30, 70, 20, 40, 60, 80],
    dica: "O formato que todo material desenha, e o que você deve esperar de dados razoavelmente embaralhados.",
  },
  {
    key: "quase",
    rotulo: "Quase ordenado: 3 1 2 4 5 6 7",
    ordem: [3, 1, 2, 4, 5, 6, 7],
    dica: "Basta a cauda vir ordenada para a árvore pender para um lado. Degeneração não é tudo ou nada.",
  },
];

// Constrói a BST inserindo na ordem dada. Determinístico: mesma ordem, mesma
// árvore, o que é justamente a propriedade que o modo "ordenado" explora.
function construir(ordem: number[]): { nos: No[]; raiz: number } {
  const nos: No[] = [];
  let raiz = -1;
  for (const v of ordem) {
    const novo = nos.length;
    nos.push({ v, esq: -1, dir: -1 });
    if (raiz < 0) { raiz = novo; continue; }
    let cur = raiz;
    let guarda = 0;
    while (guarda++ < 200) {
      if (v < nos[cur].v) {
        if (nos[cur].esq < 0) { nos[cur].esq = novo; break; }
        cur = nos[cur].esq;
      } else {
        if (nos[cur].dir < 0) { nos[cur].dir = novo; break; }
        cur = nos[cur].dir;
      }
    }
  }
  return { nos, raiz };
}

function passosInserir(ordem: number[], nos: No[], raiz: number): Passo[] {
  const out: Passo[] = [];
  const idDe = new Map<number, number>();
  nos.forEach((n, i) => { if (!idDe.has(n.v)) idDe.set(n.v, i); });

  for (let k = 0; k < ordem.length; k++) {
    const v = ordem[k];
    const alvo = idDe.get(v) as number;
    if (k === 0) {
      out.push({
        no: alvo, caminho: [alvo], visiveis: 1, linha: 2,
        nota: `A árvore estava vazia, então ${v} vira a raiz. Todo valor que entrar depois será comparado com ele primeiro.`,
      });
      continue;
    }
    const caminho: number[] = [];
    let cur = raiz;
    let guarda = 0;
    while (cur >= 0 && cur !== alvo && guarda++ < 200) {
      caminho.push(cur);
      const paraEsq = v < nos[cur].v;
      out.push({
        no: cur, caminho: [...caminho], visiveis: k, linha: paraEsq ? 4 : 6,
        nota: `Onde ${v} mora? Comparo com ${nos[cur].v}: ${v} ${paraEsq ? "<" : ">"} ${nos[cur].v}, então desço para a ${paraEsq ? "esquerda" : "direita"}. A invariante não deixa dúvida: só existe um caminho possível.`,
      });
      cur = paraEsq ? nos[cur].esq : nos[cur].dir;
    }
    caminho.push(alvo);
    out.push({
      no: alvo, caminho: [...caminho], visiveis: k + 1, linha: 2,
      nota: `Cheguei num ponto vazio, então ${v} nasce aqui, como FOLHA. Inserção em BST nunca mexe no meio da árvore: ela só pendura na ponta do caminho de busca, e por isso custa o mesmo que buscar.`,
    });
  }

  const alt = altura(nos, raiz);
  out.push({
    no: -1, caminho: [], visiveis: nos.length, linha: 7, ok: true,
    nota: `Árvore montada: ${nos.length} nós, altura ${alt}. A altura mínima possível para ${nos.length} nós é ${Math.ceil(Math.log2(nos.length + 1))}. ${alt === Math.ceil(Math.log2(nos.length + 1)) ? "Esta ficou no mínimo: é o melhor caso." : `Esta ficou ${alt - Math.ceil(Math.log2(nos.length + 1))} ${alt - Math.ceil(Math.log2(nos.length + 1)) === 1 ? "nível" : "níveis"} acima do mínimo, e cada nível extra é uma comparação a mais em TODA busca daqui para frente.`}`,
  });
  return out;
}

function passosBuscar(alvo: number, nos: No[], raiz: number): Passo[] {
  const out: Passo[] = [];
  const caminho: number[] = [];
  let cur = raiz;
  let guarda = 0;
  while (cur >= 0 && guarda++ < 200) {
    caminho.push(cur);
    if (nos[cur].v === alvo) {
      out.push({
        no: cur, caminho: [...caminho], visiveis: nos.length, linha: 3, ok: true,
        nota: `Achei ${alvo} em ${caminho.length} ${caminho.length === 1 ? "comparação" : "comparações"}. Uma varredura linear teria olhado até ${nos.length} elementos: é essa a troca que a BST oferece.`,
      });
      return out;
    }
    const paraEsq = alvo < nos[cur].v;
    out.push({
      no: cur, caminho: [...caminho], visiveis: nos.length, linha: paraEsq ? 5 : 7,
      nota: `${alvo} ${paraEsq ? "<" : ">"} ${nos[cur].v}, então vou para a ${paraEsq ? "esquerda" : "direita"} e DESCARTO a outra subárvore inteira sem olhar. É a mesma jogada da busca binária, e é daqui que sai o log.`,
    });
    cur = paraEsq ? nos[cur].esq : nos[cur].dir;
  }
  out.push({
    no: -1, caminho: [...caminho], visiveis: nos.length, linha: 8, falha: true,
    nota: `Cheguei num ponto vazio: ${alvo} não está na árvore. Foram ${caminho.length} ${caminho.length === 1 ? "comparação" : "comparações"}, e repare que o caminho percorrido é exatamente onde ${alvo} SERIA inserido. Buscar e inserir são o mesmo passeio.`,
  });
  return out;
}

function altura(nos: No[], id: number): number {
  if (id < 0) return 0;
  return 1 + Math.max(altura(nos, nos[id].esq), altura(nos, nos[id].dir));
}

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];
const NO_R = 17;
const PASSO_X = 54;
const PASSO_Y = 58;
const MARGEM = 22;
const TOPO = 20;

function posicionar(nos: No[], raiz: number) {
  const pos = nos.map(() => ({ x: 0, prof: 0 }));
  let slot = 0;
  const visita = (id: number, prof: number) => {
    if (id < 0) return;
    visita(nos[id].esq, prof + 1);
    pos[id] = { x: slot++, prof };
    visita(nos[id].dir, prof + 1);
  };
  visita(raiz, 0);
  return pos;
}

export function BSTVisualizer() {
  const [presetKey, setPresetKey] = useState("meio");
  const [modo, setModo] = useState<Modo>("inserir");
  const [alvo, setAlvo] = useState(7);
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(4);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const { nos, raiz } = useMemo(() => construir(preset.ordem), [preset]);
  const pos = useMemo(() => posicionar(nos, raiz), [nos, raiz]);
  const passos = useMemo(
    () => (modo === "inserir" ? passosInserir(preset.ordem, nos, raiz) : passosBuscar(alvo, nos, raiz)),
    [modo, preset, nos, raiz, alvo]
  );
  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];

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
  useEffect(() => { if (tocando && idx >= total - 1) setTocando(false); }, [tocando, idx, total]);
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const reiniciar = () => { parar(); setTocando(false); setPasso(0); };
  const trocarPreset = (k: string) => { reiniciar(); setPresetKey(k); };
  const trocarModo = (m: Modo) => { reiniciar(); setModo(m); };

  const alt = altura(nos, raiz);
  const altMin = Math.ceil(Math.log2(nos.length + 1));
  const maxSlot = pos.reduce((m, q) => Math.max(m, q.x), 0);
  const maxProf = pos.reduce((m, q) => Math.max(m, q.prof), 0);
  const W = MARGEM * 2 + maxSlot * PASSO_X + NO_R * 2;
  const H = TOPO * 2 + maxProf * PASSO_Y + NO_R * 2;
  const cx = (id: number) => MARGEM + NO_R + pos[id].x * PASSO_X;
  const cy = (id: number) => TOPO + NO_R + pos[id].prof * PASSO_Y;

  const noCaminho = useMemo(() => new Set(p.caminho), [p.caminho]);
  const comparacoes = p.caminho.length;
  const pctPasso = Math.round(((idx + 1) / total) * 100);
  const valoresOrdenados = useMemo(() => [...preset.ordem].sort((a, b) => a - b), [preset]);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · a invariante da BST, construindo e cobrando</span>
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
          {PRESETS.map((pr) => (
            <button key={pr.key} className={`bigo-chip${presetKey === pr.key ? " on" : ""}`} onClick={() => trocarPreset(pr.key)} aria-pressed={presetKey === pr.key}>
              {pr.rotulo}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">{preset.dica}</p>

        <div className="viz-inputs">
          <div className="viz-field">
            <span>O que mostrar</span>
            <div className="sub-modo">
              <button className={`sub-modo-btn${modo === "inserir" ? " on" : ""}`} onClick={() => trocarModo("inserir")} aria-pressed={modo === "inserir"}>
                construir
              </button>
              <button className={`sub-modo-btn${modo === "buscar" ? " on" : ""}`} onClick={() => trocarModo("buscar")} aria-pressed={modo === "buscar"}>
                buscar
              </button>
            </div>
          </div>
          {modo === "buscar" && (
            <label className="viz-field">
              <span>Procurar</span>
              <input
                className="viz-input k"
                type="number"
                value={alvo}
                onChange={(e) => { reiniciar(); setAlvo(parseInt(e.target.value, 10) || 0); }}
              />
            </label>
          )}
        </div>

        <div className="tt-arv-wrap">
          <svg
            className="tt-arv"
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Árvore de busca binária com ${nos.length} nós e altura ${alt}. ${p.nota}`}
          >
            {nos.map((no, id) =>
              [no.esq, no.dir]
                .filter((f) => f >= 0 && f < p.visiveis)
                .map((f) => (
                  <line
                    key={`${id}-${f}`}
                    className={`tt-aresta${noCaminho.has(f) && noCaminho.has(id) ? " on" : ""}`}
                    x1={cx(id)} y1={cy(id) + NO_R} x2={cx(f)} y2={cy(f) - NO_R}
                  />
                ))
            )}
            {nos.map((no, id) => {
              if (id >= p.visiveis) return null;
              const cls = ["tt-no", "bst-no"];
              if (id === p.no) cls.push("on");
              else if (noCaminho.has(id)) cls.push("caminho");
              return (
                <g key={id} className={cls.join(" ")}>
                  <circle cx={cx(id)} cy={cy(id)} r={NO_R} />
                  <text x={cx(id)} y={cy(id) + 4} textAnchor="middle">{no.v}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <p className={"viz-note" + (p.ok ? " ok" : p.falha ? " invalid" : "")}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">{modo === "inserir" ? "insere.py" : "busca.py"}</div>
            <div className="viz-code-body">
              {(modo === "inserir" ? CODIGO_INSERIR : CODIGO_BUSCAR).map((txt, i) => (
                <div key={i} className={`viz-line${i === p.linha ? " on" : ""}`}>
                  <span className="ln">{i + 1}</span>
                  {txt}
                </div>
              ))}
            </div>
          </div>
          <div className="viz-vars">
            <div className="viz-vars-head">Variáveis</div>
            <div className="viz-var">
              <span className="viz-var-name">nó atual</span>
              <span className="viz-var-val">{p.no >= 0 ? nos[p.no].v : "vazio"}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">comparações</span>
              <span className="viz-var-val best">{comparacoes}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">varredura linear</span>
              <span className="viz-var-val">{nos.length}</span>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat"><span>nós</span><strong>{nos.length}</strong></div>
          <div className="bigo-stat"><span>altura</span><strong>{alt}</strong></div>
          <div className="bigo-stat"><span>altura mínima</span><strong>{altMin}</strong></div>
          <div className="bigo-stat"><span>pior busca</span><strong>{alt} comparações</strong></div>
        </div>

        <div className="bt-array-bloco">
          <div className="tt-painel-tit">
            Percurso em ordem <em>esquerda, eu, direita</em>
          </div>
          <div className="bt-array">
            {valoresOrdenados.map((v) => (
              <span key={v} className="bt-cel" style={{ paddingTop: 0 }}>{v}</span>
            ))}
          </div>
          <p className="bt-array-nota">
            Independente da ordem em que você inseriu, e independente do formato que a árvore tomou,
            o percurso em ordem devolve esta mesma sequência crescente. A forma muda o custo, nunca o
            conteúdo.
          </p>
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
        <div className="viz-progress"><div className="viz-progress-fill" style={{ width: `${pctPasso}%` }} /></div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Compare os dois primeiros presets: mesmos sete valores, mesma invariante, mesmo código.
          Só a ORDEM de inserção muda, e com ela a altura vai de 3 para 7. A BST não protege
          você de dado ordenado, e é por isso que existem árvores balanceadas.
        </p>
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
