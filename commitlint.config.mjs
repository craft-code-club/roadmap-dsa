// Validação das mensagens de commit (Conventional Commits).
// Roda na CI a cada Pull Request (.github/workflows/commitlint.yml).
// Doc do padrão: CONTRIBUTING.md > Conventional Commits.
export default {
  extends: ["@commitlint/config-conventional"],
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
