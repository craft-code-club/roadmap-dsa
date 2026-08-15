import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ALL_TOPICS, TOTAL_TOPICS, isEmptyTopic } from "../content/fundamentos";

// A copy da home prometia "47 tópicos com visualização passo a passo, código
// Python e problemas do LeetCode", e 11 dos 47 não têm NENHUM dos três. É o
// mesmo corte que o site usa para marcar "em breve" no menu e mandar `noindex`
// para o Google, então a página afirmava, para quem busca, o contrário do que
// ela própria declara para o buscador.
//
// Os dois testes de número LEEM A FONTE (`content/fundamentos.ts`) em vez de fixar
// 36 e 47: no dia em que um tópico ganhar material eles continuam verdes, e o
// que eles protegem não é o valor, é a ESCOLHA entre os dois números. Por isso
// vem junto a asserção do outro lado: a frase que fala do tamanho da trilha
// ("tópicos nos Fundamentos", o título) tem que continuar com o total. Trocar a
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

test("o total dos Fundamentos continua onde ele é verdade: título e card", async ({ page }) => {
  await page.goto("/");

  // O título fala do tamanho da espinha, não do que cada tópico entrega: é o
  // mesmo número que o /fundamentos/ lista.
  expect(await page.title()).toContain(`${TOTAL_TOPICS} Tópicos`);

  // Pelo RÓTULO, não pela posição: o card vizinho mostra 36 hoje ("tópicos com
  // visualização"), e um `.first()` daria um teste que passa lendo o número
  // errado.
  const cartao = page.locator(".stat").filter({ hasText: "tópicos nos Fundamentos" });
  await expect(cartao).toHaveCount(1);
  await expect(cartao.locator(".stat-n")).toHaveText(`${TOTAL_TOPICS}`);
});

// ---------------------------------------------------------------------------
// "open source" é verdade, e por isso tem que continuar dito.
//
// Este guarda já existiu ao contrário. Enquanto a licença era a PolyForm
// Noncommercial 1.0.0 — que proíbe uso comercial e por isso NÃO é open source
// pela definição da OSI —, um teste afirmava que a palavra não aparecia na
// home. O PR #71 relicenciou o CÓDIGO como MIT, a premissa caiu, e a asserção
// virou de lado: agora o risco não é prometer demais, é esconder algo
// verdadeiro por hábito.
//
// A palavra aparece em TRÊS lugares, e é por isso que o teste olha os três: se
// alguém consertar um e esquecer os outros, o site passa a dizer duas coisas
// diferentes sobre a mesma licença. O terceiro é o card de compartilhamento
// (`src/lib/og.tsx`), que já foi inventariado como "pendência a corrigir" na
// época da PolyForm — ele agora está CERTO, e este teste é o bilhete para quem
// for "consertá-lo" depois.
//
// Nota para quando o #71 estiver na `main`: o guarda mais forte é amarrar esta
// copy ao arquivo `LICENSE`, reprovando se o repositório voltar a uma licença
// que a OSI não reconhece. Não dá para escrever aqui ainda, porque nesta branch
// o `LICENSE` ainda é o antigo e o teste nasceria vermelho.
// ---------------------------------------------------------------------------

const OG = join(__dirname, "..", "src", "lib", "og.tsx");

test("a home diz 'open source' nos três lugares em que faz a afirmação", async ({ page }) => {
  await page.goto("/");

  // 1. O selo do topo. Pelo RÓTULO renderizado, não pelo HTML da fonte.
  const selo = page.locator(".hero-badge");
  await expect(selo).toHaveCount(1);
  await expect(selo).toContainText("open source");

  // 2. O rodapé. `.site-foot` é a mesma caixa que leva o link do GitHub, e a
  //    frase é a legenda dele.
  const rodape = page.locator(".site-foot .foot-text");
  await expect(rodape).toContainText(/open source/i);

  // 3. O card de compartilhamento. A imagem é gerada em build, então não há
  //    DOM para ler: a fonte é o único lugar onde dá para afirmar isso.
  expect(
    readFileSync(OG, "utf-8"),
    "src/lib/og.tsx perdeu o selo 'open source'; com MIT ele está correto e deve ficar"
  ).toContain('"open source"');
});
