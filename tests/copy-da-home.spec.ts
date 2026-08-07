import { test, expect, type Page } from "@playwright/test";
import { ALL_TOPICS, TOTAL_TOPICS, isEmptyTopic } from "../content/roadmap";

// A copy da home prometia duas coisas que não eram verdade.
//
//  1. "47 tópicos com visualização passo a passo, código Python e problemas do
//     LeetCode": 11 dos 47 não têm NENHUM dos três. É o mesmo corte que o site
//     usa para marcar "em breve" no menu e mandar `noindex` para o Google, então
//     a página afirmava, para quem busca, o contrário do que ela própria declara
//     para o buscador.
//  2. "open source": a licença é a PolyForm Noncommercial, que proíbe uso
//     comercial e por isso não é open source pela definição da OSI.
//
// Os dois testes de número LEEM A FONTE (`content/roadmap.ts`) em vez de fixar
// 36 e 47: no dia em que um tópico ganhar material eles continuam verdes, e o
// que eles protegem não é o valor, é a ESCOLHA entre os dois números. Por isso
// vem junto a asserção do outro lado: a frase que fala do tamanho da trilha
// ("tópicos no roadmap", o título) tem que continuar com o total. Trocar a
// constante em toda ocorrência conserta a mentira e cria outra.

const PRONTOS = ALL_TOPICS.filter((t) => !isEmptyTopic(t));

/** O número que a frase usa, lido do texto que a página publicou. */
function numeroDa(texto: string | null, padrao: RegExp, onde: string): number {
  expect(texto, `${onde}: nada publicado`).toBeTruthy();
  const achado = texto!.match(padrao);
  expect(achado, `${onde}: a frase mudou e o guarda não achou o número em ${JSON.stringify(texto)}`)
    .not.toBeNull();
  return Number(achado![1]);
}

async function meta(page: Page, seletor: string): Promise<string | null> {
  return page.locator(`head ${seletor}`).getAttribute("content");
}

test("a home só promete material nos tópicos que têm material", async ({ page }) => {
  // O teste só sabe distinguir os dois números enquanto eles forem diferentes.
  // Empatados (todo tópico com material), ele passaria sem testar nada.
  expect(PRONTOS.length, "todo tópico tem material: reveja a copy e este guarda").toBeLessThan(
    TOTAL_TOPICS
  );

  await page.goto("/");

  const descricao = numeroDa(
    await meta(page, 'meta[name="description"]'),
    /(\d+) tópicos com visualização passo a passo/,
    "meta description"
  );
  const cartao = numeroDa(
    await meta(page, 'meta[property="og:description"]'),
    /(\d+) tópicos com o algoritmo rodando passo a passo/,
    "og:description"
  );
  const abertura = numeroDa(
    (await page.locator(".hero > p").innerText()).replace(/\s+/g, " "),
    /Nos (\d+) tópicos já publicados/,
    "parágrafo de abertura"
  );

  expect({ descricao, cartao, abertura }).toEqual({
    descricao: PRONTOS.length,
    cartao: PRONTOS.length,
    abertura: PRONTOS.length,
  });

  // A abertura diz "já publicados", e a conta é derivada de `isEmptyTopic`, que
  // aceitaria um tópico `soon` com só um vídeo. Enquanto as duas listas forem a
  // mesma, a palavra está certa; no dia em que se separarem, aqui reprova antes
  // de a home passar a chamar de publicado quem não tem artigo.
  expect(
    PRONTOS.filter((t) => t.status !== "ready").map((t) => t.slug),
    "a copy diz 'já publicados', mas há tópico contado sem artigo"
  ).toEqual([]);
});

