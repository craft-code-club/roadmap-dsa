"use client";

import { useMemo, useState } from "react";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// BinaryTreeFormatos, o classificador de árvore binária.
//
// Cheia, perfeita, completa, balanceada e degenerada são cinco definições que
// todo mundo lê, concorda e esquece, porque elas chegam como texto. Aqui elas
// chegam como VEREDITO: você monta a árvore clicando nos nós e as cinco
// respostas mudam na hora, cada uma com o motivo do "não".
//
// A árvore mora num array de 15 posições com o mapeamento clássico
// (filhos de i em 2i+1 e 2i+2, pai em (i-1)//2), então o mesmo componente
// mostra de graça a segunda ideia do tópico: uma árvore binária cabe num
// array, e é assim que a heap é implementada. O painel do array fica ao lado
// da árvore justamente para o aluno ver os dois lados do mesmo objeto.
//
// Invariante mantida na interação: um nó só existe se o pai existir. Ligar um
// nó liga a cadeia de ancestrais; desligar um nó desliga a subárvore inteira.
//
// Sobre a casca: este é um CLASSIFICADOR, não uma animação. Não há linha do
// tempo (`total: 1`) nem bloco dispensável para recolher (`collapsible: false`)
// — o desenho e os cinco vereditos são o conteúdo. Da casca ele usa o que lhe
// cabe: o painel expandido com o cabeçalho parado enquanto o miolo rola. Os
// presets continuam sendo chips do miolo, e não do rodapé, porque no rodapé só
// mora reprodução.
// ---------------------------------------------------------------------------

const LEVELS = 4;                  // 4 níveis => 15 posições
const SIZE = (1 << LEVELS) - 1;    // 15

type Preset = { key: string; label: string; slots: number[]; hint: string };

// Cada preset é a lista de índices ligados no array de 15 posições.
const PRESETS: Preset[] = [
  {
    key: "perfeita",
    label: "Perfeita",
    slots: [0, 1, 2, 3, 4, 5, 6],
    hint: "Todo nó interno com dois filhos e todas as folhas no mesmo nível. É o melhor caso de altura: 7 nós em altura 3.",
  },
  {
    key: "completa",
    label: "Completa, não perfeita",
    slots: [0, 1, 2, 3, 4, 5],
    hint: "Níveis cheios, menos o último, que é preenchido da esquerda para a direita sem buraco. É a forma da heap.",
  },
  {
    key: "cheia",
    label: "Cheia, não completa",
    slots: [0, 1, 2, 5, 6],
    hint: "Todo nó tem 0 ou 2 filhos, mas o último nível tem buraco à esquerda. Cheia não implica completa.",
  },
  {
    key: "balanceada",
    label: "Balanceada, não cheia",
    slots: [0, 1, 2, 3, 6],
    hint: "Nenhum nó tem subárvores com mais de um nível de diferença, mesmo com nó de um filho só.",
  },
  {
    key: "degenerada",
    label: "Degenerada",
    slots: [0, 1, 3, 7],
    hint: "Todo nó tem no máximo um filho: virou uma lista encadeada com passos extras, e a altura vira n.",
  },
];

const parentOf = (i: number) => (i - 1) >> 1;
const leftOf = (i: number) => 2 * i + 1;
const rightOf = (i: number) => 2 * i + 2;
const levelOf = (i: number) => Math.floor(Math.log2(i + 1));

type Verdict = { ok: boolean; reason: string };

function heightOf(on: boolean[], i: number): number {
  if (i >= SIZE || !on[i]) return 0;
  return 1 + Math.max(heightOf(on, leftOf(i)), heightOf(on, rightOf(i)));
}

