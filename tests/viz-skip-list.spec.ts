import { test, expect, type Page, type Locator } from "@playwright/test";

// Casca adaptativa dos três visualizadores de skip-list.
//
// A página tem três peças, nesta ordem:
//   0 · SkipListVisualizer — a busca descendo em escada pelos níveis
//   1 · SkipListInsercao   — inserir e remover, com o update[] e a moeda
//   2 · SkipListNiveis     — a aritmética da moeda: `total: 1` e
//                            `collapsible: false` (sem passos, sem bloco)
//
// O defeito que estes testes protegem não era altura: no painel expandido a
// FIGURA inteira rolava, e o cabeçalho ia junto. Medido em 1512x900, antes:
// o cabeçalho subia 176px (busca), 563px (inserção) e 1.171px (níveis, com a
// pirâmide no pior caso), levando embora os botões que fazem a peça andar.
//
// Todo teste aqui mede COMPORTAMENTO e lê RÓTULO. Contar elemento não prova
// nada, e comportamento certo debaixo do rótulo errado ensina errado do mesmo
// jeito.

const URL = "/topico/skip-list/";

const CONGELA =
  "*, *::before, *::after { transition: none !important; animation: none !important; }";

/** Congela a animação e espera as fontes: medir antes disso mede o fallback. */
async function preparar(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: CONGELA });
}

/** Abre o painel expandido da peça `i` SEM recarregar: o estado montado fica. */
async function expandirAqui(page: Page, i: number) {
  await page.locator("article figure.viz").nth(i).getByRole("button", { name: /Expandir/ }).click();
  const painel = page.locator(".viz-overlay figure.viz");
  await expect(painel).toBeVisible();
  await preparar(page);
  return painel;
}

/** Abre a página e o painel expandido da peça `i`. */
async function expandir(page: Page, i: number) {
  await page.goto(URL);
  await preparar(page);
  return expandirAqui(page, i);
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
 * Rola o miolo até o fim e diz quanto o cabeçalho e o rodapé se mexeram, e se
 * quem rolou foi mesmo o miolo. As três coisas juntas são o teste: com a
 * rolagem devolvida à figura, `sobra` e `rolou` ficam em zero, o cabeçalho não
 * se mexe, e um teste que só olhasse `headMoveu` aprovaria a quebra.
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
    f.scrollTop = f.scrollHeight;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return {
      sobra,
      rolou: Math.round(body.scrollTop),
      figuraRolou: Math.round(f.scrollTop),
      headMoveu: Math.round(head.getBoundingClientRect().top) - headAntes,
      footMoveu: Math.round(foot.getBoundingClientRect().top) - footAntes,
    };
  });
}

test("no expandido da busca, o ▶ Rodar fica parado enquanto o miolo rola", async ({ page }) => {
  // 1440x600: medido, o miolo da busca sobra 139px. Antes da casca o `.viz`
  // inteiro rolava, o cabeçalho subia 476px e o `▶ Rodar` era desenhado com a
  // base em 1017px numa janela de 600 — o aluno perdia de vista justamente o
  // botão que faz o algoritmo andar.
  await page.setViewportSize({ width: 1440, height: 600 });
  const painel = await expandir(page, 0);

  const r = await rolarAteOFim(painel);
  // Sem sobra o teste não testaria nada: ele precisa de miolo para rolar.
  expect(r.sobra).toBeGreaterThan(20);
  expect(r.rolou).toBeGreaterThan(20);
  // E quem rola tem que ser o miolo, não a figura.
  expect(r.figuraRolou).toBe(0);
  expect(r.headMoveu).toBe(0);
  expect(r.footMoveu).toBe(0);

  // O botão continua LEGÍVEL, com o rótulo dele, depois de rolar até o fim.
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeInViewport();
  await expect(
    painel.getByText("Visualizador · a busca descendo em escada pelos níveis")
  ).toBeInViewport();
});

