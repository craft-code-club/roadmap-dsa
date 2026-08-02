"use client";

import Link from "next/link";
import { GROUPS, topicTags } from "@content/roadmap";
import { levelClass } from "@/lib/ui";
import { useProgress } from "@/components/ProgressProvider";

export function RoadmapGroups() {
  const { isTopico, toggleTopico, contarTopicos } = useProgress();

  return (
    <>
      {GROUPS.map((g) => {
        const feitos = contarTopicos(g.topics.map((t) => t.slug));
        return (
          <section className="rgroup" key={g.id}>
            <div className="rgroup-head">
              <h2>{g.name}</h2>
              <span className="rgroup-count">{feitos}/{g.topics.length}</span>
              <div className="rgroup-rule" />
            </div>
            <div className="grid-3">
              {g.topics.map((t) => {
                const feito = isTopico(t.slug);
                return (
                  <Link key={t.slug} href={`/topico/${t.slug}`} className={`topic-card${feito ? " done" : ""}`}>
                    <div className="topic-card-top">
                      <span className="topic-card-name">{t.name}</span>
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
                    </div>
                    <p>{t.description}</p>
                    <div className="tcard-tags">
                      <span className={`level ${levelClass(t.level)}`}>{t.level}</span>
                      {topicTags(t).map((tag) => (
                        <span key={tag.kind} className={`ttag ttag-${tag.kind}`}>{tag.label}</span>
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
