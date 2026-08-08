import { execFileSync } from "node:child_process";
import { ALL_TOPICS, isEmptyTopic } from "@content/roadmap";

// A data de uma página, derivada do `git log`. Um lugar só, porque são dois
// consumidores que precisam responder a MESMA coisa: o `lastmod` do
// `sitemap.ts` e o `dateModified` do JSON-LD do tópico. Dois predicados para a
// mesma decisão é como o buraco do sitemap nasceu (ver o comentário do filtro
// de `isEmptyTopic` lá), e aqui a consequência seria pior: o sitemap
// escondendo a data por não confiar nela enquanto a página a estampa.
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
// está nas próprias datas que ele acabou de coletar. Se todas as páginas
// saírem com o MESMO carimbo, esse carimbo não é informação — é a data do
// último commit repetida 40 vezes, exatamente o `lastmod` que o Google
// aprendeu a ignorar —, e aí o campo inteiro não sai.
//
// A vantagem sobre qualquer sonda de ambiente: build e teste chegam à mesma
// conclusão porque olham o mesmo dado, o resultado do `git log`, e não um
// marcador que cada máquina mantém do seu jeito.

// Um `git log` por caminho, e não por consulta. São 48 chamadas só para montar
// o sitemap e cada uma custa ~29ms de processo novo (medido neste repositório,
// 1,39s no total): `content/roadmap.ts` sozinho é consultado 6 vezes, uma por
// rota fixa que o lista e uma por tópico sem artigo que cai no fallback. Com a
// página de tópico consultando os mesmos caminhos, o cache deixou de ser uma
// economia e virou o que segura o custo. Ele vale por build — o `git log` de um
// caminho não muda no meio dele.
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

const cacheDoPrimeiroCommit = new Map<string, number | undefined>();

/**
 * O PRIMEIRO commit que tocou o caminho — a data em que aquele conteúdo entrou
 * no repositório.
 *
 * Sem `-1`, e isso não é descuido: o `git log` aplica o limite ANTES de
 * inverter, então `--reverse -1` devolve o commit mais NOVO. A saída inteira é
 * percorrida e o que vale é a primeira linha.
 *
 * Sem `--follow` também, e a consequência é declarada: um artigo renomeado
 * (slug trocado) passa a contar a partir do rename. `--follow` é heurística de
 * similaridade e muda de resposta conforme o resto do commit — para um campo
 * que vai virar `datePublished`, uma data estável e explicável vale mais do que
 * uma data adivinhada.
 */
function primeiroCommitDoArquivo(arquivo: string): number | undefined {
  const emCache = cacheDoPrimeiroCommit.get(arquivo);
  if (emCache !== undefined || cacheDoPrimeiroCommit.has(arquivo)) return emCache;
  let valor: number | undefined;
  try {
    const saida = execFileSync("git", ["log", "--reverse", "--format=%cI", "--", arquivo], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const iso = saida.split("\n", 1)[0].trim();
    const ms = iso ? Date.parse(iso) : NaN;
    valor = Number.isNaN(ms) ? undefined : ms;
  } catch {
    valor = undefined;
  }
  cacheDoPrimeiroCommit.set(arquivo, valor);
  return valor;
}

/** A data da rota é a do arquivo de conteúdo dela que mudou por último. */
export function ultimaAlteracao(...arquivos: readonly string[]): Date | undefined {
  const datas = arquivos.map(commitDoArquivo).filter((ms): ms is number => ms !== undefined);
  return datas.length ? new Date(Math.max(...datas)) : undefined;
}

/**
 * A data de um tópico: a do artigo, com o `roadmap.ts` de reserva.
 *
 * O artigo é o corpo da página; o tópico sem artigo cai no `roadmap.ts`, que é
 * onde mora cada palavra que essa página mostra.
 *
 * Aqui é `??` e NÃO o `max(...)` das rotas fixas, e a diferença foi medida: os
 * 36 `.mdx` do repositório são todos mais antigos que o último commit do
 * `roadmap.ts`, então `max` daria a MESMA data às 36 páginas de tópico e
 * qualquer edição no `roadmap.ts` (marcar um `isNew`, mexer num link)
 * reescreveria a data das 40 URLs de uma vez. Isso é exatamente o
 * "lastmod = data do último deploy" que o Google aprendeu a ignorar. A home e o
 * `/roadmap/` não têm essa escolha: lá o `roadmap.ts` É o conteúdo.
 */
export function atualizacaoDoTopico(slug: string): Date | undefined {
  return ultimaAlteracao(`content/topics/${slug}.mdx`) ?? ultimaAlteracao("content/roadmap.ts");
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

/** A resposta do guarda, uma vez por build. `undefined` = ainda não perguntei. */
let gitDistingueCaminhos: boolean | undefined;

/**
 * O MESMO guarda do sitemap, respondido uma vez por build.
 *
 * Uma página sozinha não tem como saber se o carimbo dela é informação: a
 * resposta só existe olhando o CONJUNTO. Então a pergunta é feita pelo site
 * inteiro — as datas dos tópicos que o sitemap convida — e o conjunto passa
 * pelo próprio `comDataUtil`. Se ele apagar as datas, o `git log` deste build
 * respondeu o mesmo para todo caminho, e nenhuma página estampa data nenhuma.
 *
 * É a mesma pergunta do `lastmod` de propósito, e não por economia: o sitemap
 * omitindo a data por não confiar nela enquanto a página a estampa em 40
 * lugares seria o site se contradizendo sobre o mesmo fato.
 */
function oGitDistingueCaminhos(): boolean {
  if (gitDistingueCaminhos === undefined) {
    const entradas = ALL_TOPICS.filter((t) => !isEmptyTopic(t)).map((t) => ({
      lastModified: atualizacaoDoTopico(t.slug),
    }));
    gitDistingueCaminhos = comDataUtil(entradas).some((e) => e.lastModified !== undefined);
  }
  return gitDistingueCaminhos;
}

export type DatasDoTopico = {
  /**
   * O primeiro commit do artigo. Ausente quando o tópico não tem `.mdx`: aí a
   * data de reserva é a do `content/roadmap.ts`, e o primeiro commit DELE é o
   * começo do repositório — que não é a data em que aquele tópico nasceu.
   */
  publicado?: Date;
  atualizado: Date;
};

/**
 * As datas de um tópico, ou `undefined` quando elas não seriam informação.
 *
 * Devolver `undefined` é o caminho normal em clone raso, e é o comportamento
 * certo: uma data errada é pior do que data nenhuma. Quem chama não precisa
 * saber disso — sem datas, o selo não é desenhado e os campos não saem.
 */
export function datasDoTopico(slug: string): DatasDoTopico | undefined {
  if (!oGitDistingueCaminhos()) return undefined;
  const atualizado = atualizacaoDoTopico(slug);
  if (!atualizado) return undefined;
  const publicado = primeiroCommitDoArquivo(`content/topics/${slug}.mdx`);
  return publicado === undefined
    ? { atualizado }
    : { publicado: new Date(publicado), atualizado };
}