// As cinco definições, cada uma devolvendo o motivo do "não". O motivo é o que
// transforma o veredito em aprendizado: dizer "não é completa" não ensina nada,
// dizer "o índice 5 está vazio e o 6 está ocupado" ensina.
function classify(on: boolean[]) {
  const active: number[] = [];
  for (let i = 0; i < SIZE; i++) if (on[i]) active.push(i);
  const n = active.length;

  if (n === 0) {
    const empty: Verdict = { ok: false, reason: "A árvore está vazia. Clique num nó para começar." };
    return { full: empty, perfect: empty, complete: empty, balanced: empty, degenerate: empty, n, height: 0, leaves: 0 };
  }

  const childrenOf = (i: number) => [leftOf(i), rightOf(i)].filter((c) => c < SIZE && on[c]);
  const leaves = active.filter((i) => childrenOf(i).length === 0);
  const height = heightOf(on, 0);

  // Cheia: todo nó tem 0 ou 2 filhos.
  const withOneChild = active.find((i) => childrenOf(i).length === 1);
  const full: Verdict = withOneChild === undefined
    ? { ok: true, reason: "Todo nó tem 0 ou 2 filhos." }
    : { ok: false, reason: `O nó do índice ${withOneChild} tem um filho só. Numa árvore cheia não existe nó com exatamente um filho.` };

  // Completa: os índices ocupados são exatamente 0..n-1 no array.
  const hole = active.find((i) => i >= n);
  const complete: Verdict = hole === undefined
    ? { ok: true, reason: `Os ${n} nós ocupam exatamente os índices 0 a ${n - 1}: nenhum buraco.` }
    : { ok: false, reason: `O índice ${hole} está ocupado, mas a árvore tem ${n} nós: sobrou buraco antes dele. Numa completa os nós preenchem o array sem pular posição.` };

  // Perfeita: n = 2^altura - 1 e todas as folhas no último nível.
  const highLeaf = leaves.find((i) => levelOf(i) !== height - 1);
  const perfect: Verdict = full.ok && highLeaf === undefined
    ? { ok: true, reason: `Todos os níveis estão cheios: ${n} nós = 2^${height} - 1.` }
    : { ok: false, reason: highLeaf !== undefined
        ? `A folha do índice ${highLeaf} está no nível ${levelOf(highLeaf)}, mas a árvore tem altura ${height}. Na perfeita, toda folha fica no último nível.`
        : `Falta ser cheia primeiro: ${full.reason}` };

  // Balanceada: em TODO nó, |altura(esq) - altura(dir)| <= 1.
  const unbalanced = active.find((i) => Math.abs(heightOf(on, leftOf(i)) - heightOf(on, rightOf(i))) > 1);
  const balanced: Verdict = unbalanced === undefined
    ? { ok: true, reason: "Em todo nó, as duas subárvores diferem em no máximo um nível de altura." }
    : { ok: false, reason: `No nó do índice ${unbalanced}, a subárvore esquerda tem altura ${heightOf(on, leftOf(unbalanced))} e a direita ${heightOf(on, rightOf(unbalanced))}. A diferença passou de 1.` };

  // Degenerada: nenhum nó tem dois filhos.
  const withTwoChildren = active.find((i) => childrenOf(i).length === 2);
  const degenerate: Verdict = withTwoChildren === undefined
    ? { ok: true, reason: `Nenhum nó tem dois filhos: a árvore virou uma lista de ${n} elementos, com altura ${height} em vez de ${Math.ceil(Math.log2(n + 1))}.` }
    : { ok: false, reason: `O nó do índice ${withTwoChildren} tem dois filhos, então a árvore ramifica.` };

  return { full, perfect, complete, balanced, degenerate, n, height, leaves: leaves.length };
}

// Geometria: nível k tem 2^k posições, distribuídas para caber na mesma largura.
const WIDTH = 620;
const STEP_Y = 66;
const R = 15;
const TOP = 20;
// Altura natural do desenho, no atributo E no viewBox. Renderizado igual ao
// natural quer dizer que não existe esticão, e portanto não existe vazio que um
// teto de altura pudesse devolver — só conteúdo que ele encolheria (§3).
const HEIGHT = TOP * 2 + (LEVELS - 1) * STEP_Y + R * 2;

