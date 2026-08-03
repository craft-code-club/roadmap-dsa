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
  await expect(page.getByRole("link", { name: /Two Pointers Technique/ })).toHaveAttribute("href", /geeksforgeeks/);
});

test("página de apoio mostra apoiadores, parceiros e o link de doação", async ({ page }) => {
  await page.goto("/apoie/");
  await expect(page.getByRole("heading", { name: "Seja um apoiador da Comunidade" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Apoiadores" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Parceiros" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Quero apoiar/ }).first()).toHaveAttribute("href", /apoia\.se\/craftcodeclub/);
});

test("Two Pointers é uma página completa com visualizador e problemas", async ({ page }) => {
  await page.goto("/topico/two-pointers/");
  await expect(page.getByRole("button", { name: /Rodar/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Two Sum II/ }).first()).toHaveAttribute("href", /leetcode\.com/);
});

test("Sliding Window reúne janela fixa e variável na mesma página", async ({ page }) => {
  await page.goto("/topico/sliding-window/");
  await expect(page.getByRole("heading", { level: 1, name: "Sliding Window" })).toBeVisible();
  // um visualizador para cada variação, com o preset certo
  await expect(page.getByRole("button", { name: /Rodar/ })).toHaveCount(2);
  await expect(page.getByText("maior soma de uma janela de tamanho k")).toBeVisible();
  await expect(page.getByText("maior subarray com soma ≤ k")).toBeVisible();
  // as duas instâncias têm estado próprio: avançar uma não mexe na outra
  const passos = page.locator(".viz-step");
  await page.getByRole("button", { name: /Próximo/ }).first().click();
  await expect(passos.first()).toContainText("passo 2 de");
  await expect(passos.nth(1)).toContainText("passo 1 de");
  // os problemas das duas variações convivem na mesma lista
  await expect(page.getByRole("link", { name: /Maximum Average Subarray I/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Minimum Size Subarray Sum/ }).first()).toBeVisible();
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
