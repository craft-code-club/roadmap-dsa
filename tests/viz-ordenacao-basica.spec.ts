import { test, expect, type Page, type Locator } from "@playwright/test";

// ---------------------------------------------------------------------------
// A casca adaptativa do OrdenacaoBasicaVisualizer.
//
// A página tem TRÊS `figure.viz` (passo a passo, corrida e estabilidade), e os
// irmãos usam as mesmas classes com outro sentido: `.viz-step` casa 3 na página
// e diz "12 inversões na entrada" numa delas, não "passo N de M". Por isso todo
// seletor daqui é escopado na figura — nenhum `page.locator(".viz-...")` solto.
//
// Réguas, medidas antes de escrever os testes:
//   · artigo, recolhida: 757px contra 816 de orçamento a 1512x900 (antes: 1017);
//   · painel a 1440x600: o miolo sobra 58px recolhido e 340px com o código
//     aberto pelo aluno — é a única régua desta série em que existe o que rolar,
//     e é por isso que o teste da camada 1 mora nela;
//   · a 1512x1080 o ALGORITMO decide: bubble e selection recolhem (1027 e 1001
//     contra 988 de orçamento) e o insertion fica aberto (976). É o que prova
//     que `algo` está mesmo em `measureOn`.
// ---------------------------------------------------------------------------

const URL = "/topico/ordenacao-basica/";
const SLACK = 8;

// As três figuras estão na casca. Só o passo a passo tem bloco recolhível, e é
// o `.viz-code-slot` que diz isso — ele existe porque a peça É recolhível.
const PRINCIPAL = "article figure.viz-fit:has(.viz-code-slot)";

/** A minha peça é a PRIMEIRA das três figuras do artigo. */
function noArtigo(page: Page): Locator {
  return page.locator("article figure.viz").first();
}

/** Expandida, a figura vai para um portal no `body`, fora do `<article>`. */
function noPainel(page: Page): Locator {
  return page.locator(".viz-overlay figure.viz");
}

async function abrir(page: Page, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(URL);
  expect(page.viewportSize(), `a régua pedida foi ${w}x${h}`).toEqual({ width: w, height: h });
  await page.evaluate(() => document.fonts.ready);
  const fig = noArtigo(page);
  await expect(fig).toHaveClass(/viz-fit/);
  return fig;
}

test("a página tem três figuras, e os seletores desta suíte pegam só a minha", async ({ page }) => {
  const fig = await abrir(page, 1512, 900);
  // Se um dia a página perder ou ganhar uma figura, é aqui que o resto desta
  // suíte deixa de estar falando da peça que ela pensa que está.
  await expect(page.locator("article figure.viz")).toHaveCount(3);
  await expect(page.locator("article .viz-step")).toHaveCount(3);
  await expect(fig.locator(".viz-step")).toHaveCount(1);
  await expect(fig.locator(".viz-step")).toHaveText(/^passo \d+ de \d+$/);
  // As TRÊS estão na casca agora: `figure.viz-fit` casava 1 e passou a casar 3.
  // O discriminante da minha é o bloco recolhível, que só ela tem.
  await expect(page.locator("article figure.viz-fit")).toHaveCount(3);
  await expect(page.locator("article .viz-code-slot")).toHaveCount(1);
  await expect(page.locator(PRINCIPAL)).toHaveCount(1);
  await expect(fig.locator(".viz-foot")).toHaveCount(1);
});

