"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// StackMonotonicaVisualizer, a pilha monotônica resolvendo "próximo maior
// elemento".
//
// Mesmo padrão do TwoPointersVisualizer: gerador PURO de passos + a mesma casca
// (fitas de células, código sincronizado, variáveis, controles, Expandir).
//
// A ÚNICA coisa que o aluno precisa ver acontecendo: quando chega um valor
// grande, ele resolve de uma vez TODOS os que estavam esperando embaixo dele,
// e cada índice entra e sai da pilha no máximo uma vez. É isso que faz o laço
// aninhado ser O(n) e não O(n²), e é por isso que o painel mostra os dois
// contadores lado a lado: as comparações que a pilha realmente fez e as que a
// força bruta faria no mesmo array.
//
// A pilha guarda ÍNDICES, não valores, porque a resposta é gravada na posição
// de quem estava esperando. Os valores ficam limitados a 0..99 para o -1 ser
// sempre "não existe", nunca um valor legítimo do array.
// ---------------------------------------------------------------------------

type Passo = {
  i: number; // índice atual; -1 na preparação, n no encerramento
  pilha: number[]; // índices, da base para o topo
  resp: (number | null)[]; // null = ainda o -1 provisório
  linha: number;
  popou?: number; // índice que acabou de receber resposta
  comparou?: number; // topo comparado e mantido
  empurrou?: number;
  comps: number;
  pushes: number;
  pops: number;
  fim?: boolean;
  nota: string;
};

// As linhas mapeiam 1:1 com o campo `linha` de cada passo, então a ordem e a
// quantidade de linhas não podem mudar sem ajustar o gerador junto.
const CODIGO = [
  "def proximo_maior(nums):",
  "    resp = [-1] * len(nums)",
  "    pilha = []                 # índices em espera",
  "    for i, v in enumerate(nums):",
  "        while pilha and nums[pilha[-1]] < v:",
  "            resp[pilha.pop()] = v",
  "        pilha.append(i)",
  "    return resp",
];

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

const MAX_ITENS = 12;

function limpar(v: string): number[] {
  return v
    .split(/[\s,]+/)
    .map((x) => parseInt(x, 10))
    .filter((x) => !isNaN(x) && x >= 0 && x <= 99)
    .slice(0, MAX_ITENS);
}

// Quantas comparações a força bruta faria no MESMO array: para cada i, varre
// para a direita até achar alguém maior. É o número que o painel põe ao lado
// do contador da pilha.
function compsForcaBruta(nums: number[]): number {
  let c = 0;
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      c++;
      if (nums[j] > nums[i]) break;
    }
  }
  return c;
}

