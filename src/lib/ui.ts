import type { Level } from "@content/topicos";

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

/**
 * Qual tópico a rota está mostrando, se é que está mostrando algum.
 *
 * As duas formas: `/roadmaps/<roadmap>/<topico>/` e `/topicos/<topico>/`. As
 * duas acendem a mesma linha na barra lateral, e é por isso que a pergunta é
 * uma só.
 *
 * Aqui, e não repetida em cada barra, porque já foi repetida: as duas barras
 * casavam `"topico"` no singular, cada uma no seu arquivo, e quando a rota
 * passou para o plural nenhuma das duas voltou a acender linha nenhuma. Nada
 * quebrou — o menu só deixou de dizer onde o leitor estava, que é o defeito que
 * ninguém abre issue para relatar.
 */
export function slugDoTopicoNaRota(pathname: string | null | undefined): string | null {
  const partes = (pathname ?? "").split("/").filter(Boolean);
  if (partes[0] === "roadmaps" && partes[2]) return partes[2];
  if (partes[0] === "topicos" && partes[1]) return partes[1];
  return null;
}
