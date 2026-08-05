import { test, expect, type Page, type Locator } from "@playwright/test";

// Casca adaptativa do tópico `grafos-intro`.
//
// O `GrafoRepresentacao` é um EDITOR, não uma animação: você liga e desliga
// arestas na matriz e o desenho, a lista e os dois custos respondem na hora.
// Não há bloco de código, não há painel de variáveis e não há linha de
// controles. Ele entra com `collapsible: false` e `total: 1`, e com isso o
// `VizFooter` não desenha nada — nem `.viz-foot`.
//
// Por isso os itens 2, 3 e 4 do mínimo da §8 (os que falam do bloco
// recolhível) não existem aqui. No lugar deles vale a regra que o contrato põe
// no lugar — **nenhum botão pode prometer esconder um bloco que o visualizador
// não tem** —, estendida pelo mesmo motivo ao resto do que ele não promete:
// nenhum contador de passo, nenhum atalho de teclado e nenhum botão de
// reprodução para uma linha do tempo que não existe.

const URL = "/topico/grafos-intro/";
// Folga de subpixel, igual à do hook.
const SLACK = 8;

async function abrirPainel(page: Page): Promise<Locator> {
  await page.goto(URL);
  await page.evaluate(() => document.fonts.ready);
  await page.locator("article figure.viz").getByRole("button", { name: /Expandir/ }).click();
  const painel = page.locator(".viz-overlay figure.viz");
  await expect(painel).toBeVisible();
  return painel;
}

// Lê um cartão de custo pelo RÓTULO e devolve o cartão inteiro, para o valor
// ser lido ao lado do rótulo dele. Ler o número sozinho passaria verde com dois
// cartões trocados de lugar: o conjunto de textos da tela fica idêntico e só a
// associação mente — que é justamente o buraco que o guarda de idioma tem por
// construção.
function cartao(painel: Locator, rotulo: string): Locator {
  return painel.locator(".bigo-stat").filter({
    has: painel.page().getByText(rotulo, { exact: true }),
  });
}

