import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures/console-limpo";

// Guarda de acessibilidade: axe-core sobre uma amostra fixa de rotas.
//
// POR QUE EXISTE
// Até aqui o repositório não tinha nenhuma verificação de acessibilidade:
// nem axe, nem pa11y, nem lighthouse, e nenhum dos 37 arquivos de `tests/`
// mencionava o assunto. Ao mesmo tempo, boa parte do trabalho recente é
// justamente acessibilidade (link de pular para o conteúdo, anel de foco,
// landmarks com nome, região viva, foco que volta ao fechar o painel). Sem
// guarda, tudo isso regride em silêncio: nada na tela muda de lugar quando um
// `aria-label` some.
//
// O ESCOPO É DECLARADO, E ISSO É DE PROPÓSITO
// Este guarda **não** promete que o site é acessível. Ele promete uma coisa
// menor e verificável: *o passivo de acessibilidade não cresce*. Um teste que
// chega vermelho é desligado na semana seguinte, então o passivo medido no dia
// da abertura deste PR está congelado abaixo, item por item, com o que cada um
// é e onde mora. O teste reprova:
//
//   1. quando aparece uma REGRA que não estava no passivo daquela rota;
//   2. quando uma regra conhecida passa do TETO de nós congelado.
//
// O item 2 tem exceção declarada: `color-contrast` numa página de artigo entra
// **sem teto**. A contagem dela acompanha o tamanho do texto da página (são 16
// nós hoje em `/topico/two-pointers/`: 10 `.code-lang` e 6 `.viz-cell-idx`,
// repetições de dois defeitos só), então qualquer parágrafo novo empurraria o
// número para cima sem nenhuma regressão de acessibilidade. Teto ali seria alarme
// falso mensal, e alarme falso é o que faz o guarda ser desligado. Nas regras
// que vêm de um componente fixo (o range de velocidade da casca, o `<h3>` do
// cartão de apoio) o teto vale, porque só cresce se alguém duplicar o defeito.
//
// COMO BAIXAR O PASSIVO
// Consertando o site, não editando esta lista. Cada item aponta `arquivo:linha`.
// Ao corrigir um, o teste avisa no log que a entrada ficou obsoleta (ele não
// reprova por isso: fix não pode deixar a suíte vermelha); apague a entrada no
// mesmo PR do conserto.

/** Uma violação já conhecida, congelada. `teto: null` = só a regra é conhecida. */
type Conhecida = {
  /** id da regra do axe-core */
  regra: string;
  /** número máximo de nós aceito, ou `null` para não impor teto */
  teto: number | null;
  /** o que é, e onde mora */
  nota: string;
};

/**
 * Passivo **remedido em 2026-08-07 sobre a `main` 0d7d01a**, axe-core 4.12.1,
 * viewport Desktop Chrome, já com a folga de hidratação que o teste aplica.
 *
 * Duas coisas mudaram em relação à primeira medição (feita sobre e35c1b2):
 *
 *  - `landmark-unique` **saiu das cinco rotas**: o #50 pôs `aria-label` nos dois
 *    `<nav>` da barra, que era o defeito. Com isso `/` e `/roadmap/` ficam com a
 *    lista **vazia** — e lista vazia não é lacuna, é a forma mais forte deste
 *    guarda: qualquer violação que apareça ali vira "regra nova" e reprova;
 *  - `color-contrast` em `/topico/two-pointers/` fica em **16 nós**, e agora de
 *    forma determinística. Antes de esperar o assentamento o número era
 *    **sorteado**: três cargas idênticas mediram 16, 28 e 28. Os 12 nós que
 *    entravam e saíam eram sempre os mesmos `.viz-var-name`, e eles **não são
 *    defeito**: medidos com as cores que o navegador realmente pinta
 *    (`#8ba0bb` sobre `#0e1725`, o fundo do `.viz-var`), dão **6,72:1**, bem
 *    acima dos 4,5:1 exigidos. Eram falso positivo do axe lendo a página no
 *    meio da pintura — não "nós do SSG que o aluno não vê": os 12 elementos
 *    estão no DOM, visíveis e dentro da figura nos dois momentos.
 *
 * O passivo antigo dizia que os 34 nós eram `.code-lang` e `.viz-var-name`, com
 * "o pior medido 3.48:1" atribuído ao segundo. Os dois rótulos estavam errados:
 * 3,48:1 é o `.code-lang`, e a outra família é `.viz-cell-idx`. Os números
 * abaixo vêm do que o próprio axe reporta em `node.any[0].data`, não de leitura
 * do CSS.
 */
