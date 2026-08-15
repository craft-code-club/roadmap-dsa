import { test, expect } from "@playwright/test";
import {
  apoiaseHeaders,
  fetchSupporters,
  collectAllPages,
  initials,
  isActive,
  isPublic,
  normalizeNameCase,
  normalizeSupporters,
  readPage,
  shortenName,
  toSupporters,
} from "../src/app/apoie/apoiadores";

/**
 * O nome que o card mostra, e o header que a integração manda.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * Duas partes da página `/apoie/` são funções puras e nenhuma tinha teste:
 *
 * · `shortenName()`, que corta "Maria Aparecida da Silva Souza" em "Maria
 *   Souza". Ele não é `split(" ")[0] + split(" ").at(-1)`, e a distância entre
 *   as duas coisas é justamente onde os nomes brasileiros moram: partícula no
 *   meio, partícula colada no sobrenome, nome de uma palavra só, espaço duplo
 *   vindo de formulário. Cada caso abaixo é um jeito de a versão ingênua errar.
 *
 * · `apoiaseHeaders()`, que monta os dois headers da API da APOIA.se. Esta é a
 *   ÚNICA parte da integração que dá para provar sem rede e sem credencial, e
 *   provar aqui vale porque o erro que ela evita (trocar chave e segredo de
 *   lugar) só apareceria no build da `main`, em produção, como um 401 mudo.
 *
 * O muro renderizado tem teste em `navegacao.spec.ts` ("muro de apoiadores");
 * aqui é a regra, não a tela.
 */

// ---------------------------------------------------------------------------
// shortenName
// ---------------------------------------------------------------------------

test("nome com mais de dois nomes fica só com o primeiro e o último", () => {
  const casos: [string, string][] = [
    // O caso da issue #94, literal.
    ["Maria Aparecida da Silva Souza", "Maria Souza"],
    ["Ana Beatriz de Souza Lima", "Ana Lima"],
    ["José Carlos Pereira", "José Pereira"],
    ["Wilson Gomes Neto", "Wilson Neto"],
  ];
  for (const [entrada, esperado] of casos) {
    expect(shortenName(entrada), `entrada: ${JSON.stringify(entrada)}`).toBe(esperado);
  }
});

test("nome que já tem dois nomes, ou um só, passa inteiro", () => {
  // Cortar aqui não encurtaria nada e ainda desfiguraria o nome. O caso que
  // obriga a regra a existir é "João da Silva": são TRÊS palavras e DOIS nomes,
  // e quem conta palavras devolve "João Silva" sem precisar.
  const intactos = [
    "Cristiano Cunha",
    "Wilson Neto",
    "Eduarda Martins",
    "Ana",
    "João da Silva",
    "Marcos dos Santos",
  ];
  for (const nome of intactos) {
    expect(shortenName(nome), `entrada: ${JSON.stringify(nome)}`).toBe(nome);
  }
});

test("a partícula colada no sobrenome viaja junto com ele", () => {
  // "Maria Silva" apagaria o "da" de um sobrenome que é "da Silva". O corte
  // existe para o nome caber no card, não para reescrever o nome de ninguém.
  expect(shortenName("Maria Aparecida da Silva")).toBe("Maria da Silva");
  expect(shortenName("Pedro Henrique dos Santos")).toBe("Pedro dos Santos");
  expect(shortenName("Luiz Carlos de Oliveira")).toBe("Luiz de Oliveira");
});

test("espaço duplo, espaço nas pontas e nome vazio não quebram o card", () => {
  // Nome digitado à mão num formulário chega assim. Antes de existir esta
  // função, o `split(" ")` cru produzia partes vazias e a sigla saía errada.
  expect(shortenName("  Maria   Aparecida  da   Silva Souza  ")).toBe("Maria Souza");
  expect(shortenName("   Ana   ")).toBe("Ana");
  expect(shortenName("")).toBe("");
  expect(shortenName("     ")).toBe("");
  // Só partícula: não dá para escolher primeiro e último nome, e devolver algo
  // estranho é melhor que devolver vazio e sumir com a pessoa do muro.
  expect(shortenName("de la")).toBe("de la");
});

