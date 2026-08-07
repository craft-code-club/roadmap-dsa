import { test, expect, type Page, type Locator } from "@playwright/test";

// Casca adaptativa dos visualizadores de hash-table.
//
// A página tem duas peças com overlay, nesta ordem:
//   0 · HashTableVisualizer      — inserir chaves, com as três camadas
//   1 · HashTableBuscaVisualizer — busca linear x hash, `collapsible: false`
//                                  (não há bloco dispensável: os dois painéis,
//                                  a fita de buckets e os cartões de pior caso
//                                  são todos conteúdo)
//
// O `HashTableOperacoes` não entra: é uma tabela estática, sem overlay e sem
// controles, então não há painel para arrumar.
//
// Todo teste aqui mede COMPORTAMENTO e lê RÓTULO. Contar elemento não prova
// nada, e comportamento certo debaixo do rótulo errado ensina errado do mesmo
// jeito — por isso os cartões de comparação são lidos com nome e valor juntos,
// no mesmo cartão: é exatamente o que o guarda de idioma, que compara o
// CONJUNTO de textos e não onde cada um aparece, não consegue ver.

const URL = "/topico/hash-table/";

const CONGELA =
  "*, *::before, *::after { transition: none !important; animation: none !important; }";

/** Congela a animação e espera as fontes: medir antes disso mede o fallback. */
async function preparar(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: CONGELA });
}

/** Abre o painel expandido da peça `i` e devolve o `<figure>` do painel. */
async function expandir(page: Page, i: number) {
  await page.goto(URL);
  await preparar(page);
  await page.locator("article figure.viz").nth(i).getByRole("button", { name: /Expandir/ }).click();
  const painel = page.locator(".viz-overlay figure.viz");
  await expect(painel).toBeVisible();
  await preparar(page);
  return painel;
}

/** Orçamento de altura do fluxo do artigo: janela menos cabeçalho e respiro. */
function orcamento(page: Page) {
  return page.evaluate(
    () =>
      window.innerHeight -
      (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ccc-header-h")) ||
        60) -
      24
  );
}

/**
 * Altura que parou de mudar. O `data-anim` do hook congela a transição da
 * MEDIÇÃO dele, e não a do clique do aluno: ler no meio dos 0,32s devolve o
 * layout a caminho e conclui "cabe" para uma peça que não cabe.
 */
async function alturaEstavel(alvo: Locator) {
  let anterior = -1;
  for (let k = 0; k < 40; k++) {
    const h = await alvo.evaluate((el) => Math.round(el.getBoundingClientRect().height));
    if (h === anterior) return h;
    anterior = h;
    await alvo.page().waitForTimeout(60);
  }
  return anterior;
}

/**
 * Rola o MIOLO até o fim e diz quanto o cabeçalho e o rodapé se mexeram.
 *
 * Devolve também a sobra da FIGURA: sem isso o teste aprova justamente a quebra
 * que a camada 1 conserta. Se a rolagem voltar para a figura inteira, o
 * `.viz-body` não tem o que rolar, `scrollTop` fica em zero, o cabeçalho não se
 * mexe em relação à figura — e um teste que só olhasse `headMoveu` passaria.
 */
async function rolarAteOFim(painel: Locator) {
  return painel.evaluate(async (f) => {
    const body = f.querySelector<HTMLElement>(".viz-body")!;
    const head = f.querySelector<HTMLElement>(".viz-head")!;
    const foot = f.querySelector<HTMLElement>(".viz-foot")!;
    const headAntes = Math.round(head.getBoundingClientRect().top);
    const footAntes = Math.round(foot.getBoundingClientRect().top);
    const sobra = body.scrollHeight - body.clientHeight;
    body.scrollTop = body.scrollHeight;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return {
      sobra,
      rolou: Math.round(body.scrollTop),
      sobraFigura: f.scrollHeight - f.clientHeight,
      headMoveu: Math.round(head.getBoundingClientRect().top) - headAntes,
      footMoveu: Math.round(foot.getBoundingClientRect().top) - footAntes,
    };
  });
}

// ---------------------------------------------------------------------------
// 0 · HashTableVisualizer — as três camadas
// ---------------------------------------------------------------------------

test("no expandido da inserção, o ▶ Rodar fica parado enquanto o miolo rola", async ({ page }) => {
  // 1440x600: medido, o miolo da inserção sobra 104px. Antes da casca a figura
  // inteira rolava (594px de sobra), o cabeçalho subia 593px e a linha de
  // controles era desenhada com a base em 1135px numa janela de 600 — o aluno
  // perdia de vista justamente o botão que faz o algoritmo andar.
  await page.setViewportSize({ width: 1440, height: 600 });
  const painel = await expandir(page, 0);

  const r = await rolarAteOFim(painel);
  // Sem sobra o teste não testaria nada, e sem provar que é o MIOLO que rola
  // ele aprovaria a quebra que devolve a rolagem para a figura.
  expect(r.sobra).toBeGreaterThan(20);
  expect(r.rolou).toBeGreaterThan(20);
  expect(r.sobraFigura).toBeLessThanOrEqual(8);
  expect(r.headMoveu).toBe(0);
  expect(r.footMoveu).toBe(0);

  // E os dois continuam LEGÍVEIS, com o rótulo deles, depois de rolar até o fim.
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeInViewport();
  await expect(
    painel.getByText("Visualizador · inserindo chaves numa tabela hash")
  ).toBeInViewport();
});

