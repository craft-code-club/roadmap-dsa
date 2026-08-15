import { TOTAL_TOPICS } from "@content/topicos";

// O que os METADADOS precisam saber sobre o card social, sem nada que desenhe
// o card.
//
// Existe para quebrar uma aresta `lib → app`: o `seo.ts` precisava do texto do
// `alt` e do tamanho do card, e a única fonte era `src/app/opengraph-image.tsx`,
// um módulo de ROTA do App Router. Importar rota de dentro de `lib` inverte a
// direção normal das dependências, faz o módulo da rota (e os imports dele)
// rodar toda vez que `pageMetadata` é importado, e deixa um ciclo a um import de
// distância. Aqui não entra `next/og` nem `ImageResponse`: quem gera a imagem é
// o `og.tsx`, e quem só descreve o card é este arquivo.
//
// As três constantes ficam juntas porque respondem à mesma pergunta ("como este
// card se declara") e são consumidas em par pelas duas pontas.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/**
 * Texto alternativo do card da raiz, que também é o fallback de toda rota sem
 * card próprio. Sai do `roadmap.ts` para o número nunca discordar do site.
 */
export const OG_ALT_RAIZ = `Roadmap DSA: o maior guia visual de Algoritmos e Estruturas de Dados em português, com ${TOTAL_TOPICS} tópicos, grátis`;
