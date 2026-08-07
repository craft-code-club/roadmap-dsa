import { test as base, expect, type Page } from "@playwright/test";

// Fixture: reprovar o teste quando a PÁGINA reclama.
//
// Por que existe: até aqui nenhum dos 37 arquivos de `tests/` escutava
// `pageerror`, `console` ou `requestfailed`. Um `throw` dentro de um handler de
// clique, um erro de hidratação do React ou um chunk 404 não faziam **nada**
// falhar — a asserção seguinte olhava o DOM, encontrava o que esperava (porque
// o erro aconteceu depois da renderização, ou num caminho que o teste não
// cobre) e a suíte ficava verde por cima de um defeito real.
//
// Como usar, num spec novo:
//
//     import { test, expect } from "./fixtures/console-limpo";
//
// e pronto: a fixture é `auto`, então vale para todo teste do arquivo sem
// precisar declarar nada. O `await use()` é o corpo do teste; o que vem depois
// dele é o **afterEach** desta fixture, e é lá que a asserção mora.
//
// O que ela captura, e por quê:
//
// | evento          | o que pega                                                |
// |-----------------|-----------------------------------------------------------|
// | `pageerror`     | exceção não tratada no cliente (o handler que estourou)    |
// | `console` error | erro de hidratação, aviso do React, `console.error` nosso  |
// | `requestfailed` | recurso que nem chegou a responder (DNS, abort, conexão)   |
// | resposta >= 400 | chunk/imagem/página 404 ou 500 servida pelo `out/`         |
//
// A última linha é a que pega o caso mais silencioso de todos num site
// estático: o `<script src=".../chunk-abc.js">` que sumiu do `out/`. O
// navegador não emite `pageerror` por isso, e a página só fica sem interação.

/** Uma ocorrência já formatada, do jeito que vai aparecer no `Received`. */
type Ocorrencia = string;

/** Escapa o que é metacaractere de regex, para interpolar URL em `RegExp`. */
function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Ruído tolerado, com o motivo escrito. **Depende do `baseURL`**, por isso é
 * função e não constante: a tolerância vale para o site sob teste, e para mais
 * nada.
 *
 * Medido antes de ligar o guarda, em 13 rotas (as 5 da amostra do axe mais as 8
 * do celular), desktop e 390x844: **zero** `pageerror`, **zero** `console.error`
 * e **zero** resposta >= 400. A única coisa que aparece é `ERR_ABORTED`, nos
 * dois casos de baixo: o prefetch do próprio Next e o beacon do GA4.
 *
 * Regra para acrescentar: a entrada tem que ser específica (nada de `/./`) e
 * vir com comentário dizendo o que é e por que não dá para consertar agora.
 *
 * Sem `baseURL` definido a lista fica **vazia**, e nada é tolerado. É de
 * propósito: um teste barulhento é melhor que um guarda que engole em silêncio
 * porque a configuração mudou de baixo dele.
 */
