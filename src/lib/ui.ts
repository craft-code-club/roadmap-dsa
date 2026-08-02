import type { Level } from "@content/roadmap";

export function levelClass(level: Level | "Guia"): string {
  switch (level) {
    case "Fácil": return "level-facil";
    case "Médio": return "level-medio";
    case "Difícil": return "level-dificil";
    default: return "level-guia";
  }
}
