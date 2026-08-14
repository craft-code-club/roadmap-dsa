"use client";

import { GROUPS } from "@content/roadmap";
import { GrupoCards } from "@/components/GrupoCards";

/**
 * Os 16 grupos da trilha, em cards.
 *
 * O desenho do card mora no `GrupoCards`, que a abertura de cada curso também
 * usa. Aqui ficou só a fonte dos dados — que é a diferença inteira entre as
 * duas telas.
 */
export function RoadmapGroups() {
  return <GrupoCards groups={GROUPS} />;
}
