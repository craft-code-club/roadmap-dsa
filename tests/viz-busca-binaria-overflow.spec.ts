import { test, expect, type Locator, type Page } from "@playwright/test";

// A casca adaptativa no `BuscaBinariaOverflow` — a terceira peça do tópico
// `busca-binaria`, e a única das três que não tem linha do tempo.
//
// Arquivo próprio, e não uma seção de `viz-busca-binaria.spec.ts`: aquele
// arquivo cobre as DUAS peças com passo a passo, tem PR aberto em cima, e o
// padrão da skill é um arquivo novo por rodada para N agentes não brigarem
// pelo mesmo diff.
//
// O que muda o formato dos testes daqui em relação aos das peças com linha do
// tempo, e vem direto da §8 do contrato:
//
//   · com `collapsible: false` não existem os itens 2, 3 e 4 do mínimo (os três
//     que falam do bloco recolhível). No lugar deles a prova é a do rótulo:
//     NENHUM botão pode prometer esconder um bloco que a peça não tem;
//   · com `total: 1` não existe rodapé nenhum — `VizFooter` sem `children` some
//     inteiro —, então a camada 1 não pode ser provada pela posição do
//     `▶ Rodar`. Aqui o único cromo parado é o cabeçalho, e é a posição DELE,
//     comparada com ela mesma, que carrega o sentido.
//
// Medido antes de escrever, nos 8 estados (4 presets x 2 tipos de inteiro) e
// nas três réguas, com `document.fonts.ready` cumprido:
//
//   artigo, antes ....... 848..886 (1512x900) / 881..902 (1440x700) / 1768..1920 (390x844)
//   artigo, depois ...... 856..894             / 889..910           / 1788..1940
//   ou seja +8, +8 e +20, e a aritmética fecha: o `.viz-body` devolve os 4px do
//   `padding-bottom` (18 -> 14) previstos na §9, e o cabeçalho cobra 12px a
//   1512 (41 -> 53, o botão é mais alto que o texto) e 24px a 390 (73 -> 97).
//   Nenhum estado desta peça faz a linha do cabeçalho QUEBRAR, que é o que
//   custa 40px nas peças vizinhas desta mesma rodada.

const URL = "/topico/busca-binaria/";

const TITULO = "Visualizador · as duas formas de achar o meio, e por que só uma serve";

/** Folga de subpixel, igual à do hook. */
const SLACK = 8;

async function abrir(page: Page, w: number, h: number): Promise<Locator> {
  await page.setViewportSize({ width: w, height: h });
  expect(page.viewportSize(), "a janela pedida é a janela medida").toEqual({ width: w, height: h });
  await page.goto(URL);
  await page.evaluate(() => document.fonts.ready);
  // Escolhida por QUAL peça é, e não por posição entre as três figuras da
  // página: `.nth(1)` é uma afirmação sobre a ordem do artigo, e o dia em que
  // ela mudar esta suíte mede outra peça. O `toHaveCount(1)` é a outra metade —
  // sem ele, um título ambíguo devolveria duas figuras.
  const fig = page
    .locator("article figure.viz")
    .filter({ has: page.locator(".viz-head-title", { hasText: "as duas formas de achar o meio" }) });
  await expect(fig, `a peça "${TITULO}" tem que ser única em ${URL}`).toHaveCount(1);
  await expect(fig).toHaveClass(/viz-fit/);
  return fig;
}

/** Expande e espera o painel estar PRONTO PARA O TECLADO, não só visível: o
 *  `keydown` nasce num efeito, e a tecla enviada antes some sem erro nenhum.
 *  O foco tendo entrado na figura é o sinal de que o efeito rodou. */
async function expandir(page: Page, fig: Locator): Promise<Locator> {
  await fig.getByRole("button", { name: "⤢ Expandir" }).click();
  const dialogo = page.getByRole("dialog", { name: TITULO });
  await expect(dialogo).toHaveCount(1);
  const painel = dialogo.locator("figure.viz-fit");
  await expect(painel).toBeFocused();
  return painel;
}

