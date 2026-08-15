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
    const fig = await abrir(page, "/topicos/bellman-ford/", "Bellman-Ford, rodada a rodada");
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
    const fig = await abrir(page, "/topicos/bellman-ford/", "Bellman-Ford, rodada a rodada");
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

// ------------------------------------------------------- 2. árvores n-árias
//
// "Agora enfileiro os 1 filhos dele": número certo, concordância errada. O nó é
// o `ul` da árvore DOM, o único de grau 1 dos três presets — e o zero tem frase
// própria ("É folha"), que é o que impede "os 0 filhos" de nascer no lugar.

test.describe("n-ary-trees · a fila do BFS concorda com o número", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  async function abrirBfs(page: Page, arvore: string): Promise<Locator> {
    const fig = await abrir(page, "/topicos/n-ary-trees/", "o mesmo template quando os filhos");
    await fig.getByRole("button", { name: arvore, exact: true }).click();
    await fig.getByRole("button", { name: "Por nível (BFS)", exact: true }).click();
    await expect(contadorDe(fig)).toContainText("passo 1 de ");
    return fig;
  }

  const nota = (fig: Locator) => fig.locator(".viz-note").last();

  test("um filho é 'o único filho', e a fila ao lado confirma que é um só", async ({ page }) => {
    const fig = await abrirBfs(page, "Uma árvore DOM");

    // Passo 10: o `main`, com três filhos. O plural continua plural, com o
    // número à vista.
    await andarAte(fig, 10);
    await expect(nota(fig)).toHaveText(
      "Processo main, que estava na frente da fila. Agora enfileiro os 3 filhos dele, no fim da fila."
    );

    // Passo 16: o `ul`, com um filho só. Era aqui que a peça dizia "os 1 filhos".
    await andarAte(fig, 16);
    await expect(nota(fig)).toHaveText(
      "Processo ul, que estava na frente da fila. Agora enfileiro o único filho dele, no fim da fila."
    );
    // O rótulo lido junto do número que o sustenta: a fila está vazia ANTES de
    // enfileirar, e fica com exatamente um depois. "Único" é medida, não estilo.
    await expect(variavel(fig, "fila").locator(".viz-var-val")).toHaveText("0");
    await proximoDe(fig).click();
    await expect(contadorDe(fig)).toContainText("passo 17 de ");
    await expect(nota(fig)).toContainText("li entra no fim da fila");
    await expect(variavel(fig, "fila").locator(".viz-var-val")).toHaveText("1");
  });

  test("nenhum passo das três árvores escreve 'os 1 filhos'", async ({ page }) => {
    test.slow();
    const vistos: string[] = [];

    for (const arvore of ["A árvore do artigo", "Uma árvore de diretórios", "Uma árvore DOM"]) {
      const fig = await abrirBfs(page, arvore);
      const total = await totalDePassos(fig);
      for (let i = 1; i <= total; i++) {
        if (i > 1) await andarAte(fig, i);
        vistos.push(`${arvore}|${(await nota(fig).innerText()).trim()}`);
      }
      await expect(proximoDe(fig)).toBeDisabled();
    }

    // A varredura tem que ter passado por notas de verdade, senão ela aprova
    // vazio: 19 + 21 + 19 passos.
    expect(vistos.length, "a varredura encurtou").toBe(59);
    // "os 1 filhos" e "os 0 filho" são as duas formas erradas, e o plural com
    // artigo só pode aparecer a partir de dois.
    expect(
      vistos.filter((t) => /\bos [01] filhos?\b/.test(t)),
      "concordância errada: 'os N filhos' com N menor que dois"
    ).toEqual([]);
    // E o singular acontece mesmo — sem isto, a asserção de cima passaria numa
    // peça que nunca chega a um filho.
    expect(vistos.filter((t) => t.includes("o único filho dele")).length).toBe(1);
  });
});

// -------------------------------------------------- 3. as três formas binárias
//
// O sufixo " (não bate com o esperado)" nunca apareceu: as três convenções leem
// o próprio padrão de volta como -v para todo v ≤ 127, e os quatro presets são
// 26, 1, 127 e 0. Não há campo de entrada, então não existe caminho pela
// interface que produza o estado que ele prometia. Este teste percorre TUDO que
// a interface alcança e mostra que a linha diz outra coisa — o que a tela de
// fato tem: três padrões de bits diferentes lidos como o mesmo número.

