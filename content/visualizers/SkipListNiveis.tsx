"use client";

import { useMemo, useState } from "react";

import { thousands } from "@/lib/format";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// SkipListNiveis, a aritmética da moeda: de onde sai o log n.
//
// A busca e a inserção mostram a estrutura funcionando. Falta a pergunta que
// fica no ar: por que confiar num sorteio? Aqui o aluno mexe em n e em p e vê a
// pirâmide se formar sozinha (100%, 50%, 25%, 12,5%...), a altura esperada da
// lista virar log de n e o preço em memória subir junto.
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
//
// Da casca vêm as camadas 1 e 2: o painel expandido com o cabeçalho e os
// controles parados enquanto a pirâmide rola. `collapsible: false` porque não
// há bloco dispensável — a pirâmide É o conteúdo, e ela é justamente o que
// cresce (medido: 40 linhas com n = 1.048.576 e p = 0,75).
// ---------------------------------------------------------------------------

const INPUTS = [16, 64, 256, 1024, 4096, 16384, 65536, 262144, 1048576];
const PS = [
  { value: 0.25, label: "p = 0,25", note: "sobe 1 a cada 4" },
  { value: 0.5, label: "p = 0,5", note: "a moeda, o padrão" },
  { value: 0.75, label: "p = 0,75", note: "sobe 3 a cada 4" },
];

