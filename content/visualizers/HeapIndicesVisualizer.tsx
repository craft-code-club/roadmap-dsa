"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// HeapIndicesVisualizer, a aritmética que substitui os ponteiros.
//
// A ideia mais contraintuitiva do heap é que a árvore não tem ponteiro nenhum:
// pai e filhos saem de uma conta com o índice. Explicar isso em texto exige que
// o leitor faça a conta de cabeça e confie; aqui ele clica num nó e vê os três
// resultados acesos ao mesmo tempo na árvore e no array.
//
// O seletor de k existe por um motivo pedagógico, não por completude: quando o
// aluno vê `k*i + 1` virar `3*i + 1` e a árvore continuar funcionando, fica
// claro que o "2" das fórmulas é o número de filhos, não uma constante mágica.
//
// O painel marca explicitamente os filhos que CAIRIAM FORA do array. É a mesma
// checagem de limite que toda implementação de sift down precisa ter, e é o
// erro mais comum de quem escreve heap pela primeira vez.
//
// Sobre a casca (contrato em `content/visualizers/README.md`):
//   · `total: 1` — não há linha do tempo. O eixo é a SELEÇÃO (o nó clicado), e
//     o resumo do estado ("índice 4 de 0 a 11") entra como `children` do
//     `VizHeader`, no lugar do "passo N de M". Ele já vem com o rótulo junto.
//   · `collapsible: false` — a árvore, o array e as fórmulas são o conteúdo, e
//     não existe bloco dispensável. Sem bloco, `measureOn` não faria nada.
//   · o `total: 1` também é o que preserva o teclado PRÓPRIO desta peça: os nós
//     do SVG respondem a setas, Home e End, e o hook só sequestra seta e espaço
//     quando há linha do tempo. Com passos, o `stepBy` do painel andaria por
//     cima de cada seta do aluno navegando a árvore.
// ---------------------------------------------------------------------------

const VALORES = [10, 21, 14, 35, 27, 19, 42, 51, 38, 44, 33, 22, 60, 47, 55, 29];

// Constrói um min-heap k-ário válido com os n primeiros valores. Determinístico:
// mesmo n e mesmo k, mesmo arranjo. Mostrar um heap inválido num visualizador de
// heap seria ensinar o oposto, então o arranjo é sempre construído, nunca fixo.
function construir(n: number, k: number): number[] {
  const a = VALORES.slice(0, n);
  const desce = (i: number) => {
    let guarda = 0;
    while (guarda++ < 200) {
      let menor = i;
      for (let f = k * i + 1; f <= k * i + k && f < a.length; f++) {
        if (a[f] < a[menor]) menor = f;
      }
      if (menor === i) return;
      [a[i], a[menor]] = [a[menor], a[i]];
      i = menor;
    }
  };
  for (let i = Math.floor((a.length - 2) / k); i >= 0; i--) desce(i);
  return a;
}

// Nível, posição dentro do nível e quantos cabem nele. Numa árvore completa isso
// sai só do índice, sem percorrer nada.
function lugar(i: number, k: number) {
  let d = 0;
  let inicio = 0;
  let largura = 1;
  let guarda = 0;
  while (i >= inicio + largura && guarda++ < 100) {
    inicio += largura;
    largura *= k;
    d++;
  }
  return { d, pos: i - inicio, largura };
}

const NO_R = 17;
const NIVEL_Y = 66;
const TOPO_Y = 22;

