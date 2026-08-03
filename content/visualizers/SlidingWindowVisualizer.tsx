"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// SlidingWindowVisualizer, visualização passo a passo da Sliding Window.
//
// Padrão para novos visualizadores: um gerador puro de "passos" + a mesma
// casca de UI (células, código sincronizado, variáveis, controles, expandir).
// Para uma técnica nova, copie este arquivo, troque `gerarPassos` e o `CODIGO`.
//
// variant="fixed"    → maior soma de uma janela de tamanho k (tamanho travado)
// variant="dynamic"  → maior subarray com soma ≤ k (cresce/encolhe)
//
// Os dois modos contam LEITURAS DO ARRAY (cada `nums[i]` executado) e mostram,
// ao lado, quantas leituras a força bruta faria. É esse par de números que
// transforma "a janela é O(n)" em algo que o aluno vê acontecendo:
//   janela fixa    → 2n - k          força bruta → (n - k + 1) · k
//   janela variável→ n + encolhimentos  força bruta → n(n+1)/2 no pior caso
//
// O array padrão da janela variável, [2, 3, 4, 5, 6, 7, 9] com soma ≤ 15, é o
// mesmo que a galera desenhou no encontro: as somas saem 2, 5, 9, 14, depois
// estoura em 20, volta para 15, estoura em 22, volta para 13, e a resposta é 4.
// ---------------------------------------------------------------------------

type Variant = "fixed" | "dynamic";

type Passo = {
  l: number;
  r: number;
  curr: number; // métrica da janela (soma)
  ans: number; // resposta acumulada (fixa: melhor soma / dinâmica: maior tamanho)
  linha: number;
  leituras: number; // acessos a nums[...] executados até aqui
  entra?: number;
  sai?: number;
  invalid?: boolean;
  ok?: boolean;
  fim?: boolean;
  nota: string;
};

// As linhas mapeiam 1:1 com os passos (campo `linha` em gerarPassos*), então a
// ordem e a quantidade de linhas não podem mudar.
const CODIGO_FIXA = [
  "def melhor_soma(nums, k):",
  "    soma = sum(nums[:k])",
  "    melhor = soma",
  "    esquerda = 0",
  "    for direita in range(k, len(nums)):",
  "        soma += nums[direita]",
  "        soma -= nums[esquerda]",
  "        esquerda += 1",
  "        melhor = max(melhor, soma)",
  "    return melhor",
];

const CODIGO_DINAMICA = [
  "def maior_subarray(nums, k):",
  "    esquerda = 0",
  "    soma = 0",
  "    melhor = 0",
  "    for direita in range(len(nums)):",
  "        soma += nums[direita]",
  "        while soma > k:",
  "            soma -= nums[esquerda]",
  "            esquerda += 1",
  "        melhor = max(melhor, direita - esquerda + 1)",
  "    return melhor",
];

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

function plural(v: number, um: string, muitos: string): string {
  return `${v} ${v === 1 ? um : muitos}`;
}

