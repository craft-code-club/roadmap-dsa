"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// TreeTraversalVisualizer, os quatro percursos sobre a MESMA árvore.
//
// A tese do tópico é que pré, em e pós-ordem são o mesmo caminho: muda só o
// instante em que o nó é processado. Para isso ficar visível, o visualizador
// mantém três painéis sincronizados no mesmo passo:
//
//   1. a árvore, com o nó atual, o caminho da raiz até ele e quem já saiu;
//   2. a estrutura auxiliar, que é PILHA no DFS e FILA no BFS (a diferença que
//      explica tudo: LIFO afunda, FIFO espalha);
//   3. a saída, que é a única coisa que muda entre os três DFS.
//
// O gerador é puro: simula a recursão com uma pilha explícita de quadros
// (nó + fase) em vez de recursão de verdade, porque é isso que permite emitir
// um passo por evento e navegar para frente e para trás de graça.
// ---------------------------------------------------------------------------

type No = { v: number; esq: number; dir: number };

type Ordem = "pre" | "in" | "pos" | "nivel";

type Passo = {
  no: number;
  aux: number[];        // pilha (DFS) ou fila (BFS), de baixo/frente para cima/trás
  saida: number[];
  linha: number;
  acao: "entra" | "processa" | "sobe" | "enfileira" | "fim";
  nota: string;
  ok?: boolean;
};

type Arvore = { key: string; rotulo: string; nos: No[]; raiz: number; legenda: string };

// A árvore do encontro: raiz 1, à esquerda o 2 (com 4 e 5), à direita o 3 (com 6).
// É a mesma que foi desenhada no quadro, e é dela que saem as quatro sequências
// que o artigo cita.
const ARVORES: Arvore[] = [
  {
    key: "encontro",
    rotulo: "A árvore do encontro",
    raiz: 0,
    legenda: "Pré: 1 2 4 5 3 6 · Em: 4 2 5 1 6 3 · Pós: 4 5 2 6 3 1 · Nível: 1 2 3 4 5 6",
    nos: [
      { v: 1, esq: 1, dir: 2 },
      { v: 2, esq: 3, dir: 4 },
      { v: 3, esq: 5, dir: -1 },
      { v: 4, esq: -1, dir: -1 },
      { v: 5, esq: -1, dir: -1 },
      { v: 6, esq: -1, dir: -1 },
    ],
  },
  {
    key: "bst",
    rotulo: "Uma BST: em ordem sai ordenado",
    raiz: 0,
    legenda: "A mesma máquina, outra arrumação dos valores. Rode em ordem.",
    nos: [
      { v: 4, esq: 1, dir: 2 },
      { v: 2, esq: 3, dir: 4 },
      { v: 5, esq: -1, dir: 5 },
      { v: 1, esq: -1, dir: -1 },
      { v: 3, esq: -1, dir: -1 },
      { v: 6, esq: -1, dir: -1 },
    ],
  },
  {
    key: "degenerada",
    rotulo: "Degenerada: a pilha vai ao fundo",
    raiz: 0,
    legenda: "Todo nó só tem filho à esquerda: a altura vira n e o O(h) do DFS vira O(n).",
    nos: [
      { v: 1, esq: 1, dir: -1 },
      { v: 2, esq: 2, dir: -1 },
      { v: 3, esq: 3, dir: -1 },
      { v: 4, esq: 4, dir: -1 },
      { v: 5, esq: 5, dir: -1 },
      { v: 6, esq: -1, dir: -1 },
    ],
  },
];

const CODIGO: Record<Ordem, string[]> = {
  pre: [
    "def percorre(no):",
    "    if no is None:",
    "        return",
    "    processa(no)          # PRÉ",
    "    percorre(no.esq)",
    "    percorre(no.dir)",
  ],
  in: [
    "def percorre(no):",
    "    if no is None:",
    "        return",
    "    percorre(no.esq)",
    "    processa(no)          # EM ORDEM",
    "    percorre(no.dir)",
  ],
  pos: [
    "def percorre(no):",
    "    if no is None:",
    "        return",
    "    percorre(no.esq)",
    "    percorre(no.dir)",
    "    processa(no)          # PÓS",
  ],
  nivel: [
    "def por_nivel(raiz):",
    "    fila = deque([raiz])",
    "    while fila:",
    "        no = fila.popleft()",
    "        processa(no)",
    "        if no.esq: fila.append(no.esq)",
    "        if no.dir: fila.append(no.dir)",
  ],
};

const ROTULO_ORDEM: Record<Ordem, string> = {
  pre: "Pré-ordem",
  in: "Em ordem",
  pos: "Pós-ordem",
  nivel: "Por nível (BFS)",
};

