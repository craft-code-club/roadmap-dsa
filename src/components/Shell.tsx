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

// A memória do menu vale por um dia. Ela é contexto da sessão de estudo, e não
// preferência: quem volta três dias depois não lembra por que aqueles grupos
// estavam abertos, e o menu no estado da rota é mais útil do que o menu de
// terça-feira. O carimbo é regravado a cada visita, então quem estuda todos os
// dias nunca perde o que deixou aberto — o prazo conta da última visita, não da
// primeira vez que o menu foi salvo.
const VALIDADE_MENU_MS = 24 * 60 * 60 * 1000;

/** Ids válidos hoje. Grupo renomeado ou removido sai do que estava salvo. */
const IDS_DE_GRUPO = new Set(GROUPS.map((g) => g.id));

function lerAbertos(): Record<string, boolean> | null {
  try {
    const raw = localStorage.getItem(KEY_MENU);
    if (!raw) return null;
    const salvo = JSON.parse(raw);
    if (!salvo || !Array.isArray(salvo.abertos) || typeof salvo.em !== "number") return null;
    // Idade negativa é o relógio do aparelho tendo andado para trás desde a
    // última visita: sem prazo confiável, o padrão da rota é a resposta segura.
    const idade = Date.now() - salvo.em;
    if (idade < 0 || idade > VALIDADE_MENU_MS) return null;
    const mapa: Record<string, boolean> = {};
    for (const id of salvo.abertos) if (typeof id === "string" && IDS_DE_GRUPO.has(id)) mapa[id] = true;
    return mapa;
  } catch {
    return null;
  }
}

function gravarAbertos(abertos: Record<string, boolean>) {
  try {
    const salvo = {
      abertos: GROUPS.filter((g) => abertos[g.id]).map((g) => g.id),
      em: Date.now(),
    };
    localStorage.setItem(KEY_MENU, JSON.stringify(salvo));
  } catch {
    /* modo privado / storage cheio, só ignora */
  }
}

/** Compara rotas ignorando a barra final (`trailingSlash: true` no next.config). */
const mesmaRota = (a: string | null | undefined, b: string) =>
  !!a && a.replace(/\/+$/, "") === b.replace(/\/+$/, "");