test("em 1512x900 o código da inserção vem recolhido, sob o rótulo certo", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(0);
  const codigo = peca.locator(".viz-code");

  // O rótulo diz o que o botão FAZ, e o bloco está mesmo sem altura (2px de
  // borda). Rótulo sem medida, ou medida sem rótulo, deixaria passar o caso em
  // que o botão promete uma coisa e a peça faz outra.
  await expect(peca.getByRole("button", { name: "Mostrar código" })).toBeVisible();
  await expect(peca).toHaveAttribute("data-codigo", "off");
  expect(await alturaEstavel(codigo)).toBeLessThanOrEqual(4);

  // A premissa medida, dentro do teste: com o código à mostra a peça pede
  // 1076px contra 816px de orçamento. Sem isto o teste ficaria verde no dia em
  // que a peça encolhesse e o recolhimento deixasse de ter motivo.
  await peca.getByRole("button", { name: "Mostrar código" }).click();
  await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
  await expect(peca).toHaveAttribute("data-codigo", "on");
  expect(await alturaEstavel(codigo)).toBeGreaterThan(150);
  expect(await alturaEstavel(peca)).toBeGreaterThan(await orcamento(page));
});

test("em janela alta o código da inserção já vem aberto", async ({ page }) => {
  // Medido: com o código à mostra a peça pede 1076px. Em 1300px de janela o
  // orçamento é 1216px, então a medição não tem motivo para esconder nada.
  await page.setViewportSize({ width: 1512, height: 1300 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(0);

  await expect(peca).toHaveAttribute("data-codigo", "on");
  await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
  expect(await alturaEstavel(peca.locator(".viz-code"))).toBeGreaterThan(150);
  // E o código é o DESTE visualizador, não um bloco qualquer.
  await expect(peca.locator(".viz-code-head")).toHaveText("tabela_hash.py");
  expect(await alturaEstavel(peca)).toBeLessThanOrEqual(await orcamento(page));
});

test("a escolha de mostrar o código sobrevive à troca de capacidade", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(0);

  await peca.getByRole("button", { name: "Mostrar código" }).click();
  await expect(peca).toHaveAttribute("data-codigo", "on");

  // A capacidade está no `measureOn` do hook e é o que mais muda a altura:
  // cada bucket é uma linha da coluna. A troca precisa aparecer NA TELA, senão
  // o teste "sobrevive" a uma medição que nunca foi pedida.
  await expect(peca.locator(".ht-table .ht-row")).toHaveCount(5);
  await peca.locator("select").selectOption("16");
  await expect(peca.locator(".ht-table .ht-row")).toHaveCount(16);

  // Premissa medida: neste estado, com o código à mostra, a peça estoura o
  // orçamento — ou seja, uma medição sem a escolha do aluno recolheria.
  expect(await alturaEstavel(peca)).toBeGreaterThan(await orcamento(page));

  // "Está aberto agora" não é "continua aberto": amostro ao longo do tempo.
  for (let k = 0; k < 6; k++) {
    await expect(peca).toHaveAttribute("data-codigo", "on");
    await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
    await page.waitForTimeout(120);
  }
});

test("no expandido da inserção, seta e espaço andam a animação e não roubam a tecla de quem digita", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  const painel = await expandir(page, 0);
  const passo = painel.locator(".viz-step");

  await expect(passo).toHaveText("passo 1 de 18");
  await page.keyboard.press("ArrowRight");
  await expect(passo).toHaveText("passo 2 de 18");
  // O rótulo e o número contam a mesma coisa: o passo 2 é o da soma ASCII.
  await expect(painel.locator(".viz-note").first()).toContainText("Somo os códigos ASCII");
  await page.keyboard.press("ArrowLeft");
  await expect(passo).toHaveText("passo 1 de 18");

  // Espaço roda e pausa, e o rótulo do botão diz em qual dos dois estados está.
  await page.keyboard.press("Space");
  await expect(painel.getByRole("button", { name: "❚❚ Pausar" })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();

  // Com o cursor num campo, espaço é espaço e seta é cursor. Sequestrar isso
  // deixaria a lista de chaves impossível de editar, que é pior que não ter
  // atalho. Afirmo DEPOIS DE CADA TECLA: duas setas opostas se cancelam e um
  // teste que só olhasse o fim aprovaria a quebra.
  const campo = painel.locator("input.viz-input").first();
  await campo.fill("Ana, Bob");
  await expect(passo).toHaveText("passo 1 de 8");

  await campo.press("Space");
  await expect(campo).toHaveValue("Ana, Bob ");
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();
  await expect(passo).toHaveText("passo 1 de 8");

  // `fill` deixa o cursor no fim sem depender de `End`, que no macOS não leva o
  // cursor ao fim de um input. Comparo o cursor com ele mesmo.
  const antes = await campo.evaluate((el: HTMLInputElement) => el.selectionStart ?? -1);
  await campo.press("ArrowLeft");
  const depois = await campo.evaluate((el: HTMLInputElement) => el.selectionStart ?? -1);
  expect(depois).toBe(antes - 1);
  await expect(passo).toHaveText("passo 1 de 8");

  await page.keyboard.press("Escape");
  await expect(page.locator(".viz-overlay")).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// 1 · HashTableBuscaVisualizer — camadas 1 e 2, sem bloco recolhível
// ---------------------------------------------------------------------------

test("no expandido da busca, o cabeçalho fica parado enquanto o miolo rola", async ({ page }) => {
  // 1440x600: medido, o miolo da busca sobra 254px. Antes da casca a figura
  // inteira rolava (263px), o cabeçalho subia 262px e o ▶ Rodar era desenhado
  // com a base em 804px numa janela de 600 — 204px abaixo do pé visível.
  await page.setViewportSize({ width: 1440, height: 600 });
  const painel = await expandir(page, 1);

  const r = await rolarAteOFim(painel);
  expect(r.sobra).toBeGreaterThan(20);
  expect(r.rolou).toBeGreaterThan(20);
  expect(r.sobraFigura).toBeLessThanOrEqual(8);
  expect(r.headMoveu).toBe(0);
  expect(r.footMoveu).toBe(0);

  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeInViewport();
  await expect(painel.getByText("Visualizador · busca linear x busca por hash")).toBeInViewport();

  // O contador vive no cabeçalho e o botão no rodapé: se qualquer um dos dois
  // tivesse ido junto com a rolagem, este passo a passo seria impossível de
  // acompanhar. Clico no botão que ficou à vista e leio o contador que ficou.
  const proximo = painel.getByRole("button", { name: "Próximo ›" });
  await expect(proximo).toBeInViewport();
  await proximo.click();
  await expect(painel.locator(".viz-step")).toHaveText("passo 2 de 9");
});

test("a busca não promete esconder um bloco que ela não tem", async ({ page }) => {
  // Com `collapsible: false` os itens 2, 3 e 4 do mínimo do contrato não
  // existem. No lugar deles: nenhum botão pode prometer esconder um bloco que
  // o visualizador não tem — `collapsible: true` aqui desenharia "Ocultar
  // código" sobre nada.
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(1);

  await expect(peca.getByRole("button", { name: /c(ó|o)digo/i })).toHaveCount(0);
  await expect(peca.locator(".viz-code")).toHaveCount(0);
  await expect(peca.locator(".viz-code-slot")).toHaveCount(0);

  // E o que ela TEM continua lá: a casca, o Expandir e a linha do tempo.
  await expect(peca).toHaveClass(/viz-fit/);
  await expect(peca.getByRole("button", { name: "⤢ Expandir" })).toBeVisible();
  await expect(peca.locator(".viz-step")).toHaveText("passo 1 de 9");
});

test("os cartões da busca leem rótulo e valor juntos, no mesmo cartão", async ({ page }) => {
  // O guarda de idioma compara o CONJUNTO de textos de tela, não onde cada um
  // aparece: trocar dois campos de lugar num rename mantém o conjunto idêntico
  // e passa verde com a tela mentindo. Quem pega isso é ler rótulo e valor
  // juntos — e aqui os dois números são diferentes de propósito, que é a aula
  // inteira desta peça.
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(1);

  // Passo 3: a lista já gastou 2 comparações e o hash gastou 1.
  await peca.getByRole("button", { name: "Próximo ›" }).click();
  await peca.getByRole("button", { name: "Próximo ›" }).click();
  await expect(peca.locator(".viz-step")).toHaveText("passo 3 de 9");

  const cartao = (rotulo: string) =>
    peca.locator(".bigo-stat").filter({ hasText: rotulo }).locator("strong");
  await expect(cartao("comparações · lista")).toHaveText("2");
  await expect(cartao("comparações · hash")).toHaveText("1");
  await expect(cartao("pior caso · lista com 1 milhão")).toHaveText("1.000.000");
  await expect(cartao("pior caso · hash com 1 milhão")).toHaveText("1");

  // O título de cada painel carrega o mesmo número do cartão dele. O <em> é o
  // nó que guarda só o par número + unidade: no título inteiro,
  // "2 comparações" passa com "12 comparações", que é o contrário da aula.
  const selo = (i: number) => peca.locator(".ht-painel-tit").nth(i).locator("em");
  await expect(selo(0)).toHaveText("2 comparações");
  await expect(selo(1)).toHaveText("1 comparação");

  // E com o hash ruim os dois empatam: é o O(n) do pior caso aparecendo.
  await peca.getByRole("button", { name: "Com hash ruim" }).click();
  await peca.getByRole("button", { name: "Próximo ›" }).click();
  await peca.getByRole("button", { name: "Próximo ›" }).click();
  await expect(cartao("pior caso · hash com 1 milhão")).toHaveText("1.000.000");
});
