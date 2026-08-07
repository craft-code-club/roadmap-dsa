import { test, expect, type Page, type Locator } from "@playwright/test";

// ---------------------------------------------------------------------------
// A casca adaptativa nos três visualizadores do tópico `intervals`.
//
// O artigo monta CINCO peças a partir de três arquivos: o
// `IntervalsVisualizer` aparece três vezes, uma por seção, com a prop `mode`
// escolhendo com qual varredura ele abre. Por isso os índices abaixo.
//
// Cada teste mede COMPORTAMENTO e lê RÓTULO. Contar elemento não prova nada —
// já passaram por uma suíte verde um visualizador sem botão nenhum e um painel
// de 0px de largura —, e comportamento certo com rótulo errado ensina errado do
// mesmo jeito: por isso todo número verificado vem junto do texto ao lado dele.
//
// A janela é 1512x900 (notebook de 16"), a régua do contrato. Nela, antes da
// casca, o expandido do sweep rolava INTEIRO: o cabeçalho subia 367px e o
// "▶ Rodar" era desenhado com a base em 1208px numa janela de 900.
// ---------------------------------------------------------------------------

const SOBREPOSICAO = 0;
const MERGE = 1;
const INSERT = 2;
const SWEEP = 3;
const GREEDY = 4;

function figura(page: Page, n: number): Locator {
  return page.locator("article figure.viz").nth(n);
}

function painel(page: Page): Locator {
  return page.locator(".viz-overlay-fit figure.viz-fit");
}

async function abrirTopico(page: Page, largura = 1512, altura = 900) {
  await page.setViewportSize({ width: largura, height: altura });
  await page.goto("/topico/intervals/");
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
 * é o sinal que a própria casca publica: fica em "off" enquanto a medição roda
 * com a transição congelada, e só volta para "on" depois da decisão.
 */
async function medicaoTerminou(alvo: Locator) {
  await expect(alvo).toHaveAttribute("data-anim", "on");
}

/** Deixa o bloco de código à mostra, que é o pior caso de altura. */
async function abrirCodigo(alvo: Locator) {
  const alternar = alvo.getByRole("button", { name: /código$/ });
  if (((await alternar.textContent()) ?? "").includes("Mostrar")) await alternar.click();
  await expect(alternar).toHaveText("Ocultar código");
  await expect.poll(() => altura(alvo.locator(".viz-code"))).toBeGreaterThan(100);
}

/**
 * Rola o miolo até uma fração da sobra e só volta quando o navegador aplicou a
 * rolagem e pintou o quadro seguinte.
 *
 * Devolve o alvo E o `scrollTop` real, os dois lidos no MESMO instante. Quem
 * compara o real contra uma sobra medida antes do laço mede outra coisa: a
 * sobra pode mudar entre as duas leituras (uma linha que requebra quando a
 * fonte assenta muda o `scrollHeight`), e aí a asserção reprova por uma
 * diferença que não é de rolagem nenhuma. Foi o que derrubou este teste no CI,
 * com 1,5 e 2,5px, enquanto localmente a sobra ficava estável.
 *
 * O real continua sendo o que importa: se a rolagem não acontecer, "o cabeçalho
 * não se mexeu" vira verdade à toa.
 */
async function rolarMiolo(miolo: Locator, fracao: number): Promise<{ alvo: number; real: number }> {
  return miolo.evaluate(
    (el, f) =>
      new Promise<{ alvo: number; real: number }>((resolve) => {
        const alvo = (el.scrollHeight - el.clientHeight) * f;
        el.scrollTop = alvo;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve({ alvo, real: el.scrollTop }))
        );
      }),
    fracao
  );
}

async function expandir(page: Page, n: number) {
  await figura(page, n).getByRole("button", { name: "⤢ Expandir" }).click();
  await expect(painel(page)).toBeVisible();
  await medicaoTerminou(painel(page));
}

// ---------------------------------------------------------------------------
// 1. Cabeçalho e rodapé parados, e o botão que faz o algoritmo andar na tela.
// ---------------------------------------------------------------------------

