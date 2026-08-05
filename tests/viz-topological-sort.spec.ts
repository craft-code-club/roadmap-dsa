import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// A casca adaptativa no visualizador de ordenação topológica (Kahn).
//
// Estes testes medem COMPORTAMENTO e leem RÓTULO. Contar elemento não prova
// nada: já passaram por suíte verde um visualizador sem botão nenhum e um
// painel com 0px de largura.
//
// Antes da casca, quem rolava dentro do painel expandido era a FIGURA INTEIRA
// (371, 571 e 691px de sobra, com o miolo em 0), e o que saía da tela eram os
// controles: no passo do pico o `▶ Rodar` era desenhado 290px (1512x900),
// 490px (1440x700) e 590px (1440x600) ABAIXO do pé da janela, e rolar até o fim
// levava o cabeçalho para 366, 566 e 666px acima do topo. Depois, quem rola é o
// miolo, o `▶ Rodar` fica dentro em todas as três (−156, −56 e −49px) e o
// cabeçalho não anda um pixel.
//
// No fluxo do artigo a peça pedia 1132–1173px contra 816 de orçamento; com o
// código recolhido pela medição ela pede 668–709px. Recolher devolve 474px.
//
// O tópico tem um visualizador só, e ele tem as três camadas: overlay, bloco de
// código, painel de variáveis e controles. Nenhum arquivo ficou de fora.
// ---------------------------------------------------------------------------

const URL = "/topico/topological-sort/";

// Notebook de 16", a régua que motivou a casca. Nela a peça passa do orçamento
// com o código aberto (1183 contra 816) e ele entra recolhido.
const BAIXA = { width: 1512, height: 900 };
// Alta o bastante para caber com o código aberto (orçamento 1516px).
const ALTA = { width: 1512, height: 1600 };
// Apertada de propósito: é a única régua em que o miolo do painel AINDA estoura
// com o código já recolhido (86px), e é onde a medição mais discordaria de quem
// abre o código na mão (581px de sobra com ele aberto).
const APERTADA = { width: 1440, height: 600 };

// Folga de subpixel, a mesma do hook.
const SLACK = 8;

// O preset do ciclo, e o passo do PICO dele: a nota final é a mais longa da peça
// (42px contra 22 no painel), e é o passo que dá ao miolo o que rolar. Medido
// andando a animação inteira dos três presets: o máximo é sempre o ÚLTIMO passo,
// e o eixo da altura é a nota, não a fila nem o desenho.
const PRESET_CICLO = "Com ciclo (impossível)";
const PASSOS_CICLO = 10;

const PRESET_CURSO = "Pré-requisitos de um curso";
const PRESET_PARALELO = "Muita coisa independente";

async function abrirPainel(page: Page, tamanho: { width: number; height: number }) {
  await page.setViewportSize(tamanho);
  await page.goto(URL);
  // `newPage({ viewportSize })` é ignorado em silêncio; afirmar a janela é a
  // única forma de saber que a medição saiu do tamanho que se pediu.
  expect(page.viewportSize()).toEqual(tamanho);
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "⤢ Expandir" }).click();
  const painel = page.locator(".viz-overlay-fit figure.viz-fit");
  await expect(painel).toBeVisible();
  return painel;
}

/** O cartão de variável de um nome, para ler RÓTULO e VALOR juntos. */
function cartao(escopo: ReturnType<Page["locator"]>, nome: string) {
  return escopo.locator(".viz-var", {
    has: escopo.page().locator(".viz-var-name", { hasText: new RegExp(`^${nome}$`) }),
  });
}

