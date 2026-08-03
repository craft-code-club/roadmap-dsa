"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// BinaryHeapVisualizer, as três operações que definem o heap.
//
// O heap tem uma dificuldade didática própria: ele é UMA estrutura vista de
// DUAS formas (árvore completa e array), e o aluno precisa enxergar as duas se
// movendo juntas. Por isso a árvore em SVG e o array ficam sempre lado a lado,
// com o mesmo destaque nos mesmos índices.
//
// Três modos, porque o heap tem três histórias diferentes:
//
//   - inserir  : o valor entra no FIM e sobe (sift up). Trocar o preset de
//                "crescente" para "decrescente" mostra o melhor caso (zero
//                trocas) virar o pior (toda inserção sobe até a raiz).
//   - remover  : a raiz sai, o ÚLTIMO sobe para o lugar dela e desce (sift
//                down). Rodando até o fim, a saída sai ordenada: é heap sort.
//   - construir: heapify a partir do último pai. O painel compara as trocas do
//                build-heap com as de inserir um a um, que é o argumento
//                medido de por que build-heap é O(n) e não O(n log n).
//
// Gerador puro: cada passo carrega o snapshot do array, então navegar para
// trás é de graça e não existe estado escondido.
// ---------------------------------------------------------------------------

type Tipo = "min" | "max";
type Modo = "inserir" | "remover" | "construir";

type Passo = {
  arr: number[];
  n: number; // quantos elementos do array ainda pertencem ao heap
  foco: number; // índice em foco
  par: number; // com quem ele está sendo comparado (-1 = ninguém)
  trocou: boolean; // este passo acabou de executar uma troca
  entrando: number; // índice que acabou de entrar no fim (-1 = nenhum)
  saida: number[]; // valores já removidos, na ordem
  comp: number;
  swaps: number;
  linha: number;
  nota: string;
  ok?: boolean;
};

const CODIGO_INSERIR = [
  "def push(heap, valor):",
  "    heap.append(valor)          # entra sempre no FIM",
  "    i = len(heap) - 1",
  "    while i > 0:",
  "        pai = (i - 1) // 2",
  "        if heap[pai] <= heap[i]:",
  "            break               # a regra já vale, parei",
  "        heap[pai], heap[i] = heap[i], heap[pai]",
  "        i = pai                 # subo e comparo de novo",
];

const CODIGO_REMOVER = [
  "def pop(heap):",
  "    topo = heap[0]",
  "    heap[0] = heap[-1]          # o ÚLTIMO sobe para a raiz",
  "    heap.pop()",
  "    desce(heap, 0)",
  "    return topo",
  "",
  "def desce(heap, i):",
  "    while True:",
  "        menor, e, d = i, 2*i + 1, 2*i + 2",
  "        if e < len(heap) and heap[e] < heap[menor]: menor = e",
  "        if d < len(heap) and heap[d] < heap[menor]: menor = d",
  "        if menor == i: return   # nenhum filho é menor, parei",
  "        heap[i], heap[menor] = heap[menor], heap[i]",
  "        i = menor",
];

const CODIGO_CONSTRUIR = [
  "def build_heap(a):",
  "    # o último PAI é o único ponto de partida que faz sentido:",
  "    # folha não tem filho, então não tem para onde descer",
  "    for i in range(len(a) // 2 - 1, -1, -1):",
  "        desce(a, i)",
  "",
  "def desce(a, i):",
  "    while True:",
  "        menor, e, d = i, 2*i + 1, 2*i + 2",
  "        if e < len(a) and a[e] < a[menor]: menor = e",
  "        if d < len(a) and a[d] < a[menor]: menor = d",
  "        if menor == i: return",
  "        a[i], a[menor] = a[menor], a[i]",
  "        i = menor",
];

type Preset = { key: string; rotulo: string; valores: number[]; dica: string };

