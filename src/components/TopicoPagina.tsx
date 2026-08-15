import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import type { Topic } from "@content/topicos";
import { linkDentroDoRoadmap, type Roadmap } from "@content/roadmaps";
import { getArtigo } from "@content/topicos/artigos";
import { getPratica } from "@content/topicos/pratica";
import { datasDoTopico } from "@/lib/datas-do-git";
import { dataLonga, diaIso } from "@/lib/format";
import type { Migalha } from "@/lib/jsonld";
import { LINKS, ytWatch } from "@/lib/links";
import { slugify } from "@/lib/slug";
import { levelClass } from "@/lib/ui";
import { ProblemList } from "@/components/ProblemList";
import { TopicComplete } from "@/components/TopicComplete";
import { VideoFacade } from "@/components/VideoFacade";
import { ancoraQueReescreve } from "../../mdx-components";

// O artigo de um tópico, e tudo que a página dele mostra em volta.
//
// Existe como componente porque o MESMO tópico é servido por duas rotas: a
// canônica, `/topicos/<slug>/`, e a de dentro de um roadmap,
// `/roadmaps/<roadmap>/<slug>/`. As duas mostram o mesmo artigo, o mesmo vídeo,
// os mesmos problemas e as mesmas referências — o que muda cabe em três props:
// o rastro de navegação, o que fecha a página e a marcação.
//
// Duas cópias disto seriam duas páginas de tópico envelhecendo em paralelo, e o
// sintoma chegaria como "o vídeo aparece quando entro pelo roadmap e some quando
// entro pelo link direto".

export type TopicoPaginaProps = {
  topic: Topic;
  /** Os degraus do rastro, incluindo o último (o próprio tópico). */
  migalhas: Migalha[];
  /** O que fecha o artigo: anterior/próximo, banda de roadmaps, o que for. */
  fim?: ReactNode;
  /** A marcação da página. A rota não canônica não declara nada (ver a rota). */
  jsonLd?: ReactNode;
  /** Sem barra lateral: recentra a coluna e devolve a medida de leitura. */
  solto?: boolean;
  /** Mostra o assunto do tópico como pastilha. Só onde o rastro não o nomeia. */
  comChipDeGrupo?: boolean;
  /**
   * O roadmap por onde o leitor chegou, quando chegou por um.
   *
   * Só serve para uma coisa, e ela é importante: as citações DENTRO do artigo
   * passam a apontar para a cópia deste roadmap. Quem está num percurso não sai
   * dele porque o texto mencionou outro tópico.
   */
  dentroDe?: Roadmap;
};

