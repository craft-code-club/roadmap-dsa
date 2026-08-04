import { test, expect, type Page, type Locator } from "@playwright/test";

// ---------------------------------------------------------------------------
// A casca adaptativa nos três visualizadores interativos de `arrays`.
//
// Nada aqui conta elemento: já passaram por uma suíte verde neste repo um
// visualizador sem botão nenhum e um painel de 0px. Todo teste mede
// COMPORTAMENTO (a peça rolou? o botão continua na tela? a tecla foi para o
// campo?) e lê o RÓTULO ao lado do número — comportamento certo com rótulo
// errado ensina errado do mesmo jeito.
//
// Duas asserções existem só para o teste não ser vazio, e são tão importantes
// quanto as outras: "o miolo REALMENTE rolou" antes de conferir que o cabeçalho
// não se mexeu, e "o painel REALMENTE abriu" antes de medir dentro dele.
// ---------------------------------------------------------------------------

const ARRAYS = "/topico/arrays/";

const VIZ = [
  { nome: "memória contígua", titulo: /memória contígua e o endereço de nums\[i\]/ },
  { nome: "operações", titulo: /o que cada operação custa de verdade/ },
  { nome: "array dinâmico", titulo: /o array dinâmico crescendo sozinho/ },
] as const;

/** A figura no fluxo do artigo. Expandida ela vai para um portal no `body`. */
function figuraInline(page: Page, titulo: RegExp): Locator {
  return page.locator("article figure.viz").filter({ hasText: titulo });
}

function figuraExpandida(page: Page): Locator {
  return page.locator(".viz-overlay figure.viz");
}

/** As fontes chegam com `display: swap`: medir antes é medir o fallback. */
async function pagina(page: Page, altura = 900) {
  await page.setViewportSize({ width: 1512, height: altura });
  await page.goto(ARRAYS);
  await page.evaluate(() => document.fonts.ready);
}

async function expandir(page: Page, titulo: RegExp): Promise<Locator> {
  await figuraInline(page, titulo).getByRole("button", { name: /Expandir/ }).click();
  const painel = figuraExpandida(page);
  await expect(painel).toHaveCount(1);
  await expect(painel.getByRole("button", { name: /Fechar/ })).toBeVisible();
  return painel;
}

/** Lê "passo 4 de 8" e devolve [4, 8]. Lê o RÓTULO, não só o número. */
async function passo(fig: Locator): Promise<[number, number]> {
  const texto = (await fig.locator(".viz-step").innerText()).trim();
  const m = texto.match(/^passo (\d+) de (\d+)$/);
  expect(m, `contador fora do formato "passo N de M": ${JSON.stringify(texto)}`).not.toBeNull();
  return [Number(m![1]), Number(m![2])];
}

// ---------------------------------------------------------------------------

for (const { nome, titulo } of VIZ) {
  test(`${nome}: no expandido o cabeçalho e os controles não saem da tela`, async ({ page }) => {
    // Janela baixa de propósito: é a única forma de o miolo ter o que rolar, e
    // sem rolagem de verdade este teste não testaria nada.
    await pagina(page, 560);
    const painel = await expandir(page, titulo);
    // A transição do recolhimento dura 0,32s: ler no meio dela mede o layout a
    // caminho, e a comparação "não se mexeu" ficaria contra um alvo instável.
    await page.waitForTimeout(600);
    const miolo = painel.locator(".viz-body");
    const cabeca = painel.locator(".viz-head");
    const rodar = painel.getByRole("button", { name: /Rodar|Pausar/ });

    const antes = { cabeca: await cabeca.boundingBox(), rodar: await rodar.boundingBox() };

    await miolo.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    const rolou = await miolo.evaluate((el) => el.scrollTop);
    expect(rolou, "o miolo precisava ter rolado para o teste valer algo").toBeGreaterThan(0);

    // "Está parado agora" não é "continua parado": amostra ao longo do tempo.
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(80);
      expect(await cabeca.boundingBox()).toEqual(antes.cabeca);
      const r = (await rodar.boundingBox())!;
      expect(r).toEqual(antes.rodar);
      expect(r.y, "o ▶ Rodar saiu por cima da janela").toBeGreaterThanOrEqual(0);
      expect(r.y + r.height, "o ▶ Rodar saiu por baixo da janela").toBeLessThanOrEqual(560);
    }
    // E o botão continua clicável de onde está, não só desenhado ali.
    await rodar.click();
    await expect(painel.getByRole("button", { name: /Pausar/ })).toBeVisible();
  });

  test(`${nome}: em tela de notebook o código recolhe e o botão diz o que faz`, async ({ page }) => {
    await pagina(page, 900);
    const fig = figuraInline(page, titulo);
    const botao = fig.getByRole("button", { name: /código/ });

    await expect(botao).toHaveText("Mostrar código");
    await expect(botao).toHaveAttribute("aria-expanded", "false");
    await expect(fig).toHaveAttribute("data-codigo", "off");

    // Recolhido é recolhido de verdade: o bloco perdeu a altura, e não só a
    // largura (zerar a trilha da coluna deixava 374px de linha de grid em pé).
    const alturaOculta = await fig.locator(".viz-code-slot").evaluate((el) => el.getBoundingClientRect().height);
    expect(alturaOculta).toBeLessThan(8);

    await botao.click();
    await expect(botao).toHaveText("Ocultar código");
    await expect(fig).toHaveAttribute("data-codigo", "on");
    await expect
      .poll(() => fig.locator(".viz-code-slot").evaluate((el) => el.getBoundingClientRect().height))
      .toBeGreaterThan(40);
    // O código voltou legível, não só alto.
    await expect(fig.locator(".viz-code-head")).toHaveText(/\.py$/);
  });

  test(`${nome}: em tela alta o código já vem à mostra`, async ({ page }) => {
    await pagina(page, 1700);
    const fig = figuraInline(page, titulo);
    await expect(fig).toHaveAttribute("data-codigo", "on");
    await expect(fig.getByRole("button", { name: /código/ })).toHaveText("Ocultar código");
    // A peça inteira cabe na janela: é essa a régua que o hook usa no artigo.
    const cabe = await fig.evaluate((f) => {
      const h = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ccc-header-h")) || 60;
      return f.getBoundingClientRect().height <= window.innerHeight - h - 24;
    });
    expect(cabe, "em 1700px de altura a peça com o código aberto tinha que caber").toBe(true);
  });

  test(`${nome}: a marcha do rodapé é do slider, não da animação`, async ({ page }) => {
    await pagina(page, 900);
    const painel = await expandir(page, titulo);
    const marcha = painel.locator(".viz-speed input[type=range]");
    const rotulo = painel.locator(".viz-speed .val");

    const [passoAntes] = await passo(painel);
    const marchaAntes = await rotulo.innerText();

    await marcha.focus();
    await page.keyboard.press("ArrowRight");

    // A seta foi para o slider: a marcha subiu…
    await expect(rotulo).not.toHaveText(marchaAntes);
    // …e a animação NÃO andou. Sequestrar a tecla de quem edita é pior que
    // não ter atalho nenhum.
    const [passoDepois] = await passo(painel);
    expect(passoDepois).toBe(passoAntes);
  });
}

