import { test, expect, type Page, type Locator } from "@playwright/test";

// Casca adaptativa dos três visualizadores de recursão de cauda.
//
// A página tem três peças, nesta ordem:
//   0 · TailRecursionForma       — o classificador dos 7 casos. `collapsible:
//                                  false`: o bloco de código É o conteúdo que
//                                  se classifica, não um respiro dispensável
//   1 · TailRecursionVisualizer  — a mesma soma nas duas formas, lado a lado
//   2 · TailRecursionTrampolim   — o trampolim, com a régua de hipótese
//
// O defeito que estes testes protegem não era só altura: no painel expandido a
// FIGURA inteira rolava e levava o cabeçalho junto. Medido em 1512x900, antes:
// a figura rolava 278px (comparador) e 468px (trampolim), o cabeçalho subia o
// mesmo tanto, e o `▶ Rodar` era desenhado com a base em 1.119px e 1.309px
// numa janela de 900 — 219 e 409px abaixo do pé visível.
//
// Todo teste aqui mede COMPORTAMENTO e lê RÓTULO. Contar elemento não prova
// nada, e comportamento certo debaixo do rótulo errado ensina errado igual.

const URL = "/topico/recursao-funcional/";

const CONGELA =
  "*, *::before, *::after { transition: none !important; animation: none !important; }";

/** Congela a animação e espera as fontes: medir antes disso mede o fallback. */
async function preparar(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: CONGELA });
}

/** Abre o painel expandido da peça `i` SEM recarregar: o estado montado fica. */
async function expandirAqui(page: Page, i: number) {
  await page.locator("article figure.viz").nth(i).getByRole("button", { name: /Expandir/ }).click();
  const painel = page.locator(".viz-overlay figure.viz");
  await expect(painel).toBeVisible();
  await preparar(page);
  return painel;
}

/** Abre a página e o painel expandido da peça `i`. */
async function expandir(page: Page, i: number) {
  await page.goto(URL);
  await preparar(page);
  return expandirAqui(page, i);
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
 * Rola o miolo até o fim e diz quanto o cabeçalho e o rodapé se mexeram, e se
 * quem rolou foi mesmo o miolo. As três coisas juntas são o teste: com a
 * rolagem devolvida à figura — que é exatamente o bug que a camada 1 conserta —
 * `sobra` e `rolou` ficam em zero, o cabeçalho não se mexe, e um teste que só
 * olhasse `headMoveu` aprovaria a quebra.
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
    f.scrollTop = f.scrollHeight;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return {
      sobra,
      rolou: Math.round(body.scrollTop),
      figuraRolou: Math.round(f.scrollTop),
      headMoveu: Math.round(head.getBoundingClientRect().top) - headAntes,
      footMoveu: Math.round(foot.getBoundingClientRect().top) - footAntes,
    };
  });
}

// ---------------------------------------------------------------------------
// 0 · TailRecursionForma — o classificador
// ---------------------------------------------------------------------------

test("no expandido do classificador, o veredito fica parado enquanto o miolo rola", async ({
  page,
}) => {
  // 1440x600 com o caso mais alto (busca em BST, 6 linhas de código): medido,
  // o miolo sobra 85px. Antes da casca a figura inteira rolava 94px, o
  // cabeçalho subia o mesmo e o "▶ Rodar os 7 casos" era desenhado com a base
  // em 635px numa janela de 600.
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(0);
  await peca.getByRole("button", { name: "busca em BST" }).click();
  // A entrada mudou mesmo: sem esta asserção o teste mediria o caso padrão.
  await expect(peca.locator(".viz-step")).toHaveText("passo 6 de 7");
  await expect(peca.locator(".tr-lang")).toHaveText("bst.py");

  const painel = await expandirAqui(page, 0);
  const r = await rolarAteOFim(painel);
  // Sem sobra o teste não testaria nada: ele precisa de miolo para rolar.
  expect(r.sobra).toBeGreaterThan(20);
  expect(r.rolou).toBeGreaterThan(20);
  // E quem rola tem que ser o miolo, não a figura.
  expect(r.figuraRolou).toBe(0);
  expect(r.headMoveu).toBe(0);
  expect(r.footMoveu).toBe(0);

  // Os controles seguem à vista, e sob o rótulo deles.
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeInViewport();
  await expect(painel.locator(".viz-step")).toBeInViewport();
  await expect(
    painel.getByText("Visualizador · esta chamada está em posição de cauda?")
  ).toBeInViewport();
});

