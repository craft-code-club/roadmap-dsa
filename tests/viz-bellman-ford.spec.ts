import { test, expect, type Page } from "@playwright/test";

// A casca adaptativa do BellmanFordVisualizer.
//
// Todo número aqui foi MEDIDO no build antes de virar asserção, e o que dá para
// escrever como invariante entre dois lugares da tela está escrito assim. O
// motivo é concreto: "são V-1 = 4 rodadas" é o que todo mundo sabe sobre
// Bellman-Ford, e nesta peça dois dos três presets param na rodada **2**, por
// early exit. Um teste com o 4 escrito na mão passaria verde ensinando errado.

const ARTIGO = "article figure.viz-fit";
const PAINEL = ".viz-overlay-fit figure.viz-fit";

/** Folga de subpixel, o mesmo valor que o hook usa para decidir. */
const SLACK = 8;

async function abrirTopico(page: Page) {
  await page.goto("/topico/bellman-ford/");
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
  const txt = [...document.querySelectorAll(`${raiz} .viz-step`)].map((e) => e.textContent).join(" ");
  const m = txt.match(/passo (\d+) de (\d+)/);
  if (!m) throw new Error(`o contador de passo nao casou: "${txt}"`);
  return { passo: parseInt(m[1], 10), total: parseInt(m[2], 10) };
};

