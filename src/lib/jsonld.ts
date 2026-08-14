import { createElement } from "react";
import { ALL_TOPICS, type Topic } from "@content/roadmap";
import { LINKS, SITE_URL } from "@/lib/links";
import { SITE_NAME } from "@/lib/seo";

// Dados estruturados (JSON-LD), em funções puras `dado → objeto`.
//
// A regra que decide o desenho é do Google: **a marcação reflete o que está na
// tela**. Nada aqui é inventado para agradar buscador — cada campo tem um
// correspondente visível ou um valor que a página já declara:
//
//   name              → o `<h1>` do tópico
//   educationalLevel  → o selo de nível em `.topic-chips`
//   timeRequired      → o selo "⏱ N min de leitura", no mesmo lugar
//   programmingLanguage → o selo "Python", que é a linguagem do CÓDIGO
//   inLanguage        → `pt-BR`, o `lang` do `<html>` (não confundir com o de cima)
//   about             → o grupo, que a trilha mostra logo acima do título
//   author            → "por Craft & Code Club", ao lado da marca no topo
//   dateModified      → o selo "Atualizado em", no mesmo `.topic-chips`
//   itemListElement   → os cards que o /roadmap renderiza, na mesma ordem
//
// Campo sem correspondente fica de fora, e é por isso que não há
// `learningResourceType` (seria uma classificação chutada) nem `SearchAction` no
// `WebSite` (a busca do site é filtro no cliente, não tem URL de resultado).
//
// `VideoObject` também fica de fora, e a falta é concreta: ele exige
// `uploadDate`, que não existe no type `Topic`. Acrescentar o campo é PR próprio.
//
// Tudo isto roda no build e sai no HTML do export: `<script type="application/
// ld+json">` não é executado pelo navegador, então o custo no cliente é zero.

const abs = (rota: string) => `${SITE_URL}${rota}`;

const ID_ORG = `${SITE_URL}/#organization`;
const ID_SITE = `${SITE_URL}/#website`;

/**
 * Quem assina o conteúdo do guia.
 *
 * É a ORGANIZAÇÃO, por `@id` para o nó `Organization` que o layout já emite em
 * toda rota. E isso é DECISÃO TOMADA, não um valor provisório esperando alguém
 * decidir: o guia é obra da comunidade, e assina como comunidade.
 *
 * A decisão também é a que os fatos sustentam. Os 34 vídeos que alimentam os
 * tópicos têm `ownerChannelName: "Craft & Code Club"`, as 34 descrições não
 * citam o nome de nenhuma pessoa, e o `git log` deste repositório tem uma única
 * conta humana (mesmo ID do GitHub sob dois nomes de usuário).
 *
 * ⚠️ NÃO troque por `Person`, nem acrescente uma ao lado num array. Autoria
 * nominal aqui significaria escolher um nome entre muitos que contribuíram, num
 * projeto que recebe PR da comunidade, e o `Organization` já é o sujeito certo:
 * ele é quem publica os vídeos, quem mantém o repositório e quem responde no
 * Discord.
 *
 * (Se um dia isso mudar, mude junto o que aparece na TELA: a regra que decide o
 * desenho deste arquivo é "a marcação reflete o que está na tela", e nome que
 * só existe no JSON-LD é marcação sem lastro.)
 */
const AUTOR = { "@id": ID_ORG };

/** "12 min" → "PT12M". Formato inesperado devolve `undefined`, e o campo some. */
function duracaoIso(readingTime: string | undefined): string | undefined {
  const m = readingTime?.match(/^(\d+)\s*min$/);
  return m ? `PT${m[1]}M` : undefined;
}

/**
 * A comunidade que publica o guia. `sameAs` sai do ponto único de links
 * (`src/lib/links.ts`), então rotacionar o convite do Discord já corrige aqui.
 */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ID_ORG,
    name: "Craft & Code Club",
    url: LINKS.site,
    sameAs: [LINKS.site, LINKS.github, LINKS.youtube, LINKS.discord],
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": ID_SITE,
    name: SITE_NAME,
    url: abs("/"),
    inLanguage: "pt-BR",
    isAccessibleForFree: true,
    publisher: { "@id": ID_ORG },
  };
}

/**
 * A página de um tópico como recurso de aprendizado.
 *
 * `LearningResource` e não `Course`: um tópico é material de estudo, não um
 * programa com turma, instrutor e matrícula — e `Course` só rende resultado rico
 * com `hasCourseInstance`/`offers`, que este produto não tem para declarar.
 */
