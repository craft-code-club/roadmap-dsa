import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTopico, isEmptyTopic, TOPICOS } from "@content/topicos";
import { roadmapsDoTopico } from "@content/roadmaps";
import { breadcrumbJsonLd, JsonLd, topicJsonLd, type Migalha } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";
import { datasDoTopico } from "@/lib/datas-do-git";
import { ContinueExplorando } from "@/components/ContinueExplorando";
import { RoadmapsDoTopico } from "@/components/RoadmapsDoTopico";
import { TopicoPagina } from "@/components/TopicoPagina";

// A página CANÔNICA de um tópico: ele sozinho, sem roadmap nenhum em volta.
//
// É o destino do índice `/topicos/`, dos links dentro dos artigos e do 301 que
// vem da rota antiga no singular. Quem chega aqui não está percorrendo uma
// sequência, e por isso esta página não tem "anterior" nem "próximo": o que ela
// oferece é a lista dos roadmaps de que o tópico participa, na barra lateral
// (`TopicoSidebar`) e nos cards do fim.
//
// Ela é também a URL canônica de todas as cópias em `/roadmaps/<r>/<t>/` e
// `/fundamentos/<t>/`. É a única que não muda quando alguém cita o tópico num
// roadmap novo, e é por isso que ela é a canônica.

export const dynamicParams = false;

export function generateStaticParams() {
  return TOPICOS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = getTopico(slug);
  if (!t) return { title: "Tópico" };
  // Não indexa páginas realmente vazias (sem vídeo, artigo ou visualização):
  // conteúdo raso aos olhos do Google. Assim que ganham material, entram — e o
  // sitemap usa esta MESMA função para decidir quem ele convida.
  return pageMetadata({
    title: t.name,
    description: t.description,
    path: `/topicos/${t.slug}/`,
    titleStyle: "template",
    ...(isEmptyTopic(t) ? { robots: { index: false, follow: true } } : {}),
  });
}

export default async function TopicoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = getTopico(slug);
  if (!t) notFound();

  const roadmaps = roadmapsDoTopico(slug);

  const migalhas: Migalha[] = [
    { name: "Início", href: "/" },
    { name: "Tópicos", href: "/topicos/" },
    { name: t.name, href: `/topicos/${t.slug}/` },
  ];
  const datas = datasDoTopico(t.slug);

  return (
    <TopicoPagina
      topic={t}
      migalhas={migalhas}
      // Sem roadmap nenhum, não há barra lateral e a coluna precisa recentrar.
      solto={roadmaps.length === 0}
      // O rastro aqui diz só "Tópicos", então o assunto do tópico não está em
      // lugar nenhum da tela — e o `about` do JSON-LD não pode carregar um nome
      // que o leitor não vê.
      comChipDeGrupo
      jsonLd={
        !isEmptyTopic(t) ? <JsonLd data={[topicJsonLd(t, datas), breadcrumbJsonLd(migalhas)]} /> : null
      }
      fim={
        roadmaps.length > 0 ? (
          <RoadmapsDoTopico slugs={roadmaps.map((r) => r.slug)} nomeDoTopico={t.name} />
        ) : (
          <ContinueExplorando excluir={t.slug} />
        )
      }
    />
  );
}
