import { test, expect, type Page, type Locator } from "@playwright/test";

// ---------------------------------------------------------------------------
// A casca adaptativa no visualizador da BST.
//
// Estes testes medem COMPORTAMENTO e leem RÓTULO. Contar elemento não prova
// nada: já passaram por suíte verde um visualizador sem botão nenhum e um
// painel com 0px de largura.
//
// Antes da casca, a peça rolava INTEIRA dentro do painel expandido e o
// `.viz-foot` nem existia — os controles moravam no miolo rolável. Medido: ao
// rolar até o fim, o cabeçalho subia 288px (preset "pelo meio") e 520px
// (preset "ordenado") numa janela de 900; 488/720 em 700; 588/820 em 600. O
// `▶ Rodar` era desenhado com a base em 1087 e 1319px nas TRÊS janelas, ou
// seja, até 719px abaixo do pé visível.
//
// O tópico tem um visualizador só, e ele tem as três camadas.
// ---------------------------------------------------------------------------

const URL = "/topico/bst/";

// Janela de notebook de 16", que é o caso que motivou a casca. Nela a peça
// passa do orçamento com o código à mostra (1149px contra 816).
const BAIXA = { width: 1512, height: 900 };
// Alta o bastante para o código caber aberto (orçamento 1316 contra 1149).
const ALTA = { width: 1512, height: 1400 };
// Apertada de propósito: garante que o miolo do painel tem o que rolar (188px
// de sobra medidos) e que a medição REALMENTE discordaria de quem abre o
// código na mão.
const APERTADA = { width: 1512, height: 700 };

const PRESET_BALANCEADO = "Inserindo pelo meio: 4 2 6 1 3 5 7";
const PRESET_DEGENERADO = "Inserindo ordenado: 1 2 3 4 5 6 7";

/** O passo mais alto da animação. NÃO é o passo 1 nem o último: é o 2 de 18. */
const PASSO_PICO = 2;

function noArtigo(page: Page): Locator {
  return page.locator("article figure.viz").first();
}

/** A peça depois de expandida: ela é portada para fora do artigo. */
function noPainel(page: Page): Locator {
  return page.locator(".viz-overlay figure.viz");
}

async function abrir(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto(URL);
  // As fontes chegam com `display: swap`: medir antes é medir o fallback, e a
  // casca só decide depois delas.
  await page.evaluate(() => document.fonts.ready);
  await expect(noArtigo(page)).toBeVisible();
  // `data-anim` volta para "on" quando a casca terminou de medir e decidir. É o
  // sinal que ela já publica; esperar por ele custa menos que um sono fixo e
  // não vira flake com a máquina cheia.
  await expect(noArtigo(page)).toHaveAttribute("data-anim", "on");
}

