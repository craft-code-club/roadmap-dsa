// Apoiadores (pessoas) e Parceiros (empresas) da comunidade.
//
// PARCEIROS são mantidos à mão nesta lista (poucos, empresas).
//
// APOIADORES: a página /apoie tenta a API da APOIA.se durante o `next build` e,
// se não conseguir, cai na lista FALLBACK_SUPPORTERS aqui de baixo. A chamada
// roda no servidor, na máquina que constrói o site; o navegador recebe só os
// nomes já prontos no HTML. Quem prova que a credencial não escapa junto é
// `tests/segredo-nao-vai-para-o-cliente.spec.ts`, que varre os 1.242 arquivos
// do `out/`.
//
// CREDENCIAL (env local e secret no GitHub), os três nomes:
//   APOIASE_KEY       vai no header `x-api-key`
//   APOIASE_SECRET    vai no header `Authorization: Bearer <...>` (é um JWT)
//   APOIASE_CAMPAIGN  id da campanha, um ObjectId do Mongo (24 hex), não um
//                     número: quem tratar isso como inteiro erra em silêncio
//
// O par chave/segredo é o da API PÚBLICA da APOIA.se, documentada em
// https://apoiase.notion.site/APOIA-se-API-4b87651821884061a7532abfd7f26087
// (v0.1). O formato dos dois headers acima está copiado de lá, literalmente.
//
// ⚠️ LIMITE CONHECIDO, E É O NÓ DESTA PÁGINA. A doc v0.1 descreve UMA rota só,
// `GET /backers/charges/<email>`, que responde `{isBacker, isPaidThisMonth,
// thisMonthPaidValue}` para UM e-mail por vez. Ela não devolve nome, não devolve
// lista, e o site não tem (nem quer ter) os e-mails dos apoiadores. Ou seja: a
// rota de LISTAGEM que esta página precisa não está documentada. O que está
// abaixo isola essa incerteza numa função só, `backersUrl()`, e degrada com
// elegância enquanto ela não for confirmada com o suporte da APOIA.se.
//
// MEDIDO NA CI, com a credencial de verdade (PR #96): o `/backers` daqui devolve
// **404**. Sem credencial nenhuma, o mesmo host devolve **403** em QUALQUER
// caminho, inclusive nos que não existem (é AWS API Gateway barrando antes de
// rotear). A diferença entre os dois códigos é o sinal: 404 quer dizer que a
// chave passou pelo portão e que o caminho é que não existe. A credencial está
// certa; a rota de listagem é que não existe mesmo.
//
// DE ONDE VEIO O FORMATO DOS CAMPOS LIDOS AQUI EMBAIXO
//
// Do bundle de produção do PAINEL DO CRIADOR (`dashboard.apoia.se`), que consome
// uma API interna, `dashboard-api-v1.apoia.se`, com três rotas de relatório:
//
//     GET /api/reports/backers/total/<CAMPAIGN_ID>    -> { total, totalPages }
//     GET /api/reports/backers/<CAMPAIGN_ID>?page=N   -> { backers, campaignRewards }
//     GET /api/reports/backers/csv/<CAMPAIGN_ID>      -> CSV
//
// Autenticação lá é só `Authorization: Bearer`, SEM `x-api-key`: é um esquema
// diferente do da API pública, não a mesma credencial com outra URL.
//
// Cada apoiador vem com `name`, `email`, `supportValue`, `supportStatus`,
// `supportActive`, `supportPrivate`, `firstSupportDate`, `supportLastModified`,
// `paymentMethod`, `rewardChosen`, `addressDelivery` e `timesSupportCreation`.
// É esse contrato que `pickTime`, `isActive` e `isPublic` leem. Antes disto o
// código procurava `created_at`, `first_support_at` e `support_status`, que não
// existem: a ordenação era um no-op e o filtro de status nunca casava.
//
// ⚠️ ESSA ROTA INTERNA NÃO ESTÁ LIGADA, DE PROPÓSITO. `backersUrl()` continua
// apontando para a API pública. Usar API interna e não documentada de terceiro é
// decisão do dono do projeto (termos de uso, estabilidade, token de sessão que
// expira e precisa de renovação manual), e ela ainda não foi tomada. O que este
// arquivo faz é chegar com o parsing e a proteção de privacidade CERTOS antes de
// qualquer fio ser ligado: no dia da decisão, muda a URL e mais nada.
//
// POR QUE A PÁGINA MOSTRAVA 3 COM 5 APOIOS NA CAMPANHA
//
// Não era cache, nem paginação, nem filtro de status: a versão anterior deste
// arquivo lia `APOIASE_TOKEN` e `APOIASE_CAMPAIGN_ID`, e NENHUM DOS DOIS existia
// como secret do repositório (`gh secret list` trazia só os quatro do
// Cloudflare). O build caía no primeiro `return` e renderizava a lista escrita à
// mão, que tinha exatamente três nomes. E caía CALADO: aquele `return` era o
// único caminho de saída sem um aviso, então nada no log do build denunciava que
// a integração nunca tinha rodado. Agora ele avisa como todos os outros.

