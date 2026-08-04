"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// ShellSortVisualizer, o insertion sort com a constante 1 virando variável.
//
// A única coisa que o aluno precisa enxergar é que o shell sort NÃO é um
// algoritmo novo: é o insertion sort com o passo de comparação trocado. Por
// isso o painel de código mostra o corpo do insertion sort inteiro, e a única
// linha que muda em relação a ele é a que usa `gap` no lugar de `1`.
//
// A segunda ideia, e a que faz o algoritmo fazer sentido, é a CADEIA: com gap
// h, o elemento da posição i só conversa com i - h, i - 2h, e assim por diante.
// O array vira h subsequências entrelaçadas, e cada uma é ordenada por inserção
// sem saber que as outras existem. Por isso a cadeia do elemento atual fica
// marcada no array, e não só o par que está sendo comparado: um par isolado faz
// o algoritmo parecer arbitrário, a cadeia faz ele parecer óbvio.
//
// A geometria vem do array completo e não muda com o gap, de propósito: é a
// mesma fita, relida com passos diferentes.
// ---------------------------------------------------------------------------

type Passo = {
  arr: number[];
  gap: number;
  i: number;
  j: number;
  atual: number;
  cadeia: number[];
  comp: number;
  escritas: number;
  linha: number;
  nota: string;
  ok?: boolean;
};

const CODIGO = [
  "def shell_sort(a):",
  "    n = len(a)",
  "    gap = n // 2                     # sequência original de Shell",
  "    while gap > 0:",
  "        for i in range(gap, n):",
  "            atual = a[i]",
  "            j = i",
  "            while j >= gap and a[j - gap] > atual:",
  "                a[j] = a[j - gap]    # empurra pelo gap",
  "                j -= gap",
  "            a[j] = atual",
  "        gap //= 2                    # e no fim gap = 1: insertion sort",
];

type Preset = { key: string; rotulo: string; valores: number[]; dica: string };

const PRESETS: Preset[] = [
  {
    key: "embaralhado",
    rotulo: "Embaralhado: 5 3 21 13 1 7 6 15",
    valores: [5, 3, 21, 13, 1, 7, 6, 15],
    dica: "Com oito elementos os gaps são 4, 2 e 1. Repare no tamanho do caminho para trás em cada rodada: no gap 4 os saltos são longos e raros, no gap 1 eles são curtíssimos, porque o trabalho pesado já foi feito.",
  },
  {
    key: "fim",
    rotulo: "O menor lá no fim: 2 3 4 5 6 7 8 1",
    valores: [2, 3, 4, 5, 6, 7, 8, 1],
    dica: "O pesadelo do insertion sort: um array quase ordenado com um único elemento fora do lugar, na pior posição possível. Para trazer o 1 da última posição até a primeira, o insertion sort precisa de 7 deslocamentos, um por vizinho. Aqui bastam dois: um salto de 4 e depois um de 2.",
  },
  {
    key: "invertido",
    rotulo: "Ao contrário: 21 15 13 7 6 5 3 1",
    valores: [21, 15, 13, 7, 6, 5, 3, 1],
    dica: "Todas as 28 inversões possíveis, e a única entrada deste conjunto em que o shell sort já ganha com oito elementos: 22 comparações e 29 escritas, contra 28 e 35 do insertion sort. Os gaps grandes desfazem várias inversões por movimento, em vez de uma por uma.",
  },
  {
    key: "ordenado",
    rotulo: "Já ordenado: 1 3 5 6 7 13 15 21",
    valores: [1, 3, 5, 6, 7, 13, 15, 21],
    dica: "Nenhum deslocamento acontece em nenhuma rodada, e mesmo assim as comparações são feitas. É o preço de ter três rodadas em vez de uma: o shell sort perde para o insertion sort exatamente na entrada em que o insertion sort é imbatível.",
  },
];

const VELOCIDADES = [0, 1200, 800, 520, 320, 180];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

const cadeiaDe = (i: number, gap: number, n: number) => {
  const c: number[] = [];
  for (let k = i % gap; k < n; k += gap) c.push(k);
  return c;
};