const PASSIVO: Record<string, Conhecida[]> = {
  "/": [],
  "/roadmap/": [],
  "/topico/two-pointers/": [
    {
      regra: "color-contrast",
      teto: null, // sem teto: acompanha o tamanho do texto da página, ver o cabeçalho
      nota:
        "16 nós, de duas famílias de cor do tema, com os números que o próprio axe reporta: " +
        "10x o selo de linguagem do bloco de código (`.code-lang`, src/app/globals.css:377, " +
        "#5b6d85 sobre #0d1420, 3.48:1) e 6x o índice da célula do visualizador " +
        "(`.viz-cell-idx`, src/app/globals.css:486, #61748c sobre #131c2a, 3.57:1). " +
        "Os dois contra os 4.5:1 exigidos; o pior é o `.code-lang`",
    },
    {
      regra: "label",
      teto: 3,
      nota:
        "o <input type=range> de velocidade da casca não tem <label> nem aria-label " +
        "(src/lib/visualizer.tsx:562). São 3 nós porque a página tem 3 visualizadores; " +
        "é UM defeito, num componente compartilhado por todos os 62",
    },
    {
      regra: "scrollable-region-focusable",
      teto: 1,
      nota:
        "a fita de caracteres do Two Pointers rola na horizontal e não recebe foco de teclado " +
        "(`.tp-chars { overflow-x: auto }`, src/app/globals.css:663): quem navega por teclado " +
        "não alcança o que está fora da vista",
    },
  ],
  "/topico/trie/": [
    {
      regra: "color-contrast",
      teto: 2,
      nota:
        "o nome do tópico 'em breve' no menu lateral (`.side-item.soon`, " +
        "src/app/globals.css:197, #6f83a0 sobre #13233e, 4.05:1) e o selo 'em breve' " +
        "(`.badge-soon`, src/app/globals.css:220, #7f93ad sobre #22314a, 4.15:1), os dois " +
        "contra os 4.5:1 exigidos. Teto vale aqui: são dois elementos de chrome fixo, " +
        "não de conteúdo",
    },
  ],
  "/apoie/": [
    {
      regra: "heading-order",
      teto: 1,
      nota:
        "o cartão de doação abre com <h3> logo depois do <h1>, pulando o <h2> " +
        "(src/app/apoie/page.tsx:29)",
    },
  ],
};

/**
 * A amostra: uma página de cada tipo que o site sabe montar. Fixa de propósito
 * (varrer as 47 rotas custaria minutos de CI e não acharia classe nova de
 * defeito: as páginas de tópico saem todas do mesmo template).
 */
const AMOSTRA = Object.keys(PASSIVO);

/**
 * Espera a página estar hidratada e assentada, por um FATO da aplicação antes de
 * qualquer relógio.
 *
 * POR QUE NÃO SÓ UMA FOLGA
 * Esperar o `<h1>` não é sinal de hidratação: ele já vem no HTML do SSG. E medir
 * o axe antes de a página assentar dá resultado **sorteado** — três cargas
 * idênticas de `/topico/two-pointers/` mediram 16, 28 e 28 nós de
 * `color-contrast`. Hoje isso não deixa a suíte vermelha só porque essa regra
 * está com `teto: null` nessa rota; no dia em que alguém puser teto, vira flake.
 *
 * O SINAL É O CARIMBO DO MENU, e ele não é invenção deste arquivo: o
 * `navegacao.spec.ts` já espera por ele (`carimboRegravado`), pelo mesmo motivo
 * — conferir logo após o `goto` lê o menu de antes da hidratação, e foi assim
 * que aquele bloco ficou instável no CI. O `Shell` regrava `ccc-dsa-menu` num
 * efeito a cada carga, então o carimbo recente é prova de que o efeito rodou.
 *
 * A folga curta depois dele cobre o que vem DEPOIS da hidratação do `Shell`: as
 * ilhas de visualizador, que chegam por `import()` do `VizLazy`. Ela é folga de
 * assentamento, não de hidratação — e vem depois de um fato, não no lugar dele.
 * Medido com as duas juntas: 6 cargas seguidas, 16 nós nas 6.
 */
