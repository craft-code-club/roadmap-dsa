// Apoiadores (pessoas) e Parceiros (empresas) da comunidade.
//
// PARCEIROS são mantidos à mão nesta lista (poucos, empresas).
//
// APOIADORES vêm da APOIA.se em tempo de build, via fetchSupporters(). Mostramos
// só o nome, do apoio mais recente para o mais antigo. Sem as variáveis de
// ambiente configuradas, ou sem ninguém apoiando ainda, a página /apoie cai no
// convite "seja o primeiro" automaticamente. Nada aqui quebra o build.
//
// Configuração (env local e secret no GitHub):
//   APOIASE_TOKEN        token Bearer do painel da APOIA.se (dashboard)
//   APOIASE_CAMPAIGN_ID  id numérico da campanha (aparece na URL do painel)
//
// Observação: a API pública "oficial" da APOIA.se só valida uma pessoa por vez
// (checa se fulano apoia). Quem devolve a lista completa é a API do painel
// (dashboard-api-v1), abaixo. O token do painel expira de tempos em tempos: se a
// lista sumir, gere um token novo e atualize o secret.

export type Supporter = { name: string };
export type Partner = { name: string; url?: string };

export const PARTNERS: Partner[] = [
  // { name: "Empresa X", url: "https://empresa.com" },
];

// Apoiadores que não vêm da APOIA.se (opcional). Aparecem primeiro na lista.
const EXTRA_SUPPORTERS: Supporter[] = [];

const API_BASE = "https://dashboard-api-v1.apoia.se/api/reports/backers";

type Raw = Record<string, unknown>;

function nestedName(v: unknown): string | undefined {
  if (v && typeof v === "object") {
    const n = (v as Raw).name ?? (v as Raw).nome;
    if (typeof n === "string") return n;
  }
  return undefined;
}

// A API do painel não é versionada publicamente, então lemos o nome de forma
// defensiva, tentando as chaves mais prováveis.
function pickName(b: Raw): string | null {
  const direct = [b.name, b.nome, b.backer_name, b.supporter_name, b.apoiador].find(
    (v): v is string => typeof v === "string" && v.trim().length > 0
  );
  const s = (direct ?? nestedName(b.user) ?? nestedName(b.backer) ?? "").trim();
  return s.length ? s : null;
}

// Timestamp do apoio, para ordenar do mais recente para o mais antigo. Sem data,
// vira 0 e preserva a ordem que a API já devolveu.
function pickTime(b: Raw): number {
  const raw = [
    b.status_changed_at,
    b.statusChangedAt,
    b.created_at,
    b.createdAt,
    b.subscribed_at,
    b.first_support_at,
    b.date,
    b.updated_at,
  ].find((v) => typeof v === "string" || typeof v === "number");
  if (raw === undefined) return 0;
  const t = Date.parse(String(raw));
  return Number.isNaN(t) ? 0 : t;
}

// Sem status, assume ativo. Com status, descarta apoios claramente encerrados.
function isActive(b: Raw): boolean {
  const raw = [b.status, b.status_atual, b.support_status].find((v) => typeof v === "string");
  const status = typeof raw === "string" ? raw.toLowerCase() : "";
  if (!status) return true;
  return !/cancel|inativ|inactive|expir|encerrad|refund|falh|failed/.test(status);
}

function toList(json: unknown): Raw[] {
  if (Array.isArray(json)) return json as Raw[];
  if (json && typeof json === "object") {
    const o = json as Raw;
    for (const key of ["backers", "data", "apoiadores", "results"]) {
      if (Array.isArray(o[key])) return o[key] as Raw[];
    }
  }
  return [];
}

export async function fetchSupporters(): Promise<Supporter[]> {
  const token = process.env.APOIASE_TOKEN;
  const campaign = process.env.APOIASE_CAMPAIGN_ID;
  if (!token || !campaign) return [...EXTRA_SUPPORTERS];

  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(campaign)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`[apoia.se] resposta HTTP ${res.status}. Mostrando placeholder de apoiadores.`);
      return [...EXTRA_SUPPORTERS];
    }

    const raw = toList(await res.json());
    const parsed = raw
      .filter(isActive)
      .map((b) => ({ name: pickName(b), t: pickTime(b) }))
      .filter((b): b is { name: string; t: number } => b.name !== null)
      .sort((a, b) => b.t - a.t); // mais recente primeiro

    // Remove nomes repetidos, preservando a ordem (o mais recente prevalece).
    const seen = new Set<string>();
    const names: Supporter[] = [];
    for (const b of parsed) {
      const key = b.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push({ name: b.name });
    }

    // Diagnóstico: veio gente mas não reconhecemos o campo do nome. Sinaliza que
    // o formato da API mudou e o mapeamento em pickName precisa de ajuste.
    if (raw.length > 0 && names.length === 0) {
      console.warn(`[apoia.se] recebeu ${raw.length} apoios mas não reconheceu os campos de nome. Ajuste pickName().`);
    }
    return [...EXTRA_SUPPORTERS, ...names];
  } catch (err) {
    console.warn("[apoia.se] falha ao buscar apoiadores. Mostrando placeholder.", err);
    return [...EXTRA_SUPPORTERS];
  }
}
