import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ALL_TOPICS, isEmptyTopic } from "../content/roadmap";
import { LINKS, SITE_URL } from "../src/lib/links";
import { CONTEUDO_DA_ROTA } from "../src/app/sitemap";

// Estrutura de SEO do site inteiro: canonical, sitemap e dados estruturados.
//
// Por que este arquivo existe separado do `seo.spec.ts`: aquele protege o card
// social das TRÊS páginas de entrada, e faz isso a partir de uma lista escrita à
// mão (`ROTAS`). Uma lista à mão só cobre o que alguém lembrou de escrever nela,
// e foi exatamente assim que 48 das 51 rotas ficaram sem canonical enquanto a
// suíte seguia verde — ela chegava a VISITAR `/topico/big-o/` e `/apoie/` para
// conferir `og:locale`, e nunca olhava o canonical.
//
// Daí as duas regras deste arquivo:
//
//   1. a lista de rotas vem de `ALL_TOPICS`, a fonte de dados. Tópico novo entra
//      na cobertura sozinho, no mesmo commit que o cria;
//   2. o JSON-LD é lido com `JSON.parse` e conferido CAMPO POR NOME. Contar
//      `<script>` não prova nada: este repositório já teve suíte verde sobre um
//      visualizador sem um único botão renderizado, porque o teste contava
//      elemento em vez de verificar comportamento.
//
// A varredura lê o `out/` direto do disco em vez de navegar rota por rota. Não é
// atalho: canonical, sitemap e JSON-LD são artefatos de build, e o cruzamento do
// item 3 (URL do sitemap contra o `robots` do HTML de destino) SÓ existe com os
// dois artefatos abertos lado a lado. O `webServer` serve esse mesmo diretório.

const OUT = path.join(process.cwd(), "out");

const ROTAS_FIXAS = ["/", "/introducao/", "/roadmap/", "/apoie/"] as const;
const ROTAS_TOPICO = ALL_TOPICS.map((t) => `/topico/${t.slug}/`);
const TODAS_AS_ROTAS = [...ROTAS_FIXAS, ...ROTAS_TOPICO];

// Rotas que o site quer no índice do Google: as fixas mais os tópicos que têm
// material. É a MESMA função `isEmptyTopic` que a página usa para decidir o
// `noindex` — dois predicados para a mesma decisão é como o buraco do sitemap
// nasceu, e recriar a condição aqui recriaria o buraco dentro do teste.
const ROTAS_INDEXAVEIS = [
  ...ROTAS_FIXAS,
  ...ALL_TOPICS.filter((t) => !isEmptyTopic(t)).map((t) => `/topico/${t.slug}/`),
];

function arquivoDaRota(rota: string): string {
  return path.join(OUT, rota.replace(/^\//, ""), "index.html");
}

function html(rota: string): string {
  const f = arquivoDaRota(rota);
  if (!existsSync(f)) throw new Error(`build sem a rota ${rota} (${f})`);
  return readFileSync(f, "utf8");
}

function atributo(tag: string, nome: string): string | null {
  const m = tag.match(new RegExp(`${nome}="([^"]*)"`));
  return m ? m[1] : null;
}

function canonical(doc: string): string | null {
  const m = doc.match(/<link[^>]*rel="canonical"[^>]*>/);
  return m ? atributo(m[0], "href") : null;
}

function metaProp(doc: string, prop: string): string | null {
  const m = doc.match(new RegExp(`<meta[^>]*property="${prop}"[^>]*>`));
  return m ? atributo(m[0], "content") : null;
}

function ehNoindex(doc: string): boolean {
  const m = doc.match(/<meta[^>]*name="robots"[^>]*>/);
  return !!m && (atributo(m[0], "content") ?? "").includes("noindex");
}

type No = Record<string, unknown>;

/** Todos os nós JSON-LD de uma rota, já parseados e com os arrays achatados. */
function jsonLd(rota: string): No[] {
  const doc = html(rota);
  const nos: No[] = [];
  const re = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(doc)) !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(m[1]);
    } catch (e) {
      throw new Error(`${rota}: JSON-LD inválido (${(e as Error).message}): ${m[1].slice(0, 120)}`);
    }
    for (const no of Array.isArray(parsed) ? parsed : [parsed]) nos.push(no as No);
  }
  return nos;
}

function doTipo(nos: No[], tipo: string): No | undefined {
  return nos.find((n) => {
    const t = n["@type"];
    return t === tipo || (Array.isArray(t) && t.includes(tipo));
  });
}

const urlAbsoluta = (rota: string) => `${SITE_URL}${rota}`;

// ---------------------------------------------------------------------------
// 1. Toda rota declara a própria URL
// ---------------------------------------------------------------------------

test("toda rota declara a própria URL em canonical e og:url", () => {
  const sem: string[] = [];
  for (const rota of TODAS_AS_ROTAS) {
    const doc = html(rota);
    const esperado = urlAbsoluta(rota);
    const c = canonical(doc);
    const og = metaProp(doc, "og:url");
    if (c !== esperado || og !== esperado) sem.push(`${rota} → canonical=${c} og:url=${og}`);
  }
  expect(
    sem,
    `${sem.length} de ${TODAS_AS_ROTAS.length} rotas não declaram a própria URL`
  ).toEqual([]);
});

