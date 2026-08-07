import { test, expect, type Locator, type Page } from "@playwright/test";

// A casca de TODO visualizador vem de `src/lib/visualizer.tsx`, e o que se prova
// aqui é o comportamento dela: o passo sendo anunciado, a animação parando
// quando ninguém está vendo, e os dois controles que existiam sem nome.
//
// Contar elemento não testa nada — já passaram por uma suíte verde um
// visualizador sem botão nenhum e um painel com 0px. Cada teste daqui INTERAGE e
// lê o rótulo.

/**
 * O contador "passo N de M". Escopado na figura E filtrado pelo texto, porque
 * `.viz-step` é ambíguo: o `BigOCounterVisualizer` passa um segundo pela porta
 * de `children` do `VizHeader` ("n = 62"), e o `MergeSortVisualizer` tem três na
 * mesma página. Um `.first()` aqui leria o número errado sem erro nenhum.
 */
function contadorDePasso(fig: Locator): Locator {
  return fig.locator(".viz-step").filter({ hasText: /^passo \d+ de \d+$/ });
}

/**
 * A peça que cada página deste arquivo exercita, pelo TÍTULO dela. É a chave dos
 * seletores daqui, e a razão de existir está logo abaixo.
 */
const PECAS = {
  "/topico/big-o/": "contando operações no mesmo array",
  "/topico/merge-sort/": "a descida divide, a subida ordena",
  "/topico/arrays/": "memória contígua e o endereço de nums[i]",
} as const;

/**
 * A figura DAQUELA peça, escolhida por qual ela é e nunca por onde ela está.
 *
 * Aqui havia `page.locator("figure.viz-fit").first()`, que é uma afirmação sobre
 * a ORDEM no documento e só acerta enquanto a página tem uma figura na casca.
 * Em `/topico/big-o/` o `[0]` passa a ser o gráfico das famílias assim que ele
 * for adaptado: sem `Próximo ›`, sem `▶ Rodar`, sem `↺ Reiniciar`, sem slider, e
 * com o `.viz-step` valendo "n = 62". Em `/topico/merge-sort/` o alvo é o `[0]`
 * por acidente, ao lado de dois irmãos cujo `.viz-step` diz "4 rodadas de
 * intercalação…" e "as duas versões se separam na decisão 2".
 *
 * A ironia é que o `contadorDePasso` acima já avisava disso, e este helper caía
 * na mesma armadilha três linhas depois.
 *
 * **Escope por QUAL figura, nunca por QUANTAS têm a casca.** O título é
 * identidade; contar figuras adaptadas seria afirmar o cronograma da migração,
 * que muda a cada PR e não é o produto. E os dois modos de errar não custam o
 * mesmo: título trocado reprova alto no `toHaveCount(1)`, ordem trocada mede a
 * peça errada em silêncio.
 */
async function figuraDe(page: Page, url: keyof typeof PECAS): Promise<Locator> {
  await page.goto(url);
  const fig = page.locator("figure.viz-fit").filter({ hasText: PECAS[url] });
  await expect(fig, `a peça "${PECAS[url]}" tem que ser única em ${url}`).toHaveCount(1);
  await expect(fig).toBeVisible();
  return fig;
}

test.describe("os seletores deste arquivo apontam para a peça certa", () => {
  // O canário desta classe de defeito: ele reprova no dia em que um irmão da
  // página entrar na casca e roubar o `[0]`, em vez de deixar os outros testes
  // medirem a peça errada.
  for (const [url, titulo] of Object.entries(PECAS) as [keyof typeof PECAS, string][]) {
    test(`em ${url} o alvo é achado pelo título e tem a linha do tempo`, async ({ page }) => {
      const fig = await figuraDe(page, url);
      await expect(fig).toContainText(titulo);

      // O que TODO teste deste arquivo exercita mora nesta figura, e é isso que
      // a torna o alvo — não a posição dela.
      await expect(contadorDePasso(fig)).toHaveCount(1);
      await expect(fig.getByRole("button", { name: "Próximo ›" })).toHaveCount(1);
      await expect(fig.getByRole("button", { name: "Reiniciar" })).toHaveCount(1);
      await expect(fig.getByRole("slider", { name: /Velocidade/ })).toHaveCount(1);
      await expect(fig.getByRole("status")).toHaveCount(1);

      // Nada aqui afirma QUANTAS figuras a página tem na casca: seria asserção
      // sobre o cronograma da migração. O que se afirma é que a peça alvo
      // existe, é uma só, e que o `.viz-step` cru continua ambíguo dentro dela —
      // que é por que o `contadorDePasso` filtra pelo texto.
      expect(await page.locator("figure.viz-fit").count()).toBeGreaterThanOrEqual(1);
      expect(await fig.locator(".viz-step").count()).toBeGreaterThanOrEqual(1);
    });
  }
});

