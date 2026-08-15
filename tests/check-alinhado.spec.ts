import { test, expect, type Locator, type Page } from "@playwright/test";

// O ✓ do quadradinho de progresso, medido pela TINTA e não pela caixa de linha.
//
// `place-items: center` centraliza a caixa da LINHA. Ela não é a mancha que o
// aluno enxerga, e a diferença não era sutil: medida, a tinta encostava na borda
// DIREITA do quadrado de 16px — 7,75px de folga à esquerda contra 0,5px à
// direita. Contar elemento, ler `justify-items` ou olhar o
// `getBoundingClientRect` do botão diriam "centralizado" nos três casos.
//
// COMO MEDIMOS, e por que é assim.
//
// 1. TRÊS FOTOS da mesma região, não duas. A primeira normal; a segunda com
//    `color: transparent`, que apaga só a marca; a terceira apagando também
//    fundo e borda. A diferença 1-2 é exatamente o desenho do ✓, e a diferença
//    2-3 é exatamente o quadrado pintado.
//
//    A referência TEM que ser o quadrado PINTADO, e não o `boundingBox` do
//    layout. O Chromium arredonda a origem de pintura para pixel inteiro de CSS,
//    e dois dos três quadradinhos moram em coordenada fracionária (o do card,
//    por causa do `top: 17.5px`; o da lista de problemas, por causa da altura da
//    linha). Medido contra o layout, um CÍRCULO PERFEITO — desenho simétrico por
//    construção — acusava 0,72px de desnível vertical na lista de problemas e
//    0,62px no card, e 0,00px na lateral, que é a única em offset inteiro. O
//    desnível batia com `2 x (distância até o pixel inteiro)` nas três casas
//    decimais. Não era o desenho: era a régua. Quadrado e marca são pintados com
//    o mesmo arredondamento, então medir um contra o outro pergunta o que o
//    olho pergunta.
//
// 2. Extremos por MASSA, e não por limiar de pixel. A ponta de cima do ✓ é um
//    cap redondo (fina, pouca cobertura) e a de baixo é uma junta (grossa). Com
//    "primeiro pixel acima do limiar", o antialiasing da ponta grossa entra e o
//    da fina não, e a medida vira o formato da ponta em vez da posição. Cortar a
//    MESMA FRAÇÃO de tinta de cada lado é simétrico por construção.
//
// Nada disso pergunta nada à fonte nem ao SVG: a mesma régua serviu para
// comparar as duas implementações uma com a outra.
const ESCALA = 4; // 4 pixels de foto por pixel de CSS: 0,25px de resolução.

test.use({ deviceScaleFactor: ESCALA });

/** Fração da tinta descartada em cada ponta antes de ler o extremo. Ver (2). */
const CORTE = 0.01;

type Medida = {
  folgaTopo: number;
  folgaBaixo: number;
  folgaEsq: number;
  folgaDir: number;
  desnivelV: number;
  desnivelH: number;
  quadrado: string;
  marca: string;
};

const arred = (v: number) => Number(v.toFixed(2));

/** Perfis de diferença (soma dos 4 canais) por linha e por coluna entre duas fotos. */
async function perfis(page: Page, a: string, b: string) {
  return page.evaluate(
    async ([x, y]) => {
      const carregar = (b64: string) =>
        new Promise<HTMLImageElement>((ok, erro) => {
          const img = new Image();
          img.onload = () => ok(img);
          img.onerror = () => erro(new Error("a foto não decodificou"));
          img.src = `data:image/png;base64,${b64}`;
        });
      const [ia, ib] = await Promise.all([carregar(x), carregar(y)]);
      const w = ia.width;
      const h = ia.height;
      const pixels = (img: HTMLImageElement) => {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, w, h).data;
      };
      const pa = pixels(ia);
      const pb = pixels(ib);
      const linhas = new Array<number>(h).fill(0);
      const colunas = new Array<number>(w).fill(0);
      let total = 0;
      for (let yy = 0; yy < h; yy++) {
        for (let xx = 0; xx < w; xx++) {
          const i = (yy * w + xx) * 4;
          const d =
            Math.abs(pa[i] - pb[i]) +
            Math.abs(pa[i + 1] - pb[i + 1]) +
            Math.abs(pa[i + 2] - pb[i + 2]) +
            Math.abs(pa[i + 3] - pb[i + 3]);
          linhas[yy] += d;
          colunas[xx] += d;
          total += d;
        }
      }
      return { linhas, colunas, total };
    },
    [a, b]
  );
}

