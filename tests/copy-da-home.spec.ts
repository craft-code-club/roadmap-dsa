import { test, expect, type Page } from "@playwright/test";
import { ALL_TOPICS, TOTAL_TOPICS, isEmptyTopic } from "../content/roadmap";

// A copy da home prometia "47 tópicos com visualização passo a passo, código
// Python e problemas do LeetCode", e 11 dos 47 não têm NENHUM dos três. É o
// mesmo corte que o site usa para marcar "em breve" no menu e mandar `noindex`
// para o Google, então a página afirmava, para quem busca, o contrário do que
// ela própria declara para o buscador.
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
