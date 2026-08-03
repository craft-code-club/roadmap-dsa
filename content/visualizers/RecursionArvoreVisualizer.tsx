"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// RecursionArvoreVisualizer, a árvore de chamadas do Fibonacci.
//
// Enquanto o RecursionVisualizer mostra a pilha (uma coluna por vez), aqui o
// palco é a árvore inteira: cada chamada vira um nó, e o aluno VÊ o mesmo
// fib(k) sendo recalculado de novo e de novo. Os nós repetidos ficam em cor
// própria justamente para o retrabalho parar de ser um argumento e virar
// desenho.
//
// O gerador é puro: monta a árvore inteira em pré-ordem (que é exatamente a
// ordem das chamadas) e depois só revela um nó por passo. Como a pré-ordem já
// coloca a subárvore de um nó em posições contíguas, o índice do último
// descendente (`fim`) diz de graça em que passo o valor daquele nó fica
// pronto: nada de estado externo.
//
// Com o cache ligado, um fib(k) já calculado vira folha roxa e poda a
// subárvore inteira. É a mesma função, e a contagem sai de 21.891 chamadas
// para 39 em fib(20).
// ---------------------------------------------------------------------------

type Tipo = "base" | "expande" | "memo";

type No = {
  id: number;
  k: number;
  prof: number;
  pai: number | null;
  filhos: number[];
  tipo: Tipo;
  valor: number;
  repetido: boolean;
  fim: number; // índice do último nó da subárvore em pré-ordem
  x: number;   // slot horizontal (em unidades de PASSO_X)
};

type Passo = {
  no: number;      // -1 no passo final
  linha: number;
  repetidas: number;
  podadas: number;
  nota: string;
  ok?: boolean;
  erro?: boolean;
};

const CODIGO_INGENUO = [
  "def fib(n):",
  "    if n <= 1:",
  "        return n",
  "    return fib(n - 1) + fib(n - 2)",
];

const CODIGO_MEMO = [
  "memo = {}",
  "",
  "def fib(n):",
  "    if n <= 1:",
  "        return n",
  "    if n in memo:",
  "        return memo[n]",
  "    memo[n] = fib(n - 1) + fib(n - 2)",
  "    return memo[n]",
];

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

// Geometria da árvore. O SVG rola dentro do próprio container quando fica mais
// largo que a tela, então dá para abrir n = 8 sem a página rolar na horizontal.
const NO_L = 46;
const NO_A = 34;
const PASSO_X = 52;
const PASSO_Y = 52;
const MARGEM = 16;
const TOPO = 14;

