"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// SubTypesVisualizer, subarray / substring / subsequence / subset.
//
// Foge de propósito do padrão "gerador de passos" dos outros visualizadores:
// aqui não há algoritmo rodando, o que se aprende é uma CLASSIFICAÇÃO. Você
// monta um pedaço clicando nos elementos (a ORDEM DO CLIQUE conta) e o painel
// responde as duas perguntas que separam os quatro termos: é contíguo? a ordem
// do original foi mantida?
//
// O botão Array/String existe para provar que substring é subarray em uma
// string: a lógica de classificação é literalmente a mesma, só muda o rótulo.
// ---------------------------------------------------------------------------

type Modo = "array" | "string";

const BASE_ARRAY = "3, 1, 2, 4";
const BASE_STRING = "code";
const MAX = 8;

function tokens(modo: Modo, texto: string): string[] {
  if (modo === "string") return texto.replace(/\s+/g, "").split("").slice(0, MAX);
  return texto.split(",").map((t) => t.trim()).filter(Boolean).slice(0, MAX);
}

export function SubTypesVisualizer() {
  const [modo, setModo] = useState<Modo>("array");
  const [texto, setTexto] = useState(BASE_ARRAY);
  const [picks, setPicks] = useState<number[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const base = useMemo(() => tokens(modo, texto), [modo, texto]);
  const n = base.length;

  const trocarModo = (m: Modo) => {
    setModo(m);
    setTexto(m === "array" ? BASE_ARRAY : BASE_STRING);
    setPicks([]);
  };
  const aoDigitar = (v: string) => { setTexto(v); setPicks([]); };
  const clicar = (i: number) => setPicks((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  const vazio = picks.length === 0;
  // Ordem mantida = cada clique caiu à direita do anterior no array original.
  const emOrdem = picks.every((p, i) => i === 0 || p > picks[i - 1]);
  const contiguo = emOrdem && picks.every((p, i) => i === 0 || p === picks[i - 1] + 1);
  const ordenados = [...picks].sort((a, b) => a - b);
  const buracos = !vazio && emOrdem
    ? Array.from({ length: picks[picks.length - 1] - picks[0] + 1 }, (_, k) => picks[0] + k).filter(
        (i) => !picks.includes(i)
      )
    : [];

  const mostrar = (idxs: number[]) =>
    modo === "string" ? `"${idxs.map((i) => base[i]).join("")}"` : `[${idxs.map((i) => base[i]).join(", ")}]`;
  // Subconjunto se escreve entre chaves, e essa notação é parte da explicação.
  const mostrarConjunto = (idxs: number[]) => `{${idxs.map((i) => base[i]).join(", ")}}`;

  const nomeFatia = modo === "string" ? "Substring" : "Subarray";
  const gemeo = modo === "string" ? "em array, isso se chama subarray" : "em string, isso se chama substring";
  const fatia = modo === "string" ? "substring" : "subarray";

  const linhas = [
    {
      nome: nomeFatia,
      sub: gemeo,
      cor: "c-arr",
      ok: contiguo,
      txt: vazio
        ? "Clique em pelo menos um elemento para classificar."
        : contiguo
          ? `Índices ${picks.join(", ")} colados e da esquerda para a direita: é uma fatia contígua do original.`
          : !emOrdem
            ? `Você clicou fora da ordem. Uma fatia é sempre lida da esquerda para a direita, então ${mostrar(picks)} não é ${fatia}.`
            : `Pulou o índice ${buracos.join(", ")}. Fatia contígua não tem buraco: ou leva tudo do começo ao fim, ou não é ${fatia}.`,
    },
    {
      nome: "Subsequence",
      sub: "apaga elementos, nunca reordena",
      cor: "c-seq",
      ok: emOrdem,
      txt: vazio
        ? "A contiguidade some, mas a ordem continua valendo."
        : emOrdem
          ? "A ordem relativa do original foi mantida, então dá para chegar nesse pedaço só apagando o resto."
          : `Ordem invertida. Com esses mesmos elementos, a única subsequência válida é ${mostrar(ordenados)}.`,
    },
    {
      nome: "Subset",
      sub: "conjunto, a ordem não existe",
      cor: "c-set",
      ok: !vazio,
      txt: vazio
        ? "O conjunto vazio também é um subconjunto, e é por isso que a contagem fecha em 2ⁿ."
        : emOrdem
          ? `Todos os elementos vieram do original. Como conjunto, ${mostrarConjunto(picks)} não tem primeiro nem último: clicar em outra sequência daria o mesmo subconjunto.`
          : `${mostrarConjunto(picks)} e ${mostrarConjunto(ordenados)} são o mesmo subconjunto. Em conjunto a ordem não existe, então subset é o único dos três que sobrevive a um clique fora de ordem.`,
    },
  ];

  const subarrays = (n * (n + 1)) / 2;
  const potencia = 2 ** n;

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · monte um pedaço e veja o que ele é</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">n = {n}</span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "✕ Fechar" : "⤢ Expandir"}
          </button>
        </div>
      </div>

      <div className="viz-body">
        <div className="viz-inputs">
          <div className="viz-field">
            <span>Origem</span>
            <div className="sub-modo">
              <button className={`sub-modo-btn${modo === "array" ? " on" : ""}`} onClick={() => trocarModo("array")}>
                Array
              </button>
              <button className={`sub-modo-btn${modo === "string" ? " on" : ""}`} onClick={() => trocarModo("string")}>
                String
              </button>
            </div>
          </div>
          <label className="viz-field grow">
            <span>{modo === "array" ? "Array (separe por vírgula)" : "String"}</span>
            <input className="viz-input" value={texto} onChange={(e) => aoDigitar(e.target.value)} />
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
                  onClick={() => clicar(i)}
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
          {vazio ? (
            <span className="sub-vazio">clique nos elementos acima, na ordem que quiser</span>
          ) : (
            <code className="sub-montado-val">{mostrar(picks)}</code>
          )}
        </div>

        <div className="sub-vereditos">
          {linhas.map((l) => (
            <div key={l.nome} className={`sub-veredito ${l.cor}${vazio ? " off" : l.ok ? " ok" : " no"}`}>
              <div className="sub-veredito-cab">
                <span className="sub-veredito-nome">{l.nome}</span>
                <span className="sub-veredito-selo">{vazio ? "—" : l.ok ? "✓ é" : "✕ não é"}</span>
              </div>
              <span className="sub-veredito-sub">{l.sub}</span>
              <p className="sub-veredito-txt">{l.txt}</p>
            </div>
          ))}
        </div>

        <div className="sub-contagem">
          <div className="sub-conta">
            <span className="sub-conta-val">{subarrays}</span>
            <span className="sub-conta-lbl">{modo === "string" ? "substrings" : "subarrays"} não-vazios · n(n+1)/2</span>
          </div>
          <div className="sub-conta">
            <span className="sub-conta-val">{potencia - 1}</span>
            <span className="sub-conta-lbl">subsequências não-vazias · 2ⁿ − 1</span>
          </div>
          <div className="sub-conta">
            <span className="sub-conta-val">{potencia}</span>
            <span className="sub-conta-lbl">subconjuntos, contando o vazio · 2ⁿ</span>
          </div>
        </div>
        <p className="sub-nota-contagem">Contagens para n elementos distintos. Com repetidos, o número de pedaços diferentes cai.</p>

        <div className="viz-controls">
          <span className="sub-exemplos-label">Tente:</span>
          <button className="viz-btn" disabled={n < 3} onClick={() => setPicks([1, 2])}>colado</button>
          <button className="viz-btn" disabled={n < 3} onClick={() => setPicks([0, 2])}>com buraco</button>
          <button className="viz-btn" disabled={n < 3} onClick={() => setPicks([2, 0])}>fora de ordem</button>
          <button className="viz-btn" disabled={vazio} onClick={() => setPicks([])} style={{ marginLeft: "auto" }}>↺ Limpar</button>
        </div>
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
