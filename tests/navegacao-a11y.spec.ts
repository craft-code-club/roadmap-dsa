import { test, expect, type Page } from "@playwright/test";
import { GROUPS } from "../content/roadmap";

// Acessibilidade da casca de navegação: link de pular, anel de foco, nome dos
// campos e dos landmarks, e a marca de progresso fora do link.
//
// Todo teste daqui INTERAGE. Contar elemento não prova nada neste repositório:
// já passou por suíte verde um visualizador sem botão nenhum e um painel de 0px.
// "O link de pular existe" é exatamente esse tipo de asserção — o que importa é
// se um Tab e um Enter levam o foco para dentro do `<main>`.

/** Tabula até o elemento pedido e devolve quantos Tabs custou. Falha alto se
 *  não chegar: laço que sai calado deixa a asserção seguinte medir outra coisa. */
async function tabularAte(page: Page, seletor: string, limite = 80) {
  for (let i = 1; i <= limite; i++) {
    await page.keyboard.press("Tab");
    const chegou = await page.evaluate(
      (s) => document.activeElement?.matches(s) ?? false,
      seletor
    );
    if (chegou) return i;
  }
  throw new Error(`o foco não alcançou ${seletor} em ${limite} tabulações`);
}

/** O foco está no `<main>` ou dentro dele? */
const focoNoConteudo = (page: Page) =>
  page.evaluate(() => {
    const main = document.querySelector("main");
    const alvo = document.activeElement;
    return !!main && !!alvo && (alvo === main || main.contains(alvo));
  });

test("um Tab e um Enter levam o foco para dentro do conteúdo", async ({ page }) => {
  // Antes do link de pular, o teclado atravessava a barra do topo e o menu
  // lateral inteiros: 44 paradas até o primeiro elemento do `<main>` em
  // /topico/dijkstra/, 40 em /topico/arrays/ e 29 na home, em TODA página
  // aberta. E 44 é piso, porque o menu não renderiza grupo fechado.
  for (const rota of ["/topico/dijkstra/", "/topico/arrays/", "/", "/roadmap/"]) {
    await page.goto(rota);

    // Fora da tela para quem usa mouse: o link é uma saída de teclado, não um
    // elemento de página.
    const escondido = await page
      .locator(".skip-link")
      .evaluate((e) => e.getBoundingClientRect().bottom < 0);
    expect(escondido, `o link de pular aparece sem foco em ${rota}`).toBe(true);

    const tabs = await tabularAte(page, ".skip-link");
    expect(tabs, `o link de pular não é a primeira parada em ${rota}`).toBe(1);
    await expect(page.locator(".skip-link")).toBeInViewport();

    await page.keyboard.press("Enter");
    await expect
      .poll(() => focoNoConteudo(page), { message: `o foco não entrou no <main> em ${rota}` })
      .toBe(true);

    // E o Tab seguinte continua DENTRO do conteúdo, em vez de voltar ao menu:
    // é isso que o `tabIndex={-1}` no `<main>` compra.
    await page.keyboard.press("Tab");
    expect(await focoNoConteudo(page), `o Tab depois do pulo saiu do <main> em ${rota}`).toBe(true);
  }
});

test("o anel de foco sobrevive nos campos de busca e de visualizador", async ({ page }) => {
  await page.goto("/topico/arrays/");

  // Chegando pelo teclado, como o aluno que não usa mouse chega.
  await tabularAte(page, ".side-search");
  const busca = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement as Element);
    return { estilo: s.outlineStyle, largura: s.outlineWidth };
  });
  // `outlineWidth` sozinho NÃO serve de prova: com `outline: none` o Chrome
  // devolve `3px` (a largura `medium` do padrão) e só o estilo vira `none`.
  // Medido nesta branch, antes da correção: `{ largura: "3px", estilo: "none" }`.
  expect(busca.estilo, "a busca da trilha ficou sem anel de foco").not.toBe("none");
  expect(parseFloat(busca.largura)).toBeGreaterThan(0);

  // Campo de visualizador: mesma regra, e é o campo de 41 páginas. Ele fica no
  // meio do artigo, longe demais para tabular desde o topo; campo de texto casa
  // `:focus-visible` em qualquer modalidade, então focar direto mede o mesmo.
  const campo = page.locator(".viz-input").first();
  await expect(campo).toBeVisible();
  const viz = await campo.evaluate((e) => {
    (e as HTMLElement).focus();
    const s = getComputedStyle(e);
    return { estilo: s.outlineStyle, largura: s.outlineWidth };
  });
  expect(viz.estilo, "o campo do visualizador ficou sem anel de foco").not.toBe("none");
  expect(parseFloat(viz.largura)).toBeGreaterThan(0);
});