async function expandir(page: Page): Promise<Locator> {
  await noArtigo(page).getByRole("button", { name: "⤢ Expandir" }).click();
  const painel = noPainel(page);
  await expect(painel).toBeVisible();
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
 * a peça passa do orçamento, que aqui é o quadro ZERO (930 já passa de 816), e
 * a leitura seguinte pega o meio do percurso: medido, 1048 em vez de 1149.
 *
 * E "duas leituras iguais" não basta: com amostragem de 50ms sobre uma
 * transição de 320ms, dois quadros vizinhos arredondam para o mesmo inteiro no
 * meio do caminho e a função devolve 1048. São precisas TRÊS iguais seguidas —
 * 100ms sem mexer — para a altura estar mesmo parada.
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

test.describe("bst · a invariante da BST", () => {
  // §8.1: no expandido o cabeçalho e o rodapé ficam parados, e o botão que faz
  // o algoritmo andar nunca sai da tela.
  //
  // As três asserções de rolagem não são cerimônia: um teste que rola o
  // `.viz-body` sem provar que é ELE quem rola aprova justamente a quebra que
  // devolve a rolagem para a figura inteira — ali o `scrollTop` do miolo fica
  // em zero, o cabeçalho não se mexe, e o teste passa feliz.
  //
  // E o passo importa: a peça é mais alta no passo 2 que no 1 e que no último
  // (950 contra 930 no artigo), então o teste anda até o PICO antes de medir.
  test("expandido: cabeçalho e rodapé não se mexem quando o miolo rola até o fim", async ({ page }) => {
    await abrir(page, APERTADA);
    const painel = await expandir(page);

    // Até o pico, pela tecla: o `click()` do Playwright ROLA o contêiner para
    // alcançar o alvo, e isso mudaria justamente o que vou medir.
    const passo = painel.locator(".viz-step");
    for (let k = 1; k < PASSO_PICO; k++) await page.keyboard.press("ArrowRight");
    await expect(passo).toHaveText(/^passo 2 de \d+$/);

    const miolo = painel.locator(".viz-body");
    const cabeca = painel.locator(".viz-head");
    const rodar = painel.getByRole("button", { name: /Rodar|Pausar/ });

    // 1. o miolo é o que estoura...
    await expect
      .poll(() => miolo.evaluate((el) => el.scrollHeight - el.clientHeight))
      .toBeGreaterThan(8);
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

    // 3. e o cabeçalho não saiu do lugar. (Antes da casca ele subia 488px
    // nesta mesma janela de 700 de altura.)
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

    // A premissa medida DENTRO do teste: com o código à mostra a peça não
    // cabe. Sem ela, no dia em que a peça encolher isto vira decoração verde.
    await botao.click();
    await expect(botao).toHaveText("Ocultar código");
    const aberta = await alturaEstavel(fig);
    expect(aberta).toBeGreaterThan(orc);
    // Recolher vale 199px medidos (1149 → 950). O teto aqui é regressão.
    expect(aberta - recolhida).toBeGreaterThan(150);
    // A árvore de 7 nós não cabe no artigo nem recolhida (950 contra 816): o
    // que sobra é o desenho (436px), o percurso em ordem (135) e as fichas —
    // conteúdo, não respiro, e a camada 2 não alcança o artigo (contrato §9).
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
    // O bloco é mesmo o código DESTE visualizador, não um bloco qualquer.
    await expect(fig.locator(".viz-code-head")).toHaveText("insere.py");
  });

  // §8.4: a escolha explícita do aluno vence a medição e não é desfeita por
  // uma troca de estado que pediria medição nova.
  test("a escolha do aluno sobrevive a uma troca de estado que pede medição nova", async ({ page }) => {
    await abrir(page, APERTADA);
    const fig = noArtigo(page);
    const botao = fig.locator("button.viz-toggle-codigo");

    await expect(botao).toHaveText("Mostrar código");
    await botao.click();
    await expect(botao).toHaveText("Ocultar código");
    await expect.poll(() => altura(fig.locator(".viz-code-slot"))).toBeGreaterThan(60);

    // Trocar para o preset degenerado mexe nos DOIS valores de `measureOn` que
    // importam aqui (o preset e o número de passos, 18 → 29) e muda a altura da
    // peça em 251px. É uma troca que a medição discordaria mesmo.
    await fig.getByRole("button", { name: PRESET_DEGENERADO, exact: true }).click();

    // A entrada da medição mudou MESMO, e a leitura é do rótulo junto do valor.
    await ficha(fig, 1, "altura", "7");

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

    const total = (await passo.textContent())!.match(/de (\d+)/)![1];
    await expect(passo).toHaveText(`passo 1 de ${total}`);

    // Uma asserção DEPOIS DE CADA TECLA: `→` seguido de `←` se cancelam, e um
    // teste que só olha o fim aprova a quebra que ignora as duas.
    await page.keyboard.press("ArrowRight");
    await expect(passo).toHaveText(`passo 2 de ${total}`);
    await page.keyboard.press("ArrowRight");
    await expect(passo).toHaveText(`passo 3 de ${total}`);
    await page.keyboard.press("ArrowLeft");
    await expect(passo).toHaveText(`passo 2 de ${total}`);

    const rodar = painel.getByRole("button", { name: /Rodar|Pausar/ });
    await page.keyboard.press("Space");
    await expect(rodar).toHaveText("❚❚ Pausar");
    await page.keyboard.press("Space");
    await expect(rodar).toHaveText("▶ Rodar");
  });

  // A regra mais importante dos atalhos é o inverso deles: com o cursor num
  // campo, seta é do campo e espaço é do campo. Sequestrar isso deixa o campo
  // "Procurar" impossível de editar, o que é pior que não ter atalho.
  //
  // O campo é NUMÉRICO, onde `→` move o cursor sem mudar o valor. Então a régua
  // não é o valor mudar: é o passo NÃO andar e a animação NÃO começar. E a seta
  // é apertada DUAS VEZES na mesma direção, nunca ida e volta: um par de ações
  // inversas devolve a peça ao estado de origem e fica verde com a quebra.
  test("o campo 'Procurar' em edição manda na seta e no espaço", async ({ page }) => {
    await abrir(page, BAIXA);
    const painel = await expandir(page);
    await painel.getByRole("button", { name: "buscar", exact: true }).click();

    const campo = painel.locator("input.viz-input.k");
    const passo = painel.locator(".viz-step");
    const rodar = painel.getByRole("button", { name: /Rodar|Pausar/ });

    const total = (await passo.textContent())!.match(/de (\d+)/)![1];
    await campo.click();
    const valor = await campo.inputValue();

    await page.keyboard.press("ArrowRight");
    await expect(passo).toHaveText(`passo 1 de ${total}`);
    await page.keyboard.press("ArrowRight");
    await expect(passo).toHaveText(`passo 1 de ${total}`);
    await page.keyboard.press("Space");
    await expect(rodar).toHaveText("▶ Rodar");
    await expect(passo).toHaveText(`passo 1 de ${total}`);
    // O campo continua editável e intacto: a seta foi para o cursor.
    await expect(campo).toHaveValue(valor);
  });

  // No slider a seta é do slider — e a MARCHA DE ABERTURA é da peça, não do
  // hook. Esta peça abre no "1.5x" (`initialSpeed: 4`), porque a construção tem
  // de 18 a 29 passos e no 1x a reprodução inteira fica longa demais. Perder o
  // `initialSpeed` na migração compila e não muda teste nenhum — por isso ele
  // é afirmado aqui, pelo rótulo que o aluno lê.
  test("a marcha de abertura é 1.5x e a seta no slider é do slider", async ({ page }) => {
    await abrir(page, BAIXA);
    const painel = await expandir(page);
    const slider = painel.locator('input[type="range"]');
    const passo = painel.locator(".viz-step");
    const marcha = painel.locator(".viz-speed .val");

    await expect(marcha).toHaveText("1.5x");

    const total = (await passo.textContent())!.match(/de (\d+)/)![1];
    await slider.focus();
    const antes = await slider.inputValue();
    await page.keyboard.press("ArrowLeft");
    // O slider andou uma marcha para baixo...
    await expect(slider).not.toHaveValue(antes);
    await expect(marcha).toHaveText("1x");
    // ...e o passo não andou junto.
    await expect(passo).toHaveText(`passo 1 de ${total}`);
  });

  // O que a MEDIÇÃO contrariou, virado teste.
  //
  // O palpite óbvio para o pior caso de altura de uma árvore é "mais nós". Aqui
  // é falso: os dois presets têm os MESMOS 7 nós, e o que muda a altura é a
  // PROFUNDIDADE. Medido: o SVG vai de 190px (altura 3) para 422px (altura 7),
  // e a peça de 950 para 1201px no artigo — 232px de desenho a mais sem um nó a
  // mais. É por isso que `measureOn` leva o preset, e não uma contagem de nós.
  test("a árvore degenerada é mais alta que a balanceada com o mesmo número de nós", async ({ page }) => {
    await abrir(page, BAIXA);
    const fig = noArtigo(page);
    const desenho = fig.locator("svg.tt-arv");

    await fig.getByRole("button", { name: PRESET_BALANCEADO, exact: true }).click();
    await ficha(fig, 0, "nós", "7");
    await ficha(fig, 1, "altura", "3");
    const svgBalanceada = await altura(desenho);
    const pecaBalanceada = await altura(fig);

    await fig.getByRole("button", { name: PRESET_DEGENERADO, exact: true }).click();
    // O mesmo número de nós, lido no rótulo junto do valor...
    await ficha(fig, 0, "nós", "7");
    // ...e mais que o dobro da altura.
    await ficha(fig, 1, "altura", "7");
    const svgDegenerada = await altura(desenho);
    const pecaDegenerada = await altura(fig);

    expect(svgDegenerada - svgBalanceada).toBeGreaterThan(200);
    expect(pecaDegenerada - pecaBalanceada).toBeGreaterThan(200);

    // E o desenho está no tamanho NATURAL, não esticado: por isso um teto de
    // altura aqui destruiria conteúdo em vez de devolver vazio (contrato §3).
    // Se algum dia o `.tt-arv` ganhar `width: 100%`, esta asserção avisa.
    const esticao = await desenho.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const vb = (el as unknown as SVGSVGElement).viewBox.baseVal;
      return { rend: Math.round(r.height), natural: vb.height };
    });
    expect(esticao.rend).toBe(esticao.natural);
  });

  // Buscar exatamente a raiz devolve UM passo, e aí o contrato §6 manda sumir
  // com o contador, os atalhos e o rodapé inteiro. Isso é ~100px de peça a
  // menos sem que o preset tenha mudado — é por isso que `steps.length` está no
  // `measureOn`. E o caminho de volta continua na tela porque os presets e o
  // seletor de modo moram no MIOLO, não no rodapé.
  test("buscar a raiz devolve um passo só, some o rodapé e a volta continua no miolo", async ({ page }) => {
    await abrir(page, BAIXA);
    const fig = noArtigo(page);
    await fig.getByRole("button", { name: "buscar", exact: true }).click();
    await fig.locator("input.viz-input.k").fill("4");

    // Um passo só: sem linha do tempo não há reprodução nenhuma a desenhar.
    await expect(fig.locator(".viz-step")).toHaveCount(0);
    await expect(fig.locator(".viz-foot")).toHaveCount(0);
    await expect(fig.getByRole("button", { name: /Rodar|Pausar/ })).toHaveCount(0);
    // E a nota diz o que aconteceu, com o número de comparações.
    await expect(fig.locator(".viz-note")).toHaveText(/Achei 4 em 1 comparação\./);

    // O caminho de volta: os presets e o seletor de modo estão no miolo.
    await fig.getByRole("button", { name: "construir", exact: true }).click();
    await expect(fig.locator(".viz-step")).toHaveText("passo 1 de 18");
    await expect(fig.getByRole("button", { name: /Rodar|Pausar/ })).toHaveCount(1);
  });
});
