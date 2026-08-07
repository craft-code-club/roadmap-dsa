import { ALL_TOPICS, getTopic } from "@content/roadmap";
import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

// Card de compartilhamento de CADA tópico.
//
// Por que existe: as 47 páginas de tópico não tinham card próprio e caíam no da
// raiz, que fala do site inteiro. Quem compartilhava Dijkstra no LinkedIn ou no
// Discord entregava a mesma imagem de /apoie e da home, sem a palavra "Dijkstra"
// em lugar nenhum. Medido antes: as 48 rotas apontavam para
// `/opengraph-image?e42ae7e3eac68247`, o mesmo arquivo e o mesmo hash.
//
// O desenho não mora aqui: `src/lib/og.tsx` é o template único das rotas com
// card. Este arquivo só decide o que cada tópico põe em cada campo, com os dados
// que o `content/roadmap.ts` já tem.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";

// `alt` é uma constante do módulo, e não um texto por tópico, porque o Next lê
// este export UMA vez: o `next-metadata-image-loader` monta um objeto com os
// named exports do arquivo e usa `imageModule.alt` para as 47 páginas.
//
// O jeito de variar o alt por imagem é `generateImageMetadata`, e ele não cabe
// aqui. Medido: ao exportar essa função, o Next passa a criar a rota
// `/topico/[slug]/opengraph-image/[__metadata_id__]` e o build para com
//
//   Error: Page "/topico/[slug]/opengraph-image/[__metadata_id__]" is missing
//   "generateStaticParams()" so it cannot be used with "output: export" config.
//
// porque o `generateStaticParams` que o loader gera nesse modo devolve só o
// `__metadata_id__`, nunca o `slug`. Ou seja: daqui dá para ter um card por
// tópico ou um alt por tópico, não os dois. Quem alcança os dois é o
// `generateMetadata` da página, que recebe o `slug`.
export const alt =
  "Card do Roadmap DSA: o nome do tópico e o grupo dele, no guia visual e gratuito de Algoritmos e Estruturas de Dados em português";

// Sem isto, o `output: "export"` não sabe para quais slugs gerar a imagem e a
// rota simplesmente não sai no `out/` — sem erro nenhum, com o HTML continuando
// a apontar para uma URL que passa a dar 404. A mesma lista da página do tópico:
// um card por tópico do roadmap, inclusive os que ainda estão "em breve", porque
// o link deles circula do mesmo jeito.
export function generateStaticParams() {
  return ALL_TOPICS.map((t) => ({ slug: t.slug }));
}

// A fonte do card não é a fonte do navegador.
//
// O Satori (motor do `next/og`) monta a fonte baixando só o que o texto pede, e
// há glifo que ele não consegue. Medido: um "⇄" na descrição de Números Binários
// devolvia `Failed to download dynamic font. Status: 400`, o build passava verde,
// e o card saía com um retângulo vazio no lugar ("a conversão decimal ▯ binário").
// O símbolo foi trocado por palavras no `content/roadmap.ts`, que é onde estava a
// causa: ele também ia parar na `meta description` da busca.
//
// Esta guarda é o que sobra do achado, e ela continua valendo. O `roadmap.ts` já
// junta símbolo fora do Latin-1 em outros campos ("2ⁿ" num título de referência,
// "≥" num nome de problema do LeetCode) e esses não entram no card. Nada impede o
// próximo de cair num `name`, `group` ou `description`, e aí o build passa verde
// com um retângulo vazio que ninguém vê sem abrir as 47 imagens. Então o build
// para nos três campos que o card desenha, e só neles.
function exigirLatin1(campos: Record<string, string>, slug: string): void {
  for (const [campo, texto] of Object.entries(campos)) {
    const semFonte = [...texto].filter((c) => c.codePointAt(0)! > 0xff);
    if (semFonte.length > 0) {
      throw new Error(
        `opengraph-image (${slug}): ${JSON.stringify(semFonte.join(""))} em "${campo}" está fora ` +
          "do Latin-1, e o card do Open Graph sai com um retângulo vazio no lugar. Troque o " +
          "símbolo por palavras no texto do tópico, em content/roadmap.ts."
      );
    }
  }
}

