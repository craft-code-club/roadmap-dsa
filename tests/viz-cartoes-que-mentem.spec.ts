import { test, expect, type Locator, type Page } from "@playwright/test";

// Cartões que ensinavam o oposto do que a peça existe para ensinar.
//
// Todo teste daqui lê o RÓTULO junto do VALOR, no mesmo cartão. É a camada que
// nenhum teste de estado alcança: comportamento certo com rótulo errado ensina
// errado do mesmo jeito, e foi exatamente o que aconteceu no painel de
// variáveis do heap sort. O campo `pair` recebia três coisas diferentes — o
// maior filho, a origem da subida e a posição que ACABOU DE SAIR do heap — e o
// painel chamava as três de "maior candidato". Medido no gerador, nos quatro
// presets: dos 156 passos que mostravam um número, 95 mostravam um que não era
// candidato a nada, e 34 apontavam uma célula VERDE, que é a cor de "resolvida
// para sempre" e o oposto exato da fronteira que a peça ensina.
//
// Por isso a asserção central não é um número: é a INVARIANTE, varrida na
// animação inteira dos quatro presets. Onde o rótulo `maior (índice)` acende, o
// índice tem que estar dentro do heap e apontar o maior da tríade; onde `trocou
// com` acende, a troca tem que ter acontecido de verdade.

const HEAP = "/topico/heap-sort/";
const GRAFOS = "/topico/grafos-intro/";

// A página do heap sort tem três visualizadores, e `figure.viz-fit` só é único
// nela enquanto os outros dois não vestirem a casca (é o que o PR #56 faz).
// A âncora é o que só esta peça tem: a faixa de fase. Mesma ideia no grafo, com
// a matriz — `.gr-matriz` também existe no BellmanFord, que mora noutra página.
const FIG_HEAP = "article figure.viz:has(.hs-fase)";
const FIG_GRAFO = "article figure.viz:has(.gr-matriz)";

async function abrir(page: Page, url: string, sel: string): Promise<Locator> {
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  const fig = page.locator(sel);
  await expect(fig).toHaveCount(1);
  await fig.scrollIntoViewIfNeeded();
  return fig;
}

/**
 * Uma linha do painel de variáveis, achada pelo RÓTULO — o valor é lido dentro
 * dela. Ler o número por posição passaria verde com dois campos trocados de
 * lugar: o conjunto de textos da tela fica idêntico e só a associação mente.
 */
const variavel = (fig: Locator, nome: string) =>
  fig.locator(`.viz-var:has(.viz-var-name:text-is(${JSON.stringify(nome)}))`);

const cartao = (fig: Locator, nome: string) =>
  fig.locator(`.bigo-stat:has(span:text-is(${JSON.stringify(nome)}))`);

const proximoDe = (fig: Locator) => fig.getByRole("button", { name: "Próximo ›" });

/** Anda até o passo `alvo`, confirmando o contador a cada clique: leitura única
 *  de estado do React mente, e clique rápido some se a asserção não fechar. */
async function irAoPasso(fig: Locator, alvo: number) {
  const contador = fig.locator(".viz-step");
  await expect(contador).toContainText("passo 1 de ");
  for (let i = 1; i < alvo; i++) {
    await proximoDe(fig).click();
    await expect(contador).toContainText(`passo ${i + 1} de `);
  }
}

/**
 * Anda a animação inteira dentro do navegador e fecha com `toBeDisabled`.
 * Laço que não prova que chegou ao fim deixa a asserção seguinte vazia.
 */
async function irAoFim(page: Page, sel: string, fig: Locator): Promise<number> {
  const andou = await page.evaluate(
    (s) =>
      new Promise<number>((resolve, reject) => {
        const f = document.querySelector(s)!;
        const prox = [...f.querySelectorAll("button")].find((b) =>
          b.textContent!.includes("Próximo")
        ) as HTMLButtonElement;
        if (!prox) return reject(new Error("nao achei o botao Proximo"));
        let k = 0;
        const tick = () => {
          if (prox.disabled) return resolve(k);
          if (k > 500) return reject(new Error("a animacao nao terminou em 500 passos"));
          prox.click();
          k++;
          requestAnimationFrame(() => requestAnimationFrame(tick));
        };
        tick();
      }),
    sel
  );
  await expect(proximoDe(fig)).toBeDisabled();
  return andou;
}