test("camada 1: o miolo rola sozinho e o cabeçalho e o ▶ Rodar não se mexem", async ({ page }) => {
  const fig = await abrir(page, 1440, 600);
  await fig.getByRole("button", { name: /Expandir/ }).click();
  const painel = noPainel(page);
  await expect(painel).toHaveCount(1);
  // Abre o código na mão para ter sobra de verdade (340px medidos) em vez dos
  // 58 do estado recolhido: teste de rolagem sem o que rolar não testa nada.
  await painel.getByRole("button", { name: /Mostrar código/ }).click();
  await expect(painel.getByRole("button", { name: /Ocultar código/ })).toBeVisible();

  const miolo = painel.locator(".viz-body");
  const rodar = painel.getByRole("button", { name: /▶ Rodar/ });

  // --- pré-condições: a situação que o teste afirma existe mesmo ---
  await expect(painel.locator(".viz-foot")).toHaveCount(1);
  // O `.viz-foot` tem que estar FORA do miolo — é isso que o deixa parado.
  await expect(painel.locator(".viz-body .viz-foot")).toHaveCount(0);
  await expect
    .poll(async () => miolo.evaluate((b) => b.scrollHeight - b.clientHeight), {
      message: "o miolo precisa estourar para haver o que rolar",
      timeout: 5000,
    })
    .toBeGreaterThan(SLACK);

  // Zera o scrollTop antes de ler a posição do cabeçalho: o `click()` do
  // Playwright ROLA o contêiner para alcançar o alvo, e a medida sairia suja.
  await miolo.evaluate((b) => {
    b.scrollTop = 0;
  });
  const cabecaAntes = (await painel.locator(".viz-head").boundingBox())!;
  const rodarAntes = (await rodar.boundingBox())!;

  // --- a ação: rolar o MIOLO até o fim ---
  await miolo.evaluate((b) => {
    b.scrollTop = b.scrollHeight;
  });
  await page.waitForTimeout(150);

  // foi o miolo que rolou...
  expect(await miolo.evaluate((b) => b.scrollTop), "o miolo rolou").toBeGreaterThan(0);
  // ...e não a figura, que é a quebra que a camada 1 conserta
  expect(await painel.evaluate((f) => f.scrollTop), "a figura não rola").toBe(0);
  expect(
    await painel.evaluate((f) => f.scrollHeight - f.clientHeight),
    "a figura não tem sobra para rolar"
  ).toBeLessThanOrEqual(SLACK);

  // --- a asserção que carrega o sentido: a posição comparada com ela mesma ---
  const cabecaDepois = (await painel.locator(".viz-head").boundingBox())!;
  const rodarDepois = (await rodar.boundingBox())!;
  expect(Math.abs(cabecaDepois.y - cabecaAntes.y), "o cabeçalho não anda").toBeLessThanOrEqual(2);
  expect(Math.abs(rodarDepois.y - rodarAntes.y), "o ▶ Rodar não anda").toBeLessThanOrEqual(2);
  // `toBeInViewport` entra como complemento: sozinho ele passa nas DUAS pontas
  // da rolagem mesmo com o rodapé de volta dentro do miolo.
  await expect(rodar).toBeInViewport({ ratio: 1 });
});

test("camada 3: em tela baixa o bloco vem recolhido e o botão diz Mostrar código", async ({
  page,
}) => {
  const fig = await abrir(page, 1512, 900);
  // O rótulo é metade da asserção: comportamento certo com rótulo errado ensina
  // errado do mesmo jeito.
  await expect(fig.getByRole("button", { name: "Mostrar código" })).toBeVisible();
  await expect(fig).toHaveAttribute("data-codigo", "off");
  await expect(fig.locator(".viz-toggle-codigo")).toHaveAttribute("aria-expanded", "false");
  // E o bloco recolheu de ALTURA, não só de largura: zerar a trilha da coluna
  // tira a largura e deixa a linha do grid com a altura do bloco.
  const slot = await fig.locator(".viz-code-slot").evaluate((e) => e.getBoundingClientRect().height);
  expect(slot, "o slot do código fechou").toBeLessThan(12);
});

test("camada 3: em tela alta o bloco já vem aberto, e quem decide é o algoritmo", async ({
  page,
}) => {
  // 1080px de janela = 988 de orçamento. O insertion pede 976 e cabe; o bubble
  // pede 1027 e não cabe. Mesma peça, mesma régua, decisões opostas.
  const fig = await abrir(page, 1512, 1080);
  await fig.getByRole("button", { name: "Insertion sort", exact: true }).click();
  await expect(fig.locator(".viz-code-head")).toHaveText("insertion_sort.py");
  await expect(fig.getByRole("button", { name: "Ocultar código" })).toBeVisible();
  await expect(fig).toHaveAttribute("data-codigo", "on");

  // O bubble, na MESMA janela, recolhe — é o que torna `algo` um eixo de verdade.
  const limpo = await abrir(page, 1512, 1080);
  await expect(limpo.locator(".viz-code-head")).toHaveText("bubble_sort.py");
  await expect(limpo.getByRole("button", { name: "Mostrar código" })).toBeVisible();
  await expect(limpo).toHaveAttribute("data-codigo", "off");
});

