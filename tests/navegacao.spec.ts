import { test, expect } from "@playwright/test";

test("home mostra o hero e leva para o Big O", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("aprofundamento em cada estrutura");
  await page.getByRole("link", { name: "Começar por Big O" }).click();
  await expect(page).toHaveURL(/topico\/big-o/);
  await expect(page.getByRole("heading", { level: 1, name: /Big O/ })).toBeVisible();
});

test("nav do topo abre o roadmap e um tópico", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Roadmap", exact: true }).click();
  await expect(page).toHaveURL(/\/roadmap/);
  await expect(page.getByRole("heading", { name: "Do zero à entrevista" })).toBeVisible();
  await page.getByRole("link", { name: /Two Pointers/ }).first().click();
  await expect(page).toHaveURL(/topico\/two-pointers/);
});

test("página de tópico traz vídeo e problemas com links externos certos", async ({ page }) => {
  await page.goto("/topico/sliding-window/");
  await expect(page.locator("iframe")).toHaveCount(1);
  const problema = page.getByRole("link", { name: /Maximum Average Subarray I/ }).first();
  await expect(problema).toHaveAttribute("href", /leetcode\.com/);
});

test("CTAs de Discord e Apoiar apontam para os lugares certos", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Discord" }).first()).toHaveAttribute("href", /discord\.gg\//);
  await expect(page.getByRole("link", { name: "Apoiar", exact: true }).first()).toHaveAttribute("href", /\/apoie/);
});

test("no mobile, YouTube e Craft & Code Club ficam acessíveis pelo menu ⋯", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Mais opções" }).click();
  const menu = page.locator(".nav-menu");
  await expect(menu.getByRole("link", { name: /YouTube/ })).toBeVisible();
  await expect(menu.getByRole("link", { name: /Craft & Code Club/ })).toBeVisible();
});

test("tópico mostra Referências (links de artigos) quando existem", async ({ page }) => {
  await page.goto("/topico/two-pointers/");
  await expect(page.getByRole("heading", { name: "Referências" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Floyd.s Cycle Finding Algorithm/ })).toHaveAttribute("href", /geeksforgeeks/);
});

test("página de apoio mostra apoiadores, parceiros e o link de doação", async ({ page }) => {
  await page.goto("/apoie/");
  await expect(page.getByRole("heading", { name: "Seja um apoiador da Comunidade" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Apoiadores" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Parceiros" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Quero apoiar/ }).first()).toHaveAttribute("href", /apoia\.se\/craftcodeclub/);
});

test("Two Pointers é uma página completa com os três visualizadores e problemas", async ({ page }) => {
  await page.goto("/topico/two-pointers/");
  // um visualizador por sabor da técnica: convergente, ritmos diferentes e Floyd
  await expect(page.getByRole("button", { name: /Rodar/ })).toHaveCount(3);
  await expect(page.getByText("ponteiros convergentes: dois números que somam o alvo")).toBeVisible();
  await expect(page.getByText("palíndromo com ponteiros em ritmos diferentes")).toBeVisible();
  await expect(page.getByText("existe ciclo na lista ligada?")).toBeVisible();
  await expect(page.getByRole("link", { name: /Two Sum II/ }).first()).toHaveAttribute("href", /leetcode\.com/);
  await expect(page.getByRole("link", { name: /Linked List Cycle/ }).first()).toHaveAttribute("href", /leetcode\.com/);
});

test("os três visualizadores de Two Pointers têm estado próprio e contam operações", async ({ page }) => {
  await page.goto("/topico/two-pointers/");
  const passos = page.locator(".viz-step");
  await page.getByRole("button", { name: /Próximo/ }).first().click();
  await expect(passos.first()).toContainText("passo 2 de");
  await expect(passos.nth(1)).toContainText("passo 1 de");
  // o preset do encontro fecha em 6 somas contra os 28 pares da força bruta
  const convergente = page.locator(".viz").first();
  await expect(convergente.getByText("pares na força bruta")).toBeVisible();
  await expect(convergente.locator(".bigo-stat", { hasText: "pares na força bruta" })).toContainText("28");
});

