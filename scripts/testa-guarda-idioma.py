#!/usr/bin/env python3
"""Suíte dos guardas: o de idioma e o de header de commit.

    python3 scripts/testa-guarda-idioma.py                      # roda os guardas atuais
    python3 scripts/testa-guarda-idioma.py --guarda <p>         # roda OUTRO guarda-idioma
    python3 scripts/testa-guarda-idioma.py --guarda-commit <p>  # roda OUTRO guarda-commit
    python3 scripts/testa-guarda-idioma.py -v                   # imprime a saída de cada caso

Os `--guarda*` existem para a prova de quebra: aponte para uma cópia da versão
anterior e veja os casos passarem verdes com a aula estragada (ou com o guarda
cego). Um guarda que você nunca viu falhar não é guarda.

**O nome do arquivo ficou menor que o conteúdo, e é de propósito.** Ele cobre os
DOIS guardas porque é este caminho que o portão da CI chama
(`.github/workflows/tests.yml`, passo "Suíte do próprio guarda de idioma");
renomear exigiria mexer no workflow, e uma suíte que a CI não roda protege
menos que um nome errado.

A suíte tem dois blocos:

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


def main() -> int:
    argv = sys.argv[1:]
    verboso = "-v" in argv or "--verbose" in argv
    # Sem o caminho depois do flag isto era um IndexError com traceback e
    # código 1 — o MESMO código de "um caso reprovou". Erro de uso não pode
    # ser confundido com resultado de teste, então sai 2.
    if any(f in argv and argv.index(f) + 1 >= len(argv) for f in ("--guarda", "--guarda-commit")):
        print("uso: testa-guarda-idioma.py [--guarda <p>] [--guarda-commit <p>] [-v]",
              file=sys.stderr)
        return 2
    guardas = {
        "idioma": caminho_do_flag(argv, "--guarda", AQUI / "guarda-idioma.py"),
        "commit": caminho_do_flag(argv, "--guarda-commit", AQUI / "guarda-commit.py"),
    }

    print(f"guarda-idioma: {guardas['idioma']}")
    print(f"guarda-commit: {guardas['commit']}\n")
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

    total = len(CASOS) + len(CASOS_CLI)
    print()
    if falhas:
        print(f"{len(falhas)} de {total} casos FALHARAM: {', '.join(falhas)}")
        return 1
    print(f"{total} de {total} casos ok "
          f"({len(CASOS)} fixtures + {len(CASOS_CLI)} de linha de comando)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
