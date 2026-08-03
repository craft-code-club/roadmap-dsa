"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// StringsVisualizer, o custo de montar uma string caractere a caractere.
//
// Mesmo padrão do TwoPointersVisualizer: gerador PURO de passos + a casca
// compartilhada (células, código sincronizado, variáveis, controles, Expandir).
//
// O que este visualizador ensina: com string imutável, `s = s + c` dentro de um
// laço aloca uma string NOVA a cada volta e recopia tudo que já estava lá. O
// contador de caracteres copiados fecha em n(n+1)/2, enquanto a lista + join
// fecha em n. Os dois totais ficam sempre na tela, lado a lado, para a
// diferença entre O(n²) e O(n) aparecer em número e não só em teoria.
// ---------------------------------------------------------------------------

type Modo = "concat" | "join";

type Bloco = { id: number; txt: string; viva: boolean; nova: boolean };

type Passo = {
  linha: number;
  i: number; // índice do caractere corrente (-1 antes de começar)
  usados: number; // quantos caracteres já entraram no resultado
  blocos: Bloco[]; // strings alocadas na memória
  partes: string[]; // a lista do modo join
  copias: number;
  strings: number;
  nota: string;
  ok?: boolean;
  fim?: boolean;
};

// As linhas mapeiam 1:1 com o campo `linha` dos passos, então a ordem e a
// quantidade de linhas não podem mudar sem ajustar o gerador junto.
const CODIGO_CONCAT = [
  "def juntar(palavra):",
  '    s = ""',
  "    for c in palavra:",
  "        s = s + c        # string NOVA a cada volta",
  "    return s",
];

const CODIGO_JOIN = [
  "def juntar(palavra):",
  "    partes = []",
  "    for c in palavra:",
  "        partes.append(c) # so guarda a referencia",
  '    return "".join(partes)',
];

const MODOS: { key: Modo; rotulo: string; familia: string; cor: string; arquivo: string }[] = [
  { key: "concat", rotulo: "s = s + c no laço", familia: "O(n²)", cor: "#fbbf24", arquivo: "concat.py" },
  { key: "join", rotulo: "lista + join", familia: "O(n)", cor: "#34d399", arquivo: "join.py" },
];

const PALAVRAS = ["CCC", "CRAFT", "CODECLUB", "ALGORITMO", "ESTRUTURA", "CRAFTCODECLUB", "IMUTAVEL", "STRING"];

// Os mesmos exemplos que o artigo manda prever antes de rodar, para o aluno não
// precisar digitar (inclusive a entrada vazia, que é o caso de borda).
const PRESETS: { rotulo: string; texto: string }[] = [
  { rotulo: "CCC", texto: "CCC" },
  { rotulo: "CRAFTCODE", texto: "CRAFTCODE" },
  { rotulo: "CRAFTCODECLUB", texto: "CRAFTCODECLUB" },
  { rotulo: "entrada vazia", texto: "" },
];

const PADRAO = "CRAFTCODE";
const MAX = 16;

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

