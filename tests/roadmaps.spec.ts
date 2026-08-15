import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { isEmptyTopic, topicTags, TOPICOS } from "../content/topicos";
import { getPratica, TOTAL_PROBLEMS } from "../content/topicos/pratica";
import { getArtigo } from "../content/topicos/artigos";
import {
  EXTRA_CARDS,
  FUNDAMENTOS,
  ROADMAPS,
  ROADMAPS_EXTRAS,
  roadmapGroups,
  roadmapHasMaterial,
  roadmapsDoTopico,
  roadmapTopics,
  TOPICOS_AVULSOS,
  todasAsPaginasDeRoadmap,
  urlDoRoadmap,
  urlDoTopicoNoRoadmap,
} from "../content/roadmaps";

// Tópicos sem casa, roadmaps que os citam, e o mesmo tópico em vários percursos.
//
// O que este arquivo protege:
//
//   1. os dois REGISTROS à mão (tópicos e roadmaps). Um arquivo que ninguém
//      importou é conteúdo invisível, e nada além deste teste percebe;
//   2. a CITAÇÃO: o mesmo tópico em vários roadmaps, com uma página canônica só
//      e uma URL por roadmap apontando de volta para ela;
//   3. a casca certa em cada rota. É a decisão do `Shell`, ela casa o primeiro
//      segmento por STRING, e renomear rota sem mexer nela devolve a casca
//      padrão em silêncio (já aconteceu);
//   4. as rotas antigas redirecionando, que é o que preserva o que já circula.

const COM_MATERIAL = ROADMAPS_EXTRAS.find(roadmapHasMaterial)!;
const SEM_MATERIAL = ROADMAPS_EXTRAS.find((r) => !roadmapHasMaterial(r))!;
const BANCOS = ROADMAPS.find((r) => r.slug === "bancos-de-dados")!;

// ---------------------------------------------------------------------------
// 1. Os registros: as pastas e os índices contam a mesma história
// ---------------------------------------------------------------------------

test("toda pasta de content/topicos/ está registrada no índice, e vice-versa", () => {
  const dir = path.join(process.cwd(), "content", "topicos");
  const pastas = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  const registrados = TOPICOS.map((t) => t.slug).sort();

  expect(
    pastas.filter((p) => !registrados.includes(p)),
    "pasta em content/topicos/ que o índice não importa: o tópico não existe no site"
  ).toEqual([]);
  expect(
    registrados.filter((s) => !pastas.includes(s)),
    "tópico registrado cuja pasta não se chama <slug>/"
  ).toEqual([]);

  // E cada pasta tem o que precisa ter.
  const semIndex = pastas.filter((p) => !existsSync(path.join(dir, p, "index.ts")));
  expect(semIndex, "pasta de tópico sem index.ts").toEqual([]);

  // As três peças da pasta são registradas em três lugares (o tópico em
  // `index.ts`, o corpo em `artigos.ts`, a prática em `pratica.ts`), porque as
  // duas últimas não podem entrar no JavaScript do cliente. Registro à mão
  // esquece: o arquivo fica na pasta e o site não o serve.
  const semRegistro = pastas.filter(
    (p) => existsSync(path.join(dir, p, "artigo.mdx")) !== !!getArtigo(p)
  );
  expect(semRegistro, "pasta com artigo.mdx que o content/topicos/artigos.ts não importa (ou o contrário)").toEqual([]);

  const praticaSolta = pastas.filter((p) => {
    const temArquivo = existsSync(path.join(dir, p, "pratica.ts"));
    const pratica = getPratica(p);
    return temArquivo !== !!(pratica.problems || pratica.references);
  });
  expect(praticaSolta, "pasta com pratica.ts que o content/topicos/pratica.ts não importa (ou o contrário)").toEqual([]);
});

