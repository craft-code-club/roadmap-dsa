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
ser só nome de import, de hook e de prop.

**Este guarda já passou verde três vezes com a aula estragada**, e as três por
olhar de menos. Vale conhecer os buracos que ele tapou, porque eles dizem onde
procurar o próximo:

| versão | o que não olhava | o que passou |
|---|---|---|
| 1ª | nós de texto JSX | `<span>Array (fica sorted)</span>` e mais dois rótulos |
| 2ª | nó JSX **em mais de uma linha** | `inserir no fim` virou `inserir no done` |
| 2ª | literal **dentro** de `${...}` | `reservar a capacidade certa` virou `capacity` |

Os dois da 2ª versão não são casos exóticos: o Prettier quebra a linha de
qualquer elemento cujos atributos não cabem, e ternário dentro de interpolação
é como metade das notas deste repo escolhe entre singular e plural.

**Mais dois buracos, medidos no `listas-ligadas`, e os dois continuam
abertos** — porque tapá-los é reescrever o guarda com um analisador de verdade,
e isso é PR de plataforma, não carona numa adaptação de tópico:

| o que não olha | o que passa |
|---|---|
| **template dentro de `${...}`**: o casamento da crase é regex, então uma crase aninhada tira o pareamento de sincronia | o `LinkedListFloyd` tem 6 delas (``` `… ${cycle > 0 ? `, e ${cycle}…` : ""}` ```), e daí em diante o guarda compara **código** como se fosse tela: dezenas de linhas de ruído, e uma troca de rótulo de verdade some no meio |
| **texto de tela que divide a linha com uma interpolação**: o padrão exige `>texto<`, e um `{` no meio corta o casamento | `<span>Nós no ciclo: {cycle === 0 ? … }</span>` — "Nós no ciclo: " não está em string nenhuma, não é visto pelo guarda, e um rename cego o estragaria **sem nenhum aviso** |

O segundo é o mais perigoso dos dois, porque é silencioso: o primeiro pelo
menos grita. E os dois têm a mesma consequência prática — **quando o arquivo
tiver crase aninhada ou rótulo colado numa interpolação, o guarda não é prova;
a prova é comparar o texto renderizado dos ESTADOS** (§8), que é o que pegou
os dois aqui.

**E um buraco continua aberto, por construção: ele compara o CONJUNTO de textos,
não onde cada um aparece.** Trocar dois campos de lugar num rename (o subtítulo
de um cartão indo para o corpo e vice-versa) mantém o conjunto idêntico e passa
verde. Medido: com `{l.subtitle}` e `{l.body}` invertidos no
`SubTypesVisualizer`, o guarda não acusa nada e a tela mente. Quem pega isso é
teste que lê **rótulo e valor juntos**, no mesmo cartão — veja a §8.

Por isso, **a prova final de um rename não é o guarda, é o HTML do build**. Ele
é o que o aluno recebe, e a comparação é objetiva:

```bash
render() { python3 -c "
import re,sys
s=open(sys.argv[1],encoding='utf-8').read()
s=re.sub(r'<script.*?</script>','',s,flags=re.S)
s=re.sub(r'<[^>]+>','\n',s)
print('\n'.join(l.strip() for l in s.split('\n') if l.strip()))" "$1"; }

npm run build && render out/topico/<slug>/index.html > /tmp/depois.txt
diff /tmp/antes.txt /tmp/depois.txt     # tem que sair vazio
```

Três notas de execução, todas medidas:

- renomear um campo pode **colidir com uma variável local** de mesmo nome
  (`fora` → `out` bateu num `out` que já existia, e o `tsc` reclamou de tipo em
  vez de nome);
- a substituição por palavra inteira estraga **comentários** também, então
  releia os que citam nomes;
- **chave de tipo escrita como literal é código**, e qualquer ferramenta que
  protege literais a deixa para trás: em `Omit<Step, "slots" | "desloc">` o
  `"desloc"` precisava virar `"shifts"` junto com o campo. Aqui só o `tsc`
  pegou — o guarda de idioma, por construção, nunca vai pegar.

Depois de tudo isso, confira no navegador: contador, botões, notas, rótulos e o
bloco de código.

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
| sem passo, mas com um número que resume o estado | passe o número como `children` do `VizHeader`: ele entra onde ficaria o "passo N de M". Mande o **rótulo junto** (`3 bytes em UTF-8`, não `3`), porque sem o passo ao lado o número perde o contexto que o explicava |
| ritmo próprio | `speeds: [...]` — um passo de sudoku e uma troca de array não pedem o mesmo tempo |
| só passo a passo, sem animação contínua | `<VizFooter noSpeed />` |
| botões extras nos controles | `<VizFooter>{seus botões}</VizFooter>` |
| **sem linha do tempo E com botões extras** | `<VizFooter>{seus botões}</VizFooter>` também: o rodapé sai com os seus botões e sem nada de reprodução |

