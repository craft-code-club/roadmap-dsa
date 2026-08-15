import { TRACKS, trackTopics, getTrack } from "@content/tracks";
import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og";

// Card de compartilhamento de cada trilha. Mesmo template das outras rotas
// (`src/lib/og.tsx`); aqui só decidimos o que entra em cada campo.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const dynamic = "force-static";

// `alt` é constante do módulo, e não texto por trilha, pela mesma limitação
// medida no card por tópico: o Next lê este export UMA vez, e o caminho para
// variá-lo (`generateImageMetadata`) não recebe os params do segmento pai. O
// porquê, com o erro exato do Next 16, está no cabeçalho de
// `src/app/topico/[slug]/opengraph-image.tsx`.
export const alt =
  "Card do Roadmap DSA: o nome de uma trilha de estruturas de dados e o que ela cobre, no guia visual e gratuito em português";

export function generateStaticParams() {
  return TRACKS.map((t) => ({ slug: t.slug }));
}

// O mesmo guarda do card por tópico: fora do Latin-1, o Satori não consegue
// baixar o glifo e desenha um retângulo vazio, com o build passando verde.
function exigirLatin1(campos: Record<string, string>, slug: string): void {
  for (const [campo, texto] of Object.entries(campos)) {
    const semFonte = [...texto].filter((c) => c.codePointAt(0)! > 0xff);
    if (semFonte.length > 0) {
      throw new Error(
        `opengraph-image (trilha ${slug}): ${JSON.stringify(semFonte.join(""))} em "${campo}" está ` +
          "fora do Latin-1, e o card do Open Graph sai com um retângulo vazio no lugar. Troque o " +
          "símbolo por palavras em content/tracks.ts."
      );
    }
  }
}

export default async function TrilhaOpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getTrack(slug);
  if (!c) throw new Error(`opengraph-image: trilha inexistente: ${slug}`);

  exigirLatin1({ name: c.name, tagline: c.tagline }, slug);

  const n = trackTopics(c).length;
  return ogImage({
    highlight: "Trilha",
    title: c.name,
    subtitle: `${c.tagline} ${n} tópicos, visual e em português.`,
    // O nome da trilha é longo ("Casamento de Padrões em Strings" tem 31): com o
    // corpo cheio ele empurra o subtítulo para fora do card.
    titleSize: c.name.length <= 24 ? 54 : 46,
  });
}
