import { test, expect, type Page, type Locator } from "@playwright/test";

// Casca adaptativa do visualizador de A*.
//
// Os números que decidiram o escopo, medidos com `document.fonts.ready`
// cumprido, a animação parada e andando os 514 estados (3 modos × 3 presets,
// de 13 a 119 passos cada) nas três réguas:
//
//   · no artigo (orçamento 816px a 1512x900): 1084–1123px antes, 766–805
//     depois. A peça passava do orçamento em TODOS os 514 estados; recolhida,
//     cabe em todos. Forçada aberta ela volta a 1114px — 10px a mais que os
//     1104 de antes, que é o custo do `.viz-foot` (contrato §9);
//   · no painel, quem rolava era a FIGURA (323px de sobra a 1512x900, 523 a
//     1440x700, 623 a 1440x600), levando cabeçalho e controles junto: rolando
//     até o fim o cabeçalho subia −323, −523 e −623px, e o `▶ Rodar` era
//     desenhado 222, 422 e 522px ABAIXO do pé visível da janela. Depois quem
//     rola é o miolo (0, 41 e 136px), o cabeçalho anda 0px e o `▶ Rodar` fica
//     131, 52 e 49px DENTRO da janela.
//
// O eixo da altura desta peça NÃO é a grade. A grade é gerada por código, mas
// as três dimensões dela são constantes deste arquivo (`COLS = 14`,
// `ROWS = 9`, `CELL = 26`), então o SVG mede 366x236 — igual ao `viewBox` — nos
// 514 estados e nas três janelas. Quem gera as linhas é a PROSA: a dica
// (18 ou 37px, conforme o preset) e a nota (22 ou 42px, conforme o passo).
// Por isso o passo do pico é onde a nota quebra em duas linhas, e no painel
// isso acontece num único estado dos 514: o ÚLTIMO passo do modo Guloso.

const SLACK = 8;
const GULOSO = "Guloso: f = h";
const ABERTO = "Campo aberto";
const MURO = "Um muro no meio";

function figura(page: Page): Locator {
  return page.locator("article figure.viz");
}

function painel(page: Page): Locator {
  return page.locator(".viz-overlay figure.viz");
}

/** O cabeçalho tem dois `.viz-step`: o contador da peça e o do hook. */
function passo(alvo: Locator): Locator {
  return alvo.locator(".viz-step", { hasText: "passo" });
}

function expandidas(alvo: Locator): Locator {
  return alvo.locator(".viz-step", { hasText: "expandidas" });
}

async function abrir(page: Page, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h });
  expect(page.viewportSize(), `a janela pedida foi ${w}x${h}`).toEqual({ width: w, height: h });
  await page.goto("/topicos/a-star/");
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

async function andarAte(alvo: Locator, n: number) {
  const proximo = alvo.getByRole("button", { name: "Próximo ›" });
  for (let i = 1; i < n; i++) await proximo.click();
}

/**
 * Altura que PAROU. Três leituras iguais não bastam nesta peça: a linha do grid
 * vale `max(bloco, painel de variáveis)`, então enquanto o bloco cresce por
 * baixo dos 172px do painel irmão a figura não se mexe. Medido: 13 quadros
 * idênticos em 860px numa transição cujo valor final é 1114. Por isso a
 * estabilidade só conta depois de a transição de 0,32s ter passado.
 */
async function alturaEstavel(alvo: Locator): Promise<number> {
  const page = alvo.page();
  await page.waitForTimeout(450);
  let iguais = 0;
  let ultima = -1;
  for (let i = 0; i < 60; i++) {
    const h = Math.round((await alvo.boundingBox())!.height);
    if (h === ultima) {
      if (++iguais >= 2) return h;
    } else {
      iguais = 0;
      ultima = h;
    }
    await page.waitForTimeout(50);
  }
  return ultima;
}

async function orcamento(page: Page): Promise<number> {
  return page.evaluate(() => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--ccc-header-h");
    return window.innerHeight - (parseFloat(raw) || 60) - 24;
  });
}

