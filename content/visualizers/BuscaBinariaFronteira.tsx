"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// BuscaBinariaFronteira, o que fazer quando a resposta não é um único índice.
//
// A busca binária de livro responde "achei em i" ou "não achei". Quase todo
// problema real precisa de mais: a PRIMEIRA ocorrência num array com repetidos,
// a ÚLTIMA, ou a posição onde o valor entraria. Os três são a mesma busca com
// uma linha diferente, e é isso que o modo aqui troca.
//
// A ideia central de todos os três é a mesma e vale explicitar: em vez de parar
// no primeiro acerto, o algoritmo ANOTA o acerto e continua estreitando para o
// lado que interessa. Um passo a mais de intuição resolve os três de uma vez.
//
// O modo "onde entraria" também mostra de onde vem o retorno negativo do
// `Arrays.binarySearch` do Java e do `Array.BinarySearch` do .NET, que é o
// truque que transforma uma busca falha numa inserção pronta.
//
// A casca vem do `useVisualizer`: medição de altura, painel com cabeçalho e
// controles parados, código recolhível e os controles de reprodução. Aqui fica
// só o que é DESTE visualizador. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type Mode = "insert" | "first" | "last";

type Step = {
  left: number;
  right: number;
  mid: number | null;
  marked: number;
  line: number;
  comparisons: number;
  done?: boolean;
  // `ok` é o estado terminal BOM do passo, não "o valor existe". No modo
  // "onde entraria" a operação sempre tem sucesso, mesmo com o alvo ausente,
  // porque a resposta dela é a posição de inserção. Quem diz se o valor existe
  // é o texto da nota. É o mesmo nome que os visualizadores de heap usam para
  // este campo.
  ok?: boolean;
  note: string;
};

const CODE: Record<Mode, string[]> = {
  insert: [
    "def onde_entraria(nums, alvo):",
    "    esq, dir = 0, len(nums) - 1",
    "    while esq <= dir:",
    "        meio = esq + (dir - esq) // 2",
    "        if nums[meio] < alvo:",
    "            esq = meio + 1",
    "        else:",
    "            dir = meio - 1",
    "    return esq        # esq para na posição de inserção",
  ],
  first: [
    "def primeira(nums, alvo):",
    "    esq, dir, achou = 0, len(nums) - 1, -1",
    "    while esq <= dir:",
    "        meio = esq + (dir - esq) // 2",
    "        if nums[meio] == alvo:",
    "            achou = meio  # anota e NÃO para",
    "            dir = meio - 1     # procura mais à esquerda",
    "        elif nums[meio] < alvo:",
    "            esq = meio + 1",
    "        else:",
    "            dir = meio - 1",
    "    return achou",
  ],
  last: [
    "def ultima(nums, alvo):",
    "    esq, dir, achou = 0, len(nums) - 1, -1",
    "    while esq <= dir:",
    "        meio = esq + (dir - esq) // 2",
    "        if nums[meio] == alvo:",
    "            achou = meio  # anota e NÃO para",
    "            esq = meio + 1     # procura mais à direita",
    "        elif nums[meio] < alvo:",
    "            esq = meio + 1",
    "        else:",
    "            dir = meio - 1",
    "    return achou",
  ],
};

const FILE: Record<Mode, string> = {
  insert: "onde_entraria.py",
  first: "primeira.py",
  last: "ultima.py",
};

const SIDE: Record<Mode, string> = {
  insert: "onde o valor entraria",
  first: "primeira ocorrência",
  last: "última ocorrência",
};

