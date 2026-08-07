import { test, expect, type Locator, type Page } from "@playwright/test";

// Casca adaptativa dos três visualizadores do tópico binary-numbers.
//
// A página tem TRÊS `figure.viz` — o conversor de binário para decimal, as
// divisões sucessivas e a tabela de bases — e **as três** estão na casca. As
// duas das pontas não têm linha do tempo (`total: 1`) nem bloco recolhível
// (`collapsible: false`): elas ganham o painel, o `Esc`, o foco e a trava de
// rolagem, e nada de reprodução.
//
// Por isso NENHUM seletor daqui pode viver solto na página: `figure.viz-fit`
// casava 1 e passou a casar 3, e `.viz-step` casa três coisas com sentidos
// diferentes ("00110101 = 53" no conversor, "passo N de M" nas divisões e
// "255 = 0xFF = 0b11111111" na tabela). Toda figura é escolhida pelo TÍTULO,
// nunca por posição, e as contagens são afirmadas nos dois níveis.
//
// Esta peça é uma das poucas da série em que o eixo de altura é o DESENHO e não
// a prosa: a lista de divisões acumula uma linha por passo, 36px cada. Números
// medidos nos 37 estados (4 presets de 10, 8, 9 e 10 passos) e nas três réguas:
//
//   .bb-passos ......... 27px (nenhuma divisão), depois 30/66/102/138/174/210/
//                        246/282 — exatamente 36px por linha
//   presets ............ 53 dá 6 divisões (210px), 64 dá 7 (246), 201 e 255
//                        dão 8 (282) e medem IGUAL ao pixel
//   .bn-fita ........... 63px, uma linha, 8 células nos 111 estados
//   .bigo-stats ........ 64px nas três réguas
//   dica do preset ..... 37px nos quatro presets e nas três réguas
//   artigo, antes ...... 899..1175 (1512x900) / 914..1190 (1440), com o código
//                        sempre à mostra e orçamentos de 816 / 616 / 516
//   artigo, depois ..... 715..991 / 730..1006, com o código recolhido
//   painel, antes ...... a FIGURA rolava 337/537/637px no passo do pico, o
//                        cabeçalho subia junto (25 → -312/-512/-612) e o
//                        `▶ Rodar` era desenhado 260/460/560px abaixo do pé
//                        visível da peça
//   painel, depois ..... quem rola é o miolo (84/275/370px de sobra); a figura
//                        rola 0px e o cabeçalho não sai do lugar

const ORCAMENTO = (h: number) => h - 60 - 24;

/** O passo mais alto do preset padrão: oito divisões na lista e a nota longa. */
const PICO = 9;

/** Título de cada uma das três, para escolher pelo CONTEÚDO e não por posição. */
const TITULOS = {
  conversor: "o binário é uma soma de potências de dois",
  divisoes: "de decimal para binário, dividindo por 2",
  bases: "a base é um parâmetro, e os bits são um orçamento",
};

/** Uma figura do artigo, escolhida pelo título do cabeçalho. */
const noArtigoPor = (page: Page, titulo: string) =>
  page
    .locator("article figure.viz-fit")
    .filter({ has: page.locator(".viz-head-title", { hasText: titulo }) });

/** A figura das divisões, que é a única com linha do tempo e bloco de código. */
const noArtigo = (page: Page) => noArtigoPor(page, TITULOS.divisoes);
/** A figura dentro do painel expandido — só uma existe por vez. */
const noPainel = (page: Page) => page.locator(".viz-overlay figure.viz-fit");

/** Espera a casca terminar a medição: `data-anim` só vira "on" depois dela. */
async function pronta(fig: Locator) {
  await expect(fig).toBeVisible();
  await expect(fig).toHaveAttribute("data-anim", "on");
}

async function abrir(page: Page) {
  await page.goto("/topico/binary-numbers/");
  await page.evaluate(() => document.fonts.ready);
  const fig = noArtigo(page);
  await pronta(fig);
  return fig;
}

/**
 * Anda até o passo pedido pelo botão, confirmando o contador a cada clique.
 * Lê o passo ATUAL antes de andar: uma versão que sempre parte do 1 anda de
 * mais quando é chamada duas vezes no mesmo teste, e o erro sai três asserções
 * adiante, longe da causa.
 */