test("no expandido da inserção, o Próximo › anda o passo depois da rolagem", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  const painel = await expandir(page, 1);

  await expect(painel.locator(".viz-step")).toHaveText("passo 1 de 28");

  const r = await rolarAteOFim(painel);
  expect(r.sobra).toBeGreaterThan(20);
  expect(r.rolou).toBeGreaterThan(20);
  expect(r.figuraRolou).toBe(0);
  expect(r.headMoveu).toBe(0);
  expect(r.footMoveu).toBe(0);

  // O contador vive no cabeçalho e o botão no rodapé: se qualquer um dos dois
  // tivesse ido junto com a rolagem, este passo a passo seria impossível de
  // acompanhar. Clico no botão que ficou à vista e leio o contador que ficou.
  const proximo = painel.getByRole("button", { name: "Próximo ›" });
  await expect(proximo).toBeInViewport();
  await proximo.click();
  await expect(painel.locator(".viz-step")).toHaveText("passo 2 de 28");
  // O passo 2 é a primeira comparação da busca: o contador e a nota contam a
  // mesma coisa, e a nota nomeia o nível que o painel de variáveis mostra.
  await expect(painel.locator(".viz-note")).toContainText(
    "42 não é menor que 33: se eu avançasse, passaria do ponto. Paro de andar no nível 3."
  );
  // Valor exato no nó do valor: na ficha inteira ("nivel3"), `toContainText("3")`
  // passa com 13 ou 30, e o nível é o número que a nota acima nomeia.
  await expect(
    painel.locator(".viz-var").filter({ hasText: "nivel" }).first().locator(".viz-var-val")
  ).toHaveText("3");
});

test("no expandido dos níveis, a pirâmide gigante rola sozinha sob o cabeçalho parado", async ({
  page,
}) => {
  // O pior caso da ENTRADA, que o estado padrão esconde: com n = 1.048.576 e
  // p = 0,75 a pirâmide vai a 40 linhas. Medido antes da casca: 2.067px de peça,
  // o cabeçalho subindo 1.171px ao rolar e o "↺ Reiniciar" desenhado com a base
  // em 2.027px numa janela de 900.
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(2);

  await peca.getByRole("button", { name: /p = 0,75/ }).click();
  await peca.locator('input[type="range"]').fill("8");
  // A entrada mudou mesmo, e o cabeçalho diz qual é: sem esta asserção o teste
  // mediria a pirâmide pequena e ficaria verde à toa.
  await expect(peca.locator(".viz-step")).toHaveText("n = 1.048.576 · p = 0,75");
  await expect(peca.locator(".sl-plinha")).toHaveCount(40);

  const painel = await expandirAqui(page, 2);
  await expect(painel.locator(".sl-plinha")).toHaveCount(40);

  const r = await rolarAteOFim(painel);
  expect(r.sobra).toBeGreaterThan(900);
  expect(r.rolou).toBeGreaterThan(900);
  expect(r.figuraRolou).toBe(0);
  expect(r.headMoveu).toBe(0);
  expect(r.footMoveu).toBe(0);

  // Com 1.148px de pirâmide passando por baixo, os controles seguem à vista e
  // sob o rótulo certo.
  await expect(painel.getByRole("button", { name: "↺ Reiniciar" })).toBeInViewport();
  await expect(painel.getByRole("button", { name: "Sortear 1.048.576 moedas" })).toBeInViewport();
  await expect(painel.locator(".viz-step")).toBeInViewport();
});

test("os níveis não prometem esconder bloco nenhum, e o número resume a peça", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(2);

  // Sem bloco dispensável não existe botão de recolher: `collapsible: true`
  // aqui renderizaria "Ocultar código" sobre nada. A pirâmide É o conteúdo.
  await expect(peca.getByRole("button", { name: /código/ })).toHaveCount(0);
  await expect(peca.locator(".viz-code")).toHaveCount(0);
  // Sem linha do tempo, o lugar do "passo N de M" guarda o número que resume a
  // peça — com o rótulo junto, senão o número perde o que o explicava.
  await expect(peca.locator(".viz-step")).toHaveText("n = 1.024 · p = 0,5");
  await expect(peca.locator(".viz-progress")).toHaveCount(0);
  await expect(peca.getByRole("button", { name: "▶ Rodar" })).toHaveCount(0);

  // E o número acompanha a entrada, os dois pedaços dele.
  await peca.getByRole("button", { name: /p = 0,25/ }).click();
  await expect(peca.locator(".viz-step")).toHaveText("n = 1.024 · p = 0,25");
  await peca.locator('input[type="range"]').fill("0");
  await expect(peca.locator(".viz-step")).toHaveText("n = 16 · p = 0,25");
});

