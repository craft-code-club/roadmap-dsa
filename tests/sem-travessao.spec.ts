import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

// A regra do travessão, medida onde ela vale: no HTML que o aluno recebe.
//
// O `CONTRIBUTING.md` diz, na seção de conteúdo:
//
//   > **Sem travessão:** na copy do site, use pontuação simples (vírgula, ponto,
//   > dois pontos), nunca o caractere `—`.
//
// E o `PULL_REQUEST_TEMPLATE.md` repete a regra como item de checklist. Só que
// checklist é promessa: quem abre o PR marca a caixinha, e nada mede. O corpus
// mostra que a promessa vinha sendo cumprida quase inteira, e mostra também o
// tamanho do buraco: 39 artigos com ZERO ocorrências, e uma linha de
// visualizador que passou.
//
// Este teste é a régua. Ele fecha a distância entre a regra escrita e o artefato
// publicado, e o custo de escrevê-lo foi baixo justamente porque o corpus já
// está limpo: um guarda que nasce vermelho seria desligado na semana seguinte.
//
// POR QUE SOBRE O `out/`, E NÃO SOBRE OS ARQUIVOS-FONTE
//
// Porque a regra fala da COPY, e a fronteira entre copy e código atravessa os
// arquivos deste repositório (é a mesma fronteira que a licença dupla descreve):
// um `—` num comentário de TypeScript não é copy, e um `—` dentro de uma string
// de visualizador é. Varrer a fonte exigiria distinguir os dois com regex, que é
// exatamente o tipo de aproximação que o `guarda-idioma.py` deste repositório já
// tentou três vezes e errou três vezes. O HTML exportado não tem essa
// ambiguidade: o que está lá é o que o leitor lê.
//
// (O limite honesto: `—` dentro de um bloco de código de artigo também contaria
// aqui. Hoje isso não acontece, e no dia em que acontecer o conserto é declarar
// a ocorrência abaixo, com o endereço.)

const OUT = path.join(process.cwd(), "out");
const TRAVESSAO = "—"; // U+2014. Hífen e meia-risca (–) não são o alvo.

/**
 * A dívida conhecida, com endereço e contagem.
 *
 * Mesmo formato do `PASSIVO` do `a11y.spec.ts`, e pela mesma razão: o guarda
 * entra medindo o estado real em vez de esperar um PR de limpeza que nunca vem,
 * e cada item aponta onde consertar. Ao consertar um, apague a entrada.
 *
 * ⚠️ A contagem é EXATA, não é teto. Uma ocorrência a mais na mesma rota
 * reprova, que é o ponto: a exceção cobre a linha que já estava lá, não a rota.
 */
const CONHECIDOS: Record<string, { quantos: number; nota: string }> = {
  "/topico/negative-binary/": {
    quantos: 3,
    nota:
      "`content/visualizers/BinarioTresFormas.tsx:163` — \"Lido de volta: <strong>{l.readBack}</strong> " +
      "— bits diferentes, mesmo número.\" É UMA linha de copy de visualizador, contada 3 vezes " +
      "porque a página monta o componente para as três formas (sign-magnitude, complemento de um " +
      "e de dois). Conserto: trocar o travessão por dois pontos naquela linha. Fica de fora deste " +
      "PR porque mexer em texto de tela de visualizador tem procedimento próprio " +
      "(content/visualizers/README.md §0, guarda-idioma)",
  },
};

/** Todas as páginas HTML do build. */
function rotasDoBuild(): string[] {
  const rotas: string[] = [];
  const andar = (dir: string) => {
    for (const nome of readdirSync(dir)) {
      const cheio = path.join(dir, nome);
      if (statSync(cheio).isDirectory()) andar(cheio);
      else if (nome === "index.html") {
        const rota = `/${path.relative(OUT, dir).split(path.sep).filter(Boolean).join("/")}/`.replace("//", "/");
        rotas.push(rota);
      }
    }
  };
  andar(OUT);
  return rotas.sort();
}

test("nenhuma página do site usa travessão na copy", () => {
  const rotas = rotasDoBuild();
  // Se a varredura não achar página nenhuma, ela não está provando nada: é o
  // mesmo contrato dos guardas em Python desta pasta ("não conseguiu olhar" é
  // erro do guarda, nunca aprovação).
  expect(rotas.length, "varredura vazia: o build não gerou HTML nenhum").toBeGreaterThan(50);

  const inesperadas: string[] = [];
  const mudaram: string[] = [];

  for (const rota of rotas) {
    const html = readFileSync(path.join(OUT, rota.replace(/^\//, ""), "index.html"), "utf8");
    const quantos = html.split(TRAVESSAO).length - 1;
    const conhecido = CONHECIDOS[rota];

    if (!conhecido) {
      if (quantos > 0) {
        // Um trecho em volta da primeira ocorrência, para o erro dizer QUAL frase.
        const i = html.indexOf(TRAVESSAO);
        const trecho = html.slice(Math.max(0, i - 90), i + 90).replace(/\s+/g, " ");
        inesperadas.push(`${rota}: ${quantos}x, ex.: …${trecho}…`);
      }
      continue;
    }
    if (quantos !== conhecido.quantos) {
      mudaram.push(`${rota}: ${quantos}x, e a dívida declarada é ${conhecido.quantos}x`);
    }
  }

  expect(
    inesperadas,
    "travessão na copy (CONTRIBUTING: use vírgula, ponto ou dois pontos). " +
      "Se for dívida antiga, declare em CONHECIDOS com o arquivo:linha"
  ).toEqual([]);

  // A outra metade: dívida que encolheu vira entrada obsoleta, e entrada
  // obsoleta anistia a rota inteira em silêncio.
  expect(
    mudaram,
    "a contagem de uma dívida declarada mudou. Se você consertou, apague a entrada de CONHECIDOS"
  ).toEqual([]);
});