test("sweep expandido: cabeçalho e rodapé não se mexem quando o miolo rola até o fim", async ({
  page,
}) => {
  await abrirTopico(page);
  await expandir(page, SWEEP);
  const p = painel(page);
  await abrirCodigo(p);

  const miolo = p.locator(".viz-body");
  // Duas pré-condições, e nenhuma das duas é decoração. A primeira: existe
  // sobra para rolar — sem ela o teste vira verde à toa no dia em que a peça
  // encolher. A segunda: quem rola é o `.viz-body`, e não a figura inteira,
  // que era exatamente o defeito antigo (com a figura rolando, o `scrollTop`
  // do miolo fica em zero, o cabeçalho não se mexe e o teste aprova a quebra).
  const sobra = await miolo.evaluate((el) => el.scrollHeight - el.clientHeight);
  expect(sobra).toBeGreaterThan(20);
  const sobraFigura = await p.evaluate((el) => el.scrollHeight - el.clientHeight);
  expect(sobraFigura).toBeLessThanOrEqual(1);

  const cabeca = p.locator(".viz-head");
  const rodape = p.locator(".viz-foot");
  const rodar = p.getByRole("button", { name: "▶ Rodar" });

  const antes = {
    cabeca: (await cabeca.boundingBox())!.y,
    rodape: (await rodape.boundingBox())!.y,
    rodar: (await rodar.boundingBox())!.y,
  };

  // "Está parado agora" não é "continua parado": amostra ao longo da rolagem.
  const desvios: number[] = [];
  for (const destino of [0.25, 0.5, 0.75, 1]) {
    const { alvo, real } = await rolarMiolo(miolo, destino);
    // Alvo e real do mesmo instante: a tolerância de 1px é para o arredondamento
    // sub-pixel do `scrollTop`, não para a sobra ter mudado no meio do caminho.
    expect(Math.abs(real - alvo)).toBeLessThanOrEqual(1);
    // E a rolagem aconteceu de verdade: sem isto, "o cabeçalho não se mexeu"
    // seria verdade à toa num miolo parado no topo.
    expect(real).toBeGreaterThan(sobra * destino * 0.5);
    desvios.push(
      Math.abs((await cabeca.boundingBox())!.y - antes.cabeca),
      Math.abs((await rodape.boundingBox())!.y - antes.rodape),
      Math.abs((await rodar.boundingBox())!.y - antes.rodar)
    );
  }
  expect(Math.max(...desvios)).toBeLessThanOrEqual(1);

  // E o botão que move o algoritmo continua inteiro dentro da janela — que é o
  // que ele NÃO fazia antes da casca (medido: base em 1208px numa janela de 900).
  const caixa = (await rodar.boundingBox())!;
  const janela = page.viewportSize()!.height;
  expect(caixa.y).toBeGreaterThanOrEqual(0);
  expect(caixa.y + caixa.height).toBeLessThanOrEqual(janela);
  // O rótulo, e não só a posição: botão no lugar certo dizendo outra coisa
  // manda o aluno clicar no que ele não quer.
  await expect(rodar).toHaveText("▶ Rodar");
  // O cabeçalho parado só serve se continuar dizendo alguma coisa.
  await expect(p.locator(".viz-step")).toHaveText(/^passo \d+ de \d+$/);
});

// ---------------------------------------------------------------------------
// 2 e 3. Quem decide é a medição: recolhido na tela baixa, aberto na tela alta.
// ---------------------------------------------------------------------------

test("merge no artigo: tela baixa recolhe o código e diz Mostrar código", async ({ page }) => {
  await abrirTopico(page, 1512, 700);
  const f = figura(page, MERGE);
  const alternar = f.getByRole("button", { name: /código$/ });

  await expect(alternar).toHaveText("Mostrar código");
  await expect(f).toHaveAttribute("data-codigo", "off");
  // Recolhido é ALTURA zerada, não só coluna estreita: zerar a trilha da coluna
  // deixava a linha do grid com a altura inteira do bloco (armadilha medida).
  await expect.poll(() => altura(f.locator(".viz-code"))).toBeLessThanOrEqual(4);
  // E ele continua no DOM, fora do teclado e dos leitores de tela.
  await expect(f.locator(".viz-code")).toHaveAttribute("aria-hidden", "true");
  // O que o aluno veio ver continua inteiro: as faixas da linha do tempo.
  expect(await altura(f.locator(".iv-tl"))).toBeGreaterThan(100);
});

