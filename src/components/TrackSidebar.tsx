"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackTopics, type Track } from "@content/tracks";
import { isEmptyTopic } from "@content/roadmap";
import { mesmaRota } from "@/lib/ui";
import { useProgress } from "@/components/ProgressProvider";
import { SideApoio } from "@/components/SideApoio";

// A barra lateral de uma TRILHA. Mesmas classes da barra do roadmap, três
// diferenças de propósito:
//
//   1. Não tem busca. O roadmap tem 46 tópicos e a busca é o que a torna
//      navegável; uma trilha tem 4 a 6, e um campo de busca sobre seis itens é
//      um controle que só ocupa espaço.
//   2. Os grupos não abrem nem fecham. Sanfona existe para caber 16 grupos numa
//      coluna; com dois ou três, ela esconde metade da trilha atrás de um clique
//      e não economiza rolagem nenhuma.
//   3. Tem porta de saída no topo e no pé. Uma barra lateral sem volta é um
//      beco: o leitor entrou por um card e precisa saber como voltar para o
//      roadmap e como chegar às outras trilhas.

export function TrackSidebar({ track, mobileNav: _mobileNav }: { track: Track; mobileNav: boolean }) {
  const pathname = usePathname();
  const { hydrated, isTopico, toggleTopico, contarTopicos } = useProgress();

  const slugAtivo = pathname?.startsWith("/topico/") ? pathname.split("/")[2] : null;
  const lista = trackTopics(track);
  const feitos = contarTopicos(lista.map((t) => t.slug));
  const pct = hydrated && lista.length ? Math.round((feitos / lista.length) * 100) : 0;
  const naAbertura = mesmaRota(pathname, `/trilha/${track.slug}/`);

  return (
    <>
      <div className="side-head">
        <Link className="side-voltar" href="/roadmap">
          <span aria-hidden="true">‹</span> Roadmap
        </Link>
        <div className="side-head-row">
          <span className="side-label">Trilha</span>
          <span className="side-count">{feitos}/{lista.length} · {pct}%</span>
        </div>
        {/* O nome da trilha é link para a abertura dela: é de lá que vem a
            descrição, os pré-requisitos e a ordem sugerida, e sem esta linha o
            leitor que clicou num tópico direto do card nunca chega àquela
            página. */}
        <Link
          href={`/trilha/${track.slug}`}
          className={`side-trilha-nome${naAbertura ? " on" : ""}`}
          aria-current={naAbertura ? "page" : undefined}
        >
          {track.name}
        </Link>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="side-scroll">
        {track.groups.map((g) => (
          <div className="side-group" key={g.id}>
            <div className="side-group-rotulo">{g.name}</div>
            <div className="side-items">
              {g.topics.map((t) => {
                const feito = isTopico(t.slug);
                const ativo = slugAtivo === t.slug;
                const vazio = isEmptyTopic(t);
                return (
                  <div className={`side-row${ativo ? " on" : ""}`} key={t.slug}>
                    <button
                      type="button"
                      className={`side-check${feito ? " done" : ""}`}
                      role="checkbox"
                      aria-checked={feito}
                      aria-label={`Marcar ${t.name} como concluído`}
                      onClick={() => toggleTopico(t.slug)}
                    >
                      {/* O mesmo traço do `RoadmapSidebar`, do `RoadmapGroups` e
                          do `ProblemList`; o porquê medido de ser desenho, e
                          não o caractere `✓`, está no `globals.css`. */}
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
        ))}

        <Link className="side-extras" href="/trilha">
          <span className="side-extras-ico" aria-hidden="true">✧</span>
          <span>
            <span className="side-extras-nome">Outras trilhas e tópicos</span>
            <span className="side-extras-sub">a vitrine completa</span>
          </span>
        </Link>
      </div>

      <SideApoio />
    </>
  );
}
