"use client";

import { useMemo, useState } from "react";

import { thousands } from "@/lib/format";
import { useVisualizer, VizHeader } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// StringsBytesVisualizer, "caractere" não é "byte".
//
// Não é um algoritmo caminhando, então não tem passo a passo: é um painel de
// leitura. O aluno digita um texto, escolhe o encoding e vê a mesma string
// virar 3, 6, 12 ou 25 bytes na memória, com a fita de bytes desenhada
// quadradinho a quadradinho (do jeito que foi desenhado no encontro).
//
// Os quatro números do topo são os que costumam divergir e derrubar código em
// produção: grafemas (o que a pessoa vê), code points (o len do Python),
// unidades UTF-16 (o Length do C# e do Java) e bytes (o que vai para o disco,
// para o banco e para a rede).
//
// Da casca (`content/visualizers/README.md`) ele usa `total: 1`, porque não há
// linha do tempo para percorrer, e o bloco recolhível é a TABELA, não código:
// medido em 1512x900, ir de 3 para 20 code points sobe a peça de 730px para
// 1.410px, e os 680px de diferença são todos linha de tabela. Os quatro
// contadores e a fita de bytes, que é o que o artigo manda olhar, cabem sempre.
// ---------------------------------------------------------------------------

type EncKey = "ascii" | "utf8" | "utf16" | "utf32";

type Enc = {
  key: EncKey;
  name: string;
  sub: string;
  bytesOf: (cp: number) => number[];
};

// UTF-8: 1 byte até U+007F, 2 até U+07FF, 3 até U+FFFF, 4 acima disso.
function utf8(cp: number): number[] {
  if (cp < 0x80) return [cp];
  if (cp < 0x800) return [0xc0 | (cp >> 6), 0x80 | (cp & 0x3f)];
  if (cp < 0x10000) return [0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f)];
  return [
    0xf0 | (cp >> 18),
    0x80 | ((cp >> 12) & 0x3f),
    0x80 | ((cp >> 6) & 0x3f),
    0x80 | (cp & 0x3f),
  ];
}

// UTF-16 little endian (o padrão do .NET e do Java na memória): 2 bytes no
// plano básico, 4 bytes (par substituto) acima de U+FFFF.
function utf16(cp: number): number[] {
  if (cp < 0x10000) return [cp & 0xff, cp >> 8];
  const v = cp - 0x10000;
  const high = 0xd800 + (v >> 10);
  const low = 0xdc00 + (v & 0x3ff);
  return [high & 0xff, high >> 8, low & 0xff, low >> 8];
}

function utf32(cp: number): number[] {
  return [cp & 0xff, (cp >> 8) & 0xff, (cp >> 16) & 0xff, (cp >> 24) & 0xff];
}

// ASCII não tem como representar nada acima de U+007F: o encoder do .NET troca
// o caractere por "?" e a informação some. É por isso que o card avisa.
function ascii(cp: number): number[] {
  return [cp < 0x80 ? cp : 0x3f];
}

const ENCS: Enc[] = [
  { key: "ascii", name: "ASCII", sub: "1 byte, só até U+007F", bytesOf: ascii },
  { key: "utf8", name: "UTF-8", sub: "1 a 4 bytes por caractere", bytesOf: utf8 },
  { key: "utf16", name: "UTF-16", sub: "2 ou 4 bytes (padrão do C# e do Java)", bytesOf: utf16 },
  { key: "utf32", name: "UTF-32", sub: "4 bytes sempre", bytesOf: utf32 },
];

const ZWJ = 0x200d;
const FAMILY = String.fromCodePoint(0x1f468, ZWJ, 0x1f469, ZWJ, 0x1f467, ZWJ, 0x1f466);
const THUMBS_UP = String.fromCodePoint(0x1f44d);
const FLAG = String.fromCodePoint(0x1f1e7, 0x1f1f7);

const PRESETS: { label: string; text: string }[] = [
  { label: "CCC", text: "CCC" },
  { label: "ção", text: "ção" },
  { label: "日本語", text: "日本語" },
  { label: "joia", text: THUMBS_UP },
  { label: "família", text: FAMILY },
  { label: "bandeira", text: FLAG },
];

const DEFAULT_TEXT = "CCC";
const MAX_CP = 20;

const COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#a78bfa", "#22d3ee"];

function hex2(b: number): string {
  const s = b.toString(16).toUpperCase();
  return s.length === 1 ? `0${s}` : s;
}

