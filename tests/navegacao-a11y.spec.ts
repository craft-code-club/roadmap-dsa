import { test, expect, type Page } from "@playwright/test";

// Acessibilidade da casca de navegação: link de pular, anel de foco, nome dos
// campos e dos landmarks, e a marca de progresso fora do link.
//
// Todo teste daqui INTERAGE. Contar elemento não prova nada neste repositório:
// já passou por suíte verde um visualizador sem botão nenhum e um painel de 0px.
// "O link de pular existe" é exatamente esse tipo de asserção — o que importa é
// se um Tab e um Enter levam o foco para dentro do `<main>`.

/** Tabula até o elemento pedido e devolve quantos Tabs custou. Falha alto se
 *  não chegar: laço que sai calado deixa a asserção seguinte medir outra coisa. */
async function tabularAte(page: Page, seletor: string, limite = 80) {
  for (let i = 1; i <= limite; i++) {
    await page.keyboard.press("Tab");
    const chegou = await page.evaluate(
      (s) => document.activeElement?.matches(s) ?? false,
      seletor
    );
    if (chegou) return i;
  }
  throw new Error(`o foco não alcançou ${seletor} em ${limite} tabulações`);
}

/** O foco está no `<main>` ou dentro dele? */
const focoNoConteudo = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector("main");
    const alvo = document.activeElement;
    return !!main && !!alvo && (alvo === main || main.contains(alvo));
  });

test("um Tab e um Enter levam o foco para dentro do conteúdo", async ({ page }) => {
  // Antes do link de pular, o teclado atravessava a barra do topo e o menu
  // lateral inteiros: 44 paradas até o primeiro elemento do `<main>` em
  // /topico/dijkstra/, 40 em /topico/arrays/ e 29 na home, em TODA página
  // aberta. E 44 é piso, porque o menu não renderiza grupo fechado.
  for (const rota of ["/topico/dijkstra/", "/topico/arrays/", "/", "/roadmap/"]) {
    await page.goto(rota);

    // Fora da tela para quem usa mouse: o link é uma saída de teclado, não um
    // elemento de página.
    const escondido = await page
      .locator(".skip-link")
      .evaluate((e) => e.getBoundingClientRect().bottom < 0);
    expect(escondido, `o link de pular aparece sem foco em ${rota}`).toBe(true);

    const tabs = await tabularAte(page, ".skip-link");
    expect(tabs, `o link de pular não é a primeira parada em ${rota}`).toBe(1);
    await expect(page.locator(".skip-link")).toBeInViewport();

    await page.keyboard.press("Enter");
    await expect
      .poll(() => focoNoConteudo(page), { message: `o foco não entrou no <main> em ${rota}` })
      .toBe(true);

    // E o Tab seguinte continua DENTRO do conteúdo, em vez de voltar ao menu:
    // é isso que o `tabIndex={-1}` no `<main>` compra.
    await page.keyboard.press("Tab");
    expect(await focoNoConteudo(page), `o Tab depois do pulo saiu do <main> em ${rota}`).toBe(true);
  }
});
