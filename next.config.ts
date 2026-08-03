import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  // Site 100% estático (SSG). Sem servidor: só HTML/CSS/JS servidos de qualquer
  // hospedagem grátis (Cloudflare Pages, GitHub Pages, etc.).
  output: "export",
  reactStrictMode: true,
  poweredByHeader: false,
  trailingSlash: true,
  images: { unoptimized: true },
  // Permite páginas e conteúdo em .md / .mdx além de .ts / .tsx.
  pageExtensions: ["ts", "tsx", "md", "mdx"],
};

// Turbopack serializa as options do loader, então os plugins precisam ser
// referenciados por nome (string), não por função importada. Pelo mesmo motivo,
// as options de cada plugin só podem ser JSON (nada de funções/transformers).
const withMDX = createMDX({
  options: {
    remarkPlugins: [["remark-gfm"]],
    rehypePlugins: [
      // Shiki roda no BUILD, dentro do loader do MDX: o HTML já sai colorido e
      // nenhum byte de JS de highlight vai para o cliente. O SSG continua igual.
      [
        "@shikijs/rehype",
        {
          theme: "github-dark-default",
          // Só as gramáticas que o conteúdo usa (+ as prováveis de contribuição).
          // Carregar as ~200 do bundle deixaria o build lento à toa.
          langs: [
            "python",
            "elixir",
            "javascript",
            "typescript",
            "go",
            "java",
            "c",
            "cpp",
            "rust",
            "bash",
            "json",
            "sql",
            "text",
          ],
          // Bloco com linguagem fora da lista não quebra o build: cai em texto puro.
          fallbackLanguage: "text",
          // Mantém `language-<lang>` no <code>: é daí que o selo de linguagem sai.
          addLanguageClass: true,
        },
      ],
    ],
  },
});

export default withMDX(nextConfig);
