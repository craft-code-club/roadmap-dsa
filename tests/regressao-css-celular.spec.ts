import { test, expect, type Page, type Locator } from "@playwright/test";

// Dois defeitos de CSS que uma suíte verde deixou passar, pelo mesmo motivo: as
// verificações mediam OVERFLOW DA PÁGINA, e nenhum dos dois estoura a página.
//
//  1. `.ms-seg` cortava o rótulo no meio da palavra (`white-space: nowrap` mais
//     `overflow: hidden`, sem `text-overflow`). Caixa com `overflow` escondido
//     não estoura nada: o único número que pega o corte é a largura REAL do
//     texto, medida com um `Range` sobre o conteúdo, contra a largura útil do
//     elemento.
//  2. A gaveta do celular media `100vh` — a viewport GRANDE, de barra do
//     navegador recolhida — e o card de apoio mora FORA da área rolável, então
//     ele podia ficar sem caminho nenhum: não "mais embaixo", inalcançável.
//
// Todas as asserções daqui comparam número com número e carregam o rótulo
// junto. E a checagem de `font-size` computado está aqui porque o contrário do
// defeito é o mesmo defeito: rótulo com fonte zerada também faz toda medição de
// largura passar, e já deixou texto invisível neste repositório.

const REGUAS = [
  { w: 390, h: 844, nome: "390x844" },
  { w: 1440, h: 700, nome: "1440x700" },
  { w: 1512, h: 900, nome: "1512x900" },
] as const;

type Medida = { rotulo: string; precisa: number; recebe: number; linhas: number; fonte: string };

/** A largura de cada linha do texto contra a largura útil da caixa.
 *
 *  `getClientRects()` de um `Range` devolve um retângulo por linha, então o
 *  máximo é a linha mais larga — é assim que a medição continua valendo depois
 *  que o rótulo passou a quebrar linha. `clientWidth` já desconta a borda, mas
 *  não o padding: sem descontar, um rótulo encostado nos dois lados passaria.
 *
 *  Sem argumento mede a página inteira; com um elemento (que é o que o
 *  `locator.evaluate` passa) mede só o que está dentro dele. */
function medir(raiz?: Element): Medida[] {
  const dono: Element | Document = raiz ?? document;
  return [...dono.querySelectorAll(".ms-seg")].map((el) => {
    const faixa = document.createRange();
    faixa.selectNodeContents(el);
    const linhas = [...faixa.getClientRects()];
    const cs = getComputedStyle(el);
    const padding = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    return {
      rotulo: (el.textContent ?? "").trim(),
      precisa: Math.round((linhas.length ? Math.max(...linhas.map((l) => l.width)) : 0) * 10) / 10,
      recebe: Math.round((el.clientWidth - padding) * 10) / 10,
      linhas: linhas.length,
      fonte: cs.fontSize,
    };
  });
}

const cortadas = (m: Medida[]) => m.filter((x) => x.precisa - x.recebe > 0.5);

async function abrir(page: Page, url: string, w: number, h: number) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto(url);
  expect(page.viewportSize(), "a janela pedida é a janela medida").toEqual({ width: w, height: h });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

/** Troca de preset esperando o re-render, e não o tick seguinte ao clique:
 *  medir no mesmo tick lê o preset anterior e a asserção vira decoração. */
async function trocarPreset(fig: Locator, i: number): Promise<string> {
  const chip = fig.locator(".bigo-chip").nth(i);
  const rotulo = (await chip.innerText()).trim();
  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  return rotulo;
}

// ---------------------------------------------------------------------------
// Defeito 1 — o rótulo das faixas cabe na faixa
// ---------------------------------------------------------------------------

