import { test, expect, type Page } from "@playwright/test";

import {
  comNumero,
  dataLonga,
  diaIso,
  plural,
  thousands,
  thousandsDecimal,
  thousandsSigned,
} from "../src/lib/format";
import { DEFAULT_SPEEDS, SPEED_LABELS } from "../src/lib/visualizer";

// Os utilitários que estavam copiados em `content/visualizers/`, agora em
// `src/lib/format.ts` — e a prova de que unificar não mexeu numa palavra da tela.
//
// A parte que importa NÃO é o teste de unidade lá embaixo. É a primeira metade:
// as frases são montadas em EXECUÇÃO, dentro de template literal, e o HTML do
// build só carrega o passo 0. Só percorrendo a animação e lendo a frase inteira
// dá para ver a diferença entre "Achei, depois de 1 comparação." e "Achei,
// depois de comparação." — as duas compilam, e as duas passam por qualquer
// contagem de elemento.
//
// Por isso cada asserção aqui lê a FRASE, com o número junto da palavra, nos
// presets que exercitam singular E plural. Trocar `comNumero` por `plural` (ou
// o contrário) reprova com o texto quebrado no `Received`.

const CONGELA =
  "*, *::before, *::after { transition: none !important; animation: none !important; }";

async function preparar(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: CONGELA });
}

/** Abre o painel expandido da peça `i` da página e devolve o `<figure>` dele. */
async function expandir(page: Page, url: string, i: number) {
  await page.goto(url);
  await preparar(page);
  await page.locator("article figure.viz").nth(i).getByRole("button", { name: /Expandir/ }).click();
  const painel = page.locator(".viz-overlay figure.viz");
  await expect(painel).toBeVisible();
  await preparar(page);
  return painel;
}

// ---------------------------------------------------------------------------
// 1 · O plural que TRAZ o número: HashTableBuscaVisualizer
//
// Aqui a frase não escreve o número em separado — quem escreve é a função. Se
// ela passar a devolver só a palavra, sai "Achei, depois de comparações." e o
// `tsc` não reclama, porque a assinatura é a mesma.
// ---------------------------------------------------------------------------

const HASH = "/topico/hash-table/";

/**
 * A ordem das peças na página, que é o que o `nth()` endereça.
 *
 * Em `/topico/hash-table/` o `HashTableOperacoes` é tabela estática, sem casca
 * e sem overlay: ele não conta. Em `/topico/strings/` as três peças contam.
 */
const HASH_BUSCA = 1;
const STRINGS_CONCAT = 1; // 0 é o StringsBytesVisualizer
const STRINGS_ROTATE = 2;

/** Clica "Próximo ›" enquanto ele estiver habilitado, no máximo `max` vezes. */
async function avancar(painel: import("@playwright/test").Locator, max: number) {
  const proximo = painel.getByRole("button", { name: /Próximo/ });
  for (let k = 0; k < max; k++) {
    if (await proximo.isDisabled()) return;
    await proximo.click();
  }
}

test("busca linear: a frase de acerto traz o número junto da palavra, no singular e no plural", async ({
  page,
}) => {
  const painel = await expandir(page, HASH, HASH_BUSCA);
  const nota = painel.locator(".ht-painel").first().locator("p.viz-note");
  const proximo = painel.getByRole("button", { name: /Próximo/ });

  // Cenário com o alvo na PRIMEIRA posição: uma comparação só, singular.
  await painel.getByRole("button", { name: "Alvo na primeira posição" }).click();
  for (let k = 0; k < 12; k++) {
    if ((await nota.innerText()).includes("é o alvo")) break;
    await proximo.click();
  }
  expect(await nota.innerText()).toContain('Posição 0: "Ana" é o alvo. Achei, depois de 1 comparação.');

  // Mesmo visualizador, alvo no FIM: oito comparações, plural.
  await painel.getByRole("button", { name: "Alvo no fim da lista" }).click();
  for (let k = 0; k < 12; k++) {
    if ((await nota.innerText()).includes("é o alvo")) break;
    await proximo.click();
  }
  expect(await nota.innerText()).toContain('Posição 7: "Mia" é o alvo. Achei, depois de 8 comparações.');
});

