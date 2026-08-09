#!/usr/bin/env python3
"""Guarda das âncoras na gravação: o artigo tem que ser autocontido.

    python3 scripts/guarda-ancoras.py                  # content/topics/*.mdx
    python3 scripts/guarda-ancoras.py <arquivo|dir>…   # só o que você mandar
    python3 scripts/guarda-ancoras.py --lentes         # imprime as lentes e as exceções

A regra, do `CLAUDE.md` do repositório de controle e da memória
`artigo-dsa-autocontido`:

> O artigo é autocontido. A gravação é insumo, e o leitor não viu o vídeo. Nada
> de "no encontro apareceu", "foi desenhado no quadro" ou rótulo de preset do
> tipo "A árvore do encontro". Uma ideia boa entra pelo mérito, como o exemplo
> do artigo. Quem assiste ganha reforço; quem só lê recebe o valor inteiro.

O link e o embed da gravação **não** são violação: eles são o reforço que a
regra promete, e nem moram aqui (o vídeo é metadado, em `content/roadmap.ts`).
O que este guarda procura é a PROSA que exige ter assistido.

POR QUE TRÊS LENTES, E NÃO UM GREP
----------------------------------
O primeiro inventário deste problema foi feito com um `grep` por "encontro" e
irmãos, e ele erra por baixo de duas formas diferentes, as duas medidas:

  1. **A âncora sem palavra de gravação.** Duas das doze linhas que citavam
     alguém pelo nome não diziam "encontro", "aula" nem "vídeo" em lugar nenhum
     — «Como o Nelson resumiu:» e «a ressalva que o Nelson fez ali». Só uma
     varredura por NOME ou por VERBO DE FALA as encontra.
  2. **O filtro de falso positivo comendo achado de verdade.** O `grep -v` que
     tirava o "encontro" do ciclo de Floyd casava `o encontro foi`, e com isso
     engolia TRÊS âncoras reais de uma vez: «O exercício do encontro foi…»
     (`pilhas.mdx`), «O exemplo que motivou tudo isso no encontro foi…»
     (`listas-ligadas.mdx`) e «Um dos melhores momentos do encontro foi…»
     (`prefix-sum.mdx`). É por isso que aqui as exceções são DADO DECLARADO,
     com motivo escrito ao lado, e não um `|` a mais escondido num regex: uma
     exceção que ninguém consegue ler é uma exceção que ninguém revisa.

E é por isso que `EXCECOES` é conferida de volta: se uma exceção deixa de casar
qualquer linha do corpus, o guarda sai 2. Exceção morta é um buraco aberto
esperando o dia em que uma frase nova cair dentro dele sem ninguém perceber.

Códigos de saída:

    0   varreu pelo menos um arquivo e não achou âncora
    1   achou âncora
    2   NÃO CONSEGUIU VARRER (nenhum `.mdx` no caminho), ou uma exceção morreu

O 2 é o mesmo contrato dos outros guardas desta pasta: *não conseguiu olhar* é
erro do guarda, e nunca pode sair 0 — porque 0 quer dizer "olhei e está limpo".
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import NamedTuple

RAIZ = Path(__file__).resolve().parent.parent
PADRAO = RAIZ / "content" / "topics"


class Lente(NamedTuple):
    nome: str
    porque: str
    padrao: re.Pattern[str]


class Excecao(NamedTuple):
    nome: str
    motivo: str
    padrao: re.Pattern[str]


def _r(fonte: str) -> re.Pattern[str]:
    return re.compile(fonte, re.IGNORECASE | re.VERBOSE)


# ---------------------------------------------------------------------------
# LENTE 1 — palavra de gravação.
#
# A mais óbvia e a que acha a maioria. "quadro" sozinho está FORA de propósito:
# no corpus ele quase sempre é o frame da pilha de chamadas ("um quadro na pilha
# de chamadas", "dez quadros na pilha") ou uma tabela ("o quadro de
# complexidade"). Ficam só as formas que não têm outro sentido possível.
# ---------------------------------------------------------------------------
GRAVACAO = _r(r"""
    \b encontros? \b
  | \b aulas? \b
  | \b lives? \b
  | \b grava(?: ção | ções ) \b
  | \b meetup \b
  | \b transmiss(?: ão | ões ) \b
  | \b v[ií]deos? \b
  | \b a \s+ galera \b
  | \b ao \s+ vivo \b
  | \b tela \s+ compartilhada \b
  | \b quadro \s+ branco \b
  | \b tarefa \s+ de \s+ casa \b
  | \b comunidade \b
