# Contribuindo

Adoraríamos a sua ajuda para tornar o **Roadmap DSA** ainda melhor! Feito pela
comunidade [Craft & Code Club](https://craftcodeclub.io), para a comunidade.
Este guia explica como contribuir com o mínimo de atrito.

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

1. **Índice** — em `src/content/roadmap.ts`, adicione (ou edite) o tópico no
   grupo certo. Só isso já coloca o tópico no menu e no roadmap. Campos úteis:
   `youtube` (vídeo), `artigo` (link do blog), `videosExtras` (mais vídeos),
   `referencias` (artigos), `problemas` (LeetCode/GeeksforGeeks), `viz`.

   ```ts
   { slug: "kadane", nome: "Kadane", grupo: "Arrays e Strings",
     nivel: "Médio", status: "soon", youtube: "VIDEO_ID",
     descricao: "Maior soma contígua, o clássico." }
   ```

2. **Artigo** — para virar `status: "ready"`, crie `src/content/topics/<slug>.mdx`.
   Dentro do MDX já dá para usar, sem importar: `<Callout>`, `<Colunas>`,
   `<Cartao>` e os visualizadores (ver `mdx-components.tsx`).

3. **Ligue o artigo** — registre em `src/content/topics/index.ts` e mude o
   `status` para `"ready"` em `roadmap.ts`.

**Sem travessão:** na copy do site, use pontuação simples (vírgula, ponto, dois
pontos), nunca o caractere `—`.


## <a name="adicionar-visualizador"></a> Adicionar um visualizador

O padrão vive em `src/components/JanelaVisualizer.tsx` e
`src/components/DoisPonteirosVisualizer.tsx`: um **gerador puro de passos** +
a mesma casca de UI (células, código sincronizado, painel de variáveis,
controles e o botão **Expandir**). Para uma técnica nova:

1. Copie o componente, troque `gerarPassos` e a constante `CODIGO`.
2. Exponha-o em `mdx-components.tsx`.
3. Use no `.mdx` do tópico: `<MeuVisualizador />`.


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

Padrão: `<tipo>(<escopo>): <resumo>`. Saiba mais em
[conventionalcommits.org](https://conventionalcommits.org/).

Tipos comuns: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `build`,
`test`, `ci`, `chore`, `revert`.

Exemplos:
```
feat(roadmap): adiciona tópico de Kadane
fix(viz): corrige overflow do painel de código no mobile
docs: melhora o guia de contribuição
```


## <a name="testes"></a> Testes

- ✅ **FAÇA** `npm run build` passar (o site inteiro precisa compilar).
- ✅ **FAÇA** `npm test` passar (navegação, links e âncoras).
- ✅ **CONSIDERE** adicionar um teste quando o PR resolve um bug ou adiciona algo
  navegável (nav, links, âncoras do índice).


## <a name="ci-forks"></a> CI e Pull Requests de forks

Por segurança, os pipelines que usam segredos (deploy no Cloudflare Pages)
**não rodam** em PRs vindos de forks. Além disso, o repositório exige
**aprovação de um admin** para rodar os workflows de PRs de colaboradores
externos (configuração de Actions do repositório). Um mantenedor vai revisar e
liberar a execução.


## <a name="licenca"></a> Licença

Ao contribuir, você concorda que a sua contribuição será licenciada sob a
**[PolyForm Noncommercial License 1.0.0](./LICENSE)** — livre para qualquer uso
**não comercial**. Uso comercial não é permitido.
