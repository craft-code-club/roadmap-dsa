import { test, expect, type Page, type Locator } from "@playwright/test";

// Casca adaptativa dos três visualizadores de filas.
//
// A página tem três peças, nesta ordem:
//   0 · QueueVisualizer       — a fila no array: ingênua x buffer circular
//   1 · QueueDuasPilhas       — a fila com duas pilhas (LeetCode 232)
//   2 · QueueDequeMonotonico  — o deque decrescente (LeetCode 239)
//
// O defeito que estes testes protegem não era altura: no painel expandido a
// FIGURA inteira rolava, e o cabeçalho ia junto. Medido em 1512x900, antes:
// o cabeçalho subia 837px (fila), 410px (duas pilhas) e 256px (deque), e o
// `▶ Rodar` era desenhado com a base em 1678px, 1251px e 1097px numa janela de
// 900 — o aluno perdia de vista justamente o botão que faz a peça andar.
//
// Todo teste aqui mede COMPORTAMENTO e lê RÓTULO. Contar elemento não prova
// nada, e comportamento certo debaixo do rótulo errado ensina errado do mesmo
// jeito.

const URL = "/topico/filas/";

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

/** Anda a peça até o último passo, clicando no botão que o aluno clicaria. */
async function irAteOFim(peca: Locator) {
  const proximo = peca.getByRole("button", { name: "Próximo ›" });
  for (let k = 0; k < 90; k++) {
    if (await proximo.isDisabled()) break;
    await proximo.click();
  }
}

// ---------------------------------------------------------------------------
// Camada 1: cabeçalho e controles parados, só o miolo rola.
// ---------------------------------------------------------------------------

test("no expandido da fila, o ▶ Rodar fica parado enquanto o miolo rola", async ({ page }) => {
  // Medido em 1512x900, antes da casca: o `.viz` inteiro rolava 837px, o
  // cabeçalho subia os mesmos 837px e o `▶ Rodar` era desenhado com a base em
  // 1678px numa janela de 900 — 778px abaixo do pé visível.
  await page.setViewportSize({ width: 1512, height: 900 });
  const painel = await expandir(page, 0);

  const r = await rolarAteOFim(painel);
  // Sem sobra o teste não testaria nada: ele precisa de miolo para rolar.
  expect(r.sobra).toBeGreaterThan(20);
  expect(r.rolou).toBeGreaterThan(20);
  // E quem rola tem que ser o miolo, não a figura.
  expect(r.figuraRolou).toBe(0);
  expect(r.headMoveu).toBe(0);
  expect(r.footMoveu).toBe(0);

  // Os controles continuam LEGÍVEIS, com o rótulo deles, depois de rolar.
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeInViewport();
  await expect(painel.getByRole("button", { name: "Próximo ›" })).toBeInViewport();
  await expect(
    painel.getByText("Visualizador · a fila no array: ingênua x buffer circular")
  ).toBeInViewport();
  // A dica de atalho só vale no expandido, e é o que torna o teclado descobrível.
  await expect(painel.locator(".viz-atalhos")).toBeInViewport();
});

test("no expandido das duas pilhas, o Próximo › anda o passo depois da rolagem", async ({
  page,
}) => {
  // 1440x600: medido, o miolo sobra 191px. Antes da casca a figura inteira
  // rolava 710px e o `▶ Rodar` era desenhado com a base em 1251px numa janela
  // de 600.
  await page.setViewportSize({ width: 1440, height: 600 });
  const painel = await expandir(page, 1);

  await expect(painel.locator(".viz-step")).toHaveText("passo 1 de 21");

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
  await expect(painel.locator(".viz-step")).toHaveText("passo 2 de 21");
  await expect(painel.locator(".viz-note")).toContainText(
    "Enfileirar A é só empilhar na entrada, sem olhar para mais nada."
  );
  // Rótulo e valor lidos JUNTOS, no mesmo cartão: o guarda de idioma compara o
  // conjunto de textos e não vê posição, então trocar dois campos de lugar
  // passaria por ele. Aqui não passa.
  await expect(painel.locator(".viz-var").filter({ hasText: "entrada" }).first()).toContainText("A");
});

