"use client";

import Link from "next/link";
import { topicTags, type Topic } from "@content/topicos";
import { levelClass } from "@/lib/ui";
import { useProgress } from "@/components/ProgressProvider";

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
 */
export type CardItem = {
  topic: Topic;
  href: string;
  /** "Fundamentos", o nome de outro roadmap… Só em tópico CITADO. */
  origem?: string;
};

export type CardGroup = {
  id: string;
  name: string;
  itens: CardItem[];
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
              {g.itens.map(({ topic: t, href, origem }) => {
                const feito = isTopico(t.slug);
                return (
                  // A marca de concluído é IRMÃ do link, como no `ProblemList`:
                  // widget focável dentro de `<a>` é estado inválido pela ARIA.
                  // Ela sai do fluxo (o CSS a posiciona) para o card inteiro
                  // continuar sendo um alvo de clique só.
                  <div className="topic-card-wrap" key={t.slug}>
                    {/* A marca vem ANTES do link no DOM, como na barra lateral
                        e no `ProblemList`. Ela é a primeira coisa do card em
                        todas as outras listas, e aqui era a última: o teclado
                        chegava ao card, entrava no tópico, e só encontrava o
                        "marcar como concluído" na volta. `position: absolute`
                        mantém o ✓ no mesmo canto — medido, 18px do topo e 17px
                        da direita antes e depois. */}
                    <button
                      type="button"
                      className={`side-check tcard-check${feito ? " done" : ""}`}
                      role="checkbox"
                      aria-checked={feito}
                      aria-label={`Marcar ${t.name} como concluído`}
                      onClick={() => toggleTopico(t.slug)}
                    >
                      {/* O mesmo traço do `FundamentosSidebar` e do
                          `ProblemList`; o porquê medido de ser desenho, e não o
                          caractere `✓`, está no `globals.css`. `aria-hidden`
                          porque é decoração: o estado é `aria-checked`, o nome
                          é o `aria-label`. */}
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
                    <Link href={href} className={`topic-card${feito ? " done" : ""}`}>
                      <div className="topic-card-top">
                        <span className="topic-card-name">{t.name}</span>
                      </div>
                      <p>{t.description}</p>
                      <div className="tcard-tags">
                        <span className={`level ${levelClass(t.level)}`}>{t.level}</span>
                        {topicTags(t).map((tag) => (
                          <span key={tag.kind} className={`ttag ttag-${tag.kind}`}>{tag.label}</span>
                        ))}
                        {/* De onde o tópico veio, quando não é daqui. O aluno
                            precisa saber de duas coisas: marcar este card conta
                            na casa dele também, e o "em breve" que ele
                            porventura tenha é promessa de outro dono. */}
                        {origem && <span className="ttag ttag-origem">{origem}</span>}
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
