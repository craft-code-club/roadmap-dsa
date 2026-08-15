import { test, expect } from "@playwright/test";
import { ALL_TOPICS, GROUPS, isEmptyTopic } from "../content/roadmap";
import {
  TRACKS,
  trackHasMaterial,
  trackTopics,
  EXTRA_CARDS,
  getPlacement,
  SITE_TOPICS,
  STANDALONES,
} from "../content/tracks";

// Trilhas e outros tópicos: a vitrine, as duas cascas novas e o que a mudança
// tirou do lugar.
//
// O que este arquivo protege, em uma frase por bloco:
//
//   1. o namespace de slug, que não tem quem o defenda em tempo de teste além
//      do guarda que roda no import — aqui ele é conferido sobre o DADO, para a
//      mensagem de falha ser legível quando quebrar;
//   2. a vitrine aparecendo nos dois lugares que a mostram, com os mesmos itens;
//   3. a casca CERTA em cada tipo de página: barra do roadmap, barra da trilha ou
//      barra nenhuma. É a decisão nova do `Shell`, e é invisível — uma página
//      avulso com o menu dos 45 tópicos ao lado não quebra nada, só desfaz a
//      razão de o tópico avulso existir;
//   4. a Skip List tendo saído mesmo do grupo "Listas Encadeadas" SEM levar a
//      URL dela junto. As duas metades importam: sair sem mudar de URL é o
//      contrato inteiro da mudança;
//   5. o progresso funcionando dentro de uma trilha, que é a promessa do "sua
//      roadmap" aplicada a um roadmap que não é a principal.

const CURSO_COM_MATERIAL = TRACKS.find(trackHasMaterial)!;
const CURSO_SEM_MATERIAL = TRACKS.find((c) => !trackHasMaterial(c))!;
const AVULSA_PRONTA = STANDALONES.find((s) => !isEmptyTopic(s.topic))!;

// ---------------------------------------------------------------------------
// 1. Namespace: um slug, uma página
// ---------------------------------------------------------------------------

test("nenhum slug de tópico se repete entre o roadmap, as trilhas e os avulsos", () => {
  // O `content/tracks.ts` derruba o build com slug repetido, e é ele quem de
  // fato protege isto. Este teste existe pela MENSAGEM: quando alguém repetir um
  // slug, o build morre num stack trace de chunk do Turbopack, e a suíte diz
  // qual é o slug e onde ele está duas vezes.
  const contagem = new Map<string, number>();
  for (const t of SITE_TOPICS) contagem.set(t.slug, (contagem.get(t.slug) ?? 0) + 1);
  const repetidos = [...contagem.entries()].filter(([, n]) => n > 1).map(([s]) => s);
  expect(repetidos, "slugs de tópico repetidos: a segunda página sumiria em silêncio").toEqual([]);
});

test("nenhum slug de trilha colide com um slug de tópico", () => {
  const deTopico = new Set(SITE_TOPICS.map((t) => t.slug));
  const colidem = TRACKS.filter((c) => deTopico.has(c.slug)).map((c) => c.slug);
  expect(colidem, "/trilha/<x>/ e /topico/<x>/ ao mesmo tempo: ninguém sabe qual é qual").toEqual([]);
});

test("nenhum id de grupo se repete entre o roadmap e as trilhas", () => {
  // `Group.id` é chave de React e âncora de URL (`/roadmap/#<id>`). Repetido, a
  // âncora leva ao grupo errado e o React reconcilia duas listas como se fossem
  // a mesma.
  const ids = [...GROUPS.map((g) => g.id), ...TRACKS.flatMap((c) => c.groups.map((g) => g.id))];
  expect(ids.length, "ids de grupo repetidos").toBe(new Set(ids).size);
});

// ---------------------------------------------------------------------------
// 2. A vitrine, nos dois lugares que a mostram
// ---------------------------------------------------------------------------

