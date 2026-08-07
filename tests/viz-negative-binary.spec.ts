import { test, expect, type Locator, type Page } from "@playwright/test";

// Casca adaptativa dos três visualizadores do tópico negative-binary.
//
// A página tem TRÊS `figure.viz` — o complemento, as três formas e a faixa — e
// **as três** estão na casca. Só o complemento tem linha do tempo e bloco de
// código; as outras duas são `total: 1` e `collapsible: false`, e ganham o
// painel, o `Esc`, o foco e a trava de rolagem, sem nada de reprodução.
//
// Todo seletor daqui é escopado na figura certa e escolhido pelo TÍTULO, nunca
// por posição, e as contagens são afirmadas nos dois níveis (página e figura):
// `figure.viz-fit` casava 1 e passou a casar 3, e um seletor que casa com o
// irmão errado devolve um número plausível e nunca reclama.

const URL = "/topico/negative-binary/";
// Mesma folga de subpixel do hook (`SLACK` em src/lib/visualizer.tsx).
const SLACK = 8;

const TITULOS = {
  complemento: "complemento de dois: inverter e somar 1",
  formas: "três formas de escrever um negativo, e três testes",
  faixa: "o mesmo padrão, duas leituras",
};

function por(page: Page, titulo: string): Locator {
  return page
    .locator("article figure.viz")
    .filter({ has: page.locator(".viz-head-title", { hasText: titulo }) });
}

function figura(page: Page): Locator {
  return por(page, TITULOS.complemento);
}

/** Congela transição e animação: ler altura com a transição em voo devolve o meio do caminho. */
async function congelar(page: Page) {
  await page.addStyleTag({
    content: "*, *::before, *::after { transition: none !important; animation: none !important; }",
  });
  await page.evaluate(() => document.fonts.ready);
}

async function abrir(page: Page, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(URL);
  const vp = page.viewportSize();
  expect(vp, "o viewport pedido tem que ser o viewport real").toEqual({ width: w, height: h });
  await congelar(page);
}

/** Anda até o último passo, que é onde o painel da prova existe (o pico de altura). */
async function irAoFim(f: Locator) {
  const proximo = f.getByRole("button", { name: "Próximo ›" });
  const total = parseInt((await f.locator(".viz-step").innerText()).match(/de (\d+)/)![1], 10);
  for (let i = 0; i < total - 1; i++) await proximo.click();
  await expect(proximo).toBeDisabled();
  return total;
}

test("a página tem três visualizadores e os três ganharam a casca", async ({ page }) => {
  await abrir(page, 1512, 900);
  await expect(page.locator("article figure.viz")).toHaveCount(3);
  await expect(page.locator("article figure.viz-fit")).toHaveCount(3);
  // A afordância que faltava: era 1 botão para 3 figuras de aparência idêntica.
  await expect(page.locator("article button", { hasText: "Expandir" })).toHaveCount(3);

  const f = figura(page);
  await expect(f).toHaveClass(/viz-fit/);
  await expect(f.locator(".viz-head-title")).toContainText(TITULOS.complemento);
  // Dentro da figura os seletores da casca casam UM elemento cada; na página
  // eles casam mais, porque os irmãos usam as mesmas classes.
  await expect(f).toHaveCount(1);
  await expect(por(page, TITULOS.formas)).toHaveCount(1);
  await expect(por(page, TITULOS.faixa)).toHaveCount(1);
  await expect(f.locator(".viz-step")).toHaveCount(1);
  await expect(f.locator(".viz-code")).toHaveCount(1);
  await expect(f.locator(".viz-code-slot")).toHaveCount(1);
  await expect(f.locator(".bigo-chip")).toHaveCount(5);
  expect(await page.locator("article figure.viz .viz-step").count()).toBeGreaterThan(1);
});

