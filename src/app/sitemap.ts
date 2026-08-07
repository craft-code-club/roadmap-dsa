import { execFileSync } from "node:child_process";
import type { MetadataRoute } from "next";
import { ALL_TOPICS, isEmptyTopic } from "@content/roadmap";
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
const rotasFixas = ["/", "/introducao/", "/roadmap/", "/apoie/"] as const;

// Arquivo que responde pelo conteúdo de cada rota, para a data sair do Git.
const arquivoDaRota: Record<(typeof rotasFixas)[number], string> = {
  "/": "src/app/page.tsx",
  "/introducao/": "src/app/introducao/page.tsx",
  "/roadmap/": "src/app/roadmap/page.tsx",
  "/apoie/": "src/app/apoie/page.tsx",
};

// `lastmod` é o único dos três campos opcionais que o Google declarou usar;
// `priority` e `changeFrequency`, que este arquivo já preenchia, ele ignora.
//
// A data vem do Git, e não de um campo `updatedAt` no `content/roadmap.ts`:
// data que depende de alguém lembrar de atualizá-la em cada PR envelhece errado
// e passa a mentir, o que é pior do que não existir.
//
// O guarda do clone raso não é preciosismo. `actions/checkout` clona com
// `fetch-depth: 1`, e num histórico de um commit só o `git log` de QUALQUER
// caminho devolve esse commit: as 40 URLs sairiam com a data do último deploy,
// que é exatamente o `lastmod` que o Google aprendeu a ignorar. Sem o campo é
// melhor que com o campo falso, então aqui ele simplesmente não sai — e volta a
// sair sozinho no dia em que o workflow buscar o histórico (`fetch-depth: 0`).
const historicoDisponivel = (() => {
  try {
    const raso = execFileSync("git", ["rev-parse", "--is-shallow-repository"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return raso === "false";
  } catch {
    return false; // sem git, ou fora de um repositório
  }
})();

function ultimaAlteracao(arquivo: string): Date | undefined {
  if (!historicoDisponivel) return undefined;
  try {
    const iso = execFileSync("git", ["log", "-1", "--format=%cI", "--", arquivo], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return iso ? new Date(iso) : undefined;
  } catch {
    return undefined;
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = rotasFixas.map((rota) => ({
    url: `${SITE_URL}${rota}`,
    priority: rota === "/" ? 1 : rota === "/apoie/" ? 0.5 : 0.9,
    changeFrequency: rota === "/" || rota === "/roadmap/" ? ("weekly" as const) : ("monthly" as const),
    lastModified: ultimaAlteracao(arquivoDaRota[rota]),
  }));
  const topicos = ALL_TOPICS.filter((t) => !isEmptyTopic(t)).map((t) => ({
    url: `${SITE_URL}/topico/${t.slug}/`,
    priority: t.status === "ready" ? 0.8 : 0.4,
    changeFrequency: "monthly" as const,
    // O artigo é o corpo da página; o tópico sem artigo cai no `roadmap.ts`, que
    // é onde mora cada palavra que essa página mostra.
    lastModified: ultimaAlteracao(`content/topics/${t.slug}.mdx`) ?? ultimaAlteracao("content/roadmap.ts"),
  }));
  return [...base, ...topicos];
}
