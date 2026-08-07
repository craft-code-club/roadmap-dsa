import { test, expect } from "@playwright/test";
import { coletarErros } from "./fixtures/console-limpo";

// O guarda do guarda: prova o que a tolerância de ruído deixa passar.
//
// POR QUE EXISTE
// A tolerância de ruído (hoje `ruidoTolerado()`, na fixture) começou como uma
// constante com `^requestfailed: .* \(net::ERR_ABORTED\)$`. O
// `.*` casa qualquer host, então um `ERR_ABORTED` de domínio de fora — um
// `<script>` de terceiro, um `fetch` para API externa, um embed — era engolido
// em silêncio pelo mesmo padrão escrito para o prefetch do Next. Uma allowlist
// larga demais não faz nenhum teste ficar vermelho: ela faz o guarda inteiro
// perder o sentido sem avisar ninguém.
//
// POR QUE ELE USA `coletarErros` DIRETO, E NÃO A FIXTURE
// A fixture reprova o teste no teardown. Um teste que provasse a reprovação de
// dentro dela precisaria falhar para passar. Então aqui a página é criada à
// mão, os mesmos listeners são ligados pela MESMA função que a fixture usa
// (`coletarErros`), e a asserção olha o array que ela devolve. É Chromium de
// verdade, evento `requestfailed` de verdade e a mesma formatação de string —
// não uma reimplementação do regex, que é onde um teste de unidade descolaria
// do comportamento.
//
// COMO O ABORTO É PRODUZIDO
// `route.abort("aborted")` faz o Chromium reportar `net::ERR_ABORTED`, o mesmo
// texto que o prefetch cancelado do Next produz. É determinístico e não depende
// de rede: o domínio `.test` abaixo é reservado (RFC 2606) e nunca é resolvido.

/** URL do próprio site: o caso que o prefetch do Next produz de verdade. */
const CAMINHO_PROPRIO = "/aborta-me-do-proprio-site.js";
/** Domínio de fora: o caso que o `.*` engolia. */
const URL_DE_FORA = "https://cdn.exemplo-de-fora.test/aborta-me-de-fora.js";

test("a tolerância de ERR_ABORTED vale para o site, e não para domínio de fora", async ({
  browser,
  baseURL,
}) => {
  // Falhar cedo, e por escrito. Sem `baseURL` a tolerância sai VAZIA (é
  // exatamente o que o teste seguinte prova), então este aqui reprovaria lá
  // embaixo, na comparação de arrays, por um motivo que o diff não conta — e
  // ainda montaria `undefined/aborta-me-...` nas URLs. O caso sem `baseURL` tem
  // dono, e é o outro teste; aqui ele é pré-condição.
  expect(baseURL, "este teste exige `use.baseURL` no playwright.config.ts").toBeTruthy();

  const page = await browser.newPage({ baseURL });
  const ocorrencias = coletarErros(page, baseURL);

  // Só as três URLs de mentira passam pelo roteador; o resto da página carrega
  // normalmente, servido pelo `out/`.
  await page.route(/aborta-me/, (route) => route.abort("aborted"));
  await page.route(/recusa-me/, (route) => route.abort("connectionrefused"));

  await page.goto("/");

  const proprio = `${baseURL}${CAMINHO_PROPRIO}`;
  const recusado = `${baseURL}/recusa-me-do-proprio-site.js`;
  const motivos = new Map<string, string>();

  for (const url of [proprio, URL_DE_FORA, recusado]) {
    const falhou = page.waitForEvent("requestfailed", (r) => r.url() === url);
    await page.evaluate((u) => {
      void fetch(u, { mode: "no-cors" }).catch(() => {});
    }, url);
    const req = await falhou;
    motivos.set(url, req.failure()?.errorText ?? "sem motivo");
  }

  // Primeiro: o cenário é o que dissemos que é. Sem isto, um dia o Chromium
  // troca o texto do erro, os dois lados param de casar e o teste fica verde
  // provando nada.
  expect(motivos.get(proprio), "o aborto do próprio site").toBe("net::ERR_ABORTED");
  expect(motivos.get(URL_DE_FORA), "o aborto do domínio de fora").toBe("net::ERR_ABORTED");
  expect(motivos.get(recusado), "a conexão recusada do próprio site").toBe(
    "net::ERR_CONNECTION_REFUSED"
  );

  // Agora o que importa: dos três, só o do próprio site com ERR_ABORTED é
  // tolerado. Os outros dois chegam ao array e reprovariam o teste real.
  const registradas = ocorrencias.filter((o) => /aborta-me|recusa-me/.test(o));
  expect(
    registradas,
    "o aborto do próprio site tem que ser tolerado; o de fora e o recusado, não"
  ).toEqual([
    `requestfailed: ${URL_DE_FORA} (net::ERR_ABORTED)`,
    `requestfailed: ${recusado} (net::ERR_CONNECTION_REFUSED)`,
  ]);

  await page.close();
});

// ---------------------------------------------------------------------------
// A segunda tolerância: o beacon do GA4.
//
// Ela nasce com o mesmo risco da primeira, e por isso ganha o mesmo tratamento:
// uma tolerância escrita para "o beacon do Google Analytics" pode, se o regex
// for largo, acabar engolindo QUALQUER coisa do domínio do Google — inclusive um
// 404, que é justamente o sintoma de recurso que sumiu do `out/`. Este teste
// fixa os quatro lados: o que passa, e os três vizinhos que continuam
// reprovando.
// ---------------------------------------------------------------------------

