import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { ALL_TOPICS, GROUPS, isEmptyTopic } from "../content/fundamentos";
import {
  EXTRA_CARDS,
  getPlacement,
  ROADMAPS,
  roadmapGroups,
  roadmapHasMaterial,
  roadmapsQueCitam,
  roadmapTopics,
  SITE_TOPICS,
  STANDALONES,
  todasAsPaginasDeRoadmap,
} from "../content/roadmaps";

// Fundamentos, roadmaps e tópicos avulsos: as três casas, e o tópico que está
// em duas ao mesmo tempo.
//
// O que este arquivo protege, em uma frase por bloco:
//
//   1. o namespace de slug, que não tem quem o defenda em tempo de teste além
//      do guarda que roda no import — aqui ele é conferido sobre o DADO, para a
//      mensagem de falha ser legível quando quebrar;
//   2. o REGISTRO: um arquivo em `content/roadmaps/` que ninguém importou é um
//      roadmap invisível, e nada além deste teste percebe;
//   3. a citação: o mesmo tópico em dois roadmaps, com uma casa só, uma página
//      canônica só e uma URL por roadmap apontando de volta para ela;
//   4. a casca CERTA em cada tipo de página. É a decisão do `Shell`, e é
//      invisível — um tópico avulso com o menu dos 44 Fundamentos ao lado não
//      quebra nada, só desfaz a razão de ele existir;
//   5. a Skip List tendo saído mesmo do grupo "Listas Encadeadas" SEM levar a
//      URL dela junto.

const COM_MATERIAL = ROADMAPS.find(roadmapHasMaterial)!;
const SEM_MATERIAL = ROADMAPS.find((r) => !roadmapHasMaterial(r))!;
const AVULSO_PRONTO = STANDALONES.find((s) => !isEmptyTopic(s.topic))!;
const BANCOS = ROADMAPS.find((r) => r.slug === "bancos-de-dados")!;

// ---------------------------------------------------------------------------
// 1. Namespace: um slug, uma página
// ---------------------------------------------------------------------------

test("nenhum slug de tópico se repete entre as três casas", () => {
  // O `content/roadmaps/index.ts` derruba o build com slug repetido, e é ele
  // quem de fato protege isto. Este teste existe pela MENSAGEM: quando alguém
  // repetir um slug, o build morre num stack trace de chunk do Turbopack, e a
  // suíte diz qual é o slug.
  const contagem = new Map<string, number>();
  for (const t of SITE_TOPICS) contagem.set(t.slug, (contagem.get(t.slug) ?? 0) + 1);
  const repetidos = [...contagem.entries()].filter(([, n]) => n > 1).map(([s]) => s);
  expect(repetidos, "slugs repetidos: a segunda página sumiria em silêncio").toEqual([]);
});

test("nenhum slug de roadmap colide com um slug de tópico", () => {
  const deTopico = new Set(SITE_TOPICS.map((t) => t.slug));
  const colidem = ROADMAPS.filter((r) => deTopico.has(r.slug)).map((r) => r.slug);
  expect(colidem, "/roadmaps/<x>/ e /topico/<x>/ ao mesmo tempo").toEqual([]);
});

test("nenhum id de grupo se repete entre os Fundamentos e os roadmaps", () => {
  const ids = [...GROUPS.map((g) => g.id), ...ROADMAPS.flatMap((r) => r.groups.map((g) => g.id))];
  expect(ids.length, "ids de grupo repetidos").toBe(new Set(ids).size);
});

// ---------------------------------------------------------------------------
// 2. O registro: a pasta e o índice contam a mesma história
// ---------------------------------------------------------------------------

test("todo arquivo de content/roadmaps/ está registrado no índice, e vice-versa", () => {
  // Este é o teste que permite a lista à mão do `index.ts` existir sem
  // envelhecer. O módulo é importado por componente de cliente, e código de
  // cliente não tem `fs`: não dá para varrer a pasta em tempo de execução. Aqui
  // dá — e "criar o arquivo e esquecer de registrar" passa a reprovar com o
  // nome do arquivo na mensagem, em vez de publicar um roadmap invisível.
  const dir = path.join(process.cwd(), "content", "roadmaps");
  const arquivos = readdirSync(dir)
    .filter((f) => f.endsWith(".ts") && f !== "index.ts")
    .map((f) => f.replace(/\.ts$/, ""))
    .sort();
  const registrados = ROADMAPS.map((r) => r.slug).sort();

  expect(
    arquivos.filter((f) => !registrados.includes(f)),
    "arquivo em content/roadmaps/ que o índice não importa: o roadmap não existe no site"
  ).toEqual([]);
  expect(
    registrados.filter((s) => !arquivos.includes(s)),
    "roadmap registrado cujo arquivo não se chama <slug>.ts"
  ).toEqual([]);
});

