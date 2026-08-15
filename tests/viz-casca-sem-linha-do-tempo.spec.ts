import { test, expect, type Locator, type Page } from "@playwright/test";

// A casca adaptativa nas cinco peças `total: 1` + `collapsible: false` desta
// rodada, em quatro tópicos. Elas são o mesmo perfil, e por isso o arquivo é
// uma tabela: o que o contrato exige delas é idêntico, e escrever cinco vezes
// o mesmo teste em cinco arquivos esconderia justamente o que elas têm em
// comum. O `BuscaBinariaOverflow`, que é a sexta do perfil, tem arquivo
// próprio porque entrou antes destas.
//
// O que muda o formato em relação a uma peça com linha do tempo, e vem da §8
// do contrato:
//
//   · com `collapsible: false` não existem os itens 2, 3 e 4 do mínimo (os três
//     que falam do bloco recolhível). No lugar deles vale a prova do rótulo:
//     NENHUM botão pode prometer esconder um bloco que a peça não tem;
//   · com `total: 1` e sem `children` o `VizFooter` some inteiro, então não há
//     `▶ Rodar` cuja posição comparar. O único cromo parado é o cabeçalho, e é
//     a posição DELE, comparada com ela mesma, que carrega o sentido.
//
// Todo seletor sai da figura, e a figura é achada por QUAL peça ela é. Nenhum
// teste daqui conta quantas figuras da página têm a casca: essa é uma afirmação
// sobre o cronograma da migração, não sobre o produto, e ela nasce condenada —
// foi exatamente o que derrubou 39 testes quando estas cinco entraram.

type Peca = {
  slug: string;
  nome: string;
  /** Trecho do título que identifica a figura na página. */
  titulo: string;
  /** O título inteiro, que vira o `aria-label` do diálogo. */
  tituloCompleto: string;
  /** O resumo do estado que entra no lugar do "passo N de M". */
  resumo: RegExp;
  /** Quantas figuras a página tem, para a contagem do nível de cima. */
  figurasNaPagina: number;
};

const PECAS: Peca[] = [
  {
    slug: "backtracking",
    nome: "BacktrackingPoda",
    titulo: "a poda: mesma resposta",
    tituloCompleto: "Visualizador · a poda: mesma resposta, uma fração do trabalho",
    resumo: /^\d+ rainhas · \d+ soluções · [\d.]+x menos nós com poda$/,
    figurasNaPagina: 3,
  },
  {
    slug: "quick-sort",
    nome: "QuickSortPivo",
    titulo: "a escolha do pivô decide",
    tituloCompleto: "Visualizador · a escolha do pivô decide entre n log n e n²",
    resumo: /^com n = \d+, profundidade \d+ é o ideal e \d+ é o pior caso$/,
    figurasNaPagina: 3,
  },
  {
    slug: "shell-sort",
    nome: "ShellSortGaps",
    titulo: "a partir de que tamanho o gap",
    tituloCompleto: "Visualizador · a partir de que tamanho o gap compensa",
    resumo: /^n = \d+ · melhor com gap: .+, \d+ comparações · insertion sort: \d+$/,
    figurasNaPagina: 3,
  },
  {
    slug: "shell-sort",
    nome: "ShellSortSubsequencias",
    titulo: "uma rodada de gap h são h insertion",
    tituloCompleto: "Visualizador · uma rodada de gap h são h insertion sorts entrelaçados",
    resumo: /^gap \d+ · \d+ subsequências? de \d+ elementos?$/,
    figurasNaPagina: 3,
  },
  {
    slug: "binary-heap",
    nome: "HeapIndicesVisualizer",
    titulo: "clique num nó e veja de onde saem",
    tituloCompleto: "Visualizador · clique num nó e veja de onde saem pai e filhos",
    resumo: /^índice \d+ de 0 a \d+$/,
    figurasNaPagina: 2,
  },
];

/** Folga de subpixel, igual à do hook. */
const SLACK = 8;

async function abrir(page: Page, peca: Peca, w: number, h: number): Promise<Locator> {
  await page.setViewportSize({ width: w, height: h });
  expect(page.viewportSize(), "a janela pedida é a janela medida").toEqual({ width: w, height: h });
  await page.goto(`/topicos/${peca.slug}/`);
  await page.evaluate(() => document.fonts.ready);
  const fig = page.locator("article figure.viz").filter({ hasText: peca.titulo });
  await expect(fig, "o seletor casa uma figura, e é a desta peça").toHaveCount(1);
  await expect(fig).toHaveClass(/viz-fit/);
  return fig;
}

