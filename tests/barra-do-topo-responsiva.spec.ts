import { test, expect, type Page } from "@playwright/test";

// A barra do topo, medida largura por largura.
//
// POR QUE EXISTE
// A barra cresceu (marca com nome e subtítulo, quatro links à esquerda,
// YouTube, Discord, Apoiar e o ⋯ à direita) e tinha UM corte só, em 760px. Do
// lado de cima desse corte ela se descaracterizava, e nenhuma medição da suíte
// pegava, porque nada disso estoura a página. O que foi medido em
// `/topicos/dijkstra/`, antes:
//
//   920px  "Roadmap DSA / por Craft & Code Club" quebrava em TRÊS linhas e
//          transbordava os 60px do cabeçalho, passando por cima de "Início";
//   800px  as caixas de "Tópicos" e "YouTube" se sobrepunham 3px (23px em 780);
//   340px  o quadrado do logo saía da própria caixa, e em 320px cobria 13px do
//          botão do Discord.
//
// Nos três casos `document.body.scrollWidth === window.innerWidth`. Encolher em
// silêncio é o defeito: as peças tinham `min-width: 0` e cediam antes de
// qualquer limiar disparar.
//
// O QUE ELE MEDE, E POR QUE ESSAS CINCO COISAS
// Uma varredura de 1400 até 320px, e em cada largura as cinco formas conhecidas
// de a barra quebrar:
//
//   1. a PÁGINA estoura na horizontal. Com as peças rígidas (é assim que o
//      `globals.css` as deixou), faltar espaço vira estouro — que é o que se
//      quer: alto e medível, em vez de sobreposição silenciosa;
//   2. uma PEÇA sai da caixa do cabeçalho. Pega o transbordo vertical, que é a
//      cara do defeito de 920px e que nenhuma medição de largura vê;
//   3. duas peças se SOBREPÕEM. Só conta quando os dois eixos se cruzam: nome e
//      subtítulo da marca ficam um sobre o outro de propósito;
//   4. um rótulo é CORTADO (`scrollWidth > clientWidth` no elemento);
//   5. um rótulo fica pequeno demais para ler. A barra nunca deve resolver
//      espaço encolhendo fonte, e sem esta linha um `font-size: 11px` passaria
//      as quatro medições acima.
//
// O 320 do piso é o menor aparelho que ainda aparece; o 1400 do teto é acima do
// ponto em que a barra volta a ter espaço de sobra.

const ALTURA = 800;
const PISO = 320;
const TETO = 1400;

/** O menor rótulo de NAVEGAÇÃO legível. Não é gosto: é o valor que os links da
 *  barra usam hoje (13.5px) menos um respiro. Abaixo disso a régua é "está
 *  escrito lá", não "dá para ler", e a issue pedia legibilidade antes de tudo.
 *
 *  Vale só para os links e botões. A marca fica de fora de propósito: o "DSA"
 *  dentro do quadrado sai a 11.5px e o "por Craft & Code Club" a 11px, e os
 *  dois são tipografia de assinatura, não rótulo que alguém precisa ler para
 *  navegar. Um piso único reprovaria a marca desde 1400px, que é largura em que
 *  não falta espaço nenhum. */
const PISO_FONTE = 12;

/** A folga mínima entre o bloco da esquerda e o da direita. É o `gap` do
 *  `.header` no degrau mais apertado (8px, abaixo de 400px): abaixo disso os
 *  dois blocos estão se encostando, mesmo sem sobrepor. */
const FOLGA_MINIMA = 8;

/** As duas cascas de cabeçalho que existem: com gaveta (o botão ☰ à esquerda
 *  rouba 34px) e sem. A vitrine `/roadmaps/` é `sem-lateral` por decisão do
 *  `Shell`, então ela é a segunda casca, não uma segunda página igual. */
const ROTAS = [
  { url: "/topicos/dijkstra/", casca: "com gaveta" },
  { url: "/roadmaps/", casca: "sem gaveta" },
] as const;

/**
 * As larguras varridas: de 20 em 20, mais os VIZINHOS EXATOS de cada degrau.
 *
 * O passo de 20 sozinho pula 761 e 941, que são justamente as larguras mais
 * apertadas da barra: um degrau alivia a largura logo abaixo dele e deixa a
 * pior largura um pixel acima. Um teste que só olha múltiplos de 20 mede a
 * faixa confortável de cada faixa.
 */
function larguras(): number[] {
  const vistas = new Set<number>();
  for (let w = TETO; w >= PISO; w -= 20) vistas.add(w);
  for (const degrau of [1000, 940, 760, 560, 400]) {
    vistas.add(degrau + 1);
    vistas.add(degrau);
    vistas.add(degrau - 1);
  }
  return [...vistas].filter((w) => w >= PISO && w <= TETO).sort((a, b) => b - a);
}

