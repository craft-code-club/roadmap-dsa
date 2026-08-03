// ---------------------------------------------------------------------------
// HeapEstruturas, por que o heap existe se já temos array e árvore de busca.
//
// Componente estático (sem "use client"): é HTML no build, funciona sem
// JavaScript e serve de tabela de consulta.
//
// A tabela é a resposta a uma pergunta legítima: "para que serve mais uma
// estrutura?". Nenhuma linha ganha em tudo, e é justamente por isso que o heap
// existe: ele é a única que faz `ver o menor` e `remover o menor` baratos ao
// mesmo tempo, que é exatamente o par de operações de uma fila de prioridade.
// O preço aparece na última coluna, e é honesto declará-lo.
// ---------------------------------------------------------------------------

type Custo = "otimo" | "bom" | "ruim";

type Linha = {
  estrutura: string;
  detalhe: string;
  inserir: string;
  verMenor: string;
  tirarMenor: string;
  buscarQualquer: string;
  custos: [Custo, Custo, Custo, Custo];
  veredito: string;
};

const LINHAS: Linha[] = [
  {
    estrutura: "Array desordenado",
    detalhe: "só empilha no fim",
    inserir: "O(1)",
    verMenor: "O(n)",
    tirarMenor: "O(n)",
    buscarQualquer: "O(n)",
    custos: ["otimo", "ruim", "ruim", "ruim"],
    veredito: "Barato para escrever, caro para toda pergunta.",
  },
  {
    estrutura: "Array ordenado",
    detalhe: "mantém tudo em ordem",
    inserir: "O(n)",
    verMenor: "O(1)",
    tirarMenor: "O(n)",
    buscarQualquer: "O(log n)",
    custos: ["ruim", "otimo", "ruim", "bom"],
    veredito: "Ler é ótimo, escrever é o pesadelo: cada inserção desloca o resto.",
  },
  {
    estrutura: "Árvore de busca balanceada",
    detalhe: "AVL, Red-Black, TreeMap",
    inserir: "O(log n)",
    verMenor: "O(log n)",
    tirarMenor: "O(log n)",
    buscarQualquer: "O(log n)",
    custos: ["bom", "bom", "bom", "bom"],
    veredito: "Equilibrada em tudo. Se você também precisa buscar um valor qualquer ou percorrer em ordem, é ela.",
  },
  {
    estrutura: "Binary heap",
    detalhe: "a fila de prioridade",
    inserir: "O(log n)",
    verMenor: "O(1)",
    tirarMenor: "O(log n)",
    buscarQualquer: "O(n)",
    custos: ["bom", "otimo", "bom", "ruim"],
    veredito: "O único par barato de ver e tirar o extremo. Em troca, buscar um valor qualquer é varredura.",
  },
];

const COLUNAS = ["inserir", "ver o menor", "remover o menor", "buscar um valor qualquer"];

export function HeapEstruturas() {
  return (
    <figure className="bigo-fam">
      <div className="bigo-fam-head">
        <span className="dot" />
        <span>Quatro estruturas para a mesma pergunta: quem é o menor agora?</span>
      </div>
      <div className="bigo-fam-scroll">
        <table className="bigo-fam-table hp-tabela">
          <thead>
            <tr>
              <th>Estrutura</th>
              {COLUNAS.map((c) => (
                <th key={c} className="nums">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LINHAS.map((l) => {
              const celulas = [l.inserir, l.verMenor, l.tirarMenor, l.buscarQualquer];
              return (
                <tr key={l.estrutura} className={l.estrutura === "Binary heap" ? "hp-destaque" : ""}>
                  <td>
                    <div className="bigo-fam-not hp-nome">{l.estrutura}</div>
                    <div className="bigo-fam-nome">{l.detalhe}</div>
                    <div className="hp-veredito">{l.veredito}</div>
                  </td>
                  {celulas.map((valor, i) => (
                    <td key={COLUNAS[i]} className="nums">
                      <span className={`hp-custo c-${l.custos[i]}`}>{valor}</span>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <figcaption>
        Num max-heap troque &quot;menor&quot; por &quot;maior&quot;: as contas são as mesmas. A coluna que decide
        quase sempre é a última: se o seu código precisa perguntar &quot;o 42 está aí?&quot;, o heap não é a
        estrutura, porque ele não guarda ordem nenhuma entre irmãos e você acaba varrendo o array inteiro.
      </figcaption>
    </figure>
  );
}
