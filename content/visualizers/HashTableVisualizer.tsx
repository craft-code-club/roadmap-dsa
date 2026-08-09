"use client";

import { Fragment, useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// HashTableVisualizer, a inserção de chaves numa tabela hash.
//
// Gerador PURO de passos + a casca compartilhada. A casca vem do
// `useVisualizer`: medição de altura, painel com cabeçalho e controles parados,
// código recolhível e os controles de reprodução. Aqui fica só o que é DESTE
// visualizador. Contrato em `content/visualizers/README.md`.
//
// O palco é uma coluna de buckets em vez de uma fita de células, porque o que o
// aluno precisa ver é o endereço saindo da chave e a colisão acontecendo dentro
// de um bucket específico.
//
// A função de hash é a ingênua (soma dos códigos ASCII, depois o resto pelo
// tamanho da tabela). Ela é ruim de propósito: é justamente por ser ruim que ela
// produz colisões com nomes de três letras e deixa o conceito visível. As
// estratégias de resolução são duas: encadeamento (uma corrente por bucket) e
// sondagem linear (procura o vizinho livre).
// ---------------------------------------------------------------------------

type Entry = { key: string; sum: number };

type Step = {
  line: number;
  cap: number;
  n: number;
  slots: Entry[][];
  key: string | null;
  sum: number | null;
  index: number | null;
  target: number | null;
  probe: number | null;
  comparing: number | null;
  inserted: string | null;
  collisions: number;
  comparisons: number;
  rehash: boolean;
  done: boolean;
  ok: boolean;
  note: string;
};

// As linhas mapeiam 1:1 com o campo `line` de cada passo, então a ordem e a
// quantidade de linhas não podem mudar sem ajustar o gerador junto.
const CHAINING_CODE = [
  "def _hash(self, chave):",
  "    soma = sum(ord(c) for c in chave)",
  "    return soma % len(self.buckets)",
  "",
  "def put(self, chave, valor):",
  "    if (self.n + 1) / len(self.buckets) > 0.75:",
  "        self._rehash()   # dobra e refaz tudo",
  "    i = self._hash(chave)",
  "    for no in self.buckets[i]:",
  "        if no.chave == chave:",
  "            no.valor = valor",
  "            return",
  "    self.buckets[i].append(No(chave, valor))",
  "    self.n += 1",
];

const PROBING_CODE = [
  "def _hash(self, chave):",
  "    soma = sum(ord(c) for c in chave)",
  "    return soma % len(self.slots)",
  "",
  "def put(self, chave, valor):",
  "    if (self.n + 1) / len(self.slots) > 0.75:",
  "        self._rehash()   # dobra e refaz tudo",
  "    i = self._hash(chave)",
  "    while self.slots[i] is not None:",
  "        if self.slots[i].chave == chave:",
  "            self.slots[i].valor = valor",
  "            return",
  "        i = (i + 1) % len(self.slots)",
  "    self.slots[i] = Item(chave, valor)",
  "    self.n += 1",
];

const SPEEDS = [0, 1400, 950, 650, 420, 250];

const LOAD_LIMIT = 0.75;
const MAX_CAP = 32;

// Formatação determinística: nada de Intl no caminho de render, senão o HTML
// do build diverge do cliente na hidratação.
function dec(v: number): string {
  return (Math.round(v * 100) / 100).toFixed(2).replace(".", ",");
}

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

function clone(slots: Entry[][]): Entry[][] {
  return slots.map((b) => b.slice());
}

function plural(v: number, one: string, many: string): string {
  return `${v} ${v === 1 ? one : many}`;
}

function generateSteps(keys: string[], initialCap: number, chained: boolean, resizes: boolean): Step[] {
  const out: Step[] = [];
  let cap = Math.max(1, initialCap);
  let slots: Entry[][] = Array.from({ length: cap }, () => [] as Entry[]);
  let n = 0;
  let collisions = 0;
  let comparisons = 0;

  const base = () => ({
    cap,
    n,
    slots: clone(slots),
    key: null as string | null,
    sum: null as number | null,
    index: null as number | null,
    target: null as number | null,
    probe: null as number | null,
    comparing: null as number | null,
    inserted: null as string | null,
    collisions,
    comparisons,
    rehash: false,
    done: false,
    ok: false,
  });

  out.push({
    ...base(),
    line: 4,
    note: `Tabela vazia com ${plural(cap, "bucket", "buckets")}. Vou inserir ${plural(keys.length, "chave", "chaves")}, uma de cada vez, e o endereço de cada uma sai da própria chave.`,
  });

  let guard = 0;
  for (const key of keys) {
    if (guard++ > 40) break;
    const sum = asciiSum(key);

    // Fator de carga: o redimensionamento acontece ANTES de inserir, para a
    // tabela nunca chegar de fato aos 75% de ocupação.
    if (resizes && cap < MAX_CAP && (n + 1) / cap > LOAD_LIMIT) {
      out.push({
        ...base(),
        line: 5,
        key,
        sum,
        note: `Com "${key}" seriam ${n + 1} chaves em ${cap} buckets: fator de carga ${dec((n + 1) / cap)}, acima de 0,75. Redimensiono antes de inserir.`,
      });
      const previous: Entry[] = [];
      for (const b of slots) for (const entry of b) previous.push(entry);
      const oldCap = cap;
      cap = cap * 2;
      slots = Array.from({ length: cap }, () => [] as Entry[]);
      out.push({
        ...base(),
        line: 6,
        key,
        sum,
        rehash: true,
        note: `Dobro a capacidade de ${oldCap} para ${cap}. O divisor do módulo mudou, então nenhum endereço antigo vale: preciso refazer o hash das ${plural(previous.length, "chave que já estava dentro", "chaves que já estavam dentro")}.`,
      });
      for (const entry of previous) {
        const j = entry.sum % cap;
        const before = entry.sum % oldCap;
        slots[j].push(entry);
        out.push({
          ...base(),
          line: 6,
          key: entry.key,
          sum: entry.sum,
          index: j,
          target: j,
          inserted: entry.key,
          rehash: true,
          note: `Rehash de "${entry.key}": ${entry.sum} % ${cap} = ${j}. Com ${oldCap} buckets ela morava no ${before}${j === before ? ", e por sorte não saiu do lugar." : "."}`,
        });
      }
    }

    out.push({
      ...base(),
      line: 1,
      key,
      sum,
      note: `Somo os códigos ASCII de "${key}": ${asciiDetail(key)} = ${sum}.`,
    });

    const i = sum % cap;
    out.push({
      ...base(),
      line: 2,
      key,
      sum,
      index: i,
      target: i,
      note: `${sum} % ${cap} = ${i}. O endereço de "${key}" é o bucket ${i}, e eu cheguei nele sem olhar nenhum outro.`,
    });

    if (chained) {
      const before = slots[i].length;
      let exists = false;
      for (let k = 0; k < before; k++) {
        comparisons++;
        const other = slots[i][k];
        const same = other.key === key;
        // Colisão é bater numa chave DIFERENTE no endereço calculado. Reinserir
        // a mesma chave é atualização, e contar isso como colisão mentiria para
        // quem está lendo o contador (tente "Ana, Ana": colisões continua 0).
        if (k === 0 && !same) collisions++;
        out.push({
          ...base(),
          line: 9,
          key,
          sum,
          index: i,
          target: i,
          comparing: k,
          note: same
            ? `O bucket ${i} já guarda "${key}". Mesma chave, mesmo hash: só troco o valor, a tabela não cresce.`
            : `Colisão: o bucket ${i} já tem "${other.key}". O hash bateu, a chave não. Comparo, descarto e sigo na corrente.`,
        });
        if (same) {
          exists = true;
          break;
        }
      }
      if (exists) continue;
      slots[i].push({ key, sum });
      n++;
      out.push({
        ...base(),
        line: 12,
        key,
        sum,
        index: i,
        target: i,
        inserted: key,
        note:
          before > 0
            ? `"${key}" entra no fim da corrente do bucket ${i}, que agora tem ${plural(before + 1, "nó", "nós")}.`
            : `Bucket ${i} livre: "${key}" entra como primeiro nó da corrente.`,
      });
    } else {
      let j = i;
      let probes = 0;
      let exists = false;
      let full = false;
      while (slots[j].length > 0) {
        comparisons++;
        if (slots[j][0].key === key) {
          out.push({
            ...base(),
            line: 9,
            key,
            sum,
            index: i,
            target: i,
            probe: j,
            comparing: 0,
            note: `O índice ${j} já guarda "${key}". Mesma chave: só troco o valor, a tabela não cresce.`,
          });
          exists = true;
          break;
        }
        if (probes === 0) collisions++;
        const next = (j + 1) % cap;
        out.push({
          ...base(),
          line: 12,
          key,
          sum,
          index: i,
          target: i,
          probe: j,
          comparing: 0,
          note: `Índice ${j} ocupado por "${slots[j][0].key}", que não é "${key}". Sondagem linear: tento o vizinho, (${j} + 1) % ${cap} = ${next}.`,
        });
        j = next;
        probes++;
        if (probes >= cap) {
          full = true;
          break;
        }
      }
      if (exists) continue;
      if (full) {
        out.push({
          ...base(),
          line: 8,
          key,
          sum,
          index: i,
          target: i,
          done: true,
          note: `Dei a volta inteira e não achei índice livre: a tabela lotou. Sem redimensionamento, a sondagem linear simplesmente não tem para onde ir.`,
        });
        return out;
      }
      slots[j].push({ key, sum });
      n++;
      out.push({
        ...base(),
        line: 13,
        key,
        sum,
        index: i,
        target: i,
        probe: j === i ? null : j,
        inserted: key,
        note:
          j === i
            ? `Índice ${i} livre: "${key}" entra direto, sem sondagem nenhuma.`
            : `Índice ${j} livre: "${key}" mora aqui, ${plural(probes, "casa", "casas")} depois do endereço que o hash mandou (${i}).`,
      });
    }
  }

  out.push({
    ...base(),
    line: chained ? 13 : 14,
    done: true,
    ok: true,
    note: `Fim: ${plural(n, "chave", "chaves")} em ${plural(cap, "bucket", "buckets")}, fator de carga ${dec(cap ? n / cap : 0)}. Deu ${plural(collisions, "colisão", "colisões")} e ${plural(comparisons, "comparação de chave", "comparações de chave")} no caminho todo.`,
  });
  return out;
}

type Preset = {
  label: string;
  keys: string;
  cap: number;
  chained: boolean;
  resizes: boolean;
};

const PRESETS: Preset[] = [
  { label: "Cinco chaves, cinco buckets", keys: "Ana, Bob, Lia, Leo, Eva", cap: 5, chained: true, resizes: false },
  { label: "Sondagem linear", keys: "Ana, Bob, Lia, Leo, Eva", cap: 5, chained: false, resizes: false },
  { label: "Rehash acontecendo", keys: "Ana, Bob, Lia, Leo, Eva", cap: 4, chained: true, resizes: true },
  { label: "Anagramas: o pior caso", keys: "Lia, Ali, Ila, Lai", cap: 5, chained: true, resizes: false },
];

const POOL = ["Ana", "Bob", "Lia", "Leo", "Eva", "Kim", "Ben", "Mia", "Rui", "Zoe", "Ivo", "Gil", "Tom", "Vera"];

function readKeys(text: string): string[] {
  return text
    .split(",")
    .map((x) => x.trim().slice(0, 12))
    .filter((x) => x.length > 0)
    .slice(0, 12);
}

export function HashTableVisualizer() {
  const [input, setInput] = useState(PRESETS[0].keys);
  const [cap, setCap] = useState(PRESETS[0].cap);
  const [chained, setChained] = useState(PRESETS[0].chained);
  const [resizes, setResizes] = useState(PRESETS[0].resizes);

  const keys = useMemo(() => readKeys(input), [input]);
  const steps = useMemo(
    () => generateSteps(keys.length ? keys : ["Ana"], cap, chained, resizes),
    [keys, cap, chained, resizes]
  );

  const viz = useVisualizer({
    title: "Visualizador · inserindo chaves numa tabela hash",
    total: steps.length,
    speeds: SPEEDS,
    // O que muda a altura da peça: a capacidade (cada bucket é uma linha da
    // coluna), a estratégia (o código tem 14 ou 15 linhas, e a sondagem não
    // desenha corrente) e quantas chaves entram (as correntes crescem).
    // `resizes` entra porque o rehash dobra a capacidade durante a animação.
    measureOn: [cap, chained, keys.length, resizes],
  });

  const p = steps[viz.step];
  const code = chained ? CHAINING_CODE : PROBING_CODE;

  const applyPreset = (pr: Preset) => {
    viz.reset();
    setInput(pr.keys);
    setCap(pr.cap);
    setChained(pr.chained);
    setResizes(pr.resizes);
  };

  // Math.random só aqui, num handler de clique. No caminho de render ele
  // quebraria a hidratação (o HTML do build divergiria do cliente).
  const shuffle = () => {
    const remaining = [...POOL];
    const picked: string[] = [];
    const howMany = 5 + Math.floor(Math.random() * 3);
    for (let k = 0; k < howMany && remaining.length; k++) {
      picked.push(remaining.splice(Math.floor(Math.random() * remaining.length), 1)[0]);
    }
    viz.reset();
    setInput(picked.join(", "));
  };

  const load = p.cap ? p.n / p.cap : 0;
  const vars = [
    { name: "chave", value: p.key ? `"${p.key}"` : "-" },
    { name: "soma", value: p.sum == null ? "-" : `${p.sum}` },
    { name: "indice", value: p.index == null ? "-" : `${p.index}` },
    { name: "capacidade", value: `${p.cap}` },
    { name: "n", value: `${p.n}` },
    { name: "fator_carga", value: dec(load), best: load <= LOAD_LIMIT },
    { name: "colisoes", value: `${p.collisions}` },
    { name: "comparacoes", value: `${p.comparisons}` },
  ];

  const noteClass = "viz-note" + (p.ok ? " ok" : p.done ? " invalid" : "");
  const highlight = p.probe != null ? p.probe : p.target;

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Chaves (na ordem de inserção)</span>
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
            <span>Capacidade</span>
            <select
              className="viz-input ht-sel"
              value={cap}
              onChange={(e) => {
                viz.reset();
                setCap(parseInt(e.target.value, 10));
              }}
            >
              <option value={4}>4</option>
              <option value={5}>5</option>
              <option value={8}>8</option>
              <option value={16}>16</option>
            </select>
          </label>
          <button type="button" className="viz-btn" onClick={shuffle}>
            Sortear
          </button>
        </div>

        <div className="bigo-chips">
          <button
            type="button"
            className={`bigo-chip${chained ? " on" : ""}`}
            aria-pressed={chained}
            onClick={() => {
              viz.reset();
              setChained(true);
            }}
          >
            <span className="sw" style={{ background: chained ? "#34d399" : "#3a4a60" }} />
            Encadeamento
          </button>
          <button
            type="button"
            className={`bigo-chip${!chained ? " on" : ""}`}
            aria-pressed={!chained}
            onClick={() => {
              viz.reset();
              setChained(false);
            }}
          >
            <span className="sw" style={{ background: !chained ? "#fbbf24" : "#3a4a60" }} />
            Sondagem linear
          </button>
          <button
            type="button"
            className={`bigo-chip${resizes ? " on" : ""}`}
            aria-pressed={resizes}
            onClick={() => {
              viz.reset();
              setResizes((v) => !v);
            }}
          >
            <span className="sw" style={{ background: resizes ? "#60a5fa" : "#3a4a60" }} />
            Rehash em 0,75
          </button>
        </div>

        <div className="ht-presets">
          <span>Cenários</span>
          {PRESETS.map((pr) => (
            <button type="button" className="viz-btn" key={pr.label} onClick={() => applyPreset(pr)}>
              {pr.label}
            </button>
          ))}
        </div>

        <div className="ht-table">
          {p.slots.map((bucket, i) => {
            let cls = "ht-slot";
            if (p.probe === i) cls += " sonda";
            else if (p.target === i) cls += " alvo";
            return (
              <div className="ht-row" key={i}>
                <span className="ht-idx">{i}</span>
                <div className={cls}>
                  {bucket.length === 0 ? (
                    <span className="ht-vazio">vazio</span>
                  ) : (
                    bucket.map((entry, k) => {
                      let nodeClass = "ht-no";
                      if (entry.key === p.inserted) nodeClass += " novo";
                      else if (highlight === i && p.comparing === k) nodeClass += " compara";
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
            );
          })}
        </div>

        <div className="ht-legenda">
          <span>
            <i style={{ background: "rgba(59, 130, 246, 0.7)" }} />
            bucket que o hash apontou
          </span>
          <span>
            <i style={{ background: "#fbbf24" }} />
            comparação de chave / sondagem
          </span>
          <span>
            <i style={{ background: "#34d399" }} />
            acabou de entrar
          </span>
        </div>

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com a altura inteira
              do código. O `.viz-code-slot` é o truque de grid 1fr→0fr, a única
              forma de animar altura automática em CSS puro. O código fica no
              DOM mesmo recolhido, e é isso que permite medir o pior caso. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">tabela_hash.py</div>
              <div className="viz-code-body">
                {code.map((txt, i) => (
                  <div key={i} className={`viz-line${i === p.line ? " on" : ""}`}>
                    <span className="ln">{i + 1}</span>
                    {txt}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div {...viz.varsProps}>
            <div className="viz-vars-head">Variáveis</div>
            {vars.map((v) => (
              <div className="viz-var" key={v.name}>
                <span className="viz-var-name">{v.name}</span>
                <span className={`viz-var-val${v.best ? " best" : ""}`}>{v.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fora do `.viz-body` de propósito: no expandido é ele que fica parado no
          pé da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(frame);
}
