import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ALL_TOPICS, isEmptyTopic } from "../content/roadmap";
import { comDataUtil } from "../src/lib/datas-do-git";
import { dataLonga, diaIso } from "../src/lib/format";
import { CONTEUDO_DA_ROTA } from "../src/app/sitemap";
import { SITE_URL } from "../src/lib/links";

// Quem assina o conteúdo, quando ele foi atualizado, e a página que responde
// "quem faz isto?". Tudo conferido contra o HTML ENTREGUE, no `out/`.
//
// A regra deste arquivo, herdada do `seo-estrutura.spec.ts`: nada de contar
// `<script>` nem de procurar substring no HTML. O JSON-LD é lido com
// `JSON.parse` e conferido campo por nome, e o que o aluno lê é conferido no
// navegador, com o rótulo junto do valor.
//
// A guarda das datas NÃO é reescrita aqui: `comDataUtil` é IMPORTADA do módulo
// que o build usa. Esse guarda já errou duas vezes por ter sido recriado do
// lado de fora (uma vez perguntando `git rev-parse --is-shallow-repository`,
// outra lendo `.git/shallow`), e as duas reprovaram um sitemap correto.
//
// As três funções de leitura de artefato abaixo são cópia das do
// `seo-estrutura.spec.ts`, e a cópia é deliberada: unificá-las mexeria naquele
// arquivo, que outra frente está editando agora. Unificar é PR próprio — e
// note que o que está duplicado é PARSER, não REGRA: a regra que decide se a
// data vale (`comDataUtil`) tem um dono só, importado acima.

const OUT = path.join(process.cwd(), "out");

function html(rota: string): string {
  const f = path.join(OUT, rota.replace(/^\//, ""), "index.html");
  if (!existsSync(f)) throw new Error(`build sem a rota ${rota} (${f})`);
  return readFileSync(f, "utf8");
}

type No = Record<string, unknown>;

function jsonLd(rota: string): No[] {
  const doc = html(rota);
  const nos: No[] = [];
  const re = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(doc)) !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(m[1]);
    } catch (e) {
      throw new Error(`${rota}: JSON-LD inválido (${(e as Error).message})`);
    }
    for (const no of Array.isArray(parsed) ? parsed : [parsed]) nos.push(no as No);
  }
  return nos;
}

function doTipo(nos: No[], tipo: string): No | undefined {
  return nos.find((n) => {
    const t = n["@type"];
    return t === tipo || (Array.isArray(t) && t.includes(tipo));
  });
}

const INDEXAVEIS = ALL_TOPICS.filter((t) => !isEmptyTopic(t));
const rotaDo = (slug: string) => `/topico/${slug}/`;

/** O `lastmod` de cada URL do sitemap, por rota. Ausente = o campo não saiu. */
function lastmodPorRota(): Map<string, string | undefined> {
  const xml = readFileSync(path.join(OUT, "sitemap.xml"), "utf8");
  const mapa = new Map<string, string | undefined>();
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = m[1].match(/<loc>([^<]+)<\/loc>/)![1];
    mapa.set(loc.replace(SITE_URL, ""), m[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]);
  }
  return mapa;
}

// ---------------------------------------------------------------------------
// 1. Quem assina
// ---------------------------------------------------------------------------

test("cada tópico indexável declara o autor, e o autor é a organização da página", () => {
  // A referência é RESOLVIDA, não comparada com uma string escrita aqui: o
  // `@id` do `author` tem que ser o `@id` do nó `Organization` que aquela mesma
  // página emite. Comparar com um literal deixaria passar o dia em que o `@id`
  // da organização mudasse e o `author` continuasse apontando para o antigo —
  // que é uma referência quebrada, e o consumidor de JSON-LD lê como "autor
  // desconhecido".
  const sem: string[] = [];
  for (const t of INDEXAVEIS) {
    const rota = rotaDo(t.slug);
    const nos = jsonLd(rota);
    const recurso = doTipo(nos, "LearningResource");
    const org = doTipo(nos, "Organization");
    if (!recurso || !org) {
      sem.push(`${rota} (LearningResource=${!!recurso}, Organization=${!!org})`);
      continue;
    }
    const autor = recurso.author as No | undefined;
    expect(autor, `${rota} sem author`).toBeTruthy();
    expect(autor!["@id"], `${rota}: author aponta para um nó que não é a organização`).toBe(
      org["@id"]
    );
    expect(org.name, rota).toBe("Craft & Code Club");
  }
  expect(sem, `${sem.length} de ${INDEXAVEIS.length} tópicos sem os dois nós`).toEqual([]);
});

