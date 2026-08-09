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
o erro passa. Rode o guarda, que compara tudo que aparece na tela antes e
depois:

```bash
git show HEAD:content/visualizers/MeuVisualizador.tsx > /tmp/antes.tsx
python3 scripts/guarda-idioma.py /tmp/antes.tsx content/visualizers/MeuVisualizador.tsx

# ou o diretório inteiro de uma vez, com diretórios dos dois lados:
mkdir -p /tmp/antes && git archive HEAD content/visualizers | tar -x -C /tmp/antes
python3 scripts/guarda-idioma.py /tmp/antes/content/visualizers content/visualizers
```

Ele sai **0** quando o texto de tela é idêntico, **1** quando mudou e **2**
quando o próprio guarda não conseguiu rodar — nunca 0 por não ter conseguido
olhar. O que sobrar tem que ser só nome de import, de hook e de prop.

### O que o guarda olha

Desde a 4ª versão ele **não casa texto por regex: ele parseia**. Quem lê o TSX é
o compilador do TypeScript (`ts.createSourceFile`, num script Node irmão,
`scripts/extrai-textos-tsx.mjs`); o `guarda-idioma.py` continua sendo a porta de
entrada, com a mesma linha de comando. Ele coleta:

| o quê | vira |
|---|---|
| literal de string e template **em qualquer nível de aninhamento** | o texto, com cada `${…}` virando `§` |
| nós de texto JSX, **inclusive dividindo a linha com uma interpolação** | os filhos do elemento num item só: `Nós no ciclo: §` |
| valor de atributo que o aluno lê (`alt`, `title`, `placeholder`, `aria-label`, …) | texto de tela |
| `className`, `class`, `key`, `ref`, chave de tipo, especificador de import, nome de propriedade escrito como literal | **código** em **qualquer** elemento, componente inclusive — num bloco `AVISO` separado que **não reprova** |
| atributo de **elemento HTML** fora da lista de texto (`viewBox`, `style`, `d`, `type`, `role`, `fill`, …) | **código**, pelo mesmo `AVISO` |

O `AVISO` existe por causa da armadilha do literal-que-vira-classe (mais abaixo):
antes ele se misturava ao texto de tela e pedia a reação que **re-quebra** o
rename. Agora ele fica à parte, dizendo "confira no `globals.css`".

**A segunda linha vale só para elemento HTML** (`<div>`, `<svg>`, `<path>`), e a
distinção é medível. Elemento HTML tem vocabulário fixo, então o que não está na
lista de texto é código. **Prop de componente nosso** (`<VizFooter>`, `<Icone>`)
cai em **tela**, porque um componente pode ter prop de rótulo com qualquer nome,
e o falso negativo é justamente o defeito que este guarda existe para não ter.
Consequência prática: mudar o valor de um `d=` **de componente** REPROVA, ao
contrário do que a linha de cima sugere isoladamente. Medido no motor desta
branch, com as mesmas três props nos dois lados:

```
<svg   viewBox="0 0 100 mesmo" style="cor" d="M0 zero L1 um" />  → codigo, codigo, codigo
<Icone viewBox="0 0 100 mesmo" style="cor" d="M0 zero L1 um"
       className="cx" />                                        → tela, tela, tela + codigo (só o className)
```

Os casos **12 e 13** de `scripts/testa-guarda-idioma.py` fixam esse par: a mesma
troca de `d=`, no `<path>` passa e no `<Icone>` reprova. A regra mora em
`elementoIntrinseco()` e `classificar()`, em `scripts/extrai-textos-tsx.mjs`.
Hoje ninguém esbarra nela — varredura pela AST nos 87 `.tsx` de
`content/visualizers`: **zero** ocorrências de `viewBox`/`style`/`d` em tag não
intrínseca —, mas quem escrever a primeira precisa saber. Duas bordas do mesmo
critério: tag com ponto (`<motion.div>`) **não** conta como intrínseca, porque o
teste exige um `Identifier` simples; e um atributo com namespace (`xlink:href`)
só vira código no elemento HTML, pela mesma porta.

**Este guarda já passou verde CINCO vezes com a aula estragada**, sempre por
olhar de menos. Os buracos que ele tapou dizem onde procurar o próximo:

| versão | o que não olhava | o que passou |
|---|---|---|
| 1ª | nós de texto JSX | `<span>Array (fica sorted)</span>` e mais dois rótulos |
| 2ª | nó JSX **em mais de uma linha** | `inserir no fim` virou `inserir no done` |
| 2ª | literal **dentro** de `${...}` | `reservar a capacidade certa` virou `capacity` |
| 3ª | **crase aninhada** dentro de `${...}` | o pareamento das crases saía de sincronia e o texto do template interno **nunca era lido**: em `` `…${cycle > 0 ? `, e ${cycle} deles formam o ciclo` : ""}` `` (`LinkedListFloyd`), trocar `", e "` por `", and "` saía `SUMIRAM: nenhuma`. **27 dos 87 arquivos** têm crase aninhada, num total de 54 ocorrências (6 só no `LinkedListFloyd`) |
| 3ª | **texto de tela colado numa interpolação** | o padrão exigia `>texto<` e o `{` cortava o casamento. Trocar `" de "` por `" of "` em `{s.round} de {LABELS.length - 1}` (`BellmanFordVisualizer:273`) saía `SUMIRAM: nenhuma / APARECERAM: nenhuma`, e o painel diria **"rodada 5 of 4"** com o guarda verde |

Os dois da 2ª versão não são casos exóticos: o Prettier quebra a linha de
qualquer elemento cujos atributos não cabem, e ternário dentro de interpolação
é como metade das notas deste repo escolhe entre singular e plural. Os dois da
3ª também não: 31% do diretório tinha o gatilho do primeiro.

**E a 3ª versão gritava, além de ser cega.** Num rename de quatro identificadores
do `LinkedListFloyd` (`slow`/`fast`/`cycle`/`total`) ela emitia **38 linhas de
achado, todas ruído**, com um blob de 4 mil caracteres de código no meio — e uma
troca de rótulo de verdade escondida ali dentro. O mesmo rename no guarda novo
emite **zero**. Um guarda que grita em tudo é tão inútil quanto um cego.

### O que o guarda continua NÃO pegando

Está aqui porque decidir com base numa promessa que ele não cumpre é como os
cinco furos acima aconteceram. Cada linha tem um caso medido e uma fixture em
`scripts/fixtures-guarda-idioma/`:

- **ele compara o CONJUNTO de textos, não onde cada um aparece.** Trocar dois
  campos de lugar (o subtítulo de um cartão indo para o corpo e vice-versa)
  mantém o conjunto idêntico e passa verde. Medido: com `{l.subtitle}` e
  `{l.body}` invertidos no `SubTypesVisualizer`, o guarda não acusa nada e a tela
  mente. Quem pega isso é teste que lê **rótulo e valor juntos**, no mesmo cartão
  — veja a §8;
