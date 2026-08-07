"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// TwoPointersPalindromo, ponteiros convergentes que NÃO andam no mesmo ritmo.
//
// Mesmo esqueleto do TwoPointersVisualizer (gerador puro de passos + a casca
// compartilhada do `useVisualizer`), mas o que se aprende aqui é outro: quando
// o problema manda ignorar pontuação e espaço, cada ponteiro anda no seu ritmo,
// e a string original nunca é copiada nem limpa — porque replace() cria uma
// string nova a cada caractere descartado.
//
// O contador de "strings novas" fica sempre em 0 de propósito, e ao lado dele
// aparece quantas a versão que limpa a string antes teria alocado. É o
// argumento visual do O(1) contra o O(n) de espaço, com número concreto.
// ---------------------------------------------------------------------------

type Step = {
  l: number;
  r: number;
  line: number;
  comparisons: number;
  skips: number;
  moveL?: boolean;
  moveR?: boolean;
  comparing?: boolean;
  failed?: boolean;
  ok?: boolean;
  done?: boolean;
  note: string;
};

// As linhas mapeiam 1:1 com o campo `line` de cada passo.
const CODE = [
  "def e_palindromo(s):",
  "    esq, dir = 0, len(s) - 1",
  "    while esq < dir:",
  "        if not s[esq].isalnum():",
  "            esq += 1",
  "        elif not s[dir].isalnum():",
  "            dir -= 1",
  "        elif s[esq].lower() != s[dir].lower():",
  "            return False",
  "        else:",
  "            esq += 1",
  "            dir -= 1",
  "    return True",
];

function alnum(c: string): boolean {
  return /[a-zA-Z0-9]/.test(c);
}

// Espaço vira um glifo visível, senão a célula fica vazia e parece bug.
function show(c: string): string {
  return c === " " ? "␣" : c;
}

function generateSteps(s: string): Step[] {
  const out: Step[] = [];
  let l = 0;
  let r = s.length - 1;
  let comparisons = 0;
  let skips = 0;
  const base = () => ({ l, r, comparisons, skips });
  // Caso de borda que o LeetCode cobra: string vazia é palíndromo por vacuidade,
  // e o while nem chega a rodar.
  if (s.length === 0) {
    return [{ ...base(), line: 12, ok: true, done: true, note: "string vazia: o while nem começa, porque esq (0) já não é menor que dir (-1). Sem nenhuma comparação, a resposta é sim, é palíndromo." }];
  }
  out.push({ ...base(), line: 1, note: `esq no caractere 0 e dir no caractere ${s.length - 1}. Vou fechando os dois até eles se encontrarem.` });
  let guard = 0;
  while (l < r && guard++ < 300) {
    if (!alnum(s[l])) {
      skips++;
      out.push({ ...base(), line: 4, moveL: true, note: `s[${l}] = "${show(s[l])}" não é letra nem dígito: avanço só a esquerda, a direita fica parada.` });
      l++;
      continue;
    }
    if (!alnum(s[r])) {
      skips++;
      out.push({ ...base(), line: 6, moveR: true, note: `s[${r}] = "${show(s[r])}" não é letra nem dígito: recuo só a direita, a esquerda fica parada.` });
      r--;
      continue;
    }
    const a = s[l].toLowerCase();
    const b = s[r].toLowerCase();
    comparisons++;
    if (a !== b) {
      out.push({ ...base(), line: 8, comparing: true, failed: true, done: true, note: `s[${l}] = "${s[l]}" e s[${r}] = "${s[r]}": diferentes mesmo ignorando maiúscula. Não é palíndromo, e eu já posso parar aqui.` });
      return out;
    }
    out.push({ ...base(), line: 7, comparing: true, note: `s[${l}] = "${s[l]}" e s[${r}] = "${s[r]}": iguais quando ignoro maiúscula. Comparação ${comparisons}.` });
    out.push({ ...base(), line: 10, moveL: true, moveR: true, note: `bateu: fecho os dois de uma vez, esquerda vai para ${l + 1} e direita para ${r - 1}.` });
    l++;
    r--;
  }
  // Com tamanho ímpar os ponteiros param no mesmo caractere; com tamanho par
  // eles se cruzam. A condição `esq < dir` cobre os dois sem `if` extra.
  const closing =
    l === r
      ? `esq e dir pararam os dois no índice ${l}: é o caractere do meio, e ele é palíndromo de si mesmo, não precisa de comparação nenhuma.`
      : `esq (${l}) passou dir (${r}): sobrou parte nenhuma no meio, todos os pares já foram conferidos.`;
  out.push({ ...base(), line: 12, ok: true, done: true, note: `${closing} É palíndromo, com ${comparisons} ${comparisons === 1 ? "comparação" : "comparações"} e ${skips} ${skips === 1 ? "salto" : "saltos"}.` });
  return out;
}

const DEFAULT_S = "A man, a plan, a canal: Panama";