test("o tópico sem material nenhum não declara autor de coisa alguma", () => {
  // A outra metade da condicional. Página `noindex` não emite JSON-LD de tópico,
  // então não pode declarar autoria — se declarasse, o site estaria assinando
  // uma página que ele mesmo pede para o Google ignorar.
  const vazios = ALL_TOPICS.filter((t) => isEmptyTopic(t));
  expect(vazios.length, "o repositório precisa ter ao menos um tópico vazio").toBeGreaterThan(0);
  for (const t of vazios) {
    const nos = jsonLd(rotaDo(t.slug));
    expect(doTipo(nos, "LearningResource"), `${rotaDo(t.slug)}`).toBeUndefined();
    const comAutor = nos.filter((n) => "author" in n).map((n) => String(n["@type"]));
    expect(comAutor, `${rotaDo(t.slug)}: nó com author numa página noindex`).toEqual([]);
  }
});

// ---------------------------------------------------------------------------
// 2. As datas: presentes quando informam, ausentes quando não
// ---------------------------------------------------------------------------

test("as datas do tópico e o lastmod do sitemap contam a MESMA história", () => {
  // Este é o teste que pega o bug de verdade, e ele não pergunta nada ao git
  // deste processo — de propósito. Já foi medido que o git do processo do teste
  // enxerga um histórico diferente do git do processo do build (mesmo job: 17
  // datas no build, 1 no teste). Então a conferência é ARTEFATO contra
  // ARTEFATO: o `dateModified` das páginas e o `lastmod` do sitemap saíram do
  // MESMO processo, do MESMO `git log` e do MESMO guarda.
  //
  // Quatro afirmações, e cada uma cai por um defeito diferente:
  //
  //   (a) ou todas as páginas têm data, ou nenhuma tem — nunca pela metade;
  //   (b) a presença bate, página a página, com a do `lastmod` da mesma URL;
  //   (c) as datas presentes SOBREVIVEM ao `comDataUtil` — é aqui que morre a
  //       versão sem guarda, que em clone raso carimba as 36 páginas com a data
  //       do último deploy;
  //   (d) o valor é o mesmo instante nos dois artefatos.
  const lastmods = lastmodPorRota();
  const comData: string[] = [];
  const semData: string[] = [];
  const divergentes: string[] = [];
  const entradas: { rota: string; lastModified?: Date }[] = [];

  for (const t of INDEXAVEIS) {
    const rota = rotaDo(t.slug);
    const recurso = doTipo(jsonLd(rota), "LearningResource")!;
    const modificado = recurso.dateModified as string | undefined;
    const doSitemap = lastmods.get(rota);

    if (modificado === undefined) semData.push(rota);
    else comData.push(rota);

    // (b) presença espelhada
    if (!!modificado !== !!doSitemap) {
      divergentes.push(`${rota} → dateModified=${modificado} lastmod=${doSitemap}`);
      continue;
    }
    if (!modificado) continue;
    expect(Number.isNaN(Date.parse(modificado)), `${rota}: ${modificado} não é data`).toBe(false);
    // (d) mesmo instante
    if (Date.parse(modificado) !== Date.parse(doSitemap!)) {
      divergentes.push(`${rota} → dateModified=${modificado}, lastmod=${doSitemap}`);
    }
    entradas.push({ rota, lastModified: new Date(modificado) });
  }

  // (a)
  expect(
    semData.length === 0 || comData.length === 0,
    `datas pela metade: ${comData.length} com dateModified e ${semData.length} sem`
  ).toBe(true);

  expect(divergentes, "a página e o sitemap discordam sobre a data").toEqual([]);

  // (c) A regra vem do módulo, não daqui. `comDataUtil` devolve as entradas SEM
  // `lastModified` quando as datas não carregam informação; se ele apagar as
  // datas que o build imprimiu, o build não devia tê-las impresso.
  if (entradas.length) {
    const uteis = comDataUtil(entradas);
    const apagadas = uteis.filter((e) => e.lastModified === undefined);
    expect(
      apagadas.length,
      `${apagadas.length} das ${entradas.length} páginas carimbadas não passam no ` +
        "`comDataUtil`: as datas impressas não distinguem uma página da outra, ou seja, " +
        `é a data do último commit repetida ${entradas.length} vezes`
    ).toBe(0);
  }
});

