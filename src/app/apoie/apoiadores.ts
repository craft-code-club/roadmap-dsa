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
//   APOIASE_CAMPAIGN  id da campanha
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
 * Encurta os nomes e tira os repetidos, preservando a ordem de chegada.
 *
 * A ORDEM DAS DUAS OPERAÇÕES É O PONTO. Encurtar DEPOIS de deduplicar deixaria
 * passar "Wilson Neto" e "Wilson Gomes Neto" como duas pessoas, que é justamente
 * o par que o muro precisa juntar quando o nome do painel for mais completo que
 * o daqui. Deduplicar sobre o nome JÁ encurtado é o que faz os dois virarem uma
 * chave só.
 */
function normalizeSupporters(list: Supporter[]): Supporter[] {
  const seen = new Set<string>();
  const out: Supporter[] = [];
  for (const s of list) {
    const name = shortenName(s.name);
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
function backersUrl(campaign?: string): string {
  const url = new URL("/backers", API_BASE);
  if (campaign) url.searchParams.set("campaign", campaign);
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

// A resposta da listagem não está documentada, então lemos o nome de forma
// defensiva, tentando as chaves mais prováveis.
function pickName(b: Raw): string | null {
  const direct = [b.name, b.nome, b.backer_name, b.supporter_name, b.apoiador].find(
    (v): v is string => typeof v === "string" && v.trim().length > 0
  );
  const s = (direct ?? nestedName(b.user) ?? nestedName(b.backer) ?? "").trim();
  return s.length ? s : null;
}

// Timestamp do apoio, para ordenar do mais recente para o mais antigo. Sem data,
// vira 0 e preserva a ordem que a API já devolveu.
function pickTime(b: Raw): number {
  const raw = [
    b.status_changed_at,
    b.statusChangedAt,
    b.created_at,
    b.createdAt,
    b.subscribed_at,
    b.first_support_at,
    b.date,
    b.updated_at,
  ].find((v) => typeof v === "string" || typeof v === "number");
  if (raw === undefined) return 0;
  const t = Date.parse(String(raw));
  return Number.isNaN(t) ? 0 : t;
}

// Sem status, assume ativo. Com status, descarta apoios claramente encerrados.
function isActive(b: Raw): boolean {
  const raw = [b.status, b.status_atual, b.support_status].find((v) => typeof v === "string");
  const status = typeof raw === "string" ? raw.toLowerCase() : "";
  if (!status) return true;
  return !/cancel|inativ|inactive|expir|encerrad|refund|falh|failed/.test(status);
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
 * Só o NOME sai daqui, e isso é uma decisão de privacidade, não um detalhe de
 * tipo. A resposta da APOIA.se pode trazer e-mail, valor apoiado e data: nada
 * disso pode chegar ao HTML, que é público e fica indexado. `Supporter` tem um
 * campo só justamente para não haver caminho por onde o resto passe.
 */
function toSupporters(raw: Raw[]): Supporter[] {
  return raw
    .filter(isActive)
    .map((b) => ({ name: pickName(b), t: pickTime(b) }))
    .filter((b): b is { name: string; t: number } => b.name !== null)
    .sort((a, b) => b.t - a.t) // mais recente primeiro
    .map((b) => ({ name: b.name }));
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

  const url = backersUrl(campaign);
  try {
    const res = await fetch(url, {
      headers: apoiaseHeaders(key, secret),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      // A URL entra no aviso, o header nunca: é o que separa um log útil de um
      // log que publica a credencial no console da CI.
      console.warn(
        `[apoia.se] ${res.status} em ${url}. A rota de listagem ainda não foi confirmada com o ` +
          `suporte da APOIA.se (a doc v0.1 só tem /backers/charges/<email>). Muro no plano B.`
      );
      return normalizeSupporters(FALLBACK_SUPPORTERS);
    }

    const raw = toList(await res.json());
    const muro = normalizeSupporters(toSupporters(raw));

    if (raw.length > 0 && muro.length === 0) {
      console.warn(
        `[apoia.se] ${raw.length} apoios recebidos e nenhum nome reconhecido. O formato da resposta ` +
          `não é o esperado: ajuste pickName().`
      );
    }
    if (muro.length === 0) {
      console.warn("[apoia.se] a API não devolveu nome nenhum. Muro no plano B.");
      return normalizeSupporters(FALLBACK_SUPPORTERS);
    }

    console.log(`[apoia.se] ${raw.length} apoios recebidos, ${muro.length} nomes no muro.`);
    return muro;
  } catch (err) {
    console.warn(`[apoia.se] falha ao buscar apoiadores em ${url}. Muro no plano B.`, err);
    return normalizeSupporters(FALLBACK_SUPPORTERS);
  }
}
