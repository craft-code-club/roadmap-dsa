"use client";

import Link from "next/link";
import { EXTRA_CARDS, type ExtraCard } from "@content/courses";
import { levelClass } from "@/lib/ui";
import { useProgress } from "@/components/ProgressProvider";

// A vitrine do que existe fora da trilha, em um componente só.
//
// Ela aparece em dois lugares — no fim do `/roadmap/` e como corpo do
// `/cursos/` — e os dois têm que mostrar exatamente a mesma coisa. Uma segunda
// cópia da grade é como a home e o roadmap acabariam contando duas histórias
// diferentes sobre o mesmo catálogo, cada uma envelhecendo por conta própria.
//
// Curso e página avulsa dividem o mesmo card de propósito. O aluno que chega
// aqui está perguntando "o que mais tem?", e não "quais são os cursos?": pedir
// que ele entenda a diferença entre os dois formatos ANTES de ver o que tem em
// cada um é a ordem errada. A etiqueta no canto responde a diferença depois,
// para quem quiser saber quanto tempo aquilo vai tomar.

function metaDoCard(c: ExtraCard, feitos: number, hydrated: boolean): string {
  if (c.kind === "avulso") {
    if (c.ready === 0) return "em breve";
    return hydrated && feitos > 0 ? "concluído" : "página única";
  }
  if (c.ready === 0) return `${c.topics} tópicos · em breve`;
  if (hydrated && feitos > 0) return `${feitos} de ${c.topics} concluídos`;
  return `${c.ready} de ${c.topics} publicados`;
}

function CardExtra({ card }: { card: ExtraCard }) {
  const { hydrated, contarTopicos } = useProgress();
  const feitos = contarTopicos(card.topicSlugs);
  const completo = card.ready > 0 && feitos === card.topics;

  return (
    <Link
      href={card.href}
      className={`extra-card${completo ? " done" : ""}${card.ready === 0 ? " soon" : ""}`}
    >
      <div className="extra-card-top">
        {/* Decoração pura: quem lê com leitor de tela recebe o nome do card
            logo abaixo, e um glifo anunciado como "◈" só atrapalha. */}
        <span className="extra-glyph" aria-hidden="true">{card.glyph}</span>
        <span className={`extra-kind extra-kind-${card.kind}`}>
          {card.kind === "curso" ? "Curso" : "Página avulsa"}
        </span>
      </div>
      <div className="extra-name">{card.name}</div>
      <p>{card.tagline}</p>
      <div className="extra-foot">
        <span className={`level ${levelClass(card.level)}`}>{card.level}</span>
        <span className="extra-meta">{metaDoCard(card, feitos, hydrated)}</span>
      </div>
    </Link>
  );
}

export function ExtrasGrid({ cards = EXTRA_CARDS }: { cards?: ExtraCard[] }) {
  return (
    <div className="grid-3 extras-grid">
      {cards.map((c) => (
        <CardExtra key={`${c.kind}-${c.slug}`} card={c} />
      ))}
    </div>
  );
}
