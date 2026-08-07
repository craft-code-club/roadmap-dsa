import { test, expect, type Locator, type Page } from "@playwright/test";

// A casca adaptativa nas duas peças de `backtracking`: a árvore de decisão e o
// sudoku. A terceira figura da página (`BacktrackingPoda`) não tem overlay e
// ficou fora — por isso todo seletor daqui é escopado na figura, e as contagens
// são afirmadas nos dois níveis (página e figura). Sem isso, `.viz-step` casa
// duas figuras e a leitura sai da peça errada.
//
// Medido antes de escrever: no expandido a figura inteira rolava, e o
// `▶ Rodar` era desenhado 335px (árvore, 1512x900) e 590px (sudoku, 1440x600)
// abaixo do pé visível da peça. É isso que a camada 1 conserta, e é a posição
// do controle comparada com ela mesma que prova — `toBeInViewport()` sozinho
// passa nas duas pontas da rolagem.

const URL = "/topico/backtracking/";

const ARVORE = 0;
const SUDOKU = 1;

/** Folga de subpixel, igual à do hook. */
const SLACK = 8;

async function abrirPagina(page: Page, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h });
  expect(page.viewportSize()).toEqual({ width: w, height: h });
  await page.goto(URL);
  await expect(page.locator("article figure.viz")).toHaveCount(3);
}

/** A figura da peça, com as contagens afirmadas nos dois níveis. */
async function figura(page: Page, i: number): Promise<Locator> {
  const fig = page.locator("article figure.viz").nth(i);
  await expect(fig).toHaveClass(/viz-fit/);
  // Na página `.viz-step` casa TRÊS, e o terceiro não é um contador de passo: o
  // `BacktrackingPoda` usa a mesma classe para dizer "6 rainhas · 4 soluções ·
  // 2.6x menos nós com poda". Escopar na figura não é preciosismo — sem isso a
  // leitura sai da peça errada e o teste fica verde medindo outra coisa.
  await expect(page.locator("article figure.viz .viz-step")).toHaveCount(3);
  await expect(page.locator("article figure.viz:not(.viz-fit) .viz-step")).not.toContainText("passo");
  await expect(fig.locator(".viz-step")).toHaveCount(1);
  await expect(fig.locator(".viz-step")).toContainText("passo");
  // O bloco recolhível existe só nas duas peças adaptadas.
  await expect(page.locator("article figure.viz .viz-code")).toHaveCount(2);
  await expect(fig.locator(".viz-code")).toHaveCount(1);
  return fig;
}

/** Anda `n` passos pelo botão, que é o caminho do aluno. */
async function avancar(fig: Locator, n: number) {
  const proximo = fig.locator("button", { hasText: "Próximo" });
  for (let i = 0; i < n; i++) await proximo.click();
}

/** Expande e espera o painel estar PRONTO PARA O TECLADO, não só visível. */
async function expandir(page: Page, fig: Locator): Promise<Locator> {
  await fig.locator("button", { hasText: "Expandir" }).click();
  const painel = page.locator(".viz-overlay-fit figure.viz");
  await expect(painel).toHaveCount(1);
  // O hook põe o foco na figura e registra o `keydown` no mesmo commit: o foco
  // chegando é a prova de que o listener existe. `toBeVisible()` não é.
  await expect(painel).toBeFocused();
  return painel;
}

// ---------------------------------------------------------------------------
// Camada 1 — cabeçalho e controles parados, só o miolo rola.
// ---------------------------------------------------------------------------

