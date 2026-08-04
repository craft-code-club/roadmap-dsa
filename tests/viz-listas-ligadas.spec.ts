import { test, expect, type Page, type Locator } from "@playwright/test";

// ---------------------------------------------------------------------------
// A casca adaptativa nos três visualizadores de Listas Ligadas.
//
// Estes testes medem COMPORTAMENTO e leem RÓTULO. Contar elemento não prova
// nada: já passaram por suíte verde um visualizador sem botão nenhum e um
// painel com 0px de largura. Então a régua aqui é sempre um número medido no
// navegador (altura, posição, deslocamento) ou o texto que o aluno lê.
//
// Antes da casca, as três peças rolavam INTEIRAS dentro do painel expandido: o
// cabeçalho subia 505, 248 e 538px e o `▶ Rodar` era desenhado até 446px
// abaixo de uma janela de 900 (medido em 1512x900).
// ---------------------------------------------------------------------------

const URL = "/topico/listas-ligadas/";

// Janela de notebook de 16", que é o caso que motivou a casca.
const BAIXA = { width: 1512, height: 900 };
// Alta o bastante para as três peças caberem com o código à mostra.
const ALTA = { width: 1512, height: 1600 };
// Apertada de propósito: garante que o miolo do painel tem o que rolar nas três
// peças, e que a medição REALMENTE discordaria de quem abre o código na mão.
const APERTADA = { width: 1512, height: 700 };

const VISUALIZADORES = [
  {
    i: 0,
    nome: "operações",
    arquivo: "lista_encadeada.py",
    // Um preset que muda o que está em `measureOn` (o tamanho da lista e, com
    // ele, a altura do desenho) — e não só o alvo da operação.
    preset: "Lista vazia + inserir",
    // A prova, na tela, de que a entrada da medição mudou mesmo.
    provaRotulo: "nós na lista",
    provaValor: "0",
    // Esta peça continua acima do orçamento do artigo com o código já
    // recolhido: 990px contra 816. Ver o comentário do teste de tela baixa.
    cabeNoOrcamento: false,
  },
  {
    i: 1,
    nome: "reversão",
    arquivo: "reverter.py",
    preset: "Cinco nós: 1 a 5",
    provaRotulo: "nós na lista",
    provaValor: "5",
    cabeNoOrcamento: true,
  },
  {
    i: 2,
    nome: "Floyd",
    arquivo: "floyd.py",
    preset: "Tudo é ciclo: 6 nós em roda",
    provaRotulo: "nós na lista",
    provaValor: "6",
    cabeNoOrcamento: true,
  },
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
  // `data-anim` volta para "on" quando a casca terminou de medir e decidir. É o
  // sinal que ela já publica; esperar por ele custa menos que um sono fixo e
  // não vira flake com a máquina cheia.
  await expect(page.locator("article figure.viz-fit").first()).toHaveAttribute("data-anim", "on");
}

async function expandir(page: Page, i: number): Promise<Locator> {
  await noArtigo(page, i).getByRole("button", { name: "⤢ Expandir" }).click();
  const painel = noPainel(page);
  await expect(painel).toBeVisible();
  return painel;
}

async function altura(loc: Locator): Promise<number> {
  return loc.evaluate((el) => Math.round(el.getBoundingClientRect().height));
}

/** O orçamento do artigo: a janela menos o cabeçalho fixo e um respiro. */
async function orcamento(page: Page): Promise<number> {
  return page.evaluate(() => {
    const h = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ccc-header-h")) || 60;
    return window.innerHeight - h - 24;
  });
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
    if (alturaSlot <= 100 || rotulo !== "Ocultar código") {
      falhas.push(`aos ${Math.round((k * ms) / n)}ms: slot=${alturaSlot}px, rótulo=${JSON.stringify(rotulo)}`);
    }
    await page.waitForTimeout(ms / n);
  }
  return falhas;
}

