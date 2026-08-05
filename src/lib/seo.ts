import type { Metadata } from "next";

// Metadados por rota, em um lugar só.
//
// Por que existe: o layout raiz só guarda o que é global de verdade (locale,
// type, siteName, twitter.card, metadataBase). Título, descrição e Open Graph
// são de cada página — quando ficavam no layout, todas as rotas compartilhavam
// o mesmo card e o LinkedIn mostrava a home ao compartilhar qualquer tópico.
//
// `title` sai como `absolute`: o template do layout ("%s · Roadmap DSA") é bom
// para tópico, mas empurraria os títulos longos destas páginas para muito além
// dos ~60 caracteres que o Google mostra.
//
// `path` precisa da barra final (o site é `trailingSlash: true`), e vira tanto
// o canonical quanto o `og:url` — os dois têm que apontar para a mesma URL.
export type PageSeo = {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  path: `/${string}` | "/";
};

export function pageMetadata({ title, description, ogTitle, ogDescription, path }: PageSeo): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      // `openGraph` da página SUBSTITUI o do layout, não faz merge campo a campo:
      // sem repetir type/locale/siteName aqui, as três rotas saíam sem eles.
      // (A `og:image` é a exceção — vem do arquivo `opengraph-image.tsx` do
      // segmento, ou do da raiz quando o segmento não tem o seu.)
      type: "website",
      locale: "pt_BR",
      siteName: "Roadmap DSA",
      title: ogTitle,
      description: ogDescription,
      url: path,
    },
  };
}
