"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ---------------------------------------------------------------------------
// RecursionVisualizer, a pilha de chamadas.
//
// Mesmo padrão dos outros visualizadores (gerador puro de passos + a casca
// compartilhada), só que no lugar das células de um array o palco é a call
// stack: cada chamada empilha um frame com o SEU próprio n, o caso base
// devolve o primeiro valor concreto, e os valores sobem de volta resolvendo a
// operação que ficou pendurada em cada frame.
//
// Três modos, porque o encontro comparou os três:
//   - clássico: a multiplicação fica pendente e só resolve na subida
//   - cauda: o acumulador desce pronto, nada fica pendente na volta
//   - caso base inalcançável: existe caso base, mas o estado anda para longe
//
// O "limite da pilha" é um campo editável de propósito. O limite real do
// CPython é 1000 e não caberia na tela, mas a lição é a mesma: estourar não é
// só "esquecer o caso base", é passar da profundidade que a linguagem aguenta.
// Com limite 6, fatorial(10) estoura igualzinho.
// ---------------------------------------------------------------------------

type Estado = "espera" | "ativo" | "base" | "volta" | "estoura";

type Frame = {
  id: number;
  nivel: number;
  n: number;
  rotulo: string;
  pendente?: string;
  retorno?: string;
  estado: Estado;
  novo?: boolean;
};

type Var = { nome: string; valor: string; best?: boolean };

type Passo = {
  linha: number;
  frames: Frame[];
  chamadas: number;
  maxProf: number;
  nota: string;
  vars: Var[];
  ok?: boolean;
  fim?: boolean;
  erro?: boolean;
};

// As linhas mapeiam 1:1 com o campo `linha` de cada passo do gerador do modo,
// então a ordem e a quantidade de linhas não podem mudar sem ajustar o gerador.
const CLASSICO = [
  "def fatorial(n):",
  "    if n <= 1:",
  "        return 1",
  "    resultado = fatorial(n - 1)",
  "    return n * resultado",
];

const CAUDA = [
  "def fatorial(n, acc=1):",
  "    if n <= 1:",
  "        return acc",
  "    return fatorial(n - 1, acc * n)",
];

const INALCANCAVEL = [
  "def contagem(n):",
  "    if n == 0:",
  "        return",
  "    print(n)",
  "    return contagem(n + 1)",
];

const VELOCIDADES = [0, 1400, 950, 650, 420, 250];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

