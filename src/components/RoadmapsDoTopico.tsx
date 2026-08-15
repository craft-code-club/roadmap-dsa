"use client";

import Link from "next/link";
import { CARD_DE_ROADMAP } from "@content/roadmaps";
import { ExtrasGrid } from "@/components/ExtrasGrid";

/**
 * "Este tópico também faz parte de", no fim da página canônica de um tópico.
 *
 * POR QUE NO FIM, E NÃO AO LADO
 * A coluna da direita já é o índice "Nesta página", e ela serve para navegar
 * DENTRO do artigo. Pôr caminhos para fora ali é competir com o texto no
 * momento em que o leitor decidiu ler: a hora de oferecer um desvio é quando
 * ele chega ao fim e pergunta "e agora?". No mobile a questão nem existe, porque
 * a coluna lateral some.
 *
 * POR QUE CARDS, E NÃO UMA LINHA DE TEXTO
 * Porque a resposta útil não é "este tópico está em 2 roadmaps", é "existe um
 * roadmap de Caminhos Mínimos, ele tem 6 tópicos, e o Dijkstra que você acabou
 * de ler é um deles". Isso é um card, e é o mesmo card da vitrine — o leitor já
 * o reconhece de `/roadmaps/`.
 *
 * O QUE ISSO ENSINA, que é o ponto
 * Ver o mesmo algoritmo servindo a dois objetivos diferentes é metade do que
 * separa quem decorou de quem entendeu. O Dijkstra nos Fundamentos responde
 * "como se percorre um grafo com pesos"; em Caminhos Mínimos ele responde
 * "que algoritmo eu uso neste mapa". Mesma página, duas perguntas.
 */
export function RoadmapsDoTopico({
  slugs,
  nomeDoTopico,
}: {
  /** Slugs dos roadmaps que citam este tópico. Os Fundamentos contam. */
  slugs: string[];
  nomeDoTopico: string;
}) {
  const cards = slugs.map((s) => CARD_DE_ROADMAP[s]).filter(Boolean);
  if (cards.length === 0) return null;

  return (
    <section className="continue-explorando">
      <div className="continue-head">
        <h2 className="prose-h2" style={{ margin: 0 }}>
          {cards.length === 1 ? "Este tópico faz parte de" : "Este tópico faz parte destes roadmaps"}
        </h2>
        <Link href="/roadmaps" className="link-btn">Ver todos →</Link>
      </div>
      <p className="prose-p" style={{ color: "var(--ccc-muted)", marginTop: 0 }}>
        {nomeDoTopico} aparece {cards.length === 1 ? "num percurso" : "em percursos"} com objetivo
        próprio. O conteúdo é o mesmo; o que muda é a pergunta que ele responde ali, e o que vem
        antes e depois.
      </p>
      <ExtrasGrid cards={cards} />
    </section>
  );
}
