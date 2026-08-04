"use client";

import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// useVisualizer — a casca comum de um visualizador do Roadmap DSA.
//
// Cobre só o que TODO visualizador tem, e nada do que cada um mostra:
//
//   · a peça caber na altura da tela do aluno (medição, não breakpoint);
//   · o panel expanded com cabeçalho e controles parados, e o teclado
//     dirigindo a animação;
//   · o blockName que pode ser mostrado ou ocultado (quase sempre o código);
//   · os controles de reprodução: step, rodar/pausar, speed, progresso.
//
// O miolo — células, SVG, canvas, tabela, o que for — é 100% do componente. O
// hook nunca renderiza conteúdo: ele devolve estado e props para espalhar.
//
// O contrato (o QUE isso faz e por quê) está em `content/visualizers/README.md`.
// Aqui está a mecânica, uma vez só, para dezenas de visualizadores não
// carregarem a mesma centena de linhas copiada cada um.
//
// O que é fácil reintroduzir escrevendo de novo, e por isso mora aqui:
//   · medir só depois de `document.fonts.ready` (as fontes chegam com
//     `display: swap`, então medir antes mede a fonte de fallback);
//   · medir com a animação CONGELADA (ler no meio de uma transição devolve o
//     layout a caminho e conclui "cabe" para uma peça que não cabe);
//   · decidir antes da pintura, para o recolhimento não piscar na tela;
//   · a escolha explícita do aluno vencer a medição até ele trocar de contexto;
//   · o panel ser um diálogo de verdade: rolagem travada, foco entrando e
//     voltando, e o Tab circulando dentro (sem isso, `aria-modal` mente);
//   · avançar step pela forma funcional do `setState` (a tecla repete muito
//     mais rápido que o clique e engole repetições lidas do closure).
// ---------------------------------------------------------------------------

// `useLayoutEffect` não existe no servidor, e o build é estático. O alias evita
// o aviso do React sem abrir mão de medir ANTES da pintura no navegador.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Folga de arredondamento: abaixo disso "estourar" é ruído de subpixel.
const SLACK = 8;
// Respiro para a peça não colar na borda de baixo da janela, no fluxo do artigo.
const INLINE_MARGIN = 24;
// Fallback da altura do cabeçalho fixo, para quando o token não resolve.
const HEADER_FALLBACK = 60;

/** Intervalos em ms por marcha. O índice 0 não é usado (a scrollbar vai de 1 a 5). */
export const DEFAULT_SPEEDS = [0, 1400, 950, 650, 420, 250] as const;
export const SPEED_LABELS = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"] as const;

/** A altura do cabeçalho vem do token do CSS, que é a fonte da verdade dela. */
function headerHeight(): number {
  if (typeof document === "undefined") return HEADER_FALLBACK;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--ccc-header-h");
  const px = parseFloat(raw);
  return Number.isFinite(px) && px > 0 ? px : HEADER_FALLBACK;
}

export type VisualizerOptions = {
  /** Título do visualizador. Vai no cabeçalho e vira o `aria-label` do diálogo. */
  title: string;
  /**
   * Quantos passos a animação tem. `1` (ou menos) = visualizador sem linha do
   * tempo: ele ganha a casca e o panel, e nenhum controle de reprodução.
   */
  total: number;
  /**
   * Intervalo em ms de cada marcha. Cada visualizador tem o seu ritmo — um
   * step de sudoku e um de troca de array não pedem o mesmo tempo.
   */
  speeds?: readonly number[];
  /** Marcha inicial (índice em `speeds`). Padrão: 3, que é o "1x". */
  initialSpeed?: number;
  /**
   * Nome do bloco que some, usado no rótulo do botão ("Mostrar código").
   * Troque quando o blockName não for código — o rótulo tem que dizer o que some.
   */
  blockName?: string;
  /**
   * `false` quando não há blockName dispensável (um SVG de árvore, um canvas): a
   * peça ganha o panel com cabeçalho e controles parados, e nada mais. Não
   * invente um blockName só para ter o botão.
   */
  collapsible?: boolean;
  /**
   * O que MAIS muda a altura da peça e pede medição nova: o modo selecionado, o
   * tamanho da entrada, o preset. Use **valores primitivos**. Expandir e
   * redimensionar já entram sozinhos.
   */
  measureOn?: readonly unknown[];
};