- **valor de união que chega ao JSX cru** (`{p.conflict}` no
  `BacktrackingSudoku`). O que o guarda vê é uma interpolação, e a união é um
  tipo, ou seja, código: traduzi-la sai no `AVISO` e não reprova. A regra abaixo
  — *procure onde os valores da união aparecem* — continua sendo sua;
- **texto sem nenhuma letra** (`"→"`, `"3"`, `"·"`). São descartados de propósito,
  senão toda cor em hexa e todo `path` de SVG entrariam no relatório;
- **texto que não mora neste arquivo**: rótulo vindo do `content/roadmap.ts`, do
  `.mdx` ou de outro componente. O guarda compara duas versões do **mesmo**
  arquivo;
- **texto montado por concatenação de identificador** (`"passo " + nome`), onde a
  frase só existe em tempo de execução.

Quando o caso for um destes, **o guarda não é prova**: a prova é comparar o texto
renderizado dos ESTADOS (§8) e o HTML do build (logo abaixo).

### A suíte do próprio guarda

Os onze casos acima — os cinco furos, o rename limpo que não pode reprovar, e os
limites conhecidos — são executáveis:

```bash
python3 scripts/testa-guarda-idioma.py           # 11 de 11 ok
python3 scripts/testa-guarda-idioma.py -v        # com a saída de cada caso
python3 scripts/testa-guarda-idioma.py --guarda /tmp/versao-antiga.py
```

O `--guarda` é a prova de quebra: aponte para uma versão anterior e veja os casos
falharem. **Guarda que você nunca viu falhar não é guarda.** Ao consertar um furo
novo, acrescente o par `antes.tsx.txt` / `depois.tsx.txt` e a linha em `CASOS`
antes de mexer no analisador. (A extensão é `.tsx.txt` de propósito: o
`tsconfig.json` inclui `**/*.tsx`, e fixture com extensão de verdade entraria no
`npx tsc --noEmit` com código que existe justamente para estar errado.)

Custo: **0,22s** por par de arquivos e **0,45s** para os 87 arquivos de
`content/visualizers/` de uma vez. Cabe em cada commit.

### E a prova final continua sendo o HTML do build

O guarda ficou muito melhor e **não virou a prova**: ele lê o arquivo, e o que o
aluno recebe é a página. A comparação do HTML é objetiva:

