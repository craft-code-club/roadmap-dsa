import { defineConfig, devices } from "@playwright/test";

// Testes leves de fumaça: navegação e links funcionando. Rode com `npm test`.
//
// A porta vem do ambiente porque o repositório é trabalhado em vários worktrees
// ao mesmo tempo, cada um com o seu `out/`:
//
//     PORT=3101 npm test
//
// Sem isso, duas suítes simultâneas disputam a mesma porta.
const PORT = Number(process.env.PORT) || 3000;

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
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Testa o artefato real (SSG em ./out), não o dev server. Rode `npm run build`
  // antes de `npm test` (ou use `npm run test:build`).
  webServer: {
    command: `python3 -m http.server ${PORT} --directory out`,
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
