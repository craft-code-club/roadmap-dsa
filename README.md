# Roadmap DSA

O maior guia **visual, gratuito e open source** de Algoritmos e Estruturas de Dados em português.
Feito pela comunidade [Craft & Code Club](https://craftcodeclub.io). Cada tópico reúne, numa
página só: o **algoritmo rodando passo a passo**, o **artigo**, o **vídeo**, uma lista de
**problemas** do LeetCode / GeeksforGeeks e **referências**, com o progresso salvo no navegador.

🔗 **A Plataforma:** https://dsa.craftcodeclub.io \
💬 **Comunidade:** [Discord](https://discord.gg/b5NnndAbFc) \
▶️ [YouTube](https://www.youtube.com/@CraftCodeClub) \
☕ [Apoie](https://dsa.craftcodeclub.io/apoie)

- **Stack:** Next.js 16 (App Router) + React 19, **SSG puro** (`output: "export"`). Requer Node 22+.
- **Conteúdo:** MDX. As partes dinâmicas (visualizadores, checkboxes) são ilhas client; o resto é estático.

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
content/                    conteúdo (irmão de src/): dados, artigos e visualizadores
  roadmap.ts                ÍNDICE dos tópicos: fonte única do menu/roadmap
  topics/*.mdx              corpo dos artigos "ready"
  topics/index.ts           registro slug -> MDX
  visualizers/              visualizadores (ilhas client usadas nos artigos)
    SlidingWindowVisualizer.tsx
    TwoPointersVisualizer.tsx
src/                        código de estrutura (não é conteúdo)
  app/                      rotas (App Router)
    page.tsx                home
    roadmap/                o roadmap inteiro
    topico/[slug]/          página de tópico (artigo + vídeo + problemas + referências)
    apoie/                  página de apoio
      apoiadores.ts         apoiadores (da APOIA.se, no build) e parceiros
    opengraph-image.tsx     imagem de preview (OG), gerada no build
    sitemap.ts, robots.ts   SEO
  components/
    Shell.tsx               casca: header + sidebar + progresso + busca
    RoadmapGroups.tsx       grade de grupos e tópicos do roadmap
    ProgressProvider.tsx    progresso no localStorage (tópicos + problemas)
    ProblemList.tsx         lista de problemas com checkbox
  lib/
    links.ts                links da comunidade (ponto único)
    slug.ts                 âncoras do índice "Nesta página"
mdx-components.tsx          componentes globais disponíveis em todo .mdx
(alias: @/* -> src/*, @content/* -> content/*)
```

## Como adicionar um tópico

1. **Registre no índice** em `content/roadmap.ts` (grupo certo). Só isso já coloca o tópico
   no menu e no roadmap. Os nomes dos campos são em inglês; os valores exibidos ficam em
   português. Campos: `youtube`, `article`, `extraVideos`, `references`, `problems`, `viz`.

   ```ts
   { slug: "kadane", name: "Kadane", group: "Arrays e Strings",
     level: "Médio", status: "soon", youtube: "VIDEO_ID",
     description: "Maior soma contígua, o clássico." }
   ```

   O selo **"em breve"** no menu lateral aparece só nos tópicos ainda sem nenhum material
   (sem `youtube`, `article`, `viz` e `extraVideos`). Assim que o tópico ganha um vídeo, um
   artigo ou um visualizador, o selo some sozinho. Se o tópico não vai ter visualizador,
   marque `noViz: true` para a página não prometer um que não vem.

2. **Escreva o artigo** (para virar `status: "ready"`): crie `content/topics/kadane.mdx`.
   Dentro do MDX você já pode usar, sem importar: `<Callout>`, `<Colunas>`, `<Cartao>` e
   qualquer visualizador exposto em `mdx-components.tsx`.

3. **Ligue o artigo:** registre em `content/topics/index.ts` e mude `status` para `"ready"`.

## Como adicionar um visualizador

O padrão vive em `content/visualizers/SlidingWindowVisualizer.tsx` e
`TwoPointersVisualizer.tsx`: um **gerador puro de passos** + a mesma casca de UI (células,
código sincronizado, painel de variáveis, controles e o botão **Expandir**). Para uma técnica nova:

1. Copie o componente, troque `gerarPassos` e a constante `CODIGO`.
2. Exponha-o em `mdx-components.tsx`.
3. Use no `.mdx` do tópico: `<MeuVisualizador />`.

## Progresso do usuário

`ProgressProvider` guarda dois mapas no `localStorage`: `ccc-dsa-progresso` (tópicos concluídos)
e `ccc-dsa-problemas` (problemas resolvidos). Sem login, sem backend.

## Deploy

CI/CD: o deploy roda automaticamente logo após o merge na `main`. Todo PR precisa da aprovação
de um mantenedor da comunidade antes do merge.

## Contribuindo

Toda ajuda é bem-vinda! Veja o [guia de contribuição](./CONTRIBUTING.md) e o
[Código de Conduta](./CODE_OF_CONDUCT.md).

## Licença

[PolyForm Noncommercial License 1.0.0](./LICENSE): livre para qualquer uso **não comercial**
(estudo, ensino, comunidade, outros projetos livres). Uso comercial não é permitido.
