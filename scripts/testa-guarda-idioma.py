#!/usr/bin/env python3
"""Suíte dos guardas: o de idioma, o de header de commit e o de âncoras.

    python3 scripts/testa-guarda-idioma.py                       # roda os guardas atuais
    python3 scripts/testa-guarda-idioma.py --guarda <p>          # roda OUTRO guarda-idioma
    python3 scripts/testa-guarda-idioma.py --guarda-commit <p>   # roda OUTRO guarda-commit
    python3 scripts/testa-guarda-idioma.py --guarda-ancoras <p>  # roda OUTRO guarda-ancoras
    python3 scripts/testa-guarda-idioma.py -v                    # imprime a saída de cada caso

Os `--guarda*` existem para a prova de quebra: aponte para uma cópia da versão
anterior e veja os casos passarem verdes com a aula estragada (ou com o guarda
cego). Um guarda que você nunca viu falhar não é guarda.

**O nome do arquivo ficou menor que o conteúdo, e é de propósito.** Ele cobre os
TRÊS guardas porque é este caminho que o portão da CI chama
(`.github/workflows/tests.yml`, passo "Suíte do próprio guarda de idioma");
renomear exigiria mexer no workflow, e uma suíte que a CI não roda protege
menos que um nome errado.

A suíte tem três blocos:

  FIXTURES — pares de arquivo em `fixtures-guarda-idioma/<caso>/`, com extensão
    `.tsx.txt` de propósito: o `tsconfig.json` inclui `**/*.tsx`, então fixture
    com extensão de verdade entraria no `npx tsc --noEmit` e quebraria o
    typecheck com código que existe justamente para estar errado. O motor força
    `ScriptKind.TSX`, então o parser lê igual.

  LINHA DE COMANDO — o guarda chamado errado, ou sem nada para olhar. É o bloco
    que defende a regra que os dois guardas violavam: **ferramenta que sai 0 sem
    receber entrada é indistinguível de ferramenta que sai 0 porque passou.**
    O `guarda-commit.py` saía 0 e MUDO sem o pipe (dez agentes "rodaram o
    guarda" e nenhum guarda rodou), e o `guarda-idioma.py` saía 0 com dois
    diretórios sem um `.tsx` dentro.

  ÂNCORAS — uma LINHA DE PROSA por caso, contra o `guarda-ancoras.py`, que
    varre `content/topics/*.mdx` atrás de texto que só faz sentido para quem
    assistiu à gravação. Metade dos casos existe para o guarda NÃO reprovar: o
    "encontro" da lebre e da tartaruga, o "ao vivo" da animação, o "perdeu a
    aula". A outra metade são âncoras de verdade que a varredura anterior (um
    `grep` com `grep -v`) deixava passar.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

AQUI = Path(__file__).resolve().parent
FIXTURES = AQUI / "fixtures-guarda-idioma"

# (pasta, deve_reprovar, o que o caso prova)
CASOS = [
    ("1-no-de-texto-jsx", True,
     "nó de texto JSX (buraco da 1ª versão)"),
    ("2-no-jsx-em-varias-linhas", True,
     "nó de texto JSX em linha própria (buraco da 2ª versão)"),
    ("3-literal-dentro-da-interpolacao", True,
     "literal dentro de ${...} (buraco da 2ª versão)"),
    ("4-crase-aninhada", True,
     "CRASE ANINHADA: o texto do template interno (buraco da 3ª versão)"),
    ("5-rotulo-colado-na-interpolacao", True,
     "RÓTULO COLADO NUMA INTERPOLAÇÃO (o buraco silencioso da 3ª versão)"),
    ("6-rodada-de-of", True,
     "'{s.round} de {n}' -> ' of ' (a demonstração do bellman-ford)"),
    ("7-rename-limpo-com-crase-aninhada", False,
     "rename só de identificador NÃO reprova (o guarda não grita em tudo)"),
    ("8-atributo-que-o-aluno-le", True,
     "aria-label é tela; className e viewBox não são"),
    ("9-classe-de-css-nao-reprova", False,
     "classe de CSS vai para o AVISO e não reprova"),
    ("10-limite-conjunto-nao-posicao", False,
     "LIMITE: campos trocados de lugar mantêm o conjunto e passam"),
    ("11-limite-uniao-que-e-texto", False,
     "LIMITE: chave de tipo é código; quem pega o rename errado é o tsc"),
    # 12 e 13 são um PAR e provam a mesma fronteira pelos dois lados: a mesma
    # troca de `viewBox`/`d`, com os mesmos valores, muda de veredito só porque
    # a tag é componente (`<Icone>`) ou elemento HTML (`<path>`). O contrato
    # dizia que esses atributos eram código SEMPRE; o motor só faz isso no
    # elemento HTML. Separados, os dois casos ficam frouxos: 12 sozinho passa
    # com todo mundo em tela, 13 sozinho passa com todo mundo em código.
    ("12-prop-de-componente-e-tela", True,
     "prop de COMPONENTE é tela mesmo se chama `d`/`viewBox` (default conservador)"),
    ("13-atributo-de-elemento-html-e-codigo", False,
     "o MESMO `d`/`viewBox` num ELEMENTO HTML é código e não reprova"),
]

# ---------------------------------------------------------------------------
# Bloco 2: o guarda chamado errado, ou sem nada para olhar.
#
# Aqui o valor esperado é o CÓDIGO DE SAÍDA exato, não "reprova/passa", porque o
# ponto destes casos é justamente a diferença entre 0 ("olhei e está tudo bem"),
# 1 ("olhei e achei problema") e 2 ("não consegui olhar"). Um caso que só
# checasse "não-zero" aprovaria a versão antiga do `guarda-commit.py` no caso
# do merge, que reprovava — pelo motivo errado.
#
# `{tmp}` nos caminhos é substituído por um diretório temporário da rodada. Os
# dois diretórios vazios não podem virar fixture: o git não versiona pasta
# vazia, e uma pasta com `.gitkeep` dentro deixa de ser o caso que interessa.
# ---------------------------------------------------------------------------
# (nome, guarda, argumentos, stdin, código esperado, o que o caso prova)
CASOS_CLI = [
    # -- guarda-commit -------------------------------------------------------
    ("commit-merge-no-meio-do-trabalho", "commit", [],
     "fix(ci): pula commit de merge no guarda de header\n"
     "Merge remote-tracking branch 'origin/main' into fix/os-guardas\n"
     "test(ci): prova os dois guardas na suíte que a CI já roda\n", 0,
     "merge do `git merge origin/main` não reprova (o commitlint também o ignora)"),
    ("commit-sem-o-pipe", "commit", [], "", 2,
     "`stdin` vazio NÃO é sucesso: 0 mudo era indistinguível de 'passou'"),
    ("commit-so-merges", "commit", [],
     "Merge pull request #63 from craft-code-club/test/a-rede-que-faltava\n", 2,
     "pulou tudo = checou nada; nunca sai 0 sem ter olhado um header"),
    ("commit-header-longo", "commit", [],
     "feat(viz): o visualizador de heap ganha presets, legenda nova, teclado e foco\n", 1,
     "header de 77 caracteres continua reprovando (não trocamos cegueira por silêncio)"),
    ("commit-assunto-em-maiuscula", "commit", [],
     "fix(test): PORT inválida falha alto\n", 1,
     "`subject-case` continua reprovando sigla no começo do assunto"),
    # O header abaixo tem 77 caracteres DE PROPÓSITO: se o `^Merge ` engolisse
    # um commit de trabalho que fala de merge sort, o guarda sairia 0 e o caso
    # não teria como perceber. Ele só sai 1 se o header foi de fato checado.
    ("commit-merge-minusculo-e-checado", "commit", [],
     "feat(viz): merge sort ganha visualizador com passo a passo, presets e legenda\n", 1,
     "`^Merge ` é ancorado e sensível à caixa: commit de trabalho NÃO é pulado"),
    ("commit-header-bom", "commit", [],
     "fix(ci): o guarda de header ignora commit de merge\n", 0,
     "o caminho feliz continua saindo 0 — e agora imprimindo quantos checou"),
    # -- guarda-idioma -------------------------------------------------------
    ("idioma-sem-argumento", "idioma", [], None, 2,
     "sem argumento nenhum: sai 2, não 0 (é o `npm run guarda:idioma` pelado)"),
    ("idioma-um-argumento-so", "idioma", ["{tmp}/a.tsx"], None, 2,
     "meio par não é par: sai 2"),
    ("idioma-caminho-inexistente", "idioma", ["{tmp}/a.tsx", "{tmp}/nao-existe.tsx"], None, 2,
     "caminho errado sai 2 em vez de fingir comparação"),
    ("idioma-diretorio-sem-fonte", "idioma", ["{tmp}/vazio-a", "{tmp}/vazio-b"], None, 2,
     "dois diretórios sem um `.tsx` dentro: saía 0 '(0 arquivos)', agora 2"),
    ("idioma-mesmo-caminho-dos-dois-lados", "idioma", ["{tmp}/a.tsx", "{tmp}/a.tsx"], None, 2,
     "comparar um arquivo com ele mesmo passa por construção: vira erro"),
    ("idioma-par-normal-ainda-reprova", "idioma",
     [str(FIXTURES / "1-no-de-texto-jsx" / "antes.tsx.txt"),
      str(FIXTURES / "1-no-de-texto-jsx" / "depois.tsx.txt")], None, 1,
     "os guardas novos de entrada não engoliram o caminho que reprova"),
    ("idioma-diretorio-com-fonte-passa", "idioma", ["{tmp}/dir-a", "{tmp}/dir-b"], None, 0,
     "diretório COM fonte e sem mudança de tela continua saindo 0"),
]

# ---------------------------------------------------------------------------
# Bloco 3: o guarda das âncoras na gravação (`guarda-ancoras.py`).
#
# Aqui o caso é UMA LINHA de prosa, e não um par de arquivos, porque é assim que
# a âncora aparece: uma oração de procedência no meio de um parágrafo que, sem
# ela, continua de pé. Cada caso vira um `.mdx` de uma linha num diretório
# temporário e o guarda é chamado nele.
#
# Os casos 5 e 6 são a razão de o guarda existir em vez de um `grep`: os dois
# passavam VERDES pelo filtro de falso positivo da versão anterior desta
# varredura, que era um `grep -v` com as frases do ciclo de Floyd listadas uma a
# uma. Um guarda que você nunca viu falhar não é guarda — e um filtro de falso
# positivo que você nunca viu engolir achado de verdade é pior ainda.
# ---------------------------------------------------------------------------
# (nome, linha de prosa, deve_reprovar, o que o caso prova)
CASOS_ANCORAS = [
    ("ancora-classica",
     "No encontro o problema apareceu assim: uma classe recebe um array.",
     True, "a forma mais comum: oração de procedência (lente da gravação)"),
    ("ancora-sem-palavra-de-gravacao",
     "Isso custa dos dois lados. Como o Nelson resumiu: empilhar custa 1.",
     True, "cita a PESSOA sem dizer 'encontro': só as lentes de nome e de fala pegam"),
    ("ancora-com-nome-nao-cadastrado",
     "Vale guardar a ressalva que o Anacleto fez ali: a constante importa.",
     True, "nome que ninguém cadastrou: quem pega é a lente do VERBO DE FALA"),
    ("floyd-nao-e-violacao",
     "O encontro acontece no nó 5, na 5ª iteração, e o ciclo tem 5 nós.",
     False, "o 'encontro' da lebre e da tartaruga é termo técnico, não procedência"),
    ("o-encontro-foi-nao-e-floyd",
     "O exercício do encontro foi calcular uma potência de três jeitos.",
     True, "o `grep -v 'o encontro foi'` do inventário ENGOLIA esta linha real"),
    ("ancora-numa-linha-que-fala-de-lento",
     "O código está na seção do rápido e lento. É o problema que estava "
     "sendo discutido no encontro.",
     True, "co-ocorrência com 'lento' engolia a âncora; só 'ciclo'/λ/μ perdoam"),
    ("animacao-ao-vivo-passa",
     "O painel de array do visualizador mostra isso ao vivo: clique num nó.",
     False, "'ao vivo' sobre a ANIMAÇÃO não é a gravação"),
    ("perdeu-a-aula-passa",
     "Se você usar `reversed()`, resolveu o exercício e perdeu a aula.",
     False, "'perdeu a aula' é perder a lição, não faltar ao encontro"),
    ("verbo-encontrar-passa",
     "Quando eu encontro um fechamento, ele tem que casar com a abertura.",
     False, "'encontro' como 1ª pessoa do verbo encontrar"),
    ("sujeito-nao-humano-passa",
     "A que está destacada é a que a leitura atual trouxe para o L1.",
     False, "sujeito minúsculo não é gente: a lente de fala é sensível à CAIXA"),
    ("artigo-como-sujeito-passa",
     "O motivo é o que este artigo mediu, e a conta fecha com as constantes.",
     False, "'o que este artigo mediu' entrava como âncora com `IGNORECASE`"),
    ("comunidade-como-autoridade",
     "A analogia que a comunidade usou é a do telefone sem fio.",
     True, "'a comunidade' como autoridade é âncora, mesmo sem a palavra 'encontro'"),
    ("sobrenome-de-pesquisador-passa",
     "As entradas são pequenas o bastante para o Dijkstra resolver sozinho.",
     False, "sobrenome de pesquisador é referência técnica, não gente do encontro"),
]

FONTE_DE_TESTE = 'export const Rotulo = () => <span>passo 1 de 7</span>;\n'


def preparar_tmp(tmp: Path) -> None:
    """Monta o cenário dos casos de linha de comando."""
    (tmp / "a.tsx").write_text(FONTE_DE_TESTE, encoding="utf-8")
    (tmp / "vazio-a").mkdir()
    (tmp / "vazio-b").mkdir()
    # Um `.md` de cada lado: o diretório NÃO está vazio, e mesmo assim não há
    # fonte nenhuma para o guarda olhar. É a forma realista do caso (um
    # `git archive` que trouxe só o README do diretório).
    (tmp / "vazio-a" / "README.md").write_text("nao sou fonte\n", encoding="utf-8")
    (tmp / "vazio-b" / "README.md").write_text("nao sou fonte\n", encoding="utf-8")
    for lado in ("dir-a", "dir-b"):
        (tmp / lado).mkdir()
        (tmp / lado / "Peca.tsx").write_text(FONTE_DE_TESTE, encoding="utf-8")


def caminho_do_flag(argv: list[str], flag: str, atual: Path) -> Path:
    """Lê `--flag <caminho>`. Erro de uso sai 2, nunca 1 (que é 'caso reprovou')."""
    if flag not in argv:
        return atual
    i = argv.index(flag) + 1
    if i >= len(argv):
        raise SystemExit(2)
    alvo = Path(argv[i])
    if not alvo.is_file():
        print(f"guarda não encontrado: {alvo}", file=sys.stderr)
        raise SystemExit(2)
    return alvo.resolve()


def rodar_cli(guardas: dict, tmp: Path, verboso: bool) -> list[str]:
    """Bloco 2. Devolve os nomes dos casos que falharam."""
    print("  -- linha de comando (o guarda sem nada para olhar) --")
    falhas = []
    for nome, qual, args, entrada, esperado, oquê in CASOS_CLI:
        cmd = [sys.executable, str(guardas[qual])] + [a.format(tmp=tmp) for a in args]
        r = subprocess.run(cmd, input=entrada, capture_output=True, text=True)
        ok = r.returncode == esperado
        marca = "ok  " if ok else "FALHA"
        print(f"  {marca}  {nome:<38} sai {esperado:<4} {oquê}")
        if not ok:
            print(f"         -> saiu {r.returncode}, esperado {esperado}")
        if verboso or not ok:
            for linha in (r.stdout + r.stderr).rstrip().splitlines():
                print(f"         | {linha[:160]}")
        if not ok:
            falhas.append(nome)
    return falhas


def rodar_ancoras(guarda: Path, tmp: Path, verboso: bool) -> list[str]:
    """Bloco 3. Uma linha de prosa por caso. Devolve os nomes que falharam."""
    print("  -- âncoras na gravação (uma linha de prosa por caso) --")
    falhas = []
    for nome, linha, deve_reprovar, oquê in CASOS_ANCORAS:
        artigo = tmp / f"{nome}.mdx"
        artigo.write_text(linha + "\n", encoding="utf-8")
        r = subprocess.run(
            [sys.executable, str(guarda), str(artigo)], capture_output=True, text=True
        )
        if r.returncode not in (0, 1):
            print(f"  ERRO   {nome:<38} o guarda saiu {r.returncode}, não 0 nem 1")
            for l in (r.stdout + r.stderr).rstrip().splitlines():
                print(f"         | {l[:160]}")
            falhas.append(nome)
            continue
        reprovou = r.returncode == 1
        ok = reprovou == deve_reprovar
        nota = "" if ok else ("passou VERDE com a âncora no artigo"
                              if deve_reprovar else "reprovou um falso positivo conhecido")
        print(f"  {'ok  ' if ok else 'FALHA'}  {nome:<38} "
              f"{'reprova' if deve_reprovar else 'passa':<8} {oquê}")
        if nota:
            print(f"         -> {nota}")
        if verboso or not ok:
            for l in (r.stdout + r.stderr).rstrip().splitlines():
                print(f"         | {l[:160]}")
        if not ok:
            falhas.append(nome)

    # E o corpus de verdade, que é o comando que a CI roda. Ele é o único que
    # exercita a conferência das EXCEÇÕES: se uma exceção declarada parou de
    # casar qualquer linha dos artigos, o guarda sai 2 e este caso acusa.
    r = subprocess.run([sys.executable, str(guarda)], capture_output=True, text=True)
    ok = r.returncode == 0
    print(f"  {'ok  ' if ok else 'FALHA'}  {'corpus-limpo-e-excecoes-vivas':<38} "
          f"{'sai 0':<8} os artigos do roadmap não têm âncora e nenhuma exceção morreu")
    if verboso or not ok:
        for l in (r.stdout + r.stderr).rstrip().splitlines():
            print(f"         | {l[:160]}")
    if not ok:
        falhas.append("corpus-limpo-e-excecoes-vivas")
    return falhas


def main() -> int:
    argv = sys.argv[1:]
    verboso = "-v" in argv or "--verbose" in argv
    # Sem o caminho depois do flag isto era um IndexError com traceback e
    # código 1 — o MESMO código de "um caso reprovou". Erro de uso não pode
    # ser confundido com resultado de teste, então sai 2.
    if any(f in argv and argv.index(f) + 1 >= len(argv)
           for f in ("--guarda", "--guarda-commit", "--guarda-ancoras")):
        print("uso: testa-guarda-idioma.py [--guarda <p>] [--guarda-commit <p>] "
              "[--guarda-ancoras <p>] [-v]", file=sys.stderr)
        return 2
    guardas = {
        "idioma": caminho_do_flag(argv, "--guarda", AQUI / "guarda-idioma.py"),
        "commit": caminho_do_flag(argv, "--guarda-commit", AQUI / "guarda-commit.py"),
        "ancoras": caminho_do_flag(argv, "--guarda-ancoras", AQUI / "guarda-ancoras.py"),
    }

    print(f"guarda-idioma:  {guardas['idioma']}")
    print(f"guarda-commit:  {guardas['commit']}")
    print(f"guarda-ancoras: {guardas['ancoras']}\n")
    falhas = []
    print("  -- fixtures (o texto de tela) --")
    for pasta, deve_reprovar, oquê in CASOS:
        base = FIXTURES / pasta
        r = subprocess.run(
            [sys.executable, str(guardas["idioma"]),
             str(base / "antes.tsx.txt"), str(base / "depois.tsx.txt")],
            capture_output=True, text=True,
        )
        # Código inesperado é o guarda NÃO TENDO RODADO, não um caso reprovado.
        # Contar como FALHA fazia a suíte sair 1, o mesmo código de "regressão",
        # e escondia a diferença entre "o guarda achou um problema" e "o guarda
        # está quebrado". Aborta na hora, com o 2 do contrato.
        if r.returncode not in (0, 1):
            print(f"  ERRO   {pasta:<38} o guarda saiu {r.returncode}, não 0 nem 1")
            for linha in (r.stdout + r.stderr).rstrip().splitlines():
                print(f"         | {linha[:160]}")
            print("\nsuíte abortada: o guarda não conseguiu rodar (não é regressão de caso)")
            return 2

        reprovou = r.returncode == 1
        ok = reprovou == deve_reprovar
        nota = "" if ok else ("passou VERDE com a tela estragada"
                              if deve_reprovar else "reprovou sem a tela ter mudado")
        marca = "ok  " if ok else "FALHA"
        esperado = "reprova" if deve_reprovar else "passa"
        print(f"  {marca}  {pasta:<38} {esperado:<8} {oquê}")
        if nota:
            print(f"         -> {nota}")
        if verboso or not ok:
            for linha in (r.stdout + r.stderr).rstrip().splitlines():
                print(f"         | {linha[:160]}")
        if not ok:
            falhas.append(pasta)

    print()
    with tempfile.TemporaryDirectory(prefix="testa-guardas-") as bruto:
        tmp = Path(bruto)
        preparar_tmp(tmp)
        falhas += rodar_cli(guardas, tmp, verboso)
        print()
        falhas += rodar_ancoras(guardas["ancoras"], tmp, verboso)

    total = len(CASOS) + len(CASOS_CLI) + len(CASOS_ANCORAS) + 1
    print()
    if falhas:
        print(f"{len(falhas)} de {total} casos FALHARAM: {', '.join(falhas)}")
        return 1
    print(f"{total} de {total} casos ok "
          f"({len(CASOS)} fixtures + {len(CASOS_CLI)} de linha de comando "
          f"+ {len(CASOS_ANCORAS) + 1} de âncora na gravação)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
