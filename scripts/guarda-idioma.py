"""Guarda de idioma: o que o aluno lê não pode mudar num rename de identificador.

    python3 guarda-idioma.py <antes.tsx> <depois.tsx>

Compara TUDO que aparece na tela — literais de string e nós de texto JSX — e
falha se alguma coisa entrou ou saiu. O que sobrar tem que ser só nome de
import, de hook e de prop.

Este arquivo já teve DUAS versões que passavam verde com a aula estragada, e as
duas falharam do mesmo jeito: por olhar de menos, não por olhar errado. Quando
ele passar, a pergunta útil é o que ele NÃO está olhando.

  1ª versão — só literais de string, sem nó JSX. `<span>Array (fica
     sorted)</span>` e mais dois rótulos passaram batido.
  2ª versão — nó JSX só numa linha (`[^...\\n]`) e interpolação apagada inteira
     (`\\$\\{[^}]*\\}` → `§`). Isso deixou de fora justamente os dois formatos
     mais comuns do repo, e as duas brechas foram medidas em rename de verdade:

       <button className="viz-btn" onClick={() => pickOp("push-end")}>
         inserir no fim          ← nó JSX em linha própria: virou "inserir no done"
       </button>

       `... ${cond ? "reservar a capacidade certa" : "..."} ...`
                                 ↑ literal DENTRO da interpolação: virou "capacity"

Daí as duas mudanças desta versão: o nó JSX pode atravessar linhas, e os
literais são varridos em passadas SEPARADAS, para o casamento da crase não
engolir as aspas aninhadas nela.
"""
import re, sys
from collections import Counter

# Nó de texto JSX. Atravessa linhas de propósito — é assim que o Prettier
# formata qualquer elemento cujos atributos não cabem numa linha só. Os sinais
# de código (`{}`, `;`, `=`, `<`, `>`) seguem de fora, e o teto de tamanho
# impede que um `>` de comparação abra um casamento que atravessa uma função.
JSX_TEXTO = r">([^<>{};=]*[A-Za-zÀ-ÿ][^<>{};=]*)<"
MAX_JSX = 240

# Passadas SEPARADAS, e não uma alternância só: numa alternância o casamento da
# crase consome `${cond ? "texto de tela" : "outro"}` inteiro e as aspas de
# dentro nunca são vistas. Varrendo aspas por conta própria elas aparecem.
ASPAS_DUPLAS = r'"([^"\\\n]*(?:\\.[^"\\\n]*)*)"'
ASPAS_SIMPLES = r"'([^'\\\n]*(?:\\.[^'\\\n]*)*)'"
CRASE = r"`([^`\\]*(?:\\.[^`\\]*)*)`"


def na_tela(caminho: str) -> Counter:
    s = open(caminho, encoding="utf-8").read()
    s = re.sub(r"//[^\n]*|/\*.*?\*/", "", s, flags=re.S)     # comentário não é tela
    achados = []
    for padrao in (ASPAS_DUPLAS, ASPAS_SIMPLES, CRASE, JSX_TEXTO):
        for m in re.finditer(padrao, s, flags=re.S):
            t = m.group(1)
            if padrao is JSX_TEXTO and len(t) > MAX_JSX:
                continue
            t = re.sub(r"\$\{[^{}]*\}", "§", t)              # interpolação é código
            t = " ".join(t.split())                          # a indentação não é tela
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
