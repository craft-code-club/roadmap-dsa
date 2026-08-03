// ---------------------------------------------------------------------------
// RecursionTipos, a tabela de referência dos tipos de recursão.
//
// Componente estático (sem "use client"): é HTML puro no build, serve de
// consulta rápida e continua legível sem JavaScript, igual ao BigOFamilias.
//
// A tabela é organizada por EIXO em vez de virar uma lista solta de sete
// nomes, porque a confusão mais comum é achar que "cauda" e "linear" competem
// entre si. Não competem: são perguntas diferentes sobre a mesma função.
// ---------------------------------------------------------------------------

type Linha = {
  nome: string;
  sub: string;
  codigo: string;
  exemplo: string;
};

type Eixo = { titulo: string; pergunta: string; linhas: Linha[] };

const EIXOS: Eixo[] = [
  {
    titulo: "Quem chama quem",
    pergunta: "de onde parte a chamada de volta",
    linhas: [
      {
        nome: "Direta",
        sub: "a função tem o próprio nome no corpo",
        codigo: "def fatorial(n):\n    if n <= 1:\n        return 1\n    return n * fatorial(n - 1)",
        exemplo: "fatorial, busca binária, percorrer uma árvore. É a esmagadora maioria dos casos.",
      },
      {
        nome: "Indireta",
        sub: "A chama B, e B (ou alguém adiante) volta a chamar A",
        codigo: "def imprime_obj(o):\n    for v in o.values():\n        imprime_val(v)\n\ndef imprime_val(v):\n    if isinstance(v, dict):\n        imprime_obj(v)",
        exemplo: "imprimir um JSON aninhado: a função de objeto chama a de valor, que volta a chamar a de objeto.",
      },
      {
        nome: "Aninhada",
        sub: "a chamada aparece dentro do argumento da própria chamada",
        codigo: "def ackermann(m, n):\n    if m == 0:\n        return n + 1\n    if n == 0:\n        return ackermann(m - 1, 1)\n    return ackermann(m - 1, ackermann(m, n - 1))",
        exemplo: "a função de Ackermann. Serve para estressar compilador e para estudo, não para resolver problema real.",
      },
    ],
  },
  {
    titulo: "Quantas chamadas por nível",
    pergunta: "o formato do rastro que a execução deixa",
    linhas: [
      {
        nome: "Linear",
        sub: "cada nível dispara no máximo uma chamada",
        codigo: "return n * fatorial(n - 1)",
        exemplo: "fatorial, potência, somar uma lista encadeada. O rastro é uma coluna, e a pilha chega a n frames.",
      },
      {
        nome: "Em árvore",
        sub: "cada nível dispara duas ou mais chamadas",
        codigo: "return fib(n - 1) + fib(n - 2)",
        exemplo: "Fibonacci, percursos em árvore binária, backtracking. O rastro é uma árvore, e o número de chamadas explode.",
      },
    ],
  },
  {
    titulo: "Quando a chamada acontece",
    pergunta: "se sobra trabalho para a volta",
    linhas: [
      {
        nome: "Cauda (tail)",
        sub: "a chamada é a última operação da função",
        codigo: "def fatorial(n, acc=1):\n    if n <= 1:\n        return acc\n    return fatorial(n - 1, acc * n)",
        exemplo: "o resultado desce pronto no acumulador. Nada fica pendente, e é isso que permite a otimização de chamada final.",
      },
      {
        nome: "Cabeça (head)",
        sub: "a chamada vem antes do trabalho, que acontece na volta",
        codigo: "def inverter(s):\n    if len(s) <= 1:\n        return s\n    return inverter(s[1:]) + s[0]",
        exemplo: "inverter uma string ou uma lista encadeada. O primeiro resultado só aparece quando a descida termina.",
      },
    ],
  },
];

export function RecursionTipos() {
  return (
    <figure className="rec-tipos">
      <div className="rec-tipos-head">
        <span className="dot" />
        <span>Os tipos de recursão, organizados por eixo</span>
      </div>
      <div className="rec-tipos-scroll">
        <table className="rec-tipos-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Como fica no código</th>
              <th>Onde aparece</th>
            </tr>
          </thead>
          <tbody>
            {EIXOS.map((eixo) => (
              <RecursionTiposEixo key={eixo.titulo} eixo={eixo} />
            ))}
          </tbody>
        </table>
      </div>
      <figcaption>
        Os três eixos são independentes: toda função recursiva é uma coisa de cada. O fatorial com
        acumulador, por exemplo, é direta, linear e de cauda ao mesmo tempo. Perguntar &quot;isto é
        cauda ou é linear?&quot; é como perguntar se um carro é vermelho ou é automático.
      </figcaption>
    </figure>
  );
}

function RecursionTiposEixo({ eixo }: { eixo: Eixo }) {
  return (
    <>
      <tr className="rec-tipos-eixo">
        <td colSpan={3}>
          {eixo.titulo} <span>· {eixo.pergunta}</span>
        </td>
      </tr>
      {eixo.linhas.map((l) => (
        <tr key={l.nome}>
          <td>
            <div className="rec-tipos-nome">{l.nome}</div>
            <div className="rec-tipos-sub">{l.sub}</div>
          </td>
          <td>
            <code className="rec-tipos-cod">{l.codigo}</code>
          </td>
          <td className="rec-tipos-ex">{l.exemplo}</td>
        </tr>
      ))}
    </>
  );
}
