# Roadmap DSA

O maior guia **visual, gratuito e open source** de Algoritmos e Estruturas de Dados em português.
Feito pela comunidade [Craft & Code Club](https://craftcodeclub.io). Cada tópico reúne, numa
página só: o **algoritmo rodando passo a passo**, o **artigo**, o **vídeo**, uma lista de
**problemas** do LeetCode / GeeksforGeeks e **referências**, com o progresso salvo no navegador.

🔗 **No ar:** https://dsa.craftcodeclub.io
💬 **Comunidade:** [Discord](https://discord.gg/b5NnndAbFc) · ▶️ [YouTube](https://www.youtube.com/@CraftCodeClub) · ☕ [Apoie](https://dsa.craftcodeclub.io/apoie)

- **Stack:** Next.js 16 (App Router) + React 19, **SSG puro** (`output: "export"`). Requer Node 22+.
- **Conteúdo:** MDX. As partes dinâmicas (visualizadores, checkboxes) são ilhas client; o resto é estático.
- **Deploy:** Cloudflare Pages via Wrangler (grátis, sem servidor).

## Rodar

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # gera ./out (site estático)
npm run serve    # serve o ./out localmente
npm test         # testes de navegação (Playwright)
```

## Estrutura

```
src/
  app/                      rotas (App Router)
    page.tsx                home
    roadmap/                o roadmap inteiro
    topico/[slug]/          página de tópico (artigo + vídeo + problemas + referências)
    apoie/                  página de apoiadores e parceiros
    opengraph-image.tsx     imagem de preview (OG), gerada no build
    sitemap.ts, robots.ts   SEO
  components/
    Shell.tsx               casca: header + sidebar + progresso + busca
    JanelaVisualizer.tsx    visualizador (padrão para novos visuais)
    DoisPonteirosVisualizer.tsx
    ProgressProvider.tsx    progresso no localStorage (tópicos + problemas)
    ProblemList.tsx         lista de problemas com checkbox
  content/
    roadmap.ts              ÍNDICE dos tópicos: fonte única do menu/roadmap
    topics/*.mdx            corpo dos artigos "ready"
    topics/index.ts         registro slug -> MDX
  lib/
    links.ts                links da comunidade (ponto único)
    slug.ts                 âncoras do índice "Nesta página"
mdx-components.tsx          componentes globais disponíveis em todo .mdx
```

## Como adicionar um tópico

1. **Registre no índice** em `src/content/roadmap.ts` (grupo certo). Só isso já coloca o tópico
   no menu e no roadmap. Campos: `youtube`, `artigo`, `videosExtras`, `referencias`, `problemas`, `viz`.

   ```ts
   { slug: "kadane", nome: "Kadane", grupo: "Arrays e Strings",
     nivel: "Médio", status: "soon", youtube: "VIDEO_ID",
     descricao: "Maior soma contígua, o clássico." }
   ```

2. **Escreva o artigo** (para virar `status: "ready"`): crie `src/content/topics/kadane.mdx`.
   Dentro do MDX você já pode usar, sem importar: `<Callout>`, `<Colunas>`, `<Cartao>` e
   qualquer visualizador exposto em `mdx-components.tsx`.

3. **Ligue o artigo:** registre em `src/content/topics/index.ts` e mude `status` para `"ready"`.

## Como adicionar um visualizador

O padrão vive em `src/components/JanelaVisualizer.tsx` e `DoisPonteirosVisualizer.tsx`: um
**gerador puro de passos** + a mesma casca de UI (células, código sincronizado, painel de
variáveis, controles e o botão **Expandir**). Para uma técnica nova:

1. Copie o componente, troque `gerarPassos` e a constante `CODIGO`.
2. Exponha-o em `mdx-components.tsx`.
3. Use no `.mdx` do tópico: `<MeuVisualizador />`.

## Convenções da copy (importante)

- **Sem travessão** (`—`) na copy do site. Use pontuação simples. Confira com `grep -rn "—" src/`.
- Conteúdo em **português**. A comunidade é feminina: "a comunidade", "pela", "da comunidade
  Craft & Code Club" (nunca "o/pelo/do").
- Apoio é enquadrado como **"apoie a comunidade"** (não "custos"). Discord e Apoiar são os CTAs
  primários; contribuir é discreto. A experiência de estudo fica limpa.

## Progresso do usuário

`ProgressProvider` guarda dois mapas no `localStorage`: `ccc-dsa-progresso` (tópicos concluídos)
e `ccc-dsa-problemas` (problemas resolvidos). Sem login, sem backend.

## Deploy

Site estático (`out/`) publicado no **Cloudflare Pages** via **Wrangler**. O deploy roda no CI
(`.github/workflows/cloudflare-pages-deploy.yml`) em push para `main`; PRs de forks não fazem
deploy. Local: `npx wrangler pages deploy out`. Requer os secrets `CLOUDFLARE_API_TOKEN` e
`CLOUDFLARE_ACCOUNT_ID` no repositório.

## Contribuindo

Toda ajuda é bem-vinda! Veja o [guia de contribuição](./CONTRIBUTING.md) e o
[Código de Conduta](./CODE_OF_CONDUCT.md).

## Licença

[PolyForm Noncommercial License 1.0.0](./LICENSE): livre para qualquer uso **não comercial**
(estudo, ensino, comunidade, outros projetos livres). Uso comercial não é permitido.
