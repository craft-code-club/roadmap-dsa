"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
// ---------------------------------------------------------------------------

type Passo = {
  esq: number;
  dir: number;
  meio: number | null;
  comparacoes: number;
  descartadas: number;
  linha: number;
  achou?: boolean;
  fim?: boolean;
  nota: string;
};

const CODIGO = [
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

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

function gerarPassos(nums: number[], alvo: number): Passo[] {
  const out: Passo[] = [];
  const n = nums.length;
  let esq = 0;
  let dir = n - 1;
  let comparacoes = 0;
  let descartadas = 0;

  out.push({
    esq, dir, meio: null, comparacoes, descartadas, linha: 1,
    nota: `Começo com o espaço de busca inteiro: da posição 0 até a ${n - 1}, ${n} candidatos. Como o array está ordenado, cada olhada vai eliminar metade deles.`,
  });

  let guarda = 0;
  while (esq <= dir && guarda++ < 100) {
    const meio = esq + Math.floor((dir - esq) / 2);
    const restantes = dir - esq + 1;
    out.push({
      esq, dir, meio, comparacoes, descartadas, linha: 3,
      nota: `Sobram ${restantes} candidato${restantes === 1 ? "" : "s"} (da posição ${esq} à ${dir}). O meio é ${esq} + (${dir} - ${esq}) // 2 = ${meio}, onde está o valor ${nums[meio]}.`,
    });
    comparacoes++;
    if (nums[meio] === alvo) {
      out.push({
        esq, dir, meio, comparacoes, descartadas, linha: 5, achou: true, fim: true,
        nota: `${nums[meio]} é o alvo. Achei na posição ${meio} com ${comparacoes} comparaç${comparacoes === 1 ? "ão" : "ões"}, tendo descartado ${descartadas} posiç${descartadas === 1 ? "ão" : "ões"} sem nunca olhar para elas.`,
      });
      return out;
    }
    if (nums[meio] < alvo) {
      const jogadas = meio - esq + 1;
      descartadas += jogadas;
      out.push({
        esq, dir, meio, comparacoes, descartadas, linha: 7,
        nota: `${nums[meio]} < ${alvo}: se o alvo existe, ele está à DIREITA. Descarto a posição ${meio} e tudo que vem antes dela, ${jogadas} posiç${jogadas === 1 ? "ão" : "ões"} de uma vez, sem ler nenhuma. A esquerda vai para ${meio + 1}.`,
      });
      esq = meio + 1;
    } else {
      const jogadas = dir - meio + 1;
      descartadas += jogadas;
      out.push({
        esq, dir, meio, comparacoes, descartadas, linha: 9,
        nota: `${nums[meio]} > ${alvo}: se o alvo existe, ele está à ESQUERDA. Descarto a posição ${meio} e tudo depois dela, ${jogadas} posiç${jogadas === 1 ? "ão" : "ões"} de uma vez. A direita vai para ${meio - 1}.`,
      });
      dir = meio - 1;
    }
  }

  out.push({
    esq, dir, meio: null, comparacoes, descartadas, linha: 10, fim: true,
    nota: `A esquerda (${esq}) passou da direita (${dir}): o espaço de busca ficou vazio, então ${alvo} não está no array. Bastaram ${comparacoes} comparações para ter certeza disso sobre ${n} elementos. E repare onde a esquerda parou: a posição ${esq} é exatamente onde ${alvo} entraria se fosse inserido.`,
  });
  return out;
}

type Preset = { key: string; rotulo: string; nums: number[]; alvo: number; dica: string };

const BASE = [2, 6, 10, 15, 20, 43, 60, 70];
const GRANDE = [3, 9, 14, 21, 28, 35, 42, 47, 55, 61, 68, 74, 80, 88, 93, 99];

const PRESETS: Preset[] = [
  {
    key: "meio",
    rotulo: "Achando o 20 em 8 posições",
    nums: BASE,
    alvo: 20,
    dica: "Oito candidatos e três olhadas. A busca linear precisaria de cinco, e a diferença só cresce a partir daqui.",
  },
  {
    key: "grande",
    rotulo: "16 posições, no máximo 5 olhadas",
    nums: GRANDE,
    alvo: 93,
    dica: "Dobrar o array de 8 para 16 não dobrou o trabalho: acrescentou uma comparação. É literalmente o que log₂ significa.",
  },
  {
    key: "ausente",
    rotulo: "Um valor que não existe: 40",
    nums: BASE,
    alvo: 40,
    dica: "Provar que algo NÃO está lá custa o mesmo que achar. E o ponteiro da esquerda para exatamente na posição onde o 40 deveria ser inserido, o que é um brinde da mecânica do algoritmo.",
  },
  {
    key: "extremo",
    rotulo: "O pior lugar possível: o 2",
    nums: BASE,
    alvo: 2,
    dica: "O primeiro elemento é justamente o que a busca binária demora mais para achar, enquanto a busca linear acerta de primeira. Nenhum algoritmo ganha em tudo.",
  },
];

function ordenar(v: number[]) {
  return [...v].sort((a, b) => a - b);
}

export function BuscaBinariaVisualizer() {
  const [nums, setNums] = useState<number[]>(BASE);
  const [entrada, setEntrada] = useState(BASE.join(", "));
  const [alvo, setAlvo] = useState(20);
  const [presetKey, setPresetKey] = useState("meio");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const passos = useMemo(() => gerarPassos(nums.length ? nums : [0], alvo), [nums, alvo]);
  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];

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
  const aoMudarEntrada = (v: string) => {
    const arr = ordenar(
      v.split(",").map((x) => parseInt(x.trim(), 10)).filter((x) => !isNaN(x)).slice(0, 16)
    );
    reiniciar();
    setPresetKey("");
    setEntrada(v);
    setNums(arr.length ? arr : [0]);
  };
  const aoMudarAlvo = (v: string) => {
    reiniciar();
    setPresetKey("");
    setAlvo(parseInt(v, 10) || 0);
  };
  const aplicarPreset = (pr: Preset) => {
    reiniciar();
    setPresetKey(pr.key);
    setNums(pr.nums);
    setEntrada(pr.nums.join(", "));
    setAlvo(pr.alvo);
  };

  const preset = PRESETS.find((pr) => pr.key === presetKey);
  const n = nums.length;
  const posLinear = nums.indexOf(alvo);
  const passosLinear = posLinear >= 0 ? posLinear + 1 : n;
  const teto = Math.floor(Math.log2(n)) + 1;
  const restantes = Math.max(0, p.dir - p.esq + 1);

  const cells = nums.map((v, i) => {
    let cls = "viz-cell";
    const dentro = i >= p.esq && i <= p.dir;
    if (!dentro) cls += " drop";
    if (i === p.meio) cls += p.achou ? " in entra" : " in";
    let marca = "";
    if (dentro && i === p.esq) marca = "e";
    if (dentro && i === p.dir) marca = marca ? "e d" : "d";
    if (i === p.meio) marca = marca ? `${marca} m` : "m";
    return { i, v, cls, marca };
  });

  const notaCls = "viz-note" + (p.achou ? " ok" : p.fim ? " invalid" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · busca binária: metade some a cada olhada</span>
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
          {PRESETS.map((pr) => (
            <button
              key={pr.key}
              className={`bigo-chip${presetKey === pr.key ? " on" : ""}`}
              onClick={() => aplicarPreset(pr)}
              aria-pressed={presetKey === pr.key}
            >
              {pr.rotulo}
            </button>
          ))}
        </div>

        {preset && <p className="tt-legenda-arvore">{preset.dica}</p>}

        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Array (é ordenado sozinho, porque a busca binária exige)</span>
            <input className="viz-input" value={entrada} onChange={(e) => aoMudarEntrada(e.target.value)} />
          </label>
          <label className="viz-field">
            <span>alvo</span>
            <input className="viz-input k" type="number" value={alvo} onChange={(e) => aoMudarAlvo(e.target.value)} />
          </label>
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

        <div className="bb-barra" aria-hidden="true">
          <div className="bb-barra-fill" style={{ width: `${(restantes / n) * 100}%` }} />
          <span className="bb-barra-txt">
            {restantes} de {n} candidatos ainda de pé
          </span>
        </div>

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">busca_binaria.py</div>
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
            <div className="viz-var">
              <span className="viz-var-name">esq</span>
              <span className="viz-var-val">{p.esq}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">dir</span>
              <span className="viz-var-val">{p.dir}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">meio</span>
              <span className="viz-var-val">{p.meio === null ? "-" : p.meio}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">alvo</span>
              <span className="viz-var-val best">{alvo}</span>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>comparações até aqui</span>
            <strong>{p.comparacoes}</strong>
          </div>
          <div className="bigo-stat">
            <span>descartadas sem ler</span>
            <strong>{p.descartadas}</strong>
          </div>
          <div className="bigo-stat">
            <span>busca linear gastaria</span>
            <strong>{passosLinear}</strong>
          </div>
          <div className="bigo-stat">
            <span>teto: ⌊log₂({n})⌋ + 1</span>
            <strong>{teto}</strong>
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
              setPasso((s) => Math.max(0, s - 1));
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
              setPasso((s) => Math.min(s + 1, total - 1));
            }}
          >
            Próximo ›
          </button>
          <div className="viz-speed">
            <span>Velocidade</span>
            <input type="range" min={1} max={5} step={1} value={velocidade} onChange={(e) => setVelocidade(parseInt(e.target.value, 10))} />
            <span className="val">{ROTULOS_VEL[velocidade]}</span>
          </div>
        </div>
        <div className="viz-progress">
          <div className="viz-progress-fill" style={{ width: `${pctPasso}%` }} />
        </div>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Digite um array desordenado no campo acima e repare que ele é reordenado sozinho antes de rodar. Não
          é conveniência de interface: sem a ordem, o passo &quot;o alvo está à direita&quot; deixa de ser uma
          dedução e vira um chute, e o algoritmo devolve a resposta errada com a mesma confiança.
        </p>
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
