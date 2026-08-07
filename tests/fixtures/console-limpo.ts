import { test as base, expect } from "@playwright/test";

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

/**
 * Ruído tolerado, com o motivo escrito.
 *
 * Medido antes de ligar o guarda, em 13 rotas (as 5 da amostra do axe mais as 8
 * do celular), desktop e 390x844: **zero** `pageerror`, **zero** `console.error`
 * e **zero** resposta >= 400. A única coisa que aparece é o `ERR_ABORTED` de
 * baixo, e ele é do próprio Next.
 *
 * Regra para acrescentar: a entrada tem que ser específica (nada de `/./`) e
 * vir com comentário dizendo o que é e por que não dá para consertar agora.
 */
export const RUIDO_TOLERADO: RegExp[] = [
  // O `<Link>` do Next dispara prefetch da rota apontada; sair da página antes
  // de o prefetch terminar cancela a requisição, e o cancelamento chega aqui
  // como `requestfailed ... net::ERR_ABORTED`. Medido: 104 ocorrências numa
  // passagem por 13 rotas, todas em URL de rota do próprio site, e nenhuma com
  // efeito nenhum na página. Só `ERR_ABORTED` entra: qualquer outro motivo
  // (`ERR_CONNECTION_REFUSED`, `ERR_NAME_NOT_RESOLVED`, `ERR_FAILED`) continua
  // reprovando. E recurso que de fato sumiu do `out/` não passa por aqui: ele
  // vira `http 404`, que o listener de resposta pega.
  /^requestfailed: .* \(net::ERR_ABORTED\)$/,
];

export const test = base.extend<{ semErroDeConsole: void }>({
  semErroDeConsole: [
    async ({ page }, use) => {
      const ocorrencias: Ocorrencia[] = [];
      const registrar = (o: Ocorrencia) => {
        if (!RUIDO_TOLERADO.some((r) => r.test(o))) ocorrencias.push(o);
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

      await use();

      // Daqui para baixo é o afterEach. Falha em teardown de fixture reprova o
      // teste no relatório do Playwright, com o array inteiro no `Received`.
      expect(
        ocorrencias,
        "a página emitiu erro. Se for ruído legítimo, declare em RUIDO_TOLERADO com o motivo"
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