test("no expandido do deque, o cabeçalho não sobe com o array cheio e k = 1", async ({ page }) => {
  // O pior caso da ENTRADA desta peça: 14 números com k = 1 fecham 14 janelas,
  // e cada uma vira uma ficha na fita de saída. Medido antes da casca: 1.247px
  // de peça no artigo e a figura rolando 599px no expandido de 1440x600.
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(2);

  await peca.locator("input.viz-input").first().fill("1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14");
  await peca.locator("input.viz-input.k").fill("1");
  // A entrada mudou mesmo, e a peça diz qual é: sem esta asserção o teste
  // mediria o estado padrão e ficaria verde à toa.
  await expect(peca.locator(".fila-resumo")).toContainText("n = 14, k = 1: são 14 janelas");
  await expect(peca.locator(".viz-step")).toHaveText("passo 1 de 70");

  const painel = await expandirAqui(page, 2);
  const r = await rolarAteOFim(painel);
  expect(r.sobra).toBeGreaterThan(20);
  expect(r.rolou).toBeGreaterThan(20);
  expect(r.figuraRolou).toBe(0);
  expect(r.headMoveu).toBe(0);
  expect(r.footMoveu).toBe(0);

  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeInViewport();
  await expect(painel.locator(".viz-step")).toBeInViewport();
});

// ---------------------------------------------------------------------------
// Camada 3: o bloco de código recolhe, e o rótulo diz o que some.
// ---------------------------------------------------------------------------

test("em 1512x900 as três peças vêm com o código recolhido, sob o rótulo certo", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);

  // Medido com o código à mostra: 1.532px, 1.222px e 1.095px, contra 816 de
  // orçamento. As três estouram, então as três recolhem.
  const arquivos = ["fila_ingenua.py", "fila_com_duas_pilhas.py", "maximos_da_janela.py"];
  for (let i = 0; i < 3; i++) {
    const peca = page.locator("article figure.viz").nth(i);
    const codigo = peca.locator(".viz-code");

    // O rótulo diz o que o botão FAZ, e o bloco está mesmo sem altura. Rótulo
    // sem medida, ou medida sem rótulo, deixaria passar o caso em que o botão
    // promete uma coisa e a peça faz outra.
    await expect(peca.getByRole("button", { name: "Mostrar código" })).toBeVisible();
    await expect(peca).toHaveAttribute("data-codigo", "off");
    expect(await alturaEstavel(codigo)).toBeLessThanOrEqual(4);

    // A premissa medida, dentro do teste: com o código à mostra a peça NÃO cabe
    // no orçamento. Sem isto o teste ficaria verde no dia em que o recolhimento
    // fosse decidido por engano.
    await peca.getByRole("button", { name: "Mostrar código" }).click();
    await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
    await expect(peca).toHaveAttribute("data-codigo", "on");
    expect(await alturaEstavel(codigo)).toBeGreaterThan(150);
    expect(await alturaEstavel(peca)).toBeGreaterThan(await orcamento(page));
    // E o código que apareceu é o DESTA peça.
    await expect(peca.locator(".viz-code-head")).toHaveText(arquivos[i]);
  }
});