// ---------------------------------------------------------------------------
// 3. O mesmo tópico em dois roadmaps
// ---------------------------------------------------------------------------

test("o dado tem, de fato, tópicos citados por mais de uma casa", () => {
  // Sem esta asserção o resto do bloco poderia passar sobre zero casos, que é
  // como uma funcionalidade inteira vira teste verde e site sem ela.
  const citados = SITE_TOPICS.filter((t) => roadmapsQueCitam(t.slug).length > 0);
  expect(citados.length, "nenhum tópico é citado: o exemplo de reuso sumiu").toBeGreaterThanOrEqual(4);

  // E a Tabela Hash é o caso canônico: mora nos Fundamentos, aparece em Bancos
  // de Dados.
  expect(getPlacement("hash-table")?.kind).toBe("fundamentos");
  expect(roadmapsQueCitam("hash-table").map((r) => r.slug)).toContain("bancos-de-dados");
});

test("citar não muda a casa: o dono continua sendo um só", () => {
  for (const t of SITE_TOPICS) {
    const casas = roadmapsQueCitam(t.slug);
    const dono = getPlacement(t.slug);
    expect(dono, `${t.slug} não tem casa`).toBeTruthy();
    // O dono nunca aparece na lista de quem cita: senão a página canônica
    // ofereceria ao leitor um link para a casa em que ele já está.
    if (dono?.kind === "roadmap") {
      expect(casas.map((r) => r.slug), t.slug).not.toContain(dono.roadmap.slug);
    }
  }
});

test("a página do tópico dentro de um roadmap aponta canonical para a canônica", async ({ page }) => {
  const t = roadmapTopics(BANCOS).find((x) => !isEmptyTopic(x))!;
  const resposta = await page.goto(`/roadmaps/${BANCOS.slug}/${t.slug}/`);
  expect(resposta?.status()).toBe(200);

  // Mesmo conteúdo, outro endereço: sem canonical o Google escolhe sozinho qual
  // mostrar e divide os sinais entre as duas.
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    new RegExp(`/topico/${t.slug}/$`)
  );
  // og:url acompanha o canonical: é a URL que queremos que circule.
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    new RegExp(`/topico/${t.slug}/$`)
  );
  // E ela não declara o recurso de novo: quem declara é a canônica.
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1); // só o do layout
});

test("o mesmo artigo aparece nas duas URLs, com cascas diferentes", async ({ page }) => {
  const t = roadmapTopics(BANCOS).find((x) => !isEmptyTopic(x))!;

  await page.goto(`/topico/${t.slug}/`);
  const naCanonica = await page.locator("article h2:not(.continue-explorando h2)").allTextContents();
  const casaDele = getPlacement(t.slug);
  await expect(page.locator("#menu-lateral")).toHaveCount(casaDele?.kind === "standalone" ? 0 : 1);

  await page.goto(`/roadmaps/${BANCOS.slug}/${t.slug}/`);
  const noRoadmap = await page.locator("article h2:not(.continue-explorando h2)").allTextContents();
  // O MESMO artigo: se o corpo divergir, é porque as duas rotas pararam de
  // dividir o `TopicoPagina` e viraram duas páginas envelhecendo em paralelo.
  expect(noRoadmap).toEqual(naCanonica);
  // E a casca é a do roadmap, sempre.
  await expect(page.locator("#menu-lateral")).toHaveAttribute("aria-label", `Roadmap: ${BANCOS.name}`);
});

test("dentro de um roadmap, a navegação não expulsa o leitor dele", async ({ page }) => {
  const lista = roadmapTopics(BANCOS);
  await page.goto(`/roadmaps/${BANCOS.slug}/${lista[0].slug}/`);

  // Os links da barra apontam para dentro do roadmap, não para as canônicas.
  const hrefs = await page.locator("#menu-lateral .side-item").evaluateAll((as) =>
    as.map((a) => a.getAttribute("href") ?? "")
  );
  expect(hrefs).toEqual(lista.map((t) => `/roadmaps/${BANCOS.slug}/${t.slug}/`));

  // Anterior/próximo também.
  await expect(page.locator(".prevnext a.next")).toHaveAttribute(
    "href",
    `/roadmaps/${BANCOS.slug}/${lista[1].slug}/`
  );
  // E existe a ponte de saída para a página canônica, que é como o leitor
  // salva ou compartilha o tópico sem levar o contexto junto.
  await expect(page.locator(".pagina-canonica a")).toHaveAttribute(
    "href",
    `/topico/${lista[0].slug}/`
  );
});

