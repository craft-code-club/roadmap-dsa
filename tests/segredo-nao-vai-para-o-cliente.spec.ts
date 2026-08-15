import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { LINKS } from "../src/lib/links";

/**
 * As credenciais da APOIA.se ficam no build, e o build não pode ficar no site.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * A página `/apoie/` monta o muro de apoiadores chamando a API da APOIA.se
 * durante o `next build`, com credencial lida do ambiente
 * (`src/app/apoie/apoiadores.ts`). Isso é seguro por CONSTRUÇÃO: o módulo só é
 * importado por um Server Component, o `output: "export"` roda a chamada na
 * máquina de build e o navegador recebe só os nomes já prontos no HTML.
 *
 * "Seguro por construção" é uma frase, não uma medida. Bastam três linhas para
 * ela deixar de valer, e nenhuma delas quebra o build:
 *
 *   · um `"use client"` no topo do `apoiadores.ts`, ou um import dele a partir
 *     de um componente de cliente: o módulo inteiro passa a ser um chunk, com o
 *     `process.env` e o cabeçalho de autenticação dentro;
 *   · renomear a variável para `NEXT_PUBLIC_APOIASE_SECRET` "para funcionar no
 *     dev": o Next INLINE o valor em todo lugar que a referencia;
 *   · passar a credencial como prop de um Server Component para um filho de
 *     cliente: ela sai serializada no payload RSC, que neste projeto mora em
 *     960 arquivos `.txt` dentro do `out/`.
 *
 * Nos três casos o site continua de pé, a página continua bonita e o segredo
 * está publicado. Este arquivo é a medida que falta: ele lê o ARTEFATO inteiro,
 * arquivo por arquivo, byte por byte, e reprova se qualquer forma de credencial
 * aparecer.
 *
 * POR QUE SOBRE O `out/`, E POR QUE TODOS OS ARQUIVOS
 *
 * Porque é o `out/` que o Cloudflare Pages publica. Varrer a fonte responderia
 * "alguém escreveu o segredo?", e a pergunta é outra: "o segredo chegou ao
 * artefato?". São 1.242 arquivos, e o vazamento não escolhe extensão: além dos
 * 116 HTML e dos 105 chunks de JS, o export estático emite 960 `.txt` com o
 * payload RSC de cada rota, que é texto e é servido igual.
 *
 * COMO REPETIR A MEDIDA À MÃO, COM CREDENCIAL FALSA
 *
 *     APOIASE_KEY=CHAVE_FALSA_NAO_DEVE_VAZAR \
 *     APOIASE_SECRET=SEGREDO_FALSO_NAO_DEVE_VAZAR \
 *     APOIASE_CAMPAIGN=99999 npm run build
 *     grep -rn "NAO_DEVE_VAZAR" out/ ; echo "esperado: nada"
 *
 * O teste `o valor real da credencial não aparece no build` abaixo faz
 * exatamente isso quando as variáveis existem no ambiente de quem roda a suíte,
 * e é assim que a varredura vale também para os valores de verdade.
 */

const OUT = path.join(process.cwd(), "out");

// ---------------------------------------------------------------------------
// as regras
// ---------------------------------------------------------------------------

type Regra = {
  /** Nome curto, é o que aparece no relatório de falha. */
  nome: string;
  re: RegExp;
  /** O que este padrão significa quando aparece, e o que fazer. */
  porque: string;
};

/**
 * Cada regra é uma FORMA de vazamento, não um valor.
 *
 * Regra por valor só pega o segredo de hoje, e só na máquina que o tem no
 * ambiente. Regra por forma pega o segredo de amanhã, na CI, sem que ninguém
 * precise contar à suíte qual é o segredo — o que é bom, porque contar o
 * segredo à suíte seria o mesmo problema num arquivo diferente.
 *
 * O corpus entra ZERADO: as 16 regras dão 0 ocorrência nos 1.242 arquivos do
 * build de hoje. É de propósito, e é o que torna este guarda sustentável:
 * guarda que nasce vermelho é desligado na semana seguinte.
 */
