# CLAUDE.md — direções para agentes

Guia para qualquer agente (Claude e afins) trabalhando neste repositório. Leia antes de editar.
Documentação para humanos fica no [README](./README.md) e no [CONTRIBUTING](./CONTRIBUTING.md).

## O projeto

**Roadmap DSA** — o maior guia **visual e gratuito** de Algoritmos e Estruturas de Dados em
português, feito **pela comunidade Craft & Code Club**. Cada tópico tem: algoritmo rodando passo
a passo (visualizador), artigo, vídeo, problemas (LeetCode/GeeksforGeeks) e referências.

- Domínio: `https://dsa.craftcodeclub.io`. Repo: `craft-code-club/roadmap-dsa`.
- Licença: **dupla**. Código sob **MIT** (open source, uso comercial permitido); conteúdo
  didático sob **CC BY-NC-SA 4.0**. A fronteira **não é por diretório** — ela atravessa
  arquivos: num visualizador, o componente é código e as strings didáticas (notas de passo,
  Python da tela, rótulos que explicam) são conteúdo. Regra completa e exemplos em
  [`LICENSE`](./LICENSE) e [`LICENSE-CONTENT`](./LICENSE-CONTENT). Contribuições entram sob a
  licença correspondente ao que a mudança toca.

## Stack e comandos

- **Next.js 16 (App Router) + React 19**, export estático (`output: "export"` → `out/`). Node 22+.
- Conteúdo em **MDX**. Partes interativas são ilhas `"use client"`; o resto é estático (SSG).
- Deploy: **Cloudflare Pages via Wrangler** (ver seção Deploy e `.github/workflows/`).

```bash
npm run dev      # desenvolvimento
npm run build    # DEVE passar (gera ./out). 55+ páginas.
npm test         # Playwright (roda contra o ./out via python http.server). DEVE passar.
PORT=3101 npm test   # porta alternativa: obrigatório quando há mais de uma suíte na máquina
```

## Verificação (faça sempre)

1. Depois de mudar código, rode `npm run build` **e** `npm test`. Os dois têm que passar.
   A suíte **não reusa** servidor que já esteja na porta: reusar fazia ela testar o `out/` de
   outro worktree (ou o dev server, que serve da fonte) e **passar verde com código quebrado**.
   Porta ocupada agora falha dizendo isso; use `PORT=<outra> npm test`.
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

- **`content/fundamentos.ts` é a fonte única dos FUNDAMENTOS**, a sequência principal (dirige o
  menu lateral, o `/fundamentos/`, as tags e o SEO). `content/` fica na raiz, irmão de `src/`:
  `src/` é o código de estrutura, `content/` são os dados, artigos e visualizadores. Agrupamento
  estilo LeetCode (16 grupos): cada estrutura junto das técnicas que operam sobre ela; paradigmas
  (Recursão, Backtracking, Programação Dinâmica, Greedy Algorithms) como grupos próprios.
- **`content/roadmaps/` é a casa dos roadmaps extras**, um arquivo por roadmap
  (`content/roadmaps/<slug>.ts`), com `index.ts` guardando o modelo, o registro e os derivados
  das três casas. **`content/avulsos.ts`** guarda os tópicos que se bastam numa página só.
  O índice é uma lista à mão porque o módulo é importado por componente de cliente (o `Shell`
  decide a barra lateral com ele) e código de cliente não tem `fs`; quem impede que ela envelheça
  é o teste `todo arquivo de content/roadmaps/ está registrado no índice`, que lê a pasta.
- **Vocabulário, e ele importa:** *Fundamentos* é a sequência principal; *roadmap* é um percurso
  extra; *tópico* é uma página. "Trilha" e "curso" não existem mais no produto nem no código
  (só sobrou "Trilha de navegação", que é o nome do breadcrumb).
- **A página canônica de um tópico é sempre `/topicos/<slug>/`**, venha ele de onde vier. Quem
  precisa de todos os tópicos do site (`generateStaticParams`, sitemap, guarda de datas) usa
  `SITE_TOPICS`; quem fala dos Fundamentos (progresso, barra lateral, números da home) usa
  `ALL_TOPICS`. Trocar um pelo outro não dá erro — dá número errado na home ou 404 num tópico.
