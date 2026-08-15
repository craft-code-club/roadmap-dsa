import { test, expect, type Locator } from "@playwright/test";
import { isEmptyTopic, TOPICOS } from "../content/topicos";
import { FUNDAMENTOS, roadmapGroups, roadmapTopics } from "../content/roadmaps";

test("home mostra o hero e leva para o Big O", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("aprofundamento em cada estrutura");
  await page.getByRole("link", { name: "Começar por Big O" }).click();
  await expect(page).toHaveURL(/roadmaps\/fundamentos\/big-o/);
  await expect(page.getByRole("heading", { level: 1, name: /Big O/ })).toBeVisible();
});

test("nav do topo abre os Fundamentos e um tópico", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Fundamentos", exact: true }).click();
  await expect(page).toHaveURL(/\/roadmaps\/fundamentos/);
  await expect(page.getByRole("heading", { level: 1, name: "Fundamentos" })).toBeVisible();
  await page.getByRole("link", { name: /Two Pointers/ }).first().click();
  await expect(page).toHaveURL(/roadmaps\/fundamentos\/two-pointers/);
});

test("página de tópico traz vídeo e problemas com links externos certos", async ({ page }) => {
  await page.goto("/topicos/sliding-window/");
  // A seção do vídeo chega como FACHADA: o `<iframe>` só nasce no clique
  // (`src/components/VideoFacade.tsx`), então contar `iframe` aqui daria zero.
  // Quem prova o clique, o teclado e a caixa é `tests/fachada-do-video.spec.ts`;
  // este teste só cobra que a seção esteja de pé na página.
  await expect(page.getByRole("button", { name: /^Assistir à aula: / })).toHaveCount(1);
  await expect(page.locator("iframe"), "o player nasceu sem ninguém pedir").toHaveCount(0);
  const problema = page.getByRole("link", { name: /Maximum Average Subarray I/ }).first();
  await expect(problema).toHaveAttribute("href", /leetcode\.com/);
});

test("CTAs de Discord e Apoiar apontam para os lugares certos", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Discord" }).first()).toHaveAttribute("href", /discord\.gg\//);
  await expect(page.getByRole("link", { name: "Apoiar", exact: true }).first()).toHaveAttribute("href", /\/apoie/);
});

test("no mobile, YouTube e Craft & Code Club ficam acessíveis pelo menu ⋯", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Mais opções" }).click();
  const menu = page.locator(".nav-menu");
  await expect(menu.getByRole("link", { name: /YouTube/ })).toBeVisible();
  await expect(menu.getByRole("link", { name: /Craft & Code Club/ })).toBeVisible();
});

test("tópico mostra Referências (links de artigos) quando existem", async ({ page }) => {
  await page.goto("/topicos/two-pointers/");
  await expect(page.getByRole("heading", { name: "Referências" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Floyd.s Cycle Finding Algorithm/ })).toHaveAttribute("href", /geeksforgeeks/);
});

test("página de apoio mostra apoiadores, parceiros e o link de doação", async ({ page }) => {
  await page.goto("/apoie/");
  await expect(page.getByRole("heading", { name: "Seja um apoiador da Comunidade" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Apoiadores" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Parceiros" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Quero apoiar/ }).first()).toHaveAttribute("href", /apoia\.se\/craftcodeclub/);
});

// O muro é montado da lista manual em apoiadores.ts enquanto a API da APOIA.se
// não libera os nomes. O que o teste prende é o contrato do muro, não os nomes:
// um card por apoiador, mais o card-convite, e a contagem do painel batendo com
// a quantidade de cards (já saiu "3 pessoas" com quatro nomes na lista).
test("muro de apoiadores: um card por pessoa, contagem batendo e convite no fim", async ({ page }) => {
  await page.goto("/apoie/");
  const cards = page.locator(".apoiador-card:not(.apoiador-card-cta)");
  const quantos = await cards.count();
  expect(quantos).toBeGreaterThan(0);

  const plural = quantos === 1 ? "pessoa já apoia" : "pessoas já apoiam";
  await expect(page.locator(".gratidao-titulo")).toHaveText(
    `${quantos} ${plural} a comunidade Craft & Code Club.`
  );

  // sigla do avatar: primeiro e último nome, sem a partícula do meio
  const primeiro = cards.first();
  const nome = (await primeiro.locator(".apoiador-nome").innerText()).trim();
  const partes = nome.split(/\s+/).filter((p) => !["de", "da", "do", "das", "dos", "e"].includes(p.toLowerCase()));
  const sigla = (partes[0][0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
  await expect(primeiro.locator(".apoiador-avatar")).toHaveText(sigla);

  const convite = page.locator(".apoiador-card-cta");
  await expect(convite).toHaveAttribute("href", /apoia\.se\/craftcodeclub/);
  await expect(convite).toContainText("Seu nome aqui");
});

test("Two Pointers é uma página completa com os três visualizadores e problemas", async ({ page }) => {
  await page.goto("/topicos/two-pointers/");
  // um visualizador por sabor da técnica: convergente, ritmos diferentes e Floyd
  await expect(page.getByRole("button", { name: /Rodar/ })).toHaveCount(3);
  await expect(page.getByText("ponteiros convergentes: dois números que somam o alvo")).toBeVisible();
  await expect(page.getByText("palíndromo com ponteiros em ritmos diferentes")).toBeVisible();
  await expect(page.getByText("existe ciclo na lista ligada?")).toBeVisible();
  await expect(page.getByRole("link", { name: /Two Sum II/ }).first()).toHaveAttribute("href", /leetcode\.com/);
  await expect(page.getByRole("link", { name: /Linked List Cycle/ }).first()).toHaveAttribute("href", /leetcode\.com/);
});

test("os três visualizadores de Two Pointers têm estado próprio e contam operações", async ({ page }) => {
  await page.goto("/topicos/two-pointers/");
  const passos = page.locator(".viz-step");
  await page.getByRole("button", { name: /Próximo/ }).first().click();
  // regex ancorada: "passo 2 de" também é prefixo de "passo 20 de", e o número
  // do passo é justamente o que este teste está afirmando.
  await expect(passos.first()).toHaveText(/^passo 2 de \d+$/);
  await expect(passos.nth(1)).toHaveText(/^passo 1 de \d+$/);
  // o preset do encontro fecha em 6 somas contra os 28 pares da força bruta
  const convergente = page.locator("figure.viz").filter({ hasText: "ponteiros convergentes" });
  await expect(convergente.getByText("pares na força bruta")).toBeVisible();
  // O card concatena rótulo e valor num nó só ("pares na força bruta28"), então
  // `toContainText("28")` passaria com 128. O <strong> guarda só o número.
  await expect(
    convergente.locator(".bigo-stat", { hasText: "pares na força bruta" }).locator("strong")
  ).toHaveText("28");
});

test("Strings traz os três visualizadores e os números do artigo batem com a tela", async ({ page }) => {
  await page.goto("/topicos/strings/");
  // montagem e rotate são passo a passo; o de bytes é painel de leitura
  await expect(page.getByRole("button", { name: /Rodar/ })).toHaveCount(2);
  await expect(page.getByText("o custo de montar uma string")).toBeVisible();
  await expect(page.getByText("caractere, code point e byte")).toBeVisible();
  await expect(page.getByText("Rotate String, força bruta contra o truque")).toBeVisible();

  // As três peças são escolhidas pelo TÍTULO, não pela posição no DOM: `.nth(1)`
  // amarra o teste à ordem do MDX e passa a testar outra peça se ela mudar.
  // E o valor sai do <strong>: "3 bytes" é substring de "13 bytes".
  const stat = (fig: Locator, rot: string) =>
    fig.locator(".bigo-stat", { hasText: rot }).locator("strong");

  // o painel de bytes abre em CCC: 3 bytes em UTF-8, 6 em UTF-16
  const bytes = page.locator("figure.viz").filter({ hasText: "caractere, code point e byte" });
  await expect(bytes.locator(".str-enc.on .str-enc-val")).toHaveText("3 bytes");
  await bytes.getByRole("button", { name: /^UTF-16/ }).click();
  await expect(bytes.locator(".str-enc.on .str-enc-val")).toHaveText("6 bytes");

  // o artigo promete 45 cópias com "s = s + c" e 9 com join para CRAFTCODE (n = 9)
  const montagem = page.locator("figure.viz").filter({ hasText: "o custo de montar uma string" });
  await expect(stat(montagem, "total com s = s + c")).toHaveText("45");
  await expect(stat(montagem, "total com join")).toHaveText("9");

  // rotate: o preset "caso feliz" acha na 2a rotação, com 18 caracteres copiados
  const rotate = page.locator("figure.viz").filter({ hasText: "Rotate String, força bruta" });
  await expect(stat(rotate, "pior caso com o laço")).toHaveText("45");
  await expect(stat(rotate, "pior caso com o truque")).toHaveText("10");

  await expect(page.getByRole("link", { name: "Rotate String", exact: true })).toHaveAttribute("href", /leetcode\.com/);
  await expect(page.getByRole("link", { name: "Longest Palindromic Substring", exact: true })).toHaveAttribute("href", /leetcode\.com/);
});

test("Tabelas Hash: os contadores da tela batem com os números do artigo", async ({ page }) => {
  await page.goto("/topicos/hash-table/");
  // dois passo a passo (inserção e a corrida lista x hash) + a tabela estática
  await expect(page.getByRole("button", { name: /Rodar/ })).toHaveCount(2);
  await expect(page.getByText("inserindo chaves numa tabela hash")).toBeVisible();
  await expect(page.getByText("busca linear x busca por hash")).toBeVisible();
  await expect(page.locator(".ht-tab-table tbody tr")).toHaveCount(4);

  // o artigo promete: anagramas colidem em 3 e custam 6 comparações
  const insercao = page.locator("figure.viz").filter({ hasText: "inserindo chaves numa tabela hash" });
  await insercao.getByRole("button", { name: "Anagramas: o pior caso" }).click();
  const proximo = insercao.getByRole("button", { name: /Próximo/ });
  // `isEnabled()` lê UMA vez: logo depois de trocar de preset ele ainda pode
  // devolver o estado desabilitado do fim da rodada anterior, o laço não clica e
  // o `toBeDisabled()` do fim passa sobre esse mesmo estado velho — a asserção
  // volta a ser vazia pelo outro lado da janela.
  await expect(proximo, "a animação não reiniciou: Próximo já começou desabilitado").toBeEnabled();
  // O laço sai CALADO se o limite estourar, e a asserção seguinte roda num passo
  // do meio. Exigir o botão desabilitado é o que transforma "andei até o fim" em
  // fato verificado.
  for (let i = 0; i < 60 && (await proximo.isEnabled()); i++) await proximo.click();
  await expect(proximo, "a animação não chegou ao fim dentro do limite do laço").toBeDisabled();
  // A nota inteira, não os dois pedaços: "3 colisões" é substring de "13
  // colisões" e "6 comparações" de "16 comparações", e os dois números são a
  // aula do preset. Ler a frase toda ainda pega o fator de carga do lado.
  await expect(insercao.locator(".viz-note")).toHaveText(
    "Fim: 4 chaves em 5 buckets, fator de carga 0,80. Deu 3 colisões e 6 comparações de chave no caminho todo."
  );

  // a corrida: com hash bom o pior caso com 1 milhão é 1; com hash ruim, 1 milhão
  const busca = page.locator("figure.viz").filter({ hasText: "busca linear x busca por hash" });
  const piorHash = busca.locator(".bigo-stat", { hasText: "pior caso · hash com 1 milhão" }).locator("strong");
  await expect(piorHash).toHaveText("1");
  await busca.getByRole("button", { name: /Hash ruim/ }).click();
  await expect(piorHash).toHaveText("1.000.000");

  await expect(page.getByRole("link", { name: "Design HashMap", exact: true })).toHaveAttribute(
    "href",
    /leetcode\.com/
  );
});

test("Sliding Window reúne janela fixa e variável na mesma página", async ({ page }) => {
  await page.goto("/topicos/sliding-window/");
  await expect(page.getByRole("heading", { level: 1, name: "Sliding Window" })).toBeVisible();
  // três visualizadores: o contraste com a força bruta e um para cada variação
  await expect(page.getByRole("button", { name: /Rodar/ })).toHaveCount(3);
  await expect(page.getByText("força bruta contra janela, no mesmo array")).toBeVisible();
  await expect(page.getByText("janela fixa, a maior soma de k elementos seguidos")).toBeVisible();
  await expect(page.getByText("janela variável, o maior subarray com soma ≤ k")).toBeVisible();
  // as duas instâncias têm estado próprio: avançar uma não mexe na outra
  const passos = page.locator(".viz-step");
  await page.getByRole("button", { name: /Próximo/ }).first().click();
  await expect(passos.first()).toHaveText(/^passo 2 de \d+$/);
  await expect(passos.nth(1)).toHaveText(/^passo 1 de \d+$/);
  // os problemas das duas variações convivem na mesma lista
  await expect(page.getByRole("link", { name: /Maximum Average Subarray I/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Minimum Size Subarray Sum/ }).first()).toBeVisible();
});

test("progresso dos slugs antigos de Sliding Window migra para o unificado", async ({ page }) => {
  // Quem concluiu a página antiga (fixa ou variável) tem que continuar concluído.
  await page.addInitScript(() => {
    localStorage.setItem("ccc-dsa-progresso", JSON.stringify({ "sliding-window-fixed": 1 }));
  });
  await page.goto("/topicos/sliding-window/");
  await expect(page.getByRole("button", { name: "✓ Concluído" }).first()).toBeVisible();
  // e a chave antiga sai do storage, em vez de virar lixo permanente
  const salvo = await page.evaluate(() => localStorage.getItem("ccc-dsa-progresso"));
  expect(JSON.parse(salvo!)).toEqual({ "sliding-window": 1 });
});

test("Big O traz o gráfico de crescimento, o contador de operações e a tabela de famílias", async ({ page }) => {
  await page.goto("/topicos/big-o/");
  // gráfico: o canvas existe e o marcador reage ao chip de uma família
  await expect(page.locator("canvas.bigo-canvas")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "O(n!)" })).toBeVisible();
  // contador: a casca padrão de visualizador, com passo a passo
  await expect(page.getByRole("button", { name: /Rodar/ })).toBeVisible();
  // tabela de famílias: estática, precisa estar no HTML mesmo sem JS
  await expect(page.locator(".bigo-fam-table tbody tr")).toHaveCount(8);
  await expect(page.getByRole("link", { name: /Big O Notation/ })).toHaveAttribute("href", /geeksforgeeks/);
});

