import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { TOPICOS } from "../content/topicos";

// A fachada do vídeo da aula: o `<iframe>` do YouTube só nasce quando o aluno
// clica (`src/components/VideoFacade.tsx`).
//
// O QUE ESTE ARQUIVO PROVA, E POR QUE CADA PROVA É POR INTERAÇÃO
//
// Contar elemento não testaria nada aqui: um botão morto, uma miniatura de 0px
// e um `<iframe>` que nasce sem `autoplay` passariam os três numa suíte que só
// pergunta "existe?". Então:
//
//   · o HTML ENTREGUE é lido do `out/`, não do DOM — é o arquivo que o
//     Cloudflare serve e o Googlebot busca, e é ali que o embed não pode estar;
//   · o clique é clique de verdade, e a asserção do `autoplay` não é só o
//     atributo: o teste guarda a URL que o navegador PEDIU;
//   · a prova de CLS mede a caixa antes e depois, em coordenada de documento;
//   · o teclado chega no botão por `Tab`, uma parada de cada vez, e toca com
//     `Enter`;
//   · a resolução da miniatura é lida do `currentSrc`, que é a escolha do
//     navegador — a única coisa que prova que o `sizes` está dizendo a verdade.
//
// REDE INTERCEPTADA, DE PROPÓSITO. Os testes respondem por `i.ytimg.com` e
// `www.youtube-nocookie.com` localmente. Não é para "passar sem internet": é
// para o CI não puxar 1 MB de player a cada rodada, e para o caso do 404 da
// miniatura poder ser exercitado sem depender de achar um vídeo quebrado de
// verdade. Nada do que se afirma aqui depende do corpo dessas respostas — só
// das URLs, que continuam sendo as reais.

/** O primeiro tópico com vídeo, pela mesma ordem do roadmap. */
const TOPICO = TOPICOS.find((t) => t.youtube)!;
const ROTA = `/topicos/${TOPICO.slug}/`;
const NOME_DO_BOTAO = `Assistir à aula: ${TOPICO.name}`;
const OUT = join(__dirname, "..", "out");

// A miniatura de teste tem 320x180, e NÃO 1x1 — a diferença custou uma tarde.
//
// Quando o `<img>` escolhe um candidato do `srcset` por descritor `w`, o
// `naturalWidth` que ele devolve vem CORRIGIDO PELA DENSIDADE: é a largura
// intrínseca dividida por (descritor ÷ largura pintada). Nesta página o
// candidato é `1280w` numa caixa de 842px, ou seja densidade 1,52. Uma imagem
// de 1x1 vira `1 ÷ 1,52 = 0,65`, que arredonda para **zero** — e o teste lê
// `naturalWidth: 0`, que é exatamente a assinatura do ícone quebrado que ele
// existe para pegar. Reprovava sem nenhum defeito no produto.
//
// Medido: 1x1 → `naturalWidth 0`; a `mqdefault.webp` real (320x180) → 210.
// O conteúdo continua não importando; o TAMANHO importa.
const MINIATURA = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAUAAAAC0CAIAAABqhmJGAAABlElEQVR42u3TQQkAAAwDscrZeyLm" +
    "X9J0FAJRcHCZPaBUJAADAwYGDAwGBgwMGBgwMBgYMDBgYDAwYGDAwICBwcCAgQEDAwYGAwMGBgwM" +
    "BgYMDBgYMDAYGDAwYGDAwGBgwMCAgcHAgIEBAwMGBgMDBgYMDAZWAQwMGBgwMBgYMDBgYMDAYGDA" +
    "wICBwcCAgQEDAwYGAwMGBgwMGBgMDBgYMDAYGDAwYGDAwGBgwMCAgQEDg4EBAwMGBgMDBgYMDBgY" +
    "DAwYGDAwGBgwMGBgwMBgYMDAgIEBA4OBAQMDBgYDAwYGDAwYGAwMGBgwMGBgMDBgYMDAYGDAwICB" +
    "AQODgQEDAwYGDAwGBgwMGBgMDBgYMDBgYDAwYGDAwGBgwMCAgQEDg4EBAwMGBgwMBgYMDBgYDAwY" +
    "GDAwYGAwMGBgwMCAgcHAgIEBA4OBAQMDBgYMDAYGDAwYGAysAhgYMDBgYDAwYGDAwICBwcCAgQED" +
    "g4EBAwMGBgwMBgYMDBgYMDAYGDAwYGAwMGBgwMCAgcHAgIEBAwMGhm4P9wyoNRfXlM8AAAAASUVO" +
    "RK5CYII=",
  "base64"
);


