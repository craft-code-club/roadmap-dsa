import { defineConfig, devices } from "@playwright/test";

// Testes leves de fumaça: navegação e links funcionando. Rode com `npm test`.
//
// A porta vem do ambiente porque o repositório é trabalhado em vários worktrees
// ao mesmo tempo, cada um com o seu `out/`:
//
//     PORT=3101 npm test
//
// Sem isso, duas suítes simultâneas disputam a mesma porta.
//
// A validação não é preciosismo: `Number(process.env.PORT) || 3000` engole
// `PORT=310l` (com "L") caindo no padrão em silêncio, e passa `3000.5` adiante
// para o `http.server` falhar de um jeito que não parece com o erro que é. Este
// arquivo existe justamente para trocar silêncio por erro claro.
function resolvePort(): number {
  const raw = process.env.PORT;
  if (raw === undefined || raw.trim() === "") return 3000;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new Error(
      `PORT inválida: ${JSON.stringify(raw)}. Use um inteiro entre 1 e 65535, por exemplo PORT=3101.`
    );
  }
  return n;
}

const PORT = resolvePort();
const PYTHON = process.platform === "win32" ? "python" : "python3";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  // Dois projetos, e a tag `@mobile` decide quem roda o quê.
  //
  // O projeto `chromium` continua sendo a suíte inteira, e é ele que segura os
  // 37 arquivos que já existiam. O `mobile` roda **só** o que estiver marcado
  // `@mobile` no título, num Pixel 7 de verdade (412x839, `isMobile`,
  // `hasTouch`): o `grep`/`grepInvert` abaixo é o que impede que acrescentar
  // celular dobre o tempo de CI de todo mundo.
  //
  // Custo medido em A/B, duas rodadas cada, mesma máquina:
  //
  //     só desktop (474 testes) ...... 79s, 77s
  //     os dois    (499 testes) ...... 78s, 80s
  //
  // A diferença está dentro do ruído entre rodadas. Faz sentido: o projeto
  // `mobile` sozinho leva 3,6s de tempo de teste, e os 6 workers absorvem isso.
  // Também não custa instalação: `devices["Pixel 7"]` é `defaultBrowserType:
  // "chromium"`, o mesmo navegador que o `tests.yml` já baixa.
  //
  // `isMobile` e `hasTouch` são o motivo de existir um projeto em vez de mais um
  // `page.setViewportSize({ width: 390 })`: só eles ligam a viewport visual do
  // Chromium e a consulta `@media (pointer: coarse)`, que o `globals.css` usa
  // (linha 1791). Redimensionar a janela não liga nenhum dos dois.
  //
  // Ligar e desligar:
  //
  //     npm test                                 # os dois projetos
  //     npx playwright test --project=chromium   # só desktop (desliga o celular)
  //     npx playwright test --project=mobile     # só celular
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      // Sem isto, os testes `@mobile` rodariam TAMBÉM em desktop, medindo
      // largura de celular numa janela de 1280 e reprovando por engano.
      grepInvert: /@mobile/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      grep: /@mobile/,
    },
  ],
  // Testa o artefato real (SSG em ./out), não o dev server. Rode `npm run build`
  // antes de `npm test` (ou use `npm run test:build`).
  webServer: {
    // `ThreadingHTTPServer`, e não o `python3 -m http.server` de antes, que é
    // single-thread: ele atende um pedido por vez, e uma página do Next puxa
    // dezenas de arquivos. Com a máquina carregada isso vira `page.goto`
    // estourando os 30s — em testes SORTEADOS a cada rodada, quase sempre em
    // `navegacao.spec.ts`, com `BrokenPipeError` no servidor. Três adaptações
    // desta série perderam tempo caçando um bug que não existia no código
    // delas. O flake é do servidor de teste; o `out/` servido é o mesmo.
    command: `${PYTHON} -c "from functools import partial; from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler as H; ThreadingHTTPServer(('', ${PORT}), partial(H, directory='out')).serve_forever()"`,
    url: `http://localhost:${PORT}`,
    // `false` de propósito, e não `!process.env.CI` como era: reusar o servidor
    // que já está na porta faz a suíte testar o `out/` DE OUTRA PESSOA sem dizer
    // nada. Medido: com o build de outro worktree na 3000, um teste que reprova
    // no código local passa verde. Também pega o caso mais comum, que é o
    // `npm run dev` esquecido na 3000 — ele serve da fonte, não do `out/`, e
    // mascara justamente o que o build estático faz.
    // Falha alta na cara é melhor que resultado bonito e falso: se a porta
    // estiver ocupada, o Playwright avisa e você escolhe outra pelo `PORT`.
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
