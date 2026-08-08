import type { MetadataRoute } from "next";
import { ALL_TOPICS, isEmptyTopic } from "@content/roadmap";
import { atualizacaoDoTopico, comDataUtil, ultimaAlteracao } from "@/lib/datas-do-git";
import { SITE_URL } from "@/lib/links";

export const dynamic = "force-static";

// O sitemap é a lista do que o site QUER no índice do Google.
//
// Ele mapeava `ALL_TOPICS` sem filtro enquanto a página emitia `noindex` por
// `isEmptyTopic`: 11 das 51 URLs convidavam o robô para páginas que o próprio
// HTML mandava ignorar, e cada uma vira um erro vermelho permanente no Search
// Console. O filtro abaixo chama a MESMA função que a página chama — recriar a
// condição aqui é o que fez o buraco existir, e recriá-la de novo o reabriria na
// primeira vez que a regra de "tópico vazio" mudasse de um lado só.
const rotasFixas = ["/", "/introducao/", "/roadmap/", "/apoie/", "/sobre/"] as const;

// Arquivos que respondem pelo conteúdo de cada rota, para a data sair do Git.
//
// É uma LISTA, e não um arquivo só, porque `page.tsx` quase nunca é onde o texto
// mora. A home e o `/roadmap/` importam de `content/roadmap.ts`: mexer num
// tópico muda as duas telas sem tocar em nenhum dos dois `page.tsx`, e o
// `lastmod` ficava parado no dia em que o layout da página mudou pela última
// vez. O `/apoie/` tem a mesma forma com `apoiadores.ts`, que é onde a lista de
// nomes é mantida à mão. A data da rota é a MAIS RECENTE entre esses arquivos.
export const CONTEUDO_DA_ROTA: Record<(typeof rotasFixas)[number], readonly string[]> = {
  "/": ["src/app/page.tsx", "content/roadmap.ts"],
  "/introducao/": ["src/app/introducao/page.tsx"],
  "/roadmap/": ["src/app/roadmap/page.tsx", "content/roadmap.ts"],
  "/apoie/": ["src/app/apoie/page.tsx", "src/app/apoie/apoiadores.ts"],
  // O /sobre também lê o `roadmap.ts`: os números de tópicos, visualizadores e
  // problemas que o texto cita saem de lá, como na home. Tópico novo muda a
  // página sem ninguém tocar no `page.tsx` dela.
  "/sobre/": ["src/app/sobre/page.tsx", "content/roadmap.ts"],
};

// `lastmod` é o único dos três campos opcionais que o Google declarou usar;
// `priority` e `changeFrequency`, que este arquivo já preenchia, ele ignora.
//
// A derivação da data — o `git log`, o cache por build e o guarda que decide se
// o carimbo é informação — mora em `src/lib/datas-do-git.ts`, porque a página do
// tópico precisa exatamente da mesma resposta para o `dateModified` do JSON-LD.
// A memória de por que o guarda pergunta por CAPACIDADE, e não pela
// profundidade do clone, está lá em cima do arquivo.

export default function sitemap(): MetadataRoute.Sitemap {
  const base = rotasFixas.map((rota) => ({
    url: `${SITE_URL}${rota}`,
    priority: rota === "/" ? 1 : rota === "/apoie/" || rota === "/sobre/" ? 0.5 : 0.9,
    changeFrequency: rota === "/" || rota === "/roadmap/" ? ("weekly" as const) : ("monthly" as const),
    lastModified: ultimaAlteracao(...CONTEUDO_DA_ROTA[rota]),
  }));
  const topicos = ALL_TOPICS.filter((t) => !isEmptyTopic(t)).map((t) => ({
    url: `${SITE_URL}/topico/${t.slug}/`,
    priority: t.status === "ready" ? 0.8 : 0.4,
    changeFrequency: "monthly" as const,
    lastModified: atualizacaoDoTopico(t.slug),
  }));
  return comDataUtil([...base, ...topicos]);
}
