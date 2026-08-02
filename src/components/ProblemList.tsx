"use client";

import type { Problema } from "@/content/roadmap";
import { useProgress } from "@/components/ProgressProvider";

const LEVEL_CLASS: Record<string, string> = {
  "Fácil": "level-facil",
  "Médio": "level-medio",
  "Difícil": "level-dificil",
  "Guia": "level-guia",
};

export function ProblemList({ problemas }: { problemas: Problema[] }) {
  const { isProblema, toggleProblema } = useProgress();

  return (
    <div className="problems">
      {problemas.map((pr) => {
        const feito = isProblema(pr.id);
        return (
          <div className="problem-row" key={pr.id}>
            <button
              className={`problem-check${feito ? " done" : ""}`}
              role="checkbox"
              aria-checked={feito}
              aria-label={`Marcar ${pr.nome} como resolvido`}
              onClick={() => toggleProblema(pr.id)}
            >
              {feito ? "✓" : ""}
            </button>
            <span className={`problem-level ${LEVEL_CLASS[pr.nivel] ?? "level-guia"}`} style={{ borderStyle: "solid" }}>
              {pr.nivel}
            </span>
            <a className={`problem-name${feito ? " done" : ""}`} href={pr.url} target="_blank" rel="noopener noreferrer">
              {pr.nome}
            </a>
            <span className="problem-src">{pr.fonte}{pr.numero ? ` ${pr.numero}` : ""}</span>
            <a className="problem-ext" href={pr.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir problema">↗</a>
          </div>
        );
      })}
    </div>
  );
}
