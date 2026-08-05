"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// BuscaBinariaVisualizer, o descarte é a parte que importa.
//
// A busca binária costuma ser explicada pelo que ela OLHA (o meio), mas a
// mágica está no que ela JOGA FORA. Por isso o painel conta duas coisas lado a
// lado a cada passo: quantas posições ainda restam e quantas foram descartadas
// sem serem lidas. Ver "descartei 4 posições de uma vez, sem olhar" é o que
// transforma O(log n) em intuição.
//
// O contador de comparações fica ao lado do número que a busca linear gastaria
// na MESMA entrada, porque comparar 3 com 8 diz mais que qualquer gráfico.
//
// O meio é calculado como `esq + (dir - esq) // 2`, não `(esq + dir) // 2`. Não
// é preciosismo: a segunda forma estoura um inteiro de 32 bits e o visualizador
// de estouro ao lado mostra isso acontecendo.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type Step = {
  left: number;
  right: number;
  mid: number | null;
  comparisons: number;
  discarded: number;
  line: number;
  found?: boolean;
  done?: boolean;
  note: string;
};

const CODE = [
  "def busca_binaria(nums, alvo):",
  "    esq, dir = 0, len(nums) - 1",
  "    while esq <= dir:",
  "        meio = esq + (dir - esq) // 2",
  "        if nums[meio] == alvo:",
  "            return meio",
  "        if nums[meio] < alvo:",
  "            esq = meio + 1",
  "        else:",
  "            dir = meio - 1",
  "    return -1",
];

function generateSteps(nums: number[], target: number): Step[] {
  const out: Step[] = [];
  const n = nums.length;
  let left = 0;
  let right = n - 1;
  let comparisons = 0;
  let discarded = 0;

  out.push({
    left, right, mid: null, comparisons, discarded, line: 1,
    note: `Começo com o espaço de busca inteiro: da posição 0 até a ${n - 1}, ${n} candidatos. Como o array está ordenado, cada olhada vai eliminar metade deles.`,
  });

  let guard = 0;
  while (left <= right && guard++ < 100) {
    const mid = left + Math.floor((right - left) / 2);
    const remaining = right - left + 1;
    out.push({
      left, right, mid, comparisons, discarded, line: 3,
      note: `Sobram ${remaining} candidato${remaining === 1 ? "" : "s"} (da posição ${left} à ${right}). O meio é ${left} + (${right} - ${left}) // 2 = ${mid}, onde está o valor ${nums[mid]}.`,
    });
    comparisons++;
    if (nums[mid] === target) {
      out.push({
        left, right, mid, comparisons, discarded, line: 5, found: true, done: true,
        note: `${nums[mid]} é o alvo. Achei na posição ${mid} lendo ${comparisons} posiç${comparisons === 1 ? "ão" : "ões"} e descartando ${discarded} sem nunca olhar para ${discarded === 1 ? "ela" : "elas"}.`,
      });
      return out;
    }
    if (nums[mid] < target) {
      // A posição do meio sai do intervalo junto, mas ela foi LIDA nesta
      // iteração, então não entra na conta de "descartadas sem ler".
      const blind = mid - left;
      discarded += blind;
      out.push({
        left, right, mid, comparisons, discarded, line: 7,
        note: `${nums[mid]} < ${target}: se o alvo existe, ele está à DIREITA. Descarto a posição ${mid}, que acabei de ler, e ${blind === 0 ? "não sobrou nenhuma antes dela" : `as ${blind} que vêm antes dela sem ler nenhuma`}. A esquerda vai para ${mid + 1}.`,
      });
      left = mid + 1;
    } else {
      const blind = right - mid;
      discarded += blind;
      out.push({
        left, right, mid, comparisons, discarded, line: 9,
        note: `${nums[mid]} > ${target}: se o alvo existe, ele está à ESQUERDA. Descarto a posição ${mid}, que acabei de ler, e ${blind === 0 ? "não sobrou nenhuma depois dela" : `as ${blind} que vêm depois dela sem ler nenhuma`}. A direita recua para ${mid - 1}.`,
      });
      right = mid - 1;
    }
  }

  out.push({
    left, right, mid: null, comparisons, discarded, line: 10, done: true,
    note: `A esquerda (${left}) passou da direita (${right}): o espaço de busca ficou vazio, então ${target} não está no array. Li ${comparisons} posições e descartei ${discarded} sem olhar, e ${comparisons} + ${discarded} = ${n}: cada posição foi lida ou descartada exatamente uma vez. E repare onde a esquerda parou: a posição ${left} é exatamente onde ${target} entraria se fosse inserido.`,
  });
  return out;
}