test.describe("negative-binary · a linha do 'lido de volta'", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("os quatro presets alcançáveis, os três cartões, e nenhuma promessa de falha", async ({
    page,
  }) => {
    const fig = await abrir(page, "/topicos/negative-binary/", "três formas de escrever um negativo");

    // Os quatro chips são TUDO que a interface oferece: sem eles não há entrada.
    await expect(fig.locator(".bigo-chips button")).toHaveText([
      "negar 26",
      "negar 1",
      "negar 127",
      "negar 0",
    ]);

    for (const v of [26, 1, 127, 0]) {
      await fig.getByRole("button", { name: `negar ${v}`, exact: true }).click();
      await expect(fig.locator(".viz-step")).toHaveText("1 de 3 passam nos três testes");

      const fitas: string[] = [];
      for (let i = 0; i < 3; i++) {
        const card = fig.locator(".ms-op").nth(i);
        // O número lido junto da frase, no mesmo parágrafo.
        await expect(
          card.locator(".bb-formula-fim"),
          `negar ${v}, cartão ${i}: a linha do lido de volta`
        ).toHaveText(`Lido de volta: ${-v}: bits diferentes, mesmo número.`);
        fitas.push((await card.locator(".bn-fita .bn-bit-val").allInnerTexts()).join(""));
      }

      // "bits diferentes" é afirmação sobre a tela, então é medida na tela: as
      // três fitas do mesmo número têm que ser diferentes duas a duas.
      expect(new Set(fitas).size, `negar ${v}: as fitas ${fitas.join(" / ")} não são três`).toBe(3);
      // E cada uma tem os 8 bits, senão "diferentes" seria comparar vazio.
      for (const f of fitas) expect(f).toMatch(/^[01]{8}$/);
    }

    // A promessa que não tinha estado: em nenhum dos quatro presets.
    await expect(fig).not.toContainText("não bate com o esperado");
  });
});

// ------------------------------------------------------------ 4. merge sort
//
// A linha da divergência é a do primeiro empate, na lista de decisões do `<=` —
// onde o `<=` faz exatamente o que a peça defende. Ela levava `ruim`, que é o
// vermelho de "quebrou" (o mesmo do selo `empates trocados` na coluna do `<`),
// dentro do cartão cujo selo diz `estável`.

test.describe("merge-sort · a cor da linha da divergência", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  /**
   * As duas cores, MEDIDAS na folha de estilo desta página em vez de escritas
   * na mão: um `<li>` de mentira entra na lista, diz que cor `.ruim` e `.foco`
   * têm aqui, e sai. Constante copiada do `globals.css` envelhece calada, e o
   * `not.toBe(vermelho)` viraria um teste que passa por não achar nada.
   */
  async function coresDaLista(fig: Locator) {
    return fig.evaluate((f) => {
      const ol = f.querySelector(".bb-passos")!;
      const ler = (classe: string) => {
        const li = document.createElement("li");
        li.className = classe;
        ol.appendChild(li);
        const cor = getComputedStyle(li).backgroundColor;
        li.remove();
        return cor;
      };
      return { ruim: ler("ruim"), foco: ler("foco"), base: ler("") };
    });
  }

  test("a linha destacada é a do acerto, e não pode vir pintada de falha", async ({ page }) => {
    const fig = await abrir(page, "/topicos/merge-sort/", "o sinal que decide a estabilidade");

    const cores = await coresDaLista(fig);
    // Sem três cores distintas a comparação abaixo não significa nada.
    expect(new Set(Object.values(cores)).size, `as cores da lista: ${JSON.stringify(cores)}`).toBe(
      3
    );

    for (const preset of [
      "Linhas de log com o mesmo segundo",
      "Um único empate, no fim da intercalação",
      "Chaves todas iguais",
    ]) {
      await fig.getByRole("button", { name: preset, exact: true }).click();

      // O cabeçalho diz QUAL decisão é a da divergência: é dele que sai o
      // índice, em vez de um número escrito à mão.
      const cabecalho = await fig.locator(".viz-step").innerText();
      const k = parseInt(cabecalho.match(/se separam na decisão (\d+)/)![1], 10);
      expect(k, `${preset}: o cabeçalho parou de nomear a decisão`).toBeGreaterThan(0);

      const linha = fig.locator(".bb-passos li").nth(k - 1);
      // Rótulo e cor no MESMO elemento: a linha que o cabeçalho aponta é a do
      // empate, e é ela que a lista promete destacar.
      await expect(linha, `${preset}: a decisão ${k} não é a do empate`).toContainText("empate");
      await expect(fig.locator(".tt-painel-tit")).toContainText(
        "a linha destacada é onde as duas versões se separam"
      );

      const fundo = await linha.evaluate((e) => getComputedStyle(e).backgroundColor);
      expect(fundo, `${preset}: a linha da divergência está pintada de falha`).not.toBe(cores.ruim);
      expect(fundo, `${preset}: a linha da divergência não está destacada`).toBe(cores.foco);

      // E o cartão em que ela mora é o do acerto — o selo, ao lado, diz isso.
      await expect(fig.locator(".ms-op.ok .bb-formula-selo")).toHaveText("estável");
      // Vermelho é de "quebrou", e quem quebra aqui é a coluna do `<`.
      await expect(fig.locator(".ms-op.quebrou .bb-formula-tit")).toHaveText("esq[i] < dir[j]");
      await expect(fig.locator(".ms-op.quebrou .bb-formula-selo")).toHaveText("empates trocados");
      // Nenhuma linha da lista pode carregar a classe de falha.
      await expect(fig.locator(".bb-passos li.ruim")).toHaveCount(0);
    }
  });
});