test.describe("cartões que ensinavam o oposto", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // ------------------------------------------------------------------ heap sort
  test.describe("heap sort · o painel de variáveis", () => {
    test("os rótulos nomeiam dois fatos, em vez de um nome só para três", async ({ page }) => {
      const fig = await abrir(page, HEAP, FIG_HEAP);

      // O rótulo antigo, "maior candidato", descrevia um dos três significados
      // que o campo carregava. Cada fato passa a ter o seu nome.
      await expect(fig.locator(".viz-var-name")).toHaveText([
        "n (heap ativo)",
        "i (foco)",
        "maior (índice)",
        "trocou com",
      ]);
    });

    test("os dois lados de cada rótulo: aceso quando o fato vale, traço quando não", async ({
      page,
    }) => {
      const fig = await abrir(page, HEAP, FIG_HEAP);
      const maior = variavel(fig, "maior (índice)").locator(".viz-var-val");
      const trocou = variavel(fig, "trocou com").locator(".viz-var-val");

      // Passo 4: compara os filhos de 4 e o maior da tríade está em 9. Há
      // comparação e não há troca.
      await irAoPasso(fig, 4);
      await expect(fig.locator(".viz-note")).toContainText("O maior da tríade é 6.");
      await expect(maior).toHaveText("9");
      await expect(trocou).toHaveText("-");

      // Passo 5: a troca aconteceu, e o que era o maior deixou de ser. Há troca
      // e não há comparação — o traço em `maior (índice)` é informação.
      await proximoDe(fig).click();
      await expect(fig.locator(".viz-step")).toContainText("passo 5 de ");
      await expect(maior).toHaveText("-");
      await expect(trocou).toHaveText("4");
    });

    test("passo 27: a célula verde é 'trocou com', e nunca 'maior'", async ({ page }) => {
      const fig = await abrir(page, HEAP, FIG_HEAP);
      await irAoPasso(fig, 27);

      // A cena exata do defeito. O cartão dizia "maior candidato: 9" com a
      // célula 9 pintada de verde: candidata a nada, resolvida para sempre.
      await expect(variavel(fig, "trocou com").locator(".viz-var-val")).toHaveText("9");
      await expect(variavel(fig, "maior (índice)").locator(".viz-var-val")).toHaveText("-");

      const celula = fig.locator(".hp-cel").nth(9);
      await expect(celula).toHaveClass(/\bfixo\b/);
      await expect(celula).toHaveClass(/\btroca\b/);
      await expect(fig.locator(".viz-note")).toContainText(
        "a posição 9 está resolvida para sempre"
      );
    });

    test("a invariante dos dois rótulos vale na animação inteira dos quatro presets", async ({
      page,
    }) => {
      test.slow();
      const fig = await abrir(page, HEAP, FIG_HEAP);

      const presets = ["Embaralhado", "Já ordenado", "Ao contrário", "Com repetidos"];
      const varridos: { preset: string; passos: number; maior: number; trocou: number }[] = [];

      for (const nome of presets) {
        await fig.getByRole("button", { name: new RegExp(`^${nome}:`) }).click();
        await expect(fig.locator(".viz-step")).toContainText("passo 1 de ");

        const r = await page.evaluate(
          (s) =>
            new Promise<{
              passos: number;
              erros: string[];
              maior: number;
              trocou: number;
            }>((resolve, reject) => {
              const f = document.querySelector(s)!;
              const prox = [...f.querySelectorAll("button")].find((b) =>
                b.textContent!.includes("Próximo")
              ) as HTMLButtonElement;

              // Rótulo E valor do MESMO cartão, sempre.
              const varDe = (nome: string) => {
                const c = [...f.querySelectorAll(".viz-var")].find(
                  (e) => e.querySelector(".viz-var-name")!.textContent!.trim() === nome
                );
                if (!c) throw new Error(`nao achei a variavel "${nome}"`);
                return c.querySelector(".viz-var-val")!.textContent!.trim();
              };
              const num = (t: string) => (t === "-" ? -1 : parseInt(t, 10));

              const erros: string[] = [];
              let maior = 0;
              let trocou = 0;
              let k = 0;

              const ler = () => {
                const passo = parseInt(
                  f.querySelector(".viz-step")!.textContent!.match(/passo (\d+)/)![1],
                  10
                );
                const n = parseInt(varDe("n (heap ativo)"), 10);
                const foco = num(varDe("i (foco)"));
                const iMaior = num(varDe("maior (índice)"));
                const iTrocou = num(varDe("trocou com"));

                // O valor de cada célula vem do nó de texto, e o índice do <i>.
                // `textContent` cola os dois ("46" é o índice 4 com o valor 6).
                const celulas = [...f.querySelectorAll(".hp-cel")].map((c) => {
                  const i = c.querySelector("i")!.textContent!;
                  return {
                    valor: parseInt(c.textContent!.slice(i.length), 10),
                    troca: c.classList.contains("troca"),
                    fixo: c.classList.contains("fixo"),
                  };
                });

                if (iMaior >= 0 && iTrocou >= 0)
                  erros.push(`passo ${passo}: os dois rotulos acesos (${iMaior} e ${iTrocou})`);

                if (iMaior >= 0) {
                  maior++;
                  // Nunca um índice fora do heap: fora do heap é verde, e verde
                  // é "resolvida para sempre", o oposto de candidata.
                  if (iMaior >= n)
                    erros.push(
                      `passo ${passo}: "maior (indice)" = ${iMaior} esta fora do heap (n=${n})`
                    );
                  else if (celulas[iMaior].fixo)
                    erros.push(`passo ${passo}: "maior (indice)" = ${iMaior} aponta celula verde`);
                  else if (foco < 0)
                    erros.push(`passo ${passo}: "maior (indice)" aceso sem foco`);
                  else {
                    // E é mesmo o maior entre o pai e os filhos dentro do heap.
                    const triade = [foco, 2 * foco + 1, 2 * foco + 2].filter((x) => x < n);
                    const topo = Math.max(...triade.map((x) => celulas[x].valor));
                    if (celulas[iMaior].valor !== topo)
                      erros.push(
                        `passo ${passo}: "maior (indice)" = ${iMaior} vale ${celulas[iMaior].valor}, ` +
                          `mas o maior da triade ${JSON.stringify(triade)} e ${topo}`
                      );
                  }
                }

                if (iTrocou >= 0) {
                  trocou++;
                  // Só acende onde houve troca, e as duas pontas dela estão
                  // marcadas no array.
                  if (!celulas[iTrocou].troca)
                    erros.push(
                      `passo ${passo}: "trocou com" = ${iTrocou}, mas a celula nao esta marcada como troca`
                    );
                  if (foco < 0 || !celulas[foco].troca)
                    erros.push(`passo ${passo}: "trocou com" aceso e o foco (${foco}) sem troca`);
                }
              };

              const tick = () => {
                try {
                  ler();
                } catch (e) {
                  return reject(e);
                }
                k++;
                if (prox.disabled) return resolve({ passos: k, erros, maior, trocou });
                if (k > 500) return reject(new Error("a animacao nao terminou em 500 passos"));
                prox.click();
                requestAnimationFrame(() => requestAnimationFrame(tick));
              };
              tick();
            }),
          FIG_HEAP
        );

        // O laço andou até o fim de verdade, e não parou no meio calado.
        await expect(proximoDe(fig)).toBeDisabled();
        expect(r.erros, `${nome}: os rotulos discordam do que a tela mostra`).toEqual([]);
        expect(r.passos, `${nome}: a animacao encurtou demais para significar algo`).toBeGreaterThan(
          50
        );
        varridos.push({ preset: nome, passos: r.passos, maior: r.maior, trocou: r.trocou });
      }

      // A varredura só vale se os dois rótulos tiverem mesmo acendido. Sem isto
      // um `largest` sempre em -1 passaria com zero erro e zero significado.
      expect(varridos).toEqual([
        { preset: "Embaralhado", passos: 78, maior: 22, trocou: 27 },
        { preset: "Já ordenado", passos: 84, maior: 25, trocou: 30 },
        { preset: "Ao contrário", passos: 71, maior: 26, trocou: 21 },
        { preset: "Com repetidos", passos: 56, maior: 18, trocou: 17 },
      ]);
    });
  });

  // -------------------------------------------------- heap sort · os três números
  test.describe("heap sort · os números prometidos", () => {
    test("38, 41 e 35 são o que a peça produz, e é o que a legenda e o artigo dizem", async ({
      page,
    }) => {
      test.slow();
      const fig = await abrir(page, HEAP, FIG_HEAP);

      // A peça. Igualdade exata: `toContainText("38")` passaria com 138.
      for (const [preset, esperado] of [
        ["Embaralhado", "38"],
        ["Já ordenado", "41"],
        ["Ao contrário", "35"],
      ] as const) {
        await fig.getByRole("button", { name: new RegExp(`^${preset}:`) }).click();
        await expect(fig.locator(".viz-step")).toContainText("passo 1 de ");
        await irAoFim(page, FIG_HEAP, fig);
        await expect(
          cartao(fig, "comparações").locator("strong"),
          `${preset}: o total de comparacoes mudou`
        ).toHaveText(esperado);
      }

      // A legenda da peça, que manda o aluno anotar os três.
      await expect(fig.locator(".viz-caption")).toContainText(
        "anote o total de comparações: 38, 41 e 35."
      );

      // E a terceira cópia: o artigo repete os mesmos números, em negrito. As
      // três pontas amarradas num teste só — mexer no gerador reprova aqui em
      // vez de apodrecer em silêncio nas outras duas.
      const frase = page.locator("article p").filter({ hasText: "38 comparações" });
      await expect(frase).toHaveCount(1);
      await expect(frase).toContainText(
        "38 comparações no embaralhado, 41 no já ordenado e 35 no invertido"
      );
    });
  });

  // --------------------------------------------------------------------- grafo
  test.describe("grafos-intro · o custo das duas representações", () => {
    test("a legenda diz empate no completo, e os dois cartões empatam mesmo", async ({ page }) => {
      const fig = await abrir(page, GRAFOS, FIG_GRAFO);
      const matriz = cartao(fig, "memória da matriz").locator("strong");
      const lista = cartao(fig, "memória da lista").locator("strong");

      // Esparso: a lista custa bem menos, que é o argumento da peça.
      await expect(matriz).toHaveText("36 células");
      await expect(lista).toHaveText("20 entradas");

      // Completo, não dirigido: V + 2E = V + V(V-1) = V². Os dois EMPATAM. A
      // legenda dizia que a lista "só perde quando o grafo é quase completo", e
      // ela nunca perde: o completo é o teto, e no teto os números se igualam.
      await fig.getByRole("button", { name: "Completo", exact: true }).click();
      await expect(fig.locator(".viz-step")).toHaveText("V = 6 · E = 15 · densidade 100%");
      await expect(matriz).toHaveText("36 células");
      await expect(lista).toHaveText("36 entradas");

      // O outro lado da condicional da legenda: no dirigido a conta é V + E, e
      // o empate acontece igual, com os 30 arcos do completo.
      await fig.getByRole("button", { name: "dirigido", exact: true }).click();
      await expect(fig.locator(".viz-step")).toHaveText("V = 6 · E = 30 · densidade 100%");
      await expect(matriz).toHaveText("36 células");
      await expect(lista).toHaveText("36 entradas");

      await expect(fig.locator(".viz-caption")).toContainText("V + E (dirigido");
      await expect(fig.locator(".viz-caption")).toContainText(
        "no grafo completo isso dá exatamente V²: os dois empatam, e é o mais caro que a lista chega a ficar."
      );

      // E o lado não dirigido da mesma frase.
      await fig.getByRole("button", { name: "não dirigido", exact: true }).click();
      await expect(fig.locator(".viz-caption")).toContainText("V + 2E (não dirigido");
      await expect(fig.locator(".viz-caption")).toContainText(
        "no grafo completo isso dá exatamente V²: os dois empatam, e é o mais caro que a lista chega a ficar."
      );
    });

    test("o cartão 'células em zero' conta os zeros que a matriz desenha", async ({ page }) => {
      const fig = await abrir(page, GRAFOS, FIG_GRAFO);
      const zeros = cartao(fig, "células em zero").locator("strong");

      // A invariante que faltava, e a que teria pego o defeito: o número do
      // cartão é a contagem dos botões que mostram `0`. A expressão descontava
      // a diagonal (`- V`), mas a diagonal É DESENHADA, como botão com o zero
      // dentro — `opacity: .35` deixa apagado, não invisível.
      const naTela = () =>
        fig.evaluate((f) => {
          const cel = [...f.querySelectorAll(".gr-cel")];
          return {
            botoes: cel.length,
            zeros: cel.filter((b) => b.textContent!.trim() === "0").length,
            diagonalEmZero: cel.filter(
              (b) => b.classList.contains("diag") && b.textContent!.trim() === "0"
            ).length,
          };
        });

      const presets = ["Esparso (rede social)", "Denso", "Completo", "Caminho (o mínimo conexo)"];
      const visto: string[] = [];

      for (const modo of ["não dirigido", "dirigido"]) {
        await fig.getByRole("button", { name: modo, exact: true }).click();
        for (const preset of presets) {
          await fig.getByRole("button", { name: preset, exact: true }).click();
          const t = await naTela();

          // A matriz sempre desenha V² botões, e a diagonal inteira sempre em
          // zero: é ela que o `- V` descontava, e é ela que o aluno vê.
          expect(t.botoes, `${modo}/${preset}: a matriz deixou de ter V² botões`).toBe(36);
          expect(t.diagonalEmZero, `${modo}/${preset}: a diagonal saiu do zero`).toBe(6);

          await expect(zeros, `${modo}/${preset}: o cartão discorda da tela`).toHaveText(
            String(t.zeros)
          );
          visto.push(`${modo}/${preset}: ${t.zeros}`);
        }
      }

      // E os números medidos, presos: a invariante sozinha passaria com os dois
      // lados errados do mesmo jeito, e é a tela que manda.
      expect(visto).toEqual([
        "não dirigido/Esparso (rede social): 22",
        "não dirigido/Denso: 10",
        "não dirigido/Completo: 6",
        "não dirigido/Caminho (o mínimo conexo): 26",
        "dirigido/Esparso (rede social): 29",
        "dirigido/Denso: 23",
        "dirigido/Completo: 21",
        "dirigido/Caminho (o mínimo conexo): 31",
      ]);
    });
  });
});
