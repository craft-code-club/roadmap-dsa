import { test, expect, type Page, type Locator } from "@playwright/test";

// ---------------------------------------------------------------------------
// A casca adaptativa nos três visualizadores de Two Pointers.
//
// Estes testes medem COMPORTAMENTO e leem RÓTULO. Contar elemento não prova
// nada: já passaram por suíte verde um visualizador sem botão nenhum e um
// painel com 0px de largura. Então aqui a régua é sempre um número medido no
// navegador (altura, posição, deslocamento) ou o texto que o aluno lê.
//
// O tópico de Two Pointers é o caso canônico da armadilha de idioma: os
// rótulos `esq`/`dir` e o Python da tela são conteúdo didático em PORTUGUÊS
// morando dentro de string. O último teste existe para que um rename de
// identificador nunca mais os arraste junto.
// ---------------------------------------------------------------------------

const URL = "/topico/two-pointers/";

// Janela de notebook de 16", que é o caso que motivou a casca.
const BAIXA = { width: 1512, height: 900 };
// Alta o bastante para as três peças caberem com o código à mostra.
const ALTA = { width: 1512, height: 1500 };
// Apertada de propósito: garante que o miolo do painel tem o que rolar nos
// três visualizadores, inclusive no palíndromo, que em 900px cabia inteiro.
const APERTADA = { width: 1512, height: 700 };

// `preset` é o índice de um preset que muda de verdade o que está em
// `measureOn` — e `pecas`/`quantas` provam essa mudança na tela antes do teste
// concluir qualquer coisa. Sem isso o teste da escolha manual passa vazio: um
// preset que só troca o alvo não pede medição nova, então não há medição
// alguma para a escolha do aluno vencer.
const VISUALIZADORES = [
  { i: 0, nome: "ponteiros convergentes", arquivo: "solucao.py", preset: 3, pecas: ".viz-cell", quantas: 4 },
  { i: 1, nome: "palíndromo", arquivo: "palindromo.py", preset: 1, pecas: ".viz-cell", quantas: 6 },
  { i: 2, nome: "rápido e lento", arquivo: "ciclo.py", preset: 1, pecas: ".tp-svg circle", quantas: 6 },
];

/** A peça no fluxo do artigo. */
function noArtigo(page: Page, i: number): Locator {
  return page.locator("article figure.viz").nth(i);
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
  await expect(page.locator("article figure.viz-fit").first()).toBeVisible();
}

async function expandir(page: Page, i: number): Promise<Locator> {
  await noArtigo(page, i).getByRole("button", { name: "⤢ Expandir" }).click();
  const painel = noPainel(page);
  await expect(painel).toBeVisible();
  return painel;
}

/** Altura renderizada de um elemento, já esperando a transição de 0,32s parar. */
async function altura(loc: Locator): Promise<number> {
  return loc.evaluate((el) => Math.round(el.getBoundingClientRect().height));
}