function codePointLabel(cp: number): string {
  const s = cp.toString(16).toUpperCase();
  return `U+${s.padStart(4, "0")}`;
}

// Rótulo para os code points que não desenham nada na tela. Sem isso, a linha
// do ZWJ (o "cola" dos emojis compostos) apareceria vazia e pareceria bug.
function invisibleLabel(cp: number): string | null {
  if (cp === ZWJ) return "ZWJ (cola)";
  if (cp === 0x20) return "espaço";
  if (cp >= 0xfe00 && cp <= 0xfe0f) return "seletor de variação";
  if (cp < 0x20 || cp === 0x7f) return "controle";
  return null;
}

// Contador de grafemas simplificado: junta ao cluster anterior o ZWJ e o que
// vem depois dele, seletores de variação, modificadores de tom de pele, marcas
// combinantes, o keycap e o segundo indicador regional (bandeiras). Cobre os
// casos do artigo sem depender de Intl.Segmenter, que não existe em todo
// ambiente e traria risco de divergência entre servidor e cliente.
function countGraphemes(cps: number[]): number {
  let n = 0;
  let afterZWJ = false;
  let regionalOpen = false;
  for (const cp of cps) {
    const combines =
      afterZWJ ||
      cp === ZWJ ||
      (cp >= 0xfe00 && cp <= 0xfe0f) ||
      (cp >= 0x1f3fb && cp <= 0x1f3ff) ||
      (cp >= 0x0300 && cp <= 0x036f) ||
      cp === 0x20e3 ||
      (regionalOpen && cp >= 0x1f1e6 && cp <= 0x1f1ff);
    if (!combines) n++;
    afterZWJ = cp === ZWJ;
    regionalOpen = !regionalOpen && cp >= 0x1f1e6 && cp <= 0x1f1ff;
  }
  return n;
}

