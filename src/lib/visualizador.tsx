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
// useVisualizador — a casca comum de um visualizador do Roadmap DSA.
//
// Cobre só o que TODO visualizador tem, e nada do que cada um mostra:
//
//   · a peça caber na altura da tela do aluno (medição, não breakpoint);
//   · o painel expandido com cabeçalho e controles parados, e o teclado
//     dirigindo a animação;
//   · o bloco que pode ser mostrado ou ocultado (quase sempre o código);
//   · os controles de reprodução: passo, rodar/pausar, velocidade, progresso.
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
//   · o painel ser um diálogo de verdade: rolagem travada, foco entrando e
//     voltando, e o Tab circulando dentro (sem isso, `aria-modal` mente);
//   · avançar passo pela forma funcional do `setState` (a tecla repete muito
//     mais rápido que o clique e engole repetições lidas do closure).
// ---------------------------------------------------------------------------

// `useLayoutEffect` não existe no servidor, e o build é estático. O alias evita
// o aviso do React sem abrir mão de medir ANTES da pintura no navegador.
const useEfeitoLayout = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Folga de arredondamento: abaixo disso "estourar" é ruído de subpixel.
const FOLGA = 8;
// Respiro para a peça não colar na borda de baixo da janela, no fluxo do artigo.
const RESPIRO_INLINE = 24;
// Fallback da altura do cabeçalho fixo, para quando o token não resolve.
const HEADER_PADRAO = 60;

/** Intervalos em ms por marcha. O índice 0 não é usado (a barra vai de 1 a 5). */
export const VELOCIDADES_PADRAO = [0, 1400, 950, 650, 420, 250] as const;
export const ROTULOS_VELOCIDADE = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"] as const;

/** A altura do cabeçalho vem do token do CSS, que é a fonte da verdade dela. */
function alturaDoCabecalho(): number {
  if (typeof document === "undefined") return HEADER_PADRAO;
  const bruto = getComputedStyle(document.documentElement).getPropertyValue("--ccc-header-h");
  const px = parseFloat(bruto);
  return Number.isFinite(px) && px > 0 ? px : HEADER_PADRAO;
}

export type OpcoesVisualizador = {
  /** Título do visualizador. Vai no cabeçalho e vira o `aria-label` do diálogo. */
  titulo: string;
  /**
   * Quantos passos a animação tem. `1` (ou menos) = visualizador sem linha do
   * tempo: ele ganha a casca e o painel, e nenhum controle de reprodução.
   */
  total: number;
  /**
   * Intervalo em ms de cada marcha. Cada visualizador tem o seu ritmo — um
   * passo de sudoku e um de troca de array não pedem o mesmo tempo.
   */
  velocidades?: readonly number[];
  /** Marcha inicial (índice em `velocidades`). Padrão: 3, que é o "1x". */
  velocidadeInicial?: number;
  /**
   * Nome do bloco que some, usado no rótulo do botão ("Mostrar código").
   * Troque quando o bloco não for código — o rótulo tem que dizer o que some.
   */
  bloco?: string;
  /**
   * `false` quando não há bloco dispensável (um SVG de árvore, um canvas): a
   * peça ganha o painel com cabeçalho e controles parados, e nada mais. Não
   * invente um bloco só para ter o botão.
   */
  recolhivel?: boolean;
  /**
   * O que MAIS muda a altura da peça e pede medição nova: o modo selecionado, o
   * tamanho da entrada, o preset. Use **valores primitivos**. Expandir e
   * redimensionar já entram sozinhos.
   */
  medirQuando?: readonly unknown[];
};

