import { test, expect, type Page } from "@playwright/test";

// A casca adaptativa do MstVisualizer (Kruskal e Prim no mesmo grafo).
//
// Todo número aqui foi MEDIDO no build antes de virar asserção, e o que dá para
// escrever como invariante entre dois lugares da tela está escrito assim. O
// motivo é concreto: "a MST tem sempre V-1 = 5 arestas" é o que a própria peça
// ensina, e a nota final até diz isso — mas escrever o 5 na mão faria o teste
// aprovar qualquer regressão que mudasse as DUAS pontas juntas. O que ele exige
// é que o cartão "arestas na MST", as fichas verdes da lista e a nota do passo
// digam o mesmo número, por três caminhos diferentes.

const ARTIGO = "article figure.viz-fit";
const PAINEL = ".viz-overlay-fit figure.viz-fit";

/** Folga de subpixel: o mesmo valor que o hook usa para decidir. */
const SLACK = 8;

async function abrirTopico(page: Page) {
  await page.goto("/topicos/mst/");
  await page.evaluate(() => document.fonts.ready);
  await page.locator(ARTIGO).scrollIntoViewIfNeeded();
  // A decisão da casca roda em dois passes de layout depois das fontes; sem
  // esperar por ela, `data-codigo` ainda é o "on" do primeiro render.
  await expect(page.locator(ARTIGO)).toHaveAttribute("data-anim", "on");
}

/** Estado do bloco recolhível: o rótulo do botão E a altura que ele ocupa. */
const LER_BLOCO = (sel: string) => {
  const f = document.querySelector(sel) as HTMLElement;
  const btn = [...f.querySelectorAll(".viz-head button")].find((b) => /código/.test(b.textContent || ""));
  return {
    codigo: f.getAttribute("data-codigo"),
    rotulo: btn ? (btn.textContent || "").trim() : "«sem botão»",
    expanded: btn ? btn.getAttribute("aria-expanded") : null,
    alturaCodigo: Math.round((f.querySelector(".viz-code") as HTMLElement).getBoundingClientRect().height),
    figura: Math.round(f.getBoundingClientRect().height),
  };
};

/** Lê um cartão do painel de variáveis pelo RÓTULO, e devolve rótulo e valor juntos. */
const CARTAO = ([sel, nome]: [string, string]) => {
  const f = document.querySelector(sel) as HTMLElement;
  const linha = [...f.querySelectorAll(".viz-var")].find(
    (v) => (v.querySelector(".viz-var-name")?.textContent || "").trim() === nome
  );
  if (!linha) {
    const havia = [...f.querySelectorAll(".viz-var-name")].map((n) => n.textContent).join(" | ");
    throw new Error(`cartão "${nome}" não existe. Rótulos na tela: ${havia}`);
  }
  const val = linha.querySelector(".viz-var-val") as HTMLElement;
  return { nome, valor: (val.textContent || "").trim(), destacado: val.className.includes("best") };
};

/**
 * Altura do bloco recolhível depois que ela PAROU.
 *
 * `toHaveAttribute("data-codigo", "on")` fica verde no primeiro quadro, e a
 * transição da casca dura 0,32s: ler ali devolve os 2px do estado recolhido
 * para um bloco que está indo para 459. E duas leituras iguais não são "parou"
 * — uma transição passa por patamares. Exige TRÊS.
 */
async function alturaCodigoEstavel(page: Page, sel: string) {
  let iguais = 0;
  let anterior = Number.NaN;
  for (let i = 0; i < 60; i++) {
    const h = await page.evaluate(
      (s) => Math.round((document.querySelector(`${s} .viz-code`) as HTMLElement).getBoundingClientRect().height),
      sel
    );
    iguais = h === anterior ? iguais + 1 : 0;
    anterior = h;
    if (iguais >= 2) return h;
    await page.waitForTimeout(50);
  }
  throw new Error(`a altura do bloco não estabilizou (última leitura: ${anterior})`);
}