export function gerarPassos(valores: number[]): Passo[] {
  const a = [...valores];
  const n = a.length;
  const out: Passo[] = [];
  let comp = 0;
  let escritas = 0;
  let gap = Math.floor(n / 2);
  const base = () => ({ arr: [...a], gap, i: -1, j: -1, atual: -1, cadeia: [] as number[], comp, escritas });

  out.push({
    ...base(),
    linha: 0,
    nota: `Entrada: ${a.join(", ")}. O shell sort é o insertion sort com uma diferença: em vez de comparar com o vizinho imediato, ele compara com quem está a gap posições de distância. O gap começa grande e termina em 1.`,
  });

  while (gap > 0) {
    const quantas = gap;
    out.push({
      ...base(),
      linha: 3,
      nota: `Rodada com gap ${gap}. Isso divide o array em ${quantas} subsequências entrelaçadas: os índices 0, ${gap}, ${2 * gap}... formam uma, os índices 1, ${1 + gap}... formam outra, e assim por diante. Cada uma vai ser ordenada por inserção, sem saber que as outras existem.`,
    });
    for (let i = gap; i < n; i++) {
      const atual = a[i];
      const cadeia = cadeiaDe(i, gap, n);
      out.push({
        ...base(),
        i,
        atual,
        cadeia,
        linha: 5,
        nota: `Pego ${atual} da posição ${i}. A subsequência dele é ${cadeia.join(", ")}, e é só dentro dela que ele vai procurar lugar. Tudo que está entre esses índices é problema de outra subsequência.`,
      });
      let j = i;
      let passos = 0;
      while (j >= gap) {
        comp++;
        if (!(a[j - gap] > atual)) {
          out.push({
            ...base(),
            i,
            j,
            atual,
            cadeia,
            linha: 7,
            nota: `${a[j - gap]} (posição ${j - gap}) não é maior que ${atual}: parei. Dentro desta subsequência, a posição ${j} é o lugar dele.`,
          });
          break;
        }
        a[j] = a[j - gap];
        escritas++;
        passos++;
        out.push({
          ...base(),
          i,
          j: j - gap,
          atual,
          cadeia,
          linha: 8,
          nota: `${a[j]} é maior que ${atual}, então empurro ele ${gap} posição${gap === 1 ? "" : "ões"} para a frente, da ${j - gap} para a ${j}. Um empurrão de ${gap} desfaz de uma vez várias inversões que o insertion sort desfaria uma a uma.`,
        });
        j -= gap;
      }
      if (j < gap && j !== i) {
        out.push({
          ...base(),
          i,
          j,
          atual,
          cadeia,
          linha: 7,
          nota: `Cheguei ao começo da subsequência: não existe posição ${j - gap}. O lugar de ${atual} é a posição ${j}.`,
        });
      }
      a[j] = atual;
      escritas++;
      out.push({
        ...base(),
        i,
        j,
        atual,
        cadeia,
        linha: 10,
        ok: passos === 0,
        nota:
          passos === 0
            ? `${atual} já estava no lugar certo dentro da subsequência dele: nenhum deslocamento. A escrita acontece do mesmo jeito, porque o código guarda o valor e devolve.`
            : `${atual} entra na posição ${j} depois de ${passos} deslocamento${passos === 1 ? "" : "s"} de ${gap}. Ele andou ${i - j} posições no array, e para isso bastaram ${passos} escrita${passos === 1 ? "" : "s"}.`,
      });
    }
    const antes = gap;
    gap = Math.floor(gap / 2);
    out.push({
      ...base(),
      linha: 11,
      ok: true,
      nota:
        gap > 0
          ? `Fim da rodada de gap ${antes}: ${a.join(", ")}. O array não está ordenado, mas está ${antes}-ordenado, ou seja, cada elemento é menor ou igual ao que está ${antes} casas à frente. Agora o gap cai para ${gap}, e o mais importante: essa propriedade não se perde nas rodadas seguintes.`
          : `Fim da rodada de gap 1, que é o insertion sort puro: ${a.join(", ")}. Ele só teve trabalho leve porque as rodadas anteriores já tinham aproximado tudo do lugar.`,
    });
  }

  out.push({
    ...base(),
    linha: 11,
    ok: true,
    nota: `Ordenado: ${a.join(", ")}. Foram ${comp} comparações e ${escritas} escritas, sem nenhuma memória extra. A única diferença para o insertion sort é a constante 1 ter virado a variável gap.`,
  });
  return out;
}

export function ShellSortVisualizer() {
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

  const pctPasso = Math.round(((idx + 1) / total) * 100);
  const naCadeia = new Set(p.cadeia);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · shell sort: o insertion sort com gap</span>
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

        <div className={`hs-fase ${p.gap === 1 ? "f-fim" : "f-ordenar"}`}>
          <span className="hs-fase-selo">gap {p.gap}</span>
          <span className="hs-fase-txt">
            {p.gap === 1
              ? "esta é a última rodada, e ela é o insertion sort puro"
              : `o array é lido como ${p.gap} subsequências entrelaçadas, uma a cada ${p.gap} posições`}
          </span>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            O array <em>roxo = a subsequência do elemento na mão, ou seja, com quem ele pode conversar</em>
          </div>
          <div className="hp-arr">
            {p.arr.map((v, k) => {
              const cls = ["hp-cel"];
              if (naCadeia.has(k)) cls.push("alvo");
              if (k === p.i) cls.push("foco");
              else if (k === p.j) cls.push("par");
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
            <div className="viz-code-head">shell_sort.py</div>
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
              <span className="viz-var-name">gap</span>
              <span className="viz-var-val best">{p.gap}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">atual (na mão)</span>
              <span className="viz-var-val">{p.atual >= 0 ? p.atual : "-"}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">j (posição candidata)</span>
              <span className="viz-var-val">{p.j >= 0 ? p.j : "-"}</span>
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
            <span>escritas no array</span>
            <strong>{p.escritas}</strong>
          </div>
          <div className="bigo-stat">
            <span>subsequências deste gap</span>
            <strong>{p.gap}</strong>
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
          Uma honestidade necessária: com oito elementos e a sequência original de Shell, o algoritmo quase
          sempre <strong>perde</strong> para o insertion sort, e isso não é defeito de implementação. São três
          rodadas de laço para um array minúsculo, e o custo fixo não se paga. Das quatro entradas aqui, a
          invertida é a única em que ele já ganha (22 comparações contra 28). O visualizador seguinte mostra as
          duas saídas para isso: trocar a sequência de gaps, que já vira a conta neste tamanho, e deixar o
          array crescer, que com 128 elementos abre uma diferença de mais de quatro vezes.
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