const PRESETS: Preset[] = [
  {
    key: "chegada",
    rotulo: "Ordem de chegada: 3 5 2 1 4 6",
    valores: [3, 5, 2, 1, 4, 6],
    dica: "Seis valores em ordem embaralhada. Repare que o array final NÃO fica ordenado, e mesmo assim a regra do heap vale em todos os nós.",
  },
  {
    key: "crescente",
    rotulo: "Chegando em ordem: 1 2 3 4 5 6 7 8 9",
    valores: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    dica: "Nove valores em ordem crescente. Num min-heap cada um já chega maior que o pai e nada se move: 0 trocas. Troque para max-heap e as mesmas nove inserções custam 16 trocas, porque aí todo valor que chega é o novo máximo e sobe até a raiz.",
  },
  {
    key: "decrescente",
    rotulo: "Chegando ao contrário: 9 8 7 6 5 4 3 2 1",
    valores: [9, 8, 7, 6, 5, 4, 3, 2, 1],
    dica: "Os MESMOS nove valores, na ordem inversa, e os papéis se invertem: agora é o min-heap que paga as 16 trocas e o max-heap que não move nada. A ordem de chegada decide o trabalho, e o teto é sempre a altura da árvore.",
  },
  {
    key: "repetidos",
    rotulo: "Com repetidos: 20 15 10 40 50 100 25 15",
    valores: [20, 15, 10, 40, 50, 100, 25, 15],
    dica: "Valores iguais convivem sem problema: a regra é pai menor ou IGUAL ao filho, então empate não é violação.",
  },
];

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

// `pai` respeita a regra em relação a `filho`?
function respeita(pai: number, filho: number, tipo: Tipo) {
  return tipo === "min" ? pai <= filho : pai >= filho;
}
function melhorQue(a: number, b: number, tipo: Tipo) {
  return tipo === "min" ? a < b : a > b;
}

const nomeTopo = (tipo: Tipo) => (tipo === "min" ? "menor" : "maior");

// --- geradores puros -------------------------------------------------------

function passosInserir(valores: number[], tipo: Tipo): Passo[] {
  const out: Passo[] = [];
  const h: number[] = [];
  let comp = 0;
  let swaps = 0;
  const base = () => ({ arr: [...h], n: h.length, saida: [], comp, swaps, trocou: false, entrando: -1, par: -1 });

  for (const v of valores) {
    h.push(v);
    let i = h.length - 1;
    out.push({
      ...base(), foco: i, entrando: i, linha: 1,
      nota: `${v} entra no FIM do array, na posição ${i}. É a única posição que mantém a árvore completa, então nem preciso procurar onde colocar.`,
    });
    let guarda = 0;
    while (i > 0 && guarda++ < 200) {
      const pai = (i - 1) >> 1;
      comp++;
      out.push({
        ...base(), foco: i, par: pai, linha: 4,
        nota: `Comparo com o pai: índice ${i} tem pai (${i} - 1) // 2 = ${pai}. É ${h[pai]} contra ${h[i]}.`,
      });
      if (respeita(h[pai], h[i], tipo)) {
        out.push({
          ...base(), foco: i, par: pai, linha: 6, ok: true,
          nota: `${h[pai]} ${h[pai] === h[i] ? "empata com" : tipo === "min" ? "é menor que" : "é maior que"} ${h[i]}: a regra já vale aqui, e como ela valia acima, vale na árvore inteira. Paro sem subir mais.`,
        });
        break;
      }
      [h[pai], h[i]] = [h[i], h[pai]];
      swaps++;
      const antigoI = i;
      i = pai;
      out.push({
        ...base(), foco: i, par: antigoI, trocou: true, linha: 7,
        nota: `${h[i]} ${tipo === "min" ? "é menor" : "é maior"} que ${h[antigoI]}: violação. Troco os dois e ${h[i]} sobe para a posição ${i}. Só este caminho até a raiz é tocado, o resto da árvore nem fica sabendo.`,
      });
    }
    if (i === 0 && h.length > 1) {
      out.push({
        ...base(), foco: 0, linha: 3, ok: true,
        nota: `Cheguei na raiz: não existe pai da posição 0, então a subida acabou. ${h[0]} é o ${nomeTopo(tipo)} valor do heap.`,
      });
    }
  }
  const alt = altura(h.length);
  out.push({
    ...base(), foco: -1, linha: 8, ok: true,
    nota: `Heap montado com ${h.length} elementos e altura ${alt}. Foram ${comp} comparações e ${swaps} trocas. Repare no array: ele NÃO está ordenado, e não precisa estar. A única promessa é que todo pai respeita a regra em relação aos filhos dele.`,
  });
  return out;
}

