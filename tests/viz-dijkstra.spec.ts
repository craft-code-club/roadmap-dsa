import { test, expect, type Page, type Locator } from "@playwright/test";

// Casca adaptativa do visualizador de Dijkstra.
//
// Os números que decidiram o escopo, medidos com `document.fonts.ready`
// cumprido e a animação parada, andando os três presets passo a passo:
//
//   · no artigo, a 1512x900 (orçamento 816px): 1071–1130px antes, 679–743
//     depois. A peça passava do orçamento em TODOS os passos dos três presets;
//   · no painel expandido, quem rolava era a FIGURA (294 a 633px de sobra,
//     conforme a janela), levando cabeçalho e controles junto: o `▶ Rodar` era
//     desenhado 193px (1512x900), 393px (1440x700) e 493px (1440x600) abaixo do
//     pé visível da janela. Depois é o miolo que rola, e o `▶ Rodar` fica
//     dentro da janela em todas.
//
// O eixo da altura desta peça é a NOTA (22 a 63px), não a fila de prioridade
// nem a tabela de distâncias: as duas são fileiras de fichas de 34px em todos
// os passos dos três presets — medido, elas nunca quebram linha. Por isso o
// passo do pico é onde a nota tem três linhas.

const SLACK = 8;
const NEGATIVO = "Com peso negativo (quebra)";
// O passo mais alto dos três presets: a nota de três linhas do relaxamento
// A→C. 743px no artigo a 1440x600, contra 702 do passo mais baixo.
const PASSO_PICO = 2;

function figura(page: Page): Locator {
  return page.locator("article figure.viz");
}

function painel(page: Page): Locator {
  return page.locator(".viz-overlay figure.viz");
}

async function abrir(page: Page, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h });
  expect(page.viewportSize(), `a janela pedida foi ${w}x${h}`).toEqual({ width: w, height: h });
  await page.goto("/topicos/dijkstra/");
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

/** Altura que PAROU: três leituras iguais seguidas, não duas. */
async function alturaEstavel(alvo: Locator): Promise<number> {
  let iguais = 0;
  let ultima = -1;
  for (let i = 0; i < 60; i++) {
    const h = Math.round((await alvo.boundingBox())!.height);
    if (h === ultima) {
      if (++iguais >= 2) return h;
    } else {
      iguais = 0;
      ultima = h;
    }
    await alvo.page().waitForTimeout(50);
  }
  return ultima;
}

async function orcamento(page: Page): Promise<number> {
  return page.evaluate(() => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--ccc-header-h");
    return window.innerHeight - (parseFloat(raw) || 60) - 24;
  });
}