/** O beacon de verdade: `/g/collect` com a query que o gtag.js monta. */
const GA_BEACON =
  "https://www.google-analytics.com/g/collect?v=2&tid=G-EXEMPLO&en=page_view&_p=1";
/** Mesmo endpoint, servido com 404: chunk sumido não pode virar ruído tolerado. */
const GA_404 = "https://www.google-analytics.com/g/collect?v=2&tid=G-EXEMPLO&caso=404";
/** Mesmo endpoint, outro motivo de falha. */
const GA_RECUSADO = "https://www.google-analytics.com/g/collect?v=2&tid=G-EXEMPLO&caso=recusa";
/** Mesmo host, OUTRO caminho: a tolerância é do endpoint de coleta, não do domínio. */
const GA_OUTRO_CAMINHO = "https://www.google-analytics.com/analytics.js";

test("a tolerância do GA vale para o beacon abortado, e não para o 404 nem para o resto do domínio", async ({
  browser,
  baseURL,
}) => {
  expect(baseURL, "este teste exige `use.baseURL` no playwright.config.ts").toBeTruthy();

  const page = await browser.newPage({ baseURL });
  const ocorrencias = coletarErros(page, baseURL);

  // Nenhuma destas URLs sai da máquina: o roteador responde por todas antes de a
  // requisição virar rede. É o que torna o teste determinístico e o que evita
  // mandar pageview de mentira para o Google.
  //
  // A ordem importa, e é o contrário da intuição: no Playwright o handler
  // registrado por ÚLTIMO é consultado primeiro. Por isso o pega-tudo vem antes
  // dos dois casos específicos — invertido, ele responderia por todos e os dois
  // `route` de baixo nunca rodariam, deixando o teste verde provando um caso só.
  await page.route(/google-analytics\.com/, (route) => route.abort("aborted"));
  await page.route(GA_404, (route) => route.fulfill({ status: 404, body: "" }));
  await page.route(GA_RECUSADO, (route) => route.abort("connectionrefused"));

  await page.goto("/");

  // O 404 é o único que não chega por `requestfailed`: ele RESPONDE, e quem o
  // registra é o listener de resposta. Esperar o evento certo para cada caso é o
  // que impede o teste de medir uma corrida em vez do comportamento.
  const resposta404 = page.waitForEvent("response", (r) => r.url() === GA_404);
  await page.evaluate((u) => {
    void fetch(u, { mode: "no-cors" }).catch(() => {});
  }, GA_404);
  expect((await resposta404).status(), "o cenário do 404 é o que dissemos que é").toBe(404);

  const motivos = new Map<string, string>();
  for (const url of [GA_BEACON, GA_RECUSADO, GA_OUTRO_CAMINHO]) {
    const falhou = page.waitForEvent("requestfailed", (r) => r.url() === url);
    await page.evaluate((u) => {
      void fetch(u, { mode: "no-cors" }).catch(() => {});
    }, url);
    const req = await falhou;
    motivos.set(url, req.failure()?.errorText ?? "sem motivo");
  }

  // Primeiro o cenário, como no teste de cima: se o Chromium trocar o texto do
  // erro, é aqui que a gente descobre, e não numa comparação de arrays que
  // passaria a provar outra coisa.
  expect(motivos.get(GA_BEACON), "o beacon abortado").toBe("net::ERR_ABORTED");
  expect(motivos.get(GA_OUTRO_CAMINHO), "o outro caminho, abortado").toBe("net::ERR_ABORTED");
  expect(motivos.get(GA_RECUSADO), "a conexão recusada").toBe("net::ERR_CONNECTION_REFUSED");

  const registradas = ocorrencias.filter((o) => o.includes("google-analytics.com"));
  expect(
    registradas,
    "só o beacon abortado é tolerado: o 404, a recusa e o outro caminho do mesmo host reprovam"
  ).toEqual([
    `http 404: ${GA_404}`,
    `requestfailed: ${GA_RECUSADO} (net::ERR_CONNECTION_REFUSED)`,
    `requestfailed: ${GA_OUTRO_CAMINHO} (net::ERR_ABORTED)`,
  ]);

  await page.close();
});

test("sem baseURL nada é tolerado, nem o prefetch do próprio site", async ({ browser }) => {
  // A porta de saída segura: se a configuração perder o `baseURL`, o guarda
  // fica barulhento em vez de mudo. Um guarda mudo é pior que guarda nenhum,
  // porque some da conta de quem confia nele.
  const page = await browser.newPage();
  const ocorrencias = coletarErros(page, undefined);

  await page.route(/aborta-me/, (route) => route.abort("aborted"));
  await page.goto("about:blank");

  const url = "https://cdn.exemplo-de-fora.test/aborta-me-sem-base.js";
  const falhou = page.waitForEvent("requestfailed", (r) => r.url() === url);
  await page.evaluate((u) => {
    void fetch(u, { mode: "no-cors" }).catch(() => {});
  }, url);
  await falhou;

  expect(ocorrencias).toEqual([`requestfailed: ${url} (net::ERR_ABORTED)`]);

  await page.close();
});
