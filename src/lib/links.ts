// Origem canônica do site (troque ao definir o domínio final).
export const SITE_URL = "https://dsa.craftcodeclub.io";

// Links da comunidade, ponto único. Trocar aqui muda o site inteiro.
// TODO o app lê `LINKS.discord`, então o convite fica numa constante só: para
// trocar/rotacionar o convite, mude apenas aqui.
export const LINKS = {
  discord: "https://discord.gg/b5NnndAbFc",
  // Destino do apoio: a campanha da comunidade na APOIA.se. A lista de
  // apoiadores em /apoie é puxada dessa mesma campanha no build.
  apoiar: "https://apoia.se/craftcodeclub",
  // Org pública da comunidade. Aponta para a org (e não para o repo) porque o
  // repositório ainda é privado; quando ficar público, dá para trocar pelo repo.
  github: "https://github.com/craft-code-club",
  site: "https://craftcodeclub.io",
  blog: "https://craftcodeclub.io/blog",
  clubeDoLivro: "https://craftcodeclub.io/book-clubs/designing-data-intensive-applications",
  eventos: "https://craftcodeclub.io/events",
  youtube: "https://www.youtube.com/@CraftCodeClub",
} as const;

export const ytEmbed = (id: string) => `https://www.youtube-nocookie.com/embed/${id}`;
export const ytWatch = (id: string) => `https://www.youtube.com/watch?v=${id}`;