function generateSteps(nums: number[], target: number, mode: Mode): Step[] {
  const out: Step[] = [];
  let left = 0;
  let right = nums.length - 1;
  let marked = -1;
  let comparisons = 0;

  out.push({
    left, right, mid: null, marked, comparisons, line: 1,
    note:
      mode === "insert"
        ? `Procurando a posição de ${target} em ${nums.length} elementos. Repare que não existe caso de acerto neste código: mesmo se o valor existir, o laço vai até o fim.`
        : `Procurando a ${SIDE[mode]} de ${target}. A diferença para a busca comum é uma linha só: quando eu acertar, vou anotar e continuar procurando para a ${mode === "first" ? "esquerda" : "direita"}.`,
  });

  let guard = 0;
  while (left <= right && guard++ < 100) {
    const mid = left + Math.floor((right - left) / 2);
    comparisons++;
    out.push({
      left, right, mid, marked, comparisons, line: 3,
      note: `Meio em ${mid}, valor ${nums[mid]}. Intervalo vivo: da posição ${left} à ${right}.`,
    });

    if (mode === "insert") {
      if (nums[mid] < target) {
        out.push({
          left, right, mid, marked, comparisons, line: 5,
          note: `${nums[mid]} < ${target}: ${target} não pode entrar em ${mid} nem antes. A esquerda vai para ${mid + 1}.`,
        });
        left = mid + 1;
      } else {
        out.push({
          left, right, mid, marked, comparisons, line: 7,
          note: `${nums[mid]} ${nums[mid] === target ? "empata com" : ">"} ${target}: ${target} entra em ${mid} ou antes, então a direita recua para ${mid - 1}. Repare que o empate cai neste mesmo ramo: é isso que faz a resposta ser a posição do PRIMEIRO igual.`,
        });
        right = mid - 1;
      }
      continue;
    }

    if (nums[mid] === target) {
      marked = mid;
      if (mode === "first") {
        out.push({
          left, right, mid, marked, comparisons, line: 5,
          note: `Achei ${target} na posição ${mid}, mas pode existir outro igual mais à esquerda. Anoto ${mid} como melhor resposta até agora e continuo procurando na metade de baixo.`,
        });
        right = mid - 1;
      } else {
        out.push({
          left, right, mid, marked, comparisons, line: 5,
          note: `Achei ${target} na posição ${mid}, mas pode existir outro igual mais à direita. Anoto ${mid} e continuo procurando na metade de cima.`,
        });
        left = mid + 1;
      }
    } else if (nums[mid] < target) {
      out.push({
        left, right, mid, marked, comparisons, line: 8,
        note: `${nums[mid]} < ${target}: descarto ${mid} e tudo à esquerda. A esquerda vai para ${mid + 1}.`,
      });
      left = mid + 1;
    } else {
      out.push({
        left, right, mid, marked, comparisons, line: 10,
        note: `${nums[mid]} > ${target}: descarto ${mid} e tudo à direita. A direita recua para ${mid - 1}.`,
      });
      right = mid - 1;
    }
  }

  if (mode === "insert") {
    // `esq` pode parar em nums.length quando o alvo é maior que tudo, então o
    // limite é checado antes de indexar. Em JS isso devolveria undefined e a
    // comparação daria falso por acidente; depender disso esconde a intenção.
    const exists = left < nums.length && nums[left] === target;
    out.push({
      left, right, mid: null, marked, comparisons, line: 8, done: true, ok: true,
      note: exists
        ? `O intervalo esvaziou e a esquerda parou em ${left}. Como nums[${left}] é ${target}, essa é a posição da PRIMEIRA ocorrência, e é um índice válido: o Arrays.binarySearch do Java devolveria um número não negativo aqui.`
        : `O intervalo esvaziou e a esquerda parou em ${left}. ${target} não está no array, e ${left} é exatamente onde ele entraria mantendo tudo ordenado. É por isso que o Arrays.binarySearch do Java devolve -(${left}) - 1 = ${-left - 1} quando FALHA: o sinal diz "não achei" e o número carrega o ponto de inserção de graça. Multiplicar por -1 não serviria, porque -0 é 0 e a posição 0 ficaria indistinguível de um acerto.`,
    });
    return out;
  }

  out.push({
    left, right, mid: null, marked, comparisons, line: 11, done: true, ok: marked >= 0,
    note:
      marked >= 0
        ? `Fim: a ${SIDE[mode]} de ${target} está na posição ${marked}, encontrada em ${comparisons} comparações. Uma varredura linear daria a mesma resposta em até ${nums.length} passos.`
        : `Fim: ${target} não existe no array, então a resposta é -1. Custou ${comparisons} comparações provar isso.`,
  });
  return out;
}

type Preset = { key: string; label: string; nums: number[]; target: number; hint: string };

const REPEATED = [1, 3, 3, 3, 5, 8, 8, 11, 14];

const PRESETS: Preset[] = [
  {
    key: "block",
    label: "Um bloco de três iguais: procurando 3",
    nums: REPEATED,
    target: 3,
    hint: "O 3 ocupa as posições 1, 2 e 3. A busca comum devolveria qualquer uma delas dependendo de onde o meio caiu. Alterne entre os três modos e veja as respostas 1 e 3 saindo do mesmo código.",
  },
  {
    key: "absent",
    label: "Um valor que não existe: 7",
    nums: REPEATED,
    target: 7,
    hint: "Sem ocorrência nenhuma, os modos de primeira e última devolvem -1. O modo de inserção continua útil: ele diz onde o 7 caberia.",
  },
  {
    key: "pair",
    label: "Duas ocorrências no fim: procurando 8",
    nums: REPEATED,
    target: 8,
    hint: "Posições 5 e 6. É o formato exato do problema Find First and Last Position of Element in Sorted Array: duas buscas binárias, uma para cada ponta.",
  },
  {
    key: "before",
    label: "Menor que tudo: procurando 0",
    nums: REPEATED,
    target: 0,
    hint: "A borda de baixo. A posição de inserção é 0, e nenhum passo do algoritmo precisa de tratamento especial para isso.",
  },
  {
    key: "after",
    label: "Maior que tudo: procurando 20",
    nums: REPEATED,
    target: 20,
    hint: "A borda de cima, e a mais fácil de errar: a esquerda para em 9, que é o tamanho do array e não é índice de ninguém. Inserir ali continua correto (é o fim da lista), mas todo código que for LER nessa posição precisa checar o limite antes.",
  },
];

