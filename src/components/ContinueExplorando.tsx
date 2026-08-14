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
 * Dois cards, e não a vitrine inteira: aqui isto é um destino sugerido, não um
 * catálogo. O catálogo tem uma página, e o link para ela fecha a banda.
 *
 * Dois, e não três, porque a banda vive na COLUNA DO ARTIGO — que tem o índice
 * "Nesta página" ao lado e sobra com ~720px. Medido: três cards de 258px não
 * cabem lado a lado ali e o terceiro cai sozinho numa segunda linha, com um
 * buraco do tamanho de um card à direita dele. Dois fecham a linha em qualquer
 * largura.
 *
 * A ordem vem do `EXTRA_CARDS`, que já põe na frente o que tem material — então
 * a sugestão nunca é duas páginas "em breve" enquanto existe coisa publicada
 * para ler.
 */
export function ContinueExplorando({ excluir, quantos = 2 }: { excluir?: string; quantos?: number }) {
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
