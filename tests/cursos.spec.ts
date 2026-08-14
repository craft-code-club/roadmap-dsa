import { test, expect } from "@playwright/test";
import { ALL_TOPICS, GROUPS, isEmptyTopic } from "../content/roadmap";
import {
  COURSES,
  courseHasMaterial,
  courseTopics,
  EXTRA_CARDS,
  getPlacement,
  SITE_TOPICS,
  STANDALONES,
} from "../content/courses";

// Cursos e outras estruturas: a vitrine, as duas cascas novas e o que a mudança
// tirou do lugar.
//
// O que este arquivo protege, em uma frase por bloco:
//
//   1. o namespace de slug, que não tem quem o defenda em tempo de teste além
//      do guarda que roda no import — aqui ele é conferido sobre o DADO, para a
//      mensagem de falha ser legível quando quebrar;
//   2. a vitrine aparecendo nos dois lugares que a mostram, com os mesmos itens;
//   3. a casca CERTA em cada tipo de página: barra da trilha, barra do curso ou
//      barra nenhuma. É a decisão nova do `Shell`, e é invisível — uma página
//      avulsa com o menu dos 45 tópicos ao lado não quebra nada, só desfaz a
//      razão de a página avulsa existir;
//   4. a Skip List tendo saído mesmo do grupo "Listas Encadeadas" SEM levar a
//      URL dela junto. As duas metades importam: sair sem mudar de URL é o
//      contrato inteiro da mudança;
//   5. o progresso funcionando dentro de um curso, que é a promessa do "sua
//      trilha" aplicada a uma trilha que não é a principal.

const CURSO_COM_MATERIAL = COURSES.find(courseHasMaterial)!;
const CURSO_SEM_MATERIAL = COURSES.find((c) => !courseHasMaterial(c))!;
const AVULSA_PRONTA = STANDALONES.find((s) => !isEmptyTopic(s.topic))!;

// ---------------------------------------------------------------------------
// 1. Namespace: um slug, uma página
// ---------------------------------------------------------------------------

test("nenhum slug de tópico se repete entre a trilha, os cursos e as avulsas", () => {
  // O `content/courses.ts` derruba o build com slug repetido, e é ele quem de
  // fato protege isto. Este teste existe pela MENSAGEM: quando alguém repetir um
  // slug, o build morre num stack trace de chunk do Turbopack, e a suíte diz
  // qual é o slug e onde ele está duas vezes.
  const contagem = new Map<string, number>();
  for (const t of SITE_TOPICS) contagem.set(t.slug, (contagem.get(t.slug) ?? 0) + 1);
  const repetidos = [...contagem.entries()].filter(([, n]) => n > 1).map(([s]) => s);
  expect(repetidos, "slugs de tópico repetidos: a segunda página sumiria em silêncio").toEqual([]);
});

test("nenhum slug de curso colide com um slug de tópico", () => {
  const deTopico = new Set(SITE_TOPICS.map((t) => t.slug));
  const colidem = COURSES.filter((c) => deTopico.has(c.slug)).map((c) => c.slug);
  expect(colidem, "/cursos/<x>/ e /topico/<x>/ ao mesmo tempo: ninguém sabe qual é qual").toEqual([]);
});

test("nenhum id de grupo se repete entre a trilha e os cursos", () => {
  // `Group.id` é chave de React e âncora de URL (`/roadmap/#<id>`). Repetido, a
  // âncora leva ao grupo errado e o React reconcilia duas listas como se fossem
  // a mesma.
  const ids = [...GROUPS.map((g) => g.id), ...COURSES.flatMap((c) => c.groups.map((g) => g.id))];
  expect(ids.length, "ids de grupo repetidos").toBe(new Set(ids).size);
});

// ---------------------------------------------------------------------------
// 2. A vitrine, nos dois lugares que a mostram
// ---------------------------------------------------------------------------

for (const [rota, onde] of [
  ["/roadmap/", "no fim do roadmap"],
  ["/cursos/", "na página da vitrine"],
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
        c.kind === "curso" ? "Curso" : "Página avulsa"
      );
    }
  });
}

test("a seção do fim do roadmap vem DEPOIS do último grupo da trilha", async ({ page }) => {
  await page.goto("/roadmap/");
  // Posição, e não presença: a vitrine no meio da lista diria que aquilo faz
  // parte da sequência, que é o oposto do que ela é.
  const secoes = await page.locator(".roadmap-wrap > section.rgroup").evaluateAll((els) =>
    els.map((e) => e.id)
  );
  expect(secoes[secoes.length - 1]).toBe("alem-da-trilha");
  expect(secoes).toContain(GROUPS[GROUPS.length - 1].id);
});

test("a vitrine explica os dois formatos antes de listar", async ({ page }) => {
  await page.goto("/cursos/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Cursos e outras estruturas");
  const formatos = page.locator(".formato-card");
  await expect(formatos).toHaveCount(2);
  await expect(formatos.first()).toContainText("Página avulsa");
  await expect(formatos.last()).toContainText("Curso");
});

// ---------------------------------------------------------------------------
// 3. A casca certa em cada tipo de página
// ---------------------------------------------------------------------------

