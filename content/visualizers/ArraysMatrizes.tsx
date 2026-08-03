// ---------------------------------------------------------------------------
// ArraysMatrizes, array multidimensional (matriz) contra jagged array.
//
// Componente ESTÁTICO de propósito (sem "use client"): vira HTML no build,
// funciona sem JavaScript e serve de consulta. Interação aqui não acrescenta
// nada, o que ensina é ver a forma das duas coisas lado a lado: um retângulo
// garantido contra linhas de comprimentos diferentes, uma alocação contra
// 1 + n alocações.
//
// Os comprimentos das linhas do jagged (4, 2, 5, 1) são escolhidos à mão para
// deixar a irregularidade óbvia, e a última linha aparece como null porque esse
// é o erro que pega todo mundo: no jagged, cada linha precisa ser instanciada.
// ---------------------------------------------------------------------------

const MATRIZ = [
  [10, 20, 30, 40],
  [50, 60, 70, 80],
  [90, 11, 12, 13],
];

const JAGGED: (number[] | null)[] = [[1, 2, 3, 4], [5, 6], [7, 8, 9, 10, 11], null];

export function ArraysMatrizes() {
  return (
    <figure className="arr-mat-fig">
      <div className="arr-mat-head">
        <span className="dot" />
        <span>Duas formas de guardar duas dimensões</span>
      </div>

      <div className="arr-mat">
        <div className="arr-mat-card">
          <div className="arr-mat-nome">Array multidimensional</div>
          <div className="arr-mat-sub">a matriz: um retângulo garantido</div>

          <div className="arr-mat-linhas">
            {MATRIZ.map((linha, i) => (
              <div className="arr-mat-linha" key={i}>
                <span className="arr-mat-rot">[{i}]</span>
                {linha.map((v, j) => (
                  <span className="arr-mat-cel" key={j}>
                    {v}
                  </span>
                ))}
              </div>
            ))}
          </div>

          <pre className="arr-mat-code">{`int[,] grid = new int[3, 4];   // C#
grid[2, 3] = 13;`}</pre>

          <ul className="arr-mat-pontos">
            <li>
              <b>1 alocação.</b> As 12 posições saem juntas, num único bloco contíguo de memória.
            </li>
            <li>
              <b>Toda linha tem 4 colunas</b>, e não tem como não ter: a forma é parte do tipo.
            </li>
            <li>Cabe processamento de imagem, tabuleiro, tabela, cálculo de matriz de jogo.</li>
          </ul>
        </div>

        <div className="arr-mat-card jag">
          <div className="arr-mat-nome">Jagged array</div>
          <div className="arr-mat-sub">array de arrays: cada linha com o seu tamanho</div>

          <div className="arr-mat-linhas">
            {JAGGED.map((linha, i) => (
              <div className="arr-mat-linha" key={i}>
                <span className="arr-mat-rot">[{i}]</span>
                {linha === null ? (
                  <span className="arr-mat-nulo">null (linha ainda não instanciada)</span>
                ) : (
                  linha.map((v, j) => (
                    <span className="arr-mat-cel" key={j}>
                      {v}
                    </span>
                  ))
                )}
              </div>
            ))}
          </div>

          <pre className="arr-mat-code">{`int[][] linhas = new int[4][];  // C#
linhas[0] = new int[4];
linhas[3][0] = 1;               // estoura: linha 3 é null`}</pre>

          <ul className="arr-mat-pontos">
            <li>
              <b>1 + n alocações.</b> Um array de referências, mais um array por linha, espalhados pela memória.
            </li>
            <li>
              <b>Cada linha decide o próprio tamanho</b>, e uma linha que você esqueceu de criar continua null.
            </li>
            <li>Cabe lista de adjacência de grafo, agrupamento irregular, matriz que muda de forma.</li>
          </ul>
        </div>
      </div>

      <figcaption>
        Em Java e em Python as duas coisas se escrevem quase igual, então dá para usar jagged a vida
        inteira sem saber o nome. Em C# a sintaxe é diferente ([,] contra [][]), e é aí que a
        diferença aparece: se o seu dado é um retângulo, diga isso ao compilador.
      </figcaption>
    </figure>
  );
}
