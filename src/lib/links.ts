// Origem canônica do site (troque ao definir o domínio final).
export const SITE_URL = "https://dsa.craftcodeclub.io";

// Links da comunidade, ponto único. Trocar aqui muda o site inteiro.
// TODO o app lê `LINKS.discord`, então o convite fica numa constante só: para
// trocar/rotacionar o convite, mude apenas aqui.
export const LINKS = {
  discord: "https://discord.gg/b5NnndAbFc",
  // Destino do apoio. Ideal migrar para um Open Collective (transparente, com
  // níveis para pessoas e empresas). Placeholder por enquanto.
  apoiar: "https://www.buymeacoffee.com/craftcodeclub",
  github: "https://github.com/craft-code-club/roadmap-dsa",
  site: "https://craftcodeclub.io",
  blog: "https://craftcodeclub.io/blog",
  clubeDoLivro: "https://craftcodeclub.io/book-clubs/designing-data-intensive-applications",
  eventos: "https://craftcodeclub.io/events",
  youtube: "https://www.youtube.com/@CraftCodeClub",
} as const;

export const ytEmbed = (id: string) => `https://www.youtube-nocookie.com/embed/${id}`;
export const ytWatch = (id: string) => `https://www.youtube.com/watch?v=${id}`;