for (const [rota, onde] of [
  ["/roadmap/", "no fim do roadmap"],
  ["/trilha/", "na página da vitrine"],
] as const) {
  test(`a vitrine ${onde} traz os ${EXTRA_CARDS.length} cards, cada um com o destino certo`, async ({ page }) => {
    await page.goto(rota);
    const cards = page.locator(".extra-card");
    await expect(cards).toHaveCount(EXTRA_CARDS.length);

    // Nome E destino, e não só a contagem: card certo apontando para o lugar
    // errado é o defeito que contar elemento nunca pega.
    for (const c of EXTRA_CARDS) {
      const card = cards.filter({ has: page.locator(".extra-name", { hasText: c.name }) });
      await expect(card, `${rota}: card "${c.name}"`).toHaveCount(1);
      await expect(card).toHaveAttribute("href", c.href);
      await expect(card.locator(".extra-kind")).toHaveText(
        c.kind === "track" ? "Trilha" : "Tópico"
      );
    }
  });
}

test("a seção do fim do roadmap vem DEPOIS do último grupo do roadmap", async ({ page }) => {
  await page.goto("/roadmap/");
  // Posição, e não presença: a vitrine no meio da lista diria que aquilo faz
  // parte da sequência, que é o oposto do que ela é.
  const secoes = await page.locator(".roadmap-wrap > section.rgroup").evaluateAll((els) =>
    els.map((e) => e.id)
  );
  expect(secoes[secoes.length - 1]).toBe("alem-do-roadmap");
  expect(secoes).toContain(GROUPS[GROUPS.length - 1].id);
});

test("a vitrine explica os dois formatos antes de listar", async ({ page }) => {
  await page.goto("/trilha/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Trilhas e outros tópicos");
  const formatos = page.locator(".formato-card");
  await expect(formatos).toHaveCount(2);
  await expect(formatos.first()).toContainText("Tópico");
  await expect(formatos.last()).toContainText("Trilha");
});

// ---------------------------------------------------------------------------
// 3. A casca certa em cada tipo de página
// ---------------------------------------------------------------------------

test("página do roadmap continua com a barra lateral do roadmap", async ({ page }) => {
  await page.goto("/topico/big-o/");
  const barra = page.locator("#menu-lateral");
  await expect(barra).toHaveAttribute("aria-label", "Roadmap de estudos");
  await expect(barra.getByLabel("Buscar tópico")).toHaveCount(1);
  // E ela oferece a porta para fora, no pé da lista.
  await expect(barra.locator(".side-extras")).toHaveAttribute("href", "/trilha/");
});

test("tópico avulso não tem barra lateral nenhuma, e diz isso no layout", async ({ page }) => {
  await page.goto(`/topico/${AVULSA_PRONTA.topic.slug}/`);
  await expect(page.locator("#menu-lateral")).toHaveCount(0);
  await expect(page.locator(".shell")).toHaveClass(/\bsem-lateral\b/);
  // O botão da gaveta some junto: controle apontando por `aria-controls` para um
  // id que não existe é promessa quebrada para quem usa leitor de tela.
  await expect(page.getByRole("button", { name: "Menu de tópicos" })).toHaveCount(0);
  await expect(page.locator('[aria-controls="menu-lateral"]')).toHaveCount(0);
});

test("tópico avulso fecha com a banda de vizinhos, e não com anterior/próximo", async ({ page }) => {
  await page.goto(`/topico/${AVULSA_PRONTA.topic.slug}/`);
  // Ela não está numa fila: "próximo" ali seria uma continuação inventada.
  await expect(page.locator(".prevnext")).toHaveCount(0);
  const banda = page.locator(".continue-explorando");
  await expect(banda.getByRole("heading", { name: "Continue explorando" })).toBeVisible();
  const cards = banda.locator(".extra-card");
  await expect(cards).toHaveCount(2);
  // E ela não sugere a própria página.
  await expect(banda.locator(`.extra-card[href="/topico/${AVULSA_PRONTA.topic.slug}/"]`)).toHaveCount(0);
  await expect(banda.getByRole("link", { name: /Ver tudo/ })).toHaveAttribute("href", "/trilha/");
});

