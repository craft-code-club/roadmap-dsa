// Origem canônica do site (troque ao definir o domínio final).
export const SITE_URL = "https://dsa.craftcodeclub.io";

// Links da comunidade, ponto único. Trocar aqui muda o site inteiro.
//
// Discord, duas portas de entrada:
//   - Dentro do app (esta constante): convite direto, um clique só, sem pulo
//     intermediário. Todo o app lê `LINKS.discord`, então rotacionar o convite
//     é mudar só esta linha.
//   - Fora do app (README, CONTRIBUTING, templates do GitHub, qualquer .md):
//     use https://craftcodeclub.io/join. Esses arquivos não têm como importar
//     a constante, e o /join é o ponto de rotação da comunidade: convite
//     revogado lá não deixa link morto espalhado pelo repositório.
export const LINKS = {
  discord: "https://discord.gg/b5NnndAbFc",
  // Destino do apoio: a campanha da comunidade na APOIA.se. A lista de
  // apoiadores em /apoie é puxada dessa mesma campanha no build.
  apoiar: "https://apoia.se/craftcodeclub",
  // Repositório do projeto: é para onde vão os "Contribua no GitHub" do site.
  github: "https://github.com/craft-code-club/roadmap-dsa",
  site: "https://craftcodeclub.io",
  blog: "https://craftcodeclub.io/blog",
  clubeDoLivro: "https://craftcodeclub.io/book-clubs/designing-data-intensive-applications",
  eventos: "https://craftcodeclub.io/events",
  youtube: "https://www.youtube.com/@CraftCodeClub",
} as const;

export const ytEmbed = (id: string) => `https://www.youtube-nocookie.com/embed/${id}`;
export const ytWatch = (id: string) => `https://www.youtube.com/watch?v=${id}`;
