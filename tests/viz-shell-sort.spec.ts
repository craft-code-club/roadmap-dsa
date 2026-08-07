import { test, expect, type Locator, type Page } from "@playwright/test";

// Casca adaptativa do ShellSortVisualizer.
//
// A página tem TRÊS `figure.viz` (o passo a passo, as subsequências e a corrida
// de sequências de gap) e só uma delas é `.viz-fit`. As outras duas têm
// `.viz-step` com outro sentido ("gap 4 · 4 subsequências...", "n = 32 ·
// melhor com gap..."), então todo seletor aqui é escopado na figura certa e o
// primeiro teste confere as contagens.
//
// Números que decidiram o escopo, medidos nos 261 estados (4 presets de 65, 66,
// 71 e 59 passos) e nas três réguas, com `document.fonts.ready` cumprido:
//
//   artigo, código aberto ...... 1041..1100 (1512x900) / 1055..1114 (1440)
//   artigo, código recolhido ...  720..779             /  734..793
//   painel, antes .............. a FIGURA rolava 190/390/490px, e o cabeçalho
//                                subia junto (-189/-389/-489)
//   painel, depois ............. quem rola é o miolo; figura 0px

const ORCAMENTO = (h: number) => h - 60 - 24;

/** A figura adaptada, no fluxo do artigo. */
const noArtigo = (page: Page) => page.locator("article figure.viz-fit");
/** A figura adaptada, dentro do painel expandido. */
const noPainel = (page: Page) => page.locator(".viz-overlay figure.viz-fit");

/** Espera a casca terminar a medição: `data-anim` só vira "on" depois dela. */
async function pronta(fig: Locator) {
  await expect(fig).toBeVisible();
  await expect(fig).toHaveAttribute("data-anim", "on");
}

async function abrir(page: Page) {
  await page.goto("/topico/shell-sort/");
  await page.evaluate(() => document.fonts.ready);
  const fig = noArtigo(page);
  await pronta(fig);
  return fig;
}

/** Anda a animação até o último passo, sem depender de 65 cliques do runner. */
async function ateOFim(fig: Locator) {
  await fig.evaluate(async (f) => {
    const espera = () =>
      new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    for (let n = 0; n < 400; n++) {
      const b = [...f.querySelectorAll("button")].find((x) =>
        (x.textContent || "").includes("Próximo")
      ) as HTMLButtonElement | undefined;
      if (!b || b.disabled) break;
      b.click();
      await espera();
    }
  });
}

/**
 * Altura do bloco recolhível, lida mesmo quando ele está `inert` — e só depois
 * de a transição de 0,32s parar. Duas leituras iguais não bastam: uma transição
 * em CSS passa por patamares e duas amostras podem cair no mesmo.
 */
async function alturaDoCodigo(fig: Locator) {
  const ler = () =>
    fig.locator(".viz-code").evaluate((e) => Math.round(e.getBoundingClientRect().height));
  let iguais = 0;
  let anterior = await ler();
  for (let n = 0; n < 60 && iguais < 2; n++) {
    await fig.page().waitForTimeout(60);
    const atual = await ler();
    iguais = atual === anterior ? iguais + 1 : 0;
    anterior = atual;
  }
  return anterior;
}

/** Anda a animação até o selo da fase mostrar o gap pedido. */
async function ateOGap(fig: Locator, gap: number) {
  await fig.evaluate(async (f, alvo) => {
    const espera = () =>
      new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    for (let n = 0; n < 400; n++) {
      if ((f.querySelector(".hs-fase-selo")?.textContent || "").trim() === `gap ${alvo}`) return;
      const b = [...f.querySelectorAll("button")].find((x) =>
        (x.textContent || "").includes("Próximo")
      ) as HTMLButtonElement | undefined;
      if (!b || b.disabled) return;
      b.click();
      await espera();
    }
  }, gap);
}