test("operações: as setas e o espaço dirigem a animação no expandido", async ({ page }) => {
  await pagina(page, 900);
  const painel = await expandir(page, VIZ[1].titulo);

  const [inicio, total] = await passo(painel);
  expect(total).toBeGreaterThan(3);

  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => (await passo(painel))[0]).toBe(inicio + 1);
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => (await passo(painel))[0]).toBe(inicio + 2);
  await page.keyboard.press("ArrowLeft");
  await expect.poll(async () => (await passo(painel))[0]).toBe(inicio + 1);

  // Espaço roda: o rótulo do botão passa a dizer "Pausar", que é o que muda.
  await page.keyboard.press("Space");
  await expect(painel.getByRole("button", { name: /Pausar/ })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(painel.getByRole("button", { name: /Rodar/ })).toBeVisible();
});

test("operações: com o cursor no campo, o espaço é espaço e a seta é cursor", async ({ page }) => {
  await pagina(page, 900);
  const painel = await expandir(page, VIZ[1].titulo);
  const campo = painel.getByRole("textbox").first();

  await campo.focus();
  const [passoAntes] = await passo(painel);
  await page.keyboard.press("ArrowRight");
  expect((await passo(painel))[0], "a seta andou a animação com o cursor no campo").toBe(passoAntes);

  // `End` não leva o cursor ao fim de um input no macOS: comparo o valor com
  // ele mesmo em vez de olhar onde o caractere caiu.
  const valorAntes = await campo.inputValue();
  await page.keyboard.press("Space");
  await expect
    .poll(() => campo.inputValue())
    .toHaveLength(valorAntes.length + 1);
  await expect(painel.getByRole("button", { name: /Rodar/ }), "o espaço rodou a animação em vez de digitar").toBeVisible();
});

test("operações: a escolha de mostrar o código sobrevive a trocar de operação", async ({ page }) => {
  await pagina(page, 900);
  const fig = figuraInline(page, VIZ[1].titulo);
  const botao = fig.getByRole("button", { name: /código/ });

  await expect(botao).toHaveText("Mostrar código");   // a medição decidiu
  await botao.click();                                // o aluno decidiu o contrário
  await expect(botao).toHaveText("Ocultar código");

  // Trocar de operação troca o código junto (2 a 6 linhas) e pede medição nova:
  // é exatamente o momento em que a escolha do aluno era desfeita.
  await fig.getByRole("button", { name: "remover a posição k", exact: true }).click();
  await expect(fig.locator(".viz-code-body")).toContainText("def remover(nums, n, k):");
  await expect(botao, "a medição desfez a escolha do aluno").toHaveText("Ocultar código");
  await expect(fig).toHaveAttribute("data-codigo", "on");
});