// Teto da chamada, em caracteres. A 26px (o corpo do subtítulo no template) e num
// bloco de 1000px cabem cerca de 76 caracteres por linha: 150 é o teto de duas
// linhas, que é o que sobra abaixo de um título de duas linhas.
const TETO_DA_CHAMADA = 150;

/**
 * A `description` do tópico, encurtada para caber sem cortar no meio da frase.
 *
 * Descrição que passa do teto perde as frases seguintes, não as últimas
 * palavras: das 47, três passam (`strings`, `subarray-...-subset` e
 * `sliding-window`) e as três terminam num ponto final de verdade. O corte por
 * palavra só existe para o dia em que alguém escrever uma primeira frase de 200
 * caracteres, e fecha com três pontos em vez de "…" pelo motivo do
 * `exigirLatin1`: a reticência tipográfica está fora do Latin-1 e nenhum card usa
 * uma hoje, então ela entraria sem ninguém ter visto se ela desenha.
 */
function chamada(descricao: string): string {
  if (descricao.length <= TETO_DA_CHAMADA) return descricao;

  const fimDaPrimeiraFrase = descricao.indexOf(". ");
  const primeiraFrase = fimDaPrimeiraFrase > 0 ? descricao.slice(0, fimDaPrimeiraFrase + 1) : descricao;
  if (primeiraFrase.length <= TETO_DA_CHAMADA) return primeiraFrase;

  const corte = primeiraFrase.slice(0, TETO_DA_CHAMADA);
  const ultimoEspaco = corte.lastIndexOf(" ");
  const base = ultimoEspaco > 1 ? corte.slice(0, ultimoEspaco) : corte;
  return `${base.replace(/[.,;:]$/, "")}...`;
}

/**
 * Corpo do título, em px, pelo tamanho da linha que ele precisa acomodar.
 *
 * O template quebra o título em quantas linhas precisar e come o espaço do
 * subtítulo. A linha mais longa do roadmap tem 52 caracteres ("Busca Binária no
 * Espaço de Respostas · Busca Binária") e é a única que desce para 46px; 32 das
 * 47 cabem no corpo cheio.
 */
function corpoDoTitulo(caracteres: number): number {
  if (caracteres <= 30) return 62;
  if (caracteres <= 44) return 54;
  return 46;
}

export default async function TopicoOpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = getTopic(slug);
  // `generateStaticParams` acima enumera exatamente `ALL_TOPICS`, então isto só
  // acontece se as duas listas se separarem. Falhar o build é melhor que gerar
  // um card em branco que ninguém olha até o LinkedIn mostrar.
  if (!t) throw new Error(`opengraph-image: slug fora do roadmap: ${slug}`);

  exigirLatin1({ name: t.name, group: t.group, description: t.description }, slug);

  // O grupo entra como contexto depois do nome, com o mesmo "·" que separa o
  // título das páginas ("%s · Roadmap DSA"). Seis tópicos dão nome ao próprio
  // grupo (Backtracking, Busca Binária, Listas Encadeadas, Matemática,
  // Programação Dinâmica e Greedy Algorithms) e ficam só com o nome: card que
  // repete a mesma palavra duas vezes parece defeito.
  const contexto = t.group === t.name ? "" : `· ${t.group}`;
  const linhaDoTitulo = `${t.name} ${contexto}`.trim();

  return ogImage({
    // O nome do tópico é o que precisa ser lido primeiro, então fica no azul de
    // destaque e na frente; o grupo vem depois, em branco.
    highlight: t.name,
    title: contexto,
    subtitle: chamada(t.description),
    titleSize: corpoDoTitulo(linhaDoTitulo.length),
  });
}