// Minúsculas e sem acento. NFD separa a letra da marca de acento em pontos de
// código diferentes, e o `replace` joga fora só a marca: com isso "recursao"
// acha "Recursão" e "memoizacao" acha "memoização". Fica fora do componente
// para não virar dependência nova do `useMemo` a cada renderização.
const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

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
  // esse entra aberto em toda chegada de página. Fechar na mão continua valendo
  // (o menu é do leitor, e um grupo que não se fecha é uma gaiola): a regra vale
  // na chegada, então o grupo volta aberto na próxima visita àquela página.
  // Quem tem histórico não recebe o grupo de abertura junto: ele é o padrão de
  // quem chega sem nada salvo, não um grupo fixo.
  // Memória fora da validade conta como não ter nada salvo, e o padrão da rota
  // (que já está no estado inicial) fica de pé.
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

  // Abre o grupo do tópico ao chegar nele. Depende do `grupoDaRota`, e não de
  // `abertos`: só a troca de página reabre, então fechar o grupo na mão para ler
  // sem a lista atrapalhando continua funcionando enquanto o leitor está ali.
  useEffect(() => {
    if (grupoDaRota) setAbertos((a) => ({ ...a, [grupoDaRota]: true }));
  }, [grupoDaRota]);

  // Com os outros grupos fechados, o tópico atual pode ficar fora da parte
  // visível do menu — e aí o leitor não vê onde está. Rola só o container do
  // menu (nunca a página, que o `scrollIntoView` levaria junto) e só quando
  // precisa. `block: nearest` na mão: distância mínima, sem centralizar nada.
  useEffect(() => {
    const lista = listaRef.current;
    // `:not([hidden])` porque o item do grupo fechado agora existe no DOM: sem o
    // filtro, o `getBoundingClientRect` de um elemento oculto devolve zeros e a
    // conta abaixo rolaria o menu para o topo sem motivo.
    const atual = lista?.querySelector<HTMLElement>(".side-items:not([hidden]) .side-item.on");
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

  const b = semAcento(busca.trim());

  // A busca casa nome, descrição e nome do grupo. Só pelo nome ela mentia sobre
  // o guia: "janela" (Sliding Window), "memoização" (Programação Dinâmica) e
  // "ponteiro" (Listas Encadeadas) aparecem em `description` e em zero `name`,
  // e quem digitava concluía que o tópico não existe aqui. Custo de bundle zero:
  // as descrições já vêm no mesmo chunk que os nomes.
  const grupos = useMemo(
    () =>
      GROUPS.map((g) => {
        // Grupo que casa pelo nome entrega a lista inteira dele: quem digita
        // "grafos" quer o grupo, não o subconjunto que repete a palavra.
        const grupoCasa = !!b && semAcento(g.name).includes(b);
        const itens = g.topics.filter(
          (t) => !b || grupoCasa || semAcento(`${t.name} ${t.description}`).includes(b)
        );
        return { ...g, itens, aberto: b ? itens.length > 0 : !!abertos[g.id] };
      }).filter((g) => !b || g.itens.length > 0),
    [b, abertos]
  );

  // Com `trailingSlash: true`, a rota chega como "/roadmap/": comparar com o
  // href cru deixava Roadmap, Apoiar e Introdução sem o destaque de "você está aqui".
  const navOn = (href: string) => mesmaRota(pathname, href);

  return (
    <div className="shell">
      {/* WCAG 2.4.1: antes desta linha eram 44 paradas de tabulação até o
          primeiro parágrafo em /topico/dijkstra/, em toda página aberta. Ele é o
          primeiro filho do shell de propósito, e some da tela sem sair da ordem
          de foco (por isso não é `display: none`). */}
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>
      <header className="header">
        <div className="header-left">
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
            <Link href="/" className={`nav-hide-sm${navOn("/") ? " on" : ""}`}>Início</Link>
            <Link href="/roadmap" className={`nav-hide-sm${navOn("/roadmap") ? " on" : ""}`}>Roadmap</Link>
          </nav>
        </div>

        <nav className="topnav nav-right" aria-label="Comunidade e apoio">
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
            <button type="button" className="nav-icon" aria-label="Mais opções" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
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

      {/* `nav`, e não `aside`: a trilha inteira é navegação, e o landmark
          "complementar" do `aside` mandava o leitor de tela procurar o menu de
          tópicos fora da lista de navegação da página. */}
      <nav
        id="menu-lateral"
        className={`sidebar${mobileNav ? " open" : ""}`}
        aria-label="Trilha de estudos"
      >
        <div className="side-head">
          <div className="side-head-row">
            <span className="side-label">Sua trilha</span>
            <span className="side-count">{feitosTotal}/{TOTAL_TOPICS} · {pct}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          {/* O `placeholder` era o único nome do campo, e ele some na primeira
              letra digitada: a partir daí quem usa leitor de tela ouvia só
              "caixa de edição". O rótulo fica fora da tela, e não escondido. */}
          <label className="sr-only" htmlFor="busca-topico">
            Buscar tópico
          </label>
          <input
            id="busca-topico"
            className="side-search"
            type="search"
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
                  type="button"
                  className="side-group-btn"
                  aria-expanded={g.aberto}
                  onClick={() => setAbertos((a) => ({ ...a, [g.id]: !a[g.id] }))}
                >
                  <span className={`side-caret${g.aberto ? " open" : ""}`} aria-hidden="true">▸</span>
                  <span style={{ flex: 1 }}>{g.name}</span>
                  <span className="side-count">{feitos}/{g.topics.length}</span>
                </button>
                {/* O grupo fechado esconde os itens, e não deixa de renderizá-los:
                    o menu era a única lista de tópicos de toda página, e com
                    `{g.aberto && ...}` ela chegava ao rastreador com 1 link no pior
                    caso. `hidden` (mais a regra que vence o `display: flex` no CSS)
                    dá o mesmo visual, tira os itens ocultos da ordem de foco e
                    entrega os 47 tópicos em toda página. */}
                <div className="side-items" hidden={!g.aberto}>
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
                      // A marca de concluído é IRMÃ do link, não filha: widget
                      // focável dentro de `<a>` é estado inválido pela ARIA, e
                      // dava dois destinos para o mesmo Tab. É o arranjo que o
                      // `ProblemList` já usa. Quem pinta o estado da linha
                      // passa a ser a `.side-row`, para o ✓ continuar dentro
                      // do realce de "você está aqui".
                      <div className={`side-row${ativo ? " on" : ""}`} key={t.slug}>
                        <button
                          type="button"
                          className={`side-check${feito ? " done" : ""}`}
                          role="checkbox"
                          aria-checked={feito}
                          aria-label={`Marcar ${t.name} como concluído`}
                          onClick={() => toggleTopico(t.slug)}
                        >
                          {/* Desenho, e não o caractere `✓`: o glifo continuava
                              torto mesmo com o padding do `<button>` zerado, e
                              o botão nem herda a fonte do site — o porquê
                              medido está no `globals.css`. O mesmo traço
                              aparece no `RoadmapGroups` e no `ProblemList`, e o
                              teste `check-alinhado` mede os três; ele é o que
                              segura as três cópias iguais.
                              É DECORAÇÃO: o estado é `aria-checked` e o nome é
                              o `aria-label`, por isso `aria-hidden`. */}
                          {feito ? (
                            <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
                              <path
                                d="M2.4 6.4 5.1 8.6 9.6 3.4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          ) : null}
                        </button>
                        <Link
                          href={`/topico/${t.slug}`}
                          className={`side-item${ativo ? " on" : ""}${vazio ? " soon" : ""}`}
                          aria-current={ativo ? "page" : undefined}
                        >
                          <span className="side-item-name">{t.name}</span>
                          {t.isNew && <span className="badge-novo">NOVO</span>}
                          {vazio && <span className="badge-soon">em breve</span>}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {/* Sem isto, busca sem resultado devolvia uma coluna vazia, e a tela
              não dizia se o guia não tem o assunto ou se o menu quebrou. */}
          {b && grupos.length === 0 && (
            <p className="side-vazio" role="status">
              Nenhum tópico com <strong>{busca.trim()}</strong>. Tente outra palavra, como
              &ldquo;janela&rdquo;, &ldquo;árvore&rdquo; ou &ldquo;ordenação&rdquo;.
            </p>
          )}
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
      </nav>

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
