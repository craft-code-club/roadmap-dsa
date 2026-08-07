#!/usr/bin/env node
/**
 * Extrai, pela AST do TypeScript, TUDO que o aluno lê num arquivo .tsx —
 * e separa disso o que é código.
 *
 *   entrada  stdin, JSON:  {"files": ["a.tsx", "b.tsx", ...]}
 *   saída    stdout, JSON: {"a.tsx": {"tela": [...], "codigo": [...]}, ...}
 *
 * É o motor do `guarda-idioma.py`. Não é feito para ser chamado à mão.
 *
 * POR QUE AST E NÃO REGEX
 * -----------------------
 * As três primeiras versões do guarda casavam texto por expressão regular, e as
 * três passaram verde com a aula estragada. Os dois últimos buracos, medidos no
 * `listas-ligadas`, não têm conserto em regex:
 *
 *   1) crase ANINHADA dentro de `${...}`:
 *        `... ${cycle > 0 ? `, e ${cycle} nós` : ""} ...`
 *      um regex de crase pareia a 1ª com a 2ª, a 3ª com a 4ª, e daí em diante
 *      o pareamento fica trocado: o guarda passa a comparar CÓDIGO achando que
 *      é tela. No `LinkedListFloyd` (6 aninhamentos) isso vira dezenas de
 *      linhas de ruído, e um rótulo trocado de verdade some no meio.
 *
 *   2) texto de tela que divide a linha com uma interpolação:
 *        <span>Nós no ciclo: {cycle === 0 ? "nenhum" : cycle}</span>
 *      "Nós no ciclo: " não está dentro de string nenhuma, e o padrão `>texto<`
 *      não casa porque tem um `{` no meio. Este é o silencioso.
 *
 * A AST não tem pareamento a errar: um template é um nó com `head`, `spans` e
 * `literal`s, e um nó de texto JSX é um nó, tenha quantas interpolações tiver
 * ao lado.
 *
 * COMO O TEXTO É NORMALIZADO
 * --------------------------
 * - toda interpolação (`${...}` e `{...}` no JSX) vira `§`, para a FRASE ser
 *   comparada e o valor interpolado não;
 * - os filhos de um elemento JSX viram UM item só (`"Nós no ciclo: §"`), o que
 *   mantém o rótulo colado ao contexto em vez de virar um fragmento solto;
 * - espaço em branco é colapsado, porque a indentação não é tela;
 * - item sem nenhuma letra é descartado (número, `§§`, pontuação solta).
 */
import { readFileSync } from "node:fs";
import ts from "typescript";

// ---------------------------------------------------------------------------
// A fronteira código × conteúdo.
//
// O critério é conservador de propósito: na dúvida, é TELA. Um falso positivo
// custa uma linha de ruído; um falso negativo é o guarda ficando cego, que é o
// defeito que este arquivo existe para consertar.
// ---------------------------------------------------------------------------

/** Atributos de elemento HTML cujo valor o aluno LÊ. */
const ATRIBUTOS_DE_TEXTO = new Set([
  "alt",
  "title",
  "placeholder",
  "label",
  "content",
  "download",
  "aria-label",
  "aria-description",
  "aria-roledescription",
  "aria-valuetext",
  "aria-placeholder",
]);

/** Atributos que são código em QUALQUER elemento, componente inclusive. */
const ATRIBUTOS_DE_CODIGO = new Set(["key", "ref", "className", "class"]);

function nomeDoAtributo(attr) {
  const n = attr.name;
  if (ts.isIdentifier(n)) return n.text;
  // JSX namespaced (`xlink:href`) — sempre código neste repo.
  return `${n.namespace?.text ?? ""}:${n.name?.text ?? ""}`;
}

/** `<div>` é intrínseco (vocabulário fixo); `<VizFooter>` é componente. */
function elementoIntrinseco(attr) {
  const dono = attr.parent?.parent; // JsxAttributes -> JsxOpening/SelfClosing
  const tag = dono?.tagName;
  if (!tag || !ts.isIdentifier(tag)) return false;
  const c = tag.text.charAt(0);
  return c === c.toLowerCase() && c !== c.toUpperCase();
}

