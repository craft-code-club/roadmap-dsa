import { test, expect } from "@playwright/test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { isEmptyTopic, temArtigo, topicTags, TOPICOS } from "../content/topicos";
import { getPratica, TOTAL_PROBLEMS } from "../content/topicos/pratica";
import {
  EXTRA_CARDS,
  getTopico,
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
// Pode não existir: hoje os dois roadmaps têm material. O teste que depende
// dele se declara pulado em vez de sumir em silêncio.
const SEM_MATERIAL = ROADMAPS_EXTRAS.find((r) => !roadmapHasMaterial(r));
/** O roadmap extra do exemplo, e o tópico que ele divide com os Fundamentos. */
const EXTRA = ROADMAPS.find((r) => r.slug === "caminhos-minimos")!;
const COMPARTILHADO = "dijkstra";

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
  // `temArtigo` lê o `sumario`, que fica no `index.ts` do tópico. O `Body` mora
  // em `content/topicos/artigos.ts`, e este arquivo NÃO pode importá-lo: o
  // transpilador do Playwright não lê `.mdx`. Quem casa as duas metades é o
  // `getArtigo`, que estoura no build quando uma existe sem a outra.
  const semRegistro = pastas.filter(
    (p) => existsSync(path.join(dir, p, "artigo.mdx")) !== temArtigo(p)
  );
  expect(semRegistro, "pasta com artigo.mdx sem `sumario` no index.ts (ou o contrário)").toEqual([]);

  // A pasta tem DOIS arquivos, e é contrato: o dado e o texto. Um terceiro
  // arquivo aqui é sinal de que alguém dividiu o tópico de novo, e o lugar de
  // dividir (quando o peso obriga) é o registro, não a pasta.
  const demais = pastas.flatMap((p) =>
    readdirSync(path.join(dir, p))
      .filter((n) => n !== "index.ts" && n !== "artigo.mdx")
      .map((n) => `${p}/${n}`)
  );
  expect(demais, "arquivo a mais na pasta de um tópico (o contrato é index.ts + artigo.mdx)").toEqual([]);

  // A prática mora no `index.ts` do tópico e é registrada em
  // `content/topicos/pratica.ts` por um import nomeado. Import esquecido = a
  // seção "Problemas para praticar" some da página, sem erro nenhum.
  const semPratica = pastas.filter((p) => {
    const escrita = readFileSync(path.join(dir, p, "index.ts"), "utf8").includes("export const pratica");
    const pratica = getPratica(p);
    return escrita !== !!(pratica.problems || pratica.references);
  });
  expect(semPratica, "tópico com `pratica` que o content/topicos/pratica.ts não importa").toEqual([]);
});

