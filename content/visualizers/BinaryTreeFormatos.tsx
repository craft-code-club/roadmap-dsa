"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

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
// ---------------------------------------------------------------------------

const NIVEIS = 4;                 // 4 níveis => 15 posições
const TAM = (1 << NIVEIS) - 1;    // 15

type Preset = { key: string; rotulo: string; slots: number[]; dica: string };

// Cada preset é a lista de índices ligados no array de 15 posições.
const PRESETS: Preset[] = [
  {
    key: "perfeita",
    rotulo: "Perfeita",
    slots: [0, 1, 2, 3, 4, 5, 6],
    dica: "Todo nó interno com dois filhos e todas as folhas no mesmo nível. É o melhor caso de altura: 7 nós em altura 3.",
  },
  {
    key: "completa",
    rotulo: "Completa, não perfeita",
    slots: [0, 1, 2, 3, 4, 5],
    dica: "Níveis cheios, menos o último, que é preenchido da esquerda para a direita sem buraco. É a forma da heap.",
  },
  {
    key: "cheia",
    rotulo: "Cheia, não completa",
    slots: [0, 1, 2, 5, 6],
    dica: "Todo nó tem 0 ou 2 filhos, mas o último nível tem buraco à esquerda. Cheia não implica completa.",
  },
  {
    key: "balanceada",
    rotulo: "Balanceada, não cheia",
    slots: [0, 1, 2, 3, 6],
    dica: "Nenhum nó tem subárvores com mais de um nível de diferença, mesmo com nó de um filho só.",
  },
  {
    key: "degenerada",
    rotulo: "Degenerada",
    slots: [0, 1, 3, 7],
    dica: "Todo nó tem no máximo um filho: virou uma lista encadeada com passos extras, e a altura vira n.",
  },
];

const pai = (i: number) => (i - 1) >> 1;
const esq = (i: number) => 2 * i + 1;
const dir = (i: number) => 2 * i + 2;
const nivelDe = (i: number) => Math.floor(Math.log2(i + 1));

type Veredito = { ok: boolean; motivo: string };

function alturaDe(on: boolean[], i: number): number {
  if (i >= TAM || !on[i]) return 0;
  return 1 + Math.max(alturaDe(on, esq(i)), alturaDe(on, dir(i)));
}

// As cinco definições, cada uma devolvendo o motivo do "não". O motivo é o que
// transforma o veredito em aprendizado: dizer "não é completa" não ensina nada,
// dizer "o índice 5 está vazio e o 6 está ocupado" ensina.
function classificar(on: boolean[]) {
  const ativos: number[] = [];
  for (let i = 0; i < TAM; i++) if (on[i]) ativos.push(i);
  const n = ativos.length;

  if (n === 0) {
    const vazio: Veredito = { ok: false, motivo: "A árvore está vazia. Clique num nó para começar." };
    return { cheia: vazio, perfeita: vazio, completa: vazio, balanceada: vazio, degenerada: vazio, n, altura: 0, folhas: 0 };
  }

  const filhosDe = (i: number) => [esq(i), dir(i)].filter((c) => c < TAM && on[c]);
  const folhas = ativos.filter((i) => filhosDe(i).length === 0);
  const altura = alturaDe(on, 0);

  // Cheia: todo nó tem 0 ou 2 filhos.
  const comUmFilho = ativos.find((i) => filhosDe(i).length === 1);
  const cheia: Veredito = comUmFilho === undefined
    ? { ok: true, motivo: "Todo nó tem 0 ou 2 filhos." }
    : { ok: false, motivo: `O nó do índice ${comUmFilho} tem um filho só. Numa árvore cheia não existe nó com exatamente um filho.` };

  // Completa: os índices ocupados são exatamente 0..n-1 no array.
  const buraco = ativos.find((i) => i >= n);
  const completa: Veredito = buraco === undefined
    ? { ok: true, motivo: `Os ${n} nós ocupam exatamente os índices 0 a ${n - 1}: nenhum buraco.` }
    : { ok: false, motivo: `O índice ${buraco} está ocupado, mas a árvore tem ${n} nós: sobrou buraco antes dele. Numa completa os nós preenchem o array sem pular posição.` };

  // Perfeita: n = 2^altura - 1 e todas as folhas no último nível.
  const folhaAlta = folhas.find((i) => nivelDe(i) !== altura - 1);
  const perfeita: Veredito = cheia.ok && folhaAlta === undefined
    ? { ok: true, motivo: `Todos os níveis estão cheios: ${n} nós = 2^${altura} - 1.` }
    : { ok: false, motivo: folhaAlta !== undefined
        ? `A folha do índice ${folhaAlta} está no nível ${nivelDe(folhaAlta)}, mas a árvore tem altura ${altura}. Na perfeita, toda folha fica no último nível.`
        : `Falta ser cheia primeiro: ${cheia.motivo}` };

  // Balanceada: em TODO nó, |altura(esq) - altura(dir)| <= 1.
  const desbalanceado = ativos.find((i) => Math.abs(alturaDe(on, esq(i)) - alturaDe(on, dir(i))) > 1);
  const balanceada: Veredito = desbalanceado === undefined
    ? { ok: true, motivo: "Em todo nó, as duas subárvores diferem em no máximo um nível de altura." }
    : { ok: false, motivo: `No nó do índice ${desbalanceado}, a subárvore esquerda tem altura ${alturaDe(on, esq(desbalanceado))} e a direita ${alturaDe(on, dir(desbalanceado))}. A diferença passou de 1.` };

  // Degenerada: nenhum nó tem dois filhos.
  const comDois = ativos.find((i) => filhosDe(i).length === 2);
  const degenerada: Veredito = comDois === undefined
    ? { ok: true, motivo: `Nenhum nó tem dois filhos: a árvore virou uma lista de ${n} elementos, com altura ${altura} em vez de ${Math.ceil(Math.log2(n + 1))}.` }
    : { ok: false, motivo: `O nó do índice ${comDois} tem dois filhos, então a árvore ramifica.` };

  return { cheia, perfeita, completa, balanceada, degenerada, n, altura, folhas: folhas.length };
}

