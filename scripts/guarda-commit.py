#!/usr/bin/env python3
"""Guarda dos headers de commit: tamanho E caixa.

    git log --format="%s" origin/main..HEAD | python3 scripts/guarda-commit.py

O `|` NÃO é enfeite: o guarda lê de `stdin`. Chamado sem entrada ele não tem o
que checar, e é justamente aí que a versão anterior saía **0 sem imprimir nada**
— indistinguível de "olhei todos os commits e estão certos". Foi assim que dez
agentes "rodaram o guarda" antes de cada push sem que nenhum guarda rodasse.
Desde então ele sai 2 e diz o que faltou.

Códigos de saída:

    0   checou pelo menos UM header e todos passam
    1   algum header reprova o commitlint
    2   o guarda NÃO CHECOU NADA (`stdin` vazio, ou só commits de merge)

O commitlint reprova por duas coisas que passam despercebidas:
  · header acima de 72 CARACTERES (não bytes: um `ê` vale 2 em `awk length`);
  · `subject-case` — o assunto não pode começar em maiúscula, e isso inclui
    sigla e nome de variável de ambiente (`PORT`, `CSS`, `SEO`).
"""
import re
import sys

# Commit de merge não é escrito por ninguém: o `git merge origin/main` gera
# "Merge remote-tracking branch 'origin/main' into <branch>", que começa em
# maiúscula e costuma passar de 72 caracteres — ou seja, reprovava pelas DUAS
# regras acima. E o portão de verdade, o `wagoid/commitlint-github-action` do
# `.github/workflows/commitlint.yml`, **ignora** essas mensagens (os
# `defaultIgnores` do `@commitlint/is-ignored` casam `Merge pull request`,
# `Merge remote-tracking branch` e `Merge <x> into <y>`). O guarda local
# reprovava o que o CI aprova: falso alarme puro, e caro — dois agentes
# reescreveram a mensagem do merge à mão para calar o guarda, e o histórico
# guarda as duas cicatrizes ("chore: mescla a main e regenera o lock com o axe"
# e "chore: traz a main nova para a branch do anúncio e da pausa").
#
# O padrão é ancorado, sensível à caixa e exige o espaço, porque a convenção
# deste repositório é Conventional Commits em MINÚSCULA: `feat: merge sort
# ganha visualizador` não casa (não está no começo e não tem maiúscula), e
# `Merged` também não (falta o espaço). Conferido em 2026-08-07 sobre a
# `origin/main` inteira: `^Merge ` casou 55 assuntos, TODOS commits de merge de
# verdade (`git log --merges` devolve 57; os 2 a mais são os dois merges com a
# mensagem reescrita à mão acima). Nenhum commit de trabalho casou.
MERGE = re.compile(r"^Merge ")


def problemas_de(header: str) -> list[str]:
    """As duas regras do commitlint que este guarda antecipa."""
    assunto = header.split(":", 1)[1].strip() if ":" in header else header
    problemas = []
    if len(header) > 72:
        problemas.append(f"{len(header)} caracteres (máx. 72)")
    if assunto[:1].isupper():
        problemas.append(f"assunto começa em maiúscula ({assunto.split()[0]!r})")
    return problemas


def main() -> int:
    ruim = False
    checados = 0
    merges = 0

    for linha in sys.stdin:
        h = linha.rstrip()
        if not h:
            continue
        if MERGE.match(h):
            merges += 1
            print(f"↷ {h}  → commit de merge, ignorado (igual ao commitlint)")
            continue
        checados += 1
        problemas = problemas_de(h)
        marca = "✖ " if problemas else "✓ "
        print(marca + h + ("  → " + "; ".join(problemas) if problemas else ""))
        ruim = ruim or bool(problemas)

    # A linha do fim existe para tirar a ambiguidade da saída vazia: quem roda
    # precisa conseguir distinguir "passou" de "nem olhou" SEM contar as linhas
    # de cima. Ela vai para o stdout mesmo no caminho feliz, de propósito.
    if checados == 0:
        sys.stdout.flush()   # senão o stderr sai ANTES das linhas `↷` e a leitura fica trocada
        motivo = (f"as {merges} linha(s) que chegaram eram todas commits de merge"
                  if merges else "não chegou nada em `stdin` — faltou o `|` do pipe?")
        print(f"guarda-commit: NENHUM header foi checado ({motivo}).", file=sys.stderr)
        print("guarda-commit: uso: "
              'git log --format="%s" origin/main..HEAD | python3 scripts/guarda-commit.py',
              file=sys.stderr)
        return 2

    resumo = f"{checados} header(s) checado(s)"
    if merges:
        resumo += f", {merges} commit(s) de merge ignorado(s)"
    print(f"{'✖' if ruim else '✓'} {resumo}.")
    return 1 if ruim else 0


if __name__ == "__main__":
    raise SystemExit(main())