test("dois tópicos com o mesmo assunto escrevem o assunto igual", () => {
  // O `group` é TEXTO LIVRE, e é ele que o índice `/topicos/` usa para montar as
  // seções e o `id` da âncora de cada uma. Duas grafias do mesmo assunto
  // ("Estruturas Probabilísticas" e "Estruturas probabilísticas") viram duas
  // seções com o mesmo título na tela e o MESMO `id` no HTML — e a lista, ao
  // filtrar, passou a desenhar as linhas de uma delas duas vezes.
  //
  // A régua é a chave da âncora, e não o texto: é ela que colide.
  const chave = (g: string) =>
    g.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
  const porChave = new Map<string, Set<string>>();
  for (const t of TOPICOS) {
    const k = chave(t.group);
    porChave.set(k, (porChave.get(k) ?? new Set()).add(t.group));
  }
  const ambiguos = [...porChave.values()].filter((g) => g.size > 1).map((g) => [...g]);
  expect(ambiguos, "o mesmo assunto escrito de dois jeitos vira duas seções em /topicos/").toEqual([]);
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
  //
  // Só o CORPO do artigo entra na conta. O que fecha a página, a ponte para a
  // canônica, o anterior/próximo e os cards dos outros roadmaps, aponta para
  // fora DE PROPÓSITO: é ele que dá a saída para quem quer sair.
  const doCorpo = async (rota: string) => {
    await page.goto(rota);
    return page
      .locator("article a")
      .evaluateAll((as) =>
        as
          .filter((a) => !a.closest(".pagina-canonica, .continue-explorando, .prevnext, .breadcrumb"))
          .map((a) => a.getAttribute("href") ?? "")
          .filter((h) => /^\/(topicos|roadmaps)\//.test(h))
      );
  };

  // Nos dois roadmaps, e não num tópico escolhido a dedo: quem cita quem é
  // conteúdo, e um artigo perde a citação numa revisão de texto sem avisar.
  let reescritas = 0;
  let deixadas = 0;
  for (const r of ROADMAPS) {
    const dentro = roadmapTopics(r).map((t) => t.slug);
    for (const t of roadmapTopics(r)) {
      for (const href of await doCorpo(`${urlDoTopicoNoRoadmap(r, t.slug)}/`)) {
        if (href.startsWith(`${urlDoRoadmap(r)}/`)) {
          reescritas++;
          continue;
        }
        // Sobrou apontando para a canônica: só pode ser um tópico que ESTE
        // roadmap não cita. Se ele cita, a reescrita falhou e o leitor perde o
        // percurso ao clicar.
        const slug = href.split("/")[2];
        expect(
          dentro,
          `${r.slug}/${t.slug} cita ${slug} pela canônica, e ${r.slug} tem esse tópico`
        ).not.toContain(slug);
        deixadas++;
      }
    }
  }
  expect(reescritas, "nenhuma citação reescrita: a regra não está sendo medida").toBeGreaterThan(20);
  // A outra metade, e ela existe de verdade hoje: os artigos de Listas
  // Encadeadas, BST, Árvores Binárias e Busca Binária citam a Skip List, que
  // saiu da sequência e não está em roadmap nenhum. Esses links continuam
  // canônicos, porque inventar `/roadmaps/fundamentos/skip-list/` seria
  // inventar uma página que não existe.
  expect(deixadas, "nenhuma citação para fora: o caso não está sendo medido").toBeGreaterThan(0);
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
  expect(roadmapsDoTopico(COMPARTILHADO).map((r) => r.slug)).toEqual(
    expect.arrayContaining(["fundamentos", "caminhos-minimos"])
  );
});

test("a página do tópico dentro de um roadmap aponta canonical para a canônica", async ({ page }) => {
  const t = roadmapTopics(EXTRA).find((x) => !isEmptyTopic(x))!;
  const resposta = await page.goto(`${urlDoTopicoNoRoadmap(EXTRA, t.slug)}/`);
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
  const t = roadmapTopics(EXTRA).find((x) => !isEmptyTopic(x))!;
  const corpo = () => page.locator("article h2:not(.continue-explorando h2)").allTextContents();

  await page.goto(`/topicos/${t.slug}/`);
  const naCanonica = await corpo();
  await expect(page.locator("#menu-lateral")).toHaveAttribute("aria-label", `Roadmaps com ${t.name}`);

  await page.goto(`${urlDoTopicoNoRoadmap(EXTRA, t.slug)}/`);
  expect(await corpo(), "as duas rotas pararam de dividir o TopicoPagina").toEqual(naCanonica);
  await expect(page.locator("#menu-lateral")).toHaveAttribute("aria-label", `Roadmap: ${EXTRA.name}`);
});

test("dentro de um roadmap, a navegação não expulsa o leitor dele", async ({ page }) => {
  const lista = roadmapTopics(EXTRA);
  await page.goto(`${urlDoTopicoNoRoadmap(EXTRA, lista[0].slug)}/`);

  const hrefs = await page.locator("#menu-lateral .side-item").evaluateAll((as) =>
    as.map((a) => a.getAttribute("href") ?? "")
  );
  expect(hrefs).toEqual(lista.map((t) => `${urlDoTopicoNoRoadmap(EXTRA, t.slug)}/`));
  await expect(page.locator(".prevnext a.next")).toHaveAttribute(
    "href",
    `${urlDoTopicoNoRoadmap(EXTRA, lista[1].slug)}/`
  );
  await expect(page.locator(".pagina-canonica a")).toHaveAttribute("href", `/topicos/${lista[0].slug}/`);
});

test("a página canônica mostra os roadmaps do tópico, na barra e no fim", async ({ page }) => {
  await page.goto(`/topicos/${COMPARTILHADO}/`);
  const barra = page.locator("#menu-lateral");
  const nomes = await barra.locator(".side-roadmap-titulo").allTextContents();
  expect(nomes).toEqual(roadmapsDoTopico(COMPARTILHADO).map((r) => r.name));

  const banda = page.locator(".continue-explorando");
  await expect(banda.getByRole("heading", { name: /Este tópico faz parte/ })).toBeVisible();
  await expect(banda.locator(`.extra-card[href="${urlDoRoadmap(EXTRA)}/"]`)).toHaveCount(1);
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

  const destino = (origem: string) =>
    regras.find((l) => l.split(/\s+/)[0] === origem)?.split(/\s+/).slice(1).join(" ");
  expect(destino("/topico/*"), "o item no singular").toBe("/topicos/:splat 301");
  expect(destino("/roadmap"), "a sequência principal, do nome antigo").toBe("/roadmaps/fundamentos/ 301");
  expect(destino("/fundamentos/*"), "os Fundamentos, do endereço curto").toBe(
    "/roadmaps/fundamentos/:splat 301"
  );

  const out = path.join(process.cwd(), "out");
  for (const antiga of ["topico", "roadmap", "fundamentos"]) {
    expect(existsSync(path.join(out, antiga)), `/${antiga}/ ainda é página: o 301 nunca roda`).toBe(false);
  }
});

// ---------------------------------------------------------------------------
// 4. A vitrine, o índice e a casca
// ---------------------------------------------------------------------------

for (const [rota, onde] of [
  ["/roadmaps/fundamentos/", "no fim dos Fundamentos"],
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

  // A linha do tópico compartilhado carrega os dois roadmaps dele.
    // `filter` pelo NOME da linha, e não pelo texto dela: a descrição de outro
  // tópico pode citar este, e o `hasText` casaria as duas linhas.
  const linha = page
    .locator(".topico-linha")
    .filter({ has: page.locator(".topico-linha-nome", { hasText: getTopico(COMPARTILHADO)!.name }) });
  const etiquetas = await linha.locator(".ttag-origem").allTextContents();
  expect(etiquetas).toEqual(roadmapsDoTopico(COMPARTILHADO).map((r) => r.name));
});

test("a busca do índice filtra, e o contador acompanha", async ({ page }) => {
  await page.goto("/topicos/");
  // A busca casa nome, assunto e descrição, então o termo traz também quem o
  // menciona no texto. O que o teste cobra é que ela FILTRE (de 47 para um
  // punhado) e que o alvo esteja lá.
  await page.getByLabel("Buscar entre todos os tópicos").fill("Skip");
  const achados = page.locator(".topico-linha");
  expect(await achados.count()).toBeLessThan(TOPICOS.length / 4);
  await expect(achados.locator(".topico-linha-nome", { hasText: "Skip List" })).toHaveCount(1);
  await page.getByLabel("Buscar entre todos os tópicos").fill("zzzzzz");
  await expect(page.locator(".topicos-contagem")).toHaveText("Nenhum tópico com esse filtro.");
});

test("a casca certa em cada rota", async ({ page }) => {
  const barra = () => page.locator("#menu-lateral");

  await page.goto("/roadmaps/fundamentos/");
  await expect(barra()).toHaveAttribute("aria-label", "Fundamentos");

  await page.goto("/roadmaps/fundamentos/big-o/");
  await expect(barra()).toHaveAttribute("aria-label", "Fundamentos");
  await expect(barra().getByLabel("Buscar tópico")).toHaveCount(1);

  await page.goto(`${urlDoRoadmap(EXTRA)}/`);
  await expect(barra()).toHaveAttribute("aria-label", `Roadmap: ${EXTRA.name}`);

  await page.goto("/roadmaps/");
  await expect(barra()).toHaveCount(0);

  await page.goto("/topicos/");
  await expect(barra()).toHaveCount(0);
});

test("os links do topo acendem na área certa", async ({ page }) => {
  const aceso = (href: string) => page.locator(`.nav-left a[href="${href}"].on`);
  await page.goto("/roadmaps/fundamentos/big-o/");
  await expect(aceso("/roadmaps/fundamentos/")).toHaveCount(1);
  await page.goto(`${urlDoRoadmap(EXTRA)}/`);
  await expect(aceso("/roadmaps/")).toHaveCount(1);
  await page.goto(`/topicos/${COMPARTILHADO}/`);
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
  // Hoje não existe roadmap assim, e o teste diz isso em vez de passar vazio.
  // O caminho que ele cobre (sem botão de começar, `noindex`, convite para o
  // Discord) continua no código, e volta a ser medido no primeiro roadmap que
  // nascer só com tópicos "em breve".
  test.skip(!SEM_MATERIAL, "nenhum roadmap sem material no dado de hoje");
  await page.goto(`${urlDoRoadmap(SEM_MATERIAL!)}/`);
  await expect(page.getByRole("link", { name: /^Começar por / })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Acompanhar no Discord/ })).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

// ---------------------------------------------------------------------------
// 6. Progresso e celular
// ---------------------------------------------------------------------------

test("marcar um tópico conta em todo lugar em que ele aparece", async ({ page }) => {
  const nomeCompartilhado = getTopico(COMPARTILHADO)!.name;
  await page.goto(`${urlDoRoadmap(EXTRA)}/`);
  const cartao = (p: typeof page) =>
    p.locator(".topic-card-wrap").filter({ has: p.locator(".topic-card-name", { hasText: nomeCompartilhado }) });
  await cartao(page).getByRole("checkbox").click();

  await page.goto(`/topicos/${COMPARTILHADO}/`);
  await expect(page.locator(".topic-chips .btn-concluir")).toHaveText("✓ Concluído");

  await page.goto("/roadmaps/fundamentos/");
  await expect(cartao(page).getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
});

test("as páginas novas não rolam na horizontal no celular @mobile", async ({ page }) => {
  const dentro = roadmapTopics(EXTRA)[0];
  for (const rota of [
    "/roadmaps/",
    "/topicos/",
    `/topicos/${COMPARTILHADO}/`,
    `${urlDoRoadmap(EXTRA)}/`,
    ...(SEM_MATERIAL ? [`${urlDoRoadmap(SEM_MATERIAL)}/`] : []),
    `${urlDoTopicoNoRoadmap(EXTRA, dentro.slug)}/`,
    "/roadmaps/fundamentos/big-o/",
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
  // O piso vem do dado: é a soma dos tópicos de cada roadmap. Número escrito à
  // mão aqui vira uma edição obrigatória a cada roadmap novo, e o hábito de
  // ajustar o piso é o hábito de não olhar para ele.
  const esperado = ROADMAPS.reduce((n, r) => n + roadmapTopics(r).length, 0);
  expect(paginas.length, "página de roadmap faltando").toBe(esperado);
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