test.describe("a região viva anuncia o passo", () => {
  test("o texto muda quando o aluno aperta Próximo ›", async ({ page }) => {
    const fig = await figuraDe(page, "/topico/big-o/");

    const status = fig.getByRole("status");
    await expect(status).toHaveCount(1);

    // Premissa 1: ela nasce MUDA. Uma região viva já preenchida na montagem faz
    // as cinco peças de `intervals.mdx` falarem juntas ao abrir a página, sem
    // que o aluno tenha feito nada.
    await expect(status).toHaveText("");

    // Premissa 2: invisível para o olho, presente para o leitor de tela. Com
    // `display: none` ou `visibility: hidden` a caixa não existiria — e é
    // exatamente o conserto que PARECE funcionar e deixa o anúncio mudo.
    const caixa = await status.boundingBox();
    expect(caixa).not.toBeNull();
    expect(caixa!.width).toBeLessThanOrEqual(2);
    expect(caixa!.height).toBeLessThanOrEqual(2);

    const contador = contadorDePasso(fig);
    await expect(contador).toHaveCount(1);
    const passoAntes = (await contador.textContent()) ?? "";
    const anuncioAntes = (await status.textContent()) ?? "";

    await fig.getByRole("button", { name: "Próximo ›" }).click();

    // Premissa 3: o algoritmo andou de verdade (senão o resto não quer dizer
    // nada). Asserção web-first: o React re-renderiza de forma assíncrona.
    await expect(contador).not.toHaveText(passoAntes);
    // E a asserção que carrega o sentido: a região DISSE que andou.
    await expect(status).not.toHaveText(anuncioAntes);
    await expect(status).toHaveText(/^passo 2 de \d+$/);
  });

  test("o anúncio não vira ruído durante a reprodução automática", async ({ page }) => {
    const fig = await figuraDe(page, "/topico/merge-sort/");
    const status = fig.getByRole("status");
    const contador = contadorDePasso(fig);
    const rodar = fig.getByRole("button", { name: /Rodar|Pausar/ });

    await rodar.click();
    await expect(rodar).toHaveText(/Pausar/);
    // Começar a rodar É uma ação do aluno, e ela é anunciada uma vez.
    await expect(status).toHaveText(/^rodando a partir do passo 1 de \d+$/);

    const anuncioNoInicio = (await status.textContent()) ?? "";
    const passoNoInicio = (await contador.textContent()) ?? "";
    // Três marchas de 650ms: tempo de sobra para o relógio andar vários passos.
    await page.waitForTimeout(2000);

    // Premissa: a animação andou mesmo enquanto ninguém falava.
    expect(await contador.textContent()).not.toBe(passoNoInicio);
    // A asserção: o relógio NÃO escreveu na região viva. Com um anúncio por
    // tick, na marcha 2x (250ms) o leitor de tela enfileira falas que nunca
    // alcançam a tela, e ruído contínuo é pior que silêncio.
    expect(await status.textContent()).toBe(anuncioNoInicio);

    // E pausar, que é ação do aluno de novo, volta a falar — com o passo em que
    // a animação parou, não com o que ela tinha quando começou.
    await rodar.click();
    await expect(rodar).toHaveText(/Rodar/);
    await expect(status).toHaveText(/^pausado no passo \d+ de \d+$/);
    await expect(status).not.toHaveText(anuncioNoInicio);
  });

  test("um salto programático cala a região, em vez de deixar o anúncio velho de pé", async ({
    page,
  }) => {
    const fig = await figuraDe(page, "/topico/arrays/");
    const status = fig.getByRole("status");
    const contador = contadorDePasso(fig);

    // O `viz.step` desta peça É o índice lido, e o `total` É o tamanho do array.
    await expect(contador).toHaveText("passo 4 de 8");
    await expect(status).toHaveText("");

    // "20 inteiros" é o caso que nenhum outro teste alcança: o mesmo handler
    // troca o array (8 → 20 posições) E posiciona o índice. O `viz.reset()`
    // escreve o anúncio com o total ANTIGO, e o `viz.setStep(16)` da linha
    // seguinte leva a peça para outro passo — a região fica afirmando um par
    // (passo, total) que a renderização não confirma.
    await fig.getByRole("button", { name: "20 inteiros" }).click();

    // Premissa: a peça mudou mesmo. Sem ela, o silêncio abaixo seria trivial.
    await expect(contador).toHaveText("passo 17 de 20");

    // A asserção que carrega o sentido: sem o conserto esta linha lê
    // "passo 1 de 8" — o passo errado E o total errado, na única pista que o
    // aluno cego tem de onde a peça está. O hook não consegue montar a frase
    // certa aqui (o `total` novo só chega no render seguinte), então ele cala.
    await expect(status).toHaveText("");

    // E o silêncio é do salto, não da peça: a seta seguinte volta a falar, já
    // com o total novo.
    await fig.getByRole("button", { name: "Próximo ›" }).click();
    await expect(contador).toHaveText("passo 18 de 20");
    await expect(status).toHaveText(/^passo 18 de 20/);
  });
});

