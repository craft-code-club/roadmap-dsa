"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// QuickSortVisualizer, a invariante da partição e o pivô que fica pronto.
//
// A única coisa que o aluno precisa enxergar é a INVARIANTE do laço de
// partição, porque é dela que sai tudo o mais. Em qualquer instante o trecho
// ativo está dividido em quatro regiões: os já conhecidos menores ou iguais ao
// pivô, os já conhecidos maiores, os ainda não vistos, e o pivô no fim. O laço
// só faz uma coisa, que é comer a região dos não vistos uma posição por vez.
//
// Por isso a faixa de regiões fica logo acima do array, com as quatro cores, e
// não um par de setas i/j soltas. Setas dizem onde os ponteiros estão; a faixa
// diz o que já se sabe, que é a informação que o algoritmo realmente carrega.
//
// A segunda ideia da tela é o contraste com o merge sort: aqui o pivô fica
// DEFINITIVO no meio do caminho, na descida. Por isso as posições de pivô já
// resolvidas continuam verdes mesmo quando a recursão está longe delas.
//
// Presets escolhidos para que três dos quatro sejam desastres, cada um por um
// motivo diferente: já ordenado, invertido e todos iguais. O quadrático do
// quick sort não é uma curiosidade teórica, ele mora nas entradas mais comuns
// que existem, e um preset "aleatório bonitinho" esconderia isso.
// ---------------------------------------------------------------------------

type Passo = {
  arr: number[];
  lo: number;
  hi: number;
  i: number; // fronteira dos menores ou iguais
  j: number; // varredura
  pivoIdx: number;
  // As faixas da invariante saem do GERADOR, não de uma reconstrução na
  // renderização: só aqui dentro se sabe se a posição j já foi classificada ou
  // se ela ainda está em exame, e reconstruir isso a partir de i e j fazia a
  // faixa contradizer a nota no passo da comparação.
  particionando: boolean;
  menorAte: number; // último índice comprovadamente <= pivô
  maiorAte: number; // último índice comprovadamente > pivô
  exame: number; // índice sendo examinado agora, ou -1
  fixos: number[];
  pilha: string[];
  comp: number;
  trocas: number;
  semEfeito: number;
  prof: number;
  linha: number;
  nota: string;
  ok?: boolean;
};

const CODIGO = [
  "def quick_sort(a, lo, hi):",
  "    if lo >= hi: return           # 0 ou 1 elemento",
  "    p = particiona(a, lo, hi)",
  "    quick_sort(a, lo, p - 1)      # menores que o pivô",
  "    quick_sort(a, p + 1, hi)      # maiores que o pivô",
  "",
  "def particiona(a, lo, hi):",
  "    pivo = a[hi]                  # o último é o pivô",
  "    i = lo                        # fronteira dos menores",
  "    for j in range(lo, hi):",
  "        if a[j] <= pivo:",
  "            a[i], a[j] = a[j], a[i]",
  "            i += 1",
  "    a[i], a[hi] = a[hi], a[i]     # pivô vai para o lugar dele",
  "    return i",
];

type Preset = { key: string; rotulo: string; valores: number[]; dica: string };

const PRESETS: Preset[] = [
  {
    key: "embaralhado",
    rotulo: "Embaralhado: 5 3 13 1 7 6 21 3",
    valores: [5, 3, 13, 1, 7, 6, 21, 3],
    dica: "O caso comum, e o único bom deste conjunto. Acompanhe a faixa de regiões: a região cinza (não vistos) só encolhe, nunca cresce, e quando ela zera o pivô entra no lugar definitivo dele.",
  },
  {
    key: "ordenado",
    rotulo: "Já ordenado: 1 2 3 4 5 6 7 8",
    valores: [1, 2, 3, 4, 5, 6, 7, 8],
    dica: "O desastre mais famoso do quick sort. Com o pivô fixo no último elemento, o maior valor é sempre o pivô, tudo cai à esquerda dele e a partição direita nasce vazia. Compare a profundidade da recursão com a do preset embaralhado.",
  },
  {
    key: "invertido",
    rotulo: "Ao contrário: 8 7 6 5 4 3 2 1",
    valores: [8, 7, 6, 5, 4, 3, 2, 1],
    dica: "O mesmo desastre pelo motivo oposto: o pivô é sempre o menor valor, nada cai à esquerda e a partição esquerda nasce vazia. As duas entradas mais previsíveis do mundo são as duas piores para este pivô.",
  },
  {
    key: "iguais",
    rotulo: "Todos iguais: 4 4 4 4 4 4 4 4",
    valores: [4, 4, 4, 4, 4, 4, 4, 4],
    dica: "O caso que mais surpreende. Não há nada para ordenar e mesmo assim o algoritmo faz o trabalho quadrático inteiro: como toda comparação passa no <=, a fronteira avança sempre e o pivô termina na última posição. Trocar o <= por < só inverte o lado do desastre.",
  },
];

