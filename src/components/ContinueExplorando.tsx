"use client";

import Link from "next/link";
import { EXTRA_CARDS } from "@content/courses";
import { ExtrasGrid } from "@/components/ExtrasGrid";

/**
 * O que vem depois de uma página avulsa.
 *
 * A página avulsa não tem barra lateral, e por isso não tem "anterior" nem
 * "próximo": ela não está numa fila. O que ela tem são VIZINHOS — as outras
 * estruturas fora da trilha —, e é isso que esta banda mostra, no fim do
 * artigo, que é onde o leitor está quando termina de ler.
 *
 * Três cards, e não a vitrine inteira: aqui isto é um destino sugerido, não um
 * catálogo. O catálogo tem uma página, e o link para ela fecha a banda.
 *
 * A ordem vem do `EXTRA_CARDS`, que já põe na frente o que tem material — então
 * a sugestão nunca é três páginas "em breve" seguidas enquanto existe coisa
 * publicada para ler.
 */
export function ContinueExplorando({ excluir, quantos = 3 }: { excluir?: string; quantos?: number }) {
  const vizinhos = EXTRA_CARDS.filter((c) => c.slug !== excluir).slice(0, quantos);
  if (vizinhos.length === 0) return null;

  return (
    <section className="continue-explorando">
      <div className="continue-head">
        <h2 className="prose-h2" style={{ margin: 0 }}>Continue explorando</h2>
        <Link href="/cursos" className="link-btn">Ver tudo →</Link>
      </div>
      <p className="prose-p" style={{ color: "var(--ccc-muted)", marginTop: 0 }}>
        Outras estruturas e cursos fora da trilha principal.
      </p>
      <ExtrasGrid cards={vizinhos} />
    </section>
  );
}
