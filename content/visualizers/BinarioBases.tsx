"use client";

import { useMemo, useState } from "react";

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

const VALORES = [53, 201, 255, 4095, 48879];

const BASES: { base: number; nome: string; nota: string }[] = [
  { base: 2, nome: "binário", nota: "2 símbolos: 0 e 1. É o que existe no hardware." },
  { base: 8, nome: "octal", nota: "8 símbolos. Cada dígito vale exatamente 3 bits. Sobrevive nas permissões de arquivo do Unix." },
  { base: 10, nome: "decimal", nota: "10 símbolos. É o único da lista que não tem relação com potências de dois." },
  { base: 16, nome: "hexadecimal", nota: "16 símbolos, de 0 a F. Cada dígito vale exatamente 4 bits, e é por isso que ele é a forma curta de escrever binário." },
];

// Formatador determinístico: Intl.NumberFormat diverge entre build e cliente.
function num(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function compacto(v: number): string {
  if (v >= 1e18) return `${num(v / 1e18)} qui`;
  if (v >= 1e15) return `${num(v / 1e15)} quatri`;
  if (v >= 1e12) return `${num(v / 1e12)} tri`;
  if (v >= 1e9) return `${num(v / 1e9)} bi`;
  if (v >= 1e6) return `${num(v / 1e6)} mi`;
  return num(v);
}

const TIPOS = [
  { bits: 8, nome: "byte", exemplo: "byte, char, uint8" },
  { bits: 16, nome: "16 bits", exemplo: "short, uint16" },
  { bits: 32, nome: "32 bits", exemplo: "int, float, cor RGBA" },
  { bits: 64, nome: "64 bits", exemplo: "long, double, ponteiro" },
];

export function BinarioBases() {
  const [valor, setValor] = useState(255);
  const bin = useMemo(() => valor.toString(2), [valor]);
  const hex = useMemo(() => valor.toString(16).toUpperCase(), [valor]);

  // Os grupos de 4 bits que formam cada dígito hexadecimal, alinhados pela
  // direita: é a demonstração de que hexa é binário com outra roupa.
  const grupos = useMemo(() => {
    const preenchido = bin.padStart(Math.ceil(bin.length / 4) * 4, "0");
    const out: string[] = [];
    for (let i = 0; i < preenchido.length; i += 4) out.push(preenchido.slice(i, i + 4));
    return out;
  }, [bin]);

  return (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · a base é um parâmetro, e os bits são um orçamento</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">
            {num(valor)} = 0x{hex} = 0b{bin}
          </span>
        </div>
      </div>

      <div className="viz-body">
        <div className="bigo-chips">
          {VALORES.map((v) => (
            <button key={v} className={`bigo-chip${valor === v ? " on" : ""}`} onClick={() => setValor(v)} aria-pressed={valor === v}>
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
            O mesmo {num(valor)} em quatro bases <em>quanto menor a base, mais dígitos</em>
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
                  const escrita = valor.toString(b.base).toUpperCase();
                  return (
                    <tr key={b.base} className={b.base === 16 ? "hp-destaque" : ""}>
                      <td>
                        <div className="bigo-fam-not hp-nome">
                          {b.nome} ({b.base})
                        </div>
                      </td>
                      <td>
                        <span className="bn-escrita">{escrita}</span>
                      </td>
                      <td className="nums">{escrita.length}</td>
                      <td>
                        <div className="hp-veredito">{b.nota}</div>
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
            {grupos.map((g, k) => (
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
                {TIPOS.map((t) => {
                  const combos = Math.pow(2, t.bits);
                  const cabe = valor < combos;
                  return (
                    <tr key={t.bits}>
                      <td>
                        <div className="bigo-fam-not hp-nome">{t.nome}</div>
                        <div className="bigo-fam-nome">{t.bits} bits</div>
                      </td>
                      <td className="nums">
                        <span className="hp-custo c-bom">2^{t.bits}</span>
                      </td>
                      <td className="nums">
                        <span className={`hp-custo ${cabe ? "c-otimo" : "c-ruim"}`}>{compacto(combos - 1)}</span>
                      </td>
                      <td>
                        <div className="hp-veredito">
                          {t.exemplo}
                          {cabe ? "" : ` · o ${num(valor)} escolhido acima NÃO cabe aqui`}
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
          Os {num(valor)} escolhidos precisam de <strong>{bin.length} bits</strong> para serem escritos, ou{" "}
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
    </figure>
  );
}