test("a página canônica oferece os roadmaps de que o tópico faz parte", async ({ page }) => {
  await page.goto("/topico/hash-table/");
  const banda = page.locator(".continue-explorando");
  await expect(banda.getByRole("heading", { name: /Este tópico faz parte/ })).toBeVisible();
  await expect(banda.locator(`.extra-card[href="/roadmaps/${BANCOS.slug}/"]`)).toHaveCount(1);

  // Ela vem DEPOIS do anterior/próximo: continuar a sequência é a oferta
  // principal, mudar de sequência é a segunda.
  const ordem = await page.locator("article > .prevnext, article > .continue-explorando").evaluateAll((els) =>
    els.map((e) => e.className.split(" ")[0])
  );
  expect(ordem).toEqual(["prevnext", "continue-explorando"]);
});

test("a abertura do roadmap avisa quando os tópicos vêm de outra casa", async ({ page }) => {
  await page.goto(`/roadmaps/${BANCOS.slug}/`);
  await expect(page.locator(".roadmap-emprestados")).toBeVisible();
  // O card de um tópico citado carrega a etiqueta da casa dele.
  const card = page.locator(".topic-card-wrap").filter({ hasText: "Tabelas Hash" });
  await expect(card.locator(".ttag-origem")).toHaveText("Fundamentos");
});

// ---------------------------------------------------------------------------
// 4. A vitrine e o índice completo
// ---------------------------------------------------------------------------

for (const [rota, onde] of [
  ["/fundamentos/", "no fim dos Fundamentos"],
  ["/roadmaps/", "na página da vitrine"],
] as const) {
  test(`a vitrine ${onde} traz os ${EXTRA_CARDS.length} cards, cada um com o destino certo`, async ({ page }) => {
    await page.goto(rota);
    const cards = page.locator(".extra-card");
    await expect(cards).toHaveCount(EXTRA_CARDS.length);

    for (const c of EXTRA_CARDS) {
      const card = cards.filter({ has: page.locator(".extra-name", { hasText: c.name }) });
      await expect(card, `${rota}: card "${c.name}"`).toHaveCount(1);
      await expect(card).toHaveAttribute("href", c.href);
      await expect(card.locator(".extra-kind")).toHaveText(
        c.kind === "roadmap" ? "Roadmap" : "Tópico"
      );
    }
  });
}

test("o índice /topicos/ lista TODO tópico do site", async ({ page }) => {
  await page.goto("/topicos/");
  await expect(page.getByRole("heading", { level: 1, name: "Todos os tópicos" })).toBeVisible();

  const linhas = page.locator(".topico-linha");
  // Cada tópico aparece uma vez por casa que o lista: os Fundamentos, o roadmap
  // dono, e cada roadmap que o cita. O total confere com o dado.
  const esperado =
    ALL_TOPICS.length +
    ROADMAPS.reduce((n, r) => n + roadmapTopics(r).length, 0) +
    STANDALONES.length;
  await expect(linhas).toHaveCount(esperado);

  // E nenhum tópico do site fica de fora.
  const nomes = new Set(await page.locator(".topico-linha-nome").allTextContents());
  const faltando = SITE_TOPICS.filter((t) => ![...nomes].some((n) => n.startsWith(t.name)));
  expect(faltando.map((t) => t.slug), "tópicos fora do índice completo").toEqual([]);
});

test("a busca do índice filtra, e o contador acompanha", async ({ page }) => {
  await page.goto("/topicos/");
  const contagem = page.locator(".topicos-contagem");
  await page.getByLabel("Buscar entre todos os tópicos").fill("bloom");
  await expect(page.locator(".topico-linha")).toHaveCount(2); // a casa dele e a citação
  await expect(contagem).toContainText("2");

  // Filtro que não casa com nada diz isso, em vez de devolver uma tela vazia.
  await page.getByLabel("Buscar entre todos os tópicos").fill("zzzzzz");
  await expect(contagem).toHaveText("Nenhum tópico com esse filtro.");
});

// ---------------------------------------------------------------------------
// 5. A casca certa em cada tipo de página
// ---------------------------------------------------------------------------