function gerarPassosFixa(nums: number[], k: number): Passo[] {
  const out: Passo[] = [];
  const n = nums.length;
  let soma = 0;
  for (let i = 0; i < k; i++) soma += nums[i];
  let leituras = k;
  let melhor = soma;
  let esq = 0;

  out.push({
    l: 0,
    r: k - 1,
    curr: soma,
    ans: melhor,
    linha: 1,
    leituras,
    nota: `Monto a primeira janela somando do zero: ${nums.slice(0, k).join(" + ")} = ${soma}. É a única vez que eu faço isso, e me custou ${plural(k, "leitura", "leituras")}.`,
  });
  out.push({
    l: 0,
    r: k - 1,
    curr: soma,
    ans: melhor,
    linha: 2,
    leituras,
    ok: true,
    nota: `Ainda não tenho com quem comparar, então a primeira janela já é a melhor: ${melhor}.`,
  });

  for (let d = k; d < n; d++) {
    soma += nums[d];
    leituras++;
    out.push({
      l: esq,
      r: d,
      curr: soma,
      ans: melhor,
      linha: 5,
      leituras,
      entra: d,
      nota: `Entra nums[${d}] = ${nums[d]} pela direita. Agora tenho ${k + 1} elementos e soma ${soma}: sobrou um, preciso devolver o mais antigo.`,
    });

    const saiu = esq;
    soma -= nums[saiu];
    leituras++;
    esq++;
    out.push({
      l: esq,
      r: d,
      curr: soma,
      ans: melhor,
      linha: 6,
      leituras,
      sai: saiu,
      nota: `Sai nums[${saiu}] = ${nums[saiu]} pela esquerda. soma = ${soma}, de volta aos ${k} elementos, e esquerda passa a ser ${esq}. Duas leituras, não ${k}.`,
    });

    const superou = soma > melhor;
    if (superou) melhor = soma;
    out.push({
      l: esq,
      r: d,
      curr: soma,
      ans: melhor,
      linha: 8,
      leituras,
      ok: superou,
      nota: superou
        ? `A janela [${esq}..${d}] soma ${soma} e é a melhor até agora.`
        : `A janela [${esq}..${d}] soma ${soma}, não supera ${melhor}. Sigo em frente.`,
    });
  }

  const bruta = (n - k + 1) * k;
  out.push({
    l: esq,
    r: n - 1,
    curr: soma,
    ans: melhor,
    linha: 9,
    leituras,
    fim: true,
    nota: `Fim: a maior soma de ${k} elementos seguidos é ${melhor}. Gastei ${plural(leituras, "leitura", "leituras")} do array, contra ${bruta} da força bruta.`,
  });
  return out;
}

function gerarPassosDinamica(nums: number[], k: number): Passo[] {
  const out: Passo[] = [];
  const n = nums.length;
  let soma = 0;
  let melhor = 0;
  let esq = 0;
  let leituras = 0;

  out.push({
    l: 0,
    r: -1,
    curr: 0,
    ans: 0,
    linha: 2,
    leituras,
    nota: `Janela vazia: esquerda e direita em 0, soma 0. Vou crescer pela direita enquanto a soma couber em ${k}.`,
  });

  for (let d = 0; d < n; d++) {
    soma += nums[d];
    leituras++;
    out.push({
      l: esq,
      r: d,
      curr: soma,
      ans: melhor,
      linha: 5,
      leituras,
      entra: d,
      nota: `Entra nums[${d}] = ${nums[d]} pela direita. soma = ${soma}.`,
    });

    let guarda = 0;
    while (soma > k && esq <= d && guarda++ < 200) {
      out.push({
        l: esq,
        r: d,
        curr: soma,
        ans: melhor,
        linha: 6,
        leituras,
        invalid: true,
        sai: esq,
        nota: `soma ${soma} passou de k = ${k}: janela inválida. Como todo mundo aqui é positivo, só encolhendo pela esquerda ela volta a valer.`,
      });
      soma -= nums[esq];
      leituras++;
      esq++;
      out.push({
        l: esq,
        r: d,
        curr: soma,
        ans: melhor,
        linha: 7,
        leituras,
        nota: `Sai nums[${esq - 1}] = ${nums[esq - 1]} pela esquerda. soma = ${soma}. O índice ${esq - 1} nunca mais volta.`,
      });
    }

    const len = d - esq + 1;
    const superou = len > melhor;
    if (superou) melhor = len;
    out.push({
      l: esq,
      r: d,
      curr: soma,
      ans: melhor,
      linha: 9,
      leituras,
      ok: true,
      nota:
        len <= 0
          ? `A janela ficou vazia: nums[${d}] = ${nums[d]} sozinho já estoura ${k}. Melhor resposta segue ${melhor}.`
          : superou
            ? `Janela válida [${esq}..${d}], ${plural(len, "elemento", "elementos")}. É a maior até agora: ${melhor}.`
            : `Janela válida [${esq}..${d}], ${plural(len, "elemento", "elementos")}, que não supera ${melhor}.`,
    });
  }

  const bruta = (n * (n + 1)) / 2;
  out.push({
    l: esq,
    r: n - 1,
    curr: soma,
    ans: melhor,
    linha: 10,
    leituras,
    fim: true,
    nota: `Fim: o maior subarray com soma ≤ ${k} tem ${melhor} ${melhor === 1 ? "elemento" : "elementos"}. Cada índice entrou uma vez e saiu no máximo uma: ${plural(leituras, "leitura", "leituras")}, contra ${bruta} da força bruta no pior caso.`,
  });
  return out;
}