test("a escolha do aluno vence a medição quando o algoritmo muda", async ({ page }) => {
  const fig = await abrir(page, 1512, 900);
  // Aqui a medição QUER recolher (1027 contra 816 de orçamento), e recolheu.
  await expect(fig).toHaveAttribute("data-codigo", "off");
  await expect(fig.locator(".viz-code-head")).toHaveText("bubble_sort.py");

  // O aluno discorda e abre.
  await fig.getByRole("button", { name: "Mostrar código" }).click();
  await expect(fig).toHaveAttribute("data-codigo", "on");

  // Troca de algoritmo: entra em `measureOn` e MUDA a entrada da medição (o
  // bloco vai de 10 para 9 linhas de Python). Confirmo a troca na tela antes de
  // concluir qualquer coisa — senão a escolha "sobrevive" sem nada tê-la
  // ameaçado.
  await fig.getByRole("button", { name: "Selection sort", exact: true }).click();
  await expect(fig.locator(".viz-code-head")).toHaveText("selection_sort.py");
  await expect(fig.locator(".viz-line")).toHaveCount(9);

  // A medição rodaria de novo e recolheria (1001 contra 816). A escolha vence.
  await page.waitForTimeout(600);
  await expect(fig).toHaveAttribute("data-codigo", "on");
  await expect(fig.getByRole("button", { name: "Ocultar código" })).toBeVisible();
});

test("o teclado anda o passo no painel, e o controle de velocidade fica com a seta", async ({
  page,
}) => {
  const fig = await abrir(page, 1512, 900);
  await fig.getByRole("button", { name: /Expandir/ }).click();
  const painel = noPainel(page);
  // Pré-condição de verdade: `toBeVisible()` NÃO quer dizer "pronto para o
  // teclado". O hook põe o foco na figura no mesmo efeito que antecede o
  // listener de keydown, então foco na figura é o sinal de que ele já existe.
  await expect(painel).toBeFocused();
  await expect(painel.locator(".viz-step")).toHaveText("passo 1 de 49");

  // UMA ação, não um par que se cancela: ArrowRight seguido de ArrowLeft ficaria
  // verde igualzinho com as duas teclas roubadas.
  await page.keyboard.press("ArrowRight");
  await expect(painel.locator(".viz-step")).toHaveText("passo 2 de 49");
  await page.keyboard.press("ArrowRight");
  await expect(painel.locator(".viz-step")).toHaveText("passo 3 de 49");

  // Com o cursor no controle de velocidade, a seta é do slider: ela move a
  // marcha e NÃO anda o passo. Leio o rótulo junto do efeito.
  const velocidade = painel.locator(".viz-speed input[type=range]");
  await expect(painel.locator(".viz-speed .val")).toHaveText("1.5x");
  await velocidade.focus();
  await page.keyboard.press("ArrowRight");
  await expect(painel.locator(".viz-speed .val")).toHaveText("2x");
  await expect(painel.locator(".viz-step")).toHaveText("passo 3 de 49");
});

test("a marcha de abertura desta peça é 1.5x, não o 1x do padrão", async ({ page }) => {
  const fig = await abrir(page, 1512, 900);
  await fig.getByRole("button", { name: /Expandir/ }).click();
  const painel = noPainel(page);
  // O ritmo é da peça: o arquivo abria em `useState(4)` antes da adaptação, e
  // perder isso deixaria uma troca de array passando no tempo de um passo de
  // sudoku. Rótulo, porque é o que o aluno lê.
  await expect(painel.locator(".viz-speed .val")).toHaveText("1.5x");
});

