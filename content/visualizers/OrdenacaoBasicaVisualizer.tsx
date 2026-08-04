"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// OrdenacaoBasicaVisualizer, os três O(n²) sobre exatamente o mesmo array.
//
// A única coisa que o aluno precisa enxergar aqui é que os três algoritmos
// resolvem o MESMO problema com movimentos completamente diferentes, e que a
// diferença de movimento é o que explica todo o resto (estabilidade, número de
// escritas, melhor caso). Por isso o seletor de algoritmo fica ao lado do
// seletor de entrada: trocar um e manter o outro é o experimento.
//
// A escolha mais importante é a faixa colorida do array ter DOIS significados
// distintos e nomeados: "posição final" (bubble e selection, que nunca mais
// tocam naquele índice) e "trecho ordenado entre si" (insertion, cujo prefixo
// está em ordem mas ainda vai receber elementos no meio). Tratar os dois como a
// mesma coisa é o erro mais comum de quem desenha esta visualização, e ensina
// que o insertion sort "já resolveu" posições que ele ainda vai mexer.
//
// Rejeitado: barras de altura proporcional (o clássico das animações). Elas são
// bonitas em movimento e péssimas para acompanhar UM elemento específico, que é
// justamente o que a explicação de estabilidade e de custo exige.
// ---------------------------------------------------------------------------

export type Algo = "bubble" | "selection" | "insertion";

type Regiao = { de: number; ate: number; tipo: "final" | "ordenada" };

type Passo = {
  arr: number[];
  foco: number; // o elemento em foco (o que está sendo colocado)
  par: number; // o elemento com quem se compara
  marca: number; // auxiliar: o menor encontrado até agora (selection)
  naMao: number; // o valor guardado na variável temporária (insertion), ou -1
  regiao: Regiao | null;
  escreveu: boolean;
  comp: number;
  escritas: number;
  linha: number;
  nota: string;
  ok?: boolean;
};

const CODIGO: Record<Algo, string[]> = {
  bubble: [
    "def bubble_sort(a):",
    "    n = len(a)",
    "    for fim in range(n - 1, 0, -1):",
    "        trocou = False",
    "        for j in range(fim):",
    "            if a[j] > a[j + 1]:",
    "                a[j], a[j + 1] = a[j + 1], a[j]",
    "                trocou = True",
    "        if not trocou:",
    "            break        # já estava ordenado",
  ],
  selection: [
    "def selection_sort(a):",
    "    n = len(a)",
    "    for i in range(n - 1):",
    "        menor = i",
    "        for j in range(i + 1, n):",
    "            if a[j] < a[menor]:",
    "                menor = j",
    "        if menor != i:",
    "            a[i], a[menor] = a[menor], a[i]",
  ],
  insertion: [
    "def insertion_sort(a):",
    "    for i in range(1, len(a)):",
    "        atual = a[i]      # a carta na mão",
    "        j = i - 1",
    "        while j >= 0 and a[j] > atual:",
    "            a[j + 1] = a[j]   # abre espaço",
    "            j -= 1",
    "        a[j + 1] = atual  # encaixa",
  ],
};

export const NOMES: Record<Algo, string> = {
  bubble: "Bubble sort",
  selection: "Selection sort",
  insertion: "Insertion sort",
};

type Preset = { key: string; rotulo: string; valores: number[]; dica: string };

export const PRESETS: Preset[] = [
  {
    key: "embaralhado",
    rotulo: "Embaralhado: 5 3 21 13 1 7 6 15",
    valores: [5, 3, 21, 13, 1, 7, 6, 15],
    dica: "O caso comum. Rode os três e compare o card de escritas no array: os oito valores são os mesmos, o resultado é o mesmo, e o trabalho para chegar lá não é nem parecido.",
  },
  {
    key: "ordenado",
    rotulo: "Já ordenado: 1 3 5 6 7 13 15 21",
    valores: [1, 3, 5, 6, 7, 13, 15, 21],
    dica: "A entrada de sonho. Bubble e insertion percebem e saem em 7 comparações; o selection varre as 28 assim mesmo, porque ele não tem como saber que já está pronto sem olhar tudo.",
  },
  {
    key: "invertido",
    rotulo: "Ao contrário: 21 15 13 7 6 5 3 1",
    valores: [21, 15, 13, 7, 6, 5, 3, 1],
    dica: "A entrada mais hostil possível: as 28 inversões estão todas lá. Aqui os três fazem 28 comparações, e a diferença aparece toda no número de escritas.",
  },
  {
    key: "quase",
    rotulo: "Quase ordenado: 1 3 5 7 6 13 15 21",
    valores: [1, 3, 5, 7, 6, 13, 15, 21],
    dica: "Uma única inversão no meio de tudo. É o cenário em que o insertion sort humilha os outros dois, e é por isso que ele sobrevive dentro das bibliotecas modernas.",
  },
];

