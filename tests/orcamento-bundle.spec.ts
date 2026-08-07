import { test, expect } from "@playwright/test";
import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { classificarLink } from "../mdx-components";

/**
 * Orçamento de bytes do build, e o comportamento dos links do artigo.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * Um chunk de 692.459 B (175,1 KB gzip) chegou até a produção no `<head>` das 47
 * rotas de tópico, inclusive nas 11 que não têm artigo nem visualizador. Nada
 * reprovou, porque não havia nada medindo:
 *
 *     grep -rniE "budget|lighthouse|bundle" tests .github/workflows package.json  ->  0
 *
 * Este arquivo é esse guarda. Ele não abre navegador para medir peso: lê o HTML
 * exportado em `out/`, resolve cada `<script src>` (e cada `<link rel=preload
 * as=script>`, que o navegador baixa do mesmo jeito) no arquivo correspondente
 * de `out/_next/`, e soma. Roda em segundos.
 *
 * O QUE ELE CONTA: só o JS **inicial** — o que o navegador baixa para a página
 * ficar de pé. Chunk buscado sob demanda depois da hidratação não entra. Script
 * de terceiro (Analytics) não tem arquivo local para medir e fica de fora.
 *
 * OS TETOS ACOMPANHAM O GANHO
 *
 * Eles foram baixados junto com o corte por rota (`src/components/VizLazy.tsx`).
 * Teto escolhido para o estado anterior é teto que só guarda uma vez: depois de
 * o pior caso cair de 382,5 KB para 235,7 KB, um teto de 400 KB deixaria caber
 * de volta tudo o que acabou de sair. Quem melhorar estes números de novo desce
 * os tetos no mesmo PR.
 */

const OUT = path.join(process.cwd(), "out");
const KB = 1024;

/**
 * Teto por rota, em bytes gzipados do JS inicial.
 *
 * A régua é o piso da casca do site mais ~20%: 207,4 KB é o que a home custa, e
 * ela não tem visualizador nenhum. Medido depois do corte por rota: a pior das
 * 53 rotas é `/topico/listas-ligadas/`, com 235,7 KB (folga de 6,1%), a mediana
 * das rotas de tópico fica perto de 224 KB, e as 11 páginas "em breve" custam
 * 213,3 KB. Antes do corte eram 382,5 KB em todas as 47 rotas de tópico.
 *
 * Este teto não atrapalha publicar tópico novo, e é de propósito: agora um
 * visualizador só pesa na rota que o usa. O que ele barra é uma PÁGINA ficar
 * pesada demais sozinha, que é o sinal certo para pedir medição.
 */
const TETO_ROTA = 250 * KB;

/**
 * Nenhum chunk sozinho passa disso, em bytes crus. O maior de hoje tem 226.344 B
 * e é o do framework; os 86 chunks de visualizador ficam todos bem abaixo. 265 KB
 * é esse maior mais ~20%.
 *
 * É o guarda contra a volta do defeito que motivou este arquivo: se alguém puser
 * os visualizadores de volta no grafo de servidor, eles voltam a virar UM chunk,
 * e o número dele era 692.459 B.
 */
const TETO_MAIOR_CHUNK = 265 * KB;

/**
 * O que uma página de tópico `soon` baixa **a mais** que a home, em gzip. As
 * duas mostram um parágrafo e nenhum visualizador, então a diferença é
 * desperdício puro. Era 179.286 B (175,1 KB), o chunk inteiro dos 86
 * visualizadores; depois do corte é **5.997 B**, um chunk só, que é o da rota
 * `/topico/[slug]` e carrega os 86 invólucros do `VizLazy`.
 *
 * O teto de 8 KB é esse número com folga para o mapa crescer: ele ganha uma
 * linha por visualizador novo, o que dá alguns bytes gzipados cada.
 */
const TETO_EXCEDENTE_SEM_VIZ = 8 * KB;

/** Rota `soon` sem artigo e sem visualizador (ver `isEmptyTopic`). */
const ROTA_SEM_VIZ = "topico/trie/index.html";

// ---------------------------------------------------------------------------
// leitura do build
// ---------------------------------------------------------------------------

function rotasDoBuild(): string[] {
  const entradas = readdirSync(OUT, { recursive: true, withFileTypes: true });
  return entradas
    .filter((e) => e.isFile() && e.name === "index.html")
    .map((e) => path.relative(OUT, path.join(e.parentPath, e.name)))
    .sort();
}

const gzipPorArquivo = new Map<string, number>();
function gzipDe(rel: string): number {
  const cache = gzipPorArquivo.get(rel);
  if (cache !== undefined) return cache;
  const n = gzipSync(readFileSync(path.join(OUT, rel)), { level: 9 }).length;
  gzipPorArquivo.set(rel, n);
  return n;
}

