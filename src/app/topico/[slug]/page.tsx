import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getNeighbors, isEmptyTopic } from "@content/fundamentos";
import {
  getPlacement,
  getRoadmapNeighbors,
  getSiteTopic,
  roadmapsQueCitam,
  SITE_TOPICS,
} from "@content/roadmaps";
import { breadcrumbJsonLd, JsonLd, topicJsonLd, type Migalha } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";
import { datasDoTopico } from "@/lib/datas-do-git";
import { ContinueExplorando } from "@/components/ContinueExplorando";
import { RoadmapsDoTopico } from "@/components/RoadmapsDoTopico";
import { TopicoPagina } from "@/components/TopicoPagina";

// A página CANÔNICA de um tópico, venha ele dos Fundamentos, de um roadmap ou
// das avulsas. O artigo em si mora no `TopicoPagina`, que esta rota divide com
// `/roadmaps/<roadmap>/<topico>/`; aqui ficam as três coisas que dependem de
// ONDE o tópico mora: o rastro, os vizinhos e o que fecha a página.

export const dynamicParams = false;

// `SITE_TOPICS`, e não `ALL_TOPICS`: esta rota serve TODO tópico do site, venha
// ele dos Fundamentos, de um roadmap ou de uma página avulsa. Com `ALL_TOPICS`
// aqui, os tópicos dos roadmaps existiriam nos dados, apareceriam na barra
// lateral do roadmap e devolveriam 404 no clique — sem erro de build, porque
// `dynamicParams = false` simplesmente não gera o que não foi pedido.
export function generateStaticParams() {
  return SITE_TOPICS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = getSiteTopic(slug);
  if (!t) return { title: "Tópico" };
  // Não indexa páginas realmente vazias (sem vídeo, artigo ou visualização) para
  // não criar conteúdo raso aos olhos do Google. Assim que ganham material, entram
  // — e o sitemap usa esta MESMA função para decidir quem ele convida.
  //
  // SEM `ogImage`, de propósito, e a ausência é a parte importante: o
  // `opengraph-image.tsx` deste segmento gera um card por tópico, e um `images`
  // explícito aqui venceria o arquivo e devolveria as 76 rotas ao card da raiz.
  const emptyTopic = isEmptyTopic(t);
  return pageMetadata({
    title: t.name,
    description: t.description,
    path: `/topico/${t.slug}/`,
    titleStyle: "template",
    ...(emptyTopic ? { robots: { index: false, follow: true } } : {}),
  });
}

export default async function TopicoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = getSiteTopic(slug);
  if (!t) notFound();

  // Onde este tópico MORA decide o rastro, os vizinhos e o fim da página. O
  // `Shell` faz a mesma pergunta para escolher a barra lateral, e as duas
  // respostas vêm da mesma função: barra lateral de um roadmap com rastro de
  // outro é o defeito que isto impede.
  const onde = getPlacement(slug) ?? ({ kind: "fundamentos" } as const);
  const doRoadmap = onde.kind === "roadmap" ? onde.roadmap : null;
  const avulso = onde.kind === "standalone";

  const { previous, next } = doRoadmap
    ? getRoadmapNeighbors(doRoadmap, slug)
    : avulso
      ? {}
      : getNeighbors(slug);

  // Os roadmaps que CITAM este tópico, sem contar a casa dele. É a banda do fim
  // da página, e é o que responde "onde mais isto entra?".
  const citadoPor = roadmapsQueCitam(slug);

  // O rastro é montado UMA vez e usado duas: nos links que o leitor vê e no
  // `BreadcrumbList` que o Google lê. A regra que decide o desenho do JSON-LD
  // deste projeto é "a marcação reflete o que está na tela", e a única forma de
  // isso continuar verdade sem depender de alguém lembrar é os dois lerem o
  // mesmo array.
  const migalhas: Migalha[] = doRoadmap
    ? [
        { name: "Início", href: "/" },
        { name: "Roadmaps", href: "/roadmaps/" },
        { name: doRoadmap.name, href: `/roadmaps/${doRoadmap.slug}/` },
        { name: t.name, href: `/topico/${t.slug}/` },
      ]
    : avulso
      ? [
          { name: "Início", href: "/" },
          { name: "Roadmaps", href: "/roadmaps/" },
          { name: t.name, href: `/topico/${t.slug}/` },
        ]
      : [
          { name: "Início", href: "/" },
          { name: t.group, href: "/fundamentos/" },
          { name: t.name, href: `/topico/${t.slug}/` },
        ];

  const datas = datasDoTopico(t.slug);

  return (
    <TopicoPagina
      topic={t}
      migalhas={migalhas}
      solto={avulso}
      comChipDeGrupo={avulso}
      // O MESMO `isEmptyTopic` do `noindex` acima e do filtro do sitemap. Sem
      // este terceiro uso, a página de um tópico sem material declarava ser um
      // recurso de aprendizado e, duas tags adiante, pedia para não ser
      // indexada.
      jsonLd={
        !isEmptyTopic(t) ? <JsonLd data={[topicJsonLd(t, datas), breadcrumbJsonLd(migalhas)]} /> : null
      }
      fim={
        <>
          {/* O fim da página é diferente em cada casa, e a diferença não é
              estética: é o que existe para oferecer.

              FUNDAMENTOS e ROADMAP são filas, e a fila tem anterior e próximo.
              Num roadmap, quando não há anterior, o degrau de trás é a abertura
              dele — que é onde estão a descrição, os pré-requisitos e a ordem
              sugerida, e é justamente o que o leitor pulou se entrou pelo card
              de um tópico.

              TÓPICO AVULSO não é fila. Ele não tem "próximo": inventar um
              levaria o leitor de Skip List para Union-Find como se um
              continuasse o outro. */}
          {avulso ? (
            citadoPor.length === 0 && <ContinueExplorando excluir={t.slug} />
          ) : (
            <div className="prevnext">
              {previous ? (
                <Link href={`/topico/${previous.slug}`}>
                  <span className="lbl">‹ Anterior</span>
                  <span className="nm">{previous.name}</span>
                </Link>
              ) : doRoadmap ? (
                <Link href={`/roadmaps/${doRoadmap.slug}`}>
                  <span className="lbl">‹ Abertura do roadmap</span>
                  <span className="nm">{doRoadmap.name}</span>
                </Link>
              ) : (
                <span style={{ flex: 1 }} />
              )}
              {next ? (
                <Link href={`/topico/${next.slug}`} className="next">
                  <span className="lbl">Próximo ›</span>
                  <span className="nm">{next.name}</span>
                </Link>
              ) : (
                <span style={{ flex: 1 }} />
              )}
            </div>
          )}

          {/* E, depois do caminho principal, os caminhos laterais: os roadmaps
              que também contêm este tópico. Vem DEPOIS do anterior/próximo de
              propósito — continuar a sequência em que o leitor está é a oferta
              principal; mudar de sequência é a segunda. */}
          <RoadmapsDoTopico slugs={citadoPor.map((r) => r.slug)} nomeDoTopico={t.name} />
        </>
      }
    />
  );
}
