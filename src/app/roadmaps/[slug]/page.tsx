import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getRoadmap,
  getTopico,
  roadmapGroups,
  roadmapHasMaterial,
  roadmapTopics,
  ROADMAPS_EXTRAS,
  urlDoRoadmap,
  urlDoTopicoNoRoadmap,
} from "@content/roadmaps";
import { isEmptyTopic } from "@content/topicos";
import { GrupoCards } from "@/components/GrupoCards";
import { breadcrumbJsonLd, JsonLd, roadmapJsonLd, type Migalha } from "@/lib/jsonld";
import { LINKS } from "@/lib/links";
import { pageMetadata } from "@/lib/seo";
import { levelClass } from "@/lib/ui";

// A abertura de um roadmap: o que ele é, o que vem antes, e os tópicos em ordem.
//
// É a mesma função da `/introducao/` para os Fundamentos, e a mesma do card
// `intro` que alguns grupos têm. O que ela acrescenta e nenhuma das duas tem é a
// linha "Antes daqui": um roadmap extra pressupõe os Fundamentos, e mandar o
// aluno para Segment Tree sem ele ter visto Prefix Sum é o tipo de buraco que só
// aparece três parágrafos adiante, quando já é tarde.

export const dynamicParams = false;

export function generateStaticParams() {
  return ROADMAPS_EXTRAS.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = getRoadmap(slug);
  if (!r) return { title: "Roadmap" };
  // O MESMO critério dos tópicos vazios, um nível acima: roadmap em que nenhum
  // tópico tem material é uma página de abertura sem nada para abrir. Ela
  // continua no site — mapear o território vale para quem estuda, e o aluno
  // decide o que estudar sabendo o que existe —, mas não pede lugar no índice do
  // Google, e o sitemap usa esta mesma função para decidir quem ele convida.
  const comMaterial = roadmapHasMaterial(r);
  return pageMetadata({
    title: `${r.name}: roadmap visual e gratuito em português`,
    description: r.description,
    ogTitle: r.name,
    ogDescription: r.tagline,
    path: `/roadmaps/${r.slug}/`,
    ...(comMaterial ? {} : { robots: { index: false, follow: true } }),
  });
}

export default async function RoadmapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = getRoadmap(slug);
  if (!r) notFound();

  const topicos = roadmapTopics(r);
  const prontos = topicos.filter((t) => !isEmptyTopic(t));
  const primeiro = prontos[0];
  const requisitos = (r.requires ?? []).map((s) => getTopico(s)).filter((t) => !!t);

  const migalhas: Migalha[] = [
    { name: "Início", href: "/" },
    { name: "Roadmaps", href: "/roadmaps/" },
    { name: r.name, href: `${urlDoRoadmap(r)}/` },
  ];
  const caminho = migalhas.slice(0, -1);

  return (
    <div className="roadmap-wrap">
      {/* Mesma regra da página de tópico: a marcação só sai quando a página
          pede para ser indexada. Declarar-se um recurso e, duas tags adiante,
          pedir para ser ignorado é a contradição que o `noindex` esconde do
          Google e entrega a qualquer outro consumidor de JSON-LD. */}
      {roadmapHasMaterial(r) && (
        <JsonLd
          data={[
            roadmapJsonLd({ slug: r.slug, name: r.name, topics: topicos }),
            breadcrumbJsonLd(migalhas),
          ]}
        />
      )}

      <nav className="breadcrumb" aria-label="Trilha de navegação">
        {caminho.map((m) => (
          <Fragment key={m.href}>
            <Link href={m.href} style={{ color: "inherit" }}>{m.name}</Link>
            <span aria-hidden="true">/</span>
          </Fragment>
        ))}
        <span className="cur" aria-current="page">{r.name}</span>
      </nav>

      <span className="roadmap-eyebrow">Roadmap</span>
      <h1>{r.name}</h1>

      <div className="topic-chips" style={{ marginTop: 14 }}>
        <span className={`level ${levelClass(r.level)}`} style={{ borderStyle: "solid" }}>{r.level}</span>
        <span className="chip">{topicos.length} tópicos</span>
        <span className="chip">
          {prontos.length === 0
            ? "conteúdo em produção"
            : `${prontos.length} publicado${prontos.length > 1 ? "s" : ""}`}
        </span>
      </div>

      <p className="roadmap-intro">{r.description}</p>

      {requisitos.length > 0 && (
        <div className="roadmap-requisitos">
          <span className="roadmap-requisitos-rot">Antes daqui</span>
          <div className="roadmap-requisitos-links">
            {requisitos.map((t) => (
              <Link key={t.slug} href={`/topicos/${t.slug}`} className="req-link">
                {t.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Todo tópico de um roadmap é uma CITAÇÃO: ele existe por conta própria
          e pode estar em outros percursos. Dizer isso na abertura evita a
          leitura errada mais provável, a de que este roadmap está "vazio"
          porque poucos tópicos nasceram aqui. Nenhum nasceu aqui: o que a
          página publica é a CURADORIA. */}
      <p className="roadmap-emprestados">
        Estes tópicos existem por conta própria e aparecem em outros percursos do guia. O que este
        roadmap traz é a <strong>ordem</strong>: qual vem antes de qual, e por quê. Marcar um deles
        conta em toda parte.
      </p>

      <div className="hero-actions" style={{ marginBottom: 34 }}>
        {primeiro ? (
          <Link href={urlDoTopicoNoRoadmap(r, primeiro.slug)} className="btn btn-primary">
            Começar por {primeiro.name}
          </Link>
        ) : (
          // Sem material, o botão que começaria o roadmap levaria a uma página
          // "em breve" — pior do que não existir. O que existe de verdade para
          // fazer hoje é acompanhar ou escrever, e é isso que a página oferece.
          <a href={LINKS.discord} className="btn btn-discord" target="_blank" rel="noopener noreferrer">
            Acompanhar no Discord →
          </a>
        )}
        <Link href="/roadmaps" className="btn">Ver os outros roadmaps</Link>
      </div>

      {/* Os cards levam para DENTRO do roadmap (`/roadmaps/<r>/<slug>/`), e não
          para a página canônica do tópico: quem clica aqui quer percorrer este
          roadmap, e cair na casca de outra casa no primeiro clique seria sair
          dele sem ter pedido. */}
      <GrupoCards
        groups={roadmapGroups(r).map((g) => ({
          id: g.id,
          name: g.name,
          itens: g.topicos.map((topic) => ({
            topic,
            href: urlDoTopicoNoRoadmap(r, topic.slug),
          })),
        }))}
      />

      <div className="discord-strip">
        <span className="dot" />
        <p>
          Este roadmap é escrito pela comunidade, um tópico por vez. Quer ajudar a escrever um
          deles? Chame no Discord ou abra um PR.
        </p>
        <a
          href={LINKS.github}
          className="btn btn-discord"
          target="_blank"
          rel="noopener noreferrer"
          style={{ padding: "9px 16px" }}
        >
          Contribuir
        </a>
      </div>
    </div>
  );
}
