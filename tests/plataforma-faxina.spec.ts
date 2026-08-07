import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { ALL_TOPICS, TOTAL_TOPICS, TOTAL_TOPICS_PRONTOS, isEmptyTopic } from "../content/roadmap";
import { SITE_URL } from "../src/lib/links";

// Faxina de plataforma: três coisas que nenhum teste anterior olhava, cada uma
// verificada onde ela existe de verdade.
//
// - `X-Frame-Options` mora no `_headers`, que não é HTML e não passa pelo
//   navegador: a prova é o ARTEFATO do build (`out/_headers`), mais a
//   confirmação de que o embed do YouTube, que é iframe de saída, continua de pé.
// - `color-scheme` mora no CSS: a prova é o valor COMPUTADO na página servida,
//   não o texto do arquivo. Ler o arquivo provaria que alguém digitou a linha,
//   não que ela chega ao navegador.
// - `TOTAL_TOPICS_PRONTOS` mora nos dados: a prova lê a fonte
//   (`content/roadmap.ts`) e amarra o número ao que o site já faz com o mesmo
//   critério, que é tirar do índice do Google quem não tem material. Teste que
//   lê a fonte não envelhece quando um tópico é publicado.

// ---------------------------------------------------------------- _headers

const HEADERS_ARTEFATO = join(__dirname, "..", "out", "_headers");

test("o `_headers` do build proíbe que o site seja embutido em frame de terceiro", () => {
  const conteudo = readFileSync(HEADERS_ARTEFATO, "utf8");

  // Sem comentários e sem linhas vazias: é o que o Cloudflare Pages de fato lê.
  const regras = conteudo
    .split("\n")
    .filter((l) => l.trim() !== "" && !l.trimStart().startsWith("#"));

  const i = regras.findIndex((l) => l.trim() === "/*");
  expect(i, "o `_headers` do build não tem a regra `/*`").toBeGreaterThanOrEqual(0);

  // O cabeçalho tem que estar DENTRO do bloco `/*`: uma linha indentada solta em
  // outro bloco aplicaria a regra só àquela rota, e o arquivo pareceria certo.
  const doBloco: string[] = [];
  for (const linha of regras.slice(i + 1)) {
    if (!linha.startsWith(" ") && !linha.startsWith("\t")) break;
    doBloco.push(linha.trim());
  }
  expect(doBloco).toContain("X-Frame-Options: DENY");

  // A faxina não pode ter atropelado o motivo original do arquivo: sem estas
  // duas regras, o card de Open Graph volta a sair como binário anônimo.
  expect(regras).toContain("/opengraph-image");
  expect(regras).toContain("/*/opengraph-image");
});

