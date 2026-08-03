"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
// ---------------------------------------------------------------------------

type Modo = "entraria" | "primeira" | "ultima";

type Passo = {
  esq: number;
  dir: number;
  meio: number | null;
  anotado: number;
  linha: number;
  comparacoes: number;
  fim?: boolean;
  achou?: boolean;
  nota: string;
};

const CODIGO: Record<Modo, string[]> = {
  entraria: [
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
  primeira: [
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
  ultima: [
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

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

const LADO: Record<Modo, string> = {
  entraria: "onde o valor entraria",
  primeira: "primeira ocorrência",
  ultima: "última ocorrência",
};

function gerarPassos(nums: number[], alvo: number, modo: Modo): Passo[] {
  const out: Passo[] = [];
  let esq = 0;
  let dir = nums.length - 1;
  let anotado = -1;
  let comparacoes = 0;

  out.push({
    esq, dir, meio: null, anotado, comparacoes, linha: 1,
    nota:
      modo === "entraria"
        ? `Procurando a posição de ${alvo} em ${nums.length} elementos. Repare que não existe caso de acerto neste código: mesmo se o valor existir, o laço vai até o fim.`
        : `Procurando a ${LADO[modo]} de ${alvo}. A diferença para a busca comum é uma linha só: quando eu acertar, vou anotar e continuar procurando para a ${modo === "primeira" ? "esquerda" : "direita"}.`,
  });

  let guarda = 0;
  while (esq <= dir && guarda++ < 100) {
    const meio = esq + Math.floor((dir - esq) / 2);
    comparacoes++;
    out.push({
      esq, dir, meio, anotado, comparacoes, linha: 3,
      nota: `Meio em ${meio}, valor ${nums[meio]}. Intervalo vivo: da posição ${esq} à ${dir}.`,
    });

    if (modo === "entraria") {
      if (nums[meio] < alvo) {
        out.push({
          esq, dir, meio, anotado, comparacoes, linha: 5,
          nota: `${nums[meio]} < ${alvo}: ${alvo} não pode entrar em ${meio} nem antes. A esquerda vai para ${meio + 1}.`,
        });
        esq = meio + 1;
      } else {
        out.push({
          esq, dir, meio, anotado, comparacoes, linha: 7,
          nota: `${nums[meio]} ${nums[meio] === alvo ? "empata com" : ">"} ${alvo}: ${alvo} entra em ${meio} ou antes, então a direita recua para ${meio - 1}. Repare que o empate cai neste mesmo ramo: é isso que faz a resposta ser a posição do PRIMEIRO igual.`,
        });
        dir = meio - 1;
      }
      continue;
    }

    if (nums[meio] === alvo) {
      anotado = meio;
      if (modo === "primeira") {
        out.push({
          esq, dir, meio, anotado, comparacoes, linha: 5,
          nota: `Achei ${alvo} na posição ${meio}, mas pode existir outro igual mais à esquerda. Anoto ${meio} como melhor resposta até agora e continuo procurando na metade de baixo.`,
        });
        dir = meio - 1;
      } else {
        out.push({
          esq, dir, meio, anotado, comparacoes, linha: 5,
          nota: `Achei ${alvo} na posição ${meio}, mas pode existir outro igual mais à direita. Anoto ${meio} e continuo procurando na metade de cima.`,
        });
        esq = meio + 1;
      }
    } else if (nums[meio] < alvo) {
      out.push({
        esq, dir, meio, anotado, comparacoes, linha: 8,
        nota: `${nums[meio]} < ${alvo}: descarto ${meio} e tudo à esquerda. A esquerda vai para ${meio + 1}.`,
      });
      esq = meio + 1;
    } else {
      out.push({
        esq, dir, meio, anotado, comparacoes, linha: 10,
        nota: `${nums[meio]} > ${alvo}: descarto ${meio} e tudo à direita. A direita recua para ${meio - 1}.`,
      });
      dir = meio - 1;
    }
  }

  if (modo === "entraria") {
    const existe = nums[esq] === alvo;
    out.push({
      esq, dir, meio: null, anotado, comparacoes, linha: 8, fim: true, achou: true,
      nota: `O intervalo esvaziou e a esquerda parou em ${esq}. ${
        existe
          ? `Como nums[${esq}] é ${alvo}, essa é a posição da primeira ocorrência.`
          : `${alvo} não está no array, e ${esq} é exatamente onde ele entraria mantendo tudo ordenado.`
      } É por isso que o Arrays.binarySearch do Java devolve -(${esq}) - 1 = ${-esq - 1} quando falha: o sinal diz "não achei" e o número carrega o ponto de inserção de graça. Multiplicar por -1 não serviria, porque -0 é 0 e a posição 0 ficaria indistinguível de um acerto.`,
    });
    return out;
  }

  out.push({
    esq, dir, meio: null, anotado, comparacoes, linha: 11, fim: true, achou: anotado >= 0,
    nota:
      anotado >= 0
        ? `Fim: a ${LADO[modo]} de ${alvo} está na posição ${anotado}, encontrada em ${comparacoes} comparações. Uma varredura linear daria a mesma resposta em até ${nums.length} passos.`
        : `Fim: ${alvo} não existe no array, então a resposta é -1. Custou ${comparacoes} comparações provar isso.`,
  });
  return out;
}

type Preset = { key: string; rotulo: string; nums: number[]; alvo: number; dica: string };

const REPETIDOS = [1, 3, 3, 3, 5, 8, 8, 11, 14];

const PRESETS: Preset[] = [
  {
    key: "bloco",
    rotulo: "Um bloco de três iguais: procurando 3",
    nums: REPETIDOS,
    alvo: 3,
    dica: "O 3 ocupa as posições 1, 2 e 3. A busca comum devolveria qualquer uma delas dependendo de onde o meio caiu. Alterne entre os três modos e veja as respostas 1 e 3 saindo do mesmo código.",
  },
  {
    key: "ausente",
    rotulo: "Um valor que não existe: 7",
    nums: REPETIDOS,
    alvo: 7,
    dica: "Sem ocorrência nenhuma, os modos de primeira e última devolvem -1. O modo de inserção continua útil: ele diz onde o 7 caberia.",
  },
  {
    key: "par",
    rotulo: "Duas ocorrências no fim: procurando 8",
    nums: REPETIDOS,
    alvo: 8,
    dica: "Posições 5 e 6. É o formato exato do problema Find First and Last Position of Element in Sorted Array: duas buscas binárias, uma para cada ponta.",
  },
  {
    key: "antes",
    rotulo: "Menor que tudo: procurando 0",
    nums: REPETIDOS,
    alvo: 0,
    dica: "A borda de baixo. A posição de inserção é 0, e nenhum passo do algoritmo precisa de tratamento especial para isso.",
  },
];

export function BuscaBinariaFronteira() {
  const [presetKey, setPresetKey] = useState("bloco");
  const [modo, setModo] = useState<Modo>("primeira");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const preset = useMemo(() => PRESETS.find((p) => p.key === presetKey) ?? PRESETS[0], [presetKey]);
  const passos = useMemo(() => gerarPassos(preset.nums, preset.alvo, modo), [preset, modo]);
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
  const trocarPreset = (k: string) => {
    reiniciar();
    setPresetKey(k);
  };
  const trocarModo = (m: Modo) => {
    reiniciar();
    setModo(m);
  };

  const nums = preset.nums;
  const resposta = modo === "entraria" ? (p.fim ? p.esq : null) : p.fim ? p.anotado : null;
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  const cells = nums.map((v, i) => {
    let cls = "viz-cell";
    const dentro = i >= p.esq && i <= p.dir;
    if (!dentro) cls += " drop";
    if (i === p.meio) cls += " in";
    if (i === p.anotado && modo !== "entraria") cls += " marcado";
    if (p.fim && resposta === i) cls += " entra";
    let marca = "";
    if (dentro && i === p.esq) marca = "e";
    if (dentro && i === p.dir) marca = marca ? "e d" : "d";
    if (i === p.meio) marca = marca ? `${marca} m` : "m";
    return { i, v, cls, marca, igual: v === preset.alvo };
  });

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · repetidos, bordas e a posição de inserção</span>
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
            <button key={pr.key} className={`bigo-chip${presetKey === pr.key ? " on" : ""}`} onClick={() => trocarPreset(pr.key)} aria-pressed={presetKey === pr.key}>
              {pr.rotulo}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">{preset.dica}</p>

        <div className="viz-inputs">
          <div className="viz-field">
            <span>O que eu quero saber</span>
            <div className="sub-modo">
              <button className={`sub-modo-btn${modo === "primeira" ? " on" : ""}`} onClick={() => trocarModo("primeira")} aria-pressed={modo === "primeira"}>
                primeira ocorrência
              </button>
              <button className={`sub-modo-btn${modo === "ultima" ? " on" : ""}`} onClick={() => trocarModo("ultima")} aria-pressed={modo === "ultima"}>
                última ocorrência
              </button>
              <button className={`sub-modo-btn${modo === "entraria" ? " on" : ""}`} onClick={() => trocarModo("entraria")} aria-pressed={modo === "entraria"}>
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
              <span className={`viz-mark${c.marca ? " show" : ""}`}>{c.marca || "·"}</span>
            </div>
          ))}
        </div>

        <p className={"viz-note" + (p.fim ? (p.achou ? " ok" : " invalid") : "")}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">
              {modo === "entraria" ? "onde_entraria.py" : modo === "primeira" ? "primeira.py" : "ultima.py"}
            </div>
            <div className="viz-code-body">
              {CODIGO[modo].map((txt, i) => (
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
            {modo !== "entraria" && (
              <div className="viz-var">
                <span className="viz-var-name">achou (anotado)</span>
                <span className="viz-var-val best">{p.anotado}</span>
              </div>
            )}
            <div className="viz-var">
              <span className="viz-var-name">alvo</span>
              <span className="viz-var-val">{preset.alvo}</span>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>ocorrências de {preset.alvo}</span>
            <strong>{nums.filter((v) => v === preset.alvo).length}</strong>
          </div>
          <div className="bigo-stat">
            <span>comparações</span>
            <strong>{p.comparacoes}</strong>
          </div>
          <div className="bigo-stat">
            <span>{LADO[modo]}</span>
            <strong>{resposta === null ? "-" : resposta}</strong>
          </div>
          <div className="bigo-stat">
            <span>retorno do Java se falhar</span>
            <strong>{p.fim && modo === "entraria" ? -p.esq - 1 : "-"}</strong>
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
          Fique no preset do bloco de três e alterne entre os dois primeiros modos: o código é o mesmo, muda
          uma linha, e a resposta vai de 1 para 3. Rodando os dois você tem o intervalo inteiro de ocorrências
          em 2 × O(log n), sem varrer os vizinhos um a um, que é a solução ingênua que estraga a complexidade
          quando o bloco de repetidos é grande.
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