test("a etiqueta de exercícios bate com a lista de problemas de verdade", () => {
  // `topicTags` é desenhado em card, e card é cliente: a lista de problemas não
  // pode estar lá (são 40 KB). Por isso o `content/topicos/index.ts` guarda só
  // o CONJUNTO DE SLUGS que têm problemas — e conjunto de slugs é cópia. Este
  // teste é o que impede a cópia de envelhecer: um tópico que ganha problemas e
  // não entra no conjunto fica com a lista na página e sem a etiqueta no card.
  const errados = TOPICOS.filter((t) => {
    const temEtiqueta = topicTags(t).some((tag) => tag.kind === "exercises");
    const temProblemas = (getPratica(t.slug).problems ?? []).length > 0;
    return temEtiqueta !== temProblemas;
  }).map((t) => t.slug);
  expect(errados, "COM_PROBLEMAS (content/topicos/index.ts) desencontrou de content/topicos/pratica.ts").toEqual([]);
  expect(TOTAL_PROBLEMS, "nenhum problema registrado: a varredura acima não prova nada").toBeGreaterThan(150);
});

test("dentro de um roadmap, as citações do artigo continuam no roadmap", async ({ page }) => {
  // O artigo cita outros tópicos ("como vimos em [Tabelas Hash](/topicos/…)"),
  // e o `.mdx` não sabe por qual percurso o leitor chegou. Sem a reescrita, uma
  // citação tirava o leitor do roadmap no meio de uma frase que prometia
  // continuidade: o menu sumia, o "Próximo" sumia, e nada avisava.
  await page.goto("/fundamentos/big-o/");
  const noArtigo = await page
    .locator("article a[href^='/topicos/'], article a[href^='/fundamentos/']")
    .evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
  const citacoes = noArtigo.filter((h) => /^\/(topicos|fundamentos)\/[a-z0-9-]+\/$/.test(h));
  expect(citacoes.length, "o artigo do Big O parou de citar outros tópicos").toBeGreaterThan(2);
  expect(
    citacoes.filter((h) => h.startsWith("/topicos/")),
    "citação apontando para fora do roadmap: o leitor perde o percurso ao clicar"
  ).toEqual([]);

  // A outra metade: um tópico que ESTE roadmap não tem continua com o link
  // canônico. Fingir uma URL dentro do roadmap seria inventar uma página.
  await page.goto("/roadmaps/bancos-de-dados/hash-table/");
  const fora = await page
    .locator("article a[href^='/topicos/']")
    .evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
  expect(fora.length, "nenhuma citação para fora do roadmap: o caso não está sendo medido").toBeGreaterThan(0);
});

test("todo arquivo de content/roadmaps/ está registrado no índice, e vice-versa", () => {
  const dir = path.join(process.cwd(), "content", "roadmaps");
  const arquivos = readdirSync(dir)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts")
    .map((f) => f.replace(/\.ts$/, ""))
    .sort();
  const registrados = ROADMAPS.map((r) => r.slug).sort();
  expect(arquivos.filter((f) => !registrados.includes(f)), "roadmap invisível").toEqual([]);
  expect(registrados.filter((s) => !arquivos.includes(s)), "roadmap sem arquivo <slug>.ts").toEqual([]);
});

test("o sumário de cada artigo é a lista dos h2 dele", async ({ page }) => {
  // O sumário é uma CÓPIA dos títulos, e cópia diverge: quando divergia, a
  // âncora do índice "Nesta página" deixava de casar com a do título, e o
  // rótulo saía com a marcação markdown crua ("O detalhe do `continue`").
  const comArtigo = TOPICOS.filter((t) => !isEmptyTopic(t)).slice(0, 6);
  for (const t of comArtigo) {
    await page.goto(`/topicos/${t.slug}/`);
    const doIndice = await page.locator(".toc-links a").allTextContents();
    const naPagina = await page.locator("article h2:not(.continue-explorando h2)").allTextContents();
    // O índice acrescenta as seções que a página monta (vídeo, problemas…), e
    // por isso é subconjunto: o que ele NÃO pode ter é entrada que não casa com
    // título nenhum.
    for (const entrada of doIndice) {
      expect(naPagina, `${t.slug}: "${entrada}" está no índice e não é um h2 da página`).toContain(entrada);
    }
  }
});

// ---------------------------------------------------------------------------
// 2. Um tópico, vários roadmaps
// ---------------------------------------------------------------------------