type Preset = { key: string; label: string; s: string };
const PRESETS: Preset[] = [
  { key: "arara", label: "arara", s: "arara" },
  { key: "banana", label: "banana (falha no passo 1)", s: "banana" },
  { key: "raceacar", label: "race a car (falha no fim)", s: "race a car" },
  { key: "panama", label: "A man, a plan, a canal: Panama", s: DEFAULT_S },
  { key: "zeroP", label: "0P (a pegadinha do %32)", s: "0P" },
  { key: "vazio", label: "vazio (caso de borda)", s: "" },
];

export function TwoPointersPalindromo() {
  const [text, setText] = useState(DEFAULT_S);
  const [preset, setPreset] = useState("panama");

  const s = text;
  const steps = useMemo(() => generateSteps(s), [s]);

  const viz = useVisualizer({
    title: "Visualizador · palíndromo com ponteiros em ritmos diferentes",
    total: steps.length,
    initialSpeed: 4,
    // O que muda a altura da peça: a fita de caracteres some quando a string é
    // vazia e dá lugar ao aviso, que tem outra altura. O comprimento não muda a
    // altura (a fita é `nowrap` e rola na horizontal), mas o zero muda.
    measureOn: [s.length],
  });

  const p = steps[viz.step];

  const onTextChange = (v: string) => {
    viz.reset(); setPreset("");
    setText(v.slice(0, 40));
  };
  const applyPreset = (pr: Preset) => {
    viz.reset(); setPreset(pr.key);
    setText(pr.s);
  };

  const cells = s.split("").map((c, i) => {
    let cls = "viz-cell";
    if (!alnum(c)) cls += " pula";
    if (i === p.l || i === p.r) cls += " in";
    if (i < p.l || i > p.r) cls += " drop";
    if (p.failed && (i === p.l || i === p.r)) cls += " sai";
    else if ((p.comparing || p.moveL || p.moveR) && (i === p.l || i === p.r)) cls += " entra";
    let mark = "";
    if (i === p.l) mark = "E";
    if (i === p.r) mark = mark ? "E D" : "D";
    return { i, c: show(c), cls, mark };
  });

  const vars = [
    { name: "esq", value: `${p.l}` },
    { name: "dir", value: `${p.r}` },
    { name: "s[esq]", value: p.l < s.length ? `"${show(s[p.l])}"` : "-" },
    { name: "s[dir]", value: p.r >= 0 ? `"${show(s[p.r])}"` : "-", best: true },
  ];

  // A solução que limpa a string antes aloca uma string nova por caractere
  // aproveitado (string é imutável, cada `limpa += c` cria outra) mais uma para
  // o `limpa[::-1]`. É o O(n) de espaço que os dois ponteiros não pagam.
  const useful = s.split("").filter(alnum).length;
  const naiveCopies = useful + 1;

  const stats = [
    { k: "n", label: "caracteres (n)", value: `${s.length}` },
    { k: "comp", label: "comparações", value: `${p.comparisons}` },
    { k: "salto", label: "saltos de pontuação", value: `${p.skips}` },
    { k: "mem", label: "strings novas aqui", value: "0" },
    { k: "mem2", label: "strings novas limpando antes", value: `${naiveCopies}` },
  ];

  const noteClass = "viz-note" + (p.ok ? " ok" : p.failed ? " invalid" : "");

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz} />

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              key={pr.key}
              className={`bigo-chip${preset === pr.key ? " on" : ""}`}
              onClick={() => applyPreset(pr)}
              aria-pressed={preset === pr.key}
            >
              {pr.label}
            </button>
          ))}
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Texto (até 40 caracteres)</span>
            <input className="viz-input" value={text} onChange={(e) => onTextChange(e.target.value)} />
          </label>
        </div>

        {cells.length ? (
          <div className="viz-cells tp-chars">
            {cells.map((c) => (
              <div className="viz-cell-wrap" key={c.i}>
                <span className="viz-cell-idx">{c.i}</span>
                <div className={c.cls}>{c.c}</div>
                <span className={`viz-mark${c.mark ? " show" : ""}`}>{c.mark || "·"}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="tp-vazio">string vazia, não há nenhum caractere para percorrer</p>
        )}

        <p className="tp-legenda">
          <span><i style={{ border: "1.5px dashed rgba(255,255,255,0.3)" }} /> caractere que não é letra nem dígito, o ponteiro pula por cima</span>
          <span><i style={{ background: "var(--ccc-accent)" }} /> posição atual de esq e dir</span>
        </p>

        <p className={noteClass}>{p.note}</p>

        <div className="viz-split">
          {/* O `.viz-code-slot` recolhe a ALTURA (grid 1fr→0fr): zerar a trilha
              da coluna só tira a largura, e a linha do grid continuaria com a
              altura do código. */}
          <div className="viz-code-slot">
            <div className="viz-code" {...viz.blockProps}>
              <div className="viz-code-head">palindromo.py</div>
              <div className="viz-code-body">
                {CODE.map((txt, i) => (
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

        <div className="bigo-stats">
          {stats.map((st) => (
            <div className="bigo-stat" key={st.k}>
              <span>{st.label}</span>
              <strong>{st.value}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé
          da janela enquanto o miolo rola. */}
      <VizFooter viz={viz} />
    </figure>
  );

  return viz.inPanel(frame);
}