test.describe("shell sort · a figura certa", () => {
  test.use({ viewport: { width: 1512, height: 900 } });

  test("a casca alcança um dos três visualizadores, e é o do passo a passo", async ({ page }) => {
    const fig = await abrir(page);
    expect(page.viewportSize()).toEqual({ width: 1512, height: 900 });

    // A ambiguidade é da PÁGINA, não da casca: três figuras, três `.viz-step`.
    expect(await page.locator("article figure.viz").count()).toBe(3);
    expect(await fig.count()).toBe(1);
    expect(await page.locator("article .viz-step").count()).toBe(3);
    expect(await fig.locator(".viz-step").count()).toBe(1);
    expect(await fig.locator("input[type=range]").count()).toBe(1);

    await expect(fig.locator(".viz-head-title")).toContainText(
      "shell sort: o insertion sort com gap"
    );
    await expect(fig.locator(".viz-step")).toHaveText("passo 1 de 65");
  });
});

test.describe("shell sort · camada 1: cabeçalho e controles parados", () => {
  test.use({ viewport: { width: 1440, height: 600 } });

  test("o miolo rola e o cabeçalho e o rodapé não saem do lugar", async ({ page }) => {
    const fig = await abrir(page);
    expect(page.viewportSize()).toEqual({ width: 1440, height: 600 });

    await fig.locator("button", { hasText: "Expandir" }).click();
    const painel = noPainel(page);
    await pronta(painel);

    // O aluno pede o código de volta: é o estado em que o miolo tem mais o que
    // rolar (406px de sobra medidos), e a escolha dele vence a medição.
    if ((await painel.getAttribute("data-codigo")) === "off") {
      await painel.locator("button", { hasText: "Mostrar código" }).click();
    }
    await expect(painel).toHaveAttribute("data-codigo", "on");
    await expect(painel.locator("button", { hasText: "Ocultar código" })).toBeVisible();

    const corpo = painel.locator(".viz-body");
    const cabeca = painel.locator(".viz-head");
    const rodape = painel.locator(".viz-foot");
    const rodar = painel.locator("button", { hasText: "Rodar" });

    // O `click()` do Playwright rola o contêiner para alcançar o alvo, então a
    // posição de referência só vale com o `scrollTop` zerado.
    await corpo.evaluate((e) => { e.scrollTop = 0; });

    // Premissa: existe sobra para rolar. Sem ela o teste vira decoração verde.
    const sobraMiolo = await corpo.evaluate((e) => e.scrollHeight - e.clientHeight);
    expect(sobraMiolo).toBeGreaterThan(8);

    const antes = {
      cabeca: (await cabeca.boundingBox())!.y,
      rodape: (await rodape.boundingBox())!.y,
    };

    await corpo.evaluate((e) => { e.scrollTop = e.scrollHeight; });

    // Quem rolou foi o miolo — e só ele.
    expect(await corpo.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
    expect(await painel.evaluate((e) => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual(8);
    expect(await painel.evaluate((e) => e.scrollTop)).toBe(0);

    // A asserção que carrega o sentido: a posição comparada com ela mesma.
    // `toBeInViewport()` sozinho passaria com o rodapé de volta dentro do miolo.
    const depois = {
      cabeca: (await cabeca.boundingBox())!.y,
      rodape: (await rodape.boundingBox())!.y,
    };
    expect(Math.round(depois.cabeca - antes.cabeca)).toBe(0);
    expect(Math.round(depois.rodape - antes.rodape)).toBe(0);

    // E o botão que faz o algoritmo andar continua inteiro na tela.
    await expect(rodar).toBeInViewport({ ratio: 1 });
    await expect(rodar).toHaveText("▶ Rodar");
  });
});

test.describe("shell sort · camada 3: a medição recolhe o código", () => {
  test.use({ viewport: { width: 1512, height: 900 } });

  test("em 900px de altura o código vem recolhido, e o rótulo diz o que ele faz", async ({ page }) => {
    const fig = await abrir(page);
    expect(page.viewportSize()).toEqual({ width: 1512, height: 900 });

    // Rótulo e valor juntos: o botão promete mostrar, e o bloco está fechado.
    await expect(fig).toHaveAttribute("data-codigo", "off");
    const botao = fig.locator(".viz-toggle-codigo");
    await expect(botao).toHaveText("Mostrar código");
    await expect(botao).toHaveAttribute("aria-expanded", "false");
    expect(await alturaDoCodigo(fig)).toBeLessThan(10);

    // Recolhido a peça cabe no orçamento; aberta não caberia. É essa diferença
    // que justifica a camada 3 nesta peça.
    const recolhida = await fig.evaluate((e) => Math.round(e.getBoundingClientRect().height));
    expect(recolhida).toBeLessThan(ORCAMENTO(900));

    await botao.click();
    await expect(fig).toHaveAttribute("data-codigo", "on");
    await expect(fig.locator(".viz-toggle-codigo")).toHaveText("Ocultar código");
    // O `.viz-code-slot` é quem devolve ALTURA: zerar a trilha da coluna tiraria
    // só a largura.
    expect(await alturaDoCodigo(fig)).toBeGreaterThan(300);
    const aberta = await fig.evaluate((e) => Math.round(e.getBoundingClientRect().height));
    expect(aberta).toBeGreaterThan(ORCAMENTO(900));
    expect(aberta - recolhida).toBeGreaterThan(250);
  });
});

test.describe("shell sort · camada 3: em tela alta o código já vem aberto", () => {
  test.use({ viewport: { width: 1512, height: 1200 } });

  test("com 1200px de altura a peça cabe inteira e o código não é escondido", async ({ page }) => {
    const fig = await abrir(page);
    expect(page.viewportSize()).toEqual({ width: 1512, height: 1200 });

    await expect(fig).toHaveAttribute("data-codigo", "on");
    await expect(fig.locator(".viz-toggle-codigo")).toHaveText("Ocultar código");
    expect(await alturaDoCodigo(fig)).toBeGreaterThan(300);

    const altura = await fig.evaluate((e) => Math.round(e.getBoundingClientRect().height));
    expect(altura).toBeLessThan(ORCAMENTO(1200));
  });
});

test.describe("shell sort · a escolha do aluno vence a medição", () => {
  test.use({ viewport: { width: 1512, height: 900 } });

  test("abrir o código sobrevive à troca de preset, que é o que dispara medição nova", async ({ page }) => {
    const fig = await abrir(page);
    expect(page.viewportSize()).toEqual({ width: 1512, height: 900 });

    // Nesta janela a medição QUER recolher (a peça aberta pede 1100px de um
    // orçamento de 816): a escolha do aluno está de fato ameaçada.
    await expect(fig).toHaveAttribute("data-codigo", "off");
    await fig.locator(".viz-toggle-codigo").click();
    await expect(fig).toHaveAttribute("data-codigo", "on");

    const dica = fig.locator(".tt-legenda-arvore");
    const dicaAntes = await dica.textContent();

    // O preset é o único item de `measureOn`, então trocá-lo pede medição nova.
    await fig.locator(".bigo-chip", { hasText: "Ao contrário" }).click();

    // Confirme a troca NA TELA antes de concluir: preset que não muda a entrada
    // da medição faz a escolha "sobreviver" sem nada tê-la ameaçado.
    await expect(dica).not.toHaveText(dicaAntes!);
    await expect(dica).toContainText("Todas as 28 inversões possíveis");
    await expect(fig.locator(".viz-step")).toHaveText("passo 1 de 71");

    await expect(fig).toHaveAttribute("data-codigo", "on");
    await expect(fig.locator(".viz-toggle-codigo")).toHaveText("Ocultar código");
    expect(await alturaDoCodigo(fig)).toBeGreaterThan(300);
  });
});

test.describe("shell sort · teclado do painel", () => {
  test.use({ viewport: { width: 1512, height: 900 } });

  test("as setas e o espaço andam a animação", async ({ page }) => {
    const fig = await abrir(page);
    await fig.locator("button", { hasText: "Expandir" }).click();
    const painel = noPainel(page);
    // `toBeVisible()` não é "pronto para o teclado": o listener de keydown nasce
    // num efeito, e a tecla enviada antes some sem erro nenhum. `data-anim=on`
    // só aparece depois de os efeitos da casca terem rodado.
    await pronta(painel);

    const passo = painel.locator(".viz-step");
    await expect(passo).toHaveText("passo 1 de 65");

    // Uma ação só: um par ArrowRight/ArrowLeft voltaria ao ponto de partida e
    // ficaria verde mesmo com as duas teclas roubadas.
    await page.keyboard.press("ArrowRight");
    await expect(passo).toHaveText("passo 2 de 65");

    await page.keyboard.press("ArrowRight");
    await expect(passo).toHaveText("passo 3 de 65");

    await page.keyboard.press("ArrowLeft");
    await expect(passo).toHaveText("passo 2 de 65");

    await page.keyboard.press(" ");
    await expect(painel.locator("button", { hasText: "Pausar" })).toHaveText("❚❚ Pausar");
  });

  test("com o controle de velocidade em foco, a seta é do slider e não do passo", async ({ page }) => {
    const fig = await abrir(page);
    await fig.locator("button", { hasText: "Expandir" }).click();
    const painel = noPainel(page);
    await pronta(painel);

    const passo = painel.locator(".viz-step");
    const marcha = painel.locator(".viz-speed .val");
    await expect(passo).toHaveText("passo 1 de 65");
    // A peça abre em 1.5x (`initialSpeed: 4`), que é a marcha que ela sempre
    // teve; sem passar isso ao hook ela cairia calada para 1x.
    await expect(marcha).toHaveText("1.5x");

    await painel.locator("input[type=range]").focus();
    await page.keyboard.press("ArrowRight");

    // A tecla chegou ao slider...
    await expect(marcha).toHaveText("2x");
    // ...e NÃO foi roubada pelo atalho de passo.
    await expect(passo).toHaveText("passo 1 de 65");
  });
});

test.describe("shell sort · o que está escrito na tela", () => {
  test.use({ viewport: { width: 1512, height: 900 } });

  test("os cartões carregam rótulo e valor no mesmo lugar", async ({ page }) => {
    const fig = await abrir(page);

    const cartao = (rotulo: string) =>
      fig.locator(".bigo-stat").filter({ hasText: rotulo }).locator("strong");

    // No passo 1 nada foi feito ainda.
    await expect(fig.locator(".bigo-stat").nth(0)).toContainText("tamanho do array");
    await expect(cartao("tamanho do array")).toHaveText("8");
    await expect(cartao("comparações")).toHaveText("0");
    await expect(cartao("escritas no array")).toHaveText("0");

    // O preset invertido é o único em que o shell sort já ganha com oito
    // elementos, e os números aparecem na dica, na legenda e no artigo: 22
    // comparações e 29 escritas. Mexer no gerador quebraria os três em silêncio.
    await fig.locator(".bigo-chip", { hasText: "Ao contrário" }).click();
    await expect(fig.locator(".viz-step")).toHaveText("passo 1 de 71");
    await ateOFim(fig);
    await expect(fig.locator(".viz-step")).toHaveText("passo 71 de 71");
    await expect(cartao("comparações")).toHaveText("22");
    await expect(cartao("escritas no array")).toHaveText("29");
    await expect(fig.locator(".viz-note")).toContainText(
      "Foram 22 comparações e 29 escritas"
    );
  });

  test("o Python da tela e os rótulos das variáveis continuam em português", async ({ page }) => {
    const fig = await abrir(page);

    // O bloco vem recolhido nesta janela: leia por textContent, nunca por
    // innerText, que devolveria vazio justamente para o que um rename estragaria.
    const linhas = await fig.locator(".viz-code .viz-line").allTextContents();
    expect(linhas).toHaveLength(12);
    expect(linhas[5]).toContain("atual = a[i]");
    expect(linhas[7]).toContain("while j >= gap and a[j - gap] > atual:");
    expect(linhas[8]).toContain("a[j] = a[j - gap]    # empurra pelo gap");
    expect(linhas[10]).toContain("a[j] = atual");
    expect(linhas.join("\n")).toContain("sequência original de Shell");

    const varDe = (nome: string) =>
      fig.locator(".viz-var").filter({ hasText: nome }).locator(".viz-var-val");
    await expect(varDe("atual (na mão)")).toHaveText("-");
    await expect(varDe("j (posição candidata)")).toHaveText("-");
    await expect(varDe("gap")).toHaveText("4");
  });

  test("o selo da fase muda de gap e de classe, que é contrato com o CSS", async ({ page }) => {
    const fig = await abrir(page);
    const fase = fig.locator(".hs-fase");

    // `f-ordenar` e `f-fim` são sufixo de classe do globals.css: traduzi-los
    // apagaria a cor sem o tsc, o guarda de idioma ou o build acusarem.
    await expect(fase.locator(".hs-fase-selo")).toHaveText("gap 4");
    await expect(fase).toHaveClass(/f-ordenar/);
    await expect(fase.locator(".hs-fase-txt")).toHaveText(
      "o array é lido como 4 subsequências entrelaçadas, uma a cada 4 posições"
    );

    // A última rodada é a de gap 1, e é ela que pinta `f-fim`.
    await ateOGap(fig, 1);
    await expect(fase.locator(".hs-fase-selo")).toHaveText("gap 1");
    await expect(fase).toHaveClass(/f-fim/);
    await expect(fase.locator(".hs-fase-txt")).toHaveText(
      "esta é a última rodada, e ela é o insertion sort puro"
    );

    // O último passo NÃO é uma rodada: o gerador empilha o resumo depois do
    // `while gap > 0`, com o gap já zerado. Ele mostrava "gap 0" e prometia "0
    // subsequências entrelaçadas, uma a cada 0 posições" — duas coisas que não
    // existem —, e ainda pintava de âmbar (`f-ordenar`) um array já ordenado.
    // Agora o selo diz o que o passo é, e a cor é a do fim.
    await ateOFim(fig);
    await expect(fig.locator(".viz-step")).toHaveText("passo 65 de 65");
    await expect(fase.locator(".hs-fase-selo")).toHaveText("ordenado");
    await expect(fase.locator(".hs-fase-txt")).toHaveText(
      "acabaram as rodadas de gap: este passo é o resumo da execução"
    );
    await expect(fase).toHaveClass(/f-fim/);
    await expect(fase).not.toHaveClass(/f-ordenar/);
    // Nenhum "gap 0" sobrou na fase, em lugar nenhum dela.
    await expect(fase).not.toContainText("gap 0");
    await expect(fase).not.toContainText("0 subsequências");
  });

  // Esta asserção olhava só o ÚLTIMO passo, e por isso ficou verde sobre um
  // "gap 0" vivo: ele não estava no resumo, estava no passo 64 de 65, o fim da
  // rodada de gap 1. A varredura abaixo passa por TODOS os passos, e é a única
  // forma de a promessa "a faixa nunca fala de uma rodada que não existe" valer
  // de verdade. Ela cobre os quatro presets porque o número de rodadas muda com
  // a entrada, e com ele o passo em que o defeito aparece.
  test("nenhum passo, em nenhum preset, rotula uma rodada que não existe", async ({ page }) => {
    const fig = await abrir(page);
    const chips = fig.locator(".bigo-chip");
    const nomes = await chips.allTextContents();
    for (const preset of nomes) {
      await chips.filter({ hasText: preset }).first().click();
      const proximo = fig.locator('button:has-text("Próximo")');
      // Reconsulta em vez de ler uma vez: logo após trocar de preset,
      // `isEnabled()` devolve o estado da rodada anterior, o laço não clica e a
      // varredura passa vazia.
      await expect(proximo).toBeEnabled();
      const problemas: string[] = [];
      for (let i = 0; i < 400; i++) {
        const [selo, txt, classe, nota, card] = await Promise.all([
          fig.locator(".hs-fase-selo").textContent(),
          fig.locator(".hs-fase-txt").textContent(),
          fig.locator(".hs-fase").getAttribute("class"),
          fig.locator(".viz-note").first().textContent(),
          fig
            .locator(".bigo-stat")
            .filter({ hasText: "subsequências deste gap" })
            .locator("strong")
            .textContent(),
        ]);
        if (selo?.includes("gap 0") || txt?.includes("0 subsequências") || card === "0") {
          problemas.push(`${preset} passo ${i + 1}: selo="${selo}" cartão="${card}"`);
        }
        // O selo é sobre a RODADA do passo, então ele tem que bater com a nota
        // do fim de rodada, que é a única que nomeia o gap por extenso. Era
        // exatamente aqui que a faixa mostrava o gap da rodada SEGUINTE.
        const fim = nota?.match(/Fim da rodada de gap (\d+)/);
        if (fim && selo?.trim() !== `gap ${fim[1]}`) {
          problemas.push(`${preset} passo ${i + 1}: nota diz gap ${fim[1]}, selo diz "${selo}"`);
        }
        // Rodada de gap 1 e resumo são o fim, e só eles pintam `f-fim`.
        const ehFim = selo?.trim() === "gap 1" || selo?.trim() === "ordenado";
        if (ehFim !== !!classe?.includes("f-fim")) {
          problemas.push(`${preset} passo ${i + 1}: selo="${selo}" com classe="${classe}"`);
        }
        if (!(await proximo.isEnabled())) break;
        await proximo.click();
      }
      await expect(proximo, `${preset} não chegou ao fim`).toBeDisabled();
      expect(problemas, "faixa da fase falando de rodada que não existe").toEqual([]);
    }

    // O cartão que contava subsequências também falava de uma rodada que não
    // existe. No resumo ele usa o mesmo traço das variáveis vazias.
    await expect(
      fig.locator(".bigo-stat").filter({ hasText: "subsequências deste gap" }).locator("strong")
    ).toHaveText("-");

    // E o painel de VARIÁVEIS continua mostrando 0 de propósito: ali o número é
    // o valor da variável `gap` do código, e ela é 0 mesmo — é por isso que o
    // `while gap > 0` terminou. O que era mentira era chamar isso de rodada.
    await expect(
      fig.locator(".viz-var").filter({ hasText: "gap" }).locator(".viz-var-val")
    ).toHaveText("0");
    await expect(fig.locator(".viz-note")).toContainText("Ordenado: 1, 3, 5, 6, 7, 13, 15, 21");
  });

  test("a fita tem oito células em todos os presets, e é por isso que ela não é eixo de altura", async ({ page }) => {
    const fig = await abrir(page);
    const fita = fig.locator(".hp-arr");

    for (const rotulo of ["Embaralhado", "O menor lá no fim", "Ao contrário", "Já ordenado"]) {
      await fig.locator(".bigo-chip", { hasText: rotulo }).click();
      await expect(fig.locator(".bigo-chip", { hasText: rotulo })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(await fita.locator(".hp-cel").count()).toBe(8);
      // Uma linha só: a fita é `flex-wrap` e só quebraria na 18ª célula.
      expect(await fita.evaluate((e) => Math.round(e.getBoundingClientRect().height))).toBe(44);
    }
  });
});
