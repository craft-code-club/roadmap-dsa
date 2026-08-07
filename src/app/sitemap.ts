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
};

// `lastmod` é o único dos três campos opcionais que o Google declarou usar;
// `priority` e `changeFrequency`, que este arquivo já preenchia, ele ignora.
//
// A data vem do Git, e não de um campo `updatedAt` no `content/roadmap.ts`:
// data que depende de alguém lembrar de atualizá-la em cada PR envelhece errado
// e passa a mentir, o que é pior do que não existir.
//
// O guarda contra a data falsa NÃO pergunta se o clone é raso, e a diferença
// custou duas reprovações de CI. A primeira versão consultava
// `git rev-parse --is-shallow-repository`; a segunda leu direto o arquivo
// `.git/shallow`, que é o que aquele comando consulta. As duas reprovaram a
// suíte num job com histórico de sobra, e o diagnóstico que eu embuti na
// mensagem mostrou por quê:
//
//     marcador de clone raso em /home/runner/.../.git/shallow
//     datas distintas que ele resolve: 2
//
// O `actions/checkout` com `fetch-depth: 0` DEIXA o marcador para trás, e o
// histórico ali é fundo o bastante para o `git log` responder datas diferentes
// por caminho. Marcador presente e histórico utilizável ao mesmo tempo: a
// pergunta é que estava errada.
//
// O que este arquivo precisa saber não é a profundidade do clone, é uma
// CAPACIDADE: o `git log` consegue distinguir um caminho do outro? A resposta
// está nas próprias datas que ele acabou de coletar. Se todas as URLs saírem
// com o MESMO carimbo, esse carimbo não é informação — é a data do último
// commit repetida 40 vezes, exatamente o `lastmod` que o Google aprendeu a
// ignorar —, e aí o campo inteiro não sai.
//
// A vantagem sobre qualquer sonda de ambiente: build e teste chegam à mesma
// conclusão porque olham o mesmo dado, o resultado do `git log`, e não um
// marcador que cada máquina mantém do seu jeito.

// Um `git log` por caminho, e não por consulta. São 48 chamadas para montar o
// sitemap e cada uma custa ~29ms de processo novo (medido neste repositório,
// 1,39s no total): `content/roadmap.ts` sozinho é consultado 6 vezes, uma por
// rota fixa que o lista e uma por tópico sem artigo que cai no fallback. O
// cache vale por build — o `git log` de um caminho não muda no meio dele.
const cacheDeCommit = new Map<string, number | undefined>();

function commitDoArquivo(arquivo: string): number | undefined {
  const emCache = cacheDeCommit.get(arquivo);
  if (emCache !== undefined || cacheDeCommit.has(arquivo)) return emCache;
  const valor = consultarCommit(arquivo);
  cacheDeCommit.set(arquivo, valor);
  return valor;
}

function consultarCommit(arquivo: string): number | undefined {
  try {
    const iso = execFileSync("git", ["log", "-1", "--format=%cI", "--", arquivo], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!iso) return undefined; // caminho que nunca existiu no histórico
    const ms = Date.parse(iso);
    return Number.isNaN(ms) ? undefined : ms;
  } catch {
    return undefined;
  }
}

/** A data da rota é a do arquivo de conteúdo dela que mudou por último. */
function ultimaAlteracao(...arquivos: readonly string[]): Date | undefined {
  const datas = arquivos.map(commitDoArquivo).filter((ms): ms is number => ms !== undefined);
  return datas.length ? new Date(Math.max(...datas)) : undefined;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = rotasFixas.map((rota) => ({
    url: `${SITE_URL}${rota}`,
    priority: rota === "/" ? 1 : rota === "/apoie/" ? 0.5 : 0.9,
    changeFrequency: rota === "/" || rota === "/roadmap/" ? ("weekly" as const) : ("monthly" as const),
    lastModified: ultimaAlteracao(...CONTEUDO_DA_ROTA[rota]),
  }));
  const topicos = ALL_TOPICS.filter((t) => !isEmptyTopic(t)).map((t) => ({
    url: `${SITE_URL}/topico/${t.slug}/`,
    priority: t.status === "ready" ? 0.8 : 0.4,
    changeFrequency: "monthly" as const,
    // O artigo é o corpo da página; o tópico sem artigo cai no `roadmap.ts`, que
    // é onde mora cada palavra que essa página mostra.
    //
    // Aqui é `??` e NÃO o `max(...)` das rotas fixas, e a diferença foi medida:
    // os 36 `.mdx` do repositório são todos mais antigos que o último commit do
    // `roadmap.ts`, então `max` daria a MESMA data às 36 páginas de tópico e
    // qualquer edição no `roadmap.ts` (marcar um `isNew`, mexer num link)
    // reescreveria o `lastmod` das 40 URLs de uma vez. Isso é exatamente o
    // "lastmod = data do último deploy" que o Google aprendeu a ignorar. A home
    // e o `/roadmap/` não têm essa escolha: lá o `roadmap.ts` É o conteúdo.
    lastModified: ultimaAlteracao(`content/topics/${t.slug}.mdx`) ?? ultimaAlteracao("content/roadmap.ts"),
  }));
  return comDataUtil([...base, ...topicos]);
}

/**
 * Devolve as entradas sem `lastModified` quando as datas não carregam
 * informação: uma só distinta (ou nenhuma) significa que o `git log` respondeu
 * o mesmo para todo caminho. Exportada para o teste conferir a MESMA regra em
 * vez de recriá-la — foi recriando que este guarda errou duas vezes.
 */
export function comDataUtil<T extends { lastModified?: Date }>(entradas: T[]): T[] {
  const distintas = new Set(
    entradas.map((e) => e.lastModified?.getTime()).filter((v): v is number => v !== undefined)
  );
  if (distintas.size > 1) return entradas;
  return entradas.map(({ lastModified: _, ...resto }) => resto as T);
}
