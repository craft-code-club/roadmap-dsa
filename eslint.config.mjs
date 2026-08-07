// ESLint deste repositório — flat config.
//
// POR QUE ELE EXISTE
// ------------------
// Até aqui não havia lint nenhum: `grep -c '"eslint' package-lock.json` dava 0,
// sem config, sem dependência, sem script e sem passo de CI. E havia um
// `// eslint-disable-next-line react-hooks/exhaustive-deps` em
// `src/components/Shell.tsx:102` suprimindo uma regra que ninguém executava —
// uma diretiva órfã, que não podia estar certa nem errada.
//
// A família de regra que importa aqui é `react-hooks`. O produto são 87
// componentes cheios de `useEffect`/`useCallback`, e a memória do projeto já
// tem um bug dessa família ("clique perdido ao avançar passo": o handler lia
// `idx` do closure e engolia clique). O repositório é público e recebe PR da
// comunidade, então o lint é a primeira leitura que um PR de fora recebe.
//
// A REGRA DE CALIBRAGEM
// ---------------------
// Lint que chega vermelho em toda parte é desligado na semana seguinte, e aí
// vale menos que não ter. O passivo foi MEDIDO antes de escolher severidade:
// 18 erros e 4 avisos em 13 dos 157 arquivos, com a config padrão do
// `eslint-config-next`. Cada desvio do padrão abaixo tem o motivo escrito, e o
// que ficou de fora está declarado no PR em vez de prometido.
import next from "eslint-config-next";

export default [
  {
    ignores: [
      "out/**",
      ".next/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      // Fixtures do guarda de idioma: são código TSX escrito para estar errado.
      "scripts/fixtures-guarda-idioma/**",
    ],
  },

  ...next,

  {
    name: "roadmap-dsa/calibragem",
    rules: {
      // A regra pega `>`, `}`, `"` e `'` soltos no texto JSX. Os dois primeiros
      // são sinal de JSX quebrado; as aspas, no conteúdo deste site, são
      // pontuação legítima em português. "Consertar" as 8 ocorrências
      // (`BinarioFaixa.tsx:200`, `NAryTreeVisualizer.tsx:339` e `:342`) seria
      // reescrever TEXTO DE TELA como entidade HTML, que é exatamente o que o
      // guarda de idioma existe para impedir. Fica a parte que acusa defeito.
      "react/no-unescaped-entities": ["error", { forbid: [">", "}"] }],

      // Conselho do React Compiler ("Compilation Skipped"), e o React Compiler
      // não está ligado neste projeto: não há `reactCompiler` no
      // `next.config.ts`. Regra sobre um otimizador que não roda é ruído.
      "react-hooks/preserve-manual-memoization": "off",

      // Regra do Pages Router: a mensagem fala em `pages/_document.js`. Aqui a
      // fonte é declarada no `src/app/layout.tsx`, que é o layout raiz do App
      // Router e vale para todas as rotas — o problema que a regra descreve
      // não existe nesta arquitetura.
      "@next/next/no-page-custom-font": "off",

      // Fica em AVISO, não em erro, e é uma decisão de escopo declarada.
      // São 8 ocorrências reais, todas em efeito que sincroniza estado externo
      // na montagem (localStorage, medição de layout): `Shell.tsx:100`, `:115`,
      // `:139`, `visualizer.tsx:213` e `:235`, `ProgressProvider.tsx:73`,
      // `BigOChartVisualizer.tsx:111`, `HeapIndicesVisualizer.tsx:75`. Três
      // desses arquivos estão sendo reescritos em PRs abertos agora; subir para
      // erro pintaria os três de vermelho num defeito que não é deles.
      "react-hooks/set-state-in-effect": "warn",

      // É a família que já virou bug neste repositório. Sobe para ERRO, que é o
      // ponto de ter lint: código novo não entra com dependência faltando.
      "react-hooks/exhaustive-deps": "error",
    },
  },

  {
    // Arquivo de configuração exporta objeto anônimo por definição.
    name: "roadmap-dsa/configs",
    files: ["*.config.mjs", "*.config.js", "*.config.ts"],
    rules: { "import/no-anonymous-default-export": "off" },
  },

  {
    // DÍVIDA DECLARADA, com endereço e conserto conhecido.
    // `BinarioTresFormas.tsx:63` declara `const FORMAS: Forma[] = [...]` DENTRO
    // do componente e o usa no `useMemo` da linha 80, cujo array de dependência
    // é só `[valor]`. O array é recriado a cada renderização; hoje o conteúdo é
    // constante e o defeito é latente, e o conserto é subir o `FORMAS` para o
    // escopo do módulo. É mudança em `content/`, que pertence a outro PR — a
    // exceção sai junto com ele.
    name: "roadmap-dsa/divida-exhaustive-deps",
    files: ["content/visualizers/BinarioTresFormas.tsx"],
    rules: { "react-hooks/exhaustive-deps": "warn" },
  },
];
