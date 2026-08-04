import { test, expect, type Page, type Locator } from "@playwright/test";

// ---------------------------------------------------------------------------
// A casca adaptativa nos três visualizadores do tópico `strings`.
//
// Cada teste aqui mede COMPORTAMENTO e lê RÓTULO. Contar elemento não prova
// nada — já passaram por uma suíte verde um visualizador sem botão nenhum e um
// painel de 0px de largura —, e comportamento certo com rótulo errado ensina
// errado do mesmo jeito. Por isso, sempre que um número é verificado, o texto
// ao lado dele entra na mesma asserção.
//
// A janela é 1512x900 (notebook de 16"), que é o caso que motivou a casca: com
// ela o Rotate pedia 931px no artigo contra 816 de orçamento, e no expandido o
// "▶ Rodar" caía 22px abaixo da borda da janela.
// ---------------------------------------------------------------------------

const BYTES = 0;
const STRINGS = 1;
const ROTATE = 2;

function figura(page: Page, n: number): Locator {
  return page.locator("article figure.viz").nth(n);
}

function painel(page: Page): Locator {
  return page.locator(".viz-overlay-fit figure.viz-fit");
}

async function abrirTopico(page: Page, largura = 1512, altura = 900) {
  await page.setViewportSize({ width: largura, height: altura });
  await page.goto("/topico/strings/");
  // As fontes chegam com `display: swap`: medir antes mede a de fallback.
  await page.evaluate(() => document.fonts.ready);
}

/** Altura da caixa de um elemento, arredondada. Zero quando ele não tem caixa. */
async function altura(alvo: Locator): Promise<number> {
  const caixa = await alvo.boundingBox();
  return caixa ? Math.round(caixa.height) : 0;
}

/**
 * Espera a medição TERMINAR, em vez de dormir um tanto e torcer. O `data-anim`
 * é o sinal que a própria casca publica: ele fica em "off" enquanto a medição
 * acontece com a transição congelada, e só volta para "on" depois da decisão.
 * Ler altura antes disso pega o layout do meio do caminho.
 */
async function medicaoTerminou(alvo: Locator) {
  await expect(alvo).toHaveAttribute("data-anim", "on");
}

async function expandir(page: Page, n: number) {
  await figura(page, n).getByRole("button", { name: "⤢ Expandir" }).click();
  await expect(painel(page)).toBeVisible();
  await medicaoTerminou(painel(page));
}

// ---------------------------------------------------------------------------
// 1. Cabeçalho e rodapé parados, e o botão que faz o algoritmo andar na tela.
// ---------------------------------------------------------------------------

test("rotate expandido: cabeçalho e rodapé não se mexem quando o miolo rola até o fim", async ({
  page,
}) => {
  await abrirTopico(page);
  await expandir(page, ROTATE);
  const p = painel(page);

  // O bloco de código aberto é o pior caso de altura, e é o que garante que
  // existe rolagem para testar. A escolha é do aluno e tem que valer.
  const alternar = p.getByRole("button", { name: /código$/ });
  if ((await alternar.textContent())?.includes("Mostrar")) await alternar.click();
  await expect(alternar).toHaveText("Ocultar código");
  await expect.poll(() => altura(p.locator(".viz-code"))).toBeGreaterThan(100);

  const miolo = p.locator(".viz-body");
  const sobra = await miolo.evaluate((el) => el.scrollHeight - el.clientHeight);
  // Sem sobra o teste não prova nada: ele precisa de conteúdo para rolar.
  expect(sobra).toBeGreaterThan(0);

  const cabeca = p.locator(".viz-head");
  const rodape = p.locator(".viz-foot");
  const rodar = p.getByRole("button", { name: "▶ Rodar" });

  const antes = {
    cabeca: (await cabeca.boundingBox())!.y,
    rodape: (await rodape.boundingBox())!.y,
    rodar: (await rodar.boundingBox())!.y,
  };

  // "Está parado agora" não é "continua parado": amostra ao longo da rolagem,
  // em vez de olhar só o instante depois de uma espera fixa.
  const desvios: number[] = [];
  for (const destino of [0.25, 0.5, 0.75, 1]) {
    await miolo.evaluate((el, f) => {
      el.scrollTop = (el.scrollHeight - el.clientHeight) * f;
    }, destino);
    await page.waitForTimeout(120);
    desvios.push(
      Math.abs((await cabeca.boundingBox())!.y - antes.cabeca),
      Math.abs((await rodape.boundingBox())!.y - antes.rodape),
      Math.abs((await rodar.boundingBox())!.y - antes.rodar)
    );
  }
  expect(Math.max(...desvios)).toBeLessThanOrEqual(1);

  // E o botão que move o algoritmo continua inteiro dentro da janela — que é o
  // que ele NÃO fazia antes da casca (medido: topo em 922px numa janela de 900).
  const caixa = (await rodar.boundingBox())!;
  const janela = page.viewportSize()!.height;
  expect(caixa.y).toBeGreaterThanOrEqual(0);
  expect(caixa.y + caixa.height).toBeLessThanOrEqual(janela);
  // O rótulo, e não só a posição: um botão no lugar certo dizendo outra coisa
  // manda o aluno clicar no que ele não quer.
  await expect(rodar).toHaveText("▶ Rodar");
});

