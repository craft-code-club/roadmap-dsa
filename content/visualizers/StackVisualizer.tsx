"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// StackVisualizer, a pilha em ação resolvendo parênteses balanceados.
//
// Mesmo padrão do TwoPointersVisualizer: um gerador PURO de passos + a mesma
// casca (fita de caracteres, código sincronizado, variáveis, controles,
// Expandir). O que muda é o desenho central: aqui a estrela é a TORRE, a pilha
// crescendo e encolhendo com o topo sempre na primeira linha, que é como todo
// mundo desenha pilha no quadro.
//
// A única coisa que o aluno precisa ver acontecendo: cada abertura empurra um
// item para o topo, cada fechamento só pode consumir QUEM ESTÁ NO TOPO, e o
// veredito da expressão sai de duas perguntas (o topo casa? a pilha esvaziou?).
//
// A expressão é filtrada para os seis caracteres do LeetCode 20, porque o
// algoritmo assume que tudo que não é fechamento é abertura.
// ---------------------------------------------------------------------------

type Item = { c: string; i: number };

type Passo = {
  i: number; // caractere atual, -1 no passo de preparação
  pilha: Item[];
  linha: number;
  parA?: number; // abertura que acabou de casar
  parB?: number; // fechamento que acabou de casar
  erroEm?: number;
  empilhados: number;
  desempilhados: number;
  alturaMax: number;
  ok?: boolean;
  fim?: boolean;
  nota: string;
};

// As linhas mapeiam 1:1 com o campo `linha` de cada passo, então a ordem e a
// quantidade de linhas não podem mudar sem ajustar o gerador junto.
const CODIGO = [
  "def valida(s):",
  "    pilha = []",
  '    pares = {")": "(", "]": "[", "}": "{"}',
  "    for c in s:",
  "        if c in pares:",
  "            if not pilha or pilha[-1] != pares[c]:",
  "                return False",
  "            pilha.pop()",
  "        else:",
  "            pilha.append(c)",
  "    return not pilha",
];

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

const FECHA: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
const VALIDOS = "()[]{}";
const MAX_CHARS = 24;

function limpar(v: string): string {
  return Array.from(v)
    .filter((c) => VALIDOS.includes(c))
    .slice(0, MAX_CHARS)
    .join("");
}

function gerarPassos(expr: string): Passo[] {
  const out: Passo[] = [];
  const pilha: Item[] = [];
  let emp = 0;
  let des = 0;
  let alturaMax = 0;

  const registrar = (p: Omit<Passo, "empilhados" | "desempilhados" | "alturaMax">) => {
    out.push({ ...p, empilhados: emp, desempilhados: des, alturaMax });
  };

  registrar({
    i: -1,
    pilha: [],
    linha: 1,
    nota: expr.length
      ? `Começo com a pilha vazia e ${expr.length} ${expr.length === 1 ? "caractere" : "caracteres"} para ler, da esquerda para a direita.`
      : "Expressão vazia: o laço não roda nenhuma vez e a pilha continua vazia.",
  });

  let guarda = 0;
  for (let i = 0; i < expr.length && guarda++ < 100; i++) {
    const c = expr[i];
    const abertura = FECHA[c];

    if (!abertura) {
      pilha.push({ c, i });
      emp++;
      alturaMax = Math.max(alturaMax, pilha.length);
      registrar({
        i,
        pilha: [...pilha],
        linha: 9,
        nota: `'${c}' é abertura: empilho e sigo em frente. A pilha fica com ${pilha.length} ${pilha.length === 1 ? "item" : "itens"} e o topo agora é '${c}'.`,
      });
      continue;
    }

    if (!pilha.length) {
      registrar({
        i,
        pilha: [],
        linha: 6,
        erroEm: i,
        fim: true,
        nota: `'${c}' é fechamento, mas a pilha está vazia: esse '${c}' fecha o quê? Todo fechamento precisa de uma abertura antes dele. Inválida.`,
      });
      return out;
    }

    const topo = pilha[pilha.length - 1];
    if (topo.c !== abertura) {
      registrar({
        i,
        pilha: [...pilha],
        linha: 6,
        erroEm: i,
        fim: true,
        nota: `'${c}' pede '${abertura}' no topo, mas o topo é '${topo.c}' (posição ${topo.i}). Tipo trocado: paro aqui e devolvo inválida.`,
      });
      return out;
    }

    pilha.pop();
    des++;
    registrar({
      i,
      pilha: [...pilha],
      linha: 7,
      parA: topo.i,
      parB: i,
      nota: `'${c}' pede '${abertura}', e o topo é exatamente o '${topo.c}' da posição ${topo.i}: par fechado, desempilho. Sobra${pilha.length === 1 ? "" : "m"} ${pilha.length} na pilha.`,
    });
  }

  if (pilha.length) {
    const sobrando = pilha.map((it) => `'${it.c}' na posição ${it.i}`).join(", ");
    registrar({
      i: expr.length,
      pilha: [...pilha],
      linha: 10,
      fim: true,
      nota: `Acabaram os caracteres, mas a pilha não esvaziou: ${sobrando} ${pilha.length === 1 ? "ficou" : "ficaram"} sem fechamento. Inválida.`,
    });
    return out;
  }

  registrar({
    i: expr.length,
    pilha: [],
    linha: 10,
    ok: true,
    fim: true,
    nota: expr.length
      ? `Fim da expressão com a pilha vazia: todo fechamento achou a abertura dele, na ordem certa. Válida, com ${emp} push e ${des} pop.`
      : "Pilha vazia no fim, porque nunca teve nada nela. Uma expressão vazia é válida por definição.",
  });
  return out;
}