const SCRIPT_SRC = /<script\b[^>]*\bsrc="([^"]+)"/g;
const PRELOAD_SCRIPT = /<link\b[^>]*\bas="script"[^>]*>/g;
const HREF = /\bhref="([^"]+)"/;

/** Os arquivos de JS que o navegador baixa só para montar a página. */
function jsInicial(rota: string) {
  const html = readFileSync(path.join(OUT, rota), "utf8");
  const urls = new Set<string>();
  for (const m of html.matchAll(SCRIPT_SRC)) urls.add(m[1]);
  for (const m of html.matchAll(PRELOAD_SCRIPT)) {
    const href = m[0].match(HREF)?.[1];
    if (href) urls.add(href);
  }
  const arquivos = [...urls]
    .filter((u) => u.startsWith("/_next/"))
    .map((u) => u.slice(1))
    .sort()
    .map((rel) => ({ rel, raw: statSync(path.join(OUT, rel)).size, gzip: gzipDe(rel) }));
  return {
    arquivos,
    raw: arquivos.reduce((a, f) => a + f.raw, 0),
    gzip: arquivos.reduce((a, f) => a + f.gzip, 0),
  };
}

const kb = (n: number) => `${(n / KB).toFixed(1)} KB`;

// ---------------------------------------------------------------------------
// orçamento
// ---------------------------------------------------------------------------

test("nenhuma rota estoura o teto de JS inicial", () => {
  const rotas = rotasDoBuild();
  expect(rotas.length, "build vazio: rode `npm run build` antes").toBeGreaterThan(40);

  const medidas = rotas.map((r) => ({ rota: r, ...jsInicial(r) }));
  const acima = medidas.filter((m) => m.gzip > TETO_ROTA).sort((a, b) => b.gzip - a.gzip);

  const relatorio = acima
    .slice(0, 5)
    .map((m) => {
      const maiores = [...m.arquivos]
        .sort((a, b) => b.gzip - a.gzip)
        .slice(0, 3)
        .map((f) => `${f.rel} ${kb(f.gzip)}`)
        .join(", ");
      return `  /${m.rota.replace(/index\.html$/, "")} -> ${kb(m.gzip)} gzip em ${m.arquivos.length} chunks. Maiores: ${maiores}`;
    })
    .join("\n");

  expect(
    acima.length,
    `${acima.length} de ${medidas.length} rotas acima do teto de ${kb(TETO_ROTA)} gzip de JS inicial ` +
      `(a casca do site sozinha custa 207,4 KB):\n${relatorio}`
  ).toBe(0);
});

test("nenhum chunk sozinho passa do teto", () => {
  // `recursive: true` não é detalhe: sem ele a listagem pega só o primeiro
  // nível e um chunk emitido em `chunks/app/...` passaria pelo teto sem
  // reprovar — um guarda que parece varredura e não é. Hoje o build põe os 98
  // chunks no nível 1 e nenhum em subpasta, então isto não muda o resultado;
  // muda o que acontece no dia em que o Next mudar o layout de saída.
  const base = path.join(OUT, "_next/static/chunks");
  const chunks = readdirSync(base, { recursive: true, encoding: "utf-8" })
    .filter((n) => n.endsWith(".js"))
    .map((n) => ({ n, raw: statSync(path.join(base, n)).size }))
    .sort((a, b) => b.raw - a.raw);

  const gordos = chunks.filter((c) => c.raw > TETO_MAIOR_CHUNK);
  expect(
    gordos.map((c) => `${c.n} ${c.raw.toLocaleString()} B`),
    `chunk único acima de ${kb(TETO_MAIOR_CHUNK)}. Ele vai para o <head> de toda rota ` +
      `que o referencia, e é o que engorda a cada tópico publicado.`
  ).toEqual([]);
});

test("página de tópico sem visualizador quase não paga a mais que a home", () => {
  // A home e uma página "em breve" mostram a mesma coisa em termos de JS:
  // a casca do site. Tudo que a segunda baixa a mais é desperdício, e o número
  // dessa diferença é o tamanho exato do problema.
  const semViz = jsInicial(ROTA_SEM_VIZ);
  const home = jsInicial("index.html");
  const excedente = semViz.gzip - home.gzip;

  const soDela = semViz.arquivos
    .filter((f) => !home.arquivos.some((h) => h.rel === f.rel))
    .sort((a, b) => b.gzip - a.gzip)
    .map((f) => `    ${kb(f.gzip)} gzip / ${f.raw.toLocaleString()} B  ${f.rel}`)
    .join("\n");

  expect(
    excedente,
    `/${ROTA_SEM_VIZ.replace(/index\.html$/, "")} é uma página "em breve", sem artigo e sem ` +
      `visualizador, e baixa ${kb(excedente)} gzip a mais que a home (${kb(semViz.gzip)} contra ` +
      `${kb(home.gzip)}). Chunks que só ela tem:\n${soDela}`
  ).toBeLessThanOrEqual(TETO_EXCEDENTE_SEM_VIZ);
});

