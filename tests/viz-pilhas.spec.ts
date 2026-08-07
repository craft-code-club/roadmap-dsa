import { test, expect, type Page, type Locator } from "@playwright/test";

// Casca adaptativa dos visualizadores de pilhas.
//
// A página tem três peças com overlay, nesta ordem:
//   0 · StackVisualizer            — parênteses balanceados, as três camadas
//   1 · StackCallStackVisualizer   — a mesma potência com duas pilhas, idem
//   2 · StackMonotonicaVisualizer  — o próximo maior elemento, idem
//
// O `StackImplementacoes` não entra: é a tabela de custos, estática de
// propósito (sem "use client"), sai como `<figure class="pl-tab">` no build, sem
// overlay e sem controles — não há painel para arrumar.
//
// Todo teste aqui mede COMPORTAMENTO e lê RÓTULO. Contar elemento não prova
// nada, e comportamento certo debaixo do rótulo errado ensina errado do mesmo
// jeito. Nas três peças o rótulo mais frágil é o da torre — `topo · pos 2`,
// `topo · índice 3` —, porque ele é texto de tela COLADO numa interpolação, que
// é justamente o buraco aberto do `guarda-idioma.py` (contrato §0): um rename
// cego o estragaria sem nenhum aviso. Por isso ele é lido junto com o valor.

const URL = "/topico/pilhas/";

const CONGELA =
  "*, *::before, *::after { transition: none !important; animation: none !important; }";

/** Congela a animação e espera as fontes: medir antes disso mede o fallback. */
async function preparar(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: CONGELA });
}

/** Orçamento de altura do fluxo do artigo: janela menos cabeçalho e respiro. */
function orcamento(page: Page) {
  return page.evaluate(
    () =>
      window.innerHeight -
      (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ccc-header-h")) ||
        60) -
      24
  );
}

/** Abre o painel expandido da peça `i` e devolve o `<figure>` do painel. */
async function expandir(page: Page, i: number, antes?: (peca: Locator) => Promise<void>) {
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(i);
  if (antes) await antes(peca);
  await peca.getByRole("button", { name: /Expandir/ }).click();
  const painel = page.locator(".viz-overlay figure.viz");
  await expect(painel).toBeVisible();
  await preparar(page);
  return painel;
}

/**
 * Altura que parou de mudar. O `data-anim` do hook congela a transição da
 * MEDIÇÃO dele, e não a do clique do aluno: ler no meio dos 0,32s devolve o
 * layout a caminho e conclui "cabe" para uma peça que não cabe.
 */
async function alturaEstavel(alvo: Locator) {
  let anterior = -1;
  for (let k = 0; k < 40; k++) {
    const h = await alvo.evaluate((el) => Math.round(el.getBoundingClientRect().height));
    if (h === anterior) return h;
    anterior = h;
    await alvo.page().waitForTimeout(60);
  }
  return anterior;
}

/**
 * Rola o MIOLO até o fim e diz quanto o cabeçalho e o rodapé se mexeram.
 *
 * Devolve também a sobra da FIGURA: sem isso o teste aprova justamente a quebra
 * que a camada 1 conserta. Se a rolagem voltar para a figura inteira, o
 * `.viz-body` não tem o que rolar, `scrollTop` fica em zero, o cabeçalho não se
 * mexe em relação à figura — e um teste que só olhasse `headMoveu` passaria.
 */
async function rolarAteOFim(painel: Locator) {
  return painel.evaluate(async (f) => {
    const body = f.querySelector<HTMLElement>(".viz-body")!;
    const head = f.querySelector<HTMLElement>(".viz-head")!;
    const foot = f.querySelector<HTMLElement>(".viz-foot")!;
    const headAntes = Math.round(head.getBoundingClientRect().top);
    const footAntes = Math.round(foot.getBoundingClientRect().top);
    const sobra = body.scrollHeight - body.clientHeight;
    body.scrollTop = body.scrollHeight;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return {
      sobra,
      rolou: Math.round(body.scrollTop),
      sobraFigura: f.scrollHeight - f.clientHeight,
      headMoveu: Math.round(head.getBoundingClientRect().top) - headAntes,
      footMoveu: Math.round(foot.getBoundingClientRect().top) - footAntes,
    };
  });
}