test("merge no artigo: tela alta já vem com o código aberto e legível", async ({ page }) => {
  await abrirTopico(page, 1512, 1500);
  const f = figura(page, MERGE);
  const alternar = f.getByRole("button", { name: /código$/ });

  await expect(alternar).toHaveText("Ocultar código");
  await expect(f).toHaveAttribute("data-codigo", "on");
  await expect.poll(() => altura(f.locator(".viz-code"))).toBeGreaterThan(100);
  // O código certo do modo certo: rótulo junto do conteúdo, sempre.
  await expect(f.locator(".viz-code-head")).toHaveText(
    "merge_intervals.py · ordena por início · O(n log n)"
  );
  await expect(f.locator(".viz-code-body")).toContainText("intervalos.sort(key=lambda x: x[0])");
});

// ---------------------------------------------------------------------------
// 4. A escolha do aluno vence a medição, e não é desfeita por troca de estado.
// ---------------------------------------------------------------------------

test("merge: abrir o código na mão sobrevive a trocar de modo, que pediria medição nova", async ({
  page,
}) => {
  await abrirTopico(page, 1512, 700);
  const f = figura(page, MERGE);
  const alternar = f.getByRole("button", { name: /código$/ });

  await expect(alternar).toHaveText("Mostrar código");
  await alternar.click();
  await expect(alternar).toHaveText("Ocultar código");
  await expect.poll(() => altura(f.locator(".viz-code"))).toBeGreaterThan(100);

  // Trocar de modo mexe em DUAS entradas do `measureOn` (o índice do modo e o
  // número de passos) e dispara medição nova. A premissa é medida, não suposta:
  // numa janela de 700px a peça com o código à mostra não cabe no orçamento do
  // fluxo do artigo (janela - cabeçalho do site - respiro), então a medição
  // recolheria — e mesmo assim a escolha do aluno manda.
  await f.getByRole("button", { name: /Greedy · máximo sem conflito/ }).click();
  await expect(f.locator(".viz-code-head")).toHaveText(
    "interval_scheduling.py · ordena pelo fim · O(n log n)"
  );
  await medicaoTerminou(f);
  const orcamento = await page.evaluate(() => {
    const h = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--ccc-header-h")
    ) || 60;
    return window.innerHeight - h - 24;
  });
  expect(await altura(f)).toBeGreaterThan(orcamento);

  // E um gatilho de medição que a casca NÃO pode ignorar, para o teste não
  // depender de eu ter listado o modo no `measureOn`: redimensionar mede sempre.
  // Sem esta parte, esquecer o modo na lista deixaria o teste verde sem que
  // medição nenhuma tivesse acontecido — que é como um preset inócuo já virou
  // prova vazia neste repositório.
  await page.setViewportSize({ width: 1512, height: 640 });
  await medicaoTerminou(f);
  await page.setViewportSize({ width: 1512, height: 700 });
  await medicaoTerminou(f);

  // A promessa aqui é de PERMANÊNCIA, então uma leitura só depois de uma espera
  // olha um instante. Amostra ao longo do intervalo em que a medição nova teria
  // tempo de desfazer a escolha (ela roda em `requestAnimationFrame`).
  for (let i = 0; i < 5; i++) {
    await expect(alternar).toHaveText("Ocultar código");
    await expect(f).toHaveAttribute("data-codigo", "on");
    expect(await altura(f.locator(".viz-code"))).toBeGreaterThan(100);
    await page.waitForTimeout(150);
  }
});

// ---------------------------------------------------------------------------
// 5. Teclado: as setas e o espaço dirigem a animação, e o campo em edição manda.
// ---------------------------------------------------------------------------

