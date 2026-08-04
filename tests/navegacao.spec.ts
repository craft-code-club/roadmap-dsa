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
  { slug: "binary-heap", h1: "Binary Heap", vizMin: 2 },
  { slug: "heap-sort", h1: "Heap Sort", vizMin: 2 },
  { slug: "busca-binaria", h1: "Busca Binária", vizMin: 3 },
  { slug: "ordenacao-basica", h1: "Ordenação Básica", vizMin: 3 },
  { slug: "merge-sort", h1: "Merge Sort", vizMin: 3 },
  { slug: "quick-sort", h1: "Quick Sort", vizMin: 3 },
  { slug: "shell-sort", h1: "Shell Sort", vizMin: 3 },
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
  await page.goto("/topico/bst/");
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
  await page.goto("/topico/mst/");
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
  await page.goto("/topico/binary-heap/");
  const viz = page.locator("figure.viz").filter({ hasText: "a árvore e o array do heap se movendo juntos" });
  const irAteOFim = async () => {
    const proximo = viz.getByRole("button", { name: "Próximo ›" });
    for (let i = 0; i < 120 && (await proximo.isEnabled()); i++) await proximo.click();
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
  await page.goto("/topico/binary-heap/");
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
  await viz.getByRole("button", { name: "↺" }).click();
  await expect(nos).toHaveCount(1);
});

test("heap: remover o topo repetidamente devolve os valores em ordem", async ({ page }) => {
  await page.goto("/topico/binary-heap/");
  const viz = page.locator("figure.viz").filter({ hasText: "a árvore e o array do heap se movendo juntos" });
  await viz.getByRole("button", { name: "remover o topo" }).click();
  const proximo = viz.getByRole("button", { name: "Próximo ›" });
  for (let i = 0; i < 200 && (await proximo.isEnabled()); i++) await proximo.click();
  // asserção web-first: reconsulta até a saída completa aparecer
  await expect(viz.locator(".tt-saida-item")).toHaveText(["1", "2", "3", "4", "5", "6"]);
});

test("índices do heap: clicar num nó acende pai e filhos com as contas certas", async ({ page }) => {
  await page.goto("/topico/binary-heap/");
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
  await page.goto("/topico/heap-sort/");
  const viz = page.locator("figure.viz").filter({ hasText: "heap sort: duas fases no mesmo array" });
  const proximo = viz.getByRole("button", { name: "Próximo ›" });
  for (let i = 0; i < 200 && (await proximo.isEnabled()); i++) await proximo.click();
  // no fim, toda posição está congelada e na ordem crescente
  await expect(viz.locator(".hp-cel.fixo")).toHaveCount(10);
  // cada célula concatena índice e valor: posição 0 com o valor 1 lê "01"
  await expect(viz.locator(".hp-arr .hp-cel")).toHaveText([
    "01", "12", "23", "34", "45", "56", "67", "78", "89", "910",
  ]);
});

test("heap sort é instável: os empates saem fora da ordem de entrada", async ({ page }) => {
  await page.goto("/topico/heap-sort/");
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
  await page.goto("/topico/busca-binaria/");
  const viz = page.locator("figure.viz").filter({ hasText: "metade some a cada olhada" });
  const proximo = viz.getByRole("button", { name: "Próximo ›" });
  const irAteOFim = async () => {
    for (let i = 0; i < 60 && (await proximo.isEnabled()); i++) await proximo.click();
  };

  // 8 posições, alvo no meio: 3 comparações contra as 5 da busca linear
  await irAteOFim();
  const stat = (rot: RegExp) => viz.locator(".bigo-stat").filter({ hasText: rot });
  await expect(stat(/^comparações até aqui\d/)).toContainText("3");
  await expect(stat(/^busca linear gastaria\d/)).toContainText("5");
  // "descartadas sem ler" não conta a posição do meio, que foi lida. Com 8
  // posições, 3 lidas e 5 descartadas fecham o array inteiro, e é essa
  // invariante que mantém a estatística honesta.
  await expect(stat(/^descartadas sem ler\d/)).toContainText("5");

  // dobrar o array de 8 para 16 acrescenta UMA comparação, não dobra o trabalho
  await viz.getByRole("button", { name: /16 posições/ }).click();
  await irAteOFim();
  await expect(stat(/^comparações até aqui\d/)).toContainText("4");

  // num alvo ausente a busca varre o espaço inteiro, então lidas + descartadas
  // tem que fechar exatamente em n
  await viz.getByRole("button", { name: /não existe: 40/ }).click();
  await irAteOFim();
  const numero = async (rot: RegExp) =>
    parseInt(((await stat(rot).textContent()) ?? "").replace(/\D+/g, "").slice(-2), 10);
  const lidas = await numero(/^comparações até aqui\d/);
  const cegas = await numero(/^descartadas sem ler\d/);
  expect(lidas + cegas, "toda posição é lida ou descartada, exatamente uma vez").toBe(8);
});

test("busca binária: a fórmula ingênua do meio estoura o inteiro de 32 bits", async ({ page }) => {
  await page.goto("/topico/busca-binaria/");
  const viz = page.locator("figure.viz").filter({ hasText: "as duas formas de achar o meio" });

  // com índices pequenos as duas fórmulas concordam, que é o motivo de o bug passar
  await viz.getByRole("button", { name: /Índices de um array de exemplo/ }).click();
  await expect(viz.locator(".viz-step")).toHaveText("as duas concordam");
  await expect(viz.locator(".bb-bit.sinal")).not.toHaveClass(/\bon\b/);

  // com índices grandes e válidos, a soma dá a volta e o meio vira negativo
  await viz.getByRole("button", { name: /Alguns passos depois/ }).click();
  await expect(viz.locator(".viz-step")).toHaveText("as duas discordam");
  await expect(viz.locator(".bb-bit.sinal")).toHaveClass(/\bon\b/);
  await expect(viz.locator(".bb-formula").first().locator("li b").last()).toContainText("-397.483.648");
  await expect(viz.locator(".bb-formula").nth(1).locator("li b").last()).toContainText("1.750.000.000");
});

