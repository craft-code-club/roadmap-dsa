import { test, expect, type Page, type Locator } from "@playwright/test";

// A casca adaptativa nos dois visualizadores com linha do tempo do tópico
// busca-binaria. Contrato em `content/visualizers/README.md`, §8.
//
// A página tem TRÊS `figure.viz`: a busca (0), o estouro de 32 bits (1, que não
// tem overlay e está fora deste arquivo) e as fronteiras (2). Todo seletor sai
// da figura, nunca da página — a casca acrescenta elementos e um seletor de
// página passa a casar com mais de um sem reclamar.
//
// Duas medições deste arquivo têm número medido por trás:
//   · a 1440x600 o miolo do painel sobra 34px no mínimo, em todos os passos de
//     todos os estados das duas peças, então o teste da camada 1 pode rodar em
//     qualquer passo (o pico é o último);
//   · a 1512x900 as duas peças recolhem o código sempre (752..851px de peça
//     contra 816 de orçamento COM o código aberto passando de 1038), e só a
//     partir de ~1130px de janela é que ele abre sozinho.

const URL = "/topico/busca-binaria/";

type Peca = {
  nome: string;
  idx: number;
  titulo: string;
  /** Troca um estado que ESTÁ no `measureOn`, e devolve o que confere na tela. */
  trocaMedida: {
    aplicar: (fig: Locator) => Promise<void>;
    marcador: (fig: Locator) => Locator;
    antes: string;
    depois: string;
  };
};

const PECAS: Peca[] = [
  {
    nome: "busca binária",
    idx: 0,
    titulo: "Visualizador · busca binária: metade some a cada olhada",
    // 8 → 16 células: muda `n`, que é o eixo de altura desta peça (a fita
    // quebra para uma segunda linha), e muda o preset junto.
    trocaMedida: {
      aplicar: async (fig) => {
        await fig.getByRole("button", { name: "16 posições, no máximo 5 olhadas" }).click();
      },
      marcador: (fig) => fig.locator(".bb-barra-txt"),
      antes: "8 de 8 candidatos ainda de pé",
      depois: "16 de 16 candidatos ainda de pé",
    },
  },
  {
    nome: "fronteiras",
    idx: 2,
    titulo: "Visualizador · repetidos, bordas e a posição de inserção",
    // "primeira" → "onde entraria": o código vai de 12 para 9 linhas e o painel
    // perde uma variável. É o eixo de altura desta peça — a fita dela é fixa.
    trocaMedida: {
      aplicar: async (fig) => {
        await fig.getByRole("button", { name: "onde entraria", exact: true }).click();
      },
      marcador: (fig) => fig.locator(".viz-code-head"),
      antes: "primeira.py",
      depois: "onde_entraria.py",
    },
  },
];

/** Uma ordem só de aplicar controles, usada por todos os testes. */
async function abrir(page: Page, peca: Peca): Promise<Locator> {
  await page.goto(URL);
  await page.evaluate(() => document.fonts.ready);
  const fig = page.locator("article figure.viz").nth(peca.idx);
  await expect(fig).toHaveClass(/viz-fit/);
  // A medição da casca acontece com `data-anim="off"`; esperar o atributo
  // virar "on" é esperar a decisão, e é mais barato que um timeout fixo.
  await expect(fig).toHaveAttribute("data-anim", "on");
  return fig;
}

async function expandir(page: Page, peca: Peca, fig: Locator): Promise<Locator> {
  await fig.getByRole("button", { name: "⤢ Expandir" }).click();
  // O diálogo é rotulado pelo título DESTA peça, não por um genérico: com três
  // figuras na mesma página, um `aria-label` copiado deixaria o leitor de tela
  // sem saber qual das três abriu.
  const dialogo = page.getByRole("dialog", { name: peca.titulo });
  await expect(dialogo).toHaveCount(1);
  const painel = dialogo.locator("figure.viz-fit");
  await expect(painel).toHaveAttribute("data-anim", "on");
  return painel;
}

/**
 * Altura estável. Não basta "duas leituras iguais" nem `expect.poll`: o
 * `.viz-split` é `align-items: start`, então enquanto o bloco cresce por baixo
 * da coluna vizinha a FIGURA não anda um pixel — um patamar estrutural de
 * centenas de milissegundos dentro da transição de 0,32s.
 */