// ---------------------------------------------------------------------------
// o HTML estático continua completo (nada de `ssr: false`)
// ---------------------------------------------------------------------------

test("os visualizadores continuam renderizados no HTML estático", () => {
  // O HTML pré-renderizado é o ativo de SEO do projeto: o Google indexa o que
  // está no arquivo, não o que a hidratação monta depois. O corte por rota
  // (`src/components/VizLazy.tsx`) adia a INTERATIVIDADE, e não pode adiar o
  // conteúdo. Em `next/dynamic`, isso quer dizer: `ssr: false` é proibido.
  //
  // E a conta é POR FIGURA, não por página: cinco visualizadores neste
  // repositório já passaram por uma suíte verde sem um botão renderizado,
  // justamente porque a asserção era "existe um `figure.viz` na página".
  // Contar figura deixa passar figura oca.
  //
  // Perfis diferentes de propósito: cinco visualizadores num artigo denso, três
  // num artigo comum, um só numa página de grafo, e dois num artigo do meio.
  const esperado: Record<string, number> = {
    "topico/intervals/index.html": 5,
    "topico/arrays/index.html": 3,
    "topico/hash-table/index.html": 2,
    "topico/dijkstra/index.html": 1,
  };
  for (const [rota, quantos] of Object.entries(esperado)) {
    const html = readFileSync(path.join(OUT, rota), "utf8");
    const figuras = html.split(/(?=<figure class="viz\b)/).slice(1);
    const completas = figuras.filter(
      // O contador e os controles só existem no HTML se o componente rodou no
      // servidor: os dois vêm do estado do visualizador, não da casca.
      (f) => f.includes('class="viz-step">passo ') && f.includes("Próximo ›")
    );
    expect(
      completas.length,
      `${rota}: ${completas.length} de ${figuras.length} visualizadores renderizaram ` +
        `contador e controles no HTML estático (esperado ${quantos})`
    ).toBe(quantos);
  }
});

// ---------------------------------------------------------------------------
// links do artigo
// ---------------------------------------------------------------------------

/** Todas as âncoras de prosa (`className="prose-a"`) do build, com os atributos. */
function ancorasDosArtigos() {
  const achadas: { rota: string; tag: string; href: string }[] = [];
  for (const rota of rotasDoBuild()) {
    const html = readFileSync(path.join(OUT, rota), "utf8");
    for (const m of html.matchAll(/<a\s[^>]*>/g)) {
      const tag = m[0];
      if (!/\bclass="[^"]*\bprose-a\b/.test(tag)) continue;
      achadas.push({ rota, tag, href: tag.match(HREF)?.[1] ?? "" });
    }
  }
  return achadas;
}

test("todo link interno de artigo já sai com a barra final", () => {
  // `next.config.ts` tem `trailingSlash: true`. Link sem a barra toma 308 em
  // produção (medido: `curl -o /dev/null -w '%{http_code}'
  // https://dsa.craftcodeclub.io/topico/arrays` -> 308) antes de carregar
  // qualquer byte útil.
  const ancoras = ancorasDosArtigos();
  expect(ancoras.length, "nenhuma âncora de prosa no build").toBeGreaterThan(200);

  const internos = ancoras.filter((a) => a.href.startsWith("/"));
  expect(internos.length, "nenhum link interno de artigo no build").toBeGreaterThan(200);

  const semBarra = internos.filter((a) => !a.href.split(/[?#]/)[0].endsWith("/"));
  const amostra = semBarra.slice(0, 5).map((a) => `  ${a.rota}: ${a.href}`).join("\n");
  expect(
    semBarra.length,
    `${semBarra.length} de ${internos.length} links internos sem barra final (cada clique = um 308):\n${amostra}`
  ).toBe(0);
});

test("todo link externo de artigo abre em nova aba com rel seguro", () => {
  const externos = ancorasDosArtigos().filter((a) => /^https?:\/\//.test(a.href));
  expect(externos.length, "nenhum link externo de artigo no build").toBeGreaterThan(5);

  const frouxos = externos.filter(
    (a) =>
      !/\btarget="_blank"/.test(a.tag) ||
      !/\brel="[^"]*\bnoopener\b/.test(a.tag) ||
      !/\brel="[^"]*\bnoreferrer\b/.test(a.tag)
  );
  const amostra = frouxos.slice(0, 5).map((a) => `  ${a.rota}: ${a.tag}`).join("\n");
  expect(
    frouxos.length,
    `${frouxos.length} de ${externos.length} links externos sem target/rel:\n${amostra}`
  ).toBe(0);
});

test("classificarLink separa interno, externo e o que fica como <a> cru", () => {
  // Os artigos de hoje só têm dois casos (251 links `/topico/...` e 12 `https://`),
  // mas a condição precisa estar certa para os que ainda vão aparecer: âncora da
  // própria página, `mailto:`, arquivo estático com extensão, caminho relativo.
  const casos: [string | undefined, ReturnType<typeof classificarLink>][] = [
    ["/topico/arrays", { tipo: "interno", href: "/topico/arrays/" }],
    ["/topico/arrays/", { tipo: "interno", href: "/topico/arrays/" }],
    ["/topico/arrays#quando-usar", { tipo: "interno", href: "/topico/arrays/#quando-usar" }],
    ["/roadmap?g=1#x", { tipo: "interno", href: "/roadmap/?g=1#x" }],
    ["/", { tipo: "interno", href: "/" }],
    ["#nesta-pagina", { tipo: "cru", href: "#nesta-pagina" }],
    ["mailto:oi@craftcodeclub.io", { tipo: "cru", href: "mailto:oi@craftcodeclub.io" }],
    ["tel:+5511999999999", { tipo: "cru", href: "tel:+5511999999999" }],
    ["/imagens/arvore.png", { tipo: "cru", href: "/imagens/arvore.png" }],
    ["/sitemap.xml", { tipo: "cru", href: "/sitemap.xml" }],
    ["./vizinho", { tipo: "cru", href: "./vizinho" }],
    [
      "https://leetcode.com/problems/two-sum/",
      { tipo: "externo", href: "https://leetcode.com/problems/two-sum/" },
    ],
    ["http://exemplo.com", { tipo: "externo", href: "http://exemplo.com" }],
    ["//cdn.exemplo.com/x.js", { tipo: "externo", href: "//cdn.exemplo.com/x.js" }],
    [undefined, { tipo: "cru", href: "" }],
  ];
  for (const [entrada, esperado] of casos) {
    expect(classificarLink(entrada), `href ${JSON.stringify(entrada)}`).toEqual(esperado);
  }
});

// ---------------------------------------------------------------------------
// comportamento: o ganho do next/link
// ---------------------------------------------------------------------------

test("clicar num link do artigo não recarrega o documento", async ({ page }) => {
  await page.goto("/topico/a-star/");
  // A marca morre em qualquer navegação de documento. Se ela sobreviver, a
  // troca de página foi do router, sem recarregar a aplicação inteira.
  await page.evaluate(() => {
    (window as unknown as { __semRecarga?: boolean }).__semRecarga = true;
  });

  const link = page.locator("article a.prose-a[href^='/topico/']").first();
  const destino = await link.getAttribute("href");
  expect(destino, "o link do artigo precisa apontar para a URL final, sem 308").toMatch(/\/$/);

  await link.click();
  // Comparação de caminho, não regex montada com a URL: `new RegExp(destino)`
  // trataria `.`, `?` e `(` como metacaractere, e um href com query ou ponto
  // casaria de menos (ou de mais) sem ninguém perceber. O predicado compara o
  // `pathname` inteiro, que é exatamente o que se quer afirmar aqui.
  await expect(page).toHaveURL((u) => u.pathname === destino);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { __semRecarga?: boolean }).__semRecarga === true
    ),
    "o documento recarregou: a navegação não passou pelo router"
  ).toBe(true);
});

// O visualizador agora chega ao navegador por um `import()` que só acontece
// depois da hidratação. Renderizar no HTML é metade: o teste tem que CLICAR e
// ver o passo mudar, senão ele só provou que a casca está lá. Três perfis, pelo
// mesmo motivo de sempre — o que quebra num artigo denso não é o que quebra
// numa página de um visualizador só.
for (const rota of ["/topico/arrays/", "/topico/dijkstra/", "/topico/hash-table/"]) {
  test(`${rota} continua interativo, e o passo anda nos dois sentidos`, async ({ page }) => {
    await page.goto(rota);
    const viz = page.locator("figure.viz").first();
    const passo = viz.locator(".viz-step");
    const antes = await passo.textContent();
    expect(antes, "o contador de passo não renderizou").toBeTruthy();

    const proximo = viz.getByRole("button", { name: "Próximo ›" });
    await expect(proximo).toBeEnabled();
    await proximo.click();
    await expect(passo).not.toHaveText(antes ?? "");

    await viz.getByRole("button", { name: "‹ Anterior" }).click();
    await expect(passo).toHaveText(antes ?? "");
  });
}