for (const caso of [
  // O passo é o do PICO medido, não o primeiro: na árvore a pilha de chamadas
  // cresce e desce, e no passo 1 o miolo ainda não tem sobra suficiente.
  { nome: "árvore", i: ARVORE, passos: 11, w: 1440, h: 700 },
  { nome: "sudoku", i: SUDOKU, passos: 0, w: 1440, h: 700, preset: "9x9 com 20 lacunas" },
]) {
  test(`${caso.nome}: no expandido o miolo rola e o ▶ Rodar não anda`, async ({ page }) => {
    await abrirPagina(page, caso.w, caso.h);
    const fig = await figura(page, caso.i);
    if (caso.preset) {
      await fig.locator("button", { hasText: caso.preset }).click();
      await expect(fig.locator(".bt-cel")).toHaveCount(81);
    }
    await avancar(fig, caso.passos);

    const painel = await expandir(page, fig);
    const miolo = painel.locator(".viz-body");
    const rodar = painel.locator(".viz-play");
    const cabeca = painel.locator(".viz-head");

    // Rótulo junto do comportamento: o controle que não pode sumir é o que diz
    // "▶ Rodar", não um botão qualquer.
    await expect(rodar).toHaveText("▶ Rodar");

    // Premissa: existe sobra para rolar. Sem ela o teste vira decoração verde.
    const sobra = await miolo.evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(sobra).toBeGreaterThan(SLACK);

    // O `click()` do Playwright rola o contêiner para alcançar o alvo, então a
    // leitura de referência só vale com o `scrollTop` zerado.
    await miolo.evaluate((el) => { el.scrollTop = 0; });
    const antes = {
      cabeca: (await cabeca.boundingBox())!.y,
      rodar: (await rodar.boundingBox())!.y,
    };

    await miolo.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    // Quem rolou foi o miolo, e não a figura: é essa a diferença que a camada 1
    // faz, e é o que a quebra canônica (devolver o rodapé ao miolo) desfaz.
    expect(await miolo.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await painel.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(SLACK);

    const depois = {
      cabeca: (await cabeca.boundingBox())!.y,
      rodar: (await rodar.boundingBox())!.y,
    };
    expect(Math.round(depois.cabeca - antes.cabeca)).toBe(0);
    // A asserção que carrega o sentido: o controle comparado com ele mesmo.
    expect(Math.round(depois.rodar - antes.rodar)).toBe(0);
    await expect(rodar).toBeInViewport({ ratio: 1 });
  });
}

// ---------------------------------------------------------------------------
// Camada 3 — o bloco recolhível, e quem decide é a medição.
// ---------------------------------------------------------------------------

for (const caso of [
  { nome: "árvore", i: ARVORE },
  { nome: "sudoku", i: SUDOKU },
]) {
  test(`${caso.nome}: em tela baixa o código vem recolhido, com o rótulo certo`, async ({ page }) => {
    await abrirPagina(page, 1440, 700);
    const fig = await figura(page, caso.i);
    const botao = fig.locator(".viz-toggle-codigo");

    await expect(fig).toHaveAttribute("data-codigo", "off");
    await expect(botao).toHaveText("Mostrar código");
    await expect(botao).toHaveAttribute("aria-expanded", "false");
    // Recolhido não é só invisível: sai do teclado e dos leitores de tela.
    await expect(fig.locator(".viz-code")).toHaveAttribute("aria-hidden", "true");
  });

  test(`${caso.nome}: em tela alta o código já vem aberto`, async ({ page }) => {
    await abrirPagina(page, 1512, 1600);
    const fig = await figura(page, caso.i);
    const botao = fig.locator(".viz-toggle-codigo");

    await expect(fig).toHaveAttribute("data-codigo", "on");
    await expect(botao).toHaveText("Ocultar código");
    await expect(botao).toHaveAttribute("aria-expanded", "true");
    // O texto do bloco é lido por `textContent` (as `.viz-line`), nunca por
    // `innerText`: recolhido, o `innerText` devolve vazio justo para o Python.
    await expect(fig.locator(".viz-code .viz-line").first()).toContainText("def ");
  });
}

// A escolha do aluno vence a medição — e o estado trocado precisa ser um que
// DISPARE medição nova (`measureOn`), senão nada ameaçou a escolha.
test("árvore: mostrar o código sobrevive à troca de modo", async ({ page }) => {
  await abrirPagina(page, 1440, 700);
  const fig = await figura(page, ARVORE);
  const cartao = fig.locator(".bigo-stat", { hasText: "nós da árvore inteira" });
  // O card concatena rótulo e valor num nó só ("nós da árvore inteira8"), então
  // `toContainText("8")` passa com 18 ou 80. O <strong> guarda só o número.
  const valor = cartao.locator("strong");

  await expect(fig).toHaveAttribute("data-codigo", "off");
  await expect(valor).toHaveText("8");

  await fig.locator(".viz-toggle-codigo").click();
  await expect(fig).toHaveAttribute("data-codigo", "on");

  // `measureOn: [mode]` — trocar o modo troca a profundidade da árvore e pede
  // medição nova, que numa janela de 700px recolheria.
  await fig.locator("button", { hasText: "Combinações de 2 entre 1, 2, 3, 4" }).click();
  // A troca aconteceu mesmo na tela: rótulo e valor no MESMO cartão.
  await expect(cartao).toContainText("nós da árvore inteira");
  await expect(valor).toHaveText("10");

  await expect(fig).toHaveAttribute("data-codigo", "on");
  await expect(fig.locator(".viz-toggle-codigo")).toHaveText("Ocultar código");
});

test("sudoku: mostrar o código sobrevive à troca de preset", async ({ page }) => {
  await abrirPagina(page, 1440, 700);
  const fig = await figura(page, SUDOKU);
  const cartao = fig.locator(".bigo-stat", { hasText: "lacunas do tabuleiro" });
  // Mesmo motivo do teste acima: no card inteiro, "11" passa com 11, 110 ou 211.
  const valor = cartao.locator("strong");

  await expect(fig).toHaveAttribute("data-codigo", "off");
  await expect(fig.locator(".bt-cel")).toHaveCount(16);
  await expect(valor).toHaveText("11");

  await fig.locator(".viz-toggle-codigo").click();
  await expect(fig).toHaveAttribute("data-codigo", "on");

  // `measureOn: [presetKey]` — o 9x9 traz uma grade 190px mais alta.
  await fig.locator("button", { hasText: "9x9 com 20 lacunas" }).click();
  await expect(fig.locator(".bt-cel")).toHaveCount(81);
  await expect(cartao).toContainText("lacunas do tabuleiro");
  await expect(valor).toHaveText("20");

  await expect(fig).toHaveAttribute("data-codigo", "on");
  await expect(fig.locator(".viz-toggle-codigo")).toHaveText("Ocultar código");
});

// ---------------------------------------------------------------------------
// Teclado — e o inverso dele, que é o que importa mais.
// ---------------------------------------------------------------------------

for (const caso of [
  { nome: "árvore", i: ARVORE, total: 32 },
  { nome: "sudoku", i: SUDOKU, total: 60 },
]) {
  test(`${caso.nome}: a seta anda o passo no painel`, async ({ page }) => {
    await abrirPagina(page, 1440, 700);
    const fig = await figura(page, caso.i);
    const painel = await expandir(page, fig);
    const contador = painel.locator(".viz-step");

    await expect(contador).toHaveText(`passo 1 de ${caso.total}`);
    // Uma ação só: um par inverso (→ depois ←) devolveria a peça ao começo e
    // ficaria verde mesmo com a tecla sendo roubada.
    await page.keyboard.press("ArrowRight");
    await expect(contador).toHaveText(`passo 2 de ${caso.total}`);
    await page.keyboard.press("ArrowRight");
    await expect(contador).toHaveText(`passo 3 de ${caso.total}`);
  });

  test(`${caso.nome}: a seta não é roubada de quem está no controle de velocidade`, async ({ page }) => {
    await abrirPagina(page, 1440, 700);
    const fig = await figura(page, caso.i);
    const painel = await expandir(page, fig);
    const contador = painel.locator(".viz-step");
    const marcha = painel.locator(".viz-speed .val");
    const slider = painel.locator("input[type=range]");
    await expect(slider).toHaveCount(1);

    await expect(contador).toHaveText(`passo 1 de ${caso.total}`);
    await expect(marcha).toHaveText("1.5x");

    await slider.focus();
    await page.keyboard.press("ArrowRight");

    // A tecla foi para o slider: a marcha subiu…
    await expect(marcha).toHaveText("2x");
    // …e o passo não andou. Campo em edição manda.
    await expect(contador).toHaveText(`passo 1 de ${caso.total}`);
  });
}
