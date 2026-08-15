"use client";

import Link from "next/link";
import { topicTags, type Topic } from "@content/topicos";
import { levelClass } from "@/lib/ui";
import { useProgress } from "@/components/ProgressProvider";

/**
 * O card de UM tópico, com a marca de concluído.
 *
 * Extraído do `GrupoCards` quando o índice completo passou a desenhar a mesma
 * peça sem os grupos em volta. Sem isto seriam dois cards de tópico no mesmo
 * site, e cópia de desenho é o que mais desalinha sozinho neste repositório: o
 * traço do ✓ já existe em quatro lugares e tem um teste (`check-alinhado`) só
 * para medir se os quatro continuam iguais.
 */
export type CardDeTopico = {
  topic: Topic;
  href: string;
  /**
   * Em que roadmaps este tópico aparece, pelo nome.
   *
   * Três estados, e os três importam:
   *   `undefined`  não mostre esta dimensão. É o caso da abertura de um
   *                roadmap: o leitor já sabe em qual está, e repetir o nome em
   *                cada card seria a mesma etiqueta trinta vezes.
   *   `["A", "B"]` o tópico aparece nesses percursos.
   *   `[]`         SEI que ele não aparece em nenhum, e isso é informação: o
   *                card ganha a etiqueta "avulso". Sem o array vazio esse caso
   *                seria indistinguível de "não perguntei".
   */
  origens?: string[];
  /**
   * Mostra o ASSUNTO do tópico como etiqueta.
   *
   * Só o índice completo pede: ele deixou de separar os tópicos em seções por
   * assunto, e a etiqueta é onde aquela informação passou a morar. Na abertura
   * de um roadmap o assunto seria ruído, porque o título do grupo logo acima
   * já diz do que aquilo trata.
   */
  comAssunto?: boolean;
};

export function TopicoCard({ topic: t, href, origens, comAssunto }: CardDeTopico) {
  const { isTopico, toggleTopico } = useProgress();
  const feito = isTopico(t.slug);

  return (
    // A marca de concluído é IRMÃ do link, como no `ProblemList`: widget
    // focável dentro de `<a>` é estado inválido pela ARIA. Ela sai do fluxo (o
    // CSS a posiciona) para o card inteiro continuar sendo um alvo de clique só.
    <div className="topic-card-wrap">
      {/* A marca vem ANTES do link no DOM, como na barra lateral e no
          `ProblemList`. Ela é a primeira coisa do card em todas as outras
          listas, e aqui já foi a última: o teclado chegava ao card, entrava no
          tópico, e só encontrava o "marcar como concluído" na volta.
          `position: absolute` mantém o ✓ no mesmo canto. */}
      <button
        type="button"
        className={`side-check tcard-check${feito ? " done" : ""}`}
        role="checkbox"
        aria-checked={feito}
        aria-label={`Marcar ${t.name} como concluído`}
        onClick={() => toggleTopico(t.slug)}
      >
        {/* O mesmo traço do `FundamentosSidebar` e do `ProblemList`; o porquê
            medido de ser desenho, e não o caractere `✓`, está no `globals.css`.
            `aria-hidden` porque é decoração: o estado é `aria-checked`, o nome
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
          {comAssunto && <span className="ttag ttag-assunto">{t.group}</span>}
          <span className={`level ${levelClass(t.level)}`}>{t.level}</span>
          {topicTags(t).map((tag) => (
            <span key={tag.kind} className={`ttag ttag-${tag.kind}`}>{tag.label}</span>
          ))}
          {/* Em que percursos ele aparece. Só o índice completo pede isso: nas
              outras telas o leitor vê um roadmap por vez e a etiqueta seria a
              mesma em toda a grade. */}
          {origens?.map((nome) => (
            <span key={nome} className="ttag ttag-origem">{nome}</span>
          ))}
          {origens?.length === 0 && <span className="ttag ttag-avulso">avulso</span>}
        </div>
      </Link>
    </div>
  );
}
