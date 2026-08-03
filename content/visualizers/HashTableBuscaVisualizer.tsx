"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// HashTableBuscaVisualizer, a corrida entre busca linear e busca por hash.
//
// Duas abordagens lado a lado, sincronizadas pelo mesmo contador de passos:
// quem termina primeiro fica parado enquanto a outra continua. É essa imagem
// (o contador da esquerda subindo sozinho) que ensina a diferença entre O(n) e
// O(1) melhor do que qualquer parágrafo.
//
// O botão "hash ruim" troca a função por uma que devolve 0 para qualquer chave,
// que é exatamente o acidente do encontro (sobrescrever o hash code sem
// pensar). Aí os dois contadores empatam e o O(n) do pior caso aparece.
//
// Capacidade fixa em 11 de propósito: número primo, como a técnica que apareceu
// no encontro para espalhar melhor os restos.
// ---------------------------------------------------------------------------

type No = { chave: string; soma: number };

type PassoLista = {
  pos: number;
  comparacoes: number;
  achou: boolean;
  fim: boolean;
  nota: string;
};

type PassoHash = {
  indice: number | null;
  pos: number | null;
  comparacoes: number;
  achou: boolean;
  fim: boolean;
  nota: string;
};

const CAP = 11;
const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

function somaAscii(s: string): number {
  let t = 0;
  for (const c of s) t += c.codePointAt(0) ?? 0;
  return t;
}

function detalheAscii(s: string): string {
  const partes: string[] = [];
  for (const c of s) partes.push(String(c.codePointAt(0) ?? 0));
  return partes.join(" + ");
}

