import { test, expect, type Page, type Locator } from "@playwright/test";

// ---------------------------------------------------------------------------
// A casca adaptativa nos dois visualizadores de Recursão.
//
// Estes testes medem COMPORTAMENTO e leem RÓTULO. Contar elemento não prova
// nada: já passaram por suíte verde um visualizador sem botão nenhum e um
// painel com 0px de largura. A régua aqui é sempre um número medido no
// navegador (altura, posição, deslocamento) ou o texto que o aluno lê.
//
// Antes da casca, as duas peças rolavam INTEIRAS dentro do painel expandido, e
// o que saía da tela era o cabeçalho: medido em 1512x900, ele subia 491px na
// pilha e 615px na árvore; em 1440x600, 791 e 915px. O `.viz-foot` nem existia,
// porque os controles moravam dentro do miolo rolável.
//
// O terceiro componente do tópico, `RecursionTipos`, fica fora de propósito:
// é `figure.rec-tipos`, tabela estática sem overlay. Sem botão Expandir não há
// painel para arrumar.
// ---------------------------------------------------------------------------

const URL = "/topico/recursao/";

// Janela de notebook de 16", que é o caso que motivou a casca. Nela as duas
// peças passam do orçamento com o código à mostra (885 e 1291px contra 816).
const BAIXA = { width: 1512, height: 900 };
// Alta o bastante para as duas caberem com o código aberto (orçamento 1516px).
const ALTA = { width: 1512, height: 1600 };
// Apertada de propósito: garante que o miolo do painel tem o que rolar e que a
// medição REALMENTE discordaria de quem abre o código na mão.
const APERTADA = { width: 1512, height: 700 };

/** Os rótulos das marchas, na ordem do `input[type=range]` (o índice 0 não é usado). */
const ROTULOS_MARCHA = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

const VISUALIZADORES = [
  {
    i: 0,
    nome: "pilha de chamadas",
    arquivo: "fatorial.py",
    // Um preset que mexe nos TRÊS valores de `measureOn` (modo, n e limite),
    // não só no alvo da animação.
    preset: "caso base fora de alcance",
    // A prova, na tela, de que a entrada da medição mudou mesmo: o painel de
    // variáveis do modo inalcançável tem uma linha que nenhum outro modo tem.
    provaRotulo: "caso base",
    provaValor: "n == 0",
    arquivoDepois: "contagem.py",
    // A marcha em que a peça ABRE e a seguinte. Não é a mesma nas duas: a
    // pilha usa a marcha padrão do hook e a árvore abre uma acima, porque ela
    // desenha dezenas de nós. Deixar o valor esperado aqui, por peça, é o que
    // faz este teste falhar se alguém tirar a marcha própria de uma delas.
    marchaInicial: "1x",
    // Recolhida, a pilha volta para dentro do orçamento do artigo: 731px
    // contra 816 em 1512x900 (eram 885 com o código à mostra).
    cabeNoOrcamento: true,
    tetoRecolhida: 816,
  },
  {
    i: 1,
    nome: "árvore do Fibonacci",
    arquivo: "fib.py",
    // Ligar o cache troca o código de 4 para 9 linhas e acrescenta uma tarja na
    // legenda: é a entrada de medição desta peça que mais muda a altura.
    preset: "fib(6) com cache: 11 chamadas",
    provaRotulo: "acertos no cache",
    provaValor: "0",
    arquivoDepois: "fib_memo.py",
    // Abre no "1.5x" (`initialSpeed: 4`), não no padrão do hook: a árvore tem
    // dezenas de nós e no 1x a reprodução inteira fica longa demais.
    marchaInicial: "1.5x",
    // A árvore NÃO cabe no artigo nem recolhida: 1137px contra 816. O que
    // sobra não é bloco dispensável — é o desenho (440px), a tabela de
    // comparação (196px), as fichas (78px) e o respiro do miolo, que a camada 2
    // apertaria se ela alcançasse o fluxo do artigo (contrato §9).
    cabeNoOrcamento: false,
    tetoRecolhida: 1200,
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
    if (alturaSlot <= 60 || rotulo !== "Ocultar código") {
      falhas.push(`aos ${Math.round((k * ms) / n)}ms: slot=${alturaSlot}px, rótulo=${JSON.stringify(rotulo)}`);
    }
    await page.waitForTimeout(ms / n);
  }
  return falhas;
}