export type Supporter = { name: string };
export type Partner = { name: string; url?: string };

export const PARTNERS: Partner[] = [
  // { name: "Empresa X", url: "https://empresa.com" },
];

/**
 * Plano B do muro, do apoio mais recente para o mais antigo.
 *
 * PLANO B, e não "lista manual que se soma à API": a diferença é o defeito que
 * esta versão conserta. Antes estes nomes eram sempre colados na FRENTE do que a
 * API devolvesse, e isso cobrava dois preços. A ordem por recência ia embora
 * (três nomes fixos na frente de todo mundo), e o "sem repetir nome" dependia da
 * grafia bater caractere a caractere com a do painel: "Wilson Neto" aqui contra
 * "Wilson Gomes Neto" lá são duas chaves diferentes, e a mesma pessoa apareceria
 * em dois cards. Agora a API, quando responde, é a fonte; esta lista entra
 * quando ela não responde, e nunca junto.
 *
 * "NÃO RESPONDE" é literal: sem credencial, HTTP não-ok, rede, timeout ou
 * formato ilegível. Uma resposta que chegou e devolveu zero nomes NÃO é este
 * caso, é uma resposta válida cujo conteúdo é "ninguém autorizou aparecer", e
 * ela vale. Confundir as duas coisas anula o filtro de privacidade.
 */
const FALLBACK_SUPPORTERS: Supporter[] = [
  { name: "Cristiano Cunha" },
  { name: "Wilson Neto" },
  { name: "Eduarda Martins" },
];

// Partículas de nome ("Maria da Silva") não são nome: nem contam para decidir se
// o nome é comprido, nem valem como inicial da sigla.
const NAME_PARTICLES = new Set([
  "de", "da", "do", "das", "dos", "e", "di", "du", "del", "della", "la", "van", "von",
]);

/** Índices das palavras que são nome de verdade (partícula não conta). */
function realNameIndexes(parts: string[]): number[] {
  const out: number[] = [];
  parts.forEach((p, i) => {
    if (!NAME_PARTICLES.has(p.toLowerCase())) out.push(i);
  });
  return out;
}

/**
 * O nome como ele aparece no card: primeiro e último, e só.
 *
 * "Maria Aparecida da Silva Souza" vira "Maria Souza". O muro tem cards
 * estreitos (dois por linha a 390px) e nome de quatro palavras quebrava em três
 * linhas, desalinhando a fileira inteira.
 *
 * Três regras que não são óbvias, e cada uma existe por um caso concreto:
 *
 * · PARTÍCULA NÃO É NOME. "João da Silva" tem DOIS nomes, não três, e sai
 *   inteiro. Contar "da" como palavra faria o corte disparar em quem já cabia,
 *   e devolveria "João Silva" sem necessidade nenhuma.
 * · A PARTÍCULA COLADA NO SOBRENOME VAI JUNTO. "Maria Aparecida da Silva" vira
 *   "Maria da Silva", não "Maria Silva". O corte é para caber no card, não para
 *   reescrever o nome de ninguém, e "da Silva" é o sobrenome da pessoa.
 * · ESPAÇO NÃO É SEPARADOR CONFIÁVEL. Nome digitado à mão vem com espaço duplo e
 *   espaço nas pontas; `split(/\s+/)` depois do `trim()` resolve os dois, e o
 *   `\s` do JavaScript já cobre o espaço não separável que vem de formulário.
 *
 * Nome de uma palavra só e nome que é só partícula voltam como estão, apenas com
 * o espaçamento normalizado: melhor um nome estranho do que um nome destruído.
 */
