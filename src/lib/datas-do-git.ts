import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { ALL_TOPICS, isEmptyTopic } from "@content/roadmap";

// As rotas fixas e os arquivos que respondem pelo conteúdo de cada uma.
//
// Mora AQUI, e não no `sitemap.ts` que é o principal consumidor, por uma razão
// só: é deste inventário que sai o conjunto de caminhos que o guarda mede, e o
// guarda precisa ser o mesmo para os dois consumidores. Com o mapa lá e o
// guarda cá, a única saída seria o módulo importar o `sitemap.ts` — que já
// importa o módulo.
//
// É uma LISTA por rota, e não um arquivo só, porque `page.tsx` quase nunca é
// onde o texto mora. A home e o `/roadmap/` importam de `content/roadmap.ts`:
// mexer num tópico muda as duas telas sem tocar em nenhum dos dois `page.tsx`,
// e a data ficava parada no dia em que o layout mudou pela última vez. O
// `/apoie/` tem a mesma forma com `apoiadores.ts`, que é onde a lista de nomes
// é mantida à mão. A data da rota é a MAIS RECENTE entre esses arquivos.
//
// O tipo do `Record` é o que cobra a segunda metade: acrescentar uma rota em
// `ROTAS_FIXAS` sem declarar de que arquivos ela tira data é erro de
// compilação, não uma URL sem `lastmod` descoberta meses depois.
export const ROTAS_FIXAS = ["/", "/introducao/", "/roadmap/", "/apoie/", "/sobre/"] as const;

export const CONTEUDO_DA_ROTA: Record<(typeof ROTAS_FIXAS)[number], readonly string[]> = {
  "/": ["src/app/page.tsx", "content/roadmap.ts"],
  "/introducao/": ["src/app/introducao/page.tsx"],
  "/roadmap/": ["src/app/roadmap/page.tsx", "content/roadmap.ts"],
  "/apoie/": ["src/app/apoie/page.tsx", "src/app/apoie/apoiadores.ts"],
  // O /sobre também lê o `roadmap.ts`: os números de tópicos, visualizadores e
  // problemas que o texto cita saem de lá, como na home. Tópico novo muda a
  // página sem ninguém tocar no `page.tsx` dela.
  "/sobre/": ["src/app/sobre/page.tsx", "content/roadmap.ts"],
};

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
// está nas próprias datas que ele acabou de coletar.
//
// A vantagem sobre qualquer sonda de ambiente: build e teste chegam à mesma
// conclusão porque olham o mesmo dado, o resultado do `git log`, e não um
// marcador que cada máquina mantém do seu jeito.
//
// E a medida dessa capacidade é CONCENTRAÇÃO, não contagem de distintas. A
// diferença não é teórica: num clone raso com alguns commits em cima, os
// caminhos que esses commits tocaram resolvem para eles e todo o RESTO resolve
// para o commit-fronteira. Dá duas datas distintas — `Set.size > 1` aprova — e
// a esmagadora maioria das URLs fica com uma data fabricada. Foi assim que uma
// CI vermelha inteira se explicou: o git daquele processo achatou 39 dos 42
// caminhos na data do merge da base e resolveu de verdade os TRÊS que o PR
// tinha tocado; a contagem valia 2, o guarda concluía "o git enxerga", e 37
// URLs corretas foram reprovadas.
//
// Então a medida é a fatia da MODA sobre todos os caminhos de que o site tira
// data. Margens medidas neste repositório: com histórico de verdade, 45
// caminhos, 24 datas distintas, moda de 6 (13,3%); no job achatado a moda era
// 39 de 42 (92,9%). O corte em 50% fica longe dos dois, e cobre o caso antigo —
// git que resolve UMA data para tudo tem moda de 100%.
//
// Este critério não nasceu aqui: ele já era o do `tests/seo-estrutura.spec.ts`,
// que o descobriu na investigação daquela CI. O que mudou é que agora ele mora
// no código de produção e o teste IMPORTA a mesma função, em vez de o
// repositório manter duas versões da mesma regra — que é exatamente o erro que
// o comentário do `sitemap.ts` registra sobre recriar a condição em dois
// lugares.

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

