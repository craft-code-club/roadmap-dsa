import { test, expect, type Page } from "@playwright/test";
import { SITE_URL } from "../src/lib/links";

// SEO das páginas de entrada (home, roadmap, introdução).
//
// O que este arquivo protege: durante muito tempo o `openGraph` morava só no
// layout raiz, e o valor do layout VENCE o da página. Resultado: compartilhar
// qualquer URL do site mostrava o card da home. Voltar a fixar `openGraph.title`
// ou `openGraph.description` no layout reintroduz o bug em silêncio — nenhuma
// página quebra, os cards é que passam a mentir. Daí os testes de unicidade.
//
// O contrário também é armadilha: `openGraph` da página SUBSTITUI o do layout
// inteiro, não faz merge campo a campo. Quem define OG próprio precisa repetir
// type/locale/siteName, senão eles somem só naquela rota (ver `src/lib/seo.ts`).

const ROTAS = [
  { path: "/", nome: "home" },
  { path: "/roadmaps/fundamentos/", nome: "roadmap" },
  { path: "/introducao/", nome: "introdução" },
];

async function meta(page: Page, seletor: string): Promise<string | null> {
  return page.locator(`head ${seletor}`).getAttribute("content");
}

async function seo(page: Page, path: string) {
  await page.goto(path);
  return {
    title: await page.title(),
    description: await meta(page, 'meta[name="description"]'),
    ogTitle: await meta(page, 'meta[property="og:title"]'),
    ogDescription: await meta(page, 'meta[property="og:description"]'),
    ogImage: await meta(page, 'meta[property="og:image"]'),
    canonical: await page.locator('head link[rel="canonical"]').getAttribute("href"),
  };
}

test("as três páginas de entrada têm título, descrição e card próprios", async ({ page }) => {
  const vistos = new Map<string, string[]>();
  for (const rota of ROTAS) {
    const s = await seo(page, rota.path);
    for (const [campo, valor] of Object.entries(s)) {
      expect(valor, `${rota.nome}: ${campo} vazio`).toBeTruthy();
      const anteriores = vistos.get(campo) ?? [];
      expect(anteriores, `${rota.nome}: ${campo} repete o de outra rota`).not.toContain(valor);
      vistos.set(campo, [...anteriores, valor as string]);
    }
  }
});

test("a home fala de algoritmos E estruturas de dados, no título e na abertura", async ({ page }) => {
  const s = await seo(page, "/");
  expect(s.title).toContain("Algoritmos e Estruturas de Dados");
  expect(s.description).toContain("algoritmos e estruturas de dados");
  // O H1 é decisão editorial e não repete o termo de busca: quem carrega o
  // termo no corpo é o parágrafo logo abaixo.
  await expect(page.getByRole("heading", { level: 1 })).toContainText("aprofundamento em cada estrutura");
  await expect(page.locator(".hero > p")).toContainText("algoritmos e estruturas de dados");
});

test("o canonical de cada rota é absoluto e aponta para ela mesma", async ({ page }) => {
  for (const rota of ROTAS) {
    const s = await seo(page, rota.path);
    expect(s.canonical, rota.nome).toBe(`${SITE_URL}${rota.path}`);
    // og:url e canonical não podem divergir: são a mesma promessa para dois leitores.
    expect(await meta(page, 'meta[property="og:url"]'), rota.nome).toBe(s.canonical);
  }
});

test("cada página tem exatamente um h1", async ({ page }) => {
  for (const rota of [...ROTAS, { path: "/topicos/big-o/", nome: "big-o" }]) {
    await page.goto(rota.path);
    await expect(page.getByRole("heading", { level: 1 }), rota.nome).toHaveCount(1);
  }
});

// Regressão: as rotas fora do escopo do SEO por página não definem OG próprio.
// Elas dependem do Next derivar og:title/og:description do title/description
// resolvidos. Se alguém voltar a impor OG no layout, isto continua passando —
// por isso o teste checa que o valor é o DA PÁGINA, não um genérico do site.
test("tópico sem OG próprio herda o título e a descrição dele mesmo", async ({ page }) => {
  await page.goto("/topicos/big-o/");
  expect(await meta(page, 'meta[property="og:title"]')).toContain("Big O");
  const desc = await meta(page, 'meta[name="description"]');
  expect(await meta(page, 'meta[property="og:description"]')).toBe(desc);
});

test("o que é global segue global em toda rota", async ({ page }) => {
  for (const rota of [...ROTAS, { path: "/topicos/big-o/", nome: "big-o" }, { path: "/apoie/", nome: "apoie" }]) {
    await page.goto(rota.path);
    expect(await meta(page, 'meta[property="og:locale"]'), rota.nome).toBe("pt_BR");
    expect(await meta(page, 'meta[property="og:type"]'), rota.nome).toBe("website");
    expect(await meta(page, 'meta[property="og:site_name"]'), rota.nome).toBe("Roadmap DSA");
    expect(await meta(page, 'meta[name="twitter:card"]'), rota.nome).toBe("summary_large_image");
    // `keywords` é ignorada por buscador desde 2009 e era a mesma em todas as páginas.
    await expect(page.locator('head meta[name="keywords"]'), rota.nome).toHaveCount(0);
  }
});
