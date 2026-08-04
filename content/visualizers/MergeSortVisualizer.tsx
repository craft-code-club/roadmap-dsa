"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// MergeSortVisualizer, a descida que não faz nada e a subida que faz tudo.
//
// A única coisa que o aluno precisa enxergar é ONDE o trabalho acontece. A
// intuição errada mais comum é achar que o merge sort "vai dividindo e
// ordenando"; ele não ordena nada na descida. Dividir é aritmética de índice, e
// a ordenação inteira mora na intercalação, que é a volta da recursão.
//
// Por isso a tela tem duas camadas que se movem juntas: as faixas de nível, que
// são o mapa da recursão inteira (cada trecho aparece no nível em que nasce, e
// fica verde quando volta ordenado), e o painel de intercalação, que só existe
// quando há dois lados prontos para comparar. Enquanto a faixa desce, o painel
// some: é essa ausência que ensina que a descida é de graça.
//
// A geometria das faixas vem do tamanho TOTAL do array, nunca do trecho ativo.
// Com o envelope fixo, o trecho ativo simplesmente acende no lugar dele, e o
// aluno consegue seguir uma posição específica do começo ao fim.
//
// Rejeitada a árvore em SVG com nós e arestas: ela desenha bem a estrutura da
// recursão e desalinha o trecho do array que cada nó representa, que é
// justamente a ligação que precisa ficar óbvia aqui.
// ---------------------------------------------------------------------------

type Merge = { esq: number[]; dir: number[]; i: number; j: number; saida: number[]; lo: number; escolhido: "esq" | "dir" | null };

type Passo = {
  arr: number[];
  lo: number;
  hi: number;
  mid: number;
  prontos: string[];
  merge: Merge | null;
  comp: number;
  copias: number;
  linha: number;
  nota: string;
  ok?: boolean;
};

const CODIGO = [
  "def merge_sort(a, lo, hi):",
  "    if lo >= hi: return      # 1 elemento já está ordenado",
  "    mid = lo + (hi - lo) // 2",
  "    merge_sort(a, lo, mid)       # resolve a esquerda",
  "    merge_sort(a, mid + 1, hi)   # resolve a direita",
  "    merge(a, lo, mid, hi)        # e só então ordena",
  "",
  "def merge(a, lo, mid, hi):",
  "    esq, dir = a[lo:mid + 1], a[mid + 1:hi + 1]",
  "    i = j = 0",
  "    for k in range(lo, hi + 1):",
  "        if j >= len(dir) or (i < len(esq) and esq[i] <= dir[j]):",
  "            a[k] = esq[i]; i += 1",
  "        else:",
  "            a[k] = dir[j]; j += 1",
];

type Preset = { key: string; rotulo: string; valores: number[]; dica: string };

const PRESETS: Preset[] = [
  {
    key: "sete",
    rotulo: "Sete valores: 38 27 43 3 9 82 10",
    valores: [38, 27, 43, 3, 9, 82, 10],
    dica: "Sete elementos, ou seja, divisão ímpar. Repare nas faixas de nível: o lado esquerdo fica com quatro posições e o direito com três, e a diferença entre os dois lados nunca passa de um elemento, por mais fundo que a recursão vá.",
  },
  {
    key: "ordenado",
    rotulo: "Já ordenado: 1 2 3 4 5 6 7 8",
    valores: [1, 2, 3, 4, 5, 6, 7, 8],
    dica: "A entrada já pronta. O merge sort desce e sobe a árvore inteira do mesmo jeito, e o único desconto aparece nas comparações: cada intercalação esvazia o lado esquerdo primeiro e copia o direito em bloco.",
  },
  {
    key: "pior",
    rotulo: "Pior caso: 1 3 2 7 4 6 5 8",
    valores: [1, 3, 2, 7, 4, 6, 5, 8],
    dica: "A entrada mais cara que existe para o merge sort com oito elementos, achada testando as 40.320 permutações possíveis. Ela custa 17 comparações. O melhor caso custa 12. Cinco comparações separam o melhor do pior, e é isso que quer dizer ter garantia.",
  },
  {
    key: "invertido",
    rotulo: "Ao contrário: 8 7 6 5 4 3 2 1",
    valores: [8, 7, 6, 5, 4, 3, 2, 1],
    dica: "A entrada mais hostil para quase todo algoritmo, e para o merge sort é só mais uma: custa as mesmas 12 comparações do array já ordenado. A estrutura da recursão não depende dos dados, então não existe entrada capaz de derrubá-lo.",
  },
];

