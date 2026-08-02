"use client";

import { useProgress } from "@/components/ProgressProvider";

export function TopicComplete({ slug, grande = false }: { slug: string; grande?: boolean }) {
  const { isTopico, toggleTopico } = useProgress();
  const feito = isTopico(slug);
  const cls = grande ? `btn-concluir-lg${feito ? " done" : ""}` : `btn-concluir${feito ? " done" : ""}`;
  return (
    <button className={cls} onClick={() => toggleTopico(slug)}>
      {feito ? "✓ Concluído" : "Marcar como concluído"}
    </button>
  );
}