test("Strings traz os três visualizadores e os números do artigo batem com a tela", async ({ page }) => {
  await page.goto("/topico/strings/");
  // montagem e rotate são passo a passo; o de bytes é painel de leitura
  await expect(page.getByRole("button", { name: /Rodar/ })).toHaveCount(2);
  await expect(page.getByText("o custo de montar uma string")).toBeVisible();
  await expect(page.getByText("caractere, code point e byte")).toBeVisible();
  await expect(page.getByText("Rotate String, força bruta contra o truque")).toBeVisible();

  // o painel de bytes vem primeiro e abre em CCC: 3 bytes em UTF-8, 6 em UTF-16
  const bytes = page.locator(".viz").first();
  await expect(bytes.locator(".str-enc.on .str-enc-val")).toContainText("3 bytes");
  await bytes.getByRole("button", { name: /^UTF-16/ }).click();
  await expect(bytes.locator(".str-enc.on .str-enc-val")).toContainText("6 bytes");

  // o artigo promete 45 cópias com "s = s + c" e 9 com join para CRAFTCODE (n = 9)
  const montagem = page.locator(".viz").nth(1);
  await expect(montagem.locator(".bigo-stat", { hasText: "total com s = s + c" })).toContainText("45");
  await expect(montagem.locator(".bigo-stat", { hasText: "total com join" })).toContainText("9");

  // rotate: o preset "caso feliz" acha na 2a rotação, com 18 caracteres copiados
  const rotate = page.locator(".viz").nth(2);
  await expect(rotate.locator(".bigo-stat", { hasText: "pior caso com o laço" })).toContainText("45");
  await expect(rotate.locator(".bigo-stat", { hasText: "pior caso com o truque" })).toContainText("10");

  await expect(page.getByRole("link", { name: "Rotate String", exact: true })).toHaveAttribute("href", /leetcode\.com/);
  await expect(page.getByRole("link", { name: "Longest Palindromic Substring", exact: true })).toHaveAttribute("href", /leetcode\.com/);
});

test("Tabelas Hash: os contadores da tela batem com os números do artigo", async ({ page }) => {
  await page.goto("/topico/hash-table/");
  // dois passo a passo (inserção e a corrida lista x hash) + a tabela estática
  await expect(page.getByRole("button", { name: /Rodar/ })).toHaveCount(2);
  await expect(page.getByText("inserindo chaves numa tabela hash")).toBeVisible();
  await expect(page.getByText("busca linear x busca por hash")).toBeVisible();
  await expect(page.locator(".ht-tab-table tbody tr")).toHaveCount(4);

  // o artigo promete: anagramas colidem em 3 e custam 6 comparações
  const insercao = page.locator(".viz").first();
  await insercao.getByRole("button", { name: "Anagramas: o pior caso" }).click();
  const proximo = insercao.getByRole("button", { name: /Próximo/ });
  for (let i = 0; i < 60 && (await proximo.isEnabled()); i++) await proximo.click();
  await expect(insercao.locator(".viz-note")).toContainText("3 colisões");
  await expect(insercao.locator(".viz-note")).toContainText("6 comparações de chave");

  // a corrida: com hash bom o pior caso com 1 milhão é 1; com hash ruim, 1 milhão
  const busca = page.locator(".viz").nth(1);
  const piorHash = busca.locator(".bigo-stat", { hasText: "pior caso · hash com 1 milhão" }).locator("strong");
  await expect(piorHash).toHaveText("1");
  await busca.getByRole("button", { name: /Hash ruim/ }).click();
  await expect(piorHash).toHaveText("1.000.000");

  await expect(page.getByRole("link", { name: "Design HashMap", exact: true })).toHaveAttribute(
    "href",
    /leetcode\.com/
  );
});

