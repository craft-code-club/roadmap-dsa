"use client";

import { useMemo, useState } from "react";

import { useVisualizer, VizHeader } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// SubTypesVisualizer, subarray / substring / subsequence / subset.
//
// Foge de propósito do padrão "gerador de passos" dos outros visualizadores:
// aqui não há algoritmo rodando, o que se aprende é uma CLASSIFICAÇÃO. Você
// monta um pedaço clicando nos elementos (a ORDEM DO CLIQUE conta) e o painel
// responde às duas perguntas que separam os quatro termos: é contíguo? a ordem
// do original foi mantida?
//
// O botão Array/String existe para provar que substring é subarray em uma
// string: a lógica de classificação é literalmente a mesma, só muda o rótulo.
//
// A casca vem do `useVisualizer`, mas este é o canto de fora do padrão dela, e
// as três escolhas estão aqui para não serem desfeitas por engano:
//
//   · `total: 1` — não há linha do tempo. Some o contador de passo, o rodapé de
//     reprodução e os atalhos de seta/espaço, que aqui só atrapalhariam: o
//     campo de texto é a interação principal.
//   · `collapsible: false` — não existe bloco dispensável (nem código, nem
//     painel de variáveis). Inventar um só para ganhar o botão "Mostrar" seria
//     esconder conteúdo que o aluno veio ver.
//   · o rodapé é escrito à mão. `VizFooter` é o rodapé de REPRODUÇÃO e não
//     renderiza nada quando `total <= 1` — inclusive descartando `children`.
//     Como os presets são os controles deste visualizador, eles precisam do
//     `.viz-foot` (irmão do `.viz-body`) para ficarem parados no pé do painel
//     enquanto o miolo rola. Contrato em `content/visualizers/README.md`.
// ---------------------------------------------------------------------------

type Mode = "array" | "string";

const BASE_ARRAY = "3, 1, 2, 4";
const BASE_STRING = "code";
const MAX = 8;

function tokens(mode: Mode, text: string): string[] {
  if (mode === "string") return text.replace(/\s+/g, "").split("").slice(0, MAX);
  return text.split(",").map((t) => t.trim()).filter(Boolean).slice(0, MAX);
}

