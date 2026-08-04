# A casca de um visualizador

Este documento é o **contrato** de como um visualizador do Roadmap DSA se
comporta. Ele não descreve o algoritmo que cada um ensina — isso é assunto do
componente — e sim a moldura em volta: o que aparece, o que rola, o que o
teclado faz e o que precisa caber na tela do aluno.

A mecânica toda vive num hook: **`src/lib/visualizer.tsx`**. Você não reescreve
nada disso — chama `useVisualizer`, espalha as props que ele devolve e usa os
dois componentes prontos (`VizHeader` e `VizFooter`). Referência de uso:
**`BigOCounterVisualizer.tsx`**.

O corte é rígido: o hook cobre **o que todo visualizador tem** (caber na tela,
painel, bloco que mostra e oculta, controles de reprodução) e **nada** do que
cada um mostra. O miolo — células, SVG, canvas, tabela — é 100% seu; o hook
nunca renderiza conteúdo.

Este documento é **normativo**: ele diz como a casca deve se comportar. O
código é a implementação dele. Divergência entre os dois é defeito, e o
conserto é alinhar os dois **no mesmo PR** — nem "o código sempre ganha" nem "o
texto sempre ganha". Decida qual dos dois está errado:

- comportamento que o código tem e o contrato não descreve → ou o contrato está
  incompleto (documente), ou o comportamento é acidental (remova);
- regra que o contrato promete e o código não cumpre → é bug, com teste.

## 0. Idioma: identificador em inglês, tela em português

Mesma regra dos campos do `content/roadmap.ts`, agora valendo para o código dos
visualizadores:

| o quê | idioma | exemplo |
|---|---|---|
| identificadores: variáveis, tipos, campos, props, funções | **inglês** | `step`, `worstCase`, `measureOn`, `blockProps` |
| qualquer coisa que o aluno lê | **português** | `"passo 1 de 7"`, `"Mostrar código"`, `name: "operações"` |
| comentários | português, quando explicar melhor | — |
| nome do componente | o que fizer sentido | `BigOCounterVisualizer`, `BinarioDivisoes` |

**A armadilha está na fronteira, e ela já mordeu:** o código Python que aparece
na tela (`esq, dir = 0, len(nums) - 1`), os rótulos das variáveis (`esq`, `dir`,
`operações`) e as notas do passo a passo são **conteúdo didático em português**,
mesmo morando dentro de uma string no meio do código. Um `find & replace` de
`esq` → `left` traduz o identificador e estraga a aula junto — e produz frases
como "O array precisa estar sorted".

Ao renomear em lote, **não revise o diff a olho** — ele tem centenas de linhas e
o erro passa. Rode o guarda, que compara tudo que aparece na tela (literais de
string **e nós de texto JSX**) antes e depois:

```bash
git show HEAD:content/visualizers/MeuVisualizador.tsx > /tmp/antes.tsx
python3 scripts/guarda-idioma.py /tmp/antes.tsx content/visualizers/MeuVisualizador.tsx
```

Ele sai com erro se qualquer texto de tela entrou ou saiu. O que sobrar tem que
ser só nome de import, de hook e de prop. Na primeira versão deste guarda os
nós JSX ficaram de fora, e três rótulos passaram batido — `<span>Array (fica
sorted)</span>` entre eles. Depois, confira no navegador: contador, botões,
notas, rótulos e o bloco de código.

Duas notas de execução: renomear um campo pode **colidir com uma variável local**
de mesmo nome (`fora` → `out` bateu num `out` que já existia, e o `tsc` reclamou
de tipo em vez de nome); e a substituição por palavra inteira estraga
**comentários** também, então releia os que citam nomes.

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
  `body.scrollHeight > body.clientHeight + SLACK`.
- **No artigo:** a régua é a janela. Se a peça inteira não cabe numa tela, o
  aluno olha o array sem enxergar os botões que o fazem andar.

Três regras que só apareceram medindo:

- **Espere `document.fonts.ready`.** As fontes chegam com `display: swap`;
  medir antes é medir a altura da fonte de fallback.
- **Congele a animação antes de medir.** Reabrir o bloco e ler no mesmo quadro
  lê um layout a caminho e conclui "cabe" para uma peça que passa 64px da
  janela. A decisão acontece em duas passadas dentro do mesmo quadro, em
  `useLayoutEffect` (antes da pintura), com a transição desligada.
- **A escolha explícita do aluno vence a medição, e não é desfeita por nada.**
  Nem por `resize`, nem por troca de estado, nem por abrir ou fechar o painel.
  Isso já foi diferente — a escolha era zerada na travessia, com o argumento de
  que abrir o painel é "um pedido novo" — e estava errado: quem clica em
  "Mostrar código" e expande espera continuar vendo o código. Se não couber, o
  miolo rola, que é para isso que o cabeçalho e o rodapé ficam parados.

## 4. A API de CSS

Tudo em `src/app/globals.css`, e tudo **opt-in**: um visualizador sem `viz-fit`
continua exatamente como era.

Quase tudo aqui chega pelas props do hook — a tabela existe para você reconhecer
o que está vendo no DOM e no CSS, não para digitar à mão.

