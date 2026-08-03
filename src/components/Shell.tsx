"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GROUPS, TOTAL_TOPICS, isEmptyTopic } from "@content/roadmap";
import { LINKS } from "@/lib/links";
import { useProgress } from "@/components/ProgressProvider";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { hydrated, isTopico, toggleTopico, contarTopicos } = useProgress();

  const [busca, setBusca] = useState("");
  const [abertos, setAbertos] = useState<Record<string, boolean>>({ introducao: true, "arrays-strings": true });
  const [mobileNav, setMobileNav] = useState(false);
  const [menu, setMenu] = useState(false);

  const slugAtivo = pathname?.startsWith("/topico/") ? pathname.split("/")[2] : null;

  // Abre automaticamente o grupo do tópico aberto.
  useEffect(() => {
    if (!slugAtivo) return;
    const g = GROUPS.find((grp) => grp.topics.some((t) => t.slug === slugAtivo));
    if (g) setAbertos((a) => ({ ...a, [g.id]: true }));
  }, [slugAtivo]);

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

  const navOn = (href: string) => pathname === href;

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

        <div className="side-scroll">
          {grupos.map((g) => {
            const feitos = contarTopicos(g.topics.map((t) => t.slug));
            return (
              <div className="side-group" key={g.id}>
                <button className="side-group-btn" onClick={() => setAbertos((a) => ({ ...a, [g.id]: !a[g.id] }))}>
                  <span className={`side-caret${g.aberto ? " open" : ""}`}>▸</span>
                  <span style={{ flex: 1 }}>{g.name}</span>
                  <span className="side-count">{feitos}/{g.topics.length}</span>
                </button>
                {g.aberto && (
                  <div className="side-items">
                    {g.intro && (
                      <Link href={g.intro.href} className={`side-item${navOn(g.intro.href) ? " on" : ""}`}>
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
                        <Link key={t.slug} href={`/topico/${t.slug}`} className={`side-item${ativo ? " on" : ""}${vazio ? " soon" : ""}`}>
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
