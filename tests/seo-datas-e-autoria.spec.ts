import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ALL_TOPICS, isEmptyTopic } from "../content/fundamentos";
import {
  CONTEUDO_DA_ROTA,
  datasDistinguemCaminhos,
  LIMITE_DE_CONCENTRACAO,
} from "../src/lib/datas-do-git";
import { dataLonga, diaIso } from "../src/lib/format";
import { SITE_URL } from "../src/lib/links";

// Quem assina o conteúdo, quando ele foi atualizado, e a página que responde
// "quem faz isto?". Tudo conferido contra o HTML ENTREGUE, no `out/`.
//
// A regra deste arquivo, herdada do `seo-estrutura.spec.ts`: nada de contar
// `<script>` nem de procurar substring no HTML. O JSON-LD é lido com
// `JSON.parse` e conferido campo por nome, e o que o aluno lê é conferido no
// navegador, com o rótulo junto do valor.
//
// A guarda das datas NÃO é reescrita aqui: `datasDistinguemCaminhos` é
// IMPORTADA do módulo que o build usa. Esse guarda já errou duas vezes por ter
// sido recriado do lado de fora (uma vez perguntando
// `git rev-parse --is-shallow-repository`, outra lendo `.git/shallow`), e as
// duas reprovaram um sitemap correto.
//
// As três funções de leitura de artefato abaixo são cópia das do
// `seo-estrutura.spec.ts`, e a cópia é deliberada: unificá-las mexeria naquele
// arquivo, que outra frente está editando agora. Unificar é PR próprio — e
// note que o que está duplicado é PARSER, não REGRA: a regra que decide se a
// data vale tem um dono só, importado acima.

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
  // Três afirmações, e cada uma cai por um defeito diferente:
  //
  //   (a) ou todas as páginas têm data, ou nenhuma tem — nunca pela metade;
  //   (b) a presença bate, página a página, com a do `lastmod` da mesma URL;
  //   (c) o valor é o mesmo instante nos dois artefatos.
  const lastmods = lastmodPorRota();
  const comData: string[] = [];
  const semData: string[] = [];
  const divergentes: string[] = [];

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
    // (c) mesmo instante
    if (Date.parse(modificado) !== Date.parse(doSitemap!)) {
      divergentes.push(`${rota} → dateModified=${modificado}, lastmod=${doSitemap}`);
    }
  }

  // (a)
  expect(
    semData.length === 0 || comData.length === 0,
    `datas pela metade: ${comData.length} com dateModified e ${semData.length} sem`
  ).toBe(true);

  expect(divergentes, "a página e o sitemap discordam sobre a data").toEqual([]);

  // Sobre o que este teste NÃO afirma, que é a parte que quase virou defeito:
  //
  // Uma versão anterior exigia que as datas IMPRESSAS passassem no critério de
  // concentração do módulo. Parecia o guarda mais forte possível e era um falso
  // positivo esperando a vez: a data de um tópico é o mais recente entre o
  // artigo e o intervalo dele no `roadmap.ts`, então um commit em lote naquele
  // arquivo — renomear um campo em todos os tópicos, por exemplo — coloca as 36
  // páginas na MESMA data. Medido: moda de 36/36, 100%, contra o teto de 50%.
  // O build estaria certo (todas as páginas mudaram mesmo, naquele commit) e o
  // teste reprovaria.
  //
  // Concentração é um bom sinal de "git cego" sobre CAMINHOS BRUTOS, que é onde
  // o módulo a aplica, e um mau sinal sobre datas agregadas por página, que
  // podem convergir por um motivo legítimo. A regra em si é provada com entrada
  // sintética, no teste `o guarda de datas reprova histórico achatado`.
});

