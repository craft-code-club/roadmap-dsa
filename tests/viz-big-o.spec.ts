import { test, expect, type Page, type Locator } from "@playwright/test";

// ---------------------------------------------------------------------------
// A casca adaptativa no `BigOChartVisualizer` (tópico `big-o`).
//
// A página tem TRÊS `<figure>` e DUAS delas são `figure.viz`: o cartaz estático
// `.bigo-fam`, o gráfico de curvas (este arquivo) e o contador de operações
// (`BigOCounterVisualizer`). Seletor não escopado pega o primeiro em silêncio,
// então todo locator daqui é filtrado pelo conteúdo — o canvas do gráfico — e as
// contagens são afirmadas nos DOIS níveis, página e figura.
//
// O gráfico entra na casca com `total: 1` (sem linha do tempo) e
// `collapsible: false` (não há bloco dispensável). Por isso os itens 2, 3 e 4 do
// §8 do contrato não existem aqui, e no lugar deles vale a regra que os
// substitui: nenhum botão pode prometer esconder um bloco que a peça não tem.
// ---------------------------------------------------------------------------

const SLACK = 8;

/** A figura do GRÁFICO, filtrada pelo canvas — nunca por posição. */
function grafico(page: Page, dentroDoPainel = false): Locator {
  const raiz = dentroDoPainel ? ".viz-overlay figure.viz" : "article figure.viz";
  return page.locator(raiz).filter({ has: page.locator("canvas.bigo-canvas") });
}

async function abrirPainel(page: Page): Promise<Locator> {
  await grafico(page).getByRole("button", { name: /Expandir/ }).click();
  const painel = grafico(page, true);
  await expect(painel).toHaveCount(1);
  // `toBeVisible()` NÃO é "pronto para o teclado": os listeners do painel nascem
  // num efeito passivo. O sinal de que a casca terminou de montar é o foco ter
  // entrado na figura, que é o que o hook faz ao abrir.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const f = document.querySelector(".viz-overlay figure.viz-fit");
        return !!f && (f === document.activeElement || f.contains(document.activeElement));
      })
    )
    .toBe(true);
  return painel;
}

/** Liga as oito famílias: é o estado mais alto da peça (mais cartões, nota maior). */
async function ligarTodas(fig: Locator) {
  const chips = fig.locator(".bigo-chips .bigo-chip");
  const n = await chips.count();
  expect(n).toBe(8);
  for (let i = 0; i < n; i++) {
    const c = chips.nth(i);
    if ((await c.getAttribute("aria-pressed")) === "false") await c.click();
  }
  await expect(fig.locator(".bigo-card")).toHaveCount(8);
}