async function alturaEstavel(loc: Locator): Promise<number> {
  await loc.page().waitForTimeout(450);
  let iguais = 0;
  let ultima = -1;
  for (let i = 0; i < 40; i++) {
    const h = Math.round((await loc.boundingBox())?.height ?? -1);
    iguais = h === ultima ? iguais + 1 : 0;
    ultima = h;
    if (iguais >= 3) return h;
    await loc.page().waitForTimeout(50);
  }
  return ultima;
}

for (const peca of PECAS) {
  test.describe(`viz busca-binaria · ${peca.nome}`, () => {
    // ---------------------------------------------------------------- camada 1
    test.describe("painel expandido em tela baixa", () => {
      test.use({ viewport: { width: 1440, height: 600 } });

      test(`cabeçalho e rodapé ficam parados quando o miolo rola · ${peca.nome}`, async ({
        page,
      }) => {
        const painel = await expandir(page, peca, await abrir(page, peca));
        const miolo = painel.locator(".viz-body");
        const cabeca = painel.locator(".viz-head");
        const rodar = painel.getByRole("button", { name: "▶ Rodar" });

        // Premissa: existe sobra para rolar. Sem isto o teste é decoração
        // verde no dia em que a peça encolher. (Medido: 34px é o mínimo em
        // todos os passos de todos os estados nesta janela.)
        const sobra = await miolo.evaluate((b) => b.scrollHeight - b.clientHeight);
        expect(sobra).toBeGreaterThan(20);

        // A promessa é PARADO, e é ela que a asserção tem de medir: onde o
        // `▶ Rodar` está desenhado antes e depois de o miolo rolar.
        //
        // Medido, e é a razão de este teste não ser o óbvio: com o rodapé de
        // volta dentro do miolo, `toBeInViewport()` passa nas duas pontas. No
        // fim da rolagem ele passa porque é lá que o rodapé está desenhado; no
        // começo passa porque o botão fica 33px para dentro da área visível e a
        // asserção padrão aceita QUALQUER interseção. Só a posição comparada
        // com ela mesma separa os dois casos — com a quebra ela anda o tanto
        // que o miolo rolou.
        expect(await miolo.evaluate((b) => b.scrollTop)).toBe(0);
        await expect(rodar).toBeInViewport({ ratio: 1 });
        const rodarAntes = await rodar.evaluate((b) =>
          Math.round(b.getBoundingClientRect().top)
        );

        await miolo.evaluate((b) => b.scrollTo(0, b.scrollHeight));
        await page.waitForTimeout(120);

        const rodarDepois = await rodar.evaluate((b) =>
          Math.round(b.getBoundingClientRect().top)
        );
        expect(Math.abs(rodarDepois - rodarAntes)).toBeLessThanOrEqual(2);

        // É o MIOLO que rola, e a figura NÃO. Sem as duas asserções, a quebra
        // que devolve a rolagem para a figura inteira passa: lá o `scrollTop`
        // do miolo fica em zero e o cabeçalho também não se mexe.
        expect(await miolo.evaluate((b) => b.scrollTop)).toBeGreaterThan(0);
        expect(await painel.evaluate((f) => f.scrollTop)).toBe(0);
        expect(
          await painel.evaluate((f) => f.scrollHeight - f.clientHeight)
        ).toBeLessThanOrEqual(2);

        // O cabeçalho continua colado no topo da figura.
        const desvio = await painel.evaluate((f) => {
          const h = f.querySelector(".viz-head") as HTMLElement;
          return Math.round(h.getBoundingClientRect().top - f.getBoundingClientRect().top);
        });
        expect(desvio).toBeLessThanOrEqual(2);
        await expect(cabeca).toBeInViewport();

        // E continua inteiro à vista com o miolo rolado até o fim, sem clicar
        // nele (o `click()` rola o contêiner para alcançar o alvo, então clicar
        // nunca prova que ele estava visível).
        await expect(rodar).toBeInViewport({ ratio: 1 });
        const forade = await rodar.evaluate(
          (b) => Math.round(b.getBoundingClientRect().bottom - window.innerHeight)
        );
        expect(forade).toBeLessThanOrEqual(0);
      });
    });

    // ---------------------------------------------------------------- camada 3
    test.describe("tela baixa", () => {
      test.use({ viewport: { width: 1512, height: 900 } });

      test(`o bloco vem recolhido e o botão diz "Mostrar código" · ${peca.nome}`, async ({
        page,
      }) => {
        const fig = await abrir(page, peca);
        await expect(fig).toHaveAttribute("data-codigo", "off");

        const botao = fig.getByRole("button", { name: /código$/ });
        await expect(botao).toHaveCount(1);
        await expect(botao).toHaveText("Mostrar código");
        await expect(botao).toHaveAttribute("aria-expanded", "false");

        // Rótulo certo não basta: a altura tem que ter sumido de verdade.
        // Sem esta linha, tirar o `.viz-code-slot` passa despercebido — o
        // atributo, o rótulo e o `aria-hidden` continuam todos corretos e a
        // peça continua 286px mais alta.
        const slot = fig.locator(".viz-code-slot");
        await expect(slot).toHaveCount(1);
        expect(await alturaEstavel(slot)).toBeLessThan(8);

        // O código sai do teclado e dos leitores enquanto está fora de vista.
        await expect(fig.locator(".viz-code")).toHaveAttribute("aria-hidden", "true");

        await botao.click();
        await expect(fig).toHaveAttribute("data-codigo", "on");
        await expect(botao).toHaveText("Ocultar código");
        expect(await alturaEstavel(slot)).toBeGreaterThan(100);
      });
    });

    test.describe("tela alta", () => {
      test.use({ viewport: { width: 1512, height: 1300 } });

      test(`o bloco já vem aberto quando cabe · ${peca.nome}`, async ({ page }) => {
        const fig = await abrir(page, peca);
        await expect(fig).toHaveAttribute("data-codigo", "on");
        await expect(fig.getByRole("button", { name: /código$/ })).toHaveText("Ocultar código");
        expect(await alturaEstavel(fig.locator(".viz-code-slot"))).toBeGreaterThan(100);
        await expect(fig.locator(".viz-code")).not.toHaveAttribute("aria-hidden", "true");
      });
    });

    // ------------------------------------------------- escolha manual x medição
    test.describe("escolha do aluno", () => {
      test.use({ viewport: { width: 1512, height: 900 } });

      test(`mostrar o código vence a medição seguinte · ${peca.nome}`, async ({ page }) => {
        const fig = await abrir(page, peca);
        const marcador = peca.trocaMedida.marcador(fig);
        await expect(marcador).toHaveText(peca.trocaMedida.antes);

        // O aluno abre o que a medição tinha fechado.
        await expect(fig).toHaveAttribute("data-codigo", "off");
        await fig.getByRole("button", { name: "Mostrar código" }).click();
        await expect(fig).toHaveAttribute("data-codigo", "on");

        // Uma troca que MUDA a entrada da medição — conferida na tela, senão a
        // escolha "sobrevive" sem que nada a tenha ameaçado.
        await peca.trocaMedida.aplicar(fig);
        await expect(marcador).toHaveText(peca.trocaMedida.depois);

        // Permanência se prova amostrando, não com uma leitura depois de uma
        // espera: 9 leituras ao longo de 900ms, nenhuma pode falhar.
        for (let i = 0; i < 9; i++) {
          await expect(fig).toHaveAttribute("data-codigo", "on");
          await page.waitForTimeout(100);
        }

        // Premissa DEPOIS da asserção, de propósito: com a quebra aplicada o
        // código recolhe, a peça encolhe, e uma premissa escrita antes
        // reprovaria antes de a asserção rodar — apontando para o lugar errado.
        const alturaAberta = await alturaEstavel(fig);
        const orcamento = await page.evaluate(() => window.innerHeight - 60 - 24);
        expect(alturaAberta).toBeGreaterThan(orcamento);
      });
    });

    // ----------------------------------------------------------------- teclado
    test.describe("teclado no painel", () => {
      test.use({ viewport: { width: 1440, height: 700 } });

      test(`as setas andam o passo e não roubam a tecla de quem edita · ${peca.nome}`, async ({
        page,
      }) => {
        const painel = await expandir(page, peca, await abrir(page, peca));
        const passo = painel.locator(".viz-step");
        // Só um contador: esta peça não passa `children` ao `VizHeader`.
        await expect(passo).toHaveCount(1);
        await expect(passo).toHaveText(/^passo 1 de \d+$/);

        // `toBeVisible()` no painel NÃO é "pronto para o teclado": o listener
        // nasce num efeito passivo, e a tecla enviada antes some sem erro
        // nenhum. O que prova é o foco já estar dentro do painel.
        await expect
          .poll(() =>
            page.evaluate(() => !!document.activeElement?.closest(".viz-overlay-fit"))
          )
          .toBe(true);

        // A MESMA tecla duas vezes, nunca um par inverso: `→` seguido de `←`
        // devolve a peça ao estado de origem e fica verde mesmo com as duas
        // teclas roubadas. E uma asserção depois de cada tecla.
        await page.keyboard.press("ArrowRight");
        await expect(passo).toHaveText(/^passo 2 de \d+$/);
        await page.keyboard.press("ArrowRight");
        await expect(passo).toHaveText(/^passo 3 de \d+$/);

        // Com o cursor no controle de velocidade, a seta é do slider: o passo
        // não anda E a marcha muda. Sem a segunda metade, a asserção do passo
        // sozinha não prova nada — no passo 1 a seta para trás já está no piso.
        const marcha = painel.locator(".viz-speed .val");
        const range = painel.locator('input[type="range"]');
        await expect(range).toHaveCount(1);
        await expect(marcha).toHaveText("1x");
        await range.focus();
        await page.keyboard.press("ArrowRight");
        await expect(marcha).toHaveText("1.5x");
        await expect(passo).toHaveText(/^passo 3 de \d+$/);

        // Espaço com um botão em foco é o botão, não o roda/pausa.
        const proximo = painel.getByRole("button", { name: "Próximo ›" });
        await proximo.focus();
        await page.keyboard.press(" ");
        await expect(passo).toHaveText(/^passo 4 de \d+$/);
        await expect(painel.getByRole("button", { name: "▶ Rodar" })).toBeVisible();
      });
    });
  });
}