const ORDENS: Ordem[] = ["pre", "in", "pos", "nivel"];

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

// Geometria
const NO_R = 17;
const PASSO_X = 56;
const PASSO_Y = 62;
const MARGEM = 24;
const TOPO = 22;

type Pos = { x: number; prof: number };

// Layout por posição EM ORDEM: o x de cada nó é o índice dele no percurso em
// ordem, e o y é a profundidade. É o layout canônico de árvore binária e não
// tem sobreposição por construção, inclusive em nó com um filho só.
//
// O efeito colateral é didático de propósito: ler a árvore da esquerda para a
// direita na tela É o percurso em ordem. Numa BST, isso significa ler ordenado.
function posicionar(nos: No[], raiz: number): Pos[] {
  const pos: Pos[] = nos.map(() => ({ x: 0, prof: 0 }));
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

function gerarPassos(nos: No[], raiz: number, ordem: Ordem): Passo[] {
  const out: Passo[] = [];
  const saida: number[] = [];
  const nome = (id: number) => `${nos[id].v}`;

  if (ordem === "nivel") {
    const fila: number[] = [raiz];
    out.push({
      no: raiz, aux: [...fila], saida: [], linha: 1, acao: "enfileira",
      nota: `Começo com a raiz sozinha na fila. A fila é a única diferença estrutural entre o BFS e o DFS: ela devolve quem chegou primeiro, então o percurso espalha em vez de afundar.`,
    });
    let guarda = 0;
    while (fila.length && guarda++ < 200) {
      const id = fila.shift() as number;
      saida.push(id);
      const filhos = [nos[id].esq, nos[id].dir].filter((f) => f >= 0);
      out.push({
        no: id, aux: [...fila], saida: [...saida], linha: 4, acao: "processa",
        nota: `Tiro o ${nome(id)} da frente da fila e processo agora. Um nó só entra na fila depois do pai, então ninguém do próximo nível é processado antes de o nível atual terminar.`,
      });
      for (const f of filhos) {
        fila.push(f);
        out.push({
          no: f, aux: [...fila], saida: [...saida], linha: nos[id].esq === f ? 5 : 6, acao: "enfileira",
          nota: `O ${nome(f)} é filho do ${nome(id)}, então entra no FIM da fila. Ele vai esperar todo mundo que já estava lá, e é isso que mantém a leitura por níveis.`,
        });
      }
      if (!filhos.length) {
        out[out.length - 1] = {
          ...out[out.length - 1],
          nota: `${out[out.length - 1].nota} O ${nome(id)} é folha: não acrescenta ninguém à fila.`,
        };
      }
    }
    out.push({
      no: -1, aux: [], saida: [...saida], linha: 2, acao: "fim", ok: true,
      nota: `Fila vazia, percurso terminado: ${saida.map(nome).join(", ")}. Foram ${saida.length} nós, cada um processado uma vez, então o tempo é O(n). O espaço é o tamanho da fila no pior momento, que é o nível mais largo da árvore.`,
    });
    return out;
  }

  // DFS: pilha explícita de quadros, em vez de recursão de verdade, para poder
  // emitir um passo por evento e navegar para trás.
  //
  // `fase` conta quantos filhos já foram despachados (0, 1 ou 2) e `processado`
  // marca se o nó já saiu. É esse par que faz o MESMO laço servir para as três
  // ordens: muda só o valor de `alvo`, ou seja, em qual fase o nó é processado.
  //   pré  -> alvo 0 (antes de despachar a esquerda)
  //   em   -> alvo 1 (entre esquerda e direita)
  //   pós  -> alvo 2 (depois dos dois filhos)
  const alvo = ordem === "pre" ? 0 : ordem === "in" ? 1 : 2;
  const linhaProcessa = ordem === "pre" ? 3 : ordem === "in" ? 4 : 5;
  const linhaEsq = ordem === "pre" ? 4 : 3;
  const linhaDir = ordem === "pos" ? 4 : 5;
  const pilha: { id: number; fase: number; processado: boolean }[] = [
    { id: raiz, fase: 0, processado: false },
  ];
  const idsNaPilha = () => pilha.map((q) => q.id);

  out.push({
    no: raiz, aux: idsNaPilha(), saida: [], linha: 0, acao: "entra",
    nota: `Entro na raiz. No DFS a estrutura auxiliar é uma PILHA, e na versão recursiva ela é a própria pilha de chamadas do programa: cada nível que eu desço empilha um quadro.`,
  });

  let guarda = 0;
  while (pilha.length && guarda++ < 400) {
    const topo = pilha[pilha.length - 1];
    const no = nos[topo.id];

    if (!topo.processado && topo.fase === alvo) {
      saida.push(topo.id);
      topo.processado = true;
      const explica =
        ordem === "pre"
          ? `antes de olhar qualquer filho`
          : ordem === "in"
            ? `depois de resolver toda a subárvore esquerda e antes de tocar na direita`
            : `só depois que os dois filhos já saíram`;
      out.push({
        no: topo.id, aux: idsNaPilha(), saida: [...saida], linha: linhaProcessa, acao: "processa",
        nota: `Processo o ${nome(topo.id)} ${explica}. É a única linha que muda entre as três ordens, e é ela que decide a saída inteira.`,
      });
      continue;
    }

    if (topo.fase <= 1) {
      const filho = topo.fase === 0 ? no.esq : no.dir;
      const lado = topo.fase === 0 ? "esquerda" : "direita";
      topo.fase++;
      if (filho >= 0) {
        pilha.push({ id: filho, fase: 0, processado: false });
        out.push({
          no: filho, aux: idsNaPilha(), saida: [...saida], linha: lado === "esquerda" ? linhaEsq : linhaDir, acao: "entra",
          nota: `Desço para a ${lado} do ${nome(topo.id)} e entro no ${nome(filho)}. A pilha está com ${pilha.length} ${pilha.length === 1 ? "quadro" : "quadros"}: ela nunca passa da altura da árvore, e é por isso que o espaço do DFS é O(h), não O(n).`,
        });
      } else {
        out.push({
          no: topo.id, aux: idsNaPilha(), saida: [...saida], linha: 2, acao: "sobe",
          nota: `O ${nome(topo.id)} não tem filho à ${lado}: a chamada bate no caso base e volta na hora, sem empilhar nada.`,
        });
      }
      continue;
    }

    // fase 2 e já processado: desempilha
    pilha.pop();
    const pai = pilha.length ? nos[pilha[pilha.length - 1].id] : null;
    out.push({
      no: topo.id, aux: idsNaPilha(), saida: [...saida], linha: 5, acao: "sobe",
      nota: pai
        ? `Terminei o ${nome(topo.id)} e os dois filhos dele. Desempilho e volto para o pai, que continua exatamente de onde parou.`
        : `Desempilho a raiz: a pilha ficou vazia e o percurso acabou.`,
    });
  }

  out.push({
    no: -1, aux: [], saida: [...saida], linha: linhaProcessa, acao: "fim", ok: true,
    nota: `${ROTULO_ORDEM[ordem]}: ${saida.map(nome).join(", ")}. Foram ${saida.length} nós visitados uma vez cada, O(n) de tempo. O pico da pilha foi a altura da árvore, e não o número de nós.`,
  });
  return out;
}

export function TreeTraversalVisualizer() {
  const [arvoreKey, setArvoreKey] = useState("encontro");
  const [ordem, setOrdem] = useState<Ordem>("pre");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(4);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const arvore = useMemo(
    () => ARVORES.find((a) => a.key === arvoreKey) ?? ARVORES[0],
    [arvoreKey]
  );
  const pos = useMemo(() => posicionar(arvore.nos, arvore.raiz), [arvore]);
  const passos = useMemo(() => gerarPassos(arvore.nos, arvore.raiz, ordem), [arvore, ordem]);
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

  useEffect(() => {
    if (tocando && idx >= total - 1) setTocando(false);
  }, [tocando, idx, total]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const reiniciar = () => { parar(); setTocando(false); setPasso(0); };
  const trocarOrdem = (o: Ordem) => { reiniciar(); setOrdem(o); };
  const trocarArvore = (k: string) => { reiniciar(); setArvoreKey(k); };

  const maxSlot = pos.reduce((m, q) => Math.max(m, q.x), 0);
  const maxProf = pos.reduce((m, q) => Math.max(m, q.prof), 0);
  const W = MARGEM * 2 + maxSlot * PASSO_X + NO_R * 2;
  const H = TOPO * 2 + maxProf * PASSO_Y + NO_R * 2;
  const cx = (id: number) => MARGEM + NO_R + pos[id].x * PASSO_X;
  const cy = (id: number) => TOPO + NO_R + pos[id].prof * PASSO_Y;

  const jaSaiu = useMemo(() => new Set(p.saida), [p.saida]);
  const naAux = useMemo(() => new Set(p.aux), [p.aux]);

  const classeNo = (id: number) => {
    const cls = ["tt-no"];
    if (id === p.no) cls.push("on");
    if (jaSaiu.has(id)) cls.push("saiu");
    else if (naAux.has(id)) cls.push("aux");
    return cls.join(" ");
  };

  const ehBfs = ordem === "nivel";
  const codigo = CODIGO[ordem];
  const pctPasso = Math.round(((idx + 1) / total) * 100);
  const notaCls = "viz-note" + (p.ok ? " ok" : "");
  const picoAux = useMemo(() => passos.reduce((m, q) => Math.max(m, q.aux.length), 0), [passos]);

  const variaveis = [
    { nome: "nó atual", valor: p.no >= 0 ? `${arvore.nos[p.no].v}` : "-" },
    { nome: ehBfs ? "fila (tamanho)" : "pilha (altura)", valor: `${p.aux.length}` },
    { nome: "processados", valor: `${p.saida.length} de ${arvore.nos.length}`, best: true },
  ];

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · os quatro percursos sobre a mesma árvore</span>
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
          {ORDENS.map((o) => (
            <button
              key={o}
              className={`bigo-chip${ordem === o ? " on" : ""}`}
              onClick={() => trocarOrdem(o)}
              aria-pressed={ordem === o}
            >
              {ROTULO_ORDEM[o]}
            </button>
          ))}
        </div>
        <div className="bigo-chips" style={{ marginTop: 2 }}>
          {ARVORES.map((a) => (
            <button
              key={a.key}
              className={`bigo-chip${arvoreKey === a.key ? " on" : ""}`}
              onClick={() => trocarArvore(a.key)}
              aria-pressed={arvoreKey === a.key}
            >
              {a.rotulo}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">{arvore.legenda}</p>

        <div className="tt-arv-wrap">
          <svg
            className="tt-arv"
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`${ROTULO_ORDEM[ordem]} sobre ${arvore.rotulo}. Passo ${idx + 1} de ${total}. ${p.nota} Saída até aqui: ${p.saida.map((i) => arvore.nos[i].v).join(", ") || "vazia"}.`}
          >
            {arvore.nos.map((no, id) =>
              [no.esq, no.dir]
                .filter((f) => f >= 0)
                .map((f) => (
                  <line
                    key={`${id}-${f}`}
                    className={`tt-aresta${jaSaiu.has(f) || naAux.has(f) ? " on" : ""}`}
                    x1={cx(id)}
                    y1={cy(id) + NO_R}
                    x2={cx(f)}
                    y2={cy(f) - NO_R}
                  />
                ))
            )}
            {arvore.nos.map((no, id) => (
              <g key={id} className={classeNo(id)}>
                <circle cx={cx(id)} cy={cy(id)} r={NO_R} />
                <text x={cx(id)} y={cy(id) + 4} textAnchor="middle">{no.v}</text>
              </g>
            ))}
          </svg>
        </div>

        <div className="tt-paineis">
          <div className="tt-painel">
            <div className="tt-painel-tit">
              {ehBfs ? "Fila" : "Pilha"} <em>{ehBfs ? "sai pela frente (FIFO)" : "sai pelo topo (LIFO)"}</em>
            </div>
            <div className={`tt-aux${ehBfs ? " fila" : ""}`}>
              {p.aux.length === 0 ? (
                <span className="tt-vazio">vazia</span>
              ) : (
                p.aux.map((id, i) => (
                  <span key={`${id}-${i}`} className={`tt-aux-item${i === p.aux.length - 1 && !ehBfs ? " topo" : ""}${i === 0 && ehBfs ? " topo" : ""}`}>
                    {arvore.nos[id].v}
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="tt-painel">
            <div className="tt-painel-tit">
              Saída <em>{ROTULO_ORDEM[ordem]}</em>
            </div>
            <div className="tt-saida">
              {p.saida.length === 0 ? (
                <span className="tt-vazio">nada processado ainda</span>
              ) : (
                p.saida.map((id, i) => (
                  <span key={`${id}-${i}`} className={`tt-saida-item${i === p.saida.length - 1 ? " novo" : ""}`}>
                    {arvore.nos[id].v}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">{ehBfs ? "por_nivel.py" : "percorre.py"}</div>
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

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>nós na árvore</span>
            <strong>{arvore.nos.length}</strong>
          </div>
          <div className="bigo-stat">
            <span>altura</span>
            <strong>{maxProf + 1}</strong>
          </div>
          <div className="bigo-stat">
            <span>pico da {ehBfs ? "fila" : "pilha"}</span>
            <strong>{picoAux}</strong>
          </div>
          <div className="bigo-stat">
            <span>passos até o fim</span>
            <strong>{total}</strong>
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
        <div className="viz-progress"><div className="viz-progress-fill" style={{ width: `${pctPasso}%` }} /></div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Troque a ordem sem reiniciar a cabeça: o caminho pela árvore é sempre o mesmo, o que muda é
          a linha em que <code>processa(no)</code> aparece. No BFS muda a estrutura, e aí muda o caminho.
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
