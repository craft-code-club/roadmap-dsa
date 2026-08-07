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
          // `key` é prop do React e não vira atributo: sem o `id`, nenhuma
          // âncora do site conseguia apontar para um grupo do roadmap.
          <section className="rgroup" id={g.id} key={g.id}>
            <div className="rgroup-head">
              <h2>{g.name}</h2>
              <span className="rgroup-count">{feitos}/{g.topics.length}</span>
              <div className="rgroup-rule" />
            </div>
            <div className="grid-3">
              {g.intro && (
                <Link href={g.intro.href} className="topic-card">
                  <div className="topic-card-top">
                    <span className="topic-card-name">{g.intro.name}</span>
                  </div>
                  <p>{g.intro.description}</p>
                </Link>
              )}
              {g.topics.map((t) => {
                const feito = isTopico(t.slug);
                return (
                  // A marca de concluído é IRMÃ do link, como no `ProblemList`:
                  // widget focável dentro de `<a>` é estado inválido pela ARIA.
                  // Ela sai do fluxo (o CSS a posiciona) para o card inteiro
                  // continuar sendo um alvo de clique só.
                  <div className="topic-card-wrap" key={t.slug}>
                    {/* A marca vem ANTES do link no DOM, como na trilha lateral
                        e no `ProblemList`. Ela é a primeira coisa do card em
                        todas as outras listas, e aqui era a última: o teclado
                        chegava ao card, entrava no tópico, e só encontrava o
                        "marcar como concluído" na volta. `position: absolute`
                        mantém o ✓ no mesmo canto — medido, 18px do topo e 17px
                        da direita antes e depois. */}
                    <button
                      type="button"
                      className={`side-check tcard-check${feito ? " done" : ""}`}
                      role="checkbox"
                      aria-checked={feito}
                      aria-label={`Marcar ${t.name} como concluído`}
                      onClick={() => toggleTopico(t.slug)}
                    >
                      {feito ? "✓" : ""}
                    </button>
                    <Link href={`/topico/${t.slug}`} className={`topic-card${feito ? " done" : ""}`}>
                      <div className="topic-card-top">
                        <span className="topic-card-name">{t.name}</span>
                      </div>
                      <p>{t.description}</p>
                      <div className="tcard-tags">
                        <span className={`level ${levelClass(t.level)}`}>{t.level}</span>
                        {topicTags(t).map((tag) => (
                          <span key={tag.kind} className={`ttag ttag-${tag.kind}`}>{tag.label}</span>
                        ))}
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