// ---------------------------------------------------------------------------
// 2 e 3. Quem decide é a medição: recolhido na tela baixa, aberto na tela alta.
// ---------------------------------------------------------------------------

test("strings no artigo: tela baixa recolhe o código e diz Mostrar código", async ({ page }) => {
  await abrirTopico(page, 1512, 700);
  const f = figura(page, STRINGS);
  const alternar = f.getByRole("button", { name: /código$/ });

  await expect(alternar).toHaveText("Mostrar código");
  await expect(f).toHaveAttribute("data-codigo", "off");
  // Recolhido é ALTURA zerada, não só coluna estreita: zerar a trilha da coluna
  // deixava a linha do grid com a altura inteira do bloco (armadilha medida).
  await expect.poll(() => altura(f.locator(".viz-code"))).toBeLessThanOrEqual(4);
  // E ele continua no DOM, fora do teclado e dos leitores de tela.
  await expect(f.locator(".viz-code")).toHaveAttribute("aria-hidden", "true");
});

test("strings no artigo: tela alta já vem com o código aberto e legível", async ({ page }) => {
  await abrirTopico(page, 1512, 1500);
  const f = figura(page, STRINGS);
  const alternar = f.getByRole("button", { name: /código$/ });

  await expect(alternar).toHaveText("Ocultar código");
  await expect(f).toHaveAttribute("data-codigo", "on");
  await expect.poll(() => altura(f.locator(".viz-code"))).toBeGreaterThan(100);
  // O código certo do modo certo: rótulo junto do número, sempre.
  await expect(f.locator(".viz-code-head")).toHaveText("concat.py · O(n²)");
  await expect(f.locator(".viz-code-body")).toContainText("s = s + c");
});

// ---------------------------------------------------------------------------
// 4. A escolha do aluno vence a medição, e não é desfeita por troca de estado.
// ---------------------------------------------------------------------------

test("strings: abrir o código na mão sobrevive a trocar de modo, que pediria medição nova", async ({
  page,
}) => {
  await abrirTopico(page, 1512, 700);
  const f = figura(page, STRINGS);
  const alternar = f.getByRole("button", { name: /código$/ });

  await expect(alternar).toHaveText("Mostrar código");
  await alternar.click();
  await expect(alternar).toHaveText("Ocultar código");
  await expect.poll(() => altura(f.locator(".viz-code"))).toBeGreaterThan(100);

  // Trocar de modo muda o `measureOn` e dispara medição nova. Numa tela de
  // 700px o join não cabe de jeito nenhum — e mesmo assim a escolha manda.
  await f.getByRole("button", { name: /lista \+ join/ }).click();
  await expect(f.locator(".viz-code-head")).toHaveText("join.py · O(n)");
  await medicaoTerminou(f);

  // A promessa aqui é de PERMANÊNCIA, então uma leitura só depois de uma espera
  // não serve: ela olha um instante. Amostra ao longo do intervalo em que a
  // medição nova teria tempo de desfazer a escolha.
  for (let i = 0; i < 4; i++) {
    await expect(alternar).toHaveText("Ocultar código");
    await expect(f).toHaveAttribute("data-codigo", "on");
    expect(await altura(f.locator(".viz-code"))).toBeGreaterThan(100);
    await page.waitForTimeout(150);
  }
});

