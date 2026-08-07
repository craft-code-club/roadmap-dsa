import { test, expect, type Page, type Locator } from "@playwright/test";

// A casca adaptativa do merge sort.
//
// A página tem TRÊS `figure.viz` (o visualizador principal, o desenho do
// n log n e o comparador de estabilidade), e os três usam as mesmas classes com
// sentidos diferentes: `.viz-step` casa 3 na página, `.ms-niveis` casa 2,
// `.bigo-stat` casa 8. Por isso todo seletor daqui sai da FIGURA, nunca da
// página — um `page.locator(".viz-step")` devolveria "3 rodadas de intercalação
// x 8 elementos = 24 movimentos", que não é passo nenhum.

const SLACK = 8;

// As TRÊS figuras da página estão na casca agora. `figure.viz-fit` casava 1 e
// passou a casar 3, então o seletor precisa de um discriminante: só o
// visualizador principal tem bloco recolhível, e é o `.viz-code-slot` que diz
// isso — ele existe porque a peça É recolhível, enquanto o conteúdo dentro dele
// é o que um dia pode virar condicional.
const PRINCIPAL = "article figure.viz-fit:has(.viz-code-slot)";

/** O visualizador principal, o único dos três com bloco de código. */
function figura(page: Page): Locator {
  return page.locator(PRINCIPAL);
}

/** As duas peças sem linha do tempo, pelo rótulo do cabeçalho. */
function muda(page: Page, titulo: string): Locator {
  return page.locator("article figure.viz-fit").filter({ hasText: titulo });
}

async function abrir(page: Page, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto("/topico/merge-sort/");
  const vp = page.viewportSize();
  expect(vp).toEqual({ width: w, height: h });
  await page.evaluate(() => document.fonts.ready);
  const fig = figura(page);
  await expect(fig).toHaveCount(1);
  // a decisão da medição já aconteceu quando `data-anim` volta para "on"
  await expect(fig).toHaveAttribute("data-anim", "on");
  return fig;
}

/** Altura da figura depois que a transição de 0,32s passou E ela parou de mexer. */
async function alturaEstavel(page: Page): Promise<number> {
  await page.waitForTimeout(450);
  let iguais = 0;
  let ultimo = -1;
  for (let i = 0; i < 60; i++) {
    const v = await page.evaluate((sel) => {
      const f = document.querySelector(sel) as HTMLElement;
      return Math.round(f.getBoundingClientRect().height);
    }, PRINCIPAL);
    if (v === ultimo) iguais++;
    else {
      iguais = 1;
      ultimo = v;
    }
    if (iguais >= 3) return v;
    await page.waitForTimeout(50);
  }
  throw new Error("a altura não estabilizou");
}

/** Lê rótulo e valor do MESMO cartão de estatística. */
async function ficha(fig: Locator, rotulo: string): Promise<string> {
  const cartao = fig.locator(".bigo-stat").filter({ hasText: rotulo });
  await expect(cartao).toHaveCount(1);
  return (await cartao.locator("strong").textContent())!.trim();
}

async function andar(fig: Locator, vezes: number) {
  const prox = fig.getByRole("button", { name: "Próximo ›" });
  for (let i = 0; i < vezes; i++) await prox.click();
}

async function preset(fig: Locator, nome: string) {
  await fig.getByRole("button", { name: nome }).click();
}