// Formatação determinística de milhar (nada de Intl no render).
function milhar(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function plural(v: number, um: string, muitos: string): string {
  return `${v} ${v === 1 ? um : muitos}`;
}

function construir(nomes: string[], ruim: boolean): No[][] {
  const buckets: No[][] = Array.from({ length: CAP }, () => [] as No[]);
  for (const nome of nomes) {
    const soma = somaAscii(nome);
    buckets[ruim ? 0 : soma % CAP].push({ chave: nome, soma });
  }
  return buckets;
}

function gerarLista(nomes: string[], alvo: string): PassoLista[] {
  const out: PassoLista[] = [];
  out.push({
    pos: -1,
    comparacoes: 0,
    achou: false,
    fim: false,
    nota: `${plural(nomes.length, "nome guardado", "nomes guardados")} e nenhuma ordem que me ajude: não dá para cortar nada. Vou comparar "${alvo}" com a posição 0, depois a 1, e assim por diante.`,
  });
  for (let j = 0; j < nomes.length; j++) {
    const igual = nomes[j] === alvo;
    out.push({
      pos: j,
      comparacoes: j + 1,
      achou: igual,
      fim: igual,
      nota: igual
        ? `Posição ${j}: "${nomes[j]}" é o alvo. Achei, depois de ${plural(j + 1, "comparação", "comparações")}.`
        : `Posição ${j}: "${nomes[j]}" não é "${alvo}". Passo para a próxima.`,
    });
    if (igual) return out;
  }
  out.push({
    pos: nomes.length,
    comparacoes: nomes.length,
    achou: false,
    fim: true,
    nota: `Cheguei ao fim da lista: "${alvo}" não está aqui. Só que precisei de ${plural(nomes.length, "comparação", "comparações")} para ter certeza disso.`,
  });
  return out;
}

function gerarHash(buckets: No[][], alvo: string, ruim: boolean): PassoHash[] {
  const out: PassoHash[] = [];
  const soma = somaAscii(alvo);
  out.push({
    indice: null,
    pos: null,
    comparacoes: 0,
    achou: false,
    fim: false,
    nota: ruim
      ? `A função ruim ignora a chave e devolve 0 para tudo, inclusive para "${alvo}".`
      : `Somo os códigos ASCII de "${alvo}": ${detalheAscii(alvo)} = ${soma}.`,
  });
  const i = ruim ? 0 : soma % CAP;
  out.push({
    indice: i,
    pos: null,
    comparacoes: 0,
    achou: false,
    fim: false,
    nota: ruim
      ? `Endereço 0, igual a todas as outras chaves: ${plural(buckets[0].length, "chave está amontoada", "chaves estão amontoadas")} no bucket 0 e os outros ${CAP - 1} estão vazios.`
      : `${soma} % ${CAP} = ${i}. Salto direto para o bucket ${i} e nem olho os outros ${CAP - 1}.`,
  });
  const corrente = buckets[i];
  if (corrente.length === 0) {
    out.push({
      indice: i,
      pos: null,
      comparacoes: 0,
      achou: false,
      fim: true,
      nota: `O bucket ${i} está vazio. Sem comparar nenhuma chave, eu já sei que "${alvo}" não está na tabela.`,
    });
    return out;
  }
  for (let k = 0; k < corrente.length; k++) {
    const igual = corrente[k].chave === alvo;
    out.push({
      indice: i,
      pos: k,
      comparacoes: k + 1,
      achou: igual,
      fim: igual,
      nota: igual
        ? `"${corrente[k].chave}" bate com o alvo. ${plural(k + 1, "comparação", "comparações")} e acabou.`
        : `"${corrente[k].chave}" caiu no mesmo bucket, mas não é "${alvo}". Ando um nó na corrente.`,
    });
    if (igual) return out;
  }
  out.push({
    indice: i,
    pos: null,
    comparacoes: corrente.length,
    achou: false,
    fim: true,
    nota: `A corrente do bucket ${i} acabou e "${alvo}" não estava nela. Não está na tabela.`,
  });
  return out;
}

const NOMES_PADRAO = "Ana, Bob, Lia, Leo, Eva, Kim, Ben, Mia";
const POOL = ["Ana", "Bob", "Lia", "Leo", "Eva", "Kim", "Ben", "Mia", "Rui", "Zoe", "Ivo", "Gil", "Tom", "Nina"];

type Preset = { rotulo: string; nomes: string; alvo: string; ruim: boolean };

const PRESETS: Preset[] = [
  { rotulo: "Alvo no fim da lista", nomes: NOMES_PADRAO, alvo: "Mia", ruim: false },
  { rotulo: "Alvo na primeira posição", nomes: NOMES_PADRAO, alvo: "Ana", ruim: false },
  { rotulo: "Chave que não existe", nomes: NOMES_PADRAO, alvo: "Zoe", ruim: false },
  { rotulo: "Com hash ruim", nomes: NOMES_PADRAO, alvo: "Mia", ruim: true },
];

function lerNomes(texto: string): string[] {
  return texto
    .split(",")
    .map((x) => x.trim().slice(0, 12))
    .filter((x) => x.length > 0)
    .slice(0, 10);
}

export function HashTableBuscaVisualizer() {
  const [entrada, setEntrada] = useState(NOMES_PADRAO);
  const [alvo, setAlvo] = useState("Mia");
  const [ruim, setRuim] = useState(false);
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const nomes = useMemo(() => {
    const lidos = lerNomes(entrada);
    return lidos.length ? lidos : ["Ana"];
  }, [entrada]);
  const alvoLimpo = alvo.trim().slice(0, 12) || nomes[nomes.length - 1];
  const buckets = useMemo(() => construir(nomes, ruim), [nomes, ruim]);
  const passosLista = useMemo(() => gerarLista(nomes, alvoLimpo), [nomes, alvoLimpo]);
  const passosHash = useMemo(() => gerarHash(buckets, alvoLimpo, ruim), [buckets, alvoLimpo, ruim]);

  const total = Math.max(passosLista.length, passosHash.length);
  const idx = Math.min(passo, total - 1);
  const pl = passosLista[Math.min(idx, passosLista.length - 1)];
  const ph = passosHash[Math.min(idx, passosHash.length - 1)];

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

  const reiniciar = useCallback(() => {
    parar();
    setTocando(false);
    setPasso(0);
  }, [parar]);

  const aplicar = (pr: Preset) => {
    reiniciar();
    setEntrada(pr.nomes);
    setAlvo(pr.alvo);
    setRuim(pr.ruim);
  };

  // Math.random só aqui, num handler de clique. No caminho de render ele
  // quebraria a hidratação (o HTML do build divergiria do cliente).
  const sortear = () => {
    const restantes = [...POOL];
    const escolhidas: string[] = [];
    const quantas = 6 + Math.floor(Math.random() * 3);
    for (let k = 0; k < quantas && restantes.length; k++) {
      escolhidas.push(restantes.splice(Math.floor(Math.random() * restantes.length), 1)[0]);
    }
    reiniciar();
    setEntrada(escolhidas.join(", "));
    setAlvo(escolhidas[escolhidas.length - 1]);
  };

  const corrente = ph.indice == null ? [] : buckets[ph.indice];
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  const resumo = ruim
    ? `Com todas as chaves no mesmo bucket, a tabela hash faz ${plural(ph.comparacoes, "comparação", "comparações")}, o mesmo trabalho da lista. Esse é o O(n) do pior caso, e ele não vem de azar: vem de uma função de hash que não distribui.`
    : `A lista gastou ${plural(pl.comparacoes, "comparação", "comparações")} e a tabela hash gastou ${plural(ph.comparacoes, "comparação", "comparações")}. O que importa não é a diferença aqui, é o que acontece quando a entrada cresce: a lista acompanha n, a tabela hash não se mexe.`;

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · busca linear x busca por hash</span>
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
        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Nomes guardados</span>
            <input
              className="viz-input"
              value={entrada}
              onChange={(e) => {
                reiniciar();
                setEntrada(e.target.value);
              }}
            />
          </label>
          <label className="viz-field">
            <span>Procurar por</span>
            <input
              className="viz-input ht-sel"
              value={alvo}
              onChange={(e) => {
                reiniciar();
                setAlvo(e.target.value);
              }}
            />
          </label>
          <button className="viz-btn" onClick={sortear}>
            Sortear
          </button>
        </div>

        <div className="bigo-chips">
          <button
            className={`bigo-chip${!ruim ? " on" : ""}`}
            aria-pressed={!ruim}
            onClick={() => {
              reiniciar();
              setRuim(false);
            }}
          >
            <span className="sw" style={{ background: !ruim ? "#34d399" : "#3a4a60" }} />
            Hash que distribui
          </button>
          <button
            className={`bigo-chip${ruim ? " on" : ""}`}
            aria-pressed={ruim}
            onClick={() => {
              reiniciar();
              setRuim(true);
            }}
          >
            <span className="sw" style={{ background: ruim ? "#f87171" : "#3a4a60" }} />
            Hash ruim (devolve 0 sempre)
          </button>
        </div>

        <div className="ht-presets">
          <span>Cenários</span>
          {PRESETS.map((pr) => (
            <button className="viz-btn" key={pr.rotulo} onClick={() => aplicar(pr)}>
              {pr.rotulo}
            </button>
          ))}
        </div>

        <div className="ht-painel">
          <div className="ht-painel-tit">
            <span>1. Busca linear na lista</span>
            <em>{plural(pl.comparacoes, "comparação", "comparações")}</em>
          </div>
          <div className="ht-lista">
            {nomes.map((nome, j) => {
              let cls = "ht-nome";
              if (pl.pos === j) cls += pl.achou ? " achou" : " on";
              else if (j < pl.pos) cls += " passou";
              return (
                <span className={cls} key={`${nome}-${j}`}>
                  <span className="ord">{j}</span>
                  {nome}
                </span>
              );
            })}
          </div>
          <p className={`viz-note${pl.achou ? " ok" : pl.fim ? " invalid" : ""}`}>{pl.nota}</p>
        </div>

        <div className="ht-painel">
          <div className="ht-painel-tit">
            <span>2. Busca na tabela hash ({CAP} buckets)</span>
            <em>{plural(ph.comparacoes, "comparação", "comparações")}</em>
          </div>
          <div className="ht-strip">
            {buckets.map((b, i) => (
              <div
                key={i}
                className={`ht-bucket${b.length ? " cheio" : ""}${ph.indice === i ? " alvo" : ""}`}
              >
                {i}
                <b>{b.length}</b>
              </div>
            ))}
          </div>
          <div className="ht-row">
            <span className="ht-idx">{ph.indice == null ? "?" : ph.indice}</span>
            <div className={`ht-slot${ph.indice == null ? "" : " alvo"}`}>
              {ph.indice == null ? (
                <span className="ht-vazio">ainda calculando o hash</span>
              ) : corrente.length === 0 ? (
                <span className="ht-vazio">vazio</span>
              ) : (
                corrente.map((no, k) => {
                  let ncls = "ht-no";
                  if (ph.pos === k) ncls += ph.achou ? " achou" : " compara";
                  return (
                    <Fragment key={`${no.chave}-${k}`}>
                      {k > 0 ? <span className="ht-seta">→</span> : null}
                      <span className={ncls}>{no.chave}</span>
                    </Fragment>
                  );
                })
              )}
            </div>
          </div>
          <p className={`viz-note${ph.achou ? " ok" : ph.fim ? " invalid" : ""}`}>{ph.nota}</p>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>comparações · lista</span>
            <strong>{pl.comparacoes}</strong>
          </div>
          <div className="bigo-stat">
            <span>comparações · hash</span>
            <strong>{ph.comparacoes}</strong>
          </div>
          <div className="bigo-stat">
            <span>pior caso · lista com 1 milhão</span>
            <strong>{milhar(1000000)}</strong>
          </div>
          <div className="bigo-stat">
            <span>pior caso · hash com 1 milhão</span>
            <strong>{ruim ? milhar(1000000) : "1"}</strong>
          </div>
        </div>

        <p className="viz-note">{resumo}</p>

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
          <div className="viz-progress-fill" style={{ width: `${pctPasso}%` }} />
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