test("busca linear: a abertura e o cartão de comparações escrevem o número que a palavra concorda", async ({
  page,
}) => {
  const painel = await expandir(page, HASH, HASH_BUSCA);
  await painel.getByRole("button", { name: "Alvo no fim da lista" }).click();

  // Passo 0, antes de qualquer clique: a nota abre contando os nomes.
  const nota = painel.locator(".ht-painel").first().locator("p.viz-note");
  expect(await nota.innerText()).toContain("8 nomes guardados e nenhuma ordem que me ajude");

  // O cartão ao lado do título do painel: número E palavra no mesmo elemento.
  // Ler só o número aprovaria "8" debaixo de "comparação".
  const cartao = painel.locator(".ht-painel").first().locator(".ht-painel-tit em");
  expect(await cartao.innerText()).toBe("0 comparações");

  const proximo = painel.getByRole("button", { name: /Próximo/ });
  await proximo.click();
  expect(await cartao.innerText()).toBe("1 comparação");
  await proximo.click();
  expect(await cartao.innerText()).toBe("2 comparações");
});

test("o resumo do pior caso compara os dois números sem perder a palavra", async ({ page }) => {
  const painel = await expandir(page, HASH, HASH_BUSCA);
  await painel.getByRole("button", { name: "Com hash ruim" }).click();

  const resumo = painel.locator("p.viz-note").last();
  await avancar(painel, 30);

  expect(await resumo.innerText()).toContain(
    "Com todas as chaves no mesmo bucket, a tabela hash faz 8 comparações, o mesmo trabalho da lista."
  );
});

// ---------------------------------------------------------------------------
// 2 · O plural que devolve SÓ a palavra: StringsVisualizer e Strings Rotate
//
// Aqui o número já está escrito na frase, ao lado da chamada. Se a função
// passar a trazer o número, sai "aloco uma string nova de 1 1 caractere".
// ---------------------------------------------------------------------------

test("montar string caractere a caractere: a volta 1 fala no singular e a volta 2 no plural", async ({
  page,
}) => {
  const painel = await expandir(page, "/topico/strings/", STRINGS_CONCAT);
  const nota = painel.locator("p.viz-note");
  const proximo = painel.getByRole("button", { name: /Próximo/ });

  await proximo.click();
  await expect(nota).toContainText("Volta 1: aloco uma string nova de 1 caractere,");
  expect(await nota.innerText()).toContain("1 cópia nesta volta, 1 no total.");

  await proximo.click();
  await expect(nota).toContainText("Volta 2: aloco uma string nova de 2 caracteres,");
  expect(await nota.innerText()).toContain("2 cópias nesta volta, 3 no total.");
});

test("rotate string: o prefixo que bate concorda sem duplicar o número", async ({ page }) => {
  const painel = await expandir(page, "/topico/strings/", STRINGS_ROTATE);
  const nota = painel.locator("p.viz-note");
  const proximo = painel.getByRole("button", { name: /Próximo/ });

  // A primeira nota de rotação escreve o tamanho da fatia copiada.
  for (let k = 0; k < 10; k++) {
    if ((await nota.innerText()).includes("Rotação 1:")) break;
    await proximo.click();
  }
  const texto = await nota.innerText();
  expect(texto).toContain("Rotação 1: s[1:] já é uma string nova com 4 caracteres copiados");
  // O número aparece UMA vez antes da palavra, nunca duas.
  expect(texto).not.toMatch(/\b(\d+) \1 /);
});

// ---------------------------------------------------------------------------
// 3 · As três variantes do formatador de milhar
//
// Elas tinham o MESMO nome (`num`) em arquivos diferentes e produziam texto de
// tela diferente. Estes casos fixam o que cada uma faz, para a próxima pessoa
// não "unificar" as três em uma.
// ---------------------------------------------------------------------------