test.describe("merge sort · casca adaptativa", () => {
  test("as três figuras da página estão na casca, e o seletor pega só a minha", async ({ page }) => {
    await abrir(page, 1512, 900);
    // se algum destes números mudar, todo seletor escopado deste arquivo
    // precisa de revisão: `figure.viz-fit` já casou 1 e hoje casa 3
    await expect(page.locator("article figure.viz")).toHaveCount(3);
    await expect(page.locator("article figure.viz-fit")).toHaveCount(3);
    await expect(page.locator("article .viz-step")).toHaveCount(3);
    // o discriminante do principal é o bloco recolhível, e ele é único
    await expect(page.locator(PRINCIPAL)).toHaveCount(1);
    await expect(page.locator("article .viz-code-slot")).toHaveCount(1);
    const fig = figura(page);
    await expect(fig.locator(".viz-step")).toHaveCount(1);
    await expect(fig.locator(".viz-step")).toHaveText(/^passo \d+ de \d+$/);
    await expect(fig.locator(".ms-niveis")).toHaveCount(1);
    await expect(fig.locator(".bigo-stat")).toHaveCount(4);
  });

  test("painel: o cabeçalho e os controles ficam parados enquanto o miolo rola", async ({ page }) => {
    const fig = await abrir(page, 1512, 900);
    await fig.getByRole("button", { name: "⤢ Expandir" }).click();
    const painel = page.locator(".viz-overlay-fit figure.viz-fit");
    await expect(painel).toBeVisible();

    // o pico da sobra do miolo desta peça está no MEIO da animação: é onde o
    // painel de intercalação existe. No passo 1 e no último ele nem é desenhado.
    await andar(painel, 10);
    await expect(painel.locator(".viz-step")).toHaveText("passo 11 de 79");
    await expect(painel.locator(".ms-merge")).toHaveCount(1);

    const antes = await page.evaluate(() => {
      const f = document.querySelector(".viz-overlay-fit figure.viz-fit") as HTMLElement;
      const b = f.querySelector(".viz-body") as HTMLElement;
      // o click() do Playwright rola o contêiner para alcançar o alvo: zerar
      // aqui é o que impede de medir a rolagem que o próprio teste causou
      f.scrollTop = 0;
      b.scrollTop = 0;
      return {
        sobraMiolo: b.scrollHeight - b.clientHeight,
        sobraFigura: f.scrollHeight - f.clientHeight,
        head: f.querySelector(".viz-head")!.getBoundingClientRect().top,
        foot: f.querySelector(".viz-foot")!.getBoundingClientRect().top,
        play: [...f.querySelectorAll("button")]
          .find((b2) => /Rodar|Pausar/.test(b2.textContent ?? ""))!
          .getBoundingClientRect().y,
      };
    });

    // pré-condições: sem sobra não há o que rolar, e o teste vira decoração
    expect(antes.sobraMiolo).toBeGreaterThan(SLACK);
    expect(antes.sobraFigura).toBeLessThanOrEqual(SLACK);

    const depois = await page.evaluate(() => {
      const f = document.querySelector(".viz-overlay-fit figure.viz-fit") as HTMLElement;
      const b = f.querySelector(".viz-body") as HTMLElement;
      b.scrollTop = b.scrollHeight;
      return {
        rolouMiolo: b.scrollTop,
        rolouFigura: f.scrollTop,
        head: f.querySelector(".viz-head")!.getBoundingClientRect().top,
        foot: f.querySelector(".viz-foot")!.getBoundingClientRect().top,
        play: [...f.querySelectorAll("button")]
          .find((b2) => /Rodar|Pausar/.test(b2.textContent ?? ""))!
          .getBoundingClientRect().y,
      };
    });

    // quem rolou foi o MIOLO, e não a figura
    expect(depois.rolouMiolo).toBeGreaterThan(0);
    expect(depois.rolouFigura).toBe(0);
    // a promessa da camada 1 é "parado": a posição comparada com ela mesma.
    // `toBeInViewport()` sozinho passa nas duas pontas da rolagem e aprovaria
    // o rodapé de volta dentro do miolo.
    expect(Math.abs(depois.head - antes.head)).toBeLessThanOrEqual(2);
    expect(Math.abs(depois.foot - antes.foot)).toBeLessThanOrEqual(2);
    expect(Math.abs(depois.play - antes.play)).toBeLessThanOrEqual(2);
    await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeInViewport({ ratio: 1 });
  });

  test("tela baixa: o botão diz Mostrar código e o bloco está recolhido", async ({ page }) => {
    const fig = await abrir(page, 1512, 900);
    await expect(fig).toHaveAttribute("data-codigo", "off");
    await expect(fig.getByRole("button", { name: /código/ })).toHaveText("Mostrar código");
    await expect(fig.getByRole("button", { name: /código/ })).toHaveAttribute("aria-expanded", "false");

    // recolher tem que tirar ALTURA, não só largura da coluna do grid: zerar a
    // trilha da coluna deixaria rótulo e `data-codigo` certos e a peça igual
    const slot = await fig.locator(".viz-code-slot").evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(slot).toBeLessThan(SLACK);

    const recolhida = await alturaEstavel(page);
    // premissa: com o código à mostra a peça não caberia — é o que justifica a camada 3
    await fig.getByRole("button", { name: "Mostrar código" }).click();
    const aberta = await alturaEstavel(page);
    expect(aberta - recolhida).toBeGreaterThan(300);
    expect(aberta).toBeGreaterThan(900 - 60 - 24);
  });

  test("tela alta: o bloco já vem aberto, e quem decide é a medição", async ({ page }) => {
    const fig = await abrir(page, 1512, 1700);
    await expect(fig).toHaveAttribute("data-codigo", "on");
    await expect(fig.getByRole("button", { name: /código/ })).toHaveText("Ocultar código");
    const slot = await fig.locator(".viz-code-slot").evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(slot).toBeGreaterThan(300);
    // e o Python está mesmo lá dentro
    await expect(fig.locator(".viz-code-head")).toHaveText("merge_sort.py");
    await expect(fig.locator(".viz-line")).toHaveCount(15);
  });

  test("a escolha do aluno vence a medição e sobrevive à troca de preset", async ({ page }) => {
    const fig = await abrir(page, 1512, 900);
    await expect(fig).toHaveAttribute("data-codigo", "off");
    await fig.getByRole("button", { name: "Mostrar código" }).click();
    await expect(fig).toHaveAttribute("data-codigo", "on");

    // o preset é o que está em `measureOn`: trocá-lo PEDE medição nova, e a
    // medição, sozinha, mandaria recolher nesta janela
    await preset(fig, "Já ordenado: 1 2 3 4 5 6 7 8");
    expect(await ficha(fig, "tamanho do array")).toBe("8");

    // asserção ANTES da premissa: com a quebra aplicada a peça recolhe e
    // encolhe, e a premissa "não cabe" viraria falsa antes da asserção rodar
    for (let i = 0; i < 9; i++) {
      await expect(fig).toHaveAttribute("data-codigo", "on");
      await page.waitForTimeout(100);
    }
    await expect(fig.getByRole("button", { name: /código/ })).toHaveText("Ocultar código");

    const aberta = await alturaEstavel(page);
    expect(aberta).toBeGreaterThan(900 - 60 - 24);
  });

  test("painel: setas e espaço andam a animação, e o slider fica com a seta dele", async ({ page }) => {
    const fig = await abrir(page, 1512, 900);
    await fig.getByRole("button", { name: "⤢ Expandir" }).click();
    const painel = page.locator(".viz-overlay-fit figure.viz-fit");
    await expect(painel).toBeVisible();
    // `toBeVisible()` prova que o portal montou, não que o listener de keydown
    // já existe: ele nasce num efeito passivo. O foco entrar no painel é a
    // pré-condição que prova o contrário, porque o efeito do foco é declarado
    // antes do efeito do teclado.
    await expect
      .poll(() => page.evaluate(() => !!document.activeElement?.closest(".viz-overlay-fit")))
      .toBe(true);

    await expect(painel.locator(".viz-step")).toHaveText("passo 1 de 79");
    // uma tecla só, repetida: um par ida-e-volta fica verde com o roubo aplicado
    await page.keyboard.press("ArrowRight");
    await expect(painel.locator(".viz-step")).toHaveText("passo 2 de 79");
    await page.keyboard.press("ArrowRight");
    await expect(painel.locator(".viz-step")).toHaveText("passo 3 de 79");
    await page.keyboard.press("ArrowLeft");
    await expect(painel.locator(".viz-step")).toHaveText("passo 2 de 79");
    await page.keyboard.press(" ");
    await expect(painel.getByRole("button", { name: "❚❚ Pausar" })).toBeVisible();
    await page.keyboard.press(" ");
    await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();

    // com o cursor no slider, a seta é do slider: campo em edição manda
    const slider = painel.locator("input[type=range]");
    await expect(slider).toHaveCount(1);
    await slider.focus();
    await expect(painel.locator(".viz-speed .val")).toHaveText("1.5x");
    const passoAntes = await painel.locator(".viz-step").textContent();
    await page.keyboard.press("ArrowLeft");
    await expect(painel.locator(".viz-speed .val")).toHaveText("1x");
    await expect(painel.locator(".viz-step")).toHaveText(passoAntes!);
  });

  test("a marcha de abertura é 1.5x, não o 1x padrão do hook", async ({ page }) => {
    const fig = await abrir(page, 1512, 900);
    await fig.getByRole("button", { name: "⤢ Expandir" }).click();
    const painel = page.locator(".viz-overlay-fit figure.viz-fit");
    await expect(painel.locator(".viz-speed .val")).toHaveText("1.5x");
    await expect(painel.locator("input[type=range]")).toHaveValue("4");
  });

  test("o mapa da recursão tem log2(n) níveis, e 7 e 8 elementos caem no mesmo degrau", async ({ page }) => {
    const fig = await abrir(page, 1512, 900);

    // rótulo e valor lidos do MESMO cartão, nos dois presets
    expect(await ficha(fig, "tamanho do array")).toBe("7");
    expect(await ficha(fig, "níveis de recursão")).toBe("4");
    await expect(fig.locator(".ms-nivel")).toHaveCount(4);
    await expect(fig.locator(".ms-nivel-rot").first()).toHaveText("nível 0");
    await expect(fig.locator(".ms-nivel-rot").last()).toHaveText("nível 3");
    const alt7 = await fig.locator(".ms-niveis").evaluate((el) => Math.round(el.getBoundingClientRect().height));

    await preset(fig, "Já ordenado: 1 2 3 4 5 6 7 8");
    expect(await ficha(fig, "tamanho do array")).toBe("8");
    // a altura da árvore é degrau: um elemento a mais NÃO compra um nível aqui
    expect(await ficha(fig, "níveis de recursão")).toBe("4");
    await expect(fig.locator(".ms-nivel")).toHaveCount(4);
    const alt8 = await fig.locator(".ms-niveis").evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(alt8).toBe(alt7);
  });

  test("a intercalação só é desenhada quando há dois lados prontos, e é ela que move a altura", async ({ page }) => {
    const fig = await abrir(page, 1512, 900);

    // passo 1: o algoritmo ainda vai descer, e não há o que intercalar
    await expect(fig.locator(".viz-step")).toHaveText("passo 1 de 79");
    await expect(fig.locator(".ms-merge")).toHaveCount(0);
    const semMerge = await alturaEstavel(page);

    await andar(fig, 10);
    await expect(fig.locator(".viz-step")).toHaveText("passo 11 de 79");
    await expect(fig.locator(".ms-merge")).toHaveCount(1);
    // os três lados, com o rótulo que explica cada um
    await expect(fig.locator(".ms-lado-rot")).toHaveText(["esquerda", "direita", "buffer de saída"]);
    const comMerge = await alturaEstavel(page);

    // o painel de intercalação é o eixo de altura desta peça: ele aparece e
    // some no meio da animação, e o passo 1 (como o último) mostra a peça baixa
    expect(comMerge - semMerge).toBeGreaterThan(100);
  });

  test("o contador de comparações confere com o que a legenda promete", async ({ page }) => {
    const fig = await abrir(page, 1512, 900);
    await preset(fig, "Já ordenado: 1 2 3 4 5 6 7 8");
    await andar(fig, 92);
    await expect(fig.locator(".viz-step")).toHaveText("passo 93 de 93");
    expect(await ficha(fig, "comparações")).toBe("12");
    expect(await ficha(fig, "cópias para o buffer")).toBe("24");

    await preset(fig, "Pior caso: 1 3 2 7 4 6 5 8");
    await expect(fig.locator(".viz-step")).toHaveText("passo 1 de 93");
    await andar(fig, 92);
    expect(await ficha(fig, "comparações")).toBe("17");
    expect(await ficha(fig, "cópias para o buffer")).toBe("24");
  });
});

