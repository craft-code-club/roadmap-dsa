import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
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
// O guarda do clone raso não é preciosismo. `actions/checkout` clona com
// `fetch-depth: 1`, e num histórico de um commit só o `git log` de QUALQUER
// caminho devolve esse commit: as 40 URLs sairiam com a data do último deploy,
// que é exatamente o `lastmod` que o Google aprendeu a ignorar. Sem o campo é
// melhor que com o campo falso, então aqui ele simplesmente não sai — e volta a
// sair sozinho no dia em que o workflow buscar o histórico (`fetch-depth: 0`).
//
// A pergunta é respondida pelo ARQUIVO `shallow` do diretório do Git, e não por
// `git rev-parse --is-shallow-repository`. É a mesma informação (o comando é
// literalmente "esse arquivo existe?"), e a diferença é que ler o disco não pode
// falhar por carga da máquina. O subprocesso pode: um `execFileSync` devolve
// EAGAIN quando o runner está saturado, e aí o `catch` responde "raso" para uma
// pergunta que nunca chegou a ser feita. Foi assim que a suíte reprovou na CI
// com o sitemap CERTO — o build tinha histórico e as datas saíram variadas, e o
// teste, que fazia a mesma pergunta pelo mesmo caminho, ouviu "raso" e cobrou
// a ausência do campo.
//
// Por isso também é EXPORTADA: o teste importa esta função em vez de repetir a
// decisão do seu lado. Dois predicados para a mesma decisão é o defeito que este
// arquivo existe para consertar, e ele tinha voltado dentro do próprio teste.
function diretorioDoGit(raiz: string): string | undefined {
  const dotGit = path.join(raiz, ".git");
  if (!existsSync(dotGit)) return undefined;
  if (statSync(dotGit).isDirectory()) return dotGit;
  // Worktree ligada: `.git` é um arquivo com `gitdir: <caminho>`, e o marcador
  // `shallow` mora no diretório COMUM, apontado pelo arquivo `commondir`.
  const gitdir = readFileSync(dotGit, "utf8").match(/^gitdir:\s*(.+)$/m)?.[1]?.trim();
  if (!gitdir) return undefined;
  const dir = path.resolve(raiz, gitdir);
  const commondir = path.join(dir, "commondir");
  return existsSync(commondir) ? path.resolve(dir, readFileSync(commondir, "utf8").trim()) : dir;
}

/** `true` quando o histórico não dá para distinguir um caminho do outro. */
export function historicoRaso(): boolean {
  const dir = diretorioDoGit(process.cwd());
  if (!dir) return true; // sem repositório, nenhuma data é derivável
  return existsSync(path.join(dir, "shallow"));
}

const historicoDisponivel = !historicoRaso();

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
  if (!historicoDisponivel) return undefined;
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
  return [...base, ...topicos];
}