// ---------------------------------------------------------------------------
// 0 · StackVisualizer — parênteses balanceados
// ---------------------------------------------------------------------------

test("no expandido dos parênteses, o ▶ Rodar fica parado enquanto o miolo rola", async ({
  page,
}) => {
  // 1440x600, com a pilha no fundo: medido, o miolo sobra 289px. Antes da casca
  // a FIGURA inteira rolava (807px de sobra no pior caso), o cabeçalho subia
  // 806px e o ▶ Rodar era desenhado com a base em 1348px numa janela de 600 —
  // o aluno perdia de vista justamente o botão que faz o algoritmo andar.
  //
  // A altura desta peça vem da TORRE, e a torre só existe depois que o
  // algoritmo empilha: no passo 1 ela está vazia e o miolo não sobra 1px. Medir
  // (ou testar) o passo inicial de um gerador de passos é medir o estado mais
  // BAIXO — por isso o teste anda até o fundo da pilha antes de rolar.
  await page.setViewportSize({ width: 1440, height: 600 });
  const painel = await expandir(page, 0, async (peca) => {
    await peca.locator("input.viz-input").first().fill("((((((((()))))))))");
  });
  const proximo = painel.getByRole("button", { name: "Próximo ›" });
  for (let k = 0; k < 9; k++) await proximo.click();
  await expect(painel.locator(".viz-step")).toHaveText("passo 10 de 20");
  await expect(painel.locator(".pl-torre .pl-item")).toHaveCount(9);

  const r = await rolarAteOFim(painel);
  // Sem sobra o teste não testaria nada, e sem provar que é o MIOLO que rola
  // ele aprovaria a quebra que devolve a rolagem para a figura.
  expect(r.sobra).toBeGreaterThan(20);
  expect(r.rolou).toBeGreaterThan(20);
  expect(r.sobraFigura).toBeLessThanOrEqual(8);
  expect(r.headMoveu).toBe(0);
  expect(r.footMoveu).toBe(0);

  // E os dois continuam LEGÍVEIS, com o rótulo deles, depois de rolar até o fim.
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeInViewport();
  await expect(
    painel.getByText("Visualizador · a pilha em ação: parênteses balanceados")
  ).toBeInViewport();
});

test("em 1512x900 o código dos parênteses vem recolhido, sob o rótulo certo", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(0);
  const codigo = peca.locator(".viz-code");

  // O rótulo diz o que o botão FAZ, e o bloco está mesmo sem altura (2px de
  // borda). Rótulo sem medida, ou medida sem rótulo, deixaria passar o caso em
  // que o botão promete uma coisa e a peça faz outra.
  await expect(peca.getByRole("button", { name: "Mostrar código" })).toBeVisible();
  await expect(peca).toHaveAttribute("data-codigo", "off");
  expect(await alturaEstavel(codigo)).toBeLessThanOrEqual(4);

  // A premissa medida, dentro do teste: com o código à mostra a peça pede 898px
  // contra 816px de orçamento. Sem isto o teste ficaria verde no dia em que a
  // peça encolhesse e o recolhimento deixasse de ter motivo.
  await peca.getByRole("button", { name: "Mostrar código" }).click();
  await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
  await expect(peca).toHaveAttribute("data-codigo", "on");
  expect(await alturaEstavel(codigo)).toBeGreaterThan(150);
  expect(await alturaEstavel(peca)).toBeGreaterThan(await orcamento(page));
});