test("a sigla do avatar acompanha o nome já encurtado", () => {
  // A sigla e o nome do card saem do mesmo dado, e é isso que impede o par
  // "Maria Souza" com avatar "MS" de virar "Maria Souza" com avatar "MA".
  const casos: [string, string][] = [
    ["Maria Aparecida da Silva Souza", "MS"],
    ["Maria Aparecida da Silva", "MS"],
    ["João da Silva", "JS"],
    ["Cristiano Cunha", "CC"],
    ["Ana", "A"],
    ["de la", "?"],
  ];
  for (const [entrada, esperado] of casos) {
    expect(initials(shortenName(entrada)), `entrada: ${JSON.stringify(entrada)}`).toBe(esperado);
  }
});

// ---------------------------------------------------------------------------
// normalizeNameCase: o muro não grita o nome de ninguém
//
// A lista de plano B é digitada à mão e a da API é digitada pela pessoa que
// apoia, num formulário sem validação de caixa. Nas duas pontas aparece nome com
// Caps Lock, e o card renderiza o que recebe: "FULANA SOUSA" gritava no meio de
// uma fileira de nomes em caixa normal.
//
// O defeito que os testes desta seção evitam NÃO é "esqueci de capitalizar", é o
// conserto ingênuo dele: capitalizar toda palavra de todo nome. Isso arruma um
// nome e estraga os outros, porque maiúscula no meio de nome é comum e é
// deliberada. Por isso a função só age quando o nome está INTEIRO em maiúsculas.
//
// Nenhum nome desta seção é de pessoa real.
// ---------------------------------------------------------------------------

test("nome inteiro em maiúsculas chega ao card em caixa normal", () => {
  const casos: [string, string][] = [
    ["FULANA SOUSA", "Fulana Sousa"],
    ["BELTRANO HUGUENIN", "Beltrano Huguenin"],
    // Partícula volta em minúscula, que é a grafia portuguesa e é a mesma
    // leitura que `shortenName` e `initials` fazem da lista de partículas.
    ["SICRANA DA COSTA", "Sicrana da Costa"],
    ["FULANO DOS SANTOS NETO", "Fulano dos Santos Neto"],
    ["BELTRANA DE OLIVEIRA E SOUZA", "Beltrana de Oliveira e Souza"],
    // Acento em caixa alta também desce.
    ["JOSÉ ANTÔNIO GONÇALVES", "José Antônio Gonçalves"],
  ];
  for (const [entrada, esperado] of casos) {
    expect(normalizeNameCase(entrada), `entrada: ${JSON.stringify(entrada)}`).toBe(esperado);
  }
});

test("nome que já tem caixa mista sai intacto, inclusive a maiúscula do meio", () => {
  // ESTE é o teste que prende o conserto ingênuo. Capitalizar palavra por
  // palavra sem perguntar se o nome está gritando devolveria "Mcallister",
  // "Dicarli" e "D'ávila", que são três nomes destruídos para arrumar zero.
  const intactos = [
    "Fulana McAllister",
    "Beltrano DiCarli",
    "Sicrana d'Ávila",
    "Fulano van der Berg",
    "Cristiano Cunha",
    "Ana",
    "  Beltrana   da  Costa  ",
    "",
    "   ",
  ];
  for (const nome of intactos) {
    expect(normalizeNameCase(nome), `entrada: ${JSON.stringify(nome)}`).toBe(nome);
  }
});

test("o separador de dentro do nome não é só o espaço", () => {
  // Cortar só no espaço devolveria "Sant'ana" e "Ana-maria": o pedaço depois do
  // apóstrofo e do hífen continuaria minúsculo.
  expect(normalizeNameCase("SICRANA SANT'ANA")).toBe("Sicrana Sant'Ana");
  expect(normalizeNameCase("ANA-MARIA FERREIRA")).toBe("Ana-Maria Ferreira");
  expect(normalizeNameCase("FULANO D'ÁVILA")).toBe("Fulano D'Ávila");
});

