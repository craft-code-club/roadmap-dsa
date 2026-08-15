import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// A casca adaptativa no visualizador de percursos de árvore.
//
// Estes testes medem COMPORTAMENTO e leem RÓTULO. Contar elemento não prova
// nada: já passaram por suíte verde um visualizador sem botão nenhum e um
// painel com 0px de largura. A régua aqui é sempre um número medido no
// navegador (altura, posição, deslocamento) ou o texto que o aluno lê.
//
// Antes da casca, a figura INTEIRA rolava dentro do painel expandido, e o que
// saía da tela eram os controles: medido no passo do pico, o `▶ Rodar` era
// desenhado 287px (1512x900), 487px (1440x700) e 587px (1440x600) ABAIXO do pé
// da janela. Depois, ele fica dentro em todas as três (−57, −52 e −49px), e
// quem rola é o miolo.
//
// O tópico tem um visualizador só, e ele tem as três camadas: overlay, bloco de
// código, painel de variáveis e controles. Nenhum arquivo ficou de fora.
// ---------------------------------------------------------------------------

const URL = "/topicos/tree-traversals/";

// Notebook de 16", o caso que motivou a casca. Nela a peça passa do orçamento
// (855px de miolo padrão contra 816) e o código entra recolhido.
const BAIXA = { width: 1512, height: 900 };
// Alta o bastante para caber com o código aberto (orçamento 1516px).
const ALTA = { width: 1512, height: 1600 };
// Apertada de propósito: garante que o miolo do painel tem o que rolar e que a
// medição REALMENTE discordaria de quem abre o código na mão.
const APERTADA = { width: 1440, height: 700 };

// Folga de subpixel, a mesma do hook.
const SLACK = 8;

// O passo do PICO de altura, medido andando a animação inteira: com a árvore
// degenerada em pré-ordem, os passos 1 a 12 empatam em 1041px e os 13 a 25
// ficam 20px abaixo (a nota cai de duas linhas para uma). O 10 é pico e não é
// nem o primeiro nem o último — a asserção "existe sobra para rolar" precisa de
// um passo que tenha o que rolar.
const PASSO_DO_PICO = 10;

const ARVORE_ALTA = "Degenerada: a pilha vai ao fundo";

async function abrirPainel(page: Page, tamanho: { width: number; height: number }) {
  await page.setViewportSize(tamanho);
  await page.goto(URL);
  expect(page.viewportSize()).toEqual(tamanho);
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "⤢ Expandir" }).click();
  const painel = page.locator(".viz-overlay-fit figure.viz-fit");
  await expect(painel).toBeVisible();
  return painel;
}

/** O valor da ficha "altura" do painel de estatísticas — prova na TELA de que a árvore trocou. */
async function alturaDaArvore(page: Page) {
  return page
    .locator(".bigo-stat", { has: page.locator("span", { hasText: /^altura$/ }) })
    .locator("strong")
    .innerText();
}