test("o guarda de datas reprova histórico achatado, e não só o caso extremo", () => {
  // A regra do módulo, provada com entrada sintética — onde o veredito certo é
  // conhecido sem perguntar nada ao git.
  //
  // O caso do meio é o que motivou a troca de critério. A regra anterior era
  // `Set.size > 1`: bastavam DUAS datas distintas para ela aprovar. Num clone
  // raso com alguns commits em cima, os caminhos que esses commits tocaram
  // resolvem para eles e todo o resto resolve para o commit-fronteira — duas
  // datas distintas, aprovação, e a maioria das páginas com data fabricada.
  const FRONTEIRA = Date.parse("2026-08-08T10:00:00Z");
  const repetido = (n: number) => Array.from({ length: n }, () => FRONTEIRA);
  const distintos = (n: number) => Array.from({ length: n }, (_, i) => FRONTEIRA - (i + 1) * 3600000);

  // Histórico de verdade: cada caminho com a sua data.
  expect(datasDistinguemCaminhos(distintos(45)), "clone completo").toBe(true);

  // Raso puro: uma data para tudo. `Set.size > 1` também pegava este.
  expect(datasDistinguemCaminhos(repetido(45)), "raso: uma data só").toBe(false);

  // Raso com 3 commits em cima: 42 na fronteira, 3 de verdade. Concentração de
  // 93,3%. É AQUI que a regra antiga aprovava e a nova reprova.
  expect(
    datasDistinguemCaminhos([...repetido(42), ...distintos(3)]),
    "raso + 3 commits recentes: 93,3% de concentração"
  ).toBe(false);

  // Raso com 10 em cima: 77,8%. Ainda achatado.
  expect(
    datasDistinguemCaminhos([...repetido(35), ...distintos(10)]),
    "raso + 10 commits recentes: 77,8% de concentração"
  ).toBe(false);

  // Sem dado nenhum não é evidência de nada, e não pode virar aprovação.
  expect(datasDistinguemCaminhos([]), "nenhum carimbo").toBe(false);
  expect(datasDistinguemCaminhos([undefined, undefined]), "só caminhos sem histórico").toBe(false);

  // `undefined` não conta nem a favor nem contra: ele é ausência de dado, não
  // evidência de achatamento.
  expect(
    datasDistinguemCaminhos([...distintos(4), undefined, undefined]),
    "4 datas distintas com 2 caminhos sem histórico"
  ).toBe(true);

  // A fronteira exata do critério, para o teto não escorregar sem ninguém ver:
  // metade repetida passa, um a mais reprova.
  const metade = [...repetido(10), ...distintos(10)];
  expect(datasDistinguemCaminhos(metade), `moda em exatamente ${100 * LIMITE_DE_CONCENTRACAO}%`).toBe(true);
  expect(datasDistinguemCaminhos([...repetido(11), ...distintos(10)]), "moda logo acima do teto").toBe(false);
});

