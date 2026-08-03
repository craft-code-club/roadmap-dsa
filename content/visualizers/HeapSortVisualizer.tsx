"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// HeapSortVisualizer, as duas fases e a fronteira que anda para trás.
//
// A dificuldade do heap sort não está no heap, está na SEGUNDA fase: o array
// passa a ter duas regiões no mesmo espaço de memória, uma que ainda é heap e
// outra que já é resultado final, e a fronteira entre elas anda um passo por
// rodada. Quem não enxerga essa fronteira acha que o algoritmo está bagunçando
// o que já tinha arrumado.
//
// Por isso a região ordenada aparece marcada tanto no array quanto na árvore
// (o nó some da árvore no instante em que sai do heap), e o card "heap ativo"
// mostra o número que o `desce` está usando como limite. É literalmente o
// algoritmo mentindo sobre o tamanho do array, e é a sacada inteira.
//
// Max-heap porque a ordenação é crescente: o maior valor tem que ir para o FIM,
// e o fim é exatamente a posição que acabou de sair do heap.
// ---------------------------------------------------------------------------

type Fase = "construir" | "ordenar" | "fim";

type Passo = {
  arr: number[];
  n: number; // tamanho do heap ativo: as posições >= n já estão ordenadas
  foco: number;
  par: number;
  trocou: boolean;
  fase: Fase;
  comp: number;
  swaps: number;
  linha: number;
  nota: string;
  ok?: boolean;
};

const CODIGO = [
  "def heap_sort(a):",
  "    n = len(a)",
  "    # fase 1: transforma o array num max-heap, O(n)",
  "    for i in range(n // 2 - 1, -1, -1):",
  "        desce(a, i, n)",
  "    # fase 2: tira o maior e encolhe o heap, n - 1 vezes",
  "    for fim in range(n - 1, 0, -1):",
  "        a[0], a[fim] = a[fim], a[0]",
  "        desce(a, 0, fim)   # 'fim' vira o novo tamanho",
  "",
  "def desce(a, i, n):        # n = até onde o heap ainda vale",
  "    while True:",
  "        maior, e, d = i, 2*i + 1, 2*i + 2",
  "        if e < n and a[e] > a[maior]: maior = e",
  "        if d < n and a[d] > a[maior]: maior = d",
  "        if maior == i: return",
  "        a[i], a[maior] = a[maior], a[i]",
  "        i = maior",
];

type Preset = { key: string; rotulo: string; valores: number[]; dica: string };

const PRESETS: Preset[] = [
  {
    key: "embaralhado",
    rotulo: "Embaralhado: 4 10 3 5 1 8 7 2 9 6",
    valores: [4, 10, 3, 5, 1, 8, 7, 2, 9, 6],
    dica: "O caso comum. Acompanhe a fronteira verde crescendo da direita para a esquerda: cada rodada da fase 2 congela mais uma posição, e ela nunca mais é tocada.",
  },
  {
    key: "ordenado",
    rotulo: "Já ordenado: 1 2 3 4 5 6 7 8 9 10",
    valores: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    dica: "A entrada já está pronta e o heap sort não liga: ele faz o trabalho inteiro assim mesmo. Compare o total de comparações com o do preset embaralhado, eles ficam na mesma faixa. Não existe atalho de melhor caso aqui.",
  },
  {
    key: "invertido",
    rotulo: "Ao contrário: 10 9 8 7 6 5 4 3 2 1",
    valores: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    dica: "A entrada mais hostil que existe para quase todo algoritmo de ordenação. Para o heap sort é só mais uma: a fase 1 quase não faz nada, porque um array decrescente já é um max-heap válido.",
  },
  {
    key: "repetidos",
    rotulo: "Com repetidos: 5 3 5 1 3 9 1 5",
    valores: [5, 3, 5, 1, 3, 9, 1, 5],
    dica: "Valores iguais não quebram nada: a regra do max-heap é maior OU IGUAL. O que se perde com eles é a estabilidade, e isso o visualizador ao lado mostra.",
  },
];

const VELOCIDADES = [0, 1200, 800, 520, 320, 180];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