test("datePublished nunca é depois de dateModified", () => {
  const errados: string[] = [];
  const orfaos: string[] = [];
  let comPublicado = 0;
  let comModificado = 0;
  for (const t of INDEXAVEIS) {
    const rota = rotaDo(t.slug);
    const recurso = doTipo(jsonLd(rota), "LearningResource")!;
    const pub = recurso.datePublished as string | undefined;
    const mod = recurso.dateModified as string | undefined;
    if (mod !== undefined) comModificado += 1;
    if (pub === undefined) continue;
    comPublicado += 1;
    // `datePublished` sozinho é o pior dos casos: significa que o guarda foi
    // aplicado a um campo e não ao outro.
    if (mod === undefined) orfaos.push(rota);
    else if (Date.parse(pub) > Date.parse(mod)) errados.push(`${rota} → ${pub} > ${mod}`);
  }
  expect(orfaos, "datePublished sem dateModified: o guarda pegou só um dos dois").toEqual([]);
  expect(errados, "publicado depois de atualizado").toEqual([]);
  // `datePublished` só pode FALTAR em tópico sem `.mdx` próprio — nunca sobrar.
  expect(
    comPublicado <= comModificado,
    `${comPublicado} páginas com datePublished contra ${comModificado} com dateModified`
  ).toBe(true);
});

// ---------------------------------------------------------------------------
// 3. O que o aluno lê
// ---------------------------------------------------------------------------

/** Um tópico `ready` para os testes de tela, e o `dateModified` que ele imprime. */
const EXEMPLO = INDEXAVEIS.find((t) => t.status === "ready")!;

test("o selo 'Atualizado em' está na tela, legível, e diz a data que marca", async ({ page }) => {
  const rota = rotaDo(EXEMPLO.slug);
  const recurso = doTipo(jsonLd(rota), "LearningResource")!;
  const marcado = recurso.dateModified as string | undefined;
  test.skip(
    marcado === undefined,
    "este build saiu sem datas (o `git log` dele não distingue caminhos), então não há selo " +
      "para conferir — e é esse o comportamento certo. O teste das datas acima já provou que " +
      "o sitemap concorda."
  );

  await page.goto(rota);
  // O selo mora em `.topic-chips`, junto do nível e do tempo de leitura: é o
  // lugar que a marcação diz que ele ocupa.
  const selo = page.locator(".topic-chips span.chip", { hasText: "Atualizado em" });
  await expect(selo).toHaveCount(1);

  const tempo = selo.locator("time");
  await expect(tempo).toBeVisible();

  // Ler o RÓTULO junto do valor, e não só o valor: já passou por esta casa um
  // card que dizia "descartadas sem ler" somando o elemento que acabara de ser
  // lido. Comportamento certo com rótulo errado ensina errado do mesmo jeito.
  const textoDoSelo = ((await selo.textContent()) ?? "").replace(/\s+/g, " ").trim();
  const iso = (await tempo.getAttribute("datetime")) ?? "";
  const visivel = ((await tempo.textContent()) ?? "").trim();

  expect(iso, "o <time> sem dateTime não é data para máquina nenhuma").toMatch(/^\d{4}-\d{2}-\d{2}$/);
  // O texto ao lado do número tem que ser este, e a data por extenso tem que
  // ser a MESMA que o atributo carrega — texto e `datetime` discordando por um
  // dia é o defeito que o par `dataLonga`/`diaIso` existe para não ter.
  expect(textoDoSelo).toBe(`Atualizado em ${visivel}`);
  expect(visivel).toBe(dataLonga(new Date(iso)));
  // E a marcação reflete o que está na tela: mesmo dia.
  expect(diaIso(new Date(marcado!)), "o dateModified do JSON-LD é outro dia").toBe(iso);

  // Medir, não contar: uma suíte desta casa já ficou verde sobre um painel de
  // 0px de largura e sobre texto renderizado em `font-size: 0`.
  const caixa = await tempo.boundingBox();
  expect(caixa!.width, "o selo tem largura zero").toBeGreaterThan(0);
  const fonte = await tempo.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(fonte, "o selo está em font-size 0").toBeGreaterThan(0);
});

