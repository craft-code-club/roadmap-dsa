import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COURSES, courseHasMaterial, courseTopics, getCourse } from "@content/courses";
import { getTopic, isEmptyTopic } from "@content/roadmap";
import { GrupoCards } from "@/components/GrupoCards";
import { breadcrumbJsonLd, courseJsonLd, JsonLd, type Migalha } from "@/lib/jsonld";
import { LINKS } from "@/lib/links";
import { pageMetadata } from "@/lib/seo";
import { levelClass } from "@/lib/ui";

// A abertura de um curso: o que ele é, o que vem antes, e os tópicos em ordem.
//
// É a mesma função da `/introducao/` para a trilha principal, e a mesma do card
// `intro` que alguns grupos do roadmap têm. O que ela acrescenta e nenhuma das
// duas tem é a linha "Antes daqui": um curso extra pressupõe a trilha, e mandar
// o aluno para Segment Tree sem ele ter visto Prefix Sum é o tipo de buraco que
// só aparece três parágrafos adiante, quando já é tarde.

export const dynamicParams = false;

export function generateStaticParams() {
  return COURSES.map((c) => ({ curso: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ curso: string }> }): Promise<Metadata> {
  const { curso } = await params;
  const c = getCourse(curso);
  if (!c) return { title: "Curso" };
  // O MESMO critério dos tópicos vazios, um nível acima: curso em que nenhum
  // tópico tem material é uma página de abertura sem nada para abrir. Ela
  // continua no site — mapear o território vale para quem estuda, e o aluno
  // decide o que estudar sabendo o que existe —, mas não pede lugar no índice do
  // Google, e o sitemap usa esta mesma função para decidir quem ele convida.
  const comMaterial = courseHasMaterial(c);
  return pageMetadata({
    title: `${c.name}: curso visual e gratuito em português`,
    description: c.description,
    ogTitle: c.name,
    ogDescription: c.tagline,
    path: `/cursos/${c.slug}/`,
    ...(comMaterial ? {} : { robots: { index: false, follow: true } }),
  });
}

export default async function CursoPage({ params }: { params: Promise<{ curso: string }> }) {
  const { curso } = await params;
  const c = getCourse(curso);
  if (!c) notFound();

  const topicos = courseTopics(c);
  const prontos = topicos.filter((t) => !isEmptyTopic(t));
  const primeiro = prontos[0];
  const requisitos = (c.requires ?? []).map((slug) => getTopic(slug)).filter((t) => !!t);

  const migalhas: Migalha[] = [
    { name: "Início", href: "/" },
    { name: "Cursos", href: "/cursos/" },
    { name: c.name, href: `/cursos/${c.slug}/` },
  ];
  const caminho = migalhas.slice(0, -1);

  return (
    <div className="roadmap-wrap">
      {/* Mesma regra da página de tópico: a marcação só sai quando a página
          pede para ser indexada. Declarar-se um recurso e, duas tags adiante,
          pedir para ser ignorado é a contradição que o `noindex` esconde do
          Google e entrega a qualquer outro consumidor de JSON-LD. */}
      {courseHasMaterial(c) && (
        <JsonLd
          data={[
            courseJsonLd({ slug: c.slug, name: c.name, topics: topicos }),
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
        <span className="cur" aria-current="page">{c.name}</span>
      </nav>

      <span className="roadmap-eyebrow">Curso</span>
      <h1>{c.name}</h1>

      <div className="topic-chips" style={{ marginTop: 14 }}>
        <span className={`level ${levelClass(c.level)}`} style={{ borderStyle: "solid" }}>{c.level}</span>
        <span className="chip">{topicos.length} tópicos</span>
        <span className="chip">
          {prontos.length === 0
            ? "conteúdo em produção"
            : `${prontos.length} publicado${prontos.length > 1 ? "s" : ""}`}
        </span>
      </div>

      <p className="roadmap-intro">{c.description}</p>

      {requisitos.length > 0 && (
        <div className="curso-requisitos">
          <span className="curso-requisitos-rot">Antes daqui</span>
          <div className="curso-requisitos-links">
            {requisitos.map((t) => (
              <Link key={t.slug} href={`/topico/${t.slug}`} className="req-link">
                {t.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="hero-actions" style={{ marginBottom: 34 }}>
        {primeiro ? (
          <Link href={`/topico/${primeiro.slug}`} className="btn btn-primary">
            Começar por {primeiro.name}
          </Link>
        ) : (
          // Sem material, o botão que começaria o curso levaria a uma página
          // "em breve" — pior do que não existir. O que existe de verdade para
          // fazer hoje é acompanhar ou escrever, e é isso que a página oferece.
          <a href={LINKS.discord} className="btn btn-discord" target="_blank" rel="noopener noreferrer">
            Acompanhar no Discord →
          </a>
        )}
        <Link href="/cursos" className="btn">Ver os outros cursos</Link>
      </div>

      <GrupoCards groups={c.groups} />

      <div className="discord-strip">
        <span className="dot" />
        <p>
          Este curso é escrito pela comunidade, um tópico por vez. Quer ajudar a escrever um deles?
          Chame no Discord ou abra um PR.
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