test("recolhida, a peça cabe no orçamento do artigo a 1512x900", async ({ page }) => {
  const fig = await abrir(page, 1512, 900);
  await expect(fig).toHaveAttribute("data-codigo", "off");
  const m = await fig.evaluate((f) => {
    const hh = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--ccc-header-h")
    );
    return {
      altura: Math.round(f.getBoundingClientRect().height),
      orcamento: Math.round(window.innerHeight - (Number.isFinite(hh) && hh > 0 ? hh : 60) - 24),
    };
  });
  // Antes da adaptação eram 1017 contra 816 — a peça não cabia em nenhum dos
  // três algoritmos. Este número quebra no dia em que ela voltar a não caber.
  expect(m.altura, `peça ${m.altura}px, orçamento ${m.orcamento}px`).toBeLessThanOrEqual(
    m.orcamento
  );

  // E o miolo continua entregando o conteúdo, rótulo junto do valor no mesmo
  // cartão: card certo com número do vizinho ensina errado do mesmo jeito.
  const card = fig.locator(".bigo-stat").filter({ hasText: /^inversões da entrada/ });
  await expect(card.locator("strong")).toHaveText("12");
  const tam = fig.locator(".bigo-stat").filter({ hasText: /^tamanho do array/ });
  await expect(tam.locator("strong")).toHaveText("8");
});

// ---------------------------------------------------------------------------
// A corrida e o comparador de estabilidade vestiam `figure.viz` — a MESMA
// moldura do passo a passo — sem botão Expandir, sem diálogo, sem trava de
// rolagem, sem Esc e sem foco. Duas peças mudas para uma que expandia.
//
// As duas entram com `total: 1` e `collapsible: false`: não há passo a passo
// nem bloco dispensável. Sem rodapé, o controle cuja posição carrega o sentido
// da camada 1 é o `✕ Fechar`, que é a saída do diálogo.
//
// Réguas medidas antes de escrever (artigo, altura da peça):
//   · corrida        763 (1512x900), 784 (1440x700), 1327..1345 (390x844)
//   · estabilidade   929..953,       929..974,       1552..1685
// A corrida é a peça em que a régua de 1512x900 mais engana: ali ela cabe
// (763 de 816) e a 1440x700 passa (784 de 616). Sobra do miolo no painel a
// 1440x600: 49 e 268px — a 1512x900 as duas sobram 0, e o teste seria decoração.
// ---------------------------------------------------------------------------

const TITULO_CORRIDA = "o mesmo array custa três preços diferentes";
const TITULO_ESTABILIDADE = "a distância da troca decide a estabilidade";

function muda(page: Page, titulo: string): Locator {
  return page.locator("article figure.viz-fit").filter({ hasText: titulo });
}

async function abrirPainel(page: Page, fig: Locator): Promise<Locator> {
  await fig.getByRole("button", { name: "⤢ Expandir" }).click();
  const painel = page.locator(".viz-overlay-fit figure.viz-fit");
  await expect(painel).toBeVisible();
  // `toBeVisible()` não é "pronto para o teclado": o listener de keydown nasce
  // num efeito passivo, no mesmo commit que traz o foco para a figura.
  await expect(painel).toBeFocused();
  return painel;
}