const REGRAS: Regra[] = [
  // -- nome de variável de ambiente ----------------------------------------
  // O nome só chega ao bundle junto com o código que o LÊ. Achar `APOIASE_KEY`
  // num chunk quer dizer que `apoiadores.ts` (ou um irmão dele) entrou no grafo
  // de cliente, e aí o valor vem atrás, inlineado pelo Next.
  {
    nome: "nome de variável APOIASE_*",
    re: /APOIASE_[A-Z0-9_]*/g,
    porque:
      "o módulo que lê a credencial da APOIA.se entrou no grafo de CLIENTE. " +
      "`src/app/apoie/apoiadores.ts` só pode ser importado por Server Component.",
  },
  {
    nome: "nome de variável CLOUDFLARE_*/CF_*",
    re: /\b(?:CLOUDFLARE|CF)_[A-Z0-9_]{3,}/g,
    porque: "credencial de deploy não tem nada que fazer no artefato publicado.",
  },
  {
    nome: "variável NEXT_PUBLIC_ com cara de segredo",
    re: /NEXT_PUBLIC_[A-Z0-9_]*(?:TOKEN|SECRET|KEY|PASSWORD|SENHA)[A-Z0-9_]*/g,
    porque:
      "`NEXT_PUBLIC_` é justamente o prefixo que o Next INLINE no bundle. " +
      "Segredo com esse prefixo é segredo publicado, mesmo que só o servidor o use.",
  },

  // -- host da API privada --------------------------------------------------
  // Canário do mesmo defeito, por outro caminho: o host da API do painel é uma
  // string que só existe naquele módulo. Se ele aparecer, o módulo apareceu.
  //
  // O padrão exige "api" no rótulo do host para NÃO casar com `apoia.se/craftcodeclub`,
  // que é o link público do botão "Quero apoiar" e aparece 11 vezes no build de
  // hoje, legitimamente.
  {
    nome: "host de API da APOIA.se",
    re: /[a-z0-9-]*api[a-z0-9.-]*\.apoia\.se/gi,
    porque:
      "a API da APOIA.se é chamada NO BUILD, pelo servidor. A URL dela num chunk " +
      "quer dizer que a chamada foi parar no navegador, sem credencial e com CORS.",
  },

  // -- cabeçalho de autenticação -------------------------------------------
  // A forma casada é a de CÓDIGO montando header (`Authorization:` seguido de
  // aspas), e não a palavra solta: um artigo que explique HTTP pode escrever
  // "Authorization" no texto, e isso não é vazamento.
  {
    nome: "montagem de cabeçalho Authorization",
    re: /["'`]?[Aa]uthorization["'`]?\s*:\s*["'`]/g,
    porque: "código que monta cabeçalho de autenticação está rodando no cliente.",
  },
  {
    // `x-api-key` é o header da chave da APOIA.se (doc v0.1). É uma string que
    // só existe em `apoiaseHeaders()`, o que a torna um canário melhor que o
    // `Authorization`: nenhum artigo deste site tem motivo para escrevê-la.
    nome: "cabeçalho x-api-key",
    re: /x-api-key/gi,
    porque: "o header da chave da APOIA.se está sendo montado no navegador.",
  },
  { nome: "credencial Bearer", re: /\bBearer\s+[A-Za-z0-9._~+/-]{8,}/g, porque: "token no artefato." },
  { nome: "credencial Basic", re: /\bBasic\s+[A-Za-z0-9+/]{12,}={0,2}/g, porque: "par chave/segredo em base64 no artefato." },
  { nome: "client_secret", re: /client_secret/gi, porque: "troca de OAuth acontecendo no cliente." },

  // -- formas conhecidas de segredo ----------------------------------------
  {
    nome: "JWT",
    re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
    porque: "um JSON Web Token inteiro, legível por qualquer visitante.",
  },
  { nome: "token do GitHub", re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}/g, porque: "token do GitHub no artefato." },
  { nome: "chave de API estilo OpenAI", re: /\bsk-[A-Za-z0-9_-]{20,}/g, porque: "chave de API no artefato." },
  { nome: "chave da AWS", re: /\bAKIA[0-9A-Z]{16}\b/g, porque: "access key da AWS no artefato." },
  { nome: "token do Slack", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g, porque: "token do Slack no artefato." },
  { nome: "chave privada PEM", re: /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/g, porque: "chave privada no artefato." },

  // -- dado pessoal ---------------------------------------------------------
  // Não é credencial, e entra na mesma varredura porque vaza pelo mesmo cano.
  // A resposta da APOIA.se traz e-mail de apoiador (a rota documentada da v0.1 é
  // literalmente `/backers/charges/<email>`), e a página publica nomes. Um
  // `pickName()` que um dia caia no campo errado publicaria o e-mail de quem
  // apoia, num HTML que o Google indexa. O tipo `Supporter` tem um campo só para
  // que não haja caminho, e esta regra é a prova de que continua não havendo.
  {
    nome: "endereço de e-mail",
    re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    porque:
      "e-mail é dado pessoal e o `out/` é público. Se for e-mail de EXEMPLO num artigo, " +
      "declare a ocorrência em CONHECIDOS com a rota e o motivo, em vez de afrouxar a regra.",
  },
];

/**
 * Dívida conhecida, com endereço e contagem, no mesmo formato do `CONHECIDOS`
 * do `sem-travessao.spec.ts`.
 *
 * Existe para o dia em que um ARTIGO legitimamente escrever "Bearer abc123" num
 * bloco de código explicando HTTP. Nesse dia a resposta certa é declarar a
 * ocorrência aqui, com a rota e o motivo, e não afrouxar a regra para todo o
 * build.
 *
 * ⚠️ A contagem é EXATA, não é teto: uma ocorrência a mais no mesmo arquivo
 * reprova.
 */
const CONHECIDOS: Record<string, number> = {
  // Vazio, e este é o estado a manter.
};

// ---------------------------------------------------------------------------
// a varredura
// ---------------------------------------------------------------------------

type Achado = { arquivo: string; regra: string; porque: string; trecho: string };

/** Todo arquivo do `out/`, caminho relativo, incluindo os sem extensão. */
function arquivosDoBuild(): string[] {
  return readdirSync(OUT, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.relative(OUT, path.join(e.parentPath, e.name)))
    .sort();
}

/**
 * Aplica as regras a um texto.
 *
 * Exportada de propósito: é a MESMA função que o teste de autoverificação usa
 * para provar que a varredura acusa um segredo plantado. Teste que reimplementa
 * o motor prova que a cópia funciona, e é o defeito que este repositório já
 * pagou em outros guardas.
 */
function varrer(arquivo: string, texto: string): Achado[] {
  const achados: Achado[] = [];
  for (const regra of REGRAS) {
    // `lastIndex` é estado do próprio RegExp com a flag `g`. Sem zerar, a
    // segunda chamada continua de onde a primeira parou e a varredura pula
    // arquivos em silêncio, que é a pior falha possível num guarda.
    regra.re.lastIndex = 0;
    for (const m of texto.matchAll(regra.re)) {
      achados.push({
        arquivo,
        regra: regra.nome,
        porque: regra.porque,
        trecho: texto.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).replace(/\s+/g, " "),
      });
    }
  }
  return achados;
}

/**
 * `latin1` e não `utf8`, de propósito: ele mapeia byte a byte, nunca estoura em
 * arquivo binário e preserva o ASCII, que é o alfabeto de toda credencial que
 * este arquivo procura. Ler tudo como `utf8` substituiria bytes inválidos por
 * U+FFFD e poderia partir uma string procurada ao meio dentro de um PNG.
 */
function conteudo(rel: string): Buffer {
  return readFileSync(path.join(OUT, rel));
}

/**
 * Byte NUL nos primeiros 8 KB, que é a heurística que o git usa para decidir se
 * um arquivo é binário. PNG tem NUL logo no cabeçalho.
 *
 * ISTO NÃO É OTIMIZAÇÃO, É CORREÇÃO, e o caso foi medido: rodando as regras por
 * FORMA sobre os PNG dos cards de Open Graph, os bytes comprimidos de
 * `out/topicos/bst/opengraph-image` casaram com o padrão de e-mail
 * (`...M+¯@¼ÒÌb7...` tem a forma `algo@algo.algo` em latin1). Ruído de imagem
 * comprimida acerta qualquer padrão frouxo se você der arquivos suficientes a
 * ele, e um guarda que reprova por ruído é desligado na semana seguinte.
 *
 * O que NÃO muda: o binário continua sendo varrido pelo VALOR literal da
 * credencial, no teste seguinte. Um segredo de 30 caracteres não aparece por
 * acaso num PNG; um arroba, sim.
 */
function ehBinario(buf: Buffer): boolean {
  return buf.subarray(0, 8192).includes(0);
}

function relatorio(achados: Achado[]): string {
  return achados
    .slice(0, 12)
    .map((a) => `  [${a.regra}] ${a.arquivo}\n      ...${a.trecho}...\n      ${a.porque}`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// os testes
// ---------------------------------------------------------------------------

test("nenhuma credencial chega ao HTML, aos chunks ou ao payload RSC", () => {
  const arquivos = arquivosDoBuild();

  // Um guarda que varre um `out/` pela metade passa verde sem ter olhado nada.
  // Estes três pisos são a prova de que a varredura viu o build inteiro: as
  // contagens de hoje são 116 HTML, 105 JS e 960 `.txt` de payload RSC.
  expect(arquivos.length, "build vazio ou parcial: rode `npm run build` antes").toBeGreaterThan(1000);
  const porExtensao = (ext: string) => arquivos.filter((a) => a.endsWith(ext)).length;
  expect(porExtensao(".html"), "nenhum HTML no build").toBeGreaterThan(100);
  expect(porExtensao(".js"), "nenhum chunk de JS no build").toBeGreaterThan(50);
  expect(porExtensao(".txt"), "nenhum payload RSC no build").toBeGreaterThan(500);

  // As regras por forma valem sobre TEXTO. O binário fica de fora aqui e é
  // coberto pelo valor literal no teste seguinte (ver `ehBinario`).
  const binarios: string[] = [];
  const achados: Achado[] = [];
  for (const rel of arquivos) {
    const buf = conteudo(rel);
    if (ehBinario(buf)) {
      binarios.push(rel);
      continue;
    }
    achados.push(...varrer(rel, buf.toString("latin1")));
  }

  // O recorte tem que continuar sendo o que eu medi. Sem esta asserção, o dia em
  // que um chunk de JS passasse a ter um NUL ele sairia da varredura CALADO, e o
  // guarda seguiria verde tendo parado de olhar justamente onde o segredo mora.
  // Os únicos binários do build são os cards de Open Graph, que são PNG.
  const inesperados = binarios.filter((b) => !b.endsWith("opengraph-image"));
  expect(
    inesperados,
    "arquivo binário fora dos cards de Open Graph: ele NÃO foi varrido pelas regras por forma"
  ).toEqual([]);
  expect(binarios.length, "nenhum card de Open Graph no build").toBeGreaterThan(40);

  // A dívida declarada sai da conta pelo par arquivo+regra, e pela contagem exata.
  const porChave = new Map<string, Achado[]>();
  for (const a of achados) {
    const chave = `${a.arquivo}::${a.regra}`;
    porChave.set(chave, [...(porChave.get(chave) ?? []), a]);
  }
  const novos: Achado[] = [];
  for (const [chave, lista] of porChave) {
    const declarados = CONHECIDOS[chave] ?? 0;
    if (lista.length !== declarados) novos.push(...lista);
  }

  expect(
    novos.length,
    `${novos.length} ocorrência(s) de credencial no artefato que o Cloudflare Pages publica:\n${relatorio(novos)}`
  ).toBe(0);
});

test("o valor real da credencial não aparece no build", () => {
  // Só roda de verdade em quem tem o `.env.local` preenchido (e no dia em que a
  // suíte rodar com os secrets no ambiente). Sem as variáveis, as regras por
  // FORMA acima seguem valendo — este teste é o cinto por cima do suspensório,
  // porque valor é a única coisa que forma nenhuma pega: uma credencial que por
  // acaso pareça um identificador comum passaria por todas as 16 regras.
  const segredos: [string, string | undefined][] = [
    ["APOIASE_KEY", process.env.APOIASE_KEY],
    ["APOIASE_SECRET", process.env.APOIASE_SECRET],
    // Nomes do formato anterior (um Bearer do painel e o id da campanha).
    // Continuam aqui porque o `.env.local` de quem trabalhou nisto antes ainda
    // pode tê-los, e um segredo aposentado vaza igual.
    ["APOIASE_TOKEN", process.env.APOIASE_TOKEN],
  ];

  // O id/slug da campanha é caso à parte, e não por descuido: ele NÃO é segredo.
  // Ele está na URL pública do botão "Quero apoiar" (`LINKS.apoiar`), que sai em
  // 11 lugares do build de propósito. Cobrá-lo como os outros faria o guarda
  // reprovar o site funcionando. Ele entra na lista só quando NÃO é o pedaço
  // público, que é o caso do id do painel.
  const campanha = process.env.APOIASE_CAMPAIGN ?? process.env.APOIASE_CAMPAIGN_ID;
  if (campanha && campanha.length >= 4 && !LINKS.apoiar.includes(campanha)) {
    segredos.push(["APOIASE_CAMPAIGN", campanha]);
  }

  const presentes = segredos.filter(([, v]) => v !== undefined && v.trim().length >= 8);
  test.skip(
    presentes.length === 0,
    "nenhuma credencial da APOIA.se no ambiente: nada de valor para conferir (as regras por forma já rodaram)"
  );

  // Aqui entra TUDO, binário incluído: é a metade da varredura que os PNG dos
  // cards de Open Graph não podem escapar, e o valor literal não sofre do falso
  // positivo que tirou o binário do teste anterior.
  const vazados: string[] = [];
  for (const rel of arquivosDoBuild()) {
    const texto = conteudo(rel).toString("latin1");
    for (const [nome, valor] of presentes) {
      if (texto.includes(valor!.trim())) vazados.push(`${nome} aparece em out/${rel}`);
    }
  }

  // A mensagem NÃO imprime o valor: um relatório de vazamento que imprime o
  // segredo no log da CI vaza o segredo no log da CI.
  expect(vazados, `credencial em texto claro no artefato:\n  ${vazados.join("\n  ")}`).toEqual([]);
});

test("o build não leva junto nenhum arquivo de ambiente", () => {
  // `public/` é copiado inteiro para o `out/`. Um `.env` salvo ali por engano
  // vira uma URL pública, e nenhuma das regras por forma pegaria um arquivo
  // cujo conteúdo é só `CHAVE=valor`.
  const ambiente = arquivosDoBuild().filter((a) => path.basename(a).startsWith(".env"));
  expect(ambiente, "arquivo de ambiente publicado junto com o site").toEqual([]);
});

test("a varredura acusa um segredo plantado", () => {
  // Sem este teste, o de cima é indistinguível de uma função que devolve lista
  // vazia. Ele exercita o MESMO `varrer()` dos outros, com um artefato de
  // mentira que carrega uma forma de cada família.
  // Nenhum valor aqui é real, e nenhum pode ser: um guarda que guarda o segredo
  // dentro de si para se testar é o vazamento que ele diz impedir.
  const plantado = [
    `const k=process.env.APOIASE_KEY;fetch("https://api.apoia.se/backers?campaign=1",{headers:{"x-api-key":"CHAVE_DE_TESTE_NAO_DEVE_VAZAR",Authorization:"Bearer SEGREDO_DE_TESTE_NAO_DEVE_VAZAR"}})`,
    `const jwt="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk"`,
    `const b="Basic Y3JhZnRjb2RlY2x1YjpzZWdyZWRv"`,
    `-----BEGIN RSA PRIVATE KEY-----`,
    `<span class="apoiador-nome">apoiador.de.mentira@exemplo.com</span>`,
  ].join("\n");

  const achados = varrer("out/_next/static/chunks/falso.js", plantado);
  const acusadas = new Set(achados.map((a) => a.regra));

  for (const esperada of [
    "nome de variável APOIASE_*",
    "host de API da APOIA.se",
    "montagem de cabeçalho Authorization",
    "cabeçalho x-api-key",
    "credencial Bearer",
    "credencial Basic",
    "JWT",
    "chave privada PEM",
    "endereço de e-mail",
  ]) {
    expect([...acusadas], `a varredura deixou passar: ${esperada}`).toContain(esperada);
  }

  // E o contrário: o que o build legítimo tem não pode acusar. O link público da
  // campanha é o caso real, e é o que separa este guarda de um `grep apoia.se`.
  expect(varrer("out/apoie/index.html", `<a href="${LINKS.apoiar}">Quero apoiar</a>`)).toEqual([]);
});
