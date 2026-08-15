import { test, expect, type Page } from "@playwright/test";

// Casca adaptativa do classificador de subarray / substring / subsequence /
// subset. Ele é o canto fora do padrão da casca: `total: 1` (não há linha do
// tempo) e `collapsible: false` (não há bloco dispensável), então os testes de
// "Mostrar código" do contrato não se aplicam aqui. O que sobra, e é o que este
// arquivo prova, é a camada 1 — cabeçalho e controles parados — mais o inverso
// dos atalhos: sem linha do tempo, seta e espaço são de quem está digitando.
//
// Todos leem RÓTULO, não só número: veredito certo debaixo do nome errado
// ensina errado do mesmo jeito.

const URL = "/topicos/subarray-substring-subsequence-subset/";

/** Abre o painel expandido com as fontes prontas e a animação congelada. */
async function expandir(page: Page) {
  await page.goto(URL);
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: "*, *::before, *::after { transition: none !important; animation: none !important; }",
  });
  await page.getByRole("button", { name: /Expandir/ }).click();
  const painel = page.locator(".viz-overlay figure.viz");
  await expect(painel).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: "*, *::before, *::after { transition: none !important; animation: none !important; }",
  });
  return painel;
}

/** O cartão de veredito que leva ESTE nome. Ler o selo sem ele não prova nada. */
function veredito(painel: ReturnType<Page["locator"]>, nome: string) {
  return painel.locator(".sub-veredito", { has: painel.page().getByText(nome, { exact: true }) });
}

test("no expandido, cabeçalho e presets ficam parados quando o miolo rola", async ({ page }) => {
  // 600px de altura é onde o miolo passa a sobrar de verdade (medido: 73px).
  await page.setViewportSize({ width: 1440, height: 600 });
  const painel = await expandir(page);
  await painel.getByRole("button", { name: "fora de ordem" }).click();

  const antes = await painel.evaluate((f) => {
    const body = f.querySelector<HTMLElement>(".viz-body")!;
    const head = f.querySelector<HTMLElement>(".viz-head")!;
    const ctrl = f.querySelector<HTMLElement>(".viz-controls")!;
    return {
      sobra: body.scrollHeight - body.clientHeight,
      head: Math.round(head.getBoundingClientRect().top),
      ctrl: Math.round(ctrl.getBoundingClientRect().top),
    };
  });
  // Sem sobra o teste não testaria nada: ele precisa de miolo para rolar.
  expect(antes.sobra).toBeGreaterThan(20);

  const depois = await painel.evaluate(async (f) => {
    const body = f.querySelector<HTMLElement>(".viz-body")!;
    body.scrollTop = body.scrollHeight;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const head = f.querySelector<HTMLElement>(".viz-head")!;
    const ctrl = f.querySelector<HTMLElement>(".viz-controls")!;
    return {
      rolou: Math.round(body.scrollTop),
      head: Math.round(head.getBoundingClientRect().top),
      ctrl: Math.round(ctrl.getBoundingClientRect().top),
    };
  });

  expect(depois.rolou).toBeGreaterThan(20); // o miolo rolou mesmo
  expect(depois.head).toBe(antes.head); // e o cabeçalho não foi junto
  expect(depois.ctrl).toBe(antes.ctrl); // nem os presets

  // O título continua legível depois de rolar: é ele que diz o que a peça é.
  await expect(painel.getByText("Visualizador · monte um pedaço e veja o que ele é")).toBeInViewport();
});

test("em janela baixa, o preset fica ao alcance SEM rolar o miolo", async ({ page }) => {
  // Antes da casca, medido em 1440x520: o "↺ Limpar" era desenhado 177px ABAIXO
  // do pé da peça — no DOM, inalcançável para o aluno.
  //
  // O `scrollTop` é o que dá o teste de pé, e ele custou uma rodada: a primeira
  // versão clicava num preset antes de medir, e o Playwright ROLA o contêiner
  // para alcançar o alvo. Com o rodapé de volta dentro do miolo, o clique
  // continuava funcionando — depois de rolar — e o teste passava contra o
  // código quebrado. "Alcançável" não é "está à vista".
  await page.setViewportSize({ width: 1440, height: 520 });
  const painel = await expandir(page);
  const miolo = painel.locator(".viz-body");

  // Só um clique numa célula, que fica no topo do miolo e não pede rolagem.
  await painel.getByRole("button", { name: "Índice 1, valor 1" }).click();
  await expect(painel.locator(".sub-montado-val")).toHaveText("[1]");
  await expect(miolo).toHaveJSProperty("scrollTop", 0);

  const limpar = painel.getByRole("button", { name: "↺ Limpar" });
  await expect(limpar).toBeInViewport();
  await limpar.click();
  await expect(painel.getByText("clique nos elementos acima, na ordem que quiser")).toBeVisible();
  // E o clique não precisou rolar nada para acontecer.
  await expect(miolo).toHaveJSProperty("scrollTop", 0);
});

