import { test, expect, type Page } from "@playwright/test";
import { TOPICOS } from "../content/topicos";
import { roadmapsDoTopico } from "../content/roadmaps";

// Todo `<button>` do site declara `type="button"`.
//
// O DEFEITO
// ---------
// O padrão do HTML para `<button>` é `type="submit"`. Hoje isso é LATENTE — não
// existe um `<form>` no site inteiro —, mas é defeito à espera do primeiro
// formulário: no dia em que um aparecer, cada botão de visualizador dentro dele
// passa a ENVIAR A PÁGINA em vez de avançar o passo, e o sintoma (a página
// recarrega sozinha ao clicar em "Próximo") não parece com a causa.
//
// A varredura que fechou o passivo foi feita pela AST do TypeScript: 196 tags em
// 78 arquivos de `content/visualizers/`, mais os 2 da casca em
// `src/lib/visualizer.tsx`, que já tinham `type` pelo objeto espalhado.
//
// `grep -c "<button"` não serve de régua, e o desvio é medível aqui mesmo: em
// `src/` ele conta 17 e a AST conta 14 tags de verdade. Os 3 de diferença são
// `<button>` escrito em COMENTÁRIO (`Shell.tsx:362`, `visualizer.tsx:168` e
// `:818`). Ele também conta `<button>` dentro de string de exemplo de código —
// texto que o aluno LÊ na tela, e que não é tag nenhuma. Em `content/` os dois
// números batem hoje por sorte, não por propriedade.
//
// POR QUE ESTE ARQUIVO EXISTE, SE A REGRA DE LINT JÁ ESTÁ LIGADA
// --------------------------------------------------------------
// `react/button-has-type` (ligada como erro no `eslint.config.mjs`) impede o
// 197º botão escrito à mão. Ela **não** enxerga duas coisas:
//
//   1. `{...spread}`. Os dois botões da casca (`⤢ Expandir` e
//      `Mostrar código`) recebem as props de `blockButtonProps` /
//      `expandButtonProps`, e a regra lê só o que está escrito na tag — tanto
//      que os dois carregam um `eslint-disable-next-line` com o motivo ao lado.
//      Nenhuma varredura de TEXTO no código-fonte prova que eles estão certos,
//      e eles se repetem em toda peça de todo tópico. Só o DOM prova;
//   2. o que sai do build. Lint lê fonte; o aluno recebe HTML.
//
// Por isso as duas asserções aqui leem o ENTREGUE: a primeira o HTML do `out/`,
// a segunda a PROPRIEDADE `type` no DOM — que é a que o navegador consulta na
// hora de decidir se o clique envia, e que devolve `"submit"` sozinha quando o
// atributo falta.
//
// COMO SABER SE ESTE TESTE PRESTA
// -------------------------------
// Prova de quebra, sem `git checkout --` (que apagaria o conserto junto): tire o
// ` type="button"` de UMA tag, por exemplo o "Sortear" de
// `content/visualizers/IntervalsVisualizer.tsx` (`<button type="button"
// className="viz-btn" onClick={randomize}>`), rode `npm run test:build` e
// espere ver `/topicos/intervals/` na lista de reprovadas, com o rótulo
// "Sortear" no relatório. `npm test` sozinho não serve: ele exercita o `out/`
// da build anterior, que ainda tem o atributo.

/** Rotas fixas do site, fora as de tópico. */
const ROTAS_FIXAS = ["/", "/fundamentos/", "/introducao/", "/sobre/", "/apoie/"];

const ROTAS = [
  ...ROTAS_FIXAS,
  ...TOPICOS.map((t) => `/topicos/${t.slug}/`),
  // A mesma página com a outra casca: é a rota com o menu completo, e a única
  // em que o piso alto tem o que medir.
  ...TOPICOS.filter((t) => roadmapsDoTopico(t.slug).some((r) => r.slug === "fundamentos")).map(
    (t) => `/fundamentos/${t.slug}/`
  ),
];

/**
 * Pisos de contagem. Eles NÃO são o teste — o teste é o `type` lido. Existem
 * porque um seletor errado casa com zero elementos, e "nenhum botão errado
 * entre zero botões" é verde vazio, que é o jeito mais comum de uma varredura
 * mentir. Ficam bem abaixo do medido para não reprovarem quando um artigo
 * ganhar ou perder uma peça.
 */
// Medido no `out/` de hoje: 6.715 tags em 178 rotas. Os pisos ficam bem abaixo.
//
// O piso por rota deixou de ser um número só quando os tópicos perderam a casa.
// Antes, TODA rota carregava o menu dos 47 tópicos, e um piso de 40 valia para
// qualquer página. Hoje a casca varia com a rota: `/fundamentos/<t>/` tem o menu
// inteiro (126 a 144 botões), `/topicos/<t>/` tem a barra dos roadmaps do tópico
// (32 num tópico com visualizador, 3 num sem material) e `/roadmaps/` tem 1.
// Um piso único ou reprovava as páginas leves ou não protegia nada nas pesadas.
const PISO_HTML_TOTAL = 4000;
/** Nenhuma rota pode vir com ZERO: aí a régua não casou com nada. */
const PISO_HTML_ROTA = 1;
/** As que carregam o menu completo. Se ele sumir, é aqui que aparece. */
const PISO_HTML_ROTA_COM_MENU = 40;
const COM_MENU = (rota: string) => rota.startsWith("/fundamentos/") && rota !== "/fundamentos/";
const PISO_DOM_ROTA = 20;