// ---------------------------------------------------------------------------
// As duas peças que vestiam `figure.viz` sem nada da casca: mesma moldura do
// visualizador principal, sem botão Expandir, sem diálogo, sem trava de
// rolagem, sem Esc e sem foco. O aluno via duas peças mudas para uma que
// expandia, aprendia que o botão não existe e parava de procurar.
//
// Elas entram com `total: 1` e `collapsible: false`: não têm passo a passo nem
// bloco dispensável, então da casca elas usam o que lhes cabe — o painel com o
// cabeçalho parado enquanto o miolo rola. Sem rodapé, o controle cuja posição
// carrega o sentido da camada 1 é o `✕ Fechar`, que é a saída do diálogo.
//
// Réguas medidas antes de escrever (artigo, altura da peça):
//   · MergeSortNiveis  911..1037 (1512x900), 925..1051 (1440x700), 1351..1477 (390x844)
//   · MergeEmpate      1077..1213, 1077..1213, 1964..2214
// e a sobra do miolo no painel a 1440x600: 274 e 500px. A 1512x900 o
// MergeSortNiveis sobra 0 — teste de rolagem ali seria decoração verde.
// ---------------------------------------------------------------------------

const TITULO_NIVEIS = "o n log n desenhado: altura vezes largura";
const TITULO_EMPATE = "o sinal que decide a estabilidade";

