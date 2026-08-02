import type { Nivel } from "@/content/roadmap";

export function nivelClass(nivel: Nivel | "Guia"): string {
  switch (nivel) {
    case "Fácil": return "level-facil";
    case "Médio": return "level-medio";
    case "Difícil": return "level-dificil";
    default: return "level-guia";
  }
}