function construirHeapPorInsercao(valores: number[], tipo: Tipo) {
  const h: number[] = [];
  let comp = 0;
  let swaps = 0;
  for (const v of valores) {
    h.push(v);
    let i = h.length - 1;
    let guarda = 0;
    while (i > 0 && guarda++ < 200) {
      const pai = (i - 1) >> 1;
      comp++;
      if (respeita(h[pai], h[i], tipo)) break;
      [h[pai], h[i]] = [h[i], h[pai]];
      swaps++;
      i = pai;
    }
  }
  return { heap: h, comp, swaps };
}

function passosRemover(valores: number[], tipo: Tipo): Passo[] {
  const { heap } = construirHeapPorInsercao(valores, tipo);
  const h = [...heap];
  const saida: number[] = [];
  const out: Passo[] = [];
  let comp = 0;
  let swaps = 0;
  const base = () => ({ arr: [...h], n: h.length, saida: [...saida], comp, swaps, trocou: false, entrando: -1, par: -1 });

  out.push({
    ...base(), foco: 0, linha: 0,
    nota: `Heap pronto com ${h.length} elementos. O ${nomeTopo(tipo)} valor está sempre na posição 0, e olhar para ele custa O(1). O caro é REMOVER e manter a regra.`,
  });

  let rodada = 0;
  while (h.length > 0 && rodada++ < 60) {
    const topo = h[0];
    out.push({
      ...base(), foco: 0, linha: 1,
      nota: `Guardo o topo (${topo}) para devolver. Agora preciso de uma raiz nova sem quebrar a forma completa da árvore.`,
    });
    const ultimo = h[h.length - 1];
    if (h.length > 1) {
      h[0] = ultimo;
      h.pop();
      out.push({
        ...base(), foco: 0, trocou: true, linha: 2,
        nota: `O ÚLTIMO elemento (${ultimo}) sobe para a raiz. Por que o último? Porque tirar ele do fim é a única remoção que mantém a árvore completa. O preço é que a regra provavelmente quebrou lá em cima.`,
      });
    } else {
      h.pop();
    }
    saida.push(topo);

    let i = 0;
    let guarda = 0;
    while (guarda++ < 200) {
      const e = 2 * i + 1;
      const d = 2 * i + 2;
      if (e >= h.length) {
        if (h.length > 0) {
          out.push({
            ...base(), foco: i, linha: 12, ok: true,
            nota: `A posição ${i} não tem filho (2 x ${i} + 1 = ${e} já passou do fim do heap), então cheguei numa folha e a descida acabou. Saída até aqui: ${saida.join(", ")}.`,
          });
        }
        break;
      }
      let alvo = i;
      comp++;
      if (melhorQue(h[e], h[alvo], tipo)) alvo = e;
      let notaCmp = `Filhos da posição ${i}: esquerda em 2 x ${i} + 1 = ${e} (valor ${h[e]})`;
      if (d < h.length) {
        comp++;
        notaCmp += ` e direita em 2 x ${i} + 2 = ${d} (valor ${h[d]})`;
        if (melhorQue(h[d], h[alvo], tipo)) alvo = d;
      } else {
        notaCmp += ` (não existe filho à direita)`;
      }
      out.push({
        ...base(), foco: i, par: alvo === i ? -1 : alvo, linha: d < h.length ? 11 : 10,
        nota: `${notaCmp}. Comparo os três de uma vez: quem for o ${nomeTopo(tipo)} da tríade tem que ficar por cima.`,
      });
      if (alvo === i) {
        out.push({
          ...base(), foco: i, linha: 12, ok: true,
          nota: `${h[i]} já é o ${nomeTopo(tipo)} entre pai e filhos, então a regra voltou a valer daqui para baixo. Paro. Saída até aqui: ${saida.join(", ")}.`,
        });
        break;
      }
      const desceu = h[alvo];
      [h[i], h[alvo]] = [h[alvo], h[i]];
      swaps++;
      const antigo = i;
      i = alvo;
      out.push({
        ...base(), foco: i, par: antigo, trocou: true, linha: 13,
        nota: `${desceu} sobe para a posição ${antigo} e ${h[i]} desce para ${i}. Continuo a descida por ESTE ramo só: o outro filho e toda a subárvore dele ficam intocados, e é daí que vem o log.`,
      });
    }
  }

  out.push({
    ...base(), foco: -1, linha: 5, ok: true,
    nota: `Heap vazio. A ordem de saída foi ${saida.join(", ")}: ordenada, do ${nomeTopo(tipo)} para o outro extremo. Tirar tudo de um heap é exatamente isso, e é a ideia do heap sort.`,
  });
  return out;
}