test("página da trilha continua com a barra lateral da trilha", async ({ page }) => {
  await page.goto("/topico/big-o/");
  const barra = page.locator("#menu-lateral");
  await expect(barra).toHaveAttribute("aria-label", "Trilha de estudos");
  await expect(barra.getByLabel("Buscar tópico")).toHaveCount(1);
  // E ela oferece a porta para fora, no pé da lista.
  await expect(barra.locator(".side-extras")).toHaveAttribute("href", "/cursos");
});

test("página avulsa não tem barra lateral nenhuma, e diz isso no layout", async ({ page }) => {
  await page.goto(`/topico/${AVULSA_PRONTA.topic.slug}/`);
  await expect(page.locator("#menu-lateral")).toHaveCount(0);
  await expect(page.locator(".shell")).toHaveClass(/\bsem-lateral\b/);
  // O botão da gaveta some junto: controle apontando por `aria-controls` para um
  // id que não existe é promessa quebrada para quem usa leitor de tela.
  await expect(page.getByRole("button", { name: "Menu de tópicos" })).toHaveCount(0);
  await expect(page.locator('[aria-controls="menu-lateral"]')).toHaveCount(0);
});

test("página avulsa fecha com a banda de vizinhos, e não com anterior/próximo", async ({ page }) => {
  await page.goto(`/topico/${AVULSA_PRONTA.topic.slug}/`);
  // Ela não está numa fila: "próximo" ali seria uma continuação inventada.
  await expect(page.locator(".prevnext")).toHaveCount(0);
  const banda = page.locator(".continue-explorando");
  await expect(banda.getByRole("heading", { name: "Continue explorando" })).toBeVisible();
  const cards = banda.locator(".extra-card");
  await expect(cards).toHaveCount(3);
  // E ela não sugere a própria página.
  await expect(banda.locator(`.extra-card[href="/topico/${AVULSA_PRONTA.topic.slug}/"]`)).toHaveCount(0);
  await expect(banda.getByRole("link", { name: /Ver tudo/ })).toHaveAttribute("href", "/cursos");
});

test("tópico de curso recebe a barra DAQUELE curso, e não a da trilha", async ({ page }) => {
  const primeiro = courseTopics(CURSO_COM_MATERIAL).find((t) => !isEmptyTopic(t))!;
  await page.goto(`/topico/${primeiro.slug}/`);

  const barra = page.locator("#menu-lateral");
  await expect(barra).toHaveAttribute("aria-label", `Curso: ${CURSO_COM_MATERIAL.name}`);

  // A lista é exatamente a do curso. As duas metades: os do curso estão, e
  // nenhum da trilha entrou — a barra errada é indistinguível da certa se você
  // só confere que o tópico atual aparece.
  const links = await barra.locator(".side-item").evaluateAll((as) =>
    as.map((a) => a.getAttribute("href") ?? "")
  );
  expect(links).toEqual(courseTopics(CURSO_COM_MATERIAL).map((t) => `/topico/${t.slug}`));
  for (const t of ALL_TOPICS.slice(0, 5)) {
    expect(links, "tópico da trilha vazou para a barra do curso").not.toContain(`/topico/${t.slug}`);
  }

  // E as portas de saída: a volta para a trilha e o nome do curso, que leva à
  // abertura dele.
  await expect(barra.locator(".side-voltar")).toHaveAttribute("href", "/roadmap");
  await expect(barra.locator(".side-curso-nome")).toHaveAttribute(
    "href",
    `/cursos/${CURSO_COM_MATERIAL.slug}`
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
    "Cursos",
    AVULSA_PRONTA.topic.name,
  ]);

  const doCurso = courseTopics(CURSO_COM_MATERIAL).find((t) => !isEmptyTopic(t))!;
  await page.goto(`/topico/${doCurso.slug}/`);
  expect(await doTopico(doCurso.slug)).toEqual([
    "Início",
    "Cursos",
    CURSO_COM_MATERIAL.name,
    doCurso.name,
  ]);
});

