"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// TwoPointersPalindromo, ponteiros convergentes que NÃO andam no mesmo ritmo.
//
// Mesmo esqueleto do TwoPointersVisualizer (gerador puro de passos + a casca
// compartilhada), mas o que se aprende aqui é outro: quando o problema manda
// ignorar pontuação e espaço, cada ponteiro anda no seu ritmo, e a string
// original nunca é copiada nem limpa. É a versão que o pessoal chegou ao vivo
// no encontro, depois de perceber que replace() cria uma string nova a cada
// caractere descartado.
//
// O contador de "strings novas" fica sempre em 0 de propósito, e ao lado dele
// aparece quantas a versão que limpa a string antes teria alocado. É o
// argumento visual do O(1) contra o O(n) de espaço, com número concreto.
// ---------------------------------------------------------------------------

type Passo = {
  l: number;
  r: number;
  linha: number;
  comparacoes: number;
  saltos: number;
  moveL?: boolean;
  moveR?: boolean;
  comparando?: boolean;
  falha?: boolean;
  ok?: boolean;
  fim?: boolean;
  nota: string;
};

// As linhas mapeiam 1:1 com o campo `linha` de cada passo.
const CODIGO = [
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

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

function alnum(c: string): boolean {
  return /[a-zA-Z0-9]/.test(c);
}

// Espaço vira um glifo visível, senão a célula fica vazia e parece bug.
function mostrar(c: string): string {
  return c === " " ? "␣" : c;
}

function gerarPassos(s: string): Passo[] {
  const out: Passo[] = [];
  let l = 0;
  let r = s.length - 1;
  let comparacoes = 0;
  let saltos = 0;
  const base = () => ({ l, r, comparacoes, saltos });
  // Caso de borda que o LeetCode cobra: string vazia é palíndromo por vacuidade,
  // e o while nem chega a rodar.
  if (s.length === 0) {
    return [{ ...base(), linha: 12, ok: true, fim: true, nota: "string vazia: o while nem começa, porque esq (0) já não é menor que dir (-1). Sem nenhuma comparação, a resposta é sim, é palíndromo." }];
  }
  out.push({ ...base(), linha: 1, nota: `esq no caractere 0 e dir no caractere ${s.length - 1}. Vou fechando os dois até eles se encontrarem.` });
  let guarda = 0;
  while (l < r && guarda++ < 300) {
    if (!alnum(s[l])) {
      saltos++;
      out.push({ ...base(), linha: 4, moveL: true, nota: `s[${l}] = "${mostrar(s[l])}" não é letra nem dígito: avanço só a esquerda, a direita fica parada.` });
      l++;
      continue;
    }
    if (!alnum(s[r])) {
      saltos++;
      out.push({ ...base(), linha: 6, moveR: true, nota: `s[${r}] = "${mostrar(s[r])}" não é letra nem dígito: recuo só a direita, a esquerda fica parada.` });
      r--;
      continue;
    }
    const a = s[l].toLowerCase();
    const b = s[r].toLowerCase();
    comparacoes++;
    if (a !== b) {
      out.push({ ...base(), linha: 8, comparando: true, falha: true, fim: true, nota: `s[${l}] = "${s[l]}" e s[${r}] = "${s[r]}": diferentes mesmo ignorando maiúscula. Não é palíndromo, e eu já posso parar aqui.` });
      return out;
    }
    out.push({ ...base(), linha: 7, comparando: true, nota: `s[${l}] = "${s[l]}" e s[${r}] = "${s[r]}": iguais quando ignoro maiúscula. Comparação ${comparacoes}.` });
    out.push({ ...base(), linha: 10, moveL: true, moveR: true, nota: `bateu: fecho os dois de uma vez, esquerda vai para ${l + 1} e direita para ${r - 1}.` });
    l++;
    r--;
  }
  // Com tamanho ímpar os ponteiros param no mesmo caractere; com tamanho par
  // eles se cruzam. A condição `esq < dir` cobre os dois sem `if` extra.
  const fecho =
    l === r
      ? `esq e dir pararam os dois no índice ${l}: é o caractere do meio, e ele é palíndromo de si mesmo, não precisa de comparação nenhuma.`
      : `esq (${l}) passou dir (${r}): sobrou parte nenhuma no meio, todos os pares já foram conferidos.`;
  out.push({ ...base(), linha: 12, ok: true, fim: true, nota: `${fecho} É palíndromo, com ${comparacoes} ${comparacoes === 1 ? "comparação" : "comparações"} e ${saltos} ${saltos === 1 ? "salto" : "saltos"}.` });
  return out;
}

const DEFAULT_S = "A man, a plan, a canal: Panama";

type Preset = { key: string; rotulo: string; s: string };
const PRESETS: Preset[] = [
  { key: "arara", rotulo: "arara", s: "arara" },
  { key: "banana", rotulo: "banana (falha no passo 1)", s: "banana" },
  { key: "raceacar", rotulo: "race a car (falha no fim)", s: "race a car" },
  { key: "panama", rotulo: "A man, a plan, a canal: Panama", s: DEFAULT_S },
  { key: "zeroP", rotulo: "0P (a pegadinha do %32)", s: "0P" },
  { key: "vazio", rotulo: "vazio (caso de borda)", s: "" },
];

export function TwoPointersPalindromo() {
  const [texto, setTexto] = useState(DEFAULT_S);
  const [preset, setPreset] = useState("panama");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(4);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const s = texto;
  const passos = useMemo(() => gerarPassos(s), [s]);
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
    timer.current = setInterval(() => setPasso((st) => (st >= total - 1 ? st : st + 1)), VELOCIDADES[velocidade]);
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

  const aoMudarTexto = (v: string) => {
    parar(); setTocando(false); setPasso(0); setPreset("");
    setTexto(v.slice(0, 40));
  };
  const aplicarPreset = (pr: Preset) => {
    parar(); setTocando(false); setPasso(0); setPreset(pr.key);
    setTexto(pr.s);
  };

  const cells = s.split("").map((c, i) => {
    let cls = "viz-cell";
    if (!alnum(c)) cls += " pula";
    if (i === p.l || i === p.r) cls += " in";
    if (i < p.l || i > p.r) cls += " drop";
    if (p.falha && (i === p.l || i === p.r)) cls += " sai";
    else if ((p.comparando || p.moveL || p.moveR) && (i === p.l || i === p.r)) cls += " entra";
    let marca = "";
    if (i === p.l) marca = "E";
    if (i === p.r) marca = marca ? "E D" : "D";
    return { i, c: mostrar(c), cls, marca };
  });

  const variaveis = [
    { nome: "esq", valor: `${p.l}` },
    { nome: "dir", valor: `${p.r}` },
    { nome: "s[esq]", valor: p.l < s.length ? `"${mostrar(s[p.l])}"` : "-" },
    { nome: "s[dir]", valor: p.r >= 0 ? `"${mostrar(s[p.r])}"` : "-", best: true },
  ];

  // A solução que limpa a string antes aloca uma string nova por caractere
  // aproveitado (string é imutável, cada `limpa += c` cria outra) mais uma para
  // o `limpa[::-1]`. É o O(n) de espaço que os dois ponteiros não pagam.
  const uteis = s.split("").filter(alnum).length;
  const copiasIngenuas = uteis + 1;

  const estatisticas = [
    { k: "n", rot: "caracteres (n)", val: `${s.length}` },
    { k: "comp", rot: "comparações", val: `${p.comparacoes}` },
    { k: "salto", rot: "saltos de pontuação", val: `${p.saltos}` },
    { k: "mem", rot: "strings novas aqui", val: "0" },
    { k: "mem2", rot: "strings novas limpando antes", val: `${copiasIngenuas}` },
  ];

  const notaCls = "viz-note" + (p.ok ? " ok" : p.falha ? " invalid" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · palíndromo com ponteiros em ritmos diferentes</span>
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
            <span>Texto (até 40 caracteres)</span>
            <input className="viz-input" value={texto} onChange={(e) => aoMudarTexto(e.target.value)} />
          </label>
        </div>

        {cells.length ? (
          <div className="viz-cells tp-chars">
            {cells.map((c) => (
              <div className="viz-cell-wrap" key={c.i}>
                <span className="viz-cell-idx">{c.i}</span>
                <div className={c.cls}>{c.c}</div>
                <span className={`viz-mark${c.marca ? " show" : ""}`}>{c.marca || "·"}</span>
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

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">palindromo.py</div>
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
          {estatisticas.map((st) => (
            <div className="bigo-stat" key={st.k}>
              <span>{st.rot}</span>
              <strong>{st.val}</strong>
            </div>
          ))}
        </div>

        <div className="viz-controls">
          <button className="viz-btn" title="Reiniciar" onClick={() => { parar(); setTocando(false); setPasso(0); }}>↺</button>
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
