import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@/components/Analytics";
import { ProgressProvider } from "@/components/ProgressProvider";
import { Shell } from "@/components/Shell";
import { SITE_URL } from "@/lib/links";

// Só o que é global de verdade mora aqui. Título, descrição e Open Graph são de
// cada rota (ver `src/lib/seo.ts`): quando `openGraph.title`/`description` eram
// fixados aqui, o valor do layout vencia o da página e TODA rota compartilhava o
// card da home no LinkedIn e no Facebook.
//
// O `template` continua sendo o fallback das rotas que não definem OG próprio
// (os /topico/*): o Next preenche `og:title`/`og:description` a partir do
// `title`/`description` resolvidos da página quando o layout não os impõe.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Roadmap DSA · Craft & Code Club",
    template: "%s · Roadmap DSA",
  },
  description:
    "O maior guia visual e gratuito de Algoritmos e Estruturas de Dados em português. Cada tópico com o algoritmo rodando passo a passo, artigo, vídeo e problemas do LeetCode e GeeksforGeeks. Feito pela comunidade Craft & Code Club.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Roadmap DSA",
  },
  twitter: {
    card: "summary_large_image",
  },
  // Search Console, método "tag HTML". É o PLANO B: o método recomendado é a
  // propriedade de domínio com registro TXT no DNS do Cloudflare, que cobre
  // `dsa.` e qualquer subdomínio, sobrevive a redeploy e não gasta um byte de
  // HTML. Esta linha existe para quem não tiver acesso ao DNS na hora: setando
  // `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, o Next emite
  // `<meta name="google-site-verification">` em todas as rotas. Sem a variável,
  // `undefined` não vira meta tag nenhuma.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

// `data-scroll-behavior="smooth"` no `<html>` é como o Next sabe que o CSS deste
// site tem `html { scroll-behavior: smooth }`. Sem o atributo ele nem tenta
// desligar a rolagem suave ao trocar de rota: o "volta pro topo" da navegação
// vira uma animação de mais de um segundo saindo do fim de uma página de ~18000px,
// e qualquer toque no trackpad no meio do caminho cancela a animação e deixa o
// leitor parado no meio do artigo novo — a rolagem que "às vezes vai, às vezes
// não". Com o atributo, o Next zera a rolagem na hora e devolve o `smooth` logo em
// seguida, então as âncoras do índice "Nesta página" continuam suaves.
//
// Quem pediu menos movimento no sistema fica com `scroll-behavior: auto` pela
// regra de `prefers-reduced-motion: reduce` do `globals.css` — que só passou a
// valer de verdade nesta mudança, porque o `smooth` vinha depois dela e ganhava
// por ordem. Para essa pessoa não há animação para desligar, nem nas âncoras, e
// o atributo não muda nada.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
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
      {/* Irmão do <body>, como a doc do Next manda: o next/script injeta a tag
          depois da hidratação, então a posição no JSX não é a posição no DOM. */}
      <Analytics />
    </html>
  );
}
