"use client";

import { FUNDAMENTOS, roadmapGroups, urlDoTopicoNoRoadmap } from "@content/roadmaps";
import { GrupoCards } from "@/components/GrupoCards";

/**
 * Os 16 grupos dos Fundamentos, em cards.
 *
 * O desenho do card mora no `GrupoCards`, que a abertura de cada roadmap também
 * usa. Aqui ficou só a fonte dos dados e o destino do clique: dentro dos
 * Fundamentos, o card leva para `/fundamentos/<topico>/`, para o leitor
 * continuar na sequência em vez de cair na página solta do tópico.
 */
export function FundamentosGroups() {
  return (
    <GrupoCards
      groups={roadmapGroups(FUNDAMENTOS).map((g) => ({
        id: g.id,
        name: g.name,
        intro: g.intro,
        itens: g.topicos.map((t) => ({ topic: t, href: urlDoTopicoNoRoadmap(FUNDAMENTOS, t.slug) })),
      }))}
    />
  );
}
