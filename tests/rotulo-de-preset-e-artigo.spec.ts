import { test, expect, type Page } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// O guarda que faltava: o rótulo do preset e o artigo são UMA coisa só.
//
// Os artigos instruem o aluno pelo TEXTO DO BOTÃO («rode o preset "Caso comum:
// remover o 59 (altura 2)"»). Renomear o rótulo sem mexer no artigo não quebra
// build, não quebra teste e não quebra tipo: quebra em silêncio, na frente do
// aluno, que procura um botão que não existe mais. Antes deste arquivo eram 81
// citações literais em 12 artigos e nenhuma asserção ligando as duas pontas.
//
// Cada caso aqui amarra TRÊS pontas, e é a terceira que dá a garantia:
//
//   1. dado    · o rótulo começa pelo texto que o artigo manda procurar;
//   2. artigo  · a página renderizada contém essa instrução;
//   3. tela    · existe um botão de preset com o rótulo inteiro.
//
// Sem a 3, renomear o rótulo passa verde. Sem a 2, reescrever o artigo passa
// verde. A asserção da 3 é sobre a LISTA de rótulos, e não `toBeVisible()` de
// propósito: quando ela reprova, o `Received` mostra os rótulos que estão de
// fato na tela, então o relatório já diz qual virou qual.
// ---------------------------------------------------------------------------

type Caso = {
  /** Slug do artigo, que também é a URL. */
  slug: string;
  /** Seletor da fileira de botões de preset dentro da peça certa da página. */
  botoes: string;
  /** O rótulo inteiro, como está no botão. */
  rotulo: string;
  /** O que o artigo manda o aluno procurar. Prefixo do rótulo. */
  citacao: string;
  /** Alguns presets moram atrás de uma aba. */
  antes?: (page: Page) => Promise<void>;
};

const CASOS: Caso[] = [
  {
    slug: "skip-list",
    botoes: "article figure.viz >> nth=0 >> .bigo-chip",
    rotulo: "A escada completa: procurar o 73",
    citacao: "A escada completa: procurar o 73",
  },
  {
    slug: "skip-list",
    botoes: "article figure.viz >> nth=1 >> .bigo-chip",
    rotulo: "Caso comum: inserir o 33 (altura 2)",
    citacao: "Caso comum: inserir o 33 (altura 2)",
  },
  {
    slug: "skip-list",
    botoes: "article figure.viz >> nth=1 >> .bigo-chip",
    rotulo: "Caso comum: remover o 59 (altura 2)",
    citacao: "Caso comum: remover o 59 (altura 2)",
    // Os presets de remoção só existem depois da aba, e é a aba que o artigo
    // manda abrir («Troque para a aba Remover»).
    antes: async (page) => {
      await page.locator("article figure.viz").nth(1).getByRole("button", { name: "Remover", exact: true }).click();
    },
  },
  {
    slug: "two-pointers",
    botoes: "article figure.viz >> nth=0 >> .bigo-chip",
    rotulo: "Alvo 16: os dois ponteiros andam",
    citacao: "Alvo 16: os dois ponteiros andam",
  },
  {
    slug: "hash-table",
    botoes: "article .ht-presets .viz-btn",
    rotulo: "Cinco chaves, cinco buckets",
    citacao: "Cinco chaves, cinco buckets",
  },
];

for (const caso of CASOS) {
  test(`${caso.slug}: o artigo cita «${caso.citacao}» e o botão existe`, async ({ page }) => {
    // 1 · a citação é mesmo um pedaço do rótulo, e não um texto parecido.
    expect(
      caso.rotulo.startsWith(caso.citacao),
      `a citação do artigo não é prefixo do rótulo: «${caso.citacao}» vs «${caso.rotulo}»`
    ).toBe(true);

    await page.goto(`/topico/${caso.slug}/`);

    // 2 · a instrução está no artigo que o aluno lê, não só no arquivo fonte.
    await expect(page.locator("article")).toContainText(caso.citacao);

    if (caso.antes) await caso.antes(page);

    // 3 · e existe um botão de preset com esse rótulo, inteiro.
    const rotulos = (await page.locator(caso.botoes).allTextContents()).map((t) => t.trim());
    expect(rotulos, `os rótulos de preset na tela de ${caso.slug}`).toContain(caso.rotulo);
  });
}

// ---------------------------------------------------------------------------
// A varredura, e ela é do FONTE de propósito.
//
// Os testes acima cobrem os cinco casos que este PR tocou. Esta parte cobre os
// 87 visualizadores de uma vez, inclusive os que nem página têm ainda, porque
// o defeito não é de renderização: é uma string de tela ancorada numa gravação
// que o leitor não viu. Guarda que só olha as páginas visitadas é opt-in
// disfarçado de varredura, e este repositório já foi mordido por isso.
//
// Duas famílias de campo entram: `label`/`rotulo`/`title` (o rótulo do botão) e
// `reading`/`leitura`/`note`/`nota` (a prosa do painel). A segunda existe
// porque três âncoras dentro do `TailRecursionForma` passaram batido por um
// grep que só olhava rótulo.
// ---------------------------------------------------------------------------