for (const v of VISUALIZADORES) {
  test.describe(`recursao · ${v.nome}`, () => {
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

      // 3. e o cabeçalho não saiu do lugar. (Antes da casca ele subia 691px
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
      expect(aberta - recolhida).toBeGreaterThan(120);

      if (v.cabeNoOrcamento) {
        // E recolhida a peça inteira passa a caber, que é o ponto de tudo isto.
        expect(recolhida).toBeLessThanOrEqual(orc);
      } else {
        // A árvore não cabe nem recolhida (1137px contra 816). O teto aqui é
        // regressão: recolher tem que continuar valendo a pena.
        expect(recolhida).toBeLessThan(v.tetoRecolhida);
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
      await expect.poll(() => altura(fig.locator(".viz-code-slot"))).toBeGreaterThan(60);
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
      await expect.poll(() => altura(fig.locator(".viz-code-slot"))).toBeGreaterThan(60);

      await fig.getByRole("button", { name: v.preset, exact: true }).click();

      // A entrada da medição mudou MESMO — e a leitura é do rótulo junto com o
      // valor, no mesmo cartão: comportamento certo com rótulo errado ensina
      // errado do mesmo jeito.
      const ficha = fig.locator(".bigo-stat, .viz-var").filter({ hasText: v.provaRotulo });
      await expect(ficha).toHaveCount(1);
      await expect(ficha.locator("strong, .viz-var-val")).toHaveText(v.provaValor);
      // E o código que apareceria é o do estado NOVO, não o do anterior.
      await expect(fig.locator(".viz-code-head")).toHaveText(v.arquivoDepois);

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

    // A regra mais importante dos atalhos é o inverso deles: com o cursor num
    // campo, seta é do campo e espaço é do campo. Sequestrar isso deixa a
    // entrada impossível de editar, o que é pior que não ter atalho.
    //
    // As duas peças daqui têm campo NUMÉRICO, onde `→` move o cursor sem mudar
    // o valor. Então a régua não é o valor mudar: é o passo NÃO andar e a
    // animação NÃO começar — que é exatamente o que o contrato promete.
    test("o campo numérico em edição manda na seta e no espaço", async ({ page }) => {
      await abrir(page, BAIXA);
      const painel = await expandir(page, v.i);
      const campo = painel.locator("input.viz-input.k").first();
      const passo = painel.locator(".viz-step");
      const rodar = painel.getByRole("button", { name: /Rodar|Pausar/ });

      const total = (await passo.textContent())!.match(/de (\d+)/)![1];
      await campo.click();
      const valor = await campo.inputValue();

      await page.keyboard.press("ArrowRight");
      await expect(passo).toHaveText(`passo 1 de ${total}`);
      await page.keyboard.press("Space");
      await expect(rodar).toHaveText("▶ Rodar");
      await expect(passo).toHaveText(`passo 1 de ${total}`);
      // O campo continua editável e intacto: a seta foi para o cursor.
      await expect(campo).toHaveValue(valor);
    });

    // No slider a seta é do slider — e o rótulo da marcha é como o aluno
    // confere que ela andou.
    test("no slider de velocidade a seta é do slider, não do passo", async ({ page }) => {
      await abrir(page, BAIXA);
      const painel = await expandir(page, v.i);
      const slider = painel.locator('input[type="range"]').first();
      const passo = painel.locator(".viz-step");
      const marcha = painel.locator(".viz-speed .val");

      const total = (await passo.textContent())!.match(/de (\d+)/)![1];
      // A marcha de ABERTURA é da peça, não do hook: a árvore abre uma acima.
      await expect(marcha).toHaveText(v.marchaInicial);

      // O clique no `input[type=range]` reposiciona a marcha pelo ponto
      // clicado, então o valor de partida da seta é o de DEPOIS do clique —
      // não o de abertura. Ler aqui é o que torna a asserção sobre a seta
      // independente da marcha inicial de cada peça.
      await slider.click();
      const antes = Number(await slider.inputValue());
      await page.keyboard.press("ArrowRight");

      await expect(slider).toHaveValue(String(antes + 1));
      await expect(marcha).toHaveText(ROTULOS_MARCHA[antes + 1]);
      await expect(passo).toHaveText(`passo 1 de ${total}`);
    });
  });
}

// ---------------------------------------------------------------------------
// O que a medição deste tópico contrariou, agora como regressão.
//
// A árvore de recursão cresce por fórmula: fib(8) sem cache tem 67 nós e com
// cache tem 15. A intuição diz que o pior caso de ALTURA é o de 67 nós — e o
// número disse o contrário. Os nós viram LARGURA (`.rec-arv` mantém o tamanho
// natural e `.rec-arv-wrap` rola na horizontal); o eixo que vira altura é a
// PROFUNDIDADE, que é n − 1 e é a MESMA com e sem cache.
//
// É esse fato que sustenta `measureOn: [n, withMemo]` — sem ele alguém trocaria
// por uma contagem de nós e mediria a coisa errada. Antes da casca, a peça com
// cache era 81px MAIS ALTA (1496 contra 1415), e a diferença inteira era o
// código de 9 linhas contra 4.
// ---------------------------------------------------------------------------
test("recursao · árvore: o cache muda a LARGURA do desenho, não a altura", async ({ page }) => {
  await abrir(page, BAIXA);
  const fig = noArtigo(page, 1);
  const svg = fig.locator("svg.rec-arv");
  const wrap = fig.locator(".rec-arv-wrap");

  await fig.locator("input.viz-input.k").fill("8");
  await fig.getByRole("button", { name: "desligada", exact: true }).click();
  await expect(svg).toHaveAttribute("aria-label", /fib\(8\) sem memoização/);

  const semCache = await svg.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { alt: Math.round(r.height), larg: Math.round(r.width) };
  });
  // Sem cache o desenho é mais largo que o container, e quem rola é o wrapper —
  // não a página. É isso que tira o número de nós do eixo da altura.
  expect(await wrap.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeGreaterThan(100);

  await fig.getByRole("button", { name: "ligada", exact: true }).click();
  await expect(svg).toHaveAttribute("aria-label", /fib\(8\) com memoização/);
  // O rótulo da ficha confirma que é o MESMO estado que a legenda anuncia.
  await expect(fig.locator(".bigo-stat").filter({ hasText: "acertos no cache" })).toHaveCount(1);

  const comCache = await svg.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { alt: Math.round(r.height), larg: Math.round(r.width) };
  });

  expect(comCache.alt).toBe(semCache.alt);
  expect(semCache.larg).toBeGreaterThan(comCache.larg * 2);
});