test("tópico de trilha recebe a barra DAQUELE trilha, e não a do roadmap", async ({ page }) => {
  const primeiro = trackTopics(CURSO_COM_MATERIAL).find((t) => !isEmptyTopic(t))!;
  await page.goto(`/topico/${primeiro.slug}/`);

  const barra = page.locator("#menu-lateral");
  await expect(barra).toHaveAttribute("aria-label", `Trilha: ${CURSO_COM_MATERIAL.name}`);

  // A lista é exatamente a da trilha. As duas metades: os da trilha estão, e
  // nenhum do roadmap entrou — a barra errada é indistinguível da certa se você
  // só confere que o tópico atual aparece.
  const links = await barra.locator(".side-item").evaluateAll((as) =>
    as.map((a) => a.getAttribute("href") ?? "")
  );
  expect(links).toEqual(trackTopics(CURSO_COM_MATERIAL).map((t) => `/topico/${t.slug}/`));
  for (const t of ALL_TOPICS.slice(0, 5)) {
    expect(links, "tópico do roadmap vazou para a barra da trilha").not.toContain(`/topico/${t.slug}/`);
  }

  // E as portas de saída: a volta para o roadmap e o nome da trilha, que leva à
  // abertura dele.
  await expect(barra.locator(".side-voltar")).toHaveAttribute("href", "/roadmap/");
  await expect(barra.locator(".side-trilha-nome")).toHaveAttribute(
    "href",
    `/trilha/${CURSO_COM_MATERIAL.slug}/`
  );
});

test("o rastro de navegação tem uma forma por tipo de página", async ({ page }) => {
  const doTopico = async (slug: string) =>
    page.locator(".breadcrumb").evaluate((el) =>
      [...el.children].map((c) => c.textContent?.trim() ?? "").filter((s) => s !== "" && s !== "/")
    );

  await page.goto("/topico/big-o/");
  expect(await doTopico("big-o")).toEqual(["Início", "Introdução", "Notação Big O"]);

  await page.goto(`/topico/${AVULSA_PRONTA.topic.slug}/`);
  expect(await doTopico(AVULSA_PRONTA.topic.slug)).toEqual([
    "Início",
    "Trilhas",
    AVULSA_PRONTA.topic.name,
  ]);

  const doCurso = trackTopics(CURSO_COM_MATERIAL).find((t) => !isEmptyTopic(t))!;
  await page.goto(`/topico/${doCurso.slug}/`);
  expect(await doTopico(doCurso.slug)).toEqual([
    "Início",
    "Trilhas",
    CURSO_COM_MATERIAL.name,
    doCurso.name,
  ]);
});

test("o link Trilhas do topo acende em toda a área de trilhas", async ({ page }) => {
  const aceso = () => page.locator('.nav-left a[href="/trilha/"].on');
  for (const rota of [
    "/trilha/",
    `/trilha/${CURSO_COM_MATERIAL.slug}/`,
    `/topico/${AVULSA_PRONTA.topic.slug}/`,
  ]) {
    await page.goto(rota);
    await expect(aceso(), `${rota} devia acender o link Trilhas`).toHaveCount(1);
  }
  // E apaga fora dela.
  await page.goto("/topico/big-o/");
  await expect(aceso()).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// 4. A abertura de uma trilha
// ---------------------------------------------------------------------------

test("a abertura da trilha mostra os tópicos dele, os pré-requisitos e por onde começar", async ({ page }) => {
  const c = CURSO_COM_MATERIAL;
  await page.goto(`/trilha/${c.slug}/`);
  await expect(page.getByRole("heading", { level: 1, name: c.name })).toBeVisible();

  // um card por tópico da trilha, na ordem da trilha
  const nomes = await page.locator(".topic-card-name").allTextContents();
  expect(nomes).toEqual(trackTopics(c).map((t) => t.name));

  // "Antes daqui" aponta para tópicos que existem no roadmap
  const reqs = await page.locator(".req-link").evaluateAll((as) =>
    as.map((a) => a.getAttribute("href") ?? "")
  );
  expect(reqs).toEqual((c.requires ?? []).map((s) => `/topico/${s}/`));
  for (const href of reqs) {
    const slug = href.replace("/topico/", "").replace(/\/$/, "");
    expect(SITE_TOPICS.some((t) => t.slug === slug), `${href} não é tópico`).toBe(true);
  }

  const primeiro = trackTopics(c).find((t) => !isEmptyTopic(t))!;
  await page.getByRole("link", { name: `Começar por ${primeiro.name}` }).click();
  await expect(page).toHaveURL(new RegExp(`/topico/${primeiro.slug}/`));
});

test("trilha ainda sem material não finge que dá para começar", async ({ page }) => {
  const c = CURSO_SEM_MATERIAL;
  await page.goto(`/trilha/${c.slug}/`);
  // Botão "Começar por…" levaria a uma página "em breve": pior que não existir.
  await expect(page.getByRole("link", { name: /^Começar por / })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Acompanhar no Discord/ })).toHaveCount(1);
  await expect(page.locator(".topic-chips")).toContainText("conteúdo em produção");
  // E ele não pede lugar no índice do Google.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("o primeiro tópico de uma trilha volta para a abertura, não para o vazio", async ({ page }) => {
  const c = CURSO_COM_MATERIAL;
  const [primeiro, segundo] = trackTopics(c);
  await page.goto(`/topico/${primeiro.slug}/`);
  const anterior = page.locator(".prevnext a").first();
  await expect(anterior).toHaveAttribute("href", `/trilha/${c.slug}/`);
  await expect(anterior).toContainText("Abertura da trilha");
  // E o próximo é o vizinho DENTRO da trilha, não o do roadmap.
  await expect(page.locator(".prevnext a.next")).toHaveAttribute("href", `/topico/${segundo.slug}/`);
});