/**
 * Responde pelos dois hosts do YouTube e devolve o array **vivo** das URLs
 * pedidas (ele cresce sozinho conforme a página pede).
 *
 * `maxres404` reproduz o que o `i.ytimg.com` faz com um vídeo que não tem a
 * resolução grande: 404 com uma paginazinha de texto, que o `<img>` desenha
 * como ícone quebrado. Medido contra o host real:
 * `curl -o /dev/null -w "%{http_code} %{size_download}"
 * https://i.ytimg.com/vi_webp/zzzzzzzzzzz/maxresdefault.webp` → `404 552`.
 */
async function interceptarYouTube(page: Page, opcoes: { maxres404?: boolean } = {}) {
  const pedidas: string[] = [];

  await page.route(/https:\/\/i\.ytimg\.com\//, async (route) => {
    const url = route.request().url();
    pedidas.push(url);
    if (opcoes.maxres404 && url.includes("maxresdefault")) {
      await route.fulfill({ status: 404, contentType: "text/html", body: "<html>404</html>" });
      return;
    }
    await route.fulfill({ status: 200, contentType: "image/png", body: MINIATURA });
  });

  await page.route(/https:\/\/www\.youtube-nocookie\.com\//, async (route) => {
    pedidas.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>player</title>",
    });
  });

  return pedidas;
}

/** A caixa do vídeo em coordenada de DOCUMENTO: imune a rolagem entre medidas. */
function medirCaixa(page: Page) {
  return page.locator(".video-embed").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { largura: r.width, altura: r.height, topo: r.top + window.scrollY };
  });
}

// ---------------------------------------------------------------- HTML entregue

test("o HTML entregue não tem <iframe> do YouTube, e tem o botão da fachada", () => {
  // `*.html`, e não `index.html`: o `404.html` também é página entregue, e um
  // embed que voltasse por ali não seria menos embed.
  const paginas = execFileSync("find", [OUT, "-name", "*.html"], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
  expect(paginas.length, "o build não gerou HTML; rode `npm run build` antes").toBeGreaterThan(40);

  const comEmbed = paginas.filter((p) => /<iframe\b[^>]*youtube/i.test(readFileSync(p, "utf8")));
  expect(
    comEmbed,
    "o embed do YouTube voltou para o HTML estático: a fachada deixou de ser fachada"
  ).toEqual([]);

  // A outra ponta: sem esta parte, apagar a seção de vídeo inteira também
  // deixaria a asserção de cima verde.
  const comVideo = TOPICOS.filter((t) => t.youtube);
  expect(comVideo.length, "nenhum tópico com vídeo: não há o que provar").toBeGreaterThan(0);

  const semBotao = comVideo
    .filter((t) => {
      const html = readFileSync(join(OUT, "topicos", t.slug, "index.html"), "utf8");
      // Os dois atributos na MESMA tag de abertura, e não dois `includes`
      // soltos: a página tem outros botões já tipados (`TopicComplete.tsx`),
      // então tirar o `type` daqui deixaria a versão frouxa VERDE. Botão sem
      // `type` é `submit`, e este repositório já teve um PR só para isso.
      const abertura = new RegExp(
        `<button\\b[^>]*aria-label="Assistir à aula: ${t.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`
      );
      const tag = html.match(abertura)?.[0];
      return !tag || !/\btype="button"/.test(tag);
    })
    .map((t) => t.slug);
  expect(
    semBotao,
    "página com vídeo cujo HTML estático não traz o botão da fachada com nome acessível"
  ).toEqual([]);
});

// ---------------------------------------------------------------------- clique

test("clicar na fachada monta o player com autoplay, e o foco vai para ele", async ({ page }) => {
  const pedidas = await interceptarYouTube(page);
  await page.goto(ROTA);

  const botao = page.getByRole("button", { name: NOME_DO_BOTAO });
  await botao.scrollIntoViewIfNeeded();
  await expect(page.locator(".video-embed iframe"), "havia player ANTES do clique").toHaveCount(0);

  await botao.click();

  const player = page.locator(".video-embed iframe");
  await expect(player).toHaveCount(1);
  await expect(player).toHaveAttribute(
    "src",
    `https://www.youtube-nocookie.com/embed/${TOPICO.youtube}?autoplay=1&playsinline=1`
  );

  // Não é só o atributo: o navegador PEDIU essa URL. Um `<iframe>` com `src`
  // certo e `hidden`, ou dentro de um pai com `display: none`, passaria na
  // asserção de cima sem carregar nada.
  await expect
    .poll(() => pedidas.filter((u) => u.includes("/embed/")), {
      message: "o <iframe> tem o src certo mas o navegador não navegou para ele",
    })
    .toEqual([`https://www.youtube-nocookie.com/embed/${TOPICO.youtube}?autoplay=1&playsinline=1`]);

  // O foco vai para o player: quem clicou pelo teclado não pode ser devolvido
  // ao começo da página.
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.tagName ?? "sem foco"))
    .toBe("IFRAME");

  // E o botão sai de cena, em vez de ficar por baixo roubando clique.
  await expect(page.getByRole("button", { name: NOME_DO_BOTAO })).toHaveCount(0);
});

