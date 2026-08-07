import { test, expect } from "@playwright/test";
import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Orçamento de bytes do build.
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
 * OS TETOS SÃO CATRACA, NÃO ALVO
 *
 * O alvo é `TETO_ALVO`, 250 KB gzip por rota: o piso da casca do site (~207 KB,
 * o que a home custa) com folga. Nenhuma rota de tópico chega perto hoje, e o
 * corte que faltava não cabe neste arquivo — está medido em `mdx-components.tsx`,
 * no bloco sobre os 86 visualizadores. Enquanto ele não vem, os tetos abaixo
 * estão logo acima do número de hoje, para que o problema **pare de crescer**:
 * cada tópico publicado engorda o mesmo chunk que TODAS as 47 rotas baixam, e
 * ainda faltam 11 tópicos para publicar.
 */

const OUT = path.join(process.cwd(), "out");
const KB = 1024;

/**
 * Teto por rota, em bytes gzipados do JS inicial. Medido em 2026-08-06: as 47
 * rotas de tópico estão em 391.698 B (382,5 KB) e as 6 rotas fixas em 212.412 B
 * (207,4 KB). 400 KB é 4,6% acima do pior caso de hoje — não passa a próxima
 * leva de visualizadores.
 */
const TETO_ROTA = 400 * KB;

/**
 * Onde o projeto quer chegar. É o piso da casca (207,4 KB, o custo da home, que
 * não tem visualizador nenhum) mais ~20% de folga. Não é o teto ativo porque o
 * corte por rota ainda não foi feito; quando for, este vira `TETO_ROTA`.
 */
const TETO_ALVO = 250 * KB;

/**
 * Nenhum chunk sozinho passa disso, em bytes crus. O maior de hoje tem 692.459 B
 * e é o dos 86 visualizadores; o segundo tem 226.344. Este é o guarda mais
 * direto do defeito: é ESTE chunk que engorda a cada tópico publicado.
 */
const TETO_MAIOR_CHUNK = 700 * KB;

/**
 * O que uma página de tópico `soon` baixa **a mais** que a home, em gzip. As
 * duas mostram um parágrafo e nenhum visualizador, então a diferença é
 * desperdício puro. Medido hoje: 179.286 B (175,1 KB) — exatamente o chunk dos
 * visualizadores. O teto trava esse número; o conserto o leva a ~0.
 */
const TETO_EXCEDENTE_SEM_VIZ = 180 * KB;

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
      `(o alvo do projeto é ${kb(TETO_ALVO)}):\n${relatorio}`
  ).toBe(0);
});

test("nenhum chunk sozinho passa do teto", () => {
  const chunks = readdirSync(path.join(OUT, "_next/static/chunks"))
    .filter((n) => n.endsWith(".js"))
    .map((n) => ({ n, raw: statSync(path.join(OUT, "_next/static/chunks", n)).size }))
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
  // está no arquivo, não o que a hidratação monta depois. Quem for cortar o
  // chunk dos visualizadores pode adiar a INTERATIVIDADE; não pode adiar o
  // conteúdo. Em `next/dynamic`, isso quer dizer: `ssr: false` é proibido.
  //
  // E a conta é POR FIGURA, não por página: cinco visualizadores neste
  // repositório já passaram por uma suíte verde sem um botão renderizado,
  // justamente porque a asserção era "existe um `figure.viz` na página".
  // Contar figura deixa passar figura oca.
  const esperado: Record<string, number> = {
    "topico/arrays/index.html": 3,
    "topico/intervals/index.html": 5,
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
// comportamento
// ---------------------------------------------------------------------------

test("o visualizador continua interativo, e o passo anda nos dois sentidos", async ({ page }) => {
  await page.goto("/topico/arrays/");
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
