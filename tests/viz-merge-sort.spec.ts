import { test, expect, type Page, type Locator } from "@playwright/test";

// A casca adaptativa do merge sort.
//
// A página tem TRÊS `figure.viz` (o visualizador principal, o desenho do
// n log n e o comparador de estabilidade), e os três usam as mesmas classes com
// sentidos diferentes: `.viz-step` casa 3 na página, `.ms-niveis` casa 2,
// `.bigo-stat` casa 8. Por isso todo seletor daqui sai da FIGURA, nunca da
// página — um `page.locator(".viz-step")` devolveria "3 rodadas de intercalação
// x 8 elementos = 24 movimentos", que não é passo nenhum.

const SLACK = 8;

/** A figura adaptada é a primeira do artigo. */
function figura(page: Page): Locator {
  return page.locator("article figure.viz-fit");
}

async function abrir(page: Page, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto("/topico/merge-sort/");
  const vp = page.viewportSize();
  expect(vp).toEqual({ width: w, height: h });
  await page.evaluate(() => document.fonts.ready);
  const fig = figura(page);
  await expect(fig).toHaveCount(1);
  // a decisão da medição já aconteceu quando `data-anim` volta para "on"
  await expect(fig).toHaveAttribute("data-anim", "on");
  return fig;
}

/** Altura da figura depois que a transição de 0,32s passou E ela parou de mexer. */
async function alturaEstavel(page: Page): Promise<number> {
  await page.waitForTimeout(450);
  let iguais = 0;
  let ultimo = -1;
  for (let i = 0; i < 60; i++) {
    const v = await page.evaluate(() => {
      const f = document.querySelector("article figure.viz-fit") as HTMLElement;
      return Math.round(f.getBoundingClientRect().height);
    });
    if (v === ultimo) iguais++;
    else {
      iguais = 1;
      ultimo = v;
    }
    if (iguais >= 3) return v;
    await page.waitForTimeout(50);
  }
  throw new Error("a altura não estabilizou");
}

/** Lê rótulo e valor do MESMO cartão de estatística. */
async function ficha(fig: Locator, rotulo: string): Promise<string> {
  const cartao = fig.locator(".bigo-stat").filter({ hasText: rotulo });
  await expect(cartao).toHaveCount(1);
  return (await cartao.locator("strong").textContent())!.trim();
}

async function andar(fig: Locator, vezes: number) {
  const prox = fig.getByRole("button", { name: "Próximo ›" });
  for (let i = 0; i < vezes; i++) await prox.click();
}

async function preset(fig: Locator, nome: string) {
  await fig.getByRole("button", { name: nome }).click();
}

