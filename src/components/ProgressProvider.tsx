"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Progresso salvo no navegador (sem login, sem servidor).
const KEY_TOPICOS = "ccc-dsa-progresso";
const KEY_PROBLEMAS = "ccc-dsa-problemas";

type Mapa = Record<string, 1>;

// Tópicos que mudaram de slug. O progresso fica salvo por slug, então sem isto
// quem já tinha concluído o tópico antigo veria o novo como não concluído.
// Quando dois tópicos viram um só, ter concluído qualquer um dos dois basta:
// é um marcador de progresso, e perder um ✓ que o leitor já conquistou é pior
// do que herdar um que ele pode desmarcar.
const SLUGS_RENOMEADOS: Record<string, string> = {
  "sliding-window-fixed": "sliding-window",
  "sliding-window-dynamic": "sliding-window",
};

// Reescreve as chaves antigas para as novas e diz se algo mudou (para regravar
// só quando precisa). Some com a chave antiga: ela não serve mais para nada.
function migrarSlugs(mapa: Mapa): { mapa: Mapa; mudou: boolean } {
  let mudou = false;
  const out: Mapa = { ...mapa };
  for (const [antigo, novo] of Object.entries(SLUGS_RENOMEADOS)) {
    if (!out[antigo]) continue;
    delete out[antigo];
    out[novo] = 1;
    mudou = true;
  }
  return { mapa: out, mudou };
}

type Ctx = {
  hydrated: boolean;
  topicosFeitos: Mapa;
  problemasFeitos: Mapa;
  isTopico: (slug: string) => boolean;
  toggleTopico: (slug: string) => void;
  isProblema: (id: string) => boolean;
  toggleProblema: (id: string) => void;
  contarTopicos: (slugs: string[]) => number;
};

const ProgressContext = createContext<Ctx | null>(null);

function ler(key: string): Mapa {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Mapa) : {};
  } catch {
    return {};
  }
}

function gravar(key: string, mapa: Mapa) {
  try {
    localStorage.setItem(key, JSON.stringify(mapa));
  } catch {
    /* modo privado / storage cheio, só ignora */
  }
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [topicosFeitos, setTopicos] = useState<Mapa>({});
  const [problemasFeitos, setProblemas] = useState<Mapa>({});

  useEffect(() => {
    const { mapa, mudou } = migrarSlugs(ler(KEY_TOPICOS));
    if (mudou) gravar(KEY_TOPICOS, mapa);
    setTopicos(mapa);
    setProblemas(ler(KEY_PROBLEMAS));
    setHydrated(true);
    // O único fato de "o React montou" que existe em TODA rota.
    //
    // Este provedor embrulha o site inteiro, então o atributo aparece na home,
    // no tópico, no curso e na página avulsa — enquanto os outros sinais de
    // hidratação do app são de um pedaço só: o carimbo `ccc-dsa-menu` é escrito
    // pela trilha lateral, que a página avulsa e a vitrine `/cursos/` não têm.
    // O guarda de acessibilidade dependia daquele carimbo para medir a página
    // assentada e ficou 30s esperando um menu que não ia existir.
    document.documentElement.dataset.hidratado = "1";
  }, []);

  const toggleTopico = useCallback((slug: string) => {
    setTopicos((prev) => {
      const next = { ...prev };
      if (next[slug]) delete next[slug];
      else next[slug] = 1;
      gravar(KEY_TOPICOS, next);
      return next;
    });
  }, []);

  const toggleProblema = useCallback((id: string) => {
    setProblemas((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = 1;
      gravar(KEY_PROBLEMAS, next);
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      hydrated,
      topicosFeitos,
      problemasFeitos,
      isTopico: (slug) => !!topicosFeitos[slug],
      toggleTopico,
      isProblema: (id) => !!problemasFeitos[id],
      toggleProblema,
      contarTopicos: (slugs) => slugs.reduce((n, s) => n + (topicosFeitos[s] ? 1 : 0), 0),
    }),
    [hydrated, topicosFeitos, problemasFeitos, toggleTopico, toggleProblema]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): Ctx {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress precisa estar dentro de <ProgressProvider>");
  return ctx;
}