function gerarPassos(valores: number[]): Passo[] {
  const a = [...valores];
  const total = a.length;
  const out: Passo[] = [];
  let comp = 0;
  let swaps = 0;
  let n = total;
  let fase: Fase = "construir";
  const base = () => ({ arr: [...a], n, foco: -1, par: -1, trocou: false, fase, comp, swaps });

  // sift down com limite: tudo de `n` para a frente é resultado final e não existe
  // para o algoritmo. Empurrar os passos aqui dentro mantém o gerador puro.
  const desce = (inicio: number, contexto: string) => {
    let i = inicio;
    let guarda = 0;
    while (guarda++ < 200) {
      const e = 2 * i + 1;
      const d = 2 * i + 2;
      if (e >= n) {
        out.push({
          ...base(), foco: i, linha: 15, ok: true,
          nota: `A posição ${i} não tem filho dentro do heap (2 x ${i} + 1 = ${e}, e o heap só vai até ${n - 1}). Cheguei numa folha, a descida acabou.`,
        });
        return;
      }
      let maior = i;
      comp++;
      if (a[e] > a[maior]) maior = e;
      let txt = `Filhos de ${i}: esquerda em ${e} (valor ${a[e]})`;
      if (d < n) {
        comp++;
        txt += `, direita em ${d} (valor ${a[d]})`;
        if (a[d] > a[maior]) maior = d;
      } else {
        txt += `. A direita seria ${d}, que já caiu na parte ordenada, então nem olho`;
      }
      out.push({
        ...base(), foco: i, par: maior === i ? -1 : maior, linha: d < n ? 14 : 13,
        nota: `${txt}. O maior da tríade é ${a[maior]}.`,
      });
      if (maior === i) {
        out.push({
          ...base(), foco: i, linha: 15, ok: true,
          nota: `${a[i]} já é o maior entre pai e filhos: ${contexto} está válido daqui para baixo e paro a descida.`,
        });
        return;
      }
      const subiu = a[maior];
      [a[i], a[maior]] = [a[maior], a[i]];
      swaps++;
      const antigo = i;
      i = maior;
      out.push({
        ...base(), foco: i, par: antigo, trocou: true, linha: 16,
        nota: `${subiu} sobe para ${antigo} e ${a[i]} desce para ${i}. Sigo só por este ramo: o outro filho e a subárvore dele já estavam válidos e continuam.`,
      });
    }
  };

  out.push({
    ...base(), linha: 0,
    nota: `Entrada: ${a.join(", ")}. Vou ordenar dentro deste mesmo array, sem alocar nada, em duas fases: primeiro viro tudo num max-heap, depois arranco o maior repetidas vezes.`,
  });

  // ---- fase 1 -------------------------------------------------------------
  const ultimoPai = Math.floor(total / 2) - 1;
  out.push({
    ...base(), foco: ultimoPai, linha: 3,
    nota: `Fase 1. Começo no índice ${ultimoPai} (${total} // 2 - 1), o último nó que tem filho. As ${total - 1 - ultimoPai} posições depois dele são folhas e não têm para onde descer.`,
  });
  for (let i = ultimoPai; i >= 0; i--) {
    out.push({
      ...base(), foco: i, linha: 4,
      nota: `Desço a partir de ${i} (valor ${a[i]}). Tudo abaixo já foi arrumado nas rodadas anteriores, então basta acertar este nó.`,
    });
    desce(i, "esta subárvore");
  }
  const compFase1 = comp;
  const swapsFase1 = swaps;
  out.push({
    ...base(), linha: 4, ok: true,
    nota: `Max-heap pronto: ${a.join(", ")}. Custou ${compFase1} comparações e ${swapsFase1} trocas. O array continua embaralhado aos olhos, mas o maior valor (${a[0]}) já está na posição 0, e é só disso que a fase 2 precisa.`,
  });

  // ---- fase 2 -------------------------------------------------------------
  fase = "ordenar";
  for (let fim = total - 1; fim > 0; fim--) {
    const maior = a[0];
    const trocado = a[fim];
    [a[0], a[fim]] = [a[fim], a[0]];
    swaps++;
    n = fim;
    out.push({
      ...base(), foco: 0, par: fim, trocou: true, linha: 7,
      nota: `${maior} é o maior do heap, então o lugar dele é a última posição livre, a ${fim}. Troco com ${trocado} e a posição ${fim} está resolvida para sempre.`,
    });
    out.push({
      ...base(), foco: 0, linha: 8,
      nota: `Agora encolho o heap: ele passa a ter ${n} elemento${n === 1 ? "" : "s"}. Da posição ${n} em diante o resultado já está pronto, e o desce vai tratar essa parte como se não existisse. É essa mentira controlada que faz o heap sort ordenar sem memória extra.`,
    });
    if (n > 1) desce(0, "o heap ativo");
  }

  fase = "fim";
  n = 0;
  out.push({
    ...base(), linha: 8, ok: true,
    nota: `Ordenado: ${a.join(", ")}. Total de ${comp} comparações e ${swaps} trocas, sendo ${compFase1} comparações só na fase 1. Nenhum array auxiliar foi criado: as ${total} posições do começo são as mesmas do fim.`,
  });
  return out;
}

function profundidade(i: number) {
  let d = 0;
  let x = i + 1;
  while (x > 1) {
    x >>= 1;
    d++;
  }
  return d;
}

const NO_R = 16;
const NIVEL_Y = 58;
const TOPO_Y = 18;

