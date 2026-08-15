import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getRoadmap,
  getTopico,
  roadmapTopics,
  ROADMAPS,
} from "@content/roadmaps";
import { TopicoNoRoadmap } from "@/components/TopicoNoRoadmap";
import { pageMetadata } from "@/lib/seo";

// Um tópico dentro de um roadmap extra. A página mora no `TopicoNoRoadmap`,
// que esta rota divide com `/fundamentos/<topico>/`.
//
// O PREÇO DA URL A MAIS, E COMO ELE É PAGO
// O texto é o mesmo de `/topicos/<slug>/`, e conteúdo igual em dois endereços
// sem declaração é o Google escolhendo sozinho qual mostrar. Por isso toda
// página desta rota aponta `canonical` (e `og:url`) para `/topicos/<slug>/` e
// fica FORA do sitemap.

export const dynamicParams = false;

export function generateStaticParams() {
  return ROADMAPS.flatMap((r) =>
    roadmapTopics(r).map((t) => ({ slug: r.slug, topico: t.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; topico: string }>;
}): Promise<Metadata> {
  const { slug, topico } = await params;
  const r = getRoadmap(slug);
  const t = getTopico(topico);
  if (!r || !t) return { title: "Tópico" };
  return pageMetadata({
    // O título diz o roadmap: é o que diferencia esta página da canônica numa
    // aba, num histórico ou num resultado de busca.
    title: `${t.name} · ${r.name}`,
    description: t.description,
    path: `/roadmaps/${r.slug}/${t.slug}/`,
    canonicalDe: `/topicos/${t.slug}/`,
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
  const t = getTopico(topico);
  if (!r || !t) notFound();
  return <TopicoNoRoadmap roadmap={r} topic={t} />;
}