/**
 * Extremos de um perfil, em pixels de foto (com casas decimais), descartando
 * `fracao` da massa em cada ponta. Interpola dentro do pixel onde o corte cai,
 * para a medida não ficar refém da grade da foto.
 */
function extremos(perfil: number[], fracao: number): [number, number] {
  const soma = perfil.reduce((a, b) => a + b, 0);
  const cota = soma * fracao;

  let acc = 0;
  let inicio = 0;
  for (let i = 0; i < perfil.length; i++) {
    if (acc + perfil[i] > cota) {
      // A borda cai DENTRO deste pixel: interpola, para a medida não ficar
      // refém da grade da foto.
      inicio = i + (cota - acc) / perfil[i];
      break;
    }
    acc += perfil[i];
  }

  acc = 0;
  let fim = perfil.length;
  for (let i = perfil.length - 1; i >= 0; i--) {
    if (acc + perfil[i] > cota) {
      fim = i + 1 - (cota - acc) / perfil[i];
      break;
    }
    acc += perfil[i];
  }

  return [inicio, fim];
}

/** Folgas, em px de CSS, entre o quadrado PINTADO e a tinta do ✓ dentro dele. */
async function medir(page: Page, alvo: Locator): Promise<Medida> {
  await expect(alvo).toBeVisible();
  await alvo.scrollIntoViewIfNeeded();
  const caixa = await alvo.boundingBox();
  if (!caixa) throw new Error("elemento sem caixa");

  // Recorte ancorado em pixel INTEIRO de CSS e folgado: `elemento.screenshot()`
  // arredonda para fora quando o elemento cai em coordenada fracionária, e
  // devolvia foto de 17px de altura para uma caixa de 16px.
  const MARGEM = 3;
  const recorte = {
    x: Math.floor(caixa.x) - MARGEM,
    y: Math.floor(caixa.y) - MARGEM,
    width: Math.ceil(caixa.x + caixa.width) - Math.floor(caixa.x) + 2 * MARGEM,
    height: Math.ceil(caixa.y + caixa.height) - Math.floor(caixa.y) + 2 * MARGEM,
  };

  const comTudo = (await page.screenshot({ clip: recorte })).toString("base64");
  await alvo.evaluate((el) => ((el as HTMLElement).style.color = "transparent"));
  const semMarca = (await page.screenshot({ clip: recorte })).toString("base64");
  await alvo.evaluate((el) => {
    const e = el as HTMLElement;
    e.style.background = "transparent";
    e.style.borderColor = "transparent";
  });
  const semNada = (await page.screenshot({ clip: recorte })).toString("base64");
  await alvo.evaluate((el) => {
    const e = el as HTMLElement;
    e.style.color = "";
    e.style.background = "";
    e.style.borderColor = "";
  });

  const marca = await perfis(page, comTudo, semMarca);
  const quadrado = await perfis(page, semMarca, semNada);

  expect(marca.total, "o ✓ precisa estar desenhado para ser medido").toBeGreaterThan(2000);
  expect(quadrado.total, "o quadrado precisa estar pintado para servir de régua").toBeGreaterThan(2000);

  // O quadrado é simétrico por construção (retângulo de cantos arredondados),
  // então o mesmo corte de massa devolve os extremos verdadeiros dele.
  const [qx0, qx1] = extremos(quadrado.colunas, CORTE);
  const [qy0, qy1] = extremos(quadrado.linhas, CORTE);
  const [mx0, mx1] = extremos(marca.colunas, CORTE);
  const [my0, my1] = extremos(marca.linhas, CORTE);

  const p = (v: number) => v / ESCALA; // pixel de foto -> pixel de CSS
  const folgaTopo = arred(p(my0 - qy0));
  const folgaBaixo = arred(p(qy1 - my1));
  const folgaEsq = arred(p(mx0 - qx0));
  const folgaDir = arred(p(qx1 - mx1));

  const m: Medida = {
    folgaTopo,
    folgaBaixo,
    folgaEsq,
    folgaDir,
    desnivelV: arred(Math.abs(folgaTopo - folgaBaixo)),
    desnivelH: arred(Math.abs(folgaEsq - folgaDir)),
    quadrado: `${arred(p(qx1 - qx0))}x${arred(p(qy1 - qy0))}`,
    marca: `${arred(p(mx1 - mx0))}x${arred(p(my1 - my0))}`,
  };

  // A tinta tem que estar DENTRO do quadrado: folga negativa quer dizer que ela
  // vaza pela borda, e aí "centralizado" não é a pergunta certa.
  for (const lado of ["folgaTopo", "folgaBaixo", "folgaEsq", "folgaDir"] as const) {
    expect(m[lado], `${lado}: a tinta do ✓ vaza para fora do quadrado`).toBeGreaterThan(-0.3);
  }
  return m;
}