const VELOCIDADES = [0, 1200, 800, 520, 320, 180];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

type Seg = { lo: number; hi: number; prof: number };

// O mapa da recursão é determinístico: depende só de n. Calcular fora do
// gerador deixa as faixas fixas, e é o que permite acompanhar uma posição.
export function segmentos(n: number): Seg[][] {
  const niveis: Seg[][] = [];
  const visitar = (lo: number, hi: number, prof: number) => {
    (niveis[prof] ??= []).push({ lo, hi, prof });
    if (lo >= hi) return;
    const mid = lo + ((hi - lo) >> 1);
    visitar(lo, mid, prof + 1);
    visitar(mid + 1, hi, prof + 1);
  };
  visitar(0, n - 1, 0);
  return niveis;
}

const chave = (lo: number, hi: number) => `${lo}-${hi}`;

export function gerarPassos(valores: number[]): Passo[] {
  const a = [...valores];
  const out: Passo[] = [];
  let comp = 0;
  let copias = 0;
  const prontos = new Set<string>();
  const base = () => ({ arr: [...a], mid: -1, prontos: [...prontos], merge: null as Merge | null, comp, copias });

  out.push({
    ...base(),
    lo: 0,
    hi: a.length - 1,
    linha: 0,
    nota: `Entrada: ${a.join(", ")}. O merge sort vai quebrar isto pela metade até sobrar um elemento por trecho, e só então começar a ordenar de verdade, na volta.`,
  });

  const ordenar = (lo: number, hi: number) => {
    if (lo >= hi) {
      prontos.add(chave(lo, hi));
      out.push({
        ...base(),
        lo,
        hi,
        linha: 1,
        ok: true,
        nota: `Trecho ${lo}..${lo} tem um elemento só (${a[lo]}). Um array de um elemento já está ordenado por definição, então este é o caso base e a descida para aqui.`,
      });
      return;
    }
    const mid = lo + ((hi - lo) >> 1);
    out.push({
      ...base(),
      lo,
      hi,
      mid,
      linha: 2,
      nota: `Divido o trecho ${lo}..${hi} (${a.slice(lo, hi + 1).join(", ")}) no meio: ${lo}..${mid} com ${mid - lo + 1} posições e ${mid + 1}..${hi} com ${hi - mid}. Nenhuma comparação acontece aqui: dividir é só aritmética de índice.`,
    });
    out.push({ ...base(), lo, hi, mid, linha: 3, nota: `Desço primeiro pela esquerda, ${lo}..${mid}. Só volto daqui com esse trecho ordenado.` });
    ordenar(lo, mid);
    out.push({ ...base(), lo, hi, mid, linha: 4, nota: `A esquerda voltou ordenada (${a.slice(lo, mid + 1).join(", ")}). Agora desço pela direita, ${mid + 1}..${hi}.` });
    ordenar(mid + 1, hi);

    // ---- intercalação: é aqui, e só aqui, que a ordenação acontece ---------
    const esq = a.slice(lo, mid + 1);
    const dir = a.slice(mid + 1, hi + 1);
    const saida: number[] = [];
    let i = 0;
    let j = 0;
    const m = (escolhido: "esq" | "dir" | null): Merge => ({ esq, dir, i, j, saida: [...saida], lo, escolhido });
    out.push({
      ...base(),
      lo,
      hi,
      mid,
      merge: m(null),
      linha: 8,
      nota: `Os dois lados voltaram ordenados: ${esq.join(", ")} e ${dir.join(", ")}. Agora intercalo os dois num buffer, e é esta operação que ordena. Todo o resto do algoritmo só existe para chegar aqui com os dois lados prontos.`,
    });
    for (let k = lo; k <= hi; k++) {
      const pegaEsq = j >= dir.length || (i < esq.length && esq[i] <= dir[j]);
      if (i < esq.length && j < dir.length) {
        comp++;
        out.push({
          ...base(),
          lo,
          hi,
          mid,
          merge: m(null),
          linha: 11,
          nota: `Comparo o topo dos dois lados: ${esq[i]} da esquerda contra ${dir[j]} da direita. ${
            esq[i] === dir[j]
              ? `Empate. O sinal é <=, então o da esquerda vai primeiro, e é essa escolha que torna o merge sort estável.`
              : `Vai o menor, ${Math.min(esq[i], dir[j])}, da ${pegaEsq ? "esquerda" : "direita"}.`
          }`,
        });
      } else {
        out.push({
          ...base(),
          lo,
          hi,
          mid,
          merge: m(null),
          linha: 11,
          nota: `A ${j >= dir.length ? "direita" : "esquerda"} acabou. Tudo que resta do outro lado já está ordenado e é maior que tudo que já saiu, então entra em bloco, sem nenhuma comparação.`,
          ok: true,
        });
      }
      const v = pegaEsq ? esq[i++] : dir[j++];
      saida.push(v);
      copias++;
      out.push({
        ...base(),
        lo,
        hi,
        mid,
        merge: m(pegaEsq ? "esq" : "dir"),
        linha: pegaEsq ? 12 : 14,
        nota: `${v} sai da ${pegaEsq ? "esquerda" : "direita"} e ocupa a posição ${k} do buffer. O ponteiro daquele lado anda uma casa; o outro fica parado.`,
      });
    }
    for (let k = 0; k < saida.length; k++) a[lo + k] = saida[k];
    prontos.add(chave(lo, hi));
    out.push({
      ...base(),
      lo,
      hi,
      mid,
      linha: 5,
      ok: true,
      nota: `Trecho ${lo}..${hi} ordenado: ${saida.join(", ")}. Ele volta pronto para quem chamou, e quem chamou vai usá-lo como um dos lados da próxima intercalação.`,
    });
  };

  ordenar(0, a.length - 1);
  out.push({
    ...base(),
    lo: 0,
    hi: a.length - 1,
    linha: 5,
    ok: true,
    nota: `Ordenado: ${a.join(", ")}. Foram ${comp} comparações e ${copias} cópias, com um buffer auxiliar do tamanho do trecho sendo intercalado. Esse buffer é o preço do merge sort, e é o que ele compra com uma garantia que nenhuma entrada quebra.`,
  });
  return out;
}

