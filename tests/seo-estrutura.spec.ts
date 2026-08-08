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

// As rotas fixas saem do PRÓPRIO `sitemap.ts`, e não de uma lista à mão aqui.
// Era à mão, e a lista de cima explica no que dá: rota nova entrava no site sem
// entrar na cobertura. Pior no caso do sitemap, onde a lista à mão do teste e a
// do build DIVERGEM em silêncio — o teste que compara as duas passa a comparar
// a rota nova consigo mesma ausente dos dois lados.
const ROTAS_FIXAS = Object.keys(CONTEUDO_DA_ROTA);
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

test("o JSON-LD do tópico não promete vídeo, que é o que falta para o VideoObject", () => {
  // `VideoObject` exige `uploadDate`, que não existe no type `Topic`. Marcar o
  // vídeo sem ele é marcação inválida; marcar com data inventada é pior.
  const comVideo = ALL_TOPICS.find((t) => t.youtube)!;
  const nos = jsonLd(`/topico/${comVideo.slug}/`);
  expect(doTipo(nos, "VideoObject"), "VideoObject só entra quando houver uploadDate").toBeUndefined();
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