test("arrumar a caixa não mexe no espaçamento nem some com ninguém", () => {
  // Quem normaliza espaço é `normalizeSupporters`. Se as duas coisas
  // acontecessem na mesma função, um teste não conseguiria dizer qual quebrou.
  expect(normalizeNameCase("  FULANA   SOUSA  ")).toBe("  Fulana   Sousa  ");
  // Sem caixa nenhuma para arrumar, devolve igual: nada aqui pode apagar nome.
  expect(normalizeNameCase("")).toBe("");
  expect(normalizeNameCase("1234")).toBe("1234");
});

test("o nome encurtado e a sigla saem do nome já em caixa normal", () => {
  // O card mostra `shortenName` e o avatar mostra `initials`, e os dois leem a
  // lista depois da normalização. Sem ela o card diria "FULANA SOUSA" no meio de
  // uma fileira em caixa normal.
  const muro = normalizeSupporters([{ name: "FULANA APARECIDA DA SILVA SOUSA" }]);
  expect(muro).toEqual([{ name: "Fulana Aparecida da Silva Sousa" }]);
  expect(shortenName(muro[0].name)).toBe("Fulana Sousa");
  expect(initials(shortenName(muro[0].name))).toBe("FS");
});

test("a mesma pessoa com e sem Caps Lock continua sendo um card só", () => {
  // A chave da deduplicação é minúscula, então arrumar a caixa não pode criar
  // nem desfazer repetição. Quem chega primeiro define a grafia guardada.
  const muro = normalizeSupporters([
    { name: "FULANA SOUSA" },
    { name: "Fulana Sousa" },
    { name: "Beltrano Huguenin" },
  ]);
  expect(muro).toEqual([{ name: "Fulana Sousa" }, { name: "Beltrano Huguenin" }]);
});

test("nome gritado que vem da API também desce, e nada além do nome passa", () => {
  // Os dois caminhos do muro atravessam `normalizeSupporters`, e é por isso que
  // a normalização mora lá: o dia em que a listagem da APOIA.se for ligada, o
  // Caps Lock digitado no formulário dela já chega arrumado.
  const muro = normalizeSupporters(
    toSupporters([apoiador({ name: "BELTRANA DE OLIVEIRA", email: "b@exemplo.invalid" })])
  );
  expect(muro).toEqual([{ name: "Beltrana de Oliveira" }]);
});

// ---------------------------------------------------------------------------
// normalizeSupporters: quem some do muro, e quem não pode sumir
// ---------------------------------------------------------------------------

test("duas pessoas com o mesmo primeiro e último nome continuam sendo duas", () => {
  // O defeito que este teste prende (achado na review do PR #96): deduplicar
  // pelo nome JÁ encurtado apaga gente. "Maria Aparecida Silva" e "Maria
  // Beatriz Silva" viram a mesma chave "Maria Silva", e uma das duas some do
  // muro E da contagem do painel de gratidão, que sai da mesma lista.
  //
  // O muro mostra "Maria Silva" duas vezes, e está certo: são duas apoiadoras.
  // Perder uma é bem pior que repetir um rótulo.
  const muro = normalizeSupporters([
    { name: "Maria Aparecida Silva" },
    { name: "Maria Beatriz Silva" },
  ]);
  expect(muro).toHaveLength(2);
  expect(muro.map((s) => shortenName(s.name))).toEqual(["Maria Silva", "Maria Silva"]);
});

test("o mesmo nome digitado duas vezes vira um card só", () => {
  // Repetição de verdade: mesma inscrição, espaçamento e caixa diferentes.
  const muro = normalizeSupporters([
    { name: "Cristiano Cunha" },
    { name: "  cristiano   CUNHA " },
    { name: "Eduarda Martins" },
  ]);
  expect(muro).toEqual([{ name: "Cristiano Cunha" }, { name: "Eduarda Martins" }]);
});

test("a lista guarda o nome completo, e a ordem de chegada", () => {
  // O encurtamento é de apresentação e mora no `page.tsx`. Se ele voltar para
  // cá, o teste de cima volta a reprovar, que é o ponto.
  const muro = normalizeSupporters([
    { name: "Maria Aparecida da Silva Souza" },
    { name: "" },
    { name: "   " },
    { name: "Ana" },
  ]);
  expect(muro).toEqual([{ name: "Maria Aparecida da Silva Souza" }, { name: "Ana" }]);
});