test("página dos Fundamentos continua com a barra lateral dos Fundamentos", async ({ page }) => {
  await page.goto("/topico/big-o/");
  const barra = page.locator("#menu-lateral");
  await expect(barra).toHaveAttribute("aria-label", "Fundamentos");
  await expect(barra.getByLabel("Buscar tópico")).toHaveCount(1);
  await expect(barra.locator(".side-extras")).toHaveAttribute("href", "/roadmaps/");
});

test("tópico avulso não tem barra lateral nenhuma, e diz isso no layout", async ({ page }) => {
  await page.goto(`/topico/${AVULSO_PRONTO.topic.slug}/`);
  await expect(page.locator("#menu-lateral")).toHaveCount(0);
  await expect(page.locator(".shell")).toHaveClass(/\bsem-lateral\b/);
  await expect(page.getByRole("button", { name: "Menu de tópicos" })).toHaveCount(0);
  await expect(page.locator('[aria-controls="menu-lateral"]')).toHaveCount(0);
});

test("o rastro de navegação tem uma forma por tipo de página", async ({ page }) => {
  const rastro = () =>
    page.locator(".breadcrumb").evaluate((el) =>
      [...el.children].map((c) => c.textContent?.trim() ?? "").filter((s) => s !== "" && s !== "/")
    );

  await page.goto("/topico/big-o/");
  expect(await rastro()).toEqual(["Início", "Introdução", "Notação Big O"]);

  await page.goto(`/topico/${AVULSO_PRONTO.topic.slug}/`);
  expect(await rastro()).toEqual(["Início", "Roadmaps", AVULSO_PRONTO.topic.name]);

  const doRoadmap = roadmapTopics(COM_MATERIAL).find((t) => getPlacement(t.slug)?.kind === "roadmap")!;
  await page.goto(`/topico/${doRoadmap.slug}/`);
  expect(await rastro()).toEqual(["Início", "Roadmaps", COM_MATERIAL.name, doRoadmap.name]);

  const dentro = roadmapTopics(BANCOS)[0];
  await page.goto(`/roadmaps/${BANCOS.slug}/${dentro.slug}/`);
  expect(await rastro()).toEqual(["Início", "Roadmaps", BANCOS.name, dentro.name]);
});