// Geometria: nível k tem 2^k posições, distribuídas para caber na mesma largura.
const LARG = 620;
const PASSO_Y = 66;
const R = 15;
const TOPO = 20;

function cxDe(i: number): number {
  const nivel = nivelDe(i);
  const idxNoNivel = i - ((1 << nivel) - 1);
  const total = 1 << nivel;
  return ((idxNoNivel + 0.5) / total) * LARG;
}
const cyDe = (i: number) => TOPO + R + nivelDe(i) * PASSO_Y;

export function BinaryTreeFormatos() {
  const [on, setOn] = useState<boolean[]>(() => {
    const a = new Array(TAM).fill(false);
    for (const i of PRESETS[0].slots) a[i] = true;
    return a;
  });
  const [preset, setPreset] = useState("perfeita");
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const aplicar = (p: Preset) => {
    const a = new Array(TAM).fill(false);
    for (const i of p.slots) a[i] = true;
    setOn(a);
    setPreset(p.key);
  };

  // Ligar um nó liga a cadeia de ancestrais; desligar apaga a subárvore.
  // É o que mantém "todo nó tem pai" verdadeiro sem precisar avisar o usuário.
  const alternar = (i: number) => {
    setPreset("");
    setOn((atual) => {
      const novo = [...atual];
      if (novo[i]) {
        const apaga = (k: number) => {
          if (k >= TAM || !novo[k]) return;
          novo[k] = false;
          apaga(esq(k));
          apaga(dir(k));
        };
        apaga(i);
        if (i === 0) novo[0] = false;
      } else {
        let k = i;
        while (k >= 0) { novo[k] = true; if (k === 0) break; k = pai(k); }
      }
      return novo;
    });
  };

  const c = useMemo(() => classificar(on), [on]);
  const arrayView = useMemo(() => {
    const out: (number | null)[] = [];
    for (let i = 0; i < TAM; i++) out.push(on[i] ? i : null);
    while (out.length && out[out.length - 1] === null) out.pop();
    return out;
  }, [on]);

  const dicaPreset = PRESETS.find((p) => p.key === preset)?.dica;
  const alturaMin = c.n > 0 ? Math.ceil(Math.log2(c.n + 1)) : 0;

  const vereditos: { rotulo: string; v: Veredito }[] = [
    { rotulo: "Cheia", v: c.cheia },
    { rotulo: "Perfeita", v: c.perfeita },
    { rotulo: "Completa", v: c.completa },
    { rotulo: "Balanceada", v: c.balanceada },
    { rotulo: "Degenerada", v: c.degenerada },
  ];

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · monte a árvore e veja as cinco definições responderem</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">{c.n} {c.n === 1 ? "nó" : "nós"} · altura {c.altura}</span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "✕ Fechar" : "⤢ Expandir"}
          </button>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              className={`bigo-chip${preset === p.key ? " on" : ""}`}
              onClick={() => aplicar(p)}
              aria-pressed={preset === p.key}
            >
              {p.rotulo}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">
          {dicaPreset ?? "Clique em qualquer posição para ligar ou desligar o nó. Ligar um nó traz os ancestrais junto; desligar leva a subárvore embora."}
        </p>

        <div className="tt-arv-wrap">
          <svg
            className="tt-arv bt-arv"
            width={LARG}
            height={TOPO * 2 + (NIVEIS - 1) * PASSO_Y + R * 2}
            viewBox={`0 0 ${LARG} ${TOPO * 2 + (NIVEIS - 1) * PASSO_Y + R * 2}`}
            role="img"
            aria-label={`Árvore binária com ${c.n} nós e altura ${c.altura}. Cheia: ${c.cheia.ok ? "sim" : "não"}. Perfeita: ${c.perfeita.ok ? "sim" : "não"}. Completa: ${c.completa.ok ? "sim" : "não"}. Balanceada: ${c.balanceada.ok ? "sim" : "não"}.`}
          >
            {Array.from({ length: TAM }, (_, i) => i)
              .filter((i) => i > 0 && on[i] && on[pai(i)])
              .map((i) => (
                <line key={`a${i}`} className="tt-aresta on" x1={cxDe(pai(i))} y1={cyDe(pai(i)) + R} x2={cxDe(i)} y2={cyDe(i) - R} />
              ))}
            {Array.from({ length: TAM }, (_, i) => i).map((i) => {
              const podeLigar = i === 0 || on[pai(i)];
              return (
                <g
                  key={i}
                  className={`bt-slot${on[i] ? " on" : podeLigar ? " livre" : " bloq"}`}
                  onClick={() => { if (on[i] || podeLigar) alternar(i); }}
                  role="button"
                  tabIndex={on[i] || podeLigar ? 0 : -1}
                  aria-label={`Posição ${i}, nível ${nivelDe(i)}, ${on[i] ? "ocupada" : "vazia"}`}
                  aria-pressed={on[i]}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && (on[i] || podeLigar)) {
                      e.preventDefault();
                      alternar(i);
                    }
                  }}
                >
                  <circle cx={cxDe(i)} cy={cyDe(i)} r={R} />
                  <text x={cxDe(i)} y={cyDe(i) + 4} textAnchor="middle">{i}</text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="bt-vereditos">
          {vereditos.map(({ rotulo, v }) => (
            <div key={rotulo} className={`bt-veredito${v.ok ? " sim" : ""}`}>
              <div className="bt-veredito-topo">
                <span className="bt-veredito-nome">{rotulo}</span>
                <span className="bt-veredito-selo">{v.ok ? "sim" : "não"}</span>
              </div>
              <p>{v.motivo}</p>
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
            {c.completa.ok && c.n > 0
              ? `Sem buraco: os ${c.n} nós ocupam os índices 0 a ${c.n - 1}. É por isso que a heap, que é sempre completa, vive num array sem ponteiro nenhum.`
              : `Repare nos buracos (·): num array, cada buraco é memória reservada e não usada. Guardar uma árvore que não é completa num array desperdiça espaço, e é por isso que a representação com ponteiros existe.`}
          </p>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat"><span>nós</span><strong>{c.n}</strong></div>
          <div className="bigo-stat"><span>altura</span><strong>{c.altura}</strong></div>
          <div className="bigo-stat"><span>altura mínima possível</span><strong>{alturaMin}</strong></div>
          <div className="bigo-stat"><span>folhas</span><strong>{c.folhas}</strong></div>
          <div className="bigo-stat"><span>máximo em {c.altura} {c.altura === 1 ? "nível" : "níveis"}</span><strong>{c.altura ? (1 << c.altura) - 1 : 0}</strong></div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Compare sempre a altura com a altura mínima possível: a distância entre as duas é exatamente
          o que uma árvore balanceada evita, e o que separa O(log n) de O(n) na busca.
        </p>
      </div>
    </figure>
  );

  if (expanded && mounted) {
    return createPortal(
      <div className="viz-overlay" onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false); }}>
        {viz}
      </div>,
      document.body
    );
  }
  return viz;
}