export type Visualizador = {
  titulo: string;
  // --- reprodução ---
  /** Passo atual, já limitado a `[0, total - 1]`. */
  passo: number;
  total: number;
  tocando: boolean;
  velocidade: number;
  /** Progresso em %, para a barra. */
  pct: number;
  setPasso: (n: number | ((s: number) => number)) => void;
  /** Anda `delta` passos e pausa. Use -1 e +1. */
  irPasso: (delta: number) => void;
  alternarPlay: () => void;
  /** Volta ao passo 0 e pausa. Chame quando a entrada do visualizador mudar. */
  reiniciar: () => void;
  setVelocidade: (i: number) => void;
  // --- casca ---
  expandido: boolean;
  /** O bloco recolhível está à mostra? Sempre `true` quando `recolhivel: false`. */
  aberto: boolean;
  recolhivel: boolean;
  alternarAberto: () => void;
  alternarExpandido: () => void;
  idBloco: string;
  propsFigura: {
    className: string;
    "data-codigo": "on" | "off";
    "data-anim": "on" | "off";
    ref: React.RefObject<HTMLElement | null>;
    tabIndex: -1;
  };
  propsCorpo: { className: string; ref: React.RefObject<HTMLDivElement | null> };
  /** No elemento recolhível (normalmente o `.viz-code`), dentro do `.viz-code-slot`. */
  propsBloco: { id: string; inert: boolean; "aria-hidden": true | undefined };
  /** No painel de variáveis: vira fileira quando o bloco recolhe. */
  propsVars: { className: string };
  propsBotaoBloco: {
    className: string;
    "aria-expanded": boolean;
    "aria-controls": string;
    onClick: () => void;
    children: string;
  };
  propsBotaoExpandir: { className: string; onClick: () => void; children: string };
  /** Envolve o `<figure>` no overlay quando expandido. Use no `return`. */
  emPainel: (conteudo: ReactNode) => ReactNode;
};