test.describe("faixas: o rótulo cabe no trecho", () => {
  for (const r of REGUAS) {
    test(`quick sort, os dois painéis de três vias, todos os presets (${r.nome})`, async ({ page }) => {
      await abrir(page, "/topico/quick-sort/", r.w, r.h);
      const fig = page.locator("figure.viz").filter({ hasText: "o que fazer com os iguais ao pivô" });
      await expect(fig).toHaveCount(1);

      const chips = fig.locator(".bigo-chip");
      expect(await chips.count(), "os quatro presets do comparador").toBe(4);
      // Os DOIS painéis de uma vez: eles usam a mesma classe e o corte apareceu
      // nos dois, então medir um só mediria metade do defeito.
      expect(await fig.locator(".ms-op").count(), "duas vias e três vias, lado a lado").toBe(2);

      for (let i = 0; i < 4; i++) {
        const preset = await trocarPreset(fig, i);
        const medidas = await fig.evaluate(medir);
        expect(medidas.length, `${preset}: há trechos para medir`).toBeGreaterThan(1);
        expect(
          cortadas(medidas),
          `${r.nome}, preset ${JSON.stringify(preset)}: rótulo cortado (precisa x recebe, em px)`
        ).toEqual([]);
      }
    });

    test(`quick sort, a invariante da partição, passo a passo (${r.nome})`, async ({ page }) => {
      test.slow();
      await abrir(page, "/topico/quick-sort/", r.w, r.h);
      // Escopado por QUAL figura, e nunca por QUANTAS têm a casca. Contar
      // `figure.viz-fit` era afirmar o cronograma da migração: a peça alvo era a
      // única adaptada em `/topico/quick-sort/` quando isto foi escrito, e a
      // asserção passou a reprovar no dia em que a peça do pivô ganhou a mesma
      // casca — sem que nada do que este teste mede tivesse mudado. O título é
      // identidade; a contagem é data.
      //
      // E os dois modos de errar não custam o mesmo: título trocado reprova alto
      // no `toHaveCount(1)`, contagem trocada mede a peça errada em silêncio.
      const fig = page
        .locator("figure.viz-fit")
        .filter({ hasText: "a partição e o pivô que fica pronto" });
      await expect(fig, "a peça da partição tem que ser única em /topico/quick-sort/").toHaveCount(1);

      const chips = fig.locator(".bigo-chip");
      expect(await chips.count(), "os quatro presets da partição").toBe(4);
      // A faixa é o objeto do teste. Sem esta linha, apontar para a figura
      // errada faria `medir` devolver zero trechos e a comparação com `[]`
      // passaria em silêncio — verde provando nada.
      expect(await fig.locator(".ms-nivel-faixa").count(), "a faixa da invariante").toBe(1);

      for (let i = 0; i < 4; i++) {
        const preset = await trocarPreset(fig, i);
        const contador = fig.locator(".viz-step");
        const passos = Number((await contador.innerText()).match(/de (\d+)/)![1]);
        expect(passos, `${preset}: a linha do tempo tem passos`).toBeGreaterThan(1);

        const proximo = fig.getByRole("button", { name: /Próximo/ });
        for (let s = 1; s <= passos; s++) {
          await expect(contador).toHaveText(new RegExp(`passo ${s} de ${passos}`));
          const medidas = await fig.evaluate(medir);
          expect(
            medidas.length,
            `${preset}, passo ${s}: há trecho para medir`
          ).toBeGreaterThan(0);
          expect(
            cortadas(medidas),
            `${r.nome}, preset ${JSON.stringify(preset)}, passo ${s} de ${passos}: rótulo cortado`
          ).toEqual([]);
          if (s < passos) await proximo.click();
        }
        // Sem isto o laço pode sair calado no meio, e as asserções acima teriam
        // rodado num punhado de passos do começo.
        await expect(proximo).toBeDisabled();
      }
    });

    test(`merge sort, os quatro tamanhos, e a faixa continua de uma linha (${r.nome})`, async ({ page }) => {
      await abrir(page, "/topico/merge-sort/", r.w, r.h);
      // A varredura aqui é pelo TAMANHO da entrada, e não pelo passo: os
      // rótulos do merge sort (`0`, `10..15`) não mudam ao longo da animação —
      // o que muda é a cor. O tamanho é que muda a largura de cada trecho.
      const niveis = page.locator("figure.viz").filter({ hasText: "o n log n desenhado" });
      await expect(niveis).toHaveCount(1);
      expect(await niveis.locator(".bigo-chip").count(), "os quatro tamanhos de entrada").toBe(4);

      for (let i = 0; i < 4; i++) {
        const tamanho = await trocarPreset(niveis, i);
        // A página inteira: as duas peças de merge sort dividem a classe.
        const medidas = await page.locator("body").evaluate(medir);
        expect(cortadas(medidas), `${r.nome}, ${tamanho}: rótulo cortado no mapa da recursão`).toEqual([]);

        // O mapa da recursão tem que continuar com UMA linha por trecho. Se ele
        // passar a quebrar, a peça dobra de altura sem ninguém ter pedido.
        expect(
          medidas.filter((x) => x.linhas > 1),
          `${r.nome}, ${tamanho}: trecho quebrou linha`
        ).toEqual([]);
      }
    });
  }

  test("o rótulo continua legível: font-size computado nos dois donos da classe", async ({ page }) => {
    // A regra `.ms-niveis .ms-seg { font-size: 0 }` no celular é DELIBERADA e
    // escopada: ela vale para o mapa da recursão do merge sort, onde o trecho
    // mais estreito tem 13px, e NÃO para as faixas do quick sort, que ocupam a
    // linha quase inteira. Este teste guarda os dois lados — o que some de
    // propósito e o que precisa continuar aparecendo.
    const fonte = (sel: string) =>
      page.evaluate((s) => {
        const el = document.querySelector(s);
        if (!el) throw new Error(`sem elemento para ${s}`);
        return getComputedStyle(el).fontSize;
      }, sel);

    await abrir(page, "/topico/merge-sort/", 390, 844);
    expect(await fonte(".ms-niveis .ms-seg"), "celular: o mapa da recursão esconde o rótulo, de propósito").toBe("0px");

    // ...e escondê-lo não pode colapsar o desenho. O número não é digitado: sai
    // do próprio `min-height` computado, então ele sobrevive a mudança de CSS
    // sem deixar de testar o que importa.
    const desenho = await page.evaluate(() => {
      const seg = document.querySelector(".ms-niveis .ms-seg")!;
      const faixa = seg.closest(".ms-nivel-faixa")!;
      return {
        faixa: Math.round(faixa.getBoundingClientRect().height),
        minima: parseFloat(getComputedStyle(seg).minHeight),
      };
    });
    expect(desenho.faixa, "a faixa continua desenhada mesmo com o rótulo escondido").toBe(desenho.minima);

    await abrir(page, "/topico/quick-sort/", 390, 844);
    expect(
      await fonte("figure.viz-fit .ms-nivel-faixa .ms-seg"),
      "celular: a invariante do quick sort continua legível"
    ).toBe("9px");

    await abrir(page, "/topico/merge-sort/", 1440, 700);
    expect(await fonte(".ms-niveis .ms-seg"), "fora do celular o rótulo do merge sort volta").toBe("10px");
  });
});