- **UM TÓPICO PODE ESTAR EM MAIS DE UM ROADMAP.** O grupo de um roadmap aceita um `Topic` escrito
  ali (ele é o DONO) ou uma `string` com o slug (ele só CITA). O dono decide a casca da página
  canônica e reivindica o slug; quem cita ganha o tópico na lista e uma URL própria
  (`/roadmaps/<r>/<topico>/`) com `canonical` de volta para `/topicos/<slug>/` e fora do sitemap.
  Exemplos vivos: `content/roadmaps/caminhos-minimos.ts` cita 6 tópicos e não tem nenhum
  próprio (todos são dos Fundamentos, em outra ordem); a Skip List não é citada por roadmap
  nenhum e por isso abre sem barra lateral.
  O **namespace é global e o build cobra**: slug de tópico, id de grupo, slug de roadmap, citação
  que resolve e tópico não repetido são conferidos no import de `content/roadmaps/index.ts`.
  Como escolher a casa de um tópico novo: ver a tabela em
  [README](./README.md#fundamentos-roadmap-ou-tópico-avulso-onde-o-tópico-mora).
- **Identificadores em inglês; qualquer coisa que o aluno lê em português.** Vale para os
  campos do roadmap **e para o código dos visualizadores** (variáveis, tipos, props, funções).
  Comentários podem ser em português; nome de componente, o que fizer sentido. A fronteira que
  já mordeu: o código Python que aparece na tela, os rótulos das variáveis e as notas do passo a
  passo são **conteúdo didático**, mesmo dentro de uma string — renomear em lote traduz o
  identificador e estraga a aula junto ("O array precisa estar sorted"). Detalhes e o
  procedimento de conferência em [`content/visualizers/README.md`](content/visualizers/README.md) §0.
- **O tópico não tem casa.** Cada um é uma pasta com **dois arquivos**:
  `content/topicos/<slug>/index.ts` (o dado: `topico`, o `sumario` do artigo e a `pratica`) e
  `content/topicos/<slug>/artigo.mdx` (o texto). Um terceiro arquivo ali reprova no teste: quando
  o peso obriga a separar, quem separa é o REGISTRO, não a pasta.
- **Os roadmaps CITAM tópicos**, em `content/roadmaps/<slug>.ts`, por
  `topics: [{ topic: "hash-table" }]`. Um tópico pode ser citado por nenhum, por um ou por seis; o
  tópico não muda por isso e não sabe quem o cita. Os Fundamentos são um roadmap como os outros.
- **Três registros à mão**, porque `content/topicos/index.ts` é importado por componente de
  cliente (a barra lateral) e cliente não tem `fs`:
  `content/topicos/index.ts` (os tópicos), `content/topicos/artigos.ts` (os `.mdx`) e
  `content/topicos/pratica.ts` (problemas e referências). Os dois últimos **só o servidor
  importa**, e é isso que mantém 2,1 MB de artigo e 64 KB de problema fora de toda página.
  Esqueceu de registrar? O arquivo fica na pasta e o site não o serve — quem cobra é
  `tests/roadmaps.spec.ts`, que lê o diretório e compara nos dois sentidos.
- **Os TIPOS moram em `src/content/tipos.ts`**, não em `content/`. Na raiz, `content/` é só
  conteúdo; o modelo é código. Um tópico novo importa `Topic` de `@/content/tipos`.
- Campos do tópico: `name`, `group`, `level`, `description`, `youtube` (id), `article` (link do
  blog), `extraVideos`, `viz`, `noViz`, `status: "ready" | "soon"`. O `group` é o **assunto**
  ("Arrays e Strings"), não um endereço — quem dá endereço é o roadmap que cita. Dois tópicos com
  o mesmo assunto têm de escrevê-lo **igual**: duas grafias viram duas seções em `/topicos/` com o
  mesmo título e o mesmo `id` de âncora (já aconteceu, e a lista passou a duplicar linhas).
- **"Em breve" é só para tópico vazio.** `isEmptyTopic()` (em `content/topicos/index.ts`) = `soon`
  sem `youtube`, `article` nem `viz`. **`extraVideos` NÃO entra na conta**, de propósito e com a
  razão escrita no código: são links para resoluções soltas de exercício, e um tópico que só tem
  isso continua sem aula, sem texto e sem visualização. (A doc já disse o contrário do código
  aqui; quem vale é o código.) Só os vazios levam o selo "em breve" no menu lateral e
  o `noindex`; quem já tem qualquer material aparece normal. Tópico que nunca vai ter visualizador
  recebe `noViz: true` e deixa de mostrar o aviso de "visualização em construção".
- **"NOVO" é tag manual, não data.** O selo do menu lateral vem de `isNew: true` no tópico. Quem
  publica um tópico põe a tag no mesmo PR **e tira a dos anteriores** — sem data, nada envelhece
  sozinho. Não derive o selo de outro campo (já foi `viz`, e virava "novo" permanente).
- **Código no MDX: sempre com linguagem na cerca** (` ```python `). O Shiki roda no build (plugin
  rehype em `next.config.ts`) e o HTML já sai colorido: zero JS de highlight no cliente, SSG
  intacto. A cerca também alimenta o selo discreto de linguagem no canto do bloco, montado em
  `mdx-components.tsx` (mapa `LINGUAGENS`). Cerca **sem** linguagem fica sem cor e sem selo, o que
  é o certo para diagrama em ASCII e pseudo-fórmula. Linguagem nova precisa entrar em duas listas:
  `langs` (`next.config.ts`) e `LINGUAGENS` (`mdx-components.tsx`).
- Visualizadores ficam em `content/visualizers/` (ex.: `SlidingWindowVisualizer`,
  `TwoPointersVisualizer`), expostos em `mdx-components.tsx`. A lista de apoiadores fica em
  `src/app/apoie/apoiadores.ts` (página fixa, não é conteúdo de DSA).
- **Vai mexer na casca de um visualizador (altura, expandido, teclado, foco, rolagem)?
  Leia [`content/visualizers/README.md`](content/visualizers/README.md) antes.** Ele é o
  contrato da casca adaptativa (`.viz-fit`): as três camadas (comprimir antes de esconder),
  a decisão por medição em vez de breakpoint, a API de CSS, o contrato de teclado e foco do
  painel expandido, e as armadilhas já medidas.
  A mecânica é um hook, **`src/lib/visualizer.tsx`** (`useVisualizer` + `VizHeader` e `VizFooter`): chame, espalhe as props e use os componentes prontos — não reescreva.
  Ele cobre o que TODO visualizador tem (caber na tela, painel, bloco que mostra e
  oculta, controles de reprodução) e nada do que cada um mostra. Uso de referência: `BigOCounterVisualizer.tsx`.
  **Não edite o bloco `viz-fit` do `globals.css` para acomodar um visualizador
  específico** — ele é compartilhado por todos.
- Alias: `@/*` → `src/*`, `@content/*` → `content/*`.
- **Adicionar tópico/visualizador:** ver README (seções "Como adicionar"). O padrão de
  visualizador é gerador puro de passos + casca compartilhada + botão Expandir.

## Navegação e links

- **`src/lib/links.ts` é ponto único.** Comunidade = `LINKS.site` (craftcodeclub.io); repo =
  `LINKS.github` (`craft-code-club/roadmap-dsa`); apoio = `LINKS.apoiar` (campanha na APOIA.se).
- **Discord tem duas portas, por design.** *Dentro do app*: `LINKS.discord`, convite direto, um
  clique só. *Fora do app* (README, CONTRIBUTING, SECURITY, templates do `.github/`, qualquer
  `.md`): `https://craftcodeclub.io/join`, que é o ponto de rotação da comunidade. Nunca cole
  `discord.gg/<código>` cru em arquivo de documentação.
- Barra: **esquerda** = Início, Fundamentos, Roadmaps, Tópicos; **direita** = YouTube, Discord,
  Apoiar + menu `⋯`. O menu `⋯` tem: Sobre o projeto, Craft & Code Club, GitHub do projeto,
  Apoiadores e Parceiros (e, só no mobile, os quatro da esquerda + YouTube).
- **Um tópico tem DUAS URLs, e elas não competem.** `/topicos/<slug>/` é a **canônica**: quem chega
  pelo índice geral, sem percurso, e vê na barra os roadmaps que citam o tópico.
  `/roadmaps/<r>/<slug>/` é a mesma página dentro de um percurso: menu do roadmap, anterior/próximo,
  e as **citações do artigo reescritas** para o roadmap (`linkDentroDoRoadmap`), para o leitor não
  cair fora dele ao clicar numa referência. Toda cópia aponta `canonical` para a canônica e fica
  fora do sitemap.
- **A casca muda com a rota, e é o `Shell` que decide** (`layoutDaRota`): a barra do roadmap em
  `/roadmaps/<slug>/` e em tudo abaixo dele, a barra dos roadmaps-que-citam em `/topicos/<slug>/`,
  e **nenhuma barra** na vitrine `/roadmaps/`, no índice `/topicos/` e nos tópicos que ninguém cita. A ausência é a decisão,
  não um esquecimento: num tópico avulso a barra ao lado seria uma lista para lugar nenhum.
  ⚠️ O `layoutDaRota` casa o PRIMEIRO SEGMENTO da rota por string. Renomeou rota? Aquele `if` não
  quebra o build nem o tipo: ele silenciosamente devolve a casca padrão, e o roadmap inteiro passa
  a abrir com a barra dos Fundamentos. Mexeu no `Shell` ou numa rota? Rode
  `tests/roadmaps.spec.ts`, que é quem mede as cascas — foi ele que pegou exatamente isso.
- **Rota renomeada leva 301 no mesmo PR**, em `public/_redirects`: hoje `/topico/*` →
  `/topicos/*`, `/fundamentos/*` e `/roadmap*` → `/roadmaps/fundamentos/*`. E a rota de origem
  **não pode existir como arquivo no `out/`**, senão o Pages serve o arquivo e a regra nunca roda.
- Links **externos** mostram `↗` (classe `ext`; a regra CSS é `.topnav > a.ext` para não afetar o
  menu). Bolinhas de marca: Discord blurple, YouTube vermelho, Apoiar âmbar.

## SEO

- `sitemap.ts`, `robots.ts` e `opengraph-image.tsx` existem. **Rotas de metadata precisam de
  `export const dynamic = "force-static"`** por causa do `output: "export"`.
- Tópicos realmente vazios (`soon` sem youtube, article nem viz) recebem `noindex`
  (ver `generateMetadata` em `topico/[slug]/page.tsx`). Ao ganhar conteúdo, saem do noindex sozinhos.
- **A mesma régua vale um nível acima:** a abertura de um roadmap sem NENHUM tópico com material
  também é `noindex` e fica fora do sitemap (`roadmapHasMaterial`). Ela continua no site (mapear
  o território vale para quem estuda), mas não pede lugar no índice.
- **`/roadmaps/<r>/<topico>/` serve o mesmo texto de `/topicos/<slug>/`**, então ela aponta
  `canonical` (e `og:url`) para a canônica, fica FORA do sitemap e não emite JSON-LD nenhum: quem
  declara o recurso é a canônica, e declarar de novo numa página que acabou de dizer "a principal
  é outra" é a mesma contradição do `noindex` com `LearningResource`.
- O rastro de navegação tem **quatro formas** (Fundamentos, roadmap, avulso, e o tópico dentro de
  um roadmap) e a página monta o array de migalhas UMA vez, usando-o nos links e no
  `BreadcrumbList`. Não recrie a decisão dentro do `jsonld.ts`: o teste "o rastro marcado é o
  rastro desenhado" existe por causa disso.

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
`CLOUDFLARE_PROJECT_NAME` (e, para apoiadores, `APOIASE_KEY` / `APOIASE_SECRET` /
`APOIASE_CAMPAIGN`).

**Credencial da APOIA.se: três nomes, e nenhum é intercambiável.** `APOIASE_KEY` vai no header
`x-api-key`, `APOIASE_SECRET` no `Authorization: Bearer` (é um JWT) e `APOIASE_CAMPAIGN` é o id da
campanha. Sem os dois primeiros, o muro de `/apoie` sai da lista de plano B de
`src/app/apoie/apoiadores.ts` **e o build avisa no log** — o `return` calado dessa mesma linha é o
que fez a página publicada mostrar 3 apoiadores com 5 apoios na campanha, por meses, sem nada
denunciar. A varredura que prova que credencial nenhuma chega ao `out/` é
`tests/segredo-nao-vai-para-o-cliente.spec.ts`; ela lê os 1.242 arquivos do build, HTML, chunks e
payload RSC, e entra com 0 ocorrência em 16 regras.

## Analytics

- **Google Analytics 4 é opt-in por ambiente.** `src/components/Analytics.tsx` só renderiza o
  `GoogleAnalytics` do `@next/third-parties` quando `NEXT_PUBLIC_GA_ID` existe; sem a variável ele
  devolve `null` e nenhum byte do gtag.js é pedido. O workflow injeta o ID **só no build da `main`**
  (é uma *variable*, `vars.NEXT_PUBLIC_GA_ID`, não um secret: o ID sai no HTML de toda página).
  Preview de PR, build de fork e `npm run dev` ficam sem analytics — de propósito, para não sujar a
  propriedade nem medir o desenvolvedor.
- Não troque o componente do `@next/third-parties` por um `<script>` na mão: o snippet do Google é
  síncrono e bloqueia o parser; o componente usa `next/script` com `afterInteractive` e cuida da
  deduplicação entre navegações client-side do App Router.
- **Google Search Console: a verificação é por DNS**, propriedade de *domínio*, com TXT no
  Cloudflare — não depende de deploy nem de arquivo no `out/`. `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
  (que vira `metadata.verification.google` no layout) é o plano B para quem só tem propriedade de
  prefixo de URL. As duas variáveis estão documentadas no `.env.example`.

## Git e CI

- **Conventional Commits** (`feat`, `fix`, `docs`, `ci`, `chore`, ...). Commits atômicos. Ver
  CONTRIBUTING para o padrão completo.
- Não commite `node_modules`, `out`, `.next`, prints (`/screenshots/`) — o `.gitignore` cobre.
- CI: `tests.yml` (Playwright), `cloudflare-pages-deploy.yml` (deploy fork-guarded; secrets
  `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_PROJECT_NAME`), `commitlint.yml`
  (Conventional Commits nos PRs), `codeql-analysis.yml` (só roda quando o repositório for público).