test.describe("grafos-intro · casca adaptativa", () => {
  test("o cabeçalho fica parado e o ✕ Fechar continua à vista com o miolo rolado até o fim", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 600 });
    const vp = page.viewportSize();
    expect(vp!.height, "a régua tem que ser a que eu pedi").toBe(600);

    const painel = await abrirPainel(page);
    // Preset no topo do miolo de propósito: `click()` do Playwright ROLA o
    // contêiner para alcançar o alvo, e clicar mais abaixo sujaria a medição
    // que vem a seguir. Os quatro presets empatam em altura (412px de sobra a
    // 1440x600); "Completo" é o que deixa os dois custos iguais.
    await painel.getByRole("button", { name: "Completo", exact: true }).click();
    await expect(painel.locator(".viz-step")).toHaveText("V = 6 · E = 15 · densidade 100%");
    await expect(
      painel.locator(".viz-body"),
      "o clique no preset não pode ter rolado o miolo"
    ).toHaveJSProperty("scrollTop", 0);

    const fechar = painel.getByRole("button", { name: /Fechar/ });

    const antes = await page.evaluate(() => {
      const f = document.querySelector(".viz-overlay figure.viz") as HTMLElement;
      const b = f.querySelector(".viz-body") as HTMLElement;
      const h = f.querySelector(".viz-head") as HTMLElement;
      return {
        sobraMiolo: b.scrollHeight - b.clientHeight,
        sobraFigura: f.scrollHeight - f.clientHeight,
        headTop: Math.round(h.getBoundingClientRect().top),
      };
    });

    // A asserção da camada 1 vem ANTES da premissa, de propósito: a quebra que
    // devolve a rolagem para a figura também zera a sobra do miolo, e com a
    // premissa na frente o teste reprovaria dizendo "o miolo não estoura" —
    // apontando para o lugar errado, e convidando quem vier depois a remover a
    // premissa por parecer redundante.
    expect(
      antes.sobraFigura,
      "a figura inteira não pode ser a área rolável: é isso que leva o cabeçalho embora"
    ).toBeLessThanOrEqual(SLACK);
    // Premissa: sem sobra para rolar, o teste vira decoração verde.
    expect(antes.sobraMiolo, "o miolo precisa estourar para haver o que rolar").toBeGreaterThan(
      SLACK
    );

    const depois = await page.evaluate(() => {
      const f = document.querySelector(".viz-overlay figure.viz") as HTMLElement;
      const b = f.querySelector(".viz-body") as HTMLElement;
      const h = f.querySelector(".viz-head") as HTMLElement;
      b.scrollTop = b.scrollHeight;
      f.scrollTop = f.scrollHeight; // se a figura ainda rolar, ela rola aqui
      return {
        mioloRolou: b.scrollTop,
        figuraRolou: f.scrollTop,
        headTop: Math.round(h.getBoundingClientRect().top),
      };
    });

    // As três juntas. Sem a terceira, a quebra que devolve a rolagem para a
    // figura passa: o `.viz-body` fica em zero, o cabeçalho não se mexe, e o
    // teste aprova exatamente o defeito que a camada 1 conserta.
    expect(depois.mioloRolou, "quem rola é o miolo").toBeGreaterThan(0);
    expect(depois.figuraRolou, "a figura NÃO rola").toBe(0);
    expect(depois.headTop, "o cabeçalho não anda um pixel").toBe(antes.headTop);

    // E o botão de fechar, que mora no cabeçalho, continua dentro da janela.
    const caixa = (await fechar.boundingBox())!;
    expect(caixa.y, "o ✕ Fechar não sai por cima da janela").toBeGreaterThanOrEqual(0);
    expect(caixa.y + caixa.height, "nem por baixo").toBeLessThanOrEqual(600);
  });

  test("não existe botão prometendo mostrar ou ocultar um bloco que a peça não tem", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 600 });
    const painel = await abrirPainel(page);
    const cabeca = painel.locator(".viz-head");

    // Nem com o rótulo do hook ("Mostrar código" / "Ocultar código")...
    await expect(cabeca.getByRole("button", { name: /Mostrar|Ocultar/i })).toHaveCount(0);
    // ...nem com outro nome de bloco.
    await expect(cabeca.locator("button.viz-toggle-codigo")).toHaveCount(0);
    // E não há bloco recolhível nenhum no miolo para ele controlar.
    await expect(painel.locator(".viz-code-slot, .viz-code")).toHaveCount(0);

    // O cabeçalho tem exatamente um botão, e ele diz o que faz.
    await expect(cabeca.getByRole("button")).toHaveCount(1);
    await expect(cabeca.getByRole("button")).toHaveText(/Fechar/);
  });

  test("não há contador de passo, rodapé, atalho de teclado nem reprodução; o lugar do passo diz V, E e densidade", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 600 });
    const painel = await abrirPainel(page);

    // Sem linha do tempo: nada de reprodução, em lugar nenhum da peça.
    await expect(painel.getByText(/passo \d+ de \d+/)).toHaveCount(0);
    await expect(painel.locator(".viz-atalhos")).toHaveCount(0);
    await expect(painel.locator(".viz-progress")).toHaveCount(0);
    await expect(painel.locator(".viz-foot")).toHaveCount(0);
    await expect(painel.getByRole("button", { name: /Rodar|Pausar|Anterior|Próximo/ })).toHaveCount(
      0
    );
    // Nenhum controle anuncia tecla: atalho prometido é atalho que o aluno
    // tenta, e aqui não há passo para andar.
    await expect(painel.locator("[aria-keyshortcuts]")).toHaveCount(0);

    // O que ocupa o lugar do contador é o número que resume o estado — com o
    // rótulo junto, senão o número perde o contexto que o explicava.
    await expect(painel.locator(".viz-step")).toHaveText("V = 6 · E = 7 · densidade 47%");

    // Ligar o modo dirigido não joga aresta fora: a matriz simétrica que estava
    // na tela vira 14 arcos, dois por aresta, contra um teto que também dobrou
    // — é por isso que a densidade não se mexe.
    await painel.getByRole("button", { name: "dirigido", exact: true }).click();
    await expect(painel.locator(".viz-step")).toHaveText("V = 6 · E = 14 · densidade 47%");

    // Já reaplicar o preset monta o grafo dirigido de verdade: 7 arcos de 30.
    await painel.getByRole("button", { name: "Esparso (rede social)", exact: true }).click();
    await expect(painel.locator(".viz-step")).toHaveText("V = 6 · E = 7 · densidade 23%");
  });

  test("os presets vivem no miolo e mudam os dois custos de memória no cartão certo", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 600 });
    const painel = await abrirPainel(page);

    // O contrato manda preset no miolo: no rodapé só mora reprodução — e aqui
    // não há rodapé nenhum para eles caírem.
    await expect(painel.locator(".viz-body .bigo-chips button")).toHaveCount(4);
    await expect(painel.locator(".viz-body .sub-modo button")).toHaveCount(2);

    // Rótulo e valor lidos no MESMO cartão. Esparso: a lista custa 20 entradas
    // contra 36 células da matriz, e sobram 16 células em zero.
    await expect(cartao(painel, "memória da matriz").locator("strong")).toHaveText("36 células");
    await expect(cartao(painel, "memória da lista").locator("strong")).toHaveText("20 entradas");
    await expect(cartao(painel, "células em zero").locator("strong")).toHaveText("16");

    // Completo: os dois custos empatam e não sobra célula nenhuma em zero.
    await painel.getByRole("button", { name: "Completo", exact: true }).click();
    await expect(cartao(painel, "arestas (E)").locator("strong")).toHaveText("15 de 15");
    await expect(cartao(painel, "memória da matriz").locator("strong")).toHaveText("36 células");
    await expect(cartao(painel, "memória da lista").locator("strong")).toHaveText("36 entradas");
    await expect(cartao(painel, "células em zero").locator("strong")).toHaveText("0");
  });

  test("clicar numa célula dentro do painel liga a aresta, espelha a simétrica e atualiza cabeçalho, lista e custo", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 600 });
    const painel = await abrirPainel(page);

    // No preset esparso A não é vizinho de C. O rótulo da célula carrega o
    // estado junto do nome, então lê-lo já é ler valor e rótulo no mesmo lugar.
    const aParaC = painel.getByRole("button", { name: "Aresta de A para C: não existe" });
    const cParaA = painel.getByRole("button", { name: "Aresta de C para A: não existe" });
    await expect(aParaC).toHaveCount(1);
    await expect(cParaA).toHaveCount(1);
    await expect(painel.locator(".viz-step")).toHaveText("V = 6 · E = 7 · densidade 47%");
    await expect(painel.locator(".gr-linha").first().locator(".gr-viz-item")).toHaveText([
      "B",
      "F",
    ]);

    await aParaC.click();

    // Uma aresta a mais, e no modo não dirigido a célula espelhada acompanha —
    // que é a simetria de que a aula fala.
    await expect(painel.getByRole("button", { name: "Aresta de A para C: existe" })).toHaveCount(1);
    await expect(painel.getByRole("button", { name: "Aresta de C para A: existe" })).toHaveCount(1);
    await expect(painel.locator(".viz-step")).toHaveText("V = 6 · E = 8 · densidade 53%");
    await expect(painel.locator(".gr-linha").first().locator(".gr-viz-item")).toHaveText([
      "B",
      "C",
      "F",
    ]);
    await expect(cartao(painel, "células em zero").locator("strong")).toHaveText("14");
  });
});