export function ruidoTolerado(baseURL: string | undefined): RegExp[] {
  if (!baseURL) return [];
  const origem = escaparRegex(baseURL.replace(/\/$/, ""));
  return [
    // O `<Link>` do Next dispara prefetch da rota apontada; sair da página antes
    // de o prefetch terminar cancela a requisição, e o cancelamento chega aqui
    // como `requestfailed ... net::ERR_ABORTED`. Medido: 104 ocorrências numa
    // passagem por 13 rotas, todas em URL de rota do próprio site, e nenhuma com
    // efeito nenhum na página. Só `ERR_ABORTED` entra: qualquer outro motivo
    // (`ERR_CONNECTION_REFUSED`, `ERR_NAME_NOT_RESOLVED`, `ERR_FAILED`) continua
    // reprovando. E recurso que de fato sumiu do `out/` não passa por aqui: ele
    // vira `http 404`, que o listener de resposta pega.
    //
    // A âncora no `baseURL` é o que impede a tolerância de vazar: um
    // `ERR_ABORTED` de domínio de fora (um `<script>` de terceiro, um `fetch`
    // para uma API externa, um embed) **reprova**, porque ali o cancelamento não
    // tem explicação conhecida. Antes desta âncora o padrão era `.*` e engolia
    // qualquer host.
    new RegExp(`^requestfailed: ${origem}(/[^\\s]*)? \\(net::ERR_ABORTED\\)$`),

    // O beacon de `page_view` do GA4. O `gtag.js` dispara o `/g/collect` e não
    // espera resposta — é telemetria, o navegador cancela a requisição quando a
    // página fecha, e o Chromium reporta isso como `net::ERR_ABORTED`. É o
    // comportamento normal do GA, não erro do site: nenhuma medição depende da
    // resposta, e a mesma requisição é reenviada na próxima visita.
    //
    // Por que só apareceu depois do #63: a entrada de cima passou a ser ancorada
    // no `baseURL` (antes era `.*` e engolia qualquer host). O GA é host de
    // fora, então deixou de ser tolerado — e, ao mesmo tempo, o CI de PR nunca
    // viu isso, porque o `NEXT_PUBLIC_GA_ID` só é injetado no build da `main`
    // (`.github/workflows/cloudflare-pages-deploy.yml`) e sem o ID o site não
    // pede byte nenhum de analytics. Ou seja: é um caso que só existe no job
    // que testa o artefato que vai ao ar.
    //
    // O que esta entrada NÃO tolera, de propósito:
    //   · outro host — a tolerância nomeia o do GA e mais nenhum;
    //   · outro caminho do próprio GA (`/analytics.js`, por exemplo): só o
    //     endpoint de coleta, que é o único que é disparado sem esperar;
    //   · outro motivo de falha (`ERR_CONNECTION_REFUSED`, `ERR_FAILED`...);
    //   · resposta >= 400, que nem passa por aqui: ela vira `http 404: ...` no
    //     listener de resposta e continua reprovando.
    //
    // Os endpoints regionais (`region1.google-analytics.com` e irmãos) entram
    // porque o GA4 escolhe o host pela origem do tráfego: o runner de hoje bate
    // no `www`, e um runner na Europa bateria no regional com exatamente o
    // mesmo significado.
    new RegExp(
      "^requestfailed: https://(www|region\\d+)\\.google-analytics\\.com/g/collect" +
        "(\\?[^\\s]*)? \\(net::ERR_ABORTED\\)$"
    ),
  ];
}

/**
 * Liga os quatro listeners numa página e devolve o array **vivo** de
 * ocorrências (ele cresce sozinho conforme a página fala).
 *
 * É exportado, e não escondido dentro da fixture, para que
 * `console-limpo-fixture.spec.ts` consiga provar em Chromium de verdade o que a
 * tolerância deixa passar e o que ela reprova — sem reimplementar a formatação
 * da string, que é justamente onde um teste de regex puro descolaria do
 * comportamento.
 */
export function coletarErros(page: Page, baseURL: string | undefined): Ocorrencia[] {
  const tolerado = ruidoTolerado(baseURL);
  const ocorrencias: Ocorrencia[] = [];
  const registrar = (o: Ocorrencia) => {
    if (!tolerado.some((r) => r.test(o))) ocorrencias.push(o);
  };

  page.on("pageerror", (erro) => {
    registrar(`pageerror: ${erro.message}`);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") registrar(`console.error: ${msg.text()}`);
  });
  page.on("requestfailed", (req) => {
    registrar(`requestfailed: ${req.url()} (${req.failure()?.errorText ?? "sem motivo"})`);
  });
  page.on("response", (res) => {
    if (res.status() >= 400) registrar(`http ${res.status()}: ${res.url()}`);
  });

  return ocorrencias;
}

export const test = base.extend<{ semErroDeConsole: void }>({
  semErroDeConsole: [
    async ({ page, baseURL }, use) => {
      const ocorrencias = coletarErros(page, baseURL);

      await use();

      // Daqui para baixo é o afterEach. Falha em teardown de fixture reprova o
      // teste no relatório do Playwright, com o array inteiro no `Received`.
      expect(
        ocorrencias,
        "a página emitiu erro. Se for ruído legítimo, declare em `ruidoTolerado()` com o motivo"
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