const contador = (sel: string) => {
  const txt = [...document.querySelectorAll(`${sel} .viz-step`)].map((e) => e.textContent).join(" ");
  const m = txt.match(/passo (\d+) de (\d+)/);
  if (!m) throw new Error(`o contador de passo não casou: "${txt}"`);
  return { passo: parseInt(m[1], 10), total: parseInt(m[2], 10) };
};

/**
 * Espera o painel estar PRONTO para o teclado, não só visível.
 *
 * `toBeVisible()` prova que o portal foi montado; o listener de `keydown` é
 * registrado num efeito passivo, que roda depois da pintura. A tecla enviada
 * nessa janela não faz nada e some sem erro — foi o que reprovou este teste uma
 * vez com a máquina cheia. O contrato §5 diz que o foco entra no painel ao
 * abrir, e o efeito do foco está declarado ANTES do efeito do teclado: o React
 * descarrega os efeitos de um commit numa passada só, em ordem, então foco
 * dentro do painel prova que o listener já está no lugar.
 */
async function painelPronto(page: Page) {
  await expect
    .poll(() => page.evaluate(() => !!document.activeElement?.closest(".viz-overlay-fit")), {
      message: "o foco tem que entrar no painel ao abrir",
    })
    .toBe(true);
}

async function irAoFim(page: Page, raiz: string) {
  const { total } = await page.evaluate(contador, raiz);
  const proximo = page.locator(raiz).getByRole("button", { name: "Próximo ›" });
  // Os dois lados da janela: o percurso começa no início (senão os cliques caem
  // num botão já desabilitado e o contador nunca sai do lugar) e termina no fim.
  await expect(proximo, "a animação não reiniciou: Próximo já começou desabilitado").toBeEnabled();
  for (let i = 1; i < total; i++) await proximo.click();
  await expect(page.locator(raiz).locator(".viz-step").last()).toHaveText(`passo ${total} de ${total}`);
  // O contador diz onde a peça está; o botão desabilitado diz que ela ACABOU.
  // São afirmações diferentes: um `total` lido errado deixa as duas primeiras
  // asserções coerentes entre si e erradas em relação à animação.
  await expect(proximo, "o percurso não chegou ao fim: Próximo continua ativo").toBeDisabled();
  return total;
}

