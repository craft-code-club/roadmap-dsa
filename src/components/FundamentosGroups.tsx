"use client";

import { GROUPS } from "@content/fundamentos";
import { GrupoCards } from "@/components/GrupoCards";

/**
 * Os 16 grupos dos Fundamentos, em cards.
 *
 * O desenho do card mora no `GrupoCards`, que a abertura de cada roadmap também
 * usa. Aqui ficou só a fonte dos dados e o destino do clique: nos Fundamentos
 * todo tópico é da casa, então o link é a página canônica dele e nenhum card
 * carrega etiqueta de origem.
 */
export function FundamentosGroups() {
  return (
    <GrupoCards
      groups={GROUPS.map((g) => ({
        id: g.id,
        name: g.name,
        intro: g.intro,
        itens: g.topics.map((t) => ({ topic: t, href: `/topico/${t.slug}` })),
      }))}
    />
  );
}