export function HeapIndicesVisualizer() {
  const [k, setK] = useState(2);
  const [n, setN] = useState(12);
  const [sel, setSel] = useState(4);

  const viz = useVisualizer({
    title: "Visualizador · clique num nó e veja de onde saem pai e filhos",
    total: 1,
    collapsible: false,
  });

  const arr = useMemo(() => construir(n, k), [n, k]);

  // Só encolher o array tira a seleção do intervalo válido: os índices vão de 0 a
  // n - 1 seja qual for o k. Trocar k muda quem é pai e quem é filho, nunca
  // quantas posições existem.
  //
  // O ajuste roda na FASE DE RENDER e não num `useEffect`, que é o padrão
  // documentado do React para estado derivado de outro estado — o mesmo que o
  // §9 do contrato usa para o passo inicial. Com o efeito, o React pintava um
  // quadro com a seleção fora da faixa antes de corrigir.
  //
  // O `Math.min` abaixo é rede, não a regra: é ele que segura o quadro em que o
  // ajuste ainda não rodou. Quem apagar o bloco acima achando que o `Math.min`
  // já resolve troca o comportamento sem nenhum erro aparecer — a seleção
  // deixaria de ser fixada e voltaria sozinha ao encolher e crescer de novo.
  const [nAnterior, setNAnterior] = useState(n);
  if (nAnterior !== n) {
    setNAnterior(n);
    if (sel >= n) setSel(Math.max(0, n - 1));
  }
  const i = Math.min(sel, n - 1);

  const pai = i === 0 ? -1 : Math.floor((i - 1) / k);
  const filhos = Array.from({ length: k }, (_, j) => k * i + 1 + j);
  const filhosDentro = filhos.filter((f) => f < n);
  const maxNivel = lugar(n - 1, k).d;
  const colunas = Math.pow(k, maxNivel);
  const slot = Math.max(38, Math.min(58, 660 / colunas));
  const largura = colunas * slot;
  const W = largura + NO_R * 2;
  const H = TOPO_Y * 2 + maxNivel * NIVEL_Y + NO_R * 2;

  const cx = (idx: number) => {
    const l = lugar(idx, k);
    return NO_R + ((l.pos + 0.5) * largura) / l.largura;
  };
  const cy = (idx: number) => TOPO_Y + NO_R + lugar(idx, k).d * NIVEL_Y;

  const classeDe = (idx: number) => {
    if (idx === i) return "on";
    if (idx === pai) return "aux";
    if (filhosDentro.includes(idx)) return "filho";
    return "";
  };

  const irPara = (destino: number) => {
    if (destino >= 0 && destino < n) setSel(destino);
  };

  const aoTeclar = (e: React.KeyboardEvent, idx: number) => {
    const teclas: Record<string, number> = {
      ArrowUp: idx === 0 ? idx : Math.floor((idx - 1) / k),
      ArrowLeft: Math.max(0, idx - 1),
      ArrowRight: Math.min(n - 1, idx + 1),
      ArrowDown: k * idx + 1,
      Home: 0,
      End: n - 1,
    };
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSel(idx);
      return;
    }
    const destino = teclas[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    irPara(destino);
  };

  const linhas = [
    {
      chave: "pai",
      formula: `pai(i) = (i - 1) // ${k}`,
      conta: i === 0 ? "a raiz não tem pai" : `(${i} - 1) // ${k} = ${pai}`,
      valor: i === 0 ? null : arr[pai],
      destino: pai,
      existe: i !== 0,
    },
    ...filhos.map((f, j) => ({
      chave: `filho${j}`,
      formula: `filho ${j + 1}(i) = ${k}i + ${j + 1}`,
      conta: `${k} x ${i} + ${j + 1} = ${f}`,
      valor: f < n ? arr[f] : null,
      destino: f,
      existe: f < n,
    })),
  ];

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz}>
        <span className="viz-step">
          índice {i} de 0 a {n - 1}
        </span>
      </VizHeader>

      <div {...viz.bodyProps}>
        <div className="viz-inputs">
          <div className="viz-field">
            <span>Filhos por nó (k)</span>
            <div className="sub-modo">
              {[2, 3, 4].map((v) => (
                <button key={v} className={`sub-modo-btn${k === v ? " on" : ""}`} onClick={() => setK(v)} aria-pressed={k === v}>
                  {v === 2 ? "2 (binário)" : v}
                </button>
              ))}
            </div>
          </div>
          <label className="viz-field grow">
            <span>Elementos no heap: {n}</span>
            <input
              type="range"
              min={3}
              max={16}
              step={1}
              value={n}
              onChange={(e) => setN(parseInt(e.target.value, 10))}
              aria-label={`Elementos no heap: ${n}`}
            />
          </label>
        </div>

        <div className="tt-arv-wrap">
          <svg className="tt-arv" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Árvore do heap. Use Enter para selecionar um nó e as setas para andar entre pai, filhos e vizinhos.">
            {arr.map((_, idx) =>
              Array.from({ length: k }, (_, j) => k * idx + 1 + j)
                .filter((f) => f < n)
                .map((f) => (
                  <line
                    key={`${idx}-${f}`}
                    className={`tt-aresta${idx === i || f === i ? " ativa" : ""}`}
                    x1={cx(idx)}
                    y1={cy(idx) + NO_R}
                    x2={cx(f)}
                    y2={cy(f) - NO_R}
                  />
                ))
            )}
            {arr.map((v, idx) => (
              <g
                key={idx}
                className={`tt-no hp-no-btn ${classeDe(idx)}`}
                role="button"
                tabIndex={0}
                aria-label={`Índice ${idx}, valor ${v}${idx === i ? ", selecionado" : ""}`}
                aria-pressed={idx === i}
                onClick={() => setSel(idx)}
                onKeyDown={(e) => aoTeclar(e, idx)}
              >
                <circle cx={cx(idx)} cy={cy(idx)} r={NO_R} />
                <text x={cx(idx)} y={cy(idx) + 4} textAnchor="middle">
                  {v}
                </text>
                <text className="hp-idx" x={cx(idx)} y={cy(idx) - NO_R - 6} textAnchor="middle">
                  {idx}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            O array, na mesma ordem em que a árvore é lida por nível
          </div>
          <div className="hp-arr">
            {arr.map((v, idx) => (
              <button key={idx} className={`hp-cel botao ${classeDe(idx)}`} onClick={() => setSel(idx)} aria-pressed={idx === i} aria-label={`Índice ${idx}, valor ${v}`}>
                <i>{idx}</i>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="hp-formulas">
          {linhas.map((l) => (
            <button
              key={l.chave}
              className={`hp-formula${l.existe ? "" : " fora"}${l.chave === "pai" ? " pai" : " filho"}`}
              onClick={() => l.existe && irPara(l.destino)}
              disabled={!l.existe}
              aria-label={l.existe ? `Ir para o índice ${l.destino}` : `${l.formula} não existe neste heap`}
            >
              <span className="hp-formula-nome">{l.formula}</span>
              <span className="hp-formula-conta">{l.conta}</span>
              <span className="hp-formula-val">
                {l.existe ? `valor ${l.valor}` : i === 0 && l.chave === "pai" ? "-" : `fora do heap (n = ${n})`}
              </span>
            </button>
          ))}
        </div>

        <p className="viz-note">
          Nenhuma dessas ligações está guardada em lugar nenhum: o array tem só os {n} valores, e a árvore
          inteira é reconstruída por conta a cada acesso. Um nó em formato de objeto guardaria valor mais{" "}
          {k} referências, e cada referência custa 8 bytes numa máquina de 64 bits. Aqui o custo é uma
          multiplicação.
        </p>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>níveis</span>
            <strong>{maxNivel + 1}</strong>
          </div>
          <div className="bigo-stat">
            <span>altura (log{k} de n)</span>
            <strong>{Math.ceil(Math.log(n + 1) / Math.log(k))}</strong>
          </div>
          <div className="bigo-stat">
            <span>último nó com filho</span>
            <strong>{Math.floor((n - 2) / k)}</strong>
          </div>
          <div className="bigo-stat">
            <span>folhas (sem filho)</span>
            <strong>{n - 1 - Math.floor((n - 2) / k)}</strong>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Repare no card &quot;folhas&quot;: com k = 2, metade ou mais do heap não tem filho nenhum. É por isso
          que construir um heap de uma vez começa em (n - 2) // k e ignora essa metade inteira, e é a mesma
          razão pela qual build-heap custa O(n) e não O(n log n).
        </p>
      </div>

      {/* Sem linha do tempo e sem botões extras, o `VizFooter` não desenha nada. */}
      <VizFooter viz={viz} />
    </figure>
  );
}
