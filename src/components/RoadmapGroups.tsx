"use client";

import Link from "next/link";
import { GRUPOS, tagsDoTopico } from "@/content/roadmap";
import { nivelClass } from "@/lib/ui";
import { useProgress } from "@/components/ProgressProvider";

export function RoadmapGroups() {
  const { isTopico, toggleTopico, contarTopicos } = useProgress();

  return (
    <>
      {GRUPOS.map((g) => {
        const feitos = contarTopicos(g.topicos.map((t) => t.slug));
        return (
          <section className="rgroup" key={g.id}>
            <div className="rgroup-head">
              <h2>{g.nome}</h2>
              <span className="rgroup-count">{feitos}/{g.topicos.length}</span>
              <div className="rgroup-rule" />
            </div>
            <div className="grid-3">
              {g.topicos.map((t) => {
                const feito = isTopico(t.slug);
                return (
                  <Link key={t.slug} href={`/topico/${t.slug}`} className={`topic-card${feito ? " done" : ""}`}>
                    <div className="topic-card-top">
                      <span className="topic-card-name">{t.nome}</span>
                      <span
                        className={`side-check${feito ? " done" : ""}`}
                        role="checkbox"
                        aria-checked={feito}
                        tabIndex={0}
                        aria-label={`Marcar ${t.nome} como concluído`}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleTopico(t.slug); }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); toggleTopico(t.slug); } }}
                      >
                        {feito ? "✓" : ""}
                      </span>
                    </div>
                    <p>{t.descricao}</p>
                    <div className="tcard-tags">
                      <span className={`level ${nivelClass(t.nivel)}`}>{t.nivel}</span>
                      {tagsDoTopico(t).map((tag) => (
                        <span key={tag.tipo} className={`ttag ttag-${tag.tipo}`}>{tag.label}</span>
                      ))}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
