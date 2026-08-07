import { test, expect, type Page } from "@playwright/test";

// A casca adaptativa do HeapSortVisualizer.
//
// Todo número aqui foi MEDIDO no build antes de virar asserção, e o que dá para
// escrever como invariante entre dois lugares da tela está escrito assim.
//
// Um aviso de seletor, porque a página tem TRÊS visualizadores: `.viz-step`,
// `.viz-note`, `.tt-legenda-arvore` e `.hp-cel` também existem no
// HeapSortEstabilidade (28 `.hp-cel` na página, 10 são desta peça). Tudo aqui
// desce a partir da figura, nunca da página.

// As DUAS figuras da página estão na casca agora, então `figure.viz-fit` casava
// 1 e passou a casar 2 — em `page.locator()` isso é violação de strict mode, e
// em `document.querySelector()` seria a peça errada EM SILÊNCIO. O discriminante
// é o bloco recolhível: só o passo a passo tem `.viz-code-slot`.
const ARTIGO = "article figure.viz-fit:has(.viz-code-slot)";
const PAINEL = ".viz-overlay-fit figure.viz-fit";

/** Folga de subpixel, o mesmo valor que o hook usa para decidir. */
const SLACK = 8;

async function abrirTopico(page: Page) {
  await page.goto("/topico/heap-sort/");
  await page.evaluate(() => document.fonts.ready);
  await page.locator(ARTIGO).scrollIntoViewIfNeeded();
  // A decisão da casca roda em dois passes de layout depois das fontes; sem
  // esperar por ela, `data-codigo` ainda é o "on" do primeiro render.
  await expect(page.locator(ARTIGO)).toHaveAttribute("data-anim", "on");
}

/** Altura da figura, o orçamento da janela e o estado do bloco recolhível. */
const LER = (sel: string) => {
  const f = document.querySelector(sel) as HTMLElement;
  const code = f.querySelector(".viz-code") as HTMLElement;
  const hh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ccc-header-h")) || 60;
  return {
    figura: Math.round(f.getBoundingClientRect().height),
    orcamento: Math.round(window.innerHeight - hh - 24),
    codigo: f.getAttribute("data-codigo"),
    alturaCodigo: Math.round(code.getBoundingClientRect().height),
  };
};

const passoAtual = (raiz: string) => {
  const f = document.querySelector(raiz) as HTMLElement;
  const txt = [...f.querySelectorAll(".viz-step")].map((e) => e.textContent).join(" ");
  const m = txt.match(/passo (\d+) de (\d+)/);
  if (!m) throw new Error(`o contador de passo nao casou: "${txt}"`);
  return { passo: parseInt(m[1], 10), total: parseInt(m[2], 10) };
};

