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
// referenciados por nome (string), não por função importada.
const withMDX = createMDX({
  options: {
    remarkPlugins: [["remark-gfm"]],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