export function shortenName(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => p.length > 0);
  if (parts.length === 0) return "";

  const reais = realNameIndexes(parts);
  // Dois nomes ou menos: não há o que cortar, e mexer só estragaria.
  if (reais.length <= 2) return parts.join(" ");

  const primeiro = reais[0];
  const ultimo = reais[reais.length - 1];

  // Anda para trás sobre as partículas coladas no sobrenome ("da Silva"), sem
  // nunca passar por cima do primeiro nome.
  let inicioDoSobrenome = ultimo;
  while (
    inicioDoSobrenome - 1 > primeiro &&
    NAME_PARTICLES.has(parts[inicioDoSobrenome - 1].toLowerCase())
  ) {
    inicioDoSobrenome--;
  }

  return [parts[primeiro], ...parts.slice(inicioDoSobrenome, ultimo + 1)].join(" ");
}

/**
 * Sigla do avatar do card: "Cristiano Cunha" vira "CC", "Ana" vira "A".
 * Espalha (`[...]`) em vez de indexar para não cortar caractere fora do BMP.
 */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => p.length > 0);
  const reais = realNameIndexes(parts);
  if (reais.length === 0) return "?";
  const first = [...parts[reais[0]]][0] ?? "";
  const last = reais.length > 1 ? ([...parts[reais[reais.length - 1]]][0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * Tira os repetidos preservando a ordem de chegada, pelo nome COMPLETO.
 *
 * ⚠️ NÃO deduplique pelo nome encurtado, por mais tentador que pareça juntar
 * "Wilson Neto" com "Wilson Gomes Neto". Encurtar antes de comparar apaga
 * gente: "Maria Aparecida Silva" e "Maria Beatriz Silva" são duas pessoas e
 * viram a mesma chave "Maria Silva", então uma delas some do muro E da contagem
 * do painel de gratidão, que sai da mesma lista. Perder um apoiador é bem pior
 * que mostrar a mesma pessoa duas vezes.
 *
 * O encurtamento é de APRESENTAÇÃO e acontece na página (`shortenName` no
 * `page.tsx`); aqui em baixo o dado guarda a identidade que a API deu.
 *
 * A chave normaliza espaço e caixa porque "  maria   souza " e "Maria Souza"
 * são a mesma inscrição digitada duas vezes, e isso é repetição de verdade.
 */
export function normalizeSupporters(list: Supporter[]): Supporter[] {
  const seen = new Set<string>();
  const out: Supporter[] = [];
  for (const s of list) {
    const name = s.name.trim().replace(/\s+/g, " ");
    const key = name.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ name });
  }
  return out;
}

// ---------------------------------------------------------------------------
// A API da APOIA.se
// ---------------------------------------------------------------------------

const API_BASE = "https://api.apoia.se";

/**
 * Os dois headers de autenticação, exatamente como a doc v0.1 os escreve.
 *
 * Esta é a parte CONFIRMADA da integração, e por isso está numa função pura,
 * exportada e coberta por teste: dá para provar que o header é montado certo sem
 * rede, sem credencial e sem depender de a rota de listagem existir.
 *
 * Não são intercambiáveis: `x-api-key` leva a CHAVE e o `Authorization` leva o
 * SEGREDO. Trocar os dois de lugar devolve 401, e é um erro que só aparece em
 * produção, porque o build local não tem credencial nenhuma.
 */
export function apoiaseHeaders(key: string, secret: string): Record<string, string> {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-api-key": key,
    Authorization: `Bearer ${secret}`,
  };
}

/**
 * ⚠️ A ÚNICA PARTE CHUTADA DESTE ARQUIVO, e está isolada aqui de propósito.
 *
 * A doc v0.1 não tem rota de listagem (ver o cabeçalho do arquivo). Procurei em:
 * a doc oficial no Notion, o artigo "API Pública da APOIA.se" da Central de
 * Suporte, e integrações de terceiros no GitHub (`SouJunior/stars-api`,
 * `vjpixel/diaria-studio`) — as três só conhecem `/backers/charges/<email>`.
 *
 * O caminho abaixo é a hipótese mais provável dentro da família `/backers/`, com
 * a campanha na query porque a doc diz que a chave já é "a chave correspondente
 * a sua campanha" (ou seja, a campanha pode ser implícita na credencial). Se
 * estiver errado, o build recebe 403/404, avisa no log e o muro sai do plano B:
 * o site não quebra e ninguém vê erro.
 *
 * QUANDO O SUPORTE DA APOIA.se CONFIRMAR A ROTA, é esta função que muda, e só
 * ela.
 */