// Formatação determinística (nada de Intl, para o HTML do servidor bater com o
// do cliente na hidratação).
function num(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function fibNum(n: number): number {
  let a = 0;
  let b = 1;
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
}

// Contagem EXATA de chamadas do fib recursivo ingênuo: T(n) = 2·fib(n+1) - 1.
// (T(0) = T(1) = 1, T(n) = 1 + T(n-1) + T(n-2).)
function chamadasIngenuo(n: number): number {
  return 2 * fibNum(n + 1) - 1;
}

// Com memoização top-down cada k acima de 1 é expandido uma vez só e acerta o
// cache uma vez: T(n) = 2n - 1 para n >= 2.
function chamadasMemo(n: number): number {
  return n <= 1 ? 1 : 2 * n - 1;
}

function construir(n0: number, comMemo: boolean): No[] {
  const nos: No[] = [];
  const memo = new Map<number, number>();
  const jaVisto = new Set<number>();

  const visita = (k: number, pai: number | null, prof: number): number => {
    const id = nos.length;
    const no: No = {
      id, k, prof, pai, filhos: [], tipo: "expande", valor: 0,
      repetido: jaVisto.has(k), fim: id, x: 0,
    };
    nos.push(no);

    if (k <= 1) {
      no.tipo = "base";
      no.valor = k;
    } else if (comMemo && memo.has(k)) {
      no.tipo = "memo";
      no.valor = memo.get(k) as number;
    } else if (nos.length < 400) {
      const a = visita(k - 1, id, prof + 1);
      const b = visita(k - 2, id, prof + 1);
      no.filhos = [a, b];
      no.valor = nos[a].valor + nos[b].valor;
      if (comMemo) memo.set(k, no.valor);
    }

    jaVisto.add(k);
    no.fim = nos.length - 1;
    return id;
  };

  visita(n0, null, 0);

  // Layout: cada folha ganha um slot, cada nó interno senta no meio dos filhos.
  let slot = 0;
  const posicionar = (id: number) => {
    const no = nos[id];
    if (no.filhos.length === 0) { no.x = slot++; return; }
    posicionar(no.filhos[0]);
    posicionar(no.filhos[1]);
    no.x = (nos[no.filhos[0]].x + nos[no.filhos[1]].x) / 2;
  };
  posicionar(0);

  return nos;
}

function gerarPassos(nos: No[], n0: number, comMemo: boolean): Passo[] {
  const out: Passo[] = [];
  let repetidas = 0;
  let podadas = 0;
  let primeiraBase = true;

  for (const no of nos) {
    if (no.repetido) repetidas++;
    let linha: number;
    let nota: string;

    if (no.tipo === "base") {
      linha = comMemo ? 4 : 2;
      if (no.repetido) {
        nota = comMemo
          ? `fib(${no.k}) outra vez. O caso base é testado ANTES do cache, então fib(1) e fib(0) continuam sendo recalculados: são as únicas repetições que a memoização não elimina.`
          : `fib(${no.k}) de novo. É caso base, então custa uma chamada só, mas repare quantas folhas iguais a esta a árvore já acumulou.`;
      } else if (primeiraBase) {
        nota = `fib(${no.k}) bate no caso base: devolvo ${no.k} na hora, sem chamar mais ninguém. É a primeira resposta concreta da execução inteira.`;
        primeiraBase = false;
      } else {
        nota = `fib(${no.k}) também é caso base: devolvo ${no.k} direto. Com os dois casos base resolvidos, o nó de cima já consegue somar.`;
      }
    } else if (no.tipo === "memo") {
      linha = 6;
      // Comparação honesta: o ramo que a versão INGÊNUA teria que refazer aqui.
      // (Com o cache ligado, reexpandir fib(k) custaria só mais 2 chamadas,
      // porque fib(k-1) e fib(k-2) já estariam guardados.)
      const evitadas = chamadasIngenuo(no.k) - 1;
      podadas++;
      nota = `fib(${no.k}) já está no cache valendo ${num(no.valor)}. Devolvo na hora e podo a subárvore inteira: sem cache, este mesmo ramo custaria ${num(evitadas)} ${evitadas === 1 ? "chamada" : "chamadas"} abaixo dele.`;
    } else {
      linha = comMemo ? 7 : 3;
      const tam = no.fim - no.id + 1;
      nota = no.repetido
        ? `fib(${no.k}) outra vez, e sem cache eu não tenho como saber disso. Vou refazer a subárvore inteira, mais ${num(tam - 1)} ${tam - 1 === 1 ? "chamada" : "chamadas"}, para chegar de novo no mesmo ${num(no.valor)}.`
        : `Entro em fib(${no.k}). Não sei responder direto, então quebro em fib(${no.k - 1}) e fib(${no.k - 2}) e desço mais um nível.`;
    }

    out.push({ no: no.id, linha, repetidas, podadas, nota });
  }

  const total = nos.length;
  const resposta = nos[0].valor;
  const fecho = comMemo
    ? `fib(${n0}) = ${num(resposta)} com ${num(total)} ${total === 1 ? "chamada" : "chamadas"}. Cada valor foi calculado uma vez só: o cache transformou a árvore numa espinha, e a complexidade caiu de exponencial para O(n).`
    : `fib(${n0}) = ${num(resposta)} depois de ${num(total)} ${total === 1 ? "chamada" : "chamadas"}, das quais ${num(repetidas)} ${repetidas === 1 ? "foi" : "foram"} para valores que a árvore já tinha calculado. Com cache seriam ${num(chamadasMemo(n0))}.`;

  out.push({ no: -1, linha: comMemo ? 8 : 3, repetidas, podadas, nota: fecho, ok: true });
  return out;
}

type Preset = { key: string; rotulo: string; n: number; memo: boolean };

const PRESETS: Preset[] = [
  { key: "quatro", rotulo: "fib(4): a primeira subárvore refeita", n: 4, memo: false },
  { key: "seis", rotulo: "fib(6): 25 chamadas", n: 6, memo: false },
  { key: "seisMemo", rotulo: "fib(6) com cache: 11 chamadas", n: 6, memo: true },
  { key: "oito", rotulo: "fib(8): o retrabalho fica óbvio", n: 8, memo: false },
];

export function RecursionArvoreVisualizer() {
  const [n, setN] = useState(6);
  const [comMemo, setComMemo] = useState(false);
  const [preset, setPreset] = useState("seis");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(4);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const nos = useMemo(() => construir(n, comMemo), [n, comMemo]);
  const passos = useMemo(() => gerarPassos(nos, n, comMemo), [nos, n, comMemo]);
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
  const aoMudarN = (v: string) => {
    const x = parseInt(v, 10);
    reiniciar(); setPreset("");
    setN(isNaN(x) ? 2 : Math.min(8, Math.max(2, x)));
  };
  const alternarMemo = () => { reiniciar(); setPreset(""); setComMemo((v) => !v); };
  const aplicarPreset = (pr: Preset) => {
    reiniciar(); setPreset(pr.key);
    setN(pr.n); setComMemo(pr.memo);
  };

  // Geometria do desenho
  const folhas = nos.filter((no) => no.filhos.length === 0).length;
  const maxProf = nos.reduce((m, no) => Math.max(m, no.prof), 0);
  const W = MARGEM * 2 + Math.max(0, folhas - 1) * PASSO_X + NO_L;
  const H = TOPO * 2 + maxProf * PASSO_Y + NO_A;
  const cx = (no: No) => MARGEM + NO_L / 2 + no.x * PASSO_X;
  const cyTopo = (no: No) => TOPO + no.prof * PASSO_Y;

  // Cadeia da raiz até o nó atual, para acender o caminho da chamada.
  const atual = p.no >= 0 ? nos[p.no] : null;
  const caminho = useMemo(() => {
    const s = new Set<number>();
    let cur = atual;
    while (cur) {
      s.add(cur.id);
      cur = cur.pai === null ? null : nos[cur.pai];
    }
    return s;
  }, [atual, nos]);

  const classeNo = (no: No) => {
    if (idx < no.id) return "rec-no futuro";
    if (no.id === p.no) return "rec-no on";
    if (no.tipo === "memo") return "rec-no memo";
    if (no.repetido) return "rec-no rep";
    if (no.tipo === "base") return "rec-no base";
    return "rec-no";
  };

  const chamadasAte = p.no >= 0 ? p.no + 1 : nos.length;
  const totalIngenuo = chamadasIngenuo(n);
  const totalMemo = chamadasMemo(n);

  const variaveis = [
    { nome: "n (chamada atual)", valor: atual ? `${atual.k}` : "-" },
    { nome: "profundidade", valor: atual ? `${atual.prof}` : "0" },
    { nome: "devolve", valor: atual && idx >= atual.fim ? num(atual.valor) : "pendente" },
    { nome: "chamadas", valor: num(chamadasAte), best: true },
  ];

  const linhas = [n, 10, 20, 30];

  const notaCls = "viz-note" + (p.ok ? " ok" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);
  const codigo = comMemo ? CODIGO_MEMO : CODIGO_INGENUO;

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · a árvore de chamadas do Fibonacci e o retrabalho</span>
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
            <span>n</span>
            <input className="viz-input k" type="number" min={2} max={8} value={n} onChange={(e) => aoMudarN(e.target.value)} />
          </label>
          <div className="viz-field">
            <span>Memoização</span>
            <div className="sub-modo">
              <button className={`sub-modo-btn${comMemo ? "" : " on"}`} onClick={() => { if (comMemo) alternarMemo(); }} aria-pressed={!comMemo}>
                desligada
              </button>
              <button className={`sub-modo-btn${comMemo ? " on" : ""}`} onClick={() => { if (!comMemo) alternarMemo(); }} aria-pressed={comMemo}>
                ligada
              </button>
            </div>
          </div>
        </div>

        <div className="rec-arv-wrap">
          <svg
            className="rec-arv"
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Árvore de chamadas de fib(${n}) ${comMemo ? "com" : "sem"} memoização. Passo ${idx + 1} de ${total}. ${p.nota}`}
          >
            {nos.map((no) =>
              no.filhos.map((fid) => {
                const f = nos[fid];
                const aceso = caminho.has(fid) && caminho.has(no.id);
                const cls = "rec-aresta" + (idx < f.id ? " futuro" : aceso ? " on" : "");
                return (
                  <line
                    key={`${no.id}-${fid}`}
                    className={cls}
                    x1={cx(no)}
                    y1={cyTopo(no) + NO_A}
                    x2={cx(f)}
                    y2={cyTopo(f)}
                  />
                );
              })
            )}
            {nos.map((no) => {
              const resolvido = idx >= no.fim;
              return (
                <g key={no.id} className={classeNo(no)}>
                  <rect
                    x={cx(no) - NO_L / 2}
                    y={cyTopo(no)}
                    width={NO_L}
                    height={NO_A}
                    rx={8}
                  />
                  <text x={cx(no)} y={cyTopo(no) + 13} textAnchor="middle">fib({no.k})</text>
                  <text x={cx(no)} y={cyTopo(no) + 26} textAnchor="middle" className="rec-no-val">
                    {resolvido ? `= ${num(no.valor)}` : "= ?"}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="rec-legenda">
          <span><i style={{ background: "rgba(59,130,246,0.7)" }} />chamada atual</span>
          <span><i style={{ background: "rgba(52,211,153,0.5)" }} />caso base novo</span>
          <span><i style={{ background: "rgba(251,191,36,0.55)" }} />valor já calculado antes</span>
          {comMemo ? <span><i style={{ background: "rgba(167,139,250,0.6)" }} />acerto no cache, subárvore podada</span> : null}
        </div>

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">{comMemo ? "fib_memo.py" : "fib.py"}</div>
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
            <span>chamadas até aqui</span>
            <strong>{num(chamadasAte)}</strong>
          </div>
          <div className="bigo-stat">
            <span>chamadas no total</span>
            <strong>{num(nos.length)}</strong>
          </div>
          <div className="bigo-stat">
            <span>{comMemo ? "acertos no cache" : "chamadas repetidas"}</span>
            <strong>{num(comMemo ? p.podadas : p.repetidas)}</strong>
          </div>
          {/* O contraste que fecha a seção: a árvore tem dezenas de nós, mas a
              pilha nunca passa da profundidade. Tempo exponencial, espaço linear. */}
          <div className="bigo-stat">
            <span>pico da pilha</span>
            <strong>{num(maxProf + 1)}</strong>
          </div>
          <div className="bigo-stat">
            <span>fib({n})</span>
            <strong>{num(nos[0].valor)}</strong>
          </div>
        </div>

        <div className="rec-comp-wrap">
          <table className="rec-comp">
            <caption>Chamadas para calcular fib(n), contagem exata</caption>
            <thead>
              <tr>
                <th>n</th>
                <th>sem cache</th>
                <th>com cache</th>
                <th>quantas vezes menos</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((v, i) => (
                <tr key={`${v}-${i}`} className={i === 0 ? "on" : undefined}>
                  <td>{v}{i === 0 ? " (o seu)" : ""}</td>
                  <td>{num(chamadasIngenuo(v))}</td>
                  <td>{num(chamadasMemo(v))}</td>
                  <td>{num(Math.round(chamadasIngenuo(v) / chamadasMemo(v)))}×</td>
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
          Sem cache, fib({n}) custa {num(totalIngenuo)} chamadas; com cache, {num(totalMemo)}. Em fib(20) a diferença
          é 21.891 contra 39.
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