test("a caixa do vídeo tem a mesma altura antes e depois do clique (CLS zero)", async ({
  page,
}) => {
  await interceptarYouTube(page);
  await page.goto(ROTA);

  const botao = page.getByRole("button", { name: NOME_DO_BOTAO });
  await botao.scrollIntoViewIfNeeded();
  // Sem a miniatura carregada, medir a caixa mediria o estado errado — e a
  // imagem é justamente o que poderia empurrar o layout se faltasse proporção.
  await expect
    .poll(() =>
      page
        .locator(".video-facade-thumb")
        .evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)
    )
    .toBe(true);

  const antes = await medirCaixa(page);
  expect(antes.altura, "a caixa do vídeo já nasce colapsada").toBeGreaterThan(100);

  await botao.click();
  await expect(page.locator(".video-embed iframe")).toHaveCount(1);

  const depois = await medirCaixa(page);
  // Medido, não deduzido do CSS: o `aspect-ratio` pode estar certo no arquivo e
  // perdido no que o navegador pinta (um `height: auto` de outra regra, uma
  // imagem sem proporção declarada).
  expect(depois.altura, "a caixa mudou de ALTURA ao virar player: isso é CLS").toBeCloseTo(
    antes.altura,
    1
  );
  expect(depois.largura, "a caixa mudou de LARGURA ao virar player").toBeCloseTo(antes.largura, 1);
  expect(depois.topo, "a caixa mudou de LUGAR no documento ao virar player").toBeCloseTo(
    antes.topo,
    1
  );
});

// --------------------------------------------------------------------- teclado

test("o teclado alcança a fachada com Tab e toca com Enter", async ({ page }) => {
  await interceptarYouTube(page);
  await page.goto(ROTA);

  // Uma parada de cada vez, a partir do começo do documento. `focus()` no
  // elemento provaria só que ele aceita foco por script; o que interessa é ele
  // estar na ORDEM de tabulação — um `div` com `onClick`, ou um `tabindex="-1"`
  // esquecido, morre exatamente aqui.
  const LIMITE = 400;
  let paradas = 0;
  let chegou = false;
  while (paradas < LIMITE && !chegou) {
    await page.keyboard.press("Tab");
    paradas++;
    chegou = await page.evaluate(() =>
      (document.activeElement as HTMLElement | null)?.classList.contains("video-facade") ?? false
    );
  }
  expect(chegou, `o Tab não alcançou o botão da fachada em ${LIMITE} paradas`).toBe(true);

  await page.keyboard.press("Enter");
  await expect(page.locator(".video-embed iframe"), "Enter no botão não tocou a aula").toHaveCount(
    1
  );
});

// ------------------------------------------------------------------ miniatura

