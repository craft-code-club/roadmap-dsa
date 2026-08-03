"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

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
// ---------------------------------------------------------------------------

type EncKey = "ascii" | "utf8" | "utf16" | "utf32";

type Enc = {
  key: EncKey;
  nome: string;
  sub: string;
  bytesDe: (cp: number) => number[];
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
  const alto = 0xd800 + (v >> 10);
  const baixo = 0xdc00 + (v & 0x3ff);
  return [alto & 0xff, alto >> 8, baixo & 0xff, baixo >> 8];
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
  { key: "ascii", nome: "ASCII", sub: "1 byte, só até U+007F", bytesDe: ascii },
  { key: "utf8", nome: "UTF-8", sub: "1 a 4 bytes por caractere", bytesDe: utf8 },
  { key: "utf16", nome: "UTF-16", sub: "2 ou 4 bytes (padrão do C# e do Java)", bytesDe: utf16 },
  { key: "utf32", nome: "UTF-32", sub: "4 bytes sempre", bytesDe: utf32 },
];

const ZWJ = 0x200d;
const FAMILIA = String.fromCodePoint(0x1f468, ZWJ, 0x1f469, ZWJ, 0x1f467, ZWJ, 0x1f466);
const JOIA = String.fromCodePoint(0x1f44d);
const BANDEIRA = String.fromCodePoint(0x1f1e7, 0x1f1f7);

const PRESETS: { rotulo: string; texto: string }[] = [
  { rotulo: "CCC", texto: "CCC" },
  { rotulo: "ção", texto: "ção" },
  { rotulo: "日本語", texto: "日本語" },
  { rotulo: "joia", texto: JOIA },
  { rotulo: "família", texto: FAMILIA },
  { rotulo: "bandeira", texto: BANDEIRA },
];

const PADRAO = "CCC";
const MAX_CP = 20;

const CORES = ["#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#a78bfa", "#22d3ee"];