export function useVisualizador(opcoes: OpcoesVisualizador): Visualizador {
  const {
    titulo,
    total,
    velocidades = VELOCIDADES_PADRAO,
    velocidadeInicial = 3,
    bloco = "código",
    recolhivel = true,
    medirQuando = [],
  } = opcoes;

  const temPassos = total > 1;

  // --------------------------------------------------------------- reprodução
  const [passoBruto, setPassoBruto] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(velocidadeInicial);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const passo = Math.max(0, Math.min(passoBruto, total - 1));

  // `total` e `tocando` por ref porque a tecla REPETE muito mais rápido que o
  // clique: ler o valor do closure engoliria repetições.
  const totalRef = useRef(total);
  const tocandoRef = useRef(false);
  useEffect(() => { totalRef.current = total; }, [total]);
  useEffect(() => { tocandoRef.current = tocando; }, [tocando]);

  const parar = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
  }, []);
  useEffect(() => () => parar(), [parar]);

  const irPasso = useCallback((delta: number) => {
    parar();
    setTocando(false);
    setPassoBruto((s) => Math.max(0, Math.min(s + delta, totalRef.current - 1)));
  }, [parar]);

  const alternarPlay = useCallback(() => {
    if (tocandoRef.current) { parar(); setTocando(false); return; }
    // no fim da animação, rodar de novo rebobina em vez de não fazer nada
    setPassoBruto((s) => (s >= totalRef.current - 1 ? 0 : s));
    setTocando(true);
  }, [parar]);

  const reiniciar = useCallback(() => {
    parar();
    setTocando(false);
    setPassoBruto(0);
  }, [parar]);

  useEffect(() => {
    parar();
    if (!tocando) return;
    timer.current = setInterval(
      () => setPassoBruto((s) => (s >= totalRef.current - 1 ? s : s + 1)),
      velocidades[velocidade]
    );
    return parar;
  }, [tocando, velocidade, velocidades, parar]);

  useEffect(() => {
    if (tocando && passo >= total - 1) setTocando(false);
  }, [tocando, passo, total]);

  // -------------------------------------------------------------------- casca
  const idBloco = useId();
  const figRef = useRef<HTMLElement>(null);
  const corpoRef = useRef<HTMLDivElement>(null);

  const [expandido, setExpandido] = useState(false);
  const [montado, setMontado] = useState(false);
  const [aberto, setAberto] = useState(true);
  const [fontesProntas, setFontesProntas] = useState(false);
  // Decisão automática não anima; clique do aluno anima. `medindo` congela a
  // transição enquanto a medição acontece — sem isso, a leitura pega a altura
  // do meio do percurso e conclui "cabe" para uma peça que não cabe.
  const [animar, setAnimar] = useState(false);
  const [medindo, setMedindo] = useState(false);
  // `null` = ninguém escolheu na mão, a medição manda.
  const escolhaManual = useRef<boolean | null>(null);
  const [aferir, setAferir] = useState(0);
  const rodadaMedida = useRef(-1);

  useEffect(() => setMontado(true), []);

  useEffect(() => {
    if (!recolhivel) return;
    let vivo = true;
    const ok = () => { if (vivo) setFontesProntas(true); };
    if (typeof document !== "undefined" && document.fonts) document.fonts.ready.then(ok, ok);
    else ok();
    return () => { vivo = false; };
  }, [recolhivel]);

  // Chave em vez de spread: array de dependências precisa ter tamanho fixo.
  const chaveMedida = medirQuando.join("");

  // Trocar de contexto zera a escolha manual: abrir o painel grande é um pedido
  // novo de "mostre isso do melhor jeito nesta tela".
  useEfeitoLayout(() => { escolhaManual.current = null; }, [expandido]);

  useEfeitoLayout(() => { setAferir((a) => a + 1); }, [expandido, chaveMedida, fontesProntas]);

  // Duas passadas dentro do MESMO quadro (efeito de layout roda antes da
  // pintura, então nada disso aparece na tela):
  //   1 — congela a animação e abre o bloco, que é o pior caso de altura;
  //   2 — mede o layout já estável e decide.
  useEfeitoLayout(() => {
    if (!recolhivel || !fontesProntas || escolhaManual.current !== null) return;
    if (rodadaMedida.current === aferir) return;
    if (!medindo || !aberto) { setMedindo(true); setAberto(true); return; }
    const fig = figRef.current, corpo = corpoRef.current;
    if (!fig || !corpo) return;
    rodadaMedida.current = aferir;
    const estoura = expandido
      // Expandido: o miolo é a única área rolável, então "não coube" é ele
      // precisar de mais altura do que a janela deixou para ele.
      ? corpo.scrollHeight > corpo.clientHeight + FOLGA
      // No fluxo do artigo a régua é a janela: se a peça inteira não cabe numa
      // tela, o aluno olha o conteúdo sem enxergar os botões que o movem.
      : fig.getBoundingClientRect().height >
        window.innerHeight - alturaDoCabecalho() - RESPIRO_INLINE - FOLGA;
    if (estoura) setAberto(false);
    // Só no quadro seguinte, para o recolhimento desta decisão não animar.
    requestAnimationFrame(() => { setMedindo(false); setAnimar(true); });
  }, [aberto, aferir, expandido, fontesProntas, medindo, recolhivel]);

  useEffect(() => {
    if (!recolhivel) return;
    let quadro = 0;
    const aoRedimensionar = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => setAferir((a) => a + 1));
    };
    window.addEventListener("resize", aoRedimensionar);
    return () => { cancelAnimationFrame(quadro); window.removeEventListener("resize", aoRedimensionar); };
  }, [recolhivel]);

  const alternarAberto = useCallback(() => {
    setAberto((a) => {
      // Anotar dentro do updater mantém leitura e escrita no mesmo valor mesmo
      // em clique rápido; em StrictMode roda duas vezes com o mesmo resultado.
      escolhaManual.current = !a;
      return !a;
    });
  }, []);

  const alternarExpandido = useCallback(() => setExpandido((e) => !e), []);

  // ---------------------------------------------------- o painel como diálogo
  // Enquanto o painel está aberto ele é a única coisa que rola: sem isso a roda
  // do mouse atravessa o overlay e leva o artigo embora por baixo.
  useEffect(() => {
    if (!expandido) return;
    const corpo = document.body;
    const overflowAntes = corpo.style.overflow;
    const padAntes = corpo.style.paddingRight;
    const barra = window.innerWidth - document.documentElement.clientWidth;
    corpo.style.overflow = "hidden";
    if (barra > 0) corpo.style.paddingRight = `${barra}px`;
    return () => { corpo.style.overflow = overflowAntes; corpo.style.paddingRight = padAntes; };
  }, [expandido]);

  // O foco entra no painel ao abrir e volta para onde estava ao fechar, senão o
  // teclado continua navegando o artigo escondido.
  useEffect(() => {
    if (!expandido) return;
    const anterior = document.activeElement as HTMLElement | null;
    figRef.current?.focus();
    return () => anterior?.focus?.();
  }, [expandido]);

  // Teclado do painel: Esc fecha, o Tab circula DENTRO dele, e as setas e o
  // espaço dirigem a animação (quando há passos).
  //
  // As setas e o espaço valem **só quando o cursor não está num campo**: com um
  // input em edição, seta é mover o cursor e espaço é digitar um espaço; num
  // slider, seta é do próprio slider; e espaço com um botão em foco é o botão.
  // Sequestrar isso é pior que não ter atalho.
  useEffect(() => {
    if (!expandido) return;
    const emCampo = (alvo: EventTarget | null) =>
      !!(alvo as HTMLElement | null)?.closest?.(
        "input, textarea, select, [contenteditable='true']"
      );
    const focaveis = () => {
      const painel = figRef.current;
      if (!painel) return [] as HTMLElement[];
      const seletor = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      return [...painel.querySelectorAll<HTMLElement>(seletor)].filter(
        (el) => !el.hasAttribute("disabled") && !el.closest("[inert]") && el.offsetParent !== null
      );
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setExpandido(false); return; }
      if (temPassos && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        if (emCampo(e.target)) return;
        e.preventDefault(); // senão a seta rola o miolo junto
        irPasso(e.key === "ArrowRight" ? 1 : -1);
        return;
      }
      if (temPassos && (e.key === " " || e.key === "Spacebar")) {
        if (emCampo(e.target) || (e.target as HTMLElement | null)?.closest?.("button")) return;
        e.preventDefault(); // espaço rolaria a área rolável
        alternarPlay();
        return;
      }
      if (e.key !== "Tab") return;
      const painel = figRef.current;
      const itens = focaveis();
      if (!painel || !itens.length) return;
      const primeiro = itens[0], ultimo = itens[itens.length - 1];
      const ativo = document.activeElement;
      if (!painel.contains(ativo)) {
        // O foco já estava fora (barra do navegador, por exemplo): traz de volta.
        e.preventDefault();
        (e.shiftKey ? ultimo : primeiro).focus();
      } else if (e.shiftKey && (ativo === primeiro || ativo === painel)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && ativo === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [expandido, temPassos, irPasso, alternarPlay]);

  const emPainel = useCallback(
    (conteudo: ReactNode): ReactNode => {
      if (!expandido || !montado) return conteudo;
      return createPortal(
        <div
          className="viz-overlay viz-overlay-fit"
          role="dialog"
          aria-modal="true"
          aria-label={titulo}
          onClick={(e) => { if (e.target === e.currentTarget) setExpandido(false); }}
        >
          {conteudo}
        </div>,
        document.body
      );
    },
    [expandido, montado, titulo]
  );

  return {
    titulo,
    passo,
    total,
    tocando,
    velocidade,
    pct: total > 0 ? Math.round(((passo + 1) / total) * 100) : 0,
    setPasso: setPassoBruto,
    irPasso,
    alternarPlay,
    reiniciar,
    setVelocidade,
    expandido,
    aberto,
    recolhivel,
    alternarAberto,
    alternarExpandido,
    idBloco,
    propsFigura: {
      className: "viz viz-fit",
      "data-codigo": aberto ? "on" : "off",
      "data-anim": animar && !medindo ? "on" : "off",
      ref: figRef,
      tabIndex: -1,
    },
    propsCorpo: { className: "viz-body", ref: corpoRef },
    propsBloco: { id: idBloco, inert: !aberto, "aria-hidden": !aberto || undefined },
    propsVars: { className: `viz-vars${aberto ? "" : " linha"}` },
    propsBotaoBloco: {
      className: "viz-expand viz-toggle-codigo",
      "aria-expanded": aberto,
      "aria-controls": idBloco,
      onClick: alternarAberto,
      children: `${aberto ? "Ocultar" : "Mostrar"} ${bloco}`,
    },
    propsBotaoExpandir: {
      className: "viz-expand",
      onClick: alternarExpandido,
      children: expandido ? "✕ Fechar" : "⤢ Expandir",
    },
    emPainel,
  };
}

// ---------------------------------------------------------------------------
// O cabeçalho e o rodapé são iguais em todo visualizador, então são componentes
// e não instruções num checklist: assim eles não divergem um do outro com o
// tempo. Os dois aceitam `children` para o que for específico do seu.
// ---------------------------------------------------------------------------

/** Bolinha + título à esquerda; passo, botão do bloco e Expandir à direita. */
export function VizCabecalho({
  viz,
  cor,
  children,
}: {
  viz: Visualizador;
  /** Cor da bolinha. Padrão: o azul do tema. */
  cor?: string;
  /** Entra no grupo da direita, antes do contador de passo. */
  children?: ReactNode;
}) {
  return (
    <div className="viz-head">
      <div className="viz-head-title">
        <span className="dot" style={cor ? { background: cor } : undefined} />
        <span>{viz.titulo}</span>
      </div>
      <div className="viz-head-right">
        {children}
        {viz.total > 1 && (
          <span className="viz-step">passo {viz.passo + 1} de {viz.total}</span>
        )}
        {viz.recolhivel && <button {...viz.propsBotaoBloco} />}
        <button {...viz.propsBotaoExpandir} />
      </div>
    </div>
  );
}

/**
 * Controles de reprodução + barra de progresso, fora do `.viz-body` — é o que
 * os deixa parados no pé do painel expandido enquanto o miolo rola.
 * Não renderiza nada quando o visualizador não tem linha do tempo.
 */
export function VizRodape({
  viz,
  cor,
  children,
  semVelocidade = false,
}: {
  viz: Visualizador;
  /** Cor da barra de progresso. Padrão: o azul do tema. */
  cor?: string;
  /** Botões extras da linha de controles (presets, modos, passo largo...). */
  children?: ReactNode;
  /** Para quem não tem animação contínua, só passo a passo. */
  semVelocidade?: boolean;
}) {
  if (viz.total <= 1) return null;
  return (
    <div className="viz-foot">
      <div className="viz-controls">
        <button className="viz-btn" title="Reiniciar" onClick={viz.reiniciar}>↺</button>
        <button
          className="viz-btn"
          disabled={viz.passo === 0}
          aria-keyshortcuts="ArrowLeft"
          onClick={() => viz.irPasso(-1)}
        >
          ‹ Anterior
        </button>
        <button className="viz-play" aria-keyshortcuts="Space" onClick={viz.alternarPlay}>
          {viz.tocando ? "❚❚ Pausar" : "▶ Rodar"}
        </button>
        <button
          className="viz-btn"
          disabled={viz.passo === viz.total - 1}
          aria-keyshortcuts="ArrowRight"
          onClick={() => viz.irPasso(1)}
        >
          Próximo ›
        </button>
        {children}
        {/* Atalho que ninguém descobre é atalho que não existe. Só aparece no
            expandido, que é onde ele vale, e some em tela sem teclado. */}
        <p className="viz-atalhos">
          <kbd>←</kbd><kbd>→</kbd> passo <span>·</span> <kbd>espaço</kbd> roda
        </p>
        {!semVelocidade && (
          <div className="viz-speed">
            <span>Velocidade</span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={viz.velocidade}
              onChange={(e) => viz.setVelocidade(parseInt(e.target.value, 10))}
            />
            <span className="val">{ROTULOS_VELOCIDADE[viz.velocidade]}</span>
          </div>
        )}
      </div>
      <div className="viz-progress">
        <div
          className="viz-progress-fill"
          style={{ width: `${viz.pct}%`, ...(cor ? { background: cor } : null) }}
        />
      </div>
    </div>
  );
}
