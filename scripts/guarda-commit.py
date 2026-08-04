"""Guarda dos headers de commit: tamanho E caixa.

    git log --format="%s" origin/main..HEAD | python3 guarda-commit.py

O commitlint reprova por duas coisas que passam despercebidas:
  · header acima de 72 CARACTERES (não bytes: um `ê` vale 2 em `awk length`);
  · `subject-case` — o assunto não pode começar em maiúscula, e isso inclui
    sigla e nome de variável de ambiente (`PORT`, `CSS`, `SEO`).
"""
import re, sys

ruim = False
for linha in sys.stdin:
    h = linha.rstrip()
    if not h:
        continue
    n = len(h)
    assunto = h.split(":", 1)[1].strip() if ":" in h else h
    problemas = []
    if n > 72:
        problemas.append(f"{n} caracteres (máx. 72)")
    if assunto[:1].isupper():
        problemas.append(f"assunto começa em maiúscula ({assunto.split()[0]!r})")
    print(("✖ " if problemas else "✓ ") + h + ("  → " + "; ".join(problemas) if problemas else ""))
    ruim = ruim or bool(problemas)
sys.exit(1 if ruim else 0)
