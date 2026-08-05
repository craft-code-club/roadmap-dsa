"use client";

import { useEffect, useState } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";

// Adia a montagem do `<GoogleAnalytics>` para depois do `load`.
//
// Por que isso existe, já que o componente do Next é feito para não atrapalhar:
// ele carrega o gtag.js com `afterInteractive`, e o `next/script` traduz isso,
// no React 19, para um `<link rel="preload" as="script">` que vai PARA O HTML
// ESTÁTICO, dentro do `<head>`. Medido neste projeto: o preload aparece no
// `<head>` de todas as 54 páginas, antes até do `<title>`. Preload de script é
// prioridade alta no Chrome, e o gtag.js pesa ~145 KB comprimido (~418 KB
// depois de descomprimir) — ou seja, 145 KB de alta prioridade competindo por
// banda com o CSS da fonte e com os chunks do próprio site, exatamente durante
// a janela que decide o LCP. O script até só EXECUTA depois da hidratação; o
// download é que começava cedo demais.
//
// Adiando a montagem, a marcação do GA some do HTML: o servidor renderiza
// `null`, então não há preload nenhum, e o React só injeta o script quando esta
// máquina de estados vira. A conta fica assim:
//   - LCP / FCP: intocados — nada de GA disputa banda antes do `load`.
//   - CLS: zero nos dois jeitos (o GA não põe nada no DOM visível).
//   - TBT / INP: o parse e a execução do gtag.js caem depois do `load` e fora
//     da janela FCP→TTI que o Lighthouse mede, que é de onde vinham os pontos
//     perdidos no score de performance.
// E o que se ganha continua sendo o do componente oficial: dedupe da tag entre
// navegações client-side do App Router e pageview automático de rota, sem
// snippet síncrono escrito na mão bloqueando o parser.
//
// O preço, dito na cara: visita que acaba antes do `load` + idle não é contada.
// Num site de leitura isso é a faixa de quem fecha a aba em ~1s, e o mesmo
// leitor já não era contado antes (o gtag.js só executava depois da hidratação
// nos dois casos). Se algum dia a contagem de visitas curtíssimas importar mais
// que o score, é só trocar `<AnalyticsDeferred>` por `<GoogleAnalytics>` direto
// em `Analytics.tsx` — o resto do arranjo continua igual.
export function AnalyticsDeferred({ gaId }: { gaId: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // `requestIdleCallback` com timeout curto: em aparelho lento a fila de
    // trabalho pode nunca ficar ociosa, e sem o teto o GA jamais carregaria.
    // O `setTimeout` é o fallback do Safari mais antigo, que não tem a API.
    const schedule = () => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(() => setMounted(true), { timeout: 1500 });
      } else {
        window.setTimeout(() => setMounted(true), 800);
      }
    };

    // Navegação client-side não dispara `load` de novo: aí o documento já está
    // "complete" e a montagem acontece no primeiro idle.
    if (document.readyState === "complete") {
      schedule();
      return;
    }
    window.addEventListener("load", schedule, { once: true });
    return () => window.removeEventListener("load", schedule);
  }, []);

  if (!mounted) return null;
  return <GoogleAnalytics gaId={gaId} />;
}