/**
 * O atributo JSX que envolve este literal, se houver. Sobe na árvore até achar
 * um `JsxAttribute`, parando na fronteira do elemento — um literal que está no
 * FILHO de um elemento não pertence ao atributo do pai.
 */
function atributoQueEnvolve(node) {
  let n = node.parent;
  while (n) {
    if (ts.isJsxAttribute(n)) return n;
    if (
      ts.isJsxElement(n) ||
      ts.isJsxFragment(n) ||
      ts.isJsxSelfClosingElement(n) ||
      ts.isSourceFile(n)
    ) {
      return null;
    }
    n = n.parent;
  }
  return null;
}

function especificadorDeModulo(node) {
  const p = node.parent;
  if (!p) return false;
  if (ts.isImportDeclaration(p) && p.moduleSpecifier === node) return true;
  if (ts.isExportDeclaration(p) && p.moduleSpecifier === node) return true;
  if (ts.isImportTypeNode(p)) return true;
  if (ts.isExternalModuleReference(p)) return true;
  if (ts.isCallExpression(p) && p.arguments[0] === node) {
    const alvo = p.expression;
    if (alvo.kind === ts.SyntaxKind.ImportKeyword) return true;
    if (ts.isIdentifier(alvo) && alvo.text === "require") return true;
  }
  return false;
}

/** `"tela"` ou `"codigo"` para um literal já reconhecido. */
function classificar(node) {
  const p = node.parent;

  // "use client" e afins: statement de string solta é diretiva.
  if (p && ts.isExpressionStatement(p)) return "codigo";

  if (especificadorDeModulo(node)) return "codigo";

  // `Omit<Step, "slots" | "desloc">` — chave de tipo é código, e o §0 do
  // contrato já dizia que só o `tsc` pega renomeação errada aí.
  if (p && ts.isLiteralTypeNode(p)) return "codigo";

  // Nome de propriedade escrito como literal: `{ "data-x": 1 }`, `obj["k"]`.
  // `MethodSignature` entra na lista pelo mesmo motivo que `PropertySignature`:
  // nome de membro declarado em tipo ou interface é CÓDIGO, nunca texto que o
  // aluno lê. Sem ele, `interface I { "faz-algo"(): void }` cairia no default
  // `tela` e o guarda reprovaria um rename legítimo.
  if (
    p &&
    (ts.isPropertyAssignment(p) ||
      ts.isPropertySignature(p) ||
      ts.isMethodDeclaration(p) ||
      ts.isMethodSignature(p)) &&
    p.name === node
  ) {
    return "codigo";
  }
  if (p && ts.isElementAccessExpression(p) && p.argumentExpression === node) return "codigo";

  const attr = atributoQueEnvolve(node);
  if (attr) {
    const nome = nomeDoAtributo(attr);
    if (ATRIBUTOS_DE_CODIGO.has(nome)) return "codigo";
    if (ATRIBUTOS_DE_TEXTO.has(nome)) return "tela";
    // Elemento HTML tem vocabulário fixo: o que não está na lista de texto é
    // código (`viewBox`, `d`, `style`, `type`, `role`, `fill`...). Componente
    // nosso pode ter prop de rótulo com qualquer nome, então fica em tela.
    if (elementoIntrinseco(attr)) return "codigo";
  }

  return "tela";
}

// ---------------------------------------------------------------------------
// Extração
// ---------------------------------------------------------------------------

const TEM_LETRA = /[A-Za-zÀ-ÖØ-öø-ÿ]/;

function normalizar(s) {
  return s.replace(/\s+/g, " ").trim();
}

/** O "formato" de um template: `a ${x} b` -> "a § b". */
function formaDoTemplate(node) {
  let out = node.head.text;
  for (const span of node.templateSpans) out += "§" + span.literal.text;
  return out;
}

