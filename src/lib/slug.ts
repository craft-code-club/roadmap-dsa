// Gera um id/âncora estável a partir de um texto. Usado tanto nos títulos (h2)
// do MDX quanto no índice "Nesta página", para que os links do índice caiam
// exatamente no título certo. Remove acentos -> ASCII limpo.
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tira acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // nao-alfanumerico vira hifen
    .replace(/^-+|-+$/g, ""); // sem hifen nas pontas
}

// Extrai o texto puro de children do React (string, numero, arrays, elementos).
export function textOf(node: unknown): string {
  if (node == null || node === false || node === true) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (typeof node === "object" && "props" in (node as Record<string, unknown>)) {
    const props = (node as { props?: { children?: unknown } }).props;
    return textOf(props?.children);
  }
  return "";
}