type Preset = { key: string; label: string; nums: number[]; target: number; hint: string };

const BASE = [2, 6, 10, 15, 20, 43, 60, 70];
const LARGE = [3, 9, 14, 21, 28, 35, 42, 47, 55, 61, 68, 74, 80, 88, 93, 99];

const PRESETS: Preset[] = [
  {
    key: "mid",
    label: "Achando o 20 em 8 posições",
    nums: BASE,
    target: 20,
    hint: "Oito candidatos e três olhadas. A busca linear precisaria de cinco, e a diferença só cresce a partir daqui.",
  },
  {
    key: "large",
    label: "16 posições, no máximo 5 olhadas",
    nums: LARGE,
    target: 93,
    hint: "Dobrar o array de 8 para 16 não dobrou o trabalho: acrescentou uma comparação. É literalmente o que log₂ significa.",
  },
  {
    key: "absent",
    label: "Um valor que não existe: 40",
    nums: BASE,
    target: 40,
    hint: "Provar que algo NÃO está lá custa o mesmo que achar. E o ponteiro da esquerda para exatamente na posição onde o 40 deveria ser inserido, o que é um brinde da mecânica do algoritmo.",
  },
  {
    key: "extreme",
    label: "O pior lugar possível: o 2",
    nums: BASE,
    target: 2,
    hint: "O primeiro elemento é justamente o que a busca binária demora mais para achar, enquanto a busca linear acerta de primeira. Nenhum algoritmo ganha em tudo.",
  },
];

function sortAsc(v: number[]) {
  return [...v].sort((a, b) => a - b);
}