/**
 * Os filhos de um elemento JSX viram UM item. Interpolação e elemento filho
 * viram `§`; o filho é coletado por conta própria quando a varredura chegar
 * nele.
 */
function formaDosFilhosJsx(node) {
  let out = "";
  for (const filho of node.children) {
    if (ts.isJsxText(filho)) out += filho.text;
    else out += "§";
  }
  return out;
}

// Arquivos que o parser não conseguiu ler inteiros. Ver o `process.exit(2)` no
// fim: a lista existe para o motor poder REPROVAR, não só avisar.
const invalidos = [];

// A extensão decide a gramática. Forçar TSX em TODO arquivo quebra TS puro:
// `const f = <T>(x: T) => x` vira abertura de JSX e o parser reclama. O lado
// Python aceita .ts/.js/.jsx em EXTENSOES, e agora que o motor REPROVA com 2
// quando não consegue ler, um único .ts com genérico derrubaria um diretório
// inteiro que é válido. Medido antes desta troca: 3 diagnósticos e saída 2.
// As fixtures da suíte terminam em `.tsx.txt` e caem no fallback TSX.
const GRAMATICAS = {
  ts: ts.ScriptKind.TS,
  tsx: ts.ScriptKind.TSX,
  js: ts.ScriptKind.JS,
  jsx: ts.ScriptKind.JSX,
  mjs: ts.ScriptKind.JS,
  cjs: ts.ScriptKind.JS,
};

function gramaticaDe(caminho) {
  const m = /\.([cm]?[jt]sx?)$/i.exec(caminho);
  return (m && GRAMATICAS[m[1].toLowerCase()]) || ts.ScriptKind.TSX;
}

function extrair(caminho) {
  const fonte = readFileSync(caminho, "utf-8");
  const sf = ts.createSourceFile(
    caminho,
    fonte,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    gramaticaDe(caminho),
  );

  const achados = { tela: [], codigo: [] };
  const guardar = (texto, onde) => {
    const t = normalizar(texto);
    if (t && TEM_LETRA.test(t)) achados[onde].push(t);
  };

  const andar = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      guardar(node.text, classificar(node));
    } else if (ts.isTemplateExpression(node)) {
      guardar(formaDoTemplate(node), classificar(node));
    } else if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
      guardar(formaDosFilhosJsx(node), "tela");
    }
    node.forEachChild(andar);
  };
  andar(sf);

  // Erro de sintaxe faz a AST sair truncada e o guarda ficar cego em silêncio.
  // Avisar no stderr não bastava: o motor saía 0, a fachada comparava o que
  // conseguiu extrair de um arquivo pela metade e imprimia 0 ("a tela não
  // mudou") ou 1 ("mudou"), que é exatamente o "0 por não ter conseguido
  // olhar" que o contrato proíbe. Agora entra na lista e o motor sai 2.
  const diags = sf.parseDiagnostics ?? [];
  if (diags.length) {
    const msg = ts.flattenDiagnosticMessageText(diags[0].messageText, " ");
    process.stderr.write(`guarda-idioma: ${caminho} não é TSX válido (${diags.length}): ${msg}\n`);
    invalidos.push(caminho);
  }

  return achados;
}

// ---------------------------------------------------------------------------

let entrada = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (c) => (entrada += c));
process.stdin.on("end", () => {
  const { files } = JSON.parse(entrada);
  const saida = {};
  for (const f of files) saida[f] = extrair(f);

  // Sai 2 ANTES de escrever o JSON: extração truncada não pode chegar à
  // fachada com cara de resultado. A fachada lê o código != 0 e morre com 2,
  // que é o código de "o guarda não conseguiu rodar" do contrato.
  if (invalidos.length) {
    process.stderr.write(
      `guarda-idioma: ${invalidos.length} arquivo(s) sem TSX válido; ` +
        `a extração ficaria truncada e o resultado seria mentira.\n`,
    );
    process.exit(2);
  }

  process.stdout.write(JSON.stringify(saida));
});
