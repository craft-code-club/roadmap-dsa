"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// SkipListVisualizer, a busca descendo em escada pelos níveis.
//
// Nível é a única coisa que não se entende lendo: precisa ver a estrutura
// desenhada e o caminho descendo. Por isso aqui o desenho é um SVG com layout
// calculado (uma coluna por elemento, uma linha por nível) em vez da fileira de
// células dos outros visualizadores. O gerador de passos continua puro, igual
// ao TwoPointersVisualizer.
//
// Duas coisas que o aluno precisa enxergar acontecendo:
//   1. a escada: a linha azul que sai do head no topo e desce até o nível 0;
//   2. o preço: o contador de comparações da skip list ao lado do contador da
//      mesma busca feita só no nível 0, que é uma lista encadeada comum.
//
// As alturas padrão dão a pirâmide de livro (12 / 6 / 3 / 1 nós por nível), e o
// botão "Sortear alturas" mostra o que o encontro repetiu o tempo todo: a mesma
// entrada gera estruturas diferentes, mas o resultado da busca não muda.
// ---------------------------------------------------------------------------

type No = { valor: number; altura: number };

type Passo = {
  nivel: number;
  atual: number; // índice do nó atual, -1 = head (o sentinela)
  olhando: number | null; // nó comparado neste passo
  comparacoes: number;
  visitados: string[]; // "nivel:indice", na ordem em que a busca passou
  linha: number;
  encontrou?: boolean;
  fim?: boolean;
  nota: string;
};

// As linhas mapeiam 1:1 com o campo `linha` de cada passo, então a ordem e a
// quantidade de linhas não podem mudar sem ajustar o gerador junto.
const CODIGO = [
  "def buscar(self, alvo):",
  "    atual = self.head",
  "    for nivel in range(self.nivel_max, -1, -1):",
  "        prox = atual.forward[nivel]",
  "        while prox and prox.valor < alvo:",
  "            atual = prox",
  "            prox = atual.forward[nivel]",
  "    atual = atual.forward[0]",
  "    return atual is not None and atual.valor == alvo",
];

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

const MAX_NIVEIS = 4; // altura máxima de um nó, o `MAX_NIVEL` da implementação

// Doze elementos com a pirâmide exata da teoria: 12 nós no nível 0, 6 no
// nível 1, 3 no nível 2 e 1 no nível 3. É o desenho do encontro.
const VALORES = [3, 9, 17, 23, 31, 42, 50, 59, 73, 80, 92, 98];
const ALTURAS_PADRAO = [1, 3, 1, 2, 1, 4, 1, 2, 3, 1, 2, 1];
const ALTURAS_PLANAS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

function montar(alturas: number[]): No[] {
  return VALORES.map((valor, i) => ({ valor, altura: alturas[i] ?? 1 }));
}

// O próximo nó de `i` no nível `nivel`: o primeiro à direita que chega lá.
// Com i = -1 a busca começa no head, que participa de todos os níveis.
function forwardDe(nos: No[], i: number, nivel: number): number | null {
  for (let j = i + 1; j < nos.length; j++) {
    if (nos[j].altura > nivel) return j;
  }
  return null;
}

function nomeDe(nos: No[], i: number): string {
  return i < 0 ? "o head" : `o ${nos[i].valor}`;
}

// A mesma busca, mas andando só pelo nível 0: é exatamente o que uma lista
// encadeada comum faria. Conta do mesmo jeito (cada `<` avaliado, mais a
// comparação final de igualdade) para os dois números serem comparáveis.
function comparacoesLista(nos: No[], alvo: number): number {
  let c = 0;
  let i = 0;
  while (i < nos.length && nos[i].valor < alvo) {
    c++;
    i++;
  }
  if (i < nos.length) c += 2; // o `<` que deu falso + o `==` do final
  return c;
}

