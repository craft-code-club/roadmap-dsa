"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  FUNDAMENTOS,
  getRoadmap,
  getTopico,
  roadmapsDoTopico,
  urlDoRoadmap,
  type Roadmap,
} from "@content/roadmaps";
import { LINKS } from "@/lib/links";
import { mesmaRota } from "@/lib/ui";
import { RoadmapSidebar } from "@/components/RoadmapSidebar";
import { FundamentosSidebar } from "@/components/FundamentosSidebar";
import { TopicoSidebar } from "@/components/TopicoSidebar";

/** O endereço dos Fundamentos, derivado e não escrito: eles são um roadmap. */
const URL_DOS_FUNDAMENTOS = urlDoRoadmap(FUNDAMENTOS);

// A moldura do site: topo, gaveta lateral, conteúdo, rodapé.
//
// O que ela decide, e passou a decidir quando as trilhas chegaram, é UMA coisa:
// que roadmap fica ao lado do conteúdo. São três respostas, e a terceira é uma
// ausência:
//
//   roadmap   o menu dos 46 tópicos. É o padrão, e vale para todas as rotas que
//            já existiam: home, roadmap, introdução, apoie, sobre e os tópicos
//            do roadmap.
//   trilha    o menu daquela trilha, em `/roadmaps/<slug>/` e nos tópicos dele.
//   nenhuma  o tópico avulso e a vitrine `/roadmaps/`. Aqui a ausência é a
//            decisão: um tópico avulso é o assunto inteiro numa tela só, e uma
//            roadmap ao lado dela é um roadmap para lugar nenhum — 46 links que
//            não têm relação com o que o leitor está lendo, competindo com o
//            texto. Quem sai daqui sai pela banda "Continue explorando" no fim
//            do artigo, que mostra os vizinhos DE VERDADE.
//
// A decisão é derivada da rota, e não passada por prop, porque este componente
// mora no layout raiz: ele não recebe nada da página. O preço é o
// `usePathname`, que já era usado aqui para o destaque de "você está aqui".

type Layout =
  | { modo: "roadmap"; roadmap: Roadmap }
  | { modo: "topico"; slug: string; nome: string }
  | { modo: "solto" };

/**
 * A rota → a casca.
 *
 * Quatro respostas, e cada uma responde a uma pergunta diferente do leitor:
 *
 *   roadmap      "onde estou NESTE percurso?" — em `/roadmaps/<r>/…`, e os
 *                Fundamentos são um `<r>` como qualquer outro.
 *   topico       "isto faz parte de quê?" — em `/topicos/<slug>/`, onde o
 *                leitor chegou sem percurso nenhum e a barra lista os roadmaps.
 *   solto        nenhuma barra: a vitrine `/roadmaps/` e o índice `/topicos/`
 *                SÃO listas, e uma segunda lista ao lado é ruído.
 *
 * ⚠️ A comparação é pelo PRIMEIRO SEGMENTO da rota, por string. Renomear uma
 * rota e esquecer o `if` daqui não quebra build nem tipo: devolve a casca padrão
 * em silêncio, e o roadmap inteiro passa a abrir com a barra dos Fundamentos.
 * Já aconteceu; quem pegou foi o `tests/roadmaps.spec.ts`.
 */
