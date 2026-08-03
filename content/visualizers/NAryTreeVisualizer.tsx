"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// NAryTreeVisualizer, o mesmo percurso quando os filhos viram lista.
//
// O tópico tem duas teses e este visualizador carrega as duas:
//
//   1. O template do DFS não muda de ideia, muda de laço: onde a árvore binária
//      escreve `percorre(no.esq); percorre(no.dir)`, a n-ária escreve
//      `for filho in no.filhos: percorre(filho)`. Pré e pós continuam existindo
//      e EM ORDEM morre, porque "o do meio" deixa de estar definido. O chip de
//      "em ordem" existe justamente para ser clicado e explicar a ausência.
//
//   2. Aumentar o grau achata a árvore. A tabela no fim mostra a altura de um
//      milhão de nós conforme o grau cresce, que é o argumento inteiro por trás
//      de B-tree e de índice de banco de dados.
//
// Gerador puro: monta a lista de passos com uma pilha explícita (DFS) ou uma
// fila (BFS), sem estado externo, para navegar nos dois sentidos de graça.
// ---------------------------------------------------------------------------

type No = { rot: string; filhos: number[] };
type Ordem = "pre" | "pos" | "nivel";

type Passo = {
  no: number;
  aux: number[];
  saida: number[];
  linha: number;
  nota: string;
  ok?: boolean;
};

type Arvore = { key: string; rotulo: string; nos: No[]; legenda: string };

// A árvore do encontro: a raiz com dois filhos, e cada um deles com três.
// A pré-ordem dela sai 1 a 9 na sequência, que foi como apareceu no quadro.
const ARVORES: Arvore[] = [
  {
    key: "encontro",
    rotulo: "A árvore do encontro",
    legenda: "Pré: 1 2 3 4 5 6 7 8 9 · Pós: 3 4 5 2 7 8 9 6 1 · Nível: 1 2 6 3 4 5 7 8 9",
    nos: [
      { rot: "1", filhos: [1, 5] },
      { rot: "2", filhos: [2, 3, 4] },
      { rot: "3", filhos: [] },
      { rot: "4", filhos: [] },
      { rot: "5", filhos: [] },
      { rot: "6", filhos: [6, 7, 8] },
      { rot: "7", filhos: [] },
      { rot: "8", filhos: [] },
      { rot: "9", filhos: [] },
    ],
  },
  {
    key: "arquivos",
    rotulo: "Uma árvore de diretórios",
    legenda: "O exemplo mais honesto de árvore n-ária: uma pasta tem quantos filhos quiser.",
    nos: [
      { rot: "/projeto", filhos: [1, 5, 8] },
      { rot: "src", filhos: [2, 3, 4] },
      { rot: "app.py", filhos: [] },
      { rot: "util.py", filhos: [] },
      { rot: "db.py", filhos: [] },
      { rot: "testes", filhos: [6, 7] },
      { rot: "test_app.py", filhos: [] },
      { rot: "test_db.py", filhos: [] },
      { rot: "README.md", filhos: [] },
    ],
  },
  {
    key: "dom",
    rotulo: "Uma árvore DOM",
    legenda: "HTML é uma árvore n-ária, e é por isso que querySelector é um percurso.",
    nos: [
      { rot: "html", filhos: [1, 2] },
      { rot: "head", filhos: [] },
      { rot: "body", filhos: [3, 4] },
      { rot: "header", filhos: [] },
      { rot: "main", filhos: [5, 6, 7] },
      { rot: "h1", filhos: [] },
      { rot: "p", filhos: [] },
      { rot: "ul", filhos: [8] },
      { rot: "li", filhos: [] },
    ],
  },
];

const CODIGO: Record<Ordem, string[]> = {
  pre: [
    "def percorre(no):",
    "    if no is None:",
    "        return",
    "    processa(no)              # PRÉ",
    "    for filho in no.filhos:  # era esq e dir",
    "        percorre(filho)",
  ],
  pos: [
    "def percorre(no):",
    "    if no is None:",
    "        return",
    "    for filho in no.filhos:  # era esq e dir",
    "        percorre(filho)",
    "    processa(no)              # PÓS",
  ],
  nivel: [
    "def por_nivel(raiz):",
    "    fila = deque([raiz])",
    "    while fila:",
    "        no = fila.popleft()",
    "        processa(no)",
    "        for filho in no.filhos:",
    "            fila.append(filho)",
  ],
};