const VELOCIDADES = [0, 1200, 800, 520, 320, 180];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

export function gerarPassos(valores: number[]): Passo[] {
  const a = [...valores];
  const out: Passo[] = [];
  let comp = 0;
  let trocas = 0;
  let semEfeito = 0;
  let profMax = 0;
  const fixos = new Set<number>();
  const pilha: string[] = [];
  const base = () => ({
    arr: [...a],
    i: -1,
    j: -1,
    pivoIdx: -1,
    particionando: false,
    menorAte: -1,
    maiorAte: -1,
    exame: -1,
    fixos: [...fixos],
    pilha: [...pilha],
    comp,
    trocas,
    semEfeito,
    prof: profMax,
  });
  const trocar = (x: number, y: number) => {
    trocas++;
    if (x === y) semEfeito++;
    else [a[x], a[y]] = [a[y], a[x]];
  };

  out.push({
    ...base(),
    lo: 0,
    hi: a.length - 1,
    linha: 0,
    nota: `Entrada: ${a.join(", ")}. O quick sort escolhe um pivô, joga os menores para a esquerda dele e os maiores para a direita, e com isso o pivô já fica na posição final. Depois repete nos dois lados.`,
  });

  const quick = (lo: number, hi: number, prof: number) => {
    if (lo > hi) return; // intervalo vazio: nem chega a virar quadro de pilha
    profMax = Math.max(profMax, prof);
    if (lo === hi) {
      fixos.add(lo);
      out.push({
        ...base(),
        lo,
        hi,
        linha: 1,
        ok: true,
        nota: `Trecho ${lo}..${lo} tem um elemento só (${a[lo]}). Um elemento sozinho já está ordenado, então esta chamada volta sem fazer nada.`,
      });
      return;
    }

    const pivo = a[hi];
    out.push({
      ...base(),
      lo,
      hi,
      pivoIdx: hi,
      linha: 7,
      nota: `Chamada no trecho ${lo}..${hi}. Escolho o último elemento como pivô: ${pivo}. Ele é só a referência de comparação por enquanto, e a posição final dele ainda vai ser descoberta.`,
    });

    let i = lo;
    out.push({
      ...base(),
      lo,
      hi,
      i,
      pivoIdx: hi,
      particionando: true,
      menorAte: lo - 1,
      maiorAte: lo - 1,
      linha: 8,
      nota: `A fronteira i começa em ${lo}. A promessa dela é: tudo antes de i já foi visto e é menor ou igual ao pivô. Agora ela está vazia, e a promessa vale de graça.`,
    });

    for (let j = lo; j < hi; j++) {
      comp++;
      const cabe = a[j] <= pivo;
      out.push({
        ...base(),
        lo,
        hi,
        i,
        j,
        pivoIdx: hi,
        particionando: true,
        menorAte: i - 1,
        maiorAte: j - 1,
        exame: j,
        linha: 10,
        nota: cabe
          ? `${a[j]} <= ${pivo}: este elemento pertence ao lado dos menores. Vou trocá-lo com quem está na fronteira e empurrar a fronteira uma casa.`
          : `${a[j]} > ${pivo}: este elemento fica onde está, do lado dos maiores. A fronteira não anda, e nenhuma escrita acontece.`,
      });
      if (cabe) {
        const igual = i === j;
        const [naFronteira, varrido] = [a[i], a[j]]; // valores ANTES da troca
        trocar(i, j);
        out.push({
          ...base(),
          lo,
          hi,
          i,
          j,
          pivoIdx: hi,
          particionando: true,
          menorAte: i,
          maiorAte: j,
          linha: 11,
          nota: igual
            ? `Troca da posição ${i} com ela mesma: quando nenhum elemento maior apareceu ainda, i e j andam colados. O esquema de Lomuto faz muito disso, e é um dos motivos de ele perder em número de escritas para outros esquemas de partição.`
            : `${varrido} sai da posição ${j} e vai para a fronteira, em ${i}; ${naFronteira} faz o caminho inverso. Repare que ${naFronteira} era maior que o pivô: ele só mudou de casa dentro da região dos maiores, e continua do lado certo.`,
        });
        i++;
        out.push({
          ...base(),
          lo,
          hi,
          i,
          j,
          pivoIdx: hi,
          particionando: true,
          menorAte: i - 1,
          maiorAte: j,
          linha: 12,
          nota: `A fronteira avança para ${i}. Agora as posições ${lo} a ${i - 1} são, todas, menores ou iguais a ${pivo}.`,
        });
      }
    }

    const igualFinal = i === hi;
    trocar(i, hi);
    fixos.add(i);
    const p = i;
    out.push({
      ...base(),
      lo,
      hi,
      i,
      pivoIdx: p,
      linha: 13,
      ok: true,
      nota: `A varredura acabou e o pivô vai para a fronteira: troco a posição ${i} com a ${hi}. ${
        igualFinal ? "As duas são a mesma, então nada se move, e mesmo assim " : ""
      }A posição ${p} está definitiva: ${a[p]} tem ${p - lo} valores menores ou iguais à esquerda e ${hi - p} maiores à direita, que é exatamente o lugar dele no array ordenado. Ele nunca mais será tocado.`,
    });

    // Só entra na pilha o que é de fato chamada pendente: com o pivô na última
    // posição o lado direito nasce vazio, e mostrar "8..7" como algo a resolver
    // faria o painel de chamadas mentir.
    const temDireita = p < hi;
    if (temDireita) pilha.push(`${p + 1}..${hi}`);
    out.push({
      ...base(),
      lo,
      hi,
      pivoIdx: p,
      linha: 3,
      nota: temDireita
        ? `Guardo o lado direito (${p + 1}..${hi}, ${hi - p} elemento${hi - p === 1 ? "" : "s"}) para depois e desço no lado esquerdo, ${lo}..${p - 1}, com ${p - lo} elemento${p - lo === 1 ? "" : "s"}.`
        : `O pivô ficou na última posição, então o lado direito nasce vazio: não há nada para guardar. Desço direto no lado esquerdo, ${lo}..${p - 1}, com ${p - lo} elemento${p - lo === 1 ? "" : "s"}. Partição assim, ${p - lo} contra 0, é a definição do pior caso.`,
    });
    quick(lo, p - 1, prof + 1);
    if (temDireita) pilha.pop();
    if (temDireita) {
      out.push({
        ...base(),
        lo,
        hi,
        pivoIdx: p,
        linha: 4,
        nota: `Esquerda resolvida. Agora o lado direito, ${p + 1}..${hi}.`,
      });
      quick(p + 1, hi, prof + 1);
    }
  };

  quick(0, a.length - 1, 1);
  for (let k = 0; k < a.length; k++) fixos.add(k);
  out.push({
    ...base(),
    lo: 0,
    hi: a.length - 1,
    linha: 1,
    ok: true,
    nota: `Ordenado: ${a.join(", ")}. Foram ${comp} comparações e ${trocas} trocas (${semEfeito} delas de um elemento com ele mesmo), com profundidade máxima de recursão ${profMax}. Nenhum array auxiliar foi criado: o único custo de memória é a pilha de chamadas.`,
  });
  return out;
}