async function atePasso(fig: Locator, alvo: number, total: number) {
  const texto = (await fig.locator(".viz-step").textContent()) || "";
  const atual = Number(texto.replace("passo ", "").split(" de ")[0]);
  expect(Number.isFinite(atual)).toBe(true);
  for (let i = atual + 1; i <= alvo; i++) {
    await fig.locator("button", { hasText: "Próximo" }).click();
    await expect(fig.locator(".viz-step")).toHaveText(`passo ${i} de ${total}`);
  }
  await expect(fig.locator(".viz-step")).toHaveText(`passo ${alvo} de ${total}`);
}

/**
 * Altura do bloco recolhível, lida mesmo `inert` e só depois de a transição de
 * 0,32s acabar. Espera fixa ANTES de contar leituras iguais: com `.viz-split` em
 * `align-items: start`, a figura fica num patamar enquanto o código cresce, e
 * "três leituras iguais" sozinho já devolveu 254px de erro noutro tópico.
 */
async function alturaDoCodigo(fig: Locator) {
  await fig.page().waitForTimeout(450);
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

const alturaDa = (loc: Locator) =>
  loc.evaluate((e) => Math.round(e.getBoundingClientRect().height));

test.describe("binary numbers · a figura certa", () => {
  test.use({ viewport: { width: 1512, height: 900 } });

  test("as três estão na casca, e cada seletor casa uma só dentro da sua", async ({ page }) => {
    const fig = await abrir(page);
    expect(page.viewportSize()).toEqual({ width: 1512, height: 900 });

    // A ambiguidade é da PÁGINA, não da casca: três figuras no mesmo documento,
    // e agora as três com as mesmas classes. Contagem nos DOIS níveis.
    expect(await page.locator("article figure.viz").count()).toBe(3);
    expect(await page.locator("article figure.viz-fit").count()).toBe(3);
    expect(await fig.count()).toBe(1);
    expect(await noArtigoPor(page, TITULOS.conversor).count()).toBe(1);
    expect(await noArtigoPor(page, TITULOS.bases).count()).toBe(1);

    // Os três `.viz-step` da página dizem coisas DIFERENTES, e só o do meio é um
    // contador de passo. Um seletor não escopado pega o primeiro em silêncio, e
    // `split(" de ")[1]` viraria `NaN` sem ninguém reclamar.
    expect(await page.locator("article .viz-step").count()).toBe(3);
    expect(await fig.locator(".viz-step").count()).toBe(1);
    await expect(noArtigoPor(page, TITULOS.conversor).locator(".viz-step")).toHaveText(
      "00110101 = 53"
    );
    await expect(noArtigoPor(page, TITULOS.bases).locator(".viz-step")).toHaveText(
      "255 = 0xFF = 0b11111111"
    );
    expect(await fig.locator("input[type=range]").count()).toBe(1);
    expect(await fig.locator(".viz-foot").count()).toBe(1);
    expect(await fig.locator(".viz-code-slot").count()).toBe(1);

    await expect(fig.locator(".viz-head-title")).toContainText(TITULOS.divisoes);
    await expect(fig.locator(".viz-step")).toHaveText("passo 1 de 10");

    // A afordância que faltava: agora as três oferecem o mesmo botão. Era 1 para
    // 3 figuras iguais, e o aluno aprendia que o botão não existe.
    expect(await page.locator("article button", { hasText: "Expandir" }).count()).toBe(3);
  });
});

test.describe("binary numbers · as duas peças sem linha do tempo", () => {
  test.use({ viewport: { width: 1512, height: 900 } });

  test("nenhum botão promete esconder um bloco que a peça não tem", async ({ page }) => {
    await abrir(page);
    // Os itens 2, 3 e 4 da §8 do contrato não existem com `collapsible: false`.
    // No lugar deles, a prova de que a AUSÊNCIA tem o rótulo certo: nenhuma das
    // duas oferece "Mostrar código", e nenhuma tem bloco para esconder.
    for (const titulo of [TITULOS.conversor, TITULOS.bases]) {
      const f = noArtigoPor(page, titulo);
      expect(await f.locator(".viz-toggle-codigo").count()).toBe(0);
      expect(await f.locator(".viz-code").count()).toBe(0);
      expect(await f.locator(".viz-code-slot").count()).toBe(0);
      // E `total: 1` tira a reprodução inteira: sem rodapé, sem atalhos, sem
      // barra de progresso e sem contador de passo — o `.viz-step` que sobra é o
      // resumo do estado, com o rótulo junto do número.
      expect(await f.locator(".viz-foot").count()).toBe(0);
      expect(await f.locator(".viz-atalhos").count()).toBe(0);
      expect(await f.locator(".viz-progress").count()).toBe(0);
      expect(await f.locator("button", { hasText: "Rodar" }).count()).toBe(0);
      await expect(f.locator(".viz-step")).not.toContainText("passo ");
      // Um botão só no cabeçalho, e ele é o Expandir.
      expect(await f.locator(".viz-head button").count()).toBe(1);
      await expect(f.locator(".viz-head button")).toHaveText("⤢ Expandir");
    }
  });

  test("o resumo do cabeçalho acompanha o estado, com o rótulo junto", async ({ page }) => {
    await abrir(page);
    const conv = noArtigoPor(page, TITULOS.conversor);
    const bases = noArtigoPor(page, TITULOS.bases);

    // Rótulo e valor lidos no MESMO elemento: "53" sozinho não diria de quê.
    await expect(conv.locator(".viz-step")).toHaveText("00110101 = 53");
    // Uma ação só: clicar no bit mais significativo soma 128 e o resumo segue.
    await conv.locator(".bn-fita .bn-bit").first().click();
    await expect(conv.locator(".viz-step")).toHaveText("10110101 = 181");
    await expect(conv.locator(".bigo-stat").filter({ hasText: "valor decimal" }).locator("strong")).toHaveText("181");

    await expect(bases.locator(".viz-step")).toHaveText("255 = 0xFF = 0b11111111");
    await bases.locator(".bigo-chip", { hasText: "48.879" }).click();
    await expect(bases.locator(".viz-step")).toHaveText("48.879 = 0xBEEF = 0b1011111011101111");
  });

  test("no painel o cabeçalho não anda quando o miolo rola, e o Esc devolve o foco", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 700 });
    await page.goto("/topico/binary-numbers/");
    await page.evaluate(() => document.fonts.ready);
    const f = noArtigoPor(page, TITULOS.bases);
    // `pronta()` não serve aqui: com `collapsible: false` o hook nem espera as
    // fontes e nunca acende o `data-anim` — não há decisão a tomar, e portanto
    // não há transição a religar depois de medir.
    await expect(f).toBeVisible();
    await expect(f).toHaveAttribute("data-anim", "off");
    expect(page.viewportSize()).toEqual({ width: 1440, height: 700 });

    const botao = f.locator("button", { hasText: "Expandir" });
    await botao.click();
    const p = noPainel(page);
    await expect(p).toBeVisible();
    // Diálogo de verdade, e o rótulo dele é o título DESTA peça.
    const overlay = page.locator(".viz-overlay-fit");
    await expect(overlay).toHaveAttribute("role", "dialog");
    await expect(overlay).toHaveAttribute("aria-modal", "true");
    await expect(overlay).toHaveAttribute(
      "aria-label",
      "Visualizador · a base é um parâmetro, e os bits são um orçamento"
    );
    // A página atrás fica travada enquanto o painel está aberto.
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");

    const cabeca = p.locator(".viz-head");
    const corpo = p.locator(".viz-body");
    // O `click()` do Playwright rola o contêiner para alcançar o alvo: a posição
    // de referência só vale com o `scrollTop` zerado.
    await corpo.evaluate((e) => { e.scrollTop = 0; });
    const antes = (await cabeca.boundingBox())!.y;
    const chipAntes = (await p.locator(".bigo-chip").first().boundingBox())!.y;
    // Sem número mágico: o conteúdo tem que andar exatamente o que o miolo
    // rolou. Um `< -100` escrito de cabeça reprova por 55px de folga e não diz
    // nada sobre QUEM rolou.
    const rolou = await corpo.evaluate((e) => {
      e.scrollTop = e.scrollHeight;
      return Math.round(e.scrollTop);
    });
    const depois = (await cabeca.boundingBox())!.y;
    const chipDepois = (await p.locator(".bigo-chip").first().boundingBox())!.y;

    // A asserção que carrega o sentido, para uma peça SEM rodapé: o cabeçalho
    // comparado com ele mesmo, e o miolo comparado com ele mesmo. Se a figura
    // inteira voltar a rolar, o cabeçalho sobe junto com o conteúdo.
    expect(Math.round(depois - antes)).toBe(0);
    expect(Math.round(chipDepois - chipAntes)).toBe(-rolou);
    await expect(cabeca).toBeInViewport({ ratio: 1 });

    // Premissas DEPOIS das asserções: a quebra que devolve a rolagem à figura
    // desfaz a primeira delas, e a mensagem apontaria para o lugar errado.
    expect(rolou).toBeGreaterThan(8);
    expect(await corpo.evaluate((e) => e.scrollHeight - e.clientHeight)).toBeGreaterThan(8);
    expect(await p.evaluate((e) => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual(8);

    // `Esc` fecha e a trava de rolagem sai.
    //
    // O que NÃO é afirmado aqui, de propósito: o contrato (§5) promete que o
    // foco "volta para onde estava ao fechar", e ele não volta — vai para o
    // `<body>`. A causa é do hook e alcança todo mundo: `previous` é o próprio
    // `⤢ Expandir`, que vive DENTRO da figura que o `createPortal` desmonta e
    // remonta, então o `previous.focus()` da limpeza roda num nó já destacado.
    // Medido também em `/topico/big-o/`, que é a peça de referência do
    // contrato. Escrever a asserção do jeito errado aqui cimentaria o defeito.
    await page.keyboard.press("Escape");
    await expect(overlay).toHaveCount(0);
    expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe("hidden");
    // O botão volta para o artigo com o rótulo de abrir, e não o de fechar.
    await expect(botao).toHaveText("⤢ Expandir");
  });
});