export function TopicoPagina({
  topic: t,
  migalhas,
  fim,
  jsonLd,
  solto,
  comChipDeGrupo,
  dentroDe,
}: TopicoPaginaProps) {
  const article = getArtigo(t.slug);
  // Os problemas e as referências moram fora do `Topic` para não entrarem no
  // JavaScript do cliente; aqui, que é servidor, eles são um `import` a mais.
  const { problems, references } = getPratica(t.slug);
  const Body = article?.Body;
  // Os links do artigo, reescritos para o percurso do leitor. Sem roadmap, o
  // `undefined` deixa o `a` padrão do MDX em pé.
  const componentesDoArtigo = dentroDe
    ? { a: ancoraQueReescreve((href: string) => linkDentroDoRoadmap(dentroDe, href)) }
    : undefined;
  const caminho = migalhas.slice(0, -1);

  // Datas do Git, ou nada. Ver `src/lib/datas-do-git.ts`: em clone raso o
  // `git log` responde o mesmo para todo caminho, e aí o selo não é desenhado e
  // os campos de data do JSON-LD não saem — exatamente como o `lastmod`.
  const datas = datasDoTopico(t.slug);

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
    ...(problems && problems.length ? ["Problemas para praticar"] : []),
    ...(references && references.length ? ["Referências"] : []),
  ];

  return (
    <div className={`topic-layout${solto ? " solto" : ""}`}>
      {jsonLd}
      <article>
        {/* Rastro navegável, e não três `<span>`: "Início" leva à home, o grupo
            leva aos Fundamentos e o tópico corrente se identifica com
            `aria-current`. O `color: "inherit"` é o que mantém o rastro com a
            MESMA aparência de antes — `globals.css` pinta toda âncora com a cor
            de destaque.
            Os degraus vêm do array `migalhas`, o mesmo que vira `BreadcrumbList`
            — desenho e marcação não têm como divergir. */}
        <nav className="breadcrumb" aria-label="Trilha de navegação">
          {/* `Fragment`, e não um `<span>` embrulhando o par: o teste "o rastro
              marcado é o rastro desenhado" lê os FILHOS DIRETOS do `.breadcrumb`
              e compara com os nomes do JSON-LD. Um elemento a mais no meio
              agrupa "Início" com a barra e o array deixa de bater. */}
          {caminho.map((m) => (
            <Fragment key={m.href}>
              <Link href={m.href} style={{ color: "inherit" }}>{m.name}</Link>
              <span aria-hidden="true">/</span>
            </Fragment>
          ))}
          <span className="cur" aria-current="page">{t.name}</span>
        </nav>
        <h1 className="topic-h1">{t.name}</h1>

        <div className="topic-chips">
          {/* O assunto do tópico, e só onde o rastro não o nomeia. Num tópico
              dos Fundamentos e num de roadmap o rastro logo acima já diz a
              família (o grupo, o roadmap); num avulso ele diz só "Roadmaps", e
              sem esta pastilha o `about` do JSON-LD carregaria um nome que não
              está em lugar nenhum da tela — que é justamente o que este projeto
              não faz. */}
          {comChipDeGrupo && <span className="chip">{t.group}</span>}
          {t.readingTime && <span className="chip">⏱ {t.readingTime} de leitura</span>}
          <span className={`level ${levelClass(t.level)}`} style={{ borderStyle: "solid" }}>{t.level}</span>
          {t.language && <span className="chip">{t.language}</span>}
          {datas && (
            <span className="chip">
              Atualizado em{" "}
              <time dateTime={diaIso(datas.atualizado)}>{dataLonga(datas.atualizado)}</time>
            </span>
          )}
          <TopicComplete slug={t.slug} />
        </div>

        {Body ? (
          <Body components={componentesDoArtigo} />
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
            {/* A caixa continua sendo a mesma `.video-embed` (com o
                `aspect-ratio: 16/9`); o que mudou é o miolo: uma miniatura
                clicável no lugar do `<iframe>`, que só monta o player quando o
                aluno pede. O porquê, com os bytes medidos, está no cabeçalho do
                componente. */}
            <div className="video-embed">
              <VideoFacade youtube={t.youtube} title={t.name} />
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

        {problems && problems.length > 0 && (
          <>
            <h2 id={slugify("Problemas para praticar")} className="prose-h2">Problemas para praticar</h2>
            <p className="prose-p" style={{ color: "var(--ccc-muted)" }}>
              Na ordem em que recomendamos resolver. Marque os que você já fez, fica salvo aqui.
            </p>
            <ProblemList problems={problems} />
          </>
        )}

        {references && references.length > 0 && (
          <>
            <h2 id={slugify("Referências")} className="prose-h2">Referências</h2>
            <p className="prose-p" style={{ color: "var(--ccc-muted)" }}>
              Artigos e materiais externos para se aprofundar.
            </p>
            <div className="ref-links">
              {references.map((r) => (
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
            <div className="topic-done-sub">Marque para acompanhar seu progresso.</div>
          </div>
          <TopicComplete slug={t.slug} grande />
        </div>

        {fim}
      </article>

      {/* `aria-labelledby`, e não `aria-label`, no índice abaixo: o rótulo visível
          "Nesta página" já existe, e apontar para ele é o que garante que o nome
          anunciado e o nome lido sejam o MESMO texto para sempre. Um `aria-label`
          seria uma segunda cópia da string, livre para divergir da primeira sem
          quebrar nada. */}
      {toc.length > 0 && (
        <nav className="toc" aria-labelledby="toc-title">
          <div className="toc-title" id="toc-title">Nesta página</div>
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
