import Link from "next/link";
import type { Topic } from "@content/topicos";
import { getRoadmapNeighbors, urlDoRoadmap, urlDoTopicoNoRoadmap, type Roadmap } from "@content/roadmaps";
import { TopicoPagina } from "@/components/TopicoPagina";
import type { Migalha } from "@/lib/jsonld";

// Um tópico servido DENTRO de um roadmap, com a barra lateral dele.
//
// Duas rotas usam este componente — `/roadmaps/<r>/<t>/` e `/fundamentos/<t>/`,
// que é a mesma coisa com a base curta dos Fundamentos. O que muda entre elas é
// só a URL; a página é idêntica, e duplicá-la seria duas páginas envelhecendo
// em paralelo.
//
// Ela não emite JSON-LD nenhum, de propósito: quem declara o recurso é a página
// canônica (`/topicos/<slug>/`), e declarar de novo aqui, numa página que
// acabou de apontar `canonical` para outra, é a mesma contradição que este
// repositório evita quando não emite `LearningResource` em página `noindex`.
export function TopicoNoRoadmap({ roadmap: r, topic: t }: { roadmap: Roadmap; topic: Topic }) {
  const { previous, next } = getRoadmapNeighbors(r, t.slug);

  const migalhas: Migalha[] = [
    { name: "Início", href: "/" },
    { name: "Roadmaps", href: "/roadmaps/" },
    { name: r.name, href: `${urlDoRoadmap(r)}/` },
    { name: t.name, href: `${urlDoTopicoNoRoadmap(r, t.slug)}/` },
  ];

  return (
    <TopicoPagina
      topic={t}
      migalhas={migalhas}
      dentroDe={r}
      fim={
        <>
          {/* Anterior e próximo DENTRO do roadmap, com os links do roadmap:
              sair daqui só quando o leitor pedir. */}
          <div className="prevnext">
            {previous ? (
              <Link href={urlDoTopicoNoRoadmap(r, previous.slug)}>
                <span className="lbl">‹ Anterior</span>
                <span className="nm">{previous.name}</span>
              </Link>
            ) : (
              <Link href={urlDoRoadmap(r)}>
                <span className="lbl">‹ Abertura do roadmap</span>
                <span className="nm">{r.name}</span>
              </Link>
            )}
            {next ? (
              <Link href={urlDoTopicoNoRoadmap(r, next.slug)} className="next">
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

          {/* A ponte para a página canônica. Não é burocracia de SEO: quem
              quiser salvar, compartilhar ou voltar a este tópico fora deste
              percurso precisa saber que existe um endereço dele sem o contexto
              junto. */}
          <p className="pagina-canonica">
            Este tópico também tem página própria, fora deste roadmap:{" "}
            <Link href={`/topicos/${t.slug}`}>{t.name}</Link>.
          </p>
        </>
      }
    />
  );
}