for (const v of VISUALIZADORES) {
  test.describe(`two-pointers · ${v.nome}`, () => {
    // §8.1 do contrato: no expandido o cabeçalho e o rodapé ficam parados, e o
    // botão que faz o algoritmo andar nunca sai da tela. Antes da casca a
    // figura inteira rolava e o cabeçalho subia 99, 163 e 476px (medido).
    //
    // A janela é apertada de propósito e o código é aberto antes de rolar: sem
    // garantir que o miolo TEM o que rolar, o teste vira uma pergunta vazia —
    // ele passaria igual num painel onde a rolagem mudou de lugar. Por isso a
    // primeira asserção é que o miolo estoura, e a segunda é que ele mesmo
    // rolou.
    test("expandido: cabeçalho e rodapé não se mexem quando o miolo rola até o fim", async ({ page }) => {
      await abrir(page, APERTADA);
      const painel = await expandir(page, v.i);

      const mostrar = painel.locator("button.viz-toggle-codigo");
      if ((await mostrar.textContent()) === "Mostrar código") await mostrar.click();
      await expect(mostrar).toHaveText("Ocultar código");

      const miolo = painel.locator(".viz-body");
      const cabeca = painel.locator(".viz-head");
      const rodar = painel.getByRole("button", { name: /Rodar|Pausar/ });

      // 1. o miolo é o que estoura...
      await expect
        .poll(() => miolo.evaluate((el) => el.scrollHeight - el.clientHeight))
        .toBeGreaterThan(8);

      const topoAntes = await cabeca.evaluate((el) => Math.round(el.getBoundingClientRect().top));
      // O rótulo importa tanto quanto a posição: um botão no lugar certo
      // dizendo a coisa errada ensina errado do mesmo jeito.
      await expect(rodar).toHaveText("▶ Rodar");
      await expect(rodar).toBeInViewport();

      // 2. ...e é ele que rola, não a figura inteira.
      await miolo.evaluate((el) => { el.scrollTop = el.scrollHeight; });
      await expect.poll(() => miolo.evaluate((el) => Math.round(el.scrollTop))).toBeGreaterThan(8);
      expect(await painel.evaluate((f) => Math.round(f.scrollTop))).toBe(0);

      // 3. e o cabeçalho não saiu do lugar.
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
      const fig = noArtigo(page, v.i);
      const botao = fig.locator("button.viz-toggle-codigo");

      await expect(botao).toHaveText("Mostrar código");
      await expect(botao).toHaveAttribute("aria-expanded", "false");
      // Recolhido de verdade: o slot perde a ALTURA, não só a largura. Zerar a
      // trilha da coluna deixava a linha do grid com a altura do código.
      await expect.poll(() => altura(fig.locator(".viz-code-slot"))).toBeLessThanOrEqual(4);

      // E a peça inteira passa a caber na janela, que é o ponto de tudo isto.
      const orcamento = await page.evaluate(() => {
        const h = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ccc-header-h")) || 60;
        return window.innerHeight - h - 24;
      });
      expect(await altura(fig)).toBeLessThanOrEqual(orcamento);
    });

    // §8.3: onde cabe, o código já vem à mostra — a medição decide, não um
    // breakpoint de largura.
    test("tela alta: o código já vem aberto e o botão diz 'Ocultar código'", async ({ page }) => {
      await abrir(page, ALTA);
      const fig = noArtigo(page, v.i);
      const botao = fig.locator("button.viz-toggle-codigo");

      await expect(botao).toHaveText("Ocultar código");
      await expect(botao).toHaveAttribute("aria-expanded", "true");
      await expect.poll(() => altura(fig.locator(".viz-code-slot"))).toBeGreaterThan(100);
      // O bloco é mesmo o código deste visualizador, não um bloco qualquer.
      await expect(fig.locator(".viz-code-head")).toHaveText(v.arquivo);
    });

    // §8.4: a escolha explícita do aluno vence a medição e não é desfeita por
    // uma troca de estado que pediria medição nova (`measureOn`).
    // A janela é a apertada de propósito: em 900px sobrava pouco, e num
    // visualizador a peça com o código aberto cabia por pouco — aí a medição
    // não queria recolher nada e o teste passava mesmo com a trava removida.
    // Prova de quebra só vale quando a medição REALMENTE discordaria do aluno.
    test("a escolha do aluno sobrevive a uma troca de estado que pede medição nova", async ({ page }) => {
      await abrir(page, APERTADA);
      const fig = noArtigo(page, v.i);
      const botao = fig.locator("button.viz-toggle-codigo");

      await expect(botao).toHaveText("Mostrar código");
      await botao.click();
      await expect(botao).toHaveText("Ocultar código");
      await expect.poll(() => altura(fig.locator(".viz-code-slot"))).toBeGreaterThan(100);

      // Troca um preset que muda o que está em `measureOn` e dispara nova
      // medição. Sem a trava da escolha manual, ela recolheria o código.
      await fig.locator("button.bigo-chip").nth(v.preset).click();
      // A entrada da medição mudou MESMO: sem esta prova o teste passaria
      // celebrando uma medição que nunca aconteceu.
      await expect(fig.locator(v.pecas)).toHaveCount(v.quantas);
      await page.waitForTimeout(500); // deixa a medição e a transição rodarem

      await expect(botao).toHaveText("Ocultar código");
      expect(await altura(fig.locator(".viz-code-slot"))).toBeGreaterThan(100);
    });

    // §8.5: as teclas dirigem a animação dentro do painel.
    test("expandido: as setas andam o passo e o espaço roda", async ({ page }) => {
      await abrir(page, BAIXA);
      const painel = await expandir(page, v.i);
      const passo = painel.locator(".viz-step");

      const total = (await passo.textContent())!.match(/de (\d+)/)![1];
      await expect(passo).toHaveText(`passo 1 de ${total}`);

      await page.keyboard.press("ArrowRight");
      await expect(passo).toHaveText(`passo 2 de ${total}`);
      await page.keyboard.press("ArrowRight");
      await expect(passo).toHaveText(`passo 3 de ${total}`);
      await page.keyboard.press("ArrowLeft");
      await expect(passo).toHaveText(`passo 2 de ${total}`);

      // Espaço roda: o rótulo do botão é o que diz se rodou.
      const rodar = painel.getByRole("button", { name: /Rodar|Pausar/ });
      await page.keyboard.press("Space");
      await expect(rodar).toHaveText("❚❚ Pausar");
      await page.keyboard.press("Space");
      await expect(rodar).toHaveText("▶ Rodar");
    });
  });
}

