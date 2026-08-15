import type { Metadata } from "next";
import Link from "next/link";
import { isEmptyTopic, TOPICOS, TOTAL_TOPICS_PRONTOS } from "@content/topicos";
import { FUNDAMENTOS, roadmapsDoTopico, ROADMAPS } from "@content/roadmaps";
import { comNumero } from "@/lib/format";
import { TodosOsTopicos, type SecaoDeTopicos } from "@/components/TodosOsTopicos";
import { extrasJsonLd, JsonLd } from "@/lib/jsonld";
import { LINKS } from "@/lib/links";
import { pageMetadata } from "@/lib/seo";

// O índice completo: todo tópico do site numa página, uma vez cada.
//
// POR QUE ELA EXISTE, se já há o `/fundamentos/`, o `/roadmaps/` e a busca da
// barra lateral: porque as três respondem "o que estudar agora", e nenhuma
// responde "isto existe aqui?". Quem chega procurando "vocês têm Bloom Filter?"
// não tinha tela para abrir.
//
// A LISTA É POR TÓPICO, não por roadmap, e é essa a diferença. Nas outras telas
// o mesmo tópico aparece em cada percurso que o cita; aqui ele aparece UMA vez,
// com a etiqueta dos roadmaps de que participa ao lado. É a única tela que
// mostra o tópico e todos os percursos dele de relance.

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Todos os tópicos de Algoritmos e Estruturas de Dados",
    description: `A lista completa do guia: ${TOPICOS.length} tópicos de algoritmos e estruturas de dados em português, com visualização, artigo, vídeo e problemas do LeetCode. Busque por nome, assunto ou roadmap.`,
    ogTitle: "Todos os tópicos do Roadmap DSA",
    ogDescription: `${TOPICOS.length} tópicos de algoritmos e estruturas de dados, num índice só. Grátis, em português.`,
    path: "/topicos/",
  });
}

export const dynamic = "force-static";

export default function TopicosPage() {
  // Uma seção por assunto (`group`), que é a única classificação que o tópico
  // carrega por conta própria agora que ele não tem casa. A ordem das seções é
  // a de primeira aparição nos Fundamentos, e depois o resto: assim o índice
  // abre pela ordem de aprendizado sem depender dela.
  const ordem: string[] = [];
  for (const g of FUNDAMENTOS.groups)
    for (const c of g.topics) {
      const t = TOPICOS.find((x) => x.slug === c.topic);
      if (t && !ordem.includes(t.group)) ordem.push(t.group);
    }
  for (const t of TOPICOS) if (!ordem.includes(t.group)) ordem.push(t.group);

  const secoes: SecaoDeTopicos[] = ordem.map((assunto) => ({
    id: `t-${assunto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
    nome: assunto,
    linhas: TOPICOS.filter((t) => t.group === assunto).map((t) => ({
      topic: t,
      roadmaps: roadmapsDoTopico(t.slug).map((r) => r.name),
    })),
  }));

  const semRoadmap = TOPICOS.filter((t) => roadmapsDoTopico(t.slug).length === 0).length;

  return (
    <div className="roadmap-wrap">
      {/* O índice inteiro em dado estruturado, na ordem em que a página o
          desenha. `ItemList` e não `CollectionPage`: o que esta página é, é uma
          lista ordenada de recursos que já se declaram em outro lugar. */}
      <JsonLd data={extrasJsonLd(TOPICOS.map((t) => ({ name: t.name, href: `/topicos/${t.slug}/` })))} />
      <span className="roadmap-eyebrow">Índice</span>
      <h1>Todos os tópicos</h1>
      <p className="roadmap-intro">
        Os <strong>{TOPICOS.length} tópicos</strong> do guia numa página só, {TOTAL_TOPICS_PRONTOS} deles
        já publicados. Um tópico existe por conta própria e pode aparecer em vários{" "}
        <Link href="/roadmaps">roadmaps</Link>: a etiqueta ao lado de cada um diz em quais.
        {semRoadmap > 0 && ` ${comNumero(semRoadmap, "não está", "não estão")} em nenhum.`} Aqui não há ordem: há
        tudo, para você procurar.
      </p>

      <TodosOsTopicos secoes={secoes} />

      <div className="discord-strip">
        <span className="dot" />
        <p>
          Não achou o que procurava? Peça no Discord: a fila de produção é aberta e a comunidade
          decide o que vem primeiro.
        </p>
        <a
          href={LINKS.discord}
          className="btn btn-discord"
          target="_blank"
          rel="noopener noreferrer"
          style={{ padding: "9px 16px" }}
        >
          Pedir um tópico
        </a>
      </div>
    </div>
  );
}