| classe / atributo | onde | o que faz |
|---|---|---|
| `.viz-fit` | no `<figure>` | liga a casca adaptativa (vem em `figureProps`) |
| `data-codigo="on\|off"` | no `<figure>` | estado do bloco recolhível |
| `data-anim="on\|off"` | no `<figure>` | liga as transições. `off` durante a medição e antes da primeira decisão |
| `.viz-overlay-fit` | na `<div>` do overlay | flex column, miolo rolável, cabeçalho e rodapé parados (vem do `inPanel`) |
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
muito mais rápido que o clique, e ler o índice do closure engole repetições.

## 6. Como aplicar: o hook

Tudo o que está descrito acima — medição, congelamento da animação, espera das
fontes, escolha manual, trava de rolagem, foco, `Tab` circulando, atalhos,
passo, rodar/pausar, velocidade, progresso — vem de **`useVisualizer`**. Não
reescreva: são armadilhas já resolvidas que voltam sozinhas quando alguém faz de
novo do zero.

```tsx
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

const steps = useMemo(() => generateSteps(input), [input]);

const viz = useVisualizer({
  title: "Visualizador · o que este aqui mostra",
  total: steps.length,
  speeds: SPEEDS,             // opcional: o ritmo é seu
  // o que MAIS muda a altura da peça (modo, tamanho da entrada, preset).
  // Expandir e redimensionar já entram sozinhos. Use valores primitivos.
  measureOn: [mode, input.length],
});

const s = steps[viz.step];
```

E o JSX vira só o seu miolo:

```tsx
return viz.inPanel(
  <figure {...viz.figureProps} style={{ margin: 0 }}>
    <VizHeader viz={viz} color={color} />

    <div {...viz.bodyProps}>
      …o que ESTE visualizador mostra…
      <div className="viz-split">
        <div className="viz-code-slot">
          <div className="viz-code" {...viz.blockProps}>…</div>
        </div>
        <div {...viz.varsProps}>…</div>
      </div>
    </div>

    <VizFooter viz={viz} color={color} />
  </figure>
);
```

`VizHeader` monta a bolinha, o título, o contador de passo e os dois botões.
`VizFooter` monta os controles, a dica de atalhos e a barra de progresso — fora
do `.viz-body`, que é o que os deixa parados no pé do painel. Os dois aceitam
`children` para o que for específico do seu (botão de preset, seletor de modo).

Reprodução, quando você precisa mexer nela de fora: `viz.step` (já limitado a
`[0, total-1]`), `viz.reset()` — chame quando a **entrada** mudar —,
`viz.stepBy(±1)`, `viz.setStep`, `viz.playing`, `viz.progress`.

### Os casos fora do padrão

| situação | o que passar |
|---|---|
| sem bloco dispensável (SVG de árvore, canvas) | `collapsible: false` — ganha o painel parado e nada mais. Não invente um bloco só para ter o botão |
| o recolhível não é código | `blockName: "tabela"` — o rótulo passa a dizer o que some, porque **rótulo que mente ensina errado** |
| sem linha do tempo (classificador, tabela) | `total: 1` — some o contador de passo, o rodapé e os atalhos |
| ritmo próprio | `speeds: [...]` — um passo de sudoku e uma troca de array não pedem o mesmo tempo |
| só passo a passo, sem animação contínua | `<VizFooter noSpeed />` |
| botões extras nos controles | `<VizFooter>{seus botões}</VizFooter>` |

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
- **Desenho com `width: 100%` e `height: auto` infla a ALTURA junto com a
  largura, e o que infla é o vazio.** Um SVG com viewBox de 406x204 esticado
  para os 800px do corpo passa a ocupar 402px de altura — 2x o tamanho natural,
  e no visualizador de ciclo isso era 402 dos 939px da peça inteira. Recolher o
  código não resolve, porque o problema não é o código. Um `max-height` no bloco
  temático do visualizador, dentro de `@media (max-height: ...)`, devolve a
  altura sem esconder nada: o `preserveAspectRatio` padrão encolhe e centraliza,
  e o desenho continua inteiro. **No expandido o teto não vale** — lá o miolo
  rola, e o painel existe justamente para ver o desenho maior; deixe a regra do
  painel ganhar por especificidade, não por ordem de arquivo.

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

E dois jeitos de escrever um teste **vazio** desta casca, os dois medidos aqui,
os dois passando contra a quebra antes de serem consertados:

- **Rolar o `.viz-body` sem provar que é ele quem rola.** Se a quebra devolve a
  rolagem para a figura inteira — que é exatamente o bug que a camada 1 conserta
  —, `body.scrollTop` fica em zero, o cabeçalho não se mexe, e o teste aprova a
  quebra. Exija as três coisas: que o miolo **estoure**
  (`scrollHeight - clientHeight > SLACK`), que ele mesmo **role**
  (`scrollTop > 0` depois de rolar) e que a figura **não** role.
- **Trocar um estado que não está em `measureOn`.** O teste da escolha manual só
  significa alguma coisa quando a medição discordaria do aluno. Um preset que
  troca só o alvo não muda `measureOn`, não dispara medição nenhuma, e a escolha
  "sobrevive" sem que nada a tenha ameaçado. Escolha um estado que muda mesmo a
  entrada da medição, **confirme a troca na tela** antes de concluir, e deixe a
  janela apertada o bastante para a medição querer recolher.