test.describe("dijkstra · casca adaptativa", () => {
  test("no painel o miolo rola sozinho: cabeçalho e ▶ Rodar não saem do lugar", async ({ page }) => {
    await abrir(page, 1440, 600);
    const fig = figura(page);
    await fig.getByRole("button", { name: NEGATIVO }).click();
    await fig.getByRole("button", { name: /Expandir/ }).click();
    const pan = painel(page);
    await expect(pan).toBeVisible();
    for (let i = 1; i < PASSO_PICO; i++) await pan.getByRole("button", { name: "Próximo ›" }).click();
    await expect(pan.locator(".viz-step")).toHaveText(`passo ${PASSO_PICO} de 15`);
    await alturaEstavel(pan);

    // O `click()` do Playwright rola o contêiner para alcançar o alvo, então a
    // primeira leitura tem que ser feita com as duas rolagens zeradas.
    const antes = await pan.evaluate((f) => {
      const body = f.querySelector(".viz-body") as HTMLElement;
      f.scrollTop = 0;
      body.scrollTop = 0;
      const r = f.getBoundingClientRect();
      return {
        sobraMiolo: body.scrollHeight - body.clientHeight,
        sobraFigura: f.scrollHeight - f.clientHeight,
        cabeca: Math.round(f.querySelector(".viz-head")!.getBoundingClientRect().top - r.top),
        rodarBase: Math.round(f.querySelector(".viz-play")!.getBoundingClientRect().bottom),
      };
    });

    // Premissa: existe o que rolar. Sem isto o teste vira decoração verde no dia
    // em que a peça encolher.
    expect(antes.sobraMiolo, "o miolo precisa estourar para haver o que rolar").toBeGreaterThan(SLACK);
    expect(antes.sobraFigura, "quem rola é o miolo, não a figura").toBeLessThanOrEqual(SLACK);

    const depois = await pan.evaluate((f) => {
      const body = f.querySelector(".viz-body") as HTMLElement;
      body.scrollTop = body.scrollHeight;
      const r = f.getBoundingClientRect();
      return {
        mioloRolou: Math.round(body.scrollTop),
        figuraRolou: Math.round(f.scrollTop),
        cabeca: Math.round(f.querySelector(".viz-head")!.getBoundingClientRect().top - r.top),
        rodarBase: Math.round(f.querySelector(".viz-play")!.getBoundingClientRect().bottom),
        janela: window.innerHeight,
      };
    });

    expect(depois.mioloRolou, "o miolo rolou de verdade").toBeGreaterThan(0);
    expect(depois.figuraRolou, "a figura inteira não rola").toBe(0);
    expect(depois.cabeca, "o cabeçalho não se mexeu").toBe(antes.cabeca);
    expect(depois.cabeca, "o cabeçalho está colado no topo da figura").toBeLessThanOrEqual(2);
    expect(depois.rodarBase, "os controles não se mexeram").toBe(antes.rodarBase);
    expect(depois.rodarBase, "o ▶ Rodar continua dentro da janela").toBeLessThanOrEqual(depois.janela);
    // Rótulo, não só posição: um botão no lugar certo dizendo outra coisa
    // ensina errado do mesmo jeito.
    await expect(pan.locator(".viz-play")).toHaveText("▶ Rodar");
  });

  test("a 1512x900 a peça não caberia, então o código vem recolhido e o botão diz Mostrar código", async ({ page }) => {
    await abrir(page, 1512, 900);
    const fig = figura(page);
    const botao = fig.getByRole("button", { name: /código/ });
    await expect(botao).toHaveText("Mostrar código");
    await expect(botao).toHaveAttribute("aria-expanded", "false");
    await expect(fig).toHaveAttribute("data-codigo", "off");

    const alturaCodigo = Math.round(
      await fig.locator(".viz-code").evaluate((el) => el.getBoundingClientRect().height)
    );
    // Zerar a trilha da COLUNA tira a largura e não a altura: é o `.viz-code-slot`
    // (grid 1fr→0fr) que fecha a linha. Sem ele o bloco continua com a altura
    // inteira e a peça não encolhe um pixel.
    expect(alturaCodigo, "o bloco recolhido não pode ocupar altura").toBeLessThanOrEqual(2);

    const altura = await alturaEstavel(fig);
    expect(altura, "recolhida, a peça cabe no orçamento da janela").toBeLessThanOrEqual(await orcamento(page));
  });

  test("numa janela alta o código já vem aberto, com o rótulo Ocultar código", async ({ page }) => {
    await abrir(page, 1512, 1400);
    const fig = figura(page);
    const botao = fig.getByRole("button", { name: /código/ });
    await expect(botao).toHaveText("Ocultar código");
    await expect(fig).toHaveAttribute("data-codigo", "on");
    await expect(fig.locator(".viz-code-head")).toBeVisible();

    const altura = await alturaEstavel(fig);
    const orc = await orcamento(page);
    expect(altura, "com esta janela a peça cabe aberta — é por isso que ela abre").toBeLessThanOrEqual(orc);
  });

  test("a escolha do aluno sobrevive à troca de preset, que é o que dispara medição nova", async ({ page }) => {
    await abrir(page, 1512, 900);
    const fig = figura(page);
    const botao = fig.getByRole("button", { name: /código/ });
    await expect(botao).toHaveText("Mostrar código");

    await botao.click();
    await expect(botao).toHaveText("Ocultar código");
    await expect(fig).toHaveAttribute("data-codigo", "on");

    // Trocar de preset muda `measureOn` e a peça aberta passa do orçamento —
    // ou seja, a medição QUER recolher. É por isso que este preset serve de
    // teste e um que só mudasse o alvo não serviria.
    await fig.getByRole("button", { name: NEGATIVO }).click();
    await expect(fig.locator(".tt-legenda-arvore")).toContainText("A aresta C→B vale -2");
    await expect(fig.locator(".viz-step")).toHaveText("passo 1 de 15");

    const alta = await alturaEstavel(fig);
    expect(alta, "aberta, a peça passa do orçamento — a medição discordaria do aluno").toBeGreaterThan(
      await orcamento(page)
    );

    await expect(fig).toHaveAttribute("data-codigo", "on");
    await expect(botao).toHaveText("Ocultar código");
  });

  test("as setas andam a animação dentro do painel", async ({ page }) => {
    await abrir(page, 1440, 700);
    const fig = figura(page);
    await fig.getByRole("button", { name: /Expandir/ }).click();
    const pan = painel(page);
    await expect(pan.locator(".viz-step")).toHaveText("passo 1 de 17");

    // Duas vezes na MESMA direção: um par de ações inversas devolve a peça ao
    // estado de origem e fica verde com a quebra aplicada.
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(pan.locator(".viz-step")).toHaveText("passo 3 de 17");

    await page.keyboard.press("Space");
    await expect(pan.locator(".viz-play")).toHaveText("❚❚ Pausar");
  });

  test("com o cursor no controle de velocidade, a seta é do slider e não do passo", async ({ page }) => {
    await abrir(page, 1440, 700);
    const fig = figura(page);
    await fig.getByRole("button", { name: /Expandir/ }).click();
    const pan = painel(page);
    const marcha = pan.locator(".viz-speed .val");
    await expect(pan.locator(".viz-step")).toHaveText("passo 1 de 17");

    await pan.locator(".viz-speed input[type=range]").focus();
    await page.keyboard.press("ArrowLeft");

    await expect(marcha, "a seta mexeu na marcha, que é de quem estava em foco").toHaveText("1x");
    await expect(pan.locator(".viz-step"), "e não andou o passo").toHaveText("passo 1 de 17");
  });

  test("a marcha inicial da peça é 1.5x, não o 1x padrão do hook", async ({ page }) => {
    await abrir(page, 1440, 700);
    const fig = figura(page);
    await fig.getByRole("button", { name: /Expandir/ }).click();
    const pan = painel(page);
    await expect(pan.locator(".viz-speed .val")).toHaveText("1.5x");
    await expect(pan.locator(".viz-speed input[type=range]")).toHaveValue("4");
  });

  test("o desenho do grafo sai no tamanho natural do viewBox: não há esticão a devolver", async ({ page }) => {
    await abrir(page, 1512, 900);
    const medida = await figura(page)
      .locator("svg.tt-arv")
      .evaluate((el) => {
        const r = el.getBoundingClientRect();
        const vb = (el.getAttribute("viewBox") || "").split(/\s+/).map(Number);
        return { w: Math.round(r.width), h: Math.round(r.height), vw: vb[2], vh: vb[3] };
      });
    // Teto de altura só devolve VAZIO, e só existe vazio quando o renderizado é
    // maior que o natural. Aqui são iguais: um `max-height` encolheria o texto
    // dos vértices pelo `preserveAspectRatio`. É por isso que este tópico não
    // escreveu uma linha de CSS.
    expect(medida.w).toBe(medida.vw);
    expect(medida.h).toBe(medida.vh);
  });

  test("o painel de variáveis conta os fechados, com rótulo e valor no mesmo cartão", async ({ page }) => {
    await abrir(page, 1512, 900);
    const fig = figura(page);
    await fig.getByRole("button", { name: NEGATIVO }).click();
    for (let i = 0; i < 3; i++) await fig.getByRole("button", { name: "Próximo ›" }).click();

    const fechados = fig.locator(".tt-saida .tt-saida-item");
    const quantos = await fechados.count();
    expect(quantos, "neste passo já há vértice fechado").toBeGreaterThan(0);

    // Rótulo e valor lidos JUNTOS, no mesmo cartão: o guarda de idioma compara o
    // conjunto de textos e não onde cada um aparece, então trocar dois campos de
    // lugar passa verde por lá. Aqui não passa.
    const cartao = fig.locator(".viz-var").filter({ hasText: "fechados" });
    await expect(cartao.locator(".viz-var-name")).toHaveText("fechados");
    await expect(cartao.locator(".viz-var-val")).toHaveText(`${quantos} de 6`);
  });
});