const VIZ_DIR = path.join(__dirname, "..", "content", "visualizers");

/** "no encontro", "da aula", "do vídeo", "a galera" — e o Floyd de fora. */
const ANCORA = /(?:\b(?:do|no|da|na)\s+(?:encontro|aula|v[ií]deo|gravação)|\ba galera\b|\bao vivo\b)/i;
/** O "nó do encontro" do ciclo de Floyd é termo técnico, não procedência. */
const FALSO_POSITIVO = /n[oó]\s+do\s+encontro|desencontro/i;

// As TRÊS formas de escrever uma string em TypeScript, e não só a primeira.
//
// A versão anterior só reconhecia aspas duplas, e a conta explica por que isso é
// guarda que passou disfarçado de guarda que olhou: nos 87 visualizadores são
// 855 campos de tela, dos quais 542 com aspas duplas e 313 com template ou
// aspas simples. O guarda enxergava 63,4% e afirmava cobrir tudo. Só de rótulo
// de botão (`label`/`rotulo`/`title`) eram 23 fora do alcance dele.
//
// A alternância é uma só, com três grupos, e o texto é o primeiro não-nulo: com
// três regexes separadas, um `label: "diz 'oi'"` casaria também na varredura de
// aspas simples e o mesmo campo entraria duas vezes, com o recorte errado.
// Aqui quem abre a string decide qual grupo captura, e cada campo casa uma vez.
const CAMPO_DE_TELA =
  /(?:label|rotulo|title|reading|leitura|note|nota)\s*:\s*\n?\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`)/g;

test("nenhum texto de tela de visualizador se ancora na gravação", () => {
  const achados: string[] = [];

  for (const arquivo of readdirSync(VIZ_DIR).filter((f) => f.endsWith(".tsx"))) {
    const fonte = readFileSync(path.join(VIZ_DIR, arquivo), "utf-8");
    for (const m of fonte.matchAll(CAMPO_DE_TELA)) {
      // `??` e não `||`: string vazia é um campo de tela legítimo (e vazio não
      // tem âncora), mas trocar por `||` faria o grupo seguinte responder por
      // ela e o recorte sair de outro campo.
      const texto = m[1] ?? m[2] ?? m[3];
      if (!ANCORA.test(texto) || FALSO_POSITIVO.test(texto)) continue;
      achados.push(`${arquivo}: "${texto.slice(0, 90)}"`);
    }
  }

  expect(
    achados,
    "texto de tela que só faz sentido para quem assistiu à gravação (o artigo é autocontido)"
  ).toEqual([]);
});

// ---------------------------------------------------------------------------
// E a mesma regra lida no navegador, porque fonte limpa não prova tela limpa.
//
// O classificador de recursão de cauda é onde as três âncoras de prosa moravam.
// Aqui o teste CLICA em cada caso e LÊ o painel: é o par comportamento mais
// rótulo que o repositório exige, e não a contagem de elementos que já deixou
// passar visualizador sem botão nenhum.
// ---------------------------------------------------------------------------

test("recursão funcional: a prosa do classificador não cita a gravação", async ({ page }) => {
  await page.goto("/topico/recursao-funcional/");

  const peca = page.locator("article figure.viz").filter({ hasText: "está em posição de cauda" }).first();
  const casos = peca.locator(".bigo-chip").filter({ hasNotText: "Modo treino" });
  const quantos = await casos.count();
  expect(quantos, "casos do classificador").toBeGreaterThan(5);

  const lidos: string[] = [];
  for (let i = 0; i < quantos; i++) {
    await casos.nth(i).click();
    const nota = peca.locator("p.viz-note").first();
    await expect(nota).toBeVisible();
    const texto = (await nota.textContent()) ?? "";
    expect(texto.length, `a leitura do caso ${i} veio vazia`).toBeGreaterThan(40);
    lidos.push(texto);
  }

  // Passou pelos sete casos e leu sete textos diferentes: sem isto o laço
  // poderia estar lendo o mesmo painel o tempo todo e a asserção sairia vazia.
  expect(new Set(lidos).size, "leituras distintas").toBe(quantos);

  for (const texto of lidos) {
    expect(texto, "prosa do painel ancorada na gravação").not.toMatch(ANCORA);
    expect(texto, "prosa do painel citando pessoa pelo nome").not.toMatch(/\b(Giovani|Tiago|Eduardo|Nelson)\b/);
  }

  // E o conteúdo continua lá: o caso do Elixir e o contraexemplo do reverse.
  expect(lidos.join(" ")).toContain("forma idiomática em Elixir");
  expect(lidos.join(" ")).toContain("a versão de cauda sai mais lenta");
});