test("memória contígua: clicar numa célula muda o índice, o endereço e a conta", async ({ page }) => {
  await pagina(page, 900);
  const fig = figuraInline(page, VIZ[0].titulo);

  await fig.getByRole("button", { name: "Índice 6, valor 31, endereço 0x1018" }).click();

  // O rótulo ao lado do número, não só o número: base + 6 × 4 = 0x1018.
  await expect(fig.locator(".arr-formula")).toHaveText(/nums\[6\] = 0x1000 \+ 6 × 4 = 0x1018/);
  await expect(fig.locator(".viz-var").filter({ hasText: "endereço" })).toContainText("0x1018");
  expect((await passo(fig))[0]).toBe(7);
  await expect(fig.locator(".viz-note")).toContainText("multiplico 6 × 4 = 24 bytes");
});

test("memória contígua: o mapa de linhas de cache diz qual linha foi lida", async ({ page }) => {
  await pagina(page, 900);
  const fig = figuraInline(page, VIZ[0].titulo);

  await expect(fig.locator(".arr-cache-mapa")).toHaveCount(0);
  await fig.getByRole("button", { name: "20 inteiros" }).click();
  await expect(fig.getByRole("button", { name: /Linha de cache/ })).toHaveText("Linha de cache: visível");

  // 20 inteiros de 4 bytes a partir de 0x1000 ocupam 80 bytes: duas linhas de
  // 64, a segunda começando no índice 16 — que é onde o preset deixa o cursor.
  const cartoes = fig.locator(".arr-cache-linha");
  await expect(cartoes).toHaveCount(2);
  await expect(cartoes.nth(0)).toContainText("Linha de cache 0x1000");
  await expect(cartoes.nth(0)).toContainText("índices 0 a 15 · 16 de 20");
  await expect(cartoes.nth(1)).toContainText("· a que foi lida");
  await expect(cartoes.nth(1)).toContainText("índices 16 a 19 · 4 de 20");
  await expect(
    fig.locator(".bigo-stat").filter({ hasText: "Linhas de cache" }).locator("strong")
  ).toHaveText("2");
});

test("array dinâmico: dobrar copia menos que crescer de um em um", async ({ page }) => {
  await pagina(page, 900);
  const fig = figuraInline(page, VIZ[2].titulo);

  // O cartão da estratégia diz o custo médio por append: é o número que a
  // aula inteira existe para explicar, com o rótulo que o nomeia.
  const cartao = (nome: string) => fig.locator(".bigo-card").filter({ hasText: nome });
  await expect(cartao("dobrar (×2)")).toContainText("cópias");
  const dobrar = await cartao("dobrar (×2)").locator(".bigo-card-val").innerText();
  const umPorVez = await cartao("uma vaga por vez (+1)").locator(".bigo-card-val").innerText();
  expect(parseFloat(dobrar.replace(",", "."))).toBeLessThan(parseFloat(umPorVez.replace(",", ".")));
  await expect(cartao("capacidade reservada")).toContainText("0 realocações");
});

test("array dinâmico: a nota do fim explica a capacidade reservada em português", async ({ page }) => {
  await pagina(page, 900);
  const fig = figuraInline(page, VIZ[2].titulo);
  await fig.getByRole("button", { name: "capacidade reservada" }).click();

  const proximo = fig.getByRole("button", { name: /Próximo/ });
  for (let i = 0; i < 60 && (await proximo.isEnabled()); i++) await proximo.click();

  const [atual, total] = await passo(fig);
  expect(atual, "a animação não chegou ao último passo").toBe(total);
  await expect(fig.locator(".viz-note.ok")).toContainText(
    "reservar a capacidade certa é o único jeito de o append custar exatamente 1"
  );
});

test("memória contígua: dois cliques rápidos param na célula clicada por último", async ({ page }) => {
  // O clique repete mais depressa do que o React re-renderiza. Um salto escrito
  // como delta a partir do `idx` do closure (`stepBy(c.k - idx)`) lê o MESMO
  // `idx` velho nos dois cliques e soma os dois deltas: sair do índice 0, clicar
  // no 6 e no 2 levava ao 7 (6 + 2, saturado no fim do array) em vez do 2 — a
  // conta na tela passava a explicar uma célula que o aluno não pediu.
  await pagina(page, 900);
  const fig = figuraInline(page, VIZ[0].titulo);

  // A ORDEM é o teste: os dois cliques precisam sair do índice 0. Partindo da
  // própria célula o delta vale zero e a versão quebrada passaria verde.
  expect((await passo(fig))[0]).toBe(1);

  await fig.evaluate((f) => {
    const cel = (k: number) =>
      [...f.querySelectorAll("button")].find((b) =>
        (b.getAttribute("aria-label") ?? "").startsWith(`Índice ${k},`)
      ) as HTMLButtonElement;
    cel(6).click();
    cel(2).click();
  });

  // Rótulo junto do número nos três lugares que a peça ensina: o contador, a
  // conta do endereço e o painel de variáveis. 0x1000 + 2 × 4 = 0x1008.
  expect((await passo(fig))[0]).toBe(3);
  await expect(fig.locator(".arr-formula")).toHaveText(/nums\[2\] = 0x1000 \+ 2 × 4 = 0x1008/);
  await expect(fig.locator(".viz-var").filter({ hasText: "endereço" })).toContainText("0x1008");
  await expect(fig.getByRole("button", { name: "Índice 2, valor 45, endereço 0x1008" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
});