export function QuickSortVisualizer() {
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
  const n = preset.valores.length;

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

  const pctPasso = Math.round(((idx + 1) / total) * 100);
  const fixos = new Set(p.fixos);

  // As cinco faixas da invariante, todas vindas do passo. A de "em exame" tem
  // uma posição só e existe porque, no instante da comparação, aquele elemento
  // ainda não pertence a nenhum dos dois lados.
  const regioes: { de: number; ate: number; cls: string; txt: string }[] = [];
  if (p.particionando) {
    const primeiroNaoVisto = (p.exame >= 0 ? p.exame : p.maiorAte) + 1;
    if (p.menorAte >= p.lo) regioes.push({ de: p.lo, ate: p.menorAte, cls: "menor", txt: "<= pivô" });
    if (p.maiorAte > p.menorAte) regioes.push({ de: p.menorAte + 1, ate: p.maiorAte, cls: "maior", txt: "> pivô" });
    if (p.exame >= 0) regioes.push({ de: p.exame, ate: p.exame, cls: "exame", txt: "em exame" });
    if (p.hi - 1 >= primeiroNaoVisto) regioes.push({ de: primeiroNaoVisto, ate: p.hi - 1, cls: "naovisto", txt: "não vistos" });
    regioes.push({ de: p.hi, ate: p.hi, cls: "pivo", txt: "pivô" });
  }

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · quick sort: a partição e o pivô que fica pronto</span>
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

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            A invariante da partição <em>o que o algoritmo já sabe sobre cada faixa</em>
          </div>
          <div className="ms-nivel-faixa" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {regioes.length > 0 ? (
              regioes.map((r) => (
                <span key={r.cls} className={`ms-seg ${r.cls}`} style={{ gridColumn: `${r.de + 1} / ${r.ate + 2}` }}>
                  {r.txt}
                </span>
              ))
            ) : (
              <span className="ms-seg" style={{ gridColumn: `1 / ${n + 1}` }}>
                nenhuma partição em andamento
              </span>
            )}
          </div>
          <div className="hp-arr" style={{ marginTop: 8 }}>
            {p.arr.map((v, k) => {
              const cls = ["hp-cel"];
              if (fixos.has(k)) cls.push("fixo");
              else if (k < p.lo || k > p.hi) cls.push("fantasma");
              if (k === p.pivoIdx) cls.push("pivo");
              else if (k === p.j) cls.push("par");
              else if (k === p.i) cls.push("alvo");
              return (
                <span key={k} className={cls.join(" ")}>
                  <i>{k}</i>
                  {v}
                </span>
              );
            })}
          </div>
        </div>

        <p className={"viz-note" + (p.ok ? " ok" : "")}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">quick_sort.py</div>
            <div className="viz-code-body">
              {CODIGO.map((txt, k) => (
                <div key={k} className={`viz-line${k === p.linha ? " on" : ""}`}>
                  <span className="ln">{k + 1}</span>
                  {txt}
                </div>
              ))}
            </div>
          </div>
          <div className="viz-vars">
            <div className="viz-vars-head">Variáveis</div>
            <div className="viz-var">
              <span className="viz-var-name">trecho ativo</span>
              <span className="viz-var-val best">
                {p.lo}..{p.hi}
              </span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">i (fronteira) / j (varre)</span>
              <span className="viz-var-val">
                {p.i >= 0 ? p.i : "-"} / {p.j >= 0 ? p.j : "-"}
              </span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">chamadas esperando</span>
              <span className="viz-var-val">{p.pilha.length > 0 ? p.pilha.join(" ") : "nenhuma"}</span>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>comparações</span>
            <strong>{p.comp}</strong>
          </div>
          <div className="bigo-stat">
            <span>trocas executadas</span>
            <strong>{p.trocas}</strong>
          </div>
          <div className="bigo-stat">
            <span>trocas sem efeito</span>
            <strong>{p.semEfeito}</strong>
          </div>
          <div className="bigo-stat">
            <span>profundidade da recursão</span>
            <strong>{p.prof}</strong>
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
          Rode até o fim e compare a profundidade da recursão: 4 no embaralhado e 8 nos três desastres. Com 8
          elementos, uma recursão de profundidade 8 quer dizer que cada partição eliminou um elemento só, que é
          a definição do pior caso. As comparações vão de 14 para 28, e 28 é exatamente n(n-1)/2, o mesmo custo
          do selection sort.
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