async function abrirPainel(page: Page, fig: Locator): Promise<Locator> {
  await fig.getByRole("button", { name: "⤢ Expandir" }).click();
  const painel = page.locator(".viz-overlay-fit figure.viz-fit");
  await expect(painel).toBeVisible();
  // `toBeVisible()` não é "pronto para o teclado": o listener de keydown nasce
  // num efeito passivo, no mesmo commit que traz o foco para a figura. Esperar
  // o foco chegar é a pré-condição que prova que aquele commit já rodou.
  await expect(painel).toBeFocused();
  return painel;
}

/** Camada 1 numa peça SEM rodapé: quem não pode andar é o cabeçalho e o ✕ Fechar. */
async function provarCamada1(painel: Locator) {
  // --- pré-condições: a situação que o teste afirma existe mesmo ---
  await expect(painel.locator(".viz-foot"), "esta peça não tem rodapé").toHaveCount(0);
  const fechar = painel.getByRole("button", { name: "✕ Fechar" });
  await expect(fechar).toHaveCount(1);

  const antes = await painel.evaluate((f) => {
    const b = f.querySelector(".viz-body") as HTMLElement;
    // o click() do Playwright ROLA o contêiner para alcançar o alvo: zerar aqui
    // é o que impede de medir a rolagem que o próprio teste causou
    f.scrollTop = 0;
    b.scrollTop = 0;
    const x = [...f.querySelectorAll("button")].find((n) => /Fechar/.test(n.textContent ?? ""))!;
    return {
      sobraMiolo: b.scrollHeight - b.clientHeight,
      sobraFigura: f.scrollHeight - f.clientHeight,
      head: f.querySelector(".viz-head")!.getBoundingClientRect().y,
      fechar: x.getBoundingClientRect().y,
    };
  });
  expect(antes.sobraMiolo, "o miolo precisa estourar para haver o que rolar").toBeGreaterThan(SLACK);
  expect(antes.sobraFigura, "a figura não pode ter sobra própria").toBeLessThanOrEqual(SLACK);

  // --- a ação: rolar o MIOLO até o fim ---
  const depois = await painel.evaluate((f) => {
    const b = f.querySelector(".viz-body") as HTMLElement;
    b.scrollTop = b.scrollHeight;
    const x = [...f.querySelectorAll("button")].find((n) => /Fechar/.test(n.textContent ?? ""))!;
    return {
      rolouMiolo: b.scrollTop,
      rolouFigura: f.scrollTop,
      head: f.querySelector(".viz-head")!.getBoundingClientRect().y,
      fechar: x.getBoundingClientRect().y,
    };
  });
  expect(depois.rolouMiolo, "quem rolou tem que ser o miolo").toBeGreaterThan(0);
  expect(depois.rolouFigura, "a figura não pode rolar").toBe(0);

  // --- as asserções que carregam o sentido: posição comparada com ela mesma ---
  // `toBeInViewport()` sozinho passa nas DUAS pontas da rolagem e aprovaria a
  // quebra canônica; ele entra só como complemento.
  expect(Math.abs(depois.head - antes.head), "o cabeçalho andou junto com o miolo").toBeLessThanOrEqual(2);
  expect(Math.abs(depois.fechar - antes.fechar), "o ✕ Fechar andou junto com o miolo").toBeLessThanOrEqual(2);
  await expect(fechar).toBeInViewport({ ratio: 1 });
}