test("Sliding Window reúne janela fixa e variável na mesma página", async ({ page }) => {
  await page.goto("/topico/sliding-window/");
  await expect(page.getByRole("heading", { level: 1, name: "Sliding Window" })).toBeVisible();
  // três visualizadores: o contraste com a força bruta e um para cada variação
  await expect(page.getByRole("button", { name: /Rodar/ })).toHaveCount(3);
  await expect(page.getByText("força bruta contra janela, no mesmo array")).toBeVisible();
  await expect(page.getByText("janela fixa, a maior soma de k elementos seguidos")).toBeVisible();
  await expect(page.getByText("janela variável, o maior subarray com soma ≤ k")).toBeVisible();
  // as duas instâncias têm estado próprio: avançar uma não mexe na outra
  const passos = page.locator(".viz-step");
  await page.getByRole("button", { name: /Próximo/ }).first().click();
  await expect(passos.first()).toContainText("passo 2 de");
  await expect(passos.nth(1)).toContainText("passo 1 de");
  // os problemas das duas variações convivem na mesma lista
  await expect(page.getByRole("link", { name: /Maximum Average Subarray I/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Minimum Size Subarray Sum/ }).first()).toBeVisible();
});

test("progresso dos slugs antigos de Sliding Window migra para o unificado", async ({ page }) => {
  // Quem concluiu a página antiga (fixa ou variável) tem que continuar concluído.
  await page.addInitScript(() => {
    localStorage.setItem("ccc-dsa-progresso", JSON.stringify({ "sliding-window-fixed": 1 }));
  });
  await page.goto("/topico/sliding-window/");
  await expect(page.getByRole("button", { name: "✓ Concluído" }).first()).toBeVisible();
  // e a chave antiga sai do storage, em vez de virar lixo permanente
  const salvo = await page.evaluate(() => localStorage.getItem("ccc-dsa-progresso"));
  expect(JSON.parse(salvo!)).toEqual({ "sliding-window": 1 });
});

test("Big O traz o gráfico de crescimento, o contador de operações e a tabela de famílias", async ({ page }) => {
  await page.goto("/topico/big-o/");
  // gráfico: o canvas existe e o marcador reage ao chip de uma família
  await expect(page.locator("canvas.bigo-canvas")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "O(n!)" })).toBeVisible();
  // contador: a casca padrão de visualizador, com passo a passo
  await expect(page.getByRole("button", { name: /Rodar/ })).toBeVisible();
  // tabela de famílias: estática, precisa estar no HTML mesmo sem JS
  await expect(page.locator(".bigo-fam-table tbody tr")).toHaveCount(8);
  await expect(page.getByRole("link", { name: /Big O Notation/ })).toHaveAttribute("href", /geeksforgeeks/);
});

test("marcar um tópico como concluído persiste na sessão", async ({ page }) => {
  await page.goto("/topico/sliding-window/");
  // Há dois botões de concluir (topo e fim da página); ambos alternam juntos.
  await page.getByRole("button", { name: "Marcar como concluído" }).first().click();
  await expect(page.getByRole("button", { name: "✓ Concluído" }).first()).toBeVisible();
});

test("índice 'Nesta página' tem links âncora funcionais", async ({ page }) => {
  await page.goto("/topico/sliding-window/");
  const toc = page.locator(".toc-links a").first();
  await expect(toc).toHaveAttribute("href", /^#.+/);
  // a âncora precisa existir na página (id no título correspondente)
  const href = await toc.getAttribute("href");
  await expect(page.locator(href!)).toHaveCount(1);
});

test("página de introdução explica o guia e leva ao primeiro tópico", async ({ page }) => {
  await page.goto("/introducao/");
  await expect(page.getByRole("heading", { level: 1, name: "Introdução" })).toBeVisible();
  await page.getByRole("link", { name: "Começar por Big O" }).click();
  await expect(page).toHaveURL(/topico\/big-o/);
});
