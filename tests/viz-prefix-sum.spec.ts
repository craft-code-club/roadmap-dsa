import { test, expect, type Page, type Locator } from "@playwright/test";

// Casca adaptativa dos três visualizadores de prefix-sum.
//
// A página tem três peças, nesta ordem:
//   0 · PrefixSumVisualizer — construir a tabela e consultar em O(1)
//   1 · PrefixSumTradeoff   — o canto fora do padrão: `total: 1` e
//                             `collapsible: false` (sem passos, sem bloco)
//   2 · PrefixSumGrade2D    — soma de um retângulo em 4 leituras
//
// Todo teste aqui mede COMPORTAMENTO e lê RÓTULO. Contar elemento não prova
// nada, e comportamento certo debaixo do rótulo errado ensina errado do mesmo
// jeito — por isso os cartões do trade-off são lidos com nome e valor juntos,
// no mesmo cartão.

const URL = "/topico/prefix-sum/";

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

/** Rola o miolo até o fim e diz quanto o cabeçalho e o rodapé se mexeram. */
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
      headMoveu: Math.round(head.getBoundingClientRect().top) - headAntes,
      footMoveu: Math.round(foot.getBoundingClientRect().top) - footAntes,
    };
  });
}

test("no expandido do construtor, o ▶ Rodar fica parado enquanto o miolo rola", async ({ page }) => {
  // 1440x600: medido, o miolo do construtor sobra 91px. Antes da casca o `.viz`
  // inteiro rolava e a linha de controles era desenhada 387px ABAIXO do pé da
  // peça — o aluno perdia de vista justamente o botão que faz o algoritmo andar.
  await page.setViewportSize({ width: 1440, height: 600 });
  const painel = await expandir(page, 0);

  const r = await rolarAteOFim(painel);
  // Sem sobra o teste não testaria nada: ele precisa de miolo para rolar.
  expect(r.sobra).toBeGreaterThan(20);
  expect(r.rolou).toBeGreaterThan(20);
  expect(r.headMoveu).toBe(0);
  expect(r.footMoveu).toBe(0);

  // E o botão continua LEGÍVEL, com o rótulo dele, depois de rolar até o fim.
  const rodar = painel.getByRole("button", { name: "▶ Rodar" });
  await expect(rodar).toBeInViewport();
  await expect(painel.getByText("Visualizador · construir a tabela e consultar em O(1)")).toBeInViewport();
});

test("no expandido do prefixo 2D, o Próximo › anda o passo depois da rolagem", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  const painel = await expandir(page, 2);

  await expect(painel.locator(".viz-step")).toHaveText("passo 1 de 6");

  const r = await rolarAteOFim(painel);
  expect(r.sobra).toBeGreaterThan(20);
  expect(r.rolou).toBeGreaterThan(20);
  expect(r.headMoveu).toBe(0);
  expect(r.footMoveu).toBe(0);

  // O contador vive no cabeçalho e o botão no rodapé: se qualquer um dos dois
  // tivesse ido junto com a rolagem, este passo a passo seria impossível de
  // acompanhar. Clico no botão que ficou à vista e leio o contador que ficou.
  const proximo = painel.getByRole("button", { name: "Próximo ›" });
  await expect(proximo).toBeInViewport();
  await proximo.click();
  await expect(painel.locator(".viz-step")).toHaveText("passo 2 de 6");
  // O passo 2 é o do retângulo grande: o rótulo e o número contam a mesma coisa.
  await expect(painel.locator(".viz-note")).toContainText("Peguei demais de propósito");
});

test("em 1512x900 o código do construtor vem recolhido, sob o rótulo certo", async ({ page }) => {
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

  // A premissa medida, dentro do teste: com o código à mostra a peça NÃO cabe
  // no orçamento da janela. Sem isto o teste ficaria verde no dia em que o
  // recolhimento fosse decidido por engano.
  await peca.getByRole("button", { name: "Mostrar código" }).click();
  await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
  await expect(peca).toHaveAttribute("data-codigo", "on");
  expect(await alturaEstavel(codigo)).toBeGreaterThan(150);
  expect(await alturaEstavel(peca)).toBeGreaterThan(await orcamento(page));
});