test.describe("merge sort · as duas peças sem linha do tempo", () => {
  test("as três peças anunciam o mesmo botão, e cada rótulo diz o que a peça mostra", async ({ page }) => {
    await abrir(page, 1512, 900);
    // a afordância é a mesma nas três: era 1 Expandir para 3 figuras iguais
    await expect(page.getByRole("button", { name: "⤢ Expandir" })).toHaveCount(3);

    // rótulo e valor no mesmo locator, um por figura — comportamento certo com
    // rótulo errado ensina errado do mesmo jeito
    const niveis = muda(page, TITULO_NIVEIS);
    const empate = muda(page, TITULO_EMPATE);
    await expect(niveis).toHaveCount(1);
    await expect(empate).toHaveCount(1);
    await expect(niveis.locator(".viz-step")).toHaveCount(1);
    await expect(empate.locator(".viz-step")).toHaveCount(1);
    await expect(niveis.locator(".viz-step")).toHaveText(
      "4 rodadas de intercalação x 16 elementos = 64 movimentos"
    );
    await expect(empate.locator(".viz-step")).toHaveText("as duas versões se separam na decisão 2");
  });

  test("nenhuma das duas promete esconder um bloco que ela não tem", async ({ page }) => {
    await abrir(page, 1512, 900);
    for (const titulo of [TITULO_NIVEIS, TITULO_EMPATE]) {
      const fig = muda(page, titulo);
      await expect(fig.locator(".viz-code-slot"), `${titulo}: não há bloco recolhível`).toHaveCount(0);
      await expect(fig.locator(".viz-toggle-codigo")).toHaveCount(0);
      await expect(fig.getByRole("button", { name: /código/ })).toHaveCount(0);
      // e sem linha do tempo não há reprodução nenhuma para prometer
      await expect(fig.locator(".viz-foot")).toHaveCount(0);
      await expect(fig.locator(".viz-atalhos")).toHaveCount(0);
      await expect(fig.getByRole("button", { name: /Rodar|Próximo|Anterior/ })).toHaveCount(0);
      await expect(fig.locator(".viz-step")).not.toHaveText(/passo \d+ de \d+/);
    }
  });

  test("o mapa de níveis: o cabeçalho e o ✕ Fechar ficam parados enquanto o miolo rola", async ({ page }) => {
    await abrir(page, 1440, 600);
    const painel = await abrirPainel(page, muda(page, TITULO_NIVEIS));
    await provarCamada1(painel);
  });

  test("o comparador de empate: o cabeçalho e o ✕ Fechar ficam parados enquanto o miolo rola", async ({ page }) => {
    await abrir(page, 1440, 600);
    const painel = await abrirPainel(page, muda(page, TITULO_EMPATE));
    await provarCamada1(painel);
  });

  test("o painel é um diálogo de verdade: foco, Tab preso, Esc e rolagem travada", async ({ page }) => {
    await abrir(page, 1440, 600);
    const painel = await abrirPainel(page, muda(page, TITULO_EMPATE));

    const overlay = page.locator(".viz-overlay-fit");
    await expect(overlay).toHaveAttribute("role", "dialog");
    await expect(overlay).toHaveAttribute("aria-modal", "true");
    // o rótulo do diálogo é o título DESTA peça, não um genérico
    await expect(overlay).toHaveAttribute("aria-label", "Visualizador · o sinal que decide a estabilidade");
    // a página atrás fica travada: quem rola é o painel
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");

    // Tab circula DENTRO: sem trava, o foco cairia no <body> e seguiria para os
    // links do cabeçalho do site. Voltas suficientes para duas passadas.
    const fugas: string[] = [];
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press("Tab");
      const onde = await page.evaluate(() => {
        const a = document.activeElement;
        const f = document.querySelector(".viz-overlay-fit figure.viz-fit");
        return { dentro: !!(f && a && f.contains(a)), quem: a?.className || a?.tagName || "?" };
      });
      if (!onde.dentro) fugas.push(`volta ${i + 1}: ${onde.quem}`);
    }
    expect(fugas, "o foco vazou do painel").toEqual([]);

    await page.keyboard.press("Escape");
    await expect(page.locator(".viz-overlay-fit")).toHaveCount(0);
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe("hidden");
  });

  test("no mapa de níveis o n É eixo de altura: cada dobra acrescenta uma faixa", async ({ page }) => {
    await abrir(page, 1512, 900);
    const fig = muda(page, TITULO_NIVEIS);
    const cartao = (rot: string) => fig.locator(".bigo-stat").filter({ hasText: rot }).locator("strong");
    const altura = () => fig.evaluate((f) => Math.round(f.getBoundingClientRect().height));

    // O `.ms-niveis` do visualizador principal mede 163px constantes nos quatro
    // presets, porque 7 e 8 elementos caem no mesmo degrau de log2. Aqui o mesmo
    // desenho tem um controle que ATRAVESSA três degraus, e aí ele é eixo.
    const medidas: number[] = [];
    for (const [n, faixas] of [
      ["8", 4],
      ["16", 5],
      ["32", 6],
      ["64", 7],
    ] as const) {
      await fig.getByRole("button", { name: `n = ${n}`, exact: true }).click();
      await expect(fig.locator(".ms-nivel")).toHaveCount(faixas);
      // rótulo e valor do MESMO cartão
      await expect(cartao("tamanho do array")).toHaveText(n);
      await expect(cartao("rodadas de intercalação")).toHaveText(String(faixas - 1));
      medidas.push(await altura());
    }
    // uma faixa a mais por dobra, e a peça cresce o mesmo tanto a cada degrau
    const passos = medidas.slice(1).map((v, i) => v - medidas[i]);
    expect(passos, `alturas medidas: ${medidas.join(", ")}`).toEqual([passos[0], passos[0], passos[0]]);
    expect(passos[0]).toBeGreaterThan(20);
  });
});