test("o link Cursos do topo acende em toda a área de cursos", async ({ page }) => {
  const aceso = () => page.locator('.nav-left a[href="/cursos"].on');
  for (const rota of [
    "/cursos/",
    `/cursos/${CURSO_COM_MATERIAL.slug}/`,
    `/topico/${AVULSA_PRONTA.topic.slug}/`,
  ]) {
    await page.goto(rota);
    await expect(aceso(), `${rota} devia acender o link Cursos`).toHaveCount(1);
  }
  // E apaga fora dela.
  await page.goto("/topico/big-o/");
  await expect(aceso()).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// 4. A abertura de um curso
// ---------------------------------------------------------------------------

test("a abertura do curso mostra os tópicos dele, os pré-requisitos e por onde começar", async ({ page }) => {
  const c = CURSO_COM_MATERIAL;
  await page.goto(`/cursos/${c.slug}/`);
  await expect(page.getByRole("heading", { level: 1, name: c.name })).toBeVisible();

  // um card por tópico do curso, na ordem do curso
  const nomes = await page.locator(".topic-card-name").allTextContents();
  expect(nomes).toEqual(courseTopics(c).map((t) => t.name));

  // "Antes daqui" aponta para tópicos que existem na trilha
  const reqs = await page.locator(".req-link").evaluateAll((as) =>
    as.map((a) => a.getAttribute("href") ?? "")
  );
  expect(reqs).toEqual((c.requires ?? []).map((s) => `/topico/${s}`));
  for (const href of reqs) {
    const slug = href.replace("/topico/", "");
    expect(SITE_TOPICS.some((t) => t.slug === slug), `${href} não é tópico`).toBe(true);
  }

  const primeiro = courseTopics(c).find((t) => !isEmptyTopic(t))!;
  await page.getByRole("link", { name: `Começar por ${primeiro.name}` }).click();
  await expect(page).toHaveURL(new RegExp(`/topico/${primeiro.slug}/`));
});

test("curso ainda sem material não finge que dá para começar", async ({ page }) => {
  const c = CURSO_SEM_MATERIAL;
  await page.goto(`/cursos/${c.slug}/`);
  // Botão "Começar por…" levaria a uma página "em breve": pior que não existir.
  await expect(page.getByRole("link", { name: /^Começar por / })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Acompanhar no Discord/ })).toHaveCount(1);
  await expect(page.locator(".topic-chips")).toContainText("conteúdo em produção");
  // E ele não pede lugar no índice do Google.
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("o primeiro tópico de um curso volta para a abertura, não para o vazio", async ({ page }) => {
  const c = CURSO_COM_MATERIAL;
  const [primeiro, segundo] = courseTopics(c);
  await page.goto(`/topico/${primeiro.slug}/`);
  const anterior = page.locator(".prevnext a").first();
  await expect(anterior).toHaveAttribute("href", `/cursos/${c.slug}`);
  await expect(anterior).toContainText("Abertura do curso");
  // E o próximo é o vizinho DENTRO do curso, não o da trilha.
  await expect(page.locator(".prevnext a.next")).toHaveAttribute("href", `/topico/${segundo.slug}`);
});

// ---------------------------------------------------------------------------
// 5. A Skip List mudou de vizinhança, não de endereço
// ---------------------------------------------------------------------------

test("a Skip List saiu do grupo Listas Encadeadas", async ({ page }) => {
  expect(
    ALL_TOPICS.map((t) => t.slug),
    "skip-list voltou para a trilha principal"
  ).not.toContain("skip-list");
  expect(getPlacement("skip-list")?.trilha).toBe("avulso");

  await page.goto("/roadmap/");
  const grupo = page.locator("section#listas");
  await expect(grupo.locator(".topic-card-name")).toHaveText(["Listas Encadeadas"]);
  await expect(grupo.locator('a[href="/topico/skip-list"]')).toHaveCount(0);
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
// 6. Progresso dentro de um curso
// ---------------------------------------------------------------------------

test("marcar um tópico de curso conta na barra daquele curso, e não na trilha", async ({ page }) => {
  const c = CURSO_COM_MATERIAL;
  const topicos = courseTopics(c);
  const alvo = topicos.find((t) => !isEmptyTopic(t))!;

  await page.goto(`/topico/${alvo.slug}/`);
  const barra = page.locator("#menu-lateral");
  await expect(barra.locator(".side-count")).toHaveText(`0/${topicos.length} · 0%`);

  await barra.getByRole("checkbox", { name: `Marcar ${alvo.name} como concluído` }).click();
  const pct = Math.round((1 / topicos.length) * 100);
  await expect(barra.locator(".side-count")).toHaveText(`1/${topicos.length} · ${pct}%`);

  // O contador da TRILHA não se mexe: um tópico de curso não é um degrau dela.
  await page.goto("/topico/big-o/");
  const daTrilha = await page.locator("#menu-lateral .side-head .side-count").textContent();
  expect(daTrilha).toMatch(/^0\//);

  // E o card do curso na vitrine passa a contar o concluído.
  await page.goto("/cursos/");
  const card = page.locator(".extra-card").filter({ has: page.locator(".extra-name", { hasText: c.name }) });
  await expect(card.locator(".extra-meta")).toHaveText(`1 de ${topicos.length} concluídos`);
});

// ---------------------------------------------------------------------------
// 7. Celular
// ---------------------------------------------------------------------------

test("as páginas novas não rolam na horizontal no celular @mobile", async ({ page }) => {
  for (const rota of [
    "/cursos/",
    `/cursos/${CURSO_COM_MATERIAL.slug}/`,
    `/cursos/${CURSO_SEM_MATERIAL.slug}/`,
    `/topico/${AVULSA_PRONTA.topic.slug}/`,
  ]) {
    await page.goto(rota);
    const estoura = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(estoura, `${rota} estoura a largura no celular`).toBe(false);
  }
});

test("no celular, Cursos continua alcançável pelo menu ⋯ @mobile", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mais opções" }).click();
  const menu = page.locator(".nav-menu");
  await expect(menu.getByRole("link", { name: /Cursos e outras estruturas/ })).toHaveAttribute(
    "href",
    "/cursos"
  );
});
