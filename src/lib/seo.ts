import type { Metadata } from "next";
import { OG_ALT_RAIZ, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-meta";

// Metadados por rota, em um lugar só.
//
// Por que existe: o layout raiz só guarda o que é global de verdade (locale,
// type, siteName, twitter.card, metadataBase). Título, descrição e Open Graph
// são de cada página — quando ficavam no layout, todas as rotas compartilhavam
// o mesmo card e o LinkedIn mostrava a home ao compartilhar qualquer tópico.
//
// `path` vira tanto o canonical quanto o `og:url` — os dois têm que apontar para
// a mesma URL, e o site é `trailingSlash: true`.
//
// O tipo cobra a barra final em vez de só pedir por comentário: `/${string}`
// aceitava "/fundamentos" de boa, e um path quase certo aqui vira canonical apontando
// para uma URL que não existe. Erro de SEO não quebra teste nem build — ou o
// compilador pega, ou ninguém pega.
//
// Esta função é o ÚNICO ponto que emite `alternates.canonical` e `og:url`, e por
// muito tempo só três rotas passavam por ela: as outras 48 (os 47 tópicos e o
// /apoie) declaravam título e descrição por conta própria e ficavam sem dizer
// qual é a própria URL. Rota que não passa por aqui é rota sem canonical, então
// a resposta certa para "esta página precisa de metadata" é sempre chamar isto.

/** Nome do site, e o template de título que o layout aplica. */
export const SITE_NAME = "Roadmap DSA";
export const TITLE_TEMPLATE = `%s · ${SITE_NAME}`;

export type PageSeo = {
  title: string;
  description: string;
  /** Padrão: o título já resolvido (com o sufixo do template, quando houver). */
  ogTitle?: string;
  /** Padrão: a `description`. */
  ogDescription?: string;
  path: "/" | `/${string}/`;
  /**
   * A URL CANÔNICA, quando ela não é a própria página.
   *
   * Existe por causa de `/roadmaps/<roadmap>/<topico>/`: o mesmo tópico servido
   * dentro de um roadmap, com a barra lateral daquele roadmap. É a mesma leitura
   * que `/topicos/<slug>/` entrega, e conteúdo igual em duas URLs sem canonical é
   * o Google escolhendo sozinho qual mostrar — às vezes a errada, e sempre
   * dividindo os sinais entre as duas.
   *
   * Quando presente, ela substitui o `path` no `<link rel="canonical">` E no
   * `og:url`. Os dois juntos, e não só o canonical: o comentário no topo deste
   * arquivo diz que eles têm que apontar para a mesma URL, e é a canônica que
   * queremos que circule quando alguém compartilha.
   */
  canonicalDe?: "/" | `/${string}/`;
  /**
   * Como o `<title>` se compõe.
   *
   * - `"absolute"` (padrão) ignora o template do layout: bom para as páginas de
   *   entrada, cujos títulos longos já passariam dos ~60 caracteres que o Google
   *   mostra se ainda ganhassem " · Roadmap DSA" no fim.
   * - `"template"` deixa o layout completar. É o que os 47 tópicos e o /apoie já
   *   faziam antes de passarem por aqui, e trocar isso mudaria o título de 48
   *   páginas de uma vez, num PR que não é sobre título.
   */
  titleStyle?: "absolute" | "template";
  /** `robots` da rota — hoje só o `noindex` dos tópicos sem material nenhum. */
  robots?: Metadata["robots"];
  /**
   * De onde vem a imagem do card.
   *
   * - `"segmento"` (padrão): a rota tem `opengraph-image.tsx` no próprio
   *   segmento, e o arquivo continua valendo sem precisar ser citado aqui.
   * - `"raiz"`: a rota HERDAVA a imagem do `opengraph-image.tsx` da raiz. Essa
   *   herança some no instante em que a página passa a definir `openGraph`
   *   próprio — medido: ao trazer os 47 tópicos e o /apoie para cá, as 48 rotas
   *   perderam `og:image`, `twitter:image` e os cinco campos de dimensão junto,
   *   e o card viraria um retângulo de texto no LinkedIn. Nomear a imagem da
   *   raiz devolve tudo.
   *
   * ⚠️ `"raiz"` é para rota que NÃO TEM e não vai ter card próprio. O `images`
   * explícito que ele gera **vence o arquivo do segmento**, então pôr `"raiz"`
   * numa rota que ganhou `opengraph-image.tsx` anula o arquivo em silêncio: o
   * card continua sendo gerado no build e ninguém aponta para ele. Foi o que
   * aconteceu entre esta função e o card por tópico — 47 imagens geradas, 1
   * usada. Hoje só o /apoie usa `"raiz"`, e é o caso legítimo: ele fala do
   * projeto inteiro, não de um conteúdo próprio.
   */
  ogImage?: "segmento" | "raiz" | `/${string}`;
};

/**
 * O começo de um texto longo, cortado em FRASE INTEIRA, para caber no snippet.
 *
 * O Google mostra por volta de 155 caracteres e corta o resto com reticências.
 * A abertura de um roadmap tinha 533: o parágrafo que a página desenha é bom
 * como parágrafo e péssimo como snippet, e a alternativa (escrever um segundo
 * texto à mão para cada roadmap) é mais uma cópia para envelhecer sozinha.
 *
 * Corta em fim de FRASE (ponto, interrogação ou exclamação), e nunca no meio
 * de uma palavra: meia frase no
 * resultado de busca é pior que uma frase curta. Se a primeira frase já passar
 * do limite, o texto volta inteiro — melhor o Google cortar do que este código
 * entregar uma oração sem verbo.
 */
export function resumoParaBusca(texto: string, limite = 155): string {
  if (texto.length <= limite) return texto;
  let corte = "";
  for (const frase of texto.split(/(?<=[.!?])\s+/)) {
    if (corte && (corte + " " + frase).length > limite) break;
    corte = corte ? `${corte} ${frase}` : frase;
  }
  return corte.length <= limite ? corte : texto;
}

export function pageMetadata({
  title,
  description,
  ogTitle,
  ogDescription,
  path,
  canonicalDe,
  titleStyle = "absolute",
  robots,
  ogImage = "segmento",
}: PageSeo): Metadata {
  const comTemplate = titleStyle === "template";
  const tituloResolvido = comTemplate ? TITLE_TEMPLATE.replace("%s", title) : title;
  return {
    title: comTemplate ? title : { absolute: title },
    description,
    alternates: { canonical: canonicalDe ?? path },
    ...(robots ? { robots } : {}),
    openGraph: {
      // `openGraph` da página SUBSTITUI o do layout, não faz merge campo a campo:
      // sem repetir type/locale/siteName aqui, as três rotas saíam sem eles.
      // (A `og:image` é a exceção — vem do arquivo `opengraph-image.tsx` do
      // segmento, ou do da raiz quando o segmento não tem o seu.)
      type: "website",
      locale: "pt_BR",
      siteName: SITE_NAME,
      // Quem não define card próprio recebe o título JÁ RESOLVIDO, que é o que o
      // Next derivava sozinho antes: assim passar a chamar esta função não muda
      // um caractere do card de nenhuma das 48 rotas que entraram agora.
      title: ogTitle ?? tituloResolvido,
      description: ogDescription ?? description,
      url: canonicalDe ?? path,
      // Três casos: o arquivo do próprio segmento (o padrão, e por isso não há
      // nada a escrever aqui), o card da raiz, ou um card EMPRESTADO de outra
      // rota. O terceiro existe para as cópias de tópico dentro de um roadmap:
      // elas não têm `opengraph-image.tsx` (seria a 55ª cópia do mesmo card) e
      // caíam no da raiz, que fala do site e não do que está na tela. O card
      // certo para elas é o do tópico, que é o conteúdo que elas servem.
      ...(ogImage !== "segmento"
        ? {
            images: [
              {
                url: ogImage === "raiz" ? "/opengraph-image" : ogImage,
                alt: ogImage === "raiz" ? OG_ALT_RAIZ : undefined,
                type: OG_CONTENT_TYPE,
                ...OG_SIZE,
              },
            ],
          }
        : {}),
    },
  };
}
