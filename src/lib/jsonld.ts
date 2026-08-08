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
//   datePublished     → o selo "Publicado em", quando o dia é outro
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
 * toda rota — e a escolha é factual, não uma preferência de estilo. Os 34
 * vídeos que alimentam os tópicos têm `ownerChannelName: "Craft & Code Club"`,
 * as 34 descrições não citam o nome de nenhuma pessoa, e o `git log` deste
 * repositório tem uma única conta humana (mesmo ID do GitHub sob dois nomes de
 * usuário). Não há base para atribuir autoria nominal a ninguém.
 *
 * ⚠️ A decisão de nomear uma PESSOA é do Wilson, e custa esta constante e mais
 * nada: trocar por `{ "@type": "Person", name: "…", url: "…" }` — ou virar um
 * array com os dois, que `author` aceita — já muda as 40 páginas de tópico.
 * O que a troca exige junto: o nome tem que aparecer na tela, porque a regra
 * que decide o desenho deste arquivo é "a marcação reflete o que está na tela".
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
    // quando é o mesmo dia — 31 dos 36 artigos hoje —, o valor que ele carrega
    // é exatamente a data que está impressa ali. Nos dois casos o número na
    // marcação é um número que o leitor vê.
    ...(datas?.publicado ? { datePublished: datas.publicado.toISOString() } : {}),
    ...(datas?.atualizado ? { dateModified: datas.atualizado.toISOString() } : {}),
    isPartOf: { "@id": ID_SITE },
    author: AUTOR,
    publisher: { "@id": ID_ORG },
  };
}

/**
 * A trilha do tópico, item a item igual à que a página desenha.
 *
 * O nível do meio aponta para `/roadmap/` e não para o grupo: a âncora do grupo
 * não existe hoje. `RoadmapGroups.tsx` usa `key={g.id}`, e `key` é prop do React,
 * não vira atributo — não há `#<id>` no HTML para linkar. Quando a `<section>`
 * ganhar o `id`, este destino vira `/roadmap/#<id>` e a marcação continua com os
 * mesmos três níveis.
 */
export function breadcrumbJsonLd(t: Topic) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: abs("/") },
      { "@type": "ListItem", position: 2, name: t.group, item: abs("/roadmap/") },
      { "@type": "ListItem", position: 3, name: t.name, item: abs(`/topico/${t.slug}/`) },
    ],
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