const VELOCIDADES = [0, 1200, 800, 520, 320, 180];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

// Inversões: pares (i < j) com a[i] > a[j]. É a lei de conservação da tela.
// Bubble e insertion pagam exatamente uma operação por inversão; selection não.
export function inversoes(v: number[]): number {
  let n = 0;
  for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (v[i] > v[j]) n++;
  return n;
}

function gerarPassos(algo: Algo, valores: number[]): Passo[] {
  const a = [...valores];
  const n = a.length;
  const out: Passo[] = [];
  let comp = 0;
  let escritas = 0;
  let regiao: Regiao | null = null;
  const base = () => ({ arr: [...a], foco: -1, par: -1, marca: -1, naMao: -1, regiao, escreveu: false, comp, escritas });

  out.push({
    ...base(),
    linha: 0,
    nota: `Entrada: ${a.join(", ")}. ${NOMES[algo]} vai ordenar dentro deste mesmo array, sem alocar nada. Acompanhe os dois contadores: comparações e escritas no array.`,
  });

  if (algo === "bubble") {
    let saiuCedo = false;
    for (let fim = n - 1; fim > 0; fim--) {
      let trocou = false;
      out.push({
        ...base(),
        linha: 2,
        nota:
          fim === n - 1
            ? `Primeira passada, indo até a última posição. Ainda não sei nada sobre o array, então preciso comparar todos os vizinhos.`
            : `Passada nova, indo só até a posição ${fim}. As ${n - 1 - fim} posições depois dela já estão resolvidas para sempre, então nem olho para elas.`,
      });
      for (let j = 0; j < fim; j++) {
        comp++;
        const troca = a[j] > a[j + 1];
        out.push({
          ...base(),
          foco: j,
          par: j + 1,
          linha: 5,
          nota: troca
            ? `${a[j]} > ${a[j + 1]}: os dois estão fora de ordem entre si, então troco.`
            : `${a[j]} não é maior que ${a[j + 1]}: este par já está em ordem, sigo em frente sem tocar em nada.`,
        });
        if (troca) {
          const [x, y] = [a[j], a[j + 1]];
          [a[j], a[j + 1]] = [a[j + 1], a[j]];
          escritas += 2;
          trocou = true;
          out.push({
            ...base(),
            foco: j + 1,
            par: j,
            escreveu: true,
            linha: 6,
            nota: `${x} andou uma casa para a direita e ${y} uma para a esquerda. Foi uma troca entre vizinhos: ninguém pulou por cima de ninguém, e é isso que torna o bubble sort estável.`,
          });
        }
      }
      regiao = { de: fim, ate: n - 1, tipo: "final" };
      out.push({
        ...base(),
        linha: 8,
        ok: !trocou,
        nota: trocou
          ? `Fim da passada: o maior valor desta faixa (${a[fim]}) chegou à posição ${fim} e não sai mais de lá. Encolho o limite e recomeço.`
          : `Esta passada inteira não trocou nada. Isso só acontece quando cada vizinho já é maior que o anterior, ou seja, o array está ordenado. Paro aqui, sem fazer as ${(fim * (fim + 1)) / 2} comparações que ainda faltariam.`,
      });
      if (!trocou) {
        saiuCedo = true;
        break;
      }
    }
    if (!saiuCedo) regiao = { de: 0, ate: n - 1, tipo: "final" };
  }

  if (algo === "selection") {
    for (let i = 0; i < n - 1; i++) {
      let menor = i;
      out.push({
        ...base(),
        foco: i,
        marca: menor,
        linha: 3,
        nota: `Vou preencher a posição ${i}. Por enquanto o candidato a menor é o próprio ${a[i]}, e eu ainda não sei nada sobre o resto.`,
      });
      for (let j = i + 1; j < n; j++) {
        comp++;
        const anterior = menor; // o candidato ANTES desta comparação
        const melhor = a[j] < a[menor];
        if (melhor) menor = j;
        out.push({
          ...base(),
          foco: i,
          par: j,
          marca: menor,
          linha: 5,
          nota: melhor
            ? `${a[j]} é menor que ${a[anterior]} (posição ${anterior}): achei um candidato melhor, o menor passa a ser o da posição ${j}.`
            : `${a[j]} não é menor que ${a[anterior]}: o candidato continua sendo o da posição ${anterior}. Mesmo assim tive que olhar, e é por isso que este algoritmo não tem melhor caso.`,
        });
      }
      if (menor !== i) {
        const [x, y] = [a[i], a[menor]];
        const distancia = menor - i;
        [a[i], a[menor]] = [a[menor], a[i]];
        escritas += 2;
        out.push({
          ...base(),
          foco: i,
          par: menor,
          marca: -1,
          escreveu: true,
          linha: 8,
          nota: `${y} vem da posição ${menor} direto para a ${i}, um salto de ${distancia} casa${distancia === 1 ? "" : "s"}, e ${x} vai no lugar dele. Salto longo assim pode passar por cima de um valor igual, e é exatamente daí que vem a instabilidade do selection sort.`,
        });
      } else {
        out.push({
          ...base(),
          foco: i,
          marca: -1,
          linha: 7,
          nota: `O menor já era o próprio ${a[i]}: nenhuma escrita nesta rodada. As ${n - 1 - i} comparações, porém, foram feitas do mesmo jeito.`,
        });
      }
      regiao = { de: 0, ate: i, tipo: "final" };
      out.push({
        ...base(),
        linha: 2,
        nota: `Posição ${i} fechada com ${a[i]}. As posições 0 a ${i} estão definitivas e nunca mais serão tocadas.`,
      });
    }
    regiao = { de: 0, ate: n - 1, tipo: "final" };
  }

  if (algo === "insertion") {
    regiao = { de: 0, ate: 0, tipo: "ordenada" };
    for (let i = 1; i < n; i++) {
      const atual = a[i];
      out.push({
        ...base(),
        naMao: atual,
        foco: i,
        linha: 2,
        nota: `Pego ${atual} na mão. Tudo da posição 0 até a ${i - 1} já está em ordem entre si, então basta achar onde ${atual} se encaixa nesse trecho.`,
      });
      let j = i - 1;
      let deslocou = 0;
      while (j >= 0) {
        comp++;
        if (!(a[j] > atual)) {
          out.push({
            ...base(),
            naMao: atual,
            foco: j,
            par: i,
            linha: 4,
            nota: `${a[j]} não é maior que ${atual}: parei. Achei o lugar, logo depois da posição ${j}. Empate também para aqui, e é isso que preserva a ordem original entre iguais.`,
          });
          break;
        }
        a[j + 1] = a[j];
        escritas++;
        deslocou++;
        out.push({
          ...base(),
          naMao: atual,
          foco: j + 1,
          par: j,
          escreveu: true,
          linha: 5,
          nota: `${a[j + 1]} é maior que ${atual}, então empurro ele uma casa para a direita para abrir espaço. Cada empurrão desses corresponde a exatamente uma inversão da entrada.`,
        });
        j--;
      }
      a[j + 1] = atual;
      escritas++;
      regiao = { de: 0, ate: i, tipo: "ordenada" };
      out.push({
        ...base(),
        naMao: atual,
        foco: j + 1,
        escreveu: true,
        linha: 7,
        nota: `${atual} entra na posição ${j + 1} depois de ${deslocou} deslocamento${deslocou === 1 ? "" : "s"}. Atenção: o trecho 0 a ${i} está ordenado entre si, mas nenhuma dessas posições é definitiva, porque um valor pequeno lá na frente ainda vai entrar no meio delas.`,
        ok: deslocou === 0,
      });
    }
    regiao = { de: 0, ate: n - 1, tipo: "final" };
  }

  out.push({
    ...base(),
    linha: CODIGO[algo].length - 1,
    ok: true,
    nota: `Ordenado: ${a.join(", ")}. ${comp} comparações e ${escritas} escritas no array, sem nenhuma memória extra além de uma variável de apoio.`,
  });
  return out;
}

