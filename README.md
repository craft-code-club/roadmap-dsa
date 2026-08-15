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
content/                    SÓ conteúdo (irmão de src/): dados, artigos e visualizadores
  topicos/<slug>/index.ts   o dado de um tópico: `topico`, `sumario` e `pratica`
  topicos/<slug>/artigo.mdx o texto dele. A pasta tem esses dois arquivos, e só
  topicos/index.ts          o registro dos tópicos (importado também pelo cliente)
  topicos/artigos.ts        o registro dos corpos .mdx (só servidor)
  topicos/pratica.ts        o registro dos problemas e referências (só servidor)
  roadmaps/<slug>.ts        um roadmap: nome, nível e a ordem em que ele CITA tópicos
  roadmaps/index.ts         o registro dos roadmaps, os derivados e o guarda de namespace
  visualizers/              visualizadores (ilhas client usadas nos artigos)
    SlidingWindowVisualizer.tsx
    TwoPointersVisualizer.tsx
src/                        código de estrutura (não é conteúdo)
  content/tipos.ts          o MODELO do conteúdo: Topic, Roadmap, Pratica, Artigo…
  app/                      rotas (App Router)
    page.tsx                home
    roadmaps/               vitrine dos roadmaps
      [slug]/               abertura de um roadmap (os Fundamentos são um deles)
        [topico]/           um tópico servido dentro dele
    topicos/                o índice completo
    topicos/[slug]/         a página canônica de um tópico
    apoie/                  página de apoio
      apoiadores.ts         apoiadores (da APOIA.se, no build) e parceiros
    opengraph-image.tsx     imagem de preview (OG), gerada no build
    sitemap.ts, robots.ts   SEO
  components/
    Shell.tsx               moldura: header + gaveta + rodapé; escolhe a barra lateral
    FundamentosSidebar.tsx  barra lateral dos Fundamentos (busca, progresso, 16 grupos)
    RoadmapSidebar.tsx      barra lateral de um roadmap
    TopicoPagina.tsx        o artigo de um tópico, usado pelas DUAS rotas que o servem
    GrupoCards.tsx          grade de grupos e tópicos (Fundamentos e abertura de roadmap)
    TodosOsTopicos.tsx      o índice completo, com busca e filtros
    ExtrasGrid.tsx          os cards de "Roadmaps e outros tópicos"
    ProgressProvider.tsx    progresso no localStorage (tópicos + problemas)
    ProblemList.tsx         lista de problemas com checkbox
  lib/
    links.ts                links da comunidade (ponto único)
    slug.ts                 âncoras do índice "Nesta página"
