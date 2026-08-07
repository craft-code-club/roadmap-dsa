import { expect, test, type Locator, type Page } from "@playwright/test";

// Casca adaptativa dos visualizadores de sliding-window.
//
// Os testes medem COMPORTAMENTO e leem RÓTULO. Contar elemento não prova nada:
// já passaram por uma suíte verde um visualizador sem botão nenhum e um painel
// com 0px de largura. E aqui o rótulo é conteúdo didático — o `ForcaBruta`
// existe justamente para contrastar dois contadores, então um número certo sob
// o rótulo errado ensina errado do mesmo jeito.

const URL = "/topico/sliding-window/";

// Ordem no artigo.
const FORCA_BRUTA = 0;
const JANELA_FIXA = 1;

async function abrirPainel(page: Page, n: number): Promise<Locator> {
  await page.locator("article figure.viz").nth(n).getByRole("button", { name: /Expandir/ }).click();
  const painel = page.locator(".viz-overlay figure.viz");
  await expect(painel).toBeVisible();
  return painel;
}

/** O número do card cujo RÓTULO é exatamente este. Ler pelo rótulo é o ponto. */
function estatistica(raiz: Locator, rotulo: string): Locator {
  return raiz.locator(`.bigo-stat:has(span:text-is(${JSON.stringify(rotulo)}))`).locator("strong");
}

/** O valor da variável cujo NOME é exatamente este. */
function variavel(raiz: Locator, nome: string): Locator {
  return raiz
    .locator(`.viz-var:has(.viz-var-name:text-is(${JSON.stringify(nome)}))`)
    .locator(".viz-var-val");
}

function alturaDe(alvo: Locator): Promise<number> {
  return alvo.evaluate((el) => Math.round(el.getBoundingClientRect().height));
}

/**
 * Altura só depois que a transição PARA. Ler no meio dela devolve o layout a
 * caminho, e quem age em cima dessa leitura decide errado — foi assim que uma
 * versão anterior deste arquivo passou contra o código quebrado: o clique
 * seguinte caía com o bloco a 164px dos 306px finais, a medição concluía
 * "cabe" e o defeito não aparecia.
 */
async function alturaEstavel(page: Page, alvo: Locator): Promise<number> {
  let anterior = -1;
  for (let i = 0; i < 40; i++) {
    const agora = await alturaDe(alvo);
    if (agora === anterior) return agora;
    anterior = agora;
    await page.waitForTimeout(80);
  }
  throw new Error("a altura não estabilizou");
}

/** O que sobra de altura para a peça no fluxo do artigo. */
function orcamentoDaTela(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      window.innerHeight -
      (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ccc-header-h")) || 60) -
      24
  );
}

