import type { Metadata } from "next";
import Link from "next/link";
import { isEmptyTopic, TOPICOS, TOTAL_TOPICS_PRONTOS } from "@content/topicos";
import { roadmapsDoTopico } from "@content/roadmaps";
import { comNumero } from "@/lib/format";
import { TodosOsTopicos, type LinhaDeTopico } from "@/components/TodosOsTopicos";
import { extrasJsonLd, JsonLd } from "@/lib/jsonld";
import { LINKS } from "@/lib/links";
import { pageMetadata } from "@/lib/seo";

// O índice completo: todo tópico do site numa página, uma vez cada.
//
// POR QUE ELA EXISTE, se já há o `/fundamentos/`, o `/roadmaps/` e a busca da
// barra lateral: porque as três respondem "o que estudar agora", e nenhuma
// responde "isto existe aqui?". Quem chega procurando "vocês têm Bloom Filter?"
// não tinha tela para abrir.
//
// A LISTA É POR TÓPICO, não por roadmap, e é essa a diferença. Nas outras telas
// o mesmo tópico aparece em cada percurso que o cita; aqui ele aparece UMA vez,
// com a etiqueta dos roadmaps de que participa ao lado. É a única tela que
// mostra o tópico e todos os percursos dele de relance.

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Todos os tópicos de Algoritmos e Estruturas de Dados",
    // Sem promessa em bloco. A frase anterior dizia "50 tópicos com visualização,
    // artigo, vídeo e problemas", e 14 deles ainda não têm nada: é a mesma
    // inflação que o guarda de copy da home existe para impedir, um nível acima.
    description: `A lista completa do guia: ${TOPICOS.length} tópicos de algoritmos e estruturas de dados em português, ${TOTAL_TOPICS_PRONTOS} deles já publicados. Filtre por assunto, nível e material, ou busque pelo nome.`,
    ogTitle: "Todos os tópicos do Roadmap DSA",
    ogDescription: `${TOPICOS.length} tópicos de algoritmos e estruturas de dados, num índice só. Grátis, em português.`,
    path: "/topicos/",
    // Sem card próprio: o da raiz fala do guia inteiro, que é exatamente o que
    // esta página é. Ela era a única rota de topo chegando como retângulo
    // cinza, e é a mais colável de todas ("olha esse guia").
    ogImage: "raiz",
  });
}

export const dynamic = "force-static";

export default function TopicosPage() {
  // A ordem é a do registro, que é a de aprendizado: a página não tem seções
  // (o assunto virou etiqueta no card), mas quem rola de cima a baixo sem
  // filtrar nada continua vendo o guia na sequência em que ele foi pensado.
  const linhas: LinhaDeTopico[] = TOPICOS.map((t) => ({
    topic: t,
    roadmaps: roadmapsDoTopico(t.slug).map((r) => r.name),
  }));

  const semRoadmap = TOPICOS.filter((t) => roadmapsDoTopico(t.slug).length === 0).length;

  return (
    <div className="roadmap-wrap">
      {/* O índice inteiro em dado estruturado, na ordem em que a página o
          desenha. `ItemList` e não `CollectionPage`: o que esta página é, é uma
          lista ordenada de recursos que já se declaram em outro lugar. */}
      <JsonLd
        data={extrasJsonLd(
          TOPICOS.map((t) => ({ name: t.name, href: `/topicos/${t.slug}/` })),
          { id: "/topicos/#indice", name: "Todos os tópicos do Roadmap DSA" }
        )}
      />
      <span className="roadmap-eyebrow">Índice</span>
      <h1>Todos os tópicos</h1>
      <p className="roadmap-intro">
        Os <strong>{TOPICOS.length} tópicos</strong> do guia numa página só, {TOTAL_TOPICS_PRONTOS} deles
        já publicados. Um tópico existe por conta própria e pode aparecer em vários{" "}
        <Link href="/roadmaps">roadmaps</Link>: as etiquetas de cada card dizem o assunto, o
        nível, o que ele já tem pronto e em que percursos aparece.
        {semRoadmap > 0 && ` ${comNumero(semRoadmap, "não está", "não estão")} em nenhum.`} Clique
        nas etiquetas lá em cima para ir estreitando: cada uma que entra tira tópicos da lista.
      </p>

      <TodosOsTopicos topicos={linhas} />

      <div className="discord-strip">
        <span className="dot" />
        <p>
          Não achou o que procurava? Peça no Discord: a fila de produção é aberta e a comunidade
          decide o que vem primeiro.
        </p>
        <a
          href={LINKS.discord}
          className="btn btn-discord"
          target="_blank"
          rel="noopener noreferrer"
          style={{ padding: "9px 16px" }}
        >
          Pedir um tópico
        </a>
      </div>
    </div>
  );
}
