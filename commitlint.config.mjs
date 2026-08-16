// Validação das mensagens de commit (Conventional Commits).
// Roda na CI a cada Pull Request (.github/workflows/commitlint.yml).
// Doc do padrão: CONTRIBUTING.md > Conventional Commits.
export default {
  extends: ["@commitlint/config-conventional"],
  // O Dependabot fica de fora, e só ele.
  //
  // O título dele é gerado pelo bot e passa dos 72 caracteres sozinho
  // ("build(deps): bump the npm_and_yarn group across 1 directory with 2
  // updates" tem 74). Não é texto que alguém escreveu mal: é o formato do
  // GitHub, e ele não muda porque o nosso teto é 72. Sem esta isenção, TODO
  // bump agrupado nasce reprovado, e a CI vermelha vira paisagem — que é o
  // jeito mais rápido de o commitlint parar de significar alguma coisa.
  //
  // O recorte é estreito de propósito: só `build(deps)` e `build(deps-dev)`,
  // que é o que o Dependabot emite. Commit de gente continua sob todas as
  // regras, inclusive o teto.
  ignores: [(mensagem) => /^build\(deps(-dev)?\):/.test(mensagem)],
  rules: {
    // Rodapés costumam ter URLs longas (refs, co-autoria); não limitamos linha.
    "body-max-line-length": [0, "always"],
    "footer-max-line-length": [0, "always"],
    // Resumo enxuto.
    "header-max-length": [2, "always", 72],
    // Escopos sugeridos (aviso, não erro): ajudam a localizar a mudança sem
    // travar quem usa um escopo novo e legítimo.
    "scope-enum": [
      1,
      "always",
      ["roadmap", "topics", "viz", "nav", "ui", "apoie", "home", "seo", "test", "deps", "ci", "release"],
    ],
  },
};
