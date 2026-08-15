import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FUNDAMENTOS, getTopico, roadmapTopics } from "@content/roadmaps";
import { TopicoNoRoadmap } from "@/components/TopicoNoRoadmap";
import { pageMetadata } from "@/lib/seo";

// Um tópico dentro dos Fundamentos.
//
// É a MESMA rota de `/roadmaps/<r>/<topico>/`, com a base curta: os Fundamentos
// moram em `/fundamentos/` e não em `/roadmaps/fundamentos/` porque são a
// sequência que a home aponta e a mais buscada do site. A exceção existe em um
// lugar só (`urlDoRoadmap`), e a página em outro (`TopicoNoRoadmap`); aqui fica
// apenas a fiação da rota.

export const dynamicParams = false;

export function generateStaticParams() {
  return roadmapTopics(FUNDAMENTOS).map((t) => ({ topico: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ topico: string }> }): Promise<Metadata> {
  const { topico } = await params;
  const t = getTopico(topico);
  if (!t) return { title: "Tópico" };
  return pageMetadata({
    title: `${t.name} · ${FUNDAMENTOS.name}`,
    description: t.description,
    path: `/fundamentos/${t.slug}/`,
    canonicalDe: `/topicos/${t.slug}/`,
    titleStyle: "template",
  });
}

export default async function TopicoDosFundamentos({ params }: { params: Promise<{ topico: string }> }) {
  const { topico } = await params;
  const t = getTopico(topico);
  if (!t) notFound();
  return <TopicoNoRoadmap roadmap={FUNDAMENTOS} topic={t} />;
}
