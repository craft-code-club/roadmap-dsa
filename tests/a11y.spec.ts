import AxeBuilder from "@axe-core/playwright";
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
// nós hoje em `/topico/two-pointers/`, quase todos `.code-lang` e
// `.viz-var-name` repetidos), então qualquer parágrafo novo empurraria o número
// para cima sem nenhuma regressão de acessibilidade. Teto ali seria alarme
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
 *  - `color-contrast` em `/topico/two-pointers/` caiu de 34 para 16 nós, porque
 *    agora o axe roda depois da hidratação (ver a folga no corpo do teste). Os
 *    18 nós de diferença eram do HTML do SSG, antes de as ilhas client
 *    repintarem — o aluno nunca os vê.
 */
const PASSIVO: Record<string, Conhecida[]> = {
  "/": [],
  "/roadmap/": [],
  "/topico/two-pointers/": [
    {
      regra: "color-contrast",
      teto: null, // sem teto: acompanha o tamanho do texto da página, ver o cabeçalho
      nota:
        "16 nós, todos de duas famílias de cor do tema: o selo de linguagem do bloco de código " +
        "(`.code-lang`, src/app/globals.css:315) e o nome da variável do painel do visualizador " +
        "(`.viz-var-name`, src/app/globals.css:446, #8ba0bb sobre #0d1420). O pior medido é " +
        "3.48:1 contra os 4.5:1 exigidos",
    },
    {
      regra: "label",
      teto: 3,
      nota:
        "o <input type=range> de velocidade da casca não tem <label> nem aria-label " +
        "(src/lib/visualizer.tsx:559). São 3 nós porque a página tem 3 visualizadores; " +
        "é UM defeito, num componente compartilhado por todos os 62",
    },
    {
      regra: "scrollable-region-focusable",
      teto: 1,
      nota:
        "a fita de caracteres do Two Pointers rola na horizontal e não recebe foco de teclado " +
        "(`.tp-chars { overflow-x: auto }`, src/app/globals.css:602): quem navega por teclado " +
        "não alcança o que está fora da vista",
    },
  ],
  "/topico/trie/": [
    {
      regra: "color-contrast",
      teto: 2,
      nota:
        "o item ativo do menu lateral (`.side-item.on`, src/app/globals.css:161) e o selo " +
        "'em breve' (`.badge-soon`, src/app/globals.css:172, 4.05:1 contra 4.5:1 exigidos). " +
        "Teto vale aqui: são dois elementos de chrome fixo, não de conteúdo",
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

for (const rota of AMOSTRA) {
  test(`acessibilidade: ${rota} não ganha violação nova (axe-core)`, async ({ page }) => {
    await page.goto(rota);
    // O `<h1>` já vem no HTML do SSG, então esta espera NÃO é sinal de
    // hidratação: ela só garante que a rota certa carregou.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // A hidratação é que importa aqui — o menu lateral e os visualizadores são
    // ilhas client, e o axe precisa ver o DOM que o aluno usa, não o do SSG.
    // Não há marcador observável para esperar: o único estado de hidratação que
    // chega ao DOM é o `hydrated` do `ProgressProvider`, e ele só decide o
    // número da barra de progresso, que vale 0 antes e 0 depois num perfil sem
    // nada salvo. Sem sinal, sobra a folga — a mesma de `console-limpo.spec.ts`,
    // e pelo mesmo motivo (efeitos, `localStorage` do progresso, `matchMedia` da
    // casca adaptativa).
    await page.waitForTimeout(400);

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