/**
 * A tolerância, e de onde ela vem.
 *
 * O desenho é exato: o traço do SVG é simétrico em torno do centro da `viewBox`
 * (cap e junta redondos de raio 1 sobre `M2.4 6.4 5.1 8.6 9.6 3.4` dão tinta de
 * 1,4 a 10,6 em x e de 2,4 a 9,6 em y — centro 6,0 nos dois eixos, que é o
 * centro da `viewBox` de 12), e a caixa dele sobra PAR dentro do quadrado.
 *
 * O que sobra é o rasterizador. Medido com esta mesma régua, o desnível do SVG
 * ficou em 0,00px na horizontal e 0,03–0,04px na vertical, igual nas três telas
 * e nos três lugares; um CÍRCULO de controle — simétrico, e portanto com
 * desnível verdadeiro zero — deu os mesmos 0,00px. O teto de 0,35px é oito
 * vezes esse ruído, e ainda assim é um terço de pixel: menos do que qualquer
 * olho enxerga.
 *
 * Do outro lado, ele é apertado o bastante para pegar o defeito. No código de
 * antes, medido com esta régua nas três telas:
 *
 *     horizontal ... 4,10px (lista de problemas) a 7,05px (lateral e card)
 *     vertical ..... 0,20px a 1,80px
 *
 * A horizontal reprova nos três lugares e nas três telas, e é ela a prova de
 * quebra deste teto. A vertical reprova em sete dos nove casos: na lista de
 * problemas em 1280x720 ela dá 0,20px e passa. Isso é honesto e é o próprio
 * motivo do conserto — o MESMO elemento, com o MESMO CSS, dá 0,20px em 1280x720
 * e 1,80px em 1440x700, porque a linha cai em outro offset e a linha de base do
 * glifo gruda noutro pixel. Um número que muda com a largura da janela não é um
 * número que dá para calibrar; o desenho dá 0,04px nas três.
 */
const TOLERANCIA = 0.35;

/** Os três lugares onde o quadradinho aparece, já no estado marcado. */
async function marcados(page: Page) {
  await page.goto("/fundamentos/two-pointers/");

  const lateral = page
    .locator(".sidebar")
    .getByRole("checkbox", { name: "Marcar Two Pointers como concluído" });
  if ((await lateral.getAttribute("aria-checked")) === "false") await lateral.click();
  await expect(lateral).toHaveAttribute("aria-checked", "true");

  const problema = page.locator(".problem-check").first();
  if ((await problema.getAttribute("aria-checked")) === "false") await problema.click();
  await expect(problema).toHaveAttribute("aria-checked", "true");

  return { lateral, problema };
}

// Três larguras de desktop, e não uma. O desnível do código de antes MUDAVA com
// a largura da janela — 0,20px em 1280x720 e 1,80px em 1440x700 no mesmo
// elemento —, então uma tela só teria contado meia verdade. O celular tem teste
// próprio logo abaixo, porque lá a trilha lateral é gaveta e não dá para chegar
// nela pelo mesmo caminho.
const TELAS = [
  { nome: "1280x720", width: 1280, height: 720 },
  { nome: "1440x700", width: 1440, height: 700 },
  { nome: "1512x900", width: 1512, height: 900 },
];

