"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// HashTableVisualizer, a inserção de chaves numa tabela hash.
//
// Mesmo padrão do TwoPointersVisualizer: gerador PURO de passos + a casca
// compartilhada (nota, código sincronizado, variáveis, controles, Expandir).
// O que muda é o palco: em vez de uma fita de células, uma coluna de buckets,
// porque o que o aluno precisa ver é o endereço saindo da chave e a colisão
// acontecendo dentro de um bucket específico.
//
// A função de hash é a ingênua do encontro (soma dos códigos ASCII, depois o
// resto pelo tamanho da tabela). Ela é ruim de propósito: é justamente por ser
// ruim que ela produz colisões com nomes de três letras e deixa o conceito
// visível. As estratégias de resolução são as duas do encontro: encadeamento
// (uma corrente por bucket) e sondagem linear (procura o vizinho livre).
// ---------------------------------------------------------------------------

type No = { chave: string; soma: number };

type Passo = {
  linha: number;
  cap: number;
  n: number;
  slots: No[][];
  chave: string | null;
  soma: number | null;
  indice: number | null;
  alvo: number | null;
  sonda: number | null;
  comparando: number | null;
  inserido: string | null;
  colisoes: number;
  comparacoes: number;
  rehash: boolean;
  fim: boolean;
  ok: boolean;
  nota: string;
};

// As linhas mapeiam 1:1 com o campo `linha` de cada passo, então a ordem e a
// quantidade de linhas não podem mudar sem ajustar o gerador junto.
const CODIGO_ENCADEAMENTO = [
  "def _hash(self, chave):",
  "    soma = sum(ord(c) for c in chave)",
  "    return soma % len(self.buckets)",
  "",
  "def put(self, chave, valor):",
  "    if (self.n + 1) / len(self.buckets) > 0.75:",
  "        self._rehash()   # dobra e refaz tudo",
  "    i = self._hash(chave)",
  "    for no in self.buckets[i]:",
  "        if no.chave == chave:",
  "            no.valor = valor",
  "            return",
  "    self.buckets[i].append(No(chave, valor))",
  "    self.n += 1",
];

const CODIGO_SONDAGEM = [
  "def _hash(self, chave):",
  "    soma = sum(ord(c) for c in chave)",
  "    return soma % len(self.slots)",
  "",
  "def put(self, chave, valor):",
  "    if (self.n + 1) / len(self.slots) > 0.75:",
  "        self._rehash()   # dobra e refaz tudo",
  "    i = self._hash(chave)",
  "    while self.slots[i] is not None:",
  "        if self.slots[i].chave == chave:",
  "            self.slots[i].valor = valor",
  "            return",
  "        i = (i + 1) % len(self.slots)",
  "    self.slots[i] = Item(chave, valor)",
  "    self.n += 1",
];

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

const LIMITE_CARGA = 0.75;
const CAP_MAXIMA = 32;

// Formatação determinística: nada de Intl no caminho de render, senão o HTML
// do build diverge do cliente na hidratação.
function dec(v: number): string {
  return (Math.round(v * 100) / 100).toFixed(2).replace(".", ",");
}

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

function clonar(slots: No[][]): No[][] {
  return slots.map((b) => b.slice());
}

function plural(v: number, um: string, muitos: string): string {
  return `${v} ${v === 1 ? um : muitos}`;
}