function num(v: number): string {
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function hex2(b: number): string {
  const s = b.toString(16).toUpperCase();
  return s.length === 1 ? `0${s}` : s;
}

function pontoCodigo(cp: number): string {
  const s = cp.toString(16).toUpperCase();
  return `U+${s.padStart(4, "0")}`;
}

// Rótulo para os code points que não desenham nada na tela. Sem isso, a linha
// do ZWJ (o "cola" dos emojis compostos) apareceria vazia e pareceria bug.
function invisivel(cp: number): string | null {
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
function contarGrafemas(cps: number[]): number {
  let n = 0;
  let aposZWJ = false;
  let regionalAberto = false;
  for (const cp of cps) {
    const combina =
      aposZWJ ||
      cp === ZWJ ||
      (cp >= 0xfe00 && cp <= 0xfe0f) ||
      (cp >= 0x1f3fb && cp <= 0x1f3ff) ||
      (cp >= 0x0300 && cp <= 0x036f) ||
      cp === 0x20e3 ||
      (regionalAberto && cp >= 0x1f1e6 && cp <= 0x1f1ff);
    if (!combina) n++;
    aposZWJ = cp === ZWJ;
    regionalAberto = !regionalAberto && cp >= 0x1f1e6 && cp <= 0x1f1ff;
  }
  return n;
}

export function StringsBytesVisualizer() {
  const [texto, setTexto] = useState(PADRAO);
  const [enc, setEnc] = useState<EncKey>("utf8");
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const cps = useMemo(
    () => Array.from(texto).slice(0, MAX_CP).map((c) => c.codePointAt(0) ?? 0),
    [texto]
  );

  const totais = useMemo(() => {
    const out: Record<EncKey, number> = { ascii: 0, utf8: 0, utf16: 0, utf32: 0 };
    for (const e of ENCS) for (const cp of cps) out[e.key] += e.bytesDe(cp).length;
    return out;
  }, [cps]);

  const perdidos = cps.filter((cp) => cp >= 0x80).length;
  const grafemas = contarGrafemas(cps);
  const unidades16 = cps.reduce((acc, cp) => acc + (cp < 0x10000 ? 1 : 2), 0);
  const encAtual = ENCS.find((e) => e.key === enc) ?? ENCS[1];

  const linhas = cps.map((cp, i) => ({
    i,
    cp,
    glifo: String.fromCodePoint(cp),
    rotulo: invisivel(cp),
    bytes: encAtual.bytesDe(cp),
    cor: CORES[i % CORES.length],
  }));

  const fita = linhas.flatMap((l) =>
    l.bytes.map((b, j) => ({ chave: `${l.i}-${j}`, b, cor: l.cor, ini: j === 0 }))
  );

  const viz = (
    <figure className="viz" style={{ margin: 0 }}>
      <div className="viz-head">
        <div className="viz-head-title">
          <span className="dot" />
          <span>Visualizador · caractere, code point e byte</span>
        </div>
        <div className="viz-head-right">
          <span className="viz-step">
            {num(totais[enc])} bytes em {encAtual.nome}
          </span>
          <button className="viz-expand" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "✕ Fechar" : "⤢ Expandir"}
          </button>
        </div>
      </div>

      <div className="viz-body">
        <div className="viz-inputs">
          <label className="viz-field grow">
            <span>Texto (até {MAX_CP} code points)</span>
            <input
              className="viz-input"
              value={texto}
              onChange={(e) => setTexto(Array.from(e.target.value).slice(0, MAX_CP).join(""))}
            />
          </label>
          <button className="viz-btn" onClick={() => setTexto(PADRAO)}>
            ↺ Reiniciar
          </button>
        </div>

        <div className="bigo-chips">
          {PRESETS.map((pr) => (
            <button
              key={pr.rotulo}
              className={`bigo-chip${texto === pr.texto ? " on" : ""}`}
              onClick={() => setTexto(pr.texto)}
              aria-pressed={texto === pr.texto}
            >
              {pr.rotulo}
            </button>
          ))}
        </div>

        <div className="str-encs">
          {ENCS.map((e) => {
            const on = e.key === enc;
            const perde = e.key === "ascii" && perdidos > 0;
            return (
              <button
                key={e.key}
                className={`str-enc${on ? " on" : ""}${perde ? " perde" : ""}`}
                onClick={() => setEnc(e.key)}
                aria-pressed={on}
              >
                <span className="str-enc-nome">{e.nome}</span>
                <span className="str-enc-val">{num(totais[e.key])} bytes</span>
                <span className="str-enc-sub">
                  {perde
                    ? `perde ${perdidos} ${perdidos === 1 ? "caractere" : "caracteres"}, viram "?"`
                    : e.sub}
                </span>
              </button>
            );
          })}
        </div>

        <div className="bigo-stats">
          <div className="bigo-stat">
            <span>o que você vê (grafemas)</span>
            <strong style={{ color: "#34d399" }}>{num(grafemas)}</strong>
          </div>
          <div className="bigo-stat">
            <span>code points (len no Python)</span>
            <strong>{num(cps.length)}</strong>
          </div>
          <div className="bigo-stat">
            <span>unidades UTF-16 (Length no C#)</span>
            <strong>{num(unidades16)}</strong>
          </div>
          <div className="bigo-stat">
            <span>bytes em {encAtual.nome}</span>
            <strong style={{ color: "#93bbfd" }}>{num(totais[enc])}</strong>
          </div>
        </div>

        <div className="str-bytes-fita">
          <span className="str-lbl">
            Memória em {encAtual.nome}: cada quadradinho é 1 byte
          </span>
          {fita.length ? (
            fita.map((f) => (
              <span
                key={f.chave}
                className={`str-byte-cell${f.ini ? " ini" : ""}`}
                style={{ background: f.cor }}
              >
                {hex2(f.b)}
              </span>
            ))
          ) : (
            <span className="str-vazio">String vazia: zero byte de conteúdo.</span>
          )}
        </div>

        <div className="str-scroll">
          <table className="str-tab">
            <thead>
              <tr>
                <th>Caractere</th>
                <th>Code point</th>
                <th>Bytes em {encAtual.nome}</th>
                <th className="nums">Tamanho</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.i}>
                  <td>
                    <span className="str-glifo" style={{ color: l.cor }}>
                      {l.rotulo ? "·" : l.glifo}
                    </span>
                    {l.rotulo ? <span className="str-inviz">{l.rotulo}</span> : null}
                  </td>
                  <td className="str-cp">{pontoCodigo(l.cp)}</td>
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
              {linhas.length === 0 ? (
                <tr>
                  <td colSpan={4}>Digite alguma coisa, ou escolha um dos exemplos acima.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <p className="viz-note">
          {grafemas === cps.length && cps.length === unidades16
            ? `Aqui os três números batem: ${num(grafemas)} ${grafemas === 1 ? "caractere" : "caracteres"} na tela, ${num(cps.length)} code ${cps.length === 1 ? "point" : "points"} e ${num(unidades16)} ${unidades16 === 1 ? "unidade" : "unidades"} UTF-16. É o caso fácil, e é o único que a intuição acerta.`
            : `Repare no desencontro: são ${num(grafemas)} ${grafemas === 1 ? "caractere" : "caracteres"} na tela, ${num(cps.length)} code points e ${num(unidades16)} unidades UTF-16. Um contador de caracteres feito com o length errado corta o texto no lugar errado.`}
        </p>
      </div>
    </figure>
  );

  if (expanded && mounted) {
    return createPortal(
      <div
        className="viz-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) setExpanded(false);
        }}
      >
        {viz}
      </div>,
      document.body
    );
  }
  return viz;
}