test("o classificador não promete esconder o código, porque o código é o conteúdo", async ({
  page,
}) => {
  // A janela mais apertada das três réguas: é aqui que uma peça `collapsible`
  // teria recolhido o bloco. Medido: mesmo recolhido o classificador pediria
  // 533px de um orçamento de 516, então recolher esconderia o conteúdo E não
  // resolveria nada.
  await page.setViewportSize({ width: 1440, height: 600 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(0);

  // Nenhum botão promete esconder um bloco: rótulo que mente ensina errado.
  await expect(peca.getByRole("button", { name: /código/ })).toHaveCount(0);
  await expect(peca).toHaveAttribute("data-codigo", "on");

  // E o código está mesmo na tela, com o rótulo que o explica.
  await expect(peca.locator(".tr-code-head")).toHaveText(
    "a linha destacada é a última instrução executada"
  );
  expect(await alturaEstavel(peca.locator(".tr-code"))).toBeGreaterThan(100);

  // O modo treino é a prova de que o bloco não é dispensável: a própria nota
  // manda ler o código. Com ele recolhido, a instrução apontaria para o nada.
  await peca.getByRole("button", { name: "Modo treino: esconder o veredito" }).click();
  await expect(peca.locator(".viz-note")).toContainText("Leia o código acima e responda");
  await expect(peca.locator(".tr-selo")).toHaveText("? decida antes de revelar");
  expect(await alturaEstavel(peca.locator(".tr-code"))).toBeGreaterThan(100);
  await expect(peca.locator(".viz-line").first()).toContainText("def soma(nums):");
});

test("no expandido, seta e espaço andam os 7 casos e o veredito volta a se esconder", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(0);
  await peca.getByRole("button", { name: "Modo treino: esconder o veredito" }).click();
  const painel = await expandirAqui(page, 0);
  const passo = painel.locator(".viz-step");

  await expect(passo).toHaveText("passo 1 de 7");
  await expect(painel.locator(".tr-selo")).toHaveText("? decida antes de revelar");

  // Revelo o caso 1: o veredito aparece com o rótulo certo.
  await painel.getByRole("button", { name: "Revelar veredito" }).click();
  await expect(painel.locator(".tr-selo").first()).toHaveText("✗ não está em posição de cauda");

  // A seta anda o caso — e o veredito do caso NOVO tem que voltar a se
  // esconder, senão o exercício entrega a resposta antes da pergunta.
  await page.keyboard.press("ArrowRight");
  await expect(passo).toHaveText("passo 2 de 7");
  await expect(painel.locator(".tr-lang")).toHaveText("soma_cauda.py");
  await expect(painel.locator(".tr-selo")).toHaveText("? decida antes de revelar");

  await page.keyboard.press("ArrowLeft");
  await expect(passo).toHaveText("passo 1 de 7");

  // Espaço roda e pausa, e o rótulo do botão diz em qual dos dois está.
  await page.keyboard.press("Space");
  await expect(painel.getByRole("button", { name: "❚❚ Pausar" })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();

  // Campo em edição manda: com o slider de velocidade em foco, a seta é dele.
  await painel.locator('.viz-speed input[type="range"]').focus();
  const antes = await passo.innerText();
  await page.keyboard.press("ArrowRight");
  await expect(passo).toHaveText(antes);
});

// ---------------------------------------------------------------------------
// 1 · TailRecursionVisualizer — a mesma soma nas duas formas
// ---------------------------------------------------------------------------

test("no expandido do comparador, o Próximo › anda o passo depois da rolagem", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  const painel = await expandir(page, 1);

  await expect(painel.locator(".viz-step")).toHaveText("passo 1 de 9");

  const r = await rolarAteOFim(painel);
  expect(r.sobra).toBeGreaterThan(20);
  expect(r.rolou).toBeGreaterThan(20);
  expect(r.figuraRolou).toBe(0);
  expect(r.headMoveu).toBe(0);
  expect(r.footMoveu).toBe(0);

  // O contador vive no cabeçalho e o botão no rodapé: se qualquer um dos dois
  // tivesse ido junto com a rolagem, este passo a passo seria impossível de
  // acompanhar. Clico no botão que ficou à vista e leio o contador que ficou.
  const proximo = painel.getByRole("button", { name: "Próximo ›" });
  await expect(proximo).toBeInViewport();
  await proximo.click();
  await expect(painel.locator(".viz-step")).toHaveText("passo 2 de 9");
  // O contador e a pilha contam a mesma coisa, e o painel de variáveis também.
  await expect(painel.locator(".tr-painel").first().locator(".viz-note")).toContainText(
    "2 frames na pilha, parados, esperando uma resposta que ainda não existe."
  );
  // Valor no nó do valor: na ficha inteira ("frames · comum2"),
  // `toContainText("2")` passa com 12 ou 20 — e o número é a aula do passo.
  await expect(
    painel.locator(".viz-var").filter({ hasText: "frames · comum" }).locator(".viz-var-val")
  ).toHaveText("2");
});

test("em 1512x900 o código do comparador vem recolhido, sob o rótulo certo", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(0 + 1);
  const codigo = peca.locator(".viz-code");

  // O rótulo diz o que o botão FAZ, e o bloco está mesmo sem altura (2px de
  // borda). Rótulo sem medida, ou medida sem rótulo, deixaria passar o caso em
  // que o botão promete uma coisa e a peça faz outra.
  await expect(peca.getByRole("button", { name: "Mostrar código" })).toBeVisible();
  await expect(peca).toHaveAttribute("data-codigo", "off");
  expect(await alturaEstavel(codigo)).toBeLessThanOrEqual(4);

  // A premissa medida, dentro do teste: com o código à mostra a peça NÃO cabe
  // no orçamento da janela (1.139px contra 816). Sem isto o teste ficaria verde
  // no dia em que o recolhimento fosse decidido por engano.
  await peca.getByRole("button", { name: "Mostrar código" }).click();
  await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
  await expect(peca).toHaveAttribute("data-codigo", "on");
  await expect(peca.locator(".viz-code-head")).toHaveText("soma.py");
  expect(await alturaEstavel(codigo)).toBeGreaterThan(150);
  expect(await alturaEstavel(peca)).toBeGreaterThan(await orcamento(page));
});