function gerarPassos(chaves: string[], capInicial: number, encadeado: boolean, redimensiona: boolean): Passo[] {
  const out: Passo[] = [];
  let cap = Math.max(1, capInicial);
  let slots: No[][] = Array.from({ length: cap }, () => [] as No[]);
  let n = 0;
  let colisoes = 0;
  let comparacoes = 0;

  const base = () => ({
    cap,
    n,
    slots: clonar(slots),
    chave: null as string | null,
    soma: null as number | null,
    indice: null as number | null,
    alvo: null as number | null,
    sonda: null as number | null,
    comparando: null as number | null,
    inserido: null as string | null,
    colisoes,
    comparacoes,
    rehash: false,
    fim: false,
    ok: false,
  });

  out.push({
    ...base(),
    linha: 4,
    nota: `Tabela vazia com ${plural(cap, "bucket", "buckets")}. Vou inserir ${plural(chaves.length, "chave", "chaves")}, uma de cada vez, e o endereço de cada uma sai da própria chave.`,
  });

  let guarda = 0;
  for (const chave of chaves) {
    if (guarda++ > 40) break;
    const soma = somaAscii(chave);

    // Fator de carga: o redimensionamento acontece ANTES de inserir, para a
    // tabela nunca chegar de fato aos 75% de ocupação.
    if (redimensiona && cap < CAP_MAXIMA && (n + 1) / cap > LIMITE_CARGA) {
      out.push({
        ...base(),
        linha: 5,
        chave,
        soma,
        nota: `Com "${chave}" seriam ${n + 1} chaves em ${cap} buckets: fator de carga ${dec((n + 1) / cap)}, acima de 0,75. Redimensiono antes de inserir.`,
      });
      const antigos: No[] = [];
      for (const b of slots) for (const no of b) antigos.push(no);
      const capAntiga = cap;
      cap = cap * 2;
      slots = Array.from({ length: cap }, () => [] as No[]);
      out.push({
        ...base(),
        linha: 6,
        chave,
        soma,
        rehash: true,
        nota: `Dobro a capacidade de ${capAntiga} para ${cap}. O divisor do módulo mudou, então nenhum endereço antigo vale: preciso refazer o hash das ${plural(antigos.length, "chave que já estava dentro", "chaves que já estavam dentro")}.`,
      });
      for (const no of antigos) {
        const j = no.soma % cap;
        const antes = no.soma % capAntiga;
        slots[j].push(no);
        out.push({
          ...base(),
          linha: 6,
          chave: no.chave,
          soma: no.soma,
          indice: j,
          alvo: j,
          inserido: no.chave,
          rehash: true,
          nota: `Rehash de "${no.chave}": ${no.soma} % ${cap} = ${j}. Com ${capAntiga} buckets ela morava no ${antes}${j === antes ? ", e por sorte não saiu do lugar." : "."}`,
        });
      }
    }

    out.push({
      ...base(),
      linha: 1,
      chave,
      soma,
      nota: `Somo os códigos ASCII de "${chave}": ${detalheAscii(chave)} = ${soma}.`,
    });

    const i = soma % cap;
    out.push({
      ...base(),
      linha: 2,
      chave,
      soma,
      indice: i,
      alvo: i,
      nota: `${soma} % ${cap} = ${i}. O endereço de "${chave}" é o bucket ${i}, e eu cheguei nele sem olhar nenhum outro.`,
    });

    if (encadeado) {
      const antes = slots[i].length;
      let jaExiste = false;
      for (let k = 0; k < antes; k++) {
        comparacoes++;
        const outro = slots[i][k];
        const igual = outro.chave === chave;
        // Colisão é bater numa chave DIFERENTE no endereço calculado. Reinserir
        // a mesma chave é atualização, e contar isso como colisão mentiria para
        // quem está lendo o contador (tente "Ana, Ana": colisões continua 0).
        if (k === 0 && !igual) colisoes++;
        out.push({
          ...base(),
          linha: 9,
          chave,
          soma,
          indice: i,
          alvo: i,
          comparando: k,
          nota: igual
            ? `O bucket ${i} já guarda "${chave}". Mesma chave, mesmo hash: só troco o valor, a tabela não cresce.`
            : `Colisão: o bucket ${i} já tem "${outro.chave}". O hash bateu, a chave não. Comparo, descarto e sigo na corrente.`,
        });
        if (igual) {
          jaExiste = true;
          break;
        }
      }
      if (jaExiste) continue;
      slots[i].push({ chave, soma });
      n++;
      out.push({
        ...base(),
        linha: 12,
        chave,
        soma,
        indice: i,
        alvo: i,
        inserido: chave,
        nota:
          antes > 0
            ? `"${chave}" entra no fim da corrente do bucket ${i}, que agora tem ${plural(antes + 1, "nó", "nós")}.`
            : `Bucket ${i} livre: "${chave}" entra como primeiro nó da corrente.`,
      });
    } else {
      let j = i;
      let sondas = 0;
      let jaExiste = false;
      let cheia = false;
      while (slots[j].length > 0) {
        comparacoes++;
        if (slots[j][0].chave === chave) {
          out.push({
            ...base(),
            linha: 9,
            chave,
            soma,
            indice: i,
            alvo: i,
            sonda: j,
            comparando: 0,
            nota: `O índice ${j} já guarda "${chave}". Mesma chave: só troco o valor, a tabela não cresce.`,
          });
          jaExiste = true;
          break;
        }
        if (sondas === 0) colisoes++;
        const prox = (j + 1) % cap;
        out.push({
          ...base(),
          linha: 12,
          chave,
          soma,
          indice: i,
          alvo: i,
          sonda: j,
          comparando: 0,
          nota: `Índice ${j} ocupado por "${slots[j][0].chave}", que não é "${chave}". Sondagem linear: tento o vizinho, (${j} + 1) % ${cap} = ${prox}.`,
        });
        j = prox;
        sondas++;
        if (sondas >= cap) {
          cheia = true;
          break;
        }
      }
      if (jaExiste) continue;
      if (cheia) {
        out.push({
          ...base(),
          linha: 8,
          chave,
          soma,
          indice: i,
          alvo: i,
          fim: true,
          nota: `Dei a volta inteira e não achei índice livre: a tabela lotou. Sem redimensionamento, a sondagem linear simplesmente não tem para onde ir.`,
        });
        return out;
      }
      slots[j].push({ chave, soma });
      n++;
      out.push({
        ...base(),
        linha: 13,
        chave,
        soma,
        indice: i,
        alvo: i,
        sonda: j === i ? null : j,
        inserido: chave,
        nota:
          j === i
            ? `Índice ${i} livre: "${chave}" entra direto, sem sondagem nenhuma.`
            : `Índice ${j} livre: "${chave}" mora aqui, ${plural(sondas, "casa", "casas")} depois do endereço que o hash mandou (${i}).`,
      });
    }
  }

  out.push({
    ...base(),
    linha: encadeado ? 13 : 14,
    fim: true,
    ok: true,
    nota: `Fim: ${plural(n, "chave", "chaves")} em ${plural(cap, "bucket", "buckets")}, fator de carga ${dec(cap ? n / cap : 0)}. Deu ${plural(colisoes, "colisão", "colisões")} e ${plural(comparacoes, "comparação de chave", "comparações de chave")} no caminho todo.`,
  });
  return out;
}

