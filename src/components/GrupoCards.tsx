"use client";

import Link from "next/link";
import { useProgress } from "@/components/ProgressProvider";
import { TopicoCard, type CardDeTopico } from "@/components/TopicoCard";

/**
 * Grupos de tópicos em cards, com progresso.
 *
 * É o corpo do `/fundamentos/` e o corpo da abertura de cada roadmap. Os dois
 * mostram a mesma coisa — grupos, cada um com os seus tópicos, cada tópico com
 * nível, etiquetas de material e marca de concluído — e a diferença entre eles
 * cabe em dois campos: para ONDE o card leva, e se o tópico veio de outra casa.
 * Uma segunda cópia deste componente para os roadmaps seria a quinta cópia do
 * traço do ✓ neste repositório (`FundamentosSidebar`, `RoadmapSidebar`,
 * `ProblemList` e esta), e o teste `check-alinhado` mede as que existem
 * justamente porque cópia de desenho é o que mais desalinha sozinho.
 *
 * Por isso ele recebe uma forma JÁ NORMALIZADA, e não `Group[]`: quem chama
 * resolve as citações e decide os destinos, e este componente só desenha. É a
 * alternativa a receber `Group | RoadmapGroup` e ramificar aqui dentro.
 *
 * O CARD em si mora no `TopicoCard`, porque o índice completo desenha a mesma
 * peça SEM grupo nenhum em volta. Aqui ficou o que é do grupo: o título, a
 * contagem de progresso e a grade.
 */
export type CardGroup = {
  id: string;
  name: string;
  itens: CardDeTopico[];
  /** Página de abertura do grupo (hoje só a Introdução tem). */
  intro?: { name: string; href: string; description: string };
};

export function GrupoCards({ groups }: { groups: CardGroup[] }) {
  const { isTopico, toggleTopico, contarTopicos } = useProgress();

  return (
    <>
      {groups.map((g) => {
        const feitos = contarTopicos(g.itens.map((i) => i.topic.slug));
        return (
          // `key` é prop do React e não vira atributo: sem o `id`, nenhuma
          // âncora do site conseguia apontar para um grupo.
          <section className="rgroup" id={g.id} key={g.id}>
            <div className="rgroup-head">
              <h2>{g.name}</h2>
              <span className="rgroup-count">{feitos}/{g.itens.length}</span>
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
              {g.itens.map((item) => (
                <TopicoCard key={item.topic.slug} {...item} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