for (const tela of TELAS) {
  test(`o ✓ fica centralizado nos três quadradinhos de progresso (${tela.nome})`, async ({ page }) => {
    await page.setViewportSize({ width: tela.width, height: tela.height });
    const { lateral, problema } = await marcados(page);

    const medidas: [string, Medida][] = [
      ["trilha lateral (.side-check)", await medir(page, lateral)],
      ["lista de problemas (.problem-check)", await medir(page, problema)],
    ];

    // O terceiro mora no /roadmap, e o progresso marcado acima chega junto.
    await page.goto("/fundamentos/");
    const card = page
      .locator(".topic-card-wrap")
      .getByRole("checkbox", { name: "Marcar Two Pointers como concluído" });
    await expect(card).toHaveAttribute("aria-checked", "true");
    medidas.push(["card do /roadmap (.tcard-check)", await medir(page, card)]);

    for (const [onde, m] of medidas) console.log(`${tela.nome}  ${onde.padEnd(38)} ${JSON.stringify(m)}`);

    for (const [onde, m] of medidas) {
      expect(
        m.desnivelV,
        `${onde} em ${tela.nome}: o ✓ não está no meio na vertical — ${m.folgaTopo}px em cima contra ${m.folgaBaixo}px embaixo`
      ).toBeLessThanOrEqual(TOLERANCIA);
      expect(
        m.desnivelH,
        `${onde} em ${tela.nome}: o ✓ não está no meio na horizontal — ${m.folgaEsq}px à esquerda contra ${m.folgaDir}px à direita`
      ).toBeLessThanOrEqual(TOLERANCIA);
    }
  });
}

// No celular a trilha lateral é uma gaveta fechada, então o caminho de cima não
// serve. Sobram os dois quadradinhos que aparecem sem abrir nada: o do card do
// /roadmap e o da lista de problemas. Vale medir mesmo com a largura sem efeito
// sobre o quadrado, porque quem muda no celular é a ALTURA das linhas e do card,
// e é ela que empurra o quadradinho para outro offset — que foi exatamente o que
// fazia o número do código de antes variar.
test("o ✓ fica centralizado no celular (390x844)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/fundamentos/");
  const card = page
    .locator(".topic-card-wrap")
    .getByRole("checkbox", { name: "Marcar Two Pointers como concluído" });
  if ((await card.getAttribute("aria-checked")) === "false") await card.click();
  await expect(card).toHaveAttribute("aria-checked", "true");
  const noCard = await medir(page, card);

  await page.goto("/fundamentos/two-pointers/");
  const problema = page.locator(".problem-check").first();
  if ((await problema.getAttribute("aria-checked")) === "false") await problema.click();
  await expect(problema).toHaveAttribute("aria-checked", "true");
  const naLista = await medir(page, problema);

  const medidas: [string, Medida][] = [
    ["card do /roadmap (.tcard-check)", noCard],
    ["lista de problemas (.problem-check)", naLista],
  ];
  for (const [onde, m] of medidas) console.log(`390x844  ${onde.padEnd(38)} ${JSON.stringify(m)}`);

  for (const [onde, m] of medidas) {
    expect(
      m.desnivelV,
      `${onde} em 390x844: o ✓ não está no meio na vertical — ${m.folgaTopo}px em cima contra ${m.folgaBaixo}px embaixo`
    ).toBeLessThanOrEqual(TOLERANCIA);
    expect(
      m.desnivelH,
      `${onde} em 390x844: o ✓ não está no meio na horizontal — ${m.folgaEsq}px à esquerda contra ${m.folgaDir}px à direita`
    ).toBeLessThanOrEqual(TOLERANCIA);
  }
});

