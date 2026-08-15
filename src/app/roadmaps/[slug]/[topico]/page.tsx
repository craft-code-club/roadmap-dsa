import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getRoadmap,
  getRoadmapNeighbors,
  getSiteTopic,
  todasAsPaginasDeRoadmap,
} from "@content/roadmaps";
import { TopicoPagina } from "@/components/TopicoPagina";
import type { Migalha } from "@/lib/jsonld";
import { pageMetadata } from "@/lib/seo";

// O mesmo tópico, servido DENTRO de um roadmap.
//
// POR QUE ESTA ROTA EXISTE
// Um tópico pode pertencer a mais de um roadmap: a Tabela Hash é dos
// Fundamentos e também está em "Bancos de Dados". Quem está percorrendo Bancos
// de Dados e clica na Tabela Hash quer continuar em Bancos de Dados — com
// aquela barra lateral, aquele progresso e aquele "próximo". Mandá-lo para a
// página canônica trocaria a casca embaixo do dedo dele e o expulsaria do
// roadmap no primeiro clique.
//
// O PREÇO, E COMO ELE É PAGO
// O texto é o mesmo em duas URLs, e conteúdo igual em dois endereços sem
// declaração é o Google escolhendo sozinho qual mostrar e dividindo os sinais
// entre as duas. Por isso toda página desta rota aponta `canonical` (e `og:url`)
// para `/topico/<slug>/`, e por isso ela fica FORA do sitemap: o sitemap é a
// lista do que o site quer no índice, e o que o site quer no índice é a
// canônica.
//
// E ela não emite JSON-LD nenhum, de propósito. Quem declara o recurso é a
// página canônica. Declarar de novo aqui, numa página que acabou de dizer "a
// principal é outra", é a mesma contradição que este repositório evita quando
// não emite `LearningResource` em página `noindex`.

export const dynamicParams = false;

export function generateStaticParams() {
  return todasAsPaginasDeRoadmap().map(({ roadmap, topic }) => ({
    slug: roadmap.slug,
    topico: topic.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; topico: string }>;
}): Promise<Metadata> {
  const { slug, topico } = await params;
  const r = getRoadmap(slug);
  const t = getSiteTopic(topico);
  if (!r || !t) return { title: "Tópico" };
  return pageMetadata({
    // O título diz o roadmap: é o que diferencia esta página da canônica para
    // quem a vê numa aba, num histórico ou num resultado de busca interno.
    title: `${t.name} · ${r.name}`,
    description: t.description,
    path: `/roadmaps/${r.slug}/${t.slug}/`,
    canonicalDe: `/topico/${t.slug}/`,
    titleStyle: "template",
  });
}

export default async function TopicoDoRoadmap({
  params,
}: {
  params: Promise<{ slug: string; topico: string }>;
}) {
  const { slug, topico } = await params;
  const r = getRoadmap(slug);
  const t = getSiteTopic(topico);
  if (!r || !t) notFound();

  const { previous, next } = getRoadmapNeighbors(r, t.slug);

  const migalhas: Migalha[] = [
    { name: "Início", href: "/" },
    { name: "Roadmaps", href: "/roadmaps/" },
    { name: r.name, href: `/roadmaps/${r.slug}/` },
    { name: t.name, href: `/roadmaps/${r.slug}/${t.slug}/` },
  ];

  return (
    <TopicoPagina
      topic={t}
      migalhas={migalhas}
      fim={
        <>
          {/* Anterior e próximo DENTRO do roadmap, com os links do roadmap:
              sair daqui só quando o leitor pedir. */}
          <div className="prevnext">
            {previous ? (
              <Link href={`/roadmaps/${r.slug}/${previous.slug}`}>
                <span className="lbl">‹ Anterior</span>
                <span className="nm">{previous.name}</span>
              </Link>
            ) : (
              <Link href={`/roadmaps/${r.slug}`}>
                <span className="lbl">‹ Abertura do roadmap</span>
                <span className="nm">{r.name}</span>
              </Link>
            )}
            {next ? (
              <Link href={`/roadmaps/${r.slug}/${next.slug}`} className="next">
                <span className="lbl">Próximo ›</span>
                <span className="nm">{next.name}</span>
              </Link>
            ) : (
              <Link href="/roadmaps" className="next">
                <span className="lbl">Fim do roadmap ›</span>
                <span className="nm">Ver os outros</span>
              </Link>
            )}
          </div>

          {/* A ponte para a página canônica. Ela não é burocracia de SEO: o
              leitor que quiser salvar, compartilhar ou voltar a este tópico
              fora do roadmap precisa saber que existe um endereço dele que não
              carrega este contexto junto. */}
          <p className="pagina-canonica">
            Este tópico também tem página própria, fora deste roadmap:{" "}
            <Link href={`/topico/${t.slug}`}>{t.name}</Link>.
          </p>
        </>
      }
    />
  );
}