export function topicJsonLd(t: Topic, datas?: { publicado?: Date; atualizado?: Date }) {
  const url = abs(`/topico/${t.slug}/`);
  const timeRequired = duracaoIso(t.readingTime);
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "@id": `${url}#recurso`,
    url,
    name: t.name,
    description: t.description,
    inLanguage: "pt-BR",
    isAccessibleForFree: true,
    educationalLevel: t.level,
    about: { "@type": "Thing", name: t.group },
    ...(timeRequired ? { timeRequired } : {}),
    ...(t.language ? { programmingLanguage: t.language } : {}),
    // As datas vêm do Git (`src/lib/datas-do-git.ts`) e chegam prontas, ou não
    // chegam: quem decide se elas são informação é o mesmo guarda do `lastmod`
    // do sitemap, e em clone raso os dois campos somem juntos. Data errada é
    // pior do que data nenhuma.
    //
    // `dateModified` tem o selo "Atualizado em" na tela, em `.topic-chips`.
    // `datePublished` ganha o selo "Publicado em" ao lado quando o dia é OUTRO;
    // quando é o mesmo dia — 28 dos 36 tópicos hoje —, o valor que ele carrega
    // é exatamente a data que está impressa ali. Nos dois casos o número na
    // marcação é um número que o leitor vê.
    ...(datas?.atualizado ? { dateModified: datas.atualizado.toISOString() } : {}),
    isPartOf: { "@id": ID_SITE },
    author: AUTOR,
    publisher: { "@id": ID_ORG },
  };
}

/** Um degrau da trilha de navegação: o que a página desenha e o que ela marca. */
export type Migalha = { name: string; href: string };

/**
 * A trilha do tópico, item a item igual à que a página desenha.
 *
 * Ela recebe a trilha PRONTA, e não o tópico, desde que existem cursos: um
 * tópico da trilha principal tem três degraus (Início / grupo / tópico) e um
 * tópico de curso tem quatro (Início / Cursos / curso / tópico). Montar a
 * marcação aqui a partir do `Topic` significaria esta função reimplementar a
 * decisão de onde o tópico mora — a mesma decisão que a página acabou de tomar
 * para desenhar os links —, e as duas versões divergiriam no dia em que um
 * formato novo aparecesse. A página monta uma vez e usa nos dois lugares, que é
 * o que o teste "a trilha marcada é a trilha desenhada" cobra.
 *
 * O nível do grupo aponta para `/roadmap/` e não para o grupo: a âncora do grupo
 * não existe hoje. `RoadmapGroups.tsx` usa `key={g.id}`, e `key` é prop do React,
 * não vira atributo — não há `#<id>` no HTML para linkar. Quando a `<section>`
 * ganhar o `id`, este destino vira `/roadmap/#<id>` e a marcação continua igual.
 */
export function breadcrumbJsonLd(migalhas: Migalha[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: migalhas.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: m.name,
      item: abs(m.href),
    })),
  };
}

/** A trilha inteira do /roadmap, na ordem em que a página renderiza os cards. */
export function roadmapJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${SITE_URL}/roadmap/#trilha`,
    name: "Roadmap de Algoritmos e Estruturas de Dados",
    numberOfItems: ALL_TOPICS.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: ALL_TOPICS.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      url: abs(`/topico/${t.slug}/`),
    })),
  };
}

/**
 * A vitrine de `/cursos/`, na ordem em que a página desenha os cards.
 *
 * `ItemList`, e não `Course` para cada item, pela mesma razão que a página de
 * tópico é `LearningResource` e não `Course`: o tipo `Course` do schema.org só
 * rende resultado rico com `hasCourseInstance`/`offers` — turma, instrutor,
 * matrícula, preço —, e nada disso existe aqui. Declarar o tipo sem os campos é
 * marcação que o Google descarta; declarar os campos é inventar dado.
 */
export function extrasJsonLd(cards: { name: string; href: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${SITE_URL}/cursos/#vitrine`,
    name: "Cursos e outras estruturas",
    numberOfItems: cards.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: cards.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      url: abs(c.href),
    })),
  };
}

/** Os tópicos de um curso, na ordem em que a abertura dele os apresenta. */
export function courseJsonLd(curso: { slug: string; name: string; topics: Topic[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${SITE_URL}/cursos/${curso.slug}/#trilha`,
    name: curso.name,
    numberOfItems: curso.topics.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: curso.topics.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      url: abs(`/topico/${t.slug}/`),
    })),
  };
}

/**
 * Serializa os nós num `<script type="application/ld+json">`.
 *
 * Sem JSX (o arquivo é `.ts`) e sem `"use client"`: é componente de servidor, o
 * script sai pronto no HTML e não vira um byte de JavaScript no cliente.
 *
 * O `<` escapado é o que impede um `</script>` dentro de qualquer texto do
 * roadmap de fechar a tag antes da hora. `<` é escape válido de JSON, então
 * quem lê o dado recebe o caractere de volta.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return createElement("script", {
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: JSON.stringify(data).replace(/</g, "\\u003c") },
  });
}