function cxOf(i: number): number {
  const level = levelOf(i);
  const idxInLevel = i - ((1 << level) - 1);
  const perLevel = 1 << level;
  return ((idxInLevel + 0.5) / perLevel) * WIDTH;
}
const cyOf = (i: number) => TOP + R + levelOf(i) * STEP_Y;

export function BinaryTreeFormatos() {
  const [on, setOn] = useState<boolean[]>(() => {
    const a = new Array(SIZE).fill(false);
    for (const i of PRESETS[0].slots) a[i] = true;
    return a;
  });
  const [preset, setPreset] = useState("perfeita");

  const viz = useVisualizer({
    title: "Visualizador · monte a árvore e veja as cinco definições responderem",
    // Classificador: o veredito é imediato, não há passo a passo. Com `total: 1`
    // somem o contador de passo, os atalhos e a barra de progresso.
    total: 1,
    // Não há bloco dispensável: o desenho e os cinco vereditos SÃO o conteúdo.
    // Sem isso o cabeçalho prometeria esconder um bloco que não existe.
    collapsible: false,
    // `measureOn` fica de fora de propósito: com `collapsible: false` não há
    // decisão a tomar, e o hook nem espera as fontes. Passar a lista seria
    // anunciar uma medição que não acontece.
  });

  const apply = (p: Preset) => {
    const a = new Array(SIZE).fill(false);
    for (const i of p.slots) a[i] = true;
    setOn(a);
    setPreset(p.key);
  };

  // Ligar um nó liga a cadeia de ancestrais; desligar apaga a subárvore.
  // É o que mantém "todo nó tem pai" verdadeiro sem precisar avisar o usuário.
  const toggleNode = (i: number) => {
    setPreset("");
    setOn((current) => {
      const next = [...current];
      if (next[i]) {
        const erase = (k: number) => {
          if (k >= SIZE || !next[k]) return;
          next[k] = false;
          erase(leftOf(k));
          erase(rightOf(k));
        };
        erase(i);
        if (i === 0) next[0] = false;
      } else {
        let k = i;
        while (k >= 0) { next[k] = true; if (k === 0) break; k = parentOf(k); }
      }
      return next;
    });
  };

  const c = useMemo(() => classify(on), [on]);
  const arrayView = useMemo(() => {
    const out: (number | null)[] = [];
    for (let i = 0; i < SIZE; i++) out.push(on[i] ? i : null);
    while (out.length && out[out.length - 1] === null) out.pop();
    return out;
  }, [on]);

  const presetHint = PRESETS.find((p) => p.key === preset)?.hint;
  const minHeight = c.n > 0 ? Math.ceil(Math.log2(c.n + 1)) : 0;

  const verdicts: { label: string; v: Verdict }[] = [
    { label: "Cheia", v: c.full },
    { label: "Perfeita", v: c.perfect },
    { label: "Completa", v: c.complete },
    { label: "Balanceada", v: c.balanced },
    { label: "Degenerada", v: c.degenerate },
  ];

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      {/* Sem linha do tempo não há "passo N de M"; o número que resume o estado
          entra no lugar dele, com o rótulo junto. */}
      <VizHeader viz={viz}>
        <span className="viz-step">{c.n} {c.n === 1 ? "nó" : "nós"} · altura {c.height}</span>
      </VizHeader>

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((p) => (
            <button
              type="button"
              key={p.key}
              className={`bigo-chip${preset === p.key ? " on" : ""}`}
              onClick={() => apply(p)}
              aria-pressed={preset === p.key}
            >
              {p.label}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">
          {presetHint ?? "Clique em qualquer posição para ligar ou desligar o nó. Ligar um nó traz os ancestrais junto; desligar leva a subárvore embora."}
        </p>

        <div className="tt-arv-wrap">
          <svg
            className="tt-arv bt-arv"
            width={WIDTH}
            height={HEIGHT}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={`Árvore binária com ${c.n} nós e altura ${c.height}. Cheia: ${c.full.ok ? "sim" : "não"}. Perfeita: ${c.perfect.ok ? "sim" : "não"}. Completa: ${c.complete.ok ? "sim" : "não"}. Balanceada: ${c.balanced.ok ? "sim" : "não"}.`}
          >
            {Array.from({ length: SIZE }, (_, i) => i)
              .filter((i) => i > 0 && on[i] && on[parentOf(i)])
              .map((i) => (
                <line key={`a${i}`} className="tt-aresta on" x1={cxOf(parentOf(i))} y1={cyOf(parentOf(i)) + R} x2={cxOf(i)} y2={cyOf(i) - R} />
              ))}
            {Array.from({ length: SIZE }, (_, i) => i).map((i) => {
              const canEnable = i === 0 || on[parentOf(i)];
              return (
                <g
                  key={i}
                  className={`bt-slot${on[i] ? " on" : canEnable ? " livre" : " bloq"}`}
                  onClick={() => { if (on[i] || canEnable) toggleNode(i); }}
                  role="button"
                  tabIndex={on[i] || canEnable ? 0 : -1}
                  aria-label={`Posição ${i}, nível ${levelOf(i)}, ${on[i] ? "ocupada" : "vazia"}`}
                  aria-pressed={on[i]}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && (on[i] || canEnable)) {
                      e.preventDefault();
                      toggleNode(i);
                    }
                  }}
                >
                  <circle cx={cxOf(i)} cy={cyOf(i)} r={R} />
                  <text x={cxOf(i)} y={cyOf(i) + 4} textAnchor="middle">{i}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="bt-vereditos">
          {verdicts.map(({ label, v }) => (
            <div key={label} className={`bt-veredito${v.ok ? " sim" : ""}`}>
              <div className="bt-veredito-topo">
                <span className="bt-veredito-nome">{label}</span>
                <span className="bt-veredito-selo">{v.ok ? "sim" : "não"}</span>
              </div>
              <p>{v.reason}</p>
            </div>
          ))}
        </div>

        <div className="bt-array-bloco">
          <div className="tt-painel-tit">
            A mesma árvore num array <em>filhos de i em 2i+1 e 2i+2, pai em (i-1)//2</em>
          </div>
          <div className="bt-array">
            {arrayView.length === 0 ? (
              <span className="tt-vazio">array vazio</span>
            ) : (
              arrayView.map((v, i) => (
                <span key={i} className={`bt-cel${v === null ? " nulo" : ""}`}>
                  <i>{i}</i>
                  {v === null ? "·" : v}
                </span>
              ))
            )}
          </div>
          <p className="bt-array-nota">
            {c.complete.ok && c.n > 0
              ? `Sem buraco: os ${c.n} nós ocupam os índices 0 a ${c.n - 1}. É por isso que a heap, que é sempre completa, vive num array sem ponteiro nenhum.`
              : `Repare nos buracos (·): num array, cada buraco é memória reservada e não usada. Guardar uma árvore que não é completa num array desperdiça espaço, e é por isso que a representação com ponteiros existe.`}
          </p>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat"><span>nós</span><strong>{c.n}</strong></div>
          <div className="bigo-stat"><span>altura</span><strong>{c.height}</strong></div>
          <div className="bigo-stat"><span>altura mínima possível</span><strong>{minHeight}</strong></div>
          <div className="bigo-stat"><span>folhas</span><strong>{c.leaves}</strong></div>
          <div className="bigo-stat"><span>máximo em {c.height} {c.height === 1 ? "nível" : "níveis"}</span><strong>{c.height ? (1 << c.height) - 1 : 0}</strong></div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Compare sempre a altura com a altura mínima possível: a distância entre as duas é exatamente
          o que uma árvore balanceada evita, e o que separa O(log n) de O(n) na busca.
        </p>
      </div>

      {/* Sem linha do tempo e sem botões extras, o rodapé não desenha nada — é o
          comportamento documentado do hook, e está aqui para que acrescentar um
          controle no futuro não passe por reescrever a casca à mão. */}
      <VizFooter viz={viz} />
    </figure>
  );
}
