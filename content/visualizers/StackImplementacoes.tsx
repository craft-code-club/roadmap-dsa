// ---------------------------------------------------------------------------
// StackImplementacoes, a tabela de consulta: a mesma pilha sobre array e sobre
// lista ligada.
//
// Componente estático (sem "use client"): é HTML puro no build, serve de
// consulta rápida e continua legível sem JavaScript. Mesmo espírito do
// BigOFamilias.
//
// O conteúdo sai direto da discussão do encontro: o resize que dobra e copia,
// o array que cresce e nunca encolhe, o nó da lista ligada que custa um
// ponteiro a mais, e o acesso ao meio que o array permite mas o contrato da
// pilha esconde de propósito.
// ---------------------------------------------------------------------------

type Coluna = { custo: string; detalhe: string; veredito: "otimo" | "bom" | "atencao" };
type Linha = { op: string; sub: string; array: Coluna; lista: Coluna };

const LINHAS: Linha[] = [
  {
    op: "push",
    sub: "empilhar no topo",
    array: {
      custo: "O(1) amortizado",
      detalhe: "quando a capacidade acaba, o array dobra e copia tudo para o bloco novo: essa passada isolada é O(n)",
      veredito: "bom",
    },
    lista: {
      custo: "O(1) sempre",
      detalhe: "cria um nó, aponta o next dele para o topo atual e move o head; nunca copia nada",
      veredito: "otimo",
    },
  },
  {
    op: "pop",
    sub: "tirar do topo e devolver",
    array: {
      custo: "O(1)",
      detalhe: "recua o ponteiro do topo uma casa; a capacidade alocada continua exatamente onde estava",
      veredito: "otimo",
    },
    lista: {
      custo: "O(1)",
      detalhe: "guarda o head, aponta o head para o next e devolve o valor; o nó antigo vai para o coletor de lixo",
      veredito: "otimo",
    },
  },
  {
    op: "peek",
    sub: "espiar sem tirar",
    array: {
      custo: "O(1)",
      detalhe: "lê items[topo] e não mexe no ponteiro; é a diferença inteira entre peek e pop",
      veredito: "otimo",
    },
    lista: {
      custo: "O(1)",
      detalhe: "lê head.valor e não mexe no head",
      veredito: "otimo",
    },
  },
  {
    op: "esta_vazia",
    sub: "a pergunta que protege as outras",
    array: {
      custo: "O(1)",
      detalhe: "topo == -1, com o topo começando fora do array de propósito",
      veredito: "otimo",
    },
    lista: {
      custo: "O(1)",
      detalhe: "head is None",
      veredito: "otimo",
    },
  },
  {
    op: "memória por item",
    sub: "o que cada elemento custa",
    array: {
      custo: "só o valor",
      detalhe: "mais a capacidade ociosa: depois de dobrar, até metade do bloco pode estar vazia",
      veredito: "bom",
    },
    lista: {
      custo: "valor + 1 ponteiro",
      detalhe: "cada item vira um objeto com o campo next; em 64 bits são 8 bytes só de ponteiro, mais o cabeçalho do objeto",
      veredito: "atencao",
    },
  },
  {
    op: "encolher",
    sub: "quando a pilha esvazia",
    array: {
      custo: "não encolhe",
      detalhe: "a capacidade só volta quando você joga o array inteiro fora; remover itens não devolve memória",
      veredito: "atencao",
    },
    lista: {
      custo: "encolhe de verdade",
      detalhe: "cada pop solta um nó, e a memória volta assim que o coletor passa",
      veredito: "otimo",
    },
  },
  {
    op: "acesso ao meio",
    sub: "fora do contrato da pilha",
    array: {
      custo: "O(1) se você burlar",
      detalhe: "a fórmula do índice existe, mas a interface de pilha esconde isso de propósito: o contrato é só o topo",
      veredito: "bom",
    },
    lista: {
      custo: "O(n)",
      detalhe: "só dá para chegar andando de nó em nó, como no telefone sem fio: você só enxerga quem está de mãos dadas com você",
      veredito: "atencao",
    },
  },
];

function Celula({ c }: { c: Coluna }) {
  return (
    <td className={`v-${c.veredito}`}>
      <span className="pl-tab-custo">{c.custo}</span>
      <span className="pl-tab-det">{c.detalhe}</span>
    </td>
  );
}

export function StackImplementacoes() {
  return (
    <figure className="pl-tab">
      <div className="pl-tab-head">
        <span className="dot" />
        <span>A mesma pilha, dois porões: array dinâmico e lista ligada</span>
      </div>
      <div className="pl-tab-scroll">
        <table className="pl-tab-table">
          <thead>
            <tr>
              <th>Operação</th>
              <th>Sobre array</th>
              <th>Sobre lista ligada</th>
            </tr>
          </thead>
          <tbody>
            {LINHAS.map((l) => (
              <tr key={l.op}>
                <td>
                  <div className="pl-tab-op">{l.op}</div>
                  <div className="pl-tab-sub">{l.sub}</div>
                </td>
                <Celula c={l.array} />
                <Celula c={l.lista} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption>
        Nenhuma das duas ganha em tudo. O array paga o resize e a capacidade ociosa, e ganha
        memória compacta e amiga do cache. A lista ligada nunca copia e devolve memória a cada
        pop, e paga um ponteiro por item. As duas entregam push, pop e peek em O(1), que é o que
        a pilha promete.
      </figcaption>
    </figure>
  );
}
