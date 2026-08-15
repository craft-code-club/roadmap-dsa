import { test, expect } from "./fixtures/console-limpo";

// Guarda de celular. Rodam **só** no projeto `mobile` do `playwright.config.ts`
// (Pixel 7: 412x839, `isMobile`, `hasTouch`), selecionado pela tag `@mobile` no
// título de cada teste.
//
// POR QUE EXISTE
// A suíte era projeto único de desktop. Contadas as larguras usadas no
// repositório inteiro: 56x 1512, 34x 1440, 7x 1280, 3x 1500 e **4x 390**, e as
// quatro de 390 moram todas no mesmo arquivo. Ou seja: as 15 consultas
// `@media` do `globals.css`, mais o `pointer: coarse`, eram exercitadas por
// quatro asserções, num produto cujo público é majoritariamente celular.
//
// O Pixel 7 não é só uma viewport menor. `isMobile` liga a viewport visual do
// Chromium (o `<meta name=viewport>` passa a valer de verdade) e `hasTouch`
// liga `@media (pointer: coarse)`, que este repositório usa em
// `globals.css:1791`. `page.setViewportSize({width: 390})` não liga nenhum dos
// dois — é por isso que o projeto novo acha coisa que redimensionar não acha.
//
// O QUE ELES MEDEM, E POR QUE ESSAS TRÊS COISAS
// As três formas conhecidas de um layout quebrar no celular sem ninguém ver:
//
//   1. a PÁGINA estoura na horizontal (`scrollWidth > innerWidth`);
//   2. o RÓTULO estoura a própria caixa. `minmax(140px, 1fr)` impede o estouro
//      da página e não o do texto, então a medição (1) passa limpa enquanto o
//      texto sai pela borda do card. A comparação certa é `scrollWidth` contra
//      `clientWidth` **do elemento**;
//   3. o rótulo fica ILEGÍVEL sem estourar nada. Uma regra deste repositório já
//      deixou `.ms-seg` com `font-size: 0` em duas telas (o mapa da recursão do
//      merge sort e as faixas da invariante do quick sort, que compartilham a
//      classe). Caixa com texto de tamanho zero não estoura e não colapsa: as
//      medições (1) e (2) passam as duas, e o rótulo simplesmente não existe
//      para o aluno.

/** Uma página de cada tipo, mais as duas que a regra do `font-size` alcança. */
const ROTAS = [
  "/",
  "/fundamentos/",
  "/apoie/",
  "/topico/big-o/",
  "/topico/two-pointers/", // a página mais densa: 1176 folhas de texto
  "/topico/merge-sort/", // dona original da regra de `.ms-seg`
  "/topico/quick-sort/", // a outra dona da MESMA classe
  "/topico/binary-numbers/", // a fita de bits, que encolhe até 8px de propósito
];

/**
 * Piso de tamanho de fonte: **zero**. Não é um mínimo confortável, é o valor
 * comparado — a regra efetiva abaixo é `fs > PISO_FONTE`, ou seja `font-size >
 * 0`. Zero de propósito: o repositório tem tipografia legitimamente pequena (o
 * expoente do bit sai a 6.7px, o `.badge-soon` a 9px), e um piso generoso
 * viraria alarme falso. O que este guarda proíbe é a classe de defeito que já
 * aconteceu: texto renderizado com tamanho zero, invisível, sem estourar nada.
 */
const PISO_FONTE = 0;

/**
 * O único texto que pode ficar em `font-size: 0`, e o porquê.
 *
 * `globals.css:1894` esconde o rótulo de cada trecho no mapa da recursão do
 * merge sort abaixo de 560px, porque ali o trecho mais estreito tem 25px e o
 * texto sairia cortado. É decisão medida e comentada no CSS. A exceção é
 * escrita com o seletor completo (`.ms-niveis .ms-seg`, não `.ms-seg`) porque a
 * classe pertence a três visualizadores, e é exatamente essa diferença que o
 * teste seguinte cobra do quick sort.
 */
const PODE_SER_INVISIVEL = ".ms-niveis .ms-seg";

type Folha = { sel: string; texto: string; fs: number; scrollW: number; clientW: number };

/** Varre as folhas de texto visíveis e devolve o que interessa medir. */
async function folhasDeTexto(page: import("@playwright/test").Page, excecao: string) {
  return page.evaluate((selExcecao) => {
    const caminho = (el: Element) => {
      const partes: string[] = [];
      let n: Element | null = el;
      for (let i = 0; n && i < 4; i++) {
        const cls =
          typeof n.className === "string" && n.className.trim()
            ? "." + n.className.trim().split(/\s+/).slice(0, 3).join(".")
            : "";
        partes.unshift(n.tagName.toLowerCase() + cls);
        n = n.parentElement;
      }
      return partes.join(" > ");
    };
    const saida: Folha[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      if (el.children.length > 0) continue; // só folhas: o texto é dele mesmo
      const texto = (el.textContent ?? "").trim();
      if (!texto) continue;
      if (el.getClientRects().length === 0) continue; // não renderizado
      if (el.matches(selExcecao)) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      // `inline` não tem caixa própria confiável (`clientWidth` é 0), e
      // `auto`/`scroll` rolam de propósito: nos dois casos `scrollWidth` maior
      // que `clientWidth` não quer dizer defeito.
      const medivel = cs.display !== "inline" && !["auto", "scroll"].includes(cs.overflowX);
      saida.push({
        sel: caminho(el),
        texto: texto.slice(0, 40),
        fs: parseFloat(cs.fontSize),
        scrollW: medivel ? el.scrollWidth : 0,
        clientW: medivel ? el.clientWidth : 0,
      });
    }
    return saida;
  }, excecao);
}