test("a busca acha pelo que o aluno digita, e avisa quando não acha", async ({ page }) => {
  await page.goto("/topico/arrays/");
  const campo = page.getByLabel("Buscar tópico");

  // Nenhuma destas três palavras aparece em `name` nenhum: sem casar descrição,
  // a busca devolvia vazio e o aluno concluía que o guia não tem o assunto.
  await campo.fill("janela");
  await expect(page.locator('.side-item[href="/topico/sliding-window/"]')).toBeVisible();

  await campo.fill("ponteiro");
  await expect(page.locator('.side-item[href="/topico/listas-ligadas/"]')).toBeVisible();

  await campo.fill("memoização");
  await expect(page.locator('.side-item[href="/topico/programacao-dinamica/"]')).toBeVisible();

  // Sem acento acha com acento: quem digita rápido não põe til.
  await campo.fill("recursao");
  await expect(page.locator('.side-item[href="/topico/recursao/"]')).toBeVisible();

  // Nome do grupo traz a lista dele inteira.
  await campo.fill("manipulacao");
  await expect(page.locator('.side-item[href="/topico/operacoes-bitwise/"]')).toBeVisible();

  // Sem resultado, a mensagem — e não a coluna vazia, que não diz se o guia não
  // tem o assunto ou se o menu quebrou.
  await campo.fill("xilofone");
  await expect(page.locator(".side-vazio")).toContainText("Nenhum tópico");
  await expect(page.locator(".side-vazio")).toContainText("xilofone");
  await expect(page.locator(".side-scroll .side-item")).toHaveCount(0);

  // E o menu volta inteiro quando o campo esvazia.
  await campo.fill("");
  await expect(page.locator(".side-vazio")).toHaveCount(0);
  await expect(page.locator(".side-scroll .side-item").first()).toBeVisible();
});

test("a marca de progresso não mora dentro do link, e o progresso sobrevive à recarga", async ({
  page,
}) => {
  // Widget focável dentro de `<a>` é estado inválido pela ARIA (`nested-interactive`
  // do axe). Medido no build anterior: 7 em /topico/arrays/ e 48 em /roadmap/.
  const aninhados = 'a button, a input, a [role="checkbox"], a [tabindex="0"]';

  for (const rota of ["/topico/arrays/", "/roadmap/"]) {
    await page.goto(rota);
    await expect(page.locator(aninhados), `${rota} tem widget focável dentro de link`).toHaveCount(0);
  }

  // O progresso é dado que já está no navegador do aluno: a mudança é só de
  // estrutura do DOM, e marcar continua marcando depois do F5.
  await page.goto("/roadmap/");
  // Escopo no card: o menu lateral do /roadmap pode estar mostrando o mesmo
  // tópico (ele lembra o grupo aberto da visita anterior), e aí o mesmo nome
  // acessível casa duas vezes.
  const noCard = page
    .locator(".topic-card-wrap")
    .getByRole("checkbox", { name: "Marcar Two Pointers como concluído" });
  await expect(noCard).toHaveAttribute("aria-checked", "false");
  await noCard.click();
  await expect(noCard).toHaveAttribute("aria-checked", "true");
  await page.reload();
  await expect(
    page.locator(".topic-card-wrap").getByRole("checkbox", { name: "Marcar Two Pointers como concluído" })
  ).toHaveAttribute("aria-checked", "true");

  // O mesmo tópico, marcado no /roadmap, aparece marcado no menu lateral: é o
  // mesmo dado, e o card e a trilha continuam falando a mesma língua.
  await page.goto("/topico/two-pointers/");
  const noMenu = page
    .locator(".sidebar")
    .getByRole("checkbox", { name: "Marcar Two Pointers como concluído" });
  await expect(noMenu).toHaveAttribute("aria-checked", "true");

  // Pelo teclado, e sem navegar junto: a barra de espaço marca o ✓ e a rota
  // continua a mesma (o ✓ era filho do link, e o clique nele disputava com a
  // navegação).
  await noMenu.focus();
  await page.keyboard.press(" ");
  await expect(noMenu).toHaveAttribute("aria-checked", "false");
  await expect(page).toHaveURL(/topico\/two-pointers/);
  await page.reload();
  await expect(
    page.locator(".sidebar").getByRole("checkbox", { name: "Marcar Two Pointers como concluído" })
  ).toHaveAttribute("aria-checked", "false");
});

test("todo landmark de navegação tem nome próprio", async ({ page }) => {
  // Na home só existem os três da casca. Sem nome, o leitor de tela anuncia
  // "navegação" três vezes e o aluno não sabe qual é o menu de tópicos.
  await page.goto("/");
  await expect(page.getByRole("navigation")).toHaveCount(3);
  for (const nome of ["Principal", "Comunidade e apoio", "Trilha de estudos"]) {
    await expect(page.getByRole("navigation", { name: nome })).toHaveCount(1);
  }

  // A trilha é navegação, e não `aside` (landmark "complementar").
  await expect(page.locator("nav#menu-lateral.sidebar")).toHaveCount(1);
});

test("o botão do menu diz se o menu está aberto", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/topico/arrays/");

  const botao = page.getByRole("button", { name: "Menu de tópicos" });
  await expect(botao).toHaveAttribute("aria-expanded", "false");
  await expect(botao).toHaveAttribute("aria-controls", "menu-lateral");
  await expect(page.locator("#menu-lateral")).toBeHidden();

  await botao.click();
  await expect(botao).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#menu-lateral")).toBeVisible();

  await botao.click();
  await expect(botao).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#menu-lateral")).toBeHidden();
});

test("cada grupo do roadmap tem âncora própria, e ela para abaixo do cabeçalho", async ({
  page,
}) => {
  await page.goto("/roadmap/");
  for (const g of GROUPS) {
    await expect(page.locator(`section.rgroup[id="${g.id}"]`), `sem âncora para ${g.name}`).toHaveCount(1);
  }

  // Âncora que existe e para debaixo do cabeçalho fixo não serve de destino.
  await page.goto("/roadmap/#grafos");
  const alturaHeader = await page.evaluate(
    () => document.querySelector(".header")!.getBoundingClientRect().height
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => document.querySelector("#grafos .rgroup-head h2")!.getBoundingClientRect().top
      )
    )
    .toBeGreaterThanOrEqual(alturaHeader);
});
