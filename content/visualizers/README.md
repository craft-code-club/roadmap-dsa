# A casca de um visualizador

Este documento é o **contrato** de como um visualizador do Roadmap DSA se
comporta. Ele não descreve o algoritmo que cada um ensina — isso é assunto do
componente — e sim a moldura em volta: o que aparece, o que rola, o que o
teclado faz e o que precisa caber na tela do aluno.

A mecânica toda vive num hook: **`src/lib/visualizador.tsx`**. Você não
reescreve nada disso — chama `useVisualizador`, espalha as props que ele devolve
e usa os dois componentes prontos (`VizCabecalho` e `VizRodape`). Referência de
uso: **`BigOCounterVisualizer.tsx`**.

O corte é rígido: o hook cobre **o que todo visualizador tem** (caber na tela,
painel, bloco que mostra e oculta, controles de reprodução) e **nada** do que
cada um mostra. O miolo — células, SVG, canvas, tabela — é 100% seu; o hook
nunca renderiza conteúdo.

Quando este texto e o código divergirem, o código ganha e o texto está
desatualizado — abra um PR corrigindo.

> Para *criar* um visualizador do zero (gerador puro de passos, registro no
> `mdx-components.tsx`), veja o [README](../../README.md) e o
> [CONTRIBUTING](../../CONTRIBUTING.md). Este documento cobre a casca.

---

## 1. O problema que a casca adaptativa resolve

Os visualizadores foram desenhados pensando em largura, e estouram em **altura**.
Medido no contador de operações do Big O, numa janela de notebook de 16":

| | altura pedida | altura disponível |
|---|---|---|
| no artigo, com o código à mostra | **941px** | 808px |
| expandido, com o código à mostra | **748px** de miolo | 700px |

E o modo expandido, que existe justamente para ver melhor, piorava: o `.viz`
inteiro rolava, então o **título e os botões de reprodução saíam da tela junto
com o conteúdo**. O aluno perdia de vista o `Próximo ›`, que é o botão que faz o
algoritmo andar.

## 2. As três camadas, nesta ordem

**Comprimir antes de esconder. Esconder é a última carta.** Conteúdo é o que o
aluno veio ver; respiro é o que dá para negociar.

| # | camada | onde vive | vale para |
|---|---|---|---|
| 1 | cabeçalho e controles **parados**, só o miolo rola | CSS (`.viz-overlay-fit`) + mover o rodapé no JSX | todo visualizador com overlay |
| 2 | **comprimir** respiro em tela baixa | CSS (`@media (max-height: 950px)`) | todo visualizador com overlay |
| 3 | **recolher** o bloco mais alto e mais dispensável | CSS + estado no componente | quem tem um bloco assim (código, normalmente) |

A camada 3 é a única condicional. Visualizador sem bloco de código — um SVG de
árvore, um canvas, uma tabela — recebe 1 e 2 e para por aí. Não invente um bloco
para recolher só para ter a camada 3.

## 3. Quem decide é a medição, não um breakpoint

O hook mede se a peça cabe e decide. Nada de `if (largura < 768)`. Você não
implementa nada disto — está aqui porque explica o comportamento que o aluno vê
e porque é o que quebra se alguém reescrever a mecânica à mão.

- **Expandido:** o miolo é a única área rolável, então "não coube" é
  `corpo.scrollHeight > corpo.clientHeight + FOLGA`.
- **No artigo:** a régua é a janela. Se a peça inteira não cabe numa tela, o
  aluno olha o array sem enxergar os botões que o fazem andar.

Três regras que só apareceram medindo:

- **Espere `document.fonts.ready`.** As fontes chegam com `display: swap`;
  medir antes é medir a altura da fonte de fallback.
- **Congele a animação antes de medir.** Reabrir o bloco e ler no mesmo quadro
  lê um layout a caminho e conclui "cabe" para uma peça que passa 64px da
  janela. A decisão acontece em duas passadas dentro do mesmo quadro, em
  `useLayoutEffect` (antes da pintura), com a transição desligada.
- **A escolha explícita do aluno vence a medição**, e só é zerada quando ele
  troca de contexto (abre ou fecha o expandido). Sem isso o clique dele é
  desfeito no primeiro `resize`.

## 4. A API de CSS

Tudo em `src/app/globals.css`, e tudo **opt-in**: um visualizador sem `viz-fit`
continua exatamente como era.

Quase tudo aqui chega pelas props do hook — a tabela existe para você reconhecer
o que está vendo no DOM e no CSS, não para digitar à mão.

