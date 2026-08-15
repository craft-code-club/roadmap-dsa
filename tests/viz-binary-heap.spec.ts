import { test, expect, type Page, type Locator } from "@playwright/test";

// ---------------------------------------------------------------------------
// A casca adaptativa no visualizador do heap binário.
//
// Estes testes medem COMPORTAMENTO e leem RÓTULO. Contar elemento não prova
// nada: já passaram por suíte verde um visualizador sem botão nenhum e um
// painel com 0px de largura.
//
// Antes da casca, a peça rolava INTEIRA dentro do painel expandido e o
// `.viz-foot` nem existia — os controles moravam no miolo rolável. Medido, nos
// 24 estados (4 presets x 3 operações x 2 regras) e nas três janelas: ao rolar
// até o fim o cabeçalho subia até 660px (1512x900), 860px (1440x700) e 960px
// (1440x600), e o `▶ Rodar` era desenhado até 559, 759 e 859px ABAIXO do pé
// visível. Depois: cabeçalho parado em 0px nos 72 estados, e o `▶ Rodar` de 49
// a 57px DENTRO da janela.
//
// No artigo a peça ia de 1190 a 1517px contra um orçamento de 816 (1512x900).
// Com o código recolhido pela medição ela vai de 956 a 1129 — 234 a 388px a
// menos. Continua passando do orçamento por 140 a 313px, e isso é esperado: a
// camada 2 não alcança o fluxo do artigo (contrato §9), e o que sobra é
// conteúdo (a árvore, o array, a saída, a nota e as fichas), não respiro.
//
// O tópico tem três visualizadores; só este tem overlay, e ele leva as três
// camadas. `HeapEstruturas` e `HeapIndicesVisualizer` não têm botão Expandir,
// então não há painel para arrumar neles.
// ---------------------------------------------------------------------------

const URL = "/topicos/binary-heap/";

// Janela de notebook de 16", o caso que motivou a casca. Nela a peça pede
// 1200px com o código à mostra contra 816 de orçamento.
const BAIXA = { width: 1512, height: 900 };
// Alta o bastante para o código caber aberto: a decisão vira entre 1200 e 1300
// de janela (orçamento 1116 x 1216 contra os 1200px da peça aberta).
const ALTA = { width: 1512, height: 1400 };
// Apertada de propósito: garante que o miolo do painel tem o que rolar (199 a
// 219px medidos ao longo da animação) e que a medição REALMENTE discordaria de
// quem abre o código na mão.
const APERTADA = { width: 1512, height: 700 };

const PRESET_SEIS = "Ordem de chegada: 3 5 2 1 4 6";
const PRESET_NOVE = "Chegando em ordem: 1 2 3 4 5 6 7 8 9";
const PRESET_OITO = "Com repetidos: 20 15 10 40 50 100 25 15";

/**
 * A peça NÃO abre no passo 0: `firstMeaningfulStep` pula até a primeira árvore
 * com quatro nós, que no preset padrão é o passo 9 de 21.
 */
const PASSO_DE_ABERTURA = "passo 9 de 21";
const TOTAL_PADRAO = 21;

// A página tem OUTRO `figure.viz` (o HeapIndicesVisualizer) com o seu próprio
// `.viz-step`, `.bigo-stat` e `input[type=range]`. Medido: `.viz-step` casa 2 na
// página e 1 dentro da peça. Todo seletor daqui é escopado por isso — um
// seletor ambíguo não dá erro, devolve o PRIMEIRO elemento.
//
// E o escopo diz QUAL peça é, não quantas têm a casca: `article figure.viz-fit`
// era o seletor daqui e virou armadilha quando o vizinho entrou na casca — ele
// passou a casar 2 e derrubou os 8 testes do arquivo. Contar `.viz-fit` é
// afirmar o cronograma da migração, não o produto.
function noArtigo(page: Page): Locator {
  return page
    .locator("article figure.viz")
    .filter({ hasText: "a árvore e o array do heap se movendo juntos" });
}