// Formatação determinística (nada de Intl, para o HTML do servidor bater com o
// do cliente na hidratação).
function num(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function plural(n: number, um: string, muitos: string): string {
  return n === 1 ? um : muitos;
}

function gerarPassos(palavra: string, modo: Modo): Passo[] {
  const chars = Array.from(palavra).slice(0, MAX);
  const n = chars.length;
  const out: Passo[] = [];

  if (modo === "concat") {
    const blocos: Bloco[] = [];
    let copias = 0;
    let strings = 0;
    out.push({
      linha: 1,
      i: -1,
      usados: 0,
      blocos: [],
      partes: [],
      copias,
      strings,
      nota: n
        ? "Começo com a string vazia. Como a string é imutável, cada volta do laço vai ter que criar uma string NOVA: não existe escrever um caractere no fim da que já está lá."
        : "A entrada está vazia: o laço não roda nenhuma vez e o resultado é a própria string vazia. Zero cópias, zero alocações.",
    });
    for (let i = 0; i < n; i++) {
      copias += i + 1;
      strings += 1;
      for (const b of blocos) {
        b.viva = false;
        b.nova = false;
      }
      blocos.push({ id: i + 1, txt: chars.slice(0, i + 1).join(""), viva: true, nova: true });
      out.push({
        linha: 3,
        i,
        usados: i + 1,
        blocos: blocos.map((b) => ({ ...b })),
        partes: [],
        copias,
        strings,
        nota:
          `Volta ${i + 1}: aloco uma string nova de ${i + 1} ${plural(i + 1, "caractere", "caracteres")}, ` +
          `copio ${i === 0 ? "nada de antes" : i === 1 ? "o caractere que já estava lá" : `os ${i} caracteres de antes`} e escrevo o "${chars[i]}". ` +
          `${i + 1} ${plural(i + 1, "cópia", "cópias")} nesta volta, ${copias} no total. ` +
          (i === 0 ? "A string vazia fica para trás." : "A string da volta anterior virou lixo para o coletor."),
      });
    }
    out.push({
      linha: 4,
      i: -1,
      usados: n,
      blocos: blocos.map((b) => ({ ...b, nova: false })),
      partes: [],
      copias,
      strings,
      ok: true,
      fim: true,
      nota: n
        ? `Resultado "${chars.join("")}" com ${copias} ${plural(copias, "caractere copiado", "caracteres copiados")} e ${strings} ${plural(strings, "string alocada", "strings alocadas")}, das quais ${n - 1} viraram lixo. A conta é 1+2+...+${n} = ${copias}, ou seja n(n+1)/2, que é O(n²).`
        : "Nada a montar. Repare que este é o caso de borda que costuma quebrar implementação apressada.",
    });
    return out;
  }

  const partes: string[] = [];
  let copias = 0;
  let strings = 0;
  out.push({
    linha: 1,
    i: -1,
    usados: 0,
    blocos: [],
    partes: [],
    copias,
    strings,
    nota: n
      ? "Começo com uma lista vazia. A ideia é adiar a cópia: guardo os pedaços e junto tudo de uma vez só no fim."
      : "A entrada está vazia: a lista fica vazia e o join devolve a string vazia sem copiar nada.",
  });
  for (let i = 0; i < n; i++) {
    partes.push(chars[i]);
    out.push({
      linha: 3,
      i,
      usados: i + 1,
      blocos: [],
      partes: [...partes],
      copias,
      strings,
      nota: `Volta ${i + 1}: guardo "${chars[i]}" na lista. A lista só anota onde o caractere está, não copia caractere nenhum, então o contador de cópias continua em ${copias}.`,
    });
  }
  copias += n;
  strings = n ? 1 : 0;
  out.push({
    linha: 4,
    i: -1,
    usados: n,
    blocos: n ? [{ id: 1, txt: chars.join(""), viva: true, nova: true }] : [],
    partes: [...partes],
    copias,
    strings,
    ok: true,
    fim: true,
    nota: n
      ? `join: agora sim. Somo os ${n} tamanhos, aloco UMA string de ${n} ${plural(n, "caractere", "caracteres")} e copio tudo numa passada. Total: ${copias} ${plural(copias, "cópia", "cópias")} contra ${(n * (n + 1)) / 2} do "+=" no laço.`
      : "join de uma lista vazia: devolve a string vazia, sem alocar nada.",
  });
  return out;
}

export function StringsVisualizer() {
  const [modo, setModo] = useState<Modo>("concat");
  const [palavra, setPalavra] = useState(PADRAO);
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const chars = useMemo(() => Array.from(palavra).slice(0, MAX), [palavra]);
  const n = chars.length;
  const passos = useMemo(() => gerarPassos(palavra, modo), [palavra, modo]);
  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];
  const cfg = MODOS.find((m) => m.key === modo) ?? MODOS[0];

  const parar = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const reiniciar = () => {
    parar();
    setTocando(false);
    setPasso(0);
  };

  const aoMudarPalavra = (v: string) => {
    reiniciar();
    setPalavra(Array.from(v).slice(0, MAX).join(""));
  };

  const sortear = () => {
    const nova = PALAVRAS[Math.floor(Math.random() * PALAVRAS.length)];
    reiniciar();
    setPalavra(nova);
  };

  const trocarModo = (m: Modo) => {
    reiniciar();
    setModo(m);
  };

  // Já consumido fica aceso (o caractere JÁ está dentro de s), o da volta atual
  // pulsa, e o que ainda não entrou fica apagado. É o resultado crescendo.
  const cells = chars.map((c, i) => {
    let cls = "viz-cell";
    if (p.fim) cls += " in";
    else if (i === p.i) cls += " in entra";
    else if (i < p.usados) cls += " in";
    else cls += " drop";
    return { i, c, cls, marca: i === p.i ? "c" : "" };
  });

  const totalConcat = (n * (n + 1)) / 2;
  const mortas = p.blocos.filter((b) => !b.viva).length;

  const variaveis =
    modo === "concat"
      ? [
          { nome: "s", valor: `"${chars.slice(0, p.usados).join("")}"` },
          { nome: "len(s)", valor: `${p.usados}` },
          { nome: "c", valor: p.i >= 0 ? `"${chars[p.i]}"` : "-" },
          { nome: "cópias", valor: num(p.copias), best: true },
        ]
      : [
          { nome: "len(partes)", valor: `${p.partes.length}` },
          { nome: "c", valor: p.i >= 0 ? `"${chars[p.i]}"` : "-" },
          { nome: "strings novas", valor: `${p.strings}` },
          { nome: "cópias", valor: num(p.copias), best: true },
        ];

  const notaCls = "viz-note" + (p.ok ? " ok" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);
  const codigo = modo === "concat" ? CODIGO_CONCAT : CODIGO_JOIN;

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" style={{ background: cfg.cor }} />
          <span>Visualizador · o custo de montar uma string</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">
            passo {idx + 1} de {total}
          </span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "✕ Fechar" : "⤢ Expandir"}
          </button>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          {MODOS.map((m) => {
            const on = m.key === modo;
            return (
              <button
                key={m.key}
                className={`bigo-chip${on ? " on" : ""}`}
                style={on ? { borderColor: m.cor, color: m.cor } : undefined}
                onClick={() => trocarModo(m.key)}
                aria-pressed={on}
              >
                <span className="sw" style={{ background: on ? m.cor : "#3a4a60" }} />
                {m.familia} · {m.rotulo}
              </button>
            );
          })}
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Palavra a montar, um caractere por volta</span>
            <input className="viz-input" value={palavra} onChange={(e) => aoMudarPalavra(e.target.value)} />
          </label>
          <button className="viz-btn" onClick={sortear}>
            Sortear
          </button>
        </div>

        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              key={pr.rotulo}
              className={`bigo-chip${palavra === pr.texto ? " on" : ""}`}
              onClick={() => aoMudarPalavra(pr.texto)}
              aria-pressed={palavra === pr.texto}
            >
              {pr.rotulo} · n = {Array.from(pr.texto).length}
            </button>
          ))}
        </div>

        <div className="viz-cells">
          {cells.length ? (
            cells.map((c) => (
              <div className="viz-cell-wrap" key={c.i}>
                <span className="viz-cell-idx">{c.i}</span>
                <div className={c.cls}>{c.c}</div>
                <span className={`viz-mark${c.marca ? " show" : ""}`}>{c.marca || "·"}</span>
              </div>
            ))
          ) : (
            <span className="str-vazio">Entrada vazia: nada para percorrer.</span>
          )}
        </div>

        <div className="str-heap">
          <span className="str-lbl">
            Memória: strings alocadas
            {mortas > 0 ? <em className="str-lixo"> {mortas} para o coletor de lixo</em> : null}
          </span>
          {p.blocos.length ? (
            p.blocos.map((b) => (
              <span key={b.id} className={`str-bloco${b.viva ? " viva" : " morta"}${b.nova ? " nova" : ""}`}>
                {b.txt}
              </span>
            ))
          ) : (
            <span className="str-vazio">nada alocado ainda</span>
          )}
        </div>

        {modo === "join" ? (
          <div className="str-heap">
            <span className="str-lbl">Lista de pedaços: guarda a referência, não copia caractere</span>
            {p.partes.length ? (
              p.partes.map((c, i) => (
                <span key={i} className="str-bloco viva">
                  {c}
                </span>
              ))
            ) : (
              <span className="str-vazio">lista vazia</span>
            )}
          </div>
        ) : null}

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>caracteres copiados</span>
            <strong style={{ color: cfg.cor }}>{num(p.copias)}</strong>
          </div>
          <div className="bigo-stat">
            <span>strings alocadas</span>
            <strong>{num(p.strings)}</strong>
          </div>
          <div className="bigo-stat">
            <span>total com s = s + c</span>
            <strong style={{ color: "#fbbf24" }}>{num(totalConcat)}</strong>
          </div>
          <div className="bigo-stat">
            <span>total com join</span>
            <strong style={{ color: "#34d399" }}>{num(n)}</strong>
          </div>
        </div>

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">
              {cfg.arquivo} · {cfg.familia}
            </div>
            <div className="viz-code-body">
              {codigo.map((txt, i) => (
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

        <div className="viz-controls">
          <button className="viz-btn" title="Reiniciar" onClick={reiniciar}>
            ↺
          </button>
          <button
            className="viz-btn"
            disabled={idx === 0}
            onClick={() => {
              parar();
              setTocando(false);
              setPasso(Math.max(0, idx - 1));
            }}
          >
            ‹ Anterior
          </button>
          <button
            className="viz-play"
            onClick={() => {
              if (tocando) {
                setTocando(false);
                return;
              }
              setPasso(idx >= total - 1 ? 0 : idx);
              setTocando(true);
            }}
          >
            {tocando ? "❚❚ Pausar" : "▶ Rodar"}
          </button>
          <button
            className="viz-btn"
            disabled={idx === total - 1}
            onClick={() => {
              parar();
              setTocando(false);
              setPasso(Math.min(idx + 1, total - 1));
            }}
          >
            Próximo ›
          </button>
          <div className="viz-speed">
            <span>Velocidade</span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={velocidade}
              onChange={(e) => setVelocidade(parseInt(e.target.value, 10))}
            />
            <span className="val">{ROTULOS_VEL[velocidade]}</span>
          </div>
        </div>
        <div className="viz-progress">
          <div className="viz-progress-fill" style={{ width: `${pctPasso}%`, background: cfg.cor }} />
        </div>
      </div>
    </figure>
  );

  if (expanded && mounted) {
    return createPortal(
      <div
        className="viz-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) setExpanded(false);
        }}
      >
        {viz}
      </div>,
      document.body
    );
  }
  return viz;
}
