import { test, expect, type APIRequestContext } from "@playwright/test";
import { createHash } from "node:crypto";
import { ALL_TOPICS } from "../content/fundamentos";

// O card de compartilhamento de cada tópico.
//
// O defeito que este arquivo fecha: as 47 páginas de tópico não tinham
// `opengraph-image.tsx` próprio e herdavam o da raiz. Medido antes da correção,
// `/topico/dijkstra/`, `/topico/strings/` e `/apoie/` traziam exatamente
// `https://dsa.craftcodeclub.io/opengraph-image?e42ae7e3eac68247` — o mesmo
// arquivo, o mesmo hash. Compartilhar Dijkstra entregava um card que não dizia
// "Dijkstra".
//
// Por isso nenhum teste aqui pergunta se o arquivo existe. Existir é o que a
// versão quebrada também fazia: a rota da raiz existia, respondia 200 e era a
// mesma para todo mundo. As perguntas que separam o certo do errado são outras
// três, e são as que estão abaixo:
//
//   1. a URL do card de cada tópico aponta para a rota DAQUELE tópico;
//   2. dois tópicos diferentes entregam BYTES diferentes (URL diferente com o
//      mesmo desenho continuaria sendo o defeito, só que mais bem escondido);
//   3. o que o HTML declara sobre a imagem bate com a imagem que chega.

/** Tópicos de perfis diferentes, escolhidos pelo que cada um estressa no card. */
const PERFIS = [
  { slug: "dijkstra", perfil: "nome curto (8 caracteres) e descrição de uma linha" },
  { slug: "busca-binaria-avancada", perfil: "o nome mais longo do roadmap (36), e status soon" },
  { slug: "strings", perfil: "descrição de 213 caracteres, que o card corta na primeira frase" },
  { slug: "matematica", perfil: "o nome do tópico é o próprio nome do grupo" },
  { slug: "binary-numbers", perfil: "a descrição que trazia o símbolo sem fonte, hoje em palavras" },
];

/** As rotas que continuam caindo no card da raiz: nenhuma delas tem card próprio. */
const SEM_CARD_PROPRIO = ["/", "/apoie/"];

const CARD_DA_RAIZ = "/opengraph-image";
const ASSINATURA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Todos os `<meta>` do documento, lidos POR ATRIBUTO e não por posição.
 *
 * A primeira versão disto casava a linha inteira
 * (`<meta (?:property|name)="X" content="(...)"`), o que amarrava o teste à
 * ordem exata em que o Next serializa o `<head>` hoje. E o modo de falhar era o
 * pior possível: mudando a ordem, o `match` devolve `null`, o leitor não acha
 * nenhuma meta, e um teste menos cuidadoso passaria por vacuidade em vez de
 * reprovar. Um teste de SEO que para de ler o `<head>` sem avisar é pior que
 * não ter teste.
 *
 * Agora cada tag é recortada primeiro e os atributos dela viram um mapa, então
 * ordem, atributo extra e `>` dentro de valor aspado não mudam o resultado.
 */
function metasDoHtml(html: string): Map<string, string> {
  const encontradas = new Map<string, string>();
  // `(?:[^>"]|"[^"]*")*` deixa o valor aspado conter ">" sem cortar a tag no meio.
  for (const [tag] of html.matchAll(/<meta\b(?:[^>"]|"[^"]*")*>/g)) {
    const atributos = new Map<string, string>();
    for (const [, nome, valor] of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*"([^"]*)"/g)) {
      atributos.set(nome.toLowerCase(), valor);
    }
    const chave = atributos.get("property") ?? atributos.get("name");
    const conteudo = atributos.get("content");
    if (chave !== undefined && conteudo !== undefined) encontradas.set(chave, conteudo);
  }
  return encontradas;
}

/** Devolve um leitor de `<meta>` do HTML já baixado da rota. */
async function metasDe(request: APIRequestContext, rota: string): Promise<(nome: string) => string> {
  const resposta = await request.get(rota);
  expect(resposta.status(), `GET ${rota}`).toBe(200);
  const metas = metasDoHtml(await resposta.text());
  return (nome) => {
    const valor = metas.get(nome);
    // Falta de meta é reprovação aqui, na origem, e não um valor de mentira que
    // viaja até uma comparação que talvez nem olhe para ele.
    expect(valor, `${rota}: o <meta> "${nome}" não está no HTML`).toBeDefined();
    return valor as string;
  };
}

/** O caminho local de uma URL absoluta de produção, com a query de hash junto. */
function rotaLocal(urlAbsoluta: string): string {
  const url = new URL(urlAbsoluta);
  return `${url.pathname}${url.search}`;
}