test.describe("ordenação topológica · casca adaptativa", () => {
  test("o cabeçalho e os controles ficam parados quando o miolo rola", async ({ page }) => {
    const painel = await abrirPainel(page, APERTADA);

    await painel.getByRole("button", { name: PRESET_CICLO, exact: true }).click();
    for (let i = 1; i < PASSOS_CICLO; i++) {
      await painel.getByRole("button", { name: "Próximo ›" }).click();
    }
    await expect(painel.locator(".viz-step")).toHaveText(`passo ${PASSOS_CICLO} de ${PASSOS_CICLO}`);

    // O `click()` do Playwright ROLA o contêiner para alcançar o alvo, então a
    // leitura de posição começa com o miolo zerado — senão eu meço o efeito do
    // meu próprio clique e concluo que o cabeçalho já andava.
    await painel.locator(".viz-body").evaluate((b) => { b.scrollTop = 0; });

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
        figuraSobra: f.scrollHeight - f.clientHeight,
      };
    });

    // As três coisas juntas, porque duas delas sozinhas aprovam a quebra que
    // devolve a rolagem para a figura inteira — que é exatamente o estado de
    // antes desta adaptação: o miolo estourou (acima), o miolo MESMO rolou, e a
    // figura não rola nem rolou.
    expect(depois.bodyScrollTop).toBeGreaterThan(0);
    expect(depois.figuraScrollTop).toBe(0);
    expect(depois.figuraSobra).toBeLessThanOrEqual(SLACK);
    expect(depois.cabecaTopo).toBe(antes.cabecaTopo);
    expect(depois.rodapePe).toBe(antes.rodapePe);

    // E o botão que faz o algoritmo andar continua À VISTA — não só alcançável:
    // o `click()` rola o contêiner para chegar no alvo, então clicar nele não
    // provaria nada.
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

    // Recolhido de verdade: o slot fechou a ALTURA, não só a largura (contrato
    // §7). Medido: 2px recolhido contra 531 aberto.
    const alturaCodigo = await painel
      .locator(".viz-code-slot")
      .evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(alturaCodigo).toBeLessThan(SLACK);
  });

  test("em tela alta o código já vem aberto, e o botão diz Ocultar código", async ({ page }) => {
    const painel = await abrirPainel(page, ALTA);
    const botao = painel.getByRole("button", { name: /código$/ });
    await expect(botao).toHaveText("Ocultar código");
    await expect(botao).toHaveAttribute("aria-expanded", "true");
    await expect(painel).toHaveAttribute("data-codigo", "on");

    // E o código aberto é o do Kahn, com o nome do arquivo.
    await expect(painel.locator(".viz-code-head")).toHaveText("kahn.py");
    const alturaCodigo = await painel
      .locator(".viz-code-slot")
      .evaluate((el) => Math.round(el.getBoundingClientRect().height));
    expect(alturaCodigo).toBeGreaterThan(80);
  });

  test("a escolha do aluno sobrevive à troca de preset, que pediria medição nova", async ({ page }) => {
    const painel = await abrirPainel(page, APERTADA);
    const botao = painel.getByRole("button", { name: /código$/ });

    // Numa janela apertada a medição recolhe de saída: é o que dá o que
    // contrariar. Com o código aberto o miolo estoura 581px aqui, então a
    // medição QUER recolher.
    await expect(botao).toHaveText("Mostrar código");
    await botao.click();
    await expect(botao).toHaveText("Ocultar código");
    await expect(painel).toHaveAttribute("data-codigo", "on");

    // A troca precisa mexer numa entrada REAL da medição: o preset é o único
    // valor de `measureOn`. E a PROVA NA TELA de que ele trocou é o cartão de
    // arestas, lido com rótulo e valor juntos.
    await expect(cartao(painel, "arestas")).toHaveText("arestas8");
    await painel.getByRole("button", { name: PRESET_PARALELO, exact: true }).click();
    await expect(cartao(painel, "arestas")).toHaveText("arestas4");

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
    await expect(passo).toHaveText("passo 1 de 18");

    // Uma ação só, nunca um par inverso: `ArrowRight` seguido de `ArrowLeft`
    // devolve a peça ao estado de origem e fica verde com a quebra aplicada.
    await page.keyboard.press("ArrowRight");
    await expect(passo).toHaveText("passo 2 de 18");

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

  test("o painel de variáveis casa rótulo e valor com o que está desenhado", async ({ page }) => {
    const painel = await abrirPainel(page, BAIXA);
    await painel.getByRole("button", { name: PRESET_CICLO, exact: true }).click();
    await expect(painel.locator(".viz-step")).toHaveText(`passo 1 de ${PASSOS_CICLO}`);

    // O grau de entrada tem uma ficha por vértice, e o "de 7" do cartão sai
    // dessa mesma contagem: é a invariante entre dois lugares da tela, e ela
    // vale em todo passo — melhor que um número decorado.
    const vertices = await painel.locator(".gr-dist-item").count();
    expect(vertices).toBe(7);

    for (let i = 1; i <= PASSOS_CICLO; i++) {
      if (i > 1) await painel.getByRole("button", { name: "Próximo ›" }).click();
      await expect(painel.locator(".viz-step")).toHaveText(`passo ${i} de ${PASSOS_CICLO}`);
      const naOrdem = await painel.locator(".tt-saida-item").count();
      const naFila = await painel.locator(".tt-aux-item").count();
      // Rótulo E valor no MESMO cartão: trocar dois valores de lugar mantém o
      // conjunto de textos idêntico e passa pelo guarda de idioma calado.
      await expect(cartao(painel, "na ordem")).toHaveText(`na ordem${naOrdem} de ${vertices}`);
      await expect(cartao(painel, "na fila")).toHaveText(`na fila${naFila}`);
    }

    // E o fim do preset do ciclo é o número que o artigo cita: a fila esvazia
    // com 4 dos 7 vértices na ordem, e o que sobra é o ciclo.
    await expect(cartao(painel, "na ordem")).toHaveText("na ordem4 de 7");
    await expect(painel.locator(".viz-note")).toHaveClass(/invalid/);
  });

  test("o desenho do grafo não está esticado, então não há vazio a devolver", async ({ page }) => {
    const painel = await abrirPainel(page, BAIXA);
    // O reflexo do contrato §7 (um `max-height` no bloco temático) só devolve
    // VAZIO, e só há vazio quando o renderizado é maior que o natural do
    // `viewBox`. Aqui os dois são iguais: um teto encolheria o texto dos
    // vértices, não o respiro.
    const svg = painel.locator("svg.tt-arv");
    const medido = await svg.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const vb = (el.getAttribute("viewBox") ?? "").split(/\s+/).map(Number);
      return { rendW: Math.round(r.width), rendH: Math.round(r.height), vbW: vb[2], vbH: vb[3] };
    });
    expect(medido.rendH).toBe(medido.vbH);
    expect(medido.rendW).toBe(medido.vbW);
    expect(medido.rendH).toBe(175);
  });
});