// Formatação determinística (nada de Intl, para o HTML do servidor bater com o
// do cliente na hidratação).
function num(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function fatorialDe(n: number): number {
  let f = 1;
  for (let i = 2; i <= n; i++) f *= i;
  return f;
}

// --------------------------------------------------------------------------
// Modo clássico: a operação pendente é o coração da coisa. Cada frame guarda
// "n × ?" enquanto espera, e é isso que impede a pilha de encolher antes da
// hora.
// --------------------------------------------------------------------------
function gerarClassico(n0: number, limite: number): Passo[] {
  const out: Passo[] = [];
  const frames: Frame[] = [];
  let chamadas = 0;
  let maxProf = 0;
  let id = 0;

  const snap = (novoId?: number) => frames.map((f) => ({ ...f, novo: f.id === novoId }));
  const vars = (topo: string, devolvido: string): Var[] => [
    { nome: "n (frame do topo)", valor: topo },
    { nome: "valor devolvido", valor: devolvido },
    { nome: "frames na pilha", valor: `${frames.length}` },
    { nome: "chamadas", valor: `${chamadas}`, best: true },
  ];
  const passo = (
    linha: number,
    nota: string,
    topo: string,
    devolvido: string,
    extra?: Partial<Passo>,
    novoId?: number
  ) => {
    out.push({ linha, frames: snap(novoId), chamadas, maxProf, nota, vars: vars(topo, devolvido), ...extra });
  };

  let k = n0;
  let guarda = 0;
  let estourou = false;

  while (guarda++ < 40) {
    const meu = id++;
    frames.push({ id: meu, nivel: frames.length + 1, n: k, rotulo: `fatorial(n=${k})`, estado: "ativo" });
    chamadas++;

    if (frames.length > limite) {
      frames[frames.length - 1].estado = "estoura";
      passo(
        0,
        `Tentei abrir o frame ${frames.length} e o limite da pilha é ${limite}: RecursionError, maximum recursion depth exceeded. Nenhuma resposta voltou, porque nenhuma chamada chegou ao caso base antes do teto.`,
        `${k}`,
        "-",
        { fim: true, erro: true },
        meu
      );
      estourou = true;
      break;
    }
    maxProf = Math.max(maxProf, frames.length);

    passo(
      0,
      `Entro em fatorial(${k}). Um frame novo vai para o topo da pilha, com um n = ${k} que é só dele: o n dos frames de baixo continua intacto.`,
      `${k}`,
      "-",
      undefined,
      meu
    );

    if (k <= 1) {
      passo(1, `n = ${k} bate no caso base. Esta eu respondo sozinha, sem chamar mais ninguém.`, `${k}`, "-");
      frames[frames.length - 1].estado = "base";
      frames[frames.length - 1].retorno = "1";
      passo(2, `Devolvo 1. É a primeira resposta concreta da execução inteira, e é dela que todas as outras vão nascer.`, `${k}`, "1");
      break;
    }

    passo(1, `n = ${k} não é 0 nem 1, então não tenho a resposta na mão: preciso quebrar em um problema menor.`, `${k}`, "-");
    frames[frames.length - 1].estado = "espera";
    frames[frames.length - 1].pendente = `${k} × ?`;
    passo(
      3,
      `Chamo fatorial(${k - 1}). A multiplicação por ${k} fica pendurada neste frame: enquanto a resposta de baixo não chegar, este frame não pode sair da pilha.`,
      `${k}`,
      "-"
    );
    k--;
  }

  if (estourou) return out;

  // Subida: cada frame recebe o valor de baixo, resolve a multiplicação que
  // estava pendente e sai da pilha.
  let valor = 1;
  frames.pop();
  while (frames.length > 0 && guarda++ < 80) {
    const topo = frames[frames.length - 1];
    const novo = topo.n * valor;
    topo.estado = "volta";
    topo.pendente = undefined;
    topo.retorno = num(novo);
    passo(
      4,
      `fatorial(${topo.n}) recebe ${num(valor)} de baixo, resolve a conta que estava pendurada, ${topo.n} × ${num(valor)} = ${num(novo)}, e devolve. O frame sai da pilha e a memória dele é liberada.`,
      `${topo.n}`,
      num(novo)
    );
    valor = novo;
    frames.pop();
  }

  out.push({
    linha: 4,
    frames: [],
    chamadas,
    maxProf,
    nota: `A pilha voltou a ficar vazia: fatorial(${n0}) = ${num(valor)}. Deu ${chamadas} ${chamadas === 1 ? "chamada" : "chamadas"} no total e, no pico, ${maxProf} ${maxProf === 1 ? "frame vivo" : "frames vivos"} ao mesmo tempo. Esse pico é a complexidade de espaço da recursão: O(n).`,
    vars: [
      { nome: "n (frame do topo)", valor: "-" },
      { nome: "valor devolvido", valor: num(valor) },
      { nome: "frames na pilha", valor: "0" },
      { nome: "chamadas", valor: `${chamadas}`, best: true },
    ],
    ok: true,
    fim: true,
  });
  return out;
}

// --------------------------------------------------------------------------
// Modo cauda: o acumulador desce pronto. Na subida não sobra nenhuma conta, e
// é exatamente esse "nada pendente" que abre espaço para a otimização de
// chamada final nas linguagens que a fazem.
// --------------------------------------------------------------------------
function gerarCauda(n0: number, limite: number): Passo[] {
  const out: Passo[] = [];
  const frames: Frame[] = [];
  let chamadas = 0;
  let maxProf = 0;
  let id = 0;

  const snap = (novoId?: number) => frames.map((f) => ({ ...f, novo: f.id === novoId }));
  const vars = (topo: string, acc: string, devolvido: string): Var[] => [
    { nome: "n (frame do topo)", valor: topo },
    { nome: "acc", valor: acc },
    { nome: "valor devolvido", valor: devolvido },
    { nome: "chamadas", valor: `${chamadas}`, best: true },
  ];
  const passo = (
    linha: number,
    nota: string,
    topo: string,
    acc: string,
    devolvido: string,
    extra?: Partial<Passo>,
    novoId?: number
  ) => {
    out.push({ linha, frames: snap(novoId), chamadas, maxProf, nota, vars: vars(topo, acc, devolvido), ...extra });
  };

  let k = n0;
  let acc = 1;
  let guarda = 0;
  let estourou = false;

  while (guarda++ < 40) {
    const meu = id++;
    frames.push({ id: meu, nivel: frames.length + 1, n: k, rotulo: `fatorial(n=${k}, acc=${num(acc)})`, estado: "ativo" });
    chamadas++;

    if (frames.length > limite) {
      frames[frames.length - 1].estado = "estoura";
      passo(
        0,
        `Tentei abrir o frame ${frames.length} e o limite da pilha é ${limite}: RecursionError. Sem otimização de chamada final, a recursão de cauda empilha exatamente igual à clássica.`,
        `${k}`,
        num(acc),
        "-",
        { fim: true, erro: true },
        meu
      );
      estourou = true;
      break;
    }
    maxProf = Math.max(maxProf, frames.length);

    passo(
      0,
      `Entro em fatorial(${k}, acc=${num(acc)}). Repare que o trabalho já vem feito de cima: o acumulador carrega tudo o que foi multiplicado até aqui.`,
      `${k}`,
      num(acc),
      "-",
      undefined,
      meu
    );

    if (k <= 1) {
      passo(1, `n = ${k} bate no caso base.`, `${k}`, num(acc), "-");
      frames[frames.length - 1].estado = "base";
      frames[frames.length - 1].retorno = num(acc);
      passo(
        2,
        `Devolvo o acumulador: ${num(acc)}. A resposta final já estava pronta ANTES da volta começar, ninguém precisa calcular mais nada na subida.`,
        `${k}`,
        num(acc),
        num(acc)
      );
      break;
    }

    passo(1, `n = ${k} ainda não é caso base.`, `${k}`, num(acc), "-");
    const proximo = acc * k;
    frames[frames.length - 1].estado = "espera";
    frames[frames.length - 1].pendente = "nada pendente";
    passo(
      3,
      `Chamo fatorial(${k - 1}, ${num(acc)} × ${k} = ${num(proximo)}). A chamada é a ÚLTIMA operação da função: depois dela não sobra nenhuma conta neste frame.`,
      `${k}`,
      num(acc),
      "-"
    );
    acc = proximo;
    k--;
  }

  if (estourou) return out;

  const resultado = acc;
  frames.pop();
  while (frames.length > 0 && guarda++ < 80) {
    const topo = frames[frames.length - 1];
    topo.estado = "volta";
    topo.pendente = undefined;
    topo.retorno = num(resultado);
    passo(
      3,
      `O frame de fatorial(${topo.n}, ...) recebe ${num(resultado)} e só repassa, porque não tinha nada pendente. Este frame ficou vivo à toa: é justamente ele que a otimização de chamada final sabe reaproveitar.`,
      `${topo.n}`,
      num(acc),
      num(resultado)
    );
    frames.pop();
  }

  out.push({
    linha: 2,
    frames: [],
    chamadas,
    maxProf,
    nota: `fatorial(${n0}) = ${num(resultado)} com ${chamadas} ${chamadas === 1 ? "chamada" : "chamadas"} e pico de ${maxProf} ${maxProf === 1 ? "frame" : "frames"}: os mesmos números do modo clássico. Em Python o custo é idêntico, o ganho da cauda só aparece em linguagem que faz a otimização.`,
    vars: [
      { nome: "n (frame do topo)", valor: "-" },
      { nome: "acc", valor: num(resultado) },
      { nome: "valor devolvido", valor: num(resultado) },
      { nome: "chamadas", valor: `${chamadas}`, best: true },
    ],
    ok: true,
    fim: true,
  });
  return out;
}

// --------------------------------------------------------------------------
// Modo caso base inalcançável: o caso base EXISTE, o que falha é a regra 2. O
// estado anda, mas para o lado errado, e a pilha cresce até o teto.
// --------------------------------------------------------------------------
function gerarInalcancavel(n0: number, limite: number): Passo[] {
  const out: Passo[] = [];
  const frames: Frame[] = [];
  let chamadas = 0;
  let maxProf = 0;
  let id = 0;

  const snap = (novoId?: number) => frames.map((f) => ({ ...f, novo: f.id === novoId }));
  const passo = (linha: number, nota: string, topo: string, extra?: Partial<Passo>, novoId?: number) => {
    out.push({
      linha,
      frames: snap(novoId),
      chamadas,
      maxProf,
      nota,
      vars: [
        { nome: "n (frame do topo)", valor: topo },
        { nome: "caso base", valor: "n == 0" },
        { nome: "frames na pilha", valor: `${frames.length}` },
        { nome: "chamadas", valor: `${chamadas}`, best: true },
      ],
      ...extra,
    });
  };

  let k = n0;
  let guarda = 0;
  while (guarda++ < 40) {
    const meu = id++;
    frames.push({ id: meu, nivel: frames.length + 1, n: k, rotulo: `contagem(n=${k})`, estado: "ativo" });
    chamadas++;

    if (frames.length > limite) {
      frames[frames.length - 1].estado = "estoura";
      passo(
        4,
        `Frame ${frames.length} com o limite em ${limite}: RecursionError, maximum recursion depth exceeded. O caso base n == 0 existe e está escrito ali, mas eu comecei em ${n0} e ando para cima: cada chamada me deixa mais longe dele, não mais perto.`,
        `${k}`,
        { fim: true, erro: true },
        meu
      );
      return out;
    }
    maxProf = Math.max(maxProf, frames.length);

    passo(0, `Entro em contagem(${k}). Mais um frame no topo, mais um escopo vivo na memória.`, `${k}`, undefined, meu);
    passo(1, `Testo o caso base: ${k} == 0? Não. Então sigo.`, `${k}`);
    passo(3, `Imprimo ${k} e vou em frente.`, `${k}`);
    frames[frames.length - 1].estado = "espera";
    frames[frames.length - 1].pendente = "nunca resolve";
    passo(
      4,
      `Chamo contagem(${k + 1}). O estado muda a cada chamada, que é a regra 2, mas muda para o lado errado: de ${k} para ${k + 1}, sempre se afastando do zero.`,
      `${k}`
    );
    k++;
  }
  return out;
}

type Modo = {
  key: string;
  rotulo: string;
  arquivo: string;
  codigo: string[];
  nRotulo: string;
  nMin: number;
  nMax: number;
  gerar: (n: number, limite: number) => Passo[];
};

const MODOS: Modo[] = [
  { key: "classico", rotulo: "fatorial clássico", arquivo: "fatorial.py", codigo: CLASSICO, nRotulo: "n", nMin: 0, nMax: 12, gerar: gerarClassico },
  { key: "cauda", rotulo: "fatorial em cauda", arquivo: "fatorial_cauda.py", codigo: CAUDA, nRotulo: "n", nMin: 0, nMax: 12, gerar: gerarCauda },
  { key: "inalcancavel", rotulo: "caso base inalcançável", arquivo: "contagem.py", codigo: INALCANCAVEL, nRotulo: "começa em", nMin: 1, nMax: 12, gerar: gerarInalcancavel },
];

type Preset = { key: string; rotulo: string; modo: string; n: number; limite: number };

const PRESETS: Preset[] = [
  { key: "cinco", rotulo: "fatorial(5): o clássico", modo: "classico", n: 5, limite: 12 },
  { key: "base", rotulo: "fatorial(1): caso base de cara", modo: "classico", n: 1, limite: 12 },
  { key: "cauda", rotulo: "fatorial(5) em cauda", modo: "cauda", n: 5, limite: 12 },
  { key: "fundo", rotulo: "fatorial(10) com limite 6", modo: "classico", n: 10, limite: 6 },
  { key: "solto", rotulo: "caso base fora de alcance", modo: "inalcancavel", n: 1, limite: 6 },
];

export function RecursionVisualizer() {
  const [iModo, setIModo] = useState(0);
  const [n, setN] = useState(5);
  const [limite, setLimite] = useState(12);
  const [preset, setPreset] = useState("cinco");
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const modo = MODOS[iModo];
  const passos = useMemo(() => modo.gerar(n, limite), [modo, n, limite]);
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

  const trocarModo = (i: number) => {
    reiniciar(); setPreset("");
    setIModo(i);
    setN((v) => Math.min(MODOS[i].nMax, Math.max(MODOS[i].nMin, v)));
  };
  const aoMudarN = (v: string) => {
    const x = parseInt(v, 10);
    reiniciar(); setPreset("");
    setN(isNaN(x) ? modo.nMin : Math.min(modo.nMax, Math.max(modo.nMin, x)));
  };
  const aoMudarLimite = (v: string) => {
    const x = parseInt(v, 10);
    reiniciar(); setPreset("");
    setLimite(isNaN(x) ? 3 : Math.min(12, Math.max(3, x)));
  };
  const aplicarPreset = (pr: Preset) => {
    reiniciar(); setPreset(pr.key);
    setIModo(MODOS.findIndex((m) => m.key === pr.modo));
    setN(pr.n); setLimite(pr.limite);
  };

  const frames = [...p.frames].reverse(); // topo da pilha em cima
  const notaCls = "viz-note" + (p.ok ? " ok" : p.erro ? " invalid" : "");
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  // A execução chega a devolver alguma coisa? Se ela estoura na pilha, mostrar
  // "fatorial(10) = 3.628.800" no painel seria mentira: aquele valor nunca
  // voltou. Nesse caso o card diz o que de fato aconteceu.
  const estourou = passos[total - 1].erro === true;
  const esperado = modo.key === "inalcancavel" || estourou ? null : fatorialDe(n);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · a pilha de chamadas: empilha na descida, resolve na subida</span>
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
          <div className="viz-field">
            <span>Função</span>
            <div className="sub-modo">
              {MODOS.map((m, i) => (
                <button
                  key={m.key}
                  className={`sub-modo-btn${i === iModo ? " on" : ""}`}
                  onClick={() => trocarModo(i)}
                  aria-pressed={i === iModo}
                >
                  {m.rotulo}
                </button>
              ))}
            </div>
          </div>
          <label className="viz-field">
            <span>{modo.nRotulo}</span>
            <input className="viz-input k" type="number" min={modo.nMin} max={modo.nMax} value={n} onChange={(e) => aoMudarN(e.target.value)} />
          </label>
          <label className="viz-field">
            <span>limite da pilha</span>
            <input className="viz-input k" type="number" min={3} max={12} value={limite} onChange={(e) => aoMudarLimite(e.target.value)} />
          </label>
        </div>

        <div className="rec-stack-lbl">
          <span>Call stack{frames.length > 0 ? " · topo em cima" : ""}</span>
          <span>{frames.length} de {limite} frames</span>
        </div>
        <div className="rec-stack">
          {frames.length === 0 ? (
            <div className="rec-stack-vazia">pilha vazia</div>
          ) : (
            frames.map((f, i) => (
              <div key={f.id} className={`rec-frame ${f.estado}${f.novo ? " novo" : ""}`}>
                <span className="rec-frame-nome">{f.rotulo}</span>
                {f.pendente ? <span className="rec-frame-pend">{f.pendente}</span> : null}
                {f.retorno ? <span className="rec-frame-ret">devolve {f.retorno}</span> : null}
                <span className="rec-frame-tag">{i === 0 ? "topo" : `nível ${f.nivel}`}</span>
              </div>
            ))
          )}
          {p.erro ? <div className="rec-limite">limite da pilha: {limite} frames</div> : null}
        </div>

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">{modo.arquivo}</div>
            <div className="viz-code-body">
              {modo.codigo.map((txt, i) => (
                <div key={i} className={`viz-line${i === p.linha ? " on" : ""}`}>
                  <span className="ln">{i + 1}</span>
                  {txt}
                </div>
              ))}
            </div>
          </div>
          <div className="viz-vars">
            <div className="viz-vars-head">Variáveis</div>
            {p.vars.map((v) => (
              <div className="viz-var" key={v.nome}>
                <span className="viz-var-name">{v.nome}</span>
                <span className={`viz-var-val${v.best ? " best" : ""}`}>{v.valor}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>chamadas feitas</span>
            <strong>{num(p.chamadas)}</strong>
          </div>
          <div className="bigo-stat">
            <span>pico de frames</span>
            <strong>{num(p.maxProf)}</strong>
          </div>
          <div className="bigo-stat">
            <span>memória da pilha</span>
            <strong>O(n)</strong>
          </div>
          <div className="bigo-stat">
            <span>{esperado === null ? "resposta" : `fatorial(${n})`}</span>
            <strong>{esperado === null ? (estourou ? "estourou" : "nunca chega") : num(esperado)}</strong>
          </div>
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