```bash
render() { python3 -c "
import re,sys
s=open(sys.argv[1],encoding='utf-8').read()
s=re.sub(r'<script.*?</script>','',s,flags=re.S)
s=re.sub(r'<[^>]+>','\n',s)
print('\n'.join(l.strip() for l in s.split('\n') if l.strip()))" "$1"; }

# o "antes" é um build ANTES do rename — sem ele o diff abaixo não tem com o
# que comparar, e sai "No such file or directory":
npm run build && render out/topico/<slug>/index.html > /tmp/antes.txt

# ... aplique o rename, e então:
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
  pegou — o guarda de idioma, por construção, nunca vai pegar;
- **valor de união que É TEXTO DE TELA**, e o espelho do caso acima. Em
  `conflict: "linha" | "coluna" | "quadrante"` (`BacktrackingSudoku`) os valores
  são renderizados crus no painel "regra que barrou": traduzi-los **compila,
  passa no guarda e troca o que o aluno lê**. A união *parece* identificador e
  *é* conteúdo — enquanto o sufixo de classe *parece* conteúdo e *é* API. Antes
  de traduzir uma união, **procure onde os valores dela aparecem**: se algum
  chega ao JSX sem passar por um mapa, ele é texto de tela;
- **qualquer literal que vira NOME DE CLASSE é contrato com o CSS**, e nenhuma
  ferramenta o **reprova**. Ele passa pelo `tsc` (o tipo continua coerente) e
  pelo teste (é cor); o guarda de idioma agora o **mostra** — no bloco `AVISO`,
  quando ele está num `className` —, mas não sai com erro, porque não dá para
  saber de dentro do arquivo se aquela classe existe no `globals.css`. Conferir é
  seu. As três formas medidas, em ordem de quão fácil é não vê-las:

  | forma | exemplo | o que aponta para ele |
  |---|---|---|
  | valor de **união** interpolado | `` `hs-fase f-${fase}` `` com `"construir" \| "ordenar" \| "fim"` | o tipo — dá para achar pela declaração |
  | **literal cru** num ternário | `` `hs-fase ${gap === 1 ? "f-fim" : "f-ordenar"}` `` | **nada**: não há tipo, não há `Record`, não há declaração |
  | literal com **dois papéis** | `"quase"` é chave de preset **e** classe de célula | o guarda **engana**: lista como sumido enquanto ele segue no arquivo, e pede a reação que re-quebra o rename |

  A segunda forma é a pior de achar e foi medida no `ShellSortVisualizer`:
  trocar por `f-end`/`f-sort` **compila, passa no guarda e apaga a cor de duas
  fases**. Antes de renomear qualquer literal, **faça `grep` do valor no
  `globals.css`**. Se ele estiver lá, use um mapa (`PHASE_CLASS`,
  `CELL_CLASS`) e deixe a classe em português — o nome da classe não é
  identificador do seu componente, é API compartilhada.

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

E o inverso também acontece: **existir um bloco não quer dizer que ele seja
dispensável.** Antes de ligar a camada 3, procure no componente uma frase de tela
que fale do bloco **na segunda pessoa** — «Leia o código acima», «compare com a
tabela ao lado». Se existe, o bloco é o conteúdo, e recolhê-lo transforma essa
frase em mentira toda vez que a medição decidir esconder. Medido no classificador
de posição de cauda (`TailRecursionForma`): a nota do modo treino manda ler o
código, a medição recolheria a 1440x700, e mesmo recolhido ele pediria 533px de
um orçamento de 516 a 1440x600 — esconderia o conteúdo e continuaria sem caber.
Ele saiu com `collapsible: false`.

O `inventario.sh` responde `code = sim` para esse arquivo, e responde certo: a
pergunta dele é *existe um bloco?*, não *o bloco é dispensável?*. A segunda é
sua.

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

### O estado mais alto não é "encher a entrada até o máximo"

Você mede a peça no pior caso para saber se ela cabe. O jeito óbvio de achar
esse pior caso — encher todo campo até o limite — **errou nas três peças em que
foi tentado numa mesma rodada, e nas três por um motivo diferente**:

| peça | o que "encher tudo" deu | por quê |
|---|---|---|
| busca da hash table | **833px, menos** que os 847 do padrão | a corrente longa cabe numa linha que já existia, e a nota que explica o estado padrão é mais comprida |
| busca da skip list | **0px de diferença** com 14 elementos | a altura vem dos NÍVEIS, que têm teto (`MAX_LEVELS = 4`), e o padrão já batia nele; mais elementos só alargam o SVG, e o wrapper rola na horizontal |
| reversão da lista | 4 nós = **979px**, 5 nós = 954px | o viewBox tem piso de largura, então menos nós = razão altura/largura maior = mais altura no esticão até a largura do corpo |
| árvore do Fibonacci | `fib(8)` **com** cache (15 nós) é **81px mais alta** que sem cache (67 nós) | o eixo da altura é a PROFUNDIDADE, `n − 1`, igual nos dois; os nós viram largura. Desligar o cache — o movimento óbvio — dá o caso mais baixo |
| árvore n-ária | três árvores de **9 nós e grau máximo 3** dão desenhos de 196, 196 e **332px** — e o PR #46 dá **grau 4 e 10 nós** a uma delas, que segue nos mesmos **196px** | o grau vira largura e a profundidade vira altura, então **a mais alta é a mais estreita**. O controle que parece o pior caso (o grau) é justamente o que não mexe na altura: o quarto filho custou **96px de LARGURA** (592 → 688) e zero de altura |
| BST | os quatro presets têm **sete nós**, e o SVG vai de 190px a **422px** | não existe campo para encher: o eixo é a ORDEM DE INSERÇÃO. Inserir 1,2,3,4,5… em sequência degenera a árvore em lista, com a mesma contagem de nós |
| formatos de árvore binária | o preset mais alto é o de **menos nós** (4 nós, 1025px); o de 15 posições é **53px mais baixo** | a profundidade do desenho é fixa nesta peça, então nem a contagem nem a profundidade são o eixo — quem manda é **o tamanho da prosa dos vereditos** |

O que fazer em vez disso, na ordem:

1. **Ache o que gera as LINHAS do desenho** — o `while`, o `Array.from`, o
   `map` sobre buckets ou níveis. É esse eixo que vira altura; os outros viram
   largura, e largura rola sozinha quando o wrapper tem `overflow-x: auto`.
2. **Verifique se ele tem teto.** Um eixo com limite já pode estar no máximo no
   estado padrão, e aí encher devolve o mesmo número e você conclui "não tem
   pior caso" com uma medição que não confirmou nada.
3. **Cheque se o extremo é combinação.** Na pirâmide de níveis o pior caso exige
   dois controles no máximo **ao mesmo tempo** (o `n` e o `p`); mexer só num deles
   dá metade da altura — 21 linhas em vez de 40.
4. **Se o pior caso construído der um número MENOR que o padrão, o padrão é o
   pior caso.** Troque o número, não a narrativa.
5. **Se não houver campo para encher, o pior caso está nos PRESETS** — e aí
   compare presets do mesmo tamanho, senão você mede a contagem em vez do eixo.
   Numa BST os quatro presets têm sete nós e a altura do desenho varia 2,2x
   entre eles.
6. **E ele pode estar na AUSÊNCIA de preset.** Se a peça deixa o aluno montar a
   entrada à mão, esse estado não é alcançado por botão nenhum e escapa da
   varredura. Medido no `GrafoRepresentacao`: os oito estados de preset dão a
   **mesma altura ao pixel**, e o mais alto é o grafo editado, onde a dica cai
   num fallback de 171 caracteres contra 100 do maior `hint`.
7. **O pior caso pode ser a SOMA de dois blocos com sinais trocados**, e aí
   nenhum deles sozinho aponta para o estado certo. No `TopoSortVisualizer` o
   preset mais alto é o de **menos arestas**, por 2px: a dica dele é 19px mais
   curta e a nota final 21px mais alta.
8. **O que cresce AO LADO de algo constante e mais alto não é altura.** Numa
   linha de `.gr-split` a altura é o **máximo** dos dois lados, então uma coluna
   que cresce ainda tem folga até alcançar a vizinha. Medido no
   `BellmanFordVisualizer`: a tabela cresce 88px (2→6 linhas) e **para 61px
   antes** do desenho; no `MstVisualizer`, a lista de arestas cresce 32px e para
   69px antes. **Meça a distância até o vizinho, não a taxa de crescimento.**

### E o estado mais alto não é o último passo: pode ser o do meio

Quando o desenho cresce e depois desfaz — uma torre de pilha, uma recursão que
desce e volta —, a altura máxima acontece **no pico**, e tanto o passo 0 quanto o
passo final mostram a peça vazia. Medido nas três peças de `pilhas`: os máximos
estão nos passos 13 de 26, 15 de 24 e 37 de 38, e ler o passo 0 com a entrada já
cheia erra por **218, 301 e 87px para baixo**. Na recursão, o passo 0 mente por
até 85px.

**Ande a animação inteira registrando a altura de cada passo** e use o maior. E
escreva o teste de rolagem **naquele** passo: a asserção "existe sobra para
rolar" reprova sozinha no passo 1, onde o miolo ainda não tem o que rolar —
custou dois testes verdes que não testavam nada.

**Mas confirme que existe pico antes de caçá-lo.** Nem toda peça que empilha
cresce em altura: se as fichas vivem num eixo horizontal com `flex-wrap`, elas
só viram altura **depois que a linha quebra**, e o teto é a largura do contêiner,
não uma constante. Medido no percurso de árvores: 6 fichas cabem numa linha, e a
amplitude ao longo dos 26 passos é de **20px** — que vêm da nota ter uma ou duas
linhas, não da pilha. Um relatório que anunciasse "o pico está no meio" ali
estaria certo por acidente e errado no motivo.

**E o passo do pico pode mudar com a LARGURA da janela**, porque a nota quebra em
outro lugar: no `BellmanFordVisualizer` o pico é o passo 1 a 1512px e o passo 10
a 1440px. **Mas isso só vale se a coluna do artigo ainda não estiver no
`max-width`** — quando ela está, 1512 e 1440 são a **mesma** régua para a peça, e
só o orçamento muda. Medido no `MstVisualizer`: 18 combinações com alturas
idênticas ao pixel nas duas larguras. Confira qual dos dois casos é o seu antes
de multiplicar o número de medições por três.

Isso volta na decisão de `measureOn`, com uma segunda pergunta além da do
`hash-table` ("os dois extremos caem do mesmo lado do orçamento?"): **se a
decisão mudasse, a peça passaria a CABER?** Na pilha de chamadas não passaria — o
passo mais alto pede 1.060px com o código aberto e 896 recolhido, contra 816 de
orçamento —, então medir por passo trocaria 164px por um bloco de código abrindo
e fechando durante a reprodução.

### "O desenho é grande" não é "o desenho está esticado"

A receita de devolver altura com um `max-height` no bloco temático (§7) só
recupera **vazio**, e só existe vazio quando o tamanho **renderizado é maior que
o natural do `viewBox`**. Isso vale para SVG com `width: 100%` e `height: auto`,
onde o esticão até a largura do corpo infla o espaço entre os elementos.

Fora desse caso o teto **destrói**, porque o `preserveAspectRatio` escala tudo,
texto junto. Dois desenhos grandes desta série pareciam o mesmo caso e não eram:

| desenho | renderizado | natural (`viewBox`) | o que um teto faria |
|---|---|---|---|
| anel do `QueueVisualizer` | 320px (`max-width: 320px`) | 340px | encolheria conteúdo: já está **abaixo** do natural |
| árvore do `RecursionArvore` | 426px (`width`/`height` de atributo) | 426px | levaria a fonte dos nós de 10,5px para **6,5px** |

**Compare os dois números antes de escrever o teto.** Se forem iguais, ou se o
renderizado for menor, não há vazio a devolver — o caminho é outro.

**E uma peça de `<canvas>` nem entra nessa comparação: ela não estica.**
`viewBox` e `preserveAspectRatio` são atributos **de SVG** — os dois lados da
comparação acima só existem lá. Um `<canvas>` não tem tamanho natural para o
renderizado ultrapassar (logo, nenhum vazio a recuperar) nem escala automática
para um teto acionar: ele é **redesenhado** no tamanho medido, que é o que o
`BigOChartVisualizer.tsx` faz com um `ResizeObserver` na largura
(`cv.width = W * dpr`) e a altura como constante do componente
(`expanded ? 400 : 300`). Nenhuma das receitas acima tem o que devolver ali.

O que sobra é procurar o eixo **fora** do desenho, e nessa peça ele existe: o
`.bigo-grid` é `repeat(auto-fit, minmax(158px, 1fr))` no `globals.css`, e o
número de cartões é o número de famílias ligadas, de 1 a 8 — responde **sim** à
pergunta que esta seção faz mais abaixo (*algo na tela repete com o número?*),
enquanto o canvas responde não.

Em troca, o canvas ganha uma asserção barata que vale a pena copiar em qualquer
peça assim: **afirmar as duas alturas do desenho** (uma no artigo, outra no
painel) prova que o `expanded` da casca chegou até o desenho, e não só até a
moldura. É a regressão mais provável da migração — deixar o `ResizeObserver`
dependendo do `expanded` antigo faz o canvas abrir o painel com a largura
velha.

### O perfil de altura de um visualizador de grafo

Os sete tópicos de Grafos foram adaptados por sete agentes independentes, e os
sete mediram a mesma coisa. Vale como atalho — não para pular a medição, mas
para saber onde ela vai dar:

| o que se mediu | resultado, em 7 de 7 |
|---|---|
| altura do desenho ao trocar preset | **constante**, ao pixel (189px em 756 amostras no `TopoSort`; 366x236 em 514 estados no `AStar`) |
| esticão do SVG (renderizado × `viewBox`) | **0px**. Nenhum teto de altura, **nenhuma linha de CSS** nos sete |
| estruturas auxiliares (fila, pilha, tabela, união) | **34px** ou parecido, sempre — chegam a 3 ou 4 fichas e o `flex-wrap` nunca quebra |
| o que de fato move a peça | **a prosa**: a nota do passo e a dica do preset |

O motivo é estrutural: **o grafo tem um número fixo de vértices declarado no
arquivo**, e os presets trocam as arestas, não a contagem. Onde há grade, a
mesma coisa por outro caminho — no `AStarVisualizer`, `COLS = 14`, `ROWS = 9` e
`CELL = 26` são constantes, e os presets mudam *quais* células são parede, nunca
*quantas* existem.

**E o critério não é "posicionado à mão ou gerado por código".** Uma grade
gerada por laço tem altura tão fixa quanto sete vértices numa constante. A
pergunta certa é:

> **Existe caminho da tela até o número que gera as linhas?**

Se o aluno não consegue mudar a dimensão por nenhum controle, ela não é eixo, e
procurar pior caso ali é procurar no lugar errado.

### Antes do degrau: o número chega a virar GEOMETRIA?

A pergunta do caminho tem um pressuposto que o grupo de Ordenação derrubou:
**que o número, alcançado, vira altura**. Nem sempre vira. Ele pode aparecer só
como **contador num cartão** ou como uma **string de uma linha**, e aí a altura
não sabe que ele existe.

Medido no `QuickSortVisualizer`, e o sinal inverte: a profundidade da recursão
depende do pivô, como se espera — mas os três presets **degenerados** chegam a
profundidade **8 com no máximo UMA chamada pendente** (o pivô de Lomuto cai no
extremo e um lado nasce vazio), enquanto o **embaralhado**, de profundidade 4, é
o único com **duas**. A ficha mede 36px nos quatro presets e nas três réguas.
Seguir a regra do degrau sem esta pergunta mandaria caçar altura no preset mais
baixo.

> **Um número só é eixo de altura se algo na tela REPETIR com ele.** Ache o
> elemento que se multiplica — a linha, o nível, a ficha — antes de perguntar
> qualquer coisa sobre o valor.

### E a grandeza é desenhada toda junta, ou uma de cada vez?

Terceira pergunta, e ela separa duas coisas que parecem iguais. Uma grandeza
`log₂` pode ser **espacial** (as faixas por nível de um merge sort, desenhadas
todas ao mesmo tempo) ou **temporal** (as rodadas de um shell sort, que são
passos consecutivos). Só a primeira é altura.

Medido no `ShellSortVisualizer`: a sequência de gaps é `log₂` e o degrau seguinte
abriria em 16 elementos — mas a pergunta nem chega a valer, porque cada rodada
**substitui** a anterior na tela. O `.hs-fase` mede **35px nos 261 estados**.

> **O lado SIM, para saber quando você o encontrou.** O sinal no código é o
> gerador **acumulando**: `rows: [...rows, novaLinha]` em vez de `rows:
> [novaLinha]`. Medido no `BinarioDivisoes`, onde a lista de divisões acumula:
> o `⌈log₂ n⌉` vira geometria a **36px por linha exatos**, de 27px (nenhuma) a
> 282px (oito), e isso é **255 dos 276px de amplitude** da peça. Aí o pior caso
> da entrada é real e vale caçar.
>
> Dois detalhes que só aparecem medindo esse caso: **quatro controles podem
> medir três pontos** (201 e 255 dão oito divisões e a mesma altura ao pixel), e
> **o pico pode ser o penúltimo passo** — o último tem as mesmas oito linhas e
> uma nota 21px mais curta.

### Eixo alcançável ainda pode ser eixo com DEGRAUS

Passadas as duas perguntas acima, vem o terceiro tempo, e sem ele a conclusão
também sai errada: **o caminho existe, mas ele chega a atravessar um degrau?**

A altura de uma árvore é `⌊log₂ n⌋`, uma função **degrau**. Um controle que muda
a contagem pode variar bastante e **não mover a altura um pixel**, porque os
valores que ele alcança caem todos no mesmo patamar. Medido em dois tópicos
independentes na mesma rodada:

| peça | o que o controle alcança | o que a altura faz |
|---|---|---|
| `HeapSortVisualizer` | presets de 8 e de 10 elementos | `depth()` devolve **3 nos dois**; os quatro presets desenham **242px nos 289 estados** |
| `BinaryHeapVisualizer` | presets de 6, 8 e 9 valores | 8 e 9 dão o **mesmo desenho ao pixel** (252px); 6 dá 192. Os 50% a mais compram um nível, o elemento seguinte compra **zero** |
| `MergeSortVisualizer` | presets de 7 e de 8 elementos | os mesmos **4 níveis**; `.ms-niveis` mede **163px nos 358 estados**. O degrau seguinte só abre em **9**, e nenhum chip chega lá — o vão é de **um elemento** |

**Varrer os presets pode medir dois pontos achando que mediu quatro.** Antes de
concluir "não tem pior caso", calcule em que valores o degrau muda e veja se
algum controle chega lá. E quando o eixo satura, diga isso com o número — no
heap binário, dos 327px entre o estado mais alto e o mais baixo, **só 60 são o
desenho**; o resto é a operação escolhida.

### O eixo pode ser um bloco CONDICIONAL, que aparece e some

O contrato até aqui só falava de blocos que **crescem**. Existe outro mecanismo,
e ele explica picos no meio que a regra do crescimento não prevê: um bloco que
**existe em alguns passos e não existe em outros**.

Medido no `MergeSortVisualizer`: o painel de intercalação (`{s.merge ? … : null}`)
vale **183px dos 215 de amplitude** da peça inteira. Por isso o pico cai nos
passos 76 e 90 dos 93 — nunca no primeiro nem no último, e nunca no meio
geométrico. Nenhum bloco da peça cresce; um deles simplesmente aparece.

**Procure o `? … : null` antes de procurar o que cresce.** Se a sua peça tem um
painel que só existe durante uma fase, ele provavelmente é o eixo, e o passo do
pico é o primeiro em que ele aparece com o resto já cheio.

### A §3 se responde POR PEÇA, não por tópico

Duas peças do mesmo tópico, desenhando a mesma coisa, podem ter eixos
diferentes. Medido em `busca-binaria`, onde as duas mostram uma fita de células
com `flex-wrap` e **sem** `overflow-x`:

- **`BuscaBinariaVisualizer`** tem campo de array até 16 valores, e a fita quebra
  linha a partir da 14ª célula: 8 → 16 posições custam **+99px**. A largura vira
  altura, e o eixo é real;
- **`BuscaBinariaFronteira`** usa uma constante de 9 posições, sem campo:
  `linhasFita = 1` nos 15 estados e nas 3 réguas. Ali o eixo é o **código** (9 vs
  12 linhas, 77px) e a prosa (37px entre dicas).

Elas saíram com `measureOn` diferentes — `[n, presetKey]` e `[mode, presetKey]`.
**Desenho igual não é eixo igual**: o que decide é o controle, não a aparência.

### O corolário que fecha a §3

**A régua de 1512x900 responde "a camada 3 é necessária?", não "a camada 1 é
necessária?"**. Peça que parece sadia nela pode estar desenhando o botão de
reprodução fora da janela em 1440x700 — foi o caso da busca da hash table (104px
abaixo do pé visível), do trade-off do prefix sum (135px) e do classificador de
cauda (94px de figura rolando a 1440x600, com o cabeçalho subindo junto). Meça
também abaixo de 900 antes de dizer que uma peça não precisa de nada.

## 4. A API de CSS

Tudo em `src/app/globals.css`, e tudo **opt-in**: um visualizador sem `viz-fit`
continua exatamente como era.

Quase tudo aqui chega pelas props do hook — a tabela existe para você reconhecer
o que está vendo no DOM e no CSS, não para digitar à mão.

| classe / atributo | onde | o que faz |
|---|---|---|
| `.viz-fit` | no `<figure>` | liga a casca adaptativa (vem em `figureProps`) |
| `data-codigo="on\|off"` | no `<figure>` | estado do bloco recolhível |
| `data-anim="on\|off"` | no `<figure>` | liga as transições. `off` durante a medição e antes da primeira decisão — e **`off` para sempre quando `collapsible: false`** (nota abaixo) |
| `.viz-overlay-fit` | na `<div>` do overlay | flex column, miolo rolável, cabeçalho e rodapé parados (vem do `inPanel`) |
| `.viz-foot` | irmão do `.viz-body` | os controles fora do miolo, para ficarem parados |
| `.viz-code-slot` | envolve o `.viz-code` | recolhe a **altura** (grid `1fr → 0fr`) |
| `.viz-vars.linha` | no painel de variáveis | vira fileira de fichas quando o código sai |
| `.viz-atalhos` | no rodapé | dica das teclas; some no celular |
| `.viz-toggle-codigo` | no botão do cabeçalho | estado visual pelo `aria-expanded` |

**`data-anim` nunca vira `"on"` numa peça `collapsible: false`.** Ele não quer
dizer "a casca hidratou": quer dizer "a **medição** terminou", e a medição só
existe quando há bloco para recolher. Quem acende é o `setAnimate(true)` no fim
do efeito de medição (`src/lib/visualizer.tsx:436`), e o efeito **sai na primeira
linha** quando `collapsible` é falso (`:420`). Sem decisão a tomar não há
recolhimento a congelar, e o atributo fica em `"off"` para sempre.

Não é defeito — as transições que ele desliga são as do bloco que a peça não tem
—, mas é **armadilha de teste**, e a mina está posta: 18 asserções em 16 specs
esperam `data-anim="on"` como sinal de "a casca terminou de medir", sob **seis
nomes de helper diferentes** (`pronta`, `abrir`, `abrirTopico`,
`medicaoTerminou`, `passo`, `figuraDe`). Nenhuma delas aponta hoje para peça
`collapsible: false`, então ninguém pisou nela ainda — mas copiar qualquer um
desses helpers para uma peça sem bloco mata o spec num timeout de 10 s **antes da
primeira asserção de verdade**, e o erro que aparece ("expected on, received
off") não diz nada sobre bloco recolhível.

Numa peça sem bloco, espere por outra coisa: um rótulo do próprio miolo, ou o
`⤢ Expandir`. O único ponto da suíte que afirma o `"off"` em vez de esperar pelo
`"on"` é `tests/viz-binary-numbers.spec.ts:208`, e ele é o exemplo a copiar.

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

### Um update por evento: o que deriva do passo entra no MESMO `setState`

A §5 já manda usar a **forma funcional** do `setState` nos comandos de passo,
porque a tecla repete muito mais rápido que o clique. Falta a metade que só
apareceu medindo: **a forma funcional não basta se o evento disparar dois
updates.**

Escrever num `useEffect` separado qualquer coisa derivada do passo — o texto de
uma região viva, um rótulo espelhado, um contador — custa uma renderização a
mais por tecla, e essa renderização **engole evento**. Medido no PR #51: o
percurso completo de setas do `tests/viz-quick-sort.spec.ts`, 114 teclas, passou
a parar no passo **113**, reprodutível com `--workers=1` e verde na base. Dois
experimentos isolaram a causa: um `setState` a mais **dentro do handler** passa;
o mesmo texto escrito por um efeito **depois** reprova. O que morde não é a
quantidade de estado, é o número de renderizações por evento.

A consequência que impede a regressão é de **API**, e é o que faz uma assinatura
parecer torta de propósito: o que alimenta um texto derivado do passo é uma
**função do passo** (`(i) => steps[i].note`), não a string do passo corrente. O
texto é montado dentro do updater que move o passo, e ali só existe o passo de
**destino** — a renderização atual ainda é a de origem e não conhece a nota
dele. Quem "simplificar" o campo para a string reintroduz o efeito separado sem
perceber, e a tecla engolida volta com ele.

> **Estado da API, para não citar o que ainda não existe.** Na `main` de hoje o
> hook não tem região viva: o passo mora sozinho num `useState(0)` e não há
> campo de nota. O `stepNote` (a função acima) e o `liveMessage` chegam com o
> **PR #51**, ainda aberto. A regra do parágrafo vale desde já para qualquer
> estado que o seu componente derive do passo.

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

  **Mas confirme que existe esticão antes de escrever o teto.** Esta receita só
  devolve **vazio**, e só há vazio quando o renderizado é maior que o natural do
  `viewBox`. Dois desenhos grandes desta série pareciam o mesmo caso e não eram
  — o teto teria encolhido conteúdo num e a fonte no outro. Os números e o
  critério estão na §3, em *"O desenho é grande" não é "o desenho está
  esticado"*.

## 8. Como provar que funcionou

Contar elemento não testa nada — já passaram por uma suíte verde um visualizador
sem botão nenhum e um painel com 0px de largura. **Meça comportamento e leia
rótulo.**

Antes e depois, com o build servido (`npm run build` e um servidor estático):

```js
// numa janela de 1512x900, com o painel expandido aberto.
// Troque o 0 pelo índice da SUA peça: uma página chega a ter cinco figuras
// `.viz-fit` (o `intervals`), e um `querySelector` devolveria sempre a
// primeira — a armadilha descrita no fim desta seção.
((i) => {
  const figs = document.querySelectorAll("article figure.viz-fit");
  const f = figs[i];
  if (!f) return `não há .viz-fit no índice ${i}: a página tem ${figs.length}`;
  const b = f.querySelector(".viz-body");
  const foot = f.querySelector(".viz-foot");
  return {
    figuras: figs.length,                                        // confira que é a sua
    rola: b.scrollHeight > b.clientHeight,                       // o miolo tem sobra?
    cabecaColada: Math.round(f.querySelector(".viz-head").getBoundingClientRect().top
                             - f.getBoundingClientRect().top),   // <= 2
    // peça `total: 1` sem `children` no VizFooter não desenha `.viz-foot` (§6):
    // "sem rodapé" NÃO é aprovação, é ausência de asserção.
    rodapeColado: foot
      ? Math.round(f.getBoundingClientRect().bottom - foot.getBoundingClientRect().bottom)
      : "sem rodapé",
  };
})(0)
```

Nos testes (`tests/`), o mínimo por visualizador adaptado:

1. cabeçalho e rodapé **não se mexem** quando o miolo rola até o fim, e o
   `▶ Rodar` continua na viewport;
2. em tela baixa o botão diz **"Mostrar código"** e o bloco está recolhido;
3. em tela alta ele já vem aberto;
4. a escolha do aluno sobrevive a uma troca de estado que pediria medição nova;
5. `←`/`→`/espaço andam a animação, **e não roubam a tecla de quem digita**;
6. numa página com mais de um `figure.viz`, **um teste que afirma quantos**.
   Escope todo locator pelo **conteúdo** da sua peça (o canvas, o SVG, um rótulo
   que só ela tem), nunca por posição, e afirme a contagem nos **dois níveis**:
   quantas figuras a página casa e quantas o seu seletor casa. É essa asserção
   que avisa, em vez de quebrar, no dia em que um irmão for adaptado.

Os itens 2, 3 e 4 — os três que falam do bloco recolhível — não existem quando
`collapsible: false`. No lugar deles, prove que a ausência tem o rótulo certo:
**nenhum botão pode prometer esconder um bloco que o visualizador não tem.** E
não copie para essas peças o helper que espera `data-anim="on"` para saber que a
casca terminou — seja ele `pronta`, `abrir`, `abrirTopico`, `medicaoTerminou`,
`passo` ou `figuraDe`, que são os seis nomes com que ele aparece na suíte. Ali o
atributo nunca vira `"on"` (§4), e o teste morre num timeout antes da primeira
asserção. Copie `tests/viz-binary-numbers.spec.ts:208`, que espera o `"off"`.

E o inverso do item 6, que morde antes de você escrever teste nenhum: **adaptar
uma peça quebra o teste de quem veio antes**. Pôr `viz-fit` numa figura faz um
seletor como `figure.viz-fit` deixar de casar 1 e passar a casar 2 — em
`page.locator()` isso é `strict mode violation`, que reprova alto; em
`document.querySelector()` dentro de um `page.evaluate` é **a peça errada em
silêncio**, e as medições saem nulas sem ninguém reclamar. Medido duas vezes na
mesma rodada: o gráfico do Big O reprovou **5 testes** já existentes em
`tests/navegacao.spec.ts`, e as cinco peças do grupo Ordenação reprovaram **16
no merge sort e 11 no heap sort** ao voltar o seletor para `article
figure.viz-fit`.

Antes de pôr `viz-fit` numa peça, rode `grep -n 'figure\.viz-fit' tests/*.spec.ts`
e abra os testes que visitam a sua página. E escolha o discriminante por
**estabilidade conceitual**, não por conveniência: os quatro candidatos do
gráfico do Big O casavam 1 nos quatro estados que aqueles testes atravessam
(tela alta, tela baixa com `data-codigo="off"`, recolhido na mão e painel
expandido), e o escolhido foi `:has(.viz-code-slot)` — o slot existe porque a
peça **é** recolhível, enquanto o conteúdo dentro dele é o que um dia pode virar
condicional. O grupo Ordenação chegou ao mesmo seletor por conta própria, em
três arquivos de teste.

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

E rode cada teste novo **contra o código quebrado** antes de confiar nele. Três
regras que custaram caro:

- **Nunca silencie o build nessa hora.** Os testes rodam contra `out/`, e um
  build que falha deixa o artefato anterior no lugar: a quebra não chega ao
  navegador, o teste passa, e você conclui que o teste é inútil quando o inútil
  foi o experimento. Escolha uma quebra que **compile** (inverter uma condição,
  não acrescentar um `return` que deixa código inalcançável).
- **`preventDefault()` sem `stopPropagation()` não tira a tecla de ninguém**, e
  a quebra que conta com isso sai **inerte**. Os atalhos do painel são um
  listener de **captura** no `document`
  (`document.addEventListener("keydown", onKey, true)`, hoje em
  `src/lib/visualizer.tsx:390`) que chama `preventDefault()` e segue: nada ali
  interrompe a propagação, então o `onKeyDown` do React no seu elemento dispara
  igual. **Peça com teclado próprio — canvas, slider — não perde a tecla para o
  hook; ela ganha um `stepBy` invisível por cima.** Medido no gráfico do Big O:
  quebrar `const hasSteps = total > 1` (`src/lib/visualizer.tsx:162`) para
  `total >= 1`, esperando que o hook roubasse as setas de um canvas
  `role="slider"`, saiu **0 failed / 5 passed** — o marcador andou como sempre.
  Para provar que uma tecla é do componente, a quebra tem de estar **no
  componente**; e quando a sua sair inerte, suspeite do experimento antes de
  suspeitar do teste.
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
- **`toBeInViewport()` sozinho não prova a camada 1.** Com o rodapé de volta
  dentro do miolo — que é a quebra canônica desta camada — ele passa nas **duas**
  pontas da rolagem: no fim porque é lá que o rodapé foi parar, e no começo
  porque o botão ainda cruza a área visível, e a asserção aceita **qualquer**
  interseção. Medido: uma quebra assim saiu `0 failed / 2 passed` com a quebra
  confirmada no HTML do build.

  A asserção que carrega o sentido é **a posição comparada com ela mesma** — o
  `boundingBox().y` do controle antes e depois de o miolo rolar — e o
  `toBeInViewport({ ratio: 1 })` entra como complemento, não como prova.

  **E é MENOS gente trabalhando do que parece.** Contra a quebra canônica, num
  teste de cinco asserções, **quatro passaram** — medido no `backtracking` e
  confirmado independentemente no `binary-numbers`:

  | asserção | contra a quebra |
  |---|---|
  | o miolo estoura (`scrollHeight - clientHeight > SLACK`) | **passa** |
  | o miolo rolou (`scrollTop > 0`) | **passa** |
  | a figura não rola (`sobraFigura <= 8`) | **passa** — o miolo absorve o rodapé |
  | **o cabeçalho não anda** (`headMoveu === 0`) | **passa** |
  | **a posição do controle de reprodução, comparada com ela mesma** | **reprova** (−227px, −425px, −488px) |

  As três primeiras são as **premissas** que esta seção manda exigir, e elas
  continuam certas — elas provam que o teste está medindo a coisa certa, não que
  a camada funciona. E a do **cabeçalho**, que é a formulação mais natural de "a
  camada 1 funciona", passa: com o rodapé dentro do miolo o cabeçalho continua
  parado, porque o defeito é do rodapé.

  **Escreva a asserção do rodapé.** Um teste de camada 1 sem a posição do
  `▶ Rodar` (ou do controle que a peça tiver) medida antes e depois da rolagem
  aprova a quebra que a camada existe para impedir.

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
| `SkipListNiveis` (`collapsible: false`, `total: 1`, controles próprios) | 915px | **925px** (+10) |
| **`BinaryTreeFormatos`** (`collapsible: false`, `total: 1`, **sem rodapé nenhum**) | 915–1025px | **911–1021px (−4)** |
| **`GrafoRepresentacao`** (idem, peça sem parentesco com a anterior) | 1021–1069px | **1017–1065px (−4)** |

**E as duas últimas linhas invertem o sinal, o que corrige o enunciado desta
seção.** O custo não é de adotar a casca: é de **ter um `.viz-foot`**. As três
primeiras peças pagam porque, mesmo sem linha do tempo, elas têm controles
próprios no rodapé. As duas últimas não têm rodapé nenhum — `total: 1` **e** sem
`children` fazem o `VizFooter` sumir inteiro —, e aí a casca **devolve** 4px.

**E o saldo pode ser MUITO negativo quando a peça tem bloco E rodapé.** O
`BinarioDivisoes` ficou **184px mais baixo** no artigo, e a aritmética mostra que
não há mecanismo novo: o `.viz-split` cai de 230 para 36px (−194) porque o bloco
de código sai do fluxo lateral e vai para o `.viz-code-slot`, e o `.viz-foot`
cobra os +10 de sempre. −194 + 10 = −184.

Ou seja, o `+10` desta seção é o **custo fixo do rodapé**, e o que decide o sinal
é quanto a camada 3 devolve. Não cite nenhum dos dois números sem medir a sua
peça: a série já tem +28, +10, −4 e −184.

**São 4px nas duas, em peças sem nenhum parentesco**, em todos os estados e em
todas as réguas: 10 estados × 3 réguas numa, 7 estados na outra. Repetir o
mesmo número em dois lugares independentes confirma o **mecanismo** (o
`padding-bottom` que passa de 18 para 14) e não só a medição.

Quem citar o `+28` ou o `+10` sem medir a própria peça vai escrever o contrário
do que ela faz. A pergunta é *esta peça tem rodapé?*, não *esta peça tem bloco?*
— e ela ainda não é a última: falta *esta peça já tinha botão no cabeçalho?*, na
subseção seguinte.

Nos dois a adaptação valeu, porque o que ela conserta é outra coisa — e só
aparece **abaixo** da régua de 1512x900. Na busca da hash table, o `▶ Rodar` era
desenhado 104px (1440x700) e 204px (1440x600) abaixo do pé visível da peça; no
trade-off, o `↺ Reiniciar` ficava 135px e 235px abaixo. Nos quatro casos o
controle voltou para dentro da janela e o cabeçalho parou de subir.

Mas o número no artigo piora, e o relatório tem que dizer isso **com o
número**, não arredondar para "sem mudança". A pergunta certa ao decidir o
escopo de uma peça sem bloco não é "quanto ela encolhe", é "onde ficam os
controles quando ela rola".

### O número é previsível: some as parcelas antes de medir

**E o `−4` da tabela acima não é o custo de uma peça `total: 1`. É o custo de
uma peça que JÁ TINHA BOTÃO no cabeçalho.** Todas as peças daquela tabela
chegaram à casca vindas de um overlay escrito à mão, com o `⤢ Expandir` já
dentro do `.viz-head-right`, ao lado do `.viz-step`. Conferido no commit
anterior ao de cada adaptação, nas cinco linhas e também no `BinarioDivisoes`
do parágrafo do `−184`: **nenhuma delas pagou o cabeçalho**, e é por isso que
essa parcela nunca apareceu por aqui.

As cinco peças mudas do grupo Ordenação são as primeiras a chegar **sem botão
nenhum** — `figure.viz` com `.viz-head-right` só de texto. Elas são o caso `−4`
em tudo o mais (`collapsible: false`, `total: 1`, sem `children` no
`VizFooter`, sem rodapé), e mediram **+8 em três e +36 em duas**, nas duas
réguas de desktop.

Medidas bloco a bloco nos dois builds, as parcelas são três:

| parcela | quanto | quando é cobrada |
|---|---:|---|
| `.viz-body` | **−4px** | **sempre**: o `padding: 22px 20px 18px` da base vira `padding-bottom: 14px` em `.viz-fit .viz-body` (`globals.css`) |
| `.viz-head` | **+12px** | quando a peça **não tinha botão**: 41 → 53px, porque entra um `<button>` onde só havia texto |
| `.viz-head`, de novo | **+28px** | quando o rótulo é longo o bastante para o botão **quebrar a linha**: 53 → 81px |

Somadas, elas explicam a série inteira **antes** de você abrir o navegador:
`−4` para quem já tinha botão; `−4 + 12 = +8` para quem ganha o botão e cabe na
linha; `−4 + 12 + 28 = +36` para quem ganha o botão e quebra. As cinco peças do
grupo Ordenação fecham exatamente nas duas últimas contas.

Conferir custa uma leitura só — esconda o `⤢ Expandir` e leia a figura duas
vezes no mesmo carregamento, sem rebuild:

```js
// o custo do botão do cabeçalho, medido no artigo.
// Troque o 0 pelo índice da SUA figura. Quantas a página tem:
//   document.querySelectorAll("article figure.viz").length
((i) => {
  const figs = document.querySelectorAll("article figure.viz");
  const f = figs[i];
  if (!f) return `não há figura no índice ${i}: a página tem ${figs.length}`;
  const b = [...f.querySelectorAll("button")].find((x) => /Expandir/.test(x.textContent));
  if (!b) return "esta figura não tem ⤢ Expandir — confira o índice";
  const com = f.getBoundingClientRect().height;
  b.style.display = "none";
  const sem = f.getBoundingClientRect().height;
  b.style.display = "";
  return { com, sem, delta: com - sem };   // delta = o custo do botão
})(0)
```

O que decide entre `+8` e `+36` é o **comprimento do `children` do
`VizHeader`**, porque `.viz-fit .viz-head-right` é `flex-wrap: wrap` no
`globals.css`. E quem alonga esse `children` é a §6: num `total: 1` ele
**substitui** o "passo 12 de 93" de uma dúzia de caracteres por uma frase
inteira, com o rótulo junto do número. O corte medido fica perto de **40
caracteres** — os rótulos de 34, 35 e 38 couberam na linha; os de 53 e 55 a
quebraram.

**A quarta parcela, a do `.viz-foot`, continua sem decomposição bloco a bloco**,
e por isso não entra na soma acima. Cuidado ao juntar as duas aritméticas: como
o `−4` do miolo vale para **toda** peça `.viz-fit`, os `+28`, `+10` e `+10` das
três primeiras linhas da tabela já o trazem embutido — aquele `+10` é um
**líquido** (rodapé menos miolo), não a parcela do rodapé sozinho. Quem precisar
do custo do rodapé isolado tem de medi-lo como se mediram estas três.

A 390x844 os sinais mudam de novo: lá o cabeçalho **já** tem duas linhas sem o
botão (99px), a casca passa a **custar** +10 em vez de devolver 4, e o botão
cobra +38 — o total vai de +20 a +60. Três réguas, três aritméticas, e nenhuma
delas dispensa medir a sua peça.

### `measureOn` não enxerga o passo, e há peça cujo bloco mais alto cresce com ele

A medição roda ao expandir, ao redimensionar e quando `measureOn` muda — **nunca
a cada passo**, e isso é deliberado: remedir por passo abriria e fecharia o bloco
enquanto o aluno assiste.

A consequência a assumir é que uma peça cujo bloco mais alto cresce ao longo da
animação é medida no seu estado mais **baixo**. Medido na pilha de chamadas da
recursão: a fileira de frames vai de 168px (um frame, o `min-height`) a 662px
(treze frames) na mesma execução, e a peça de 885px no passo 0 chega a 970px no
passo 12.

Quando o passo 0 já estoura o orçamento, a peça recolhe de saída e o problema não
aparece. Quando ele cabe por pouco, o código fica aberto e a peça passa do
orçamento no meio da animação. **Não tente resolver pelo componente** — pôr o
passo em `measureOn` é o remédio pior que a doença, pelo critério da §3.

### A casca cria um eixo de altura próprio: a linha do cabeçalho

`.viz-fit .viz-head-right` é `flex-wrap: wrap`, e a adaptação põe mais um botão
ali (o de mostrar/ocultar o bloco). Quando o conteúdo do cabeçalho cresce o
bastante, a linha **quebra** e o `.viz-head` dobra de altura.

Medido no `AStarVisualizer`: 53 → **81px** em 19 dos 514 estados — os passos 101
a 119, onde o contador ganha um dígito, e **só a 1440px de largura**. É pouco, e
é um eixo que não existia antes da casca: o componente não tem controle nenhum
sobre ele.

Duas consequências práticas: **inclua na varredura um estado com o contador de
três dígitos**, se a sua peça chegar lá; e, se a peça passar do orçamento por
menos de 30px, confira se não é isto antes de procurar no miolo.

**No `AStar` isso é caso de borda. Numa peça `total: 1` é o estado
permanente.** Ali o `children` do `VizHeader` não divide a linha com o contador:
ele **é** a linha, e a §6 pede que ele traga o rótulo junto do número, justamente
para o número não perder o contexto. Medido no grupo Ordenação: `.viz-head` de
41 para **81px** em 2 das 5 peças, em **todos** os estados e em **todas** as
réguas — não em 19 de 514 e numa largura só. O custo disso no artigo é a
terceira parcela da subseção *"O número é previsível"*, acima.

A consequência é editorial, e vale tomar de olhos abertos: numa peça `total: 1`,
encurtar o `children` em uma dúzia de caracteres pode valer **40px** de altura no
artigo. Encurtar até o rótulo sumir não vale — a §6 existe porque número sem
rótulo ensina errado —, mas escolher entre duas redações igualmente honestas,
sabendo que uma delas quebra a linha, é decisão sua e não acidente.

### `children` do `VizHeader` numa peça COM linha do tempo

O contrato §6 já diz que um número que resume o estado entra como `children` do
`VizHeader`, no lugar do "passo N de M". Os cinco visualizadores que faziam isso
tinham todos `total: 1` — o número **substituía** o contador.

Numa peça com linha do tempo os dois coexistem, e aí eles viram **dois
`.viz-step` irmãos**, separados pelo `gap` do `.viz-head-right` em vez do
separador que o componente escrevia à mão. Medido no `AStarVisualizer`: o `·`
entre "N expandidas" e "passo N de M" **desaparece** do texto renderizado — é a
única diferença em 514 estados comparados campo a campo.

Não há como o `VizHeader` prefixar o contador. **Se o separador for para valer,
termine os seus `children` com ele** (`rodada {s.round} ·`), que é o que o
`BellmanFordVisualizer` faz. E declare a mudança no relatório: é texto de tela.