test("o embed do YouTube, que é iframe de SAÍDA, continua de pé e ocupando a caixa", async ({ page }) => {
  const comVideo = ALL_TOPICS.find((t) => t.youtube)!;
  await page.goto(`/topico/${comVideo.slug}/`);

  const frame = page.locator(".video-embed iframe");
  await expect(frame).toHaveCount(1);
  await expect(frame).toHaveAttribute("src", /youtube-nocookie\.com\/embed\//);

  // Existência não basta: um iframe de 0px passaria na asserção acima. E o ponto
  // do `X-Frame-Options` é a DIREÇÃO — ele governa quem embute as nossas
  // respostas, não o que as nossas páginas embutem —, então o que prova isso é
  // a caixa do embed continuar com tamanho de vídeo.
  const caixa = await frame.boundingBox();
  expect(caixa, "o iframe do vídeo não tem caixa").not.toBeNull();
  expect(caixa!.width, "o embed do YouTube colapsou na largura").toBeGreaterThan(200);
  expect(caixa!.height, "o embed do YouTube colapsou na altura").toBeGreaterThan(100);

});

test("todo iframe do site é de saída: nenhuma página do build embute o próprio site", () => {
  // Esta é a asserção que sustenta o `DENY`. `X-Frame-Options` só recusa a
  // direção de ENTRADA, então ele só quebraria alguma coisa se alguma página
  // nossa embutisse outra página nossa. Varrer o HTML exportado responde isso
  // sem depender de rede: um teste que espera o YouTube carregar de verdade
  // vira flake de conectividade, e não mede o que interessa aqui.
  const paginas = execFileSync("find", [join(__dirname, "..", "out"), "-name", "*.html"], {
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  expect(paginas.length, "o build não gerou HTML; rode `npm run build` antes").toBeGreaterThan(40);

  const entrada: string[] = [];
  let saida = 0;
  for (const arquivo of paginas) {
    const html = readFileSync(arquivo, "utf8");
    for (const m of html.matchAll(/<iframe\b[^>]*\bsrc="([^"]*)"/g)) {
      const src = m[1];
      // Relativo, ou apontando para o nosso domínio, é iframe de ENTRADA.
      if (!/^https?:\/\//.test(src) || src.startsWith(SITE_URL)) entrada.push(`${arquivo}: ${src}`);
      else saida++;
    }
  }

  expect(entrada, "há iframe embutindo o próprio site; o DENY quebraria essa página").toEqual([]);
  expect(saida, "nenhum iframe no build: a varredura não está achando nada").toBeGreaterThan(0);
});

// ------------------------------------------------------------ color-scheme

test("o navegador sabe que o tema é escuro (`color-scheme` computado)", async ({ page }) => {
  await page.goto("/");

  // Valor computado, não o texto do CSS: é ele que decide a cor das barras de
  // rolagem nativas (Firefox e Safari não implementam `::-webkit-scrollbar`) e
  // dos controles que o próprio navegador desenha.
  const computado = await page.evaluate(() => ({
    root: getComputedStyle(document.documentElement).colorScheme,
    // Herda do `:root`. Se o body sair "normal", alguma regra sobrescreveu.
    body: getComputedStyle(document.body).colorScheme,
  }));

  expect(computado.root).toBe("dark");
  expect(computado.body).toBe("dark");
});

test("a barra de rolagem escura vale para o menu lateral, que é o mais rolado", async ({ page }) => {
  await page.goto("/topico/backtracking/");

  // Quem rola é `.side-scroll`, não `.sidebar`: medido, a `.sidebar` tem
  // `overflow-y: visible` e scrollHeight igual ao clientHeight. Apontar para o
  // elemento errado daria um teste sempre verde que não olha barra nenhuma.
  const menu = page.locator(".sidebar .side-scroll");
  await expect(menu).toBeVisible();

  const medido = await menu.evaluate((el) => ({
    colorScheme: getComputedStyle(el).colorScheme,
    // `overflow-y: auto` sozinho não diz que rola. O que diz é o conteúdo
    // passar da caixa: sem isso, não há barra para pintar e o teste não
    // testaria nada.
    rola: el.scrollHeight > el.clientHeight,
  }));

  expect(medido.colorScheme, "o menu lateral não herdou o esquema escuro").toBe("dark");
  expect(medido.rola, "o menu lateral não está rolando; escolha outro alvo").toBe(true);
});

// ------------------------------------------------- TOTAL_TOPICS_PRONTOS

test("`TOTAL_TOPICS_PRONTOS` conta só quem tem material, pela mesma função do site", () => {
  const prontos = ALL_TOPICS.filter((t) => !isEmptyTopic(t));

  expect(TOTAL_TOPICS_PRONTOS).toBe(prontos.length);

  // A constante só ganha razão de existir enquanto ela for MENOR que o total.
  // No dia em que os dois números empatarem (todo tópico com material), esta
  // asserção reprova e alguém decide conscientemente se a distinção ainda vale.
  expect(TOTAL_TOPICS_PRONTOS).toBeLessThan(TOTAL_TOPICS);
  expect(TOTAL_TOPICS).toBe(ALL_TOPICS.length);
});

test("o corte de `TOTAL_TOPICS_PRONTOS` é o mesmo que tira a página do índice", async ({ request }) => {
  // Amarra o número ao comportamento do site: quem fica de fora da conta é
  // exatamente quem o build marca `noindex`. Se alguém trocar a derivação por
  // uma cópia da regra, as duas listas se separam e este teste reprova.
  const semMaterial: string[] = [];
  const comMaterial: string[] = [];

  for (const t of ALL_TOPICS) {
    const html = await (await request.get(`/topico/${t.slug}/`)).text();
    const noindex = /<meta name="robots" content="noindex/.test(html);
    (noindex ? semMaterial : comMaterial).push(t.slug);
  }

  expect(comMaterial.length, "páginas indexáveis != tópicos contados como prontos").toBe(
    TOTAL_TOPICS_PRONTOS
  );
  expect(semMaterial.sort()).toEqual(
    ALL_TOPICS.filter((t) => isEmptyTopic(t))
      .map((t) => t.slug)
      .sort()
  );
});
