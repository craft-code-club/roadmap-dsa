import { test, expect, type Page, type Locator } from "@playwright/test";

// A casca adaptativa do QuickSortVisualizer.
//
// A página tem TRÊS `figure.viz` (o visualizador da partição, o comparador de
// pivôs e o de três vias) e os irmãos usam as mesmas classes com outro sentido:
// `.viz-step` casa 3 na página e 1 nesta figura, `.viz-note` idem. Por isso
// todo seletor daqui é escopado na figura, nunca na página.
//
// Só o visualizador da partição recebeu a casca, então `figure.viz-fit` o
// identifica sozinho — e o primeiro teste confere isso em vez de supor.

const SLACK = 8;

/** A figura adaptada, no fluxo do artigo. */
const figArtigo = (page: Page) => page.locator("article figure.viz-fit");
/** A mesma figura depois de expandida: ela vai para o portal, fora do <article>. */
const figPainel = (page: Page) => page.locator(".viz-overlay figure.viz-fit");

const botao = (fig: Locator, nome: RegExp) => fig.getByRole("button", { name: nome });

async function abrirPagina(page: Page, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto("/topico/quick-sort/");
  const vp = page.viewportSize();
  expect(vp, "a janela pedida é a janela medida").toEqual({ width: w, height: h });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect(figArtigo(page)).toHaveCount(1);
}

/** Espera o painel estar PRONTO PARA O TECLADO, que não é o mesmo que visível:
 *  o listener de `keydown` nasce num efeito, e a tecla enviada antes some sem
 *  erro nenhum. O sinal de que o efeito rodou é o foco ter entrado na figura. */
async function painelPronto(page: Page) {
  const fig = figPainel(page);
  await expect(fig).toHaveCount(1);
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const f = document.querySelector(".viz-overlay figure.viz-fit");
          return !!f && (f === document.activeElement || f.contains(document.activeElement));
        }),
      { message: "o foco entrou no painel" }
    )
    .toBe(true);
}

/** Lê o passo atual e o total do contador DESTA figura. */
async function passo(fig: Locator): Promise<{ atual: number; total: number }> {
  const txt = (await fig.locator(".viz-step").innerText()).trim();
  const m = txt.match(/passo (\d+) de (\d+)/);
  if (!m) throw new Error(`contador inesperado: ${JSON.stringify(txt)}`);
  return { atual: Number(m[1]), total: Number(m[2]) };
}

