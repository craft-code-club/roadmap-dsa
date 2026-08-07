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
  /**
   * A nota de um step, em português: o mesmo texto que o aluno vidente lê no
   * `.viz-note`. Sem ela a região viva diz só "passo N de M", que é o esqueleto
   * da aula e não a aula.
   *
   * É uma FUNÇÃO do step, e não a nota do step atual, porque o anúncio é montado
   * no mesmo `setState` que move o step (ver a nota da reprodução): o hook
   * precisa da nota do step de DESTINO. A adoção é de uma linha —
   * `stepNote: (i) => steps[i].note` — e é o próximo PR, não este.
   */
  stepNote?: (step: number) => string | undefined;
};

/**
 * O step atual e o que a região viva está dizendo, num estado só.
 *
 * `liveTotal` é o `total` com que a frase de `live` foi montada. Toda frase
 * daqui cita o total ("passo 1 de 8"), e o total pode mudar DEPOIS de a frase
 * estar escrita — daí guardar o número junto do texto, para a leitura poder
 * conferir se ele ainda vale. O porquê de conferir na leitura está no
 * `liveMessage`, lá embaixo. Campo obrigatório de propósito: assim o TypeScript
 * cobra quem acrescentar um caminho novo que escreve `live`.
 */
type Playback = { step: number; live: string; liveTotal: number };

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
  /**
   * O que a região viva do `VizHeader` está dizendo agora. Começa vazia: só a
   * interação do aluno escreve nela.
   */
  liveMessage: string;
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
  // `type` faz parte do contrato, e não é higiene: o padrão do HTML para
  // `<button>` é `submit`. Como estes dois objetos são espalhados em TODO
  // visualizador, declarar aqui é o que faz o conserto valer para os 62 de uma
  // vez, em vez de depender de cada arquivo lembrar.
  blockButtonProps: {
    type: "button";
    className: string;
    "aria-expanded": boolean;
    "aria-controls": string;
    onClick: () => void;
    children: string;
  };
  expandButtonProps: {
    type: "button";
    className: string;
    ref: React.RefObject<HTMLButtonElement | null>;
    onClick: () => void;
    children: string;
  };
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
    stepNote,
  } = options;

  const hasSteps = total > 1;

  // --------------------------------------------------------------- reprodução
  // O step e o texto da região viva moram no MESMO estado, e isso não é
  // arrumação: escrever a região num efeito à parte custa uma renderização a
  // mais por tecla, e essa renderização ENGOLE tecla. Medido, e reprodutível com
  // `--workers=1`: o percurso de 114 setas do `viz-quick-sort.spec.ts` parava no
  // passo 113. Com o anúncio montado dentro do mesmo `setState`, é um update por
  // tecla — exatamente o que era antes desta mudança.
  const [playback, setPlayback] = useState<Playback>({ step: 0, live: "", liveTotal: total });
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(initialSpeed);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const step = Math.max(0, Math.min(playback.step, total - 1));

  // `total` e `playing` por ref porque a tecla REPETE muito mais rápido que o
  // clique: ler o valor do closure engoliria repetições.
  const totalRef = useRef(total);
  const playingRef = useRef(false);
  // A nota chega por FUNÇÃO, e não por string, pela mesma razão: o anúncio é
  // montado junto com o step, então o hook precisa da nota do step de DESTINO,
  // que a renderização atual (a do step de origem) não conhece.
  const stepNoteRef = useRef(stepNote);
  useEffect(() => { totalRef.current = total; }, [total]);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  // O ref acompanha na MESMA chamada, e não só no efeito. Enquanto ele só era
  // escrito no efeito, todo `playing` recém-trocado tinha uma janela em que o
  // ref ainda dizia o contrário — e quem lê o ref para DECIDIR nessa janela
  // decide errado. Medido: `botao.click(); botao.click()` no mesmo tick
  // deixava a peça em "❚❚ Pausar", porque o segundo clique leu `false` e voltou
  // a mandar rodar em vez de pausar. O efeito acima continua, como rede para
  // qualquer caminho que mexa em `playing` sem passar por aqui.
  const setPlayingNow = useCallback((v: boolean) => {
    playingRef.current = v;
    setPlaying(v);
  }, []);
  useEffect(() => { stepNoteRef.current = stepNote; }, [stepNote]);

  const stop = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  }, []);
  useEffect(() => () => stop(), [stop]);

  // ------------------------------------------------- anúncio (leitor de tela)
  // O contador "passo N de M" é a única pista de que o algoritmo andou, e ele é
  // só visual: sem região viva o aluno cego aperta "Próximo ›", o algoritmo
  // anda, e ele não ouve nada — o visualizador vira um botão que não faz nada.
  //
  // A região começa VAZIA, e isso é parte do conserto: uma região viva já
  // preenchida na montagem faz as cinco peças de `intervals.mdx` falarem juntas
  // ao abrir a página, sem que ninguém tenha pedido. O HTML do build sai sem uma
  // palavra a mais por causa disto.
  //
  // E ela é escrita pela INTERAÇÃO, não pelo relógio: `aria-live="polite"` a
  // cada tick, na marcha 2x (250ms), enfileira falas que nunca alcançam a
  // animação — o leitor de tela ainda estaria no passo 3 com a tela no 12, e
  // ruído contínuo é pior que silêncio. Na reprodução automática a região diz só
  // o começo, a pausa e o fim.
  const fala = useCallback((n: number) => {
    const passo = `passo ${n + 1} de ${totalRef.current}`;
    const nota = stepNoteRef.current?.(n);
    return nota ? `${passo}. ${nota}` : passo;
  }, []);

  // A faixa é aplicada na LEITURA do estado guardado, e não na escrita do
  // `setStep`. Guardar o valor cru é o que faz um componente conseguir posicionar
  // o passo de uma entrada que ainda não chegou ao `total`: o "20 inteiros" do
  // `ArraysVisualizer` troca o array e pede o índice 16 no MESMO handler, com o
  // `total` ainda em 8. Medido no build servido — limitando na escrita, o
  // cabeçalho lê `passo 8 de 20` em vez de `passo 17 de 20`.
  //
  // Sem esta função, porém, o valor cru vaza do `step` (que é limitado na linha
  // acima) para a aritmética das setas e para o texto dos anúncios, e aí o
  // leitor de tela ouve um passo que não existe.
  const naFaixa = useCallback(
    (n: number) => Math.max(0, Math.min(n, totalRef.current - 1)),
    []
  );

  // Sem anúncio de propósito: quem chama isto é o componente (o step inicial de
  // uma peça, um salto calculado), não o aluno.
  //
  // "Sem anúncio" inclui não deixar de pé o anúncio ANTERIOR, que o salto acaba
  // de tornar falso. Medido no `ArraysVisualizer`: o `viz.reset()` do "20
  // inteiros" escreve "passo 1 de 8" e o `setStep(16)` da linha seguinte leva a
  // peça para o passo 17 de 20 — a região viva ficava afirmando o passo e o
  // total errados. O hook não tem como montar a frase certa aqui (o `total` novo
  // só chega no render seguinte), então ele cala em vez de mentir.
  const setStep = useCallback((n: number | ((s: number) => number)) => {
    setPlayback((p) => {
      const alvo = typeof n === "function" ? n(p.step) : n;
      return alvo === p.step && p.live === "" ? p : { ...p, step: alvo, live: "" };
    });
  }, []);

  const stepBy = useCallback((delta: number) => {
    stop();
    setPlayingNow(false);
    setPlayback((p) => {
      const alvo = naFaixa(naFaixa(p.step) + delta);
      const live = fala(alvo);
      return alvo === p.step && live === p.live
        ? p
        : { step: alvo, live, liveTotal: totalRef.current };
    });
  }, [stop, fala, naFaixa, setPlayingNow]);

  const togglePlay = useCallback(() => {
    if (playingRef.current) {
      stop();
      setPlayingNow(false);
      setPlayback((p) => ({
        ...p,
        live: `pausado no passo ${naFaixa(p.step) + 1} de ${totalRef.current}`,
        liveTotal: totalRef.current,
      }));
      return;
    }
    setPlayingNow(true);
    setPlayback((p) => {
      // no fim da animação, rodar de novo rebobina em vez de não fazer nada
      const atual = naFaixa(p.step);
      const de = atual >= totalRef.current - 1 ? 0 : atual;
      return {
        step: de,
        live: `rodando a partir do passo ${de + 1} de ${totalRef.current}`,
        liveTotal: totalRef.current,
      };
    });
  }, [stop, naFaixa, setPlayingNow]);

  const reset = useCallback(() => {
    stop();
    setPlayingNow(false);
    setPlayback({ step: 0, live: fala(0), liveTotal: totalRef.current });
  }, [stop, fala, setPlayingNow]);

  useEffect(() => {
    stop();
    if (!playing) return;
    timer.current = setInterval(
      // O relógio anda o step e NÃO escreve na região viva. O `p` devolvido no
      // fim preserva o bail-out do React, que é o que impede a renderização
      // inútil a cada tick depois do último step.
      () =>
        setPlayback((p) => {
          const atual = naFaixa(p.step);
          return atual >= totalRef.current - 1 ? p : { ...p, step: atual + 1 };
        }),
      speeds[speed]
    );
    return stop;
  }, [playing, speed, speeds, stop, naFaixa]);

  useEffect(() => {
    if (!playing || step < total - 1) return;
    setPlayingNow(false);
    // Aqui o total certo é o do RENDER, não o do ref: este efeito só dispara
    // depois de o render com o total novo ter acontecido.
    setPlayback((p) => ({ ...p, live: `fim da animação, passo ${total} de ${total}`, liveTotal: total }));
  }, [playing, step, total, setPlayingNow]);

  // -------------------------------------------------------------------- casca
  const blockId = useId();
  const figureRef = useRef<HTMLElement>(null);
  // O ⤢ Expandir, para devolver o foco a ele ao fechar o painel (ver o efeito do
  // foco abaixo). Ele é recriado na travessia do portal, e o ref acompanha.
  const expandButtonRef = useRef<HTMLButtonElement>(null);
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

  // ------------------------------ a animação não roda para quem não está vendo
  // O `setInterval` acima não olhava a tela: uma peça rolada para fora, ou uma
  // aba escondida, continuava andando. Cada tick é uma tarefa de main thread, e
  // na marcha 2x ela volta a cada 250ms — em `intervals.mdx`, que tem cinco
  // instâncias, isso é bateria queimada e INP piorando exatamente enquanto o
  // aluno rola e interage com a peça seguinte.
  //
  // Ao voltar à tela a peça fica PAUSADA de propósito: retomar sozinho
  // surpreende quem rolou de volta, e o ▶ Rodar à espera é mais honesto.
  //
  // Isto não conversa com a medição da casca: só mexe em `playing`, nunca em
  // `open`, `measuring` ou `measureTick`, e a medição é guardada por
  // `measuredRound`.
  //
  // Idempotente de propósito, sem guarda por `playingRef`: o ref só é escrito
  // num efeito, então existe uma janela — curta, e real — em que `playing` já é
  // `true` e o ref ainda é `false`, e nela a guarda descartaria a pausa. As três
  // linhas abaixo são no-op quando não há o que pausar (`stop` sem timer,
  // `setPlaying` com o mesmo valor e o bail-out do `setPlayback`), então a
  // primeira chamada do observer na montagem — que reporta o estado atual e
  // acontece em toda peça abaixo da dobra — continua não custando renderização.
  const pauseOffscreen = useCallback(() => {
    stop();
    setPlayingNow(false);
    // A região viva ficava dizendo "rodando a partir do passo N" com a peça
    // parada: a única pista de quem não enxerga afirmando o contrário do botão
    // ao lado. Ela CALA em vez de anunciar, porque pausa automática não é ação
    // do aluno — anunciá-la interromperia quem já está lendo outra coisa.
    setPlayback((p) => (p.live === "" ? p : { ...p, live: "" }));
  }, [stop, setPlayingNow]);

  useEffect(() => {
    const onHide = () => { if (document.hidden) pauseOffscreen(); };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [pauseOffscreen]);

  useEffect(() => {
    // No panel expanded a peça É a tela, e o `<figure>` troca de nó DOM ao
    // atravessar o portal: observar ali reportaria "saiu da tela" na travessia
    // e pausaria justamente a animação que o aluno acabou de expandir.
    if (expanded || typeof IntersectionObserver === "undefined") return;
    const figure = figureRef.current;
    if (!figure) return;
    const observer = new IntersectionObserver(
      (entries) => { if (!entries.some((e) => e.isIntersecting)) pauseOffscreen(); },
      { threshold: 0 }
    );
    observer.observe(figure);
    return () => observer.disconnect();
  }, [expanded, pauseOffscreen]);

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

  // O foco entra no panel ao abrir e volta para o botão que o abriu ao fechar,
  // senão o teclado continua navegando o artigo escondido.
  //
  // A volta é pelo REF do botão, e não pelo `document.activeElement` guardado na
  // abertura, que é o que estava aqui e não funcionava: aquele nó era o
  // `⤢ Expandir` de dentro da `<figure>` que o `createPortal` DESMONTA, então o
  // `focus()` da limpeza rodava num nó destacado — no-op silencioso — e o foco
  // caía no `<body>`. Medido em `/topico/big-o/` (a peça de referência do
  // contrato), `/topico/merge-sort/` e `/topico/intervals/`, pelas duas saídas:
  // `document.activeElement.tagName` era `BODY` nas seis leituras.
  //
  // Guardar a referência não resolve porque o botão é RECRIADO no fechamento; é
  // preciso reencontrá-lo depois. Ref e não seletor porque ref é IDENTIDADE:
  // `.viz-expand` casa DOIS botões (este e o de mostrar/ocultar o bloco), e
  // qualquer discriminante de texto ou de ordem quebra no dia em que o rótulo
  // mudar. O ref aponta sempre para o nó vivo daquele elemento, e é `null` se
  // não houver nenhum.
  //
  // E a devolução mora no CORPO do efeito, no ramo do `expanded === false`, e
  // não na LIMPEZA dele. Aqui a forma é o conserto, então vale registrar por quê:
  //
  // com `return () => expandButtonRef.current?.focus()`, o `react-hooks/
  // exhaustive-deps` reprova ("copie `.current` para uma variável dentro do
  // efeito e use a variável na limpeza") — e OBEDECER reintroduz exatamente o
  // defeito acima. A variável captura o nó DAQUELE momento, que é o `⤢ Expandir`
  // de dentro da `<figure>` que o portal vai desmontar: é o `document.
  // activeElement` guardado na abertura com outro nome. Medido, com a sugestão
  // da regra aplicada e o build visível: os dois testes de
  // `tests/viz-hook.spec.ts` reprovam com `Expected: "BUTTON"` /
  // `Received: "BODY"`, nas duas saídas.
  //
  // Ler o ref no corpo do efeito resolve os dois lados: a regra não dispara (ela
  // só vale para a limpeza) e a leitura acontece DEPOIS de o React ter
  // recriado o botão, no nó vivo — que é a única coisa que o conserto precisa.
  const esteveExpandido = useRef(false);
  useEffect(() => {
    if (expanded) {
      esteveExpandido.current = true;
      figureRef.current?.focus();
      return;
    }
    // Só devolve o foco a quem ABRIU o painel: na montagem `expanded` já é
    // `false`, e sem esta guarda toda peça da página roubaria o foco no load.
    if (!esteveExpandido.current) return;
    esteveExpandido.current = false;
    expandButtonRef.current?.focus();
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
    setStep,
    stepBy,
    togglePlay,
    reset,
    setSpeed: setSpeedClamped,
    // Um `total` novo torna FALSA qualquer frase já escrita, porque todas elas
    // citam o total: `viz.reset(); setNums(...)` no mesmo handler compõe
    // "passo 1 de 8" e no mesmo render a peça já tem 20 células. O mesmo vale
    // para a frase de `stepBy`, a de pausa e a de "rodando", que sobrevivem a
    // uma troca de entrada sem passar por `reset` nenhum. A região cala, e a
    // interação seguinte a reescreve com o número certo.
    //
    // A conferência é na LEITURA, e não num `useEffect([total])` que zera
    // `live`. As duas razões são medidas, e a primeira é mais sutil do que
    // parece:
    //
    // 1. Com o efeito, a frase falsa CHEGA ao DOM e sai no update seguinte —
    //    medido pelos `MutationRecord` da região: `characterData` saindo de
    //    "passo 5 de 8" e um `childList` removendo "passo 1 de 8". Ela não
    //    chega a ser PINTADA no caminho do evento discreto (`input`, `click`),
    //    porque aí o React esvazia o efeito antes da pintura — oito frames
    //    seguidos lidos por `requestAnimationFrame` já mostram vazio. Só que
    //    essa garantia é do evento discreto: `total` que muda por relógio, por
    //    transição ou por dado que chegou depois tem o efeito adiado para
    //    DEPOIS da pintura, e aí o frame com a frase falsa existe e vai para a
    //    árvore de acessibilidade. A guarda aqui não depende dessa distinção: o
    //    primeiro render com o total novo já sai `""` em qualquer caminho, e o
    //    texto falso nunca existe. Um invariante em vez de um detalhe de
    //    agendamento do React.
    // 2. Efeito que chama `setPlayback` custa uma renderização a mais por troca
    //    de `total`, e este arquivo documenta na declaração do `playback` que
    //    renderização a mais por interação ENGOLE tecla.
    //
    // Calar em vez de recontar com o total novo: a frase carrega também a nota
    // do step (`fala`), e `stepNoteRef` é atualizado num efeito — na
    // renderização em que o total mudou a nota é tão velha quanto ele.
    // Consertar só o número daria número verdadeiro colado em frase falsa. É a
    // mesma política já escrita para o `setStep`: calar em vez de mentir.
    liveMessage: playback.live && playback.liveTotal === total ? playback.live : "",
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
      type: "button",
      className: "viz-expand viz-toggle-codigo",
      "aria-expanded": open,
      "aria-controls": blockId,
      onClick: toggleOpen,
      children: `${open ? "Ocultar" : "Mostrar"} ${blockName}`,
    },
    expandButtonProps: {
      type: "button",
      className: "viz-expand",
      ref: expandButtonRef,
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
      {/* A região viva do visualizador: invisível para o olho, lida em voz alta
          quando o step muda. Ela mora aqui, ao lado do contador que duplica,
          porque `.viz-head` é o único pedaço do `<figure>` que TODOS os
          visualizadores da casca desenham. */}
      <span className="viz-sr" role="status" aria-live="polite" aria-atomic="true">
        {viz.liveMessage}
      </span>
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
    // Ausência, não falsidade: `0` e `""` são conteúdo legítimo e um `!children`
    // os engoliria — o mesmo tipo de sumiço silencioso que este conserto veio
    // resolver. `== null` cobre `null` e `undefined`; `false` entra junto porque
    // é o que sobra de um `{cond && <button/>}` com a condição falsa.
    if (children == null || children === false) return null;
    return (
      <div className="viz-foot">
        <div className="viz-controls">{children}</div>
      </div>
    );
  }
  return (
    <div className="viz-foot">
      <div className="viz-controls">
        {/* `aria-label` e não só `title`: o CONTEÚDO vence o `title` no cálculo
            do nome acessível, então o leitor de tela anunciava o nome Unicode do
            glifo (ou nada). Os quatro vizinhos desta linha têm texto; este era o
            único mudo. */}
        <button type="button" className="viz-btn" title="Reiniciar" aria-label="Reiniciar" onClick={viz.reset}>↺</button>
        <button
          type="button"
          className="viz-btn"
          disabled={viz.step === 0}
          aria-keyshortcuts="ArrowLeft"
          onClick={() => viz.stepBy(-1)}
        >
          ‹ Anterior
        </button>
        <button type="button" className="viz-play" aria-keyshortcuts="Space" onClick={viz.togglePlay}>
          {viz.playing ? "❚❚ Pausar" : "▶ Rodar"}
        </button>
        <button
          type="button"
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
          // `<label>`, e não a `<div>` de antes: o rótulo "Velocidade" estava
          // ao lado do slider e não ligado a ele, então o controle não tinha
          // nome acessível nenhum. É o mesmo padrão dos outros campos do
          // produto, e o CSS é por classe (`.viz-speed`), então a troca de tag
          // não muda um pixel.
          <label className="viz-speed">
            <span>Velocidade</span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={viz.speed}
              // Sem isto o leitor de tela anuncia o índice cru ("3 de 5"), que
              // não é o que a tela diz.
              aria-valuetext={SPEED_LABELS[viz.speed]}
              onChange={(e) => viz.setSpeed(parseInt(e.target.value, 10))}
            />
            {/* Fora do NOME do slider de propósito: dentro dele o nome mudaria
                a cada arrastada ("Velocidade 1x" → "Velocidade 2x"). O valor
                não se perde, ele é dito pelo `aria-valuetext` acima, que é o
                lugar do valor de um slider. */}
            <span className="val" aria-hidden="true">{SPEED_LABELS[viz.speed]}</span>
          </label>
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
