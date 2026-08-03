"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// SkipListNiveis, a aritmética da moeda: de onde sai o log n.
//
// A busca e a inserção mostram a estrutura funcionando. Falta a pergunta que o
// encontro deixou no ar: por que confiar num sorteio? Aqui o aluno mexe em n e
// em p e vê a pirâmide se formar sozinha (100%, 50%, 25%, 12,5%...), a altura
// esperada da lista virar log de n e o preço em memória subir junto.
//
// Tudo que aparece é calculado, não estimado:
//   nós esperados no nível k .... n * p^k
//   níveis esperados ............ maior k com n * p^k >= 1, mais 1
//   ponteiros por nó ............ 1 / (1 - p)   (média da distribuição geométrica)
//   comparações na busca ........ log(n) na base 1/p, dividido por p, mais 1/(1-p)
//   azar total .................. (1 - p)^n, a chance de ninguém sair do nível 0
//
// O botão "Sortear n moedas" roda a simulação de verdade e põe o observado ao
// lado do esperado. Math.random só ali, num handler de clique: no render ele
// quebraria a hidratação.
// ---------------------------------------------------------------------------

const ENTRADAS = [16, 64, 256, 1024, 4096, 16384, 65536, 262144, 1048576];
const PS = [
  { valor: 0.25, rotulo: "p = 0,25", nota: "sobe 1 a cada 4" },
  { valor: 0.5, rotulo: "p = 0,5", nota: "a moeda, o padrão" },
  { valor: 0.75, rotulo: "p = 0,75", nota: "sobe 3 a cada 4" },
];