// O erro de hoje nasceu de o `<button>` chegar com `padding: 1px 6px` do agente
// do usuário e ninguém zerar. Num quadrado de 16px com 1px de borda isso deixa
// 2px de caixa de conteúdo: a marca de 7,66px transborda, o alinhamento cai para
// `start` — a especificação manda isso para não cortar conteúdo — e ela encosta
// na direita. O teste acima pega o sintoma; este pega a causa, que é o que uma
// quarta lista com ✓ vai repetir se ninguém disser.
test("o quadradinho de progresso não herda o padding do <button>", async ({ page }) => {
  const { lateral, problema } = await marcados(page);

  const sobra = async (alvo: Locator) =>
    alvo.evaluate((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const px = (v: string) => parseFloat(v) || 0;
      // `Range` sobre o conteúdo, e não `firstElementChild`: no código de antes
      // a marca era um NÓ DE TEXTO, que não tem `getBoundingClientRect`. Medi-lo
      // como elemento devolve 0, e `0 <= qualquer coisa` fazia este teste passar
      // no código quebrado — que é exatamente o que ele existe para reprovar.
      const faixa = document.createRange();
      faixa.selectNodeContents(el);
      const g = faixa.getBoundingClientRect();
      const n = (v: number) => Number(v.toFixed(2));
      return {
        conteudoLargura: n(
          r.width - px(cs.borderLeftWidth) - px(cs.borderRightWidth) - px(cs.paddingLeft) - px(cs.paddingRight)
        ),
        conteudoAltura: n(
          r.height - px(cs.borderTopWidth) - px(cs.borderBottomWidth) - px(cs.paddingTop) - px(cs.paddingBottom)
        ),
        marcaLargura: n(g.width),
        marcaAltura: n(g.height),
        // O OUTRO padrão de `<button>` que morde: sem `type`, ele é `submit`.
        // Lido da PROPRIEDADE, e não do atributo, porque é ela que o navegador
        // consulta na hora de decidir se o clique envia o formulário — um botão
        // sem o atributo devolve `"submit"` aqui, que é o defeito.
        tipo: (el as HTMLButtonElement).type,
      };
    });

  const conferir = async (onde: string, alvo: Locator) => {
    const s = await sobra(alvo);
    console.log(`${onde.padEnd(22)} ${JSON.stringify(s)}`);
    expect(
      s.conteudoLargura,
      `${onde}: a caixa de conteúdo tem ${s.conteudoLargura}px e a marca ${s.marcaLargura}px — a marca transborda e o centro vira canto`
    ).toBeGreaterThanOrEqual(s.marcaLargura);
    expect(
      s.conteudoAltura,
      `${onde}: a caixa de conteúdo tem ${s.conteudoAltura}px de altura e a marca ${s.marcaAltura}px`
    ).toBeGreaterThanOrEqual(s.marcaAltura);
    // Sobra PAR: com sobra ímpar o centro cai em meio pixel e o rasterizador
    // desempata para um dos lados.
    expect(
      (s.conteudoLargura - s.marcaLargura) % 2,
      `${onde}: sobram ${arred(s.conteudoLargura - s.marcaLargura)}px na horizontal, que não dá para dividir em dois inteiros`
    ).toBe(0);
    expect(
      (s.conteudoAltura - s.marcaAltura) % 2,
      `${onde}: sobram ${arred(s.conteudoAltura - s.marcaAltura)}px na vertical, que não dá para dividir em dois inteiros`
    ).toBe(0);
    expect(
      s.tipo,
      `${onde}: sem \`type="button"\` o padrão do HTML é \`submit\`, e um dia dentro de um <form> marcar vira enviar`
    ).toBe("button");
  };

  await conferir("trilha lateral", lateral);
  await conferir("lista de problemas", problema);

  await page.goto("/fundamentos/");
  const card = page
    .locator(".topic-card-wrap")
    .getByRole("checkbox", { name: "Marcar Two Pointers como concluído" });
  await conferir("card do /roadmap", card);
});

// O ✓ é DECORAÇÃO: quem conta o estado é `role="checkbox"` + `aria-checked`, e
// quem dá o nome é o `aria-label`. Trocar o caractere por desenho não pode mudar
// nada disso, e é fácil esquecer o `aria-hidden` num `<svg>`.
test("o desenho do ✓ não entra no nome acessível", async ({ page }) => {
  const { lateral, problema } = await marcados(page);
  await expect(lateral).toHaveAccessibleName("Marcar Two Pointers como concluído");
  await expect(problema).toHaveAccessibleName(/^Marcar .+ como resolvido$/);

  const conferirAriaHidden = async (onde: string) => {
    const soltos = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".side-check svg, .problem-check svg"))
        .filter((s) => s.getAttribute("aria-hidden") !== "true")
        .map((s) => s.parentElement?.className ?? "?")
    );
    expect(soltos, `${onde}: todo <svg> do quadradinho tem que ser aria-hidden`).toEqual([]);
  };
  await conferirAriaHidden("/fundamentos/two-pointers");

  await page.goto("/fundamentos/");
  const card = page
    .locator(".topic-card-wrap")
    .getByRole("checkbox", { name: "Marcar Two Pointers como concluído" });
  await expect(card).toHaveAccessibleName("Marcar Two Pointers como concluído");
  await conferirAriaHidden("/fundamentos");
});

// A VARREDURA DE CLASSE do achado acima.
//
// O revisor apontou UM `<button>` sem `type` (o da lista de problemas) e disse
// que `Shell` e `FundamentosGroups` "já usam". Medido no repositório inteiro, não
// usavam: das 211 tags `<button>` de `src/` e `content/`, só 5 declaravam
// `type`. Na fronteira desta casa — o chassi do site e a casca do visualizador —
// eram 10 sem, e não 1. As outras 196 vivem em `content/visualizers/`, que este
// PR não toca.
//
// O teste lê a PROPRIEDADE `type` e não o atributo, porque é ela que o navegador
// consulta na hora de decidir se o clique envia: um botão sem o atributo devolve
// `"submit"` aqui. E é ela que enxerga através do `{...spread}` — os dois botões
// da casca do visualizador (`⤢ Expandir` e `Mostrar código`) recebem as props de
// `blockButtonProps`/`expandButtonProps`, então nenhuma varredura de texto no
// código-fonte prova que eles foram consertados. Só o DOM prova.
//
// O piso de contagem (`minimo`) não é o teste — o teste é o `type` lido. Ele
// existe porque um seletor errado casa com zero elementos, e "nenhum botão
// errado entre zero botões" é verde vazio.
type Grupo = { sel: string; onde: string; minimo: number };