function gerarPassos(nums: number[]): Passo[] {
  const out: Passo[] = [];
  const n = nums.length;
  const pilha: number[] = [];
  const resp: (number | null)[] = new Array(n).fill(null);
  let comps = 0;
  let pushes = 0;
  let pops = 0;

  const snap = (p: Omit<Passo, "comps" | "pushes" | "pops" | "pilha" | "resp">) => {
    out.push({ ...p, pilha: [...pilha], resp: [...resp], comps, pushes, pops });
  };

  if (!n) {
    snap({ i: -1, linha: 1, fim: true, nota: "Array vazio: não existe resposta para dar, e a pilha nunca chega a receber nada." });
    return out;
  }

  snap({
    i: -1,
    linha: 1,
    nota: `Começo com as ${n} respostas em -1. Esse é o palpite padrão: se ninguém maior aparecer à direita, o -1 fica.`,
  });
  snap({
    i: -1,
    linha: 2,
    nota: "A pilha começa vazia e vai guardar ÍNDICES de quem ainda não achou ninguém maior. Ela sempre fica em ordem decrescente de valor, do fundo para o topo.",
  });

  let guarda = 0;
  for (let i = 0; i < n && guarda++ < 400; i++) {
    const v = nums[i];
    snap({
      i,
      linha: 3,
      nota: `Chego no índice ${i}, valor ${v}. Pergunta única deste passo: esse ${v} é o próximo maior de alguém que está esperando na pilha?`,
    });

    while (pilha.length) {
      const j = pilha[pilha.length - 1];
      comps++;
      if (nums[j] < v) {
        pilha.pop();
        pops++;
        resp[j] = v;
        snap({
          i,
          linha: 5,
          popou: j,
          nota: `O topo é o índice ${j}, valor ${nums[j]}, e ${nums[j]} < ${v}: achei. O próximo maior de ${nums[j]} é ${v}, então gravo resp[${j}] = ${v} e desempilho, porque ele nunca mais vai precisar de resposta.`,
        });
      } else {
        snap({
          i,
          linha: 4,
          comparou: j,
          nota: `O topo é o índice ${j}, valor ${nums[j]}, e ${nums[j]} não é menor que ${v}: ele continua esperando. Como a pilha é decrescente, todo mundo abaixo dele é ainda maior, então nem preciso olhar. Paro o while.`,
        });
        break;
      }
    }

    pushes++;
    pilha.push(i);
    snap({
      i,
      linha: 6,
      empurrou: i,
      nota: `Empilho o índice ${i}: agora é o ${v} que fica esperando o próximo maior dele. A pilha tem ${pilha.length} ${pilha.length === 1 ? "índice" : "índices"} em espera.`,
    });
  }

  const sobrando = pilha.map((j) => `${nums[j]} (índice ${j})`).join(", ");
  const quantos = pilha.length;
  for (const j of pilha) resp[j] = -1;
  pilha.length = 0;
  snap({
    i: n,
    linha: 7,
    fim: true,
    nota: `Acabou o array e ${quantos === 1 ? "sobrou 1 índice" : `sobraram ${quantos} índices`} na pilha: ${sobrando}. Ninguém maior apareceu à direita, então a resposta ${quantos === 1 ? "dele" : "deles"} fica em -1 mesmo. Foram ${pushes} push e ${pops} pop para ${n} elementos, ou seja ${pushes + pops} operações de pilha contra o teto de ${2 * n}.`,
  });
  return out;
}

const PADRAO = [73, 74, 75, 71, 69, 72, 76, 73];

// Casos escolhidos a dedo: o clássico das temperaturas (LeetCode 739), o do
// GeeksforGeeks, o pior caso da força bruta, o caso em que ela empata e a
// borda do "estritamente maior".
type Preset = { key: string; rotulo: string; nums: number[] };
const PRESETS: Preset[] = [
  { key: "temp", rotulo: "Temperaturas (LeetCode 739)", nums: PADRAO },
  { key: "gfg", rotulo: "Do GeeksforGeeks: 6 8 0 1 3", nums: [6, 8, 0, 1, 3] },
  { key: "desce", rotulo: "Pior caso da força bruta", nums: [8, 7, 6, 5, 4, 3, 2, 1] },
  { key: "sobe", rotulo: "Crescente: 1 2 3 4 5 6 7 8", nums: [1, 2, 3, 4, 5, 6, 7, 8] },
  { key: "iguais", rotulo: "Tudo igual: 4 4 4 4", nums: [4, 4, 4, 4] },
];