// ------------------------------------------------------- 5. as dicas do grafo
//
// As quatro dicas eram prosa fixa por preset e ignoravam o modo: a do Completo
// dizia "V(V-1)/2 = 15 arestas. É o teto" com o cartão mostrando 30 de 30 ao
// lado. Agora elas recebem os mesmos números que os cartões mostram.

const GRAFO = { url: "/topicos/grafos-intro/", titulo: "o mesmo grafo em matriz e em lista" };

const PRESETS_GRAFO = ["Esparso (rede social)", "Denso", "Completo", "Caminho (o mínimo conexo)"];

/** Um cartão de resumo, pelo rótulo, com o valor lido ao lado dele. */
const cartao = (fig: Locator, nome: string) =>
  fig.locator(`.bigo-stat:has(span:text-is(${JSON.stringify(nome)}))`);

test.describe("grafos-intro · a dica de cada preset", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // As oito frases, medidas na tela. Elas existem escritas aqui porque a dica é
  // CONTEÚDO: mudar o número dela sem mudar o cartão é o defeito voltando.
  const DICAS: Record<string, { nao: string; sim: string }> = {
    "Esparso (rede social)": {
      nao: "O caso mais comum do mundo real: cada vértice tem poucos vizinhos. São 7 das 15 arestas possíveis, e 22 das 36 células da matriz ficam em zero.",
      sim: "O caso mais comum do mundo real: cada vértice tem poucos vizinhos. São 14 das 30 arestas dirigidas possíveis, e 22 das 36 células da matriz ficam em zero.",
    },
    Denso: {
      nao: "Muitas ligações por vértice: 13 das 15 arestas possíveis. Com só 10 células em zero, os dois custos se aproximam — 36 células contra 32 entradas.",
      sim: "Muitas ligações por vértice: 26 das 30 arestas dirigidas possíveis. Com só 10 células em zero, os dois custos se aproximam — 36 células contra 32 entradas.",
    },
    Completo: {
      nao: "Todo mundo ligado a todo mundo: V(V-1)/2 = 15 arestas. É o teto, e é onde a matriz fica cheia — só a diagonal sobra em zero.",
      sim: "Todo mundo ligado a todo mundo: V(V-1) = 30 arestas dirigidas. É o teto, e é onde a matriz fica cheia — só a diagonal sobra em zero.",
    },
    "Caminho (o mínimo conexo)": {
      nao: "V-1 = 5 arestas: o mínimo para conectar tudo sem ciclo. Uma árvore é exatamente isto.",
      sim: "V-1 = 5 ligações, cada uma com ida e volta: 10 arestas dirigidas. É o mínimo para conectar tudo sem ciclo, e uma árvore é exatamente isto.",
    },
  };

  test("a dica cita os mesmos números dos cartões, e muda quando o modo muda", async ({ page }) => {
    const fig = await abrir(page, GRAFO.url, GRAFO.titulo);
    const dica = fig.locator(".tt-legenda-arvore");

    for (const preset of PRESETS_GRAFO) {
      for (const modo of ["não dirigido", "dirigido"] as const) {
        await fig.getByRole("button", { name: preset, exact: true }).click();
        await fig.getByRole("button", { name: modo, exact: true }).click();

        const esperada = DICAS[preset][modo === "dirigido" ? "sim" : "nao"];
        await expect(dica, `${preset} / ${modo}: a dica`).toHaveText(esperada);

        // A prova de que a dica e os cartões falam do mesmo estado: os números
        // que ela cita saem da TELA, e não desta tabela. `arestas (E)` mostra
        // "N de M" e a dica tem que citar os dois; `células em zero` mostra o
        // terceiro, e as dicas que falam de zero têm que repeti-lo.
        const [e, max] = (await cartao(fig, "arestas (E)").locator("strong").innerText())
          .split(" de ")
          .map((s) => s.trim());
        const zeros = (await cartao(fig, "células em zero").locator("strong").innerText()).trim();

        expect(esperada, `${preset} / ${modo}: a dica não cita as ${e} da tela`).toContain(e);
        // O teto só entra nas dicas que falam dele. A do Caminho fala do
        // mínimo, e citar o teto ali seria número sem assunto.
        if (preset !== "Caminho (o mínimo conexo)")
          expect(esperada, `${preset} / ${modo}: a dica não cita as ${max} possíveis`).toContain(
            max
          );
        if (esperada.includes("células em zero") || esperada.includes("células da matriz"))
          expect(esperada, `${preset} / ${modo}: a dica cita outro número de zeros`).toContain(
            zeros
          );
      }
    }
  });
});

