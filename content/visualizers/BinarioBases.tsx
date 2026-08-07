"use client";

import { useMemo, useState } from "react";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// BinarioBases, o mesmo número em quatro sistemas, e o que cabe em cada tipo.
//
// Duas ideias numa tela só, e elas são a mesma ideia lida em duas direções.
//
// A primeira: a base é um PARÂMETRO, não uma identidade. O mesmo valor escrito
// em 2, 8, 10 e 16 muda de aparência e não muda de tamanho, e por isso a
// tabela mostra as quatro escritas lado a lado com o mesmo número por trás.
// Hexadecimal ganha destaque porque ele é o motivo prático de tudo isto: cada
// dígito hexadecimal é exatamente 4 bits, então ler 0xF3 é ler dois grupos de
// quatro bits, e é por isso que endereço de memória, cor e máscara vêm em hexa.
//
// A segunda: quantos bits você tem decide quanto cabe, e a conta é 2^bits.
// Aqui a tabela vai até 64 bits porque o salto entre 32 e 64 é o argumento
// inteiro sobre por que ninguém guarda dinheiro em int de 32 bits.
//
// Componente estático seria possível para a segunda tabela, mas a primeira
// precisa do valor escolhido, então as duas ficam no mesmo interativo sem linha
// do tempo: a variável é o número.
// ---------------------------------------------------------------------------

const VALUES = [53, 201, 255, 4095, 48879];

const BASES: { base: number; name: string; note: string }[] = [
  { base: 2, name: "binário", note: "2 símbolos: 0 e 1. É o que existe no hardware." },
  { base: 8, name: "octal", note: "8 símbolos. Cada dígito vale exatamente 3 bits. Sobrevive nas permissões de arquivo do Unix." },
  { base: 10, name: "decimal", note: "10 símbolos. É o único da lista que não tem relação com potências de dois." },
  { base: 16, name: "hexadecimal", note: "16 símbolos, de 0 a F. Cada dígito vale exatamente 4 bits, e é por isso que ele é a forma curta de escrever binário." },
];