test("em 1512x900 o código da busca vem recolhido, sob o rótulo certo", async ({ page }) => {
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
  // no orçamento da janela (1.028px contra 816). Sem isto o teste ficaria verde
  // no dia em que o recolhimento fosse decidido por engano.
  await peca.getByRole("button", { name: "Mostrar código" }).click();
  await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
  await expect(peca).toHaveAttribute("data-codigo", "on");
  expect(await alturaEstavel(codigo)).toBeGreaterThan(150);
  expect(await alturaEstavel(peca)).toBeGreaterThan(await orcamento(page));
});

test("em janela alta o código da busca já vem aberto", async ({ page }) => {
  // Medido: com o código à mostra a peça pede 1.028px. Em 1300px de janela o
  // orçamento é 1.216px, então a medição não tem motivo para esconder nada.
  await page.setViewportSize({ width: 1512, height: 1300 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(0);

  await expect(peca).toHaveAttribute("data-codigo", "on");
  await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
  expect(await alturaEstavel(peca.locator(".viz-code"))).toBeGreaterThan(150);
  // E o código é o deste visualizador, não um bloco qualquer.
  await expect(peca.locator(".viz-code-head")).toHaveText("skip_list.py");
  await expect(peca.locator(".viz-line").first()).toContainText("def buscar(self, alvo):");
  expect(await alturaEstavel(peca)).toBeLessThanOrEqual(await orcamento(page));
});

test("a escolha de mostrar o código sobrevive à troca do preset da busca", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(0);

  await peca.getByRole("button", { name: "Mostrar código" }).click();
  await expect(peca).toHaveAttribute("data-codigo", "on");

  // O preset "Azar total" derruba a lista de 4 níveis para 1, e o número de
  // níveis é justamente o que está no `measureOn`: a medição roda de novo.
  await peca.getByRole("button", { name: "Azar total: ninguém passou do nível 0" }).click();
  await expect(peca.locator(".viz-step")).toHaveText("passo 1 de 24");
  await expect(peca.locator(".sl-ocupacao span")).toHaveCount(1);

  // "Está aberto agora" não é "continua aberto": amostro ao longo do tempo.
  // Esta é a asserção que carrega o sentido do teste, e por isso vem ANTES da
  // premissa: com a escolha do aluno desfeita, é ela que tem de reprovar.
  for (let k = 0; k < 6; k++) {
    await expect(peca).toHaveAttribute("data-codigo", "on");
    await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
    await page.waitForTimeout(120);
  }

  // Premissa medida: neste estado, com o código à mostra, a peça estoura o
  // orçamento (914px contra 816) — ou seja, uma medição sem a escolha do aluno
  // recolheria. Sem esta asserção o teste passaria mesmo se o estado escolhido
  // coubesse, e nada teria ameaçado a escolha.
  expect(await alturaEstavel(peca)).toBeGreaterThan(await orcamento(page));
});

test("no expandido, seta e espaço andam a busca e não roubam a tecla de quem digita", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  const painel = await expandir(page, 0);
  const passo = painel.locator(".viz-step");

  await expect(passo).toHaveText("passo 1 de 14");
  await page.keyboard.press("ArrowRight");
  await expect(passo).toHaveText("passo 2 de 14");
  await page.keyboard.press("ArrowLeft");
  await expect(passo).toHaveText("passo 1 de 14");

  // Espaço roda e pausa, e o rótulo do botão diz em qual dos dois estados está.
  await page.keyboard.press("Space");
  await expect(painel.getByRole("button", { name: "❚❚ Pausar" })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();

  // Com o cursor num campo, espaço é espaço e seta é cursor. Sequestrar isso
  // deixaria a lista impossível de editar, que é pior que não ter atalho.
  const campo = painel.locator("input.viz-input").first();
  await campo.fill("10, 20, 30");
  await expect(passo).toHaveText("passo 1 de 12");

  await campo.press("Space");
  await expect(campo).toHaveValue("10, 20, 30 ");
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();

  // `fill` deixa o cursor no fim sem depender de `End`, que no macOS não leva o
  // cursor ao fim de um input. Comparo o cursor com ele mesmo.
  const antes = await campo.evaluate((el: HTMLInputElement) => el.selectionStart ?? -1);
  await campo.press("ArrowLeft");
  const depois = await campo.evaluate((el: HTMLInputElement) => el.selectionStart ?? -1);
  expect(depois).toBe(antes - 1);
  await expect(passo).toHaveText("passo 1 de 12");

  await page.keyboard.press("Escape");
  await expect(page.locator(".viz-overlay")).toHaveCount(0);
});