test("o dado tem, de fato, tópicos em mais de um roadmap", () => {
  const emVarios = TOPICOS.filter((t) => roadmapsDoTopico(t.slug).length > 1);
  expect(emVarios.length, "nenhum tópico em dois roadmaps: o exemplo de reuso sumiu").toBeGreaterThanOrEqual(4);
  expect(roadmapsDoTopico("hash-table").map((r) => r.slug)).toEqual(
    expect.arrayContaining(["fundamentos", "bancos-de-dados"])
  );
});

test("a página do tópico dentro de um roadmap aponta canonical para a canônica", async ({ page }) => {
  const t = roadmapTopics(BANCOS).find((x) => !isEmptyTopic(x))!;
  const resposta = await page.goto(`${urlDoTopicoNoRoadmap(BANCOS, t.slug)}/`);
  expect(resposta?.status()).toBe(200);

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    new RegExp(`/topicos/${t.slug}/$`)
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    new RegExp(`/topicos/${t.slug}/$`)
  );
  // Só o nó do layout: quem declara o recurso é a canônica.
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
});

test("o mesmo artigo aparece nas duas URLs, com cascas diferentes", async ({ page }) => {
  const t = roadmapTopics(BANCOS).find((x) => !isEmptyTopic(x))!;
  const corpo = () => page.locator("article h2:not(.continue-explorando h2)").allTextContents();

  await page.goto(`/topicos/${t.slug}/`);
  const naCanonica = await corpo();
  await expect(page.locator("#menu-lateral")).toHaveAttribute("aria-label", `Roadmaps com ${t.name}`);

  await page.goto(`${urlDoTopicoNoRoadmap(BANCOS, t.slug)}/`);
  expect(await corpo(), "as duas rotas pararam de dividir o TopicoPagina").toEqual(naCanonica);
  await expect(page.locator("#menu-lateral")).toHaveAttribute("aria-label", `Roadmap: ${BANCOS.name}`);
});

test("dentro de um roadmap, a navegação não expulsa o leitor dele", async ({ page }) => {
  const lista = roadmapTopics(BANCOS);
  await page.goto(`${urlDoTopicoNoRoadmap(BANCOS, lista[0].slug)}/`);

  const hrefs = await page.locator("#menu-lateral .side-item").evaluateAll((as) =>
    as.map((a) => a.getAttribute("href") ?? "")
  );
  expect(hrefs).toEqual(lista.map((t) => `${urlDoTopicoNoRoadmap(BANCOS, t.slug)}/`));
  await expect(page.locator(".prevnext a.next")).toHaveAttribute(
    "href",
    `${urlDoTopicoNoRoadmap(BANCOS, lista[1].slug)}/`
  );
  await expect(page.locator(".pagina-canonica a")).toHaveAttribute("href", `/topicos/${lista[0].slug}/`);
});

test("a página canônica mostra os roadmaps do tópico, na barra e no fim", async ({ page }) => {
  await page.goto("/topicos/hash-table/");
  const barra = page.locator("#menu-lateral");
  const nomes = await barra.locator(".side-roadmap-titulo").allTextContents();
  expect(nomes).toEqual(roadmapsDoTopico("hash-table").map((r) => r.name));

  const banda = page.locator(".continue-explorando");
  await expect(banda.getByRole("heading", { name: /Este tópico faz parte/ })).toBeVisible();
  await expect(banda.locator(`.extra-card[href="${urlDoRoadmap(BANCOS)}/"]`)).toHaveCount(1);
});