// -------------------------------------------------- 6. a ordem dos cliques
//
// A mesma peça tinha dois estados conforme a ORDEM: "Completo" e depois
// "dirigido" dava 30 de 30; "dirigido" e depois "Completo" dava 15 de 30, com a
// mesma dica dizendo "é o teto" nos dois e metade da matriz vazia num deles. A
// leitura certa é a de 30 — o preset descreve quais vértices estão ligados, e o
// tipo é uma leitura da matriz, não uma reescrita dela.

/** Tudo que a peça diz do estado atual, num objeto só: cabeçalho, os dois
 *  cartões que a dica cita, a dica e a própria matriz. */
async function lerGrafo(fig: Locator) {
  return {
    cabecalho: (await fig.locator(".viz-step").innerText()).trim(),
    arestas: (await cartao(fig, "arestas (E)").locator("strong").innerText()).trim(),
    zeros: (await cartao(fig, "células em zero").locator("strong").innerText()).trim(),
    dica: (await fig.locator(".tt-legenda-arvore").innerText()).trim(),
    ligadas: await fig.locator(".gr-cel.on").count(),
  };
}

test.describe("grafos-intro · a ordem dos cliques", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("preset e tipo em qualquer ordem chegam ao mesmo grafo", async ({ page }) => {
    for (const preset of PRESETS_GRAFO) {
      // Ordem A: escolher o grafo e depois ligar o dirigido.
      const a = await abrir(page, GRAFO.url, GRAFO.titulo);
      await a.getByRole("button", { name: preset, exact: true }).click();
      await a.getByRole("button", { name: "dirigido", exact: true }).click();
      const viaPreset = await lerGrafo(a);

      // Ordem B: ligar o dirigido e depois escolher o grafo.
      const b = await abrir(page, GRAFO.url, GRAFO.titulo);
      await b.getByRole("button", { name: "dirigido", exact: true }).click();
      await b.getByRole("button", { name: preset, exact: true }).click();
      const viaTipo = await lerGrafo(b);

      expect(viaTipo, `${preset}: a ordem dos cliques mudou o grafo`).toEqual(viaPreset);
      // E o estado é o do preset de verdade, não o de metade dele: a matriz
      // simétrica tem duas células por ligação.
      expect(viaPreset.ligadas, `${preset}: a matriz perdeu metade das células`).toBe(
        parseInt(viaPreset.arestas.split(" de ")[0], 10)
      );
    }
  });

  test("o caso reportado: Completo + dirigido dá 30 de 30 pelos dois caminhos", async ({ page }) => {
    const esperado = {
      cabecalho: "V = 6 · E = 30 · densidade 100%",
      arestas: "30 de 30",
      zeros: "6",
      dica: "Todo mundo ligado a todo mundo: V(V-1) = 30 arestas dirigidas. É o teto, e é onde a matriz fica cheia — só a diagonal sobra em zero.",
      ligadas: 30,
    };

    const a = await abrir(page, GRAFO.url, GRAFO.titulo);
    await a.getByRole("button", { name: "Completo", exact: true }).click();
    await a.getByRole("button", { name: "dirigido", exact: true }).click();
    expect(await lerGrafo(a), "Completo e depois dirigido").toEqual(esperado);

    const b = await abrir(page, GRAFO.url, GRAFO.titulo);
    await b.getByRole("button", { name: "dirigido", exact: true }).click();
    await b.getByRole("button", { name: "Completo", exact: true }).click();
    // Era aqui que a peça dizia "15 de 30" com a dica jurando ser o teto.
    expect(await lerGrafo(b), "dirigido e depois Completo").toEqual(esperado);

    // A diagonal é o que sobra em zero, e ela é DESENHADA: 36 botões, 30 em 1 e
    // os 6 da diagonal em 0.
    await expect(b.locator(".gr-cel")).toHaveCount(36);
    await expect(b.locator(".gr-cel.diag")).toHaveCount(6);
  });
});