const ROTULO_ORDEM: Record<Ordem, string> = {
  pre: "Pré-ordem",
  pos: "Pós-ordem",
  nivel: "Por nível (BFS)",
};

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

const PASSO_X = 96;
const PASSO_Y = 68;
const NO_L = 84;
const NO_A = 28;
const MARGEM = 14;
const TOPO = 16;

type Pos = { x: number; prof: number };

// Layout n-ário: cada folha ocupa um slot, cada nó interno senta no meio dos
// filhos. Serve para qualquer grau, ao contrário do layout por posição em
// ordem que a árvore binária usa (em ordem não existe aqui).
function posicionar(nos: No[]): Pos[] {
  const pos: Pos[] = nos.map(() => ({ x: 0, prof: 0 }));
  let slot = 0;
  const visita = (id: number, prof: number) => {
    pos[id].prof = prof;
    const f = nos[id].filhos;
    if (f.length === 0) { pos[id].x = slot++; return; }
    for (const c of f) visita(c, prof + 1);
    pos[id].x = (pos[f[0]].x + pos[f[f.length - 1]].x) / 2;
  };
  visita(0, 0);
  return pos;
}

function gerarPassos(nos: No[], ordem: Ordem): Passo[] {
  const out: Passo[] = [];
  const saida: number[] = [];
  const rot = (i: number) => nos[i].rot;

  if (ordem === "nivel") {
    const fila = [0];
    out.push({
      no: 0, aux: [...fila], saida: [], linha: 1,
      nota: `A fila começa com a raiz. O BFS não muda nada em árvore n-ária: onde a binária enfileirava dois filhos, aqui um for enfileira quantos existirem.`,
    });
    let guarda = 0;
    while (fila.length && guarda++ < 300) {
      const id = fila.shift() as number;
      saida.push(id);
      out.push({
        no: id, aux: [...fila], saida: [...saida], linha: 4,
        nota: `Processo ${rot(id)}, que estava na frente da fila. ${nos[id].filhos.length === 0 ? "É folha, não acrescenta ninguém." : `Agora enfileiro os ${nos[id].filhos.length} filhos dele, no fim da fila.`}`,
      });
      for (const f of nos[id].filhos) {
        fila.push(f);
        out.push({
          no: f, aux: [...fila], saida: [...saida], linha: 6,
          nota: `${rot(f)} entra no fim da fila. Ele só será processado depois de todo mundo que já estava lá, e é isso que mantém a leitura nível a nível.`,
        });
      }
    }
    out.push({
      no: -1, aux: [], saida: [...saida], linha: 2, ok: true,
      nota: `Por nível: ${saida.map(rot).join(", ")}. Cada nó entrou e saiu da fila uma vez, então o tempo é O(n) mesmo com grau qualquer.`,
    });
    return out;
  }

  const linhaProcessa = ordem === "pre" ? 3 : 5;
  const linhaFor = ordem === "pre" ? 5 : 4;
  const pilha: { id: number; i: number; processado: boolean }[] = [{ id: 0, i: 0, processado: false }];
  const idsNaPilha = () => pilha.map((q) => q.id);

  out.push({
    no: 0, aux: idsNaPilha(), saida: [], linha: 0,
    nota: `Entro na raiz. A pilha é a mesma da árvore binária: ela guarda o caminho da raiz até onde estou, nada mais.`,
  });

  let guarda = 0;
  while (pilha.length && guarda++ < 600) {
    const topo = pilha[pilha.length - 1];
    const filhos = nos[topo.id].filhos;

    // pré processa antes do laço; pós processa quando o laço terminou
    const naHora = ordem === "pre" ? topo.i === 0 : topo.i >= filhos.length;
    if (!topo.processado && naHora) {
      saida.push(topo.id);
      topo.processado = true;
      out.push({
        no: topo.id, aux: idsNaPilha(), saida: [...saida], linha: linhaProcessa,
        nota: ordem === "pre"
          ? `Processo ${rot(topo.id)} na chegada, antes de olhar qualquer filho. Com grau qualquer, "antes de todos os filhos" continua fazendo sentido.`
          : `Os ${filhos.length === 0 ? "zero" : filhos.length} ${filhos.length === 1 ? "filho" : "filhos"} de ${rot(topo.id)} já saíram, então agora processo ele. Pós-ordem é a que mais sobrevive à generalização: "depois de todos os filhos" é sempre bem definido.`,
      });
      continue;
    }

    if (topo.i < filhos.length) {
      const filho = filhos[topo.i];
      const posicao = topo.i + 1;
      topo.i++;
      pilha.push({ id: filho, i: 0, processado: false });
      out.push({
        no: filho, aux: idsNaPilha(), saida: [...saida], linha: linhaFor,
        nota: `Desço para o ${posicao}º de ${filhos.length} ${filhos.length === 1 ? "filho" : "filhos"} de ${rot(topo.id)}: entro em ${rot(filho)}. A pilha tem ${pilha.length} ${pilha.length === 1 ? "quadro" : "quadros"}, e continua limitada pela ALTURA, não pelo grau.`,
      });
      continue;
    }

    pilha.pop();
    out.push({
      no: topo.id, aux: idsNaPilha(), saida: [...saida], linha: 5,
      nota: pilha.length
        ? `Acabou o for de ${rot(topo.id)}: desempilho e volto para o pai, que retoma o laço dele de onde parou.`
        : `Desempilho a raiz. Percurso terminado.`,
    });
  }

  out.push({
    no: -1, aux: [], saida: [...saida], linha: linhaProcessa, ok: true,
    nota: `${ROTULO_ORDEM[ordem]}: ${saida.map(rot).join(", ")}. São ${saida.length} nós, cada um visitado uma vez: O(n) de tempo e O(altura) de pilha.`,
  });
  return out;
}