test("canonical e og:url saem com a barra final do trailingSlash", () => {
  // `trailingSlash: true` no `next.config.ts`: canonical sem a barra aponta para
  // uma URL que responde 308, e o Google segue tratando as duas como candidatas.
  const errados: string[] = [];
  for (const rota of TODAS_AS_ROTAS) {
    const doc = html(rota);
    for (const [nome, valor] of [
      ["canonical", canonical(doc)],
      ["og:url", metaProp(doc, "og:url")],
    ] as const) {
      if (valor !== null && !valor.endsWith("/")) errados.push(`${rota} → ${nome}=${valor}`);
    }
  }
  expect(errados, "URL declarada sem a barra final").toEqual([]);
});

test("nenhuma página de tópico usa o card de compartilhamento de outra rota", () => {
  // O defeito: as 47 páginas de tópico compartilhavam UMA imagem, a da raiz, e
  // quem compartilhava Dijkstra no LinkedIn entregava um card que não fala de
  // Dijkstra. Este teste enuncia o defeito de duas formas, e as duas continuam
  // verdadeiras com ou sem o `opengraph-image.tsx` do segmento no lugar:
  //
  //   a) nenhuma dessas páginas aponta para o card da RAIZ, que é o card do site;
  //   b) duas páginas de tópico nunca compartilham a mesma imagem.
  //
  // É (b) que reprova se alguém devolver o `ogImage: "raiz"` ao
  // `generateMetadata` do tópico: as 47 voltam a apontar para a mesma URL, e o
  // `Received` mostra justamente a URL da raiz que este PR tirou dali.
  //
  // O `og:image` do tópico chega pelo arquivo do segmento (PR do card por
  // tópico). Enquanto ele não estiver na `main`, estas páginas ficam SEM card e
  // as duas afirmações seguem valendo — o que este teste nunca aceita é a volta
  // do card compartilhado.
  const cards = new Map<string, string[]>();
  const daRaiz: string[] = [];
  for (const t of ALL_TOPICS) {
    const rota = `/topico/${t.slug}/`;
    const img = metaProp(html(rota), "og:image");
    if (img === null) continue;
    if (new URL(img).pathname === "/opengraph-image") daRaiz.push(rota);
    cards.set(img, [...(cards.get(img) ?? []), rota]);
  }
  expect(
    daRaiz,
    `${daRaiz.length} páginas de tópico usam o card da raiz em vez do próprio`
  ).toEqual([]);
  const repetidos = [...cards.entries()].filter(([, rotas]) => rotas.length > 1);
  expect(
    repetidos.map(([img, rotas]) => `${img} em ${rotas.length} rotas`),
    "páginas de tópico dividindo o mesmo card"
  ).toEqual([]);
});

test("o card de um tópico, quando existe, é gerado no segmento dele", () => {
  // A outra ponta de (a): não basta não ser o da raiz, tem que ser o DAQUELE
  // tópico. Fica vazio enquanto o card por tópico não estiver na `main`, e é
  // esse vazio que mede a dependência entre os dois PRs — se este teste
  // continuar sem nada para conferir depois do merge dos dois, o card por
  // tópico entrou inerte.
  const errados: string[] = [];
  let comCard = 0;
  for (const t of ALL_TOPICS) {
    const rota = `/topico/${t.slug}/`;
    const img = metaProp(html(rota), "og:image");
    if (img === null) continue;
    comCard += 1;
    if (!new URL(img).pathname.startsWith(`/topico/${t.slug}/`)) errados.push(`${rota} → ${img}`);
  }
  expect(errados, "card apontando para um segmento que não é o do tópico").toEqual([]);
  expect(
    [comCard, ALL_TOPICS.length],
    "quantos tópicos declaram card: 0 = o PR do card por tópico ainda não entrou; " +
      `${ALL_TOPICS.length} = entrou e está valendo. Qualquer valor no meio é defeito.`
  ).toEqual(comCard === 0 ? [0, ALL_TOPICS.length] : [ALL_TOPICS.length, ALL_TOPICS.length]);
});

// ---------------------------------------------------------------------------
// 2. O sitemap não convida o Google para o que ele mesmo manda ignorar
// ---------------------------------------------------------------------------

function sitemap(): string {
  return readFileSync(path.join(OUT, "sitemap.xml"), "utf8");
}