async function esperarHidratar(page: Page) {
  await page.waitForFunction(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem("ccc-dsa-menu") ?? "null");
      return typeof salvo?.em === "number" && Date.now() - salvo.em < 60_000;
    } catch {
      return false;
    }
  });
  await page.waitForTimeout(400);
}

for (const rota of AMOSTRA) {
  test(`acessibilidade: ${rota} não ganha violação nova (axe-core)`, async ({ page }) => {
    await page.goto(rota);
    // O `<h1>` já vem no HTML do SSG, então esta espera NÃO é sinal de
    // hidratação: ela só garante que a rota certa carregou.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await esperarHidratar(page);

    const { violations } = await new AxeBuilder({ page }).analyze();
    const conhecidas = PASSIVO[rota];

    const novas = violations
      .filter((v) => !conhecidas.some((c) => c.regra === v.id))
      .map(
        (v) =>
          `${v.id} (${v.impact}, ${v.nodes.length} nó(s)): ` +
          v.nodes
            .slice(0, 5)
            .map((n) => n.target.join(" "))
            .join(" ; ")
      );
    expect(
      novas,
      `violação de acessibilidade NOVA em ${rota}. Conserte o site; só congele em PASSIVO ` +
        `se for dívida antiga, com arquivo:linha na nota`
    ).toEqual([]);

    const cresceram = conhecidas.flatMap((c) => {
      if (c.teto === null) return [];
      const v = violations.find((x) => x.id === c.regra);
      const agora = v ? v.nodes.length : 0;
      return agora > c.teto ? [`${c.regra}: ${c.teto} nó(s) congelados, ${agora} agora`] : [];
    });
    expect(
      cresceram,
      `o passivo de acessibilidade de ${rota} CRESCEU: o mesmo defeito foi duplicado`
    ).toEqual([]);

    // Não reprova: um conserto não pode deixar a suíte vermelha. Só avisa para
    // a entrada sair da lista no mesmo PR do conserto.
    for (const c of conhecidas) {
      const v = violations.find((x) => x.id === c.regra);
      if (!v) console.log(`[passivo obsoleto] ${rota}: '${c.regra}' não viola mais. Apague de PASSIVO.`);
    }
  });
}

/**
 * A varredura acima olha a página **parada**. Esta olha a página **em uso**, e
 * não é zelo: é a única das duas que enxerga o estado que o aluno passa a maior
 * parte do tempo olhando.
 *
 * Medido: andar 6 passos no primeiro visualizador de `/topico/two-pointers/`
 * leva `color-contrast` de 16 para 18 nós. Os 2 nós novos são `.drop.viz-cell`,
 * a célula marcada como descartada — uma cor que **só existe depois de a
 * animação andar**, e que nenhuma carga de página, com folga ou sem, alcança.
 * Estável nas 3 rodadas medidas.
 *
 * O que ele reprova é o mesmo do outro: **regra nova**. Não impõe teto de nós,
 * porque a contagem depende de quantos passos a animação andou, e teto que
 * depende disso é alarme falso esperando acontecer. Regra nova, não: um diálogo
 * que abre sem nome acessível, um foco que some, um `aria-hidden` sobre o que
 * acabou de receber foco — nada disso depende de quantos passos.
 */
test("acessibilidade: o visualizador EM USO não ganha regra nova (axe-core)", async ({ page }) => {
  const rota = "/topico/two-pointers/";
  await page.goto(rota);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await esperarHidratar(page);

  const figura = page.locator("figure.viz").first();
  const proximo = figura.getByRole("button", { name: /Próximo/ });
  await expect(proximo).toBeEnabled();
  for (let i = 0; i < 6 && (await proximo.isEnabled()); i++) await proximo.click();

  // Sem isto o teste "passaria" numa página que não andou passo nenhum: é a
  // diferença entre exercitar a animação e só clicar num botão morto.
  await expect(figura.locator(".drop.viz-cell").first()).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).analyze();
  const conhecidas = PASSIVO[rota];
  const novas = violations
    .filter((v) => !conhecidas.some((c) => c.regra === v.id))
    .map((v) => `${v.id} (${v.impact}, ${v.nodes.length} nó(s))`);

  expect(
    novas,
    "andar a animação fez aparecer uma regra de acessibilidade que a página parada não tinha"
  ).toEqual([]);
});
