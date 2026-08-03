"use client";

// ---------------------------------------------------------------------------
// IntervalsLinhaDoTempo, a peça compartilhada dos visualizadores de Intervalos.
//
// ATENÇÃO: isto NÃO é um visualizador e não entra no mdx-components.tsx. É só
// a linha do tempo (barras posicionadas em porcentagem + o eixo com marcas em
// passos redondos) que os três visualizadores do tópico reaproveitam, junto do
// parser de entrada e dos utilitários de formatação.
//
// Tudo aqui é determinístico (nada de Intl, Date ou Math.random no caminho de
// render) para o HTML do build bater com o do cliente na hidratação.
// ---------------------------------------------------------------------------

export type Intervalo = [number, number];

export type BarraTL = {
  chave: string;
  inicio: number;
  fim: number;
  classe: string;
  texto?: string;
};

export type LinhaTL = {
  chave: string;
  rotulo: string;
  barras: BarraTL[];
};

/** Arredonda um passo de eixo para 1, 2, 5 ou 10 vezes uma potência de 10. */
function passoBonito(bruto: number): number {
  const alvo = Math.max(1, bruto);
  const expo = Math.floor(Math.log10(alvo));
  const base = Math.pow(10, expo);
  const n = alvo / base;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return Math.max(1, Math.round(m * base));
}

/**
 * Domínio do eixo a partir dos valores que precisam caber, esticado até a
 * próxima marca redonda dos dois lados. Assim todo rótulo do eixo é um número
 * inteiro e bonito, e as barras nunca encostam na borda do quadro.
 */
export function eixoDe(valores: number[], alvo = 6): { min: number; max: number; marcas: number[] } {
  const vs = valores.filter((v) => Number.isFinite(v));
  const bruMin = vs.length ? Math.min(...vs) : 0;
  const bruMax = vs.length ? Math.max(...vs) : 10;
  const p = passoBonito(Math.max(1, bruMax - bruMin) / alvo);
  const min = Math.floor(bruMin / p) * p;
  let max = Math.ceil(bruMax / p) * p;
  if (max <= min) max = min + p;
  const marcas: number[] = [];
  for (let t = min; t <= max + 1e-9 && marcas.length < 40; t += p) marcas.push(Math.round(t));
  return { min, max, marcas };
}

export function fmtIv(iv: Intervalo | null): string {
  return iv ? `[${iv[0]}, ${iv[1]}]` : "-";
}

export function fmtLista(ivs: Intervalo[]): string {
  return ivs.length ? ivs.map(fmtIv).join(" ") : "vazia";
}

/**
 * Lê intervalos de texto livre. Pega os números na ordem em que aparecem e os
 * junta dois a dois, então tanto `1,4 2,6` quanto `[[1,4],[2,6]]` (copiado do
 * enunciado do LeetCode) funcionam. Só números não negativos: em `1-4` o hífen
 * é separador, não sinal.
 */
export function lerIntervalos(texto: string, limite = 10): Intervalo[] {
  const nums = (texto.match(/\d+/g) ?? []).map((x) => parseInt(x, 10));
  const out: Intervalo[] = [];
  for (let i = 0; i + 1 < nums.length && out.length < limite; i += 2) {
    const a = nums[i];
    const b = nums[i + 1];
    out.push(a <= b ? [a, b] : [b, a]);
  }
  return out;
}

export function escreverIntervalos(ivs: Intervalo[]): string {
  return ivs.map((iv) => `[${iv[0]},${iv[1]}]`).join(", ");
}

type Props = {
  linhas: LinhaTL[];
  min: number;
  max: number;
  marcas: number[];
  guia?: number | null;
  guiaVerde?: boolean;
  rotuloEixo?: string;
};

export function LinhaDoTempo({
  linhas,
  min,
  max,
  marcas,
  guia = null,
  guiaVerde = false,
  rotuloEixo = "tempo →",
}: Props) {
  const span = Math.max(1, max - min);
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - min) / span) * 100));
  const guiaPct = guia == null ? null : pct(guia);

  return (
    <div className="iv-tl">
      <div className="iv-tl-in">
        {linhas.map((l) => (
          <div className="iv-linha" key={l.chave}>
            <span className="iv-rot" title={l.rotulo}>{l.rotulo}</span>
            <div className="iv-trilha">
              {guiaPct == null ? null : (
                <span className={`iv-guia${guiaVerde ? " verde" : ""}`} style={{ left: `${guiaPct}%` }} />
              )}
              {l.barras.map((b) => {
                const e = pct(b.inicio);
                const larg = Math.max(0, pct(b.fim) - e);
                return (
                  <span
                    key={b.chave}
                    className={`iv-bar ${b.classe}`}
                    style={{ left: `${e}%`, width: `${larg}%` }}
                    title={`de ${b.inicio} a ${b.fim}`}
                  >
                    {b.texto && larg >= 13 ? b.texto : ""}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
        <div className="iv-eixo">
          <span className="iv-rot">{rotuloEixo}</span>
          <div className="iv-eixo-trilha">
            {marcas.map((t) => (
              <span className="iv-tick" key={t} style={{ left: `${pct(t)}%` }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