/**
 * As tags `<button>` de abertura do HTML, com o `<script>` fora.
 *
 * O `<script>` sai porque o payload do Next carrega o HTML da página outra vez,
 * dentro de string JavaScript: contá-lo dobraria tudo e faria o piso mentir. E
 * `<button` escrito num bloco de código do artigo chega como `&lt;button`, então
 * exemplo de código não entra aqui — que é exatamente a diferença entre esta
 * régua e o `grep`.
 */
function tagsDeBotao(html: string): string[] {
  const semScript = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  return semScript.match(/<button\b[^>]*>/gi) ?? [];
}

test("no HTML entregue, nenhum <button> sai sem type", async ({ request }) => {
  const errados: string[] = [];
  const magros: string[] = [];
  let total = 0;

  // Em lotes, e não uma rota de cada vez: as rotas passaram de 52 para 124
  // quando cada tópico ganhou as duas URLs, e em série a varredura estourava o
  // timeout de 30s antes de conferir metade.
  const LOTE = 16;
  const paginas: { rota: string; html: string }[] = [];
  for (let i = 0; i < ROTAS.length; i += LOTE) {
    const lote = await Promise.all(
      ROTAS.slice(i, i + LOTE).map(async (rota) => {
        const resposta = await request.get(rota);
        return { rota, status: resposta.status(), html: await resposta.text() };
      })
    );
    for (const r of lote) {
      expect(r.status, `${r.rota} não respondeu 200`).toBe(200);
      paginas.push({ rota: r.rota, html: r.html });
    }
  }

  for (const { rota, html } of paginas) {
    const tags = tagsDeBotao(html);
    total += tags.length;
    const piso = COM_MENU(rota) ? PISO_HTML_ROTA_COM_MENU : PISO_HTML_ROTA;
    if (tags.length < piso) magros.push(`${rota} → ${tags.length} tags (piso ${piso})`);
    for (const tag of tags) {
      // Só `type="button"` passa. `submit` e `reset` explícitos reprovam do
      // mesmo jeito: nenhum dos dois tem o que fazer num site sem formulário, e
      // aceitá-los deixaria o defeito voltar com o atributo escrito.
      if (!/\stype=["']button["']/i.test(tag)) errados.push(`${rota}  ${tag.slice(0, 160)}`);
    }
  }

  expect(
    magros,
    "estas rotas vieram abaixo do piso de botões no HTML — ou o build está sem " +
      "os visualizadores, ou a régua parou de casar, e aí o verde é vazio"
  ).toEqual([]);
  expect(
    total,
    `a varredura achou ${total} tags <button> no HTML de ${ROTAS.length} rotas, menos que o piso de ${PISO_HTML_TOTAL}`
  ).toBeGreaterThanOrEqual(PISO_HTML_TOTAL);
  expect(
    errados,
    'sem `type="button"` o padrão do HTML é `submit`, e dentro de um <form> o clique envia a página'
  ).toEqual([]);
  console.log(`HTML entregue: ${total} tags <button> conferidas em ${ROTAS.length} rotas`);
});

/**
 * Lê a PROPRIEDADE `type` de todo `<button>` do documento e devolve só os
 * errados, com o nome acessível junto — para o relatório dizer QUAL botão, e não
 * só quantos.
 */
async function varrerDom(page: Page, onde: string, piso: number) {
  const achado = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("button"));
    return {
      total: els.length,
      errados: els
        .filter((el) => el.type !== "button")
        .map(
          (el) =>
            `${el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 32) ?? "?"} [${el.className}] → type="${el.type}"`
        ),
    };
  });
  expect(
    achado.total,
    `${onde}: só ${achado.total} botões no DOM, menos que o piso de ${piso} — a varredura estaria verde por vazio`
  ).toBeGreaterThanOrEqual(piso);
  expect(
    achado.errados,
    `${onde}: a propriedade \`type\` destes botões é \`submit\`, e é ela que o navegador consulta na hora de decidir se o clique envia`
  ).toEqual([]);
  console.log(`${onde.padEnd(52)} ${achado.total} botões`);
  return achado.total;
}

/**
 * Rotas com peças de perfis diferentes: uma com várias figuras na mesma página,
 * uma cujo miolo troca de conjunto de botões quando o aluno muda de modo, e uma
 * de gráfico, que monta os controles em outro caminho.
 */
const ROTAS_DOM = ["/topicos/two-pointers/", "/topicos/intervals/", "/topicos/big-o/"];

test("no DOM, a propriedade type de todo <button> é 'button' — inclusive nos que só existem depois do clique", async ({
  page,
}) => {
  for (const rota of ROTAS_DOM) {
    await page.goto(rota);
    // A casca do visualizador só chega ao DOM depois da hidratação; sem esperar,
    // a varredura passaria por não achar nada (e o piso acusaria).
    await expect(page.locator(".viz-expand").first()).toBeVisible();
    await varrerDom(page, `${rota} (depois de hidratar)`, PISO_DOM_ROTA);
  }

  // As duas montagens que o HTML estático NÃO tem.
  await page.goto("/topicos/two-pointers/");
  const primeira = page.locator("article figure.viz").first();

  // 1 · o bloco de código, que a casca só põe no DOM quando o aluno pede.
  const codigo = primeira.getByRole("button", { name: /código$/ });
  if (await codigo.count()) {
    await codigo.first().click();
    await varrerDom(page, "/topicos/two-pointers/ (código à mostra)", PISO_DOM_ROTA);
  }

  // 2 · o painel expandido, montado no clique com uma segunda cópia do
  // cabeçalho, dos controles e do miolo da peça.
  await primeira.getByRole("button", { name: "⤢ Expandir" }).click();
  await expect(page.locator(".viz-overlay figure.viz")).toBeVisible();
  await varrerDom(page, "/topicos/two-pointers/ (painel expandido)", PISO_DOM_ROTA);
});
