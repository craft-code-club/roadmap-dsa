import { test, expect, type Page, type Locator } from "@playwright/test";

// ---------------------------------------------------------------------------
// A casca adaptativa no visualizador de Árvores n-árias.
//
// Estes testes medem COMPORTAMENTO e leem RÓTULO. Contar elemento não prova
// nada: já passaram por suíte verde um visualizador sem botão nenhum e um
// painel com 0px de largura.
//
// Antes da casca, a peça inteira rolava dentro do painel expandido: medido, o
// cabeçalho subia 371px em 1512x900, 571px em 1440x700 e 671px em 1440x600, e o
// `▶ Rodar` era desenhado sempre em 1170px — 270, 470 e 570px ABAIXO do pé da
// janela. O `.viz-foot` não existia; os controles moravam dentro do miolo.
//
// O tópico tem um visualizador só, e ele tem as três camadas: overlay, bloco de
// código recolhível e painel de variáveis.
// ---------------------------------------------------------------------------

const URL = "/topico/n-ary-trees/";

// Janela de notebook de 16", a régua do contrato. Nela a peça passa do
// orçamento (816px) em todas as nove combinações de árvore e ordem: 1070px na
// árvore do artigo e 1238px na do DOM, já com o código recolhido.
const BAIXA = { width: 1512, height: 900 };
// Alta o bastante para a peça caber com o código à mostra: orçamento 1508px
// contra 1432px no pior caso medido (árvore DOM, por nível, passo 17).
const ALTA = { width: 1512, height: 1600 };
// Apertada de propósito: garante sobra de rolagem no miolo do painel e uma
// medição que REALMENTE discordaria de quem abre o código na mão.
const APERTADA = { width: 1512, height: 700 };

/** Os rótulos das marchas, na ordem do `input[type=range]` (o índice 0 não é usado). */
const ROTULOS_MARCHA = ["", "0.5x", "0.75x", "1x", "1.5x", "2x"];

// O passo do PICO de altura, medido andando a animação inteira nas nove
// combinações: árvore DOM em por nível, passo 17 de 19 (1238px recolhida,
// 1432px com o código aberto). O passo 1 mede 1206px — 32px a menos —, e o
// teste de rolagem tem que morar no pico, não no primeiro passo.
const PICO = { arvore: "Uma árvore DOM", ordem: "Por nível (BFS)", passo: 17, total: 19 };

function noArtigo(page: Page): Locator {
  return page.locator("article figure.viz-fit").first();
}

function noPainel(page: Page): Locator {
  return page.locator(".viz-overlay figure.viz");
}

async function abrir(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto(URL);
  // As fontes chegam com `display: swap`: medir antes é medir o fallback.
  await page.evaluate(() => document.fonts.ready);
  const real = page.viewportSize();
  expect(real).toEqual(viewport);
  await expect(noArtigo(page)).toBeVisible();
  // `data-anim` volta para "on" quando a casca terminou de medir e decidir.
  await expect(noArtigo(page)).toHaveAttribute("data-anim", "on");
}