test.describe("busca binária · o estouro de 32 bits entra na casca", () => {
  test("é a peça certa, e as contagens fecham nos dois níveis", async ({ page }) => {
    const fig = await abrir(page, 1512, 900);

    // A ambiguidade é da PÁGINA: três figuras, três `.viz-step` com sentidos
    // diferentes. Afirmar só no nível da figura deixaria passar o dia em que
    // um seletor de página começasse a casar com o irmão errado.
    await expect(page.locator("article figure.viz")).toHaveCount(3);
    await expect(page.locator("article figure.viz-fit")).toHaveCount(3);
    await expect(page.locator("article .viz-step")).toHaveCount(3);
    await expect(fig.locator(".viz-step")).toHaveCount(1);

    // O número do cabeçalho vem COM o rótulo — sem o "passo N de M" ao lado, um
    // número solto perderia o contexto que o explicava (contrato §6).
    await expect(fig.locator(".viz-step")).toHaveText(/^as duas (concordam|discordam)$/);

    // Um botão só no cabeçalho, e é o de expandir.
    const botoes = fig.locator(".viz-head-right button");
    await expect(botoes).toHaveCount(1);
    await expect(botoes).toHaveText("⤢ Expandir");
  });

  test("sem bloco recolhível, nenhum botão promete esconder o que não existe", async ({ page }) => {
    const fig = await abrir(page, 1512, 900);

    // A premissa do `collapsible: false`: a peça REALMENTE não tem bloco.
    await expect(fig.locator(".viz-code")).toHaveCount(0);
    await expect(fig.locator(".viz-code-slot")).toHaveCount(0);

    // E a promessa que não pode existir. Rótulo que mente ensina errado do
    // mesmo jeito que comportamento errado.
    await expect(fig.getByRole("button", { name: /Mostrar|Ocultar/ })).toHaveCount(0);
    await expect(fig.locator(".viz-toggle-codigo")).toHaveCount(0);
    await expect(fig.locator("[aria-expanded]")).toHaveCount(0);
  });

  test("sem linha do tempo, o rodapé some inteiro em vez de virar uma linha vazia", async ({
    page,
  }) => {
    const fig = await abrir(page, 1512, 900);

    await expect(fig.locator(".viz-step")).not.toContainText("passo");
    await expect(fig.locator(".viz-foot")).toHaveCount(0);
    await expect(fig.locator(".viz-controls")).toHaveCount(0);
    await expect(fig.locator(".viz-progress")).toHaveCount(0);
    await expect(fig.locator(".viz-atalhos")).toHaveCount(0);
    await expect(fig.getByRole("button", { name: /Rodar|Pausar|Anterior|Próximo/ })).toHaveCount(0);

    // Os controles desta peça não sumiram junto: eles são do MIOLO, porque não
    // são reprodução. Se tivessem ido para o rodapé, sumiriam com ele.
    await expect(fig.locator(".viz-body .bigo-chip")).toHaveCount(4);
    await expect(fig.locator(".viz-body input[type=number]")).toHaveCount(2);
  });

  test("no painel o cabeçalho fica parado enquanto o miolo rola", async ({ page }) => {
    const fig = await abrir(page, 1440, 700);
    const painel = await expandir(page, fig);

    const topoDoCabecalho = () =>
      painel.locator(".viz-head").evaluate((e) => Math.round(e.getBoundingClientRect().top));

    const antes = await topoDoCabecalho();

    // Rola OS DOIS candidatos. Se a camada 1 estiver desligada quem rola é a
    // figura inteira (`.viz-overlay .viz` é `overflow: auto`), e é justamente
    // esse caso que precisa reprovar — mandar rolar só o miolo faria o teste
    // passar contra a quebra, porque aí o miolo não rola e nada se mexe.
    await painel.evaluate((f) => {
      const b = f.querySelector<HTMLElement>(".viz-body");
      f.scrollTop = f.scrollHeight;
      if (b) b.scrollTop = b.scrollHeight;
    });

    // A asserção que carrega o sentido, e ela vem ANTES das premissas: a quebra
    // desfaz a situação que as premissas afirmam, então com elas na frente o
    // teste reprovaria na linha errada (armadilha 9 do processo).
    expect(await topoDoCabecalho(), "o cabeçalho não anda quando o miolo rola").toBe(antes);

    // Premissas, agora que já se sabe qual asserção trabalha: tem sobra para
    // rolar, quem rolou foi o miolo, e a figura não rolou.
    const medidas = await painel.evaluate((f) => {
      const b = f.querySelector<HTMLElement>(".viz-body")!;
      return {
        sobraDoMiolo: b.scrollHeight - b.clientHeight,
        miolo: Math.round(b.scrollTop),
        figura: Math.round(f.scrollTop),
      };
    });
    expect(medidas.sobraDoMiolo, "o miolo tem o que rolar").toBeGreaterThan(SLACK);
    expect(medidas.miolo, "quem rolou foi o miolo").toBeGreaterThan(0);
    expect(medidas.figura, "a figura não rola").toBe(0);
  });

  test("o diálogo é rotulado por ESTA peça, o foco entra nele e o Esc fecha", async ({ page }) => {
    const fig = await abrir(page, 1440, 700);
    const expandir3 = fig.getByRole("button", { name: "⤢ Expandir" });

    await expandir3.click();
    // Com três figuras na mesma página, um `aria-label` genérico deixaria o
    // leitor de tela sem saber qual das três abriu.
    await expect(page.getByRole("dialog", { name: TITULO })).toHaveCount(1);
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(page.locator(".viz-overlay figure.viz-fit")).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // A outra metade da promessa do contrato §5 — "o foco volta para onde
    // estava ao fechar" — NÃO é afirmada aqui de propósito, porque hoje ela não
    // acontece: o foco cai no `<body>`. Não é desta peça, é do hook, e vale
    // para as três figuras desta página, incluindo as duas adaptadas há
    // rodadas: o `previous?.focus?.()` do `useVisualizer` guarda o botão que
    // estava em foco, e o nó morre quando o `createPortal` recolhe a figura de
    // volta para o artigo, então o `focus()` sai num nó solto.
    // Reportado como defeito de plataforma; o conserto é no hook e não cabe
    // numa adaptação de peça (skill §1).
  });

  test("no painel o Tab circula dentro, e não escapa para os links do artigo", async ({ page }) => {
    const fig = await abrir(page, 1440, 700);
    const painel = await expandir(page, fig);

    // Uma volta inteira e mais um pouco: o que prova a trava é o foco NUNCA
    // sair, não ele estar dentro depois de um Tab só.
    const focaveis = await painel
      .locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      .count();
    expect(focaveis, "há foco para circular").toBeGreaterThan(2);

    for (let i = 0; i < focaveis + 3; i++) {
      await page.keyboard.press("Tab");
      const dentro = await page.evaluate(() => {
        const p = document.querySelector(".viz-overlay figure.viz-fit");
        return !!p && (p === document.activeElement || p.contains(document.activeElement));
      });
      expect(dentro, `o foco continua no painel depois de ${i + 1} Tabs`).toBe(true);
    }
  });
});