// ---------------------------------------------------------------------------
// Casca adaptativa (.viz-fit), estreando no contador de operações do Big O.
//
// O que motivou: numa janela de notebook a peça pede mais altura do que existe,
// e o expandido rolava INTEIRO — o título e os botões de reprodução saíam da
// tela junto com o conteúdo, então o aluno perdia de vista justamente o
// "Próximo ›" que faz o algoritmo andar.
//
// Estes testes medem COMPORTAMENTO e leem RÓTULO: contar elemento não separa um
// código recolhido de um código que nunca renderizou, e um bloco que aparece
// com o botão ainda escrito "Mostrar código" ensina errado do mesmo jeito.
// ---------------------------------------------------------------------------

// A página do Big O tem DUAS peças na casca desde que o gráfico de curvas
// entrou, e o gráfico vem ANTES no DOM. `figure.viz-fit` sozinho casa 2: em
// `page.locator()` isso é violação de strict mode, e nos `querySelector` abaixo
// seria a peça errada EM SILÊNCIO — ela não tem `.viz-foot` nem `.viz-code`, e
// as medições sairiam nulas sem ninguém reclamar.
//
// O discriminante é o SLOT do bloco recolhível, não o bloco: `.viz-code-slot`
// existe porque a peça É recolhível (`collapsible: true`), enquanto o conteúdo
// dentro dele é o que um dia pode virar condicional. Medido nos quatro estados
// que estes testes atravessam — tela alta, tela baixa com o código já recolhido
// pela medição, código recolhido na mão e painel expandido —, ele casa 1 nos
// quatro: o contrato mantém o bloco no DOM mesmo recolhido, que é o que permite
// medir o pior caso de altura.
const CONTADOR = "figure.viz-fit:has(.viz-code-slot)";
const GRAFICO = "figure.viz-fit:has(canvas)";

test("Big O: o seletor do contador separa as duas peças da casca na página", async ({ page }) => {
  await page.goto("/topicos/big-o/");
  // Se algum dia esta asserção cair, é porque uma peça entrou ou saiu da casca
  // nesta página, e todo `CONTADOR` daqui para baixo precisa ser reconferido.
  await expect(page.locator("figure.viz-fit")).toHaveCount(2);
  await expect(page.locator(CONTADOR)).toHaveCount(1);
  await expect(page.locator(GRAFICO)).toHaveCount(1);
  // E são peças diferentes, lidas pelo rótulo do cabeçalho.
  await expect(page.locator(`${CONTADOR} .viz-head-title`)).toHaveText(
    "Visualizador · contando operações no mesmo array"
  );
  await expect(page.locator(`${GRAFICO} .viz-head-title`)).toHaveText(
    "Visualizador · como cada família cresce"
  );
});

/** Caixas do quadro, do cabeçalho e do rodapé + o estado da rolagem do miolo. */
function medirCasca(page: import("@playwright/test").Page) {
  return page.locator(CONTADOR).evaluate((fig) => {
    const cx = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { topo: Math.round(r.top), base: Math.round(r.bottom) };
    };
    const corpo = fig.querySelector(".viz-body") as HTMLElement;
    return {
      quadro: cx(fig),
      cabeca: cx(fig.querySelector(".viz-head")!),
      rodape: cx(fig.querySelector(".viz-foot")!),
      sobra: corpo.scrollHeight - corpo.clientHeight,
      rolagem: Math.round(corpo.scrollTop),
    };
  });
}

/** Altura visível do bloco de código (recolhido ele fica com os 2px da borda). */
function alturaCodigo(page: import("@playwright/test").Page) {
  return page
    .locator(`${CONTADOR} .viz-code`)
    .evaluate((el) => Math.round(el.getBoundingClientRect().height));
}

test("Big O expandido: cabeçalho e controles ficam parados, só o miolo rola", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 620 });
  await page.goto("/topicos/big-o/");

  const viz = page.locator(CONTADOR);
  await viz.getByRole("button", { name: /Expandir/ }).click();
  await expect(viz.getByRole("button", { name: /Fechar/ })).toBeVisible();

  // Abro o código na mão para garantir conteúdo maior que a janela: o teste é
  // sobre o que acontece QUANDO sobra conteúdo, não sobre a decisão automática.
  const alternar = viz.locator(".viz-toggle-codigo");
  if ((await alternar.textContent())?.includes("Mostrar")) await alternar.click();
  await expect(alternar).toHaveText("Ocultar código");

  // A altura do código anima em 0,32s: espero ela assentar antes de medir a
  // casca, senão eu mediria um layout a caminho do lugar.
  await expect.poll(async () => await alturaCodigo(page)).toBeGreaterThan(150);

  const antes = await medirCasca(page);
  expect(antes.sobra, "o miolo precisa ter mais conteúdo do que altura para o teste valer").toBeGreaterThan(20);
  // 1px de tolerância: a borda do quadro fica por fora do cabeçalho.
  expect(antes.cabeca.topo - antes.quadro.topo, "cabeçalho colado no topo do quadro").toBeLessThanOrEqual(2);
  expect(antes.quadro.base - antes.rodape.base, "rodapé colado na base do quadro").toBeLessThanOrEqual(2);

  // Rolar o miolo até o fim não pode levar a casca junto.
  await viz.locator(".viz-body").evaluate((el) => { el.scrollTop = el.scrollHeight; });
  const depois = await medirCasca(page);
  expect(depois.rolagem, "o miolo rolou de verdade").toBeGreaterThan(20);
  expect(depois.cabeca, "o cabeçalho se mexeu ao rolar").toEqual(antes.cabeca);
  expect(depois.rodape, "o rodapé se mexeu ao rolar").toEqual(antes.rodape);

  // E o que importa: os controles continuam à mão, com o rótulo certo.
  await expect(viz.getByRole("button", { name: /Rodar/ })).toBeInViewport();
  await expect(viz.locator(".viz-head-title")).toBeInViewport();

  // O artigo atrás fica travado: quem rola é o painel, não a página.
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");

  // Fechar devolve a rolagem da página.
  await viz.getByRole("button", { name: /Fechar/ }).click();
  await expect(page.locator(".viz-overlay")).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe("hidden");
});

test("Big O expandido: o Tab circula dentro do painel, como manda o aria-modal", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 620 });
  await page.goto("/topicos/big-o/");

  const viz = page.locator(CONTADOR);
  await viz.getByRole("button", { name: /Expandir/ }).click();
  await expect(viz.getByRole("button", { name: /Fechar/ })).toBeVisible();
  await expect(page.locator(".viz-overlay")).toHaveAttribute("aria-modal", "true");

  // Voltas suficientes para dar duas passadas na lista de focáveis: se o foco
  // escapasse uma única vez, o artigo por baixo receberia o Tab.
  const fugas: string[] = [];
  for (let i = 0; i < 24; i++) {
    await page.keyboard.press("Tab");
    const onde = await page.evaluate((sel) => {
      const a = document.activeElement;
      const fig = document.querySelector(sel);
      return { dentro: !!(fig && a && fig.contains(a)), quem: a?.className || a?.tagName || "?" };
    }, CONTADOR);
    if (!onde.dentro) fugas.push(`volta ${i + 1}: ${onde.quem}`);
  }
  expect(fugas, "o foco vazou do painel").toEqual([]);

  // E para trás também, que é o lado que costuma ficar de fora do laço.
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  expect(
    await page.evaluate((sel) => {
      const fig = document.querySelector(sel);
      return !!(fig && document.activeElement && fig.contains(document.activeElement));
    }, CONTADOR)
  ).toBe(true);

  // O código recolhido some para leitor de tela, não só para o teclado.
  const alternar = viz.locator(".viz-toggle-codigo");
  if ((await alternar.textContent())?.includes("Ocultar")) await alternar.click();
  await expect(alternar).toHaveText("Mostrar código");
  await expect(viz.locator(".viz-code")).toHaveAttribute("aria-hidden", "true");
  await alternar.click();
  await expect(viz.locator(".viz-code")).not.toHaveAttribute("aria-hidden", "true");
});

test("Big O expandido: setas andam o passo e espaço roda, sem atrapalhar quem digita", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/topicos/big-o/");

  const viz = page.locator(CONTADOR);
  await viz.getByRole("button", { name: /Expandir/ }).click();
  await expect(viz.getByRole("button", { name: /Fechar/ })).toBeVisible();
  const passo = viz.locator(".viz-step");
  await expect(passo).toHaveText("passo 1 de 7");

  // seta direita anda, seta esquerda volta
  await page.keyboard.press("ArrowRight");
  await expect(passo).toHaveText("passo 2 de 7");
  await page.keyboard.press("ArrowRight");
  await expect(passo).toHaveText("passo 3 de 7");
  await page.keyboard.press("ArrowLeft");
  await expect(passo).toHaveText("passo 2 de 7");

  // e não passa das pontas
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowLeft");
  await expect(passo).toHaveText("passo 1 de 7");

  // espaço roda e pausa, lido pelo rótulo do botão (que é o que promete o estado)
  const play = viz.locator(".viz-play");
  await expect(play).toHaveText(/Rodar/);
  await page.keyboard.press("Space");
  await expect(play).toHaveText(/Pausar/);
  await page.keyboard.press("Space");
  await expect(play).toHaveText(/Rodar/);

  // A parte que importa: com o cursor num campo, seta é cursor e espaço é
  // espaço. Sequestrar isso deixaria o array impossível de editar.
  const entrada = viz.locator(".viz-input").first();
  await entrada.click();
  const antes = await passo.textContent();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await expect(passo, "a seta foi sequestrada com o cursor no campo").toHaveText(antes!);

  // O espaço tem que chegar ao campo. Não asserto o passo aqui de propósito:
  // editar o array reinicia a animação por regra própria do componente, e
  // confundir uma coisa com a outra esconderia o sequestro em vez de pegá-lo.
  // Comparo o valor com ele mesmo em vez de olhar o fim da string: no macOS a
  // tecla End não leva o cursor ao fim do campo, então o espaço cai onde o
  // clique deixou o cursor. O que precisa ser verdade é que ele CHEGOU.
  const valorAntes = await entrada.inputValue();
  await page.keyboard.press("Space");
  await expect
    .poll(async () => (await entrada.inputValue()).length, { message: "o espaço não chegou ao campo" })
    .toBe(valorAntes.length + 1);
  await expect(play, "o espaço rodou a animação em vez de digitar").toHaveText(/Rodar/);

  // Mesma regra no controle de velocidade, onde a seta é do próprio slider.
  const veloc = viz.locator(".viz-speed input[type=range]");
  await veloc.focus();
  const vAntes = await veloc.inputValue();
  const pAntes = await passo.textContent();
  await page.keyboard.press("ArrowLeft");
  await expect(veloc, "a seta não chegou ao controle de velocidade").not.toHaveValue(vAntes);
  await expect(passo).toHaveText(pAntes!);
});

test("Big O: em tela baixa o código já abre recolhido, com as variáveis em uma linha", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 560 });
  await page.goto("/topicos/big-o/");

  const viz = page.locator(CONTADOR);
  const alternar = viz.locator(".viz-toggle-codigo");
  // O rótulo é a asserção: ele é a única coisa que promete ao aluno o que o
  // clique vai fazer.
  await expect(alternar).toHaveText("Mostrar código");
  await expect(alternar).toHaveAttribute("aria-expanded", "false");
  expect(await alturaCodigo(page), "o código deveria estar recolhido").toBeLessThan(8);

  // As variáveis viram fichas na mesma linha (é isso que a largura liberada
  // compra); e continuam legíveis, com nome e valor.
  const fichas = await viz.locator(".viz-var").evaluateAll((els) =>
    els.map((e) => ({
      topo: Math.round(e.getBoundingClientRect().top),
      texto: (e.textContent ?? "").trim(),
    }))
  );
  expect(fichas.length).toBeGreaterThanOrEqual(2);
  expect(new Set(fichas.map((f) => f.topo)).size, "as variáveis não ficaram na mesma linha").toBe(1);
  expect(fichas.map((f) => f.texto)).toContain("operações0");

  // E recolher tem que valer a pena: o bloco que saiu responde por altura de
  // verdade, não por 20px de nada.
  const recolhido = await viz.evaluate((f) => Math.round(f.getBoundingClientRect().height));
  await alternar.click();
  await expect(alternar).toHaveText("Ocultar código");
  await expect(alternar).toHaveAttribute("aria-expanded", "true");
  await expect
    .poll(async () => await alturaCodigo(page), { message: "o código não abriu ao clique" })
    .toBeGreaterThan(150);
  const aberto = await viz.evaluate((f) => Math.round(f.getBoundingClientRect().height));
  expect(aberto - recolhido, "esconder o código precisa devolver altura de verdade").toBeGreaterThan(150);
});

test("Big O: em tela alta o código já vem aberto, sem precisar de clique", async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 1400 });
  await page.goto("/topicos/big-o/");

  const viz = page.locator(CONTADOR);
  await expect(viz.locator(".viz-toggle-codigo")).toHaveText("Ocultar código");
  expect(await alturaCodigo(page), "com folga de altura o código não deveria sumir").toBeGreaterThan(200);
  // as 11 linhas da busca binária, não um bloco vazio com a borda certa
  await expect(viz.locator(".viz-line")).toHaveCount(11);
  await expect(viz.locator(".viz-code-head")).toContainText("busca_binaria.py");
});

test("Big O: a conta de altura lê o token do cabeçalho, não um número fixo", async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 1400 });
  await page.goto("/topicos/big-o/");

  const alternar = page.locator(`${CONTADOR} .viz-toggle-codigo`);
  await expect(alternar).toHaveText("Ocultar código"); // com essa altura, cabe

  // O cabeçalho fixo do site fica gigante: o orçamento de altura da peça
  // encolhe junto e ela deixa de caber. Com um 60 digitado no componente, nada
  // mudaria — e a conta ficaria descalibrada no dia em que o token mudasse.
  await page.evaluate(() => document.documentElement.style.setProperty("--ccc-header-h", "700px"));
  await page.setViewportSize({ width: 1500, height: 1399 }); // provoca medição nova
  await expect(alternar, "a medição ignorou o token --ccc-header-h").toHaveText("Mostrar código");
});

