"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// BacktrackingVisualizer, a árvore que não existe.
//
// A única coisa que o aluno precisa enxergar é que o backtracking tem TRÊS
// movimentos e que o terceiro é o que dá nome a ele: escolher, explorar e
// DESFAZER. Quase todo material desenha a árvore de decisão e para por aí, o
// que deixa a impressão de que existe uma árvore sendo construída na memória.
// Não existe. O que existe é uma lista sendo mexida e uma pilha de chamadas, e
// a árvore é só o desenho do caminho que o algoritmo percorreu.
//
// Por isso a tela mostra as três coisas ao mesmo tempo e no mesmo passo: a
// árvore (o mapa), a solução parcial (a única lista que existe de verdade) e a
// pilha de chamadas. No passo de retrocesso a árvore não muda, a lista encolhe
// e a pilha desempilha, e é essa dessincronia que ensina quem é quem.
//
// A geometria vem da árvore COMPLETA, calculada antes de qualquer passo, e não
// do que já foi explorado. Com o envelope fixo, os nós aparecem no lugar em que
// vão ficar, e dá para seguir um ramo específico do começo ao fim. Se o layout
// acompanhasse a exploração, tudo se moveria a cada passo e o aluno leria
// movimento onde só houve descoberta.
// ---------------------------------------------------------------------------

type Acao = "inicio" | "escolher" | "registrar" | "descer" | "retroceder" | "fim";

type No = { id: string; rotulo: string; prof: number; filhos: No[]; x: number; y: number };

type Passo = {
  noAtual: string;
  visitados: string[];
  registrados: string[];
  parcial: number[];
  pilha: string[];
  solucoes: number[][];
  acao: Acao;
  nos: number;
  retrocessos: number;
  linha: number;
  nota: string;
  ok?: boolean;
};

const CODIGO = [
  "def backtrack(parcial, opcoes):",
  "    if completo(parcial):",
  "        solucoes.append(parcial[:])   # cópia, e isso importa",
  "        return",
  "    for opcao in opcoes:",
  "        if valido(opcao, parcial):",
  "            parcial.append(opcao)     # 1. escolher",
  "            backtrack(parcial, ...)   # 2. explorar",
  "            parcial.pop()             # 3. desfazer",
];

type Modo = "subconjuntos" | "permutacoes" | "combinacoes";

const NOMES: Record<Modo, string> = {
  subconjuntos: "Subconjuntos de 1, 2, 3",
  permutacoes: "Permutações de 1, 2, 3",
  combinacoes: "Combinações de 2 entre 1, 2, 3, 4",
};

const DICAS: Record<Modo, string> = {
  subconjuntos:
    "Todo nó da árvore é uma resposta, inclusive a raiz (o conjunto vazio). Repare que o algoritmo registra a solução na ENTRADA de cada chamada, antes de olhar as opções, e por isso são 2^3 = 8 respostas para 8 nós.",
  permutacoes:
    "Aqui só as folhas são resposta: uma permutação precisa usar todos os elementos. A árvore tem 16 nós e devolve 3! = 6 soluções, ou seja, mais da metade do trabalho é caminho, não resultado.",
  combinacoes:
    "Combinação fixa o tamanho: dois elementos entre quatro, sem repetir e sem ligar para a ordem. Só os nós de profundidade 2 são resposta, e a regra de nunca voltar para trás no array é o que impede 1,2 e 2,1 de aparecerem os dois.",
};

const MODOS: Modo[] = ["subconjuntos", "permutacoes", "combinacoes"];

const VELOCIDADES = [0, 1200, 800, 520, 320, 180];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

const rotuloDe = (v: number[]) => (v.length === 0 ? "∅" : v.join(" "));

