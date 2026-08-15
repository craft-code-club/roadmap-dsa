import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// A casca adaptativa no visualizador de DFS e BFS sobre o mesmo grafo.
//
// Estes testes medem COMPORTAMENTO e leem RÓTULO. Contar elemento não prova
// nada: já passaram por suíte verde um visualizador sem botão nenhum e um
// painel com 0px de largura. A régua aqui é sempre um número medido no
// navegador (altura, posição, deslocamento) ou o texto que o aluno lê.
//
// Antes da casca, quem rolava no painel expandido era a FIGURA INTEIRA, e ela
// levava o cabeçalho junto: rolando até o fim, o `✕ Fechar` e o contador de
// passo iam parar 280px (1512x900), 480px (1440x700) e 571px (1440x600) ACIMA
// do topo do painel. E o `▶ Rodar`, sem rolar nada, era desenhado 180–200,
// 380–400 e 471–491px ABAIXO do pé da janela. Depois, o cabeçalho fica a 1px do
// topo nas três réguas, quem rola é o miolo, e o `▶ Rodar` sai dentro da janela
// (−92, −52 e −49px).
//
// O tópico tem um visualizador só, e ele tem as três camadas: overlay, bloco de
// código, painel de variáveis e controles. Nenhum arquivo ficou de fora.
// ---------------------------------------------------------------------------

const URL = "/topicos/dfs-bfs/";

// Notebook de 16", o caso que motivou a casca. Nela a peça pede 1132px de um
// orçamento de 816 com o código aberto, e o código entra recolhido.
const BAIXA = { width: 1512, height: 900 };
// Alta o bastante para caber com o código aberto (orçamento 1516px).
const ALTA = { width: 1512, height: 1600 };
// Apertada de propósito: é onde o miolo do painel tem o que rolar (120–140px de
// sobra com o código recolhido) e onde a medição REALMENTE discordaria de quem
// abre o código na mão.
const APERTADA = { width: 1440, height: 700 };

// Folga de subpixel, a mesma do hook.
const SLACK = 8;

// Andando a animação inteira nos seis estados (2 modos × 3 presets) e nas três
// réguas, a amplitude de altura da peça é de **20px** — e ela vem da NOTA ter
// uma ou duas linhas, não da estrutura auxiliar: a pilha/fila é uma fileira
// `flex-wrap` que nunca passa de 4 fichas num contêiner que comporta muito
// mais. Não existe "passo do pico" a caçar aqui. O passo 27 é o máximo no BFS
// por 20px, e o que sustenta o teste de rolagem é a PREMISSA medida
// (`scrollHeight - clientHeight > SLACK`), não a escolha do passo.
const ULTIMO_PASSO = 27;

const PRESET_ALTO = "Com ciclo";

async function abrirPainel(page: Page, tamanho: { width: number; height: number }) {
  await page.setViewportSize(tamanho);
  await page.goto(URL);
  expect(page.viewportSize()).toEqual(tamanho);
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "⤢ Expandir" }).click();
  const painel = page.locator(".viz-overlay-fit figure.viz-fit");
  await expect(painel).toBeVisible();
  return painel;
}

/** A ficha "pico da fila"/"pico da pilha", com o rótulo e o valor juntos. */
function fichaDoPico(painel: ReturnType<Page["locator"]>) {
  return painel.locator(".bigo-stat", { hasText: /^pico da/ });
}

/** A linha do painel de variáveis cujo nome é "pilha" ou "fila". */
function linhaDaEstrutura(painel: ReturnType<Page["locator"]>) {
  return painel.locator(".viz-var", { hasText: /^(pilha|fila)/ });
}

/**
 * O número da linha "pilha"/"fila" tem que bater com quantas fichas o painel da
 * estrutura desenha. São dois lugares que dizem a mesma coisa por caminhos
 * diferentes, e é a discordância entre eles que denuncia campo trocado.
 */
async function conferirValorContraAsFichas(painel: ReturnType<Page["locator"]>) {
  const valor = await linhaDaEstrutura(painel).locator(".viz-var-val").innerText();
  const fichas = await painel.locator(".tt-aux .tt-aux-item").count();
  expect(Number(valor)).toBe(fichas);
}