type Preset = { key: string; rotulo: string; nums: number[]; k: number };

const CENARIOS: Record<Variant, Preset[]> = {
  // Casos escolhidos a dedo: o padrão, o k grande, o k = n e a borda de tudo igual.
  fixed: [
    { key: "padrao", rotulo: "Padrão: k = 3", nums: [3, 6, 2, 8, 1, 4, 1, 5], k: 3 },
    { key: "k5", rotulo: "Janela maior: k = 5", nums: [3, 6, 2, 8, 1, 4, 1, 5], k: 5 },
    { key: "kn", rotulo: "k = n: uma janela só", nums: [3, 6, 2, 8, 1, 4, 1, 5], k: 8 },
    { key: "iguais", rotulo: "Tudo igual: k = 2", nums: [4, 4, 4, 4, 4], k: 2 },
  ],
  // O do encontro, um que encolhe várias vezes seguidas, a borda do elemento
  // que sozinho estoura k, e o caso em que nada estoura (a janela nunca encolhe).
  dynamic: [
    { key: "encontro", rotulo: "Do encontro: soma ≤ 15", nums: [2, 3, 4, 5, 6, 7, 9], k: 15 },
    { key: "encolhe", rotulo: "Encolhe em série: soma ≤ 8", nums: [3, 1, 2, 7, 4, 2, 1, 1, 5], k: 8 },
    { key: "estoura", rotulo: "Um elemento maior que k", nums: [1, 2, 20, 1, 1], k: 5 },
    { key: "nunca", rotulo: "Nada estoura: k folgado", nums: [1, 1, 1, 1, 1], k: 9 },
  ],
};

const TITULOS: Record<Variant, string> = {
  fixed: "janela fixa, a maior soma de k elementos seguidos",
  dynamic: "janela variável, o maior subarray com soma ≤ k",
};

const ROTULO_K: Record<Variant, string> = { fixed: "k", dynamic: "soma máx (k)" };

