# Contribuindo

Adoraríamos a sua ajuda para tornar o **Roadmap DSA** ainda melhor! É um projeto
**gratuito e open source**, feito pela comunidade
[Craft & Code Club](https://craftcodeclub.io), para a comunidade: o código e o
conteúdo estão todos aqui, e qualquer pessoa pode ler, estudar, adaptar e
propor mudança. Este guia explica como contribuir com o mínimo de atrito.

Ficou com dúvida em qualquer ponto? Chama a gente no
[Discord](https://craftcodeclub.io/join), é o jeito mais rápido de destravar.

- [Código de Conduta](#codigo-de-conduta)
- [Como rodar o projeto](#como-rodar)
- [Adicionar ou completar um tópico](#adicionar-topico)
- [Adicionar um visualizador](#adicionar-visualizador)
- [Passos gerais (fork e PR)](#passos-gerais)
- [Commits e Pull Requests](#commits-e-prs)
  - [Conventional Commits](#conventional-commits)
- [Testes](#testes)
- [CI e Pull Requests de forks](#ci-forks)
- [Licença](#licenca)


## <a name="codigo-de-conduta"></a> Código de Conduta

Leia e siga o nosso [Código de Conduta](./CODE_OF_CONDUCT.md).


## <a name="como-rodar"></a> Como rodar o projeto

Requer **Node.js 22+**.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # gera o site estático em ./out (SSG)
npm run serve    # serve o ./out localmente
npm test         # testes de navegação (Playwright)
```

Stack: **Next.js 16 (App Router) + React 19**, export estático (`output: "export"`),
conteúdo em **MDX**. As partes interativas (visualizadores, checkboxes de
progresso) são ilhas client; o resto é estático.


## <a name="adicionar-topico"></a> Adicionar ou completar um tópico

O conteúdo mora em `content/`, na raiz do projeto (irmão de `src/`, que guarda
só o código de estrutura). Os **nomes dos campos são em inglês**; os valores
exibidos ficam em português.

1. **Índice** — em `content/roadmap.ts`, adicione (ou edite) o tópico no grupo
   certo. Só isso já coloca o tópico no menu e no roadmap. Campos úteis:
   `youtube` (id do vídeo), `article` (link do artigo no blog), `extraVideos`
   (mais vídeos), `references` (leituras), `problems` (LeetCode/GeeksforGeeks)
   e `viz` (visualizador).

   ```ts
   { slug: "kadane", name: "Kadane", group: "Arrays e Strings",
     level: "Médio", status: "soon", youtube: "VIDEO_ID",
     description: "Maior soma contígua, o clássico." }
   ```

   O selo **"NOVO"** do menu lateral é uma tag manual: `isNew: true`. Como não
   tem data, ele não sai sozinho — marque o tópico que você está publicando e
   **tire a marca dos anteriores** no mesmo PR.

2. **Artigo** — para virar `status: "ready"`, crie `content/topics/<slug>.mdx`.
   Dentro do MDX já dá para usar, sem importar: `<Callout>`, `<Colunas>`,
   `<Cartao>` e os visualizadores (ver `mdx-components.tsx`).

   **Sempre declare a linguagem na cerca do bloco de código** (` ```python `). O
   destaque de sintaxe é gerado no build (Shiki), não no navegador, e é a cerca
   que também põe o selo discreto de linguagem no canto do bloco. Cerca sem
   linguagem fica sem cor e sem selo: é o certo para diagrama em ASCII.

3. **Ligue o artigo** — registre em `content/topics/index.ts` e mude o `status`
   para `"ready"` em `content/roadmap.ts`. No registro vão o componente e o
   `summary`, que alimenta o índice "Nesta página" e precisa repetir os títulos
   `h2` do artigo **no texto exato**:

   ```ts
   "kadane": {
     Body: Kadane,
     summary: ["O problema", "A ideia, em uma frase", "Por que funciona"],
   },
   ```

**Sem travessão:** na copy do site, use pontuação simples (vírgula, ponto, dois
pontos), nunca o caractere `—`.


## <a name="adicionar-visualizador"></a> Adicionar um visualizador

Os visualizadores ficam em `content/visualizers/`. O padrão vive em
`SlidingWindowVisualizer.tsx` e `TwoPointersVisualizer.tsx`: um **gerador puro
de passos** + a mesma casca de UI (células, código sincronizado, painel de
variáveis, controles e o botão **Expandir**). Para uma técnica nova:

1. Copie o componente, troque `gerarPassos` e a constante `CODIGO`.
2. Exponha-o em `mdx-components.tsx`.
3. Use no `.mdx` do tópico: `<MeuVisualizador />`.

A **casca** — como a peça se adapta à altura da tela, o que fica parado e o que
rola no modo expandido, e o que o teclado faz ali dentro — não se escreve à mão:
ela vem do hook `useVisualizer` (`src/lib/visualizer.tsx`), com `VizHeader` e
`VizFooter`. O contrato está em
[`content/visualizers/README.md`](content/visualizers/README.md), com o uso, as
opções e as armadilhas já medidas. Leia antes de mexer nela.

**Idioma do código: identificador em inglês, tela em português.** Variáveis,
tipos, campos e props em inglês; tudo que o aluno lê em português. Comentário em
português quando explicar melhor, e o nome do componente como fizer sentido.

Repare que a fronteira não é o arquivo, é a string: o trecho de código que
aparece **na tela** do visualizador, os rótulos das variáveis e as notas do
passo a passo são conteúdo didático em português, mesmo morando dentro do
`.tsx`. Renomear em lote traduz a aula junto — já produziu "O array precisa
estar *sorted*" aqui. O procedimento para conferir isso está no §0 do contrato.


## <a name="passos-gerais"></a> Passos gerais (fork e PR)

1. Veja se já existe uma issue aberta sobre o assunto.
2. Abra uma issue para discutir mudanças maiores.
3. Faça um fork do repositório.
4. Crie sua branch: `git checkout -b feat/minha-melhoria`.
5. Faça commits atômicos (veja Conventional Commits abaixo).
6. `git push origin feat/minha-melhoria`.
7. Abra um Pull Request.


## <a name="commits-e-prs"></a> Commits e Pull Requests

- ✅ **FAÇA** commits atômicos, para facilitar a revisão.
- ✅ **FAÇA** PRs pequenos e focados.
- ✅ **FAÇA** commits no padrão Conventional Commits.
- ❌ **EVITE** quebrar o build da integração contínua.


### <a name="conventional-commits"></a> Conventional Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/pt-br/). Um
workflow de CI (`commitlint`) valida as mensagens em cada Pull Request, então
vale seguir o padrão desde o primeiro commit.

**Formato:**

```
<tipo>(<escopo opcional>): <resumo no imperativo>

<corpo opcional: explica o porquê da mudança, não o como>

<rodapé opcional: BREAKING CHANGE, referência a issue>
```

**Tipos:**

| Tipo | Quando usar |
| --- | --- |
| `feat` | recurso novo para quem usa (tópico, visualizador, página) |
| `fix` | correção de bug |
| `docs` | só documentação (README, CONTRIBUTING, comentários) |
| `style` | formatação, sem mudar comportamento (espaços, ponto e vírgula) |
| `refactor` | muda o código sem corrigir bug nem adicionar recurso |
| `perf` | melhora de desempenho |
| `test` | adiciona ou ajusta testes |
| `ci` | pipelines, GitHub Actions, deploy |
| `build` | build, dependências, config do bundler |
| `chore` | manutenção que não se encaixa nas de cima |
| `revert` | reverte um commit anterior |

**Escopos sugeridos** (a área tocada): `roadmap`, `topics`, `viz`, `nav`, `ui`,
`apoie`, `home`, `seo`, `test`, `deps`, `ci`. O escopo é opcional; use quando
ajuda a localizar a mudança.

**Regras:**

- Resumo no **imperativo** e em minúsculas: "adiciona", não "adicionado" nem "Adiciona".
- Sem ponto final no resumo. Até ~72 caracteres.
- Em **português** (inglês só para os nomes técnicos consagrados, como no resto do site).
- **Um commit, uma mudança.** Commits atômicos facilitam a revisão e o revert.
- Mudança incompatível: use `feat!:` (o `!`) ou um rodapé `BREAKING CHANGE: <descrição>`.

**Exemplos:**

```
feat(roadmap): adiciona tópico de Kadane
fix(viz): corrige overflow do painel de código no mobile
refactor(apoie): puxa apoiadores da APOIA.se no build
docs: melhora o guia de contribuição
ci: valida mensagens de commit com commitlint
```

Para conferir sua última mensagem localmente, sem instalar nada:

```bash
npx --yes --package @commitlint/cli --package @commitlint/config-conventional \
  commitlint --from HEAD~1
```


## <a name="testes"></a> Testes

- ✅ **FAÇA** `npm run build` passar (o site inteiro precisa compilar).
- ✅ **FAÇA** `npm test` passar (navegação, links e âncoras).
- ✅ **CONSIDERE** adicionar um teste quando o PR resolve um bug ou adiciona algo
  navegável (nav, links, âncoras do índice).
- ℹ️ A suíte sobe um servidor estático servindo o `./out`, na porta **3000 por
  padrão** (`PORT` muda). Se a porta estiver ocupada (um `npm run dev`
  esquecido, outra suíte rodando), o Playwright **falha dizendo isso** em vez de
  testar o que está lá — rode com outra: `PORT=3101 npm test`.


## <a name="ci-forks"></a> CI e Pull Requests de forks

Por segurança, os pipelines que usam segredos (deploy no Cloudflare Pages)
**não rodam** em PRs vindos de forks. Além disso, o repositório exige
**aprovação de um admin** para rodar os workflows de PRs de colaboradores
externos (configuração de Actions do repositório). Um mantenedor vai revisar e
liberar a execução.


## <a name="licenca"></a> Licença

Ao contribuir, você concorda que a sua contribuição será licenciada sob a
**[PolyForm Noncommercial License 1.0.0](./LICENSE)** — livre para qualquer uso
**não comercial** (estudo, ensino, comunidade, outros projetos livres). Uso
comercial não é permitido.

Na prática, é o que garante que o guia siga aberto e gratuito para quem quer
aprender, sem virar produto de ninguém.