for (const v of VISUALIZADORES) {
  test.describe(`listas-ligadas · ${v.nome}`, () => {
    // §8.1: no expandido o cabeçalho e o rodapé ficam parados, e o botão que faz
    // o algoritmo andar nunca sai da tela.
    //
    // As duas primeiras asserções não são cerimônia: um teste que rola o
    // `.viz-body` sem provar que é ELE quem rola aprova justamente a quebra que
    // devolve a rolagem para a figura inteira — ali o `scrollTop` do miolo fica
    // em zero, o cabeçalho não se mexe, e o teste passa feliz.
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

      const recolhida = await altura(fig);
      const orc = await orcamento(page);

      // A premissa medida DENTRO do teste: com o código à mostra a peça não
      // cabe. Sem ela, no dia em que a peça encolher isto vira decoração verde.
      await botao.click();
      await expect(botao).toHaveText("Ocultar código");
      await expect.poll(() => altura(fig)).toBeGreaterThan(orc);
      const aberta = await altura(fig);
      expect(aberta - recolhida).toBeGreaterThan(150);

      if (v.cabeNoOrcamento) {
        // E recolhida a peça inteira passa a caber, que é o ponto de tudo isto.
        expect(recolhida).toBeLessThanOrEqual(orc);
      } else {
        // A peça de operações NÃO cabe nem recolhida: medido 990px contra 816
        // de orçamento em 1512x900. O que sobra não é bloco dispensável — são
        // três fileiras de chips (228px), o desenho (266px), as fichas de
        // estatística (78px) e ~130px de respiro do miolo, que a camada 2
        // apertaria se ela alcançasse o fluxo do artigo (contrato §9).
        // O teto aqui é regressão: recolher tem que continuar valendo a pena.
        expect(recolhida).toBeLessThan(1050);
      }
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
      // O bloco é mesmo o código DESTE visualizador, não um bloco qualquer.
      await expect(fig.locator(".viz-code-head")).toHaveText(v.arquivo);
    });

    // §8.4: a escolha explícita do aluno vence a medição e não é desfeita por
    // uma troca de estado que pediria medição nova.
    test("a escolha do aluno sobrevive a uma troca de estado que pede medição nova", async ({ page }) => {
      await abrir(page, APERTADA);
      const fig = noArtigo(page, v.i);
      const botao = fig.locator("button.viz-toggle-codigo");

      await expect(botao).toHaveText("Mostrar código");
      await botao.click();
      await expect(botao).toHaveText("Ocultar código");
      await expect.poll(() => altura(fig.locator(".viz-code-slot"))).toBeGreaterThan(100);

      await fig.getByRole("button", { name: v.preset, exact: true }).click();

      // A entrada da medição mudou MESMO — e a leitura é do rótulo junto com o
      // valor, no mesmo cartão: comportamento certo com rótulo errado ensina
      // errado do mesmo jeito. ("nós na lista" é ficha de estatística em duas
      // peças e linha do painel de variáveis na outra; o filtro pelo rótulo
      // acha uma só em qualquer um dos casos.)
      const ficha = fig.locator(".bigo-stat, .viz-var").filter({ hasText: v.provaRotulo });
      await expect(ficha).toHaveCount(1);
      await expect(ficha.locator("strong, .viz-var-val")).toHaveText(v.provaValor);

      // A janela amostrada cobre a medição E a transição de 0,32s que viria
      // depois dela. Exigir que NENHUMA amostra tenha falhado é o que separa
      // "está aberto" de "continua aberto".
      expect(await amostrarAberto(page, fig)).toEqual([]);
    });

    // §8.5: as teclas dirigem a animação dentro do painel.
    test("expandido: as setas andam o passo e o espaço roda", async ({ page }) => {
      await abrir(page, BAIXA);
      const painel = await expandir(page, v.i);
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
  });
}

