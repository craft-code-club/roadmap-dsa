/**
 * Formatação de número e concordância de plural para os visualizadores.
 *
 * Existe porque as mesmas funções estavam copiadas dezenas de vezes em
 * `content/visualizers/`, e as cópias tinham divergido em silêncio:
 *
 * - o formatador de milhar aparecia sob DOIS nomes (`num` e `thousands`) com
 *   TRÊS corpos: o que arredonda, o que mostra uma casa decimal e o que trunca.
 *   Nome igual, texto de tela diferente;
 * - `plural(v, one, many)` tinha a MESMA assinatura e retorno incompatível. Em
 *   alguns arquivos devolvia `"3 comparações"` e em outros devolvia
 *   `"comparações"`. Mover uma linha de nota entre dois desses arquivos produzia
 *   "depois de comparações" ou "3 3 comparações", e o `tsc` aprovava as duas.
 *
 * Por isso aqui os nomes dizem o que a função DEVOLVE, em vez de descrever o
 * assunto dela: `plural` devolve só a palavra, `comNumero` devolve número e
 * palavra. Trocar um pelo outro vira erro visível na frase, não um detalhe que
 * só aparece na tela do aluno.
 *
 * ⚠️ Nada de `Intl.NumberFormat` aqui, e essa era a nota repetida em quinze das
 * cópias: o resultado dele depende do locale do ambiente, então o HTML do build
 * sai diferente do que o cliente renderiza e a hidratação quebra. O agrupamento
 * é feito à mão, por regex, justamente para o número ser o mesmo dos dois lados.
 */

/** Agrupa milhar com ponto, do jeito brasileiro. Não mexe em casa decimal. */
const agrupaMilhar = (s: string): string => s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/**
 * Arredonda para inteiro e agrupa o milhar: `1234567` vira `"1.234.567"`.
 *
 * É o formatador da grande maioria dos visualizadores: contadores de operações,
 * de comparações, de bytes. Ele lida bem com negativo INTEIRO: `-2147483648`
 * sai `"-2.147.483.648"`. O que ele NÃO faz é truncar — para isso existe
 * {@link thousandsSigned}, e a nota de lá explica a diferença medida.
 */
export function thousands(v: number): string {
  return agrupaMilhar(String(Math.round(v)));
}

/**
 * Uma casa decimal com vírgula, milhar com ponto: `1234.56` vira `"1.234,6"`.
 * Valor inteiro sai sem casa nenhuma (`2` vira `"2"`, não `"2,0"`).
 *
 * É o que o gráfico do Big O usa ao dividir por mil, milhão e bilhão: sem a
 * casa decimal, `1,4 bi` sairia como `1 bi`.
 */
export function thousandsDecimal(v: number): string {
  const r = Math.round(v * 10) / 10;
  const txt = Number.isInteger(r) ? String(r) : r.toFixed(1).replace(".", ",");
  return agrupaMilhar(txt);
}

/**
 * TRUNCA preservando o sinal e agrupa o milhar: `-2147483648` vira
 * `"-2.147.483.648"` e `-999.6` vira `"-999"`.
 *
 * É o formatador do visualizador de overflow, onde `INT_MIN` é o valor central.
 *
 * ⚠️ O que separa esta função de {@link thousands} é o TRUNCAR, não o sinal, e a
 * cópia que ela substituiu dizia o contrário: o comentário lá alegava que
 * aplicar a regex com o `-` na frente deslocaria os pontos. Não desloca. Em
 * JavaScript `\B` nunca casa logo depois do `-`, porque ali existe uma fronteira
 * de palavra de verdade — `-2147483648` sai `"-2.147.483.648"` com ou sem o
 * tratamento de sinal, e o mesmo vale para todo negativo INTEIRO. Medido em
 * `tests/format.spec.ts`.
 *
 * A diferença que sobra é real e é só para valor fracionário: `-999.6` sai
 * `"-999"` aqui e `"-1.000"` em {@link thousands}. Nenhum valor que o
 * visualizador de overflow formata hoje é fracionário (as entradas são inteiras
 * e `div2` trunca), então esta função existe pela intenção declarada dele —
 * mostrar a conta que estoura sem arredondar por cima — e não por um texto de
 * tela que mudaria se ela sumisse.
 */
export function thousandsSigned(v: number): string {
  const negativo = v < 0;
  const s = agrupaMilhar(String(Math.abs(Math.trunc(v))));
  return negativo ? `-${s}` : s;
}

/**
 * SÓ a palavra concordada: `plural(1, "caractere", "caracteres")` devolve
 * `"caractere"`.
 *
 * Use quando o número JÁ está escrito na frase, o caso de
 * `` `${n} ${plural(n, "cópia", "cópias")}` ``. Se o número não estiver lá, o
 * que você quer é {@link comNumero}.
 */
export function plural(v: number, one: string, many: string): string {
  return v === 1 ? one : many;
}

/**
 * Número E palavra concordada: `comNumero(1, "comparação", "comparações")`
 * devolve `"1 comparação"`.
 *
 * Use quando a frase NÃO escreve o número em separado, o caso de
 * `` `Achei depois de ${comNumero(n, "comparação", "comparações")}.` ``. O
 * número entra cru, sem agrupamento de milhar: essas contagens são pequenas e o
 * texto em volta já as apresenta.
 */
export function comNumero(v: number, one: string, many: string): string {
  return `${v} ${plural(v, one, many)}`;
}