function gerarPassos(nos: No[], alvo: number): Passo[] {
  const out: Passo[] = [];
  const topo = Math.max(1, ...nos.map((n) => n.altura)) - 1;
  let nivel = topo;
  let atual = -1;
  let comparacoes = 0;
  const visitados: string[] = [`${topo}:-1`];
  const base = () => ({ nivel, atual, comparacoes, visitados: [...visitados] });

  out.push({
    ...base(),
    olhando: null,
    linha: 1,
    nota: `Começo no head, no nível ${topo}, o mais alto que esta lista tem. É de lá que saem os maiores saltos, e por isso toda busca começa no topo, à esquerda.`,
  });

  let guarda = 0;
  while (nivel >= 0 && guarda++ < 300) {
    const prox = forwardDe(nos, atual, nivel);
    if (prox === null) {
      out.push({
        ...base(),
        olhando: null,
        linha: 3,
        nota: `No nível ${nivel} não existe ninguém depois de ${nomeDe(nos, atual)}: o ponteiro aponta para None. Não dá para avançar, então só me resta descer.`,
      });
    } else {
      const v = nos[prox].valor;
      comparacoes++;
      if (v < alvo) {
        const pulados = prox - atual - 1;
        out.push({
          ...base(),
          olhando: prox,
          linha: 4,
          nota: `${v} < ${alvo}: o próximo do nível ${nivel} ainda é menor que o alvo, então dá para pular até ele sem risco de passar do ponto.`,
        });
        atual = prox;
        visitados.push(`${nivel}:${atual}`);
        out.push({
          ...base(),
          olhando: null,
          linha: 5,
          nota:
            pulados === 0
              ? `Avancei para o ${v}. Neste salto não pulei ninguém: no nível ${nivel} ele já era o vizinho imediato.`
              : `Avancei para o ${v} de uma vez só, sem nem olhar os ${pulados} ${pulados === 1 ? "elemento que ficou" : "elementos que ficaram"} para trás no nível 0. É isso que o atalho compra.`,
        });
        continue;
      }
      out.push({
        ...base(),
        olhando: prox,
        linha: 4,
        nota: `${v} não é menor que ${alvo}: se eu avançasse, passaria do ponto. Paro de andar no nível ${nivel}.`,
      });
    }

    if (nivel === 0) break;
    nivel--;
    visitados.push(`${nivel}:${atual}`);
    out.push({
      ...base(),
      olhando: null,
      linha: 2,
      nota: `Desço um degrau, para o nível ${nivel}, sem sair de ${nomeDe(nos, atual)}. Tudo que ficou à esquerda está descartado de vez: já sei que é menor que ${alvo}.`,
    });
  }

  const candidato = forwardDe(nos, atual, 0);
  out.push({
    ...base(),
    olhando: candidato,
    linha: 7,
    nota:
      candidato === null
        ? `Saí do laço em ${nomeDe(nos, atual)}, e depois dele não há mais nada no nível 0. O ${alvo} não está na lista.`
        : `Saí do laço em ${nomeDe(nos, atual)}. O único candidato possível é o vizinho dele no nível 0, o ${nos[candidato].valor}: se o ${alvo} existisse, estaria exatamente aí.`,
  });

  if (candidato !== null) comparacoes++;
  const achou = candidato !== null && nos[candidato].valor === alvo;
  const naLista = comparacoesLista(nos, alvo);
  out.push({
    ...base(),
    olhando: candidato,
    linha: 8,
    encontrou: achou,
    fim: true,
    nota: achou
      ? `Achei o ${alvo} com ${comparacoes} ${comparacoes === 1 ? "comparação" : "comparações"}. A mesma busca andando só pelo nível 0, que é uma lista encadeada comum, gastaria ${naLista}.`
      : `O ${alvo} não está na lista, e para saber disso bastaram ${comparacoes} ${comparacoes === 1 ? "comparação" : "comparações"}. Percorrendo só o nível 0 seriam ${naLista}.`,
  });
  return out;
}

type Preset = { key: string; rotulo: string; alvo: number; alturas: number[] };
const PRESETS: Preset[] = [
  { key: "encontro", rotulo: "Do encontro: procurar o 73", alvo: 73, alturas: ALTURAS_PADRAO },
  { key: "longe", rotulo: "Lá no fim: procurar o 92", alvo: 92, alturas: ALTURAS_PADRAO },
  { key: "ausente", rotulo: "Não existe: procurar o 44", alvo: 44, alturas: ALTURAS_PADRAO },
  { key: "plano", rotulo: "Pior caso: todo mundo no nível 0", alvo: 92, alturas: ALTURAS_PLANAS },
];

// --- layout do desenho -----------------------------------------------------
const GUT = 50; // faixa da esquerda com o rótulo do nível
const HEAD_W = 36;
const X0 = GUT + HEAD_W + 18; // x da primeira coluna
const COL = 50; // distância entre colunas
const W = 34; // largura da caixinha de um nó
const H = 24; // altura da caixinha
const RH = 38; // distância entre níveis
const TOP = 12;