/** Largura e altura lidas do cabeçalho IHDR do PNG, que é a imagem de verdade. */
function tamanhoReal(png: Buffer): { width: number; height: number } {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

// A forma posicional que o `metasDoHtml` aposentou, guardada de propósito: é
// contra ela que o teste abaixo mede, e é o que prova que a troca resolveu algo.
const LEITOR_POSICIONAL = (nome: string) =>
  new RegExp(`<meta (?:property|name)="${nome}" content="([^"]*)"`);

test("o leitor de <meta> não depende da ordem nem do número de atributos", () => {
  // `achavaAntes` é o que a forma posicional fazia com cada caso. Ele está aqui
  // escrito à mão de propósito: foi ele que reprovou o primeiro rascunho deste
  // teste, onde eu tinha suposto que a tag sem a barra final também escapava da
  // forma antiga. Não escapava.
  const casos = [
    { nome: "a ordem que o Next serializa hoje", html: '<meta property="og:image" content="/a"/>', achavaAntes: true },
    { nome: "sem a barra final", html: '<meta property="og:image" content="/a">', achavaAntes: true },
    { nome: "ordem invertida", html: '<meta content="/a" property="og:image"/>', achavaAntes: false },
    { nome: "atributo extra no meio", html: '<meta property="og:image" data-x="1" content="/a"/>', achavaAntes: false },
    { nome: "quebra de linha entre os atributos", html: '<meta property="og:image"\n      content="/a"/>', achavaAntes: false },
  ];

  for (const caso of casos) {
    // O leitor novo acha em todos.
    expect(metasDoHtml(caso.html).get("og:image"), `novo: ${caso.nome}`).toBe("/a");

    // E o antigo achava em dois de cinco. Nos outros três devolvia `null`, que é
    // o silêncio que este teste existe para não deixar acontecer de novo.
    const antigo = caso.html.match(LEITOR_POSICIONAL("og:image"));
    if (caso.achavaAntes) expect(antigo?.[1], `antigo: ${caso.nome}`).toBe("/a");
    else expect(antigo, `antigo: ${caso.nome}`).toBeNull();
  }

  // Valor com ">" dentro das aspas não corta a tag no meio.
  const comMaior = '<meta name="description" content="quando a > b, troque"/><meta property="og:image" content="/b"/>';
  expect(metasDoHtml(comMaior).get("description")).toBe("quando a > b, troque");
  expect(metasDoHtml(comMaior).get("og:image")).toBe("/b");
});

test("cada página de tópico aponta para o card dela, e não para o da raiz", async ({ request }) => {
  test.setTimeout(120_000);

  const apontam: Record<string, string> = {};
  const deviam: Record<string, string> = {};

  for (const t of ALL_TOPICS) {
    const meta = await metasDe(request, `/topico/${t.slug}/`);
    apontam[t.slug] = new URL(meta("og:image")).pathname;
    deviam[t.slug] = `/topico/${t.slug}/opengraph-image`;
  }

  // Uma asserção só, com os 47 lado a lado: quando a rota some, o diff mostra os
  // 47 caindo em "/opengraph-image", que é exatamente o defeito de origem.
  expect(apontam).toEqual(deviam);
});

test("o card do Twitter é o mesmo do Open Graph, tópico a tópico", async ({ request }) => {
  for (const { slug, perfil } of PERFIS) {
    const meta = await metasDe(request, `/topico/${slug}/`);
    // O `twitter:image` não é declarado em lugar nenhum: o Next o deriva do
    // mesmo arquivo de imagem. Se ele divergir, o card do X/Twitter volta a ser
    // o da home sem nenhum outro sinal.
    expect(meta("twitter:image"), `${slug} (${perfil})`).toBe(meta("og:image"));
  }
});

test("dois tópicos diferentes entregam imagens diferentes, nos bytes", async ({ request }) => {
  const impressoes = new Map<string, string>();

  for (const { slug, perfil } of PERFIS) {
    const meta = await metasDe(request, `/topico/${slug}/`);
    const resposta = await request.get(rotaLocal(meta("og:image")));

    // A imagem tem que existir de verdade: URL certa apontando para 404 é o
    // mesmo card quebrado, só que sem card nenhum.
    expect(resposta.status(), `${slug} (${perfil}): o PNG do card`).toBe(200);

    const png = await resposta.body();
    expect(png.subarray(0, 8), `${slug}: não é um PNG`).toEqual(ASSINATURA_PNG);

    // O rótulo ao lado do número: o HTML promete 1200x630, e quem confere é o
    // cabeçalho da imagem que chega, não a constante que escreveu a promessa.
    expect(tamanhoReal(png), `${slug}: o PNG não tem o tamanho que o HTML declara`).toEqual({
      width: Number(meta("og:image:width")),
      height: Number(meta("og:image:height")),
    });
    expect(meta("og:image:type"), slug).toBe("image/png");

    impressoes.set(slug, createHash("sha256").update(png).digest("hex"));
  }

  // O card da raiz entra na comparação: se algum tópico repetir os bytes dele, o
  // defeito voltou por outro caminho.
  const raiz = await request.get(CARD_DA_RAIZ);
  expect(raiz.status()).toBe(200);
  impressoes.set("(raiz)", createHash("sha256").update(await raiz.body()).digest("hex"));

  expect(new Set(impressoes.values()).size, `imagens repetidas entre ${[...impressoes.keys()]}`).toBe(
    impressoes.size
  );
});

test("quem não tem card próprio continua caindo no da raiz", async ({ request }) => {
  // O contrapeso do teste de cima: acrescentar card por tópico não pode roubar o
  // card das rotas que dependem da herança. `/apoie/` é a que sempre dependeu.
  for (const rota of SEM_CARD_PROPRIO) {
    const meta = await metasDe(request, rota);
    expect(new URL(meta("og:image")).pathname, rota).toBe(CARD_DA_RAIZ);
  }
});