test.describe("o ▶ Rodar não perde o próprio estado", () => {
  test("dois toques no mesmo tick voltam ao parado, em vez de mandar rodar duas vezes", async ({
    page,
  }) => {
    const fig = await figuraDe(page, "/topico/merge-sort/");
    const rodar = fig.getByRole("button", { name: /Rodar|Pausar/ });
    const contador = contadorDePasso(fig);
    await expect(rodar).toHaveText(/Rodar/);

    // Os dois cliques no MESMO tick, que é o pior caso do estado lido por ref:
    // o `playing` do primeiro ainda não chegou ao ref quando o segundo decide.
    await rodar.evaluate((b: HTMLElement) => {
      b.click();
      b.click();
    });

    // Dois toques na mesma tecla se cancelam. Sem o conserto o segundo lia
    // `playingRef.current === false` e voltava a MANDAR RODAR, e esta linha
    // recebia "❚❚ Pausar".
    await expect(rodar).toHaveText(/Rodar/);

    // E parado é parado: o contador não anda depois de duas marchas de 650ms.
    const parouEm = (await contador.textContent()) ?? "";
    await page.waitForTimeout(1500);
    expect(await contador.textContent()).toBe(parouEm);
  });
});

test.describe("a animação não roda para quem não está vendo", () => {
  test("sair da tela pausa, e voltar NÃO retoma sozinho", async ({ page }) => {
    const fig = await figuraDe(page, "/topico/merge-sort/");
    const contador = contadorDePasso(fig);
    await expect(contador).toHaveCount(1);
    const rodar = fig.getByRole("button", { name: /Rodar|Pausar/ });

    const inicial = (await contador.textContent()) ?? "";
    await rodar.click();
    await expect(rodar).toHaveText(/Pausar/);
    // Premissa: com a peça na tela ela ANDA. Sem isto o teste aprovaria uma
    // animação que nunca começou.
    await expect(contador).not.toHaveText(inicial);

    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" })
    );
    await expect(fig).not.toBeInViewport();

    // Duas leituras com intervalo, e não o estado interno: o que importa é o
    // que o aluno vê parar de andar.
    await page.waitForTimeout(400);
    const foraA = (await contador.textContent()) ?? "";
    // Premissa: não é que a animação acabou — ela parou no meio.
    expect(foraA).not.toMatch(/^passo (\d+) de \1$/);
    await page.waitForTimeout(2000);
    expect(await contador.textContent()).toBe(foraA);

    // De volta à tela: pausada, e pausada continua. Retomar sozinho surpreende
    // quem rolou de volta.
    await fig.scrollIntoViewIfNeeded();
    await expect(fig).toBeInViewport();
    await expect(rodar).toHaveText(/Rodar/);
    const voltaA = (await contador.textContent()) ?? "";
    await page.waitForTimeout(2000);
    expect(await contador.textContent()).toBe(voltaA);
  });

  test("a pausa automática não deixa a região viva dizendo que ainda roda", async ({ page }) => {
    const fig = await figuraDe(page, "/topico/merge-sort/");
    const status = fig.getByRole("status");
    const contador = contadorDePasso(fig);
    const rodar = fig.getByRole("button", { name: /Rodar|Pausar/ });

    const inicial = (await contador.textContent()) ?? "";
    await rodar.click();
    await expect(rodar).toHaveText(/Pausar/);
    // Premissas: a animação começou, e a região disse isso.
    await expect(contador).not.toHaveText(inicial);
    await expect(status).toHaveText(/^rodando a partir do passo \d+ de \d+$/);

    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" })
    );
    await expect(fig).not.toBeInViewport();
    // Premissa: a pausa automática aconteceu mesmo — é ela que cria a incoerência.
    await expect(rodar).toHaveText(/Rodar/);

    // A asserção que carrega o sentido: sem o conserto a região continua
    // afirmando "rodando a partir do passo 1 de 79" com a peça parada, ou seja,
    // a única pista de quem não enxerga dizendo o contrário do botão ao lado.
    // Ela CALA em vez de anunciar: pausa automática não é ação do aluno, e
    // anunciá-la interromperia quem já está lendo outra coisa da página.
    await expect(status).toHaveText("");
  });
});