test("o total da trilha continua onde ele é verdade: título e card do roadmap", async ({ page }) => {
  await page.goto("/");

  // O título fala do tamanho do guia, não do que cada tópico entrega: 47 é o
  // número certo aqui, e é o mesmo que o roadmap lista.
  expect(await page.title()).toContain(`${TOTAL_TOPICS} Tópicos`);

  // Pelo RÓTULO, não pela posição: o card vizinho mostra 36 hoje ("tópicos com
  // visualização"), e um `.first()` daria um teste que passa lendo o número
  // errado.
  const cartao = page.locator(".stat").filter({ hasText: "tópicos no roadmap" });
  await expect(cartao).toHaveCount(1);
  await expect(cartao.locator(".stat-n")).toHaveText(`${TOTAL_TOPICS}`);
});

test("a home não se chama open source, e diz onde o código está", async ({ page, request }) => {
  await page.goto("/");

  await expect(page.locator(".hero-badge")).toHaveText(
    "Feito pela comunidade Craft & Code Club · 100% grátis · código no GitHub"
  );
  await expect(page.locator(".site-foot .foot-text")).toContainText(
    "Código no GitHub · gratuito para sempre"
  );

  // O que o aluno lê...
  const naTela = await page.locator("body").innerText();
  expect(naTela, "'open source' voltou ao texto da home").not.toMatch(/open[\s-]?source/i);

  // ...e o que o robô lê: título, descrição e card de compartilhamento saem no
  // `<head>`, fora do `body`, e é por eles que a frase circula em link.
  const html = await (await request.get("/")).text();
  expect(html, "'open source' voltou ao HTML da home (head, meta ou payload)").not.toMatch(
    /open[\s-]?source/i
  );
});

const REGUAS = [
  { w: 390, h: 844, nome: "390x844" },
  { w: 1440, h: 700, nome: "1440x700" },
  { w: 1512, h: 900, nome: "1512x900" },
] as const;

for (const regua of REGUAS) {
  test(`o selo do topo cabe na caixa em ${regua.nome}`, async ({ page }) => {
    await page.setViewportSize({ width: regua.w, height: regua.h });
    await page.goto("/");

    // "código no GitHub" é 30px mais largo que "open source" (medido em 1512:
    // 411,2px -> 440,8px), e copy mais longa é a única forma de esta troca
    // machucar alguém.
    //
    // O que se mede aqui é a CAIXA do selo contra a largura do aparelho. As duas
    // medições mais naturais foram testadas e as duas são incapazes de reprovar,
    // com uma palavra impossível de quebrar dentro do selo, em 390x844:
    //
    //   texto contra a caixa ..... a caixa é `inline-block` sem `max-width` e
    //                              cresce junto: a linha nunca passa dela
    //   página rolando de lado ... `documentElement.scrollWidth` continuou 390
    //                              com o selo em 422,8px, porque ele é aparado
    //                              em silêncio em vez de empurrar a página
    //
    // Sobra a caixa contra o aparelho, que reprovou por 32,8px no mesmo teste. E
    // a comparação é com `documentElement.clientWidth`, a largura real: sob
    // perfil de celular o Chromium alarga a viewport de layout junto com o
    // estouro, e `innerWidth` mentiria junto.
    const medida = await page.locator(".hero-badge").evaluate((el) => {
      const faixa = document.createRange();
      faixa.selectNodeContents(el);
      return {
        linhas: faixa.getClientRects().length,
        caixa: el.getBoundingClientRect().width,
        aparelho: document.documentElement.clientWidth,
        fonte: parseFloat(getComputedStyle(el).fontSize),
      };
    });

    expect(medida.fonte, "o selo ficou com fonte zerada").toBeGreaterThan(9);
    expect(
      Math.round((medida.caixa - medida.aparelho) * 10) / 10,
      "a caixa do selo ficou mais larga que a tela"
    ).toBeLessThanOrEqual(0);
    // Uma linha no desktop, no máximo duas no celular (medido: já eram duas com
    // a copy antiga, porque a quebra cai depois de "grátis ·").
    expect(medida.linhas, "o selo ganhou linha demais").toBeLessThanOrEqual(regua.w < 500 ? 2 : 1);
  });
}