// Zeros à direita saem fora: "p = 0,5" e "2 ponteiros", nunca "0,50" e "2,00".
// É o mesmo número que o artigo escreve, e o aluno compara os dois.
function dec(v: number, places: number): string {
  const r = v.toFixed(places);
  const [i, f] = r.split(".");
  const whole = i.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const frac = (f ?? "").replace(/0+$/, "");
  return frac ? `${whole},${frac}` : whole;
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

type Row = { level: number; expected: number; fraction: number };

export function SkipListNiveis() {
  const [iN, setIN] = useState(3); // 1.024
  const [p, setP] = useState(0.5);
  const [sim, setSim] = useState<number[] | null>(null);
  const [simN, setSimN] = useState(0);

  const n = INPUTS[iN];

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let k = 0;
    let fraction = 1;
    while (n * fraction >= 1 && k < 40) {
      out.push({ level: k, expected: n * fraction, fraction });
      k++;
      fraction *= p;
    }
    return out.reverse();
  }, [n, p]);

  const levels = rows.length;
  const top = levels - 1;
  const pointersPerNode = 1 / (1 - p);
  const totalPointers = n * pointersPerNode;
  const logBase = Math.log(n) / Math.log(1 / p);
  const comparisons = logBase / p + pointersPerNode;
  const log10BadLuck = n * Math.log10(1 - p);

  // Sem linha do tempo (`total: 1`) e sem bloco dispensável: a peça ganha o
  // painel com cabeçalho e controles parados, e nada mais.
  const viz = useVisualizer({
    title: "Visualizador · a aritmética da moeda: de onde sai o log n",
    total: 1,
    collapsible: false,
  });

  const rollCoins = () => {
    const counts = Array.from({ length: 41 }, () => 0);
    for (let i = 0; i < n; i++) {
      let h = 0;
      while (Math.random() < p && h < 39) h++;
      for (let lv = 0; lv <= h; lv++) counts[lv]++;
    }
    setSim(counts);
    setSimN(n);
  };
  const clearSim = () => {
    setSim(null);
    setSimN(0);
  };

  const simValid = sim !== null && simN === n;
  const highestRolledLevel = simValid ? sim.reduce((m, q, k) => (q > 0 ? k : m), 0) : 0;

  const stats = [
    { k: "niv", label: "níveis esperados", value: `${levels}` },
    { k: "cmp", label: "comparações na busca", value: `${thousands(comparisons)}` },
    { k: "pt", label: "ponteiros por nó", value: dec(pointersPerNode, 2) },
    { k: "mem", label: "ponteiros no total", value: thousands(totalPointers) },
  ];

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      {/* Sem linha do tempo não há "passo N de M", e o lugar dele guarda o
          número que resume a peça — com o rótulo junto, senão ele perde o
          contexto que o explicava. */}
      <VizHeader viz={viz}>
        <span className="viz-step">
          n = {thousands(n)} · p = {dec(p, 2)}
        </span>
      </VizHeader>

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PS.map((op) => (
            <button
              key={op.value}
              className={`bigo-chip${p === op.value ? " on" : ""}`}
              onClick={() => {
                setP(op.value);
                clearSim();
              }}
              aria-pressed={p === op.value}
            >
              {op.label} · {op.note}
            </button>
          ))}
        </div>

        <div className="sl-piramide">
          {rows.map((l) => {
            const obs = simValid ? sim[l.level] : null;
            return (
              <div className="sl-plinha" key={l.level}>
                <span className="sl-prot">nível {l.level}</span>
                <span className="sl-pbarra">
                  <i style={{ width: `${Math.max(0.35, l.fraction * 100)}%` }} />
                  {obs !== null ? <b style={{ width: `${Math.max(0.35, (obs / n) * 100)}%` }} /> : null}
                </span>
                <span className="sl-pval">
                  {thousands(l.expected)}
                  <em>{pct(l.fraction)}</em>
                  {obs !== null ? <span className="obs">{thousands(obs)} sorteados</span> : null}
                </span>
              </div>
            );
          })}
        </div>

        <p className="viz-note">
          Com <strong>n = {thousands(n)}</strong> e <strong>p = {dec(p, 2)}</strong>, cada nível guarda{" "}
          <strong>{pct(p)}</strong> do nível de baixo. A conta para o nível {top} ainda ter pelo menos 1 nó é{" "}
          <strong>
            {thousands(n)} × {dec(p, 2)}
            <sup>{top}</sup> ≥ 1
          </strong>
          , e é daí que sai a altura de <strong>{levels} níveis</strong>: é o logaritmo de {thousands(n)} na base{" "}
          {dec(1 / p, 2)}, arredondado para cima.
          {simValid ? (
            <>
              {" "}
              O sorteio de verdade chegou ao nível <strong>{highestRolledLevel}</strong>: a barra azul é o esperado, a
              verde é o que a moeda entregou.
            </>
          ) : null}
        </p>

        <div className="bigo-stats">
          {stats.map((s) => (
            <div className="bigo-stat" key={s.k}>
              <span>{s.label}</span>
              <strong>{s.value}</strong>
            </div>
          ))}
        </div>

        <div className="sl-painel">
          <div className="sl-painel-tit">
            E se der tudo errado?
            <em>o pior caso existe, só não acontece</em>
          </div>
          <p className="sl-azar">
            Para a skip list virar uma lista encadeada comum, os {thousands(n)} nós teriam que tirar coroa de primeira, todos.
            A chance disso é <strong>(1 − {dec(p, 2)})</strong>
            <sup>{thousands(n)}</sup> = <strong>{chance(log10BadLuck)}</strong>. O pior caso é O(n) de verdade, mas ele não é
            uma entrada ruim que alguém pode escolher: é azar puro, e o tamanho dessa fração é o motivo de dar para
            confiar no sorteio.
          </p>
        </div>
      </div>

      {/* Os controles são deste visualizador, não de reprodução — mas moram no
          `.viz-foot` do `VizFooter` pelo mesmo motivo de sempre: é o que os
          deixa parados no pé do painel enquanto a pirâmide rola. */}
      <VizFooter viz={viz}>
        <div className="viz-field grow">
          <span>Elementos: n = {thousands(n)}</span>
          <input
            type="range"
            min={0}
            max={INPUTS.length - 1}
            step={1}
            value={iN}
            onChange={(e) => {
              setIN(parseInt(e.target.value, 10));
              clearSim();
            }}
            style={{ accentColor: "var(--ccc-accent)", width: "100%" }}
          />
        </div>
        <button className="viz-btn" onClick={rollCoins}>
          Sortear {thousands(n)} moedas
        </button>
        <button
          className="viz-btn"
          onClick={() => {
            setIN(3);
            setP(0.5);
            clearSim();
          }}
        >
          ↺ Reiniciar
        </button>
      </VizFooter>
    </figure>
  );

  return viz.inPanel(frame);
}
