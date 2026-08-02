import type { Metadata } from "next";
import "./globals.css";
import { ProgressProvider } from "@/components/ProgressProvider";
import { Shell } from "@/components/Shell";
import { SITE_URL } from "@/lib/links";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Roadmap DSA · Craft & Code Club",
    template: "%s · Roadmap DSA",
  },
  description:
    "O maior guia visual e gratuito de Algoritmos e Estruturas de Dados em português. Cada tópico com o algoritmo rodando passo a passo, artigo, vídeo e problemas do LeetCode e GeeksforGeeks. Feito pela comunidade Craft & Code Club.",
  keywords: ["DSA", "algoritmos", "estruturas de dados", "LeetCode", "roadmap", "português", "Craft & Code Club"],
  openGraph: {
    title: "Roadmap DSA · Craft & Code Club",
    description: "Visualização e aprofundamento em cada estrutura. Guia visual, gratuito e open source de DSA em português.",
    type: "website",
    locale: "pt_BR",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
        />
      </head>
      <body>
        <ProgressProvider>
          <Shell>{children}</Shell>
        </ProgressProvider>
      </body>
    </html>
  );
}