/** Camada 1 numa peça SEM rodapé: quem não pode andar é o cabeçalho e o ✕ Fechar. */
async function provarCamada1(painel: Locator) {
  await expect(painel.locator(".viz-foot"), "esta peça não tem rodapé").toHaveCount(0);
  const fechar = painel.getByRole("button", { name: "✕ Fechar" });
  await expect(fechar).toHaveCount(1);

  const antes = await painel.evaluate((f) => {
    const b = f.querySelector(".viz-body") as HTMLElement;
    // o click() do Playwright ROLA o contêiner para alcançar o alvo
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

  // A asserção que carrega o sentido é a posição comparada com ela mesma:
  // `toBeInViewport()` sozinho passa nas duas pontas da rolagem.
  expect(Math.abs(depois.head - antes.head), "o cabeçalho andou junto com o miolo").toBeLessThanOrEqual(2);
  expect(Math.abs(depois.fechar - antes.fechar), "o ✕ Fechar andou junto com o miolo").toBeLessThanOrEqual(2);
  await expect(fechar).toBeInViewport({ ratio: 1 });
}

test("as três peças anunciam o mesmo botão, e cada rótulo diz o que a peça mostra", async ({ page }) => {
  await abrir(page, 1512, 900);
  // a afordância é a mesma nas três: era 1 Expandir para 3 figuras iguais
  await expect(page.getByRole("button", { name: "⤢ Expandir" })).toHaveCount(3);

  const corrida = muda(page, TITULO_CORRIDA);
  const estab = muda(page, TITULO_ESTABILIDADE);
  await expect(corrida).toHaveCount(1);
  await expect(estab).toHaveCount(1);
  // rótulo e valor no mesmo locator. E os números do cabeçalho da corrida têm
  // que bater com as barras: o teto é o que o selection sort gasta sempre.
  await expect(corrida.locator(".viz-step")).toHaveText(
    "12 inversões na entrada · piso 7, teto 28 comparações"
  );
  await expect(corrida.locator(".ord-linha").nth(1).locator(".bb-barra-txt").first()).toHaveText("28");
  await expect(estab.locator(".viz-step")).toHaveText("2 chamados fora da ordem de chegada");
  await expect(estab.locator(".hs-fila").nth(3).locator(".hp-cel.reg.inverteu")).toHaveCount(2);
});

test("nenhuma das duas promete esconder um bloco que ela não tem", async ({ page }) => {
  await abrir(page, 1512, 900);
  for (const titulo of [TITULO_CORRIDA, TITULO_ESTABILIDADE]) {
    const fig = muda(page, titulo);
    await expect(fig.locator(".viz-code-slot"), `${titulo}: não há bloco recolhível`).toHaveCount(0);
    await expect(fig.locator(".viz-toggle-codigo")).toHaveCount(0);
    await expect(fig.getByRole("button", { name: /código/ })).toHaveCount(0);
    await expect(fig.locator(".viz-foot")).toHaveCount(0);
    await expect(fig.locator(".viz-atalhos")).toHaveCount(0);
    await expect(fig.getByRole("button", { name: /Rodar|Próximo|Anterior/ })).toHaveCount(0);
    await expect(fig.locator(".viz-step")).not.toHaveText(/passo \d+ de \d+/);
  }
});

test("a corrida: o cabeçalho e o ✕ Fechar ficam parados enquanto o miolo rola", async ({ page }) => {
  await abrir(page, 1440, 600);
  await provarCamada1(await abrirPainel(page, muda(page, TITULO_CORRIDA)));
});

test("a estabilidade: o cabeçalho e o ✕ Fechar ficam parados enquanto o miolo rola", async ({ page }) => {
  await abrir(page, 1440, 600);
  await provarCamada1(await abrirPainel(page, muda(page, TITULO_ESTABILIDADE)));
});

test("o painel das peças novas é um diálogo de verdade: foco, Tab preso, Esc e rolagem travada", async ({
  page,
}) => {
  await abrir(page, 1440, 600);
  await abrirPainel(page, muda(page, TITULO_ESTABILIDADE));

  const overlay = page.locator(".viz-overlay-fit");
  await expect(overlay).toHaveAttribute("role", "dialog");
  await expect(overlay).toHaveAttribute("aria-modal", "true");
  // o rótulo do diálogo é o título DESTA peça, não um genérico
  await expect(overlay).toHaveAttribute(
    "aria-label",
    "Visualizador · a distância da troca decide a estabilidade"
  );
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");

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

test("a corrida cabe a 1512x900 e NÃO cabe a 1440x700: é o corolário da §3", async ({ page }) => {
  const medir = (page: Page) =>
    muda(page, TITULO_CORRIDA).evaluate((f) => {
      const hh = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--ccc-header-h")
      );
      return {
        altura: Math.round(f.getBoundingClientRect().height),
        orcamento: Math.round(window.innerHeight - (Number.isFinite(hh) && hh > 0 ? hh : 60) - 24),
      };
    });

  await abrir(page, 1512, 900);
  const alta = await medir(page);
  expect(alta.altura, `peça ${alta.altura}px, orçamento ${alta.orcamento}px`).toBeLessThanOrEqual(
    alta.orcamento
  );

  await abrir(page, 1440, 700);
  const baixa = await medir(page);
  // A régua do contrato responde "a camada 3 é necessária?", não "a camada 1 é
  // necessária?". Aqui a mesma peça passa do orçamento cem pixels mais abaixo,
  // e é por isso que ela precisava do painel.
  expect(baixa.altura, `peça ${baixa.altura}px, orçamento ${baixa.orcamento}px`).toBeGreaterThan(
    baixa.orcamento
  );
});