// A regra mais importante dos atalhos é o inverso deles: com o cursor num campo,
// espaço é espaço e seta é cursor. Sequestrar isso deixa a entrada impossível de
// editar, o que é pior que não ter atalho.
for (const v of [
  { i: 0, nome: "operações" },
  { i: 1, nome: "reversão" },
]) {
  test(`listas-ligadas · ${v.nome}: o campo em edição manda no espaço`, async ({ page }) => {
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

// O Floyd não tem campo de texto: a entrada dele são dois sliders. Num slider a
// seta é do próprio slider, e sequestrá-la deixaria a lista impossível de
// configurar pelo teclado.
test("listas-ligadas · Floyd: no slider a seta é do slider, não do passo", async ({ page }) => {
  await abrir(page, BAIXA);
  const painel = await expandir(page, 2);
  const slider = painel.locator('input[type="range"]').first();
  const passo = painel.locator(".viz-step");

  const total = (await passo.textContent())!.match(/de (\d+)/)![1];
  await expect(passo).toHaveText(`passo 1 de ${total}`);

  await slider.click();
  const antes = await slider.inputValue();
  await page.keyboard.press("ArrowRight");

  await expect(slider).not.toHaveValue(antes);
  // E o rótulo do campo acompanha o slider, que é como o aluno confere.
  await expect(painel.locator("label.viz-field").first()).toContainText(
    `Nós antes do ciclo: ${Number(antes) + 1}`
  );
  // O passo não andou junto (o `total` muda com a lista, então a régua é o "1").
  await expect(passo).toContainText("passo 1 de ");
});

// ---------------------------------------------------------------------------
// O teto de altura do desenho (camada 2, específica destes visualizadores).
// Medido em 1512x900: o rho do Floyd ia a 337px e a peça a 870, contra 816 de
// orçamento. O teto devolve a peça para dentro da janela sem esconder nada, e
// NÃO vale no expandido, que existe justamente para ver o desenho maior.
// ---------------------------------------------------------------------------
test("listas-ligadas · o desenho tem teto no artigo e não tem no expandido", async ({ page }) => {
  await abrir(page, BAIXA);
  const fig = noArtigo(page, 2);

  // A régua não é o valor do `max-height` (isso só repetiria o CSS aqui): é a
  // altura SEM teto, medida em 1512x900 antes deste conserto, que era 337px.
  const SEM_TETO = 337;
  const svgNoArtigo = await altura(fig.locator(".ll-svg"));
  expect(svgNoArtigo).toBeLessThan(SEM_TETO * 0.85);

  // E o desenho continua inteiro: nenhum nó foi cortado pelo teto.
  const cabeInteiro = await fig.locator(".ll-svg").evaluate((svg) => {
    const caixa = svg.getBoundingClientRect();
    return [...svg.querySelectorAll("circle")].every((c) => {
      const r = c.getBoundingClientRect();
      return r.top >= caixa.top - 1 && r.bottom <= caixa.bottom + 1;
    });
  });
  expect(cabeInteiro).toBe(true);

  // No painel o teto sai. A régua é o próprio desenho do artigo, não um número
  // solto.
  const painel = await expandir(page, 2);
  await expect.poll(() => altura(painel.locator(".ll-svg"))).toBeGreaterThan(svgNoArtigo);
  expect(await painel.locator(".ll-svg").evaluate((el) => getComputedStyle(el).maxHeight)).toBe("none");
});

// ---------------------------------------------------------------------------
// `total` que vem da entrada pode cair para 1: remover de uma lista vazia
// devolve UM passo. Aí o contador, o rodapé e os atalhos somem inteiros — cerca
// de 90px a menos de peça —, e é por isso que `steps.length` entra no
// `measureOn`. O que não pode é sobrar um controle prometendo animação que não
// existe.
// ---------------------------------------------------------------------------
test("listas-ligadas · lista vazia + remover: sem linha do tempo, sem rodapé", async ({ page }) => {
  await abrir(page, BAIXA);
  const fig = noArtigo(page, 0);

  await fig.getByRole("button", { name: "Remover a posição", exact: true }).click();
  await fig.locator("input.viz-input").first().fill("");

  await expect(fig.locator(".viz-note")).toHaveText(/A lista está vazia: não existe posição/);
  await expect(fig.locator(".viz-step")).toHaveCount(0);
  await expect(fig.locator(".viz-foot")).toHaveCount(0);
  await expect(fig.getByRole("button", { name: /Rodar|Pausar/ })).toHaveCount(0);
  // O botão do bloco continua lá, porque o bloco continua existindo.
  await expect(fig.locator("button.viz-toggle-codigo")).toHaveCount(1);
});

// ---------------------------------------------------------------------------
// O guarda de idioma, agora como teste: identificador em inglês, tela em
// português (contrato §0). Um `find & replace` de `lento` → `slow` traduz o
// identificador e estraga a aula junto — e o `tsc` não reclama de nada.
// ---------------------------------------------------------------------------
test("listas-ligadas · o Python da tela e os rótulos seguem em português", async ({ page }) => {
  await abrir(page, ALTA);

  await expect(noArtigo(page, 0).locator(".viz-code-body")).toContainText("def inserir(self, pos, valor):");
  await expect(noArtigo(page, 0).locator(".viz-code-body")).toContainText("anterior = self.cabeca");
  await expect(noArtigo(page, 1).locator(".viz-code-body")).toContainText("atual.prox = anterior  # viro a seta");
  await expect(noArtigo(page, 2).locator(".viz-code-body")).toContainText("lento = rapido = cabeca");

  // Os rótulos do painel de variáveis explicam justamente aquelas linhas: se um
  // lado vira inglês e o outro não, o aluno perde a correspondência.
  const rotulos = async (i: number) => noArtigo(page, i).locator(".viz-var-name").allTextContents();
  expect(await rotulos(0)).toEqual(["anterior", "cabeça", "nós na lista", "custo"]);
  expect(await rotulos(1)).toEqual(["anterior", "atual", "proximo", "setas viradas"]);
  expect(await rotulos(2)).toEqual(["lento", "rapido", "fase", "retorno"]);

  // E as fichas de estatística, que são o argumento do artigo em números.
  const fichas = async (i: number) => noArtigo(page, i).locator(".bigo-stat span").allTextContents();
  expect(await fichas(0)).toEqual([
    "nós percorridos", "ponteiros religados", "deslocamentos num array", "memória extra",
  ]);
  expect(await fichas(2)).toEqual([
    "nós na lista", "iterações da fase 1", "passos da fase 2", "início do ciclo",
  ]);
});