// ---------------------------------------------------------------------------
// 5. Teclado: as setas e o espaço dirigem a animação, e o campo em edição manda.
// ---------------------------------------------------------------------------

test("rotate expandido: setas andam o passo e o espaço roda, sem roubar a tecla de quem digita", async ({
  page,
}) => {
  await abrirTopico(page);
  await expandir(page, ROTATE);
  const p = painel(page);
  const passo = p.locator(".viz-step");

  await expect(passo).toHaveText(/^passo 1 de \d+$/);
  const total = Number((await passo.textContent())!.match(/de (\d+)/)![1]);
  expect(total).toBeGreaterThan(2);

  await page.keyboard.press("ArrowRight");
  await expect(passo).toHaveText(`passo 2 de ${total}`);
  await page.keyboard.press("ArrowRight");
  await expect(passo).toHaveText(`passo 3 de ${total}`);
  await page.keyboard.press("ArrowLeft");
  await expect(passo).toHaveText(`passo 2 de ${total}`);

  // Espaço roda: o passo tem que ANDAR sozinho até o fim, não só o rótulo mudar.
  await page.keyboard.press("Space");
  await expect(passo).toHaveText(`passo ${total} de ${total}`);
  await page.keyboard.press("ArrowLeft");
  await expect(passo).toHaveText(`passo ${total - 1} de ${total}`);

  // Com o cursor num campo, seta é cursor e espaço é espaço. Sequestrar isso
  // deixa a entrada impossível de editar, que é pior que não ter atalho.
  const campoS = p.locator("input.viz-input").first();
  await campoS.click();
  const valorAntes = await campoS.inputValue();

  // As setas ficam com o cursor do campo: nem o passo anda, nem o valor muda.
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await expect(passo).toHaveText(`passo ${total - 1} de ${total}`);
  await expect(campoS).toHaveValue(valorAntes);

  // E o espaço é um espaço digitado. Se ele tivesse sido sequestrado para
  // rodar/pausar, o `preventDefault` engoliria o caractere e o valor ficaria
  // igual — é essa diferença que a asserção pega.
  //
  // A comparação é com o valor contra ele mesmo, e não com o fim da string: as
  // setas acabaram de mexer o cursor, e onde o clique o deixou depende do
  // sistema. O que importa é ter entrado UM espaço e nada mais ter mudado.
  await page.keyboard.press("Space");
  await expect.poll(() => campoS.inputValue()).toHaveLength(valorAntes.length + 1);
  expect((await campoS.inputValue()).replace(" ", "")).toBe(valorAntes);
  // Trocar a entrada reinicia a animação, e ela fica PARADA no primeiro passo.
  await expect(passo).toHaveText(/^passo 1 de \d+$/);
  const depoisDeUmSegundo = passo;
  await page.waitForTimeout(1000);
  await expect(depoisDeUmSegundo).toHaveText(/^passo 1 de \d+$/);
});

// ---------------------------------------------------------------------------
// 6 e 7. O visualizador de bytes: sem linha do tempo, e o recolhível é a TABELA.
// ---------------------------------------------------------------------------

