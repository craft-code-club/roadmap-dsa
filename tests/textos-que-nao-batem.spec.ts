import { test, expect, type Locator, type Page } from "@playwright/test";

// Textos de tela que não batiam com o que a peça faz.
//
// Irmão do `viz-cartoes-que-mentem.spec.ts`, e pelo mesmo motivo: comportamento
// certo com rótulo errado ensina errado do mesmo jeito. Aqui a família é outra —
// não é um campo com três significados, são seis frases (e uma cor) que dizem
// uma coisa enquanto a execução ao lado faz outra:
//
//   1. o cartão do Bellman-Ford somava (V-1)×E, o PIOR CASO, e chamava aquilo de
//      "relaxamentos totais" — com early exit, dois dos três presets faziam
//      metade disso (16 de 32 e 12 de 24);
//   2. o BFS n-ário dizia "enfileiro os 1 filhos dele" no único nó de grau 1;
//   3. o "(não bate com o esperado)" das três formas binárias não aparece em
//      entrada nenhuma que a interface alcance;
//   4. a linha da divergência do merge levava o vermelho de "quebrou" para o
//      acerto do `<=`;
//   5. as quatro dicas do grafo eram prosa fixa e ignoravam o modo dirigido;
//   6. e o mesmo preset do grafo dava dois grafos, conforme a ORDEM dos cliques.
//
// Regra de casa em todos: INTERAGIR e ler o rótulo junto do número, no mesmo
// elemento sempre que der. Contar elemento não testa nada.

// --------------------------------------------------------------------- apoio

/** A figura pelo TÍTULO do cabeçalho: três destas páginas têm mais de uma. */
function figuraPor(page: Page, titulo: string): Locator {
  return page
    .locator("article figure.viz")
    .filter({ has: page.locator(".viz-head-title", { hasText: titulo }) });
}

async function abrir(page: Page, url: string, titulo: string): Promise<Locator> {
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  const fig = figuraPor(page, titulo);
  await expect(fig).toHaveCount(1);
  await fig.scrollIntoViewIfNeeded();
  return fig;
}

/** Uma linha do painel de variáveis, achada pelo RÓTULO. O valor sai de dentro
 *  dela: ler o número por posição passa verde com dois campos trocados. */
const variavel = (fig: Locator, nome: string) =>
  fig.locator(`.viz-var:has(.viz-var-name:text-is(${JSON.stringify(nome)}))`);

/** O contador da casca, que é o `.viz-step` que fala de passo (o Bellman-Ford
 *  tem dois: o da rodada, escrito pela peça, e o do hook). */
const contadorDe = (fig: Locator) => fig.locator(".viz-step").filter({ hasText: /passo \d+ de \d+/ });

const proximoDe = (fig: Locator) => fig.getByRole("button", { name: "Próximo ›" });

/** Quantos passos a linha do tempo tem, lido da tela. */
async function totalDePassos(fig: Locator): Promise<number> {
  const txt = (await contadorDe(fig).innerText()).match(/passo \d+ de (\d+)/);
  if (!txt) throw new Error("o contador de passo não casou");
  return parseInt(txt[1], 10);
}

/** Anda até `alvo` confirmando o contador a cada clique: clique rápido some se
 *  a asserção não fechar, e leitura única de estado do React mente. */
async function andarAte(fig: Locator, alvo: number) {
  const contador = contadorDe(fig);
  const atual = parseInt((await contador.innerText()).match(/passo (\d+)/)![1], 10);
  for (let i = atual; i < alvo; i++) {
    await proximoDe(fig).click();
    await expect(contador).toContainText(`passo ${i + 1} de `);
  }
}

// ------------------------------------------------------- 1. Bellman-Ford
//
// Medido no gerador, nos três presets: o de peso negativo para na rodada 2 e faz
// 16 dos 32 relaxamentos que (V-1)×E promete; o de ciclo negativo roda as quatro
// e faz 24 de 24; o de pesos positivos para na 2 e faz 12 de 24. O cartão
// mostrava 32, 24 e 24 — o pior caso, sempre, e com a palavra "totais" ao lado,
// que é o que fazia o pior caso passar por execução.