test.describe("quick sort", () => {
  test("a figura adaptada é a única com a casca, e os irmãos não contaminam os seletores", async ({
    page,
  }) => {
    await abrirPagina(page, 1512, 900);
    // Se um irmão ganhasse a casca, os seletores deste arquivo passariam a
    // casar com ele e todos os outros testes mediriam a peça errada.
    await expect(page.locator("article figure.viz")).toHaveCount(3);
    await expect(page.locator("article figure.viz-fit")).toHaveCount(1);
    await expect(page.locator(".viz-step")).toHaveCount(3);
    await expect(figArtigo(page).locator(".viz-step")).toHaveCount(1);
    await expect(figArtigo(page).locator(".bigo-stat")).toHaveCount(4);
    await expect(figArtigo(page).locator(".viz-note")).toHaveCount(1);
  });

  test("no painel o cabeçalho e os controles ficam parados enquanto o miolo rola", async ({
    page,
  }) => {
    await abrirPagina(page, 1440, 700);
    await botao(figArtigo(page), /Expandir/).click();
    await painelPronto(page);
    const fig = figPainel(page);

    // O estado que produz sobra de verdade é a escolha do aluno de MOSTRAR o
    // código: a medição recolhe sozinha nesta janela.
    const alternar = botao(fig, /Mostrar código/);
    await expect(alternar).toHaveText("Mostrar código");
    await alternar.click();
    await expect(fig).toHaveAttribute("data-codigo", "on");
    await page.waitForTimeout(500); // a transição da casca dura 0,32s

    const rodar = botao(fig, /Rodar|Pausar/);
    // Zerar o scrollTop ANTES de ler: qualquer clique anterior pode ter rolado
    // o contêiner para alcançar o alvo, e aí o cabeçalho já andou sozinho.
    const antes = await page.evaluate(() => {
      const f = document.querySelector(".viz-overlay figure.viz-fit") as HTMLElement;
      const b = f.querySelector(".viz-body") as HTMLElement;
      b.scrollTop = 0;
      f.scrollTop = 0;
      const topo = (el: Element) =>
        el.getBoundingClientRect().top - f.getBoundingClientRect().top;
      return {
        sobraMiolo: Math.round(b.scrollHeight - b.clientHeight),
        headTop: topo(f.querySelector(".viz-head")!),
        footTop: topo(f.querySelector(".viz-foot")!),
      };
    });
    // Pré-condição: sem sobra não há rolagem, e um teste de rolagem sem o que
    // rolar fica verde para sempre sem testar nada.
    expect(antes.sobraMiolo, "o miolo tem o que rolar").toBeGreaterThan(SLACK);
    const rodarAntes = (await rodar.boundingBox())!.y;

    const depois = await page.evaluate(() => {
      const f = document.querySelector(".viz-overlay figure.viz-fit") as HTMLElement;
      const b = f.querySelector(".viz-body") as HTMLElement;
      b.scrollTop = b.scrollHeight;
      const topo = (el: Element) =>
        el.getBoundingClientRect().top - f.getBoundingClientRect().top;
      return {
        mioloRolou: Math.round(b.scrollTop),
        figuraRolou: Math.round(f.scrollTop),
        sobraFigura: Math.round(f.scrollHeight - f.clientHeight),
        headTop: topo(f.querySelector(".viz-head")!),
        footTop: topo(f.querySelector(".viz-foot")!),
      };
    });
    const rodarDepois = (await rodar.boundingBox())!.y;

    // Quem rola é o MIOLO. Sem estas duas, a quebra que devolve a rolagem para
    // a figura inteira passa: lá o `scrollTop` do miolo fica em zero e o
    // cabeçalho "não se mexe" porque nada se mexeu.
    expect(depois.mioloRolou, "foi o miolo que rolou").toBeGreaterThan(0);
    expect(depois.sobraFigura, "a figura não rola").toBeLessThanOrEqual(SLACK);

    // A promessa da camada 1 é PARADO, e a asserção que carrega esse sentido é
    // a posição comparada com ela mesma. `toBeInViewport()` sozinho passa nas
    // duas pontas da rolagem mesmo com o rodapé de volta dentro do miolo.
    expect(Math.abs(depois.headTop - antes.headTop), "o cabeçalho não anda").toBeLessThanOrEqual(2);
    expect(Math.abs(depois.footTop - antes.footTop), "o rodapé não anda").toBeLessThanOrEqual(2);
    expect(Math.abs(rodarDepois - rodarAntes), "o ▶ Rodar não anda").toBeLessThanOrEqual(2);
    await expect(rodar).toBeInViewport({ ratio: 1 });
    // Rótulo junto do comportamento: botão parado que diga outra coisa não é
    // o botão que faz o algoritmo andar.
    await expect(rodar).toHaveText("▶ Rodar");
  });

  test("em tela baixa o botão diz Mostrar código e o bloco está mesmo recolhido", async ({
    page,
  }) => {
    await abrirPagina(page, 1440, 700);
    const fig = figArtigo(page);
    await expect(botao(fig, /código/)).toHaveText("Mostrar código");
    await expect(fig).toHaveAttribute("data-codigo", "off");
    // O rótulo promete que o bloco sumiu; a altura do slot é quem prova.
    // (Zerar a trilha da COLUNA tira a largura e não a altura — o `.viz-code-slot`
    // é o que fecha de verdade.)
    const alturaSlot = await fig
      .locator(".viz-code-slot")
      .evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(alturaSlot, "o slot do código está fechado").toBeLessThan(4);
  });

  test("em tela alta o código já vem aberto", async ({ page }) => {
    await abrirPagina(page, 1512, 1200);
    const fig = figArtigo(page);
    await expect(fig).toHaveAttribute("data-codigo", "on");
    await expect(botao(fig, /código/)).toHaveText("Ocultar código");
    const alturaSlot = await fig
      .locator(".viz-code-slot")
      .evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(alturaSlot, "o slot do código está aberto").toBeGreaterThan(100);
    // E o Python está legível, não só presente: o bloco recolhido também tem
    // as linhas no DOM.
    await expect(fig.locator(".viz-line").first()).toHaveText(/def quick_sort\(a, lo, hi\):/);
  });

  test("a escolha do aluno de ver o código sobrevive à troca de preset", async ({ page }) => {
    // Janela em que a medição QUER recolher: sem isso a escolha "sobrevive"
    // sem que nada a tenha ameaçado.
    await abrirPagina(page, 1440, 700);
    const fig = figArtigo(page);
    await expect(fig).toHaveAttribute("data-codigo", "off");
    await botao(fig, /Mostrar código/).click();
    await expect(fig).toHaveAttribute("data-codigo", "on");

    // O preset está em `measureOn`, então trocá-lo dispara medição nova — que é
    // exatamente o que precisa perder para o aluno.
    const antes = await passo(fig);
    await fig.getByRole("button", { name: /Já ordenado/ }).click();
    // Confirma na TELA que a troca aconteceu: o preset novo tem outro total.
    await expect
      .poll(async () => (await passo(fig)).total, { message: "o preset trocou" })
      .not.toBe(antes.total);
    await page.waitForTimeout(600);

    await expect(fig).toHaveAttribute("data-codigo", "on");
    await expect(botao(fig, /código/)).toHaveText("Ocultar código");
    const alturaSlot = await fig
      .locator(".viz-code-slot")
      .evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(alturaSlot, "o código continua à mostra depois da troca").toBeGreaterThan(100);
  });

  test("as setas andam o passo no painel e não roubam a tecla de quem edita a velocidade", async ({
    page,
  }) => {
    await abrirPagina(page, 1512, 900);
    await botao(figArtigo(page), /Expandir/).click();
    await painelPronto(page);
    const fig = figPainel(page);

    expect((await passo(fig)).atual).toBe(1);
    // Uma ação por vez, repetida. Um par inverso (→ depois ←) devolveria a peça
    // ao estado de origem e ficaria verde mesmo com a tecla sendo roubada.
    await page.keyboard.press("ArrowRight");
    await expect.poll(async () => (await passo(fig)).atual).toBe(2);
    await page.keyboard.press("ArrowRight");
    await expect.poll(async () => (await passo(fig)).atual).toBe(3);
    await page.keyboard.press("ArrowLeft");
    await expect.poll(async () => (await passo(fig)).atual).toBe(2);

    const rodar = botao(fig, /Rodar|Pausar/);
    await expect(rodar).toHaveText("▶ Rodar");
    await page.keyboard.press("Space");
    await expect(rodar).toHaveText("❚❚ Pausar");
    await page.keyboard.press("Space");
    await expect(rodar).toHaveText("▶ Rodar");

    // Campo em edição manda: com o slider em foco, seta é do slider. Uma ação
    // só, e as duas metades medidas — o passo que NÃO anda e o valor que anda.
    const slider = fig.locator("input[type=range]");
    await expect(slider).toHaveCount(1);
    // Esta peça tem marcha inicial própria (são até 115 passos num preset só, e
    // o ritmo padrão do hook a deixa arrastada). O rótulo é quem prova.
    await expect(fig.locator(".viz-speed .val")).toHaveText("1.5x");
    await slider.focus();
    const passoAntes = (await passo(fig)).atual;
    const velAntes = await slider.inputValue();
    await page.keyboard.press("ArrowRight");
    await expect.poll(async () => slider.inputValue()).not.toBe(velAntes);
    expect((await passo(fig)).atual, "a seta ficou com o slider").toBe(passoAntes);
  });

  test("os cartões dizem a profundidade do preset, com o rótulo ao lado do número", async ({
    page,
  }) => {
    await abrirPagina(page, 1512, 900);
    await botao(figArtigo(page), /Expandir/).click();
    await painelPronto(page);
    const fig = figPainel(page);

    // Lê rótulo E valor do MESMO cartão: comportamento certo com rótulo errado
    // ensina errado do mesmo jeito, e um rename que troque dois campos de lugar
    // mantém o conjunto de textos idêntico.
    const cartao = async (rotulo: string) =>
      fig.locator(".bigo-stat").filter({ hasText: rotulo }).evaluate((el) => ({
        rotulo: el.querySelector("span")?.textContent?.trim(),
        valor: el.querySelector("strong")?.textContent?.trim(),
      }));
    const aoFim = async () => {
      const { total } = await passo(fig);
      for (let k = (await passo(fig)).atual; k < total; k++) await page.keyboard.press("ArrowRight");
      await expect.poll(async () => (await passo(fig)).atual).toBe(total);
    };

    await aoFim();
    expect(await cartao("profundidade da recursão")).toEqual({
      rotulo: "profundidade da recursão",
      valor: "4",
    });
    expect(await cartao("comparações")).toEqual({ rotulo: "comparações", valor: "14" });

    // O preset "já ordenado" é o desastre: a MESMA quantidade de elementos
    // desce o dobro de níveis, e é isso que a peça existe para mostrar.
    await fig.getByRole("button", { name: /Já ordenado/ }).click();
    await expect.poll(async () => (await passo(fig)).total).toBe(115);
    await aoFim();
    expect(await cartao("profundidade da recursão")).toEqual({
      rotulo: "profundidade da recursão",
      valor: "8",
    });
    expect(await cartao("comparações")).toEqual({ rotulo: "comparações", valor: "28" });
  });

  // -------------------------------------------------------------------------
  // As frases do comparador de três vias.
  //
  // Estas asserções são de TEXTO INTEIRO, com `toHaveText`, e isso é o ponto:
  // as duas frases consertadas aqui passaram anos por uma suíte verde porque
  // ninguém lia a frase, só pedaços dela. `toContainText("já resolvido")` casa
  // com "1 já resolvidos", e `toContainText("elementos")` casa com a moldura
  // engolindo o próprio miolo. Ler a frase inteira é o que separa uma coisa da
  // outra.
  //
  // Cada condicional é conferida DOS DOIS LADOS: o preset em que o ramo dispara
  // e o preset em que ele não dispara. Um ramo só testado onde ele vale não
  // prova que o outro existe.
  // -------------------------------------------------------------------------

  /** O comparador de três vias é a 3ª figura da página, e não tem casca. */
  const figTresVias = (page: Page) => page.locator("article figure.viz").nth(2);
  /** Os dois painéis lado a lado, na ordem em que a peça os monta. */
  const painelDuas = (fig: Locator) => fig.locator(".ms-op").nth(0);
  const painelTres = (fig: Locator) => fig.locator(".ms-op").nth(1);

  test("três vias: quando a partição resolve tudo, a frase não promete subproblema nenhum", async ({
    page,
  }) => {
    await abrirPagina(page, 1512, 900);
    const fig = figTresVias(page);
    // A figura certa, antes de qualquer asserção: os três irmãos compartilham
    // as classes, e medir o painel errado passaria despercebido.
    await expect(fig.locator(".viz-head-title")).toHaveText(
      "Visualizador · o que fazer com os iguais ao pivô"
    );
    await expect(painelTres(fig).locator(".bb-formula-tit")).toHaveText(
      "Três vias (bandeira holandesa)"
    );

    // Preset "Todos iguais", o padrão: a partição de três vias resolve as oito
    // posições de uma vez e NÃO sobra subproblema. É o ramo em que a moldura
    // "sobram ... para a recursão resolver" não tem o que enquadrar.
    await expect(painelTres(fig).locator(".bb-formula-fim")).toHaveText(
      "A primeira partição resolveu o array inteiro: não sobrou nada para a recursão."
    );
    // O outro lado da MESMA condicional, na mesma tela: a de duas vias devolve
    // sete elementos para a recursão, e aí a moldura vale inteira.
    await expect(painelDuas(fig).locator(".bb-formula-fim")).toHaveText(
      "Depois da primeira partição sobram 7 elementos para a recursão resolver."
    );
    // E a faixa do meio no plural, que é o lado em que a concordância acerta.
    await expect(painelTres(fig).locator(".ms-seg.pivo")).toHaveText("= pivô, 8 já resolvidos");
  });

  test("no artigo a peça recolhida cabe no orçamento de uma tela", async ({ page }) => {
    await abrirPagina(page, 1512, 900);
    const fig = figArtigo(page);
    await page.waitForTimeout(600);
    const m = await fig.evaluate((el) => ({
      altura: Math.round(el.getBoundingClientRect().height),
      orcamento:
        window.innerHeight -
        (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ccc-header-h")) ||
          60) -
        24,
    }));
    // A asserção vem ANTES da pré-condição de propósito: a quebra que inverte a
    // decisão da medição desfaz o `data-codigo="off"`, e com a ordem trocada o
    // teste reprovaria na pré-condição, apontando para o lugar errado.
    expect(m.altura, `peça ${m.altura}px, orçamento ${m.orcamento}px`).toBeLessThanOrEqual(
      m.orcamento
    );
    await expect(fig).toHaveAttribute("data-codigo", "off");
  });
});
