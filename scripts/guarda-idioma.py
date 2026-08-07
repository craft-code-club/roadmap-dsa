#!/usr/bin/env python3
"""Guarda de idioma: o que o aluno lê não pode mudar num rename de identificador.

    python3 scripts/guarda-idioma.py <antes.tsx> <depois.tsx>
    python3 scripts/guarda-idioma.py <dir-antes> <dir-depois>    # o tópico inteiro

Compara TUDO que aparece na tela — literais de string, templates (aninhados
inclusive) e nós de texto JSX — e falha se alguma coisa entrou ou saiu.

Sai 0 quando o texto de tela é idêntico, 1 quando mudou, 2 quando o próprio
guarda não conseguiu rodar. **Nunca sai 0 por não ter conseguido olhar**: o
histórico deste arquivo é de passar verde com a aula estragada, e um guarda que
falha calado é pior que nenhum.

O QUE MUDOU NESTA VERSÃO, E POR QUÊ
-----------------------------------
As três versões anteriores casavam texto por expressão regular, e as três
falharam do mesmo jeito: por olhar de menos.

  1ª  só literais de string, sem nó JSX
      -> `<span>Array (fica ordenado)</span>` virou "sorted" sem um pio.
  2ª  nó JSX só numa linha, interpolação apagada inteira
      -> `inserir no fim` (nó JSX quebrado pelo Prettier) virou "inserir no
         done", e `${cond ? "reservar a capacidade certa" : ...}` virou
         "capacity".
  3ª  passadas separadas por tipo de aspa
      -> resolveu as duas acima e deixou DOIS buracos, medidos no
         `listas-ligadas` e documentados no §0 do contrato:

         crase ANINHADA dentro de `${...}`  — o pareamento das crases sai de
         sincronia e o guarda passa a comparar CÓDIGO como se fosse tela. Num
         rename de 4 identificadores do `LinkedListFloyd` isso dava 36 linhas
         de saída, todas ruído, com um rótulo trocado de verdade escondido
         dentro de um blob de 4 mil caracteres.

         texto de tela colado numa interpolação — `<span>Nós no ciclo: {...}`.
         O "Nós no ciclo: " não está em string nenhuma, o padrão `>texto<` não
         casa por causa do `{`, e o guarda saía `SUMIRAM: nenhuma`. Este era o
         silencioso: trocar `" de "` por `" of "` em
         `{s.round} de {LABELS.length - 1}` (`BellmanFordVisualizer`) deixava o
         painel dizendo "rodada 5 of 4" com o guarda VERDE.

A 4ª versão (esta) não casa texto: ela **parseia**. O trabalho de ler o TSX é
do compilador do TypeScript, que já é dependência do projeto, num script Node
irmão (`scripts/extrai-textos-tsx.mjs`). Este arquivo continua sendo a porta de
entrada — mesmo caminho, mesma linha de comando, mesmo relatório —, porque é
ele que o contrato, o runbook e a skill mandam chamar; o que saiu daqui foi só
o motor, que precisa da AST, e não a comparação, que são seis linhas de
`Counter`.
"""
import json
import shutil
import subprocess
import sys
from collections import Counter
from pathlib import Path

MOTOR = Path(__file__).resolve().with_name("extrai-textos-tsx.mjs")
EXTENSOES = (".tsx", ".ts", ".jsx", ".js")


def morrer(msg: str) -> None:
    """Erro do guarda, não do arquivo: sai 2 para não ser lido como 'passou'."""
    print(f"guarda-idioma: {msg}", file=sys.stderr)
    raise SystemExit(2)


def extrair(caminhos: list[Path]) -> dict:
    """Roda o motor Node uma vez para TODOS os arquivos e devolve o JSON."""
    if not caminhos:
        return {}
    node = shutil.which("node")
    if not node:
        morrer("`node` não está no PATH — o guarda usa o parser do TypeScript.")
    if not MOTOR.exists():
        morrer(f"motor não encontrado em {MOTOR}")
    entrada = json.dumps({"files": [str(p) for p in caminhos]})
    r = subprocess.run([node, str(MOTOR)], input=entrada, capture_output=True, text=True)
    if r.stderr:
        sys.stderr.write(r.stderr)
    if r.returncode != 0:
        morrer(f"o motor falhou (código {r.returncode}).")
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        morrer("o motor não devolveu JSON.")