test.describe("bellman-ford · o cartão de relaxamentos", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  const PRESETS = [
    { chip: "Com peso negativo (funciona)", arestas: 8, feitos: 16, pior: 32 },
    { chip: "Ciclo negativo (detecta)", arestas: 6, feitos: 24, pior: 24 },
    { chip: "Só pesos positivos", arestas: 6, feitos: 12, pior: 24 },
  ];

  test("o número que ele mostra é o que a execução fez, e o pior caso fica ao lado", async ({
    page,
  }) => {
    test.slow();
    const fig = await abrir(page, "/topico/bellman-ford/", "Bellman-Ford, rodada a rodada");
    const relaxamentos = variavel(fig, "relaxamentos");

    for (const p of PRESETS) {
      await fig.getByRole("button", { name: p.chip, exact: true }).click();
      await expect(contadorDe(fig)).toContainText("passo 1 de ");

      // O rótulo e o valor no MESMO cartão: é a associação que mentia.
      await expect(
        relaxamentos,
        `${p.chip}: o cartão de relaxamentos sumiu ou trocou de rótulo`
      ).toHaveCount(1);
      // Passo 1 é a linha do "dist[inicio] = 0": nenhuma aresta foi relaxada
      // ainda. Um cartão que já nasce no total é o defeito de volta.
      await expect(
        relaxamentos.locator(".viz-var-val"),
        `${p.chip}: o cartão começa contando relaxamento que não aconteceu`
      ).toHaveText(`0 de ${p.pior}`);

      // E o pior caso é conferível na tela, no cartão vizinho: rodadas × arestas.
      await expect(variavel(fig, "arestas por rodada").locator(".viz-var-val")).toHaveText(
        String(p.arestas)
      );
      await expect(variavel(fig, "rodada").locator(".viz-var-val")).toHaveText("0 de 4");
      expect(4 * p.arestas, `${p.chip}: o pior caso deixou de ser (V-1) × E`).toBe(p.pior);

      await andarAte(fig, await totalDePassos(fig));
      await expect(proximoDe(fig)).toBeDisabled();

      // O fim da execução. Aqui morava a mentira: "relaxamentos totais: 32"
      // depois de 16 relaxamentos.
      await expect(
        relaxamentos.locator(".viz-var-val"),
        `${p.chip}: o cartão discorda do que a execução fez`
      ).toHaveText(`${p.feitos} de ${p.pior}`);
      // E o rótulo não pode voltar a dizer que o número é o total.
      await expect(relaxamentos.locator(".viz-var-name")).toHaveText("relaxamentos");
    }
  });

  test("ele conta enquanto a animação anda, e a rodada extra não entra na conta", async ({
    page,
  }) => {
    const fig = await abrir(page, "/topico/bellman-ford/", "Bellman-Ford, rodada a rodada");
    const valor = variavel(fig, "relaxamentos").locator(".viz-var-val");

    // Preset de peso negativo: 8 arestas por rodada. O passo 10 é o fim da
    // rodada 1 (1 de abertura + 8 arestas + o fecho), então são 8 relaxamentos.
    await andarAte(fig, 10);
    await expect(fig.locator(".viz-note")).toContainText("Fim da rodada 1");
    await expect(valor, "o cartão não acompanha a animação").toHaveText("8 de 32");

    // A rodada extra roda DEPOIS das V-1 e não é uma delas: somá-la daria
    // "17 de 32" no último passo, irmão do "rodada 5 de 4" que o cabeçalho já
    // corrigiu. O rótulo da rodada diz "extra" e o número não anda.
    await andarAte(fig, 19);
    await expect(valor).toHaveText("16 de 32");
    await proximoDe(fig).click();
    await expect(contadorDe(fig)).toContainText("passo 20 de 20");
    await expect(variavel(fig, "rodada").locator(".viz-var-val")).toHaveText("extra (detecção)");
    await expect(valor, "a rodada extra entrou na conta dos relaxamentos").toHaveText("16 de 32");
  });
});
