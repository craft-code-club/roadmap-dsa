"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { GROUPS, TOTAL_TOPICS, isEmptyTopic } from "@content/roadmap";
import { LINKS } from "@/lib/links";
import { useProgress } from "@/components/ProgressProvider";

// Grupos abertos no menu lateral, salvos no navegador (mesma ideia do progresso:
// sem login, sem servidor).
const KEY_MENU = "ccc-dsa-menu";

/** Ids válidos hoje. Grupo renomeado ou removido sai do que estava salvo. */
const IDS_DE_GRUPO = new Set(GROUPS.map((g) => g.id));

function lerAbertos(): Record<string, boolean> | null {
  try {
    const raw = localStorage.getItem(KEY_MENU);
    if (!raw) return null;
    const lista = JSON.parse(raw);
    if (!Array.isArray(lista)) return null;
    const mapa: Record<string, boolean> = {};
    for (const id of lista) if (typeof id === "string" && IDS_DE_GRUPO.has(id)) mapa[id] = true;
    return mapa;
  } catch {
    return null;
  }
}

function gravarAbertos(abertos: Record<string, boolean>) {
  try {
    localStorage.setItem(KEY_MENU, JSON.stringify(GROUPS.filter((g) => abertos[g.id]).map((g) => g.id)));
  } catch {
    /* modo privado / storage cheio, só ignora */
  }
}