// Altura mínima de uma árvore de grau k com n nós: log base k de n.
// É a conta que justifica B-tree, e a razão de índice de banco ter grau alto.
function alturaPara(n: number, k: number): number {
  if (k < 2) return n;
  return Math.ceil(Math.log(n * (k - 1) + 1) / Math.log(k));
}
function num(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

const GRAUS = [2, 4, 8, 16, 64, 256];
const N_EXEMPLO = 1_000_000;

export function NAryTreeVisualizer() {
  const [arvoreKey, setArvoreKey] = useState("encontro");
  const [ordem, setOrdem] = useState<Ordem>("pre");
  const [semOrdem, setSemOrdem] = useState(false);
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(4);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const arvore = useMemo(() => ARVORES.find((a) => a.key === arvoreKey) ?? ARVORES[0], [arvoreKey]);
  const pos = useMemo(() => posicionar(arvore.nos), [arvore]);
  const passos = useMemo(() => gerarPassos(arvore.nos, ordem), [arvore, ordem]);
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
  const trocarOrdem = (o: Ordem) => { reiniciar(); setSemOrdem(false); setOrdem(o); };

  const maxSlot = pos.reduce((m, q) => Math.max(m, q.x), 0);
  const maxProf = pos.reduce((m, q) => Math.max(m, q.prof), 0);
  const W = MARGEM * 2 + maxSlot * PASSO_X + NO_L;
  const H = TOPO * 2 + maxProf * PASSO_Y + NO_A;
  const cx = (id: number) => MARGEM + NO_L / 2 + pos[id].x * PASSO_X;
  const cyTopo = (id: number) => TOPO + pos[id].prof * PASSO_Y;

  const jaSaiu = useMemo(() => new Set(p.saida), [p.saida]);
  const naAux = useMemo(() => new Set(p.aux), [p.aux]);
  const ehBfs = ordem === "nivel";
  const pctPasso = Math.round(((idx + 1) / total) * 100);
  const grauMax = arvore.nos.reduce((m, n) => Math.max(m, n.filhos.length), 0);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · o mesmo template quando os filhos viram uma lista</span>
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
          {(["pre", "pos", "nivel"] as Ordem[]).map((o) => (
            <button
              key={o}
              className={`bigo-chip${ordem === o && !semOrdem ? " on" : ""}`}
              onClick={() => trocarOrdem(o)}
              aria-pressed={ordem === o && !semOrdem}
            >
              {ROTULO_ORDEM[o]}
            </button>
          ))}
          <button
            className={`bigo-chip na${semOrdem ? " on" : ""}`}
            onClick={() => setSemOrdem((v) => !v)}
            aria-pressed={semOrdem}
          >
            Em ordem?
          </button>
        </div>

        {semOrdem && (
          <p className="viz-note invalid" style={{ marginTop: 10 }}>
            Em ordem não existe em árvore n-ária. A definição é "esquerda, eu, direita", e ela depende
            de haver exatamente dois lados. Com três filhos, onde entra o nó: depois do primeiro?
            do segundo? Não há resposta canônica, então o percurso simplesmente não é definido.
            Pré e pós sobrevivem porque "antes de todos os filhos" e "depois de todos os filhos"
            continuam bem definidos com qualquer grau.
          </p>
        )}

        <div className="bigo-chips" style={{ marginTop: 2 }}>
          {ARVORES.map((a) => (
            <button
              key={a.key}
              className={`bigo-chip${arvoreKey === a.key ? " on" : ""}`}
              onClick={() => { reiniciar(); setArvoreKey(a.key); }}
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
            aria-label={`${ROTULO_ORDEM[ordem]} sobre ${arvore.rotulo}. Passo ${idx + 1} de ${total}. ${p.nota}`}
          >
            {arvore.nos.map((no, id) =>
              no.filhos.map((f) => (
                <line
                  key={`${id}-${f}`}
                  className={`tt-aresta${jaSaiu.has(f) || naAux.has(f) ? " on" : ""}`}
                  x1={cx(id)}
                  y1={cyTopo(id) + NO_A}
                  x2={cx(f)}
                  y2={cyTopo(f)}
                />
              ))
            )}
            {arvore.nos.map((no, id) => {
              const cls = ["na-no"];
              if (id === p.no) cls.push("on");
              else if (jaSaiu.has(id)) cls.push("saiu");
              else if (naAux.has(id)) cls.push("aux");
              return (
                <g key={id} className={cls.join(" ")}>
                  <rect x={cx(id) - NO_L / 2} y={cyTopo(id)} width={NO_L} height={NO_A} rx={7} />
                  <text x={cx(id)} y={cyTopo(id) + 18} textAnchor="middle">{no.rot}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="tt-paineis">
          <div className="tt-painel">
            <div className="tt-painel-tit">
              {ehBfs ? "Fila" : "Pilha"} <em>{ehBfs ? "FIFO" : "LIFO, altura da árvore"}</em>
            </div>
            <div className="tt-aux">
              {p.aux.length === 0 ? <span className="tt-vazio">vazia</span> : p.aux.map((id, i) => (
                <span key={`${id}-${i}`} className={`tt-aux-item${(ehBfs ? i === 0 : i === p.aux.length - 1) ? " topo" : ""}`}>
                  {arvore.nos[id].rot}
                </span>
              ))}
            </div>
          </div>
          <div className="tt-painel">
            <div className="tt-painel-tit">Saída <em>{ROTULO_ORDEM[ordem]}</em></div>
            <div className="tt-saida">
              {p.saida.length === 0 ? <span className="tt-vazio">nada ainda</span> : p.saida.map((id, i) => (
                <span key={`${id}-${i}`} className={`tt-saida-item${i === p.saida.length - 1 ? " novo" : ""}`}>
                  {arvore.nos[id].rot}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className={"viz-note" + (p.ok ? " ok" : "")}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">{ehBfs ? "por_nivel.py" : "percorre.py"}</div>
            <div className="viz-code-body">
              {CODIGO[ordem].map((txt, i) => (
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
              <span className="viz-var-val">{p.no >= 0 ? arvore.nos[p.no].rot : "-"}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">{ehBfs ? "fila" : "pilha"}</span>
              <span className="viz-var-val">{p.aux.length}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">processados</span>
              <span className="viz-var-val best">{p.saida.length} de {arvore.nos.length}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">grau máximo</span>
              <span className="viz-var-val">{grauMax}</span>
            </div>
          </div>
        </div>

        <div className="rec-comp-wrap">
          <table className="rec-comp">
            <caption>Altura mínima para guardar {num(N_EXEMPLO)} nós, por grau</caption>
            <thead>
              <tr>
                <th>Grau (filhos por nó)</th>
                <th>Altura (nós lidos do disco)</th>
                <th>Comparações no total</th>
              </tr>
            </thead>
            <tbody>
              {GRAUS.map((k) => (
                <tr key={k} className={k === grauMax ? "on" : undefined}>
                  <td>{k}{k === grauMax ? " (o desta árvore)" : ""}</td>
                  <td>{alturaPara(N_EXEMPLO, k)}</td>
                  <td>~{num(alturaPara(N_EXEMPLO, k) * Math.ceil(Math.log2(k)))}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
          De grau 2 para grau 256, um milhão de nós sai de 20 níveis para 4. Repare na terceira
          coluna: o total de comparações quase não muda, porque você troca níveis por trabalho dentro
          do nó. O que despenca é o número de nós LIDOS, e ler nó é acesso a disco. É por isso que
          banco de dados guarda índice em B-tree, e não em árvore binária.
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