test.describe("mst", () => {
  // ------------------------------------------------------------------ camada 1
  test.describe("camada 1", () => {
    test.use({ viewport: { width: 1440, height: 600 } });

    test("o rodape fica parado no pe do painel e o Rodar nao sai da janela", async ({ page }) => {
      expect(page.viewportSize()).toEqual({ width: 1440, height: 600 });
      await abrirTopico(page);
      await page.locator(ARTIGO).getByRole("button", { name: "⤢ Expandir" }).click();
      const painel = page.locator(PAINEL);
      await expect(painel).toBeVisible();

      // PRÉ-CONDIÇÃO: sem sobra para rolar, o teste inteiro é decoração verde.
      // Medido no passo 1 desta régua: 102px (os demais passos dão 82).
      const antes = await page.evaluate((sel) => {
        const f = document.querySelector(sel) as HTMLElement;
        const b = f.querySelector(".viz-body") as HTMLElement;
        f.scrollTop = 0; b.scrollTop = 0;
        const rodar = [...f.querySelectorAll("button")].find((x) => /Rodar|Pausar/.test(x.textContent || ""))!;
        return {
          sobra: b.scrollHeight - b.clientHeight,
          headTop: Math.round(f.querySelector(".viz-head")!.getBoundingClientRect().top - f.getBoundingClientRect().top),
          footBottom: Math.round(f.getBoundingClientRect().bottom - f.querySelector(".viz-foot")!.getBoundingClientRect().bottom),
          rodarAbaixo: Math.round(rodar.getBoundingClientRect().bottom - window.innerHeight),
        };
      }, PAINEL);
      expect(antes.sobra, "o miolo precisa ter o que rolar").toBeGreaterThan(SLACK);

      // O que a camada 1 promete: sem rolar NADA, o botão que faz o algoritmo
      // andar já está na janela. Antes da casca ele era desenhado 531px abaixo
      // do pé dela.
      expect(antes.rodarAbaixo, "o ▶ Rodar tem que estar dentro da janela sem rolar nada").toBeLessThanOrEqual(0);

      const depois = await page.evaluate((sel) => {
        const f = document.querySelector(sel) as HTMLElement;
        const b = f.querySelector(".viz-body") as HTMLElement;
        b.scrollTop = 99999;
        f.scrollTop = 99999;
        const rodar = [...f.querySelectorAll("button")].find((x) => /Rodar|Pausar/.test(x.textContent || ""))!;
        return {
          bodyScroll: b.scrollTop,
          figScroll: f.scrollTop,
          headTop: Math.round(f.querySelector(".viz-head")!.getBoundingClientRect().top - f.getBoundingClientRect().top),
          footBottom: Math.round(f.getBoundingClientRect().bottom - f.querySelector(".viz-foot")!.getBoundingClientRect().bottom),
          rodarAbaixo: Math.round(rodar.getBoundingClientRect().bottom - window.innerHeight),
        };
      }, PAINEL);

      expect(depois.bodyScroll, "quem rola é o miolo").toBeGreaterThan(0);
      expect(depois.figScroll, "a figura inteira não pode ser a área rolável").toBe(0);
      expect(depois.headTop, "o cabeçalho não anda").toBe(antes.headTop);
      expect(depois.footBottom, "o rodapé não anda").toBe(antes.footBottom);
      expect(depois.rodarAbaixo, "o ▶ Rodar continua na janela depois de rolar").toBeLessThanOrEqual(0);
    });
  });

  // ------------------------------------------------------------------ camada 3
  test.describe("camada 3, tela baixa", () => {
    test.use({ viewport: { width: 1440, height: 600 } });

    test("o botao diz Mostrar codigo e o bloco perde a ALTURA", async ({ page }) => {
      expect(page.viewportSize()).toEqual({ width: 1440, height: 600 });
      await abrirTopico(page);
      const m = await page.evaluate(LER_BLOCO, ARTIGO);
      expect(m.codigo).toBe("off");
      expect(m.rotulo).toBe("Mostrar código");
      expect(m.expanded).toBe("false");
      // Rótulo certo com altura intacta é o defeito que o `.viz-code-slot`
      // conserta: zerar a trilha da coluna tira largura, não altura. Medido:
      // 2px recolhido contra 459 aberto.
      expect(m.alturaCodigo, "o bloco recolhido não pode ocupar altura").toBeLessThan(SLACK);
      // Medido: 710px de figura contra 1123 antes da casca.
      expect(m.figura).toBeLessThan(800);
    });

    test("a escolha do aluno vence a medicao e sobrevive a troca de preset", async ({ page }) => {
      expect(page.viewportSize()).toEqual({ width: 1440, height: 600 });
      await abrirTopico(page);
      const artigo = page.locator(ARTIGO);
      await expect(artigo).toHaveAttribute("data-codigo", "off");

      await artigo.getByRole("button", { name: "Mostrar código" }).click();
      await expect(artigo).toHaveAttribute("data-codigo", "on");
      expect(await alturaCodigoEstavel(page, ARTIGO), "o bloco tem que abrir de verdade").toBeGreaterThan(400);

      // O preset está em `measureOn`: esta troca PEDE medição nova, e nesta
      // janela a medição quer recolher. Sem confirmar a troca na tela, o teste
      // aprovaria uma escolha que nada ameaçou.
      await artigo.getByRole("button", { name: "Uma ponte cara e obrigatória", exact: true }).click();
      await expect(artigo.locator(".tt-legenda-arvore")).toContainText("peso 20");

      await expect(artigo).toHaveAttribute("data-codigo", "on");
      const depois = await page.evaluate(LER_BLOCO, ARTIGO);
      expect(depois.rotulo).toBe("Ocultar código");
      expect(
        await alturaCodigoEstavel(page, ARTIGO),
        "a escolha do aluno não é desfeita pela medição"
      ).toBeGreaterThan(400);
    });
  });

  test.describe("camada 3, tela alta", () => {
    test.use({ viewport: { width: 1512, height: 1400 } });

    test("o bloco ja vem aberto quando a peca cabe", async ({ page }) => {
      expect(page.viewportSize()).toEqual({ width: 1512, height: 1400 });
      await abrirTopico(page);
      const m = await page.evaluate(LER_BLOCO, ARTIGO);
      expect(m.codigo).toBe("on");
      expect(m.rotulo).toBe("Ocultar código");
      expect(m.expanded).toBe("true");
      // Medido: 459px aberto, e 1133 de figura contra 1316 de orçamento.
      expect(m.alturaCodigo).toBeGreaterThan(400);
    });
  });

  // ------------------------------------------------------------------- teclado
  test.describe("teclado no painel", () => {
    test.use({ viewport: { width: 1440, height: 600 } });

    test("a seta direita anda a animacao, uma tecla de cada vez", async ({ page }) => {
      expect(page.viewportSize()).toEqual({ width: 1440, height: 600 });
      await abrirTopico(page);
      await page.locator(ARTIGO).getByRole("button", { name: "⤢ Expandir" }).click();
      const painel = page.locator(PAINEL);
      await expect(painel).toBeVisible();
      await painelPronto(page);
      const passo = painel.locator(".viz-step").last();
      await expect(passo).toHaveText("passo 1 de 7");

      // Uma tecla só, repetida: um par ArrowRight/ArrowLeft devolveria a peça ao
      // ponto de partida e ficaria verde com o atalho quebrado.
      await page.keyboard.press("ArrowRight");
      await expect(passo).toHaveText("passo 2 de 7");
      await page.keyboard.press("ArrowRight");
      await expect(passo).toHaveText("passo 3 de 7");
    });

    test("com o slider de velocidade em foco a seta e do slider, e o passo nao anda", async ({ page }) => {
      expect(page.viewportSize()).toEqual({ width: 1440, height: 600 });
      await abrirTopico(page);
      await page.locator(ARTIGO).getByRole("button", { name: "⤢ Expandir" }).click();
      const painel = page.locator(PAINEL);
      await expect(painel).toBeVisible();
      await painelPronto(page);
      const passo = painel.locator(".viz-step").last();
      const slider = painel.locator(".viz-speed input");
      await expect(passo).toHaveText("passo 1 de 7");
      await expect(painel.locator(".viz-speed .val")).toHaveText("1.5x");

      await slider.focus();
      await page.keyboard.press("ArrowLeft");
      await expect(painel.locator(".viz-speed .val")).toHaveText("1x");
      await expect(passo, "a seta era do slider").toHaveText("passo 1 de 7");
      await page.keyboard.press("ArrowLeft");
      await expect(painel.locator(".viz-speed .val")).toHaveText("0.75x");
      await expect(passo, "a seta continua sendo do slider").toHaveText("passo 1 de 7");
    });
  });

  // ---------------------------------------------- rótulo junto do valor medido
  test.describe("o que a tela diz", () => {
    test.use({ viewport: { width: 1512, height: 900 } });

    test("a peca abre em 1.5x, a marcha que ela sempre teve", async ({ page }) => {
      expect(page.viewportSize()).toEqual({ width: 1512, height: 900 });
      await abrirTopico(page);
      await page.locator(ARTIGO).getByRole("button", { name: "⤢ Expandir" }).click();
      const painel = page.locator(PAINEL);
      await expect(painel).toBeVisible();
      await expect(painel.locator(".viz-speed .val")).toHaveText("1.5x");
      await expect(painel.locator(".viz-speed input")).toHaveValue("4");
    });

    test("o desenho do grafo nao esta esticado: renderizado igual ao viewBox", async ({ page }) => {
      expect(page.viewportSize()).toEqual({ width: 1512, height: 900 });
      await abrirTopico(page);
      const svg = await page.evaluate((sel) => {
        const s = document.querySelector(`${sel} svg.tt-arv`) as SVGSVGElement;
        const r = s.getBoundingClientRect();
        return { rend: `${Math.round(r.width)}x${Math.round(r.height)}`, box: s.getAttribute("viewBox") };
      }, ARTIGO);
      // Sem esticão não há vazio a devolver, e um `max-height` só encolheria a
      // fonte dos vértices (contrato §3). Medido igual nas três réguas.
      expect(svg.box).toBe("0 0 330 230");
      expect(svg.rend).toBe("330x230");
    });

    for (const modo of ["Kruskal: ordena arestas", "Prim: cresce de um vértice"]) {
      test(`no fim, o cartao arestas na MST bate com as fichas verdes e com a nota (${modo.split(":")[0]})`, async ({ page }) => {
        expect(page.viewportSize()).toEqual({ width: 1512, height: 900 });
        await abrirTopico(page);
        const artigo = page.locator(ARTIGO);
        await artigo.getByRole("button", { name: modo, exact: true }).click();
        await irAoFim(page, ARTIGO);

        const cartao = await page.evaluate(CARTAO, [ARTIGO, "arestas na MST"] as [string, string]);
        const casou = cartao.valor.match(/^(\d+) de (\d+)$/);
        expect(casou, `o cartão devia dizer "N de M" e disse "${cartao.valor}"`).not.toBeNull();
        const naMst = parseInt(casou![1], 10);

        // Três caminhos diferentes para o mesmo número, nenhum escrito na mão:
        // o cartão, as fichas verdes da lista de arestas e a nota do passo.
        const verdes = await artigo.locator(".mst-item.ok").count();
        expect(verdes, "fichas verdes na lista de arestas").toBe(naMst);

        const nota = (await artigo.locator(".viz-note").textContent()) || "";
        const naNota = nota.match(/MST completa com (\d+) arestas/);
        expect(naNota, `a nota final não casou: "${nota}"`).not.toBeNull();
        expect(parseInt(naNota![1], 10), "a nota diz o mesmo que o cartão").toBe(naMst);
      });
    }

    test("Kruskal e Prim mostram o mesmo peso, e o destaque segue o modo escolhido", async ({ page }) => {
      expect(page.viewportSize()).toEqual({ width: 1512, height: 900 });
      await abrirTopico(page);
      const artigo = page.locator(ARTIGO);

      const k = await page.evaluate(CARTAO, [ARTIGO, "Kruskal"] as [string, string]);
      const p = await page.evaluate(CARTAO, [ARTIGO, "Prim"] as [string, string]);
      // A tese da peça inteira, lida como rótulo+valor no mesmo cartão.
      expect(k.valor, "Kruskal e Prim chegam ao mesmo peso").toBe(p.valor);
      expect(k.valor).toMatch(/^peso \d+$/);

      // Trocar os dois valores de lugar passa por qualquer guarda que compare
      // conjuntos; quem pega é o destaque, que tem de seguir o modo ativo.
      expect(k.destacado, "com Kruskal selecionado, o cartão Kruskal é o destacado").toBe(true);
      expect(p.destacado).toBe(false);

      await artigo.getByRole("button", { name: "Prim: cresce de um vértice", exact: true }).click();
      const k2 = await page.evaluate(CARTAO, [ARTIGO, "Kruskal"] as [string, string]);
      const p2 = await page.evaluate(CARTAO, [ARTIGO, "Prim"] as [string, string]);
      expect(p2.destacado, "com Prim selecionado, o cartão Prim é o destacado").toBe(true);
      expect(k2.destacado).toBe(false);

      // E o peso do cabeçalho, no último passo, é o do cartão do modo ativo.
      await irAoFim(page, ARTIGO);
      const cab = (await artigo.locator(".viz-step").first().textContent()) || "";
      const pesoCab = cab.match(/peso (\d+)/);
      expect(pesoCab, `o cabeçalho não casou: "${cab}"`).not.toBeNull();
      expect(`peso ${pesoCab![1]}`, "o cabeçalho fecha no peso do cartão").toBe(p2.valor);
    });
  });
});