test.describe("binary numbers · camada 1: cabeçalho e controles parados", () => {
  test.use({ viewport: { width: 1440, height: 600 } });

  test("o miolo rola e o cabeçalho e o rodapé não saem do lugar", async ({ page }) => {
    const fig = await abrir(page);
    expect(page.viewportSize()).toEqual({ width: 1440, height: 600 });

    await atePasso(fig, PICO, 10);
    await fig.locator("button", { hasText: "Expandir" }).click();
    const painel = noPainel(page);
    await pronta(painel);
    await expect(painel.locator(".viz-step")).toHaveText(`passo ${PICO} de 10`);

    // O aluno pede o código de volta: é o estado com mais coisa para rolar, e a
    // escolha dele vence a medição.
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

    const antes = {
      cabeca: (await cabeca.boundingBox())!.y,
      rodape: (await rodape.boundingBox())!.y,
      rodar: (await rodar.boundingBox())!.y,
    };

    await corpo.evaluate((e) => { e.scrollTop = e.scrollHeight; });

    // A asserção que carrega o sentido: a posição comparada com ela mesma.
    // `toBeInViewport()` sozinho passaria com o rodapé de volta dentro do miolo,
    // porque ele aceita qualquer interseção nas DUAS pontas da rolagem.
    const depois = {
      cabeca: (await cabeca.boundingBox())!.y,
      rodape: (await rodape.boundingBox())!.y,
      rodar: (await rodar.boundingBox())!.y,
    };
    expect(Math.round(depois.cabeca - antes.cabeca)).toBe(0);
    expect(Math.round(depois.rodape - antes.rodape)).toBe(0);
    expect(Math.round(depois.rodar - antes.rodar)).toBe(0);

    // E o botão que faz o algoritmo andar continua inteiro na tela.
    await expect(rodar).toBeInViewport({ ratio: 1 });
    await expect(rodar).toHaveText("▶ Rodar");

    // Premissas DEPOIS das asserções, de propósito: a quebra canônica desta
    // camada (devolver o rodapé para dentro do miolo) desfaz a primeira delas, e
    // o teste reprovaria na premissa em vez de na asserção que importa.
    expect(await corpo.evaluate((e) => e.scrollHeight - e.clientHeight)).toBeGreaterThan(8);
    expect(await corpo.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
    expect(await painel.evaluate((e) => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual(8);
    expect(await painel.evaluate((e) => e.scrollTop)).toBe(0);
  });
});

test.describe("binary numbers · camada 3: a medição recolhe o código", () => {
  test.use({ viewport: { width: 1512, height: 900 } });

  test("em 900px de altura o código vem recolhido, e o rótulo diz o que ele faz", async ({ page }) => {
    const fig = await abrir(page);
    expect(page.viewportSize()).toEqual({ width: 1512, height: 900 });

    // Rótulo e valor juntos: o botão promete mostrar, e o bloco está fechado.
    await expect(fig).toHaveAttribute("data-codigo", "off");
    const botao = fig.locator(".viz-toggle-codigo");
    await expect(botao).toHaveText("Mostrar código");
    await expect(botao).toHaveAttribute("aria-expanded", "false");
    // O que devolve ALTURA é o `.viz-code-slot`; zerar a trilha da coluna tiraria
    // só a largura, e o bloco seguiria com os seus 230px.
    expect(await alturaDoCodigo(fig)).toBeLessThan(10);

    const recolhida = await alturaDa(fig);
    expect(recolhida).toBeLessThan(ORCAMENTO(900));

    await botao.click();
    await expect(fig).toHaveAttribute("data-codigo", "on");
    await expect(fig.locator(".viz-toggle-codigo")).toHaveText("Ocultar código");
    expect(await alturaDoCodigo(fig)).toBeGreaterThan(200);

    // Aberta ela não caberia: é essa diferença que justifica a camada 3 aqui.
    const aberta = await alturaDa(fig);
    expect(aberta).toBeGreaterThan(ORCAMENTO(900));
    expect(aberta - recolhida).toBeGreaterThan(180);
  });
});

test.describe("binary numbers · camada 3: em tela alta o código já vem aberto", () => {
  test.use({ viewport: { width: 1512, height: 1200 } });

  test("com 1200px de altura a peça cabe inteira e o código não é escondido", async ({ page }) => {
    const fig = await abrir(page);
    expect(page.viewportSize()).toEqual({ width: 1512, height: 1200 });

    await expect(fig).toHaveAttribute("data-codigo", "on");
    await expect(fig.locator(".viz-toggle-codigo")).toHaveText("Ocultar código");
    expect(await alturaDoCodigo(fig)).toBeGreaterThan(200);
    expect(await alturaDa(fig)).toBeLessThan(ORCAMENTO(1200));
  });
});

test.describe("binary numbers · a escolha do aluno vence a medição", () => {
  test.use({ viewport: { width: 1512, height: 900 } });

  test("abrir o código sobrevive à troca de preset, que é o que dispara medição nova", async ({ page }) => {
    const fig = await abrir(page);
    expect(page.viewportSize()).toEqual({ width: 1512, height: 900 });

    // Nesta janela a medição QUER recolher: a peça aberta pede 909px de um
    // orçamento de 816. A escolha do aluno está de fato ameaçada.
    await expect(fig).toHaveAttribute("data-codigo", "off");
    await fig.locator(".viz-toggle-codigo").click();
    await expect(fig).toHaveAttribute("data-codigo", "on");

    const dica = fig.locator(".tt-legenda-arvore");
    const dicaAntes = await dica.textContent();

    // O preset é o único item de `measureOn`, e aqui ele muda o DESENHO: 53 tem
    // seis divisões contra as oito do 201, dois degraus de 36px a menos.
    await fig.locator(".bigo-chip", { hasText: "53" }).click();

    // Confirme a troca NA TELA antes de concluir: preset que não muda a entrada
    // da medição faz a escolha "sobreviver" sem nada tê-la ameaçado.
    await expect(dica).not.toHaveText(dicaAntes!);
    await expect(dica).toContainText("O mesmo número do visualizador anterior");
    await expect(fig.locator(".viz-step")).toHaveText("passo 1 de 8");

    await expect(fig).toHaveAttribute("data-codigo", "on");
    await expect(fig.locator(".viz-toggle-codigo")).toHaveText("Ocultar código");
    expect(await alturaDoCodigo(fig)).toBeGreaterThan(200);
  });
});

test.describe("binary numbers · teclado do painel", () => {
  test.use({ viewport: { width: 1512, height: 900 } });

  /** `toBeVisible()` não é "pronto para o teclado": o listener nasce num efeito. */
  async function expandir(page: Page) {
    const fig = await abrir(page);
    await fig.locator("button", { hasText: "Expandir" }).click();
    const painel = noPainel(page);
    await pronta(painel);
    await expect
      .poll(() => page.evaluate(() => !!document.activeElement?.closest(".viz-overlay-fit")))
      .toBe(true);
    return painel;
  }

  test("as setas e o espaço andam a animação", async ({ page }) => {
    const painel = await expandir(page);
    const passo = painel.locator(".viz-step");
    await expect(passo).toHaveText("passo 1 de 10");

    // Uma ação só por vez: um par ArrowRight/ArrowLeft voltaria ao ponto de
    // partida e ficaria verde mesmo com as duas teclas roubadas.
    await page.keyboard.press("ArrowRight");
    await expect(passo).toHaveText("passo 2 de 10");
    await page.keyboard.press("ArrowRight");
    await expect(passo).toHaveText("passo 3 de 10");
    await page.keyboard.press("ArrowLeft");
    await expect(passo).toHaveText("passo 2 de 10");

    await page.keyboard.press(" ");
    await expect(painel.locator("button", { hasText: "Pausar" })).toHaveText("❚❚ Pausar");
  });

  test("com o controle de velocidade em foco, a seta é do slider e não do passo", async ({ page }) => {
    const painel = await expandir(page);
    const passo = painel.locator(".viz-step");
    const marcha = painel.locator(".viz-speed .val");
    await expect(passo).toHaveText("passo 1 de 10");
    // A peça sempre abriu em 1.5x (`initialSpeed: 4`); sem passar isso ao hook
    // ela cairia calada para 1x, e nenhum outro teste notaria.
    await expect(marcha).toHaveText("1.5x");

    await painel.locator("input[type=range]").focus();
    await page.keyboard.press("ArrowRight");

    // A tecla chegou ao slider...
    await expect(marcha).toHaveText("2x");
    // ...e NÃO foi roubada pelo atalho de passo.
    await expect(passo).toHaveText("passo 1 de 10");
  });
});

test.describe("binary numbers · o que está escrito na tela", () => {
  test.use({ viewport: { width: 1512, height: 900 } });

  test("os cartões carregam rótulo e valor no mesmo lugar", async ({ page }) => {
    const fig = await abrir(page);
    const cartao = (rotulo: string) =>
      fig.locator(".bigo-stat").filter({ hasText: rotulo }).locator("strong");

    expect(await fig.locator(".bigo-stat").count()).toBe(4);
    // No passo 1 nenhuma divisão foi feita ainda, e a fita está toda com "?".
    await expect(fig.locator(".bigo-stat").nth(0)).toContainText("número de partida");
    await expect(cartao("número de partida")).toHaveText("201");
    await expect(cartao("divisões feitas")).toHaveText("0");
    await expect(cartao("bits significativos")).toHaveText("8");
    await expect(cartao("bits já ligados na fita")).toHaveText("0");

    // No fim, 201 = 11001001: oito divisões e quatro bits ligados. O rótulo diz
    // "já ligados NA FITA", e o número tem que ser o da fita, não o de bits
    // escritos — comportamento certo com rótulo errado ensina errado igual.
    await atePasso(fig, 10, 10);
    await expect(cartao("divisões feitas")).toHaveText("8");
    await expect(cartao("bits já ligados na fita")).toHaveText("4");
    expect(
      await fig.locator(".bn-bit.on").count()
    ).toBe(4);
    await expect(fig.locator(".viz-note")).toContainText(
      "201 em binário é 11001001"
    );
    await expect(fig.locator(".viz-note")).toContainText("128 + 64 + 8 + 1 = 201");
  });

  test("o Python da tela e os rótulos das variáveis continuam em português", async ({ page }) => {
    const fig = await abrir(page);

    // O bloco vem recolhido nesta janela: leia por `textContent` (é o que as
    // `.viz-line` dão), nunca por `innerText`, que devolveria vazio justamente
    // para o que um rename estragaria.
    const linhas = await fig.locator(".viz-code .viz-line").allTextContents();
    expect(linhas).toHaveLength(7);
    expect(linhas[0]).toContain("def para_binario(n):");
    expect(linhas[2]).toContain("bits = ''");
    expect(linhas[4]).toContain("bits = str(n % 2) + bits   # o resto entra na FRENTE");
    expect(linhas[5]).toContain("n = n // 2                 # e o número encolhe pela metade");
    await expect(fig.locator(".viz-code-head")).toHaveText("para_binario.py");

    const varDe = (nome: string) =>
      fig.locator(".viz-var").filter({ hasText: nome }).locator(".viz-var-val");
    expect(await fig.locator(".viz-var").count()).toBe(3);
    await expect(varDe("n (o que falta converter)")).toHaveText("201");
    await expect(varDe("último resto")).toHaveText("-");
    await expect(varDe("bits já escritos")).toHaveText("0");

    await atePasso(fig, 2, 10);
    await expect(varDe("n (o que falta converter)")).toHaveText("100");
    await expect(varDe("último resto")).toHaveText("1");
    await expect(varDe("bits já escritos")).toHaveText("1");
  });
});

test.describe("binary numbers · o eixo de altura é a lista que acumula", () => {
  test.use({ viewport: { width: 1512, height: 900 } });

  test("cada passo acrescenta uma linha de 36px sem apagar a anterior", async ({ page }) => {
    const fig = await abrir(page);
    const lista = fig.locator(".bb-passos");

    // Passo 1: nenhuma divisão, uma linha de aviso.
    expect(await lista.locator("li").count()).toBe(1);
    await expect(lista.locator("li")).toHaveText("nenhuma divisão ainda");
    const vazia = await alturaDa(lista);

    // A lista ACUMULA: no passo k há k-1 divisões, e a primeira continua lá.
    await atePasso(fig, 2, 10);
    await expect(lista.locator("li").first()).toContainText("201 ÷ 2 = 100");
    const uma = await alturaDa(lista);

    await atePasso(fig, PICO, 10);
    expect(await lista.locator("li").count()).toBe(8);
    // A primeira divisão continua na tela oito passos depois — é isso que faz
    // desta peça um eixo de altura de verdade, e não uma grandeza temporal.
    await expect(lista.locator("li").first()).toContainText("201 ÷ 2 = 100");
    await expect(lista.locator("li").nth(7)).toContainText("1 ÷ 2 = 0");
    await expect(lista.locator("li").nth(7)).toHaveClass(/foco/);
    const oito = await alturaDa(lista);

    expect(vazia).toBeLessThan(uma);
    // 36px por linha: sete linhas a mais valem 252px.
    expect(oito - uma).toBe(252);
    expect(oito).toBe(282);
  });

  test("o degrau do log2 é atravessado pelos presets, e a fita não é eixo", async ({ page }) => {
    const fig = await abrir(page);
    const lista = fig.locator(".bb-passos");
    const fita = fig.locator(".bn-fita");

    // 53 → 6 divisões, 64 → 7, 201 e 255 → 8. Três patamares, e os dois de oito
    // medem igual ao pixel: varrer quatro presets mede TRÊS pontos, não quatro.
    const casos: [string, number, number, number][] = [
      ["53", 8, 6, 210],
      ["64, uma potência de dois", 9, 7, 246],
      ["255, todos ímpares", 10, 8, 282],
      ["201", 10, 8, 282],
    ];
    for (const [rotulo, total, divisoes, altura] of casos) {
      await fig.locator(".bigo-chip", { hasText: rotulo }).click();
      await expect(fig.locator(".bigo-chip", { hasText: rotulo })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      await expect(fig.locator(".viz-step")).toHaveText(`passo 1 de ${total}`);
      await atePasso(fig, total - 1, total);
      expect(await lista.locator("li").count()).toBe(divisoes);
      expect(await alturaDa(lista)).toBe(altura);

      // A fita tem oito células em todos eles (`Math.max(8, ...)`) e cabe numa
      // linha só, então ela não entra na conta da altura.
      expect(await fita.locator(".bn-bit").count()).toBe(8);
      expect(await alturaDa(fita)).toBe(63);
    }
  });
});
