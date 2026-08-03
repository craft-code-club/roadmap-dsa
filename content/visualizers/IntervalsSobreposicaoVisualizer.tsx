"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LinhaDoTempo, eixoDe, fmtIv } from "./IntervalsLinhaDoTempo";
import type { Intervalo, LinhaTL } from "./IntervalsLinhaDoTempo";

// ---------------------------------------------------------------------------
// IntervalsSobreposicaoVisualizer, o laboratório da condição de sobreposição.
//
// É o átomo do tópico: antes de fundir, inserir ou contar qualquer coisa, o
// aluno precisa saber decidir se DOIS intervalos se tocam. Aqui A fica parado
// e B desliza por cima dele, um instante por passo, passando por todas as
// posições relativas possíveis (antes, encostando, invadindo, contido,
// contendo, depois). O ▶ Rodar faz B atravessar A de ponta a ponta.
//
// O botão de bordas troca o modelo de intervalo entre fechado [inicio, fim] e
// meio aberto [inicio, fim), que é onde mora quase todo erro de borda: em
// [1, 3] e [3, 5], fechado diz que se tocam e meio aberto diz que não.
// ---------------------------------------------------------------------------

type Vars = { nome: string; valor: string; best?: boolean }[];

type Teste = { titulo: string; corpo: string; ok: boolean };

type Passo = {
  linha: number;
  b: Intervalo;
  sobrepoe: boolean;
  relacao: string;
  interseccao: Intervalo | null;
  uniao: Intervalo | null;
  nota: string;
  testes: Teste[];
  vars: Vars;
};

function codigoDe(fechado: boolean): string[] {
  return fechado
    ? [
        "def sobrepoe(a, b):",
        "    if b[0] > a[1]:",
        "        return False   # b comeca depois de a acabar",
        "    if a[0] > b[1]:",
        "        return False   # a comeca depois de b acabar",
        "    return True        # sobra pelo menos um ponto em comum",
      ]
    : [
        "def sobrepoe(a, b):    # bordas [inicio, fim)",
        "    if b[0] >= a[1]:",
        "        return False   # b comeca quando a ja acabou",
        "    if a[0] >= b[1]:",
        "        return False   # a comeca quando b ja acabou",
        "    return True        # existe um pedaco de tempo em comum",
      ];
}

function relacaoEntre(a: Intervalo, b: Intervalo, fechado: boolean): string {
  const [aI, aF] = a;
  const [bI, bF] = b;
  const encosta = (t: number, onde: string) =>
    fechado
      ? `B encosta no ${onde} de A: o instante ${t} é o único ponto em comum`
      : `B encosta no ${onde} de A, e com bordas [início, fim) encostar não é sobrepor`;
  if (bI === aI && bF === aF) return "A e B são exatamente o mesmo intervalo";
  if (bF < aI) return "B termina antes de A começar";
  if (bF === aI) return encosta(aI, "início");
  if (bI > aF) return "B começa depois de A terminar";
  if (bI === aF) return encosta(aF, "fim");
  if (bI <= aI && bF >= aF) return "B contém A inteiro";
  if (bI >= aI && bF <= aF) return "A contém B inteiro";
  if (bI < aI) return "B invade A pela esquerda";
  return "B invade A pela direita";
}

function gerarPassos(a: Intervalo, compB: number, fechado: boolean, bMax: number): Passo[] {
  const [aI, aF] = a;
  const op = fechado ? ">" : ">=";
  const out: Passo[] = [];

  for (let t = 0; t <= bMax; t++) {
    const b: Intervalo = [t, t + compB];
    const [bI, bF] = b;
    const depois = fechado ? bI > aF : bI >= aF;
    const antes = fechado ? aI > bF : aI >= bF;
    const sobrepoe = !depois && !antes;

    const maiorInicio = Math.max(aI, bI);
    const menorFim = Math.min(aF, bF);
    const interseccao: Intervalo | null = sobrepoe ? [maiorInicio, menorFim] : null;
    const uniao: Intervalo | null = sobrepoe ? [Math.min(aI, bI), Math.max(aF, bF)] : null;
    const relacao = relacaoEntre(a, b, fechado);

    const testes: Teste[] = [
      {
        titulo: `b[0] ${op} a[1]`,
        corpo: `${bI} ${op} ${aF} é ${depois ? "verdadeiro" : "falso"}: B ${depois ? "começa depois de A acabar" : "não começa depois de A acabar"}.`,
        ok: !depois,
      },
      {
        titulo: `a[0] ${op} b[1]`,
        corpo: `${aI} ${op} ${bF} é ${antes ? "verdadeiro" : "falso"}: A ${antes ? "começa depois de B acabar" : "não começa depois de B acabar"}.`,
        ok: !antes,
      },
      {
        titulo: "[max(inícios), min(fins)]",
        corpo: sobrepoe
          ? `[${maiorInicio}, ${menorFim}] é a interseção, com ${menorFim - maiorInicio} de duração.`
          : `[${maiorInicio}, ${menorFim}] tem início maior que fim, então a interseção é vazia.`,
        ok: sobrepoe,
      },
    ];

    let nota: string;
    if (depois) {
      nota = `B começa em ${bI} e A termina em ${aF}. Como ${bI} ${op} ${aF}, saio no primeiro teste com False: nem preciso olhar o resto.`;
    } else if (antes) {
      nota = `A começa em ${aI} e B termina em ${bF}. Como ${aI} ${op} ${bF}, B já tinha acabado quando A nasceu. False.`;
    } else if (interseccao && interseccao[0] === interseccao[1]) {
      nota = `Passei nos dois testes por um fio: A e B dividem só o instante ${interseccao[0]}, uma interseção de duração zero. Fundidos, eles viram ${fmtIv(uniao)}.`;
    } else {
      nota = `Passei nos dois testes: A e B dividem ${fmtIv(interseccao)}. Se eu fosse fundir os dois, o resultado seria ${fmtIv(uniao)}, que é [min dos inícios, max dos fins].`;
    }

    out.push({
      linha: depois ? 2 : antes ? 4 : 5,
      b,
      sobrepoe,
      relacao,
      interseccao,
      uniao,
      nota,
      testes,
      vars: [
        { nome: "a", valor: fmtIv(a) },
        { nome: "b", valor: fmtIv(b) },
        { nome: "max(inicios)", valor: `${maiorInicio}` },
        { nome: "min(fins)", valor: `${menorFim}` },
        { nome: "sobrepoe", valor: sobrepoe ? "True" : "False", best: sobrepoe },
      ],
    });
  }
  return out;
}

