import { Fragment } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getNeighbors, isEmptyTopic } from "@content/roadmap";
import { getCourseNeighbors, getPlacement, getSiteTopic, SITE_TOPICS } from "@content/courses";
import { getArticle } from "@content/topics";
import { datasDoTopico } from "@/lib/datas-do-git";
import { dataLonga, diaIso } from "@/lib/format";
import { breadcrumbJsonLd, JsonLd, topicJsonLd, type Migalha } from "@/lib/jsonld";
import { LINKS, ytWatch } from "@/lib/links";
import { pageMetadata } from "@/lib/seo";
import { levelClass } from "@/lib/ui";
import { slugify } from "@/lib/slug";
import { ContinueExplorando } from "@/components/ContinueExplorando";
import { TopicComplete } from "@/components/TopicComplete";
import { ProblemList } from "@/components/ProblemList";
import { VideoFacade } from "@/components/VideoFacade";

export const dynamicParams = false;

// `SITE_TOPICS`, e não `ALL_TOPICS`: esta rota serve TODO tópico do site, venha
// ele da trilha, de um curso ou de uma página avulsa. Com `ALL_TOPICS` aqui, os
// tópicos dos cursos existiriam nos dados, apareceriam na barra lateral do curso
// e devolveriam 404 no clique — sem erro de build, porque `dynamicParams = false`
// simplesmente não gera o que não foi pedido.
export function generateStaticParams() {
  return SITE_TOPICS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = getSiteTopic(slug);
  if (!t) return { title: "Tópico" };
  // Passa pelo `pageMetadata` para declarar a própria URL: as 47 páginas de
  // tópico montavam o metadata à mão e eram 47 das 48 rotas sem canonical nem
  // `og:url`. `titleStyle: "template"` mantém o `<title>` idêntico ao de antes.
  //
  // Não indexa páginas realmente vazias (sem vídeo, artigo ou visualização) para
  // não criar conteúdo raso aos olhos do Google. Assim que ganham material, entram
  // — e o sitemap usa esta MESMA função para decidir quem ele convida.
  //
  // SEM `ogImage`, de propósito, e a ausência é a parte importante. Esta rota já
  // teve `ogImage: "raiz"`, um contorno que nasceu quando descobri que definir
  // `openGraph` na página corta a herança da imagem da raiz e deixava as 47
  // páginas sem `og:image` nenhuma. Naquele momento o card da raiz era o único
  // que existia, então apontar para ele era o melhor disponível.
  //
  // Agora existe o conserto de verdade: um `opengraph-image.tsx` neste segmento,
  // com um card por tópico. E o contorno ANULA o conserto — o `images` explícito
  // vence o arquivo do segmento, e as 47 páginas voltariam ao mesmo card. Medido
  // na integração das duas mudanças: 1 imagem distinta em vez de 47.
  //
  // Ou seja: o valor certo aqui é nenhum, para o arquivo do segmento poder valer.
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

  const article = getArticle(slug);
  const Body = article?.Body;

  // Onde este tópico mora decide TRÊS coisas nesta página — o rastro de
  // navegação, quem são anterior e próximo, e o que fecha o artigo. O `Shell`
  // faz a mesma pergunta para escolher a barra lateral, e as duas respostas vêm
  // da mesma função: barra lateral de um curso com rastro de outro é o defeito
  // que isto impede.
  const onde = getPlacement(slug) ?? ({ trilha: "roadmap" } as const);
  const emCurso = onde.trilha === "curso" ? onde.course : null;
  const avulso = onde.trilha === "avulso";

  const { previous, next } = emCurso ? getCourseNeighbors(emCurso, slug) : avulso ? {} : getNeighbors(slug);

  // O rastro é montado UMA vez e usado duas: nos links que o leitor vê e no
  // `BreadcrumbList` que o Google lê. A regra que decide o desenho do JSON-LD
  // deste projeto é "a marcação reflete o que está na tela", e a única forma de
  // isso continuar verdade sem depender de alguém lembrar é os dois lerem o
  // mesmo array.
  const migalhas: Migalha[] = emCurso
    ? [
        { name: "Início", href: "/" },
        { name: "Cursos", href: "/cursos/" },
        { name: emCurso.name, href: `/cursos/${emCurso.slug}/` },
        { name: t.name, href: `/topico/${t.slug}/` },
      ]
    : avulso
      ? [
          { name: "Início", href: "/" },
          { name: "Cursos", href: "/cursos/" },
          { name: t.name, href: `/topico/${t.slug}/` },
        ]
      : [
          { name: "Início", href: "/" },
          { name: t.group, href: "/roadmap/" },
          { name: t.name, href: `/topico/${t.slug}/` },
        ];
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
    ...(t.problems && t.problems.length ? ["Problemas para praticar"] : []),
    ...(t.references && t.references.length ? ["Referências"] : []),
  ];

  return (
    // A página avulsa não tem barra lateral (ver `Shell.tsx`), e sem o
    // modificador ela herdaria a medida de linha de um layout que contava com
    // 290px de menu à esquerda: em 1440px o parágrafo passaria de 110 caracteres,
    // que é onde o olho começa a perder a linha de volta. A classe recentra a
    // coluna e devolve a medida de leitura.
    <div className={`topic-layout${avulso ? " solto" : ""}`}>
      {/* O MESMO `isEmptyTopic` do `noindex` acima e do filtro do sitemap. Sem
          este terceiro uso, a página de um tópico sem material declarava ser um
          recurso de aprendizado e, duas tags adiante, pedia para não ser
          indexada. O `noindex` vence no Google, então não é defeito de ranking —
          é a mesma contradição que este PR foi escrito para fechar, e o
          consumidor que lê JSON-LD sem olhar `robots` acredita na declaração. */}
      {!isEmptyTopic(t) && <JsonLd data={[topicJsonLd(t, datas), breadcrumbJsonLd(migalhas)]} />}
      <article>
        {/* Trilha navegável, e não três `<span>`: "Início" leva à home, o grupo
            leva ao roadmap e o tópico corrente se identifica com `aria-current`.
            O `color: "inherit"` é o que mantém a trilha com a MESMA aparência de
            antes — `globals.css:37` pinta toda âncora com a cor de destaque.
            Dar às âncoras uma afirmação visual de link (sublinhado no hover,
            por exemplo) é uma regra `.breadcrumb a` de quem for dono do CSS.
            O grupo aponta para `/roadmap/` porque a âncora `#<id>` do grupo não
            existe: `RoadmapGroups.tsx` usa `key={g.id}`, e `key` é prop do React,
            não vira atributo. Quando o `id` existir, muda só o destino.
            Os degraus vêm do array `migalhas`, o mesmo que vira `BreadcrumbList`
            — desenho e marcação não têm como divergir. */}
        <nav className="breadcrumb" aria-label="Trilha de navegação">
          {/* `Fragment`, e não um `<span>` embrulhando o par: o teste "a trilha
              marcada é a trilha desenhada" lê os FILHOS DIRETOS do `.breadcrumb`
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
          {/* O assunto da página avulsa, e só nela. Num tópico da trilha e num
              de curso o rastro logo acima já nomeia a família (o grupo, o
              curso); numa avulsa ele diz só "Cursos", e sem esta pastilha o
              `about` do JSON-LD carregaria um nome que não está em lugar nenhum
              da tela — que é justamente o que este projeto não faz. */}
          {avulso && <span className="chip">{t.group}</span>}
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

        {/* O fim da página é diferente em cada trilha, e a diferença não é
            estética: é o que existe para oferecer.

            TRILHA e CURSO são filas, e a fila tem anterior e próximo. No curso,
            quando não há anterior, o degrau de trás é a abertura dele — que é
            onde estão a descrição, os pré-requisitos e a ordem sugerida, e é
            justamente o que o leitor pulou se entrou pelo card de um tópico.

            AVULSA não é fila. Ela não tem "próximo": inventar um levaria o
            leitor de Skip List para Union-Find como se uma continuasse a outra.
            O que ela tem são vizinhos, e é a banda "Continue explorando" que os
            mostra. */}
        {avulso ? (
          <ContinueExplorando excluir={t.slug} />
        ) : (
          <div className="prevnext">
            {previous ? (
              <Link href={`/topico/${previous.slug}`}>
                <span className="lbl">‹ Anterior</span>
                <span className="nm">{previous.name}</span>
              </Link>
            ) : emCurso ? (
              <Link href={`/cursos/${emCurso.slug}`}>
                <span className="lbl">‹ Abertura do curso</span>
                <span className="nm">{emCurso.name}</span>
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
      </article>

      {/* `aria-labelledby`, e não `aria-label`, no índice abaixo: o rótulo visível
          "Nesta página" já existe, e apontar para ele é o que garante que o nome
          anunciado e o nome lido sejam o MESMO texto para sempre. Um `aria-label`
          seria uma segunda cópia da string, livre para divergir da primeira sem
          quebrar nada — a mesma armadilha dos dois predicados que este PR fecha
          no sitemap. */}
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