for (const rota of ROTAS) {
  test(`@mobile ${rota} não estoura a largura da tela`, async ({ page }) => {
    await page.goto(rota);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const medida = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      innerWidth: window.innerWidth,
    }));

    // ⚠️ A comparação é contra `clientWidth`, e NÃO contra `window.innerWidth`,
    // que é a forma usada no resto do repositório (e no runbook). Com
    // `isMobile: true` a emulação do Chromium **alarga a viewport de layout**
    // quando o conteúdo estoura, e `innerWidth` acompanha o estouro: medido
    // aqui, com `.topic-layout { min-width: 900px }` plantado de propósito,
    // `scrollWidth` foi 901 e `innerWidth` foi 901 também — a asserção passava
    // com a página 489px mais larga que o aparelho. `clientWidth` é o bloco
    // recipiente inicial e fica nos 412 do Pixel 7, então a diferença aparece.
    // Quem copiar este arquivo para um projeto sem `isMobile` pode usar
    // `innerWidth`; aqui não dá.
    expect(
      medida.scrollWidth,
      `a página ${rota} rola na horizontal no celular (viewport de layout: ${medida.clientWidth}px)`
    ).toBeLessThanOrEqual(medida.clientWidth + 1);
  });

  test(`@mobile ${rota} não tem rótulo vazando da própria caixa`, async ({ page }) => {
    await page.goto(rota);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const vazando = (await folhasDeTexto(page, PODE_SER_INVISIVEL))
      .filter((f) => f.scrollW - f.clientW > 1)
      .map((f) => `${f.sel} — "${f.texto}" precisa de ${f.scrollW}px e tem ${f.clientW}px`);
    expect(
      vazando,
      `em ${rota}, texto saindo da borda do próprio elemento (a página inteira pode estar sem overflow e o card estourado mesmo assim)`
    ).toEqual([]);
  });

  test(`@mobile ${rota} não tem rótulo com texto invisível`, async ({ page }) => {
    await page.goto(rota);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const invisiveis = (await folhasDeTexto(page, PODE_SER_INVISIVEL))
      .filter((f) => f.fs <= PISO_FONTE)
      .map((f) => `${f.sel} — "${f.texto}" com font-size ${f.fs}px`);
    expect(
      invisiveis,
      `em ${rota}, texto renderizado com tamanho zero. Se for intencional, o seletor tem que entrar em PODE_SER_INVISIVEL com o motivo medido`
    ).toEqual([]);
  });
}

// A regra do `font-size: 0` nasceu para o merge sort e a classe pertence a
// três visualizadores. Este teste é a outra ponta: o quick sort usa `.ms-seg`
// fora de `.ms-niveis`, as faixas dele ocupam a linha quase inteira, e o rótulo
// **tem** que continuar legível. Sem ele, alguém tira o escopo `.ms-niveis` da
// regra do CSS, os três testes de cima passam (a exceção cobre `.ms-seg` de
// novo) e o quick sort perde os rótulos em silêncio.
test("@mobile as faixas da invariante do quick sort continuam legíveis", async ({ page }) => {
  await page.goto("/topico/quick-sort/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const faixas = page.locator(".ms-seg").filter({ hasNot: page.locator("*") });
  const total = await faixas.count();
  expect(total, "o quick sort perdeu as faixas .ms-seg").toBeGreaterThan(0);

  const medidas = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".ms-seg")]
      .filter((el) => !el.closest(".ms-niveis"))
      .map((el) => ({
        texto: (el.textContent ?? "").trim(),
        fs: parseFloat(getComputedStyle(el).fontSize),
        larguraDoTexto: el.scrollWidth,
        larguraDaCaixa: el.clientWidth,
      }))
  );
  expect(medidas.length, "nenhuma .ms-seg fora de .ms-niveis nesta página").toBeGreaterThan(0);

  const ilegiveis = medidas
    .filter((m) => m.fs < 9)
    .map((m) => `"${m.texto}" com font-size ${m.fs}px (o CSS promete 9px abaixo de 560)`);
  expect(
    ilegiveis,
    "regra escrita para o merge sort alcançou o quick sort: base compartilhada estendida sem escopo"
  ).toEqual([]);
});
