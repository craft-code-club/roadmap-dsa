"use client";

import { Fragment, useMemo, useState } from "react";

import { comNumero } from "@/lib/format";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// HashTableBuscaVisualizer, a corrida entre busca linear e busca por hash.
//
// Duas abordagens lado a lado, sincronizadas pelo mesmo contador de passos:
// quem termina primeiro fica parado enquanto a outra continua. É essa imagem
// (o contador da esquerda subindo sozinho) que ensina a diferença entre O(n) e
// O(1) melhor do que qualquer parágrafo.
//
// A casca vem do `useVisualizer`, com `collapsible: false`: esta peça não tem
// bloco dispensável — os dois painéis, a fita de buckets e os cartões de pior
// caso são todos conteúdo, e o contrato é explícito em não inventar um bloco só
// para ganhar o botão. Ela leva as camadas 1 e 2 (cabeçalho e controles parados
// no painel, respiro comprimido em tela baixa) e nada mais.
//
// O botão "hash ruim" troca a função por uma que devolve 0 para qualquer chave,
// que é o acidente clássico de sobrescrever o hash code sem pensar. Aí os dois
// contadores empatam e o O(n) do pior caso aparece.
//
// Capacidade fixa em 11 de propósito: número primo espalha melhor os restos.
// ---------------------------------------------------------------------------

type Entry = { key: string; sum: number };

type ListStep = {
  pos: number;
  comparisons: number;
  found: boolean;
  done: boolean;
  note: string;
};

type HashStep = {
  index: number | null;
  pos: number | null;
  comparisons: number;
  found: boolean;
  done: boolean;
  note: string;
};

const CAP = 11;
const SPEEDS = [0, 1400, 950, 650, 420, 250];

function asciiSum(s: string): number {
  let t = 0;
  for (const c of s) t += c.codePointAt(0) ?? 0;
  return t;
}

function asciiDetail(s: string): string {
  const parts: string[] = [];
  for (const c of s) parts.push(String(c.codePointAt(0) ?? 0));
  return parts.join(" + ");
}