test("a página não declara datePublished, porque não mostra data de publicação", () => {
  // Decisão de 2026-08-08: o selo "Publicado em" saiu da tela. Ele aparecia em
  // 8 das 47 páginas (só onde os dois dias diferiam), e a doc do Google pede
  // para MINIMIZAR a presença de outras datas na página.
  //
  // O campo tinha de sair junto, e não é preferência: o contrato do
  // `src/lib/jsonld.ts` é que a marcação reflita o que está na tela, e campo sem
  // correspondente visível não entra. Este teste é o que impede o campo de
  // voltar sozinho, sem o selo.
  const sobrando: string[] = [];
  for (const t of INDEXAVEIS) {
    const rota = rotaDo(t.slug);
    const recurso = doTipo(jsonLd(rota), "LearningResource")!;
    if (recurso.datePublished !== undefined) sobrando.push(rota);
  }
  expect(sobrando, "datePublished sem o selo 'Publicado em' na tela").toEqual([]);
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

test("o selo 'Publicado em' não está na tela de nenhum tópico", async ({ page }) => {
  // O par do teste acima, do lado do aluno: uma coisa é o campo não sair no
  // JSON-LD, outra é o selo não voltar ao HTML. Os dois têm de cair juntos.
  const comSelo: string[] = [];
  for (const t of INDEXAVEIS.slice(0, 6)) {
    await page.goto(rotaDo(t.slug));
    if (await page.locator(".topic-chips span.chip", { hasText: "Publicado em" }).count()) {
      comSelo.push(t.slug);
    }
    // E o de atualização continua lá: este teste não pode passar porque a
    // página inteira perdeu os selos.
    await expect(
      page.locator(".topic-chips span.chip", { hasText: "Atualizado em" }),
      `${t.slug} perdeu também o selo de atualização`
    ).toHaveCount(1);
  }
  expect(comSelo, "o selo de publicação voltou à tela").toEqual([]);
});

test("o rodapé aparece em TODA rota, e não só na home", async ({ page }) => {
  // Ele existia só em `src/app/page.tsx`: a home tinha rodapé e as 34 páginas de
  // aula tinham zero. Quem chegava numa delas pela busca não tinha caminho
  // nenhum para descobrir quem publica o material.
  const rotas = ["/", "/fundamentos/", "/sobre/", "/apoie/", "/introducao/", rotaDo(INDEXAVEIS[0].slug)];
  for (const rota of rotas) {
    await page.goto(rota);
    const pe = page.locator("footer.site-foot");
    await expect(pe, `${rota} sem rodapé`).toHaveCount(1);
    // Rótulo lido, não elemento contado: rodapé vazio também tem count 1.
    await expect(pe).toContainText("Feito");
    await expect(pe).toContainText("pela comunidade, para a comunidade");
    await expect(pe).toContainText("gratuito para sempre");
    // Sem links: a barra fixa já leva a tudo, e rodapé que repete o menu é um
    // segundo lugar para a mesma verdade envelhecer.
    await expect(pe.locator("a"), `${rota}: o rodapé voltou a ter links`).toHaveCount(0);
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

test("a /sobre não promete privacidade que o código desmente", async ({ page }) => {
  // Esta página já afirmou que "nada é enviado para lugar nenhum" enquanto o
  // site carregava Google Analytics em produção. O guarda amarra a afirmação ao
  // CÓDIGO que a desmentiria: enquanto existir um componente que monta o GA, a
  // página tem que dizer o nome dele. Se o GA sair do projeto, este teste
  // reprova pedindo que o texto mude junto — é o mesmo desenho do teste de
  // licença, que lê o `LICENSE` em vez de uma string escrita aqui.
  const analytics = readFileSync(
    path.join(process.cwd(), "src", "components", "Analytics.tsx"),
    "utf8"
  );
  const carregaGa = /GoogleAnalytics|AnalyticsDeferred/.test(analytics);

  await page.goto(SOBRE);
  const corpo = page.locator(".intro-wrap");

  if (carregaGa) {
    await expect(
      corpo,
      "o site monta Google Analytics, então a /sobre precisa dizer isso pelo nome"
    ).toContainText("Google Analytics");
  }

  // E a afirmação absoluta não volta. A frase certa é sobre o PROGRESSO; a
  // errada é sobre o site inteiro, e é uma promessa que o site não cumpre.
  const texto = ((await corpo.textContent()) ?? "").replace(/\s+/g, " ");
  expect(
    texto,
    "a /sobre voltou a prometer que nada sai do navegador, o que o Analytics desmente"
  ).not.toMatch(/nada é enviado para lugar nenhum/i);
});

test("dá para chegar ao /sobre pelo menu, e ele é o PRIMEIRO item", async ({ page }) => {
  // Rota que existe e ninguém alcança é rota que não existe. Clicar, e não
  // conferir `href`: o `href` certo dentro de um menu que não abre continua
  // sendo uma página inalcançável.
  //
  // O rodapé saiu desta conta de propósito: ele não tem mais links, porque a
  // barra é fixa e já leva a tudo. Se um dia alguém devolver links ao rodapé,
  // é o teste do rodapé que reprova, não este.
  await page.goto("/fundamentos/");
  await page.getByRole("button", { name: "Mais opções" }).click();

  // Primeiro item, e a ordem é a decisão: "quem escreveu isto?" vem antes de
  // qualquer link para fora. Leio a ordem renderizada em vez de confiar na
  // ordem do arquivo, que o CSS pode reordenar (`.foot-links` já fazia isso
  // com `order: -1`).
  const itens = page.locator(".nav-menu .menu-item:not(.only-mobile)");
  await expect(itens.first()).toContainText("Sobre o projeto");

  await itens.first().click();
  await expect(page).toHaveURL(new RegExp(`${SOBRE}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sobre o Roadmap DSA");
});