test("thousands arredonda e agrupa; thousandsDecimal guarda a casa; thousandsSigned trunca em vez de arredondar", () => {
  // O caso comum: contador de operações, de cópias, de bytes.
  expect(thousands(0)).toBe("0");
  expect(thousands(999)).toBe("999");
  expect(thousands(1000)).toBe("1.000");
  expect(thousands(1234567)).toBe("1.234.567");
  expect(thousands(1234.6)).toBe("1.235"); // arredonda, não trunca

  // A variante do gráfico do Big O: sem ela, "1,4 bi" sairia como "1 bi".
  expect(thousandsDecimal(1.4)).toBe("1,4");
  expect(thousandsDecimal(2)).toBe("2"); // inteiro não ganha ",0"
  expect(thousandsDecimal(1234.56)).toBe("1.234,6");
  // O ponto do milhar não pode invadir a casa decimal.
  expect(thousandsDecimal(12345.6)).toBe("12.345,6");

  // A variante do overflow, onde INT_MIN é o valor central.
  expect(thousandsSigned(-2147483648)).toBe("-2.147.483.648");
  expect(thousandsSigned(2147483647)).toBe("2.147.483.647");
  expect(thousandsSigned(0)).toBe("0");
  expect(thousandsSigned(-1)).toBe("-1");

  // O que separa essa variante da primeira é o TRUNCAR, e não o sinal. A cópia
  // que ela substituiu afirmava o contrário, no comentário logo acima dela: que
  // o "-" na frente desloca os pontos do agrupamento. Não desloca — em
  // JavaScript `\B` nunca casa depois do "-", porque ali há fronteira de
  // palavra. Estas duas linhas são a medição dessa afirmação, e elas reprovam
  // se alguém "consertar" o agrupamento acreditando no comentário antigo.
  expect(thousands(-2147483648)).toBe("-2.147.483.648");
  expect(thousands(-1234567)).toBe(thousandsSigned(-1234567));

  // A diferença que sobra, e é ela que impede fundir as duas: valor fracionário.
  expect(thousandsSigned(-1999.9)).toBe("-1.999");
  expect(thousands(-1999.9)).toBe("-2.000");
  expect(thousandsSigned(-999.6)).toBe("-999");
  expect(thousands(-999.6)).toBe("-1.000");

  // A prova de que as três NÃO são a mesma função com nomes diferentes.
  expect(thousandsDecimal(1234.56)).not.toBe(thousands(1234.56));
  expect(thousandsSigned(-1999.9)).not.toBe(thousands(-1999.9));
});

test("plural devolve só a palavra e comNumero devolve número mais palavra", () => {
  expect(plural(1, "caractere", "caracteres")).toBe("caractere");
  expect(plural(0, "caractere", "caracteres")).toBe("caracteres");
  expect(plural(2, "caractere", "caracteres")).toBe("caracteres");

  expect(comNumero(1, "comparação", "comparações")).toBe("1 comparação");
  expect(comNumero(0, "comparação", "comparações")).toBe("0 comparações");
  expect(comNumero(8, "comparação", "comparações")).toBe("8 comparações");

  // O erro que o `tsc` aprovava: mesma assinatura, retorno incompatível.
  expect(`Achei depois de ${comNumero(3, "comparação", "comparações")}.`).toBe(
    "Achei depois de 3 comparações."
  );
  expect(`${3} ${plural(3, "cópia", "cópias")}`).toBe("3 cópias");
  // Trocados, sairia isto — e é o que as asserções acima impedem.
  expect(`Achei depois de ${plural(3, "comparação", "comparações")}.`).toBe(
    "Achei depois de comparações."
  );
  expect(`${3} ${comNumero(3, "cópia", "cópias")}`).toBe("3 3 cópias");
});

// ---------------------------------------------------------------------------
// 4 · Os `SPEEDS` que já eram o padrão do hook
//
// Onze visualizadores declaravam `[0, 1400, 950, 650, 420, 250]` e passavam a
// prop `speeds` com exatamente o valor que o hook já usa quando ninguém passa
// nada. Eles pararam de passar. Os outros vinte e quatro têm marcha própria e
// ficaram como estavam.
//
// A prova de que isso não mudou nada tem duas partes: o padrão do hook continua
// sendo AQUELE array (se alguém reafinar `DEFAULT_SPEEDS`, este teste avisa, e
// aí a decisão volta a ser consciente), e a marcha continua NOMEADA na tela de
// quem deixou de passar a prop.
// ---------------------------------------------------------------------------