// Gera a árvore inteira e a lista de passos numa passada só. A árvore é o mapa
// do percurso, e os passos são o percurso: os dois saem do mesmo laço, então
// não têm como divergir.
export function gerar(modo: Modo): { raiz: No; passos: Passo[]; folhas: number } {
  const valores = modo === "combinacoes" ? [1, 2, 3, 4] : [1, 2, 3];
  const k = 2; // tamanho fixo das combinações
  const passos: Passo[] = [];
  const parcial: number[] = [];
  const solucoes: number[][] = [];
  const visitados: string[] = [];
  const registrados: string[] = [];
  const pilha: string[] = [];
  let contaNos = 0;
  let retrocessos = 0;

  const raiz: No = { id: "r", rotulo: "∅", prof: 0, filhos: [], x: 0, y: 0 };

  const base = (noAtual: string, acao: Acao, linha: number, nota: string, ok?: boolean): Passo => ({
    noAtual,
    visitados: [...visitados],
    registrados: [...registrados],
    parcial: [...parcial],
    pilha: [...pilha],
    solucoes: solucoes.map((s) => [...s]),
    acao,
    nos: contaNos,
    retrocessos,
    linha,
    nota,
    ok,
  });

  const completo = () =>
    modo === "subconjuntos" ? true : modo === "permutacoes" ? parcial.length === valores.length : parcial.length === k;

  const explorar = (no: No, inicio: number, usados: boolean[]) => {
    contaNos++;
    visitados.push(no.id);
    pilha.push(rotuloDe(parcial));
    passos.push(
      base(
        no.id,
        "descer",
        0,
        `Entrei na chamada com a solução parcial [${rotuloDe(parcial)}]. A pilha tem ${pilha.length} chamada${pilha.length === 1 ? "" : "s"} agora.`
      )
    );

    if (completo()) {
      solucoes.push([...parcial]);
      registrados.push(no.id);
      passos.push(
        base(
          no.id,
          "registrar",
          2,
          `[${rotuloDe(parcial)}] é uma solução completa, então guardo. Repare no [:] do código: eu guardo uma CÓPIA. A lista parcial é uma só e vai continuar mudando; sem a cópia, todas as ${solucoes.length} respostas apontariam para ela e terminariam vazias.`,
          true
        )
      );
      if (modo !== "subconjuntos") {
        pilha.pop();
        return;
      }
    }

    for (let i = modo === "permutacoes" ? 0 : inicio; i < valores.length; i++) {
      if (modo === "permutacoes" && usados[i]) continue;
      const v = valores[i];
      if (modo === "combinacoes" && parcial.length + (valores.length - i) < k) break;

      parcial.push(v);
      if (modo === "permutacoes") usados[i] = true;
      const filho: No = { id: `${no.id}-${v}`, rotulo: rotuloDe(parcial), prof: no.prof + 1, filhos: [], x: 0, y: 0 };
      no.filhos.push(filho);
      passos.push(
        base(
          filho.id,
          "escolher",
          6,
          `Escolho ${v} e ponho na solução parcial: [${rotuloDe(parcial)}]. ${
            modo === "subconjuntos"
              ? `Como só olho do índice ${i + 1} em diante daqui para frente, nunca vou montar um subconjunto fora da ordem original.`
              : modo === "permutacoes"
                ? `Marco ${v} como usado: numa permutação cada elemento entra uma vez só, mas em qualquer posição.`
                : `Daqui em diante só olho do índice ${i + 1} para a frente, que é o que impede 1,2 e 2,1 de contarem como combinações diferentes.`
          }`
        )
      );

      explorar(filho, i + 1, usados);

      const removido = parcial.pop();
      if (modo === "permutacoes") usados[i] = false;
      retrocessos++;
      passos.push(
        base(
          filho.id,
          "retroceder",
          8,
          `Retrocesso: tiro ${removido} da solução parcial, que volta a ser [${rotuloDe(parcial)}]. Repare que a árvore não perdeu nada, porque ela é só o desenho do caminho. Quem encolheu foi a lista, que é a única coisa que existe de verdade na memória.`
        )
      );
    }

    if (!(completo() && modo !== "subconjuntos")) pilha.pop();
  };

  passos.push(
    base(
      "r",
      "inicio",
      0,
      `${NOMES[modo]}. A solução parcial começa vazia e o algoritmo vai fazer sempre a mesma coisa: escolher uma opção, explorar tudo que sai dela, e desfazer a escolha para poder tentar a próxima.`
    )
  );
  explorar(raiz, 0, new Array(valores.length).fill(false));
  passos.push(
    base(
      "r",
      "fim",
      0,
      `Acabou: ${solucoes.length} soluções, ${contaNos} nós visitados e ${retrocessos} retrocessos. A solução parcial voltou a ficar vazia, exatamente como começou, porque todo escolher teve o seu desfazer.`,
      true
    )
  );

  // Layout: x por posição de folha, y por profundidade. Calculado sobre a
  // árvore COMPLETA, para o desenho não se mexer durante a animação.
  let slot = 0;
  const posicionar = (n: No): number => {
    if (n.filhos.length === 0) {
      n.x = slot++;
      return n.x;
    }
    const xs = n.filhos.map(posicionar);
    n.x = (xs[0] + xs[xs.length - 1]) / 2;
    return n.x;
  };
  posicionar(raiz);
  const marcarY = (n: No) => {
    n.y = n.prof;
    n.filhos.forEach(marcarY);
  };
  marcarY(raiz);

  return { raiz, passos, folhas: slot };
}