A última linha já foi a contradição desta tabela, e **não é mais**: `VizFooter`
retornava `null` sempre que `total <= 1`, **descartando os `children` em
silêncio**, e dois visualizadores (`SubTypesVisualizer` e `PrefixSumTradeoff`)
escreveram o rodapé à mão por causa disso. O hook foi consertado: com
`total <= 1` ele descarta os controles de reprodução — que um visualizador sem
linha do tempo não tem —, mas desenha o `.viz-foot` com os seus `children`. Só
quando não há `children` é que ele some inteiro.

Escrever o rodapé à mão continua sendo API pública, e é o que você usa quando
precisa de um `.viz-foot` que o hook não monta:

```tsx
{/* Fora do `.viz-body` de propósito: é o que os deixa parados no pé do
    painel enquanto o miolo rola. */}
<div className="viz-foot">
  <div className="viz-controls">…seus botões…</div>
</div>
```

Não é um atalho: `.viz-foot` é parte da API de CSS (§4), e `.viz-controls`
dentro dele recebe a mesma linha divisória e o mesmo respiro que o rodapé do
hook. O que você não ganha — progresso, velocidade, atalhos — é justamente o que
um visualizador sem linha do tempo não tem.

`measureOn` não faz nada quando `collapsible: false`: sem bloco para recolher,
não há decisão a tomar e o hook nem espera as fontes. Passar a lista ali é ruído
que sugere uma medição que não acontece.

**`total` que vem da entrada do aluno pode cair para 1, e aí somem o contador, os
atalhos, a barra de progresso e os botões de reprodução** — os seus `children`
ficam, mas sozinhos numa linha que era de outra coisa. No visualizador de
memória contígua o passo É o índice, então um array de um elemento zera a linha
do tempo. Preset e botão de estado ficam no miolo; no rodapé só o que é
reprodução — assim a linha não muda de sentido quando a linha do tempo some.

E o `↺` do `VizFooter` é `viz.reset()`: ele volta ao passo 0 e **não** desfaz o
estado que o aluno montou (array, modo, parâmetros). Se o seu visualizador tinha
um "reiniciar" que zerava tudo, esse caminho de volta vira um botão seu — o
rótulo do `↺` promete uma coisa só, e é a que ele faz.

O que continua por sua conta: envolver o bloco recolhível no `.viz-code-slot`
(zerar a coluna tira a largura, não a altura — §7) e escolher um `titulo` que
seja o desse visualizador, porque ele vira o `aria-label` do diálogo.

**`measureOn` tem que cobrir o que liga ou desliga um pedaço da casca, não só o
que muda o miolo.** Quando o `total` é derivado da entrada, ele pode atravessar
1 durante o uso: o gerador da comparação da sliding window devolve **um passo
só** no caso de borda `k > n`, e aí o contador, o rodapé e os atalhos somem
inteiros — cerca de 90px a menos de peça — sem que o tamanho da entrada tenha
mudado. Um `measureOn: [n]` não pediria medição nova nessa travessia. O que
resolveu foi `measureOn: [n, steps.length]`.

## 7. Armadilhas medidas

- **Zerar a trilha da coluna (`0fr`) tira a largura e NÃO a altura.** A linha do
  grid continua com a altura do bloco: o código "recolhido" seguia com 374px, e
  a peça inteira com 941px onde cabiam 808. A altura precisa do
  `.viz-code-slot`, com `grid-template-rows: 1fr → 0fr` — a única forma em CSS
  puro de animar altura automática.
- **Lista de trilhas de grid só interpola quando todas são da mesma natureza.**
  `1fr 300px → 1fr` não anima. `minmax(0,2fr) minmax(0,1fr) → minmax(0,0fr)
  minmax(0,1fr)` anima.
- **Quem deixa a trilha fechar é o `overflow` do filho, não um `min-height`
  escrito à mão.** Um item de grid só ganha tamanho mínimo automático quando o
  overflow dele é `visible`; qualquer outro valor já zera esse mínimo. É por isso
  que o `.viz-code`, que é `overflow: hidden`, fecha sem mais nada. Ao recolher
  um bloco que **não** é `.viz-code`, olhe o `overflow` dele antes de escrever
  CSS: uma tabela dentro de um container com `overflow-x: auto` já fecha sozinha,
  e o par de regras "de apoio" que parece obrigatório é inerte. Prove antes de
  ficar com ele — se o teste de altura passa com a regra removida, a regra não é
  a razão de nada.
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

Os itens 2, 3 e 4 — os três que falam do bloco recolhível — não existem quando
`collapsible: false`. No lugar deles, prove que a ausência tem o rótulo certo:
**nenhum botão pode prometer esconder um bloco que o visualizador não tem.**