export function BuscaBinariaVisualizer() {
  const [nums, setNums] = useState<number[]>(BASE);
  const [input, setInput] = useState(BASE.join(", "));
  const [target, setTarget] = useState(20);
  const [presetKey, setPresetKey] = useState("mid");

  const steps = useMemo(() => generateSteps(nums.length ? nums : [0], target), [nums, target]);
  const n = nums.length;

  const viz = useVisualizer({
    title: "Visualizador · busca binária: metade some a cada olhada",
    total: steps.length,
    // O que muda a altura da peça, medido: o tamanho do array — a fita de
    // células é `flex-wrap: wrap`, e ela quebra para uma segunda linha a partir
    // de 14 células (+99px no artigo, de 8 para 16) — e o preset, porque a dica
    // dele só existe quando há preset e cada uma tem um tamanho.
    measureOn: [n, presetKey],
  });

  const s = steps[viz.step];

  const onArrayChange = (v: string) => {
    const arr = sortAsc(
      v.split(",").map((x) => parseInt(x.trim(), 10)).filter((x) => !isNaN(x)).slice(0, 16)
    );
    viz.reset();
    setPresetKey("");
    setInput(v);
    setNums(arr.length ? arr : [0]);
  };
  const onTargetChange = (v: string) => {
    viz.reset();
    setPresetKey("");
    setTarget(parseInt(v, 10) || 0);
  };
  const applyPreset = (pr: Preset) => {
    viz.reset();
    setPresetKey(pr.key);
    setNums(pr.nums);
    setInput(pr.nums.join(", "));
    setTarget(pr.target);
  };

  const preset = PRESETS.find((pr) => pr.key === presetKey);
  const linearPos = nums.indexOf(target);
  const linearSteps = linearPos >= 0 ? linearPos + 1 : n;
  const ceiling = Math.floor(Math.log2(n)) + 1;
  const remaining = Math.max(0, s.right - s.left + 1);

  const cells = nums.map((v, i) => {
    let cls = "viz-cell";
    const inside = i >= s.left && i <= s.right;
    if (!inside) cls += " drop";
    if (i === s.mid) cls += s.found ? " in entra" : " in";
    let mark = "";
    if (inside && i === s.left) mark = "e";
    if (inside && i === s.right) mark = mark ? "e d" : "d";
    if (i === s.mid) mark = mark ? `${mark} m` : "m";
    return { i, v, cls, mark };
  });

  const noteClass = "viz-note" + (s.found ? " ok" : s.done ? " invalid" : "");

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              key={pr.key}
              className={`bigo-chip${presetKey === pr.key ? " on" : ""}`}
              onClick={() => applyPreset(pr)}
              aria-pressed={presetKey === pr.key}
            >
              {pr.label}
            </button>
          ))}
        </div>

        {preset && <p className="tt-legenda-arvore">{preset.hint}</p>}

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Array (é ordenado sozinho, porque a busca binária exige)</span>
            <input className="viz-input" value={input} onChange={(e) => onArrayChange(e.target.value)} />
          </label>
          <label className="viz-field">
            <span>alvo</span>
            <input className="viz-input k" type="number" value={target} onChange={(e) => onTargetChange(e.target.value)} />
          </label>
        </div>

        <div className="viz-cells">
          {cells.map((c) => (
            <div className="viz-cell-wrap" key={c.i}>
              <span className="viz-cell-idx">{c.i}</span>
              <div className={c.cls}>{c.v}</div>
              <span className={`viz-mark${c.mark ? " show" : ""}`}>{c.mark || "·"}</span>
            </div>
          ))}
        </div>

        <div className="bb-barra" aria-hidden="true">
          <div className="bb-barra-fill" style={{ width: `${(remaining / n) * 100}%` }} />
          <span className="bb-barra-txt">
            {remaining} de {n} candidatos ainda de pé
          </span>
        </div>

        <p className={noteClass}>{s.note}</p>

        <div className="viz-split">
          {/* A moldura extra existe para a ALTURA: zerar a trilha da coluna só
              tira a largura, e a linha do grid continuaria com a altura inteira
              do código. O `.viz-code-slot` é o truque de grid 1fr→0fr, a única
              forma de animar altura automática em CSS puro. O código fica no
              DOM mesmo recolhido, e é isso que permite medir o pior caso;
              `inert` tira ele do teclado e dos leitores de tela enquanto está
              fora de vista, com `aria-hidden` de reserva. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">busca_binaria.py</div>
              <div className="viz-code-body">
                {CODE.map((txt, i) => (
                  <div key={i} className={`viz-line${i === s.line ? " on" : ""}`}>
                    <span className="ln">{i + 1}</span>
                    {txt}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div {...viz.varsProps}>
            <div className="viz-vars-head">Variáveis</div>
            <div className="viz-var">
              <span className="viz-var-name">esq</span>
              <span className="viz-var-val">{s.left}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">dir</span>
              <span className="viz-var-val">{s.right}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">meio</span>
              <span className="viz-var-val">{s.mid === null ? "-" : s.mid}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">alvo</span>
              <span className="viz-var-val best">{target}</span>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>comparações até aqui</span>
            <strong>{s.comparisons}</strong>
          </div>
          <div className="bigo-stat">
            <span>descartadas sem ler</span>
            <strong>{s.discarded}</strong>
          </div>
          <div className="bigo-stat">
            <span>busca linear gastaria</span>
            <strong>{linearSteps}</strong>
          </div>
          <div className="bigo-stat">
            <span>teto: ⌊log₂({n})⌋ + 1</span>
            <strong>{ceiling}</strong>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Digite um array desordenado no campo acima e repare que ele é reordenado sozinho antes de rodar. Não
          é conveniência de interface: sem a ordem, o passo &quot;o alvo está à direita&quot; deixa de ser uma
          dedução e vira um chute, e o algoritmo devolve a resposta errada com a mesma confiança.
        </p>
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(frame);
}