test("em janela alta o código do comparador já vem aberto", async ({ page }) => {
  // Medido: com o código à mostra a peça pede 1.139px. Em 1400px de janela o
  // orçamento é 1.316px, então a medição não tem motivo para esconder nada.
  await page.setViewportSize({ width: 1512, height: 1400 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(1);

  await expect(peca).toHaveAttribute("data-codigo", "on");
  await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
  expect(await alturaEstavel(peca.locator(".viz-code"))).toBeGreaterThan(150);
  // E o código é o deste visualizador, não um bloco qualquer: as duas somas.
  await expect(peca.locator(".viz-code-head")).toHaveText("soma.py");
  await expect(peca.locator(".viz-line").first()).toContainText(
    "def soma(nums):                       # comum"
  );
  expect(await alturaEstavel(peca)).toBeLessThanOrEqual(await orcamento(page));
});

test("a escolha de mostrar o código do comparador sobrevive a desligar o TCO", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(1);

  await peca.getByRole("button", { name: "Mostrar código" }).click();
  await expect(peca).toHaveAttribute("data-codigo", "on");

  // Desligar o TCO está no `measureOn` e muda a peça de verdade: o lado direito
  // passa a empilhar igual ao esquerdo. A medição roda de novo aqui.
  await peca.getByRole("button", { name: "Python, Java, C# (sem TCO)" }).click();
  // O card concatena rótulo e valor num nó só, então o <strong> é quem guarda o
  // valor: no card inteiro, "5" passa com 15 e "O(n)" com "O(n log n)".
  await expect(
    peca.locator(".bigo-stat").filter({ hasText: "espaço extra · de cauda" }).locator("strong")
  ).toHaveText("O(n)");
  await expect(
    peca.locator(".bigo-stat").filter({ hasText: "pico de frames · de cauda" }).locator("strong")
  ).toHaveText("5");

  // "Está aberto agora" não é "continua aberto": amostro ao longo do tempo.
  // Esta é a asserção que carrega o sentido do teste, e por isso vem ANTES da
  // premissa: com a escolha do aluno desfeita, é ela que tem de reprovar.
  for (let k = 0; k < 6; k++) {
    await expect(peca).toHaveAttribute("data-codigo", "on");
    await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
    await page.waitForTimeout(120);
  }

  // Premissa medida: neste estado, com o código à mostra, a peça estoura o
  // orçamento — ou seja, uma medição sem a escolha do aluno recolheria.
  expect(await alturaEstavel(peca)).toBeGreaterThan(await orcamento(page));
});

test("no expandido, seta e espaço andam o comparador e não roubam a tecla de quem digita", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  const painel = await expandir(page, 1);
  const passo = painel.locator(".viz-step");

  await expect(passo).toHaveText("passo 1 de 9");
  await page.keyboard.press("ArrowRight");
  await expect(passo).toHaveText("passo 2 de 9");
  await page.keyboard.press("ArrowLeft");
  await expect(passo).toHaveText("passo 1 de 9");

  await page.keyboard.press("Space");
  await expect(painel.getByRole("button", { name: "❚❚ Pausar" })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();

  // Campo em edição manda: com o cursor na lista, seta é cursor e espaço é
  // espaço. Sequestrar isso deixaria a lista impossível de editar.
  //
  // Uma seta SÓ, e nunca o par ida-e-volta: `ArrowRight` seguido de
  // `ArrowLeft` devolve a peça ao passo de origem, e aí a asserção fica verde
  // exatamente igual com a tecla roubada. Medido, com a quebra aplicada.
  const campo = painel.locator("input.viz-input");
  await campo.click();
  await page.keyboard.press("ArrowRight");
  await expect(passo).toHaveText("passo 1 de 9");
  await page.keyboard.press("ArrowRight");
  await expect(passo).toHaveText("passo 1 de 9");

  // Espaço é espaço: entra no campo em vez de rodar a animação.
  await campo.fill("5, 6");
  await campo.press("End");
  await campo.press("Space");
  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();
  await expect(campo).toHaveValue("5, 6 ");

  // E o campo continua editável: digitar muda a lista e a peça acompanha.
  await expect(passo).toHaveText("passo 1 de 5");
  await expect(
    painel.locator(".bigo-stat").filter({ hasText: "pico de frames · comum" }).locator("strong")
  ).toHaveText("3");
});

test("com a lista vazia o comparador perde a linha do tempo, e o que fica tem rótulo", async ({
  page,
}) => {
  // `total` derivado da entrada atravessa 1: o gerador devolve um passo só. O
  // contrato manda o rodapé de reprodução sumir inteiro — e é por isso que
  // `total` está no `measureOn`, senão a travessia não pediria medição nova.
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(1);

  await expect(peca.locator(".viz-step")).toHaveText("passo 1 de 9");
  await peca.getByRole("button", { name: "Lista vazia" }).click();

  await expect(peca.locator(".viz-step")).toHaveCount(0);
  await expect(peca.locator(".viz-foot")).toHaveCount(0);
  await expect(peca.getByRole("button", { name: "▶ Rodar" })).toHaveCount(0);

  // O que fica continua dizendo o que é — e é o número que o artigo promete
  // para este preset: 1 frame de pico dos dois lados.
  await expect(
    peca.locator(".bigo-stat").filter({ hasText: "pico de frames · comum" }).locator("strong")
  ).toHaveText("1");
  await expect(
    peca.locator(".bigo-stat").filter({ hasText: "pico de frames · de cauda" }).locator("strong")
  ).toHaveText("1");
  // E o preset segue no miolo, que é como se volta de lá.
  await expect(peca.getByRole("button", { name: "Sete números" })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 2 · TailRecursionTrampolim — o trampolim
// ---------------------------------------------------------------------------

test("no expandido do trampolim, o ▶ Rodar fica parado enquanto o miolo rola", async ({ page }) => {
  // 1512x900: medido, o miolo sobra 100px. Antes da casca a figura inteira
  // rolava 468px, o cabeçalho subia 468px e o `▶ Rodar` era desenhado com a
  // base em 1.309px numa janela de 900 — 409px abaixo do pé visível.
  await page.setViewportSize({ width: 1512, height: 900 });
  const painel = await expandir(page, 2);

  const r = await rolarAteOFim(painel);
  expect(r.sobra).toBeGreaterThan(20);
  expect(r.rolou).toBeGreaterThan(20);
  expect(r.figuraRolou).toBe(0);
  expect(r.headMoveu).toBe(0);
  expect(r.footMoveu).toBe(0);

  await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeInViewport();
  await expect(painel.locator(".viz-step")).toBeInViewport();
  await expect(
    painel.getByText("Visualizador · trampolim: recursão de cauda sem ajuda da linguagem")
  ).toBeInViewport();

  // E ele anda de verdade depois de a rolagem ter acontecido.
  await painel.getByRole("button", { name: "Próximo ›" }).click();
  await expect(painel.locator(".viz-step")).toHaveText("passo 2 de 11");
  await expect(painel.locator(".viz-note").first()).toContainText(
    "A conta acontece agora, na ida: acc 0 + 1 = 1."
  );
});

test("em 1512x900 o código do trampolim vem recolhido, sob o rótulo certo", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(2);
  const codigo = peca.locator(".viz-code");

  await expect(peca.getByRole("button", { name: "Mostrar código" })).toBeVisible();
  await expect(peca).toHaveAttribute("data-codigo", "off");
  expect(await alturaEstavel(codigo)).toBeLessThanOrEqual(4);

  await peca.getByRole("button", { name: "Mostrar código" }).click();
  await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
  await expect(peca).toHaveAttribute("data-codigo", "on");
  await expect(peca.locator(".viz-code-head")).toHaveText("trampolim.py");
  await expect(peca.locator(".viz-line").first()).toContainText("def soma_passo(nums, acc=0):");
  expect(await alturaEstavel(codigo)).toBeGreaterThan(150);
  // Premissa medida: com o código à mostra a peça pede 1.278px de um orçamento
  // de 816. Recolher não é capricho.
  expect(await alturaEstavel(peca)).toBeGreaterThan(await orcamento(page));
});

test("a escolha de mostrar o código do trampolim sobrevive à troca da lista", async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(URL);
  await preparar(page);
  const peca = page.locator("article figure.viz").nth(2);

  await peca.getByRole("button", { name: "Mostrar código" }).click();
  await expect(peca).toHaveAttribute("data-codigo", "on");

  // "Sete números" muda o tamanho da lista, que é o que está no `measureOn`:
  // a linha do tempo vai de 11 para 17 passos e a medição roda de novo.
  await peca.getByRole("button", { name: "Sete números" }).click();
  await expect(peca.locator(".viz-step")).toHaveText("passo 1 de 17");
  await expect(peca.locator(".viz-cell")).toHaveCount(7);

  for (let k = 0; k < 6; k++) {
    await expect(peca).toHaveAttribute("data-codigo", "on");
    await expect(peca.getByRole("button", { name: "Ocultar código" })).toBeVisible();
    await page.waitForTimeout(120);
  }

  expect(await alturaEstavel(peca)).toBeGreaterThan(await orcamento(page));
});