export function SlidingWindowVisualizer({ variant = "fixed" }: { variant?: Variant }) {
  const modo = variant;
  const cenarios = CENARIOS[modo];
  const inicial = cenarios[0];
  const CODIGO = modo === "fixed" ? CODIGO_FIXA : CODIGO_DINAMICA;

  const [nums, setNums] = useState<number[]>(inicial.nums);
  const [entrada, setEntrada] = useState(inicial.nums.join(", "));
  const [k, setK] = useState(inicial.k);
  const [cenario, setCenario] = useState(inicial.key);
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  // Na janela fixa, k é o tamanho e não pode passar de n. Na variável, k é um
  // teto de soma e pode ser qualquer número.
  const kEfetivo = modo === "fixed" ? Math.max(1, Math.min(k, nums.length)) : Math.max(1, k);

  const passos = useMemo(() => {
    const arr = nums.length ? nums : [1];
    const kk = modo === "fixed" ? Math.max(1, Math.min(k, arr.length)) : Math.max(1, k);
    return modo === "fixed" ? gerarPassosFixa(arr, kk) : gerarPassosDinamica(arr, kk);
  }, [nums, k, modo]);

  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];

  const parar = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  }, []);

  useEffect(() => () => parar(), [parar]);

  // Loop de reprodução, reinicia o intervalo quando play/velocidade mudam.
  useEffect(() => {
    parar();
    if (!tocando) return;
    timer.current = setInterval(() => {
      setPasso((s) => (s >= total - 1 ? s : s + 1));
    }, VELOCIDADES[velocidade]);
    return parar;
  }, [tocando, velocidade, total, parar]);

  // Pausa automaticamente ao chegar no fim.
  useEffect(() => {
    if (tocando && idx >= total - 1) setTocando(false);
  }, [tocando, idx, total]);

  // Esc fecha o modo expandido.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const reiniciar = useCallback(() => {
    parar();
    setTocando(false);
    setPasso(0);
  }, [parar]);

  const aoMudarEntrada = (v: string) => {
    const arr = v.split(",").map((x) => parseInt(x.trim(), 10)).filter((x) => !isNaN(x)).slice(0, 14);
    reiniciar();
    setCenario("");
    setEntrada(v);
    setNums(arr.length ? arr : [1]);
  };
  const aoMudarK = (v: string) => {
    const bruto = parseInt(v, 10) || 1;
    const kk = modo === "fixed" ? Math.max(1, Math.min(bruto, nums.length)) : Math.max(1, bruto);
    reiniciar();
    setCenario("");
    setK(kk);
  };
  const aplicar = (pr: Preset) => {
    reiniciar();
    setCenario(pr.key);
    setNums(pr.nums);
    setEntrada(pr.nums.join(", "));
    setK(pr.k);
  };
  // Math.random só aqui, num handler de clique: no caminho de render ele
  // quebraria a hidratação (o HTML do build divergiria do cliente).
  const sortear = () => {
    const n = 7 + Math.floor(Math.random() * 3);
    const arr = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 9));
    reiniciar();
    setCenario("");
    setNums(arr);
    setEntrada(arr.join(", "));
    setK(modo === "fixed" ? Math.min(k, n) : k);
  };

  const janelaVazia = p.l > p.r;
  const janelaAtiva = p.r >= 0 && !p.fim && !janelaVazia;

  const cells = nums.map((v, i) => {
    const dentro = janelaAtiva && i >= p.l && i <= p.r;
    let cls = "viz-cell";
    if (dentro) cls += " in";
    if (p.r >= 0 && i < p.l) cls += " drop";
    if (p.entra === i) cls += " entra";
    if (p.sai === i) cls += " sai";
    let marca = "";
    if (janelaAtiva && i === p.l) marca = "esq";
    if (janelaAtiva && i === p.r) marca = marca ? "esq/dir" : "dir";
    return { i, v, cls, marca };
  });

  const variaveis =
    modo === "fixed"
      ? [
          { nome: "esquerda", valor: `${p.l}` },
          { nome: "direita", valor: p.r < 0 ? "-" : `${p.r}` },
          { nome: "soma", valor: `${p.curr}` },
          { nome: "melhor", valor: `${p.ans}`, best: true },
        ]
      : [
          { nome: "esquerda", valor: `${p.l}` },
          { nome: "direita", valor: p.r < 0 ? "-" : `${p.r}` },
          { nome: "soma", valor: `${p.curr}` },
          { nome: "melhor (tam.)", valor: `${p.ans}`, best: true },
        ];

  const n = nums.length;
  const bruta = modo === "fixed" ? (n - kEfetivo + 1) * kEfetivo : (n * (n + 1)) / 2;
  const estatisticas = [
    { k: "n", rot: "tamanho (n)", val: `${n}` },
    { k: "leituras", rot: "leituras da janela", val: `${p.leituras}` },
    { k: "bruta", rot: modo === "fixed" ? "leituras da força bruta" : "força bruta (pior caso)", val: `${bruta}` },
    { k: "espaco", rot: "memória extra", val: "O(1)" },
  ];

  const notaCls = "viz-note" + (p.invalid ? " invalid" : p.ok || p.fim ? " ok" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · {TITULOS[modo]}</span>
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
          {cenarios.map((pr) => (
            <button
              key={pr.key}
              className={`bigo-chip${cenario === pr.key ? " on" : ""}`}
              onClick={() => aplicar(pr)}
              aria-pressed={cenario === pr.key}
            >
              {pr.rotulo}
            </button>
          ))}
        </div>

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Seu array</span>
            <input className="viz-input" value={entrada} onChange={(e) => aoMudarEntrada(e.target.value)} />
          </label>
          <label className="viz-field">
            <span>{ROTULO_K[modo]}</span>
            <input className="viz-input k" type="number" value={k} onChange={(e) => aoMudarK(e.target.value)} />
          </label>
          <button className="viz-btn" onClick={sortear}>Sortear</button>
        </div>

        <div className="viz-cells">
          {cells.map((c) => (
            <div className="viz-cell-wrap" key={c.i}>
              <span className="viz-cell-idx">{c.i}</span>
              <div className={c.cls}>{c.v}</div>
              <span className={`viz-mark${c.marca ? " show" : ""}`}>{c.marca || "·"}</span>
            </div>
          ))}
        </div>

        <p className={notaCls}>{p.nota}</p>

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