const ARQUIVO_DO_ROADMAP = "content/roadmap.ts";

/** Os intervalos, lidos e validados uma vez por build. */
let intervalos: Map<string, readonly [number, number]> | undefined;

/**
 * O intervalo de linhas que descreve cada tópico dentro do `roadmap.ts`.
 *
 * Existe porque a página de um tópico é feita de DOIS conteúdos: o artigo
 * (`.mdx`) e a entrada dele aqui, de onde saem título, nível, tempo de leitura,
 * vídeo, problemas e referências — tudo isso está na tela. Datar a página só
 * pelo artigo é ignorar metade dela; datar pelo arquivo inteiro é dizer que
 * todos os tópicos mudaram quando um mudou.
 *
 * O intervalo é achado por balanço de chaves a partir do `slug:`, e serve para
 * as DUAS formas de escrita que o arquivo usa hoje — o objeto multilinha dos
 * tópicos com material e o objeto de uma linha só dos `soon`.
 *
 * ⚠️ O resultado é VALIDADO antes de valer: o intervalo tem que conter este
 * `slug` e nenhum outro. Sem essa conferência, uma reformatação do arquivo faria
 * o intervalo de um tópico engolir o vizinho e a página passaria a mostrar,
 * com toda a confiança, a data de outro tópico. Intervalo que não valida não é
 * usado — o tópico cai no plano B, que é a regra antiga.
 *
 * Medido na `main` de hoje: 47 de 47 tópicos validam.
 */
function intervalosDosTopicos(): Map<string, readonly [number, number]> {
  if (intervalos) return intervalos;
  intervalos = new Map();
  let linhas: string[];
  try {
    linhas = readFileSync(ARQUIVO_DO_ROADMAP, "utf8").split("\n");
  } catch {
    return intervalos; // sem o arquivo, todo tópico cai no plano B
  }

  // Onde cada `slug:` começa, em linha e coluna. A coluna importa: no objeto de
  // uma linha só, a chave que abre está ANTES do slug, na mesma linha.
  const posicaoDoSlug = new Map<string, readonly [number, number]>();
  linhas.forEach((linha, i) => {
    const m = linha.match(/\bslug: "([^"]+)"/);
    if (m && !posicaoDoSlug.has(m[1])) posicaoDoSlug.set(m[1], [i, m.index!]);
  });

  for (const [slug, [linhaDoSlug, coluna]] of posicaoDoSlug) {
    // Para trás, até a chave que abre o objeto deste tópico.
    let saldo = 0;
    let inicio = -1;
    for (let j = linhaDoSlug; j >= 0 && inicio < 0; j--) {
      const linha = linhas[j];
      for (let k = j === linhaDoSlug ? coluna : linha.length - 1; k >= 0; k--) {
        if (linha[k] === "}") saldo--;
        else if (linha[k] === "{" && ++saldo === 1) {
          inicio = j;
          break;
        }
      }
    }
    if (inicio < 0) continue;

    // Para frente, até ela fechar.
    let nivel = 0;
    let fim = -1;
    for (let j = inicio; j < linhas.length && fim < 0; j++) {
      for (const ch of linhas[j]) {
        if (ch === "{") nivel++;
        else if (ch === "}" && --nivel === 0) {
          fim = j;
          break;
        }
      }
    }
    if (fim < 0) continue;

    // A validação: um slug dentro, e um só.
    let quantosSlugs = 0;
    for (const [, [j]] of posicaoDoSlug) if (j >= inicio && j <= fim) quantosSlugs++;
    if (quantosSlugs === 1) intervalos.set(slug, [inicio + 1, fim + 1]);
  }
  return intervalos;
}

const cacheDoIntervalo = new Map<string, number | undefined>();

