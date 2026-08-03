// ---------------------------------------------------------------------------
// HeapSortComparativo, onde o heap sort ganha e onde ele perde.
//
// Componente estático (sem "use client"): sai pronto do build e funciona sem
// JavaScript.
//
// A tabela existe para responder uma pergunta prática, não para decorar: se o
// heap sort é O(n log n) garantido, in-place e sem pior caso, por que quase
// nenhuma biblioteca padrão usa ele sozinho? A resposta está espalhada em três
// colunas (estável, localidade de memória e o "na prática"), e é mais honesta
// do que qualquer ranking.
// ---------------------------------------------------------------------------

type Linha = {
  nome: string;
  melhor: string;
  medio: string;
  pior: string;
  espaco: string;
  estavel: boolean;
  inPlace: boolean;
  nota: string;
  destaque?: boolean;
};

const LINHAS: Linha[] = [
  {
    nome: "Heap sort",
    melhor: "O(n log n)",
    medio: "O(n log n)",
    pior: "O(n log n)",
    espaco: "O(1)",
    estavel: false,
    inPlace: true,
    nota: "A única linha com teto e piso iguais e sem memória extra. Perde em velocidade real porque salta pelo array e desperdiça cache.",
    destaque: true,
  },
  {
    nome: "Merge sort",
    melhor: "O(n log n)",
    medio: "O(n log n)",
    pior: "O(n log n)",
    espaco: "O(n)",
    estavel: true,
    inPlace: false,
    nota: "Mesma garantia de tempo e estável, ao preço de um array auxiliar. É a escolha quando a estabilidade importa ou os dados não cabem na memória.",
  },
  {
    nome: "Quick sort",
    melhor: "O(n log n)",
    medio: "O(n log n)",
    pior: "O(n²)",
    espaco: "O(log n)",
    estavel: false,
    inPlace: true,
    nota: "O mais rápido na média por causa da localidade de memória, mas com um pior caso quadrático que um pivô mal escolhido alcança.",
  },
  {
    nome: "Insertion sort",
    melhor: "O(n)",
    medio: "O(n²)",
    pior: "O(n²)",
    espaco: "O(1)",
    estavel: true,
    inPlace: true,
    nota: "Imbatível em array pequeno ou quase ordenado, e é por isso que quase toda biblioteca cai nele abaixo de umas dezenas de elementos.",
  },
  {
    nome: "Selection sort",
    melhor: "O(n²)",
    medio: "O(n²)",
    pior: "O(n²)",
    espaco: "O(1)",
    estavel: false,
    inPlace: true,
    nota: "É o heap sort sem o heap: mesma ideia de tirar o maior toda rodada, só que procurando com varredura linear em vez de estrutura.",
  },
];

export function HeapSortComparativo() {
  return (
    <figure className="bigo-fam">
      <div className="bigo-fam-head">
        <span className="dot" />
        <span>Heap sort ao lado dos vizinhos de prateleira</span>
      </div>
      <div className="bigo-fam-scroll">
        <table className="bigo-fam-table hp-tabela">
          <thead>
            <tr>
              <th>Algoritmo</th>
              <th className="nums">melhor</th>
              <th className="nums">médio</th>
              <th className="nums">pior</th>
              <th className="nums">espaço</th>
              <th className="nums">estável</th>
            </tr>
          </thead>
          <tbody>
            {LINHAS.map((l) => (
              <tr key={l.nome} className={l.destaque ? "hp-destaque" : ""}>
                <td>
                  <div className="bigo-fam-not hp-nome">{l.nome}</div>
                  <div className="bigo-fam-nome">{l.inPlace ? "in-place" : "precisa de array auxiliar"}</div>
                  <div className="hp-veredito">{l.nota}</div>
                </td>
                <td className="nums">
                  <span className={`hp-custo c-${l.melhor === "O(n)" ? "otimo" : l.melhor.includes("n²") ? "ruim" : "bom"}`}>{l.melhor}</span>
                </td>
                <td className="nums">
                  <span className={`hp-custo c-${l.medio.includes("n²") ? "ruim" : "bom"}`}>{l.medio}</span>
                </td>
                <td className="nums">
                  <span className={`hp-custo c-${l.pior.includes("n²") ? "ruim" : "bom"}`}>{l.pior}</span>
                </td>
                <td className="nums">
                  <span className={`hp-custo c-${l.espaco === "O(1)" ? "otimo" : l.espaco === "O(n)" ? "ruim" : "bom"}`}>{l.espaco}</span>
                </td>
                <td className="nums">
                  <span className={`hp-custo c-${l.estavel ? "otimo" : "ruim"}`}>{l.estavel ? "sim" : "não"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption>
        Nenhuma linha vence em tudo, e é por isso que as bibliotecas padrão combinam várias. O introsort da
        biblioteca C++ começa com quick sort, cai para insertion sort em trechos pequenos e troca para heap
        sort se a recursão ficar funda demais: o heap sort entra ali exatamente como a rede de segurança
        contra o O(n²) do quick sort.
      </figcaption>
    </figure>
  );
}