export function SubTypesVisualizer() {
  const [mode, setMode] = useState<Mode>("array");
  const [text, setText] = useState(BASE_ARRAY);
  const [picks, setPicks] = useState<number[]>([]);

  const viz = useVisualizer({
    title: "Visualizador · monte um pedaço e veja o que ele é",
    total: 1,
    collapsible: false,
  });

  const base = useMemo(() => tokens(mode, text), [mode, text]);
  const n = base.length;

  const pickMode = (m: Mode) => {
    setMode(m);
    setText(m === "array" ? BASE_ARRAY : BASE_STRING);
    setPicks([]);
  };
  const onType = (v: string) => { setText(v); setPicks([]); };
  const toggleIndex = (i: number) => setPicks((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  const empty = picks.length === 0;
  // Ordem mantida = cada clique caiu à direita do anterior no array original.
  const inOrder = picks.every((p, i) => i === 0 || p > picks[i - 1]);
  const contiguous = inOrder && picks.every((p, i) => i === 0 || p === picks[i - 1] + 1);
  const sorted = [...picks].sort((a, b) => a - b);
  const gaps = !empty && inOrder
    ? Array.from({ length: picks[picks.length - 1] - picks[0] + 1 }, (_, k) => picks[0] + k).filter(
        (i) => !picks.includes(i)
      )
    : [];

  const format = (idxs: number[]) =>
    mode === "string" ? `"${idxs.map((i) => base[i]).join("")}"` : `[${idxs.map((i) => base[i]).join(", ")}]`;
  // Subconjunto se escreve entre chaves, e essa notação é parte da explicação.
  const formatSet = (idxs: number[]) => `{${idxs.map((i) => base[i]).join(", ")}}`;

  const sliceName = mode === "string" ? "Substring" : "Subarray";
  const twin = mode === "string" ? "em array, isso se chama subarray" : "em string, isso se chama substring";
  const slice = mode === "string" ? "substring" : "subarray";

  const verdicts = [
    {
      name: sliceName,
      subtitle: twin,
      color: "c-arr",
      ok: contiguous,
      body: empty
        ? "Clique em pelo menos um elemento para classificar."
        : contiguous
          ? `Índices ${picks.join(", ")} colados e da esquerda para a direita: é uma fatia contígua do original.`
          : !inOrder
            ? `Você clicou fora da ordem. Uma fatia é sempre lida da esquerda para a direita, então ${format(picks)} não é ${slice}.`
            : `Pulou o índice ${gaps.join(", ")}. Fatia contígua não tem buraco: ou leva tudo do começo ao fim, ou não é ${slice}.`,
    },
    {
      name: "Subsequence",
      subtitle: "apaga elementos, nunca reordena",
      color: "c-seq",
      ok: inOrder,
      body: empty
        ? "A contiguidade some, mas a ordem continua valendo."
        : inOrder
          ? "A ordem relativa do original foi mantida, então dá para chegar nesse pedaço só apagando o resto."
          : `Ordem invertida. Com esses mesmos elementos, a única subsequência válida é ${format(sorted)}.`,
    },
    {
      name: "Subset",
      subtitle: "conjunto, a ordem não existe",
      color: "c-set",
      ok: !empty,
      body: empty
        ? "O conjunto vazio também é um subconjunto, e é por isso que a contagem fecha em 2ⁿ."
        : inOrder
          ? `Todos os elementos vieram do original. Como conjunto, ${formatSet(picks)} não tem primeiro nem último: clicar em outra sequência daria o mesmo subconjunto.`
          : `${formatSet(picks)} e ${formatSet(sorted)} são o mesmo subconjunto. Em conjunto a ordem não existe, então subset é o único dos três que sobrevive a um clique fora de ordem.`,
    },
  ];

  const subarrays = (n * (n + 1)) / 2;
  const power = 2 ** n;

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      {/* Sem linha do tempo, o `n` é o único número de estado que vale no
          cabeçalho — ele entra pelo slot de `children`, à esquerda do Expandir. */}
      <VizHeader viz={viz}>
        <span className="viz-step">n = {n}</span>
      </VizHeader>

      <div {...viz.bodyProps}>
        <div className="viz-inputs">
          <div className="viz-field">
            <span>Origem</span>
            <div className="sub-modo">
              <button className={`sub-modo-btn${mode === "array" ? " on" : ""}`} onClick={() => pickMode("array")}>
                Array
              </button>
              <button className={`sub-modo-btn${mode === "string" ? " on" : ""}`} onClick={() => pickMode("string")}>
                String
              </button>
            </div>
          </div>
          <label className="viz-field grow">
            <span>{mode === "array" ? "Array (separe por vírgula)" : "String"}</span>
            <input className="viz-input" value={text} onChange={(e) => onType(e.target.value)} />
          </label>
        </div>

        <div className="viz-cells">
          {base.map((v, i) => {
            const pos = picks.indexOf(i);
            return (
              <div className="viz-cell-wrap" key={i}>
                <span className="viz-cell-idx">{i}</span>
                <button
                  type="button"
                  className={`viz-cell sub-cell${pos >= 0 ? " in" : ""}`}
                  aria-pressed={pos >= 0}
                  aria-label={`Índice ${i}, valor ${v}`}
                  onClick={() => toggleIndex(i)}
                >
                  {v}
                </button>
                <span className={`viz-mark${pos >= 0 ? " show" : ""}`}>{pos >= 0 ? `${pos + 1}º` : "·"}</span>
              </div>
            );
          })}
        </div>

        <div className="sub-montado">
          <span className="sub-montado-label">Seu pedaço</span>
          {empty ? (
            <span className="sub-vazio">clique nos elementos acima, na ordem que quiser</span>
          ) : (
            <code className="sub-montado-val">{format(picks)}</code>
          )}
        </div>

        <div className="sub-vereditos">
          {verdicts.map((l) => (
            <div key={l.name} className={`sub-veredito ${l.color}${empty ? " off" : l.ok ? " ok" : " no"}`}>
              <div className="sub-veredito-cab">
                <span className="sub-veredito-nome">{l.name}</span>
                <span className="sub-veredito-selo">{empty ? "·" : l.ok ? "✓ é" : "✕ não é"}</span>
              </div>
              <span className="sub-veredito-sub">{l.subtitle}</span>
              <p className="sub-veredito-txt">{l.body}</p>
            </div>
          ))}
        </div>

        <div className="sub-contagem">
          <div className="sub-conta">
            <span className="sub-conta-val">{subarrays}</span>
            <span className="sub-conta-lbl">{mode === "string" ? "substrings" : "subarrays"} não-vazios · n(n+1)/2</span>
          </div>
          <div className="sub-conta">
            <span className="sub-conta-val">{power - 1}</span>
            <span className="sub-conta-lbl">subsequências não-vazias · 2ⁿ − 1</span>
          </div>
          <div className="sub-conta">
            <span className="sub-conta-val">{power}</span>
            <span className="sub-conta-lbl">subconjuntos, contando o vazio · 2ⁿ</span>
          </div>
        </div>
        <p className="sub-nota-contagem">Contagens para n elementos distintos. Com repetidos, o número de pedaços diferentes cai.</p>
      </div>

      {/* Fora do corpo de propósito: no expandido é ele que fica parado no pé da
          janela enquanto o miolo rola. Sem isso os presets sobem junto com o
          conteúdo e o aluno perde de vista os botões que movem o visualizador. */}
      <div className="viz-foot">
        <div className="viz-controls">
          <span className="sub-exemplos-label">Tente:</span>
          <button className="viz-btn" disabled={n < 3} onClick={() => setPicks([1, 2])}>colado</button>
          <button className="viz-btn" disabled={n < 3} onClick={() => setPicks([0, 2])}>com buraco</button>
          <button className="viz-btn" disabled={n < 3} onClick={() => setPicks([2, 0])}>fora de ordem</button>
          <button className="viz-btn" disabled={empty} onClick={() => setPicks([])} style={{ marginLeft: "auto" }}>↺ Limpar</button>
        </div>
      </div>
    </figure>
  );

  return viz.inPanel(frame);
}