test("Big O: a escolha do aluno atravessa expandir e fechar", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 560 });
  await page.goto("/topicos/big-o/");

  const viz = page.locator(CONTADOR);
  const alternar = viz.locator(".viz-toggle-codigo");
  await expect(alternar).toHaveText("Mostrar código"); // a medição decidiu recolher
  await alternar.click();
  await expect(alternar).toHaveText("Ocultar código");
  await expect.poll(async () => await alturaCodigo(page)).toBeGreaterThan(100);

  // Abrir o painel não pode desfazer o clique: quem pediu o código quer o
  // código, e é justamente no painel que ele tem mais espaço para caber.
  await viz.getByRole("button", { name: /Expandir/ }).click();
  await expect(viz.getByRole("button", { name: /Fechar/ })).toBeVisible();
  await expect(alternar, "expandir desfez a escolha do aluno").toHaveText("Ocultar código");
  await expect
    .poll(async () => await alturaCodigo(page), { message: "o código sumiu ao expandir" })
    .toBeGreaterThan(100);

  // E fechar também não.
  await viz.getByRole("button", { name: /Fechar/ }).click();
  await expect(page.locator(".viz-overlay")).toHaveCount(0);
  await expect(alternar, "fechar desfez a escolha do aluno").toHaveText("Ocultar código");
  await expect
    .poll(async () => await alturaCodigo(page), { message: "o código sumiu ao fechar" })
    .toBeGreaterThan(100);

  // O caminho inverso vale igual: quem escondeu continua sem o bloco.
  await alternar.click();
  await expect(alternar).toHaveText("Mostrar código");
  await viz.getByRole("button", { name: /Expandir/ }).click();
  await expect(alternar, "expandir reabriu um bloco que o aluno fechou").toHaveText("Mostrar código");
});

test("Big O: a escolha do aluno vence a medição numa troca de estado", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 560 });
  await page.goto("/topicos/big-o/");

  const viz = page.locator(CONTADOR);
  const alternar = viz.locator(".viz-toggle-codigo");
  await expect(alternar).toHaveText("Mostrar código"); // a medição decidiu recolher
  await alternar.click();
  await expect(alternar).toHaveText("Ocultar código");

  // Trocar de algoritmo troca o código (2 a 11 linhas) e pediria uma medição
  // nova. Como o aluno já escolheu, a escolha dele manda.
  await viz.getByRole("button", { name: /Todos os pares/ }).click();
  await expect(viz.locator(".viz-code-head")).toContainText("tem_repetido.py");
  await expect(alternar).toHaveText("Ocultar código");
  await expect
    .poll(async () => await alturaCodigo(page), { message: "a escolha do aluno foi atropelada pela medição" })
    .toBeGreaterThan(100);

  // Estar aberto num instante não é a promessa: a promessa é CONTINUAR aberto,
  // e a medição que poderia desfazer a escolha chega em quadro posterior. Uma
  // espera fixa seguida de uma leitura só olharia o instante depois dela;
  // amostrar exige que nenhum dos instantes tenha recolhido, e a série entra na
  // mensagem quando falha.
  const alturas: number[] = [];
  for (let i = 0; i < 6; i++) {
    alturas.push(await alturaCodigo(page));
    await page.waitForTimeout(80);
  }
  expect(Math.min(...alturas), `o código recolheu sozinho: ${alturas.join(", ")}`).toBeGreaterThan(100);
});

test("no celular, o botão do código funciona no contador do Big O", async ({ page }) => {
  // Regressão: a regra `@media (max-width: 760px) { .viz-code { display: none } }`
  // apagava o bloco por CSS. Com o botão na tela, clicar nele não fazia nada —
  // o aluno de celular clicava e continuava sem código.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/topicos/big-o/");

  const viz = page.locator(CONTADOR);
  const alternar = viz.locator(".viz-toggle-codigo");
  await expect(alternar).toHaveText("Mostrar código");
  await alternar.click();
  await expect
    .poll(async () => await alturaCodigo(page), { message: "o código não apareceu no celular" })
    .toBeGreaterThan(150);
  expect(await page.evaluate(() => document.body.scrollWidth > window.innerWidth)).toBe(false);
});

test("marcar um tópico como concluído persiste na sessão", async ({ page }) => {
  await page.goto("/topicos/sliding-window/");
  // Há dois botões de concluir (topo e fim da página); ambos alternam juntos.
  await page.getByRole("button", { name: "Marcar como concluído" }).first().click();
  await expect(page.getByRole("button", { name: "✓ Concluído" }).first()).toBeVisible();
});

test("índice 'Nesta página' tem links âncora funcionais", async ({ page }) => {
  await page.goto("/topicos/sliding-window/");
  const toc = page.locator(".toc-links a").first();
  await expect(toc).toHaveAttribute("href", /^#.+/);
  // a âncora precisa existir na página (id no título correspondente)
  const href = await toc.getAttribute("href");
  await expect(page.locator(href!)).toHaveCount(1);
});

test("índice 'Nesta página' fica grudado ao rolar o artigo", async ({ page }) => {
  await page.goto("/topicos/prefix-sum/");
  const toc = page.locator(".toc");
  const rolarPara = async (y: number) => {
    await page.evaluate((alvo) => window.scrollTo({ top: alvo, behavior: "instant" }), y);
    await page.waitForFunction((alvo) => Math.abs(window.scrollY - alvo) < 2, y);
  };

  await rolarPara(1500);
  const antes = (await toc.boundingBox())!;
  await rolarPara(3500);
  const depois = (await toc.boundingBox())!;

  // grudado: a posição na janela não muda por mais que o artigo role
  expect(Math.round(depois.y)).toBe(Math.round(antes.y));
  // e para no offset que o próprio CSS declara (sem número mágico aqui)
  const topoDoSticky = await toc.evaluate((n) => parseFloat(getComputedStyle(n).top));
  expect(Math.round(depois.y)).toBe(Math.round(topoDoSticky));
  // e o índice nunca é mais alto que a janela (senão o fim dele ficaria inalcançável)
  expect(depois.height).toBeLessThanOrEqual(page.viewportSize()!.height);
});

// ---------------------------------------------------------------------------
// Rolagem ao trocar de página.
//
// O Next só desliga a rolagem suave durante a troca de rota se o `<html>` levar
// `data-scroll-behavior="smooth"` (é assim que ele sabe que o CSS do site pediu
// `scroll-behavior: smooth`). Sem o atributo, o "volta pro topo" saía do fim de
// um artigo de ~18000px ANIMADO, levava mais de um segundo — e qualquer toque no
// trackpad no meio do caminho cancelava a animação, deixando o leitor parado no
// meio do artigo novo. Era a rolagem que "às vezes vai, às vezes não".
//
// Por isso os dois testes medem a TRAJETÓRIA, e não a posição final: com a
// animação, o fim também é o topo — só que um segundo depois e cancelável.
// ---------------------------------------------------------------------------

/** Todas as posições de rolagem por quadro enquanto `acao` acontece. */
async function trajetoriaDaRolagem(
  page: import("@playwright/test").Page,
  acao: () => Promise<void>,
  ms = 1600
) {
  await page.evaluate((limite) => {
    const w = window as unknown as { __traj: number[] };
    w.__traj = [];
    const t0 = performance.now();
    const tick = () => {
      w.__traj.push(Math.round(window.scrollY));
      if (performance.now() - t0 < limite) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, ms);
  await acao();
  await page.waitForTimeout(ms + 200);
  return page.evaluate(() => (window as unknown as { __traj: number[] }).__traj);
}

const irParaOFimDaPagina = async (page: import("@playwright/test").Page) => {
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
  await page.waitForFunction(() => window.scrollY > 1000);
};

test("clicar em Próximo volta ao topo de uma vez, não numa animação cancelável", async ({ page }) => {
  await page.goto("/roadmaps/fundamentos/arrays/");
  await irParaOFimDaPagina(page);

  const proximo = page.locator(".prevnext a.next");
  const destino = await proximo.getAttribute("href");
  expect(destino, "o link do Próximo precisa apontar para um tópico").toBeTruthy();
  const traj = await trajetoriaDaRolagem(page, () => proximo.click());

  // Compara o caminho direto, sem montar RegExp com texto lido da página: um
  // href nulo viraria `/null$/` e um metacaractere mudaria o que o teste casa.
  expect(new URL(page.url()).pathname, "não abriu o tópico seguinte").toBe(destino);
  // O título vem do `href`, e não fixado no teste: quem é o tópico seguinte é
  // decisão do roadmap e pode mudar sem que este comportamento mude.
  await expect(page.locator(".topic-h1")).toBeVisible();

  const posicoes = [...new Set(traj)];
  expect(traj[traj.length - 1], "a página nova não abriu no topo").toBe(0);
  // Salto: fim → topo. Uma animação passaria por dezenas de posições no meio
  // (medido antes da correção: mais de 60), e é nesse meio que o trackpad do
  // leitor cancelava a rolagem. A folga cobre o ajuste do navegador quando a
  // página nova é mais curta e a rolagem é limitada antes do salto.
  expect(posicoes.length, `rolagem animada: passou por ${posicoes.length} posições`).toBeLessThanOrEqual(3);
});

test("a âncora do índice 'Nesta página' continua rolando suave", async ({ page }) => {
  // O atributo no `<html>` não pode custar o `scroll-behavior: smooth` do site:
  // ele existe para as âncoras do índice, que ficam ásperas sem a animação.
  //
  // A preferência é declarada, e não herdada da máquina: o `globals.css` desliga
  // a animação em `prefers-reduced-motion: reduce`, então numa máquina (ou num
  // runner) com movimento reduzido ligado este teste reprovaria por um motivo
  // que não é o dele. O caso do movimento reduzido tem teste próprio, logo abaixo.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/topicos/pilhas/");
  // A terceira âncora, e não a primeira: ela fica longe o bastante do topo para
  // a rolagem ter trajetória para medir. Confiro a contagem antes porque, se o
  // artigo encolher, a falha honesta é "o índice tem 2 âncoras" e não um erro
  // de clique em elemento que não existe.
  const ancoras = page.locator(".toc-links a");
  expect(await ancoras.count(), "o índice encolheu: escolha outra âncora").toBeGreaterThanOrEqual(3);
  const traj = await trajetoriaDaRolagem(page, () => ancoras.nth(2).click());

  const posicoes = [...new Set(traj)];
  expect(posicoes.length, "a âncora saltou em vez de rolar suave").toBeGreaterThan(5);
  expect(traj[traj.length - 1], "a âncora não saiu do topo").toBeGreaterThan(0);
});

test("com movimento reduzido, nada anima — e o destino é o mesmo", async ({ page }) => {
  // Quem pediu menos movimento no sistema não perde navegação nenhuma: a âncora
  // vai direto ao título e a troca de tópico abre no topo, sem animação para
  // ser cancelada no meio do caminho.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/roadmaps/fundamentos/pilhas/");
  const ancoras = page.locator(".toc-links a");
  expect(await ancoras.count(), "o índice encolheu: escolha outra âncora").toBeGreaterThanOrEqual(3);
  const traj = await trajetoriaDaRolagem(page, () => ancoras.nth(2).click());

  expect([...new Set(traj)].length, "animou mesmo com movimento reduzido").toBeLessThanOrEqual(3);
  expect(traj[traj.length - 1], "a âncora não chegou ao título").toBeGreaterThan(0);

  await irParaOFimDaPagina(page);
  await page.locator(".prevnext a.next").click();
  await expect(page.locator(".topic-h1")).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.scrollY)).toBe(0);
});

test("código Python sai colorido do build, com selo discreto da linguagem", async ({ page }) => {
  await page.goto("/topicos/prefix-sum/");
  // pega o bloco Python pelo conteúdo, não pela ordem: um bloco de outra
  // linguagem pode entrar antes dele no artigo sem quebrar o teste
  const bloco = page
    .locator(".code-block.com-lang")
    .filter({ has: page.locator("code.language-python") })
    .first();
  await expect(bloco.locator(".code-lang")).toHaveText("Python");
  // Shiki roda no build: o HTML já chega tokenizado (nada de highlight no cliente)
  await expect(bloco.locator("pre.shiki code.language-python")).toHaveCount(1);
  const cores = await bloco
    .locator("pre span[style*='color']")
    .evaluateAll((spans) => [...new Set(spans.map((s) => getComputedStyle(s).color))]);
  expect(cores.length).toBeGreaterThan(3);

  // diagrama em ASCII (cerca sem linguagem) continua sem selo e sem cor
  const semSelo = page.locator(".code-block:not(.com-lang)");
  expect(await semSelo.count()).toBeGreaterThan(0);
  await expect(semSelo.locator(".code-lang")).toHaveCount(0);
});

// ---------------------------------------------------------------------------
// Menu lateral: quais grupos abrem.
//
// Antes, o estado inicial era `{ introducao: true, "arrays-strings": true }`
// escrito no componente: toda recarga reabria esse par, em qualquer página, e o
// que o leitor tinha aberto ou fechado se perdia. Agora o menu abre o grupo de
// onde o leitor está (regra que não muda) e devolve o que ele mesmo escolheu.
// ---------------------------------------------------------------------------

/** Nomes dos grupos com o triângulo aberto, na ordem do menu. */
const gruposAbertos = (page: import("@playwright/test").Page) =>
  page.locator(".side-group").evaluateAll((gs) =>
    gs
      .filter((g) => g.querySelector(".side-caret.open"))
      .map((g) => g.querySelector(".side-group-btn span:nth-child(2)")?.textContent ?? "")
  );

/** Carimbo da memória do menu (0 quando ainda não há nada salvo). */
const carimboDoMenu = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem("ccc-dsa-menu") ?? "null");
      return typeof salvo?.em === "number" ? salvo.em : 0;
    } catch {
      return 0;
    }
  });

/**
 * O carimbo foi regravado NESTA carga? Duas condições, e as duas fazem falta:
 *
 * - avançou em relação ao de antes da navegação, senão uma recarga aprovaria
 *   com o carimbo que a carga anterior já tinha deixado fresco;
 * - é recente, senão o carimbo que o próprio teste semeia (com horas de idade,
 *   e escrito pelo `addInitScript` antes de qualquer script da página) já
 *   aprovaria a espera antes da hidratação — que é justamente o flake.
 */