// ---------------------------------------------------------------------------
// As invariantes de cada peça: números que a tela tem de concordar entre si.
// Nenhum valor escrito de cabeça — cada asserção compara dois ou três lugares
// da tela que chegam ao número por caminhos diferentes.
// ---------------------------------------------------------------------------

test.describe("as contas que a tela promete", () => {
  test.use({ viewport: { width: 1512, height: 900 } });

  test("busca binária · lidas + descartadas sem ler = o array inteiro", async ({ page }) => {
    const fig = await abrir(page, PECAS[0]);
    await fig.getByRole("button", { name: "Um valor que não existe: 40" }).click();

    const proximo = fig.getByRole("button", { name: "Próximo ›" });
    for (let i = 0; i < 40 && !(await proximo.isDisabled()); i++) await proximo.click();
    await expect(proximo).toBeDisabled();

    const doCartao = async (rotulo: string) => {
      const cartao = fig.locator(".bigo-stat").filter({ hasText: rotulo });
      await expect(cartao).toHaveCount(1);
      return parseInt(await cartao.locator("strong").innerText(), 10);
    };
    const lidas = await doCartao("comparações até aqui");
    const descartadas = await doCartao("descartadas sem ler");
    const total = (await fig.locator(".viz-cells .viz-cell").count());

    // O cartão diz "descartadas SEM LER": a posição do meio foi lida nesta
    // iteração e não pode entrar nesta conta. Se ela entrasse, a soma passaria
    // do tamanho do array — que é exatamente o rótulo mentindo.
    expect(lidas + descartadas).toBe(total);
    await expect(fig.locator(".viz-note")).toContainText(
      `${lidas} + ${descartadas} = ${total}`
    );
  });

  test("fronteiras · o retorno negativo é -(esq) - 1, com esq lido do painel", async ({
    page,
  }) => {
    const fig = await abrir(page, PECAS[1]);
    await fig.getByRole("button", { name: "Um valor que não existe: 7" }).click();
    await fig.getByRole("button", { name: "onde entraria", exact: true }).click();

    const proximo = fig.getByRole("button", { name: "Próximo ›" });
    for (let i = 0; i < 40 && !(await proximo.isDisabled()); i++) await proximo.click();
    await expect(proximo).toBeDisabled();

    // `esq` sai do painel de variáveis, pelo nome — não pela posição na lista.
    const linhaEsq = fig.locator(".viz-var").filter({ hasText: "esq" });
    await expect(linhaEsq).toHaveCount(1);
    const esq = parseInt(await linhaEsq.locator(".viz-var-val").innerText(), 10);

    const cartao = fig.locator(".bigo-stat").filter({ hasText: "retorno do Arrays.binarySearch" });
    await expect(cartao).toHaveCount(1);
    const retorno = parseInt(await cartao.locator("strong").innerText(), 10);

    expect(retorno).toBe(-esq - 1);
    await expect(fig.locator(".viz-note")).toContainText(`-(${esq}) - 1 = ${retorno}`);
  });
});
