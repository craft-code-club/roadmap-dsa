import { test, expect, type Locator, type Page } from "@playwright/test";

// O `HeapIndicesVisualizer` fixa a seleção quando o array ENCOLHE, e continua
// fixando depois que o ajuste saiu de um `useEffect` para a fase de render.
//
// Por que este arquivo existe: o ajuste era
//
//     useEffect(() => { if (sel >= n) setSel(Math.max(0, n - 1)); }, [n, sel]);
//
// um `setState` dentro de efeito que dá para derivar durante o render, e o
// único caso do arquivo na lista do `react-hooks/set-state-in-effect`. Ele
// nunca teve teste, e é por isso que trocá-lo é arriscado: a linha seguinte
// (`const i = Math.min(sel, n - 1)`) parece tornar o bloco redundante, e quem
// simplesmente apagar o ajuste troca o comportamento SEM nenhum erro aparecer —
// a seleção deixa de ser fixada e volta sozinha ao encolher e crescer de novo.
//
// Arquivo próprio, e não uma seção de `viz-binary-heap.spec.ts`: aquele arquivo
// tem PR aberto em cima (#51) e cobre o `BinaryHeapVisualizer`, que é a outra
// figura da mesma página.

const URL = "/topico/binary-heap/";

/** A figura do visualizador de índices, que NÃO é a do passo a passo. */
async function abrir(page: Page): Promise<Locator> {
  await page.goto(URL);
  await page.evaluate(() => document.fonts.ready);
  const fig = page
    .locator("article figure.viz")
    .filter({ hasText: "clique num nó e veja de onde saem pai e filhos" });
  await expect(fig).toHaveCount(1);
  // A página tem duas figuras e as duas têm `.viz-step`, com sentidos
  // diferentes: aqui é "índice N de 0 a M", lá é "passo N de M". Sem escopar,
  // a leitura sai da peça errada e o teste fica verde medindo outra coisa.
  await expect(page.locator("article .viz-step")).toHaveCount(2);
  await expect(fig.locator(".viz-step")).toHaveCount(1);
  return fig;
}

const rotulo = (fig: Locator) => fig.locator(".viz-step");
const slider = (fig: Locator) => fig.locator("input[type=range]");
/** A célula do array. Escopada no `.hp-arr` porque o MESMO `aria-label` está
 *  também no nó da árvore em SVG: `getByRole("button", …)` casa dois. */
const celula = (fig: Locator, idx: number) => fig.locator(".hp-arr .hp-cel").nth(idx);

test.describe("binary heap · a seleção do visualizador de índices", () => {
  test("encolher o array fixa a seleção, e crescer de volta NÃO a devolve", async ({ page }) => {
    const fig = await abrir(page);

    // O array cheio, com o último índice selecionado. O rótulo é lido junto com
    // o valor: "índice 15" sozinho não diria de que faixa ele é o último.
    await slider(fig).fill("16");
    await expect(celula(fig, 15)).toHaveAttribute("aria-label", "Índice 15, valor 51");
    await celula(fig, 15).click();
    await expect(rotulo(fig)).toHaveText("índice 15 de 0 a 15");

    // Encolhe: 15 sai da faixa e o ajuste fixa a seleção no último válido.
    await slider(fig).fill("4");
    await expect(rotulo(fig)).toHaveText("índice 3 de 0 a 3");

    // E cresce de volta. Esta é a asserção que carrega o sentido: o ajuste é
    // uma ESCRITA de estado, não um `clamp` de leitura, então a seleção fica
    // onde foi fixada. Apagar o bloco de ajuste e confiar no `Math.min` faria
    // esta linha ler "índice 15 de 0 a 15".
    await slider(fig).fill("16");
    await expect(rotulo(fig)).toHaveText("índice 3 de 0 a 15");
  });

  test("a seleção fixada é a mesma que a árvore e o array acendem", async ({ page }) => {
    const fig = await abrir(page);

    await slider(fig).fill("16");
    await celula(fig, 12).click();
    await expect(rotulo(fig)).toHaveText("índice 12 de 0 a 15");

    await slider(fig).fill("5");
    await expect(rotulo(fig)).toHaveText("índice 4 de 0 a 4");

    // Comportamento certo com rótulo certo não basta: o que o aluno vê é a
    // célula acesa. Exatamente uma no array, e é a do índice 4.
    const acesas = fig.locator(".hp-arr .hp-cel.on");
    await expect(acesas).toHaveCount(1);
    await expect(acesas).toHaveAttribute("aria-label", /^Índice 4, valor /);

    // E a fórmula do pai lê o índice fixado, não o antigo.
    await expect(fig.locator(".hp-formula.pai .hp-formula-conta")).toHaveText("(4 - 1) // 2 = 1");
  });

  test("trocar só o k não mexe na seleção: quem tem faixa é o n", async ({ page }) => {
    const fig = await abrir(page);

    await slider(fig).fill("16");
    await celula(fig, 15).click();
    await expect(rotulo(fig)).toHaveText("índice 15 de 0 a 15");

    // `k` muda quem é pai e quem é filho, nunca quantas posições existem — o
    // ajuste não pode disparar aqui. Se ele dependesse de `k`, a seleção cairia.
    await fig.locator(".sub-modo-btn", { hasText: /^4$/ }).click();
    await expect(rotulo(fig)).toHaveText("índice 15 de 0 a 15");
    await expect(fig.locator(".hp-formula.pai .hp-formula-conta")).toHaveText("(15 - 1) // 4 = 3");
  });
});