export function BuscaBinariaFronteira() {
  const [presetKey, setPresetKey] = useState("block");
  const [mode, setMode] = useState<Mode>("first");

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const steps = useMemo(() => generateSteps(preset.nums, preset.target, mode), [preset, mode]);

  const viz = useVisualizer({
    title: "Visualizador · repetidos, bordas e a posição de inserção",
    total: steps.length,
    // O que muda a altura da peça, medido: o modo, porque o código vai de 9 a
    // 12 linhas e o painel ganha uma variável a mais (77px no artigo); e o
    // preset, porque cada dica tem um tamanho (até 37px). A fita de células
    // NÃO entra: o array é fixo em 9 posições e nunca quebra linha.
    measureOn: [mode, presetKey],
  });

  const s = steps[viz.step];

  const changePreset = (k: string) => {
    viz.reset();
    setPresetKey(k);
  };
  const changeMode = (m: Mode) => {
    viz.reset();
    setMode(m);
  };

  const nums = preset.nums;
  const answer = mode === "insert" ? (s.done ? s.left : null) : s.done ? s.marked : null;
  // O retorno negativo do Arrays.binarySearch é o do caso de FALHA. Quando o
  // valor existe, a posição onde a esquerda parou é uma ocorrência de verdade e
  // a função devolveria um índice não negativo.
  const existsAtStop = s.done && s.left < nums.length && nums[s.left] === preset.target;

  const cells = nums.map((v, i) => {
    let cls = "viz-cell";
    const inside = i >= s.left && i <= s.right;
    if (!inside) cls += " drop";
    if (i === s.mid) cls += " in";
    if (i === s.marked && mode !== "insert") cls += " marcado";
    if (s.done && answer === i) cls += " entra";
    let mark = "";
    if (inside && i === s.left) mark = "e";
    if (inside && i === s.right) mark = mark ? "e d" : "d";
    if (i === s.mid) mark = mark ? `${mark} m` : "m";
    return { i, v, cls, mark, equal: v === preset.target };
  });

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button key={pr.key} className={`bigo-chip${presetKey === pr.key ? " on" : ""}`} onClick={() => changePreset(pr.key)} aria-pressed={presetKey === pr.key}>
              {pr.label}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">{preset.hint}</p>

        <div className="viz-inputs">
          <div className="viz-field">
            <span>O que eu quero saber</span>
            <div className="sub-modo">
              <button className={`sub-modo-btn${mode === "first" ? " on" : ""}`} onClick={() => changeMode("first")} aria-pressed={mode === "first"}>
                primeira ocorrência
              </button>
              <button className={`sub-modo-btn${mode === "last" ? " on" : ""}`} onClick={() => changeMode("last")} aria-pressed={mode === "last"}>
                última ocorrência
              </button>
              <button className={`sub-modo-btn${mode === "insert" ? " on" : ""}`} onClick={() => changeMode("insert")} aria-pressed={mode === "insert"}>
                onde entraria
              </button>
            </div>
          </div>
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

        <p className={"viz-note" + (s.done ? (s.ok ? " ok" : " invalid") : "")}>{s.note}</p>

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
              <div className="viz-code-head">{FILE[mode]}</div>
              <div className="viz-code-body">
                {CODE[mode].map((txt, i) => (
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
            {mode !== "insert" && (
              <div className="viz-var">
                <span className="viz-var-name">achou (anotado)</span>
                <span className="viz-var-val best">{s.marked}</span>
              </div>
            )}
            <div className="viz-var">
              <span className="viz-var-name">alvo</span>
              <span className="viz-var-val">{preset.target}</span>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>ocorrências de {preset.target}</span>
            <strong>{nums.filter((v) => v === preset.target).length}</strong>
          </div>
          <div className="bigo-stat">
            <span>comparações</span>
            <strong>{s.comparisons}</strong>
          </div>
          <div className="bigo-stat">
            <span>{SIDE[mode]}</span>
            <strong>{answer === null ? "-" : answer}</strong>
          </div>
          <div className="bigo-stat">
            <span>retorno do Arrays.binarySearch</span>
            <strong>
              {s.done && mode === "insert" ? (existsAtStop ? `${s.left}` : `${-s.left - 1}`) : "-"}
            </strong>
          </div>
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Fique no preset do bloco de três e alterne entre os dois primeiros modos: o código é o mesmo, muda
          uma linha, e a resposta vai de 1 para 3. Rodando os dois você tem o intervalo inteiro de ocorrências
          em 2 × O(log n), sem varrer os vizinhos um a um, que é a solução ingênua que estraga a complexidade
          quando o bloco de repetidos é grande.
        </p>
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(frame);
}