export function StackMonotonicaVisualizer() {
  const [nums, setNums] = useState<number[]>(PADRAO);
  const [entrada, setEntrada] = useState(PADRAO.join(", "));
  const [preset, setPreset] = useState("temp");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const passos = useMemo(() => gerarPassos(nums), [nums]);
  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];
  const bruta = useMemo(() => compsForcaBruta(nums), [nums]);

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

  const aoMudarEntrada = (v: string) => {
    parar(); setTocando(false); setPasso(0); setPreset("");
    setEntrada(v); setNums(limpar(v));
  };
  const aplicarPreset = (pr: Preset) => {
    parar(); setTocando(false); setPasso(0); setPreset(pr.key);
    setNums(pr.nums); setEntrada(pr.nums.join(", "));
  };
  const sortear = () => {
    const n = 7 + Math.floor(Math.random() * 3);
    const arr = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 40));
    parar(); setTocando(false); setPasso(0); setPreset("");
    setNums(arr); setEntrada(arr.join(", "));
  };

  const naPilha = new Set(p.pilha);
  const topoIdx = p.pilha.length ? p.pilha[p.pilha.length - 1] : -1;

  const entradaCells = nums.map((v, i) => {
    let cls = "viz-cell";
    if (i === p.i) cls += " in";
    if (naPilha.has(i)) cls += " pl-espera";
    if (p.popou === i || p.comparou === i) cls += " entra";
    if (p.resp[i] !== null && p.resp[i] !== -1) cls += " pl-feito";
    let marca = "";
    if (i === p.i) marca = "i";
    else if (i === topoIdx) marca = "topo";
    else if (naPilha.has(i)) marca = "•";
    return { i, v, cls, marca };
  });

  const respCells = nums.map((_, i) => {
    const r = p.resp[i];
    let cls = "viz-cell";
    if (r === null) cls += " pl-vaga";
    else if (r === -1) cls += " pl-nada";
    else cls += " pl-resp";
    if (p.popou === i) cls += " entra";
    return { i, txt: r === null ? "-1" : `${r}`, cls };
  });

  // A torre desenha o topo em cima, então a pilha é percorrida ao contrário.
  const torre = [...p.pilha].reverse();
  const resolvidos = p.resp.filter((r) => r !== null).length;

  const variaveis = [
    { nome: "i", valor: p.i >= 0 && p.i < nums.length ? `${p.i}` : "-" },
    { nome: "v", valor: p.i >= 0 && p.i < nums.length ? `${nums[p.i]}` : "-" },
    { nome: "nums[pilha[-1]]", valor: topoIdx >= 0 ? `${nums[topoIdx]}` : "vazia" },
    { nome: "respondidos", valor: `${resolvidos} de ${nums.length}`, best: !!p.fim },
  ];

  const estatisticas = [
    { k: "n", rot: "tamanho (n)", val: `${nums.length}` },
    { k: "cmp", rot: "comparações até aqui", val: `${p.comps}` },
    { k: "bruta", rot: "força bruta faria", val: `${bruta}` },
    { k: "push", rot: "empilhados (push)", val: `${p.pushes}` },
    { k: "pop", rot: "desempilhados (pop)", val: `${p.pops}` },
  ];

  const notaCls = "viz-note" + (p.fim ? " ok" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · pilha monotônica: o próximo maior elemento</span>
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
            <span>Array (inteiros de 0 a 99)</span>
            <input className="viz-input" value={entrada} onChange={(e) => aoMudarEntrada(e.target.value)} />
          </label>
          <button className="viz-btn" onClick={sortear}>Sortear</button>
        </div>

        <div className="pl-arena">
          <div className="pl-col">
            <span className="pl-lbl">nums, o array de entrada</span>
            {nums.length ? (
              <div className="viz-cells">
                {entradaCells.map((c) => (
                  <div className="viz-cell-wrap" key={c.i}>
                    <span className="viz-cell-idx">{c.i}</span>
                    <div className={c.cls}>{c.v}</div>
                    <span className={`viz-mark${c.marca ? " show" : ""}`}>{c.marca || "·"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pl-vazia">array vazio</p>
            )}

            <span className="pl-lbl mt">resp, a resposta sendo preenchida</span>
            {nums.length ? (
              <div className="viz-cells">
                {respCells.map((c) => (
                  <div className="viz-cell-wrap" key={c.i}>
                    <span className="viz-cell-idx">{c.i}</span>
                    <div className={c.cls}>{c.txt}</div>
                  </div>
                ))}
              </div>
            ) : null}

            <p className="pl-legenda">
              <span><i className="am" />esperando na pilha</span>
              <span><i className="vd" />já respondido</span>
              <span><i className="tr" />ainda no -1 provisório</span>
            </p>

            <p className={notaCls}>{p.nota}</p>
          </div>

          <div className="pl-col">
            <span className="pl-lbl">Pilha de índices (topo em cima)</span>
            <div className="pl-torre">
              {torre.length ? (
                torre.map((j, k) => (
                  <div key={j} className={`pl-item${k === 0 ? " topo" : ""}${p.empurrou === j && k === 0 ? " entra" : ""}`}>
                    <span>{nums[j]}</span>
                    <span className="pl-meta">{k === 0 ? "topo · " : ""}índice {j}</span>
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
            <div className="viz-code-head">monotonica.py</div>
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