// Formatação determinística: nada de Intl, para o HTML do build bater com o do
// cliente na hidratação.
function num(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Zeros à direita saem fora: "p = 0,5" e "2 ponteiros", nunca "0,50" e "2,00".
// É o mesmo número que o artigo escreve, e o aluno compara os dois.
function dec(v: number, casas: number): string {
  const r = v.toFixed(casas);
  const [i, f] = r.split(".");
  const inteiro = i.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const frac = (f ?? "").replace(/0+$/, "");
  return frac ? `${inteiro},${frac}` : inteiro;
}

function pct(v: number): string {
  if (v >= 0.1) return `${dec(v * 100, 1)}%`;
  if (v >= 0.001) return `${dec(v * 100, 2)}%`;
  return `${dec(v * 100, 4)}%`;
}

// Probabilidades minúsculas viram potência de 10: (1-p)^n com n grande não cabe
// em nenhuma casa decimal legível.
function chance(log10: number): string {
  if (log10 > -4) return `${dec(Math.pow(10, log10) * 100, 3)}%`;
  // Sem separador de milhar no expoente: "10^315.653" leria como decimal.
  return `1 em 10^${String(Math.round(-log10))}`;
}

type Linha = { nivel: number; esperado: number; fracao: number };

export function SkipListNiveis() {
  const [iN, setIN] = useState(3); // 1.024
  const [p, setP] = useState(0.5);
  const [sim, setSim] = useState<number[] | null>(null);
  const [simN, setSimN] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const n = ENTRADAS[iN];

  const linhas = useMemo<Linha[]>(() => {
    const out: Linha[] = [];
    let k = 0;
    let fracao = 1;
    while (n * fracao >= 1 && k < 40) {
      out.push({ nivel: k, esperado: n * fracao, fracao });
      k++;
      fracao *= p;
    }
    return out.reverse();
  }, [n, p]);

  const niveis = linhas.length;
  const topo = niveis - 1;
  const ponteirosPorNo = 1 / (1 - p);
  const ponteirosTotais = n * ponteirosPorNo;
  const logBase = Math.log(n) / Math.log(1 / p);
  const comparacoes = logBase / p + ponteirosPorNo;
  const log10Azar = n * Math.log10(1 - p);

  const sortear = () => {
    const contagem = Array.from({ length: 41 }, () => 0);
    for (let i = 0; i < n; i++) {
      let h = 0;
      while (Math.random() < p && h < 39) h++;
      for (let lv = 0; lv <= h; lv++) contagem[lv]++;
    }
    setSim(contagem);
    setSimN(n);
  };
  const limpar = () => {
    setSim(null);
    setSimN(0);
  };

  const simValida = sim !== null && simN === n;
  const maiorNivelSorteado = simValida ? sim.reduce((m, q, k) => (q > 0 ? k : m), 0) : 0;

  const estatisticas = [
    { k: "niv", rot: "níveis esperados", val: `${niveis}` },
    { k: "cmp", rot: "comparações na busca", val: `${num(comparacoes)}` },
    { k: "pt", rot: "ponteiros por nó", val: dec(ponteirosPorNo, 2) },
    { k: "mem", rot: "ponteiros no total", val: num(ponteirosTotais) },
  ];

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · a aritmética da moeda: de onde sai o log n</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">
            n = {num(n)} · p = {dec(p, 2)}
          </span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "✕ Fechar" : "⤢ Expandir"}
          </button>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          {PS.map((op) => (
            <button
              key={op.valor}
              className={`bigo-chip${p === op.valor ? " on" : ""}`}
              onClick={() => {
                setP(op.valor);
                limpar();
              }}
              aria-pressed={p === op.valor}
            >
              {op.rotulo} · {op.nota}
            </button>
          ))}
        </div>

        <div className="sl-piramide">
          {linhas.map((l) => {
            const obs = simValida ? sim[l.nivel] : null;
            return (
              <div className="sl-plinha" key={l.nivel}>
                <span className="sl-prot">nível {l.nivel}</span>
                <span className="sl-pbarra">
                  <i style={{ width: `${Math.max(0.35, l.fracao * 100)}%` }} />
                  {obs !== null ? <b style={{ width: `${Math.max(0.35, (obs / n) * 100)}%` }} /> : null}
                </span>
                <span className="sl-pval">
                  {num(l.esperado)}
                  <em>{pct(l.fracao)}</em>
                  {obs !== null ? <span className="obs">{num(obs)} sorteados</span> : null}
                </span>
              </div>
            );
          })}
        </div>

        <p className="viz-note">
          Com <strong>n = {num(n)}</strong> e <strong>p = {dec(p, 2)}</strong>, cada nível guarda{" "}
          <strong>{pct(p)}</strong> do nível de baixo. A conta para o nível {topo} ainda ter pelo menos 1 nó é{" "}
          <strong>
            {num(n)} × {dec(p, 2)}
            <sup>{topo}</sup> ≥ 1
          </strong>
          , e é daí que sai a altura de <strong>{niveis} níveis</strong>: é o logaritmo de {num(n)} na base{" "}
          {dec(1 / p, 2)}, arredondado para cima.
          {simValida ? (
            <>
              {" "}
              O sorteio de verdade chegou ao nível <strong>{maiorNivelSorteado}</strong>: a barra azul é o esperado, a
              verde é o que a moeda entregou.
            </>
          ) : null}
        </p>

        <div className="bigo-stats">
          {estatisticas.map((s) => (
            <div className="bigo-stat" key={s.k}>
              <span>{s.rot}</span>
              <strong>{s.val}</strong>
            </div>
          ))}
        </div>

        <div className="sl-painel">
          <div className="sl-painel-tit">
            E se der tudo errado?
            <em>o pior caso existe, só não acontece</em>
          </div>
          <p className="sl-azar">
            Para a skip list virar uma lista encadeada comum, os {num(n)} nós teriam que tirar coroa de primeira, todos.
            A chance disso é <strong>(1 − {dec(p, 2)})</strong>
            <sup>{num(n)}</sup> = <strong>{chance(log10Azar)}</strong>. O pior caso é O(n) de verdade, mas ele não é uma
            entrada ruim que alguém pode escolher: é azar puro, e o tamanho dessa fração é o motivo de dar para confiar
            no sorteio.
          </p>
        </div>

        <div className="viz-controls">
          <div className="viz-field grow">
            <span>Elementos: n = {num(n)}</span>
            <input
              type="range"
              min={0}
              max={ENTRADAS.length - 1}
              step={1}
              value={iN}
              onChange={(e) => {
                setIN(parseInt(e.target.value, 10));
                limpar();
              }}
              style={{ accentColor: "var(--ccc-accent)", width: "100%" }}
            />
          </div>
          <button className="viz-btn" onClick={sortear}>
            Sortear {num(n)} moedas
          </button>
          <button
            className="viz-btn"
            onClick={() => {
              setIN(3);
              setP(0.5);
              limpar();
            }}
          >
            ↺ Reiniciar
          </button>
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