test("os links do topo acendem na área certa", async ({ page }) => {
  const aceso = (href: string) => page.locator(`.nav-left a[href="${href}"].on`);
  for (const rota of ["/roadmaps/", `/roadmaps/${BANCOS.slug}/`, `/topico/${AVULSO_PRONTO.topic.slug}/`]) {
    await page.goto(rota);
    await expect(aceso("/roadmaps/"), `${rota} devia acender Roadmaps`).toHaveCount(1);
  }
  await page.goto("/topicos/");
  await expect(aceso("/topicos/")).toHaveCount(1);
  await page.goto("/topico/big-o/");
  await expect(aceso("/roadmaps/")).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// 6. A abertura de um roadmap
// ---------------------------------------------------------------------------

test("a abertura mostra os tópicos, os pré-requisitos e por onde começar", async ({ page }) => {
  const r = COM_MATERIAL;
  await page.goto(`/roadmaps/${r.slug}/`);
  await expect(page.getByRole("heading", { level: 1, name: r.name })).toBeVisible();

  const nomes = await page.locator(".topic-card-name").allTextContents();
  expect(nomes).toEqual(roadmapTopics(r).map((t) => t.name));

  const reqs = await page.locator(".req-link").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
  expect(reqs).toEqual((r.requires ?? []).map((s) => `/topico/${s}/`));

  const primeiro = roadmapTopics(r).find((t) => !isEmptyTopic(t))!;
  await page.getByRole("link", { name: `Começar por ${primeiro.name}` }).click();
  await expect(page).toHaveURL(new RegExp(`/roadmaps/${r.slug}/${primeiro.slug}/`));
});

test("roadmap ainda sem material não finge que dá para começar", async ({ page }) => {
  await page.goto(`/roadmaps/${SEM_MATERIAL.slug}/`);
  await expect(page.getByRole("link", { name: /^Começar por / })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Acompanhar no Discord/ })).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

// ---------------------------------------------------------------------------
// 7. A Skip List mudou de vizinhança, não de endereço
// ---------------------------------------------------------------------------

test("a Skip List saiu do grupo Listas Encadeadas", async ({ page }) => {
  expect(ALL_TOPICS.map((t) => t.slug)).not.toContain("skip-list");
  expect(getPlacement("skip-list")?.kind).toBe("standalone");

  await page.goto("/fundamentos/");
  const grupo = page.locator("section#listas");
  await expect(grupo.locator(".topic-card-name")).toHaveText(["Listas Encadeadas"]);
});

test("a URL da Skip List não mudou, e a página continua completa", async ({ page }) => {
  const resposta = await page.goto("/topico/skip-list/");
  expect(resposta?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Skip List" })).toBeVisible();
  await expect(page.locator("article figure.viz").first()).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/topico\/skip-list\/$/);
});

test("o /roadmap/ antigo tem redirecionamento declarado para /fundamentos/", () => {
  // A rota mais indexada do site depois da home mudou de endereço. O
  // `_redirects` é o que transfere o histórico dela em vez de jogá-lo fora, e
  // ele não é HTML: não passa por navegador nenhum, então a prova é o ARTEFATO
  // do build.
  const conteudo = readFileSync(path.join(process.cwd(), "out", "_redirects"), "utf8");
  const regras = conteudo
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "" && !l.startsWith("#"));
  expect(regras).toContain("/roadmap/  /fundamentos/  301");
  expect(regras.some((l) => l.startsWith("/roadmap ") || l.startsWith("/roadmap\t"))).toBe(true);
});

// ---------------------------------------------------------------------------
// 8. Progresso
// ---------------------------------------------------------------------------

test("marcar um tópico citado conta nas duas casas", async ({ page }) => {
  // É a promessa que a etiqueta "Fundamentos" no card faz: o progresso é do
  // TÓPICO, não da lista em que ele aparece.
  await page.goto(`/roadmaps/${BANCOS.slug}/`);
  const card = page.locator(".topic-card-wrap").filter({ hasText: "Tabelas Hash" });
  await card.getByRole("checkbox").click();

  await page.goto("/topico/hash-table/");
  await expect(page.locator(".topic-chips .btn-concluir")).toHaveText("✓ Concluído");

  await page.goto("/fundamentos/");
  const naCasa = page.locator(".topic-card-wrap").filter({ hasText: "Tabelas Hash" });
  await expect(naCasa.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
});

// ---------------------------------------------------------------------------
// 9. Celular
// ---------------------------------------------------------------------------

test("as páginas novas não rolam na horizontal no celular @mobile", async ({ page }) => {
  const dentro = roadmapTopics(BANCOS)[0];
  for (const rota of [
    "/roadmaps/",
    "/topicos/",
    `/roadmaps/${BANCOS.slug}/`,
    `/roadmaps/${SEM_MATERIAL.slug}/`,
    `/roadmaps/${BANCOS.slug}/${dentro.slug}/`,
    `/topico/${AVULSO_PRONTO.topic.slug}/`,
  ]) {
    await page.goto(rota);
    const estoura = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(estoura, `${rota} estoura a largura no celular`).toBe(false);
  }
});

test("no celular, Roadmaps e Tópicos continuam alcançáveis pelo menu ⋯ @mobile", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mais opções" }).click();
  const menu = page.locator(".nav-menu");
  await expect(menu.getByRole("link", { name: /Roadmaps/ })).toHaveAttribute("href", "/roadmaps/");
  await expect(menu.getByRole("link", { name: /Todos os tópicos/ })).toHaveAttribute("href", "/topicos/");
});

// ---------------------------------------------------------------------------
// 10. Toda página de roadmap existe mesmo
// ---------------------------------------------------------------------------

test("toda combinação (roadmap, tópico) tem página gerada", async ({ page }) => {
  const paginas = todasAsPaginasDeRoadmap();
  expect(paginas.length, "nenhuma página de roadmap gerada").toBeGreaterThan(20);
  // Amostra: a primeira de cada roadmap. Visitar as ~40 custaria minutos e não
  // acharia classe nova de defeito, porque todas saem do mesmo template.
  for (const r of ROADMAPS) {
    const primeiro = roadmapTopics(r)[0];
    const resposta = await page.goto(`/roadmaps/${r.slug}/${primeiro.slug}/`);
    expect(resposta?.status(), `/roadmaps/${r.slug}/${primeiro.slug}/`).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: primeiro.name })).toBeVisible();
  }
});

test("os grupos de um roadmap resolvem todas as citações", () => {
  // Citação que não resolve é descartada em silêncio pelo resolvedor (quem
  // grita é o guarda no import). Aqui a conta fecha por fora: o número de itens
  // resolvidos tem que bater com o número de itens escritos.
  for (const r of ROADMAPS) {
    const escritos = r.groups.reduce((n, g) => n + g.topics.length, 0);
    const resolvidos = roadmapGroups(r).reduce((n, g) => n + g.itens.length, 0);
    expect(resolvidos, `o roadmap "${r.name}" perdeu citações pelo caminho`).toBe(escritos);
  }
});