test("quando o selo 'Publicado em' aparece, ele é um dia DIFERENTE do de atualização", async ({
  page,
}) => {
  // O selo de publicação é condicional de propósito: em 31 dos 36 artigos o
  // primeiro e o último commit caem no mesmo dia, e dois selos com a mesma data
  // não informam nada. O que este teste prende é a condição — se ela cair, o
  // primeiro tópico com as duas datas iguais imprime a mesma data duas vezes.
  const comOsDois = INDEXAVEIS.filter((t) => {
    const r = doTipo(jsonLd(rotaDo(t.slug)), "LearningResource")!;
    const p = r.datePublished as string | undefined;
    const m = r.dateModified as string | undefined;
    return p !== undefined && m !== undefined && diaIso(new Date(p)) !== diaIso(new Date(m));
  });
  const soUmDia = INDEXAVEIS.filter((t) => {
    const r = doTipo(jsonLd(rotaDo(t.slug)), "LearningResource")!;
    const p = r.datePublished as string | undefined;
    const m = r.dateModified as string | undefined;
    return p !== undefined && m !== undefined && diaIso(new Date(p)) === diaIso(new Date(m));
  });
  test.skip(
    comOsDois.length === 0 && soUmDia.length === 0,
    "este build saiu sem datas; nada para conferir na tela."
  );

  if (comOsDois.length) {
    const t = comOsDois[0];
    await page.goto(rotaDo(t.slug));
    const selo = page.locator(".topic-chips span.chip", { hasText: "Publicado em" });
    await expect(selo).toHaveCount(1);
    const tempo = selo.locator("time");
    const publicado = (await tempo.getAttribute("datetime")) ?? "";
    const atualizado =
      (await page
        .locator(".topic-chips span.chip", { hasText: "Atualizado em" })
        .locator("time")
        .getAttribute("datetime")) ?? "";
    expect(publicado, `${t.slug}: os dois selos mostram o mesmo dia`).not.toBe(atualizado);
    // Rótulo e valor, como no selo de atualização.
    expect(((await selo.textContent()) ?? "").replace(/\s+/g, " ").trim()).toBe(
      `Publicado em ${dataLonga(new Date(publicado))}`
    );
    const r = doTipo(jsonLd(rotaDo(t.slug)), "LearningResource")!;
    expect(diaIso(new Date(r.datePublished as string))).toBe(publicado);
  }
  if (soUmDia.length) {
    const t = soUmDia[0];
    await page.goto(rotaDo(t.slug));
    await expect(
      page.locator(".topic-chips span.chip", { hasText: "Publicado em" }),
      `${t.slug}: publicação e atualização no mesmo dia não podem virar dois selos iguais`
    ).toHaveCount(0);
  }
});

// ---------------------------------------------------------------------------
// 4. A rota /sobre
// ---------------------------------------------------------------------------

const SOBRE = "/sobre/";