test.describe("percursos de árvore · casca adaptativa", () => {
  test("o cabeçalho e os controles ficam parados quando o miolo rola", async ({ page }) => {
    const painel = await abrirPainel(page, APERTADA);

    // A árvore mais alta (6 níveis contra 3) e o passo do pico: é o estado que
    // dá ao miolo o que rolar.
    await page.getByRole("button", { name: ARVORE_ALTA }).click();
    for (let i = 1; i < PASSO_DO_PICO; i++) {
      await page.getByRole("button", { name: "Próximo ›" }).click();
    }
    await expect(painel.locator(".viz-step")).toHaveText(`passo ${PASSO_DO_PICO} de 26`);

    // PREMISSA: o miolo estoura mesmo. Sem isto, o dia em que a peça encolher o
    // teste vira decoração verde.
    const sobra = await painel
      .locator(".viz-body")
      .evaluate((b) => b.scrollHeight - b.clientHeight);
    expect(sobra).toBeGreaterThan(SLACK);

    const antes = await painel.evaluate((f) => {
      const r = f.getBoundingClientRect();
      return {
        cabecaTopo: Math.round(f.querySelector(".viz-head")!.getBoundingClientRect().top - r.top),
        rodapePe: Math.round(r.bottom - f.querySelector(".viz-foot")!.getBoundingClientRect().bottom),
      };
    });
    // A camada 1 é justamente cabeçalho colado no topo e rodapé colado no pé.
    expect(antes.cabecaTopo).toBeLessThanOrEqual(2);
    expect(antes.rodapePe).toBeLessThanOrEqual(2);

    await painel.locator(".viz-body").evaluate((b) => { b.scrollTop = b.scrollHeight; });
    await page.waitForTimeout(120);

    const depois = await painel.evaluate((f) => {
      const r = f.getBoundingClientRect();
      const body = f.querySelector(".viz-body") as HTMLElement;
      return {
        cabecaTopo: Math.round(f.querySelector(".viz-head")!.getBoundingClientRect().top - r.top),
        rodapePe: Math.round(r.bottom - f.querySelector(".viz-foot")!.getBoundingClientRect().bottom),
        bodyScrollTop: Math.round(body.scrollTop),
        figuraScrollTop: Math.round(f.scrollTop),
      };
    });

    // As três coisas juntas, porque duas delas sozinhas aprovam a quebra que
    // devolve a rolagem para a figura inteira: o miolo estourou (acima), o
    // miolo MESMO rolou, e a figura NÃO rolou.
    expect(depois.bodyScrollTop).toBeGreaterThan(0);
    expect(depois.figuraScrollTop).toBe(0);
    expect(depois.cabecaTopo).toBe(antes.cabecaTopo);
    expect(depois.rodapePe).toBe(antes.rodapePe);

    // E o botão que faz o algoritmo andar continua À VISTA — não só alcançável:
    // o `click()` do Playwright rola o contêiner para chegar no alvo, então
    // clicar nele não provaria nada.
    const rodar = painel.getByRole("button", { name: "▶ Rodar" });
    const caixa = (await rodar.boundingBox())!;
    expect(caixa.y).toBeGreaterThanOrEqual(0);
    expect(caixa.y + caixa.height).toBeLessThanOrEqual(APERTADA.height);
  });

  test("em tela baixa o código vem recolhido, e o botão diz Mostrar código", async ({ page }) => {
    const painel = await abrirPainel(page, BAIXA);
    const botao = painel.getByRole("button", { name: /código$/ });
    // O RÓTULO, não só o estado: botão que promete uma coisa e faz outra ensina
    // errado do mesmo jeito.
    await expect(botao).toHaveText("Mostrar código");
    await expect(botao).toHaveAttribute("aria-expanded", "false");
    await expect(painel).toHaveAttribute("data-codigo", "off");

    // Recolhido de verdade: o slot fechou a ALTURA, não só a largura.
    const alturaCodigo = await painel
      .locator(".viz-code-slot")
      .evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(alturaCodigo).toBeLessThan(8);
  });

  test("em tela alta o código já vem aberto, e o botão diz Ocultar código", async ({ page }) => {
    const painel = await abrirPainel(page, ALTA);
    const botao = painel.getByRole("button", { name: /código$/ });
    await expect(botao).toHaveText("Ocultar código");
    await expect(botao).toHaveAttribute("aria-expanded", "true");
    await expect(painel).toHaveAttribute("data-codigo", "on");

    // E o código aberto é o do percurso selecionado, com o nome do arquivo.
    await expect(painel.locator(".viz-code-head")).toHaveText("percorre.py");
    const alturaCodigo = await painel
      .locator(".viz-code-slot")
      .evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(alturaCodigo).toBeGreaterThan(80);
  });

  test("a escolha do aluno sobrevive à troca de árvore, que pediria medição nova", async ({ page }) => {
    const painel = await abrirPainel(page, APERTADA);
    const botao = painel.getByRole("button", { name: /código$/ });

    // Numa janela apertada a medição recolhe de saída: é o que dá o que
    // contrariar.
    await expect(botao).toHaveText("Mostrar código");
    await botao.click();
    await expect(botao).toHaveText("Ocultar código");
    await expect(painel).toHaveAttribute("data-codigo", "on");

    // A troca precisa mexer numa entrada REAL da medição. A árvore está em
    // `measureOn` e vale 186px de altura de SVG (3 níveis contra 6): é a troca
    // com que a medição mais discordaria do aluno.
    expect(await alturaDaArvore(page)).toBe("3");
    await page.getByRole("button", { name: ARVORE_ALTA }).click();
    // PROVA NA TELA de que a entrada da medição mudou mesmo.
    await expect
      .poll(async () => alturaDaArvore(page))
      .toBe("6");

    // "Está aberto agora" não é "continua aberto": amostra ao longo do
    // intervalo em que a medição rodaria.
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(80);
      await expect(painel).toHaveAttribute("data-codigo", "on");
    }
    await expect(botao).toHaveText("Ocultar código");
  });

  test("as setas andam a animação, e o slider de velocidade fica com a tecla", async ({ page }) => {
    const painel = await abrirPainel(page, BAIXA);
    const passo = painel.locator(".viz-step");
    await expect(passo).toHaveText("passo 1 de 26");

    // Uma ação só, nunca um par inverso: `ArrowRight` seguido de `ArrowLeft`
    // devolve a peça ao estado de origem e fica verde com a quebra aplicada.
    await page.keyboard.press("ArrowRight");
    await expect(passo).toHaveText("passo 2 de 26");

    await page.keyboard.press(" ");
    await expect(painel.getByRole("button", { name: "❚❚ Pausar" })).toBeVisible();
    await page.keyboard.press(" ");
    await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();

    // Com o cursor no slider, a seta é DO SLIDER. Sequestrar isso deixa o
    // controle impossível de usar, o que é pior que não ter atalho.
    const slider = painel.locator('input[type="range"]');
    await slider.focus();
    const passoAntes = await passo.innerText();
    await expect(painel.locator(".viz-speed .val")).toHaveText("1.5x");
    await page.keyboard.press("ArrowRight");
    await expect(painel.locator(".viz-speed .val")).toHaveText("2x");
    await expect(passo).toHaveText(passoAntes);
  });

  test("a peça abre na marcha 1.5x, que é a dela e não a padrão do hook", async ({ page }) => {
    const painel = await abrirPainel(page, BAIXA);
    // A marcha inicial era `useState(4)` antes da casca. Sem `initialSpeed` a
    // peça abriria no "1x" do hook, e nenhum outro teste notaria.
    await expect(painel.locator(".viz-speed .val")).toHaveText("1.5x");
    await expect(painel.locator('input[type="range"]')).toHaveValue("4");
  });
});