test.describe("a-star · casca adaptativa", () => {
  test("no painel o miolo rola sozinho: cabeçalho e ▶ Rodar não saem do lugar", async ({ page }) => {
    await abrir(page, 1440, 600);
    const fig = figura(page);
    await fig.getByRole("button", { name: GULOSO }).click();
    await fig.getByRole("button", { name: ABERTO }).click();
    await fig.getByRole("button", { name: /Expandir/ }).click();
    const pan = painel(page);
    await expect(pan).toBeVisible();

    // O passo do PICO, e aqui ele é o último: a nota do guloso que chegou ao
    // alvo é a única das 514 que quebra em duas linhas dentro do painel.
    await andarAte(pan, 13);
    await expect(passo(pan)).toHaveText("passo 13 de 13");
    await alturaEstavel(pan);

    // O `click()` do Playwright rola o contêiner para alcançar o alvo, então a
    // leitura de referência sai com as duas rolagens zeradas.
    const antes = await pan.evaluate((f) => {
      const body = f.querySelector(".viz-body") as HTMLElement;
      f.scrollTop = 0;
      body.scrollTop = 0;
      const r = f.getBoundingClientRect();
      return {
        sobraMiolo: body.scrollHeight - body.clientHeight,
        sobraFigura: f.scrollHeight - f.clientHeight,
        cabeca: Math.round(f.querySelector(".viz-head")!.getBoundingClientRect().top - r.top),
        rodarBase: Math.round(f.querySelector(".viz-play")!.getBoundingClientRect().bottom),
      };
    });

    // Premissa: existe o que rolar, e quem rola é o miolo. Sem as duas, a
    // quebra que devolve a rolagem para a figura passa verde.
    expect(antes.sobraMiolo, "o miolo precisa estourar para haver o que rolar").toBeGreaterThan(SLACK);
    expect(antes.sobraFigura, "quem rola é o miolo, não a figura").toBeLessThanOrEqual(SLACK);

    const depois = await pan.evaluate((f) => {
      const body = f.querySelector(".viz-body") as HTMLElement;
      body.scrollTop = body.scrollHeight;
      const r = f.getBoundingClientRect();
      return {
        mioloRolou: Math.round(body.scrollTop),
        figuraRolou: Math.round(f.scrollTop),
        cabeca: Math.round(f.querySelector(".viz-head")!.getBoundingClientRect().top - r.top),
        rodarBase: Math.round(f.querySelector(".viz-play")!.getBoundingClientRect().bottom),
        janela: window.innerHeight,
      };
    });

    expect(depois.mioloRolou, "o miolo rolou de verdade").toBeGreaterThan(0);
    expect(depois.figuraRolou, "a figura inteira não rola").toBe(0);
    expect(depois.cabeca, "o cabeçalho não se mexeu").toBe(antes.cabeca);
    expect(depois.cabeca, "o cabeçalho está colado no topo da figura").toBeLessThanOrEqual(2);
    expect(depois.rodarBase, "os controles não se mexeram").toBe(antes.rodarBase);
    expect(depois.rodarBase, "o ▶ Rodar continua dentro da janela").toBeLessThanOrEqual(depois.janela);
    // Rótulo além de posição: botão no lugar certo dizendo outra coisa ensina
    // errado do mesmo jeito.
    await expect(pan.locator(".viz-play")).toHaveText("▶ Rodar");
  });

  test("a 1512x900 a peça não caberia, então o código vem recolhido e o botão diz Mostrar código", async ({ page }) => {
    await abrir(page, 1512, 900);
    const fig = figura(page);
    const botao = fig.getByRole("button", { name: /código/ });
    await expect(botao).toHaveText("Mostrar código");
    await expect(botao).toHaveAttribute("aria-expanded", "false");
    await expect(fig).toHaveAttribute("data-codigo", "off");

    const alturaCodigo = Math.round(
      await fig.locator(".viz-code").evaluate((el) => el.getBoundingClientRect().height)
    );
    // Zerar a trilha da COLUNA tira a largura e não a altura: quem fecha a linha
    // é o `.viz-code-slot` (grid 1fr→0fr). Sem ele o bloco continua com os 408px
    // inteiros e a peça não encolhe um pixel.
    expect(alturaCodigo, "o bloco recolhido não pode ocupar altura").toBeLessThanOrEqual(2);

    const altura = await alturaEstavel(fig);
    expect(altura, "recolhida, a peça cabe no orçamento da janela").toBeLessThanOrEqual(await orcamento(page));
  });

  test("numa janela alta o código já vem aberto, com o rótulo Ocultar código", async ({ page }) => {
    await abrir(page, 1512, 1400);
    const fig = figura(page);
    const botao = fig.getByRole("button", { name: /código/ });
    await expect(botao).toHaveText("Ocultar código");
    await expect(fig).toHaveAttribute("data-codigo", "on");
    await expect(fig.locator(".viz-code-head")).toHaveText("a_estrela.py");

    const altura = await alturaEstavel(fig);
    expect(altura, "com esta janela a peça cabe aberta — é por isso que ela abre").toBeLessThanOrEqual(
      await orcamento(page)
    );
  });

  test("a escolha do aluno sobrevive à troca de preset, que é o que dispara medição nova", async ({ page }) => {
    await abrir(page, 1512, 900);
    const fig = figura(page);
    const botao = fig.getByRole("button", { name: /código/ });
    await expect(botao).toHaveText("Mostrar código");

    await botao.click();
    await expect(botao).toHaveText("Ocultar código");
    await expect(fig).toHaveAttribute("data-codigo", "on");

    // "Campo aberto" muda `measureOn` E a altura: a dica dele ocupa duas linhas
    // em vez de uma (37px contra 18). Aberta, a peça passa do orçamento, ou
    // seja, a medição QUER recolher — é isso que faz o teste valer.
    await fig.getByRole("button", { name: ABERTO }).click();
    await expect(fig.locator(".tt-legenda-arvore")).toContainText("Sem obstáculo nenhum");
    await expect(passo(fig)).toHaveText("passo 1 de 13");

    const alta = await alturaEstavel(fig);
    expect(alta, "aberta, a peça passa do orçamento — a medição discordaria do aluno").toBeGreaterThan(
      await orcamento(page)
    );

    await expect(fig).toHaveAttribute("data-codigo", "on");
    await expect(botao).toHaveText("Ocultar código");
  });

  test("as setas andam a animação dentro do painel", async ({ page }) => {
    await abrir(page, 1440, 700);
    const fig = figura(page);
    await fig.getByRole("button", { name: ABERTO }).click();
    await fig.getByRole("button", { name: /Expandir/ }).click();
    const pan = painel(page);
    await expect(passo(pan)).toHaveText("passo 1 de 13");

    // Duas vezes na MESMA direção: um par de ações inversas devolve a peça ao
    // estado de origem e fica verde com a quebra aplicada.
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(passo(pan)).toHaveText("passo 3 de 13");

    await page.keyboard.press("Space");
    await expect(pan.locator(".viz-play")).toHaveText("❚❚ Pausar");
  });

  test("com o cursor no controle de velocidade, a seta é do slider e não do passo", async ({ page }) => {
    await abrir(page, 1440, 700);
    const fig = figura(page);
    await fig.getByRole("button", { name: ABERTO }).click();
    await fig.getByRole("button", { name: /Expandir/ }).click();
    const pan = painel(page);
    await expect(passo(pan)).toHaveText("passo 1 de 13");

    await pan.locator(".viz-speed input[type=range]").focus();
    await page.keyboard.press("ArrowLeft");

    await expect(pan.locator(".viz-speed .val"), "a seta mexeu na marcha, que é de quem estava em foco").toHaveText("1x");
    await expect(passo(pan), "e não andou o passo").toHaveText("passo 1 de 13");
  });

  test("a marcha inicial da peça é 1.5x, não o 1x padrão do hook", async ({ page }) => {
    await abrir(page, 1440, 700);
    const fig = figura(page);
    await fig.getByRole("button", { name: /Expandir/ }).click();
    const pan = painel(page);
    await expect(pan.locator(".viz-speed .val")).toHaveText("1.5x");
    await expect(pan.locator(".viz-speed input[type=range]")).toHaveValue("4");
  });

  test("a grade tem altura constante: mesmo tamanho do viewBox nos três presets e nos três modos", async ({ page }) => {
    await abrir(page, 1512, 900);
    const fig = figura(page);
    const svg = fig.locator("svg.tt-arv");
    const ler = () =>
      svg.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const vb = (el.getAttribute("viewBox") || "").split(/\s+/).map(Number);
        return { w: Math.round(r.width), h: Math.round(r.height), vw: vb[2], vh: vb[3] };
      });

    const base = await ler();
    // Teto de altura (§7) só devolve VAZIO, e só há vazio quando o renderizado é
    // maior que o natural. Aqui são iguais, então um `max-height` encolheria o
    // desenho pelo `preserveAspectRatio`. É por isso que este tópico não escreveu
    // uma linha de CSS.
    expect(base.w, "o desenho sai no tamanho natural do viewBox").toBe(base.vw);
    expect(base.h).toBe(base.vh);

    // E a grade não é o eixo da altura: ela é gerada por código, mas as três
    // dimensões vêm de constantes do arquivo. Nenhum controle do aluno a move.
    for (const preset of [MURO, "Labirinto", ABERTO]) {
      for (const modo of ["A*: f = g + h", "Dijkstra: f = g", GULOSO]) {
        await fig.getByRole("button", { name: modo }).click();
        await fig.getByRole("button", { name: preset }).click();
        await expect(fig.getByRole("button", { name: preset })).toHaveAttribute("aria-pressed", "true");
        const m = await ler();
        expect(m, `${modo} / ${preset} desenha a mesma grade`).toEqual(base);
      }
    }
  });

  test("o contador do cabeçalho é a expansão em curso, e no fim bate com o que o painel credita ao modo", async ({ page }) => {
    await abrir(page, 1512, 900);
    const fig = figura(page);
    await fig.getByRole("button", { name: GULOSO }).click();
    await fig.getByRole("button", { name: MURO }).click();
    await expect(passo(fig)).toHaveText("passo 1 de 27");

    // O cartão do modo escolhido, lido pelo destaque — rótulo e valor juntos, no
    // mesmo cartão: o guarda de idioma compara o CONJUNTO de textos e não onde
    // cada um aparece, então trocar dois campos de lugar passa verde por lá.
    // `has:` é resolvido DENTRO de cada `.viz-var`, então o locator interno tem
    // que sair de `page` — um encadeado a partir de `fig` não casa com nada.
    const escolhido = fig.locator(".viz-var").filter({ has: page.locator(".viz-var-val.best") });
    await expect(escolhido.locator(".viz-var-name")).toHaveText("Guloso");
    const valor = await escolhido.locator(".viz-var-val").innerText();
    const casou = /^(\d+) células · custo (\d+)$/.exec(valor.trim());
    expect(casou, `o cartão do modo diz "N células · custo C", e veio "${valor}"`).not.toBeNull();
    const totalDoModo = Number(casou![1]);
    expect(totalDoModo, "o guloso expande alguma coisa neste mapa").toBeGreaterThan(1);

    // No passo 1 o cabeçalho conta o que já expandiu, que ainda é menos que o
    // total — sem isto, um cabeçalho que copiasse o total passaria nos dois.
    const inicio = Number((await expandidas(fig).innerText()).replace(/\D+/g, ""));
    expect(inicio, "no primeiro passo ainda não se expandiu tudo").toBeLessThan(totalDoModo);

    await andarAte(fig, 27);
    await expect(passo(fig)).toHaveText("passo 27 de 27");
    // O `·` do fim é do CHILDREN, não do hook: com linha do tempo os dois viram
    // `.viz-step` irmãos separados só pelo gap, e sem ele o cabeçalho perde o
    // separador que o componente tinha (contrato §9). Asserir o texto exato faz
    // este teste guardar as duas coisas — a contagem e o separador.
    await expect(
      expandidas(fig),
      "no fim o cabeçalho conta as mesmas expansões que o painel credita ao modo, com o separador"
    ).toHaveText(`${totalDoModo} expandidas ·`);
  });
});