// ---------------------------------------------------------------------------
// O guarda de idioma, agora como teste: identificador em inglês, tela em
// português (contrato §0). Um `find & replace` de `chamadas` → `calls` traduz o
// identificador e estraga a aula junto, e o `tsc` não reclama de nada.
//
// Os dois arquivos deste tópico têm rótulo colado numa interpolação
// (`>devolve {f.ret}<`, `{num(...)}×`, a legenda inteira do rodapé da árvore),
// que é o buraco SILENCIOSO do `scripts/guarda-idioma.py`. Por isso o texto
// destes casos está aqui, onde o navegador é quem responde.
// ---------------------------------------------------------------------------
test("recursao · o Python da tela e os rótulos seguem em português", async ({ page }) => {
  await abrir(page, ALTA);

  const pilha = noArtigo(page, 0);
  await expect(pilha.locator(".viz-code-body")).toContainText("def fatorial(n):");
  await expect(pilha.locator(".viz-code-body")).toContainText("resultado = fatorial(n - 1)");
  await expect(pilha.locator(".viz-vars")).toContainText("n (frame do topo)");
  await expect(pilha.locator(".rec-stack-lbl")).toContainText("Call stack · topo em cima");
  // Rótulo colado numa interpolação: o guarda não vê nenhum destes dois.
  // O segundo frame só existe depois que a primeira chamada desce, então o
  // passo 0 não serviria: lá a pilha tem um frame só, e ele é o "topo".
  for (let k = 0; k < 3; k++) await pilha.getByRole("button", { name: "Próximo ›" }).click();
  await expect(pilha.locator(".rec-frame-tag")).toHaveCount(2);
  await expect(pilha.locator(".rec-frame-tag").last()).toHaveText("nível 1");
  await pilha.getByRole("button", { name: "fatorial(1): caso base de cara", exact: true }).click();
  await pilha.getByRole("button", { name: "Próximo ›" }).click();
  await pilha.getByRole("button", { name: "Próximo ›" }).click();
  await expect(pilha.locator(".rec-frame-ret")).toHaveText("devolve 1");

  const arvore = noArtigo(page, 1);
  await expect(arvore.locator(".viz-code-body")).toContainText("return fib(n - 1) + fib(n - 2)");
  await expect(arvore.locator(".rec-legenda")).toContainText("valor já calculado antes");
  await expect(arvore.locator(".rec-comp caption")).toHaveText("Chamadas para calcular fib(n), contagem exata");
  // O "×" também é texto colado numa interpolação.
  await expect(arvore.locator(".rec-comp tbody tr").first().locator("td").last()).toHaveText("2×");
  await expect(arvore.locator(".viz-caption")).toContainText("Em fib(20) a diferença é 21.891 contra 39.");
});