// ---------------------------------------------------------------------------
// O contrato REAL do relatório de apoiadores
// ---------------------------------------------------------------------------
//
// Os dados abaixo estão no formato do relatório do painel do criador, que é de
// onde o `apoiadores.ts` lê. Antes de conhecê-lo, o código procurava
// `created_at`, `first_support_at` e `support_status`: nomes que não existem.
// Nada quebrava, e era esse o problema. Cada teste desta seção é um dos campos
// que estavam errados.
//
// Nenhum dado aqui é de pessoa real.

/** Um apoiador no formato do relatório, com o mínimo que o muro consome. */
function apoiador(over: Record<string, unknown> = {}) {
  return {
    name: "Fulano de Teste",
    email: "fulano@exemplo.invalid",
    supportValue: 10,
    supportStatus: "complete",
    supportActive: true,
    supportPrivate: false,
    firstSupportDate: "2026-01-15T10:00:00.000Z",
    supportLastModified: "2026-02-01T10:00:00.000Z",
    paymentMethod: "credit_card",
    ...over,
  };
}

test("quem apoia em modo privado NUNCA aparece no muro", () => {
  // A regra mais importante do arquivo. O muro é página pública e indexada, e
  // publicar quem marcou o apoio como privado não é bug de dado, é incidente de
  // privacidade, e não tem desfazer.
  const muro = toSupporters([
    apoiador({ name: "Publica Silva", supportPrivate: false }),
    apoiador({ name: "Privada Souza", supportPrivate: true }),
  ]);
  expect(muro.map((s) => s.name)).toEqual(["Publica Silva"]);
});

test("sem `supportPrivate: false` declarado, ninguém é publicado (fail-closed)", () => {
  // O ponto NÃO é "esconder quem é privado", é "só publicar quem autorizou".
  // Campo ausente, nulo, string ou qualquer coisa que não seja o booleano
  // `false` significa não publica. O custo de errar assim é um nome a menos no
  // muro; errar para o outro lado publica alguém contra a vontade dela.
  expect(isPublic(apoiador({ supportPrivate: false }))).toBe(true);

  for (const valor of [undefined, null, "false", "no", 0, "", true]) {
    const b = apoiador();
    delete (b as Record<string, unknown>).supportPrivate;
    if (valor !== undefined) (b as Record<string, unknown>).supportPrivate = valor;
    expect(isPublic(b), `supportPrivate = ${JSON.stringify(valor)} não pode publicar`).toBe(false);
  }

  // E o efeito na lista inteira: resposta sem o campo esvazia o muro, o que faz
  // a página cair no plano B com aviso. É o comportamento desejado.
  const semCampo = apoiador();
  delete (semCampo as Record<string, unknown>).supportPrivate;
  expect(toSupporters([semCampo])).toEqual([]);
});

test("apoio bloqueado, travado, incompleto ou de campanha encerrada não vai ao muro", () => {
  // O vocabulário real de `supportStatus`. A versão anterior perguntava se o
  // status casava /cancel|inativ|expir|.../, e NENHUM destes quatro casa: os
  // quatro passariam como ativos. `incomplete` é o mais traiçoeiro, porque
  // contém a palavra "complete".
  for (const status of ["blocked", "locked", "incomplete", "closed_campaign"]) {
    expect(isActive(apoiador({ supportStatus: status })), `status ${status}`).toBe(false);
    expect(toSupporters([apoiador({ supportStatus: status })]), `status ${status}`).toEqual([]);
  }

  expect(isActive(apoiador({ supportStatus: "complete" }))).toBe(true);
  // `supportActive: false` derruba mesmo com status bom.
  expect(isActive(apoiador({ supportStatus: "complete", supportActive: false }))).toBe(false);

  // O campo é camelCase. Ler `support_status` era ler um campo que não existe.
  const muro = toSupporters([
    apoiador({ name: "Ativa Lima", supportStatus: "complete" }),
    apoiador({ name: "Bloqueada Costa", supportStatus: "blocked" }),
  ]);
  expect(muro.map((s) => s.name)).toEqual(["Ativa Lima"]);
});