| classe / atributo | onde | o que faz |
|---|---|---|
| `.viz-fit` | no `<figure>` | liga a casca adaptativa (vem em `propsFigura`) |
| `data-codigo="on\|off"` | no `<figure>` | estado do bloco recolhível |
| `data-anim="on\|off"` | no `<figure>` | liga as transições. `off` durante a medição e antes da primeira decisão |
| `.viz-overlay-fit` | na `<div>` do overlay | flex column, miolo rolável, cabeçalho e rodapé parados (vem do `emPainel`) |
| `.viz-foot` | irmão do `.viz-body` | os controles fora do miolo, para ficarem parados |
| `.viz-code-slot` | envolve o `.viz-code` | recolhe a **altura** (grid `1fr → 0fr`) |
| `.viz-vars.linha` | no painel de variáveis | vira fileira de fichas quando o código sai |
| `.viz-atalhos` | no rodapé | dica das teclas; some no celular |
| `.viz-toggle-codigo` | no botão do cabeçalho | estado visual pelo `aria-expanded` |

**Não edite o bloco `viz-fit` do `globals.css` para acomodar um visualizador
específico.** Ele é compartilhado por todos; regra que estende base compartilhada
alcança página que você não abriu — já colapsou painel para 0px neste repo. CSS
específico vai no bloco temático do próprio visualizador.

## 5. O contrato de UX do painel expandido

| o quê | regra |
|---|---|
| rolagem | só o miolo. A página atrás fica travada (`body { overflow: hidden }`) enquanto o painel está aberto |
| semântica | `role="dialog"`, `aria-modal="true"`, `aria-label` com o título |
| foco | entra no painel ao abrir, volta para onde estava ao fechar |
| `Tab` | **circula dentro do painel**. `aria-modal` sem trava é promessa falsa: sem ela o foco caía no `<body>` e seguia para os links do cabeçalho |
| `Esc` | fecha |
| `←` `→` | passo anterior / próximo |
| `espaço` | roda / pausa |
| descoberta | a dica `← → passo · espaço roda` no rodapé. Atalho que ninguém descobre é atalho que não existe |

**A regra mais importante dos atalhos é o inverso deles: campo em edição manda.**
Com o cursor num `input`, seta é cursor e espaço é espaço. No controle de
velocidade, seta é do slider. Espaço com um botão em foco é o botão. Sequestrar
isso deixa o array impossível de editar, o que é pior que não ter atalho.

Os comandos de passo usam a **forma funcional do `setState`**: a tecla repete
muito mais rápido que o clique, e ler `idx` do closure engole repetições.

## 6. Como aplicar: o hook

Tudo o que está descrito acima — medição, congelamento da animação, espera das
fontes, escolha manual, trava de rolagem, foco, `Tab` circulando, atalhos,
passo, rodar/pausar, velocidade, progresso — vem de **`useVisualizador`**. Não
reescreva: são armadilhas já resolvidas que voltam sozinhas quando alguém faz de
novo do zero.

```tsx
import { useVisualizador, VizCabecalho, VizRodape } from "@/lib/visualizador";

const passos = useMemo(() => gerarPassos(entrada), [entrada]);

const viz = useVisualizador({
  titulo: "Visualizador · o que este aqui mostra",
  total: passos.length,
  velocidades: VELOCIDADES,   // opcional: o ritmo é seu
  // o que MAIS muda a altura da peça (modo, tamanho da entrada, preset).
  // Expandir e redimensionar já entram sozinhos. Use valores primitivos.
  medirQuando: [modo, entrada.length],
});

const p = passos[viz.passo];
```

E o JSX vira só o seu miolo:

```tsx
return viz.emPainel(
  <figure {...viz.propsFigura} style={{ margin: 0 }}>
    <VizCabecalho viz={viz} cor={cor} />

    <div {...viz.propsCorpo}>
      …o que ESTE visualizador mostra…
      <div className="viz-split">
        <div className="viz-code-slot">
          <div className="viz-code" {...viz.propsBloco}>…</div>
        </div>
        <div {...viz.propsVars}>…</div>
      </div>
    </div>

    <VizRodape viz={viz} cor={cor} />
  </figure>
);
```

`VizCabecalho` monta a bolinha, o título, o contador de passo e os dois botões.
`VizRodape` monta os controles, a dica de atalhos e a barra de progresso — fora
do `.viz-body`, que é o que os deixa parados no pé do painel. Os dois aceitam
`children` para o que for específico do seu (botão de preset, seletor de modo).