test("o padrão do hook é o array que os onze visualizadores deixaram de repetir", () => {
  expect([...DEFAULT_SPEEDS]).toEqual([0, 1400, 950, 650, 420, 250]);
  expect(DEFAULT_SPEEDS.length).toBe(SPEED_LABELS.length);
});

test("sem a prop `speeds`, o controle de velocidade continua nomeando as marchas", async ({
  page,
}) => {
  // A fila é uma das onze que deixaram de passar a prop.
  const painel = await expandir(page, "/topico/filas/", 0);
  const slider = painel.getByRole("slider", { name: "Velocidade" });

  // Marcha inicial: a terceira do array, que a tela chama de "1x".
  await expect(slider).toHaveAttribute("aria-valuetext", "1x");
  expect(await painel.locator(".viz-speed .val").innerText()).toBe("1x");

  await slider.fill("5");
  await expect(slider).toHaveAttribute("aria-valuetext", "2x");
  expect(await painel.locator(".viz-speed .val").innerText()).toBe("2x");

  await slider.fill("1");
  await expect(slider).toHaveAttribute("aria-valuetext", "0.5x");
  expect(await painel.locator(".viz-speed .val").innerText()).toBe("0.5x");
});

// ---------------------------------------------------------------------------
// 5 · As datas do selo "Atualizado em"
//
// Por que esta seção existe, e o que ela conserta: os testes de navegador
// conferem o selo comparando o texto renderizado com `dataLonga(new
// Date(datetime))` — ou seja, com A PRÓPRIA função que gerou o texto. Isso
// prova que o atributo e o texto CONCORDAM, que é metade do que importa, e não
// prova nada sobre o valor estar certo: trocar a tabela de meses inteira, ou
// passar de UTC para o fuso da máquina, muda os dois lados junto e deixa a
// suíte verde com o site mostrando outra data.
//
// Daí o oráculo escrito à mão aqui embaixo. Nenhuma asserção desta seção chama
// `dataLonga` dos dois lados da comparação.
// ---------------------------------------------------------------------------

/** Os doze meses, escritos à mão. Se a tabela do `format.ts` mudar, morre aqui. */
const MESES_ESPERADOS: ReadonlyArray<readonly [string, string]> = [
  ["2026-01-09T12:00:00.000Z", "9 de janeiro de 2026"],
  ["2026-02-28T12:00:00.000Z", "28 de fevereiro de 2026"],
  ["2026-03-01T12:00:00.000Z", "1 de março de 2026"],
  ["2026-04-30T12:00:00.000Z", "30 de abril de 2026"],
  ["2026-05-15T12:00:00.000Z", "15 de maio de 2026"],
  ["2026-06-12T12:00:00.000Z", "12 de junho de 2026"],
  ["2026-07-04T12:00:00.000Z", "4 de julho de 2026"],
  ["2026-08-03T12:00:00.000Z", "3 de agosto de 2026"],
  ["2026-09-21T12:00:00.000Z", "21 de setembro de 2026"],
  ["2026-10-10T12:00:00.000Z", "10 de outubro de 2026"],
  ["2026-11-02T12:00:00.000Z", "2 de novembro de 2026"],
  ["2026-12-31T12:00:00.000Z", "31 de dezembro de 2026"],
];

test("dataLonga escreve a data por extenso em português, mês a mês", () => {
  for (const [iso, esperado] of MESES_ESPERADOS) {
    expect(dataLonga(new Date(iso)), iso).toBe(esperado);
  }
  // O dia NÃO leva zero à esquerda: "1 de março", não "01 de março". É o que
  // se escreve em português, e um `padStart` copiado do `diaIso` quebraria.
  expect(dataLonga(new Date("2026-03-01T12:00:00.000Z"))).not.toContain("01 de");
  // E `março` é a prova de que o arquivo não perdeu o acento numa reescrita.
  expect(dataLonga(new Date("2026-03-01T12:00:00.000Z"))).toContain("março");
});