test.describe("DFS e BFS no grafo · casca adaptativa", () => {
  test("o cabeçalho e os controles ficam parados quando o miolo rola", async ({ page }) => {
    const painel = await abrirPainel(page, APERTADA);
    await page.getByRole("button", { name: PRESET_ALTO, exact: true }).click();

    // Vai até o último passo, que é o mais alto do BFS. São 26 cliques num
    // controle do RODAPÉ: se ele estivesse dentro do miolo, o `click()` do
    // Playwright teria rolado o contêiner para alcançá-lo, e o `scrollTop`
    // abaixo não fecharia em zero. É uma asserção de graça.
    for (let i = 1; i < ULTIMO_PASSO; i++) {
      await painel.getByRole("button", { name: "Próximo ›" }).click();
    }
    await expect(painel.locator(".viz-step")).toHaveText(`passo ${ULTIMO_PASSO} de ${ULTIMO_PASSO}`);
    expect(await painel.locator(".viz-body").evaluate((b) => Math.round(b.scrollTop))).toBe(0);

    // PREMISSA: o miolo estoura mesmo. Sem isto, o dia em que a peça encolher o
    // teste vira decoração verde.
    const sobra = await painel
      .locator(".viz-body")
      .evaluate((b) => b.scrollHeight - b.clientHeight);
    expect(sobra).toBeGreaterThan(SLACK);

    const antes = await painel.evaluate((f) => {
      const r = f.getBoundingClientRect();
      return {
        cabecaTopo: Math.round(f.querySelector(".viz-head")!.getBoundingClientRect().top - r.top),
        rodapePe: Math.round(r.bottom - f.querySelector(".viz-foot")!.getBoundingClientRect().bottom),
      };
    });
    // A camada 1 é justamente cabeçalho colado no topo e rodapé colado no pé.
    expect(antes.cabecaTopo).toBeLessThanOrEqual(2);
    expect(antes.rodapePe).toBeLessThanOrEqual(2);

    await painel.locator(".viz-body").evaluate((b) => { b.scrollTop = b.scrollHeight; });
    await page.waitForTimeout(120);

    const depois = await painel.evaluate((f) => {
      const r = f.getBoundingClientRect();
      const body = f.querySelector(".viz-body") as HTMLElement;
      return {
        cabecaTopo: Math.round(f.querySelector(".viz-head")!.getBoundingClientRect().top - r.top),
        rodapePe: Math.round(r.bottom - f.querySelector(".viz-foot")!.getBoundingClientRect().bottom),
        bodyScrollTop: Math.round(body.scrollTop),
        figuraScrollTop: Math.round(f.scrollTop),
      };
    });

    // As três coisas juntas, porque duas delas sozinhas aprovam a quebra que
    // devolve a rolagem para a figura inteira: o miolo estourou (acima), o
    // miolo MESMO rolou, e a figura NÃO rolou.
    expect(depois.bodyScrollTop).toBeGreaterThan(0);
    expect(depois.figuraScrollTop).toBe(0);
    expect(depois.cabecaTopo).toBe(antes.cabecaTopo);
    expect(depois.rodapePe).toBe(antes.rodapePe);

    // E o botão que faz o algoritmo andar continua À VISTA — não só alcançável:
    // o `click()` do Playwright rola o contêiner para chegar no alvo, então
    // clicar nele não provaria nada.
    const rodar = painel.getByRole("button", { name: "▶ Rodar" });
    const caixa = (await rodar.boundingBox())!;
    expect(caixa.y).toBeGreaterThanOrEqual(0);
    expect(caixa.y + caixa.height).toBeLessThanOrEqual(APERTADA.height);
  });

  test("em tela baixa o código vem recolhido, e o botão diz Mostrar código", async ({ page }) => {
    const painel = await abrirPainel(page, BAIXA);
    const botao = painel.getByRole("button", { name: /código$/ });
    // O RÓTULO, não só o estado: botão que promete uma coisa e faz outra ensina
    // errado do mesmo jeito.
    await expect(botao).toHaveText("Mostrar código");
    await expect(botao).toHaveAttribute("aria-expanded", "false");
    await expect(painel).toHaveAttribute("data-codigo", "off");

    // Recolhido de verdade: o slot fechou a ALTURA, não só a largura da coluna.
    const alturaCodigo = await painel
      .locator(".viz-code-slot")
      .evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(alturaCodigo).toBeLessThan(8);
  });

  test("em tela alta o código já vem aberto, e o botão diz Ocultar código", async ({ page }) => {
    const painel = await abrirPainel(page, ALTA);
    const botao = painel.getByRole("button", { name: /código$/ });
    await expect(botao).toHaveText("Ocultar código");
    await expect(botao).toHaveAttribute("aria-expanded", "true");
    await expect(painel).toHaveAttribute("data-codigo", "on");

    // E o código aberto é o do modo selecionado, com o nome do arquivo. O
    // visualizador abre no BFS.
    await expect(painel.locator(".viz-code-head")).toHaveText("bfs.py");
    const alturaCodigo = await painel
      .locator(".viz-code-slot")
      .evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(alturaCodigo).toBeGreaterThan(80);
  });

  test("a escolha do aluno sobrevive à troca de modo, que pediria medição nova", async ({ page }) => {
    const painel = await abrirPainel(page, APERTADA);
    const botao = painel.getByRole("button", { name: /código$/ });

    // Numa janela apertada a medição recolhe de saída: é o que dá o que
    // contrariar. Com o código aberto o miolo pede ~390px a mais do que tem.
    await expect(botao).toHaveText("Mostrar código");
    await botao.click();
    await expect(botao).toHaveText("Ocultar código");
    await expect(painel).toHaveAttribute("data-codigo", "on");

    // A troca precisa mexer numa entrada REAL da medição: o modo está em
    // `measureOn`. PROVA NA TELA de que ele mudou mesmo — o arquivo do bloco de
    // código e o rótulo da estrutura auxiliar.
    await expect(painel.locator(".viz-code-head")).toHaveText("bfs.py");
    await page.getByRole("button", { name: "DFS (pilha)", exact: true }).click();
    await expect(painel.locator(".viz-code-head")).toHaveText("dfs.py");

    // "Está aberto agora" não é "continua aberto": amostra ao longo do
    // intervalo em que a medição rodaria.
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(80);
      await expect(painel).toHaveAttribute("data-codigo", "on");
    }
    await expect(botao).toHaveText("Ocultar código");
  });

  test("as setas andam a animação, e o slider de velocidade fica com a tecla", async ({ page }) => {
    const painel = await abrirPainel(page, BAIXA);
    const passo = painel.locator(".viz-step");
    await expect(passo).toHaveText("passo 1 de 27");

    // Uma ação só, nunca um par inverso: `ArrowRight` seguido de `ArrowLeft`
    // devolve a peça ao estado de origem e fica verde com a quebra aplicada.
    await page.keyboard.press("ArrowRight");
    await expect(passo).toHaveText("passo 2 de 27");

    await page.keyboard.press(" ");
    await expect(painel.getByRole("button", { name: "❚❚ Pausar" })).toBeVisible();
    await page.keyboard.press(" ");
    await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();

    // Com o cursor no slider, a seta é DO SLIDER. Sequestrar isso deixa o
    // controle impossível de usar, o que é pior que não ter atalho.
    const slider = painel.locator('input[type="range"]');
    await slider.focus();
    const passoAntes = await passo.innerText();
    await expect(painel.locator(".viz-speed .val")).toHaveText("1.5x");
    await page.keyboard.press("ArrowRight");
    await expect(painel.locator(".viz-speed .val")).toHaveText("2x");
    await expect(passo).toHaveText(passoAntes);
  });

  test("a peça abre na marcha 1.5x, que é a dela e não a padrão do hook", async ({ page }) => {
    const painel = await abrirPainel(page, BAIXA);
    // A marcha inicial era `useState(4)` antes da casca. Sem `initialSpeed` a
    // peça abriria no "1x" do hook, e nenhum outro teste notaria.
    await expect(painel.locator(".viz-speed .val")).toHaveText("1.5x");
    await expect(painel.locator('input[type="range"]')).toHaveValue("4");
  });

  test("o rótulo da estrutura auxiliar acompanha o modo, e vem colado no valor", async ({ page }) => {
    const painel = await abrirPainel(page, BAIXA);

    // Este é o ponto cego do `guarda-idioma.py` neste arquivo: `pico da {isDfs ?
    // "pilha" : "fila"}` é rótulo de tela colado numa interpolação JSX, e ele
    // não é visto por lá. Rótulo e valor lidos JUNTOS, na mesma ficha, é o que
    // pega a troca silenciosa.
    await expect(fichaDoPico(painel)).toContainText("pico da fila");
    await expect(painel.locator(".tt-painel-tit").first()).toContainText("Fila");
    await expect(painel.locator(".tt-painel-tit").first()).toContainText("sai o primeiro (FIFO)");
    await expect(linhaDaEstrutura(painel)).toContainText("fila");
    // Medido: no preset "Com ciclo" o pico é 3 nos dois modos.
    await expect(fichaDoPico(painel).locator("strong")).toHaveText("3");
    await conferirValorContraAsFichas(painel);

    await page.getByRole("button", { name: "DFS (pilha)", exact: true }).click();
    await expect(fichaDoPico(painel)).toContainText("pico da pilha");
    await expect(painel.locator(".tt-painel-tit").first()).toContainText("Pilha");
    await expect(painel.locator(".tt-painel-tit").first()).toContainText("sai o último (LIFO)");
    await expect(linhaDaEstrutura(painel)).toContainText("pilha");
    await expect(fichaDoPico(painel).locator("strong")).toHaveText("3");
    await conferirValorContraAsFichas(painel);
  });
});
