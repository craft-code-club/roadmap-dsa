import type { Metadata } from "next";
import Link from "next/link";
import { ALL_TOPICS, GROUPS, isEmptyTopic, TOTAL_TOPICS } from "@content/fundamentos";
import {
  origemDoTopico,
  roadmapGroups,
  roadmapsQueCitam,
  ROADMAPS,
  SITE_TOPICS,
  STANDALONES,
} from "@content/roadmaps";
import { TodosOsTopicos, type SecaoDeTopicos } from "@/components/TodosOsTopicos";
import { extrasJsonLd, JsonLd } from "@/lib/jsonld";
import { LINKS } from "@/lib/links";
import { pageMetadata } from "@/lib/seo";

// O índice completo: todo tópico do site numa página.
//
// POR QUE ELA EXISTE, se já há o /fundamentos/, o /roadmaps/ e a busca da barra
// lateral: porque as três respondem "o que estudar agora", e nenhuma responde
// "isto existe aqui?". A busca da barra só enxerga os Fundamentos; o /roadmaps/
// lista roadmaps, não tópicos; e o /fundamentos/ para no que está na fila. Quem
// chega procurando "vocês têm Bloom Filter?" não tinha uma tela para abrir.
//
// É também a única tela que mostra o tópico em MAIS DE UMA casa ao mesmo tempo:
// nas outras, o leitor vê uma casa por vez.

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Todos os tópicos de Algoritmos e Estruturas de Dados",
    description: `A lista completa do guia: ${SITE_TOPICS.length} tópicos de algoritmos e estruturas de dados em português, dos ${TOTAL_TOPICS} fundamentos aos roadmaps de bancos de dados, caminhos mínimos, strings e estruturas probabilísticas. Busque por nome, assunto ou roadmap.`,
    ogTitle: "Todos os tópicos do Roadmap DSA",
    ogDescription: `${SITE_TOPICS.length} tópicos de algoritmos e estruturas de dados, num índice só. Grátis, em português.`,
    path: "/topicos/",
  });
}

export const dynamic = "force-static";

export default function TopicosPage() {
  const nomes = (slugs: string[]) => slugs;

  const secoes: SecaoDeTopicos[] = [
    ...GROUPS.map((g) => ({
      id: `t-${g.id}`,
      nome: g.name,
      linhas: g.topics.map((t) => ({
        topic: t,
        casa: "Fundamentos",
        tambemEm: roadmapsQueCitam(t.slug).map((r) => r.name),
      })),
    })),
    ...ROADMAPS.map((r) => ({
      id: `t-roadmap-${r.slug}`,
      nome: r.name,
      sub: r.tagline,
      linhas: roadmapGroups(r).flatMap((g) =>
        g.itens.map(({ topic, emprestado }) => ({
          topic,
          casa: emprestado ? origemDoTopico(topic.slug) : r.name,
          // Nesta seção o que interessa é a origem de quem foi citado: dizer
          // "também está em Bancos de Dados" dentro de Bancos de Dados seria
          // repetir o cabeçalho.
          tambemEm: emprestado ? [origemDoTopico(topic.slug)] : [],
        }))
      ),
    })),
    {
      id: "t-avulsos",
      nome: "Tópicos avulsos",
      sub: "Estruturas que se bastam numa página só, fora de qualquer sequência.",
      linhas: STANDALONES.map((s) => ({
        topic: s.topic,
        casa: "Avulso",
        tambemEm: roadmapsQueCitam(s.topic.slug).map((r) => r.name),
      })),
    },
  ];

  const prontos = SITE_TOPICS.filter((t) => !isEmptyTopic(t)).length;

  return (
    <div className="roadmap-wrap">
      {/* O índice inteiro em dado estruturado, na ordem em que a página o
          desenha. `ItemList` e não `CollectionPage`: o que esta página é, é uma
          lista ordenada de recursos que já se declaram em outro lugar. */}
      <JsonLd
        data={extrasJsonLd(
          SITE_TOPICS.map((t) => ({ name: t.name, href: `/topico/${t.slug}/` }))
        )}
      />
      <span className="roadmap-eyebrow">Índice</span>
      <h1>Todos os tópicos</h1>
      <p className="roadmap-intro">
        Os <strong>{SITE_TOPICS.length} tópicos</strong> do guia numa página só, {prontos} deles já
        publicados. Os <Link href="/fundamentos">Fundamentos</Link> são a ordem sugerida e os{" "}
        <Link href="/roadmaps">roadmaps</Link> são percursos com objetivo próprio. Aqui não há
        ordem: há tudo, para você procurar.
      </p>

      <TodosOsTopicos secoes={secoes} />

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
