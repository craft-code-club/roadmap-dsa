import type { Level } from "@content/roadmap";

/**
 * Compara rotas ignorando a barra final (`trailingSlash: true` no next.config).
 *
 * Mora aqui, e não em quem usa, porque são três consumidores fazendo a MESMA
 * pergunta — a barra do topo, a trilha lateral e a barra lateral do curso — e o
 * `pathname` chega com barra enquanto os `href` do código são escritos sem ela.
 * Quem recriar a comparação perde o destaque de "você está aqui" e não quebra
 * teste nenhum ao perder.
 */
export const mesmaRota = (a: string | null | undefined, b: string) =>
  !!a && a.replace(/\/+$/, "") === b.replace(/\/+$/, "");

export function levelClass(level: Level | "Guia"): string {
  switch (level) {
    case "Fácil": return "level-facil";
    case "Médio": return "level-medio";
    case "Difícil": return "level-dificil";
    default: return "level-guia";
  }
}
