import { test, expect, type Locator, type Page } from "@playwright/test";

// Casca adaptativa do BinarioComplemento (tópico negative-binary).
//
// A página tem TRÊS `figure.viz` — o complemento, as três formas e a faixa —, e
// só a primeira é adaptada. Todo seletor daqui é escopado nela, e as contagens
// são afirmadas nos dois níveis (página e figura), porque um seletor que casa
// com o irmão errado devolve um número plausível e nunca reclama.

const URL = "/topico/negative-binary/";
// Mesma folga de subpixel do hook (`SLACK` em src/lib/visualizer.tsx).
const SLACK = 8;

function figura(page: Page): Locator {
  return page.locator("article figure.viz").first();
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

test("a página tem três visualizadores e só o complemento ganhou a casca", async ({ page }) => {
  await abrir(page, 1512, 900);
  await expect(page.locator("article figure.viz")).toHaveCount(3);
  await expect(page.locator("article figure.viz-fit")).toHaveCount(1);

  const f = figura(page);
  await expect(f).toHaveClass(/viz-fit/);
  await expect(f.locator(".viz-head-title")).toContainText("complemento de dois: inverter e somar 1");
  // Dentro da figura os seletores da casca casam UM elemento cada; na página
  // eles casam mais, porque os irmãos usam as mesmas classes.
  await expect(f.locator(".viz-step")).toHaveCount(1);
  await expect(f.locator(".viz-code")).toHaveCount(1);
  await expect(f.locator(".viz-code-slot")).toHaveCount(1);
  await expect(f.locator(".bigo-chip")).toHaveCount(5);
  expect(await page.locator("article figure.viz .viz-step").count()).toBeGreaterThan(1);
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