test.describe("big-o · gráfico de crescimento na casca adaptativa", () => {
  test("a página tem duas figure.viz e cada .viz-step diz uma coisa diferente", async ({ page }) => {
    await page.goto("/topicos/big-o/");

    // nível PÁGINA: as duas peças estão na casca, e há dois `.viz-step` com
    // sentidos diferentes. Um locator não escopado pegaria o primeiro calado.
    await expect(page.locator("article figure.viz")).toHaveCount(2);
    await expect(page.locator("article figure.viz.viz-fit")).toHaveCount(2);
    await expect(page.locator("article figure.viz .viz-step")).toHaveCount(2);
    await expect(page.locator("canvas.bigo-canvas")).toHaveCount(1);

    // nível FIGURA: a minha tem um só, e ele mostra o n do marcador com o rótulo
    // junto — não "passo N de M", que é o da peça vizinha.
    const fig = grafico(page);
    await expect(fig).toHaveCount(1);
    await expect(fig.locator(".viz-step")).toHaveCount(1);
    await expect(fig.locator(".viz-step")).toHaveText("n = 62");

    const vizinha = page
      .locator("article figure.viz")
      .filter({ hasNot: page.locator("canvas.bigo-canvas") });
    await expect(vizinha.locator(".viz-step")).toHaveText(/^passo 1 de \d+$/);
  });

  test("sem bloco dispensável, nenhum botão promete esconder coisa nenhuma", async ({ page }) => {
    await page.goto("/topicos/big-o/");
    const fig = grafico(page);

    // A peça não tem `.viz-code-slot` nem botão de recolher: `collapsible: false`.
    await expect(fig.locator(".viz-code-slot")).toHaveCount(0);
    await expect(fig.locator(".viz-toggle-codigo")).toHaveCount(0);
    await expect(fig.getByRole("button", { name: /Mostrar|Ocultar/ })).toHaveCount(0);

    // E também não promete linha do tempo que não existe.
    await expect(fig.getByRole("button", { name: /Rodar|Pausar|Próximo|Anterior/ })).toHaveCount(0);

    // O único botão do cabeçalho é o Expandir, e o rótulo dele diz isso.
    const cabecalho = fig.locator(".viz-head");
    await expect(cabecalho.getByRole("button")).toHaveCount(1);
    await expect(cabecalho.getByRole("button")).toHaveText("⤢ Expandir");

    // O rodapé existe e é o dono dos controles do gráfico, com os rótulos deles.
    const rodape = fig.locator(".viz-foot");
    await expect(rodape).toHaveCount(1);
    await expect(rodape.locator(".viz-field span")).toHaveText("Entrada máxima: n até 100");
    await expect(rodape.getByRole("button", { name: /^Escala:/ })).toHaveText("Escala: linear");
    await expect(rodape.getByRole("button", { name: /Reiniciar/ })).toHaveText("↺ Reiniciar");
  });

  test("no painel, cabeçalho e controles ficam parados enquanto o miolo rola", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 700 });
    await page.goto("/topicos/big-o/");
    const painel = await abrirPainel(page);
    await ligarTodas(painel);

    const corpo = painel.locator(".viz-body");
    const cabecalho = painel.locator(".viz-head");
    const reiniciar = painel.getByRole("button", { name: /Reiniciar/ });

    // A asserção que carrega o sentido: a posição do controle comparada com ela
    // mesma, antes e depois de o miolo rolar. Vai ANTES das premissas porque é
    // ela que reprova contra a quebra canônica (o rodapé de volta ao miolo).
    const antesCtrl = (await reiniciar.boundingBox())!.y;
    const antesHead = (await cabecalho.boundingBox())!.y;

    // Premissas do §8: o miolo tem sobra, é ELE quem rola, e a figura não rola.
    const sobraMiolo = await corpo.evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(sobraMiolo).toBeGreaterThan(SLACK);
    await corpo.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    expect(await corpo.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await painel.evaluate((f) => f.scrollHeight - f.clientHeight)).toBeLessThanOrEqual(SLACK);

    const depoisCtrl = (await reiniciar.boundingBox())!.y;
    const depoisHead = (await cabecalho.boundingBox())!.y;
    expect(Math.round(depoisCtrl - antesCtrl)).toBe(0);
    expect(Math.round(depoisHead - antesHead)).toBe(0);
    await expect(reiniciar).toBeInViewport({ ratio: 1 });
    await expect(cabecalho).toBeInViewport({ ratio: 1 });
  });

  test("o gráfico continua sendo o dono das setas dentro do painel", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 700 });
    await page.goto("/topicos/big-o/");

    // O canvas tem altura fixa e ela depende do estado expandido: 300 no artigo,
    // 400 no painel. Afirmar as duas é a prova de que o `viz.expanded` do hook
    // chegou até o desenho, e não só até a moldura.
    const alturaCanvas = (l: Locator) =>
      l.locator("canvas.bigo-canvas").evaluate((c) => Math.round(c.getBoundingClientRect().height));
    expect(await alturaCanvas(grafico(page))).toBe(300);

    const painel = await abrirPainel(page);
    expect(await alturaCanvas(painel)).toBe(400);

    const canvas = painel.locator("canvas.bigo-canvas");
    const passo = painel.locator(".viz-step");

    await canvas.focus();
    await page.keyboard.press("Home");
    await expect(passo).toHaveText("n = 1");
    await expect(painel.locator(".viz-note")).toContainText("Com n = 1,");

    // Uma ação só, repetida: um par ←/→ voltaria ao ponto de partida e a
    // asserção ficaria verde mesmo com a tecla roubada.
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
    await expect(passo).toHaveText("n = 10");
    await expect(painel.locator(".viz-note")).toContainText("Com n = 10,");
    // O rótulo do card lido junto com o valor: em n = 10, O(1) faz 1 operação.
    const cardConst = painel.locator(".bigo-card").filter({ hasText: "acesso por índice" });
    await expect(cardConst.locator(".bigo-card-nome")).toHaveText("O(1)");
    await expect(cardConst.locator(".bigo-card-val")).toHaveText("1");
  });

  test("o painel é um diálogo: Tab circula dentro dele e Esc fecha", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 700 });
    await page.goto("/topicos/big-o/");
    const painel = await abrirPainel(page);

    const dialogo = page.locator('.viz-overlay[role="dialog"]');
    await expect(dialogo).toHaveAttribute("aria-modal", "true");
    await expect(dialogo).toHaveAttribute(
      "aria-label",
      "Visualizador · como cada família cresce"
    );

    // O foco entrou no painel, e vinte tabulações não escapam dele.
    await expect
      .poll(() => page.evaluate(() => !!document.activeElement?.closest(".viz-overlay")))
      .toBe(true);
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
      const dentro = await page.evaluate(
        () => !!document.activeElement?.closest(".viz-overlay")
      );
      expect(dentro, `Tab ${i + 1} saiu do painel`).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(grafico(page, true)).toHaveCount(0);
    await expect(painel).toHaveCount(0);
  });
});
