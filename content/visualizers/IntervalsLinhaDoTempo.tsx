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
//
// Identificadores em inglês, tela em português (contrato §0): o `state` de uma
// barra vira classe de CSS (`.iv-bar.espera`, `.iv-bar.atual`...), então os
// VALORES continuam em português — eles são a API do `globals.css`, não texto.
// ---------------------------------------------------------------------------

export type Interval = [number, number];

export type TimelineBar = {
  id: string;
  start: number;
  end: number;
  /** Estado visual da barra. Vira classe de CSS: espera, atual, usado, novo... */
  state: string;
  label?: string;
};

export type TimelineRow = {
  id: string;
  label: string;
  bars: TimelineBar[];
};

/** Arredonda um passo de eixo para 1, 2, 5 ou 10 vezes uma potência de 10. */
function niceStep(raw: number): number {
  const target = Math.max(1, raw);
  const expo = Math.floor(Math.log10(target));
  const base = Math.pow(10, expo);
  const n = target / base;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return Math.max(1, Math.round(m * base));
}

/**
 * Domínio do eixo a partir dos valores que precisam caber, esticado até a
 * próxima marca redonda dos dois lados. Assim todo rótulo do eixo é um número
 * inteiro e bonito, e as barras nunca encostam na borda do quadro.
 */
export function axisFor(values: number[], target = 6): { min: number; max: number; ticks: number[] } {
  const vs = values.filter((v) => Number.isFinite(v));
  const rawMin = vs.length ? Math.min(...vs) : 0;
  const rawMax = vs.length ? Math.max(...vs) : 10;
  const step = niceStep(Math.max(1, rawMax - rawMin) / target);
  const min = Math.floor(rawMin / step) * step;
  let max = Math.ceil(rawMax / step) * step;
  if (max <= min) max = min + step;
  const ticks: number[] = [];
  for (let t = min; t <= max + 1e-9 && ticks.length < 40; t += step) ticks.push(Math.round(t));
  return { min, max, ticks };
}

export function fmtIv(iv: Interval | null): string {
  return iv ? `[${iv[0]}, ${iv[1]}]` : "-";
}

export function fmtList(ivs: Interval[]): string {
  return ivs.length ? ivs.map(fmtIv).join(" ") : "vazia";
}

/**
 * Lê intervalos de texto livre. Pega os números na ordem em que aparecem e os
 * junta dois a dois, então tanto `1,4 2,6` quanto `[[1,4],[2,6]]` (copiado do
 * enunciado do LeetCode) funcionam. Só números não negativos: em `1-4` o hífen
 * é separador, não sinal.
 */
export function parseIntervals(text: string, limit = 10): Interval[] {
  const nums = (text.match(/\d+/g) ?? []).map((x) => parseInt(x, 10));
  const out: Interval[] = [];
  for (let i = 0; i + 1 < nums.length && out.length < limit; i += 2) {
    const a = nums[i];
    const b = nums[i + 1];
    out.push(a <= b ? [a, b] : [b, a]);
  }
  return out;
}

export function writeIntervals(ivs: Interval[]): string {
  return ivs.map((iv) => `[${iv[0]},${iv[1]}]`).join(", ");
}

type Props = {
  rows: TimelineRow[];
  min: number;
  max: number;
  ticks: number[];
  guide?: number | null;
  guideGreen?: boolean;
  axisLabel?: string;
};

export function LinhaDoTempo({
  rows,
  min,
  max,
  ticks,
  guide = null,
  guideGreen = false,
  axisLabel = "tempo →",
}: Props) {
  const span = Math.max(1, max - min);
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - min) / span) * 100));
  const guidePct = guide == null ? null : pct(guide);

  return (
    <div className="iv-tl">
      <div className="iv-tl-in">
        {rows.map((row) => (
          <div className="iv-linha" key={row.id}>
            <span className="iv-rot" title={row.label}>{row.label}</span>
            <div className="iv-trilha">
              {guidePct == null ? null : (
                <span className={`iv-guia${guideGreen ? " verde" : ""}`} style={{ left: `${guidePct}%` }} />
              )}
              {row.bars.map((b) => {
                const left = pct(b.start);
                const width = Math.max(0, pct(b.end) - left);
                return (
                  <span
                    key={b.id}
                    className={`iv-bar ${b.state}`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`de ${b.start} a ${b.end}`}
                  >
                    {b.label && width >= 13 ? b.label : ""}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
        <div className="iv-eixo">
          <span className="iv-rot">{axisLabel}</span>
          <div className="iv-eixo-trilha">
            {ticks.map((t) => (
              <span className="iv-tick" key={t} style={{ left: `${pct(t)}%` }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
