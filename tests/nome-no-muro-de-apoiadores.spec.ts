import { test, expect } from "@playwright/test";
import {
  apoiaseHeaders,
  initials,
  normalizeSupporters,
  shortenName,
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
