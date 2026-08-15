"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { isEmptyTopic, type Topic } from "@content/topicos";
import {
  FUNDAMENTOS,
  roadmapGroups,
  roadmapTopics,
  TOTAL_EXTRA_CARDS,
  urlDoTopicoNoRoadmap,
} from "@content/roadmaps";
import { mesmaRota } from "@/lib/ui";
import { useProgress } from "@/components/ProgressProvider";
import { SideApoio } from "@/components/SideApoio";

// A barra lateral da TRILHA principal — o menu de 46 tópicos, a busca e o
// progresso. Saiu do `Shell.tsx` quando as trilhas ganharam uma barra lateral
// própria: o `Shell` passou a ser a moldura (topo, gaveta, rodapé) e cada barra
// desenha o seu miolo. O markup aqui é o MESMO de antes, classe por classe.

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
const GRUPOS = roadmapGroups(FUNDAMENTOS);
const TODOS: Topic[] = roadmapTopics(FUNDAMENTOS);
const IDS_DE_GRUPO = new Set(GRUPOS.map((g) => g.id));

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
      abertos: GRUPOS.filter((g) => abertos[g.id]).map((g) => g.id),
      em: Date.now(),
    };
    localStorage.setItem(KEY_MENU, JSON.stringify(salvo));
  } catch {
    /* modo privado / storage cheio, só ignora */
  }
}

// Minúsculas e sem acento. NFD separa a letra da marca de acento em pontos de
// código diferentes, e o `replace` joga fora só a marca: com isso "recursao"
// acha "Recursão" e "memoizacao" acha "memoização". Fica fora do componente
// para não virar dependência nova do `useMemo` a cada renderização.
const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function FundamentosSidebar({ mobileNav }: { mobileNav: boolean }) {
  const pathname = usePathname();
  const { hydrated, isTopico, toggleTopico, contarTopicos } = useProgress();

  // O tópico ativo chega por duas rotas: dentro dos Fundamentos
  // (`/fundamentos/<slug>/`, o caso normal aqui) e a canônica
  // (`/topicos/<slug>/`). As duas acendem a mesma linha.
  const partes = (pathname ?? "").split("/").filter(Boolean);
  const slugAtivo =
    partes[0] === "fundamentos" && partes[1] ? partes[1] : partes[0] === "topico" ? partes[1] : null;

  // Onde o leitor está: o grupo do tópico aberto ou o grupo da página de
  // introdução dele. É o único grupo que o menu abre por conta própria.
  const grupoDaRota = useMemo(() => {
    const porTopico = slugAtivo && GRUPOS.find((g) => g.topicos.some((t) => t.slug === slugAtivo));
    if (porTopico) return porTopico.id;
    const porIntro = GRUPOS.find((g) => g.intro && mesmaRota(pathname, g.intro.href));
    return porIntro?.id ?? null;
  }, [slugAtivo, pathname]);

  const [busca, setBusca] = useState("");
  // Primeira renderização (a mesma no HTML estático e na hidratação): o grupo da
  // rota, ou o primeiro grupo em páginas que não são de tópico (home, roadmap,
  // apoiar), para o menu nunca abrir todo fechado para quem chega agora. O que
  // estava salvo entra logo depois, no efeito — ler o localStorage aqui daria
  // divergência de hidratação.
  const [abertos, setAbertos] = useState<Record<string, boolean>>(() => ({
    [grupoDaRota ?? GRUPOS[0].id]: true,
  }));
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

  const feitosTotal = contarTopicos(TODOS.map((t) => t.slug));
  const pct = hydrated && TODOS.length ? Math.round((feitosTotal / TODOS.length) * 100) : 0;

  const b = semAcento(busca.trim());

  // A busca casa nome, descrição e nome do grupo. Só pelo nome ela mentia sobre
  // o guia: "janela" (Sliding Window), "memoização" (Programação Dinâmica) e
  // "ponteiro" (Listas Encadeadas) aparecem em `description` e em zero `name`,
  // e quem digitava concluía que o tópico não existe aqui. Custo de bundle zero:
  // as descrições já vêm no mesmo chunk que os nomes.
  const grupos = useMemo(
    () =>
      GRUPOS.map((g) => {
        // Grupo que casa pelo nome entrega a lista inteira dele: quem digita
        // "grafos" quer o grupo, não o subconjunto que repete a palavra.
        const grupoCasa = !!b && semAcento(g.name).includes(b);
        const itens = g.topicos.filter(
          (t) => !b || grupoCasa || semAcento(`${t.name} ${t.description}`).includes(b)
        );
        return { ...g, itens, aberto: b ? itens.length > 0 : !!abertos[g.id] };
      }).filter((g) => !b || g.itens.length > 0),
    [b, abertos]
  );

  const navOn = (href: string) => mesmaRota(pathname, href);

  return (
    <>
      <div className="side-head">
        <div className="side-head-row">
          <span className="side-label">Fundamentos</span>
          <span className="side-count">{feitosTotal}/{TODOS.length} · {pct}%</span>
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
          const feitos = contarTopicos(g.topicos.map((t) => t.slug));
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
                <span className="side-count">{feitos}/{g.topicos.length}</span>
              </button>
              {/* O grupo fechado esconde os itens, e não deixa de renderizá-los:
                  o menu era a única lista de tópicos de toda página, e com
                  `{g.aberto && ...}` ela chegava ao rastreador com 1 link no pior
                  caso. `hidden` (mais a regra que vence o `display: flex` no CSS)
                  dá o mesmo visual, tira os itens ocultos da ordem de foco e
                  entrega os 46 tópicos em toda página. */}
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
                            aparece no `FundamentosGroups` e no `ProblemList`, e o
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
                        href={urlDoTopicoNoRoadmap(FUNDAMENTOS, t.slug)}
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

        {/* A porta para fora dos Fundamentos, no fim deles — e só quando a busca não
            está filtrando, que é quando o leitor está procurando outra coisa.
            Sem esta linha, quem estuda pelo menu lateral não tem como descobrir
            que existe conteúdo além dos 46 tópicos: a vitrine mora no fim do
            `/fundamentos/`, uma página que quem navega pela barra não abre. */}
        {!b && (
          <Link className="side-extras" href="/roadmaps">
            <span className="side-extras-ico" aria-hidden="true">✧</span>
            <span>
              <span className="side-extras-nome">Roadmaps e outros tópicos</span>
              <span className="side-extras-sub">{TOTAL_EXTRA_CARDS} além dos Fundamentos</span>
            </span>
          </Link>
        )}
      </div>

      <SideApoio />
    </>
  );
}