function layoutDaRota(pathname: string | null): Layout {
  const partes = (pathname ?? "/").split("/").filter(Boolean);

  if (partes[0] === "roadmaps") {
    if (!partes[1]) return { modo: "solto" };
    const roadmap = getRoadmap(partes[1]);
    return roadmap ? { modo: "roadmap", roadmap } : { modo: "solto" };
  }

  if (partes[0] === "topicos") {
    if (!partes[1]) return { modo: "solto" };
    const t = getTopico(partes[1]);
    if (!t) return { modo: "solto" };
    // Tópico que nenhum roadmap cita não tem o que listar na barra.
    return roadmapsDoTopico(t.slug).length > 0
      ? { modo: "topico", slug: t.slug, nome: t.name }
      : { modo: "solto" };
  }

  // A home, a introdução, o apoie, o sobre: páginas que não pertencem a
  // percurso nenhum. Elas abriam com a barra dos Fundamentos, o que dizia ao
  // leitor que ele estava dentro da sequência quando não estava.
  return { modo: "roadmap", roadmap: FUNDAMENTOS };
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const layout = useMemo(() => layoutDaRota(pathname), [pathname]);
  const comLateral = layout.modo !== "solto";

  const [mobileNav, setMobileNav] = useState(false);
  const [menu, setMenu] = useState(false);

  // Fecha o menu lateral ao navegar (mobile).
  //
  // Um efeito só, e ele já cobre o caso novo: sair de um tópico do roadmap com a
  // gaveta aberta e cair num tópico avulso, onde a gaveta (e o botão de
  // fechar) não existem. O `layout` é DERIVADO do `pathname`, então não há
  // troca de casca sem troca de rota — um segundo efeito ouvindo `comLateral`
  // nunca dispararia sozinho.
  useEffect(() => setMobileNav(false), [pathname]);

  // Com `trailingSlash: true`, a rota chega como "/fundamentos/": comparar com o
  // href cru deixava Roadmap, Apoiar e Introdução sem o destaque de "você está aqui".
  const navOn = (href: string) => mesmaRota(pathname, href);
  // "Roadmaps" fica aceso em toda a área: a vitrine, a abertura de um roadmap,
  // os tópicos servidos dentro dele e os tópicos avulsos. Sem isto, o leitor
  // dentro de `/topicos/skip-list/` não teria pista nenhuma de onde está.
  // "Roadmaps" acende na vitrine e em qualquer roadmap que não seja os
  // Fundamentos, que têm item próprio na barra.
  // Os Fundamentos moram dentro de `/roadmaps/` como os outros, mas têm item
  // próprio na barra: quem está neles não deve ver "Roadmaps" aceso, senão os
  // dois itens acendem juntos e nenhum diz onde a pessoa está.
  const nosFundamentos = pathname?.startsWith(URL_DOS_FUNDAMENTOS) ?? false;
  const naAreaDeRoadmaps = (pathname?.startsWith("/roadmaps") ?? false) && !nosFundamentos;
  // "Tópicos" acende no índice e em toda página canônica de tópico.
  const naAreaDeTopicos = pathname?.startsWith("/topicos") ?? false;

  return (
    <div className={`shell${comLateral ? "" : " sem-lateral"}`}>
      {/* WCAG 2.4.1: antes desta linha eram 44 paradas de tabulação até o
          primeiro parágrafo em /topicos/dijkstra/, em toda página aberta. Ele é o
          primeiro filho do shell de propósito, e some da tela sem sair da ordem
          de foco (por isso não é `display: none`). */}
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>
      <header className="header">
        <div className="header-left">
          {/* O botão da gaveta só existe quando existe gaveta. Ele controla o
              `#menu-lateral` pelo `aria-controls`, e um controle apontando para
              um id que não está na página é uma promessa quebrada para quem usa
              leitor de tela. */}
          {comLateral && (
            <button
              type="button"
              className="header-menu-toggle nav-icon"
              aria-label="Menu de tópicos"
              aria-expanded={mobileNav}
              aria-controls="menu-lateral"
              onClick={() => setMobileNav((v) => !v)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <Link href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="brand-mark">DSA</span>
            <span>
              <span className="brand-name">Roadmap DSA</span>
              <span className="brand-sub">por Craft &amp; Code Club</span>
            </span>
          </Link>
          {/* Cada landmark com nome próprio: são três `nav` na página, e sem
              rótulo o leitor de tela anuncia "navegação" três vezes. */}
          <nav className="topnav nav-left" aria-label="Principal">
            {/* `nav-hide-md`, e não `nav-hide-sm`: "Início" é o primeiro a sair
                da barra (940px) porque é o único item cujo destino já tem outro
                caminho visível ao lado dele — o logo. */}
            <Link href="/" className={`nav-hide-md${navOn("/") ? " on" : ""}`}>Início</Link>
            <Link href={URL_DOS_FUNDAMENTOS} className={`nav-hide-sm${nosFundamentos ? " on" : ""}`}>Fundamentos</Link>
            <Link href="/roadmaps" className={`nav-hide-sm${naAreaDeRoadmaps ? " on" : ""}`}>Roadmaps</Link>
            <Link href="/topicos" className={`nav-hide-sm${naAreaDeTopicos ? " on" : ""}`}>Tópicos</Link>
          </nav>
        </div>

        <nav className="topnav nav-right" aria-label="Comunidade e apoio">
          {/* Sai junto com o "Início", em 940px: é o mais leve dos três da
              direita (Discord e Apoiar têm borda de marca) e já era o primeiro
              a sair no celular. */}
          <a href={LINKS.youtube} className="nav-yt nav-hide-md ext" target="_blank" rel="noopener noreferrer">
            <span className="dot" />YouTube<span className="ext-arrow" aria-hidden="true">↗</span>
          </a>
          <a href={LINKS.discord} className="nav-discord ext" target="_blank" rel="noopener noreferrer">
            <span className="dot" />Discord<span className="ext-arrow" aria-hidden="true">↗</span>
          </a>
          <Link href="/apoie" className={`nav-coffee${navOn("/apoie") ? " on" : ""}`}>
            <span className="dot" />Apoiar
          </Link>
          <span className="nav-more">
            <button type="button" className="nav-icon" aria-label="Mais opções" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
              </svg>
            </button>
            {menu && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={() => setMenu(false)} />
                <div className="nav-menu">
                  {/* Somem da barra → voltam aqui, e cada um no degrau em que
                      saiu: `only-md` abre em 940px (Início e YouTube),
                      `only-mobile` sozinho em 760px (o resto da esquerda).
                      Nada sai da barra sem ter para onde ir. */}
                  <Link className="menu-item only-mobile only-md" href="/" onClick={() => setMenu(false)}>
                    <span className="mi-ico">⌂</span> Início
                  </Link>
                  <Link className="menu-item only-mobile" href={URL_DOS_FUNDAMENTOS} onClick={() => setMenu(false)}>
                    <span className="mi-ico">▤</span> Fundamentos
                  </Link>
                  <Link className="menu-item only-mobile" href="/roadmaps" onClick={() => setMenu(false)}>
                    <span className="mi-ico">✧</span> Roadmaps
                  </Link>
                  <Link className="menu-item only-mobile" href="/topicos" onClick={() => setMenu(false)}>
                    <span className="mi-ico">≡</span> Todos os tópicos
                  </Link>
                  <a className="menu-item only-mobile only-md ext" href={LINKS.youtube} target="_blank" rel="noopener noreferrer" onClick={() => setMenu(false)}>
                    <span className="mi-ico" style={{ color: "#ff0000" }}>▶</span> YouTube<span className="ext-arrow" aria-hidden="true">↗</span>
                  </a>
                  {/* sempre no menu, e a `/sobre` primeiro: é a resposta à
                      pergunta "quem escreveu isto?", que vem antes de qualquer
                      link para fora. */}
                  <Link className="menu-item" href="/sobre" onClick={() => setMenu(false)}>
                    <span className="mi-ico">ⓘ</span> Sobre o projeto
                  </Link>
                  <a className="menu-item ext" href={LINKS.site} target="_blank" rel="noopener noreferrer">
                    <span className="mi-ico">✦</span> Craft &amp; Code Club<span className="ext-arrow" aria-hidden="true">↗</span>
                  </a>
                  <a className="menu-item ext" href={LINKS.github} target="_blank" rel="noopener noreferrer">
                    <span className="mi-ico">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 22 12c0-5.52-4.48-10-10-10z" /></svg>
                    </span>
                    GitHub do projeto<span className="ext-arrow" aria-hidden="true">↗</span>
                  </a>
                  <Link className="menu-item" href="/apoie" onClick={() => setMenu(false)}>
                    <span className="mi-ico">♥</span> Apoiadores e Parceiros
                  </Link>
                </div>
              </>
            )}
          </span>
        </nav>
      </header>

      {/* `nav`, e não `aside`: o roadmap inteiro é navegação, e o landmark
          "complementar" do `aside` mandava o leitor de tela procurar o menu de
          tópicos fora da lista de navegação da página.
          O `aria-label` diz QUAL lista é esta: com duas barras laterais
          possíveis, um rótulo fixo faria o leitor de tela anunciar "Roadmap de
          estudos" ao lado de uma trilha que não é o roadmap. */}
      {comLateral && (
        <nav
          id="menu-lateral"
          className={`sidebar${mobileNav ? " open" : ""}`}
          aria-label={
            layout.modo === "roadmap"
              ? layout.roadmap.slug === FUNDAMENTOS.slug
                ? "Fundamentos"
                : `Roadmap: ${layout.roadmap.name}`
              : layout.modo === "topico"
                ? `Roadmaps com ${layout.nome}`
                : "Fundamentos"
          }
        >
          {layout.modo === "topico" ? (
            <TopicoSidebar slug={layout.slug} nome={layout.nome} />
          ) : layout.modo === "roadmap" && layout.roadmap.slug !== FUNDAMENTOS.slug ? (
            <RoadmapSidebar roadmap={layout.roadmap} mobileNav={mobileNav} />
          ) : (
            <FundamentosSidebar mobileNav={mobileNav} />
          )}
        </nav>
      )}

      {/* `tabIndex={-1}` para o link de pular ter onde pousar o foco: sem ele o
          navegador rola até o conteúdo e deixa o foco no começo da página, e o
          Tab seguinte volta para o menu. */}
      <main className="main" id="conteudo" tabIndex={-1}>
        {children}

        {/*
          O rodapé vive AQUI, e não na home, porque ele é a única coisa da
          página que diz quem publica. Ele existia só em `src/app/page.tsx`, e o
          resultado medido era este: a home tinha rodapé e as 34 páginas de aula
          tinham ZERO. Quem chega numa delas pela busca não tinha caminho nenhum
          para descobrir de quem é o material.

          Sem links: a barra de navegação é fixa e já leva a tudo que estava
          aqui (Sobre, GitHub, Discord, Apoiar). Rodapé que repete o menu é
          segundo lugar para a mesma verdade envelhecer.
        */}
        <footer className="site-foot">
          <div className="foot-text">
            <span>Feito <span className="heart">♥</span> pela comunidade, para a comunidade.</span>
            <span className="foot-sep">·</span>
            <span>Open source · gratuito para sempre</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