test("fronteira: a mesma busca devolve primeira, última e ponto de inserção", async ({ page }) => {
  await page.goto("/topico/busca-binaria/");
  const viz = page.locator("figure.viz").filter({ hasText: "repetidos, bordas e a posição de inserção" });
  const proximo = viz.getByRole("button", { name: "Próximo ›" });
  const resposta = async (rot: RegExp) => {
    for (let i = 0; i < 60 && (await proximo.isEnabled()); i++) await proximo.click();
    return viz.locator(".bigo-stat").filter({ hasText: rot });
  };

  // [1, 3, 3, 3, 5, 8, 8, 11, 14] procurando 3: bloco nas posições 1, 2 e 3
  await expect(await resposta(/^primeira ocorrência/)).toContainText("1");
  await viz.getByRole("button", { name: "última ocorrência" }).click();
  await expect(await resposta(/^última ocorrência/)).toContainText("3");

  // um valor ausente: a busca falha, mas a posição de inserção sai de graça
  await viz.getByRole("button", { name: "onde entraria" }).click();
  await viz.getByRole("button", { name: /não existe: 7/ }).click();
  await expect(await resposta(/^onde o valor entraria/)).toContainText("5");
  // o retorno negativo é o do caso de FALHA: -(5) - 1
  const retorno = viz.locator(".bigo-stat").filter({ hasText: /^retorno do Arrays/ });
  await expect(retorno).toContainText("-6");

  // Regressão: com o alvo PRESENTE o card mostrava o negativo do mesmo jeito,
  // mas aí o Arrays.binarySearch devolve o índice. O 3 existe na posição 1.
  await viz.getByRole("button", { name: /bloco de três iguais/ }).click();
  await resposta(/^onde o valor entraria/);
  await expect(retorno).toContainText("1");
  await expect(retorno).not.toContainText("-");

  // Borda de cima: a esquerda para em 9, que é o tamanho do array e não indexa
  // ninguém. É onde a checagem de existência leria fora do intervalo.
  await viz.getByRole("button", { name: /Maior que tudo/ }).click();
  await expect(await resposta(/^onde o valor entraria/)).toContainText("9");
  await expect(retorno).toContainText("-10");
});

test("ordenação básica: o selection sort não tem melhor caso", async ({ page }) => {
  await page.goto("/topico/ordenacao-basica/");
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
  await page.goto("/topico/ordenacao-basica/");
  const corrida = page.locator("figure.viz").filter({ hasText: "o mesmo array custa três preços" });
  const barras = (linha: number) => corrida.locator(".ord-linha").nth(linha).locator(".bb-barra-txt");

  // preset embaralhado (12 inversões): os números são os mesmos que o
  // visualizador de passo a passo mostra, porque saem do mesmo gerador
  await expect(corrida.locator(".viz-step")).toContainText("12 inversões");
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
  await page.goto("/topico/merge-sort/");
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
  await expect(niveis.locator(".viz-step")).toContainText("6 rodadas de intercalação x 64 elementos = 384");

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
  await page.goto("/topico/quick-sort/");
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
  await expect(vias.locator(".ms-op").nth(0)).toContainText("28 comparações · profundidade 8");
  await expect(vias.locator(".ms-op").nth(1)).toContainText("16 comparações · profundidade 1");
  await expect(vias.locator(".ms-op").nth(1)).toContainText("nenhum subproblema");
  // sem repetidos ela não é melhor: mesma profundidade e o dobro de comparações
  await vias.getByRole("button", { name: /Sem repetição/ }).click();
  await expect(vias.locator(".ms-op").nth(0)).toContainText("18 comparações · profundidade 5");
  await expect(vias.locator(".ms-op").nth(1)).toContainText("35 comparações · profundidade 5");
});

test("shell sort: a h-ordenação não se perde e o gap só compensa com n grande", async ({ page }) => {
  await page.goto("/topico/shell-sort/");
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
  await expect(sub.locator(".viz-step")).toContainText("1 subsequência de 8 elementos");

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

// Regressão: um bloco de CSS foi parar DEPOIS da seção responsiva do
// globals.css, então o override de `.gr-split` para uma coluna era vencido por
// ordem de cascata e o segundo painel colapsava para 0px no celular. Não havia
// overflow (as colunas usam minmax(0, ...) e encolhem), então o teste de
// overflow passava enquanto metade do visualizador sumia da tela.
test("no celular, nenhum painel de visualizador colapsa", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const colapsados: string[] = [];

  for (const t of TOPICOS_PRONTOS) {
    await page.goto(`/topico/${t.slug}/`);
    const paineis = await page
      .locator(
        "article figure.viz .gr-painel, article figure.viz .tt-painel, " +
          "article figure.viz .hp-bloco, article figure.viz .hs-fila, " +
          "article figure.viz .bb-formula, article figure.viz .hp-formula, " +
          "article figure.viz .ord-linha, article figure.viz .ord-medida, " +
          "article figure.viz .ms-lado, article figure.viz .ms-op"
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
    await page.goto(`/topico/${t.slug}/`);
    const estoura = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(estoura, `${t.slug} estoura a largura no mobile`).toBe(false);
  }
});
