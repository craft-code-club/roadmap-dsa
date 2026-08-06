#!/usr/bin/env python3
"""Suíte do próprio guarda de idioma.

    python3 scripts/testa-guarda-idioma.py                 # roda o guarda atual
    python3 scripts/testa-guarda-idioma.py --guarda <p>    # roda OUTRO guarda
    python3 scripts/testa-guarda-idioma.py -v              # imprime a saída de cada caso

O `--guarda` existe para a prova de quebra: aponte para uma cópia da versão
anterior e veja os casos 4, 5 e 6 passarem verdes com a aula estragada. Um
guarda que você nunca viu falhar não é guarda.

Cada caso é um par de arquivos em `fixtures-guarda-idioma/<caso>/`, com
extensão `.tsx.txt` de propósito: o `tsconfig.json` inclui `**/*.tsx`, então
fixture com extensão de verdade entraria no `npx tsc --noEmit` e quebraria o
typecheck com código que existe justamente para estar errado. O motor força
`ScriptKind.TSX`, então o parser lê igual.
"""
import subprocess
import sys
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
]


def main() -> int:
    argv = sys.argv[1:]
    verboso = "-v" in argv or "--verbose" in argv
    guarda = AQUI / "guarda-idioma.py"
    if "--guarda" in argv:
        guarda = Path(argv[argv.index("--guarda") + 1]).resolve()

    print(f"guarda: {guarda}\n")
    falhas = []
    for pasta, deve_reprovar, oquê in CASOS:
        base = FIXTURES / pasta
        r = subprocess.run(
            [sys.executable, str(guarda), str(base / "antes.tsx.txt"), str(base / "depois.tsx.txt")],
            capture_output=True, text=True,
        )
        reprovou = r.returncode == 1
        if r.returncode not in (0, 1):
            ok, nota = False, f"o guarda saiu {r.returncode}"
        else:
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
    if falhas:
        print(f"{len(falhas)} de {len(CASOS)} casos FALHARAM: {', '.join(falhas)}")
        return 1
    print(f"{len(CASOS)} de {len(CASOS)} casos ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
