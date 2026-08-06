import { AnalyticsDeferred } from "./AnalyticsDeferred";

// Google Analytics 4 pelo componente do `@next/third-parties`, que é o caminho
// que a doc do Next recomenda (o snippet cru do Google é síncrono e bloqueia o
// parser; o componente usa `next/script` e deduplica a tag entre navegações
// client-side do App Router). QUANDO carregar é decisão do `AnalyticsDeferred`,
// que explica o porquê e o preço.
//
// Este arquivo é Server Component de propósito: o corte por ambiente acontece
// no BUILD. Sem `NEXT_PUBLIC_GA_ID` ele devolve `null`, nenhuma referência de
// cliente entra no payload e o navegador não pede byte nenhum de analytics —
// nem o chunk do wrapper. Verificado: build sem a variável sai com 0 ocorrências
// de `googletagmanager` nas 54 páginas.
//
// Por que variável de ambiente e não constante no código:
//   - Preview de PR, build de fork e `npm run dev` ficam sem GA. O deploy de
//     preview do Cloudflare é um site público de verdade; sem esse corte, todo
//     PR mandaria pageview para a propriedade de produção.
//   - O workflow só injeta o ID no build da `main` (ver
//     `.github/workflows/cloudflare-pages-deploy.yml`).
// O valor NÃO é segredo — ele sai no HTML de toda página. É variável de
// ambiente pelo recorte de ambiente, não por sigilo.
//
// `NEXT_PUBLIC_*` é trocado por texto em tempo de build, que é o que combina com
// `output: "export"`: não existe servidor para ler env em runtime.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export function Analytics() {
  if (!GA_ID) return null;
  return <AnalyticsDeferred gaId={GA_ID} />;
}
