import { createElement } from "react";
import { ALL_TOPICS, type Topic } from "@content/roadmap";
import { LINKS, SITE_URL, ytEmbed } from "@/lib/links";
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
//   itemListElement   → os cards que o /roadmap renderiza, na mesma ordem
//   embedUrl          → o `src` do `<iframe>` da seção "Vídeo da aula"
//   duration          → o "· 2:08:22" que a página escreve ao lado daquele embed
//
// Campo sem correspondente fica de fora, e é por isso que não há
// `learningResourceType` (seria uma classificação chutada) nem `SearchAction` no
// `WebSite` (a busca do site é filtro no cliente, não tem URL de resultado).
//
// `VideoObject` ficou de fora por muito tempo porque exige `uploadDate`, que não
// existia no type `Topic`. Existe agora: `videoUploadDate`, obrigatório por
// união de tipos sempre que houver `youtube` (ver `content/roadmap.ts`). Com a
// data no lugar, a razão da ausência caiu e o nó entra — só nas páginas que de
// fato embutem a aula.
//
// Tudo isto roda no build e sai no HTML do export: `<script type="application/
// ld+json">` não é executado pelo navegador, então o custo no cliente é zero.

const abs = (rota: string) => `${SITE_URL}${rota}`;

const ID_ORG = `${SITE_URL}/#organization`;
const ID_SITE = `${SITE_URL}/#website`;

/** "12 min" → "PT12M". Formato inesperado devolve `undefined`, e o campo some. */
function duracaoIso(readingTime: string | undefined): string | undefined {
  const m = readingTime?.match(/^(\d+)\s*min$/);
  return m ? `PT${m[1]}M` : undefined;
}

/**
 * "2:08:22" → "PT2H8M22S"; "27:33" → "PT27M33S". Mesma regra do `duracaoIso`
 * acima: formato inesperado devolve `undefined`, e o campo some da marcação.
 *
 * Os componentes zerados não são escritos ("2:00:47" → "PT2H47S"), que é a
 * mesma forma que o YouTube publica no schema.org da própria página de watch —
 * conferida contra os 34 vídeos. `PT` sozinho (tudo zero) não é duração válida,
 * então também vira `undefined`.
 */
function duracaoDoVideo(videoMinutes: string | undefined): string | undefined {
  const m = videoMinutes?.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (!m) return undefined;
  const horas = m[1] ? Number(m[1]) : 0;
  const minutos = Number(m[2]);
  const segundos = Number(m[3]);
  if (minutos > 59 || segundos > 59) return undefined;
  const iso = [
    horas ? `${horas}H` : "",
    minutos ? `${minutos}M` : "",
    segundos ? `${segundos}S` : "",
  ].join("");
  return iso ? `PT${iso}` : undefined;
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
export function topicJsonLd(t: Topic) {
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
    isPartOf: { "@id": ID_SITE },
    publisher: { "@id": ID_ORG },
  };
}

/**
 * A aula gravada que a página embute, descrita como vídeo em vez de ficar
 * escondida dentro de um `<iframe>` opaco.
 *
 * O que isto NÃO promete: aba Vídeos nem miniatura no resultado. Desde
 * 04/12/2023 esses recursos só valem para páginas cujo CONTEÚDO PRINCIPAL é o
 * vídeo, e aqui ele é uma seção depois do artigo e dos visualizadores. O nó
 * existe para quem consome JSON-LD receber o dado certo — não como garantia de
 * resultado rico, que o Google decide e esta forma de página não alcança.
 *
 * Devolve `undefined` quando o tópico não tem aula — e o tipo garante que, se
 * tiver, a data existe: `youtube` e `videoUploadDate` andam em bloco na união
 * do `Topic`. Por isso não há `!` nem cast aqui embaixo.
 *
 * Os quatro obrigatórios do Google (`name`, `description`, `thumbnailUrl`,
 * `uploadDate`) saem todos de dado que já está na página; o resto segue o
 * contrato do topo do arquivo e só entra se tiver correspondente na tela.
 *
 * `embedUrl` e não `contentUrl`: o vídeo não é hospedado aqui, é embutido. O
 * valor é literalmente o `src` do `<iframe>` que a página renderiza, montado
 * pelo MESMO `ytEmbed` — marcação e tela não têm como divergir.
 *
 * `thumbnailUrl` traz duas resoluções, e as duas medidas contra o `i.ytimg.com`
 * antes de entrar aqui:
 *
 *   - `maxresdefault.jpg` (1280x720) responde 200 nos 34 vídeos das aulas, e as
 *     amostras baixadas são imagem de verdade, não o cinza de placeholder;
 *   - `hqdefault.jpg` (480x360) é o piso que o YouTube gera para TODO vídeo.
 *
 * A segunda entrada não é redundância: `maxresdefault` só existe quando o
 * upload tinha 720p, e nada neste repositório impede que a próxima aula seja
 * uma gravação menor. Nesse dia o campo continua com uma URL que resolve, em
 * vez de virar um 404 solitário.
 */
export function videoObjectJsonLd(t: Topic) {
  if (!t.youtube) return undefined;
  const url = abs(`/topico/${t.slug}/`);
  const duration = duracaoDoVideo(t.videoMinutes);
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "@id": `${url}#video`,
    // O nome do `<iframe title>` da seção "Vídeo da aula", caractere por
    // caractere: é o nome acessível do embed na tela.
    name: `Aula: ${t.name}`,
    description: t.description,
    uploadDate: t.videoUploadDate,
    thumbnailUrl: [
      `https://i.ytimg.com/vi/${t.youtube}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${t.youtube}/hqdefault.jpg`,
    ],
    embedUrl: ytEmbed(t.youtube),
    ...(duration ? { duration } : {}),
    inLanguage: "pt-BR",
    // O encontro da comunidade é aberto e gratuito no YouTube, e o conteúdo é
    // aula de programação: as duas declarações descrevem o que o aluno recebe.
    isAccessibleForFree: true,
    isFamilyFriendly: true,
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