test.describe("sliding-window · casca adaptativa", () => {
  test("no painel, cabeçalho e controles não se mexem enquanto o miolo rola", async ({ page }) => {
    // Janela baixa de propósito: é onde o miolo tem mesmo o que rolar.
    await page.setViewportSize({ width: 1280, height: 680 });
    await page.goto(URL);
    const painel = await abrirPainel(page, FORCA_BRUTA);

    // Com o código à mostra o miolo passa da altura da janela. Sem essa
    // garantia o teste rolaria zero pixel e passaria sem exercitar nada.
    const botaoCodigo = painel.getByRole("button", { name: /código/ });
    if ((await botaoCodigo.textContent())?.includes("Mostrar")) await botaoCodigo.click();
    await expect(botaoCodigo).toHaveText("Ocultar código");

    const corpo = painel.locator(".viz-body");
    await expect
      .poll(() => corpo.evaluate((el) => el.scrollHeight - el.clientHeight))
      .toBeGreaterThan(20);

    const cabeca = painel.locator(".viz-head");
    const rodape = painel.locator(".viz-foot");
    const rodar = painel.getByRole("button", { name: /Rodar|Pausar/ });

    const cabecaAntes = (await cabeca.boundingBox())!;
    const rodapeAntes = (await rodape.boundingBox())!;

    await corpo.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await expect.poll(() => corpo.evaluate((el) => Math.round(el.scrollTop))).toBeGreaterThan(20);

    const cabecaDepois = (await cabeca.boundingBox())!;
    const rodapeDepois = (await rodape.boundingBox())!;
    const rodarDepois = (await rodar.boundingBox())!;

    expect(Math.abs(cabecaDepois.y - cabecaAntes.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(rodapeDepois.y - rodapeAntes.y)).toBeLessThanOrEqual(1);

    // O botão que faz o algoritmo andar continua inteiro dentro da janela.
    const janela = page.viewportSize()!.height;
    expect(rodarDepois.y).toBeGreaterThanOrEqual(0);
    expect(rodarDepois.y + rodarDepois.height).toBeLessThanOrEqual(janela);
    await expect(rodar).toHaveText("▶ Rodar");
  });

  test("em tela baixa o código vem recolhido, o rótulo diz o que some e a peça cabe", async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(URL);
    const figura = page.locator("article figure.viz").nth(JANELA_FIXA);

    await expect(figura.getByRole("button", { name: /código/ })).toHaveText("Mostrar código");

    // Recolhido de verdade: zerar só a trilha da coluna tiraria a largura e
    // deixaria a altura de pé, que foi o defeito medido no Big O.
    await expect.poll(() => alturaDe(figura.locator(".viz-code-slot"))).toBeLessThan(8);

    const orcamento = await orcamentoDaTela(page);
    await expect.poll(() => alturaDe(figura)).toBeLessThan(orcamento);
  });

  test("em tela alta o código já vem à mostra", async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 1400 });
    await page.goto(URL);
    const figura = page.locator("article figure.viz").nth(JANELA_FIXA);

    await expect(figura.getByRole("button", { name: /código/ })).toHaveText("Ocultar código");
    await expect.poll(() => alturaDe(figura.locator(".viz-code-slot"))).toBeGreaterThan(100);
  });

  test("a escolha do aluno sobrevive a uma troca de estado que pediria medição nova", async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(URL);
    const figura = page.locator("article figure.viz").nth(JANELA_FIXA);
    const botaoCodigo = figura.getByRole("button", { name: /código/ });
    const fatia = figura.locator(".viz-code-slot");

    // A medição recolheu sozinha, então o aluno abrir é uma escolha explícita.
    await expect(botaoCodigo).toHaveText("Mostrar código");
    await botaoCodigo.click();
    expect(await alturaEstavel(page, fatia)).toBeGreaterThan(100);

    // A premissa do teste, medida e não suposta: com o código à mostra a peça
    // NÃO cabe. Uma medição nova pediria para recolher; é isso que a escolha
    // do aluno tem que vencer.
    const orcamento = await orcamentoDaTela(page);
    expect(await alturaDe(figura)).toBeGreaterThan(orcamento);

    // Duas trocas de estado que pedem medição nova: o tamanho da entrada e o
    // tamanho da janela.
    await figura.getByRole("button", { name: "Tudo igual: k = 2" }).click();
    await expect(figura.locator(".viz-cell-wrap")).toHaveCount(5);
    await page.setViewportSize({ width: 1512, height: 700 });

    // "Está aberto agora" não é "continua aberto": amostra ao longo do
    // intervalo em que a medição poderia desfazer a escolha.
    const leituras: number[] = [];
    for (let i = 0; i < 8; i++) {
      leituras.push(await alturaDe(fatia));
      await page.waitForTimeout(120);
    }
    expect(Math.min(...leituras)).toBeGreaterThan(100);
    await expect(botaoCodigo).toHaveText("Ocultar código");
  });

  test("no painel as setas e o espaço andam a animação, e o campo em edição manda", async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(URL);
    const painel = await abrirPainel(page, JANELA_FIXA);
    const passo = painel.locator(".viz-step");

    await expect(passo).toHaveText("passo 1 de 18");
    await page.keyboard.press("ArrowRight");
    await expect(passo).toHaveText("passo 2 de 18");
    await page.keyboard.press("ArrowLeft");
    await expect(passo).toHaveText("passo 1 de 18");

    await page.keyboard.press("Space");
    await expect(painel.getByRole("button", { name: /Pausar/ })).toBeVisible();
    await page.keyboard.press("Space");
    await expect(painel.getByRole("button", { name: /Rodar/ })).toBeVisible();

    await painel.locator('.viz-btn[title="Reiniciar"]').click();
    await expect(passo).toHaveText("passo 1 de 18");
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
    await expect(passo).toHaveText("passo 5 de 18");

    // Com o cursor no campo, a seta é do campo e a animação não anda.
    const campo = painel.locator("input.viz-input").first();
    const valorAntes = await campo.inputValue();
    await campo.click();
    await page.keyboard.press("ArrowRight");
    await expect(passo).toHaveText("passo 5 de 18");
    await expect(campo).toHaveValue(valorAntes);

    // E o espaço é um espaço digitado, não o play. Comparo o valor com ele
    // mesmo: no macOS não dá para confiar em onde o cursor está.
    await page.keyboard.press("Space");
    await expect(painel.getByRole("button", { name: /Rodar/ })).toBeVisible();
    const valorDepois = await campo.inputValue();
    expect(valorDepois.length).toBe(valorAntes.length + 1);
    expect(valorDepois.replace(/ /g, "")).toBe(valorAntes.replace(/ /g, ""));
  });

  test("força bruta contra janela: cada número está sob o rótulo certo, e a nota repete os mesmos", async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(URL);
    const painel = await abrirPainel(page, FORCA_BRUTA);

    const forca = estatistica(painel, "operações da força bruta");
    const janela = estatistica(painel, "operações da janela");
    const economia = estatistica(painel, "trabalho economizado");
    const maior = estatistica(painel, "maior soma (as duas)");

    // No primeiro passo ninguém tem estado guardado: os dois pagam a mesma
    // leitura, e é isso que os cards precisam dizer.
    await expect(painel.locator(".viz-step")).toHaveText("passo 1 de 25");
    await expect(forca).toHaveText("1");
    await expect(janela).toHaveText("1");
    await expect(economia).toHaveText("0%");

    const proximo = painel.getByRole("button", { name: "Próximo ›" });
    // `isEnabled()` lê UMA vez: se o painel ainda não tiver hidratado o botão, a
    // leitura devolve o estado velho, o laço não clica e o `toBeDisabled()` do
    // fim passa sobre esse mesmo estado. A janela tem dois lados.
    await expect(proximo, "a animação não reiniciou: Próximo já começou desabilitado").toBeEnabled();
    // O laço sai calado se o limite estourar. Sem esta linha, os cartões abaixo
    // seriam lidos num passo do meio — e os do passo 1 (1, 1, 0%) são valores
    // plausíveis, então a asserção passaria dizendo o contrário do que afirma.
    for (let i = 0; i < 40 && (await proximo.isEnabled()); i++) await proximo.click();
    await expect(proximo, "a animação não chegou ao fim dentro do limite do laço").toBeDisabled();
    await expect(painel.locator(".viz-step")).toHaveText("passo 25 de 25");

    // [2,3,4,5,6,7,1,9] com k = 3: 6 janelas. A força bruta relê k por janela
    // (3 + 5·3 = 18); a janela paga 3 na montagem e 2 por passo (3 + 5·2 = 13).
    await expect(forca).toHaveText("18");
    await expect(janela).toHaveText("13");
    await expect(economia).toHaveText("28%");
    await expect(maior).toHaveText("18");
    await expect(variavel(painel, "k")).toHaveText("3");

    await expect(painel.locator(".viz-note")).toHaveText(
      /Mesma resposta \(18\) com 18 operações na força bruta contra 13 na janela, em 6 janelas/
    );
  });

  test("janela fixa: encurtar o array encurta o k, e o campo não passa a mentir", async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(URL);
    const figura = page.locator("article figure.viz").nth(JANELA_FIXA);
    const campoK = figura.locator("input.viz-input.k");
    const campoArray = figura.locator("input.viz-input").first();

    // Preset que deixa a janela do tamanho do array.
    await figura.getByRole("button", { name: "k = n: uma janela só" }).click();
    await expect(campoK).toHaveValue("8");

    // Agora o array encolhe para três elementos. O k de 8 não cabe mais.
    await campoArray.fill("4, 9, 2");
    await expect(figura.locator(".viz-cell-wrap")).toHaveCount(3);

    // O campo tem que dizer o k que está VALENDO. Antes ele seguia em 8
    // enquanto o algoritmo já usava 3, e o aluno lia um e via o outro.
    await expect(campoK).toHaveValue("3");
    await expect(estatistica(figura, "tamanho (n)")).toHaveText("3");
    await expect(estatistica(figura, "leituras da força bruta")).toHaveText("3");

    // E a aula fecha com o mesmo número do campo: 4 + 9 + 2 = 15.
    const proximo = figura.getByRole("button", { name: "Próximo ›" });
    // Aqui o array acabou de ser reescrito no campo, que é o caso mais claro de
    // leitura única devolvendo o estado da entrada anterior.
    await expect(proximo, "a animação não reiniciou: Próximo já começou desabilitado").toBeEnabled();
    for (let i = 0; i < 20 && (await proximo.isEnabled()); i++) await proximo.click();
    await expect(proximo, "a animação não chegou ao fim dentro do limite do laço").toBeDisabled();
    await expect(figura.locator(".viz-note")).toHaveText(
      /a maior soma de 3 elementos seguidos é 15/
    );
  });

  test("janela fixa: as leituras batem com o rótulo do card e com a nota final", async ({ page }) => {
    await page.setViewportSize({ width: 1512, height: 900 });
    await page.goto(URL);
    const painel = await abrirPainel(page, JANELA_FIXA);

    const proximo = painel.getByRole("button", { name: "Próximo ›" });
    await expect(proximo, "a animação não reiniciou: Próximo já começou desabilitado").toBeEnabled();
    for (let i = 0; i < 40 && (await proximo.isEnabled()); i++) await proximo.click();
    await expect(proximo, "a animação não chegou ao fim dentro do limite do laço").toBeDisabled();
    await expect(painel.locator(".viz-step")).toHaveText("passo 18 de 18");

    // [3,6,2,8,1,4,1,5] com k = 3: a janela lê 3 + 2·5 = 13; a força bruta
    // leria (8-3+1)·3 = 18. A maior soma de 3 seguidos é [6,2,8] = 16.
    await expect(estatistica(painel, "tamanho (n)")).toHaveText("8");
    await expect(estatistica(painel, "leituras da janela")).toHaveText("13");
    await expect(estatistica(painel, "leituras da força bruta")).toHaveText("18");
    await expect(estatistica(painel, "memória extra")).toHaveText("O(1)");
    await expect(variavel(painel, "melhor")).toHaveText("16");

    await expect(painel.locator(".viz-note")).toHaveText(
      /Gastei 13 leituras do array, contra 18 da força bruta/
    );
  });
});