mdx-components.tsx          componentes globais disponíveis em todo .mdx
(alias: @/* -> src/*, @content/* -> content/*)
```

## Como adicionar um tópico

Um tópico é uma **pasta com dois arquivos**. Ele não pertence a lugar nenhum: quem monta
sequência são os roadmaps, e eles o **citam** pelo slug.

1. **Crie `content/topicos/kadane/index.ts`.** Os nomes dos campos são em inglês; os valores
   que o aluno lê, em português.

   ```ts
   import type { Pratica, Topic } from "@/content/tipos";

   export const topico: Topic = {
     slug: "kadane", name: "Kadane", group: "Arrays e Strings",
     level: "Médio", status: "soon", youtube: "VIDEO_ID",
     description: "Maior soma contígua, o clássico.",
   };

   export const pratica: Pratica = {
     problems: [{ id: "lc-53", name: "Maximum Subarray", number: "53",
                  source: "LeetCode", level: "Médio", url: "https://leetcode.com/…" }],
     references: [{ title: "Kadane's Algorithm", source: "GeeksforGeeks", url: "https://…" }],
   };
   ```

   O `group` é o **assunto**, não um endereço: ele não põe o tópico em roadmap nenhum. Escreva-o
   **igual** ao dos tópicos do mesmo assunto (duas grafias viram duas seções em `/topicos/`).

   O selo **"em breve"** aparece só nos tópicos ainda sem material nenhum: `status: "soon"` **e**
   sem `youtube`, `article`, `viz` e `extraVideos` (é o `isEmptyTopic()`, em
   `content/topicos/index.ts`). Ganhou vídeo, artigo ou visualizador, o selo some sozinho. Se o
   tópico não vai ter visualizador, marque `noViz: true`.

   O selo **"NOVO"** é o oposto: uma **tag manual**, `isNew: true`. Não tem data, então não
   envelhece sozinho — quem publica marca o seu e **tira a marca dos anteriores**, no mesmo PR.

2. **Registre nos índices.** No `content/topicos/index.ts`, o import nomeado e a entrada em
   `MODULOS`; no `content/topicos/pratica.ts`, o import da `pratica`. Sem isso o arquivo existe e
   o site não o serve — e é `tests/roadmaps.spec.ts` que cobra.

3. **Escreva o artigo** (para virar `status: "ready"`): `content/topicos/kadane/artigo.mdx`.
   Dentro do MDX você já pode usar, sem importar: `<Callout>`, `<Colunas>`, `<Cartao>` e
   qualquer visualizador exposto em `mdx-components.tsx`.

   Blocos de código levam **sempre a linguagem na cerca** (` ```python `): o destaque de sintaxe
   é gerado no build pelo Shiki (nenhum JS extra no cliente) e é dela que sai o selo discreto de
   linguagem no canto do bloco. Cerca sem linguagem sai sem cor e sem selo, que é justamente o
   que se quer em diagrama ASCII e pseudo-fórmula.

4. **Ligue o artigo:** o import do `.mdx` em `content/topicos/artigos.ts`, a lista dos `## h2`
   em `export const sumario` no `index.ts` do tópico, e `status: "ready"`.

5. **Cite o tópico num roadmap**, se ele pertencer a algum percurso: em
   `content/roadmaps/<slug>.ts`, dentro do grupo certo, `{ topic: "kadane" }`. Pode citar em
   quantos quiser.

## Tópicos e roadmaps: uma relação só

Um tópico **não tem casa**. Ele existe sozinho, em `content/topicos/<slug>/`, e publica sempre a
mesma página canônica: `/topicos/<slug>/`. Um roadmap é uma **curadoria**: um nome, um objetivo e
a ordem em que ele **cita** tópicos.

```ts
// content/roadmaps/bancos-de-dados.ts
groups: [
  { id: "indices", name: "Índices", topics: [
    { topic: "hash-table" },   // o mesmo tópico dos Fundamentos, outra pergunta
    { topic: "b-tree" },
  ]},
]
```

Um tópico pode ser citado por **nenhum** roadmap, por um ou por seis, e não muda por causa disso.
Isso é o que permite a Tabela Hash responder "como guardo e busco por chave" nos Fundamentos e
"por que o índice do meu banco é assim" em Bancos de Dados, sendo a mesma página.

**Os Fundamentos são um roadmap como os outros** (`content/roadmaps/fundamentos.ts`,
`/roadmaps/fundamentos/`). O que eles têm de próprio é o lugar: a home abre neles, a barra do topo
lhes dá item, e a vitrine dos extras os deixa de fora.

Na tela: quem lê **dentro** de um roadmap tem o menu dele, o anterior/próximo dele, e até as
citações do artigo reescritas para ele — clicar numa referência no meio do texto não tira ninguém
do percurso. Quem chega pela **página canônica** vê, na barra, os roadmaps que citam aquele
tópico, e a banda "Este tópico faz parte de" no fim.

O vocabulário é fixo: **Fundamentos** é o roadmap principal, **roadmap** é um percurso,
**tópico** é uma página. Nos identificadores: `Roadmap`, `Topic`, `Citacao`.

### Rotas

```
/roadmaps/                   a vitrine dos roadmaps
/roadmaps/<r>/               a abertura de um roadmap  (os Fundamentos: /roadmaps/fundamentos/)
/roadmaps/<r>/<topico>/      um tópico servido DENTRO dele (canonical → /topicos/<slug>/)
/topicos/                    o índice completo, com busca e filtros
/topicos/<slug>/             a página canônica de um tópico
```

`/plural` é a lista e `/plural/<id>` é o item, como numa API REST. As rotas antigas continuam
valendo por **301** (`public/_redirects`): `/topico/*`, `/fundamentos/*` e `/roadmap`.

### O que o código já cobra por você

No `npm run build`, direto do import de `content/roadmaps/index.ts`:

- **slug único no site inteiro** entre as três casas (citação não conta, porque citar é
  justamente não reivindicar);
- **id de grupo único** (é chave de React e âncora de `/fundamentos/#<id>`);
- **citação que resolve**: citar um slug inexistente sumiria da lista em silêncio;
- **sem tópico repetido** no mesmo roadmap, que daria duas caixas de progresso para o mesmo slug;
- **pré-requisito que existe**.

E no `npm test`: `todo arquivo de content/roadmaps/ está registrado no índice`. O índice é uma
lista à mão (o módulo é importado por componente de cliente, e código de cliente não tem `fs`),
então é o teste que impede um arquivo criado e não registrado de virar um roadmap invisível.

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