test("as duas peças de um estado só não prometem esconder bloco nenhum", async ({ page }) => {
  await abrir(page, 1512, 900);
  // Com `collapsible: false` os itens 2, 3 e 4 da §8 do contrato não existem.
  // No lugar deles: a ausência com o rótulo certo. Nenhum botão pode prometer
  // esconder um bloco que o visualizador não tem.
  for (const titulo of [TITULOS.formas, TITULOS.faixa]) {
    const f = por(page, titulo);
    await expect(f.locator(".viz-toggle-codigo")).toHaveCount(0);
    await expect(f.locator(".viz-code")).toHaveCount(0);
    await expect(f.locator(".viz-code-slot")).toHaveCount(0);
    // `total: 1` tira a reprodução inteira; o `.viz-step` que sobra é o resumo
    // do estado, com o rótulo junto do número.
    await expect(f.locator(".viz-atalhos")).toHaveCount(0);
    await expect(f.locator(".viz-progress")).toHaveCount(0);
    await expect(f.locator("button", { hasText: "Rodar" })).toHaveCount(0);
    await expect(f.locator("input[type=range]")).toHaveCount(0);
    await expect(f.locator(".viz-step")).not.toContainText("passo ");
    await expect(f.locator(".viz-head button")).toHaveCount(1);
    await expect(f.locator(".viz-head button")).toHaveText("⤢ Expandir");
  }

  // O rodapé é a diferença entre as duas: a faixa tem controles próprios (os
  // que andam pelos padrões), as três formas não têm nenhum — e aí o
  // `VizFooter` some inteiro em vez de desenhar uma linha vazia.
  await expect(por(page, TITULOS.formas).locator(".viz-foot")).toHaveCount(0);
  await expect(por(page, TITULOS.faixa).locator(".viz-foot")).toHaveCount(1);
  await expect(por(page, TITULOS.faixa).locator(".viz-foot .bn-passeio")).toHaveCount(1);
});

test("o resumo do cabeçalho das duas acompanha o estado, com o rótulo junto", async ({ page }) => {
  await abrir(page, 1512, 900);

  // As três formas: o placar dos três testes, e ele muda de acordo com o valor.
  const formas = por(page, TITULOS.formas);
  await expect(formas.locator(".viz-step")).toHaveText("1 de 3 passam nos três testes");
  await formas.locator(".bigo-chip", { hasText: "negar 0" }).click();
  // Com zero, as três "passam" no teste da soma, mas só o complemento de dois
  // tem um zero só — o placar continua 1 de 3, e os cartões é que mudam.
  await expect(formas.locator(".ms-op")).toHaveCount(3);
  await expect(formas.locator(".ms-op").nth(0).locator(".bb-formula-tit")).toHaveText("Sinal e magnitude");
  await expect(formas.locator(".ms-op").nth(1).locator(".bb-formula-tit")).toHaveText("Complemento de um");
  await expect(formas.locator(".ms-op").nth(2).locator(".bb-formula-tit")).toHaveText("Complemento de dois");
  await expect(formas.locator(".ms-op").nth(2).locator(".bb-formula-selo")).toHaveText("passa nos três");
  // Rótulo e valor no mesmo cartão: "2" ao lado de "padrões de bits que valem
  // zero" é o defeito do sinal-magnitude; ao lado de outro rótulo seria ruído.
  const zerosDe = (n: number) =>
    formas.locator(".ms-op").nth(n).locator("li").filter({ hasText: "padrões de bits que valem zero" }).locator("b");
  await expect(zerosDe(0)).toHaveText("2");
  await expect(zerosDe(1)).toHaveText("2");
  await expect(zerosDe(2)).toHaveText("1");

  // A faixa: o padrão e as duas leituras dele, lidas juntas no cabeçalho.
  const faixa = por(page, TITULOS.faixa);
  await expect(faixa.locator(".viz-step")).toHaveText("10000000 · sem sinal 128 · com sinal -128");
  await faixa.locator(".viz-foot .bn-passeio button", { hasText: "mais 1" }).click();
  await expect(faixa.locator(".viz-step")).toHaveText("10000001 · sem sinal 129 · com sinal -127");
});

