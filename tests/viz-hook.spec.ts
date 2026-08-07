import { test, expect, type Locator, type Page } from "@playwright/test";

// A casca de TODO visualizador vem de `src/lib/visualizer.tsx`, e o que se prova
// aqui é o comportamento dela: o passo sendo anunciado, a animação parando
// quando ninguém está vendo, e os dois controles que existiam sem nome.
//
// Contar elemento não testa nada — já passaram por uma suíte verde um
// visualizador sem botão nenhum e um painel com 0px. Cada teste daqui INTERAGE e
// lê o rótulo.

/**
 * O contador "passo N de M". Escopado na figura E filtrado pelo texto, porque
 * `.viz-step` é ambíguo: o `BigOCounterVisualizer` passa um segundo pela porta
 * de `children` do `VizHeader` ("n = 62"), e o `MergeSortVisualizer` tem três na
 * mesma página. Um `.first()` aqui leria o número errado sem erro nenhum.
 */
function contadorDePasso(fig: Locator): Locator {
  return fig.locator(".viz-step").filter({ hasText: /^passo \d+ de \d+$/ });
}

async function figuraDe(page: Page, url: string): Promise<Locator> {
  await page.goto(url);
  const fig = page.locator("figure.viz-fit").first();
  await expect(fig).toBeVisible();
  return fig;
}

test.describe("a região viva anuncia o passo", () => {
  test("o texto muda quando o aluno aperta Próximo ›", async ({ page }) => {
    const fig = await figuraDe(page, "/topico/big-o/");

    const status = fig.getByRole("status");
    await expect(status).toHaveCount(1);

    // Premissa 1: ela nasce MUDA. Uma região viva já preenchida na montagem faz
    // as cinco peças de `intervals.mdx` falarem juntas ao abrir a página, sem
    // que o aluno tenha feito nada.
    await expect(status).toHaveText("");

    // Premissa 2: invisível para o olho, presente para o leitor de tela. Com
    // `display: none` ou `visibility: hidden` a caixa não existiria — e é
    // exatamente o conserto que PARECE funcionar e deixa o anúncio mudo.
    const caixa = await status.boundingBox();
    expect(caixa).not.toBeNull();
    expect(caixa!.width).toBeLessThanOrEqual(2);
    expect(caixa!.height).toBeLessThanOrEqual(2);

    const contador = contadorDePasso(fig);
    await expect(contador).toHaveCount(1);
    const passoAntes = (await contador.textContent()) ?? "";
    const anuncioAntes = (await status.textContent()) ?? "";

    await fig.getByRole("button", { name: "Próximo ›" }).click();

    // Premissa 3: o algoritmo andou de verdade (senão o resto não quer dizer
    // nada). Asserção web-first: o React re-renderiza de forma assíncrona.
    await expect(contador).not.toHaveText(passoAntes);
    // E a asserção que carrega o sentido: a região DISSE que andou.
    await expect(status).not.toHaveText(anuncioAntes);
    await expect(status).toHaveText(/^passo 2 de \d+$/);
  });

  test("o anúncio não vira ruído durante a reprodução automática", async ({ page }) => {
    const fig = await figuraDe(page, "/topico/merge-sort/");
    const status = fig.getByRole("status");
    const contador = contadorDePasso(fig);
    const rodar = fig.getByRole("button", { name: /Rodar|Pausar/ });

    await rodar.click();
    await expect(rodar).toHaveText(/Pausar/);
    // Começar a rodar É uma ação do aluno, e ela é anunciada uma vez.
    await expect(status).toHaveText(/^rodando a partir do passo 1 de \d+$/);

    const anuncioNoInicio = (await status.textContent()) ?? "";
    const passoNoInicio = (await contador.textContent()) ?? "";
    // Três marchas de 650ms: tempo de sobra para o relógio andar vários passos.
    await page.waitForTimeout(2000);

    // Premissa: a animação andou mesmo enquanto ninguém falava.
    expect(await contador.textContent()).not.toBe(passoNoInicio);
    // A asserção: o relógio NÃO escreveu na região viva. Com um anúncio por
    // tick, na marcha 2x (250ms) o leitor de tela enfileira falas que nunca
    // alcançam a tela, e ruído contínuo é pior que silêncio.
    expect(await status.textContent()).toBe(anuncioNoInicio);

    // E pausar, que é ação do aluno de novo, volta a falar — com o passo em que
    // a animação parou, não com o que ela tinha quando começou.
    await rodar.click();
    await expect(rodar).toHaveText(/Rodar/);
    await expect(status).toHaveText(/^pausado no passo \d+ de \d+$/);
    await expect(status).not.toHaveText(anuncioNoInicio);
  });
});

test.describe("a animação não roda para quem não está vendo", () => {
  test("sair da tela pausa, e voltar NÃO retoma sozinho", async ({ page }) => {
    const fig = await figuraDe(page, "/topico/merge-sort/");
    const contador = contadorDePasso(fig);
    await expect(contador).toHaveCount(1);
    const rodar = fig.getByRole("button", { name: /Rodar|Pausar/ });

    const inicial = (await contador.textContent()) ?? "";
    await rodar.click();
    await expect(rodar).toHaveText(/Pausar/);
    // Premissa: com a peça na tela ela ANDA. Sem isto o teste aprovaria uma
    // animação que nunca começou.
    await expect(contador).not.toHaveText(inicial);

    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" })
    );
    await expect(fig).not.toBeInViewport();

    // Duas leituras com intervalo, e não o estado interno: o que importa é o
    // que o aluno vê parar de andar.
    await page.waitForTimeout(400);
    const foraA = (await contador.textContent()) ?? "";
    // Premissa: não é que a animação acabou — ela parou no meio.
    expect(foraA).not.toMatch(/^passo (\d+) de \1$/);
    await page.waitForTimeout(2000);
    expect(await contador.textContent()).toBe(foraA);

    // De volta à tela: pausada, e pausada continua. Retomar sozinho surpreende
    // quem rolou de volta.
    await fig.scrollIntoViewIfNeeded();
    await expect(fig).toBeInViewport();
    await expect(rodar).toHaveText(/Rodar/);
    const voltaA = (await contador.textContent()) ?? "";
    await page.waitForTimeout(2000);
    expect(await contador.textContent()).toBe(voltaA);
  });
});
