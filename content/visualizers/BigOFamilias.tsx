// ---------------------------------------------------------------------------
// BigOFamilias, a tabela de referência das famílias de complexidade.
//
// Componente estático (sem "use client"): é HTML puro no build, serve de
// consulta rápida e continua legível sem JavaScript. A barra de cada linha é
// proporcional ao log do número de operações com n = 1.000, para caber na
// mesma escala visual desde O(1) até O(n!).
// ---------------------------------------------------------------------------

type Linha = {
  notacao: string;
  nome: string;
  exemplo: string;
  n10: string;
  n100: string;
  n1000: string;
  veredito: "otimo" | "bom" | "atencao" | "ruim";
  peso: number; // 0 a 1, largura da barra
};

const LINHAS: Linha[] = [
  { notacao: "O(1)", nome: "constante", exemplo: "acessar nums[i], ler de um hash", n10: "1", n100: "1", n1000: "1", veredito: "otimo", peso: 0.02 },
  { notacao: "O(log n)", nome: "logarítmica", exemplo: "busca binária, índice B-tree", n10: "4", n100: "7", n1000: "10", veredito: "otimo", peso: 0.06 },
  { notacao: "O(n)", nome: "linear", exemplo: "percorrer o array uma vez", n10: "10", n100: "100", n1000: "1.000", veredito: "bom", peso: 0.18 },
  { notacao: "O(n log n)", nome: "linearítmica", exemplo: "merge sort, quick sort, qualquer Order By", n10: "33", n100: "664", n1000: "9.966", veredito: "bom", peso: 0.28 },
  { notacao: "O(n²)", nome: "quadrática", exemplo: "dois laços aninhados, comparar todos os pares", n10: "100", n100: "10 mil", n1000: "1 milhão", veredito: "atencao", peso: 0.42 },
  { notacao: "O(n³)", nome: "cúbica", exemplo: "três laços aninhados, Floyd-Warshall", n10: "1.000", n100: "1 milhão", n1000: "1 bilhão", veredito: "atencao", peso: 0.56 },
  { notacao: "O(2ⁿ)", nome: "exponencial", exemplo: "fibonacci recursivo sem memo, subconjuntos", n10: "1.024", n100: "10³⁰", n1000: "10³⁰¹", veredito: "ruim", peso: 0.8 },
  { notacao: "O(n!)", nome: "fatorial", exemplo: "permutações, caixeiro viajante por força bruta", n10: "3,6 mi", n100: "10¹⁵⁸", n1000: "10²⁵⁶⁸", veredito: "ruim", peso: 1 },
];

const ROTULO: Record<Linha["veredito"], string> = {
  otimo: "escala liso",
  bom: "escala bem",
  atencao: "cuidado",
  ruim: "inviável",
};

export function BigOFamilias() {
  return (
    <figure className="bigo-fam">
      <div className="bigo-fam-head">
        <span className="dot" />
        <span>Famílias de complexidade e o número de operações no pior caso</span>
      </div>
      <div className="bigo-fam-scroll">
        <table className="bigo-fam-table">
          <thead>
            <tr>
              <th>Família</th>
              <th>Exemplo típico</th>
              <th className="nums">n = 10</th>
              <th className="nums">n = 100</th>
              <th className="nums">n = 1.000</th>
            </tr>
          </thead>
          <tbody>
            {LINHAS.map((l) => (
              <tr key={l.notacao} className={`v-${l.veredito}`}>
                <td>
                  <div className="bigo-fam-not">{l.notacao}</div>
                  <div className="bigo-fam-nome">{l.nome}</div>
                  <div className="bigo-fam-barra"><span style={{ width: `${l.peso * 100}%` }} /></div>
                </td>
                <td className="bigo-fam-ex">
                  {l.exemplo}
                  <span className="bigo-fam-tag">{ROTULO[l.veredito]}</span>
                </td>
                <td className="nums">{l.n10}</td>
                <td className="nums">{l.n100}</td>
                <td className="nums">{l.n1000}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption>
        Cada linha é uma família, não um algoritmo. Dois algoritmos O(n) podem ter tempos de
        execução bem diferentes: o que a família garante é o formato da curva quando n cresce.
      </figcaption>
    </figure>
  );
}