test("em janela alta o código do deque já vem aberto", async ({ page }) => {
  // Medido: com o código à mostra o deque pede 1.095px. Em 1300px de janela o
  // orçamento é 1.216px, então a medição não tem motivo para esconder nada.
  await page.setViewportSize({ width: 1512, height: 1300 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(2);

  await expect(peca).toHaveAttribute("data-codigo", "on");
  await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
  expect(await alturaEstavel(peca.locator(".viz-code"))).toBeGreaterThan(150);
  await expect(peca.locator(".viz-code-head")).toHaveText("maximos_da_janela.py");
  await expect(peca.locator(".viz-line").first()).toContainText("from collections import deque");
  expect(await alturaEstavel(peca)).toBeLessThanOrEqual(await orcamento(page));

  // E a peça de cima, que pede 1.532px, continua recolhida na MESMA janela: a
  // decisão é por medição, não por um breakpoint que valeria para as três.
  await expect(page.locator("article figure.viz").nth(0)).toHaveAttribute("data-codigo", "off");
});

test("a escolha de mostrar o código sobrevive à troca de modo da fila", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(0);

  await peca.getByRole("button", { name: "Mostrar código" }).click();
  await expect(peca).toHaveAttribute("data-codigo", "on");

  // Trocar de modo troca o código inteiro e acrescenta uma quinta ficha de
  // estatística: `mode` está no `measureOn`, então a medição roda de novo.
  await peca.getByRole("button", { name: "buffer circular" }).click();
  await expect(peca.locator(".viz-code-head")).toHaveText("fila_circular.py");
  await expect(peca.locator(".bigo-stat").filter({ hasText: "início == fim?" })).toBeVisible();

  // "Está aberto agora" não é "continua aberto": amostro ao longo do tempo.
  // Esta é a asserção que carrega o sentido do teste, e por isso vem ANTES da
  // premissa: com a escolha do aluno desfeita, é ela que tem de reprovar.
  for (let k = 0; k < 6; k++) {
    await expect(peca).toHaveAttribute("data-codigo", "on");
    await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
    await page.waitForTimeout(120);
  }

  // Premissa medida: neste estado, com o código à mostra, a peça estoura o
  // orçamento — ou seja, uma medição sem a escolha do aluno recolheria.
  expect(await alturaEstavel(peca)).toBeGreaterThan(await orcamento(page));
});

// ---------------------------------------------------------------------------
// Teclado, e o inverso dele: campo em edição manda.
// ---------------------------------------------------------------------------

test("no expandido, seta e espaço andam o deque e não roubam a tecla de quem digita", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  const painel = await expandir(page, 2);
  const passo = painel.locator(".viz-step");

  await expect(passo).toHaveText("passo 1 de 40");
  await page.keyboard.press("ArrowRight");
  await expect(passo).toHaveText("passo 2 de 40");
  await page.keyboard.press("ArrowLeft");
  await expect(passo).toHaveText("passo 1 de 40");

  // Espaço roda e pausa, e o rótulo do botão diz em qual dos dois estados está.
  await page.keyboard.press("Space");
  await expect(painel.getByRole("button", { name: "❚❚ Pausar" })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();

  // Com o cursor num campo, espaço é espaço e seta é cursor. Sequestrar isso
  // deixaria o array impossível de editar, que é pior que não ter atalho.
  const campo = painel.locator("input.viz-input").first();
  await campo.fill("4, 5, 6");
  await expect(passo).toHaveText("passo 1 de 15");

  await campo.press("Space");
  await expect(campo).toHaveValue("4, 5, 6 ");
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();

  // `fill` deixa o cursor no fim sem depender de `End`, que no macOS não leva o
  // cursor ao fim de um input. Comparo o cursor com ele mesmo.
  const antes = await campo.evaluate((el: HTMLInputElement) => el.selectionStart ?? -1);
  await campo.press("ArrowLeft");
  const depois = await campo.evaluate((el: HTMLInputElement) => el.selectionStart ?? -1);
  expect(depois).toBe(antes - 1);
  await expect(passo).toHaveText("passo 1 de 15");

  await page.keyboard.press("Escape");
  await expect(page.locator(".viz-overlay")).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// A aula da peça continua de pé depois do rename de identificadores: o número
// e o rótulo que o explica, lidos juntos.
// ---------------------------------------------------------------------------

test("o contador de movimentações separa a fila ingênua do buffer circular", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(0);
  const movs = peca.locator(".bigo-stat").filter({ hasText: "movimentações de elementos" });
  const custo = peca.locator(".bigo-stat").filter({ hasText: "custo do desenfileirar" });

  // Rótulo e valor no MESMO cartão: é o par que ensina, e é o par que um rename
  // com dois campos trocados de lugar quebraria sem o guarda de idioma acusar.
  // O `filter` prende o rótulo; o `<strong>` isola o valor, porque no card
  // inteiro `toContainText("0")` passa com 10, 20 ou 70 — e "0 contra 7" é
  // justamente o aha deste tópico.
  const valorDe = (card: typeof movs) => card.locator("strong");
  await expect(valorDe(movs)).toHaveText("0");
  await irAteOFim(peca);
  await expect(peca.locator(".viz-step")).toHaveText("passo 27 de 27");
  await expect(valorDe(movs)).toHaveText("7");
  await expect(valorDe(custo)).toHaveText("O(n)");
  await expect(peca.locator(".viz-note")).toContainText("Repare no resíduo");

  // O mesmo roteiro no buffer circular: zero movimentação, e o custo muda de
  // rótulo junto. Se o contador ficasse em 7 aqui, o "aha" do tópico sumia.
  await peca.getByRole("button", { name: "buffer circular" }).click();
  await expect(peca.locator(".viz-step")).toHaveText("passo 1 de 27");
  await irAteOFim(peca);
  await expect(valorDe(movs)).toHaveText("0");
  await expect(valorDe(custo)).toHaveText("O(1)");
  await expect(peca.locator(".viz-var").filter({ hasText: "devolvido" })).toContainText("B");
});
