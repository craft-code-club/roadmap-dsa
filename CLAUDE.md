# CLAUDE.md — direções para agentes

Guia para qualquer agente (Claude e afins) trabalhando neste repositório. Leia antes de editar.
Documentação para humanos fica no [README](./README.md) e no [CONTRIBUTING](./CONTRIBUTING.md).

## O projeto

**Roadmap DSA** — o maior guia **visual e gratuito** de Algoritmos e Estruturas de Dados em
português, feito **pela comunidade Craft & Code Club**. Cada tópico tem: algoritmo rodando passo
a passo (visualizador), artigo, vídeo, problemas (LeetCode/GeeksforGeeks) e referências.

- Domínio: `https://dsa.craftcodeclub.io`. Repo: `craft-code-club/roadmap-dsa`.
- Licença: **PolyForm Noncommercial 1.0.0** (uso não comercial). Contribuições sob a mesma.

## Stack e comandos

- **Next.js 16 (App Router) + React 19**, export estático (`output: "export"` → `out/`). Node 22+.
- Conteúdo em **MDX**. Partes interativas são ilhas `"use client"`; o resto é estático (SSG).
- Deploy: **Cloudflare Pages via Wrangler** (ver seção Deploy e `.github/workflows/`).

```bash
npm run dev      # desenvolvimento
npm run build    # DEVE passar (gera ./out). 55+ páginas.
npm test         # Playwright (roda contra o ./out via python http.server). DEVE passar.
```

## Verificação (faça sempre)

1. Depois de mudar código, rode `npm run build` **e** `npm test`. Os dois têm que passar.
2. Para conferência visual, use o **`agent-browser`** (Vercel Labs CLI, instalado na máquina):
   - Servir o build: `python3 -m http.server 4321 --directory out` e abrir nele; ou usar o dev server.
   - Screenshot da página inteira: flag é **`--full`** (não `--full-page`).
   - Mobile: **`agent-browser set viewport 390 844`** (depois de `open`). Confira overflow com
     `document.body.scrollWidth > window.innerWidth`.
   - Overlay/modal (position:fixed): use screenshot de **viewport** (sem `--full`).
   - `find role button` não acha botões cujo nome começa com glifo (⤢). Clique via
     `agent-browser eval "document.querySelector('.classe').click()"`.
3. Arquivos temporários (prints, GIFs, artefatos) vão para **`/screenshots/`** (está no
   `.gitignore`). Nunca commite esses arquivos.

## Modelo de conteúdo

- **`content/roadmap.ts` é a fonte única** dos grupos e tópicos (dirige menu, roadmap, tags, SEO).
  `content/` fica na raiz, irmão de `src/`: `src/` é o código de estrutura, `content/` são os
  dados, artigos e visualizadores. Agrupamento estilo LeetCode (16 grupos): cada estrutura junto
  das técnicas que operam sobre ela; paradigmas (Recursão, Backtracking, Programação Dinâmica,
  Greedy Algorithms) como grupos próprios.
- **Nomes dos campos em inglês; valores exibidos em português.** Campos do tópico: `name`, `group`,
  `level`, `description`, `youtube` (id), `article` (link do blog), `extraVideos`, `references`,
  `problems`, `viz`, `status: "ready" | "soon"`.
- Tópicos "ready" têm corpo em `content/topics/<slug>.mdx`, registrado em `content/topics/index.ts`.
- Visualizadores ficam em `content/visualizers/` (ex.: `SlidingWindowVisualizer`,
  `TwoPointersVisualizer`), expostos em `mdx-components.tsx`. A lista de apoiadores fica em
  `src/app/apoie/apoiadores.ts` (página fixa, não é conteúdo de DSA).
- Alias: `@/*` → `src/*`, `@content/*` → `content/*`.
- **Adicionar tópico/visualizador:** ver README (seções "Como adicionar"). O padrão de
  visualizador é gerador puro de passos + casca compartilhada + botão Expandir.

## Navegação e links

- **`src/lib/links.ts` é ponto único.** Todo link de Discord lê `LINKS.discord` (convite direto).
  Comunidade = `LINKS.site` (craftcodeclub.io); repo = `LINKS.github`; apoio = `LINKS.apoiar`
  (campanha na APOIA.se).
- Barra: **esquerda** = Início, Roadmap; **direita** = YouTube, Discord, Apoiar + menu `⋯`.
  O menu `⋯` tem: Craft & Code Club, GitHub do projeto, Apoiadores e Parceiros (e, só no mobile,
  Início/Roadmap/YouTube que somem da barra).
- Links **externos** mostram `↗` (classe `ext`; a regra CSS é `.topnav > a.ext` para não afetar o
  menu). Bolinhas de marca: Discord blurple, YouTube vermelho, Apoiar âmbar.

## SEO

- `sitemap.ts`, `robots.ts` e `opengraph-image.tsx` existem. **Rotas de metadata precisam de
  `export const dynamic = "force-static"`** por causa do `output: "export"`.
- Tópicos realmente vazios (`soon` sem youtube/article/viz/extraVideos) recebem `noindex`
  (ver `generateMetadata` em `topico/[slug]/page.tsx`). Ao ganhar conteúdo, saem do noindex sozinhos.

## Responsividade

- Nos grids que colapsam no mobile, use **`minmax(0, 1fr)`** (não `1fr` puro, que vira min-content
  e estoura a largura) e **`min-width: 0`** nos itens que precisam encolher (article, `.mdx-cartao`,
  `.prose-pre`). Já verificado: 0 overflow em 360/390/768px.

## Deploy

Site estático (`out/`) publicado no **Cloudflare Pages** via **Wrangler**. O deploy roda no CI
(`.github/workflows/cloudflare-pages-deploy.yml`) em push para `main`; PRs de forks não fazem
deploy, e todo PR precisa da aprovação de um mantenedor antes do merge. Deploy local:
`npx wrangler pages deploy out --project-name <nome>`. Não há `wrangler.toml`: o nome do projeto
vem de `--project-name` (no CI, do secret). Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
`CLOUDFLARE_PROJECT_NAME` (e, para apoiadores, `APOIASE_TOKEN` / `APOIASE_CAMPAIGN_ID`).

## Git e CI

- **Conventional Commits** (`feat`, `fix`, `docs`, `ci`, `chore`, ...). Commits atômicos. Ver
  CONTRIBUTING para o padrão completo.
- Não commite `node_modules`, `out`, `.next`, prints (`/screenshots/`) — o `.gitignore` cobre.
- CI: `tests.yml` (Playwright), `cloudflare-pages-deploy.yml` (deploy fork-guarded; secrets
  `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_PROJECT_NAME`), `commitlint.yml`
  (Conventional Commits nos PRs), `codeql-analysis.yml` (só roda quando o repositório for público).