export function StringsBytesVisualizer() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [enc, setEnc] = useState<EncKey>("utf8");

  const cps = useMemo(
    () => Array.from(text).slice(0, MAX_CP).map((c) => c.codePointAt(0) ?? 0),
    [text]
  );

  const totals = useMemo(() => {
    const out: Record<EncKey, number> = { ascii: 0, utf8: 0, utf16: 0, utf32: 0 };
    for (const e of ENCS) for (const cp of cps) out[e.key] += e.bytesOf(cp).length;
    return out;
  }, [cps]);

  const lost = cps.filter((cp) => cp >= 0x80).length;
  const graphemes = countGraphemes(cps);
  const utf16Units = cps.reduce((acc, cp) => acc + (cp < 0x10000 ? 1 : 2), 0);
  const currentEnc = ENCS.find((e) => e.key === enc) ?? ENCS[1];

  const rows = cps.map((cp, i) => ({
    i,
    cp,
    glyph: String.fromCodePoint(cp),
    label: invisibleLabel(cp),
    bytes: currentEnc.bytesOf(cp),
    color: COLORS[i % COLORS.length],
  }));

  const tape = rows.flatMap((l) =>
    l.bytes.map((b, j) => ({ key: `${l.i}-${j}`, b, color: l.color, first: j === 0 }))
  );

  const viz = useVisualizer({
    title: "Visualizador · caractere, code point e byte",
    // Não há linha do tempo: some o contador de passo, o rodapé e os atalhos.
    total: 1,
    // O rótulo do botão tem que dizer o que some, e aqui o que some é a tabela.
    blockName: "tabela",
    // O que muda a altura: quantos code points (uma linha de tabela cada), qual
    // encoding (o número de chips de byte por linha) e o total de bytes (a fita
    // quebra linha a cada ~30 quadradinhos).
    measureOn: [cps.length, enc, totals[enc]],
  });

  const frame = (
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      {/* O contador de bytes ocupa o lugar do "passo N de M", que não existe
          aqui: é o número que resume o estado desta peça. */}
      <VizHeader viz={viz}>
        <span className="viz-step">
          {thousands(totals[enc])} bytes em {currentEnc.name}
        </span>
      </VizHeader>

      <div {...viz.bodyProps}>
        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Texto (até {MAX_CP} code points)</span>
            <input
              className="viz-input"
              value={text}
              onChange={(e) => setText(Array.from(e.target.value).slice(0, MAX_CP).join(""))}
            />
          </label>
          <button type="button" className="viz-btn" onClick={() => setText(DEFAULT_TEXT)}>
            ↺ Reiniciar
          </button>
        </div>

        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              type="button"
              key={pr.label}
              className={`bigo-chip${text === pr.text ? " on" : ""}`}
              onClick={() => setText(pr.text)}
              aria-pressed={text === pr.text}
            >
              {pr.label}
            </button>
          ))}
        </div>

        <div className="str-encs">
          {ENCS.map((e) => {
            const on = e.key === enc;
            const loses = e.key === "ascii" && lost > 0;
            return (
              <button
                type="button"
                key={e.key}
                className={`str-enc${on ? " on" : ""}${loses ? " perde" : ""}`}
                onClick={() => setEnc(e.key)}
                aria-pressed={on}
              >
                <span className="str-enc-nome">{e.name}</span>
                <span className="str-enc-val">{thousands(totals[e.key])} bytes</span>
                <span className="str-enc-sub">
                  {loses
                    ? `perde ${lost} ${lost === 1 ? "caractere" : "caracteres"}, viram "?"`
                    : e.sub}
                </span>
              </button>
            );
          })}
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>o que você vê (grafemas)</span>
            <strong style={{ color: "#34d399" }}>{thousands(graphemes)}</strong>
          </div>
          <div className="bigo-stat">
            <span>code points (len no Python)</span>
            <strong>{thousands(cps.length)}</strong>
          </div>
          <div className="bigo-stat">
            <span>unidades UTF-16 (Length no C#)</span>
            <strong>{thousands(utf16Units)}</strong>
          </div>
          <div className="bigo-stat">
            <span>bytes em {currentEnc.name}</span>
            <strong style={{ color: "#93bbfd" }}>{thousands(totals[enc])}</strong>
          </div>
        </div>

        <div className="str-bytes-fita">
          <span className="str-lbl">
            Memória em {currentEnc.name}: cada quadradinho é 1 byte
          </span>
          {tape.length ? (
            tape.map((f) => (
              <span
                key={f.key}
                className={`str-byte-cell${f.first ? " ini" : ""}`}
                style={{ background: f.color }}
              >
                {hex2(f.b)}
              </span>
            ))
          ) : (
            <span className="str-vazio">String vazia: zero byte de conteúdo.</span>
          )}
        </div>

        {/* O slot recolhe a ALTURA da tabela (`grid-template-rows: 1fr → 0fr`).
            A tabela fica no DOM mesmo recolhida, e é isso que permite medir o
            pior caso de altura; `inert` tira ela do teclado e dos leitores de
            tela enquanto está fora de vista. */}
        <div className="viz-code-slot">
        <div className="str-scroll" {...viz.blockProps}>
          <table className="str-tab">
            <thead>
              <tr>
                <th>Caractere</th>
                <th>Code point</th>
                <th>Bytes em {currentEnc.name}</th>
                <th className="nums">Tamanho</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.i}>
                  <td>
                    <span className="str-glifo" style={{ color: l.color }}>
                      {l.label ? "·" : l.glyph}
                    </span>
                    {l.label ? <span className="str-inviz">{l.label}</span> : null}
                  </td>
                  <td className="str-cp">{codePointLabel(l.cp)}</td>
                  <td>
                    <span className="str-bytes">
                      {l.bytes.map((b, j) => (
                        <span className="str-byte" key={j}>
                          {hex2(b)}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="nums">{l.bytes.length}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4}>Digite alguma coisa, ou escolha um dos exemplos acima.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        </div>

        <p className="viz-note">
          {graphemes === cps.length && cps.length === utf16Units
            ? `Aqui os três números batem: ${thousands(graphemes)} ${graphemes === 1 ? "caractere" : "caracteres"} na tela, ${thousands(cps.length)} code ${cps.length === 1 ? "point" : "points"} e ${thousands(utf16Units)} ${utf16Units === 1 ? "unidade" : "unidades"} UTF-16. É o caso fácil, e é o único que a intuição acerta.`
            : `Repare no desencontro: são ${thousands(graphemes)} ${graphemes === 1 ? "caractere" : "caracteres"} na tela, ${thousands(cps.length)} code points e ${thousands(utf16Units)} unidades UTF-16. Um contador de caracteres feito com o length errado corta o texto no lugar errado.`}
        </p>
      </div>
    </figure>
  );

  return viz.inPanel(frame);
}