test("merge expandido: setas andam o passo e o espaço roda, sem roubar a tecla de quem digita", async ({
  page,
}) => {
  await abrirTopico(page);
  await expandir(page, MERGE);
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
  const campo = p.locator("input.viz-input").first();
  await campo.click();
  const valorAntes = await campo.inputValue();

  // Uma asserção DEPOIS DE CADA tecla, e não só no fim: `→` seguido de `←`
  // volta para o mesmo passo, então uma leitura só no fim aprova o sequestro
  // das duas setas. Medido — foi assim que uma quebra passou verde aqui.
  await page.keyboard.press("ArrowRight");
  await expect(passo).toHaveText(`passo ${total - 1} de ${total}`);
  await page.keyboard.press("ArrowLeft");
  await expect(passo).toHaveText(`passo ${total - 1} de ${total}`);
  await expect(campo).toHaveValue(valorAntes);

  // E o espaço é um espaço digitado. Se ele tivesse sido sequestrado para
  // rodar/pausar, o `preventDefault` engoliria o caractere e o valor ficaria
  // igual — é essa diferença que a asserção pega.
  //
  // As duas asserções juntas dizem "entrou UM espaço e nada mais mudou": o
  // comprimento cresceu exatamente 1, e o valor sem espaço nenhum continua
  // idêntico. Comparar com o fim da string não serviria (a entrada deste
  // visualizador já tem espaços, e onde o clique deixou o cursor depende do
  // sistema — `End` não vai ao fim de um input no macOS).
  const semEspacos = (s: string) => s.replace(/ /g, "");
  await page.keyboard.press("Space");
  await expect.poll(() => campo.inputValue()).toHaveLength(valorAntes.length + 1);
  expect(semEspacos(await campo.inputValue())).toBe(semEspacos(valorAntes));
  // Trocar a entrada reinicia a animação, e ela fica PARADA no primeiro passo.
  // O segundo `waitForTimeout` também é objeto do teste: a marcha padrão anda a
  // cada 650ms, então se o espaço tivesse ligado a reprodução o passo teria
  // andado pelo menos uma vez dentro da janela.
  await expect(passo).toHaveText(/^passo 1 de \d+$/);
  await page.waitForTimeout(1000);
  await expect(passo).toHaveText(/^passo 1 de \d+$/);
});

// ---------------------------------------------------------------------------
// 6. A prop `mode` escolhe com qual varredura cada peça do artigo abre.
// ---------------------------------------------------------------------------