test("bytes: o botão fala em tabela, e recolher tira ALTURA da peça", async ({ page }) => {
  await abrirTopico(page);
  const f = figura(page, BYTES);
  const campo = f.locator("input.viz-input");
  const alternar = f.getByRole("button", { name: /tabela$/ });
  const tabela = f.locator(".str-scroll");

  // Com o padrão de 3 code points a peça cabe, e a medição deixa tudo à mostra.
  await expect(alternar).toHaveText("Ocultar tabela");

  // 20 code points é o limite da entrada, e é o pior caso de altura.
  await campo.fill("abcdefghijklmnopqrst");
  await expect(f.locator(".str-tab tbody tr")).toHaveCount(20);
  await medicaoTerminou(f);

  // Agora não cabe mais, e a medição recolhe sozinha. O rótulo diz o que sumiu:
  // "tabela", e não "código", que é o padrão do hook e mentiria aqui.
  await expect(alternar).toHaveText("Mostrar tabela");
  const recolhida = await altura(f);
  // Recolher é altura, não largura: a tabela segue no DOM com caixa zerada.
  await expect.poll(() => altura(tabela)).toBeLessThanOrEqual(4);
  await expect(tabela).toHaveAttribute("aria-hidden", "true");

  await alternar.click();
  await expect(alternar).toHaveText("Ocultar tabela");
  await expect.poll(() => altura(tabela)).toBeGreaterThan(400);
  const aberta = await altura(f);
  // O recolhimento vale o que ele promete: 680px medidos entre os dois estados.
  expect(aberta - recolhida).toBeGreaterThan(400);
});

test("bytes: sem linha do tempo, o cabeçalho conta bytes e o número acompanha o encoding", async ({
  page,
}) => {
  await abrirTopico(page);
  const f = figura(page, BYTES);
  const resumo = f.locator(".viz-step");

  // `total: 1`: nada de "passo N de M", nada de controles de reprodução.
  await expect(resumo).toHaveText("3 bytes em UTF-8");
  await expect(f.locator(".viz-foot")).toHaveCount(0);
  await expect(f.getByRole("button", { name: "▶ Rodar" })).toHaveCount(0);

  // Número E rótulo juntos: o mesmo texto tem que trocar os dois ao mesmo tempo,
  // senão a peça ensina o total de um encoding com o nome de outro.
  await f.getByRole("button", { name: /^UTF-32/ }).click();
  await expect(resumo).toHaveText("12 bytes em UTF-32");
  await f.getByRole("button", { name: /^ASCII/ }).click();
  await expect(resumo).toHaveText("3 bytes em ASCII");
  await f.locator("input.viz-input").fill("ção");
  await expect(resumo).toHaveText("3 bytes em ASCII");
  // E o aviso de perda aparece com a conta certa, não com um texto genérico.
  await expect(f.locator(".str-enc.perde .str-enc-sub")).toHaveText(
    'perde 2 caracteres, viram "?"'
  );
});

test("bytes expandido: o cabeçalho fica parado enquanto a tabela aberta rola", async ({ page }) => {
  await abrirTopico(page);
  const f = figura(page, BYTES);
  await f.locator("input.viz-input").fill("abcdefghijklmnopqrst");
  await expect(f).toHaveAttribute("data-codigo", "off");
  await expandir(page, BYTES);
  const p = painel(page);

  const alternar = p.getByRole("button", { name: /tabela$/ });
  if ((await alternar.textContent())?.includes("Mostrar")) await alternar.click();
  await expect(alternar).toHaveText("Ocultar tabela");
  await expect.poll(() => altura(p.locator(".str-scroll"))).toBeGreaterThan(400);

  const miolo = p.locator(".viz-body");
  const sobra = await miolo.evaluate((el) => el.scrollHeight - el.clientHeight);
  expect(sobra).toBeGreaterThan(0);

  const cabeca = p.locator(".viz-head");
  const antes = (await cabeca.boundingBox())!.y;
  const desvios: number[] = [];
  for (const destino of [0.34, 0.67, 1]) {
    await miolo.evaluate((el, ff) => {
      el.scrollTop = (el.scrollHeight - el.clientHeight) * ff;
    }, destino);
    await page.waitForTimeout(120);
    desvios.push(Math.abs((await cabeca.boundingBox())!.y - antes));
  }
  expect(Math.max(...desvios)).toBeLessThanOrEqual(1);
  // O cabeçalho parado só serve se ele continuar dizendo alguma coisa.
  await expect(p.locator(".viz-step")).toHaveText("20 bytes em UTF-8");
});