test("a ordem do muro é por `firstSupportDate`, do mais recente para o mais antigo", () => {
  // Este é o defeito silencioso: procurando `created_at`, todo timestamp virava
  // 0, o `.sort()` não trocava nada de lugar e a lista saía na ordem em que a
  // API mandou. Ordem errada não quebra nada, só mente.
  const muro = toSupporters([
    apoiador({ name: "Antiga Alves", firstSupportDate: "2025-03-01T00:00:00.000Z" }),
    apoiador({ name: "Recente Rocha", firstSupportDate: "2026-08-01T00:00:00.000Z" }),
    apoiador({ name: "Meio Moraes", firstSupportDate: "2026-01-01T00:00:00.000Z" }),
  ]);
  expect(muro.map((s) => s.name)).toEqual(["Recente Rocha", "Meio Moraes", "Antiga Alves"]);
});

test("a paginação junta todas as páginas, e não só a primeira", () => {
  // Sem paginar, uma campanha com mais de uma página mostraria a primeira fatia
  // e diria que aquilo era o total. Silencioso de novo: lista curta parece lista.
  const paginas: Record<number, unknown> = {
    1: { backers: [apoiador({ name: "Um Um" })], totalPages: 3 },
    2: { backers: [apoiador({ name: "Dois Dois" })], totalPages: 3 },
    3: { backers: [apoiador({ name: "Tres Tres" })], totalPages: 3 },
  };
  const pedidas: number[] = [];

  return collectAllPages(async (page) => {
    pedidas.push(page);
    return paginas[page];
  }).then((todos) => {
    expect(pedidas).toEqual([1, 2, 3]);
    expect(todos).toHaveLength(3);
    expect(toSupporters(todos).map((s) => s.name)).toEqual(["Um Um", "Dois Dois", "Tres Tres"]);
  });
});

test("uma página só não vira três requisições, e o teto segura `totalPages` absurdo", async () => {
  let chamadas = 0;
  const uma = await collectAllPages(async () => {
    chamadas++;
    return { backers: [apoiador()], totalPages: 1 };
  });
  expect(chamadas).toBe(1);
  expect(uma).toHaveLength(1);

  // `totalPages` absurdo não pode virar laço infinito segurando o build.
  let pedidas = 0;
  const limitado = await collectAllPages(async () => {
    pedidas++;
    return { backers: [apoiador()], totalPages: 9999 };
  }, 4);
  expect(pedidas).toBe(4);
  expect(limitado).toHaveLength(4);
});

test("readPage aceita o formato do relatório e também uma lista crua", () => {
  expect(readPage({ backers: [apoiador()], totalPages: 7 }).totalPages).toBe(7);
  expect(readPage({ backers: [apoiador()], totalPages: 7 }).backers).toHaveLength(1);
  // Sem `totalPages`, assume uma página. Lista crua também vale.
  expect(readPage([apoiador(), apoiador()])).toEqual({
    backers: [apoiador(), apoiador()],
    totalPages: 1,
  });
  expect(readPage(null)).toEqual({ backers: [], totalPages: 1 });
});

test("nada além do nome sai do parsing", () => {
  // O relatório traz e-mail, valor, meio de pagamento e endereço de entrega. O
  // muro publica nome, e só. `Supporter` tem um campo só para não haver caminho
  // por onde o resto passe, e este teste é a prova de que continua não havendo.
  const muro = toSupporters([
    apoiador({ name: "Unica Pessoa", email: "segredo@exemplo.invalid", supportValue: 500 }),
  ]);
  expect(muro).toEqual([{ name: "Unica Pessoa" }]);
  expect(JSON.stringify(muro)).not.toContain("@");
  expect(JSON.stringify(muro)).not.toContain("500");
});

// ---------------------------------------------------------------------------
// apoiaseHeaders
// ---------------------------------------------------------------------------

