import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Os trechos de console do contrato (`content/visualizers/README.md`) precisam
// RODAR.
//
// O contrato é lido por agente e por contribuidor humano, e os dois colam esses
// trechos no console de uma página do build. Um trecho que se apresenta como
// executável e não é gasta o tempo de quem confiou nele — foi o caso do
// `document.querySelectorAll("article figure.viz")[N]`, com um `N` que nenhuma
// linha do arquivo declarava: `ReferenceError` antes da primeira medição.
//
// Este teste não lê o README procurando texto: ele EXECUTA cada bloco ```js do
// arquivo dentro da página real do `out/`, e afirma o formato do que volta. É a
// mesma regra da §8 aplicada ao próprio contrato — medir comportamento, não
// contar elemento.
//
// As páginas escolhidas são as que expõem as duas armadilhas de verdade:
//   `intervals`        — CINCO figuras `.viz-fit`, onde um `querySelector` sem
//                        índice mediria a peça errada em silêncio;
//   `arvores-binarias` — UMA figura `.viz-fit` e NENHUM `.viz-foot`, onde o
//                        `.getBoundingClientRect()` de um `null` estoura.
// ---------------------------------------------------------------------------

const README = join(__dirname, "..", "content", "visualizers", "README.md");

function blocos(linguagem: string): string[] {
  const fonte = readFileSync(README, "utf-8");
  const re = new RegExp("```" + linguagem + "\\n([\\s\\S]*?)```", "g");
  return [...fonte.matchAll(re)].map((m) => m[1]);
}

/** O bloco ```js do contrato que contém `marca`, e apenas ele. */
function trecho(marca: string): string {
  const achados = blocos("js").filter((b) => b.includes(marca));
  expect(
    achados,
    `esperava exatamente um bloco js contendo ${JSON.stringify(marca)}`
  ).toHaveLength(1);
  return achados[0];
}

/**
 * Roda o trecho como o leitor rodaria: colado no console.
 *
 * O `eval` indireto é de propósito, e não um atalho: ele tem a MESMA semântica
 * do console — aceita sequência de declarações e devolve o valor de conclusão
 * da última expressão. Envolver o trecho num `return (...)` seria mais simples e
 * provaria menos: um bloco que começa com `const` reprovaria com
 * `SyntaxError: Unexpected token 'const'` vindo do envelope, escondendo o
 * `TypeError` do próprio contrato. Medido nesta suíte antes de trocar.
 *
 * O erro volta como valor em vez de derrubar o `evaluate`, para que a asserção
 * reprove com a mensagem do `ReferenceError`/`TypeError` no `Received` — e não
 * com um estouro genérico que não diz qual linha do contrato está quebrada.
 */
async function rodarNoConsole(page: Page, codigo: string): Promise<unknown> {
  const resultado = await page.evaluate((fonte) => {
    try {
      const consoleEval = eval;
      return { ok: consoleEval(fonte) as unknown, erro: undefined as string | undefined };
    } catch (e) {
      return { ok: undefined as unknown, erro: String(e) };
    }
  }, codigo);
  expect(resultado.erro ?? null, "o trecho do contrato estourou no console").toBeNull();
  return resultado.ok;
}

async function abrir(page: Page, slug: string) {
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(`/topicos/${slug}/`);
  // As fontes chegam com `display: swap`: medir antes mede a de fallback.
  await page.evaluate(() => document.fonts.ready);
}

test.describe("os trechos de console do contrato rodam", () => {
  test("o custo do botão devolve com, sem e delta em números", async ({ page }) => {
    await abrir(page, "intervals");
    const r = (await rodarNoConsole(page, trecho("delta = o custo do botão"))) as {
      com: number;
      sem: number;
      delta: number;
    };

    // Não é `typeof` solto: uma string de guarda ("não há figura no índice 0")
    // também é um retorno válido do trecho, e passaria num teste frouxo.
    expect(typeof r, `o trecho devolveu ${JSON.stringify(r)}`).toBe("object");
    expect(Object.keys(r).sort()).toEqual(["com", "delta", "sem"]);
    expect(r.com).toBeGreaterThan(0);
    expect(r.sem).toBeGreaterThan(0);
    expect(r.delta).toBe(r.com - r.sem);
  });

  test("a medição da §8 diz quantas figuras a página tem, e mede a do índice", async ({
    page,
  }) => {
    await abrir(page, "intervals");
    const r = (await rodarNoConsole(page, trecho("cabecaColada"))) as {
      figuras: number;
      rola: boolean;
      cabecaColada: number;
      rodapeColado: number | string;
    };

    // Cinco peças a partir de três arquivos: é justamente a página onde
    // `document.querySelector("figure.viz-fit")` mediria a errada calado.
    expect(r.figuras, "o `intervals` monta cinco peças `.viz-fit`").toBe(5);
    expect(typeof r.rola).toBe("boolean");
    expect(r.cabecaColada).toBeLessThanOrEqual(2);
    expect(typeof r.rodapeColado, "esta peça TEM rodapé").toBe("number");
  });

  test("a medição da §8 não estoura em peça sem rodapé, e diz que não tem", async ({
    page,
  }) => {
    await abrir(page, "arvores-binarias");
    const r = (await rodarNoConsole(page, trecho("cabecaColada"))) as {
      figuras: number;
      rodapeColado: number | string;
    };

    expect(r.figuras).toBe(1);
    // Ler o rótulo, não só o número: o trecho tem de DIZER que não mediu, em vez
    // de devolver um `0` que passaria por medição válida.
    expect(r.rodapeColado).toBe("sem rodapé");
  });
});

test("o diff do rename tem de onde tirar o /tmp/antes.txt", async () => {
  // Terceira instância da mesma classe: um comando que depende de um arquivo
  // que nenhum outro comando do contrato produz sai com "No such file or
  // directory". Este teste não abre navegador — é leitura de texto de propósito,
  // porque o defeito é a AUSÊNCIA de um comando.
  const bash = blocos("bash");
  const comDiff = bash.filter((b) => b.includes("diff /tmp/antes.txt"));
  expect(comDiff, "esperava o bloco do diff do rename").toHaveLength(1);
  expect(
    comDiff[0],
    "o bloco usa /tmp/antes.txt sem nenhum comando que o gere"
  ).toMatch(/>\s*\/tmp\/antes\.txt/);
});