test("as três peças do IntervalsVisualizer abrem cada uma no seu modo", async ({ page }) => {
  await abrirTopico(page, 1512, 1500);

  const esperado = [
    [MERGE, "Merge · funde quem encosta", "merge_intervals.py · ordena por início · O(n log n)"],
    [INSERT, "Insert · encaixa um novo", "insert_interval.py · não ordena nada · O(n)"],
    [GREEDY, "Greedy · máximo sem conflito", "interval_scheduling.py · ordena pelo fim · O(n log n)"],
  ] as const;

  for (const [i, chip, cabecalho] of esperado) {
    const f = figura(page, i);
    // O chip aceso e o cabeçalho do código na MESMA asserção: chip certo com
    // código de outro modo ensina a lição trocada.
    await expect(f.getByRole("button", { name: chip })).toHaveAttribute("aria-pressed", "true");
    await expect(f.locator(".viz-code-head")).toHaveText(cabecalho);
  }

  // E o Insert é o único com o campo do intervalo que chega depois.
  await expect(figura(page, INSERT).locator(".viz-field", { hasText: "novo" })).toHaveCount(1);
  await expect(figura(page, MERGE).locator(".viz-field", { hasText: "novo" })).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// 7. O rodapé compartilhado não promete o que não faz.
// ---------------------------------------------------------------------------

test("sobreposição: o ↺ volta ao passo 1 e o botão ao lado é quem devolve a entrada", async ({
  page,
}) => {
  await abrirTopico(page, 1512, 1500);
  const f = figura(page, SOBREPOSICAO);
  const passo = f.locator(".viz-step");
  const aTermina = f.locator(".viz-field", { hasText: "A termina" }).locator("input");

  // A peça abre num instante em que os dois se sobrepõem, e não em t = 0.
  await expect(passo).toHaveText("passo 5 de 16");
  await expect(f.locator(".iv-selo")).toHaveText("sobrepõem");

  await aTermina.fill("20");
  await expect(passo).toHaveText("passo 5 de 24");

  // O ↺ do rodapé compartilhado é `viz.reset()`: volta ao passo 1 e NADA mais.
  await f.getByRole("button", { name: "Reiniciar" }).click();
  await expect(passo).toHaveText("passo 1 de 24");
  await expect(aTermina).toHaveValue("20");

  // Quem devolve A, a duração de B e o modelo de borda é o botão ao lado.
  await f.getByRole("button", { name: /^Bordas:/ }).click();
  await expect(f.getByRole("button", { name: /^Bordas:/ })).toHaveText("Bordas: [início, fim)");
  await f.getByRole("button", { name: "Voltar ao padrão" }).click();
  await expect(aTermina).toHaveValue("12");
  await expect(f.getByRole("button", { name: /^Bordas:/ })).toHaveText("Bordas: [início, fim]");
  await expect(passo).toHaveText("passo 5 de 16");
  await expect(f.locator(".iv-selo")).toHaveText("sobrepõem");
});

// ---------------------------------------------------------------------------
// 8. `total: 1`: sem linha do tempo o rodapé some, e a volta fica no miolo.
// ---------------------------------------------------------------------------

test("merge: a lista vazia apaga o rodapé, e o cenário que traz de volta está no miolo", async ({
  page,
}) => {
  await abrirTopico(page, 1512, 1500);
  const f = figura(page, MERGE);

  await expect(f.locator(".viz-step")).toHaveText(/^passo 1 de \d+$/);
  await expect(f.locator(".viz-foot")).toHaveCount(1);

  await f.getByRole("button", { name: "Lista vazia" }).click();
  // Um passo só: some o contador, some o rodapé inteiro e somem os controles.
  await expect(f.locator(".viz-step")).toHaveCount(0);
  await expect(f.locator(".viz-foot")).toHaveCount(0);
  await expect(f.getByRole("button", { name: "▶ Rodar" })).toHaveCount(0);
  // E a peça continua ensinando: a nota diz por que a lista vazia importa.
  await expect(f.locator(".viz-note")).toContainText("intervalos[0] em lista vazia estoura");

  // A volta não pode depender de um botão que sumiu junto: os cenários vivem
  // no miolo, então continuam clicáveis.
  await f.getByRole("button", { name: "Caso base" }).click();
  await expect(f.locator(".viz-foot")).toHaveCount(1);
  await expect(f.locator(".viz-step")).toHaveText(/^passo 1 de \d+$/);
});

// ---------------------------------------------------------------------------
// 9. Rótulo e número mudam juntos quando a regra de empate troca.
// ---------------------------------------------------------------------------

test("sweep: trocar a regra de empate troca o código, o rótulo e o número ao mesmo tempo", async ({
  page,
}) => {
  await abrirTopico(page, 1512, 1500);
  const f = figura(page, SWEEP);
  const botao = f.getByRole("button", { name: /^Empate:/ });
  const pico = f.locator(".bigo-stat", { hasText: "máximo até aqui" }).locator("strong");
  const outra = f.locator(".bigo-stat", { hasText: "com a outra regra de empate" }).locator("strong");

  await expect(botao).toHaveText("Empate: saída primeiro");
  await expect(f.locator(".viz-code-head")).toHaveText("salas.py · a saída libera a sala");
  await expect(f.locator(".viz-code-body")).toContainText("eventos.sort()");

  // Anda até o fim para o pico ser o da execução inteira, e não o do passo 1.
  const total = Number((await f.locator(".viz-step").textContent())!.match(/de (\d+)/)![1]);
  for (let k = 1; k < total; k++) await f.getByRole("button", { name: /Próximo/ }).click();
  await expect(f.locator(".viz-step")).toHaveText(`passo ${total} de ${total}`);
  const comSaidaPrimeiro = await pico.textContent();
  const previsaoDaOutra = await outra.textContent();

  await botao.click();
  await expect(botao).toHaveText("Empate: entrada primeiro");
  await expect(f.locator(".viz-code-head")).toHaveText("salas.py · a saída não libera a sala");
  await expect(f.locator(".viz-code-body")).toContainText(
    "eventos.sort(key=lambda e: (e[0], -e[1]))"
  );

  // O número que a peça anunciava como "com a outra regra" tem que ser o que
  // ela mostra agora como "máximo até aqui" no fim — senão um dos dois mente.
  for (let k = 1; k < total; k++) await f.getByRole("button", { name: /Próximo/ }).click();
  await expect(pico).toHaveText(previsaoDaOutra!);
  await expect(outra).toHaveText(comSaidaPrimeiro!);
  expect(previsaoDaOutra).not.toBe(comSaidaPrimeiro);
});