test.describe("merge sort · casca adaptativa", () => {
  test("a página tem três figuras e só a primeira é a adaptada", async ({ page }) => {
    await abrir(page, 1512, 900);
    // se este número mudar, todo seletor escopado deste arquivo precisa de revisão
    await expect(page.locator("article figure.viz")).toHaveCount(3);
    await expect(page.locator("article .viz-step")).toHaveCount(3);
    const fig = figura(page);
    await expect(fig.locator(".viz-step")).toHaveCount(1);
    await expect(fig.locator(".viz-step")).toHaveText(/^passo \d+ de \d+$/);
    await expect(fig.locator(".ms-niveis")).toHaveCount(1);
    await expect(fig.locator(".bigo-stat")).toHaveCount(4);
  });

  test("painel: o cabeçalho e os controles ficam parados enquanto o miolo rola", async ({ page }) => {
    const fig = await abrir(page, 1512, 900);
    await fig.getByRole("button", { name: "⤢ Expandir" }).click();
    const painel = page.locator(".viz-overlay-fit figure.viz-fit");
    await expect(painel).toBeVisible();

    // o pico da sobra do miolo desta peça está no MEIO da animação: é onde o
    // painel de intercalação existe. No passo 1 e no último ele nem é desenhado.
    await andar(painel, 10);
    await expect(painel.locator(".viz-step")).toHaveText("passo 11 de 79");
    await expect(painel.locator(".ms-merge")).toHaveCount(1);

    const antes = await page.evaluate(() => {
      const f = document.querySelector(".viz-overlay-fit figure.viz-fit") as HTMLElement;
      const b = f.querySelector(".viz-body") as HTMLElement;
      // o click() do Playwright rola o contêiner para alcançar o alvo: zerar
      // aqui é o que impede de medir a rolagem que o próprio teste causou
      f.scrollTop = 0;
      b.scrollTop = 0;
      return {
        sobraMiolo: b.scrollHeight - b.clientHeight,
        sobraFigura: f.scrollHeight - f.clientHeight,
        head: f.querySelector(".viz-head")!.getBoundingClientRect().top,
        foot: f.querySelector(".viz-foot")!.getBoundingClientRect().top,
        play: [...f.querySelectorAll("button")]
          .find((b2) => /Rodar|Pausar/.test(b2.textContent ?? ""))!
          .getBoundingClientRect().y,
      };
    });

    // pré-condições: sem sobra não há o que rolar, e o teste vira decoração
    expect(antes.sobraMiolo).toBeGreaterThan(SLACK);
    expect(antes.sobraFigura).toBeLessThanOrEqual(SLACK);

    const depois = await page.evaluate(() => {
      const f = document.querySelector(".viz-overlay-fit figure.viz-fit") as HTMLElement;
      const b = f.querySelector(".viz-body") as HTMLElement;
      b.scrollTop = b.scrollHeight;
      return {
        rolouMiolo: b.scrollTop,
        rolouFigura: f.scrollTop,
        head: f.querySelector(".viz-head")!.getBoundingClientRect().top,
        foot: f.querySelector(".viz-foot")!.getBoundingClientRect().top,
        play: [...f.querySelectorAll("button")]
          .find((b2) => /Rodar|Pausar/.test(b2.textContent ?? ""))!
          .getBoundingClientRect().y,
      };
    });

    // quem rolou foi o MIOLO, e não a figura
    expect(depois.rolouMiolo).toBeGreaterThan(0);
    expect(depois.rolouFigura).toBe(0);
    // a promessa da camada 1 é "parado": a posição comparada com ela mesma.
    // `toBeInViewport()` sozinho passa nas duas pontas da rolagem e aprovaria
    // o rodapé de volta dentro do miolo.
    expect(Math.abs(depois.head - antes.head)).toBeLessThanOrEqual(2);
    expect(Math.abs(depois.foot - antes.foot)).toBeLessThanOrEqual(2);
    expect(Math.abs(depois.play - antes.play)).toBeLessThanOrEqual(2);
    await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeInViewport({ ratio: 1 });
  });

  test("tela baixa: o botão diz Mostrar código e o bloco está recolhido", async ({ page }) => {
    const fig = await abrir(page, 1512, 900);
    await expect(fig).toHaveAttribute("data-codigo", "off");
    await expect(fig.getByRole("button", { name: /código/ })).toHaveText("Mostrar código");
    await expect(fig.getByRole("button", { name: /código/ })).toHaveAttribute("aria-expanded", "false");

    // recolher tem que tirar ALTURA, não só largura da coluna do grid: zerar a
    // trilha da coluna deixaria rótulo e `data-codigo` certos e a peça igual
    const slot = await fig.locator(".viz-code-slot").evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(slot).toBeLessThan(SLACK);

    const recolhida = await alturaEstavel(page);
    // premissa: com o código à mostra a peça não caberia — é o que justifica a camada 3
    await fig.getByRole("button", { name: "Mostrar código" }).click();
    const aberta = await alturaEstavel(page);
    expect(aberta - recolhida).toBeGreaterThan(300);
    expect(aberta).toBeGreaterThan(900 - 60 - 24);
  });

  test("tela alta: o bloco já vem aberto, e quem decide é a medição", async ({ page }) => {
    const fig = await abrir(page, 1512, 1700);
    await expect(fig).toHaveAttribute("data-codigo", "on");
    await expect(fig.getByRole("button", { name: /código/ })).toHaveText("Ocultar código");
    const slot = await fig.locator(".viz-code-slot").evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(slot).toBeGreaterThan(300);
    // e o Python está mesmo lá dentro
    await expect(fig.locator(".viz-code-head")).toHaveText("merge_sort.py");
    await expect(fig.locator(".viz-line")).toHaveCount(15);
  });

  test("a escolha do aluno vence a medição e sobrevive à troca de preset", async ({ page }) => {
    const fig = await abrir(page, 1512, 900);
    await expect(fig).toHaveAttribute("data-codigo", "off");
    await fig.getByRole("button", { name: "Mostrar código" }).click();
    await expect(fig).toHaveAttribute("data-codigo", "on");

    // o preset é o que está em `measureOn`: trocá-lo PEDE medição nova, e a
    // medição, sozinha, mandaria recolher nesta janela
    await preset(fig, "Já ordenado: 1 2 3 4 5 6 7 8");
    expect(await ficha(fig, "tamanho do array")).toBe("8");

    // asserção ANTES da premissa: com a quebra aplicada a peça recolhe e
    // encolhe, e a premissa "não cabe" viraria falsa antes da asserção rodar
    for (let i = 0; i < 9; i++) {
      await expect(fig).toHaveAttribute("data-codigo", "on");
      await page.waitForTimeout(100);
    }
    await expect(fig.getByRole("button", { name: /código/ })).toHaveText("Ocultar código");

    const aberta = await alturaEstavel(page);
    expect(aberta).toBeGreaterThan(900 - 60 - 24);
  });

  test("painel: setas e espaço andam a animação, e o slider fica com a seta dele", async ({ page }) => {
    const fig = await abrir(page, 1512, 900);
    await fig.getByRole("button", { name: "⤢ Expandir" }).click();
    const painel = page.locator(".viz-overlay-fit figure.viz-fit");
    await expect(painel).toBeVisible();
    // `toBeVisible()` prova que o portal montou, não que o listener de keydown
    // já existe: ele nasce num efeito passivo. O foco entrar no painel é a
    // pré-condição que prova o contrário, porque o efeito do foco é declarado
    // antes do efeito do teclado.
    await expect
      .poll(() => page.evaluate(() => !!document.activeElement?.closest(".viz-overlay-fit")))
      .toBe(true);

    await expect(painel.locator(".viz-step")).toHaveText("passo 1 de 79");
    // uma tecla só, repetida: um par ida-e-volta fica verde com o roubo aplicado
    await page.keyboard.press("ArrowRight");
    await expect(painel.locator(".viz-step")).toHaveText("passo 2 de 79");
    await page.keyboard.press("ArrowRight");
    await expect(painel.locator(".viz-step")).toHaveText("passo 3 de 79");
    await page.keyboard.press("ArrowLeft");
    await expect(painel.locator(".viz-step")).toHaveText("passo 2 de 79");
    await page.keyboard.press(" ");
    await expect(painel.getByRole("button", { name: "❚❚ Pausar" })).toBeVisible();
    await page.keyboard.press(" ");
    await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();

    // com o cursor no slider, a seta é do slider: campo em edição manda
    const slider = painel.locator("input[type=range]");
    await expect(slider).toHaveCount(1);
    await slider.focus();
    await expect(painel.locator(".viz-speed .val")).toHaveText("1.5x");
    const passoAntes = await painel.locator(".viz-step").textContent();
    await page.keyboard.press("ArrowLeft");
    await expect(painel.locator(".viz-speed .val")).toHaveText("1x");
    await expect(painel.locator(".viz-step")).toHaveText(passoAntes!);
  });

  test("a marcha de abertura é 1.5x, não o 1x padrão do hook", async ({ page }) => {
    const fig = await abrir(page, 1512, 900);
    await fig.getByRole("button", { name: "⤢ Expandir" }).click();
    const painel = page.locator(".viz-overlay-fit figure.viz-fit");
    await expect(painel.locator(".viz-speed .val")).toHaveText("1.5x");
    await expect(painel.locator("input[type=range]")).toHaveValue("4");
  });

  test("o mapa da recursão tem log2(n) níveis, e 7 e 8 elementos caem no mesmo degrau", async ({ page }) => {
    const fig = await abrir(page, 1512, 900);

    // rótulo e valor lidos do MESMO cartão, nos dois presets
    expect(await ficha(fig, "tamanho do array")).toBe("7");
    expect(await ficha(fig, "níveis de recursão")).toBe("4");
    await expect(fig.locator(".ms-nivel")).toHaveCount(4);
    await expect(fig.locator(".ms-nivel-rot").first()).toHaveText("nível 0");
    await expect(fig.locator(".ms-nivel-rot").last()).toHaveText("nível 3");
    const alt7 = await fig.locator(".ms-niveis").evaluate((el) => Math.round(el.getBoundingClientRect().height));

    await preset(fig, "Já ordenado: 1 2 3 4 5 6 7 8");
    expect(await ficha(fig, "tamanho do array")).toBe("8");
    // a altura da árvore é degrau: um elemento a mais NÃO compra um nível aqui
    expect(await ficha(fig, "níveis de recursão")).toBe("4");
    await expect(fig.locator(".ms-nivel")).toHaveCount(4);
    const alt8 = await fig.locator(".ms-niveis").evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(alt8).toBe(alt7);
  });

  test("a intercalação só é desenhada quando há dois lados prontos, e é ela que move a altura", async ({ page }) => {
    const fig = await abrir(page, 1512, 900);

    // passo 1: o algoritmo ainda vai descer, e não há o que intercalar
    await expect(fig.locator(".viz-step")).toHaveText("passo 1 de 79");
    await expect(fig.locator(".ms-merge")).toHaveCount(0);
    const semMerge = await alturaEstavel(page);

    await andar(fig, 10);
    await expect(fig.locator(".viz-step")).toHaveText("passo 11 de 79");
    await expect(fig.locator(".ms-merge")).toHaveCount(1);
    // os três lados, com o rótulo que explica cada um
    await expect(fig.locator(".ms-lado-rot")).toHaveText(["esquerda", "direita", "buffer de saída"]);
    const comMerge = await alturaEstavel(page);

    // o painel de intercalação é o eixo de altura desta peça: ele aparece e
    // some no meio da animação, e o passo 1 (como o último) mostra a peça baixa
    expect(comMerge - semMerge).toBeGreaterThan(100);
  });

  test("o contador de comparações confere com o que a legenda promete", async ({ page }) => {
    const fig = await abrir(page, 1512, 900);
    await preset(fig, "Já ordenado: 1 2 3 4 5 6 7 8");
    await andar(fig, 92);
    await expect(fig.locator(".viz-step")).toHaveText("passo 93 de 93");
    expect(await ficha(fig, "comparações")).toBe("12");
    expect(await ficha(fig, "cópias para o buffer")).toBe("24");

    await preset(fig, "Pior caso: 1 3 2 7 4 6 5 8");
    await expect(fig.locator(".viz-step")).toHaveText("passo 1 de 93");
    await andar(fig, 92);
    expect(await ficha(fig, "comparações")).toBe("17");
    expect(await ficha(fig, "cópias para o buffer")).toBe("24");
  });
});