test.describe("o foco volta para o botão que abriu o painel", () => {
  // O contrato (`content/visualizers/README.md` §5) promete "entra no painel ao
  // abrir, volta para onde estava ao fechar". O `<figure>` atravessa um portal,
  // e o nó guardado na abertura é destruído nessa travessia: o `focus()` da
  // limpeza rodava num nó destacado, sem erro nenhum, e o foco caía no `<body>`.
  //
  // As duas saídas são testadas porque são dois caminhos diferentes: no `Esc` o
  // foco está no `<figure>`, e no `✕ Fechar` está no próprio botão que some.
  for (const saida of ["Esc", "✕ Fechar"] as const) {
    test(`fechando com ${saida}, o foco volta para o ⤢ Expandir`, async ({ page }) => {
      const fig = await figuraDe(page, "/topico/big-o/");
      const expandir = fig.getByRole("button", { name: /Expandir/ });

      // Abrir pelo TECLADO: é o público desta correção.
      await expandir.focus();
      await expect(expandir).toBeFocused();
      await page.keyboard.press("Enter");

      const painel = page.locator(".viz-overlay figure.viz-fit");
      await expect(painel).toHaveCount(1);
      // Premissa: o foco entrou no painel. Sem ela, "voltou" não quer dizer nada.
      await expect
        .poll(() =>
          page.evaluate(() => {
            const f = document.querySelector(".viz-overlay figure.viz-fit");
            return !!f && (f === document.activeElement || f.contains(document.activeElement));
          })
        )
        .toBe(true);

      if (saida === "Esc") await page.keyboard.press("Escape");
      else await painel.getByRole("button", { name: /Fechar/ }).click();
      await expect(painel).toHaveCount(0);

      // O valor primeiro, para a falha DIZER o que aconteceu: sem o conserto
      // esta linha recebe "BODY".
      await expect
        .poll(() => page.evaluate(() => document.activeElement?.tagName ?? "NULO"))
        .toBe("BUTTON");
      // E a identidade: é o botão que abriu o painel, localizado pelo NOME
      // acessível, e não pelo glifo nem pela posição na linha.
      await expect(expandir).toBeFocused();
    });
  }
});

test.describe("os dois controles que não tinham nome", () => {
  test("o ↺ se chama Reiniciar e volta ao passo 1", async ({ page }) => {
    const fig = await figuraDe(page, "/topico/big-o/");
    const contador = contadorDePasso(fig);
    const proximo = fig.getByRole("button", { name: "Próximo ›" });

    await proximo.click();
    await proximo.click();
    await expect(contador).toHaveText(/^passo 3 de \d+$/);

    // O `title` não vira nome acessível quando o botão tem conteúdo: o glifo
    // vence, e o leitor de tela anunciava o nome Unicode dele (ou nada).
    const reiniciar = fig.getByRole("button", { name: "Reiniciar" });
    await expect(reiniciar).toHaveCount(1);
    await reiniciar.click();
    await expect(contador).toHaveText(/^passo 1 de \d+$/);
  });

  test("o slider de velocidade tem rótulo de verdade, e o layout não muda", async ({ page }) => {
    const fig = await figuraDe(page, "/topico/big-o/");
    const slider = fig.getByRole("slider", { name: /Velocidade/ });
    await expect(slider).toHaveCount(1);

    // Rótulo de VERDADE, não texto ao lado: um `<label>` passa o clique para o
    // controle que ele envolve. É a diferença que o nome acessível sozinho não
    // distingue de um `aria-label` colado numa `<div>`.
    await fig.locator(".viz-speed > span").first().click();
    await expect(slider).toBeFocused();

    // O valor anunciado é o valor da tela, e não o índice cru do range (que
    // diria "3 de 5" onde o aluno lê "1x").
    const val = fig.locator(".viz-speed .val");
    await expect(slider).toHaveAttribute("aria-valuetext", (await val.textContent())!);
    await slider.press("ArrowRight");
    await expect(val).not.toHaveText("1x");
    await expect(slider).toHaveAttribute("aria-valuetext", (await val.textContent())!);

    // E a troca de tag não move um pixel, porque o CSS é por classe. Sem número
    // mágico: `display` é o valor que a classe declara, e a borda direita do
    // slider coincide com a da linha de controles porque `.viz-speed` tem
    // `margin-left: auto`. As duas caem se a classe deixar de alcançar a tag.
    const caixaSpeed = fig.locator(".viz-speed");
    expect(await caixaSpeed.evaluate((el) => getComputedStyle(el).display)).toBe("flex");
    const speed = await caixaSpeed.boundingBox();
    const controles = await fig.locator(".viz-controls").boundingBox();
    expect(Math.round(speed!.x + speed!.width)).toBe(
      Math.round(controles!.x + controles!.width)
    );
  });
});