""")

# ---------------------------------------------------------------------------
# LENTE 2 — nome próprio de quem participou.
#
# É a ponta mais afiada do problema: um leitor que chega pelo Google encontra um
# argumento cuja autoridade é uma pessoa que ele não conhece, numa conversa que
# ele não viu. A lista é explícita porque **precisa** ser: sobrenome de
# pesquisador (Dijkstra, Floyd, Knuth, Pugh, Kahn, Lomuto…) é referência técnica
# legítima e aparece o tempo todo. Quem entrar na comunidade e for citado num
# artigo entra aqui — e sai do artigo no mesmo PR.
# ---------------------------------------------------------------------------
NOMES_DA_COMUNIDADE = ("Tiago", "Giovani", "Eduardo", "Nelson", "Wilson")
NOME = re.compile(r"\b(?:%s)\b" % "|".join(NOMES_DA_COMUNIDADE))

# ---------------------------------------------------------------------------
# LENTE 3 — verbo de fala com sujeito humano.
#
# A rede que pega o nome que ninguém cadastrou ainda, e a âncora anônima («e
# alguém resumiu isso perfeitamente com…»). O sujeito tem que ser gente: `o
# Fulano`, `alguém`, `a galera`, `a gente`.
#
# **A caixa alta do nome é sensível DE PROPÓSITO**, e a primeira versão desta
# lente errou justamente aí: compilada com `IGNORECASE`, a classe `[A-Z]` casava
# minúscula e o sujeito virava qualquer coisa — «a leitura atual **trouxe** para
# o L1» (`arrays.mdx`) e «o que este artigo **mediu**» (`ordenacao-basica.mdx`)
# entraram como âncora. Por isso só os pronomes fechados ganham `(?i:…)`.
#
# Verbo de ESCRITA fica de fora ("escreveu", "montou") porque no artigo o sujeito
# costuma ser **você** — «se você escreveu `esq = meio`» — e a lente viraria ruído.
# ---------------------------------------------------------------------------
SUJEITO_HUMANO = r"""(?:
      (?i: algu[ée]m | a \s+ galera | a \s+ comunidade | o \s+ pessoal | a \s+ gente )
    | [OoAa] \s+ [A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-zà-ÿ]{2,}
)"""
VERBO_DE_FALA = r"""(?i:
      mostrou | perguntou | comentou | trouxe | lembrou | falou | disse
    | contou | explicou | apontou | sugeriu | levantou | prop[oô]s | observou
    | notou | resumiu | debateu | alertou | questionou | apelidou | desenhou
    | validou | mediu | ajustou | abriu | rodou | preencheu | resolveu | fez
    | resumiram | perguntaram | mostraram | trouxeram | levantaram
)"""
# Sem `IGNORECASE` na compilação: a distinção de caixa é o que segura a lente.
FALA = re.compile(
    rf"\b {SUJEITO_HUMANO} \s+ (?: \w+ \s+ ){{0,2}} {VERBO_DE_FALA} \b", re.VERBOSE
)

LENTES = (
    Lente("gravação", "a palavra só existe porque houve um encontro gravado", GRAVACAO),
    Lente("nome", "autoridade que o leitor não conhece, de uma conversa que ele não viu", NOME),
    Lente("fala", "relato do que alguém disse, e não a ideia pelo mérito", FALA),
)

# ---------------------------------------------------------------------------
# AS EXCEÇÕES, uma por linha, com o motivo ao lado.
#
# Elas são DADO, e não um `|` escondido num regex, porque quem revisa este
# arquivo daqui a um ano precisa conseguir discordar de cada uma. Cada exceção
# tem que continuar casando alguma coisa no corpus (ver `varrer`): a exceção que
# ninguém usa mais é buraco esperando frase nova.
# ---------------------------------------------------------------------------
EXCECOES = (
    Excecao(
        "floyd",
        "o 'encontro' da lebre e da tartaruga é termo técnico do ciclo de Floyd, "
        "nada a ver com a gravação. É o falso positivo mais fácil de cometer aqui: "
        "numa varredura ingênua ele sozinho infla o número em 10 linhas",
        # A exceção é por CO-OCORRÊNCIA, e não por lista de frases feitas, e isso
        # é o conserto de um defeito medido. O `grep -v` do inventário listava as
        # formas uma a uma (`o encontro foi`, `momento do encontro`, …) e a forma
        # `o encontro foi` engolia TRÊS âncoras reais de outros artigos — as três
        # citadas no topo deste arquivo. Exigir vocabulário de ciclo na MESMA
        # linha não engole nenhuma das três (nenhuma fala de ciclo), e ainda pega
        # a décima ocorrência, que nenhuma lista de frases previa:
        # «um nó apontando para si mesmo (encontro na primeira iteração)».
        _r(r"""
            (?= .* \b encontro \b )
            .* (?: \b ciclos? \b | \b lebre \b | \b tartaruga \b | λ | μ )
        """),
    ),
    Excecao(
        "verbo-encontrar",
        "'encontro' como 1ª pessoa do verbo encontrar: «quando eu encontro um fechamento»",
        _r(r"\b eu \s+ encontro \b"),
    ),
    Excecao(
        "animacao-ao-vivo",
        "'ao vivo' sobre a ANIMAÇÃO do visualizador («o painel mostra isso ao vivo», "
        "«as três contas rodando ao vivo»), e não sobre a gravação",
        _r(r"(?: mostra | rodando | sendo \s+ \w+ | acontecendo | veja ) [^.]{0,60} ao \s+ vivo"),
    ),
    Excecao(
        "perdeu-a-aula",
        "«resolveu o exercício e perdeu a aula» é a expressão de perder a lição, "
        "não de faltar ao encontro",
        _r(r"perdeu \s+ a \s+ aula"),
    ),
)


class Achado(NamedTuple):
    arquivo: Path
    linha: int
    lentes: tuple[str, ...]
    trecho: str


def alvos(argumentos: list[str]) -> list[Path]:
    """Os `.mdx` a varrer. Sem argumento, os artigos do roadmap."""
    caminhos = [Path(a) for a in argumentos] or [PADRAO]
    achados: list[Path] = []
    for c in caminhos:
        if c.is_dir():
            achados += sorted(c.glob("*.mdx"))
        elif c.is_file():
            achados.append(c)
        else:
            print(f"guarda-ancoras: caminho inexistente: {c}", file=sys.stderr)
            raise SystemExit(2)
    return achados


def varrer(arquivos: list[Path]) -> tuple[list[Achado], set[str]]:
    """Devolve os achados e o nome das exceções que de fato foram usadas."""
    achados: list[Achado] = []
    vivas: set[str] = set()

    for arq in arquivos:
        for n, linha in enumerate(arq.read_text(encoding="utf-8").splitlines(), 1):
            casou = tuple(le.nome for le in LENTES if le.padrao.search(linha))
            if not casou:
                continue
            perdoada = False
            for exc in EXCECOES:
                if exc.padrao.search(linha):
                    vivas.add(exc.nome)
                    perdoada = True
            if not perdoada:
                achados.append(Achado(arq, n, casou, linha.strip()))

    return achados, vivas


def imprimir_lentes() -> None:
    print("LENTES (o que faz uma linha ser suspeita)\n")
    for le in LENTES:
        print(f"  {le.nome:<10} {le.porque}")
        print(f"  {'':<10} {le.padrao.pattern.strip()[:110].replace(chr(10), ' ')}…\n")
    print("EXCEÇÕES (o que NÃO é violação, e por quê)\n")
    for ex in EXCECOES:
        print(f"  {ex.nome:<18} {ex.motivo}")
    print()


def main(argv: list[str]) -> int:
    if "--lentes" in argv:
        imprimir_lentes()
        return 0

    arquivos = alvos(argv)
    if not arquivos:
        print(
            "guarda-ancoras: nenhum .mdx para varrer. Isso NÃO é 'passou': o guarda "
            "não olhou nada.",
            file=sys.stderr,
        )
        return 2

    achados, vivas = varrer(arquivos)

    # A conferência das exceções só faz sentido sobre o corpus inteiro: rodar o
    # guarda num arquivo só deixaria quase todas "mortas" por construção.
    corpus_inteiro = not [a for a in argv if not a.startswith("-")]
    if corpus_inteiro:
        mortas = [e.nome for e in EXCECOES if e.nome not in vivas]
        if mortas:
            print(
                "guarda-ancoras: exceção declarada que não casa mais nada: "
                + ", ".join(mortas)
                + "\n  Ou o texto que a justificava saiu (então apague a exceção), ou "
                "ela nunca funcionou. Exceção morta é buraco aberto.",
                file=sys.stderr,
            )
            return 2

    if achados:
        print(f"{len(achados)} linha(s) ancorada(s) na gravação:\n")
        for a in achados:
            print(f"  {a.arquivo.name}:{a.linha}  [{'+'.join(a.lentes)}]")
            print(f"     {a.trecho[:160]}")
        print(
            "\nO artigo é autocontido: a ideia entra pelo mérito, não pela procedência.\n"
            "  «o Fulano perguntou…»  ->  «uma pergunta natural aqui é…»\n"
            "  «o Beltrano mostrou…»  ->  «vale reparar que…»\n"
            "Se a frase só existia como relato do encontro e não carrega nada, ela sai.\n"
            "Se for falso positivo de verdade, declare a exceção em EXCECOES com o motivo."
        )
        return 1

    print(f"guarda-ancoras: {len(arquivos)} arquivo(s) varrido(s), nenhuma âncora.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
