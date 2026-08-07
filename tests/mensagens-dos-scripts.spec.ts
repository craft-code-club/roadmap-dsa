import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

// Mensagem que um script do `package.json` imprime também é texto de tela.
//
// O que este arquivo protege: os guardas deste repositório tratam o que a
// pessoa lê como conteúdo, não como detalhe. O `guarda-idioma.py` existe para
// impedir que um rename estrague a aula, e o `PULL_REQUEST_TEMPLATE.md` cobra
// a copy do site no checklist. Mas nada disso enxerga o `package.json`: ele não
// é TSX, o ESLint não lê JSON, e o guarda de idioma compara duas versões de um
// arquivo de componente. Foi por essa fresta que `"a ref base '$base' nao
// existe"` entrou em `guarda:commit` — a ÚNICA string ASCII-pura de um PR cujas
// outras mensagens ("o relatório de texto de tela exige...", "O guarda **não
// conseguiu rodar**") acentuam normalmente.
//
// O caso é pequeno de propósito: uma letra numa ferramenta local. O que não é
// pequeno é a régua ficar valendo só onde já existe ferramenta para cobrá-la.
//
// A DISTINÇÃO QUE ESTE TESTE PRECISA FAZER: identificador é código, mensagem é
// tela. `.github/workflows/tests.yml:150` tem `codigo=$?`, e acentuar aquilo
// quebraria o script. Daí as duas decisões abaixo — só o argumento de `echo`
// entra na varredura, e a expansão de variável (`$base`, `${GUARDA_BASE:-...}`)
// é apagada antes de procurar palavra. Sem esse apagamento, o `$codigo` de
// dentro de uma mensagem legítima como `(código $codigo)` seria acusado.

const pkg = JSON.parse(
  readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
) as { scripts: Record<string, string> };

// Palavras portuguesas que, em ASCII puro, estão necessariamente erradas.
// Nenhuma delas é palavra inglesa, então não acusam `test`, `build` ou `HEAD`.
const SEM_ACENTO = [
  "nao", "voce", "entao", "acao", "opcao", "funcao", "posicao", "informacao",
  "nivel", "codigo", "ultimo", "proximo", "padrao", "versao", "execucao",
  "conteudo", "numero", "apos", "tambem", "alem", "porem", "minimo", "maximo",
  "indice", "arvore", "memoria", "referencia", "sequencia", "obrigatorio",
  "invalido", "sera", "diretorio", "usuario", "relatorio", "generico",
];

/** Argumentos de `echo` de um script — o que a pessoa lê no terminal. */
function mensagens(script: string): string[] {
  const achados: string[] = [];
  for (const padrao of [/echo\s+"([^"]*)"/g, /echo\s+'([^']*)'/g]) {
    for (const m of script.matchAll(padrao)) achados.push(m[1]);
  }
  return achados;
}

/** Apaga expansão de variável: `${GUARDA_BASE:-origin/main}` e `$base`. */
function semVariaveis(texto: string): string {
  return texto.replace(/\$\{[^}]*\}/g, " ").replace(/\$\w+/g, " ");
}

test.describe("mensagens dos scripts do package.json", () => {
  test("nenhuma mensagem de echo tem palavra portuguesa sem acento", () => {
    const problemas: string[] = [];

    for (const [nome, script] of Object.entries(pkg.scripts)) {
      for (const msg of mensagens(script)) {
        const limpo = semVariaveis(msg);
        for (const palavra of SEM_ACENTO) {
          if (new RegExp(`\\b${palavra}\\b`, "i").test(limpo)) {
            problemas.push(`${nome}: "${palavra}" em ${JSON.stringify(msg)}`);
          }
        }
      }
    }

    expect(problemas, "texto de terminal também é texto de tela").toEqual([]);
  });

  test("guarda:commit acusa a ref base ausente em português correto", () => {
    const script = pkg.scripts["guarda:commit"];
    expect(script, "o script guarda:commit sumiu do package.json").toBeTruthy();
    expect(script).toContain("a ref base '$base' não existe.");
  });
});