/**
 * O último commit que mexeu NAQUELE trecho do `roadmap.ts`.
 *
 * `git log -L <ini>,<fim>:<arquivo>` segue o intervalo de linhas ao longo do
 * histórico — inclusive quando ele desliza porque alguém inseriu tópicos acima.
 *
 * Por que `-L` e não `git blame`, que responderia quase o mesmo por 1/26 do
 * preço (medido: 207ms de um `blame` do arquivo inteiro contra 5,5s de 36
 * `-L`): o `blame` só enxerga as linhas que SOBREVIVERAM até hoje, então um
 * commit que só REMOVEU coisa do tópico (tirar um problema da lista, cortar uma
 * referência) não move a data — e remover é mudar a página. Medido: as duas
 * respostas divergem em 18 dos 36 tópicos, e em 3 deles a divergência muda o
 * DIA que o aluno lê. Num selo visível, 3 páginas com data velha é o defeito
 * que este mecanismo existe para não ter.
 *
 * O preço, dito na cara: 6,5s para os 47 tópicos (137ms cada), contra os ~1,4s
 * de `git log` que o build já pagava. É custo de build, uma vez, num site
 * estático — e vem com cache, então as 47 páginas dividem as 47 consultas.
 */
function commitDoIntervalo(ini: number, fim: number): number | undefined {
  const chave = `${ini},${fim}`;
  const emCache = cacheDoIntervalo.get(chave);
  if (emCache !== undefined || cacheDoIntervalo.has(chave)) return emCache;
  let valor: number | undefined;
  try {
    const saida = execFileSync(
      "git",
      ["log", "-L", `${ini},${fim}:${ARQUIVO_DO_ROADMAP}`, "--no-patch", "--format=%cI"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    );
    const iso = saida.split("\n", 1)[0].trim();
    const ms = iso ? Date.parse(iso) : NaN;
    valor = Number.isNaN(ms) ? undefined : ms;
  } catch {
    valor = undefined;
  }
  cacheDoIntervalo.set(chave, valor);
  return valor;
}

/**
 * Quando a página deste tópico mudou pela última vez.
 *
 * É o MAIS RECENTE entre o artigo e a entrada do tópico no `roadmap.ts` —
 * porque a página é as duas coisas, e o selo "Atualizado em" é uma afirmação
 * sobre a página inteira.
 *
 * A regra anterior era `mdx ?? roadmap.ts`, e tinha dois furos que num campo
 * invisível (`lastmod`) dava para tolerar e num selo visível não dá:
 *
 *   · tópico COM artigo ignorava o `roadmap.ts`, então mexer no título, no
 *     nível, no tempo de leitura, no vídeo, nos problemas ou nas referências
 *     não movia a data. Medido: 7 dos 36 tópicos mostravam data velha por isso;
 *   · tópico SEM artigo herdava o último commit do arquivo INTEIRO, então
 *     editar um tópico avançava a data de todos os outros.
 *
 * O intervalo de linhas fecha os dois: ele é daquele tópico e de mais ninguém.
 * E ele NÃO recria o problema que o `??` evitava — o comentário antigo temia
 * que o `max(...)` com o `roadmap.ts` desse a mesma data a todos, e daria
 * mesmo, se fosse o arquivo inteiro. Com o intervalo, editar um tópico move só
 * a data dele.
 *
 * O `??` sobrevive como plano B, para o tópico cujo intervalo não validou.
 */
export function atualizacaoDoTopico(slug: string): Date | undefined {
  const doArtigo = ultimaAlteracao(`content/topics/${slug}.mdx`);
  const intervalo = intervalosDosTopicos().get(slug);
  const doIntervalo = intervalo ? commitDoIntervalo(intervalo[0], intervalo[1]) : undefined;
  if (doIntervalo === undefined) {
    return doArtigo ?? ultimaAlteracao(ARQUIVO_DO_ROADMAP);
  }
  return new Date(Math.max(doIntervalo, doArtigo?.getTime() ?? 0));
}

/**
 * Acima desta fatia, o carimbo mais repetido denuncia histórico achatado.
 *
 * Margens medidas: 13,3% neste repositório com histórico de verdade, 92,9% no
 * job achatado, 100% no git que resolve uma data só para tudo. O corte fica
 * longe dos três.
 */
export const LIMITE_DE_CONCENTRACAO = 0.5;

/**
 * A regra, pura e sem tocar no git: estes carimbos distinguem os caminhos de
 * onde saíram, ou são o mesmo commit repetido?
 *
 * Exportada para o teste conferir a MESMA regra em vez de recriá-la — foi
 * recriando que este guarda errou duas vezes, e foi mantendo duas versões dela
 * que o teste reprovou 37 URLs corretas.
 *
 * `undefined` (caminho que nunca existiu no histórico) não conta nem a favor
 * nem contra: ele não é evidência de achatamento, é ausência de dado.
 */
export function datasDistinguemCaminhos(carimbos: readonly (number | undefined)[]): boolean {
  const porCarimbo = new Map<number, number>();
  for (const c of carimbos) if (c !== undefined) porCarimbo.set(c, (porCarimbo.get(c) ?? 0) + 1);
  const resolvidos = [...porCarimbo.values()].reduce((a, b) => a + b, 0);
  if (resolvidos === 0) return false;
  return Math.max(...porCarimbo.values()) / resolvidos <= LIMITE_DE_CONCENTRACAO;
}

/**
 * TODOS os caminhos de que o site tira data — as rotas fixas e os artigos.
 *
 * É este conjunto, e nenhum recorte dele, que o guarda mede. O recorte era um
 * defeito de verdade: a página de tópico media só os artigos e o sitemap media
 * rotas fixas mais tópicos, então num build onde as rotas fixas resolvessem
 * para o HEAD e os artigos para a fronteira do raso, as duas respostas
 * divergiriam — as páginas escondendo a data e o sitemap publicando o
 * `lastmod`. O invariante que este PR anuncia (página e sitemap contam a mesma
 * história) dependia de as duas perguntas serem uma só.
 */
export function caminhosDatados(): string[] {
  return [
    ...Object.values(CONTEUDO_DA_ROTA).flat(),
    ...ALL_TOPICS.filter((t) => !isEmptyTopic(t)).map((t) => `content/topics/${t.slug}.mdx`),
  ];
}

/** A decisão, uma vez por build. `undefined` = ainda não perguntei. */
let enxerga: boolean | undefined;

/**
 * UMA decisão de validade, com cache, para os dois consumidores.
 *
 * Enquanto ela for falsa, nem o `lastmod` nem o `dateModified` saem — o site
 * inteiro fica sem data, que é o comportamento certo: data errada é pior do
 * que data nenhuma, e meia data é o site se contradizendo sobre o mesmo fato.
 */
export function oGitEnxergaOHistorico(): boolean {
  if (enxerga === undefined) enxerga = datasDistinguemCaminhos(caminhosDatados().map(commitDoArquivo));
  return enxerga;
}

/**
 * Devolve as entradas sem `lastModified` quando o `git log` deste build não
 * distingue um caminho do outro.
 *
 * Repare que ele NÃO julga as entradas que recebe: quem decide é
 * {@link oGitEnxergaOHistorico}, sobre o conjunto canônico de caminhos. Julgar
 * o próprio argumento era o defeito — cada consumidor passava um conjunto
 * diferente e podia chegar a uma resposta diferente.
 */
export function comDataUtil<T extends { lastModified?: Date }>(entradas: T[]): T[] {
  if (oGitEnxergaOHistorico()) return entradas;
  return entradas.map(({ lastModified: _, ...resto }) => resto as T);
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
  if (!oGitEnxergaOHistorico()) return undefined;
  const atualizado = atualizacaoDoTopico(slug);
  if (!atualizado) return undefined;
  const publicado = primeiroCommitDoArquivo(`content/topics/${slug}.mdx`);
  return publicado === undefined
    ? { atualizado }
    : { publicado: new Date(publicado), atualizado };
}