type Peca = {
  nome: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  corte: number;
  fonte: number;
  /** Link ou botão da barra, ou seja: rótulo que existe para ser lido e
   *  clicado. A marca não é. Só estes respondem ao `PISO_FONTE`. */
  navegavel: boolean;
};
type Medida = {
  estouroDaPagina: number;
  folga: number;
  cabecalho: { left: number; right: number; top: number; bottom: number };
  pecas: Peca[];
};

/**
 * As peças da barra, medidas nas FOLHAS e não nos contêineres.
 *
 * A marca entra como três peças (quadrado, nome, subtítulo) porque o defeito de
 * 920px era o conteúdo dela vazando da própria caixa: medir o `.brand` mediria
 * exatamente a caixa que mentia.
 */
async function medir(page: Page): Promise<Medida> {
  return page.evaluate(() => {
    const cabecalho = document.querySelector(".header")!.getBoundingClientRect();
    const visivel = (el: Element) => {
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.height > 0;
    };
    const NAVEGAVEIS = ".header-menu-toggle, .header .topnav > a, .nav-more > button";
    const alvos: Element[] = [
      ...document.querySelectorAll(`${NAVEGAVEIS}, .brand-mark, .brand-name, .brand-sub`),
    ].filter(visivel);

    const pecas = alvos.map((el) => {
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        nome:
          (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 24) ||
          el.getAttribute("aria-label") ||
          el.className,
        left: b.left,
        right: b.right,
        top: b.top,
        bottom: b.bottom,
        corte: el.scrollWidth - el.clientWidth,
        fonte: parseFloat(cs.fontSize),
        navegavel: el.matches(NAVEGAVEIS),
      };
    });

    const esquerda = document.querySelector(".header-left")!.getBoundingClientRect();
    const direita = document.querySelector(".nav-right")!.getBoundingClientRect();

    return {
      estouroDaPagina: document.body.scrollWidth - window.innerWidth,
      folga: direita.left - esquerda.right,
      cabecalho: {
        left: cabecalho.left,
        right: cabecalho.right,
        top: cabecalho.top,
        bottom: cabecalho.bottom,
      },
      pecas,
    };
  });
}

/** Meio pixel de tolerância: as caixas vêm de `getBoundingClientRect`, que é
 *  fracionário, e um arredondamento não é um defeito de layout. */
const FOLGA_DE_ARREDONDAMENTO = 0.5;

function sobreposicoes(pecas: Peca[]): string[] {
  const achadas: string[] = [];
  for (let i = 0; i < pecas.length; i++) {
    for (let j = i + 1; j < pecas.length; j++) {
      const a = pecas[i];
      const b = pecas[j];
      const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      // Os dois eixos, e não só o horizontal: o nome e o subtítulo da marca
      // dividem a mesma coluna de propósito, um embaixo do outro.
      if (x > FOLGA_DE_ARREDONDAMENTO && y > FOLGA_DE_ARREDONDAMENTO) {
        achadas.push(`"${a.nome}" × "${b.nome}" (${x.toFixed(0)}px)`);
      }
    }
  }
  return achadas;
}

function forasDaCaixa(m: Medida): string[] {
  const t = FOLGA_DE_ARREDONDAMENTO;
  return m.pecas
    .filter(
      (p) =>
        p.left < m.cabecalho.left - t ||
        p.right > m.cabecalho.right + t ||
        p.top < m.cabecalho.top - t ||
        p.bottom > m.cabecalho.bottom + t
    )
    .map(
      (p) =>
        `"${p.nome}" em ${p.left.toFixed(0)}..${p.right.toFixed(0)} x ` +
        `${p.top.toFixed(0)}..${p.bottom.toFixed(0)}`
    );
}

for (const rota of ROTAS) {
  test(`a barra do topo aguenta de ${TETO} a ${PISO}px (${rota.casca})`, async ({ page }) => {
    await page.setViewportSize({ width: TETO, height: ALTURA });
    await page.goto(rota.url);
    // As larguras são larguras de TEXTO: medir antes de a fonte trocar mede a
    // de reserva, e a barra inteira muda de tamanho embaixo da medição.
    await page.evaluate(() => document.fonts.ready.then(() => undefined));

    const estouraram: string[] = [];
    const vazaram: string[] = [];
    const sobrepostas: string[] = [];
    const cortadas: string[] = [];
    const miudas: string[] = [];
    const grudadas: string[] = [];

    for (const w of larguras()) {
      await page.setViewportSize({ width: w, height: ALTURA });
      const m = await medir(page);

      if (m.estouroDaPagina > 0) estouraram.push(`${w}px: +${m.estouroDaPagina}px`);
      for (const fora of forasDaCaixa(m)) vazaram.push(`${w}px: ${fora}`);
      for (const par of sobreposicoes(m.pecas)) sobrepostas.push(`${w}px: ${par}`);
      for (const p of m.pecas.filter((p) => p.corte > 1)) {
        cortadas.push(`${w}px: "${p.nome}" cortado em ${p.corte}px`);
      }
      for (const p of m.pecas.filter((p) => p.navegavel && p.fonte < PISO_FONTE)) {
        miudas.push(`${w}px: "${p.nome}" a ${p.fonte}px`);
      }
      if (m.folga < FOLGA_MINIMA - FOLGA_DE_ARREDONDAMENTO) {
        grudadas.push(`${w}px: ${m.folga.toFixed(0)}px entre os dois blocos`);
      }
    }

    expect(estouraram, "a barra empurrou a página para fora da janela").toEqual([]);
    expect(vazaram, "peça da barra fora da caixa do cabeçalho (transbordo)").toEqual([]);
    expect(sobrepostas, "duas peças da barra ocupando o mesmo lugar").toEqual([]);
    expect(cortadas, "rótulo da barra cortado dentro da própria caixa").toEqual([]);
    expect(miudas, `rótulo da barra abaixo de ${PISO_FONTE}px`).toEqual([]);
    expect(grudadas, `os dois blocos da barra a menos de ${FOLGA_MINIMA}px um do outro`).toEqual([]);
  });
}