type Preset = {
  rotulo: string;
  chaves: string;
  cap: number;
  encadeado: boolean;
  redimensiona: boolean;
};

const PRESETS: Preset[] = [
  { rotulo: "Quadro do encontro", chaves: "Ana, Bob, Lia, Leo, Eva", cap: 5, encadeado: true, redimensiona: false },
  { rotulo: "Sondagem linear", chaves: "Ana, Bob, Lia, Leo, Eva", cap: 5, encadeado: false, redimensiona: false },
  { rotulo: "Rehash acontecendo", chaves: "Ana, Bob, Lia, Leo, Eva", cap: 4, encadeado: true, redimensiona: true },
  { rotulo: "Anagramas: o pior caso", chaves: "Lia, Ali, Ila, Lai", cap: 5, encadeado: true, redimensiona: false },
];

const POOL = ["Ana", "Bob", "Lia", "Leo", "Eva", "Kim", "Ben", "Mia", "Rui", "Zoe", "Ivo", "Gil", "Tom", "Vera"];

function lerChaves(texto: string): string[] {
  return texto
    .split(",")
    .map((x) => x.trim().slice(0, 12))
    .filter((x) => x.length > 0)
    .slice(0, 12);
}

export function HashTableVisualizer() {
  const [entrada, setEntrada] = useState(PRESETS[0].chaves);
  const [cap, setCap] = useState(PRESETS[0].cap);
  const [encadeado, setEncadeado] = useState(PRESETS[0].encadeado);
  const [redimensiona, setRedimensiona] = useState(PRESETS[0].redimensiona);
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const chaves = useMemo(() => lerChaves(entrada), [entrada]);
  const passos = useMemo(
    () => gerarPassos(chaves.length ? chaves : ["Ana"], cap, encadeado, redimensiona),
    [chaves, cap, encadeado, redimensiona]
  );
  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];
  const CODIGO = encadeado ? CODIGO_ENCADEAMENTO : CODIGO_SONDAGEM;

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
    setEntrada(pr.chaves);
    setCap(pr.cap);
    setEncadeado(pr.encadeado);
    setRedimensiona(pr.redimensiona);
  };

  const sortear = () => {
    const restantes = [...POOL];
    const escolhidas: string[] = [];
    const quantas = 5 + Math.floor(Math.random() * 3);
    for (let k = 0; k < quantas && restantes.length; k++) {
      escolhidas.push(restantes.splice(Math.floor(Math.random() * restantes.length), 1)[0]);
    }
    reiniciar();
    setEntrada(escolhidas.join(", "));
  };

  const carga = p.cap ? p.n / p.cap : 0;
  const variaveis = [
    { nome: "chave", valor: p.chave ? `"${p.chave}"` : "-" },
    { nome: "soma", valor: p.soma == null ? "-" : `${p.soma}` },
    { nome: "indice", valor: p.indice == null ? "-" : `${p.indice}` },
    { nome: "capacidade", valor: `${p.cap}` },
    { nome: "n", valor: `${p.n}` },
    { nome: "fator_carga", valor: dec(carga), best: carga <= LIMITE_CARGA },
    { nome: "colisoes", valor: `${p.colisoes}` },
    { nome: "comparacoes", valor: `${p.comparacoes}` },
  ];

  const notaCls = "viz-note" + (p.ok ? " ok" : p.fim ? " invalid" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);
  const destaque = p.sonda != null ? p.sonda : p.alvo;

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · inserindo chaves numa tabela hash</span>
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
            <span>Chaves (na ordem de inserção)</span>
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
            <span>Capacidade</span>
            <select
              className="viz-input ht-sel"
              value={cap}
              onChange={(e) => {
                reiniciar();
                setCap(parseInt(e.target.value, 10));
              }}
            >
              <option value={4}>4</option>
              <option value={5}>5</option>
              <option value={8}>8</option>
              <option value={16}>16</option>
            </select>
          </label>
          <button className="viz-btn" onClick={sortear}>
            Sortear
          </button>
        </div>

        <div className="bigo-chips">
          <button
            className={`bigo-chip${encadeado ? " on" : ""}`}
            aria-pressed={encadeado}
            onClick={() => {
              reiniciar();
              setEncadeado(true);
            }}
          >
            <span className="sw" style={{ background: encadeado ? "#34d399" : "#3a4a60" }} />
            Encadeamento
          </button>
          <button
            className={`bigo-chip${!encadeado ? " on" : ""}`}
            aria-pressed={!encadeado}
            onClick={() => {
              reiniciar();
              setEncadeado(false);
            }}
          >
            <span className="sw" style={{ background: !encadeado ? "#fbbf24" : "#3a4a60" }} />
            Sondagem linear
          </button>
          <button
            className={`bigo-chip${redimensiona ? " on" : ""}`}
            aria-pressed={redimensiona}
            onClick={() => {
              reiniciar();
              setRedimensiona((v) => !v);
            }}
          >
            <span className="sw" style={{ background: redimensiona ? "#60a5fa" : "#3a4a60" }} />
            Rehash em 0,75
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

        <div className="ht-table">
          {p.slots.map((bucket, i) => {
            let cls = "ht-slot";
            if (p.sonda === i) cls += " sonda";
            else if (p.alvo === i) cls += " alvo";
            return (
              <div className="ht-row" key={i}>
                <span className="ht-idx">{i}</span>
                <div className={cls}>
                  {bucket.length === 0 ? (
                    <span className="ht-vazio">vazio</span>
                  ) : (
                    bucket.map((no, k) => {
                      let ncls = "ht-no";
                      if (no.chave === p.inserido) ncls += " novo";
                      else if (destaque === i && p.comparando === k) ncls += " compara";
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
            );
          })}
        </div>

        <div className="ht-legenda">
          <span>
            <i style={{ background: "rgba(59, 130, 246, 0.7)" }} />
            bucket que o hash apontou
          </span>
          <span>
            <i style={{ background: "#fbbf24" }} />
            comparação de chave / sondagem
          </span>
          <span>
            <i style={{ background: "#34d399" }} />
            acabou de entrar
          </span>
        </div>

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">tabela_hash.py</div>
            <div className="viz-code-body">
              {CODIGO.map((txt, n) => (
                <div key={n} className={`viz-line${n === p.linha ? " on" : ""}`}>
                  <span className="ln">{n + 1}</span>
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