test("tópico que nenhum roadmap cita não tem barra lateral", async ({ page }) => {
  expect(TOPICOS_AVULSOS.length, "nenhum tópico solto: o caso sem barra sumiu").toBeGreaterThan(0);
  await page.goto(`/topicos/${TOPICOS_AVULSOS[0].slug}/`);
  await expect(page.locator("#menu-lateral")).toHaveCount(0);
  await expect(page.locator(".shell")).toHaveClass(/\bsem-lateral\b/);
  await expect(page.getByRole("button", { name: "Menu de tópicos" })).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// 3. As rotas antigas continuam valendo
// ---------------------------------------------------------------------------

test("as rotas renomeadas têm redirecionamento declarado, e não sobraram como página", () => {
  // `_redirects` não é HTML e não passa por navegador: a prova é o ARTEFATO.
  // E a regra só é avaliada se NÃO existir arquivo naquele caminho — por isso o
  // teste confere as duas metades.
  const regras = readFileSync(path.join(process.cwd(), "out", "_redirects"), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  expect(regras).toContain("/topico/*  /topicos/:splat  301");
  expect(regras).toContain("/roadmap/  /fundamentos/  301");

  const out = path.join(process.cwd(), "out");
  expect(existsSync(path.join(out, "topico")), "/topico/ ainda é página: o 301 nunca roda").toBe(false);
  expect(existsSync(path.join(out, "roadmap")), "/roadmap/ ainda é página: o 301 nunca roda").toBe(false);
});

// ---------------------------------------------------------------------------
// 4. A vitrine, o índice e a casca
// ---------------------------------------------------------------------------

for (const [rota, onde] of [
  ["/fundamentos/", "no fim dos Fundamentos"],
  ["/roadmaps/", "na vitrine"],
] as const) {
  test(`a vitrine ${onde} traz os ${EXTRA_CARDS.length} roadmaps, com o destino certo`, async ({ page }) => {
    await page.goto(rota);
    const cards = page.locator(".extra-card");
    await expect(cards).toHaveCount(EXTRA_CARDS.length);
    for (const c of EXTRA_CARDS) {
      const card = cards.filter({ has: page.locator(".extra-name", { hasText: c.name }) });
      await expect(card, `${rota}: card "${c.name}"`).toHaveCount(1);
      await expect(card).toHaveAttribute("href", c.href);
    }
  });
}

test("o índice /topicos/ lista cada tópico UMA vez, com os roadmaps dele", async ({ page }) => {
  await page.goto("/topicos/");
  await expect(page.locator(".topico-linha")).toHaveCount(TOPICOS.length);

  const nomes = await page.locator(".topico-linha-nome").allTextContents();
  const faltando = TOPICOS.filter((t) => !nomes.some((n) => n.startsWith(t.name)));
  expect(faltando.map((t) => t.slug), "tópicos fora do índice completo").toEqual([]);

  // A linha da Tabela Hash carrega os dois roadmaps dela.
  const linha = page.locator(".topico-linha").filter({ hasText: "Tabelas Hash" });
  const etiquetas = await linha.locator(".ttag-origem").allTextContents();
  expect(etiquetas).toEqual(roadmapsDoTopico("hash-table").map((r) => r.name));
});

test("a busca do índice filtra, e o contador acompanha", async ({ page }) => {
  await page.goto("/topicos/");
  await page.getByLabel("Buscar entre todos os tópicos").fill("bloom");
  await expect(page.locator(".topico-linha")).toHaveCount(1);
  await page.getByLabel("Buscar entre todos os tópicos").fill("zzzzzz");
  await expect(page.locator(".topicos-contagem")).toHaveText("Nenhum tópico com esse filtro.");
});

test("a casca certa em cada rota", async ({ page }) => {
  const barra = () => page.locator("#menu-lateral");

  await page.goto("/fundamentos/");
  await expect(barra()).toHaveAttribute("aria-label", "Fundamentos");

  await page.goto("/fundamentos/big-o/");
  await expect(barra()).toHaveAttribute("aria-label", "Fundamentos");
  await expect(barra().getByLabel("Buscar tópico")).toHaveCount(1);

  await page.goto(`${urlDoRoadmap(BANCOS)}/`);
  await expect(barra()).toHaveAttribute("aria-label", `Roadmap: ${BANCOS.name}`);

  await page.goto("/roadmaps/");
  await expect(barra()).toHaveCount(0);

  await page.goto("/topicos/");
  await expect(barra()).toHaveCount(0);
});

test("os links do topo acendem na área certa", async ({ page }) => {
  const aceso = (href: string) => page.locator(`.nav-left a[href="${href}"].on`);
  await page.goto("/fundamentos/big-o/");
  await expect(aceso("/fundamentos/")).toHaveCount(1);
  await page.goto(`${urlDoRoadmap(BANCOS)}/`);
  await expect(aceso("/roadmaps/")).toHaveCount(1);
  await page.goto("/topicos/hash-table/");
  await expect(aceso("/topicos/")).toHaveCount(1);
});

// ---------------------------------------------------------------------------
// 5. A abertura de um roadmap
// ---------------------------------------------------------------------------

test("a abertura mostra os tópicos, os pré-requisitos e por onde começar", async ({ page }) => {
  const r = COM_MATERIAL;
  await page.goto(`${urlDoRoadmap(r)}/`);
  await expect(page.getByRole("heading", { level: 1, name: r.name })).toBeVisible();

  const nomes = await page.locator(".topic-card-name").allTextContents();
  expect(nomes).toEqual(roadmapTopics(r).map((t) => t.name));

  const reqs = await page.locator(".req-link").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
  expect(reqs).toEqual((r.requires ?? []).map((s) => `/topicos/${s}/`));

  const primeiro = roadmapTopics(r).find((t) => !isEmptyTopic(t))!;
  await page.getByRole("link", { name: `Começar por ${primeiro.name}` }).click();
  await expect(page).toHaveURL(new RegExp(`${urlDoTopicoNoRoadmap(r, primeiro.slug)}/`));
});

test("roadmap ainda sem material não finge que dá para começar", async ({ page }) => {
  await page.goto(`${urlDoRoadmap(SEM_MATERIAL)}/`);
  await expect(page.getByRole("link", { name: /^Começar por / })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Acompanhar no Discord/ })).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

// ---------------------------------------------------------------------------
// 6. Progresso e celular
// ---------------------------------------------------------------------------

test("marcar um tópico conta em todo lugar em que ele aparece", async ({ page }) => {
  await page.goto(`${urlDoRoadmap(BANCOS)}/`);
  await page.locator(".topic-card-wrap").filter({ hasText: "Tabelas Hash" }).getByRole("checkbox").click();

  await page.goto("/topicos/hash-table/");
  await expect(page.locator(".topic-chips .btn-concluir")).toHaveText("✓ Concluído");

  await page.goto("/fundamentos/");
  const naSequencia = page.locator(".topic-card-wrap").filter({ hasText: "Tabelas Hash" });
  await expect(naSequencia.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
});

test("as páginas novas não rolam na horizontal no celular @mobile", async ({ page }) => {
  const dentro = roadmapTopics(BANCOS)[0];
  for (const rota of [
    "/roadmaps/",
    "/topicos/",
    "/topicos/hash-table/",
    `${urlDoRoadmap(BANCOS)}/`,
    `${urlDoRoadmap(SEM_MATERIAL)}/`,
    `${urlDoTopicoNoRoadmap(BANCOS, dentro.slug)}/`,
    "/fundamentos/big-o/",
  ]) {
    await page.goto(rota);
    const estoura = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(estoura, `${rota} estoura a largura no celular`).toBe(false);
  }
});

// ---------------------------------------------------------------------------
// 7. Toda página existe, e as citações todas resolvem
// ---------------------------------------------------------------------------

test("toda combinação (roadmap, tópico) tem página gerada", async ({ page }) => {
  const paginas = todasAsPaginasDeRoadmap();
  expect(paginas.length, "nenhuma página de roadmap gerada").toBeGreaterThan(60);
  for (const r of ROADMAPS) {
    const primeiro = roadmapTopics(r)[0];
    const rota = `${urlDoTopicoNoRoadmap(r, primeiro.slug)}/`;
    const resposta = await page.goto(rota);
    expect(resposta?.status(), rota).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: primeiro.name })).toBeVisible();
  }
});

test("os grupos de um roadmap resolvem todas as citações", () => {
  for (const r of ROADMAPS) {
    const escritos = r.groups.reduce((n, g) => n + g.topics.length, 0);
    const resolvidos = roadmapGroups(r).reduce((n, g) => n + g.topicos.length, 0);
    expect(resolvidos, `o roadmap "${r.name}" perdeu citações pelo caminho`).toBe(escritos);
  }
});

test("os Fundamentos citam a maior parte do guia, e são o primeiro roadmap", () => {
  expect(ROADMAPS[0].slug).toBe(FUNDAMENTOS.slug);
  expect(roadmapTopics(FUNDAMENTOS).length).toBeGreaterThan(40);
  // E eles não aparecem na vitrine: têm a home e a barra do topo para si.
  expect(EXTRA_CARDS.map((c) => c.slug)).not.toContain(FUNDAMENTOS.slug);
});