function backersUrl(campaign?: string, page = 1): string {
  const url = new URL("/backers", API_BASE);
  if (campaign) url.searchParams.set("campaign", campaign);
  url.searchParams.set("page", String(page));
  return url.toString();
}

type Raw = Record<string, unknown>;

function nestedName(v: unknown): string | undefined {
  if (v && typeof v === "object") {
    const n = (v as Raw).name ?? (v as Raw).nome;
    if (typeof n === "string") return n;
  }
  return undefined;
}

// O nome. O campo real do relatório é `name`; o resto é rede de segurança para
// formato diferente, e não custa nada manter.
function pickName(b: Raw): string | null {
  const direct = [b.name, b.nome, b.backer_name, b.supporter_name, b.apoiador].find(
    (v): v is string => typeof v === "string" && v.trim().length > 0
  );
  const s = (direct ?? nestedName(b.user) ?? nestedName(b.backer) ?? "").trim();
  return s.length ? s : null;
}

/**
 * Timestamp do apoio, para ordenar do mais recente para o mais antigo.
 *
 * ⚠️ OS CAMPOS SÃO camelCase, e isso já esteve errado aqui. A versão anterior
 * procurava `created_at`, `first_support_at` e `status_changed_at`, que NÃO
 * existem no relatório: os reais são `firstSupportDate` e `supportLastModified`.
 * Nenhuma chave casava, todo apoio virava 0, e o `.sort()` logo abaixo era um
 * no-op silencioso — a lista saía na ordem em que a API mandou e ninguém tinha
 * como perceber, porque ordem errada não quebra nada, só mente.
 *
 * `firstSupportDate` primeiro, de propósito: o muro conta desde quando a pessoa
 * apoia, não quando o registro dela foi mexido pela última vez.
 */