test("os headers da APOIA.se levam a chave e o segredo cada um no seu lugar", () => {
  // Valores de mentira, e óbvios: teste de credencial não guarda credencial.
  const headers = apoiaseHeaders("CHAVE_DE_TESTE_NAO_DEVE_VAZAR", "SEGREDO_DE_TESTE_NAO_DEVE_VAZAR");

  // O formato é cópia literal da doc v0.1 da APOIA.se:
  //   x-api-key: <chave>
  //   authorization: Bearer <segredo>
  // Trocar os dois de lado devolve 401, e um 401 só aparece no build da `main`.
  expect(headers["x-api-key"]).toBe("CHAVE_DE_TESTE_NAO_DEVE_VAZAR");
  expect(headers.Authorization).toBe("Bearer SEGREDO_DE_TESTE_NAO_DEVE_VAZAR");

  // O segredo nunca vai no `x-api-key`, nem a chave no `Authorization`.
  expect(headers["x-api-key"]).not.toContain("SEGREDO");
  expect(headers.Authorization).not.toContain("CHAVE_DE_TESTE");
});

// ---------------------------------------------------------------------------
// Resposta vazia NÃO cai no plano B
//
// O filtro de privacidade é fail-closed, e sozinho ele não basta: enquanto o
// muro vazio caía na lista fixa, esconder todo mundo fazia o site publicar três
// nomes escritos à mão. No pior caso, exatamente a pessoa que acabou de marcar o
// apoio como privado, porque ela está nos dois lugares.
//
// A regra tem duas metades, e as duas precisam de guarda: uma resposta que
// CHEGOU vale, inclusive quando o conteúdo dela é "ninguém"; e o plano B vale
// quando NÃO houve resposta.
// ---------------------------------------------------------------------------

/** Roda `fetchSupporters` com credencial falsa e um `fetch` de mentira. */
async function comApiFalsa(responder: () => Response | Promise<Response>) {
  const antes = {
    fetch: globalThis.fetch,
    key: process.env.APOIASE_KEY,
    secret: process.env.APOIASE_SECRET,
    campaign: process.env.APOIASE_CAMPAIGN,
  };
  process.env.APOIASE_KEY = "CHAVE_DE_TESTE_NAO_DEVE_VAZAR";
  process.env.APOIASE_SECRET = "SEGREDO_DE_TESTE_NAO_DEVE_VAZAR";
  process.env.APOIASE_CAMPAIGN = "000000000000000000000000";
  globalThis.fetch = (async () => responder()) as typeof fetch;
  try {
    return await fetchSupporters();
  } finally {
    globalThis.fetch = antes.fetch;
    for (const [k, v] of [
      ["APOIASE_KEY", antes.key],
      ["APOIASE_SECRET", antes.secret],
      ["APOIASE_CAMPAIGN", antes.campaign],
    ] as const) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

test("resposta em que todo mundo é privado deixa o muro vazio, e não publica a lista fixa", async () => {
  const muro = await comApiFalsa(() =>
    json({
      total: 2,
      totalPages: 1,
      backers: [
        apoiador({ name: "Privada Uma", supportPrivate: true }),
        apoiador({ name: "Privada Duas", supportPrivate: true }),
      ],
    })
  );
  // Vazio, e vazio é o certo: a página desenha o convite "seja o primeiro".
  expect(muro, "o plano B publicou nomes numa resposta em que ninguém autorizou").toEqual([]);
});

test("resposta sem o campo de privacidade também deixa o muro vazio", async () => {
  // O fail-closed do `isPublic` esconde quem não declarou. Se isso caísse no
  // plano B, uma mudança de formato na API republicaria a lista fixa sozinha.
  const semCampo = apoiador({ name: "Sem Declaracao" });
  delete (semCampo as Record<string, unknown>).supportPrivate;
  const muro = await comApiFalsa(() => json({ total: 1, totalPages: 1, backers: [semCampo] }));
  expect(muro).toEqual([]);
});

test("a resposta que CHEGOU manda, e a que não chegou cai no plano B", async () => {
  const comGente = await comApiFalsa(() =>
    json({ total: 1, totalPages: 1, backers: [apoiador({ name: "Publica Silva" })] })
  );
  expect(comGente.map((s) => s.name)).toEqual(["Publica Silva"]);

  // A outra metade: sem resposta, o plano B entra. Sem esta asserção o teste
  // acima passaria com um `return []` incondicional.
  const semResposta = await comApiFalsa(() => new Response("", { status: 500 }));
  expect(semResposta.length, "HTTP 500 devia cair no plano B").toBeGreaterThan(0);
});