test("sem linha do tempo, espaço e seta são de quem digita e Esc fecha", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  const painel = await expandir(page);
  const campo = painel.locator("input.viz-input");

  // `fill` deixa o cursor no fim sem depender de `End`, que no macOS não leva
  // o cursor ao fim de um input.
  await campo.fill("1, 2, 3");
  // O cabeçalho lê o n de verdade, e é o único número que ele mostra: sem linha
  // do tempo não existe "passo 1 de N" para exibir.
  await expect(painel.locator(".viz-step")).toHaveText("n = 3");
  // E nenhum botão promete esconder um bloco que este visualizador não tem.
  await expect(painel.getByRole("button", { name: /código/ })).toHaveCount(0);

  // Espaço digitou espaço: o painel não sequestrou a tecla para "rodar".
  await campo.press("Space");
  await expect(campo).toHaveValue("1, 2, 3 ");
  await expect(painel).toBeVisible();

  // Seta anda o cursor. Comparo o cursor com ele mesmo em vez de olhar o fim da
  // string: se alguém desse `preventDefault` na seta, o cursor ficaria parado.
  const antes = await campo.evaluate((el: HTMLInputElement) => el.selectionStart ?? -1);
  await campo.press("ArrowLeft");
  const depois = await campo.evaluate((el: HTMLInputElement) => el.selectionStart ?? -1);
  expect(depois).toBe(antes - 1);
  await expect(painel).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator(".viz-overlay")).toHaveCount(0);
});

test("o selo de cada veredito responde à ordem do clique, sob o nome certo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(URL);
  const peca = page.locator("article figure.viz");

  // Índices 1 e 2, nessa ordem: colados e da esquerda para a direita.
  await peca.getByRole("button", { name: "Índice 1, valor 1" }).click();
  await peca.getByRole("button", { name: "Índice 2, valor 2" }).click();
  await expect(peca.locator(".sub-montado-val")).toHaveText("[1, 2]");
  await expect(veredito(peca, "Subarray").locator(".sub-veredito-selo")).toHaveText("✓ é");
  await expect(veredito(peca, "Subsequence").locator(".sub-veredito-selo")).toHaveText("✓ é");
  await expect(veredito(peca, "Subset").locator(".sub-veredito-selo")).toHaveText("✓ é");

  // Mesmos dois elementos, ordem invertida: só o subconjunto sobrevive.
  await peca.getByRole("button", { name: "↺ Limpar" }).click();
  await peca.getByRole("button", { name: "Índice 2, valor 2" }).click();
  await peca.getByRole("button", { name: "Índice 1, valor 1" }).click();
  await expect(veredito(peca, "Subarray").locator(".sub-veredito-selo")).toHaveText("✕ não é");
  await expect(veredito(peca, "Subsequence").locator(".sub-veredito-selo")).toHaveText("✕ não é");
  await expect(veredito(peca, "Subset").locator(".sub-veredito-selo")).toHaveText("✓ é");
  // O texto do cartão explica o selo que está ao lado dele, não o do vizinho.
  await expect(veredito(peca, "Subarray").locator(".sub-veredito-txt")).toContainText("fora da ordem");
  await expect(veredito(peca, "Subset").locator(".sub-veredito-txt")).toContainText("mesmo subconjunto");
});

test("trocar de Array para String troca o rótulo da fatia e as contagens", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(URL);
  const peca = page.locator("article figure.viz");

  // n = 4 → 10 fatias, 15 subsequências não-vazias, 16 subconjuntos.
  await expect(peca.locator(".viz-step")).toHaveText("n = 4");
  // Número e rótulo lidos nos nós que guardam cada um: no cartão inteiro,
  // `toContainText("10")` passa com 100 e `toContainText("16")` com 160 — e as
  // três contagens (10, 15, 16) são a aula desta peça.
  const contas = peca.locator(".sub-conta");
  const val = (i: number) => contas.nth(i).locator(".sub-conta-val");
  await expect(val(0)).toHaveText("10");
  await expect(contas.nth(0).locator(".sub-conta-lbl")).toHaveText(
    "subarrays não-vazios · n(n+1)/2"
  );
  await expect(val(1)).toHaveText("15");
  await expect(val(2)).toHaveText("16");

  await peca.getByRole("button", { name: "String", exact: true }).click();
  // "code" também tem 4 elementos: o número não muda, o RÓTULO muda — que é o
  // ponto do botão (substring é subarray numa string).
  await expect(peca.locator(".viz-step")).toHaveText("n = 4");
  await expect(contas.nth(0).locator(".sub-conta-lbl")).toHaveText(
    "substrings não-vazios · n(n+1)/2"
  );
  await expect(veredito(peca, "Substring")).toBeVisible();
  await expect(veredito(peca, "Substring").locator(".sub-veredito-sub")).toHaveText(
    "em array, isso se chama subarray"
  );
});