const PADRAO = "{[()]}";

// Casos escolhidos a dedo: o aninhado, o lado a lado, o cruzado (que é o que
// separa pilha de contador), a sobra de abertura e o fechamento órfão.
type Preset = { key: string; rotulo: string; expr: string };
const PRESETS: Preset[] = [
  { key: "aninhado", rotulo: "Aninhado: {[()]}", expr: "{[()]}" },
  { key: "lado", rotulo: "Lado a lado: ()[]{}", expr: "()[]{}" },
  { key: "cruzado", rotulo: "Cruzado: ([)]", expr: "([)]" },
  { key: "sobra", rotulo: "Sobra aberto: ([]", expr: "([]" },
  { key: "orfao", rotulo: "Fecha sem abrir: )(", expr: ")(" },
];

const SORTEIO_ABRE = ["(", "[", "{"];

export function StackVisualizer() {
  const [expr, setExpr] = useState(PADRAO);
  const [preset, setPreset] = useState("aninhado");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const passos = useMemo(() => gerarPassos(expr), [expr]);
  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];

  const parar = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  }, []);
  useEffect(() => () => parar(), [parar]);

  useEffect(() => {
    parar();
    if (!tocando) return;
    timer.current = setInterval(() => setPasso((s) => (s >= total - 1 ? s : s + 1)), VELOCIDADES[velocidade]);
    return parar;
  }, [tocando, velocidade, total, parar]);

  useEffect(() => {
    if (tocando && idx >= total - 1) setTocando(false);
  }, [tocando, idx, total]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const reiniciar = () => { parar(); setTocando(false); setPasso(0); };

  const aoMudarExpr = (v: string) => {
    parar(); setTocando(false); setPasso(0); setPreset("");
    setExpr(limpar(v));
  };
  const aplicarPreset = (pr: Preset) => {
    parar(); setTocando(false); setPasso(0); setPreset(pr.key);
    setExpr(pr.expr);
  };
  const sortear = () => {
    const abertas: string[] = [];
    let out = "";
    const alvo = 6 + Math.floor(Math.random() * 5);
    while (out.length < alvo) {
      const podeFechar = abertas.length > 0;
      if (podeFechar && (Math.random() < 0.5 || out.length + abertas.length >= alvo)) {
        const a = abertas.pop() as string;
        out += a === "(" ? ")" : a === "[" ? "]" : "}";
      } else {
        const a = SORTEIO_ABRE[Math.floor(Math.random() * 3)];
        abertas.push(a);
        out += a;
      }
    }
    while (abertas.length) {
      const a = abertas.pop() as string;
      out += a === "(" ? ")" : a === "[" ? "]" : "}";
    }
    parar(); setTocando(false); setPasso(0); setPreset("");
    setExpr(limpar(out));
  };

  const naPilha = new Set(p.pilha.map((it) => it.i));
  const topoIdx = p.pilha.length ? p.pilha[p.pilha.length - 1].i : -1;

  const cells = Array.from(expr).map((c, i) => {
    let cls = "viz-cell";
    if (i === p.i) cls += " in";
    else if (i < p.i && !naPilha.has(i)) cls += " drop";
    if (p.parA === i || p.parB === i) cls += " entra";
    if (p.erroEm === i) cls += " sai";
    let marca = "";
    if (i === topoIdx) marca = "topo";
    else if (naPilha.has(i)) marca = "•";
    return { i, c, cls, marca };
  });

  // A torre desenha o topo em cima, então a pilha é percorrida ao contrário.
  const torre = [...p.pilha].reverse();

  const variaveis = [
    { nome: "c", valor: p.i >= 0 && p.i < expr.length ? `'${expr[p.i]}'` : "-" },
    { nome: "pilha[-1]", valor: p.pilha.length ? `'${p.pilha[p.pilha.length - 1].c}'` : "vazia" },
    { nome: "len(pilha)", valor: `${p.pilha.length}` },
    { nome: "veredito", valor: p.ok ? "válida" : p.fim ? "inválida" : "…", best: !!p.ok },
  ];

  const estatisticas = [
    { k: "n", rot: "caracteres (n)", val: `${expr.length}` },
    { k: "push", rot: "empilhados (push)", val: `${p.empilhados}` },
    { k: "pop", rot: "desempilhados (pop)", val: `${p.desempilhados}` },
    { k: "alt", rot: "altura máxima", val: `${p.alturaMax}` },
  ];

  const notaCls = "viz-note" + (p.ok ? " ok" : p.fim ? " invalid" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · a pilha em ação: parênteses balanceados</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">passo {idx + 1} de {total}</span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "✕ Fechar" : "⤢ Expandir"}
          </button>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              key={pr.key}
              className={`bigo-chip${preset === pr.key ? " on" : ""}`}
              onClick={() => aplicarPreset(pr)}
              aria-pressed={preset === pr.key}
            >
              {pr.rotulo}
            </button>
          ))}
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Expressão (só ( ) [ ] {"{"} {"}"} )</span>
            <input className="viz-input" value={expr} onChange={(e) => aoMudarExpr(e.target.value)} />
          </label>
          <button className="viz-btn" onClick={sortear}>Sortear válida</button>
        </div>

        <div className="pl-arena">
          <div className="pl-col">
            <span className="pl-lbl">Expressão</span>
            {expr.length ? (
              <div className="viz-cells">
                {cells.map((c) => (
                  <div className="viz-cell-wrap" key={c.i}>
                    <span className="viz-cell-idx">{c.i}</span>
                    <div className={c.cls}>{c.c}</div>
                    <span className={`viz-mark${c.marca ? " show" : ""}`}>{c.marca || "·"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pl-vazia">expressão vazia</p>
            )}
            <p className={notaCls}>{p.nota}</p>
          </div>

          <div className="pl-col">
            <span className="pl-lbl">Pilha (topo em cima)</span>
            <div className="pl-torre">
              {torre.length ? (
                torre.map((it, k) => (
                  <div
                    key={`${it.i}-${it.c}`}
                    className={`pl-item${k === 0 ? " topo" : ""}${k === 0 && p.linha === 9 ? " entra" : ""}`}
                  >
                    <span>{it.c}</span>
                    <span className="pl-meta">{k === 0 ? "topo · " : ""}pos {it.i}</span>
                  </div>
                ))
              ) : (
                <p className="pl-vazia">pilha vazia</p>
              )}
              <div className="pl-base">base da pilha</div>
            </div>
          </div>
        </div>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">solucao.py</div>
            <div className="viz-code-body">
              {CODIGO.map((txt, i) => (
                <div key={i} className={`viz-line${i === p.linha ? " on" : ""}`}>
                  <span className="ln">{i + 1}</span>
                  {txt}
                </div>
              ))}
            </div>
          </div>
          <div className="viz-vars">
            <div className="viz-vars-head">Variáveis</div>
            {variaveis.map((v) => (
              <div className="viz-var" key={v.nome}>
                <span className="viz-var-name">{v.nome}</span>
                <span className={`viz-var-val${v.best ? " best" : ""}`}>{v.valor}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bigo-stats">
          {estatisticas.map((s) => (
            <div className="bigo-stat" key={s.k}>
              <span>{s.rot}</span>
              <strong>{s.val}</strong>
            </div>
          ))}
        </div>

        <div className="viz-controls">
          <button className="viz-btn" title="Reiniciar" onClick={reiniciar}>↺</button>
          <button className="viz-btn" disabled={idx === 0} onClick={() => { parar(); setTocando(false); setPasso(Math.max(0, idx - 1)); }}>‹ Anterior</button>
          <button className="viz-play" onClick={() => { if (tocando) { setTocando(false); return; } setPasso(idx >= total - 1 ? 0 : idx); setTocando(true); }}>
            {tocando ? "❚❚ Pausar" : "▶ Rodar"}
          </button>
          <button className="viz-btn" disabled={idx === total - 1} onClick={() => { parar(); setTocando(false); setPasso(Math.min(idx + 1, total - 1)); }}>Próximo ›</button>
          <div className="viz-speed">
            <span>Velocidade</span>
            <input type="range" min={1} max={5} step={1} value={velocidade} onChange={(e) => setVelocidade(parseInt(e.target.value, 10))} />
            <span className="val">{ROTULOS_VEL[velocidade]}</span>
          </div>
        </div>
        <div className="viz-progress"><div className="viz-progress-fill" style={{ width: `${pctPasso}%` }} /></div>
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