/**
 * Os destinos que a barra promete, e o `href` de cada um.
 *
 * A conferência é por destino, e não por rótulo, porque o mesmo lugar tem nome
 * diferente nos dois lados: "Tópicos" na barra é "Todos os tópicos" no menu, e
 * "Apoiar" é "Apoiadores e Parceiros".
 *
 * ROTA INTERNA CASA EXATO, e não por `includes`. Uma rota é prefixo da outra
 * neste site: `"/"` está contido em TODO href interno, e `"/roadmaps/"` está
 * contido em `"/roadmaps/fundamentos/"`. Com `includes`, "Início" nunca
 * apareceria como perdido nem que sumisse dos dois lugares, e "Roadmaps"
 * sobreviveria escondido atrás do link dos Fundamentos — o teste ficaria verde
 * medindo a coisa errada.
 *
 * Os dois links de fora casam por trecho de propósito: o alvo ali é o HOST, e o
 * caminho depois dele (o `@CraftCodeClub`, o código do convite) muda sem que a
 * promessa da barra mude.
 */
const DESTINOS = [
  { nome: "Início", href: "/", externo: false },
  { nome: "Fundamentos", href: "/roadmaps/fundamentos/", externo: false },
  { nome: "Roadmaps", href: "/roadmaps/", externo: false },
  { nome: "Tópicos", href: "/topicos/", externo: false },
  { nome: "Apoiar", href: "/apoie/", externo: false },
  { nome: "YouTube", href: "youtube.com/", externo: true },
  { nome: "Discord", href: "discord.gg/", externo: true },
] as const;

const chegaAo = (href: string, destino: (typeof DESTINOS)[number]) =>
  destino.externo ? href.includes(destino.href) : href === destino.href;

test("nada sai da barra sem ter para onde ir: o menu ⋯ recolhe o que sumiu", async ({ page }) => {
  // O degrau novo (940px) tira "Início" e "YouTube" da barra, e o antigo (760)
  // tira os outros três da esquerda. Recolher item para lugar nenhum seria
  // trocar uma barra feia por uma navegação quebrada, então a régua é a mesma
  // em toda largura: barra ∪ menu tem de conter os sete destinos.
  await page.goto("/topicos/dijkstra/");
  await page.evaluate(() => document.fonts.ready.then(() => undefined));

  const botao = page.getByRole("button", { name: "Mais opções" });
  // O menu aberto põe um véu `position: fixed` sobre a página inteira, que é o
  // que o fecha ao clicar fora — e que também intercepta um segundo clique no
  // próprio botão. Fechar é clicar no véu, que é o gesto que o usuário faz.
  const veu = page.locator(".nav-more > div:not(.nav-menu)");

  for (const w of [1200, 1000, 941, 900, 800, 761, 700, 500, 390, 320]) {
    await page.setViewportSize({ width: w, height: ALTURA });

    await expect(botao, `${w}px: o ⋯ nasce fechado`).toHaveAttribute("aria-expanded", "false");
    await botao.click();
    await expect(botao, `${w}px: o ⋯ abriu sem dizer que abriu`).toHaveAttribute(
      "aria-expanded",
      "true"
    );

    const alcancaveis = await page.evaluate(() =>
      [...document.querySelectorAll(".header a, .nav-menu a")]
        .filter((a) => a.getBoundingClientRect().width > 0)
        .map((a) => a.getAttribute("href") ?? "")
    );

    const perdidos = DESTINOS.filter((d) => !alcancaveis.some((h) => chegaAo(h, d)));
    expect(
      perdidos.map((d) => d.nome),
      `${w}px: destino que sumiu da barra e não apareceu no menu ⋯`
    ).toEqual([]);

    await veu.click({ position: { x: 5, y: 5 } });
    await expect(botao, `${w}px: o ⋯ fechou sem dizer que fechou`).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  }
});