Duas armadilhas medidas ao escrever esses testes:

- **`click()` do Playwright ROLA o contêiner para alcançar o alvo.** Um teste
  que clica no botão do rodapé e conclui "está ao alcance" passa igualzinho com
  o rodapé de volta dentro do miolo — medido, com a quebra aplicada e o build
  visível. *Alcançável* não é *à vista*. Ancore no `scrollTop`: clique só no que
  está no topo do miolo e exija `scrollTop` igual a `0` **depois** do clique no
  controle.
- **Um teste de rolagem sem sobra para rolar não testa nada.** Afirme primeiro
  que `scrollHeight - clientHeight` passa de zero; senão o dia em que a peça
  encolher o teste vira decoração verde.

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

---

## 9. Limites medidos da casca

Todos são do comportamento da casca — não do componente — e estão aqui porque
explicam números que o relatório de qualquer adaptação vai encontrar, ou
recursos que o hook não tem. A seção cresce: acrescente no fim em vez de
renumerar.

### A compressão da camada 2 não alcança o fluxo do artigo

O bloco `@media (max-height: 950px)` do `globals.css` é escopado em
`.viz-overlay-fit`: ele só aperta o respiro **dentro do painel expandido**.
Medido, com o código à mostra nas cinco peças do `intervals`: as alturas numa
janela de 940px (dentro da consulta) e numa de 1000px (fora dela) são
**idênticas ao pixel** — 1004, 1176, 1180, 1208 e 1071.

A consequência prática é a ordem em que as camadas agem no artigo: lá só valem
a 3 (recolher) e o layout base, porque a 2 nunca entra. Por isso uma peça pode
caber com folga no expandido e ainda passar do orçamento no fluxo do artigo,
com o bloco já recolhido — e o relatório deve dizer isso com número, em vez de
tratar como defeito do componente.

Estender a compressão ao artigo é **PR de plataforma**: mexe em base
compartilhada e alcança página que ninguém abriu. Não vá de carona numa
adaptação de tópico.

### O hook não tem passo inicial, e a saída não é um efeito

`useVisualizer` sempre começa no passo 0. Quando a peça precisa abrir noutro
instante — no `intervals`, a sobreposição abre com B já invadindo A, porque em
t = 0 os dois nem se tocam e abrir sem sobreposição num visualizador sobre
sobreposição ensina ao contrário —, o ajuste vai na **fase de render**, não num
`useEffect`:

```tsx
const [placed, setPlaced] = useState(false);
if (!placed) {
  setPlaced(true);
  viz.setStep(INITIAL_STEP);
}
```

É o padrão documentado do React para estado derivado, e a diferença importa duas
vezes: ele roda antes da pintura (nada pisca na hidratação) **e dentro do build
estático**, então o HTML pré-renderizado já sai no passo certo. Com `useEffect`,
o `out/` congela o passo 1 e só o cliente corrige — conferido no HTML do build.

Uma consequência a assumir: o `↺` do `VizFooter` é `viz.reset()`, que volta ao
passo **0**, e não ao passo inicial escolhido. Se o estado de partida for para
valer, ele precisa de um botão próprio — ver a nota do `↺` na §6.

### Adotar a casca deixa a peça mais ALTA no artigo, e quem não tem bloco paga

O `.viz-foot` sai do `.viz-body` — é isso que o deixa parado no pé do painel — e
traz o respiro dele: uma linha divisória e o padding dos controles. No painel
expandido isso não custa nada, porque lá a régua é a janela e o miolo rola. **No
fluxo do artigo custa altura**, e quem tem bloco recolhível paga com o bloco.

Quem não tem, não paga: com `collapsible: false` não existe a camada 3, e a
camada 2 não alcança o artigo (limite acima). Medido:

| peça | artigo antes | artigo depois |
|---|---|---|
| `HashTableBuscaVisualizer` (`collapsible: false`, com linha do tempo) | 847px | **875px** (+28) |
| `PrefixSumTradeoff` (`collapsible: false`, `total: 1`, rodapé à mão) | 731px | **741px** (+10) |

Nos dois a adaptação valeu, porque o que ela conserta é outra coisa — e só
aparece **abaixo** da régua de 1512x900. Na busca da hash table, o `▶ Rodar` era
desenhado 104px (1440x700) e 204px (1440x600) abaixo do pé visível da peça; no
trade-off, o `↺ Reiniciar` ficava 135px e 235px abaixo. Nos quatro casos o
controle voltou para dentro da janela e o cabeçalho parou de subir.

Mas o número no artigo piora, e o relatório tem que dizer isso **com o
número**, não arredondar para "sem mudança". A pergunta certa ao decidir o
escopo de uma peça sem bloco não é "quanto ela encolhe", é "onde ficam os
controles quando ela rola".
