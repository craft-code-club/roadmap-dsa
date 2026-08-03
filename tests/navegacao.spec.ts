import { test, expect } from "@playwright/test";
import { ALL_TOPICS } from "../content/roadmap";

test("home mostra o hero e leva para o Big O", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("aprofundamento em cada estrutura");
  await page.getByRole("link", { name: "Começar por Big O" }).click();
  await expect(page).toHaveURL(/topico\/big-o/);
  await expect(page.getByRole("heading", { level: 1, name: /Big O/ })).toBeVisible();
});

test("nav do topo abre o roadmap e um tópico", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Roadmap", exact: true }).click();
  await expect(page).toHaveURL(/\/roadmap/);
  await expect(page.getByRole("heading", { name: "Do zero à entrevista" })).toBeVisible();
  await page.getByRole("link", { name: /Two Pointers/ }).first().click();
  await expect(page).toHaveURL(/topico\/two-pointers/);
});

test("página de tópico traz vídeo e problemas com links externos certos", async ({ page }) => {
  await page.goto("/topico/sliding-window/");
  await expect(page.locator("iframe")).toHaveCount(1);
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
  await page.goto("/topico/two-pointers/");
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

test("Two Pointers é uma página completa com os três visualizadores e problemas", async ({ page }) => {
  await page.goto("/topico/two-pointers/");
  // um visualizador por sabor da técnica: convergente, ritmos diferentes e Floyd
  await expect(page.getByRole("button", { name: /Rodar/ })).toHaveCount(3);
  await expect(page.getByText("ponteiros convergentes: dois números que somam o alvo")).toBeVisible();
  await expect(page.getByText("palíndromo com ponteiros em ritmos diferentes")).toBeVisible();
  await expect(page.getByText("existe ciclo na lista ligada?")).toBeVisible();
  await expect(page.getByRole("link", { name: /Two Sum II/ }).first()).toHaveAttribute("href", /leetcode\.com/);
  await expect(page.getByRole("link", { name: /Linked List Cycle/ }).first()).toHaveAttribute("href", /leetcode\.com/);
});

test("os três visualizadores de Two Pointers têm estado próprio e contam operações", async ({ page }) => {
  await page.goto("/topico/two-pointers/");
  const passos = page.locator(".viz-step");
  await page.getByRole("button", { name: /Próximo/ }).first().click();
  await expect(passos.first()).toContainText("passo 2 de");
  await expect(passos.nth(1)).toContainText("passo 1 de");
  // o preset do encontro fecha em 6 somas contra os 28 pares da força bruta
  const convergente = page.locator(".viz").first();
  await expect(convergente.getByText("pares na força bruta")).toBeVisible();
  await expect(convergente.locator(".bigo-stat", { hasText: "pares na força bruta" })).toContainText("28");
});

test("Strings traz os três visualizadores e os números do artigo batem com a tela", async ({ page }) => {
  await page.goto("/topico/strings/");
  // montagem e rotate são passo a passo; o de bytes é painel de leitura
  await expect(page.getByRole("button", { name: /Rodar/ })).toHaveCount(2);
  await expect(page.getByText("o custo de montar uma string")).toBeVisible();
  await expect(page.getByText("caractere, code point e byte")).toBeVisible();
  await expect(page.getByText("Rotate String, força bruta contra o truque")).toBeVisible();

  // o painel de bytes vem primeiro e abre em CCC: 3 bytes em UTF-8, 6 em UTF-16
  const bytes = page.locator(".viz").first();
  await expect(bytes.locator(".str-enc.on .str-enc-val")).toContainText("3 bytes");
  await bytes.getByRole("button", { name: /^UTF-16/ }).click();
  await expect(bytes.locator(".str-enc.on .str-enc-val")).toContainText("6 bytes");

  // o artigo promete 45 cópias com "s = s + c" e 9 com join para CRAFTCODE (n = 9)
  const montagem = page.locator(".viz").nth(1);
  await expect(montagem.locator(".bigo-stat", { hasText: "total com s = s + c" })).toContainText("45");
  await expect(montagem.locator(".bigo-stat", { hasText: "total com join" })).toContainText("9");

  // rotate: o preset "caso feliz" acha na 2a rotação, com 18 caracteres copiados
  const rotate = page.locator(".viz").nth(2);
  await expect(rotate.locator(".bigo-stat", { hasText: "pior caso com o laço" })).toContainText("45");
  await expect(rotate.locator(".bigo-stat", { hasText: "pior caso com o truque" })).toContainText("10");

  await expect(page.getByRole("link", { name: "Rotate String", exact: true })).toHaveAttribute("href", /leetcode\.com/);
  await expect(page.getByRole("link", { name: "Longest Palindromic Substring", exact: true })).toHaveAttribute("href", /leetcode\.com/);
});

test("Tabelas Hash: os contadores da tela batem com os números do artigo", async ({ page }) => {
  await page.goto("/topico/hash-table/");
  // dois passo a passo (inserção e a corrida lista x hash) + a tabela estática
  await expect(page.getByRole("button", { name: /Rodar/ })).toHaveCount(2);
  await expect(page.getByText("inserindo chaves numa tabela hash")).toBeVisible();
  await expect(page.getByText("busca linear x busca por hash")).toBeVisible();
  await expect(page.locator(".ht-tab-table tbody tr")).toHaveCount(4);

  // o artigo promete: anagramas colidem em 3 e custam 6 comparações
  const insercao = page.locator(".viz").first();
  await insercao.getByRole("button", { name: "Anagramas: o pior caso" }).click();
  const proximo = insercao.getByRole("button", { name: /Próximo/ });
  for (let i = 0; i < 60 && (await proximo.isEnabled()); i++) await proximo.click();
  await expect(insercao.locator(".viz-note")).toContainText("3 colisões");
  await expect(insercao.locator(".viz-note")).toContainText("6 comparações de chave");

  // a corrida: com hash bom o pior caso com 1 milhão é 1; com hash ruim, 1 milhão
  const busca = page.locator(".viz").nth(1);
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
  await page.goto("/topico/sliding-window/");
  await expect(page.getByRole("heading", { level: 1, name: "Sliding Window" })).toBeVisible();
  // três visualizadores: o contraste com a força bruta e um para cada variação
  await expect(page.getByRole("button", { name: /Rodar/ })).toHaveCount(3);
  await expect(page.getByText("força bruta contra janela, no mesmo array")).toBeVisible();
  await expect(page.getByText("janela fixa, a maior soma de k elementos seguidos")).toBeVisible();
  await expect(page.getByText("janela variável, o maior subarray com soma ≤ k")).toBeVisible();
  // as duas instâncias têm estado próprio: avançar uma não mexe na outra
  const passos = page.locator(".viz-step");
  await page.getByRole("button", { name: /Próximo/ }).first().click();
  await expect(passos.first()).toContainText("passo 2 de");
  await expect(passos.nth(1)).toContainText("passo 1 de");
  // os problemas das duas variações convivem na mesma lista
  await expect(page.getByRole("link", { name: /Maximum Average Subarray I/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Minimum Size Subarray Sum/ }).first()).toBeVisible();
});

test("progresso dos slugs antigos de Sliding Window migra para o unificado", async ({ page }) => {
  // Quem concluiu a página antiga (fixa ou variável) tem que continuar concluído.
  await page.addInitScript(() => {
    localStorage.setItem("ccc-dsa-progresso", JSON.stringify({ "sliding-window-fixed": 1 }));
  });
  await page.goto("/topico/sliding-window/");
  await expect(page.getByRole("button", { name: "✓ Concluído" }).first()).toBeVisible();
  // e a chave antiga sai do storage, em vez de virar lixo permanente
  const salvo = await page.evaluate(() => localStorage.getItem("ccc-dsa-progresso"));
  expect(JSON.parse(salvo!)).toEqual({ "sliding-window": 1 });
});

test("Big O traz o gráfico de crescimento, o contador de operações e a tabela de famílias", async ({ page }) => {
  await page.goto("/topico/big-o/");
  // gráfico: o canvas existe e o marcador reage ao chip de uma família
  await expect(page.locator("canvas.bigo-canvas")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "O(n!)" })).toBeVisible();
  // contador: a casca padrão de visualizador, com passo a passo
  await expect(page.getByRole("button", { name: /Rodar/ })).toBeVisible();
  // tabela de famílias: estática, precisa estar no HTML mesmo sem JS
  await expect(page.locator(".bigo-fam-table tbody tr")).toHaveCount(8);
  await expect(page.getByRole("link", { name: /Big O Notation/ })).toHaveAttribute("href", /geeksforgeeks/);
});

