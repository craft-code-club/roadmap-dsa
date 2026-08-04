"""Guarda de idioma: o que o aluno lê não pode mudar num rename de identificador.

    python3 guarda-idioma.py <antes.tsx> <depois.tsx>

Compara TUDO que aparece na tela — literais de string e nós de texto JSX — e
falha se alguma coisa entrou ou saiu. O que sobrar tem que ser só nome de
import, de hook e de prop.
"""
import re, sys
from collections import Counter

# Nó de texto JSX: entre `>` e `<`, sem quebra de linha e sem sinal de código.
# Sem essas restrições o casamento atravessa funções inteiras e o relatório
# vira ruído — foi assim que três strings de tela passaram batido.
JSX_TEXTO = r">([^<>{}\n;=]*[A-Za-zÀ-ÿ][^<>{}\n;=]*)<"
LITERAIS = (r'"([^"\\\n]*(?:\\.[^"\\\n]*)*)"'
            r"|'([^'\\\n]*(?:\\.[^'\\\n]*)*)'"
            r"|`([^`\\]*(?:\\.[^`\\]*)*)`")

def na_tela(caminho: str) -> Counter:
    s = open(caminho, encoding="utf-8").read()
    s = re.sub(r"//[^\n]*|/\*.*?\*/", "", s, flags=re.S)     # comentário não é tela
    achados = []
    for m in re.finditer(f"{LITERAIS}|{JSX_TEXTO}", s):
        t = next((g for g in m.groups() if g is not None), "")
        t = re.sub(r"\$\{[^}]*\}", "§", t).strip()           # interpolação é código
        if t and re.search(r"[A-Za-zÀ-ÿ]", t):
            achados.append(t)
    return Counter(achados)

antes, depois = na_tela(sys.argv[1]), na_tela(sys.argv[2])
sumiram, apareceram = sorted(antes - depois), sorted(depois - antes)
for rotulo, itens in (("SUMIRAM", sumiram), ("APARECERAM", apareceram)):
    print(f"{rotulo}:")
    for t in itens: print("   ", repr(t))
    if not itens: print("    nenhuma")
sys.exit(1 if (sumiram or apareceram) else 0)