function achatar(n: No, saida: No[] = []): No[] {
  saida.push(n);
  n.filhos.forEach((f) => achatar(f, saida));
  return saida;
}

const NO_R = 17;

export function BacktrackingVisualizer() {
  const [modo, setModo] = useState<Modo>("subconjuntos");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(4);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const { raiz, passos, folhas } = useMemo(() => gerar(modo), [modo]);
  const nos = useMemo(() => achatar(raiz), [raiz]);
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
  const trocarModo = (m: Modo) => {
    reiniciar();
    setModo(m);
  };

  const profMax = Math.max(...nos.map((n) => n.prof));
  const passoX = 74;
  const largura = Math.max(320, folhas * passoX);
  const W = largura + NO_R * 2;
  const H = 40 + profMax * 62 + NO_R * 2;
  const cx = (n: No) => NO_R + ((n.x + 0.5) * largura) / folhas;
  const cy = (n: No) => 22 + NO_R + n.y * 62;

  const vistos = new Set(p.visitados);
  const registrados = new Set(p.registrados);
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · backtracking: escolher, explorar, desfazer</span>
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
          {MODOS.map((m) => (
            <button key={m} className={`bigo-chip${modo === m ? " on" : ""}`} onClick={() => trocarModo(m)} aria-pressed={modo === m}>
              {NOMES[m]}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">{DICAS[modo]}</p>

        <div className={`hs-fase ${p.acao === "retroceder" ? "f-ordenar" : p.acao === "registrar" ? "f-fim" : ""}`}>
          <span className="hs-fase-selo">
            {p.acao === "escolher"
              ? "1 · escolher"
              : p.acao === "descer"
                ? "2 · explorar"
                : p.acao === "retroceder"
                  ? "3 · desfazer"
                  : p.acao === "registrar"
                    ? "solução completa"
                    : "início"}
          </span>
          <span className="hs-fase-txt">
            solução parcial: [{rotuloDe(p.parcial)}] · soluções guardadas: {p.solucoes.length}
          </span>
        </div>

        <div className="tt-arv-wrap">
          <svg
            className="tt-arv"
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`Árvore de decisão do backtracking. ${p.nota}`}
          >
            {nos.map((n) =>
              n.filhos.map((f) => (
                <line
                  key={`${n.id}->${f.id}`}
                  className={`tt-aresta${vistos.has(f.id) ? " ativa" : ""}`}
                  x1={cx(n)}
                  y1={cy(n) + NO_R}
                  x2={cx(f)}
                  y2={cy(f) - NO_R}
                  opacity={vistos.has(f.id) ? 1 : 0.18}
                />
              ))
            )}
            {nos.map((n) => {
              const cls = ["tt-no", "bt-no"];
              if (n.id === p.noAtual) cls.push("on");
              else if (registrados.has(n.id)) cls.push("filho");
              else if (!vistos.has(n.id)) cls.push("porvir");
              return (
                <g key={n.id} className={cls.join(" ")}>
                  <circle cx={cx(n)} cy={cy(n)} r={NO_R} />
                  <text x={cx(n)} y={cy(n) + 4} textAnchor="middle">
                    {n.rotulo}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="bt-paineis">
          <div className="hp-bloco">
            <div className="tt-painel-tit">
              A solução parcial <em>a única lista que existe na memória</em>
            </div>
            <div className="hp-arr">
              {p.parcial.length === 0 ? (
                <span className="bb-array-nota">vazia</span>
              ) : (
                p.parcial.map((v, k) => (
                  <span key={k} className={`hp-cel${p.acao === "escolher" && k === p.parcial.length - 1 ? " foco troca" : " fixo"}`}>
                    <i>{k}</i>
                    {v}
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="hp-bloco">
            <div className="tt-painel-tit">
              A pilha de chamadas <em>o que a recursão guarda de verdade</em>
            </div>
            <div className="bt-pilha">
              {p.pilha.length === 0 ? (
                <span className="bb-array-nota">vazia</span>
              ) : (
                [...p.pilha].reverse().map((t, k) => (
                  <span key={k} className={`bt-quadro${k === 0 ? " topo" : ""}`}>
                    backtrack([{t}])
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            As soluções guardadas <em>cada uma é uma cópia, tirada no instante em que foi encontrada</em>
          </div>
          <div className="bt-solucoes">
            {p.solucoes.length === 0 ? (
              <span className="bb-array-nota">nenhuma ainda</span>
            ) : (
              p.solucoes.map((s, k) => (
                <span key={k} className={`bt-sol${k === p.solucoes.length - 1 && p.acao === "registrar" ? " nova" : ""}`}>
                  [{rotuloDe(s)}]
                </span>
              ))
            )}
          </div>
        </div>

        <p className={"viz-note" + (p.ok ? " ok" : "")}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">backtrack.py</div>
            <div className="viz-code-body">
              {CODIGO.map((txt, k) => (
                <div key={k} className={`viz-line${k === p.linha ? " on" : ""}`}>
                  <span className="ln">{k + 1}</span>
                  {txt}
                </div>
              ))}
            </div>
          </div>
          <div className="viz-vars">
            <div className="viz-vars-head">Variáveis</div>
            <div className="viz-var">
              <span className="viz-var-name">parcial</span>
              <span className="viz-var-val best">[{rotuloDe(p.parcial)}]</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">profundidade da pilha</span>
              <span className="viz-var-val">{p.pilha.length}</span>
            </div>
            <div className="viz-var">
              <span className="viz-var-name">soluções guardadas</span>
              <span className="viz-var-val">{p.solucoes.length}</span>
            </div>
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>nós visitados</span>
            <strong>{p.nos}</strong>
          </div>
          <div className="bigo-stat">
            <span>soluções encontradas</span>
            <strong>{p.solucoes.length}</strong>
          </div>
          <div className="bigo-stat">
            <span>retrocessos</span>
            <strong>{p.retrocessos}</strong>
          </div>
          <div className="bigo-stat">
            <span>nós da árvore inteira</span>
            <strong>{nos.length}</strong>
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
          Rode os três até o fim e compare nós visitados com soluções encontradas: 8 e 8 nos subconjuntos, 16
          e 6 nas permutações, 10 e 6 nas combinações. Nas permutações, dez dos dezesseis nós são caminho e
          não resposta, e é esse desperdício que faz o custo do backtracking ser exponencial. O número de
          retrocessos é sempre igual ao de arestas da árvore: todo escolher tem exatamente um desfazer.
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