export type Visualizer = {
  title: string;
  // --- reprodução ---
  /** Passo atual, já limitado a `[0, total - 1]`. */
  step: number;
  total: number;
  playing: boolean;
  speed: number;
  /** Progresso em %, para a scrollbar. */
  progress: number;
  setStep: (n: number | ((s: number) => number)) => void;
  /** Anda `delta` passos e pausa. Use -1 e +1. */
  stepBy: (delta: number) => void;
  togglePlay: () => void;
  /** Volta ao step 0 e pausa. Chame quando a entrada do visualizador mudar. */
  reset: () => void;
  setSpeed: (i: number) => void;
  // --- casca ---
  expanded: boolean;
  /** O blockName recolhível está à mostra? Sempre `true` quando `collapsible: false`. */
  open: boolean;
  collapsible: boolean;
  toggleOpen: () => void;
  toggleExpanded: () => void;
  blockId: string;
  figureProps: {
    className: string;
    "data-codigo": "on" | "off";
    "data-anim": "on" | "off";
    ref: React.RefObject<HTMLElement | null>;
    tabIndex: -1;
  };
  bodyProps: { className: string; ref: React.RefObject<HTMLDivElement | null> };
  /** No elemento recolhível (normalmente o `.viz-code`), dentro do `.viz-code-slot`. */
  blockProps: { id: string; inert: boolean; "aria-hidden": true | undefined };
  /** No panel de variáveis: vira fileira quando o blockName recolhe. */
  varsProps: { className: string };
  blockButtonProps: {
    className: string;
    "aria-expanded": boolean;
    "aria-controls": string;
    onClick: () => void;
    children: string;
  };
  expandButtonProps: { className: string; onClick: () => void; children: string };
  /** Envolve o `<figure>` no overlay quando expanded. Use no `return`. */
  inPanel: (content: ReactNode) => ReactNode;
};