def arquivos_de(raiz: Path) -> list[str]:
    """Caminhos relativos dos fontes sob um diretório, ordenados."""
    return sorted(
        str(p.relative_to(raiz))
        for p in raiz.rglob("*")
        if p.is_file() and p.suffix in EXTENSOES and "node_modules" not in p.parts
    )


def bloco(rotulo: str, itens: list[str], recuo: str = "    ") -> None:
    print(f"{recuo}{rotulo}:")
    for t in itens:
        print(f"{recuo}    {repr(t)}")
    if not itens:
        print(f"{recuo}    nenhuma")


def comparar(antes: dict, depois: dict, recuo: str = "") -> bool:
    """Imprime o veredito de um par. Devolve True se o texto de tela mudou."""
    tela_a, tela_d = Counter(antes["tela"]), Counter(depois["tela"])
    sumiram, apareceram = sorted(tela_a - tela_d), sorted(tela_d - tela_a)

    bloco("SUMIRAM", sumiram, recuo)
    bloco("APARECERAM", apareceram, recuo)

    # Literal de código que muda não reprova, mas é onde mora a armadilha do §0
    # (o literal que vira NOME DE CLASSE do CSS): o `tsc` não vê, o teste não vê
    # e o guarda antigo misturava com o texto de tela. Aqui ele fica à parte.
    cod_a, cod_d = Counter(antes["codigo"]), Counter(depois["codigo"])
    mexidos = sorted((cod_a - cod_d) + (cod_d - cod_a))
    if mexidos:
        print(f"{recuo}AVISO (não reprova) — literais de CÓDIGO que mudaram.")
        print(f"{recuo}  Se algum for nome de classe, confira no globals.css (§0 do contrato):")
        for t in mexidos:
            print(f"{recuo}    {repr(t)}")

    return bool(sumiram or apareceram)


def main() -> None:
    if len(sys.argv) != 3:
        morrer("uso: guarda-idioma.py <antes> <depois>  (arquivo ou diretório)")

    a, d = Path(sys.argv[1]), Path(sys.argv[2])
    for p in (a, d):
        if not p.exists():
            morrer(f"não existe: {p}")
    if a.is_dir() != d.is_dir():
        morrer("os dois lados têm que ser ambos arquivo ou ambos diretório.")

    if a.is_file():
        dados = extrair([a, d])
        raise SystemExit(1 if comparar(dados[str(a)], dados[str(d)]) else 0)

    nomes = sorted(set(arquivos_de(a)) | set(arquivos_de(d)))
    dados = extrair([a / n for n in nomes if (a / n).exists()]
                    + [d / n for n in nomes if (d / n).exists()])
    vazio = {"tela": [], "codigo": []}

    def mesmo_conjunto(x: dict, y: dict) -> bool:
        """O guarda compara CONJUNTO, não posição — igual ao `comparar`.

        Com `x == y` cru a comparação era por lista ordenada, então trocar dois
        trechos de lugar contava o arquivo como mexido: saía o nome dele, sem
        SUMIRAM, sem APARECERAM e sem AVISO, e o resumo final ainda mandava ver
        blocos AVISO que não existiam. O limite "conjunto, não posição" já era o
        contrato (fixture 10); só este laço não seguia ele.
        """
        return (Counter(x["tela"]) == Counter(y["tela"])
                and Counter(x["codigo"]) == Counter(y["codigo"]))

    quebrou = False
    mexidos = 0
    for n in nomes:
        antes = dados.get(str(a / n), vazio)
        depois = dados.get(str(d / n), vazio)
        if mesmo_conjunto(antes, depois):
            continue
        mexidos += 1
        print(n)
        quebrou |= comparar(antes, depois, recuo="  ")
    if not quebrou:
        # A ÚLTIMA linha é a que fica na tela de quem rodou, e ela não pode
        # dizer "nenhuma" quando houve AVISO acima: aviso de literal de código
        # é justamente o que o contrato manda conferir à mão no globals.css.
        # Resumo tranquilizador em cima de achado é a mesma armadilha do guarda
        # que sai 0 sem ter olhado nada.
        if mexidos:
            print(f"TELA intacta, mas {mexidos} de {len(nomes)} arquivo(s) mudaram "
                  f"literais de CÓDIGO — veja os blocos AVISO acima antes de seguir.")
        else:
            print(f"SUMIRAM: nenhuma / APARECERAM: nenhuma  ({len(nomes)} arquivos)")
    raise SystemExit(1 if quebrou else 0)


if __name__ == "__main__":
    main()
