"use client";

import type { Problem } from "@content/roadmap";
import { useProgress } from "@/components/ProgressProvider";

const LEVEL_CLASS: Record<string, string> = {
  "Fácil": "level-facil",
  "Médio": "level-medio",
  "Difícil": "level-dificil",
  "Guia": "level-guia",
};

export function ProblemList({ problems }: { problems: Problem[] }) {
  const { isProblema, toggleProblema } = useProgress();

  return (
    <div className="problems">
      {problems.map((pr) => {
        const feito = isProblema(pr.id);
        return (
          <div className="problem-row" key={pr.id}>
            <button
              className={`problem-check${feito ? " done" : ""}`}
              role="checkbox"
              aria-checked={feito}
              aria-label={`Marcar ${pr.name} como resolvido`}
              onClick={() => toggleProblema(pr.id)}
            >
              {/* O mesmo traço do `Shell` e do `RoadmapGroups`; o porquê medido
                  de ser desenho, e não o caractere `✓`, está no `globals.css`.
                  `aria-hidden` porque é decoração: o estado é `aria-checked`, o
                  nome é o `aria-label`. */}
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
            <span className={`problem-level ${LEVEL_CLASS[pr.level] ?? "level-guia"}`} style={{ borderStyle: "solid" }}>
              {pr.level}
            </span>
            <a className={`problem-name${feito ? " done" : ""}`} href={pr.url} target="_blank" rel="noopener noreferrer">
              {pr.name}
            </a>
            <span className="problem-src">{pr.source}{pr.number ? ` ${pr.number}` : ""}</span>
            <a className="problem-ext" href={pr.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir problema">↗</a>
          </div>
        );
      })}
    </div>
  );
}