function passosConstruir(valores: number[], tipo: Tipo): Passo[] {
  const h = [...valores];
  const out: Passo[] = [];
  let comp = 0;
  let swaps = 0;
  const base = () => ({ arr: [...h], n: h.length, saida: [], comp, swaps, trocou: false, entrando: -1, par: -1 });

  const ultimoPai = Math.floor(h.length / 2) - 1;
  out.push({
    ...base(), foco: -1, linha: 0,
    nota: `Array cru, sem nenhuma garantia: ${h.join(", ")}. Vou transformá-lo em heap sem criar nada novo, mexendo só nas posições que já existem.`,
  });
  out.push({
    ...base(), foco: ultimoPai, linha: 3,
    nota: `Começo no índice ${ultimoPai}, que é ${h.length} // 2 - 1: o ÚLTIMO nó que tem filho. Da metade do array para a frente só existe folha, e folha não tem para onde descer. Metade do trabalho some com esta única conta.`,
  });

  for (let raiz = ultimoPai; raiz >= 0; raiz--) {
    out.push({
      ...base(), foco: raiz, linha: 4,
      nota: `Desço a partir da posição ${raiz} (valor ${h[raiz]}). Tudo que está ABAIXO dela já virou heap nas rodadas anteriores, então só falta acertar este nó.`,
    });
    let i = raiz;
    let guarda = 0;
    while (guarda++ < 200) {
      const e = 2 * i + 1;
      const d = 2 * i + 2;
      if (e >= h.length) break;
      let alvo = i;
      comp++;
      if (melhorQue(h[e], h[alvo], tipo)) alvo = e;
      if (d < h.length) {
        comp++;
        if (melhorQue(h[d], h[alvo], tipo)) alvo = d;
      }
      out.push({
        ...base(), foco: i, par: alvo === i ? -1 : alvo, linha: d < h.length ? 10 : 9,
        nota: `Na posição ${i} tenho ${h[i]}, com filho${d < h.length ? "s" : ""} ${h[e]}${d < h.length ? ` e ${h[d]}` : ""}. O ${nomeTopo(tipo)} da tríade é ${h[alvo]}.`,
      });
      if (alvo === i) {
        out.push({
          ...base(), foco: i, linha: 11, ok: true,
          nota: `${h[i]} já é o ${nomeTopo(tipo)} da tríade: esta subárvore está válida e não desço mais.`,
        });
        break;
      }
      const subiu = h[alvo];
      [h[i], h[alvo]] = [h[alvo], h[i]];
      swaps++;
      const antigo = i;
      i = alvo;
      out.push({
        ...base(), foco: i, par: antigo, trocou: true, linha: 12,
        nota: `Troco: ${subiu} sobe para ${antigo}, ${h[i]} desce para ${i}. Como o valor desceu, a subárvore de ${i} pode ter quebrado, então continuo a descida por ela.`,
      });
    }
  }

  const porInsercao = construirHeapPorInsercao(valores, tipo);
  out.push({
    ...base(), foco: -1, linha: 4, ok: true,
    nota: `Heap pronto: ${h.join(", ")}. Foram ${swaps} trocas em ${comp} comparações, contra ${porInsercao.swaps} trocas em ${porInsercao.comp} comparações para inserir os mesmos ${valores.length} valores um a um. Com n pequeno a distância é modesta; ela cresce porque metade dos nós é folha e não desce nada, um quarto desce no máximo um nível, e assim por diante. É essa soma que fecha em O(n), enquanto inserir um a um fecha em O(n log n).`,
  });
  return out;
}