// ---------------------------------------------------------------------------
// Defeito 2 — a gaveta do celular e o card que ficava sem caminho
// ---------------------------------------------------------------------------

/** Clica num botão pelo rótulo acessível, e **diz o que houve** quando ele não
 *  existe.
 *
 *  Por que não é `getByRole(...).click()` direto: quando o rótulo procurado não
 *  existe em lugar nenhum, o Playwright reprova com `Test timeout of 30000ms
 *  exceeded` — exatamente o mesmo texto de página que não carregou, de servidor
 *  fora do ar, de elemento coberto por outro e de animação que nunca termina. O
 *  relatório não distingue "o botão sumiu" de "a máquina está lenta", e a única
 *  informação que resolveria o caso — quais rótulos EXISTEM — não aparece em
 *  lugar nenhum.
 *
 *  Não é hipótese: `"Abrir menu de tópicos"` era procurado aqui e só existia
 *  neste arquivo. O botão real nasceu `aria-label="Menu de tópicos"` no
 *  `Shell.tsx`, e a renomeação passou por revisão sem que ninguém ligasse uma
 *  coisa à outra, porque o que o CI mostrava eram quatro timeouts.
 *
 *  O guarda troca 30s de espera muda por 5s e uma mensagem que já traz a
 *  resposta. Continua sendo espera de verdade (o botão do cabeçalho depende de
 *  hidratação), só que com teto curto e desfecho falante. */
async function clicarBotao(page: Page, nome: string) {
  const alvo = page.getByRole("button", { name: nome, exact: true });
  try {
    await alvo.waitFor({ state: "visible", timeout: 5_000 });
  } catch {
    const presentes = await page
      .getByRole("button")
      .evaluateAll((bs) =>
        bs.map((b) => (b.getAttribute("aria-label") ?? b.textContent ?? "").trim()).filter(Boolean)
      );
    throw new Error(
      `nenhum botão visível com o rótulo acessível ${JSON.stringify(nome)}. ` +
        `Se ele foi renomeado, o nome novo está nesta lista: ${JSON.stringify(presentes)}`
    );
  }
  await alvo.click();
}

async function abrirGaveta(page: Page, w: number, h: number) {
  await abrir(page, "/topico/quick-sort/", w, h);
  // `aria-label="Menu de tópicos"`, em `src/components/Shell.tsx`. O texto de
  // antes (`"Abrir menu de tópicos"`) não existia no produto: ele só existia
  // aqui, e o `clicarBotao` acima é o que faz esse tipo de descolamento se
  // anunciar em vez de virar timeout.
  await clicarBotao(page, "Menu de tópicos");
  await expect(page.locator(".sidebar.open")).toBeVisible();
}

/** Rola tudo o que a gaveta oferece para rolar. Se depois disto o card ainda
 *  estiver fora da janela, ele é inalcançável — não é "fica mais embaixo". */
async function rolarTudo(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>(".sidebar.open, .sidebar.open .side-scroll").forEach((e) => {
      e.scrollTop = e.scrollHeight;
    });
  });
  await page.waitForTimeout(100);
}