test("a miniatura declara width/height e não estoura a largura em 390px", async ({ page }) => {
  await interceptarYouTube(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(ROTA);

  const miniatura = page.locator(".video-facade-thumb");
  await miniatura.scrollIntoViewIfNeeded();

  // As dimensões intrínsecas: é delas que sai a proporção antes do byte chegar.
  await expect(miniatura).toHaveAttribute("width", "1280");
  await expect(miniatura).toHaveAttribute("height", "720");

  const caixa = (await miniatura.boundingBox())!;
  expect(caixa, "a miniatura não tem caixa").not.toBeNull();
  expect(caixa.width, "a miniatura colapsou").toBeGreaterThan(200);
  expect(caixa.width, "a miniatura passou da largura da tela").toBeLessThanOrEqual(390);
  expect(
    caixa.width / caixa.height,
    "a miniatura deixou de ser 16:9 e virou tarja ou corte"
  ).toBeCloseTo(16 / 9, 1);

  const estoura = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  expect(estoura, "a página passou a rolar na horizontal com a fachada").toBe(false);
});

/**
 * O que cada largura de tela acaba pedindo, com `deviceScaleFactor: 1` (o do
 * projeto `chromium`). `caixa` é a largura que o `sizes` promete —
 * `calc(100vw - 40px)` até 1000px, `calc(100vw - 336px)` até 1180 e `844px`
 * daí para cima — e `arquivo` é o candidato que o navegador escolhe por causa
 * dela.
 *
 * A tabela é o antídoto para o erro mais fácil desta mudança: `sizes="100vw"`
 * empurraria as três primeiras linhas um degrau para cima, e o desperdício
 * passaria despercebido porque a tela continuaria bonita.
 *
 * Um teste por largura, e não um teste que redimensiona: quando o navegador já
 * tem um candidato MAIOR em cache, ele reusa em vez de baixar o menor — a
 * medição em sequência mediria o cache, não a regra.
 */
const DEGRAUS = [
  { largura: 360, caixa: 320, arquivo: "mqdefault", bytes: "5,4 KB" },
  { largura: 500, caixa: 460, arquivo: "hqdefault", bytes: "8,8 KB" },
  { largura: 680, caixa: 640, arquivo: "sddefault", bytes: "12,0 KB" },
  { largura: 1512, caixa: 844, arquivo: "maxresdefault", bytes: "22,8 KB" },
];

for (const degrau of DEGRAUS) {
  test(`em ${degrau.largura}px a miniatura pedida é ${degrau.arquivo} (${degrau.bytes})`, async ({
    page,
  }) => {
    await interceptarYouTube(page);
    await page.setViewportSize({ width: degrau.largura, height: 900 });
    await page.goto(ROTA);

    const miniatura = page.locator(".video-facade-thumb");
    await miniatura.scrollIntoViewIfNeeded();

    // A escolha do navegador, não o texto do `srcset`. É a única leitura que
    // reprova quando o `sizes` mente sobre a largura da caixa.
    await expect
      .poll(() => miniatura.evaluate((el: HTMLImageElement) => el.currentSrc), {
        message: `em ${degrau.largura}px o navegador escolheu outra resolução`,
      })
      .toBe(`https://i.ytimg.com/vi_webp/${TOPICO.youtube}/${degrau.arquivo}.webp`);

    // E a caixa é mesmo a que o `sizes` promete. A folga para baixo é a barra de
    // rolagem: `100vw` a inclui e a caixa não, então o `sizes` erra por excesso
    // — que é o lado seguro, e é bom que esteja escrito.
    const caixa = (await miniatura.boundingBox())!;
    expect(caixa.width).toBeGreaterThan(degrau.caixa - 20);
    expect(caixa.width).toBeLessThanOrEqual(degrau.caixa);
  });
}

test("miniatura sem maxresdefault cai para o hqdefault.jpg, e não para o ícone quebrado", async ({
  page,
}) => {
  await interceptarYouTube(page, { maxres404: true });
  await page.setViewportSize({ width: 1512, height: 900 });
  await page.goto(ROTA);

  const miniatura = page.locator(".video-facade-thumb");
  await miniatura.scrollIntoViewIfNeeded();

  await expect
    .poll(() => miniatura.evaluate((el: HTMLImageElement) => el.currentSrc))
    .toBe(`https://i.ytimg.com/vi/${TOPICO.youtube}/hqdefault.jpg`);

  // O `srcset` tem de sair junto: enquanto houver candidatos, trocar só o `src`
  // não muda o que o navegador desenha.
  expect(await miniatura.getAttribute("srcset"), "o srcset sobreviveu ao plano B").toBeNull();

  // A prova de que não é ícone quebrado: a imagem decodificou.
  await expect
    .poll(() => miniatura.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
    .toBe(true);

  // E o botão continua clicável depois do tropeço.
  await page.getByRole("button", { name: NOME_DO_BOTAO }).click();
  await expect(page.locator(".video-embed iframe")).toHaveCount(1);
});

// --------------------------------------------------------------- sem JavaScript

test("sem JavaScript a fachada vira link para o YouTube, e não um buraco", async ({ browser }) => {
  // Contexto próprio, porque `javaScriptEnabled` é opção de contexto: não dá
  // para desligar o script na página que já está aberta.
  const contexto = await browser.newContext({ javaScriptEnabled: false });
  const pagina = await contexto.newPage();
  await interceptarYouTube(pagina);
  await pagina.goto(ROTA);

  const link = pagina.locator(".video-embed a.video-facade-nojs");
  await expect(link, "sem JS o miolo do <noscript> não virou link nenhum").toHaveCount(1);
  await expect(link).toHaveAttribute("href", `https://www.youtube.com/watch?v=${TOPICO.youtube}`);

  // Cobrir a caixa é o ponto: um link de 0px seria um buraco com href. A folga
  // de 4px é a borda de 1px do `.video-embed` dos dois lados — o `inset: 0` do
  // link resolve contra a caixa de padding, não contra a de borda.
  const caixa = (await link.boundingBox())!;
  const caixaDoVideo = (await pagina.locator(".video-embed").boundingBox())!;
  expect(caixaDoVideo.height, "a caixa do vídeo colapsou sem JS").toBeGreaterThan(100);
  expect(caixa.width, "o link do <noscript> não cobre a largura do vídeo").toBeGreaterThan(
    caixaDoVideo.width - 4
  );
  expect(caixa.height, "o link do <noscript> não cobre a altura do vídeo").toBeGreaterThan(
    caixaDoVideo.height - 4
  );

  await contexto.close();
});