// Formatação determinística de milhar (nada de Intl no render).
function thousands(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function build(names: string[], bad: boolean): Entry[][] {
  const buckets: Entry[][] = Array.from({ length: CAP }, () => [] as Entry[]);
  for (const name of names) {
    const sum = asciiSum(name);
    buckets[bad ? 0 : sum % CAP].push({ key: name, sum });
  }
  return buckets;
}

function generateListSteps(names: string[], target: string): ListStep[] {
  const out: ListStep[] = [];
  out.push({
    pos: -1,
    comparisons: 0,
    found: false,
    done: false,
    note: `${comNumero(names.length, "nome guardado", "nomes guardados")} e nenhuma ordem que me ajude: não dá para cortar nada. Vou comparar "${target}" com a posição 0, depois a 1, e assim por diante.`,
  });
  for (let j = 0; j < names.length; j++) {
    const same = names[j] === target;
    out.push({
      pos: j,
      comparisons: j + 1,
      found: same,
      done: same,
      note: same
        ? `Posição ${j}: "${names[j]}" é o alvo. Achei, depois de ${comNumero(j + 1, "comparação", "comparações")}.`
        : `Posição ${j}: "${names[j]}" não é "${target}". Passo para a próxima.`,
    });
    if (same) return out;
  }
  out.push({
    pos: names.length,
    comparisons: names.length,
    found: false,
    done: true,
    note: `Cheguei ao fim da lista: "${target}" não está aqui. Só que precisei de ${comNumero(names.length, "comparação", "comparações")} para ter certeza disso.`,
  });
  return out;
}

function generateHashSteps(buckets: Entry[][], target: string, bad: boolean): HashStep[] {
  const out: HashStep[] = [];
  const sum = asciiSum(target);
  out.push({
    index: null,
    pos: null,
    comparisons: 0,
    found: false,
    done: false,
    note: bad
      ? `A função ruim ignora a chave e devolve 0 para tudo, inclusive para "${target}".`
      : `Somo os códigos ASCII de "${target}": ${asciiDetail(target)} = ${sum}.`,
  });
  const i = bad ? 0 : sum % CAP;
  out.push({
    index: i,
    pos: null,
    comparisons: 0,
    found: false,
    done: false,
    note: bad
      ? `Endereço 0, igual a todas as outras chaves: ${comNumero(buckets[0].length, "chave está amontoada", "chaves estão amontoadas")} no bucket 0 e os outros ${CAP - 1} estão vazios.`
      : `${sum} % ${CAP} = ${i}. Salto direto para o bucket ${i} e nem olho os outros ${CAP - 1}.`,
  });
  const chain = buckets[i];
  if (chain.length === 0) {
    out.push({
      index: i,
      pos: null,
      comparisons: 0,
      found: false,
      done: true,
      note: `O bucket ${i} está vazio. Sem comparar nenhuma chave, eu já sei que "${target}" não está na tabela.`,
    });
    return out;
  }
  for (let k = 0; k < chain.length; k++) {
    const same = chain[k].key === target;
    out.push({
      index: i,
      pos: k,
      comparisons: k + 1,
      found: same,
      done: same,
      note: same
        ? `"${chain[k].key}" bate com o alvo. ${comNumero(k + 1, "comparação", "comparações")} e acabou.`
        : `"${chain[k].key}" caiu no mesmo bucket, mas não é "${target}". Ando um nó na corrente.`,
    });
    if (same) return out;
  }
  out.push({
    index: i,
    pos: null,
    comparisons: chain.length,
    found: false,
    done: true,
    note: `A corrente do bucket ${i} acabou e "${target}" não estava nela. Não está na tabela.`,
  });
  return out;
}

const DEFAULT_NAMES = "Ana, Bob, Lia, Leo, Eva, Kim, Ben, Mia";
const POOL = ["Ana", "Bob", "Lia", "Leo", "Eva", "Kim", "Ben", "Mia", "Rui", "Zoe", "Ivo", "Gil", "Tom", "Nina"];

type Preset = { label: string; names: string; target: string; bad: boolean };

const PRESETS: Preset[] = [
  { label: "Alvo no fim da lista", names: DEFAULT_NAMES, target: "Mia", bad: false },
  { label: "Alvo na primeira posição", names: DEFAULT_NAMES, target: "Ana", bad: false },
  { label: "Chave que não existe", names: DEFAULT_NAMES, target: "Zoe", bad: false },
  { label: "Com hash ruim", names: DEFAULT_NAMES, target: "Mia", bad: true },
];

function readNames(text: string): string[] {
  return text
    .split(",")
    .map((x) => x.trim().slice(0, 12))
    .filter((x) => x.length > 0)
    .slice(0, 10);
}

export function HashTableBuscaVisualizer() {
  const [input, setInput] = useState(DEFAULT_NAMES);
  const [target, setTarget] = useState("Mia");
  const [bad, setBad] = useState(false);

  const names = useMemo(() => {
    const read = readNames(input);
    return read.length ? read : ["Ana"];
  }, [input]);
  const cleanTarget = target.trim().slice(0, 12) || names[names.length - 1];
  const buckets = useMemo(() => build(names, bad), [names, bad]);
  const listSteps = useMemo(() => generateListSteps(names, cleanTarget), [names, cleanTarget]);
  const hashSteps = useMemo(() => generateHashSteps(buckets, cleanTarget, bad), [buckets, cleanTarget, bad]);

  const viz = useVisualizer({
    title: "Visualizador · busca linear x busca por hash",
    total: Math.max(listSteps.length, hashSteps.length),
    speeds: SPEEDS,
    // Sem `measureOn`: com `collapsible: false` não há bloco para recolher, o
    // hook não toma decisão nenhuma e a lista seria ruído sugerindo uma medição
    // que não acontece (contrato §6).
    collapsible: false,
  });

  const pl = listSteps[Math.min(viz.step, listSteps.length - 1)];
  const ph = hashSteps[Math.min(viz.step, hashSteps.length - 1)];

  const applyPreset = (pr: Preset) => {
    viz.reset();
    setInput(pr.names);
    setTarget(pr.target);
    setBad(pr.bad);
  };

  // Math.random só aqui, num handler de clique. No caminho de render ele
  // quebraria a hidratação (o HTML do build divergiria do cliente).
  const shuffle = () => {
    const remaining = [...POOL];
    const picked: string[] = [];
    const howMany = 6 + Math.floor(Math.random() * 3);
    for (let k = 0; k < howMany && remaining.length; k++) {
      picked.push(remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0]);
    }
    viz.reset();
    setInput(picked.join(", "));
    setTarget(picked[picked.length - 1]);
  };

  const chain = ph.index == null ? [] : buckets[ph.index];

  const summary = bad
    ? `Com todas as chaves no mesmo bucket, a tabela hash faz ${comNumero(ph.comparisons, "comparação", "comparações")}, o mesmo trabalho da lista. Esse é o O(n) do pior caso, e ele não vem de azar: vem de uma função de hash que não distribui.`
    : `A lista gastou ${comNumero(pl.comparisons, "comparação", "comparações")} e a tabela hash gastou ${comNumero(ph.comparisons, "comparação", "comparações")}. O que importa não é a diferença aqui, é o que acontece quando a entrada cresce: a lista acompanha n, a tabela hash não se mexe.`;

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Nomes guardados</span>
            <input
              className="viz-input"
              value={input}
              onChange={(e) => {
                viz.reset();
                setInput(e.target.value);
              }}
            />
          </label>
          <label className="viz-field">
            <span>Procurar por</span>
            <input
              className="viz-input ht-sel"
              value={target}
              onChange={(e) => {
                viz.reset();
                setTarget(e.target.value);
              }}
            />
          </label>
          <button className="viz-btn" onClick={shuffle}>
            Sortear
          </button>
        </div>

        <div className="bigo-chips">
          <button
            className={`bigo-chip${!bad ? " on" : ""}`}
            aria-pressed={!bad}
            onClick={() => {
              viz.reset();
              setBad(false);
            }}
          >
            <span className="sw" style={{ background: !bad ? "#34d399" : "#3a4a60" }} />
            Hash que distribui
          </button>
          <button
            className={`bigo-chip${bad ? " on" : ""}`}
            aria-pressed={bad}
            onClick={() => {
              viz.reset();
              setBad(true);
            }}
          >
            <span className="sw" style={{ background: bad ? "#f87171" : "#3a4a60" }} />
            Hash ruim (devolve 0 sempre)
          </button>
        </div>

        <div className="ht-presets">
          <span>Cenários</span>
          {PRESETS.map((pr) => (
            <button className="viz-btn" key={pr.label} onClick={() => applyPreset(pr)}>
              {pr.label}
            </button>
          ))}
        </div>

        <div className="ht-painel">
          <div className="ht-painel-tit">
            <span>1. Busca linear na lista</span>
            <em>{comNumero(pl.comparisons, "comparação", "comparações")}</em>
          </div>
          <div className="ht-lista">
            {names.map((name, j) => {
              let cls = "ht-nome";
              if (pl.pos === j) cls += pl.found ? " achou" : " on";
              else if (j < pl.pos) cls += " passou";
              return (
                <span className={cls} key={`${name}-${j}`}>
                  <span className="ord">{j}</span>
                  {name}
                </span>
              );
            })}
          </div>
          <p className={`viz-note${pl.found ? " ok" : pl.done ? " invalid" : ""}`}>{pl.note}</p>
        </div>

        <div className="ht-painel">
          <div className="ht-painel-tit">
            <span>2. Busca na tabela hash ({CAP} buckets)</span>
            <em>{comNumero(ph.comparisons, "comparação", "comparações")}</em>
          </div>
          <div className="ht-strip">
            {buckets.map((b, i) => (
              <div
                key={i}
                className={`ht-bucket${b.length ? " cheio" : ""}${ph.index === i ? " alvo" : ""}`}
              >
                {i}
                <b>{b.length}</b>
              </div>
            ))}
          </div>
          <div className="ht-row">
            <span className="ht-idx">{ph.index == null ? "?" : ph.index}</span>
            <div className={`ht-slot${ph.index == null ? "" : " alvo"}`}>
              {ph.index == null ? (
                <span className="ht-vazio">ainda calculando o hash</span>
              ) : chain.length === 0 ? (
                <span className="ht-vazio">vazio</span>
              ) : (
                chain.map((entry, k) => {
                  let nodeClass = "ht-no";
                  if (ph.pos === k) nodeClass += ph.found ? " achou" : " compara";
                  return (
                    <Fragment key={`${entry.key}-${k}`}>
                      {k > 0 ? <span className="ht-seta">→</span> : null}
                      <span className={nodeClass}>{entry.key}</span>
                    </Fragment>
                  );
                })
              )}
            </div>
          </div>
          <p className={`viz-note${ph.found ? " ok" : ph.done ? " invalid" : ""}`}>{ph.note}</p>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>comparações · lista</span>
            <strong>{pl.comparisons}</strong>
          </div>
          <div className="bigo-stat">
            <span>comparações · hash</span>
            <strong>{ph.comparisons}</strong>
          </div>
          <div className="bigo-stat">
            <span>pior caso · lista com 1 milhão</span>
            <strong>{thousands(1000000)}</strong>
          </div>
          <div className="bigo-stat">
            <span>pior caso · hash com 1 milhão</span>
            <strong>{bad ? thousands(1000000) : "1"}</strong>
          </div>
        </div>

        <p className="viz-note">{summary}</p>
      </div>

      {/* Fora do `.viz-body` de propósito: no expandido é ele que fica parado no
          pé da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(frame);
}