export function MergeSortVisualizer() {
  const [presetKey, setPresetKey] = useState("sete");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(4);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const passos = useMemo(() => gerarPassos(preset.valores), [preset]);
  const niveis = useMemo(() => segmentos(preset.valores.length), [preset]);
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
  const prontos = new Set(p.prontos);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · merge sort: a descida divide, a subida ordena</span>
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
            O mapa da recursão <em>azul = trecho ativo, verde = já voltou ordenado</em>
          </div>
          <div className="ms-niveis">
            {niveis.map((segs, prof) => (
              <div className="ms-nivel" key={prof}>
                <span className="ms-nivel-rot">nível {prof}</span>
                <div className="ms-nivel-faixa" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
                  {segs.map((s) => {
                    const cls = ["ms-seg"];
                    if (prontos.has(chave(s.lo, s.hi))) cls.push("pronto");
                    if (s.lo === p.lo && s.hi === p.hi) cls.push("ativo");
                    return (
                      <span key={`${s.lo}-${s.hi}`} className={cls.join(" ")} style={{ gridColumn: `${s.lo + 1} / ${s.hi + 2}` }}>
                        {s.lo === s.hi ? s.lo : `${s.lo}..${s.hi}`}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            O array <em>as posições fora do trecho ativo ficam apagadas</em>
          </div>
          <div className="hp-arr">
            {p.arr.map((v, i) => {
              const cls = ["hp-cel"];
              if (i < p.lo || i > p.hi) cls.push("fantasma");
              else if (p.mid >= 0 && i <= p.mid) cls.push("foco");
              else cls.push("par");
              return (
                <span key={i} className={cls.join(" ")}>
                  <i>{i}</i>
                  {v}
                </span>
              );
            })}
          </div>
        </div>

        {p.merge ? (
          <div className="hp-bloco">
            <div className="tt-painel-tit">
              A intercalação <em>o algoritmo inteiro existe para chegar aqui</em>
            </div>
            <div className="ms-merge">
              <div className="ms-lado">
                <span className="ms-lado-rot">esquerda</span>
                <div className="hp-arr">
                  {p.merge.esq.map((v, k) => (
                    <span key={k} className={`hp-cel${k < p.merge!.i ? " fantasma" : k === p.merge!.i ? " foco" : ""}`}>
                      <i>{p.merge!.lo + k}</i>
                      {v}
                    </span>
                  ))}
                </div>
              </div>
              <div className="ms-lado">
                <span className="ms-lado-rot">direita</span>
                <div className="hp-arr">
                  {p.merge.dir.map((v, k) => (
                    <span key={k} className={`hp-cel${k < p.merge!.j ? " fantasma" : k === p.merge!.j ? " par" : ""}`}>
                      <i>{p.merge!.lo + p.merge!.esq.length + k}</i>
                      {v}
                    </span>
                  ))}
                </div>
              </div>
              <div className="ms-lado saida">
                <span className="ms-lado-rot">buffer de saída</span>
                <div className="hp-arr">
                  {p.merge.saida.map((v, k) => (
                    <span key={k} className={`hp-cel fixo${k === p.merge!.saida.length - 1 && p.merge!.escolhido ? " troca" : ""}`}>
                      <i>{p.merge!.lo + k}</i>
                      {v}
                    </span>
                  ))}
                  {p.merge.saida.length === 0 ? <span className="bb-array-nota">vazio</span> : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <p className={"viz-note" + (p.ok ? " ok" : "")}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">merge_sort.py</div>
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
              <span className="viz-var-name">trecho ativo</span>
              <span className="viz-var-val best">
                {p.lo}..{p.hi}
              </span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">mid</span>
              <span className="viz-var-val">{p.mid >= 0 ? p.mid : "-"}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">i, j (topo de cada lado)</span>
              <span className="viz-var-val">{p.merge ? `${p.merge.i}, ${p.merge.j}` : "-"}</span>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>tamanho do array</span>
            <strong>{n}</strong>
          </div>
          <div className="bigo-stat">
            <span>comparações</span>
            <strong>{p.comp}</strong>
          </div>
          <div className="bigo-stat">
            <span>cópias para o buffer</span>
            <strong>{p.copias}</strong>
          </div>
          <div className="bigo-stat">
            <span>níveis de recursão</span>
            <strong>{niveis.length}</strong>
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
          Rode até o fim nos três presets de oito elementos e anote as comparações: 12 no já ordenado, 12 no
          invertido e 17 no pior caso. Toda entrada de oito elementos cai nessa faixa, sem exceção. As cópias
          são 24 nos três, sempre, porque as 3 rodadas de intercalação movem os 8 elementos uma vez cada. Para
          efeito de comparação, o insertion sort vai de 7 a 28 comparações no mesmo tamanho de array.
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