const VELOCIDADES = [0, 900, 620, 420, 280, 160];
const ROTULOS_VEL = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

const A_PADRAO: Intervalo = [6, 12];
const COMP_PADRAO = 4;
const PASSO_INICIAL = 4;

export function IntervalsSobreposicaoVisualizer() {
  const [a0, setA0] = useState(A_PADRAO[0]);
  const [a1, setA1] = useState(A_PADRAO[1]);
  const [compB, setCompB] = useState(COMP_PADRAO);
  const [fechado, setFechado] = useState(true);
  const [passo, setPasso] = useState(PASSO_INICIAL);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(3);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);

  const a = useMemo<Intervalo>(() => [Math.min(a0, a1), Math.max(a0, a1)], [a0, a1]);
  // Teto de passos: sem ele, um "A termina" digitado com muitos zeros geraria
  // dezenas de milhares de passos e travaria a aba.
  const bMax = useMemo(() => Math.min(60, Math.max(a[1] + 3, a[0] + compB + 3)), [a, compB]);
  const passos = useMemo(() => gerarPassos(a, compB, fechado, bMax), [a, compB, fechado, bMax]);
  const codigo = useMemo(() => codigoDe(fechado), [fechado]);

  const total = passos.length;
  const idx = Math.min(passo, total - 1);
  const p = passos[idx];

  const eixo = useMemo(() => eixoDe([0, a[1] + 1, bMax + compB]), [a, bMax, compB]);

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

  const irPara = (t: number) => {
    parar();
    setTocando(false);
    setPasso(Math.min(total - 1, Math.max(0, t)));
  };

  const cenarios: { nome: string; t: number }[] = [
    { nome: "B bem antes", t: 0 },
    { nome: "Encostando no início", t: a[0] - compB },
    { nome: "Invadindo pela esquerda", t: a[0] - Math.ceil(compB / 2) },
    { nome: "Dentro de A", t: Math.round((a[0] + a[1]) / 2 - compB / 2) },
    { nome: "Encostando no fim", t: a[1] },
    { nome: "B bem depois", t: bMax },
  ];

  const linhasTL: LinhaTL[] = [
    {
      chave: "a",
      rotulo: `A = ${fmtIv(a)}`,
      barras: [{ chave: "ba", inicio: a[0], fim: a[1], classe: "atual", texto: `${a[0]},${a[1]}` }],
    },
    {
      chave: "b",
      rotulo: `B = ${fmtIv(p.b)}`,
      barras: [{ chave: "bb", inicio: p.b[0], fim: p.b[1], classe: "novo", texto: `${p.b[0]},${p.b[1]}` }],
    },
    {
      chave: "inter",
      rotulo: "interseção",
      barras: p.interseccao
        ? [{ chave: "bi", inicio: p.interseccao[0], fim: p.interseccao[1], classe: "bloco", texto: `${p.interseccao[0]},${p.interseccao[1]}` }]
        : [],
    },
    {
      chave: "uniao",
      rotulo: "fundidos",
      barras: p.uniao
        ? [{ chave: "bu", inicio: p.uniao[0], fim: p.uniao[1], classe: "pronto", texto: `${p.uniao[0]},${p.uniao[1]}` }]
        : [],
    },
  ];

  const notaCls = "viz-note" + (p.sobrepoe ? " ok" : " invalid");
  const pctPasso = Math.round(((idx + 1) / total) * 100);

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" style={{ background: p.sobrepoe ? "#34d399" : "#f87171" }} />
          <span>Visualizador · quando dois intervalos se sobrepõem</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">passo {idx + 1} de {total}</span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "✕ Fechar" : "⤢ Expandir"}
          </button>
        </div>
      </div>

      <div className="viz-body">
        <div className="viz-inputs">
          <label className="viz-field">
            <span>A começa</span>
            <input className="viz-input k" type="number" min={0} max={40} value={a0}
              onChange={(e) => { irPara(idx); setA0(Math.min(40, Math.max(0, parseInt(e.target.value, 10) || 0))); }} />
          </label>
          <label className="viz-field">
            <span>A termina</span>
            <input className="viz-input k" type="number" min={0} max={40} value={a1}
              onChange={(e) => { irPara(idx); setA1(Math.min(40, Math.max(0, parseInt(e.target.value, 10) || 0))); }} />
          </label>
          <label className="viz-field">
            <span>duração de B</span>
            <input className="viz-input k" type="number" min={0} max={20} value={compB}
              onChange={(e) => { irPara(idx); setCompB(Math.min(20, Math.max(0, parseInt(e.target.value, 10) || 0))); }} />
          </label>
          <button className="viz-btn" onClick={() => { irPara(idx); setFechado((v) => !v); }} aria-pressed={fechado}>
            Bordas: {fechado ? "[início, fim]" : "[início, fim)"}
          </button>
        </div>

        <div className="iv-presets">
          <span className="iv-presets-lbl">Cenários</span>
          {cenarios.map((c) => (
            <button key={c.nome} className={`iv-preset${idx === Math.min(total - 1, Math.max(0, c.t)) ? " on" : ""}`} onClick={() => irPara(c.t)}>
              {c.nome}
            </button>
          ))}
        </div>

        <LinhaDoTempo
          linhas={linhasTL}
          min={eixo.min}
          max={eixo.max}
          marcas={eixo.marcas}
          guia={a[1]}
          guiaVerde
        />

        <div className="viz-field grow" style={{ marginTop: 14 }}>
          <span>Início de B: {p.b[0]}</span>
          <input
            type="range"
            min={0}
            max={total - 1}
            step={1}
            value={idx}
            onChange={(e) => irPara(parseInt(e.target.value, 10))}
            aria-label="Instante em que B começa"
            style={{ accentColor: "var(--ccc-accent)", width: "100%" }}
          />
        </div>

        <div className="iv-veredito">
          <span className={`iv-selo ${p.sobrepoe ? "ok" : "no"}`}>
            {p.sobrepoe ? "sobrepõem" : "não se sobrepõem"}
          </span>
          <span className="iv-veredito-txt">{p.relacao}</span>
        </div>

        <div className="iv-testes">
          {p.testes.map((t) => (
            <div className={`iv-teste ${t.ok ? "ok" : "no"}`} key={t.titulo}>
              <b>{t.titulo}</b>
              {t.corpo}
            </div>
          ))}
        </div>

        <p className={notaCls}>{p.nota}</p>

        <div className="viz-split">
          <div className="viz-code">
            <div className="viz-code-head">
              sobreposicao.py · {fechado ? "encostar conta como sobrepor" : "encostar não conta"}
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
            {p.vars.map((v) => (
              <div className="viz-var" key={v.nome}>
                <span className="viz-var-name">{v.nome}</span>
                <span className={`viz-var-val${v.best ? " best" : ""}`}>{v.valor}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="viz-controls">
          <button className="viz-btn" title="Reiniciar" onClick={() => { setA0(A_PADRAO[0]); setA1(A_PADRAO[1]); setCompB(COMP_PADRAO); setFechado(true); parar(); setTocando(false); setPasso(PASSO_INICIAL); }}>↺</button>
          <button className="viz-btn" disabled={idx === 0} onClick={() => irPara(idx - 1)}>‹ Anterior</button>
          <button className="viz-play" onClick={() => { if (tocando) { setTocando(false); return; } setPasso(idx >= total - 1 ? 0 : idx); setTocando(true); }}>
            {tocando ? "❚❚ Pausar" : "▶ Rodar"}
          </button>
          <button className="viz-btn" disabled={idx === total - 1} onClick={() => irPara(idx + 1)}>Próximo ›</button>
          <div className="viz-speed">
            <span>Velocidade</span>
            <input type="range" min={1} max={5} step={1} value={velocidade} onChange={(e) => setVelocidade(parseInt(e.target.value, 10))} />
            <span className="val">{ROTULOS_VEL[velocidade]}</span>
          </div>
        </div>
        <div className="viz-progress"><div className="viz-progress-fill" style={{ width: `${pctPasso}%`, background: p.sobrepoe ? "#34d399" : "#f87171" }} /></div>
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
