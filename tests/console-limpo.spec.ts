import { test, expect } from "./fixtures/console-limpo";

// Guarda de erro de cliente. A asserção mora na fixture
// (`tests/fixtures/console-limpo.ts`), no teardown que faz as vezes de
// afterEach; aqui ficam os percursos que dão o que a fixture escutar.
//
// Carregar a página não basta, e é por isso que estes testes clicam. Exceção em
// handler, o caso que mais dói num site de visualizadores, só existe quando
// alguém aperta o botão: um `throw` dentro do `onClick` de 'Próximo ›' deixa o
// HTML servido intacto, o passo não anda, e nenhuma das 37 suítes de hoje
// percebe. A regra do runbook ('toda verificação de UI tem que interagir')
// vale aqui pelo mesmo motivo que vale para asserção de estado.

const ROTAS = [
  "/",
  "/roadmaps/fundamentos/",
  "/introducao/",
  "/topicos/two-pointers/", // ready, com 3 visualizadores
  "/topicos/big-o/", // ready, o visualizador que usa o hook novo
  "/topicos/trie/", // soon e vazio (noindex)
  "/apoie/",
];

for (const rota of ROTAS) {
  test(`console limpo ao abrir ${rota}`, async ({ page }) => {
    await page.goto(rota);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Uma folga para o que o React só faz depois da hidratação (efeitos,
    // `localStorage` do progresso, `matchMedia` da casca adaptativa).
    await page.waitForTimeout(400);
  });
}

test("console limpo ao mexer nos visualizadores de um tópico", async ({ page }) => {
  await page.goto("/topicos/two-pointers/");
  const figura = page.locator("figure.viz").first();
  await expect(figura).toBeVisible();

  // Andar a animação: é o caminho que passa por gerador de passos, `setState`
  // e render, que é onde uma exceção nasce.
  const proximo = figura.getByRole("button", { name: /Próximo/ });
  await expect(proximo).toBeEnabled();
  for (let i = 0; i < 12 && (await proximo.isEnabled()); i++) await proximo.click();

  // Rodar e pausar: liga e desliga o `setInterval`.
  const rodar = figura.getByRole("button", { name: /Rodar|Pausar/ }).first();
  await expect(rodar).toBeVisible();
  await rodar.click();
  await page.waitForTimeout(500);
  await figura.getByRole("button", { name: /Rodar|Pausar/ }).first().click();

  // Reiniciar volta ao passo 0 e refaz o gerador.
  //
  // Vai por `title` e não por papel: o botão é `<button title="Reiniciar">↺`, e
  // texto ganha de `title` no cálculo do nome acessível, então o nome dele é
  // "↺". `getByRole("button", { name: "Reiniciar" })` não acha. Isso é um
  // achado de acessibilidade em `src/lib/visualizer.tsx:532`, fora da fronteira
  // deste PR e reportado no corpo dele.
  const reiniciar = figura.locator('button[title="Reiniciar"]');
  await expect(reiniciar).toBeVisible();
  await reiniciar.click();
});

test("console limpo ao abrir e fechar o painel expandido", async ({ page }) => {
  await page.goto("/topicos/big-o/");
  const figura = page.locator("figure.viz").first();
  await expect(figura).toBeVisible();

  // `.viz-expand` também veste o botão que mostra e oculta o código, então o
  // seletor exclui esse, senão `.first()` clica no botão errado e o painel
  // nunca abre (com o teste passando, porque nada estoura).
  const expandir = figura.locator(".viz-expand:not(.viz-toggle-codigo)");
  await expect(expandir).toBeVisible();
  await expandir.click();
  await expect(page.locator(".viz-overlay")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".viz-overlay")).toHaveCount(0);
});

test("console limpo ao marcar progresso e abrir o menu do celular", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/topicos/two-pointers/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // O progresso escreve no `localStorage` via provider client.
  const marcar = page.getByRole("checkbox").first();
  if (await marcar.isVisible()) {
    await marcar.click();
    await marcar.click();
  }

  await page.getByRole("button", { name: "Mais opções" }).click();
  await expect(page.locator(".nav-menu")).toBeVisible();
});