// A regra mais importante dos atalhos é o inverso deles: com o cursor num
// campo, espaço é espaço e seta é cursor. Sequestrar isso deixa a entrada
// impossível de editar, que é pior que não ter atalho.
for (const v of [
  { i: 0, nome: "ponteiros convergentes" },
  { i: 1, nome: "palíndromo" },
]) {
  test(`two-pointers · ${v.nome}: o campo em edição manda no espaço`, async ({ page }) => {
    await abrir(page, BAIXA);
    const painel = await expandir(page, v.i);
    const campo = painel.locator("input.viz-input").first();
    const rodar = painel.getByRole("button", { name: /Rodar|Pausar/ });

    await campo.click();
    // `End` não leva o cursor ao fim de um input no macOS, então a régua é o
    // valor comparado consigo mesmo, não a posição do cursor.
    const antes = await campo.inputValue();
    await page.keyboard.press("Space");

    await expect(campo).not.toHaveValue(antes);
    expect((await campo.inputValue()).length).toBe(antes.length + 1);
    // E a animação NÃO começou.
    await expect(rodar).toHaveText("▶ Rodar");
  });
}

// ---------------------------------------------------------------------------
// O teto de altura do desenho do rho (camada 2, específica deste visualizador).
// Medido em 1512x900: o SVG ia a 402px dos 939px da peça, contra 816 de
// orçamento. O teto devolve a peça para dentro da janela sem esconder nada, e
// NÃO vale no expandido, que existe para ver o desenho maior.
// ---------------------------------------------------------------------------
test("two-pointers · o desenho do rho tem teto no artigo e não tem no expandido", async ({ page }) => {
  await abrir(page, BAIXA);
  const fig = noArtigo(page, 2);

  // A régua não é o valor do `max-height` (isso só repetiria o CSS aqui e
  // quebraria o teste a cada ajuste fino): é a altura SEM teto, medida em
  // 1512x900 antes deste conserto, que era 402px. O desenho tem que ter
  // encolhido de verdade em relação a ela.
  const SEM_TETO = 402;
  const svgNoArtigo = await altura(fig.locator(".tp-svg"));
  expect(svgNoArtigo).toBeLessThan(SEM_TETO * 0.8);

  // E o desenho continua inteiro: nenhum nó foi cortado pelo teto.
  const cabeInteiro = await fig.locator(".tp-svg").evaluate((svg) => {
    const caixa = svg.getBoundingClientRect();
    return [...svg.querySelectorAll("circle")].every((c) => {
      const r = c.getBoundingClientRect();
      return r.top >= caixa.top - 1 && r.bottom <= caixa.bottom + 1;
    });
  });
  expect(cabeInteiro).toBe(true);

  // No painel o teto sai: lá o miolo rola e o desenho pode crescer. A régua é
  // o próprio desenho do artigo, não um número solto.
  const painel = await expandir(page, 2);
  await expect.poll(() => altura(painel.locator(".tp-svg"))).toBeGreaterThan(svgNoArtigo);
  expect(await painel.locator(".tp-svg").evaluate((el) => getComputedStyle(el).maxHeight)).toBe("none");
});

// ---------------------------------------------------------------------------
// O guarda de idioma, agora como teste: identificador em inglês, tela em
// português (contrato §0). Um `find & replace` de `esq` → `left` traduz o
// identificador e estraga a aula junto — e o `tsc` não reclama de nada.
// ---------------------------------------------------------------------------
test("two-pointers · o Python da tela e os rótulos seguem em português", async ({ page }) => {
  await abrir(page, ALTA);

  // O gerador de passos e o código andam juntos: se o rename tivesse pegado a
  // string, estas linhas viriam em inglês.
  await expect(noArtigo(page, 0).locator(".viz-code-body")).toContainText("esquerda = 0");
  await expect(noArtigo(page, 0).locator(".viz-code-body")).toContainText("soma = nums[esquerda] + nums[direita]");
  await expect(noArtigo(page, 1).locator(".viz-code-body")).toContainText("esq, dir = 0, len(s) - 1");
  await expect(noArtigo(page, 2).locator(".viz-code-body")).toContainText("lento = rapido = cabeca");

  // Os rótulos do painel de variáveis explicam justamente aquelas linhas: se um
  // lado vira inglês e o outro não, o aluno perde a correspondência.
  const rotulos = async (i: number) =>
    noArtigo(page, i).locator(".viz-var-name").allTextContents();
  expect(await rotulos(0)).toEqual(["esquerda", "direita", "soma", "alvo"]);
  expect(await rotulos(1)).toEqual(["esq", "dir", "s[esq]", "s[dir]"]);
  expect(await rotulos(2)).toEqual(["lento", "rapido", "iteração", "ciclo?"]);

  // E a nota do passo a passo, que é onde a frase "o array precisa estar
  // sorted" apareceria.
  await expect(noArtigo(page, 0).locator(".viz-note")).toHaveText(
    "esquerda no início, direita no fim do array ordenado."
  );
});