test("diaIso devolve o dia em UTC, no formato que o atributo datetime aceita", () => {
  // Os dois lados da meia-noite UTC, com o resultado escrito à mão. É o caso
  // que decide entre UTC e fuso local, e o único jeito de o texto e o
  // `datetime` discordarem por um dia no ar.
  //
  //   23:30 em São Paulo (-03:00) já é o dia SEGUINTE em UTC;
  //   01:00 em Tóquio (+09:00) ainda é o dia ANTERIOR em UTC.
  expect(diaIso(new Date("2026-08-03T23:30:00.000-03:00"))).toBe("2026-08-04");
  expect(dataLonga(new Date("2026-08-03T23:30:00.000-03:00"))).toBe("4 de agosto de 2026");
  expect(diaIso(new Date("2026-08-04T01:00:00.000+09:00"))).toBe("2026-08-03");
  expect(dataLonga(new Date("2026-08-04T01:00:00.000+09:00"))).toBe("3 de agosto de 2026");

  // Vira o ano junto com a meia-noite.
  expect(diaIso(new Date("2025-12-31T21:00:00.000-05:00"))).toBe("2026-01-01");
  expect(dataLonga(new Date("2025-12-31T21:00:00.000-05:00"))).toBe("1 de janeiro de 2026");

  // Formato exato, com zero à esquerda — aqui ELE é obrigatório.
  expect(diaIso(new Date("2026-03-01T12:00:00.000Z"))).toBe("2026-03-01");
  expect(diaIso(new Date("2026-03-01T12:00:00.000Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

test("a data impressa não depende do fuso da máquina que rodou o build", () => {
  // O defeito que este teste existe para pegar: trocar `getUTCDate()` por
  // `getDate()`. Num runner em UTC — que é o caso da CI — a troca não muda
  // NADA, e todo teste que compare os dois lados no mesmo processo passa. O
  // estrago aparece quando o build roda noutro fuso: o mesmo commit vira duas
  // datas diferentes no HTML.
  //
  // Então o teste varre fusos de verdade e exige a MESMA resposta, com o valor
  // escrito à mão. `2026-08-04T02:30:00Z` é 23:30 do dia 3 em São Paulo: sob
  // `getDate()` este teste devolveria duas respostas e reprovaria.
  const instante = new Date("2026-08-04T02:30:00.000Z");
  const tzOriginal = process.env.TZ;
  const respostas = new Set<string>();
  let oFusoMudou = false;
  try {
    for (const tz of ["UTC", "America/Sao_Paulo", "Asia/Tokyo", "Pacific/Kiritimati"]) {
      process.env.TZ = tz;
      // Canário: se esta plataforma ignorar a troca de `TZ` (o Node avisa que
      // pode acontecer), o teste não pode PASSAR por não ter conseguido olhar.
      if (instante.getDate() !== instante.getUTCDate()) oFusoMudou = true;
      respostas.add(`${diaIso(instante)}|${dataLonga(instante)}`);
    }
  } finally {
    if (tzOriginal === undefined) delete process.env.TZ;
    else process.env.TZ = tzOriginal;
  }
  test.skip(
    !oFusoMudou,
    "esta plataforma não aplicou a troca de `process.env.TZ` em tempo de execução, " +
      "então a varredura de fusos não mediu nada. Os casos de meia-noite do teste acima, " +
      "com offset explícito no ISO, continuam valendo."
  );
  expect([...respostas], "a data mudou conforme o fuso do processo").toEqual([
    "2026-08-04|4 de agosto de 2026",
  ]);
});

test("o texto do selo e o atributo datetime são sempre o mesmo dia", () => {
  // A invariante de que o selo depende, e a única asserção desta seção que usa
  // as duas funções juntas: `dataLonga` do dia recortado por `diaIso` tem que
  // dar o mesmo texto que `dataLonga` do instante inteiro. É exatamente a
  // conta que o teste de navegador faz, aqui varrida sobre os horários que
  // costumam quebrá-la.
  const instantes = [
    "2026-08-03T00:00:00.000Z",
    "2026-08-03T23:59:59.999Z",
    "2026-01-01T00:00:00.000Z",
    "2026-12-31T23:59:59.999Z",
    "2026-08-03T23:30:00.000-03:00",
    "2026-08-04T01:00:00.000+09:00",
  ];
  for (const iso of instantes) {
    const d = new Date(iso);
    expect(dataLonga(new Date(diaIso(d))), iso).toBe(dataLonga(d));
  }
});