Reprodução, quando você precisa mexer nela de fora: `viz.passo` (já limitado a
`[0, total-1]`), `viz.reiniciar()` — chame quando a **entrada** mudar —,
`viz.irPasso(±1)`, `viz.setPasso`, `viz.tocando`, `viz.pct`.

### Os casos fora do padrão

| situação | o que passar |
|---|---|
| sem bloco dispensável (SVG de árvore, canvas) | `recolhivel: false` — ganha o painel parado e nada mais. Não invente um bloco só para ter o botão |
| o recolhível não é código | `bloco: "tabela"` — o rótulo passa a dizer o que some, porque **rótulo que mente ensina errado** |
| sem linha do tempo (classificador, tabela) | `total: 1` — some o contador de passo, o rodapé e os atalhos |
| ritmo próprio | `velocidades: [...]` — um passo de sudoku e uma troca de array não pedem o mesmo tempo |
| só passo a passo, sem animação contínua | `<VizRodape semVelocidade />` |
| botões extras nos controles | `<VizRodape>{seus botões}</VizRodape>` |

O que continua por sua conta: envolver o bloco recolhível no `.viz-code-slot`
(zerar a coluna tira a largura, não a altura — §7) e escolher um `titulo` que
seja o desse visualizador, porque ele vira o `aria-label` do diálogo.

## 7. Armadilhas medidas

- **Zerar a trilha da coluna (`0fr`) tira a largura e NÃO a altura.** A linha do
  grid continua com a altura do bloco: o código "recolhido" seguia com 374px, e
  a peça inteira com 941px onde cabiam 808. A altura precisa do
  `.viz-code-slot`, com `grid-template-rows: 1fr → 0fr` — a única forma em CSS
  puro de animar altura automática.
- **Lista de trilhas de grid só interpola quando todas são da mesma natureza.**
  `1fr 300px → 1fr` não anima. `minmax(0,2fr) minmax(0,1fr) → minmax(0,0fr)
  minmax(0,1fr)` anima.
- **A sombra do rodapé não é simétrica à do cabeçalho por acidente.** O
  cabeçalho tem fundo próprio e dilui a sombra nesse degrau de cor; o rodapé
  divide o fundo com o miolo e ainda soma com o `border-top` dos controles. Com
  os mesmos valores nos dois, a de baixo lê como o dobro.
- **A altura do cabeçalho do site vem do token `--ccc-header-h`**, não de um 60
  digitado no componente. Token muda, conta desregula.
- **O respiro do pé do miolo vive no `padding-bottom` do `.viz-body`**, não na
  margem dos controles: dentro de uma área rolável ele também é a folga contra a
  borda, então o conteúdo não encosta na linha do rodapé quando a rolagem chega
  ao fim.

## 8. Como provar que funcionou

Contar elemento não testa nada — já passaram por uma suíte verde um visualizador
sem botão nenhum e um painel com 0px de largura. **Meça comportamento e leia
rótulo.**

Antes e depois, com o build servido (`npm run build` e um servidor estático):

```js
// numa janela de 1512x900, com o painel expandido aberto
const f = document.querySelector("figure.viz-fit");
const b = f.querySelector(".viz-body");
({
  rola: b.scrollHeight > b.clientHeight,                       // o miolo tem sobra?
  cabecaColada: Math.round(f.querySelector(".viz-head").getBoundingClientRect().top
                           - f.getBoundingClientRect().top),   // <= 2
  rodapeColado: Math.round(f.getBoundingClientRect().bottom
                           - f.querySelector(".viz-foot").getBoundingClientRect().bottom),
})
```

Nos testes (`tests/`), o mínimo por visualizador adaptado:

1. cabeçalho e rodapé **não se mexem** quando o miolo rola até o fim, e o
   `▶ Rodar` continua na viewport;
2. em tela baixa o botão diz **"Mostrar código"** e o bloco está recolhido;
3. em tela alta ele já vem aberto;
4. a escolha do aluno sobrevive a uma troca de estado que pediria medição nova;
5. `←`/`→`/espaço andam a animação, **e não roubam a tecla de quem digita**.

E rode cada teste novo **contra o código quebrado** antes de confiar nele. Duas
regras que custaram caro:

- **Nunca silencie o build nessa hora.** Os testes rodam contra `out/`, e um
  build que falha deixa o artefato anterior no lugar: a quebra não chega ao
  navegador, o teste passa, e você conclui que o teste é inútil quando o inútil
  foi o experimento. Escolha uma quebra que **compile** (inverter uma condição,
  não acrescentar um `return` que deixa código inalcançável).
- Use `npm run test:build`. `npm test` sozinho exercita o build anterior.
