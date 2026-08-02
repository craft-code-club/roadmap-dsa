import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopic, getNeighbors, isEmptyTopic, ALL_TOPICS } from "@content/roadmap";
import { getArticle } from "@content/topics";
import { LINKS, ytEmbed, ytWatch } from "@/lib/links";
import { levelClass } from "@/lib/ui";
import { slugify } from "@/lib/slug";
import { TopicComplete } from "@/components/TopicComplete";
import { ProblemList } from "@/components/ProblemList";

export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_TOPICS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = getTopic(slug);
  if (!t) return { title: "Tópico" };
  // Não indexa páginas realmente vazias (sem vídeo, artigo ou visualização) para
  // não criar conteúdo raso aos olhos do Google. Assim que ganham material, entram.
  const emptyTopic = isEmptyTopic(t);
  return {
    title: t.name,
    description: t.description,
    ...(emptyTopic ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function TopicoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = getTopic(slug);
  if (!t) notFound();

  const article = getArticle(slug);
  const Body = article?.Body;
  const { previous, next } = getNeighbors(slug);

  // Onde o tópico já pode ser estudado hoje (usado no aviso de quem não tem artigo).
  // Cobre tudo que a página mostra, inclusive os vídeos extras.
  const ondeEstudar = [
    t.youtube ? "no vídeo da aula" : null,
    t.extraVideos && t.extraVideos.length ? "nos vídeos extras" : null,
    t.article ? "no artigo do blog" : null,
  ].filter((x): x is string => x !== null);
  const ondeEstudarTexto =
    ondeEstudar.length > 1
      ? `${ondeEstudar.slice(0, -1).join(", ")} e ${ondeEstudar[ondeEstudar.length - 1]}`
      : ondeEstudar[0];

  // Índice "Nesta página": títulos do artigo + seções que a página acrescenta.
  const toc: string[] = [
    ...(article?.summary ?? []),
    ...(t.youtube ? ["Vídeo da aula"] : []),
    ...(t.extraVideos && t.extraVideos.length ? ["Mais vídeos"] : []),
    ...(t.problems && t.problems.length ? ["Problemas para praticar"] : []),
    ...(t.references && t.references.length ? ["Referências"] : []),
  ];

  return (
    <div className="topic-layout">
      <article>
        <div className="breadcrumb">
          <span>{t.group}</span>
          <span>/</span>
          <span className="cur">{t.name}</span>
        </div>
        <h1 className="topic-h1">{t.name}</h1>

        <div className="topic-chips">
          {t.readingTime && <span className="chip">⏱ {t.readingTime} de leitura</span>}
          <span className={`level ${levelClass(t.level)}`} style={{ borderStyle: "solid" }}>{t.level}</span>
          {t.language && <span className="chip">{t.language}</span>}
          <TopicComplete slug={t.slug} />
        </div>

        {Body ? (
          <Body />
        ) : (
          <>
            {!t.noViz && <span className="soon-badge">🚧 Visualização em construção</span>}
            <p className="prose-p" style={{ marginTop: 18 }}>{t.description}</p>
            <div className="soon-note">
              {t.noViz ? (
                ondeEstudarTexto ? (
                  <>
                    Este tópico não tem visualizador interativo: o conteúdo vive{" "}
                    {ondeEstudarTexto}. Dúvidas e sugestões, no Discord da comunidade.
                  </>
                ) : (
                  <>
                    Este tópico não vai ter visualizador interativo, e o material ainda está sendo
                    escrito. Acompanhe o cronograma de produção no Discord da comunidade.
                  </>
                )
              ) : (
                <>
                  O visualizador interativo deste tópico está a caminho. Por enquanto, assista à
                  aula no vídeo abaixo{t.article ? " e leia o artigo completo no blog" : ""}, e
                  acompanhe o cronograma de produção no Discord da comunidade.
                </>
              )}
            </div>
            {t.article && (
              <a className="btn" href={t.article} target="_blank" rel="noopener noreferrer" style={{ marginBottom: 8 }}>
                Ler o artigo no blog →
              </a>
            )}

            <p className="contribua-discreto">
              Feito pela comunidade, quer ajudar a escrever este tópico?{" "}
              <a href={LINKS.github} target="_blank" rel="noopener noreferrer">Contribua no GitHub</a>.
            </p>
          </>
        )}

        {t.youtube && (
          <>
            <h2 id={slugify("Vídeo da aula")} className="prose-h2">Vídeo da aula</h2>
            <p className="prose-p" style={{ color: "var(--ccc-muted)" }}>
              Direto do canal da comunidade Craft &amp; Code Club{t.videoMinutes ? ` · ${t.videoMinutes}` : ""}.
            </p>
            <div className="video-embed">
              <iframe
                src={ytEmbed(t.youtube)}
                title={`Aula: ${t.name}`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </>
        )}

        {t.extraVideos && t.extraVideos.length > 0 && (
          <>
            <h2 id={slugify("Mais vídeos")} className="prose-h2">Mais vídeos</h2>
            <p className="prose-p" style={{ color: "var(--ccc-muted)" }}>
              Outros encontros e materiais em vídeo relacionados a este tópico.
            </p>
            <div className="video-links">
              {t.extraVideos.map((v) => (
                <a
                  key={v.title}
                  className="video-link"
                  href={v.url ?? ytWatch(v.youtube ?? "")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="video-link-ico" aria-hidden="true">▶</span>
                  <span className="video-link-title">{v.title}</span>
                  {v.duration && <span className="video-link-dur">{v.duration}</span>}
                  <span className="video-link-ext" aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </>
        )}

        {t.problems && t.problems.length > 0 && (
          <>
            <h2 id={slugify("Problemas para praticar")} className="prose-h2">Problemas para praticar</h2>
            <p className="prose-p" style={{ color: "var(--ccc-muted)" }}>
              Na ordem em que recomendamos resolver. Marque os que você já fez, fica salvo aqui.
            </p>
            <ProblemList problems={t.problems} />
          </>
        )}

        {t.references && t.references.length > 0 && (
          <>
            <h2 id={slugify("Referências")} className="prose-h2">Referências</h2>
            <p className="prose-p" style={{ color: "var(--ccc-muted)" }}>
              Artigos e materiais externos para se aprofundar.
            </p>
            <div className="ref-links">
              {t.references.map((r) => (
                <a key={r.url} className="ref-link" href={r.url} target="_blank" rel="noopener noreferrer">
                  <span className="ref-link-title">{r.title}</span>
                  {r.source && <span className="ref-link-src">{r.source}</span>}
                  <span className="ref-link-ext" aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </>
        )}

        <div className="discord-strip">
          <span className="dot" />
          <p>Travou em algum passo? Traga sua questão para o Discord da comunidade ou para os encontros semanais.</p>
          <a href={LINKS.discord} className="btn btn-discord" target="_blank" rel="noopener noreferrer" style={{ padding: "9px 16px" }}>
            Entrar
          </a>
        </div>

        <div className="topic-done">
          <div>
            <div className="topic-done-title">Concluiu este tópico?</div>
            <div className="topic-done-sub">Marque para acompanhar seu progresso na trilha.</div>
          </div>
          <TopicComplete slug={t.slug} grande />
        </div>

        <div className="prevnext">
          {previous ? (
            <Link href={`/topico/${previous.slug}`}>
              <span className="lbl">‹ Anterior</span>
              <span className="nm">{previous.name}</span>
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
      </article>

      {toc.length > 0 && (
        <nav className="toc">
          <div className="toc-title">Nesta página</div>
          <div className="toc-links">
            {toc.map((s) => (
              <a key={s} href={`#${slugify(s)}`}>{s}</a>
            ))}
          </div>
          <div className="toc-foot">
            Achou um erro?<br />
            <a href={LINKS.discord} target="_blank" rel="noopener noreferrer">Avise no Discord</a>
          </div>
        </nav>
      )}
    </div>
  );
}