export function SkipListVisualizer() {
  const [alturas, setAlturas] = useState<number[]>(ALTURAS_PADRAO);
  const [alvo, setAlvo] = useState(73);
  const [preset, setPreset] = useState("encontro");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const nos = useMemo(() => montar(alturas), [alturas]);
  const passos = useMemo(() => gerarPassos(nos, alvo), [nos, alvo]);
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

  const reiniciar = () => {
    parar();
    setTocando(false);
    setPasso(0);
  };
  const aoMudarAlvo = (v: string) => {
    reiniciar();
    setPreset("");
    setAlvo(parseInt(v, 10) || 0);
  };
  const aplicarPreset = (pr: Preset) => {
    reiniciar();
    setPreset(pr.key);
    setAlturas(pr.alturas);
    setAlvo(pr.alvo);
  };
  // Math.random só aqui, num handler de clique: no caminho de render ele
  // faria o HTML do build divergir do cliente na hidratação.
  const sortear = () => {
    const novas = VALORES.map(() => {
      let h = 1;
      while (Math.random() < 0.5 && h < MAX_NIVEIS) h++;
      return h;
    });
    reiniciar();
    setPreset("");
    setAlturas(novas);
  };

  // --- desenho -------------------------------------------------------------
  const topo = Math.max(1, ...nos.map((n) => n.altura)) - 1;
  const niveis = topo + 1;
  const n = nos.length;
  const larguraSvg = X0 + n * COL + 36;
  const alturaSvg = TOP + topo * RH + H + 14;

  const yDe = (nivel: number) => TOP + (topo - nivel) * RH;
  const cyDe = (nivel: number) => yDe(nivel) + H / 2;
  const xDe = (i: number) => (i < 0 ? GUT : X0 + i * COL);
  const larDe = (i: number) => (i < 0 ? HEAD_W : W);
  const cxDe = (i: number) => xDe(i) + larDe(i) / 2;

  const visitadosSet = useMemo(() => new Set(p.visitados), [p.visitados]);

  // A escada: uma polilinha ligando, na ordem, cada posição por onde o ponteiro
  // `atual` passou. Trechos horizontais são saltos, trechos verticais são
  // descidas de nível.
  const escada = p.visitados
    .map((k) => {
      const [nv, ix] = k.split(":").map((s) => parseInt(s, 10));
      return `${cxDe(ix).toFixed(1)},${cyDe(nv).toFixed(1)}`;
    })
    .join(" ");

  // Setas de cada nível: head → nós daquele nível → None.
  type Seta = { k: string; x1: number; x2: number; y: number };
  const setas: Seta[] = [];
  for (let nv = 0; nv <= topo; nv++) {
    const participantes = nos.map((no, i) => ({ no, i })).filter((c) => c.no.altura > nv);
    let anterior = -1;
    const y = cyDe(nv);
    for (const c of participantes) {
      setas.push({ k: `s${nv}-${c.i}`, x1: xDe(anterior) + larDe(anterior), x2: xDe(c.i) - 5, y });
      anterior = c.i;
    }
    setas.push({ k: `n${nv}`, x1: xDe(anterior) + larDe(anterior), x2: xDe(anterior) + larDe(anterior) + 16, y });
  }

  const corDoNo = (i: number, nv: number) => {
    if (p.encontrou && p.olhando === i) return { fill: "rgba(52,211,153,0.26)", stroke: "#34d399", txt: "#eafff5" };
    if (p.olhando === i && p.atual !== i) return { fill: "rgba(245,158,11,0.22)", stroke: "#f59e0b", txt: "#fff" };
    if (p.atual === i && p.nivel === nv) return { fill: "rgba(59,130,246,0.3)", stroke: "#3b82f6", txt: "#fff" };
    if (visitadosSet.has(`${nv}:${i}`)) return { fill: "rgba(59,130,246,0.12)", stroke: "rgba(59,130,246,0.55)", txt: "#cbd9ea" };
    return { fill: "#0f1826", stroke: "rgba(255,255,255,0.13)", txt: "#8ba0bb" };
  };

  const variaveis = [
    { nome: "nivel", valor: `${p.nivel}` },
    { nome: "atual", valor: p.atual < 0 ? "head" : `${nos[p.atual].valor}` },
    { nome: "prox", valor: p.olhando === null ? "None" : `${nos[p.olhando].valor}` },
    { nome: "alvo", valor: `${alvo}`, best: true },
  ];

  const naLista = comparacoesLista(nos, alvo);
  const estatisticas = [
    { k: "n", rot: "elementos (n)", val: `${n}` },
    { k: "niv", rot: "níveis", val: `${niveis}` },
    { k: "cmp", rot: "comparações na skip list", val: `${p.comparacoes}` },
    { k: "lst", rot: "comparações numa lista comum", val: `${naLista}` },
  ];

  const notaCls = "viz-note" + (p.encontrou ? " ok" : p.fim ? " invalid" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);
  const descricao = `Skip list com ${n} elementos e ${niveis} ${niveis === 1 ? "nível" : "níveis"}, procurando o ${alvo}. A busca está no nível ${p.nivel}, em ${p.atual < 0 ? "head" : nos[p.atual].valor}, com ${p.comparacoes} comparações feitas.`;

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · a busca descendo em escada pelos níveis</span>
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
          <label className="viz-field">
            <span>procurar</span>
            <input className="viz-input k" type="number" value={alvo} onChange={(e) => aoMudarAlvo(e.target.value)} />
          </label>
          <button className="viz-btn" onClick={sortear}>
            Sortear alturas
          </button>
          <button className="viz-btn" onClick={() => aplicarPreset(PRESETS[0])}>
            Alturas do encontro
          </button>
        </div>

        <div className="sl-wrap">
          <svg
            className="sl-svg"
            viewBox={`0 0 ${Math.round(larguraSvg)} ${Math.round(alturaSvg)}`}
            role="img"
            aria-label={descricao}
          >
            <defs>
              <marker id="sl-seta" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 z" fill="#3a4a60" />
              </marker>
            </defs>

            {setas.map((s) => (
              <line
                key={s.k}
                x1={s.x1}
                y1={s.y}
                x2={s.x2}
                y2={s.y}
                stroke="#3a4a60"
                strokeWidth={1.5}
                markerEnd="url(#sl-seta)"
              />
            ))}

            {Array.from({ length: niveis }, (_, k) => {
              const nv = topo - k;
              return (
                <text
                  key={`r${nv}`}
                  x={GUT - 9}
                  y={cyDe(nv)}
                  fill="#61748c"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fontSize={10.5}
                  textAnchor="end"
                  dominantBaseline="central"
                >
                  nível {nv}
                </text>
              );
            })}

            {Array.from({ length: niveis }, (_, k) => {
              const nv = topo - k;
              const x = xDe(-1) + HEAD_W + 16;
              const semNinguem = forwardDe(nos, -1, nv) === null;
              return semNinguem ? (
                <text
                  key={`none${nv}`}
                  x={x + 4}
                  y={cyDe(nv)}
                  fill="#4c5f79"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fontSize={10}
                  dominantBaseline="central"
                >
                  None
                </text>
              ) : null;
            })}

            {/* head: um nó só, com um ponteiro por nível. É o sentinela. */}
            <rect
              x={xDe(-1)}
              y={yDe(topo)}
              width={HEAD_W}
              height={topo * RH + H}
              rx={7}
              fill={p.atual < 0 ? "rgba(59,130,246,0.22)" : "#111c2b"}
              stroke={p.atual < 0 ? "#3b82f6" : "rgba(255,255,255,0.16)"}
              strokeWidth={1.6}
            />
            <text
              x={cxDe(-1)}
              y={cyDe(topo) + (topo * RH) / 2}
              fill={p.atual < 0 ? "#fff" : "#7d8fa8"}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontSize={10.5}
              fontWeight={700}
              textAnchor="middle"
              dominantBaseline="central"
            >
              head
            </text>

            {nos.map((no, i) =>
              Array.from({ length: no.altura }, (_, nv) => {
                const c = corDoNo(i, nv);
                return (
                  <g key={`${i}-${nv}`}>
                    <rect
                      x={xDe(i)}
                      y={yDe(nv)}
                      width={W}
                      height={H}
                      rx={6}
                      fill={c.fill}
                      stroke={c.stroke}
                      strokeWidth={1.6}
                    />
                    <text
                      x={cxDe(i)}
                      y={cyDe(nv)}
                      fill={c.txt}
                      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      fontSize={12.5}
                      fontWeight={600}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {no.valor}
                    </text>
                  </g>
                );
              })
            )}

            {/* a escada: o caminho que o ponteiro `atual` já percorreu */}
            <polyline
              points={escada}
              fill="none"
              stroke="#60a5fa"
              strokeWidth={2.4}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.95}
            />
          </svg>
        </div>

        <p className="sl-legenda">
          <span>
            <i style={{ background: "#3b82f6" }} /> onde a busca está agora
          </span>
          <span>
            <i style={{ background: "#f59e0b" }} /> valor sendo comparado
          </span>
          <span>
            <i style={{ background: "#34d399" }} /> encontrado
          </span>
          <span>
            <i style={{ background: "#60a5fa", height: 3, borderRadius: 2 }} /> a escada percorrida
          </span>
        </p>

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">skip_list.py</div>
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
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={velocidade}
              onChange={(e) => setVelocidade(parseInt(e.target.value, 10))}
            />
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