test("em janela alta o código dos parênteses já vem aberto", async ({ page }) => {
  // Medido: com o código à mostra a peça pede 898px. Em 1100px de janela o
  // orçamento é 1016px, então a medição não tem motivo para esconder nada.
  await page.setViewportSize({ width: 1512, height: 1100 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(0);

  await expect(peca).toHaveAttribute("data-codigo", "on");
  await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
  expect(await alturaEstavel(peca.locator(".viz-code"))).toBeGreaterThan(150);
  // E o código é o DESTE visualizador, não um bloco qualquer.
  await expect(peca.locator(".viz-code-head")).toHaveText("solucao.py");
  expect(await alturaEstavel(peca)).toBeLessThanOrEqual(await orcamento(page));
});

test("a escolha de mostrar o código dos parênteses sobrevive à troca de preset", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(0);

  await peca.getByRole("button", { name: "Mostrar código" }).click();
  await expect(peca).toHaveAttribute("data-codigo", "on");

  // `expr.length` é o `measureOn` desta peça. O preset "Cruzado" leva de 6 para
  // 4 caracteres, então ele pede medição nova de verdade — e a troca aparece NA
  // TELA, senão o teste "sobrevive" a uma medição que nunca foi pedida.
  await expect(peca.locator(".viz-cells .viz-cell-wrap")).toHaveCount(6);
  await peca.getByRole("button", { name: "Cruzado: ([)]" }).click();
  await expect(peca.locator(".viz-cells .viz-cell-wrap")).toHaveCount(4);
  await expect(peca.locator(".viz-step")).toHaveText("passo 1 de 4");

  // "Está aberto agora" não é "continua aberto": amostro ao longo do tempo.
  // A amostragem vem ANTES da premissa de propósito: com a escolha do aluno
  // desligada a peça recolhe e encolhe, e aí a premissa vira falsa antes de a
  // asserção que carrega o sentido rodar — o teste reprovaria pela linha errada.
  for (let k = 0; k < 6; k++) {
    await expect(peca).toHaveAttribute("data-codigo", "on");
    await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
    await page.waitForTimeout(120);
  }

  // Premissa medida: neste estado, com o código à mostra, a peça estoura o
  // orçamento — ou seja, uma medição sem a escolha do aluno recolheria.
  expect(await alturaEstavel(peca)).toBeGreaterThan(await orcamento(page));
});

test("a torre dos parênteses lê caractere e posição no mesmo item", async ({ page }) => {
  // `topo · pos 2` é texto de tela colado numa interpolação
  // (`{k === 0 ? "topo · " : ""}pos {it.i}`), que o guarda de idioma não vê. E o
  // conjunto de textos sozinho também não bastaria: o guarda compara o CONJUNTO,
  // não onde cada um aparece. Aqui caractere, marca e posição são lidos juntos.
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(0);
  const proximo = peca.getByRole("button", { name: "Próximo ›" });

  // Passo 4 do preset padrão `{[()]}`: as três aberturas empilhadas.
  await proximo.click();
  await proximo.click();
  await proximo.click();
  await expect(peca.locator(".viz-step")).toHaveText("passo 4 de 8");

  const itens = peca.locator(".pl-torre .pl-item");
  await expect(itens).toHaveCount(3);
  // Do topo para a base: '(' na 2, '[' na 1, '{' na 0 — a ordem É a aula.
  await expect(itens.nth(0)).toHaveText("(topo · pos 2");
  await expect(itens.nth(1)).toHaveText("[pos 1");
  await expect(itens.nth(2)).toHaveText("{pos 0");
  await expect(itens.nth(0)).toHaveClass(/topo/);

  // E o painel de variáveis conta a mesma história, com o nome ao lado do valor.
  const variavel = (nome: string) =>
    peca.locator(".viz-var").filter({ hasText: nome }).locator(".viz-var-val");
  await expect(variavel("len(pilha)")).toHaveText("3");
  await expect(variavel("pilha[-1]")).toHaveText("'('");
});

test("no expandido dos parênteses, seta e espaço andam a animação e não roubam a tecla de quem digita", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  const painel = await expandir(page, 0);
  const passo = painel.locator(".viz-step");

  await expect(passo).toHaveText("passo 1 de 8");
  await page.keyboard.press("ArrowRight");
  await expect(passo).toHaveText("passo 2 de 8");
  // O rótulo e o número contam a mesma coisa: o passo 2 empilha o '{'.
  await expect(painel.locator(".viz-note").first()).toContainText("'{' é abertura");
  await page.keyboard.press("ArrowLeft");
  await expect(passo).toHaveText("passo 1 de 8");

  // Espaço roda e pausa, e o rótulo do botão diz em qual dos dois estados está.
  await page.keyboard.press("Space");
  await expect(painel.getByRole("button", { name: "❚❚ Pausar" })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();

  // Com o cursor num campo, espaço é espaço e seta é cursor. Sequestrar isso
  // deixaria a expressão impossível de editar, que é pior que não ter atalho.
  // Afirmo DEPOIS DE CADA TECLA: duas setas opostas se cancelam e um teste que
  // só olhasse o fim aprovaria a quebra.
  const campo = painel.locator("input.viz-input").first();
  await campo.fill("([])");
  await expect(passo).toHaveText("passo 1 de 6");

  // O campo filtra tudo que não é ( ) [ ] { }, então o espaço não fica no valor:
  // o que prova que a tecla não foi sequestrada é a animação NÃO ter andado.
  await campo.press("Space");
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();
  await expect(passo).toHaveText("passo 1 de 6");
  await expect(campo).toHaveValue("([])");

  // `fill` deixa o cursor no fim sem depender de `End`, que no macOS não leva o
  // cursor ao fim de um input. Comparo o cursor com ele mesmo.
  const antes = await campo.evaluate((el: HTMLInputElement) => el.selectionStart ?? -1);
  await campo.press("ArrowLeft");
  const depois = await campo.evaluate((el: HTMLInputElement) => el.selectionStart ?? -1);
  expect(depois).toBe(antes - 1);
  await expect(passo).toHaveText("passo 1 de 6");

  await page.keyboard.press("Escape");
  await expect(page.locator(".viz-overlay")).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// 1 · StackCallStackVisualizer — a mesma potência com duas pilhas
// ---------------------------------------------------------------------------

test("no expandido da call stack, o cabeçalho fica parado enquanto o miolo rola", async ({
  page,
}) => {
  // 1440x600 com o expoente no máximo e a recursão no fundo: medido, o miolo
  // sobra 296px. Antes da casca a figura inteira rolava (497px), o cabeçalho
  // subia 496px e o ▶ Rodar era desenhado com a base em 1038px numa janela de
  // 600. Como nos parênteses, a torre de frames só existe depois que a recursão
  // desce: no passo 1 há um frame só e o miolo não sobra nada.
  await page.setViewportSize({ width: 1440, height: 600 });
  const painel = await expandir(page, 1, async (peca) => {
    await peca.locator("input.viz-input.k").nth(1).fill("8");
  });
  await expect(painel.locator(".viz-step")).toHaveText("passo 1 de 24");
  const proximo = painel.getByRole("button", { name: "Próximo ›" });
  for (let k = 0; k < 14; k++) await proximo.click();
  await expect(painel.locator(".viz-step")).toHaveText("passo 15 de 24");
  await expect(painel.locator(".pl-torre .pl-item")).toHaveCount(8);

  const r = await rolarAteOFim(painel);
  expect(r.sobra).toBeGreaterThan(20);
  expect(r.rolou).toBeGreaterThan(20);
  expect(r.sobraFigura).toBeLessThanOrEqual(8);
  expect(r.headMoveu).toBe(0);
  expect(r.footMoveu).toBe(0);

  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeInViewport();
  await expect(
    painel.getByText("Visualizador · a mesma potência com duas pilhas")
  ).toBeInViewport();

  // O contador vive no cabeçalho e o botão no rodapé: se qualquer um dos dois
  // tivesse ido junto com a rolagem, este passo a passo seria impossível de
  // acompanhar. Clico no botão que ficou à vista e leio o contador que ficou.
  await expect(proximo).toBeInViewport();
  await proximo.click();
  await expect(painel.locator(".viz-step")).toHaveText("passo 16 de 24");
});

test("em 1440x700 o código da call stack vem recolhido, sob o rótulo certo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(1);
  const codigo = peca.locator(".viz-code");

  await expect(peca.getByRole("button", { name: "Mostrar código" })).toBeVisible();
  await expect(peca).toHaveAttribute("data-codigo", "off");
  expect(await alturaEstavel(codigo)).toBeLessThanOrEqual(4);

  // Premissa medida: com o código à mostra a peça pede 759px contra 616px de
  // orçamento nesta janela.
  await peca.getByRole("button", { name: "Mostrar código" }).click();
  await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
  await expect(peca).toHaveAttribute("data-codigo", "on");
  expect(await alturaEstavel(codigo)).toBeGreaterThan(100);
  expect(await alturaEstavel(peca)).toBeGreaterThan(await orcamento(page));
});

test("em 1512x900 o código da call stack já vem aberto, e é o do modo escolhido", async ({
  page,
}) => {
  // Medido: com o código à mostra a recursão pede 759px contra 816 de orçamento,
  // então não há motivo para esconder nada. A pilha explícita, no MESMO tamanho
  // de janela, recolhe: o código dela tem 8 linhas em vez de 4, e a peça aberta
  // passa do orçamento. Cada modo é medido por si.
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(1);

  await expect(peca).toHaveAttribute("data-codigo", "on");
  await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
  await expect(peca.locator(".viz-code-head")).toHaveText("recursivo.py");
  expect(await alturaEstavel(peca)).toBeLessThanOrEqual(await orcamento(page));

  await peca.getByRole("button", { name: "Pilha explícita" }).click();
  await expect(peca.locator(".viz-code-head")).toHaveText("com_pilha.py");
  await expect(peca).toHaveAttribute("data-codigo", "off");
  await expect(peca.getByRole("button", { name: "Mostrar código" })).toBeVisible();
  // E o título da coluna acompanha o modo: rótulo que não muda junto mente.
  await expect(peca.locator(".pl-lbl").nth(1)).toHaveText("Pilha (topo em cima)");
});

test("a escolha de mostrar o código da call stack sobrevive à troca de expoente", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(1);

  await peca.getByRole("button", { name: "Mostrar código" }).click();
  await expect(peca).toHaveAttribute("data-codigo", "on");

  // `n` é o `measureOn` desta peça, e a troca aparece na tela: a linha do tempo
  // vai de 9 para 15 passos e a ficha do expoente acompanha.
  await expect(peca.locator(".viz-step")).toHaveText("passo 1 de 9");
  await peca.locator("input.viz-input.k").nth(1).fill("5");
  await expect(peca.locator(".viz-step")).toHaveText("passo 1 de 15");
  await expect(
    peca.locator(".bigo-stat").filter({ hasText: "expoente (n)" }).locator("strong")
  ).toHaveText("5");

  for (let k = 0; k < 6; k++) {
    await expect(peca).toHaveAttribute("data-codigo", "on");
    await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
    await page.waitForTimeout(120);
  }

  expect(await alturaEstavel(peca)).toBeGreaterThan(await orcamento(page));
});

test("na call stack o ↺ do rodapé volta só o passo, e o Voltar ao 2³ volta a conta", async ({
  page,
}) => {
  // O `↺` do `VizFooter` é `viz.reset()`: volta ao passo 0 e NÃO desfaz o que o
  // aluno montou. O rótulo dele promete uma coisa só, e é a que ele faz — quem
  // devolve base e expoente é o botão que diz isso no rótulo.
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(1);
  const expoente = peca.locator("input.viz-input.k").nth(1);

  await expoente.fill("5");
  await peca.getByRole("button", { name: "Próximo ›" }).click();
  await peca.getByRole("button", { name: "Próximo ›" }).click();
  await expect(peca.locator(".viz-step")).toHaveText("passo 3 de 15");

  await peca.getByRole("button", { name: "Reiniciar", exact: true }).click();
  await expect(peca.locator(".viz-step")).toHaveText("passo 1 de 15");
  await expect(expoente).toHaveValue("5");

  await peca.getByRole("button", { name: "↺ Voltar ao 2³" }).click();
  await expect(expoente).toHaveValue("3");
  await expect(peca.locator(".viz-step")).toHaveText("passo 1 de 9");
});

test("no expandido da call stack, seta e espaço andam a animação e não roubam a tecla de quem digita", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  const painel = await expandir(page, 1);
  const passo = painel.locator(".viz-step");

  await expect(passo).toHaveText("passo 1 de 9");
  await page.keyboard.press("ArrowRight");
  await expect(passo).toHaveText("passo 2 de 9");
  // O passo 2 é o frame que fica parado esperando o de baixo devolver.
  await expect(painel.locator(".viz-note").first()).toContainText("n = 3 não é 1");
  await page.keyboard.press("ArrowLeft");
  await expect(passo).toHaveText("passo 1 de 9");

  await page.keyboard.press("Space");
  await expect(painel.getByRole("button", { name: "❚❚ Pausar" })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();

  // Com o cursor no campo do expoente, seta e espaço são do campo. Afirmo
  // depois de cada tecla, porque duas setas opostas se cancelariam no fim.
  const expoente = painel.locator("input.viz-input.k").nth(1);
  await expoente.click();
  await expoente.press("Space");
  await expect(passo).toHaveText("passo 1 de 9");
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();
  await expoente.press("ArrowRight");
  await expect(passo).toHaveText("passo 1 de 9");
  await expoente.press("ArrowLeft");
  await expect(passo).toHaveText("passo 1 de 9");

  await page.keyboard.press("Escape");
  await expect(page.locator(".viz-overlay")).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// 2 · StackMonotonicaVisualizer — o próximo maior elemento
// ---------------------------------------------------------------------------

test("no expandido da monotônica, o ▶ Rodar fica parado enquanto o miolo rola", async ({
  page,
}) => {
  // 1440x600: medido, o miolo sobra 144px. Antes da casca a figura inteira
  // rolava (475px), o cabeçalho subia 474px e o ▶ Rodar era desenhado com a base
  // em 1016px numa janela de 600 — 416px abaixo do pé visível.
  await page.setViewportSize({ width: 1440, height: 600 });
  const painel = await expandir(page, 2);

  const r = await rolarAteOFim(painel);
  expect(r.sobra).toBeGreaterThan(20);
  expect(r.rolou).toBeGreaterThan(20);
  expect(r.sobraFigura).toBeLessThanOrEqual(8);
  expect(r.headMoveu).toBe(0);
  expect(r.footMoveu).toBe(0);

  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeInViewport();
  await expect(
    painel.getByText("Visualizador · pilha monotônica: o próximo maior elemento")
  ).toBeInViewport();
});

test("em 1512x900 o código da monotônica vem recolhido, sob o rótulo certo", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(2);
  const codigo = peca.locator(".viz-code");

  await expect(peca.getByRole("button", { name: "Mostrar código" })).toBeVisible();
  await expect(peca).toHaveAttribute("data-codigo", "off");
  expect(await alturaEstavel(codigo)).toBeLessThanOrEqual(4);

  // Premissa medida: com o código à mostra a peça pede 1038px contra 816px.
  await peca.getByRole("button", { name: "Mostrar código" }).click();
  await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
  await expect(peca).toHaveAttribute("data-codigo", "on");
  expect(await alturaEstavel(codigo)).toBeGreaterThan(150);
  expect(await alturaEstavel(peca)).toBeGreaterThan(await orcamento(page));
});

test("em janela alta o código da monotônica já vem aberto", async ({ page }) => {
  // Medido: com o código à mostra a peça pede 1038px. Em 1300px de janela o
  // orçamento é 1216px, então a medição não tem motivo para esconder nada.
  await page.setViewportSize({ width: 1512, height: 1300 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(2);

  await expect(peca).toHaveAttribute("data-codigo", "on");
  await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
  expect(await alturaEstavel(peca.locator(".viz-code"))).toBeGreaterThan(150);
  await expect(peca.locator(".viz-code-head")).toHaveText("monotonica.py");
  expect(await alturaEstavel(peca)).toBeLessThanOrEqual(await orcamento(page));
});

test("a escolha de mostrar o código da monotônica sobrevive à troca de preset", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(2);

  await peca.getByRole("button", { name: "Mostrar código" }).click();
  await expect(peca).toHaveAttribute("data-codigo", "on");

  // `nums.length` é o `measureOn` desta peça: o preset do GeeksforGeeks leva de
  // 8 para 5 valores, então pede medição nova. As duas fitas (entrada e resposta)
  // caem de 16 para 10 células, e é isso que prova a troca NA TELA.
  await expect(peca.locator(".viz-cells .viz-cell-wrap")).toHaveCount(16);
  await peca.getByRole("button", { name: "Do GeeksforGeeks: 6 8 0 1 3" }).click();
  await expect(peca.locator(".viz-cells .viz-cell-wrap")).toHaveCount(10);
  await expect(peca.locator(".viz-step")).toHaveText("passo 1 de 19");

  for (let k = 0; k < 6; k++) {
    await expect(peca).toHaveAttribute("data-codigo", "on");
    await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
    await page.waitForTimeout(120);
  }

  expect(await alturaEstavel(peca)).toBeGreaterThan(await orcamento(page));
});

test("os cartões da monotônica leem rótulo e valor juntos, no mesmo cartão", async ({ page }) => {
  // O guarda de idioma compara o CONJUNTO de textos de tela, não onde cada um
  // aparece: trocar dois campos de lugar num rename mantém o conjunto idêntico e
  // passa verde com a tela mentindo. Quem pega isso é ler rótulo e valor juntos
  // — e aqui os dois contadores lado a lado SÃO a aula desta peça: a pilha faz
  // menos comparações que a força bruta faria no mesmo array.
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(2);
  const cartao = (rotulo: string) =>
    peca.locator(".bigo-stat").filter({ hasText: rotulo }).locator("strong");

  // Preset decrescente: a pilha nunca desempilha, e a força bruta varre tudo.
  await peca.getByRole("button", { name: "Pior caso da força bruta" }).click();
  await expect(cartao("tamanho (n)")).toHaveText("8");
  await expect(cartao("força bruta faria")).toHaveText("28");

  // Ando até o fim e leio os três contadores da pilha juntos: 8 push, 0 pop,
  // 7 comparações — bem menos que as 28 da força bruta, que é o ponto.
  const proximo = peca.getByRole("button", { name: "Próximo ›" });
  for (let k = 0; k < 40; k++) {
    if (await proximo.isDisabled()) break;
    await proximo.click();
  }
  await expect(peca.locator(".viz-step")).toHaveText("passo 26 de 26");
  await expect(cartao("empilhados (push)")).toHaveText("8");
  await expect(cartao("desempilhados (pop)")).toHaveText("0");
  await expect(cartao("comparações até aqui")).toHaveText("7");
  await expect(cartao("força bruta faria")).toHaveText("28");

  // E a torre lê valor e índice no mesmo item — o rótulo colado na interpolação.
  await peca.getByRole("button", { name: "Temperaturas (LeetCode 739)" }).click();
  await proximo.click();
  await proximo.click();
  await proximo.click();
  await expect(peca.locator(".viz-step")).toHaveText("passo 4 de 29");
  const itens = peca.locator(".pl-torre .pl-item");
  await expect(itens).toHaveCount(1);
  await expect(itens.nth(0)).toHaveText("73topo · índice 0");
});

test("no expandido da monotônica, seta e espaço andam a animação e não roubam a tecla de quem digita", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  const painel = await expandir(page, 2);
  const passo = painel.locator(".viz-step");

  await expect(passo).toHaveText("passo 1 de 29");
  await page.keyboard.press("ArrowRight");
  await expect(passo).toHaveText("passo 2 de 29");
  await expect(painel.locator(".viz-note").first()).toContainText("A pilha começa vazia");
  await page.keyboard.press("ArrowLeft");
  await expect(passo).toHaveText("passo 1 de 29");

  await page.keyboard.press("Space");
  await expect(painel.getByRole("button", { name: "❚❚ Pausar" })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();

  const campo = painel.locator("input.viz-input").first();
  await campo.fill("5, 4, 3");
  await expect(passo).toHaveText("passo 1 de 11");

  await campo.press("Space");
  await expect(campo).toHaveValue("5, 4, 3 ");
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();
  await expect(passo).toHaveText("passo 1 de 11");

  const antes = await campo.evaluate((el: HTMLInputElement) => el.selectionStart ?? -1);
  await campo.press("ArrowLeft");
  const depois = await campo.evaluate((el: HTMLInputElement) => el.selectionStart ?? -1);
  expect(depois).toBe(antes - 1);
  await expect(passo).toHaveText("passo 1 de 11");

  await page.keyboard.press("Escape");
  await expect(page.locator(".viz-overlay")).toHaveCount(0);
});
