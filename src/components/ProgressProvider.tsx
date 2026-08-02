"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Progresso salvo no navegador (sem login, sem servidor).
const KEY_TOPICOS = "ccc-dsa-progresso";
const KEY_PROBLEMAS = "ccc-dsa-problemas";

type Mapa = Record<string, 1>;

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
    setTopicos(ler(KEY_TOPICOS));
    setProblemas(ler(KEY_PROBLEMAS));
    setHydrated(true);
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