test.describe("gaveta do celular: o card de apoio é alcançável", () => {
  for (const [w, h, porque] of [
    [390, 844, "o celular em pé"],
    [844, 390, "o celular deitado"],
    // As duas últimas não são celulares: são a GEOMETRIA do caso em que
    // cabeçalho mais apoio passam da altura da gaveta. Antes do conserto o card
    // terminava 35px e 111px abaixo da janela, com 47 e 123px de sobra que
    // ninguém conseguia rolar, porque o `.side-apoio` mora fora do
    // `.side-scroll` e a gaveta não rolava.
    [844, 300, "a gaveta apertada, onde o conteúdo passa da altura"],
    [390, 260, "a gaveta muito apertada"],
  ] as const) {
    test(`${w}x${h}: ${porque}`, async ({ page }) => {
      await abrirGaveta(page, w, h);
      await rolarTudo(page);
      const g = await page.evaluate(() => {
        const gaveta = document.querySelector(".sidebar.open")!;
        const card = document.querySelector(".side-apoio")!.lastElementChild!;
        return {
          rotulo: (card.textContent ?? "").trim().slice(0, 18),
          topo: Math.round(card.getBoundingClientRect().top),
          base: Math.round(card.getBoundingClientRect().bottom),
          janela: window.innerHeight,
          gavetaBase: Math.round(gaveta.getBoundingClientRect().bottom),
        };
      });

      expect(g.rotulo, "é o card de apoio que está sendo medido").toContain("Seja um apoiador");
      expect(
        g.base - g.janela,
        `${JSON.stringify(g.rotulo)} terminou em ${g.base}px numa janela de ${g.janela}px, depois de rolar tudo`
      ).toBeLessThanOrEqual(0);
      expect(g.topo, `o card começou em ${g.topo}px, acima do topo da janela`).toBeGreaterThanOrEqual(0);
      // A gaveta termina onde a janela termina: é o que o `dvh` garante no
      // celular de verdade, onde `100vh` é a viewport de barra recolhida.
      expect(
        g.gavetaBase - g.janela,
        `a gaveta terminou em ${g.gavetaBase}px numa janela de ${g.janela}px`
      ).toBeLessThanOrEqual(0);
    });
  }

  test("a gaveta declara o fallback de viewport dinâmica", async ({ page }) => {
    // Asserção de FOLHA DE ESTILO, e está aqui declarada como tal: em Chromium
    // headless não existe barra de navegador dinâmica, então
    // `100vh === 100dvh === innerHeight` e nenhuma medição de tela distingue as
    // duas. O que dá para afirmar é que a regra da gaveta continua com as duas
    // declarações — `vh` como fallback, `dvh` por cima —, que é o mesmo idioma
    // que o expandido do visualizador já usa neste arquivo, e com a rolagem de
    // último recurso que torna o card alcançável.
    // A leitura é do ARQUIVO servido, não do CSSOM: `cssText` devolve uma
    // declaração por propriedade e descarta a que foi sobrescrita, então ele
    // mostra só o `dvh` e some justamente com o fallback que se quer garantir.
    // Medido: o CSSOM devolve `height: calc(100dvh …)` sozinho enquanto o
    // arquivo tem as duas linhas.
    // E a leitura é só das folhas do PRÓPRIO app. A página também linka o CSS
    // do Google Fonts (`src/app/layout.tsx`), que não tem uma linha da gaveta:
    // baixá-lo poria a rede externa dentro de uma asserção sobre CSS local, e o
    // dia em que ela caísse o teste reprovaria com um erro de `fetch` no lugar
    // do que ele mede. Medido nesta página: 2 folhas, e só a de mesma origem
    // (108.190 bytes) tem a regra — a do Google Fonts são 1.639 bytes com zero
    // ocorrência de `sidebar`.
    await abrir(page, "/topico/quick-sort/", 390, 844);
    const folha = await page.evaluate(async () => {
      const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
        .map((l) => new URL(l.href, location.href))
        .filter((u) => u.origin === location.origin)
        .map((u) => u.href);
      const partes = await Promise.all(links.map((h) => fetch(h).then((r) => r.text())));
      return { folhas: partes.length, css: partes.join("\n") };
    });

    // Sem isto, um filtro que não casasse nada faria a asserção seguinte culpar
    // o CSS por um problema que é do filtro.
    expect(folha.folhas, "há folha de estilo do próprio app para ler").toBeGreaterThan(0);

    const regra = folha.css.match(/\.sidebar\.open\s*\{[^}]*\}/)?.[0];
    expect(regra, "a regra da gaveta aberta chegou ao arquivo servido").toBeTruthy();
    expect(regra, "a altura da gaveta usa a viewport dinâmica").toContain("100dvh");
    expect(regra, "e mantém o fallback de quem não entende dvh").toContain("100vh");
    expect(regra, "e a gaveta rola quando o conteúdo não cabe").toMatch(/overflow-y:\s*auto/);
  });
});