export function useVisualizer(options: VisualizerOptions): Visualizer {
  const {
    title,
    total,
    speeds = DEFAULT_SPEEDS,
    initialSpeed = 3,
    blockName = "código",
    collapsible = true,
    measureOn = [],
  } = options;

  const hasSteps = total > 1;

  // --------------------------------------------------------------- reprodução
  const [rawStep, setRawStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(initialSpeed);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const step = Math.max(0, Math.min(rawStep, total - 1));

  // `total` e `playing` por ref porque a tecla REPETE muito mais rápido que o
  // clique: ler o valor do closure engoliria repetições.
  const totalRef = useRef(total);
  const playingRef = useRef(false);
  useEffect(() => { totalRef.current = total; }, [total]);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  const stop = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  }, []);
  useEffect(() => () => stop(), [stop]);

  const stepBy = useCallback((delta: number) => {
    stop();
    setPlaying(false);
    setRawStep((s) => Math.max(0, Math.min(s + delta, totalRef.current - 1)));
  }, [stop]);

  const togglePlay = useCallback(() => {
    if (playingRef.current) { stop(); setPlaying(false); return; }
    // no fim da animação, rodar de novo rebobina em vez de não fazer nada
    setRawStep((s) => (s >= totalRef.current - 1 ? 0 : s));
    setPlaying(true);
  }, [stop]);

  const reset = useCallback(() => {
    stop();
    setPlaying(false);
    setRawStep(0);
  }, [stop]);

  useEffect(() => {
    stop();
    if (!playing) return;
    timer.current = setInterval(
      () => setRawStep((s) => (s >= totalRef.current - 1 ? s : s + 1)),
      speeds[speed]
    );
    return stop;
  }, [playing, speed, speeds, stop]);

  useEffect(() => {
    if (playing && step >= total - 1) setPlaying(false);
  }, [playing, step, total]);

  // -------------------------------------------------------------------- casca
  const blockId = useId();
  const figureRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(true);
  const [fontsReady, setFontsReady] = useState(false);
  // Decisão automática não anima; clique do aluno anima. `measuring` congela a
  // transição enquanto a medição acontece — sem isso, a leitura pega a altura
  // do meio do percurso e conclui "cabe" para uma peça que não cabe.
  const [animate, setAnimate] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  // `null` = ninguém escolheu na mão, a medição manda.
  const manualChoice = useRef<boolean | null>(null);
  const [measureTick, setMeasureTick] = useState(0);
  const measuredRound = useRef(-1);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!collapsible) return;
    let alive = true;
    const ok = () => { if (alive) setFontsReady(true); };
    if (typeof document !== "undefined" && document.fonts) document.fonts.ready.then(ok, ok);
    else ok();
    return () => { alive = false; };
  }, [collapsible]);

  // Chave em vez de spread: array de dependências precisa ter tamanho fixo. O
  // separador não é enfeite: sem ele `[1, 23]` e `[12, 3]` viram a mesma chave
  // "123" e uma troca real de estado não pediria medição nova.
  const measureKey = measureOn.join("\u0001");

  // A escolha do aluno NÃO é zerada ao expandir ou fechar. Ela era, e estava
  // errado: quem clica em "Mostrar código" e então abre o painel espera
  // continuar vendo o código, não que o clique seja desfeito na travessia. A
  // medição decide enquanto ninguém escolheu; depois disso ela cala a boca, e o
  // miolo rola se não couber — que é para isso que o cabeçalho e o rodapé ficam
  // parados.

  useIsomorphicLayoutEffect(() => { setMeasureTick((a) => a + 1); }, [expanded, measureKey, fontsReady]);

  // Duas passadas dentro do MESMO frame (efeito de layout roda antes da
  // pintura, então nada disso aparece na tela):
  //   1 — congela a animação e abre o blockName, que é o pior caso de altura;
  //   2 — mede o layout já estável e decide.
  useIsomorphicLayoutEffect(() => {
    if (!collapsible || !fontsReady || manualChoice.current !== null) return;
    if (measuredRound.current === measureTick) return;
    if (!measuring || !open) { setMeasuring(true); setOpen(true); return; }
    const figure = figureRef.current, body = bodyRef.current;
    if (!figure || !body) return;
    measuredRound.current = measureTick;
    const overflows = expanded
      // Expandido: o miolo é a única área rolável, então "não coube" é ele
      // precisar de mais altura do que a janela deixou para ele.
      ? body.scrollHeight > body.clientHeight + SLACK
      // No fluxo do artigo a régua é a janela: se a peça inteira não cabe numa
      // tela, o aluno olha o conteúdo sem enxergar os botões que o movem.
      : figure.getBoundingClientRect().height >
        window.innerHeight - headerHeight() - INLINE_MARGIN - SLACK;
    if (overflows) setOpen(false);
    // Só no frame seguinte, para o recolhimento desta decisão não animate.
    requestAnimationFrame(() => { setMeasuring(false); setAnimate(true); });
  }, [open, measureTick, expanded, fontsReady, measuring, collapsible]);

  useEffect(() => {
    if (!collapsible) return;
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setMeasureTick((a) => a + 1));
    };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", onResize); };
  }, [collapsible]);

  const toggleOpen = useCallback(() => {
    setOpen((a) => {
      // Anotar dentro do updater mantém leitura e escrita no mesmo valor mesmo
      // em clique rápido; em StrictMode roda duas vezes com o mesmo resultado.
      manualChoice.current = !a;
      return !a;
    });
  }, []);

  const toggleExpanded = useCallback(() => setExpanded((e) => !e), []);

  // A marcha é índice de array: fora da faixa, `speeds[speed]` vira `undefined`
  // e o `setInterval` dispara sem intervalo. Limitar na API é mais barato que
  // confiar em todo consumidor passar 1..5.
  const setSpeedClamped = useCallback(
    (i: number) => setSpeed(Math.max(1, Math.min(Math.round(i), speeds.length - 1))),
    [speeds.length]
  );

  // ---------------------------------------------------- o panel como diálogo
  // Enquanto o panel está open ele é a única coisa que rola: sem isso a roda
  // do mouse atravessa o overlay e leva o artigo embora por baixo.
  useEffect(() => {
    if (!expanded) return;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    return () => { body.style.overflow = prevOverflow; body.style.paddingRight = prevPadding; };
  }, [expanded]);

  // O foco entra no panel ao abrir e volta para onde estava ao fechar, senão o
  // teclado continua navegando o artigo escondido.
  useEffect(() => {
    if (!expanded) return;
    const previous = document.activeElement as HTMLElement | null;
    figureRef.current?.focus();
    return () => previous?.focus?.();
  }, [expanded]);

  // Teclado do panel: Esc fecha, o Tab circula DENTRO dele, e as setas e o
  // espaço dirigem a animação (quando há passos).
  //
  // As setas e o espaço valem **só quando o cursor não está num campo**: com um
  // input em edição, seta é mover o cursor e espaço é digitar um espaço; num
  // slider, seta é do próprio slider; e espaço com um botão em foco é o botão.
  // Sequestrar isso é pior que não ter atalho.
  useEffect(() => {
    if (!expanded) return;
    const inField = (alvo: EventTarget | null) =>
      !!(alvo as HTMLElement | null)?.closest?.(
        "input, textarea, select, [contenteditable='true']"
      );
    const focusables = () => {
      const panel = figureRef.current;
      if (!panel) return [] as HTMLElement[];
      const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      return [...panel.querySelectorAll<HTMLElement>(selector)].filter(
        (el) => !el.hasAttribute("disabled") && !el.closest("[inert]") && el.offsetParent !== null
      );
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setExpanded(false); return; }
      if (hasSteps && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        if (inField(e.target)) return;
        e.preventDefault(); // senão a seta rola o miolo junto
        stepBy(e.key === "ArrowRight" ? 1 : -1);
        return;
      }
      if (hasSteps && (e.key === " " || e.key === "Spacebar")) {
        if (inField(e.target) || (e.target as HTMLElement | null)?.closest?.("button")) return;
        e.preventDefault(); // espaço rolaria a área rolável
        togglePlay();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = figureRef.current;
      const items = focusables();
      if (!panel || !items.length) return;
      const first = items[0], last = items[items.length - 1];
      const active = document.activeElement;
      if (!panel.contains(active)) {
        // O foco já estava fora (scrollbar do navegador, por exemplo): traz de volta.
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [expanded, hasSteps, stepBy, togglePlay]);

  const inPanel = useCallback(
    (content: ReactNode): ReactNode => {
      if (!expanded || !mounted) return content;
      return createPortal(
        <div
          className="viz-overlay viz-overlay-fit"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false); }}
        >
          {content}
        </div>,
        document.body
      );
    },
    [expanded, mounted, title]
  );

  return {
    title,
    step,
    total,
    playing,
    speed,
    progress: total > 0 ? Math.round(((step + 1) / total) * 100) : 0,
    setStep: setRawStep,
    stepBy,
    togglePlay,
    reset,
    setSpeed: setSpeedClamped,
    expanded,
    open,
    collapsible,
    toggleOpen,
    toggleExpanded,
    blockId,
    figureProps: {
      className: "viz viz-fit",
      "data-codigo": open ? "on" : "off",
      "data-anim": animate && !measuring ? "on" : "off",
      ref: figureRef,
      tabIndex: -1,
    },
    bodyProps: { className: "viz-body", ref: bodyRef },
    blockProps: { id: blockId, inert: !open, "aria-hidden": !open || undefined },
    varsProps: { className: `viz-vars${open ? "" : " linha"}` },
    blockButtonProps: {
      className: "viz-expand viz-toggle-codigo",
      "aria-expanded": open,
      "aria-controls": blockId,
      onClick: toggleOpen,
      children: `${open ? "Ocultar" : "Mostrar"} ${blockName}`,
    },
    expandButtonProps: {
      className: "viz-expand",
      onClick: toggleExpanded,
      children: expanded ? "✕ Fechar" : "⤢ Expandir",
    },
    inPanel,
  };
}

