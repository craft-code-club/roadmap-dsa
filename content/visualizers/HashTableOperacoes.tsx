// ---------------------------------------------------------------------------
// HashTableOperacoes, a tabela de consulta que compara a tabela hash com as
// estruturas que vieram antes dela no roadmap.
//
// Componente estático (sem "use client"): vira HTML no build, serve de consulta
// rápida e continua legível sem JavaScript. Cada célula traz o caso médio e o
// pior caso porque a graça da tabela hash está justamente na distância entre os
// dois, que é o que a coluna "pior caso" existe para não deixar esquecer.
// ---------------------------------------------------------------------------

type Tom = "otimo" | "bom" | "atencao";
type Celula = { med: string; pior: string; tom: Tom };
type Linha = { nome: string; detalhe: string; busca: Celula; insercao: Celula; remocao: Celula };

const LINHAS: Linha[] = [
  {
    nome: "Array",
    detalhe: "acesso por índice é O(1), mas achar um valor exige varrer",
    busca: { med: "O(n)", pior: "O(n) no pior caso", tom: "atencao" },
    insercao: { med: "O(1)", pior: "O(n) quando realoca", tom: "bom" },
    remocao: { med: "O(n)", pior: "O(n) no pior caso", tom: "atencao" },
  },
  {
    nome: "Array ordenado",
    detalhe: "com busca binária, mas alguém precisa mantê-lo ordenado",
    busca: { med: "O(log n)", pior: "O(log n) no pior caso", tom: "bom" },
    insercao: { med: "O(n)", pior: "O(n) para abrir espaço", tom: "atencao" },
    remocao: { med: "O(n)", pior: "O(n) para fechar o buraco", tom: "atencao" },
  },
  {
    nome: "Lista encadeada",
    detalhe: "cresce sem realocar, mas não existe salto direto",
    busca: { med: "O(n)", pior: "O(n) no pior caso", tom: "atencao" },
    insercao: { med: "O(1)", pior: "O(1) na cabeça", tom: "otimo" },
    remocao: { med: "O(n)", pior: "O(1) com o nó em mãos", tom: "atencao" },
  },
  {
    nome: "Tabela hash",
    detalhe: "salto direto pela chave, sem ordem nenhuma garantida",
    busca: { med: "O(1)", pior: "O(n) se tudo colidir", tom: "otimo" },
    insercao: { med: "O(1)", pior: "O(n) no rehash", tom: "otimo" },
    remocao: { med: "O(1)", pior: "O(n) se tudo colidir", tom: "otimo" },
  },
];

export function HashTableOperacoes() {
  return (
    <figure className="ht-tab">
      <div className="ht-tab-head">
        <span className="dot" />
        <span>Buscar, inserir e remover pela chave: quanto custa em cada estrutura</span>
      </div>
      <div className="ht-tab-scroll">
        <table className="ht-tab-table">
          <thead>
            <tr>
              <th>Estrutura</th>
              <th>Busca por chave</th>
              <th>Inserção</th>
              <th>Remoção</th>
            </tr>
          </thead>
          <tbody>
            {LINHAS.map((l) => (
              <tr key={l.nome}>
                <td>
                  <div className="ht-tab-nome">{l.nome}</div>
                  <div className="ht-tab-det">{l.detalhe}</div>
                </td>
                {[l.busca, l.insercao, l.remocao].map((c, i) => (
                  <td key={i} className={`v-${c.tom}`}>
                    <span className="ht-op-med">{c.med}</span>
                    <span className="ht-op-pior">{c.pior}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption>
        O número grande é o caso médio, o de baixo é o pior caso. A tabela hash é a única linha em
        que os dois estão em famílias diferentes, e é exatamente por isso que se fala em O(1)
        amortizado, não em O(1) garantido.
      </figcaption>
    </figure>
  );
}