const CHASSI_TOPICO: Grupo[] = [
  { sel: ".header-menu-toggle", onde: "abrir o menu de tópicos (Shell)", minimo: 1 },
  { sel: ".nav-more .nav-icon", onde: "mais opções, no topo (Shell)", minimo: 1 },
  { sel: ".side-group-btn", onde: "abrir/fechar grupo da trilha (Shell)", minimo: 5 },
  { sel: ".side-check", onde: "quadradinho da trilha (Shell)", minimo: 1 },
  { sel: ".btn-concluir, .btn-concluir-lg", onde: "marcar tópico concluído (TopicComplete)", minimo: 1 },
  { sel: ".problem-check", onde: "quadradinho da lista de problemas (ProblemList)", minimo: 1 },
  // A casca do visualizador. `.viz-expand` cobre os DOIS botões espalhados;
  // `.viz-play` e `[aria-keyshortcuts]` cobrem o rodapé. Nenhuma dessas três
  // âncoras aparece em `content/visualizers/` (o `.viz-btn` sozinho aparece, em
  // 55 lugares, e por isso NÃO serve de seletor aqui).
  { sel: ".viz-expand", onde: "expandir / mostrar código (casca do visualizador)", minimo: 1 },
  { sel: ".viz-play", onde: "rodar/pausar (casca do visualizador)", minimo: 1 },
  { sel: ".viz-foot [aria-keyshortcuts]", onde: "anterior/próximo/rodar (casca)", minimo: 3 },
  { sel: '.viz-btn[aria-label="Reiniciar"]', onde: "reiniciar (casca do visualizador)", minimo: 1 },
];

const CHASSI_ROADMAP: Grupo[] = [
  { sel: ".header-menu-toggle", onde: "abrir o menu de tópicos (Shell)", minimo: 1 },
  { sel: ".tcard-check", onde: "quadradinho do card do roadmap (FundamentosGroups)", minimo: 10 },
];

async function varrer(page: Page, grupos: Grupo[], pagina: string) {
  const achado = await page.evaluate(
    (gs) =>
      gs.map((g) => {
        const els = Array.from(document.querySelectorAll<HTMLButtonElement>(g.sel));
        return {
          ...g,
          total: els.length,
          // Só o que está ERRADO volta, com nome acessível para o relatório
          // dizer QUAL botão, e não só quantos.
          errados: els
            .filter((el) => el.type !== "button")
            .map((el) => `${el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 28) ?? "?"} → type="${el.type}"`),
        };
      }),
    grupos
  );

  for (const g of achado) {
    expect(
      g.total,
      `${pagina}: o seletor \`${g.sel}\` (${g.onde}) casou com ${g.total} botões — menos que os ${g.minimo} esperados, então a varredura estaria verde por vazio`
    ).toBeGreaterThanOrEqual(g.minimo);
    expect(
      g.errados,
      `${pagina}: ${g.onde} — sem \`type="button"\` o padrão do HTML é \`submit\`, e dentro de um <form> o clique envia a página`
    ).toEqual([]);
  }
  console.log(`${pagina.padEnd(24)} ${achado.reduce((s, g) => s + g.total, 0)} botões do chassi conferidos`);
}

test("nenhum <button> do chassi nem da casca do visualizador é submit por omissão", async ({ page }) => {
  await page.goto("/fundamentos/two-pointers/");
  // A casca do visualizador só existe depois que o componente hidrata; sem
  // esperar, a varredura passaria por não achar nada (e o piso acusaria).
  await expect(page.locator(".viz-expand").first()).toBeVisible();
  await varrer(page, CHASSI_TOPICO, "/fundamentos/two-pointers");

  await page.goto("/fundamentos/");
  await expect(page.locator(".tcard-check").first()).toBeVisible();
  await varrer(page, CHASSI_ROADMAP, "/fundamentos");
});