function pickTime(b: Raw): number {
  const raw = [
    b.firstSupportDate,
    b.supportLastModified,
    // Rede de segurança para outros formatos. Não são os campos do relatório.
    b.createdAt,
    b.created_at,
    b.date,
  ].find((v) => typeof v === "string" || typeof v === "number");
  if (raw === undefined) return 0;
  const t = Date.parse(String(raw));
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Os únicos valores de `supportStatus` que valem um card no muro.
 *
 * O vocabulário observado no relatório é `complete`, `blocked`, `locked`,
 * `incomplete` e `closed_campaign`, e só o primeiro é um apoio saudável.
 *
 * LISTA DE PERMISSÃO, e não de proibição: a versão anterior perguntava se o
 * status casava `/cancel|inativ|expir|.../`, e NENHUM dos quatro estados ruins
 * casa com isso. `blocked`, `locked` e `closed_campaign` passariam como ativos,
 * e `incomplete` passaria duas vezes (não casa a proibição e ainda contém a
 * palavra "complete", que pegaria uma comparação por substring). Por isso a
 * comparação é exata.
 */
const SUPPORT_STATUS_PUBLICAVEL = new Set(["complete"]);

/**
 * O apoio está ativo?
 *
 * Lê `supportStatus` (camelCase, o campo real) e `supportActive`. Sem nenhum dos
 * dois, assume ativo: quem não declara estado nenhum já não passa pelo filtro de
 * privacidade abaixo, que é o fail-closed de verdade.
 */
export function isActive(b: Raw): boolean {
  if (b.supportActive === false) return false;

  const raw = [b.supportStatus, b.status, b.support_status].find((v) => typeof v === "string");
  if (typeof raw !== "string") return true;
  return SUPPORT_STATUS_PUBLICAVEL.has(raw.trim().toLowerCase());
}

/**
 * Esta pessoa AUTORIZOU aparecer no muro?
 *
 * ⚠️ FAIL-CLOSED, e é a regra mais importante do arquivo. A APOIA.se deixa o
 * apoiador marcar o apoio como privado (`supportPrivate: true`), e o muro é uma
 * página pública e indexada. Publicar quem pediu para não aparecer não é bug de
 * dado, é incidente de privacidade, e não tem desfazer: sai no HTML, no payload
 * RSC e no cache do Google.
 *
 * Então a pergunta não é "é privado?", é "está explicitamente declarado como NÃO
 * privado?". Campo ausente, nulo, string, número ou qualquer coisa que não seja
 * o booleano `false` significa NÃO PUBLICA. O custo de errar para este lado é um
 * nome a menos no muro; para o outro lado, é publicar alguém contra a vontade
 * dela.
 *
 * Consequência esperada e desejada: uma resposta que não traga `supportPrivate`
 * esvazia o muro, com aviso no log. Ela NÃO cai no plano B, e essa distinção é a
 * outra metade da proteção: cair na lista fixa quando o filtro escondeu todo
 * mundo publicaria três nomes escritos à mão, entre eles, no pior caso, a pessoa
 * que acabou de marcar o apoio como privado. Muro vazio conserta em cinco
 * minutos; nome publicado indevidamente, não.
 */
export function isPublic(b: Raw): boolean {
  const declarado = [b.supportPrivate, b.support_private, b.isPrivate, b.private].find(
    (v) => v !== undefined
  );
  return declarado === false;
}

function toList(json: unknown): Raw[] {
  if (Array.isArray(json)) return json as Raw[];
  if (json && typeof json === "object") {
    const o = json as Raw;
    for (const key of ["backers", "data", "apoiadores", "results", "items"]) {
      if (Array.isArray(o[key])) return o[key] as Raw[];
    }
  }
  return [];
}

/**
 * Uma página da listagem: os apoiadores e quantas páginas existem ao todo.
 *
 * `totalPages` vem na própria resposta do relatório, o que dispensa a chamada
 * separada de contagem. Sem o campo, assume uma página só.
 */
export function readPage(json: unknown): { backers: Raw[]; totalPages: number } {
  const backers = toList(json);
  let totalPages = 1;
  if (json && typeof json === "object") {
    const t = (json as Raw).totalPages;
    if (typeof t === "number" && Number.isFinite(t) && t >= 1) totalPages = Math.floor(t);
  }
  return { backers, totalPages };
}

/**
 * Teto de páginas. Não é o limite da API, é o limite da nossa paciência: um
 * `totalPages` absurdo (ou um campo que mude de significado) não pode virar um
 * laço infinito segurando o build.
 */
const MAX_PAGES = 20;

/**
 * Junta todas as páginas, chamando `carregar` uma vez por página.
 *
 * A versão anterior fazia UMA requisição e pronto: com a campanha passando de
 * uma página, o muro mostraria só a primeira fatia e diria que aquilo era o
 * total. Silencioso de novo, porque uma lista curta parece uma lista.
 *
 * Recebe o carregador por parâmetro (em vez de chamar `fetch` aqui dentro) para
 * a concatenação poder ser exercitada sem rede.
 */
export async function collectAllPages(
  carregar: (page: number) => Promise<unknown>,
  maxPages: number = MAX_PAGES
): Promise<Raw[]> {
  const primeira = readPage(await carregar(1));
  const total = Math.min(primeira.totalPages, maxPages);
  if (primeira.totalPages > maxPages) {
    console.warn(
      `[apoia.se] a listagem diz ter ${primeira.totalPages} páginas e o teto é ${maxPages}. ` +
        `Lendo só as primeiras: o muro pode sair incompleto.`
    );
  }

  const todos = [...primeira.backers];
  for (let page = 2; page <= total; page++) {
    todos.push(...readPage(await carregar(page)).backers);
  }
  return todos;
}

/**
 * Da resposta crua para os nomes do muro.
 *
 * Só o NOME sai daqui, e isso é decisão de privacidade, não detalhe de tipo. O
 * relatório traz `email`, `supportValue`, `paymentMethod` e `addressDelivery`, e
 * nada disso pode chegar ao HTML, que é público e indexado. `Supporter` tem um
 * campo só justamente para não haver caminho por onde o resto passe.
 *
 * A ordem dos filtros é a ordem do risco: privacidade primeiro.
 */
export function toSupporters(raw: Raw[]): Supporter[] {
  return raw
    .filter(isPublic)
    .filter(isActive)
    .map((b) => ({ name: pickName(b), t: pickTime(b) }))
    .filter((b): b is { name: string; t: number } => b.name !== null)
    .sort((a, b) => b.t - a.t) // mais recente primeiro
    .map((b) => ({ name: b.name }));
}

/** Resposta HTTP não-ok, com o endereço e sem nada do cabeçalho. */
class RespostaHttp extends Error {
  constructor(
    readonly status: number,
    readonly url: string
  ) {
    super(`HTTP ${status}`);
    this.name = "RespostaHttp";
  }
}

export async function fetchSupporters(): Promise<Supporter[]> {
  const key = process.env.APOIASE_KEY;
  const secret = process.env.APOIASE_SECRET;
  const campaign = process.env.APOIASE_CAMPAIGN;

  if (!key || !secret) {
    // O aviso É o conserto de metade desta issue: sem ele, "a página mostra 3"
    // e "a integração nunca rodou" são indistinguíveis no log do build.
    console.warn(
      "[apoia.se] sem APOIASE_KEY e/ou APOIASE_SECRET no ambiente: o muro de apoiadores sai da " +
        "lista de plano B (src/app/apoie/apoiadores.ts). Cadastre os dois como secrets do repositório."
    );
    return normalizeSupporters(FALLBACK_SUPPORTERS);
  }

  const headers = apoiaseHeaders(key, secret);
  const carregar = async (page: number): Promise<unknown> => {
    const url = backersUrl(campaign, page);
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    // A URL entra no erro, o header nunca: é o que separa um log útil de um log
    // que publica a credencial no console da CI.
    if (!res.ok) throw new RespostaHttp(res.status, url);
    return res.json();
  };

  try {
    const raw = await collectAllPages(carregar);
    const muro = normalizeSupporters(toSupporters(raw));

    if (muro.length === 0) {
      // RESPOSTA VAZIA NÃO É FALHA, e por isso ela NÃO cai no plano B.
      //
      // Este `return` já devolveu a lista fixa aqui, e era a contradição do
      // arquivo: o filtro logo acima é fail-closed justamente para não publicar
      // quem pediu para não aparecer, e então, quando ele escondia todo mundo, o
      // plano B publicava três nomes escritos à mão. No pior caso ele publicaria
      // exatamente a pessoa que acabou de marcar o apoio como privado, porque
      // ela está nos dois lugares.
      //
      // A regra que resolve: uma resposta que a API entregou é a verdade, mesmo
      // quando a verdade é "ninguém autorizou". O plano B existe para quando não
      // houve resposta (sem credencial, HTTP não-ok, rede, timeout, formato), e
      // só para isso. Muro vazio é um estado legítimo, e a página já sabe
      // desenhá-lo: `page.tsx` mostra o convite "seja o primeiro".
      //
      // Os três números saem no log porque o conserto de cada motivo é
      // diferente, e o do meio é o que mais assusta sendo o comportamento certo.
      const publicos = raw.filter(isPublic).length;
      const ativos = raw.filter(isPublic).filter(isActive).length;
      console.warn(
        `[apoia.se] ${raw.length} apoios recebidos e nenhum nome no muro: ${publicos} autorizaram ` +
          `aparecer (supportPrivate: false), ${ativos} desses estão ativos. O muro fica vazio, e é ` +
          `o certo: a resposta da API vale, inclusive quando ela é "ninguém".`
      );
      return muro;
    }

    console.log(`[apoia.se] ${raw.length} apoios recebidos, ${muro.length} nomes no muro.`);
    return muro;
  } catch (err) {
    if (err instanceof RespostaHttp) {
      console.warn(
        `[apoia.se] ${err.status} em ${err.url}. A rota de listagem ainda não foi confirmada com o ` +
          `suporte da APOIA.se (a doc v0.1 só tem /backers/charges/<email>). Muro no plano B.`
      );
      return normalizeSupporters(FALLBACK_SUPPORTERS);
    }
    console.warn("[apoia.se] falha ao buscar apoiadores. Muro no plano B.", err);
    return normalizeSupporters(FALLBACK_SUPPORTERS);
  }
}