// --- geometria da árvore completa -----------------------------------------

function profundidade(i: number) {
  let d = 0;
  let x = i + 1;
  while (x > 1) {
    x >>= 1;
    d++;
  }
  return d;
}
function altura(n: number) {
  return n === 0 ? 0 : profundidade(n - 1) + 1;
}

const NO_R = 16;
const NIVEL_Y = 60;
const TOPO_Y = 20;

export function BinaryHeapVisualizer() {
  const [presetKey, setPresetKey] = useState("chegada");
  const [tipo, setTipo] = useState<Tipo>("min");
  const [modo, setModo] = useState<Modo>("inserir");
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(4);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const passos = useMemo(() => {
    if (modo === "inserir") return passosInserir(preset.valores, tipo);
    if (modo === "remover") return passosRemover(preset.valores, tipo);
    return passosConstruir(preset.valores, tipo);
  }, [modo, preset, tipo]);

  // O modo inserir começa com o heap vazio, então o passo 1 é um nó solto: nada
  // interessante para quem chega na página. Abrir no primeiro passo com árvore de
  // verdade mostra o algoritmo em movimento. O ↺ continua voltando para o zero,
  // que é onde a inserção realmente começa.
  // `passos` não depende de `passo`, então calcular a lista antes deste useState
  // mantém a ordem dos hooks estável.
  const [passo, setPasso] = useState(() => {
    const i = passos.findIndex((p) => p.n >= 4);
    return i < 0 ? 0 : i;
  });

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
  const trocarModo = (m: Modo) => {
    reiniciar();
    setModo(m);
  };
  const trocarTipo = (t: Tipo) => {
    reiniciar();
    setTipo(t);
  };

  // Geometria: uma árvore completa se posiciona só pelo índice, sem layout algum.
  // O tamanho vem do MAIOR heap da animação inteira, não do passo atual: assim os
  // nós ficam parados enquanto a árvore enche e esvazia, em vez de saltarem de
  // lugar a cada inserção.
  const maxN = useMemo(() => passos.reduce((m, s) => Math.max(m, s.n), 1), [passos]);
  const maxProf = profundidade(maxN - 1);
  const colunas = Math.pow(2, maxProf);
  const largura = Math.max(320, colunas * 56);
  const W = largura + NO_R * 2;
  const H = TOPO_Y * 2 + maxProf * NIVEL_Y + NO_R * 2;
  const cx = (i: number) => {
    const d = profundidade(i);
    const pos = i - (Math.pow(2, d) - 1);
    return NO_R + ((pos + 0.5) * largura) / Math.pow(2, d);
  };
  const cy = (i: number) => TOPO_Y + NO_R + profundidade(i) * NIVEL_Y;

  const alt = altura(p.n);
  const pctPasso = Math.round(((idx + 1) / total) * 100);
  const codigo = modo === "inserir" ? CODIGO_INSERIR : modo === "remover" ? CODIGO_REMOVER : CODIGO_CONSTRUIR;
  const arquivo = modo === "inserir" ? "push.py" : modo === "remover" ? "pop.py" : "build_heap.py";

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · a árvore e o array do heap se movendo juntos</span>
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

        <div className="viz-inputs">
          <div className="viz-field">
            <span>Operação</span>
            <div className="sub-modo">
              <button className={`sub-modo-btn${modo === "inserir" ? " on" : ""}`} onClick={() => trocarModo("inserir")} aria-pressed={modo === "inserir"}>
                inserir
              </button>
              <button className={`sub-modo-btn${modo === "remover" ? " on" : ""}`} onClick={() => trocarModo("remover")} aria-pressed={modo === "remover"}>
                remover o topo
              </button>
              <button className={`sub-modo-btn${modo === "construir" ? " on" : ""}`} onClick={() => trocarModo("construir")} aria-pressed={modo === "construir"}>
                construir de uma vez
              </button>
            </div>
          </div>
          <div className="viz-field">
            <span>Regra</span>
            <div className="sub-modo">
              <button className={`sub-modo-btn${tipo === "min" ? " on" : ""}`} onClick={() => trocarTipo("min")} aria-pressed={tipo === "min"}>
                min-heap
              </button>
              <button className={`sub-modo-btn${tipo === "max" ? " on" : ""}`} onClick={() => trocarTipo("max")} aria-pressed={tipo === "max"}>
                max-heap
              </button>
            </div>
          </div>
        </div>

        <div className="tt-arv-wrap">
          <svg
            className="tt-arv"
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Heap com ${p.n} elementos e altura ${alt}. ${p.nota}`}
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
                  <text className="hp-idx" x={cx(i)} y={cy(i) - NO_R - 5} textAnchor="middle">
                    {i}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            O mesmo heap, em array <em>o índice embaixo do nó é o índice aqui</em>
          </div>
          <div className="hp-arr">
            {p.arr.map((v, i) => {
              const cls = ["hp-cel"];
              if (i >= p.n) cls.push("fora");
              else if (i === p.foco) cls.push("foco");
              else if (i === p.par) cls.push("par");
              if (i === p.entrando || (p.trocou && (i === p.foco || i === p.par))) cls.push("troca");
              return (
                <span key={i} className={cls.join(" ")}>
                  <i>{i}</i>
                  {v}
                </span>
              );
            })}
            {p.arr.length === 0 && <span className="tt-vazio">vazio</span>}
          </div>
        </div>

        {modo === "remover" && (
          <div className="hp-bloco">
            <div className="tt-painel-tit">
              Saída, na ordem em que foi removida <em>é isto que o heap sort aproveita</em>
            </div>
            <div className="tt-saida">
              {p.saida.map((v, i) => (
                <span key={i} className={`tt-saida-item${i === p.saida.length - 1 ? " novo" : ""}`}>
                  {v}
                </span>
              ))}
              {p.saida.length === 0 && <span className="tt-vazio">nada saiu ainda</span>}
            </div>
          </div>
        )}

        <p className={"viz-note" + (p.ok ? " ok" : "")}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">{arquivo}</div>
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
            <div className="viz-var">
              <span className="viz-var-name">i (foco)</span>
              <span className="viz-var-val">{p.foco >= 0 ? p.foco : "-"}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">comparado com</span>
              <span className="viz-var-val">{p.par >= 0 ? p.par : "-"}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">topo do heap</span>
              <span className="viz-var-val best">{p.n > 0 ? p.arr[0] : "-"}</span>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>elementos</span>
            <strong>{p.n}</strong>
          </div>
          <div className="bigo-stat">
            <span>altura</span>
            <strong>{alt}</strong>
          </div>
          <div className="bigo-stat">
            <span>comparações</span>
            <strong>{p.comp}</strong>
          </div>
          <div className="bigo-stat">
            <span>trocas</span>
            <strong>{p.swaps}</strong>
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
          No modo inserir, alterne entre os dois presets de nove valores mantendo min-heap: o contador de
          trocas vai de 0 a 16 sem que um único dado mude, só a ordem de chegada. O heap não promete
          proteger você disso, ele promete que o estrago nunca passa da altura da árvore.
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