// ---------------------------------------------------------------------------
// 5. A Skip List mudou de vizinhança, não de endereço
// ---------------------------------------------------------------------------

test("a Skip List saiu do grupo Listas Encadeadas", async ({ page }) => {
  expect(
    ALL_TOPICS.map((t) => t.slug),
    "skip-list voltou para o roadmap"
  ).not.toContain("skip-list");
  expect(getPlacement("skip-list")?.kind).toBe("standalone");

  await page.goto("/roadmap/");
  const grupo = page.locator("section#listas");
  await expect(grupo.locator(".topic-card-name")).toHaveText(["Listas Encadeadas"]);
  await expect(grupo.locator('a[href^="/topico/skip-list"]')).toHaveCount(0);
});

test("a URL da Skip List não mudou, e a página continua completa", async ({ page }) => {
  // A mudança inteira depende disto: recategorizar não pode custar a URL que o
  // Google já indexou e que circula em link de comunidade.
  const resposta = await page.goto("/topico/skip-list/");
  expect(resposta?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Skip List" })).toBeVisible();
  await expect(page.locator("article figure.viz").first()).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/topico\/skip-list\/$/
  );
});

// ---------------------------------------------------------------------------
// 6. Progresso dentro de uma trilha
// ---------------------------------------------------------------------------

test("marcar um tópico de trilha conta na barra daquela trilha, e não no roadmap", async ({ page }) => {
  const c = CURSO_COM_MATERIAL;
  const topicos = trackTopics(c);
  const alvo = topicos.find((t) => !isEmptyTopic(t))!;

  await page.goto(`/topico/${alvo.slug}/`);
  const barra = page.locator("#menu-lateral");
  await expect(barra.locator(".side-count")).toHaveText(`0/${topicos.length} · 0%`);

  await barra.getByRole("checkbox", { name: `Marcar ${alvo.name} como concluído` }).click();
  const pct = Math.round((1 / topicos.length) * 100);
  await expect(barra.locator(".side-count")).toHaveText(`1/${topicos.length} · ${pct}%`);

  // O contador da TRILHA não se mexe: um tópico de trilha não é um degrau dela.
  await page.goto("/topico/big-o/");
  const daTrilha = await page.locator("#menu-lateral .side-head .side-count").textContent();
  expect(daTrilha).toMatch(/^0\//);

  // E o card da trilha na vitrine passa a contar o concluído.
  await page.goto("/trilha/");
  const card = page.locator(".extra-card").filter({ has: page.locator(".extra-name", { hasText: c.name }) });
  await expect(card.locator(".extra-meta")).toHaveText(`1 de ${topicos.length} concluídos`);
});

// ---------------------------------------------------------------------------
// 7. Celular
// ---------------------------------------------------------------------------

test("as páginas novas não rolam na horizontal no celular @mobile", async ({ page }) => {
  for (const rota of [
    "/trilha/",
    `/trilha/${CURSO_COM_MATERIAL.slug}/`,
    `/trilha/${CURSO_SEM_MATERIAL.slug}/`,
    `/topico/${AVULSA_PRONTA.topic.slug}/`,
  ]) {
    await page.goto(rota);
    const estoura = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(estoura, `${rota} estoura a largura no celular`).toBe(false);
  }
});

test("no celular, Trilhas continua alcançável pelo menu ⋯ @mobile", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mais opções" }).click();
  const menu = page.locator(".nav-menu");
  await expect(menu.getByRole("link", { name: /Trilhas e outros tópicos/ })).toHaveAttribute(
    "href",
    "/trilha/"
  );
});