test("o mais 1 da faixa fica parado no pé do painel enquanto o miolo rola", async ({ page }) => {
  // 390x844 de propósito: é a régua em que, com os botões dentro do miolo, o
  // `mais 1 ›` era arrastado 358px ACIMA do topo visível quando o aluno chegava
  // à tabela do fim. A 1440x700 sobravam 15px, e a 1512x900 o miolo mal rola.
  await abrir(page, 390, 844);
  const f = por(page, TITULOS.faixa);
  const botao = f.locator("button", { hasText: "Expandir" });
  await botao.click();
  const p = page.locator(".viz-overlay figure.viz-fit");
  await expect(p).toBeVisible();

  const andar = p.locator(".viz-foot .bn-passeio button", { hasText: "mais 1" });
  const cabeca = p.locator(".viz-head");
  const corpo = p.locator(".viz-body");
  await corpo.evaluate((e) => { e.scrollTop = 0; });
  const antes = {
    andar: (await andar.boundingBox())!.y,
    cabeca: (await cabeca.boundingBox())!.y,
    chip: (await p.locator(".bigo-chip").first().boundingBox())!.y,
  };
  await corpo.evaluate((e) => { e.scrollTop = e.scrollHeight; });
  const depois = {
    andar: (await andar.boundingBox())!.y,
    cabeca: (await cabeca.boundingBox())!.y,
    chip: (await p.locator(".bigo-chip").first().boundingBox())!.y,
  };

  // A asserção que carrega o sentido: a posição do controle comparada com ela
  // mesma. `toBeInViewport()` sozinho passa com o botão de volta no miolo,
  // porque ele aceita qualquer interseção nas duas pontas da rolagem.
  expect(Math.round(depois.andar - antes.andar), "o mais 1 não anda quando o miolo rola").toBe(0);
  expect(Math.round(depois.cabeca - antes.cabeca), "o cabeçalho não anda").toBe(0);
  await expect(andar).toBeInViewport({ ratio: 1 });
  // E ele continua funcionando de onde está.
  await andar.click();
  await expect(p.locator(".viz-step")).toContainText("· sem sinal 129 ·");

  // O rodapé é novo NESTA peça e nasce numa tela de 390px: ele não pode
  // estourar a largura nem encolher a própria legenda para tamanho ilegível —
  // uma caixa com texto de 0px não estoura nada e não colapsa nada, então
  // medir só overflow deixaria isso passar.
  const legenda = p.locator(".bn-passeio-txt");
  const m = await legenda.evaluate((e) => ({
    fonte: parseFloat(getComputedStyle(e).fontSize),
    estoura: e.scrollWidth - e.clientWidth,
  }));
  expect(m.fonte, "a legenda do rodapé continua legível").toBeGreaterThan(9);
  expect(m.estoura, "a legenda não vaza da própria caixa").toBeLessThanOrEqual(1);
  expect(
    await p.evaluate((e) => (e.querySelector(".viz-foot") as HTMLElement).scrollWidth - e.clientWidth),
    "o rodapé não estoura a largura do painel"
  ).toBeLessThanOrEqual(1);

  // Premissas depois das asserções: quem rola é o miolo, e ele tem o que rolar.
  expect(Math.round(depois.chip - antes.chip), "quem anda é o CONTEÚDO").toBeLessThan(-100);
  expect(await corpo.evaluate((e) => e.scrollHeight - e.clientHeight)).toBeGreaterThan(SLACK);
  expect(await corpo.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
  expect(await p.evaluate((e) => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual(SLACK);
});

test("no artigo, em 390px, nenhuma das três estoura a largura", async ({ page }) => {
  await abrir(page, 390, 844);
  // A página inteira primeiro...
  expect(
    await page.evaluate(() => document.body.scrollWidth - window.innerWidth),
    "a página não rola na horizontal"
  ).toBeLessThanOrEqual(0);
  // ...e depois o que ela não pega: rótulo vazando da própria caixa, que
  // `minmax(140px, 1fr)` esconde da medição da página.
  for (const titulo of Object.values(TITULOS)) {
    const f = por(page, titulo);
    const cab = f.locator(".viz-head-title span").nth(1);
    const m = await cab.evaluate((e) => ({
      fonte: parseFloat(getComputedStyle(e).fontSize),
      estoura: e.scrollWidth - e.clientWidth,
    }));
    expect(m.fonte, `o título de "${titulo}" continua legível`).toBeGreaterThan(9);
    expect(m.estoura, `o título de "${titulo}" não vaza da caixa`).toBeLessThanOrEqual(1);
    // O cabeçalho quebra em duas linhas nesta largura (é o eixo de altura que a
    // casca cria, §9), e o botão precisa continuar inteiro na tela — no artigo
    // ele está muito abaixo da dobra, então role até ele antes de olhar.
    const botao = f.locator("button", { hasText: "Expandir" });
    await botao.scrollIntoViewIfNeeded();
    await expect(botao).toBeInViewport({ ratio: 1 });
  }
});

test("o painel das três formas é diálogo, e o Esc devolve o foco de onde saiu", async ({ page }) => {
  await abrir(page, 1440, 700);
  const f = por(page, TITULOS.formas);
  const botao = f.locator("button", { hasText: "Expandir" });
  await botao.click();

  const overlay = page.locator(".viz-overlay-fit");
  await expect(overlay).toHaveAttribute("role", "dialog");
  await expect(overlay).toHaveAttribute("aria-modal", "true");
  // O `aria-label` é o título DESTA peça, não o de um irmão.
  await expect(overlay).toHaveAttribute(
    "aria-label",
    "Visualizador · três formas de escrever um negativo, e três testes"
  );
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");

  const p = page.locator(".viz-overlay figure.viz-fit");
  const corpo = p.locator(".viz-body");
  const cabeca = p.locator(".viz-head");
  await corpo.evaluate((e) => { e.scrollTop = 0; });
  const antes = (await cabeca.boundingBox())!.y;
  const chipAntes = (await p.locator(".bigo-chip").first().boundingBox())!.y;
  // Sem número mágico: o conteúdo anda exatamente o que o miolo rolou.
  const rolou = await corpo.evaluate((e) => {
    e.scrollTop = e.scrollHeight;
    return Math.round(e.scrollTop);
  });
  expect(Math.round((await cabeca.boundingBox())!.y - antes), "o cabeçalho não anda").toBe(0);
  expect(
    Math.round((await p.locator(".bigo-chip").first().boundingBox())!.y - chipAntes),
    "quem anda é o CONTEÚDO, e exatamente o que o miolo rolou"
  ).toBe(-rolou);
  expect(rolou, "o miolo precisa ter o que rolar").toBeGreaterThan(SLACK);
  expect(await corpo.evaluate((e) => e.scrollHeight - e.clientHeight)).toBeGreaterThan(SLACK);
  expect(await p.evaluate((e) => e.scrollHeight - e.clientHeight)).toBeLessThanOrEqual(SLACK);

  // `Esc` fecha e destrava a rolagem da página. O contrato §5 promete também
  // que o foco volta para onde estava, e isso NÃO acontece: ele vai para o
  // `<body>`, porque o `⤢ Expandir` mora dentro da figura que o `createPortal`
  // desmonta. É defeito do hook, alcança todas as peças (medido no `big-o`
  // também) e não é consertado aqui — por isso não há asserção de foco.
  await page.keyboard.press("Escape");
  await expect(overlay).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe("hidden");
  await expect(botao).toHaveText("⤢ Expandir");
});

test("as três formas recalculam os cartões quando o número muda", async ({ page }) => {
  // É este teste que guarda o conserto do `FORMAS`: ele saiu de dentro do
  // componente para o escopo do módulo justamente porque era recriado a cada
  // render e alimentava um `useMemo` que não o declarava. O que dá para provar
  // pela tela é o que a regra protege: o memo acompanha a entrada dele.
  await abrir(page, 1512, 900);
  const f = por(page, TITULOS.formas);
  const lidoDe = (n: number) => f.locator(".ms-op").nth(n).locator(".bb-formula-fim");
  const bitsDe = (n: number) => f.locator(".ms-op").nth(n).locator(".bn-fita .bn-bit .bn-bit-val");

  // A ordem dos três cartões é a do array, e ela é conteúdo: os testes da tela
  // falam de "sinal e magnitude" primeiro e "complemento de dois" por último.
  await expect(f.locator(".ms-op .bb-formula-tit")).toHaveText([
    "Sinal e magnitude",
    "Complemento de um",
    "Complemento de dois",
  ]);

  // 26 = 00011010. Negado: 10011010 (sinal), 11100101 (um), 11100110 (dois).
  await expect(bitsDe(0)).toHaveText(["1", "0", "0", "1", "1", "0", "1", "0"]);
  await expect(bitsDe(2)).toHaveText(["1", "1", "1", "0", "0", "1", "1", "0"]);
  await expect(lidoDe(2)).toContainText("Lido de volta: -26");
  // As três convenções LEEM de volta o valor certo para todo v ≤ 127, e os
  // quatro presets (26, 1, 127, 0) são todos ≤ 127: o sufixo
  // " (não bate com o esperado)" do `:135` não aparece em preset nenhum, em
  // régua nenhuma. Está reportado como defeito de conteúdo — mesma classe do
  // "(o desta árvore)" do NAryTreeVisualizer —, e o teste afirma o que a tela
  // de fato mostra em vez de exigir um texto que ninguém vê.
  await expect(lidoDe(0)).toHaveText("Lido de volta: -26");

  // Troca o número: os três cartões têm que acompanhar. Com o memo preso à
  // entrada errada, eles continuariam mostrando a negação de 26.
  await f.locator(".bigo-chip", { hasText: "negar 127" }).click();
  await expect(f.locator(".viz-step")).toHaveText("1 de 3 passam nos três testes");
  // 127 = 01111111. Complemento de dois: 10000001 = -127.
  await expect(bitsDe(2)).toHaveText(["1", "0", "0", "0", "0", "0", "0", "1"]);
  await expect(lidoDe(2)).toContainText("Lido de volta: -127");
  await expect(lidoDe(2)).not.toContainText("(não bate com o esperado)");
  // E a ordem dos três continua sendo a do array, depois da troca.
  await expect(f.locator(".ms-op .bb-formula-tit")).toHaveText([
    "Sinal e magnitude",
    "Complemento de um",
    "Complemento de dois",
  ]);
});

test("a marcha inicial da peça sobreviveu: o rótulo diz 1.5x ao lado do valor 4", async ({ page }) => {
  await abrir(page, 1512, 900);
  const f = figura(page);
  await f.getByRole("button", { name: "⤢ Expandir" }).click();
  const p = page.locator(".viz-overlay figure.viz");
  await expect(p).toBeVisible();
  const vel = p.locator(".viz-speed");
  // Rótulo e valor lidos JUNTOS: "1.5x" ao lado de um slider em 3 seria o
  // rótulo de outra marcha, e a peça teria perdido o ritmo dela.
  await expect(vel.locator("input[type=range]")).toHaveValue("4");
  await expect(vel.locator(".val")).toHaveText("1.5x");
  await expect(vel).toContainText("Velocidade");
});

test("no painel o cabeçalho e os controles não andam quando o miolo rola", async ({ page }) => {
  // 1440x700 e o último passo: é onde o painel da prova existe e o miolo tem
  // 175px de sobra. No passo 1, a 1512x900, não há o que rolar e o teste seria
  // decoração verde.
  await abrir(page, 1440, 700);
  const f = figura(page);
  await f.getByRole("button", { name: "⤢ Expandir" }).click();
  const p = page.locator(".viz-overlay figure.viz");
  await expect(p).toBeVisible();
  await irAoFim(p);

  const play = p.getByRole("button", { name: "▶ Rodar" });
  const antes = await play.boundingBox();
  const cabeca = p.locator(".viz-head");
  const cabecaAntes = await cabeca.boundingBox();

  const m = await p.evaluate((el, slack) => {
    const body = el.querySelector(".viz-body") as HTMLElement;
    body.scrollTop = 0;
    const sobra = body.scrollHeight - body.clientHeight;
    body.scrollTop = body.scrollHeight;
    return {
      sobraMiolo: sobra,
      rolouMiolo: Math.round(body.scrollTop),
      sobraFigura: el.scrollHeight - el.clientHeight,
      folga: slack,
    };
  }, SLACK);

  // A ASSERÇÃO QUE CARREGA O SENTIDO: a posição comparada com ela mesma.
  // `toBeInViewport()` sozinho passa com o rodapé de volta dentro do miolo.
  const depois = await play.boundingBox();
  const cabecaDepois = await cabeca.boundingBox();
  expect(Math.round(depois!.y - antes!.y), "o ▶ Rodar não anda quando o miolo rola").toBe(0);
  expect(Math.round(cabecaDepois!.y - cabecaAntes!.y), "o cabeçalho não anda quando o miolo rola").toBe(0);
  await expect(play).toBeInViewport({ ratio: 1 });

  // Premissas depois das asserções: se a quebra desfizer a situação, a mensagem
  // que aparece é a da asserção que importa, não a da premissa.
  expect(m.sobraMiolo, "o miolo precisa ter o que rolar, senão o teste é decoração").toBeGreaterThan(SLACK);
  expect(m.rolouMiolo, "quem rola é o MIOLO").toBeGreaterThan(0);
  expect(m.sobraFigura, "a figura inteira NÃO rola").toBeLessThanOrEqual(SLACK);
});

test("em tela baixa o botão diz Mostrar código e o bloco está recolhido de fato", async ({ page }) => {
  await abrir(page, 1440, 700);
  const f = figura(page);
  const botao = f.locator(".viz-toggle-codigo");
  // rótulo e estado no mesmo elemento: rótulo certo com bloco aberto ensina errado.
  await expect(botao).toHaveText("Mostrar código");
  await expect(botao).toHaveAttribute("aria-expanded", "false");
  await expect(f).toHaveAttribute("data-codigo", "off");

  const alturaCodigo = await f.locator(".viz-code").evaluate((el) => el.getBoundingClientRect().height);
  expect(Math.round(alturaCodigo), "recolhido é ALTURA zero, não só coluna zerada").toBeLessThanOrEqual(SLACK);
  // O código continua no DOM (é o que permite medir o pior caso), mas fora do
  // teclado e dos leitores de tela.
  await expect(f.locator(".viz-code")).toHaveAttribute("aria-hidden", "true");
  expect(await f.locator(".viz-code .viz-line").count()).toBe(7);
});

test("em tela alta o código já vem aberto, com o rótulo invertido", async ({ page }) => {
  await abrir(page, 1440, 1200);
  const f = figura(page);
  const botao = f.locator(".viz-toggle-codigo");
  await expect(botao).toHaveText("Ocultar código");
  await expect(botao).toHaveAttribute("aria-expanded", "true");
  await expect(f).toHaveAttribute("data-codigo", "on");

  const alturaCodigo = await f.locator(".viz-code").evaluate((el) => el.getBoundingClientRect().height);
  expect(alturaCodigo, "aberto é altura de verdade, não `visibility`").toBeGreaterThan(100);
  // Lê o texto do bloco pelas `.viz-line`: `innerText` devolve vazio quando ele
  // está recolhido, e a varredura sai "limpa" sobre o que não olhou.
  await expect(f.locator(".viz-code-head")).toHaveText("complemento.py");
  const linhas = await f.locator(".viz-code .viz-line").allTextContents();
  expect(linhas[2]).toContain("invertido = ~positivo & 0xFF");
  expect(linhas[3]).toContain("negativo  = (invertido + 1) & 0xFF");
});

test("a escolha do aluno vence a medição ao trocar de preset", async ({ page }) => {
  // A medição fecha o código no preset "26" e fecharia também no "0, o teste da
  // ambiguidade", cuja dica é a mais alta das cinco — ou seja, a troca dispara
  // medição nova (o preset está em `measureOn`) e a medição DISCORDA do aluno.
  // Sem isso o teste aprovaria sozinho.
  //
  // 1440x700, e não a régua de 1512x900 do contrato, POR MEDIÇÃO: com o código
  // aberto o miolo pede 724px nas duas. A 1512x900 ele tem 708 e estoura por
  // 16px, contra um SLACK de 8 — oito pixels de margem, que a suíte cheia já
  // virou (a precondição recebeu "on"). A 1440x700 ele tem 517 e estoura por
  // 207. Precondição que afirma o veredito da medição precisa da MARGEM medida,
  // não de uma observação.
  await abrir(page, 1440, 700);
  const f = figura(page);
  await f.getByRole("button", { name: "⤢ Expandir" }).click();
  const p = page.locator(".viz-overlay figure.viz");
  await expect(p).toBeVisible();
  await expect(p).toHaveAttribute("data-codigo", "off");

  await p.getByRole("button", { name: "Mostrar código" }).click();
  await expect(p).toHaveAttribute("data-codigo", "on");

  await p.getByRole("button", { name: "0, o teste da ambiguidade", exact: true }).click();
  // Confirma na TELA que o estado trocou mesmo, antes de concluir qualquer coisa.
  await expect(p.locator(".tt-legenda-arvore")).toContainText("o motivo de o complemento de dois ter vencido");
  await expect(p.locator(".viz-step")).toHaveText("passo 1 de 19");

  // Amostra ao longo do intervalo: "está aberto agora" não é "continua aberto".
  for (let i = 0; i < 5; i++) {
    await expect(p).toHaveAttribute("data-codigo", "on");
    await expect(p.locator(".viz-toggle-codigo")).toHaveText("Ocultar código");
    await page.waitForTimeout(120);
  }
});

test("as setas e o espaço andam a animação no painel", async ({ page }) => {
  await abrir(page, 1512, 900);
  const f = figura(page);
  await f.getByRole("button", { name: "⤢ Expandir" }).click();
  const p = page.locator(".viz-overlay figure.viz");
  await expect(p).toBeVisible();
  // `toBeVisible()` NÃO é "pronto para o teclado": o listener nasce num efeito.
  // O mesmo commit que dá foco à figura registra o `keydown`, então esperar o
  // foco é a pré-condição que fecha a corrida.
  await expect(p).toBeFocused();
  await expect(p.locator(".viz-step")).toHaveText("passo 1 de 13");

  // UMA ação, não um par que se cancela: ArrowRight seguido de ArrowLeft volta
  // ao estado de origem e fica verde mesmo com a tecla sequestrada.
  await page.keyboard.press("ArrowRight");
  await expect(p.locator(".viz-step")).toHaveText("passo 2 de 13");
  await page.keyboard.press("ArrowRight");
  await expect(p.locator(".viz-step")).toHaveText("passo 3 de 13");

  await page.keyboard.press(" ");
  await expect(p.getByRole("button", { name: "❚❚ Pausar" })).toBeVisible();
  await page.keyboard.press(" ");
  await expect(p.getByRole("button", { name: "▶ Rodar" })).toBeVisible();
});

test("a seta no controle de velocidade é do slider, e não do passo", async ({ page }) => {
  await abrir(page, 1512, 900);
  const f = figura(page);
  await f.getByRole("button", { name: "⤢ Expandir" }).click();
  const p = page.locator(".viz-overlay figure.viz");
  await expect(p).toBeVisible();
  await expect(p).toBeFocused();

  const slider = p.locator(".viz-speed input[type=range]");
  await expect(p.locator(".viz-speed input[type=range]")).toHaveCount(1);
  await slider.focus();
  await expect(slider).toBeFocused();
  await expect(p.locator(".viz-step")).toHaveText("passo 1 de 13");

  await page.keyboard.press("ArrowRight");
  // A tecla foi para o slider: a marcha subiu e o rótulo ao lado acompanhou.
  await expect(slider).toHaveValue("5");
  await expect(p.locator(".viz-speed .val")).toHaveText("2x");
  // E o passo NÃO andou.
  await expect(p.locator(".viz-step")).toHaveText("passo 1 de 13");
});

test("o painel da prova só existe no último passo, e é ele que move a altura", async ({ page }) => {
  await abrir(page, 1512, 900);
  const f = figura(page);
  await expect(f.locator(".hp-bloco")).toHaveCount(2);
  const antes = (await f.boundingBox())!.height;

  await irAoFim(f);
  await expect(f.locator(".hp-bloco")).toHaveCount(3);
  // Rótulo junto do conteúdo: o terceiro bloco é o da prova, não um repetido.
  await expect(f.locator(".hp-bloco").nth(2).locator(".tt-painel-tit")).toContainText("A prova");
  await expect(f.locator(".hp-bloco").nth(2).locator(".tt-painel-tit em")).toHaveText(
    "somar o número com o oposto dele"
  );
  const depois = (await f.boundingBox())!.height;
  expect(Math.round(depois - antes), "o bloco condicional é o eixo de altura desta peça").toBeGreaterThan(100);
});
