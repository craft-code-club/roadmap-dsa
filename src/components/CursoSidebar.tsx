"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { courseTopics, type Course } from "@content/courses";
import { isEmptyTopic } from "@content/roadmap";
import { mesmaRota } from "@/lib/ui";
import { useProgress } from "@/components/ProgressProvider";
import { SideApoio } from "@/components/SideApoio";

// A barra lateral de um CURSO. Mesmas classes da trilha principal, três
// diferenças de propósito:
//
//   1. Não tem busca. A trilha tem 46 tópicos e a busca é o que a torna
//      navegável; um curso tem 4 a 6, e um campo de busca sobre seis itens é
//      um controle que só ocupa espaço.
//   2. Os grupos não abrem nem fecham. Sanfona existe para caber 16 grupos numa
//      coluna; com dois ou três, ela esconde metade do curso atrás de um clique
//      e não economiza rolagem nenhuma.
//   3. Tem porta de saída no topo e no pé. Uma trilha lateral sem volta é um
//      beco: o leitor entrou por um card e precisa saber como voltar para o
//      roadmap e como chegar aos outros cursos.

export function CursoSidebar({ course, mobileNav: _mobileNav }: { course: Course; mobileNav: boolean }) {
  const pathname = usePathname();
  const { hydrated, isTopico, toggleTopico, contarTopicos } = useProgress();

  const slugAtivo = pathname?.startsWith("/topico/") ? pathname.split("/")[2] : null;
  const lista = courseTopics(course);
  const feitos = contarTopicos(lista.map((t) => t.slug));
  const pct = hydrated && lista.length ? Math.round((feitos / lista.length) * 100) : 0;
  const naAbertura = mesmaRota(pathname, `/cursos/${course.slug}/`);

  return (
    <>
      <div className="side-head">
        <Link className="side-voltar" href="/roadmap">
          <span aria-hidden="true">‹</span> Roadmap
        </Link>
        <div className="side-head-row">
          <span className="side-label">Curso</span>
          <span className="side-count">{feitos}/{lista.length} · {pct}%</span>
        </div>
        {/* O nome do curso é link para a abertura dele: é de lá que vem a
            descrição, os pré-requisitos e a ordem sugerida, e sem esta linha o
            leitor que clicou num tópico direto do card nunca chega àquela
            página. */}
        <Link
          href={`/cursos/${course.slug}`}
          className={`side-curso-nome${naAbertura ? " on" : ""}`}
          aria-current={naAbertura ? "page" : undefined}
        >
          {course.name}
        </Link>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="side-scroll">
        {course.groups.map((g) => (
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
                      {/* O mesmo traço do `TrilhaSidebar`, do `RoadmapGroups` e
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

        <Link className="side-extras" href="/cursos">
          <span className="side-extras-ico" aria-hidden="true">✧</span>
          <span>
            <span className="side-extras-nome">Outros cursos e estruturas</span>
            <span className="side-extras-sub">a vitrine completa</span>
          </span>
        </Link>
      </div>

      <SideApoio />
    </>
  );
}