export const ALGOS: Algo[] = ["bubble", "selection", "insertion"];

// O custo total sai do MESMO gerador que a animação, de propósito: assim a
// corrida ao lado não tem como divergir do que o passo a passo mostra na tela.
export function custo(algo: Algo, valores: number[]): { comp: number; escritas: number } {
  const ps = gerarPassos(algo, valores);
  const f = ps[ps.length - 1];
  return { comp: f.comp, escritas: f.escritas };
}

export function OrdenacaoBasicaVisualizer() {
  const [algo, setAlgo] = useState<Algo>("bubble");
  const [presetKey, setPresetKey] = useState("embaralhado");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(4);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const passos = useMemo(() => gerarPassos(algo, preset.valores), [algo, preset]);
  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];
  const inv = useMemo(() => inversoes(preset.valores), [preset]);

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
  const trocarAlgo = (k: Algo) => {
    reiniciar();
    setAlgo(k);
  };
  const trocarPreset = (k: string) => {
    reiniciar();
    setPresetKey(k);
  };

  const pctPasso = Math.round(((idx + 1) / total) * 100);
  const naRegiao = (i: number) => p.regiao !== null && i >= p.regiao.de && i <= p.regiao.ate;
  const rotuloRegiao =
    p.regiao === null
      ? "nada resolvido ainda"
      : p.regiao.tipo === "final"
        ? `posições ${p.regiao.de} a ${p.regiao.ate} definitivas: não são mais tocadas`
        : `posições ${p.regiao.de} a ${p.regiao.ate} ordenadas entre si, mas ainda podem receber elementos no meio`;

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · os três O(n²) sobre o mesmo array</span>
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
          {ALGOS.map((k) => (
            <button
              key={k}
              className={`bigo-chip${algo === k ? " on" : ""}`}
              onClick={() => trocarAlgo(k)}
              aria-pressed={algo === k}
            >
              {NOMES[k]}
            </button>
          ))}
        </div>
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

        <div className={`hs-fase ${p.regiao === null ? "" : p.regiao.tipo === "final" ? "f-fim" : "f-ordenar"}`}>
          <span className="hs-fase-selo">{NOMES[algo]}</span>
          <span className="hs-fase-txt">{rotuloRegiao}</span>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            O array <em>{p.regiao?.tipo === "ordenada" ? "verde = ordenado entre si, ainda não definitivo" : "verde = posição final"}</em>
          </div>
          <div className="hp-arr">
            {p.arr.map((v, i) => {
              const cls = ["hp-cel"];
              if (naRegiao(i)) cls.push(p.regiao?.tipo === "final" ? "fixo" : "quase");
              if (i === p.foco) cls.push("foco");
              else if (i === p.par) cls.push("par");
              else if (i === p.marca) cls.push("alvo");
              if (p.escreveu && (i === p.foco || i === p.par)) cls.push("troca");
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
            <div className="viz-code-head">{algo}_sort.py</div>
            <div className="viz-code-body">
              {CODIGO[algo].map((txt, i) => (
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
              <span className="viz-var-name">
                {algo === "insertion" ? "atual (valor na mão)" : algo === "selection" ? "a[i] (posição a preencher)" : "a[j] (esquerda do par)"}
              </span>
              <span className="viz-var-val best">
                {algo === "insertion" ? (p.naMao >= 0 ? p.naMao : "-") : p.foco >= 0 ? p.arr[p.foco] : "-"}
              </span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">
                {algo === "selection" ? "a[j] (candidato da varredura)" : algo === "insertion" ? "a[j] (comparado)" : "a[j+1] (direita do par)"}
              </span>
              <span className="viz-var-val">{p.par >= 0 ? p.arr[p.par] : "-"}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">
                {algo === "selection" ? "menor (índice)" : algo === "bubble" ? "posições finais" : "trecho ordenado entre si"}
              </span>
              <span className="viz-var-val">
                {algo === "selection" ? (p.marca >= 0 ? p.marca : "-") : p.regiao === null ? 0 : p.regiao.ate - p.regiao.de + 1}
              </span>
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
            <span>inversões da entrada</span>
            <strong>{inv}</strong>
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
          Rode os três no preset &quot;embaralhado&quot; e anote as comparações: 25, 28 e 17. Agora rode em
          &quot;já ordenado&quot;: 7, 28 e 7. O selection sort faz as mesmas 28 comparações nas duas entradas,
          porque ele precisa varrer o resto inteiro antes de ter certeza de quem é o menor. É esse detalhe que
          tira dele qualquer melhor caso.
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