test.describe("heap-sort", () => {
  // ---------------------------------------------------------------- camada 1
  test.describe("camada 1", () => {
    test.use({ viewport: { width: 1440, height: 600 } });

    test("cabecalho e rodape ficam parados quando o miolo rola ate o fim", async ({ page }) => {
      expect(page.viewportSize()).toEqual({ width: 1440, height: 600 });
      await abrirTopico(page);

      await page.locator(ARTIGO).getByRole("button", { name: "⤢ Expandir" }).click();
      const painel = page.locator(PAINEL);
      await expect(painel).toBeVisible();

      // A casca acrescenta elementos, e um seletor que casava com um passa a
      // casar com dois — aí ele devolve o primeiro em vez de erro. Dentro da
      // figura o contador é UM.
      await expect(painel.locator(".viz-step")).toHaveCount(1);

      // Esta peça NÃO cresce com a animação: a geometria da árvore sai de
      // `arr.length`, não do heap ativo, e a caixa mede 242px em todos os
      // passos. Medido: 958..978px nos 78 passos, com o passo 1 já no patamar
      // máximo — por isso o teste de rolagem pode morar aqui. A pré-condição
      // abaixo é quem garante isso, e não este comentário.
      const antes = await page.evaluate((sel) => {
        const f = document.querySelector(sel) as HTMLElement;
        const b = f.querySelector(".viz-body") as HTMLElement;
        b.scrollTop = 0;
        return {
          sobra: b.scrollHeight - b.clientHeight,
          headTop: Math.round(f.querySelector(".viz-head")!.getBoundingClientRect().top - f.getBoundingClientRect().top),
          footBottom: Math.round(f.getBoundingClientRect().bottom - f.querySelector(".viz-foot")!.getBoundingClientRect().bottom),
        };
      }, PAINEL);
      // PRÉ-CONDIÇÃO: sem sobra para rolar, o teste inteiro é decoração verde.
      expect(antes.sobra, "o miolo precisa ter o que rolar").toBeGreaterThan(SLACK);

      const depois = await page.evaluate((sel) => {
        const f = document.querySelector(sel) as HTMLElement;
        const b = f.querySelector(".viz-body") as HTMLElement;
        b.scrollTop = b.scrollHeight;
        const play = f.querySelector(".viz-play") as HTMLElement;
        return {
          bodyScrollTop: Math.round(b.scrollTop),
          figScrollTop: Math.round(f.scrollTop),
          headTop: Math.round(f.querySelector(".viz-head")!.getBoundingClientRect().top - f.getBoundingClientRect().top),
          footBottom: Math.round(f.getBoundingClientRect().bottom - f.querySelector(".viz-foot")!.getBoundingClientRect().bottom),
          playAbaixoDaJanela: Math.round(play.getBoundingClientRect().bottom - window.innerHeight),
        };
      }, PAINEL);

      // Quem rolou foi o MIOLO, e não a figura: sem esta dupla o teste aprova a
      // quebra que devolve a rolagem para a figura inteira, que é o defeito de
      // origem (medido no código antigo: o cabeçalho subia 908px e o ▶ Rodar
      // ficava 831px abaixo do pé visível da peça).
      expect(depois.bodyScrollTop, "o miolo tem que ser quem rola").toBeGreaterThan(0);
      expect(depois.figScrollTop, "a figura nao pode rolar").toBe(0);
      expect(depois.headTop, "o cabecalho andou junto com o miolo").toBe(antes.headTop);
      expect(depois.footBottom, "o rodape andou junto com o miolo").toBe(antes.footBottom);
      expect(depois.playAbaixoDaJanela, "o ▶ Rodar caiu para fora da janela").toBeLessThanOrEqual(0);

      // E o botão continua dizendo o que faz, com a animação parada.
      await expect(painel.locator(".viz-play")).toHaveText("▶ Rodar");
    });
  });

  // ------------------------------------------------- camada 3: tela baixa
  test.describe("tela baixa", () => {
    test.use({ viewport: { width: 1440, height: 700 } });

    test("o codigo vem recolhido e o botao diz o que some", async ({ page }) => {
      expect(page.viewportSize()).toEqual({ width: 1440, height: 700 });
      await abrirTopico(page);

      const m = await page.evaluate(LER, ARTIGO);
      expect(m.codigo, "a medicao devia ter recolhido o codigo").toBe("off");
      // Recolher a COLUNA tira largura, não altura: é o `.viz-code-slot` que
      // fecha a linha do grid. Medido: 2px fechado contra 510px aberto.
      expect(m.alturaCodigo, "o bloco continua ocupando altura").toBeLessThan(SLACK);

      await expect(page.locator(`${ARTIGO} .viz-toggle-codigo`)).toHaveText("Mostrar código");
      await expect(page.locator(`${ARTIGO} .viz-code`)).toHaveAttribute("aria-hidden", "true");
    });

    test("a escolha do aluno vence a medicao na troca de preset", async ({ page }) => {
      expect(page.viewportSize()).toEqual({ width: 1440, height: 700 });
      await abrirTopico(page);
      const artigo = page.locator(ARTIGO);

      await expect(artigo.locator(".viz-toggle-codigo")).toHaveText("Mostrar código");
      await artigo.locator(".viz-toggle-codigo").click();
      await expect(artigo.locator(".viz-toggle-codigo")).toHaveText("Ocultar código");
      await expect(artigo.locator(".viz-code")).not.toHaveAttribute("aria-hidden", "true");

      // O preset É a entrada da medição (`measureOn: [presetKey]`) e é a única
      // entrada que esta peça tem. Sem trocar um estado que a medição enxerga, a
      // escolha "sobrevive" sem que nada a tenha ameaçado.
      const dicaAntes = await artigo.locator(".tt-legenda-arvore").textContent();
      await artigo.getByRole("button", { name: /^Ao contrário/ }).click();
      await expect(artigo.locator(".tt-legenda-arvore")).not.toHaveText(dicaAntes!);

      await expect(artigo.locator(".viz-toggle-codigo")).toHaveText("Ocultar código");
      const m = await page.evaluate(LER, ARTIGO);
      expect(m.codigo, "a medicao desfez a escolha do aluno").toBe("on");
      // E a medição discordava mesmo: com o código aberto a peça pede 1.452px
      // contra 616 de orçamento nesta janela. É por isso que o miolo rola no
      // expandido.
      expect(m.figura, "a medicao nem queria recolher aqui").toBeGreaterThan(m.orcamento);
    });
  });

  // -------------------------------------------------- camada 3: tela alta
  test.describe("tela alta", () => {
    test.use({ viewport: { width: 1512, height: 1600 } });

    test("o codigo ja vem aberto quando cabe", async ({ page }) => {
      expect(page.viewportSize()).toEqual({ width: 1512, height: 1600 });
      await abrirTopico(page);

      const m = await page.evaluate(LER, ARTIGO);
      expect(m.codigo, "a medicao recolheu o codigo numa janela onde ele cabe").toBe("on");
      expect(m.alturaCodigo, "o bloco esta aberto mas sem altura").toBeGreaterThan(400);
      expect(m.figura, "a peca aberta nao cabia no orcamento desta janela").toBeLessThanOrEqual(m.orcamento);
      await expect(page.locator(`${ARTIGO} .viz-toggle-codigo`)).toHaveText("Ocultar código");
    });
  });

  // ----------------------------------------- camada 3: o que ela devolve
  test.describe("orcamento", () => {
    test.use({ viewport: { width: 1512, height: 900 } });

    test("o bloco devolve altura, e ainda assim a peca so cabe no expandido", async ({ page }) => {
      expect(page.viewportSize()).toEqual({ width: 1512, height: 900 });
      await abrirTopico(page);
      const artigo = page.locator(ARTIGO);

      const fechado = await page.evaluate(LER, ARTIGO);
      expect(fechado.codigo).toBe("off");
      // Esta peça é a exceção da série: mesmo recolhida ela passa do orçamento
      // do artigo (medido: 978px contra 816). A camada 2 não alcança o fluxo do
      // artigo, então o que sobra é o expandido — e é lá que o miolo rola com o
      // cabeçalho parado. O teste registra o fato em vez de fingir que sumiu.
      expect(fechado.figura, "a peca passou a caber no artigo: reveja este teste").toBeGreaterThan(
        fechado.orcamento
      );

      await expect(artigo.locator(".viz-toggle-codigo")).toHaveText("Mostrar código");
      await artigo.locator(".viz-toggle-codigo").click();
      await expect(artigo.locator(".viz-toggle-codigo")).toHaveText("Ocultar código");
      // A transição da casca dura 0,32s: sem esperar o valor ESTABILIZAR, a
      // leitura pega a altura do meio do caminho.
      await expect.poll(async () => (await page.evaluate(LER, ARTIGO)).alturaCodigo).toBeGreaterThan(400);

      const aberto = await page.evaluate(LER, ARTIGO);
      // Medido: 1.452 aberto contra 978 recolhido, 474px de volta.
      expect(aberto.figura - fechado.figura, "o bloco recolhivel devolve pouca altura").toBeGreaterThan(400);
    });
  });

  // ------------------------------------------------------- teclado e marcha
  test.describe("teclado", () => {
    test.use({ viewport: { width: 1512, height: 900 } });

    test("as setas andam o passo e o slider de velocidade nao perde a seta", async ({ page }) => {
      expect(page.viewportSize()).toEqual({ width: 1512, height: 900 });
      await abrirTopico(page);
      await page.locator(ARTIGO).getByRole("button", { name: "⤢ Expandir" }).click();
      const painel = page.locator(PAINEL);
      await expect(painel).toBeVisible();

      // PRÉ-CONDIÇÃO: `toBeVisible()` não é "pronto para o teclado". O listener
      // de `keydown` nasce num efeito passivo, junto com o que traz o foco para
      // o painel; esperar o foco chegar prova que aquele commit já rodou. Sem
      // isso, a tecla enviada antes some SEM ERRO NENHUM e imita flake.
      await expect
        .poll(async () =>
          page.evaluate((sel) => !!document.querySelector(sel)?.contains(document.activeElement), PAINEL)
        )
        .toBe(true);

      // A marcha desta peça é a dela (`initialSpeed: 4` sobre os SPEEDS
      // próprios). Já se perdeu num rename sem nenhum teste pegar.
      await expect(painel.locator(".viz-speed .val")).toHaveText("1.5x");

      // UMA ação por asserção: um par de ações inversas volta ao estado de
      // origem e fica verde mesmo com a tecla sendo roubada.
      const inicio = await page.evaluate(passoAtual, PAINEL);
      await painel.locator(".viz-speed input[type=range]").focus();
      await page.keyboard.press("ArrowRight");
      await expect(painel.locator(".viz-speed .val"), "a seta nao chegou ao slider").toHaveText("2x");
      expect((await page.evaluate(passoAtual, PAINEL)).passo, "a casca roubou a seta de quem edita").toBe(
        inicio.passo
      );

      // Fora do campo, a mesma tecla é da animação.
      await painel.locator(".viz-head-title").click();
      await page.keyboard.press("ArrowRight");
      await expect(painel.locator(".viz-step")).toHaveText(`passo ${inicio.passo + 1} de ${inicio.total}`);

      // Espaço roda e pausa, e o rótulo do botão diz qual dos dois.
      await page.keyboard.press(" ");
      await expect(painel.locator(".viz-play")).toHaveText("❚❚ Pausar");
      await page.keyboard.press(" ");
      await expect(painel.locator(".viz-play")).toHaveText("▶ Rodar");
    });
  });

  // ------------------------------------------------- o que a peca ENSINA
  test.describe("fronteira", () => {
    test.use({ viewport: { width: 1512, height: 900 } });

    test("o cartao da fase, o painel e o array contam a MESMA fronteira", async ({ page }) => {
      expect(page.viewportSize()).toEqual({ width: 1512, height: 900 });
      await abrirTopico(page);

      // Anda a animação inteira lendo três lugares da tela e cruzando os três.
      // Nenhum número escrito na mão: o que se afirma é que eles concordam.
      const leitura = await page.evaluate(
        (sel) =>
          new Promise<{
            passos: number;
            erros: string[];
            comparacoes: number[];
            primeiroArr: number[];
            ultimoArr: number[];
            ultimoOrdenado: string;
          }>((resolve) => {
            const f = document.querySelector(sel) as HTMLElement;
            const prox = [...f.querySelectorAll("button")].find((b) =>
              b.textContent?.includes("Próximo")
            ) as HTMLButtonElement;
            const erros: string[] = [];
            const comparacoes: number[] = [];
            let primeiroArr: number[] = [];
            let ultimoArr: number[] = [];
            let ultimoOrdenado = "";

            const contador = () => {
              const t = [...f.querySelectorAll(".viz-step")].map((e) => e.textContent).join(" ");
              const m = t.match(/passo (\d+) de (\d+)/);
              if (!m) throw new Error(`o contador de passo nao casou: "${t}"`);
              return { i: parseInt(m[1], 10), n: parseInt(m[2], 10) };
            };
            // Rótulo E valor do MESMO cartão: um par trocado de lugar mantém o
            // conjunto de textos da página e só é pego lendo os dois juntos.
            const varDe = (nome: string) => {
              const c = [...f.querySelectorAll(".viz-var")].find(
                (e) => e.querySelector(".viz-var-name")!.textContent!.trim() === nome
              );
              if (!c) throw new Error(`nao achei a variavel "${nome}"`);
              return c.querySelector(".viz-var-val")!.textContent!.trim();
            };
            const statDe = (nome: string) => {
              const c = [...f.querySelectorAll(".bigo-stat")].find(
                (e) => e.querySelector("span")!.textContent!.trim() === nome
              );
              if (!c) throw new Error(`nao achei o cartao "${nome}"`);
              return c.querySelector("strong")!.textContent!.trim();
            };
            // A célula é `<span class="hp-cel"><i>4</i>6</span>`: o índice mora
            // no <i> e o VALOR é um nó de texto irmão, sem elemento próprio.
            // `textContent` concatena os dois ("46"), e fatiar isso com
            // `replace(/^\d+/, "")` come a string inteira: o regex é guloso e
            // não sabe onde o índice termina. Sobrava "" e `parseInt` devolvia
            // NaN em TODAS as células. Descer até o nó do valor é o que faz a
            // leitura existir.
            const valorDe = (c: Element) =>
              parseInt(
                [...c.childNodes]
                  .filter((x) => x.nodeType === 3)
                  .map((x) => x.textContent ?? "")
                  .join("")
                  .trim(),
                10
              );

            const ler = () => {
              const { i } = contador();
              const txt = f.querySelector(".hs-fase-txt")!.textContent!.replace(/\s+/g, " ").trim();
              const m = txt.match(/heap ativo: posições 0 a (\d+) · já ordenado: (\d+) de (\d+)/);
              if (!m) {
                erros.push(`passo ${i}: o cartao da fase nao casou: "${txt}"`);
                return;
              }
              const ultimo = parseInt(m[1], 10);
              const ordenados = parseInt(m[2], 10);
              const tamanho = parseInt(m[3], 10);

              const n = parseInt(varDe("n (heap ativo)"), 10);
              const celulas = [...f.querySelectorAll(".hp-cel")];
              const verdes = celulas.filter((c) => c.classList.contains("fixo")).length;

              if (ultimo !== Math.max(n - 1, 0))
                erros.push(`passo ${i}: cartao diz ate ${ultimo}, painel diz n=${n}`);
              if (ordenados !== tamanho - n)
                erros.push(`passo ${i}: cartao diz ${ordenados} ordenados, n=${n} de ${tamanho}`);
              if (verdes !== ordenados)
                erros.push(`passo ${i}: ${verdes} celulas verdes contra ${ordenados} no cartao`);
              if (celulas.length !== tamanho)
                erros.push(`passo ${i}: ${celulas.length} celulas contra ${tamanho} no cartao`);
              if (statDe("tamanho do array") !== String(tamanho))
                erros.push(`passo ${i}: o cartao de tamanho diz ${statDe("tamanho do array")}`);

              comparacoes.push(parseInt(statDe("comparações"), 10));
              const valores = celulas.map(valorDe);
              if (valores.some((v) => Number.isNaN(v)))
                erros.push(
                  `passo ${i}: li NaN no array: "${celulas.map((c) => c.textContent).join("|")}"`
                );
              if (!primeiroArr.length) primeiroArr = valores;
              ultimoArr = valores;
              ultimoOrdenado = `${ordenados} de ${tamanho}`;
            };

            const total = contador().n;
            let k = 0;
            const tick = () => {
              ler();
              k++;
              if (k >= total) {
                resolve({ passos: total, erros, comparacoes, primeiroArr, ultimoArr, ultimoOrdenado });
                return;
              }
              prox.click();
              requestAnimationFrame(() => requestAnimationFrame(tick));
            };
            tick();
          }),
        ARTIGO
      );

      expect(leitura.passos, "a animacao encurtou demais para o teste significar algo").toBeGreaterThan(50);
      expect(leitura.erros, "os tres lugares da tela discordam da fronteira").toEqual([]);
      expect(leitura.comparacoes.length).toBe(leitura.passos);

      // O contador de comparações nunca anda para trás.
      const recuos = leitura.comparacoes.filter((c, i) => i > 0 && c < leitura.comparacoes[i - 1]);
      expect(recuos, "o contador de comparacoes andou para tras").toEqual([]);

      // E no fim o array está ordenado, com a fronteira cobrindo tudo.
      //
      // Esta é a TESE da peça, e até aqui ela não era verificada: a leitura do
      // valor da célula devolvia NaN, e `[NaN, NaN]` é igual a `[NaN, NaN]`
      // ordenado, então a asserção passava com qualquer coisa na tela. Agora o
      // array final tem que ser o PRIMEIRO ordenado, o que exige as duas
      // coisas de uma vez: mesma multiplicidade de valores e ordem crescente.
      expect(leitura.ultimoArr.filter((v) => Number.isNaN(v)), "li NaN no lugar do valor").toEqual([]);
      expect(leitura.primeiroArr.length, "o array de entrada nao foi lido").toBeGreaterThan(1);
      expect(leitura.ultimoOrdenado).toBe(`${leitura.ultimoArr.length} de ${leitura.ultimoArr.length}`);
      expect(leitura.ultimoArr, "o heap sort terminou com o array fora de ordem").toEqual(
        [...leitura.primeiroArr].sort((a, b) => a - b)
      );
    });
  });

  // ------------------------------------------------------- a peça sem passos
  // O `HeapSortEstabilidade` vestia `figure.viz` — a MESMA moldura do passo a
  // passo — sem botão Expandir, sem diálogo, sem trava de rolagem, sem Esc e
  // sem foco. Uma peça muda para uma que expandia, com aparência idêntica.
  //
  // Entra com `total: 1` e `collapsible: false`: não há passo a passo nem bloco
  // dispensável. Sem rodapé, o controle cuja posição carrega o sentido da
  // camada 1 é o `✕ Fechar`, que é a saída do diálogo.
  //
  // Réguas medidas antes de escrever (artigo, altura da peça): 696..720 a
  // 1512x900 (orçamento 816: CABE), 696..720 a 1440x700 (orçamento 616: NÃO
  // cabe) e 1.173..1.285 a 390x844 (orçamento 760). Sobra do miolo no painel:
  // 0 a 1512x900, 34 a 1440x600 e 461 a 390x844 — por isso o teste de rolagem
  // mora na régua de celular, que é onde existe o que rolar.
  test.describe("estabilidade", () => {
    const MUDA = 'o que "instável" significa na prática';
    const muda = (page: Page) =>
      page.locator("article figure.viz-fit").filter({ hasText: "significa na prática" });

    test.describe("afordancia", () => {
      test.use({ viewport: { width: 1512, height: 900 } });

      test("as duas peças anunciam o mesmo botão, e o rótulo diz o que a peça mostra", async ({ page }) => {
        await abrirTopico(page);
        // era 1 Expandir para 2 figuras de aparência idêntica
        await expect(page.locator("article figure.viz")).toHaveCount(2);
        await expect(page.locator("article figure.viz-fit")).toHaveCount(2);
        await expect(page.getByRole("button", { name: "⤢ Expandir" })).toHaveCount(2);
        // o discriminante do passo a passo continua único
        await expect(page.locator(ARTIGO)).toHaveCount(1);
        await expect(page.locator("article .viz-code-slot")).toHaveCount(1);

        const fig = muda(page);
        await expect(fig).toHaveCount(1);
        await expect(fig.locator(".viz-step")).toHaveCount(1);
        // rótulo e valor no mesmo locator, e o número tem que bater com as
        // células marcadas na fila do heap sort
        await expect(fig.locator(".viz-step")).toHaveText("6 registros fora da ordem original");
        await expect(fig.locator(".hs-fila").nth(2).locator(".hp-cel.reg.inverteu")).toHaveCount(6);
      });

      test("ela não promete esconder um bloco que não tem", async ({ page }) => {
        await abrirTopico(page);
        const fig = muda(page);
        await expect(fig.locator(".viz-code-slot")).toHaveCount(0);
        await expect(fig.locator(".viz-toggle-codigo")).toHaveCount(0);
        await expect(fig.getByRole("button", { name: /código/ })).toHaveCount(0);
        await expect(fig.locator(".viz-foot")).toHaveCount(0);
        await expect(fig.locator(".viz-atalhos")).toHaveCount(0);
        await expect(fig.getByRole("button", { name: /Rodar|Próximo|Anterior/ })).toHaveCount(0);
        await expect(fig.locator(".viz-step")).not.toHaveText(/passo \d+ de \d+/);
      });
    });

    test.describe("camada 1", () => {
      test.use({ viewport: { width: 390, height: 844 } });

      test("o cabeçalho e o ✕ Fechar ficam parados enquanto o miolo rola", async ({ page }) => {
        expect(page.viewportSize()).toEqual({ width: 390, height: 844 });
        await abrirTopico(page);
        const fig = muda(page);
        await fig.getByRole("button", { name: "⤢ Expandir" }).click();
        const painel = page.locator(PAINEL);
        await expect(painel).toBeVisible();
        // `toBeVisible()` não é "pronto para o teclado": o foco entrando é o
        // sinal de que o commit do listener já rodou.
        await expect(painel).toBeFocused();

        // --- pré-condições ---
        await expect(painel.locator(".viz-foot"), "esta peça não tem rodapé").toHaveCount(0);
        const fechar = painel.getByRole("button", { name: "✕ Fechar" });
        await expect(fechar).toHaveCount(1);

        const antes = await painel.evaluate((f) => {
          const b = f.querySelector(".viz-body") as HTMLElement;
          // o click() do Playwright ROLA o contêiner para alcançar o alvo
          f.scrollTop = 0;
          b.scrollTop = 0;
          const x = [...f.querySelectorAll("button")].find((n) => /Fechar/.test(n.textContent ?? ""))!;
          return {
            sobraMiolo: b.scrollHeight - b.clientHeight,
            sobraFigura: f.scrollHeight - f.clientHeight,
            head: f.querySelector(".viz-head")!.getBoundingClientRect().y,
            fechar: x.getBoundingClientRect().y,
          };
        });
        expect(antes.sobraMiolo, "o miolo precisa estourar para haver o que rolar").toBeGreaterThan(SLACK);
        expect(antes.sobraFigura, "a figura não pode ter sobra própria").toBeLessThanOrEqual(SLACK);

        // --- a ação ---
        const depois = await painel.evaluate((f) => {
          const b = f.querySelector(".viz-body") as HTMLElement;
          b.scrollTop = b.scrollHeight;
          const x = [...f.querySelectorAll("button")].find((n) => /Fechar/.test(n.textContent ?? ""))!;
          return {
            rolouMiolo: b.scrollTop,
            rolouFigura: f.scrollTop,
            head: f.querySelector(".viz-head")!.getBoundingClientRect().y,
            fechar: x.getBoundingClientRect().y,
          };
        });
        expect(depois.rolouMiolo, "quem rolou tem que ser o miolo").toBeGreaterThan(0);
        expect(depois.rolouFigura, "a figura não pode rolar").toBe(0);

        // --- as asserções que carregam o sentido ---
        expect(Math.abs(depois.head - antes.head), "o cabeçalho andou junto com o miolo").toBeLessThanOrEqual(2);
        expect(
          Math.abs(depois.fechar - antes.fechar),
          "o ✕ Fechar andou junto com o miolo"
        ).toBeLessThanOrEqual(2);
        await expect(fechar).toBeInViewport({ ratio: 1 });
      });

      test("o painel é um diálogo de verdade: foco, Tab preso, Esc e rolagem travada", async ({ page }) => {
        await abrirTopico(page);
        await muda(page).getByRole("button", { name: "⤢ Expandir" }).click();
        const overlay = page.locator(".viz-overlay-fit");
        await expect(overlay).toBeVisible();
        await expect(overlay).toHaveAttribute("role", "dialog");
        await expect(overlay).toHaveAttribute("aria-modal", "true");
        // o rótulo do diálogo é o título DESTA peça, não um genérico
        await expect(overlay).toHaveAttribute("aria-label", `Visualizador · ${MUDA}`);
        expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");

        const fugas: string[] = [];
        for (let i = 0; i < 14; i++) {
          await page.keyboard.press("Tab");
          const onde = await page.evaluate(() => {
            const a = document.activeElement;
            const f = document.querySelector(".viz-overlay-fit figure.viz-fit");
            return { dentro: !!(f && a && f.contains(a)), quem: a?.className || a?.tagName || "?" };
          });
          if (!onde.dentro) fugas.push(`volta ${i + 1}: ${onde.quem}`);
        }
        expect(fugas, "o foco vazou do painel").toEqual([]);

        await page.keyboard.press("Escape");
        await expect(page.locator(".viz-overlay-fit")).toHaveCount(0);
        expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe("hidden");
      });
    });
  });
});
