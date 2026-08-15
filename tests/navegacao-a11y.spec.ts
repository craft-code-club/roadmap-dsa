import { test, expect, type Page } from "@playwright/test";
import { ALL_TOPICS, GROUPS } from "../content/roadmap";

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
  expect(busca.estilo, "a busca do roadmap ficou sem anel de foco").not.toBe("none");
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

  // E o menu volta inteiro quando o campo esvazia: os 47 tópicos de volta ao
  // DOM, com o grupo da página aberto. (O primeiro `.side-item` da lista é o do
  // grupo de cima, que está fechado — daí a asserção ser sobre o item da rota.)
  await campo.fill("");
  await expect(page.locator(".side-vazio")).toHaveCount(0);
  await expect(page.locator('.sidebar a[href^="/topico/"]')).toHaveCount(ALL_TOPICS.length);
  await expect(page.locator('.side-item[href="/topico/arrays/"]')).toBeVisible();
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
  // mesmo dado, e o card e o roadmap continuam falando a mesma língua.
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

// As TRÊS listas com marca de progresso são a mesma ideia repetida, e o teclado
// só aprende o padrão se elas concordarem. O card do /roadmap era a única em que
// a marca vinha DEPOIS do link: quem tabulava chegava ao card, entrava no
// tópico, e só encontrava o "marcar como concluído" na volta. Como o ✓ é
// `position: absolute` no canto superior direito, a ordem do DOM era também a
// única coisa que dizia onde ele está — e ela dizia "no fim".
//
// O teste olha as três de uma vez porque a próxima lista com ✓ vai nascer
// copiando uma delas, e copiando a errada se ninguém comparar.
test("a marca de progresso vem antes do link nas três listas", async ({ page }) => {
  const ordemEm = (seletor: string) =>
    page.evaluate((sel) => {
      const cont = document.querySelector(sel);
      if (!cont) return ["SEM CONTAINER"];
      return Array.from(cont.querySelectorAll("a,button")).map((e) => e.tagName);
    }, seletor);

  await page.goto("/roadmap/");
  expect(await ordemEm(".topic-card-wrap"), "card do /roadmap").toEqual(["BUTTON", "A"]);

  await page.goto("/topico/two-pointers/");
  // No roadmap, o par é `button` + `a` dentro do item; o primeiro focável tem que
  // ser o checkbox.
  const naTrilha = await page.evaluate(() => {
    const btn = document.querySelector('.sidebar [role="checkbox"]')!;
    const link = btn.parentElement!.querySelector("a")!;
    // `compareDocumentPosition` responde a pergunta certa: quem vem antes no DOM.
    return (btn.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  });
  expect(naTrilha, "no roadmap lateral a marca tem que vir antes do link").toBe(true);

  const naListaDeProblemas = await page.evaluate(() => {
    const btn = document.querySelector('.problem-row [role="checkbox"], .problem-row button');
    if (!btn) return "SEM LISTA DE PROBLEMAS";
    const link = btn.closest("li,div")!.querySelector("a")!;
    return (btn.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  });
  expect(naListaDeProblemas, "na lista de problemas a marca tem que vir antes do link").toBe(true);
});

test("todo landmark de navegação tem nome próprio", async ({ page }) => {
  // Na home só existem os três da casca. Sem nome, o leitor de tela anuncia
  // "navegação" três vezes e o aluno não sabe qual é o menu de tópicos.
  await page.goto("/");
  await expect(page.getByRole("navigation")).toHaveCount(3);
  for (const nome of ["Principal", "Comunidade e apoio", "Roadmap de estudos"]) {
    await expect(page.getByRole("navigation", { name: nome })).toHaveCount(1);
  }

  // O roadmap é navegação, e não `aside` (landmark "complementar").
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

test("o menu leva os 47 tópicos em toda página, com o grupo fechado ou aberto", async ({ page }) => {
  // Antes, o menu era `{g.aberto && ...}`: os itens do grupo fechado não
  // existiam no DOM. Medido no build, nas 47 páginas de tópico: MÍNIMO 1 link
  // (programacao-dinamica, backtracking, big-o, greedy, matematica, hash-table),
  // mediana 5, máximo 9, e 24 páginas com 5 ou menos. O menu é a única lista de
  // tópicos que a página carrega.
  const total = ALL_TOPICS.length;

  for (const rota of ["/topico/matematica/", "/topico/big-o/", "/", "/roadmap/"]) {
    await page.goto(rota);
    await expect(page.locator('.sidebar a[href^="/topico/"]'), rota).toHaveCount(total);
  }

  // E continua sendo uma lista COM grupos fechados: o visual não mudou.
  await page.goto("/topico/big-o/");
  const ocultos = page.locator(".side-items[hidden]");
  expect(await ocultos.count()).toBeGreaterThan(0);
  await expect(page.locator('.sidebar a[href="/topico/dijkstra/"]')).toBeHidden();
  await expect(page.locator('.sidebar a[href="/topico/big-o/"]')).toBeVisible();
});

test("o item do grupo fechado não é pintado nem alcançado pelo teclado", async ({ page }) => {
  // As duas armadilhas do `hidden`: uma regra de `display` no seletor do item
  // derruba o atributo (e aí o menu "fechado" aparece aberto), e item oculto que
  // continua focável transforma o conserto do rastreador em regressão do link de
  // pular que este PR acabou de entregar.
  for (const [w, h] of [
    [1512, 900],
    [1440, 700],
    [390, 844],
  ]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/topico/big-o/");
    if (w < 1000) await page.locator(".header-menu-toggle").click();
    await expect(page.locator(".sidebar")).toBeVisible();

    const medida = await page.evaluate(() => {
      const oculto = document.querySelector<HTMLElement>(".side-items[hidden]")!;
      const link = oculto.querySelector<HTMLElement>(".side-item")!;
      link.focus();
      const r = oculto.getBoundingClientRect();
      return {
        display: getComputedStyle(oculto).display,
        altura: r.height,
        largura: r.width,
        recebeuFoco: document.activeElement === link,
      };
    });
    expect(medida.display, `${w}x${h}: o CSS sobrepôs o atributo hidden`).toBe("none");
    expect(medida.altura, `${w}x${h}: o grupo fechado ainda ocupa altura`).toBe(0);
    expect(medida.largura).toBe(0);
    expect(medida.recebeuFoco, `${w}x${h}: item oculto recebeu foco`).toBe(false);
  }

  // A prova de comportamento: tabulando desde o começo, o foco nunca cai dentro
  // de um grupo fechado, e sair do menu inteiro continua custando o que custava.
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto("/topico/big-o/");
  const visitados: string[] = [];
  for (let i = 0; i < 45; i++) {
    await page.keyboard.press("Tab");
    const onde = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return "corpo";
      return a.closest(".side-items[hidden]") ? "OCULTO" : a.closest("main") ? "conteudo" : "casca";
    });
    visitados.push(onde);
    if (onde === "conteudo") break;
  }
  expect(visitados.filter((v) => v === "OCULTO"), "o teclado entrou num grupo fechado").toEqual([]);
  expect(visitados.at(-1), "o foco não chegou ao conteúdo em 45 tabulações").toBe("conteudo");
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
