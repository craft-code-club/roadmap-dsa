import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopico, getVizinhos, TODOS_TOPICOS } from "@/content/roadmap";
import { getArtigo } from "@/content/topics";
import { LINKS, ytEmbed, ytWatch } from "@/lib/links";
import { nivelClass } from "@/lib/ui";
import { slugify } from "@/lib/slug";
import { TopicComplete } from "@/components/TopicComplete";
import { ProblemList } from "@/components/ProblemList";

export const dynamicParams = false;

export function generateStaticParams() {
  return TODOS_TOPICOS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = getTopico(slug);
  if (!t) return { title: "Tópico" };
  // Não indexa páginas realmente vazias (sem vídeo, artigo ou visualização) para
  // não criar conteúdo raso aos olhos do Google. Assim que ganham material, entram.
  const semConteudo = t.status === "soon" && !t.youtube && !t.artigo && !t.viz && !(t.videosExtras && t.videosExtras.length);
  return {
    title: t.nome,
    description: t.descricao,
    ...(semConteudo ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function TopicoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = getTopico(slug);
  if (!t) notFound();

  const artigo = getArtigo(slug);
  const Body = artigo?.Body;
  const { anterior, proximo } = getVizinhos(slug);

  // Índice "Nesta página": títulos do artigo + seções que a página acrescenta.
  const toc: string[] = [
    ...(artigo?.sumario ?? []),
    ...(t.youtube ? ["Vídeo da aula"] : []),
    ...(t.videosExtras && t.videosExtras.length ? ["Mais vídeos"] : []),
    ...(t.problemas && t.problemas.length ? ["Problemas para praticar"] : []),
    ...(t.referencias && t.referencias.length ? ["Referências"] : []),
  ];

  return (
    <div className="topic-layout">
      <article>
        <div className="breadcrumb">
          <span>{t.grupo}</span>
          <span>/</span>
          <span className="cur">{t.nome}</span>
        </div>
        <h1 className="topic-h1">{t.nome}</h1>

        <div className="topic-chips">
          {t.tempoLeitura && <span className="chip">⏱ {t.tempoLeitura} de leitura</span>}
          <span className={`level ${nivelClass(t.nivel)}`} style={{ borderStyle: "solid" }}>{t.nivel}</span>
          {t.linguagem && <span className="chip">{t.linguagem}</span>}
          <TopicComplete slug={t.slug} />
        </div>

        {Body ? (
          <Body />
        ) : (
          <>
            <span className="soon-badge">🚧 Visualização em construção</span>
            <p className="prose-p" style={{ marginTop: 18 }}>{t.descricao}</p>
            <div className="soon-note">
              O visualizador interativo deste tópico está a caminho. Por enquanto, assista à aula no
              vídeo abaixo{t.artigo ? " e leia o artigo completo no blog" : ""}, e acompanhe o
              cronograma de produção no Discord da comunidade.
            </div>
            {t.artigo && (
              <a className="btn" href={t.artigo} target="_blank" rel="noopener noreferrer" style={{ marginBottom: 8 }}>
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
              Direto do canal da comunidade Craft &amp; Code Club{t.minutosVideo ? ` · ${t.minutosVideo}` : ""}.
            </p>
            <div className="video-embed">
              <iframe
                src={ytEmbed(t.youtube)}
                title={`Aula: ${t.nome}`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </>
        )}

        {t.videosExtras && t.videosExtras.length > 0 && (
          <>
            <h2 id={slugify("Mais vídeos")} className="prose-h2">Mais vídeos</h2>
            <p className="prose-p" style={{ color: "var(--ccc-muted)" }}>
              Outros encontros e materiais em vídeo relacionados a este tópico.
            </p>
            <div className="video-links">
              {t.videosExtras.map((v) => (
                <a
                  key={v.titulo}
                  className="video-link"
                  href={v.url ?? ytWatch(v.youtube ?? "")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="video-link-ico" aria-hidden="true">▶</span>
                  <span className="video-link-title">{v.titulo}</span>
                  {v.duracao && <span className="video-link-dur">{v.duracao}</span>}
                  <span className="video-link-ext" aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </>
        )}

        {t.problemas && t.problemas.length > 0 && (
          <>
            <h2 id={slugify("Problemas para praticar")} className="prose-h2">Problemas para praticar</h2>
            <p className="prose-p" style={{ color: "var(--ccc-muted)" }}>
              Na ordem em que recomendamos resolver. Marque os que você já fez, fica salvo aqui.
            </p>
            <ProblemList problemas={t.problemas} />
          </>
        )}

        {t.referencias && t.referencias.length > 0 && (
          <>
            <h2 id={slugify("Referências")} className="prose-h2">Referências</h2>
            <p className="prose-p" style={{ color: "var(--ccc-muted)" }}>
              Artigos e materiais externos para se aprofundar.
            </p>
            <div className="ref-links">
              {t.referencias.map((r) => (
                <a key={r.url} className="ref-link" href={r.url} target="_blank" rel="noopener noreferrer">
                  <span className="ref-link-title">{r.titulo}</span>
                  {r.fonte && <span className="ref-link-src">{r.fonte}</span>}
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
          {anterior ? (
            <Link href={`/topico/${anterior.slug}`}>
              <span className="lbl">‹ Anterior</span>
              <span className="nm">{anterior.nome}</span>
            </Link>
          ) : (
            <span style={{ flex: 1 }} />
          )}
          {proximo ? (
            <Link href={`/topico/${proximo.slug}`} className="next">
              <span className="lbl">Próximo ›</span>
              <span className="nm">{proximo.nome}</span>
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
