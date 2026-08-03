// ---------------------------------------------------------------------------
// LinkedListOperacoes, a tabela de custos que a galera preencheu no encontro.
//
// Componente estático (sem "use client"): é HTML puro no build, serve de
// consulta rápida e continua legível sem JavaScript. Reaproveita as classes
// .bigo-fam-* da tabela de famílias de complexidade, porque é exatamente o
// mesmo componente visual (moldura + tabela rolável + legenda), só que com
// outro conteúdo.
//
// A coluna do array dinâmico não está aqui por enfeite: quase toda decisão de
// usar (ou não usar) lista encadeada é uma comparação com ela.
// ---------------------------------------------------------------------------

type Linha = {
  op: string;
  detalhe: string;
  lista: string;
  listaSub?: string;
  array: string;
  arraySub?: string;
  porque: string;
  veredito: "lista" | "empate" | "array";
};

const LINHAS: Linha[] = [
  {
    op: "Acessar a posição k",
    detalhe: "lista[k]",
    lista: "O(n)",
    array: "O(1)",
    porque: "O array acha o endereço com uma conta. A lista só sabe onde está o próximo, então anda nó a nó.",
    veredito: "array",
  },
  {
    op: "Buscar um valor",
    detalhe: "achar quem vale 42",
    lista: "O(n)",
    array: "O(n)",
    porque: "As duas percorrem tudo. Na prática o array percorre mais rápido, porque os vizinhos já vêm no mesmo bloco de cache.",
    veredito: "empate",
  },
  {
    op: "Inserir no início",
    detalhe: "push_front",
    lista: "O(1)",
    array: "O(n)",
    porque: "A lista mexe em dois ponteiros. O array desloca todos os n elementos uma casa para a direita.",
    veredito: "lista",
  },
  {
    op: "Inserir no fim",
    detalhe: "append",
    lista: "O(1)",
    listaSub: "com ponteiro de cauda, O(n) sem ele",
    array: "O(1)",
    arraySub: "amortizado, com a cópia do redimensionamento diluída",
    porque: "Empatam por motivos diferentes: a lista precisa do ponteiro de cauda, o array precisa dobrar de tamanho de vez em quando.",
    veredito: "empate",
  },
  {
    op: "Inserir no meio",
    detalhe: "com a posição já na mão",
    lista: "O(1)",
    array: "O(n)",
    porque: "Religar são 2 ponteiros, sempre. Deslocar são n menos k elementos, e quanto mais perto do começo, pior.",
    veredito: "lista",
  },
  {
    op: "Remover o primeiro",
    detalhe: "pop_front, a operação da fila",
    lista: "O(1)",
    array: "O(n)",
    porque: "É o caso em que a lista mais brilha: sai um nó e o resto do mundo continua parado na memória.",
    veredito: "lista",
  },
  {
    op: "Remover o último",
    detalhe: "pop_back",
    lista: "O(n)",
    listaSub: "O(1) na duplamente encadeada com cauda",
    array: "O(1)",
    arraySub: "só diminui o tamanho lógico",
    porque: "Na lista simples você precisa do penúltimo nó, e para achá-lo percorre tudo. O ponteiro para o anterior resolve isso.",
    veredito: "array",
  },
  {
    op: "Remover um nó que você já tem",
    detalhe: "você guardou a referência",
    lista: "O(1)",
    listaSub: "na duplamente encadeada, O(n) na simples",
    array: "O(n)",
    porque: "Com o ponteiro para o anterior em mãos, remover é religar dois ponteiros. É esse detalhe que faz o LRU cache usar lista dupla.",
    veredito: "lista",
  },
  {
    op: "Memória por elemento",
    detalhe: "o preço do layout",
    lista: "valor + 1 ou 2 ponteiros",
    listaSub: "8 bytes por ponteiro num sistema de 64 bits",
    array: "só o valor",
    arraySub: "mais a capacidade alocada e ainda vazia",
    porque: "Um nó com um inteiro de 4 bytes e um ponteiro de 8 ocupa 16 bytes com alinhamento: 4 vezes o array equivalente.",
    veredito: "array",
  },
  {
    op: "Localidade de cache",
    detalhe: "o que o processador consegue adivinhar",
    lista: "um salto por nó",
    listaSub: "os nós podem estar em qualquer canto da memória",
    array: "bloco contíguo",
    arraySub: "a leitura de um elemento já traz os vizinhos",
    porque: "É por isso que quase toda linguagem implementa a fila e a pilha padrão com array, mesmo a lista sendo a resposta do livro.",
    veredito: "array",
  },
];

const CLASSE: Record<Linha["veredito"], string> = {
  lista: "v-otimo",
  empate: "v-bom",
  array: "v-atencao",
};

const ROTULO: Record<Linha["veredito"], string> = {
  lista: "lista ganha",
  empate: "empata",
  array: "array ganha",
};

export function LinkedListOperacoes() {
  return (
    <figure className="bigo-fam">
      <div className="bigo-fam-head">
        <span className="dot" />
        <span>Custo de cada operação: lista encadeada contra array dinâmico</span>
      </div>
      <div className="bigo-fam-scroll">
        <table className="bigo-fam-table">
          <thead>
            <tr>
              <th>Operação</th>
              <th className="nums">Lista encadeada</th>
              <th className="nums">Array dinâmico</th>
              <th>O que decide</th>
            </tr>
          </thead>
          <tbody>
            {LINHAS.map((l) => (
              <tr key={l.op} className={CLASSE[l.veredito]}>
                <td>
                  <div className="bigo-fam-not">{l.op}</div>
                  <div className="bigo-fam-nome">{l.detalhe}</div>
                </td>
                <td className="nums">
                  {l.lista}
                  {l.listaSub ? <span className="ll-sub">{l.listaSub}</span> : null}
                </td>
                <td className="nums">
                  {l.array}
                  {l.arraySub ? <span className="ll-sub">{l.arraySub}</span> : null}
                </td>
                <td className="bigo-fam-ex">
                  {l.porque}
                  <span className="bigo-fam-tag">{ROTULO[l.veredito]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption>
        Toda linha em O(n) da coluna da lista é a mesma história: alguém precisou percorrer a lista para
        achar um nó. O religar em si é sempre O(1). Quando o problema já entrega a referência do nó, a
        lista encadeada vence quase toda a tabela.
      </figcaption>
    </figure>
  );
}