test("marcar um tópico como concluído persiste na sessão", async ({ page }) => {
  await page.goto("/topico/sliding-window/");
  // Há dois botões de concluir (topo e fim da página); ambos alternam juntos.
  await page.getByRole("button", { name: "Marcar como concluído" }).first().click();
  await expect(page.getByRole("button", { name: "✓ Concluído" }).first()).toBeVisible();
});

test("índice 'Nesta página' tem links âncora funcionais", async ({ page }) => {
  await page.goto("/topico/sliding-window/");
  const toc = page.locator(".toc-links a").first();
  await expect(toc).toHaveAttribute("href", /^#.+/);
  // a âncora precisa existir na página (id no título correspondente)
  const href = await toc.getAttribute("href");
  await expect(page.locator(href!)).toHaveCount(1);
});

test("índice 'Nesta página' fica grudado ao rolar o artigo", async ({ page }) => {
  await page.goto("/topico/prefix-sum/");
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

test("código Python sai colorido do build, com selo discreto da linguagem", async ({ page }) => {
  await page.goto("/topico/prefix-sum/");
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

test("selo NOVO segue a tag isNew, não a existência de visualizador", async ({ page }) => {
  const marcados = ALL_TOPICS.filter((t) => t.isNew);
  await page.goto("/topico/big-o/");

  // abre todo grupo ainda fechado, para que os selos de todos os tópicos contem
  const grupos = page.locator(".side-group");
  for (let i = 0; i < (await grupos.count()); i++) {
    const g = grupos.nth(i);
    if ((await g.locator(".side-caret.open").count()) === 0) await g.locator(".side-group-btn").click();
  }

  await expect(page.locator(".side-item .badge-novo")).toHaveCount(marcados.length);
  for (const t of marcados) {
    await expect(page.locator(`.side-item[href="/topico/${t.slug}/"] .badge-novo`)).toBeVisible();
  }
});

test("página de introdução explica o guia e leva ao primeiro tópico", async ({ page }) => {
  await page.goto("/introducao/");
  await expect(page.getByRole("heading", { level: 1, name: "Introdução" })).toBeVisible();
  await page.getByRole("link", { name: "Começar por Big O" }).click();
  await expect(page).toHaveURL(/topico\/big-o/);
});

// Cobertura de todos os tópicos "ready": em vez de um teste artesanal por
// página, este bloco garante o contrato que toda página completa precisa
// cumprir. Ao promover um tópico novo, acrescente o slug aqui.
const TOPICOS_PRONTOS = [
  { slug: "big-o", h1: "Notação Big O", vizMin: 2 },
  { slug: "arrays", h1: "Arrays e Listas", vizMin: 3 },
  { slug: "strings", h1: "Strings", vizMin: 3 },
  { slug: "subarray-substring-subsequence-subset", h1: 'Os 4 "sub"', vizMin: 1 },
  { slug: "two-pointers", h1: "Two Pointers", vizMin: 3 },
  { slug: "sliding-window", h1: "Sliding Window", vizMin: 3 },
  { slug: "prefix-sum", h1: "Prefix Sum", vizMin: 2 },
  { slug: "intervals", h1: "Intervalos", vizMin: 2 },
  { slug: "hash-table", h1: "Tabelas Hash", vizMin: 2 },
  { slug: "listas-ligadas", h1: "Listas Encadeadas", vizMin: 3 },
  { slug: "skip-list", h1: "Skip List", vizMin: 2 },
  { slug: "pilhas", h1: "Pilhas (Stacks)", vizMin: 3 },
  { slug: "filas", h1: "Filas e Deques", vizMin: 3 },
  { slug: "recursao", h1: "Recursão: Fundamentos", vizMin: 2 },
  { slug: "recursao-funcional", h1: "Recursão: Programação Funcional", vizMin: 2 },
  { slug: "tree-traversals", h1: "Percursos em Árvore (DFS/BFS)", vizMin: 1 },
  { slug: "arvores-binarias", h1: "Árvores Binárias", vizMin: 1 },
  { slug: "n-ary-trees", h1: "Árvores N-árias", vizMin: 1 },
  { slug: "bst", h1: "Árvore de Busca Binária", vizMin: 1 },
  { slug: "grafos-intro", h1: "Introdução a Grafos", vizMin: 1 },
  { slug: "dfs-bfs", h1: "DFS e BFS em Grafos", vizMin: 1 },
  { slug: "dijkstra", h1: "Dijkstra", vizMin: 1 },
  { slug: "bellman-ford", h1: "Bellman-Ford", vizMin: 1 },
  { slug: "a-star", h1: "A* (A Estrela)", vizMin: 1 },
  { slug: "topological-sort", h1: "Ordenação Topológica", vizMin: 1 },
  { slug: "mst", h1: "Árvore Geradora Mínima (MST)", vizMin: 1 },
];

for (const t of TOPICOS_PRONTOS) {
  test(`tópico ${t.slug} entrega artigo, visualizadores e âncoras válidas`, async ({ page }) => {
    await page.goto(`/topico/${t.slug}/`);
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
  await page.goto("/topico/tree-traversals/");
  const viz = page.locator("figure.viz").first();
  const irAteOFim = async () => {
    const proximo = viz.getByRole("button", { name: "Próximo ›" });
    for (let i = 0; i < 60 && (await proximo.isEnabled()); i++) await proximo.click();
    return (await viz.locator(".tt-saida-item").allTextContents()).join(" ");
  };

  // as quatro sequências da árvore do encontro (raiz 1, esquerda 2 com 4 e 5, direita 3 com 6)
  const esperado: Record<string, string> = {
    "Pré-ordem": "1 2 4 5 3 6",
    "Em ordem": "4 2 5 1 6 3",
    "Pós-ordem": "4 5 2 6 3 1",
    "Por nível (BFS)": "1 2 3 4 5 6",
  };
  for (const [ordem, saida] of Object.entries(esperado)) {
    // exact: true porque o chip "Em ordem" colide com o preset "Uma BST: em ordem sai ordenado"
    await viz.getByRole("button", { name: ordem, exact: true }).click();
    expect(await irAteOFim(), `${ordem} deveria sair ${saida}`).toBe(saida);
  }
});

test("BST: a mesma sequência inserida em ordem degenera a árvore", async ({ page }) => {
  await page.goto("/topico/bst/");
  const viz = page.locator("figure.viz").first();
  // casa o card cujo rótulo é exatamente "altura": `hasText: "altura"` pegaria
  // também o card "altura mínima", e depender do .first() por ordem de DOM
  // deixaria o teste refém do layout
  const altura = async () => {
    const card = viz.locator(".bigo-stat").filter({ has: page.getByText("altura", { exact: true }) });
    const txt = await card.textContent();
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
  await page.goto("/topico/mst/");
  const viz = page.locator("figure.viz").first();
  const pesos = viz.locator(".viz-var", { hasText: /Kruskal|Prim/ });
  const textos = await pesos.allTextContents();
  const numeros = textos.map((t) => parseInt(t.replace(/\D+/g, ""), 10));
  expect(numeros).toHaveLength(2);
  expect(numeros[0]).toBe(numeros[1]);
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
    await page.goto(`/topico/${t.slug}/`);
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

test("nenhuma página de tópico rola na horizontal no celular", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const t of TOPICOS_PRONTOS) {
    await page.goto(`/topico/${t.slug}/`);
    const estoura = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(estoura, `${t.slug} estoura a largura no mobile`).toBe(false);
  }
});