// Formatador determinístico: Intl.NumberFormat diverge entre build e cliente.
function num(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function compact(v: number): string {
  if (v >= 1e18) return `${num(v / 1e18)} qui`;
  if (v >= 1e15) return `${num(v / 1e15)} quatri`;
  if (v >= 1e12) return `${num(v / 1e12)} tri`;
  if (v >= 1e9) return `${num(v / 1e9)} bi`;
  if (v >= 1e6) return `${num(v / 1e6)} mi`;
  return num(v);
}

const TYPES = [
  { bits: 8, name: "byte", example: "byte, char, uint8" },
  { bits: 16, name: "16 bits", example: "short, uint16" },
  { bits: 32, name: "32 bits", example: "int, float, cor RGBA" },
  { bits: 64, name: "64 bits", example: "long, double, ponteiro" },
];

export function BinarioBases() {
  const [value, setValue] = useState(255);
  const bin = useMemo(() => value.toString(2), [value]);
  const hex = useMemo(() => value.toString(16).toUpperCase(), [value]);

  const viz = useVisualizer({
    title: "Visualizador · a base é um parâmetro, e os bits são um orçamento",
    // Não é uma animação: a tabela responde ao valor escolhido e pronto. Com
    // `total: 1` somem o contador de passo, o rodapé e os atalhos.
    total: 1,
    // As duas tabelas e a fita de grupos SÃO o conteúdo: não há bloco
    // dispensável para recolher, e prometer esconder um seria rótulo mentindo.
    collapsible: false,
    // `measureOn` fica de fora de propósito: com `collapsible: false` não há
    // decisão a tomar, e o hook nem espera as fontes.
  });

  // Os grupos de 4 bits que formam cada dígito hexadecimal, alinhados pela
  // direita: é a demonstração de que hexa é binário com outra roupa.
  const groups = useMemo(() => {
    const padded = bin.padStart(Math.ceil(bin.length / 4) * 4, "0");
    const out: string[] = [];
    for (let i = 0; i < padded.length; i += 4) out.push(padded.slice(i, i + 4));
    return out;
  }, [bin]);

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      {/* Sem linha do tempo não há "passo N de M": o número que resume o estado
          entra no lugar dele, com os três formatos juntos. */}
      <VizHeader viz={viz}>
        <span className="viz-step">
          {num(value)} = 0x{hex} = 0b{bin}
        </span>
      </VizHeader>

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {VALUES.map((v) => (
            <button key={v} className={`bigo-chip${value === v ? " on" : ""}`} onClick={() => setValue(v)} aria-pressed={value === v}>
              {num(v)}
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">
          O mesmo valor escrito em quatro sistemas. Nenhuma das quatro escritas é &quot;o número&quot;: o número
          é a quantidade, e cada linha é uma forma de anotá-la. O que muda de base para base é quantos símbolos
          existem por posição, e por consequência quantas posições são necessárias.
        </p>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            O mesmo {num(value)} em quatro bases <em>quanto menor a base, mais dígitos</em>
          </div>
          <div className="bigo-fam-scroll">
            <table className="bigo-fam-table">
              <thead>
                <tr>
                  <th>base</th>
                  <th>escrita</th>
                  <th className="nums">dígitos</th>
                  <th>por que ela existe</th>
                </tr>
              </thead>
              <tbody>
                {BASES.map((b) => {
                  const written = value.toString(b.base).toUpperCase();
                  return (
                    <tr key={b.base} className={b.base === 16 ? "hp-destaque" : ""}>
                      <td>
                        <div className="bigo-fam-not hp-nome">
                          {b.name} ({b.base})
                        </div>
                      </td>
                      <td>
                        <span className="bn-escrita">{written}</span>
                      </td>
                      <td className="nums">{written.length}</td>
                      <td>
                        <div className="hp-veredito">{b.note}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            Por que hexadecimal e não decimal <em>cada dígito hexa é um grupo de 4 bits, sem sobra</em>
          </div>
          <div className="bn-grupos">
            {groups.map((g, k) => (
              <span className="bn-grupo" key={k}>
                <span className="bn-grupo-bits">{g}</span>
                <span className="bn-grupo-hex">{parseInt(g, 2).toString(16).toUpperCase()}</span>
              </span>
            ))}
          </div>
          <p className="bb-array-nota" style={{ marginTop: 8 }}>
            Com decimal essa correspondência não existe: 10 não é potência de 2, então um dígito decimal não
            corresponde a um número inteiro de bits e converter exige dividir. Com hexadecimal, converter é
            recortar de quatro em quatro.
          </p>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            Quantos bits, quanto cabe <em>a conta é sempre 2 elevado ao número de bits</em>
          </div>
          <div className="bigo-fam-scroll">
            <table className="bigo-fam-table">
              <thead>
                <tr>
                  <th>tamanho</th>
                  <th className="nums">combinações</th>
                  <th className="nums">maior valor sem sinal</th>
                  <th>onde aparece</th>
                </tr>
              </thead>
              <tbody>
                {TYPES.map((t) => {
                  const combos = Math.pow(2, t.bits);
                  const fits = value < combos;
                  return (
                    <tr key={t.bits}>
                      <td>
                        <div className="bigo-fam-not hp-nome">{t.name}</div>
                        <div className="bigo-fam-nome">{t.bits} bits</div>
                      </td>
                      <td className="nums">
                        <span className="hp-custo c-bom">2^{t.bits}</span>
                      </td>
                      <td className="nums">
                        <span className={`hp-custo ${fits ? "c-otimo" : "c-ruim"}`}>{compact(combos - 1)}</span>
                      </td>
                      <td>
                        <div className="hp-veredito">
                          {t.example}
                          {fits ? "" : ` · o ${num(value)} escolhido acima NÃO cabe aqui`}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="viz-note ok">
          Os {num(value)} escolhidos precisam de <strong>{bin.length} bits</strong> para serem escritos, ou{" "}
          {hex.length} dígitos hexadecimais. Repare que dobrar a quantidade de bits não dobra o alcance, ele
          eleva ao quadrado: 8 bits vão até 255, 16 até 65.535, e 32 até mais de 4 bilhões. É a mesma curva
          exponencial de sempre, vista do lado de dentro.
        </p>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          O salto de 32 para 64 bits é o que mais aparece na prática. Um inteiro de 32 bits com sinal vai até
          2.147.483.647, e isso é pouco para coisas comuns: contar milissegundos desde 1970 estoura em 2038, e
          somar centavos de uma empresa grande estoura antes disso. Guardar identificador, dinheiro ou tempo em
          32 bits é uma decisão, não um detalhe.
        </p>
      </div>

      {/* Sem linha do tempo e sem controles próprios, o rodapé some inteiro —
          é o que devolve os 4px medidos no contrato, §9. */}
      <VizFooter viz={viz} />
    </figure>
  );
}