export function HeapSortVisualizer() {
  const [presetKey, setPresetKey] = useState("embaralhado");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(4);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const passos = useMemo(() => gerarPassos(preset.valores), [preset]);
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
  const trocarPreset = (k: string) => {
    reiniciar();
    setPresetKey(k);
  };

  // A árvore mostra só o heap ativo. Quem já foi ordenado sai dela e vive no
  // array, que é onde o aluno vê o resultado se formando.
  // A geometria vem do array COMPLETO, não do heap ativo: com o tamanho fixo, o
  // nó que sai do heap simplesmente some do lugar dele, e os que ficam não se
  // mexem. Se a árvore fosse redimensionada a cada rodada, pareceria que o
  // algoritmo está rearranjando tudo, que é exatamente o oposto do que acontece.
  const maxProf = profundidade(p.arr.length - 1);
  const colunas = Math.pow(2, maxProf);
  const largura = Math.max(300, colunas * 54);
  const W = largura + NO_R * 2;
  const H = TOPO_Y * 2 + maxProf * NIVEL_Y + NO_R * 2;
  const cx = (i: number) => {
    const d = profundidade(i);
    const pos = i - (Math.pow(2, d) - 1);
    return NO_R + ((pos + 0.5) * largura) / Math.pow(2, d);
  };
  const cy = (i: number) => TOPO_Y + NO_R + profundidade(i) * NIVEL_Y;

  const pctPasso = Math.round(((idx + 1) / total) * 100);
  const ordenados = p.arr.length - p.n;
  const rotuloFase = p.fase === "construir" ? "fase 1 · virando max-heap" : p.fase === "ordenar" ? "fase 2 · arrancando o maior" : "pronto";

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · heap sort: duas fases no mesmo array</span>
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
              className={`bigo-chip${presetKey === pr.key ? " on" : ""}`}
              onClick={() => trocarPreset(pr.key)}
              aria-pressed={presetKey === pr.key}
            >
              {pr.rotulo}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">{preset.dica}</p>

        <div className={`hs-fase f-${p.fase}`}>
          <span className="hs-fase-selo">{rotuloFase}</span>
          <span className="hs-fase-txt">
            heap ativo: posições 0 a {Math.max(p.n - 1, 0)} · já ordenado: {ordenados} de {p.arr.length}
          </span>
        </div>

        <div className="tt-arv-wrap">
          <svg
            className="tt-arv"
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Heap ativo com ${p.n} elementos. ${p.nota}`}
          >
            {p.arr.slice(0, p.n).map((_, i) =>
              [2 * i + 1, 2 * i + 2]
                .filter((f) => f < p.n)
                .map((f) => (
                  <line
                    key={`${i}-${f}`}
                    className={`tt-aresta${(p.foco === i && p.par === f) || (p.foco === f && p.par === i) ? " ativa" : ""}`}
                    x1={cx(i)}
                    y1={cy(i) + NO_R}
                    x2={cx(f)}
                    y2={cy(f) - NO_R}
                  />
                ))
            )}
            {p.arr.slice(0, p.n).map((v, i) => {
              const cls = ["tt-no"];
              if (i === p.foco) cls.push("on");
              else if (i === p.par) cls.push("aux");
              return (
                <g key={i} className={cls.join(" ")}>
                  <circle cx={cx(i)} cy={cy(i)} r={NO_R} />
                  <text x={cx(i)} y={cy(i) + 4} textAnchor="middle">
                    {v}
                  </text>
                </g>
              );
            })}
            {p.n === 0 && (
              <text className="hp-idx" x={W / 2} y={TOPO_Y + NO_R} textAnchor="middle">
                heap vazio: tudo virou resultado
              </text>
            )}
          </svg>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            O array, com a fronteira entre heap e resultado <em>verde = posição final, não se mexe mais</em>
          </div>
          <div className="hp-arr">
            {p.arr.map((v, i) => {
              const cls = ["hp-cel"];
              if (i >= p.n) cls.push("fixo");
              else if (i === p.foco) cls.push("foco");
              else if (i === p.par) cls.push("par");
              if (p.trocou && (i === p.foco || i === p.par)) cls.push("troca");
              return (
                <span key={i} className={cls.join(" ")}>
                  <i>{i}</i>
                  {v}
                </span>
              );
            })}
          </div>
        </div>

        <p className={"viz-note" + (p.ok ? " ok" : "")}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">heap_sort.py</div>
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
            <div className="viz-var">
              <span className="viz-var-name">n (heap ativo)</span>
              <span className="viz-var-val best">{p.n}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">i (foco)</span>
              <span className="viz-var-val">{p.foco >= 0 ? p.foco : "-"}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">maior candidato</span>
              <span className="viz-var-val">{p.par >= 0 ? p.par : "-"}</span>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>tamanho do array</span>
            <strong>{p.arr.length}</strong>
          </div>
          <div className="bigo-stat">
            <span>comparações</span>
            <strong>{p.comp}</strong>
          </div>
          <div className="bigo-stat">
            <span>trocas</span>
            <strong>{p.swaps}</strong>
          </div>
          <div className="bigo-stat">
            <span>memória extra</span>
            <strong>O(1)</strong>
          </div>
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
              setPasso((s) => Math.max(0, s - 1));
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
              setPasso((s) => Math.min(s + 1, total - 1));
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

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Rode até o fim nos presets &quot;embaralhado&quot;, &quot;já ordenado&quot; e &quot;ao contrário&quot; e
          anote o total de comparações: 38, 41 e 35. Dez valores, três entradas radicalmente diferentes, e o
          array já ordenado é justamente o que dá MAIS trabalho. Essa insensibilidade à entrada é a promessa
          do heap sort: o pior caso é igual ao melhor, e nenhuma entrada consegue derrubá-lo.
        </p>
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