// ---------------------------------------------------------------------------
// O cabeçalho e o rodapé são iguais em todo visualizador, então são componentes
// e não instruções num checklist: assim eles não divergem um do outro com o
// tempo. Os dois aceitam `children` para o que for específico do seu.
// ---------------------------------------------------------------------------

/** Bolinha + título à esquerda; passo, botão do bloco e Expandir à direita. */
export function VizHeader({
  viz,
  color,
  children,
}: {
  viz: Visualizer;
  /** Cor da bolinha. Padrão: o azul do tema. */
  color?: string;
  /** Entra no grupo da direita, antes do contador de step. */
  children?: ReactNode;
}) {
  return (
    <div className="viz-head">
      <div className="viz-head-title">
        <span className="dot" style={color ? { background: color } : undefined} />
        <span>{viz.title}</span>
      </div>
      <div className="viz-head-right">
        {children}
        {viz.total > 1 && (
          <span className="viz-step">passo {viz.step + 1} de {viz.total}</span>
        )}
        {viz.collapsible && <button {...viz.blockButtonProps} />}
        <button {...viz.expandButtonProps} />
      </div>
    </div>
  );
}

/**
 * Controles de reprodução + scrollbar de progresso, fora do `.viz-body` — é o que
 * os deixa parados no pé do panel expanded enquanto o miolo rola.
 * Não renderiza nada quando o visualizador não tem linha do tempo.
 */