/** A peça depois de expandida: ela é portada para fora do artigo. */
function noPainel(page: Page): Locator {
  return page.locator(".viz-overlay figure.viz-fit");
}

async function abrir(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto(URL);
  // As fontes chegam com `display: swap`: medir antes é medir o fallback, e a
  // casca só decide depois delas.
  await page.evaluate(() => document.fonts.ready);
  await expect(noArtigo(page)).toBeVisible();
  // A janela pedida é a janela real. `viewportSize` como OPÇÃO é ignorada em
  // silêncio noutro caminho da API, e três janelas viram uma sem ninguém avisar.
  expect(page.viewportSize()).toEqual(viewport);
  // `data-anim` volta para "on" quando a casca terminou de medir e decidir. É o
  // sinal que ela já publica; esperar por ele custa menos que um sono fixo e
  // não vira flake com a máquina cheia.
  await expect(noArtigo(page)).toHaveAttribute("data-anim", "on");
}

async function expandir(page: Page): Promise<Locator> {
  await noArtigo(page).getByRole("button", { name: "⤢ Expandir" }).click();
  const painel = noPainel(page);
  await expect(painel).toBeVisible();
  // `toBeVisible()` NÃO quer dizer "pronto para o teclado": o listener de
  // `keydown` nasce num efeito passivo, e a tecla enviada antes some sem erro
  // nenhum — o que imita flake perfeitamente. O foco entrando na figura é o
  // efeito irmão desse, e esperar por ele é a pré-condição que falta.
  await expect(painel).toBeFocused();
  return painel;
}

async function altura(loc: Locator): Promise<number> {
  return loc.evaluate((el) => Math.round(el.getBoundingClientRect().height));
}

/**
 * A altura depois que ela PARA de mudar.
 *
 * A transição da casca dura 0,32s — curta o bastante para o Playwright
 * atravessar sem perceber, longa o bastante para mudar a conta. Um
 * `expect.poll(...).toBeGreaterThan(orc)` fica verde no primeiro quadro em que
 * a peça passa do orçamento e a leitura seguinte pega o meio do percurso. E
 * duas leituras iguais não bastam: uma transição passa por patamares, e dois
 * quadros vizinhos arredondam para o mesmo inteiro no meio do caminho. São
 * precisas TRÊS iguais seguidas.
 */
async function alturaEstavel(loc: Locator): Promise<number> {
  let anterior = -1;
  let iguais = 0;
  for (let k = 0; k < 60; k++) {
    const agora = await altura(loc);
    iguais = agora === anterior ? iguais + 1 : 0;
    if (iguais >= 3) return agora;
    anterior = agora;
    await loc.page().waitForTimeout(50);
  }
  return anterior;
}

/** O orçamento do artigo: a janela menos o cabeçalho fixo e um respiro. */
async function orcamento(page: Page): Promise<number> {
  return page.evaluate(() => {
    const h =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ccc-header-h")) || 60;
    return window.innerHeight - h - 24;
  });
}

/**
 * Lê uma ficha de estatística pelo ÍNDICE e confere o rótulo junto do valor.
 *
 * Ler os dois no mesmo cartão é o que pega a troca de posição: o guarda de
 * idioma compara o CONJUNTO de textos, não onde cada um aparece, então dois
 * campos invertidos passam verde por lá e mentem na tela.
 */
async function ficha(fig: Locator, i: number, rotulo: string, valor: string) {
  const cartao = fig.locator(".bigo-stat").nth(i);
  await expect(cartao.locator("span")).toHaveText(rotulo);
  await expect(cartao.locator("strong")).toHaveText(valor);
}

/**
 * Amostra o estado do bloco recolhível N vezes ao longo de `ms` e devolve as
 * amostras que falharam.
 *
 * Quando a promessa é PERMANÊNCIA ("a escolha do aluno sobrevive"), uma espera
 * fixa seguida de uma leitura olha um instante só. Amostrar responde a pergunta
 * certa: nenhum instante da janela pode ter falhado.
 */