function urlsDoSitemap(): string[] {
  return [...sitemap().matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

test("nenhuma URL do sitemap aponta para HTML noindex", () => {
  const contraditorias: string[] = [];
  for (const url of urlsDoSitemap()) {
    const rota = url.replace(SITE_URL, "");
    if (ehNoindex(html(rota))) contraditorias.push(rota);
  }
  expect(
    contraditorias,
    `${contraditorias.length} URLs do sitemap apontam para páginas com noindex ` +
      `(cada uma vira um erro permanente no Search Console)`
  ).toEqual([]);
});

test("o sitemap lista exatamente as rotas indexáveis, nem mais nem menos", () => {
  const doSitemap = urlsDoSitemap().sort();
  const esperadas = ROTAS_INDEXAVEIS.map(urlAbsoluta).sort();
  expect(doSitemap).toEqual(esperadas);
});

// Um `git log` por caminho, e não por consulta: o teste pergunta a mesma data
// até três vezes por rota (o guarda de capacidade, o `?` do fallback e a
// agregação), e cada processo novo custa ~29ms.
const cacheDoGit = new Map<string, string>();

function dataDoGit(arquivo: string): string {
  const emCache = cacheDoGit.get(arquivo);
  if (emCache !== undefined) return emCache;
  const iso = execFileSync("git", ["log", "-1", "--format=%cI", "--", arquivo], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
  cacheDoGit.set(arquivo, iso);
  return iso;
}

/** A data esperada de uma rota: o mais recente dos arquivos que a alimentam. */
function dataEsperada(arquivos: readonly string[]): number | undefined {
  const ms = arquivos
    .map((a) => Date.parse(dataDoGit(a)))
    .filter((n) => !Number.isNaN(n));
  return ms.length ? Math.max(...ms) : undefined;
}

// O mapa das rotas fixas vem do PRÓPRIO `sitemap.ts`, importado. Com isso o
// teste cobre a AGREGAÇÃO (a data da rota é a mais recente entre os arquivos
// declarados) e não a declaração — se alguém esquecer de listar um arquivo de
// conteúdo, os dois lados erram juntos e este teste passa. Essa parte é revisão
// humana, e o comentário existe para não prometer mais do que o teste entrega.

test("o lastmod do sitemap vem do Git, ou não existe", () => {
  const xml = sitemap();
  const blocos = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
  const lastmods = blocos.map((b) => b.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]);

  // Este teste NÃO tenta descobrir se o clone é raso, e não usa o próprio git
  // para julgar se o campo DEVIA existir. Já tentou das duas formas, e as duas
  // reprovaram um sitemap correto:
  //
  //   1. `git rev-parse --is-shallow-repository` e 2. o arquivo `.git/shallow`
  //      dizem "raso" na CI mesmo com `fetch-depth: 0` — o `actions/checkout`
  //      deixa o marcador para trás.
  //   3. medir a capacidade do git DESTE processo também não serve, e é o
  //      achado que fechou a investigação: no mesmo job, o processo do build
  //      resolveu 17 datas distintas e corretas, e o processo do teste, no passo
  //      seguinte, resolveu UMA para os 41 caminhos. Quem enxerga o histórico é
  //      o build; este processo, ali, não enxerga. Cobrar a ausência do campo
  //      com base no que EU vejo é acusar o build de um limite que é meu.
  //
  // Então a divisão é esta: as invariantes do ARTEFATO valem em qualquer
  // ambiente e são conferidas sempre; a conferência contra o Git só acontece
  // onde o git deste processo demonstra que enxerga o histórico, e quando não
  // enxerga o teste diz isso em voz alta em vez de reprovar.
  const presentes = lastmods.filter((d): d is string => !!d);

  expect(
    presentes.length === 0 || presentes.length === lastmods.length,
    `sitemap pela metade: ${presentes.length} de ${lastmods.length} URLs com lastmod`
  ).toBe(true);
  for (const d of presentes) {
    expect(Number.isNaN(Date.parse(d)), `${d} não é uma data`).toBe(false);
  }
  if (presentes.length) {
    // O guarda que sobrevive a qualquer ambiente, e o que de fato importa: 40
    // URLs com o MESMO carimbo são a data do último commit repetida 40 vezes,
    // que é o `lastmod` que o Google aprendeu a ignorar.
    expect(
      new Set(presentes).size,
      `as ${presentes.length} URLs saíram com o mesmo lastmod (${presentes[0]}), que é a data do último commit repetida`
    ).toBeGreaterThan(1);
    const agora = Date.now();
    const futuras = presentes.filter((d) => Date.parse(d) > agora);
    expect(futuras, "lastmod no futuro").toEqual([]);
  }

  // O artefato tem datas diferentes entre si; o git daqui consegue reproduzir
  // essa diferença? Se não, ele está achatando o histórico e não serve de
  // referência — conferir contra ele acusaria o build de um erro que é do
  // ambiente de medição.
  //
  // A pergunta NÃO é "quantas datas distintas ele resolve", e a diferença
  // custou uma CI vermelha inteira. Naquele job o git deste processo achatou 39
  // dos 42 caminhos na data do merge da base (16:43:05Z) e resolveu a data de
  // verdade para os TRÊS que o próprio PR tinha tocado, porque esses três estão
  // no lado do histórico que o processo alcança. Um deles é `two-pointers.mdx`,
  // o 5º artigo da lista: um caminho distinguível dentro de uma amostra de oito
  // bastava para a contagem valer 2, o guarda concluir "o git enxerga" e o
  // teste reprovar 37 URLs cujo `lastmod` estava certo.
  //
  // O sintoma do achatamento não é a contagem, é a CONCENTRAÇÃO: git cego
  // devolve o MESMO segundo para quase tudo, porque devolve sempre o
  // commit-fronteira. Então a medida é a fatia da moda, e sobre TODOS os
  // caminhos que o teste vai comparar — amostra pequena é enviesável pelo PR da
  // vez, que por definição mexeu em alguns desses arquivos.
  //
  // Margem medida: neste repositório com histórico de verdade são 42 caminhos,
  // 22 datas distintas e moda de 6 (14,3%); no job achatado a moda era 39 de 42
  // (92,9%). O corte em 50% fica longe dos dois, e cobre o caso antigo — git
  // que resolve UMA data para tudo tem moda de 100%.
  const caminhosConferidos = [
    ...ALL_TOPICS.filter((t) => !isEmptyTopic(t)).map((t) => `content/topics/${t.slug}.mdx`),
    ...Object.values(CONTEUDO_DA_ROTA).flat(),
  ];
  const porData = new Map<string, number>();
  for (const caminho of caminhosConferidos) {
    const d = dataDoGit(caminho);
    if (d) porData.set(d, (porData.get(d) ?? 0) + 1);
  }
  const resolvidos = [...porData.values()].reduce((a, b) => a + b, 0);
  const moda = porData.size ? Math.max(...porData.values()) : 0;
  test.skip(
    resolvidos === 0 || moda / resolvidos > 0.5,
    `o git deste processo devolve a mesma data para ${moda} dos ${resolvidos} caminhos ` +
      `conferidos (${porData.size} data(s) distinta(s) ao todo): ele achata o histórico no ` +
      "commit-fronteira e não pode servir de referência. As invariantes do artefato acima " +
      "já foram conferidas."
  );

  // Daqui para baixo o git deste processo enxerga o histórico, então dá para
  // cobrar a presença do campo e a data de cada rota.
  const sem = blocos.filter((_, i) => !lastmods[i]).map((b) => b.match(/<loc>([^<]+)<\/loc>/)![1]);
  expect(sem, `${sem.length} URLs sem lastmod com o histórico do Git disponível`).toEqual([]);

  const errados: string[] = [];
  for (const [i, bloco] of blocos.entries()) {
    const loc = bloco.match(/<loc>([^<]+)<\/loc>/)![1];
    const lastmod = lastmods[i]!;
    if (Number.isNaN(Date.parse(lastmod))) {
      errados.push(`${loc} → ${lastmod} não é uma data`);
      continue;
    }
    // Toda URL é conferida, fixa ou de tópico. Antes só as de tópico eram, e as
    // quatro fixas atravessavam a suíte sem que ninguém olhasse a data delas.
    const slug = loc.match(/\/topico\/([^/]+)\//)?.[1];
    const rota = loc.replace(SITE_URL, "");
    // Tópico: a data é a do artigo, com o `roadmap.ts` de reserva para quem
    // ainda não tem artigo — a mesma escolha, e o mesmo porquê, do `sitemap.ts`.
    const arquivos = slug
      ? dataDoGit(`content/topics/${slug}.mdx`)
        ? [`content/topics/${slug}.mdx`]
        : ["content/roadmap.ts"]
      : CONTEUDO_DA_ROTA[rota as keyof typeof CONTEUDO_DA_ROTA];
    const esperada = dataEsperada(arquivos);
    if (esperada !== undefined && Date.parse(lastmod) !== esperada) {
      errados.push(`${loc} → ${lastmod}, o Git diz ${new Date(esperada).toISOString()}`);
    }
  }
  expect(errados, "lastmod que não bate com o commit do arquivo").toEqual([]);
});

// ---------------------------------------------------------------------------
// 3. Dados estruturados: campo por nome, nunca contagem de <script>
// ---------------------------------------------------------------------------

test("toda rota traz Organization e WebSite com os perfis da comunidade", () => {
  const sem: string[] = [];
  for (const rota of TODAS_AS_ROTAS) {
    const nos = jsonLd(rota);
    const org = doTipo(nos, "Organization");
    const site = doTipo(nos, "WebSite");
    if (!org || !site) {
      sem.push(`${rota} (Organization=${!!org}, WebSite=${!!site})`);
      continue;
    }
    expect(org.name, rota).toBe("Craft & Code Club");
    expect(org.url, rota).toBe(LINKS.site);
    expect(org.sameAs, rota).toEqual(
      expect.arrayContaining([LINKS.github, LINKS.youtube, LINKS.discord])
    );
    expect(site.name, rota).toBe("Roadmap DSA");
    expect(site.url, rota).toBe(`${SITE_URL}/`);
    expect(site.inLanguage, rota).toBe("pt-BR");
  }
  expect(sem, `${sem.length} de ${TODAS_AS_ROTAS.length} rotas sem Organization/WebSite`).toEqual([]);
});

test("cada página de tópico descreve o tópico, com os dados que estão na tela", () => {
  const sem: string[] = [];
  for (const t of ALL_TOPICS) {
    const rota = `/topico/${t.slug}/`;
    const recurso = doTipo(jsonLd(rota), "LearningResource");
    // Os dois lados da condicional, não só o que interessa: página sem material
    // é `noindex` e sai do sitemap, então também não declara ser um recurso de
    // aprendizado. Sem esta metade, a marcação podia voltar sem ninguém ver.
    if (isEmptyTopic(t)) {
      expect(recurso, `${rota} é noindex e não pode declarar LearningResource`).toBeUndefined();
      continue;
    }
    if (!recurso) {
      sem.push(rota);
      continue;
    }
    expect(recurso["@context"], rota).toBe("https://schema.org");
    expect(recurso.name, rota).toBe(t.name);
    expect(recurso.description, rota).toBe(t.description);
    expect(recurso.url, rota).toBe(urlAbsoluta(rota));
    expect(recurso.inLanguage, rota).toBe("pt-BR");
    // O selo de nível e o de tempo de leitura estão na tela, em `.topic-chips`.
    expect(recurso.educationalLevel, rota).toBe(t.level);
    if (t.readingTime) {
      const minutos = t.readingTime.match(/^(\d+)\s*min$/)![1];
      expect(recurso.timeRequired, rota).toBe(`PT${minutos}M`);
    } else {
      expect(recurso.timeRequired, `${rota}: sem tempo na tela, sem timeRequired`).toBeUndefined();
    }
    // `language` do tópico é a linguagem do CÓDIGO ("Python"), não o idioma.
    if (t.language) expect(recurso.programmingLanguage, rota).toBe(t.language);
    else expect(recurso.programmingLanguage, rota).toBeUndefined();
    expect((recurso.about as No | undefined)?.name, rota).toBe(t.group);
  }
  const indexaveis = ALL_TOPICS.filter((t) => !isEmptyTopic(t)).length;
  expect(sem, `${sem.length} de ${indexaveis} tópicos indexáveis sem LearningResource`).toEqual([]);
});

test("o BreadcrumbList repete, item a item, a trilha que a página mostra", () => {
  const sem: string[] = [];
  for (const t of ALL_TOPICS) {
    const rota = `/topico/${t.slug}/`;
    const trilha = doTipo(jsonLd(rota), "BreadcrumbList");
    // A trilha DESENHADA continua nas 47 páginas; só a marcação some junto com o
    // resto do JSON-LD nas que pedem para não ser indexadas.
    if (isEmptyTopic(t)) {
      expect(trilha, `${rota} é noindex e não pode declarar BreadcrumbList`).toBeUndefined();
      continue;
    }
    if (!trilha) {
      sem.push(rota);
      continue;
    }
    const itens = trilha.itemListElement as No[];
    expect(itens.map((i) => i.name), rota).toEqual(["Início", t.group, t.name]);
    expect(itens.map((i) => i.position), rota).toEqual([1, 2, 3]);
    expect(itens.map((i) => i.item), rota).toEqual([
      urlAbsoluta("/"),
      urlAbsoluta("/roadmap/"),
      urlAbsoluta(rota),
    ]);
  }
  const indexaveis = ALL_TOPICS.filter((t) => !isEmptyTopic(t)).length;
  expect(sem, `${sem.length} de ${indexaveis} tópicos indexáveis sem BreadcrumbList`).toEqual([]);
});

test("o /roadmap lista os tópicos que ele renderiza, na ordem em que renderiza", () => {
  const lista = doTipo(jsonLd("/roadmap/"), "ItemList");
  expect(lista, "/roadmap/ sem ItemList").toBeTruthy();
  expect(lista!.numberOfItems).toBe(ALL_TOPICS.length);
  const itens = lista!.itemListElement as No[];
  expect(itens.map((i) => i.name)).toEqual(ALL_TOPICS.map((t) => t.name));
  expect(itens.map((i) => i.url)).toEqual(
    ALL_TOPICS.map((t) => urlAbsoluta(`/topico/${t.slug}/`))
  );
  expect(itens.map((i) => i.position)).toEqual(ALL_TOPICS.map((_, i) => i + 1));
});

// --- VideoObject: a aula gravada -------------------------------------------
//
// Este bloco substituiu um teste que exigia a AUSÊNCIA do `VideoObject`: ele
// existia porque o nó precisa de `uploadDate` e o type `Topic` não tinha data.
// Hoje tem (`videoUploadDate`, obrigatório por união quando há `youtube`), e o
// que se cobra passou a ser o contrário — que o nó esteja lá, completo, em toda
// página que embute a aula, e em nenhuma que não embute.

/** Segundos de uma duração ISO 8601 do tipo `PT1H38M8S`. `null` se não parsear. */
function segundosDoIso(iso: string): number | null {
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

/** Segundos de um "H:MM:SS" ou "MM:SS" da tela. `null` se não parsear. */
function segundosDoRelogio(txt: string): number | null {
  const m = txt.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

test("toda página com aula entrega um VideoObject com os quatro campos obrigatórios", () => {
  // Os obrigatórios do Google para VideoObject: name, description, thumbnailUrl
  // e uploadDate. "Presente" não basta — string vazia e array vazio passariam
  // por um teste que só perguntasse `toBeDefined`, e é assim que marcação
  // aparentemente completa chega ao Search Console como campo faltando.
  const OBRIGATORIOS = ["name", "description", "thumbnailUrl", "uploadDate"] as const;
  const comAula = ALL_TOPICS.filter((t) => t.youtube);
  expect(comAula.length, "nenhum tópico com vídeo: o teste não teria o que provar").toBeGreaterThan(0);

  const problemas: string[] = [];
  for (const t of comAula) {
    const rota = `/topico/${t.slug}/`;
    const video = doTipo(jsonLd(rota), "VideoObject");
    if (!video) {
      problemas.push(`${rota}: tem <iframe> da aula e nenhum VideoObject`);
      continue;
    }
    for (const campo of OBRIGATORIOS) {
      const v = video[campo];
      const vazio =
        v === undefined ||
        v === null ||
        (typeof v === "string" && v.trim() === "") ||
        (Array.isArray(v) && (v.length === 0 || v.some((x) => typeof x !== "string" || !x.trim())));
      if (vazio) problemas.push(`${rota}: ${campo} = ${JSON.stringify(v)}`);
    }
  }
  expect(
    problemas,
    `${problemas.length} campo(s) obrigatório(s) faltando nos ${comAula.length} VideoObject entregues`
  ).toEqual([]);
});

test("todo tópico com vídeo declara uma data de publicação real, e não do futuro", () => {
  // O guarda que sustenta a união de tipos do `Topic` do lado do ARTEFATO: a
  // união reprova no `tsc` quem entrar sem data, e este teste reprova quem
  // entrar com data que não é data. Os dois cobrem o mesmo esquecimento em
  // pontos diferentes, e o que não pode é o próximo tópico passar pelos dois.
  const agora = Date.now();
  const problemas: string[] = [];
  let conferidos = 0;
  for (const t of ALL_TOPICS.filter((t) => t.youtube)) {
    const rota = `/topico/${t.slug}/`;
    const video = doTipo(jsonLd(rota), "VideoObject");
    if (!video) continue; // já reprovado no teste acima
    const data = video.uploadDate;
    if (typeof data !== "string") {
      problemas.push(`${rota}: uploadDate não é string (${JSON.stringify(data)})`);
      continue;
    }
    conferidos += 1;
    const ms = Date.parse(data);
    if (Number.isNaN(ms)) {
      problemas.push(`${rota}: "${data}" não é ISO 8601 parseável`);
      continue;
    }
    // ISO 8601 de verdade, não um "01/04/2024" que o `Date.parse` aceitaria por
    // tolerância: ano-mês-dia, e fuso declarado (Z ou ±HH:MM) quando há hora.
    if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2}))?$/.test(data)) {
      problemas.push(`${rota}: "${data}" não está na forma ISO 8601 com fuso`);
    }
    if (ms > agora) problemas.push(`${rota}: uploadDate no futuro (${data})`);
    // A data também não pode ser anterior ao canal: aula gravada em 1970 é o
    // sintoma clássico de timestamp zerado passando por "data válida".
    if (ms < Date.parse("2020-01-01T00:00:00Z")) {
      problemas.push(`${rota}: uploadDate anterior ao canal da comunidade (${data})`);
    }
    if (t.videoUploadDate !== undefined) {
      expect(data, `${rota}: a data entregue não é a do roadmap`).toBe(t.videoUploadDate);
    }
  }
  expect(problemas, "datas de publicação inválidas").toEqual([]);
  expect(
    conferidos,
    "quantidade de tópicos com vídeo cuja data foi conferida no HTML entregue"
  ).toBe(ALL_TOPICS.filter((t) => t.youtube).length);
});

test("o VideoObject aponta para o embed e a miniatura daquele vídeo", () => {
  // A marcação reflete o que está na tela: o `embedUrl` tem que ser o MESMO
  // `src` do `<iframe>` que a página renderiza. Comparar contra o HTML, e não
  // contra `ytEmbed(t.youtube)` de novo, é o que impede o teste de repetir o
  // erro do código — se os dois saíssem da mesma função, marcar o vídeo errado
  // passaria verde.
  const problemas: string[] = [];
  for (const t of ALL_TOPICS.filter((t) => t.youtube)) {
    const rota = `/topico/${t.slug}/`;
    const doc = html(rota);
    const video = doTipo(jsonLd(rota), "VideoObject");
    if (!video) continue;
    const iframes = [...doc.matchAll(/<iframe[^>]*src="([^"]+)"/g)].map((m) => m[1]);
    const embed = video.embedUrl as string | undefined;
    if (!embed || !iframes.includes(embed)) {
      problemas.push(`${rota}: embedUrl=${embed} não está entre os iframes da página (${iframes.join(", ") || "nenhum"})`);
    }
    // `contentUrl` seria mentira: o arquivo do vídeo não é servido daqui.
    if (video.contentUrl !== undefined) problemas.push(`${rota}: contentUrl num vídeo que é só embutido`);
    // A miniatura tem que ser a DESTE vídeo, e a URL precisa ser absoluta.
    for (const thumb of (video.thumbnailUrl as string[] | undefined) ?? []) {
      if (!thumb.startsWith("https://i.ytimg.com/vi/")) problemas.push(`${rota}: miniatura fora do i.ytimg.com (${thumb})`);
      if (!thumb.includes(`/vi/${t.youtube}/`)) problemas.push(`${rota}: miniatura de outro vídeo (${thumb})`);
    }
    if (video.publisher === undefined) problemas.push(`${rota}: VideoObject sem publisher`);
    if (video.inLanguage !== "pt-BR") problemas.push(`${rota}: inLanguage=${video.inLanguage}`);
  }
  expect(problemas, "VideoObject que não descreve o vídeo da própria página").toEqual([]);
});

test("a duração marcada é a duração escrita ao lado do vídeo", () => {
  // O par que o Google lê (`duration`, em ISO 8601) e o par que o aluno lê
  // ("· 2:08:22", na linha acima do embed) têm que valer a MESMA quantidade de
  // segundos. Os dois lados são parseados por regras independentes e comparados
  // em segundos — um conversor que trocasse minutos por horas reprova aqui.
  const problemas: string[] = [];
  let conferidos = 0;
  for (const t of ALL_TOPICS.filter((t) => t.youtube)) {
    const rota = `/topico/${t.slug}/`;
    const video = doTipo(jsonLd(rota), "VideoObject");
    if (!video) continue;
    const duration = video.duration as string | undefined;
    if (t.videoMinutes === undefined) {
      expect(duration, `${rota}: sem duração na tela, sem duration na marcação`).toBeUndefined();
      continue;
    }
    if (duration === undefined) {
      problemas.push(`${rota}: a página mostra "${t.videoMinutes}" e a marcação não tem duration`);
      continue;
    }
    const emSegundos = segundosDoIso(duration);
    const naTela = segundosDoRelogio(t.videoMinutes);
    if (emSegundos === null) {
      problemas.push(`${rota}: duration="${duration}" não é duração ISO 8601 válida`);
      continue;
    }
    if (naTela !== null && emSegundos !== naTela) {
      problemas.push(`${rota}: duration=${duration} (${emSegundos}s) ≠ "${t.videoMinutes}" (${naTela}s)`);
    }
    // O texto do embed é o que o aluno lê; ele tem que estar mesmo no HTML.
    if (!html(rota).includes(t.videoMinutes)) {
      problemas.push(`${rota}: "${t.videoMinutes}" não aparece no HTML entregue`);
    }
    conferidos += 1;
  }
  expect(problemas, "duração marcada divergindo da duração na tela").toEqual([]);
  expect(conferidos, "durações conferidas contra a tela").toBeGreaterThan(0);
});

test("página sem aula não inventa VideoObject", () => {
  // A outra metade, e a que envelhece sozinha: a lista sai de `ALL_TOPICS`, não
  // de um slug escrito à mão, então um tópico novo sem vídeo entra na cobertura
  // no mesmo commit que o cria.
  const semAula = ALL_TOPICS.filter((t) => !t.youtube);
  expect(semAula.length, "todos os tópicos têm vídeo: esta metade ficou sem o que provar").toBeGreaterThan(0);
  const intrusos: string[] = [];
  for (const t of semAula) {
    const rota = `/topico/${t.slug}/`;
    if (doTipo(jsonLd(rota), "VideoObject")) intrusos.push(rota);
  }
  expect(intrusos, `${intrusos.length} páginas sem embed declarando VideoObject`).toEqual([]);
});

// ---------------------------------------------------------------------------
// 4. O que o aluno vê: trilha navegável e hierarquia de títulos
// ---------------------------------------------------------------------------

test("a trilha do tópico é navegável e diz onde o aluno está", async ({ page }) => {
  const t = ALL_TOPICS[1]; // um tópico com grupo de verdade (o [0] é a Introdução)
  await page.goto(`/topico/${t.slug}/`);
  const trilha = page.locator(".breadcrumb");

  const inicio = trilha.getByRole("link", { name: "Início" });
  await expect(inicio).toHaveAttribute("href", "/");
  await expect(trilha.getByRole("link", { name: t.group })).toHaveAttribute("href", "/roadmap/");
  await expect(trilha.locator(".cur")).toHaveAttribute("aria-current", "page");

  // Interagir, não contar: o link tem que levar mesmo à home.
  await inicio.click();
  await expect(page).toHaveURL(new RegExp("/$"));
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
});

test("a trilha marcada é a trilha desenhada", async ({ page }) => {
  // Regra do Google que decide o desenho: a marcação reflete o que está na tela.
  const comMarcacao = ALL_TOPICS.filter((t) => !isEmptyTopic(t));
  for (const t of [comMarcacao[0], comMarcacao[comMarcacao.length - 1]]) {
    const rota = `/topico/${t.slug}/`;
    await page.goto(rota);
    const naTela = await page
      .locator(".breadcrumb")
      .evaluate((el) =>
        [...el.children]
          .map((c) => c.textContent?.trim() ?? "")
          .filter((s) => s !== "" && s !== "/")
      );
    const marcado = (doTipo(jsonLd(rota), "BreadcrumbList")!.itemListElement as No[]).map(
      (i) => i.name
    );
    expect(naTela, rota).toEqual(marcado);
  }
});

test("todo landmark de navegação da página de tópico tem nome próprio", async ({ page }) => {
  // Varredura da PÁGINA INTEIRA, não de um elemento escolhido a dedo: conta
  // todos os `<nav>` e exige nome acessível em cada um, então qualquer landmark
  // que alguém acrescente entra na cobertura sozinho.
  //
  // Este teste já teve escopo `.topic-layout`, porque os dois `.topnav` da casca
  // eram anônimos e nomeá-los era de outra frente. Com aquela frente na `main`,
  // o escopo caiu e o nome do teste passou a valer para a página toda — que era
  // a promessa desde o começo.
  //
  // Roda num tópico `ready` (tem índice "Nesta página") e num `soon` (não tem):
  // sem o segundo, um regresso que sumisse com a trilha passaria calado.
  const pronto = ALL_TOPICS.find((t) => !isEmptyTopic(t))!;
  const vazio = ALL_TOPICS.find((t) => isEmptyTopic(t))!;
  for (const [t, navsEsperados] of [[pronto, 5], [vazio, 4]] as const) {
    await page.goto(`/topico/${t.slug}/`);
    const total = await page.getByRole("navigation").count();
    const comNome = await page.getByRole("navigation", { name: /\S/ }).count();
    const anonimos = await page.locator("nav").evaluateAll((els) =>
      els
        .filter((e) => !e.getAttribute("aria-label")?.trim() && !e.getAttribute("aria-labelledby")?.trim())
        .map((e) => `.${e.className || e.tagName}`)
    );
    expect(total, `${t.slug}: quantidade de landmarks de navegação da página`).toBe(navsEsperados);
    expect(
      comNome,
      `${t.slug}: ${comNome} de ${total} landmarks de navegação têm nome; sem nome: ${anonimos.join(", ") || "-"}`
    ).toBe(total);
    if (t === pronto) {
      // O nome anunciado tem que ser o rótulo que está na tela, e não uma
      // segunda string parecida: é isso que o `aria-labelledby` compra, e é o
      // que um `aria-label` deixaria divergir em silêncio.
      //
      // `textContent` e não `innerText`: o `.toc-title` é escrito em versalete
      // pelo CSS, e o `innerText` devolve "NESTA PÁGINA". O nome acessível é o
      // texto do DOM, "Nesta página", e é ele que o leitor de tela anuncia —
      // comparar com o texto renderizado reprovaria por causa da caixa.
      const indice = page.locator("nav.toc");
      const rotulo = ((await indice.locator(".toc-title").textContent()) ?? "").trim();
      expect(rotulo, "o índice tem que ter rótulo visível para ser apontado").not.toBe("");
      await expect(indice).toHaveAccessibleName(rotulo);
    }
  }
});

test("nenhuma rota pula um nível de título", () => {
  const problemas: string[] = [];
  for (const rota of TODAS_AS_ROTAS) {
    const corpo = html(rota).split("<body")[1] ?? "";
    const niveis = [...corpo.matchAll(/<h([1-6])[ >]/g)].map((m) => Number(m[1]));
    const saltos = niveis.filter((n, i) => i > 0 && n > niveis[i - 1] + 1);
    if (saltos.length) problemas.push(`${rota} → ${niveis.join(",")}`);
    if (niveis.filter((n) => n === 1).length !== 1) problemas.push(`${rota} → h1 x${niveis.filter((n) => n === 1).length}`);
  }
  expect(problemas, "hierarquia de títulos quebrada").toEqual([]);
});

test("o /apoie mantém o tamanho dos títulos ao consertar a hierarquia", async ({ page }) => {
  // A hierarquia é de semântica, não de aparência: `.cta-card h3` e
  // `.feature-card h3` são regras por TAG no `globals.css`, então trocar a tag
  // sem repor o estilo encolheria dois títulos da página que sustenta o projeto.
  await page.goto("/apoie/");
  const seja = page.locator(".cta-card").getByText("Seja um apoiador", { exact: true });
  const contribua = page.locator(".feature-card").getByText("Da comunidade pra comunidade, contribua");
  expect(await seja.evaluate((el) => getComputedStyle(el).fontSize)).toBe("22px");
  expect(await contribua.evaluate((el) => getComputedStyle(el).fontSize)).toBe("16px");
  await expect(seja).toHaveRole("heading");
  await expect(contribua).toHaveRole("heading");
});