test("o /sobre responde, com título, um h1 e o canonical dele", async ({ page }) => {
  const doc = html(SOBRE);
  const canonical = doc.match(/<link[^>]*rel="canonical"[^>]*>/)?.[0].match(/href="([^"]*)"/)?.[1];
  expect(canonical, "o /sobre não declara a própria URL").toBe(`${SITE_URL}${SOBRE}`);

  await page.goto(SOBRE);
  await expect(page).toHaveTitle(/Sobre o Roadmap DSA/);
  const h1 = page.getByRole("heading", { level: 1 });
  await expect(h1).toHaveCount(1);
  await expect(h1).toHaveText("Sobre o Roadmap DSA");
});

test("o /sobre está no sitemap, com lastmod na mesma condição das outras rotas", () => {
  const lastmods = lastmodPorRota();
  expect([...lastmods.keys()], "o /sobre ficou fora do sitemap").toContain(SOBRE);
  expect(
    Object.keys(CONTEUDO_DA_ROTA),
    "rota no sitemap sem arquivos de conteúdo declarados fica sem lastmod para sempre"
  ).toContain(SOBRE);
  // Ou todas as rotas fixas têm data, ou nenhuma tem: uma rota nova entrando
  // só no `rotasFixas` e não no `CONTEUDO_DA_ROTA` é exatamente o buraco que
  // deixa UMA URL sem `lastmod` no meio de quarenta com.
  const dasFixas = Object.keys(CONTEUDO_DA_ROTA).map((r) => lastmods.get(r));
  const comData = dasFixas.filter(Boolean).length;
  expect(
    comData === 0 || comData === dasFixas.length,
    `${comData} de ${dasFixas.length} rotas fixas com lastmod`
  ).toBe(true);
});

test("o /sobre diz a licença dupla, e diz a mesma que o repositório tem", async ({ page }) => {
  // A afirmação de licença é a que mais custa quando envelhece: este
  // repositório já teve a home dizendo "open source" sob uma licença que a OSI
  // não reconhece. O teste lê o texto RENDERIZADO e o compara com os arquivos
  // de licença do próprio repositório, não com uma string escrita aqui.
  const licenca = readFileSync(path.join(process.cwd(), "LICENSE"), "utf8");
  const conteudo = readFileSync(path.join(process.cwd(), "LICENSE-CONTENT"), "utf8");
  expect(licenca, "o LICENSE deixou de ser MIT; a /sobre precisa mudar junto").toContain("MIT");
  expect(conteudo, "o LICENSE-CONTENT deixou de ser CC BY-NC-SA").toContain("CC BY-NC-SA 4.0");

  await page.goto(SOBRE);
  const corpo = page.locator(".intro-wrap");
  await expect(corpo).toContainText("MIT");
  await expect(corpo).toContainText("CC BY-NC-SA 4.0");
  // Os dois links levam aos dois arquivos, e não os dois ao mesmo.
  await expect(page.getByRole("link", { name: "MIT" })).toHaveAttribute(
    "href",
    /\/blob\/main\/LICENSE$/
  );
  await expect(page.getByRole("link", { name: "CC BY-NC-SA 4.0" })).toHaveAttribute(
    "href",
    /\/blob\/main\/LICENSE-CONTENT$/
  );
});

test("dá para chegar ao /sobre navegando, no menu e no rodapé", async ({ page }) => {
  // Rota que existe e ninguém alcança é rota que não existe. Clicar, e não
  // conferir `href`: o `href` certo dentro de um menu que não abre continua
  // sendo uma página inalcançável.
  await page.goto("/");
  await page.locator(".site-foot").getByRole("link", { name: "Sobre" }).click();
  await expect(page).toHaveURL(new RegExp(`${SOBRE}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sobre o Roadmap DSA");

  await page.goto("/roadmap/");
  await page.getByRole("button", { name: "Mais opções" }).click();
  await page.locator(".nav-menu").getByRole("link", { name: /Sobre o projeto/ }).click();
  await expect(page).toHaveURL(new RegExp(`${SOBRE}$`));
});