async function expandir(page: Page): Promise<Locator> {
  await noArtigo(page).getByRole("button", { name: "⤢ Expandir" }).click();
  const painel = noPainel(page);
  await expect(painel).toBeVisible();
  await expect(painel).toHaveAttribute("data-anim", "on");
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

async function abrirCodigo(fig: Locator) {
  const botao = fig.locator("button.viz-toggle-codigo");
  if ((await botao.textContent()) === "Mostrar código") await botao.click();
  await expect(botao).toHaveText("Ocultar código");
}

/**
 * Amostra o estado do bloco recolhível N vezes ao longo de `ms` e devolve as
 * amostras que falharam. Quando a promessa é PERMANÊNCIA, uma espera fixa
 * seguida de uma leitura olha um instante só.
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

// §8.1: no expandido o cabeçalho e o rodapé ficam parados, e o botão que faz o
// algoritmo andar nunca sai da tela.
//
// As duas primeiras asserções não são cerimônia: um teste que rola o
// `.viz-body` sem provar que é ELE quem rola aprova justamente a quebra que
// devolve a rolagem para a figura inteira — ali o `scrollTop` do miolo fica em
// zero, o cabeçalho não se mexe, e o teste passa feliz.
test("n-ary: expandido, o cabeçalho e o rodapé não se mexem quando o miolo rola", async ({ page }) => {
  await abrir(page, APERTADA);
  const painel = await expandir(page);

  // O pico de altura é a árvore DOM em por nível, no passo 17 — não o passo 1.
  await painel.getByRole("button", { name: PICO.arvore, exact: true }).click();
  await painel.getByRole("button", { name: PICO.ordem, exact: true }).click();
  await abrirCodigo(painel);

  const passo = painel.locator(".viz-step");
  const proximo = painel.getByRole("button", { name: "Próximo ›" });
  await expect(passo).toHaveText(`passo 1 de ${PICO.total}`);
  for (let k = 1; k < PICO.passo; k++) await proximo.click();
  await expect(passo).toHaveText(`passo ${PICO.passo} de ${PICO.total}`);

  const miolo = painel.locator(".viz-body");
  const cabeca = painel.locator(".viz-head");
  const rodar = painel.getByRole("button", { name: /Rodar|Pausar/ });

  // `click()` do Playwright ROLA o contêiner para alcançar o alvo. Dezesseis
  // cliques no rodapé não podem ter rolado o miolo — se rolaram, o rodapé está
  // dentro dele, que é a quebra que este teste existe para pegar.
  expect(await miolo.evaluate((el) => Math.round(el.scrollTop))).toBe(0);

  // 1. o miolo é o que estoura...
  await expect.poll(() => miolo.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeGreaterThan(8);

  const topoAntes = await cabeca.evaluate((el) => Math.round(el.getBoundingClientRect().top));
  // O rótulo importa tanto quanto a posição: botão no lugar certo dizendo a
  // coisa errada ensina errado do mesmo jeito.
  await expect(rodar).toHaveText("▶ Rodar");
  await expect(rodar).toBeInViewport();

  // 2. ...e é ele que rola, não a figura inteira.
  await miolo.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await expect.poll(() => miolo.evaluate((el) => Math.round(el.scrollTop))).toBeGreaterThan(8);
  expect(await painel.evaluate((f) => Math.round(f.scrollTop))).toBe(0);

  // 3. e o cabeçalho não saiu do lugar. (Antes da casca ele subia 571px nesta
  // mesma janela de 700 de altura.)
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

// §8.2: em tela baixa a peça não cabe com o código à mostra, então ele recolhe
// — e o botão passa a dizer o que faria aparecer.
test("n-ary: tela baixa, o botão diz 'Mostrar código' e o bloco está recolhido", async ({ page }) => {
  await abrir(page, BAIXA);
  const fig = noArtigo(page);
  const botao = fig.locator("button.viz-toggle-codigo");

  await expect(botao).toHaveText("Mostrar código");
  await expect(botao).toHaveAttribute("aria-expanded", "false");
  // Recolhido de verdade: o slot perde a ALTURA, não só a largura. Zerar a
  // trilha da coluna deixava a linha do grid com a altura do código.
  await expect.poll(() => altura(fig.locator(".viz-code-slot"))).toBeLessThanOrEqual(4);

  const recolhida = await altura(fig);
  const orc = await orcamento(page);

  // A premissa medida DENTRO do teste: com o código à mostra a peça não cabe.
  await botao.click();
  await expect(botao).toHaveText("Ocultar código");
  await expect.poll(() => altura(fig)).toBeGreaterThan(orc);
  const aberta = await altura(fig);
  // O código são 6 ou 7 linhas de Python: recolher devolve 194px medidos.
  expect(aberta - recolhida).toBeGreaterThan(120);

  // A peça NÃO cabe nem recolhida: 1070px contra 816 na árvore do artigo. O
  // que sobra não é bloco dispensável — é o desenho (346px na árvore mais
  // alta), a tabela de comparação (268px), duas fileiras de chips (62px) e o
  // respiro do miolo, que a camada 2 apertaria se alcançasse o fluxo do artigo
  // (contrato §9). O teto aqui é regressão: recolher tem que continuar valendo.
  expect(recolhida).toBeLessThan(1120);
});

// §8.3: onde cabe, o código já vem à mostra — a medição decide, não um
// breakpoint de largura.
test("n-ary: tela alta, o código já vem aberto e o botão diz 'Ocultar código'", async ({ page }) => {
  await abrir(page, ALTA);
  const fig = noArtigo(page);
  const botao = fig.locator("button.viz-toggle-codigo");

  await expect(botao).toHaveText("Ocultar código");
  await expect(botao).toHaveAttribute("aria-expanded", "true");
  await expect.poll(() => altura(fig.locator(".viz-code-slot"))).toBeGreaterThan(60);
  // O bloco é mesmo o código DESTE visualizador, não um bloco qualquer.
  await expect(fig.locator(".viz-code-head")).toHaveText("percorre.py");
  await expect(fig.locator(".viz-code-body")).toContainText("for filho in no.filhos:");
});

// §8.4: a escolha explícita do aluno vence a medição e não é desfeita por uma
// troca de estado que pediria medição nova.
//
// A troca escolhida muda MESMO a entrada da medição: a árvore do DOM tem dois
// níveis a mais que a do artigo, e o desenho vai de 196 para 332px de altura.
test("n-ary: a escolha do aluno sobrevive à troca de árvore, que pede medição nova", async ({ page }) => {
  await abrir(page, APERTADA);
  const fig = noArtigo(page);
  const botao = fig.locator("button.viz-toggle-codigo");

  await expect(botao).toHaveText("Mostrar código");
  await botao.click();
  await expect(botao).toHaveText("Ocultar código");
  await expect.poll(() => altura(fig.locator(".viz-code-slot"))).toBeGreaterThan(60);

  await fig.getByRole("button", { name: "Uma árvore DOM", exact: true }).click();

  // A entrada da medição mudou MESMO — e a leitura é do rótulo junto com o
  // valor, no mesmo cartão.
  await expect(fig.locator(".tt-legenda-arvore")).toHaveText(
    "HTML é uma árvore n-ária, e é por isso que querySelector é um percurso."
  );
  const ficha = fig.locator(".viz-var").filter({ hasText: "nó atual" });
  await expect(ficha).toHaveCount(1);
  await expect(ficha.locator(".viz-var-val")).toHaveText("html");

  // A janela amostrada cobre a medição E a transição de 0,32s que viria depois
  // dela. Exigir que NENHUMA amostra tenha falhado é o que separa "está aberto"
  // de "continua aberto".
  expect(await amostrarAberto(page, fig)).toEqual([]);
});

// §8.5: as teclas dirigem a animação dentro do painel.
test("n-ary: expandido, as setas andam o passo e o espaço roda", async ({ page }) => {
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

// O inverso dos atalhos: com um botão em foco, espaço é o BOTÃO. Este
// visualizador não tem campo de texto, então o caso que vale aqui é este e o do
// slider (abaixo). Uma ação só: um par de ações inversas ficaria verde com o
// sequestro aplicado.
test("n-ary: com um botão em foco, o espaço é o botão e não a reprodução", async ({ page }) => {
  await abrir(page, BAIXA);
  const painel = await expandir(page);
  const passo = painel.locator(".viz-step");
  const proximo = painel.getByRole("button", { name: "Próximo ›" });
  const rodar = painel.getByRole("button", { name: /Rodar|Pausar/ });

  const total = (await passo.textContent())!.match(/de (\d+)/)![1];
  await proximo.focus();
  await page.keyboard.press("Space");

  // O botão foi acionado: o passo andou UM. E a reprodução não começou — se o
  // espaço tivesse sido sequestrado, o rótulo diria "❚❚ Pausar".
  await expect(passo).toHaveText(`passo 2 de ${total}`);
  await expect(rodar).toHaveText("▶ Rodar");
});

// No slider a seta é do slider — e o rótulo da marcha é como o aluno confere
// que ela andou. A marcha de ABERTURA é da peça (`initialSpeed: 4`), não a 3 do
// hook: os percursos têm 19 e 28 passos e no 1x a reprodução fica longa demais.
test("n-ary: a marcha abre em 1.5x e a seta no slider é do slider", async ({ page }) => {
  await abrir(page, BAIXA);
  const painel = await expandir(page);
  const slider = painel.locator('input[type="range"]').first();
  const passo = painel.locator(".viz-step");
  const marcha = painel.locator(".viz-speed .val");

  const total = (await passo.textContent())!.match(/de (\d+)/)![1];
  await expect(marcha).toHaveText("1.5x");

  // O clique no `input[type=range]` reposiciona a marcha pelo ponto clicado,
  // então o valor de partida da seta é o de DEPOIS do clique.
  await slider.click();
  const antes = Number(await slider.inputValue());
  await page.keyboard.press("ArrowRight");

  await expect(slider).toHaveValue(String(antes + 1));
  await expect(marcha).toHaveText(ROTULOS_MARCHA[antes + 1]);
  await expect(passo).toHaveText(`passo 1 de ${total}`);
});

// ---------------------------------------------------------------------------
// O que a medição deste tópico contrariou, agora como regressão.
//
// Em árvore n-ária a tentação é medir o pior caso pelo GRAU ou pelo número de
// nós. As três árvores desta peça têm exatamente **nove nós** e grau máximo
// **três** — e mesmo assim os desenhos têm alturas diferentes, porque o eixo
// que vira altura é a PROFUNDIDADE. A do DOM tem quatro níveis contra dois das
// outras duas: ela é a mais ALTA e, ao mesmo tempo, a mais ESTREITA, porque tem
// menos folhas. Aumentar o grau alarga sem subir.
//
// É esse fato que sustenta `measureOn: [treeKey, ...]`: sem ele alguém trocaria
// a árvore por uma contagem de nós ou de grau e mediria a coisa errada.
// ---------------------------------------------------------------------------
test("n-ary: a altura do desenho vem da profundidade, não do grau nem do número de nós", async ({ page }) => {
  await abrir(page, ALTA);
  const fig = noArtigo(page);
  const svg = fig.locator("svg.tt-arv");

  const medir = async (arvore: string) => {
    await fig.getByRole("button", { name: arvore, exact: true }).click();
    // Rótulo junto com o valor, no mesmo cartão: as três árvores têm o mesmo
    // grau máximo e o mesmo número de nós, e é isso que dá sentido ao resto.
    const grau = fig.locator(".viz-var").filter({ hasText: "grau máximo" });
    await expect(grau.locator(".viz-var-val")).toHaveText("3");
    const nos = fig.locator(".viz-var").filter({ hasText: "processados" });
    await expect(nos.locator(".viz-var-val")).toHaveText("0 de 9");
    return svg.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        alt: Math.round(r.height),
        larg: Math.round(r.width),
        viewBox: el.getAttribute("viewBox"),
      };
    });
  };

  const artigo = await medir("A árvore do artigo");
  const diretorios = await medir("Uma árvore de diretórios");
  const dom = await medir("Uma árvore DOM");

  // Mesmo número de nós, mesmo grau, mesma profundidade: mesma altura.
  expect(diretorios.alt).toBe(artigo.alt);
  // Dois níveis a mais: 136px a mais de desenho.
  expect(dom.alt).toBeGreaterThan(artigo.alt + 100);
  // E a mais alta é a mais ESTREITA: menos folhas, menos largura.
  expect(dom.larg).toBeLessThan(artigo.larg);

  // O desenho sai no tamanho NATURAL do viewBox — não há esticão, então não há
  // vazio para um `max-height` devolver. Se alguém puser `width: 100%` no
  // `.tt-arv`, isto reprova antes de o teto virar uma boa ideia.
  const [, , vw, vh] = dom.viewBox!.split(" ").map(Number);
  expect(dom.larg).toBe(vw);
  expect(dom.alt).toBe(vh);
});

// ---------------------------------------------------------------------------
// O guarda de idioma, agora como teste: identificador em inglês, tela em
// português (contrato §0).
//
// Este arquivo tem rótulo de tela COLADO numa interpolação em quatro lugares —
// a legenda da tabela, a coluna do grau, o "N de M" das variáveis e o "~" das
// comparações —, que é o buraco silencioso do `scripts/guarda-idioma.py`: o
// texto não está em string nenhuma e não casa com `>texto<`. Por isso a prova
// destes casos está aqui, onde o navegador é quem responde.
// ---------------------------------------------------------------------------
test("n-ary: o Python da tela e os rótulos seguem em português", async ({ page }) => {
  await abrir(page, ALTA);
  const fig = noArtigo(page);

  await expect(fig.locator(".viz-code-body")).toContainText("def percorre(no):");
  await expect(fig.locator(".viz-code-body")).toContainText("for filho in no.filhos:  # era esq e dir");
  await expect(fig.locator(".viz-vars")).toContainText("nó atual");
  await expect(fig.locator(".viz-vars")).toContainText("grau máximo");
  await expect(fig.locator(".tt-painel-tit").first()).toContainText("Pilha");
  await expect(fig.locator(".tt-painel-tit").first()).toContainText("LIFO, altura da árvore");

  // Rótulo colado numa interpolação, um por um: o guarda não vê nenhum destes.
  await expect(fig.locator(".rec-comp caption")).toHaveText(
    "Altura mínima para guardar 1.000.000 nós, por grau"
  );
  await expect(fig.locator(".viz-var").filter({ hasText: "processados" }).locator(".viz-var-val")).toHaveText(
    "0 de 9"
  );
  // O til da terceira coluna também é texto colado a uma interpolação.
  const primeiraLinha = fig.locator(".rec-comp tbody tr").first().locator("td");
  await expect(primeiraLinha).toHaveText(["2", "20", "~20"]);

  // E o código de por nível é o outro arquivo, com o rótulo certo.
  await fig.getByRole("button", { name: "Por nível (BFS)", exact: true }).click();
  await expect(fig.locator(".viz-code-head")).toHaveText("por_nivel.py");
  await expect(fig.locator(".viz-code-body")).toContainText("fila = deque([raiz])");
});
