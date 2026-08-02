import { defineConfig, devices } from "@playwright/test";

// Testes leves de fumaça: navegação e links funcionando. Sobem o dev server
// automaticamente. Rode com `npm test`.
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Testa o artefato real (SSG em ./out), não o dev server. Rode `npm run build`
  // antes de `npm test` (ou use o script combinado).
  webServer: {
    command: "python3 -m http.server 3000 --directory out",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
