# Roadmap DSA

O maior guia **visual, gratuito e open source** de Algoritmos e Estruturas de Dados em português.
Feito pela comunidade [Craft & Code Club](https://craftcodeclub.io). Cada tópico reúne, numa
página só: o **algoritmo rodando passo a passo**, o **artigo**, o **vídeo**, uma lista de
**problemas** do LeetCode / GeeksforGeeks e **referências**, com o progresso salvo no navegador.

🔗 **A Plataforma:** https://dsa.craftcodeclub.io \
💬 **Comunidade:** [Discord](https://craftcodeclub.io/join) \
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
  roadmap.ts                ÍNDICE do ROADMAP: fonte única do menu e da trilha principal
  tracks.ts                 o que existe FORA do roadmap: trilhas e tópicos avulsos
  topics/*.mdx              corpo dos artigos "ready" (do roadmap e de fora dele)
  topics/index.ts           registro slug -> MDX
  visualizers/              visualizadores (ilhas client usadas nos artigos)
    SlidingWindowVisualizer.tsx
    TwoPointersVisualizer.tsx
src/                        código de estrutura (não é conteúdo)
  app/                      rotas (App Router)
    page.tsx                home
    roadmap/                o roadmap inteiro
    trilha/                 vitrine dos extras
      [slug]/               abertura de uma trilha (sub-roadmap)
    topico/[slug]/          página de tópico (artigo + vídeo + problemas + referências)
    apoie/                  página de apoio
      apoiadores.ts         apoiadores (da APOIA.se, no build) e parceiros
    opengraph-image.tsx     imagem de preview (OG), gerada no build
    sitemap.ts, robots.ts   SEO
  components/
    Shell.tsx               moldura: header + gaveta + rodapé; escolhe a barra lateral
    RoadmapSidebar.tsx      barra lateral do roadmap (busca, progresso, 16 grupos)
    TrackSidebar.tsx        barra lateral de uma trilha
    GrupoCards.tsx          grade de grupos e tópicos (roadmap e abertura de trilha)
    ExtrasGrid.tsx          os cards de "Trilhas e outros tópicos"
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

   O selo **"em breve"** no menu lateral aparece só nos tópicos ainda sem nenhum material:
   `status: "soon"` **e** sem `youtube`, `article`, `viz` e `extraVideos` (é a regra do
   `isEmptyTopic()`, em `content/roadmap.ts`). Assim que o tópico ganha um vídeo, um artigo ou
   um visualizador, o selo some sozinho, e tópico `ready` nunca leva o selo. Se o tópico não
   vai ter visualizador, marque `noViz: true` para a página não prometer um que não vem.

   O selo **"NOVO"** é o oposto: uma **tag manual**, `isNew: true`. Não tem data, então não
   envelhece sozinho. Quem publica um tópico marca o dele e **tira a marca dos anteriores**, no
   mesmo PR. É a única forma de o selo continuar querendo dizer "chegou agora".

2. **Escreva o artigo** (para virar `status: "ready"`): crie `content/topics/kadane.mdx`.
   Dentro do MDX você já pode usar, sem importar: `<Callout>`, `<Colunas>`, `<Cartao>` e
   qualquer visualizador exposto em `mdx-components.tsx`.

   Blocos de código levam **sempre a linguagem na cerca** (` ```python `): o destaque de sintaxe
   é gerado no build pelo Shiki (nenhum JS extra no cliente) e é dela que sai o selo discreto de
   linguagem no canto do bloco. Cerca sem linguagem sai sem cor e sem selo, que é justamente o
   que se quer em diagrama ASCII e pseudo-fórmula.

3. **Ligue o artigo:** registre em `content/topics/index.ts` e mude `status` para `"ready"`.

## Roadmap, trilha ou tópico avulso: onde o tópico mora

Nem tudo que vale a pena aprender cabe na fila do roadmap. Existem **três casas**, e todas
publicam o tópico em `/topico/<slug>/` — a URL de um tópico não depende de onde ele mora.

| Casa | Onde se registra | O que o aluno vê |
| --- | --- | --- |
| **Roadmap** | `content/roadmap.ts`, dentro de um grupo | a barra lateral com os tópicos do roadmap, e anterior/próximo dentro dele |
| **Tópico avulso** | `content/tracks.ts`, em `STANDALONES` | **nenhuma** barra lateral: a página é o assunto inteiro, e fecha com a banda "Continue explorando" |
| **Trilha** (sub-roadmap) | `content/tracks.ts`, em `TRACKS` | a barra lateral **daquela trilha**, com progresso próprio e a volta para o roadmap. A abertura fica em `/trilha/<slug>/` |

O vocabulário é fixo, e vale a pena guardar: **roadmap** é a sequência principal, **trilha** é
uma das extras, **tópico** é uma página. Nos identificadores, `Track` e `Standalone`.

Como escolher, em uma pergunta: **cabe numa página?** Se cabe e é um assunto à parte (Skip List,
Union-Find, Trie), é tópico avulso. Se é uma família que precisa de várias páginas em ordem
(árvores balanceadas, consultas em intervalos), é trilha. Se é um degrau que os degraus
seguintes pressupõem, é roadmap.

Três coisas que o código já cobra por você, no `npm run build`:

- **slug único no site inteiro.** Roadmap, trilha e avulso dividem o namespace de `/topico/`, e
  slug repetido faria a segunda página sumir em silêncio. O guarda em `content/tracks.ts`
  derruba o build dizendo quais são os dois donos.
- **id de grupo único**, pelo mesmo motivo (é chave de React e âncora de `/roadmap/#<id>`).
- **pré-requisito que existe**: os slugs em `requires` têm que ser tópicos de verdade.

E duas que dependem de você: uma trilha só entra no índice do Google quando tem ao menos um
tópico com material (`trackHasMaterial`), e a ordem dos cards da vitrine é derivada — o que tem
material vem primeiro, sozinho, sem lista à mão.

## Como adicionar um visualizador

O padrão vive em `content/visualizers/SlidingWindowVisualizer.tsx` e
`TwoPointersVisualizer.tsx`: um **gerador puro de passos** + a mesma casca de UI (células,
código sincronizado, painel de variáveis, controles e o botão **Expandir**). Para uma técnica nova:

1. Copie o componente, troque `gerarPassos` e a constante `CODIGO`.
2. Exponha-o em `mdx-components.tsx`.
3. Use no `.mdx` do tópico: `<MeuVisualizador />`.

Nem todo tópico tem algoritmo rodando. Quando o que se aprende é uma **classificação** (e não
uma execução passo a passo), o visualizador troca a linha do tempo por manipulação direta:
veja `SubTypesVisualizer.tsx`, onde o leitor monta um pedaço clicando nos elementos e o painel
responde o que aquele pedaço é. A casca (cabeçalho, **Expandir**, células) continua a mesma.

A casca não se escreve à mão: ela vem do hook `useVisualizer` (`src/lib/visualizer.tsx`), com
`VizHeader` e `VizFooter`. Ele cobre o que todo visualizador tem — caber na altura da tela do
aluno, o painel expandido com cabeçalho e controles parados, o bloco que mostra e oculta, os
controles de reprodução — e nada do que cada um mostra. O contrato, com o uso e as opções, está
em [`content/visualizers/README.md`](content/visualizers/README.md).

O código dos visualizadores segue **identificador em inglês, tela em português**: variáveis,
tipos e props em inglês; tudo que o aluno lê em português, inclusive o código de exemplo que
aparece dentro do visualizador e os rótulos das variáveis.

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

Duas licenças, porque são duas coisas:

- **O código** — [MIT](./LICENSE). Open source pela definição da OSI, uso comercial permitido.
  Pegue o motor dos visualizadores e construa o que quiser.
- **O conteúdo** — [CC BY-NC-SA 4.0](./LICENSE-CONTENT). Os artigos e o material didático
  (inclusive as explicações que moram dentro dos visualizadores): livres para estudar, ensinar
  e adaptar, desde que com crédito (BY), sem uso comercial (NC) e com a adaptação distribuída
  sob esta mesma licença (SA).

A fronteira entre os dois **não é por diretório** — ela atravessa arquivos. A seção
[Onde passa a fronteira](./LICENSE) explica com exemplos, e a pergunta que decide é: se esta
linha sumisse, quebraria o **programa** (código) ou a **aula** (conteúdo)?