export function VizFooter({
  viz,
  color,
  children,
  noSpeed = false,
}: {
  viz: Visualizer;
  /** Cor da scrollbar de progresso. Padrão: o azul do tema. */
  color?: string;
  /** Botões extras da linha de controles (presets, modos, step largo...). */
  children?: ReactNode;
  /** Para quem não tem animação contínua, só step a step. */
  noSpeed?: boolean;
}) {
  // Sem linha do tempo não há reprodução: passo, atalhos e barra de progresso
  // somem, como manda o contrato. Mas os botões extras do componente NÃO são da
  // linha do tempo, e engoli-los calado já custou dois rodapés escritos à mão
  // (SubTypesVisualizer e PrefixSumTradeoff, nesta mesma rodada). Sem `children`
  // não há o que desenhar, e aí o rodapé some inteiro.
  if (viz.total <= 1) {
    if (!children) return null;
    return (
      <div className="viz-foot">
        <div className="viz-controls">{children}</div>
      </div>
    );
  }
  return (
    <div className="viz-foot">
      <div className="viz-controls">
        <button className="viz-btn" title="Reiniciar" onClick={viz.reset}>↺</button>
        <button
          className="viz-btn"
          disabled={viz.step === 0}
          aria-keyshortcuts="ArrowLeft"
          onClick={() => viz.stepBy(-1)}
        >
          ‹ Anterior
        </button>
        <button className="viz-play" aria-keyshortcuts="Space" onClick={viz.togglePlay}>
          {viz.playing ? "❚❚ Pausar" : "▶ Rodar"}
        </button>
        <button
          className="viz-btn"
          disabled={viz.step === viz.total - 1}
          aria-keyshortcuts="ArrowRight"
          onClick={() => viz.stepBy(1)}
        >
          Próximo ›
        </button>
        {children}
        {/* Atalho que ninguém descobre é atalho que não existe. Só aparece no
            expanded, que é onde ele vale, e some em tela sem teclado. */}
        <p className="viz-atalhos">
          <kbd>←</kbd><kbd>→</kbd> passo <span>·</span> <kbd>espaço</kbd> roda
        </p>
        {!noSpeed && (
          <div className="viz-speed">
            <span>Velocidade</span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={viz.speed}
              onChange={(e) => viz.setSpeed(parseInt(e.target.value, 10))}
            />
            <span className="val">{SPEED_LABELS[viz.speed]}</span>
          </div>
        )}
      </div>
      <div className="viz-progress">
        <div
          className="viz-progress-fill"
          style={{ width: `${viz.progress}%`, ...(color ? { background: color } : null) }}
        />
      </div>
    </div>
  );
}