async function amostrarAberto(page: Page, fig: Locator, ms = 900, n = 9): Promise<string[]> {
  const falhas: string[] = [];
  for (let k = 0; k < n; k++) {
    const alturaSlot = await altura(fig.locator(".viz-code-slot"));
    const rotulo = (await fig.locator("button.viz-toggle-codigo").textContent()) ?? "";
    if (alturaSlot <= 60 || rotulo !== "Ocultar código") {
      falhas.push(`aos ${Math.round((k * ms) / n)}ms: slot=${alturaSlot}px, rótulo=${JSON.stringify(rotulo)}`);
    }
    await page.waitForTimeout(ms / n);
  }
  return falhas;
}

test.describe("binary-heap · a árvore e o array se movendo juntos", () => {
  // §8.1: no expandido o cabeçalho e o rodapé ficam parados, e o botão que faz
  // o algoritmo andar nunca sai da tela.
  //
  // As três asserções de rolagem não são cerimônia: um teste que rola o
  // `.viz-body` sem provar que é ELE quem rola aprova justamente a quebra que
  // devolve a rolagem para a figura inteira — ali o `scrollTop` do miolo fica
  // em zero, o cabeçalho não se mexe, e o teste passa feliz.
  //
  // E o passo importa. A sobra do miolo é maior no ÚLTIMO passo desta animação
  // (219px contra 199 no menor), então o teste anda até lá antes de medir.
  test("expandido: cabeçalho e rodapé não se mexem quando o miolo rola até o fim", async ({ page }) => {
    await abrir(page, APERTADA);
    const painel = await expandir(page);
    const passo = painel.locator(".viz-step");
    await expect(passo).toHaveText(PASSO_DE_ABERTURA);

    // Até o último passo, pela TECLA: o `click()` do Playwright ROLA o
    // contêiner para alcançar o alvo, e isso mudaria justamente o que vou medir.
    for (let k = 9; k < TOTAL_PADRAO; k++) await page.keyboard.press("ArrowRight");
    await expect(passo).toHaveText(`passo ${TOTAL_PADRAO} de ${TOTAL_PADRAO}`);

    const miolo = painel.locator(".viz-body");
    const cabeca = painel.locator(".viz-head");
    const rodar = painel.getByRole("button", { name: /Rodar|Pausar/ });

    // 1. o miolo é o que estoura...
    await expect
      .poll(() => miolo.evaluate((el) => el.scrollHeight - el.clientHeight))
      .toBeGreaterThan(8);
    // ...e a leitura do cabeçalho parte do topo: o `click()` de um passo
    // anterior teria rolado o contêiner sozinho, e o cabeçalho "andaria" por
    // causa do meu próprio teste.
    expect(await miolo.evaluate((el) => Math.round(el.scrollTop))).toBe(0);

    const topoAntes = await cabeca.evaluate((el) => Math.round(el.getBoundingClientRect().top));
    // O rótulo importa tanto quanto a posição: um botão no lugar certo dizendo
    // a coisa errada ensina errado do mesmo jeito.
    await expect(rodar).toHaveText("▶ Rodar");
    await expect(rodar).toBeInViewport();

    // 2. ...e é ele que rola, não a figura inteira.
    await miolo.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await expect.poll(() => miolo.evaluate((el) => Math.round(el.scrollTop))).toBeGreaterThan(8);
    expect(await painel.evaluate((f) => Math.round(f.scrollTop))).toBe(0);

    // 3. e o cabeçalho não saiu do lugar. (Antes da casca ele subia 428px nesta
    // mesma janela de 700 de altura, e 660px na de 900.)
    const topoDepois = await cabeca.evaluate((el) => Math.round(el.getBoundingClientRect().top));
    expect(Math.abs(topoDepois - topoAntes)).toBeLessThanOrEqual(1);
    await expect(rodar).toBeInViewport();
    await expect(rodar).toHaveText("▶ Rodar");

    // E o rodapé está colado no pé da figura, não empurrado para fora dela.
    const folga = await painel.evaluate((f) => {
      const foot = f.querySelector(".viz-foot") as HTMLElement;
      return Math.round(f.getBoundingClientRect().bottom - foot.getBoundingClientRect().bottom);
    });
    expect(folga).toBeLessThanOrEqual(2);
  });

  // §8.2: em tela baixa a peça não cabe com o código à mostra, então ele
  // recolhe — e o botão passa a dizer o que faria aparecer.
  test("tela baixa: o botão diz 'Mostrar código' e o bloco está recolhido", async ({ page }) => {
    await abrir(page, BAIXA);
    const fig = noArtigo(page);
    const botao = fig.locator("button.viz-toggle-codigo");

    await expect(botao).toHaveText("Mostrar código");
    await expect(botao).toHaveAttribute("aria-expanded", "false");
    // Recolhido de verdade: o slot perde a ALTURA, não só a largura. Zerar a
    // trilha da coluna deixava a linha do grid com a altura do código.
    await expect.poll(() => altura(fig.locator(".viz-code-slot"))).toBeLessThanOrEqual(4);

    const recolhida = await alturaEstavel(fig);
    const orc = await orcamento(page);

    // A premissa medida DENTRO do teste, e DEPOIS da asserção: com o código à
    // mostra a peça não cabe. Sem ela, no dia em que a peça encolher isto vira
    // decoração verde.
    await botao.click();
    await expect(botao).toHaveText("Ocultar código");
    const aberta = await alturaEstavel(fig);
    expect(aberta).toBeGreaterThan(orc);
    // Recolher vale 244px medidos (1200 → 956). O teto aqui é regressão.
    expect(aberta - recolhida).toBeGreaterThan(200);
    // E mesmo recolhida a peça ainda passa do orçamento (956 contra 816): a
    // camada 2 não alcança o fluxo do artigo (contrato §9), e o que sobra é
    // conteúdo. Dizer isso com número é melhor que arredondar para "coube".
    expect(recolhida).toBeGreaterThan(orc);
    expect(recolhida).toBeLessThan(1000);
  });

  // §8.3: onde cabe, o código já vem à mostra — a medição decide, não um
  // breakpoint de largura. A janela aqui é MAIS ALTA, não mais larga.
  test("tela alta: o código já vem aberto e o botão diz 'Ocultar código'", async ({ page }) => {
    await abrir(page, ALTA);
    const fig = noArtigo(page);
    const botao = fig.locator("button.viz-toggle-codigo");

    await expect(botao).toHaveText("Ocultar código");
    await expect(botao).toHaveAttribute("aria-expanded", "true");
    await expect.poll(() => altura(fig.locator(".viz-code-slot"))).toBeGreaterThan(60);
    // O bloco é mesmo o código DESTE visualizador, no modo em que ele abre.
    await expect(fig.locator(".viz-code-head")).toHaveText("push.py");
  });

  // §8.4: a escolha explícita do aluno vence a medição e não é desfeita por
  // uma troca de estado que pediria medição nova.
  test("a escolha do aluno sobrevive a uma troca de estado que pede medição nova", async ({ page }) => {
    await abrir(page, BAIXA);
    const fig = noArtigo(page);
    const botao = fig.locator("button.viz-toggle-codigo");

    await expect(botao).toHaveText("Mostrar código");
    await botao.click();
    await expect(botao).toHaveText("Ocultar código");
    await expect.poll(() => altura(fig.locator(".viz-code-slot"))).toBeGreaterThan(60);

    // Trocar a operação mexe no `mode`, que está em `measureOn`: o código vai
    // de 9 para 15 linhas, entra um painel de saída inteiro, e a peça recolhida
    // sobe de 956 para 1051px contra 816 de orçamento. É uma troca com que a
    // medição discordaria mesmo.
    await fig.getByRole("button", { name: "remover o topo", exact: true }).click();

    // A entrada da medição mudou MESMO, e a leitura é do rótulo junto do valor:
    // o modo remover abre com o heap já montado, seis elementos.
    await ficha(fig, 0, "elementos", "6");
    await expect(fig.locator(".viz-code-head")).toHaveText("pop.py");

    // A janela amostrada cobre a medição E a transição de 0,32s que viria
    // depois dela. Exigir que NENHUMA amostra tenha falhado é o que separa
    // "está aberto" de "continua aberto".
    expect(await amostrarAberto(page, fig)).toEqual([]);
  });

  // §8.5: as teclas dirigem a animação dentro do painel.
  test("expandido: as setas andam o passo e o espaço roda", async ({ page }) => {
    await abrir(page, BAIXA);
    const painel = await expandir(page);
    const passo = painel.locator(".viz-step");

    await expect(passo).toHaveText(PASSO_DE_ABERTURA);

    // Uma asserção DEPOIS DE CADA TECLA: `→` seguido de `←` se cancelam, e um
    // teste que só olha o fim aprova a quebra que ignora as duas.
    await page.keyboard.press("ArrowRight");
    await expect(passo).toHaveText(`passo 10 de ${TOTAL_PADRAO}`);
    await page.keyboard.press("ArrowRight");
    await expect(passo).toHaveText(`passo 11 de ${TOTAL_PADRAO}`);
    await page.keyboard.press("ArrowLeft");
    await expect(passo).toHaveText(`passo 10 de ${TOTAL_PADRAO}`);

    const rodar = painel.getByRole("button", { name: /Rodar|Pausar/ });
    await page.keyboard.press("Space");
    await expect(rodar).toHaveText("❚❚ Pausar");
    await page.keyboard.press("Space");
    await expect(rodar).toHaveText("▶ Rodar");
  });

  // A regra mais importante dos atalhos é o inverso deles: campo em edição
  // manda. Esta peça não tem campo de texto — o único campo dela é o slider de
  // velocidade, e ali a seta é do slider.
  //
  // E a MARCHA DE ABERTURA é da peça, não do hook: ela abre no "1.5x"
  // (`initialSpeed: 4`), porque as animações chegam a 51 passos e no 1x a
  // reprodução inteira fica longa demais. Perder o `initialSpeed` na migração
  // compila e não muda teste nenhum — por isso ele é afirmado aqui, pelo
  // rótulo que o aluno lê.
  //
  // A seta é apertada DUAS VEZES na mesma direção, nunca ida e volta: um par de
  // ações inversas devolve a peça ao estado de origem e fica verde com a quebra.
  test("a marcha de abertura é 1.5x e a seta no slider é do slider", async ({ page }) => {
    await abrir(page, BAIXA);
    const painel = await expandir(page);
    const slider = painel.locator('input[type="range"]');
    const passo = painel.locator(".viz-step");
    const marcha = painel.locator(".viz-speed .val");

    await expect(marcha).toHaveText("1.5x");
    await expect(passo).toHaveText(PASSO_DE_ABERTURA);

    await slider.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(marcha).toHaveText("1x");
    await expect(passo).toHaveText(PASSO_DE_ABERTURA);
    await page.keyboard.press("ArrowLeft");
    await expect(marcha).toHaveText("0.75x");
    await expect(passo).toHaveText(PASSO_DE_ABERTURA);

    // E o espaço com um botão em foco é do botão: ele anda UM passo (ativação
    // do `Próximo ›`) em vez de começar a reprodução.
    const rodar = painel.getByRole("button", { name: /Rodar|Pausar/ });
    await painel.getByRole("button", { name: "Próximo ›" }).focus();
    await page.keyboard.press("Space");
    await expect(passo).toHaveText(`passo 10 de ${TOTAL_PADRAO}`);
    await expect(rodar).toHaveText("▶ Rodar");
  });

  // O que a MEDIÇÃO contrariou, virado teste.
  //
  // O palpite óbvio para o pior caso de altura de uma árvore é "mais nós". Aqui
  // é falso duas vezes. O eixo do desenho é a PROFUNDIDADE: 6 valores dão dois
  // níveis (192px) e 9 dão três (252px), então 50% mais elementos custam UM
  // nível — os 60px de `LEVEL_Y`. E de 8 para 9 valores a altura não muda NADA,
  // porque os dois cabem em três níveis: o desenho é idêntico ao pixel.
  //
  // É por isso que `measureOn` leva o preset, e não uma contagem de nós.
  test("o desenho cresce por NÍVEL, não por elemento: 8 e 9 valores dão a mesma altura", async ({ page }) => {
    await abrir(page, BAIXA);
    const fig = noArtigo(page);
    const desenho = fig.locator("svg.tt-arv");

    // O modo "construir" abre com o array cru inteiro, então a ficha
    // "elementos" mostra o tamanho do preset — que é o que quero comparar.
    await fig.getByRole("button", { name: "construir de uma vez", exact: true }).click();

    await fig.getByRole("button", { name: PRESET_SEIS, exact: true }).click();
    await ficha(fig, 0, "elementos", "6");
    await ficha(fig, 1, "altura", "3");
    const seis = await altura(desenho);

    await fig.getByRole("button", { name: PRESET_OITO, exact: true }).click();
    await ficha(fig, 0, "elementos", "8");
    await ficha(fig, 1, "altura", "4");
    const oito = await altura(desenho);

    await fig.getByRole("button", { name: PRESET_NOVE, exact: true }).click();
    await ficha(fig, 0, "elementos", "9");
    await ficha(fig, 1, "altura", "4");
    const nove = await altura(desenho);

    // Um nível a mais custa exatamente `LEVEL_Y`...
    expect(nove - seis).toBe(60);
    // ...e o elemento a mais que NÃO abre nível não custa nada.
    expect(nove - oito).toBe(0);

    // E o desenho está no tamanho NATURAL, não esticado: por isso um teto de
    // altura aqui destruiria conteúdo em vez de devolver vazio (contrato §3).
    // Medido em 72 estados: esticão de 0px em todos. Se algum dia o `.tt-arv`
    // ganhar `width: 100%`, esta asserção avisa.
    const esticao = await desenho.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const vb = (el as unknown as SVGSVGElement).viewBox.baseVal;
      return { rend: Math.round(r.height), natural: vb.height };
    });
    expect(esticao.rend).toBe(esticao.natural);
  });

  // A peça não abre no passo 0: no modo inserir o passo 0 é o heap VAZIO, e
  // abrir um visualizador de heap sem heap na tela não ensina nada. O ajuste é
  // na fase de render, não num efeito — é isso que faz o HTML do build estático
  // já sair no passo certo (contrato §9). Perder isso compila e não quebra mais
  // nada, então a prova é ler o `out/` cru, sem JavaScript.
  test("abre no primeiro passo com árvore de verdade, inclusive no HTML do build", async ({ page, request }) => {
    const html = await (await request.get(URL)).text();
    // Duas peças da página têm `.viz-step`; a do heap é a que conta passos.
    expect(html).toContain("passo <!-- -->9<!-- --> de <!-- -->21");

    await abrir(page, BAIXA);
    const fig = noArtigo(page);
    await expect(fig.locator(".viz-step")).toHaveText(PASSO_DE_ABERTURA);
    // Quatro nós na tela, lidos no rótulo junto do valor.
    await ficha(fig, 0, "elementos", "4");

    // E o ↺ continua sendo o caminho para ver a inserção desde o heap vazio.
    await fig.getByRole("button", { name: "Reiniciar" }).click();
    await expect(fig.locator(".viz-step")).toHaveText(`passo 1 de ${TOTAL_PADRAO}`);
    await ficha(fig, 0, "elementos", "1");
  });
});