test("em janela alta o código do construtor já vem aberto", async ({ page }) => {
  // Medido: com o código à mostra a peça pede 1005px. Em 1300px de janela o
  // orçamento é 1216px, então a medição não tem motivo para esconder nada.
  await page.setViewportSize({ width: 1512, height: 1300 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(0);

  await expect(peca).toHaveAttribute("data-codigo", "on");
  await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
  expect(await alturaEstavel(peca.locator(".viz-code"))).toBeGreaterThan(150);
  // E o código é o deste visualizador, não um bloco qualquer.
  await expect(peca.locator(".viz-code-head")).toHaveText("soma_de_intervalo.py");
  expect(await alturaEstavel(peca)).toBeLessThanOrEqual(await orcamento(page));
});

test("a escolha de mostrar o código sobrevive à troca do array", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(0);

  await peca.getByRole("button", { name: "Mostrar código" }).click();
  await expect(peca).toHaveAttribute("data-codigo", "on");

  // Trocar o array muda o `measureOn` do hook e pede medição nova.
  await peca.locator("input.viz-input").first().fill("1, 2, 3, 4, 5, 6, 7, 8, 9, 10");
  await expect(peca.locator(".viz-step")).toHaveText("passo 1 de 15");

  // Premissa medida: neste estado, com o código à mostra, a peça estoura o
  // orçamento — ou seja, uma medição sem a escolha do aluno recolheria. Sem
  // esta asserção o teste passaria mesmo se o estado escolhido coubesse.
  expect(await alturaEstavel(peca)).toBeGreaterThan(await orcamento(page));

  // "Está aberto agora" não é "continua aberto": amostro ao longo do tempo.
  for (let k = 0; k < 6; k++) {
    await expect(peca).toHaveAttribute("data-codigo", "on");
    await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
    await page.waitForTimeout(120);
  }
});

test("no expandido, seta e espaço andam a animação e não roubam a tecla de quem digita", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  const painel = await expandir(page, 0);
  const passo = painel.locator(".viz-step");

  await expect(passo).toHaveText("passo 1 de 12");
  await page.keyboard.press("ArrowRight");
  await expect(passo).toHaveText("passo 2 de 12");
  await page.keyboard.press("ArrowLeft");
  await expect(passo).toHaveText("passo 1 de 12");

  // Espaço roda e pausa, e o rótulo do botão diz em qual dos dois estados está.
  await page.keyboard.press("Space");
  await expect(painel.getByRole("button", { name: "❚❚ Pausar" })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();

  // Com o cursor num campo, espaço é espaço e seta é cursor. Sequestrar isso
  // deixaria o array impossível de editar, que é pior que não ter atalho.
  const campo = painel.locator("input.viz-input").first();
  await campo.fill("10, 20, 30");
  await expect(passo).toHaveText("passo 1 de 8");

  await campo.press("Space");
  await expect(campo).toHaveValue("10, 20, 30 ");
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();

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

test("o trade-off não promete esconder bloco nenhum, e os controles ficam parados", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  const painel = await expandir(page, 1);

  // Sem bloco dispensável não existe botão de recolher: `collapsible: true`
  // aqui renderizaria "Ocultar código" sobre nada.
  await expect(painel.getByRole("button", { name: /código/ })).toHaveCount(0);
  // Sem linha do tempo, o cabeçalho mostra o q e não um "passo N de M".
  await expect(painel.locator(".viz-step")).toHaveText("q = 21");
  await expect(painel.locator(".viz-progress")).toHaveCount(0);

  const r = await rolarAteOFim(painel);
  expect(r.sobra).toBeGreaterThan(20);
  expect(r.rolou).toBeGreaterThan(20);
  expect(r.headMoveu).toBe(0);
  expect(r.footMoveu).toBe(0);

  // O `click()` do Playwright ROLA o contêiner para alcançar o alvo, então
  // clicar num botão nunca prova que ele estava à vista. Volto o miolo ao topo
  // e exijo que ele CONTINUE em 0 depois do clique: alcançável não é à vista.
  const miolo = painel.locator(".viz-body");
  await miolo.evaluate((el) => { el.scrollTop = 0; });
  await painel.getByRole("button", { name: "Muitas consultas" }).click();
  await expect(painel.locator(".viz-step")).toHaveText("q = 100");
  await expect(miolo).toHaveJSProperty("scrollTop", 0);

  const reiniciar = painel.getByRole("button", { name: "↺ Reiniciar" });
  await expect(reiniciar).toBeInViewport();
  await reiniciar.click();
  await expect(painel.locator(".viz-step")).toHaveText("q = 21");
  await expect(miolo).toHaveJSProperty("scrollTop", 0);

  // O painel não sequestra as setas: sem linha do tempo elas são do slider do
  // gráfico, que é quem tem role="slider" aqui.
  const grafico = painel.locator("canvas.bigo-canvas");
  await grafico.focus();
  await page.keyboard.press("ArrowRight");
  await expect(painel.locator(".viz-step")).toHaveText("q = 23");
  await expect(grafico).toHaveAttribute("aria-valuenow", "23");

  await page.keyboard.press("Escape");
  await expect(page.locator(".viz-overlay")).toHaveCount(0);
});

test("no trade-off, cada cartão mostra o valor do rótulo que ele carrega", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(1);

  /** O cartão que leva ESTE nome. Ler o número sem o nome não prova nada. */
  const cartao = (nome: string) =>
    peca.locator(".bigo-card", { has: page.getByText(nome, { exact: true }) });

  // n = 1.000, m = 5% = 50, virada em 21. No q inicial (21) o prefixo já ganha.
  await expect(peca.locator(".viz-step")).toHaveText("q = 21");
  await expect(cartao("força bruta").locator(".bigo-card-val")).toHaveText("1.050");
  await expect(cartao("força bruta").locator(".bigo-card-ex")).toHaveText("q × m = 21 × 50");
  await expect(cartao("com prefixo").locator(".bigo-card-val")).toHaveText("1.021");
  await expect(cartao("com prefixo").locator(".bigo-card-ex")).toHaveText("n + q = 1.000 + 21");

  // Uma consulta só: a força bruta ganha, e o texto diz isso com esse número.
  await peca.getByRole("button", { name: "Uma consulta só" }).click();
  await expect(peca.locator(".viz-step")).toHaveText("q = 1");
  await expect(cartao("força bruta").locator(".bigo-card-val")).toHaveText("50");
  await expect(cartao("força bruta").locator(".bigo-card-ex")).toHaveText("q × m = 1 × 50");
  await expect(cartao("com prefixo").locator(".bigo-card-val")).toHaveText("1.001");
  await expect(peca.locator(".viz-note")).toContainText(
    "a força bruta ainda ganha: 50 operações contra 1.001 do prefixo"
  );

  // Muitas consultas: o prefixo ganha, e a razão é a dos dois números acima.
  await peca.getByRole("button", { name: "Muitas consultas" }).click();
  await expect(peca.locator(".viz-step")).toHaveText("q = 100");
  await expect(cartao("força bruta").locator(".bigo-card-val")).toHaveText("5.000");
  await expect(cartao("com prefixo").locator(".bigo-card-val")).toHaveText("1.100");
  await expect(peca.locator(".viz-note")).toContainText(
    "1.100 operações contra 5.000 da força bruta, 4,5 vezes menos"
  );
});
