import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { ALL_TOPICS, isEmptyTopic } from "../content/roadmap";
import { LINKS, SITE_URL } from "../src/lib/links";

// Estrutura de SEO do site inteiro: canonical, sitemap e dados estruturados.
//
// Por que este arquivo existe separado do `seo.spec.ts`: aquele protege o card
// social das TRÊS páginas de entrada, e faz isso a partir de uma lista escrita à
// mão (`ROTAS`). Uma lista à mão só cobre o que alguém lembrou de escrever nela,
// e foi exatamente assim que 48 das 51 rotas ficaram sem canonical enquanto a
// suíte seguia verde — ela chegava a VISITAR `/topico/big-o/` e `/apoie/` para
// conferir `og:locale`, e nunca olhava o canonical.
//
// Daí as duas regras deste arquivo:
//
//   1. a lista de rotas vem de `ALL_TOPICS`, a fonte de dados. Tópico novo entra
//      na cobertura sozinho, no mesmo commit que o cria;
//   2. o JSON-LD é lido com `JSON.parse` e conferido CAMPO POR NOME. Contar
//      `<script>` não prova nada: este repositório já teve suíte verde sobre um
//      visualizador sem um único botão renderizado, porque o teste contava
//      elemento em vez de verificar comportamento.
//
// A varredura lê o `out/` direto do disco em vez de navegar rota por rota. Não é
// atalho: canonical, sitemap e JSON-LD são artefatos de build, e o cruzamento do
// item 3 (URL do sitemap contra o `robots` do HTML de destino) SÓ existe com os
// dois artefatos abertos lado a lado. O `webServer` serve esse mesmo diretório.

const OUT = path.join(process.cwd(), "out");

const ROTAS_FIXAS = ["/", "/introducao/", "/roadmap/", "/apoie/"] as const;
const ROTAS_TOPICO = ALL_TOPICS.map((t) => `/topico/${t.slug}/`);
const TODAS_AS_ROTAS = [...ROTAS_FIXAS, ...ROTAS_TOPICO];

// Rotas que o site quer no índice do Google: as fixas mais os tópicos que têm
// material. É a MESMA função `isEmptyTopic` que a página usa para decidir o
// `noindex` — dois predicados para a mesma decisão é como o buraco do sitemap
// nasceu, e recriar a condição aqui recriaria o buraco dentro do teste.
const ROTAS_INDEXAVEIS = [
  ...ROTAS_FIXAS,
  ...ALL_TOPICS.filter((t) => !isEmptyTopic(t)).map((t) => `/topico/${t.slug}/`),
];

function arquivoDaRota(rota: string): string {
  return path.join(OUT, rota.replace(/^\//, ""), "index.html");
}

function html(rota: string): string {
  const f = arquivoDaRota(rota);
  if (!existsSync(f)) throw new Error(`build sem a rota ${rota} (${f})`);
  return readFileSync(f, "utf8");
}

function atributo(tag: string, nome: string): string | null {
  const m = tag.match(new RegExp(`${nome}="([^"]*)"`));
  return m ? m[1] : null;
}

function canonical(doc: string): string | null {
  const m = doc.match(/<link[^>]*rel="canonical"[^>]*>/);
  return m ? atributo(m[0], "href") : null;
}

function metaProp(doc: string, prop: string): string | null {
  const m = doc.match(new RegExp(`<meta[^>]*property="${prop}"[^>]*>`));
  return m ? atributo(m[0], "content") : null;
}

function ehNoindex(doc: string): boolean {
  const m = doc.match(/<meta[^>]*name="robots"[^>]*>/);
  return !!m && (atributo(m[0], "content") ?? "").includes("noindex");
}

type No = Record<string, unknown>;

/** Todos os nós JSON-LD de uma rota, já parseados e com os arrays achatados. */
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
      throw new Error(`${rota}: JSON-LD inválido (${(e as Error).message}): ${m[1].slice(0, 120)}`);
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

const urlAbsoluta = (rota: string) => `${SITE_URL}${rota}`;

// ---------------------------------------------------------------------------
// 1. Toda rota declara a própria URL
// ---------------------------------------------------------------------------

test("toda rota declara a própria URL em canonical e og:url", () => {
  const sem: string[] = [];
  for (const rota of TODAS_AS_ROTAS) {
    const doc = html(rota);
    const esperado = urlAbsoluta(rota);
    const c = canonical(doc);
    const og = metaProp(doc, "og:url");
    if (c !== esperado || og !== esperado) sem.push(`${rota} → canonical=${c} og:url=${og}`);
  }
  expect(
    sem,
    `${sem.length} de ${TODAS_AS_ROTAS.length} rotas não declaram a própria URL`
  ).toEqual([]);
});

test("canonical e og:url saem com a barra final do trailingSlash", () => {
  // `trailingSlash: true` no `next.config.ts`: canonical sem a barra aponta para
  // uma URL que responde 308, e o Google segue tratando as duas como candidatas.
  const errados: string[] = [];
  for (const rota of TODAS_AS_ROTAS) {
    const doc = html(rota);
    for (const [nome, valor] of [
      ["canonical", canonical(doc)],
      ["og:url", metaProp(doc, "og:url")],
    ] as const) {
      if (valor !== null && !valor.endsWith("/")) errados.push(`${rota} → ${nome}=${valor}`);
    }
  }
  expect(errados, "URL declarada sem a barra final").toEqual([]);
});