/** Compara rotas ignorando a barra final (`trailingSlash: true` no next.config). */
const mesmaRota = (a: string | null | undefined, b: string) =>
  !!a && a.replace(/\/+$/, "") === b.replace(/\/+$/, "");

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { hydrated, isTopico, toggleTopico, contarTopicos } = useProgress();

  const slugAtivo = pathname?.startsWith("/topico/") ? pathname.split("/")[2] : null;

  // Onde o leitor está: o grupo do tópico aberto ou o grupo da página de
  // introdução dele. É o único grupo que o menu abre por conta própria.
  const grupoDaRota = useMemo(() => {
    const porTopico = slugAtivo && GROUPS.find((g) => g.topics.some((t) => t.slug === slugAtivo));
    if (porTopico) return porTopico.id;
    const porIntro = GROUPS.find((g) => g.intro && mesmaRota(pathname, g.intro.href));
    return porIntro?.id ?? null;
  }, [slugAtivo, pathname]);

  const [busca, setBusca] = useState("");
  // Primeira renderização (a mesma no HTML estático e na hidratação): o grupo da
  // rota, ou o primeiro grupo em páginas que não são de tópico (home, roadmap,
  // apoiar), para o menu nunca abrir todo fechado para quem chega agora. O que
  // estava salvo entra logo depois, no efeito — ler o localStorage aqui daria
  // divergência de hidratação.
  const [abertos, setAbertos] = useState<Record<string, boolean>>(() => ({
    [grupoDaRota ?? GROUPS[0].id]: true,
  }));
  const [mobileNav, setMobileNav] = useState(false);
  const [menu, setMenu] = useState(false);
  const [restaurado, setRestaurado] = useState(false);
  const listaRef = useRef<HTMLDivElement>(null);

  // Devolve o menu como o leitor deixou, mais o grupo de onde ele está agora —
  // esse nunca fica fechado. Quem tem histórico não recebe o grupo de abertura
  // junto: ele é o padrão de quem chega sem nada salvo, não um grupo fixo.
  // Roda uma vez, na montagem, e por isso lê o `grupoDaRota` da primeira
  // renderização; a partir daí quem cuida da troca de rota é o efeito abaixo.
  useEffect(() => {
    const salvos = lerAbertos();
    if (salvos) setAbertos(grupoDaRota ? { ...salvos, [grupoDaRota]: true } : salvos);
    setRestaurado(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salva depois de restaurar, nunca antes: gravar o estado inicial apagaria a
  // escolha do leitor com o padrão da rota antes mesmo de ele ver o menu.
  useEffect(() => {
    if (restaurado) gravarAbertos(abertos);
  }, [abertos, restaurado]);

  // Abre automaticamente o grupo do tópico aberto.
  useEffect(() => {
    if (grupoDaRota) setAbertos((a) => ({ ...a, [grupoDaRota]: true }));
  }, [grupoDaRota]);

  // Com os outros grupos fechados, o tópico atual pode ficar fora da parte
  // visível do menu — e aí o leitor não vê onde está. Rola só o container do
  // menu (nunca a página, que o `scrollIntoView` levaria junto) e só quando
  // precisa. `block: nearest` na mão: distância mínima, sem centralizar nada.
  useEffect(() => {
    const lista = listaRef.current;
    const atual = lista?.querySelector<HTMLElement>(".side-item.on");
    if (!lista || !atual) return;
    const item = atual.getBoundingClientRect();
    const caixa = lista.getBoundingClientRect();
    if (item.top < caixa.top) lista.scrollTop -= caixa.top - item.top + 8;
    else if (item.bottom > caixa.bottom) lista.scrollTop += item.bottom - caixa.bottom + 8;
    // `restaurado` está nas dependências porque os grupos salvos entram depois
    // da primeira pintura: eles empurram o tópico atual para baixo, e sem uma
    // segunda passada a conta acima teria sido feita sobre o menu errado.
    // `mobileNav` porque no celular o menu é uma gaveta com `display: none`: ao
    // carregar a página ele não tem medida nenhuma, e a conta só vale quando o
    // leitor abre a gaveta.
  }, [grupoDaRota, slugAtivo, pathname, restaurado, mobileNav]);

  // Fecha o menu lateral ao navegar (mobile).
  useEffect(() => setMobileNav(false), [pathname]);

  const feitosTotal = contarTopicos(GROUPS.flatMap((g) => g.topics.map((t) => t.slug)));
  const pct = hydrated && TOTAL_TOPICS ? Math.round((feitosTotal / TOTAL_TOPICS) * 100) : 0;

  const b = busca.trim().toLowerCase();

  const grupos = useMemo(
    () =>
      GROUPS.map((g) => {
        const itens = g.topics.filter((t) => !b || t.name.toLowerCase().includes(b));
        return { ...g, itens, aberto: b ? itens.length > 0 : !!abertos[g.id] };
      }).filter((g) => !b || g.itens.length > 0),
    [b, abertos]
  );

  // Com `trailingSlash: true`, a rota chega como "/roadmap/": comparar com o
  // href cru deixava Roadmap, Apoiar e Introdução sem o destaque de "você está aqui".
  const navOn = (href: string) => mesmaRota(pathname, href);

  return (
    <div className="shell">
      <header className="header">
        <div className="header-left">
          <button
            className="header-menu-toggle nav-icon"
            aria-label="Abrir menu de tópicos"
            onClick={() => setMobileNav((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
            <span className="brand-mark">DSA</span>
            <span>
              <span className="brand-name">Roadmap DSA</span>
              <span className="brand-sub">por Craft &amp; Code Club</span>
            </span>
          </Link>
          <nav className="topnav nav-left">
            <Link href="/" className={`nav-hide-sm${navOn("/") ? " on" : ""}`}>Início</Link>
            <Link href="/roadmap" className={`nav-hide-sm${navOn("/roadmap") ? " on" : ""}`}>Roadmap</Link>
          </nav>
        </div>

        <nav className="topnav nav-right">
          <a href={LINKS.youtube} className="nav-yt nav-hide-sm ext" target="_blank" rel="noopener noreferrer">
            <span className="dot" />YouTube<span className="ext-arrow" aria-hidden="true">↗</span>
          </a>
          <a href={LINKS.discord} className="nav-discord ext" target="_blank" rel="noopener noreferrer">
            <span className="dot" />Discord<span className="ext-arrow" aria-hidden="true">↗</span>
          </a>
          <Link href="/apoie" className={`nav-coffee${navOn("/apoie") ? " on" : ""}`}>
            <span className="dot" />Apoiar
          </Link>
          <span className="nav-more">
            <button className="nav-icon" aria-label="Mais opções" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
              </svg>
            </button>
            {menu && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 50 }} onClick={() => setMenu(false)} />
                <div className="nav-menu">
                  {/* somem da barra no mobile → voltam aqui */}
                  <Link className="menu-item only-mobile" href="/" onClick={() => setMenu(false)}>
                    <span className="mi-ico">⌂</span> Início
                  </Link>
                  <Link className="menu-item only-mobile" href="/roadmap" onClick={() => setMenu(false)}>
                    <span className="mi-ico">▤</span> Roadmap
                  </Link>
                  <a className="menu-item only-mobile ext" href={LINKS.youtube} target="_blank" rel="noopener noreferrer" onClick={() => setMenu(false)}>
                    <span className="mi-ico" style={{ color: "#ff0000" }}>▶</span> YouTube<span className="ext-arrow" aria-hidden="true">↗</span>
                  </a>
                  {/* sempre no menu: comunidade, código e apoio */}
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

      <aside className={`sidebar${mobileNav ? " open" : ""}`}>
        <div className="side-head">
          <div className="side-head-row">
            <span className="side-label">Sua trilha</span>
            <span className="side-count">{feitosTotal}/{TOTAL_TOPICS} · {pct}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <input
            className="side-search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar tópico…"
          />
        </div>

        <div className="side-scroll" ref={listaRef}>
          {grupos.map((g) => {
            const feitos = contarTopicos(g.topics.map((t) => t.slug));
            return (
              <div className="side-group" key={g.id}>
                {/* `aria-expanded` porque o triângulo é a única pista de aberto/fechado,
                    e ele é decoração: sem o atributo, quem usa leitor de tela ouve só
                    "Grafos, botão" e não sabe se está abrindo ou fechando o grupo. */}
                <button
                  className="side-group-btn"
                  aria-expanded={g.aberto}
                  onClick={() => setAbertos((a) => ({ ...a, [g.id]: !a[g.id] }))}
                >
                  <span className={`side-caret${g.aberto ? " open" : ""}`} aria-hidden="true">▸</span>
                  <span style={{ flex: 1 }}>{g.name}</span>
                  <span className="side-count">{feitos}/{g.topics.length}</span>
                </button>
                {g.aberto && (
                  <div className="side-items">
                    {g.intro && (
                      <Link
                        href={g.intro.href}
                        className={`side-item${navOn(g.intro.href) ? " on" : ""}`}
                        aria-current={navOn(g.intro.href) ? "page" : undefined}
                      >
                        <span className="side-intro-ico" aria-hidden="true">✦</span>
                        <span className="side-item-name">{g.intro.name}</span>
                      </Link>
                    )}
                    {g.itens.map((t) => {
                      const feito = isTopico(t.slug);
                      const ativo = slugAtivo === t.slug;
                      // "Em breve" é só para quem ainda não tem nada: se já existe vídeo,
                      // artigo ou visualização, o tópico é navegável como qualquer outro.
                      const vazio = isEmptyTopic(t);
                      return (
                        <Link
                          key={t.slug}
                          href={`/topico/${t.slug}`}
                          className={`side-item${ativo ? " on" : ""}${vazio ? " soon" : ""}`}
                          aria-current={ativo ? "page" : undefined}
                        >
                          <span
                            className={`side-check${feito ? " done" : ""}`}
                            role="checkbox"
                            aria-checked={feito}
                            tabIndex={0}
                            aria-label={`Marcar ${t.name} como concluído`}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleTopico(t.slug); }}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggleTopico(t.slug); } }}
                          >
                            {feito ? "✓" : ""}
                          </span>
                          <span className="side-item-name">{t.name}</span>
                          {t.isNew && <span className="badge-novo">NOVO</span>}
                          {vazio && <span className="badge-soon">em breve</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="side-apoio">
          <a className="apoio-card discord" href={LINKS.discord} target="_blank" rel="noopener noreferrer">
            <div className="apoio-title"><span className="dot" />Estude junto no Discord</div>
            <p>Dúvidas, revisão de código e maratonas semanais de problemas.</p>
          </a>
          <Link className="apoio-card coffee" href="/apoie">
            <div className="apoio-title"><span>♥</span>Seja um apoiador</div>
            <p>Ajude a manter a comunidade e o conteúdo livres, para todo mundo.</p>
          </Link>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