const carimboRegravado = (page: import("@playwright/test").Page, antes: number) =>
  page.evaluate((anterior) => {
    try {
      const salvo = JSON.parse(localStorage.getItem("ccc-dsa-menu") ?? "null");
      const em = typeof salvo?.em === "number" ? salvo.em : 0;
      return em > anterior && Date.now() - em < 60_000;
    } catch {
      return false;
    }
  }, antes);

/**
 * Navega (ou recarrega) e só devolve quando o menu terminou de restaurar.
 *
 * O HTML estático chega com o grupo da rota aberto; os grupos que o leitor tinha
 * deixado abertos entram depois, num efeito. Conferir logo após o `goto` lê o
 * menu de antes da hidratação — foi assim que este bloco ficou instável no CI,
 * passando na segunda tentativa só porque ela foi mais lenta.
 *
 * O sinal de "já restaurou" é o carimbo: o efeito que salva regrava `em` a cada
 * carga, então esperar o carimbo ser REGRAVADO nesta carga é um fato do
 * aplicativo, e não um tempo chutado. O que conta como regravado está em
 * `carimboRegravado` — e as duas condições de lá são o que impede a espera de
 * aprovar o menu de antes da hidratação.
 */
async function abrirComMenuPronto(
  page: import("@playwright/test").Page,
  rota: string | "recarregar"
) {
  const antes = await carimboDoMenu(page);
  if (rota === "recarregar") await page.reload();
  else await page.goto(rota);
  await expect
    .poll(() => carimboRegravado(page, antes), { message: "o menu não terminou de restaurar" })
    .toBe(true);
}

test("o menu abre o grupo da página, não um par fixo de grupos", async ({ page }) => {
  await abrirComMenuPronto(page, "/roadmaps/fundamentos/arrays/");
  // Arrays e Strings porque é onde o leitor está; Introdução não entra de carona.
  expect(await gruposAbertos(page)).toEqual(["Arrays e Strings"]);

  // Em um tópico do fim da lista, o mesmo: só o grupo dele. O storage é limpo
  // porque a visita acima já virou histórico — e histórico o menu devolve de
  // propósito (é o outro teste); aqui o que se mede é a primeira visita.
  await page.evaluate(() => localStorage.clear());
  await abrirComMenuPronto(page, "/roadmaps/fundamentos/backtracking/");
  expect(await gruposAbertos(page)).toEqual(["Backtracking"]);
});

test("o menu lembra os grupos que o leitor abriu, e o da página abre junto", async ({ page }) => {
  await abrirComMenuPronto(page, "/roadmaps/fundamentos/arrays/");
  await page.locator(".side-group-btn", { hasText: "Grafos" }).click();
  await expect(page.locator(".side-item[href='/roadmaps/fundamentos/dijkstra/']")).toBeVisible();

  // F5 na mesma página: a escolha volta, e o grupo da rota continua aberto.
  await abrirComMenuPronto(page, "recarregar");
  expect(await gruposAbertos(page)).toEqual(["Arrays e Strings", "Grafos"]);

  // Fechar também é escolha: o grupo fica fechado depois da recarga.
  await page.locator(".side-group-btn", { hasText: "Grafos" }).click();
  await abrirComMenuPronto(page, "recarregar");
  expect(await gruposAbertos(page)).toEqual(["Arrays e Strings"]);
});

// A memória do menu vale por um dia. Estes três testes cobrem os dois lados do
// prazo e o detalhe que faz ele valer a pena: o carimbo é da ÚLTIMA visita, e
// não da primeira gravação, senão quem estuda todo dia perderia o menu no
// segundo dia sem nunca ter ficado longe.
const memoriaDoMenu = (page: import("@playwright/test").Page, ids: string[], horasAtras: number) =>
  page.addInitScript(
    ([ids, horas]) => {
      localStorage.setItem(
        "ccc-dsa-menu",
        JSON.stringify({ abertos: ids, em: Date.now() - (horas as number) * 60 * 60 * 1000 })
      );
    },
    [ids, horasAtras] as [string[], number]
  );

test("dentro do dia, o menu devolve o que o leitor tinha aberto", async ({ page }) => {
  await memoriaDoMenu(page, ["grafos"], 23);
  await abrirComMenuPronto(page, "/roadmaps/fundamentos/arrays/");
  expect(await gruposAbertos(page)).toEqual(["Arrays e Strings", "Grafos"]);
});

test("passado um dia, o menu volta ao padrão da página", async ({ page }) => {
  // Quem some por três dias não lembra por que aqueles grupos estavam abertos.
  await memoriaDoMenu(page, ["grafos", "heaps"], 25);
  await abrirComMenuPronto(page, "/roadmaps/fundamentos/arrays/");
  expect(await gruposAbertos(page)).toEqual(["Arrays e Strings"]);

  // E em página sem grupo próprio sobra o grupo de abertura, não o menu vazio.
  await abrirComMenuPronto(page, "/");
  expect(await gruposAbertos(page)).toEqual(["Introdução"]);
});

test("o prazo conta da última visita: voltar hoje renova a memória", async ({ page }) => {
  await memoriaDoMenu(page, ["grafos"], 20);
  await abrirComMenuPronto(page, "/roadmaps/fundamentos/arrays/");
  expect(await gruposAbertos(page)).toEqual(["Arrays e Strings", "Grafos"]);

  // O carimbo que ficou gravado é de agora, e não o de 20 horas atrás: amanhã
  // esta mesma pessoa ainda encontra o menu como deixou.
  const idadeEmMinutos = await page.evaluate(
    () => (Date.now() - JSON.parse(localStorage.getItem("ccc-dsa-menu")!).em) / 60000
  );
  expect(idadeEmMinutos, "o carimbo não foi renovado na visita").toBeLessThan(1);
});

test("o grupo da página atual abre mesmo que estivesse fechado", async ({ page }) => {
  // Cenário do leitor que fechou tudo e depois abriu um tópico de outro grupo.
  await memoriaDoMenu(page, ["hashing"], 1);
  await abrirComMenuPronto(page, "/roadmaps/fundamentos/dijkstra/");
  expect(await gruposAbertos(page)).toEqual(["Hashing", "Grafos"]);
  await expect(page.locator(".side-item.on")).toHaveText(/Dijkstra/);
});

test("quem chega sem histórico vê o primeiro grupo aberto, e só ele", async ({ page }) => {
  await abrirComMenuPronto(page, "/");
  expect(await gruposAbertos(page)).toEqual(["Introdução"]);

  // E o grupo de abertura é só o padrão de quem não tem nada salvo: em página
  // sem grupo próprio (home, roadmap, apoiar), quem já escolheu vê a escolha
  // dele, e não a dele mais a Introdução de brinde. A memória entra com algumas
  // horas de idade (e não com o carimbo de agora) para a espera continuar tendo
  // o que esperar: o carimbo novo é o que prova que o menu já restaurou.
  await memoriaDoMenu(page, ["grafos"], 2);
  await abrirComMenuPronto(page, "/");
  expect(await gruposAbertos(page)).toEqual(["Grafos"]);
});