test.describe("bellman-ford", () => {
  // ---------------------------------------------------------------- camada 1
  test.describe("camada 1", () => {
    test.use({ viewport: { width: 1440, height: 600 } });

    test("cabecalho e rodape ficam parados quando o miolo rola ate o fim", async ({ page }) => {
      expect(page.viewportSize()).toEqual({ width: 1440, height: 600 });
      await abrirTopico(page);

      // O preset do ciclo negativo é o que tem a nota mais longa (medido: 63px
      // contra 22 no mínimo), e o pico de altura dele é o ÚLTIMO passo — o da
      // rodada extra. É lá que o miolo tem o que rolar.
      await page.getByRole("button", { name: "Ciclo negativo (detecta)", exact: true }).click();
      await page.locator(ARTIGO).getByRole("button", { name: "⤢ Expandir" }).click();
      const painel = page.locator(PAINEL);
      await expect(painel).toBeVisible();

      const proximo = painel.getByRole("button", { name: "Próximo ›" });
      const { total } = await page.evaluate(passoAtual, PAINEL);
      for (let i = 1; i < total; i++) await proximo.click();
      await expect(painel.locator(".viz-step").last()).toHaveText(`passo ${total} de ${total}`);

      // PRÉ-CONDIÇÃO: sem sobra para rolar, o teste inteiro é decoração verde.
      const antes = await page.evaluate((sel) => {
        const f = document.querySelector(sel) as HTMLElement;
        const b = f.querySelector(".viz-body") as HTMLElement;
        // O click() do Playwright já rolou o contêiner para alcançar o botão.
        b.scrollTop = 0;
        return {
          sobra: b.scrollHeight - b.clientHeight,
          headTop: Math.round(f.querySelector(".viz-head")!.getBoundingClientRect().top - f.getBoundingClientRect().top),
          footBottom: Math.round(f.getBoundingClientRect().bottom - f.querySelector(".viz-foot")!.getBoundingClientRect().bottom),
        };
      }, PAINEL);
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
      // quebra que devolve a rolagem para a figura inteira.
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
      // fecha a linha do grid. Medido: 2px fechado contra 383px aberto.
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

      // O preset É a entrada da medição (`measureOn: [presetKey]`), e ele muda a
      // dica e a nota — que é onde a altura desta peça mora. Sem trocar um
      // estado que a medição enxerga, a escolha "sobrevive" sem nada ameaçá-la.
      const dicaAntes = await artigo.locator(".tt-legenda-arvore").textContent();
      await page.getByRole("button", { name: "Ciclo negativo (detecta)", exact: true }).click();
      await expect(artigo.locator(".tt-legenda-arvore")).not.toHaveText(dicaAntes!);

      await expect(artigo.locator(".viz-toggle-codigo")).toHaveText("Ocultar código");
      const m = await page.evaluate(LER, ARTIGO);
      expect(m.codigo, "a medicao desfez a escolha do aluno").toBe("on");
      // E a medição discordava mesmo: com o código aberto a peça passa do
      // orçamento desta janela. É por isso que o miolo rola no expandido.
      expect(m.figura, "a medicao nem queria recolher aqui").toBeGreaterThan(m.orcamento);
    });
  });

  // -------------------------------------------------- camada 3: tela alta
  test.describe("tela alta", () => {
    test.use({ viewport: { width: 1512, height: 1200 } });

    test("o codigo ja vem aberto quando cabe", async ({ page }) => {
      expect(page.viewportSize()).toEqual({ width: 1512, height: 1200 });
      await abrirTopico(page);

      const m = await page.evaluate(LER, ARTIGO);
      expect(m.codigo, "a medicao recolheu o codigo numa janela onde ele cabe").toBe("on");
      expect(m.alturaCodigo, "o bloco esta aberto mas sem altura").toBeGreaterThan(300);
      expect(m.figura, "a peca aberta nao cabia no orcamento desta janela").toBeLessThanOrEqual(m.orcamento);
      await expect(page.locator(`${ARTIGO} .viz-toggle-codigo`)).toHaveText("Ocultar código");
    });
  });

  // ----------------------------------------- camada 3: o que ela devolve
  test.describe("orcamento", () => {
    test.use({ viewport: { width: 1512, height: 900 } });

    test("recolher o codigo e o que faz a peca caber no artigo", async ({ page }) => {
      expect(page.viewportSize()).toEqual({ width: 1512, height: 900 });
      await abrirTopico(page);
      const artigo = page.locator(ARTIGO);

      const fechado = await page.evaluate(LER, ARTIGO);
      expect(fechado.codigo).toBe("off");
      expect(fechado.figura, "recolhida, a peca ainda passa do orcamento").toBeLessThanOrEqual(fechado.orcamento);

      await expect(artigo.locator(".viz-toggle-codigo")).toHaveText("Mostrar código");
      await artigo.locator(".viz-toggle-codigo").click();
      await expect(artigo.locator(".viz-toggle-codigo")).toHaveText("Ocultar código");
      // A transição da casca dura 0,32s: sem esperar o valor ESTABILIZAR, a
      // leitura pega a altura do meio do caminho.
      await expect
        .poll(async () => (await page.evaluate(LER, ARTIGO)).alturaCodigo)
        .toBeGreaterThan(300);

      const aberto = await page.evaluate(LER, ARTIGO);
      expect(aberto.figura, "abrir o codigo devia estourar o orcamento").toBeGreaterThan(aberto.orcamento);
      expect(aberto.figura - fechado.figura, "o bloco recolhivel devolve pouca altura").toBeGreaterThan(300);
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

      // A marcha desta peça é a dela (`initialSpeed: 4` sobre os SPEEDS
      // próprios). Já se perdeu num rename sem nenhum teste pegar.
      await expect(painel.locator(".viz-speed .val")).toHaveText("1.5x");

      // UMA ação por asserção: um par de ações inversas volta ao estado de
      // origem e fica verde mesmo com a tecla sendo roubada.
      const inicio = await page.evaluate(passoAtual, PAINEL);
      await painel.locator(".viz-speed input[type=range]").focus();
      await page.keyboard.press("ArrowRight");
      await expect(painel.locator(".viz-speed .val"), "a seta nao chegou ao slider").toHaveText("2x");
      expect((await page.evaluate(passoAtual, PAINEL)).passo, "a casca roubou a seta de quem edita").toBe(inicio.passo);

      // Fora do campo, a mesma tecla é da animação.
      await painel.locator(".viz-head-title").click();
      await page.keyboard.press("ArrowRight");
      await expect(painel.locator(".viz-step").last()).toHaveText(`passo ${inicio.passo + 1} de ${inicio.total}`);

      // Espaço roda e pausa, e o rótulo do botão diz qual dos dois.
      await page.keyboard.press(" ");
      await expect(painel.locator(".viz-play")).toHaveText("❚❚ Pausar");
      await page.keyboard.press(" ");
      await expect(painel.locator(".viz-play")).toHaveText("▶ Rodar");
    });
  });

  // ------------------------------------------------- o que a peca ENSINA
  test.describe("rodadas", () => {
    test.use({ viewport: { width: 1512, height: 900 } });

    test("a tabela de rodadas bate com o contador de rodada, e o early exit aparece", async ({ page }) => {
      expect(page.viewportSize()).toEqual({ width: 1512, height: 900 });
      await abrirTopico(page);
      const artigo = page.locator(ARTIGO);
      const proximo = artigo.getByRole("button", { name: "Próximo ›" });

      const { total } = await page.evaluate(passoAtual, ARTIGO);
      let fins = 0;
      let ultimaRodadaFechada = 0;

      for (let i = 1; i <= total; i++) {
        const tela = await page.evaluate((sel) => {
          const f = document.querySelector(sel) as HTMLElement;
          const cab = [...f.querySelectorAll(".viz-step")].map((e) => e.textContent).join(" ");
          return {
            nota: f.querySelector(".viz-note")!.textContent!,
            rodadaCab: parseInt(cab.match(/rodada (\d+)/)![1], 10),
            varRodada: f.querySelector(".viz-var .viz-var-val")!.textContent!,
            linhas: [...f.querySelectorAll(".bf-tab tbody tr > th")].map((e) => e.textContent!),
          };
        }, ARTIGO);

        // O painel de variáveis e o cabeçalho contam a MESMA rodada. Invariante
        // entre dois lugares da tela, sem nenhum número escrito na mão.
        expect(tela.varRodada, `passo ${i}: cabecalho e painel discordam da rodada`).toMatch(
          new RegExp(`^${tela.rodadaCab} de `)
        );

        const fim = tela.nota.match(/^Fim da rodada (\d+)/);
        if (fim) {
          fins++;
          const n = parseInt(fim[1], 10);
          expect(tela.rodadaCab, `passo ${i}: a nota fecha a rodada ${n} e o cabecalho diz outra`).toBe(n);
          // A tabela guarda o histórico: uma linha "início", uma por rodada
          // fechada, e a linha "agora". A última numerada é a rodada da nota.
          const numeradas = tela.linhas.filter((t) => /^\d+$/.test(t));
          expect(numeradas.at(-1), `passo ${i}: a ultima linha da tabela nao e a rodada ${n}`).toBe(String(n));
          expect(numeradas.length, `passo ${i}: a tabela tem linha demais ou de menos`).toBe(n);
          expect(tela.linhas[0]).toBe("início");
          expect(tela.linhas.at(-1)).toBe("agora");
          ultimaRodadaFechada = n;
        }

        if (i < total) await proximo.click();
      }

      // O último passo é sempre a rodada extra, e ela é a razão de o algoritmo
      // existir.
      await expect(artigo.locator(".viz-note")).toContainText("RODADA EXTRA");

      // E aqui está o número que eu ia escrever errado: o preset padrão promete
      // V-1 rodadas no painel ("N de 4") e para na 2, por early exit. Os dois
      // números saem da TELA, não da minha cabeça.
      const prometidas = await page.evaluate((sel) => {
        const t = document.querySelector(`${sel} .viz-var .viz-var-val`)!.textContent!;
        return parseInt(t.match(/de (\d+)/)![1], 10);
      }, ARTIGO);
      expect(fins, "nenhuma rodada fechou").toBeGreaterThan(0);
      expect(
        ultimaRodadaFechada,
        "o early exit sumiu: este preset passou a rodar as V-1 rodadas inteiras"
      ).toBeLessThan(prometidas);
      await expect(artigo.locator(".bf-tab tbody tr > th").nth(ultimaRodadaFechada)).toHaveText(
        String(ultimaRodadaFechada)
      );
    });
  });
});