for (const peca of PECAS) {
  test.describe(`${peca.nome} · casca sem linha do tempo`, () => {
    test("o resumo do estado ocupa o lugar do contador, com o rótulo junto", async ({ page }) => {
      const fig = await abrir(page, peca, 1512, 900);

      // Nível de cima: a página inteira. É aqui que um seletor não escopado
      // começaria a ler a peça errada, sem erro nenhum.
      await expect(page.locator("article figure.viz")).toHaveCount(peca.figurasNaPagina);
      await expect(page.locator("article .viz-step")).toHaveCount(peca.figurasNaPagina);
      // Nível de baixo: a figura.
      await expect(fig.locator(".viz-step")).toHaveCount(1);

      // O número vem COM o rótulo: sem o "passo N de M" ao lado, um número solto
      // perde o contexto que o explicava (contrato §6).
      await expect(fig.locator(".viz-step")).toHaveText(peca.resumo);

      // Um botão só no cabeçalho, e é o de expandir.
      const botoes = fig.locator(".viz-head-right button");
      await expect(botoes).toHaveCount(1);
      await expect(botoes).toHaveText("⤢ Expandir");
    });

    test("nenhum botão promete esconder um bloco que a peça não tem", async ({ page }) => {
      const fig = await abrir(page, peca, 1512, 900);

      // A premissa do `collapsible: false`: a peça REALMENTE não tem bloco.
      await expect(fig.locator(".viz-code")).toHaveCount(0);
      await expect(fig.locator(".viz-code-slot")).toHaveCount(0);

      // E a promessa que não pode existir. Rótulo que mente ensina errado do
      // mesmo jeito que comportamento errado.
      await expect(fig.getByRole("button", { name: /Mostrar|Ocultar/ })).toHaveCount(0);
      await expect(fig.locator(".viz-toggle-codigo")).toHaveCount(0);
      await expect(fig.locator("[aria-expanded]")).toHaveCount(0);
    });

    test("o rodapé some inteiro em vez de virar uma linha vazia", async ({ page }) => {
      const fig = await abrir(page, peca, 1512, 900);

      await expect(fig.locator(".viz-step")).not.toContainText("passo");
      await expect(fig.locator(".viz-foot")).toHaveCount(0);
      await expect(fig.locator(".viz-controls")).toHaveCount(0);
      await expect(fig.locator(".viz-progress")).toHaveCount(0);
      await expect(fig.locator(".viz-atalhos")).toHaveCount(0);
      await expect(fig.getByRole("button", { name: /Rodar|Pausar|Anterior|Próximo/ })).toHaveCount(
        0
      );

      // Os controles da peça não sumiram junto: eles são do MIOLO, porque não
      // são reprodução. No rodapé teriam sumido com ele.
      expect(await fig.locator(".viz-body button").count()).toBeGreaterThan(0);
    });

    test("no painel o cabeçalho fica parado enquanto o miolo rola", async ({ page }) => {
      const fig = await abrir(page, peca, 1440, 700);
      await fig.getByRole("button", { name: "⤢ Expandir" }).click();
      const painel = page.getByRole("dialog", { name: peca.tituloCompleto }).locator("figure.viz-fit");
      await expect(painel).toBeFocused();

      const topoDoCabecalho = () =>
        painel.locator(".viz-head").evaluate((e) => Math.round(e.getBoundingClientRect().top));
      const antes = await topoDoCabecalho();

      // Rola OS DOIS candidatos. Se a camada 1 estiver desligada quem rola é a
      // figura inteira (`.viz-overlay .viz` é `overflow: auto`), e é esse caso
      // que precisa reprovar — mandar rolar só o miolo faria o teste passar
      // contra a quebra, porque aí o miolo não rola e nada se mexe.
      await painel.evaluate((f) => {
        const b = f.querySelector<HTMLElement>(".viz-body");
        f.scrollTop = f.scrollHeight;
        if (b) b.scrollTop = b.scrollHeight;
      });

      // A asserção que carrega o sentido vem ANTES das premissas: a quebra
      // desfaz a situação que elas afirmam, e com elas na frente o teste
      // reprovaria na linha errada.
      expect(await topoDoCabecalho(), "o cabeçalho não anda quando o miolo rola").toBe(antes);

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

    test("o diálogo é rotulado por ESTA peça, e o Esc fecha", async ({ page }) => {
      const fig = await abrir(page, peca, 1440, 700);
      await fig.getByRole("button", { name: "⤢ Expandir" }).click();

      // Com mais de uma figura na página, um `aria-label` genérico deixaria o
      // leitor de tela sem saber qual delas abriu.
      await expect(page.getByRole("dialog", { name: peca.tituloCompleto })).toHaveCount(1);
      await expect(page.getByRole("dialog")).toHaveCount(1);

      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);

      // A outra metade da promessa do contrato §5 — "o foco volta para onde
      // estava ao fechar" — NÃO é afirmada aqui de propósito, porque hoje ela
      // não acontece: o foco cai no `<body>`. É defeito do hook, vale para
      // todas as peças da casca, e está reportado no PR #51. Gravar o
      // comportamento errado num teste seria pior que não ter o teste.
    });
  });
}