test("o menu rola sozinho até o tópico atual quando ele fica fora da vista", async ({ page }) => {
  // Com os outros grupos fechados, um tópico do fim da lista ainda pode cair
  // abaixo da dobra do menu — e aí o leitor não vê onde está.
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto("/roadmaps/fundamentos/negative-binary/");

  // Quem rola é um efeito, que roda depois da hidratação: ler uma vez logo após
  // o `goto` mediria o menu antes de ele existir como React. A espera é sobre a
  // rolagem em si, e não um `waitForTimeout` torcendo pelo tempo certo.
  await expect
    .poll(async () => page.evaluate(() => document.querySelector(".side-scroll")!.scrollTop), {
      message: "o menu deveria ter rolado para alcançar o tópico",
    })
    .toBeGreaterThan(0);

  const visivel = await page.evaluate(() => {
    const lista = document.querySelector(".side-scroll")!;
    const atual = lista.querySelector(".side-item.on")!;
    const a = atual.getBoundingClientRect();
    const c = lista.getBoundingClientRect();
    return a.top >= c.top - 1 && a.bottom <= c.bottom + 1;
  });
  expect(visivel, "o tópico atual ficou fora da parte visível do menu").toBe(true);
  // e quem rolou foi o menu, não a página
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("Fundamentos, Apoiar e Introdução mostram onde o leitor está", async ({ page }) => {
  // Regressão: com `trailingSlash: true` a rota chega como "/roadmaps/fundamentos/", e a
  // comparação crua com o href deixava a barra do topo sempre apagada.
  await page.goto("/roadmaps/fundamentos/");
  await expect(page.locator(".nav-left a.on")).toHaveText("Fundamentos");
  await page.goto("/apoie/");
  await expect(page.locator(".nav-right a.on")).toContainText("Apoiar");
  await page.goto("/introducao/");
  await expect(page.locator(".side-item.on")).toHaveText(/Introdução/);
});

test("selo NOVO segue a tag isNew, não a existência de visualizador", async ({ page }) => {
  // O menu é do ROADMAP: ele só mostra o selo dos tópicos que ESTE roadmap
  // cita. Os outros marcados (hoje `bloom-filter`, `union-find` e `trie`, que
  // vivem em roadmaps extras) aparecem no menu deles, e o filtro abaixo é o que
  // diz isso — sem ele, o teste cobraria dos Fundamentos um selo que é de outro
  // percurso, e a correção "óbvia" seria tirar a tag do tópico.
  const marcados = roadmapTopics(FUNDAMENTOS).filter((t) => t.isNew);
  expect(marcados.length, "nenhum tópico marcado nos Fundamentos: o teste não prova nada").toBeGreaterThan(0);
  await page.goto("/roadmaps/fundamentos/big-o/");

  // abre todo grupo ainda fechado, para que os selos de todos os tópicos contem
  const grupos = page.locator(".side-group");
  for (let i = 0; i < (await grupos.count()); i++) {
    const g = grupos.nth(i);
    if ((await g.locator(".side-caret.open").count()) === 0) await g.locator(".side-group-btn").click();
  }

  await expect(page.locator(".side-item .badge-novo")).toHaveCount(marcados.length);
  for (const t of marcados) {
    await expect(page.locator(`.side-item[href="/roadmaps/fundamentos/${t.slug}/"] .badge-novo`)).toBeVisible();
  }
});

test("página de introdução explica o guia e leva ao primeiro tópico", async ({ page }) => {
  await page.goto("/introducao/");
  await expect(page.getByRole("heading", { level: 1, name: "Por onde começar" })).toBeVisible();
  await page.getByRole("link", { name: "Começar por Big O" }).click();
  await expect(page).toHaveURL(/roadmaps\/fundamentos\/big-o/);
});

// Cobertura de todos os tópicos "ready": em vez de um teste artesanal por
// página, este bloco garante o contrato que toda página completa precisa
// cumprir. Quatro guardas consomem esta lista — o contrato de página abaixo, os
// controles de reprodução, o colapso de painel no celular e o overflow no
// mobile.
//
// A LISTA DE SLUGS É DERIVADA de `TOPICOS`, não escrita à mão. Escrita à mão
// ela envelhece em silêncio: promover um tópico sem lembrar de acrescentá-lo
// aqui deixa a página nova fora dos QUATRO guardas de uma vez, com o CI verde e
// nenhum sinal de que faltou alguma coisa.
//
// `TOPICOS`, e não `TOPICOS`: a página de um tópico de trilha e a de uma
// tópico avulso saem do MESMO template das do roadmap, e o contrato que este
// bloco cobra é do template. Com a lista do roadmap aqui, os 31 tópicos de fora
// dela ficariam sem os quatro guardas — inclusive o de overflow no celular, que
// é o único teste de mobile que uma página de artigo tem.
//
// O que continua à mão é a DESCRIÇÃO de cada tópico, e de propósito:
//
// - `h1` é conferência independente. Derivá-lo de `t.name` viraria tautologia,
//   porque a página renderiza `t.name` — o teste passaria a comparar o dado com
//   ele mesmo e pararia de pegar título trocado;
// - `vizMin` não existe na fonte: `viz` é o nome de UM visualizador, não a
//   contagem dos que o MDX de fato instancia. E `0` é um valor legítimo: as
//   páginas escritas fora do roadmap (Union-Find, Trie, Bloom Filter) ainda não
//   têm visualizador, e o piso delas é zero até alguém escrever um. Elas
//   continuam passando pelos outros três guardas.
const DESCRICAO: Record<string, { h1: string; vizMin: number }> = {
  "big-o": { h1: "Notação Big O", vizMin: 2 },
  arrays: { h1: "Arrays e Listas", vizMin: 3 },
  strings: { h1: "Strings", vizMin: 3 },
  "subarray-substring-subsequence-subset": { h1: 'Os 4 "sub"', vizMin: 1 },
  "two-pointers": { h1: "Two Pointers", vizMin: 3 },
  "sliding-window": { h1: "Sliding Window", vizMin: 3 },
  "prefix-sum": { h1: "Prefix Sum", vizMin: 2 },
  intervals: { h1: "Intervalos", vizMin: 2 },
  "hash-table": { h1: "Tabelas Hash", vizMin: 2 },
  "listas-ligadas": { h1: "Listas Encadeadas", vizMin: 3 },
  "skip-list": { h1: "Skip List", vizMin: 2 },
  pilhas: { h1: "Pilhas (Stacks)", vizMin: 3 },
  filas: { h1: "Filas e Deques", vizMin: 3 },
  recursao: { h1: "Recursão: Fundamentos", vizMin: 2 },
  "recursao-funcional": { h1: "Recursão: Programação Funcional", vizMin: 2 },
  "tree-traversals": { h1: "Percursos em Árvore (DFS/BFS)", vizMin: 1 },
  "arvores-binarias": { h1: "Árvores Binárias", vizMin: 1 },
  "n-ary-trees": { h1: "Árvores N-árias", vizMin: 1 },
  bst: { h1: "Árvore de Busca Binária", vizMin: 1 },
  "grafos-intro": { h1: "Introdução a Grafos", vizMin: 1 },
  "dfs-bfs": { h1: "DFS e BFS em Grafos", vizMin: 1 },
  dijkstra: { h1: "Dijkstra", vizMin: 1 },
  "bellman-ford": { h1: "Bellman-Ford", vizMin: 1 },
  "a-star": { h1: "A* (A Estrela)", vizMin: 1 },
  "topological-sort": { h1: "Ordenação Topológica", vizMin: 1 },
  mst: { h1: "Árvore Geradora Mínima (MST)", vizMin: 1 },
  "binary-heap": { h1: "Binary Heap", vizMin: 2 },
  "heap-sort": { h1: "Heap Sort", vizMin: 2 },
  "busca-binaria": { h1: "Busca Binária", vizMin: 3 },
  "ordenacao-basica": { h1: "Ordenação Básica", vizMin: 3 },
  "merge-sort": { h1: "Merge Sort", vizMin: 3 },
  "quick-sort": { h1: "Quick Sort", vizMin: 3 },
  "shell-sort": { h1: "Shell Sort", vizMin: 3 },
  backtracking: { h1: "Backtracking", vizMin: 3 },
  "binary-numbers": { h1: "Números Binários", vizMin: 3 },
  "negative-binary": { h1: "Binários Negativos", vizMin: 3 },
  // Fora do roadmap (content/roadmaps.ts). Sem visualizador ainda: o artigo é o
  // conteúdo inteiro, e `vizMin: 0` diz isso em vez de fingir um piso.
  "union-find": { h1: "Union-Find (DSU)", vizMin: 0 },
  trie: { h1: "Trie (Árvore de Prefixos)", vizMin: 0 },
  "bloom-filter": { h1: "Bloom Filter", vizMin: 0 },
};

// O fallback existe para que um tópico recém-promovido JÁ ENTRE nos quatro
// guardas, mesmo antes de alguém descrevê-lo: `t.name` é o que a página
// renderiza e `vizMin: 1` é o piso de qualquer página completa. Quem avisa que
// falta descrever é o teste logo abaixo, e ele reprova alto.
const TOPICOS_PRONTOS = TOPICOS.filter((t) => t.status === "ready").map((t) => ({
  slug: t.slug,
  h1: DESCRICAO[t.slug]?.h1 ?? t.name,
  vizMin: DESCRICAO[t.slug]?.vizMin ?? 1,
}));

test("todo tópico 'ready' está descrito na tabela dos guardas de contrato", () => {
  const prontos = TOPICOS.filter((t) => t.status === "ready").map((t) => t.slug);
  const semDescricao = prontos.filter((s) => !DESCRICAO[s]);
  const descritosDeMais = Object.keys(DESCRICAO).filter((s) => !prontos.includes(s));

  // Promoveu um tópico? Ele já está rodando nos quatro guardas pelo fallback.
  // O que falta é o `h1` e o `vizMin` de verdade, que são a parte que o dado
  // não tem: sem eles, o contrato daquela página é o piso e não o dela.
  expect(
    semDescricao,
    "tópicos promovidos a 'ready' sem entrada em DESCRICAO (acrescente h1 e vizMin)"
  ).toEqual([]);
  // E o contrário: entrada que sobrou aponta slug renomeado ou tópico que
  // voltou para 'soon', e vira teste que nunca mais visita página nenhuma.
  expect(
    descritosDeMais,
    "entradas de DESCRICAO que não correspondem a nenhum tópico 'ready'"
  ).toEqual([]);
  expect(TOPICOS_PRONTOS).toHaveLength(prontos.length);
});

for (const t of TOPICOS_PRONTOS) {
  test(`tópico ${t.slug} entrega artigo, visualizadores e âncoras válidas`, async ({ page }) => {
    await page.goto(`/topicos/${t.slug}/`);
    await expect(page.getByRole("heading", { level: 1, name: t.h1 })).toBeVisible();

    // o artigo existe de verdade (não é o cartão de "em construção")
    await expect(page.locator(".soon-badge")).toHaveCount(0);
    expect(await page.locator("article h2").count()).toBeGreaterThanOrEqual(5);

    // os visualizadores chegaram na página
    expect(await page.locator("article figure.viz").count()).toBeGreaterThanOrEqual(t.vizMin);

    // toda entrada do índice "Nesta página" aponta para uma âncora existente
    const hrefs = await page.locator(".toc-links a").evaluateAll((as) =>
      as.map((a) => a.getAttribute("href") ?? "")
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      await expect(page.locator(href)).toHaveCount(1);
    }

    // problemas e referências apontam para fora
    await expect(page.locator(".problem-name").first()).toHaveAttribute("href", /^https?:\/\//);
  });
}

test("percursos em árvore: trocar a ordem muda a saída, não o caminho", async ({ page }) => {
  await page.goto("/topicos/tree-traversals/");
  const viz = page.locator("figure.viz").first();
  const irAteOFim = async () => {
    const proximo = viz.getByRole("button", { name: "Próximo ›" });
    // Este helper roda logo depois de trocar a ordem do percurso, que é o caso
    // exato em que a leitura única de `isEnabled()` devolve o estado da rodada
    // anterior e o laço inteiro é pulado.
    await expect(proximo, "a animação não reiniciou: Próximo já começou desabilitado").toBeEnabled();
    for (let i = 0; i < 60 && (await proximo.isEnabled()); i++) await proximo.click();
    // Sem isto o laço sai calado quando o limite estoura e a saída é lida num
    // passo do meio — que, num percurso, é um prefixo válido da lista esperada.
    await expect(proximo, "a animação não chegou ao fim dentro do limite do laço").toBeDisabled();
  };

  // as quatro sequências da árvore do artigo (raiz 1, esquerda 2 com 4 e 5, direita 3 com 6)
  const esperado: Record<string, string[]> = {
    "Pré-ordem": ["1", "2", "4", "5", "3", "6"],
    "Em ordem": ["4", "2", "5", "1", "6", "3"],
    "Pós-ordem": ["4", "5", "2", "6", "3", "1"],
    "Por nível (BFS)": ["1", "2", "3", "4", "5", "6"],
  };
  for (const [ordem, saida] of Object.entries(esperado)) {
    // exact: true porque o chip "Em ordem" colide com o preset "Uma BST: em ordem sai ordenado"
    await viz.getByRole("button", { name: ordem, exact: true }).click();
    await irAteOFim();
    // asserção web-first: reconsulta até a saída completa aparecer, em vez de
    // ler uma vez e torcer para o React já ter renderizado o último passo
    await expect(viz.locator(".tt-saida-item"), `${ordem} deveria sair ${saida.join(" ")}`).toHaveText(saida);
  }
});

test("BST: a mesma sequência inserida em ordem degenera a árvore", async ({ page }) => {
  await page.goto("/topicos/bst/");
  const viz = page.locator("figure.viz").first();
  // O texto do card é rótulo + valor concatenados ("altura3"), então a regex
  // ancorada casa só o card certo: "altura mínima3" não bate. Evita tanto o
  // `.first()` por ordem de DOM quanto o locator aninhado do `has`.
  const altura = async () => {
    const txt = await viz.locator(".bigo-stat").filter({ hasText: /^altura\d/ }).textContent();
    return parseInt((txt ?? "").replace(/\D+/g, ""), 10);
  };
  await viz.getByRole("button", { name: /Inserindo pelo meio/ }).click();
  const balanceada = await altura();
  await viz.getByRole("button", { name: /Inserindo ordenado/ }).click();
  const degenerada = await altura();
  // mesmos 7 valores: pelo meio dá altura 3, ordenado dá 7
  expect(balanceada).toBe(3);
  expect(degenerada).toBe(7);
});

test("MST: Kruskal e Prim fecham no mesmo peso total", async ({ page }) => {
  await page.goto("/topicos/mst/");
  const viz = page.locator("figure.viz").first();
  const pesos = viz.locator(".viz-var", { hasText: /Kruskal|Prim/ });
  const textos = await pesos.allTextContents();
  // extrai o último inteiro COM sinal: tirar todos os não-dígitos perderia o
  // menos de um peso negativo e concatenaria números se o card tivesse dois
  const numeros = textos.map((t) => {
    const achados = t.match(/-?\d+/g);
    return achados ? parseInt(achados[achados.length - 1], 10) : NaN;
  });
  expect(numeros).toHaveLength(2);
  expect(numeros[0]).toBe(numeros[1]);
});

test("heap: inserir, remover e construir contam trabalho diferente sobre os mesmos dados", async ({ page }) => {
  await page.goto("/topicos/binary-heap/");
  const viz = page.locator("figure.viz").filter({ hasText: "a árvore e o array do heap se movendo juntos" });
  const proximo = viz.getByRole("button", { name: "Próximo ›" });
  // O laço sai calado se o limite estourar, e aí a asserção seguinte roda num
  // passo do meio. Pior: `trocas` vale 0 no passo 0 de TODO preset, então
  // `toBe(0)` passaria sem um único clique. Exigir o botão desabilitado no fim
  // é o que transforma "andei até o fim" em fato verificado.
  const irAteOFim = async () => {
    // `isEnabled()` lê UMA vez e não reconsulta, então logo após trocar de preset
    // ele ainda pode devolver o estado desabilitado do fim da rodada anterior. Aí
    // o laço não clica e o `toBeDisabled()` passa sobre esse mesmo estado velho:
    // a asserção volta a ser vazia por outro caminho. A espera web-first abaixo é
    // o que garante que a animação reiniciou antes de o laço começar.
    await expect(proximo, "a animação não reiniciou: Próximo já começou desabilitado").toBeEnabled();
    for (let i = 0; i < 120 && (await proximo.isEnabled()); i++) await proximo.click();
    await expect(proximo, "a animação não chegou ao fim dentro do limite do laço").toBeDisabled();
  };
  // O texto do card é rótulo + valor concatenados ("trocas16"), então a regex
  // ancorada casa só o card certo e evita depender da ordem no DOM.
  const trocas = async () => {
    const txt = await viz.locator(".bigo-stat").filter({ hasText: /^trocas\d/ }).textContent();
    return parseInt((txt ?? "").replace(/\D+/g, ""), 10);
  };

  // Os MESMOS nove valores: em ordem crescente o min-heap não move ninguém,
  // ao contrário todo valor que chega vira o novo mínimo e sobe até a raiz.
  await viz.getByRole("button", { name: /Chegando em ordem/ }).click();
  await irAteOFim();
  expect(await trocas()).toBe(0);

  await viz.getByRole("button", { name: /Chegando ao contrário/ }).click();
  await irAteOFim();
  expect(await trocas()).toBe(16);

  // E o max-heap inverte exatamente os papéis, o que prova que o custo vem da
  // ordem de chegada e não dos dados.
  await viz.getByRole("button", { name: "max-heap" }).click();
  await irAteOFim();
  expect(await trocas()).toBe(0);
});

// Regressão: o salto para o primeiro passo com árvore de verdade rodava só na
// inicialização do estado, então trocar de preset ou de modo e voltar caía no
// passo do nó solto, que é justamente o estado vazio que o salto existe para
// evitar. Agora toda troca de animação reabre no mesmo ponto, e o ↺ continua
// sendo o único caminho para o passo zero.
test("heap: trocar preset ou modo reabre com árvore, não com um nó solto", async ({ page }) => {
  await page.goto("/topicos/binary-heap/");
  const viz = page.locator("figure.viz").filter({ hasText: "a árvore e o array do heap se movendo juntos" });
  const nos = viz.locator("svg g.tt-no");

  await expect(nos).toHaveCount(4); // ao abrir

  await viz.getByRole("button", { name: "remover o topo" }).click();
  await expect(nos).toHaveCount(6); // remover já começa com o heap cheio

  await viz.getByRole("button", { name: "inserir", exact: true }).click();
  await expect(nos).toHaveCount(4); // e voltar para inserir não cai no nó solto

  await viz.getByRole("button", { name: /Chegando ao contrário/ }).click();
  await expect(nos).toHaveCount(4);

  await viz.getByRole("button", { name: "max-heap" }).click();
  await expect(nos).toHaveCount(4);

  // ↺ é o único que volta ao começo de verdade, que é o heap vazio
  await viz.getByRole("button", { name: "Reiniciar" }).click();
  await expect(nos).toHaveCount(1);
});

test("heap: remover o topo repetidamente devolve os valores em ordem", async ({ page }) => {
  await page.goto("/topicos/binary-heap/");
  const viz = page.locator("figure.viz").filter({ hasText: "a árvore e o array do heap se movendo juntos" });
  await viz.getByRole("button", { name: "remover o topo" }).click();
  const proximo = viz.getByRole("button", { name: "Próximo ›" });
  await expect(proximo, "a animação não reiniciou: Próximo já começou desabilitado").toBeEnabled();
  for (let i = 0; i < 200 && (await proximo.isEnabled()); i++) await proximo.click();
  await expect(proximo, "a animação não chegou ao fim dentro do limite do laço").toBeDisabled();
  // asserção web-first: reconsulta até a saída completa aparecer
  await expect(viz.locator(".tt-saida-item")).toHaveText(["1", "2", "3", "4", "5", "6"]);
});

test("índices do heap: clicar num nó acende pai e filhos com as contas certas", async ({ page }) => {
  await page.goto("/topicos/binary-heap/");
  // a tabela de escolha de estrutura é estática e não entra na contagem de viz
  await expect(page.locator("article figure.bigo-fam")).toHaveCount(1);
  const viz = page.locator("figure.viz").filter({ hasText: "clique num nó e veja de onde saem pai e filhos" });

  // O mesmo índice é clicável no array e na árvore, com o mesmo aria-label, então
  // o locator precisa ser escopado para não casar os dois de uma vez.
  await viz.locator(".hp-arr").getByRole("button", { name: "Índice 4, valor" }).click();
  await expect(viz.locator(".hp-formula-conta").first()).toHaveText("(4 - 1) // 2 = 1");
  await expect(viz.locator(".hp-formula-conta").nth(1)).toHaveText("2 x 4 + 1 = 9");
  // clicar no array acende a árvore: um foco, um pai e os dois filhos de 4
  await expect(viz.locator("svg .tt-no.on")).toHaveCount(1);
  await expect(viz.locator("svg .tt-no.aux")).toHaveCount(1);
  await expect(viz.locator("svg .tt-no.filho")).toHaveCount(2);

  // e o caminho inverso: clicar no nó da árvore refaz as contas
  await viz.locator("svg").getByRole("button", { name: "Índice 2, valor" }).click();
  await expect(viz.locator(".hp-formula-conta").first()).toHaveText("(2 - 1) // 2 = 0");

  // trocar k muda as fórmulas de verdade, não só o rótulo: o "2" delas é o
  // número de filhos por nó, e com k = 3 o índice 2 passa a ter filho em 7
  await viz.getByRole("button", { name: "3", exact: true }).click();
  await expect(viz.locator(".hp-formula-conta").first()).toHaveText("(2 - 1) // 3 = 0");
  await expect(viz.locator(".hp-formula-conta").nth(1)).toHaveText("3 x 2 + 1 = 7");
  await expect(viz.locator(".hp-formula-conta")).toHaveCount(4); // pai + 3 filhos
});

test("heap sort: a fronteira anda e o array sai ordenado", async ({ page }) => {
  await page.goto("/topicos/heap-sort/");
  const viz = page.locator("figure.viz").filter({ hasText: "heap sort: duas fases no mesmo array" });
  const proximo = viz.getByRole("button", { name: "Próximo ›" });
  await expect(proximo, "a animação não reiniciou: Próximo já começou desabilitado").toBeEnabled();
  for (let i = 0; i < 200 && (await proximo.isEnabled()); i++) await proximo.click();
  await expect(proximo, "a animação não chegou ao fim dentro do limite do laço").toBeDisabled();
  // no fim, toda posição está congelada e na ordem crescente
  await expect(viz.locator(".hp-cel.fixo")).toHaveCount(10);
  // cada célula concatena índice e valor: posição 0 com o valor 1 lê "01"
  await expect(viz.locator(".hp-arr .hp-cel")).toHaveText([
    "01", "12", "23", "34", "45", "56", "67", "78", "89", "910",
  ]);
});

test("heap sort é instável: os empates saem fora da ordem de entrada", async ({ page }) => {
  await page.goto("/topicos/heap-sort/");
  const viz = page.locator("figure.viz").filter({ hasText: "significa na prática" });
  const nomes = (fila: number) =>
    viz.locator(".hs-fila").nth(fila).locator(".hp-cel.reg em");

  // preset padrão: entrada em ordem alfabética, reordenada por idade
  await expect(nomes(0)).toHaveText(["Ana", "Bia", "Caio", "Davi", "Enzo", "Fran"]);
  // o estável mantém os nomes alfabéticos dentro de cada idade
  await expect(nomes(1)).toHaveText(["Davi", "Fran", "Ana", "Caio", "Bia", "Enzo"]);
  // o heap sort inverte os três pares empatados
  await expect(nomes(2)).toHaveText(["Fran", "Davi", "Caio", "Ana", "Enzo", "Bia"]);
  await expect(viz.locator(".hp-cel.reg.inverteu")).toHaveCount(6);

  // a tabela comparativa é estática (figure.bigo-fam), então não conta como
  // figure.viz e precisa de asserção própria
  await expect(page.locator("article figure.bigo-fam")).toHaveCount(1);
  await expect(page.getByText("Heap sort ao lado dos vizinhos de prateleira")).toBeVisible();
});

test("busca binária: descarta metade por passo e para no ponto de inserção", async ({ page }) => {
  await page.goto("/topicos/busca-binaria/");
  const viz = page.locator("figure.viz").filter({ hasText: "metade some a cada olhada" });
  const proximo = viz.getByRole("button", { name: "Próximo ›" });
  const irAteOFim = async () => {
    await expect(proximo, "a animação não reiniciou: Próximo já começou desabilitado").toBeEnabled();
    for (let i = 0; i < 60 && (await proximo.isEnabled()); i++) await proximo.click();
    await expect(proximo, "a animação não chegou ao fim dentro do limite do laço").toBeDisabled();
  };

  // 8 posições, alvo no meio: 3 comparações contra as 5 da busca linear.
  // O card concatena rótulo e valor num nó só ("comparações até aqui3"), então
  // `toContainText("3")` passaria com 13 ou 30. O <strong> guarda só o número,
  // e `toHaveText` exige o valor exato.
  await irAteOFim();
  const stat = (rot: RegExp) => viz.locator(".bigo-stat").filter({ hasText: rot }).locator("strong");
  await expect(stat(/^comparações até aqui\d/)).toHaveText("3");
  await expect(stat(/^busca linear gastaria\d/)).toHaveText("5");
  // "descartadas sem ler" não conta a posição do meio, que foi lida. Com 8
  // posições, 3 lidas e 5 descartadas fecham o array inteiro, e é essa
  // invariante que mantém a estatística honesta.
  await expect(stat(/^descartadas sem ler\d/)).toHaveText("5");

  // dobrar o array de 8 para 16 acrescenta UMA comparação, não dobra o trabalho
  await viz.getByRole("button", { name: /16 posições/ }).click();
  await irAteOFim();
  await expect(stat(/^comparações até aqui\d/)).toHaveText("4");

  // num alvo ausente a busca varre o espaço inteiro, então lidas + descartadas
  // tem que fechar exatamente em n
  await viz.getByRole("button", { name: /não existe: 40/ }).click();
  await irAteOFim();
  const numero = async (rot: RegExp) => parseInt((await stat(rot).innerText()).trim(), 10);
  const lidas = await numero(/^comparações até aqui\d/);
  const cegas = await numero(/^descartadas sem ler\d/);
  expect(lidas + cegas, "toda posição é lida ou descartada, exatamente uma vez").toBe(8);
});

test("busca binária: a fórmula ingênua do meio estoura o inteiro de 32 bits", async ({ page }) => {
  await page.goto("/topicos/busca-binaria/");
  const viz = page.locator("figure.viz").filter({ hasText: "as duas formas de achar o meio" });

  // com índices pequenos as duas fórmulas concordam, que é o motivo de o bug passar
  await viz.getByRole("button", { name: /Índices de um array de exemplo/ }).click();
  await expect(viz.locator(".viz-step")).toHaveText("as duas concordam");
  await expect(viz.locator(".bb-bit.sinal")).not.toHaveClass(/\bon\b/);

  // com índices grandes e válidos, a soma dá a volta e o meio vira negativo
  await viz.getByRole("button", { name: /Alguns passos depois/ }).click();
  await expect(viz.locator(".viz-step")).toHaveText("as duas discordam");
  await expect(viz.locator(".bb-bit.sinal")).toHaveClass(/\bon\b/);
  // texto exato: "-397.483.648" é substring de "-1.397.483.648", e o sinal e a
  // magnitude do estouro são a aula inteira desta peça
  await expect(viz.locator(".bb-formula").first().locator("li b").last()).toHaveText("-397.483.648");
  await expect(viz.locator(".bb-formula").nth(1).locator("li b").last()).toHaveText("1.750.000.000");
});

test("fronteira: a mesma busca devolve primeira, última e ponto de inserção", async ({ page }) => {
  await page.goto("/topicos/busca-binaria/");
  const viz = page.locator("figure.viz").filter({ hasText: "repetidos, bordas e a posição de inserção" });
  const proximo = viz.getByRole("button", { name: "Próximo ›" });
  const resposta = async (rot: RegExp) => {
    await expect(proximo, "a animação não reiniciou: Próximo já começou desabilitado").toBeEnabled();
    for (let i = 0; i < 60 && (await proximo.isEnabled()); i++) await proximo.click();
    await expect(proximo, "a animação não chegou ao fim dentro do limite do laço").toBeDisabled();
    // O card concatena rótulo e valor num nó só, então uma asserção de substring
    // no card inteiro passa com qualquer número que contenha o esperado ("1"
    // passa com -10). O <strong> guarda só o valor.
    return viz.locator(".bigo-stat").filter({ hasText: rot }).locator("strong");
  };

  // [1, 3, 3, 3, 5, 8, 8, 11, 14] procurando 3: bloco nas posições 1, 2 e 3
  await expect(await resposta(/^primeira ocorrência/)).toHaveText("1");
  await viz.getByRole("button", { name: "última ocorrência" }).click();
  await expect(await resposta(/^última ocorrência/)).toHaveText("3");

  // um valor ausente: a busca falha, mas a posição de inserção sai de graça
  await viz.getByRole("button", { name: "onde entraria" }).click();
  await viz.getByRole("button", { name: /não existe: 7/ }).click();
  await expect(await resposta(/^onde o valor entraria/)).toHaveText("5");
  // o retorno negativo é o do caso de FALHA: -(5) - 1
  const retorno = viz.locator(".bigo-stat").filter({ hasText: /^retorno do Arrays/ }).locator("strong");
  await expect(retorno).toHaveText("-6");

  // Regressão: com o alvo PRESENTE o card mostrava o negativo do mesmo jeito,
  // mas aí o Arrays.binarySearch devolve o índice. O 3 existe na posição 1.
  // `toHaveText("1")` já reprova qualquer negativo, então o `not.toContainText`
  // que existia aqui virou redundante.
  await viz.getByRole("button", { name: /bloco de três iguais/ }).click();
  await resposta(/^onde o valor entraria/);
  await expect(retorno).toHaveText("1");

  // Borda de cima: a esquerda para em 9, que é o tamanho do array e não indexa
  // ninguém. É onde a checagem de existência leria fora do intervalo.
  await viz.getByRole("button", { name: /Maior que tudo/ }).click();
  await expect(await resposta(/^onde o valor entraria/)).toHaveText("9");
  await expect(retorno).toHaveText("-10");
});

test("ordenação básica: o selection sort não tem melhor caso", async ({ page }) => {
  await page.goto("/topicos/ordenacao-basica/");
  const viz = page.locator("figure.viz").filter({ hasText: "os três O(n²) sobre o mesmo array" });
  const proximo = viz.getByRole("button", { name: "Próximo ›" });
  // O card concatena rótulo e valor num nó só, então uma asserção de substring
  // no card inteiro passaria com 128 onde se espera 28. Drilando até o <strong>,
  // que guarda só o número, dá para exigir texto exato.
  const stat = (rot: RegExp) => viz.locator(".bigo-stat").filter({ hasText: rot }).locator("strong");
  // O helper fecha com toBeDisabled: sem isso, um limite estourado deixaria a
  // asserção rodando num passo do meio e ela passaria calada.
  const irAteOFim = async () => {
    await expect(proximo).toBeEnabled();
    for (let i = 0; i < 200 && (await proximo.isEnabled()); i++) await proximo.click();
    await expect(proximo).toBeDisabled();
  };

  // array já ordenado: o bubble sort percebe na primeira passada e sai em 7
  await viz.getByRole("button", { name: /Já ordenado/ }).click();
  await irAteOFim();
  await expect(stat(/^comparações\d/)).toHaveText("7");
  await expect(stat(/^escritas no array\d/)).toHaveText("0");

  // o insertion sort também aproveita, com as mesmas 7
  await viz.getByRole("button", { name: "Insertion sort" }).click();
  await irAteOFim();
  await expect(stat(/^comparações\d/)).toHaveText("7");

  // e o selection sort faz as 28 assim mesmo, que é o ponto do tópico:
  // varrer o resto inteiro é a única forma de ter certeza de quem é o menor
  await viz.getByRole("button", { name: "Selection sort" }).click();
  await irAteOFim();
  await expect(stat(/^comparações\d/)).toHaveText("28");
  // em compensação, ele é o que menos escreve: nenhuma troca num array pronto
  await expect(stat(/^escritas no array\d/)).toHaveText("0");

  // no array invertido as 28 comparações continuam iguais, e as escritas separam
  // os três: 56 do bubble contra 8 do selection, sempre 2 por inversão x 2 por rodada
  await viz.getByRole("button", { name: /Ao contrário/ }).click();
  await irAteOFim();
  await expect(stat(/^comparações\d/)).toHaveText("28");
  await expect(stat(/^escritas no array\d/)).toHaveText("8");
  await viz.getByRole("button", { name: "Bubble sort" }).click();
  await irAteOFim();
  await expect(stat(/^escritas no array\d/)).toHaveText("56");
});

test("ordenação básica: as barras batem com o passo a passo e a lei das inversões", async ({ page }) => {
  await page.goto("/topicos/ordenacao-basica/");
  const corrida = page.locator("figure.viz").filter({ hasText: "o mesmo array custa três preços" });
  const barras = (linha: number) => corrida.locator(".ord-linha").nth(linha).locator(".bb-barra-txt");

  // preset embaralhado (12 inversões): os números são os mesmos que o
  // visualizador de passo a passo mostra, porque saem do mesmo gerador
  // a linha inteira: "12 inversões" é substring de "112 inversões", e os três
  // números (inversões, piso e teto) são o que as barras abaixo têm que bater
  await expect(corrida.locator(".viz-step")).toHaveText(
    "12 inversões na entrada · piso 7, teto 28 comparações"
  );
  await expect(barras(0)).toHaveText(["25", "24"]); // bubble: 2 x 12 inversões
  await expect(barras(1)).toHaveText(["28", "12"]); // selection: sempre 28
  await expect(barras(2)).toHaveText(["17", "19"]); // insertion: 12 + 7 colocações

  // a lei escrita ao lado da barra tem que bater com o número dela
  await expect(corrida.locator(".ord-lei").first()).toHaveText("2 x 12 inversões = 24");

  // o instável do trio é o selection, e a causa está no card de distância
  const est = page.locator("figure.viz").filter({ hasText: "a distância da troca decide" });
  const fila = (i: number) => est.locator(".hs-fila").nth(i);
  await expect(fila(1).locator(".hp-cel.reg.inverteu")).toHaveCount(0); // bubble
  await expect(fila(2).locator(".hp-cel.reg.inverteu")).toHaveCount(0); // insertion
  await expect(fila(3).locator(".hp-cel.reg.inverteu")).toHaveCount(2); // selection
  const detalhe = (i: number) => fila(i).locator(".bb-array-nota");
  await expect(detalhe(1)).toHaveText("3 trocas, a mais longa com distância 1");
  await expect(detalhe(3)).toHaveText("2 trocas, a mais longa com distância 2");

  // o preset em que o instável acerta por acaso: nenhum empate trocou, e ainda
  // assim a distância da troca continua maior que 1. Sem garantia não é o mesmo
  // que sempre errado, e é o lado da condicional que costuma ficar sem teste.
  await est.getByRole("button", { name: /sobrevive por sorte/ }).click();
  await expect(est.locator(".hp-cel.reg.inverteu")).toHaveCount(0);
  await expect(detalhe(3)).toHaveText("2 trocas, a mais longa com distância 2");
});

test("merge sort: o custo não depende dos dados, e o empate depende do sinal", async ({ page }) => {
  await page.goto("/topicos/merge-sort/");
  const viz = page.locator("figure.viz").filter({ hasText: "a descida divide, a subida ordena" });
  const proximo = viz.getByRole("button", { name: "Próximo ›" });
  // O card concatena rótulo e valor num nó só, então uma asserção de substring
  // no card inteiro passaria com 128 onde se espera 28. Drilando até o <strong>,
  // que guarda só o número, dá para exigir texto exato.
  const stat = (rot: RegExp) => viz.locator(".bigo-stat").filter({ hasText: rot }).locator("strong");
  const irAteOFim = async () => {
    await expect(proximo).toBeEnabled();
    for (let i = 0; i < 200 && (await proximo.isEnabled()); i++) await proximo.click();
    await expect(proximo).toBeDisabled();
  };

  // já ordenado e invertido custam exatamente o mesmo, e as cópias são 24 nos
  // dois: 3 rodadas de intercalação x 8 elementos, sem olhar para os dados
  await viz.getByRole("button", { name: /Já ordenado/ }).click();
  await irAteOFim();
  await expect(stat(/^comparações\d/)).toHaveText("12");
  await expect(stat(/^cópias para o buffer\d/)).toHaveText("24");
  await viz.getByRole("button", { name: /Ao contrário/ }).click();
  await irAteOFim();
  await expect(stat(/^comparações\d/)).toHaveText("12");
  await expect(stat(/^cópias para o buffer\d/)).toHaveText("24");

  // o pior caso possível com 8 elementos custa 17: cinco comparações a mais que
  // o melhor. É esse intervalo estreito que o artigo chama de garantia.
  await viz.getByRole("button", { name: /Pior caso/ }).click();
  await irAteOFim();
  await expect(stat(/^comparações\d/)).toHaveText("17");
  await expect(stat(/^cópias para o buffer\d/)).toHaveText("24");
  await expect(viz.locator(".ms-seg.pronto")).toHaveCount(15); // 8 folhas + 7 trechos

  // o n log n desenhado: 5 níveis para 16 elementos, e a faixa soma 16 sempre
  const niveis = page.locator("figure.viz").filter({ hasText: "altura vezes largura" });
  await expect(niveis.locator(".ms-nivel")).toHaveCount(5);
  await niveis.getByRole("button", { name: "n = 64" }).click();
  await expect(niveis.locator(".ms-nivel")).toHaveCount(7);
  await expect(niveis.locator(".viz-step")).toHaveText(
    "6 rodadas de intercalação x 64 elementos = 384 movimentos"
  );

  // estabilidade: o mesmo merge com <= e com <, e só o segundo inverte empates
  const empate = page.locator("figure.viz").filter({ hasText: "o sinal que decide a estabilidade" });
  const coluna = (i: number) => empate.locator(".ms-op").nth(i);
  await expect(coluna(0).locator(".hp-cel.reg.inverteu")).toHaveCount(0);
  await expect(coluna(1).locator(".hp-cel.reg.inverteu")).toHaveCount(5);
  // e existe uma entrada sem empate nenhum, em que os dois operadores coincidem:
  // é o lado da condicional que prova que a diferença mora no empate
  await empate.getByRole("button", { name: /Chaves todas iguais/ }).click();
  await expect(coluna(1).locator(".hp-cel.reg.inverteu")).toHaveCount(4);
  await empate.getByRole("button", { name: /Um único empate/ }).click();
  await expect(coluna(0).locator(".hp-cel.reg.inverteu")).toHaveCount(0);
  await expect(coluna(1).locator(".hp-cel.reg.inverteu")).toHaveCount(2);
});

test("quick sort: o pior caso mora nas entradas mais comuns", async ({ page }) => {
  await page.goto("/topicos/quick-sort/");
  const viz = page.locator("figure.viz").filter({ hasText: "a partição e o pivô que fica pronto" });
  const proximo = viz.getByRole("button", { name: "Próximo ›" });
  // O card concatena rótulo e valor num nó só, então uma asserção de substring
  // no card inteiro passaria com 128 onde se espera 28. Drilando até o <strong>,
  // que guarda só o número, dá para exigir texto exato.
  const stat = (rot: RegExp) => viz.locator(".bigo-stat").filter({ hasText: rot }).locator("strong");
  const irAteOFim = async () => {
    await expect(proximo).toBeEnabled();
    for (let i = 0; i < 300 && (await proximo.isEnabled()); i++) await proximo.click();
    await expect(proximo).toBeDisabled();
  };

  // embaralhado: partições equilibradas, profundidade 4 com 8 elementos
  await irAteOFim();
  await expect(stat(/^comparações\d/)).toHaveText("14");
  await expect(stat(/^profundidade da recursão\d/)).toHaveText("4");

  // já ordenado: cada partição elimina um elemento só. Profundidade 8 e as
  // mesmas 28 comparações de um selection sort, que é n(n-1)/2.
  await viz.getByRole("button", { name: /Já ordenado/ }).click();
  await irAteOFim();
  await expect(stat(/^comparações\d/)).toHaveText("28");
  await expect(stat(/^profundidade da recursão\d/)).toHaveText("8");

  // array constante: nada para ordenar e mesmo assim o trabalho quadrático
  // inteiro, com TODAS as trocas sendo de um elemento com ele mesmo
  await viz.getByRole("button", { name: /Todos iguais/ }).click();
  await irAteOFim();
  await expect(stat(/^comparações\d/)).toHaveText("28");
  const trocas = viz.locator(".bigo-stat").filter({ hasText: /^trocas executadas\d/ }).locator("strong");
  const semEfeito = viz.locator(".bigo-stat").filter({ hasText: /^trocas sem efeito\d/ }).locator("strong");
  await expect(trocas).toHaveText("35");
  await expect(semEfeito).toHaveText("35");

  // a escolha do pivô é o que separa n log n de n²: no mesmo array já ordenado,
  // o pivô do meio desce 4 níveis e o da ponta desce 8
  const pivo = page.locator("figure.viz").filter({ hasText: "a escolha do pivô decide" });
  const prof = (linha: number) => pivo.locator(".ord-linha").nth(linha).locator(".bb-barra-txt").nth(1);
  await expect(prof(0)).toHaveText("8"); // último
  await expect(prof(1)).toHaveText("8"); // primeiro
  await expect(prof(2)).toHaveText("4"); // meio
  await expect(prof(3)).toHaveText("4"); // mediana de três
  // e nenhuma regra fixa é imune: no preset do vale, a do meio é a que quebra
  await pivo.getByRole("button", { name: /Com o maior bem no meio/ }).click();
  await expect(prof(2)).toHaveText("6");

  // três vias: com o array constante a faixa dos iguais sai da recursão inteira
  const vias = page.locator("figure.viz").filter({ hasText: "o que fazer com os iguais" });
  // O selo é o nó que guarda só os dois números: no `.ms-op` inteiro,
  // "28 comparações" passaria com "128 comparações" e "profundidade 1" com
  // "profundidade 10", que é a diferença entre as duas partições.
  const selo = (i: number) => vias.locator(".ms-op").nth(i).locator(".bb-formula-selo");
  await expect(selo(0)).toHaveText("28 comparações · profundidade 8");
  await expect(selo(1)).toHaveText("16 comparações · profundidade 1");
  // A frase inteira, no nó dela: o ramo sem subproblema deixou de entrar no
  // meio de uma moldura fixa, e a asserção antiga (`toContainText("nenhum
  // subproblema")`) gravava justamente o texto quebrado.
  await expect(vias.locator(".ms-op").nth(1).locator(".bb-formula-fim")).toHaveText(
    "A primeira partição resolveu o array inteiro: não sobrou nada para a recursão."
  );
  // sem repetidos ela não é melhor: mesma profundidade e o dobro de comparações
  await vias.getByRole("button", { name: /Sem repetição/ }).click();
  await expect(selo(0)).toHaveText("18 comparações · profundidade 5");
  await expect(selo(1)).toHaveText("35 comparações · profundidade 5");
});

test("shell sort: a h-ordenação não se perde e o gap só compensa com n grande", async ({ page }) => {
  await page.goto("/topicos/shell-sort/");
  const viz = page.locator("figure.viz").filter({ hasText: "o insertion sort com gap" });
  const proximo = viz.getByRole("button", { name: "Próximo ›" });
  // O card concatena rótulo e valor num nó só, então uma asserção de substring
  // no card inteiro passaria com 128 onde se espera 28. Drilando até o <strong>,
  // que guarda só o número, dá para exigir texto exato.
  const stat = (rot: RegExp) => viz.locator(".bigo-stat").filter({ hasText: rot }).locator("strong");
  await expect(proximo).toBeEnabled();
  for (let i = 0; i < 200 && (await proximo.isEnabled()); i++) await proximo.click();
  await expect(proximo).toBeDisabled();
  await expect(stat(/^comparações\d/)).toHaveText("21");
  await expect(stat(/^escritas no array\d/)).toHaveText("23");

  // as subsequências: uma vez 4-ordenado, sempre 4-ordenado. É o resultado que
  // sustenta o algoritmo, e sem ele cada rodada desmancharia a anterior.
  const sub = page.locator("figure.viz").filter({ hasText: "insertion sorts entrelaçados" });
  const selos = sub.locator(".ss-selo");
  await expect(selos).toHaveText(["4-ordenado: sim", "2-ordenado: ainda não", "1-ordenado: ainda não"]);
  await sub.getByRole("button", { name: "Rodada 2: gap 2" }).click();
  await expect(selos).toHaveText(["4-ordenado: sim", "2-ordenado: sim", "1-ordenado: ainda não"]);
  await sub.getByRole("button", { name: "Rodada 3: gap 1" }).click();
  await expect(selos).toHaveText(["4-ordenado: sim", "2-ordenado: sim", "1-ordenado: sim"]);
  // com gap 1 existe uma subsequência só, e ela é o array inteiro
  await expect(sub.locator(".viz-step")).toHaveText("gap 1 · 1 subsequência de 8 elementos");

  // o cruzamento: com 8 elementos o shell sort perde, com 128 ele ganha de longe
  const gaps = page.locator("figure.viz").filter({ hasText: "a partir de que tamanho o gap compensa" });
  const comp = (linha: number) => gaps.locator(".ord-linha").nth(linha).locator(".bb-barra-txt").first();
  await gaps.getByRole("button", { name: "n = 8" }).click();
  await expect(comp(0)).toHaveText("24"); // a sequência original de Shell
  await expect(comp(4)).toHaveText("24"); // insertion sort: empatam neste tamanho
  await expect(comp(1)).toHaveText("17"); // Hibbard já ganha com 8 elementos
  await gaps.getByRole("button", { name: "n = 128" }).click();
  await expect(comp(4)).toHaveText("4273");
  // "compensa" sozinho passaria também no ramo "ainda não compensa", que é o
  // resultado oposto. A frase inteira separa os dois.
  await expect(gaps.locator(".viz-note")).toContainText("o shell sort compensa");

  // a entrada adversária: gaps potência de dois têm ponto cego, gaps ímpares não
  await gaps.getByRole("button", { name: "Adversária dos gaps pares" }).click();
  await expect(comp(0)).toHaveText("4609"); // Shell, gaps 64, 32, 16...
  await expect(comp(1)).toHaveText("1038"); // Hibbard, gaps ímpares
  await expect(gaps.locator(".viz-note")).toContainText("potências de dois");

  // e o contra-exemplo honesto: com poucas inversões o insertion sort ganha em
  // qualquer tamanho, e aumentar n não vira a conta
  await gaps.getByRole("button", { name: "Quase ordenado" }).click();
  await expect(comp(4)).toHaveText("142");
  await expect(gaps.locator(".viz-note")).toContainText("Aumentar o tamanho não vira essa conta");
});

test("backtracking: escolher, explorar e desfazer, com a lista voltando ao início", async ({ page }) => {
  await page.goto("/topicos/backtracking/");
  const viz = page.locator("figure.viz").filter({ hasText: "escolher, explorar, desfazer" });
  const proximo = viz.getByRole("button", { name: "Próximo ›" });
  const stat = (rot: RegExp) => viz.locator(".bigo-stat").filter({ hasText: rot }).locator("strong");
  const irAteOFim = async () => {
    await expect(proximo).toBeEnabled();
    for (let i = 0; i < 200 && (await proximo.isEnabled()); i++) await proximo.click();
    await expect(proximo).toBeDisabled();
  };

  // subconjuntos de 1,2,3: todo nó é resposta, então 8 nós e 8 soluções
  await irAteOFim();
  await expect(stat(/^nós visitados\d/)).toHaveText("8");
  await expect(stat(/^soluções encontradas\d/)).toHaveText("8");
  // a invariante: um retrocesso por aresta, ou seja, nós - 1
  await expect(stat(/^retrocessos\d/)).toHaveText("7");
  // e a solução parcial termina vazia, porque todo escolher teve o seu desfazer.
  // O bloco é escolhido pelo TÍTULO, não por `.first()`: a peça tem três
  // `.hp-bloco` (parcial, pilha de chamadas e soluções) e dois deles também
  // sabem escrever "vazia", então o `.first()` fazia a asserção depender da
  // ordem no DOM para não estar lendo o painel errado.
  await expect(
    viz.locator(".hp-bloco").filter({ hasText: "A solução parcial" }).locator(".bb-array-nota")
  ).toHaveText("vazia");

  // permutações: só as folhas são resposta, então 16 nós para 6 soluções
  await viz.getByRole("button", { name: /Permutações/ }).click();
  await irAteOFim();
  await expect(stat(/^nós visitados\d/)).toHaveText("16");
  await expect(stat(/^soluções encontradas\d/)).toHaveText("6");
  await expect(stat(/^retrocessos\d/)).toHaveText("15");
  await expect(viz.locator(".bt-sol")).toHaveCount(6);

  // combinações de 2 entre 4: C(4,2) = 6, com 10 nós
  await viz.getByRole("button", { name: /Combinações/ }).click();
  await irAteOFim();
  await expect(stat(/^nós visitados\d/)).toHaveText("10");
  await expect(stat(/^soluções encontradas\d/)).toHaveText("6");
});

test("backtracking: o sudoku fecha válido e a poda não muda a resposta", async ({ page }) => {
  await page.goto("/topicos/backtracking/");
  const sud = page.locator("figure.viz").filter({ hasText: "resolvendo sudoku" });
  const proximo = sud.getByRole("button", { name: "Próximo ›" });
  await expect(proximo).toBeEnabled();
  for (let i = 0; i < 400 && (await proximo.isEnabled()); i++) await proximo.click();
  await expect(proximo).toBeDisabled();

  // 4x4 resolvido: nenhuma célula vazia e os quatro dígitos em cada linha
  const celulas = sud.locator(".bt-cel");
  await expect(celulas).toHaveCount(16);
  const valores = await celulas.allTextContents();
  expect(valores.filter((v) => v.trim() === ""), "sobrou célula vazia no fim").toHaveLength(0);
  for (let r = 0; r < 4; r++) {
    const linha = valores.slice(r * 4, r * 4 + 4).sort();
    expect(linha, `linha ${r + 1} do sudoku`).toEqual(["1", "2", "3", "4"]);
  }
  await expect(sud.locator(".bigo-stat").filter({ hasText: /^dígitos testados\d/ }).locator("strong")).toHaveText("51");

  // a poda visita muito menos nós E devolve exatamente as mesmas soluções
  const poda = page.locator("figure.viz").filter({ hasText: "mesma resposta, uma fração" });
  const barras = poda.locator(".bb-barra-txt");
  await expect(barras.nth(0)).toHaveText("55.987"); // sem poda, 6 rainhas
  await expect(barras.nth(1)).toHaveText("4"); // soluções sem poda
  await expect(barras.nth(2)).toHaveText("153"); // com poda
  await expect(barras.nth(3)).toHaveText("4"); // soluções com poda
  await expect(poda).toContainText("exatamente as mesmas da versão sem poda");
  // e a razão cresce com o tabuleiro: com 4 rainhas ela é bem menor
  await poda.getByRole("button", { name: "4 rainhas" }).click();
  await expect(barras.nth(0)).toHaveText("341");
  await expect(barras.nth(2)).toHaveText("17");
});

test("números binários: a soma das posições ligadas e as divisões por 2", async ({ page }) => {
  await page.goto("/topicos/binary-numbers/");
  const conv = page.locator("figure.viz").filter({ hasText: "soma de potências de dois" });
  const stat = (rot: RegExp) => conv.locator(".bigo-stat").filter({ hasText: rot }).locator("strong");

  // abre em 53 = 00110101, com quatro bits ligados
  await expect(conv.locator(".viz-step")).toHaveText("00110101 = 53");
  await expect(stat(/^valor decimal\d/)).toHaveText("53");
  await expect(stat(/^bits ligados\d/)).toHaveText("4");

  // clicar no bit mais significativo soma 128, e não 1: é o teste de que o
  // peso da posição está sendo aplicado e não só contado
  await conv.getByRole("button", { name: /Bit de expoente 7/ }).click();
  await expect(stat(/^valor decimal\d/)).toHaveText("181");
  await conv.getByRole("button", { name: /Bit de expoente 7/ }).click();
  await expect(stat(/^valor decimal\d/)).toHaveText("53");
  // e o da direita soma 1
  await conv.getByRole("button", { name: /Bit de expoente 0/ }).click();
  await expect(stat(/^valor decimal\d/)).toHaveText("52");

  // as divisões: 201 precisa de 8 divisões e fecha em 11001001
  const div = page.locator("figure.viz").filter({ hasText: "dividindo por 2" });
  const proximo = div.getByRole("button", { name: "Próximo ›" });
  await expect(proximo).toBeEnabled();
  for (let i = 0; i < 40 && (await proximo.isEnabled()); i++) await proximo.click();
  await expect(proximo).toBeDisabled();
  await expect(div.locator(".bigo-stat").filter({ hasText: /^divisões feitas\d/ }).locator("strong")).toHaveText("8");
  // A nota inteira: "11001001" é substring de "111001001" e a contagem de
  // divisões dita a de bits significativos, então os dois números só provam
  // alguma coisa lidos junto com a frase que os relaciona.
  await expect(div.locator(".viz-note")).toHaveText(
    "Cheguei a zero, então acabou: 201 em binário é 11001001. Foram 8 divisões para 8 bits significativos, e os zeros à esquerda entram só para completar o byte. Conferindo pelo outro caminho: 128 + 64 + 8 + 1 = 201."
  );

  // as bases: o mesmo número escrito de quatro formas, e hexa em grupos de 4 bits
  const bases = page.locator("figure.viz").filter({ hasText: "a base é um parâmetro" });
  await bases.getByRole("button", { name: "48.879" }).click();
  await expect(bases.locator(".viz-step")).toContainText("0xBEEF");
  await expect(bases.locator(".bn-grupo-hex")).toHaveText(["B", "E", "E", "F"]);
});

test("binários negativos: complemento de dois, zero único e o padrão sem sinal", async ({ page }) => {
  await page.goto("/topicos/negative-binary/");
  const comp = page.locator("figure.viz").filter({ hasText: "inverter e somar 1" });
  const proximo = comp.getByRole("button", { name: "Próximo ›" });
  const irAteOFim = async () => {
    await expect(proximo).toBeEnabled();
    for (let i = 0; i < 40 && (await proximo.isEnabled()); i++) await proximo.click();
    await expect(proximo).toBeDisabled();
  };

  // 26 -> 11100110, e a prova soma zero
  await irAteOFim();
  await expect(comp.locator(".viz-note")).toContainText("11100110");
  await expect(comp.locator(".viz-note")).toContainText("vai-um sobrando");

  // O zero é o caso que prova a ausência de ambiguidade: o oposto dele é ele.
  // Rótulo e valor no mesmo par, e valor exato: `.nth(2)` dependia da ordem das
  // três fichas, e `toContainText("0")` passava com 10, -128 ou 0x00 — inclusive
  // com o número que este teste existe para descartar.
  await comp.getByRole("button", { name: /teste da ambiguidade/ }).click();
  await irAteOFim();
  await expect(
    comp.locator(".viz-var").filter({ hasText: "em construção (com sinal)" }).locator(".viz-var-val")
  ).toHaveText("0");

  // as três convenções: só o complemento de dois tem um zero e soma zero
  const tres = page.locator("figure.viz").filter({ hasText: "três formas de escrever um negativo" });
  await expect(tres.locator(".viz-step")).toHaveText("1 de 3 passam nos três testes");
  const zeros = (col: number) => tres.locator(".ms-op").nth(col).locator(".bb-passos li b").first();
  await expect(zeros(0)).toHaveText("2"); // sinal e magnitude
  await expect(zeros(1)).toHaveText("2"); // complemento de um
  await expect(zeros(2)).toHaveText("1"); // complemento de dois
  // e o desperdício que vem junto: 255 números distintos contra 256
  const distintos = (col: number) => tres.locator(".ms-op").nth(col).locator(".bb-passos li b").nth(2);
  await expect(distintos(0)).toHaveText("255");
  await expect(distintos(2)).toHaveText("256");

  // o mesmo padrão lido de dois jeitos, e a virada de 127 para -128
  const faixa = page.locator("figure.viz").filter({ hasText: "o mesmo padrão, duas leituras" });
  await expect(faixa.locator(".viz-step")).toHaveText("10000000 · sem sinal 128 · com sinal -128");
  await faixa.getByRole("button", { name: "01111111" }).click();
  await expect(faixa.locator(".viz-step")).toHaveText("01111111 · sem sinal 127 · com sinal 127");
  await faixa.getByRole("button", { name: "Próximo padrão" }).click();
  await expect(faixa.locator(".viz-step")).toHaveText("10000000 · sem sinal 128 · com sinal -128");
  await expect(faixa.locator(".viz-note")).toContainText("desaba");
});

// Regressão: "em breve" é derivado, e a regra de derivação já esteve errada.
// Vídeo extra é link para resolução de exercício, não material do tópico, e um
// tópico que só tem isso continua sem aula, sem texto e sem visualização.
test("o selo em breve aparece em quem não tem vídeo, artigo nem visualização", async ({ page }) => {
  // A conferência é por grupo, então o locator olha só o grupo ABERTO. Ele já foi
  // `.sidebar .badge-soon`, sem o filtro, e isso funcionava por acidente: o menu
  // não renderizava o grupo fechado, e por isso escondia 46 dos 47 tópicos do
  // rastreador no pior caso. Corrigido aquilo, os 11 selos do site inteiro
  // passaram a estar no DOM, e o que contava o grupo passou a contar o site.
  // Ler de TOPICOS em vez de fixar uma lista faz o teste sobreviver ao dia
  // em que qualquer um destes tópicos for publicado.
  //
  // O menu lembra os grupos abertos entre visitas, e este teste passa por vários
  // grupos: sem zerar essa memória a cada carga, os selos dos grupos anteriores
  // continuariam na tela e entrariam na conta. Aqui o assunto é o selo, não a
  // memória do menu (que tem testes próprios).
  await page.addInitScript(() => localStorage.removeItem("ccc-dsa-menu"));

  const conferirGrupo = async (slug: string) => {
    await page.goto(`/roadmaps/fundamentos/${slug}/`);
    const grupo = TOPICOS.find((t) => t.slug === slug)!.group;
    const doGrupo = TOPICOS.filter((t) => t.group === grupo);
    const vazios = doGrupo.filter((t) => isEmptyTopic(t));
    await expect(page.locator(".sidebar .side-items:not([hidden]) .badge-soon")).toHaveCount(
      vazios.length
    );
    for (const t of doGrupo) {
      const item = page.locator(`.sidebar a[href="/roadmaps/fundamentos/${t.slug}/"]`);
      if (isEmptyTopic(t)) await expect(item, `${t.slug} devia estar em breve`).toHaveClass(/\bsoon\b/);
      else await expect(item, `${t.slug} NÃO devia estar em breve`).not.toHaveClass(/\bsoon\b/);
    }
  };

  // Programação Dinâmica só tem vídeos extras (recortes de resolução), e isso
  // não é material do tópico: ela continua em breve.
  await conferirGrupo("programacao-dinamica");
  await expect(page.locator('.sidebar a[href="/roadmaps/fundamentos/programacao-dinamica/"]')).toHaveClass(/\bsoon\b/);

  // Manipulação de Bits tem dois publicados e um vazio, no mesmo grupo
  await conferirGrupo("binary-numbers");
  // Ordenação tem quatro publicados e três vazios
  await conferirGrupo("ordenacao-basica");
});

// Regressão: cinco visualizadores foram parar num PR com o estado de animação
// completo (passo, tocando, velocidade) e SEM os controles renderizados, então o
// aluno ficava preso no passo 1 sem nenhum aviso. Os testes de contrato não
// pegavam porque só contavam elementos. Este pega: todo visualizador que ANUNCIA
// passos precisa deixar avançar de verdade.
test("todo visualizador com passos tem controles que funcionam", async ({ page }) => {
  const semControles: string[] = [];
  const naoAvanca: string[] = [];

  for (const t of TOPICOS_PRONTOS) {
    await page.goto(`/topicos/${t.slug}/`);
    const vizes = page.locator("article figure.viz");
    for (let i = 0; i < (await vizes.count()); i++) {
      const viz = vizes.nth(i);
      const rotulo = await viz.locator(".viz-step").first().textContent().catch(() => null);
      if (!rotulo || !/passo \d+ de \d+/.test(rotulo)) continue; // não é animado

      const proximo = viz.getByRole("button", { name: "Próximo ›" });
      if ((await proximo.count()) === 0) {
        semControles.push(`${t.slug}[${i}]`);
        continue;
      }
      await proximo.click();
      // O React re-renderiza de forma assíncrona, então ler o texto na hora
      // pegaria o valor antigo mesmo quando avançou. A asserção web-first
      // reconsulta até mudar (ou até o timeout), que é o que torna isto honesto.
      try {
        await expect(viz.locator(".viz-step").first()).not.toHaveText(rotulo, { timeout: 3000 });
      } catch {
        naoAvanca.push(`${t.slug}[${i}]: travou em "${rotulo}"`);
      }
    }
  }

  expect(semControles, "visualizadores que anunciam passos mas não têm controles").toEqual([]);
  expect(naoAvanca, "visualizadores cujos controles não avançam o passo").toEqual([]);
});

// Regressão: um bloco de CSS foi parar DEPOIS da seção responsiva do
// globals.css, então o override de `.gr-split` para uma coluna era vencido por
// ordem de cascata e o segundo painel colapsava para 0px no celular. Não havia
// overflow (as colunas usam minmax(0, ...) e encolhem), então o teste de
// overflow passava enquanto metade do visualizador sumia da tela.
test("no celular, nenhum painel de visualizador colapsa", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const colapsados: string[] = [];

  for (const t of TOPICOS_PRONTOS) {
    await page.goto(`/topicos/${t.slug}/`);
    const paineis = await page
      .locator(
        "article figure.viz .gr-painel, article figure.viz .tt-painel, " +
          "article figure.viz .hp-bloco, article figure.viz .hs-fila, " +
          "article figure.viz .bb-formula, article figure.viz .hp-formula, " +
          "article figure.viz .ord-linha, article figure.viz .ord-medida, " +
          "article figure.viz .ms-lado, article figure.viz .ms-op, " +
          "article figure.viz .bt-paineis > .hp-bloco"
      )
      .evaluateAll((els) =>
        els.map((e) => ({ cls: e.className, w: Math.round(e.getBoundingClientRect().width) }))
      );
    for (const p of paineis) {
      if (p.w < 80) colapsados.push(`${t.slug}: .${p.cls.split(" ")[0]} com ${p.w}px`);
    }
  }

  expect(colapsados, "painéis que sumiram da tela no celular").toEqual([]);
});

test("nenhuma página de tópico rola na horizontal no celular", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const t of TOPICOS_PRONTOS) {
    await page.goto(`/topicos/${t.slug}/`);
    const estoura = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(estoura, `${t.slug} estoura a largura no mobile`).toBe(false);
  }
});
