import { test, expect, type Page, type Locator } from "@playwright/test";

// Casca adaptativa do tópico `arvores-binarias`.
//
// O visualizador daqui é o caso mais incomum da série: um CLASSIFICADOR, com
// painel expandido mas sem bloco de código, sem painel de variáveis e sem
// reprodução nenhuma. Ele entra com `collapsible: false` e `total: 1`, e com
// isso o `VizFooter` não desenha nada.
//
// Por isso os itens 2, 3 e 4 do mínimo da §8 (o bloco recolhível) não existem
// aqui. No lugar deles vale a regra que o contrato põe no lugar: **nenhum botão
// pode prometer esconder um bloco que o visualizador não tem** — e, pelo mesmo
// motivo, nenhum contador de passo ou atalho de teclado pode prometer uma linha
// do tempo que ele também não tem.

const URL = "/topico/arvores-binarias/";
// Folga de subpixel, igual à do hook.
const SLACK = 8;

async function abrirPainel(page: Page): Promise<Locator> {
  await page.goto(URL);
  await page.evaluate(() => document.fonts.ready);
  await page.locator("figure.viz").getByRole("button", { name: /Expandir/ }).click();
  const painel = page.locator(".viz-overlay figure.viz");
  await expect(painel).toBeVisible();
  return painel;
}

// Lê um cartão de veredito pelo NOME, e devolve nome + selo + motivo juntos.
// Ler o selo sozinho passaria verde com os vereditos trocados de lugar: o
// conjunto de textos da tela continua idêntico e só a associação mente.
function cartao(raiz: Locator, nome: string): Locator {
  return raiz.locator(".bt-veredito").filter({
    has: raiz.page().locator(".bt-veredito-nome", { hasText: new RegExp(`^${nome}$`) }),
  });
}

test.describe("arvores-binarias · casca adaptativa", () => {
  test("o cabeçalho fica parado e o ✕ Fechar continua à vista com o miolo rolado até o fim", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 600 });
    const vp = page.viewportSize();
    expect(vp!.height, "a régua tem que ser a que eu pedi").toBe(600);

    const painel = await abrirPainel(page);
    // O estado mais alto medido: "Cheia, não completa" / "Balanceada" /
    // "Degenerada" empatam em 261px de sobra a 1440x600.
    await painel.getByRole("button", { name: "Degenerada", exact: true }).click();
    await expect(cartao(painel, "Degenerada").locator(".bt-veredito-selo")).toHaveText("sim");

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

    // Nem no rótulo do hook ("Mostrar código" / "Ocultar código")...
    await expect(cabeca.getByRole("button", { name: /Mostrar|Ocultar/i })).toHaveCount(0);
    // ...nem com outro nome de bloco.
    await expect(cabeca.locator("button.viz-toggle-codigo")).toHaveCount(0);
    // E não há bloco recolhível nenhum no miolo para ele controlar.
    await expect(painel.locator(".viz-code-slot, .viz-code")).toHaveCount(0);

    // O cabeçalho tem exatamente um botão, e ele diz o que faz.
    await expect(cabeca.getByRole("button")).toHaveCount(1);
    await expect(cabeca.getByRole("button")).toHaveText(/Fechar/);
  });

  test("não aparece contador de passo nem atalho de teclado; o lugar do passo diz nós e altura", async ({
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

    // O que ocupa o lugar do contador é o número que resume o estado — com o
    // rótulo junto, senão o número perde o contexto que o explicava.
    await painel.getByRole("button", { name: "Perfeita", exact: true }).click();
    await expect(painel.locator(".viz-step")).toHaveText("7 nós · altura 3");
    await painel.getByRole("button", { name: "Degenerada", exact: true }).click();
    await expect(painel.locator(".viz-step")).toHaveText("4 nós · altura 4");
  });

  test("os presets vivem no miolo e mudam veredito, selo e motivo do cartão certo", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 600 });
    const painel = await abrirPainel(page);

    // O contrato manda preset no miolo: no rodapé só mora reprodução — e aqui
    // não há rodapé nenhum para eles caírem.
    await expect(painel.locator(".viz-body .bigo-chips button")).toHaveCount(5);

    await painel.getByRole("button", { name: "Degenerada", exact: true }).click();
    // Nome, selo e motivo lidos no MESMO cartão: é o que pega vereditos
    // trocados de lugar, que o guarda de idioma não vê por comparar conjunto.
    await expect(cartao(painel, "Degenerada").locator(".bt-veredito-selo")).toHaveText("sim");
    await expect(cartao(painel, "Degenerada").locator("p")).toContainText("Nenhum nó tem dois");
    await expect(cartao(painel, "Cheia").locator(".bt-veredito-selo")).toHaveText("não");
    await expect(cartao(painel, "Cheia").locator("p")).toContainText("tem um filho só");

    await painel.getByRole("button", { name: "Perfeita", exact: true }).click();
    await expect(cartao(painel, "Perfeita").locator(".bt-veredito-selo")).toHaveText("sim");
    await expect(cartao(painel, "Degenerada").locator(".bt-veredito-selo")).toHaveText("não");
    await expect(cartao(painel, "Cheia").locator(".bt-veredito-selo")).toHaveText("sim");
  });

  test("clicar num nó dentro do painel reclassifica a árvore e atualiza o número do cabeçalho", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 600 });
    const painel = await abrirPainel(page);

    await painel.getByRole("button", { name: "Perfeita", exact: true }).click();
    await expect(painel.locator(".viz-step")).toHaveText("7 nós · altura 3");
    await expect(cartao(painel, "Completa").locator(".bt-veredito-selo")).toHaveText("sim");

    // Liga a posição 7: um nível novo, com um filho só. A árvore deixa de ser
    // perfeita e de ser cheia, e a altura sobe.
    await painel.getByRole("button", { name: /^Posição 7,/ }).click();
    await expect(painel.locator(".viz-step")).toHaveText("8 nós · altura 4");
    await expect(cartao(painel, "Perfeita").locator(".bt-veredito-selo")).toHaveText("não");
    await expect(cartao(painel, "Cheia").locator(".bt-veredito-selo")).toHaveText("não");
    await expect(cartao(painel, "Completa").locator(".bt-veredito-selo")).toHaveText("sim");
  });
});
